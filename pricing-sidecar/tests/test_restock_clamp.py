"""days_to_restock must stay inside the per-category training support [1, RESTOCK_EVERY[cat]].

market_env.py only ever produced obs[4] = min(days_to_next/30, 1) with
days_to_next ∈ [1, RESTOCK_EVERY[cat]] (RESTOCK_EVERY max = root 7). Production
intervalDays is farmer-set in [1, 30], so the raw value must be clamped before
normalisation or obs[4] goes out of distribution (up to 1.0 ≈ 4× the train max).
"""
from unittest.mock import patch

# Mock torch.load so importing main does not require real checkpoints.
patch("torch.load", side_effect=FileNotFoundError("Mocked file not found")).start()

import pytest

from main import _build_obs, RESTOCK_EVERY

OBS4 = 4  # days_to_restock slot


def _obs4(category: str, days_to_restock: float) -> float:
    obs = _build_obs(
        freshness=0.85,
        inventory_ratio=0.4,
        base_price=10000.0,
        competitor_ref_price=9500.0,
        days_to_restock=days_to_restock,
        prev_delta=0.0,
        demand_7d=30.0,
        category=category,
    )
    return float(obs[OBS4])


@pytest.mark.parametrize("category", list(RESTOCK_EVERY.keys()))
def test_in_distribution_values_unchanged(category):
    # days_to_restock within [1, RESTOCK_EVERY[cat]] is passed through untouched.
    horizon = RESTOCK_EVERY[category]
    for dtr in range(1, horizon + 1):
        assert _obs4(category, dtr) == pytest.approx(dtr / 30.0)


@pytest.mark.parametrize("category", list(RESTOCK_EVERY.keys()))
def test_above_horizon_is_clamped_to_train_max(category):
    horizon = RESTOCK_EVERY[category]
    expected = horizon / 30.0
    for dtr in (horizon + 1, 14, 21, 30, 100):
        assert _obs4(category, dtr) == pytest.approx(expected)


@pytest.mark.parametrize("category", list(RESTOCK_EVERY.keys()))
def test_below_one_is_clamped_up(category):
    # Train days_to_next minimum is 1 (obs[4] = 1/30); serve can emit ~0.
    for dtr in (0.0, 0.01, 0.5):
        assert _obs4(category, dtr) == pytest.approx(1.0 / 30.0)


def test_never_exceeds_global_train_max():
    # No category may ever produce obs[4] above the global train ceiling 7/30.
    for category in RESTOCK_EVERY:
        for dtr in (0.0, 1, 7, 30, 100):
            assert _obs4(category, dtr) <= 7.0 / 30.0 + 1e-6
