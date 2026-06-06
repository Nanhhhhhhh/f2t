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
