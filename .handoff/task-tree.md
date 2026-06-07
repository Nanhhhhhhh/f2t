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
| T1.5 ⭐ | Viết lại §1.2 Mục tiêu + §1.5 Đóng góp (xóa recommender, sửa LSTM/CoreML/13module/1sidecar) | sonnet | T1.4 | done (verify PASS, citation resolve) |
| T1.6+T1.7 ⭐ | Viết lại TOÀN BỘ §2.4 (xóa lý thuyết recommender+Holt; thêm LSTM/DDQN-Dueling/CoreML) | sonnet | T1.5 | done (verify PASS, fix BGR nuance) |
| T1.8 ⭐ | Viết lại TOÀN BỘ §3.3.7 (xóa (a) recommender; (b)LSTM+giới hạn; (c)DDQN+Safety; (d)CoreML) — hyperparam resolve tại nguồn | sonnet | T1.4 | done (verify PASS, hyperparam khớp agent.py/train.py) |
| T1.9 ⭐ | (đã gộp vào T1.6+T1.7 cho §2.4.6 lý thuyết, và T1.8 cho §3.3.7d) | — | — | done (gộp) |
| T1.10 ⭐ | Viết lại §1.3 + §3.3.1/3.3.3/3.3.5/3.3.6 (1 sidecar; xóa UC/SD/AD-ML recommender; Holt→LSTM) | sonnet | T1.5 | done (verify PASS, endpoint+cron citation khớp) |
| T1.11 ⭐ | Viết lại §3.4 CSDL (ERD + 10 collection thật + 12 index) | sonnet | T1.4 | done (verify PASS, schema/index khớp 10 file) |
| T1.12 | Sửa dư âm recommender §2.5/2.6/3.1.2/3.2/3.5 + số liệu §4.1/4.2/4.4.1/5.1 (13 module,1 sidecar,79 endpoint,~48 screen); giữ "gợi ý giá"+"quét tươi" thật | sonnet | T1.5 | done (verify PASS, residue chỉ còn §4.4 experiments) |
| T1.13 ⭐ | Viết lại §4.4 thực nghiệm (xóa eval recommender; LSTM offline eval+giới hạn; DDQN sim; CoreML 2×2) | sonnet | T1.8 | done (verify PASS, eval.py/EPISODE_LEN khớp; T1.V dọn note "BỎ:") |
| T1.14 ⭐ | Thêm §5.2 Limitations thật (3 giới hạn ledger t0.10) + sửa §5.1 số liệu + §5.3 | sonnet | T1.4 | done (verify PASS, fix citation main.py 130→134) |
| T1.15 | Resolve claim chưa chứng minh (54 test / 42 màn hình / endpoint / camera freshness) | controller | — | done (54 test ĐÚNG; 79 endpoint; ~48 screen; camera scan có thật) |
| T1.V | Verify pass độc lập toàn văn | controller | T1.5…T1.15 | done (PASS — `docs/thesis/dany.verify-report.md`) |

> Mỗi leaf-task T1.x: ledger-first → sửa section (giữ outline, citation inline) → verify đối kháng độc lập → done-gate → commit. KHÔNG đụng dynamic-pricing-final/ (chỉ đọc).

> **TASK 1 DONE ✅ (2026-06-07).** Việc tiếp theo = **Task 2** (T2.1 dàn ý thesis từ `docs/thesis/dany.md` đã fact-check). (Không cập nhật STATE.md vì session khác đang sở hữu cho T0.13.)

## TASK 2 — Viết thesis hoàn chỉnh (ĐANG CHẠY)
Plan: `docs/superpowers/plans/2026-06-07-task2-thesis-full-prose.md`. Đầu ra: `docs/thesis/final/` (chia chương) + `diagrams/*.puml`. Progress: `.handoff/progress/task-2.md`.
| ID | Việc | Model | Dep | Status |
|----|------|-------|-----|--------|
| T2.1 | Skeleton 6 file chương + STRUCTURE.md (hợp đồng cấu trúc) | controller | T1.V | done (outline khớp 100%) |
| T2.2 | Fact-pack ledger non-AI/non-CSDL (5 entry nhóm Task 2) | sonnet | T2.1 | done (seed khớp dany.md) |
| T2.3a-g | 23 diagram PlantUML (ERD/deploy/FDD/usecase/SD×9/AD×4/net×2/business×2) | sonnet | T2.2 | done (verify đối kháng PASS, fix erd referenceId String) |
| T2.4-T2.5 | Chương 1 GIỚI THIỆU prose | sonnet | T2.3 | done (verify PASS, 15 cit) |
| T2.6-T2.11 | Chương 2 CƠ SỞ LÝ THUYẾT prose (§2.4 AI/ML ⭐) | sonnet | T2.3 | done (verify PASS, §2.4 resolve source) |
| T2.12-T2.16 | Chương 3 phần 1: §3.1-§3.3.6 (nghiệp vụ+kiến trúc+UC+SD+AD) | sonnet | T2.3 | done (verify PASS; fix GHN/cron/port+Redis trung thực) |
| T2.17-T2.19 ⭐ | Chương 3: §3.3.7 a/b/c AI/ML (2-lớp) | sonnet | T2.16 | done (verify 2-lớp PASS; obs_dim=10 tile-21×; Safety 3→4→1→2→5; 9/9 hyperparam) |
| T2.20-T2.21 ⭐ | Chương 3: §3.4 CSDL (ERD+10 collection+index, 2-lớp) | sonnet | T2.16 | done (verify 2-lớp PASS; 10 collection resolve 10 schema; orders 3 single index) |
| T2.22 | Chương 3: §3.5 giao diện | sonnet | T2.16 | done (verify PASS; Consumer 0 recommender; Farm quét tươi+gợi ý giá thật) |
| T2.23-T2.28 | Chương 4 TRIỂN KHAI (§4.4.2/3/4 eval AI/ML ⭐, không bịa số) | sonnet | T2.22 | ⏳ NEXT |
| T2.29-T2.30 | Chương 5 (3 giới hạn bắt buộc ⭐) + TLTK IEEE | sonnet | T2.28 | pending |
| T2.V | Verify toàn văn độc lập → VERIFY-REPORT.md | sonnet/controller | T2.30 | pending |

> Mỗi leaf-task: ledger-first (tái dùng 20 entry sẵn) → prose giữ citation inline → verify đối kháng độc lập (CSDL/AI-ML/diagram 2-lớp) → commit nhỏ. KHÔNG đụng code (chỉ đọc fact-check).
