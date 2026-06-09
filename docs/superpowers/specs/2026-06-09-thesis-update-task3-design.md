# Design Spec: Thesis Update — Task 3 (branch feature/f2t-thesis-merge-main)

**Ngày:** 2026-06-09  
**Branch:** `feature/f2t-thesis-merge-main`  
**Trạng thái:** APPROVED — chuyển sang writing-plans

---

## 1. Bối cảnh

Thesis F2T đã hoàn thành (Task 0+1+2, commit `efff028`, branch `feature/f2t-ml-verify-thesis`) và đã VERIFY toàn văn PASS. Từ đó, `main` đã tiến thêm **57 commit** bao gồm các tính năng mới lớn. Branch `feature/f2t-thesis-merge-main` được tạo để đồng bộ thesis mà không làm hỏng branch cũ.

**Mục tiêu Task 3:** Cập nhật `docs/thesis/final/` (5 chương + infrastructure) để phản ánh trung thực 100% code hiện tại, theo đúng kỷ luật `.handoff/rules.md` (ledger-first, verify đối kháng 2-lớp cho AI/ML và CSDL).

---

## 2. Canonical Numbers — trước và sau

| Metric | Thesis cũ (efff028) | Thực tế code mới | Evidence |
|--------|---------------------|------------------|----------|
| NestJS modules | 13 | **15** | `ls f2t-backend/src/modules/` — 15 thư mục |
| Sidecar | 1 (port 8000) | **2** (8000 + 8001) | `pricing-sidecar/` + `recommender-sidecar/` |
| AI/ML functions | 3 | **4** | +cross-sell association rules |
| REST endpoints | ~79 | **92** | `grep -rhoE "@(Get\|Post\|Put\|Patch\|Delete)\(" src --include="*.controller.ts" \| wc -l` |
| Test spec files | 21 | **24** | `find src -name "*.spec.ts"` — 24 file |
| Test cases (it()) | 54 | **78** | `grep -rE "^\s+it\(" src --include="*.spec.ts" \| wc -l` |
| Frontend screens | ~48 | **53** | `find f2t-frontend/src/app -name "*.tsx"` — 53 màn hình thật |
| MongoDB collections | 10 | **12** | +`reviews`, +`password_reset_tokens` |

---

## 3. Tính năng mới cần đưa vào thesis

### 3.1 Cross-sell Recommendations (ưu tiên cao nhất — AI/ML ⭐)

**Loại:** association rule mining (FP-Growth, mlxtend), unsupervised — **KHÔNG phải** neural/CF.  
**Độ phân giải:** category-level (10 category F2T).  
**Dữ liệu warm-start:** Instacart 2017, mirror `psparks/instacart-market-basket-analysis` (CC0-1.0).

Kết quả train thật (2026-06-08, thresholds mặc định min_support=0.02, min_confidence=0.10):
- Baskets: **2,874,457** → **34 luật** / **8 antecedent** / **9 category** ('other' vắng — thiết kế đúng)
- Popularity: fruit 0.71, leafy 0.60, dairy 0.59, root 0.32, eggs 0.16, herbs 0.11
- Sample rules (lift): herbs↔root 1.94, mushrooms→root 1.58, leafy→herbs 1.38, dairy→eggs 1.12
- Nguồn: `recommender-final/README.md` mục "Actual warm-start run"

Kiến trúc:
- **Backend module:** `recommendations` → `GET /api/recommendations/cross-sell?productIds=...&limit=6` (JwtAuthGuard)
  - Service: map productIds→categories → gọi sidecar (timeout 5000ms, fallback graceful logger.warn) → lọc stock (available/seasonal, qty>0) → re-rank FARM_BOOST=1.5 → top 6
  - `f2t-backend/src/modules/recommendations/recommendations.service.ts:10` (FARM_BOOST=1.5), `:48` (timeout), `:56` (fallback)
- **Sidecar mới:** `recommender-sidecar/main.py` — FastAPI, port 8001, 2 endpoint: `POST /recommend`, `GET /health`; nạp JSON artifacts từ `recommender-final/model/` lúc startup; KHÔNG truy cập MongoDB
- **Frontend:** `cross-sell.tsx` component "Thường mua kèm" trong `(app)/cart.tsx`; hook `use-cross-sell.tsx` react-query-kit; productIds memoized

**Ràng buộc trung thực:**
- Chưa có eval định lượng (precision@k / recall) — chỉ thống kê mô tả luật
- Warm-start Instacart ≠ đơn F2T thật (script `export_real_orders.py` có nhưng chưa chạy)
- KHÔNG bịa số eval

### 3.2 Reviews Module

**Backend:** `f2t-backend/src/modules/reviews/`  
Schema `reviews` collection:
- `productId` (ObjectId, ref Product, required)
- `orderId` (ObjectId, ref Order, required — ràng buộc phải mua mới review được)
- `customerId` (ObjectId, ref User, required)
- `customerName` (String, required), `customerAvatarUrl` (String, optional)
- `rating` (Number, 1-5, required), `comment` (String, max 500, required), `photos` (String[], default [])
- Indexes: `{ productId: 1 }`, `{ customerId: 1 }`

Controller 4 endpoint:
- `GET /api/reviews` — list by productId
- `GET /api/reviews/my` — reviewer's own reviews
- `POST /api/reviews` — tạo review, cập nhật product.averageRating + reviewCount
- `DELETE /api/reviews/:id`

Product schema bổ sung: `averageRating: Number default 0`, `reviewCount: Number default 0`  
(`f2t-backend/src/modules/products/schemas/product.schema.ts:140-144`)

**Frontend:** `products/add-review.tsx`, review list section trong `products/[id].tsx`  
**Admin:** `admin/reviews.tsx` (quản lý đánh giá)

### 3.3 Auth Enhancements

**Backend** (`f2t-backend/src/modules/auth/`):  
Schema mới `password_reset_tokens`:
- `email` (String, required, index), `otp` (String, bcrypt hashed), `expiresAt` (Date, required), `used` (Boolean, default false)
- TTL index: `{ expiresAt: 1 }, { expireAfterSeconds: 0 }`

Endpoint mới (auth.controller.ts):
- `POST /auth/forgot-password` (L135)
- `POST /auth/verify-otp` (L143)
- `POST /auth/reset-password` (L150)
- `POST /auth/change-password` (L159)
- `POST /auth/register/farm` (L69) — tạo user role=farm + farm 1 bước, rollback nếu lỗi

**Frontend:** `forgot-password.tsx`, `verify-otp.tsx`, `reset-password.tsx`, `(app)/profile/change-password.tsx`

### 3.4 Admin Enhancements

Endpoint mới (admin.controller.ts):
- `GET /api/admin/posts` (L66)
- `DELETE /api/admin/posts/:id` (L75)

Frontend mới: `admin/posts.tsx`, `admin/products.tsx`, `admin/reviews.tsx`  
Route restructure: `(admin)/` → `admin/` (fix "Maximum update depth exceeded")

### 3.5 Posts Tag Picker

- `GET /api/users/search` (users.controller.ts:63) — JWT-guarded, max 10 results
- Frontend: tag picker UI trong `feed/add-post.tsx` tìm user/farm theo tên

### 3.6 Minor Fixes (không cần mục riêng trong thesis)

- VND currency display (cart, notifications, cross-sell)
- Farms/products form fix (khớp schema backend)
- Notification templates (`api/notifications/templates.tsx` mới — refactor, không phải feature mới)
- Payment service: một số sửa nhỏ
- Admin route rename `(admin)/` → `admin/` (đã ở mục 3.4)

---

## 4. Sections bị ảnh hưởng trong thesis

### Chương 1
- §1.2 / §1.5: cập nhật số liệu (4 AI function, 15 module, 2 sidecar)

### Chương 2 ⭐ (2-lớp verify)
- **Mới §2.4.4:** Association Rule Mining / FP-Growth
  - Định nghĩa support, confidence, lift (công thức)
  - FP-tree, FP-Growth vs Apriori (không sinh candidate)
  - Phân loại: unsupervised / khai phá luật kết hợp
  - Citation: [36] Agrawal & Srikant 1994 (Apriori), [37] Han, Pei & Yin 2000 (FP-Growth)
- §2.1.2: "3 trong 4 ứng dụng" → "4/4 ứng dụng được hiện thực"
- §2.5/§2.6: scope lại câu "không có hệ thống gợi ý"

### Chương 3 ⭐ (§3.3.7d, §3.4 là 2-lớp verify)
- §3.3.1: 15 module, 2 sidecar, auth password reset
- §3.3.3: thêm UC cross-sell + UC review
- **Mới §3.3.x:** Reviews module
- **Mới §3.3.x:** Recommendations module + sidecar 8001
- **§3.3.7d ⭐:** Cross-sell AI/ML design + sequence diagram `sd-cross-sell.puml`
- **§3.4 ⭐:** +collection reviews + password_reset_tokens + product averageRating/reviewCount
- §3.5: thêm màn hình mới (review, auth reset, admin, CrossSell cart); scope lại "không gợi ý"

### Chương 4 ⭐ (§4.4.5 là 2-lớp verify)
- §4.3: 78 test / 24 spec (từ 54/21); spec mới: reviews×1 + recommendations×2
- §4.4.1: 15 module / 92 endpoint / 53 màn hình
- **Mới §4.4.5 ⭐:** Cross-sell eval — thống kê mô tả (số thật: 34 luật, lift, popularity); ghi rõ chưa eval precision@k; warm-start Instacart ≠ F2T thật

### Chương 5
- §5.1: 4 AI function, 15 module, 2 sidecar; thêm cross-sell vào đóng góp
- §5.2: 4 giới hạn cross-sell mới bắt buộc (category-level, warm-start ngoài, chưa eval, chỉ giỏ hàng); giữ 3 giới hạn cũ
- §5.3: "cross-sell GĐ1 đã có → GĐ2 product-level/CF là tương lai"; xóa "hiện chưa tồn tại"

### Infrastructure
- `STRUCTURE.md`: cập nhật số canonical, thêm hàng cross-sell + reviews
- `claims-ledger.md`: đánh dấu `t1.4-no-recommender` = LỊCH SỬ; thêm 5 entry mới
- `VERIFY-REPORT.md`: re-run V1-V6 sau khi tất cả section xong
- TLTK: thêm [36] Agrawal 1994, [37] Han 2000
- Mục lục/danh mục: thêm mục mới + hình sd-cross-sell

---

## 5. Task Tree T3.x

### Nhóm 0 — Nền tảng (sequential, phải xong trước tất cả)

| ID | Việc | Model | Dep | ⭐ |
|----|------|-------|-----|---|
| T3.0 | Fact-pack ledger: đọc từng file nguồn, tạo 5 entry mới trong claims-ledger.md, đánh dấu t1.4-no-recommender=LỊCH SỬ | sonnet | — | |
| T3.1 | STRUCTURE.md: cập nhật số canonical (15/2/4/92/53/78/24/12), thêm hàng cross-sell + reviews, ghi 4 giới hạn cross-sell bắt buộc | sonnet | T3.0 | |

### Nhóm 1 — Chương 2 (sequential trong nhóm)

| ID | Việc | Model | Dep | ⭐ |
|----|------|-------|-----|---|
| T3.2 | §2.4.4 FP-Growth theory: support/confidence/lift, FP-tree, unsupervised; §2.1.2 + §2.5/§2.6 scope fix | sonnet implementer + sonnet verifier | T3.1 | ⭐ 2-lớp |

### Nhóm 2 — Chương 3 (T3.3–T3.7 song song nhau, T3.8 cần T3.2+T3.3–T3.7, T3.9 độc lập)

| ID | Việc | Model | Dep | ⭐ |
|----|------|-------|-----|---|
| T3.3 | Sweep "no recommender": tìm+thay thế 8+ câu tuyệt đối; scope lại t1.4-no-recommender refs | sonnet | T3.1 | |
| T3.4 | §3.3.1 Kiến trúc: 15 module, 2 sidecar, auth password reset + register/farm | sonnet | T3.1 | |
| T3.5 | §3.3.3 Use cases: thêm UC cross-sell + UC review vào nhóm AI/ML (4 UC) | sonnet | T3.1 | |
| T3.6 | §3.3.x Reviews module: schema reviews, 4 endpoint, service averageRating update | sonnet | T3.1 | |
| T3.7 | §3.3.x Recommendations module: controller endpoint, service logic (FARM_BOOST/fallback/stock filter), sidecar 8001 | sonnet | T3.1 | |
| T3.8 | §3.3.7d Cross-sell AI/ML design + diagram sd-cross-sell.puml | sonnet implementer + sonnet verifier | T3.2, T3.3–T3.7 | ⭐ 2-lớp |
| T3.9 | §3.4 CSDL: +reviews (6 trường, 2 index), +password_reset_tokens (TTL index), product averageRating/reviewCount; update ERD | sonnet implementer + sonnet verifier | T3.1 | ⭐ 2-lớp |
| T3.10 | §3.5 UI: thêm màn hình mới (review/auth-reset/admin/CrossSell cart); scope lại "không gợi ý" trong home/feed | sonnet | T3.1 | |

### Nhóm 3 — Chương 4 (T3.11+T3.12 song song, T3.13 cần T3.8)

| ID | Việc | Model | Dep | ⭐ |
|----|------|-------|-----|---|
| T3.11 | §4.3 Testing: 78 test / 24 spec; mô tả reviews.service.spec + recommendations×2 | sonnet | T3.1 | |
| T3.12 | §4.4.1 Tổng quan: bảng 15 module + mô tả, 92 endpoint, 53 màn hình, 2 sidecar | sonnet | T3.1 | |
| T3.13 | §4.4.5 Cross-sell eval: 34 luật/lift/popularity thật; ghi rõ chưa eval precision@k; warm-start ≠ F2T thật | sonnet implementer + sonnet verifier | T3.8 | ⭐ 2-lớp |

### Nhóm 4 — Chương 5 + Infrastructure (sau khi nhóm 2+3 xong)

| ID | Việc | Model | Dep | ⭐ |
|----|------|-------|-----|---|
| T3.14 | §5.1/§5.2/§5.3: 4 AI / 4 giới hạn cross-sell bắt buộc / GĐ2 tương lai | sonnet | T3.11, T3.12, T3.13 | |
| T3.15 | TLTK IEEE: thêm [36] Agrawal 1994, [37] Han 2000 (order-of-appearance) | sonnet | T3.14 | |
| T3.16 | Mục lục/danh mục: thêm mục §2.4.4/§3.3.x×2/§3.3.7d/§4.4.5 + hình sd-cross-sell | sonnet | T3.14 | |
| T3.17 | *(gộp vào T3.0 — claims-ledger làm cùng fact-pack, không tách riêng)* | — | — | |
| T3.18 | VERIFY toàn văn (V1–V6): citation sweep / false-claim / canonical / 0 số bịa / mục lục / 7 giới hạn bắt buộc → VERIFY-REPORT.md | sonnet đối kháng độc lập | tất cả | ⭐ 2-lớp |
| T3.19 | .handoff/STATE.md + task-tree.md: ghi Task 3 DONE | controller | T3.18 | |

### Dependency graph

```
T3.0 ──► T3.1 ──► T3.2 ⭐ ─────────────────────────────► T3.8 ⭐ ──► T3.13 ⭐
              └──► T3.3  ────────────────────────────────►        │
              └──► T3.4  ────────────────────────────────►        │
              └──► T3.5  ────────────────────────────────►        │
              └──► T3.6  ────────────────────────────────►        │
              └──► T3.7  ────────────────────────────────►        │
              └──► T3.9 ⭐ (độc lập)                              │
              └──► T3.10 (độc lập)                                │
              └──► T3.11 ──────────────────────────────────────► T3.14 ──► T3.15
              └──► T3.12 ──────────────────────────────────────►        └──► T3.16
         [tất cả sections] ──► T3.18 ⭐ ──► T3.19
```

---

## 6. Ràng buộc trung thực (BẤT DI BẤT DỊCH)

1. **KHÔNG bịa số eval.** Cross-sell chỉ có thống kê mô tả (34 luật/lift/popularity). §4.4.5 ghi rõ "chưa eval precision@k".
2. **Không overclaim mức độ ML.** Gọi đúng: "association rule mining / unsupervised" — KHÔNG "neural/CF/deep learning".
3. **Warm-start ≠ F2T thật.** Nói rõ luật từ Instacart (hành vi siêu thị Mỹ), map category, chưa phải đơn F2T.
4. **4 giới hạn cross-sell bắt buộc** (§5.2): category-level / warm-start ngoài / chưa eval / chỉ giỏ hàng.
5. **`recommendation_caches` không tồn tại** trong MongoDB — artifact là JSON file, câu §3.4 cũ vẫn đúng.
6. Mọi `[ref: ledger t1.4-no-recommender]` → scope lại thành `[ref: ledger cross-sell-v1]`.

---

## 7. Files nguồn cần đọc khi viết (tự verify số dòng)

| Task | Files cần đọc |
|------|---------------|
| T3.2 | `recommender-final/scripts/mine_rules.py`, `recommender-sidecar/main.py`, `recommender-final/README.md` §"Actual warm-start" |
| T3.6 | `f2t-backend/src/modules/reviews/schemas/review.schema.ts`, `reviews.controller.ts`, `reviews.service.ts` |
| T3.7 | `f2t-backend/src/modules/recommendations/recommendations.service.ts`, `recommendations.controller.ts`, `recommender-sidecar/main.py` |
| T3.8 | Tất cả file T3.7 + `recommender-final/scripts/prepare_instacart.py`, `mine_rules.py`, `f2t-backend/src/app.module.ts` |
| T3.9 | `f2t-backend/src/modules/reviews/schemas/review.schema.ts`, `f2t-backend/src/modules/auth/schemas/password-reset-token.schema.ts`, `f2t-backend/src/modules/products/schemas/product.schema.ts:140-144` |
| T3.13 | `recommender-final/README.md` §"Actual warm-start run" — các số PHẢI khớp 100% |

---

## 8. Quy ước commit

Mỗi task T3.x pass → 1 commit: `task(T3.x): <mô tả>` + cập nhật `.handoff/`  
⭐ task = implementer commit → verifier commit (2 commit riêng nếu verifier fix)
