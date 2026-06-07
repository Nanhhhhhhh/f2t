# Report 1 — ForecasterLSTM: Kiến trúc Chi tiết

> Codebase: `dynamic-pricing-final/src/forecaster/`  
> Sidecar: `pricing-sidecar/main.py`  
> Mức độ: Tự đủ — mọi thuật ngữ đều được định nghĩa trong tài liệu này

---

## 0. Từ điển khái niệm

Phần này định nghĩa mọi thuật ngữ kỹ thuật được dùng trong report. Đọc trước khi đọc các phần còn lại.

### Tensor
Mảng số nhiều chiều. Một vector là tensor 1 chiều, một ma trận là tensor 2 chiều. Trong deep learning, dữ liệu luôn được biểu diễn dưới dạng tensor.

### Shape notation: `(B, T, D)`
Mô tả kích thước của tensor. `(B, T, D)` = tensor 3 chiều:
- Chiều 0 có kích thước `B`
- Chiều 1 có kích thước `T`
- Chiều 2 có kích thước `D`

Ví dụ: `(32, 21, 10)` = 32 mẫu dữ liệu, mỗi mẫu có 21 bước thời gian, mỗi bước có 10 đặc trưng.

### Batch (B)
Trong khi training, dữ liệu được xử lý theo từng nhóm gọi là "batch" để tăng hiệu quả GPU. `B = batch_size`. Trong inference production, thường `B = 1` (xử lý từng sản phẩm).

### float32
Kiểu số thực dấu phẩy động 32-bit. Mỗi giá trị chiếm 4 bytes. Đây là kiểu mặc định cho neural network weights và activations.

### obs_dim (Observation Dimension)
Số lượng đặc trưng (features) mô tả trạng thái của một sản phẩm tại một thời điểm. Mỗi đặc trưng là một con số float. Toàn bộ các đặc trưng gộp lại tạo thành "observation vector".

### Embedding
Một lookup table có thể học được. Thay vì dùng số nguyên (ví dụ: category 0, 1, 2, 3), embedding chuyển mỗi số nguyên thành một vector số thực (ví dụ: 8 chiều). Các giá trị trong vector này được học trong quá trình training để biểu diễn ý nghĩa của category. Kỹ thuật này "differentiable" — gradient có thể chảy ngược qua phép lookup.

### Logit
Giá trị thực bất kỳ (âm, dương, hoặc zero) được xuất ra từ một linear layer **trước khi** áp dụng activation function. Đối với classification nhị phân, logit được truyền qua sigmoid để ra xác suất.

### Sigmoid
Hàm toán học: `σ(x) = 1 / (1 + e^{-x})`. Chuyển bất kỳ số thực nào thành giá trị thuộc `(0, 1)`. Dùng để tính xác suất từ logit.
```
x = -5  → σ(x) ≈ 0.007  (gần 0)
x =  0  → σ(x) = 0.500  (trung bình)
x = +5  → σ(x) ≈ 0.993  (gần 1)
```

### Dropout
Kỹ thuật regularization: trong khi training, ngẫu nhiên set một tỷ lệ `p` neurons về 0 ở mỗi forward pass. Ngăn model "phụ thuộc" quá nhiều vào bất kỳ neuron cụ thể nào → giảm overfitting. **Tắt hoàn toàn trong inference** (`model.eval()`).

### Hidden State `h_t`
Trong LSTM, `h_t ∈ ℝ^{hidden_size}` là vector "short-term memory" của timestep `t`. Nó được truyền sang timestep tiếp theo và cũng là output của LSTM tại timestep `t`. Đây là thứ ta lấy làm "tóm tắt chuỗi" sau timestep cuối.

### Cell State `c_t`
Trong LSTM, `c_t ∈ ℝ^{hidden_size}` là vector "long-term memory". Nó chạy dọc theo chuỗi thời gian với ít phép biến đổi hơn `h_t`, giúp thông tin lan truyền qua nhiều timestep mà không bị mất (gradient vanishing problem).

### Forward Pass
Quá trình tính toán output từ input, đi qua tất cả các layer từ trước ra sau. Không có update weight.

### Training mode vs Inference mode
- **Training mode** (`model.train()`): Dropout active, gradient được tính
- **Inference mode** (`model.eval()`): Dropout tắt, gradient không cần thiết (`torch.no_grad()` dùng để tiết kiệm memory)

### Linear Layer (Fully Connected)
Layer thực hiện phép biến đổi tuyến tính: `y = W·x + b`, trong đó `W` là weight matrix và `b` là bias vector. Đây là "khối xây dựng" cơ bản nhất của neural network.

### ReLU (Rectified Linear Unit)
Activation function: `ReLU(x) = max(0, x)`. Set mọi giá trị âm về 0, giữ nguyên giá trị dương. Tạo ra non-linearity để model học được các pattern phức tạp.

### Gradient
Đạo hàm của hàm loss theo một weight. Cho biết weight cần thay đổi theo hướng nào để giảm loss. Gradient chảy ngược từ output về input trong quá trình backpropagation.

---

## 1. Vị trí trong Hệ thống

```
┌─────────────────────────────────────────────────────────────┐
│                   Pipeline Pricing                          │
│                                                             │
│  Dữ liệu sản phẩm                                          │
│  (freshness, tồn kho, giá, ...)                             │
│          │                                                  │
│          ▼                                                  │
│  ┌───────────────────┐                                      │
│  │  _build_obs()     │  ← Tính obs vector 10 chiều         │
│  └────────┬──────────┘                                      │
│           │                                                 │
│           ├─────────────────────────┐                       │
│           │                         │                       │
│           ▼                         ▼                       │
│  ┌─────────────────┐    ┌─────────────────────────────┐    │
│  │ ForecasterLSTM  │    │  DDQN (SharedMLPDuelingQNet) │    │
│  │                 │    │                             │    │
│  │ Input: obs[10]  │    │ Input: obs[10] + demand_7d  │    │
│  │ Output:         │───▶│ Output: action (delta giá)  │    │
│  │  • demand_7d    │    │                             │    │
│  │  • pWaste       │    └─────────────────────────────┘    │
│  └─────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
```

ForecasterLSTM được gọi **trước** DDQN. Output `demand_7d` của nó được inject vào `obs[5]` (demand_ratio) trước khi DDQN quyết định hành động.

### Tại sao tách ForecasterLSTM riêng thay vì để DDQN tự học?

DDQN là Reinforcement Learning — nó học qua trial-and-error trong môi trường giả lập. Nếu DDQN cần đồng thời học cả "dự báo cầu" lẫn "quyết định giá tối ưu", bài toán quá phức tạp và cần hàng triệu bước training mới hội tụ. Tách ra 2 model theo kiến trúc **hierarchical**:
1. LSTM học dự báo cầu từ supervised data (nhanh, ổn định)
2. DDQN nhận demand forecast như một input đã tính sẵn → không cần tự học phần này

---

## 2. Hai Outputs Cần Dự Báo

### Output 1: `demand_7d`

| Thuộc tính | Giá trị |
|-----------|---------|
| Ý nghĩa | Tổng số đơn vị hàng hóa dự kiến bán được trong **7 ngày tới** |
| Đơn vị | Số đơn vị (kg, bó, hộp — tùy sản phẩm) |
| Kiểu | Regression (số thực liên tục) |
| Range tại training | `[0, +∞)` — unbounded, raw linear output |
| Range tại inference | `[0, +∞)` — clip `max(0, ·)` để loại giá trị âm vô nghĩa |
| Ví dụ | `demand_7d = 15.3` → dự báo bán ~15 đơn vị trong tuần tới |

**Tại sao cần:** DDQN cần biết cầu tương lai để ra quyết định hôm nay. Cầu cao + tồn kho thấp → nên tăng giá hoặc giữ nguyên. Cầu thấp + tồn kho cao + hàng sắp hỏng → nên giảm giá ngay.

### Output 2: `pWaste`

| Thuộc tính | Giá trị |
|-----------|---------|
| Ý nghĩa | Xác suất hàng bị hỏng/lãng phí trong 7 ngày tới |
| Đơn vị | Xác suất, không đơn vị |
| Kiểu | Binary classification (0 = không waste, 1 = có waste) |
| Range | `(0, 1)` sau sigmoid |
| Ví dụ | `pWaste = 0.73` → 73% khả năng hàng sẽ bị hỏng tuần tới |

**Tại sao cần:** Cảnh báo nguy cơ lãng phí để hệ thống giảm giá kịp thời. Kết hợp với `demand_7d`, cho phép DDQN cân bằng giữa "bán được nhiều" và "tránh lãng phí".

---

## 3. ForecasterConfig — Từng Tham Số

```python
@dataclass
class ForecasterConfig:
    obs_dim:       int   = 11
    window:        int   = 21
    n_categories:  int   = 4
    cat_embed_dim: int   = 8
    lstm_hidden:   int   = 128
    lstm_layers:   int   = 2
    lstm_dropout:  float = 0.2
```

### `obs_dim = 11`
**Là gì:** Số chiều của một observation vector tại một timestep.  
**Tại sao 11 ở training nhưng 10 ở production:** Trong quá trình phát triển, một feature đã bị loại bỏ giữa training và deployment. Training environment (`MarketEnv`) tạo ra obs 11 chiều; sidecar production tính obs 10 chiều.  
**Cách xử lý:** Checkpoint lưu giá trị `obs_dim` thực tế. Sidecar đọc từ checkpoint và pad/truncate input cho khớp. Chi tiết ở Section 14.

### `window = 21`
**Là gì:** Số timestep (ngày) trong chuỗi input vào LSTM.  
**Tại sao 21:** 3 tuần = 3 chu kỳ weekly seasonality (7 ngày/chu kỳ). Đủ để LSTM bắt được pattern cuối tuần (mua nhiều hơn) và trend hàng tuần. Nếu window quá ngắn (ví dụ 7): không đủ context. Nếu quá dài (ví dụ 60): training chậm, dễ overfitting.

### `n_categories = 4`
**Là gì:** Số loại category sản phẩm mà model hỗ trợ: `leafy, root, fruit, herbs`.  
**Dùng để làm gì:** Kích thước của Embedding lookup table (4 rows).

### `cat_embed_dim = 8`
**Là gì:** Số chiều của category embedding vector.  
**Tại sao 8:** Category embedding cần đủ chiều để biểu diễn sự khác biệt giữa 4 categories (decay rate, seasonality, demand baseline). 8 chiều cho 4 categories là "generous" — mỗi category có ~2 chiều "riêng". Tăng lên 16 hoặc 32 không cải thiện đáng kể với chỉ 4 categories.

### `lstm_hidden = 128`
**Là gì:** Số lượng "neuron" (hidden units) trong mỗi LSTM layer. Kích thước của vector `h_t` và `c_t`.  
**Tại sao 128:** Điểm cân bằng giữa capacity và efficiency. 64 → underfitting (không học được interaction phức tạp giữa freshness, demand, seasonality). 256 → overfitting với synthetic data, training chậm hơn. 128 là lựa chọn phổ biến cho bài toán tabular time-series tầm trung.

### `lstm_layers = 2`
**Là gì:** Số LSTM layers xếp chồng (stacked LSTM).  
**Tại sao 2:** Layer 1 học low-level temporal pattern (freshness giảm mỗi ngày, demand biến thiên theo tuần). Layer 2 nhận output layer 1 và học higher-level abstraction (trend 3 tuần, waste risk trajectory). Thêm layer 3 trở đi tăng rủi ro vanishing gradient và ít cải thiện với window ngắn.

### `lstm_dropout = 0.2`
**Là gì:** Tỷ lệ dropout áp dụng **giữa** các LSTM layers (không phải sau layer cuối).  
**Tại sao 0.2:** 20% neurons bị zero-out ngẫu nhiên mỗi forward pass trong training → regularization, giảm overfitting. Giá trị 0.1-0.3 là range phổ biến. Cao hơn 0.5 làm mất quá nhiều thông tin.  
**Quan trọng:** Với `lstm_layers=2`, PyTorch chỉ apply dropout trên output của layer 1 (trước khi vào layer 2). Layer 2 không bị dropout ở output vì PyTorch không apply dropout sau layer cuối.

---

## 4. Observation Vector — 10 Chiều

Mỗi sản phẩm tại mỗi thời điểm được biểu diễn bằng vector 10 số. Đây là "ngôn ngữ chung" giữa thế giới thực và model neural.

```
obs = [obs[0], obs[1], obs[2], obs[3], obs[4],
       obs[5], obs[6], obs[7], obs[8], obs[9]]
       shape: (10,)  dtype: float32
```

### `obs[0]` — Freshness (Độ tươi)
```
Giá trị:  clip(freshness, 0.0, 1.0)
Range:    [0.0, 1.0]
Nguồn:    FreshnessCache.medianScore (backend)
          hoặc Weibull fallback = λ^24 nếu chưa có scan
```
- `1.0` = hoàn toàn tươi (hàng mới nhập)
- `0.5` = ngưỡng waste — dưới đây hàng bị coi là hỏng
- `0.0` = hỏng hoàn toàn

Freshness giảm tự nhiên mỗi ngày theo `daily_decay`:
```
f_{t+1} = f_t × λ_cat

λ_leafy = 0.850  → rau lá mất 15% freshness/ngày
λ_root  = 0.950  → rau củ mất  5% freshness/ngày (bền nhất)
λ_fruit = 0.880  → trái cây mất 12%/ngày
λ_herbs = 0.800  → rau thơm mất 20%/ngày (hỏng nhanh nhất)
```

### `obs[1]` — Inventory Ratio (Tỷ lệ tồn kho)
```
Giá trị:  min(availableQuantity / 100, 2.0)
Range:    [0.0, 2.0]
Nguồn:    product.availableQuantity (database)
```
- Normalize tồn kho về đơn vị "bình thường". 100 đơn vị được chọn làm baseline.
- `0.0` = hết hàng
- `1.0` = tồn kho "bình thường" (100 đơn vị)
- `2.0` = tồn kho rất nhiều (≥200 đơn vị, bị cap)
- Cap tại 2.0 để tránh outliers khi có quá nhiều hàng

### `obs[2]` và `obs[3]` — Day-of-Week Encoding
```
dow     = datetime.now().weekday()   # 0=Thứ Hai, 6=Chủ Nhật
obs[2]  = sin(2π × dow / 7)
obs[3]  = cos(2π × dow / 7)
```

**Tại sao dùng sin/cos thay vì số nguyên (0-6)?**

Nếu dùng số nguyên trực tiếp: Chủ Nhật = 6, Thứ Hai = 0. Model sẽ nghĩ Chủ Nhật và Thứ Hai "rất xa nhau" trong khi thực tế chúng liền kề (tuần mới). Encoding vòng tròn (circular encoding) giải quyết điều này: khoảng cách giữa Chủ Nhật và Thứ Hai = khoảng cách giữa Thứ Hai và Thứ Ba.

```
Thứ Hai (0):    sin=0.000, cos=1.000
Thứ Ba  (1):    sin=0.782, cos=0.623
Thứ Tư  (2):    sin=0.975, cos=-0.223
Thứ Năm (3):    sin=0.782, cos=-0.901
Thứ Sáu (4):    sin=0.000, cos=-1.000   ← peak weekend shopping prep
Thứ Bảy (5):    sin=-0.782, cos=-0.623
Chủ Nhật(6):    sin=-0.975, cos=0.223
```

Hai chiều (sin + cos) cùng nhau xác định duy nhất một ngày trong tuần trên đường tròn đơn vị.

### `obs[4]` — Days to Restock (Ngày còn đến lần nhập hàng)
```
Giá trị:  min(days_to_restock / 30, 1.0)
Range:    [0.0, 1.0]
Nguồn:    farm.restockSchedule (database)
          hoặc fallback = 5 ngày
```
- Normalize bằng cách chia cho 30 (một tháng).
- `0.0` = hôm nay có nhập hàng (hoặc đã quá hạn)
- `0.17` ≈ 5 ngày nữa mới nhập
- `1.0` = ≥30 ngày mới nhập (cap)

**Tại sao quan trọng:** Biết ngày nhập hàng sắp đến giúp model quyết định có cần giảm giá để bán hết hàng cũ trước không.

### `obs[5]` — Demand Ratio (Tỷ lệ cầu so với baseline)
```
Giá trị:  clip((demand_7d / 7.0) / BASE_DEMAND[cat], 0.0, 3.0)
Range:    [0.0, 3.0]
Nguồn:    output của ForecasterLSTM (demand_7d)
```
- Tính cầu trung bình ngày = `demand_7d / 7`
- Chia cho baseline của category:
  ```
  BASE_DEMAND = {"leafy": 7.463, "root": 5.631,
                 "fruit": 2.050, "herbs": 4.575}
  ```
- `1.0` = cầu đúng bằng baseline bình thường
- `2.0` = cầu gấp đôi bình thường (sắp hết hàng)
- `0.0` = không ai mua (hoặc dự báo thất bại)
- Cap tại 3.0 để tránh outliers

**Đây là circular dependency:** obs[5] cần output của ForecasterLSTM, nhưng ForecasterLSTM nhận cả obs vector này làm input!

**Giải pháp:** Khi gọi `/forecast`, `demand_7d = 0.0` được gửi vào → obs[5] = 0 → LSTM dự báo demand. Sau đó DDQN nhận obs với obs[5] được cập nhật từ kết quả LSTM.

### `obs[6]` — Previous Delta (Thay đổi giá lần trước)
```
Giá trị:  clip(prev_delta, -0.30, 0.20)
Range:    [-0.30, 0.20]
Nguồn:    PriceOverride.deltaPct / 100 (database)
          hoặc 0.0 nếu chưa có override
```
- `prev_delta` là tỷ lệ thay đổi giá tại lần pricing tick trước (-30% đến +20%)
- `0.0` = giữ nguyên giá lần trước
- `-0.15` = lần trước đã giảm 15%
- `+0.10` = lần trước đã tăng 10%

**Tại sao quan trọng:** Giúp DDQN tránh thay đổi giá đột ngột (oscillation). Reward có thành phần `r_smooth = -0.5 × |δ - prev_delta|` penalize thay đổi lớn.

### `obs[7]` — Competitor Ratio (Tỷ lệ giá cạnh tranh)
```
Giá trị:  clip(competitor_ref_price / base_price, 0.5, 2.0)
Range:    [0.5, 2.0]
Nguồn:    Trung bình giá sản phẩm cùng category trong vòng 10km
          (geo query MongoDB) hoặc base_price × 0.95 (fallback)
```
- `1.0` = giá mình bằng giá competitor
- `0.8` = competitor bán rẻ hơn 20% → mình nên giảm giá
- `1.2` = competitor bán đắt hơn 20% → mình có thể tăng giá
- Clip [0.5, 2.0] loại outliers cực đoan

### `obs[8]` — Days to Waste (Ngày còn đến khi hàng hỏng)
```
Giá trị:  clip(days_to_waste, 0.0, 14.0) / 14.0
Range:    [0.0, 1.0]

Công thức tính days_to_waste:
  Nếu freshness <= WASTE_THRESHOLD (0.5) hoặc decay >= 1.0:
    days_to_waste = 0  (đã hỏng hoặc không decay)
  Ngược lại:
    days_to_waste = log(WASTE_THRESHOLD / freshness) / log(daily_decay)
                 = log(0.5 / f) / log(λ_cat)
```

**Giải thích công thức:** Tìm số ngày `n` sao cho `f × λ^n = 0.5`:
```
f × λ^n = 0.5
λ^n = 0.5 / f
n × log(λ) = log(0.5 / f)
n = log(0.5 / f) / log(λ)
```

**Ví dụ với leafy (λ=0.85, f=0.9):**
```
n = log(0.5 / 0.9) / log(0.85)
  = log(0.556) / log(0.85)
  = (-0.588) / (-0.163)
  = 3.6 ngày
obs[8] = clip(3.6, 0, 14) / 14 = 0.257
```
→ Rau lá hiện tại còn 3.6 ngày trước khi hỏng.

Normalize bằng 14 (2 tuần): `0.0` = hỏng rồi; `1.0` = còn ≥14 ngày.

### `obs[9]` — Inventory Coverage (Tồn kho đủ bán mấy ngày)
```
inv_units   = inventory_ratio × 100    (số đơn vị ước tính)
inv_coverage = inv_units / max(demand_7d, 1.0)

Giá trị:  clip(inv_coverage, 0.0, 3.0) / 3.0
Range:    [0.0, 1.0]
```
- `inv_coverage = 2` = tồn kho đủ bán 2 lần demand dự báo 7 ngày
- `0.0` = hết hàng
- `1.0` = tồn kho bằng đúng demand dự báo
- `> 1.0` = dư tồn kho (nguy cơ waste)

Normalize bằng 3.0: clip cao hơn 3× demand thành 1.

### Tổng hợp Observation Vector

```
Chỉ số | Tên             | Range      | Ý nghĩa
-------|-----------------|------------|------------------------------------------
obs[0] | freshness       | [0.0, 1.0] | Độ tươi hiện tại
obs[1] | inv_ratio       | [0.0, 2.0] | Tồn kho / 100
obs[2] | sin_dow         | [-1.0,1.0] | Ngày trong tuần (sin)
obs[3] | cos_dow         | [-1.0,1.0] | Ngày trong tuần (cos)
obs[4] | days_restock    | [0.0, 1.0] | Ngày đến nhập hàng / 30
obs[5] | demand_ratio    | [0.0, 3.0] | Cầu trung bình / baseline
obs[6] | prev_delta      | [-0.30,0.20]| Delta giá lần trước
obs[7] | comp_ratio      | [0.5, 2.0] | Giá competitor / giá mình
obs[8] | days_to_waste   | [0.0, 1.0] | Ngày đến waste / 14
obs[9] | inv_coverage    | [0.0, 1.0] | Tồn kho / demand / 3
```

---

## 5. Input Stage

```
features:     Tensor, shape=(B, 21, obs_dim), dtype=float32
              Chuỗi 21 obs vectors liên tiếp (21 ngày)
              Mỗi "hàng" là obs của một ngày cụ thể

              features[b, t, d]:
                b ∈ [0, B-1]  → sample thứ b trong batch
                t ∈ [0, 20]   → ngày thứ t trong chuỗi (0=cũ nhất)
                d ∈ [0, 9]    → chiều d của obs vector

category_idx: Tensor, shape=(B,), dtype=int64
              0=leafy, 1=root, 2=fruit, 3=herbs
              Một số nguyên cho mỗi sample

Ví dụ với B=2 (2 sản phẩm), obs_dim=10:
  features.shape = (2, 21, 10)  → 2×21×10 = 420 giá trị float
  category_idx = tensor([0, 2]) → sample 0 là leafy, sample 1 là fruit
```

---

## 6. Category Embedding Layer

```python
self.cat_embed = nn.Embedding(num_embeddings=4, embedding_dim=8)
```

### Embedding là gì (chi tiết)

Một Embedding là một ma trận `E ∈ ℝ^{4×8}` (32 parameters):

```
        dim0  dim1  dim2  dim3  dim4  dim5  dim6  dim7
leafy: [0.23, -0.14, 0.87, 0.05, -0.62, 0.31, -0.44, 0.19]
root:  [0.11,  0.75, -0.33, 0.88, 0.21, -0.09, 0.67, -0.52]
fruit: [-0.55, 0.32, 0.14, -0.71, 0.44, 0.83, -0.28, 0.36]
herbs: [0.67, -0.48, -0.25, 0.13, -0.89, 0.57, 0.02, -0.74]
```
*(Các giá trị trên là ví dụ minh họa — giá trị thực tế được học trong training)*

**Phép lookup:**
```python
cat_vec = E[category_idx]
```
- Nếu `category_idx = [0, 2]` (leafy và fruit):
  - `cat_vec[0] = E[0]` = hàng leafy → vector 8 chiều
  - `cat_vec[1] = E[2]` = hàng fruit → vector 8 chiều
- `cat_vec.shape = (2, 8)`

**Tại sao inject DESPUÉS LSTM (sau), không TRƯỚC?**

Nếu concat category vào obs trước khi vào LSTM (obs trở thành 10+8=18 chiều), LSTM sẽ học temporal patterns riêng biệt cho mỗi category combination → phức tạp hơn.

Cách thiết kế hiện tại: LSTM học temporal patterns **category-agnostic** (chung cho mọi category), sau đó prediction heads được conditioned on category thông qua concat. Điều này tận dụng shared temporal dynamics (freshness luôn giảm theo thời gian, demand luôn có weekly cycle) trong khi vẫn cho phép heads phân biệt category.

---

## 7. LSTM Stack — Layer-by-Layer

### Khái niệm LSTM (Long Short-Term Memory)

LSTM là một biến thể đặc biệt của Recurrent Neural Network (RNN), được thiết kế để học từ chuỗi dữ liệu theo thời gian. Tại mỗi timestep `t`, LSTM nhận:
- `x_t`: input mới (obs tại ngày t)
- `h_{t-1}`: hidden state từ timestep trước (short-term memory)
- `c_{t-1}`: cell state từ timestep trước (long-term memory)

Và tính ra:
- `h_t`: hidden state mới (output đồng thời là input cho layer tiếp theo)
- `c_t`: cell state mới

**4 Gates của LSTM:**

```
Input gate (i_t):   Quyết định bao nhiêu thông tin mới từ x_t được đưa vào
Forget gate (f_t):  Quyết định bao nhiêu thông tin cũ trong c_{t-1} bị "quên"
Cell gate (g_t):    Thông tin "ứng viên" để thêm vào long-term memory
Output gate (o_t):  Quyết định bao nhiêu long-term memory được expose qua h_t
```

Tất cả gates đều là vectors cùng kích thước `hidden_size = 128`.

### LSTM Layer 1

```python
nn.LSTM(
    input_size  = obs_dim,   # 10 hoặc 11
    hidden_size = 128,
    num_layers  = 1,         # chỉ layer này
    batch_first = True,      # input shape: (B, T, D), không phải (T, B, D)
    dropout     = 0.0        # PyTorch không apply dropout sau layer cuối của một nn.LSTM
)
```

**`batch_first=True`** có nghĩa là:
- `True`:  input shape = `(B, T, D)` — thân thiện hơn khi làm việc với batches
- `False`: input shape = `(T, B, D)` — PyTorch default cũ

**Khởi tạo hidden/cell state:**
```python
h_0 = torch.zeros(1, B, 128)  # (num_layers, B, hidden_size)
c_0 = torch.zeros(1, B, 128)
# Không cần tường minh — PyTorch tự init zeros nếu không truyền
```

**Forward qua 21 timesteps:**
```
t=0:  x_0=(B,10),  h_{-1}=(B,128), c_{-1}=(B,128) → h_0=(B,128), c_0=(B,128)
t=1:  x_1=(B,10),  h_0=(B,128),    c_0=(B,128)    → h_1=(B,128), c_1=(B,128)
...
t=20: x_20=(B,10), h_19=(B,128),   c_19=(B,128)   → h_20=(B,128), c_20=(B,128)
```

**Output của Layer 1:**
```
all_hidden_1: shape (B, 21, 128)
    ← tất cả h_t cho t ∈ [0..20], xếp theo chiều time
    all_hidden_1[:, t, :] = h_t tại timestep t

final_h_1: shape (1, B, 128)   ← h_20 (không dùng trực tiếp)
final_c_1: shape (1, B, 128)   ← c_20 (không dùng trực tiếp)
```

**Dropout sau Layer 1 (áp dụng bởi PyTorch LSTM tổng):**
```
PyTorch nn.LSTM với num_layers=2 và dropout=0.2 tự động
apply Dropout(p=0.2) trên all_hidden_1 TRƯỚC khi feed vào Layer 2.

Trong training:  mỗi element của all_hidden_1 có 20% khả năng bị set về 0
Trong eval:      dropout tắt hoàn toàn, all_hidden_1 truyền nguyên vẹn
```

### LSTM Layer 2

```python
nn.LSTM(
    input_size  = 128,   # nhận output của Layer 1
    hidden_size = 128,
    num_layers  = 1,
    batch_first = True,
    dropout     = 0.0    # không dropout sau layer cuối
)
```

**Forward:** Giống Layer 1 nhưng input là `all_hidden_1` thay vì `features`.
```
t=0:  x_0_L2=(B,128), h_{-1}_L2=(B,128), c_{-1}_L2=(B,128)
      → h_0_L2=(B,128), c_0_L2=(B,128)
...
t=20: x_20_L2=(B,128) → h_20_L2=(B,128), c_20_L2=(B,128)
```

**Output của Layer 2:**
```
all_hidden_2: shape (B, 21, 128)
```

### Lấy Hidden State Cuối

```python
last = lstm_out[:, -1, :]
# lstm_out là all_hidden_2
# [:, -1, :] = lấy timestep cuối (t=20) cho tất cả samples và tất cả dims
# last: shape (B, 128)
```

**Tại sao lấy timestep CUỐI?**

Hidden state `h_{20}` tại `t=20` đã "nhìn thấy" toàn bộ chuỗi 21 ngày. Nhờ cơ chế gate của LSTM, `h_{20}` mang thông tin được distill từ tất cả các timestep trước, với trọng số phụ thuộc vào relevance (forget gate quyết định giữ hay quên thông tin cũ).

Các lựa chọn thay thế:
- **Average pooling** `mean(all_hidden_2, dim=1)`: Mờ temporal signal, không phân biệt thông tin gần đây vs xa xôi
- **Max pooling**: Mất thông tin về trend (chỉ lấy peak value)
- **Attention**: Cần train thêm attention weights, tăng complexity không cần thiết với window 21 ngày

---

## 8. Merge Stage

```python
z = torch.cat([last, cat_vec], dim=-1)
# last:    shape (B, 128)
# cat_vec: shape (B,   8)
# z:       shape (B, 136)   ← 128 + 8
```

`torch.cat(tensors, dim=-1)` ghép nối các tensors dọc theo chiều cuối cùng.

```
Ví dụ với B=1, last[0]=[0.1, 0.2, ...], cat_vec[0]=[0.5, 0.3, ...]:
z[0] = [0.1, 0.2, ...(128 values)..., 0.5, 0.3, ...(8 values)...]
         ←─────── LSTM context ───────→  ←── category ──→
```

Vector `z` là "bản tóm tắt đầy đủ": temporal dynamics từ 21 ngày (qua LSTM) + identity của category (qua embedding). Cả hai prediction heads nhận cùng `z` này.

---

## 9. demand_head — Regression Head

```python
self.demand_head = nn.Linear(in_features=128+8, out_features=1)
# Tương đương: Linear(136, 1)
```

**Forward:**
```python
demand_raw = self.demand_head(z)   # shape: (B, 1)
demand     = demand_raw.squeeze(-1) # shape: (B,)
# squeeze(-1): loại bỏ chiều cuối có kích thước 1
```

**Không có activation function** — demand là regression task, output là số thực bất kỳ. Tại inference:
```python
demand7d = max(0.0, out["demand"].item())  # clip âm về 0
```
Demand âm không có nghĩa vật lý.

**Tham số:**
```
weight W_d: shape (1, 136)  = 136 numbers
bias   b_d: shape (1,)      =   1 number
Tổng: 137 tham số
```

---

## 10. waste_head — Classification Head

```python
self.waste_head = nn.Sequential(
    nn.Linear(136, 64),
    nn.ReLU(),
    nn.Dropout(0.2),
    nn.Linear(64, 1),
)
```

**Tại sao waste_head phức tạp hơn demand_head?**

- `demand_7d` là output liên tục, tuyến tính với features → linear transformation đủ
- `waste_7d` là binary classification, boundary không tuyến tính:
  - Freshness thấp + nhiều hàng + cầu thấp → waste cao (non-linear combination)
  - Cần ReLU để học non-linear decision boundary
  - Cần Dropout thêm vì waste labels imbalanced (~15% positive) → dễ overfitting

**Forward từng bước:**
```
z:          shape (B, 136)

Step 1: Linear(136 → 64)
  h1 = z @ W_1.T + b_1
  h1: shape (B, 64)
  W_1: shape (64, 136)   = 8,704 values
  b_1: shape (64,)       =    64 values

Step 2: ReLU
  h1_act = max(0, h1)    element-wise
  h1_act: shape (B, 64)
  Neurons với giá trị âm → 0; dương → giữ nguyên

Step 3: Dropout(p=0.2)
  Training: 20% của 64 neurons bị zero-out ngẫu nhiên
  Inference: không làm gì (passthrough)
  h1_drop: shape (B, 64)

Step 4: Linear(64 → 1)
  waste_logit = h1_drop @ W_2.T + b_2
  waste_logit: shape (B, 1) → squeeze(-1) → (B,)
  W_2: shape (1, 64)   = 64 values
  b_2: shape (1,)      =  1 value

Tại inference:
  pWaste = sigmoid(waste_logit) ∈ (0, 1)
```

---

## 11. Đếm Tham Số — Từng Tensor

### Tại sao LSTM có nhiều tham số?

LSTM có 4 gates, mỗi gate cần 2 ma trận (input weight + hidden weight) và 2 bias vectors:

```
Gate i (input):  W_ii (hidden×input), W_hi (hidden×hidden), b_ii (hidden), b_hi (hidden)
Gate f (forget): W_if, W_hf, b_if, b_hf
Gate g (cell):   W_ig, W_hg, b_ig, b_hg
Gate o (output): W_io, W_ho, b_io, b_ho
```

PyTorch lưu tất cả trong 2 tensors:
```
weight_ih: shape (4×hidden, input)   ← 4 gates × hidden rows, input cols
weight_hh: shape (4×hidden, hidden)  ← 4 gates × hidden rows, hidden cols
bias_ih:   shape (4×hidden,)
bias_hh:   shape (4×hidden,)
```

### Bảng chi tiết

| Component | Tensor | Shape | Tham số |
|-----------|--------|-------|---------|
| Embedding | E | (4, 8) | 32 |
| LSTM L1 weight_ih | W_ih_0 | (512, obs_dim=10) | 5,120 |
| LSTM L1 weight_hh | W_hh_0 | (512, 128) | 65,536 |
| LSTM L1 bias_ih | b_ih_0 | (512,) | 512 |
| LSTM L1 bias_hh | b_hh_0 | (512,) | 512 |
| **LSTM L1 subtotal** | | | **71,680** |
| LSTM L2 weight_ih | W_ih_1 | (512, 128) | 65,536 |
| LSTM L2 weight_hh | W_hh_1 | (512, 128) | 65,536 |
| LSTM L2 bias_ih | b_ih_1 | (512,) | 512 |
| LSTM L2 bias_hh | b_hh_1 | (512,) | 512 |
| **LSTM L2 subtotal** | | | **132,096** |
| demand_head weight | W_d | (1, 136) | 136 |
| demand_head bias | b_d | (1,) | 1 |
| **demand_head subtotal** | | | **137** |
| waste_head Linear1 weight | W_1 | (64, 136) | 8,704 |
| waste_head Linear1 bias | b_1 | (64,) | 64 |
| waste_head Linear2 weight | W_2 | (1, 64) | 64 |
| waste_head Linear2 bias | b_2 | (1,) | 1 |
| **waste_head subtotal** | | | **8,833** |
| **TOTAL** | | | **212,778** |

**Ghi chú về `512`:** `512 = 4 × 128` — 4 gates × hidden_size. PyTorch stack tất cả 4 gate weights vào một tensor duy nhất.

---

## 12. Forward Pass Hoàn Chỉnh (Annotated Code)

```python
def forward(
    self,
    features: torch.Tensor,      # shape: (B, 21, obs_dim)
    category_idx: torch.Tensor,  # shape: (B,), dtype=int64
) -> dict[str, torch.Tensor]:

    # ─── BƯỚC 1: LSTM Stack ────────────────────────────────────────
    lstm_out, (h_n, c_n) = self.lstm(features)
    # features:  (B, 21, obs_dim) → input
    # lstm_out:  (B, 21, 128)     → all hidden states, mọi timestep
    # h_n:       (2, B, 128)      → final hidden state, mỗi layer
    # c_n:       (2, B, 128)      → final cell state, mỗi layer
    # Ký hiệu _  = ta không dùng h_n và c_n ở đây

    # ─── BƯỚC 2: Lấy timestep cuối ─────────────────────────────────
    last = lstm_out[:, -1, :]
    # lstm_out[:, -1, :]:
    #   : = tất cả B samples
    #  -1 = timestep cuối cùng (t=20)
    #   : = tất cả 128 dims
    # last: shape (B, 128)

    # ─── BƯỚC 3: Category Embedding ────────────────────────────────
    cat_vec = self.cat_embed(category_idx)
    # category_idx: (B,) — ví dụ [0, 2] cho [leafy, fruit]
    # cat_vec:      (B, 8) — lookup embedding vector cho mỗi category

    # ─── BƯỚC 4: Concatenate ───────────────────────────────────────
    z = torch.cat([last, cat_vec], dim=-1)
    # last:    (B, 128)
    # cat_vec: (B,   8)
    # z:       (B, 136)  ← ghép dọc theo chiều cuối

    # ─── BƯỚC 5: Prediction Heads ──────────────────────────────────
    demand = self.demand_head(z).squeeze(-1)
    # demand_head(z): shape (B, 1)
    # .squeeze(-1):   shape (B,)   ← loại chiều kích thước 1

    waste = self.waste_head(z).squeeze(-1)
    # waste_head(z): Linear→ReLU→Dropout→Linear → shape (B, 1)
    # .squeeze(-1):  shape (B,)

    # ─── OUTPUT ─────────────────────────────────────────────────────
    return {
        "demand":      demand,      # (B,) raw regression output
        "waste_logit": waste,       # (B,) raw logit, chưa sigmoid
    }

# ─── Tại inference (sidecar) ────────────────────────────────────────
# out = forecaster_net(feat, cidx)
# demand7d = max(0.0, out["demand"].item())           # clip về [0,∞)
# pWaste   = torch.sigmoid(out["waste_logit"]).item() # → [0,1]
```

---

## 13. Training vs Inference — Tiled Observations

### Trong Training (dữ liệu thực từ simulation)

```
features[b, t, :] = obs tại ngày t thực sự của episode b

features[b, 0, :] = obs ngày t-20  ← 20 ngày trước
features[b, 1, :] = obs ngày t-19
features[b, 2, :] = obs ngày t-18
...                    ← freshness giảm dần, inventory thay đổi
features[b,19, :] = obs ngày t-1
features[b,20, :] = obs ngày t     ← hôm nay

Mỗi row khác nhau vì:
  - obs[0] (freshness) giảm dần: 0.95, 0.91, 0.86, ...
  - obs[1] (inv_ratio) thay đổi khi bán hàng
  - obs[2]/[3] (dow) thay đổi mỗi ngày
  - obs[5] (demand_ratio) biến thiên
```

### Trong Inference Production (tiled)

```python
obs_padded = obs[:forecaster_obs_dim]         # (obs_dim,) — snapshot hôm nay
window     = np.tile(obs_padded, (21, 1))     # (21, obs_dim) — copy 21 lần
feat       = torch.tensor(window).unsqueeze(0) # (1, 21, obs_dim)
```

```
features[0, 0, :] = obs hôm nay  ← bản copy số 1
features[0, 1, :] = obs hôm nay  ← bản copy số 2  (GIỐNG HỆT)
features[0, 2, :] = obs hôm nay  ← bản copy số 3  (GIỐNG HỆT)
...
features[0,20, :] = obs hôm nay  ← bản copy số 21 (GIỐNG HỆT)
```

**Tác động cụ thể lên từng dimension:**

| Dim | Training | Inference (tiled) | Tác động |
|-----|----------|-------------------|----------|
| obs[0] freshness | Giảm dần 0.95→0.62 | Cố định 0.75 | LSTM không thấy trend |
| obs[1] inv_ratio | Giảm dần khi bán | Cố định | LSTM không thấy bán hàng |
| obs[2]/[3] dow | Thay đổi mỗi ngày | Cố định tại ngày hôm nay | Không có weekly cycle |
| obs[5] demand | Biến thiên | Cố định tại 0 | Không có demand history |
| obs[8] days_waste | Giảm dần | Cố định | Không thấy urgency tăng |

**Kết quả thực tế:** LSTM hoạt động như một **deep non-linear MLP**. Hidden state `h_t` thay đổi qua 21 timestep nhưng không phải vì input thay đổi — chỉ vì cell state `c_t` tích lũy (nhưng với input cố định, behavior rất xác định).

**Đây có phải bug không?** Không. Đây là explicit trade-off được ghi nhận trong codebase. Lý do:
1. Không có per-product historical time-series trong production
2. LSTM vẫn có ích vì nó học non-linear feature transformation mạnh hơn MLP đơn giản
3. Trong training, model học từ time-series thực → nó vẫn "hiểu" các obs features

---

## 14. obs_dim Mismatch: Training (11) vs Sidecar (10)

Hai môi trường khác nhau:

| | Training (MarketEnv) | Production (Sidecar) |
|--|---------------------|----------------------|
| obs_dim | 11 (default ForecasterConfig) | 10 |
| Feature thứ 11 | Tồn tại (không rõ nội dung) | Không có |

**Cách sidecar xử lý:**

```python
# Bước 1: Đọc obs_dim thực tế từ checkpoint
fckpt = torch.load(FORECASTER_CKPT, map_location="cpu")
cfg   = ForecasterConfig(**fckpt["model_cfg"])
forecaster_obs_dim = cfg.obs_dim   # ví dụ: 11

# Bước 2: Pad hoặc truncate obs
def _run_forecaster(obs: np.ndarray, category: str):
    # obs: (10,) — sidecar obs
    obs_padded = obs[:forecaster_obs_dim] if len(obs) >= forecaster_obs_dim \
                 else np.pad(obs, (0, forecaster_obs_dim - len(obs)))
    # Nếu forecaster_obs_dim=11 và obs=(10,):
    #   np.pad(obs, (0, 1)) → thêm 1 số 0 vào cuối → (11,)
```

**Tác động:** Feature thứ 11 luôn là 0 trong production. Nếu model đã học weight cho feature đó, weight này không được kích hoạt. Tác động nhỏ trong thực tế.

---

## 15. Memory Footprint và Latency

### Model size
```
212,778 tham số × 4 bytes/param (float32) = 851,112 bytes ≈ 0.85 MB
```

### Activation memory (inference, B=1)
```
features input:        1 × 21 × 10 × 4 = 840 bytes
LSTM L1 all_hidden:    1 × 21 × 128 × 4 = 10,752 bytes
LSTM L2 all_hidden:    1 × 21 × 128 × 4 = 10,752 bytes
LSTM hidden/cell (L1+L2): 2 × 2 × 1 × 128 × 4 = 2,048 bytes
last:                  1 × 128 × 4 = 512 bytes
cat_vec:               1 × 8 × 4 = 32 bytes
z:                     1 × 136 × 4 = 544 bytes
demand_raw:            1 × 1 × 4 = 4 bytes
waste_logit:           1 × 1 × 4 = 4 bytes
─────────────────────────────────────────
Total activations: ≈ 25 KB
```

### Inference latency
```
CPU (Apple M2): < 1ms cho B=1
Bottleneck: LSTM sequential computation (không parallelizable theo time)
```

Model được load once tại sidecar startup. Mỗi request gọi `_run_forecaster()` với `torch.no_grad()` (không tính gradient → tiết kiệm ~50% memory so với training mode).

---

## 16. Sơ đồ Tổng hợp Đầy đủ

```
INPUT
features: (B, 21, obs_dim)          category_idx: (B,)
           │                                  │
           │                         ┌────────▼────────────────┐
           │                         │   nn.Embedding(4, 8)    │
           │                         │   Lookup table 32 params│
           │                         │   E[category_idx]       │
           │                         └────────┬────────────────┘
           │                                  │ cat_vec: (B, 8)
           ▼                                  │
┌──────────────────────────────────────────┐  │
│  nn.LSTM(input=obs_dim, hidden=128,      │  │
│          num_layers=2, dropout=0.2)      │  │
│                                          │  │
│  Layer 1: obs_dim → 128                  │  │
│    71,680 params                         │  │
│    ↓ Dropout(0.2) [training only]        │  │
│  Layer 2: 128 → 128                      │  │
│    132,096 params                        │  │
│                                          │  │
│  Output: (B, 21, 128)                    │  │
└──────────────────────────────────────────┘  │
           │                                  │
           │ [:, -1, :] ← lấy t=20           │
           │ last: (B, 128)                   │
           │                                  │
           └────────────┬─────────────────────┘
                        │ torch.cat([last, cat_vec], dim=-1)
                        ▼
                   z: (B, 136)
                        │
            ┌───────────┴────────────────┐
            │                            │
 ┌──────────▼──────────┐   ┌─────────────▼─────────────────────┐
 │   demand_head       │   │   waste_head                       │
 │                     │   │                                    │
 │   Linear(136 → 1)   │   │   Linear(136 → 64)  8,704 params  │
 │   137 params        │   │   ReLU                             │
 │   no activation     │   │   Dropout(0.2)  [training only]   │
 │                     │   │   Linear(64 → 1)    65 params      │
 │ demand_raw: (B, 1)  │   │                                    │
 │ .squeeze(-1)        │   │   waste_logit: (B, 1)              │
 │ demand: (B,)        │   │   .squeeze(-1)                     │
 │                     │   │   waste_logit: (B,)                │
 └──────────┬──────────┘   └─────────────┬──────────────────────┘
            │                            │
            ▼                            ▼
     TRAINING output:             TRAINING output:
     demand (B,)                  waste_logit (B,)
     → Huber loss                 → Focal loss

     INFERENCE output:            INFERENCE output:
     max(0, demand.item())        sigmoid(logit).item()
     = demand7d ≥ 0               = pWaste ∈ (0,1)
```
