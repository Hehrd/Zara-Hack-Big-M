# Add Census 2021 demographic datasets to the density map

## Context

The location-recommendation density map currently scores each London LSOA from
just **4 Census demographic layers** (age, population density, economic
activity, household deprivation) plus 2 Google-Maps point layers (competitors,
relevant locations). The user wants to enrich matching with a broad set of
Census 2021 datasets (ethnicity, religion, language, country of birth, health,
disability, work/industry/occupation, social grade, household & housing,
students, car availability, commuting, second address) so businesses like
halal restaurants, diaspora groceries, tutoring, pharmacies, laundrettes, etc.
can be matched to the areas whose population actually fits them.

Source: Nomis Census 2021 bulk tables — https://www.nomisweb.co.uk/sources/census_2021_bulk
(downloadable as `https://www.nomisweb.co.uk/output/census/2021/census2021-<table>.zip`,
each zip contains `census2021-<table>-lsoa.csv`).

## How the density map stays in sync (3 places, keyed by `category_id`)

A "dataset used for the density map" is one `category_id` wired into all three:

1. **Pipeline** — `pipeline/precompute_layers.py`: an `add_*` function reads a
   Nomis bulk LSOA CSV and writes a scalar into `raw_layer_values[category_id]`
   per LSOA. Output: `data/precomputed_layers.json`.
2. **Backend** — `Backend/src/main/java/com/zara/hack/location/service/SupportedCategories.java`:
   `ALL` lists each `DatasetCategory(categoryId, displayName, source, polarity)`,
   sent to the model so it only weights categories we can score.
3. **Model service** — `model-service/app.py`: `CATEGORY_GLOSS[category_id]` is a
   semantic descriptor the embedding model matches business needs against;
   `NEED_CONCEPTS` is the set of business needs it can detect.

The per-request Spark job (`pipeline/combine_job.py`) is already fully
data-driven (`raw_layer_values.get(cat, 0.0)`), so **no change is needed there**.
The frontend weight editor renders whatever `layer_weights` the API returns
(data-driven via the MSW fixture only) — **no frontend code change needed**.

## Design decisions

- **Reduction = sub-layers for key tables** (user choice). Multi-signal tables
  (ethnic group, religion, country of birth, industry, travel mode) become a
  few curated **share** sub-layers; all other tables become a single headline
  share/rate. Each layer's raw value is a 0–1 share (count / total) so layers
  are comparable; `combine_job` normalizes by per-layer max anyway.
- **Polarity = `context` for every new layer.** This gives sign +1 but lets the
  embedding gloss decide relevance and weight magnitude, rather than hardcoding
  value judgments. This directly honors the user's "use carefully to avoid
  crude targeting" note for religion/ethnicity — we never assert a group is
  "good" or "bad", we just expose the share and let business-need matching pick.
- **`needed` set stays the core 4 layers.** New layers are optional: if a table
  lacks a value for an LSOA we leave the key unset (scored as 0.0). This avoids
  dropping LSOAs when any one of ~20 tables has a gap.
- **Distance-to-work (TS058) included but caveated** in its gloss (Census 2021
  was distorted by pandemic WFH), per the user's note.

## New tables → layers (≈38 layers across 21 new tables)

| Dataset | Table | New `category_id`(s) — derivation (share of base) |
|---|---|---|
| Ethnic group | TS021 | `ethnic_asian`, `ethnic_black`, `ethnic_mixed`, `ethnic_other` (share of residents) |
| Religion | TS030 | `religion_christian`, `religion_muslim`, `religion_hindu`, `religion_jewish`, `religion_sikh`, `religion_none` |
| Country of birth | TS004 | `born_outside_uk`, `born_eu`, `born_non_eu` |
| Main language | TS024 | `english_not_main` (main language ≠ English) |
| English proficiency | TS029 | `english_limited` (cannot speak English well/at all) |
| Passports held | TS005 | `foreign_passport` (holds ≥1 non-UK passport) |
| General health | TS037 | `health_bad` (bad + very bad) |
| Disability | TS038 | `disability` (limited a lot + a little, Equality Act) |
| Hours worked | TS059 | `full_time_workers` (31+ hours) |
| Occupation | TS063 | `occupation_professional` (SOC major groups 1–3) |
| NS-SeC / social grade | TS062 | `social_grade_ab` (NS-SeC 1–2, higher/lower managerial & professional) |
| Industry | TS060 | `industry_retail`, `industry_hospitality`, `industry_professional`, `industry_health`, `industry_education` |
| Household size | TS017 | `single_person_household` (1-person households) |
| Household composition | TS003 | `households_with_children` (households w/ dependent children) |
| Accommodation type | TS044 | `flats_share` (flat/maisonette/apartment) |
| Tenure | TS054 | `private_renters` (private rented) |
| Occupancy rating (bedrooms) | TS052 | `overcrowded` (occupancy rating −1 or less) |
| Schoolchildren & students | TS068 | `students_share` (schoolchildren + full-time students, 5+) |
| Car or van availability | TS045 | `no_car_household` (households with no car/van) |
| Distance travelled to work | TS058 | `short_commute` (WFH or <10km) — pandemic caveat in gloss |
| Purpose of second address | TS055 | `student_second_address` (student-related second address) |

Already present (unchanged): `age` (TS007a), `economic_activity` (TS066),
`population_density` (TS006), `household_deprivation` (TS011).
Optional freebie (no download, from existing TS007a): `age_65_plus` for
pharmacies/health — include if desired.

> Exact column-name substrings for each `col(header, ...)` matcher will be
> finalized by inspecting each downloaded CSV header during implementation
> (the existing `col()` helper does case-insensitive substring matching).

## Implementation steps

1. **Download data** (21 new bulk zips into `data/nomis/<table>/`):
   for each table code, `curl -sLo data/nomis/<t>.zip https://www.nomisweb.co.uk/output/census/2021/census2021-<t>.zip`
   then `unzip -o` into `data/nomis/<t>/`. Verify each has `census2021-<t>-lsoa.csv`
   and print its header to fix the column matchers. (TS045/TS055/TS058 codes to
   be confirmed against the live header at download time.)
2. **`pipeline/precompute_layers.py`** — add one `add_*` function per table
   (grouped sub-layers inside the multi-signal ones), following the existing
   `add_age`/`add_deprivation` share pattern; call them all in `main()`; keep
   `needed` = the core 4. Reuse existing `read_csv`, `col`, `num` helpers.
3. **`SupportedCategories.java`** — append the ~38 new
   `DatasetCategory(categoryId, displayName, "Nomis Census 2021 bulk data", "context")`
   entries.
4. **`model-service/app.py`** — add a `CATEGORY_GLOSS` entry per new
   `category_id`, and extend `NEED_CONCEPTS` with the business needs these unlock
   (e.g. "halal and muslim community", "kosher and jewish community",
   "diaspora and migrant communities", "families with children", "students and
   schoolchildren", "low car ownership walkable neighbourhood", "affluent
   high social grade customers", "people with health or disability needs",
   "non-english speakers needing language services").
5. **Regenerate**: `.venv/bin/python pipeline/precompute_layers.py` → rewrites
   `data/precomputed_layers.json`.
6. **Restart services**: restart model-service (uvicorn) and rebuild/restart the
   backend (Spring Boot) so the new `SupportedCategories.ALL` is live. Frontend
   needs no change.

## Files to modify

- `pipeline/precompute_layers.py` (new `add_*` functions + `main()` wiring)
- `Backend/src/main/java/com/zara/hack/location/service/SupportedCategories.java`
- `model-service/app.py` (`CATEGORY_GLOSS` + `NEED_CONCEPTS`)
- `data/nomis/<table>/…` (21 new downloaded CSV sets — data, not code)
- Regenerated: `data/precomputed_layers.json`

## Verification

1. **Pipeline**: run precompute; confirm it loads geometry, reports per-layer
   coverage, and writes `data/precomputed_layers.json`. Spot-check a known LSOA
   record contains the new keys with plausible 0–1 shares (e.g. a Tower Hamlets
   LSOA shows a high `religion_muslim`).
2. **Model service** (port 8000): `POST /model/business-analysis` with a
   `business_description` like *"halal restaurant for the local muslim
   community"* and the full `supported_dataset_categories` → expect
   `religion_muslim` (and `ethnic_asian`) in `selected_categories` with positive
   `layer_weights`. Try *"after-school tutoring centre"* → expect
   `students_share` / `households_with_children`.
3. **End-to-end** (backend 6969 → spark → response): run a location
   recommendation for one of those businesses; confirm `lsoa_scores` come back
   and the new categories appear in `weighted_layer_values`, and that the
   frontend weight editor lists the new layers (data-driven, no code change).
4. Confirm LSOA count in `precomputed_layers.json` is unchanged (new layers are
   optional, so no LSOAs are dropped).
