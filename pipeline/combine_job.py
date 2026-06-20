"""Per-request Spark scoring job: normalize + weight + combine LSOA layers.

Invoked by the Spring Boot backend via spark-submit:

    spark-submit combine_job.py <input_json> <output_json> [precomputed_layers_json]

Reads the precomputed static demographic layers plus the request's scoring
input (selected categories, layer weights, Google Maps points). Aggregates the
point layers (competitors / relevant_locations) onto LSOA polygons, normalizes
each selected layer independently (value / layer max), multiplies by its weight,
and sums to a final_score per LSOA. Writes scored LSOA records sorted by
final_score descending.
"""

import json
import sys

from pyspark.sql import SparkSession
from shapely.geometry import shape, Point
from shapely.strtree import STRtree

POINT_CATEGORIES = {"competitors", "relevant_locations"}


def aggregate_points_to_lsoas(lsoas, points):
    """Count points per LSOA polygon, per category, via an STR spatial index."""
    geoms = [shape(r["geometry"]) for r in lsoas]
    tree = STRtree(geoms)
    counts = [{} for _ in lsoas]  # parallel to lsoas
    for p in points:
        cat = p.get("category_id")
        if cat not in POINT_CATEGORIES:
            continue
        pt = Point(float(p["longitude"]), float(p["latitude"]))
        for idx in tree.query(pt):
            if geoms[idx].contains(pt):
                counts[idx][cat] = counts[idx].get(cat, 0) + 1
                break
    return counts


def main():
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    layers_path = sys.argv[3] if len(sys.argv) > 3 else "data/precomputed_layers.json"

    with open(layers_path) as f:
        precomputed = json.load(f)
    with open(input_path) as f:
        req = json.load(f)

    # City-agnostic by design: only score when the requested city matches the
    # loaded precomputed layers. The POC ships London data only, so other cities
    # produce no scored areas (the backend then returns a friendly message).
    req_city = (req.get("city") or "").strip().lower()
    data_city = (precomputed.get("city") or "").strip().lower()
    if req_city and data_city and req_city != data_city:
        with open(output_path, "w") as f:
            json.dump({"city": req.get("city"), "run_id": req.get("run_id"), "lsoa_scores": []}, f)
        return

    layers = precomputed["lsoas"]
    selected = list(req.get("selected_categories", []))
    weights = {w["category_id"]: float(w.get("weight", 0.0)) for w in req.get("layer_weights", [])}
    points = req.get("google_maps_points", [])

    # Fold Google Maps point layers into each LSOA's raw values (driver side).
    point_counts = aggregate_points_to_lsoas(layers, points)
    for rec, counts in zip(layers, point_counts):
        for cat in POINT_CATEGORIES:
            if cat in selected:
                rec["raw_layer_values"][cat] = float(counts.get(cat, 0))

    # Per-layer max across all London LSOAs (independent normalization).
    maxes = {}
    for cat in selected:
        vals = [r["raw_layer_values"].get(cat, 0.0) for r in layers]
        maxes[cat] = max(vals) if vals else 0.0

    spark = SparkSession.builder.appName("lsoa-combine-scoring").getOrCreate()
    sc = spark.sparkContext
    b_selected = sc.broadcast(selected)
    b_weights = sc.broadcast(weights)
    b_maxes = sc.broadcast(maxes)

    def score(rec):
        sel = b_selected.value
        wts = b_weights.value
        mx = b_maxes.value
        normalized = {}
        weighted = {}
        final = 0.0
        for cat in sel:
            raw = rec["raw_layer_values"].get(cat, 0.0)
            m = mx.get(cat, 0.0)
            n = (raw / m) if m else 0.0
            w = wts.get(cat, 0.0)
            normalized[cat] = n
            weighted[cat] = n * w
            final += n * w
        return {
            "lsoa_code": rec["lsoa_code"],
            "lsoa_name": rec["lsoa_name"],
            "geometry": rec["geometry"],
            "centroid": rec["centroid"],
            "normalized_layer_values": normalized,
            "weighted_layer_values": weighted,
            "final_score": final,
        }

    scored = sc.parallelize(layers, 8).map(score).collect()
    spark.stop()

    scored.sort(key=lambda r: r["final_score"], reverse=True)
    with open(output_path, "w") as f:
        json.dump({"city": req.get("city", "London"),
                   "run_id": req.get("run_id"),
                   "lsoa_scores": scored}, f)


if __name__ == "__main__":
    main()
