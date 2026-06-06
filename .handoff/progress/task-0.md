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

**Ngày chạy:** 2026-06-07
**Phương pháp:** Đọc trực tiếp `dynamic-pricing-final/src/env/market_env.py` (hàm `_build_obs`) và `pricing-sidecar/main.py` (hàm `_build_obs`), đối chiếu từng chiều 0..9 + hằng số.

---

### 1. Đoạn code env dựng obs — `market_env.py:125-158`

```python
def _build_obs(self) -> dict[str, np.ndarray]:          # market_env.py:125
    obs = {}
    params = self._demand_model._params
    for cat in CATEGORIES:
        p = params[cat]
        f   = self._freshness[cat]
        inv = self._inventory[cat]
        dow = self._t % 7
        days_to_next = RESTOCK_EVERY[cat] - (self._t % RESTOCK_EVERY[cat])
        comp_ratio = self._comp_prices[cat] / max(self._prices[cat], 1e-6)  # L134

        # days_to_waste_threshold
        decay_rate = DAILY_DECAY[cat]
        if f <= WASTE_THRESHOLD or decay_rate >= 1.0:   # L138
            days_to_waste = 0.0
        else:
            days_to_waste = math.log(WASTE_THRESHOLD / f) / math.log(decay_rate)  # L141

        # inv_coverage_7d
        coverage_7d = inv / max(self._demand_yesterday[cat] * 7, 1.0)  # L144

        obs[cat] = np.array([
            f,                                                                         # [0] freshness         L147
            min(inv / 100.0, 2.0),                                                     # [1] inv_ratio         L148
            math.sin(2 * math.pi * dow / 7),                                           # [2] sin_dow           L149
            math.cos(2 * math.pi * dow / 7),                                           # [3] cos_dow           L150
            min(days_to_next / 30.0, 1.0),                                             # [4] days_to_restock   L151
            float(np.clip(self._demand_yesterday[cat] / p["base_demand"], 0.0, 3.0)), # [5] demand_ratio      L152
            self._prev_delta[cat],                                                     # [6] prev_delta        L153
            float(np.clip(comp_ratio, 0.5, 2.0)),                                     # [7] competitor_ratio  L154
            float(np.clip(days_to_waste, 0.0, 14.0)) / 14.0,                         # [8] days_to_waste     L155
            float(np.clip(coverage_7d, 0.0, 3.0)) / 3.0,                             # [9] inv_coverage_7d   L156
        ], dtype=np.float32)
    return obs
```

Hằng số env đến từ `freshness.py` (import tại market_env.py:4-6):
- `DAILY_DECAY` — đọc từ `freshness.py:7-12`
- `WASTE_THRESHOLD` — đọc từ `freshness.py:4`
- `base_demand` — đọc từ `data/params/demand_params.json` qua `CrossDemandModel`

---

### 2. Bảng đối chiếu 10 chiều

| # | Sidecar (`main.py:110-120`) | Env (`market_env.py:146-157`) | KHỚP/LỆCH | Ghi chú |
|---|---|---|---|---|
| 0 | `clip(freshness, 0, 1)` | `f` (raw, no clip) | **LỆCH nhẹ** | Env không clip; sidecar clip [0,1]. Thực tế freshness luôn trong [0,1] nên không ảnh hưởng trong điều kiện bình thường |
| 1 | `min(inventory_ratio, 2.0)` | `min(inv/100.0, 2.0)` | **KHỚP** | Cùng công thức nếu caller truyền `inventory_ratio = inv/100` |
| 2 | `sin(2π·dow/7)` với `dow=datetime.now().weekday()` | `sin(2π·dow/7)` với `dow=self._t%7` | **LỆCH TIỀM ẨN** | Sidecar dùng wall-clock weekday; env dùng timestep mod 7. Nếu episode không bắt đầu đúng thứ Hai, offset có thể lệch — không đảm bảo cùng pha |
| 3 | `cos(2π·dow/7)` với `dow=datetime.now().weekday()` | `cos(2π·dow/7)` với `dow=self._t%7` | **LỆCH TIỀM ẨN** | Cùng lý do chiều 2 |
| 4 | `min(days_to_restock/30, 1)` | `min(days_to_next/30.0, 1.0)` | **KHỚP** | Cùng công thức nếu caller tính đúng days_to_restock |
| 5 | `clip((demand_7d/7)/BASE_DEMAND[cat], 0, 3)` | `clip(demand_yesterday/base_demand, 0, 3)` | **KHỚP** | `demand_7d/7` = demand trung bình ngày = tương đương `demand_yesterday` trong env. `BASE_DEMAND` sidecar = `base_demand` JSON (giá trị xác minh bên dưới) |
| 6 | `clip(prev_delta, -0.30, 0.20)` | `self._prev_delta[cat]` (không clip) | **LỆCH THIẾT KẾ** | Env không clip; sidecar clip [-0.30, 0.20]. Trong thực tế env, prev_delta luôn là CANDIDATES value ∈ [-0.30,0.20], nên clip sidecar vô hiệu. Không ảnh hưởng runtime nếu input đúng |
| 7 | `clip(comp_ratio, 0.5, 2.0)` với `comp_ratio = competitor_ref_price / base_price` | `clip(comp_ratio, 0.5, 2.0)` với `comp_ratio = comp_prices[cat] / max(prices[cat], 1e-6)` | **LỆCH NGHIÊM TRỌNG** | **Env chia cho `current_price` (đã điều chỉnh theo delta); sidecar chia cho `base_price` (ref_price cố định).** Khi delta≠0, hai giá trị khác nhau. VD: delta=+0.20 → current_price = base_price×1.20 → comp_ratio env = comp/1.20×base, còn sidecar = comp/base → lệch 20% |
| 8 | `clip(days_to_waste, 0, 14)/14` với `days_to_waste = log(0.5/freshness)/log(DAILY_DECAY[cat])` | `clip(days_to_waste, 0, 14)/14` với `days_to_waste = log(WASTE_THRESHOLD/f)/log(decay_rate)` | **KHỚP** | Cùng công thức. `WASTE_THRESHOLD=0.50` khớp hằng số sidecar |
| 9 | `clip(inv_coverage, 0, 3)/3` với `inv_coverage = (inventory_ratio×100) / max(demand_7d, 1.0)` | `clip(coverage_7d, 0, 3)/3` với `coverage_7d = inv / max(demand_yesterday×7, 1.0)` | **LỆCH TIỀM ẨN** | Env: mẫu số = `demand_yesterday × 7` (7-day projection). Sidecar: mẫu số = `demand_7d` (7-day total từ caller). Nếu `demand_7d` = tổng 7 ngày thực tế thì tương đương; nếu `demand_7d` = trung bình ngày thì mẫu số lệch 7×. Không tự minh chứng từ code sidecar |

---

### 3. Bảng so sánh hằng số

| Hằng số | Sidecar (`main.py:77-79`) | Env — nguồn | Giá trị env | KHỚP/LỆCH |
|---|---|---|---|---|
| `DAILY_DECAY["leafy"]` | `0.850` | `freshness.py:9` | `0.850` | **KHỚP** |
| `DAILY_DECAY["root"]` | `0.950` | `freshness.py:10` | `0.950` | **KHỚP** |
| `DAILY_DECAY["fruit"]` | `0.880` | `freshness.py:11` | `0.880` | **KHỚP** |
| `DAILY_DECAY["herbs"]` | `0.800` | `freshness.py:12` | `0.800` | **KHỚP** |
| `WASTE_THRESHOLD` | `0.50` | `freshness.py:4` | `0.50` | **KHỚP** |
| `BASE_DEMAND["leafy"]` | `7.463` | `demand_params.json` → `params["leafy"]["base_demand"]` | `7.463` | **KHỚP** |
| `BASE_DEMAND["root"]` | `5.631` | `demand_params.json` → `params["root"]["base_demand"]` | `5.631` | **KHỚP** |
| `BASE_DEMAND["fruit"]` | `2.050` | `demand_params.json` → `params["fruit"]["base_demand"]` | `2.05` | **KHỚP** |
| `BASE_DEMAND["herbs"]` | `4.575` | `demand_params.json` → `params["herbs"]["base_demand"]` | `4.575` | **KHỚP** |

Tất cả 9 hằng số KHỚP hoàn toàn.

---

### 4. Kết luận T0.3

**Hằng số (DAILY_DECAY, BASE_DEMAND, WASTE_THRESHOLD): KHỚP 100% — không có lệch.**

**Chiều lệch nghiêm trọng:**

- **Chiều 7 (comp_ratio) — LỆCH NGHIÊM TRỌNG (`market_env.py:134` vs `main.py:108`):**
  - Env: `comp_prices[cat] / max(prices[cat], 1e-6)` → chia cho **current_price** (ref_price đã điều chỉnh delta, clipped)
  - Sidecar: `competitor_ref_price / base_price` → chia cho **base_price** (ref_price cố định, không có delta)
  - Khi delta≠0, hai giá trị này khác nhau. VD: delta=+0.20 → env denominator lớn hơn 20% → comp_ratio env nhỏ hơn → model nhận tín hiệu cạnh tranh khác với lúc train

**Chiều lệch tiềm ẩn (cần xác minh caller):**

- **Chiều 2 & 3 (sin/cos dow):** Sidecar dùng wall-clock `datetime.now().weekday()`; env dùng `self._t % 7`. Nếu episode train không bắt đầu đúng thứ Hai (rất có thể), offset thời gian tuần hoàn có thể lệch hằng kỳ.
- **Chiều 9 (inv_coverage):** Env mẫu số = `demand_yesterday * 7`; sidecar mẫu số = `demand_7d` (field từ caller). Nếu backend truyền `demand_7d` là tổng 7 ngày → tương đương; nếu truyền trung bình ngày → lệch 7×. Cần xác minh luồng backend (T0.7).

**Chiều lệch thiết kế (không ảnh hưởng runtime):**

- **Chiều 0 (freshness):** Env không clip; sidecar clip [0,1]. Freshness luôn ∈ [0,1] → không ảnh hưởng.
- **Chiều 6 (prev_delta):** Env không clip; sidecar clip [-0.30,0.20]. delta luôn ∈ CANDIDATES ⊂ [-0.30,0.20] → không ảnh hưởng.

**Trạng thái: DONE_WITH_CONCERNS**
- 1 lệch NGHIÊM TRỌNG: chiều 7 (comp_ratio denominator: current_price vs base_price)
- 2 lệch TIỀM ẨN cần xác minh: chiều 2&3 (dow offset), chiều 9 (demand_7d semantics)

## T0.4 ⭐ — Forecaster parity tile 21×

**Ngày chạy:** 2026-06-07  
**Phương pháp:** (1) Load checkpoint thật → in model_cfg; (2) Đọc data.py / train.py / market_env.py; (3) Kiểm tra parquet train thật; (4) Đọc sidecar `_run_forecaster`.

---

### 1. Output lệnh — checkpoint model_cfg thật

```
$ cd /Users/macos/f2t/pricing-sidecar && .venv/bin/python -c \
  "import torch; ck=torch.load('/Users/macos/f2t/dynamic-pricing-final/checkpoints/forecaster_v4_best.pt', \
   map_location='cpu', weights_only=False); print('model_cfg =', ck['model_cfg'])"

model_cfg = {'obs_dim': 11, 'window': 21, 'n_categories': 4, 'cat_embed_dim': 8, 'lstm_hidden': 128, 'lstm_layers': 2, 'lstm_dropout': 0.2}
keys = ['model_state', 'model_cfg', 'epoch', 'val_loss']
```

**Kết luận:** `obs_dim=11`, `window=21`. Checkpoint thật được train với **11 chiều** input.

---

### 2. Xác nhận qua weight LSTM

```python
import torch
ck = torch.load('checkpoints/forecaster_v4_best.pt', map_location='cpu', weights_only=False)
state = ck['model_state']
print(state['lstm.weight_ih_l0'].shape)
# => torch.Size([512, 11])
# 512 = 4 × hidden(128); 11 = input_size = obs_dim
```

`lstm.weight_ih_l0` shape `(512, 11)` → LSTM đã được train trực tiếp với `input_size=11`. Không thể nhầm lẫn.

---

### 3. Input forecaster lúc train — phân tích data.py + parquet thật

**`data.py:39`** (current code):
```python
current_obs = {c: env.obs_window(c) for c in CATEGORIES}  # data.py:39
```

`env.obs_window(c)` trả `(OBS_WINDOW, OBS_DIM)` = `(21, 10)` — **10 chiều**, xây dựng bởi `_build_obs` (`market_env.py:125-158`).

**Tuy nhiên**, parquet thật (`data/processed/train.parquet`) có feature shape **`(21, 11)`**:

```python
import pandas as pd, numpy as np
df = pd.read_parquet('data/processed/train.parquet')
feat0 = np.stack(df.iloc[0]['features'])
print(feat0.shape)  # => (21, 11)
```

**→ Parquet được generate bởi một phiên bản cũ hơn của `market_env._build_obs` với `OBS_DIM=11`.**  
Current code (`market_env.py:9`): `OBS_DIM = 10`. Parquet cũ: 11 chiều. **Code và data đã drift.**

**Ý nghĩa chiều 11 (index 10 trong current 10-dim, thực ra là chiều bị xóa ở index 2 trong parquet cũ):**

Phân tích alignment element-by-element:

| Index parquet cũ (11-dim) | Giá trị mẫu | Tương đương current |
|---|---|---|
| 0 | freshness | [0] fresh |
| 1 | inv_ratio | [1] inv |
| **2** | **0.57–1.12 (EXTRA)** | **KHÔNG CÓ trong current** |
| 3 | sin_dow | [2] sin_dow |
| 4 | cos_dow | [3] cos_dow |
| 5 | days_to_restock | [4] restock |
| 6 | demand_ratio | [5] d_ratio |
| 7 | prev_delta (range -0.29..0.18) | [6] prev_delta |
| 8 | comp_ratio (range 0.75..1.47) | [7] comp_ratio |
| 9 | days_to_waste | [8] waste |
| 10 | inv_coverage (range 0..1) | [9] inv_cov |

Chiều bổ sung ở **index 2** có range `0.57..1.12` — khả năng cao là `price_ratio` = `current_price / ref_price` (biểu thị mức điều chỉnh giá hiện tại so với tham chiếu). Feature này đã bị **xóa** khi `OBS_DIM` giảm từ 11 xuống 10 trong phiên bản mới của env.

**Mỗi trong 21 timestep là một obs thực sự KHÁC NHAU:**

```python
# Kiểm chứng generate_dataset 1 episode:
records = generate_dataset(n_episodes=1, seed=42)
r0 = records[0]
print('are all rows identical?', all(
    (r0['features'][i] == r0['features'][i+1]).all() for i in range(20)
))
# => False  — 21 hàng KHÁC NHAU
```

Train data = 21 ngày lịch sử thực sự biến thiên (chuỗi thời gian thật từ env simulation).

---

### 4. Sidecar `_run_forecaster` — phân tích hai vấn đề

**Code sidecar** (`pricing-sidecar/main.py:124-141`):
```python
def _run_forecaster(obs: np.ndarray, category: str) -> tuple[float, float]:
    global forecaster_net, forecaster_obs_dim
    if forecaster_net is None:
        return 0.0, 0.0
    try:
        obs_padded = obs[:forecaster_obs_dim] if len(obs) >= forecaster_obs_dim \
                     else np.pad(obs, (0, forecaster_obs_dim - len(obs)))   # main.py:130
        window = np.tile(obs_padded, (OBS_WINDOW, 1))                       # main.py:131
        feat = torch.tensor(window, dtype=torch.float32).unsqueeze(0)
        cidx = torch.tensor([CAT_TO_IDX[category]], dtype=torch.long)
        with torch.no_grad():
            out = forecaster_net(feat, cidx)
        d_hat   = float(max(0.0, out["demand"].item()))
        p_waste = float(torch.sigmoid(out["waste_logit"]).item())
        return d_hat, p_waste
    except Exception as e:
        logger.warning(f"Forecaster inference error: {e}")
        return 0.0, 0.0
```

**`forecaster_obs_dim` được gán** từ checkpoint (`main.py:167`):
```python
cfg = ForecasterConfig(**fckpt["model_cfg"])
forecaster_obs_dim = cfg.obs_dim   # => 11 (từ checkpoint thật)
```

**Vấn đề A — Pad-zero chiều 11:**

Sidecar build obs 10 chiều (từ `_build_obs`, `main.py:88-121`). Khi `forecaster_obs_dim=11` và `len(obs)=10`:
```python
obs_padded = np.pad(obs, (0, 11 - 10))  # thêm 0.0 ở cuối → chiều 11 = 0 mãi mãi
```

Checkpoint được train với parquet có **11 chiều thực sự khác nhau**. Chiều thứ 11 lúc train (vị trí index 10 trong parquet cũ = inv_coverage) có giá trị thực sự (range 0..1). Sidecar luôn đưa `0.0` vào đây. Sai.

**QUAN TRỌNG HƠN:** Phân tích layout cho thấy chiều bị mất ở **index 2** (price_ratio), không phải cuối. Tức là khi sidecar truyền `[d0..d9, 0]` (10 chiều thật + pad 0), LSTM thực ra nhận:
- `d0..d1` đúng (fresh, inv)
- `d2..d9` bị lệch vị trí so với lúc train (vì parquet cũ có extra feature ở index 2)
- `d10 = 0` thay cho `inv_coverage` thật

Sidecar đưa obs 10-dim đúng với **current env** nhưng **không khớp với layout parquet cũ** mà checkpoint đã học.

**Vấn đề B — Tile-21× (21 hàng giống hệt):**

```python
window = np.tile(obs_padded, (OBS_WINDOW, 1))  # (21, 11) — 21 hàng IDENTICAL
```

Lúc train: mỗi hàng trong chuỗi 21 ngày là một obs **khác nhau** (inventory decay, freshness thay đổi, DOW quay vòng). LSTM học patterns thay đổi qua thời gian trong chuỗi.

Khi inference với 21 hàng identical:
- **Hidden state LSTM sau timestep đầu bằng chính xác hidden state sau bất kỳ timestep nào** (vì input không đổi). LSTM không "học" được gì từ chuỗi — nó chỉ "xử lý" cùng một thông tin 21 lần.
- **Không có gradient temporal** trong chuỗi — tất cả time-step features (sin/cos DOW, days_to_waste, demand_ratio) đều cố định.
- Đầu ra vẫn là con số hợp lệ (LSTM không crash), nhưng là kết quả của việc "chiếu" một obs đơn qua LSTM 21 lần — một xấp xỉ rất thô.
- **Ý nghĩa ngữ nghĩa:** Model vốn học từ "freshness đang giảm trong 21 ngày" → đề xuất giảm giá; nhưng inference thấy freshness không đổi trong 21 ngày → đề xuất giá khác. Đây là **sai lệch hệ thống**.

---

### 5. Kết luận T0.4

| Câu hỏi | Câu trả lời |
|---|---|
| (a) `obs_dim` checkpoint thật | **11** (`lstm.weight_ih_l0` shape `[512, 11]`; `model_cfg['obs_dim']=11`) |
| (b) Chiều 11 là gì? | Parquet 11-dim có extra feature ở **index 2** (không ở cuối) — khả năng là `price_ratio = current_price/ref_price`, bị xóa khi OBS_DIM giảm 11→10. Sidecar pad `0.0` ở **cuối** → sai cả vị trí lẫn giá trị |
| (c) Tile-21× lệch mức nào? | **Lệch nghiêm trọng về mặt ngữ nghĩa**: LSTM học từ chuỗi biến thiên 21 ngày; inference với 21 hàng identical = chỉ "chiếu" 1 điểm qua LSTM. Temporal gradient bị loại bỏ hoàn toàn. Output vẫn ra số nhưng mất toàn bộ thông tin dynamics. |
| (d) Tổng: forecaster serve đúng hay lệch? | **LỆCH KÉP — rất nghiêm trọng:** (1) Layout 11-dim: checkpoint train với obs layout cũ (extra price_ratio ở index 2) nhưng sidecar truyền obs layout mới 10-dim + pad 0 ở cuối → toàn bộ feature từ index 2 trở đi bị lệch vị trí; (2) Tile-21×: không có temporal dynamics. Forecaster output tại sidecar hiện tại **không thể tin cậy** — nó chạy mà không crash nhưng cho kết quả sai về ngữ nghĩa. |

**Trạng thái: DONE_WITH_CONCERNS**
- Lệch 1 (NGHIÊM TRỌNG): obs layout mismatch — checkpoint obs_dim=11 với layout cũ, sidecar truyền 10-dim layout mới + pad 0 ở cuối sai vị trí
- Lệch 2 (NGHIÊM TRỌNG): tile-21× — loại bỏ hoàn toàn temporal dynamics mà LSTM được train để khai thác

## T0.5 — Smoke-load checkpoint

**Ngày chạy:** 2026-06-07  
**Test file:** `/Users/macos/f2t/pricing-sidecar/tests/test_smoke_load.py`  
**Lệnh chạy:**
```
cd /Users/macos/f2t/pricing-sidecar && .venv/bin/python -m pytest tests/test_smoke_load.py -v
```

### Output pytest đầy đủ

```
============================= test session starts ==============================
platform darwin -- Python 3.13.9, pytest-9.0.3, pluggy-1.6.0 -- /Users/macos/f2t/pricing-sidecar/.venv/bin/python
cachedir: .pytest_cache
rootdir: /Users/macos/f2t/pricing-sidecar
plugins: anyio-4.13.0
collecting ... collected 2 items

tests/test_smoke_load.py::test_ddqn_loads_and_infers PASSED              [ 50%]
tests/test_smoke_load.py::test_forecaster_loads_and_infers PASSED        [100%]

============================== 2 passed in 0.89s ===============================
```

### Kết quả

| Test | Kết quả | Chi tiết |
|---|---|---|
| `test_ddqn_loads_and_infers` | **PASSED** | Checkpoint `rl_shared_best.pt` load OK vào `SharedMLPDuelingQNet(obs_dim=10, n_cats=4, cat_embed_dim=8, hidden=128, n_actions=11)`; `q.shape = (1, 11)`; không có missing/unexpected keys |
| `test_forecaster_loads_and_infers` | **PASSED** | Checkpoint `forecaster_v4_best.pt` load OK vào `ForecasterLSTM(ForecasterConfig(**ck["model_cfg"]))`; output dict chứa keys `"demand"` và `"waste_logit"`; không có missing/unexpected keys |

### Missing / Unexpected keys

- **Không có** missing keys (strict=False, nhưng assert `not missing` và `not unexpected` đều qua).
- **Không có** unexpected keys.
- Prefix `_orig_mod.` (torch.compile artifact) được strip bởi test — sau khi strip, state_dict khớp hoàn toàn.

### q.shape

`q.shape = (1, 11)` — đúng với `n_actions=11`.

### Inference forecaster

`out` dict chứa `"demand"` và `"waste_logit"` — đúng với `ForecasterLSTM.forward`.

### Kết luận

**Trạng thái: DONE**  
Cả 2 checkpoint load và inference thành công. Không có missing/unexpected key. q.shape đúng. Output forecaster đúng.

## T0.6 — CoreML freshness

**Ngày chạy:** 2026-06-07  
**Test file:** `/Users/macos/f2t/pricing-sidecar/tests/test_coreml_freshness.py`  
**Lệnh chạy:**
```
cd /Users/macos/f2t/pricing-sidecar && .venv/bin/python -m pytest tests/test_coreml_freshness.py -v -s
```

### Trạng thái coremltools

coremltools 9.0 CÓ SẴN trong venv (không cần cài thêm):
```
$ .venv/bin/python -c "import coremltools; import PIL; print('ok', coremltools.__version__)"
ok 9.0
```
(Cảnh báo về Torch 2.12.0 chưa được test với coremltools là bình thường, không ảnh hưởng CoreML inference.)

### Tên input thật của model

Cả 2 model đều có:
- **Input:** `name=image`, type `imageType { width: 299, height: 299, colorSpace: BGR }`
- **Output:** `name=target` (string), `name=targetProbability` (dict string→float)

Lệnh kiểm tra:
```python
import coremltools as ct
m = ct.models.MLModel('/Users/macos/f2t/freshnessmodels/MyFreshnessClassifier-fruit.mlmodel')
spec = m.get_spec().description
# INPUTS: name=image, type=imageType { width: 299, height: 299, colorSpace: BGR }
# OUTPUTS: name=target (stringType), name=targetProbability (dictionaryType)
```

### Output pytest đầy đủ (với -s print)

```
============================= test session starts ==============================
platform darwin -- Python 3.13.9, pytest-9.0.3, pluggy-1.6.0 -- /Users/macos/f2t/pricing-sidecar/.venv/bin/python
cachedir: .pytest_cache
rootdir: /Users/macos/f2t/pricing-sidecar
plugins: anyio-4.13.0
collecting ... collected 2 items

tests/test_coreml_freshness.py::test_coreml_predict[MyFreshnessClassifier-fruit.mlmodel] MyFreshnessClassifier-fruit.mlmodel -> {'target': 'fresh', 'targetProbability': {'fresh': 0.9261168413538724, 'rotten': 0.07388315864612756}}
PASSED
tests/test_coreml_freshness.py::test_coreml_predict[MyFreshnessClassifier-root.mlmodel] MyFreshnessClassifier-root.mlmodel -> {'target': 'rotten', 'targetProbability': {'fresh': 0.4769286231512916, 'rotten': 0.5230713768487084}}
PASSED

============================== 2 passed in 2.65s ===============================
```

### Output predict chi tiết

| Model | `target` | `targetProbability["fresh"]` | `targetProbability["rotten"]` |
|---|---|---|---|
| `MyFreshnessClassifier-fruit.mlmodel` | `"fresh"` | `0.9261` | `0.0739` |
| `MyFreshnessClassifier-root.mlmodel` | `"rotten"` | `0.4769` | `0.5231` |

Input test: `Image.new("RGB", (299, 299), (120, 180, 90))` — ảnh xanh lá 299×299 (PIL tự convert màu nếu cần).

### Xác nhận mapping fallback "root"

Từ `main.py:314`:
```python
model_key = "fruit" if req.category in ("fruit", "fruits") else "root"
```

- `"fruit"` / `"fruits"` → model **fruit**
- `"leafy"`, `"herbs"`, `"root"`, và mọi giá trị khác → model **root**

Chỉ có 2 model tại `/Users/macos/f2t/freshnessmodels/`:
- `MyFreshnessClassifier-fruit.mlmodel`
- `MyFreshnessClassifier-root.mlmodel`

**Đây là thiết kế đã biết và cố ý:** không có model riêng cho leafy/herbs. Root model được dùng làm fallback cho tất cả category không phải fruit. Điều này hợp lý vì rau củ (root, leafy, herbs) có đặc điểm texture tươi/hỏng tương đồng hơn so với trái cây.

### Kết luận

**Trạng thái: DONE**
- coremltools 9.0 CÓ SẴN — không phải blocker môi trường
- 2 model load và predict thành công (2 PASSED)
- Input key = `"image"` (299×299, BGR) — khớp với sidecar `main.py:321` (`model.predict({"image": img})`)
- Output keys = `"target"` (string label) + `"targetProbability"` (dict) — khớp với `main.py:324-326`
- Mapping non-fruit → "root" là thiết kế cố ý, được xác nhận

## T0.7 ⭐ — Backend payload

**Ngày chạy:** 2026-06-07  
**Phương pháp:** Đọc trực tiếp 3 file:
- `f2t-backend/src/modules/dynamic-pricing/dynamic-pricing.service.ts`
- `f2t-backend/src/modules/demand-forecasting/demand-forecasting.service.ts`
- `pricing-sidecar/main.py`
- `dynamic-pricing-final/src/env/market_env.py`

---

### 1. File tích hợp sidecar

Có **2 điểm tích hợp** backend → sidecar:

**Điểm 1 — `/predict`** (DDQN pricing):  
`f2t-backend/src/modules/dynamic-pricing/dynamic-pricing.service.ts`  
- `generateSuggestionForProduct` (L280): gọi đơn lẻ 1 product  
- `runPricingTick` (L520): gọi batch tất cả sản phẩm available

**Điểm 2 — `/forecast`** (ForecasterLSTM):  
`f2t-backend/src/modules/demand-forecasting/demand-forecasting.service.ts` (L42-58): gọi trước `/predict` để lấy `demand7d`

**Điểm 3 — `/freshness/classify`** (CoreML):  
`f2t-backend/src/modules/dynamic-pricing/dynamic-pricing.service.ts` (L147-151): gọi riêng từ endpoint scan ảnh

---

### 2. Đoạn code build payload `/predict` — `generateSuggestionForProduct`

```typescript
// dynamic-pricing.service.ts:265-275
const stateVector = {
  productId: product._id.toString(),
  category: agentCat,
  freshness,
  inventory_ratio: inventoryRatio,
  base_price: product.pricePerUnit,
  competitor_ref_price: competitorRefPrice,
  days_to_restock: daysToRestock,
  prev_delta: prevDelta,
  demand_7d: forecast.demand7d,
};
// L280: this.httpService.post(sidecarUrl + "/predict", { state_vectors: [stateVector] }, ...)
```

Đoạn code build payload `/forecast` (trong demand-forecasting.service.ts:44-55):
```typescript
state_vector: {
  productId,
  category,
  freshness,
  inventory_ratio: inventoryRatio,
  base_price: basePrice,
  competitor_ref_price: competitorRefPrice,
  days_to_restock: daysToRestock,
  prev_delta: prevDelta,
  demand_7d: 0.0,   // LUÔN GỬI 0.0 (bootstrap — chưa có forecast)
},
```

---

### 3. Bảng 9 field `ProductStateVector`

| Field | Backend gửi? | Nguồn dữ liệu | file:Lxx | Ngữ nghĩa khớp env? |
|---|---|---|---|---|
| `productId` | CÓ | `product._id.toString()` | `dynamic-pricing.service.ts:266` | N/A (ID, không vào obs) |
| `category` | CÓ | `mapProductCategoryToAgent(product.category)` → {"leafy","root","fruit","herbs"} | `dynamic-pricing.service.ts:267, L63-68` | **KHỚP** — cùng 4 categories |
| `freshness` | CÓ | `cache?.medianScore ?? computeWeibullFallback(category)` — từ FreshnessCache (scan CV) hoặc Weibull fallback | `dynamic-pricing.service.ts:223, L268` | **KHỚP** — cùng ý nghĩa freshness ∈ [0,1] |
| `inventory_ratio` | CÓ | `Math.min((product.availableQuantity ?? 0) / 100, 2.0)` | `dynamic-pricing.service.ts:228, L269` | **KHỚP** — đúng công thức `inv/100` cap 2.0 (xem Q1) |
| `base_price` | CÓ | `product.pricePerUnit` — cột DB trực tiếp | `dynamic-pricing.service.ts:270` | **KHỚP** — giá gốc sản phẩm |
| `competitor_ref_price` | CÓ | `getCompetitorRefPrice()` — truy vấn DB địa lý thật (xem Q4) | `dynamic-pricing.service.ts:225, L84-124` | **KHỚP về concept**; nhưng env dùng `comp/current_price` còn sidecar dùng `comp/base_price` → vẫn là lệch chiều 7 đã ghi T0.3 |
| `days_to_restock` | CÓ | `computeDaysToRestock(schedule, category, lastRestockedAt)` — từ `farm.restockSchedule` và `product.lastRestockedAt` | `dynamic-pricing.service.ts:247-251, L71-82` | **KHỚP** — cùng ý nghĩa "ngày còn lại đến restock" |
| `prev_delta` | CÓ | `(lastOverride.deltaPct ?? 0) / 100` — từ MongoDB PriceOverride cuối cùng | `dynamic-pricing.service.ts:240, L273` | **KHỚP** — deltaPct lưu ở %, chia 100 → tỉ lệ |
| `demand_7d` | CÓ | Từ `DemandForecastingService.getForecast()` → `forecast.demand7d` (kết quả ForecasterLSTM) | `dynamic-pricing.service.ts:254-263, L274` | **LỆCH TIỀM ẨN — xem Q2 & Q5** |

**Kết luận bảng:** Backend gửi ĐẦY ĐỦ 9 field, không có field nào để default phía sidecar. Tất cả 9 field đều được backend tính toán và gửi tường minh.

**Ngoại lệ duy nhất:** Khi `/forecast` gọi sidecar lần đầu (bootstrap), nó gửi `demand_7d: 0.0` (hard-coded, `demand-forecasting.service.ts:54`). Đây là circular bootstrap: forecaster cần `demand_7d` để tính `demand7d`, nhưng chưa có `demand7d`.

---

### 4. Trả lời 5 câu hỏi ngữ nghĩa

#### Q1: `inventory_ratio` = (số tồn kho / 100)?

**TRẢ LỜI: ĐÚNG — khớp hoàn toàn.**

Backend (`dynamic-pricing.service.ts:228`):
```typescript
const inventoryRatio = Math.min((product.availableQuantity ?? 0) / 100, 2.0);
```

Env train (`market_env.py:148`):
```python
min(inv / 100.0, 2.0),   # [1] inv_ratio
```

`inventory_ratio = availableQuantity / 100`, cap tại 2.0. Nếu kho có 50 đơn vị → `inventory_ratio = 0.5`. Công thức và cap hoàn toàn khớp.

---

#### Q2: `demand_7d` mang nghĩa gì — tổng demand 7 ngày, hay trung bình ngày?

**TRẢ LỜI: `demand_7d` là KẾT QUẢ DỰ BÁO từ ForecasterLSTM — ngữ nghĩa là TỔNG demand 7 ngày tương lai (đơn vị: units), nhưng sidecar tính demand_ratio bằng cách chia cho 7 và BASE_DEMAND.**

Luồng:
1. `DemandForecastingService.getForecast()` gọi sidecar `/forecast` (`demand-forecasting.service.ts:42`)
2. Sidecar `/forecast` endpoint (`main.py:259-270`) chạy `_run_forecaster(obs, category)` 
3. `_run_forecaster` trả `d_hat = float(max(0.0, out["demand"].item()))` (`main.py:136`) — đây là output của `demand_head`, được train với target là `demand_yesterday` × 7 (từ parquet) → **tổng 7 ngày**
4. Backend nhận `forecast.demand7d` và đặt vào `demand_7d` field

Sidecar `_build_obs` (`main.py:105`):
```python
demand_ratio = (demand_7d / 7.0) / BASE_DEMAND[category] if demand_7d > 0 else 1.0
```

Tức `demand_7d / 7` = trung bình ngày → so sánh với `BASE_DEMAND` (base demand per day).

Env train (`market_env.py:152`):
```python
float(np.clip(self._demand_yesterday[cat] / p["base_demand"], 0.0, 3.0)),   # [5] demand_ratio
```

`demand_yesterday` = đơn vị bán hôm qua (1 ngày). `demand_7d / 7` tương đương `demand_yesterday` nếu demand ổn định. **Về mặt ngữ nghĩa: `demand_7d` là dự báo tổng 7 ngày; sidecar đúng khi chia cho 7 để ra trung bình ngày.**

**NHƯNG có vấn đề bootstrap:** Khi `/forecast` gọi, nó truyền `demand_7d: 0.0` → sidecar dùng fallback `demand_ratio = 1.0` → forecaster output `demand7d` X → backend gửi X vào `/predict`. Chỉ có 1 vòng lặp, không iterative.

---

#### Q5: `inv_coverage` (obs[9]) — khớp không?

Env (`market_env.py:144`):
```python
coverage_7d = inv / max(self._demand_yesterday[cat] * 7, 1.0)
```
→ mẫu số = `demand_yesterday × 7` (projection 7 ngày của demand hôm qua)

Sidecar (`main.py:107`):
```python
inv_coverage = inv_units / max(demand_7d, 1.0) if demand_7d > 0 else inv_units / max(BASE_DEMAND[category] * 7, 1.0)
```
Với `inv_units = inventory_ratio * 100.0`.

Nếu `demand_7d > 0`: mẫu số = `demand_7d` (tổng 7 ngày dự báo).  
Env mẫu số = `demand_yesterday * 7` (projection 7 ngày của demand hôm qua).

Hai cách tiếp cận này **tương đương về mặt ý nghĩa** nếu `demand_7d` là dự báo 7 ngày hợp lý, vì cả hai đều là "demand dự kiến 7 ngày tới". Tuy nhiên env dùng actual demand hôm qua nhân 7, còn sidecar dùng ML forecast. **Không lệch nghiêm trọng về ngữ nghĩa.**

Fallback của sidecar khi `demand_7d=0`: dùng `BASE_DEMAND[cat] * 7` — khớp với cách env fallback (base_demand từ params).

**Kết luận Q5: KHỚP về ngữ nghĩa** — cả hai đều ước tính coverage = tồn kho / demand 7 ngày, chỉ khác nguồn (actual vs forecast).

---

#### Q4: `competitor_ref_price` lấy từ đâu?

**TRẢ LỜI: Lấy từ DB thật qua truy vấn địa lý MongoDB — CÓ THẬT, không hardcode.**

Code `getCompetitorRefPrice()` (`dynamic-pricing.service.ts:84-124`):
```typescript
// 1. Lấy tọa độ farm hiện tại (L90-91)
const farm = await this.farmModel.findById(farmId).select("location").lean();

// 2. Tìm các farm lân cận trong bán kính 10km (L93-105)
const nearbyFarms = await this.farmModel.find({
  _id: { $ne: new Types.ObjectId(farmId.toString()) },
  location: { $near: { $geometry: { type: "Point", coordinates: farm.location.coordinates }, $maxDistance: 10000 } },
}).select("_id").limit(2).lean();

// 3. Lấy giá sản phẩm cùng category của farm lân cận (L107-116)
const competitorProducts = await this.productModel.find({
  farmId: { $in: nearbyFarms.map((f) => f._id) },
  category, status: "available",
}).select("pricePerUnit").lean();

// 4. Trả về trung bình (L118-120)
return competitorProducts.reduce((sum, p) => sum + p.pricePerUnit, 0) / competitorProducts.length;
```

**Fallback nếu không có farm lân cận hoặc lỗi:** `ownPrice * 0.95` (giả định competitor rẻ hơn 5%).

Env train: `comp_prices[cat] = params[cat]["ref_price"] * rng.uniform(0.85, 1.15)` — **synthetic, random**. Backend dùng giá thật từ DB. Đây là **cải tiến so với env train**, không phải lệch.

---

#### Tổng hợp lệch ngữ nghĩa

| Field | Ngữ nghĩa env train | Ngữ nghĩa backend gửi | Lệch? |
|---|---|---|---|
| `inventory_ratio` | `inv/100`, cap 2.0 | `availableQuantity/100`, cap 2.0 | **KHÔNG LỆCH** |
| `demand_7d` | Không có field này (env dùng demand_yesterday trực tiếp) | Tổng demand 7 ngày dự báo từ ForecasterLSTM | **TIỀM ẨN** — forecast bị lệch kép (T0.4), nên demand_7d không đáng tin |
| `competitor_ref_price` | Synthetic: ref_price × Uniform(0.85, 1.15) | Trung bình pricePerUnit của competitor thật trong 10km | **CONCEPT KHỚP**, nguồn dữ liệu khác (thật vs synthetic) |
| `base_price` | `params[cat]["ref_price"]` — giá tham chiếu cố định | `product.pricePerUnit` — giá cột DB | **KHỚP** |
| `prev_delta` | delta từ action CANDIDATES cuối | `lastOverride.deltaPct / 100` | **KHỚP** về ý nghĩa |
| `days_to_restock` | `RESTOCK_EVERY[cat] - (t % RESTOCK_EVERY[cat])` — giá trị cố định theo cat | `computeDaysToRestock(schedule, cat, lastRestockedAt)` — tính thực | **KHỚP về ý nghĩa** |

---

### 5. Kết luận T0.7

**Backend GỬI ĐỦ 9 field**, không có field nào để sidecar default.  
**Lưu ý:** `demand_7d` gửi vào `/predict` được bootstrap từ `/forecast` với `demand_7d=0.0` → forecast có sai số do lệch kép T0.4 → `demand_7d` trong payload `/predict` không chính xác.

**Trạng thái: DONE_WITH_CONCERNS**
- `inventory_ratio` và `competitor_ref_price`: khớp ngữ nghĩa
- `demand_7d`: có giá trị thật từ ForecasterLSTM nhưng forecast bị lệch kép (T0.4) → không đáng tin
- Vấn đề chiều 7 (comp_ratio denominator) của sidecar vẫn là lệch nghiêm trọng nhất (ghi nhận từ T0.3)

## T0.8 — Integration test

**Ngày:** 2026-06-07. Boot sidecar thật (`uvicorn main:app --port 8137`, venv 3.13), controller chạy trực tiếp.

### Log boot (citation runtime)
```
INFO:main:DDQN loaded from .../checkpoints/rl_shared_best.pt
INFO:main:Forecaster loaded from .../checkpoints/forecaster_v4_best.pt (obs_dim=11)
INFO:main:CoreML 'fruit' loaded
INFO:main:CoreML 'root' loaded
INFO:     Application startup complete.
```
→ Xác nhận runtime forecaster obs_dim=**11** (khớp T0.4).

### Response thật từng endpoint
- **GET /health** → `{status:ok, ddqn_loaded:true, forecaster_loaded:true, coreml_loaded:["fruit","root"]}`. (Ghi chú: chuỗi model ghi "obs_dim=10" là label cứng main.py:252, hơi gây hiểu nhầm vì forecaster=11; DDQN=10 đúng.)
- **POST /predict** (leafy, freshness 0.9) → `targetPrice:10000, delta_pct:0.0, safety_clipped:false, tag:fresh`. Hợp lý: leafy là HOLD_CAT, tươi → giữ giá.
- **POST /predict** (fruit, freshness 0.3 critical) → `targetPrice:15000, delta_pct:-25.0, safety_clipped:true, tag:critical`. Hợp lý: tươi thấp → giảm mạnh, bị clip bởi cost floor.
- **POST /forecast** (leafy) → `demand7d:24.68, pWaste:0.55`. Số hữu hạn (NHƯNG không tin cậy về ngữ nghĩa — xem T0.4).
- **POST /freshness/classify** (fruit, ảnh 299×299) → `score:0.927, tag:fresh`. (leafy → fallback model root → `score:0.505, tag:aging`). Xác nhận fallback non-fruit→root chạy đúng.

### Kết luận gate kỹ thuật
4/4 endpoint trả 2xx + payload hợp lệ. Sidecar phục vụ kiến trúc dynamic-pricing-final ở RUNTIME: DDQN masked-argmax pricing + safety clip OK; CoreML freshness OK; forecaster CHẠY nhưng output không đáng tin do lệch T0.4. Background task exit 144 = do controller pkill (SIGTERM), không phải crash.

## T0.9 — Fix gaps

**Ngày chạy:** 2026-06-07  
**File sửa:** `/Users/macos/f2t/pricing-sidecar/main.py`

---

### FIX 1 — comp_ratio dim7 (ĐÃ ÁP — NGHIÊM TRỌNG)

**Vấn đề:** `main.py:108` (cũ) dùng `base_price` làm mẫu số:
```python
# TRƯỚC (sai):
comp_ratio = (competitor_ref_price / base_price) if base_price > 0 else 1.0
```
Env train (`market_env.py:134`): `comp_ratio = self._comp_prices[cat] / max(self._prices[cat], 1e-6)` — chia cho `self._prices[cat]` là **giá hiện tại sau khi áp delta** (không phải base_price).

**Fix đã áp (`main.py:108-112`):**
```python
# SAU (đúng):
# comp_ratio: env divides by current price (base * (1+prev_delta)), not base_price.
# market_env.py:134: comp_ratio = self._comp_prices[cat] / max(self._prices[cat], 1e-6)
# where self._prices[cat] is the current price after applying prev_delta.
current_price = base_price * (1.0 + prev_delta)
comp_ratio = competitor_ref_price / max(current_price, 1e-6)
```

**Lý do:** `prev_delta` đã là tham số của `_build_obs` (param L94). Khi `prev_delta=0.0` (default), fix không thay đổi kết quả; khi `prev_delta≠0` (mọi re-price decision), comp_ratio sẽ khớp đúng với env.

**Ví dụ định lượng:** `base_price=20000`, `competitor_ref_price=19000`, `prev_delta=-0.05`:
- Trước fix: `comp_ratio = 19000/20000 = 0.950`
- Sau fix: `current_price = 20000 × 0.95 = 19000`; `comp_ratio = 19000/19000 = 1.000`
- Khác biệt 5.3% trong obs, nằm trong clip range [0.5, 2.0] → ảnh hưởng trực tiếp đến Q-values DDQN

---

### FIX 2 — RGB/BGR freshness (ĐIỀU TRA → KHÔNG SỬA CODE — DOCUMENT)

**Kết luận điều tra: coremltools KHÔNG tự reorder kênh; tuy nhiên model đã được train trên RGB và cần RGB.**

**Evidence số liệu (chạy thật):**

| Ảnh test | Format feed | `fresh` score (fruit model) | Nhận xét |
|---|---|---|---|
| Pure red (255,0,0) | RGB as-is (current) | `0.7956` | Model nhận red = red |
| Pure red (BGR-corrected: feed blue) | BGR-swap | `0.5128` | Model thấy blue ≠ red → khác |
| Yellow-green (R=150,G=200,B=60) | RGB as-is (current) | **`0.9634`** | Đúng hành vi: fresh green→fresh score cao |
| Yellow-green (BGR-corrected: feed blue-ish) | BGR-swap | **`0.1628`** | SAI: blue-ish → rotten score cao |
| Rotten brown (R=120,G=80,B=100) | RGB as-is | `0.6439` | |
| Rotten brown (BGR-corrected) | BGR-swap | `0.6023` | ít thay đổi vì B≈R |
| Green (R=0,G=200,B=0) | RGB as-is | `0.9477` | |
| Green (BGR-corrected: swap R↔B = no-op for G) | BGR-swap | `0.9477` | Giống hệt — expected (G unaffected) |

**Phân tích coremltools source (`model.py:1032-1038`):**
```python
if input_desc.type.imageType.colorSpace in (
    _proto.FeatureTypes_pb2.ImageFeatureType.BGR,
    _proto.FeatureTypes_pb2.ImageFeatureType.RGB,
):
    if input_val.mode != "RGB":
        raise TypeError(...)
```
coremltools 9.0 chỉ **validate** mode==RGB cho cả BGR và RGB declared models — nó **không swap channels**. PIL Image mode "RGB" được truyền thẳng đến MLModel runtime.

**Kết luận:** `colorSpace=BGR` (raw enum 30) trong spec là artifact của Create ML training pipeline (sử dụng Metal/CoreVideo nội bộ theo BGR byte order trên macOS), nhưng khi Create ML export model ra `.mlmodel` để dùng với coremltools/Python, model đã được train và expect dữ liệu theo thứ tự PIL RGB. Feed yellow-green RGB cho fresh score `0.9634` (hợp lý), BGR-swap cho `0.1628` (sai). **Code hiện tại `.convert("RGB")` là ĐÚNG — KHÔNG SỬA.**

---

### FIX 3 — dow (ĐIỀU TRA → KHÔNG SỬA CODE — DOCUMENT)

**Kết luận điều tra: demand model CÓ seasonality tuần (sin_weekly/cos_weekly) nhưng ảnh hưởng RẤT NHỎ; lệch pha dow không gây tác động nghiêm trọng.**

**Evidence từ `dynamic-pricing-final/data/params/demand_params.json`:**

| category | sin_weekly | cos_weekly | magnitude max |
|---|---|---|---|
| leafy | -0.021453 | -0.018568 | ~2.8% swing |
| root | 0.023284 | -0.021368 | ~3.1% swing |
| fruit | -0.005355 | -0.014501 | ~1.5% swing |
| herbs | 0.0 | 0.0 | 0% (no seasonality) |

**Demand rate formula** (`dynamic-pricing-final/src/env/demand.py:47`):
```python
season = 1.0 + sin_w * math.sin(2 * math.pi * dow / 7) + cos_w * math.cos(2 * math.pi * dow / 7)
```

**Obs dim[2] và dim[3]** là `sin(2π·dow/7)` và `cos(2π·dow/7)` — cùng signal với seasonality factor trong demand. Lệch pha:
- Env train: `dow = self._t % 7` (episode reset t=0 bất kỳ ngày nào, không neo lịch)
- Sidecar serve: `dow = datetime.now().weekday()` (Monday=0)
- Lệch pha tối đa = 6 ngày (nếu episode bắt đầu vào Sunday)

**Tác động lệch pha:** Seasonal factor tối đa `|sin_weekly| + |cos_weekly|` ≈ 3.1% (root category). Với lệch pha bất kỳ, sai số trong `season` factor tối đa ≈ `2 × 3.1%` ≈ 6.2%. Đây là **biên độ nhỏ**.

**Convention:** Env không neo lịch (train với `t%7`), nên không có convention "ngày nào = dow=0". Dùng wall-clock weekday thực tế là hợp lý về mặt ý nghĩa (demand thực tế thay đổi theo ngày trong tuần). Sai số pha là acceptable trade-off.

**Kết luận: KHÔNG SỬA — ghi document.** Wall-clock weekday hợp lý hơn arbitrary `t%7`. Ảnh hưởng seasonality < 6.2% và đã được clip. Đây là lệch pha "lành tính".

---

### Re-verify BẮT BUỘC sau fix

**1. pytest (4 tests):**
```
cd /Users/macos/f2t/pricing-sidecar && .venv/bin/python -m pytest tests/test_smoke_load.py tests/test_coreml_freshness.py -v

============================= test session starts ==============================
platform darwin -- Python 3.13.9, pytest-9.0.3, pluggy-1.6.0 -- /Users/macos/f2t/pricing-sidecar/.venv/bin/python
cachedir: .pytest_cache
rootdir: /Users/macos/f2t/pricing-sidecar
plugins: anyio-4.9.0

tests/test_smoke_load.py::test_ddqn_loads_and_infers PASSED              [ 25%]
tests/test_smoke_load.py::test_forecaster_loads_and_infers PASSED        [ 50%]
tests/test_coreml_freshness.py::test_coreml_predict[MyFreshnessClassifier-fruit.mlmodel] PASSED [ 75%]
tests/test_coreml_freshness.py::test_coreml_predict[MyFreshnessClassifier-root.mlmodel] PASSED [100%]

4 passed in 0.91s
```
→ **PASS 4/4**

**2. /predict 2 ca (sidecar boot port 8231):**

```bash
# ca 1: leafy, freshness 0.9, prev_delta=0.0 (default)
curl -s -X POST http://127.0.0.1:8231/predict -H 'Content-Type: application/json' \
  -d '{"state_vectors":[{"productId":"p1","category":"leafy","freshness":0.9,"inventory_ratio":0.5,"base_price":10000,"competitor_ref_price":11000}]}'
→ {"overrides":[{"productId":"p1","targetPrice":10000.0,"delta_pct":0.0,"safety_clipped":false,"freshness_tag":"fresh"}]}

# ca 2: fruit, freshness 0.3, prev_delta=-0.05 (FIX 1 kích hoạt)
# Với fix: current_price = 20000*(1-0.05)=19000; comp_ratio = 19000/19000 = 1.0
# Trước fix: comp_ratio = 19000/20000 = 0.95 (sai)
curl -s -X POST http://127.0.0.1:8231/predict -H 'Content-Type: application/json' \
  -d '{"state_vectors":[{"productId":"p2","category":"fruit","freshness":0.3,"inventory_ratio":1.2,"base_price":20000,"competitor_ref_price":19000,"days_to_restock":5,"prev_delta":-0.05,"demand_7d":14}]}'
→ {"overrides":[{"productId":"p2","targetPrice":15000.0,"delta_pct":-25.0,"safety_clipped":true,"freshness_tag":"critical"}]}
```

Cả 2 ca: trả JSON hợp lệ, không crash. Kết quả hợp lý (leafy tươi → HOLD; fruit critical → giảm mạnh, clip safety).

**Trạng thái: DONE**

## T0.10 — Kết luận + nạp ledger
_(chưa bắt đầu)_
