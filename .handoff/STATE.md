# STATE — con trỏ sống

> Cập nhật mục "Việc tiếp theo" + commit TRƯỚC khi kết thúc mỗi phiên.

## Phase hiện tại
**Task 0 ✅ DONE + Task 1 ✅ DONE + TASK 2 ✅ DONE + TASK 3 ✅ DONE (2026-06-09). Thesis đồng bộ với codebase mới: 15 module / 2 sidecar / 4 AI function / 12 collection / 92 endpoint / 56 màn hình. Mọi chương đã update: cross-sell FP-Growth (§2.4.4/§3.3.7d/§3.3.9/§4.4.6), Reviews (§3.3.8/§3.4/§3.5), Auth password reset, Admin enhance. 8 HẠN CHẾ BẮT BUỘC §5.2. VERIFY-REPORT.md PASS (V1-V6).**

> Cập nhật 2026-06-09 (phiên Task 3 — ĐÓNG TASK 3): cập nhật thesis từ 57 commit main sau feature/f2t-ml-verify-thesis. Subagent-Driven Development (T3.0→T3.19):
> - **T3.0** claims-ledger.md — 6 entry mới (cross-sell-v1, t1.4-no-recommender LỊCH SỬ, reviews-v1, auth-reset-v1, admin-v2, numbers-v3).
> - **T3.1** STRUCTURE.md — số canonical mới (15/2/4/92/24/78/56/12).
> - **T3.2 ⭐** §2.4.4 FP-Growth theory + scope fix §2.1.2/§2.5/§2.6 (4 AI functions, xóa t1.4-no-recommender). Verify 2-lớp PASS (7/7).
> - **T3.3** Sweep "no recommender" Ch3/4/5 — 10 chỗ scoped → cross-sell cat-level; §5.3 tương lai giữ nguyên.
> - **T3.4** §3.3.1 — 15 module (+recommendations/reviews), 2 sidecar (+recommender-sidecar :8001), auth reset.
> - **T3.5** §3.3.3 — UC-ML-03 cross-sell + UC-RV-01 review với line citations thật.
> - **T3.6** §3.3.8 Reviews module — schema table 9 trường, 4 endpoint, averageRating/reviewCount.
> - **T3.7** §3.3.9 Recommendations module — controller/service pipeline 4 bước/sidecar/frontend.
> - **T3.8 ⭐** §3.3.7d cross-sell FP-Growth design + sd-cross-sell.puml. Verify 2-lớp PASS (6/6).
> - **T3.9 ⭐** §3.4 CSDL — +reviews (8 field/2 index) + password_reset_tokens (TTL) + product rating fields; 12 collection. Verify 2-lớp PASS (4/4).
> - **T3.10-T3.12** §3.5 UI + §4.3 testing + §4.4.1 overview (78/24/92/56/12/15/2).
> - **T3.13 ⭐** §4.4.6 cross-sell eval — Bảng 4.13-4.15 (thống kê mô tả thật; 0 precision bịa). Verify 2-lớp PASS (5/5).
> - **T3.14-T3.17** §5.1/5.2/5.3 + TLTK [36][37] + mục lục + Ch1 numbers.
> - **T3.18 ⭐** VERIFY toàn văn V1-V6 PASS — 0 false-claim, 0 stale number, 8 HẠN CHẾ BẮT BUỘC, Bảng tái đánh số 4.11-4.15. Fix 3 rounds (Ch2/Ch1/Ch5/4 diagrams).
> - **T3.19** .handoff/ cập nhật (phiên này).
> Branch: feature/f2t-thesis-merge-main. KHÔNG đụng feature/f2t-ml-verify-thesis.

> Cập nhật 2026-06-08 (phiên Task 2 #4 — ĐÓNG TASK 2): hoàn tất CHƯƠNG 5 + TLTK + VERIFY TOÀN VĂN bằng subagent-driven-development:
> - **T2.29** Chương 5 (`chuong-5-ket-luan.md`): §5.1 Kết luận (số liệu canonical + 6 ĐG thật), §5.2 Hạn chế (4× "HẠN CHẾ BẮT BUỘC", 3 giới hạn post-retrain: tile-21× obs_dim=10 / DoW<6.2% / freshness 2/4), §5.3 Hướng phát triển (recommender = TƯƠNG LAI chưa có). Verify đối kháng REJECT→fix ĐG2 (interceptor gắn 3 trường dynamicPrice/freshnessScore/priceTag — KHÔNG "suggested_price" bịa; cite :74-77)→PASS. Commit cd6655d.
> - **T2.30** TLTK IEEE 35 entry (order-of-appearance) + mục lục/danh mục hình-bảng (`00-trang-bia-muc-luc.md`). Controller trim vol/no chưa kiểm chứng của 3 paper so sánh [33-35]; sửa abbreviation mục lục §2.1.1/2 khớp heading. Commit a23d9c9.
> - **T2.V** verify toàn văn độc lập (`VERIFY-REPORT.md`): V1 citation sweep (38 path resolve ls, 0 broken) / V2 false-claim sweep (0 khẳng định sai, mọi hit phủ định/lý thuyết/ledger) / V3 3 giới hạn đúng trạng thái / V4 10 canonical nhất quán / V5 mục lục khớp 100% heading / V6 0 số eval bịa (mọi ô §4.4 = "—"). **VERDICT: PASS (0 FAIL).**

> Cập nhật 2026-06-07 (phiên Task 2 #3): hoàn tất CHƯƠNG 4 (T2.23→T2.28) bằng subagent-driven-development, 6 dispatch tuần tự (implementer sonnet → verifier đối kháng độc lập; §4.4.2/3/4 verify 2-lớp AI/ML → controller fix → commit nhỏ). Tất cả PASS:
> - T2.23 §4.1+§4.2 (PASS; 13 module/1 sidecar 8000/3 endpoint; cron "0 * * * *"; PriceOverride 5 trạng thái; seed 10 user số thật).
> - T2.24 §4.3 (PASS; 54/54 test / 21 spec đếm thật; Stripe 7 + GHN/Dijkstra 7 case resolve tại spec — KHÔNG dùng "4 case" sai của dany.md; KHÔNG overclaim tsc 0 lỗi).
> - T2.25 §4.4.1+§4.4.5 (REJECT→fix→PASS; demo 8 caption 0 recommender; SỬA Hình 4.8: Shadow Report = endpoint backend controller.ts:78 CHƯA tích hợp UI mobile, KHÔNG phải màn hình admin).
> - T2.26 ⭐2-lớp §4.4.2 (PASS; eval.py MAE/day+AUROC+isotonic+per-category; bảng khung 0 số bịa; giới hạn tile-21× obs_dim=10; SỬA Naive = baseline ĐỀ XUẤT chưa hiện thực trong eval.py).
> - T2.27 ⭐2-lớp §4.4.3 (PASS; market_env EPISODE_LEN=91, 11 action, safety clip rate, sim revenue/waste bảng khung 0 số bịa; Safety 5 rule 3→4→1→2→5 ngưỡng đúng; 3 paper TLTK định tính).
> - T2.28 ⭐2-lớp §4.4.4 (PASS; 2 model CoreML nhị phân fruit/root; Confusion Matrix 2×2 KHÔNG 4×4; bảng khung 0 số bịa; giới hạn 2/4 model + không training script ảnh).
> Chương 4 (`docs/thesis/final/chuong-4-trien-khai-thuc-nghiem.md`) KHÔNG còn skeleton comment; **0 số eval bịa toàn chương** (mọi MAE/AUROC/accuracy/doanh thu để "—" bảng khung).

> Cập nhật 2026-06-07 (phiên Task 2 #2): hoàn tất CHƯƠNG 3 (T2.12→T2.22) bằng subagent-driven-development, 4 dispatch tuần tự (implementer sonnet → verifier đối kháng độc lập → controller fix → commit). Tất cả PASS:
> - T2.12-T2.16 §3.1-§3.3.6 (verify PASS; fix citation GHN/cron/port + sửa trung thực Redis = cache dự báo, KHÔNG phải hàng đợi thông báo). Commit 578b412.
> - T2.17-T2.19 §3.3.7 AI/ML ⭐2-lớp (verify PASS; obs_dim=10 tile-21×; Safety 3→4→1→2→5; 9/9 hyperparam khớp; fix line-ref → MultiCatDDQNAgent + cite Bellman/Huber). Commit e29b38f
"?> - T2.20-T2.21 §3.4 CSDL ⭐2-lớp (verify PASS; 10 collection resolve 10 schema; orders 3 single index; freshness_cache readings/medianScore; +index bổ sung products/posts). Commit 6607d5f.
> - T2.22 §3.5 giao diện (verify PASS; Consumer 0 recommender; Farm quét tươi+gợi ý giá thật; Admin Shadow Report endpoint resolve). Commit 35d18e7.
> Chương 3 (`docs/thesis/final/chuong-3-phan-tich-thiet-ke.md`) KHÔNG còn skeleton comment nào.

> (Phiên Task 2 #1): đã chạy writing-plans (plan: `docs/superpowers/plans/2026-06-07-task2-thesis-full-prose.md`) + subagent-driven-development. Đầu ra ở `docs/thesis/final/` (chia chương). ĐÃ XONG: T2.1 skeleton+STRUCTURE.md, T2.2 fact-pack ledger (5 entry nhóm Task 2), T2.3 23 diagram PlantUML (verify đối kháng PASS), T2.4-T2.5 Chương 1 (verify PASS), T2.6-T2.11 Chương 2 (verify PASS, §2.4 AI/ML resolve source 2 lần). 5 commit (eb7765d→c05f50c).

> (Nền cũ) forecaster đã retrain obs_dim=10 (T0.13) — layout mismatch 11≠10 HẾT, chỉ còn giới hạn serve tile-21×. `docs/thesis/dany.md` = dàn ý đã fact-check 100% (NGUỒN nội dung Task 2).

### (Lịch sử) Task 0 addendum retrain — đã xong
- Quyết định: retrain forecaster trên env-10 hiện tại (fix layout 11≠10 + version skew). Tiling-21× VẪN còn (cần backend history → document). Freshness leafy/herbs + dow KHÔNG fix được (thiếu data / vô nghĩa).
- ~~Backup an toàn: `dynamic-pricing-final/_backup_obs11/`~~ — ĐÃ XOÁ (2026-06-07) khi dọn local. Là checkpoint obs11 cũ (đã bị obs10 thay thế, validated) + parquet TÁI TẠO ĐƯỢC qua `scripts/generate_data.py`. Nếu cần revert retrain: regen data rồi train lại layout obs11. KHÔNG có trên remote (cố ý, ~85MB).
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
**TASK 2 ✅ DONE — toàn bộ 3 task lớn (0/1/2) hoàn tất.** Khoá luận hoàn chỉnh ở `docs/thesis/final/` (5 chương + TLTK IEEE + mục lục + 23 diagram .puml + VERIFY-REPORT.md PASS). Không còn leaf-task mở.

Hướng đi tiếp (NẾU user yêu cầu — KHÔNG tự động làm):
- Render PDF/DOCX từ Markdown final → bổ sung số trang vào mục lục (hiện cố ý để trống vì chưa render).
- Tác giả thesis xác nhận thông tin thư mục đầy đủ của 3 paper so sánh [33-35] (Nassibi/Xue/Kayikci) — hiện trim còn tác giả+title+năm (WARN-V2-A, không chặn).
- Điền số eval thật vào §4.4 (chạy eval.py forecaster + sim market_env định giá + confusion 2×2 freshness) — hiện mọi ô là "—" bảng khung (cố ý, chưa chạy eval định lượng).
- WARN-V1-A (không chặn): vài ô bảng §3.4 dùng path order.schema.ts rút gọn — có thể chuẩn hoá thành full path khi rảnh.

> ⚠️ NHẮC §5.2 BẮT BUỘC: `grep -c "HẠN CHẾ BẮT BUỘC" docs/thesis/final/chuong-5-ket-luan.md` ≥3 — (a) forecaster serve tile-21× steady-state obs_dim=10 [main.py:135] (KHÔNG ghi layout mismatch 11≠10 — đã hết sau retrain T0.13), (b) DoW lệch pha serve <6.2% [main.py:98 vs market_env.py:132], (c) freshness chỉ 2/4 model CoreML (leafy/herbs→root). Dijkstra = fallback demo; Stripe chỉ backend+WebView; recommender = future không overclaim.
> ⚠️ NHẮC §4.4: mọi số eval (MAE/AUROC/accuracy/doanh thu) ĐỂ "—" bảng khung (chưa chạy eval). Naive baseline = ĐỀ XUẤT chưa hiện thực trong eval.py. Shadow Report = endpoint backend chưa có UI mobile.

> ⚠️ NHẮC §5.2 BẮT BUỘC: `grep -c "HẠN CHẾ BẮT BUỘC"` ≥3 — (a) forecaster tile-21× steady-state obs_dim=10 (KHÔNG ghi layout mismatch 11≠10), (b) DoW lệch pha <6.2%, (c) freshness 2/4 model. Dijkstra = fallback demo; Stripe chỉ backend+WebView; recommender = future không overclaim.

- INPUT chính: `docs/thesis/dany.md` (dàn-ý đã đúng + citation inline — NGUỒN nội dung), `docs/thesis/final/STRUCTURE.md` (hợp đồng cấu trúc + số liệu canonical + 3 giới hạn), `.handoff/claims-ledger.md` (20 entry — TÁI DÙNG, đừng verify lại cái đã có).
- BẮT BUỘC giữ 3 giới hạn `t0.10-thesis-limitations` (forecaster tile-21× steady-state [obs_dim=10, KHÔNG còn layout mismatch], dow <6.2%, freshness 2/4 model) — xuất hiện ở §5.2 + nhắc §3.3.7a/§4.4.2.
- Ràng buộc: chân thực 100% với code; ưu tiên CSDL/AI-ML/diagram (2-lớp verify); tiếng Việt; mỗi câu kỹ thuật mang citation resolve được; KHÔNG đụng dynamic-pricing-final/, pricing-sidecar/, freshnessmodels/ (chỉ đọc).

## Task đang mở
- Task 0: ✅ done toàn bộ (gồm retrain obs_dim=10).
- Task 1: ✅ done toàn bộ (T1.1–T1.V + sync post-retrain). dany.md trung thực với code.
- Task 2: ✅ DONE toàn bộ. T2.1→T2.28 (nền tảng + Ch1-4) + T2.29 (Ch5) + T2.30 (TLTK+mục lục) + T2.V (verify toàn văn PASS — `VERIFY-REPORT.md`). Khoá luận chân thực 100% với code.

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
