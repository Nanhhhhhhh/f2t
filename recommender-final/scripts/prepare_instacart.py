"""Đọc CSV Instacart, map aisle->F2T category (bỏ phần không map), gom baskets mức category."""
import json
import os
import sys
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

_ROOT_KEYWORDS = ("carrot", "potato", "onion", "radish", "beet", "ginger", "garlic", "turnip")

def map_aisle(aisle: str, product_name: str, cmap: dict) -> str | None:
    """Trả category F2T hoặc None nếu phải bỏ."""
    name = (product_name or "").lower()
    if "mushroom" in name:
        return "mushrooms"
    base = cmap.get((aisle or "").lower())
    if base == "leafy" and any(k in name for k in _ROOT_KEYWORDS):
        return "root"
    return base

def build_baskets(df: pd.DataFrame) -> dict[int, list[str]]:
    """df: cột order_id, category. Trả {order_id: [category distinct]}."""
    out: dict[int, set] = {}
    for oid, cat in zip(df["order_id"], df["category"]):
        out.setdefault(oid, set()).add(cat)
    return {k: sorted(v) for k, v in out.items()}

def main(data_dir: str, out_path: str) -> None:
    cmap = json.load(open(os.path.join(ROOT, "category_map.json")))
    products = pd.read_csv(os.path.join(data_dir, "products.csv"))
    aisles = pd.read_csv(os.path.join(data_dir, "aisles.csv"))
    products = products.merge(aisles, on="aisle_id", how="left")

    frames = []
    for fn in ("order_products__prior.csv", "order_products__train.csv"):
        fp = os.path.join(data_dir, fn)
        if os.path.exists(fp):
            frames.append(pd.read_csv(fp, usecols=["order_id", "product_id"]))
    order_products = pd.concat(frames, ignore_index=True)

    merged = order_products.merge(
        products[["product_id", "aisle", "product_name"]], on="product_id", how="left"
    )
    merged["category"] = [
        map_aisle(a, n, cmap) for a, n in zip(merged["aisle"], merged["product_name"])
    ]
    merged = merged.dropna(subset=["category"])

    baskets = build_baskets(merged[["order_id", "category"]])
    rows = [{"order_id": k, "categories": "|".join(v)} for k, v in baskets.items()]
    pd.DataFrame(rows).to_parquet(out_path, index=False)
    print(f"Wrote {len(rows)} baskets -> {out_path}")

if __name__ == "__main__":
    data_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "data")
    out_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, "baskets_category.parquet")
    main(data_dir, out_path)
