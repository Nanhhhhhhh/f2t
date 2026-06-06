# task-tree.md — cây task nhỏ

Trạng thái: `pending` | `in_progress` | `done` | `blocked`. ⭐ = rủi ro cao.

## TASK 0 — Verify ML integration (phiên hiện tại)
| ID | Việc | Model | Dep | Status |
|----|------|-------|-----|--------|
| T0.1 | Diff dynamic-pricing-v3 ↔ dynamic-pricing-final | sonnet | — | done |
| T0.2 | Verify định nghĩa model khớp hằng số sidecar | sonnet | T0.1 | done |
| T0.3 ⭐ | Obs parity: _build_obs ↔ market_env | sonnet | T0.2 | done (LỆCH→T0.9) |
| T0.4 ⭐ | Forecaster parity: tile 21× ↔ cách train | sonnet | T0.2 | done (LỆCH NẶNG→T0.9) |
| T0.5 | Smoke-load checkpoint + inference | sonnet | T0.2 | done |
| T0.6 | CoreML freshness load + predict | sonnet | — | done (BGR flag→T0.9) |
| T0.7 ⭐ | Backend output đủ 9 field ProductStateVector | sonnet | — | done (gửi đủ 9) |
| T0.8 | Integration test: boot sidecar + gọi endpoint | controller | T0.3–T0.7 | done (4/4 endpoint OK) |
| T0.9 | Fix gaps phát hiện + re-verify | sonnet | T0.8 | done |
| T0.10 | Kết luận + nạp ledger cho thesis | controller | T0.9 | done |

## TASK 1 — dany.docx → dany.md, sửa nội dung sai (ĐANG CHẠY)
Plan: `docs/superpowers/plans/2026-06-07-task1-dany-md-convert-fix.md`. Audit: `docs/thesis/dany.audit.md`.
| ID | Việc | Model | Dep | Status |
|----|------|-------|-----|--------|
| T1.1 | Convert dany.docx → docs/thesis/dany.md | haiku | — | done (671 dòng, outline in-đậm) |
| T1.2 | Convert thesis_A46489.docx → thesis_old.md | haiku | — | done (1864 dòng, tham khảo) |
| T1.3 | Trích outline dany.md → dany.outline.md | haiku | T1.1 | done |
| T1.4 | Audit claim sai → dany.audit.md + nở task | sonnet | T1.3 | done (25 BỊA/VIẾT LẠI, 12 SỬA, 10 GIỮ) |
| T1.5 ⭐ | Viết lại §1.2 Mục tiêu + §1.5 Đóng góp (xóa recommender, sửa LSTM/CoreML/13module/1sidecar) | sonnet | T1.4 | pending |
| T1.6 ⭐ | Viết lại §2.4.1–2.4.2 (xóa lý thuyết recommender; thêm lý thuyết LSTM+DDQN/Dueling) | sonnet | T1.5 | pending |
| T1.7 ⭐ | Viết lại §2.4.3–2.4.4 (Holt EWMA → ForecasterLSTM) | sonnet | T1.4 | pending |
| T1.8 ⭐ | Viết lại §2.4.5 + §3.3.7(c) DDQN đúng tham số + Safety 5 rule (resolve hyperparam tại nguồn) | sonnet | T1.4 | pending |
| T1.9 ⭐ | Viết lại §2.4.6 + §3.3.7(d) (MobileNetV2 → CoreML 2-model nhị phân) | sonnet | T1.4 | pending |
| T1.10 ⭐ | Viết lại §3.3.1 + §3.3.3 + diagram (1 sidecar; xóa UC-ML-01/SD-ML-01/02; sửa SD-ML-04) | sonnet | T1.5 | pending |
| T1.11 ⭐ | Viết lại §3.4.2 + §3.4.3 CSDL (10 collection thật, schema/index đúng) | sonnet | T1.4 | pending |
| T1.12 | Sửa §4.2 + §4.4.1 số liệu (13 module, 1 sidecar, endpoint, interceptor/cron resolve nguồn) | sonnet | T1.5 | pending |
| T1.13 ⭐ | Viết lại §4.4.2/4.4.3/4.4.5 thực nghiệm (xóa eval recommender; LSTM eval; CoreML nhị phân) | sonnet | T1.7,T1.9 | pending |
| T1.14 ⭐ | Thêm §5.2 Limitations thật (3 giới hạn ledger t0.10) + sửa §5.1 số liệu | sonnet | T1.4 | pending |
| T1.15 | Resolve claim chưa chứng minh (54 test / 42 màn hình / endpoint / camera freshness) | controller | — | done (54 test ĐÚNG; 79 endpoint; ~48 screen; camera scan có thật) |
| T1.V | Verify pass độc lập toàn văn | sonnet | T1.5…T1.15 | pending |

> Mỗi leaf-task T1.x: ledger-first → sửa section (giữ outline, citation inline) → verify đối kháng độc lập → done-gate → commit. KHÔNG đụng dynamic-pricing-final/ (chỉ đọc).

## TASK 2 — Viết thesis hoàn chỉnh (phiên sau)
| ID | Việc | Model | Dep | Status |
|----|------|-------|-----|--------|
| T2.1 | Dàn ý thesis đầy đủ | sonnet | T1.V | pending |
| T2.2 | Fact pack: schema CSDL, AI/ML, luồng → ledger | sonnet | T2.1 | pending |
| T2.3 | Diagram PlantUML (usecase/sequence/activity/ERD) | sonnet | T2.2 | pending |
| T2.4…N | (động) Viết từng chương, fact-check | sonnet | T2.2/T2.3 | pending |
| T2.V | Verify toàn văn độc lập | sonnet | T2.4…N | pending |
