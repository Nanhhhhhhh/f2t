# task-tree.md — cây task nhỏ

Trạng thái: `pending` | `in_progress` | `done` | `blocked`. ⭐ = rủi ro cao.

## TASK 0 — Verify ML integration (phiên hiện tại)
| ID | Việc | Model | Dep | Status |
|----|------|-------|-----|--------|
| T0.1 | Diff dynamic-pricing-v3 ↔ dynamic-pricing-final | sonnet | — | done |
| T0.2 | Verify định nghĩa model khớp hằng số sidecar | sonnet | T0.1 | done |
| T0.3 ⭐ | Obs parity: _build_obs ↔ market_env | sonnet | T0.2 | pending |
| T0.4 ⭐ | Forecaster parity: tile 21× ↔ cách train | sonnet | T0.2 | pending |
| T0.5 | Smoke-load checkpoint + inference | sonnet | T0.2 | pending |
| T0.6 | CoreML freshness load + predict | sonnet | — | pending |
| T0.7 ⭐ | Backend output đủ 9 field ProductStateVector | sonnet | — | pending |
| T0.8 | Integration test: boot sidecar + gọi endpoint | sonnet | T0.3–T0.7 | pending |
| T0.9 | Fix gaps phát hiện + re-verify | sonnet | T0.8 | pending |
| T0.10 | Kết luận + nạp ledger cho thesis | sonnet | T0.9 | pending |

## TASK 1 — dany.docx → dany.md, sửa nội dung sai (phiên sau)
| ID | Việc | Model | Dep | Status |
|----|------|-------|-----|--------|
| T1.1 | Convert dany.docx → docs/thesis/dany.md | gemini/haiku | — | pending |
| T1.2 | Convert thesis_A46489.docx → thesis_old.md | gemini/haiku | — | pending |
| T1.3 | Trích outline dany.md | haiku | T1.1 | pending |
| T1.4 | Audit claim sai → bảng "sai → đúng" | sonnet | T1.3 | pending |
| T1.5…N | (động) Sửa từng section bám code | sonnet | T1.4 | pending |
| T1.V | Verify pass độc lập | sonnet | T1.5…N | pending |

## TASK 2 — Viết thesis hoàn chỉnh (phiên sau)
| ID | Việc | Model | Dep | Status |
|----|------|-------|-----|--------|
| T2.1 | Dàn ý thesis đầy đủ | sonnet | T1.V | pending |
| T2.2 | Fact pack: schema CSDL, AI/ML, luồng → ledger | sonnet | T2.1 | pending |
| T2.3 | Diagram PlantUML (usecase/sequence/activity/ERD) | sonnet | T2.2 | pending |
| T2.4…N | (động) Viết từng chương, fact-check | sonnet | T2.2/T2.3 | pending |
| T2.V | Verify toàn văn độc lập | sonnet | T2.4…N | pending |
