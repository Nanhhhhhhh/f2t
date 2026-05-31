# tests/test_market_env.py
import numpy as np
import pytest
from src.env.market_env import MarketEnv, OBS_DIM, CATEGORIES

@pytest.fixture
def env():
    return MarketEnv(seed=42)

def test_obs_dim_is_10():
    assert OBS_DIM == 10


def test_price_is_base_relative():
    """Applying the same delta three times must yield ref*(1+delta) each time — no drift."""
    env = MarketEnv(seed=42)
    env.reset(seed=42)
    cat = "leafy"
    p = env._demand_model._params[cat]
    ref = p["ref_price"]
    cost_floor = ref * p["cost_ratio"] * 1.05

    for step_i in range(3):
        env.step({c: -0.10 for c in CATEGORIES})
        expected = max(ref * 0.90, cost_floor)
        assert abs(env._prices[cat] - expected) < 1e-6, (
            f"step {step_i}: expected {expected:.6f}, got {env._prices[cat]:.6f}"
        )


def test_days_to_waste_feature_decreases_with_freshness():
    """obs[9] (days_to_waste) phải cao hơn khi freshness cao hơn."""
    from src.env.market_env import DAILY_DECAY
    env_hi = MarketEnv(seed=7)
    env_hi.reset()
    env_hi._freshness["leafy"] = 0.90
    env_lo = MarketEnv(seed=7)
    env_lo.reset()
    env_lo._freshness["leafy"] = 0.55
    obs_hi = env_hi._build_obs()
    obs_lo = env_lo._build_obs()
    assert obs_hi["leafy"][8] > obs_lo["leafy"][8]


def test_inv_coverage_zero_when_no_inventory():
    """obs[10] phải là 0 khi inventory = 0."""
    env = MarketEnv(seed=7)
    env.reset()
    env._inventory["herbs"] = 0
    obs = env._build_obs()
    assert obs["herbs"][9] == pytest.approx(0.0, abs=1e-6)


def test_new_features_normalized():
    """obs[9] và obs[10] phải nằm trong [0, 1] sau nhiều bước."""
    rng = np.random.default_rng(0)
    env = MarketEnv(seed=0)
    env.reset()
    for _ in range(50):
        deltas = {cat: float(rng.uniform(-0.30, 0.20)) for cat in CATEGORIES}
        obs, _, done, _ = env.step(deltas)
        for cat in CATEGORIES:
            assert 0.0 <= obs[cat][8] <= 1.0 + 1e-6, f"{cat} obs[8]={obs[cat][8]}"
            assert 0.0 <= obs[cat][9] <= 1.0 + 1e-6, f"{cat} obs[9]={obs[cat][9]}"
        if done:
            break

def test_reset_returns_correct_shape(env):
    obs = env.reset()
    for cat in CATEGORIES:
        assert obs[cat].shape == (OBS_DIM,)

def test_comp_ratio_in_obs(env):
    obs = env.reset()
    # obs[8] = competitor_ratio, should be in [0.5, 2.0]
    for cat in CATEGORIES:
        assert 0.5 <= obs[cat][7] <= 2.0

def test_step_returns_four_categories(env):
    env.reset()
    deltas = {cat: 0.0 for cat in CATEGORIES}
    obs, info, done, _ = env.step(deltas)
    assert set(obs.keys()) == set(CATEGORIES)

def test_waste_fires_at_050(env):
    """Force freshness below 0.50, check inventory cleared."""
    env.reset()
    # Manually set freshness of leafy to 0.49
    env._freshness["leafy"] = 0.49
    env._inventory["leafy"] = 10
    deltas = {cat: 0.0 for cat in CATEGORIES}
    _, info, _, _ = env.step(deltas)
    assert env._inventory["leafy"] == 0

def test_restock_rejected_below_070(env):
    """If f_delivery < 0.70, inventory should not increase."""
    env.reset()
    env._inventory["herbs"] = 5
    env._freshness["herbs"] = 0.80
    initial_inv = env._inventory["herbs"]
    env._attempt_restock("herbs", f_delivery=0.65)
    assert env._inventory["herbs"] == initial_inv  # rejected

def test_price_never_below_cost_floor(env):
    env.reset()
    for _ in range(30):
        deltas = {cat: -0.30 for cat in CATEGORIES}
        env.step(deltas)
    for cat in CATEGORIES:
        cost_floor = env._demand_model._params[cat]["ref_price"] * \
                     env._demand_model._params[cat]["cost_ratio"] * 1.05
        assert env._prices[cat] >= cost_floor - 1e-6

def test_prev_delta_in_obs(env):
    env.reset()
    deltas = {cat: -0.10 for cat in CATEGORIES}
    obs, _, _, _ = env.step(deltas)
    # obs[7] = prev_delta, should be -0.10
    for cat in CATEGORIES:
        assert obs[cat][6] == pytest.approx(-0.10, abs=1e-4)


def test_obs_returns_current_obs_vector(env):
    """env.obs(cat) must equal _build_obs()[cat] after a step."""
    from src.env.market_env import OBS_DIM
    env.reset(seed=1)
    deltas = {cat: 0.0 for cat in CATEGORIES}
    expected_obs, _, _, _ = env.step(deltas)
    for cat in CATEGORIES:
        got = env.obs(cat)
        assert got.shape == (OBS_DIM,)
        np.testing.assert_allclose(got, expected_obs[cat], rtol=1e-5)


def test_obs_window_still_chronological(env):
    """obs_window() must return oldest-first (21, 10) after ring-buffer refactor."""
    from src.env.market_env import OBS_WINDOW, OBS_DIM
    env.reset(seed=2)
    deltas = {cat: 0.0 for cat in CATEGORIES}
    for _ in range(5):
        env.step(deltas)
    for cat in CATEGORIES:
        w = env.obs_window(cat)
        assert w.shape == (OBS_WINDOW, OBS_DIM)
        # last row must equal env.obs(cat)
        np.testing.assert_allclose(w[-1], env.obs(cat), rtol=1e-5)
