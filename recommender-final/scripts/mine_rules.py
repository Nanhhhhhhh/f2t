"""FP-Growth trên baskets category -> association rules (antecedent đơn -> consequent đơn)."""
import json
import os
import sys
import pandas as pd
from mlxtend.preprocessing import TransactionEncoder
from mlxtend.frequent_patterns import fpgrowth, association_rules

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def mine(baskets: list[list[str]], min_support: float = 0.02, min_confidence: float = 0.1):
    te = TransactionEncoder()
    arr = te.fit_transform(baskets)
    df = pd.DataFrame(arr, columns=te.columns_)

    freq = fpgrowth(df, min_support=min_support, use_colnames=True)
    rules_df = association_rules(freq, metric="lift", min_threshold=1.0)
    rules_df = rules_df[rules_df["confidence"] >= min_confidence]
    rules_df = rules_df[
        (rules_df["antecedents"].apply(len) == 1) & (rules_df["consequents"].apply(len) == 1)
    ]

    rules: dict[str, list[dict]] = {}
    for _, r in rules_df.iterrows():
        a = next(iter(r["antecedents"]))
        c = next(iter(r["consequents"]))
        rules.setdefault(a, []).append({
            "consequent": c,
            "lift": round(float(r["lift"]), 4),
            "confidence": round(float(r["confidence"]), 4),
            "support": round(float(r["support"]), 4),
        })
    for a in rules:
        rules[a].sort(key=lambda x: x["lift"], reverse=True)

    n = len(baskets)
    counts: dict[str, int] = {}
    for b in baskets:
        for c in set(b):
            counts[c] = counts.get(c, 0) + 1
    popularity = {k: round(v / n, 4) for k, v in counts.items()}
    return rules, popularity

def main(baskets_path: str, out_dir: str, min_support: float, min_confidence: float) -> None:
    df = pd.read_parquet(baskets_path)
    baskets = [s.split("|") for s in df["categories"]]
    rules, popularity = mine(baskets, min_support, min_confidence)
    os.makedirs(out_dir, exist_ok=True)
    json.dump(rules, open(os.path.join(out_dir, "category_rules.json"), "w"), indent=2)
    json.dump(popularity, open(os.path.join(out_dir, "category_popularity.json"), "w"), indent=2)
    print(f"Wrote {sum(len(v) for v in rules.values())} rules, {len(popularity)} categories")

if __name__ == "__main__":
    baskets_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "baskets_category.parquet")
    out_dir = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, "model")
    ms = float(sys.argv[3]) if len(sys.argv) > 3 else 0.02
    mc = float(sys.argv[4]) if len(sys.argv) > 4 else 0.10
    main(baskets_path, out_dir, ms, mc)
