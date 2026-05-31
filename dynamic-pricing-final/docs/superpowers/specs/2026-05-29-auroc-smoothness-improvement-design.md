# Design: AUROC Improvement + Smooth MPC Pricing
**Date:** 2026-05-29  
**Status:** Approved

## Problem

Pipeline kết quả hiện tại:
- Waste AUROC = 0.7745 (threshold > 0.85) — chưa đạt, đặc biệt leafy (0.67), fruit (0.61), herbs (0.59)
- MPC controller có thể nhảy đột ngột (e.g. -0.30 → +0.20 trong 1 bước) hoặc degenerate tại -0.30

## Root Causes

| # | Vấn đề | Vị trí | Tác động |
|---|--------|--------|---------|
| 1 | **Feature gap** | `market_env.py`, `data.py` | Model phải tự học waste = (freshness < 0.5 trong 7 ngày AND inv > 0), nhưng không có feature nào encode trực tiếp thông tin này |
| 2 | **Loss imbalance** | `losses.py` | Huber loss (demand ~10–50 units) lấn át BCE binary (0/1); w_waste=1.0 quá thấp |
| 3 | **Waste head yếu** | `model.py` | `Linear(136, 1)` không đủ capacity để học decision boundary phức tạp |
| 4 | **MPC jump / degenerate** | `controller.py` | `clearability_override` hard-code -0.30; move_penalty linear quá yếu; không có hard constraint |

## Approach: Full (Feature Eng + Loss/Arch + Speed + Smoothness)

### Section 1 — Feature Engineering

**File:** `src/env/market_env.py` — `_build_obs()`  
**File:** `src/forecaster/model.py` — `ForecasterConfig`  
**`OBS_DIM`: 9 → 11**

Thêm 2 feature vào obs:

```
[9]  days_to_waste_threshold  = clip(log(0.5/f) / log(decay_rate), 0, 14) / 14.0
     — số ngày còn lại trước khi freshness < 0.5 (worst-case, không bán được gì)
     — normalize về [0, 1]

[10] inv_coverage_7d  = clip(inv / max(demand_yesterday * 7, 1), 0, 3) / 3.0
     — tỉ lệ hàng tồn so với dự báo bán 7 ngày; >1 = dư hàng → risk waste cao
     — normalize về [0, 1]
```

Kéo theo: `ForecasterConfig.obs_dim = 11`, toàn bộ data generation phải chạy lại.

### Section 2 — Loss + Architecture

**File:** `src/forecaster/losses.py`

Thay BCE bằng **focal loss** (γ=2.0) cho waste head, tăng `w_waste` từ 1.0 → 3.0:

```python
def focal_loss(logit, target, gamma=2.0, pos_weight_tensor=None):
    bce = F.binary_cross_entropy_with_logits(
        logit, target, pos_weight=pos_weight_tensor, reduction="none")
    p_t = torch.exp(-bce)
    return ((1 - p_t) ** gamma * bce).mean()

def combined_loss(..., w_demand=1.0, w_waste=3.0):
    l_demand = F.huber_loss(demand_pred, demand_true, delta=1.0)
    l_waste  = focal_loss(waste_logit, waste_true, gamma=2.0,
                          pos_weight_tensor=torch.tensor(pos_weight))
    return w_demand * l_demand + w_waste * l_waste
```

**File:** `src/forecaster/model.py`

Thay `waste_head` từ Linear → MLP 2 lớp:

```python
self.waste_head = nn.Sequential(
    nn.Linear(z_dim, 64),
    nn.ReLU(),
    nn.Dropout(0.2),
    nn.Linear(64, 1),
)
```

`z_dim` = 128 (lstm_hidden) + 8 (cat_embed) = 136, không đổi.

### Section 3 — Speed Optimizations

**File:** `src/forecaster/train.py`

| Thay đổi | Trước | Sau | Lý do |
|---------|-------|-----|-------|
| `batch_size` | 256 | 512 | MPS throughput tốt hơn ở batch lớn |
| `num_workers` | 0 | 4 | Overlap data loading với GPU compute |
| `pin_memory` | False | True | Giảm latency host→MPS transfer |
| `persistent_workers` | False | True | Tránh spawn lại worker mỗi epoch |
| `torch.compile` | N/A | Bật nếu PyTorch ≥ 2.0, wrap trong `try/except` | Kernel fusion, giảm overhead; MPS có thể fallback một số op về CPU nên cần guard |

`torch.compile` implementation:
```python
if hasattr(torch, "compile"):
    try:
        model = torch.compile(model)
    except Exception:
        pass  # MPS fallback gracefully
```

Kỳ vọng: training từ ~40 phút → **~15–20 phút**.

### Section 4 — MPC Smoothness

**File:** `src/mpc/controller.py`

**Thêm vào `MPCConfig`:**
```python
max_delta_step: float = 0.10   # hard constraint: tốc độ thay đổi tối đa mỗi bước
lambda_move:    float = 5.0    # tăng từ 3.0
```

**Hard constraint trong `decide()`** — lọc candidates trước khi score:
```python
feasible = ((candidates >= prev_delta - cfg.max_delta_step) &
            (candidates <= prev_delta + cfg.max_delta_step))
cands_to_score = candidates[feasible] if feasible.any() else candidates
```
→ Cần ≥ 3 bước liên tiếp để đi từ 0 → -0.30; không bao giờ nhảy -0.30 → +0.20 (cần 5 bước).

**Clearability override — smooth descent:**
```python
# Trước: hard-code CANDIDATES[0] = -0.30
# Sau:
target_delta = max(CANDIDATES[0], prev_delta - cfg.max_delta_step)
```

**Soft penalty quadratic trong `_score_all()`:**
```python
# Trước: lambda_move * |delta - prev|
diff = candidates - prev_delta
move_penalties = cfg.lambda_move * (np.abs(diff) + 0.5 * diff**2)
```

**Dynamism check compatibility:**  
Với `prev_delta=0.0`, feasible range = `[-0.10 … +0.10]`:
- `f=0.9` → chọn `+0.10` (positive)
- `f=0.3` → chọn `-0.10` (negative)
- `+0.10 ≠ -0.10` → **PASS** ✓

**Lưu ý:** `policy_dynamism_check` dùng `OBS_DIM` từ `market_env.py` nên tự adapt khi OBS_DIM tăng lên 11.

## Files Affected

| File | Thay đổi |
|------|---------|
| `src/env/market_env.py` | Thêm 2 feature vào `_build_obs()`, `OBS_DIM = 11` |
| `src/forecaster/model.py` | `obs_dim=11`, `waste_head` → MLP |
| `src/forecaster/losses.py` | Focal loss, `w_waste=3.0` |
| `src/forecaster/train.py` | `batch_size=512`, workers, `pin_memory`, `torch.compile` |
| `src/mpc/controller.py` | `max_delta_step`, `lambda_move=5.0`, hard constraint, smooth override |

## Success Criteria

| Metric | Hiện tại | Target |
|--------|---------|--------|
| Waste AUROC (overall) | 0.7745 | > 0.85 |
| Waste AUROC leafy | 0.6726 | > 0.75 |
| Waste AUROC fruit | 0.6059 | > 0.75 |
| Waste AUROC herbs | 0.5935 | > 0.75 |
| Demand MAE/day | 1.888 | < 3.0 (giữ nguyên) |
| MPC revenue | 2392 | ≥ 2392 (không regression) |
| MPC waste rate | 0.0730 | ≤ 0.0730 (không regression) |
| Max delta jump/step | unbounded | ≤ 0.10 |
| Training time | ~40 min | < 25 min |
| Dynamism check | PASS | PASS |
