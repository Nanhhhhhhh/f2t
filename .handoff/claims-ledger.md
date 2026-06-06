# claims-ledger.md — sổ cái bằng chứng

Mọi claim kỹ thuật dùng cho thesis (hoặc kết luận Task 0) phải có 1 entry ở đây TRƯỚC khi viết prose. Format:

```
### <claim-id>: <phát biểu ngắn>
- **Evidence:** `path:Lxx` | codegraph node `<id>` | lệnh + output
- **Verified by:** <agent/lượt verify> — <ngày>
- **Dùng ở:** <section thesis / kết luận task>
```

---

## Nhóm: Kiến trúc ML (sẽ nạp dần trong Task 0)

### t0.1-copy-fidelity: dynamic-pricing-final copy đầy đủ từ dynamic-pricing-v3
- **Evidence:** `diff -qr /Users/macos/dynamic-pricing-v3/src /Users/macos/f2t/dynamic-pricing-final/src -x '__pycache__' -x '*.pyc'` — chỉ 1 dòng khác biệt thực chất: `from __future__ import annotations` thêm vào đầu `src/rl/network.py` (final có, v3 không có); 3/4 file ML lõi (model.py, reward.py, market_env.py) identical; tests/, requirements.txt identical. Docs viz HTML và architecture MD không được copy (only-v3) nhưng không ảnh hưởng runtime. Output diff đầy đủ ghi tại `progress/task-0.md` mục T0.1.
- **Verified by:** implementer T0.1 — 2026-06-07
- **Dùng ở:** kết luận Task 0

### t0.2-ddqn-arch: SharedMLPDuelingQNet signature + cấu hình (obs_dim=10, n_cats=4, embed=8, hidden=128, n_actions=11)
- **Evidence:** `dynamic-pricing-final/src/rl/network.py:51-57` — `__init__(obs_dim=10, n_cats=4, cat_embed_dim=8, hidden=128, n_actions=11)`; `network.py:68-73` — `forward(obs, cat_ids, mask) -> Tensor (B, n_actions)`; sidecar khởi tạo tại `pricing-sidecar/main.py:151-153` với cùng 5 tham số literal; gọi inference `main.py:293` dưới dạng `ddqn_net(obs_t, cat_t, mask_t)`.
- **Verified by:** implementer T0.2 — 2026-06-07
- **Dùng ở:** thesis section AI/ML — kiến trúc DDQN

### t0.2-forecaster-arch: ForecasterLSTM.forward trả {demand, waste_logit}; ForecasterConfig.obs_dim tồn tại
- **Evidence:** `dynamic-pricing-final/src/forecaster/model.py:46-49` — `return {"demand": self.demand_head(z).squeeze(-1), "waste_logit": self.waste_head(z).squeeze(-1)}`; `model.py:8-9` — `@dataclass class ForecasterConfig: obs_dim: int = 11` (field đầu tiên); sidecar đọc `cfg.obs_dim` tại `main.py:167` sau khi load checkpoint; sidecar dùng `out["demand"]` và `out["waste_logit"]` tại `main.py:136-137`. ForecasterConfig.obs_dim default=11 nhưng giá trị runtime lấy từ checkpoint dict.
- **Verified by:** implementer T0.2 — 2026-06-07
- **Dùng ở:** thesis section AI/ML — kiến trúc Forecaster LSTM

### t0.2-action-space: CANDIDATES (11 phần tử, delta -0.30→+0.20); compute_mask trả (11,) bool
- **Evidence:** `dynamic-pricing-final/src/rl/reward.py:6-7` — `CANDIDATES = np.linspace(-0.30, 0.20, 11); CANDIDATES[6] = 0.0`; giá trị thực: `[-0.30, -0.25, -0.20, -0.15, -0.10, -0.05, 0.0, 0.05, 0.10, 0.15, 0.20]` (11 phần tử, bước 0.05); `reward.py:61` — `mask = np.ones(11, dtype=bool)` → shape (11,); sidecar dùng tại `main.py:289` `compute_mask(sv.freshness, sv.category)` và `main.py:296` `delta = float(CANDIDATES[action_idx])`. `len(CANDIDATES)==11 == N_ACTIONS`.
- **Verified by:** implementer T0.2 — 2026-06-07
- **Dùng ở:** thesis section AI/ML — không gian hành động, chiến lược định giá

### t0.3-obs-parity: Obs 10 chiều sidecar vs env — 1 lệch nghiêm trọng (chiều 7), 2 lệch tiềm ẩn (chiều 2/3, chiều 9); hằng số khớp 100%
- **Evidence:**
  - Sidecar `_build_obs`: `pricing-sidecar/main.py:88-121` — vector 10 chiều, hằng số tại `main.py:77-79`
  - Env `_build_obs`: `dynamic-pricing-final/src/env/market_env.py:125-158` — vector 10 chiều
  - Hằng số env: `dynamic-pricing-final/src/env/freshness.py:4,7-12` (WASTE_THRESHOLD=0.50, DAILY_DECAY 4 cat); `dynamic-pricing-final/data/params/demand_params.json` (base_demand 4 cat)
  - **Chiều 0–5, 8:** công thức và hằng số KHỚP hoàn toàn
  - **Chiều 6 (prev_delta):** lệch thiết kế vô hại — env không clip, sidecar clip [-0.30,0.20]; trong thực tế delta luôn ∈ CANDIDATES ⊂ [-0.30,0.20]
  - **Chiều 7 (comp_ratio) — LỆCH NGHIÊM TRỌNG:** env tính `comp_prices / max(current_price, 1e-6)` (`market_env.py:134`) — chia cho giá hiện tại đã điều chỉnh delta; sidecar tính `competitor_ref_price / base_price` (`main.py:108`) — chia cho base_price cố định. Khi delta≠0 (phần lớn quyết định thực tế), hai giá trị khác nhau, mô hình nhận tín hiệu cạnh tranh sai
  - **Chiều 2&3 (sin/cos dow) — LỆCH TIỀM ẨN:** env dùng `self._t % 7` (`market_env.py:132`); sidecar dùng `datetime.now().weekday()` (`main.py:98`). Offset thời gian tuần hoàn không đảm bảo đồng pha với lúc train
  - **Chiều 9 (inv_coverage) — LỆCH TIỀM ẨN:** env mẫu số `demand_yesterday * 7` (`market_env.py:144`); sidecar mẫu số `demand_7d` (`main.py:107`) — ngữ nghĩa phụ thuộc caller; cần xác minh T0.7
  - **Hằng số DAILY_DECAY, BASE_DEMAND, WASTE_THRESHOLD:** tất cả 9 giá trị KHỚP hoàn toàn (xác minh qua freshness.py + demand_params.json)
- **Verified by:** implementer T0.3 — 2026-06-07
- **Dùng ở:** kết luận Task 0; thesis section AI/ML — train↔serve parity

### t0.4-forecaster-parity: Forecaster serve lệch kép — obs layout mismatch + tile-21×

- **Evidence:**
  - **Checkpoint thật** (`dynamic-pricing-final/checkpoints/forecaster_v4_best.pt`):
    ```
    model_cfg = {'obs_dim': 11, 'window': 21, 'n_categories': 4, 'cat_embed_dim': 8, 'lstm_hidden': 128, 'lstm_layers': 2, 'lstm_dropout': 0.2}
    ```
    Lệnh thật: `cd /Users/macos/f2t/pricing-sidecar && .venv/bin/python -c "import torch; ck=torch.load('...forecaster_v4_best.pt', map_location='cpu', weights_only=False); print('model_cfg =', ck['model_cfg'])"`
  - **LSTM weight xác nhận input_size=11:** `state['lstm.weight_ih_l0'].shape = torch.Size([512, 11])` → `4×128=512` hidden gates, `input_size=11`
  - **Current env OBS_DIM=10:** `dynamic-pricing-final/src/env/market_env.py:9` — `OBS_DIM = 10`; `obs_window()` trả `(21, 10)` (xác minh chạy: `obs_window shape = (21, 10)`)
  - **Parquet train thật có 11 chiều:** `np.stack(df.iloc[0]['features']).shape = (21, 11)` — parquet được save bởi phiên bản cũ của env với `OBS_DIM=11`. Feature bổ sung nằm ở **index 2** (không phải cuối): range 0.57..1.12, có thể là `price_ratio = current_price/ref_price`.
  - **Sidecar pad sai vị trí:** `pricing-sidecar/main.py:130` — `obs_padded = np.pad(obs, (0, forecaster_obs_dim - len(obs)))` → pad `0.0` ở **cuối** (index 10), nhưng chiều bị mất lúc train nằm ở **index 2**. Từ index 2 trở đi, tất cả features bị lệch vị trí 1.
  - **Tile-21×:** `main.py:131` — `window = np.tile(obs_padded, (OBS_WINDOW, 1))` → 21 hàng identical. Train data: 21 timestep thực sự khác nhau (xác minh: `generate_dataset` → `are all rows identical? False`). LSTM không còn thấy temporal dynamics.
  - **Training data path:** `data.py:68` — `"features": hist[i]["obs_window"].astype(np.float32)` với `obs_window()` → `(OBS_WINDOW, OBS_DIM)` chuỗi thật; `train.py:38` — `np.stack(r["features"])` để restore shape `(window, obs_dim)`.
- **Verified by:** implementer T0.4 — 2026-06-07
- **Dùng ở:** kết luận Task 0; thesis section AI/ML — train↔serve parity (forecaster); mục limitations

### t0.5-checkpoint-load: 2 checkpoint load OK + shape inference

- **Evidence:** pytest thật — `cd /Users/macos/f2t/pricing-sidecar && .venv/bin/python -m pytest tests/test_smoke_load.py -v`
  ```
  platform darwin -- Python 3.13.9, pytest-9.0.3, pluggy-1.6.0
  tests/test_smoke_load.py::test_ddqn_loads_and_infers PASSED              [ 50%]
  tests/test_smoke_load.py::test_forecaster_loads_and_infers PASSED        [100%]
  2 passed in 0.89s
  ```
  - `rl_shared_best.pt` → `SharedMLPDuelingQNet(obs_dim=10, n_cats=4, cat_embed_dim=8, hidden=128, n_actions=11)` — load OK, `q.shape=(1,11)`, missing=[], unexpected=[]
  - `forecaster_v4_best.pt` → `ForecasterLSTM(ForecasterConfig(**ck["model_cfg"]))` — load OK, `out` chứa `"demand"` + `"waste_logit"`, missing=[], unexpected=[]
  - Prefix `_orig_mod.` (torch.compile) được xử lý bởi test; sau khi strip, state_dict khớp hoàn toàn
  - Test file: `/Users/macos/f2t/pricing-sidecar/tests/test_smoke_load.py`
- **Verified by:** implementer T0.5 — 2026-06-07
- **Dùng ở:** kết luận Task 0; thesis section AI/ML — checkpoint integrity

### t0.6-coreml-freshness: 2 model CoreML (fruit/root) load + predict OK; non-fruit→root là thiết kế cố ý

- **Evidence:** pytest thật — `cd /Users/macos/f2t/pricing-sidecar && .venv/bin/python -m pytest tests/test_coreml_freshness.py -v -s`
  ```
  platform darwin -- Python 3.13.9, pytest-9.0.3, pluggy-1.6.0
  tests/test_coreml_freshness.py::test_coreml_predict[MyFreshnessClassifier-fruit.mlmodel] MyFreshnessClassifier-fruit.mlmodel -> {'target': 'fresh', 'targetProbability': {'fresh': 0.9261168413538724, 'rotten': 0.07388315864612756}}
  PASSED
  tests/test_coreml_freshness.py::test_coreml_predict[MyFreshnessClassifier-root.mlmodel] MyFreshnessClassifier-root.mlmodel -> {'target': 'rotten', 'targetProbability': {'fresh': 0.4769286231512916, 'rotten': 0.5230713768487084}}
  PASSED
  2 passed in 2.65s
  ```
  - **Model files:** `/Users/macos/f2t/freshnessmodels/MyFreshnessClassifier-fruit.mlmodel` và `MyFreshnessClassifier-root.mlmodel` (2 model, không có leafy/herbs riêng)
  - **Input shape:** `name=image`, `imageType { width: 299, height: 299, colorSpace: BGR }` — khớp với sidecar `main.py:321` (`model.predict({"image": img})`)
  - **Output keys:** `target` (string: "fresh"/"rotten") + `targetProbability` (dict string→float) — khớp với `main.py:324-326`
  - **Predict mẫu (ảnh xanh lá 299×299 RGB):**
    - fruit model: `target="fresh"`, `fresh=0.9261`, `rotten=0.0739`
    - root model: `target="rotten"`, `fresh=0.4769`, `rotten=0.5231`
  - **Mapping fallback:** `main.py:314` — `model_key = "fruit" if req.category in ("fruit","fruits") else "root"` → leafy/herbs/root đều dùng model root. Thiết kế cố ý (2 model, không phải 4).
  - **coremltools:** version 9.0, có sẵn trong venv (không cần cài thêm)
  - **Test file:** `/Users/macos/f2t/pricing-sidecar/tests/test_coreml_freshness.py`
- **Verified by:** implementer T0.6 — 2026-06-07
- **Dùng ở:** kết luận Task 0; thesis section AI/ML — freshness classification sidecar

> (Còn thiếu — T0.7–T0.10 sẽ nạp: luồng backend→sidecar, integration test, kết luận cuối.)

## Nhóm: Thiết kế CSDL

> (Trống — Task 2 nạp từ schema thật trong f2t-backend.)

## Nhóm: Luồng nghiệp vụ / diagram

### t0.7-backend-payload: Backend → sidecar gửi đủ 9 field; inventory_ratio = availableQuantity/100; demand_7d = tổng 7 ngày từ ForecasterLSTM; competitor_ref_price từ DB địa lý thật

- **Evidence:**
  - **File tích hợp chính:** `f2t-backend/src/modules/dynamic-pricing/dynamic-pricing.service.ts` và `f2t-backend/src/modules/demand-forecasting/demand-forecasting.service.ts`
  - **Payload build `/predict`:** `dynamic-pricing.service.ts:265-275` (single) và `dynamic-pricing.service.ts:503-513` (batch tick) — 9 field tường minh, không có default sidecar
  - **`inventory_ratio`:** `dynamic-pricing.service.ts:228` — `Math.min((product.availableQuantity ?? 0) / 100, 2.0)` — KHỚP env `market_env.py:148` `min(inv / 100.0, 2.0)` hoàn toàn
  - **`demand_7d`:** `dynamic-pricing.service.ts:274` — `forecast.demand7d` từ `DemandForecastingService.getForecast()` → gọi `pricing-sidecar/main.py:259-270` `/forecast` endpoint → `_run_forecaster` → ForecasterLSTM output `out["demand"]`. Sidecar dùng `demand_7d / 7` để ra demand_ratio (`main.py:105`), so với env dùng `demand_yesterday/base_demand` (`market_env.py:152`). **Semantics: demand_7d là tổng 7 ngày dự báo; chia 7 = trung bình ngày = tương đương demand_yesterday của env.** Tuy nhiên giá trị bị ảnh hưởng bởi lệch kép forecaster (T0.4)
  - **Bootstrap `/forecast`:** `demand-forecasting.service.ts:54` — `demand_7d: 0.0` (hard-coded) khi gọi `/forecast`. Vòng lặp: `/forecast` nhận `demand_7d=0` → output `demand7d=X` → backend gửi `X` vào `/predict`. Không iterative
  - **`competitor_ref_price`:** `dynamic-pricing.service.ts:84-124` — MongoDB `$near` query bán kính 10km, trả trung bình `pricePerUnit` của competitor cùng category. Fallback: `ownPrice * 0.95`. Có thật từ DB, không hardcode. Env train dùng synthetic `ref_price × Uniform(0.85, 1.15)` — concept khớp, nguồn khác
  - **`base_price`:** `dynamic-pricing.service.ts:270` — `product.pricePerUnit` (DB column trực tiếp)
  - **`prev_delta`:** `dynamic-pricing.service.ts:240` — `(lastOverride.deltaPct ?? 0) / 100` từ MongoDB PriceOverride cuối cùng. Khớp env `self._prev_delta[cat]` (delta action cuối)
  - **`days_to_restock`:** `dynamic-pricing.service.ts:71-82` — `computeDaysToRestock(schedule, category, lastRestockedAt)` từ `farm.restockSchedule` và `product.lastRestockedAt`. Khớp ngữ nghĩa
  - **`freshness`:** `dynamic-pricing.service.ts:223` — `cache?.medianScore ?? computeWeibullFallback(category)` từ FreshnessCache (CoreML scan) hoặc Weibull fallback
  - **Lệch chiều 7 (comp_ratio) VẪN TỒN TẠI:** `main.py:108` — sidecar tính `competitor_ref_price / base_price` (chia base_price cố định); env tính `comp_prices / max(current_price, 1e-6)` (chia current_price đã điều chỉnh). Đây là lệch nghiêm trọng đã ghi tại T0.3 — backend gửi đúng field nhưng sidecar xử lý sai
- **Verified by:** implementer T0.7 — 2026-06-07
- **Dùng ở:** kết luận Task 0; thesis section Luồng nghiệp vụ — backend→sidecar integration; thesis section Limitations — train↔serve gap

### t0.9-fixes: Fix gaps — comp_ratio sửa; RGB/BGR + dow document-only

- **Evidence:**

  **FIX 1 — comp_ratio dim7 (ĐÃ ÁP):**
  - File sửa: `pricing-sidecar/main.py:108-112`
  - Trước: `comp_ratio = (competitor_ref_price / base_price) if base_price > 0 else 1.0`
  - Sau: `current_price = base_price * (1.0 + prev_delta); comp_ratio = competitor_ref_price / max(current_price, 1e-6)`
  - Evidence env: `dynamic-pricing-final/src/env/market_env.py:134` — `comp_ratio = self._comp_prices[cat] / max(self._prices[cat], 1e-6)` (chia current_price đã áp delta)
  - Tác động: khi `prev_delta≠0`, comp_ratio cũ lệch; VD `prev_delta=-0.05`, `base=20000`, `comp=19000`: cũ=0.950, mới=1.000

  **FIX 2 — RGB/BGR (DOCUMENT-ONLY — KHÔNG SỬA CODE):**
  - Thực nghiệm: yellow-green (R=150,G=200,B=60) feed RGB: fresh=`0.9634`; BGR-swap: fresh=`0.1628` — RGB as-is cho kết quả đúng
  - Red image: RGB: fresh=`0.7956`; BGR-swap: fresh=`0.5128` — khác biệt đáng kể
  - coremltools 9.0 source (`model.py:1032-1038`): chỉ validate `mode==RGB`, KHÔNG swap channels. colorSpace=BGR là Create ML/Metal artifact, không ảnh hưởng PIL feed
  - **Kết luận: `.convert("RGB")` ở `main.py:320` là ĐÚNG — model expect RGB**

  **FIX 3 — dow lệch pha (DOCUMENT-ONLY — KHÔNG SỬA CODE):**
  - `demand_params.json`: sin_weekly/cos_weekly tất cả categories rất nhỏ (max ~0.023). Seasonal factor tối đa ±3.1% (root), herbs=0
  - Demand formula: `season = 1.0 + sin_w*sin(2π*dow/7) + cos_w*cos(2π*dow/7)` (`demand.py:47`)
  - Lệch pha tối đa 6 ngày → sai số season factor tối đa ~6.2% — biên độ nhỏ, chấp nhận được
  - Env không neo lịch (`t%7`, t=0 bất kỳ ngày). Wall-clock weekday hợp lý hơn về ngữ nghĩa thực tế
  - **Kết luận: lệch pha dow là "lành tính" — KHÔNG SỬA**

  **Re-verify gate:**
  - pytest: `4 passed in 0.91s` — test_ddqn_loads_and_infers PASSED, test_forecaster_loads_and_infers PASSED, test_coreml_predict[fruit] PASSED, test_coreml_predict[root] PASSED
  - `/predict` 2 ca (port 8231): ca1 leafy→`{"targetPrice":10000.0,"delta_pct":0.0}` OK; ca2 fruit critical→`{"targetPrice":15000.0,"delta_pct":-25.0,"safety_clipped":true}` OK — không crash sau fix

- **Verified by:** implementer T0.9 — 2026-06-07
- **Dùng ở:** kết luận Task 0; thesis section Limitations — train↔serve gap (comp_ratio fixed; RGB an toàn; dow lệch pha nhỏ)

### t0.10-conclusion: Kết luận Task 0 — sidecar phục vụ dynamic-pricing-final (định giá trung thực; dự báo có giới hạn)
- **Evidence:** tổng hợp T0.1–T0.9 (progress/task-0.md mục T0.10).
  - `/predict` (DDQN): trung thực sau fix comp_ratio — obs 10 chiều khớp `market_env.py`, checkpoint load sạch, runtime hợp lý.
  - `/forecast` (ForecasterLSTM): KHÔNG trung thực — train obs_dim=11 layout cũ + chuỗi thật, serve feed 10-chiều-pad-cuối + tile-21×. Giữ nguyên theo quyết định user (không retrain).
  - `/freshness`: OK (RGB đúng; 2/4 category có model riêng, non-fruit→root).
  - Backend gửi đủ 9 field; kiến trúc dùng đúng 10 chiều (không phải 10-12).
- **Verified by:** controller T0.10 — 2026-06-07
- **Dùng ở:** thesis chương AI/ML (kiến trúc + Limitations) + chương Kiến trúc hệ thống (luồng backend→sidecar)

### t0.10-thesis-limitations: 3 giới hạn phải ghi trung thực trong thesis
- **Evidence:** (1) forecaster train↔serve mismatch → `/forecast` là xấp xỉ, nên trình bày kết quả qua offline eval `src/forecaster/eval.py` thay vì serve; (2) dow phase serve dùng weekday thật vs train `t%7` (ảnh hưởng <6.2%, demand_params.json sin/cos_weekly); (3) freshness chỉ 2 CoreML model (fruit/root), leafy/herbs dùng chung "root".
- **Verified by:** controller T0.10 — 2026-06-07
- **Dùng ở:** thesis section Limitations / Future work

---

## Nhóm: Task 1 — fact-check dany.md (T1.4 audit)

> Đối chiếu `docs/thesis/dany.md` (dàn ý khóa luận) với code thật. Audit đầy đủ: `docs/thesis/dany.audit.md`. Mỗi entry verify ĐỘC LẬP bởi controller (không chỉ tin subagent).

### t1.4-no-recommender: f2t KHÔNG có hệ thống gợi ý (recommender) — toàn bộ claim recommender trong dany.md là BỊA
- **Evidence:** `grep -rliE 'recommend|itemitem|collaborative|content-based|cosine' f2t-backend/src` = **0 file** (controller chạy lại). Không có module recommender (13 module: admin, auth, delivery, demand-forecasting, dynamic-pricing, farms, notifications, orders, payments, posts, products, uploads, users). Không có collection `recommendation_caches` (`grep -rliE 'recommendation_cache|recommendationcache' f2t-backend/src` = 0). Frontend `feed.tsx::useForYouPosts` = bài đăng (posts), KHÔNG phải product recommender.
- **Verified by:** controller T1.4 (chạy lại grep độc lập) — 2026-06-07
- **Dùng ở:** dany.md MT3, ĐG2, §2.4.1–2.4.2, §3.3.7(a), UC-ML-01, SD-ML-01/02, §3.5.1, §4.4.2 (XÓA/VIẾT LẠI)

### t1.4-forecaster-not-holt: Dự báo nhu cầu là ForecasterLSTM, KHÔNG phải Holt EWMA
- **Evidence:** `dynamic-pricing-final/src/forecaster/model.py` — `nn.LSTM`, 2 lớp, output `{demand, waste_logit}` (ledger `t0.2-forecaster-arch`, `t0.4-forecaster-parity`). Backend `f2t-backend/src/modules/demand-forecasting/demand-forecasting.service.ts:43` gọi `${sidecarUrl}/forecast` (cùng sidecar 8000). `grep -riE 'holt|ewma' f2t-backend/src` không trả thuật toán Holt nào. Không có CI, không có DoW seasonality factor ở serve.
- **Verified by:** controller T1.4 — 2026-06-07
- **Dùng ở:** dany.md MT4, ĐG3, §2.4.3–2.4.4, SD-ML-04, AD-ML-03, §4.4.3 (VIẾT LẠI)

### t1.4-ddqn-dims: DDQN state 10 chiều, 11 action, SharedMLPDuelingQNet — KHÔNG phải 5-dim/5-action/MLP-5→64→32→5
- **Evidence:** obs 10 chiều (ledger `t0.3-obs-parity`, `pricing-sidecar/main.py:114-125`); 11 action `CANDIDATES=linspace(-0.30,0.20,11)` (`dynamic-pricing-final/src/rl/reward.py:6-7`, ledger `t0.2-action-space`); mạng `SharedMLPDuelingQNet(obs_dim=10,n_cats=4,cat_embed_dim=8,hidden=128,n_actions=11)` Dueling V/A heads (`src/rl/network.py:51-57`, ledger `t0.2-ddqn-arch`). Hyperparam (cần subagent T1.8 resolve lại tại nguồn): audit ghi buffer 50k/batch 256/ε 1.0→0.05 (`agent.py`, `train.py`) — CHƯA verify độc lập bởi controller, T1.8 phải resolve.
- **Verified by:** controller T1.4 (dims/action/network qua ledger Task 0); hyperparam = pending T1.8 — 2026-06-07
- **Dùng ở:** dany.md §2.4.5, §3.3.7(c) (VIẾT LẠI)

### t1.4-freshness-coreml: Freshness = 2 CoreML model (fruit/root) nhị phân fresh/rotten — KHÔNG phải MobileNetV2 4-class
- **Evidence:** ledger `t0.6-coreml-freshness`; `freshnessmodels/MyFreshnessClassifier-fruit.mlmodel` + `-root.mlmodel`; endpoint `pricing-sidecar/main.py:307` `/freshness/classify`; non-fruit→model root. Không có training script ảnh, không có dataset tự thu thập.
- **Verified by:** controller T1.4 — 2026-06-07
- **Dùng ở:** dany.md MT6, ĐG5, §2.4.6, §3.3.7(d), §4.4.5 (VIẾT LẠI)

### t1.4-one-sidecar: Chỉ 1 sidecar (pricing-sidecar, port 8000, 3 endpoint) — KHÔNG phải 3 sidecar 8000/8001/8002
- **Evidence:** chỉ thư mục `pricing-sidecar/` (controller `ls` repo: không có recommender/forecast sidecar). `f2t-backend/src/app.module.ts:57` 1 SIDECAR_URL→8000. `demand-forecasting.service.ts:43` dùng cùng URL. 3 endpoint trên cùng 1 service: `/predict`, `/forecast`, `/freshness/classify`.
- **Verified by:** controller T1.4 — 2026-06-07
- **Dùng ở:** dany.md §1.3, §3.3.1 (diagram), §4.1, §4.2.1, §5.1 (VIẾT LẠI/SỬA)

### t1.4-collections: 10 collection MongoDB thật; KHÔNG có recommendation_caches/forecast_caches
- **Evidence:** `find f2t-backend/src -name "*.schema.ts"` = 10 file (controller chạy lại): user, farm, product, order, post, notification, **notification-preferences**, freshness-cache, price-override, **verification-token**. recommendation_caches/forecast_caches = 0 ref. Schema thật khác thesis: `freshness-cache.schema.ts` có `readings[{score,scannedAt}]`+`medianScore` (không `scores[5]`/`label`); `user.schema.ts` location embedded (không `addresses[]`); `price-override.schema.ts` status enum gồm `shadow/pending_review/accepted/rejected/expired`.
- **Verified by:** controller T1.4 (chạy lại find + grep) — 2026-06-07
- **Dùng ở:** dany.md §3.4.2, §3.4.3, §4.4.1 (CSDL — ưu tiên cao, VIẾT LẠI)

### t1.4-safety-5-rules: Safety Layer = 5 rule tường minh trong safety.py (thứ tự áp: 3→4→1→2→5)
- **Evidence:** `pricing-sidecar/safety.py:1-19` (controller đọc): Rule 3 clip `price∈[base×0.70, base×1.20]` (tick ±: −30%/+20%); Rule 4 `freshness<0.4 → price≤base×0.75`; Rule 1 sàn `price≥base×0.55`; Rule 2 trần `price≤base×2.0`; Rule 5 `price≥1000`. ⚠️ Thesis QT1 "−30%"/QT2 "+20%" thực ra KHỚP cận Rule 3 (không sai như audit row 3.9 ngụ ý); T1.8 phải trình bày CHÍNH XÁC cả 5 rule + làm rõ tick-clip [0.70,1.20] vs sàn/trần tuyệt đối [0.55, 2.0]+1000.
- **Verified by:** controller T1.4 (đọc safety.py trực tiếp) — 2026-06-07
- **Dùng ở:** dany.md ĐG4, §3.3.7(c) Safety Layer, AD-ML-04

### t1.4-interceptor-cron: DynamicPricingInterceptor + PricingTickCron có thật (claim ĐÚNG — GIỮ)
- **Evidence:** audit T1.4 trỏ `f2t-backend/src/common/interceptors/dynamic-pricing.interceptor.ts` (chặn path `/products`, nhúng `dynamicPrice/freshnessScore/priceTag`) + `pricing-tick.cron.ts:18` cron `"0 * * * *"`. CHƯA verify độc lập từng dòng bởi controller — leaf-task tương ứng (T1.12) phải resolve citation tại nguồn trước khi viết prose.
- **Verified by:** subagent T1.4 (đề xuất GIỮ); controller resolve lại ở T1.12 — 2026-06-07
- **Dùng ở:** dany.md ĐG6, §4.2.2

### t1.4-unverified: Claim CHƯA chứng minh — cần đếm/chạy trước khi viết
- **Evidence:** "54/54 unit test" (audit: 21 file `*.spec.ts`, chưa đếm `it()`); "0 lỗi TypeScript build" (chưa chạy `tsc`); "42 màn hình" (audit: ~50-58 tsx trong `src/app`, chưa lọc screen thật); "24+ endpoint" (audit đếm 79 qua grep `@Get/@Post/...`). → T1.15 phải resolve bằng lệnh đếm/chạy thật; nếu không chứng minh được thì KHÔNG ghi con số tuyệt đối vào thesis.
- **Verified by:** pending T1.15 — 2026-06-07
- **Dùng ở:** dany.md §4.3, §4.4.1, §5.1
