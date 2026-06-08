# F2T Cross-sell Recommender — Phase 1 Pipeline

## Purpose

This pipeline **warm-starts** the F2T category-level cross-sell recommender using the public Instacart 2017 grocery dataset. It mines association rules between the 10 F2T product categories (leafy, root, fruit, herbs, mushrooms, grains, dairy, eggs, honey, other) and produces two artifacts consumed by the Phase 2 sidecar:

- `model/category_rules.json` — association rules sorted by lift per antecedent category
- `model/category_popularity.json` — relative purchase frequency per category (0–1)

Neither artifact is committed to the repository; both are reproducible by running this pipeline.

---

## Data: Instacart Online Grocery Shopping Dataset 2017

Download from Kaggle: <https://www.kaggle.com/datasets/psparks/instacart-market-basket-analysis>

Place the extracted CSV files in `data/` so the directory looks like:

```
data/
  aisles.csv
  products.csv
  order_products__prior.csv
  order_products__train.csv
```

The pipeline reads both `order_products__prior.csv` and `order_products__train.csv`; it tolerates either being missing.

---

## Run the real pipeline

```bash
# 1. Map Instacart products -> F2T categories, output baskets parquet
./venv/bin/python scripts/prepare_instacart.py data/ baskets_category.parquet

# 2. Mine FP-Growth association rules -> model/*.json
./venv/bin/python scripts/mine_rules.py baskets_category.parquet model 0.02 0.10
```

Defaults for min_support=0.02 and min_confidence=0.10 work well on the full Instacart dataset (~3.4 M orders). Increase thresholds for faster iteration.

---

## Test the pipeline without Instacart data

`generate_synthetic.py` creates 5 000 fabricated baskets whose affinity signals are hand-coded to exercise the pipeline end-to-end:

```bash
./venv/bin/python scripts/generate_synthetic.py 5000
./venv/bin/python scripts/mine_rules.py baskets_category.parquet model 0.05 0.20
```

**IMPORTANT — do NOT use synthetic output in the thesis.** The affinity pairs are invented; the resulting rules carry no statistical validity. This script exists solely for CI / developer smoke-testing.

---

## Run tests

```bash
./venv/bin/pytest tests/ -v
```

---

## Artifact reproducibility

`model/category_rules.json` and `model/category_popularity.json` are gitignored. Re-run the pipeline on the same input CSV files to regenerate identical artifacts (the algorithm is deterministic for a fixed dataset and thresholds).

---

## Limitations

1. **Category-level granularity only.** Rules are computed between the 10 F2T categories, not individual products. Cross-sell suggestions show category-level prompts ("People who bought leafy greens also buy herbs"). Product-level precision requires Phase 2 retraining on real F2T order history.

2. **Instacart != F2T order distribution.** Instacart covers a US supermarket basket; Vietnamese farm-fresh purchasing patterns differ (e.g., mushroom/herb pairing is stronger in VN cuisine). The warm-start rules degrade gracefully as F2T accumulates real orders.

3. **Retrain on real orders matters.** Once F2T has enough real order volume, re-run `scripts/mine_rules.py` on exported real-order baskets to replace the Instacart warm-start with product-level rules. (The sidecar itself only serves `/recommend` and `/health`; retraining is an offline step.)

4. **No personalisation.** Rules are global (population-level). User-level collaborative filtering is out of scope for Phase 1.
