# LOCUS — Location Opportunity & Commercial Understanding System

LOCUS is a data science and location intelligence platform for evaluating where a physical business should open inside a selected geographic area. A user describes a business idea, chooses a city or custom map region, and receives a scored opportunity surface that ranks London LSOAs using demographic, competitor, and nearby-place signals.

The current codebase implements a real end-to-end proof of concept: a React/Vite map UI, a Spring Boot orchestration backend, a FastAPI sentence-transformer model service, Python/Spark scoring scripts, JWT authentication, persisted analyses, saved regions, and optional Google Places plus OpenAI-compatible explanations. The implementation is focused on London and depends on local, gitignored Census/ONS data files.

## What LOCUS Does

LOCUS helps users compare physical locations for a business idea. For example, a user can enter `banitsa shop`, select London, and request the top candidate areas. The system extracts business needs, matches them to supported dataset categories, scores geographic cells, and returns ranked locations with explanations.

The product goal is to make location analysis understandable for small business owners and operators without requiring them to manually inspect many separate demographic, competitor, mobility, and infrastructure datasets.

## Problem Statement

Choosing a storefront is usually expensive, slow, and opaque. Small businesses often rely on intuition, basic foot-traffic observations, or fragmented public data, while larger companies can afford dedicated site-selection analysis. LOCUS narrows that gap by turning business intent and local datasets into explainable area recommendations.

## Key Features

- Business and area input for location analysis.
- Google Maps based exploration screen with deck.gl `GeoJsonLayer` visualization.
- City search mode and custom polygon selection mode for choosing a target area.
- LSOA-level heatmap rendering from backend-scored polygon data.
- Sentence-transformer model service for business-need extraction, category matching, and layer weighting.
- Spark-based scoring job that normalizes selected layers and sums weighted contributions.
- Supported demographic layers from Nomis Census 2021: age, population density, economic activity, and household deprivation.
- Optional Google Places Text Search for competitor and relevant-location point layers.
- Optional OpenAI-compatible explanation generation with deterministic Spring Boot fallback text.
- Persisted recommendation analyses linked to authenticated users.
- Saved regions with notes and tags.
- Region comparison page using AG Charts.
- Optional tilted 3D view using a Google Maps vector map ID.
- User registration, login, JWT access tokens, refresh tokens, and logout.
- Development MSW mocks for recommendations, health, devices, and alerts.
- Docker support for the Spring Boot backend.

## How LOCUS Works

The implemented proof-of-concept pipeline follows this flow:

1. The user enters a business description and target area.
2. The Spring Boot backend calls the FastAPI model service.
3. The model service uses `sentence-transformers/all-MiniLM-L6-v2` to detect business needs and match them to supported dataset categories.
4. LOCUS assigns signed layer weights. Positive/context layers increase a score; competitor pressure can reduce it.
5. If Google Maps server-side credentials are configured, the backend fetches competitor and relevant-place points through Google Places Text Search.
6. Spring Boot writes a Spark scoring input JSON file.
7. The Spark job reads precomputed London LSOA demographic layers and optional Google point layers.
8. Each selected layer is normalized independently:

```text
normalized = value / highest value in that layer
```

9. Each normalized layer is multiplied by its weight:

```text
weightedLayer = normalizedLayer * layerWeight
```

10. Weighted layers are added per LSOA:

```text
finalMap = sum(normalizedLayer * layerWeight)
```

11. The backend returns all scored LSOAs as `heatmap_layer`, a top-N `ranked_locations` list, and explanations.
12. The React frontend renders the result on Google Maps and lets users save or compare candidate regions.

Negative weights represent undesirable factors. For example, competitors can subtract from an otherwise strong location.

## Architecture Overview

```text
React pages
  -> React Query hooks
  -> API modules
  -> Axios client with JWT refresh handling
  -> Spring Boot REST API
  -> FastAPI model service + Google Places + Spark job + PostgreSQL
  -> React Google Maps/deck.gl rendering
```

### Frontend

The frontend is a JavaScript React application built with Vite. The LOCUS map experience lives in `frontend/src/pages/MapsPage.jsx`. It loads the Google Maps JavaScript API through `frontend/src/lib/googleMaps.js`, attaches a deck.gl `GoogleMapsOverlay`, and renders scored LSOA polygons with `GeoJsonLayer`. The dashboard shows recent analyses and saved regions, while `/compare` visualizes selected regions with AG Charts.

The frontend API layer includes:

- `frontend/src/api/auth.js` for auth calls to Spring Boot.
- `frontend/src/api/recommendations.js` for `POST /api/location-recommendations`.
- `frontend/src/api/analyses.js` for stored analysis summaries/details.
- `frontend/src/api/savedRegions.js` for saved-region CRUD.
- `frontend/src/api/client.js` for Axios setup, bearer tokens, and refresh-token retry logic.

### Backend

The backend is a Spring Boot application under `Backend/`. It implements:

- Signup.
- Login.
- Refresh token rotation.
- Logout and refresh-token revocation.
- JWT resource-server validation.
- PostgreSQL persistence for users, refresh tokens, analyses, analysis items, saved regions, and saved-region tags.
- Location recommendation orchestration through `LocationRecommendationService`.
- FastAPI model-service calls through `ModelServiceClient`.
- Google Places Text Search calls through `GoogleMapsClient`.
- External Spark job execution through `SparkScoringRunner`.
- OpenAI-compatible explanation calls through `OpenAiExplanationClient` with template fallback.
- Shared JSON error responses.

The health/devices/alerts routes are still frontend starter/demo resources served by MSW in development; they are not implemented as Spring Boot product endpoints.

## Tech Stack

### Frontend

- React 19
- Vite 8
- JavaScript and JSX
- Tailwind CSS 4
- shadcn/ui style primitives with Base UI
- TanStack Router
- TanStack Query
- Axios
- Zustand
- MSW
- Google Maps JavaScript API
- deck.gl with Google Maps integration
- AG Charts
- Motion
- Lucide React icons
- Geist font

### Backend

- Java 25
- Spring Boot 4.1
- Maven
- Spring Web
- Spring Security
- Spring Data JPA
- Spring Validation
- Spring OAuth2 Resource Server and JOSE JWT support
- PostgreSQL JDBC driver
- Lombok
- Apache Spark dependencies
- Kafka, MQTT, and Stripe dependencies are present in `pom.xml`, but active services/controllers for Kafka, MQTT, and Stripe are not implemented in this repository.
- Docker and Docker Compose

### Data And Model Pipeline

- Python
- FastAPI
- Uvicorn
- Pydantic
- NumPy
- Sentence Transformers
- PySpark
- Shapely
- Local JSON/CSV/GeoJSON files

## Installation

### Prerequisites

- Java 25
- Maven 3.9+
- Node.js and npm
- Python 3.11+ recommended for the model service and Spark job
- A PostgreSQL database, such as Supabase PostgreSQL
- Local London LSOA data files for production scoring
- A browser-restricted Google Maps JavaScript API key for the frontend map
- Optional server-side Google Places API key for competitor and relevant-location points
- Optional OpenAI-compatible API key for generated explanations
- Docker, optional, if you want to run the backend in a container

Clone the repository:

```bash
git clone <repo-url>
cd Zara-Hack-Big-M
```

## Environment Variables

Example environment files are included:

- `Backend/.env.example`
- `frontend/.env.example`

`Backend/.env.example` currently lists only auth/database variables. The location pipeline also reads `APP_LOCATION_*` values from `Backend/src/main/resources/application.yml`, so add them to your local backend `.env` when running full recommendations.

Create backend environment config:

```bash
cd Backend
cp .env.example .env
```

Backend variables:

```dotenv
APP_AUTH_SECRET=replace-with-long-random-secret
APP_AUTH_ISSUER=zara-hack-preparation
APP_AUTH_ACCESS_TOKEN_TTL=PT15M
APP_AUTH_REFRESH_TOKEN_TTL=P30D

SUPABASE_DB_URL=jdbc:postgresql://YOUR_POOLER_HOST:5432/postgres?sslmode=require
SUPABASE_DB_USER=postgres.your-project-ref
SUPABASE_DB_PASSWORD=your-supabase-database-password

SERVER_PORT=6969

APP_LOCATION_MODEL_SERVICE_URL=http://localhost:8000
APP_LOCATION_GOOGLE_MAPS_KEY=
APP_LOCATION_OPENAI_KEY=
APP_LOCATION_OPENAI_URL=https://proxy.openkbs.com/v1/openai/chat/completions
APP_LOCATION_OPENAI_MODEL=gpt-5.4-mini
APP_LOCATION_SPARK_SUBMIT_PATH=/path/to/spark-submit
APP_LOCATION_SPARK_JOB_PATH=/absolute/path/to/pipeline/combine_job.py
APP_LOCATION_PRECOMPUTED_LAYERS_PATH=/absolute/path/to/data/precomputed_layers.json
APP_LOCATION_JAVA_HOME=/path/to/jdk
APP_LOCATION_SPARK_HOME=/path/to/pyspark
APP_LOCATION_PYTHON_PATH=/path/to/python
APP_LOCATION_RUN_DIR=/absolute/path/to/data/runs
APP_LOCATION_RESULT_COUNT=3
```

Create frontend environment config:

```bash
cd frontend
cp .env.example .env.local
```

Frontend variables:

```dotenv
VITE_API_BASE_URL=http://localhost:6969
VITE_ENABLE_MOCKS=true
VITE_GOOGLE_MAPS_API_KEY=your-browser-google-maps-key
VITE_GOOGLE_MAPS_MAP_ID=
```

Notes:

- `VITE_ENABLE_MOCKS=true` enables frontend development mocks for recommendations and starter health/device/alert endpoints. Auth is still expected to come from the backend.
- `VITE_ENABLE_MOCKS=false` sends requests to the configured Spring Boot backend.
- `VITE_GOOGLE_MAPS_MAP_ID` is optional, but required for the frontend's 3D map toggle.
- Do not commit real `.env` or `.env.local` files.

## Running Locally

### 1. Prepare Data

The production scoring job expects local data files under a gitignored `data/` directory. The scripts refer to these paths:

```text
data/
|-- boundaries/
|   `-- london_lsoa_*.geojson
`-- nomis/
    |-- ts006/census2021-ts006-lsoa.csv
    |-- ts007a/census2021-ts007a-lsoa.csv
    |-- ts066/census2021-ts066-lsoa.csv
    `-- ts011/census2021-ts011-lsoa.csv
```

The code comments identify the expected sources as Nomis Census 2021 bulk LSOA CSVs and ONS LSOA 2021 boundary GeoJSON files. After placing those files locally, run:

```bash
python pipeline/precompute_layers.py
```

This writes:

```text
data/precomputed_layers.json
```

### 2. Model Service

Start the FastAPI model service before running real recommendations:

```bash
cd model-service
python -m venv ../.venv
../.venv/bin/pip install -r requirements.txt
../.venv/bin/uvicorn app:app --host 0.0.0.0 --port 8000
```

On Windows PowerShell, use the equivalent `..\.venv\Scripts\pip` and `..\.venv\Scripts\uvicorn` executables.

The model service downloads `all-MiniLM-L6-v2` on first run.

### 3. Spark Runtime

The Spark combine job imports `pyspark` and `shapely`. Install them in the Python environment used by `APP_LOCATION_PYTHON_PATH`:

```bash
../.venv/bin/pip install pyspark shapely
```

Then point `APP_LOCATION_SPARK_SUBMIT_PATH`, `APP_LOCATION_SPARK_JOB_PATH`, `APP_LOCATION_PRECOMPUTED_LAYERS_PATH`, `APP_LOCATION_PYTHON_PATH`, and `APP_LOCATION_RUN_DIR` at your local paths.

### Backend

Run the Spring Boot backend from the `Backend/` directory:

```bash
cd Backend
mvn spring-boot:run
```

The backend defaults to:

```text
http://localhost:6969
```

You can also run it with Docker Compose:

```bash
cd Backend
docker compose up --build
```

The provided Docker Compose file starts only the Spring Boot app and passes auth/database variables. Full recommendation scoring still needs the model service, local data files, Spark paths, and location environment variables.

### Frontend

Install dependencies and start Vite:

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server is configured to run on:

```text
http://localhost:3000
```

Useful frontend scripts:

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## Example Usage Flow

1. Prepare `data/precomputed_layers.json`.
2. Start the FastAPI model service on `localhost:8000`.
3. Start the Spring Boot backend on `localhost:6969`.
4. Start the frontend on `localhost:3000`.
5. Register a user or log in through the LOCUS UI.
6. Open the Explore page.
7. Enter a business type, such as `banitsa shop`.
8. Select London or draw a custom polygon on the map.
9. Choose how many top areas to return.
10. Click `Analyze this area`.
11. LOCUS extracts business needs, scores London LSOAs, renders the heatmap, and shows ranked locations with explanations.
12. Save promising regions, add notes/tags on the dashboard, or compare selected regions on `/compare`.

For frontend-only visual development, set `VITE_ENABLE_MOCKS=true`; the recommendation endpoint will use `frontend/src/mocks/locationRecommendations.fixture.json`.

## API And Services

### Implemented Spring Boot API

Base URL for local development:

```text
http://localhost:6969
```

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/auth/signup` | Create a user account. |
| `POST` | `/api/auth/login` | Authenticate and issue access/refresh tokens. |
| `POST` | `/api/auth/refresh` | Rotate a refresh token and issue a new token pair. |
| `POST` | `/api/auth/refresh-token` | Alias for refresh. |
| `POST` | `/api/auth/logout` | Revoke a refresh token. |
| `POST` | `/api/location-recommendations` | Run a location recommendation analysis for a city/business description. |
| `POST` | `/api/analyze` | Legacy/manual analysis item creation. |
| `GET` | `/api/analyze` | List the authenticated user's stored analysis summaries. |
| `GET` | `/api/analyze/{id}` | Load a stored analysis detail and saved recommendation result. |
| `PUT` | `/api/analyze/{id}` | Update legacy/manual analysis items. |
| `DELETE` | `/api/analyze/{id}` | Delete an owned analysis. |
| `POST` | `/api/saved-regions` | Save one LSOA from a stored analysis. |
| `GET` | `/api/saved-regions` | List saved regions for the authenticated user. |
| `PUT` | `/api/saved-regions/{id}` | Update notes/tags for a saved region. |
| `DELETE` | `/api/saved-regions/{id}` | Delete a saved region. |

The backend returns structured error responses with `timestamp`, `status`, `error`, `message`, and `path`.

Example recommendation request:

```json
{
  "city": "London",
  "business_description": "banitsa shop near students, offices, and busy pedestrian areas",
  "requested_result_count": 3,
  "region": null
}
```

Abbreviated recommendation response shape:

```json
{
  "analysis_id": 12,
  "city": "London",
  "business_needs": {
    "business_type": "banitsa shop near students, offices,",
    "needs": ["pedestrians and high foot traffic", "students and young people"]
  },
  "selected_categories": [
    { "category_id": "population_density", "display_name": "Population density", "source": "Nomis Census 2021 bulk data", "polarity": "positive" }
  ],
  "layer_weights": [
    { "category_id": "population_density", "weight": 0.339, "reason": "matched need similarity 0.34; polarity positive" }
  ],
  "heatmap_layer": ["array of scored LSOA records"],
  "ranked_locations": ["top scored LSOA records"],
  "explanations": ["area explanation records"]
}
```

### Frontend Mocked Development API

These endpoints are used by the frontend and currently mocked through MSW:

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/health` | Development health-check response. |
| `GET` | `/devices` | Starter/demo device data. |
| `GET` | `/alerts` | Starter/demo alert data. |
| `POST` | `/api/location-recommendations` | Demo LOCUS opportunity analysis fixture. |

### Model Service API

The FastAPI service runs separately from Spring Boot:

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/health` | Returns service health and model name. |
| `POST` | `/model/business-analysis` | Extracts business needs, selects dataset categories, and assigns layer weights. |

### External Services

- Google Maps JavaScript API is used for the interactive map.
- Google Maps vector map IDs can enable tilted 3D mode in the frontend.
- Google Places Text Search is used server-side when `APP_LOCATION_GOOGLE_MAPS_KEY` is configured.
- OpenAI-compatible chat completions are used for explanations when `APP_LOCATION_OPENAI_KEY` is configured; otherwise Spring Boot returns template explanations.
- PostgreSQL/Supabase is used by the backend for users, refresh tokens, analyses, and saved regions.

## Data Sources

Visible data sources in the current repository are:

- Nomis Census 2021 bulk LSOA CSVs expected under `data/nomis/` for population density, age, economic activity, and household deprivation.
- ONS LSOA 2021 boundary GeoJSON expected under `data/boundaries/`.
- `data/precomputed_layers.json`, generated locally by `pipeline/precompute_layers.py`.
- Google Places API point results for competitors and relevant nearby locations, when a server-side key is configured.
- Hard-coded demo recommendation fixture in `frontend/src/mocks/locationRecommendations.fixture.json`.
- Google Maps basemap data loaded in the browser.
- PostgreSQL/Supabase tables for authentication, stored analyses, and saved regions.

The actual `data/` directory is ignored by Git, so a fresh clone does not include the large local data files needed for production scoring.

## Folder Structure

```text
.
|-- Backend/
|   |-- Dockerfile
|   |-- docker-compose.yml
|   |-- endpoints.md
|   |-- pom.xml
|   |-- .env.example
|   `-- src/main/
|       |-- java/com/zara/hack/
|       |   |-- analyze/
|       |   |-- auth/
|       |   |-- location/
|       |   |-- saved/
|       |   `-- common/exception/
|       `-- resources/application.yml
|-- frontend/
|   |-- package.json
|   |-- vite.config.js
|   |-- .env.example
|   |-- public/
|   `-- src/
|       |-- api/
|       |-- components/
|       |-- hooks/
|       |-- lib/
|       |-- mocks/
|       |-- pages/
|       |-- routes/
|       |-- store/
|       `-- main.jsx
|-- model-service/
|   |-- app.py
|   `-- requirements.txt
|-- pipeline/
|   |-- precompute_layers.py
|   `-- combine_job.py
|-- spec/
|   `-- ...
|-- data/                  # local only, gitignored
`-- README.md
```

## Algorithm Overview

LOCUS scores London LSOAs rather than exact storefronts.

1. Static demographic layers are precomputed from local Census and boundary files.
2. Per request, model-selected categories and layer weights are sent to Spark.
3. Google Places point categories are counted inside LSOA polygons when enabled.
4. For each selected layer, values are normalized independently:

```text
normalized = value / highest value in that layer
```

5. Each normalized value is multiplied by the model weight.
6. The final score is the sum of weighted normalized values:

```text
finalMap = Σ(normalizedLayer * layerWeight)
```

Competitor layers use negative polarity, so they can subtract from the final score. LOCUS presents the highest-scoring LSOAs as promising areas to investigate, not guaranteed storefront choices.

## Testing

No automated test suite is currently present in the repository. The Maven `pom.xml` includes Spring Boot and Spring Security test dependencies, but there are no test classes. The frontend has lint/build scripts but no test runner.

Available verification commands:

```bash
cd frontend
npm run lint
npm run build
```

```bash
cd Backend
mvn test
```

For end-to-end validation, run the model service, backend, Spark/data pipeline, and frontend, then submit a recommendation request from `/maps`.

## Current Limitations And Assumptions

- London is the only city with expected precomputed demographic layers.
- Results are LSOA-level area recommendations, not exact storefront recommendations.
- The local `data/` directory is required for production scoring but is not committed.
- `Backend/.env.example` does not yet include the `APP_LOCATION_*` variables used by the location pipeline.
- The Docker Compose setup starts only the Spring Boot app; it does not package the model service, Spark runtime, or local data.
- Google Places data is optional and may be incomplete, quota-limited, or unavailable.
- Generated explanations require an OpenAI-compatible API key; otherwise the backend uses deterministic template explanations.
- Spark is invoked as an external process, which can be slow for interactive requests.
- Model-service weights are heuristic and should be validated against benchmark business prompts.
- The frontend recommendation mock uses a static fixture and does not mock authentication.
- The frontend contains some starter/demo routes (`/health`, `/devices`, `/alerts`) that are not part of the core LOCUS product flow.
- No license file is currently included.

## Future Improvements

- Add committed sample data or a documented data-download script for the London datasets.
- Expand dataset coverage beyond the current four Census demographic layers.
- Add additional cities and a city-to-dataset loading strategy.
- Add benchmark tests for model category selection and layer weights.
- Add automated backend, frontend, and pipeline tests.
- Move Spark scoring to a background job or cache repeated analyses.
- Add stronger validation and observability around external process failures.
- Improve competitor analysis with better query design and caching.
- Add deployment documentation for the model service, backend, frontend, and data volume.
- Add a project license.

## License

No license file is currently present. Add a license before distributing the project publicly or accepting external contributions.
