# ZaraHack 2026 — Project Submission (HACKATHON.md)

> **LOCUS — Location Opportunity & Commercial Understanding System**

---

## 1. Team

*Who are you, and where does everything live?*
**(helps your score on: Team Work)**

- **Team name:** Big M
- **Members (name — what each person did):** Aleksandar Dyankov, Aleksandar Gorbanov, Georgi Ralchev, Alek Miltenov, Kamen Zhelezarski
- **How did you split the tasks? Who did what?:** <!-- TODO (optional): add a one-line per-person breakdown if you want to score higher on Team Work. -->
- **Repo:** https://github.com/Hehrd/Zara-Hack-Big-M

---

## 2. What Problem Are You Solving?

*What's the problem, and who actually has it?*
**(helps your score on: Idea & Data Integrity)**

Choosing where to open a physical business is expensive, slow, and opaque. Small business owners usually rely on gut feeling, basic foot-traffic observation, or fragmented public data, while big companies can afford dedicated site-selection consultants. LOCUS closes that gap for independent operators — a person opening a café, shop, or studio — by turning a plain-language business idea plus open demographic data into explainable, ranked area recommendations.

---

## 3. How Do You Solve It? (in plain language)

*Explain it to a normal person (grandpa style) — no tech words allowed.*
**(helps your score on: Presentation)**

You type what kind of shop you want to open — say, "a banitsa shop" — and point at a city or draw a region on a map. LOCUS then colours the map to show which neighbourhoods are the best fit for that business, and tells you *why* each one scored well (lots of young people, few competitors nearby, dense population, and so on). Instead of guessing, you get a ranked shortlist of places worth visiting in person.

---

## 4. What Technologies Do You Use?

*List the building blocks: languages, frameworks, services, libraries, APIs.*
**(helps your score on: Tech Execution)**

- **Languages:** Java 25, Python 3.11+, JavaScript (JSX)
- **Frontend:** React 19 + Vite, Tailwind CSS 4 (shadcn/ui + Base UI), TanStack Router & Query, Zustand, Axios, deck.gl + Google Maps JS API, AG Charts / Recharts, Motion, MSW (dev mocks)
- **Backend:** Spring Boot 4.1 (Spring Web, Spring Security OAuth2 Resource Server / JWT, Spring Data JPA), Maven, Lombok, Apache Spark 4.1.2
- **Model service:** FastAPI + Uvicorn, sentence-transformers (`all-MiniLM-L6-v2`), NumPy, Pydantic
- **Data / scoring:** Python + PySpark, Shapely (geometry), GeoJSON/CSV/JSON
- **Database:** PostgreSQL (Supabase in production), Hibernate/JPA
- **APIs / services:** Google Maps JS API (map render), Google Places Text Search (competitor/nearby points, optional), OpenAI-compatible Chat Completions for area explanations (optional, via `proxy.openkbs.com`)
- **Hosting / deployment:** Docker (Spring Boot backend); OpenKBS platform config present (`openkbs.json`)

---

## 5. How Do You Wire Them Together?

*The architecture — how do the pieces talk to each other?*
**(helps your score on: Tech Execution)**

```
[React/Vite map UI :3000]
        │  Axios + JWT
        ▼
[Spring Boot orchestrator :6969]
        ├──► [FastAPI model service :8000]  — sentence-transformer embeddings
        │       extracts business needs, matches them to dataset categories,
        │       returns signed layer weights
        ├──► [Google Places Text Search]    — competitor + nearby-place points (optional)
        ├──► [Spark job (combine_job.py)]    — normalizes each demographic/point layer,
        │       multiplies by its weight, sums per LSOA → final opportunity score
        ├──► [OpenAI-compatible API]         — natural-language "why this area" text (optional;
        │       deterministic template fallback if unconfigured)
        └──► [PostgreSQL/Supabase]           — users, JWT refresh tokens, analyses, saved regions
        ▼
[React UI] renders a scored LSOA heatmap (deck.gl GeoJsonLayer) + ranked locations
```

Flow: the user's business description + chosen area go to Spring Boot. It asks the model service which demographic layers matter and how much, optionally pulls competitor points from Google Places, then runs a Spark job that normalizes and weight-sums all selected layers over London's ~4,835 LSOAs. The scored polygons come back to the frontend as a heatmap with an explainable, ranked shortlist.

---

## 6. Do You Train an ML Model?

*ML is a bonus, not a must — be honest either way.*
**(helps your score on: AI Fluency)**

We use a machine-learning model but **do not train or fine-tune one ourselves.**

- **What the model does:** Reads the user's free-text business description and matches it to the relevant demographic dataset categories (e.g. "students and young people", "dense population", "competitors nearby"), then emits a signed weight per category that drives the scoring.
- **Base model / starting point:** `all-MiniLM-L6-v2`, a pretrained sentence-embedding model from the open-source **sentence-transformers** project (distributed via Hugging Face). We load the off-the-shelf checkpoint as-is — no training, no fine-tuning.
- **How we "use" it:** At request time we embed the business needs and a curated set of category descriptors ("glosses"), then take cosine similarity between them. Categories above a similarity threshold are selected; the similarity magnitude (× polarity sign) becomes the layer weight. All thresholds and category glosses are hand-curated and deterministic.
- **How we check it's reasonable:** Selection and weighting are inspectable — every recommendation shows which layers were chosen and their weighted contribution, so output is explainable rather than a black box. (No held-out accuracy metric, since nothing is trained — see the Honesty Box.)

---

## 7. What Datasets Do You Use, and How?

*Real, public data is the heart of this hackathon — show yours off.*
**(helps your score on: Idea & Data Integrity)**

**Dataset 1 — UK Census 2021 (Nomis bulk, LSOA level)**
- Source: Nomis / UK Office for National Statistics bulk download (`https://www.nomisweb.co.uk`)
- Why this data: LSOA-level demographics (age, population density, economic activity, household deprivation, ethnicity, religion, etc. — ~25 Census tables) are exactly the "who lives here" signals that predict whether a business fits a neighbourhood.
- What we did to it: Loaded the per-table CSVs, joined them by LSOA code, and derived per-LSOA layer values. Precomputed once into `data/precomputed_layers.json` (~4,835 London LSOAs × 41 layers) via `pipeline/precompute_layers.py`.

**Dataset 2 — ONS LSOA 2021 Boundaries (GeoJSON)**
- Source: ONS official LSOA 2021 boundaries
- Why this data: Gives each LSOA its polygon geometry + centroid, so demographic values can be mapped, point data can be aggregated spatially, and the frontend can draw the heatmap.
- What we did to it: Parsed the GeoJSON, attached geometry/centroids to each LSOA record, and used Shapely for spatial indexing when aggregating point layers.

**Dataset 3 — Google Places Text Search (live, optional)**
- Source: Google Places API
- Why this data: Supplies competitor locations and relevant nearby venues as point layers, which the Spark job aggregates into each LSOA.
- What we did to it: Server-side fetch (when a key is configured), then spatial aggregation to LSOA polygons. Gracefully degrades if absent.

> **Note on accuracy/ethics:** Census + ONS are authoritative, openly licensed UK government open data, used at aggregate LSOA level (no personal data). The large data files are **gitignored** — a fresh clone must download the Nomis CSVs + ONS GeoJSON and run `pipeline/precompute_layers.py` to regenerate `precomputed_layers.json`.

---

## 8. How Will the Platform Scale?

*Imagine 10,000 people show up tomorrow — what happens?*
**(helps your score on: Adaptive Sustainability)**

The stateless parts hold up well: the React frontend is static/CDN-friendly, and Spring Boot + Postgres (Supabase) scale horizontally behind a pool. The first thing to break is **scoring** — today a Spark job is launched as an external `spark-submit` process per request, which is heavy for interactive traffic. The fix is to precompute/cache scores per (business-type, region) and move scoring to a background queue, since the demographic layers are static and only the weights change. The embedding model service is cheap and easily replicated. The other limit is coverage: only London has precomputed layers, so scaling to more cities means running the precompute pipeline per region.

---

## 9. What Challenges Did You Face?

*Every project hits walls — tell us about yours and how you climbed over.*
**(helps your score on: Tech Execution)**

Our hardest struggles were non-technical as much as technical: figuring out the right **business model and architecture** for the product took real debate before we settled on the AI-to-demographic-layers approach. Sizing up the competition was also tricky — the market is small, but it was hard to pin down exactly what existing tools could and couldn't do. On the build side, turning fragmented Census tables and ONS boundaries into one consistent per-LSOA scoring surface was the main engineering wall, which we solved with a one-time precompute step (`precompute_layers.py`) so scoring stays fast and reproducible.

---

## 10. Did You Check What Already Exists?

*Most teams skip this — so doing it is an easy way to stand out. ⭐*
**(helps your score on: Idea & Data Integrity)**

Our closest competitor is **GapMaps**, a commercial location-analytics tool. We found it limited for our use case and, crucially, it does not use AI to analyse a business idea and translate it into the demographic signals that matter. LOCUS's twist is the AI-driven step: a user describes their business in plain language, and an embedding model maps that to the right demographic layers, producing a transparent, explainable score per area — aimed at independent small-business owners rather than enterprise GIS users.

---

## 11. Where Did You Use AI, and What's Not Yours?

*Be open about your helpers — the rules require disclosing AI and third-party work.*
**(helps your score on: AI Fluency)**

- **AI tools used (and for what):**
  - `all-MiniLM-L6-v2` (pretrained sentence-transformer) — runs inside the product to match business descriptions to dataset categories. **Not trained by us; not trained by Claude/OpenAI either** — it's an open-source model from the sentence-transformers project.
  - **OpenAI API** (via the OpenKBS proxy) — generates natural-language area explanations at runtime.
  - **OpenKBS** — platform/AI proxy used to route model calls and host elastic services.
  - **Codex** — AI coding assistant used during development.
- **Third-party code / templates / tutorials you reused:** shadcn/ui + Base UI components, deck.gl, TanStack Router/Query, and standard framework scaffolding (Vite, Spring Boot, FastAPI). <!-- TODO: add any tutorial/starter you copied from, with links. -->
- **Their licences:** sentence-transformers / `all-MiniLM-L6-v2` (Apache-2.0), React/Vite/deck.gl/TanStack (MIT), Spring Boot (Apache-2.0), FastAPI (MIT). <!-- TODO: confirm. -->

---

## 12. Honesty Box

*The most underrated section. Tell us what's NOT done.*
**(helps your score on: Tech Execution)**

- **The embedding model is pretrained, not custom** — it works well, but it can be swapped for a custom-trained model to better fit our specific business-to-demographic matching.
- **Datasets are open-source and not the latest** — the Census/ONS data isn't up to date. With sponsorship, these could be replaced with fresher, higher-quality data sources.
- **Small UI bugs remain** — a few rough edges in the interface that are fixable with small tweaks.
- **Coverage is London-only** — only London has precomputed demographic layers; other cities won't score until the precompute pipeline is run for them.
- **Scoring is not production-fast** — Spark is invoked as an external `spark-submit` process per request, fine for a demo but slow under real load.
- **Data isn't in the repo** — the Census/ONS files are gitignored; a clean checkout can't score anything until you download them and run `precompute_layers.py`.
- **Optional pieces degrade silently** — Google Places competitor data and OpenAI explanations only work if their API keys are configured; without them you get fewer point layers and template (non-AI) explanation text.

---

**Before you commit:** Did you replace every TODO block (especially Section 1 — team)? Are all your links real? Did you double-check no secrets snuck in? Great — commit this file and good luck!
