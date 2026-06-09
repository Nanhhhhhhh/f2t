"""Sinh baskets tổng hợp (khi chưa tải Instacart) để chạy mine_rules end-to-end."""
import os, sys, random
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATS = ["leafy", "root", "fruit", "herbs", "mushrooms", "grains", "dairy", "eggs", "honey", "other"]
# cặp hay đi cùng (mô phỏng tín hiệu) — chỉ để test pipeline, KHÔNG dùng cho thesis
AFFINITY = [("leafy", "herbs"), ("leafy", "root"), ("fruit", "honey"), ("dairy", "eggs"), ("grains", "eggs")]

def gen(n: int, seed: int = 42) -> list[list[str]]:
    random.seed(seed)
    out = []
    for _ in range(n):
        basket = set(random.sample(CATS, k=random.randint(1, 3)))
        for a, b in AFFINITY:
            if a in basket and random.random() < 0.6:
                basket.add(b)
        out.append(sorted(basket))
    return out

if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 5000
    out_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, "baskets_category.parquet")
    rows = [{"order_id": i, "categories": "|".join(b)} for i, b in enumerate(gen(n))]
    pd.DataFrame(rows).to_parquet(out_path, index=False)
    print(f"Wrote {n} synthetic baskets -> {out_path}")
