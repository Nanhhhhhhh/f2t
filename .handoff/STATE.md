# STATE — con trỏ sống

> Cập nhật mục "Việc tiếp theo" + commit TRƯỚC khi kết thúc mỗi phiên.

## Phase hiện tại
**Framework đã thiết lập. Sắp bắt đầu thực thi Task 0.**

- Spec: approved ✅ (`docs/superpowers/specs/2026-06-07-f2t-ml-verify-thesis-framework-design.md`)
- Plan Task 0: viết xong ✅ (`docs/superpowers/plans/2026-06-07-task0-ml-integration-verify.md`)
- `.handoff/`: khởi tạo xong ✅
- Branch: `feature/f2t-ml-verify-thesis`

## Việc tiếp theo
Bắt đầu **T0.1** (diff `/Users/macos/dynamic-pricing-v3` ↔ `f2t/dynamic-pricing-final`) theo plan. Chế độ thực thi (subagent-driven vs inline) đang chờ user chọn.

## Task đang mở
- Task 0: chưa bắt đầu leaf-task nào (T0.1–T0.10 = pending).
- Task 1, 2: chưa tới (phiên sau).

## Blocker
Không có.

## Ghi chú nhanh
- sidecar venv: `/Users/macos/f2t/pricing-sidecar/.venv/bin/python` (3.13)
- Boot sidecar: `cd /Users/macos/f2t/pricing-sidecar && .venv/bin/python -m uvicorn main:app --port 8000`
- Rủi ro cao nhất: obs parity (T0.3) + forecaster parity (T0.4) + backend payload (T0.7).
