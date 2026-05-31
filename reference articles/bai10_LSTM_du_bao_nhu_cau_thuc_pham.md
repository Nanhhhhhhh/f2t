# Demand Forecasting Models for Food Industry by Utilizing Machine Learning Approaches — Nouran Nassibi, Heba Fasihuddin & Lobna Hsairi, 2023

**Tạp chí:** International Journal of Advanced Computer Science and Applications (IJACSA), Vol. 14, No. 3  
**URL PDF:** https://thesai.org/Downloads/Volume14No3/Paper_101-Demand_Forecasting_Models_for_Food_Industry_by_Utilizing_Machine_Learning.pdf

---

## Họ giải quyết vấn đề gì?

**Vấn đề cốt lõi:** Ngành thực phẩm (đặc biệt hàng dễ hỏng) luôn đau đầu với bài toán dự báo nhu cầu:
- Dự báo **cao hơn thực tế** → tồn kho quá mức → hàng hết hạn → vứt bỏ → tổn thất tài chính
- Dự báo **thấp hơn thực tế** → thiếu hụt hàng → mất doanh thu → khách hàng không hài lòng

**Tại sao ARIMA truyền thống thất bại:**
- Chỉ xử lý được dữ liệu tuyến tính đơn giản
- Không tích hợp được nhiều biến số đầu vào (kênh phân phối, khu vực, khuyến mãi)
- Không nắm bắt được các quy luật phi tuyến phức tạp

**Mục tiêu:** Xây dựng mô hình Machine Learning dự báo doanh số chính xác cao cho nhà phân phối bánh kẹo, từ đó giảm lãng phí và tối ưu chuỗi cung ứng.

---

## Dữ liệu họ dùng

| Thuộc tính | Chi tiết |
|---|---|
| **Nguồn** | Công ty phân phối sô-cô-la lớn tại Ả Rập Xê Út (ẩn danh) |
| **Hệ thống** | Trích xuất từ SAP ERP |
| **Quy mô** | ~250.000 dòng giao dịch |
| **Số sản phẩm** | 200 SKU |
| **Thời gian** | 3 năm: 01/01/2018 – 31/12/2020 |

**Các features đầu vào:**

| Feature | Mô tả |
|---|---|
| Product Code | Mã sản phẩm |
| Posting Date | Ngày ghi nhận giao dịch |
| City | Thành phố (11 thành phố) |
| Distribution Channel | Kênh phân phối (6 kênh) |
| Net Value (SAR) | Giá trị bán ra (đồng Riyal) |
| Net Quantity | Số lượng bán |
| Returns Value | Giá trị hàng hoàn |
| Returns Quantity | Số lượng hàng hoàn |

**6 kênh phân phối:**
1. Key Account — Đại siêu thị (Carrefour, Panda...)
2. Wholesale — Bán buôn
3. Mini Markets — Siêu thị mini
4. Convenience Stores — Trạm xăng / cửa hàng tiện lợi
5. New Channel — Chuỗi đồ chơi, nhà thuốc...
6. Cash Van — Xe tải bán hàng trực tiếp

**11 thành phố:** Riyadh, Jeddah, Taif, Dammam, Qassim, Makkah, Eihsa, Madina, Tabuk, Jizan, Khamis

---

## Cách tiếp cận (từng bước)

**Bước 1 — Thu thập & Tiền xử lý:**
- Trích xuất dữ liệu từ SAP
- Loại bỏ giá trị nhiễu, xử lý missing values
- Tách biệt doanh số bình thường / khuyến mãi / hàng hoàn

**Bước 2 — Feature Engineering:**
- Tổng hợp giao dịch hàng ngày → chuỗi thời gian theo tháng/quý
- Phân đoạn (segment) theo từng thành phố × kênh phân phối
- Mục đích: giúp mô hình nhìn thấy **tính mùa vụ** rõ ràng hơn

**Bước 3 — Huấn luyện mô hình:**
- Áp dụng song song: LSTM (Deep Learning) và SVM Regression (baseline)
- Dữ liệu 2018–2019 dùng để train, 2020 dùng để test

**Bước 4 — Đánh giá:**
- Đối chiếu dự báo với doanh số thực tế theo từng quý
- Đo bằng MAPE và RMSE

---

## Thuật toán / Mô hình cốt lõi

### LSTM (Long Short-Term Memory)

**Giải thích trực quan:**  
Hãy tưởng tượng bạn đang đọc một cuốn tiểu thuyết dài. Bạn không cần nhớ từng từ, mà chỉ nhớ các chi tiết quan trọng từ chương trước để hiểu chương hiện tại. LSTM có một **"cuốn sổ tay trí nhớ"** — biết cách giữ lại xu hướng quan trọng từ nhiều tháng trước (tính mùa vụ) và tự động xóa thông tin nhiễu ngắn hạn.

**Tại sao phù hợp chuỗi thời gian?**  
LSTM là bản nâng cấp của RNN, giải quyết được bài toán "nhớ biểu đồ bán hàng dài hạn" — rất hoàn hảo để bắt được nhịp tiêu dùng theo mùa (Ramadan, Valentine, Tết...).

**4 Cổng (Gates) của LSTM:**

| Cổng | Chức năng | Ví dụ thực tế |
|---|---|---|
| **Forget Gate** | Quyết định thông tin quá khứ nào "hết hạn" và nên xóa | Đợt giảm giá bất thường 2 năm trước → không ảnh hưởng hôm nay |
| **Input Gate** | Xác định dữ liệu hôm nay có quan trọng để lưu vào trí nhớ không | Doanh số tăng vọt đầu tháng Ramadan → quan trọng, cần nhớ |
| **Cell State** | "Cuốn sổ tay" lưu trữ — cập nhật bằng cách xóa cũ, chép thêm mới | Bộ nhớ dài hạn về quy luật mùa vụ |
| **Output Gate** | Đưa ra con số dự báo dựa trên trí nhớ hiện tại | Dự báo doanh số tuần tới = X thùng |

**Công thức (rút gọn):**
```
f_t = σ(W_f · [h_{t-1}, x_t] + b_f)        ← Forget gate
i_t = σ(W_i · [h_{t-1}, x_t] + b_i)        ← Input gate
C̃_t = tanh(W_C · [h_{t-1}, x_t] + b_C)    ← Candidate cell state
C_t = f_t * C_{t-1} + i_t * C̃_t           ← Update cell state
o_t = σ(W_o · [h_{t-1}, x_t] + b_o)        ← Output gate
h_t = o_t * tanh(C_t)                       ← Hidden state (đầu ra)
```

### SVM Regression (Baseline)

Thuật toán Học máy có giám sát, vẽ ra một "đường ống" (margin) bao trọn được nhiều điểm dữ liệu nhất với mức sai số cho phép. Dùng làm **mốc cơ sở** để chứng minh LSTM ưu việt hơn đến mức nào.

---

## Họ đo kết quả như thế nào?

**MAPE (Mean Absolute Percentage Error):** Sai số phần trăm trung bình
- < 10% = Xuất sắc
- 10–20% = Tốt
- > 20% = Kém

**RMSE (Root Mean Square Error):** Độ lệch tuyệt đối về số lượng — số càng nhỏ càng sát thực tế

**Bảng kết quả LSTM vs SVM:**

| Phân đoạn | LSTM MAPE | SVM MAPE |
|---|---|---|
| **Trung bình toàn bộ** | **8.71%** | **37.8%** |
| Riyadh (thành phố lớn) | 3.78% | 6.8% |
| Jeddah (thành phố lớn) | 3.48% | 15.9% |
| Thành phố nhỏ | ~12–18% | ~40–50% |

> LSTM giảm sai số **77%** so với SVM

---

## Kết quả có đáng tin không?

**Ý nghĩa của con số 77%:**  
Không chỉ là con số hàn lâm. Trong ngành thực phẩm, điều này tương đương với việc cứu hàng triệu USD khỏi bị vứt đi do hết date và giảm áp lực dòng tiền lưu kho.

**Trường hợp dự báo kém:**
- Năm 2020 có **COVID-19** — hành vi mua sắm hoảng loạn làm nhiễu dữ liệu nặng nề
- Chưa tách biệt "Doanh số khuyến mãi" thành biến độc lập → mô hình lầm tưởng tăng đột biến là nhu cầu tự nhiên
- Thành phố nhỏ ít dữ liệu → mô hình kém chính xác hơn nhiều

**Giới hạn khi áp dụng cho hàng dễ hỏng khác:**  
Sô-cô-la có hạn dùng tính bằng tháng. Nếu áp dụng cho rau củ tươi (tính bằng ngày), cần thay đổi tần suất từ **quý/tháng → ngày/giờ**.

---

## Nếu muốn tái tạo / áp dụng thì làm gì?

**Tech Stack:**
```
Python 3.x
├── TensorFlow/Keras     ← Xây dựng mạng LSTM
├── Scikit-Learn         ← SVM, preprocessing, cross-validation
├── Pandas / NumPy       ← Tiền xử lý & feature engineering
└── Matplotlib           ← Trực quan hóa kết quả
```

**Yêu cầu dữ liệu (Cold Start):**
- Tối thiểu **2–3 năm lịch sử giao dịch** — cần đi qua ít nhất 2 chu kỳ mùa vụ
- Bắt buộc có: timestamp (giờ bán), số lượng, giá bán, giá vốn, kênh phân phối

**Tích hợp thực tiễn:**
1. Xây dựng Data Pipeline tự động hút dữ liệu từ POS hoặc ERP (SAP/Odoo)
2. Chạy model batch-job hàng đêm → đầu ra là số lượng dự báo cho ngày mai
3. Nạp kết quả vào hệ thống ERP làm **Reorder Point** → tự động tạo đơn nhập hàng

> **Mở rộng đề xuất:** Kết hợp đầu ra của LSTM này với hệ thống dynamic pricing (như Bài 11) để tạo vòng lặp tự động hoàn chỉnh: dự báo cầu → quyết định nhập → tự động định giá theo tồn kho thực tế.
