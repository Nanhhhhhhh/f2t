# Report 4 — DDQN: Underlying Math

> Codebase: `src/rl/agent.py`, `src/rl/network.py`, `src/rl/reward.py`

---

## 1. Q-Learning cơ bản

Q-function `Q(s, a)` đo giá trị kỳ vọng của discounted cumulative reward khi ở state `s`, chọn action `a`, sau đó theo optimal policy:

```
Q*(s, a) = E[ Σ_{k=0}^∞ γ^k r_{t+k} | s_t=s, a_t=a, π* ]
```

Bellman optimality equation:
```
Q*(s, a) = E[ r(s,a) + γ × max_{a'} Q*(s', a') ]
```

Mục tiêu training: học `Q_θ(s,a) ≈ Q*(s,a)` bằng cách minimize TD error.

---

## 2. DQN — Deep Q-Network

### Temporal Difference (TD) target
```
y = r + γ × max_{a'} Q_θ⁻(s', a')
```
trong đó `Q_θ⁻` là **target network** (parameters cố định trong nhiều steps).

### Loss
```
L(θ) = E[(Q_θ(s,a) - y)²]
```

**Vấn đề của DQN:** cùng một network `Q_θ` được dùng để vừa chọn action (`argmax`) vừa đánh giá Q-value → **overestimation bias**.

---

## 3. DDQN — Double DQN (giải pháp overestimation)

**Key insight:** tách action selection và action evaluation ra 2 networks:

```
a* = argmax_{a'} Q_online(s', a')       ← online network chọn action
y  = r + γ × Q_target(s', a*)           ← target network đánh giá
```

Trong code:
```python
# online chọn action tốt nhất ở state tiếp theo
q_online_next = self._online(next_obs, cat_ids, next_mask)
a_next        = q_online_next.argmax(dim=1)           # (batch,)

# target đánh giá Q value tại action đó
q_target_next = self._target(next_obs, cat_ids, next_mask)
q_next        = q_target_next.gather(1, a_next.unsqueeze(1)).squeeze(1)

# DDQN target
target = reward + gamma * (1 - done) * q_next        # (batch,)
```

### TD error và loss (Huber/SmoothL1)
```
δ = Q_online(s, a) - target

L = SmoothL1(δ) = ⎧ 0.5 δ²      nếu |δ| ≤ 1
                   ⎩ |δ| - 0.5   nếu |δ| > 1
```

SmoothL1 (= Huber với β=1) ít nhạy với outlier hơn MSE, phù hợp RL vì reward có thể có variance cao.

```python
q_curr = self._online(obs, cat_ids).gather(1, action.unsqueeze(1)).squeeze(1)
loss   = F.smooth_l1_loss(q_curr, target)
```

---

## 4. Dueling Network Architecture

### Phân tách Value và Advantage
```
Q(s, a) = V(s) + A(s, a)
```
- `V(s)`: giá trị của state `s` bất kể action (baseline)
- `A(s, a)`: lợi thế tương đối của action `a` so với các actions khác

### Identifiability problem
Nếu `Q = V + A` thẳng, ta không thể phân biệt V và A duy nhất (có thể cộng/trừ constant tùy ý).

### Giải pháp: mean centering
```
Q(s, a) = V(s) + A(s, a) - (1/|A|) Σ_{a'} A(s, a')
```

Trong code:
```python
v = self.v_stream(h)          # (batch, 1)
a = self.a_stream(h)          # (batch, 11)
q = v + a - a.mean(dim=1, keepdim=True)   # (batch, 11)
```

**Tại sao Dueling tốt hơn:** Trong pricing problem, nhiều states có V(s) thấp hoặc cao bất kể action (ví dụ: sản phẩm gần hỏng → V thấp với mọi action). V-stream học được điều này, giải phóng A-stream tập trung vào sự khác biệt giữa actions.

---

## 5. Action Masking — Math

Với mask `m ∈ {0,1}^{11}` (1 = valid):
```
Q_masked(s, a) = ⎧ Q(s, a)   nếu m[a] = 1
                  ⎩ -∞        nếu m[a] = 0
```

```
a* = argmax_{a: m[a]=1} Q(s, a)
```

Trong PyTorch:
```python
q = q.masked_fill(~mask, float("-inf"))
action_idx = q.argmax(dim=1)
```

**Note:** `-inf` → `softmax → 0` và `argmax → never selected`, đảm bảo agent không bao giờ chọn invalid action.

### Freshness-based mask (compute_mask)

Mask được tính từ freshness `f` và category `cat`:

```
WASTE_THRESHOLD    θ_w = 0.50
NEUTRAL            θ_n = 0.80
NEUTRAL_PREMIUM    θ_p = 0.70
EXEMPT_HIGH        θ_h = 0.85
```

```
Cat ∈ HOLD_CATS (leafy, herbs):

  f ≤ θ_w:                mask = [F,F,F,F,F,F,T,F,F,F,F]  ← chỉ delta=0
  θ_w < f:                mask = [T,T,T,T,T,T,T,F,F,F,F]  ← không tăng

Cat ∈ premium (fruit, root):

  f ≤ θ_w:                mask = [F,F,F,F,F,F,T,F,F,F,F]  ← chỉ delta=0
  θ_w < f < θ_p:          mask = [T,T,T,T,T,T,T,F,F,F,F]  ← không tăng
  θ_p ≤ f < θ_h:          cap tại freshness_target_delta(f)
  f ≥ θ_h:                mask = [T,T,T,T,T,T,T,T,T,T,T]  ← mọi action
```

### Target delta (piecewise linear)

```
fruit / root:
  f ≥ 0.85 → δ* = +0.20
  0.70 ≤ f < 0.85 → δ* = +0.20 × (f - 0.70) / (0.85 - 0.70)   (linear)
  0.50 ≤ f < 0.70 → δ* = -0.30 × (0.70 - f) / (0.70 - 0.50)   (linear)
  f < 0.50 → δ* = -0.30

leafy / herbs:
  f ≥ 0.75 → δ* = 0.00
  0.50 ≤ f < 0.75 → δ* = -0.30 × (0.75 - f) / (0.75 - 0.50)   (linear)
  f < 0.50 → δ* = -0.30
```

---

## 6. Reward Function

5 thành phần reward, có trọng số khác nhau:

```
r = r_revenue + r_waste + r_target + r_premium + r_smooth
```

### 6.1 Revenue reward
```
r_revenue = (price / ref_price) × sold
```
Incentivize bán nhiều với giá cao hơn ref_price.

### 6.2 Waste penalty
```
r_waste = -15.0 × waste_units
```
Mỗi đơn vị hàng bị waste bị phạt 15 điểm.

### 6.3 Target alignment (behavior cloning signal)
```
r_target = -100.0 × (δ - δ*(f, cat))²
```
Phạt quadratic nếu agent chọn delta lệch khỏi `freshness_target_delta`. Đây là **imitation signal** hướng agent về policy tốt đã biết từ domain knowledge, giúp training hội tụ nhanh hơn.

### 6.4 Premium reward (chỉ fruit/root)
```
r_premium = 15.0 × δ × max(0, f - θ_n)

θ_n = 0.80
```
Thưởng khi tăng giá lên cao trong khi freshness tốt (hàng tươi có thể bán premium).

### 6.5 Smoothness penalty
```
r_smooth = -0.5 × |δ - δ_{prev}|
```
Penalize thay đổi giá đột ngột giữa các bước — khuyến khích price stability.

### Tổng quan reward tradeoffs

| Component | Mục tiêu | Hệ số |
|-----------|---------|-------|
| `r_revenue` | Tối đa doanh thu | `price/ref × sold` |
| `r_waste` | Giảm lãng phí | -15 per unit |
| `r_target` | Học từ domain knowledge | -100 (quadratic) |
| `r_premium` | Premium pricing khi hàng tươi | +15 (fruit/root only) |
| `r_smooth` | Giá ổn định | -0.5 per step change |

---

## 7. Bellman update trong training loop

```
for each training step:

  1. Sample balanced batch:
     64 transitions × 4 categories = 256 total
     (obs, cat_id, action, reward, next_obs, done, next_mask)

  2. DDQN target (no gradient):
     a*     = argmax Q_online(next_obs, cat_ids, next_mask)
     q_next = Q_target(next_obs, cat_ids, next_mask)[a*]
     y      = reward + γ(1 - done) × q_next         γ=0.99

  3. Online prediction:
     q_curr = Q_online(obs, cat_ids)[action]

  4. Loss:
     L = SmoothL1(q_curr, y)

  5. Gradient update:
     ∇_θ L → clip to max_norm=10.0 → Adam step (lr=1e-4)

  6. Periodic target sync:
     θ_target ← θ_online   (hard sync, không soft update)
```

---

## 8. Discount factor γ = 0.99

```
Effective planning horizon ≈ 1/(1-γ) = 100 steps = 100 ngày
```

Với episode 91 ngày, `γ=0.99` nghĩa là agent quan tâm đến toàn bộ episode (~3 tháng), không chỉ reward tức thời. Điều này khuyến khích avoid waste (short-term loss nhưng tránh -15 mỗi unit) và duy trì freshness cao (long-term revenue).

---

## 9. Gradient clipping

```
‖g‖₂ = √(Σ gᵢ²)

g̃ = g × min(1, 10.0 / ‖g‖₂)
```

`max_norm = 10.0` (looser hơn LSTM với 1.0) vì reward signal có variance cao hơn supervised learning. Ngăn một batch xấu gây Q-value collapse.

---

## 10. Replay buffer mechanics

```
Buffer capacity: 50,000 per category (total 200,000)
Sample: uniform random từ buffer

Transition tuple:
  (obs: float32[10],
   action: int64,
   reward: float32,
   next_obs: float32[10],
   done: bool,
   next_mask: bool[11])
```

Experience replay phá vỡ temporal correlation giữa consecutive transitions, giúp gradient update ổn định hơn (IID assumption của SGD).

---

## 11. Safety constraints (hard rules, post-model)

Safety layer **không** phải phần của Q-learning — nó là hard constraint apply **sau** DDQN output:

```
price_raw = base_price × (1 + CANDIDATES[action_idx])

# Rule 3: max tick
price = clip(price_raw, base × 0.70, base × 1.20)

# Rule 4: freshness mandate
if freshness < 0.40:
    price = min(price, base × 0.75)

# Rule 1: cost floor
price = max(price, base × 0.55)

# Rule 2: ceiling
price = min(price, base × 2.0)

# Rule 5: minimum
price = max(price, 1000.0)

safety_clipped = (price ≠ price_raw)
```

**Lý do tách safety khỏi reward:** Safety rules phản ánh business constraints cứng (pháp lý, margin). Nếu encode vào reward, agent có thể học cách "gần vi phạm" để optimize reward. Hard post-processing đảm bảo 100% compliance.

Em xin hoàn toàn chịu trách nhiệm trước Hội đồng kỷ luật của Nhà trường và Pháp luật về tính trung thực cũng như bản quyền của khóa luận này.

