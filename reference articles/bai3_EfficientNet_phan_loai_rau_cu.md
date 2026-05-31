# Agricultural development driven by the digital economy: improved EfficientNet vegetable quality grading — Jun Wen & Jing He, 2024

**Tạp chí:** Frontiers in Sustainable Food Systems  
**URL:** https://www.frontiersin.org/journals/sustainable-food-systems/articles/10.3389/fsufs.2024.1310042/full

---

## Họ giải quyết vấn đề gì?

**Bài toán thực tế:** Phân loại chất lượng rau củ theo 3 cấp độ (Đặc biệt / Loại 1 / Loại 2) trước khi đưa ra thị trường.

**Tại sao thủ công tốn kém/không chính xác:** Việc phân loại nông sản hiện chủ yếu dựa vào sức người — tốn nhiều thời gian, chi phí nhân công cao và dễ thiếu đồng nhất do cảm tính và mệt mỏi. Phân loại kém khiến các lô hàng bị trộn lẫn chất lượng, làm giảm giá trị thương mại.

**Mục tiêu của bài báo:** Xây dựng một mô hình Deep Learning vừa có độ chính xác cao trong việc nhận diện các khuyết tật nhỏ trên bề mặt rau củ, vừa **nhẹ** (ít tham số) để dễ dàng cài đặt lên thiết bị phần cứng rẻ tiền trong nông nghiệp.

---

## Dữ liệu họ dùng

| Thuộc tính | Chi tiết |
|---|---|
| **Loại rau củ** | 6 loại: rau diếp, súp lơ xanh, cà chua, tỏi, mướp đắng, cải thảo |
| **Số ảnh** | 3.600 ảnh (600 ảnh/loại) |
| **Nguồn gốc** | Thu thập trực tiếp tại các siêu thị |
| **Người gán nhãn** | Chuyên gia gán nhãn thủ công |
| **Train/Test split** | 80/20 — 480 ảnh train + 120 ảnh test cho mỗi loại |

**3 cấp độ nhãn:**
- **Đặc biệt:** Đẹp mắt, đồng đều, không vết sâu bệnh, rất tươi
- **Loại 1:** Một chút không đồng đều, tổn thương cực nhỏ
- **Loại 2:** Hình thức xấu, có dấu vết sâu bệnh hoặc héo

---

## Cách tiếp cận (từng bước)

```
[Ảnh Rau Củ từ siêu thị]
        │
        ▼
[Bước 1: Tiền xử lý — Resize & Crop ảnh cho đồng nhất]
        │
        ▼
[Bước 2: Chọn EfficientNet làm khung cơ sở (nhẹ + hiệu quả)]
        │
        ▼
[Bước 3: Thay module SE → CA (Coordinate Attention)]
        │   ↳ Giúp AI biết CHÍNH XÁC TỌA ĐỘ vết sâu/hỏng nằm ở đâu
        ▼
[Bước 4: Gắn thêm CBAM trước lớp phân loại cuối]
        │   ↳ Giúp AI BỎ QUA phông nền, chỉ tập trung vào bề mặt rau củ
        ▼
[Bước 5: Huấn luyện & So sánh với VGGNet16, ResNet50, DenseNet169]
        │
        ▼
[Kết quả: Hàng Đặc Biệt / Loại 1 / Loại 2]
```

---

## Thuật toán / Mô hình cốt lõi

### EfficientNet là gì?
Kiến trúc CNN của Google. Thay vì chỉ tăng độ sâu (nhiều lớp) như các mạng cũ, EfficientNet mở rộng đồng đều cả 3 chiều: chiều sâu, chiều rộng và độ phân giải ảnh. Nhờ đó nội suy đặc trưng tốt nhưng **cực kỳ nhẹ**.

### Tại sao thêm CA (Coordinate Attention)?
EfficientNet gốc có module SE, nhưng SE "mù" về mặt không gian — chỉ biết *loại đặc trưng* nào quan trọng, không biết *ở đâu*. Module CA mã hóa cả trục dọc (X) và trục ngang (Y) vào bản đồ đặc trưng.

> **Ví dụ trực quan:** CA giống như cấp cho AI một hệ thống GPS — thay vì chỉ biết "quả cà chua có vết hỏng", nó biết chính xác vết hỏng nằm ở tọa độ nào trên quả.

### Tại sao thêm CBAM?
CBAM là cơ chế chú ý kép — kết hợp cả chú ý về kênh (channel) lẫn không gian (spatial). Đặt ở bước cuối cùng, nó bảo AI: "Dồn 100% sự tập trung vào bề mặt vỏ tỏi, lờ đi phông nền siêu thị phía sau."

**Công thức tóm tắt:**
- CA: phân rã Global Pooling thành 2 bộ mã hóa 1D (theo chiều dọc + chiều ngang) để bảo toàn tọa độ không gian
- CBAM: dùng MLP + AvgPool/MaxPool cho Channel Attention; lớp Conv 7×7 cho Spatial Attention

---

## Họ đo kết quả như thế nào?

**Metrics:** Accuracy, F1-score, số tham số mô hình (đo độ nhẹ/nặng)

| Mô hình | Accuracy | Số tham số |
|---|---|---|
| **CA-EfficientNet-CBAM (đề xuất)** | **95.12%** | **5M** |
| VGGNet16 | 86.78% | 47M |
| ResNet50 | 88.45% | 42M |
| DenseNet169 | 90.83% | 21M |

- Mô hình hội tụ nhanh chỉ trong **30–50 epochs**
- Nhẹ hơn VGG **gần 10 lần**, chính xác hơn **+8.34%**

---

## Kết quả có đáng tin không?

**Điểm mạnh:**
- Accuracy 95.12% rất ấn tượng
- Mô hình 5M tham số — có thể chạy trên Raspberry Pi hoặc Jetson Nano (thiết bị rẻ tiền)
- Ablation study chứng minh đóng góp độc lập của từng module CA và CBAM

**Điểm yếu / Giới hạn:**
- Chỉ "biết" 6 loại rau — đưa cam hay cà rốt vào thì mô hình không hoạt động tốt
- 3.600 ảnh là **tương đối nhỏ** cho Deep Learning; cần dataset lớn hơn để đảm bảo tính tổng quát
- Chưa test trong điều kiện ánh sáng và độ ẩm thực tế ngoài siêu thị

---

## Nếu muốn tái tạo / áp dụng thì làm gì?

| Hạng mục | Chi tiết |
|---|---|
| **Framework** | Python 3.8 + PyTorch 1.10.0 |
| **Dataset** | Không có link công khai — email tác giả: hejing642023@126.com |
| **GPU để train** | RTX 3090 (24GB VRAM) — có thể thuê cloud GPU (~$1–2/giờ) |
| **Phần cứng để chạy thực tế** | Raspberry Pi (~$35–80) hoặc Jetson Nano (~$100–150) là đủ |
| **Bước đầu để thử** | Tìm EfficientNet pretrained trên PyTorch Hub, thêm CA + CBAM theo mô tả bài báo, fine-tune trên ảnh rau củ tự chụp |
