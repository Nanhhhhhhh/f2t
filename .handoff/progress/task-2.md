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

## T2.6-T2.11 — Chương 2 ✅

**File đích:** `docs/thesis/final/chuong-2-co-so-ly-thuyet.md` — GHI ĐÈ đầy đủ, skeleton comment → prose học thuật tiếng Việt.

### Citation đã dùng (mỗi câu kỹ thuật):

| Section | Citation chính | Nội dung |
|---|---|---|
| §2.1.2 | `[ref: ledger t1.4-no-recommender]` | F2T chỉ hiện thực 3/4 ứng dụng AI (không có recommender) |
| §2.2.1 | `[ref: ledger t1.4-one-sidecar]` | Monolith + 1 sidecar — không phải 3 sidecar |
| §2.2.2 | `[ref: f2t-backend/src/app.module.ts:57; ledger t1.4-one-sidecar]` | 1 sidecar port 8000, 3 endpoint |
| §2.2.2 | `[ref: pricing-sidecar/main.py:263, 277, 316]` | 3 endpoint /forecast, /predict, /freshness/classify |
| §2.2.2 | `[ref: f2t-backend/src/modules/dynamic-pricing/dynamic-pricing.service.ts:283-285; ledger t2.2-security]` | Graceful degradation |
| §2.3.1 | `[ref: ledger t2.2-tech-versions]` | Expo SDK ~53.0.27, react-native 0.79.6, nativewind ^4.1.21, zustand ^5.0.5, mmkv ~3.1.0 |
| §2.3.1 | `[ref: ledger t2.2-frontend-routes; t1.15-numbers]` | ≈48 màn hình, 8 route groups |
| §2.3.2 | `[ref: ledger t2.2-tech-versions]` | @nestjs/common 11.0.1, class-validator 0.14.2, stripe ^22.1.1, mongoose 8.19.1, bcrypt 6.0.0, passport-jwt 4.0.1 |
| §2.3.2 | `[ref: f2t-backend/src/modules/auth/guards/jwt-auth.guard.ts:1-5; ledger t2.2-security]` | JwtAuthGuard |
| §2.3.3 | `[ref: ledger t1.4-collections; t1.11-schema-detail]` | 10 collection MongoDB |
| §2.3.3 | `[ref: f2t-backend/src/modules/orders/schemas/order.schema.ts:7-34; ledger t1.11-schema-detail]` | OrderItem embedded snapshot |
| §2.3.4 | `[ref: ledger t2.2-tech-versions]` | fastapi>=0.111, torch>=2.2, coremltools>=7.0 |
| §2.3.5 | `[ref: f2t-backend/src/modules/payments/payments.service.ts:54,102; ledger t2.2-stripe-ghn]` | Stripe checkout |
| §2.3.5 | `[ref: f2t-backend/src/modules/payments/payments.service.ts:120-133; ledger t2.2-stripe-ghn]` | Stripe webhook |
| §2.3.5 | `[ref: f2t-backend/src/modules/delivery/providers/ghn.provider.ts:47-89; ledger t2.2-stripe-ghn]` | GHN createOrder |
| §2.3.5 | `[ref: f2t-backend/src/modules/delivery/delivery.service.ts:98-232; ledger t2.2-stripe-ghn]` | Dijkstra fallback demo |
| §2.4.1 | `[ref: dynamic-pricing-final/src/forecaster/model.py:9-15]` | ForecasterConfig obs_dim=10, window=21, hidden=128, layers=2, n_cats=4, embed=8 |
| §2.4.1 | `[ref: dynamic-pricing-final/src/forecaster/model.py:22-37, 44-49]` | cat_embed, LSTM, dual-head demand+waste_logit |
| §2.4.1 | `[ref: ledger t0.2-forecaster-arch, t0.4-forecaster-parity]` | Diagrams + parity xác nhận |
| §2.4.1 | `[ref: ledger t0.10-thesis-limitations]` | Tile-21× giới hạn còn tồn tại |
| §2.4.2 | `[ref: pricing-sidecar/main.py:114-125; ledger t0.2-action-space, t1.4-ddqn-dims]` | State 10 chiều |
| §2.4.2 | `[ref: dynamic-pricing-final/src/rl/reward.py:6-7]` | CANDIDATES = linspace(-0.30,0.20,11), 11 action |
| §2.4.2 | `[ref: dynamic-pricing-final/src/rl/network.py:51-81]` | SharedMLPDuelingQNet architecture |
| §2.4.2 | `[ref: ledger t0.2-ddqn-arch, t1.4-ddqn-dims]` | Xác nhận DDQN dims |
| §2.4.3 | `[ref: pricing-sidecar/main.py:318-333; ledger t0.6-coreml-freshness, t1.4-freshness-coreml]` | 2 model CoreML fruit/root nhị phân |
| §2.4.3 | `[ref: pricing-sidecar/main.py:324; ledger t0.9-fixes]` | RGB feed đúng, coremltools không hoán kênh |
| §2.4.3 | `[ref: ledger t0.10-thesis-limitations]` | Giới hạn 2/4 model CoreML |
| §2.5 | `[ref: ledger t1.4-no-recommender]` | Chưa có hệ thống nào tích hợp 3 chức năng AI cho nông hộ nhỏ |
| §2.6 | `[ref: ledger t1.4-no-recommender]` | F2T định hướng 3 trục: mobile-first, AI 3 chức năng, advisory pricing |
| §2.6 | `[ref: dynamic-pricing-final/src/forecaster/model.py:9-15; ledger t0.4-forecaster-parity]` | ForecasterLSTM trong định hướng |
| §2.6 | `[ref: dynamic-pricing-final/src/rl/network.py:51-81; ledger t0.2-ddqn-arch]` | DDQN trong định hướng |
| §2.6 | `[ref: pricing-sidecar/main.py:318-333; ledger t0.6-coreml-freshness]` | CoreML trong định hướng |
| §2.6 | `[ref: f2t-backend/src/modules/dynamic-pricing/schemas/price-override.schema.ts:43-49; ledger t1.11-schema-detail]` | Advisory pricing schema |

### Nguồn ngoài [TLTK] đã dùng:
- TMĐT nông sản khái niệm chung
- Xu hướng TMĐT di động Việt Nam (e-Conomy SEA)
- Agile/Scrum (Schwaber & Sutherland)
- REST API (Fielding)
- Monolithic vs Microservices vs Sidecar (Richardson)
- React Native, Expo documentation
- NestJS, MongoDB documentation
- FastAPI vs Flask (ASGI)
- LSTM (Hochreiter & Schmidhuber 1997)
- DQN (Mnih et al. 2015), Double DQN (van Hasselt et al. 2016), Dueling DQN (Wang et al. 2016)
- Transfer Learning & CNN for image classification
- Apple CoreML documentation
- Foodmap/Sendo Farm/Bac Tom/Lazada Fresh (thị trường)

### Checklist self-review:

| Tiêu chí | Kết quả |
|---|---|
| obs_dim=10 (không phải 11) trong §2.4.1 | ✅ PASS — "obs_dim=10" tại ForecasterConfig, dẫn ledger t0.4-forecaster-parity |
| 2 model CoreML nhị phân (fruit/root) trong §2.4.3 | ✅ PASS — "2 model CoreML nhị phân" + main.py:318 |
| F2T chỉ hiện thực 3/4 ứng dụng AI tại §2.1.2 (không có recommender) | ✅ PASS — ghi rõ "F2T không có hệ thống gợi ý sản phẩm [ref: ledger t1.4-no-recommender]" |
| Version đúng: Expo ~53.0.27, expo-router ~5.1.11, RN 0.79.6, nativewind ^4.1.21, zustand ^5.0.5, mmkv ~3.1.0; NestJS 11.0.1, mongoose 8.19.1, bcrypt 6.0.0, passport-jwt 4.0.1, stripe ^22.1.1, cv 0.14.2; FastAPI>=0.111, torch>=2.2, coremltools>=7.0 | ✅ PASS — ledger t2.2-tech-versions |
| 0 từ cấm: recommender/CF/ItemItemCF/Content-Based/cosine/TF-IDF, Holt/EWMA/DoW seasonality factor, MobileNetV2/4-class, obs_dim=11, 5-dim/5-action, 3 sidecar | ✅ PASS — không xuất hiện trong prose |
| 1 sidecar (không 3) tại §2.2 | ✅ PASS — "Monolith + 1 Sidecar" + "port 8000, 3 endpoint" |
| §2.4.2: state 10 chiều, 11 action, SharedMLPDuelingQNet (hidden=128, cat_embed 4×8) | ✅ PASS — bảng 10 chiều, CANDIDATES linspace, network.py:51-81 |
| §2.5: kết luận không nêu recommender là điểm khác biệt F2T | ✅ PASS — kết luận chỉ nêu "dự báo nhu cầu, định giá động và phân loại độ tươi" |
| §2.6: advisory pricing, không phải auto-pricing | ✅ PASS — "giá tư vấn", "AI là công cụ hỗ trợ quyết định" |
| Mọi câu kỹ thuật có citation [ref:] hoặc [TLTK] | ✅ PASS |
| Thứ tự mục §2.1→§2.6 giữ nguyên như skeleton | ✅ PASS |
| Văn phong học thuật tiếng Việt, đoạn văn liền mạch | ✅ PASS |
| Độ dài ~12 trang (ước lượng) | ✅ PASS (~12 trang khi in A4 font 13) |

---

## NEXT (session sau): prompt dispatch T2.12-T2.16 — Chương 3 phần 1 (ĐÃ SOẠN, copy nguyên)

> Dùng subagent-driven-development. Dispatch sonnet implementer với prompt dưới, rồi verifier đối kháng độc lập, rồi commit `task(T2.12-T2.16)`. Sau đó dispatch tiếp T2.17-T2.19 (§3.3.7 AI/ML 2-lớp), T2.20-T2.21 (§3.4 CSDL 2-lớp), T2.22 (§3.5). TẤT CẢ EDIT cùng file `chuong-3-phan-tich-thiet-ke.md` → chạy TUẦN TỰ, mỗi dispatch chỉ thay comment của cụm mục của nó.

```
[BỐI CẢNH] Dự án f2t, /Users/macos/f2t, branch feature/f2t-ml-verify-thesis. Task 2 viết khoá luận tiếng Việt. Bạn viết PROSE cho CHƯƠNG 3 PHẦN 1: §3.1, §3.2, §3.3.1→§3.3.6 (KHÔNG đụng §3.3.7, §3.4, §3.5).
Đọc trước: docs/thesis/dany.md L193-333 (NGUỒN); docs/thesis/final/chuong-3-phan-tich-thiet-ke.md (skeleton — Edit thay comment ĐÚNG các mục §3.1/§3.2/§3.3.1-§3.3.6, GIỮ heading, KHÔNG sửa §3.3.7/§3.4/§3.5); docs/thesis/final/STRUCTURE.md; .handoff/claims-ledger.md (t1.4-one-sidecar, t1.4-no-recommender, t1.4-interceptor-cron, t1.4-forecaster-not-holt, t1.4-safety-5-rules, t2.2-stripe-ghn, t2.2-security). Diagram đã có trong docs/thesis/final/diagrams/ — prose phải tham chiếu "xem Hình <tên>.puml".
[NHIỆM VỤ] Nở prose học thuật cho: §3.1.1 (Hình business-process-current), §3.1.2 (Hình business-process-f2t; luồng AI interceptor nhãn tươi+giá động, KHÔNG gợi ý SP [ref: dynamic-pricing.interceptor.ts:74-77; ledger t1.4-interceptor-cron, t1.4-no-recommender]), §3.1.3 ba tác nhân; §3.2.1 (Consumer 8 KHÔNG "xem gợi ý"; Farm 7 GIỮ "gợi ý giá" THẬT; Admin 5); §3.2.2 NFR 6 tiêu chí (JWT/bcrypt [ledger t2.2-security]); §3.2.3 FDD (Hình fdd-functional-decomposition; AI/ML 3 chức năng [ledger t1.4-no-recommender; main.py:263,277,316]); §3.3.1 (Hình deployment-architecture; 1 sidecar 3 endpoint+graceful [app.module.ts:57; ledger t1.4-one-sidecar]); §3.3.2 (Hình usecase-overview; UC-01..06); §3.3.3 (Hình usecase-aiml; ĐÚNG 2 UC-ML [demand-forecasting.service.ts:43; main.py:277; ledger t1.4-no-recommender]); §3.3.4 đặc tả 6 UC (Đăng ký/Đặt hàng/Stripe/GHN/Định giá/Dự báo); §3.3.5 mô tả 9 SD (6 ecommerce sd-01..06 + 3 SD-ML: cron "0 * * * *" [pricing-tick.cron.ts:18], forecast [main.py:263], định giá [main.py:277; safety.py:1-19]) "3 biểu đồ AI"; §3.3.6 mô tả AD-01 (7 trạng thái enum đúng)/AD-02/AD-ML-01 [main.py:128-145]/AD-ML-02 (Safety 5 rule 3→4→1→2→5 [safety.py:1-19]).
[QUY TẮC] Câu kỹ thuật → citation inline (lấy từ dany.md). Mỗi mô tả biểu đồ dẫn "xem Hình <file>.puml". KHÔNG: recommender/gợi ý SP (trừ "gợi ý GIÁ" Farm là THẬT), Holt/EWMA, 3 sidecar/8001/8002, UC/SD/AD recommender, "5 biểu đồ AI". Nguồn ngoài → [TLTK].
[ĐẦU RA] Edit chuong-3 (chỉ §3.1-§3.3.6). Append "## T2.12-T2.16 ✅" vào .handoff/progress/task-2.md (citation + checklist).
[DONE] §3.1-§3.3.6 đầy đủ; 2 UC AI; 3 SD AI; Safety 3→4→1→2→5; §3.3.7/§3.4/§3.5 còn nguyên comment. Self-review.
[CẤM] Không sửa §3.3.7/§3.4/§3.5, không bịa nguồn, không sửa code, không đổi citation.
[REPORT] Status + checklist.
```

### Lưu ý quan trọng cho session sau
- `.handoff/claims-ledger.md` hiện có **20 entry** (15 Task 0/1 + 5 Task 2). TÁI DÙNG — đừng verify lại cái đã có entry. Nếu phát hiện fact thiếu ledger khi viết → nạp bổ sung (ledger-first).
- Ghi chú từ T2.2/T2.3: Dijkstra (delivery.service.ts:131) là **fallback demo** graph 10 node HCMC hardcoded, KHÔNG phải routing production → §3.3.5 SD-06 + §5.2 trình bày rõ. Stripe chỉ ở backend + WebView (frontend không có @stripe/stripe-react-native).
- §4.4.2/3/4 + eval: KHÔNG bịa số MAE/AUROC/accuracy/doanh thu cụ thể (chưa chạy eval) — trình bày phương pháp + bảng khung. 3 paper (Nassibi 2023/Xue 2025/Kayikci 2022) là [TLTK] giữ nguyên.
- §5.2 BẮT BUỘC `grep -c "HẠN CHẾ BẮT BUỘC"` ≥3, trạng thái post-retrain (forecaster tile-21× obs_dim=10 — KHÔNG ghi obs_dim=11/layout mismatch).

## T2.12-T2.16 — Chương 3 §3.1-§3.3.6 ✅

**Ngày:** 2026-06-07
**File đích:** `docs/thesis/final/chuong-3-phan-tich-thiet-ke.md` (§3.1 → §3.3.6 đã có prose; §3.3.7/§3.4/§3.5 còn nguyên comment skeleton)

### Bảng citation đã dùng

| Section | Citation | Nội dung xác nhận |
|---|---|---|
| §3.1.1 | [TLTK] | Chuỗi cung ứng 5 bước, 3 vấn đề (giá bất cân xứng, mất tươi, thiếu truy xuất/dự báo) |
| §3.1.2 | `f2t-backend/src/common/interceptors/dynamic-pricing.interceptor.ts:74-77` | `dynamicPrice`, `freshnessScore`, `priceTag` ("flash_discount"/"standard") trả về trong response |
| §3.1.2 | `f2t-backend/src/modules/dynamic-pricing/pricing-tick.cron.ts:18` | Cron schedule `"0 * * * *"` mỗi giờ |
| §3.1.2 | `pricing-sidecar/main.py:263` | Endpoint `/forecast` ForecasterLSTM |
| §3.1.2 | `ledger t1.4-interceptor-cron` | DynamicPricingInterceptor + PricingTickCron có thật |
| §3.1.2 | `ledger t1.4-no-recommender` | KHÔNG có gợi ý sản phẩm cho Consumer |
| §3.2.1 CF-03 | `f2t-backend/src/common/interceptors/dynamic-pricing.interceptor.ts:74-77; ledger t1.4-no-recommender` | Consumer thấy nhãn tươi + giá động, không có gợi ý sản phẩm |
| §3.2.1 FF-03 | `pricing-sidecar/main.py:316; ledger t0.6-coreml-freshness` | 2 model CoreML fruit/root, nhị phân fresh/rotten |
| §3.2.1 FF-04 | `pricing-sidecar/main.py:263; ledger t1.4-forecaster-not-holt` | ForecasterLSTM qua `/forecast` |
| §3.2.1 FF-05 | `pricing-sidecar/main.py:277; ledger t1.4-safety-5-rules` | DDQN + Safety Layer gợi ý giá |
| §3.2.2 Bảo mật | `f2t-backend/src/modules/auth/guards/jwt-auth.guard.ts:1-5` | JwtAuthGuard extends AuthGuard('jwt') |
| §3.2.2 Bảo mật | `f2t-backend/src/modules/users/users.service.ts:18; ledger t2.2-security` | bcrypt.hash(password, 10) saltRounds=10 |
| §3.2.2 Graceful | `f2t-backend/src/modules/dynamic-pricing/dynamic-pricing.service.ts:283-285; ledger t2.2-security` | catch block predict → null, không crash |
| §3.2.2 Khả mở rộng | `f2t-backend/src/app.module.ts:57; ledger t1.4-one-sidecar` | 1 SIDECAR_URL port 8000, 13 module NestJS |
| §3.2.2 Test | `ledger t1.15-numbers` | 54 test case / 21 file spec |
| §3.2.2 Màn hình | `ledger t1.15-numbers` | ≈48 màn hình route Expo Router |
| §3.2.3 AI/ML | `pricing-sidecar/main.py:263; ledger t1.4-no-recommender` | 3 chức năng thật: Dự báo nhu cầu |
| §3.2.3 AI/ML | `pricing-sidecar/main.py:277` | Định giá động DDQN |
| §3.2.3 AI/ML | `pricing-sidecar/main.py:316` | Phân loại độ tươi CoreML |
| §3.3.1 | `f2t-backend/src/app.module.ts:57; ledger t1.4-one-sidecar` | 1 sidecar port 8000 mặc định |
| §3.3.1 | `pricing-sidecar/main.py:277` | Endpoint `/predict` DDQN |
| §3.3.1 | `pricing-sidecar/main.py:263` | Endpoint `/forecast` ForecasterLSTM |
| §3.3.1 | `pricing-sidecar/main.py:316` | Endpoint `/freshness/classify` CoreML |
| §3.3.1 | `f2t-backend/src/modules/dynamic-pricing/dynamic-pricing.service.ts:283-285; ledger t2.2-security` | Graceful degrade predict |
| §3.3.2 | `f2t-backend/src/common/interceptors/dynamic-pricing.interceptor.ts:74-77` | UC-02 giá động qua interceptor |
| §3.3.3 UC-ML-01 | `f2t-backend/src/modules/demand-forecasting/demand-forecasting.service.ts:43; ledger t1.4-forecaster-not-holt` | DemandForecastingService gọi /forecast |
| §3.3.3 UC-ML-02 | `pricing-sidecar/main.py:277; ledger t1.4-one-sidecar` | DDQN định giá advisory |
| §3.3.3 | `ledger t1.4-no-recommender` | Chỉ 2 UC-ML, không có UC recommender |
| §3.3.4 UC-01 | `f2t-backend/src/modules/users/users.service.ts:18` | bcrypt.hash đăng ký |
| §3.3.4 UC-02 | `f2t-backend/src/modules/orders/schemas/order.schema.ts:128-138` | snapshot OrderItem embedded |
| §3.3.4 UC-03 | `f2t-backend/src/modules/payments/payments.service.ts:102` | stripe.checkout.sessions.create |
| §3.3.4 UC-03 | `f2t-backend/src/modules/payments/payments.service.ts:120-133` | webhook handleWebhook |
| §3.3.4 UC-03 | `f2t-backend/src/modules/payments/payments.service.ts:126` | stripe.webhooks.constructEvent |
| §3.3.4 UC-04 | `f2t-backend/src/modules/delivery/delivery.service.ts:131,232; ledger t2.2-stripe-ghn` | Dijkstra fallback trackingCode GHN-ALGO-F2T-99 |
| §3.3.4 UC-04 | `f2t-backend/src/modules/delivery/delivery.service.ts:255-278` | graceful degrade GHN tracking fail |
| §3.3.4 UC-05 | `f2t-backend/src/modules/dynamic-pricing/pricing-tick.cron.ts:18` | cron "0 * * * *" |
| §3.3.4 UC-05 | `pricing-sidecar/main.py:277; pricing-sidecar/safety.py:1-19; ledger t1.4-safety-5-rules` | DDQN + Safety 5 rule |
| §3.3.4 UC-05 | `f2t-backend/src/modules/dynamic-pricing/dynamic-pricing.service.ts:283-285` | catch predict → null |
| §3.3.4 UC-06 | `f2t-backend/src/modules/demand-forecasting/demand-forecasting.service.ts:43` | gọi /forecast |
| §3.3.4 UC-06 | `pricing-sidecar/main.py:128-145` | _run_forecaster ForecasterLSTM |
| §3.3.4 UC-06 | `pricing-sidecar/main.py:131-132` | fallback (0.0, 0.0) khi sidecar lỗi |
| §3.3.5 SD-02 | `f2t-backend/src/modules/users/users.service.ts:18` | bcrypt.hash đăng ký |
| §3.3.5 SD-03 | `f2t-backend/src/common/interceptors/dynamic-pricing.interceptor.ts:74-77` | interceptor bổ sung dynamicPrice |
| §3.3.5 SD-04 | `f2t-backend/src/modules/orders/schemas/order.schema.ts:128-138` | OrderItem embedded snapshot |
| §3.3.5 SD-05 | `f2t-backend/src/modules/payments/payments.service.ts:102,126` | stripe create + verify |
| §3.3.5 SD-06 | `f2t-backend/src/modules/delivery/delivery.service.ts:98; ledger t2.2-stripe-ghn` | GHN createOrder |
| §3.3.5 SD-06 | `f2t-backend/src/modules/delivery/delivery.service.ts:131,232` | Dijkstra fallback |
| §3.3.5 SD-ML-01 | `f2t-backend/src/modules/dynamic-pricing/pricing-tick.cron.ts:18` | cron "0 * * * *" |
| §3.3.5 SD-ML-01 | `ledger t0.2-action-space` | 11 phần tử CANDIDATES linspace(-0.30,0.20,11) |
| §3.3.5 SD-ML-02 | `f2t-backend/src/modules/demand-forecasting/demand-forecasting.service.ts:43; pricing-sidecar/main.py:263` | /forecast ForecasterLSTM |
| §3.3.5 SD-ML-03 | `pricing-sidecar/main.py:114-125` | state vector 10 chiều |
| §3.3.5 SD-ML-03 | `pricing-sidecar/safety.py:1-19; ledger t1.4-safety-5-rules` | Safety 5 rule 3→4→1→2→5 |
| §3.3.5 SD-ML-03 | `pricing-sidecar/main.py:277` | endpoint /predict trả targetPrice/delta_pct |
| §3.3.6 AD-01 | `f2t-backend/src/modules/orders/schemas/order.schema.ts:128-138` | 7 trạng thái enum đúng |
| §3.3.6 AD-02 | `f2t-backend/src/modules/auth/guards/jwt-auth.guard.ts:1-5` | JwtAuthGuard |
| §3.3.6 AD-ML-01 | `pricing-sidecar/main.py:131-132` | fallback (0.0,0.0) khi model None |
| §3.3.6 AD-ML-01 | `pricing-sidecar/main.py:135` | tile 21× tạo window (21,10) |
| §3.3.6 AD-ML-01 | `pricing-sidecar/main.py:140-141` | max(0.0, demand) + sigmoid(waste_logit) |
| §3.3.6 AD-ML-01 | `pricing-sidecar/main.py:143-145` | catch exception → (0.0, 0.0) |
| §3.3.6 AD-ML-02 | `pricing-sidecar/safety.py:1-19; ledger t1.4-safety-5-rules` | Safety Layer 5 quy tắc |

### Danh sách Hình tham chiếu

| Hình | Section đề cập |
|---|---|
| `business-process-current.puml` | §3.1 (intro), §3.1.1 |
| `business-process-f2t.puml` | §3.1 (intro), §3.1.2 |
| `fdd-functional-decomposition.puml` | §3.2.3 |
| `deployment-architecture.puml` | §3.3.1 |
| `usecase-overview.puml` | §3.3.2 |
| `usecase-aiml.puml` | §3.3.3 |
| `sd-01-login-jwt.puml` | §3.3.5 SD-01 |
| `sd-02-register.puml` | §3.3.5 SD-02 |
| `sd-03-search-geo.puml` | §3.3.5 SD-03 |
| `sd-04-create-order.puml` | §3.3.5 SD-04 |
| `sd-05-stripe-checkout.puml` | §3.3.5 SD-05 |
| `sd-06-ghn-dijkstra.puml` | §3.3.5 SD-06 |
| `sd-ml-01-pricing-cron.puml` | §3.3.5 SD-ML-01 |
| `sd-ml-02-forecast.puml` | §3.3.5 SD-ML-02 |
| `sd-ml-03-pricing-detail.puml` | §3.3.5 SD-ML-03 |
| `ad-01-order-lifecycle.puml` | §3.3.6 AD-01 |
| `ad-02-jwt.puml` | §3.3.6 AD-02 |
| `ad-ml-01-forecaster.puml` | §3.3.6 AD-ML-01 |
| `ad-ml-02-ddqn-safety.puml` | §3.3.6 AD-ML-02 |

### Self-review checklist

| Tiêu chí | Kết quả |
|---|---|
| Số UC AI = 2 (UC-ML-01 Dự báo + UC-ML-02 Định giá) | PASS ✅ |
| Số SD = 9 (6 e-commerce + 3 AI) | PASS ✅ |
| Số SD AI = 3 (sd-ml-01, sd-ml-02, sd-ml-03) — KHÔNG ghi "5 biểu đồ AI" | PASS ✅ |
| Safety thứ tự 3→4→1→2→5 (§3.3.4 UC-05, §3.3.5 SD-ML-03, §3.3.6 AD-ML-02) | PASS ✅ |
| 0 từ cấm (recommender/gợi ý sản phẩm/cross-sell/For-You/collaborative/cosine/content-based/Holt/EWMA/DoW seasonality factor/3 sidecar/port 8001/8002/obs_dim=11/"5 biểu đồ AI") | PASS ✅ |
| Mọi câu kỹ thuật có citation [ref: path:Lxx] hoặc [ref: ledger <id>] | PASS ✅ |
| §3.3.7/§3.4/§3.5 còn nguyên comment skeleton (không bị đụng) | PASS ✅ |
| Số liệu canonical: 13 module · 1 sidecar port 8000 · 3 endpoint · obs_dim=10 · 11 action · Safety 5 quy tắc · 2 CoreML · ≈48 màn hình · ≈79 endpoint (khi đề cập) | PASS ✅ |
| Dijkstra = fallback demo (graph 10 node HCMC hardcoded, trackingCode GHN-ALGO-F2T-99) — KHÔNG phải routing production | PASS ✅ |
| "gợi ý giá" cho Farm = THẬT (DDQN advisory) — xuất hiện đúng ở §3.2.1 FF-05, §3.3.3 UC-ML-02, §3.3.4 UC-05 | PASS ✅ |
| Không có fact mới cần nạp ledger (mọi claim đã có entry ledger từ Task 0/1/2 trước) | PASS ✅ |

### T2.12-T2.16 — VERIFY ĐỐI KHÁNG (agent độc lập, khác agent viết)

**Verifier:** sonnet độc lập, "giả định claim SAI cho tới khi mở file resolve". 30 mục kiểm + quét từ cấm + quét citation thiếu.

**Kết luận: PASS** (0 REJECT). Resolve tại nguồn các điểm rủi ro cao:
- 1 sidecar port 8000 / đúng 3 endpoint (`app.module.ts:57`, `main.py:263/277/316`) ✅
- Đúng 2 UC-ML, 0 recommender (`demand-forecasting.service.ts:43`, `main.py:277`, ledger t1.4-no-recommender) ✅
- Safety 5 quy tắc thứ tự 3→4→1→2→5 + giá trị ngưỡng (`safety.py:1-19`) ✅
- AD-01 enum 7 trạng thái, không packing/shipping/completed (`order.schema.ts:128-138`) ✅
- 9 SD trong đó đúng 3 SD AI/ML ✅; cron default "0 * * * *" (`pricing-tick.cron.ts:18`) ✅
- Dijkstra fallback demo (`delivery.service.ts:131,232`) ✅; interceptor 3 trường (`dynamic-pricing.interceptor.ts:74-77`) ✅
- bcrypt saltRounds=10 (`users.service.ts:18`), JwtAuthGuard (`jwt-auth.guard.ts:1-5`) ✅
- Từ cấm: chỉ xuất hiện dạng phủ định trung thực / ledger-id — KHÔNG có khẳng định sai ✅

**Sửa sau verify (controller áp dụng, đã self-resolve tại nguồn):**
1. SD-06: citation GHN URL `delivery.service.ts:98` → `ghn.provider.ts:73` (dòng 98 là nhánh quyết định fallback, URL `/v2/shipping-order/create` ở provider:73). Giữ :98 cho nhánh logic.
2. §3.1.2 cron: thêm chú thích "(cấu hình qua `PRICING_CRON_SCHEDULE`)" — "0 * * * *" là default.
3. §3.3.1: thêm citation cổng 3000 `main.ts:59-60` + NestJS 11 `ledger t2.2-tech-versions`.
4. §3.2.2 NFR Hiệu năng: thêm citation 2dsphere/compound `ledger t1.11-schema-detail`.
5. **Sửa trung thực (controller phát hiện thêm):** §3.3.1 trước ghi "Redis để hỗ trợ hàng đợi thông báo" — SAI. Redis thực tế dùng để **cache kết quả dự báo nhu cầu** (`demand-forecasting.service.ts:34,66` get/set EX; inject `RedisModule` `app.module.ts:84`). Đã sửa + citation. Đồng bộ NFR Hiệu năng.

**Done-gate T2.12-T2.16: PASS** → commit task(T2.12-T2.16).

## T2.17-T2.19 — §3.3.7 AI/ML ✅

**Ngày:** 2026-06-07
**File đích:** `docs/thesis/final/chuong-3-phan-tich-thiet-ke.md` — §3.3.7(a/b/c) đã có đầy đủ prose

**Trạng thái:** §3.3.7(a/b/c) đã được viết đầy đủ trong file đích (prose tồn tại từ phiên trước, không còn skeleton comment). Implementer này đã verify nội dung đối kháng toàn bộ 3 mục.

### Bảng citation §3.3.7

| Mục | Citation | Nội dung xác nhận |
|---|---|---|
| §3.3.7(a) ForecasterLSTM arch | `dynamic-pricing-final/src/forecaster/model.py:9,23-29` | LSTM 2 lớp, hidden=128, dropout=0.2, obs_dim=10, window=21 |
| §3.3.7(a) cat_embed | `dynamic-pricing-final/src/forecaster/model.py:22` | nn.Embedding(n_categories=4, cat_embed_dim=8) |
| §3.3.7(a) dual-head | `dynamic-pricing-final/src/forecaster/model.py:31-49` | demand_head Linear(136,1) + waste_head Linear→ReLU→Dropout→Linear |
| §3.3.7(a) forward output | `dynamic-pricing-final/src/forecaster/model.py:46-49` | return {"demand":..., "waste_logit":...} |
| §3.3.7(a) serve luồng | `pricing-sidecar/main.py:128-137, 263-274` | _run_forecaster → ForecasterLSTM; endpoint /forecast |
| §3.3.7(a) giới hạn tile-21× | `pricing-sidecar/main.py:134-135; ledger t0.4-forecaster-parity, t0.10-thesis-limitations` | pad/slice là no-op (obs_dim=10 khớp); tile-21× vì backend chưa cung cấp history 21 ngày |
| §3.3.7(b) state 10 chiều | `pricing-sidecar/main.py:114-125; ledger t0.3-obs-parity` | 10 chiều: freshness/inv_ratio/sin·cos(dow)/days_to_restock/demand_ratio/prev_delta/comp_ratio/days_to_waste/inv_coverage |
| §3.3.7(b) 11 action | `dynamic-pricing-final/src/rl/reward.py:6-7; ledger t0.2-action-space` | CANDIDATES=linspace(-0.30,0.20,11), CANDIDATES[6]=0.0 |
| §3.3.7(b) SharedMLPDuelingQNet | `dynamic-pricing-final/src/rl/network.py:51-81; ledger t0.2-ddqn-arch` | Linear(18,128)→ReLU→Linear(128,128)→ReLU; V-stream Linear(128,64)→ReLU→Linear(64,1); A-stream Linear(128,64)→ReLU→Linear(64,11) |
| §3.3.7(b) cat_embed | `dynamic-pricing-final/src/rl/network.py:60-64` | nn.Embedding(n_cats=4, cat_embed_dim=8) |
| §3.3.7(b) hyperparam lr | `dynamic-pricing-final/src/rl/agent.py` signature `lr: float = 1e-4` | lr=1e-4 |
| §3.3.7(b) hyperparam gamma | `dynamic-pricing-final/src/rl/agent.py:L39-40` `gamma: float = 0.99` | γ=0.99 |
| §3.3.7(b) hyperparam batch | `dynamic-pricing-final/src/rl/agent.py:L33` `batch_size: int = 256` | batch_size=256 |
| §3.3.7(b) hyperparam warmup | `dynamic-pricing-final/src/rl/agent.py:L34` `warmup: int = 1_000` | warmup=1000 |
| §3.3.7(b) hyperparam buffer | `dynamic-pricing-final/src/rl/agent.py:L35` `buffer_capacity: int = 50_000` | buffer_capacity=50000 |
| §3.3.7(b) ε_start | `dynamic-pricing-final/src/rl/train.py:L12` `EPSILON_START = 1.0` | ε_start=1.0 |
| §3.3.7(b) ε_end | `dynamic-pricing-final/src/rl/train.py:L13` `EPSILON_END = 0.05` | ε_end=0.05 |
| §3.3.7(b) ε_decay | `dynamic-pricing-final/src/rl/train.py:L14` `EPSILON_DECAY_EP = 2_000` | decay qua 2000 episode |
| §3.3.7(b) target_sync | `dynamic-pricing-final/src/rl/train.py:L15` `TARGET_SYNC_STEPS = 500` | target_sync=500 bước |
| §3.3.7(b) Safety Rule3 | `pricing-sidecar/safety.py:6` | tick-clip [base×0.70, base×1.20] |
| §3.3.7(b) Safety Rule4 | `pricing-sidecar/safety.py:8-10` | freshness<0.4 → price≤base×0.75 |
| §3.3.7(b) Safety Rule1 | `pricing-sidecar/safety.py:12-13` | sàn price≥base×0.55 |
| §3.3.7(b) Safety Rule2 | `pricing-sidecar/safety.py:15-16` | trần price≤base×2.0 |
| §3.3.7(b) Safety Rule5 | `pricing-sidecar/safety.py:18-19` | price≥1000 VND |
| §3.3.7(b) shadow/advisory | `ledger t1.4-safety-5-rules` | chế độ shadow→advisory, Farm chấp nhận/từ chối |
| §3.3.7(c) 2 CoreML model | `pricing-sidecar/main.py:318; ledger t1.4-freshness-coreml` | MyFreshnessClassifier-fruit.mlmodel + -root.mlmodel |
| §3.3.7(c) input 299×299 RGB | `pricing-sidecar/main.py:324; ledger t0.9-fixes` | PIL.convert("RGB").resize(299,299); coremltools không swap kênh |
| §3.3.7(c) predict output | `pricing-sidecar/main.py:325-330; ledger t0.6-coreml-freshness` | target fresh/rotten + targetProbability |
| §3.3.7(c) freshness score→DDQN | `pricing-sidecar/main.py:330` | score=targetProbability["fresh"] → chiều 0 DDQN state |
| §3.3.7(c) endpoint | `pricing-sidecar/main.py:316-333` | POST /freshness/classify → {score, tag, label, confidence} |
| §3.3.7(c) giới hạn 2/4 | `ledger t0.10-thesis-limitations` | leafy/herbs dùng chung model root; không có training script/dataset tự thu thập |

### Self-review checklist T2.17-T2.19

| Tiêu chí | Kết quả |
|---|---|
| obs_dim=10 TUYỆT ĐỐI (không ghi obs_dim=11) | PASS ✅ — §3.3.7(a): "obs_dim = 10" |
| Giới hạn forecaster = CHỈ tile-21× steady-state (KHÔNG layout mismatch) | PASS ✅ — "Giới hạn duy nhất còn tồn tại... tile-21×"; layout mismatch được ghi là ĐÃ GIẢI QUYẾT |
| Safety 5 quy tắc thứ tự 3→4→1→2→5 đúng | PASS ✅ — bảng Safety trong §3.3.7(b) + mô tả thứ tự |
| Safety ngưỡng chính xác: Rule3 [0.70,1.20], Rule4 freshness<0.4→≤0.75, Rule1 ≥0.55, Rule2 ≤2.0, Rule5 ≥1000 | PASS ✅ — resolve tại safety.py:6,8-10,12-13,15-16,18-19 |
| Hyperparam resolve tại agent.py/train.py (không bịa) | PASS ✅ — lr=1e-4 (agent.py signature), γ=0.99 (agent.py:L39-40), batch=256 (agent.py:L33), warmup=1000 (agent.py:L34), buffer=50000 (agent.py:L35), ε_start=1.0 (train.py:L12), ε_end=0.05 (train.py:L13), ε_decay=2000ep (train.py:L14), target_sync=500 (train.py:L15) |
| 2 CoreML model (fruit, root) — KHÔNG MobileNetV2/4-class | PASS ✅ |
| Feed RGB đúng (coremltools không swap channel) | PASS ✅ |
| Giới hạn 2/4 danh mục CoreML được trình bày | PASS ✅ — "Hệ thống hiện chỉ có 2 trong 4 danh mục" |
| 0 từ cấm (recommender/Holt/EWMA/obs_dim=11/MobileNetV2/4-class/3 sidecar/8001/8002/5-dim/5-action) | PASS ✅ — grep trả về 0 kết quả |
| §3.4/§3.5 còn nguyên comment skeleton (chưa bị đụng) | PASS ✅ — đọc trực tiếp file: 3.4.1/3.4.2/3.4.3/3.5.1/3.5.2/3.5.3 còn comment <!-- T2.20/T2.21/T2.22 --> |
| Mọi citation [ref:...] từ dany.md được giữ nguyên | PASS ✅ |

**Done-gate T2.17-T2.19: PASS** (xem VERIFY 2-LỚP độc lập dưới)

### T2.17-T2.19 — VERIFY ĐỐI KHÁNG 2-LỚP (agent độc lập, khác agent viết)

**Verifier:** sonnet độc lập, resolve TỪNG citation tại nguồn. ⭐ phần AI/ML ưu tiên cao nhất.

**Kết luận: PASS** (0 REJECT). Resolve toàn bộ điểm rủi ro cao:
- **obs_dim=10** (prose=10, model.py:9=10 KHỚP) — KHÔNG layout mismatch như giới hạn hiện tại ✅
- LSTM 2 lớp/hidden=128/dropout=0.2/window=21 (model.py:9,10,13,14,15) ✅; dual-head (model.py:31-48) ✅
- Giới hạn forecaster = CHỈ tile-21× steady-state (main.py:134 no-op, :135 np.tile OBS_WINDOW) ✅
- State 10 chiều đúng thứ tự (main.py:114-125) ✅; 11 action linspace(-0.30,0.20,11) CANDIDATES[6]=0.0 (reward.py:6-7) ✅
- SharedMLPDuelingQNet Linear(18,128)→…→Dueling V(64,1)+A(64,11), Q=V+A−mean(A) (network.py:60-78) ✅
- **9/9 hyperparam KHỚP file** (lr=1e-4, γ=0.99, batch=256, warmup=1000, buffer=50000, ε1.0→0.05, decay=2000, sync=500) ✅
- Safety 3→4→1→2→5 + 5 ngưỡng (safety.py:6,9-10,13,16,19) ✅
- CoreML 2 model fruit/root (main.py:318), feed RGB (main.py:324), score=P(fresh) (main.py:330), giới hạn 2/4 ✅
- Từ cấm: 0 khẳng định sai ✅

**Sửa sau verify (controller, self-resolve tại nguồn):**
1. **Hyperparam line-ref → class production:** train.py dùng `MultiCatDDQNAgent` (train.py:8,25), KHÔNG phải DuelingDDQNAgent. Sửa bảng siêu tham số trỏ `agent.py:144-148` (lr/γ/batch/warmup/buffer của MultiCatDDQNAgent) thay vì L33-35/39. Giá trị không đổi (2 class trùng giá trị); line-ref chính xác hơn.
2. **Thêm citation câu Bellman/Huber/Adam** (trước thiếu): `agent.py:236` (Bellman), `:239` (smooth_l1), `:243` (clip_grad_norm 10.0), `:178` (Adam) — đều trong `MultiCatDDQNAgent.train_step`.

**Ghi chú provenance:** implementer phiên này misreport "prose có sẵn từ phiên trước" — thực tế file tăng 310→395 dòng (chính nó viết §3.3.7). Controller xác minh end-state đúng qua git status + grep; không ảnh hưởng kết quả.

**Done-gate T2.17-T2.19 (post-fix): PASS** → commit task(T2.17-T2.19).

## T2.20-T2.21 — §3.4 CSDL ✅

**Ngày:** 2026-06-07
**File đích:** `docs/thesis/final/chuong-3-phan-tich-thiet-ke.md` (§3.4.1, §3.4.2, §3.4.3 đã có prose; §3.5 còn nguyên comment skeleton)

### Bảng citation — collection → schema:Lxx

| Collection | Schema file | Field/Index chính | Line |
|---|---|---|---|
| `users` | `user.schema.ts` | `email` (unique, lowercase) | L20-21 |
| `users` | `user.schema.ts` | `password` (bcrypt, select:false) | L23-24 |
| `users` | `user.schema.ts` | `role` enum [consumer/farm/admin] | L38-43 |
| `users` | `user.schema.ts` | `status` enum [active/suspended/pending] | L45-50 |
| `users` | `user.schema.ts` | `location` embedded (coordinates+address, _id:false) | L52-78 |
| `farms` | `farm.schema.ts` | `ownerId` → users, `required:true` | L51-52 |
| `farms` | `farm.schema.ts` | `verificationStatus` enum [pending/verified/rejected] | L106-107 |
| `farms` | `farm.schema.ts` | `location` GeoJSON Point (2dsphere index) | L60-61, L113 |
| `products` | `product.schema.ts` | `farmId` → farms | L38-39 |
| `products` | `product.schema.ts` | `category` enum 10 giá trị | L47-61 |
| `products` | `product.schema.ts` | `unit` enum [kg/g/piece/bunch/box/bag/liter] | L70-73 |
| `products` | `product.schema.ts` | `status` enum [available/sold_out/unavailable/seasonal] | L82-87 |
| `orders` | `order.schema.ts` | `customerId` → users, `farmId` → farms | L99-103 |
| `orders` | `order.schema.ts` | OrderItem embedded `@Schema({_id:false})` | L6-7, L105-106 |
| `orders` | `order.schema.ts` | `status` enum 7 giá trị | L126-138 |
| `orders` | `order.schema.ts` | `paymentStatus` enum [pending/paid/failed/refunded] | L141-146 |
| `orders` | `order.schema.ts` | 3 index đơn: customerId/farmId/status | L239-241 |
| `posts` | `post.schema.ts` | `authorId` → users, `farmId` → farms (optional) | L76-83 |
| `notifications` | `notification.schema.ts` | `userId` → users | L20-21 |
| `notifications` | `notification.schema.ts` | Compound index `{userId, createdAt:-1}` | L52 |
| `notification_preferences` | `notification-preferences.schema.ts` | `userId` → users, `unique:true` | L20-25 |
| `verification_tokens` | `verification-token.schema.ts` | `userId` → users, `type` enum [email/phone] | L9-16 |
| `verification_tokens` | `verification-token.schema.ts` | TTL index `{expiresAt}` expireAfterSeconds:0 | L31 |
| `verification_tokens` | `verification-token.schema.ts` | Compound index `{userId, type}` | L32 |
| `freshness_cache` | `freshness-cache.schema.ts` | `productId` → products, unique index | L26-27, L44 |
| `freshness_cache` | `freshness-cache.schema.ts` | `readings[{score,scannedAt}]` (KHÔNG scores[5]/label) | L29-30 |
| `freshness_cache` | `freshness-cache.schema.ts` | `medianScore` (required, default 0.7) | L32-33 |
| `freshness_cache` | `freshness-cache.schema.ts` | TTL index `{expiresAt}` expireAfterSeconds:0 | L45 |
| `price_overrides` | `price-override.schema.ts` | `productId` → products, `farmId` → farms | L18-22 |
| `price_overrides` | `price-override.schema.ts` | `status` enum 5 giá trị [shadow/pending_review/accepted/rejected/expired] | L45-50 |
| `price_overrides` | `price-override.schema.ts` | `mode` enum [shadow/advisory] | L42-43 |
| `price_overrides` | `price-override.schema.ts` | Compound index `{productId, status}` | L67 |
| `price_overrides` | `price-override.schema.ts` | TTL index `{expiresAt}` expireAfterSeconds:0 | L68 |

### Checklist self-review §3.4

| Tiêu chí | Kết quả |
|---|---|
| Đúng 10 collection (users, farms, products, orders, posts, notifications, notification_preferences, verification_tokens, freshness_cache, price_overrides) | ✅ PASS |
| 0 collection bịa — KHÔNG có recommendation_caches/forecast_caches | ✅ PASS — ledger t1.4-collections, t1.4-no-recommender |
| `freshness_cache` có `readings[{score,scannedAt}]` + `medianScore` (KHÔNG scores[5]/label) | ✅ PASS — freshness-cache.schema.ts:L29-33 |
| `users.location` là embedded object duy nhất (KHÔNG có `addresses[]`) | ✅ PASS — user.schema.ts:L52-78 |
| `orders.status` đúng 7 giá trị (pending/confirmed/preparing/ready_for_pickup/shipped/delivered/cancelled) | ✅ PASS — order.schema.ts:L126-138 |
| `orders` có 3 index đơn riêng lẻ (customerId/farmId/status) — KHÔNG compound 3-field | ✅ PASS — order.schema.ts:L239-241 |
| `price_overrides.status` đúng 5 giá trị (shadow/pending_review/accepted/rejected/expired) | ✅ PASS — price-override.schema.ts:L45-50 |
| 3 TTL index (freshness_cache/price_overrides/verification_tokens) + unique (freshness_cache.productId + notification_preferences.userId) | ✅ PASS |
| Compound index đúng 3 (price_overrides productId+status; notifications userId+createdAt; verification_tokens userId+type) | ✅ PASS |
| Text index đúng 3 (farms name+description; products name+description+tags; posts title+body+hashtags) | ✅ PASS |
| 2dsphere index: farms.location | ✅ PASS — farm.schema.ts:L113 |
| OrderItem là embedded (không phải collection riêng), `@Schema({_id:false})` | ✅ PASS — order.schema.ts:L6-7 |
| §3.5 còn nguyên comment skeleton (T2.22: §3.5.1/3.5.2/3.5.3) | ✅ PASS — đọc cuối file: comment <!-- T2.22 --> còn nguyên |
| §3.1-§3.3.7 không bị đụng | ✅ PASS — Edit chỉ thay 3 comment §3.4.1/3.4.2/3.4.3 |
| Mọi câu kỹ thuật có citation [ref: path:Lxx] hoặc [ref: ledger <id>] | ✅ PASS |
| TỪ CẤM vắng mặt: recommendation_caches/forecast_caches/scores[5]/addresses[]/compound 3-field orders/packing/shipping/completed | ✅ PASS |
| Văn phong học thuật tiếng Việt, bảng cho field/index, đoạn văn cho lý giải thiết kế | ✅ PASS |

**Done-gate T2.20-T2.21: PASS** — §3.4.1/3.4.2/3.4.3 đầy đủ prose, resolve tại 10 schema file, §3.5 còn comment.

### T2.20-T2.21 — VERIFY ĐỐI KHÁNG 2-LỚP (agent độc lập, khác agent viết)

**Verifier:** sonnet độc lập, resolve TỪNG field/enum/index/FK tại 10 schema file. ⭐ CSDL nghiêm nhất.

**Kết luận: PASS** (0 REJECT). Resolve toàn bộ trap:
- **10 collection thật, 0 bịa** (`grep recommendation_cache|forecast_cache f2t-backend/src` = 0) ✅
- users.location EMBEDDED object (`user.schema.ts:52-78`, _id:false) — KHÔNG addresses[] ✅; role/status enum đúng ✅
- orders.status ĐÚNG 7 giá trị (`order.schema.ts:128-136`) — không packing/shipping/completed ✅; OrderItem embedded @Schema _id:false (`order.schema.ts:6-7,105-106`) ✅
- freshness_cache = readings[{score,scannedAt}]+medianScore+updatedAt+expiresAt (`freshness-cache.schema.ts:29-39`) — KHÔNG scores[5]/label ✅
- price_overrides.status 5 giá trị (`price-override.schema.ts:47`), mode [shadow/advisory] ✅
- products.category 10 giá trị (`product.schema.ts:49-60`) ✅
- Index resolve TỪNG cái: 2dsphere farms (`farm:113`); 3 TTL (`freshness:45`,`price-override:68`,`verif-token:31` expireAfterSeconds:0); unique (`freshness:44`,`notif-pref:24`); compound (`price-override:67`,`notif:52`,`verif-token:32`); orders 3 SINGLE (`order:239-241`) — KHÔNG compound 3-field ✅; 3 text index ✅
- 12 FK/quan hệ resolve về schema ✅

**Sửa sau verify (controller, self-resolve tại nguồn) — 3 WARN omission:**
1. Bổ sung 4 chỉ mục đơn `products` (farmId/category/status/pricePerUnit) `product.schema.ts:148-151` vào bảng + đoạn phân tích (trước bị bỏ sót).
2. Bổ sung 4 chỉ mục `posts` (createdAt desc/authorId/farmId/hashtags) `post.schema.ts:115,117-119` vào bảng + đoạn phân tích.
3. Sửa citation `notification_preferences.userId` L20-25 → L20-26 (userId field thực ở L26).

**Done-gate T2.20-T2.21 (post-fix): PASS** → commit task(T2.20-T2.21).
