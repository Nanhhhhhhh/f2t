# dany.verify-report.md — Verify pass độc lập Task 1 (T1.V)

- **Ngày:** 2026-06-07
- **Verifier:** controller (đối kháng — KHÁC các implementer subagent đã viết từng section)
- **Phạm vi:** toàn văn `docs/thesis/dany.md` sau T1.1→T1.14, đối chiếu `dany.audit.md` + `claims-ledger.md` + code.
- **Kết luận: PASS.**

## 1. Bảo toàn outline — PASS
5 chương + toàn bộ mục §x.y giữ nguyên thứ tự & cấp (so `dany.outline.md`). Chỉ các mục con là claim BỊA bị xóa CÓ CHỦ ĐÍCH và re-number liền mạch:
- §2.4: xóa lý thuyết recommender (CF/CBF), còn 2.4.1 LSTM / 2.4.2 DDQN / 2.4.3 CoreML.
- §3.3.3 UC-ML: xóa UC-ML-01 recommender → còn 2 UC.
- §3.3.5 SD-ML: xóa SD-ML-01/02 recommender → còn 3 SD.
- §3.3.6 AD-ML: xóa AD-ML-01 recommender → còn 2 AD.
- §3.3.7: xóa (a) recommender → còn (a) Dự báo / (b) Định giá / (c) Phân loại.
- §4.4: xóa §4.4.2 "đánh giá gợi ý" → re-number 4.4.1…4.4.5.

## 2. Quét dư âm claim BỊA — PASS (0 false claim)
`grep` toàn file `recommend|cross-sell|for-you|sản phẩm tương tự|itemitem|collaborative|content-based|cosine|tf-idf|holt|ewma|hit-rate|confusion matrix 4|recommendation_cache|forecast_cache|8001|8002|3 sidecar|14 module|24+`:
- Mọi match còn lại đều là: (a) citation ledger-id `t1.4-forecaster-not-holt` (substring "holt"), (b) câu phủ định trung thực ("KHÔNG có recommender", "hiện chưa có gợi ý"). KHÔNG còn claim khẳng định sai.
- Đã strip 2 dòng chú thích biên tập "BỎ: …" (T1.13 để lại) cho dàn-ý sạch.

## 3. 3 giới hạn BẮT BUỘC (ledger t0.10-thesis-limitations) — PASS
`grep -c 'HẠN CHẾ BẮT BUỘC'` = **3**, đều ở §5.2:
- (a) Forecaster train↔serve mismatch (pad-cuối + tile-21×) → `/forecast` xấp xỉ; dùng offline eval. [main.py:134-135]
- (b) DoW lệch pha serve (weekday thật vs t%7, <6.2%). [main.py:98 vs market_env.py:132]
- (c) Freshness chỉ 2/4 model CoreML (leafy/herbs → root).
Ngoài ra mỗi section AI/ML liên quan (§3.3.7a forecaster, §4.4.2 eval) đều nhắc lại giới hạn tương ứng.

## 4. Lấy mẫu resolve citation — PASS (đã fix drift)
Controller đã resolve trực tiếp tại nguồn cho các claim trọng yếu mỗi section khi verify:
- DDQN: network.py:51-81, reward.py:6-7; hyperparam agent.py:31-35 (lr1e-4/γ0.99/batch256/warmup1000/buffer50000) + train.py:12-15 (ε1.0→0.05 decay2000, target_sync500). ✅
- LSTM: model.py:18-49; eval.py:12/18 (compute_waste_auroc/compute_demand_mae). ✅
- CoreML: main.py:316-333 (fruit/root, target/targetProbability, RGB feed). ✅
- Safety: safety.py:6/8-10/12-13/15-16/18-19 (5 rule). ✅
- CSDL: 10 schema file (freshness-cache readings/medianScore, price-override 5-status enum, orders 3 single index, users embedded location). ✅
- Kiến trúc: app.module.ts:57 (1 SIDECAR_URL→8000), :58 (PRICING_MODE), demand-forecasting.service.ts:43 (/forecast), pricing-tick.cron.ts:18 (cron), main.py:263/277/316 (3 endpoint). ✅
- **Fix drift phát hiện khi verify:** §5.2(a) citation main.py:130-131 (số cũ ledger t0.4) → sửa thành 134-135 (số thật hiện tại). §5.2 "ADVISORY_MODE" → "PRICING_MODE" (tên flag thật). §2.4.3 "ảnh BGR" → làm rõ feed RGB (ledger t0.9). §1.5 "5 đóng góp" → "6 đóng góp".

## 5. Số liệu (T1.15) — PASS
13 module (không phải 14); 54/54 test (ĐÚNG, 54 it/test trong 21 spec); ~79 endpoint (không phải 24+); ~48 màn hình route; 10 collection; 1 sidecar.

## 6. Điểm còn để Task 2 (không phải lỗi Task 1)
- Diagram PlantUML thật (use case/sequence/activity/ERD) — T2.3 sẽ vẽ từ mô tả đã đúng ở đây.
- §2.1.2 "4 ứng dụng AI trong TMĐT: gợi ý, dự báo, định giá, nhận diện ảnh" — GIỮ vì là lý thuyết chung (AI trong TMĐT nói chung, có ví dụ Amazon/Shopee), KHÔNG khẳng định F2T có recommender. Task 2 khi viết prose nên nói rõ F2T chỉ hiện thực 3/4.
- dany.md vẫn là dàn-ý (bullet) — Task 2 nở thành prose đầy đủ, giữ citation.

## Done-gate Task 1: ĐẠT
Đủ: ledger Task 1 (t1.4-* + t1.8/t1.11/t1.15) + audit + verify report này. dany.md trung thực 100% với code ở mọi claim CSDL/AI-ML/diagram đã kiểm. **Task 1 DONE.**
</content>
