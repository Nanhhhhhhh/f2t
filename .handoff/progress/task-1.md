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
