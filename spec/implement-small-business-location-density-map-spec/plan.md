# Implement `small_business_location_density_map` spec

## Context
We're building the hackathon system described in `.uploads/ad2f423a_project_schema.yaml`:
recommend promising **small-business locations in London** by matching a business
description to demographic + Google Maps data, producing a **weighted LSOA-level
heatmap**, and explaining the top 3 areas. The repo already has a working
Spring Boot backend (auth, port 6969), a React/TanStack/deck.gl frontend (port 3000,
auth wired, Google Maps + deck.gl already used in `MapsPage.jsx`), and local Postgres.
This plan adds the four spec services on top of that foundation.

**Decisions locked with the user:**
- **Spark**: precompute static demographic layers once; run a lightweight `spark-submit`
  job only for the **weighted combination** per request (spec's own recommended improvement).
- **Model service**: real **sentence-transformers** local embedding model.
- **API keys**: reuse the existing Google Maps key server-side for Places; user will supply
  an **xAI Grok** key (template fallback runs until then).
- **Datasets**: a focused category set (population density, age, economic activity, household
  deprivation) across **all ~4,800 London LSOAs**.

## Architecture / data flow
```
React (/recommendations) --POST /api/location-recommendations--> Spring Boot
  Spring Boot:
    1. POST FastAPI /model/business-analysis  -> business_needs, selected_categories, layer_weights
    2. Google Places (server-side)            -> competitor + relevant points (lat/lng)
    3. write spark_scoring_input.json (weights + points + selected cats)
    4. spark-submit combine_job.py            -> reads precomputed layers + input -> scored LSOA JSON
    5. read spark_output.json                 -> heatmap_layer + ranked top-3
    6. xAI Grok (top-3) or template fallback  -> explanations
    7. return combined_location_response
React renders: deck.gl GeoJsonLayer heatmap (final_score) + top-3 list + explanations
```

## Components & files

### 1. Datasets (new dir `data/`, gitignored)
- Download Nomis Census 2021 bulk zips (LSOA level CSVs): **TS006** population density,
  **TS007A** age, **TS066** economic activity, **TS011** household deprivation
  (from `https://www.nomisweb.co.uk/census/2021/bulk`).
- Download **ONS LSOA 2021 boundaries** GeoJSON (BGC generalized) + LSOA→LAD lookup
  from the ONS Open Geography Portal.
- Filter to the 33 London boroughs (LAD codes `E09000001`–`E09000033`).
- Add `data/` to `.gitignore`.

### 2. Precompute script (`model-service/precompute_layers.py` or `spark/precompute.py`)
- Join each Census CSV to LSOA geometry, restrict to London.
- Per category, **normalize** each LSOA value by the layer max (0..1).
- Emit `data/precomputed_layers.json`: per LSOA `{ lsoa_code, lsoa_name, geometry, centroid,
  normalized_layer_values{category_id: 0..1} }`. Run once.

### 3. Spark combine job (`spark/combine_job.py`, PySpark)
- Install **pyspark** via pip (provides `spark-submit`) — satisfies the spec's
  "external job invoked through spark-submit" without a full Spark cluster install.
- Args: input JSON path, output JSON path.
- Reads `precomputed_layers.json` + scoring input; aggregates Google Maps points to LSOA
  polygons (point-in-polygon → per-LSOA counts, then normalized as `competitors`/`relevant_locations`
  layers); multiplies normalized layers by weights; sums → `final_score`; writes
  `spark_output.json` (`lsoa_score` records).

### 4. FastAPI model service (new dir `model-service/`)
- `app.py`: `POST /model/business-analysis` (request: `business_description`,
  `supported_dataset_categories`; response: `business_needs`, `selected_categories`,
  `layer_weights`). Runs on port **8000**.
- Lightweight need extraction (business_type + needs array) + **sentence-transformers**
  cosine similarity between needs and category display names to select categories and assign
  weights; honor `polarity` (negative weight for `competitors`).
- `requirements.txt`: fastapi, uvicorn, sentence-transformers. Install via
  `python3 -m ensurepip` then pip into a venv. Model (~100MB) downloads on first run.

### 5. Spring Boot orchestrator (new package `com.zara.hack.location`)
Following existing patterns (`AuthProperties` record, `RestClient`, `CustomException`/`GlobalExceptionHandler`):
- `LocationController` — `POST /api/location-recommendations` (authenticated; reuses existing login/JWT).
- `LocationRecommendationService` — orchestrates steps 1–7 above.
- `ModelServiceClient` (RestClient → FastAPI), `GoogleMapsClient` (RestClient → Places API),
  `GrokExplanationClient` (RestClient → xAI) + `TemplateExplanationFallback`.
- `SparkScoringRunner` — `ProcessBuilder` running `spark-submit combine_job.py`, then reads output JSON.
- DTOs/records mirroring the spec contracts (`business_location_request`, `combined_location_response`,
  `lsoa_score`, `layer_weight`, `spark_scoring_input`).
- `LocationProperties` (`@ConfigurationProperties("app.location")`): model service URL, google maps key,
  grok key, spark-submit path, data dir, spark job path, temp io dir.
- `application.yml`: add `app.location.*`; `Backend/.env`: add `APP_LOCATION_GOOGLE_MAPS_KEY`,
  `APP_LOCATION_GROK_API_KEY` (added when user provides it), paths.
- No `SecurityConfig` change needed (endpoint stays authenticated like the rest of `/api/**`).

### 6. React frontend
- New route/page `frontend/src/pages/RecommendationsPage.jsx` (and route file under
  `src/routes/`), reusing `MapsPage.jsx`'s `loadGoogleMaps()` + `GoogleMapsOverlay` setup but
  swapping the opportunity layers for a deck.gl **`GeoJsonLayer`** of LSOA polygons colored by
  `final_score`.
- Form: city (London, fixed) + `business_description` textarea → `POST /api/location-recommendations`.
- New `frontend/src/api/recommendations.js` (uses existing axios `client.js`, Bearer auth).
- Render top-3 ranked locations + per-area explanations (with provider badge: Grok / template).
- Add nav entry in `AppShell.jsx`.

## Critical existing files to reuse
- `Backend/.../auth/config/AuthProperties.java` — `@ConfigurationProperties` record pattern.
- `Backend/.../auth/config/SecurityConfig.java` — CORS already allows all origins; `/api/**` authenticated.
- `Backend/.../exception/{CustomException,GlobalExceptionHandler,SparkProcessingException}.java` — error handling (SparkProcessingException currently unused → wire it into `SparkScoringRunner`).
- `frontend/src/pages/MapsPage.jsx`, `frontend/src/lib/googleMaps.js` — deck.gl + Google Maps overlay pattern.
- `frontend/src/api/client.js` — axios instance with Bearer + 401 refresh.

## Build order
1. `.gitignore` + download datasets into `data/`.
2. Precompute script → `precomputed_layers.json`.
3. Install pyspark; write + test `combine_job.py` standalone with a sample input.
4. FastAPI model service (install deps, verify `/model/business-analysis`).
5. Spring Boot `location` package (DTOs → clients → SparkRunner → service → controller → config).
6. React page + route + api + nav.
7. End-to-end wiring + Grok key.

## Verification (end-to-end)
- **Env preflight**: ensure `/etc/hosts` has `127.0.0.1 postgres`, `service postgresql start`,
  backend running on :6969 (container intermittently resets these).
- `python precompute_layers.py` produces `data/precomputed_layers.json` for all London LSOAs.
- `spark-submit spark/combine_job.py <in> <out>` produces a valid `lsoa_score` JSON from a sample input.
- `curl localhost:8000/model/business-analysis` returns needs + categories + weights.
- `curl -X POST localhost:6969/api/location-recommendations` (with auth) returns a
  `combined_location_response` with `heatmap_layer`, 3 `ranked_locations`, 3 `explanations`.
- In the browser (logged in): submit a business description → London LSOA heatmap renders via
  deck.gl, top-3 areas + explanations show. Test golden path + a vague description + a Grok-down
  (template fallback) case.

## Open notes
- xAI Grok key: added to `Backend/.env` as `APP_LOCATION_GROK_API_KEY` when provided; until then
  every top-3 explanation uses the deterministic template fallback (spec keeps fallback always on).
- Google Places server-side calls reuse the existing Maps key; cache responses per business
  description to respect quota (spec recommendation).
