import numpy as np
import pytest
from src.rl.reward import (
    freshness_target_delta, compute_mask, compute_reward, CANDIDATES, ZERO_IDX,
    NEUTRAL, EXEMPT_HIGH, DISCOUNT_START, WASTE_THRESHOLD, HOLD_CATS,
)


def test_zero_idx_is_delta_zero():
    assert CANDIDATES[ZERO_IDX] == pytest.approx(0.0, abs=1e-6)


# --- freshness_target_delta ---

def test_freshness_target_delta_neutral_is_zero():
    # Premium cats: neutral at NEUTRAL_PREMIUM=0.70
    from src.rl.reward import NEUTRAL_PREMIUM
    assert freshness_target_delta(NEUTRAL_PREMIUM, "root")  == pytest.approx(0.0, abs=1e-6)
    assert freshness_target_delta(NEUTRAL_PREMIUM, "fruit") == pytest.approx(0.0, abs=1e-6)
    # Hold cats: target=0.0 for all f >= DISCOUNT_START
    assert freshness_target_delta(0.80, "leafy") == pytest.approx(0.0, abs=1e-6)
    assert freshness_target_delta(0.80, "herbs") == pytest.approx(0.0, abs=1e-6)


def test_freshness_target_delta_exempt_high_is_max_premium():
    # Only non-hold cats get premium at high freshness
    assert freshness_target_delta(0.85, "root")  == pytest.approx(0.20, abs=1e-6)
    assert freshness_target_delta(0.99, "fruit") == pytest.approx(0.20, abs=1e-6)
    # Hold cats stay at 0.0
    assert freshness_target_delta(0.90, "leafy") == pytest.approx(0.0, abs=1e-6)
    assert freshness_target_delta(0.90, "herbs") == pytest.approx(0.0, abs=1e-6)


def test_freshness_target_delta_above_neutral_increases():
    # Non-hold: 0.75 → -0.10, 0.80 → 0.0, 0.85 → +0.20
    d1 = freshness_target_delta(0.75, "root")
    d2 = freshness_target_delta(0.80, "root")
    d3 = freshness_target_delta(0.85, "root")
    assert d1 < d2 < d3


def test_freshness_target_delta_below_neutral_is_negative():
    # f=0.60: in discount zone [0.50, 0.70)
    # target = -0.30 * (0.70-0.60)/(0.70-0.50) = -0.30 * 0.5 = -0.15
    d = freshness_target_delta(0.60, "root")
    assert d == pytest.approx(-0.15, abs=1e-6)


def test_freshness_target_delta_clamped_to_min():
    d = freshness_target_delta(0.50, "root")
    assert d == pytest.approx(-0.30, abs=1e-6)
    d2 = freshness_target_delta(0.30, "root")
    assert d2 == pytest.approx(-0.30, abs=1e-6)


# --- compute_mask ---

def test_compute_mask_discard_zone_only_zero():
    mask = compute_mask(0.50, "root")
    assert mask.sum() == 1
    assert CANDIDATES[mask][0] == pytest.approx(0.0, abs=1e-6)


def test_compute_mask_discard_zone_below_threshold():
    mask = compute_mask(0.40, "fruit")
    assert mask.sum() == 1
    assert CANDIDATES[mask][0] == pytest.approx(0.0, abs=1e-6)


def test_compute_mask_buyer_ok_no_positive_deltas():
    # f=0.60 < NEUTRAL — no positive deltas for any cat
    for cat in ["leafy", "herbs", "fruit", "root"]:
        mask = compute_mask(0.60, cat)
        valid = CANDIDATES[mask]
        assert all(d <= 0.0 for d in valid), f"{cat}: positive delta at f=0.60: {valid}"


def test_compute_mask_buyer_ok_includes_zero():
    for cat in ["leafy", "herbs", "fruit", "root"]:
        mask = compute_mask(0.60, cat)
        assert mask[ZERO_IDX], f"{cat}: delta=0 must be valid at f=0.60"


def test_compute_mask_upper_ok_capped_at_target():
    # Cap zone is 0.80 <= f < 0.85, non-hold cats only
    f = 0.82
    for cat in ["fruit", "root"]:
        mask = compute_mask(f, cat)
        valid = CANDIDATES[mask]
        target = freshness_target_delta(f, cat)
        assert all(d <= target + 1e-6 for d in valid), \
            f"{cat}: delta exceeds target {target:.3f}: {valid}"


def test_compute_mask_hold_cats_never_positive():
    # leafy/herbs: positive deltas always blocked regardless of freshness
    for cat in HOLD_CATS:
        for f in [0.60, 0.75, 0.85, 0.95]:
            mask = compute_mask(f, cat)
            valid = CANDIDATES[mask]
            assert all(d <= 0.0 for d in valid), \
                f"{cat} f={f}: positive delta should be blocked: {valid}"


def test_compute_mask_exempt_all_valid_for_premium_cats():
    # fruit/root at f=0.90 → all 11 actions valid
    for cat in ["fruit", "root"]:
        mask = compute_mask(0.90, cat)
        assert all(mask), f"{cat}: all actions must be valid at f=0.90"


def test_compute_mask_dynamism_guarantee():
    # f=0.60: +0.20 blocked; f=0.90 fruit/root: +0.20 valid
    for cat in ["fruit", "root"]:
        mask_stale = compute_mask(0.60, cat)
        mask_fresh = compute_mask(0.90, cat)
        assert not mask_stale[-1], f"{cat}: +0.20 must be blocked at f=0.60"
        assert mask_fresh[-1],     f"{cat}: +0.20 must be valid at f=0.90"


# --- compute_reward ---

def test_compute_reward_positive_revenue():
    r = compute_reward(price=2.0, ref_price=2.0, sold=5.0, waste_units=0,
                       delta=0.0, prev_delta=0.0, freshness=0.80)
    assert r > 0


def test_compute_reward_waste_is_penalized():
    r_no_waste = compute_reward(price=2.0, ref_price=2.0, sold=5.0, waste_units=0,
                                delta=0.0, prev_delta=0.0, freshness=0.80)
    r_waste    = compute_reward(price=2.0, ref_price=2.0, sold=5.0, waste_units=10,
                                delta=0.0, prev_delta=0.0, freshness=0.80)
    assert r_waste < r_no_waste


def test_compute_reward_target_deviation_penalized():
    r_on_target  = compute_reward(price=2.0, ref_price=2.0, sold=3.0, waste_units=0,
                                   delta=0.20, prev_delta=0.0, freshness=0.85, cat="root")
    r_off_target = compute_reward(price=2.0, ref_price=2.0, sold=3.0, waste_units=0,
                                   delta=-0.30, prev_delta=0.0, freshness=0.85, cat="root")
    assert r_on_target > r_off_target


def test_compute_reward_smooth_penalty_applies():
    r_smooth    = compute_reward(price=2.0, ref_price=2.0, sold=3.0, waste_units=0,
                                  delta=-0.10, prev_delta=0.10, freshness=0.75)
    r_no_smooth = compute_reward(price=2.0, ref_price=2.0, sold=3.0, waste_units=0,
                                  delta=-0.10, prev_delta=-0.10, freshness=0.75)
    assert r_smooth < r_no_smooth


def test_compute_reward_premium_incentive_for_root():
    # At f=0.90, root should get higher reward for premium than discount
    r_prem = compute_reward(price=1.2, ref_price=1.0, sold=4, waste_units=0,
                             delta=0.20, prev_delta=0.0, freshness=0.90, cat="root")
    r_disc = compute_reward(price=0.7, ref_price=1.0, sold=8, waste_units=0,
                             delta=-0.30, prev_delta=0.0, freshness=0.90, cat="root")
    assert r_prem > r_disc


def test_compute_reward_hold_cats_no_premium_incentive():
    # leafy: at f=0.90, delta=0.0 better than delta=-0.20 (hold > discount when fresh)
    r_hold = compute_reward(price=1.0, ref_price=1.0, sold=3, waste_units=0,
                             delta=0.0, prev_delta=0.0, freshness=0.90, cat="leafy")
    r_disc = compute_reward(price=0.8, ref_price=1.0, sold=5, waste_units=0,
                             delta=-0.20, prev_delta=0.0, freshness=0.90, cat="leafy")
    assert r_hold > r_disc
