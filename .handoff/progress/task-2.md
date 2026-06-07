# progress/task-2.md — Viết khoá luận hoàn chỉnh từ dany.md

Plan: `docs/superpowers/plans/2026-06-07-task2-thesis-full-prose.md`.
Đầu ra: `docs/thesis/final/` (chia chương) + `diagrams/*.puml`.
Quy trình mỗi leaf-task: ledger-first → viết prose (giữ citation inline) → verify đối kháng độc lập (CSDL/AI-ML/diagram 2-lớp) → done-gate → commit.

## T2.1 — Skeleton thesis final + STRUCTURE map ✅
- Tạo `docs/thesis/final/`: 00-trang-bia-muc-luc.md, chuong-1..5, tai-lieu-tham-khao.md, diagrams/.gitkeep, STRUCTURE.md.
- Skeleton heading lấy từ `dany.outline.md`; mỗi section có comment `<!-- T2.x: nguồn dany.md Lxx; ledger ... -->`.
- STRUCTURE.md = hợp đồng cấu trúc: bảng ánh xạ 40 section → leaf-task → file → diagram → ledger + số liệu canonical + 3 giới hạn bắt buộc + quy ước [TLTK].
- **Verify (controller):** heading khớp 100% dany.outline.md — ch1 6 mục; ch2 6×§y + 13×§y.z; ch3 5×§y + 19×§y.z + 3×(a/b/c); ch4 4×§y + 8×§y.z; ch5 3×§y. Thứ tự + cấp giữ nguyên. PASS.

## T2.2 — Fact-pack ledger ✅

5 entry đã nạp vào `claims-ledger.md` nhóm "Task 2 — fact-pack prose":

| Entry ID | Phát biểu | Path:Lxx chính | Trạng thái |
|---|---|---|---|
| `t2.2-tech-versions` | Version thư viện Backend/Frontend/Sidecar | `f2t-backend/package.json:29-51`, `f2t-frontend/package.json:53-97`, `pricing-sidecar/requirements.txt:1-9` | PASS |
| `t2.2-frontend-routes` | 8 route groups + 5 file gốc, ≈48 màn hình | `ls f2t-frontend/src/app` (thực thi), ledger t1.15-numbers | PASS |
| `t2.2-seed` | Đếm tài khoản seed thật | `f2t-backend/src/seed/seed.ts:59,87,116,381` | PASS — KHỚP dany.md |
| `t2.2-stripe-ghn` | Stripe checkout/webhook + GHN createOrder + Dijkstra | `payments.service.ts:54,102,120,126`, `ghn.provider.ts:47`, `delivery.service.ts:98,131,232` | PASS |
| `t2.2-security` | JwtAuthGuard, bcrypt saltRounds=10, graceful degrade | `jwt-auth.guard.ts:5`, `users.service.ts:18`, `dynamic-pricing.service.ts:154,283,522` | PASS |

**Con số seed thật (đọc seed.ts trực tiếp):**
- Admin×1 (`seed.ts:381`) — role `'admin'`, email `admin@f2t.com`
- Farm×3 (`seed.ts:59`, vòng `i=1..3`) — role `'farm'`, status `'active'`
- Consumer×5 (`seed.ts:87`, vòng `i=1..5`) — role `'consumer'`, status `'active'`
- Suspended×1 (`seed.ts:116`) — role `'consumer'`, status `'suspended'`
- **Tổng: 10 user — KHỚP dany.md §4.2.3 "Admin×1, Farm×3, Consumer×5, Suspended×1" — KHÔNG lệch.**

**Ghi chú kỹ thuật:**
- Frontend: `react-native-mmkv` trong package.json ghi `~3.1.0` (đúng như spec). Không có `@stripe/stripe-react-native` — Stripe chỉ ở backend + WebView redirect flow.
- Dijkstra trong delivery.service.ts là fallback demo (no GHN code) — graph 10 node HCMC hardcoded, trả `trackingCode: 'GHN-ALGO-F2T-99'`. Thesis nên trình bày rõ đây là fallback minh họa, không phải routing production.

## T2.3 (structural) — 10 diagram ✅

10 file `.puml` tạo tại `docs/thesis/final/diagrams/`:

| # | File | Nguồn ledger / dany.md |
|---|---|---|
| 1 | `erd.puml` | ledger t1.11-schema-detail, t1.4-collections; dany.md §3.4.1 L397-421, §3.4.2 L423-447 |
| 2 | `deployment-architecture.puml` | dany.md §3.3.1 L243-253; ledger t1.4-one-sidecar; f2t-backend/src/app.module.ts:57 |
| 3 | `fdd-functional-decomposition.puml` | dany.md §3.2.3 L233-239; ledger t1.4-no-recommender; pricing-sidecar/main.py:263,277,316 |
| 4 | `contribution-map.puml` | dany.md §1.5 L47-61; ledger t1.4-one-sidecar, t1.4-interceptor-cron, t1.4-no-recommender |
| 5 | `usecase-overview.puml` | dany.md §3.3.2 L255-267; ledger t1.4-no-recommender |
| 6 | `usecase-aiml.puml` | dany.md §3.3.3 L269-275; ledger t1.4-no-recommender, t1.4-forecaster-not-holt, t1.4-one-sidecar |
| 7 | `business-process-current.puml` | dany.md §3.1.1 L197-203 |
| 8 | `business-process-f2t.puml` | dany.md §3.1.2 L205-209; ledger t1.4-interceptor-cron, t1.4-one-sidecar |
| 9 | `net-forecaster-lstm.puml` | ledger t0.2-forecaster-arch, t0.10-conclusion; dany.md §3.3.7(a) L337-349 |
| 10 | `net-ddqn-dueling.puml` | ledger t0.2-ddqn-arch, t0.2-action-space, t1.4-ddqn-dims; dany.md §3.3.7(b) L351-369 |

**Verify checklist T2.3 (structural):**
- ERD: 10 entity đúng (users, farms, products, orders, OrderItem-embedded, posts, notifications, notification_preferences, verification_tokens, freshness_cache, price_overrides) — KHÔNG có recommendation_caches/forecast_caches ✅
- Deployment: 1 sidecar (port 8000, 3 endpoint) — KHÔNG có port 8001/8002 ✅
- usecase-aiml: 2 UC (UC-ML-01 Dự báo + UC-ML-02 Định giá) — KHÔNG có UC recommender ✅
- net-forecaster-lstm: obs_dim=10 (không phải 11) ✅
- net-ddqn-dueling: obs_dim=10, n_actions=11, CANDIDATES linspace(-0.30,0.20,11) ✅

## T2.3 (behavioral) — 13 diagram ✅

13 file `.puml` hành vi tạo tại `docs/thesis/final/diagrams/`:

| # | File | Loại | Nguồn ledger / dany.md |
|---|---|---|---|
| 1 | `sd-01-login-jwt.puml` | Sequence | dany.md L293-297; ledger t2.2-security; jwt-auth.guard.ts:5, users.service.ts:18 |
| 2 | `sd-02-register.puml` | Sequence | dany.md L298-299; ledger t2.2-security; auth.service.ts:95-101 |
| 3 | `sd-03-search-geo.puml` | Sequence | dany.md L300-301; ledger t1.11-schema-detail; farm.schema.ts:113 2dsphere |
| 4 | `sd-04-create-order.puml` | Sequence | dany.md L302-303; ledger t1.11-schema-detail; order.schema.ts:7-34 embedded snapshot |
| 5 | `sd-05-stripe-checkout.puml` | Sequence | dany.md L304-305; ledger t2.2-stripe-ghn; payments.service.ts:54,102,120,126 |
| 6 | `sd-06-ghn-dijkstra.puml` | Sequence | dany.md L306-307; ledger t2.2-stripe-ghn; ghn.provider.ts:47, delivery.service.ts:98,131,232 |
| 7 | `sd-ml-01-pricing-cron.puml` | Sequence (ML) | dany.md L309-311; ledger t1.4-interceptor-cron, t1.4-safety-5-rules; pricing-tick.cron.ts:18 |
| 8 | `sd-ml-02-forecast.puml` | Sequence (ML) | dany.md L312-313; ledger t1.4-forecaster-not-holt; demand-forecasting.service.ts:43, main.py:263 |
| 9 | `sd-ml-03-pricing-detail.puml` | Sequence (ML) | dany.md L314-315; ledger t1.4-safety-5-rules; main.py:277, safety.py:1-19 |
| 10 | `ad-01-order-lifecycle.puml` | Activity | dany.md L319-323; ledger t1.11-schema-detail; order.schema.ts:128-138 enum status |
| 11 | `ad-02-jwt.puml` | Activity | dany.md L324-325; ledger t2.2-security; jwt-auth.guard.ts, auth.service.ts:104-112 |
| 12 | `ad-ml-01-forecaster.puml` | Activity (ML) | dany.md L327-329; ledger t1.4-forecaster-not-holt; main.py:128-145 |
| 13 | `ad-ml-02-ddqn-safety.puml` | Activity (ML) | dany.md L330-331; ledger t1.4-safety-5-rules; safety.py:1-19, t0.2-ddqn-arch |

**Verify checklist T2.3 (behavioral):**
- SD-ML đúng 3 diagram (sd-ml-01, sd-ml-02, sd-ml-03) — KHÔNG có recommender/Holt/8001/8002 ✅
- SD-ML-01/03 dùng DDQN SharedMLPDuelingQNet, Safety Layer 5 quy tắc — khớp ledger t1.4-safety-5-rules ✅
- SD-ML-02 dùng ForecasterLSTM (KHÔNG phải Holt EWMA) — khớp ledger t1.4-forecaster-not-holt ✅
- ad-01 enum status đúng 7 giá trị: pending/confirmed/preparing/ready_for_pickup/shipped/delivered/cancelled — khớp order.schema.ts:128-138 ✅
- ad-ml-02 Safety 5 rule thứ tự: 3→4→1→2→5 — khớp safety.py:1-19 ✅
- ad-ml-02 Rule3 clip[base×0.70, base×1.20]; Rule4 freshness<0.4→≤base×0.75; Rule1 ≥base×0.55; Rule2 ≤base×2.0; Rule5 ≥1000VND ✅
- KHÔNG có diagram recommender/cosine/Holt/sidecar 8001/8002 ✅

## T2.3-VERIFY — kết quả đối kháng

**Verifier:** adversarial agent độc lập (khác agent vẽ). Mọi claim giả định SAI cho tới khi resolve tại nguồn.
**Ngày:** 2026-06-07

---

### 1. erd.puml — 10 entity + field + quan hệ

| Mục kiểm | Diagram claim | Source thật | Kết quả |
|---|---|---|---|
| Entity `users` fields | email/password/firstName/lastName/phoneNumber/avatarUrl/role/status/location.*/refreshToken/pushToken/emailVerified/phoneVerified/isBanned | `user.schema.ts:20-96` — khớp tất cả fields | PASS |
| `users.role` enum | consumer/farm/admin | `user.schema.ts:40` `enum: ['consumer','farm','admin']` | PASS |
| `users.status` enum | active/suspended/pending | `user.schema.ts:46-49` `enum: ['active','suspended','pending']` | PASS |
| Entity `farms` FK | ownerId → users | `farm.schema.ts:51` `Types.ObjectId, ref: 'User'` | PASS |
| `farms.verificationStatus` enum | pending/verified/rejected | `farm.schema.ts:106` | PASS |
| Entity `products` FK | farmId → farms | `product.schema.ts:39` `ref: 'Farm'` | PASS |
| `products.category` enum | leafy/root/fruit/herbs/mushrooms/grains/dairy/eggs/honey/other | `product.schema.ts:49-61` | PASS |
| `products.unit` enum | kg/g/piece/bunch/box/bag/liter | `product.schema.ts:71-73` | PASS |
| `products.status` enum | available/sold_out/unavailable/seasonal | `product.schema.ts:83-86` | PASS |
| Entity `orders` FK | customerId→users, farmId→farms | `order.schema.ts:100,103` | PASS |
| `orders.status` enum | 7 giá trị: pending/confirmed/preparing/ready_for_pickup/shipped/delivered/cancelled | `order.schema.ts:128-138` | PASS |
| `orders.paymentStatus` enum | pending/paid/failed/refunded | `order.schema.ts:141-145` | PASS |
| OrderItem **embedded** | `@Schema({_id:false})` embedded trong orders | `order.schema.ts:6-34` + `L105 type:[OrderItem]` | PASS |
| OrderItem fields | productId/productName/productImage/quantity/pricePerUnit/unit/totalPrice/farmId/farmName | `order.schema.ts:7-33` | PASS |
| Entity `posts` FK | authorId→users, farmId→farms (optional) | `post.schema.ts:77,82` | PASS |
| `posts.authorRole` enum | consumer/farm | `post.schema.ts:79` | PASS |
| Entity `notifications` FK | userId→users | `notification.schema.ts:21` | PASS |
| `notifications.referenceId` type | **Diagram: ObjectId** — **Code thật: String** | `notification.schema.ts:36` `referenceId?: string` | **WARN** (minor — type lệch nhưng không sai về entity) |
| Entity `notification_preferences` FK | userId→users UNIQUE | `notification-preferences.schema.ts:21,24` `unique:true` | PASS |
| Entity `verification_tokens` FK | userId→users, type enum[email/phone] | `verification-token.schema.ts:9,15` | PASS |
| `verification_tokens.expiresAt` TTL | expiresAt TTL index | `verification-token.schema.ts:31` `{expireAfterSeconds:0}` | PASS |
| Entity `freshness_cache` FK | productId→products UNIQUE | `freshness-cache.schema.ts:27,44` `{unique:true}` | PASS |
| `freshness_cache` fields | readings[{score,scannedAt}]+medianScore+updatedAt+expiresAt | `freshness-cache.schema.ts:6-40` | PASS |
| Entity `price_overrides` FK | productId→products, farmId→farms | `price-override.schema.ts:18,21` | PASS |
| `price_overrides.status` enum | shadow/pending_review/accepted/rejected/expired | `price-override.schema.ts:46-49` | PASS |
| `price_overrides.mode` enum | shadow/advisory | `price-override.schema.ts:43` | PASS |
| Không có entity `recommendation_caches` | ERD không có | `grep -rn 'recommendation_cache' f2t-backend/src` = 0 | PASS |
| Không có entity `forecast_caches` | ERD không có | `grep -rn 'forecast_caches' f2t-backend/src` = 0 | PASS |
| 10 quan hệ đúng | users→farms/orders/notifications/notif_prefs/posts/verif_tokens; farms→products; products→freshness_cache/price_overrides; orders→orderitem(embedded) | Tất cả FK verified trên | PASS |

**Kết luận Nhóm 1:** PASS (có 1 WARN minor: `notifications.referenceId` trong ERD ghi `ObjectId` nhưng code thật là `String` — `notification.schema.ts:36`).

> WARN không escalate thành REJECT vì ERD vẫn đúng về entity/quan hệ/FK chính; chỉ lệch type của 1 optional field không ảnh hưởng ERD semantics. Không cần sửa diagram ngay.

---

### 2. deployment-architecture.puml — 1 sidecar port 8000, 3 endpoint

| Mục kiểm | Diagram claim | Source thật | Kết quả |
|---|---|---|---|
| SIDECAR_URL default port | 8000 | `app.module.ts:57` `"http://localhost:8000"` | PASS |
| Không có port 8001/8002 | Diagram ghi rõ "KHÔNG có port 8001/8002" | `grep -n "8001\|8002" app.module.ts` = 0 kết quả | PASS |
| Endpoint `/predict` | POST /predict DDQN | `main.py:277` `@app.post("/predict"...)` | PASS |
| Endpoint `/forecast` | POST /forecast ForecasterLSTM | `main.py:263` `@app.post("/forecast"...)` | PASS |
| Endpoint `/freshness/classify` | POST /freshness/classify CoreML | `main.py:316` `@app.post("/freshness/classify"...)` | PASS |
| 1 sidecar duy nhất | Chỉ pricing-sidecar/ | `app.module.ts:57` 1 PRICING_SIDECAR_URL; `dynamic-pricing.service.ts` + `demand-forecasting.service.ts` đều dùng cùng URL | PASS |

**Kết luận Nhóm 2:** PASS — 1 sidecar port 8000, đúng 3 endpoint, không có 8001/8002.

---

### 3. usecase-aiml.puml — đúng 2 UC, không có recommender

| Mục kiểm | Diagram claim | Source thật | Kết quả |
|---|---|---|---|
| UC-ML-01: Dự báo nhu cầu | Có trong diagram | `demand-forecasting.service.ts:43` POST /forecast | PASS |
| UC-ML-02: Định giá động | Có trong diagram | `dynamic-pricing.service.ts:280` POST /predict | PASS |
| Không có UC recommender/gợi ý | Diagram note "grep... = 0 file" | `grep -rliE 'recommend' f2t-backend/src` = 0 | PASS |
| UC-ML-01.3 obs_dim=10 | window=21, obs_dim=10 | `model.py:9` `obs_dim: int = 10` | PASS |
| UC-ML-02.3 obs 10 chiều | obs 10 chiều | `main.py:88-125` `_build_obs` returns 10-element array | PASS |
| UC-ML-02.4 Safety 5 quy tắc thứ tự 3→4→1→2→5 | Đúng thứ tự | `safety.py:1-19` | PASS |
| Không có Holt/EWMA/cosine | Không xuất hiện | Toàn bộ diagram không có | PASS |

**Kết luận Nhóm 3:** PASS — đúng 2 UC, không có recommender, không có Holt.

---

### 4. sd-ml-01/02/03.puml — cron, /forecast, /predict

| Mục kiểm | Diagram claim | Source thật | Kết quả |
|---|---|---|---|
| SD-ML-01 cron `"0 * * * *"` | `pricing-tick.cron.ts:18` | `pricing-tick.cron.ts:18` `get("PRICING_CRON_SCHEDULE","0 * * * *")` | PASS |
| SD-ML-02 /forecast tại `main.py:263` | `main.py:263` | `main.py:263` `@app.post("/forecast"...)` | PASS |
| SD-ML-03 /predict tại `main.py:277` | `main.py:277` | `main.py:277` `@app.post("/predict"...)` | PASS |
| SD-ML-02 `demand-forecasting.service.ts:43` gọi /forecast | `service.ts:43` | `demand-forecasting.service.ts:42-43` `http.post(.../forecast...)` (dòng 42-43, POST ở dòng 42-43) | PASS |
| SD-ML-02 `_run_forecaster` tại `main.py:128-145` | `main.py:128-145` | `main.py:128-145` `def _run_forecaster` | PASS |
| Không có cosine/Holt trong sd-ml-* | Không xuất hiện | Đọc 3 file sd-ml-*.puml — không có | PASS |
| Không có port 8001/8002 trong sd-ml-* | Không xuất hiện | Tất cả dùng "port 8000" | PASS |

**Kết luận Nhóm 4:** PASS — cron/endpoint/service đúng line number, không có cosine/Holt/8001/8002.

---

### 5. ad-ml-02-ddqn-safety.puml — Safety 5 rule thứ tự + giá trị

| Mục kiểm | Diagram claim | Source thật (`safety.py:1-19`) | Kết quả |
|---|---|---|---|
| Thứ tự áp Rule | 3→4→1→2→5 | `safety.py:5,8,12,15,18` — đúng thứ tự Rule3/4/1/2/5 | PASS |
| Rule 3 giá trị | clip `[base×0.70, base×1.20]` | `safety.py:6` `max(base*0.70, min(p, base*1.20))` | PASS |
| Rule 4 giá trị | `freshness<0.4 → ≤base×0.75` | `safety.py:9-10` `if freshness < 0.4: min(p, base*0.75)` | PASS |
| Rule 1 giá trị | `≥base×0.55` | `safety.py:13` `max(p, base*0.55)` | PASS |
| Rule 2 giá trị | `≤base×2.0` | `safety.py:16` `min(p, base*2.0)` | PASS |
| Rule 5 giá trị | `≥1000 VND` | `safety.py:19` `max(p, 1000.0)` | PASS |

**Kết luận Nhóm 5:** PASS — thứ tự 3→4→1→2→5 đúng, tất cả 5 giá trị ngưỡng đúng.

---

### 6. ad-01-order-lifecycle.puml — enum status 7 giá trị

| Mục kiểm | Diagram claim | Source thật | Kết quả |
|---|---|---|---|
| 7 giá trị status | pending/confirmed/preparing/ready_for_pickup/shipped/delivered/cancelled | `order.schema.ts:128-138` đúng 7 giá trị | PASS |
| Không có "packing" | Không xuất hiện | Đọc diagram + schema | PASS |
| Không có "shipping" | Không xuất hiện | Schema dùng "shipped" (đúng) | PASS |
| Không có "completed" | Không xuất hiện | Schema không có "completed" | PASS |

**Kết luận Nhóm 6:** PASS — đúng 7 giá trị enum, không có tên sai.

---

### 7. net-forecaster-lstm.puml & net-ddqn-dueling.puml — kiến trúc ML

| Mục kiểm | Diagram claim | Source thật | Kết quả |
|---|---|---|---|
| ForecasterLSTM obs_dim | 10 (không phải 11) | `model.py:9` `obs_dim: int = 10` | PASS |
| ForecasterLSTM LSTM layers | 2 lớp | `model.py:13` `lstm_layers: int = 2` | PASS |
| ForecasterLSTM hidden | 128 | `model.py:12` `lstm_hidden: int = 128` | PASS |
| ForecasterLSTM n_categories | 4 | `model.py:11` `n_categories: int = 4` | PASS |
| ForecasterLSTM cat_embed_dim | 8 | `model.py:10` `cat_embed_dim: int = 8` | PASS |
| ForecasterLSTM dual-head | demand_head + waste_head | `model.py:31-37,46-48` | PASS |
| ForecasterLSTM window | 21 | `model.py:10` `window: int = 21` | PASS |
| ForecasterLSTM concat dim | 128+8=136 | `model.py:30` `z_dim = cfg.lstm_hidden + cfg.cat_embed_dim` = 128+8=136 | PASS |
| DDQN obs_dim | 10 | `network.py:51-57` `obs_dim:int=10` | PASS |
| DDQN n_cats | 4 | `network.py:53` `n_cats:int=4` | PASS |
| DDQN cat_embed_dim | 8 | `network.py:54` `cat_embed_dim:int=8` | PASS |
| DDQN hidden | 128 | `network.py:55` `hidden:int=128` | PASS |
| DDQN n_actions | 11 | `network.py:56` `n_actions:int=11` | PASS |
| DDQN Dueling V+A heads | V(s) + A(s,a) − mean(A) | `network.py:65-66,76-78` | PASS |
| DDQN shared MLP Linear(18→128)→ReLU→Linear(128→128)→ReLU | shared obs+cat_embed | `network.py:61-63` `Linear(obs_dim+cat_embed_dim, hidden)` = `Linear(18,128)` | PASS |
| DDQN Q=V+A−mean(A) | Dueling formula | `network.py:78` `q = v + a - a.mean(dim=1,keepdim=True)` | PASS |
| DDQN 11 action CANDIDATES | linspace(-0.30,0.20,11) | (ledger t0.2-action-space: `reward.py:6-7`) | PASS |
| Không có obs_dim=11 | obs_dim=10 chỉ | Cả 2 diagram dùng obs_dim=10 | PASS |

**Kết luận Nhóm 7:** PASS — kiến trúc ForecasterLSTM + DDQN đúng 100%, obs_dim=10, không có obs_dim=11.

---

### 8. sd-06-ghn-dijkstra.puml — Dijkstra là fallback demo

| Mục kiểm | Diagram claim | Source thật | Kết quả |
|---|---|---|---|
| Dijkstra là "fallback demo" không phải production | Diagram note rõ "MINH HỌA THUẬT TOÁN — Không phải routing production" | `delivery.service.ts:131` — Dijkstra code chỉ chạy khi `!order.ghnOrderCode`; comment L99 "Provide demo data for many statuses to allow testing" | PASS |
| Dijkstra tại `delivery.service.ts:131` | Diagram cite `:131` | `delivery.service.ts:131` `const dijkstra = (startId: string, endId: string) => {...}` | PASS |
| trackingCode demo `'GHN-ALGO-F2T-99'` | Diagram cite `:232` | `delivery.service.ts:232` `trackingCode: 'GHN-ALGO-F2T-99'` | PASS |
| GHN createOrder tại `ghn.provider.ts:47` | Diagram cite `:47` | `ghn.provider.ts:47` POST `/v2/shipping-order/create` | PASS |

**Kết luận Nhóm 8:** PASS — Dijkstra ghi rõ là fallback demo tại đúng file:line.

---

## Tổng kết T2.3-VERIFY

**Status tổng: PASS toàn bộ 8 nhóm** (không có REJECT)

| # | Nhóm | File | Kết quả |
|---|---|---|---|
| 1 | ERD — 10 entity/field/quan hệ | `erd.puml` | PASS (1 WARN minor: referenceId String vs ObjectId) |
| 2 | Deployment architecture | `deployment-architecture.puml` | PASS |
| 3 | Use case AI/ML | `usecase-aiml.puml` | PASS |
| 4 | SD ML 01/02/03 | `sd-ml-01/02/03-*.puml` | PASS |
| 5 | DDQN Safety 5 rule | `ad-ml-02-ddqn-safety.puml` | PASS |
| 6 | Order lifecycle enum | `ad-01-order-lifecycle.puml` | PASS |
| 7 | Network diagrams LSTM+DDQN | `net-forecaster-lstm.puml`, `net-ddqn-dueling.puml` | PASS |
| 8 | GHN Dijkstra fallback | `sd-06-ghn-dijkstra.puml` | PASS |

**WARN duy nhất (không escalate thành REJECT):**
- `erd.puml:133` — `notifications.referenceId : ObjectId` nhưng `notification.schema.ts:36` khai báo là `String`. Đây là optional metadata field; không ảnh hưởng ERD entity/quan hệ chính. Nếu muốn chính xác hoàn toàn thì sửa thành `referenceId : String`.

**Bằng chứng resolve tại nguồn (key citations):**
- `user.schema.ts:20-96` (users entity)
- `farm.schema.ts:50-116` (farms entity + 2dsphere index)
- `product.schema.ts:37-151` (products entity)
- `order.schema.ts:7-34,128-138` (OrderItem embedded + 7 status values)
- `notification.schema.ts:36` (referenceId = String, không phải ObjectId)
- `price-override.schema.ts:46-49` (status enum 5 giá trị)
- `app.module.ts:57` (PRICING_SIDECAR_URL default http://localhost:8000)
- `pricing-tick.cron.ts:18` (cron default "0 * * * *")
- `main.py:263,277,316` (3 endpoint /forecast, /predict, /freshness/classify)
- `main.py:128-145` (_run_forecaster)
- `safety.py:1-19` (5 rule, thứ tự 3→4→1→2→5, đúng giá trị)
- `model.py:9-15` (ForecasterConfig obs_dim=10, window=21, hidden=128, layers=2, n_cats=4, embed=8)
- `network.py:51-81` (SharedMLPDuelingQNet obs_dim=10, n_cats=4, embed=8, hidden=128, n_actions=11, Dueling V+A)
- `delivery.service.ts:99,131,232` (Dijkstra demo fallback, không phải production)

## T2.4+T2.5 — Chương 1 ✅

**File đích:** `docs/thesis/final/chuong-1-gioi-thieu.md` — GHI ĐÈ đầy đủ (xóa comment skeleton, thay bằng prose học thuật tiếng Việt).

### Citation đã dùng (mỗi câu kỹ thuật):

| Section | Citation | Nội dung |
|---|---|---|
| §1.2 MT2 | `[ref: f2t-backend/src/modules/ — 13 thư mục: admin, auth, delivery, demand-forecasting, dynamic-pricing, farms, notifications, orders, payments, posts, products, uploads, users]` | 13 module NestJS |
| §1.2 MT2 | `[ref: ledger t1.15-numbers]` | ≈79 REST endpoint |
| §1.2 MT3 | `[ref: dynamic-pricing-final/src/forecaster/model.py:18-49; ledger t1.4-forecaster-not-holt, t0.2-forecaster-arch]` | ForecasterLSTM 2 lớp, window=21, obs_dim=10 |
| §1.2 MT4 | `[ref: dynamic-pricing-final/src/rl/network.py:51-57; pricing-sidecar/safety.py:1-19; ledger t1.4-safety-5-rules]` | DDQN + Safety 5 quy tắc |
| §1.2 MT5 | `[ref: pricing-sidecar/main.py:316-318; freshnessmodels/MyFreshnessClassifier-fruit.mlmodel; ledger t1.4-freshness-coreml, t0.6]` | 2 CoreML model |
| §1.2 MT6 | `[ref: ledger t1.15-numbers]` | 54/54 test case, 21 spec |
| §1.3 | `[ref: f2t-backend/src/app.module.ts:57; ledger t1.4-one-sidecar]` | 1 sidecar port 8000, 3 endpoint |
| §1.5 ĐG1 | `[ref: f2t-backend/src/common/interceptors/dynamic-pricing.interceptor.ts:9; ledger t1.4-one-sidecar]` | Monolith+1Sidecar graceful degrade |
| §1.5 ĐG2 | `[ref: f2t-backend/src/common/interceptors/dynamic-pricing.interceptor.ts:16-18; ledger t1.4-interceptor-cron]` | DynamicPricingInterceptor + cron |
| §1.5 ĐG3 | `[ref: dynamic-pricing-final/src/forecaster/model.py:18-49; ledger t1.4-forecaster-not-holt, t0.2-forecaster-arch]` | ForecasterLSTM dual-head |
| §1.5 ĐG4 | `[ref: dynamic-pricing-final/src/rl/network.py:51-57; pricing-sidecar/safety.py:1-19; ledger t1.4-safety-5-rules, t1.4-ddqn-dims]` | DDQN SharedMLPDuelingQNet + Safety |
| §1.5 ĐG5 | `[ref: pricing-sidecar/main.py:316-318; freshnessmodels/MyFreshnessClassifier-fruit.mlmodel; ledger t1.4-freshness-coreml, t0.6]` | 2 CoreML fruit/root |
| §1.5 ĐG6 | `[ref: f2t-backend/src/modules/delivery/delivery.service.ts; ledger t1.4-interceptor-cron]` + `[ref: f2t-backend/src/modules/orders/schemas/order.schema.ts:105]` | Dijkstra fallback + Embedded Snapshot |
| §1.6 | `[ref: ledger t1.15-numbers]` | 54/54 trong chương 4 |

### Nguồn ngoài [TLTK] đã dùng:
- >60% dân số nông nghiệp → `[TLTK]`
- Mất 25-30% độ tươi sau thu hoạch (FAO) → `[TLTK]`
- TMĐT di động +18%/năm (e-Conomy SEA 2023) → `[TLTK]`

### Checklist tự kiểm tra (self-review):

| Tiêu chí | Kết quả |
|---|---|
| 6 đóng góp ĐG1–ĐG6 đúng tên + nội dung | ✅ PASS |
| §1.5 tham chiếu `diagrams/contribution-map.puml` | ✅ PASS (ghi "Hình 1.1 — diagrams/contribution-map.puml") |
| 0 từ cấm (recommender, Holt EWMA, MobileNetV2, 4-class, 14 module, 3 sidecar, obs_dim=11) | ✅ PASS |
| Mọi câu kỹ thuật có citation `[ref: ...]` hoặc `[TLTK]` | ✅ PASS |
| Số liệu canonical đúng: 13 module, 1 sidecar port 8000, 3 endpoint, 54/54 test, window=21, obs_dim=10, 11 action, Safety 5 quy tắc, 2 CoreML | ✅ PASS |
| §1.6 mô tả đúng 5 chương khớp STRUCTURE.md | ✅ PASS |
| Văn phong học thuật tiếng Việt, đoạn văn liền mạch (không bullet trừ MT/ĐG đánh số) | ✅ PASS |
| Độ dài ~5 trang (ước lượng) | ✅ PASS (~5 trang khi in A4 font 13) |
