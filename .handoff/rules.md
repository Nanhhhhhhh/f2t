# rules.md — workflow, gate, enforcement

## Vòng đời 1 leaf-task (main agent điều phối)
```
đọc STATE.md → chọn leaf-task theo dependency → dispatch subagent (prompt tự chứa)
  → subagent làm + ghi progress/<id>.md → main agent VERIFY qua gate
  → PASS: cập nhật STATE + task-tree(done) + ledger → commit
  → FAIL: ghi blocker vào STATE, tạo task sửa, KHÔNG đánh done
```

## Model policy
- **sonnet 4.6** = mặc định cho subagent.
- **haiku 4.5** = chỉ task cơ học siêu nhỏ (convert, đọc 1 file ngắn, format).
- **skill `gemini`** = chỉ convert/grep-replace hàng loạt cơ học.
- Không bao giờ giao phán đoán nội dung cho gemini/haiku.

## Hai loại gate
- **Gate kỹ thuật (Task 0):** không `done` nếu thiếu bằng chứng runtime — log boot, response JSON thật, bảng so khớp dim/obs trỏ `file:Lxx`.
- **Gate fact-check (Task 1 & 2):** mỗi claim kỹ thuật phải có entry ledger. Phần **CSDL / AI-ML / diagram** kiểm 2 lớp: agent viết + agent verify *khác* (verify có quyền REJECT).

## Enforcement protocol (5 cơ chế — cốt lõi Tiêu chí #1)
1. **Prompt template bắt buộc** — nhúng giao thức vào MỌI dispatch (xem template dưới).
2. **Ledger-first** — evidence vào `claims-ledger.md` TRƯỚC, prose sau.
3. **Citation máy kiểm inline** — mỗi câu kỹ thuật mang `[ref: path:Lxx]` hoặc codegraph node-id resolve được. Câu kỹ thuật không citation = auto-reject. (Pass cuối có thể đổi inline → footnote.)
4. **Verify agent đối kháng** trên MỌI content task — agent khác agent viết, "giả định claim sai cho tới khi resolve được".
5. **Done-gate gắn artifact** — chỉ `done` khi đủ ledger entries + verify PASS report.

Task 0 dùng biến thể: citation = log/response runtime; verify đối kháng = chạy lại gate kỹ thuật độc lập.

## Luật granularity
1 leaf-task = tối đa 1 tiểu mục / 1 diagram / 1 cụm claim. Mỗi leaf-task kết thúc bằng ledger entry + 1 lượt verify độc lập trước khi `done`. Cây task của Task 1/2 nở động theo outline thật (T1.1/T2.1).

## Prompt template bắt buộc (copy vào mọi dispatch subagent)
```
[BỐI CẢNH] Dự án f2t, repo /Users/macos/f2t, branch feature/f2t-ml-verify-thesis.
Đọc trước: .handoff/rules.md (mục enforcement) nếu chưa rõ.
[NHIỆM VỤ] <mô tả 1 leaf-task duy nhất, tự chứa>
[FILE LIÊN QUAN] <đường dẫn tuyệt đối + dòng>
[BẰNG CHỨNG BẮT BUỘC] Ghi finding vào .handoff/progress/<id>.md. Mọi claim → .handoff/claims-ledger.md với file:Lxx / codegraph node / lệnh+output. Evidence TRƯỚC, kết luận sau.
[ĐỊNH NGHĨA DONE] <điều kiện pass cụ thể + output runtime/citation cần có>
[CẤM] Không claim done khi thiếu evidence. Không bịa nguồn. Không sửa ngoài phạm vi task.
```

## Quy ước commit
- Mỗi leaf-task pass → 1 commit nhỏ `task(<id>): <mô tả>`, kèm cập nhật `.handoff/`.
- `.handoff/` luôn commit cùng để state không lệch khỏi code.
