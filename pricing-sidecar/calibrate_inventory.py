"""Reproducible per-category inventory calibration for the revenue-based obs fix.

Why this exists
---------------
The DDQN/forecaster were trained on `market_env`, where inventory is an abstract
integer count (`market_env.py:32` `integers(15,60)`) eaten by a revenue-scaled demand
(`base_demand` originates from revenue in preprocessing STEP 8). Simulating the frozen
env shows the *typical* inventory level per category is small (leafy/herbs ~3, fruit ~12,
root ~23), so the policy only ever saw `inventory_ratio = inv/100 ∈ [0.03, 0.42]`.

Production `availableQuantity` is in the farmer's free unit (kg/g/piece/bunch/box/bag/
liter) and is typically 60–150, so the raw `availableQuantity/100` feature is both
**unit-contaminated** (kg vs g for the same stock differ) and **grossly out of the
training distribution** (0.6–1.5 vs train 0.03–0.42).

Fix (no retrain): express inventory by its **monetary value** `inv_value =
availableQuantity * pricePerUnit` (unit-invariant — VND regardless of the unit) and
rescale it into the training inventory scale with a per-category constant:

    inv_norm = inv_value * S_cat,   S_cat = TRAIN_INV_MEAN[cat] / REF_INV_VALUE[cat]

`obs[1]` and `inv_coverage` are then built from `inv_norm` exactly as the env built them
from the integer inventory count. `obs_dim`, the feature definition and the weights are
unchanged — only the *value* is moved back in-distribution (same idea as the restock
clamp). This is calibration, not retraining.

Run:  python calibrate_inventory.py    (writes inventory_calibration.json)
"""
from __future__ import annotations

import json
import os
import sys

import numpy as np

_DP_ROOT = os.environ.get(
    "DP_ROOT",
    os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dynamic-pricing-final")),
)
sys.path.insert(0, _DP_ROOT)

CORE_CATEGORIES = ["leafy", "root", "fruit", "herbs"]

# Canonical demo catalog — the 4 trained categories only (out-of-domain categories such
# as honey/eggs/dairy are excluded; they have no trained agent and only map to `root` as
# a fallback). Source: f2t-backend/src/seed/seed.ts `productSpecs` (price VND, qty, unit).
SEED_CATALOG = [
    ("leafy", 18000, 80), ("leafy", 22000, 6), ("leafy", 10000, 70), ("leafy", 15000, 60),
    ("root", 28000, 120), ("root", 25000, 150), ("root", 30000, 130), ("root", 16000, 4),
    ("fruit", 65000, 60), ("fruit", 45000, 90), ("fruit", 35000, 50), ("fruit", 40000, 100), ("fruit", 35000, 40),
    ("herbs", 12000, 40), ("herbs", 9000, 55), ("herbs", 11000, 45), ("herbs", 13000, 30),
]


def train_inventory_mean(n_seeds: int = 40, episode_len: int = 91) -> dict[str, float]:
    """Mean inventory level per category over many simulated episodes of the frozen env."""
    cwd = os.getcwd()
    os.chdir(_DP_ROOT)  # market_env loads data/params/demand_params.json via a relative path
    try:
        from src.env.market_env import MarketEnv, CATEGORIES  # noqa: WPS433
        levels: dict[str, list[int]] = {c: [] for c in CATEGORIES}
        policy_rng = np.random.default_rng(0)
        for seed in range(n_seeds):
            env = MarketEnv(seed=seed)
            env.reset(seed=seed)
            for _ in range(episode_len):
                for c in CATEGORIES:
                    levels[c].append(env._inventory[c])
                env.step({c: float(policy_rng.uniform(-0.30, 0.20)) for c in CATEGORIES})
        return {c: float(np.mean(levels[c])) for c in CORE_CATEGORIES}
    finally:
        os.chdir(cwd)


def ref_inventory_value() -> dict[str, float]:
    """Mean monetary inventory value (VND) per category from the canonical catalog."""
    by_cat: dict[str, list[float]] = {c: [] for c in CORE_CATEGORIES}
    for cat, price, qty in SEED_CATALOG:
        by_cat[cat].append(price * qty)
    return {c: float(np.mean(v)) for c, v in by_cat.items()}


def main() -> None:
    train_mean = train_inventory_mean()
    ref_value = ref_inventory_value()
    s_cat = {c: train_mean[c] / ref_value[c] for c in CORE_CATEGORIES}

    out = {
        "_doc": "inv_norm = availableQuantity * pricePerUnit * s_cat[category]; "
                "obs[1] = min(inv_norm/100, 2.0); coverage uses inv_norm. See calibrate_inventory.py.",
        "train_inv_mean": train_mean,
        "ref_inv_value_vnd": ref_value,
        "s_cat": s_cat,
    }
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "inventory_calibration.json")
    with open(path, "w") as f:
        json.dump(out, f, indent=2)
    print(f"Wrote {path}")
    for c in CORE_CATEGORIES:
        print(f"  {c:6} train_inv_mean={train_mean[c]:6.2f}  ref_inv_value={ref_value[c]/1e6:5.2f}M  "
              f"s_cat={s_cat[c]:.4e}  (1 train-unit = {1/s_cat[c]/1000:5.0f}k VND)")


if __name__ == "__main__":
    main()
