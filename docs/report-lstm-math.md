# Report 2 — ForecasterLSTM: Underlying Math

> Codebase: `src/forecaster/model.py`, `src/forecaster/losses.py`, `src/forecaster/train.py`

---

## 1. LSTM — Phương trình cổng

Với input tại timestep `t` là `x_t ∈ ℝ^{obs_dim}`, hidden state `h_{t-1} ∈ ℝ^{128}`, cell state `c_{t-1} ∈ ℝ^{128}`:

### Input gate
```
i_t = σ(W_ii · x_t + b_ii + W_hi · h_{t-1} + b_hi)
```

### Forget gate
```
f_t = σ(W_if · x_t + b_if + W_hf · h_{t-1} + b_hf)
```

### Cell gate (candidate)
```
g_t = tanh(W_ig · x_t + b_ig + W_hg · h_{t-1} + b_hg)
```

### Output gate
```
o_t = σ(W_io · x_t + b_io + W_ho · h_{t-1} + b_ho)
```

### Cell state update
```
c_t = f_t ⊙ c_{t-1} + i_t ⊙ g_t
```

### Hidden state output
```
h_t = o_t ⊙ tanh(c_t)
```

Ký hiệu: `σ` = sigmoid, `⊙` = Hadamard product (element-wise), `·` = matrix multiply.

### Stacked LSTM (2 layers)
Layer 2 nhận `h_t^{(1)}` từ layer 1 làm input thay vì `x_t`, với dropout `p=0.2` apply trên output layer 1:

```
x_t^{(2)} = Dropout(h_t^{(1)}, p=0.2)
```

---

## 2. Category Embedding

```
E ∈ ℝ^{4 × 8}   (learnable lookup table)
cat_vec = E[category_idx]   ∈ ℝ^{batch × 8}
```

Embedding học được một vector 8 chiều đặc trưng cho từng loại rau/quả, inject vào prediction heads để phân biệt đặc tính riêng từng category (độ tươi, tốc độ hỏng, mùa vụ...).

---

## 3. Concatenation và prediction heads

```
z = concat(h_T^{(2)}, cat_vec)   ∈ ℝ^{batch × 136}
```
trong đó `h_T^{(2)}` là hidden state cuối cùng của LSTM layer 2 (timestep T=21).

### Demand head
```
demand_raw = W_d · z + b_d       (Linear 136→1, squeeze)
demand     = max(0, demand_raw)  (clip âm về 0 tại inference)
```

### Waste head
```
h1         = ReLU(W_1 · z + b_1)         (Linear 136→64)
h1_drop    = Dropout(h1, p=0.2)
waste_logit = W_2 · h1_drop + b_2        (Linear 64→1, squeeze)
pWaste      = σ(waste_logit)             (sigmoid, ∈ (0,1))
```

---

## 4. Loss function

### 4.1 Demand loss — Huber Loss (δ=1.0)

```
L_demand(ŷ, y) = Huber_δ(ŷ - y)

         ⎧ 0.5 × (ŷ - y)²           nếu |ŷ - y| ≤ δ
       = ⎨
         ⎩ δ × (|ŷ - y| - 0.5δ)    nếu |ŷ - y| > δ
```

Huber loss kết hợp MSE (mịn, gradient nhỏ khi gần đúng) và MAE (robust với outliers khi sai nhiều). `δ=1.0` tạo điểm chuyển tiếp tại sai số 1 đơn vị.

### 4.2 Waste loss — Focal Loss (γ=2.0)

Waste event là **imbalanced** (phần lớn ngày không có waste), nên dùng Focal Loss thay Binary Cross-Entropy thông thường:

**Bước 1 — Weighted BCE:**
```
pos_weight = (1 - rate) / rate      (rate = tỷ lệ waste trong training set)

BCE_weighted = -[pos_weight × y × log(σ(logit))
                + (1-y) × log(1 - σ(logit))]
```

**Bước 2 — Focal modulation:**
```
p_hat = σ(logit)
p_t   = p_hat   nếu y=1
        1-p_hat nếu y=0

FL(logit, y) = (1 - p_t)^γ × BCE_weighted(logit, y)
```

**Ý nghĩa của `(1 - p_t)^γ`:**  
- Khi model dự đoán đúng với confidence cao: `p_t → 1` → factor `→ 0` → loss gần như 0 → model không "waste" gradient cho easy examples
- Khi model dự đoán sai: `p_t → 0` → factor `→ 1` → loss giữ nguyên → tập trung học hard examples

`γ=2` là giá trị chuẩn từ paper RetinaNet.

### 4.3 Combined loss

```
L_total = w_demand × L_demand + w_waste × L_waste
        = 1.0 × Huber(demand_pred, demand_true)
        + 4.0 × FocalLoss(waste_logit, waste_true)
```

`w_waste = 4.0` vì waste prediction quan trọng hơn và khó hơn (imbalanced binary task).

---

## 5. Optimizer và Learning Rate Schedule

### Adam optimizer
```
m_t = β₁ m_{t-1} + (1-β₁) g_t                   (moment bậc 1)
v_t = β₂ v_{t-1} + (1-β₂) g_t²                  (moment bậc 2)

θ_t = θ_{t-1} - α × m̂_t / (√v̂_t + ε)

m̂_t = m_t / (1 - β₁^t)                           (bias correction)
v̂_t = v_t / (1 - β₂^t)
```
Hyperparams: `α=3e-4`, `β₁=0.9`, `β₂=0.999`, `ε=1e-8`, `weight_decay=1e-4` (L2 regularization).

### Cosine Annealing LR
```
α_t = α_min + 0.5 × (α_max - α_min) × (1 + cos(π × t/T_max))
```
`T_max = 50 epochs`, `α_min = 0` (mặc định PyTorch). Làm học rate giảm dần theo cosine từ `3e-4 → 0`.

### Gradient clipping
```
g̃ = g × min(1, max_norm / ‖g‖₂)     (max_norm = 1.0)
```
Ngăn exploding gradients trong LSTM.

### Early stopping
Patience = 5 epochs. Lưu checkpoint khi `val_loss < best_val_loss`. Dừng khi validation không cải thiện 5 epoch liên tiếp.

---

## 6. Freshness Decay Model (input để tính obs)

Freshness giảm theo mô hình **exponential decay** mỗi ngày:

```
f_{t+1} = f_t × λ_cat

λ_leafy = 0.850   (hỏng nhanh nhất: 50% sau ~4.3 ngày)
λ_root  = 0.950   (bền nhất: 50% sau ~13.5 ngày)
λ_fruit = 0.880   (trung bình: 50% sau ~5.4 ngày)
λ_herbs = 0.800   (hỏng nhanh: 50% sau ~3.1 ngày)
```

Từ đó tính **days_to_waste** (obs[8]):
```
days_to_waste = log(θ_waste / f) / log(λ_cat)     nếu f > θ_waste và λ < 1
              = 0                                   nếu f ≤ θ_waste

θ_waste = 0.50  (ngưỡng waste)
```

---

## 7. Demand Model — CrossDemandModel

Demand rate (đơn vị/ngày) theo công thức kinh tế lượng:

```
β(f) = β_old + (β_fresh - β_old) × f
     = (β_base - spread/2) + spread × f

demand_rate = base_demand
            × (price / ref_price)^β(f)      ← power law giá
            × (0.4 + 0.6f)                  ← freshness multiplier
            × (comp_price / price)^γ         ← cross-price elasticity
            × (1 + sin_w × sin(2πdow/7)
                 + cos_w × cos(2πdow/7))     ← weekly seasonality
```

Demand thực tế sample từ Poisson:
```
sold ~ min(Poisson(demand_rate), inventory)
```

**Ý nghĩa tham số:**
- `β(f)`: price elasticity phụ thuộc freshness — hàng tươi ít nhạy cảm giá hơn hàng cũ
- `γ`: cross-price elasticity — giá competitor ảnh hưởng demand của mình
- Fourier terms `sin_w, cos_w`: bắt weekly pattern (cuối tuần mua nhiều hơn)

---

## 8. Label generation (7-day lookahead)

```python
# demand_7d: tổng giảm inventory trong 7 ngày
demand_7d = Σ_{j=t}^{t+6} max(0, inv_j - inv_{j+1})

# waste_7d: binary — có freshness < 0.5 với tồn kho > 0 không
waste_7d = 1  nếu ∃ j ∈ [t+1, t+7]: freshness_j < 0.5 và inv_j > 0
         = 0  otherwise
```

---

## 9. pos_weight cho imbalanced waste labels

```python
pos_weight = (1 - waste_rate) / waste_rate
```

Ví dụ nếu `waste_rate = 0.15` (15% ngày có waste):
```
pos_weight = 0.85 / 0.15 ≈ 5.67
```
Tức là mỗi positive (waste) sample được tính weight gấp 5.67× so với negative, bù đắp imbalance trước khi Focal Loss tiếp tục modulate thêm.
