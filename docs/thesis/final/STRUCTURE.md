# STRUCTURE.md — Hợp đồng cấu trúc thesis final (T2.1)

> Đây là HỢP ĐỒNG bảo toàn outline. T2.4…T2.30 chỉ điền prose vào skeleton, KHÔNG đổi thứ tự/cấp mục so với `dany.outline.md`. Mọi câu kỹ thuật mang citation `[ref: path:Lxx]` hoặc `[ref: ledger <id>]`.

## Ánh xạ Section → Leaf-task → File → Diagram → Ledger

| Section | dany.md dòng | Leaf-task | File đích | Diagram | Ledger id chính | 2-lớp? |
|---|---|---|---|---|---|---|
| §1.1 Sự cần thiết | L1-15 | T2.4 | chuong-1 | — | (bối cảnh, [TLTK]) | no |
| §1.2 Mục tiêu | L17-29 | T2.4 | chuong-1 | — | t1.15-numbers, t1.4-* | resolve |
| §1.3 Phạm vi | L31-35 | T2.5 | chuong-1 | — | t1.4-one-sidecar | resolve |
| §1.4 Phương pháp | L37-45 | T2.5 | chuong-1 | — | — | no |
| §1.5 Đóng góp | L47-61 | T2.5 | chuong-1 | contribution-map | t1.4-one-sidecar, t1.4-interceptor-cron | resolve |
| §1.6 Cấu trúc | L63-65 | T2.5 | chuong-1 | — | — | no |
| §2.1 Tổng quan LT | L69-89 | T2.6 | chuong-2 | — | t1.4-no-recommender (§2.1.2) | no |
| §2.2 Kiến trúc HT | L91-101 | T2.6 | chuong-2 | — | t1.4-one-sidecar | no |
| §2.3 Công nghệ | L103-135 | T2.7 | chuong-2 | — | t2.2-tech-versions | resolve |
| §2.4.1 LSTM | L137-149 | T2.8 ⭐ | chuong-2 | net-forecaster-lstm | t0.2-forecaster-arch, t0.4 | YES |
| §2.4.2 DDQN | L151-161 | T2.9 ⭐ | chuong-2 | net-ddqn-dueling | t0.2-ddqn-arch, t0.2-action-space | YES |
| §2.4.3 CoreML | L163-171 | T2.10 ⭐ | chuong-2 | — | t0.6-coreml-freshness, t0.9-fixes | YES |
| §2.5 HT tương tự | L173-185 | T2.11 | chuong-2 | — | t1.4-no-recommender | no |
| §2.6 Nhận xét | L187-189 | T2.11 | chuong-2 | — | t1.4-no-recommender | no |
| §3.1 Quy trình NV | L195-217 | T2.12 | chuong-3 | business-process-current/f2t | t1.4-interceptor-cron | resolve |
| §3.2 Chức năng NV | L219-239 | T2.13 | chuong-3 | fdd | t1.4-no-recommender | resolve |
| §3.3.1 Kiến trúc | L243-253 | T2.14 | chuong-3 | deployment-architecture | t1.4-one-sidecar | resolve |
| §3.3.2 UC tổng quan | L255-267 | T2.14 | chuong-3 | usecase-overview | — | resolve |
| §3.3.3 UC AI/ML | L269-275 | T2.15 | chuong-3 | usecase-aiml | t1.4-no-recommender | resolve |
| §3.3.4 Đặc tả UC | L277-291 | T2.15 | chuong-3 | — | t1.4-forecaster-not-holt | resolve |
| §3.3.5 Tuần tự | L293-317 | T2.16 | chuong-3 | sd-01..06, sd-ml-01..03 | t1.4-interceptor-cron | resolve |
| §3.3.6 Hoạt động | L319-333 | T2.16 | chuong-3 | ad-01,02, ad-ml-01,02 | t1.4-safety-5-rules | resolve |
| §3.3.7a Dự báo | L335-349 | T2.17 ⭐ | chuong-3 | (net-forecaster) | t0.4-forecaster-parity, t0.10 | YES |
| §3.3.7b Định giá | L351-379 | T2.18 ⭐ | chuong-3 | (net-ddqn) | t1.8-ddqn-hyperparams, t1.4-safety-5-rules | YES |
| §3.3.7c Phân loại tươi | L381-395 | T2.19 ⭐ | chuong-3 | — | t0.6-coreml-freshness, t0.10 | YES |
| §3.4.1 ERD | L397-421 | T2.20 ⭐ | chuong-3 | erd | t1.11-schema-detail | YES |
| §3.4.2 12 collection | L423-447 | T2.20 ⭐ | chuong-3 | erd | t1.11-schema-detail, t1.4-collections | YES |
| §3.4.3 Index | L449-477 | T2.21 ⭐ | chuong-3 | — | t1.11-schema-detail | YES |
| §3.5 Giao diện | L479-485 | T2.22 | chuong-3 | — | t1.4-no-recommender, t2.2-frontend-routes | resolve |
| §4.1 Môi trường | L489-499 | T2.23 | chuong-4 | — | t2.2-tech-versions, t1.4-one-sidecar | resolve |
| §4.2 Triển khai | L501-523 | T2.23 | chuong-4 | — | t1.4-interceptor-cron, t2.2-seed | resolve |
| §4.3 Kiểm thử | L525-533 | T2.24 | chuong-4 | — | t1.15-numbers | resolve |
| §4.4.1 Chức năng | L537-541 | T2.25 | chuong-4 | — | t1.15-numbers, t1.4-collections | resolve |
| §4.4.2 Eval dự báo | L543-555 | T2.26 ⭐ | chuong-4 | — | t0.4-forecaster-parity, t0.10 | YES |
| §4.4.3 Eval định giá | L557-587 | T2.27 ⭐ | chuong-4 | — | t0.2-action-space, t1.4-safety-5-rules | YES |
| §4.4.4 Eval tươi | L589-599 | T2.28 ⭐ | chuong-4 | — | t0.6-coreml-freshness, t0.10 | YES |
| §4.4.5 Demo | L601-603 | T2.25 | chuong-4 | — | t1.15-numbers | resolve |
| §5.1 Kết luận | L607-619 | T2.29 ⭐ | chuong-5 | — | t1.15-numbers, t1.4-* | YES |
| §5.2 Hạn chế | L621-639 | T2.29 ⭐ | chuong-5 | — | t0.10-thesis-limitations | YES (7 giới hạn) |
| §5.3 Hướng PT | L641-659 | T2.29 ⭐ | chuong-5 | — | t0.10, t1.4-no-recommender | YES |
| TLTK | L661 | T2.30 | tai-lieu-tham-khao | — | [TLTK] markers | no |

## Số liệu canonical (dùng nhất quán toàn thesis)
- 15 module NestJS · 2 sidecar (pricing-sidecar :8000 + recommender-sidecar :8001) · 12 collection MongoDB
- 78/78 test (78 case / 24 spec file) · 92 REST endpoint (14 controller) · 56 màn hình route
- DDQN: obs **10 chiều** · 11 action linspace(−0.30,0.20,11) · SharedMLPDuelingQNet (hidden=128, cat_embed n_cats=4 dim=8)
- ForecasterLSTM: obs_dim **10** (post-retrain T0.13) · window=21 · hidden=128 · 2 lớp · dual-head demand/waste_logit
- Freshness: **2 model CoreML** (fruit/root, nhị phân fresh/rotten), 299×299 feed RGB
- Safety Layer 5 rule thứ tự áp **3→4→1→2→5**

## 3 giới hạn BẮT BUỘC §5.2 (trạng thái post-retrain — KHÔNG ghi obs_dim=11/layout mismatch)
- (a) Forecaster serve **tile-21× steady-state** (obs_dim=10 khớp env, hết layout mismatch) — main.py:135
- (b) DoW lệch pha serve <6.2% — main.py:98 vs market_env.py:132
- (c) Freshness 2/4 model CoreML (leafy/herbs→root)

## Cross-sell — giới hạn bắt buộc §5.2

(a) Category-level không phải product-level — luật dạng category→category, không định danh sản phẩm cụ thể.
(b) Warm-start Instacart (hành vi siêu thị Mỹ) ≠ đơn F2T thật — chưa retrain trên đơn hàng F2T.
(c) Chưa có đánh giá định lượng chất lượng gợi ý (precision@k / recall / hit-rate); chỉ có thống kê mô tả luật.
(d) Chỉ hiển thị trong giỏ hàng (cart-based), không có gợi ý trên trang chủ hay trang sản phẩm.

## Quy ước trích nguồn ngoài
- Câu kỹ thuật nội bộ → `[ref: path:Lxx]` / `[ref: ledger <id>]`
- Nguồn học thuật/thống kê ngoài (FAO, e-Conomy SEA, paper) → đánh dấu `[TLTK]` inline, T2.30 gom thành IEEE.
