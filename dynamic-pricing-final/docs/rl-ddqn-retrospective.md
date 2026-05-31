# RL DDQN Pricing — Retrospective

> Branch: `feature/rl-ddqn` (worktree: `feature+ddqn-pricing`)
> Period: 2026-05-30
> Benchmark: N=200 episodes, seed=42

---

## Plan vs Thực Tế

### Architecture

| | Plan | Thực tế |
|---|---|---|
| Network | `LSTMDuelingQNet` (21×11 obs window) | Bắt đầu LSTM → pivot sang **`SharedMLPDuelingQNet`** (flat obs, cat embedding) |
| Agent | 4 `DuelingDDQNAgent` độc lập (per-category) | 1 **`MultiCatDDQNAgent`** shared — 1 backward pass/step |
| Obs | `(21, 11)` window | `(11,)` flat → sau đó `(13,)` với forecaster features |
| Episodes | 20,000 | **3,000** (đủ converge) |
| Checkpoints | `rl_{cat}_best.pt` × 4 | **`rl_shared_forecaster_best.pt`** × 1 |
| Forecaster | Không có trong plan | **Thêm**: `ForecasterEncoder` append `(d_hat, p_waste)` vào obs |

### Evolution của network (commit history)

```
LSTMDuelingQNet          ← plan gốc
  ↓ quá chậm trên MPS (8 calls/step)
MLPDuelingQNet           ← swap sang flat MLP
  ↓ mỗi category 1 agent → 4 backward passes/step
SharedMLPDuelingQNet     ← shared + cat embedding → 1 backward pass (3.5x faster)
  ↓ thêm forecaster làm feature extractor
SharedMLPDuelingQNet(13) ← obs_dim 11 → 13 với (d_hat, p_waste)
```

### Files trong plan — Status

| File | Plan | Thực tế |
|---|---|---|
| `src/rl/reward.py` | ✅ | ✅ implemented, tests pass |
| `src/rl/network.py` | `LSTMDuelingQNet` | ✅ + thêm `MLPDuelingQNet`, `SharedMLPDuelingQNet`, `SharedLSTMDuelingQNet` |
| `src/rl/replay.py` | ✅ | ✅ (numpy ring buffer thay deque, 20x faster) |
| `src/rl/agent.py` | `DuelingDDQNAgent` | ✅ + thêm `MultiCatDDQNAgent` (main), `_load_pretrained_lstm`, `forecaster_path` |
| `src/rl/evaluate.py` | ✅ | ✅ (wrap `MultiCatDDQNAgent` thay per-cat dict) |
| `src/rl/train.py` | 4 agents per category | ✅ 1 shared agent, thêm `forecaster_path` param |
| `scripts/train_rl.py` | `--episodes --device --ckpt-dir` | ✅ + `--forecaster` flag |
| `src/rl/forecaster_encoder.py` | ❌ không có trong plan | ✅ **thêm mới**: frozen forecaster → `encode_batch()` |
| `scripts/run_pipeline.py` | auto-include DDQN | ✅ |
| Tests `test_rl_*.py` | ✅ 5 test files | ✅ |

---

## Benchmark Results (N=200, seed=42)

| System | Waste ± SEM | Revenue | Δwaste vs MPC [95%CI] | p-value |
|---|---|---|---|---|
| **MPC** | 0.0883 ± 0.0012 | 2097.9 | — | — |
| **DDQN+forecaster** | **0.0622** ± 0.0007 | **2283.6** | [−0.0290, −0.0232] | 8.2e-43 |
| **DDQN-MLP** | 0.0628 ± 0.0008 | 2252.8 | [−0.0285, −0.0226] | 4.5e-41 |

→ DDQN+forecaster: **−29.5% waste**, **+8.8% revenue** vs MPC (p << 0.001)

### Plan targets vs đạt được

| Metric | Target | Đạt được | |
|---|---|---|---|
| Waste rate | ≤ 0.0666 | **0.0622** | ✅ |
| Revenue | ≥ 2203.9 | **2283.6** | ✅ |
| Dynamism check | PASS 4/4 | **PASS 4/4** | ✅ (MPC chỉ 3/4) |

---

## Dynamism Analysis

### Freshness vs Delta (static probe, seed=0 initial obs)

| Freshness | MPC | DDQN+fc | DDQN-MLP |
|---:|---:|---:|---:|
| 0.95 | +0.00 | −0.30 ⚠️ | −0.30 ⚠️ |
| 0.85 | +0.00 | −0.30 ⚠️ | −0.30 ⚠️ |
| 0.75 | +0.00 | −0.30 ⚠️ | −0.30 ⚠️ |
| 0.70 | −0.10 | −0.30 | −0.30 |
| 0.60 | −0.10 | −0.30 | −0.30 |
| 0.50 | −0.10 | +0.00 | +0.00 |

> ⚠️ leafy/root: DDQN aggressive discount ngay cả khi f cao. Nguyên nhân: `r_waste = -15 × units` quá dominant so với `r_target = -3 × (δ - target)²` → agent học "luôn discount để tránh waste" bất kể freshness.

fruit/herbs có behavior hợp lý hơn (DDQN+fc tăng giá khi f ≥ 0.85).

---

## Issues / Debt

1. **Aggressive discount khi f cao (leafy, root)**: `r_waste` weight quá lớn so với `r_target`. Cần tune: tăng `r_target` weight hoặc giảm `r_waste`.

2. **Forecaster overhead**: encoder chạy 2 batch forward passes/step → CPU nhanh hơn MPS cho batch nhỏ (4 cats). Cần benchmark để chọn device mặc định.

3. **`_orig_mod.` prefix**: checkpoint save/load cần strip prefix khi dùng `torch.compile`. Fix đã có trong `load()`.

4. **3000 vs 20000 episodes**: plan dự kiến 20k nhưng 3k đã converge. Chưa test xem 20k có cải thiện thêm không.

5. **Chưa test `test_rl_evaluate.py`** với `MultiCatDDQNAgent` — interface `ddqn_policy` wrap khác với plan (per-cat dict vs single agent).

---

## Kết luận

Plan gốc (4 per-category LSTM agents) bị thay thế hoàn toàn bởi 1 shared MLP agent + forecaster features. Lý do chính: tốc độ (LSTM quá chậm trên MPS với batch nhỏ) và simplicity (1 network, 1 checkpoint).

Kết quả vượt target plan trên cả 3 metrics. Vấn đề còn lại là behavior không intuitive ở freshness cao (leafy/root luôn discount), cần tune reward weights trước khi production.
