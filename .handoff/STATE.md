# STATE — con trỏ sống

> Cập nhật mục "Việc tiếp theo" + commit TRƯỚC khi kết thúc mỗi phiên.

## Phase hiện tại
**Task 0 ✅ DONE + Task 1 ✅ DONE. TASK 2 ĐANG CHẠY — đã xong nền tảng + Chương 1 + Chương 2; việc tiếp theo = CHƯƠNG 3 (T2.12).**

> Cập nhật 2026-06-07 (phiên Task 2 #1): đã chạy writing-plans (plan: `docs/superpowers/plans/2026-06-07-task2-thesis-full-prose.md`) + subagent-driven-development. Đầu ra ở `docs/thesis/final/` (chia chương). ĐÃ XONG: T2.1 skeleton+STRUCTURE.md, T2.2 fact-pack ledger (5 entry nhóm Task 2), T2.3 23 diagram PlantUML (verify đối kháng PASS), T2.4-T2.5 Chương 1 (verify PASS), T2.6-T2.11 Chương 2 (verify PASS, §2.4 AI/ML resolve source 2 lần). 5 commit (eb7765d→c05f50c).

> (Nền cũ) forecaster đã retrain obs_dim=10 (T0.13) — layout mismatch 11≠10 HẾT, chỉ còn giới hạn serve tile-21×. `docs/thesis/dany.md` = dàn ý đã fact-check 100% (NGUỒN nội dung Task 2).

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
Tiếp tục **TASK 2** tại **CHƯƠNG 3** (file `docs/thesis/final/chuong-3-phan-tich-thiet-ke.md`, hiện CÒN NGUYÊN skeleton comment). Theo plan `docs/superpowers/plans/2026-06-07-task2-thesis-full-prose.md`, dùng subagent-driven-development (implementer sonnet → verifier đối kháng độc lập → commit nhỏ). Chia 4 dispatch TUẦN TỰ (cùng 1 file, EDIT đúng cụm mục, tránh xung đột ghi):
1. **T2.12-T2.16** §3.1, §3.2, §3.3.1-§3.3.6 (nghiệp vụ + kiến trúc + UC + mô tả 9 SD + 4 AD, tham chiếu các Hình .puml đã có). (Prompt dispatch này ĐÃ SOẠN sẵn — xem `.handoff/progress/task-2.md` mục "NEXT: prompt T2.12-T2.16" nếu muốn tái dùng.)
2. **T2.17-T2.19** §3.3.7(a/b/c) AI/ML ⭐2-lớp (ForecasterLSTM obs_dim=10+giới hạn tile-21×; DDQN state10/11action/hyperparam/Safety 5 rule 3→4→1→2→5; CoreML 2 model+giới hạn 2/4).
3. **T2.20-T2.21** §3.4 CSDL ⭐2-lớp (ERD + 10 collection chi tiết + index — resolve 10 schema file; tham chiếu `diagrams/erd.puml`).
4. **T2.22** §3.5 giao diện (Consumer KHÔNG "xem gợi ý"; Farm GIỮ "gợi ý giá"/"quét tươi" THẬT).
Sau Chương 3 → Chương 4 (T2.23-T2.28) → Chương 5+TLTK (T2.29-T2.30) → **T2.V verify toàn văn** (ghi `docs/thesis/final/VERIFY-REPORT.md`).

- INPUT chính: `docs/thesis/dany.md` (dàn-ý đã đúng + citation inline — NGUỒN nội dung), `docs/thesis/final/STRUCTURE.md` (hợp đồng cấu trúc + số liệu canonical + 3 giới hạn), `.handoff/claims-ledger.md` (20 entry — TÁI DÙNG, đừng verify lại cái đã có).
- BẮT BUỘC giữ 3 giới hạn `t0.10-thesis-limitations` (forecaster tile-21× steady-state [obs_dim=10, KHÔNG còn layout mismatch], dow <6.2%, freshness 2/4 model) — xuất hiện ở §5.2 + nhắc §3.3.7a/§4.4.2.
- Ràng buộc: chân thực 100% với code; ưu tiên CSDL/AI-ML/diagram (2-lớp verify); tiếng Việt; mỗi câu kỹ thuật mang citation resolve được; KHÔNG đụng dynamic-pricing-final/, pricing-sidecar/, freshnessmodels/ (chỉ đọc).

## Task đang mở
- Task 0: ✅ done toàn bộ (gồm retrain obs_dim=10).
- Task 1: ✅ done toàn bộ (T1.1–T1.V + sync post-retrain). dany.md trung thực với code.
- Task 2: 🔄 ĐANG CHẠY. Done: T2.1, T2.2, T2.3(a-g), T2.4-T2.5 (Ch1), T2.6-T2.11 (Ch2). Tiếp theo: T2.12 (Ch3) → … → T2.V.

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
