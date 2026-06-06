# progress/task-0.md — Verify ML integration

Nhật ký chi tiết từng leaf-task. Mỗi leaf-task: việc đã làm, lệnh chạy, output thật, kết luận (khớp/lệch), commit hash.

---

## T0.1 — Diff v3 ↔ final

**Ngày chạy:** 2026-06-07  
**Lệnh chính:**
```
diff -qr /Users/macos/dynamic-pricing-v3/src /Users/macos/f2t/dynamic-pricing-final/src -x '__pycache__' -x '*.pyc'
diff -qr .../preprocessing  (+ -x '*.pt' -x '*.npy' -x '*.parquet')
diff -qr .../scripts        (+ -x '*.pt' -x '*.npy' -x '*.parquet')
diff -qr .../tests          (+ -x '*.pt' -x '*.npy' -x '*.parquet')
diff -qr .../data           (+ -x '*.pt' -x '*.npy' -x '*.parquet')
diff -qr .../docs
diff requirements.txt
```

### Bảng kết quả

| File / thư mục | Trạng thái | Kết luận |
|---|---|---|
| `src/` (toàn bộ trừ network.py) | identical | Copy đầy đủ |
| `src/rl/network.py` | diff | Xem chi tiết bên dưới — cố ý, không phải bug |
| `src/forecaster/model.py` | identical | Copy đầy đủ |
| `src/rl/reward.py` | identical | Copy đầy đủ |
| `src/env/market_env.py` | identical | Copy đầy đủ |
| `preprocessing/` | only-final: `causal_data.csv` | File CSV thêm vào final; v3 không có — không ảnh hưởng ML core |
| `scripts/` | only-final: `create_test_checkpoints.py` | Script tiện ích thêm vào final cho test — không phải thiếu từ v3 |
| `tests/` | identical | Copy đầy đủ |
| `data/` | only-v3: `.DS_Store` | macOS metadata — bỏ qua |
| `docs/` | only-v3: `dqn-ddqn-architecture.md`, `docs/viz/` (5 HTML) | Tài liệu viz không copy sang final — không ảnh hưởng tính năng |
| `requirements.txt` | identical | Copy đầy đủ |

### Output diff thực tế — src/

```
Only in /Users/macos/dynamic-pricing-v3/src: .DS_Store
Files /Users/macos/dynamic-pricing-v3/src/rl/network.py and /Users/macos/f2t/dynamic-pricing-final/src/rl/network.py differ
```

### Chi tiết diff `src/rl/network.py`

```diff
0a1,2
> from __future__ import annotations
>
```

- **Khác biệt:** `dynamic-pricing-final/src/rl/network.py` có thêm 2 dòng đầu: `from __future__ import annotations` + dòng trống.
- v3: 79 dòng; final: 81 dòng (diff chỉ 2 dòng đầu).
- **Đánh giá:** Cố ý (backward-compat annotation import thường được thêm để tương thích Python 3.9 với type hints). Không thay đổi logic, không phải bug copy.

### Output diff 4 file lõi

```
===== src/rl/network.py =====
0a1,2
> from __future__ import annotations
>
(exit 1 — files differ)

===== src/forecaster/model.py =====
(no output — identical)

===== src/rl/reward.py =====
(no output — identical)

===== src/env/market_env.py =====
(no output — identical)
```

### Kết luận tổng

- **3 trong 4 file ML lõi:** `identical` (model.py, reward.py, market_env.py).
- **1 file khác biệt:** `src/rl/network.py` — chỉ thêm `from __future__ import annotations` ở đầu file, không thay đổi logic/kiến trúc.
- **Không có file nào `only-v3` trong `src/`** (tức là không thiếu gì từ copy ML core).
- **Tệp `only-final`** (`causal_data.csv`, `create_test_checkpoints.py`) là bổ sung cho môi trường final, không phải thiếu sót.
- **Tệp `only-v3`** trong `docs/` (viz HTML, architecture MD) là tài liệu, không ảnh hưởng runtime.
- **Kết luận: dynamic-pricing-final copy đầy đủ từ dynamic-pricing-v3.** Khác biệt duy nhất ở ML code là `from __future__ import annotations` trong network.py — cố ý, không phải bug.

## T0.2 — Verify model defs

**Ngày chạy:** 2026-06-07  
**Phương pháp:** Đọc trực tiếp 3 file model + sidecar main.py, đối chiếu từng hằng số / lời gọi.

---

### 1. SharedMLPDuelingQNet — `network.py:42`

**Định nghĩa thật** (`dynamic-pricing-final/src/rl/network.py:51-57`):
```python
def __init__(
    self,
    obs_dim: int = 10,
    n_cats: int = 4,
    cat_embed_dim: int = 8,
    hidden: int = 128,
    n_actions: int = 11,
) -> None:
```

**`forward` signature** (`network.py:68-73`):
```python
def forward(
    self,
    obs: torch.Tensor,
    cat_ids: torch.Tensor,
    mask: torch.Tensor | None = None,
) -> torch.Tensor:
```
Forward trả `torch.Tensor` shape `(B, n_actions)` — Q-values sau dueling aggregation + optional masked_fill.

**Lời gọi sidecar** (`pricing-sidecar/main.py:151-153`):
```python
ddqn_net = SharedMLPDuelingQNet(
    obs_dim=OBS_DIM, n_cats=N_CATS, cat_embed_dim=8, hidden=128, n_actions=N_ACTIONS
)
```
Với `OBS_DIM=10, N_CATS=4, N_ACTIONS=11` (main.py:72-74).

**Lời gọi inference** (`main.py:293`):
```python
q = ddqn_net(obs_t, cat_t, mask_t)
```

| Tham số | Sidecar | Định nghĩa model | Kết luận |
|---|---|---|---|
| `obs_dim` | `OBS_DIM=10` | `obs_dim: int = 10` | **KHỚP** |
| `n_cats` | `N_CATS=4` | `n_cats: int = 4` | **KHỚP** |
| `cat_embed_dim` | `8` (literal) | `cat_embed_dim: int = 8` | **KHỚP** |
| `hidden` | `128` (literal) | `hidden: int = 128` | **KHỚP** |
| `n_actions` | `N_ACTIONS=11` | `n_actions: int = 11` | **KHỚP** |
| `forward` args | `(obs_t, cat_t, mask_t)` | `(obs, cat_ids, mask)` | **KHỚP** |
| `forward` output | `q.squeeze().argmax()` → scalar | `(B, n_actions)` Tensor | **KHỚP** |

---

### 2. ForecasterConfig + ForecasterLSTM — `model.py:8` và `:18`

**ForecasterConfig** (`dynamic-pricing-final/src/forecaster/model.py:8-15`):
```python
@dataclass
class ForecasterConfig:
    obs_dim:       int   = 11
    window:        int   = 21
    n_categories:  int   = 4
    cat_embed_dim: int   = 8
    lstm_hidden:   int   = 128
    lstm_layers:   int   = 2
    lstm_dropout:  float = 0.2
```
**→ `obs_dim` TỒN TẠI** (field đầu tiên của dataclass, default=11).

**ForecasterLSTM.forward** (`model.py:39-49`):
```python
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
**→ Dict trả đúng 2 key: `"demand"` và `"waste_logit"`.**

**Lời gọi sidecar** (`main.py:135-137`):
```python
out = forecaster_net(feat, cidx)
d_hat   = float(max(0.0, out["demand"].item()))
p_waste = float(torch.sigmoid(out["waste_logit"]).item())
```

**Khởi tạo** (`main.py:166-167`):
```python
cfg = ForecasterConfig(**fckpt["model_cfg"])
forecaster_obs_dim = cfg.obs_dim
```

| Điểm | Sidecar | Định nghĩa model | Kết luận |
|---|---|---|---|
| Key `"demand"` | `out["demand"]` | `"demand": self.demand_head(z).squeeze(-1)` | **KHỚP** |
| Key `"waste_logit"` | `out["waste_logit"]` | `"waste_logit": self.waste_head(z).squeeze(-1)` | **KHỚP** |
| `cfg.obs_dim` được đọc | `forecaster_obs_dim = cfg.obs_dim` | field `obs_dim` tồn tại trong ForecasterConfig | **KHỚP** |
| `ForecasterConfig` default `obs_dim` | checkpoint truyền qua `**fckpt["model_cfg"]` | default=11, nhưng giá trị thật lấy từ checkpoint | **KHỚP** |

**Lưu ý:** `ForecasterConfig.obs_dim` default=11, nhưng sidecar không dùng default — nó load từ checkpoint (`cfg = ForecasterConfig(**fckpt["model_cfg"])`), nên giá trị thực runtime phụ thuộc checkpoint. Không có mismatch logic.

---

### 3. reward.py — CANDIDATES + compute_mask

**CANDIDATES** (`dynamic-pricing-final/src/rl/reward.py:6-7`):
```python
CANDIDATES = np.linspace(-0.30, 0.20, 11)
CANDIDATES[6] = 0.0
```
Giá trị thực tính toán: `[-0.30, -0.25, -0.20, -0.15, -0.10, -0.05, 0.0, 0.05, 0.10, 0.15, 0.20]`  
→ **11 phần tử** (index 0–10). `CANDIDATES[6] = 0.0` (override linspace để đảm bảo giá trị 0 chính xác).

**compute_mask** (`reward.py:48-72`):
```python
def compute_mask(freshness: float, cat: str = "") -> np.ndarray:
    mask = np.ones(11, dtype=bool)
    ...
    return mask
```
Trả `np.ndarray` shape `(11,)` dtype bool.

**Lời gọi sidecar** (`main.py:289-290, 296`):
```python
mask_np = compute_mask(sv.freshness, sv.category)
mask_t  = torch.tensor(mask_np, dtype=torch.bool).unsqueeze(0)
...
delta = float(CANDIDATES[action_idx])
```

| Điểm | Sidecar | Định nghĩa model | Kết luận |
|---|---|---|---|
| `len(CANDIDATES)` | `N_ACTIONS=11` (action_idx từ argmax over 11) | 11 phần tử | **KHỚP** |
| `compute_mask` trả shape | dùng làm bool mask cho `(B, 11)` Q-values | `np.ones(11, dtype=bool)` | **KHỚP** |
| `compute_mask` dtype | `torch.bool` | `dtype=bool` | **KHỚP** |
| `CANDIDATES[action_idx]` → delta | `delta = float(CANDIDATES[action_idx])` | float trong `[-0.30, 0.20]` | **KHỚP** |

---

### Tổng kết T0.2

| Nhóm | Kết quả |
|---|---|
| `SharedMLPDuelingQNet.__init__` (5 tham số) | **KHỚP hoàn toàn** |
| `SharedMLPDuelingQNet.forward` (obs, cat_ids, mask → Q-values) | **KHỚP hoàn toàn** |
| `ForecasterLSTM.forward` keys `demand` + `waste_logit` | **KHỚP hoàn toàn** |
| `ForecasterConfig.obs_dim` field tồn tại | **KHỚP** |
| `CANDIDATES` độ dài 11 = N_ACTIONS | **KHỚP** |
| `compute_mask` trả shape (11,) bool | **KHỚP** |

**Trạng thái: DONE — không có lệch nào.**

## T0.3 ⭐ — Obs parity
_(chưa bắt đầu)_

## T0.4 ⭐ — Forecaster parity
_(chưa bắt đầu)_

## T0.5 — Smoke-load checkpoint
_(chưa bắt đầu)_

## T0.6 — CoreML freshness
_(chưa bắt đầu)_

## T0.7 ⭐ — Backend payload
_(chưa bắt đầu)_

## T0.8 — Integration test
_(chưa bắt đầu)_

## T0.9 — Fix gaps
_(chưa bắt đầu)_

## T0.10 — Kết luận + nạp ledger
_(chưa bắt đầu)_
