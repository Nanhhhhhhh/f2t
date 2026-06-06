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
