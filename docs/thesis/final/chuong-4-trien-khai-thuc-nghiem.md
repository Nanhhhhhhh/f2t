# CHƯƠNG 4. TRIỂN KHAI VÀ THỰC NGHIỆM

## 4.1. Môi trường phát triển
<!-- T2.23: dany.md L489-499; bảng thư viện; ledger t2.2-tech-versions, t1.4-one-sidecar -->

## 4.2. Cài đặt và triển khai

### 4.2.1. Cấu trúc mã nguồn
<!-- T2.23: dany.md L503-509; 13 module + 1 sidecar -->

### 4.2.2. Tích hợp NestJS ↔ AI Sidecar
<!-- T2.23: dany.md L511-519; Interceptor + PricingTickCron + vòng đời PriceOverride; ledger t1.4-interceptor-cron -->

### 4.2.3. Tài khoản seed
<!-- T2.23: dany.md L521-523; ledger t2.2-seed -->

## 4.3. Kiểm thử
<!-- T2.24: dany.md L525-533; 54/54 test; ledger t1.15-numbers -->

## 4.4. Đánh giá hệ thống

### 4.4.1. Đánh giá chức năng tổng quan
<!-- T2.25: dany.md L537-541; 13 module, ≈79 endpoint, 10 collection, ≈48 màn hình; ledger t1.15-numbers, t1.4-collections -->

### 4.4.2. Đánh giá dự báo nhu cầu
<!-- T2.26 ⭐2-lớp: dany.md L543-555; eval.py offline + giới hạn tile-21×; KHÔNG bịa số; ledger t0.4-forecaster-parity, t0.10 -->

### 4.4.3. Đánh giá định giá động
<!-- T2.27 ⭐2-lớp: dany.md L557-587; market_env sim + Safety + 3 paper [TLTK]; KHÔNG bịa số; ledger t0.2-action-space, t1.4-safety-5-rules -->

### 4.4.4. Đánh giá phân loại độ tươi
<!-- T2.28 ⭐2-lớp: dany.md L589-599; Confusion Matrix 2×2 + giới hạn 2/4; KHÔNG bịa số; ledger t0.6-coreml-freshness, t0.10 -->

### 4.4.5. Demo sản phẩm
<!-- T2.25: dany.md L601-603; 8 screenshot; ledger t1.4-no-recommender, t1.15-numbers -->
