# KHOÁ LUẬN TỐT NGHIỆP

## Đề tài: Xây dựng nền tảng thương mại điện tử nông sản Farm-to-Table tích hợp AI/ML (dự báo nhu cầu, định giá động, phân loại độ tươi)

<!-- T2.1 skeleton — trang bìa placeholder; T2.30 hoàn thiện mục lục + số trang -->

- **Sinh viên thực hiện:** _(điền)_
- **Giảng viên hướng dẫn:** _(điền)_
- **Hệ thống:** F2T — `f2t-frontend` (React Native + Expo) · `f2t-backend` (NestJS + MongoDB) · `pricing-sidecar` (FastAPI) · `dynamic-pricing-final` (PyTorch DDQN/LSTM) · `freshnessmodels` (CoreML)

---

## MỤC LỤC

**Chương 1. GIỚI THIỆU**

- 1.1. Sự cần thiết của bài toán
- 1.2. Mục tiêu nghiên cứu
- 1.3. Phạm vi nghiên cứu
- 1.4. Phương pháp tiếp cận
- 1.5. Đóng góp của khóa luận
- 1.6. Cấu trúc khóa luận

**Chương 2. CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ LIÊN QUAN**

- 2.1. Tổng quan lý thuyết cơ sở
  - 2.1.1. Thương mại điện tử nông sản và mô hình Farm-to-Table
  - 2.1.2. Trí tuệ nhân tạo trong thương mại điện tử
  - 2.1.3. Quản lý dự án với Agile/Scrum
- 2.2. Kiến trúc hệ thống
  - 2.2.1. So sánh Monolithic vs Microservices vs Sidecar
  - 2.2.2. Kiến trúc REST API và giao tiếp giữa các dịch vụ
- 2.3. Công nghệ và công cụ phát triển
  - 2.3.1. Frontend: React Native + Expo
  - 2.3.2. Backend: NestJS + Node.js
  - 2.3.3. Cơ sở dữ liệu: MongoDB
  - 2.3.4. AI/ML Sidecar: FastAPI + Python
  - 2.3.5. Tích hợp bên thứ ba
- 2.4. Nền tảng lý thuyết AI/ML
  - 2.4.1. Dự báo chuỗi thời gian với LSTM
  - 2.4.2. Học tăng cường và DDQN
  - 2.4.3. Phân loại ảnh và CoreML
- 2.5. Các hệ thống tương tự
- 2.6. Nhận xét và định hướng giải pháp

**Chương 3. PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG**

- 3.1. Mô tả quy trình nghiệp vụ
  - 3.1.1. Quy trình hiện tại (thủ công)
  - 3.1.2. Quy trình đề xuất (F2T)
  - 3.1.3. Ba tác nhân hệ thống
- 3.2. Phân tích, thiết kế chức năng nghiệp vụ
  - 3.2.1. Yêu cầu chức năng theo vai trò
  - 3.2.2. Yêu cầu phi chức năng
  - 3.2.3. Sơ đồ phân rã chức năng
- 3.3. Phân tích, thiết kế kiến trúc hệ thống
  - 3.3.1. Kiến trúc triển khai tổng quan
  - 3.3.2. Biểu đồ Use Case tổng quan
  - 3.3.3. Biểu đồ Use Case module AI/ML
  - 3.3.4. Đặc tả Use Case chi tiết
  - 3.3.5. Biểu đồ tuần tự
  - 3.3.6. Biểu đồ hoạt động
  - 3.3.7. Thuật toán chi tiết các module AI/ML
- 3.4. Phân tích, thiết kế cơ sở dữ liệu
  - 3.4.1. Sơ đồ quan hệ thực thể (ERD)
  - 3.4.2. Chi tiết 10 collections
  - 3.4.3. Chỉ mục và tối ưu
- 3.5. Phân tích, thiết kế giao diện chức năng
  - 3.5.1. Consumer
  - 3.5.2. Farm
  - 3.5.3. Admin

**Chương 4. TRIỂN KHAI VÀ THỰC NGHIỆM**

- 4.1. Môi trường phát triển
- 4.2. Cài đặt và triển khai
  - 4.2.1. Cấu trúc mã nguồn
  - 4.2.2. Tích hợp NestJS ↔ AI Sidecar
  - 4.2.3. Tài khoản seed
- 4.3. Kiểm thử
  - 4.3.1. Chiến lược kiểm thử
  - 4.3.2. Kết quả kiểm thử đơn vị
  - 4.3.3. Kiểm thử tích hợp các thành phần trọng yếu
  - 4.3.4. Quy trình đảm bảo chất lượng mã nguồn
- 4.4. Đánh giá hệ thống
  - 4.4.1. Đánh giá chức năng tổng quan
  - 4.4.2. Đánh giá dự báo nhu cầu
  - 4.4.3. Đánh giá định giá động
  - 4.4.4. Đánh giá phân loại độ tươi
  - 4.4.5. Demo sản phẩm

**Chương 5. KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN**

- 5.1. Kết luận
- 5.2. Hạn chế
- 5.3. Hướng phát triển

**Tài liệu tham khảo**

---

## DANH MỤC HÌNH

**Hình chụp màn hình và bản đồ đóng góp**

- Hình 1.1 — Bản đồ đóng góp hệ thống F2T (`contribution-map.puml`)
- Hình 4.1 — Màn hình Home (Consumer): danh sách sản phẩm nông sản
- Hình 4.2 — Màn hình Chi tiết sản phẩm: nhãn độ tươi và giá động DDQN
- Hình 4.3 — Màn hình Giỏ hàng và Thanh toán Stripe
- Hình 4.4 — Màn hình Theo dõi đơn hàng: bản đồ GHN/Dijkstra
- Hình 4.5 — Màn hình Farm Dashboard: biểu đồ dự báo 7 ngày ForecasterLSTM
- Hình 4.6 — Màn hình AI Farm: gợi ý giá DDQN
- Hình 4.7 — Màn hình AI Farm: quét độ tươi CoreML
- Hình 4.8 — Màn hình Admin Dashboard: thống kê nền tảng

**Biểu đồ ERD và kiến trúc**

- Hình 3.1 — Sơ đồ quan hệ thực thể (ERD) tổng quan (`erd.puml`)
- Hình 3.2 — Kiến trúc triển khai tổng quan (`deployment-architecture.puml`)
- Hình 3.3 — Sơ đồ phân rã chức năng (`fdd-functional-decomposition.puml`)

**Biểu đồ Use Case**

- Hình 3.4 — Use Case tổng quan (`usecase-overview.puml`)
- Hình 3.5 — Use Case module AI/ML (`usecase-aiml.puml`)

**Biểu đồ quy trình nghiệp vụ**

- Hình 3.6 — Quy trình chuỗi cung ứng hiện tại (`business-process-current.puml`)
- Hình 3.7 — Quy trình đề xuất F2T (`business-process-f2t.puml`)

**Biểu đồ tuần tự (Sequence Diagram)**

- Hình 3.8 — SD-01: Đăng nhập và xác thực JWT (`sd-01-login-jwt.puml`)
- Hình 3.9 — SD-02: Đăng ký tài khoản (`sd-02-register.puml`)
- Hình 3.10 — SD-03: Tìm kiếm và lọc địa lý (`sd-03-search-geo.puml`)
- Hình 3.11 — SD-04: Tạo đơn hàng (`sd-04-create-order.puml`)
- Hình 3.12 — SD-05: Thanh toán Stripe Checkout (`sd-05-stripe-checkout.puml`)
- Hình 3.13 — SD-06: Giao hàng GHN/Dijkstra (`sd-06-ghn-dijkstra.puml`)
- Hình 3.14 — SD-ML-01: Cron định giá động (`sd-ml-01-pricing-cron.puml`)
- Hình 3.15 — SD-ML-02: Dự báo nhu cầu LSTM (`sd-ml-02-forecast.puml`)
- Hình 3.16 — SD-ML-03: Chi tiết định giá DDQN (`sd-ml-03-pricing-detail.puml`)

**Biểu đồ hoạt động (Activity Diagram)**

- Hình 3.17 — AD-01: Vòng đời đơn hàng (`ad-01-order-lifecycle.puml`)
- Hình 3.18 — AD-02: Luồng xác thực JWT (`ad-02-jwt.puml`)
- Hình 3.19 — AD-ML-01: Luồng ForecasterLSTM (`ad-ml-01-forecaster.puml`)
- Hình 3.20 — AD-ML-02: Luồng DDQN và Safety Layer (`ad-ml-02-ddqn-safety.puml`)

**Biểu đồ mạng nơ-ron**

- Hình 3.21 — Kiến trúc mạng ForecasterLSTM (`net-forecaster-lstm.puml`)
- Hình 3.22 — Kiến trúc mạng DDQN Dueling (`net-ddqn-dueling.puml`)

---

## DANH MỤC BẢNG

- Bảng 2.1 — So sánh ba kiến trúc hệ thống (Monolithic, Microservices, Monolith + Sidecar) theo năm tiêu chí
- Bảng 2.2 — So sánh bốn hệ thống TMĐT nông sản tương tự và F2T theo tiêu chí chức năng
- Bảng 4.1 — Môi trường phần cứng và phần mềm phát triển
- Bảng 4.2 — Thư viện Backend chính (NestJS)
- Bảng 4.3 — Thư viện Frontend chính (React Native + Expo)
- Bảng 4.4 — Thư viện AI/ML (pricing-sidecar)
- Bảng 4.5 — Phân bố test case theo tệp spec (54 test / 21 tệp)
- Bảng 4.6 — Trạng thái hoàn thành 13 module NestJS
- Bảng 4.7 — Kết quả đánh giá ForecasterLSTM (bảng khung)
- Bảng 4.8 — So sánh ba phương án định giá qua mô phỏng MarketEnv (91 ngày)
- Bảng 4.9 — Phân bố 11 hành động DDQN
- Bảng 4.10 — So sánh hệ thống định giá F2T với nghiên cứu quốc tế
- Bảng 4.11 — Chỉ số phân loại độ tươi (khung chờ điền)
