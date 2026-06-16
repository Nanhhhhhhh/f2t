# Kết quả eval cho §4.4.3 — Đánh giá mô hình học máy (chạy thật 2026-06-12)

Toàn bộ số liệu dưới đây do script chạy trực tiếp trên checkpoint/dữ liệu trong repo, tái lập được.

## (a) ForecasterLSTM — offline eval (src/forecaster/eval.py trên data/processed/test.parquet)
- Demand MAE/day = 0,9464 (ngưỡng < 3,0) ✓
- Waste AUROC = 0,8872 (ngưỡng > 0,85) ✓

| Danh mục | MAE/day | AUROC | Waste rate |
|---|---|---|---|
| leafy | 0,7548 | 0,6674 | 0,0279 |
| root  | 1,2043 | 0,9828 | 0,0398 |
| fruit | 1,0503 | 0,7710 | 0,6024 |
| herbs | 0,7761 | 0,5820 | 0,4200 |

Lệnh: `PYTHONPATH=. python -c "from src.forecaster.eval import *; ..."` (eval.py)

## (b) DDQN — MarketEnv simulation, N=200 episodes/policy (91 ngày/episode), seed 0..199
Offline eval cấp window 21 bước THẬT cho forecaster encoder (khác serve online tile-21×).

| Chính sách | Doanh thu (TB±SD) | Uplift vs static | Waste rate |
|---|---|---|---|
| static (δ=0) | 1769,9 ± 58,2 | +0,00% | 0,0621 |
| markdown (−25% khi fresh<0,65) | 1678,5 ± 57,1 | −5,17% | 0,0543 |
| DDQN-MLP cũ (obs 10) | 1768,7 ± 57,3 | −0,07% | 0,0620 |
| DDQN-Forecaster (prod, obs 12) | 1855,3 ± 61,6 | **+4,83%** | 0,0599 |

Phân bố 11 action (18.200 quyết định, 50 episode):
0(−0,30)=6,89% · 1(−0,25)=1,65% · 2(−0,20)=1,85% · 3(−0,15)=10,05% · 4(−0,10)=0,12% · 5(−0,05)=17,76% · 6(0,00)=32,22% · 7(+0,05)=5,79% · 8(+0,10)=9,03% · 9(+0,15)=3,74% · 10(+0,20)=10,91%
→ giữ giá 32,2% · giảm 38,3% · tăng 29,5%.

## (c) Recommender FP-Growth — holdout hit-rate@k
- Rules production: 34 luật / 8 antecedent, lift 1,007–1,939 (TB 1,215), confidence TB 0,499. Mạnh nhất: root↔herbs lift 1,94.
- Holdout: train 2.774.457 / test 100.000 giỏ, mine lại luật trên train (min_support=0,02, min_confidence=0,10), leave-one-out (n=237.195 lượt).

| k | hit-rate (rules) | hit-rate (popularity) |
|---|---|---|
| 1 | 0,1320 | 0,6484 |
| 3 | 0,6287 | 0,9380 |
| 5 | 0,8140 | 0,9858 |

Phát hiện: popularity-bias (fruit 71%, leafy 60%, dairy 59% trong giỏ) → hit-rate thô do popularity chiếm ưu thế; lift hạ trọng số item phổ biến để nổi item bổ trợ → đánh đổi hit-rate lấy tính khám phá. Giá trị hệ nằm ở lift, không ở hit-rate thô.

## (d) Freshness CoreML — Create ML validation accuracy (nhúng trong artifact) + inference time
Dataset gốc đã bị xoá khỏi đĩa → cần user chạy eval độc lập bằng freshnessmodels/eval_freshness.py.

| Model | Val accuracy (Create ML) | #ảnh (fresh/rotten) | Iters | Inference (median) |
|---|---|---|---|---|
| fruit | 87,52% (train 87,41%) | 49.131 (25.744/23.387) | 25 | ~2,9 ms |
| root  | 85,96–89,47% (qua các lần train) | 2.276 (1.207/1.069) | 25–50 | ~3,6 ms |

Chỉ 2/4 danh mục có model riêng; leafy & herbs dùng chung root (hạn chế c).
Val accuracy nội bộ Create ML KHÔNG thay thế eval trên test độc lập trên phân phối F2T thật.

Script eval cho user: `cd freshnessmodels && python eval_freshness.py fruit <test_dir>` (test_dir/fresh, test_dir/rotten).
