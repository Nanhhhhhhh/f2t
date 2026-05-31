# Dynamic Pricing v3 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fresh-food dynamic pricing module with freshness-dependent elasticity β(f) that produces non-flat, state-dependent price recommendations — fresh items hold/premium, near-expiry items discount aggressively.

**Architecture:** Two-stage pipeline — LSTM forecaster (21-day obs window, obs_dim=9) predicts 7-day demand and waste probability; MPC controller uses β(f) demand model to score 11 price delta candidates. Demand elasticity varies with freshness so the revenue gain from discounting is small when fresh (λ_move can suppress it) and large when old (MPC naturally discounts). Tier B (quality premium in MPC scorer) is implemented only if Tier A fails the policy dynamism check.

**Tech Stack:** Python 3.11, PyTorch 2.x, NumPy, SciPy, pandas, matplotlib, scikit-learn, pytest

---

## File Structure

```
dynamic_pricing_v3/
├── requirements.txt
├── src/
│   ├── env/
│   │   ├── __init__.py
│   │   ├── freshness.py          # constants + FreshnessModel
│   │   ├── demand.py             # CrossDemandModel with β(f)
│   │   └── market_env.py         # MarketEnv (obs_dim=9, business rules)
│   ├── forecaster/
│   │   ├── __init__.py
│   │   ├── model.py              # ForecasterLSTM (obs_dim=9)
│   │   ├── losses.py             # combined_loss, pos_weight_from_rate
│   │   ├── data.py               # data generation, PerishableForecastDataset
│   │   ├── train.py              # training loop + training monitor
│   │   └── eval.py               # evaluation, isotonic calibration, metrics
│   ├── mpc/
│   │   ├── __init__.py
│   │   └── controller.py         # MPC, MPCConfig (Tier A + Tier B)
│   ├── monitoring/
│   │   ├── __init__.py
│   │   ├── heatmap.py            # policy heatmap (freshness × inv_ratio → δ)
│   │   └── explainer.py          # DecisionExplainer → JSON for seller
│   ├── eval/
│   │   ├── __init__.py
│   │   ├── metrics.py            # SystemResult, paired_ttest_waste, mean_diff_ci
│   │   └── compare.py            # build_headline_table, policy_dynamism_check
│   └── pipeline.py               # run_episode, run_policy_episode, make_env
├── data/
│   └── params/
│       └── demand_params.json    # β, spread, base_demand, ref_price, seasonality
├── checkpoints/
│   └── plots/
├── logs/
│   └── decisions/                # Phase 1→2 data logging
└── tests/
    ├── conftest.py
    ├── test_freshness.py
    ├── test_demand.py
    ├── test_market_env.py
    ├── test_forecaster_model.py
    ├── test_mpc.py
    ├── test_monitoring.py
    └── test_eval.py
```

---

## Task 1: Project Setup

**Files:**
- Create: `requirements.txt`
- Create: `src/env/__init__.py`, `src/forecaster/__init__.py`, `src/mpc/__init__.py`, `src/monitoring/__init__.py`, `src/eval/__init__.py`
- Create: `tests/conftest.py`
- Create: `data/params/demand_params.json`

- [ ] **Step 1: Create requirements.txt**

```
torch>=2.0
numpy>=1.24
scipy>=1.10
pandas>=2.0
matplotlib>=3.7
scikit-learn>=1.3
pytest>=7.4
```

- [ ] **Step 2: Install dependencies**

```bash
pip install -r requirements.txt
```

Expected: no errors.

- [ ] **Step 3: Create package __init__.py files**

```bash
mkdir -p src/env src/forecaster src/mpc src/monitoring src/eval
mkdir -p data/params checkpoints/plots logs/decisions tests
touch src/__init__.py src/env/__init__.py src/forecaster/__init__.py
touch src/mpc/__init__.py src/monitoring/__init__.py src/eval/__init__.py
```

- [ ] **Step 4: Create tests/conftest.py**

```python
import pytest
import numpy as np

@pytest.fixture
def rng():
    return np.random.default_rng(42)
```

- [ ] **Step 5: Create data/params/demand_params.json**

```json
{
  "leafy": {
    "beta": -2.449,
    "spread": 1.5,
    "base_demand": 7.463,
    "ref_price": 1.4797,
    "cost_ratio": 0.55,
    "sin_weekly": -0.195,
    "cos_weekly": -0.045,
    "gamma": 0.30
  },
  "root": {
    "beta": -0.457,
    "spread": 1.5,
    "base_demand": 5.631,
    "ref_price": 1.0596,
    "cost_ratio": 0.50,
    "sin_weekly": -0.195,
    "cos_weekly": -0.045,
    "gamma": 0.30
  },
  "fruit": {
    "beta": -1.126,
    "spread": 1.5,
    "base_demand": 2.050,
    "ref_price": 2.0498,
    "cost_ratio": 0.58,
    "sin_weekly": -0.195,
    "cos_weekly": -0.045,
    "gamma": 0.30
  },
  "herbs": {
    "beta": -1.348,
    "spread": 1.5,
    "base_demand": 4.575,
    "ref_price": 4.5440,
    "cost_ratio": 0.45,
    "sin_weekly": -0.195,
    "cos_weekly": -0.045,
    "gamma": 0.30
  }
}
```

**Seasonality rationale:** sin_weekly=−0.195, cos_weekly=−0.045 gives ~20% amplitude peaking on Saturday (d=5): `season(5) = 1 + (−0.195)×(−0.975) + (−0.045)×(−0.223) ≈ 1.20`.

- [ ] **Step 6: Commit**

```bash
git add requirements.txt src/ data/ tests/ checkpoints/ logs/
git commit -m "chore: project structure and demand params"
```

---

## Task 2: Freshness Model

**Files:**
- Create: `src/env/freshness.py`
- Create: `tests/test_freshness.py`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_freshness.py
import pytest
from src.env.freshness import (
    WASTE_THRESHOLD, RESTOCK_MIN_FRESH, DAILY_DECAY,
    decay_step, is_waste, shelf_life_days
)

def test_waste_threshold_is_050():
    assert WASTE_THRESHOLD == 0.50

def test_restock_min_fresh_is_070():
    assert RESTOCK_MIN_FRESH == 0.70

def test_decay_step_reduces_freshness():
    f = decay_step(0.85, "leafy")
    assert f == pytest.approx(0.85 * 0.850)

def test_decay_step_clips_at_zero():
    f = decay_step(0.001, "herbs")
    assert f >= 0.0

def test_is_waste_true_below_threshold():
    assert is_waste(0.49, inv=5) is True

def test_is_waste_false_at_threshold():
    assert is_waste(0.50, inv=5) is False

def test_is_waste_false_when_no_inventory():
    assert is_waste(0.30, inv=0) is False

def test_shelf_life_leafy():
    # from f0=0.85, leafy (c=0.85), reaches 0.50 in ~4.5 days
    days = shelf_life_days(f0=0.85, category="leafy")
    assert 4.0 < days < 5.0

def test_shelf_life_herbs_very_short():
    # herbs (c=0.80): from 0.85 to 0.50 in ~3 days
    days = shelf_life_days(f0=0.85, category="herbs")
    assert 2.5 < days < 3.5
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
pytest tests/test_freshness.py -v
```

Expected: ImportError (module not found).

- [ ] **Step 3: Implement src/env/freshness.py**

```python
import math
from typing import Literal

WASTE_THRESHOLD: float = 0.50
RESTOCK_MIN_FRESH: float = 0.70

DAILY_DECAY: dict[str, float] = {
    "leafy": 0.850,
    "root":  0.950,
    "fruit": 0.880,
    "herbs": 0.800,
}

Category = Literal["leafy", "root", "fruit", "herbs"]


def decay_step(f: float, category: Category) -> float:
    return max(0.0, f * DAILY_DECAY[category])


def is_waste(f: float, inv: int) -> bool:
    return f < WASTE_THRESHOLD and inv > 0


def shelf_life_days(f0: float, category: Category) -> float:
    """Days from f0 until freshness drops below WASTE_THRESHOLD."""
    c = DAILY_DECAY[category]
    if c >= 1.0:
        return float("inf")
    return math.log(WASTE_THRESHOLD / f0) / math.log(c)
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
pytest tests/test_freshness.py -v
```

Expected: all 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/env/freshness.py tests/test_freshness.py
git commit -m "feat: freshness model with WASTE_THRESHOLD=0.50"
```

---

## Task 3: Demand Model with β(f)

**Files:**
- Create: `src/env/demand.py`
- Create: `tests/test_demand.py`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_demand.py
import pytest
import json
import math
from src.env.demand import CrossDemandModel

@pytest.fixture
def model():
    return CrossDemandModel.from_json("data/params/demand_params.json")

def test_beta_at_fresh_is_less_negative(model):
    beta_fresh = model.beta_at_freshness(1.0, "leafy")
    beta_old = model.beta_at_freshness(0.0, "leafy")
    assert beta_fresh > beta_old  # closer to zero = less elastic

def test_beta_average_matches_base(model):
    # integral of β(f) over [0,1] = β_base (constraint: spread symmetric)
    betas = [model.beta_at_freshness(f, "leafy") for f in [i/100 for i in range(101)]]
    avg = sum(betas) / len(betas)
    assert avg == pytest.approx(-2.449, abs=0.05)

def test_demand_decreases_with_higher_price(model, rng):
    low_price = model.demand_rate("leafy", price=1.0, freshness=0.8,
                                   comp_price=1.4797, dow=2)
    high_price = model.demand_rate("leafy", price=2.0, freshness=0.8,
                                    comp_price=1.4797, dow=2)
    assert low_price > high_price

def test_demand_increases_with_freshness(model, rng):
    fresh = model.demand_rate("leafy", price=1.4797, freshness=0.9,
                               comp_price=1.4797, dow=2)
    old = model.demand_rate("leafy", price=1.4797, freshness=0.3,
                              comp_price=1.4797, dow=2)
    assert fresh > old

def test_comp_mult_raises_demand_when_competitor_expensive(model):
    cheap_comp = model.demand_rate("leafy", price=1.4797, freshness=0.8,
                                    comp_price=1.2, dow=2)
    expensive_comp = model.demand_rate("leafy", price=1.4797, freshness=0.8,
                                        comp_price=1.8, dow=2)
    assert expensive_comp > cheap_comp

def test_saturday_demand_higher_than_tuesday(model):
    # Saturday=5, Tuesday=1
    sat = model.demand_rate("leafy", price=1.4797, freshness=0.8,
                             comp_price=1.4797, dow=5)
    tue = model.demand_rate("leafy", price=1.4797, freshness=0.8,
                             comp_price=1.4797, dow=1)
    assert sat > tue

def test_revenue_gain_from_discount_smaller_when_fresh(model):
    # revenue(δ=-30%) / revenue(δ=0) should be smaller at high freshness
    def rev_ratio(f):
        ref_price = 1.4797
        r0 = model.demand_rate("leafy", price=ref_price, freshness=f,
                                comp_price=ref_price, dow=2) * ref_price
        r_disc = model.demand_rate("leafy", price=ref_price * 0.70, freshness=f,
                                    comp_price=ref_price, dow=2) * (ref_price * 0.70)
        return r_disc / r0
    ratio_fresh = rev_ratio(0.9)
    ratio_old = rev_ratio(0.3)
    assert ratio_fresh < ratio_old  # discount less beneficial when fresh
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
pytest tests/test_demand.py -v
```

Expected: ImportError.

- [ ] **Step 3: Implement src/env/demand.py**

```python
import json
import math
import numpy as np
from typing import Literal

Category = Literal["leafy", "root", "fruit", "herbs"]


class CrossDemandModel:
    def __init__(self, params: dict) -> None:
        self._params = params

    @classmethod
    def from_json(cls, path: str) -> "CrossDemandModel":
        with open(path) as f:
            return cls(json.load(f))

    def beta_at_freshness(self, f: float, category: Category) -> float:
        """β(f) = β_old + (β_fresh − β_old) × f
        β_fresh = β_base + spread/2  (less elastic when fresh)
        β_old   = β_base − spread/2  (more elastic when old)
        """
        p = self._params[category]
        beta_base = p["beta"]
        spread = p.get("spread", 1.5)
        beta_fresh = beta_base + spread / 2
        beta_old = beta_base - spread / 2
        f_clip = float(np.clip(f, 0.0, 1.0))
        return beta_old + (beta_fresh - beta_old) * f_clip

    def demand_rate(
        self,
        category: Category,
        price: float,
        freshness: float,
        comp_price: float,
        dow: int,
    ) -> float:
        """Expected demand units/day (deterministic)."""
        p = self._params[category]
        beta = self.beta_at_freshness(freshness, category)
        price_ratio = price / p["ref_price"]
        fresh_mult = 0.4 + 0.6 * float(np.clip(freshness, 0.0, 1.0))
        comp_mult = (comp_price / price) ** p.get("gamma", 0.30) if price > 0 else 1.0
        sin_w = p.get("sin_weekly", 0.0)
        cos_w = p.get("cos_weekly", 0.0)
        season = 1.0 + sin_w * math.sin(2 * math.pi * dow / 7) + cos_w * math.cos(2 * math.pi * dow / 7)
        season = max(0.0, season)
        return p["base_demand"] * (price_ratio ** beta) * fresh_mult * comp_mult * season

    def sample_demand(
        self,
        category: Category,
        price: float,
        freshness: float,
        inv: int,
        comp_price: float,
        dow: int,
        rng: np.random.Generator,
    ) -> int:
        lam = self.demand_rate(category, price, freshness, comp_price, dow)
        return min(int(rng.poisson(lam)), inv)
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
pytest tests/test_demand.py -v
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/env/demand.py tests/test_demand.py
git commit -m "feat: demand model with freshness-dependent elasticity beta(f)"
```

---

## Task 4: MarketEnv

**Files:**
- Create: `src/env/market_env.py`
- Create: `tests/test_market_env.py`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_market_env.py
import numpy as np
import pytest
from src.env.market_env import MarketEnv, OBS_DIM, CATEGORIES

@pytest.fixture
def env():
    return MarketEnv(seed=42)

def test_obs_dim_is_9():
    assert OBS_DIM == 9

def test_reset_returns_correct_shape(env):
    obs = env.reset()
    for cat in CATEGORIES:
        assert obs[cat].shape == (OBS_DIM,)

def test_comp_ratio_in_obs(env):
    obs = env.reset()
    # obs[8] = competitor_ratio, should be in [0.5, 2.0]
    for cat in CATEGORIES:
        assert 0.5 <= obs[cat][8] <= 2.0

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
    # Force a restock day for herbs and inject low-quality delivery
    env._rng = np.random.default_rng(999)  # reseed for determinism
    # We'll call env._attempt_restock directly with a mock
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
        assert obs[cat][7] == pytest.approx(-0.10, abs=1e-4)
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
pytest tests/test_market_env.py -v
```

Expected: ImportError.

- [ ] **Step 3: Implement src/env/market_env.py**

```python
import math
import json
import numpy as np
from src.env.freshness import (
    WASTE_THRESHOLD, RESTOCK_MIN_FRESH, DAILY_DECAY, decay_step, is_waste
)
from src.env.demand import CrossDemandModel

OBS_DIM = 9
CATEGORIES = ["leafy", "root", "fruit", "herbs"]

RESTOCK_EVERY = {"leafy": 4, "root": 7, "fruit": 5, "herbs": 3}
RESTOCK_QTY   = {"leafy": (20, 80), "root": (20, 45), "fruit": (8, 30), "herbs": (10, 40)}
EPISODE_LEN   = 91
OBS_WINDOW    = 21


class MarketEnv:
    def __init__(self, seed: int | None = None) -> None:
        self._demand_model = CrossDemandModel.from_json("data/params/demand_params.json")
        self._base_seed = seed
        self.reset(seed=seed)

    # ------------------------------------------------------------------ #
    # Public API                                                           #
    # ------------------------------------------------------------------ #

    def reset(self, seed: int | None = None) -> dict[str, np.ndarray]:
        s = seed if seed is not None else self._base_seed
        self._rng = np.random.default_rng(s)
        self._t = 0

        params = self._demand_model._params
        self._prices     = {c: params[c]["ref_price"] for c in CATEGORIES}
        self._freshness  = {c: float(self._rng.uniform(0.70, 0.95)) for c in CATEGORIES}
        self._inventory  = {c: int(self._rng.integers(15, 60)) for c in CATEGORIES}
        self._prev_delta = {c: 0.0 for c in CATEGORIES}
        self._demand_yesterday = {c: params[c]["base_demand"] for c in CATEGORIES}

        # synthetic competitor price per episode: Uniform(0.85, 1.15) × ref_price
        self._comp_prices = {
            c: params[c]["ref_price"] * float(self._rng.uniform(0.85, 1.15))
            for c in CATEGORIES
        }

        # obs history buffer: (OBS_WINDOW, OBS_DIM) per category
        self._obs_buffer = {c: np.zeros((OBS_WINDOW, OBS_DIM)) for c in CATEGORIES}
        obs = self._build_obs()
        for c in CATEGORIES:
            self._obs_buffer[c] = np.tile(obs[c], (OBS_WINDOW, 1))
        return obs

    def step(
        self, deltas: dict[str, float]
    ) -> tuple[dict[str, np.ndarray], dict, bool, dict]:
        info: dict = {}
        params = self._demand_model._params
        dow = self._t % 7

        for cat in CATEGORIES:
            p = params[cat]
            ref = p["ref_price"]
            cost_floor = ref * p["cost_ratio"] * 1.05
            price_ceil = ref * 2.0

            # 1. Apply delta
            new_price = self._prices[cat] * (1.0 + deltas[cat])
            self._prices[cat] = float(np.clip(new_price, cost_floor, price_ceil))

            # 2. Sample demand
            sold = self._demand_model.sample_demand(
                cat, self._prices[cat], self._freshness[cat],
                self._inventory[cat], self._comp_prices[cat], dow, self._rng
            )
            self._inventory[cat] = max(0, self._inventory[cat] - sold)
            self._demand_yesterday[cat] = float(sold)

            # 3. Decay freshness
            self._freshness[cat] = decay_step(self._freshness[cat], cat)

            # 4. Waste check (end of day)
            if is_waste(self._freshness[cat], self._inventory[cat]):
                info.setdefault("waste_events", {})[cat] = self._inventory[cat]
                self._inventory[cat] = 0

            # 5. Restock
            if self._t > 0 and self._t % RESTOCK_EVERY[cat] == 0:
                lo, hi = RESTOCK_QTY[cat]
                f_delivery = float(self._rng.uniform(0.60, 1.0))
                self._attempt_restock(cat, f_delivery,
                                      qty=int(self._rng.integers(lo, hi + 1)))

            # 6. Track prev delta
            self._prev_delta[cat] = deltas[cat]

        self._t += 1
        obs = self._build_obs()
        for c in CATEGORIES:
            self._obs_buffer[c] = np.roll(self._obs_buffer[c], -1, axis=0)
            self._obs_buffer[c][-1] = obs[c]

        done = self._t >= EPISODE_LEN
        return obs, info, done, {}

    def obs_window(self, category: str) -> np.ndarray:
        """Return (OBS_WINDOW, OBS_DIM) history for LSTM input."""
        return self._obs_buffer[category].copy()

    # ------------------------------------------------------------------ #
    # Internal helpers                                                     #
    # ------------------------------------------------------------------ #

    def _attempt_restock(self, cat: str, f_delivery: float, qty: int | None = None) -> None:
        if f_delivery < RESTOCK_MIN_FRESH:
            return  # reject batch
        if qty is None:
            lo, hi = RESTOCK_QTY[cat]
            qty = int(self._rng.integers(lo, hi + 1))
        old_inv = self._inventory[cat]
        old_f   = self._freshness[cat]
        if old_inv + qty > 0:
            self._freshness[cat] = (old_inv * old_f + qty * f_delivery) / (old_inv + qty)
        self._inventory[cat] += qty

    def _build_obs(self) -> dict[str, np.ndarray]:
        obs = {}
        params = self._demand_model._params
        for cat in CATEGORIES:
            p = params[cat]
            f   = self._freshness[cat]
            inv = self._inventory[cat]
            dow = self._t % 7
            days_to_next = RESTOCK_EVERY[cat] - (self._t % RESTOCK_EVERY[cat])
            comp_ratio = self._comp_prices[cat] / max(self._prices[cat], 1e-6)

            obs[cat] = np.array([
                f,                                                       # [0] freshness
                min(inv / 100.0, 2.0),                                   # [1] inv_ratio
                self._prices[cat] / p["ref_price"],                      # [2] price_ratio
                math.sin(2 * math.pi * dow / 7),                         # [3] sin_dow
                math.cos(2 * math.pi * dow / 7),                         # [4] cos_dow
                min(days_to_next / 30.0, 1.0),                           # [5] days_to_restock
                float(np.clip(self._demand_yesterday[cat] / p["base_demand"], 0.0, 3.0)),  # [6] demand_ratio
                self._prev_delta[cat],                                   # [7] prev_delta
                float(np.clip(comp_ratio, 0.5, 2.0)),                    # [8] competitor_ratio
            ], dtype=np.float32)
        return obs
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
pytest tests/test_market_env.py -v
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/env/market_env.py tests/test_market_env.py
git commit -m "feat: MarketEnv obs_dim=9, WASTE_THRESHOLD=0.50, restock quality rule"
```

---

## Task 5: Training Data Generation

**Files:**
- Create: `src/forecaster/data.py`
- Create: `tests/test_forecaster_data.py` (small-scale smoke tests)

- [ ] **Step 1: Write failing tests**

```python
# tests/test_forecaster_data.py
import numpy as np
import pytest
from src.forecaster.data import generate_dataset, PerishableForecastDataset

def test_generate_dataset_small():
    records = generate_dataset(n_episodes=3, seed=0)
    assert len(records) > 0
    first = records[0]
    assert "features" in first and "category_idx" in first
    assert "demand_7d" in first and "waste_7d" in first

def test_features_shape():
    records = generate_dataset(n_episodes=3, seed=0)
    first = records[0]
    assert first["features"].shape == (21, 9)  # (OBS_WINDOW, OBS_DIM)

def test_waste_label_is_binary():
    records = generate_dataset(n_episodes=5, seed=0)
    labels = [r["waste_7d"] for r in records]
    assert all(v in (0, 1) for v in labels)

def test_demand_label_non_negative():
    records = generate_dataset(n_episodes=5, seed=0)
    assert all(r["demand_7d"] >= 0 for r in records)

def test_dataset_wraps_records():
    records = generate_dataset(n_episodes=3, seed=0)
    ds = PerishableForecastDataset(records)
    assert len(ds) == len(records)
    sample = ds[0]
    assert set(sample.keys()) >= {"features", "category_idx", "demand_7d", "waste_7d"}
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
pytest tests/test_forecaster_data.py -v
```

Expected: ImportError.

- [ ] **Step 3: Implement src/forecaster/data.py**

```python
import numpy as np
import torch
from torch.utils.data import Dataset
from src.env.market_env import MarketEnv, CATEGORIES, OBS_WINDOW, OBS_DIM
from src.env.freshness import WASTE_THRESHOLD

CATEGORY_IDX = {c: i for i, c in enumerate(CATEGORIES)}


def _random_policy(obs, cat, rng):
    return float(rng.uniform(-0.30, 0.20))

def _markdown_policy(obs, cat, rng):
    return -0.25 if obs[0] < 0.65 else 0.0  # more aggressive with threshold=0.50

def _static_policy(obs, cat, rng):
    return 0.0


def generate_dataset(n_episodes: int = 3000, seed: int = 0) -> list[dict]:
    rng = np.random.default_rng(seed)
    policies = [_random_policy, _markdown_policy, _static_policy]
    records: list[dict] = []

    for ep in range(n_episodes):
        policy_fn = policies[ep % len(policies)]
        env = MarketEnv(seed=int(rng.integers(0, 2**31)))
        env.reset()
        history: dict[str, list] = {c: [] for c in CATEGORIES}

        # Burn-in: fill obs_buffer (OBS_WINDOW days)
        for _ in range(OBS_WINDOW):
            deltas = {c: policy_fn(env._build_obs()[c], c, rng) for c in CATEGORIES}
            env.step(deltas)

        # Collect anchors for remaining episode
        for t in range(OBS_WINDOW, OBS_WINDOW + 91):
            current_obs = {c: env.obs_window(c) for c in CATEGORIES}
            for c in CATEGORIES:
                history[c].append({
                    "t": t,
                    "obs_window": current_obs[c].copy(),
                    "inv": env._inventory[c],
                    "freshness": env._freshness[c],
                })
            deltas = {c: policy_fn(env._build_obs()[c], c, rng) for c in CATEGORIES}
            env.step(deltas)

        # Build 7-day lookahead labels for each anchor
        for c in CATEGORIES:
            hist = history[c]
            n = len(hist)
            for i in range(n - 7):
                demand_7d = sum(
                    max(0, hist[j]["inv"] - hist[j+1]["inv"])
                    for j in range(i, i + 7)
                )
                waste_7d = int(any(
                    hist[j]["freshness"] < WASTE_THRESHOLD and hist[j]["inv"] > 0
                    for j in range(i + 1, i + 8)
                ))
                records.append({
                    "features": hist[i]["obs_window"].astype(np.float32),
                    "category_idx": CATEGORY_IDX[c],
                    "demand_7d": float(demand_7d),
                    "waste_7d": waste_7d,
                })

    return records


class PerishableForecastDataset(Dataset):
    def __init__(self, records: list[dict]) -> None:
        self._records = records

    def __len__(self) -> int:
        return len(self._records)

    def __getitem__(self, idx: int) -> dict:
        r = self._records[idx]
        return {
            "features":     torch.tensor(r["features"], dtype=torch.float32),
            "category_idx": torch.tensor(r["category_idx"], dtype=torch.long),
            "demand_7d":    torch.tensor(r["demand_7d"], dtype=torch.float32),
            "waste_7d":     torch.tensor(r["waste_7d"], dtype=torch.float32),
        }
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
pytest tests/test_forecaster_data.py -v
```

Expected: all 5 tests PASS (may take ~30s for 3 episodes).

- [ ] **Step 5: Commit**

```bash
git add src/forecaster/data.py tests/test_forecaster_data.py
git commit -m "feat: training data generation for LSTM forecaster"
```

---

## Task 6: ForecasterLSTM + Losses

**Files:**
- Create: `src/forecaster/model.py`
- Create: `src/forecaster/losses.py`
- Create: `tests/test_forecaster_model.py`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_forecaster_model.py
import torch
import pytest
from src.forecaster.model import ForecasterLSTM, ForecasterConfig
from src.forecaster.losses import combined_loss, pos_weight_from_rate

def test_forward_output_keys():
    cfg = ForecasterConfig()
    model = ForecasterLSTM(cfg)
    features = torch.randn(4, 21, 9)
    cat_idx  = torch.tensor([0, 1, 2, 3])
    out = model(features, cat_idx)
    assert "demand" in out
    assert "waste_logit" in out

def test_output_shapes():
    cfg = ForecasterConfig()
    model = ForecasterLSTM(cfg)
    B = 8
    features = torch.randn(B, 21, 9)
    cat_idx  = torch.zeros(B, dtype=torch.long)
    out = model(features, cat_idx)
    assert out["demand"].shape == (B,)
    assert out["waste_logit"].shape == (B,)

def test_combined_loss_is_scalar():
    demand_pred = torch.tensor([3.0, 5.0, 2.0])
    demand_true = torch.tensor([3.5, 4.0, 2.5])
    waste_logit = torch.tensor([0.5, -0.5, 1.0])
    waste_true  = torch.tensor([1.0, 0.0, 1.0])
    pw = pos_weight_from_rate(0.11)
    loss = combined_loss(demand_pred, demand_true, waste_logit, waste_true, pw)
    assert loss.shape == ()
    assert loss.item() > 0

def test_pos_weight_from_rate():
    pw = pos_weight_from_rate(0.11)
    assert pw == pytest.approx((1 - 0.11) / 0.11, rel=1e-4)

def test_model_param_count():
    cfg = ForecasterConfig()
    model = ForecasterLSTM(cfg)
    n = sum(p.numel() for p in model.parameters())
    # obs_dim=9 vs 8 adds ~128 params to LSTM, expect ~203k ± 1k
    assert 200_000 < n < 215_000
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
pytest tests/test_forecaster_model.py -v
```

Expected: ImportError.

- [ ] **Step 3: Implement src/forecaster/losses.py**

```python
import torch
import torch.nn.functional as F


def pos_weight_from_rate(positive_rate: float) -> float:
    return (1.0 - positive_rate) / positive_rate


def combined_loss(
    demand_pred: torch.Tensor,
    demand_true: torch.Tensor,
    waste_logit: torch.Tensor,
    waste_true: torch.Tensor,
    pos_weight: float,
    w_demand: float = 1.0,
    w_waste: float = 1.0,
) -> torch.Tensor:
    pw = torch.tensor(pos_weight, dtype=torch.float32)
    l_demand = F.huber_loss(demand_pred, demand_true, delta=1.0)
    l_waste  = F.binary_cross_entropy_with_logits(
        waste_logit, waste_true, pos_weight=pw
    )
    return w_demand * l_demand + w_waste * l_waste
```

- [ ] **Step 4: Implement src/forecaster/model.py**

```python
import torch
import torch.nn as nn
from dataclasses import dataclass


@dataclass
class ForecasterConfig:
    obs_dim:       int   = 9
    window:        int   = 21
    n_categories:  int   = 4
    cat_embed_dim: int   = 8
    lstm_hidden:   int   = 128
    lstm_layers:   int   = 2
    lstm_dropout:  float = 0.2


class ForecasterLSTM(nn.Module):
    def __init__(self, cfg: ForecasterConfig) -> None:
        super().__init__()
        self.cfg = cfg
        self.cat_embed = nn.Embedding(cfg.n_categories, cfg.cat_embed_dim)
        self.lstm = nn.LSTM(
            input_size=cfg.obs_dim,
            hidden_size=cfg.lstm_hidden,
            num_layers=cfg.lstm_layers,
            batch_first=True,
            dropout=cfg.lstm_dropout if cfg.lstm_layers > 1 else 0.0,
        )
        z_dim = cfg.lstm_hidden + cfg.cat_embed_dim
        self.demand_head = nn.Linear(z_dim, 1)
        self.waste_head  = nn.Linear(z_dim, 1)

    def forward(
        self, features: torch.Tensor, category_idx: torch.Tensor
    ) -> dict[str, torch.Tensor]:
        # features: (B, T, obs_dim), category_idx: (B,)
        lstm_out, _ = self.lstm(features)
        last = lstm_out[:, -1, :]                          # (B, lstm_hidden)
        cat_vec = self.cat_embed(category_idx)             # (B, cat_embed_dim)
        z = torch.cat([last, cat_vec], dim=-1)             # (B, z_dim)
        return {
            "demand":     self.demand_head(z).squeeze(-1),
            "waste_logit": self.waste_head(z).squeeze(-1),
        }
```

- [ ] **Step 5: Run tests, verify they pass**

```bash
pytest tests/test_forecaster_model.py -v
```

Expected: all 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/forecaster/model.py src/forecaster/losses.py tests/test_forecaster_model.py
git commit -m "feat: ForecasterLSTM obs_dim=9 and combined loss"
```

---

## Task 7: Training Script + Training Monitor

**Files:**
- Create: `src/forecaster/train.py`

This task runs the actual training. It will take 20–60 minutes for 3000 episodes + 50 epochs.

- [ ] **Step 1: Generate full training dataset (3000 episodes)**

```bash
python - <<'EOF'
import pickle
from src.forecaster.data import generate_dataset
print("Generating 3000 episodes…")
records = generate_dataset(n_episodes=3000, seed=42)
# Stratified split: 70/15/15
import random; random.seed(42)
random.shuffle(records)
n = len(records)
train = records[:int(0.70 * n)]
val   = records[int(0.70 * n):int(0.85 * n)]
test  = records[int(0.85 * n):]
import pandas as pd
pd.DataFrame(train).to_parquet("data/processed/train.parquet")
pd.DataFrame(val).to_parquet("data/processed/val.parquet")
pd.DataFrame(test).to_parquet("data/processed/test.parquet")
print(f"train={len(train)}, val={len(val)}, test={len(test)}")
EOF
```

Expected output: `train=~370k, val=~80k, test=~80k` (exact numbers depend on env stochasticity).

```bash
mkdir -p data/processed
```

- [ ] **Step 2: Implement src/forecaster/train.py**

```python
import json
import math
import time
import pickle
from pathlib import Path
from dataclasses import dataclass, asdict

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import matplotlib.pyplot as plt
from torch.utils.data import DataLoader, random_split

from src.forecaster.model import ForecasterLSTM, ForecasterConfig
from src.forecaster.losses import combined_loss, pos_weight_from_rate
from src.forecaster.data import PerishableForecastDataset


@dataclass
class TrainConfig:
    lr:            float = 3e-4
    weight_decay:  float = 1e-4
    batch_size:    int   = 256
    max_epochs:    int   = 50
    patience:      int   = 5
    grad_clip:     float = 1.0
    checkpoint_dir: str  = "checkpoints"
    device:        str   = "cpu"


def _load_dataset(path: str) -> PerishableForecastDataset:
    df = pd.read_parquet(path)
    records = df.to_dict("records")
    for r in records:
        r["features"] = np.array(r["features"], dtype=np.float32)
    return PerishableForecastDataset(records)


def train(model_cfg: ForecasterConfig | None = None,
          train_cfg: TrainConfig | None = None) -> str:
    if model_cfg is None: model_cfg = ForecasterConfig()
    if train_cfg is None: train_cfg = TrainConfig()

    device = torch.device(train_cfg.device)
    Path(train_cfg.checkpoint_dir).mkdir(exist_ok=True)
    Path(f"{train_cfg.checkpoint_dir}/plots").mkdir(exist_ok=True)

    train_ds = _load_dataset("data/processed/train.parquet")
    val_ds   = _load_dataset("data/processed/val.parquet")

    # Compute pos_weight from training set
    waste_rate = sum(r["waste_7d"] for r in train_ds._records) / len(train_ds)
    pos_weight = pos_weight_from_rate(max(waste_rate, 0.01))
    print(f"waste_rate={waste_rate:.4f}, pos_weight={pos_weight:.2f}")

    train_loader = DataLoader(train_ds, batch_size=train_cfg.batch_size,
                               shuffle=True, num_workers=0)
    val_loader   = DataLoader(val_ds, batch_size=train_cfg.batch_size,
                               shuffle=False, num_workers=0)

    model = ForecasterLSTM(model_cfg).to(device)
    optimizer = torch.optim.Adam(model.parameters(),
                                  lr=train_cfg.lr,
                                  weight_decay=train_cfg.weight_decay)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer, T_max=train_cfg.max_epochs
    )

    best_val_loss = float("inf")
    patience_count = 0
    best_epoch = 0
    history = {"train_loss": [], "val_loss": [], "val_demand_loss": [], "val_waste_loss": []}

    for epoch in range(1, train_cfg.max_epochs + 1):
        # --- Train ---
        model.train()
        train_loss = 0.0
        for batch in train_loader:
            feat = batch["features"].to(device)
            cidx = batch["category_idx"].to(device)
            d_true = batch["demand_7d"].to(device)
            w_true = batch["waste_7d"].to(device)
            out = model(feat, cidx)
            loss = combined_loss(out["demand"], d_true, out["waste_logit"], w_true, pos_weight)
            optimizer.zero_grad()
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), train_cfg.grad_clip)
            optimizer.step()
            train_loss += loss.item() * len(feat)
        train_loss /= len(train_ds)

        # --- Validate ---
        model.eval()
        val_loss = val_d_loss = val_w_loss = 0.0
        with torch.no_grad():
            for batch in val_loader:
                feat = batch["features"].to(device)
                cidx = batch["category_idx"].to(device)
                d_true = batch["demand_7d"].to(device)
                w_true = batch["waste_7d"].to(device)
                out = model(feat, cidx)
                loss = combined_loss(out["demand"], d_true, out["waste_logit"], w_true, pos_weight)
                val_loss += loss.item() * len(feat)
        val_loss /= len(val_ds)

        scheduler.step()
        history["train_loss"].append(train_loss)
        history["val_loss"].append(val_loss)
        print(f"Epoch {epoch:02d}/{train_cfg.max_epochs} | "
              f"train={train_loss:.4f} | val={val_loss:.4f}")

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_epoch = epoch
            patience_count = 0
            ckpt_path = f"{train_cfg.checkpoint_dir}/forecaster_v4_best.pt"
            torch.save({"model_state": model.state_dict(),
                        "model_cfg": asdict(model_cfg),
                        "epoch": epoch,
                        "val_loss": val_loss}, ckpt_path)
        else:
            patience_count += 1
            if patience_count >= train_cfg.patience:
                print(f"Early stop at epoch {epoch}, best={best_epoch}")
                break

    # --- Save loss plot ---
    fig, ax = plt.subplots()
    ax.plot(history["train_loss"], label="train")
    ax.plot(history["val_loss"],   label="val")
    ax.set_xlabel("epoch"); ax.set_ylabel("loss"); ax.legend()
    ax.set_title("Forecaster Training Loss")
    plot_path = f"{train_cfg.checkpoint_dir}/plots/training_loss.png"
    fig.savefig(plot_path, dpi=120)
    plt.close(fig)
    print(f"Loss plot saved to {plot_path}")

    return ckpt_path


if __name__ == "__main__":
    train()
```

- [ ] **Step 3: Run training**

```bash
python -m src.forecaster.train
```

Expected: loss decreases over epochs, early stop within 50 epochs, `checkpoints/forecaster_v4_best.pt` created, `checkpoints/plots/training_loss.png` saved.

Review the loss plot: `open checkpoints/plots/training_loss.png`

- [ ] **Step 4: Commit**

```bash
git add src/forecaster/train.py data/processed/
git commit -m "feat: training script with loss monitor and early stopping"
```

---

## Task 8: Forecaster Evaluation + Isotonic Calibration

**Files:**
- Create: `src/forecaster/eval.py`
- Create: `tests/test_forecaster_eval.py` (smoke test only — real metrics come from running eval on test set)

- [ ] **Step 1: Write failing test**

```python
# tests/test_forecaster_eval.py
import torch
import numpy as np
import pytest
from src.forecaster.model import ForecasterLSTM, ForecasterConfig
from src.forecaster.eval import (
    compute_waste_auroc, compute_demand_mae, fit_isotonic
)

def test_auroc_perfect():
    logits = np.array([2.0, -2.0, 2.0, -2.0])
    labels = np.array([1, 0, 1, 0])
    assert compute_waste_auroc(logits, labels) == pytest.approx(1.0)

def test_auroc_random():
    rng = np.random.default_rng(0)
    logits = rng.standard_normal(100)
    labels = rng.integers(0, 2, 100)
    auroc = compute_waste_auroc(logits, labels)
    assert 0.0 <= auroc <= 1.0

def test_demand_mae():
    preds = np.array([3.0, 5.0, 2.0])
    trues = np.array([3.5, 4.0, 2.5])
    mae = compute_demand_mae(preds, trues)
    assert mae == pytest.approx((0.5 + 1.0 + 0.5) / 3)

def test_isotonic_fit_monotone():
    logits = np.linspace(-3, 3, 50)
    labels = (logits > 0).astype(float)
    iso = fit_isotonic(logits, labels)
    probs = iso.predict(logits)
    # Isotonic output must be non-decreasing
    assert all(probs[i] <= probs[i+1] + 1e-9 for i in range(len(probs)-1))
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
pytest tests/test_forecaster_eval.py -v
```

Expected: ImportError.

- [ ] **Step 3: Implement src/forecaster/eval.py**

```python
import numpy as np
import torch
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import roc_auc_score
from src.forecaster.model import ForecasterLSTM, ForecasterConfig
from src.forecaster.data import PerishableForecastDataset
from torch.utils.data import DataLoader
import pandas as pd


def compute_waste_auroc(logits: np.ndarray, labels: np.ndarray) -> float:
    if labels.sum() == 0 or labels.sum() == len(labels):
        return float("nan")
    return float(roc_auc_score(labels, logits))


def compute_demand_mae(preds: np.ndarray, trues: np.ndarray) -> float:
    return float(np.mean(np.abs(preds - trues)))


def fit_isotonic(logits: np.ndarray, labels: np.ndarray) -> IsotonicRegression:
    iso = IsotonicRegression(out_of_bounds="clip")
    iso.fit(logits, labels)
    return iso


def evaluate_checkpoint(
    ckpt_path: str,
    test_parquet: str = "data/processed/test.parquet",
    device: str = "cpu",
) -> dict:
    import torch
    from dataclasses import fields
    ckpt = torch.load(ckpt_path, map_location=device)
    cfg = ForecasterConfig(**ckpt["model_cfg"])
    model = ForecasterLSTM(cfg).to(device)
    model.load_state_dict(ckpt["model_state"])
    model.eval()

    df = pd.read_parquet(test_parquet)
    records = df.to_dict("records")
    for r in records:
        r["features"] = np.array(r["features"], dtype=np.float32)
    ds = PerishableForecastDataset(records)
    loader = DataLoader(ds, batch_size=512, shuffle=False)

    all_demand_pred, all_demand_true = [], []
    all_waste_logit, all_waste_true  = [], []
    all_cat_idx = []

    with torch.no_grad():
        for batch in loader:
            out = model(batch["features"].to(device), batch["category_idx"].to(device))
            all_demand_pred.append(out["demand"].cpu().numpy())
            all_demand_true.append(batch["demand_7d"].numpy())
            all_waste_logit.append(out["waste_logit"].cpu().numpy())
            all_waste_true.append(batch["waste_7d"].numpy())
            all_cat_idx.append(batch["category_idx"].numpy())

    d_pred = np.concatenate(all_demand_pred)
    d_true = np.concatenate(all_demand_true)
    w_logit = np.concatenate(all_waste_logit)
    w_true  = np.concatenate(all_waste_true)
    cat_idx = np.concatenate(all_cat_idx)

    # Isotonic calibration
    iso = fit_isotonic(w_logit, w_true)

    results = {
        "demand_mae_day": compute_demand_mae(d_pred / 7, d_true / 7),
        "waste_auroc": compute_waste_auroc(w_logit, w_true),
        "isotonic": iso,
        "per_category": {},
    }

    cat_names = ["leafy", "root", "fruit", "herbs"]
    for i, name in enumerate(cat_names):
        mask = cat_idx == i
        if mask.sum() == 0:
            continue
        results["per_category"][name] = {
            "demand_mae_day": compute_demand_mae(d_pred[mask] / 7, d_true[mask] / 7),
            "waste_auroc": compute_waste_auroc(w_logit[mask], w_true[mask]),
            "waste_rate": float(w_true[mask].mean()),
        }

    return results, iso


def print_eval_report(results: dict) -> None:
    print(f"\n=== Forecaster Eval Report ===")
    print(f"Demand MAE/day : {results['demand_mae_day']:.4f}  (threshold: < 3.0)")
    print(f"Waste AUROC    : {results['waste_auroc']:.4f}  (threshold: > 0.85)")
    print("\nPer-category:")
    for cat, m in results["per_category"].items():
        auroc_str = f"{m['waste_auroc']:.4f}" if not np.isnan(m['waste_auroc']) else "N/A"
        print(f"  {cat:8s} | MAE/day={m['demand_mae_day']:.4f} | "
              f"AUROC={auroc_str} | waste_rate={m['waste_rate']:.4f}")
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
pytest tests/test_forecaster_eval.py -v
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Evaluate the trained checkpoint**

```bash
python - <<'EOF'
from src.forecaster.eval import evaluate_checkpoint, print_eval_report
import torch
results, iso = evaluate_checkpoint("checkpoints/forecaster_v4_best.pt")
print_eval_report(results)
# Save isotonic calibrator into checkpoint
ckpt = torch.load("checkpoints/forecaster_v4_best.pt")
import pickle
ckpt["isotonic"] = iso
torch.save(ckpt, "checkpoints/forecaster_v4_best.pt")
print("\nIsotonic calibrator saved into checkpoint.")
EOF
```

Expected output:
```
Demand MAE/day : X.XXXX  (threshold: < 3.0)
Waste AUROC    : 0.XXXX  (threshold: > 0.85)
```

If AUROC < 0.85 or MAE/day > 3.0, re-run training with `max_epochs=100` in TrainConfig before proceeding.

- [ ] **Step 6: Commit**

```bash
git add src/forecaster/eval.py tests/test_forecaster_eval.py checkpoints/
git commit -m "feat: forecaster evaluation, isotonic calibration, metrics report"
```

---

## Task 9: MPC Controller (Tier A)

**Files:**
- Create: `src/mpc/controller.py`
- Create: `tests/test_mpc.py`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_mpc.py
import numpy as np
import pytest
from src.mpc.controller import MPC, MPCConfig
from src.env.market_env import OBS_DIM, OBS_WINDOW

def _make_obs_window(freshness: float, inv_ratio: float, prev_delta: float = 0.0) -> np.ndarray:
    """Construct a (21, 9) obs window with constant state."""
    row = np.zeros(OBS_DIM, dtype=np.float32)
    row[0] = freshness    # freshness
    row[1] = inv_ratio    # inv_ratio
    row[2] = 1.0          # price_ratio
    row[7] = prev_delta   # prev_delta
    row[8] = 1.0          # competitor_ratio (parity)
    return np.tile(row, (OBS_WINDOW, 1))

@pytest.fixture
def mpc():
    return MPC(MPCConfig())

def test_high_freshness_does_not_max_discount(mpc):
    """At f=0.9 with moderate inventory, delta should be > -0.30."""
    obs = _make_obs_window(freshness=0.90, inv_ratio=0.5)
    result = mpc.decide(obs, category="leafy", current_price=1.48,
                         current_inv=50, current_freshness=0.90, prev_delta=0.0)
    assert result["delta"] > -0.30, f"Expected non-max-discount at f=0.9, got {result['delta']}"

def test_low_freshness_high_inv_discounts(mpc):
    """At f=0.35 with high inventory, delta should be negative."""
    obs = _make_obs_window(freshness=0.35, inv_ratio=1.5)
    result = mpc.decide(obs, category="leafy", current_price=1.48,
                         current_inv=150, current_freshness=0.35, prev_delta=0.0)
    assert result["delta"] < 0.0, f"Expected discount at f=0.35 high inv, got {result['delta']}"

def test_clearability_override_fires(mpc):
    """When t_critical < clearability_horizon and can't clear, force -0.30 for root."""
    # root is inelastic (β≈-0.46); clearability override should fire
    obs = _make_obs_window(freshness=0.52, inv_ratio=2.0)
    result = mpc.decide(obs, category="root", current_price=1.06,
                         current_inv=200, current_freshness=0.52, prev_delta=0.0)
    # With f=0.52 just above threshold and 200 units, can't clear before waste
    assert result["delta"] == pytest.approx(-0.30, abs=0.01)

def test_result_has_required_keys(mpc):
    obs = _make_obs_window(freshness=0.8, inv_ratio=0.5)
    result = mpc.decide(obs, "leafy", 1.48, 50, 0.8, 0.0)
    for key in ("delta", "scores", "d_hat_0", "p_waste_0", "reason"):
        assert key in result, f"Missing key: {key}"

def test_delta_within_bounds(mpc):
    obs = _make_obs_window(freshness=0.7, inv_ratio=0.8)
    result = mpc.decide(obs, "herbs", 4.54, 30, 0.7, 0.0)
    assert -0.30 <= result["delta"] <= 0.20
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
pytest tests/test_mpc.py -v
```

Expected: ImportError.

- [ ] **Step 3: Implement src/mpc/controller.py**

```python
import math
import pickle
import numpy as np
import torch
from dataclasses import dataclass, field
from src.env.freshness import WASTE_THRESHOLD, DAILY_DECAY
from src.env.demand import CrossDemandModel
from src.forecaster.model import ForecasterLSTM, ForecasterConfig

CANDIDATES = np.linspace(-0.30, 0.20, 11)   # 11 candidates
ZERO_IDX   = 6                               # index of δ=0

@dataclass
class MPCConfig:
    lambda_waste:          float = 10.0
    lambda_move:           float = 3.0
    floor_ratio:           float = 0.85
    horizon:               int   = 7
    clearability_horizon:  int   = 6         # reduced from 12 (shorter shelf life)
    tier_b_gamma:          float = 0.0       # 0 = Tier A; >0 = Tier B quality premium


class MPC:
    def __init__(self, cfg: MPCConfig, ckpt_path: str | None = None) -> None:
        self.cfg = cfg
        self.demand_model = CrossDemandModel.from_json("data/params/demand_params.json")
        self._model: ForecasterLSTM | None = None
        self._iso = None
        if ckpt_path:
            self._load_forecaster(ckpt_path)

    def _load_forecaster(self, path: str) -> None:
        ckpt = torch.load(path, map_location="cpu")
        model_cfg = ForecasterConfig(**ckpt["model_cfg"])
        self._model = ForecasterLSTM(model_cfg)
        self._model.load_state_dict(ckpt["model_state"])
        self._model.eval()
        self._iso = ckpt.get("isotonic")

    def _forecast(self, obs_window: np.ndarray, category: str) -> tuple[float, float]:
        """Returns (d_hat_0, p_waste_0) at δ=0."""
        if self._model is None:
            raise RuntimeError("No forecaster loaded. Call MPC(cfg, ckpt_path=...)")
        cat_idx = {"leafy": 0, "root": 1, "fruit": 2, "herbs": 3}[category]
        feat = torch.tensor(obs_window, dtype=torch.float32).unsqueeze(0)
        cidx = torch.tensor([cat_idx], dtype=torch.long)
        with torch.no_grad():
            out = self._model(feat, cidx)
        d_hat = float(out["demand"].item())
        logit = float(out["waste_logit"].item())
        p_waste = float(self._iso.predict([logit])[0]) if self._iso else float(torch.sigmoid(torch.tensor(logit)).item())
        return max(0.0, d_hat), float(np.clip(p_waste, 0.0, 1.0))

    def decide(
        self,
        obs_window: np.ndarray,
        category: str,
        current_price: float,
        current_inv: int,
        current_freshness: float,
        prev_delta: float,
    ) -> dict:
        p = self.demand_model._params[category]
        beta_f = self.demand_model.beta_at_freshness(current_freshness, category)
        ref_price = p["ref_price"]
        cost_floor = ref_price * p["cost_ratio"] * 1.05
        price_ceil = ref_price * 2.0

        # Get LSTM forecast at δ=0
        if self._model is not None:
            d_hat_0, p_waste_0 = self._forecast(obs_window, category)
        else:
            # Fallback: simple demand estimate (used in unit tests without LSTM)
            d_hat_0 = float(p["base_demand"] * self.cfg.horizon)
            p_waste_0 = 0.1 if current_freshness < 0.65 else 0.02

        # t_critical: days until freshness hits WASTE_THRESHOLD
        c = self._estimate_decay(obs_window, category)
        if current_freshness <= WASTE_THRESHOLD:
            t_critical = 0.0
        elif c >= 1.0:
            t_critical = float(self.cfg.horizon + 1)
        else:
            t_critical = math.log(WASTE_THRESHOLD / current_freshness) / math.log(c)

        # Clearability override (before scoring) — only for inelastic (β > -1)
        beta_base = p["beta"]
        if (self.cfg.clearability_horizon > 0
                and current_freshness > WASTE_THRESHOLD
                and beta_base > -1.0
                and 0 < t_critical < self.cfg.clearability_horizon):
            lo_ratio = 1.0 + CANDIDATES[0]
            max_md_rate = (d_hat_0 / self.cfg.horizon) * (lo_ratio ** beta_f)
            clearable = max_md_rate * t_critical
            if clearable < 0.80 * current_inv:
                return {
                    "delta": CANDIDATES[0],
                    "reason": f"clearability_override: t_crit={t_critical:.1f}d < {self.cfg.clearability_horizon}d, clearable={clearable:.0f} < 0.80×{current_inv}",
                    "scores": [],
                    "d_hat_0": d_hat_0,
                    "p_waste_0": p_waste_0,
                }

        # Score all 11 candidates
        scores = self._score_all(
            CANDIDATES, current_price, d_hat_0, p_waste_0, t_critical,
            current_inv, prev_delta, ref_price, cost_floor, price_ceil,
            beta_f, current_freshness
        )

        # Revenue floor constraint
        rev_0 = scores["revenues"][ZERO_IDX]
        feasible = scores["revenues"] >= self.cfg.floor_ratio * rev_0
        if not feasible.any():
            best_idx = int(np.argmax(scores["revenues"]))
        else:
            masked_scores = np.where(feasible, scores["total_scores"], np.inf)
            best_idx = int(np.argmin(masked_scores))

        chosen_delta = float(CANDIDATES[best_idx])
        return {
            "delta":     chosen_delta,
            "reason":    f"MPC: δ={chosen_delta:+.2f}, score={scores['total_scores'][best_idx]:.3f}",
            "scores":    scores["total_scores"].tolist(),
            "d_hat_0":   d_hat_0,
            "p_waste_0": p_waste_0,
            "t_critical": t_critical,
        }

    def _score_all(
        self, candidates, current_price, d_hat_0, p_waste_0,
        t_critical, current_inv, prev_delta, ref_price,
        cost_floor, price_ceil, beta_f, freshness
    ) -> dict:
        new_prices = np.clip(
            current_price * (1.0 + candidates), cost_floor, price_ceil
        )
        price_ratios = new_prices / current_price
        demand_hat   = d_hat_0 * (price_ratios ** beta_f)
        revenues     = new_prices * demand_hat

        # Waste probability per candidate
        h = self.cfg.horizon
        if t_critical >= h:
            p_wastes = np.full(len(candidates), p_waste_0)
        else:
            t_eff = max(t_critical, 0.0)
            demand_by_crit = demand_hat * (t_eff / h)
            inv_at_crit    = np.maximum(0.0, current_inv - demand_by_crit)
            survival_frac  = np.clip(inv_at_crit / max(current_inv, 1), 0.0, 1.0)
            p_wastes = p_waste_0 * survival_frac

        move_penalties = self.cfg.lambda_move * np.abs(candidates - prev_delta)

        # Tier B: quality premium multiplier
        if self.cfg.tier_b_gamma > 0:
            quality_mult = 1.0 + self.cfg.tier_b_gamma * freshness * np.maximum(0.0, candidates)
            revenues_adj = revenues * quality_mult
        else:
            revenues_adj = revenues

        total_scores = self.cfg.lambda_waste * p_wastes - revenues_adj + move_penalties
        return {"revenues": revenues, "total_scores": total_scores, "p_wastes": p_wastes}

    def _estimate_decay(self, obs_window: np.ndarray, category: str) -> float:
        """Estimate daily decay rate from trailing freshness in obs_window."""
        f_series = obs_window[:, 0]
        n = len(f_series)
        # Find trailing run where freshness is strictly decreasing
        run_len = 0
        for i in range(n - 1, 0, -1):
            if f_series[i] < f_series[i - 1]:
                run_len += 1
            else:
                break
        if run_len < 3:
            return DAILY_DECAY[category]
        f_end   = f_series[-1]
        f_start = f_series[-(run_len + 1)]
        if f_start <= 0.01 or f_end >= f_start:
            return DAILY_DECAY[category]
        c_est = (f_end / f_start) ** (1.0 / run_len)
        c_est = float(np.clip(c_est, 0.50, 0.999))
        return 0.5 * DAILY_DECAY[category] + 0.5 * c_est
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
pytest tests/test_mpc.py -v
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/mpc/controller.py tests/test_mpc.py
git commit -m "feat: MPC Tier A with beta(f) and clearability_horizon=6"
```

---

## Task 10: Spread Sensitivity Analysis

**⚠️ USER CHECKPOINT — You review heatmaps and confirm spread before full training.**

**Files:**
- Create: `src/monitoring/heatmap.py`
- Create: script `scripts/sensitivity_spread.py`

- [ ] **Step 1: Implement src/monitoring/heatmap.py**

```python
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
from src.env.market_env import CATEGORIES, OBS_DIM, OBS_WINDOW
from src.mpc.controller import MPC, MPCConfig

FRESHNESS_LEVELS = np.linspace(0.55, 0.95, 9)
INV_RATIO_LEVELS = np.array([0.2, 0.5, 1.0, 1.5, 2.0])
CANDIDATES       = np.linspace(-0.30, 0.20, 11)


def _make_obs(f: float, inv: float, price_ratio: float = 1.0) -> np.ndarray:
    row = np.zeros(OBS_DIM, dtype=np.float32)
    row[0] = f; row[1] = inv; row[2] = price_ratio; row[8] = 1.0
    return np.tile(row, (OBS_WINDOW, 1))


def generate_policy_heatmap(
    mpc: MPC,
    category: str,
    title: str = "",
    ax: plt.Axes | None = None,
) -> plt.Axes:
    """Heatmap of recommended δ across freshness × inv_ratio grid."""
    params = mpc.demand_model._params[category]
    ref_price = params["ref_price"]
    grid = np.zeros((len(INV_RATIO_LEVELS), len(FRESHNESS_LEVELS)))

    for i, inv in enumerate(INV_RATIO_LEVELS):
        for j, f in enumerate(FRESHNESS_LEVELS):
            obs = _make_obs(f, inv)
            current_inv = int(inv * 100)
            result = mpc.decide(obs, category, ref_price, current_inv, f, 0.0)
            grid[i, j] = result["delta"]

    if ax is None:
        _, ax = plt.subplots()

    cmap = plt.cm.RdYlGn
    norm = mcolors.Normalize(vmin=-0.30, vmax=0.20)
    im = ax.imshow(grid, aspect="auto", cmap=cmap, norm=norm,
                   origin="lower", extent=[0, len(FRESHNESS_LEVELS), 0, len(INV_RATIO_LEVELS)])
    ax.set_xticks(np.arange(len(FRESHNESS_LEVELS)) + 0.5)
    ax.set_xticklabels([f"{f:.2f}" for f in FRESHNESS_LEVELS], rotation=45)
    ax.set_yticks(np.arange(len(INV_RATIO_LEVELS)) + 0.5)
    ax.set_yticklabels([f"{v:.1f}" for v in INV_RATIO_LEVELS])
    ax.set_xlabel("Freshness")
    ax.set_ylabel("Inventory Ratio")
    ax.set_title(title or category)
    plt.colorbar(im, ax=ax, label="δ recommended")
    return ax


def save_four_category_heatmap(mpc: MPC, path: str, suptitle: str = "") -> None:
    fig, axes = plt.subplots(2, 2, figsize=(12, 8))
    for ax, cat in zip(axes.flat, CATEGORIES):
        generate_policy_heatmap(mpc, cat, title=cat, ax=ax)
    if suptitle:
        fig.suptitle(suptitle)
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)
    print(f"Heatmap saved: {path}")
```

- [ ] **Step 2: Create scripts/sensitivity_spread.py**

```bash
mkdir -p scripts
```

```python
# scripts/sensitivity_spread.py
"""Sweep spread parameter and save policy heatmaps for user review."""
import json
from pathlib import Path
from src.mpc.controller import MPC, MPCConfig
from src.monitoring.heatmap import save_four_category_heatmap

SPREADS = [0.5, 1.0, 1.5, 2.0]
Path("checkpoints/plots/sensitivity").mkdir(parents=True, exist_ok=True)

for spread in SPREADS:
    # Temporarily patch demand_params with new spread
    with open("data/params/demand_params.json") as f:
        params = json.load(f)
    for cat in params:
        params[cat]["spread"] = spread
    with open("data/params/demand_params_tmp.json", "w") as f:
        json.dump(params, f, indent=2)

    # Build MPC without LSTM (uses fallback demand estimate — sufficient for spread sensitivity)
    mpc = MPC(MPCConfig())
    mpc.demand_model._params = params

    path = f"checkpoints/plots/sensitivity/heatmap_spread_{spread}.png"
    save_four_category_heatmap(mpc, path, suptitle=f"Spread = {spread}")

print("\nHeatmaps saved to checkpoints/plots/sensitivity/")
print("Review each heatmap and confirm which spread creates dynamic policy.")
print("Criterion: f=0.9 column and f=0.3 column should show different colors for ≥3/4 categories.")
```

- [ ] **Step 3: Run sensitivity sweep**

```bash
python scripts/sensitivity_spread.py
open checkpoints/plots/sensitivity/
```

- [ ] **Step 4: ⚠️ USER REVIEWS HEATMAPS**

Open all 4 heatmaps (`heatmap_spread_0.5.png`, `heatmap_spread_1.0.png`, `heatmap_spread_1.5.png`, `heatmap_spread_2.0.png`).

**What to look for:** In a dynamic policy, the left columns (f≈0.55) should be red/orange (discount) and right columns (f≈0.95) should be yellow/green (hold/premium). A flat policy has all one color.

**Decision:** Pick the smallest spread that shows clear color variation across freshness axis for ≥3/4 categories. Update `demand_params.json` with chosen spread before proceeding.

```bash
# Example: if spread=1.5 looks good:
python - <<'EOF'
import json
with open("data/params/demand_params.json") as f:
    params = json.load(f)
for cat in params:
    params[cat]["spread"] = 1.5   # <- change this to user's chosen value
with open("data/params/demand_params.json", "w") as f:
    json.dump(params, f, indent=2)
print("demand_params.json updated with spread =", 1.5)
EOF
```

- [ ] **Step 5: Commit**

```bash
git add src/monitoring/heatmap.py scripts/ data/params/demand_params.json
git commit -m "feat: spread sensitivity analysis heatmaps, spread confirmed by user"
```

---

## Task 11: Decision Explainer + Data Logging

**Files:**
- Create: `src/monitoring/explainer.py`
- Create: `logs/decisions/.gitkeep`
- Create: `tests/test_monitoring.py`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_monitoring.py
import pytest
from src.monitoring.explainer import DecisionExplainer, FreshnessZone

def test_freshness_zone_critical():
    assert DecisionExplainer.freshness_zone(0.52) == FreshnessZone.CRITICAL

def test_freshness_zone_caution():
    assert DecisionExplainer.freshness_zone(0.62) == FreshnessZone.CAUTION

def test_freshness_zone_healthy():
    assert DecisionExplainer.freshness_zone(0.80) == FreshnessZone.HEALTHY

def test_explain_output_keys():
    result = {
        "delta": -0.10, "d_hat_0": 28.0, "p_waste_0": 0.34,
        "t_critical": 2.5, "scores": []
    }
    exp = DecisionExplainer.explain(
        category="leafy", mpc_result=result,
        current_freshness=0.72, current_inv=45,
        current_price=1.48, comp_price=1.60,
        revenue_at_recommended=48.2, revenue_at_hold=41.1,
    )
    for key in ("category", "recommended_delta", "reason", "freshness_zone",
                "competitor_position", "waste_probability",
                "revenue_at_recommended", "revenue_at_hold"):
        assert key in exp

def test_competitor_position_cheaper():
    result = {"delta": 0.0, "d_hat_0": 10.0, "p_waste_0": 0.1,
              "t_critical": 5.0, "scores": []}
    exp = DecisionExplainer.explain("leafy", result, 0.8, 20, 1.48, 1.20, 40.0, 38.0)
    assert exp["competitor_position"] == "our_price_higher"
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
pytest tests/test_monitoring.py -v
```

Expected: ImportError.

- [ ] **Step 3: Implement src/monitoring/explainer.py**

```python
import json
import enum
from pathlib import Path
from datetime import datetime


class FreshnessZone(str, enum.Enum):
    CRITICAL = "critical"   # f < 0.55: < 1 day to waste
    CAUTION  = "caution"    # 0.55 ≤ f < 0.70
    HEALTHY  = "healthy"    # f ≥ 0.70


class DecisionExplainer:
    @staticmethod
    def freshness_zone(f: float) -> FreshnessZone:
        if f < 0.55:
            return FreshnessZone.CRITICAL
        if f < 0.70:
            return FreshnessZone.CAUTION
        return FreshnessZone.HEALTHY

    @staticmethod
    def explain(
        category: str,
        mpc_result: dict,
        current_freshness: float,
        current_inv: int,
        current_price: float,
        comp_price: float,
        revenue_at_recommended: float,
        revenue_at_hold: float,
    ) -> dict:
        delta     = mpc_result["delta"]
        d_hat_0   = mpc_result.get("d_hat_0", 0.0)
        p_waste   = mpc_result.get("p_waste_0", 0.0)
        t_crit    = mpc_result.get("t_critical", 99.0)

        zone = DecisionExplainer.freshness_zone(current_freshness)

        if comp_price > current_price * 1.05:
            comp_pos = "competitor_more_expensive"
        elif comp_price < current_price * 0.95:
            comp_pos = "our_price_higher"
        else:
            comp_pos = "price_parity"

        if delta < -0.15:
            action = "discount aggressively"
        elif delta < 0.0:
            action = "discount slightly"
        elif delta == 0.0:
            action = "hold price"
        else:
            action = "raise price"

        reason = (
            f"{action} — freshness {current_freshness:.2f} ({zone.value}), "
            f"~{t_crit:.1f}d to waste threshold, "
            f"inventory {current_inv} units, "
            f"demand forecast {d_hat_0:.0f} units/7d, "
            f"waste probability {p_waste:.0%}"
        )

        return {
            "category":               category,
            "recommended_delta":      round(delta, 4),
            "reason":                 reason,
            "freshness_zone":         zone.value,
            "competitor_position":    comp_pos,
            "waste_probability":      round(p_waste, 4),
            "revenue_at_recommended": round(revenue_at_recommended, 2),
            "revenue_at_hold":        round(revenue_at_hold, 2),
        }

    @staticmethod
    def log_decision(
        explanation: dict,
        obs_vector: list[float],
        applied_delta: float,
        seller_override: bool,
        log_dir: str = "logs/decisions",
    ) -> None:
        Path(log_dir).mkdir(parents=True, exist_ok=True)
        date_str = datetime.now().strftime("%Y-%m-%d")
        path = Path(log_dir) / f"{date_str}.jsonl"
        record = {
            "timestamp":       datetime.now().isoformat(),
            "category":        explanation["category"],
            "obs_vector":      obs_vector,
            "recommended_delta": explanation["recommended_delta"],
            "applied_delta":   applied_delta,
            "seller_override": seller_override,
            "outcome":         None,  # filled in by app after next-day observation
        }
        with open(path, "a") as f:
            f.write(json.dumps(record) + "\n")
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
pytest tests/test_monitoring.py -v
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
touch logs/decisions/.gitkeep
git add src/monitoring/explainer.py tests/test_monitoring.py logs/
git commit -m "feat: decision explainer and data logging for Phase 1->2"
```

---

## Task 12: Full Evaluation (N=200) + Policy Dynamism Check

**⚠️ USER CHECKPOINT — Review waste/revenue numbers and policy heatmap. Decide: Tier A done, or proceed to Tier B.**

**Files:**
- Create: `src/eval/metrics.py`
- Create: `src/eval/compare.py`
- Create: `src/pipeline.py`

- [ ] **Step 1: Implement src/eval/metrics.py**

```python
import numpy as np
from dataclasses import dataclass
from scipy import stats


@dataclass
class SystemResult:
    name: str
    waste_rates: np.ndarray   # shape (N,) — one per episode
    revenues: np.ndarray      # shape (N,)

    @property
    def waste_mean(self): return float(self._np().mean())
    @property
    def waste_sem(self): return float(self._np().std(ddof=1) / np.sqrt(len(self._np())))
    def _np(self): return self.waste_rates


def paired_ttest_waste(ref: SystemResult, other: SystemResult) -> tuple[float, float]:
    diffs = other.waste_rates - ref.waste_rates
    t, p = stats.ttest_rel(ref.waste_rates, other.waste_rates)
    return float(t), float(p)


def mean_diff_ci_95(ref: SystemResult, other: SystemResult) -> tuple[float, float, float]:
    diffs = other.waste_rates - ref.waste_rates
    mean = float(diffs.mean())
    sem  = float(diffs.std(ddof=1) / np.sqrt(len(diffs)))
    return mean, mean - 1.96 * sem, mean + 1.96 * sem
```

- [ ] **Step 2: Implement src/pipeline.py**

```python
import numpy as np
from src.env.market_env import MarketEnv, CATEGORIES


def run_episode(policy_fn, seed: int) -> dict:
    """Run one episode with policy_fn(obs_window, category, env) -> delta.
    Returns: {waste_event_rate, total_revenue, per_cat_waste, per_cat_revenue}
    """
    env = MarketEnv(seed=seed)
    env.reset()
    waste_events = {c: 0 for c in CATEGORIES}
    revenues     = {c: 0.0 for c in CATEGORIES}

    done = False
    while not done:
        deltas = {}
        for cat in CATEGORIES:
            obs_w = env.obs_window(cat)
            deltas[cat] = policy_fn(obs_w, cat, env)
        obs, info, done, _ = env.step(deltas)
        for cat in CATEGORIES:
            revenues[cat] += env._prices[cat] * env._demand_yesterday[cat]
        for cat, units in info.get("waste_events", {}).items():
            waste_events[cat] += 1

    total_steps = 91 * len(CATEGORIES)
    waste_rate = sum(waste_events.values()) / total_steps
    return {
        "waste_event_rate": waste_rate,
        "total_revenue": sum(revenues.values()),
        "per_cat_waste": waste_events,
        "per_cat_revenue": revenues,
    }


def run_n_episodes(policy_fn, n: int = 200, base_seed: int = 0) -> list[dict]:
    return [run_episode(policy_fn, seed=base_seed + i) for i in range(n)]
```

- [ ] **Step 3: Implement src/eval/compare.py**

```python
import numpy as np
from src.eval.metrics import SystemResult, paired_ttest_waste, mean_diff_ci_95


def policy_dynamism_check(mpc, n_passes: int = 3) -> bool:
    """Pass if f=0.9 and f=0.3 give different delta for ≥ n_passes/4 categories."""
    from src.env.market_env import CATEGORIES, OBS_DIM, OBS_WINDOW
    from src.mpc.controller import CANDIDATES
    passes = 0
    for cat in CATEGORIES:
        params = mpc.demand_model._params[cat]
        ref = params["ref_price"]
        inv = int(0.8 * 100)

        row_fresh = np.zeros(OBS_DIM, dtype=np.float32)
        row_fresh[0] = 0.90; row_fresh[1] = 0.8; row_fresh[2] = 1.0; row_fresh[8] = 1.0
        row_old = np.zeros(OBS_DIM, dtype=np.float32)
        row_old[0] = 0.30; row_old[1] = 0.8; row_old[2] = 1.0; row_old[8] = 1.0

        r_fresh = mpc.decide(np.tile(row_fresh, (OBS_WINDOW, 1)), cat, ref, inv, 0.90, 0.0)
        r_old   = mpc.decide(np.tile(row_old,   (OBS_WINDOW, 1)), cat, ref, inv, 0.30, 0.0)
        if r_fresh["delta"] != r_old["delta"]:
            passes += 1
            print(f"  {cat}: f=0.9→δ={r_fresh['delta']:+.2f}, f=0.3→δ={r_old['delta']:+.2f} ✓")
        else:
            print(f"  {cat}: f=0.9→δ={r_fresh['delta']:+.2f}, f=0.3→δ={r_old['delta']:+.2f} ✗ (flat)")
    return passes >= n_passes


def build_headline_table(results: dict[str, SystemResult], ref_name: str) -> str:
    ref = results[ref_name]
    lines = [
        f"{'System':<20} {'Waste±SEM':>14} {'Revenue':>10} {'Δwaste [95%CI]':>22} {'p-value':>10}",
        "-" * 80
    ]
    for name, res in results.items():
        w_str = f"{res.waste_mean:.4f}±{res.waste_sem:.4f}"
        rev   = f"{res.revenues.mean():.1f}"
        if name == ref_name:
            lines.append(f"{name:<20} {w_str:>14} {rev:>10} {'—':>22} {'—':>10}")
        else:
            mean_d, lo, hi = mean_diff_ci_95(ref, res)
            _, p = paired_ttest_waste(ref, res)
            ci_str = f"[{lo:+.4f},{hi:+.4f}]"
            lines.append(f"{name:<20} {w_str:>14} {rev:>10} {ci_str:>22} {p:>10.2e}")
    return "\n".join(lines)
```

- [ ] **Step 4: Run N=200 evaluation**

```bash
python - <<'EOF'
import numpy as np
from src.mpc.controller import MPC, MPCConfig
from src.pipeline import run_n_episodes
from src.eval.metrics import SystemResult
from src.eval.compare import build_headline_table, policy_dynamism_check
from src.monitoring.heatmap import save_four_category_heatmap

# Load MPC with trained forecaster
mpc = MPC(MPCConfig(), ckpt_path="checkpoints/forecaster_v4_best.pt")

# Baselines
def static_policy(obs_w, cat, env): return 0.0
def markdown_policy(obs_w, cat, env): return -0.25 if obs_w[-1, 0] < 0.65 else 0.0
def mpc_policy(obs_w, cat, env):
    return mpc.decide(obs_w, cat, env._prices[cat],
                      env._inventory[cat], env._freshness[cat],
                      env._prev_delta[cat])["delta"]

print("Running N=200 evaluations (this takes ~5 min)...")
N, SEED = 200, 0
static_res   = run_n_episodes(static_policy,   N, SEED)
markdown_res = run_n_episodes(markdown_policy, N, SEED)
mpc_res      = run_n_episodes(mpc_policy,      N, SEED)

results = {
    "static":   SystemResult("static",   np.array([r["waste_event_rate"] for r in static_res]),
                                          np.array([r["total_revenue"]    for r in static_res])),
    "markdown": SystemResult("markdown", np.array([r["waste_event_rate"] for r in markdown_res]),
                                          np.array([r["total_revenue"]    for r in markdown_res])),
    "MPC_v3":   SystemResult("MPC_v3",   np.array([r["waste_event_rate"] for r in mpc_res]),
                                          np.array([r["total_revenue"]    for r in mpc_res])),
}

print("\n" + build_headline_table(results, ref_name="MPC_v3"))

# Policy dynamism check
print("\n=== Policy Dynamism Check ===")
passed = policy_dynamism_check(mpc)
print(f"\nPolicy dynamism: {'PASS ✓' if passed else 'FAIL ✗ — consider Tier B'}")

# Save post-training heatmap
save_four_category_heatmap(mpc, "checkpoints/plots/heatmap_final.png",
                            suptitle="MPC v3 Final Policy (with LSTM)")
EOF
```

- [ ] **Step 5: ⚠️ USER REVIEWS RESULTS**

Check three things:
1. **Waste rate** ≤ 0.0033 (thesis_v2 baseline)
2. **Revenue** ≥ 3,328 (thesis_v2 baseline)
3. **Policy dynamism**: PASS (f=0.9 ≠ f=0.3 in ≥3/4 categories)

**If all pass → Tier A done. Skip Task 13.**
**If policy dynamism FAIL → proceed to Task 13 (Tier B).**

- [ ] **Step 6: Commit**

```bash
git add src/eval/ src/pipeline.py
git commit -m "feat: evaluation framework, N=200 baseline, policy dynamism check"
```

---

## Task 13: [CONDITIONAL] Tier B — Quality Premium in MPC

**Run this task ONLY if Task 12 policy dynamism check FAILED.**

This task adds `quality_mult` to MPC scoring (already in `src/mpc/controller.py` via `tier_b_gamma`).

**Files:**
- Modify: `src/mpc/controller.py` — already implemented, just needs `tier_b_gamma > 0`

- [ ] **Step 1: Run sensitivity sweep for Tier B γ**

```bash
python - <<'EOF'
import numpy as np
import json
from src.mpc.controller import MPC, MPCConfig
from src.monitoring.heatmap import save_four_category_heatmap
from pathlib import Path

Path("checkpoints/plots/tier_b").mkdir(parents=True, exist_ok=True)
for gamma in [0.3, 0.5, 0.8, 1.0]:
    cfg = MPCConfig(tier_b_gamma=gamma)
    mpc = MPC(cfg, ckpt_path="checkpoints/forecaster_v4_best.pt")
    save_four_category_heatmap(mpc,
        f"checkpoints/plots/tier_b/heatmap_gamma_{gamma}.png",
        suptitle=f"Tier B γ={gamma}")
    print(f"γ={gamma} done")
print("Open checkpoints/plots/tier_b/ to review.")
EOF
```

- [ ] **Step 2: ⚠️ USER REVIEWS Tier B heatmaps**

Pick the smallest γ that passes policy dynamism check. Then:

```bash
python - <<'EOF'
# Example: user chooses gamma=0.5
CHOSEN_GAMMA = 0.5  # <- change to user's chosen value

import numpy as np
from src.mpc.controller import MPC, MPCConfig
from src.eval.compare import policy_dynamism_check, build_headline_table
from src.eval.metrics import SystemResult
from src.pipeline import run_n_episodes
from src.monitoring.heatmap import save_four_category_heatmap

cfg = MPCConfig(tier_b_gamma=CHOSEN_GAMMA)
mpc = MPC(cfg, ckpt_path="checkpoints/forecaster_v4_best.pt")

print("=== Policy Dynamism Check (Tier B) ===")
passed = policy_dynamism_check(mpc)
print(f"Policy dynamism: {'PASS ✓' if passed else 'FAIL ✗'}")

def mpc_policy(obs_w, cat, env):
    return mpc.decide(obs_w, cat, env._prices[cat],
                      env._inventory[cat], env._freshness[cat],
                      env._prev_delta[cat])["delta"]

print("\nRunning N=200 Tier B evaluation...")
mpc_res = run_n_episodes(mpc_policy, 200, 0)
waste = np.array([r["waste_event_rate"] for r in mpc_res])
rev   = np.array([r["total_revenue"]    for r in mpc_res])
print(f"Tier B: waste={waste.mean():.4f}±{waste.std(ddof=1)/200**0.5:.4f}, "
      f"revenue={rev.mean():.1f}")

save_four_category_heatmap(mpc, "checkpoints/plots/heatmap_tier_b_final.png",
                            suptitle=f"Tier B γ={CHOSEN_GAMMA}")
EOF
```

- [ ] **Step 3: Commit**

```bash
git add checkpoints/plots/
git commit -m "feat: Tier B quality premium MPC, gamma confirmed by user"
```

---

## Self-Review Against Spec

**Coverage check:**

| Spec requirement | Task |
|---|---|
| WASTE_THRESHOLD = 0.50 | Task 2, Task 4 |
| Restock f_delivery ≥ 0.70 | Task 4 |
| β(f) freshness-dependent elasticity | Task 3 |
| obs_dim 8→9 (competitor_ratio) | Task 4 |
| competitor_ratio synthetic Phase 1 | Task 4 |
| LSTM forecaster obs_dim=9 | Task 6, 7 |
| Isotonic calibration | Task 8 |
| MPC clearability_horizon=6 | Task 9 |
| Tier A scoring (β(f) implicit) | Task 9 |
| Tier B quality_mult (conditional) | Task 13 |
| Training loss monitor + plot | Task 7 |
| Policy heatmap (freshness × inv_ratio) | Task 10 |
| Decision explainer JSON | Task 11 |
| Data logging schema (Phase 1→2) | Task 11 |
| N=200 paired evaluation | Task 12 |
| Policy dynamism metric | Task 12 |
| Spread sensitivity analysis → user confirms | Task 10 |
| User checkpoints before proceeding | Tasks 10, 12, 13 |
| Weekend seasonality 20% | Task 1 (demand_params.json) |
| Compound check: γ=0.30 comp_mult | Task 3 |
