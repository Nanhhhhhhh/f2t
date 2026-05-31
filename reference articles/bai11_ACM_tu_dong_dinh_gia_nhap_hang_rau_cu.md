# Automated Pricing and Replenishment Decisions for Vegetables Based on Price Elasticity — Xiao Xue và cộng sự, 2025

**Hội nghị:** ACM DEAI 2025  
**DOI:** https://dl.acm.org/doi/10.1145/3745238.3745430  
**Dữ liệu nền:** Dataset từ cuộc thi CUMCM 2023 (Trung Quốc) — benchmark phổ biến cho bán lẻ thực phẩm tươi sống

---

## Họ giải quyết vấn đề gì?

Trong siêu thị truyền thống, **Định giá** và **Nhập hàng** thường do hai bộ phận hoàn toàn tách biệt quyết định:

| Bộ phận | Mục tiêu | Hậu quả nếu tách biệt |
|---|---|---|
| Nhập hàng | Đảm bảo kệ không trống → nhập dư | Rau ế, phải vứt bỏ |
| Định giá | Lấy lời cao nhất có thể | Giá cao → bán chậm → rau héo |

**Hậu quả:** Sự thiếu đồng bộ này gây lãng phí khổng lồ cho ngành rau củ — thực phẩm cực kỳ dễ hỏng (vòng đời tính bằng ngày, không phải tháng).

**Mục tiêu:** Tích hợp cả hai bài toán vào **một phương trình tối ưu hóa duy nhất**. Hệ thống AI trả lời đồng thời 2 câu hỏi mỗi sáng sớm:
1. *"Hôm nay nhập bao nhiêu kg mỗi loại rau?"*
2. *"Niêm yết giá bao nhiêu để tối đa lợi nhuận và tối thiểu vứt bỏ?"*

---

## Dữ liệu họ dùng

Dữ liệu lịch sử bán hàng thực tế (~3 năm) từ hệ thống POS của một siêu thị thực phẩm tươi sống:

| Feature | Mô tả |
|---|---|
| Mã SKU | Định danh từng loại rau (Rau ăn lá, Ớt, Nấm, Bắp cải...) |
| Thời gian bán | Timestamp theo giờ/ngày |
| Khối lượng bán (kg) | Lượng tiêu thụ thực tế |
| Giá bán lẻ ($/kg) | Giá niêm yết tại thời điểm bán |
| Giá nhập sỉ ($/kg) | Biến động theo từng ngày từ chợ đầu mối |
| Tỷ lệ hao hụt (%) | Phần trăm rau bị dập/bốc hơi trên kệ mỗi ngày |

---

## Cách tiếp cận (từng bước)

```
[Dữ liệu POS lịch sử] + [Giá nhập sỉ dự kiến ngày mai]
         │
         ▼
(Bước 1) Phân tích tương quan & mùa vụ
         │   ↳ Tìm quy luật: ngày lễ tăng, rau bina hay bán cùng nấm...
         ▼
(Bước 2) Mô hình hóa Độ co giãn giá (Price Elasticity)
         │   ↳ Từng loại rau nhạy cảm với giá đến mức nào?
         ▼
(Bước 3) Dự báo giá nhập sỉ ngày mai (ARIMA)
         │   ↳ Chợ đầu mối thay đổi giá liên tục → cần dự báo trước
         ▼
(Bước 4) Tối ưu hóa đa mục tiêu (Nonlinear Programming)
         │   ↳ Giải phương trình: tối đa lợi nhuận, tối thiểu vứt bỏ
         ▼
    ┌────┴────┬──────────────┐
    ▼         ▼              ▼
[Nhập bao  [Giá niêm    [Kịch bản markdown
nhiêu kg?]  yết sáng?]   chiều nếu còn tồn?]
```

---

## Thuật toán / Mô hình cốt lõi

### 1. Độ co giãn của giá (Price Elasticity) — trung tâm của toàn bộ hệ thống

**Định nghĩa:** Đo lường mức độ thay đổi của lượng mua khi giá thay đổi 1%.

**Ví dụ số cụ thể:**

| Loại rau | Độ co giãn | Ý nghĩa thực tế | Chiến lược |
|---|---|---|---|
| Rau xà lách | Cao (−2.5) | Giảm 10% giá → lượng mua tăng 25% | **Nên giảm giá** để xả hàng nhanh |
| Tỏi, Hành tây | Thấp (−0.3) | Giảm 30% giá → lượng mua chỉ tăng 9% | **Không nên giảm giá** — tốn kém vô ích |

**Mô hình toán học:**
```
Q = a × P^b     (dạng log-linear)
hoặc
Q = a − b × P   (dạng tuyến tính)

Trong đó:
  Q = lượng bán (kg)
  P = giá bán ($/kg)
  b = hệ số co giãn (được ước lượng từ dữ liệu lịch sử)
```

### 2. Bài toán tối ưu hóa tích hợp (Joint Optimization)

**Hàm mục tiêu — Tối đa hóa lợi nhuận:**
```
Z = Σ (Giá Bán × Lượng Bán) − (Giá Nhập × Lượng Nhập)
```

**Ràng buộc cốt lõi:**
```
Lượng Nhập × (1 − Tỷ lệ hao hụt) ≥ Lượng Bán
  ↳ Không thể bán nhiều hơn số có trên kệ (trừ phần hư hỏng)

Σ Lượng Nhập ≤ Không gian kệ hàng tối đa
  ↳ Diện tích quầy rau có giới hạn
```

### 3. Logic Markdown (Giảm giá động theo thời gian)

Rau củ mất giá trị theo thời gian trong ngày. Nếu đến 4h chiều mà tồn kho vẫn còn 40%:
1. Thuật toán tính: "Cần giảm P xuống bao nhiêu để lượng Q tăng đủ dọn sạch kệ trước 8h tối?"
2. Dựa vào hệ số co giãn đã có → ra con số giá mới cụ thể
3. Cập nhật lên bảng giá điện tử

> **Điểm khác biệt với giảm giá truyền thống:** Thay vì giảm đồng loạt 30% tất cả hàng cận date, mô hình giảm **đúng mức cần thiết cho từng loại rau** dựa trên độ co giãn — tránh bán rẻ những mặt hàng ít nhạy cảm với giá.

---

## Họ đo kết quả như thế nào?

**Metrics chính:**
- **Gross Profit Margin** — Lợi nhuận gộp
- **Revenue** — Tổng doanh thu
- **Waste/Spoilage Rate** — Tỷ lệ rau hỏng phải vứt bỏ

**So sánh với baseline (phương pháp truyền thống):**

| Phương pháp | Định giá | Nhập hàng | Kết quả |
|---|---|---|---|
| Truyền thống | Cost-plus cố định | EOQ kinh điển | Nhiều waste, lợi nhuận thấp hơn |
| **Joint Optimization (đề xuất)** | **Động theo elasticity** | **Tối ưu theo dự báo cầu** | **Waste giảm + lợi nhuận tăng** |

---

## Kết quả có đáng tin không?

**Điểm cộng:**
- Backtest trên dữ liệu giao dịch thực tế quy mô lớn (không chỉ simulation thuần túy)
- Dùng Evolutionary Algorithms → tránh bị kẹt ở "lợi nhuận cục bộ"
- Dataset CUMCM 2023 là benchmark được kiểm chứng rộng rãi trong cộng đồng

**Hạn chế:**
- Chủ yếu là **backtest/simulation** — chưa có kết quả từ deployment thực tế tại siêu thị đang hoạt động
- Chưa tính các cú sốc ngoại sinh: mưa bão đột ngột, siêu thị đối thủ phá giá, đứt gãy chuỗi cung ứng
- Giả định tỷ lệ hao hụt cố định — thực tế biến động theo thời tiết và cách bảo quản

---

## Nếu muốn tái tạo / áp dụng thì làm gì?

### Tech Stack (không cần server khủng)
```
Python 3.x
├── statsmodels       ← ARIMA dự báo giá nhập sỉ
├── scipy.optimize    ← Tối ưu hóa nonlinear programming (miễn phí)
│   hoặc Gurobi      ← Mạnh hơn, có bản academic miễn phí
├── pandas / numpy    ← Tiền xử lý dữ liệu
└── scikit-learn      ← Ước lượng hệ số co giãn
```

Chạy batch-job lúc **11h đêm mỗi ngày** → ra kết quả nhập hàng + giá niêm yết cho ngày hôm sau.

### Dữ liệu cần chuẩn bị
1. **Lịch sử POS:** Tối thiểu 1–2 năm, bao gồm timestamp, lượng bán, giá bán theo từng giờ
2. **Sổ ghi hao hụt hàng ngày:** Nhiều siêu thị Việt Nam bỏ qua bước này — đây là dữ liệu **quan trọng nhất** để mô hình hoạt động đúng
3. **Lịch sử giá nhập sỉ từ chợ đầu mối:** Cần ít nhất 1 năm để ARIMA ước lượng được

### Điều kiện tiên quyết để hệ thống hoạt động
> Cần có **Bảng giá điện tử (ESL — Electronic Shelf Labels)**. Nếu không có ESL, hệ thống đề xuất đổi giá lúc 4h chiều nhưng nhân viên quên in lại tem giấy → toàn bộ mô hình thất bại.

### Lộ trình triển khai đề xuất
1. **Tháng 1:** Pilot chỉ 1 danh mục (ví dụ: Rau ăn lá — dễ hỏng nhất, nhiều data nhất)
2. **Tháng 2–3:** Đánh giá kết quả, tinh chỉnh hệ số co giãn theo từng loại rau
3. **Tháng 4+:** Scale ra toàn bộ quầy rau củ
