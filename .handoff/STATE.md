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

## T0.9 fix-backlog (lỗi phát hiện, sửa ở T0.9)
1. **[obs dim7 comp_ratio] NGHIÊM TRỌNG** — sidecar chia `base_price`, env chia giá hiện hành. Fix: `competitor_ref_price / (base_price * (1 + prev_delta))` (main.py:108). Evidence: market_env.py:134 vs main.py:108.
2. **[obs dim2/3 dow] lệch pha** — sidecar `datetime.now().weekday()` vs env `self._t % 7`. Cần quyết: bỏ tín hiệu dow ở serve, hay map lại pha. Evidence: market_env.py:132 vs main.py:98.
3. **[obs dim1/5/9] phụ thuộc backend** — ngữ nghĩa `inventory_ratio` (=inv/100?), `demand_7d` (tổng 7 ngày hay TB ngày?) phải khớp env (`inv/100`, `demand_yesterday`, `demand_yesterday*7`). Chốt sau T0.7 rồi sửa nếu lệch.

## Blocker
Không có.

## Ghi chú nhanh
- sidecar venv: `/Users/macos/f2t/pricing-sidecar/.venv/bin/python` (3.13)
- Boot sidecar: `cd /Users/macos/f2t/pricing-sidecar && .venv/bin/python -m uvicorn main:app --port 8000`
- Rủi ro cao nhất: obs parity (T0.3) + forecaster parity (T0.4) + backend payload (T0.7).
- ⚠️ T0.2 phát hiện: `ForecasterConfig.obs_dim` default=11 (model.py:9) vs DDQN obs=10. Sidecar pad/slice obs 10→forecaster_obs_dim (main.py:130). T0.4/T0.5 PHẢI kiểm obs_dim thật trong `forecaster_v4_best.pt["model_cfg"]` — nếu =11 thì sidecar đang pad 1 chiều zero, nghi vấn lệch train↔serve.
