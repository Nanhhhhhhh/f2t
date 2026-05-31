import numpy as np
import pytest
from src.mpc.controller import MPC, MPCConfig
from src.env.market_env import OBS_DIM, OBS_WINDOW

def _make_obs_window(freshness, inv_ratio, prev_delta=0.0):
    """Construct a (OBS_WINDOW, OBS_DIM) obs window with constant state."""
    row = np.zeros(OBS_DIM, dtype=np.float32)
    row[0] = freshness
    row[1] = inv_ratio
    row[6] = prev_delta    # [6] prev_delta
    row[7] = 1.0           # [7] competitor_ratio (= 1.0 means price parity with competitor)
    return np.tile(row, (OBS_WINDOW, 1))

@pytest.fixture
def mpc():
    return MPC(MPCConfig())

def test_high_freshness_does_not_max_discount(mpc):
    """At f=0.9, delta should not be -0.30."""
    obs = _make_obs_window(freshness=0.90, inv_ratio=0.5)
    result = mpc.decide(obs, category="leafy", current_price=1.48,
                         current_inv=50, current_freshness=0.90, prev_delta=0.0)
    assert result["delta"] > -0.30, f"Expected non-max-discount at f=0.9, got {result['delta']}"

def test_below_waste_threshold_is_discard(mpc):
    """f ≤ 0.50 → early return with delta=0 (item discarded, no pricing needed)."""
    obs = _make_obs_window(freshness=0.35, inv_ratio=1.5)
    result = mpc.decide(obs, category="leafy", current_price=1.48,
                         current_inv=150, current_freshness=0.35, prev_delta=0.0)
    assert result["delta"] == 0.0
    assert "discard" in result["reason"]

def test_just_above_threshold_high_inv_discounts(mpc):
    """f=0.55 (just above waste threshold) with high inventory → delta should be negative."""
    obs = _make_obs_window(freshness=0.55, inv_ratio=1.5)
    result = mpc.decide(obs, category="leafy", current_price=1.48,
                         current_inv=150, current_freshness=0.55, prev_delta=0.0)
    assert result["delta"] < 0.0, f"Expected discount at f=0.55 high inv, got {result['delta']}"

def test_result_has_required_keys(mpc):
    obs = _make_obs_window(freshness=0.8, inv_ratio=0.5)
    result = mpc.decide(obs, "leafy", 1.48, 50, 0.8, 0.0)
    for key in ("delta", "scores", "d_hat_0", "p_waste_0", "reason"):
        assert key in result, f"Missing key: {key}"

def test_delta_within_bounds(mpc):
    obs = _make_obs_window(freshness=0.7, inv_ratio=0.8)
    result = mpc.decide(obs, "herbs", 4.54, 30, 0.7, 0.0)
    assert -0.30 <= result["delta"] <= 0.20

def test_clearability_override_for_root(mpc):
    """Clearability override phải descent smooth (1 bước = max_delta_step), không nhảy thẳng -0.30."""
    obs = _make_obs_window(freshness=0.52, inv_ratio=2.0)
    result = mpc.decide(obs, category="root", current_price=1.06,
                         current_inv=200, current_freshness=0.52, prev_delta=0.0)
    assert result["delta"] == pytest.approx(-mpc.cfg.max_delta_step, abs=0.01)

def test_delta_change_respects_max_step(mpc):
    """Delta không thay đổi quá max_delta_step trong middle zone (0.60 < f < 0.85)."""
    obs = _make_obs_window(freshness=0.75, inv_ratio=0.5)
    result = mpc.decide(obs, "leafy", 1.48, 50, 0.75, prev_delta=-0.30)
    assert result["delta"] >= -0.30 - 1e-6
    assert result["delta"] <= -0.30 + mpc.cfg.max_delta_step + 1e-6

def test_no_jump_from_min_to_max(mpc):
    """Không thể nhảy từ -0.30 lên +0.20 trong middle zone."""
    obs = _make_obs_window(freshness=0.75, inv_ratio=0.1)
    result = mpc.decide(obs, "leafy", 1.48, 5, 0.75, prev_delta=-0.30)
    assert result["delta"] <= -0.30 + mpc.cfg.max_delta_step + 1e-6

def test_smooth_ascent_from_negative(mpc):
    """Từ prev_delta=-0.20 trong middle zone, tối đa lên được -0.10."""
    obs = _make_obs_window(freshness=0.75, inv_ratio=0.05)
    result = mpc.decide(obs, "leafy", 1.48, 5, 0.75, prev_delta=-0.20)
    assert result["delta"] <= -0.20 + mpc.cfg.max_delta_step + 1e-6

def test_exempt_zones_allow_free_jump(mpc):
    """f ≥ smooth_exempt_high hoặc f ≤ smooth_exempt_low → bỏ qua max_delta_step."""
    # High zone: f=0.90 ≥ 0.85 → có thể nhảy từ -0.30 lên premium
    obs = _make_obs_window(freshness=0.90, inv_ratio=0.8)
    result = mpc.decide(obs, "root", 1.06, 80, 0.90, prev_delta=-0.30)
    assert result["delta"] > -0.30 + mpc.cfg.max_delta_step

    # Low zone: f=0.55 ≤ 0.60 → có thể nhảy thẳng xuống -0.30
    obs2 = _make_obs_window(freshness=0.55, inv_ratio=0.8)
    result2 = mpc.decide(obs2, "leafy", 1.48, 80, 0.55, prev_delta=0.0)
    assert result2["delta"] < -0.10



def test_score_all_prices_relative_to_ref(mpc):
    """_score_all must anchor candidate prices to ref_price, not current_price.

    When current_price != ref_price (e.g. drifted to 80%), the scoring at delta=0
    must produce revenue based on ref_price*1.0, not current_price*1.0.
    """
    from src.mpc.controller import CANDIDATES
    cat = "leafy"
    p = mpc.demand_model._params[cat]
    ref_price = p["ref_price"]
    current_price = ref_price * 0.80
    cost_floor = ref_price * p["cost_ratio"] * 1.05
    price_ceil = ref_price * 2.0
    beta_f = mpc.demand_model.beta_at_freshness(0.80, cat)
    d_hat_0 = 10.0

    scores = mpc._score_all(
        CANDIDATES, current_price, d_hat_0, 0.05, 10.0, 50, 0.0,
        ref_price, cost_floor, price_ceil, beta_f, 0.80,
    )

    zero_idx = 6  # CANDIDATES[6] == 0.0
    expected_price = ref_price
    expected_demand = d_hat_0 * (expected_price / current_price) ** beta_f
    expected_revenue = expected_price * expected_demand
    assert abs(scores["revenues"][zero_idx] - expected_revenue) < 0.01, (
        f"Revenue at delta=0: expected {expected_revenue:.4f}, got {scores['revenues'][zero_idx]:.4f}. "
        f"Scoring must use ref_price={ref_price}, not current_price={current_price}."
    )
