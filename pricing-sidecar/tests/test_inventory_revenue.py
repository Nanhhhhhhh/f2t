"""Revenue-calibrated inventory must be unit-invariant and in-distribution.

At train, inventory is an abstract count whose typical level is small (leafy/herbs ~3,
fruit ~12, root ~23 — calibrate_inventory.py), so obs[1] = inv/100 ∈ [0.03, 0.42].
Production availableQuantity is in the farmer's free unit and far larger, so raw
availableQuantity/100 is unit-contaminated and out-of-distribution. The fix expresses
inventory by monetary value (availableQuantity * pricePerUnit, unit-invariant) rescaled
into the training scale via per-category S_cat.
"""
from unittest.mock import patch

# Mock torch.load so importing main does not require real checkpoints.
patch("torch.load", side_effect=FileNotFoundError("Mocked file not found")).start()

import pytest

from main import _build_obs, _inventory_norm, INV_S_CAT

OBS_INV_RATIO = 1
OBS_INV_COVERAGE = 9


def _obs(category, *, inventory_ratio=0.0, available_quantity=0.0, base_price=0.0, demand_7d=30.0):
    return _build_obs(
        freshness=0.85,
        inventory_ratio=inventory_ratio,
        base_price=base_price,
        competitor_ref_price=base_price or 1.0,
        days_to_restock=3.0,
        prev_delta=0.0,
        demand_7d=demand_7d,
        category=category,
        available_quantity=available_quantity,
    )


def test_calibration_loaded():
    assert set(INV_S_CAT) == {"leafy", "root", "fruit", "herbs"}
    assert all(v > 0 for v in INV_S_CAT.values())


def test_unit_invariant_kg_vs_g():
    # Same physical carrot stock: 120 kg @28000/kg  vs  120000 g @28/g → identical value.
    kg = _obs("root", available_quantity=120, base_price=28000)
    g = _obs("root", available_quantity=120_000, base_price=28)
    assert kg[OBS_INV_RATIO] == pytest.approx(g[OBS_INV_RATIO])
    assert kg[OBS_INV_COVERAGE] == pytest.approx(g[OBS_INV_COVERAGE])


def test_same_value_same_obs_regardless_of_unit():
    # Two ways to express the same 3.36M VND of stock must produce the same obs[1].
    a = _obs("root", available_quantity=120, base_price=28000)
    b = _obs("root", available_quantity=336, base_price=10000)
    assert a[OBS_INV_RATIO] == pytest.approx(b[OBS_INV_RATIO])


@pytest.mark.parametrize(
    "category,price,qty",
    [("root", 28000, 120), ("leafy", 18000, 80), ("fruit", 65000, 60), ("herbs", 12000, 40)],
)
def test_production_stock_is_in_distribution(category, price, qty):
    # A typical production product must land in the train obs[1] band [0.03, ~0.45],
    # not saturate at the clamp 2.0 like the raw availableQuantity/100 did.
    obs = _obs(category, available_quantity=qty, base_price=price)
    assert 0.0 < obs[OBS_INV_RATIO] < 0.5


def test_legacy_fallback_when_no_quantity():
    # available_quantity=0 → fall back to the old count path (inventory_ratio * 100 / 100).
    legacy = _obs("root", inventory_ratio=0.4, available_quantity=0, base_price=0)
    assert legacy[OBS_INV_RATIO] == pytest.approx(0.4)


def test_inventory_norm_helper():
    # Revenue path used when quantity, price and category are all available.
    s = INV_S_CAT["root"]
    assert _inventory_norm("root", 0.0, 120, 28000) == pytest.approx(120 * 28000 * s)
    # Fallback to legacy count otherwise.
    assert _inventory_norm("root", 0.4, 0, 28000) == pytest.approx(40.0)
    assert _inventory_norm("unknown_cat", 0.4, 120, 28000) == pytest.approx(40.0)
