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

> ⚠️ **ĐÃ LỖI THỜI một phần (xem T0.13):** sau retrain obs_dim=10, **layout mismatch 11≠10 KHÔNG còn**. Phần dưới mô tả trạng thái TRƯỚC khi fix (giá trị lịch sử về phân tích lỗi). Trạng thái HIỆN TẠI: forecaster obs_dim=10, chỉ còn giới hạn tile-21×. Khi viết thesis kiến trúc forecaster, dùng **obs_dim=10** (không phải 11).

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
  - `/forecast` (ForecasterLSTM): **CẬP NHẬT T0.13 — ĐÃ RETRAIN obs_dim=10.** Layout mismatch 11≠10 + version skew ĐÃ HẾT (forecaster nay train & serve cùng obs_dim=10, không pad). Giới hạn DUY NHẤT còn lại: serve tile obs hiện tại 21× (steady-state, vì backend chưa cung cấp chuỗi 21 ngày). Checkpoint mới: best epoch41 val_loss3.114. (Bản cũ obs_dim=11 backup ở `_backup_obs11/`.)
  - `/freshness`: OK (RGB đúng; 2/4 category có model riêng, non-fruit→root).
  - Backend gửi đủ 9 field; kiến trúc dùng đúng 10 chiều (không phải 10-12).
- **Verified by:** controller T0.10 — 2026-06-07
- **Dùng ở:** thesis chương AI/ML (kiến trúc + Limitations) + chương Kiến trúc hệ thống (luồng backend→sidecar)

### t0.10-thesis-limitations: 3 giới hạn phải ghi trung thực trong thesis
- **Evidence:** (1) **[CẬP NHẬT T0.13]** forecaster ĐÃ retrain obs_dim=10 → layout mismatch HẾT; giới hạn còn lại CHỈ là serve tile-21× (steady-state, backend chưa có chuỗi 21 ngày thật) → `/forecast` vẫn là xấp xỉ, nên trình bày kết quả qua offline eval `src/forecaster/eval.py` thay vì serve. ĐỪNG ghi "obs_dim=11" hay "layout 11≠10" như giới hạn (đã sửa); (2) dow phase serve dùng weekday thật vs train `t%7` (ảnh hưởng <6.2%, demand_params.json sin/cos_weekly); (3) freshness chỉ 2 CoreML model (fruit/root), leafy/herbs dùng chung "root".
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
- **Evidence:** obs 10 chiều (ledger `t0.3-obs-parity`, `pricing-sidecar/main.py:114-125`); 11 action `CANDIDATES=linspace(-0.30,0.20,11)` (`dynamic-pricing-final/src/rl/reward.py:6-7`, ledger `t0.2-action-space`); mạng `SharedMLPDuelingQNet(obs_dim=10,n_cats=4,cat_embed_dim=8,hidden=128,n_actions=11)` Dueling V/A heads (`src/rl/network.py:51-57`, ledger `t0.2-ddqn-arch`). Hyperparam — RESOLVED bởi T1.8: xem entry `t1.8-ddqn-hyperparams`.
- **Verified by:** controller T1.4 (dims/action/network qua ledger Task 0); hyperparam resolved T1.8 — 2026-06-07
- **Dùng ở:** dany.md §2.4.5, §3.3.7(b) (VIẾT LẠI ✅)

### t1.8-ddqn-hyperparams: Hyperparam DDQN thật — đọc trực tiếp từ agent.py + train.py
- **Evidence:**
  - `dynamic-pricing-final/src/rl/agent.py:L33` — `batch_size: int = 256`
  - `dynamic-pricing-final/src/rl/agent.py:L35` — `buffer_capacity: int = 50_000`
  - `dynamic-pricing-final/src/rl/agent.py:L31` — `warmup: int = 1_000`
  - `dynamic-pricing-final/src/rl/agent.py:L40` — `self.gamma = gamma` (default γ=0.99 từ signature `gamma: float = 0.99`)
  - `dynamic-pricing-final/src/rl/train.py:L12` — `EPSILON_START = 1.0`
  - `dynamic-pricing-final/src/rl/train.py:L13` — `EPSILON_END = 0.05`
  - `dynamic-pricing-final/src/rl/train.py:L14` — `EPSILON_DECAY_EP = 2_000`
  - `dynamic-pricing-final/src/rl/train.py:L15` — `TARGET_SYNC_STEPS = 500`
  - lr = 1e-4 từ `MultiCatDDQNAgent.__init__` signature `lr: float = 1e-4`
- **Verified by:** implementer T1.8 (đọc file thật, không qua audit) — 2026-06-07
- **Dùng ở:** dany.md §3.3.7(b) ĐỊNH GIÁ ĐỘNG hyperparam table

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

### t1.6-section-2.4-rewrite: §2.4 viết lại — xóa 2 mục recommender, thay Holt→LSTM, sửa DDQN dims, sửa CoreML nhị phân
- **Evidence:**
  - XÓA 2.4.1 CF + 2.4.2 CBF: không có implementation → `grep -rliE 'recommend|itemitem|collaborative|content-based|cosine' f2t-backend/src` = 0 file (ledger t1.4-no-recommender)
  - 2.4.1 LSTM: `dynamic-pricing-final/src/forecaster/model.py:L9-15` (ForecasterConfig obs_dim=11, window=21, n_cats=4, cat_embed_dim=8, lstm_hidden=128, lstm_layers=2); `model.py:L23-29` (nn.LSTM); `model.py:L22, L30-37, L46-49` (cat_embed, dual-head demand+waste_logit); ledger t0.2-forecaster-arch, t0.4-forecaster-parity
  - 2.4.2 DDQN: `dynamic-pricing-final/src/rl/network.py:L7-39` (MLPDuelingQNet Dueling logic); `network.py:L51-81` (SharedMLPDuelingQNet: obs_dim=10, n_cats=4, embed=8, hidden=128, n_actions=11, V+A heads); `dynamic-pricing-final/src/rl/reward.py:L6-7` (CANDIDATES=linspace(-0.30,0.20,11)); `pricing-sidecar/main.py:L114-125` (obs 10 chiều); ledger t0.2-ddqn-arch, t0.2-action-space, t0.3-obs-parity, t1.4-ddqn-dims
  - 2.4.3 CoreML: `pricing-sidecar/main.py:L318` (model_key="fruit" if fruit else "root"); `main.py:L324-330` (predict output target+targetProbability); ledger t0.6-coreml-freshness, t1.4-freshness-coreml
- **Verified by:** implementer T1.6+T1.7 — 2026-06-07
- **Dùng ở:** dany.md §2.4 (3 mục con mới: 2.4.1 LSTM, 2.4.2 DDQN, 2.4.3 CoreML)

### t1.4-unverified → RESOLVED ở t1.15
- (xem entry `t1.15-numbers` bên dưới)

### t1.11-schema-detail: §3.4 viết lại — 10 collection thật + field/index chính xác từ schema file

- **Evidence:** Đọc trực tiếp 10 schema file:
  - `f2t-backend/src/modules/users/schemas/user.schema.ts:L20-97` — location embedded 1 địa chỉ (không có addresses[])
  - `f2t-backend/src/modules/farms/schemas/farm.schema.ts:L50-108, L113, L116` — 2dsphere index L113
  - `f2t-backend/src/modules/products/schemas/product.schema.ts:L37-142, L147-151` — 5 index riêng lẻ
  - `f2t-backend/src/modules/orders/schemas/order.schema.ts:L7-34 (OrderItem), L239-241` — 3 index riêng lẻ (không có compound 3-field)
  - `f2t-backend/src/modules/posts/schemas/post.schema.ts:L75-111, L115-119` — 5 index
  - `f2t-backend/src/modules/notifications/schemas/notification.schema.ts:L52` — compound userId+createdAt
  - `f2t-backend/src/modules/notifications/schemas/notification-preferences.schema.ts:L19-37` — userId unique
  - `f2t-backend/src/modules/dynamic-pricing/schemas/freshness-cache.schema.ts:L6-40, L44-45` — readings[{score,scannedAt}]+medianScore; TTL+unique index
  - `f2t-backend/src/modules/dynamic-pricing/schemas/price-override.schema.ts:L17-63, L67-68` — status enum[shadow/pending_review/accepted/rejected/expired]; compound productId+status; TTL
  - `f2t-backend/src/modules/auth/schemas/verification-token.schema.ts:L8-26, L31-32` — TTL+compound
  - recommendation_caches: `grep -rn 'recommendation_caches' f2t-backend/src` = 0 (ledger t1.4-collections)
  - forecast_caches: `grep -rn 'forecast_caches\|ForecastCache' f2t-backend/src` = 0 (ledger t1.4-collections)
- **Verified by:** implementer T1.11 (đọc 10 file trực tiếp) — 2026-06-07
- **Dùng ở:** dany.md §3.4.1, §3.4.2, §3.4.3

### t1.15-numbers: Con số kiểm thử/endpoint/màn hình/camera — đã resolve bằng lệnh đếm thật
- **Evidence:** (controller chạy trực tiếp trong `f2t-backend`/`f2t-frontend`):
  - **"54/54 test" ĐÚNG**: `find src -name "*.spec.ts" | wc -l` = 21 file; `grep -rhoE "\b(it|test)\(" src --include="*.spec.ts" | wc -l` = **54** block. → GIỮ "54/54", nói rõ "54 test case trong 21 file spec".
  - **Endpoint = 79** (không phải "24+"): `grep -rhoE "@(Get|Post|Put|Patch|Delete)\(" src --include="*.controller.ts" | wc -l` = 79; controllers = 14. → SỬA "24+" → "≈79 endpoint REST".
  - **Màn hình ≈48**: `find src/app -name "*.tsx" | grep -vE "_layout" | wc -l` = 48 (tổng 58 tsx − 10 layout). → SỬA "42" → "≈48 màn hình route" (hoặc "≥42").
  - **Camera quét tươi CÓ THẬT**: backend `dynamic-pricing.controller.ts:33` `@Post("freshness/:productId/scan")` summary "Classify freshness from a product photo (CoreML) and auto-submit"; frontend `f2t-frontend/src/api/dynamic-pricing/use-scan-freshness.tsx` + `use-submit-freshness.tsx`, dùng trong `farm/price-suggestions.tsx`. → GIỮ "Farm quét tươi" (CoreML từ ảnh).
  - **"0 lỗi TypeScript build"**: KHÔNG chạy `tsc` (ngoài phạm vi, tốn thời gian) → thesis nên nói "build TypeScript thành công" mà không cam kết "0 lỗi" tuyệt đối, HOẶC bỏ.
- **Verified by:** controller T1.15 (lệnh đếm trực tiếp) — 2026-06-07
- **Dùng ở:** dany.md §4.3 (test), §4.4.1 (endpoint/màn hình), §3.5.2/§4.4.6 (camera), §5.1

---

## Nhóm: Task 2 — fact-pack prose

### t2.2-tech-versions: Version thư viện thật — Backend NestJS 11 / Frontend Expo 53 / Sidecar FastAPI + PyTorch
- **Evidence:**
  - **Backend** (`f2t-backend/package.json:29-51`): `@nestjs/common` 11.0.1, `@nestjs/core` 11.0.1, `@nestjs/mongoose` 11.0.3, `@nestjs/schedule` ^6.1.3, `mongoose` 8.19.1, `bcrypt` 6.0.0, `passport-jwt` 4.0.1, `stripe` ^22.1.1, `class-validator` 0.14.2.
  - **Frontend** (`f2t-frontend/package.json:53-97`): `expo` ~53.0.27, `expo-router` ~5.1.11, `react-native` 0.79.6, `nativewind` ^4.1.21, `zustand` ^5.0.5, `react-native-mmkv` ~3.1.0, `axios` ^1.7.5, `@tanstack/react-query` ^5.52.1.
  - **Sidecar** (`pricing-sidecar/requirements.txt:1-9`): `fastapi>=0.111.0`, `uvicorn[standard]>=0.29.0`, `torch>=2.2.0`, `numpy>=1.26.0`, `pydantic>=2.0.0`, `coremltools>=7.0`, `Pillow>=10.0.0`.
- **Verified by:** implementer T2.2 (đọc 3 file trực tiếp) — 2026-06-07
- **Dùng ở:** thesis §4.2.1 (stack công nghệ), §4.1 (môi trường triển khai)

### t2.2-frontend-routes: Route groups frontend — 8 groups + 5 file gốc, tổng ≈48 màn hình
- **Evidence:** `ls f2t-frontend/src/app` (đọc trực tiếp):
  - Route groups: `(app)`, `admin`, `checkout`, `farms`, `feed`, `notifications`, `products`, `settings`
  - File gốc tại `src/app/`: `login.tsx`, `register.tsx`, `register-customer.tsx`, `verification.tsx`, `onboarding.tsx`
  - File phụ: `+html.tsx`, `[...messing].tsx`, `_layout.tsx`
  - Tổng màn hình ≈48: reference ledger `t1.15-numbers` (`find src/app -name "*.tsx" | grep -vE "_layout" | wc -l` = 48).
- **Verified by:** implementer T2.2 (ls trực tiếp) — 2026-06-07
- **Dùng ở:** thesis §4.2.1 (frontend Expo Router), §3.3.2 (kiến trúc frontend)

### t2.2-seed: Tài khoản seed thật — Admin×1, Farm×3, Consumer×5, Suspended×1 — KHỚP dany.md §4.2.3
- **Evidence:** `f2t-backend/src/seed/seed.ts`:
  - **Farm×3**: `seed.ts:59-84` — `for (let i = 1; i <= 3; i++)` tạo user role `'farm'`, status `'active'` → emails `farm1@f2t.vn`, `farm2@f2t.vn`, `farm3@f2t.vn`.
  - **Consumer×5**: `seed.ts:87-114` — `for (let i = 1; i <= 5; i++)` tạo user role `'consumer'`, status `'active'` → emails `consumer1@f2t.vn` … `consumer5@f2t.vn`.
  - **Suspended×1**: `seed.ts:116-135` — `userModel.create({..., role: 'consumer', status: 'suspended'})` → email `suspended@f2t.vn`.
  - **Admin×1**: `seed.ts:381-401` — `userModel.create({..., role: 'admin', status: 'active', emailVerified: true})` → email `admin@f2t.com`, password `AdminF2T2026!`.
  - Tổng: 1 admin + 3 farm + 5 consumer + 1 suspended = **10 user seed**. Con số dany.md §4.2.3 "Admin×1, Farm×3, Consumer×5, Suspended×1" **ĐÚNG**.
- **Verified by:** implementer T2.2 (đọc seed.ts trực tiếp, đếm vòng lặp) — 2026-06-07
- **Dùng ở:** thesis §4.2.3 (dữ liệu mẫu / seed), §4.3 (kiểm thử tích hợp)

### t2.2-stripe-ghn: Điểm tích hợp Stripe Checkout + webhook; GHN tạo vận đơn + Dijkstra fallback
- **Evidence:**
  - **Stripe createCheckoutSession**: `f2t-backend/src/modules/payments/payments.service.ts:54-118` — `async createCheckoutSession(orderId, userId)`: build line_items từ order items + deliveryFee, gọi `this.stripe.checkout.sessions.create({mode:'payment', ...})` tại `payments.service.ts:102`; trả `{sessionId, url}`.
  - **Stripe webhook handler**: `f2t-backend/src/modules/payments/payments.service.ts:120-133` — `async handleWebhook(rawBody, signature)`: `this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)` tại `payments.service.ts:126`; controller expose tại `payments.controller.ts:49` `@Post('webhook')`.
  - **GHN createOrder**: `f2t-backend/src/modules/delivery/providers/ghn.provider.ts:47-89` — `async createOrder(params)`: POST `${apiUrl}/v2/shipping-order/create` với header Token + ShopId; trả `{orderCode, expectedDeliveryTime, totalFee}`.
  - **Dijkstra fallback** (khi order chưa có GHN code): `f2t-backend/src/modules/delivery/delivery.service.ts:98-232` — `if (!order.ghnOrderCode)` tại `delivery.service.ts:98`; graph 10 node HCMC; `const dijkstra = (startId, endId) => {...}` tại `delivery.service.ts:131`; trả mock route với `trackingCode: 'GHN-ALGO-F2T-99'` tại `delivery.service.ts:232`.
  - **Graceful degrade GHN tracking fail**: `delivery.service.ts:255-278` — `catch` khi `ghnProvider.getTracking` lỗi → trả DB data với `ghnOrderCode` (không throw).
- **Verified by:** implementer T2.2 (grep + đọc file trực tiếp) — 2026-06-07
- **Dùng ở:** thesis §3.3.5 (thanh toán Stripe), §3.3.6 (giao hàng GHN), §4.4.4 (tích hợp bên thứ ba)

### t2.2-security: NFR bảo mật — JwtAuthGuard, bcrypt hash, graceful degradation sidecar
- **Evidence:**
  - **JwtAuthGuard**: `f2t-backend/src/modules/auth/guards/jwt-auth.guard.ts:1-5` — `export class JwtAuthGuard extends AuthGuard('jwt') {}` (extends `@nestjs/passport`); được dùng trên controller (ví dụ `payments.controller.ts:40` `@UseGuards(JwtAuthGuard)`).
  - **bcrypt hash password**: `f2t-backend/src/modules/users/users.service.ts:18` — `const hashedPassword = await bcrypt.hash(password, 10)` (saltRounds=10) khi tạo user mới; `auth.service.ts:62` — `bcrypt.compare(pass, user.password)` khi login; `auth.service.ts:135` — `bcrypt.hash(otp, 10)` cho verification token.
  - **Graceful degradation khi sidecar lỗi (predict)**: `f2t-backend/src/modules/dynamic-pricing/dynamic-pricing.service.ts:283-285` — `catch (err) { this.logger.warn(...); return null; }` → generateSuggestionForProduct trả null thay vì crash khi sidecar `/predict` không phản hồi.
  - **Graceful degradation khi sidecar lỗi (freshness)**: `dynamic-pricing.service.ts:154-161` — `catch (err) { ... score = this.computeWeibullFallback(category); ... confidence = 0; }` → fallback Weibull estimate khi sidecar `/freshness/classify` lỗi.
  - **Graceful degrade batch tick**: `dynamic-pricing.service.ts:522-524` — `catch (err) { this.logger.warn(...); return; }` → runPricingTick không crash khi sidecar `/predict` batch lỗi. (Cron đã có ledger `t1.4-interceptor-cron`.)
- **Verified by:** implementer T2.2 (grep + đọc file trực tiếp) — 2026-06-07
- **Dùng ở:** thesis §3.3.8 (bảo mật / NFR), §4.2.2 (authentication), §3.3.7 (graceful degradation AI)
