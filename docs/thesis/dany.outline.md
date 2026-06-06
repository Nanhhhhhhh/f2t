# Outline dany.md — cấu trúc PHẢI bảo toàn (T1.3)

> dany.md là **dàn ý chi tiết** (mục lục + bullet mô tả), tiêu đề là dòng in-đậm `**...**` (mục cấp chương/2 số) và in-nghiêng `*...*` (mục cấp 3 số). KHÔNG có heading `#`. Giữ NGUYÊN thứ tự + cấp khi sửa nội dung.
> ★ = mục có claim AI/ML — ưu tiên fact-check (xem T1.4 audit).

## CHƯƠNG 1. GIỚI THIỆU (dany.md:1)
- [2] 1.1 Sự cần thiết của bài toán (L3)
- [2] 1.2 Mục tiêu nghiên cứu (L17) ★ (MT3 recommender, MT4 Holt EWMA, MT5 DDQN, MT6 MobileNetV2)
- [2] 1.3 Phạm vi nghiên cứu (L33)
- [2] 1.4 Phương pháp tiếp cận (L39)
- [2] 1.5 Đóng góp của khóa luận (L49) ★ (ĐG2 recommender, ĐG3 Holt, ĐG4 DDQN, ĐG5 MobileNetV2)
- [2] 1.6 Cấu trúc khóa luận (L65)

## CHƯƠNG 2. CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ (dany.md:69)
- [2] 2.1 Tổng quan lý thuyết cơ sở (L71)
  - [3] 2.1.1 TMĐT nông sản & Farm-to-Table (L73)
  - [3] 2.1.2 AI trong TMĐT (L81)
  - [3] 2.1.3 Agile/Scrum (L87)
- [2] 2.2 Kiến trúc hệ thống (L93)
  - [3] 2.2.1 Monolithic vs Microservices vs Sidecar (L95)
  - [3] 2.2.2 REST API & giao tiếp dịch vụ (L101)
- [2] 2.3 Công nghệ & công cụ phát triển (L105)
  - [3] 2.3.1 Frontend: React Native + Expo (L107)
  - [3] 2.3.2 Backend: NestJS + Node.js (L113)
  - [3] 2.3.3 CSDL: MongoDB (L121)
  - [3] 2.3.4 AI/ML Sidecar: FastAPI + Python (L127)
  - [3] 2.3.5 Tích hợp bên thứ ba (L133)
- [2] 2.4 Nền tảng lý thuyết AI/ML (L139) ★
  - [3] 2.4.1 Lọc cộng tác (Collaborative Filtering) (L141) ★ recommender
  - [3] 2.4.2 Content-Based Filtering (L151) ★ recommender
  - [3] 2.4.3 Dự báo chuỗi thời gian (L159) ★
  - [3] 2.4.4 DoW Seasonality (L161) ★
  - [3] 2.4.5 Học tăng cường và DDQN (L169) ★ (5-dim/5-action — SAI)
  - [3] 2.4.6 Phân loại ảnh MobileNetV2 (L177) ★ (4 class — SAI)
- [2] 2.5 Các hệ thống tương tự (L185)
- [2] 2.6 Nhận xét & định hướng giải pháp (L199)

## CHƯƠNG 3. PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG (dany.md:205)
- [2] 3.1 Mô tả quy trình nghiệp vụ (L207)
  - [3] 3.1.1 Quy trình hiện tại (L209)
  - [3] 3.1.2 Quy trình đề xuất F2T (L217) ★
  - [3] 3.1.3 3 tác nhân hệ thống (L223)
- [2] 3.2 Phân tích thiết kế chức năng nghiệp vụ (L231)
  - [3] 3.2.1 Yêu cầu chức năng theo vai trò (L233)
  - [3] 3.2.2 Yêu cầu phi chức năng (L241)
  - [3] 3.2.3 Sơ đồ phân rã chức năng (L245)
- [2] 3.3 Phân tích thiết kế kiến trúc hệ thống (L251) ★
  - [3] 3.3.1 Kiến trúc triển khai tổng quan (L253) ★ (3 sidecar 8000/8001/8002 — CẦN xác minh)
  - [3] 3.3.2 Use Case tổng quan (L265)
  - [3] 3.3.3 Use Case module AI/ML (L279) ★
  - [3] 3.3.4 Đặc tả Use Case chi tiết (L289)
  - [3] 3.3.5 Biểu đồ tuần tự (L305) ★ (SD-ML cosine/Holt — SAI)
  - [3] 3.3.6 Biểu đồ hoạt động (L335) ★
  - [3] 3.3.7 Thuật toán chi tiết các module AI/ML (L353) ★
    - (a) Hệ thống gợi ý (L355) ★ recommender
    - (b) Dự báo nhu cầu (L391) ★ Holt EWMA — SAI
    - (c) Định giá động (L409) ★ DDQN 5-dim — SAI
    - (d) Phân loại độ tươi (L439) ★ MobileNetV2 4-class — SAI
- [2] 3.4 Phân tích thiết kế CSDL (L455) ★ (ưu tiên cao)
  - [3] 3.4.1 ERD (L457)
  - [3] 3.4.2 Chi tiết 10 collections (L461) ★ (recommendation_caches — CẦN xác minh)
  - [3] 3.4.3 Chỉ mục & tối ưu (L487)
- [2] 3.5 Phân tích thiết kế giao diện chức năng (L499)
  - [3] 3.5.1 Consumer (L501)
  - [3] 3.5.2 Farm (L503)
  - [3] 3.5.3 Admin (L505)

## CHƯƠNG 4. TRIỂN KHAI VÀ THỰC NGHIỆM (dany.md:507)
- [2] 4.1 Môi trường phát triển (L509)
- [2] 4.2 Cài đặt và triển khai (L521)
  - [3] 4.2.1 Cấu trúc mã nguồn (L523)
  - [3] 4.2.2 Tích hợp NestJS ↔ AI Sidecars (L531) ★
  - [3] 4.2.3 Tài khoản seed (L541)
- [2] 4.3 Kiểm thử (L545) (54/54 test — CẦN xác minh)
- [2] 4.4 Đánh giá hệ thống (L555) ★
  - [3] 4.4.1 Đánh giá chức năng tổng quan (L557)
  - [3] 4.4.2 Đánh giá hệ thống gợi ý (L563) ★ recommender
  - [3] 4.4.3 Đánh giá dự báo nhu cầu (L577) ★
  - [3] 4.4.4 Đánh giá định giá động (L591) ★
  - [3] 4.4.5 Đánh giá phân loại độ tươi (L613) ★
  - [3] 4.4.6 Demo sản phẩm (L627)

## CHƯƠNG 5. KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN (dany.md:631)
- [2] 5.1 Kết luận (L633)
- [2] 5.2 Hạn chế (L641)
- [2] 5.3 Hướng phát triển (L655)

## TÀI LIỆU THAM KHẢO (dany.md:671)
</content>
