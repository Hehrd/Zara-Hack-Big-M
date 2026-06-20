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


def main():
    lsoas = load_geometry()
    print(f"loaded geometry for {len(lsoas)} London LSOAs")
    add_population_density(lsoas)
    add_age(lsoas)
    add_economic_activity(lsoas)
    add_deprivation(lsoas)

    records = [r for r in lsoas.values() if r["geometry"]]
    # Drop LSOAs missing any demographic layer to keep the heatmap consistent.
    needed = {"population_density", "age", "economic_activity", "household_deprivation"}
    complete = [r for r in records if needed.issubset(r["raw_layer_values"])]
    print(f"{len(complete)}/{len(records)} LSOAs have all demographic layers")

    with open(OUT, "w") as f:
        json.dump({"city": "London", "lsoas": complete}, f)
    size_mb = os.path.getsize(OUT) / 1e6
    print(f"wrote {OUT} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
