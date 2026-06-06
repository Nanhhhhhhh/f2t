# STATE — con trỏ sống

> Cập nhật mục "Việc tiếp theo" + commit TRƯỚC khi kết thúc mỗi phiên.

## Phase hiện tại
**Task 0 HOÀN TẤT ✅ (T0.1–T0.10). Sẵn sàng Task 1.**

- Spec: approved ✅ (`docs/superpowers/specs/2026-06-07-f2t-ml-verify-thesis-framework-design.md`)
- Plan Task 0: ✅ (`docs/superpowers/plans/2026-06-07-task0-ml-integration-verify.md`)
- `.handoff/`: ✅
- Branch: `feature/f2t-ml-verify-thesis`

### Kết quả Task 0 (1 dòng)
Sidecar phục vụ dynamic-pricing-final: **định giá `/predict` trung thực** (sau fix comp_ratio), **dự báo `/forecast` có giới hạn** (forecaster train↔serve mismatch, giữ nguyên theo user → document trong thesis), freshness OK. Backend gửi đủ 9 field. Code fix: `pricing-sidecar/main.py` comp_ratio. Test mới: `tests/test_smoke_load.py`, `tests/test_coreml_freshness.py`.

## Việc tiếp theo
Bắt đầu **Task 1** (T1.1: convert `~/Downloads/dany.docx` → `docs/thesis/dany.md` bằng pandoc, giữ outline). Xem plan: cần viết plan Task 1 (chưa có — mới có plan Task 0). Đề xuất: dùng writing-plans cho Task 1, hoặc dispatch T1.1/T1.2 (convert, cơ học) trước rồi audit. Nhớ: 3 giới hạn ở ledger `t0.10-thesis-limitations` PHẢI vào thesis.

## Task đang mở
- Task 0: ✅ done toàn bộ.
- Task 1, 2: chưa bắt đầu (phiên sau).

## T0.9 fix-backlog — ĐÃ XỬ LÝ (xem progress T0.9)
- #1 comp_ratio: ✅ ĐÃ SỬA code (main.py:108-112) khớp env.
- #2 forecaster: ⏸️ GIỮ NGUYÊN theo user → document giới hạn ở thesis (T0.10).
- #3 dim1/5/9: ✅ đã chốt khớp (T0.7), không cần fix.
- #4 RGB/BGR: ✅ DOCUMENT-ONLY — model train RGB, coremltools không swap; `.convert("RGB")` đúng (evidence: BGR-swap→fresh 0.16 sai).
- #5 dow: ✅ DOCUMENT-ONLY — demand seasonality tuần biên độ <±3.1%, lệch pha lành tính.

### (lịch sử backlog gốc)
1. **[obs dim7 comp_ratio] NGHIÊM TRỌNG** — sidecar chia `base_price`, env chia giá hiện hành. Fix: `competitor_ref_price / (base_price * (1 + prev_delta))` (main.py:108). Evidence: market_env.py:134 vs main.py:108.
2. **[obs dim2/3 dow] lệch pha** — sidecar `datetime.now().weekday()` vs env `self._t % 7`. Cần quyết: bỏ tín hiệu dow ở serve, hay map lại pha. Evidence: market_env.py:132 vs main.py:98.
3. ~~[obs dim1/5/9] phụ thuộc backend~~ **ĐÃ CHỐT (T0.7):** dim1 `inventory_ratio` khớp y hệt env (`availableQuantity/100`, dynamic-pricing.service.ts:228). dim5/9 công thức khớp; chỉ giá trị `demand_7d` (=forecast.demand7d, service.ts:274) không tin được vì forecaster lệch → quy về #4. KHÔNG cần fix riêng dim1/5/9.

4. **[forecaster] LỆCH NẶNG (xác nhận parquet + checkpoint)** — checkpoint `forecaster_v4_best.pt` obs_dim=**11** (lstm ih_l0=[512,11]), train trên layout env CŨ: env-10 + 1 chiều thừa (price-ratio, range 0.47-1.48) chèn ở **index 2**. Sidecar build obs-10 layout MỚI rồi pad 0 ở CUỐI (main.py:130) → lệch vị trí từ index2, index10=0. Cộng tile-21× (main.py:131) xoá temporal. → `/forecast` không tin cậy. Giảm nhẹ: forecaster KHÔNG ảnh hưởng `/predict`. Fix khả thi: (a) reconstruct chiều index2 + cung cấp chuỗi 21 ngày thật (cần backend lưu lịch sử) — KHÔNG retrain; hoặc (b) retrain forecaster trên env-10 hiện tại (VƯỢT scope, cần user duyệt); hoặc (c) chấp nhận `/forecast` là xấp xỉ + ghi rõ giới hạn trong thesis. → CẦN USER QUYẾT ở T0.9/kết luận.

5. **[CoreML RGB/BGR] mức trung bình** — 2 model freshness khai báo input colorSpace=BGR (raw enum 30, đã xác nhận), nhưng sidecar `main.py:320` làm `.convert("RGB")` trước predict → có thể hoán đổi kênh R↔B, giảm độ chính xác phân loại tươi/héo. Fix: đổi sang `.convert("RGB")`→ feed BGR, hoặc xác minh coremltools tự xử lý. Evidence: get_spec colorSpace=30 vs main.py:320.

## Blocker
Không có (nhưng forecaster fix hướng (b) cần user quyết).

## Ghi chú nhanh
- sidecar venv: `/Users/macos/f2t/pricing-sidecar/.venv/bin/python` (3.13)
- Boot sidecar: `cd /Users/macos/f2t/pricing-sidecar && .venv/bin/python -m uvicorn main:app --port 8000`
- Rủi ro cao nhất: obs parity (T0.3) + forecaster parity (T0.4) + backend payload (T0.7).
- ⚠️ T0.2 phát hiện: `ForecasterConfig.obs_dim` default=11 (model.py:9) vs DDQN obs=10. Sidecar pad/slice obs 10→forecaster_obs_dim (main.py:130). T0.4/T0.5 PHẢI kiểm obs_dim thật trong `forecaster_v4_best.pt["model_cfg"]` — nếu =11 thì sidecar đang pad 1 chiều zero, nghi vấn lệch train↔serve.
