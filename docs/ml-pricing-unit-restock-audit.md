# Báo cáo kiểm toán: Tính nhất quán đơn vị & train/serve của Định giá động F2T

> Ngày: 2026-06-15
> Phạm vi: hệ thống định giá động (DDQN) + dự báo nhu cầu (ForecasterLSTM) trong
> `pricing-sidecar/` + `dynamic-pricing-final/` + tích hợp backend `f2t-backend/`.
> Mục đích: trả lời câu hỏi "model dùng đơn vị (unit) gì, có nhất quán với dữ liệu
> farmer nhập không", đánh giá rủi ro cho khóa luận, và truy vết một số nghi vấn
> về quy trình huấn luyện. Mọi kết luận đều đối chiếu mã nguồn (có `file:line`).

---

## 0. Tóm tắt điều hành (TL;DR)

1. **DDQN + LSTM chỉ làm việc với MỘT "đơn vị" trừu tượng theo category** — không phải
   kg/bó/hộp. "Demand" lúc huấn luyện là **doanh thu (revenue) trên mỗi lần mua**,
   cố tình chọn để **né vấn đề lẫn đơn vị** (Dunnhumby).
2. **Gợi ý GIÁ (% delta) miễn nhiễm với đơn vị** — vì giá chỉ vào model dưới dạng
   tỷ số (`comp_ratio`) và đầu ra là phần trăm.
3. **Có 2 đặc trưng bị nhiễm đơn vị ở production**: `comp_ratio` (so giá lẫn đơn vị)
   và `inventory_ratio`/`inv_coverage` (trộn số lượng vật lý với demand thang doanh thu).
4. **Frontend KHÔNG expose đơn vị của model, KHÔNG quy đổi** — farmer chọn 1 trong 7
   đơn vị tùy ý, pipeline đẩy số thô vào.
5. **Sửa được mà KHÔNG cần train lại** (lỗi ở khâu dựng đặc trưng, không ở trọng số).
6. **Có thêm một mismatch train/serve ở `days_to_restock`** (cùng họ với hạn chế
   day-of-week đã ghi), hiện **chưa** được ghi vào §5.2.
7. **Nguy hiểm cho khóa luận = khoảng cách giữa lời khẳng định và sự thật**, không phải
   bản thân khuyết điểm. Ghi nhận trung thực vào §5.2 là đủ để vô hiệu hóa rủi ro.
8. **Truy vết retrain forecaster 11→10**: commit tên "retrain" chỉ sửa 1 file ghi chú;
   code thật đổi 1 dòng ở commit khác; checkpoint xác minh ĐÚNG là 10-dim; nhưng
   **không tái lập được chỉ từ git** (data regen bị gitignore).

---

## 1. Câu hỏi gốc

> "DDQN và LSTM chỉ dùng 1 loại unit thôi đúng không? Nó là gì? Frontend có expose
> unit đó ra không? Vì khi đăng ký sản phẩm, farm chọn 1 trong nhiều unit — nên phải
> xác thực unit model dùng để farmer tự convert chứ?"

Đây là lo ngại **đúng chỗ**: model học theo một đơn vị nào đó, farmer dùng đơn vị khác,
nếu không quy đổi thì đặc trưng đầu vào có thể vô nghĩa.

Sản phẩm trong F2T có 7 đơn vị bán (enum `unit` — `product.schema.ts:70-74`):
`kg, g, piece, bunch, box, bag, liter`.

---

## 2. Model thực sự nhận gì — "mẹo tỷ lệ" khiến GIÁ miễn nhiễm đơn vị

Vector quan sát 10 chiều dựng tại `pricing-sidecar/main.py:97-134` (`_build_obs`). Các
đặc trưng phần lớn là **tỷ số/không thứ nguyên**:

| # | Đặc trưng | Công thức | Phụ thuộc đơn vị? |
|---|---|---|---|
| 0 | freshness | điểm 0–1 | Không |
| 1 | inventory_ratio | `min(availableQuantity, 2.0)` (clamp) | **Có** |
| 2,3 | sin/cos(dow) | ngày trong tuần | Không |
| 4 | days_to_restock/30 | thời gian (ngày) | Không (xem §8) |
| 5 | demand_ratio | `(demand_7d/7) / BASE_DEMAND[cat]` | **Có** (qua demand) |
| 6 | prev_delta | % điều chỉnh kỳ trước | Không |
| 7 | comp_ratio | `competitor_ref_price / current_price` (`main.py:121`) | **Có** (xem §4) |
| 8 | days_to_waste/14 | thời gian | Không |
| 9 | inv_coverage/3 | `inv_units / demand_7d` (`main.py:115-116`) | **Có** |

**Điểm mấu chốt — model KHÔNG bao giờ thấy giá tuyệt đối.** Giá chỉ vào qua `comp_ratio`:
khi chia giá/giá, đơn vị tiền-trên-đơn-vị **triệt tiêu**, còn lại con số thuần. Và
**đầu ra của DDQN là `delta_pct` (%)** (`main.py:327`), áp lên `base_price` bất kỳ đơn vị
nào cũng hợp lệ.

`base_price` (`pricePerUnit`) được backend gửi vào (`dynamic-pricing.service.ts:270`)
nhưng chỉ dùng để tạo `comp_ratio` — nên **đơn vị của giá tự triệt tiêu**.

> ✅ **Kết luận §2: phần GỢI Ý GIÁ hoàn toàn an toàn với mọi đơn vị.**

DDQN serve thực tế dùng obs_dim **12** = 10 chiều trên + `[d_hat, p_waste]` từ
forecaster (`main.py:82-84, 309-313`). State-vector contract **không có field `unit`**
(`ProductStateVector`, `main.py:216-225`).

---

## 3. "Demand" thật sự đo bằng gì — preprocessing Dunnhumby

Model được hiệu chỉnh từ bộ dữ liệu siêu thị Mỹ **Dunnhumby Complete Journey**. File
`dynamic-pricing-final/preprocessing/preprocessing.ipynb` **chủ động xử lý đúng vấn đề
đơn vị** của câu hỏi:

- **Cell 0 (markdown):** "*Revenue-based demand (**solves unit mixing / potato
  problem**)*".
- **STEP 3:** "*Parse and standardise product size — Solves the unit mixing problem
  (bulk vs bagged)*" → tạo `normalized_size`, `final_unit` (vd `LB`).
- **STEP 5:** `shelf_price = (SALES_VALUE + discounts)/QUANTITY`; "*normalise LB items
  to price-per-LB*" → `standard_price`; lọc IQR theo `category × final_unit`.
- **STEP 8 (quyết định):** "*Use **REVENUE (SALES_VALUE) not QUANTITY** as demand
  signal. QUANTITY mixes units — 1 bag potatoes vs 5 lbs bulk... **Revenue is
  unit-agnostic**.*" → `demand_rate = revenue / n_baskets` (doanh thu/lần-mua).
- Chuẩn hoá tương đối: `log_d_norm = log(demand_rate/ref_demand)`,
  `log_p_norm = log(avg_price/ref_price)` → model học trong không gian **tỷ lệ, vô
  thứ nguyên**.
- **STEP 12:** `VN_DEMAND_SCALE = {leafy 1.40, root 0.95, fruit 0.85, herbs 2.10}`;
  `base_demand *= VN_DEMAND_SCALE[cat]`.

Tham số cuối ở `dynamic-pricing-final/data/params/demand_params.json`:
`base_demand` (leafy 7.463, root 5.631, fruit 2.050, herbs 4.575) và `ref_price`
(~1–4.5 — **đã chuẩn hoá, KHÔNG phải VND**).

> ✅ **Kết luận §3: "đơn vị" của model là "doanh thu trên mỗi lần mua, theo category"
> (× hệ số VN), cố tình unit-agnostic.** Thesis `chuong-3:299` có ghi demand là "đơn vị
> tương đối so với base_demand" — đúng nhưng **chưa nói rõ là revenue-based**.

---

## 4. Lỗ hổng ở production: nơi đại lượng vật lý bị trộn vào

Train đã khéo né đơn vị bằng demand-theo-doanh-thu. Nhưng tích hợp backend lại nối
**đại lượng vật lý** vào, gây 3 điểm không nhất quán:

### 4.1 `comp_ratio` so giá lẫn đơn vị ❌
`getCompetitorRefPrice` (`dynamic-pricing.service.ts:84-122`) lấy **trung bình
`pricePerUnit` của sản phẩm cùng category ở farm lân cận, bất kể `unit`**:
```ts
const competitorProducts = await this.productModel.find({
  farmId: { $in: nearbyFarms... }, category, status: 'available',   // ⬅ KHÔNG lọc unit
}).select('pricePerUnit').lean();
return competitorProducts.reduce((s,p)=>s+p.pricePerUnit,0)/competitorProducts.length;
```
Ví dụ cà rốt 28.000đ/**kg** bị so với khoai 25.000đ/**bó** → `comp_ratio = 1.12` vô nghĩa
("so cam với quýt"). Đây là **tín hiệu giá chính** của model nên ảnh hưởng đáng kể.

### 4.2 `inventory_ratio` / `inv_coverage` sai thứ nguyên ❌
Backend: `inventoryRatio = min(availableQuantity/100, 2.0)`
(`dynamic-pricing.service.ts:228, :490`) — chia số lượng (theo đơn vị farmer) cho hằng
100 tùy tiện. Sidecar khôi phục `inv_units = inventory_ratio*100` rồi tính
`inv_coverage = inv_units / max(demand_7d,1)` (`main.py:115-116`) — tức **số lượng vật lý
÷ demand thang doanh thu** → vô nghĩa. Bán theo `g` (availableQuantity ~ 50.000) luôn
chạm clamp 2.0; `box` vs `kg` lệch hẳn tín hiệu tồn kho.

### 4.3 `demand_7d` là dự báo của LSTM, không phải lượng bán thật ⚠️
`getForecast` gửi `demand_7d: 0.0` rồi lấy **output** của `/forecast` làm demand
(`demand-forecasting.service.ts:54, 60-66`). Nghĩa là demand **không** lấy từ lịch sử
đơn hàng thật, mà là LSTM dự báo theo thang doanh thu trừu tượng. Hệ quả: nếu hiển thị
con số này cho farmer như "sẽ bán X kg" thì **gây hiểu nhầm** — nó là chỉ số doanh-thu
tương đối.

---

## 5. Tổng kết An toàn vs Hỏng

| Thành phần | Trạng thái | Lý do |
|---|---|---|
| Gợi ý giá (% delta) | ✅ An toàn | Giá chỉ vào dạng tỷ số, output là % |
| `comp_ratio` | ❌ Nhiễm | So `pricePerUnit` lẫn đơn vị |
| `inventory_ratio` / coverage | ❌ Lệch | Số lượng vật lý trộn demand-doanh-thu |
| `demand_7d` (nếu hiển thị) | ⚠️ Dễ hiểu nhầm | Là doanh-thu/lần-mua tương đối, không phải kg |
| Frontend expose/convert unit | ❌ Không có | Farmer chọn unit tùy ý, không quy đổi |

---

## 6. Cách sửa — và KHÔNG cần train lại

**Nguyên tắc:** model làm việc bằng tỷ lệ vô thứ nguyên + demand theo doanh thu →
production phải đảm bảo MỌI input là tỷ lệ "unit tự triệt tiêu". Không đụng trọng số.

### Tier 1 — rẻ, không cần calibrate (nên làm trước)
1. **`comp_ratio` cùng unit:** thêm `unit` vào query đối thủ trong
   `getCompetitorRefPrice` (`:84`); caller thêm `unit` vào `.select` (`:218, :418`) và
   truyền `product.unit`. → ratio (đ/kg)/(đ/kg) triệt tiêu đơn vị.
2. **`inventory_ratio` tự-tương-đối:** thay `availableQuantity/100` bằng
   `availableQuantity / restockTargetQty` (cùng đơn vị → triệt tiêu); thêm field
   `restockTargetQty` (mặc định = tồn ban đầu) hoặc default per-category.
3. **Đừng hiển thị `demand_7d` như số lượng:** đổi nhãn frontend thành "chỉ số nhu cầu".

### Tier 2 — trung thành tuyệt đối revenue-based (cần 1 bước calibrate, không retrain)
- Đo tồn kho theo **giá trị tiền**: `inv_value = availableQuantity × pricePerUnit`
  (đơn vị tự triệt tiêu) → `coverage = inv_value / demand_value` vô thứ nguyên,
  `demand_ratio = demand_value / base_demand` cùng thang.
- Thêm hằng chuẩn hoá per-category `ref_revenue` (bản production của `ref_demand`),
  tính 1 lần từ order history thật của F2T (giống cách preprocessing tính `ref_demand`).
- *Calibrate ≠ retrain*: chỉ tính hằng số chuẩn hoá để đưa input về dải đã train; trọng
  số giữ nguyên.

### Option Z — đơn giản về vận hành
Quy định 1 unit chuẩn per category (vd kg cho leafy/root/fruit, bunch cho herbs),
**validate khi đăng ký sản phẩm**, kèm UI converter. Né hoàn toàn, không động model.

### Có cần train lại không? → KHÔNG
- Lỗi nằm ở **khâu dựng obs** (backend), không ở trọng số. Sửa cách tính input là xong.
- `obs_dim` cố định 12; mọi đặc trưng **đều bị clamp** về dải cố định (freshness 0–1,
  inventory 0–2, comp_ratio 0.5–2, demand_ratio 0–3...) → input sửa lại vẫn nằm
  in-distribution.
- **Chỉ cần train lại nếu đổi định nghĩa obs** (thêm/bớt feature, đổi obs_dim) — các fix
  trên không làm vậy.
- *Lưu ý domain shift (riêng biệt):* model học từ dữ liệu Mỹ + hệ số VN heuristic, chưa
  train trên giao dịch F2T thật. Đây là vấn đề **độ chính xác thị trường VN**, là
  *future work*, không liên quan đến lỗi đơn vị.

---

## 7. Mức nguy hiểm cho khóa luận

**Nguyên tắc:** với khóa luận, "nguy hiểm" = **khoảng cách giữa cái BÁO CÁO khẳng định
và cái CODE thực làm**, KHÔNG phải bản thân khuyết điểm. Mọi khóa luận đều có giới hạn.

- ✅ **Lá chắn lớn:** §4.4 để **bảng eval trống (0 số bịa)** → khóa luận **không** tuyên
  bố con số định giá nào → mismatch đơn vị **không làm sai** bất kỳ khẳng định định lượng.
- ⚠️ **Rủi ro ngầm hiện tại (ở chữ, không ở code):** §5.2 **chưa** liệt kê hạn chế đơn vị;
  `chuong-3:299` mới nói demand "tương đối" mà chưa nói "revenue-based". Nếu hội đồng hỏi
  "demand model dùng đơn vị gì, xử lý kg vs bó thế nào?" mà lúng túng → mới thành điểm yếu.
- ✅ **Khắc phục:** ghi trung thực vào §5.2 (xem §10). Sau đó rủi ro **biến mất**, và
  thậm chí thành điểm cộng (cho thấy hiểu sâu hệ thống).

> **Kết luận §7:** Sau khi (a) ghi §5.2 trung thực — bắt buộc — và (b) tùy chọn sửa
> Tier 1, mismatch đơn vị **không còn nguy hiểm** cho khóa luận. Chỉ thực sự nguy hiểm
> nếu **để nguyên + không ghi gì + lỡ khẳng định "xử lý mọi đơn vị đúng"** — điều hiện
> bạn CHƯA mắc.

---

## 8. Mismatch thứ hai: `days_to_restock` (cùng họ train/serve)

`days_to_restock` đo bằng **NGÀY** (đơn vị thời gian) → **không** dính bẫy đơn vị kg/bó.
Nhưng có **lệch phân phối train/serve**:

| | Train (`market_env.py`) | Production (`computeDaysToRestock`, `:71-82`) |
|---|---|---|
| Chu kỳ restock | **Cố định**: `RESTOCK_EVERY={leafy 4,root 7,fruit 5,herbs 3}` (`:12`) | **Farmer nhập** `restockSchedule` (mặc định 5, schema tới **30**) |
| `days_to_next` | tối đa = 7 | tối đa = 30 |
| Feature [4] = `/30` | luôn ∈ **[0.03–0.23]** (`market_env.py:151`) | có thể tới **1.0** → **OOD** |

- **Có điều kiện:** chu kỳ ngắn (3–7, hay mặc định 5) thì ≈ in-distribution, ít hại; chỉ
  khi farmer đặt chu kỳ dài (15–30) mới rơi OOD rõ.
- **Không lượng hoá được độ lớn:** khác với hạn chế day-of-week (bound được <6,2% nhờ hệ
  số `sin/cos` cực nhỏ ±0,023 trong `demand_params.json`), `days_to_restock` đi **thẳng
  qua mạng DDQN**, không có hệ số tuyến tính để chặn → **chỉ biết CHIỀU (OOD), không
  biết độ lớn**. Nói "ảnh hưởng nhỏ" mà không đo = overclaim.
- **Caveat:** `restockSchedule` là tùy chọn; farm không nhập → mặc định 5 → feature gần
  như hằng số, ít thông tin.
- **Trạng thái thesis:** mô tả feature ở `chuong-2:190`, `chuong-3:320` nhưng §5.2 **chưa**
  liệt kê mismatch này (các hạn chế hiện có: (a) tile-21, (b) DoW <6,2%, (c) freshness
  2/4, (d)-(g) cross-sell).

> **Kết luận §8:** cùng "họ" với hạn chế (b) đã ghi. Khắc phục = thêm 1 mục hạn chế vào
> §5.2 đúng văn phong (a)/(b). Tùy chọn: clamp `days_to_restock` về dải train.

---

## 9. Truy vết: retrain ForecasterLSTM 11→10 "không đổi code"?

**Nghi vấn:** commit "T0.11-13 retrain" làm thế nào retrain 11→10 mà không đổi code?

**Sự thật từ git:**

| Commit | Thực sự đổi gì |
|---|---|
| `94d47af` *"task(T0.11-13): retrain forecaster obs_dim=10"* | **CHỈ** sửa `.handoff/progress/task-0.md` (21 dòng ghi chú). Không code/data/checkpoint. → Nhìn riêng commit này thì tưởng "không đổi gì". |
| `e1cc239` | **1 dòng code thật**: `ForecasterConfig.obs_dim: 11 → 10` (`model.py`). |
| `e0fbbc2` | Force-add file checkpoint `.pt` (binary). |
| (ngoài git) | Data parquet regen — gitignore, tái tạo bằng `generate_data.py` (seed=42). |

**Vì sao đổi 11→10 cần rất ít code:** `obs_dim` không hardcode rải rác mà chảy qua 1 đường:
1. Env `_build_obs` **vốn đã** sinh đúng 10 đặc trưng → regen data tự cho vector rộng 10.
2. Train với `obs_dim=10` → kiến trúc LSTM dựng động từ `cfg.obs_dim`, lưu `model_cfg`
   vào checkpoint.
3. Sidecar **đọc config TỪ checkpoint**: `ForecasterConfig(**fckpt["model_cfg"])`
   (`pricing-sidecar/main.py:186`) → tự khớp, không hardcode.
→ "retrain" = **chạy script** tạo artifact (parquet + .pt) + **1 dòng đổi default**.

**Xác minh checkpoint là 10-dim thật** (load `forecaster_v4_best.pt`):
- `model_cfg = {obs_dim: 10, window: 21, n_categories: 4, cat_embed_dim: 8,
  lstm_hidden: 128, lstm_layers: 2, ...}`
- Trọng số thật: `lstm.weight_ih_l0 = (512, 10)` → **input_size = 10** (512 = 4 cổng ×
  128 hidden). Category embedding (4×8) nối *sau* LSTM (`demand_head` nhận 136 = 128+8).
- → Retrain **có thật**, model **đúng 10-dim**, không phải chỉ "khai" trong config.

**⚠️ Lỗ hổng tái lập (reproducibility) — điểm cần lưu ý cho khóa luận:**
- Retrain **không tái lập được chỉ từ git**: dataset regen không commit (gitignore),
  commit "retrain" không chứa artifact. Bằng chứng kiểm chứng duy nhất = **file checkpoint
  + hình dạng trọng số** (đã xác nhận 10-dim).
- Git **không** chứng minh được *quy trình* tạo ra checkpoint (data nào, seed nào).
- Khuyến nghị ghi rõ trong thesis: "checkpoint là artifact; tái lập qua
  `generate_data.py` + `train.py` (seed=42)".
- **Chưa truy:** nguồn gốc "11" ban đầu (env có từng sinh 11 đặc trưng rồi cắt còn 10
  không) — cần đào lịch sử `market_env.py` nếu muốn hoàn chỉnh.

---

## 10. Khuyến nghị tổng hợp (theo ưu tiên)

**A. Bắt buộc — cập nhật thesis cho trung thực (ít công, bảo vệ khóa luận):**
- Sửa `chuong-3:299`: nói rõ demand là **revenue-based, tương đối** (đúng preprocessing).
- Thêm **HẠN CHẾ BẮT BUỘC (h) — đơn vị**: model dùng đơn vị nhu cầu trừu tượng
  (doanh thu) từ Dunnhumby; production chưa chuẩn hoá `unit` farmer chọn cho `comp_ratio`
  & inventory; gợi ý giá % thì miễn nhiễm đơn vị.
- Thêm **HẠN CHẾ BẮT BUỘC (i) — restock**: train chu kỳ cố định 3–7 ngày → feature ∈
  [0.03–0.23]; production lịch farmer tới 30 → có thể OOD; chiều đã biết, độ lớn chưa
  lượng hoá; `restockSchedule` tùy chọn.
- (Tùy chọn) ghi chú **tái lập forecaster**: checkpoint là artifact, regen qua script.

**B. Khuyến khích — sửa code (nếu còn thời gian):**
- Tier 1 cho unit (comp_ratio cùng unit + inventory tự-tương-đối + relabel demand).
- Clamp/map `days_to_restock` về dải train.

**C. Chuẩn bị bảo vệ:** soạn câu trả lời ngắn cho hội đồng về (1) đơn vị model, (2)
restock mismatch, (3) tái lập retrain.

**D. Future work (ghi §5.3):** retrain `demand_params` + forecaster trên đơn hàng F2T
thật (giải quyết domain shift Mỹ→VN); Tier 2 revenue-based inventory.

---

## Phụ lục — Tham chiếu mã nguồn

| Chủ đề | Vị trí |
|---|---|
| Dựng obs 10 chiều | `pricing-sidecar/main.py:97-134` (`_build_obs`) |
| comp_ratio | `pricing-sidecar/main.py:121` |
| demand_ratio / BASE_DEMAND | `pricing-sidecar/main.py:114, 88` |
| inv_coverage | `pricing-sidecar/main.py:115-116` |
| obs_dim 12 (forecaster-augmented) | `pricing-sidecar/main.py:82-84, 309-313` |
| Sidecar đọc cfg từ checkpoint | `pricing-sidecar/main.py:186` |
| State vector (không có unit) | `pricing-sidecar/main.py:216-225` |
| inventoryRatio = qty/100 | `dynamic-pricing.service.ts:228, 490` |
| base_price = pricePerUnit | `dynamic-pricing.service.ts:270, 508` |
| getCompetitorRefPrice (không lọc unit) | `dynamic-pricing.service.ts:84-122` |
| computeDaysToRestock | `dynamic-pricing.service.ts:71-82` |
| getForecast gửi demand_7d:0 | `demand-forecasting.service.ts:54, 60-66` |
| Preprocessing revenue-based demand | `dynamic-pricing-final/preprocessing/preprocessing.ipynb` (cell 0, STEP 3/5/8/12) |
| demand_params | `dynamic-pricing-final/data/params/demand_params.json` |
| RESTOCK_EVERY + obs[4] (train) | `dynamic-pricing-final/src/env/market_env.py:12, 151` |
| ForecasterConfig.obs_dim | `dynamic-pricing-final/src/forecaster/model.py:7` |
| Product unit enum | `f2t-backend/.../products/schemas/product.schema.ts:70-74` |
| Thesis: demand "tương đối" | `docs/thesis/final/chuong-3-phan-tich-thiet-ke.md:299` |
| Thesis: feature days_to_restock | `chuong-2:190`, `chuong-3:320` |
| Thesis: §5.2 hạn chế (a)-(g) | `docs/thesis/final/chuong-5-ket-luan.md:43-57` |
| Commits retrain | `94d47af`, `e1cc239`, `e0fbbc2` |
