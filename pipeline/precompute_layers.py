"""Precompute static London LSOA demographic layers.

Reads the Nomis Census 2021 bulk LSOA CSVs and the ONS LSOA 2021 boundary
GeoJSON, joins them, and emits one record per London LSOA with geometry,
centroid and the raw value of each demographic layer. Normalization and
weighting happen later in the per-request Spark combine job (combine_job.py),
matching the spec's "each layer is normalized independently before weighting".

Run once:  .venv/bin/python pipeline/precompute_layers.py
Output:    data/precomputed_layers.json
"""

import csv
import glob
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
NOMIS = os.path.join(DATA, "nomis")
BOUNDARIES = os.path.join(DATA, "boundaries")
OUT = os.path.join(DATA, "precomputed_layers.json")


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def load_geometry():
    """Merge the paged London LSOA GeoJSON files into {code: feature-info}."""
    lsoas = {}
    for path in sorted(glob.glob(os.path.join(BOUNDARIES, "london_lsoa_*.geojson"))):
        with open(path) as f:
            fc = json.load(f)
        for feat in fc.get("features", []):
            props = feat.get("properties", {})
            code = props.get("LSOA21CD")
            if not code:
                continue
            lsoas[code] = {
                "lsoa_code": code,
                "lsoa_name": props.get("LSOA21NM"),
                "geometry": feat.get("geometry"),
                "centroid": {
                    "latitude": num(props.get("LAT")),
                    "longitude": num(props.get("LONG")),
                },
                "raw_layer_values": {},
            }
    return lsoas


def read_csv(table):
    """Yield (code, header, row) for a Nomis bulk LSOA CSV."""
    path = os.path.join(NOMIS, table, f"census2021-{table}-lsoa.csv")
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        header = next(reader)
        code_idx = header.index("geography code")
        for row in reader:
            if len(row) <= code_idx:
                continue
            yield row[code_idx], header, row


def col(header, needle):
    """Index of the first column whose name contains all needle substrings."""
    parts = needle if isinstance(needle, (list, tuple)) else [needle]
    for i, name in enumerate(header):
        if all(p.lower() in name.lower() for p in parts):
            return i
    raise KeyError(f"column matching {needle} not found in {header}")


def add_population_density(lsoas):
    for code, header, row in read_csv("ts006"):
        if code in lsoas:
            idx = col(header, "Population Density")
            lsoas[code]["raw_layer_values"]["population_density"] = num(row[idx])


def add_age(lsoas):
    # Young-adult share (20-34): proxy for student / young-professional demand.
    for code, header, row in read_csv("ts007a"):
        if code not in lsoas:
            continue
        total = num(row[col(header, "Age: Total")])
        young = sum(
            num(row[col(header, ["Aged", band])])
            for band in ("20 to 24", "25 to 29", "30 to 34")
        )
        lsoas[code]["raw_layer_values"]["age"] = (young / total) if total else 0.0


def add_economic_activity(lsoas):
    # Economic activity rate = (total - economically inactive) / total aged 16+.
    for code, header, row in read_csv("ts066"):
        if code not in lsoas:
            continue
        total = num(row[col(header, ["Economic activity status: Total"])])
        inactive = num(row[col(header, ["Economically inactive"])])  # first matching col
        rate = ((total - inactive) / total) if total else 0.0
        lsoas[code]["raw_layer_values"]["economic_activity"] = rate


def add_deprivation(lsoas):
    # Share of households deprived in at least one dimension.
    for code, header, row in read_csv("ts011"):
        if code not in lsoas:
            continue
        total = num(row[col(header, ["Household deprivation: Total"])])
        not_dep = num(row[col(header, ["not deprived in any dimension"])])
        share = ((total - not_dep) / total) if total else 0.0
        lsoas[code]["raw_layer_values"]["household_deprivation"] = share


# --- Census 2021 sub-group / headline share layers -------------------------
# Each layer's raw value is a 0-1 share so layers are comparable; the per-request
# Spark job normalizes again by per-layer max. All shares are count / table base.

def _v(header, row, needle):
    """Value of the first column matching `needle` (substring, case-insensitive)."""
    return num(row[col(header, needle)])


def _sum(header, row, needles):
    """Sum the first column matching each needle in `needles`."""
    return sum(num(row[col(header, n)]) for n in needles)


def add_ethnic_group(lsoas):
    # Shares of all usual residents by high-level ethnic group (TS021).
    for code, header, row in read_csv("ts021"):
        if code not in lsoas:
            continue
        total = _v(header, row, "Ethnic group: Total")
        if not total:
            continue
        rv = lsoas[code]["raw_layer_values"]
        rv["ethnic_asian"] = _v(header, row, "Ethnic group: Asian") / total
        rv["ethnic_black"] = _v(header, row, "Ethnic group: Black") / total
        rv["ethnic_mixed"] = _v(header, row, "Ethnic group: Mixed") / total
        rv["ethnic_other"] = _v(header, row, "Ethnic group: Other ethnic group") / total


def add_religion(lsoas):
    # Shares of all usual residents by religion (TS030).
    for code, header, row in read_csv("ts030"):
        if code not in lsoas:
            continue
        total = _v(header, row, "Religion: Total")
        if not total:
            continue
        rv = lsoas[code]["raw_layer_values"]
        rv["religion_christian"] = _v(header, row, "Religion: Christian") / total
        rv["religion_muslim"] = _v(header, row, "Religion: Muslim") / total
        rv["religion_hindu"] = _v(header, row, "Religion: Hindu") / total
        rv["religion_jewish"] = _v(header, row, "Religion: Jewish") / total
        rv["religion_sikh"] = _v(header, row, "Religion: Sikh") / total
        rv["religion_none"] = _v(header, row, "Religion: No religion") / total


def add_country_of_birth(lsoas):
    # Foreign-born shares, split EU vs non-EU (TS004).
    for code, header, row in read_csv("ts004"):
        if code not in lsoas:
            continue
        total = _v(header, row, "Country of birth: Total")
        if not total:
            continue
        uk = _v(header, row, "Europe: United Kingdom")
        eu = _v(header, row, "Europe: EU countries")
        outside = max(total - uk, 0.0)
        non_eu = max(outside - eu, 0.0)
        rv = lsoas[code]["raw_layer_values"]
        rv["born_outside_uk"] = outside / total
        rv["born_eu"] = eu / total
        rv["born_non_eu"] = non_eu / total


def add_passports(lsoas):
    # Share holding a non-UK passport (excludes UK-passport and no-passport) (TS005).
    for code, header, row in read_csv("ts005"):
        if code not in lsoas:
            continue
        total = _v(header, row, "Passports held: Total")
        if not total:
            continue
        uk = _v(header, row, "Passports held: Europe: United Kingdom")
        none = _v(header, row, "No passport held")
        rv = lsoas[code]["raw_layer_values"]
        rv["foreign_passport"] = max(total - uk - none, 0.0) / total


def add_english_proficiency(lsoas):
    # Main-language-not-English and limited-English shares (TS029).
    for code, header, row in read_csv("ts029"):
        if code not in lsoas:
            continue
        total = _v(header, row, "Proficiency in English language: Total")
        if not total:
            continue
        not_main = _v(header, row, "Main language is not English")  # section total
        limited = 0.0
        for i, name in enumerate(header):
            nl = name.strip().lower()
            if nl.endswith("cannot speak english well") or nl.endswith("cannot speak english"):
                limited += num(row[i])
        rv = lsoas[code]["raw_layer_values"]
        rv["english_not_main"] = not_main / total
        rv["english_limited"] = limited / total


def add_health(lsoas):
    # Share in bad or very bad general health (TS037).
    for code, header, row in read_csv("ts037"):
        if code not in lsoas:
            continue
        total = _v(header, row, "General health: Total")
        if not total:
            continue
        bad = _v(header, row, "General health: Bad health") + _v(header, row, "General health: Very bad health")
        lsoas[code]["raw_layer_values"]["health_bad"] = bad / total


def add_disability(lsoas):
    # Share disabled under the Equality Act (TS038).
    for code, header, row in read_csv("ts038"):
        if code not in lsoas:
            continue
        total = _v(header, row, "Disability: Total")
        if not total:
            continue
        dis = _v(header, row, "Disability: Disabled under the Equality Act")
        lsoas[code]["raw_layer_values"]["disability"] = dis / total


def add_hours_worked(lsoas):
    # Share of workers in full-time employment (TS059).
    for code, header, row in read_csv("ts059"):
        if code not in lsoas:
            continue
        total = _v(header, row, "Hours worked: Total")
        if not total:
            continue
        ft = _v(header, row, "Hours worked: Full-time")
        lsoas[code]["raw_layer_values"]["full_time_workers"] = ft / total


def add_occupation(lsoas):
    # Share of workers in managerial/professional/associate-professional roles (TS063).
    for code, header, row in read_csv("ts063"):
        if code not in lsoas:
            continue
        total = _v(header, row, "Occupation (current): Total")
        if not total:
            continue
        prof = _sum(header, row, ["1. Managers", "2. Professional occupations", "3. Associate professional"])
        lsoas[code]["raw_layer_values"]["occupation_professional"] = prof / total


def add_social_grade(lsoas):
    # Higher + lower managerial/professional NS-SeC share (purchasing-power proxy) (TS062).
    for code, header, row in read_csv("ts062"):
        if code not in lsoas:
            continue
        total = _v(header, row, "NS-SEC): Total")
        if not total:
            continue
        ab = _sum(header, row, ["Higher managerial", "Lower managerial"])
        lsoas[code]["raw_layer_values"]["social_grade_ab"] = ab / total


def add_industry(lsoas):
    # Industry (TS060) is published at MSOA, not LSOA. Map each LSOA to its parent
    # MSOA's shares via the systematic ONS naming ("<area> NNNX" -> "<area> NNN").
    path = os.path.join(NOMIS, "ts060", "census2021-ts060-msoa.csv")
    sections = {
        "industry_retail": "G: Wholesale and retail",
        "industry_hospitality": "I: Accommodation and food service",
        "industry_professional": "M: Professional",
        "industry_education": "P: Education",
        "industry_health": "Q: Human health and social work",
    }
    by_msoa = {}
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        header = next(reader)
        name_idx = header.index("geography")
        for row in reader:
            total = _v(header, row, "Industry (current): Total")
            if not total:
                continue
            by_msoa[row[name_idx]] = {
                cat: _v(header, row, needle) / total for cat, needle in sections.items()
            }
    matched = 0
    for rec in lsoas.values():
        msoa = re.sub(r"[A-Z]$", "", rec.get("lsoa_name") or "").strip()
        shares = by_msoa.get(msoa)
        if shares:
            rec["raw_layer_values"].update(shares)
            matched += 1
    print(f"industry: matched {matched}/{len(lsoas)} LSOAs to an MSOA")


def add_household_size(lsoas):
    # Share of occupied households that are one-person (TS017).
    for code, header, row in read_csv("ts017"):
        if code not in lsoas:
            continue
        total = _v(header, row, "Household size: Total")
        zero = _v(header, row, "0 people in household")
        occupied = max(total - zero, 0.0)
        if not occupied:
            continue
        one = _v(header, row, "1 person in household")
        lsoas[code]["raw_layer_values"]["single_person_household"] = one / occupied


def add_household_composition(lsoas):
    # Share of households containing dependent children (TS003).
    for code, header, row in read_csv("ts003"):
        if code not in lsoas:
            continue
        total = _v(header, row, "Household composition: Total")
        if not total:
            continue
        kids = sum(num(row[i]) for i, name in enumerate(header) if "dependent children" in name.lower())
        lsoas[code]["raw_layer_values"]["households_with_children"] = kids / total


def add_accommodation(lsoas):
    # Share of households living in flats / non-whole-house dwellings (TS044).
    for code, header, row in read_csv("ts044"):
        if code not in lsoas:
            continue
        total = _v(header, row, "Accommodation type: Total")
        if not total:
            continue
        flats = _sum(header, row, [
            "block of flats",
            "converted or shared house",
            "another converted building",
            "a commercial building",
        ])
        lsoas[code]["raw_layer_values"]["flats_share"] = flats / total


def add_tenure(lsoas):
    # Share of households in the private rented sector (TS054).
    for code, header, row in read_csv("ts054"):
        if code not in lsoas:
            continue
        total = _v(header, row, "Tenure of household: Total")
        if not total:
            continue
        pr = _v(header, row, "Tenure of household: Private rented")
        lsoas[code]["raw_layer_values"]["private_renters"] = pr / total


def add_occupancy(lsoas):
    # Share of overcrowded households (bedroom occupancy rating -1 or less) (TS052).
    for code, header, row in read_csv("ts052"):
        if code not in lsoas:
            continue
        total = _v(header, row, "Occupancy rating for bedrooms: Total")
        if not total:
            continue
        over = _sum(header, row, ["bedrooms: -1", "-2 or less"])
        lsoas[code]["raw_layer_values"]["overcrowded"] = over / total


def add_students(lsoas):
    # Share of residents aged 5+ who are schoolchildren or full-time students (TS068).
    for code, header, row in read_csv("ts068"):
        if code not in lsoas:
            continue
        total = _v(header, row, "student indicator: Total")
        if not total:
            continue
        st = _v(header, row, "indicator: Student")
        lsoas[code]["raw_layer_values"]["students_share"] = st / total


def add_car_availability(lsoas):
    # Share of households with no car or van (TS045).
    for code, header, row in read_csv("ts045"):
        if code not in lsoas:
            continue
        total = _v(header, row, "Number of cars or vans: Total")
        if not total:
            continue
        noc = _v(header, row, "No cars or vans")
        lsoas[code]["raw_layer_values"]["no_car_household"] = noc / total


def add_distance_to_work(lsoas):
    # Share of workers commuting <10km or working mainly from home (TS058).
    for code, header, row in read_csv("ts058"):
        if code not in lsoas:
            continue
        total = _v(header, row, "Distance travelled to work: Total")
        if not total:
            continue
        short = _sum(header, row, [
            "Less than 2km",
            "2km to less than 5km",
            "5km to less than 10km",
            "Works mainly from home",
        ])
        lsoas[code]["raw_layer_values"]["short_commute"] = short / total


def add_second_address(lsoas):
    # Share of residents with a student-related second address (TS055).
    for code, header, row in read_csv("ts055"):
        if code not in lsoas:
            continue
        total = _v(header, row, "Second address type: Total")
        if not total:
            continue
        stu = _sum(header, row, ["Student's term-time address", "Student's home address"])
        lsoas[code]["raw_layer_values"]["student_second_address"] = stu / total


def main():
    lsoas = load_geometry()
    print(f"loaded geometry for {len(lsoas)} London LSOAs")
    # Core layers (required: an LSOA missing any of these is dropped).
    add_population_density(lsoas)
    add_age(lsoas)
    add_economic_activity(lsoas)
    add_deprivation(lsoas)

    # Extended Census 2021 layers (optional: missing values are scored as 0).
    add_ethnic_group(lsoas)
    add_religion(lsoas)
    add_country_of_birth(lsoas)
    add_passports(lsoas)
    add_english_proficiency(lsoas)
    add_health(lsoas)
    add_disability(lsoas)
    add_hours_worked(lsoas)
    add_occupation(lsoas)
    add_social_grade(lsoas)
    add_industry(lsoas)
    add_household_size(lsoas)
    add_household_composition(lsoas)
    add_accommodation(lsoas)
    add_tenure(lsoas)
    add_occupancy(lsoas)
    add_students(lsoas)
    add_car_availability(lsoas)
    add_distance_to_work(lsoas)
    add_second_address(lsoas)

    records = [r for r in lsoas.values() if r["geometry"]]
    # Drop LSOAs missing any CORE layer to keep the heatmap consistent. Extended
    # layers are optional and default to 0.0 in the scoring job when absent.
    needed = {"population_density", "age", "economic_activity", "household_deprivation"}
    complete = [r for r in records if needed.issubset(r["raw_layer_values"])]
    print(f"{len(complete)}/{len(records)} LSOAs have all core demographic layers")
    if complete:
        layer_count = len(complete[0]["raw_layer_values"])
        print(f"first complete LSOA has {layer_count} layers")

    with open(OUT, "w") as f:
        json.dump({"city": "London", "lsoas": complete}, f)
    size_mb = os.path.getsize(OUT) / 1e6
    print(f"wrote {OUT} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
