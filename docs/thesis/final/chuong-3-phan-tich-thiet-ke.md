# CHƯƠNG 3. PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG

## 3.1. Mô tả quy trình nghiệp vụ

<!-- T2.12: §3.1 — nguồn dany.md L195-217; diagram business-process-current/f2t -->

### 3.1.1. Quy trình hiện tại (thủ công)
<!-- T2.12: dany.md L197-203 -->

### 3.1.2. Quy trình đề xuất (F2T)
<!-- T2.12: dany.md L205-209; luồng AI interceptor; ledger t1.4-interceptor-cron, t1.4-no-recommender -->

### 3.1.3. Ba tác nhân hệ thống
<!-- T2.12: dany.md L211-217 -->

## 3.2. Phân tích, thiết kế chức năng nghiệp vụ

<!-- T2.13: §3.2 — nguồn dany.md L219-239; diagram fdd -->

### 3.2.1. Yêu cầu chức năng theo vai trò
<!-- T2.13: dany.md L221-227; Consumer 8/Farm 7/Admin 5; ledger t1.4-no-recommender -->

### 3.2.2. Yêu cầu phi chức năng
<!-- T2.13: dany.md L229-231 -->

### 3.2.3. Sơ đồ phân rã chức năng
<!-- T2.13: dany.md L233-239; AI/ML = 3 chức năng thật; ledger t1.4-no-recommender -->

## 3.3. Phân tích, thiết kế kiến trúc hệ thống

### 3.3.1. Kiến trúc triển khai tổng quan
<!-- T2.14: dany.md L243-253; 1 sidecar 3 endpoint; diagram deployment-architecture; ledger t1.4-one-sidecar -->

### 3.3.2. Biểu đồ Use Case tổng quan
<!-- T2.14: dany.md L255-267; diagram usecase-overview -->

### 3.3.3. Biểu đồ Use Case module AI/ML
<!-- T2.15: dany.md L269-275; 2 UC-ML; diagram usecase-aiml; ledger t1.4-no-recommender -->

### 3.3.4. Đặc tả Use Case chi tiết
<!-- T2.15: dany.md L277-291; 6 UC tiêu biểu -->

### 3.3.5. Biểu đồ tuần tự
<!-- T2.16: dany.md L293-317; 6 SD e-commerce + 3 SD-ML; diagrams sd-01..06, sd-ml-01..03 -->

### 3.3.6. Biểu đồ hoạt động
<!-- T2.16: dany.md L319-333; AD-01,02 + AD-ML-01,02; diagrams ad-*; ledger t1.4-safety-5-rules -->

### 3.3.7. Thuật toán chi tiết các module AI/ML

#### (a) Dự báo nhu cầu
<!-- T2.17 ⭐2-lớp: dany.md L335-349; ForecasterLSTM obs_dim=10 + giới hạn tile-21×; ledger t0.4-forecaster-parity, t0.10-thesis-limitations -->

#### (b) Định giá động
<!-- T2.18 ⭐2-lớp: dany.md L351-379; state 10 + 11 action + hyperparam + Safety 5 rule; ledger t1.8-ddqn-hyperparams, t1.4-safety-5-rules -->

#### (c) Phân loại độ tươi
<!-- T2.19 ⭐2-lớp: dany.md L381-395; 2 model CoreML + giới hạn 2/4; ledger t0.6-coreml-freshness, t0.10 -->

## 3.4. Phân tích, thiết kế cơ sở dữ liệu

### 3.4.1. Sơ đồ quan hệ thực thể (ERD)
<!-- T2.20 ⭐2-lớp: dany.md L397-421; diagram erd; ledger t1.11-schema-detail -->

### 3.4.2. Chi tiết 10 collections
<!-- T2.20 ⭐2-lớp: dany.md L423-447; ledger t1.11-schema-detail, t1.4-collections -->

### 3.4.3. Chỉ mục và tối ưu
<!-- T2.21 ⭐2-lớp: dany.md L449-477; ledger t1.11-schema-detail -->

## 3.5. Phân tích, thiết kế giao diện chức năng

### 3.5.1. Consumer
<!-- T2.22: dany.md L481; ledger t1.4-no-recommender, t2.2-frontend-routes -->

### 3.5.2. Farm
<!-- T2.22: dany.md L483; quét tươi + gợi ý giá THẬT -->

### 3.5.3. Admin
<!-- T2.22: dany.md L485 -->
