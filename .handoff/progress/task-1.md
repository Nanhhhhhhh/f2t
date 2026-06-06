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
