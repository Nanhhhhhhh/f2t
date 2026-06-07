# Task 1 — dany.docx → dany.md + sửa nội dung sai theo code (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Mọi dispatch PHẢI nhúng prompt template trong `.handoff/rules.md`.

**Goal:** Convert `~/Downloads/dany.docx` sang `docs/thesis/dany.md` (giữ nguyên outline), rồi sửa mọi nội dung SAI so với codebase f2t hiện tại — ưu tiên tuyệt đối CSDL / AI-ML / diagram — đạt Tiêu chí #1: chân thực 100% với code.

**Architecture:** Pipeline tuyến tính rồi nở động. T1.1/T1.2 cơ học (pandoc convert). T1.3 trích outline. T1.4 audit toàn văn → bảng "claim sai → đúng theo code" (đây là điểm nở: mỗi cụm sai biến thành 1 leaf-task T1.5…N). Mỗi leaf-task sửa nội dung = ledger-first + verify đối kháng độc lập trước khi `done`. Cuối cùng T1.V verify toàn văn.

**Tech Stack:** pandoc 3.8, codegraph MCP (đọc cấu trúc code), PlantUML (diagram), markdown tiếng Việt.

**Ràng buộc tối quan trọng (từ STATE.md + claims-ledger):**
- KHÔNG đụng `dynamic-pricing-final/`, forecaster, parquet, checkpoint (session khác đang retrain T0.11–T0.13). Chỉ ĐỌC để fact-check, KHÔNG sửa.
- Session này chỉ ghi `.handoff/progress/task-1.md` + phần Task 1 trong `task-tree.md` + entries Task 1 trong `claims-ledger.md`. KHÔNG ghi `STATE.md` mục Task 0 / `progress/task-0.md`.
- 3 giới hạn ở ledger `t0.10-thesis-limitations` BẮT BUỘC giữ trung thực khi thesis chạm tới: (1) forecaster train↔serve mismatch → `/forecast` là xấp xỉ; (2) dow phase serve dùng weekday thật vs train `t%7` (<6.2%); (3) freshness chỉ 2 CoreML model (fruit/root), leafy/herbs dùng chung "root".
- dany.md viết tiếng Việt; diagram dùng PlantUML.
- Branch: `feature/f2t-ml-verify-thesis`. Mỗi leaf-task pass = 1 commit nhỏ `task(T1.x): ...` kèm `.handoff/`.

---

## File Structure

| File | Trách nhiệm |
|------|-------------|
| `docs/thesis/dany.md` | Bản convert + bản được sửa (1 nguồn sự thật cho Task 1). Output chính. |
| `docs/thesis/thesis_old.md` | Bản convert `thesis_A46489.docx` — tham khảo, KHÔNG tin, KHÔNG sửa. |
| `docs/thesis/dany.outline.md` | Outline trích từ dany.md (heading + dòng) — dùng để nở task. |
| `docs/thesis/dany.audit.md` | Bảng "claim sai → đúng theo code" + section-id → leaf-task mapping. |
| `.handoff/claims-ledger.md` | Nhóm mới "Task 1 — fact-check dany.md": entry cho mỗi claim sửa. |
| `.handoff/progress/task-1.md` | Nhật ký từng leaf-task. |
| `.handoff/task-tree.md` | Chỉ cập nhật bảng TASK 1 (status + nở T1.5…N). |

---

## Task T1.1: Convert dany.docx → dany.md

**Model:** haiku (cơ học). **Dep:** —

**Files:**
- Create: `docs/thesis/dany.md`

- [ ] **Step 1: Tạo thư mục đích**

```bash
mkdir -p /Users/macos/f2t/docs/thesis
```

- [ ] **Step 2: Convert bằng pandoc, giữ outline, tách media**

```bash
cd /Users/macos/f2t/docs/thesis && \
pandoc "/Users/macos/Downloads/dany.docx" \
  -f docx -t gfm --wrap=none \
  --extract-media=./dany_media \
  -o dany.md
```
Expected: tạo `dany.md` + thư mục `dany_media/` (nếu có ảnh). Không lỗi.

- [ ] **Step 3: Verify convert không rỗng + đếm heading**

```bash
cd /Users/macos/f2t/docs/thesis && wc -l dany.md && grep -cE '^#{1,6} ' dany.md
```
Expected: `dany.md` có nội dung (>50 dòng), số heading > 0. Nếu 0 heading → docx dùng style không chuẩn, ghi blocker vào progress.

- [ ] **Step 4: Ghi progress**

Ghi vào `.handoff/progress/task-1.md`: lệnh đã chạy, số dòng, số heading, có media không.

- [ ] **Step 5: Commit**

```bash
cd /Users/macos/f2t && git add docs/thesis/dany.md docs/thesis/dany_media .handoff/progress/task-1.md && \
git commit -m "task(T1.1): convert dany.docx -> docs/thesis/dany.md (pandoc, giữ outline)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task T1.2: Convert thesis_A46489.docx → thesis_old.md (tham khảo)

**Model:** haiku (cơ học). **Dep:** —

**Files:**
- Create: `docs/thesis/thesis_old.md`

- [ ] **Step 1: Convert**

```bash
cd /Users/macos/f2t/docs/thesis && \
pandoc "/Users/macos/Downloads/thesis_A46489.docx" \
  -f docx -t gfm --wrap=none \
  --extract-media=./thesis_old_media \
  -o thesis_old.md
```
Expected: tạo `thesis_old.md`, không lỗi.

- [ ] **Step 2: Verify không rỗng**

```bash
cd /Users/macos/f2t/docs/thesis && wc -l thesis_old.md
```
Expected: có nội dung.

- [ ] **Step 3: Thêm banner cảnh báo đầu file**

Chèn dòng đầu `thesis_old.md`: `> ⚠️ THAM KHẢO — chưa fact-check. KHÔNG trích trực tiếp vào dany.md mà chưa verify với code.`

- [ ] **Step 4: Commit**

```bash
cd /Users/macos/f2t && git add docs/thesis/thesis_old.md docs/thesis/thesis_old_media .handoff/progress/task-1.md && \
git commit -m "task(T1.2): convert thesis_A46489.docx -> thesis_old.md (tham khảo)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task T1.3: Trích outline dany.md

**Model:** haiku (cơ học). **Dep:** T1.1

**Files:**
- Create: `docs/thesis/dany.outline.md`

- [ ] **Step 1: Trích heading kèm số dòng**

```bash
cd /Users/macos/f2t/docs/thesis && \
grep -nE '^#{1,6} ' dany.md > dany.outline.raw.txt && cat dany.outline.raw.txt
```
Expected: danh sách `Lxx:### Heading`.

- [ ] **Step 2: Viết outline có cấu trúc**

Tạo `dany.outline.md`: liệt kê mỗi heading dạng `- [Hn] <tiêu đề> (dany.md:Lxx)`. Giữ NGUYÊN thứ tự và cấp heading (đây là outline phải bảo toàn, không đổi).

- [ ] **Step 3: Ghi progress + commit**

```bash
cd /Users/macos/f2t && git add docs/thesis/dany.outline.md .handoff/progress/task-1.md && \
git commit -m "task(T1.3): trích outline dany.md

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task T1.4: Audit toàn văn → bảng "claim sai → đúng theo code"

**Model:** sonnet (phán đoán nội dung). **Dep:** T1.3

Đây là task NỞ. Đọc toàn bộ `dany.md`, đối chiếu với codebase thật (dùng codegraph trước, đọc file sau), lập danh mục claim SAI. Các nghi phạm đã biết: **recommender system** (f2t KHÔNG có recommender — cần xác nhận), **kiến trúc QMIX cũ** (đã thay bằng DDQN `SharedMLPDuelingQNet` stateless — xem ledger `t0.2-ddqn-arch`), **sidecar DQN cũ**, mô tả ML lệch với 3 giới hạn ở `t0.10-thesis-limitations`.

**Files:**
- Create: `docs/thesis/dany.audit.md`
- Modify: `.handoff/task-tree.md` (nở T1.5…N)

- [ ] **Step 1: Đọc toàn văn dany.md theo outline**

Đọc `docs/thesis/dany.md` đầy đủ. Với mỗi section, ghi nhận claim kỹ thuật (CSDL / AI-ML / kiến trúc / luồng / diagram).

- [ ] **Step 2: Đối chiếu code (codegraph-first)**

Với mỗi claim kỹ thuật: dùng `codegraph_search`/`codegraph_context` để xác minh symbol/kiến trúc tồn tại đúng như mô tả. Nghi phạm trọng điểm:
- "recommender system" → `codegraph_search` tìm recommender/recommendation trong f2t-backend. Nếu không có → claim SAI.
- "QMIX" / multi-agent → kiến trúc thật là DDQN stateless 1 agent (ledger `t0.2-ddqn-arch`, `dynamic-pricing-final/src/rl/network.py:51-57`).
- mô tả forecaster/freshness → phải khớp 3 giới hạn `t0.10-thesis-limitations`.

- [ ] **Step 3: Viết bảng audit**

Tạo `docs/thesis/dany.audit.md` với cột: `section (dany.md:Lxx) | claim hiện tại (sai) | sự thật theo code (evidence file:Lxx / codegraph node) | mức ưu tiên (CSDL/AI-ML/diagram=cao) | leaf-task gán (T1.x)`.

- [ ] **Step 4: Nở task-tree**

Cập nhật bảng TASK 1 trong `.handoff/task-tree.md`: thêm dòng T1.5, T1.6, … mỗi dòng = 1 cụm section sai (theo bảng audit). Gom claim cùng section/chủ đề vào 1 leaf-task. Đánh dấu ⭐ cho leaf-task chạm CSDL/AI-ML/diagram.

- [ ] **Step 5: Ghi ledger + progress + commit**

Mỗi phát hiện audit "claim X sai vì code cho thấy Y" PHẢI có entry trong `.handoff/claims-ledger.md` nhóm "Task 1". Commit:

```bash
cd /Users/macos/f2t && git add docs/thesis/dany.audit.md .handoff/task-tree.md .handoff/claims-ledger.md .handoff/progress/task-1.md && \
git commit -m "task(T1.4): audit dany.md - bảng claim sai->đúng + nở T1.5..N

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task T1.5…N (ĐỘNG): Sửa từng section bám code

**Model:** sonnet. **Dep:** T1.4. **Số lượng:** xác định ở T1.4 (1 leaf-task = 1 cụm section sai).

> Mỗi leaf-task T1.x dưới đây theo CÙNG khuôn. Đây là khuôn lặp lại — áp cho mọi section sai trong `dany.audit.md`.

**Files (mỗi leaf-task):**
- Modify: `docs/thesis/dany.md` (chỉ section được gán)
- Modify: `.handoff/claims-ledger.md` (nhóm Task 1)
- Modify: `.handoff/progress/task-1.md`

- [ ] **Step 1: Ledger-first — thu thập evidence**

Trước khi sửa prose, với MỌI claim kỹ thuật trong section: ghi entry ledger `.handoff/claims-ledger.md` (format chuẩn: claim-id, Evidence `path:Lxx`/codegraph node/lệnh+output, Verified by, Dùng ở). KHÔNG viết prose trước evidence.

- [ ] **Step 2: Sửa section trong dany.md**

Sửa NỘI DUNG sai → đúng theo code, GIỮ NGUYÊN heading/outline. Mỗi câu kỹ thuật mang marker inline `[ref: path:Lxx]` hoặc codegraph node-id resolve được. Diagram dùng PlantUML bám code thật. Giữ tiếng Việt. Nếu chạm AI/ML → nhúng 3 giới hạn `t0.10-thesis-limitations` trung thực, không tô hồng.

- [ ] **Step 3: Verify đối kháng độc lập**

Dispatch subagent verify KHÁC subagent viết (sonnet), lệnh: "giả định mọi claim trong section sai cho tới khi resolve được citation; kiểm từng `[ref:]` mở ra đúng file:line; kiểm khớp 3 giới hạn ledger; có quyền REJECT". Verify ghi report vào progress.

- [ ] **Step 4: Done-gate + commit**

Chỉ `done` khi: đủ ledger entries + verify PASS. Nếu REJECT → ghi blocker progress, sửa, verify lại. Khi PASS:

```bash
cd /Users/macos/f2t && git add docs/thesis/dany.md .handoff/claims-ledger.md .handoff/progress/task-1.md .handoff/task-tree.md && \
git commit -m "task(T1.x): sửa section <tên> bám code (ledger+verify PASS)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task T1.V: Verify pass độc lập toàn văn

**Model:** sonnet. **Dep:** T1.5…N (tất cả done)

**Files:**
- Create: `docs/thesis/dany.verify-report.md`
- Modify: `.handoff/progress/task-1.md`, `.handoff/STATE.md` (chỉ mục "việc tiếp theo" = Task 2)

- [ ] **Step 1: Đối chiếu toàn văn ↔ ledger ↔ code**

Subagent độc lập đọc `dany.md` đã sửa + `dany.audit.md` + `claims-ledger.md`. Kiểm: (a) mọi claim sai trong audit đã được sửa; (b) mọi câu kỹ thuật có citation resolve được; (c) 3 giới hạn ledger xuất hiện đúng chỗ; (d) không còn recommender/QMIX/sidecar-cũ.

- [ ] **Step 2: Viết verify report**

Tạo `docs/thesis/dany.verify-report.md`: checklist PASS/FAIL từng mục audit + danh sách citation đã resolve. Mọi FAIL → tạo task sửa, KHÔNG đánh Task 1 done.

- [ ] **Step 3: Cập nhật STATE "việc tiếp theo" = Task 2 + commit**

```bash
cd /Users/macos/f2t && git add docs/thesis/dany.verify-report.md .handoff/ && \
git commit -m "task(T1.V): verify toàn văn dany.md PASS — Task 1 done

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Verification (end-to-end)

1. `docs/thesis/dany.md` tồn tại, giữ nguyên outline gốc (so với `dany.outline.md`), tiếng Việt.
2. `grep -nE 'recommender|QMIX|qmix' docs/thesis/dany.md` → rỗng (đã loại claim sai), hoặc chỉ xuất hiện trong ngữ cảnh "đã loại bỏ/không dùng".
3. Mỗi câu kỹ thuật trong `dany.md` có `[ref: ...]` resolve được tới file:line thật.
4. `dany.verify-report.md` toàn PASS.
5. 3 giới hạn `t0.10-thesis-limitations` hiện diện trung thực trong phần AI/ML.
6. `git log --oneline` cho thấy chuỗi commit `task(T1.1)…task(T1.V)` mỗi leaf-task 1 commit kèm `.handoff/`.

## Out of scope (YAGNI)
- KHÔNG retrain/sửa model, KHÔNG đụng `dynamic-pricing-final/`, forecaster, parquet, checkpoint.
- KHÔNG export docx/pdf (markdown là đầu ra chính).
- KHÔNG viết chương mới (đó là Task 2) — Task 1 chỉ SỬA nội dung sai, giữ outline.
- KHÔNG ghi `STATE.md`/`progress/task-0.md` phần Task 0 (session khác sở hữu).
</content>
</invoke>
