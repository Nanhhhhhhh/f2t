# F2T ML Pipeline — Analysis & Gap Report

> Ngày: 2026-06-02  
> Phạm vi: `pricing-sidecar/main.py`, `dynamic-pricing-final/`, `f2t-backend` modules: `dynamic-pricing`, `demand-forecasting`

---

## 1. ProductStateVector là gì?

`ProductStateVector` là **gói dữ liệu đầu vào chung** được gửi đến sidecar cho cả hai model LSTM và DDQN. Nó mô tả trạng thái hiện tại của một sản phẩm tại thời điểm tính toán:

```python
class ProductStateVector(BaseModel):
    productId:            str    # ID để map kết quả trả về
    category:             str    # "leafy" | "root" | "fruit" | "herbs"
    freshness:            float  # 0.0–1.0, từ FreshnessCache hoặc Weibull
    inventory_ratio:      float  # availableQuantity / 100, cap 2.0
    base_price:           float  # pricePerUnit hiện tại (VNĐ)
    competitor_ref_price: float  # avg giá cùng category trong 10km
    days_to_restock:      float  # ngày còn lại đến lần nhập hàng tiếp
    prev_delta:           float  # % thay đổi giá lần gợi ý trước (decimal)
    demand_7d:            float  # dự báo cầu 7 ngày tới (từ LSTM)
```

Từ 9 raw fields này, sidecar build ra **observation vector 10 chiều** (`obs`) để đưa vào mạng neural:

| obs[i] | Công thức | Ý nghĩa |
|--------|-----------|---------|
| obs[0] | `clip(freshness, 0, 1)` | Độ tươi trực tiếp |
| obs[1] | `min(inventory_ratio, 2.0)` | Tồn kho tương đối |
| obs[2] | `sin(2π × dow / 7)` | Day-of-week (tính tại runtime) |
| obs[3] | `cos(2π × dow / 7)` | Day-of-week cosine |
| obs[4] | `min(days_to_restock / 30, 1.0)` | Áp lực nhập hàng, normalize |
| obs[5] | `clip((demand_7d/7) / BASE_DEMAND[cat], 0, 3)` | Cầu so với baseline ngành |
| obs[6] | `clip(prev_delta, -0.30, 0.20)` | Momentum giá |
| obs[7] | `clip(competitor_ref / base_price, 0.5, 2.0)` | Vị thế cạnh tranh |
| obs[8] | `days_to_waste / 14` | Ngày còn trước khi hỏng |
| obs[9] | `clip(inv_coverage, 0, 3) / 3` | Số ngày tồn kho / cầu |

`days_to_waste` được tính từ freshness + DAILY_DECAY của từng category:
- `leafy`: 0.850, `fruit`: 0.880, `root`: 0.950, `herbs`: 0.800

---

## 2. Toàn bộ luồng ML — Initial Input → Final Output

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TRIGGER POINTS                              │
│                                                                     │
│  A) Cron: mỗi giờ (PRICING_CRON_SCHEDULE=0 * * * *)                │
│  B) Farm scan ảnh: POST /dynamic-pricing/freshness/:id/scan         │
│  C) Frontend: GET /demand-forecasting/farm/:farmId/forecasts        │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                ┌──────────▼──────────┐
                │   DATA COLLECTION   │
                │  (MongoDB queries)  │
                └──────────┬──────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼─────┐    ┌──────▼──────┐   ┌──────▼──────┐
    │ Product  │    │  Freshness  │   │    Farm     │
    │ • price  │    │  Cache      │   │ restockSch. │
    │ • avail  │    │ medianScore │   │ location    │
    │ • categ. │    │             │   │             │
    └────┬─────┘    └──────┬──────┘   └──────┬──────┘
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
                ┌──────────▼──────────────────────┐
                │     BUILD ProductStateVector     │
                │                                  │
                │  category   ← mapToSidecar(cat)  │
                │  freshness  ← cache.medianScore  │
                │              OR Weibull fallback  │
                │  inv_ratio  ← qty/100            │
                │  base_price ← pricePerUnit       │
                │  comp_price ← getCompetitor()    │◄── geo query 10km
                │               OR price*0.95      │    (cron only)
                │  days_restock← computeDaysToRest │
                │  prev_delta ← last PriceOverride │
                │               OR 0.0             │
                │  demand_7d  ← 0.0 (placeholder)  │
                └──────────┬──────────────────────┘
                           │
           ┌───────────────▼───────────────────────┐
           │         Redis Cache Check             │
           │   key: df:v1:{productId}  TTL: 6h    │
           └───────────┬───────────────────────────┘
                       │
              hit ─────┤───── miss
                       │           │
              use cache│    ┌──────▼──────────────────┐
                       │    │   POST /forecast         │
                       │    │   pricing-sidecar:8000   │
                       │    │                          │
                       │    │  ┌───────────────────┐   │
                       │    │  │  _build_obs(sv)   │   │
                       │    │  │  → obs[10]        │   │
                       │    │  └────────┬──────────┘   │
                       │    │           │               │
                       │    │  ┌────────▼──────────┐   │
                       │    │  │  ForecasterLSTM   │   │
                       │    │  │                   │   │
                       │    │  │  Input:           │   │
                       │    │  │  obs tiled 21×    │   │
                       │    │  │  (21, obs_dim)    │   │
                       │    │  │  + cat_embed[4]   │   │
                       │    │  │                   │   │
                       │    │  │  LSTM(128,2layer) │   │
                       │    │  │  → last hidden    │   │
                       │    │  │  + cat_embed      │   │
                       │    │  │  → demand_head    │   │
                       │    │  │  → waste_head     │   │
                       │    │  └────────┬──────────┘   │
                       │    │           │               │
                       │    │  Output:  │               │
                       │    │  demand7d: float          │
                       │    │  pWaste:  float (0-1)     │
                       │    └──────┬────────────────────┘
                       │           │
                       │    ┌──────▼────────────────┐
                       │    │  Save to Redis 6h      │
                       │    └──────┬────────────────┘
                       │           │
                       └───────────┤
                                   │
                    ┌──────────────▼──────────────────┐
                    │  Update state_vector:            │
                    │  demand_7d = forecast.demand7d   │
                    └──────────────┬──────────────────┘
                                   │
                    ┌──────────────▼──────────────────┐
                    │   POST /predict                  │
                    │   pricing-sidecar:8000           │
                    │                                  │
                    │  ┌───────────────────────────┐   │
                    │  │  _build_obs(sv)           │   │
                    │  │  (lần 2, demand_7d thật)  │   │
                    │  │  → obs[10]                │   │
                    │  └──────────┬────────────────┘   │
                    │             │                     │
                    │  ┌──────────▼────────────────┐   │
                    │  │  compute_mask(f, cat)     │   │
                    │  │                           │   │
                    │  │  Lọc actions hợp lệ:      │   │
                    │  │  leafy/herbs: không tăng  │   │
                    │  │  fruit/root:  premium khi │   │
                    │  │  fresh >= 0.85            │   │
                    │  └──────────┬────────────────┘   │
                    │             │                     │
                    │  ┌──────────▼────────────────┐   │
                    │  │  SharedMLPDuelingQNet      │   │
                    │  │  (DDQN)                   │   │
                    │  │                           │   │
                    │  │  obs[10] + cat_embed[8]   │   │
                    │  │  → shared MLP(128,128)    │   │
                    │  │  → V stream (value)       │   │
                    │  │  → A stream (advantage)   │   │
                    │  │  Q = V + A - mean(A)      │   │
                    │  │  → masked argmax          │   │
                    │  │  → action_idx ∈ [0..10]   │   │
                    │  └──────────┬────────────────┘   │
                    │             │                     │
                    │  CANDIDATES = linspace(-30%,+20%, 11)  │
                    │  delta = CANDIDATES[action_idx]  │
                    │  target_price = base * (1+delta) │
                    │             │                     │
                    │  ┌──────────▼────────────────┐   │
                    │  │  apply_safety()           │   │
                    │  │  Rule 1: >= base*0.55     │   │
                    │  │  Rule 2: <= base*2.0      │   │
                    │  │  Rule 3: ±30%/+20% bound  │   │
                    │  │  Rule 4: freshness<0.4    │   │
                    │  │           → force <=75%   │   │
                    │  │  Rule 5: >= 1,000 VNĐ     │   │
                    │  └──────────┬────────────────┘   │
                    │             │                     │
                    │  Output per product:              │
                    │  targetPrice, delta_pct,          │
                    │  safety_clipped, freshness_tag    │
                    └──────────────┬──────────────────┘
                                   │
                    ┌──────────────▼──────────────────┐
                    │   Save PriceOverride (MongoDB)   │
                    │                                  │
                    │   mode=shadow  → status=shadow   │
                    │   mode=advisory→ pending_review  │
                    │   TTL: PRICING_SUGGESTION_TTL_HOURS │
                    └──────────────┬──────────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              │                                         │
    ┌─────────▼─────────┐                   ┌──────────▼──────────┐
    │  shadow mode       │                   │  advisory mode      │
    │  Không show user   │                   │  Farm thấy card gợi │
    │  Dùng để monitor   │                   │  ý → Accept/Reject  │
    │  shadow report     │                   │  Nếu Accept →       │
    └────────────────────┘                   │  dynamicPrice field  │
                                             └─────────────────────┘
```

---

## 3. Luồng Freshness Scan (path riêng)

```
Farm chụp ảnh sản phẩm
        │
        ▼
POST /dynamic-pricing/freshness/:productId/scan
  { image_b64, category }
        │
        ▼
POST /freshness/classify (sidecar)
  CoreML model:
    - category "fruit"/"fruits" → MyFreshnessClassifier-fruit.mlmodel
    - mọi category khác        → MyFreshnessClassifier-root.mlmodel (⚠️ gap)
        │
        ▼
  ClassifyResponse: { score, tag, label, confidence }
        │
        ▼
submitFreshness(productId, score):
  - Push vào FreshnessCache.readings[] (giữ 5 gần nhất)
  - medianScore = score mới nhất (không thực sự là median)
  - expiresAt = now + 6h
  - Invalidate Redis: df:v1:{productId}  ← xóa cache LSTM
        │
        ▼
generateSuggestionForProduct(productId):
  - Chạy lại toàn bộ LSTM + DDQN pipeline với freshness mới
  - Tạo PriceOverride mới ngay lập tức (không chờ cron)
        │
        ▼
Response về frontend: { score, tag, medianScore, suggestion }
```

---

## 4. Gaps & Issues

### GAP-01 — `SubmitFreshnessDto` dùng category enum cũ ❌ BUG

```typescript
// File: dynamic-pricing/dto/submit-freshness.dto.ts
@IsIn(['vegetables', 'fruits', 'herbs', 'mushrooms', ...])
category!: string;
// Thiếu: 'leafy', 'root', 'fruit'
```
**Impact:** `POST /freshness/:productId` với body `{ category: "leafy" }` sẽ bị reject 400 bởi class-validator.  
**Fix:** Thêm `'leafy', 'root', 'fruit'` vào `@IsIn([...])`.

---

### GAP-02 — CoreML chỉ có model cho `fruit` và `root` ⚠️

```python
# pricing-sidecar/main.py:314
model_key = "fruit" if req.category in ("fruit", "fruits") else "root"
```
**Impact:** Scan ảnh cho `leafy` và `herbs` dùng model `root` (train trên củ quả) — kết quả không chính xác.  
**Fix:** Cần train thêm model `leafy` và `herbs`, hoặc explicit fallback với warning.

---

### GAP-03 — `demand-forecasting.controller.ts` dùng `competitor_ref = price * 0.95` cứng ⚠️

```typescript
// demand-forecasting.controller.ts:77
competitor_ref_price: product.pricePerUnit * 0.95,  // hardcode fallback
```
**Impact:** Forecast từ frontend (`GET /farm/:farmId/forecasts`) thiếu dữ liệu cạnh tranh thực. Chỉ có cron (`runPricingTick`) mới gọi `getCompetitorRefPrice()` thực.  
**Fix:** Controller nên gọi `DynamicPricingService.getCompetitorRefPrice()` hoặc nhận competitor data từ nơi khác.

---

### GAP-04 — `prev_delta` hardcode `0.0` trong demand-forecasting controller ⚠️

```typescript
// demand-forecasting.controller.ts:113
0.0,  // prev_delta
```
**Impact:** obs[6] luôn là 0 trong forecast từ frontend — model không học được momentum giá. Chỉ cron mới truyền `prev_delta` thực.

---

### GAP-05 — `FreshnessCache.medianScore` thực ra không phải median ⚠️

```typescript
// dynamic-pricing.service.ts:193
const latestScore = score;      // ← comment ghi là "latest" thay median
cache.medianScore = latestScore; // nhưng field vẫn tên medianScore
```
**Impact:** Naming misleading. Nếu scan nhiều lần, một lần scan xấu sẽ override ngay lập tức thay vì bị smooth bởi median thực.

---

### GAP-06 — `FreshnessCache` tự expire sau 6h, không có fallback sau khi expire ⚠️

```typescript
cache.expiresAt = new Date(cache.updatedAt.getTime() + 6 * 3600 * 1000);
// MongoDB TTL index tự xóa document sau 6h
```
**Impact:** Nếu không ai scan ảnh trong 6 tiếng, cron giờ tiếp theo sẽ fallback về Weibull (`Math.pow(lambda, 24)`). Với `leafy` (lambda=0.97), Weibull(24h) = 0.97^24 ≈ 0.48 — tức là sản phẩm luôn bị coi là "aging" nếu không scan.

---

### GAP-07 — `demand_7d` trong LSTM được tiled thành chuỗi 21 bước giống hệt nhau ⚠️

```python
window = np.tile(obs_padded, (OBS_WINDOW, 1))  # 21 × obs_dim
```
**Impact:** LSTM nhận đầu vào là 21 timestep **giống hệt nhau** (không phải time-series thực). Model đang dùng LSTM như một MLP mạnh hơn — khả năng học temporal pattern bị hạn chế. Đây là tradeoff từ thiết kế: không có historical data thực cho từng sản phẩm.

---

### GAP-08 — Sidecar categories chỉ support 4 loại, backend có 10 ❌

```python
CATEGORIES = ["leafy", "root", "fruit", "herbs"]  # sidecar
```
```typescript
// backend: leafy, root, fruit, herbs, mushrooms, grains, dairy, eggs, honey, other
```
**Impact:** `mushrooms`, `grains`, `dairy`, `eggs`, `honey`, `other` sẽ **bị skip** trong `/predict` (log warning, không có PriceOverride). Không có giá gợi ý AI cho những category này.  
**Fix hiện tại:** `toSidecarCategory()` map các category không hỗ trợ về `leafy` làm fallback — nhưng mapping này sai về nghĩa (dairy → leafy là vô lý).

---

### GAP-09 — Debug code còn trong production ❌

```typescript
// demand-forecasting.controller.ts
@Get('debug-sidecar')   // endpoint debug không có auth
this.logger.log(`Forecasting ${p._id} ...`)  // log mỗi lần forecast
```
**Fix:** Xóa `debug-sidecar` endpoint và các `logger.log` trong vòng loop.

---

### GAP-10 — `lastRestockedAt` không được cập nhật khi nhập hàng ⚠️

`computeDaysToRestock()` dùng `product.lastRestockedAt` để tính chính xác ngày còn lại. Nhưng trong codebase không có endpoint nào cập nhật `lastRestockedAt` khi farm thực sự nhập hàng mới — field này luôn `undefined`.  
**Impact:** `daysToRestock` luôn trả về `intervalDays` cố định (mặc định 5), không phản ánh thực tế.

---

## 5. Tóm tắt trạng thái

| Feature | Hoạt động? | Chất lượng input |
|---------|-----------|-----------------|
| LSTM forecast (cron path) | ✅ Có | ⭐⭐⭐ Đầy đủ (có competitor thực, prev_delta thực) |
| LSTM forecast (frontend path) | ✅ Có | ⭐⭐ Thiếu competitor, prev_delta=0 |
| DDQN price suggest (cron) | ✅ Có | ⭐⭐⭐ Đầy đủ |
| DDQN price suggest (scan trigger) | ✅ Có | ⭐⭐⭐ Đầy đủ |
| CoreML freshness (fruit) | ✅ Có | ⭐⭐⭐ Đúng model |
| CoreML freshness (root) | ✅ Có | ⭐⭐⭐ Đúng model |
| CoreML freshness (leafy/herbs) | ⚠️ Fallback root | ⭐ Sai model |
| Redis cache (forecast) | ✅ Có | TTL 6h |
| Pricing cron | ✅ Chạy mỗi giờ | Auto-start khi boot |
| Category support (4/10) | ⚠️ Partial | 6 category không có AI price |

---

## 6. TL;DR — Luồng cô đọng

```
MongoDB (product, farm, freshnessCache)
        ↓
ProductStateVector (9 fields)
        ↓
_build_obs() → obs[10]
        ↓
[Redis check df:v1:{id}] → hit: dùng ngay
        ↓ miss
POST /forecast → ForecasterLSTM
  - Tile obs 21× → (21,10) window giả
  - LSTM 2 layer hidden=128 + cat_embed[8]
  - Output: demand7d, pWaste
        ↓
demand_7d inject vào state_vector
        ↓
POST /predict → DDQN (SharedMLPDuelingQNet)
  - obs[10] + cat_embed[8] → MLP → dueling V+A
  - compute_mask() lọc actions theo freshness+category
  - argmax → delta ∈ [-30%, -27%, ..., 0%, ..., +20%] (11 steps)
  - apply_safety() 5 rules
  - Output: targetPrice, delta_pct, safety_clipped
        ↓
PriceOverride → MongoDB
  shadow mode     → không show user, chỉ monitor
  advisory mode   → farm thấy card → Accept/Reject
```

---

## 7. Danh sách fix ưu tiên

| Prio | Gap | File cần sửa | Độ khó |
|------|-----|-------------|--------|
| 🔴 P0 | GAP-01: `@IsIn` thiếu `leafy/root/fruit` | `dto/submit-freshness.dto.ts` | 1 dòng |
| 🔴 P0 | GAP-09: Xóa debug endpoint + logger spam | `demand-forecasting.controller.ts` | Xóa code |
| 🟡 P1 | GAP-03: Hardcode `competitor_ref = price*0.95` | `demand-forecasting.controller.ts` | Inject DynamicPricingService |
| 🟡 P1 | GAP-04: Hardcode `prev_delta = 0.0` | `demand-forecasting.controller.ts` | Query PriceOverride |
| 🟡 P1 | GAP-10: `lastRestockedAt` không bao giờ cập nhật | `products.service.ts` + endpoint | Thêm logic khi update stock |
| 🟠 P2 | GAP-05: Rename `medianScore` → `latestFreshnessScore` | Schema + tất cả nơi dùng | Migration cần thiết |
| 🟠 P2 | GAP-06: FreshnessCache expire → Weibull 0.48 | `freshness-cache.schema.ts` | Tăng TTL hoặc không expire |
| 🟠 P2 | GAP-08: 6 category không có AI price | `toSidecarCategory()` + sidecar | Cần thêm model hoặc xác định fallback hợp lý |
| 🔵 P3 | GAP-02: CoreML thiếu model leafy/herbs | `dynamic-pricing-final/` | Cần train model mới |
| 🔵 P3 | GAP-07: LSTM dùng tiled obs thay time-series | Architecture | Cần historical data thực |
