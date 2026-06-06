# progress/task-0.md — Verify ML integration

Nhật ký chi tiết từng leaf-task. Mỗi leaf-task: việc đã làm, lệnh chạy, output thật, kết luận (khớp/lệch), commit hash.

---

## T0.1 — Diff v3 ↔ final

**Ngày chạy:** 2026-06-07  
**Lệnh chính:**
```
diff -qr /Users/macos/dynamic-pricing-v3/src /Users/macos/f2t/dynamic-pricing-final/src -x '__pycache__' -x '*.pyc'
diff -qr .../preprocessing  (+ -x '*.pt' -x '*.npy' -x '*.parquet')
diff -qr .../scripts        (+ -x '*.pt' -x '*.npy' -x '*.parquet')
diff -qr .../tests          (+ -x '*.pt' -x '*.npy' -x '*.parquet')
diff -qr .../data           (+ -x '*.pt' -x '*.npy' -x '*.parquet')
diff -qr .../docs
diff requirements.txt
```

### Bảng kết quả

| File / thư mục | Trạng thái | Kết luận |
|---|---|---|
| `src/` (toàn bộ trừ network.py) | identical | Copy đầy đủ |
| `src/rl/network.py` | diff | Xem chi tiết bên dưới — cố ý, không phải bug |
| `src/forecaster/model.py` | identical | Copy đầy đủ |
| `src/rl/reward.py` | identical | Copy đầy đủ |
| `src/env/market_env.py` | identical | Copy đầy đủ |
| `preprocessing/` | only-final: `causal_data.csv` | File CSV thêm vào final; v3 không có — không ảnh hưởng ML core |
| `scripts/` | only-final: `create_test_checkpoints.py` | Script tiện ích thêm vào final cho test — không phải thiếu từ v3 |
| `tests/` | identical | Copy đầy đủ |
| `data/` | only-v3: `.DS_Store` | macOS metadata — bỏ qua |
| `docs/` | only-v3: `dqn-ddqn-architecture.md`, `docs/viz/` (5 HTML) | Tài liệu viz không copy sang final — không ảnh hưởng tính năng |
| `requirements.txt` | identical | Copy đầy đủ |

### Output diff thực tế — src/

```
Only in /Users/macos/dynamic-pricing-v3/src: .DS_Store
Files /Users/macos/dynamic-pricing-v3/src/rl/network.py and /Users/macos/f2t/dynamic-pricing-final/src/rl/network.py differ
```

### Chi tiết diff `src/rl/network.py`

```diff
0a1,2
> from __future__ import annotations
>
```

- **Khác biệt:** `dynamic-pricing-final/src/rl/network.py` có thêm 2 dòng đầu: `from __future__ import annotations` + dòng trống.
- v3: 79 dòng; final: 81 dòng (diff chỉ 2 dòng đầu).
- **Đánh giá:** Cố ý (backward-compat annotation import thường được thêm để tương thích Python 3.9 với type hints). Không thay đổi logic, không phải bug copy.

### Output diff 4 file lõi

```
===== src/rl/network.py =====
0a1,2
> from __future__ import annotations
>
(exit 1 — files differ)

===== src/forecaster/model.py =====
(no output — identical)

===== src/rl/reward.py =====
(no output — identical)

===== src/env/market_env.py =====
(no output — identical)
```

### Kết luận tổng

- **3 trong 4 file ML lõi:** `identical` (model.py, reward.py, market_env.py).
- **1 file khác biệt:** `src/rl/network.py` — chỉ thêm `from __future__ import annotations` ở đầu file, không thay đổi logic/kiến trúc.
- **Không có file nào `only-v3` trong `src/`** (tức là không thiếu gì từ copy ML core).
- **Tệp `only-final`** (`causal_data.csv`, `create_test_checkpoints.py`) là bổ sung cho môi trường final, không phải thiếu sót.
- **Tệp `only-v3`** trong `docs/` (viz HTML, architecture MD) là tài liệu, không ảnh hưởng runtime.
- **Kết luận: dynamic-pricing-final copy đầy đủ từ dynamic-pricing-v3.** Khác biệt duy nhất ở ML code là `from __future__ import annotations` trong network.py — cố ý, không phải bug.

## T0.2 — Verify model defs
_(chưa bắt đầu)_

## T0.3 ⭐ — Obs parity
_(chưa bắt đầu)_

## T0.4 ⭐ — Forecaster parity
_(chưa bắt đầu)_

## T0.5 — Smoke-load checkpoint
_(chưa bắt đầu)_

## T0.6 — CoreML freshness
_(chưa bắt đầu)_

## T0.7 ⭐ — Backend payload
_(chưa bắt đầu)_

## T0.8 — Integration test
_(chưa bắt đầu)_

## T0.9 — Fix gaps
_(chưa bắt đầu)_

## T0.10 — Kết luận + nạp ledger
_(chưa bắt đầu)_
