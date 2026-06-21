# Saved Regions (within Analysis context) + Dashboard

## Context

Locus lets users run a location analysis (city + business description + optional
polygon → scored LSOAs). Today that flow is **stateless**: `POST /api/location-recommendations`
computes results and returns them without persisting anything. The `analyses`
table exists but only stores a `List<String>` and is not wired to the location flow.

The user wants to **save individual LSOA regions** that surface during an analysis.
A saved region is meaningless on its own — it only exists in the context of the
analysis that produced it. So each saved region must:
- snapshot the analysis parameters it was scored under (city, business description, count),
- store the region's score (and identity: LSOA code/name/centroid),
- link to the parent analysis id so the user can re-open the full analysis,
- carry user **notes** and **tags**.

Decisions confirmed with the user:
- **Persist the analysis on run** so it has an id to link to and can be re-opened.
- A "region" = a predefined **LSOA** from the results (not the user's drawn polygon).
- **Denormalize** snapshot data onto the saved region for easy sending to the frontend.
- Dashboard shows both **Recent analyses** and **Saved locations** (explicit UI request).
- Region management assumed **view + edit notes/tags + delete** (full CRUD) — flag if wrong.

---

## Backend (Spring Boot, `Backend/src/main/java/com/zara/hack`)

### 1. Persist analysis on run

**`analyze/persistence/entity/AnalysisEntity.java`** — add columns (keep existing
`analysis` List<String> and timestamps untouched):
- `String city` (`columnDefinition = "text"`)
- `String businessDescription` (`columnDefinition = "text"`)
- `String region` (`columnDefinition = "text"`, nullable) — serialized GeoJSON polygon
- `Integer requestedResultCount`
- `String result` (`columnDefinition = "text"`) — serialized `CombinedLocationResponse`

Store `region`/`result` as JSON **strings** (serialize with the app ObjectMapper)
to avoid Jackson-3 (`tools.jackson`) vs Hibernate JSON-type mismatch. Parse back
to `JsonNode` when returning detail. (`ddl-auto: update` adds the columns.)

**`location/controller/LocationController.java`** — add `@AuthenticationPrincipal Jwt jwt`
(endpoint is already `authenticated()` per `SecurityConfig.java:46`), extract
`Long.valueOf(jwt.getSubject())`, pass to service. Mirror the `userId(jwt)` helper
used in `AnalysisController.java:57`.

**`location/service/LocationRecommendationService.java`** — after computing the
response, persist an `AnalysisEntity` for the user (city, businessDescription,
serialized region, count, serialized result) and obtain its new id. Inject
`AnalysisService` (add a method there rather than wiring repos directly here).

**`CombinedLocationResponse.java`** — add `Long analysisId` field so the frontend
receives the id to save regions against. (Snake_case → `analysis_id` on the wire.)

### 2. Read analyses for the dashboard

**`analyze/persistence/repository/AnalysisRepository.java`** — existing
`findAllByUserIdOrderByCreatedAtDesc` + `findByIdAndUserId` are sufficient.

**`analyze/controller/AnalysisController.java` + `AnalysisService.java`**:
- `GET /api/analyze` → return lightweight **summaries** (`id, city, businessDescription,
  requestedResultCount, createdAt`) — new `AnalysisSummaryDTO`. (Replaces current
  text-list response; frontend doesn't consume the old shape yet.)
- New `GET /api/analyze/{id}` → **detail** including the parsed `result` `JsonNode`
  for re-display — new `AnalysisDetailDTO`. Scope via `findByIdAndUserId`.
- Leave existing manual `POST/PUT/DELETE` intact (legacy; not the focus).

### 3. SavedRegion feature (mirror the `analyze` package layout)

- **`saved/persistence/entity/SavedRegionEntity.java`**: `id`; `@ManyToOne AppUser user`
  (`user_id`); `@ManyToOne AnalysisEntity analysis` (`analysis_id`, optional=false);
  `String lsoaCode, lsoaName`; `double finalScore`; `Double centroidLat, centroidLng`;
  snapshot `String city, businessDescription`, `Integer requestedResultCount`;
  `String notes` (text, nullable); `@ElementCollection List<String> tags`;
  `Instant createdAt, updatedAt` via `@PrePersist/@PreUpdate` (copy from AnalysisEntity).
- **`saved/persistence/repository/SavedRegionRepository.java`**:
  `findAllByUserIdOrderByCreatedAtDesc(userId)`, `findByIdAndUserId(id, userId)`.
- **`saved/service/SavedRegionService.java`**:
  - `save(userId, req)`: load owned analysis via `findByIdAndUserId`; parse its stored
    `result`; locate the `LsoaScore` whose `lsoaCode` matches → snapshot
    `lsoaName/finalScore/centroid` **server-side** (don't trust client for score);
    snapshot `city/businessDescription/requestedResultCount` from the analysis;
    set `notes`/`tags` from the request.
  - `list(userId)`, `update(userId, id, notes, tags)`, `delete(userId, id)` — all
    enforce ownership (mirror `findOwnedAnalysis` in `AnalysisService.java:56`).
- **`saved/controller/SavedRegionController.java`** (`@AuthenticationPrincipal Jwt`):
  - `POST /api/saved-regions` (201)
  - `GET /api/saved-regions`
  - `PUT /api/saved-regions/{id}` (notes/tags)
  - `DELETE /api/saved-regions/{id}` (204)
- **DTOs** (`saved/controller/dto`, `@JsonNaming(SnakeCaseStrategy)` like the
  location DTOs): `ReqSaveRegionDTO(analysisId, lsoaCode, notes, List<String> tags)`,
  `ReqUpdateSavedRegionDTO(notes, tags)`,
  `ResSavedRegionDTO(id, analysisId, lsoaCode, lsoaName, finalScore, centroidLat,
  centroidLng, city, businessDescription, requestedResultCount, notes, tags,
  createdAt, updatedAt)`.
- **`common/exception/SavedRegionNotFoundException.java`** mirroring
  `AnalysisNotFoundException`; add to the existing exception handler if one maps it.

---

## Frontend (Vite/React, `frontend/src`)

> UI work is in scope here because the user explicitly asked to surface this on
> the dashboard; the save action on the map is the minimum needed to create the data.

### API bindings (axios `apiClient`, token attached by interceptor)
- **`api/savedRegions.js`**: `getSavedRegions()`, `saveRegion({analysisId, lsoaCode, notes, tags})`,
  `updateSavedRegion(id, {notes, tags})`, `deleteSavedRegion(id)`.
- **`api/analyses.js`**: `getAnalyses()`, `getAnalysis(id)`.

### React Query hooks (mirror `hooks/useAlerts.js`)
- **`hooks/useSavedRegions.js`**: `useSavedRegions()` query; `useSaveRegion()`,
  `useUpdateSavedRegion()`, `useDeleteSavedRegion()` mutations invalidating
  `['saved-regions']`.
- **`hooks/useAnalyses.js`**: `useAnalyses()`, `useAnalysis(id)`.

### `pages/MapsPage.jsx`
- Read `result.analysis_id` from the recommendation response.
- In `ResultPanel` (`MapsPage.jsx:450`), add a **Save** button per ranked location
  row (`MapsPage.jsx:474`) → `useSaveRegion().mutate({ analysisId, lsoaCode: loc.lsoa_code })`
  (notes/tags left empty at save, edited later on the dashboard). Show saved/disabled state.
- Support re-opening a stored analysis: read an `analysis` search param; if present,
  `useAnalysis(id)` and seed the rendered `result` so the existing map/panel show it.
  (Enables "go check the whole analysis from the region".)

### `pages/DashboardPage.jsx`
Replace the two `EmptyPanel` stubs (`DashboardPage.jsx:17-18`) with real panels,
keeping empty states:
- **Recent analyses** ← `useAnalyses()`: city, business description, count, date;
  click → `/maps?analysis=<id>`.
- **Saved locations** ← `useSavedRegions()`: lsoaName + score, city/description
  snapshot, notes, tag chips; inline edit notes/tags (`useUpdateSavedRegion`),
  delete (`useDeleteSavedRegion`), link to parent analysis (`/maps?analysis=<analysisId>`).

---

## Critical files
- `Backend/.../analyze/persistence/entity/AnalysisEntity.java`
- `Backend/.../analyze/{controller/AnalysisController,service/AnalysisService}.java`
- `Backend/.../location/controller/LocationController.java`,
  `location/service/LocationRecommendationService.java`,
  `location/controller/dto/CombinedLocationResponse.java`
- `Backend/.../saved/**` (new package: entity, repository, service, controller, dto)
- `frontend/src/api/{savedRegions,analyses}.js`,
  `frontend/src/hooks/{useSavedRegions,useAnalyses}.js`
- `frontend/src/pages/{MapsPage,DashboardPage}.jsx`

## Verification (end-to-end)
1. Build backend (`./mvnw -q -DskipTests package` in `Backend/`); start it (port 6969).
2. Start frontend (`npm run dev` in `frontend/`, port 3000); log in.
3. Run an analysis on `/maps` → confirm response now carries `analysis_id` and a row
   appears in the `analyses` table.
4. Click **Save** on a ranked region → row appears in `saved_regions` with snapshotted
   city/description/count + correct score/lsoa; `GET /api/saved-regions` returns it.
5. Dashboard shows the analysis under **Recent analyses** and the region under
   **Saved locations**; edit notes/tags and delete both work (lists refresh).
6. Click a saved region's analysis link → `/maps?analysis=<id>` re-renders the stored
   result surface.
7. Ownership: a second user cannot read/update/delete the first user's saved regions
   or analyses (404).
