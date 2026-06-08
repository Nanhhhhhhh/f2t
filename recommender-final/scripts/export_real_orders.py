"""GĐ2: export orders thật từ Mongo -> baskets mức product để retrain product-level.
Chạy thủ công khi đã tích luỹ đủ đơn thật. Cần MONGODB_URI và pymongo."""
import os, sys, json
from collections import defaultdict

def export(mongo_uri: str, out_path: str, min_baskets: int = 200) -> None:
    from pymongo import MongoClient  # pip install pymongo khi dùng
    db = MongoClient(mongo_uri).get_default_database()
    baskets = defaultdict(set)
    for o in db.orders.find({}, {"_id": 1, "items.productId": 1}):
        for it in o.get("items", []):
            baskets[str(o["_id"])].add(str(it["productId"]))
    rows = [{"order_id": k, "products": "|".join(sorted(v))} for k, v in baskets.items() if len(v) > 1]
    if len(rows) < min_baskets:
        print(f"WARN: chỉ {len(rows)} giỏ >1 item (<{min_baskets}); chưa đủ retrain product-level.")
    with open(out_path, "w") as f:
        json.dump(rows, f)
    print(f"Wrote {len(rows)} baskets -> {out_path}")

if __name__ == "__main__":
    uri = os.environ.get("MONGODB_URI") or (sys.argv[1] if len(sys.argv) > 1 else None)
    if not uri:
        sys.exit("Usage: MONGODB_URI=... python scripts/export_real_orders.py [out.json]")
    out = sys.argv[2] if len(sys.argv) > 2 else "baskets_product.json"
    export(uri, out)
