# Non-Compound Discount Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace compound delta pricing (`p_t = p_{t-1} × (1+δ)`) with non-compound base-relative pricing (`p_t = ref × (1+δ)`) across the entire codebase — env, MPC, and RL — and remove LSTM from the RL policy network (keeping LSTM only as a frozen demand-prediction module).

**Architecture:** Single source of truth for pricing lives in `market_env.step()`. MPC `_score_all()` already receives `ref_price` but ignores it — one-line fix. RL agent and network default `obs_dim` drops from 11→10 (remove `price_ratio`). LSTM network classes (`LSTMDuelingQNet`, `SharedLSTMDuelingQNet`) are deleted; only MLP policy networks remain. The frozen LSTM forecaster survives as a `ForecasterEncoder` feature extractor, appending `(d_hat, p_waste)` → 12-dim obs when `forecaster_path` is provided.

**Tech Stack:** Python 3.11, NumPy, PyTorch, pytest. All code lives in `src/` worktree at `/Users/macos/dynamic-pricing-v3/.claude/worktrees/feature+ddqn-pricing/`.

---

## File Map

| File | Change |
|------|--------|
| `src/env/market_env.py` | `OBS_DIM 11→10`; `step()` use `ref` not `self._prices[cat]`; `_build_obs()` remove obs[2] + re-index |
| `src/mpc/controller.py` | `_score_all()` line 211: `current_price →  ref_price` |
| `src/rl/agent.py` | `OBS_DIM=10`; remove `use_lstm`, `pretrained_lstm_path`, `_load_pretrained_lstm`, LSTM branches |
| `src/rl/network.py` | Default `obs_dim=10` in 2 MLP classes; **delete** `LSTMDuelingQNet` + `SharedLSTMDuelingQNet` |
| `src/rl/train.py` | Remove `use_lstm`, `pretrained_lstm_path` params |
| `src/rl/forecaster_encoder.py` | Docstring "11→13" → "10→12" (keep file — LSTM forecaster as demand module) |
| `tests/test_market_env.py` | Update index refs; rename obs_dim test; add non-compound test |
| `tests/test_mpc.py` | Fix `_make_obs_window` index refs; add ref_price scoring test |
| `tests/test_rl_network.py` | Remove LSTM network tests; update `obs_dim=11` → `obs_dim=10` |

**Obs re-index reference** (old → new):

| Old | Feature | New |
|-----|---------|-----|
| [0] | freshness | [0] |
| [1] | inv_ratio | [1] |
| [2] | ~~price_ratio~~ | **removed** |
| [3] | sin_dow | [2] |
| [4] | cos_dow | [3] |
| [5] | days_to_restock | [4] |
| [6] | demand_ratio | [5] |
| [7] | prev_delta | [6] |
| [8] | competitor_ratio | [7] |
| [9] | days_to_waste_threshold | [8] |
| [10] | inv_coverage_7d | [9] |

---

## Task 1: Update test_market_env.py — add non-compound test + fix obs indices

**Files:**
- Modify: `tests/test_market_env.py`

- [ ] **Step 1: Replace `test_obs_dim_is_11` and add non-compound test**

Open `tests/test_market_env.py`. Make these changes:

**Replace** `test_obs_dim_is_11`:
```python
def test_obs_dim_is_10():
    assert OBS_DIM == 10
```

**Add** new test after `test_obs_dim_is_10`:
```python
def test_price_is_base_relative():
    """Applying the same delta three times must yield ref*( 1+delta) each time — no drift."""
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
```

- [ ] **Step 2: Fix obs index references throughout test_market_env.py**

Apply ALL of these renames (old index → new index):

In `test_days_to_waste_feature_decreases_with_freshness`:
```python
# BEFORE:
assert obs_hi["leafy"][9] > obs_lo["leafy"][9]
# AFTER:
assert obs_hi["leafy"][8] > obs_lo["leafy"][8]
```

In `test_inv_coverage_zero_when_no_inventory`:
```python
# BEFORE:
assert obs["herbs"][10] == pytest.approx(0.0, abs=1e-6)
# AFTER:
assert obs["herbs"][9] == pytest.approx(0.0, abs=1e-6)
```

In `test_new_features_normalized`:
```python
# BEFORE:
assert 0.0 <= obs[cat][9] <= 1.0 + 1e-6, f"{cat} obs[9]={obs[cat][9]}"
assert 0.0 <= obs[cat][10] <= 1.0 + 1e-6, f"{cat} obs[10]={obs[cat][10]}"
# AFTER:
assert 0.0 <= obs[cat][8] <= 1.0 + 1e-6, f"{cat} obs[8]={obs[cat][8]}"
assert 0.0 <= obs[cat][9] <= 1.0 + 1e-6, f"{cat} obs[9]={obs[cat][9]}"
```

In `test_comp_ratio_in_obs`:
```python
# BEFORE:
assert 0.5 <= obs[cat][8] <= 2.0
# AFTER:
assert 0.5 <= obs[cat][7] <= 2.0
```

In `test_prev_delta_in_obs`:
```python
# BEFORE:
assert obs[cat][7] == pytest.approx(-0.10, abs=1e-4)
# AFTER:
assert obs[cat][6] == pytest.approx(-0.10, abs=1e-4)
```

In `test_obs_window_still_chronological` docstring:
```python
# BEFORE:
"""obs_window() must return oldest-first (21, 11) after ring-buffer refactor."""
# AFTER:
"""obs_window() must return oldest-first (21, 10) after ring-buffer refactor."""
```

- [ ] **Step 3: Run the updated tests to confirm they FAIL with current code**

```bash
cd /Users/macos/dynamic-pricing-v3/.claude/worktrees/feature+ddqn-pricing
python -m pytest tests/test_market_env.py -v 2>&1 | tail -20
```

Expected: multiple FAILs — `test_obs_dim_is_10` fails (still 11), `test_price_is_base_relative` fails (compound drift), index tests fail.

---

## Task 2: Implement market_env.py changes

**Files:**
- Modify: `src/env/market_env.py`

- [ ] **Step 1: Change OBS_DIM**

Line 9:
```python
# BEFORE:
OBS_DIM = 11
# AFTER:
OBS_DIM = 10
```

- [ ] **Step 2: Change step() to use ref for new_price**

Lines 63–65. Find:
```python
            # 1. Apply delta
            new_price = self._prices[cat] * (1.0 + deltas[cat])
            self._prices[cat] = float(np.clip(new_price, cost_floor, price_ceil))
```

Replace with:
```python
            # 1. Apply delta — non-compound: always relative to ref_price
            new_price = ref * (1.0 + deltas[cat])
            self._prices[cat] = float(np.clip(new_price, cost_floor, price_ceil))
```

(`ref` is already defined at line 59 as `p["ref_price"]`.)

- [ ] **Step 3: Update _build_obs() — remove obs[2] and re-index**

Replace the entire `obs[cat] = np.array([...])` block (lines 146–158) with:
```python
            obs[cat] = np.array([
                f,                                                                                    # [0] freshness
                min(inv / 100.0, 2.0),                                                                # [1] inv_ratio
                math.sin(2 * math.pi * dow / 7),                                                      # [2] sin_dow
                math.cos(2 * math.pi * dow / 7),                                                      # [3] cos_dow
                min(days_to_next / 30.0, 1.0),                                                        # [4] days_to_restock
                float(np.clip(self._demand_yesterday[cat] / p["base_demand"], 0.0, 3.0)),             # [5] demand_ratio
                self._prev_delta[cat],                                                                 # [6] prev_delta
                float(np.clip(comp_ratio, 0.5, 2.0)),                                                 # [7] competitor_ratio
                float(np.clip(days_to_waste, 0.0, 14.0)) / 14.0,                                     # [8] days_to_waste_threshold
                float(np.clip(coverage_7d, 0.0, 3.0)) / 3.0,                                         # [9] inv_coverage_7d
            ], dtype=np.float32)
```

- [ ] **Step 4: Run tests — must pass**

```bash
cd /Users/macos/dynamic-pricing-v3/.claude/worktrees/feature+ddqn-pricing
python -m pytest tests/test_market_env.py -v 2>&1 | tail -20
```

Expected: all green. If any test still fails, fix before continuing.

- [ ] **Step 5: Commit**

```bash
cd /Users/macos/dynamic-pricing-v3/.claude/worktrees/feature+ddqn-pricing
git add src/env/market_env.py tests/test_market_env.py
git commit -m "feat: non-compound pricing in market_env (obs_dim 11→10, ref-relative delta)"
```

---

## Task 3: Update test_mpc.py — fix _make_obs_window + add ref_price test

**Files:**
- Modify: `tests/test_mpc.py`

- [ ] **Step 1: Fix `_make_obs_window`**

Current `_make_obs_window` sets `row[2]=1.0` (was price_ratio), `row[7]=prev_delta`, `row[8]=1.0`.
With new obs layout, obs[2] is sin_dow, obs[6] is prev_delta, obs[7] is competitor_ratio.

Replace the entire function:
```python
def _make_obs_window(freshness, inv_ratio, prev_delta=0.0):
    """Construct a (OBS_WINDOW, OBS_DIM) obs window with constant state."""
    row = np.zeros(OBS_DIM, dtype=np.float32)
    row[0] = freshness
    row[1] = inv_ratio
    row[6] = prev_delta    # [6] prev_delta
    row[7] = 1.0           # [7] competitor_ratio (= 1.0 means price parity with competitor)
    return np.tile(row, (OBS_WINDOW, 1))
```

- [ ] **Step 2: Add non-compound MPC scoring test**

Add after the last test in `tests/test_mpc.py`:
```python
def test_score_all_prices_relative_to_ref(mpc):
    """_score_all must anchor candidate prices to ref_price, not current_price.

    When current_price != ref_price (e.g. drifted to 80%), the scoring at delta=0
    must produce revenue based on ref_price*1.0, not current_price*1.0.
    """
    from src.mpc.controller import CANDIDATES
    cat = "leafy"
    p = mpc.demand_model._params[cat]
    ref_price = p["ref_price"]
    current_price = ref_price * 0.80  # simulated drift (would not happen under non-compound, but tests the formula)
    cost_floor = ref_price * p["cost_ratio"] * 1.05
    price_ceil = ref_price * 2.0
    beta_f = mpc.demand_model.beta_at_freshness(0.80, cat)
    d_hat_0 = 10.0

    scores = mpc._score_all(
        CANDIDATES, current_price, d_hat_0, 0.05, 10.0, 50, 0.0,
        ref_price, cost_floor, price_ceil, beta_f, 0.80,
    )

    zero_idx = 6  # CANDIDATES[6] == 0.0
    # Non-compound: price at delta=0 must be ref_price (not current_price)
    expected_price = ref_price
    expected_demand = d_hat_0 * (expected_price / current_price) ** beta_f
    expected_revenue = expected_price * expected_demand
    assert abs(scores["revenues"][zero_idx] - expected_revenue) < 0.01, (
        f"Revenue at delta=0: expected {expected_revenue:.4f}, got {scores['revenues'][zero_idx]:.4f}. "
        f"Scoring must use ref_price={ref_price}, not current_price={current_price}."
    )
```

- [ ] **Step 3: Run tests to confirm failures**

```bash
cd /Users/macos/dynamic-pricing-v3/.claude/worktrees/feature+ddqn-pricing
python -m pytest tests/test_mpc.py -v 2>&1 | tail -20
```

Expected: `test_score_all_prices_relative_to_ref` FAILS (current code still uses `current_price`). Other tests may fail if `_make_obs_window` shape changed. Verify.

---

## Task 4: Implement mpc/controller.py change

**Files:**
- Modify: `src/mpc/controller.py:211`

- [ ] **Step 1: Change one line in `_score_all`**

Line 211. Find:
```python
        new_prices   = np.clip(current_price * (1.0 + candidates), cost_floor, price_ceil)
```

Replace with:
```python
        new_prices   = np.clip(ref_price * (1.0 + candidates), cost_floor, price_ceil)
```

`ref_price` is already the 8th positional parameter of `_score_all` and is already passed by `decide()`. No other changes needed.

- [ ] **Step 2: Run tests — must pass**

```bash
cd /Users/macos/dynamic-pricing-v3/.claude/worktrees/feature+ddqn-pricing
python -m pytest tests/test_mpc.py -v 2>&1 | tail -20
```

Expected: all green.

- [ ] **Step 3: Commit**

```bash
cd /Users/macos/dynamic-pricing-v3/.claude/worktrees/feature+ddqn-pricing
git add src/mpc/controller.py tests/test_mpc.py
git commit -m "feat: non-compound scoring in MPC _score_all (ref_price-relative candidates)"
```

---

## Task 5: Update forecaster_encoder.py docstring only

**Files:**
- Modify: `src/rl/forecaster_encoder.py` (docstring only — file kept, LSTM forecaster is the demand module)

- [ ] **Step 1: Update docstring**

Lines 11–13. Find:
```python
    Takes obs_window (seq_len, obs_dim) + category → appends (d_hat, p_waste)
    to the flat current-state obs, expanding obs_dim from 11 to 13.
```

Replace with:
```python
    Takes obs_window (seq_len, obs_dim) + category → appends (d_hat, p_waste)
    to the flat current-state obs, expanding obs_dim from 10 to 12.
```

- [ ] **Step 2: Commit**

```bash
cd /Users/macos/dynamic-pricing-v3/.claude/worktrees/feature+ddqn-pricing
git add src/rl/forecaster_encoder.py
git commit -m "docs: update ForecasterEncoder docstring for obs_dim 10→12"
```

---

## Task 6: Fix remaining test files + run full suite

**Files:**
- Modify: `tests/test_rl_network.py`
- Check: `tests/test_rl_evaluate.py`, `tests/test_forecaster_model.py`, `tests/test_forecaster_data.py`

- [ ] **Step 1: Find all remaining hardcoded obs_dim=11 references in tests**

```bash
cd /Users/macos/dynamic-pricing-v3/.claude/worktrees/feature+ddqn-pricing
grep -rn "obs_dim.*11\|= 11\b\|(11," tests/ | grep -v ".pyc"
```

For each match, check context: if it's `obs_dim=11` passed to a network/agent or an `assert shape == (11,)`, change 11 → 10.

- [ ] **Step 2: Fix test_rl_network.py**

Open `tests/test_rl_network.py`. For every place a network is instantiated without explicit `obs_dim`, the default now is 10 — no change needed. For every place that explicitly passes `obs_dim=11`, change to `obs_dim=10`. For every `assert ... shape == (11,)` or `(21, 11)`, update to `(10,)` or `(21, 10)`.

Run after each file fix:
```bash
python -m pytest tests/test_rl_network.py -v 2>&1 | tail -20
```

Expected: all green.

- [ ] **Step 3: Check and fix test_forecaster_model.py and test_forecaster_data.py**

These tests exercise the LSTM forecaster, which was trained with obs_dim=11 input. The forecaster model's `input_size` parameter in `ForecasterConfig` is stored per-checkpoint — it does NOT use `OBS_DIM` from `market_env`. So these tests are most likely unaffected.

Run to confirm:
```bash
python -m pytest tests/test_forecaster_model.py tests/test_forecaster_data.py -v 2>&1 | tail -20
```

If failures appear, read the error and fix the specific assertion.

- [ ] **Step 4: Run the full test suite**

```bash
cd /Users/macos/dynamic-pricing-v3/.claude/worktrees/feature+ddqn-pricing
python -m pytest tests/ -v 2>&1 | tail -30
```

Expected: all green. Fix any remaining failures before the final commit.

- [ ] **Step 5: Final commit**

```bash
cd /Users/macos/dynamic-pricing-v3/.claude/worktrees/feature+ddqn-pricing
git add tests/
git commit -m "test: fix obs_dim references after non-compound discount (11→10)"
```

---

## Task 7: Remove LSTM from RL policy — agent.py, network.py, train.py, test_rl_network.py

**Context:** LSTM forecaster (in `src/forecaster/`) is kept as a frozen demand-prediction module.
Only `LSTMDuelingQNet` and `SharedLSTMDuelingQNet` — which embed LSTM *inside the policy network* — are deleted. `ForecasterEncoder` is untouched.

**Files:**
- Modify: `src/rl/network.py` — delete 2 LSTM classes, update 2 MLP defaults
- Modify: `src/rl/agent.py` — strip `use_lstm` / `pretrained_lstm_path` / LSTM branches
- Modify: `src/rl/train.py` — remove `use_lstm` / `pretrained_lstm_path` params
- Modify: `tests/test_rl_network.py` — remove LSTM tests, update obs_dim

- [ ] **Step 1: Rewrite network.py — keep only MLP classes**

Replace the entire contents of `src/rl/network.py` with:

```python
import torch
import torch.nn as nn


class MLPDuelingQNet(nn.Module):
    """Dueling DQN with flat MLP encoder.

    Input:  (batch, obs_dim=10) — flat current-state vector.
    Output: Q values (batch, n_actions=11) with optional action masking.
    """

    def __init__(
        self,
        obs_dim: int = 10,
        hidden: int = 256,
        n_actions: int = 11,
    ) -> None:
        super().__init__()
        self.shared = nn.Sequential(
            nn.Linear(obs_dim, hidden), nn.ReLU(),
            nn.Linear(hidden, hidden),  nn.ReLU(),
        )
        self.v_stream = nn.Sequential(nn.Linear(hidden, 64), nn.ReLU(), nn.Linear(64, 1))
        self.a_stream = nn.Sequential(nn.Linear(hidden, 64), nn.ReLU(), nn.Linear(64, n_actions))

    def forward(
        self,
        x: torch.Tensor,
        mask: torch.Tensor | None = None,
    ) -> torch.Tensor:
        h = self.shared(x)
        v = self.v_stream(h)
        a = self.a_stream(h)
        q = v + a - a.mean(dim=1, keepdim=True)
        if mask is not None:
            q = q.masked_fill(~mask, float("-inf"))
        return q


class SharedMLPDuelingQNet(nn.Module):
    """Dueling DQN shared across all categories via a learned category embedding.

    One network, one backward pass per env-step instead of 4.

    Input:  obs (batch, obs_dim=10) + cat_ids (batch,) int
    Output: Q values (batch, n_actions=11) with optional action masking.
    """

    def __init__(
        self,
        obs_dim: int = 10,
        n_cats: int = 4,
        cat_embed_dim: int = 8,
        hidden: int = 128,
        n_actions: int = 11,
    ) -> None:
        super().__init__()
        self.cat_embed = nn.Embedding(n_cats, cat_embed_dim)
        self.shared = nn.Sequential(
            nn.Linear(obs_dim + cat_embed_dim, hidden), nn.ReLU(),
            nn.Linear(hidden, hidden), nn.ReLU(),
        )
        self.v_stream = nn.Sequential(nn.Linear(hidden, 64), nn.ReLU(), nn.Linear(64, 1))
        self.a_stream = nn.Sequential(nn.Linear(hidden, 64), nn.ReLU(), nn.Linear(64, n_actions))

    def forward(
        self,
        obs: torch.Tensor,
        cat_ids: torch.Tensor,
        mask: torch.Tensor | None = None,
    ) -> torch.Tensor:
        emb = self.cat_embed(cat_ids)
        h = self.shared(torch.cat([obs, emb], dim=1))
        v = self.v_stream(h)
        a = self.a_stream(h)
        q = v + a - a.mean(dim=1, keepdim=True)
        if mask is not None:
            q = q.masked_fill(~mask, float("-inf"))
        return q
```

- [ ] **Step 2: Rewrite DuelingDDQNAgent in agent.py — strip LSTM**

Replace the `DuelingDDQNAgent` class (lines 19–174) with:

```python
class DuelingDDQNAgent:
    """Single-category Dueling DDQN agent (MLP policy).

    Mirrors MPC.decide() interface so it is a drop-in replacement
    in the benchmark pipeline.
    """

    def __init__(
        self,
        obs_dim: int = OBS_DIM,
        hidden: int = 128,
        n_actions: int = N_ACTIONS,
        lr: float = 1e-4,
        gamma: float = 0.99,
        batch_size: int = 256,
        warmup: int = 1_000,
        buffer_capacity: int = 50_000,
        device: str = "cpu",
    ) -> None:
        self.device = torch.device(device)
        self.gamma = gamma
        self.batch_size = batch_size
        self.warmup = warmup
        self._n_actions = n_actions

        self._online = MLPDuelingQNet(obs_dim, hidden, n_actions).to(self.device)
        self._target = MLPDuelingQNet(obs_dim, hidden, n_actions).to(self.device)
        self._target.load_state_dict(self._online.state_dict())
        self._target.eval()

        self._opt = optim.Adam(
            [p for p in self._online.parameters() if p.requires_grad], lr=lr
        )
        self._buf = ReplayBuffer(buffer_capacity, obs_shape=(obs_dim,), n_actions=n_actions)

    def act(self, obs: np.ndarray, mask: np.ndarray, epsilon: float) -> int:
        valid = np.where(mask)[0]
        if np.random.random() < epsilon:
            return int(np.random.choice(valid))
        with torch.no_grad():
            x = torch.tensor(obs, dtype=torch.float32).unsqueeze(0).to(self.device)
            m = torch.tensor(mask, dtype=torch.bool).unsqueeze(0).to(self.device)
            q = self._online(x, m)
        return int(q.squeeze().argmax().item())

    def push(self, obs, action, reward, next_obs, done, next_mask) -> None:
        self._buf.push(obs, action, reward, next_obs, done, next_mask)

    def train_step(self) -> float | None:
        if len(self._buf) < self.warmup:
            return None
        batch = self._buf.sample(self.batch_size)
        obs      = batch["obs"].to(self.device)
        action   = batch["action"].to(self.device)
        reward   = batch["reward"].to(self.device)
        next_obs = batch["next_obs"].to(self.device)
        done     = batch["done"].to(self.device)
        next_mask = batch["next_mask"].to(self.device)

        with torch.no_grad():
            q_online_next = self._online(next_obs, next_mask)
            a_next = q_online_next.argmax(dim=1)
            q_target_next = self._target(next_obs, next_mask)
            q_next = q_target_next.gather(1, a_next.unsqueeze(1)).squeeze(1)
            target = reward + self.gamma * (1.0 - done) * q_next

        q_curr = self._online(obs).gather(1, action.unsqueeze(1)).squeeze(1)
        loss = F.smooth_l1_loss(q_curr, target)

        self._opt.zero_grad()
        loss.backward()
        torch.nn.utils.clip_grad_norm_(self._online.parameters(), 10.0)
        self._opt.step()
        return float(loss.item())

    def sync_target(self) -> None:
        self._target.load_state_dict(self._online.state_dict())

    def save(self, path: str) -> None:
        torch.save({"online": self._online.state_dict()}, path)

    def load(self, path: str) -> None:
        ckpt = torch.load(path, map_location=self.device, weights_only=False)
        self._online.load_state_dict(ckpt["online"])
        self._target.load_state_dict(ckpt["online"])
        self._target.eval()

    def decide(
        self,
        obs_window: np.ndarray,
        category: str,
        current_price: float,
        current_inv: int,
        current_freshness: float,
        prev_delta: float,
    ) -> dict:
        mask = compute_mask(current_freshness)
        obs = obs_window[-1] if obs_window.ndim == 2 else obs_window
        action_idx = self.act(obs, mask, epsilon=0.0)
        delta = float(CANDIDATES[action_idx])
        return {
            "delta":      delta,
            "reason":     f"DDQN: δ={delta:+.2f}",
            "scores":     [],
            "d_hat_0":    0.0,
            "p_waste_0":  0.0,
            "t_critical": 0.0,
        }
```

Also update the import at the top of agent.py — remove `LSTMDuelingQNet`, `SharedLSTMDuelingQNet`:
```python
# BEFORE:
from src.rl.network import LSTMDuelingQNet, MLPDuelingQNet, SharedMLPDuelingQNet, SharedLSTMDuelingQNet
# AFTER:
from src.rl.network import MLPDuelingQNet, SharedMLPDuelingQNet
```

- [ ] **Step 3: Rewrite MultiCatDDQNAgent in agent.py — strip LSTM**

Replace the `MultiCatDDQNAgent` class (lines 177–373) with:

```python
class MultiCatDDQNAgent:
    """Shared-network DDQN agent for all 4 categories (MLP policy).

    One forward/backward pass per env-step instead of 4.
    Category identity is injected via a learned embedding inside the network.
    Set forecaster_path to augment obs with LSTM forecaster features (d_hat, p_waste).
    """

    def __init__(
        self,
        obs_dim: int = OBS_DIM,
        n_cats: int = 4,
        cat_embed_dim: int = 8,
        hidden: int = 128,
        n_actions: int = N_ACTIONS,
        lr: float = 1e-4,
        gamma: float = 0.99,
        batch_size: int = 256,
        warmup: int = 1_000,
        buffer_capacity: int = 50_000,
        device: str = "cpu",
        forecaster_path: str | None = None,
    ) -> None:
        self.device = torch.device(device)
        self.gamma = gamma
        self.batch_size = batch_size
        self._n_actions = n_actions
        self._n_per_cat = max(1, batch_size // n_cats)
        self.warmup = max(warmup, self._n_per_cat)

        if forecaster_path is not None:
            from src.rl.forecaster_encoder import ForecasterEncoder, EXTRA_DIM
            self._forecaster: ForecasterEncoder | None = ForecasterEncoder(forecaster_path, device)
            obs_dim = obs_dim + EXTRA_DIM
        else:
            self._forecaster = None

        self._online = SharedMLPDuelingQNet(obs_dim, n_cats, cat_embed_dim, hidden, n_actions).to(self.device)
        self._target = SharedMLPDuelingQNet(obs_dim, n_cats, cat_embed_dim, hidden, n_actions).to(self.device)
        self._target.load_state_dict(self._online.state_dict())
        self._target.eval()

        if hasattr(torch, "compile") and self.device.type != "cpu":
            try:
                self._online = torch.compile(self._online)
                self._target = torch.compile(self._target)
            except Exception:
                pass

        self._opt = optim.Adam(
            [p for p in self._online.parameters() if p.requires_grad], lr=lr
        )
        self._bufs: dict[str, ReplayBuffer] = {
            cat: ReplayBuffer(buffer_capacity, obs_shape=(obs_dim,), n_actions=n_actions)
            for cat in CATEGORIES
        }
        self._cat_tensors: dict[str, torch.Tensor] = {
            cat: torch.tensor([i], dtype=torch.long).to(self.device)
            for i, cat in enumerate(CATEGORIES)
        }
        self._cat_batch_tensors: list[torch.Tensor] = [
            torch.full((self._n_per_cat,), i, dtype=torch.long, device=self.device)
            for i in range(len(CATEGORIES))
        ]

    def act(self, obs: np.ndarray, cat: str, mask: np.ndarray, epsilon: float) -> int:
        valid = np.where(mask)[0]
        if np.random.random() < epsilon:
            return int(np.random.choice(valid))
        with torch.no_grad():
            x = torch.from_numpy(obs).float().unsqueeze(0).to(self.device)
            c = self._cat_tensors[cat]
            m = torch.from_numpy(mask).unsqueeze(0).to(self.device)
            q = self._online(x, c, m)
        return int(q.squeeze().argmax().item())

    def push(self, obs, cat, action, reward, next_obs, done, next_mask) -> None:
        self._bufs[cat].push(obs, action, reward, next_obs, done, next_mask)

    def train_step(self) -> float | None:
        for cat in CATEGORIES:
            if len(self._bufs[cat]) < self.warmup:
                return None

        obs_l, act_l, rew_l, nobs_l, done_l, nmask_l = [], [], [], [], [], []
        for cat in CATEGORIES:
            b = self._bufs[cat].sample(self._n_per_cat)
            obs_l.append(b["obs"])
            act_l.append(b["action"])
            rew_l.append(b["reward"])
            nobs_l.append(b["next_obs"])
            done_l.append(b["done"])
            nmask_l.append(b["next_mask"])

        obs      = torch.cat(obs_l).to(self.device)
        cat_ids  = torch.cat(self._cat_batch_tensors)
        action   = torch.cat(act_l).to(self.device)
        reward   = torch.cat(rew_l).to(self.device)
        next_obs = torch.cat(nobs_l).to(self.device)
        done     = torch.cat(done_l).to(self.device)
        next_mask = torch.cat(nmask_l).to(self.device)

        with torch.no_grad():
            q_online_next = self._online(next_obs, cat_ids, next_mask)
            a_next        = q_online_next.argmax(dim=1)
            q_target_next = self._target(next_obs, cat_ids, next_mask)
            q_next        = q_target_next.gather(1, a_next.unsqueeze(1)).squeeze(1)
            target        = reward + self.gamma * (1.0 - done) * q_next

        q_curr = self._online(obs, cat_ids).gather(1, action.unsqueeze(1)).squeeze(1)
        loss = F.smooth_l1_loss(q_curr, target)

        self._opt.zero_grad()
        loss.backward()
        torch.nn.utils.clip_grad_norm_(self._online.parameters(), 10.0)
        self._opt.step()
        return float(loss.item())

    def sync_target(self) -> None:
        self._target.load_state_dict(self._online.state_dict())

    def save(self, path: str) -> None:
        torch.save({"online": self._online.state_dict()}, path)

    def load(self, path: str) -> None:
        ckpt = torch.load(path, map_location=self.device, weights_only=False)
        sd = ckpt["online"]
        if any(k.startswith("_orig_mod.") for k in sd):
            sd = {k[len("_orig_mod."):]: v for k, v in sd.items()}
        self._online.load_state_dict(sd)
        self._target.load_state_dict(sd)
        self._target.eval()

    def decide(
        self,
        obs_window: np.ndarray,
        category: str,
        current_price: float,
        current_inv: int,
        current_freshness: float,
        prev_delta: float,
    ) -> dict:
        obs = obs_window[-1] if obs_window.ndim == 2 else obs_window
        if self._forecaster is not None:
            obs = self._forecaster.augment(obs, obs_window, category)
        mask = compute_mask(current_freshness)
        action_idx = self.act(obs, category, mask, epsilon=0.0)
        delta = float(CANDIDATES[action_idx])
        return {
            "delta":      delta,
            "reason":     f"DDQN: δ={delta:+.2f}",
            "scores":     [],
            "d_hat_0":    0.0,
            "p_waste_0":  0.0,
            "t_critical": 0.0,
        }
```

Also change `OBS_DIM = 11` → `OBS_DIM = 10` at line 14.

- [ ] **Step 4: Simplify train.py — remove use_lstm / pretrained_lstm_path**

In `train_all_categories()` signature, remove `pretrained_lstm_path` and `use_lstm` params.

Find:
```python
def train_all_categories(
    n_episodes: int = EPISODES,
    device: Optional[str] = None,
    ckpt_dir: str = "checkpoints",
    ckpt_name: Optional[str] = None,
    verbose: bool = True,
    pretrained_lstm_path: Optional[str] = None,
    forecaster_path: Optional[str] = None,
    epsilon_start: float = EPSILON_START,
    epsilon_decay_ep: int = EPSILON_DECAY_EP,
    warmup: int = 1_000,
    eval_every: int = EVAL_EVERY,
    time_limit_sec: Optional[float] = None,
    agent: Optional[MultiCatDDQNAgent] = None,
    update_every: int = 4,
) -> dict[str, str]:
    """Train shared DDQN agent across all categories. Returns dict of checkpoint paths.

    agent: if provided, skip agent construction (used by warm-start script).
    ckpt_name: override default checkpoint filename.
    time_limit_sec: stop training after this many seconds, saving best checkpoint before exit.
    epsilon_start / epsilon_decay_ep: override default ε schedule.
    warmup: minimum buffer size before gradient steps (ignored when agent is provided).
    eval_every: run waste evaluation every N episodes.
    """
```

Replace with:
```python
def train_all_categories(
    n_episodes: int = EPISODES,
    device: Optional[str] = None,
    ckpt_dir: str = "checkpoints",
    ckpt_name: Optional[str] = None,
    verbose: bool = True,
    forecaster_path: Optional[str] = None,
    epsilon_start: float = EPSILON_START,
    epsilon_decay_ep: int = EPSILON_DECAY_EP,
    warmup: int = 1_000,
    eval_every: int = EVAL_EVERY,
    time_limit_sec: Optional[float] = None,
    agent: Optional[MultiCatDDQNAgent] = None,
    update_every: int = 4,
) -> dict[str, str]:
    """Train shared DDQN agent across all categories. Returns dict of checkpoint paths.

    agent: if provided, skip agent construction (used by warm-start script).
    ckpt_name: override default checkpoint filename.
    time_limit_sec: stop training after this many seconds, saving best checkpoint before exit.
    epsilon_start / epsilon_decay_ep: override default ε schedule.
    warmup: minimum buffer size before gradient steps (ignored when agent is provided).
    eval_every: run waste evaluation every N episodes.
    """
```

Also remove the `use_forecaster` flag logic in the function body — it was driven by `forecaster_path`, which stays. Remove any reference to `pretrained_lstm_path` or `use_lstm` in the agent construction block:

Find:
```python
    if agent is None:
        agent = MultiCatDDQNAgent(
            device=device,
            forecaster_path=forecaster_path,
            warmup=warmup,
        )
```

This block is already correct — no change needed here. Just ensure no remaining `use_lstm` or `pretrained_lstm_path` references exist in the file:

```bash
grep -n "use_lstm\|pretrained_lstm" src/rl/train.py
```

Expected: no output.

- [ ] **Step 5: Fix test_rl_network.py**

Open `tests/test_rl_network.py`. Remove all tests that reference `LSTMDuelingQNet` or `SharedLSTMDuelingQNet`. For remaining tests that create `MLPDuelingQNet` or `SharedMLPDuelingQNet`, change `obs_dim=11` → `obs_dim=10` and update any shape assertions from `(11,)` → `(10,)` or `(21, 11)` → `(21, 10)`.

Run:
```bash
cd /Users/macos/dynamic-pricing-v3/.claude/worktrees/feature+ddqn-pricing
python -m pytest tests/test_rl_network.py -v 2>&1 | tail -20
```

Expected: all green.

- [ ] **Step 6: Run full test suite**

```bash
cd /Users/macos/dynamic-pricing-v3/.claude/worktrees/feature+ddqn-pricing
python -m pytest tests/ -v 2>&1 | tail -30
```

Expected: all green.

- [ ] **Step 7: Commit**

```bash
cd /Users/macos/dynamic-pricing-v3/.claude/worktrees/feature+ddqn-pricing
git add src/rl/network.py src/rl/agent.py src/rl/train.py tests/test_rl_network.py
git commit -m "feat: remove LSTM from RL policy — MLP-only network, forecaster kept as demand module"
```

---

## Side Effects Checklist (do after all tasks pass)

- [ ] Delete existing `.pt` checkpoints in `checkpoints/` — they were trained with obs_dim=11 and will fail to load.
- [ ] Delete warm-start cache `.npz` files (if any) in `checkpoints/` or `data/` — their obs arrays have shape `(N, 11)`.
- [ ] If using `forecaster_path` with RL agent: forecaster was trained on obs_dim=11 input; it must be retrained before using `MultiCatDDQNAgent(forecaster_path=...)`.
