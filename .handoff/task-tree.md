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
| T2.23-T2.28 | Chương 4 TRIỂN KHAI (§4.4.2/3/4 eval AI/ML ⭐, không bịa số) | sonnet | T2.22 | done (verify đối kháng PASS; §4.4.2/3/4 2-lớp; T2.25 REJECT→fix Hình 4.8 Shadow Report; T2.26 fix Naive=đề xuất; 0 số eval bịa) |
| T2.29 | Chương 5 (3 giới hạn bắt buộc ⭐) | sonnet | T2.28 | done (verify đối kháng REJECT→fix ĐG2 suggested_price→3 trường thật→PASS; 4× "HẠN CHẾ BẮT BUỘC") |
| T2.30 | TLTK IEEE 35 entry + mục lục/danh mục hình-bảng | sonnet | T2.29 | done (order-of-appearance; trim vol/no 3 paper so sánh; mục lục khớp heading) |
| T2.V | Verify toàn văn độc lập → VERIFY-REPORT.md | sonnet | T2.30 | done (PASS — V1-V6, 38 path resolve, 0 false-claim, 0 số eval bịa) |

> Mỗi leaf-task: ledger-first (tái dùng 20 entry sẵn) → prose giữ citation inline → verify đối kháng độc lập (CSDL/AI-ML/diagram 2-lớp) → commit nhỏ. KHÔNG đụng code (chỉ đọc fact-check).

> **CHƯƠNG 4 DONE ✅ (2026-06-07, phiên #3):** T2.23→T2.28 verify đối kháng PASS + RE-VERIFY toàn chương 2 lớp PASS (0 số eval bịa, canonical nhất quán, 26/26 ref tồn tại). 6 commit `19500b6…520664b` + re-verify đã push.

> **TASK 2 DONE ✅ (2026-06-08, phiên #4):** T2.29 (Chương 5, commit cd6655d) → T2.30 (TLTK IEEE 35 entry + mục lục, commit a23d9c9) → T2.V (verify toàn văn độc lập PASS — `docs/thesis/final/VERIFY-REPORT.md`, V1-V6 0 FAIL). Khoá luận hoàn chỉnh: 5 chương + TLTK + mục lục + 23 diagram, chân thực 100% với code. **CẢ 3 TASK LỚN (0/1/2) HOÀN TẤT.**

---

## Task 3 — Cập nhật thesis theo 57 commit main mới (2026-06-09)

> Branch: `feature/f2t-thesis-merge-main`. Không đụng `feature/f2t-ml-verify-thesis`.

| ID | Mô tả | Phụ thuộc | Status |
|----|-------|-----------|--------|
| T3.0 | Fact-pack ledger — 6 entry mới (cross-sell, reviews, auth-reset, admin, numbers) | — | done |
| T3.1 | STRUCTURE.md — canonical numbers 15/2/4/92/24/78/56/12 | T3.0 | done |
| T3.2 ⭐ | §2.4.4 FP-Growth theory + §2.1.2/§2.5/§2.6 scope fix (2-lớp verify PASS 7/7) | T3.0 | done |
| T3.3 | Sweep "no recommender" Ch3/4/5 — 10 chỗ scoped | T3.1 | done |
| T3.4 | §3.3.1 — 15 module / 2 sidecar | T3.3 | done |
| T3.5 | §3.3.3 — UC-ML-03 cross-sell + UC-RV-01 review | T3.3 | done |
| T3.6 | §3.3.8 Reviews module | T3.5 | done |
| T3.7 | §3.3.9 Recommendations module | T3.5 | done |
| T3.8 ⭐ | §3.3.7d cross-sell design + sd-cross-sell.puml (2-lớp verify PASS 6/6) | T3.2-T3.7 | done |
| T3.9 ⭐ | §3.4 CSDL — +reviews/+password_reset_tokens/product rating (2-lớp verify PASS 4/4) | T3.8 | done |
| T3.10 | §3.5 UI — CrossSell/auth-reset/add-review/admin screens | T3.9 | done |
| T3.11 | §4.3 testing — 78/24 | T3.10 | done |
| T3.12 | §4.4.1 overview — canonical mới | T3.11 | done |
| T3.13 ⭐ | §4.4.6 cross-sell eval — Bảng 4.13-4.15 thật; 0 precision bịa (2-lớp verify PASS 5/5) | T3.12 | done |
| T3.14 | §5.1/§5.2/§5.3 — 4 AI/8 HẠN CHẾ/GĐ1→GĐ2→GĐ3 | T3.13 | done |
| T3.15 | TLTK — [36] Agrawal 1994 + [37] Han 2000 | T3.14 | done |
| T3.16 | Mục lục — §2.4.4/§3.3.7d/§3.3.8/§3.3.9/§4.4.6/Bảng 4.13-4.15 | T3.15 | done |
| T3.17 | Ch1 — số canonical mới | T3.16 | done |
| T3.18 ⭐ | VERIFY toàn văn V1-V6 PASS — 0 false-claim, 0 stale, 8 HẠN CHẾ, Bảng re-number | T3.17 | done |
| T3.19 | .handoff/ STATE.md + task-tree.md | T3.18 | done |

> **TASK 3 DONE ✅ (2026-06-09):** 20 tasks T3.0→T3.19, subagent-driven-development. Thesis đồng bộ 100% với codebase. CẢ 4 TASK LỚN (0/1/2/3) HOÀN TẤT.
