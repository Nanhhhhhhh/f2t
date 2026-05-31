# AUROC Improvement + Smooth MPC Pricing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tăng Waste AUROC từ 0.7745 → >0.85 bằng feature engineering, focal loss, MLP waste head, và thêm hard/soft smoothness constraint vào MPC controller để loại bỏ delta jump và degenerate behavior.

**Architecture:** Thêm 2 engineered feature vào obs (OBS_DIM 9→11) encode trực tiếp "bao nhiêu ngày đến khi hỏng" và "hàng tồn đủ bán không"; thay BCE bằng focal loss + tăng w_waste; thay linear waste_head bằng MLP 2 lớp; thêm hard constraint `max_delta_step=0.10` vào MPC scoring + smooth clearability override.

**Tech Stack:** PyTorch ≥ 2.0 (MPS), pytest, numpy, pandas, scikit-learn

---

## File Map

| File | Thay đổi |
|------|---------|
| `src/env/market_env.py` | `OBS_DIM = 11`, thêm feature [9][10] vào `_build_obs()` |
| `src/forecaster/model.py` | `ForecasterConfig.obs_dim = 11`, `waste_head` → MLP Sequential |
| `src/forecaster/losses.py` | Thêm `focal_loss()`, đổi `w_waste` default 1.0 → 3.0 |
| `src/forecaster/train.py` | `batch_size=512`, `num_workers=4`, `pin_memory=True`, `persistent_workers=True`, `torch.compile` |
| `src/mpc/controller.py` | `MPCConfig`: thêm `max_delta_step=0.10`, `lambda_move=5.0`; hard constraint trong `decide()`; smooth clearability; quadratic penalty |
| `tests/test_market_env.py` | Update `test_obs_dim_is_9` → `test_obs_dim_is_11`, thêm 3 test mới |
| `tests/test_forecaster_model.py` | Update input dim + param count tests, thêm MLP test |
| `tests/test_losses.py` | File mới: test `focal_loss`, `combined_loss` default w_waste |
| `tests/test_mpc.py` | Update clearability test, thêm 3 smoothness test |

---

## Task 1: Feature Engineering — `src/env/market_env.py`

**Files:**
- Modify: `src/env/market_env.py`
- Modify: `tests/test_market_env.py`

- [ ] **Step 1.1: Viết failing test cho OBS_DIM=11**

Mở `tests/test_market_env.py`. Thay `test_obs_dim_is_9` và thêm 3 test mới:

```python
# Thay:
def test_obs_dim_is_9():
    assert OBS_DIM == 9

# Thành:
def test_obs_dim_is_11():
    assert OBS_DIM == 11


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
    assert obs_hi["leafy"][9] > obs_lo["leafy"][9]


def test_inv_coverage_zero_when_no_inventory():
    """obs[10] phải là 0 khi inventory = 0."""
    env = MarketEnv(seed=7)
    env.reset()
    env._inventory["herbs"] = 0
    obs = env._build_obs()
    assert obs["herbs"][10] == pytest.approx(0.0, abs=1e-6)


def test_new_features_normalized():
    """obs[9] và obs[10] phải nằm trong [0, 1] sau nhiều bước."""
    rng = np.random.default_rng(0)
    env = MarketEnv(seed=0)
    env.reset()
    for _ in range(50):
        deltas = {cat: float(rng.uniform(-0.30, 0.20)) for cat in CATEGORIES}
        obs, _, done, _ = env.step(deltas)
        for cat in CATEGORIES:
            assert 0.0 <= obs[cat][9] <= 1.0 + 1e-6, f"{cat} obs[9]={obs[cat][9]}"
            assert 0.0 <= obs[cat][10] <= 1.0 + 1e-6, f"{cat} obs[10]={obs[cat][10]}"
        if done:
            break
```

- [ ] **Step 1.2: Chạy để xác nhận test FAIL**

```bash
cd /Users/macos/dynamic-pricing-v3
python -m pytest tests/test_market_env.py::test_obs_dim_is_11 \
    tests/test_market_env.py::test_days_to_waste_feature_decreases_with_freshness \
    tests/test_market_env.py::test_inv_coverage_zero_when_no_inventory \
    tests/test_market_env.py::test_new_features_normalized -v
```

Expected: 4 FAIL (OBS_DIM vẫn là 9, index 9/10 chưa tồn tại)

- [ ] **Step 1.3: Implement feature engineering trong `_build_obs()`**

Trong `src/env/market_env.py`, thay dòng `OBS_DIM = 9` thành `OBS_DIM = 11`.

Thay toàn bộ `_build_obs()`:

```python
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

        # [9] days_to_waste_threshold: ngày còn lại đến khi freshness < WASTE_THRESHOLD
        decay_rate = DAILY_DECAY[cat]
        if f <= WASTE_THRESHOLD or decay_rate >= 1.0:
            days_to_waste = 0.0
        else:
            days_to_waste = math.log(WASTE_THRESHOLD / f) / math.log(decay_rate)

        # [10] inv_coverage_7d: tỉ lệ tồn kho / dự báo bán 7 ngày
        coverage_7d = inv / max(self._demand_yesterday[cat] * 7, 1.0)

        obs[cat] = np.array([
            f,                                                                                    # [0] freshness
            min(inv / 100.0, 2.0),                                                                # [1] inv_ratio
            self._prices[cat] / p["ref_price"],                                                   # [2] price_ratio
            math.sin(2 * math.pi * dow / 7),                                                      # [3] sin_dow
            math.cos(2 * math.pi * dow / 7),                                                      # [4] cos_dow
            min(days_to_next / 30.0, 1.0),                                                        # [5] days_to_restock
            float(np.clip(self._demand_yesterday[cat] / p["base_demand"], 0.0, 3.0)),             # [6] demand_ratio
            self._prev_delta[cat],                                                                 # [7] prev_delta
            float(np.clip(comp_ratio, 0.5, 2.0)),                                                 # [8] competitor_ratio
            float(np.clip(days_to_waste, 0.0, 14.0)) / 14.0,                                     # [9] days_to_waste_threshold
            float(np.clip(coverage_7d, 0.0, 3.0)) / 3.0,                                         # [10] inv_coverage_7d
        ], dtype=np.float32)
    return obs
```

- [ ] **Step 1.4: Chạy để xác nhận test PASS**

```bash
python -m pytest tests/test_market_env.py -v
```

Expected: tất cả PASS (kể cả các test cũ như `test_reset_returns_correct_shape`, `test_waste_fires_at_050`, v.v.)

- [ ] **Step 1.5: Commit**

```bash
git add src/env/market_env.py tests/test_market_env.py
git commit -m "feat: add days_to_waste and inv_coverage features to obs (OBS_DIM 9→11)"
```

---

## Task 2: Model Architecture — `src/forecaster/model.py`

**Files:**
- Modify: `src/forecaster/model.py`
- Modify: `tests/test_forecaster_model.py`

- [ ] **Step 2.1: Viết failing tests cho obs_dim=11 và MLP waste_head**

Trong `tests/test_forecaster_model.py`, thêm 2 test và sửa 2 test cũ:

```python
# Sửa test_forward_output_keys — đổi input dim 9→11:
def test_forward_output_keys():
    cfg = ForecasterConfig()
    model = ForecasterLSTM(cfg)
    features = torch.randn(4, 21, 11)      # 11 thay vì 9
    cat_idx  = torch.tensor([0, 1, 2, 3])
    out = model(features, cat_idx)
    assert "demand" in out
    assert "waste_logit" in out


# Sửa test_output_shapes — đổi input dim 9→11:
def test_output_shapes():
    cfg = ForecasterConfig()
    model = ForecasterLSTM(cfg)
    B = 8
    features = torch.randn(B, 21, 11)      # 11 thay vì 9
    cat_idx  = torch.zeros(B, dtype=torch.long)
    out = model(features, cat_idx)
    assert out["demand"].shape == (B,)
    assert out["waste_logit"].shape == (B,)


# Thêm test mới:
def test_waste_head_is_mlp():
    """waste_head phải là Sequential (MLP), không phải Linear đơn."""
    cfg = ForecasterConfig()
    model = ForecasterLSTM(cfg)
    assert isinstance(model.waste_head, torch.nn.Sequential), \
        "waste_head phải là nn.Sequential"
    # 4 sub-modules: Linear → ReLU → Dropout → Linear
    assert len(list(model.waste_head.children())) == 4


def test_model_param_count():
    """Param count phải nằm trong khoảng hợp lý sau khi tăng obs_dim và MLP head."""
    cfg = ForecasterConfig()
    model = ForecasterLSTM(cfg)
    n = sum(p.numel() for p in model.parameters())
    assert 210_000 < n < 225_000, f"Param count {n} ngoài khoảng kỳ vọng"
```

- [ ] **Step 2.2: Chạy để xác nhận test FAIL**

```bash
python -m pytest tests/test_forecaster_model.py -v
```

Expected: `test_forward_output_keys`, `test_output_shapes` FAIL (dim mismatch), `test_waste_head_is_mlp` FAIL, `test_model_param_count` FAIL

- [ ] **Step 2.3: Implement trong `model.py`**

Thay toàn bộ nội dung `src/forecaster/model.py`:

```python
import torch
import torch.nn as nn
from dataclasses import dataclass
from typing import Dict


@dataclass
class ForecasterConfig:
    obs_dim:       int   = 11
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
        self.waste_head  = nn.Sequential(
            nn.Linear(z_dim, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, 1),
        )

    def forward(
        self, features: torch.Tensor, category_idx: torch.Tensor
    ) -> Dict[str, torch.Tensor]:
        lstm_out, _ = self.lstm(features)
        last = lstm_out[:, -1, :]
        cat_vec = self.cat_embed(category_idx)
        z = torch.cat([last, cat_vec], dim=-1)
        return {
            "demand":      self.demand_head(z).squeeze(-1),
            "waste_logit": self.waste_head(z).squeeze(-1),
        }
```

- [ ] **Step 2.4: Chạy để xác nhận test PASS**

```bash
python -m pytest tests/test_forecaster_model.py -v
```

Expected: tất cả PASS

- [ ] **Step 2.5: Commit**

```bash
git add src/forecaster/model.py tests/test_forecaster_model.py
git commit -m "feat: obs_dim 9→11, waste_head Linear→MLP(136→64→1)"
```

---

## Task 3: Focal Loss + w_waste — `src/forecaster/losses.py`

**Files:**
- Modify: `src/forecaster/losses.py`
- Create: `tests/test_losses.py`

- [ ] **Step 3.1: Viết failing tests**

Tạo file `tests/test_losses.py`:

```python
import pytest
import torch
from src.forecaster.losses import focal_loss, combined_loss, pos_weight_from_rate


def test_focal_loss_penalizes_hard_examples_more():
    """focal_loss với γ=2 phải penalize hard examples (p_t~0.5) hơn easy examples (p_t~1)."""
    hard_logit = torch.tensor([0.0])    # p_t ≈ 0.5 → hard
    hard_label = torch.tensor([1.0])
    hard = focal_loss(hard_logit, hard_label, gamma=2.0)

    easy_logit = torch.tensor([5.0])    # p_t ≈ 0.99 → easy
    easy_label = torch.tensor([1.0])
    easy = focal_loss(easy_logit, easy_label, gamma=2.0)

    assert hard > easy, f"hard={hard.item():.4f} phải > easy={easy.item():.4f}"


def test_focal_loss_gamma_zero_equals_bce():
    """Khi γ=0, focal_loss phải bằng standard BCE."""
    import torch.nn.functional as F
    logit = torch.tensor([0.5, -0.5, 1.0])
    label = torch.tensor([1.0, 0.0, 1.0])
    fl = focal_loss(logit, label, gamma=0.0)
    bce = F.binary_cross_entropy_with_logits(logit, label)
    assert fl == pytest.approx(bce.item(), rel=1e-4)


def test_focal_loss_output_is_scalar():
    logit = torch.randn(16)
    label = torch.randint(0, 2, (16,)).float()
    out = focal_loss(logit, label, gamma=2.0)
    assert out.shape == ()
    assert out.item() > 0


def test_combined_loss_default_w_waste_is_3():
    """w_waste default phải là 3.0."""
    import inspect
    sig = inspect.signature(combined_loss)
    assert sig.parameters["w_waste"].default == 3.0


def test_combined_loss_scalar_positive():
    d_pred = torch.tensor([3.0, 5.0, 2.0])
    d_true = torch.tensor([3.5, 4.0, 2.5])
    w_logit = torch.tensor([0.5, -0.5, 1.0])
    w_true  = torch.tensor([1.0, 0.0, 1.0])
    pw = pos_weight_from_rate(0.43)
    loss = combined_loss(d_pred, d_true, w_logit, w_true, pw)
    assert loss.shape == ()
    assert loss.item() > 0
```

- [ ] **Step 3.2: Chạy để xác nhận test FAIL**

```bash
python -m pytest tests/test_losses.py -v
```

Expected: FAIL (`focal_loss` chưa tồn tại)

- [ ] **Step 3.3: Implement focal_loss và update combined_loss**

Thay toàn bộ `src/forecaster/losses.py`:

```python
import torch
import torch.nn.functional as F


def pos_weight_from_rate(positive_rate: float) -> float:
    return (1.0 - positive_rate) / positive_rate


def focal_loss(
    logit: torch.Tensor,
    target: torch.Tensor,
    gamma: float = 2.0,
    pos_weight: float = 1.0,
) -> torch.Tensor:
    pw = torch.tensor(pos_weight, dtype=torch.float32, device=logit.device)
    bce = F.binary_cross_entropy_with_logits(
        logit, target, pos_weight=pw, reduction="none"
    )
    p_t = torch.exp(-bce)
    return ((1.0 - p_t) ** gamma * bce).mean()


def combined_loss(
    demand_pred: torch.Tensor,
    demand_true: torch.Tensor,
    waste_logit: torch.Tensor,
    waste_true: torch.Tensor,
    pos_weight: float,
    w_demand: float = 1.0,
    w_waste: float = 3.0,
) -> torch.Tensor:
    l_demand = F.huber_loss(demand_pred, demand_true, delta=1.0)
    l_waste  = focal_loss(waste_logit, waste_true, gamma=2.0, pos_weight=pos_weight)
    return w_demand * l_demand + w_waste * l_waste
```

- [ ] **Step 3.4: Chạy để xác nhận test PASS**

```bash
python -m pytest tests/test_losses.py tests/test_forecaster_model.py -v
```

Expected: tất cả PASS

- [ ] **Step 3.5: Commit**

```bash
git add src/forecaster/losses.py tests/test_losses.py
git commit -m "feat: replace BCE with focal loss (gamma=2), w_waste default 1.0→3.0"
```

---

## Task 4: Training Speed — `src/forecaster/train.py`

**Files:**
- Modify: `src/forecaster/train.py`

*(Không có unit test riêng — các thay đổi thuần config/infra. Verify bằng cách chạy 1 epoch ngắn.)*

- [ ] **Step 4.1: Update `TrainConfig` và DataLoader**

Trong `src/forecaster/train.py`, thay `TrainConfig` và 2 `DataLoader` calls:

```python
@dataclass
class TrainConfig:
    lr:             float = 3e-4
    weight_decay:   float = 1e-4
    batch_size:     int   = 512        # 256 → 512
    max_epochs:     int   = 50
    patience:       int   = 5
    grad_clip:      float = 1.0
    checkpoint_dir: str   = "checkpoints"
    device:         str   = "mps" if __import__("torch").backends.mps.is_available() else "cpu"
```

Trong hàm `train()`, thay 2 dòng DataLoader:

```python
train_loader = DataLoader(
    train_ds, batch_size=train_cfg.batch_size,
    shuffle=True, num_workers=4,
    pin_memory=True, persistent_workers=True,
)
val_loader = DataLoader(
    val_ds, batch_size=train_cfg.batch_size,
    shuffle=False, num_workers=4,
    pin_memory=True, persistent_workers=True,
)
```

- [ ] **Step 4.2: Thêm `torch.compile` sau khi tạo model**

Trong `train()`, sau dòng `model = ForecasterLSTM(model_cfg).to(device)`, thêm:

```python
if hasattr(torch, "compile"):
    try:
        model = torch.compile(model)
    except Exception:
        pass  # MPS fallback gracefully nếu compile không hỗ trợ op nào
```

- [ ] **Step 4.3: Verify smoke test — 2 epoch**

```bash
cd /Users/macos/dynamic-pricing-v3
python -c "
from src.forecaster.train import train, TrainConfig
cfg = TrainConfig(max_epochs=2, patience=10)
ckpt = train(train_cfg=cfg)
print('Smoke test OK:', ckpt)
"
```

Expected: in ra 2 epoch log + `Smoke test OK: checkpoints/forecaster_v4_best.pt`, không crash, không warning về dtype hay MPS.

- [ ] **Step 4.4: Commit**

```bash
git add src/forecaster/train.py
git commit -m "perf: batch_size 256→512, num_workers=4, pin_memory, torch.compile"
```

---

## Task 5: MPC Smoothness — `src/mpc/controller.py`

**Files:**
- Modify: `src/mpc/controller.py`
- Modify: `tests/test_mpc.py`

- [ ] **Step 5.1: Viết failing tests cho smoothness constraints**

Trong `tests/test_mpc.py`, thêm 3 test mới và sửa `test_clearability_override_for_root`:

```python
# Sửa test_clearability_override_for_root — từ -0.30 thành -0.10 (smooth descent):
def test_clearability_override_for_root(mpc):
    """Clearability override phải descent smooth (1 bước = max_delta_step), không nhảy thẳng -0.30."""
    obs = _make_obs_window(freshness=0.52, inv_ratio=2.0)
    result = mpc.decide(obs, category="root", current_price=1.06,
                         current_inv=200, current_freshness=0.52, prev_delta=0.0)
    # Từ prev_delta=0.0, chỉ được di chuyển max_delta_step=0.10 về phía -
    assert result["delta"] == pytest.approx(-mpc.cfg.max_delta_step, abs=0.01)


# 3 test mới:
def test_delta_change_respects_max_step(mpc):
    """Delta không bao giờ thay đổi quá max_delta_step=0.10 trong một lần gọi."""
    obs = _make_obs_window(freshness=0.9, inv_ratio=0.5)
    result = mpc.decide(obs, "leafy", 1.48, 50, 0.9, prev_delta=-0.30)
    assert result["delta"] >= -0.30 - 1e-6
    assert result["delta"] <= -0.30 + mpc.cfg.max_delta_step + 1e-6


def test_no_jump_from_min_to_max(mpc):
    """Không thể nhảy từ -0.30 lên +0.20 trong một bước."""
    obs = _make_obs_window(freshness=0.95, inv_ratio=0.1)
    result = mpc.decide(obs, "leafy", 1.48, 5, 0.95, prev_delta=-0.30)
    # Từ -0.30, tối đa lên được -0.30 + 0.10 = -0.20
    assert result["delta"] <= -0.30 + mpc.cfg.max_delta_step + 1e-6


def test_smooth_ascent_from_negative(mpc):
    """Từ prev_delta=-0.20, không thể chọn +0.10 (cách nhau 0.30 > max_delta_step)."""
    obs = _make_obs_window(freshness=0.95, inv_ratio=0.05)
    result = mpc.decide(obs, "leafy", 1.48, 5, 0.95, prev_delta=-0.20)
    # Feasible range: [-0.30, -0.20, -0.10], tối đa lên được -0.10
    assert result["delta"] <= -0.20 + mpc.cfg.max_delta_step + 1e-6
```

- [ ] **Step 5.2: Chạy để xác nhận test FAIL**

```bash
python -m pytest tests/test_mpc.py::test_delta_change_respects_max_step \
    tests/test_mpc.py::test_no_jump_from_min_to_max \
    tests/test_mpc.py::test_smooth_ascent_from_negative \
    tests/test_mpc.py::test_clearability_override_for_root -v
```

Expected: 4 FAIL (max_delta_step chưa tồn tại, clearability vẫn trả -0.30)

- [ ] **Step 5.3: Implement smoothness trong `controller.py`**

Thay `MPCConfig`:

```python
@dataclass
class MPCConfig:
    lambda_waste:         float = 10.0
    lambda_move:          float = 5.0   # 3.0 → 5.0
    floor_ratio:          float = 0.85
    horizon:              int   = 7
    clearability_horizon: int   = 6
    tier_b_gamma:         float = 0.0
    max_delta_step:       float = 0.10  # hard constraint: max change per step
```

Trong `decide()`, thay phần **clearability override return** (dòng 99-108):

```python
        if (self.cfg.clearability_horizon > 0
                and current_freshness > WASTE_THRESHOLD
                and beta_base > -1.0
                and 0 < t_critical < self.cfg.clearability_horizon):
            lo_ratio    = 1.0 + CANDIDATES[0]
            max_md_rate = (d_hat_0 / self.cfg.horizon) * (lo_ratio ** beta_f)
            clearable   = max_md_rate * t_critical
            if clearable < 0.80 * current_inv:
                # Smooth descent: không nhảy thẳng -0.30, mà di chuyển max_delta_step mỗi bước
                target_delta = max(CANDIDATES[0], prev_delta - self.cfg.max_delta_step)
                return {
                    "delta":     float(target_delta),
                    "reason":    (f"clearability_override(smooth): t_crit={t_critical:.1f}d "
                                  f"< {self.cfg.clearability_horizon}d, "
                                  f"clearable={clearable:.0f} < 0.80×{current_inv}, "
                                  f"target={target_delta:+.2f}"),
                    "scores":    [],
                    "d_hat_0":   d_hat_0,
                    "p_waste_0": p_waste_0,
                    "t_critical": t_critical,
                }
```

Sau `scores = self._score_all(...)` (dòng 111), thêm hard constraint lọc candidates trước khi chọn best:

```python
        scores = self._score_all(
            CANDIDATES, current_price, d_hat_0, p_waste_0, t_critical,
            current_inv, prev_delta, ref_price, cost_floor, price_ceil,
            beta_f, current_freshness,
        )

        # Hard constraint: chỉ chọn candidates nằm trong [prev_delta ± max_delta_step]
        step = self.cfg.max_delta_step
        in_range = (CANDIDATES >= prev_delta - step) & (CANDIDATES <= prev_delta + step)
        if not in_range.any():
            in_range = np.ones(len(CANDIDATES), dtype=bool)  # fallback: full set

        # Revenue floor constraint (chỉ áp trên feasible set)
        rev_0    = scores["revenues"][ZERO_IDX]
        feasible = scores["revenues"] >= self.cfg.floor_ratio * rev_0
        feasible = feasible & in_range
        if not feasible.any():
            # Ưu tiên in_range trước, rồi mới fallback full set
            masked = np.where(in_range, scores["total_scores"], np.inf)
            best_idx = int(np.argmin(masked))
        else:
            masked = np.where(feasible, scores["total_scores"], np.inf)
            best_idx = int(np.argmin(masked))
```

Trong `_score_all()`, thay dòng `move_penalties`:

```python
        # Soft penalty: linear + quadratic để penalize large jump mạnh hơn
        diff = candidates - prev_delta
        move_penalties = self.cfg.lambda_move * (np.abs(diff) + 0.5 * diff ** 2)
```

- [ ] **Step 5.4: Chạy để xác nhận test PASS**

```bash
python -m pytest tests/test_mpc.py -v
```

Expected: tất cả PASS (kể cả các test cũ: `test_high_freshness_does_not_max_discount`, `test_low_freshness_high_inv_discounts`, `test_result_has_required_keys`, `test_delta_within_bounds`)

- [ ] **Step 5.5: Commit**

```bash
git add src/mpc/controller.py tests/test_mpc.py
git commit -m "feat: MPC smooth pricing — max_delta_step=0.10, lambda_move=5.0, quadratic penalty"
```

---

## Task 6: Toàn bộ test suite + Full Pipeline

**Files:**
- Run: `tests/` (full suite)
- Run: `scripts/run_pipeline.py`

- [ ] **Step 6.1: Chạy toàn bộ test suite**

```bash
cd /Users/macos/dynamic-pricing-v3
python -m pytest tests/ -v
```

Expected: tất cả PASS. Nếu có test fail:
- `test_forecaster_data.py` / `test_forecaster_eval.py`: có thể dùng checkpoint cũ với obs_dim=9 — bỏ qua hoặc skip những test load checkpoint cụ thể
- `test_market_env.py`: phải pass hoàn toàn (không còn `test_obs_dim_is_9`)

- [ ] **Step 6.2: Chạy full pipeline**

```bash
python scripts/run_pipeline.py 2>&1 | tee logs/pipeline_v2.log
```

Expected output markers:
```
[done in 0mXXs]   ← Step 1 preprocessing
[done in 0mXXs]   ← Step 2 data generation  
Epoch 01/50 ...   ← Step 3 training bắt đầu
Early stop at epoch XX ...
Best checkpoint: checkpoints/forecaster_v4_best.pt (epoch XX, val_loss=XX.XXXX)
[done in XXmXXs]  ← Training xong, kỳ vọng < 25 phút

Waste AUROC    : X.XXXX  (threshold: > 0.85)   ← kỳ vọng > 0.85

MPC_v3        : waste=X.XXXX  rev=XXXX.X       ← kỳ vọng rev ≥ 2392

Policy dynamism check:
  => PASS
```

- [ ] **Step 6.3: Verify success criteria**

Sau khi pipeline hoàn thành, kiểm tra `logs/pipeline_v2.log`:

| Metric | Target | Check |
|--------|--------|-------|
| Waste AUROC (overall) | > 0.85 | `grep "Waste AUROC"` |
| Waste AUROC leafy | > 0.75 | `grep "leafy"` |
| Waste AUROC fruit | > 0.75 | `grep "fruit"` |
| Waste AUROC herbs | > 0.75 | `grep "herbs"` |
| Demand MAE/day | < 3.0 | `grep "Demand MAE"` |
| MPC revenue | ≥ 2392 | `grep "MPC_v3"` |
| MPC waste rate | ≤ 0.0730 | `grep "MPC_v3"` |
| Training time | < 25 min | `grep "done in"` (Step 3) |
| Dynamism check | PASS | `grep "=> PASS"` |

Nếu AUROC overall < 0.85 nhưng đã tăng đáng kể so với 0.7745: pipeline đã cải thiện, có thể retrain thêm 1 lần với `max_epochs=100` hoặc tăng `w_waste=4.0`.

- [ ] **Step 6.4: Commit kết quả**

```bash
git add logs/pipeline_v2.log
git commit -m "results: pipeline v2 — AUROC improvement + smooth MPC"
```
