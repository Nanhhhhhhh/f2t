# claims-ledger.md — sổ cái bằng chứng

Mọi claim kỹ thuật dùng cho thesis (hoặc kết luận Task 0) phải có 1 entry ở đây TRƯỚC khi viết prose. Format:

```
### <claim-id>: <phát biểu ngắn>
- **Evidence:** `path:Lxx` | codegraph node `<id>` | lệnh + output
- **Verified by:** <agent/lượt verify> — <ngày>
- **Dùng ở:** <section thesis / kết luận task>
```

---

## Nhóm: Kiến trúc ML (sẽ nạp dần trong Task 0)

### t0.1-copy-fidelity: dynamic-pricing-final copy đầy đủ từ dynamic-pricing-v3
- **Evidence:** `diff -qr /Users/macos/dynamic-pricing-v3/src /Users/macos/f2t/dynamic-pricing-final/src -x '__pycache__' -x '*.pyc'` — chỉ 1 dòng khác biệt thực chất: `from __future__ import annotations` thêm vào đầu `src/rl/network.py` (final có, v3 không có); 3/4 file ML lõi (model.py, reward.py, market_env.py) identical; tests/, requirements.txt identical. Docs viz HTML và architecture MD không được copy (only-v3) nhưng không ảnh hưởng runtime. Output diff đầy đủ ghi tại `progress/task-0.md` mục T0.1.
- **Verified by:** implementer T0.1 — 2026-06-07
- **Dùng ở:** kết luận Task 0

> (Còn thiếu — T0.2/T0.10 sẽ nạp: SharedMLPDuelingQNet, ForecasterLSTM, obs 10 chiều + công thức, CoreML 2 loại, luồng backend→sidecar.)

## Nhóm: Thiết kế CSDL

> (Trống — Task 2 nạp từ schema thật trong f2t-backend.)

## Nhóm: Luồng nghiệp vụ / diagram

> (Trống — Task 2 nạp khi dựng PlantUML.)
