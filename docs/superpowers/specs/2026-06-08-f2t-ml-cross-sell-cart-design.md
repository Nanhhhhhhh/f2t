# Thiết kế: Tính năng ML Cross-sell giỏ hàng (F2T)

- **Ngày:** 2026-06-08
- **Branch:** `feature/f2t-ml-cross-sell-cart` (tách từ `main`)
- **Trạng thái:** Spec — chờ review trước khi viết implementation plan
- **Ràng buộc xuyên suốt:** chân thực 100% với code; không overclaim trong khoá luận.

---

## 1. Mục tiêu & phạm vi

Thêm một **recommender cross-sell** thật cho F2T (hiện thesis đang liệt kê recommender là "future work"), hiển thị mục **"Thường mua kèm"** **trong màn hình giỏ hàng**, dựa trên **toàn bộ sản phẩm đang có trong giỏ**, **ưu tiên sản phẩm cùng farm** (gom đơn 1 farm → ship rẻ hơn qua GHN/Dijkstra).

**Trong phạm vi (in-scope):**
- Sidecar Python mới phục vụ chấm điểm gợi ý (cổng 8001 — env đã reserve sẵn `RECOMMENDER_SIDECAR_URL`).
- Module backend NestJS `recommendations` (controller + service + dto + test + Swagger).
- API layer + component frontend "Thường mua kèm" trong giỏ.
- Pipeline train offline (warm-start) dùng dataset Instacart 2017, mức **category**.
- Pipeline re-train (giai đoạn 2) trên đơn hàng thật, hướng tới mức **product**.

**Ngoài phạm vi (out-of-scope, YAGNI):**
- Collaborative filtering / embeddings đồng-mua (có thể thêm sau vào cùng sidecar).
- Cá nhân hoá theo lịch sử user (chỉ dùng nội dung giỏ + farm, chưa dùng user history).
- Cross-sell ở trang chi tiết sản phẩm / lúc checkout (chỉ làm surface giỏ hàng trước).
- Tự động tải dataset Instacart (license/tải thủ công — xem §9).

---

## 2. Các quyết định đã chốt (brainstorming)

| Quyết định | Giá trị |
|---|---|
| Vị trí hiển thị | Trong **giỏ hàng**, input = toàn bộ item trong cart |
| Phạm vi farm | **Ưu tiên cùng farm** (boost re-rank ở backend) |
| Nguồn dữ liệu train | Chủ yếu seed/demo → warm-start bằng **Instacart 2017** + (tuỳ chọn) synthetic |
| Kiến trúc phục vụ | **Sidecar riêng cổng 8001** (Hướng B), pattern y hệt `dynamic-pricing` |
| Kỹ thuật model | Association-rule mining (**FP-Growth**, xếp hạng theo **lift**), thư viện `mlxtend` |
| Granularity GĐ1 | **Category-level** (10×10) — chiều transfer được giữa Instacart và F2T |
| Item Instacart không map được | **Bỏ hẳn** (chiếu giỏ về đúng nhóm F2T; không dồn vào `other`) |
| Số gợi ý trả về | Top **6** |
| Endpoint | `GET /api/recommendations/cross-sell?productIds=...` |

**Lý do chọn category-level cho GĐ1:** `product_id` của Instacart không map sang catalog F2T (sản phẩm khác hoàn toàn). Chiều **duy nhất transfer được** là `category`. Model học luật `category → category`, lúc phục vụ map sang sản phẩm F2T cụ thể.

**F2T product categories (nguồn: `f2t-backend/src/modules/products/schemas/product.schema.ts`):**
`leafy, root, fruit, herbs, mushrooms, grains, dairy, eggs, honey, other`.

---

## 3. Kiến trúc tổng thể

```
[Instacart CSV]──offline──► [training scripts]──► [artifact: category_rules.json + category_popularity.json]
                                                            │
                                                            ▼
Giỏ hàng (productIds) ─► Backend NestJS ──HTTP──► recommender-sidecar :8001  POST /recommend
  (frontend)              recommendations           (nạp artifact, chấm điểm category)
                          module                          │
                             ◄── recommended categories + scores ──┘
                             │
                             ├─ map category → sản phẩm F2T thật (Products collection)
                             ├─ lọc: bỏ item đã có trong giỏ; chỉ status available|seasonal; availableQuantity>0
                             ├─ re-rank: lift × popularity × BOOST cùng-farm (× freshness nếu có)
                             └─ hydrate chi tiết SP ──► trả top 6 (envelope {success,data})
                                                              │
                                           Frontend render "Thường mua kèm" trong cart.tsx
```

**Nguyên tắc tách bạch:**
- **Sidecar** = chấm điểm ML thuần (category-level), không biết tồn kho/farm thật.
- **Backend** = nghiệp vụ + dữ liệu thật (tồn kho, cùng-farm, hydrate sản phẩm).

Đúng pattern hiện có: `dynamic-pricing.service.ts` và `demand-forecasting.service.ts` gọi sidecar qua `httpService.post(sidecarUrl + "/...")` với fallback `logger.warn`.

---

## 4. Pipeline dữ liệu & training offline (warm-start, GĐ1)

Thư mục mới `recommender-final/` (song song `dynamic-pricing-final/`):
```
recommender-final/
  requirements.txt        # pandas, mlxtend
  category_map.json       # dict curated: instacart aisle/department -> F2T category
  scripts/
    prepare_instacart.py  # CSV Instacart -> baskets mức category (đã lọc)
    mine_rules.py         # FP-Growth + association_rules -> artifact
    generate_synthetic.py # (tuỳ chọn) sinh giỏ tổng hợp khớp catalog F2T để test e2e
  model/
    category_rules.json       # {antecedentCategory: [{consequent, lift, confidence, support}]}
    category_popularity.json  # fallback theo độ phổ biến category
  data/                   # CSV Instacart (gitignore, tải thủ công)
```

**`prepare_instacart.py`:**
1. Đọc `orders.csv`, `order_products__*.csv`, `products.csv`, `aisles.csv`, `departments.csv`.
2. Join để mỗi dòng có `(order_id, aisle, department)`.
3. Map `aisle/department → F2T category` qua `category_map.json`; **bỏ** dòng không map được.
   - `produce` (fresh vegetables / fresh fruits / fresh herbs / packaged produce…) → `leafy/root/fruit/herbs/mushrooms`
   - `dairy eggs` → `dairy`, `eggs`
   - `pantry` (honeys syrups) → `honey`
   - `dry goods pasta` / `bulk` (gạo, ngũ cốc) → `grains`
   - **Bỏ:** snacks, frozen, household, alcohol, personal care, pets, babies, beverages, …
4. Gom theo `order_id` → tập category **distinct** mỗi giỏ → xuất `baskets_category.parquet/csv`.

**`mine_rules.py`:**
1. One-hot encode baskets (10 cột category).
2. `mlxtend.frequent_patterns.fpgrowth(min_support=θ_s)` → `association_rules(metric="lift", min_threshold=1.0)`, lọc thêm `confidence ≥ θ_c`.
3. Chỉ giữ luật **antecedent đơn category → consequent đơn category** (đủ cho serve theo từng category trong giỏ).
4. Xuất `category_rules.json` + `category_popularity.json` (đếm tần suất category).
5. Ngưỡng `θ_s`, `θ_c` để trong config đầu file, ghi giá trị thực dùng vào README + thesis.

---

## 5. Sidecar `recommender-sidecar` (cổng 8001)

```
recommender-sidecar/
  main.py            # FastAPI
  requirements.txt   # fastapi, uvicorn, pydantic
  tests/test_recommend.py
```

**Nạp artifact** `recommender-final/model/*.json` lúc khởi động (giống cách pricing sidecar nạp model). Đường dẫn artifact qua env/biến cấu hình.

**Endpoints:**
- `GET /health` → `{status, model_version}`.
- `POST /recommend`
  - **Input:** `{ "cart_categories": ["leafy","fruit"], "top_k": 5 }`
  - **Xử lý:** với mỗi category trong giỏ, tra `category_rules` → gộp consequent (cộng/score theo lift), loại category đã có trong giỏ, sắp xếp giảm dần → top_k. Nếu rỗng → fallback `category_popularity`.
  - **Output:** `{ "recommendations": [{"category":"herbs","score":2.13,"source":"rule"}, ...] }`

Sidecar **không** truy cập DB; chỉ thao tác trên artifact. Backend chịu trách nhiệm phần dữ liệu thật.

---

## 6. Backend module `recommendations`

`f2t-backend/src/modules/recommendations/`:
```
recommendations.module.ts
recommendations.controller.ts      + .spec.ts
recommendations.service.ts         + .spec.ts
dto/cross-sell.dto.ts
```

**Endpoint:** `GET /api/recommendations/cross-sell?productIds=<id1>,<id2>,...&limit=6`
- Swagger `@ApiOperation` + `@ApiResponse`.
- Trả envelope chuẩn `{ success, data, message? }` (TransformInterceptor).

**`recommendations.service.ts` (luồng):**
1. Nhận `productIds` (sản phẩm trong giỏ) → query Products lấy `category` + `farmId` → tập `cartCategories`, `cartFarmIds`, `cartProductIds`.
2. Gọi sidecar `RECOMMENDER_SIDECAR_URL` (`POST /recommend`, `cart_categories`, `timeout`), **fallback graceful**: nếu lỗi/timeout → `logger.warn` + fallback nội bộ (popularity theo category từ DB) → không bao giờ làm vỡ giỏ.
3. Với danh sách `recommendedCategories`, query Products:
   - `category ∈ recommendedCategories`
   - `status ∈ {available, seasonal}`, `availableQuantity > 0`
   - `_id ∉ cartProductIds` (bỏ item đã có trong giỏ)
4. **Re-rank** mỗi ứng viên: `score = ruleScore(category) × popularityWeight × farmBoost` (farmBoost > 1 nếu `farmId ∈ cartFarmIds`). Tuỳ chọn nhân thêm hệ số tươi nếu có dữ liệu freshness (đọc-only, không bắt buộc).
5. Hydrate chi tiết sản phẩm, trả **top `limit` (mặc định 6)**.

**Wiring:** `RecommendationsModule` import `ProductsModule`/Product model + `HttpModule` + `ConfigService` (đọc `RECOMMENDER_SIDECAR_URL` đã có trong `.env.development`).

---

## 7. Frontend — "Thường mua kèm" trong giỏ

- **API layer:** `f2t-frontend/src/api/recommendations/` → `types.tsx` + `use-cross-sell.tsx` (react-query-kit). Input = `productIds` từ cart store.
- **Component:** `src/components/cart/cross-sell.tsx`
  - Functional, named export, < 80 dòng, NativeWind, dùng primitives `src/components/ui/`.
  - Danh sách ngang sản phẩm gợi ý + nút "Thêm vào giỏ" (dùng cart store `src/lib/cart/`).
  - Ẩn khi không có gợi ý / đang loading rỗng.
- **Tích hợp:** render trong `src/app/(app)/cart.tsx` dưới danh sách item. Query phụ thuộc nội dung giỏ (productIds), debounce nhẹ để tránh gọi quá nhiều khi sửa số lượng.

---

## 8. Re-train pipeline (GĐ2 — sau deploy)

- `recommender-final/scripts/export_real_orders.py`: đọc Mongo `orders` (item snapshots đã có `productId` + `farmId`) → baskets **mức product** thật.
- `recommender-final/scripts/retrain.py`: mine **product-level rules** trên đơn thật; **ngưỡng kích hoạt** (vd ≥ N giỏ và đủ support) trước khi product-rules được tin dùng.
- **Blend / chuyển dần:** product-rule thật (khi đủ support) → fallback category-rule transfer → chuyển dần sang 100% native khi dữ liệu thật đủ lớn. Artifact mới drop-in cho sidecar (không đổi contract).
- Lịch chạy: manual hoặc cron (tham chiếu pattern cron low-stock ở Notifications).

---

## 9. Dataset Instacart — license & cách lấy

- **Instacart Online Grocery Shopping Dataset 2017** (Kaggle), ~3 triệu đơn, có `aisle`/`department` ≈ category, được dùng rộng rãi trong nghiên cứu market-basket.
- **Tải thủ công** về `recommender-final/data/` (gitignore — KHÔNG commit CSV lớn). README ghi link + bước tải.
- Ghi rõ trong thesis: nguồn dữ liệu, năm, mục đích (warm-start), và việc CSV không nằm trong repo (tái tạo được bằng cách tải lại).

---

## 10. Cold-start & fallback (xếp lớp)

Thứ tự ưu tiên khi sinh gợi ý:
1. **Product-rule thật** (chỉ sau khi retrain GĐ2 đủ support).
2. **Category-rule transfer** (Instacart, GĐ1).
3. **Popularity theo category** (đếm từ artifact / DB).
4. **Cùng-farm bán chạy** (đảm bảo luôn có gì đó cùng farm để gợi ý).

→ Luôn trả được gợi ý, kể cả khi sidecar chết (backend fallback) hoặc giỏ lạ.

---

## 11. Testing

- **Backend (Jest, mongodb-memory-server):**
  - `recommendations.service.spec.ts`: mock sidecar HTTP + mock Products; kiểm tra map category → sản phẩm, lọc item-đã-trong-giỏ / hết-hàng, boost cùng-farm, top 6.
  - Edge: sidecar timeout/chết → fallback không ném lỗi; giỏ rỗng → trả rỗng; không có ứng viên còn hàng → trả rỗng.
  - `recommendations.controller.spec.ts`: envelope + Swagger.
- **Frontend (Jest):** `cross-sell.tsx` render danh sách + hành vi "Thêm vào giỏ"; ẩn khi rỗng.
- **Python:** test `prepare_instacart` (mapping + lọc đúng), `mine_rules` (artifact đúng schema), smoke test sidecar `/recommend` (rule + fallback path).
- Trước khi đánh dấu done module backend: `npm run lint && npm test` (theo CLAUDE.md).

---

## 12. Trung thực & giới hạn (ghi vào thesis)

1. **Độ phân giải GĐ1 = category (10×10)**, chưa product-level — vì transfer từ catalog ngoài; product-level chỉ đạt sau retrain trên đơn thật F2T.
2. **Map `aisle/department → category` là dict curated** — ghi rõ bảng map đầy đủ + danh sách department bị loại.
3. **Độ phủ category không hoàn hảo:** vài category F2T (vd `mushrooms`, `honey`) chỉ có tương ứng yếu trong Instacart → một lý do nữa khiến retrain quan trọng.
4. **Không overclaim:** đây là recommender thật nhưng *warm-start bằng dữ liệu ngoài + category-level*, đúng như code. Không nói "cá nhân hoá" (chưa dùng user history). Không nói "product-level" khi chưa retrain.
5. **Sidecar có thể không chạy:** backend luôn fallback graceful → tính năng "degrade" chứ không vỡ (đúng triết lý các sidecar ML khác trong dự án).

---

## 13. File sẽ tạo/sửa (tóm tắt)

**Tạo mới:**
- `recommender-final/` (scripts, category_map.json, requirements.txt, model/, README)
- `recommender-sidecar/` (main.py, requirements.txt, tests)
- `f2t-backend/src/modules/recommendations/` (module/controller/service/dto/specs)
- `f2t-frontend/src/api/recommendations/` (types, use-cross-sell)
- `f2t-frontend/src/components/cart/cross-sell.tsx`

**Sửa:**
- `f2t-backend/src/app.module.ts` (đăng ký `RecommendationsModule`; validate `RECOMMENDER_SIDECAR_URL` nếu cần)
- `f2t-frontend/src/app/(app)/cart.tsx` (render component cross-sell)
- (tuỳ chọn) `docker-compose.yml` thêm service sidecar 8001
- README/CONTEXT cập nhật khi hoàn tất

---

## 14. Mặc định đang áp dụng (nói nếu muốn khác)

- Top **6** gợi ý.
- Endpoint `GET /api/recommendations/cross-sell?productIds=...`.
- Thư viện **mlxtend** (FP-Growth) cho mining.
- Sidecar cổng **8001** (theo `RECOMMENDER_SIDECAR_URL` đã có sẵn).
