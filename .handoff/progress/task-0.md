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
