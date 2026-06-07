# dany.audit.md — Bảng kiểm tra claim kỹ thuật của dany.md

**Ngày audit:** 2026-06-07  
**Branch:** feature/f2t-ml-verify-thesis  
**Auditor:** T1.4 subagent  
**Phủ:** 5 chương, 671 dòng dany.md  
**Ground truth đã verify Task 0:** ledger `claims-ledger.md` nhóm kiến trúc ML (t0.1–t0.10)

> ⚠️ **CẬP NHẬT post-retrain T0.13:** các dòng audit ghi forecaster "obs_dim=11 / layout mismatch 11≠10" phản ánh trạng thái TRƯỚC retrain. Sau T0.13, forecaster đã retrain **obs_dim=10** khớp env (layout mismatch HẾT); giới hạn còn lại chỉ là serve tile-21× steady-state. dany.md đã được sửa theo trạng thái mới (xem `dany.verify-report.md` §4).

---

## Quy ước

- **mức ưu tiên:** CAO = CSDL/AI-ML/diagram; TRUNG = kiến trúc/số module/luồng; THẤP = bối cảnh/lý thuyết
- **hành động:** XÓA = không tồn tại, bịa; VIẾT LẠI = sai căn bản cần viết mới; SỬA SỐ = đúng khái niệm nhưng sai con số/tham số; GIỮ = khớp code; CHƯA XÁC MINH = claim chưa có evidence (cần task riêng)

---

## CHƯƠNG 1 — GIỚI THIỆU

| # | dany.md dòng | Claim hiện tại | Sự thật theo code + evidence | Ưu tiên | Hành động |
|---|---|---|---|---|---|
| 1.1 | L22 | MT2: "14 module nghiệp vụ" | Có 13 module: admin, auth, delivery, demand-forecasting, dynamic-pricing, farms, notifications, orders, payments, posts, products, uploads, users — đếm từ `f2t-backend/src/modules/` (13 thư mục). KHÔNG có module recommender. | TRUNG | SỬA SỐ → 13 |
| 1.2 | L23 | MT3: "Hệ thống gợi ý sản phẩm (ItemItemCF + Content-Based Filtering)" | `grep -rliE 'recommend\|itemitem\|collaborative\|content-based\|cosine' f2t-backend/src` = 0 file. Không có recommender module, không có endpoint, không có schema. | CAO | XÓA / VIẾT LẠI thành feature thật |
| 1.3 | L25 | MT4: "Dự báo nhu cầu (Holt EWMA + DoW seasonality)" | Forecaster thật = `ForecasterLSTM` (LSTM 2 lớp, obs_dim=11, window=21) — `dynamic-pricing-final/src/forecaster/model.py:18-49`. KHÔNG có Holt EWMA trong codebase. | CAO | VIẾT LẠI → ForecasterLSTM |
| 1.4 | L26 | MT5: "DDQN + Safety Layer, chế độ advisory" | DDQN + Safety Layer + advisory mode: ĐÚNG — `dynamic-pricing-final/src/rl/network.py:42-80`, `pricing-sidecar/safety.py:1-23`, `f2t-backend/src/app.module.ts:58`. | TRUNG | GIỮ |
| 1.5 | L29 | MT6: "Phân loại độ tươi rau từ ảnh (MobileNetV2 qua API)" | Thực tế: 2 CoreML model (`freshnessmodels/MyFreshnessClassifier-fruit.mlmodel` + `-root.mlmodel`), nhị phân fresh/rotten, không phải MobileNetV2 4 class. API: `pricing-sidecar/main.py:307-338` `/freshness/classify`. | CAO | VIẾT LẠI → CoreML (fruit/root), nhị phân |
| 1.6 | L35 | "3 sidecar FastAPI" | Chỉ 1 sidecar: `pricing-sidecar/` phục vụ 3 endpoint: `/predict`, `/forecast`, `/freshness/classify`. Config `PRICING_SIDECAR_URL` → `http://localhost:8000` duy nhất — `f2t-backend/src/app.module.ts:57`. | CAO | VIẾT LẠI → 1 sidecar (3 endpoint) |
| 1.7 | L51 | ĐG1: "Kiến trúc Monolith+Sidecar → tách AI Python ra khỏi Node.js, graceful degradation" | Đúng về pattern — `pricing-sidecar/main.py` FastAPI; backend dùng HttpService gọi sidecar. Graceful: `demand-forecasting.service.ts` try/catch. | TRUNG | GIỮ |
| 1.8 | L53 | ĐG2: "Hệ thống gợi ý đa tầng (ItemItemCF + Content-Based + cold-start handling)" | KHÔNG TỒN TẠI. Grep backend = 0 file. Frontend `src/app` không có for-you/cross-sell screen. (feed.tsx có `useForYouPosts` = bài đăng, không phải product recommender.) | CAO | XÓA — không có evidence; thay bằng đóng góp thật |
| 1.9 | L55 | ĐG3: "Dự báo nhu cầu (Holt EWMA + DoW seasonality + confidence interval)" | Thuật toán SAI: thật là ForecasterLSTM (`model.py:18-49`). Không có CI trong output. Output = `{demand, waste_logit}` — `model.py:46-49`. | CAO | VIẾT LẠI → ForecasterLSTM, output demand+waste |
| 1.10 | L57 | ĐG4: "Định giá động (DDQN + Safety Layer 5 quy tắc + advisory mode)" | ĐÚNG về khái niệm. Safety 5 quy tắc: xác minh `pricing-sidecar/safety.py` có đúng 5 rule (Rule 1–5 tường minh). Advisory mode: `app.module.ts:58`. | CAO | GIỮ (nhưng verify số quy tắc — xem L1.11) |
| 1.11 | L59 | ĐG5: "Phân loại độ tươi (MobileNetV2 API + dataset rau VN tự thu thập)" | SAI: (a) model là CoreML không phải MobileNetV2; (b) không có dataset thu thập; (c) nhị phân fresh/rotten không phải 4 class — `pricing-sidecar/main.py:183-191`, ledger t0.6. | CAO | VIẾT LẠI → CoreML (2 model, nhị phân) |
| 1.12 | L61 | ĐG6: "Interceptor giá AI, Dijkstra fallback, Embedded Snapshot" | DynamicPricingInterceptor: THẬT — `f2t-backend/src/common/interceptors/dynamic-pricing.interceptor.ts:9`. Dijkstra: THẬT — `delivery.service.ts`. Embedded snapshot trong orders: THẬT — `order.schema.ts:105` `items[{productName, pricePerUnit,...}]`. | TRUNG | GIỮ |

---

## CHƯƠNG 2 — CƠ SỞ LÝ THUYẾT

| # | dany.md dòng | Claim hiện tại | Sự thật theo code + evidence | Ưu tiên | Hành động |
|---|---|---|---|---|---|
| 2.1 | L141-157 | 2.4.1–2.4.2: Lý thuyết Collaborative Filtering (Cosine Similarity, ItemItemCF, TF-IDF, temporal decay λ=0.02) | Lý thuyết hoàn toàn không có implementation tương ứng trong codebase. Đây là lý thuyết cho MT3 bịa. Viết về thuật toán không cài đặt = gian lận học thuật. | CAO | XÓA / THAY bằng lý thuyết LSTM/DDQN |
| 2.2 | L159-167 | 2.4.3–2.4.4: "Holt EWMA + DoW Seasonality" (Level L_t, Trend T_t, hệ số DoW, ≥14 ngày) | KHÔNG CÀI. Forecaster thật là LSTM 2-layer — `model.py:22-29` `lstm = nn.LSTM(input_size=cfg.obs_dim, hidden_size=128, num_layers=2)`. Công thức Holt không tồn tại trong code. | CAO | VIẾT LẠI toàn bộ 2.4.3 → kiến trúc ForecasterLSTM |
| 2.3 | L169-175 | 2.4.5: "state = [tồn kho, độ tươi, giờ_trong_ngày, giá_hiện_tại, nhu_cầu_dự_báo], 5 hành động [-20%,-10%,0%,+10%,+20%]" | SAI. State thật = 10 chiều: [freshness, inv_ratio, sin_dow, cos_dow, days_to_restock, demand_ratio, prev_delta, comp_ratio, days_to_waste, inv_coverage] — `pricing-sidecar/main.py:114-125`. Actions = 11 (CANDIDATES = linspace(-0.30, 0.20, 11)) — `dynamic-pricing-final/src/rl/reward.py:6-7`. | CAO | VIẾT LẠI |
| 2.4 | L177-183 | 2.4.6: "MobileNetV2, 14MB, 4 class: Tươi/Hơi héo/Héo/Hỏng" | SAI. Thật là CoreML (Apple Create ML), 2 model (fruit/root), nhị phân fresh/rotten — ledger t0.6, `pricing-sidecar/main.py:183-191`. Không có 4 class. | CAO | VIẾT LẠI → CoreML, nhị phân |
| 2.5 | L111-120 | 2.3.1: "React Native + Expo SDK 53, NativeWind, MMKV, Zustand, Expo Router" | Khớp: `f2t-frontend/src/app` dùng Expo Router (route groups `(app)/`, `admin/`). NativeWind: styles trong tsx. MMKV: auth store. Zustand: useAuth. | THẤP | GIỮ |
| 2.6 | L113-119 | 2.3.2: NestJS pattern DI, Guards, Interceptors, Pipes | Khớp: `app.module.ts` APP_GUARD (ThrottlerGuard), APP_INTERCEPTOR (DynamicPricingInterceptor), DI qua constructor. | THẤP | GIỮ |
| 2.7 | L133-137 | 2.3.4: FastAPI + Pydantic, Lifespan load model 1 lần | ĐÚNG: `pricing-sidecar/main.py:148-193` `@asynccontextmanager async def lifespan` load DDQN + Forecaster + CoreML khi start. | TRUNG | GIỮ |
| 2.8 | L133-137 | 2.3.5: Stripe Checkout + Webhook, GHN + Dijkstra fallback | ĐÚNG: `payments` module, `delivery.service.ts`. Dijkstra fallback confirm tại `delivery.service.ts`. | THẤP | GIỮ |

---

## CHƯƠNG 3 — PHÂN TÍCH VÀ THIẾT KẾ

| # | dany.md dòng | Claim hiện tại | Sự thật theo code + evidence | Ưu tiên | Hành động |
|---|---|---|---|---|---|
| 3.1 | L255-261 | 3.3.1 Sơ đồ: "3 Sidecar FastAPI — Recommender (8001), Forecast (8002), Pricing (8000)" | SAI. Chỉ 1 sidecar (port 8000) phục vụ 3 endpoint. Không có sidecar 8001 hay 8002. `app.module.ts:57` `PRICING_SIDECAR_URL=http://localhost:8000`; demand-forecasting.service.ts:40 dùng cùng URL. | CAO | VIẾT LẠI → 1 sidecar, 3 endpoint trên cùng port |
| 3.2 | L281 | UC-ML-01: "Hệ thống gợi ý (Consumer xem For-You + Cross-sell)" | KHÔNG TỒN TẠI. Không có UC, không có screen, không có backend endpoint. Frontend `home.tsx` không có For-You section; `feed.tsx` `useForYouPosts` = posts (không phải products). | CAO | XÓA UC-ML-01 hoàn toàn |
| 3.3 | L323 | SD-ML-01: "Gợi ý For-You (NestJS → Sidecar 8001 → cosine similarity)" | BỊA. Không có sidecar 8001, không có cosine similarity endpoint, không có recommender backend. | CAO | XÓA |
| 3.4 | L325 | SD-ML-02: "Cross-sell giỏ hàng (NestJS → Sidecar 8001 → co-occurrence)" | BỊA. Không tồn tại. | CAO | XÓA |
| 3.5 | L327 | SD-ML-03: "Cron huấn luyện lại mỗi giờ" — (implied: recommender) | Sai ngữ cảnh. PricingTickCron mỗi giờ là ĐÚNG (`pricing-tick.cron.ts:18` `"0 * * * *"`) nhưng đây là pricing tick, không phải recommender retrain. | TRUNG | SỬA ngữ cảnh → PricingTickCron định giá |
| 3.6 | L329 | SD-ML-04: "Dự báo nhu cầu (NestJS → Sidecar 8002 → Holt EWMA → trả 7 ngày)" | Sai 2 điểm: (a) port 8002 SAI → sidecar 8000; (b) Holt EWMA SAI → ForecasterLSTM. Luồng đúng: `demand-forecasting.service.ts:40` gọi `${sidecarUrl}/forecast` (port 8000) → `main.py:259-270` `_run_forecaster` → `ForecasterLSTM`. | CAO | VIẾT LẠI |
| 3.7 | L345-349 | AD-ML-01: Holt EWMA + DoW flowchart (≥14 ngày → tính DoW) | Thuật toán không tồn tại trong code. | CAO | VIẾT LẠI → LSTM inference flow |
| 3.8 | L349 | AD-ML-04: "Safety Layer 5 quy tắc" — QT1-QT5 | Có đúng 5 rule trong `pricing-sidecar/safety.py:5-19`. Tuy nhiên nội dung quy tắc KHÁC (xem 3.9). | CAO | SỬA NỘI DUNG |
| 3.9 | L425-434 | Safety Layer 5 quy tắc:<br>QT1: "Giá không giảm quá 30%"<br>QT2: "Giá không tăng quá 20%"<br>QT3: "Sàn giá = 55% giá gốc"<br>QT4: "Độ tươi <0.4 → giảm ≥20%"<br>QT5: "Giá tối thiểu 1000 VND" | Theo `pricing-sidecar/safety.py:5-19`:<br>Rule 3: `max(base*0.70, min(price, base*1.20))` — range ±20%/+20%, không phải -30% cap<br>Rule 4: `freshness<0.4 → price ≤ base*0.75` (đúng threshold 0.4, đúng giảm)<br>Rule 1: `price ≥ base*0.55` (sàn 55% — ĐÚNG)<br>Rule 2: `price ≤ base*2.0` (trần 200% — KHÁC thesis nói +20%)<br>Rule 5: `price ≥ 1000` — ĐÚNG<br>**Sai: QT1 (safety clip -30% nhưng floor là -30% từ DDQN candidates, không phải safety); QT2 (safety trần là 2.0× base không phải +20%)** | CAO | SỬA theo safety.py thật |
| 3.10 | L413-420 | "(c) DDQN: State 5 chiều [tồn_kho_pct, độ_tươi, giờ_trong_ngày, giá_hiện_tại, nhu_cầu], 5 hành động [-20%,-10%,0%,+10%,+20%], MLP 5→64→32→5" | SAI hoàn toàn. State 10 chiều — `main.py:114-125`. 11 actions — `reward.py:6`. Mạng: `SharedMLPDuelingQNet` — Linear(10+8, 128) + ReLU + Linear(128,128) + V/A heads (Dueling, không phải MLP 5→64→32→5) — `network.py:61-66`. Có category embedding (n_cats=4, embed=8). | CAO | VIẾT LẠI hoàn toàn |
| 3.11 | L419 | "Experience Replay: buffer 10000, batch 32, ε-greedy 0.1→0.01" | SAI: buffer=50000 — `agent.py:35`; batch=256 — `agent.py:33`; ε: EPSILON_START=1.0→EPSILON_END=0.05 — `train.py:12-14`. Target sync = 500 steps — `train.py:15`. | CAO | SỬA SỐ |
| 3.12 | L393-405 | "(b) Holt EWMA công thức Level + Trend + CI 80% + DoW + cold-start <7 ngày" | KHÔNG TỒN TẠI trong code. ForecasterLSTM không có CI, không có DoW seasonality factor, không có cold-start fallback theo ngày. Output chỉ là `{demand, waste_logit}` — `model.py:46-49`. | CAO | VIẾT LẠI hoàn toàn |
| 3.13 | L355-388 | "(a) Hệ thống gợi ý: ItemItemCF + Content-Based + Hybrid logic" | KHÔNG TỒN TẠI. Không có 1 dòng code nào — grep 0 file. | CAO | XÓA toàn bộ mục (a) |
| 3.14 | L441-453 | "(d) MobileNetV2: dataset 2000 ảnh × 4 class, freeze 10 epoch → fine-tune 30 lớp, API POST /freshness/classify" | Sai: (a) không có training script cho ảnh; (b) 2 CoreML model (fruit/root), nhị phân; (c) API endpoint `/freshness/classify` là ĐÚNG — `main.py:307`. | CAO | VIẾT LẠI → CoreML, không có fine-tune script |
| 3.15 | L461-485 | 3.4.2: "10 collections" gồm: recommendation_caches, forecast_caches, freshness_cache, price_overrides, users, farms, products, orders, posts, notifications | SAI số và tên. Collection thật (có schema file): users, farms, products, orders, posts, notifications, notification_preferences, freshness_cache, price_overrides, verification_tokens = **10** collection thật — nhưng `recommendation_caches` và `forecast_caches` KHÔNG TỒN TẠI. Thay vào đó có: `notification_preferences` và `verification_tokens`. Đếm lại: 10 collection thật (7+3 không phải 7+3 thesis liệt kê). | CAO | VIẾT LẠI danh sách |
| 3.16 | L479 | "recommendation_caches: userId, type(for-you/cart), productIds[], expiresAt(TTL 1h)" | KHÔNG TỒN TẠI. `grep -rn 'recommendation_caches' f2t-backend/src` = 0 result. | CAO | XÓA |
| 3.17 | L481 | "forecast_caches: productId, predictions[7], confidence, expiresAt(TTL 6h)" | KHÔNG TỒN TẠI. `grep -rn 'forecast_caches\|ForecastCache' f2t-backend/src` = 0 result. | CAO | XÓA |
| 3.18 | L477 | freshness_cache: "productId(unique), scores[5], label, expiresAt(TTL 6h)" | Gần đúng nhưng sai schema. Thật: `FreshnessCache` có `readings[{score, scannedAt}]`, `medianScore`, `updatedAt`, `expiresAt` — `freshness-cache.schema.ts:6-40`. Không có field `label`, không có `scores[5]` fixed array. | CAO | SỬA theo schema thật |
| 3.19 | L469 | "orders: userId, items[{productSnapshot, qty, price}]" | Gần đúng. `order.schema.ts:8-34`: `items[{productId, productName, productImage, quantity, pricePerUnit, unit, totalPrice, farmId, farmName}]`. Embedded snapshot đúng về ý nghĩa. | TRUNG | SỬA field names |
| 3.20 | L465 | "users: addresses[], location{Point}" | Sai. `user.schema.ts:52-78`: không có `addresses[]`, có `location{coordinates{lat,lng}, address{street,city,zipCode,country}}` (1 địa chỉ embedded). | TRUNG | SỬA |
| 3.21 | L487-496 | Indexes: 2dsphere farms.location, TTL freshness/recommend 6h/1h, Compound orders(userId+status+createdAt) | 2dsphere farm: ĐÚNG — `farm.schema.ts:113`. TTL freshness: ĐÚNG — `freshness-cache.schema.ts:45`. Compound orders: KHÔNG CÓ — `order.schema.ts:239-242` chỉ có index userId, farmId, status riêng lẻ (không compound 3 field). recommend TTL: N/A (không có collection). | TRUNG | SỬA |
| 3.22 | L501 | 3.5.1: "Home (gợi ý For-You ★AI), Chi tiết (nhãn tươi + giá động + sản phẩm tương tự), Giỏ hàng (cross-sell ★AI)" | For-You product section: KHÔNG CÓ trong `home.tsx` (chỉ có "Sản phẩm nổi bật" — query thường). Sản phẩm tương tự: KHÔNG CÓ. Cross-sell: KHÔNG CÓ trong `cart.tsx`. Giá động + nhãn tươi: CÓ trong `product-card.tsx` (dynamicPrice, freshnessScore). | CAO | VIẾT LẠI |
| 3.23 | L503 | 3.5.2: Farm "biểu đồ dự báo 7 ngày ★AI" | CÓ: `farm/forecast-insights.tsx` dùng `use-farm-forecasts.tsx` → gọi `/demand-forecasting/forecast` endpoint. | TRUNG | GIỮ |
| 3.24 | L503 | Farm "Gợi ý giá (chấp nhận/từ chối ★AI)" | CÓ: `farm/price-suggestions.tsx:439,473` "gợi ý giá", accept/reject flow. | TRUNG | GIỮ |

---

## CHƯƠNG 4 — TRIỂN KHAI VÀ THỰC NGHIỆM

| # | dany.md dòng | Claim hiện tại | Sự thật theo code + evidence | Ưu tiên | Hành động |
|---|---|---|---|---|---|
| 4.1 | L519 | "Trình tự khởi động: MongoDB → 3 Sidecar → NestJS → Expo" | Sai: chỉ 1 sidecar. Thứ tự: MongoDB → pricing-sidecar (port 8000) → NestJS → Expo. | TRUNG | SỬA SỐ |
| 4.2 | L525 | 4.2.1: "Backend: 14 module NestJS" | SAI → 13 module (đếm thư mục `f2t-backend/src/modules/`). | TRUNG | SỬA SỐ |
| 4.3 | L529 | "Sidecars: 3 thư mục Python" | SAI → 1 thư mục: `pricing-sidecar/`. | TRUNG | SỬA SỐ |
| 4.4 | L533 | DynamicPricingInterceptor "chặn response /api/products → tra price_overrides → nhúng dynamicPrice + priceTag" | ĐÚNG. `dynamic-pricing.interceptor.ts:16-18` check path includes `/products`; `interceptor.ts:59` gọi `getAcceptedOverridesForProducts`; `interceptor.ts:74-77` thêm `dynamicPrice`, `freshnessScore`, `priceTag`. | TRUNG | GIỮ |
| 4.5 | L535 | "PricingTickCron: chạy mỗi giờ" | ĐÚNG. `pricing-tick.cron.ts:18` default `"0 * * * *"` (mỗi giờ, configurable). | TRUNG | GIỮ |
| 4.6 | L537 | "Vòng đời PriceOverride: pending → accepted/rejected → expired" | Gần đúng nhưng thiếu. Thật: `status` enum = `['shadow', 'pending_review', 'accepted', 'rejected', 'expired']` — `price-override.schema.ts:45-50`. Có mode `shadow` trước khi thành `pending_review`. | TRUNG | SỬA SỐ |
| 4.7 | L547 | "Unit test: 54/54 pass (Jest + mongodb-memory-server)" | CHƯA XÁC MINH: có 21 file `*.spec.ts` trong backend (đếm từ find); tổng `it()/test()` blocks trong 21 file để ra con số 54 chưa được đếm. Không chạy test. Evidence: `find /Users/macos/f2t/f2t-backend/src -name "*.spec.ts" \| wc -l` = 21 file. Con số 54 cần đếm test cases thực tế. | TRUNG | CHƯA XÁC MINH |
| 4.8 | L549 | "Bảng test cases theo 10 module" | Có 21 spec file (không phải 10 module): bao gồm app.controller, dynamic-pricing.interceptor, admin, auth.controller, auth.service, delivery, demand-forecasting, dynamic-pricing, farms.controller, farms.service, notifications.controller, notifications.service, orders.controller, orders.service, payments, posts.controller, posts.service, products.controller, products.service, users.controller, users.service. | TRUNG | SỬA SỐ → 21 file spec |
| 4.9 | L551 | "TypeScript build: 0 lỗi" | CHƯA XÁC MINH (không chạy build). | THẤP | CHƯA XÁC MINH |
| 4.10 | L559 | 4.4.1: "Bảng 14 module × trạng thái" | SAI → 13 module. | TRUNG | SỬA SỐ |
| 4.11 | L559 | "24+ REST endpoints" | SỬA: Thực tế ≥79 endpoints — `find f2t-backend/src -name "*.controller.ts" \| xargs grep -c '@Get\|@Post\|@Put\|@Patch\|@Delete'` = 79. | THẤP | SỬA SỐ → 79+ endpoints |
| 4.12 | L559 | "10 collections" | Số đúng nhưng tên sai — recommendation_caches và forecast_caches không tồn tại; thay bằng notification_preferences và verification_tokens. | CAO | SỬA DANH SÁCH |
| 4.13 | L559 | "42 màn hình" | CHƯA XÁC MINH. Đếm file tsx trong `src/app`: 58 file (bao gồm layout/_layout.tsx). Screen thực = bỏ _layout và +html: ~50 file. | THẤP | CHƯA XÁC MINH |
| 4.14 | L563-574 | 4.4.2: "Đánh giá hệ thống gợi ý (Hit-Rate@6, ItemItemCF vs Content-Based vs Random)" | KHÔNG THỂ THỰC HIỆN — không có recommender implementation. Mọi số liệu benchmark cho recommender đều là BỊA. | CAO | XÓA toàn bộ 4.4.2 |
| 4.15 | L577-589 | 4.4.3: "Đánh giá dự báo (MAE/MAPE Holt+DoW vs Holt không DoW vs Naive)" | Thuật toán so sánh sai (Holt không cài). Thật: có `dynamic-pricing-final/src/forecaster/eval.py` để eval ForecasterLSTM (xác nhận từ ledger t0.4). Nên đánh giá LSTM vs baseline. | CAO | VIẾT LẠI |
| 4.16 | L613-624 | 4.4.5: "Confusion Matrix 4×4, F1-score, MobileNetV2 vs đánh giá bằng mắt, dataset rau VN" | SAI: binary classification (2×2 matrix), 2 model CoreML. Không có dataset thu thập. Ledger t0.6 output thật: `target='fresh'/'rotten'`, `fresh/rotten probability`. | CAO | VIẾT LẠI |
| 4.17 | L629 | 4.4.6 Demo: "Home+ForYou, Giỏ hàng+cross-sell" | KHÔNG CÓ screen ForYou product hay cross-sell trong frontend. Screenshots không tồn tại. | CAO | SỬA MÔ TẢ screenshots |
| 4.18 | L629 | "Farm Dashboard+dự báo" | CÓ: `farm/forecast-insights.tsx`. | TRUNG | GIỮ |
| 4.19 | L629 | "Farm gợi ý giá" | CÓ: `farm/price-suggestions.tsx`. | TRUNG | GIỮ |
| 4.20 | L629 | "Farm quét tươi" | Cần verify. `farm/analytics.tsx` có gọi freshness endpoint? `use-farm-forecasts.tsx` liên quan. | TRUNG | CHƯA XÁC MINH |

---

## CHƯƠNG 5 — KẾT LUẬN

| # | dany.md dòng | Claim hiện tại | Sự thật theo code + evidence | Ưu tiên | Hành động |
|---|---|---|---|---|---|
| 5.1 | L635 | "14 module, 54/54 test, 42 màn hình, 3 sidecar AI" | Sai 2/4: 13 module; 1 sidecar. 54/54 test và 42 màn hình chưa xác minh. | TRUNG | SỬA SỐ |
| 5.2 | L637 | "6 đóng góp... benchmark từ Chương 4" | ĐG2 (recommender) không có; ĐG3 (Holt) không có. Benchmark recommender bịa. | CAO | VIẾT LẠI đóng góp thật |
| 5.3 | L643 | "Dataset tươi nhỏ (~2000 ảnh)" | Không có evidence dataset tự thu thập. Sidecar dùng 2 CoreML model pre-trained. | CAO | VIẾT LẠI → giới hạn thật: chỉ 2/4 category có model riêng |
| 5.4 | L641 | "5.2 Hạn chế: Sidecar chưa Docker" | Đúng — chưa có Dockerfile trong `pricing-sidecar/`. | THẤP | GIỮ |
| 5.5 | L643 | Hạn chế: không đề cập train↔serve mismatch của forecaster | **THIẾU TRUNG THỰC** — phải thêm 3 giới hạn từ ledger t0.10-thesis-limitations: (a) forecaster train/serve mismatch → `/forecast` là xấp xỉ thấp; (b) dow phase offset <6.2%; (c) freshness 2/4 model. | CAO | THÊM vào 5.2 |
| 5.6 | L655-669 | 5.3 Hướng phát triển | Các hướng phù hợp với hệ thống thật. "Nâng cấp DDQN → Multi-Agent RL" hợp lý. | THẤP | GIỮ |

---

## TÓM TẮT CLAIM SAI

**Tổng số claim kiểm tra:** ~50  
**Claim SAI/BỊA (cần XÓA hoặc VIẾT LẠI):** 25  
**Claim SỬA SỐ/SỬA chi tiết:** 12  
**Claim ĐÚNG (GIỮ):** 10  
**CHƯA XÁC MINH:** 4

### Nhóm lỗi lớn theo mức độ nghiêm trọng

1. **Recommender system hoàn toàn không tồn tại** (ảnh hưởng: MT3, ĐG2, 2.4.1, 2.4.2, UC-ML-01, SD-ML-01, SD-ML-02, AD-ML-01 (hệ gợi ý), 3.3.7(a), 3.5.1, 4.4.2) — 10+ claim bịa
2. **Forecaster = LSTM, không phải Holt EWMA** (ảnh hưởng: MT4, ĐG3, 2.4.3, 2.4.4, 3.3.7(b), SD-ML-04, AD-ML-03, 4.4.3) — 8+ claim sai
3. **DDQN: state 10-dim/11-action/SharedMLPDueling**, không phải 5-dim/5-action/MLP-5→64→32→5 (ảnh hưởng: 2.4.5, 3.3.7(c)) — 2 claim sai
4. **Freshness = CoreML nhị phân (2 model)**, không phải MobileNetV2 4-class (ảnh hưởng: MT6, ĐG5, 2.4.6, 3.3.7(d), 4.4.5) — 4 claim sai
5. **1 sidecar** không phải 3 (ảnh hưởng: 1.3, 3.3.1, 4.1, 4.2.1, 5.1) — 5 claim sai
6. **13 module** không phải 14 (ảnh hưởng: MT2, 4.2.1, 4.4.1, 5.1) — 4 claim sai
7. **MongoDB collection**: recommendation_caches và forecast_caches không tồn tại; thay bằng notification_preferences và verification_tokens (ảnh hưởng: 3.4.2, 4.4.1)
8. **Safety Layer** QT1/QT2 nội dung sai (clip range và trần)
9. **Hyperparameters DDQN** sai: buffer 50k (không phải 10k), batch 256 (không 32), ε từ 1.0→0.05
10. **3 giới hạn thesis** chưa được ghi (ledger t0.10): forecaster mismatch, dow lệch pha, freshness 2/4 model

---

## Danh sách collection MongoDB thật

| Collection | Schema file | Collection name trong Mongo |
|---|---|---|
| users | `users/schemas/user.schema.ts` | (auto: `users`) |
| farms | `farms/schemas/farm.schema.ts` | (auto: `farms`) |
| products | `products/schemas/product.schema.ts` | (auto: `products`) |
| orders | `orders/schemas/order.schema.ts` | (auto: `orders`) |
| posts | `posts/schemas/post.schema.ts` | (auto: `posts`) |
| notifications | `notifications/schemas/notification.schema.ts` | (auto: `notifications`) |
| notification_preferences | `notifications/schemas/notification-preferences.schema.ts` | (auto: `notificationpreferences`) |
| freshness_cache | `dynamic-pricing/schemas/freshness-cache.schema.ts` | `freshness_cache` (tường minh) |
| price_overrides | `dynamic-pricing/schemas/price-override.schema.ts` | `price_overrides` (tường minh) |
| verification_tokens | `auth/schemas/verification-token.schema.ts` | (auto: `verificationtokens`) |

**Tổng: 10 collection** — KHÔNG có `recommendation_caches`, KHÔNG có `forecast_caches`.

---

## State DDQN 10 chiều (thật)

| Index | Chiều | Nguồn |
|---|---|---|
| 0 | freshness (clip 0–1) | `main.py:115` |
| 1 | inventory_ratio (min 2.0) | `main.py:116` |
| 2 | sin(2π×dow/7) | `main.py:117` |
| 3 | cos(2π×dow/7) | `main.py:118` |
| 4 | days_to_restock/30 (min 1) | `main.py:119` |
| 5 | demand_ratio (clip 0–3) | `main.py:120` |
| 6 | prev_delta (clip -0.30–0.20) | `main.py:121` |
| 7 | comp_ratio (clip 0.5–2.0) | `main.py:122` |
| 8 | days_to_waste/14 | `main.py:123` |
| 9 | inv_coverage/3 | `main.py:124` |

---

## Safety Layer 5 quy tắc (thật)

| Rule | Nội dung thật | Safety.py dòng |
|---|---|---|
| Rule 3 | clip price ∈ [base×0.70, base×1.20] | L6 |
| Rule 4 | nếu freshness < 0.4 → price ≤ base×0.75 | L8-9 |
| Rule 1 | price ≥ base×0.55 (sàn chi phí) | L12 |
| Rule 2 | price ≤ base×2.0 (trần) | L15 |
| Rule 5 | price ≥ 1000 VND | L18 |

(Thứ tự trong code: Rule 3 → 4 → 1 → 2 → 5 — Rule 3 là clip chính, Rule 1 là safety net thứ hai)

---

## Đề xuất chia leaf-task T1.5…N

### ⭐ T1.5 — Viết lại mục 1.2 (Mục tiêu nghiên cứu) + 1.5 (Đóng góp)
- Xóa MT3 (recommender), sửa MT4 (LSTM), sửa MT6 (CoreML), sửa "14→13 module", sửa "3→1 sidecar"
- Xóa ĐG2 (recommender), viết lại ĐG3 (LSTM), viết lại ĐG5 (CoreML)
- **Dependency:** ledger t0.2, t0.6 (đã có)
- **Ưu tiên:** CAO (AI-ML)

### ⭐ T1.6 — Viết lại 2.4.1–2.4.2 (Lý thuyết Recommender → bỏ)
- Xóa lý thuyết Collaborative Filtering và Content-Based
- Thêm lý thuyết LSTM, lý thuyết DDQN/Dueling đúng tham số
- **Dependency:** T1.5 xong
- **Ưu tiên:** CAO (AI-ML)

### ⭐ T1.7 — Viết lại 2.4.3–2.4.4 (Holt EWMA → ForecasterLSTM)
- Thay toàn bộ Holt EWMA bằng LSTM architecture (obs_dim=11, window=21, 2-layer, demand+waste output)
- Thêm mục limitations: train/serve mismatch
- **Dependency:** ledger t0.2, t0.4
- **Ưu tiên:** CAO (AI-ML)

### ⭐ T1.8 — Viết lại 2.4.5 + 3.3.7(c) (DDQN chi tiết đúng tham số)
- State 10-dim, 11 actions, SharedMLPDuelingQNet (10+8→128→V/A), buffer 50k, batch 256, ε 1.0→0.05
- Safety Layer 5 quy tắc đúng nội dung
- **Dependency:** ledger t0.2, t0.9
- **Ưu tiên:** CAO (AI-ML)

### ⭐ T1.9 — Viết lại 2.4.6 + 3.3.7(d) (MobileNetV2 → CoreML)
- Thay MobileNetV2 4-class bằng CoreML 2-model nhị phân
- Nêu giới hạn: 2/4 category có model riêng (fruit/root), leafy/herbs dùng root model
- **Dependency:** ledger t0.6
- **Ưu tiên:** CAO (AI-ML)

### ⭐ T1.10 — Viết lại 3.3.1 + 3.3.3 + diagram (1 sidecar, xóa UC-ML-01)
- Sơ đồ kiến trúc: App ↔ NestJS(3000) ↔ MongoDB + **1** Sidecar FastAPI(8000: /predict, /forecast, /freshness/classify)
- Xóa UC-ML-01 (For-You), SD-ML-01 (gợi ý), SD-ML-02 (cross-sell)
- Sửa SD-ML-04: port 8000 + ForecasterLSTM
- **Dependency:** T1.5
- **Ưu tiên:** CAO (diagram)

### ⭐ T1.11 — Viết lại 3.4.2 (CSDL — danh sách collection thật)
- Thay recommendation_caches + forecast_caches bằng notification_preferences + verification_tokens
- Sửa schema freshness_cache (đúng field)
- Sửa schema users (không có addresses[], có location embedded)
- Sửa schema orders (field names thật)
- Sửa indexes (compound orders: không có)
- **Dependency:** audit table này
- **Ưu tiên:** CAO (CSDL)

### T1.12 — Sửa 4.2 + 4.4.1 (số liệu module, sidecar, endpoint)
- 14→13 module, 3→1 sidecar, "24+"→"79+" endpoints
- **Dependency:** T1.5
- **Ưu tiên:** TRUNG

### ⭐ T1.13 — Viết lại 4.4.2 (xóa đánh giá recommender) + 4.4.3 (đánh giá LSTM) + 4.4.5 (đánh giá CoreML)
- 4.4.2: XÓA hoàn toàn (không có recommender để đánh giá)
- 4.4.3: Thay MAE Holt bằng eval ForecasterLSTM (`src/forecaster/eval.py`)
- 4.4.5: Thay Confusion Matrix 4×4 bằng binary (2×2), fresh/rotten
- **Dependency:** T1.7, T1.9
- **Ưu tiên:** CAO (AI-ML, nội dung thực nghiệm)

### T1.14 — Thêm mục Limitations thật (5.2)
- Thêm: forecaster train/serve mismatch (obs_dim=11 train vs 10 serve, tile-21× thay chuỗi thật)
- Thêm: dow lệch pha <6.2%
- Thêm: freshness chỉ 2/4 category
- Sửa: "Dataset tươi ~2000 ảnh" → không có dataset tự thu thập
- **Dependency:** ledger t0.10
- **Ưu tiên:** CAO (tính trung thực)

### T1.15 — Xác minh claim chưa chứng minh (task verify riêng)
- Đếm test cases trong 21 spec file → verify "54/54"
- Đếm screen thật → verify "42 màn hình"
- Xác minh farm/analytics.tsx có camera freshness scan không
- **Dependency:** không
- **Ưu tiên:** TRUNG

---

*Audit hoàn thành bởi T1.4 — 2026-06-07. Không sửa dany.md. Không ghi task-tree.md hay STATE.md.*
