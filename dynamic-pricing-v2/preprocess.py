#!/usr/bin/env python3
"""
preprocess.py — Dunnhumby Complete Journey → demand model parameters.

Faithful port of the original preprocessing.ipynb (16 steps), as a single
runnable script. Reads the three raw Dunnhumby CSVs and produces:

    data/demand_params.json              ← 4-category demand params (primary)
    data/cross_elasticity_matrix.npy     ← 4×4 cross-price elasticity matrix
    data/demand_params_subcategory.json  ← sub-category detail (reference)

Pipeline:
  1. Load CSVs
  2. Filter PRODUCE dept, exclude non-fresh, map → {leafy, root, fruit, herbs}
  3. Parse + normalize product size to lb-equivalents
  4. Join transactions ↔ produce products
  5. Reconstruct shelf price (add discounts back), IQR outlier filter
  6. Promotion flags from causal_data
  7. Time features (hour, day-of-week, hour-of-week)
  8. Aggregate to hourly demand (for Fourier seasonality)
  9. Category-level OLS elasticity (quantity-normalized — avoids the circular
     SALES_VALUE/baskets +1 bias). Literature fallback for thin/flat data.
 10. Fourier seasonality per sub-category (own-price effect removed first)
 11. Cross-price elasticity matrix
 12. Consolidate sub-categories → 4-category FINAL_PARAMS, apply VN priors
 13. Save outputs
 14. Validation suite (4 gates — all must pass)

Run:
    python preprocess.py --raw-dir /Users/macos/dynamic_pricing_1 --out-dir data
"""
import argparse
import json
import os
import re
import warnings

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression

warnings.filterwarnings("ignore")

AGENTS = ["leafy", "root", "fruit", "herbs"]

# Andreyeva et al. 2010 / USDA ERS — fallback when OLS is unreliable
LITERATURE_BETAS = {"leafy": -1.76, "root": -0.69, "fruit": -1.32, "herbs": -0.49}

# Vietnamese market priors (VN buyers more price-sensitive; ~2× herb consumption).
# Set APPLY_VN_PRIORS=False to get raw US-calibrated params.
APPLY_VN_PRIORS = True
VN_BETA_SCALE   = {"leafy": 1.25, "root": 1.20, "fruit": 1.30, "herbs": 1.10}
VN_DEMAND_SCALE = {"leafy": 1.40, "root": 0.95, "fruit": 0.85, "herbs": 2.10}

EXCLUDE_COMMODITIES = {
    "POPCORN", "NUTS", "DRIED FRUIT", "PROCESSED", "SEASONAL",
    "PROD SUPPLIES", "SALAD BAR", "MISCELLANEOUS(CORP USE ONLY)",
}

COMMODITY_MAP = {
    "SALAD MIX": "leafy", "VEGETABLES - ALL OTHERS": "leafy",
    "VALUE ADDED VEGETABLES": "leafy", "VEGETABLES SALAD": "leafy",
    "BROCCOLI/CAULIFLOWER": "leafy", "PEPPERS-ALL": "leafy",
    "CORN": "leafy", "MUSHROOMS": "leafy",
    "POTATOES": "root", "ONIONS": "root", "CARROTS": "root", "SQUASH": "root",
    "APPLES": "fruit", "CITRUS": "fruit", "BERRIES": "fruit",
    "TOMATOES": "fruit", "TROPICAL FRUIT": "fruit", "VALUE ADDED FRUIT": "fruit",
    "STONE FRUIT": "fruit", "GRAPES": "fruit", "MELONS": "fruit", "PEARS": "fruit",
    "HERBS": "herbs",
}


def map_organics(sub_commodity: str) -> str:
    s = str(sub_commodity).upper()
    if any(x in s for x in ["APPLE", "BERRY", "BERRIES", "GRAPE", "CITRUS",
                            "FRUIT", "MANGO", "MELON", "PEACH", "CHERRY",
                            "STRAWBERR", "BLUEBERR", "RASPBERR", "TOMATO"]):
        return "fruit"
    if any(x in s for x in ["HERB", "BASIL", "CILANT", "PARSLEY", "DILL"]):
        return "herbs"
    if any(x in s for x in ["CARROT", "POTATO", "ONION", "MUSHROOM", "SQUASH", "BEET"]):
        return "root"
    return "leafy"


def parse_product_size(size_str):
    if pd.isna(size_str) or str(size_str).strip() == "":
        return 1.0, "UNKNOWN"
    s = str(size_str).upper().strip()
    m = re.search(r"([0-9\.]+)\s*([A-Z]+)", s)
    if m:
        try:
            return float(m.group(1)), m.group(2)
        except ValueError:
            return 1.0, "UNKNOWN"
    return 1.0, "EACH"


def normalize_to_lbs(row):
    if row["size_unit"] in ("OZ", "OUNCE"):
        return row["size_value"] / 16.0, "LB"
    if row["size_unit"] in ("LBS", "LB"):
        return row["size_value"], "LB"
    return row["size_value"], row["size_unit"]


def clean_final_units(u):
    u = str(u).upper()
    if u in ("CT", "EACH", "PK", "PACK", "CTN", "BU", "BUNCHES", "ML"):
        return "UNIT"
    if u in ("PT", "PTS"):
        return "PINT"
    if u == "UNKNOWN":
        return "BULK_OR_UNKNOWN"
    if u == "OUNCE":
        return "LB"
    return u


# ── CrossDemandModel (for validation in this script) ─────────────────────────
class CrossDemandModel:
    AGENTS = AGENTS

    def __init__(self, params: dict, E_matrix: np.ndarray):
        self.params = params
        self.E = E_matrix

    def sample(self, current_prices, current_freshness, t, cat, promoted=False) -> int:
        p = self.params[cat]
        i = self.AGENTS.index(cat)
        log_p = np.log(current_prices[cat] / p["ref_price"] + 1e-9)
        own_effect = np.exp(p["beta"] * log_p)
        promo_mult = np.exp(p["promo_eff"]) if promoted else 1.0
        season = 1.0 + (
            p["sin_daily"]  * np.sin(2 * np.pi * t / 24) +
            p["cos_daily"]  * np.cos(2 * np.pi * t / 24) +
            p["sin_weekly"] * np.sin(2 * np.pi * t / 168) +
            p["cos_weekly"] * np.cos(2 * np.pi * t / 168)
        )
        fresh_mult = 0.4 + 0.6 * float(current_freshness[cat])
        lam = p["base_demand"] * own_effect * promo_mult * season * fresh_mult
        for j, other in enumerate(self.AGENTS):
            if j != i and other in self.params:
                log_other = np.log(
                    current_prices.get(other, self.params[other]["ref_price"])
                    / self.params[other]["ref_price"] + 1e-9
                )
                lam *= np.exp(self.E[i, j] * log_other)
        return int(np.random.poisson(max(lam, 0.0)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw-dir", default="/Users/macos/dynamic_pricing_1",
                    help="Directory holding transaction_data.csv, product.csv, causal_data.csv")
    ap.add_argument("--out-dir", default="data")
    args = ap.parse_args()

    os.makedirs(args.out_dir, exist_ok=True)

    # ── STEP 1 — Load ─────────────────────────────────────────────────────────
    print("STEP 1 — Loading Dunnhumby CSVs (this reads ~800MB)...")
    trans = pd.read_csv(os.path.join(args.raw_dir, "transaction_data.csv"))
    prod  = pd.read_csv(os.path.join(args.raw_dir, "product.csv"))
    caus  = pd.read_csv(os.path.join(args.raw_dir, "causal_data.csv"))
    print(f"  transactions={len(trans):,}  products={len(prod):,}  causal={len(caus):,}")

    # ── STEP 2 — PRODUCE filter + category mapping ─────────────────────────────
    print("STEP 2 — Category mapping...")
    produce_raw = prod[prod["DEPARTMENT"] == "PRODUCE"].copy()
    produce = produce_raw[~produce_raw["COMMODITY_DESC"].isin(EXCLUDE_COMMODITIES)].copy()
    produce["category"] = produce["COMMODITY_DESC"].map(COMMODITY_MAP)
    mask = produce["COMMODITY_DESC"] == "ORGANICS FRUIT & VEGETABLES"
    produce.loc[mask, "category"] = produce.loc[mask, "SUB_COMMODITY_DESC"].apply(map_organics)
    produce = produce.dropna(subset=["category"])
    print(f"  produce products: {len(produce)}  |  {produce['category'].value_counts().to_dict()}")

    # ── STEP 3 — Size parse + normalize ────────────────────────────────────────
    print("STEP 3 — Size normalization...")
    produce[["size_value", "size_unit"]] = produce["CURR_SIZE_OF_PRODUCT"].apply(
        lambda x: pd.Series(parse_product_size(x)))
    produce[["normalized_size", "normalized_unit"]] = produce.apply(
        lambda r: pd.Series(normalize_to_lbs(r)), axis=1)
    produce["final_unit"] = produce["normalized_unit"].apply(clean_final_units)

    # ── STEP 4 — Join ───────────────────────────────────────────────────────────
    print("STEP 4 — Joining transactions to produce...")
    tp = trans.merge(
        produce[["PRODUCT_ID", "COMMODITY_DESC", "category",
                 "SUB_COMMODITY_DESC", "normalized_size", "final_unit"]],
        on="PRODUCT_ID", how="inner")
    print(f"  produce transactions: {len(tp):,} ({100*len(tp)/len(trans):.1f}% of all)")

    # ── STEP 5 — Shelf price + IQR filter ──────────────────────────────────────
    print("STEP 5 — Shelf price reconstruction + IQR filter...")
    tp = tp[tp["QUANTITY"] > 0].copy()
    total_disc = tp["RETAIL_DISC"].abs() + tp["COUPON_DISC"].abs() + tp["COUPON_MATCH_DISC"].abs()
    tp["base_price"] = (tp["SALES_VALUE"] + total_disc) / tp["QUANTITY"]
    tp["standard_price"] = np.where(
        tp["final_unit"] == "LB",
        tp["base_price"] / tp["normalized_size"].clip(lower=0.01),
        tp["base_price"])

    def filter_iqr(df, col):
        Q1 = df.groupby(["category", "final_unit"])[col].transform("quantile", 0.25)
        Q3 = df.groupby(["category", "final_unit"])[col].transform("quantile", 0.75)
        IQR = Q3 - Q1
        return df[(df[col] >= 0.05) & (df[col] <= Q3 + 1.5 * IQR)].copy()

    tp = filter_iqr(tp, "standard_price")
    herbs_lb = (tp["category"] == "herbs") & (tp["final_unit"] == "LB")
    tp = tp[~(herbs_lb & (tp["standard_price"] < 0.50))]

    # ── STEP 6 — Promotion flags ────────────────────────────────────────────────
    print("STEP 6 — Promotion flags...")
    caus["display"] = caus["display"].astype(str)
    caus["mailer"]  = caus["mailer"].astype(str)
    caus["promoted"] = ((caus["display"] != "0") | (caus["mailer"] != "0")).astype(int)
    caus_flag = caus[["PRODUCT_ID", "STORE_ID", "WEEK_NO", "promoted"]].drop_duplicates(
        subset=["PRODUCT_ID", "STORE_ID", "WEEK_NO"])
    tp = tp.merge(caus_flag, on=["PRODUCT_ID", "STORE_ID", "WEEK_NO"], how="left")
    tp["promoted"] = tp["promoted"].fillna(0).astype(int)

    # ── STEP 7 — Time features ──────────────────────────────────────────────────
    print("STEP 7 — Time features...")
    tp["hour_of_day"] = (tp["TRANS_TIME"] // 100).astype("int16")
    tp["day_of_week"] = ((tp["DAY"] - 1) % 7).astype("int16")
    tp["hour_of_week"] = (tp["day_of_week"] * 24 + tp["hour_of_day"]).astype("int16")

    # ── STEP 8 — Hourly aggregate (for Fourier) ────────────────────────────────
    print("STEP 8 — Hourly demand aggregate...")
    hourly = (tp.groupby(["WEEK_NO", "hour_of_week", "category", "final_unit"])
                .agg(revenue=("SALES_VALUE", "sum"),
                     n_baskets=("BASKET_ID", "nunique"),
                     avg_price=("standard_price", "mean"),
                     promo_rate=("promoted", "mean"))
                .reset_index())
    hourly["demand_rate"] = hourly["revenue"] / hourly["n_baskets"].clip(lower=1)
    hourly = hourly[hourly["n_baskets"] >= 3].copy()
    hourly["ref_price"]  = hourly.groupby(["category", "final_unit"])["avg_price"].transform("mean")
    hourly["ref_demand"] = hourly.groupby(["category", "final_unit"])["demand_rate"].transform("mean")
    hourly["log_p_norm"] = np.log(hourly["avg_price"]   / hourly["ref_price"]  + 1e-9)
    hourly["log_d_norm"] = np.log(hourly["demand_rate"] / hourly["ref_demand"] + 1e-9)

    # ── STEP 9 — Category-level OLS elasticity (quantity-normalized) ───────────
    print("STEP 9 — Elasticity OLS...")
    tp["qty_normalized"] = tp["QUANTITY"] * tp["normalized_size"]
    cat_weekly = (tp.groupby(["WEEK_NO", "category", "final_unit"])
                    .agg(revenue=("SALES_VALUE", "sum"),
                         qty_lbs_sum=("qty_normalized", "sum"),
                         n_baskets=("BASKET_ID", "nunique"),
                         avg_price=("standard_price", "mean"),
                         promoted=("promoted", "mean"))
                    .reset_index())
    cat_weekly["demand_rate"] = cat_weekly["qty_lbs_sum"] / cat_weekly["n_baskets"].clip(1)
    cat_weekly = cat_weekly[cat_weekly["n_baskets"] >= 5].copy()
    cat_weekly["ref_price"]  = cat_weekly.groupby(["category", "final_unit"])["avg_price"].transform("mean")
    cat_weekly["ref_demand"] = cat_weekly.groupby(["category", "final_unit"])["demand_rate"].transform("mean")
    cat_weekly["log_p"] = np.log(cat_weekly["avg_price"]   / cat_weekly["ref_price"]  + 1e-9)
    cat_weekly["log_d"] = np.log(cat_weekly["demand_rate"] / cat_weekly["ref_demand"] + 1e-9)

    DEMAND_PARAMS = {}
    for cat in AGENTS:
        for unit in cat_weekly[cat_weekly["category"] == cat]["final_unit"].unique():
            key = f"{cat}_{unit}"
            sub = cat_weekly[(cat_weekly["category"] == cat) &
                             (cat_weekly["final_unit"] == unit) &
                             (cat_weekly["promoted"] < 0.05)].dropna(subset=["log_p", "log_d"])
            base_demand = float(cat_weekly[(cat_weekly["category"] == cat) &
                                           (cat_weekly["final_unit"] == unit)]["demand_rate"].mean())
            ref_price = float(cat_weekly[(cat_weekly["category"] == cat) &
                                         (cat_weekly["final_unit"] == unit)]["avg_price"].mean())
            promo_weeks = cat_weekly[(cat_weekly["category"] == cat) &
                                     (cat_weekly["final_unit"] == unit) &
                                     (cat_weekly["promoted"] > 0.10)]["demand_rate"].mean()
            promo_eff = (float(np.log(promo_weeks / max(base_demand, 1e-6) + 1e-9))
                         if not np.isnan(promo_weeks) else 0.10)
            promo_eff = float(np.clip(promo_eff, 0.0, 0.50))

            if len(sub) < 20:
                DEMAND_PARAMS[key] = dict(beta=LITERATURE_BETAS[cat], promo_eff=promo_eff,
                                          base_demand=base_demand, ref_price=ref_price,
                                          n_obs=len(sub), r2=None, source="literature")
                continue
            price_cv = sub["avg_price"].std() / sub["avg_price"].mean()
            if price_cv < 0.03:
                DEMAND_PARAMS[key] = dict(beta=LITERATURE_BETAS[cat], promo_eff=promo_eff,
                                          base_demand=base_demand, ref_price=ref_price,
                                          n_obs=len(sub), r2=None, source="literature_flat_price")
                continue
            m = LinearRegression().fit(sub[["log_p"]], sub["log_d"])
            beta = float(m.coef_[0]); r2 = m.score(sub[["log_p"]], sub["log_d"])
            lit = LITERATURE_BETAS[cat]
            if beta >= 0 or abs(beta - lit) > 1.5:
                beta, source = lit, "literature_override"
            else:
                source = "ols"
            DEMAND_PARAMS[key] = dict(beta=beta, promo_eff=promo_eff,
                                      base_demand=base_demand, ref_price=ref_price,
                                      n_obs=len(sub), r2=r2, source=source)
            print(f"  {key:28s}: β={beta:6.3f} src={source} n={len(sub)}")

    # ── STEP 10 — Fourier seasonality ──────────────────────────────────────────
    print("STEP 10 — Fourier seasonality...")
    for key, p in DEMAND_PARAMS.items():
        parts = key.split("_"); cat = parts[0]; unit = "_".join(parts[1:])
        sub = hourly[(hourly["category"] == cat) & (hourly["final_unit"] == unit)].dropna(
            subset=["log_p_norm", "log_d_norm"]).copy()
        zero = dict(sin_daily=0.0, cos_daily=0.0, sin_weekly=0.0, cos_weekly=0.0)
        if len(sub) < 50:
            DEMAND_PARAMS[key].update(zero); continue
        sub["resid"] = sub["log_d_norm"] - p["beta"] * sub["log_p_norm"]
        X_s = pd.DataFrame({
            "sin_daily":  np.sin(2 * np.pi * sub["hour_of_week"] / 24),
            "cos_daily":  np.cos(2 * np.pi * sub["hour_of_week"] / 24),
            "sin_weekly": np.sin(2 * np.pi * sub["hour_of_week"] / 168),
            "cos_weekly": np.cos(2 * np.pi * sub["hour_of_week"] / 168)})
        sm = LinearRegression().fit(X_s, sub["resid"])
        DEMAND_PARAMS[key].update(dict(sin_daily=float(sm.coef_[0]), cos_daily=float(sm.coef_[1]),
                                       sin_weekly=float(sm.coef_[2]), cos_weekly=float(sm.coef_[3])))

    # ── STEP 11 — Cross-price elasticity matrix ────────────────────────────────
    print("STEP 11 — Cross-price elasticity matrix...")
    price_pivot = (cat_weekly[cat_weekly["promoted"] < 0.05]
                   .pivot_table(index="WEEK_NO", columns="category", values="log_p", aggfunc="mean")
                   .fillna(0))
    E_matrix = np.zeros((4, 4))
    for i, target in enumerate(AGENTS):
        avail = cat_weekly[cat_weekly["category"] == target]["final_unit"].unique()
        primary = "LB" if "LB" in avail else avail[0]
        sub = cat_weekly[(cat_weekly["category"] == target) &
                         (cat_weekly["final_unit"] == primary) &
                         (cat_weekly["promoted"] < 0.05) &
                         (cat_weekly["n_baskets"] >= 5)].copy()
        merged = sub.join(price_pivot, on="WEEK_NO", how="inner").dropna()
        if len(merged) < 20 or merged["log_d"].std() < 1e-6:
            continue
        cross = [c for c in AGENTS if c != target and c in merged.columns]
        if not cross:
            continue
        mod = LinearRegression().fit(merged[cross], merged["log_d"])
        for k, oc in enumerate(cross):
            E_matrix[i, AGENTS.index(oc)] = float(mod.coef_[k])
    E_matrix = np.clip(E_matrix, -2.0, 2.0)

    # ── STEP 12 — Consolidate to 4 categories + VN priors ──────────────────────
    print("STEP 12 — Consolidate + VN priors...")
    FINAL_PARAMS = {}
    for cat in AGENTS:
        sub_keys = [k for k in DEMAND_PARAMS if k.startswith(cat + "_")]
        n_obs = np.array([max(DEMAND_PARAMS[k]["n_obs"], 1) for k in sub_keys], float)
        w = n_obs / n_obs.sum()

        def wavg(field, default=0.0):
            return float(np.dot([DEMAND_PARAMS[k].get(field, default) for k in sub_keys], w))

        FINAL_PARAMS[cat] = dict(
            beta=wavg("beta"), promo_eff=wavg("promo_eff"),
            base_demand=wavg("base_demand"), ref_price=wavg("ref_price"),
            sin_daily=wavg("sin_daily"), cos_daily=wavg("cos_daily"),
            sin_weekly=wavg("sin_weekly"), cos_weekly=wavg("cos_weekly"))

    if APPLY_VN_PRIORS:
        for cat in AGENTS:
            FINAL_PARAMS[cat]["beta"]        *= VN_BETA_SCALE[cat]
            FINAL_PARAMS[cat]["base_demand"] *= VN_DEMAND_SCALE[cat]
        print("  Applied VN market priors.")

    print(f"  {'cat':>8} {'beta':>8} {'base_demand':>12} {'ref_price':>10}")
    for cat, p in FINAL_PARAMS.items():
        print(f"  {cat:>8} {p['beta']:>8.3f} {p['base_demand']:>12.3f} {p['ref_price']:>10.3f}")

    # ── STEP 13 — Save ──────────────────────────────────────────────────────────
    print("STEP 13 — Saving outputs...")
    with open(os.path.join(args.out_dir, "demand_params.json"), "w") as f:
        json.dump(FINAL_PARAMS, f, indent=2, default=float)
    np.save(os.path.join(args.out_dir, "cross_elasticity_matrix.npy"), E_matrix)
    with open(os.path.join(args.out_dir, "demand_params_subcategory.json"), "w") as f:
        json.dump(DEMAND_PARAMS, f, indent=2, default=float)

    # ── STEP 14 — Validation ────────────────────────────────────────────────────
    print("\n" + "=" * 60 + "\nVALIDATION SUITE\n" + "=" * 60)
    model = CrossDemandModel(FINAL_PARAMS, E_matrix)
    test_prices = {c: FINAL_PARAMS[c]["ref_price"] for c in AGENTS}
    test_fresh = {"leafy": 0.85, "root": 0.70, "fruit": 0.90, "herbs": 0.60}
    np.random.seed(42)

    t1 = all(FINAL_PARAMS[c]["beta"] < 0 for c in AGENTS)
    disc = test_prices.copy(); disc["leafy"] *= 0.70
    base_m = np.mean([model.sample(test_prices, test_fresh, 9, "leafy") for _ in range(1000)])
    disc_m = np.mean([model.sample(disc, test_fresh, 9, "leafy") for _ in range(1000)])
    t2 = disc_m > base_m
    fp = test_fresh.copy(); fp["fruit"] = 0.15
    good = np.mean([model.sample(test_prices, test_fresh, 12, "fruit") for _ in range(1000)])
    poor = np.mean([model.sample(test_prices, fp, 12, "fruit") for _ in range(1000)])
    t3 = poor < good
    hl = test_prices.copy(); hl["leafy"] *= 1.30
    b_fruit = np.mean([model.sample(test_prices, test_fresh, 12, "fruit") for _ in range(1000)])
    c_fruit = np.mean([model.sample(hl, test_fresh, 12, "fruit") for _ in range(1000)])
    t4 = abs(c_fruit - b_fruit) > 0.001

    print(f"  Test 1 (betas negative):        {'PASS' if t1 else 'FAIL'}")
    print(f"  Test 2 (discount→+demand):      {'PASS' if t2 else 'FAIL'}  ({base_m:.2f}→{disc_m:.2f})")
    print(f"  Test 3 (low fresh→-demand):     {'PASS' if t3 else 'FAIL'}  ({good:.2f}→{poor:.2f})")
    print(f"  Test 4 (cross-price active):    {'PASS' if t4 else 'FAIL'}  ({b_fruit:.2f} vs {c_fruit:.2f})")
    all_pass = t1 and t2 and t3 and t4
    print("=" * 60)
    print(f"  OVERALL: {'ALL PASS — ready for training' if all_pass else 'FAILURES — do not train'}")
    print("=" * 60)
    return 0 if all_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())
