# ONBOARDING — đọc file này ĐẦU TIÊN

Bạn (agent) vừa vào dự án **f2t**. Dự án dùng framework `.handoff/` để truyền tiến độ giữa các session/agent/account. Đừng bắt đầu làm gì cho tới khi đọc xong theo thứ tự dưới.

## 3 LUẬT VÀNG (bất di bất dịch)
1. **Không claim `done` khi thiếu bằng chứng.** Task kỹ thuật cần output runtime; task thesis cần citation resolve được.
2. **Mọi claim thesis phải vào `claims-ledger.md`** với evidence `file:Lxx` / codegraph node / lệnh+output, TRƯỚC khi viết prose.
3. **Cập nhật `STATE.md` trước khi kết thúc phiên** (mục "việc tiếp theo") rồi commit, để agent sau bắt tiếp tức thì.

## Thứ tự đọc bắt buộc
1. `ONBOARDING.md` (file này)
2. `STATE.md` — đang ở đâu, việc tiếp theo là gì, có blocker không
3. `rules.md` — workflow, gate, model policy, enforcement protocol, prompt template
4. `task-tree.md` — cây task nhỏ + trạng thái + dependency
5. `progress/<task đang làm>.md` — nhật ký chi tiết task hiện tại

## Bối cảnh 30 giây
3 task lớn: **(0)** verify ML integration (sidecar ↔ dynamic-pricing-final), **(1)** convert `dany.docx`→`dany.md` sửa nội dung sai theo code, **(2)** viết khoá luận hoàn chỉnh từ dany.md. **Tiêu chí #1: chân thực 100% với codebase**, ưu tiên tuyệt đối CSDL/AI-ML/diagram.

- Spec: `docs/superpowers/specs/2026-06-07-f2t-ml-verify-thesis-framework-design.md`
- Plan Task 0: `docs/superpowers/plans/2026-06-07-task0-ml-integration-verify.md`
- Branch làm việc: `feature/f2t-ml-verify-thesis`

## Model policy (nhắc nhanh)
sonnet 4.6 = mặc định subagent. haiku 4.5 = chỉ task cơ học siêu nhỏ. skill `gemini` = chỉ convert/grep-replace hàng loạt cơ học. Không giao phán đoán nội dung cho gemini/haiku.
