# Commit & push the Google Maps points overlay changes

## Context

The working tree has 5 uncommitted modified files that together add a coherent
feature: rendering the backend's Google Maps point layers (competitors /
relevant locations) as a colored scatterplot overlay on the map. The user wants
everything that is not gitignored staged, committed, and pushed.

**Complication discovered:** the local branch is **behind `origin/main` by 4
commits** (someone pushed a "private/public element for analyses and locations"
feature). A plain `git push` will be rejected as non-fast-forward, so the
local commit must be reconciled onto `origin/main` first.

## What's changing (all 5 files already tracked, none gitignored)

- `Backend/.../location/controller/dto/CombinedLocationResponse.java` — add
  `List<GoogleMapsPoint> googleMapsPoints` field to the record + its
  `withAnalysisId` copy.
- `Backend/.../location/service/LocationRecommendationService.java` — pass
  `points` into the new constructor arg.
- `Backend/.../analyze/service/AnalysisService.java` — pass
  `res.googleMapsPoints()` into the rescore response (line ~115).
- `frontend/src/pages/MapsPage.jsx` — `buildPointsLayer` ScatterplotLayer,
  `mapPoints`/`pointLegend` memos, push points layer onto the deck.gl overlay,
  add a "Nearby places" legend.
- `frontend/src/mocks/locationRecommendations.fixture.json` — regenerated MSW
  mock fixture (**~314k line insertion** — large but already tracked; included
  per the "commit everything not gitignored" instruction).

No untracked files this run (the friends/account/settings/spec files were
already committed in `155c8cb`).

## Conflict assessment (why rebase is safe)

The 4 remote commits change: AnalysisController, AnalysisDetailDTO,
AnalysisSummaryDTO, AnalysisEntity, AnalysisRepository, **AnalysisService.java**,
ReqVisibilityDTO, FriendService, and the saved-region classes. The only overlap
with local work is `AnalysisService.java`, but the remote edits are in the
imports / constructor / lines 15–95, while the local edit is at line ~113 inside
`rescoreAnalysis` — non-overlapping, so the rebase replays cleanly. Remote does
**not** touch `CombinedLocationResponse.java`, `MapsPage.jsx`, or the fixture.

## Steps

1. `git add -A` — stage the 5 modified files.
2. Commit:
   ```
   feat: render google maps point layers on the map

   - add googleMapsPoints to CombinedLocationResponse and thread it through
     LocationRecommendationService and AnalysisService rescore
   - render competitors/relevant-locations as a deck.gl ScatterplotLayer overlay
     with a "Nearby places" legend in MapsPage
   - regenerate locationRecommendations mock fixture with point data
   ```
3. Reconcile with the diverged remote: `git pull --rebase origin main`.
   - Expected to apply with no conflicts (see assessment above).
   - **If a conflict occurs in `AnalysisService.java`**, resolve by keeping both
     sides: the remote's visibility methods AND the local `res.googleMapsPoints()`
     constructor arg, then `git rebase --continue`.
4. `git push origin main`.
5. Confirm with `git status` (clean, ahead by 0 / up to date) and
   `git log --oneline -3`.

## Verification

- `git status` shows a clean tree and `Your branch is up to date with
  'origin/main'`.
- `git log --oneline origin/main -3` includes the new feat commit on top of
  `f3c926e`.
- (Optional sanity) backend still compiles — every `CombinedLocationResponse`
  constructor site now passes 9 args.
