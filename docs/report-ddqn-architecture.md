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

### Bảng ký hiệu thống nhất

Toàn bộ tài liệu dùng **đúng một ký hiệu cho một khái niệm** — bảng này là nguồn tham chiếu duy nhất. Nếu thấy một ký hiệu ở bất kỳ công thức nào, tra ở đây.

Cột **Kiểu** cho biết ký hiệu là **số đơn (scalar)**, **vector** (mấy chiều), hay **ma trận** — cực kỳ quan trọng để đọc đúng công thức (xem "Quy ước scalar vs vector" ngay dưới bảng).

| Ký hiệu | Đọc là | Kiểu (shape) | Ý nghĩa |
|---------|--------|--------------|---------|
| `s` | state | khái niệm (biểu diễn bằng `obs`) | Trạng thái của sản phẩm |
| `a` | action | số nguyên ∈ {0,…,10} | Chỉ số hành động (một trong 11 mức giá) |
| `Nₐ = 11` | | hằng số | Số lượng action |
| `obs` | | **vector** `ℝ¹⁰` (10 số) | Vector quan sát |
| `c` | category | số nguyên ∈ {0,1,2,3} | Chỉ số loại sản phẩm |
| `E` | | **ma trận** 4×8 | Bảng embedding; `E[c]` = hàng `c` = **vector** `ℝ⁸` |
| `x` | | **vector** `ℝ¹⁸` | Đầu vào trunk = ghép `obs` (10) với `E[c]` (8) |
| `W₁` / `b₁` | | **ma trận** / **vector** | Weights / bias lớp Linear thứ 1 (đánh số theo lớp) |
| `h` | | **vector** `ℝ¹²⁸` | Đầu ra shared trunk ("bản mã hóa trạng thái") |
| `V(s)` | "vê của s" | **số đơn (scalar)** | Giá trị baseline của state. `V*`=baseline MAX (Bellman); `V̂`=baseline MEAN (V-stream) — xem mục Value Function |
| `Â(s, a)` | "A mũ của s, a" | **số đơn** | Đầu ra THÔ của A-stream **tại một action `a`** |
| `Â(s, ·)` | "A mũ của s, chấm" | **vector** `ℝ¹¹` | Cả 11 số thô của A-stream; trung bình ≠ 0 |
| `mean(Â)` | | **số đơn (scalar)** | Trung bình của `Â(s,·)` = `(1/Nₐ)·Σₐ Â(s,a)` — số bị trừ trong (7) |
| `A(s, a)` | "a của s, a" | **số đơn** | **Lợi thế THẬT tại `a`** = `Q(s,a) − V(s)` = `Â(s,a) − mean(Â)` |
| `A(s, ·)` | | **vector** `ℝ¹¹` | Cả 11 lợi thế thật; trung bình = 0 |
| `Q(s, a)` | "Q của s, a" | **số đơn** | Q-value **tại một action `a`** |
| `Q(s, ·)` | "Q của s, chấm" | **vector** `ℝ¹¹` | Cả 11 Q-value (một số cho mỗi action) |
| `Q̃(s, a)` / `Q̃(s, ·)` | "Q ngã" | **số đơn** / **vector** `ℝ¹¹` | Q-value **sau khi** áp mask (tại `a` / cả 11) |
| `m` | mask | **vector** `{0,1}¹¹` | `m[a]=1` ⇔ action `a` hợp lệ |
| `a*` | "a sao" | số nguyên ∈ {0,…,10} | Action được chọn = `argmax` của `Q̃(s,·)` |
| `Δ` | delta | **số đơn (scalar)** | Tỷ lệ chỉnh giá của `a*` (tra từ `CANDIDATES`), ví dụ +0.15 |
| `Δ*(f)` | "delta sao" | **số đơn** | Mức delta mục tiêu theo freshness `f` |
| `p₀` / `p` | | **số đơn** (VNĐ) | Giá gốc / giá đề xuất |
| `r` | reward | **số đơn** | Reward sau một action |
| `γ = 0.99` | gamma | hằng số | Discount factor |
| `Q_θ` / `Q_θ⁻` | "Q theta" / "trừ" | **hàm (network)** | Online network / Target network. Gọi `Q_θ(s,·)` trả về **vector** `ℝ¹¹` |
| `y` | | **số đơn** (mỗi sample) | Bellman target (đích online học tới) |
| `e` | | **số đơn** | TD residual = `Q_θ(s,a) − y` — đầu vào hàm loss |
| `B = 256` | | hằng số | Batch size |

> **Quy ước scalar vs vector — đọc kỹ, dùng xuyên suốt tài liệu:**
> 1. **`(s, a)` (có chữ `a` cụ thể) = MỘT SỐ** (scalar): giá trị tại đúng action `a`. Ví dụ `Q(s, 9)` là một số.
> 2. **`(s, ·)` (dấu chấm `·` thay cho `a`) = CẢ VECTOR 11 SỐ**, gồm mọi action. Ví dụ `Q(s, ·) = [Q(s,0), Q(s,1), …, Q(s,10)]`.
> 3. **Cộng/trừ một SỐ ĐƠN với một VECTOR = áp số đó cho TỪNG phần tử** (gọi là *broadcasting*). Ví dụ:
>    ```
>    5 + [1, −2, 4]  =  [5+1, 5+(−2), 5+4]  =  [6, 3, 9]
>    ```
>    Vì `V(s)` và `mean(Â)` là **số đơn** còn `Â(s,·)` là **vector**, công thức `Q(s,·) = V(s) + Â(s,·) − mean(Â)` nghĩa là: lấy mỗi phần tử của `Â(s,·)`, cộng `V(s)`, trừ `mean(Â)`.

> **Lưu ý hai ký hiệu dễ nhầm:**
> - `Δ` (delta hoa, scalar) = **tỷ lệ chỉnh giá** (ví dụ +0.15 = +15%). Đây là output kinh doanh.
> - `e` (scalar) = **sai số TD** giữa Q dự đoán và Q mục tiêu, dùng để tính loss khi training.
>
> Hai đại lượng này hoàn toàn khác nhau — tài liệu này **không bao giờ** dùng chung một ký hiệu cho cả hai.

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

Policy chỉ là **quy tắc "thấy tình huống nào thì làm gì"**. `π(s)` = action mà quy tắc bảo nên chọn khi ở state `s`. Ví dụ một policy đơn giản: "thấy hàng sắp hỏng thì giảm giá".

- `π` = một policy bất kỳ (có thể dở).
- `π*` (pi sao) = **optimal policy** = policy **tốt nhất có thể**, chọn được action cho tổng reward tương lai cao nhất ở mọi state. Đây là thứ DDQN cố học tới.

Sau training, DDQN có một policy tốt: nhìn vào trạng thái sản phẩm → biết nên điều chỉnh giá như thế nào (cụ thể: tính Q cho 11 action rồi chọn action Q cao nhất).

---

### Q-function (Hàm Q) — ký hiệu `Q(s, a)`

Đây là khái niệm **trung tâm nhất** của cả tài liệu. Ta sẽ xây nó lên từ con số 0 tuyệt đối, từng viên gạch một. Đừng vội đọc công thức — đọc 4 bước dưới đây trước.

**Viên gạch 1 — Reward chỉ là điểm số ngay lập tức.**
Mỗi khi agent làm một việc, môi trường chấm cho nó một điểm gọi là reward `r`. Bán được hàng → `r` dương. Để hàng hỏng → `r` âm. Chỉ vậy thôi. Reward là điểm của **một bước duy nhất, ngay bây giờ**.

**Viên gạch 2 — Nhưng ta không chỉ quan tâm bước này; ta quan tâm cả chuỗi tương lai.**
Giả sử hôm nay agent giảm giá mạnh. Hôm nay bán chạy (`r` cao), nhưng vài ngày sau hết hàng sớm, mất doanh thu (`r` thấp). Nếu chỉ nhìn điểm hôm nay thì tưởng là quyết định hay, nhưng nhìn cả tuần thì dở. Vì vậy ta cộng dồn reward của **tất cả các bước tương lai**:
```
Tổng reward = r_hôm_nay + r_ngày_mai + r_ngày_kia + …
```

**Viên gạch 3 — Reward xa thì "đáng giá ít hơn" reward gần (chiết khấu).**
Một đồng kiếm được hôm nay quý hơn một đồng kiếm được sau 100 ngày (vì tương lai bất định, và tiền hôm nay dùng được ngay). Nên trước khi cộng, ta **nhân reward tương lai với một hệ số nhỏ dần** gọi là `γ` (gamma, ở đây `γ = 0.99`):
```
Tổng reward có chiết khấu = r_hôm_nay
                          + γ   × r_ngày_mai      (×0.99)
                          + γ²  × r_ngày_kia      (×0.99² = 0.9801)
                          + γ³  × r_ngày_kìa_nữa  (×0.99³ ≈ 0.9703)
                          + …
```
Ví dụ cực nhỏ: giả sử agent nhận reward `2, 5, 10` trong 3 ngày liên tiếp. Tổng có chiết khấu là:
```
2  +  0.99 × 5  +  0.99² × 10
= 2 + 4.95 + 9.801
= 16.751
```
(Nếu không chiết khấu thì là 2+5+10 = 17 — chiết khấu chỉ làm "teo" nhẹ phần tương lai.)

**Viên gạch 4 — "Kỳ vọng" vì tương lai không chắc chắn.**
Ta không biết chắc tương lai. Hôm nay tăng giá, có ngày khách mua nhiều, có ngày mua ít — tùy thị trường. Nên ta lấy **trung bình theo xác suất** của tất cả các kịch bản tương lai. Ký hiệu của "trung bình theo xác suất" là `E[…]` (E = Expectation = kỳ vọng).

**Ghép 4 viên gạch lại → định nghĩa Q.**
`Q(s, a)` = tổng reward có chiết khấu, lấy kỳ vọng, **nếu** đang ở state `s`, làm action `a`, rồi sau đó luôn chơi tối ưu:

> `Q(s, a)` = "Nếu tôi đang ở tình huống `s` và làm việc `a`, thì tính trung bình, tôi gom được bao nhiêu điểm trong **toàn bộ tương lai** (đã chiết khấu)?"

Công thức chính thức (giờ mỗi ký hiệu đã có nghĩa):
```
Q*(s, a) = E[ rₜ + γ·rₜ₊₁ + γ²·rₜ₊₂ + γ³·rₜ₊₃ + …  |  sₜ=s, aₜ=a, π* ]
         = E[ Σₖ₌₀^∞  γᵏ · rₜ₊ₖ                      |  sₜ=s, aₜ=a, π* ]
```
Đọc từng phần:
- `rₜ` = reward tại bước hiện tại `t` (viên gạch 1)
- `rₜ + γ·rₜ₊₁ + γ²·rₜ₊₂ + …` = chuỗi reward tương lai đã chiết khấu (viên gạch 2 + 3)
- `Σₖ₌₀^∞ γᵏ · rₜ₊ₖ` = cách viết gọn của đúng chuỗi đó. `Σ` (sigma) nghĩa là "cộng tất cả lại"; `k` chạy từ 0, 1, 2, … đến vô cùng; mỗi số hạng là `γᵏ · rₜ₊ₖ`. Khi `k=0`: `γ⁰=1`, được `rₜ`. Khi `k=1`: `γ¹·rₜ₊₁`. Khi `k=2`: `γ²·rₜ₊₂`. Đúng bằng dòng trên.
- `E[ … | sₜ=s, aₜ=a, π* ]` = lấy kỳ vọng (viên gạch 4), với điều kiện "đang ở `s`, làm `a`, sau đó theo policy tối ưu `π*`". Dấu `|` đọc là "với điều kiện".
- `π*` = optimal policy = cách chơi tốt nhất có thể (định nghĩa ở mục Policy).
- Dấu `*` trên `Q*` nghĩa là **Q tối ưu** (giá trị Q đúng nhất, lý tưởng). Network của ta cố học để tiến gần `Q*`.

Ví dụ: `Q(freshness=0.9, action=+10%)` = 8.5 nghĩa là "khi sản phẩm còn rất tươi, tăng giá 10% thì trung bình mang lại 8.5 điểm reward tích lũy trong tương lai".

**Mục tiêu của DDQN:** Học đúng giá trị Q cho mọi tổ hợp (state, action). Vì khi đã biết Q của 11 action, chỉ cần chọn cái Q lớn nhất (argmax) là có quyết định tối ưu — không cần suy nghĩ gì thêm.

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

**Vấn đề ta phải giải trước:** Công thức Q ở trên cộng reward của **vô số** bước tương lai (`k` chạy đến vô cùng). Không máy tính nào cộng được vô số số hạng. Vậy làm sao tính Q? Bellman đưa ra một mẹo cực kỳ thông minh — biến tổng vô hạn thành một phép cộng **chỉ hai phần**.

**Trực giác (đọc kỹ phần này):** Hãy tách chuỗi reward vô hạn thành "bước đầu tiên" và "tất cả phần còn lại":
```
Q(s, a) =  rₜ  +  γ·rₜ₊₁ + γ²·rₜ₊₂ + γ³·rₜ₊₃ + …
           └┬┘     └──────────────┬──────────────┘
        bước đầu        toàn bộ tương lai từ bước sau
```
Bây giờ để ý: nhóm bên phải, nếu rút `γ` ra ngoài, chính là **một chuỗi Q khác** — chuỗi bắt đầu từ state tiếp theo `s'`:
```
γ·rₜ₊₁ + γ²·rₜ₊₂ + … = γ · ( rₜ₊₁ + γ·rₜ₊₂ + … ) = γ · Q(s', a')
                                └──────┬──────┘
                              chính là "Q tính từ s'"
```
Nói cách khác: **"Giá trị của hôm nay = điểm hôm nay + (đã chiết khấu) giá trị của ngày mai."** Ta không cần đi đến vô cùng nữa — chỉ cần biết reward bước này và giá trị của state kế tiếp.

Vì sau bước đầu agent luôn chơi tối ưu, ở `s'` nó sẽ chọn action tốt nhất → ta lấy `max` trên các action ở `s'`. Ghép lại ra **phương trình Bellman**:

```
Q*(s, a) = r(s, a)  +  γ · maxₐ' Q*(s', a')
            ────────     ──────────────────────────
           reward            giá trị tốt nhất
           ngay lập tức      có thể đạt được từ s'
```

Giải thích từng ký hiệu:
- `Q*(s, a)` = Q-value **tối ưu** tại state `s`, action `a` (dấu `*` = optimal)
- `r(s, a)` = reward nhận được ngay sau khi thực hiện `a` tại `s`
- `γ = 0.99` = discount factor — hệ số chiết khấu tương lai
- `s'` = state tiếp theo (sau khi thực hiện `a`) — đọc là "s phẩy"
- `a'` = một action ở state tiếp theo (đọc là "a phẩy")
- `maxₐ' Q*(s', a')` = trong tất cả action có thể làm ở `s'`, lấy cái Q lớn nhất. Đây chính là `V*(s')` — value function theo baseline **MAX** (xem mục Value Function ngay dưới; lưu ý đây là `V*` dùng cho Bellman, khác với `V̂` mean-baseline mà V-stream của Dueling học).

**Ví dụ số cực nhỏ.** Giả sử làm action `a` tại `s` được reward ngay `r = 2`. Sang state mới `s'`, action tốt nhất ở đó có `Q*(s', a') = 10`. Khi đó:
```
Q*(s, a) = 2 + 0.99 × 10 = 2 + 9.9 = 11.9
```
Chỉ một phép cộng — không cần tính vô hạn.

Nói ngắn gọn: "Giá trị của hành động này = reward ngay lập tức CỘNG giá trị (đã chiết khấu) của tương lai tốt nhất từ trạng thái kế tiếp."

Đây là phương trình định nghĩa **đích mà DDQN cần học hướng tới**. Network không học thuộc lòng Q — nó học sao cho giá trị Q của mình ngày càng **thỏa mãn** phương trình Bellman (hai vế bằng nhau). Phần §10 và §13 sẽ dùng đúng ý tưởng "reward + γ × giá trị bước sau" này để tạo "đáp án mẫu" khi training.

---

### Value Function — ký hiệu `V(s)`

`Q(s, a)` trả lời "ở tình huống `s`, làm **việc cụ thể** `a` thì tốt cỡ nào?". `V(s)` trả lời câu hỏi đơn giản hơn: **"Tình huống `s` này, nói chung, tốt hay xấu?"** — không quan tâm làm gì.

`V(s)` là một **baseline** (mốc tham chiếu): độ tốt "nền" của state trước khi xét action. Nhưng "nền" lấy theo mốc nào? Có **hai cách chọn baseline**, và cần phân biệt rõ vì chúng cho ra ý nghĩa khác nhau cho Advantage:

**Cách 1 — baseline = action tốt nhất (mốc MAX).** Đây là định nghĩa kinh điển của *optimal value function* (lấy vector `Q(s,·)` 11 số → ra một **số đơn**):
```
V*(s) = maxₐ Q(s, a)        (lấy số LỚN NHẤT trong vector Q(s,·) gồm Nₐ = 11 số)
```
Đây là `V` dùng trong phương trình Bellman (§ trên) và khi tạo target lúc training (§10, §13). **Hệ quả quan trọng:** nếu lấy mốc này thì `A(s,a) = Q − V* ≤ 0` với *mọi* action (action tốt nhất `A = 0`, còn lại âm).

**Cách 2 — baseline = trung bình các action (mốc MEAN).** Đây là baseline mà **kiến trúc Dueling thực sự dùng**, vì công thức ghép (7) trừ đi `mean(Â)` (trung bình các action) chứ không trừ max (cũng là vector `Q(s,·)` → một **số đơn**):
```
V̂(s) = meanₐ Q(s, a)        (trung bình của vector Q(s,·) gồm Nₐ = 11 số)
```
> Đẳng thức này không phải ngẫu nhiên: lấy trung bình hai vế của công thức (7) `Q = V̂ + Â − mean(Â)`, phần `Â − mean(Â)` có trung bình 0 nên triệt tiêu, còn lại đúng `meanₐ Q = V̂`. Tức V-stream bị "ghim" vào trung bình Q, **không** phải max.

Với mốc MEAN, `A(s,a) = Q − V̂` là **độ lệch so với trung bình** → action trên trung bình có `A > 0`, dưới trung bình có `A < 0`. Đây là lý do các ví dụ ở §5/§6 có giá trị A dương (xem mục Advantage ngay dưới).

**Vì sao Dueling chọn MEAN chứ không MAX?** Trừ max sẽ khôi phục `V = max Q` và `A ≤ 0`, nhưng baseline khi đó nhảy theo action tốt nhất mỗi lần → kém ổn định khi train. Trừ mean cho baseline mượt → hội tụ tốt hơn (paper Dueling DQN, Wang et al. 2016).

Ví dụ với 11 Q-value `[−0.9, −0.2, 0.5, 1.2, 1.9, 2.4, 2.6, 2.9, 3.2, 3.5, 3.4]`:
```
Cách 1 (MAX) :  V*(s) = 3.5
Cách 2 (MEAN):  V̂(s) = trung bình ≈ 1.85   ← đây là V trong ví dụ §6
```

---

### Advantage Function — phân biệt `Â(s,a)` (thô) và `A(s,a)` (thật)

Đây là chỗ DỄ NHẦM NHẤT, nên phải tách bạch **hai đại lượng khác nhau** (đừng dùng chung một chữ):

**1. `Â(s, a)` — đầu ra THÔ của A-stream** (đọc "A mũ"). Là 11 con số network nhả ra trực tiếp. Network **không tự biết** chuẩn hoá, nên **trung bình của 11 số này nói chung ≠ 0**. Đây là thứ xuất hiện trong các ví dụ §5/§6, ví dụ `Â = [−3.20, …, 1.10]` có `mean(Â) = −0.436 ≠ 0`.

**2. `A(s, a)` — lợi thế THẬT.** Định nghĩa lý thuyết: lấy Q trừ đi nền V.
```
A(s, a) = Q(s, a) − V(s)
```
Hiểu nôm na: `Q = V + A` = "điểm action = độ tốt nền của state + phần action hơn/kém nền".

**Quan hệ giữa hai loại** (chính là phép trừ mean trong công thức (7)):
```
A(s, a) = Â(s, a) − mean(Â)
```
→ Trừ đi mean biến đồ "thô" thành đồ "thật". Và lợi thế thật **luôn có trung bình = 0**:
```
meanₐ A(s, a) = meanₐ [Â(s,a) − mean(Â)] = mean(Â) − mean(Â) = 0
```

**Ví dụ tính (3 action cho gọn):** đồ thô `Â(s, ·) = [1, −2, 4]` (vector), `mean(Â) = 1` (số đơn). Trừ số đơn khỏi vector = trừ vào từng phần tử (broadcasting):
```
mean(Â) = (1 + (−2) + 4) / 3 = 3/3 = 1

A(s, ·) = Â(s, ·) − mean(Â) = [1, −2, 4] − 1

Tính từng phần tử:
  A(s, 0) = 1   − 1 =  0
  A(s, 1) = −2  − 1 = −3
  A(s, 2) = 4   − 1 =  3

→ A(s, ·) = [0, −3, 3]   (vector 3 số)

kiểm tra: meanₐ A = (0 + (−3) + 3) / 3 = 0   ✓  (lợi thế thật có trung bình 0)
```

> **Giải toả nghịch lý "thế ngược":** Nếu bạn thế `A = Q − V` (lợi thế **thật**) vào công thức (7) `Q = V + A − meanₐA`, bạn sẽ ra `meanₐ A = 0`. **Điều đó ĐÚNG, không vô lý** — lợi thế thật vốn có trung bình 0. Nghịch lý "biến mất số hạng" chỉ xảy ra nếu lầm tưởng số bị trừ trong (7) là `meanₐ A` (= 0). Thực ra số bị trừ là `mean(Â)` (trung bình của đồ **THÔ**, ≠ 0). Công thức (7) dùng `Â`, không dùng `A` — đó là toàn bộ mấu chốt.

**Dấu của lợi thế thật A phụ thuộc baseline (xem mục Value Function):**
- Nền **MAX** (`V* = max Q`): `A = Q − max Q ≤ 0` với mọi action (tốt nhất `=0`, còn lại âm). Đây là điều bạn suy ra đúng từ định nghĩa tối ưu.
- Nền **MEAN** (`V = mean Q`, **baseline mà Dueling dùng**): `A` là **độ lệch so với trung bình**, dương/âm đều được. Tài liệu này dùng baseline MEAN ở mọi ví dụ, nên:
  - `A(s,a) > 0`: action **trên trung bình** (nên ưu tiên)
  - `A(s,a) < 0`: action **dưới trung bình** (nên tránh)
  - `A(s,a) = 0`: action **đúng bằng trung bình**

Ví dụ (baseline MEAN): nếu `V(s) = 5.0` (= trung bình Q các action) và `Q(s, tăng_10%) = 6.2`, thì
```
A(s, tăng_10%) = 6.2 − 5.0 = +1.2
```
→ action "tăng 10%" tốt hơn mức **trung bình** của state này 1.2 điểm.

---

### Dueling Architecture (Kiến trúc Dueling)

Thay vì để network học thẳng Q(s, a) → một số, Dueling tách ra:
- Một nhánh (V-stream) cho ra `V(s)` — giá trị nền của state
- Một nhánh (A-stream) cho ra `Â(s, a)` — **11 số lợi thế THÔ** (chưa chuẩn hoá)
- Rồi ghép lại bằng công thức (chú ý: dùng `Â` thô, và trừ trung bình của chính nó):

```
Q(s, a) = V(s)  +  Â(s, a)  −  mean(Â)

trong đó  mean(Â) = (1/Nₐ) · Σₐ Â(s, a)        (Nₐ = 11)
                  = trung bình cộng của 11 số THÔ Â(s, ·)
```

Lưu ý: số bị trừ là `mean(Â)` — trung bình của **đầu ra thô** A-stream (nói chung ≠ 0). Sau phép trừ này, phần `Â(s,a) − mean(Â)` mới trở thành **lợi thế thật** `A(s,a)` (có trung bình 0). Đừng nhầm `mean(Â)` với `meanₐ A` (= 0).

**Ví dụ tính (3 action cho gọn).** Giả sử:
- `V(s) = 5` — một **số đơn** (scalar).
- `Â(s, ·) = [1, −2, 4]` — một **vector** 3 số (đầu ra thô của A-stream).
- `mean(Â) = (1 + (−2) + 4)/3 = 1` — một **số đơn**.

Áp công thức `Q(s, ·) = V(s) + Â(s, ·) − mean(Â)`. Vì `V(s)` và `mean(Â)` là số đơn còn `Â(s,·)` là vector, ta cộng/trừ vào **từng phần tử** (broadcasting):
```
Q(s, ·) = 5 + [1, −2, 4] − 1

Tính từng phần tử:
  Q(s, 0) = 5 + 1   − 1 = 5
  Q(s, 1) = 5 + (−2) − 1 = 2
  Q(s, 2) = 5 + 4   − 1 = 8

→ Q(s, ·) = [5, 2, 8]   (vector 3 số)

kiểm tra: meanₐ Q = (5 + 2 + 8)/3 = 5 = V(s)   ✓  (V đúng là trung bình của Q)
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

Đây là "viên gạch" tính toán của mọi mạng neural. Trước khi xem công thức, hãy hiểu ý tưởng bằng đời thường.

**Trực giác — "tính điểm có trọng số".** Tưởng tượng bạn chấm điểm một sản phẩm để quyết định 1 con số "nên tăng giá không". Bạn có 3 thông tin đầu vào: độ tươi, tồn kho, độ cầu. Bạn không coi chúng quan trọng như nhau — độ tươi quan trọng nhất, nên bạn **nhân mỗi thông tin với một trọng số** rồi cộng lại:
```
điểm = 0.5×(độ tươi) + 0.2×(tồn kho) + 0.1×(độ cầu) + 0.1
                                                       └─ cộng thêm một hằng số "khởi điểm"
```
Đó **chính xác** là những gì một Linear layer làm: nhân từng input với một trọng số (weight), cộng tất cả lại, rồi cộng thêm một hằng số (bias). Phép "nhân-rồi-cộng-dồn" này gọi là **tổng có trọng số** (weighted sum).

Linear layer chỉ làm điều đó **nhiều lần song song** để tạo ra nhiều con số output, mỗi output dùng một bộ trọng số riêng.

**Công thức.** `Linear(d_in, d_out)` biến một vector `d_in` số thành một vector `d_out` số. (Dùng `d_in/d_out` chứ không dùng `m, n` để khỏi đụng ký hiệu mask `m`.)

```
output_i = Σ_{j=0}^{d_in−1} W[i,j] × input[j]  +  b[i]     (với i = 0 … d_out−1)
           └──────────────┬────────────────┘
               tổng có trọng số của tất cả input

Dạng ma trận gọn hơn:
output = W · input  +  b
```
Đọc từng ký hiệu (kèm **kiểu**):
- `input` = **vector** `d_in` số đi vào.
- `output` = **vector** `d_out` số đi ra.
- `W` = **ma trận trọng số**, kích thước `(d_out, d_in)` — `d_out` hàng, mỗi hàng `d_in` số. Hàng thứ `i` chứa bộ trọng số tạo ra `output_i`. Tổng cộng `d_out × d_in` số, **đều được học**.
- `b` = **vector bias** (hằng số khởi điểm), `d_out` số, cũng được học.
- `W[i,j]` = một **số đơn**: trọng số nối input thứ `j` với output thứ `i`.
- `Σ_{j=0}^{d_in−1} W[i,j] × input[j]` = "với mỗi output thứ `i`, lấy từng input `j` nhân trọng số `W[i,j]` rồi cộng tất cả lại" (`Σ` = cộng dồn; `j` chạy 0 → `d_in−1`).
- `·` = phép nhân ma trận–vector (viết gọn của tất cả các tổng có trọng số trên).

Mỗi con số output là tổng có trọng số của **TẤT CẢ** các số input, cộng một hằng số. Đó là tất cả những gì xảy ra.

**Ví dụ chạy tay với Linear(3, 2)** — biến 3 số thành 2 số:
```
input = [1.0, 2.0, 3.0]               ← 3 số đi vào
W     = [[0.5, 0.2, 0.1],   ← hàng 0: bộ trọng số tạo ra output[0]
         [0.3, 0.4, 0.2]]   ← hàng 1: bộ trọng số tạo ra output[1]
b     = [0.1, 0.2]                     ← 2 bias

output[0] = 1.0×0.5 + 2.0×0.2 + 3.0×0.1  +  0.1  = 0.5 + 0.4 + 0.3 + 0.1 = 1.3
output[1] = 1.0×0.3 + 2.0×0.4 + 3.0×0.2  +  0.2  = 0.3 + 0.8 + 0.6 + 0.2 = 1.9

→ output = [1.3, 1.9]                  ← 2 số đi ra
```
Ghi nhớ con số: "Linear(3,2)" nghĩa là vào 3 ra 2; ma trận `W` khi đó có 2×3 = 6 trọng số. Quy luật này dùng để đếm tham số ở §14.

---

### ReLU (Rectified Linear Unit)

Hàm kích hoạt đơn giản nhất. Áp cho **một số đơn `z` bất kỳ** (tên `z` để khỏi đụng `x` là vector trunk input):

```
ReLU(z) = max(0, z) = ⎧ z   nếu z > 0
                       ⎩ 0   nếu z ≤ 0
```
Khi áp lên một vector, ReLU áp cho **từng phần tử** một cách độc lập.

Nói nôm na: **số dương giữ nguyên, số âm bị "kẹp" về 0.** Ví dụ tính:

```
ReLU(−3.5) = 0      (âm → 0)
ReLU(0)    = 0
ReLU(2.7)  = 2.7    (dương → giữ nguyên)
ReLU(8.1)  = 8.1
áp lên vector: ReLU([−3.5, 0, 2.7, 8.1]) = [0, 0, 2.7, 8.1]
```

**Tại sao bắt buộc phải có ReLU (hay một hàm phi tuyến nào đó)?** Vì nếu chỉ chồng Linear lên Linear, **toàn bộ network sụp lại thành một Linear duy nhất** — chồng bao nhiêu lớp cũng vô ích. Chứng minh bằng số nhỏ (gọi đầu vào là `in`, đầu ra hai lớp là `out₁`, `out₂`):
```
Lớp 1: out₁ = 2·in  + 1
Lớp 2: out₂ = 3·out₁ + 4

Chồng lại: out₂ = 3·(2·in + 1) + 4 = 6·in + 7
           → vẫn chỉ là "một phép nhân + một phép cộng" = một Linear.
```
Hai lớp mà rút gọn được thành một → không học được gì phức tạp hơn một đường thẳng. ReLU phá vỡ điều đó: vì nó "bẻ gãy" tại 0 (đoạn âm bằng phẳng, đoạn dương dốc lên), chồng nhiều lớp Linear + ReLU tạo ra được những hàm cong, gấp khúc tùy ý — nhờ đó network học được các pattern phức tạp (ví dụ "tươi VÀ cầu cao thì tăng, nhưng tươi mà ế thì giữ"). "Phi tuyến" nghĩa đơn giản là "không phải đường thẳng".

---

### Embedding (Nhúng)

Network chỉ ăn được số, mà loại sản phẩm là chữ ("leafy", "root", "fruit", "herbs"). Cách biểu diễn chúng thành số gọi là embedding.

**Tại sao không nhét thẳng 0, 1, 2, 3 vào network?** Vì như vậy network sẽ hiểu nhầm là có thứ tự và khoảng cách: "fruit (2) lớn gấp đôi root (1)", "herbs (3) xa leafy (0) hơn root (1)". Nhưng loại sản phẩm **không có thứ tự** — fruit không "lớn hơn" root. Gán một con số đơn lẻ vô tình bịa ra một quan hệ sai.

**Cách embedding giải quyết:** thay vì 1 số, gán cho **mỗi loại một vector gồm nhiều số**, và để network **tự học** các số đó sao cho có ích. Hai loại hành xử giống nhau sẽ tự được học thành hai vector gần nhau; khác nhau thì xa nhau — network tự quyết, không bị áp đặt.

Ví dụ: `nn.Embedding(4, 8)` tạo ra một **bảng tra cứu 4 hàng × 8 cột** (4 loại, mỗi loại 8 số). Khi input là "root" (index = 1), output chỉ đơn giản là **lấy ra hàng thứ 1** của bảng — một vector 8 số. 32 con số trong bảng (4×8) đều được học trong training.

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
| [2] | sin_dow | sin(2π × ngày_trong_tuần / 7) — encode thứ ngày (ví dụ thứ Tư, day=3) | 0.44 |
| [3] | cos_dow | cos(2π × ngày_trong_tuần / 7) — encode thứ ngày (ví dụ thứ Tư, day=3) | -0.90 |
| [4] | days_restock | Số ngày đến lần nhập hàng tiếp theo, chia cho 30 | 0.23 |
| [5] | demand_ratio | Cầu dự báo / tồn kho hiện tại | 0.45 |
| [6] | prev_delta | Mức điều chỉnh giá lần trước (ví dụ -0.10 = -10%) | -0.10 |
| [7] | comp_ratio | Giá mình / giá đối thủ | 1.05 |
| [8] | days_to_waste | Số ngày ước tính đến khi freshness < 0.5, chia cho 30 | 0.40 |
| [9] | inv_coverage | Số ngày tồn kho đủ dùng dựa trên cầu hiện tại | 3.20 |

**Tính thử các ô có công thức** (ví dụ: thứ Tư → day=3, tồn 60/100, restock sau 7 ngày, cầu 27, giá mình 50,000 / đối thủ 47,500):
```
[0] freshness    = 0.82                          (đo trực tiếp)
[1] inv_ratio    = 60 / 100            = 0.60
[2] sin_dow      = sin(2π × 3 / 7) = sin(2.69)    ≈  0.44
[3] cos_dow      = cos(2π × 3 / 7) = cos(2.69)    ≈ −0.90
[4] days_restock = 7 / 30              = 0.23
[5] demand_ratio = 27 / 60             = 0.45
[6] prev_delta   = −0.10                          (lần trước giảm 10%)
[7] comp_ratio   = 50,000 / 47,500     = 1.05
[8] days_to_waste= 12 / 30             = 0.40
[9] inv_coverage = 60 / 18.7           ≈ 3.20
```

Tất cả 10 số này được gộp thành một vector duy nhất: `obs = [0.82, 0.60, 0.44, -0.90, 0.23, 0.45, -0.10, 1.05, 0.40, 3.20]`

### Đầu vào 2: Category ID — số nguyên cho loại sản phẩm

```
0 = leafy  (rau lá: rau muống, cải...)
1 = root   (củ: cà rốt, khoai tây...)
2 = fruit  (trái cây: táo, cam...)
3 = herbs  (rau thơm: húng, ngò...)
```

### Đầu vào 3: Mask `m` — 11 giá trị 1/0

Cho biết action nào được phép dùng. Quy ước thống nhất: **`1` = True (được phép), `0` = False (bị cấm)**.
```
m = [1,   1,    1,    1,    1,    1,   1,   0,   0,    0,    0  ]
    -30%  -25%  -20%  -15%  -10%  -5%  0%  +5%  +10%  +15%  +20%
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
│  Output: 1 số V(s)    │   │  Output: 11 số Â(s,·) thô │
└──────────┬───────────┘   └───────────┬──────────────┘
           │                           │
           └────────────┬──────────────┘
                        │
       Q(s,a) = V(s) + Â(s,a) - mean(Â)   [Â=A-stream thô]
                        │
                   11 Q-values
                        │
            masked_fill(-∞ cho actions bị cấm)
                        │
                  argmax → action_index
```

---

### Chuỗi công thức tịnh tiến — bản đồ cả phần

Mỗi công thức dưới đây **xây trên kết quả của công thức trước**. Cột "Dùng lại" cho biết công thức đó cần kết quả của công thức nào. Đọc từ trên xuống chính là đi qua network một lần.

| # | Công thức | Tên gọi | Dùng lại |
|---|-----------|---------|----------|
| **(1)** | `emb = E[c]` | Embedding loại sản phẩm | — |
| **(2)** | `x = [obs ; emb]` | Ghép vector | (1) |
| **(3)** | `h = ReLU(W₂·ReLU(W₁·x + b₁) + b₂)` | Shared trunk | (2) |
| **(4)** | `V(s) = v_stream(h)` | Giá trị baseline | (3) |
| **(5)** | `Â(s, a) = a_stream(h)` | Lợi thế THÔ 11 actions | (3) |
| **(6)** | `mean(Â) = (1/Nₐ)·Σₐ Â(s, a)` | Trung bình đồ thô | (5) |
| **(7)** | `Q(s, a) = V(s) + Â(s, a) − mean(Â)` | Ghép Dueling → Q | (4)(5)(6) |
| **(8)** | `Q̃(s, a) = Q(s, a)` nếu `m[a]=1`, ngược lại `−∞` | Áp mask | (7) |
| **(9)** | `a* = argmaxₐ Q̃(s, a)` | Chọn action | (8) |
| **(10)** | `Δ = CANDIDATES[a*]` | Tra delta giá | (9) |
| **(11)** | `p = p₀ · (1 + Δ)` | Giá đề xuất | (10) |

Cách trình bày từ đây: **giới thiệu công thức → tính thử ngay với ví dụ chạy xuyên suốt** (root, freshness = 0.82). Đến công thức ghép như (7), ta **nhắc lại** kết quả của (4)(5)(6) rồi mới ghép — để bạn luôn thấy đủ các mảnh ghép. Phần §6 chạy lại trọn vẹn cả chuỗi (1)→(11) một lần nữa với đầy đủ con số.

> Ký hiệu Linear: `W₁, b₁` là weights/bias của lớp Linear thứ nhất trong trunk; `W₂, b₂` là lớp thứ hai. Mỗi stream (V, A) có cặp Linear riêng của nó.

---

### Lớp 1 → Công thức (1): Category Embedding

**Công thức (1):**  `emb = E[c]`  — tra hàng thứ `c` của bảng embedding `E` (4×8).

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

**Tính thử (ví dụ chạy xuyên suốt):** input là "root" (index `c = 1`), output là hàng thứ 1:
```
emb = E[1] = [0.45, 0.23, -0.12, 0.67, -0.34, 0.78, -0.56, 0.12]
```

**Tại sao inject category vào đầu (không phải cuối như LSTM)?**
Trong DDQN, loại sản phẩm ảnh hưởng đến toàn bộ quá trình ra quyết định ngay từ đầu. Leafy và root cần học hành vi giá hoàn toàn khác nhau — inject sớm giúp shared trunk "biết" mình đang xử lý loại nào ngay từ lớp đầu tiên.

---

### Lớp 2 → Công thức (2): Concatenate (Ghép vector)

**Công thức (2):**  `x = [obs ; emb]`  — nối đuôi obs (10 số) và emb (8 số) thành 18 số.

**Code:**
```python
x = torch.cat([obs, emb], dim=1)
```

**Tính thử (ví dụ chạy xuyên suốt — dùng `emb` từ công thức (1)):**

```
obs = [0.82, 0.60, 0.44, -0.90, 0.23, 0.45, -0.10, 1.05, 0.40, 3.20]  ← 10 số
emb = [0.45, 0.23, -0.12, 0.67, -0.34, 0.78, -0.56, 0.12]             ← 8 số  (từ (1))
x   = [0.82, 0.60, 0.44, -0.90, 0.23, 0.45, -0.10, 1.05, 0.40, 3.20,
        0.45, 0.23, -0.12, 0.67, -0.34, 0.78, -0.56, 0.12]            ← 18 số
```

---

### Lớp 3 → Công thức (3): Shared Trunk — MLP 18→128→128

**Công thức (3):**  `h = ReLU(W₂ · ReLU(W₁ · x + b₁) + b₂)`  — hai lớp Linear + ReLU, biến `x` (18 số) thành `h` (128 số). Dùng lại `x` từ (2).

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

**Tính thử (3) — một neuron của lớp 3a, dùng `x` (18 số) từ (2):** mỗi output là một tổng có trọng số của cả 18 số (xem mục Linear Layer). Lấy neuron đầu, giả sử hàng trọng số `W₁[0]` và bias `b₁[0] = 0.05`:
```
h_raw[0] = (0.82·0.21) + (0.60·−0.15) + (0.44·0.08) + (−0.90·0.34) + … + (0.12·0.24) + 0.05
         = 0.727                  (cộng đủ 18 số hạng — chi tiết từng số ở §6 Bước 4)

ReLU:  h[0] = max(0, 0.727) = 0.727   (dương → giữ nguyên)
```
Một neuron khác có thể ra âm, ví dụ `h_raw[1] = −0.341 → ReLU → h[1] = 0`. Làm 128 lần (lớp 3a) rồi lặp tiếp Linear(128→128)+ReLU (lớp 3b) → ra vector `h` 128 số. (§6 Bước 4–6 chạy đủ con số.)

---

### Lớp 4a → Công thức (4): V-stream — tính V(s)

**Công thức (4):**  `V(s) = v_stream(h)`  — hai lớp Linear (128→64→1) + ReLU ở giữa, biến `h` thành **một số** `V(s)`. Dùng lại `h` từ (3).

**Code:**
```python
self.v_stream = nn.Sequential(
    nn.Linear(128, 64), nn.ReLU(),
    nn.Linear(64, 1),
)
```

V-stream nhận `h` (128 số) và output **một số duy nhất** `V(s)`.

**V(s) là gì?** Giá trị baseline của state — "state này vốn tốt hay xấu, bất kể tôi làm gì?". Nhắc lại từ §2: do công thức ghép (7) trừ đi *trung bình* advantage, V-stream học theo **baseline MEAN** (`V̂ ≈ meanₐ Q`), nên A ở stream kia là "độ lệch so với trung bình" và có thể dương.

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

**Tính thử (ví dụ chạy xuyên suốt):** với `h` của root freshness = 0.82, giả sử V-stream cho ra
```
V(s) = 1.85
```
(state này khá tốt — sẽ dùng lại con số này ở công thức (7)).

---

### Lớp 4b → Công thức (5): A-stream — tính Â(s, a) cho 11 actions

**Công thức (5):**  `Â(s, a) = a_stream(h)`  — hai lớp Linear (128→64→11) + ReLU ở giữa, biến `h` thành **11 số THÔ** `Â(s, 0), …, Â(s, 10)`. Dùng lại `h` từ (3).

**Code:**
```python
self.a_stream = nn.Sequential(
    nn.Linear(128, 64), nn.ReLU(),
    nn.Linear(64, 11),
)
```

A-stream nhận `h` (128 số) và output **11 số THÔ** `Â(s, 0), Â(s, 1), ..., Â(s, 10)`.

**`Â(s, a)` là gì?** Đầu ra **thô** của A-stream — ước lượng lợi thế *chưa chuẩn hoá* của từng action. Trung bình 11 số này nói chung **≠ 0**. Phải qua công thức (6)+(7) (trừ đi `mean(Â)`) thì mới thành lợi thế thật `A(s,a)` có trung bình 0.

**Forward pass qua A-stream:**
```
h:   (128 số)
  → Linear(128→64): W shape (64,128), b shape (64,) → 64 số
  → ReLU: tất cả số âm thành 0
  → Linear(64→11):  W shape (11,64), b shape (11,)  → 11 số = Â(s,·) thô
```

**Tính thử (ví dụ chạy xuyên suốt):** với `h` của root freshness = 0.82, giả sử A-stream cho ra (đây là số THÔ `Â`):
```
Â(s, ·) = [−3.20, −2.50, −1.80, −1.10, −0.40, 0.10, 0.30, 0.60, 0.90, 1.20, 1.10]
 index:      0      1      2      3      4     5     6     7     8     9    10
 delta:    -30%   -25%   -20%   -15%   -10%  -5%   0%   +5%  +10%  +15%  +20%
```
→ Hàng tươi nên các action tăng giá (+5%…+20%) có số thô lớn hơn; giảm giá mạnh thì rất âm. Lưu ý 11 số này có trung bình ≠ 0 (sẽ tính ở (6)). Dùng lại chúng ở công thức (6) và (7).

---

### Lớp 5 → Công thức (6) và (7): Dueling Combination — ghép V và Â thành Q

Đây là bước "ghép" — giống `c = a + b` trong ví dụ của bạn. Nó cần **ba mảnh**: `V(s)` từ (4), `Â(s,a)` **thô** từ (5), và `mean(Â)` từ (6). Ta giới thiệu (6) trước, rồi mới ghép thành (7).

> **Đọc kỹ — chống nhầm:** Công thức (7) ghép từ `Â` (đầu ra **thô**, trung bình ≠ 0), **không** phải từ lợi thế thật `A`. Lợi thế thật `A(s,a)` chỉ *xuất hiện sau* phép trừ: `A = Â − mean(Â)`. Vì vậy không có chuyện "thế `A = Q − V` vào rồi triệt tiêu" — thứ nằm trong (7) là `Â`, không phải `A`.

**Code:**
```python
v = self.v_stream(h)              # V(s)
a = self.a_stream(h)              # Â(s,·) — THÔ
q = v + a - a.mean(dim=1, keepdim=True)   # mean(Â) = a.mean(...)
```

---

**Công thức (6) — Trung bình của đầu ra thô `mean(Â)`:**
```
mean(Â) = (1/Nₐ) · Σₐ Â(s, a)          (Nₐ = 11)
        = trung bình cộng của 11 số THÔ Â(s, ·)
```

**Tính thử (6) — dùng lại 11 số `Â(s, ·)` từ công thức (5):**
```
Â(s, ·) = [−3.20, −2.50, −1.80, −1.10, −0.40, 0.10, 0.30, 0.60, 0.90, 1.20, 1.10]

Tổng  = (−3.20 −2.50 −1.80 −1.10 −0.40) + (0.10 +0.30 +0.60 +0.90 +1.20 +1.10)
      = (−9.00) + (4.20)
      = −4.80

mean(Â) = −4.80 / 11 = −0.436        (≠ 0 → đúng là đồ THÔ)
```

---

**Công thức (7) — Ghép Dueling thành Q:**
```
Dạng cho TỪNG action a (mỗi vế là một số đơn):
   Q(s, a) = V(s) + Â(s, a) − mean(Â)

Dạng cho CẢ VECTOR (áp cho 11 action cùng lúc, broadcasting số đơn V(s) và mean(Â)):
   Q(s, ·) = V(s) + Â(s, ·) − mean(Â)
```
Nhắc kiểu: `V(s)` và `mean(Â)` là **số đơn**; `Â(s, ·)` và `Q(s, ·)` là **vector 11 số**. Cộng số đơn vào vector = cộng vào từng phần tử.

**Nhắc lại ba mảnh trước khi ghép** (phần "rehearsal" — gom kết quả của (4), (5), (6)):

| Mảnh | Từ công thức | Kiểu | Giá trị |
|------|--------------|------|---------|
| `V(s)` | (4) | số đơn | `1.85` |
| `Â(s, ·)` (thô) | (5) | vector 11 | `[−3.20, −2.50, −1.80, −1.10, −0.40, 0.10, 0.30, 0.60, 0.90, 1.20, 1.10]` |
| `mean(Â)` | (6) | số đơn | `−0.436` |

**Tính thử (7) — gộp lại:** vì `V(s) − mean(Â) = 1.85 − (−0.436) = 2.286` là hằng số chung cho mọi action, ta có `Q(s, a) = 2.286 + Â(s, a)`:

| a | delta | Â(s, a) (thô) | Q = 2.286 + Â(s, a) | A thật = Q − V |
|---|-------|---------------|---------------------|----------------|
| 0 | -30% | −3.20 | **−0.914** | −2.764 |
| 1 | -25% | −2.50 | **−0.214** | −2.064 |
| 2 | -20% | −1.80 | **+0.486** | −1.364 |
| 3 | -15% | −1.10 | **+1.186** | −0.664 |
| 4 | -10% | −0.40 | **+1.886** | +0.036 |
| 5 |  -5% |  0.10 | **+2.386** | +0.536 |
| 6 |   0% |  0.30 | **+2.586** | +0.736 |
| 7 |  +5% |  0.60 | **+2.886** | +1.036 |
| 8 | +10% |  0.90 | **+3.186** | +1.336 |
| 9 | +15% |  1.20 | **+3.486** | +1.636 |
| 10 | +20% | 1.10 | **+3.386** | +1.536 |

> Cột cuối minh hoạ quan hệ `A thật = Q − V = Â − mean(Â)` (lấy mỗi `Â` cộng 0.436). Tổng của cột "A thật" = 0 → đúng tính chất "trung bình lợi thế thật = 0". Đây chính là điều bạn suy ra; nó **đúng**, vì nó nói về `A` thật, không phải về `Â` thô trong (7).

---

**Tại sao phải trừ `mean(Â)`?**

Không trừ: `Q = V + Â` có **identifiability problem** (không xác định duy nhất).

Vấn đề: có vô số cách tách thành `V` và `Â` mà cho ra cùng Q. Ví dụ:
- `V = 5`, `Â = [2, 1, 0, −1, −2]`  →  `Q = [7, 6, 5, 4, 3]`
- `V = 7`, `Â = [0, −1, −2, −3, −4]`  →  `Q = [7, 6, 5, 4, 3]`

Hai cách tách cho cùng Q nhưng `V` và `Â` hoàn toàn khác nhau. Network không biết học cái nào → không ổn định.

Trừ `mean(Â)`: ghim baseline lại, buộc phần lợi thế (sau khi trừ) có trung bình 0. Kiểm chứng:
```
(1/Nₐ) · Σₐ [Â(s, a) − mean(Â)]  =  mean(Â) − mean(Â)  =  0   ✓
```
Giờ chỉ còn một cách tách duy nhất: `V(s)` đúng là trung bình Q (baseline), và `Â − mean(Â)` đúng là lợi thế thật. Gradient descent ổn định hơn.

---

### Lớp 6 → Công thức (8): Action Masking

**Công thức (8)** — áp cho từng phần tử `a` của vector, kết quả `Q̃(s, ·)` cũng là **vector 11 số**:
```
          ⎧ Q(s, a)   nếu m[a] = 1   (action hợp lệ → giữ nguyên số)
Q̃(s, a) = ⎨
          ⎩  −∞       nếu m[a] = 0   (action bị cấm → thay bằng −∞)
```
Dùng lại vector `Q(s, ·)` từ (7); `m` là **vector mask** 11 số. `Q̃` (Q ngã) là Q **sau khi** che.

**Code:**
```python
if mask is not None:
    q = q.masked_fill(~mask, float("-inf"))
```

- `m`: tensor boolean 11 phần tử — `1` (True) = được phép, `0` (False) = bị cấm
- `~mask` = đảo ngược (`True` ↔ `False`)
- `masked_fill(~mask, −∞)` = set Q-value của các actions bị cấm về âm vô cực

**Tính thử (8) — dùng vector `Q(s,·)` từ (7) và vector mask `m` (giả sử chỉ action 10 bị cấm):**
```
Q(s,·) = [−0.914, −0.214, 0.486, 1.186, 1.886, 2.386, 2.586, 2.886, 3.186, 3.486, 3.386]
m      = [   1,      1,     1,     1,     1,     1,     1,     1,     1,     1,     0  ]

Q̃(s,·)= [−0.914, −0.214, 0.486, 1.186, 1.886, 2.386, 2.586, 2.886, 3.186, 3.486,  −∞ ]
                                                                              └ m[10]=0 → −∞
```
Mọi action có `m[a]=1` giữ nguyên Q; riêng action 10 (`m[10]=0`) bị ép thành `−∞`.

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

### Lớp 7 → Công thức (9), (10), (11): argmax → action → giá

**Code:**
```python
action_idx   = int(q.squeeze().argmax().item())
delta        = float(CANDIDATES[action_idx])
target_price = base_price * (1.0 + delta)
```

**Công thức (9) — chọn action** (vào: vector `Q̃(s,·)` 11 số; ra: một **số nguyên** `a*` ∈ {0,…,10}):
```
a* = argmaxₐ Q̃(s, a)
```
`argmax` = "lấy CHỈ SỐ của phần tử lớn nhất trong vector" (khác `max` là lấy giá trị). Các action bị cấm có `Q̃ = −∞` nên không bao giờ được chọn. Dùng lại vector `Q̃(s,·)` từ (8).

**Tính thử (9) — dùng vector `Q̃(s,·)` từ (8):**
```
Q̃(s,·) = [−0.914, −0.214, 0.486, 1.186, 1.886, 2.386, 2.586, 2.886, 3.186, 3.486, −∞]
 index:      0       1      2      3      4      5      6      7      8      9    10
giá trị lớn nhất = 3.486 nằm ở index 9   →   a* = 9   (một số nguyên)
```

**Công thức (10) — tra delta giá:**
```
Δ = CANDIDATES[a*]     ∈ { −0.30, −0.25, …, 0.00, …, +0.20 }
```
`CANDIDATES[a*]` tra bảng 11 mức → tỷ lệ chỉnh giá thực tế. Dùng lại `a*` từ (9).

**Tính thử (10) — dùng `a* = 9` từ (9):**
```
CANDIDATES = [−0.30, −0.25, −0.20, −0.15, −0.10, −0.05, 0.00, +0.05, +0.10, +0.15, +0.20]
               0      1      2      3      4      5     6     7      8      9     10
Δ = CANDIDATES[9] = +0.15      (tức +15%)
```

**Công thức (11) — giá đề xuất:**
```
p = p₀ · (1 + Δ)
```
`p₀` = giá gốc; nhân với `(1 + Δ)` → giá bằng VNĐ, trước khi qua safety layer. Dùng lại `Δ` từ (10).

**Tính thử (11) — dùng `Δ = +0.15` từ (10), giá gốc `p₀ = 50,000`:**
```
p = 50,000 × (1 + 0.15) = 50,000 × 1.15 = 57,500 VNĐ
```

---

## 6. Ví dụ tính toán đầy đủ — từng con số

Đây là phần **rehearsal trọn vẹn**: chạy lại cả chuỗi công thức (1)→(11) đã giới thiệu ở §5, trên **đúng một sản phẩm**, với những con số cụ thể nối tiếp nhau. Mỗi bước ghi rõ nó dùng kết quả của bước/công thức nào — không bước nào xuất hiện con số "từ trên trời". Các weights được đơn giản hóa nhưng cấu trúc tính toán là chính xác.

> Bản đồ nhanh: Bước 2 = CT(1), Bước 3 = CT(2), Bước 4–6 = CT(3), Bước 7 = CT(4), Bước 8 = CT(5), Bước 9 = CT(6), Bước 10 = CT(7), Bước 11 = CT(8), Bước 12 = CT(9)+(10), Bước 13 = CT(11), Bước 14 = Safety (§8).

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

### Bước 2 — Công thức (1): Category Embedding cho "root"

Root có index = 1. Tra bảng Embedding tại hàng 1:

```
Giả sử bảng embedding đã học được:
root (index 1) → [0.45, 0.23, -0.12, 0.67, -0.34, 0.78, -0.56, 0.12]
```

Kết quả: `emb = [0.45, 0.23, -0.12, 0.67, -0.34, 0.78, -0.56, 0.12]`

---

### Bước 3 — Công thức (2): Concatenate thành vector x (18 chiều)

```
x = [obs | emb]
  = [0.82, 0.60, 0.44, -0.90, 0.23, 0.45, -0.10, 1.05, 0.40, 3.20,
     0.45, 0.23, -0.12, 0.67, -0.34, 0.78, -0.56, 0.12]
     ←──────────────── obs ────────────────→ ←──── emb ────→
```

---

### Bước 4 — Công thức (3, phần 1): Shared Trunk — Linear(18→128)

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

### Bước 5 — Công thức (3, phần 2): ReLU sau Linear(18→128)

```
h1_raw[0] =  0.727  → ReLU →  0.727  (dương, giữ nguyên)
h1_raw[1] = -0.341  → ReLU →  0.000  (âm, thành 0)
h1_raw[2] =  0.813  → ReLU →  0.813  (dương, giữ nguyên)
...
(128 số, mỗi số âm thành 0, số dương giữ nguyên)
```

Kết quả sau lớp 1: vector 128 số, nhiều số = 0 do ReLU.

---

### Bước 6 — Công thức (3, phần 3): Linear(128→128) + ReLU → ra `h`

Tương tự bước 4-5 nhưng với 128 inputs. Output là vector `h` — 128 số, đây là "bản mã hóa" của trạng thái.

```
Giả sử kết quả (toàn bộ 128 số, chỉ hiển thị vài số đầu):
h = [0.0, 1.24, 0.0, 0.76, 0.88, 0.0, 0.43, 1.67, ..., 0.95]
    (nhiều số = 0 do ReLU)
```

---

### Bước 7 — Công thức (4): V-stream tính V(s)

```
h (128 số) → Linear(128→64) → ReLU → Linear(64→1) → V(s)
```

Giả sử sau toàn bộ V-stream:
```
V(s) = 1.85
```

Diễn giải: State "root freshness=0.82" có giá trị baseline +1.85 — khá tốt, agent có thể kỳ vọng tổng reward tích lũy tốt từ state này bất kể action nào.

---

### Bước 8 — Công thức (5): A-stream tính Â(s, a) cho 11 actions

```
h (128 số) → Linear(128→64) → ReLU → Linear(64→11) → Â(s,·) thô
```

Giả sử output THÔ của A-stream (11 số, mỗi số cho một action):

```
Â(s, ·) = [−3.20, −2.50, −1.80, −1.10, −0.40, 0.10, 0.30, 0.60, 0.90, 1.20, 1.10]
index:       0       1      2      3      4      5     6     7     8     9     10
delta:     -30%   -25%   -20%   -15%   -10%   -5%   0%   +5%  +10%  +15%  +20%
```

Diễn giải: Tại state này (root tươi), các action tăng giá (+5% đến +20%) có số thô lớn hơn; giảm giá mạnh thì rất âm. (Đây là số THÔ — sẽ chuẩn hoá ở Bước 9–10.)

---

### Bước 9 — Công thức (6): Tính `mean(Â)`

Dùng lại 11 số THÔ `Â(s, ·)` từ Bước 8. Tách thành nhóm âm và nhóm dương cho dễ cộng:

```
Nhóm âm   : −3.20 −2.50 −1.80 −1.10 −0.40 = −9.00
Nhóm dương:  0.10 +0.30 +0.60 +0.90 +1.20 +1.10 = +4.20

Tổng = −9.00 + 4.20 = −4.80

mean(Â) = Tổng / Nₐ = −4.80 / 11 = −0.436        (≠ 0 → đúng là đồ THÔ)
```

---

### Bước 10 — Công thức (7): Dueling Combination → Q(s, a)

Nhắc lại ba mảnh đã tính: `V(s) = 1.85` (Bước 7), `Â(s, ·)` thô (Bước 8), `mean(Â) = −0.436` (Bước 9). Ghép theo (7) — **dùng `Â` thô**, không dùng A thật:

```
Q(s, a) = V(s) + Â(s, a) − mean(Â)
        = 1.85  + Â(s, a) − (−0.436)
        = 1.85  + Â(s, a) + 0.436
        = 2.286 + Â(s, a)
```

Tính Q cho từng action:

| Index | Delta | Â(s,a) (thô) | Q = 2.286 + Â |
|-------|-------|---------|---------------|
| 0 | -30% | −3.20 | 2.286 + (−3.20) = **−0.914** |
| 1 | -25% | −2.50 | 2.286 + (−2.50) = **−0.214** |
| 2 | -20% | −1.80 | 2.286 + (−1.80) = **+0.486** |
| 3 | -15% | −1.10 | 2.286 + (−1.10) = **+1.186** |
| 4 | -10% | −0.40 | 2.286 + (−0.40) = **+1.886** |
| 5 |  -5% |  0.10 | 2.286 + 0.10   = **+2.386** |
| 6 |   0% |  0.30 | 2.286 + 0.30   = **+2.586** |
| 7 |  +5% |  0.60 | 2.286 + 0.60   = **+2.886** |
| 8 | +10% |  0.90 | 2.286 + 0.90   = **+3.186** |
| 9 | +15% |  1.20 | 2.286 + 1.20   = **+3.486** ← cao nhất (trước mask) |
| 10 | +20% |  1.10 | 2.286 + 1.10   = **+3.386** |

---

### Bước 11 — Công thức (8): Action Masking

Root với freshness `f = 0.82` nằm trong khoảng `[0.70, 0.85)` (vùng cap tuyến tính). Mức delta mục tiêu `Δ*(f)` tính theo công thức piecewise linear (xem §7):

```
Δ*(0.82) = +0.20 × (0.82 − 0.70) / (0.85 − 0.70)
         = +0.20 × 0.12 / 0.15
         = +0.20 × 0.80
         = +0.16
```

Mask cho phép mọi action có `delta ≤ Δ*(f) = +0.16`:
```
Actions hợp lệ : −30% … +15%  (index 0 → 9, vì các delta này ≤ +0.16)
Action bị cấm  : +20%        (index 10, vì +0.20 > +0.16)

m = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0]
     0  1  2  3  4  5  6  7  8  9 10
```

Áp công thức (8) `Q̃(s, a) = Q(s, a)` nếu `m[a]=1`, ngược lại `−∞` (lấy Q từ Bước 10):

```
Q̃[0]  = −0.914   (hợp lệ)
Q̃[1]  = −0.214   (hợp lệ)
Q̃[2]  = +0.486   (hợp lệ)
Q̃[3]  = +1.186   (hợp lệ)
Q̃[4]  = +1.886   (hợp lệ)
Q̃[5]  = +2.386   (hợp lệ)
Q̃[6]  = +2.586   (hợp lệ)
Q̃[7]  = +2.886   (hợp lệ)
Q̃[8]  = +3.186   (hợp lệ)
Q̃[9]  = +3.486   (hợp lệ) ← lớn nhất trong các actions hợp lệ
Q̃[10] = −∞       (BỊ CẤM: m[10]=0 → set về âm vô cực)
```

---

### Bước 12 — Công thức (9) và (10): argmax → action → delta

```
(9)  a* = argmaxₐ Q̃(s, a) = 9        (Q̃[9] = +3.486 là lớn nhất)
(10) Δ  = CANDIDATES[9]   = +0.15     (tức +15%)
```

---

### Bước 13 — Công thức (11): Tính giá đề xuất

Dùng lại `Δ = +0.15` từ Bước 12 và giá gốc `p₀ = 50,000`:

```
p = p₀ · (1 + Δ)
  = 50,000 × (1 + 0.15)
  = 50,000 × 1.15
  = 57,500 VNĐ
```

---

### Bước 14: Safety Layer kiểm tra 5 rules

Dùng lại `p = 57,500` từ Bước 13. Safety layer áp 5 rule lên `p` (chi tiết §8):

```
p   = 57,500 VNĐ   (giá đề xuất)
p₀  = 50,000 VNĐ   (giá gốc)
f   = 0.82         (freshness)

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
3. Q = 1.85 + Â + 0.436 (ghép từ Â thô) → action +15% có Q cao nhất trong các actions hợp lệ
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
m = [0,   0,   0,   0,   0,   0,  1,  0,  0,   0,   0 ]
    -30  -25  -20  -15  -10  -5   0  +5  +10  +15  +20

Chỉ được chọn delta = 0 (giữ nguyên).
Lý do: hàng ở giai đoạn này không nên bán — trang trại xử lý.
       Không giảm giá thêm (đã đáy), không tăng giá (vô lý).
```

**Trường hợp 2 — leafy hoặc herbs, freshness > 0.50**

```
m = [1,   1,   1,   1,   1,   1,  1,  0,  0,   0,   0 ]
    -30  -25  -20  -15  -10  -5   0  +5  +10  +15  +20

Được giảm hoặc giữ nguyên, KHÔNG được tăng giá.
Lý do: rau lá và rau thơm là hàng hóa phổ thông (commodity).
       Khách hàng nhạy cảm với tăng giá — không được premium pricing.
```

**Trường hợp 3 — fruit hoặc root, freshness 0.50–0.70 (Vùng discount)**

```
m = [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0]
    (giống trường hợp 2)

Freshness chưa đủ tốt để premium — chỉ được giảm hoặc giữ.
```

**Trường hợp 4 — fruit hoặc root, freshness 0.70–0.85 (Vùng cap tuyến tính)**

```
Công thức delta mục tiêu Δ*(f) (piecewise linear), f = freshness:

  Với fruit/root:
    f ≥ 0.85:               Δ*(f) = +0.20
    0.70 ≤ f < 0.85:        Δ*(f) = +0.20 × (f − 0.70) / (0.85 − 0.70)
    0.50 ≤ f < 0.70:        Δ*(f) = −0.30 × (0.70 − f) / (0.70 − 0.50)
    f < 0.50:               Δ*(f) = −0.30

  Với leafy/herbs:
    f ≥ 0.75:               Δ*(f) = 0.00
    0.50 ≤ f < 0.75:        Δ*(f) = −0.30 × (0.75 − f) / (0.75 − 0.50)
    f < 0.50:               Δ*(f) = −0.30

Mỗi ví dụ dưới tính một nhánh của Δ*(f). LƯU Ý vai trò kép của Δ*(f):
  • CHỈ nhánh fruit/root [0.70,0.85) mới dùng Δ*(f) làm trần cho MASK.
  • Các nhánh còn lại: Δ*(f) là mục tiêu cho REWARD shaping (xem § thưởng),
    còn MASK ở đó đơn giản là "cấm mọi delta dương" (trường hợp 2 & 3).

Ví dụ A — freshness = 0.77 (fruit/root, nhánh cap zone [0.70, 0.85)):
  Δ*(0.77) = +0.20 × (0.77 − 0.70) / (0.85 − 0.70)
           = +0.20 × 0.07 / 0.15  =  +0.20 × 0.467  =  +0.093   (≈ +9.3%)
  → ĐÂY là zone dùng Δ* làm trần mask: cho phép delta ≤ +0.093
  m = [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0]

Ví dụ B — freshness = 0.60 (fruit/root, nhánh discount zone [0.50, 0.70)):
  Δ*(0.60) = −0.30 × (0.70 − 0.60) / (0.70 − 0.50)
           = −0.30 × 0.10 / 0.20  =  −0.30 × 0.5  =  −0.15   (mục tiêu reward: giảm 15%)
  → Mask KHÔNG cap theo Δ* ở zone này; chỉ cấm delta dương (trường hợp 3):
  m = [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0]

Ví dụ C — freshness = 0.65 (leafy/herbs, nhánh [0.50, 0.75)):
  Δ*(0.65) = −0.30 × (0.75 − 0.65) / (0.75 − 0.50)
           = −0.30 × 0.10 / 0.25  =  −0.30 × 0.4  =  −0.12   (mục tiêu reward: giảm 12%)
  → Mask leafy/herbs chỉ cấm delta dương (trường hợp 2), không cap theo Δ*:
  m = [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0]

Ví dụ D — freshness = 0.90 (fruit/root, nhánh f ≥ 0.85):
  Δ*(0.90) = +0.20   (hằng số, không cần nội suy) → mọi action hợp lệ, m = toàn 1
```

**Trường hợp 5 — fruit hoặc root, freshness ≥ 0.85 (Vùng premium)**

```
m = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]

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

**Tính thử từng rule** (giá gốc `p₀ = 50,000`, mỗi rule xét riêng một giá đầu vào dễ kích hoạt nó):
```
Rule 3 — kẹp vào [0.70·p₀, 1.20·p₀] = [35,000 ; 60,000]:
   giá vào 70,000  → min(70,000, 60,000) = 60,000  → max(35,000, 60,000) = 60,000  (bị kẹp xuống)
   giá vào 30,000  → min(30,000, 60,000) = 30,000  → max(35,000, 30,000) = 35,000  (bị kéo lên)

Rule 4 — nếu freshness < 0.40 thì giá ≤ 0.75·p₀ = 37,500:
   freshness 0.30, giá vào 45,000 → min(45,000, 37,500) = 37,500  (bị kẹp)
   freshness 0.82, giá vào 45,000 → không áp dụng (0.82 ≥ 0.40) → giữ 45,000

Rule 1 — sàn 0.55·p₀ = 27,500:
   giá vào 20,000 → max(20,000, 27,500) = 27,500  (bị kéo lên)

Rule 2 — trần 2.0·p₀ = 100,000:
   giá vào 150,000 → min(150,000, 100,000) = 100,000  (bị kẹp xuống)

Rule 5 — sàn tuyệt đối 1,000 VNĐ:
   giá vào 800 → max(800, 1,000) = 1,000  (bị kéo lên)
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
y    = r + γ · maxₐ' Q_θ(s', a')     ← Q_θ cũng nằm trong target
loss = (Q_θ(s, a) − y)²
```

**Tính thử:** giả sử `r = 2`, `maxₐ' Q_θ(s', a') = 10`, và `Q_θ(s, a) = 7`:
```
y    = 2 + 0.99 × 10 = 11.9
loss = (7 − 11.9)² = (−4.9)² = 24.01
```

Mỗi lần update θ → `Q_θ` thay đổi → mà `Q_θ` lại nằm trong `y` (đích), nên **đích cũng nhảy theo ngay lập tức**. Giống như bạn cố bước tới một vạch đích, nhưng mỗi lần bạn bước một bước thì vạch đích cũng lùi ra xa một bước — đuổi theo cái bóng của chính mình.

Minh họa: bạn muốn `Q_θ(s,a)` tiến gần đích `y = 10`. Bạn update để nó tăng từ 8 → 9. Nhưng vì update vừa rồi cũng làm đổi `Q_θ` ở `s'`, đích `y` lập tức nhảy từ 10 → 11. Khoảng cách chẳng những không co lại mà còn xa thêm. Lặp mãi → training dao động, khó hội tụ (khó ổn định lại).

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
a*   = argmaxₐ' Q_θ⁻(s', a')      ← target network CHỌN action
y    = r + γ · Q_θ⁻(s', a*)       ← target network cũng ĐÁNH GIÁ
e    = Q_θ(s, a) − y
loss = SmoothL1(e)
```

**Vấn đề — Overestimation Bias (thiên lệch ước lượng quá cao):**

Đây là khái niệm tinh tế — ta xây từ một sự thật thống kê đơn giản trước.

**Sự thật nền: "lấy max của những con số có nhiễu thì luôn bị thổi phồng lên."**
Trong training, Q-value mà network ước lượng **không bao giờ chính xác tuyệt đối** — mỗi con số có một chút sai số ngẫu nhiên (nhiễu, noise), khi cao hơn thực tế, khi thấp hơn. Giả sử 3 action đều có giá trị thật = 5.0, nhưng do nhiễu, network đoán thành:
```
action A: 5.0 + 0.8 = 5.8   (lần này nhiễu dương)
action B: 5.0 − 0.5 = 4.5   (nhiễu âm)
action C: 5.0 + 0.3 = 5.3   (nhiễu dương)

max = 5.8   ← nhưng giá trị thật chỉ là 5.0!
```
Phép `max` **luôn có xu hướng tóm trúng cái nào tình cờ bị nhiễu lên cao nhất**. Vì vậy `max` của các ước lượng có nhiễu gần như luôn **cao hơn** giá trị thật. Đây không phải lỗi thỉnh thoảng — nó là thiên lệch (bias) có hệ thống, xảy ra mọi bước.

**Vì sao DQN dính phải bẫy này.** Ở DQN, **cùng một network** (target) vừa **chọn** action tốt nhất (`argmax`), vừa **đánh giá** Q của chính action đó. Nghĩa là nó "tự chọn cái mình lỡ thổi phồng, rồi tin vào con số thổi phồng đó":
```
a* = argmaxₐ' Q_θ⁻(s', a')   → chọn đúng action có nhiễu dương cao nhất (A, =5.8)
y  = r + γ · Q_θ⁻(s', a*)     → lấy chính 5.8 đó làm đích
   = 2 + 0.99 × 5.8 = 2 + 5.742 = 7.742     (giả sử r=2)
```
→ `y = 7.742` trong khi đích "đúng" lẽ ra là `2 + 0.99 × 5.0 = 6.95`. Bị **bơm phồng +0.792**. Lặp lại → network học Q cao hơn thực tế → quyết định lệch. Đó là **overestimation bias**.

### DDQN (Double DQN, phiên bản hiện tại)

**Công thức target:**
```
a*   = argmaxₐ' Q_θ(s', a')       ← ONLINE network chọn action
y    = r + γ · Q_θ⁻(s', a*)       ← TARGET network đánh giá
e    = Q_θ(s, a) − y
loss = SmoothL1(e)
```

Trong đó:
- `Q_θ` = online network (weights `θ`, được update mỗi step)
- `Q_θ⁻` = target network (weights `θ⁻`, cố định nhiều steps)
- `y` = Bellman target; `e` = TD residual (đầu vào Huber loss)
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

**Tại sao tốt hơn?** DDQN **tách đôi vai trò** cho hai network khác nhau:
- **Online chọn** action (`argmaxₐ' Q_θ`) — vì online biết policy hiện tại.
- **Target đánh giá** Q của đúng action đó (`Q_θ⁻(s', a*)`) — bằng một bộ weights **khác**, cũ hơn.

Mấu chốt: online có thể lỡ thổi phồng action A, nhưng target là một network **độc lập**, nhiễu của nó **không trùng** với nhiễu của online — nên nó không nhất thiết cũng thổi phồng action A. Tiếp ví dụ trên:
```
Online (có nhiễu riêng) chọn:   a* = action A   (vì online đoán A = 5.8, cao nhất)
Target (nhiễu khác) đánh giá A:  Q_θ⁻(s', A) = 4.9   ← gần giá trị thật 5.0 hơn nhiều

→ y = r + γ · 4.9 = 2 + 0.99 × 4.9 = 2 + 4.851 = 6.851
     (so với đích đúng 6.95: chỉ lệch −0.099, tốt hơn hẳn DQN lệch +0.792)
```
"Người chọn" và "người chấm điểm" là hai người khác nhau → khó mà cùng nhau bịa cao một con số. Nhờ đó DDQN giảm mạnh overestimation bias so với DQN.

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

**Tính thử quy tắc `random() < epsilon`** (với epsilon = 0.3): mỗi bước rút một số ngẫu nhiên `u ∈ [0, 1)` rồi so:
```
u = 0.12  →  0.12 < 0.30  ĐÚNG  → EXPLORATION: chọn action ngẫu nhiên trong các action hợp lệ
u = 0.52  →  0.52 < 0.30  SAI   → EXPLOITATION: chọn argmax Q
u = 0.95  →  0.95 < 0.30  SAI   → EXPLOITATION: chọn argmax Q
```
Trên một quãng dài, đúng ~30% số lần rơi vào exploration (vì 30% khoảng [0,1) nhỏ hơn 0.3).

**epsilon giảm dần theo training:**
- Ban đầu: epsilon = 1.0 → 100% ngẫu nhiên (chưa biết gì cả)
- Giữa training: epsilon = 0.3 → 30% ngẫu nhiên, 70% theo Q
- Cuối training: epsilon = 0.05 → 5% ngẫu nhiên (giữ chút exploration)

**Trong production (inference):** epsilon = 0.0 → `u < 0.0` luôn SAI → hoàn toàn greedy, không ngẫu nhiên.

---

## 13. Một bước training hoàn chỉnh

### Trước hết: "training" thực ra là gì? (đọc phần này nếu bạn mới hoàn toàn)

Network khởi đầu với 36,268 con số (weights) **ngẫu nhiên** — nó đoán Q bừa, sai bét. "Training" là quá trình chỉnh dần 36,268 số đó cho tới khi Q đoán đúng. Một vòng chỉnh gồm 4 ý tưởng, mỗi ý tưởng là một từ khóa bạn sẽ gặp trong code:

1. **Đáp án mẫu (target `y`).** Ta cần một "đáp án đúng" để so. Ta lấy ngay phương trình Bellman làm đáp án: `y = reward + γ × (giá trị bước sau)`. Đây là Q **nên là** bao nhiêu.

2. **Sai số (loss).** So Q network đang đoán (`q_curr`) với đáp án `y`. Càng lệch nhau, loss càng lớn. Loss = "tôi đang sai bao nhiêu". Mục tiêu của training: **làm loss nhỏ lại**.

3. **Gradient (hướng sửa).** Gradient trả lời câu hỏi: "muốn loss giảm, mỗi weight nên tăng hay giảm, và mạnh cỡ nào?". Hãy hình dung loss như một thung lũng; bạn đang đứng trên sườn dốc; gradient là hướng dốc xuống. Bước theo hướng đó thì xuống thấp hơn (loss nhỏ hơn). Việc tính gradient cho mọi weight gọi là **backpropagation** (lan truyền ngược).

4. **Update (bước đi).** Dịch mỗi weight một bước nhỏ theo hướng gradient. Đây là việc của **optimizer** (ở đây là Adam). Một bước = một lần `train_step` chạy xong.

Lặp lại hàng triệu lần với hàng triệu mẫu kinh nghiệm → 36,268 số dần hội tụ về bộ giá trị làm Q đoán đúng. Đó là toàn bộ "học".

> Tóm tắt một câu: **đoán Q → so với đáp án Bellman → đo sai số → tính hướng sửa → nhích weights → lặp lại.**

### Toàn bộ code một bước, chú thích từng dòng

Dưới đây là toàn bộ một lần update weights của DDQN. Mỗi khối ứng với một trong 4 ý tưởng trên:

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
    # SmoothL1 = Huber Loss với β=1. Gọi e = q_curr − target (TD residual):
    #
    #              ⎧ 0.5 × e²        nếu |e| ≤ 1     (bình phương — mịn gần 0)
    # L(e) =       ⎨
    #              ⎩ |e| − 0.5       nếu |e| > 1     (tuyến tính — robust với outlier)
    #
    # LƯU Ý: e là sai số TD (khác hẳn Δ là tỷ lệ chỉnh giá ở §4–§6).
    #
    # So sánh với MSE (L = e²): MSE phạt outlier rất nặng (e=10 → loss=100)
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

**Hiểu hàm loss Huber bằng trực giác (vì sao không dùng bình phương thường):**

Cách đo sai số quen thuộc nhất là **bình phương** sai số (MSE): `loss = e²`. Vấn đề: khi sai nhiều, bình phương phạt **cực nặng** — sai `e=10` thì loss = 100. Trong RL, reward đôi khi nhiễu mạnh tạo ra vài mẫu sai khủng; một mẫu sai 100 sẽ kéo gradient giật cục, làm cả mẻ học chệch.

Huber (SmoothL1) là dung hòa của hai thế giới:
- **Khi sai nhỏ (`|e| ≤ 1`)**: dùng `0.5·e²` (đường cong mượt — chỉnh tinh tế quanh đáp án).
- **Khi sai lớn (`|e| > 1`)**: chuyển sang `|e| − 0.5` (đường thẳng — sai gấp đôi thì phạt gấp đôi, **không** gấp bốn). Nhờ vậy một mẫu sai khủng không làm nổ gradient.

Đối chiếu nhanh tại `e = 10`: MSE phạt 100, còn Huber chỉ phạt `10 − 0.5 = 9.5`. "Mượt ở gần, ôn hòa ở xa" → training ổn định hơn với reward nhiễu.

**Ví dụ số cho một sample trong batch** (ráp đủ target `y` → loss → hướng sửa):

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

e    = q_curr − target = 5.8 − 6.269 = −0.469
loss = SmoothL1(e) ; |e| = 0.469 < 1 → loss = 0.5 × 0.469² = 0.110

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
