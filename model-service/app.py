"""FastAPI model service for business understanding and layer weighting.

Exposes POST /model/business-analysis. Given a free-text business description
and the supported dataset categories, it:

  1. Extracts structured business needs (a business_type label + a list of
     need concepts) from the description using an embedding model.
  2. Matches those needs to the supported dataset categories via cosine
     similarity between need text and each category's semantic descriptor.
  3. Emits a layer weight per matched category, signed by the category polarity
     (positive -> +, negative -> -, context -> + as a supporting signal).

The embedding model matches needs to dataset categories (not directly to
geographic records), per the spec.
"""

from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer, util

MODEL_NAME = "all-MiniLM-L6-v2"

# Curated need concepts the model can detect in a business description.
NEED_CONCEPTS = [
    "students and young people",
    "pedestrians and high foot traffic",
    "local residents and families",
    "tourists and visitors",
    "affluent high-spending customers",
    "office workers and professionals",
    "competing businesses nearby",
    "complementary nearby venues and amenities",
    "dense urban population",
    "halal food and muslim community",
    "kosher food and jewish community",
    "south asian and indian community",
    "diaspora and migrant communities",
    "non-english speakers needing language services",
    "families with dependent children",
    "schoolchildren and tutoring",
    "older people and health needs",
    "people with disabilities or poor health",
    "low car ownership walkable neighbourhood",
    "private renters and transient residents",
    "single person households",
    "retail and shopping workers",
    "hospitality and food service workers",
    "healthcare and social care workers",
    "education sector workers",
]

# Short semantic gloss per supported category for stronger embedding matches.
CATEGORY_GLOSS = {
    "age": "age profile of residents, students and young adults versus older population",
    "population_density": "dense urban population and high resident numbers driving foot traffic",
    "economic_activity": "employment, working professionals and economic activity rate",
    "occupation": "occupation types and professional workforce composition",
    "highest_qualification": "education level and highly qualified residents",
    "tenure": "housing tenure, renters versus owner-occupiers",
    "car_van_availability": "car ownership and access to vehicles",
    "household_composition": "household composition, families, single people and shared homes",
    "household_deprivation": "household deprivation and lower-income areas",
    "competitors": "competing businesses and market saturation nearby",
    "relevant_locations": "complementary nearby places such as schools, offices and amenities",
    # Ethnic group shares
    "ethnic_asian": "asian residents, south asian indian pakistani bangladeshi chinese community",
    "ethnic_black": "black african and caribbean community",
    "ethnic_mixed": "mixed and multiple ethnic background residents",
    "ethnic_other": "other ethnic group residents including arab",
    # Religion shares
    "religion_christian": "christian community and churchgoers",
    "religion_muslim": "muslim community, halal food and islamic services",
    "religion_hindu": "hindu community and indian cultural goods",
    "religion_jewish": "jewish community and kosher food",
    "religion_sikh": "sikh community and punjabi cultural goods",
    "religion_none": "secular residents with no religion",
    # Country of birth
    "born_outside_uk": "residents born abroad, migrant and diaspora communities",
    "born_eu": "european-born residents and eu migrant community",
    "born_non_eu": "non-european migrant communities from asia africa and elsewhere",
    # Language
    "english_not_main": "residents whose main language is not english, needing translation",
    "english_limited": "residents with limited english needing language support services",
    # Passports
    "foreign_passport": "residents holding foreign passports, international and migrant community",
    # Health & disability
    "health_bad": "residents in bad health needing pharmacies clinics and care",
    "disability": "disabled residents needing accessible services and mobility support",
    # Work
    "full_time_workers": "full-time workers and busy professionals",
    "occupation_professional": "managers, professionals and skilled white-collar workforce",
    "social_grade_ab": "affluent high social grade professional and managerial residents with spending power",
    "industry_retail": "people working in retail and wholesale shops",
    "industry_hospitality": "people working in hospitality, restaurants and food service",
    "industry_professional": "people working in professional scientific and technical services",
    "industry_education": "people working in education, teachers and school staff",
    "industry_health": "people working in health and social care",
    # Household & housing
    "single_person_household": "single person households living alone",
    "households_with_children": "families with dependent children",
    "flats_share": "residents living in flats and apartments",
    "private_renters": "private renters and transient younger residents",
    "overcrowded": "overcrowded households and pressured housing",
    # Students, cars, travel, second address
    "students_share": "schoolchildren and full-time students, tutoring and study needs",
    "no_car_household": "households with no car, walkable neighbourhood and local convenience",
    "short_commute": "residents working from home or with a short local commute",
    "student_second_address": "students with a term-time second address",
}

NEED_THRESHOLD = 0.22       # min similarity for a need to be detected
CATEGORY_THRESHOLD = 0.18   # min similarity for a category to be selected
# Categories always included as a baseline location signal.
BASELINE_CATEGORIES = {"population_density", "competitors"}

state = {}


@asynccontextmanager
async def lifespan(_app: FastAPI):
    model = SentenceTransformer(MODEL_NAME)
    state["model"] = model
    state["need_emb"] = model.encode(NEED_CONCEPTS, convert_to_tensor=True, normalize_embeddings=True)
    yield
    state.clear()


app = FastAPI(title="Business Analysis Model Service", lifespan=lifespan)


class DatasetCategory(BaseModel):
    category_id: str
    display_name: str
    source: str | None = None
    polarity: str = "context"


class AnalysisRequest(BaseModel):
    business_description: str
    supported_dataset_categories: list[DatasetCategory]


def polarity_sign(polarity: str) -> float:
    return {"positive": 1.0, "negative": -1.0, "context": 1.0}.get(polarity, 1.0)


def extract_needs(model, description: str) -> list[str]:
    desc_emb = model.encode(description, convert_to_tensor=True, normalize_embeddings=True)
    sims = util.cos_sim(desc_emb, state["need_emb"])[0].cpu().numpy()
    detected = [(NEED_CONCEPTS[i], float(sims[i])) for i in range(len(NEED_CONCEPTS)) if sims[i] >= NEED_THRESHOLD]
    detected.sort(key=lambda x: x[1], reverse=True)
    needs = [n for n, _ in detected[:5]]
    return needs or [NEED_CONCEPTS[int(np.argmax(sims))]]


def derive_business_type(description: str) -> str:
    words = description.strip().split()
    return " ".join(words[:6]) if words else "business"


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME}


@app.post("/model/business-analysis")
def business_analysis(req: AnalysisRequest):
    model = state["model"]
    needs = extract_needs(model, req.business_description)
    need_emb = model.encode(needs, convert_to_tensor=True, normalize_embeddings=True)

    selected = []
    layer_weights = []
    for cat in req.supported_dataset_categories:
        gloss = CATEGORY_GLOSS.get(cat.category_id, cat.display_name)
        cat_emb = model.encode(gloss, convert_to_tensor=True, normalize_embeddings=True)
        sim = float(util.cos_sim(cat_emb, need_emb)[0].max())
        include = sim >= CATEGORY_THRESHOLD or cat.category_id in BASELINE_CATEGORIES
        if not include:
            continue
        magnitude = round(max(sim, 0.15), 3)
        weight = round(magnitude * polarity_sign(cat.polarity), 3)
        selected.append(cat.model_dump())
        layer_weights.append({
            "category_id": cat.category_id,
            "weight": weight,
            "reason": f"matched need similarity {sim:.2f}; polarity {cat.polarity}",
        })

    return {
        "business_needs": {
            "business_type": derive_business_type(req.business_description),
            "needs": needs,
        },
        "selected_categories": selected,
        "layer_weights": layer_weights,
    }
