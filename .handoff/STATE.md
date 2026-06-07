# STATE — con trỏ sống

> Cập nhật mục "Việc tiếp theo" + commit TRƯỚC khi kết thúc mỗi phiên.

## Phase hiện tại
**Task 0 ✅ DONE (gồm addendum retrain T0.11–T0.13) + Task 1 ✅ DONE. Việc tiếp theo = TASK 2.**

> Cập nhật 2026-06-07: forecaster đã retrain obs_dim=10 (T0.13, checkpoint model_cfg obs_dim=10) — layout mismatch 11≠10 HẾT, chỉ còn giới hạn serve tile-21×. Task 1 đã convert+fact-check `docs/thesis/dany.md` trung thực 100% với code (xem `docs/thesis/dany.verify-report.md`).

### (Lịch sử) Task 0 addendum retrain — đã xong
- Quyết định: retrain forecaster trên env-10 hiện tại (fix layout 11≠10 + version skew). Tiling-21× VẪN còn (cần backend history → document). Freshness leafy/herbs + dow KHÔNG fix được (thiếu data / vô nghĩa).
- Backup an toàn: `dynamic-pricing-final/_backup_obs11/` (checkpoint + parquet obs11) — KHÔNG commit, để revert.
- T0.11 regen data: ĐANG CHẠY (scripts/generate_data.py, venv sidecar, cwd=dynamic-pricing-final, log $CLAUDE_JOB_DIR/tmp/gendata.log).
- T0.12 retrain: chờ data. `scripts/retrain.py` (obs_dim=OBS_DIM=10, max_epochs=100 patience=8, MPS).
- T0.13: validate + sidecar auto-load obs_dim=10 (hết pad lệch) + re-run integration.

(Task 0 core T0.1–T0.10 đã xong trước đó — xem dưới.)

## Phase trước (đã xong)
**Task 0 core HOÀN TẤT ✅ (T0.1–T0.10).**

- Spec: approved ✅ (`docs/superpowers/specs/2026-06-07-f2t-ml-verify-thesis-framework-design.md`)
- Plan Task 0: ✅ (`docs/superpowers/plans/2026-06-07-task0-ml-integration-verify.md`)
- `.handoff/`: ✅
- Branch: `feature/f2t-ml-verify-thesis`

### Kết quả Task 0 (1 dòng)
Sidecar phục vụ dynamic-pricing-final: **định giá `/predict` trung thực** (sau fix comp_ratio), **dự báo `/forecast` có giới hạn** (forecaster train↔serve mismatch, giữ nguyên theo user → document trong thesis), freshness OK. Backend gửi đủ 9 field. Code fix: `pricing-sidecar/main.py` comp_ratio. Test mới: `tests/test_smoke_load.py`, `tests/test_coreml_freshness.py`.

## Việc tiếp theo
Bắt đầu **TASK 2** — viết khoá luận hoàn chỉnh từ `docs/thesis/dany.md` (đã fact-check ở Task 1). Quy trình: writing-plans cho Task 2 → subagent-driven-development. Bắt đầu T2.1 (dàn ý đầy đủ từ dany.md), T2.2 (fact-pack CSDL/AI-ML/luồng → ledger), T2.3 (diagram PlantUML), rồi nở T2.4…N viết từng chương + fact-check, cuối cùng T2.V verify toàn văn.
- INPUT chính: `docs/thesis/dany.md` (dàn-ý đã đúng + citation inline), `docs/thesis/dany.audit.md`, `docs/thesis/dany.verify-report.md`, `.handoff/claims-ledger.md` (tái dùng evidence).
- BẮT BUỘC giữ 3 giới hạn `t0.10-thesis-limitations` (forecaster tile-21× steady-state [obs_dim=10, KHÔNG còn layout mismatch], dow <6.2%, freshness 2/4 model).
- Ràng buộc: chân thực 100% với code; ưu tiên CSDL/AI-ML/diagram; tiếng Việt; diagram PlantUML; KHÔNG đụng dynamic-pricing-final/ (chỉ đọc).

## Task đang mở
- Task 0: ✅ done toàn bộ (gồm retrain obs_dim=10).
- Task 1: ✅ done toàn bộ (T1.1–T1.V + sync post-retrain). dany.md trung thực với code.
- Task 2: ⏳ chưa bắt đầu — là việc tiếp theo.

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
