# MPC Warm-Start for DDQN — Design Spec

**Date:** 2026-05-30  
**Branch:** worktree-feature+ddqn-pricing  
**Goal:** Use MPC as a warm-start so the DDQN agent begins training from a reasonable policy and improves beyond MPC within a 30-minute fine-tune budget.

---

## Problem

Cold-start DDQN with ε=1.0 and 2000-episode decay takes >30 minutes to produce a non-degenerate policy. After 30 min of training the agent collapsed to always outputting δ=−0.30 (max discount) regardless of freshness, because it never moved past the early random-exploration phase.

---

## Shared Foundation: MPC Experience Collection

**Function:** `collect_mpc_experience(n_episodes=100) -> list[dict]`  
**Location:** `src/rl/warmstart.py` (new file)

Runs the MPC controller (`MPC` with `forecaster_v4_best.pt`) on `MarketEnv` for `n_episodes` episodes. For each step, records:

```
{obs, cat, cat_id, action_idx, reward, next_obs, done, next_mask}
```

- `action_idx`: index in `CANDIDATES` closest to MPC's returned delta
- `reward`: computed via existing `compute_reward()` for consistency with RL training
- Yields ~91 × 4 × 100 = **36,400 transitions** across all categories

This data is used by all three warm-start modes.

---

## Mode B — Behavioral Cloning + RL Fine-tune (implement first)

### BC Pre-train

**Function:** `bc_pretrain(agent, transitions, n_steps=500)`  
**Loss:** Cross-entropy on Q-values vs MPC action label

```python
q = online(obs, cat_ids)               # (B, 11)
loss = F.cross_entropy(q, mpc_actions) # argmax Q → MPC action
```

- Batch size: 256, sampled randomly from collected transitions
- ~500 gradient steps ≈ 10 seconds on CPU
- After BC, `argmax Q(s, cat)` approximates MPC policy

### RL Fine-tune Parameters (vs baseline)

| Parameter | Baseline | Mode B |
|---|---|---|
| epsilon_start | 1.0 | 0.15 |
| epsilon_decay_ep | 2000 | 500 |
| warmup | 1000 | 0 |
| checkpoint | rl_shared_best.pt | rl_warmstart_B_best.pt |

- 30-minute kill, saves best checkpoint by eval_waste metric

---

## Mode A — Buffer Seeding Only

**Function:** `seed_buffer(agent, transitions)`  
Pushes all MPC transitions into `agent._bufs[cat]` before RL starts. No BC phase.

### RL Fine-tune Parameters

| Parameter | Baseline | Mode A |
|---|---|---|
| epsilon_start | 1.0 | 0.30 |
| epsilon_decay_ep | 2000 | 1000 |
| warmup | 1000 | 0 |
| checkpoint | rl_shared_best.pt | rl_warmstart_A_best.pt |

---

## Mode C — BC + Buffer Seeding (strongest prior)

Runs both `bc_pretrain()` and `seed_buffer()` before RL. Tightest epsilon schedule since the network already encodes MPC knowledge.

| Parameter | Baseline | Mode C |
|---|---|---|
| epsilon_start | 1.0 | 0.10 |
| epsilon_decay_ep | 2000 | 300 |
| warmup | 1000 | 0 |
| checkpoint | rl_shared_best.pt | rl_warmstart_C_best.pt |

---

## Entrypoint

**Script:** `scripts/warmstart_train.py`

```
python scripts/warmstart_train.py --mode B   # runs B, 30-min limit
python scripts/warmstart_train.py --mode A
python scripts/warmstart_train.py --mode C
```

Each run:
1. Collects MPC experience (n_episodes=100)
2. Applies warm-start (BC / buffer-seed / both)
3. Runs RL fine-tune with 30-min kill
4. Saves `checkpoints/rl_warmstart_{mode}_best.pt`

---

## Evaluation

After all three runs, `scripts/compare_warmstart.py` produces the same 14-day trajectory table used to evaluate MPC, for each of the 4 checkpoints (MPC + A + B + C). Columns: `f`, delta per category per day. Visual inspection of whether delta tracks freshness the way MPC does, plus numeric `eval_waste` score.

---

## Files Changed

| File | Action |
|---|---|
| `src/rl/warmstart.py` | New — `collect_mpc_experience`, `bc_pretrain`, `seed_buffer` |
| `src/rl/train.py` | Extend `train_all_categories()` to accept `epsilon_start`, `epsilon_decay_ep`, `warmup` overrides |
| `scripts/warmstart_train.py` | New — CLI entrypoint for modes A/B/C |
| `scripts/compare_warmstart.py` | New — trajectory comparison table |

---

## Success Criteria

Benchmark chuẩn là bảng trajectory MPC (f0=0.95, inv=80, 14 ngày). RL phải **bằng hoặc tốt hơn** bảng này:

```
 Day |      f  leafy |      f   root |      f  fruit |      f  herbs
────────────────────────────────────────────────────────────────────────
   1 |  0.950  +0.20 |  0.950  +0.20 |  0.950  +0.20 |  0.950  +0.20
   2 |  0.807  +0.10 |  0.902  +0.20 |  0.836  +0.15 |  0.760  +0.05
   3 |  0.686  -0.30 |  0.857  +0.20 |  0.736  +0.00 |  0.608  -0.30
   4 |  0.583  -0.30 |  0.815  +0.15 |  0.647  -0.05 |      —   DISC
   5 |      —   DISC |  0.774  +0.05 |  0.570  -0.25 |      —   DISC
   6 |      —   DISC |  0.735  +0.00 |  0.501  -0.30 |      —   DISC
   7 |      —   DISC |  0.698  -0.05 |      —   DISC |      —   DISC
   8 |      —   DISC |  0.663  -0.15 |      —   DISC |      —   DISC
   9 |      —   DISC |  0.630  -0.25 |      —   DISC |      —   DISC
  10 |      —   DISC |  0.599  -0.30 |      —   DISC |      —   DISC
  11 |      —   DISC |  0.569  -0.30 |      —   DISC |      —   DISC
  12 |      —   DISC |  0.540  -0.30 |      —   DISC |      —   DISC
  13 |      —   DISC |  0.513  -0.30 |      —   DISC |      —   DISC
  14 |      —   DISC |      —   DISC |      —   DISC |      —   DISC
```

**Tiêu chí pass/fail:**

1. **Sign match** — mỗi (category, day) delta phải cùng dấu với MPC, hoặc đạt waste thấp hơn (tradeoff có thể chấp nhận)
2. **Trajectory delta vs MPC** — |RL_delta − MPC_delta| ≤ 0.05 trên ≥80% các ô không phải DISC
3. **eval_waste_event_rate** — ít nhất 1 mode ≤ MPC baseline đo trên 30 seed giống nhau
4. **Training throughput** — ≥3 eval checkpoints trong 30 phút (EVAL_EVERY = 200 ep thay vì 500)
5. **Mode ranking** — C ≤ B ≤ A về waste; nếu không thì ghi rõ lý do trong kết quả
