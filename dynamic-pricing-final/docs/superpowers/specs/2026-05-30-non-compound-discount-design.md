# Non-Compound Discount Design

**Date:** 2026-05-30  
**Branch:** worktree-feature+ddqn-pricing  
**Scope:** Replace compound delta semantics with non-compound (base-relative) across LSTM/MPC/RL

---

## Problem

Current `market_env.py` applies delta as a **compound** multiplier on current price:

```python
new_price = self._prices[cat] * (1.0 + deltas[cat])
```

This causes price drift: three consecutive δ=−0.10 steps take price from 100 → 90 → 81 → 72.9.
For RL, this creates a non-Markovian pricing state — the agent must implicitly track the full history
of past deltas to know the current price level.

## Solution

Switch to **non-compound** (base-relative) semantics: delta always expresses a % offset from `ref_price`.

```python
new_price = ref * (1.0 + deltas[cat])
```

δ=−0.20 always means 20% below base, regardless of previous steps. Price no longer drifts.

---

## Architecture Changes

### 1. `src/env/market_env.py`

**`step()`** — single line change:
```python
# before
new_price = self._prices[cat] * (1.0 + deltas[cat])
# after
new_price = ref * (1.0 + deltas[cat])
```
`cost_floor` / `price_ceil` clamp applied afterwards, unchanged.

**`_build_obs()`** — remove `obs[2]` (price_ratio).  
With non-compound, `prices[cat] / ref = 1 + prev_delta` exactly, making it linearly dependent on `obs[7]` (prev_delta). Removing it reduces `OBS_DIM` from 11 to 10.

**`OBS_DIM`**: `11 → 10`

New obs layout:

| Index | Feature |
|-------|---------|
| [0] | freshness |
| [1] | inv_ratio |
| [2] | sin_dow |
| [3] | cos_dow |
| [4] | days_to_restock |
| [5] | demand_ratio |
| [6] | prev_delta |
| [7] | competitor_ratio |
| [8] | days_to_waste_threshold |
| [9] | inv_coverage_7d |

### 2. `src/mpc/controller.py`

**`_score_all()`** — use `ref_price` instead of `current_price` for candidate scoring:
```python
# before
new_prices = np.clip(current_price * (1.0 + candidates), cost_floor, price_ceil)
# after
new_prices = np.clip(ref_price * (1.0 + candidates), cost_floor, price_ceil)
```

`_score_all()` receives new param `ref_price`. `decide()` passes `ref_price = p["ref_price"]`
(already available at line 101).

All other MPC scoring logic (`lambda_waste`, `lambda_target`, `move_penalties`, clearability
override) unchanged.

### 3. `src/rl/agent.py`

`OBS_DIM: 11 → 10`. Affects `obs_shape` for both MLP path `(10,)` and LSTM path `(21, 10)`.

### 4. `src/rl/network.py`

Default `obs_dim=11 → 10` in all four network classes:
- `LSTMDuelingQNet`
- `MLPDuelingQNet`
- `SharedLSTMDuelingQNet`
- `SharedMLPDuelingQNet`

### 5. `src/rl/forecaster_encoder.py`

Docstring update only: "expanding obs_dim from 11 to 13" → "10 to 12".

### 6. `tests/`

Update `obs_dim=11` assertions in affected test files:
- `test_market_env.py`
- `test_rl_network.py`
- `test_forecaster_model.py`
- `test_forecaster_data.py`
- `test_mpc.py`
- `test_rl_evaluate.py`

---

## Files NOT Changed

| File | Reason |
|------|--------|
| `src/rl/reward.py` | Uses `price`, `delta`, `freshness` directly — no compound logic |
| `src/rl/train.py` | Imports OBS_DIM from market_env; no hardcoded dims |
| `src/rl/warmstart.py` | No price calculation; uses obs from env directly |
| `src/pipeline.py` | No price calculation |
| `src/forecaster/` | Forecaster trains on obs; will need retraining after obs_dim change |

---

## Side Effects

- **Existing `.pt` checkpoints**: invalidated — obs_dim mismatch. Delete and retrain.
- **Warm-start cache `.npz`**: invalidated — obs shape (N, 11) → (N, 10). Delete before rerunning warmstart.
- **Forecaster checkpoints**: trained on obs_dim=11 input. Need retraining if forecaster path is used in RL agent.

---

## Success Criteria

1. `market_env.py` test: three consecutive δ=−0.10 steps yield price = `ref × 0.90` each time (not drifting to 72.9).
2. `OBS_DIM == 10` throughout — no obs shape mismatch in tests.
3. MPC `_score_all` candidates priced relative to `ref_price`, not `current_price`.
4. All existing tests pass with updated obs_dim.
