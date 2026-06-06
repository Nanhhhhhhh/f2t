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

### t0.2-ddqn-arch: SharedMLPDuelingQNet signature + cấu hình (obs_dim=10, n_cats=4, embed=8, hidden=128, n_actions=11)
- **Evidence:** `dynamic-pricing-final/src/rl/network.py:51-57` — `__init__(obs_dim=10, n_cats=4, cat_embed_dim=8, hidden=128, n_actions=11)`; `network.py:68-73` — `forward(obs, cat_ids, mask) -> Tensor (B, n_actions)`; sidecar khởi tạo tại `pricing-sidecar/main.py:151-153` với cùng 5 tham số literal; gọi inference `main.py:293` dưới dạng `ddqn_net(obs_t, cat_t, mask_t)`.
- **Verified by:** implementer T0.2 — 2026-06-07
- **Dùng ở:** thesis section AI/ML — kiến trúc DDQN

### t0.2-forecaster-arch: ForecasterLSTM.forward trả {demand, waste_logit}; ForecasterConfig.obs_dim tồn tại
- **Evidence:** `dynamic-pricing-final/src/forecaster/model.py:46-49` — `return {"demand": self.demand_head(z).squeeze(-1), "waste_logit": self.waste_head(z).squeeze(-1)}`; `model.py:8-9` — `@dataclass class ForecasterConfig: obs_dim: int = 11` (field đầu tiên); sidecar đọc `cfg.obs_dim` tại `main.py:167` sau khi load checkpoint; sidecar dùng `out["demand"]` và `out["waste_logit"]` tại `main.py:136-137`. ForecasterConfig.obs_dim default=11 nhưng giá trị runtime lấy từ checkpoint dict.
- **Verified by:** implementer T0.2 — 2026-06-07
- **Dùng ở:** thesis section AI/ML — kiến trúc Forecaster LSTM

### t0.2-action-space: CANDIDATES (11 phần tử, delta -0.30→+0.20); compute_mask trả (11,) bool
- **Evidence:** `dynamic-pricing-final/src/rl/reward.py:6-7` — `CANDIDATES = np.linspace(-0.30, 0.20, 11); CANDIDATES[6] = 0.0`; giá trị thực: `[-0.30, -0.25, -0.20, -0.15, -0.10, -0.05, 0.0, 0.05, 0.10, 0.15, 0.20]` (11 phần tử, bước 0.05); `reward.py:61` — `mask = np.ones(11, dtype=bool)` → shape (11,); sidecar dùng tại `main.py:289` `compute_mask(sv.freshness, sv.category)` và `main.py:296` `delta = float(CANDIDATES[action_idx])`. `len(CANDIDATES)==11 == N_ACTIONS`.
- **Verified by:** implementer T0.2 — 2026-06-07
- **Dùng ở:** thesis section AI/ML — không gian hành động, chiến lược định giá

### t0.3-obs-parity: Obs 10 chiều sidecar vs env — 1 lệch nghiêm trọng (chiều 7), 2 lệch tiềm ẩn (chiều 2/3, chiều 9); hằng số khớp 100%
- **Evidence:**
  - Sidecar `_build_obs`: `pricing-sidecar/main.py:88-121` — vector 10 chiều, hằng số tại `main.py:77-79`
  - Env `_build_obs`: `dynamic-pricing-final/src/env/market_env.py:125-158` — vector 10 chiều
  - Hằng số env: `dynamic-pricing-final/src/env/freshness.py:4,7-12` (WASTE_THRESHOLD=0.50, DAILY_DECAY 4 cat); `dynamic-pricing-final/data/params/demand_params.json` (base_demand 4 cat)
  - **Chiều 0–5, 8:** công thức và hằng số KHỚP hoàn toàn
  - **Chiều 6 (prev_delta):** lệch thiết kế vô hại — env không clip, sidecar clip [-0.30,0.20]; trong thực tế delta luôn ∈ CANDIDATES ⊂ [-0.30,0.20]
  - **Chiều 7 (comp_ratio) — LỆCH NGHIÊM TRỌNG:** env tính `comp_prices / max(current_price, 1e-6)` (`market_env.py:134`) — chia cho giá hiện tại đã điều chỉnh delta; sidecar tính `competitor_ref_price / base_price` (`main.py:108`) — chia cho base_price cố định. Khi delta≠0 (phần lớn quyết định thực tế), hai giá trị khác nhau, mô hình nhận tín hiệu cạnh tranh sai
  - **Chiều 2&3 (sin/cos dow) — LỆCH TIỀM ẨN:** env dùng `self._t % 7` (`market_env.py:132`); sidecar dùng `datetime.now().weekday()` (`main.py:98`). Offset thời gian tuần hoàn không đảm bảo đồng pha với lúc train
  - **Chiều 9 (inv_coverage) — LỆCH TIỀM ẨN:** env mẫu số `demand_yesterday * 7` (`market_env.py:144`); sidecar mẫu số `demand_7d` (`main.py:107`) — ngữ nghĩa phụ thuộc caller; cần xác minh T0.7
  - **Hằng số DAILY_DECAY, BASE_DEMAND, WASTE_THRESHOLD:** tất cả 9 giá trị KHỚP hoàn toàn (xác minh qua freshness.py + demand_params.json)
- **Verified by:** implementer T0.3 — 2026-06-07
- **Dùng ở:** kết luận Task 0; thesis section AI/ML — train↔serve parity

> (Còn thiếu — T0.4–T0.10 sẽ nạp: forecaster parity, CoreML 2 loại, luồng backend→sidecar.)

## Nhóm: Thiết kế CSDL

> (Trống — Task 2 nạp từ schema thật trong f2t-backend.)

## Nhóm: Luồng nghiệp vụ / diagram

> (Trống — Task 2 nạp khi dựng PlantUML.)
