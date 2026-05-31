# Dueling DDQN Pricing Agent — Design Spec
**Date:** 2026-05-30
**Branch:** `feature/ddqn-pricing`

## Context

The current pricing system uses a rule-based MPC controller that calls a pretrained LSTM
forecaster for demand/waste predictions, then runs hand-crafted optimization to select a
price delta. This spec replaces the MPC decision layer with a Dueling DDQN agent that
learns the pricing policy end-to-end while preserving hard business constraints via action
masking.

## Success Criteria

All three must be met on the N=200 benchmark before merging:

| Metric | Target |
|---|---|
| Waste rate | ≤ 0.0666 (MPC_v3 baseline) |
| Revenue | ≥ 2203.9 (MPC_v3 baseline) |
| Dynamism check | PASS (4/4 categories) |

## Architecture

### Overview

4 independent Dueling DDQN agents, one per category (leafy, root, fruit, herbs). Each
agent has its own online network, target network, and replay buffer. Interface mirrors
`MPC.decide()` for drop-in replacement in the benchmark pipeline.

```
MarketEnv (91 days/episode)
    ├── category "leafy"  → Agent_leafy  → delta
    ├── category "root"   → Agent_root   → delta
    ├── category "fruit"  → Agent_fruit  → delta
    └── category "herbs"  → Agent_herbs  → delta
```

### Network: LSTMDuelingQNet

```
obs_window (21 × 11)
      ↓
LSTM(hidden=128, layers=2)
      ↓
last hidden state (128,)
      ↓
FC(128→128) → ReLU
      ↓
┌────────────────┐
│                │
V-stream       A-stream
FC(128→64)→ReLU  FC(128→64)→ReLU
FC(64→1)         FC(64→11)
│                │
└───────┬────────┘
        ↓
Q(s,a) = V(s) + A(s,a) − mean(A(s,a))
        ↓
action mask: Q[invalid] = −∞
        ↓
     argmax → delta ∈ CANDIDATES[-0.30…+0.20, 11 steps]
```

LSTM encoder trained from scratch (not reused from forecaster).

## Action Masking

Hard constraints from MPC converted to masks. Applied during both training and inference.

| Freshness | Masked actions |
|---|---|
| f ≤ 0.50 (discard) | all except delta=0 |
| f < 0.70 (buyer_ok) | delta > 0 |
| 0.70 ≤ f < 0.85 (upper_ok) | delta > target(f) |
| f ≥ 0.85 (exempt) | none |

`target(f)` uses the same piecewise linear formula as MPC:
- f ∈ [0.70, 0.85]: slope = 0.20 / 0.15
- f ∈ [0.50, 0.70]: slope = −0.20 / 0.20

## Reward Function

```python
def compute_reward(price, sold, waste_units, delta, prev_delta, freshness):
    r_revenue = price * sold
    r_waste   = -15.0 * waste_units
    r_target  = -3.0 * (delta - freshness_target_delta(freshness)) ** 2
    r_smooth  = -0.5 * abs(delta - prev_delta) if 0.60 < freshness < 0.85 else 0.0
    return r_revenue + r_waste + r_target + r_smooth
```

Priority order encoded in weights: waste >> revenue >> target adherence >> smoothness.

## Training

### Hyperparameters

| Parameter | Value |
|---|---|
| Episodes | 20,000 |
| Replay buffer | 50,000 transitions / category |
| Batch size | 256 |
| Discount γ | 0.99 |
| Learning rate | 1e-4 (Adam) |
| ε schedule | 1.0 → 0.05 linear over 10,000 episodes |
| Target sync | Hard update every 500 steps |
| Warmup | 1,000 transitions |

### Loop

```
for episode in range(20_000):
    env.reset()
    for t in range(91):
        for cat in CATEGORIES:
            mask  = compute_mask(freshness[cat])
            delta = agent[cat].act(obs_window, mask, epsilon)
        obs_next, info, done, _ = env.step(deltas)
        for cat in CATEGORIES:
            reward = compute_reward(...)
            agent[cat].push(transition)
            agent[cat].train_step()         # every step if buffer ≥ warmup
        if global_step % 500 == 0:
            sync_target_networks()
    if episode % 2000 == 0:
        evaluate(50 greedy episodes) → log waste + revenue
```

## File Structure

```
src/rl/
  __init__.py
  network.py      # LSTMDuelingQNet
  agent.py        # DuelingDDQNAgent: act(), push(), train_step(), sync_target(), decide()
  replay.py       # ReplayBuffer
  reward.py       # compute_reward(), compute_mask(), freshness_target_delta()
  train.py        # train_all_categories()
  evaluate.py     # ddqn_policy() for benchmark pipeline

scripts/
  train_rl.py     # entry point

checkpoints/
  rl_leafy_best.pt
  rl_root_best.pt
  rl_fruit_best.pt
  rl_herbs_best.pt
```

## Evaluation

Final benchmark uses existing `run_n_episodes()` with N=200 and `policy_dynamism_check()`.
Results compared against: `static | markdown | MPC_v3 | DDQN`.
