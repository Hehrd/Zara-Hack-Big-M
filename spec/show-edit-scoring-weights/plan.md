# Show & Edit Scoring Weights

## Context

When Locus runs a location analysis, the model service derives a set of **layer
weights** (one per dataset category, e.g. `population_density`, `competitors`,
`age`) that determine how each LSOA's `final_score` is computed. Today these
weights are returned in the recommendation response (`layer_weights`) but are
**never shown to the user**, and the user has no way to influence them.

The user wants to (1) **display** the weights that drive the ranking and (2) let
the user **edit individual parameter weights** and see the ranking update.

Key enabler: every `LsoaScore` already carries `normalized_layer_values` (the
per-layer normalized inputs) alongside `weighted_layer_values` and `final_score`
(`LsoaScore.java:15-17`). So a re-score is just:
`new_weighted[cat] = normalized[cat] * new_weight[cat]`, `final_score = Σ new_weighted`.
**No model service, Google Maps, or Spark call is needed** — recompute from the
stored analysis result.

Decisions confirmed with the user:
- **Backend endpoint** does the re-score (frontend stays mostly API wiring + a weights panel).
- **Persist** edited weights/result to the stored analysis (reopening shows the adjustment).
- **Sliders + Apply** control for editing (recommended default; user did not object).

---

## Backend (`Backend/src/main/java/com/zara/hack`)

### 1. Request DTO — `analyze/controller/dto/ReqRescoreDTO.java` (new)
Snake_case record carrying the user's weight overrides:
```java
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record ReqRescoreDTO(@NotEmpty List<WeightOverride> weights) {
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record WeightOverride(@NotBlank String categoryId, double weight) { }
}
```

### 2. Re-score logic — `analyze/service/AnalysisService.java`
Add `AnalysisDetailDTO rescoreAnalysis(Long userId, Long analysisId, ReqRescoreDTO req)`:
- `AnalysisEntity entity = findOwnedAnalysis(userId, analysisId)` (existing helper).
- Parse stored result: `CombinedLocationResponse res = jsonMapper.readValue(entity.getResult(), CombinedLocationResponse.class)` (record uses `@JsonNaming` snake_case, so round-trips cleanly).
- Build `Map<String,Double> overrides` from `req.weights()`.
- **New layer weights**: map over `res.layerWeights()`, replacing `weight` where the categoryId is in `overrides` (append `" (edited)"` to `reason`); leave others untouched. Only existing categories are editable.
- **Recompute every LSOA** in `res.heatmapLayer()`: for each `LayerWeight lw` in the new weights, `w = lw.weight()`, `nv = score.normalizedLayerValues().getOrDefault(lw.categoryId(), 0.0)`, accumulate `weighted.put(catId, w*nv)` and `sum += w*nv`. Build a new immutable `LsoaScore` (copy lsoaCode/lsoaName/geometry/centroid/normalizedLayerValues, set new `weightedLayerValues` + `finalScore`).
- **Re-rank**: sort recomputed heatmap by `finalScore` desc; `ranked = top-N` using `entity.getRequestedResultCount()` (fallback to size).
- **Explanations**: keep existing explanations whose `lsoaCode` is in the new ranked set (text is per-area, still valid); drop the rest.
- Build a new `CombinedLocationResponse` (same `analysisId`, city, businessNeeds, selectedCategories; new layerWeights/heatmap/ranked/filtered-explanations).
- **Persist**: `entity.setResult(jsonMapper.writeValueAsString(newResponse))`, save via the injected repository.
- Return `getAnalysisDetail(userId, analysisId)` (or build the same `AnalysisDetailDTO` from the new response) so the shape matches `GET /api/analyze/{id}`.

> Reuse the existing `jsonMapper`, `findOwnedAnalysis`, and the analysis repository already in `AnalysisService` (added for `saveLocationAnalysis`). No new entity fields — the result column already holds everything.

### 3. Endpoint — `analyze/controller/AnalysisController.java`
```java
@PostMapping("/{id}/rescore")
public AnalysisDetailDTO rescore(@AuthenticationPrincipal Jwt jwt,
                                 @PathVariable Long id,
                                 @Valid @RequestBody ReqRescoreDTO req) {
    return analysisService.rescoreAnalysis(userId(jwt), id, req);
}
```
`/api/analyze/**` is already `authenticated()`; ownership enforced via `findOwnedAnalysis` (404 for other users), mirroring existing endpoints.

---

## Frontend (`frontend/src`)

### 4. API binding — `api/analyses.js`
```js
export async function rescoreAnalysis(id, weights) {
  const { data } = await apiClient.post(`/api/analyze/${id}/rescore`, { weights })
  return data // AnalysisDetailDTO { id, city, region, result, created_at }
}
```
`weights` = `[{ category_id, weight }, …]`.

### 5. Hook — `hooks/useAnalyses.js`
Add `useRescoreAnalysis()` mutation (`mutationFn: ({ id, weights }) => rescoreAnalysis(id, weights)`); on success `setQueryData(['analyses', id], data)` and invalidate `['analyses']`.

### 6. MapsPage — display + edit weights (`pages/MapsPage.jsx`)
- Add `const [rescoredResult, setRescoredResult] = useState(null)` and make the
  result source prefer it:
  `const rawResult = rescoredResult ?? recommend.data ?? storedAnalysis.data?.result ?? undefined`.
  Reset it to `null` in `clearMap()` and right before a new `recommend.mutate(...)`.
- `const rescore = useRescoreAnalysis()`; on apply:
  `rescore.mutate({ id: analysisId, weights }, { onSuccess: (data) => setRescoredResult(data.result) })`.
  The existing `result`/`featureCollection`/map `useEffect` chain re-renders the
  heatmap automatically from the new `rawResult`.
- **Weights panel** (new small component `WeightsEditor` in this file), rendered
  in `ResultPanel`:
  - For each entry in `result.layer_weights`: label = matching
    `result.selected_categories[].display_name` (fallback `category_id`),
    a range slider (`-1`…`1`, step `0.01`), the numeric value, and `reason` as title text.
  - Local state seeded from `result.layer_weights` (re-seed via `useEffect` when
    the result/analysisId changes).
  - **Apply** button (disabled when `analysisId == null` or `rescore.isPending`,
    shows "Applying…") and a **Reset** button restoring the seed values.
  - Negative weights styled to read as "penalty" (e.g. amber), positives emerald.

> Per the project memory note (frontend edits limited to API wiring unless
> confirmed), this UI was explicitly requested and confirmed in planning.

---

## Critical files
- `Backend/.../analyze/controller/dto/ReqRescoreDTO.java` (new)
- `Backend/.../analyze/service/AnalysisService.java` (add `rescoreAnalysis`)
- `Backend/.../analyze/controller/AnalysisController.java` (add endpoint)
- `Backend/.../location/controller/dto/{CombinedLocationResponse,LsoaScore,LayerWeight,BusinessNeeds,DatasetCategory,LocationExplanation,Centroid}.java` (read-only — confirm records deserialize from stored JSON)
- `frontend/src/api/analyses.js`, `frontend/src/hooks/useAnalyses.js`
- `frontend/src/pages/MapsPage.jsx` (weights panel + result source)

## Verification (end-to-end)
1. Build backend (`JAVA_HOME=/opt/jdk25 mvn -q -DskipTests package` in `Backend/`); restart on 6969 with env loaded.
2. Auth (signup/login) → need an analysis with a stored result. If the live
   recommendation pipeline (model-service/Spark/Maps) is unavailable locally,
   verify the round-trip by inspecting an existing `analyses.result` row,
   then `POST /api/analyze/{id}/rescore` with `{ "weights":[{"category_id":"competitors","weight":-0.9}] }`
   and confirm: 200, `result.layer_weights` reflects the edit, `final_score`s and
   `ranked_locations` order change, and the `analyses.result` column is updated.
3. Ownership: a second user gets 404 on `POST /api/analyze/{id}/rescore`.
4. Frontend: `npm run build`; in the browser, run/open an analysis → weights panel
   lists each parameter with its weight → move a slider → Apply → heatmap and
   ranked list update; Reset restores original; reopening the analysis from the
   dashboard shows the persisted edited weights.
5. Note explicitly which steps couldn't run locally if the recommendation
   pipeline is unavailable.
