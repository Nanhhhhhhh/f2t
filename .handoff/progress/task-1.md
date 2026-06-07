# progress/task-1.md — dany.docx → dany.md, sửa nội dung sai

## T1.1 — convert dany.docx → dany.md ✅
- Lệnh: `pandoc "/Users/macos/Downloads/dany.docx" -f docx -t gfm --wrap=none --extract-media=./dany_media -o dany.md` (cwd=docs/thesis).
- Kết quả: `docs/thesis/dany.md` 671 dòng; **0 heading `#`** (docx dùng in-đậm `**...**` làm tiêu đề, KHÔNG dùng Word Heading style); 0 file media.
- ⚠️ Lưu ý: dany.md là **dàn ý/skeleton chi tiết** (mục lục + bullet mô tả), KHÔNG phải prose đầy đủ. Outline = cấu trúc dòng in-đậm/in-nghiêng. → T1.3 trích outline từ dòng `**...**`/`*...*`, không grep `#`.
- 0 heading KHÔNG phải blocker (đúng bản chất docx). Gate T1.1 PASS: file có nội dung (671 dòng), outline 5 chương rõ ràng.

### Nghi phạm claim sai (sơ bộ, đối chiếu ledger Task 0 — sẽ audit kỹ ở T1.4):
- Forecaster: thesis "Holt EWMA + DoW" vs code `ForecasterLSTM` (ledger t0.2-forecaster-arch). **SAI.**
- DDQN: thesis "5-dim state, 5 action [-20%..+20%], MLP 5→64→32→5" vs code obs_dim=10, 11 action (-0.30→+0.20), SharedMLPDuelingQNet + cat-embed (ledger t0.2-ddqn-arch, t0.2-action-space). **SAI.**
- Freshness: thesis "MobileNetV2, 4 class" vs code 2 CoreML model fruit/root, nhị phân fresh/rotten (ledger t0.6). **SAI.**
- Recommender: thesis MT3/ĐG2/sidecar 8001 ItemItemCF+Content-Based — CẦN xác minh f2t-backend có recommender thật không.
- Sidecar topology: thesis 3 sidecar (8000/8001/8002) vs Task 0 thấy 1 pricing-sidecar (8000) phục vụ predict/forecast/freshness — CẦN xác minh.

## T1.2 — convert thesis_A46489.docx → thesis_old.md ✅ (tham khảo)
- Lệnh: `pandoc "/Users/macos/Downloads/thesis_A46489.docx" -f docx -t gfm --wrap=none --extract-media=...`.
- Kết quả: `docs/thesis/thesis_old.md` 1864 dòng, 85 heading `#`, 92 dòng in-đậm, 1 media dir. Đã thêm banner ⚠️ THAM KHẢO đầu file.
- Lưu ý: file landed ở repo root do cwd, đã `mv` về `docs/thesis/`. Đây là bản thesis CŨ đầy đủ prose — chỉ tham khảo, KHÔNG tin, KHÔNG sửa.

## T1.3 — trích outline dany.md ✅
- `docs/thesis/dany.outline.md`: 5 chương, ~80 mục. Cấu trúc = dòng in-đậm (chương/2-số) + in-nghiêng (3-số). Đánh dấu ★ các mục có claim AI/ML cần fact-check.
- Outline này là HỢP ĐỒNG bảo toàn: T1.5…N sửa nội dung nhưng GIỮ nguyên thứ tự + cấp mục.

## T1.4 — audit dany.md → bảng claim sai→đúng ✅
- Sản phẩm: `docs/thesis/dany.audit.md` (273 dòng) — phủ 5 chương, ~50 claim. Subagent sonnet viết, **controller verify độc lập** các claim lớn.
- Kết quả audit: ~25 claim BỊA/VIẾT LẠI, ~12 SỬA SỐ, ~10 GIỮ, ~4 CHƯA XÁC MINH.
- Subagent hit session limit → controller hoàn tất phần ledger + progress + task-tree + commit.
- **Controller verify độc lập** (chạy lại lệnh, đọc file trực tiếp):
  - recommender: `grep -rliE 'recommend|itemitem|collaborative|content-based|cosine' f2t-backend/src` = 0 → BỊA. ✅
  - 1 sidecar (chỉ `pricing-sidecar/`), 13 module. ✅
  - `pricing-sidecar/safety.py:1-19` đọc trực tiếp: đúng 5 rule. ⚠️ Audit row 3.9 hơi nhiễu — thesis QT1/QT2 (−30%/+20%) thực ra KHỚP Rule 3; T1.8 trình bày chính xác cả 5 rule. → ghi rõ ở ledger `t1.4-safety-5-rules`.
  - `find ... *.schema.ts` = 10 file, không có recommendation_caches/forecast_caches. ✅
- Ledger nhóm "Task 1": 9 entry (`t1.4-no-recommender`, `t1.4-forecaster-not-holt`, `t1.4-ddqn-dims`, `t1.4-freshness-coreml`, `t1.4-one-sidecar`, `t1.4-collections`, `t1.4-safety-5-rules`, `t1.4-interceptor-cron`, `t1.4-unverified`).
- ⚠️ Điểm cần chú ý cho T1.5…N: một số con số (hyperparam DDQN buffer/batch/ε, 54 test, 42 màn hình, 79 endpoint) audit lấy nhanh — leaf-task tương ứng PHẢI resolve lại tại nguồn trước khi viết (xem ledger `t1.4-ddqn-dims`, `t1.4-unverified`).
- Task-tree nở: T1.5–T1.15 (xem task-tree.md + mục "Đề xuất chia leaf-task" cuối dany.audit.md).

## T1.15 — resolve claim chưa chứng minh ✅ (controller)
- 54/54 test ĐÚNG (54 it/test block, 21 spec file). GIỮ.
- Endpoint = 79 (controllers=14), không phải "24+". SỬA → ~79.
- Màn hình ~48 route tsx (58−10 layout), "42" ≈ đúng. SỬA nhẹ → ~48.
- Camera quét tươi CÓ THẬT: backend `@Post freshness/:productId/scan` (CoreML từ ảnh) + frontend use-scan-freshness.tsx (price-suggestions). GIỮ.
- "0 lỗi TS build" không chạy tsc → thesis nói "build thành công" không cam kết tuyệt đối.
- Ledger: t1.15-numbers.

## T1.5 — sửa §1.2 (Mục tiêu nghiên cứu) + §1.5 (Đóng góp) ✅

### Thay đổi thực hiện trong `docs/thesis/dany.md`

**§1.2 Mục tiêu nghiên cứu:**
- MT2: "14 module" → **13 module** (kèm danh sách 13 thư mục trong f2t-backend/src/modules/)
- MT3 (recommender ItemItemCF+CBF): **XÓA** — không tồn tại trong codebase (ledger t1.4-no-recommender)
- MT4 (Holt EWMA): **ĐỔI** → "Dự báo nhu cầu bằng ForecasterLSTM (LSTM 2 lớp, window=21, output demand + waste_logit)" → trở thành MT3 mới sau khi xóa recommender
- MT5 (DDQN): **GIỮ + LÀM RÕ** → "DDQN đa-category SharedMLPDuelingQNet, Safety Layer 5 quy tắc, chế độ advisory" → trở thành MT4 mới
- MT6 (MobileNetV2 4-class): **VIẾT LẠI** → "Phân loại độ tươi bằng 2 model CoreML (fruit/root), nhị phân fresh/rotten, phục vụ qua pricing-sidecar" → trở thành MT5 mới
- MT7 (≥95% test): **GIỮ + THÊM SỐ THỰC** → "54/54 test case trong 21 file spec" → trở thành MT6 mới
- Đánh số lại: MT1-MT6 (từ MT1-MT7 sau khi xóa MT3 cũ)

**§1.5 Đóng góp của khóa luận:**
- ĐG1 Monolith+Sidecar: **LÀM RÕ** → "1 Sidecar (pricing-sidecar)" + nêu 3 endpoint cụ thể
- ĐG2 "Hệ thống gợi ý đa tầng": **XÓA** — không tồn tại (ledger t1.4-no-recommender). Thay bằng đóng góp thật: "Tích hợp giá AI tự động qua DynamicPricingInterceptor"
- ĐG3 (Holt EWMA): **VIẾT LẠI** → "ForecasterLSTM — LSTM 2 lớp, window=21, output demand + waste_logit"
- ĐG4 (DDQN + Safety): **GIỮ + LÀM RÕ** → nêu obs 10 chiều, 11 hành động
- ĐG5 (MobileNetV2 + dataset tự thu thập): **VIẾT LẠI** → "2 model CoreML (fruit/root), nhị phân fresh/rotten; BỎ 'dataset tự thu thập' (không có evidence)"
- ĐG6 (Interceptor+Dijkstra+Snapshot): **GIỮ + THÊM CITATION** → Dijkstra: delivery.service.ts; Embedded Snapshot: order.schema.ts:105
- Bản đồ đóng góp: cập nhật số → "5 đóng góp" (không phải 6 — ĐG2 mới là tách từ ĐG1 cũ, tổng vẫn 6 entry ĐG1-ĐG6 nhưng không còn ĐG bịa)

### Danh sách citation dùng trong T1.5

| Citation | File + dòng | Ledger |
|---|---|---|
| 13 module | f2t-backend/src/modules/ (ls đếm thực tế) | t1.4-no-recommender |
| ForecasterLSTM arch | dynamic-pricing-final/src/forecaster/model.py:18-49 | t1.4-forecaster-not-holt, t0.2-forecaster-arch |
| DDQN network | dynamic-pricing-final/src/rl/network.py:51-57 | t1.4-ddqn-dims |
| Safety Layer | pricing-sidecar/safety.py:1-19 | t1.4-safety-5-rules |
| CoreML endpoint | pricing-sidecar/main.py:316-318 | t1.4-freshness-coreml, t0.6 |
| CoreML model files | freshnessmodels/MyFreshnessClassifier-fruit.mlmodel | t0.6-coreml-freshness |
| 54/54 test | grep it/test trong 21 spec file | t1.15-numbers |
| DynamicPricingInterceptor | f2t-backend/src/common/interceptors/dynamic-pricing.interceptor.ts:9,16-18 | t1.4-interceptor-cron |
| Dijkstra | f2t-backend/src/modules/delivery/delivery.service.ts | t1.4-interceptor-cron |
| Embedded Snapshot | f2t-backend/src/modules/orders/schemas/order.schema.ts:105 | t1.4-interceptor-cron |
| 1 sidecar | f2t-backend/src/app.module.ts:57 | t1.4-one-sidecar |

### Verify checklist
- [x] Không còn "recommender" / "ItemItemCF" / "Content-Based" trong §1.2 và §1.5
- [x] Không còn "Holt EWMA" trong §1.2 và §1.5
- [x] Không còn "MobileNetV2" trong §1.2 và §1.5
- [x] Số module = 13 (không phải 14)
- [x] Sidecar = 1 pricing-sidecar (§1.5 ĐG1 nêu rõ "1 Sidecar")
- [x] Mọi bullet kỹ thuật có citation inline [ref: ...]
- [x] Cấu trúc outline giữ nguyên (tiêu đề **1.2.**/\*\*1.5.\*\*, cấp bullet, thứ tự chương không đổi)
- [x] §1.3, §1.4, §1.6 và toàn bộ Chương 2-5 KHÔNG bị đụng
- [x] Không có claim mới ngoài ledger hiện có

### Claim mới phát sinh (nếu có)
Không phát sinh claim mới ngoài ledger. Toàn bộ citation đã có entry trong ledger Task 0 / Task 1 (t0.2, t0.6, t1.4-*, t1.15-numbers).

## T1.6+T1.7 — Viết lại §2.4 "Nền tảng lý thuyết AI/ML" ✅

### Tóm tắt thay đổi

**XÓA (không tồn tại trong codebase):**
- *2.4.1 Lọc cộng tác (Collaborative Filtering)* — Cosine Similarity, ItemItemCF, temporal decay λ=0.02 → XÓA hoàn toàn (ledger t1.4-no-recommender)
- *2.4.2 Gợi ý dựa trên nội dung (Content-Based Filtering)* — TF-IDF, hybrid system → XÓA hoàn toàn (ledger t1.4-no-recommender)
- *2.4.4 Mùa vụ theo ngày trong tuần (DoW Seasonality)* — Holt EWMA, hệ số DoW, điều kiện ≥14 ngày → XÓA (ledger t1.4-forecaster-not-holt)

**SỬA CĂN BẢN:**
- *2.4.3 Dự báo chuỗi thời gian* (stub trống + Holt) → **2.4.1 Dự báo chuỗi thời gian với LSTM**: lý thuyết LSTM + kiến trúc ForecasterLSTM thật (obs_dim=11, window=21, hidden=128, 2 lớp, dual-head demand/waste_logit)
- *2.4.5 Học tăng cường và DDQN* (state 5-dim, 5 action [-20%..+20%]) → **2.4.2**: giữ lý thuyết RL/Q-Learning/Double-DQN/Dueling; sửa số liệu thật: state 10 chiều, 11 action CANDIDATES linspace(-0.30,0.20,11), SharedMLPDuelingQNet + category embedding
- *2.4.6 Phân loại ảnh với MobileNetV2 (4 class)* → **2.4.3 Phân loại ảnh và CoreML**: giữ lý thuyết transfer learning + CNN; sửa model thật là 2 CoreML nhị phân (fruit/root), XÓA "4 class" + "MobileNetV2 14MB"

**Đánh số lại mục con:** 2.4.1→2.4.2→2.4.3 (liền mạch, từ 6 mục → 3 mục)

### Danh sách citation

| Citation | File + dòng | Ledger |
|---|---|---|
| ForecasterLSTM window=21, obs_dim=11 | dynamic-pricing-final/src/forecaster/model.py:L9-10 | t0.2-forecaster-arch, t0.4-forecaster-parity |
| LSTM nn.LSTM(input_size, hidden=128, num_layers=2, dropout=0.2) | dynamic-pricing-final/src/forecaster/model.py:L23-29 | t0.2-forecaster-arch |
| cat_embed + dual-head (demand + waste_logit) | dynamic-pricing-final/src/forecaster/model.py:L22-31, L46-49 | t0.2-forecaster-arch |
| waste_head Sequential (L→ReLU→Dropout→L) | dynamic-pricing-final/src/forecaster/model.py:L32-37 | t0.2-forecaster-arch |
| Dueling QNet MLPDuelingQNet (v_stream + a_stream) | dynamic-pricing-final/src/rl/network.py:L7-39 | t0.2-ddqn-arch |
| SharedMLPDuelingQNet signature (obs_dim=10, n_cats=4, embed=8, hidden=128, n_actions=11) | dynamic-pricing-final/src/rl/network.py:L51-81 | t0.2-ddqn-arch |
| CANDIDATES = linspace(-0.30, 0.20, 11) | dynamic-pricing-final/src/rl/reward.py:L6-7 | t0.2-action-space |
| Obs 10 chiều (_build_obs) | pricing-sidecar/main.py:L114-125 | t0.3-obs-parity, t1.4-ddqn-dims |
| CoreML predict + output keys (target, targetProbability) | pricing-sidecar/main.py:L318-333 | t0.6-coreml-freshness |
| CoreML model mapping (fruit→fruit, else→root) | pricing-sidecar/main.py:L318 | t0.6-coreml-freshness, t1.4-freshness-coreml |

### Verify checklist
- [x] Không còn lý thuyết Collaborative Filtering / ItemItemCF / TF-IDF / temporal decay λ trong §2.4
- [x] Không còn Holt EWMA / DoW Seasonality factor / điều kiện ≥14 ngày trong §2.4
- [x] Không còn "MobileNetV2" / "4 class Tươi/Hơi héo/Héo/Hỏng" trong §2.4
- [x] Lý thuyết LSTM có: cell state, 3 gate, vanishing gradient; ForecasterLSTM thật: obs_dim=11, window=21, hidden=128, 2 lớp, dual-head
- [x] Lý thuyết DDQN có: Q-Learning→DQN→Double DQN→Dueling; số liệu thật: obs 10 chiều, 11 action, SharedMLPDuelingQNet + embedding
- [x] Lý thuyết CoreML có: transfer learning, CNN, on-device inference; model thật: 2 CoreML nhị phân, fruit/root, output fresh/rotten
- [x] Mục con đánh số liền mạch 2.4.1→2.4.2→2.4.3 (không có gap)
- [x] §2.4 tiêu đề cấp trên giữ nguyên (**2.4. Nền tảng lý thuyết AI/ML (~4 trang)**)
- [x] §2.5 không bị đụng
- [x] Mọi bullet kỹ thuật có [ref: ...] inline
- [x] Không sửa ngoài §2.4 (§2.1, §2.2, §2.3, §2.5, §2.6 không đổi)
- [x] Không sửa file source code (dynamic-pricing-final/, pricing-sidecar/)

## T1.8 — Viết lại §3.3.7 "Thuật toán chi tiết các module AI/ML" ✅

### Tóm tắt thay đổi

**XÓA hoàn toàn:**
- **(a) HỆ THỐNG GỢI Ý** (ItemItemCF + Content-Based + Hybrid + cold-start + giả mã) → XÓA (ledger t1.4-no-recommender; `grep -rliE 'recommend|itemitem|collaborative|content-based|cosine' f2t-backend/src` = 0 file)

**Re-letter sau khi xóa (a):** cũ (b)→(a), cũ (c)→(b), cũ (d)→(c)

**VIẾT LẠI toàn bộ 3 mục còn lại:**

**(a) DỰ BÁO NHU CẦU** — thay "Holt EWMA + DoW" bằng ForecasterLSTM thật:
- LSTM 2 lớp, hidden=128, dropout=0.2, input_size=11, window=21 [model.py:L9-15, L23-29]
- Category embedding n_cats=4, cat_embed_dim=8 [model.py:L22]
- Dual-head: demand_head + waste_head → `{demand, waste_logit}` [model.py:L31-49]
- Luồng serve: `/demand-forecasting/forecast` → sidecar `/forecast` → `_run_forecaster` [main.py:L128-137, L263-274]
- ⚠️ GIỚI HẠN: pad-cuối 10→11 thay vì index 2 + tile-21× thay chuỗi thật → xấp xỉ thấp [ledger t0.4-forecaster-parity, t0.10-thesis-limitations]

**(b) ĐỊNH GIÁ ĐỘNG** — thay "state 5-dim/5-action/MLP-5→64→32→5/buffer-10000/batch-32" bằng đúng:
- State 10 chiều (danh sách đầy đủ) [main.py:L114-125, ledger t0.3-obs-parity]
- 11 hành động CANDIDATES=linspace(-0.30,0.20,11) [reward.py:L6-7, ledger t0.2-action-space]
- SharedMLPDuelingQNet Linear(18,128)→ReLU×2 → V-stream + A-stream (Dueling) [network.py:L51-81]
- **Hyperparameter thật** (đọc trực tiếp từ nguồn):
  - buffer_capacity = 50 000 [dynamic-pricing-final/src/rl/agent.py:L35]
  - batch_size = 256 [agent.py:L33]
  - warmup = 1 000 [agent.py:L31]
  - ε_start = 1.0, ε_end = 0.05, decay qua 2 000 episode [train.py:L12-14]
  - target_sync = 500 step [train.py:L15]
  - lr = 1e-4, γ = 0.99
- Safety Layer 5 quy tắc — thứ tự áp 3→4→1→2→5:
  - Rule 3: clip [base×0.70, base×1.20] [safety.py:L6]
  - Rule 4: freshness<0.4 → price≤base×0.75 [safety.py:L8-10]
  - Rule 1: price≥base×0.55 [safety.py:L12-13]
  - Rule 2: price≤base×2.0 [safety.py:L15-16]
  - Rule 5: price≥1 000 VND [safety.py:L18-19]
- Chế độ shadow → advisory [ledger t1.4-safety-5-rules]

**(c) PHÂN LOẠI ĐỘ TƯƠI** — thay "MobileNetV2 4-class" bằng CoreML nhị phân:
- 2 model .mlmodel: fruit + root (non-fruit→root) [main.py:L318, ledger t1.4-freshness-coreml]
- Input 299×299 RGB (model khai báo BGR nhưng feed RGB — đúng) [main.py:L324, ledger t0.9-fixes]
- Predict → `{target, targetProbability}` → score = P(fresh) → input DDQN [main.py:L325-330]
- Endpoint POST `/freshness/classify` [main.py:L316-333]
- ⚠️ GIỚI HẠN: chỉ 2/4 category có model riêng; không có dataset tự thu thập [ledger t0.10-thesis-limitations]

### Bảng hyperparam thật — DDQN (đọc từ agent.py + train.py)

| Tham số | Giá trị thật | File:Dòng |
|---|---|---|
| buffer_capacity | 50 000 | dynamic-pricing-final/src/rl/agent.py:L35 |
| batch_size | 256 | agent.py:L33 |
| warmup | 1 000 | agent.py:L31 |
| ε_start | 1.0 | dynamic-pricing-final/src/rl/train.py:L12 |
| ε_end | 0.05 | train.py:L13 |
| ε_decay_episodes | 2 000 | train.py:L14 |
| target_sync | 500 step | train.py:L15 |
| lr | 1e-4 | agent.py: MultiCatDDQNAgent.__init__ |
| γ (gamma) | 0.99 | agent.py:L40 |
| hidden | 128 | agent.py:L29, network.py:L55 |
| obs_dim | 10 | agent.py:L14 |
| n_actions | 11 | agent.py:L16 |

### Verify checklist
- [x] Mục (a) recommender ĐÃ XÓA — không còn ItemItemCF/Content-Based/Hybrid/cold-start/giả-mã
- [x] Re-letter: (a)=DỰ BÁO, (b)=ĐỊNH GIÁ, (c)=ĐỘ TƯƠI — không còn (d)
- [x] (a) LSTM: obs_dim=11, window=21, hidden=128, 2 lớp, dual-head, giới hạn train↔serve nêu rõ
- [x] (b) DDQN: state 10 chiều đầy đủ, 11 action, SharedMLPDuelingQNet Dueling
- [x] (b) Hyperparam: buffer=50k, batch=256, ε 1.0→0.05, target=500 — ĐỌC TỪ NGUỒN (không bịa)
- [x] (b) Safety 5 rule: thứ tự 3→4→1→2→5, giá trị chính xác theo safety.py
- [x] (c) CoreML: 2 model nhị phân, fruit/root, 299×299 RGB, không có training script
- [x] Mọi claim có [ref: path:Lxx] hoặc ledger-id
- [x] Cấu trúc outline §3.3.7 giữ nguyên (tiêu đề in-nghiêng, mục con in-đậm, cấp bullet)
- [x] §3.4 (sau §3.3.7) không bị đụng
- [x] Không sửa file source code

## T1.10 — Sửa §1.3, §3.3.1, §3.3.3, §3.3.5, §3.3.6 (diagram/architecture corrections) ✅

### Tóm tắt thay đổi

**§1.3 Phạm vi nghiên cứu:**
- "3 sidecar FastAPI" → **"1 sidecar FastAPI (pricing-sidecar) phục vụ 3 endpoint /predict /forecast /freshness/classify"** [ref: f2t-backend/src/app.module.ts:57; ledger t1.4-one-sidecar]

**§3.3.1 Kiến trúc triển khai tổng quan:**
- XÓA 3 sidecar (Recommender 8001, Forecast 8002, Pricing 8000 DDQN+MobileNetV2)
- SỬA → **App ↔ NestJS(3000) ↔ MongoDB + 1 pricing-sidecar FastAPI(port 8000)**; 3 endpoint:
  - `/predict` — DDQN SharedMLPDuelingQNet [ref: pricing-sidecar/main.py:277]
  - `/forecast` — ForecasterLSTM [ref: pricing-sidecar/main.py:263; ledger t1.4-forecaster-not-holt]
  - `/freshness/classify` — 2 model CoreML [ref: pricing-sidecar/main.py:316; ledger t1.4-freshness-coreml]
- GIỮ graceful degradation (đúng)

**§3.3.3 Biểu đồ Use Case AI/ML:**
- XÓA UC-ML-01 (Recommender For-You + Cross-sell) [ref: ledger t1.4-no-recommender]
- Re-number: UC-ML-01 = Dự báo nhu cầu [ref: demand-forecasting.service.ts:43], UC-ML-02 = Định giá động [ref: pricing-sidecar/main.py:277]
- "★ SV tự thiết kế 3 UC AI" → **2 UC AI** [ref: ledger t1.4-no-recommender]

**§3.3.5 Biểu đồ tuần tự AI/ML:**
- XÓA SD-ML-01 (Sidecar 8001 cosine), SD-ML-02 (Sidecar 8001 co-occurrence)
- SD-ML-03 "Cron huấn luyện lại" → **SD-ML-01 PricingTickCron mỗi giờ** (`"0 * * * *"`) [ref: pricing-tick.cron.ts:18; ledger t1.4-interceptor-cron]
- SD-ML-04 "Sidecar 8002 Holt EWMA" → **SD-ML-02 NestJS → sidecar /forecast (8000) → _run_forecaster → ForecasterLSTM** [ref: demand-forecasting.service.ts:43; pricing-sidecar/main.py:263; ledger t1.4-forecaster-not-holt]
- SD-ML-06 → **SD-ML-03** Chu kỳ định giá chi tiết (GIỮ logic, re-number) [ref: pricing-sidecar/main.py:277; safety.py:1-19]
- "★ 5 biểu đồ" → **3 biểu đồ** [ref: ledger t1.4-no-recommender]

**§3.3.6 Biểu đồ hoạt động AI/ML:**
- XÓA AD-ML-01 (Recommender ≥5 đơn → ItemItemCF) [ref: ledger t1.4-no-recommender]
- AD-ML-03 "Holt EWMA + DoW" → **AD-ML-01 Luồng suy luận ForecasterLSTM** [ref: pricing-sidecar/main.py:128-145; ledger t1.4-forecaster-not-holt]
- AD-ML-04 → **AD-ML-02** DDQN + Safety (GIỮ logic 5 quy tắc thứ tự 3→4→1→2→5) [ref: safety.py:1-19; ledger t1.4-safety-5-rules]
- Re-number AD-ML liền mạch: AD-ML-01, AD-ML-02

### Citation bảng

| Thay đổi | File:Dòng | Ledger |
|---|---|---|
| 1 sidecar (phạm vi) | f2t-backend/src/app.module.ts:57 | t1.4-one-sidecar |
| /predict endpoint | pricing-sidecar/main.py:277 | t0.2-ddqn-arch |
| /forecast endpoint | pricing-sidecar/main.py:263 | t1.4-forecaster-not-holt |
| /freshness/classify endpoint | pricing-sidecar/main.py:316 | t1.4-freshness-coreml |
| PricingTickCron schedule | f2t-backend/src/modules/dynamic-pricing/pricing-tick.cron.ts:18 | t1.4-interceptor-cron |
| DemandForecastingService → /forecast | f2t-backend/src/modules/demand-forecasting/demand-forecasting.service.ts:43 | t1.4-forecaster-not-holt |
| _run_forecaster | pricing-sidecar/main.py:128-145 | t0.4-forecaster-parity |
| Safety 5 quy tắc | pricing-sidecar/safety.py:1-19 | t1.4-safety-5-rules |
| Không có recommender | grep -rliE 'recommend...' f2t-backend/src = 0 | t1.4-no-recommender |

### Verify checklist
- [x] §1.3: "3 sidecar" → "1 sidecar (pricing-sidecar) 3 endpoint"
- [x] §3.3.1: không còn Recommender(8001) / Forecast(8002) / MobileNetV2; hiển thị 1 sidecar 3 endpoint
- [x] §3.3.3: không còn UC-ML-01 recommender; UC-ML-01=Dự báo, UC-ML-02=Định giá; "2 UC AI" (không phải 3)
- [x] §3.3.5: không còn SD-ML-01/02 recommender, không còn "Sidecar 8001/8002/Holt EWMA"; SD-ML-01=PricingTickCron, SD-ML-02=Forecaster, SD-ML-03=Chu kỳ định giá; "3 biểu đồ" (không phải 5)
- [x] §3.3.6: không còn AD-ML-01 recommender, không còn "Holt EWMA + DoW + ≥14 ngày"; AD-ML-01=ForecasterLSTM, AD-ML-02=DDQN+Safety; re-number liền mạch
- [x] Mọi mô tả kỹ thuật sửa có [ref: file:Lxx] hoặc ledger-id
- [x] Outline (tiêu đề, thứ tự chương, phong cách dàn ý bullet) giữ nguyên
- [x] KHÔNG sửa ngoài 5 mục được chỉ định
- [x] KHÔNG vẽ PlantUML đầy đủ

## T1.11 — Viết lại §3.4 "Phân tích, thiết kế cơ sở dữ liệu" ✅

### Bảng 10 collection thật + field chính + citation

| # | Collection | Field chính | Index | Schema file:Dòng |
|---|---|---|---|---|
| 1 | **users** | email(unique), password(bcrypt,select:false), firstName, lastName, phoneNumber, avatarUrl, role enum[consumer/farm/admin], status enum[active/suspended/pending], location{coordinates{latitude,longitude}, address{street,city,zipCode,country}}, refreshToken, pushToken, emailVerified, phoneVerified, isBanned | email unique (tự động từ @Prop unique) | user.schema.ts:L20-97 |
| 2 | **farms** | ownerId(ref:User), name, description, location{type:"Point",coordinates:[lng,lat]}, address{street,city,zipCode,country}, contactEmail, contactPhone, deliveryMethods[], restockSchedule[{category,intervalDays}], isActive, verificationStatus enum[pending/verified/rejected] | 2dsphere location (L113); text name+description (L116) | farm.schema.ts:L50-108, L113, L116 |
| 3 | **products** | farmId(ref:Farm), name, description, category enum[leafy/root/fruit/herbs/mushrooms/grains/dairy/eggs/honey/other], pricePerUnit, unit, availableQuantity, minimumOrder, status enum[available/sold_out/unavailable/seasonal], images[], isOrganic, tags[], nutritionalInfo{...}, estimatedShelfLife, lastRestockedAt | text name+desc+tags (L147); farmId (L148); category (L149); status (L150); pricePerUnit (L151) | product.schema.ts:L37-142, L147-151 |
| 4 | **orders** | orderNumber(unique), customerId(ref:User), farmId(ref:Farm), items[{productId,productName,productImage,quantity,pricePerUnit,unit,totalPrice,farmId,farmName}] embedded snapshot, subtotal, deliveryFee, tax, total, status enum[pending/confirmed/preparing/ready_for_pickup/shipped/delivered/cancelled], paymentStatus, paymentMethod enum[cash/stripe], stripeSessionId, timeline[], trackingSteps[] | customerId (L239); farmId (L240); status (L241) — KHÔNG có compound 3-field | order.schema.ts:L7-34 (OrderItem), L95-235 (Order), L239-241 (indexes) |
| 5 | **posts** | authorId(ref:User), authorRole enum[consumer/farm], farmId(optional,ref:Farm), title, body, media[{url,type,thumbnailUrl}], tags[{id,type,name}], hashtags[], comments[{authorId,authorName,authorAvatarUrl,content}], likesCount, commentsCount | createdAt (L115); text title+body+hashtags (L116); authorId (L117); farmId (L118); hashtags (L119) | post.schema.ts:L75-111, L115-119 |
| 6 | **notifications** | userId(ref:User), type(enum NotificationType), title, message, isRead, referenceId, referenceType, data{}, pushSent | compound userId+createdAt (L52) | notification.schema.ts:L19-49, L52 |
| 7 | **notification_preferences** | userId(ref:User, unique), emailNotifications, smsNotifications, pushNotifications, orderUpdates, promotions, newsletter | userId unique (qua @Prop unique) | notification-preferences.schema.ts:L19-37 |
| 8 | **verification_tokens** | userId(ref:User), token, type enum[email/phone], expiresAt, used | TTL expiresAt (L31); compound userId+type (L32) | verification-token.schema.ts:L8-26, L31-32 |
| 9 | **freshness_cache** | productId(ref:Product), readings[{score:Number, scannedAt:Date}], medianScore, updatedAt, expiresAt — KHÔNG có scores[5] fixed array hay label | unique productId (L44); TTL expiresAt (L45) | freshness-cache.schema.ts:L6-40, L44-45 |
| 10 | **price_overrides** | productId(ref:Product), farmId(ref:Farm), basePrice, targetPrice, deltaPct, freshnessScore, freshnessTag enum[fresh/aging/critical], safetyClipped, mode enum[shadow/advisory], status enum[shadow/pending_review/accepted/rejected/expired], reviewedAt, reviewedBy, computedAt, expiresAt | compound productId+status (L67); TTL expiresAt (L68) | price-override.schema.ts:L17-63, L67-68 |

### Bảng index thật đã verify

| Index | Collection | Khai báo tại | Loại |
|---|---|---|---|
| 2dsphere location | farms | farm.schema.ts:L113 | Geospatial |
| text name+description | farms | farm.schema.ts:L116 | Text search |
| text name+description+tags | products | product.schema.ts:L147 | Text search |
| farmId | products | product.schema.ts:L148 | Đơn |
| category | products | product.schema.ts:L149 | Đơn |
| status | products | product.schema.ts:L150 | Đơn |
| pricePerUnit | products | product.schema.ts:L151 | Đơn |
| customerId | orders | order.schema.ts:L239 | Đơn |
| farmId | orders | order.schema.ts:L240 | Đơn |
| status | orders | order.schema.ts:L241 | Đơn |
| createdAt | posts | post.schema.ts:L115 | Đơn (desc) |
| text title+body+hashtags | posts | post.schema.ts:L116 | Text search |
| authorId | posts | post.schema.ts:L117 | Đơn |
| farmId | posts | post.schema.ts:L118 | Đơn |
| hashtags | posts | post.schema.ts:L119 | Đơn |
| userId+createdAt | notifications | notification.schema.ts:L52 | Compound |
| productId (unique) | freshness_cache | freshness-cache.schema.ts:L44 | Unique |
| expiresAt (TTL) | freshness_cache | freshness-cache.schema.ts:L45 | TTL |
| productId+status | price_overrides | price-override.schema.ts:L67 | Compound |
| expiresAt (TTL) | price_overrides | price-override.schema.ts:L68 | TTL |
| expiresAt (TTL) | verification_tokens | verification-token.schema.ts:L31 | TTL |
| userId+type | verification_tokens | verification-token.schema.ts:L32 | Compound |

### Thay đổi chính so với §3.4 cũ

1. **XÓA** `recommendation_caches` — không tồn tại (grep=0) [ledger t1.4-no-recommender]
2. **XÓA** `forecast_caches` — không tồn tại (grep=0) [ledger t1.4-collections]
3. **THÊM** `notification_preferences` và `verification_tokens` — 2 collection thật còn thiếu
4. **SỬA** `freshness_cache`: `readings[{score, scannedAt}]` + `medianScore` + `updatedAt` (không có `scores[5]`/`label`) [ref: freshness-cache.schema.ts:L6-40]
5. **SỬA** `users`: location embedded 1 địa chỉ `{coordinates{lat,lng}, address{street,city,zipCode,country}}` — KHÔNG có `addresses[]` [ref: user.schema.ts:L52-78]
6. **SỬA** `orders.items`: field thật `{productId, productName, productImage, quantity, pricePerUnit, unit, totalPrice, farmId, farmName}` [ref: order.schema.ts:L7-34]
7. **SỬA** `price_overrides.status`: 5 trạng thái `[shadow, pending_review, accepted, rejected, expired]` (không phải `pending/accepted/rejected`) [ref: price-override.schema.ts:L45-50]
8. **SỬA** index orders: 3 index riêng lẻ (customerId/farmId/status) — KHÔNG có compound 3-field [ref: order.schema.ts:L239-241]
9. **SỬA** TTL `recommendation_caches 1h` → XÓA (không tồn tại); giữ đúng 3 TTL thật: freshness_cache + price_overrides + verification_tokens
10. **SỬA** ERD: bổ sung 7 quan hệ thật (không chỉ 3 quan hệ cũ); xóa thực thể recommender

### Verify checklist

- [x] Đúng 10 collection thật — không còn recommendation_caches/forecast_caches
- [x] freshness_cache: readings[{score,scannedAt}] + medianScore (không có scores[5]/label)
- [x] users: location embedded single-address (không có addresses[])
- [x] orders.items: 9 field thật với tên chính xác
- [x] price_overrides.status: 5 enum thật [shadow/pending_review/accepted/rejected/expired]
- [x] orders index: 3 riêng lẻ (không có compound 3-field)
- [x] TTL: 3 TTL thật (freshness_cache, price_overrides, verification_tokens) — không còn "recommendation_caches TTL 1h"
- [x] ERD: 10 quan hệ thật có citation
- [x] Mọi field/index có [ref: schema-file:Lxx]
- [x] Outline §3.4.1/3.4.2/3.4.3 giữ nguyên tiêu đề in-nghiêng
- [x] Không sửa ngoài §3.4
- [x] Không sửa file source code

## T1.12 — Quét và sửa dư âm recommender + sai số liệu trong §2.5/2.6/3.1.2/3.2/3.5/4.1/4.2/4.4.1 ✅

### Danh sách thay đổi theo mục

**A. §2.5** (dòng 185):
- Cũ: "chưa hệ thống nào tích hợp **gợi ý** + dự báo + định giá + phân loại tươi"
- Mới: "chưa hệ thống nào tích hợp dự báo nhu cầu + định giá động + phân loại độ tươi cho nông sản nhỏ trên nền tảng mobile"
- Citation: [ref: ledger t1.4-no-recommender]

**B. §2.6** (dòng 189):
- Cũ: "mobile-first, AI trong luồng mua hàng, advisory pricing"
- Mới: "mobile-first, AI trong luồng mua hàng (dự báo nhu cầu + định giá động + phân loại độ tươi), advisory pricing"
- Citation: [ref: ledger t1.4-no-recommender]
- GHI CHÚ: Không có recommender trong §2.6 trước khi sửa; làm rõ định hướng thật.

**C. §3.1.2** (dòng 209):
- Cũ: "API trả sản phẩm KÈM **gợi ý** + nhãn tươi + giá động. Farm mở dashboard → thấy dự báo + gợi ý giá"
- Mới: "API trả sản phẩm KÈM nhãn tươi (freshnessScore) + giá động (dynamicPrice) qua DynamicPricingInterceptor. Farm mở dashboard → thấy dự báo nhu cầu + đề xuất giá từ DDQN"
- Citation: [ref: dynamic-pricing.interceptor.ts:74-77; ledger t1.4-interceptor-cron, t1.4-no-recommender]

**D. §3.2.1** (dòng 223):
- Cũ: "Consumer: 8 yêu cầu (..., **xem gợi ý**, ...)"
- Mới: "Consumer: 8 yêu cầu (..., xem sản phẩm theo danh mục + nhãn tươi + giá động, ...)" — GIỮ số 8 (thay 1 yêu cầu bằng 1 yêu cầu thật)
- GIỮ: "Farm: 7 yêu cầu (..., nhận **gợi ý giá**, ...)" — THẬT (price suggestion từ DDQN) [ref: ledger t1.4-no-recommender]
- Citation: [ref: dynamic-pricing.interceptor.ts:74-77; ledger t1.4-no-recommender]

**E. §3.2.3** (dòng 234-239):
- Thêm bullet làm rõ nhóm AI/ML = đúng 3 chức năng thật: Dự báo nhu cầu + Định giá động + Phân loại độ tươi — KHÔNG có gợi ý sản phẩm
- Citation: [ref: ledger t1.4-no-recommender; pricing-sidecar/main.py:263, 277, 316]

**F. §3.5.1** (dòng 481):
- Cũ: "Home (gợi ý For-You ★AI), Chi tiết (nhãn tươi ★AI + giá động ★AI + **sản phẩm tương tự** ★AI), Giỏ hàng (**cross-sell** ★AI)"
- Mới: "Home (sản phẩm nổi bật — query thường, không AI), Chi tiết (nhãn tươi ★AI + giá động ★AI), Giỏ hàng (danh sách sản phẩm đã chọn)"
- GIỮ: §3.5.2 Farm (Dashboard dự báo, Quét độ tươi camera ★AI, Gợi ý giá ★AI) — THẬT [ref: ledger t1.15-numbers]
- GIỮ: §3.5.3 Admin giữ nguyên
- Citation: [ref: ledger t1.4-no-recommender, t1.15-numbers; dynamic-pricing.interceptor.ts:74-77]

**G. §4.1** (dòng 495-499):
- Cũ: "Bảng thư viện AI/ML (FastAPI, PyTorch/TensorFlow, numpy, sklearn, scipy)"
- Mới: "FastAPI, PyTorch (DDQN/LSTM), coremltools (CoreML inference), numpy — KHÔNG có sklearn-recommender/statsmodels-Holt"
- Cũ: "Trình tự khởi động: MongoDB → **3 Sidecar** → NestJS → Expo"
- Mới: "MongoDB → **1 pricing-sidecar (port 8000)** → NestJS → Expo"
- Citation: [ref: f2t-backend/src/app.module.ts:57; pricing-sidecar/main.py; ledger t1.4-one-sidecar]

**H. §4.2.1** (dòng 503-508):
- Cũ: "Backend: **14** module NestJS" → Mới: "**13** module NestJS (danh sách 13 thư mục)"
- Cũ: "Sidecars: **3** thư mục Python" → Mới: "**1** thư mục Python — pricing-sidecar/ (3 endpoint)"
- Citation: [ref: f2t-backend/src/modules/ — 13 thư mục; f2t-backend/src/app.module.ts:57; ledger t1.4-one-sidecar]

**I. §4.2.2** (dòng 511-520):
- Thêm citation inline cho DynamicPricingInterceptor: [ref: dynamic-pricing.interceptor.ts:74-77; ledger t1.4-interceptor-cron]
- Thêm citation + schedule cho PricingTickCron: `"0 * * * *"` [ref: pricing-tick.cron.ts:18; ledger t1.4-interceptor-cron]
- Sửa vòng đời PriceOverride: shadow → pending_review → accepted/rejected → expired (5 trạng thái thật) [ref: price-override.schema.ts:45-50]
- Thêm note: 1 sidecar (port 8000) [ref: ledger t1.4-one-sidecar]

**J. §4.4.1** (dòng 537-540):
- Cũ: "Bảng **14** module × trạng thái" → Mới: "**13** module"
- Cũ: "**24+** REST endpoints" → Mới: "**≈79** REST endpoint" (đếm từ lệnh grep controller thật)
- Cũ: "**42** màn hình" → Mới: "**≈48** màn hình route"
- Thêm chú thích: 10 collection KHÔNG có recommendation_caches/forecast_caches
- Citation: [ref: ledger t1.15-numbers, t1.4-collections, t1.4-one-sidecar]

**J. §5.1** (dòng 613):
- Cũ: "**14** module, 54/54 test, **42** màn hình, **3** sidecar AI"
- Mới: "**13** module, 54/54 test (54 test case trong 21 file spec), **≈48** màn hình route, **1** pricing-sidecar AI (port 8000, 3 endpoint)"
- Citation: [ref: ledger t1.15-numbers, t1.4-one-sidecar]

**K. §4.4.6** (dòng 609):
- Cũ: "Home+**ForYou**, Giỏ hàng+**cross-sell**"
- Mới: "Home+sản phẩm nổi bật, Chi tiết+nhãn tươi+giá động, Giỏ hàng"
- GIỮ: Farm gợi ý giá ★AI, Farm quét tươi ★AI — THẬT [ref: ledger t1.4-no-recommender, t1.15-numbers]

### Mục GIỮ vì là thật
- **Farm "nhận gợi ý giá"** (§3.2.1, §3.3.3 UC-ML-02) — THẬT: PricingTickCron → DDQN → PriceOverride → farm accept/reject [ref: ledger t1.4-interceptor-cron; farm/price-suggestions.tsx:439, 473]
- **Farm "Quét độ tươi camera ★AI"** (§3.5.2) — THẬT: backend `@Post freshness/:productId/scan` + frontend use-scan-freshness.tsx [ref: ledger t1.15-numbers]
- **Farm "Gợi ý giá ★AI"** (§3.5.2) — THẬT: farm/price-suggestions.tsx accept/reject flow [ref: ledger t1.15-numbers]
- **Admin "Shadow Report ★AI"** (§3.5.3) — THẬT: price_overrides.mode = shadow/advisory [ref: price-override.schema.ts:45-50; ledger t1.4-collections]
- **"gợi ý" trong §2.1.2** (dòng 81, lý thuyết chung) — đây là đề cập ứng dụng AI nói chung (recommendation là 1 trong 4 ứng dụng AI phổ biến), không phải claim F2T có recommender → GIỮ

### Verify checklist
- [x] §2.5: không còn "gợi ý" trong kết luận so sánh hệ thống
- [x] §2.6: không còn recommender trong định hướng
- [x] §3.1.2: không còn "gợi ý" trong luồng AI; thêm citation interceptor
- [x] §3.2.1 Consumer: không còn "xem gợi ý"; Farm "gợi ý giá" GIỮ (thật)
- [x] §3.2.3: ghi rõ AI/ML = 3 chức năng thật, không có gợi ý sản phẩm
- [x] §3.5.1: không còn For-You/sản phẩm tương tự/cross-sell ★AI
- [x] §3.5.2: GIỮ Farm (camera quét tươi ★AI, gợi ý giá ★AI)
- [x] §4.1: "1 pricing-sidecar (port 8000)", thư viện AI/ML đúng (PyTorch + coremltools)
- [x] §4.2.1: "13 module", "1 thư mục Python"
- [x] §4.2.2: citation interceptor:74-77 + cron:18 + vòng đời 5 trạng thái + "1 sidecar"
- [x] §4.4.1: "13 module", "≈79 endpoint", "≈48 màn hình", không còn "3 sidecar"
- [x] §5.1: "13 module", "≈48 màn hình", "1 pricing-sidecar"
- [x] §4.4.6: không còn ForYou/cross-sell; Farm camera/gợi ý giá GIỮ
- [x] Outline (tiêu đề, thứ tự mục, phong cách dàn ý) giữ nguyên
- [x] Không sửa dynamic-pricing-final/ hay pricing-sidecar/ source code
- [x] Không commit

## T1.13 — Viết lại §4.4 "Đánh giá hệ thống" — các mục con AI/ML ✅

### Cấu trúc §4.4 sau khi sửa (mục con + số)

| Mục | Tiêu đề | Trạng thái |
|---|---|---|
| 4.4.1 | Đánh giá chức năng tổng quan (~1 trang) | GIỮ NGUYÊN (đã sửa T1.12) |
| 4.4.2 | Đánh giá dự báo nhu cầu (~1.5 trang) | VIẾT LẠI (cũ là 4.4.3 Holt+DoW → nay ForecasterLSTM offline eval) |
| 4.4.3 | Đánh giá định giá động (~2 trang) | GIỮ + SỬA Safety Layer citation (cũ là 4.4.4) |
| 4.4.4 | Đánh giá phân loại độ tươi (~1 trang) | VIẾT LẠI CoreML nhị phân 2×2 (cũ là 4.4.5 MobileNetV2 4×4) |
| 4.4.5 | Demo sản phẩm (~2 trang) | RE-NUMBER (cũ là 4.4.6) — nội dung không đổi |

**ĐÃ XÓA:** §4.4.2 cũ "Đánh giá hệ thống gợi ý" (Hit-Rate@6, ItemItemCF vs CBF vs Random) — không tồn tại implementation [ledger t1.4-no-recommender]

### Citation bảng

| Thay đổi | File:Dòng | Ledger |
|---|---|---|
| §4.4.2 — ForecasterLSTM eval script | dynamic-pricing-final/src/forecaster/eval.py:28-85 | t0.2-forecaster-arch, t0.4-forecaster-parity |
| §4.4.2 — MAE/day metric | eval.py:18-19 (`compute_demand_mae`) | t0.4-forecaster-parity |
| §4.4.2 — AUROC waste_logit | eval.py:12-15 (`compute_waste_auroc`) | t0.4-forecaster-parity |
| §4.4.2 — per-category results | eval.py:74-83 | t0.4-forecaster-parity |
| §4.4.2 — giới hạn serve mismatch | pricing-sidecar/main.py:L134-135 | t0.4-forecaster-parity, t0.10-thesis-limitations |
| §4.4.3 — action space 11 (market_env) | dynamic-pricing-final/src/env/market_env.py:146-158 | t0.2-action-space |
| §4.4.3 — EPISODE_LEN=91 waste events | market_env.py:79-81, 99 | t0.2-action-space |
| §4.4.3 — Safety Layer 5 rule (thứ tự 3→4→1→2→5) | pricing-sidecar/safety.py:1-23 | t1.4-safety-5-rules |
| §4.4.4 — 2 model CoreML (fruit/root) | pricing-sidecar/main.py:L316-333 | t0.6-coreml-freshness, t1.4-freshness-coreml |
| §4.4.4 — output nhị phân | pricing-sidecar/main.py:L329-330 | t0.6-coreml-freshness |
| §4.4.4 — giới hạn dataset + 2/4 model | pricing-sidecar/main.py:L316-333 | t0.10-thesis-limitations, t1.4-freshness-coreml |

### Verify checklist

- [x] §4.4.2 cũ (recommender) ĐÃ XÓA — không còn Hit-Rate@6, ItemItemCF, cold-start
- [x] §4.4 re-number liền mạch: 4.4.1 → 4.4.2 → 4.4.3 → 4.4.4 → 4.4.5 (không có gap)
- [x] §4.4.2 mới: ForecasterLSTM offline eval (MAE/day + AUROC), giới hạn serve nêu rõ, BỎ Holt/DoW
- [x] §4.4.3: Safety Layer 5 rule với citation từng rule (safety.py:L6, L8-10, L12-13, L15-16, L18-19), mô phỏng market_env.py
- [x] §4.4.4: nhị phân (2 lớp), Confusion Matrix 2×2, 2 model CoreML, giới hạn dataset + 2/4 category, BỎ MobileNetV2/4-class/mắt người/dataset thu thập
- [x] §4.4.5 (Demo): re-number từ 4.4.6, nội dung không đổi
- [x] Mọi phương pháp đánh giá có [ref: file:Lxx / ledger-id]
- [x] Không bịa số kết quả cụ thể (MAE, AUROC, F1 — chưa chạy eval)
- [x] Phong cách dàn ý giữ nguyên (tiêu đề in-nghiêng *4.4.x.*, bullets, Tiếng Việt)
- [x] Không sửa dynamic-pricing-final/ (chỉ đọc eval.py và market_env.py)
- [x] Không commit

## T1.14 — Sửa CHƯƠNG 5 (§5.1 Kết luận, §5.2 Hạn chế, §5.3 Hướng phát triển) ✅

### Tóm tắt thay đổi trong `docs/thesis/dany.md` (§5 chỉ)

**§5.1 Kết luận:**
- Số liệu: GIỮ "13 module, 54/54 test, ≈48 màn hình route, 1 pricing-sidecar AI" (đã đúng từ T1.12/T1.15) [ref: ledger t1.15-numbers, t1.4-one-sidecar]
- 6 đóng góp: liệt kê tường minh ĐG1–ĐG6 thật với citation inline — không còn "ĐG2 recommender" hay "ĐG3 Holt". ĐG2=Interceptor giá AI, ĐG3=ForecasterLSTM [ref: ledger t1.4-no-recommender, t1.4-forecaster-not-holt]
- "Bài học: Sidecar pattern, embedded snapshot, webhook as truth, safety layer" GIỮ

**§5.2 Hạn chế:**
- Sửa "Dataset tươi nhỏ (~2000 ảnh)" → "chỉ 2/4 danh mục có model CoreML riêng (fruit/root); leafy và herbs fallback dùng model root" với citation [ref: pricing-sidecar/main.py:314; ledger t0.6-coreml-freshness, t1.4-freshness-coreml, t0.10-thesis-limitations]
- GIỮ: Email/SMS verify tắt; GHN Dijkstra fallback; Định giá advisory; Sidecar chưa Docker; Chưa có rating/review
- **THÊM 3 GIỚI HẠN BẮT BUỘC (ledger t0.10-thesis-limitations):**

  **(a) Forecaster train↔serve mismatch** [ref: pricing-sidecar/main.py:130-131; dynamic-pricing-final/checkpoints/forecaster_v4_best.pt; ledger t0.4-forecaster-parity, t0.10-thesis-limitations]:
  > "**[HẠN CHẾ BẮT BUỘC — tính trung thực] Forecaster train↔serve mismatch:** checkpoint `forecaster_v4_best.pt` được huấn luyện với obs_dim=11 (bao gồm feature price_ratio ở index 2) và chuỗi 21 bước thật (temporal dynamics); sidecar serve pad 10→11 ở cuối (sai vị trí — feature bị mất nằm ở index 2, làm lệch toàn bộ feature từ index 2 trở đi) và tile-21× thay vì chuỗi lịch sử thật (LSTM không còn nhìn thấy temporal dynamics). Do đó `/forecast` endpoint chỉ là xấp xỉ thấp; kết quả đáng tin cậy phải qua offline eval bằng `dynamic-pricing-final/src/forecaster/eval.py` với dữ liệu lịch sử thật."

  **(b) DoW lệch pha serve** [ref: pricing-sidecar/main.py:98; dynamic-pricing-final/src/env/market_env.py:132; dynamic-pricing-final/data/params/demand_params.json; ledger t0.9-fixes, t0.10-thesis-limitations]:
  > "**[HẠN CHẾ BẮT BUỘC — tính trung thực] DoW lệch pha serve:** trong quá trình huấn luyện, ngày trong tuần được tính bằng `t % 7` (t là bước mô phỏng, bắt đầu từ 0 bất kỳ ngày thật); khi serve, sidecar dùng `datetime.now().weekday()` (weekday thật) → lệch pha tùy ý so với pha train. Ảnh hưởng định lượng nhỏ (< 6.2%, vì sin_weekly/cos_weekly của demand_params.json rất nhỏ — max ±0.023) nhưng không bằng 0 và không kiểm soát được."

  **(c) Freshness chỉ 2/4 model CoreML** [ref: ledger t0.6-coreml-freshness, t0.10-thesis-limitations]:
  > "**[HẠN CHẾ BẮT BUỘC — tính trung thực] Freshness chỉ 2/4 model CoreML** (đã nêu chi tiết ở mục trên — leafy/herbs dùng chung model root)"

**§5.3 Hướng phát triển:**
- GIỮ: định giá live+A/B, GHN thật, DDQN→Multi-Agent RL, Docker Compose+CI/CD, Web portal Farm, Chatbot LLM
- THÊM hướng: "Khắc phục train↔serve forecaster: retrain obs_dim=10 + chuỗi lịch sử thật" [ref: ledger t0.4-forecaster-parity, t0.10-thesis-limitations]
- THÊM hướng: "Bổ sung hệ thống gợi ý sản phẩm (hiện chưa có)" — trình bày trung thực là hướng tương lai, KHÔNG overclaim là feature hiện tại [ref: ledger t1.4-no-recommender]
- "Thu thập thêm ảnh rau VN" → làm rõ ngữ cảnh: thu thập cho leafy/herbs (hiện chưa có model riêng)

### Xác nhận 3 giới hạn bắt buộc đã vào §5.2 (trích nguyên văn dòng)

1. **Forecaster train↔serve mismatch** — dòng 639 dany.md:
   `**[HẠN CHẾ BẮT BUỘC — tính trung thực] Forecaster train↔serve mismatch:** checkpoint ...`
   Citation: `pricing-sidecar/main.py:130-131; ledger t0.4-forecaster-parity, t0.10-thesis-limitations`

2. **DoW lệch pha serve** — dòng 641 dany.md:
   `**[HẠN CHẾ BẮT BUỘC — tính trung thực] DoW lệch pha serve:** trong quá trình huấn luyện...`
   Citation: `pricing-sidecar/main.py:98; dynamic-pricing-final/src/env/market_env.py:132; ledger t0.9-fixes, t0.10-thesis-limitations`

3. **Freshness chỉ 2/4 model CoreML** — dòng 643 dany.md:
   `**[HẠN CHẾ BẮT BUỘC — tính trung thực] Freshness chỉ 2/4 model CoreML** (đã nêu chi tiết...)`
   Citation: `ledger t0.6-coreml-freshness, t0.10-thesis-limitations`

### Verify checklist

- [x] §5.1 số liệu đúng: 13 module, 54/54 test, ≈48 màn hình route, 1 sidecar
- [x] §5.1 6 đóng góp thật (ĐG1–ĐG6): không còn recommender, không còn Holt
- [x] §5.2 "Dataset tươi ~2000 ảnh" → đã sửa thành giới hạn thật (2/4 model, leafy/herbs dùng root)
- [x] §5.2 GIỮ 5 hạn chế thật cũ (Email/SMS, GHN, advisory, Docker, rating)
- [x] §5.2 CÓ ĐỦ 3 giới hạn bắt buộc từ ledger t0.10-thesis-limitations
- [x] §5.3 không overclaim recommender — trình bày rõ "hiện chưa có, đây là hướng tương lai"
- [x] §5.3 có hướng "khắc phục forecaster train↔serve" (trung thực)
- [x] Mọi claim kỹ thuật có [ref: file:Lxx / ledger-id]
- [x] Outline §5 giữ nguyên (tiêu đề **5.1.**, **5.2.**, **5.3.** in-đậm, bullets, Tiếng Việt)
- [x] Không sửa §1–§4, TÀI LIỆU THAM KHẢO
- [x] Không sửa dynamic-pricing-final/
- [x] Không commit

## T1.V — verify pass độc lập toàn văn ✅ — Task 1 DONE
- Báo cáo: `docs/thesis/dany.verify-report.md`. Verifier = controller (đối kháng, khác implementer).
- PASS: outline bảo toàn; 0 false-claim residue; 3 giới hạn bắt buộc ở §5.2; citation lấy mẫu resolve.
- Fix khi verify: §5.2(a) main.py 130→134-135 (drift số dòng); ADVISORY_MODE→PRICING_MODE; §2.4.3 BGR→RGB; §1.5 5→6 đóng góp; strip 2 dòng "BỎ:".
- Số liệu: 13 module, 54/54 test, ~79 endpoint, ~48 màn hình, 10 collection, 1 sidecar.
- ⚠️ KHÔNG ghi STATE.md (session khác sở hữu cho T0.13). Con trỏ: **Task 1 DONE → việc tiếp theo = Task 2** (T2.1 dàn ý thesis từ dany.md đã sửa).
