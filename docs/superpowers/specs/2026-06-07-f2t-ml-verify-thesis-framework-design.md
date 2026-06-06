# Design — Framework thực thi: Verify ML integration + Viết khoá luận f2t

- **Ngày:** 2026-06-07
- **Trạng thái:** Approved (brainstorming) → chờ writing-plans
- **Phạm vi phiên hiện tại:** Design framework → spec → plan → **thực thi Task 0**. Task 1 & 2 để các phiên sau.

---

## 1. Bối cảnh & mục tiêu

Có 3 task lớn cần hoàn thành trên repo `/Users/macos/f2t`:

- **Task 0 — Verify & hoàn thiện ML integration.** Phần ML (dynamic_pricing `SharedMLPDuelingQNet` đa-category, freshness 2 model CoreML, demand `ForecasterLSTM`) được copy từ `/Users/macos/dynamic-pricing-v3` vào `f2t/dynamic-pricing-final`. `pricing-sidecar` (kiến trúc DQN cũ) đã được các agent trước chỉnh để phục vụ kiến trúc mới, **nhưng chưa chắc chắn integrate 100%**. Cần đảm bảo: (a) sidecar phục vụ `dynamic-pricing-final` đúng 100%, (b) `f2t-backend` output đủ tài nguyên (~10–12 chiều) cho sidecar.
- **Task 1 — `dany.docx` → `dany.md`, sửa nội dung sai theo codebase.** `dany.docx` đang chứa nội dung sai (vd recommender system, kiến trúc cũ). Giữ nguyên outline, chỉ sửa nội dung, fact-check với code (dùng codegraph).
- **Task 2 — Viết khoá luận hoàn chỉnh từ `dany.md` đã sửa.** Liên tục fact-check với codebase.

### Tiêu chí #1 (BẮT BUỘC, tuyệt đối)
Toàn bộ nội dung khoá luận phải **chân thực 100% so với codebase**. Ưu tiên tuyệt đối độ trung thực cho 3 phần: **thiết kế CSDL, AI/ML, và diagram**.

### Ràng buộc xuyên suốt
- Chia task **càng nhỏ càng tốt**; phải có plan + rules + workflows cụ thể.
- Cơ chế lưu/truyền progress xuyên **conversation, session, kể cả khác account claude** — để agent sau tiếp tục nhanh & dễ nhất.
- Tận dụng hệ agent: **mặc định sonnet 4.6**; **haiku 4.5** chỉ cho task siêu nhỏ; **skill `gemini`** chỉ cho việc cơ học siêu nhỏ.

### Quyết định về ngôn ngữ & định dạng
- Khoá luận viết **tiếng Việt** (thuật ngữ kỹ thuật có thể giữ tiếng Anh).
- Đầu ra chính = **Markdown**. Diagram (use case, sequence, activity, ERD/class) = **PlantUML**.
- File thesis đặt tại `docs/thesis/` trong repo f2t.

---

## 2. Kiến trúc framework (Hướng B — có cấu trúc + verification gate)

### 2.1 Layout `.handoff/` (tại `/Users/macos/f2t/.handoff/`, commit git)

```
.handoff/
├── ONBOARDING.md        # Agent mới đọc ĐẦU TIÊN
├── STATE.md             # Con trỏ sống: phase, task-id đang làm, "việc tiếp theo", blocker
├── task-tree.md         # Cây task nhỏ: ID, mô tả, status, dependency, model gợi ý
├── rules.md             # Rules & workflows: orchestration, model policy, gate, commit
├── claims-ledger.md     # Mọi luận điểm thesis → bằng chứng (file:line / codegraph node / lệnh+output)
└── progress/
    ├── task-0.md
    ├── task-1.md
    └── task-2.md
```

### 2.2 Memory hai tầng
- **Tầng repo (nguồn sự thật):** toàn bộ `.handoff/` — portable qua mọi account/máy khi clone repo.
- **Tầng `~/.claude/memory` (tiện lợi cùng account):** 1 file pointer `project_f2t_handoff.md` + 1 dòng trong `MEMORY.md`, nội dung: *"Dự án f2t chạy framework `.handoff/` — luôn đọc `/Users/macos/f2t/.handoff/STATE.md` trước khi làm gì."*

### 2.3 Orchestration & model policy
- **Main agent** = điều phối: đọc STATE → chọn leaf-task theo dependency → dispatch subagent (prompt tự chứa) → VERIFY qua gate → cập nhật STATE/task-tree/ledger → commit.
- **Subagent mặc định: sonnet 4.6.** **haiku 4.5**: chỉ task cơ học siêu nhỏ (convert, đọc 1 file ngắn, format). **Skill `gemini`**: chỉ convert/grep-replace hàng loạt cơ học. **Không bao giờ** giao phán đoán nội dung cho gemini/haiku.
- Prompt subagent **tự chứa**: đường dẫn tuyệt đối, file cần đọc, định nghĩa "done", và yêu cầu *ghi kết quả vào `.handoff/progress/<id>.md`*.

### 2.4 Luật granularity (cốt lõi cho độ chân thực)
- 1 leaf-task = tối đa **1 tiểu mục / 1 diagram / 1 cụm claim liên quan**.
- Mỗi leaf-task bắt buộc kết thúc bằng: entry trong `claims-ledger.md` + **1 lượt verify độc lập** trước khi đánh `done`.
- Cây task của Task 1 & 2 là **động**: "nở" leaf-task theo đúng outline thật sau khi convert/đọc (T1.1 / T2.1), không cố định cứng từ trước (tránh bịa cấu trúc). Task 2 dự kiến ~40–50 leaf-task sinh ra tự nhiên từ luật này.

### 2.5 Hai loại verification gate
- **Gate kỹ thuật (Task 0):** không đánh `done` nếu thiếu bằng chứng runtime — log server boot, response JSON thật, bảng so khớp dim/obs. Không có output thật = không pass.
- **Gate fact-check (Task 1 & 2):** mỗi claim kỹ thuật phải có entry ledger. Phần **CSDL / AI-ML / diagram** kiểm **2 lớp**: agent viết + agent verify *khác* (verify agent có quyền REJECT, trả task về trạng thái cần sửa).

### 2.6 Vòng đời 1 leaf-task
```
đọc STATE.md → chọn leaf-task theo dependency → dispatch subagent (prompt tự chứa)
  → subagent làm + ghi progress/<id>.md → main agent VERIFY qua gate
  → PASS: cập nhật STATE + task-tree(done) + ledger → commit
  → FAIL: ghi blocker vào STATE, tạo task sửa, KHÔNG đánh done
```

### 2.7 Quy ước commit
- Mỗi leaf-task pass → 1 commit nhỏ: `task(<id>): <mô tả>`, kèm cập nhật `.handoff/`.
- `.handoff/` luôn commit cùng để state không lệch khỏi code.
- Cuối mỗi phiên: cập nhật `STATE.md` mục "việc tiếp theo" rồi commit.

### 2.8 Onboarding agent mới (`ONBOARDING.md`)
Thứ tự đọc bắt buộc: `ONBOARDING.md` → `STATE.md` → `rules.md` → `task-tree.md` → `progress/<task đang làm>.md`.
3 luật vàng đầu file:
1. Không claim `done` khi thiếu bằng chứng.
2. Mọi claim thesis phải vào `claims-ledger.md`.
3. Cập nhật `STATE.md` trước khi kết thúc phiên.

### 2.9 Enforcement protocol (cưỡng chế fact-check — cốt lõi cho Tiêu chí #1)

`rules.md` chỉ là điều kiện cần. Vì subagent khởi động "lạnh", độ chân thực phải được **cưỡng chế bằng cấu trúc**, không dựa vào việc agent tự nhớ. 5 cơ chế bắt buộc:

1. **Prompt template bắt buộc.** Main agent nhúng nguyên giao thức fact-check vào *từng* prompt dispatch (không trông chờ subagent đọc `rules.md`). Template tối thiểu gồm: đường dẫn tuyệt đối, file/symbol cần đọc, định nghĩa "done" gắn bằng chứng, và 3 luật vàng. Template lưu trong `rules.md` để tái dùng.
2. **Ledger-first (evidence trước, prose sau).** Bắt buộc thu thập bằng chứng (codegraph node / `file:Lxx` + lệnh+output) ghi vào `claims-ledger.md` TRƯỚC, rồi mới viết prose trích từ ledger. Cấm viết-rồi-bịa-nguồn.
3. **Citation máy kiểm được, inline.** Mỗi câu kỹ thuật mang marker `[ref: path:Lxx]` hoặc codegraph node-id mà verify pass *mở ra resolve được*. **Câu kỹ thuật không citation = auto-reject.** (Pass cuối có thể chuyển marker inline → footnote/endnote cho prose sạch, không mất truy vết.)
4. **Verify agent đối kháng trên MỌI content task.** Agent verify *khác* agent viết, có codebase trong tay, được lệnh "giả định mọi claim sai cho tới khi resolve được citation", chạy theo checklist reject. Không phải tự-review. Có quyền REJECT → trả task về cần sửa.
5. **Done-gate gắn artifact.** Orchestrator chỉ đánh `done` khi thấy đủ: ledger entries + verify PASS report. Thiếu = không done, không commit.

Áp dụng cho mọi content kỹ thuật của Task 1 & 2; phần **CSDL / AI-ML / diagram** bắt buộc đủ cả 5. Task 0 dùng biến thể: "citation" = log/response runtime, "verify đối kháng" = chạy lại gate kỹ thuật độc lập.

---

## 3. Cây task nhỏ

Quy ước: `[model]` = model đề xuất subagent. ⭐ = điểm rủi ro cao (lệch train↔serve), soi kỹ.

### TASK 0 — Verify ML integration *(thực thi phiên này)*

| ID | Việc | Model | Dep |
|----|------|-------|-----|
| T0.1 | Diff `/Users/macos/dynamic-pricing-v3` ↔ `f2t/dynamic-pricing-final`; xác nhận copy đầy đủ, liệt kê khác biệt thực chất (bỏ `__pycache__`, checkpoints) | sonnet | — |
| T0.2 | Verify định nghĩa model: `SharedMLPDuelingQNet`, `ForecasterLSTM`/`ForecasterConfig`, `reward.py` (`CANDIDATES`, `compute_mask`) — khớp hằng số sidecar (OBS_DIM=10, N_ACTIONS=11, n_cats=4, embed=8, hidden=128) | sonnet | T0.1 |
| T0.3 ⭐ | **Obs parity**: so khớp `sidecar._build_obs` (10 chiều) với cách build observation lúc train trong `src/env/market_env.py`; liệt kê từng chiều khớp/lệch | sonnet | T0.2 |
| T0.4 ⭐ | **Forecaster parity**: sidecar "tile obs 21×" vs cách train (`forecaster/data.py`, `train.py`); kiểm `cfg.obs_dim` thật vs 10 | sonnet | T0.2 |
| T0.5 | Smoke-load checkpoint: `rl_shared_best.pt` (key `online`) + `forecaster_v4_best.pt` (`model_cfg`/`model_state`) load OK + 1 inference | sonnet | T0.2 |
| T0.6 | CoreML freshness: load `fruit` & `root`, predict 1 ảnh mẫu; xác nhận chủ đích fallback "root" cho mọi non-fruit (không có leafy/herbs) | sonnet | — |
| T0.7 ⭐ | **Backend output**: tìm chỗ `f2t-backend` build request gọi sidecar — gửi đủ 9 field `ProductStateVector` không (= "f2t output đủ ~10–12 dim") | sonnet | — |
| T0.8 | **Integration test**: boot sidecar (`.venv`, uvicorn) → gọi `/health` `/predict` `/forecast` `/freshness/classify`, lưu response; nếu backend chạy được → e2e | sonnet | T0.3–T0.7 |
| T0.9 | Fix các lệch phát hiện (nếu có) → chạy lại gate liên quan | sonnet | T0.8 |
| T0.10 | Ghi kết luận `progress/task-0.md` + nạp fact (DB/AI-ML) vào `claims-ledger.md` để thesis dùng lại | sonnet | T0.9 |

### TASK 1 — dany.docx → dany.md, sửa nội dung sai *(phiên sau)*

| ID | Việc | Model | Dep |
|----|------|-------|-----|
| T1.1 | Convert `dany.docx` → `docs/thesis/dany.md` (pandoc), giữ outline | gemini/haiku | — |
| T1.2 | Convert `thesis_A46489.docx` → `docs/thesis/thesis_old.md` (tham khảo, chưa tin) | gemini/haiku | — |
| T1.3 | Trích outline dany.md → liệt kê heading cần giữ | haiku | T1.1 |
| T1.4 | Audit: quét dany.md tìm claim sai (recommender system, QMIX cũ, sidecar cũ…) → bảng "sai → đúng theo code" | sonnet | T1.3 |
| T1.5…N | *(động)* Mỗi section sai = 1 leaf-task: sửa bám codebase, ghi ledger | sonnet | T1.4 |
| T1.V | Verify pass độc lập: đối chiếu dany.md đã sửa ↔ ledger ↔ code | sonnet | T1.5…N |

### TASK 2 — Viết thesis hoàn chỉnh *(phiên sau)*

| ID | Việc | Model | Dep |
|----|------|-------|-----|
| T2.1 | Dàn ý thesis đầy đủ (chương/mục) từ dany.md đã sửa | sonnet | T1.V |
| T2.2 | "Fact pack" từ codebase cho phần ưu tiên: schema CSDL, kiến trúc AI/ML, luồng nghiệp vụ → ledger | sonnet | T2.1 |
| T2.3 | Diagram PlantUML (use case, sequence, activity, ERD/class) bám code | sonnet | T2.2 |
| T2.4…N | *(động)* Viết từng chương = 1 leaf-task, fact-check ngay khi viết | sonnet | T2.2/T2.3 |
| T2.V | Verify toàn văn độc lập: từng claim ↔ ledger ↔ code; gate cuối | sonnet | T2.4…N |

---

## 4. Sự thật codebase đã xác nhận (nền cho Task 0)

- `pricing-sidecar/main.py` import trực tiếp từ `dynamic-pricing-final` qua file-spec import (tránh `src/rl/__init__.py`): `SharedMLPDuelingQNet` (`src/rl/network.py`), `ForecasterLSTM`/`ForecasterConfig` (`src/forecaster/model.py`), `CANDIDATES`/`compute_mask` (`src/rl/reward.py`).
- Hằng số: `OBS_DIM=10`, `N_ACTIONS=11`, `N_CATS=4`, `cat_embed_dim=8`, `hidden=128`, `OBS_WINDOW=21`. CATEGORIES = `["leafy","root","fruit","herbs"]`.
- Checkpoint: `checkpoints/rl_shared_best.pt` (key `online`), `checkpoints/forecaster_v4_best.pt` (`model_cfg` → `ForecasterConfig`, `model_state`).
- CoreML: `freshnessmodels/MyFreshnessClassifier-fruit.mlmodel` + `-root.mlmodel` (chỉ 2 loại; non-fruit fallback "root").
- Endpoint sidecar: `/health`, `/predict`, `/forecast`, `/freshness/classify`.
- `ProductStateVector` 9 field: `productId, category, freshness, inventory_ratio, base_price, competitor_ref_price, days_to_restock(=3.0), prev_delta(=0.0), demand_7d(=0.0)`.
- **Rủi ro chính**: `_build_obs` được **reimplement trong sidecar** (10 chiều) thay vì dùng `src/env/market_env.py` → phải verify parity (T0.3). Forecaster dùng "tile obs 21×" → verify parity (T0.4).
- `dynamic-pricing-v3` gốc tại `/Users/macos/dynamic-pricing-v3` (so sánh ở T0.1).
- Có sẵn `dynamic-pricing-final/docs/superpowers/{specs,plans}` (convention cũ, tham khảo).

---

## 5. Ngoài phạm vi (YAGNI)
- Không retrain model (checkpoint hiện tại OBS_DIM=10 là chuẩn; "10–12" chỉ là cách nói khoảng — xác minh bằng code, không đổi kiến trúc trừ khi T0.3/T0.4 lộ lỗi thật).
- Không refactor không liên quan tới integration hoặc độ chân thực thesis.
- Không export docx/pdf ở giai đoạn này (Markdown là đầu ra chính).

---

## 6. Bước kế tiếp
1. Khởi tạo `.handoff/` (ONBOARDING, STATE, task-tree, rules, claims-ledger, progress/) + pointer `~/.claude/memory`.
2. writing-plans: tạo implementation plan chi tiết cho **Task 0**.
3. Thực thi Task 0 theo plan.
