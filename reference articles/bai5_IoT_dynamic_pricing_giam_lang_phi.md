# Data-driven optimal dynamic pricing strategy for reducing perishable food waste at retailers — Yasanur Kayikci và cộng sự, 2022

**DOI/URL:** https://www.researchgate.net/publication/358814594  
**Bối cảnh:** Pilot tại siêu thị Thổ Nhĩ Kỳ

---

## Họ giải quyết vấn đề gì?

**Vấn đề cốt lõi:** Ngành bán lẻ là nơi xảy ra lãng phí thực phẩm tươi sống rất nghiêm trọng — chiếm khoảng 40% tổng lượng lãng phí trong toàn bộ chuỗi cung ứng.

**Nguyên nhân:** Các siêu thị dùng **định giá tĩnh (static pricing)** — một quả táo tươi vừa lên kệ và một quả táo đã nằm 5 ngày bị bán cùng một mức giá. Khách hàng luôn chọn quả tươi nhất, để lại những quả kém tươi cho đến khi chúng hỏng hoàn toàn.

**Mục tiêu:** Xây dựng hệ thống **định giá động (dynamic pricing)** điều khiển bằng dữ liệu thời gian thực từ cảm biến IoT. Giá tự động giảm theo độ tươi thực tế, giúp siêu thị bán hết hàng trước khi hỏng.

---

## Dữ liệu họ dùng

| Thuộc tính | Chi tiết |
|---|---|
| **Địa điểm pilot** | 1 cửa hàng bán lẻ tại Thổ Nhĩ Kỳ |
| **Sản phẩm thử nghiệm** | Táo bán rời (bulk apples) |
| **Cảm biến IoT** | Camera chụp ảnh siêu phổ (Hyperspectral Imaging), dải 400–1000 nm |
| **Dữ liệu thu thập** | Ảnh thời gian thực của táo trên kệ + dữ liệu nhu cầu mua sắm |
| **Đặc điểm** | Phát hiện được vết dập/hỏng BÊN TRONG mà mắt thường không nhìn thấy |

---

## Cách tiếp cận (từng bước)

```
[Camera siêu phổ quét táo trên kệ — liên tục, thời gian thực]
        │
        ▼
[Bước 1: SCAN — Phân tích cấu trúc phân tử của quả táo]
        │   ↳ Phát hiện thay đổi hóa học bên trong (vết bầm, héo)
        ▼
[Bước 2: EVALUATE — Tính điểm Freshness Score (0–100%)]
        │   ↳ Xử lý tại chỗ bằng Edge Computing (không cần gửi lên cloud)
        ▼
[Bước 3: DECIDE — Thuật toán tối ưu giá dựa trên FS + dự báo nhu cầu]
        │
        ▼
[Bước 4: UPDATE — Cập nhật giá tự động lên bảng giá điện tử (ESL)]
        │
        ▼
[Kết quả: Khách mua táo kém tươi hơn với giá rẻ hơn → giảm rác thải]
```

---

## Thuật toán / Mô hình cốt lõi

### 1. Hyperspectral Imaging hoạt động thế nào?

Camera thường chỉ thấy 3 màu (Đỏ–Lục–Lam). Camera siêu phổ nhìn được **hàng trăm dải ánh sáng** bao gồm cả tia hồng ngoại. Khi trái cây bắt đầu chín quá hoặc dập bên trong, cấu trúc hóa học thay đổi làm thay đổi cách nó phản xạ ánh sáng. Cảm biến "nhìn" thấy sự thay đổi này — phát hiện táo sắp hỏng **ngay cả khi vỏ ngoài trông vẫn bình thường**.

### 2. 4 Giai đoạn định giá động

| Giai đoạn | Freshness Score | Hành động | Giá |
|---|---|---|---|
| **1 — Tươi nhất** | 100% – 80% | Bán giá gốc | $p_1$ (cao nhất) |
| **2 — Kém tươi hơn** | 80% – 60% | Kích hoạt giảm giá nhẹ | $p_2 < p_1$ |
| **3 — Phân phối lại** | 60% – 20% | Chuyển sang quầy giảm giá sốc / bán cho xưởng nước ép | $p_3$ (rất rẻ) |
| **4 — Tiêu hủy** | < 20% | Làm thức ăn chăn nuôi / ủ phân | Chi phí tiêu hủy $c_D$ |

### 3. Stochastic Dynamic Programming (Quy hoạch động ngẫu nhiên)

**Bằng ngôn ngữ bình thường:** "Quy hoạch động" = chia bài toán lớn thành các quyết định nhỏ nối tiếp nhau. "Ngẫu nhiên" = nhu cầu khách hàng thay đổi không đoán trước được.

Mô hình tính: *Với lượng táo còn lại, mức độ tươi hiện tại và xác suất có khách mua — giá nào lúc này mang lại tổng tiền cao nhất vào cuối ngày?*

**Backward Induction (Quy nạp ngược):**
Thuật toán giải bài toán bằng cách đi **lùi từ tương lai**:
1. Tính trước chi phí tệ nhất ở Giai đoạn 4 (vứt bỏ)
2. Lùi về Giai đoạn 3 → tính giá tối ưu để tránh rơi vào Giai đoạn 4
3. Lùi về Giai đoạn 2, rồi Giai đoạn 1
4. Kết quả: biết ngay từ đầu nên bán giá bao nhiêu ở mỗi thời điểm

---

## Họ đo kết quả như thế nào?

- **Khối lượng lãng phí (Waste Volume):** Số lượng táo bị đẩy xuống Giai đoạn 4
- **Tổng lợi nhuận (Total Profit):** Doanh thu các giai đoạn − chi phí mua + tiêu hủy
- **Chất lượng dịch vụ (Service Level):** Cân bằng giữa chất lượng sản phẩm và giá cả

**Kết quả chính:** So với định giá tĩnh truyền thống, hệ thống giúp:
- Giảm đáng kể lượng thực phẩm phải mang ra bãi rác
- Biên lợi nhuận siêu thị tăng lên nhờ thu hồi được doanh thu ở Giai đoạn 2 thay vì để hàng hỏng mất trắng
- Hiệu suất kinh tế tổng thể cải thiện **~5–6%**

---

## Kết quả có đáng tin không?

**Điểm mạnh:**
- Kết hợp tốt giữa phần cứng IoT tiên tiến và thuật toán kinh tế tối ưu
- Đây là nghiên cứu thực tiễn (pilot thật), không chỉ là mô phỏng lý thuyết

**Hạn chế nghiêm trọng:**
- **Chỉ pilot trên táo** — loại quả cứng cáp, hỏng từ từ. Chưa biết có hoạt động tốt với dâu tây, rau xà lách, thịt cá (hỏng rất nhanh) không
- **Chi phí IoT cao:** Camera siêu phổ hiện giá hàng ngàn USD/chiếc — rào cản tài chính khổng lồ cho siêu thị vừa và nhỏ
- **Hành vi khách hàng:** Giá nhảy liên tục như vé máy bay có thể gây hoang mang và phàn nàn

---

## Nếu muốn tái tạo / áp dụng thì làm gì?

### Phần cứng cần thiết

| Thiết bị | Lựa chọn tiết kiệm hơn | Chi phí ước tính |
|---|---|---|
| Cảm biến độ tươi | Multispectral Camera (thay vì Hyperspectral) hoặc cảm biến khí Ethylene | $500–$3.000 |
| Xử lý biên | Raspberry Pi 4 hoặc NVIDIA Jetson Nano | $35–$150 |
| Bảng giá điện tử | Electronic Shelf Labels (ESL) | $10–$30/cái |

### Phần mềm
1. Mô hình Computer Vision (Python + OpenCV/PyTorch) để đọc ảnh → Freshness Score
2. Module tối ưu hóa giá: Python với Dynamic Programming libraries
3. API kết nối hệ thống giá ↔ bảng ESL

### Dữ liệu cần chuẩn bị
- Ảnh vòng đời sản phẩm từ lúc nhập về đến lúc hỏng (để train model CV)
- Lịch sử POS data (tối thiểu 6 tháng) để xây dựng phân phối nhu cầu khách hàng theo giờ/mức giá
