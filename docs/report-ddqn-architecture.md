# Report 3 — DDQN: Kiến trúc Chi tiết (Dành cho người mới bắt đầu)

> Codebase tham chiếu: `dynamic-pricing-final/src/rl/` và `pricing-sidecar/main.py`  
> Mức độ: Mọi thuật ngữ đều được giải thích từ đầu. Không cần kiến thức nền.

---

## Mục lục

1. [Bức tranh tổng thể — DDQN làm gì trong hệ thống?](#1-bức-tranh-tổng-thể)
2. [Từ điển bắt buộc — đọc phần này trước](#2-từ-điển-bắt-buộc)
3. [Dữ liệu đầu vào — network nhận gì?](#3-dữ-liệu-đầu-vào)
4. [11 lựa chọn giá — Action Space](#4-11-lựa-chọn-giá--action-space)
5. [Kiến trúc network — từng lớp chi tiết](#5-kiến-trúc-network--từng-lớp-chi-tiết)
6. [Ví dụ tính toán đầy đủ — từng con số](#6-ví-dụ-tính-toán-đầy-đủ--từng-con-số)
7. [Action Masking — cấm actions không hợp lệ](#7-action-masking--cấm-actions-không-hợp-lệ)
8. [Safety Layer — 5 quy tắc cứng cuối cùng](#8-safety-layer--5-quy-tắc-cứng-cuối-cùng)
9. [Hai networks — Online và Target](#9-hai-networks--online-và-target)
10. [DDQN so với DQN — điểm khác biệt quan trọng](#10-ddqn-so-với-dqn--điểm-khác-biệt-quan-trọng)
11. [Replay Buffer — bộ nhớ training](#11-replay-buffer--bộ-nhớ-training)
12. [Epsilon-Greedy — khám phá vs khai thác](#12-epsilon-greedy--khám-phá-vs-khai-thác)
13. [Một bước training hoàn chỉnh](#13-một-bước-training-hoàn-chỉnh)
14. [Đếm tham số chi tiết](#14-đếm-tham-số-chi-tiết)

---

## 1. Bức tranh tổng thể

### DDQN là gì trong hệ thống này?

DDQN (viết tắt của **Double Deep Q-Network**) là bộ não ra quyết định giá. Nó nhìn vào trạng thái hiện tại của một sản phẩm (freshness, tồn kho, cầu...) và trả lời câu hỏi: **"Nên điều chỉnh giá thêm bao nhiêu phần trăm?"**

DDQN không biết trước câu trả lời đúng — nó **học** thông qua hàng triệu lần thử-sai trong môi trường giả lập (`MarketEnv`). Mỗi lần nó tăng giá, hệ thống trả về: bán được bao nhiêu, có hàng bị hỏng không, doanh thu thay đổi ra sao. Từ những tín hiệu đó, DDQN dần học được chiến lược tốt.

### Vị trí trong luồng hệ thống

```
Người dùng gọi API /predict
        │
        ▼
pricing-sidecar nhận ProductStateVector
  (thông tin sản phẩm: freshness, tồn kho, giá, cạnh tranh...)
        │
        ▼
_build_obs()  →  tạo vector 10 số mô tả trạng thái sản phẩm
        │
        ▼
compute_mask()  →  tính xem 11 mức giá nào được phép dùng
        │
        ▼
SharedMLPDuelingQNet (DDQN network)
  Nhận vào: vector 10 số + loại sản phẩm + danh sách actions hợp lệ
  Trả ra:   11 điểm số (Q-values) — mỗi điểm cho 1 mức giá
        │
        ▼
argmax  →  chọn mức giá có điểm cao nhất
        │
        ▼
apply_safety()  →  kiểm tra 5 ràng buộc cứng về giá
        │
        ▼
Trả về: targetPrice (giá đề xuất cuối cùng tính bằng VNĐ)
```

---

## 2. Từ điển bắt buộc

Đọc phần này trước. Mọi khái niệm dưới đây sẽ được dùng trong toàn bộ tài liệu.

---

### Reinforcement Learning (RL) — Học tăng cường

Một hướng tiếp cận machine learning (học máy) trong đó không có "đáp án đúng" được cung cấp từ trước. Thay vào đó:
- Agent (tác nhân) tự thực hiện hành động
- Môi trường phản hồi bằng reward (phần thưởng) — có thể dương (tốt) hoặc âm (xấu)
- Agent học cách hành động để tích lũy nhiều reward nhất

Ví dụ thực tế: Dạy máy chơi cờ vua. Không ai nói "nước này đúng, nước kia sai". Máy thử nhiều nước đi, thắng thì nhận reward +1, thua thì -1, dần học được chiến thuật tốt.

Trong hệ thống này: Agent = DDQN. Môi trường = thị trường rau củ giả lập. Reward = doanh thu cao, ít hàng hỏng.

---

### Agent

Thực thể ra quyết định. Trong hệ thống này, agent là DDQN network. Tại mỗi thời điểm, agent nhìn vào trạng thái hiện tại và chọn một hành động.

---

### Environment (Môi trường)

Thế giới mà agent tương tác. Trong training: `MarketEnv` — một thị trường rau củ được giả lập bằng code. Agent gửi quyết định giá, môi trường tính toán xem bán được bao nhiêu, hàng có hỏng không, rồi trả về trạng thái mới và reward.

---

### State (Trạng thái) — ký hiệu `s`

Mô tả đầy đủ tình trạng hiện tại mà agent cần biết để ra quyết định. Trong hệ thống này: một vector (danh sách) gồm 10 con số mô tả sản phẩm, ví dụ: độ tươi là 0.82, tồn kho còn 60%, ngày trong tuần là thứ Tư, v.v.

---

### Action (Hành động) — ký hiệu `a`

Quyết định của agent tại một state. Trong hệ thống này: chọn 1 trong 11 mức điều chỉnh giá, ví dụ -10% hoặc +5%.

---

### Reward — ký hiệu `r`

Điểm số phản hồi sau khi thực hiện action. Số dương = tốt, số âm = xấu. Ví dụ: bán được nhiều → reward +5, có hàng hỏng → reward -15. DDQN muốn tối đa hóa tổng reward theo thời gian, không chỉ reward ngay lập tức.

---

### Policy (Chính sách) — ký hiệu `π` (đọc là "pi")

Quy tắc ánh xạ từ state sang action. `π(s)` = action nào nên chọn khi ở state `s`. Sau training, DDQN có một policy tốt: nhìn vào trạng thái sản phẩm → biết nên điều chỉnh giá như thế nào.

---

### Q-function (Hàm Q) — ký hiệu `Q(s, a)`

Đây là khái niệm trung tâm nhất. `Q(s, a)` = **tổng reward kỳ vọng trong tương lai** nếu tại state `s` chọn action `a`, rồi sau đó luôn làm theo policy tốt nhất.

Nói đơn giản hơn: `Q(s, a)` = "Nếu tôi đang ở tình huống này (`s`) và làm điều này (`a`), tôi sẽ kiếm được bao nhiêu reward trong toàn bộ tương lai?"

Công thức chính thức:
```
Q*(s, a) = E[ r_t + γ·r_{t+1} + γ²·r_{t+2} + γ³·r_{t+3} + ... | s_t=s, a_t=a, π* ]
         = E[ Σ_{k=0}^∞  γ^k · r_{t+k}  |  s_t=s, a_t=a, π* ]
```
Trong đó:
- `E[...]` = kỳ vọng (trung bình theo xác suất của môi trường)
- `Σ` = tổng từ k=0 đến vô cùng
- `γ^k` = hệ số chiết khấu lũy thừa — reward càng xa càng bị "giảm giá"
- `r_{t+k}` = reward nhận được tại bước thứ `t+k`
- `π*` = optimal policy (làm theo policy tốt nhất sau action đầu tiên)

Ví dụ: `Q(freshness=0.9, action=+10%)` = 8.5 nghĩa là "khi sản phẩm còn rất tươi, tăng giá 10% kỳ vọng mang lại 8.5 điểm reward tích lũy".

**Mục tiêu của DDQN:** Học đúng giá trị Q cho mọi tổ hợp (state, action), vì khi đó chỉ cần argmax là có quyết định tối ưu.

---

### Discount Factor (Hệ số chiết khấu) — ký hiệu `γ` (đọc là "gamma"), giá trị = 0.99

Một số giữa 0 và 1 thể hiện mức độ "coi trọng" reward trong tương lai. Với `γ = 0.99`:
- Reward ngay hôm nay có giá trị đầy đủ: × 1.0
- Reward sau 1 ngày có giá trị: × 0.99 (99% so với hôm nay)
- Reward sau 7 ngày có giá trị: × 0.99^7 ≈ 0.932 (93% so với hôm nay)
- Reward sau 100 ngày có giá trị: × 0.99^100 ≈ 0.37 (37% so với hôm nay)

`γ = 0.99` rất gần 1, nghĩa là agent quan tâm đến cả dài hạn — hợp lý vì không muốn bán rẻ hôm nay rồi mất khách hàng lâu dài.

---

### Bellman Equation (Phương trình Bellman)

Phương trình nền tảng định nghĩa Q-function:

```
Q*(s, a) = r(s,a)  +  γ × max_{a'} Q*(s', a')
            ───────     ──────────────────────────
          reward          giá trị tốt nhất
          ngay lập tức    có thể đạt được từ s'
```

Giải thích từng ký hiệu:
- `Q*(s, a)` = Q-value tối ưu tại state `s`, action `a`
- `r(s, a)` = reward nhận được ngay sau khi thực hiện `a` tại `s`
- `γ` = discount factor (0.99) — hệ số chiết khấu tương lai
- `s'` = state tiếp theo (sau khi thực hiện `a`)
- `max_{a'} Q*(s', a')` = Q-value tốt nhất có thể tại s' — tức là `V(s')`

Nói ngắn gọn: "Giá trị của hành động này = reward ngay lập tức CỘNG với giá trị chiết khấu của tương lai tốt nhất có thể đạt được từ trạng thái tiếp theo."

Đây là phương trình định nghĩa **đích mà DDQN cần học hướng tới**. Network không học thuộc lòng Q — nó học để giá trị Q của mình ngày càng thỏa mãn phương trình Bellman.

---

### Value Function — ký hiệu `V(s)`

Giá trị của state `s` khi theo policy tốt nhất, bất kể action nào:

```
V(s) = max_a Q(s, a)
     = max(Q(s, action_0), Q(s, action_1), ..., Q(s, action_10))
```

`V(s)` là **baseline** — nó hỏi "state này vốn đã tốt hay xấu?" mà không quan tâm đến action cụ thể.

---

### Advantage Function — ký hiệu `A(s, a)`

Lợi thế **tương đối** của action `a` tại state `s` so với baseline V(s):

```
A(s, a) = Q(s, a) − V(s)
```

- `A(s, a) > 0`: action này tốt hơn average
- `A(s, a) < 0`: action này tệ hơn average
- `A(s, a) = 0`: action này đúng bằng average

Ví dụ: Nếu V(s) = 5.0 (state tốt) và Q(s, tăng_10%) = 6.2, thì A(s, tăng_10%) = 6.2 − 5.0 = +1.2 (action này tốt hơn trung bình 1.2 điểm tại state này).

---

### Dueling Architecture (Kiến trúc Dueling)

Thay vì để network học thẳng Q(s, a) → một số, Dueling tách ra:
- Một nhánh riêng học `V(s)` — giá trị của state
- Một nhánh riêng học `A(s, a)` — lợi thế của từng action
- Rồi ghép lại bằng công thức:

```
Q(s, a) = V(s)  +  A(s, a)  −  (1/|A|) Σ_{a'} A(s, a')
                               ──────────────────────────
                                     mean(A(s, ·))
                                 trung bình của A trên
                                   tất cả 11 actions
```

Tại sao tốt hơn? Vì đôi khi state quan trọng hơn action (hàng sắp hỏng thì action nào cũng xấu). Tách ra giúp network học nhanh hơn và chính xác hơn.

---

### MLP (Multi-Layer Perceptron) — Mạng neural nhiều lớp

Loại mạng neural cơ bản nhất. Gồm nhiều lớp, mỗi lớp gồm:
1. **Linear transformation** (phép biến đổi tuyến tính): nhân input với ma trận weights, cộng bias
2. **Activation function** (hàm kích hoạt): áp dụng hàm phi tuyến như ReLU

Ví dụ đơn giản: Input là vector 10 số → Linear(10→128) → ReLU → Linear(128→64) → ReLU → Linear(64→11) → Output 11 số.

---

### Linear Layer (Lớp tuyến tính)

`Linear(m, n)` biến đổi vector m chiều thành vector n chiều:

```
output_i = Σ_{j=0}^{m-1} W[i,j] × input[j]  +  b[i]     (với i = 0..n-1)

Dạng ma trận gọn hơn:
output = W · input  +  b

W  = ma trận weights, shape (n, m)  ← n×m số được học
b  = vector bias,    shape (n,)     ← n số được học
·  = matrix-vector multiplication
```

Mỗi con số trong output là tổng có trọng số của TẤT CẢ các số trong input, cộng một hằng số.

Ví dụ với Linear(3, 2):
```
input = [1.0, 2.0, 3.0]
W     = [[0.5, 0.2, 0.1],    ← dòng cho output[0]
         [0.3, 0.4, 0.2]]    ← dòng cho output[1]
b     = [0.1, 0.2]

output[0] = 1.0×0.5 + 2.0×0.2 + 3.0×0.1  +  0.1  = 0.5+0.4+0.3+0.1 = 1.3
output[1] = 1.0×0.3 + 2.0×0.4 + 3.0×0.2  +  0.2  = 0.3+0.8+0.6+0.2 = 1.9
```

---

### ReLU (Rectified Linear Unit)

Hàm kích hoạt đơn giản nhất:

```
ReLU(x) = max(0, x) = ⎧ x   nếu x > 0
                       ⎩ 0   nếu x ≤ 0
```

Nói nôm na: số dương giữ nguyên, số âm thành 0.

Tại sao cần? Nếu chỉ có Linear layers, toàn bộ network chỉ là một phép biến đổi tuyến tính (bất kể bao nhiêu lớp). ReLU thêm "phi tuyến" cho phép network học các pattern phức tạp hơn.

```
ReLU(−3.5) = 0
ReLU(0)    = 0
ReLU(2.7)  = 2.7
ReLU(8.1)  = 8.1
```

---

### Embedding (Nhúng)

Cách biểu diễn các danh mục rời rạc (như "leafy", "root", "fruit", "herbs") thành vector số học. Mỗi danh mục được gán một vector riêng — các số trong vector được học trong quá trình training.

Ví dụ: `nn.Embedding(4, 8)` tạo ra bảng tra cứu 4 hàng × 8 cột. Khi input là "root" (index = 1), output là hàng thứ 1 của bảng — một vector 8 số.

---

### Replay Buffer (Bộ nhớ kinh nghiệm)

Một kho lưu trữ các "ký ức" từ quá khứ. Mỗi ký ức là một transition (chuyển đổi):

```
(trạng_thái_cũ, action_đã_chọn, reward_nhận_được, trạng_thái_mới, có_kết_thúc_không)
```

Trong training, DDQN không học từ kinh nghiệm ngay lập tức (điều đó không ổn định). Thay vào đó, nó lưu kinh nghiệm vào buffer rồi sample ngẫu nhiên để học. Điều này giúp:
- Phá vỡ sự tương quan giữa các bước liên tiếp
- Học từ cùng một kinh nghiệm nhiều lần

---

### Online Network và Target Network

Hai bản copy của cùng một kiến trúc network:

**Online Network:** Được update (cập nhật weights) ở mỗi bước training. Đây là network "đang học".

**Target Network:** Bản copy của Online, nhưng weights được giữ **cố định** trong nhiều bước. Chỉ được sync (copy weights từ Online) định kỳ.

Tại sao cần hai? Vì nếu dùng một network để vừa dự đoán Q hiện tại vừa tính Q mục tiêu, mỗi lần update sẽ thay đổi cả hai cùng lúc — như đuổi theo cái bóng của chính mình. Target Network làm cho mục tiêu ổn định trong một khoảng thời gian.

---

### Action Masking (Che action)

Cơ chế cấm network chọn các action không hợp lệ. Ví dụ: hàng freshness 0.3 không được tăng giá. Action Masking set giá trị Q của các action bị cấm về âm vô cực (`-∞`) → argmax không bao giờ chọn chúng.

---

### Batch (Lô)

Trong machine learning, thay vì xử lý từng mẫu dữ liệu một, ta xử lý nhiều mẫu đồng thời — gọi là một batch. Ký hiệu `B` là kích thước batch. Ví dụ với `B = 256`: network xử lý 256 sản phẩm cùng lúc trong một lần tính toán.

---

### Tensor

Cách PyTorch (thư viện deep learning) gọi mảng số nhiều chiều:
- 1 chiều: danh sách số, ví dụ `[1.2, 3.4, 5.6]` — shape `(3,)`
- 2 chiều: bảng số, ví dụ ma trận 4 hàng × 8 cột — shape `(4, 8)`
- 3 chiều: khối số — shape `(B, T, D)` nghĩa là B mẫu, mỗi mẫu T bước thời gian, mỗi bước D chiều

---

## 3. Dữ liệu đầu vào

DDQN nhận ba đầu vào:

### Đầu vào 1: Observation Vector — 10 số mô tả sản phẩm

| Vị trí | Tên | Mô tả | Ví dụ |
|--------|-----|--------|-------|
| [0] | freshness | Độ tươi, từ 0.0 (hỏng) đến 1.0 (mới nhất) | 0.82 |
| [1] | inv_ratio | Tỷ lệ tồn kho: tồn_kho_hiện_tại / tồn_kho_tối_đa | 0.60 |
| [2] | sin_dow | sin(2π × ngày_trong_tuần / 7) — encode thứ ngày | 0.78 |
| [3] | cos_dow | cos(2π × ngày_trong_tuần / 7) — encode thứ ngày | 0.62 |
| [4] | days_restock | Số ngày đến lần nhập hàng tiếp theo, chia cho 30 | 0.23 |
| [5] | demand_ratio | Cầu dự báo / tồn kho hiện tại | 0.45 |
| [6] | prev_delta | Mức điều chỉnh giá lần trước (ví dụ -0.10 = -10%) | -0.10 |
| [7] | comp_ratio | Giá mình / giá đối thủ | 1.05 |
| [8] | days_to_waste | Số ngày ước tính đến khi freshness < 0.5, chia cho 30 | 0.40 |
| [9] | inv_coverage | Số ngày tồn kho đủ dùng dựa trên cầu hiện tại | 3.20 |

Tất cả 10 số này được gộp thành một vector duy nhất: `obs = [0.82, 0.60, 0.78, 0.62, 0.23, 0.45, -0.10, 1.05, 0.40, 3.20]`

### Đầu vào 2: Category ID — số nguyên cho loại sản phẩm

```
0 = leafy  (rau lá: rau muống, cải...)
1 = root   (củ: cà rốt, khoai tây...)
2 = fruit  (trái cây: táo, cam...)
3 = herbs  (rau thơm: húng, ngò...)
```

### Đầu vào 3: Mask — 11 giá trị True/False

Cho biết action nào được phép dùng:
```
mask = [True, True, True, True, True, True, True, False, False, False, False]
        -30%  -25%  -20%  -15%  -10%  -5%   0%   +5%   +10%  +15%  +20%
```

---

## 4. 11 lựa chọn giá — Action Space

DDQN không chọn một con số giá tùy ý — nó chọn 1 trong 11 mức điều chỉnh định sẵn:

```python
CANDIDATES = [-0.30, -0.25, -0.20, -0.15, -0.10, -0.05, 0.00, +0.05, +0.10, +0.15, +0.20]
#              index:  0      1      2      3      4      5     6      7      8      9     10
```

Bảng chi tiết:

| Index | Phần trăm thay đổi | Ý nghĩa thực tế |
|-------|--------------------|-----------------|
| 0 | -30% | Giảm mạnh nhất — khi hàng sắp hỏng |
| 1 | -25% | Giảm rất nhiều |
| 2 | -20% | Giảm nhiều |
| 3 | -15% | Giảm vừa |
| 4 | -10% | Giảm nhẹ |
| 5 | -5%  | Giảm ít |
| 6 |  0%  | Giữ nguyên giá (HOLD) |
| 7 | +5%  | Tăng ít |
| 8 | +10% | Tăng nhẹ |
| 9 | +15% | Tăng vừa |
| 10 | +20% | Tăng tối đa — khi hàng rất tươi |

**Tại sao không đối xứng (-30% đến +20% thay vì ±25%)?**
Rau củ có thể cần giảm giá mạnh hơn khi freshness thấp, nhưng tăng giá quá cao tạo phản ứng tiêu cực từ khách hàng. Asymmetry này phản ánh thực tế thị trường.

**Cách áp dụng:** Nếu giá hiện tại là 50,000 VNĐ và DDQN chọn index 8 (+10%):
```
giá_mới = 50,000 × (1 + 0.10) = 55,000 VNĐ
```

---

## 5. Kiến trúc network — từng lớp chi tiết

Network có tên `SharedMLPDuelingQNet`. Có 5 phần chính:

```
obs (10 số)          cat_id (1 số nguyên)
     │                        │
     │               ┌────────▼────────────────┐
     │               │  Category Embedding      │
     │               │  Bảng tra 4 hàng × 8 cột │
     │               │  Output: 8 số            │
     │               └────────┬────────────────┘
     │                        │
     └──────────┬─────────────┘
                │  Ghép lại: 10 + 8 = 18 số
                ▼
     ┌──────────────────────────────────────────┐
     │           Shared Trunk (MLP)             │
     │  Linear(18 → 128) + ReLU                 │
     │  Linear(128 → 128) + ReLU                │
     │  Output: 128 số ("mã hóa trạng thái")    │
     └──────────────────┬───────────────────────┘
                        │
           ┌────────────┴──────────────┐
           │                           │
┌──────────▼───────────┐   ┌───────────▼──────────────┐
│     V-stream          │   │       A-stream            │
│  (Value / Giá trị)    │   │  (Advantage / Lợi thế)   │
│  Linear(128→64)+ReLU  │   │  Linear(128→64)+ReLU      │
│  Linear(64→1)         │   │  Linear(64→11)            │
│  Output: 1 số V(s)    │   │  Output: 11 số A(s,·)     │
└──────────┬───────────┘   └───────────┬──────────────┘
           │                           │
           └────────────┬──────────────┘
                        │
            Q(s,a) = V(s) + A(s,a) - mean(A(s,·))
                        │
                   11 Q-values
                        │
            masked_fill(-∞ cho actions bị cấm)
                        │
                  argmax → action_index
```

---

### Lớp 1: Category Embedding

**Code:**
```python
self.cat_embed = nn.Embedding(num_embeddings=4, embedding_dim=8)
```

**Ý nghĩa:**

Tạo một bảng tra cứu 4 hàng × 8 cột (tổng 32 số, đều được học trong training):

```
Bảng embedding (các số này được học):
         dim0   dim1   dim2   dim3   dim4   dim5   dim6   dim7
leafy(0): 0.12  -0.34   0.56  -0.21   0.89  -0.45   0.23  -0.67
root (1): 0.45   0.23  -0.12   0.67  -0.34   0.78  -0.56   0.12
fruit(2): 0.78  -0.56   0.34  -0.89   0.12   0.45  -0.23   0.67
herbs(3): 0.23  -0.12   0.67  -0.45   0.56  -0.89   0.34  -0.12
```

Khi input là category "root" (index = 1), output là hàng thứ 1:
```
emb = [0.45, 0.23, -0.12, 0.67, -0.34, 0.78, -0.56, 0.12]
```

**Tại sao inject category vào đầu (không phải cuối như LSTM)?**
Trong DDQN, loại sản phẩm ảnh hưởng đến toàn bộ quá trình ra quyết định ngay từ đầu. Leafy và root cần học hành vi giá hoàn toàn khác nhau — inject sớm giúp shared trunk "biết" mình đang xử lý loại nào ngay từ lớp đầu tiên.

---

### Lớp 2: Concatenate (Ghép vector)

**Code:**
```python
x = torch.cat([obs, emb], dim=1)
```

Ghép vector obs 10 chiều với embedding 8 chiều thành vector 18 chiều:

```
obs = [0.82, 0.60, 0.78, 0.62, 0.23, 0.45, -0.10, 1.05, 0.40, 3.20]  ← 10 số
emb = [0.45, 0.23, -0.12, 0.67, -0.34, 0.78, -0.56, 0.12]             ← 8 số
x   = [0.82, 0.60, 0.78, 0.62, 0.23, 0.45, -0.10, 1.05, 0.40, 3.20,
        0.45, 0.23, -0.12, 0.67, -0.34, 0.78, -0.56, 0.12]             ← 18 số
```

---

### Lớp 3: Shared Trunk — MLP 18→128→128

**Code:**
```python
self.shared = nn.Sequential(
    nn.Linear(18, 128), nn.ReLU(),
    nn.Linear(128, 128), nn.ReLU(),
)
```

**Lớp 3a — Linear(18 → 128):**
- Ma trận weights W có shape (128, 18): 128 × 18 = 2,304 số được học
- Vector bias b có shape (128,): 128 số được học
- Mỗi 1 trong 128 output là tổ hợp tuyến tính của toàn bộ 18 inputs
- Sau đó ReLU: mọi số âm thành 0

**Lớp 3b — Linear(128 → 128):**
- Ma trận weights W có shape (128, 128): 128 × 128 = 16,384 số được học
- Vector bias b có shape (128,): 128 số được học
- Sau ReLU: output là vector `h` — 128 số

**`h` là gì?** Vector 128 chiều này là "bản mã hóa nén" của toàn bộ thông tin đầu vào (trạng thái sản phẩm + loại). Nó chứa những pattern cần thiết để ước lượng Q-values. Cả V-stream và A-stream đều dùng chung `h` này — đó là lý do trunk được gọi là "shared" (dùng chung).

---

### Lớp 4a: V-stream — tính V(s)

**Code:**
```python
self.v_stream = nn.Sequential(
    nn.Linear(128, 64), nn.ReLU(),
    nn.Linear(64, 1),
)
```

V-stream nhận `h` (128 số) và output **một số duy nhất** `V(s)`.

**V(s) là gì?** Giá trị baseline của state — "state này vốn tốt hay xấu, bất kể tôi làm gì?"

Ví dụ:
- Sản phẩm root, freshness=0.92, cầu cao, còn nhiều hàng → V(s) = +6.5 (state tốt)
- Sản phẩm herbs, freshness=0.15, cầu thấp, hầu hết hàng đã hỏng → V(s) = -8.3 (state rất xấu)

**Forward pass qua V-stream:**
```
h:   (128 số)
  → Linear(128→64): W shape (64,128), b shape (64,) → 64 số
  → ReLU: tất cả số âm thành 0
  → Linear(64→1):   W shape (1,64),  b shape (1,)  → 1 số = V(s)
```

---

### Lớp 4b: A-stream — tính A(s, a) cho 11 actions

**Code:**
```python
self.a_stream = nn.Sequential(
    nn.Linear(128, 64), nn.ReLU(),
    nn.Linear(64, 11),
)
```

A-stream nhận `h` (128 số) và output **11 số** `A(s, 0), A(s, 1), ..., A(s, 10)`.

**A(s, a) là gì?** Lợi thế tương đối của action `a` tại state `s`. Số dương = action này tốt hơn trung bình. Số âm = tệ hơn trung bình.

Ví dụ tại state freshness=0.82 (root, tươi tốt):
```
A = [−3.5, −2.8, −2.1, −1.5, −0.8, −0.3, 0.0, +0.6, +1.2, +1.5, +1.4]
     -30%  -25%  -20%  -15%  -10%   -5%   0%   +5%  +10%  +15%  +20%
```
→ Lợi thế cao nhất ở +15% và +10% — hàng tươi nên tăng giá

**Forward pass qua A-stream:**
```
h:   (128 số)
  → Linear(128→64): W shape (64,128), b shape (64,) → 64 số
  → ReLU: tất cả số âm thành 0
  → Linear(64→11):  W shape (11,64), b shape (11,)  → 11 số = A(s,·)
```

---

### Lớp 5: Dueling Combination — ghép V và A thành Q

**Code:**
```python
q = v + a - a.mean(dim=1, keepdim=True)
```

**Công thức:**
```
Q(s, a_i) = V(s)  +  A(s, a_i)  −  mean_{a'} A(s, a')

trong đó:
  mean_{a'} A(s, a') = (1/11) × Σ_{i=0}^{10} A(s, a_i)
                     = trung bình cộng của 11 A-values
```

**Tại sao phải trừ mean(A)?**

Không trừ mean: `Q = V + A` có **identifiability problem**:

Vấn đề: Có vô số cách phân tách V và A mà cho ra cùng Q. Ví dụ:
- V=5, A=[2, 1, 0, -1, -2] → Q=[7, 6, 5, 4, 3]
- V=7, A=[0, -1, -2, -3, -4] → Q=[7, 6, 5, 4, 3]

Hai phân tách cho cùng Q nhưng V và A hoàn toàn khác nhau. Network không biết học cái nào → không ổn định.

Trừ mean: buộc `mean(A) = 0` sau phép trừ. Kiểm chứng:
```
mean_{a'} [A(s,a') − mean(A)] = mean(A) − mean(A) = 0   ✓
```
Giờ chỉ có một cách phân tách duy nhất: V thực sự là baseline, A thực sự là relative advantage. Gradient descent ổn định hơn.

---

### Lớp 6: Action Masking

**Code:**
```python
if mask is not None:
    q = q.masked_fill(~mask, float("-inf"))
```

**Công thức:**
```
Q_masked(s, a) = ⎧ Q(s, a)    nếu mask[a] = True   (action hợp lệ)
                 ⎩ −∞          nếu mask[a] = False  (action bị cấm)

Action được chọn: a* = argmax_{a: mask[a]=True} Q(s, a)
```

- `mask`: tensor boolean 11 phần tử — `True` = được phép, `False` = bị cấm
- `~mask` = đảo ngược (`True` ↔ `False`)
- `masked_fill(~mask, −∞)` = set Q-value của các actions bị cấm về âm vô cực

**Tại sao `−∞` thay vì số âm rất lớn như −9999?**

```
argmax chọn số lớn nhất. Nếu dùng −9999:
  Q_valid = [2.1, 3.5, 1.8]  và  Q_invalid = −9999
  Nếu Q_valid tất cả đều < −9999 (rất hiếm nhưng có thể xảy ra trong early training)
  → argmax vẫn có thể chọn action bị cấm!

Với −∞:
  −∞ < bất_kỳ_số_hữu_hạn_nào
  → argmax KHÔNG BAO GIỜ chọn −∞, dù Q của actions khác là gì
```

---

### Lớp 7: argmax → action → giá

**Code:**
```python
action_idx = int(q.squeeze().argmax().item())
delta       = float(CANDIDATES[action_idx])
target_price = base_price × (1.0 + delta)
```

**Công thức:**
```
a*           = argmax_{a ∈ valid} Q_masked(s, a)
delta        = CANDIDATES[a*]          ∈ {−0.30, −0.25, ..., 0.00, ..., +0.20}
target_price = base_price × (1 + delta)
```

- `argmax` trả về index (0–10) của Q-value lớn nhất trong các actions hợp lệ
- `CANDIDATES[a*]` tra bảng → delta thực tế (ví dụ: index 9 → +0.15)
- Nhân với `base_price` → giá bằng VNĐ trước safety layer

---

## 6. Ví dụ tính toán đầy đủ — từng con số

Đây là ví dụ tracing **một sản phẩm** qua toàn bộ network với những số cụ thể. Các weights được đơn giản hóa nhưng cấu trúc tính toán là chính xác.

### Thông tin đầu vào

```
Sản phẩm: Root (củ cà rốt)
Giá hiện tại: 50,000 VNĐ
Freshness: 0.82 (còn khá tươi)
Tồn kho: 60 đơn vị / tối đa 100 → inv_ratio = 0.60
Ngày: Thứ Tư (day_of_week = 3)
Ngày đến restock: 7 ngày → days_restock = 7/30 = 0.23
Cầu dự báo 7 ngày tới: 27 đơn vị → demand_ratio = 27/60 = 0.45
Delta lần trước: -10% → prev_delta = -0.10
Giá đối thủ: 47,500 VNĐ → comp_ratio = 50,000/47,500 = 1.053 ≈ 1.05
Days to waste: ~12 ngày → days_to_waste = 12/30 = 0.40
Inventory coverage: 60/18.7 ≈ 3.2 ngày
```

---

### Bước 1: Xây dựng Observation Vector

```
obs = [
  freshness:     0.82,   ← pos[0]
  inv_ratio:     0.60,   ← pos[1]
  sin_dow:       sin(2π×3/7) = sin(2.69) ≈  0.44,  ← pos[2]
  cos_dow:       cos(2π×3/7) = cos(2.69) ≈ -0.90,  ← pos[3]
  days_restock:  7/30 = 0.23,  ← pos[4]
  demand_ratio:  27/60 = 0.45, ← pos[5]
  prev_delta:   -0.10,  ← pos[6]
  comp_ratio:    1.05,  ← pos[7]
  days_to_waste: 12/30 = 0.40, ← pos[8]
  inv_coverage:  3.20   ← pos[9]
]
```

Kết quả: `obs = [0.82, 0.60, 0.44, -0.90, 0.23, 0.45, -0.10, 1.05, 0.40, 3.20]`

---

### Bước 2: Category Embedding cho "root"

Root có index = 1. Tra bảng Embedding tại hàng 1:

```
Giả sử bảng embedding đã học được:
root (index 1) → [0.45, 0.23, -0.12, 0.67, -0.34, 0.78, -0.56, 0.12]
```

Kết quả: `emb = [0.45, 0.23, -0.12, 0.67, -0.34, 0.78, -0.56, 0.12]`

---

### Bước 3: Concatenate thành vector x (18 chiều)

```
x = [obs | emb]
  = [0.82, 0.60, 0.44, -0.90, 0.23, 0.45, -0.10, 1.05, 0.40, 3.20,
     0.45, 0.23, -0.12, 0.67, -0.34, 0.78, -0.56, 0.12]
     ←──────────────── obs ────────────────→ ←──── emb ────→
```

---

### Bước 4: Shared Trunk — Linear(18→128)

Trong thực tế, mỗi trong 128 outputs là tổ hợp tuyến tính của 18 inputs. Để minh họa, tính 3 trong số 128 outputs:

```
Giả sử 3 dòng đầu của W (128×18 matrix):
  W[0] = [0.21, -0.15, 0.08, 0.34, -0.22, 0.11, 0.47, -0.09, 0.18, 0.25,
           0.13, -0.31, 0.19, -0.07, 0.42, 0.16, -0.28, 0.24]
  W[1] = [-0.18, 0.29, -0.14, 0.08, 0.35, -0.27, 0.12, 0.41, -0.09, 0.17,
            0.22, 0.14, -0.33, 0.26, -0.11, 0.39, 0.07, -0.21]
  W[2] = [0.09, -0.23, 0.31, 0.17, -0.08, 0.44, -0.16, 0.28, 0.12, -0.35,
           0.41, 0.08, -0.19, 0.27, 0.15, -0.37, 0.23, 0.11]

bias = [0.05, -0.03, 0.08, ...]

h1_raw[0] = 0.82×0.21 + 0.60×(-0.15) + 0.44×0.08 + (-0.90)×0.34
           + 0.23×(-0.22) + 0.45×0.11 + (-0.10)×0.47 + 1.05×(-0.09)
           + 0.40×0.18 + 3.20×0.25 + 0.45×0.13 + 0.23×(-0.31)
           + (-0.12)×0.19 + 0.67×(-0.07) + (-0.34)×0.42 + 0.78×0.16
           + (-0.56)×(-0.28) + 0.12×0.24 + bias[0]

= 0.172 + (-0.090) + 0.035 + (-0.306)
  + (-0.051) + 0.050 + (-0.047) + (-0.094)
  + 0.072 + 0.800 + 0.059 + (-0.071)
  + (-0.023) + (-0.047) + (-0.143) + 0.125
  + 0.157 + 0.029 + 0.05

= 0.727

h1_raw[1] = ... (tương tự) ≈ -0.341
h1_raw[2] = ... (tương tự) ≈  0.813
```

---

### Bước 5: ReLU sau Linear(18→128)

```
h1_raw[0] =  0.727  → ReLU →  0.727  (dương, giữ nguyên)
h1_raw[1] = -0.341  → ReLU →  0.000  (âm, thành 0)
h1_raw[2] =  0.813  → ReLU →  0.813  (dương, giữ nguyên)
...
(128 số, mỗi số âm thành 0, số dương giữ nguyên)
```

Kết quả sau lớp 1: vector 128 số, nhiều số = 0 do ReLU.

---

### Bước 6: Linear(128→128) + ReLU → ra `h`

Tương tự bước 4-5 nhưng với 128 inputs. Output là vector `h` — 128 số, đây là "bản mã hóa" của trạng thái.

```
Giả sử kết quả (toàn bộ 128 số, chỉ hiển thị vài số đầu):
h = [0.0, 1.24, 0.0, 0.76, 0.88, 0.0, 0.43, 1.67, ..., 0.95]
    (nhiều số = 0 do ReLU)
```

---

### Bước 7: V-stream tính V(s)

```
h (128 số) → Linear(128→64) → ReLU → Linear(64→1) → V(s)
```

Giả sử sau toàn bộ V-stream:
```
V(s) = 1.85
```

Diễn giải: State "root freshness=0.82" có giá trị baseline +1.85 — khá tốt, agent có thể kỳ vọng tổng reward tích lũy tốt từ state này bất kể action nào.

---

### Bước 8: A-stream tính A(s, a) cho 11 actions

```
h (128 số) → Linear(128→64) → ReLU → Linear(64→11) → A(s,·)
```

Giả sử output của A-stream (11 số, mỗi số cho một action):

```
A(s, ·) = [−3.20, −2.50, −1.80, −1.10, −0.40, 0.10, 0.30, 0.60, 0.90, 1.20, 1.10]
index:       0       1      2      3      4      5     6     7     8     9     10
delta:     -30%   -25%   -20%   -15%   -10%   -5%   0%   +5%  +10%  +15%  +20%
```

Diễn giải: Tại state này (root tươi), các actions tăng giá (+5% đến +20%) có lợi thế dương, các actions giảm giá mạnh có lợi thế rất âm.

---

### Bước 9: Tính mean(A)

```
mean(A) = (−3.20 + −2.50 + −1.80 + −1.10 + −0.40 + 0.10 + 0.30 + 0.60 + 0.90 + 1.20 + 1.10) / 11

Tổng = −3.20 − 2.50 − 1.80 − 1.10 − 0.40 + 0.10 + 0.30 + 0.60 + 0.90 + 1.20 + 1.10
     = −3.20 − 2.50 − 1.80 − 1.10 − 0.40 + 4.20
     = −7.00 + 4.20
     = −4.80

     Nhưng chờ, tính lại:
     −3.20 − 2.50 = −5.70
     −5.70 − 1.80 = −7.50
     −7.50 − 1.10 = −8.60
     −8.60 − 0.40 = −9.00
     −9.00 + 0.10 = −8.90
     −8.90 + 0.30 = −8.60
     −8.60 + 0.60 = −8.00
     −8.00 + 0.90 = −7.10
     −7.10 + 1.20 = −5.90
     −5.90 + 1.10 = −4.80

mean(A) = −4.80 / 11 = −0.436
```

---

### Bước 10: Dueling Combination — tính Q(s, a)

```
Q(s, a) = V(s) + A(s, a) − mean(A(s, ·))
        = 1.85  + A(s, a) − (−0.436)
        = 1.85  + A(s, a) + 0.436
        = 2.286 + A(s, a)
```

Tính Q cho từng action:

| Index | Delta | A(s,a) | Q = 2.286 + A |
|-------|-------|---------|---------------|
| 0 | -30% | −3.20 | 2.286 + (−3.20) = **−0.914** |
| 1 | -25% | −2.50 | 2.286 + (−2.50) = **−0.214** |
| 2 | -20% | −1.80 | 2.286 + (−1.80) = **+0.486** |
| 3 | -15% | −1.10 | 2.286 + (−1.10) = **+1.186** |
| 4 | -10% | −0.40 | 2.286 + (−0.40) = **+1.886** |
| 5 |  -5% |  0.10 | 2.286 + 0.10   = **+2.386** |
| 6 |   0% |  0.30 | 2.286 + 0.30   = **+2.586** |
| 7 |  +5% |  0.60 | 2.286 + 0.60   = **+2.886** |
| 8 | +10% |  0.90 | 2.286 + 0.90   = **+3.186** ← cao nhất (trước mask) |
| 9 | +15% |  1.20 | 2.286 + 1.20   = **+3.486** ← cao nhất (trước mask) |
| 10 | +20% |  1.10 | 2.286 + 1.10   = **+3.386** |

---

### Bước 11: Action Masking

Root với freshness=0.82: nằm trong khoảng 0.70–0.85 (Wide Cap Zone).

```
target_delta = +0.20 × (0.82 − 0.70) / (0.85 − 0.70)
             = +0.20 × 0.12 / 0.15
             = +0.20 × 0.80
             = +0.16

Actions được phép: từ -30% đến +15% (index 0 đến 9)
Actions bị cấm: +20% (index 10) vì vượt target 0.16

mask = [True, True, True, True, True, True, True, True, True, True, False]
        0      1      2     3     4     5     6     7     8     9    10
```

Sau khi áp dụng mask:

```
Q[0]  = −0.914  (hợp lệ)
Q[1]  = −0.214  (hợp lệ)
Q[2]  = +0.486  (hợp lệ)
Q[3]  = +1.186  (hợp lệ)
Q[4]  = +1.886  (hợp lệ)
Q[5]  = +2.386  (hợp lệ)
Q[6]  = +2.586  (hợp lệ)
Q[7]  = +2.886  (hợp lệ)
Q[8]  = +3.186  (hợp lệ)
Q[9]  = +3.486  (hợp lệ) ← lớn nhất trong các actions hợp lệ
Q[10] = −∞      (BỊ CẤM: bị set về âm vô cực)
```

---

### Bước 12: argmax → chọn action

```
argmax(Q_masked) = index 9 (Q = +3.486, lớn nhất)
delta = CANDIDATES[9] = +0.15 = +15%
```

---

### Bước 13: Tính giá mới

```
target_price = base_price × (1 + delta)
             = 50,000 × (1 + 0.15)
             = 50,000 × 1.15
             = 57,500 VNĐ
```

---

### Bước 14: Safety Layer kiểm tra 5 rules

```
target_price = 57,500 VNĐ
base_price   = 50,000 VNĐ
freshness    = 0.82

Rule 3 (Max tick: phải nằm trong 70%–120% giá gốc):
  min allowed = 50,000 × 0.70 = 35,000 VNĐ
  max allowed = 50,000 × 1.20 = 60,000 VNĐ
  57,500 nằm trong [35,000, 60,000] → PASS, không thay đổi

Rule 4 (Freshness mandate: nếu freshness < 0.40, giá ≤ 75% giá gốc):
  freshness = 0.82 > 0.40 → PASS, không áp dụng

Rule 1 (Cost floor: giá ≥ 55% giá gốc):
  55% × 50,000 = 27,500 VNĐ
  57,500 > 27,500 → PASS

Rule 2 (Price ceiling: giá ≤ 200% giá gốc):
  200% × 50,000 = 100,000 VNĐ
  57,500 < 100,000 → PASS

Rule 5 (Minimum price: giá ≥ 1,000 VNĐ):
  57,500 > 1,000 → PASS

Tất cả 5 rules đều pass.
safety_clipped = False (giá không bị thay đổi bởi safety)
```

---

### Kết quả cuối cùng

```
Input:  root, freshness=0.82, giá hiện tại 50,000 VNĐ
Output: Tăng giá 15% → giá mới = 57,500 VNĐ
        safety_clipped = False (không bị rule nào can thiệp)
```

**Luồng ra quyết định của DDQN trong ví dụ này:**
1. Root tươi (freshness=0.82) → V(s) = +1.85 (state tốt)
2. A-stream nhận thấy tăng giá có lợi thế lớn hơn giảm giá
3. Q = 1.85 + A + 0.436 → action +15% có Q cao nhất trong các actions hợp lệ
4. +20% bị mask vì freshness chưa đạt 0.85
5. Safety layer không cần can thiệp
6. Giá tăng từ 50,000 → 57,500 VNĐ

---

## 7. Action Masking — cấm actions không hợp lệ

### Tại sao cần masking?

Nếu không có masking, DDQN có thể chọn +20% cho một sản phẩm freshness=0.2. Điều đó vô nghĩa về mặt kinh doanh. Masking đảm bảo agent chỉ chọn actions hợp lý dựa trên freshness và category.

### 5 trường hợp masking:

**Trường hợp 1 — Freshness ≤ 0.50 (Hàng đã hỏng hoặc sắp hỏng)**

```
mask = [F, F, F, F, F, F, T, F, F, F, F]
        -30 -25 -20 -15 -10 -5  0  +5 +10 +15 +20

Chỉ được chọn delta = 0 (giữ nguyên).
Lý do: hàng ở giai đoạn này không nên bán — trang trại xử lý.
       Không giảm giá thêm (đã đáy), không tăng giá (vô lý).
```

**Trường hợp 2 — leafy hoặc herbs, freshness > 0.50**

```
mask = [T, T, T, T, T, T, T, F, F, F, F]
        -30 -25 -20 -15 -10 -5  0  +5 +10 +15 +20

Được giảm hoặc giữ nguyên, KHÔNG được tăng giá.
Lý do: rau lá và rau thơm là hàng hóa phổ thông (commodity).
       Khách hàng nhạy cảm với tăng giá — không được premium pricing.
```

**Trường hợp 3 — fruit hoặc root, freshness 0.50–0.70 (Vùng discount)**

```
mask = [T, T, T, T, T, T, T, F, F, F, F]
        (giống trường hợp 2)

Freshness chưa đủ tốt để premium — chỉ được giảm hoặc giữ.
```

**Trường hợp 4 — fruit hoặc root, freshness 0.70–0.85 (Vùng cap tuyến tính)**

```
Công thức target delta (piecewise linear):

  Với fruit/root, f = freshness:

    f ≥ 0.85:               δ* = +0.20
    0.70 ≤ f < 0.85:        δ* = +0.20 × (f − 0.70) / (0.85 − 0.70)
    0.50 ≤ f < 0.70:        δ* = −0.30 × (0.70 − f) / (0.70 − 0.50)
    f < 0.50:               δ* = −0.30

  Với leafy/herbs:
    f ≥ 0.75:               δ* = 0.00
    0.50 ≤ f < 0.75:        δ* = −0.30 × (0.75 − f) / (0.75 − 0.50)
    f < 0.50:               δ* = −0.30

Ví dụ freshness = 0.77 (fruit/root, nằm trong [0.70, 0.85]):
  δ* = +0.20 × (0.77 − 0.70) / (0.85 − 0.70)
     = +0.20 × 0.07 / 0.15
     = +0.20 × 0.467
     = +0.093  (khoảng +9.3%)

Mask cho phép: actions có delta ≤ +0.093 → indices 0..8 = True, indices 9..10 = False
mask = [T, T, T, T, T, T, T, T, T, F, F]
```

**Trường hợp 5 — fruit hoặc root, freshness ≥ 0.85 (Vùng premium)**

```
mask = [T, T, T, T, T, T, T, T, T, T, T]

Mọi action đều hợp lệ — hàng rất tươi, được phép tăng tối đa +20%.
```

### Bảng tổng hợp

| Category | Khoảng freshness | Được phép |
|----------|-----------------|-----------|
| Bất kỳ | 0.00 – 0.50 | Chỉ 0% |
| leafy / herbs | 0.50 – 1.00 | -30% đến 0% |
| fruit / root | 0.50 – 0.70 | -30% đến 0% |
| fruit / root | 0.70 – 0.85 | -30% đến target (tuyến tính) |
| fruit / root | 0.85 – 1.00 | -30% đến +20% |

---

## 8. Safety Layer — 5 quy tắc cứng cuối cùng

Safety layer chạy **SAU** khi DDQN đã chọn action và tính giá. Đây không phải phần của model — đây là hard constraints về kinh doanh.

```python
def apply_safety(price: float, base_price: float, freshness: float):
    # Rule 3: Giới hạn biến động tối đa trong một bước
    #         Không được thay đổi quá 30% giảm hoặc 20% tăng
    price = max(base_price × 0.70, min(price, base_price × 1.20))

    # Rule 4: Freshness mandate
    #         Nếu hàng gần hỏng (freshness < 0.40), giá không được > 75% giá gốc
    if freshness < 0.40:
        price = min(price, base_price × 0.75)

    # Rule 1: Cost floor — không bán lỗ dưới 55% giá gốc
    price = max(price, base_price × 0.55)

    # Rule 2: Price ceiling — không bán quá 200% giá gốc
    price = min(price, base_price × 2.0)

    # Rule 5: Minimum viable price — không bán dưới 1,000 VNĐ
    price = max(price, 1000.0)

    return price
```

**Thứ tự rules quan trọng:** Rule 3 chạy trước (giới hạn tick) → Rule 4 (freshness) → Rule 1 (cost floor) → Rule 2 (ceiling) → Rule 5 (minimum).

**Tại sao không đưa safety vào reward?**
Nếu encode "vi phạm rule → reward âm", DDQN có thể học cách "tiếp cận ranh giới" mà không vi phạm. Hard post-processing đảm bảo 100% compliance tuyệt đối, bất kể DDQN học được gì.

---

## 9. Hai networks — Online và Target

DDQN dùng hai bản copy của cùng một kiến trúc `SharedMLPDuelingQNet`.

### Tại sao cần hai networks?

**Vấn đề với một network:**

Nếu dùng một network cho cả tính Q hiện tại và tính Q target:

```
target = r + γ × max_a' Q_θ(s', a')    ← Q_θ cũng trong target
loss   = (Q_θ(s,a) − target)²
```

Mỗi lần update θ → Q_θ thay đổi → target cũng thay đổi ngay lập tức. Như đang đuổi theo cái bóng của chính mình — mỗi bước tiến thì đích lại nhảy đi chỗ khác. Training rất không ổn định, dễ không hội tụ.

**Giải pháp:**

```
Online Network (θ):    được update mỗi step training
Target Network (θ⁻):  bản copy cũ, weights CỐ ĐỊNH trong nhiều bước
                       Chỉ sync (copy từ online) mỗi N steps
```

Target network đảm bảo "đích" ổn định trong một khoảng thời gian → training ổn định hơn nhiều.

```python
# Khởi tạo
self._online = SharedMLPDuelingQNet(...)
self._target = SharedMLPDuelingQNet(...)
self._target.load_state_dict(self._online.state_dict())  # copy weights ban đầu
self._target.eval()  # không bao giờ train

# Sync định kỳ (gọi mỗi N steps)
def sync_target(self):
    self._target.load_state_dict(self._online.state_dict())
    # Copy toàn bộ 36,268 weights từ online → target
```

---

## 10. DDQN so với DQN — điểm khác biệt quan trọng

### DQN (Deep Q-Network, phiên bản cũ)

**Công thức target:**
```
a*     = argmax_{a'} Q_θ⁻(s', a')     ← target network chọn action
y      = r  +  γ × Q_θ⁻(s', a*)      ← target network cũng đánh giá
loss   = SmoothL1(Q_θ(s, a) − y)
```

**Vấn đề — Overestimation Bias:**

Target network vừa chọn action (argmax) vừa đánh giá Q của action đó. Nếu Q tại action nào đó bị overestimate (ước lượng quá cao) do noise trong training, argmax sẽ chọn đúng action bị overestimate đó → Q_next cũng bị overestimate → target bị inflate → DDQN học Q-values cao hơn thực tế → quyết định sai.

### DDQN (Double DQN, phiên bản hiện tại)

**Công thức target:**
```
a*     = argmax_{a'} Q_θ(s', a')      ← online network chọn action
y      = r  +  γ × Q_θ⁻(s', a*)      ← target network đánh giá
loss   = SmoothL1(Q_θ(s, a) − y)
```

Trong đó:
- `Q_θ` = online network (weights `θ`, được update mỗi step)
- `Q_θ⁻` = target network (weights `θ⁻`, cố định nhiều steps)
- `γ = 0.99` = discount factor

```python
# Bước 1: Online chọn action tốt nhất ở state tiếp theo
q_online_next  = self._online(next_obs, cat_ids, next_mask)
a_best         = q_online_next.argmax(dim=1)   # online chọn action

# Bước 2: Target đánh giá Q tại action đó (do online chọn)
q_target_next  = self._target(next_obs, cat_ids, next_mask)
q_next         = q_target_next.gather(1, a_best.unsqueeze(1)).squeeze(1)
                 # target đánh giá — nhưng không chọn action

# Bước 3: Bellman target
target = r + γ × q_next
```

**Tại sao tốt hơn?**
Tách biệt:
- Online chọn action (online biết policy hiện tại tốt nhất)
- Target đánh giá Q của action đó (target ổn định hơn cho việc đánh giá)

Nếu online overestimate Q của một action → chọn nó → nhưng target đánh giá Q của nó không nhất thiết cũng overestimate → giảm bias.

**Giải thích `gather(1, a_best.unsqueeze(1)).squeeze(1)`:**

`gather` là cách PyTorch "tra cứu" Q-value của một action cụ thể trong bảng Q:

```
q_target_next có shape (Batch, 11) — Q-values cho 11 actions
a_best có shape (Batch,) — index của action được chọn

a_best.unsqueeze(1) có shape (Batch, 1) — thêm chiều để gather hoạt động

gather(dim=1, index=a_best.unsqueeze(1)):
  Với mỗi sample b trong batch:
    lấy q_target_next[b, a_best[b]]
  Kết quả shape: (Batch, 1)

squeeze(1): bỏ chiều dư → (Batch,)
```

Ví dụ với batch = 3:
```
q_target_next = [[1.2, 3.4, 2.1, ...],   ← sample 0: Q-values cho 11 actions
                 [0.8, 2.9, 4.1, ...],   ← sample 1
                 [2.3, 1.7, 0.9, ...]]   ← sample 2

a_best = [1, 2, 0]   ← online chọn action 1, 2, 0 cho 3 samples

q_next = [q_target_next[0][1],   = 3.4
          q_target_next[1][2],   = 4.1
          q_target_next[2][0]]   = 2.3
```

---

## 11. Replay Buffer — bộ nhớ training

### Cấu trúc

```python
self._bufs = {
    "leafy": ReplayBuffer(50_000, obs_shape=(10,), n_actions=11),
    "root":  ReplayBuffer(50_000, obs_shape=(10,), n_actions=11),
    "fruit": ReplayBuffer(50_000, obs_shape=(10,), n_actions=11),
    "herbs": ReplayBuffer(50_000, obs_shape=(10,), n_actions=11),
}
```

Mỗi buffer là một circular buffer (hàng đợi vòng) chứa tối đa 50,000 transitions. Khi đầy: transition cũ nhất bị ghi đè.

### Một transition lưu gì?

```
Transition = (
    obs:       10 số float  ← trạng thái lúc thực hiện action
    action:    1 số nguyên  ← action đã chọn (0–10)
    reward:    1 số float   ← reward nhận được
    next_obs:  10 số float  ← trạng thái sau khi thực hiện action
    done:      True/False   ← episode có kết thúc không
    next_mask: 11 bool      ← mask hợp lệ tại next_obs
)

Kích thước bộ nhớ:
  float32 × (10 + 1 + 1 + 10) = 88 bytes
  int64 × 1 = 8 bytes
  bool × (1 + 11) = 12 bytes
  ────────────────────────────
  ~108 bytes mỗi transition
  50,000 × 108 ≈ 5.4 MB mỗi buffer
  4 buffers × 5.4 MB ≈ 21.6 MB tổng
```

### Tại sao 4 buffers riêng thay vì 1 buffer chung?

```python
# Balanced sampling:
n_per_cat = 256 // 4 = 64

# Lấy đúng 64 từ mỗi category, bất kể category nào có nhiều/ít data hơn
for cat in ["leafy", "root", "fruit", "herbs"]:
    batch = self._bufs[cat].sample(64)
```

Nếu dùng 1 buffer chung: fruit có ít transitions hơn leafy (bán ít hơn) → trong batch 256, có thể có 150 leafy, 10 fruit → DDQN học kém cho fruit. 4 buffers đảm bảo mỗi category luôn chiếm đúng 25% mỗi batch.

---

## 12. Epsilon-Greedy — khám phá vs khai thác

Trong training, agent cần cân bằng:
- **Exploitation (khai thác):** chọn action tốt nhất theo Q hiện tại → an toàn nhưng không học gì mới
- **Exploration (khám phá):** chọn action ngẫu nhiên → có thể kém hơn ngay lúc đó nhưng khám phá được những actions chưa thử

```python
def act(self, obs, cat, mask, epsilon):
    valid_actions = np.where(mask)[0]   # indices của các actions hợp lệ

    if np.random.random() < epsilon:
        # EXPLORATION: chọn ngẫu nhiên từ valid actions
        return int(np.random.choice(valid_actions))
    else:
        # EXPLOITATION: chọn greedy theo Q
        obs_t  = torch.from_numpy(obs).float().unsqueeze(0)
        cat_t  = self._cat_tensors[cat]
        mask_t = torch.from_numpy(mask).unsqueeze(0)
        q      = self._online(obs_t, cat_t, mask_t)
        return int(q.squeeze().argmax().item())
```

**epsilon giảm dần theo training:**
- Ban đầu: epsilon = 1.0 → 100% ngẫu nhiên (chưa biết gì cả)
- Giữa training: epsilon = 0.3 → 30% ngẫu nhiên, 70% theo Q
- Cuối training: epsilon = 0.05 → 5% ngẫu nhiên (giữ chút exploration)

**Trong production (inference):** epsilon = 0.0 → hoàn toàn greedy, không ngẫu nhiên.

---

## 13. Một bước training hoàn chỉnh

Dưới đây là toàn bộ một lần update weights của DDQN, được giải thích chi tiết:

```python
def train_step(self) -> float | None:

    # ─── Kiểm tra warmup ────────────────────────────────────────────
    # Phải có đủ data trước khi bắt đầu train
    for cat in CATEGORIES:
        if len(self._bufs[cat]) < 1000:   # warmup = 1,000 transitions
            return None   # chưa đủ, bỏ qua
    # Lý do warmup: nếu buffer chỉ có vài transitions, sample ngẫu nhiên
    # sẽ lặp đi lặp lại những transitions đó → overfit sớm

    # ─── Sample balanced batch ──────────────────────────────────────
    # Lấy 64 transitions từ mỗi category → tổng 256 transitions
    obs_list, act_list, rew_list = [], [], []
    nobs_list, done_list, nmask_list = [], [], []

    for cat in CATEGORIES:
        b = self._bufs[cat].sample(64)    # 64 transitions ngẫu nhiên
        obs_list.append(b["obs"])         # shape: (64, 10)
        act_list.append(b["action"])      # shape: (64,)
        rew_list.append(b["reward"])      # shape: (64,)
        nobs_list.append(b["next_obs"])   # shape: (64, 10)
        done_list.append(b["done"])       # shape: (64,)
        nmask_list.append(b["next_mask"]) # shape: (64, 11)

    # Ghép 4 × 64 = 256 samples vào một batch lớn
    obs       = torch.cat(obs_list)       # shape: (256, 10)
    cat_ids   = ...                       # shape: (256,) — 64×0, 64×1, 64×2, 64×3
    action    = torch.cat(act_list)       # shape: (256,)
    reward    = torch.cat(rew_list)       # shape: (256,)
    next_obs  = torch.cat(nobs_list)      # shape: (256, 10)
    done      = torch.cat(done_list)      # shape: (256,)
    next_mask = torch.cat(nmask_list)     # shape: (256, 11)

    # ─── Tính DDQN target (không tính gradient) ─────────────────────
    # "Không tính gradient" vì target không được update trực tiếp
    with torch.no_grad():
        # Online chọn action tốt nhất ở state tiếp theo
        q_online_next = self._online(next_obs, cat_ids, next_mask)
        # Shape: (256, 11)
        a_next = q_online_next.argmax(dim=1)
        # Shape: (256,) — index action tốt nhất cho mỗi sample

        # Target đánh giá Q tại action đó
        q_target_next = self._target(next_obs, cat_ids, next_mask)
        # Shape: (256, 11)
        q_next = q_target_next.gather(1, a_next.unsqueeze(1)).squeeze(1)
        # Shape: (256,) — Q-value của action được online chọn, theo target

        # Bellman target
        # (1 - done): nếu episode kết thúc, không có Q tương lai
        target = reward + 0.99 × (1.0 - done) × q_next
        # Shape: (256,)

    # ─── Tính Q hiện tại của online ──────────────────────────────────
    q_all_actions = self._online(obs, cat_ids)
    # Shape: (256, 11) — Q cho tất cả actions
    # Không truyền mask vì ta chỉ cần Q của action ĐÃ THỰC HIỆN

    q_curr = q_all_actions.gather(1, action.unsqueeze(1)).squeeze(1)
    # Shape: (256,) — Q-value của action đã thực hiện cho mỗi sample

    # ─── Tính Loss ─────────────────────────────────────────────────
    loss = F.smooth_l1_loss(q_curr, target)
    # SmoothL1 = Huber Loss với β=1:
    #
    #              ⎧ 0.5 × δ²        nếu |δ| ≤ 1     (bình phương — mịn gần 0)
    # L(δ) =       ⎨
    #              ⎩ |δ| − 0.5       nếu |δ| > 1     (tuyến tính — robust với outlier)
    #
    # trong đó δ = q_curr − target
    #
    # So sánh với MSE (L = δ²): MSE phạt outlier rất nặng (δ=10 → loss=100)
    # Huber giới hạn penalty khi sai nhiều → ổn định hơn với noisy rewards

    # ─── Backpropagation ─────────────────────────────────────────────
    self._opt.zero_grad()   # Xóa gradient từ bước trước (quan trọng!)
    loss.backward()         # Tính gradient: ∂loss/∂weight cho mọi weight

    torch.nn.utils.clip_grad_norm_(self._online.parameters(), max_norm=10.0)
    # Giới hạn độ lớn gradient để tránh một bước update quá lớn
    # (gradient explosion)

    self._opt.step()        # Adam update: cập nhật tất cả 36,268 weights

    return float(loss.item())   # trả về giá trị loss để monitoring
```

**Ví dụ số cho một sample trong batch:**

```
obs         = [0.82, 0.60, 0.44, ...]   ← state cũ của root
action      = 9                          ← đã chọn +15%
reward      = 3.2                        ← bán được nhiều, reward tốt
next_obs    = [0.78, 0.55, 0.51, ...]   ← state mới (freshness giảm nhẹ)
done        = False                      ← episode chưa kết thúc

Online tính Q(next_obs): [..., 3.1, 3.4, 3.2, -∞]
  → a_next = 9 (Q = 3.4, cao nhất)

Target tính Q_target(next_obs, action=9) = 3.1
  (target network có weights cũ hơn → số hơi khác)

target = 3.2 + 0.99 × (1 - 0) × 3.1
       = 3.2 + 3.069
       = 6.269

Online tính Q_curr(obs, action=9) = 5.8  ← từ state cũ

loss = SmoothL1(5.8, 6.269) = SmoothL1(−0.469)
|δ| = 0.469 < 1 → loss = 0.5 × 0.469² = 0.110

→ Gradient kéo weights để Q_online(obs, action=9) tăng từ 5.8 về gần 6.269
```

---

## 14. Đếm tham số chi tiết

| Phần | Tensor | Kích thước (hàng × cột) | Số lượng tham số |
|------|--------|--------------------------|------------------|
| **Category Embedding** | Bảng tra E | 4 × 8 | 32 |
| **Shared Trunk** | | | |
| → Linear(18→128) weights | W | 128 × 18 | 2,304 |
| → Linear(18→128) bias | b | 128 | 128 |
| → Linear(128→128) weights | W | 128 × 128 | 16,384 |
| → Linear(128→128) bias | b | 128 | 128 |
| **Tổng Shared Trunk** | | | **18,944** |
| **V-stream** | | | |
| → Linear(128→64) weights | W | 64 × 128 | 8,192 |
| → Linear(128→64) bias | b | 64 | 64 |
| → Linear(64→1) weights | W | 1 × 64 | 64 |
| → Linear(64→1) bias | b | 1 | 1 |
| **Tổng V-stream** | | | **8,321** |
| **A-stream** | | | |
| → Linear(128→64) weights | W | 64 × 128 | 8,192 |
| → Linear(128→64) bias | b | 64 | 64 |
| → Linear(64→11) weights | W | 11 × 64 | 704 |
| → Linear(64→11) bias | b | 11 | 11 |
| **Tổng A-stream** | | | **8,971** |
| | | | |
| **TỔNG TOÀN BỘ** | | | **36,268** |

So sánh với ForecasterLSTM (212,778 tham số): DDQN nhỏ hơn khoảng 6 lần. Điều này hợp lý vì DDQN chỉ cần ánh xạ một vector 10 chiều sang 11 Q-values — đơn giản hơn nhiều so với LSTM xử lý chuỗi thời gian 21 bước.

---

*Tài liệu này đọc độc lập với mọi tài liệu khác. Mọi khái niệm đều được định nghĩa trong đây.*
