# CONTEXT.md — F2T Project Handoff

> This file is the agent's memory. It is updated at the end of every session.
> Every new session starts by reading this file before doing anything else.
> Do not trust your training data or previous conversation — trust this file.

---

## Project Identity

- **Project:** F2T (Farm to Table) — mobile marketplace connecting farms and consumers
- **Frontend:** React Native + Expo SDK 53, Axios, Zustand, MMKV, React Query, React Native Maps
- **Backend:** NestJS 11 + TypeScript 5.7 + MongoDB 7 + Mongoose + JWT (passport-jwt), Throttler
- **Repo layout:** `~/f2t/f2t-frontend/` and `~/f2t/f2t-backend/`

---

## Locked Decisions (never revisit without developer approval)

| Decision | Value | Reason |
|---|---|---|
| Auth mechanism | JWT Bearer token | Frontend uses MMKV — confirmed in client.tsx |
| Session cookies | ❌ NOT used | Mobile app, no browser cookie support |
| `express-session` / `connect-mongo` | ❌ NOT installed | JWT only |
| Response envelope | `{ success, data, message? }` | Global TransformInterceptor |
| Pagination shape | `{ items, total, page, limit, hasMore }` | All list endpoints |
| Order items | Embedded snapshot (name+price+unit copied at creation) | No joins for display |
| Posts path | `POST /posts/add` (non-standard, matches frontend) | Frontend contract |
| Environments | `.env.development`, `.env.staging`, `.env.production` | Three env files |
| Global prefix | `/api` (set in main.ts) | Health is at `/api/health` |
| ObjectId to string | Use `.toHexString()` on `Types.ObjectId` fields | ESLint no-base-to-string |
| Farm Location | GeoJSON Point format | Required for `$geoNear` queries |
| Payment Provider | Stripe | Test keys in .env.development — no registration needed |
| Payment Auth Source | Stripe Webhook (POST /api/payments/webhook) | Authoritative — not redirect URL |
| Payment Frontend | expo-web-browser redirect flow | WebBrowser.openAuthSessionAsync → f2t:// deep link |
| Stripe rawBody | `rawBody: true` in NestFactory.create | Required for webhook signature verification |
| Delivery Provider | GHN (Giao Hàng Nhanh) | Vietnamese logistics, sandbox at dev-online-gateway.ghn.vn |
| Delivery Fallback | Dijkstra mock with HCMC road network | Used when GHN_TOKEN not configured |
| Shipment Auto-creation | Triggered on 'shipping' status | Fire-and-forget async task |
| Order field: customerId | `customerId` (NOT consumerId) | Schema and service use customerId |
| billingAddress | ❌ REMOVED entirely | Not needed — shipping address only |
| Email/Phone Verification | ❌ DISABLED (frontend bypass) | `needsVerification()` always returns false. Endpoints still exist on backend but never called. Re-enable by restoring logic in `src/api/auth/auth-actions.tsx` |

---

## Environment Configuration

### Backend (.env.development) — VERIFIED as of 2026-05-18
- `PORT`: 3000
- `MONGODB_URI`: mongodb://localhost:27017/f2t
- `JWT_SECRET`, `JWT_REFRESH_SECRET`: set
- `STRIPE_SECRET_KEY`: sk_test_51TVTvr... (real test key — populated)
- `STRIPE_PUBLISHABLE_KEY`: pk_test_51TVTvr... (real test key — populated)
- `STRIPE_WEBHOOK_SECRET`: whsec_81c6c... (set — from `stripe listen` output)
- `STRIPE_CURRENCY`: vnd
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: empty (local uploads only)
- `UPLOAD_BASE_URL`: http://192.168.1.4:3000
- **GHN vars are NOT set in .env.development** — delivery falls back to Dijkstra mock

### Backend — Recommender Sidecar vars (add to .env.development to enable)
- `RECOMMENDER_SIDECAR_URL`: `http://localhost:8001` (default). URL of the FastAPI recommender sidecar. If not set or sidecar is unreachable, the recommendations endpoint falls back to returning same-farm products (never 500).

### Backend — Dynamic Pricing vars (add to .env.development to enable)
- `PRICING_MODE`: `shadow` (default) or `advisory`. Shadow = internal KPI only. Advisory = farmers see/accept/reject suggestions; interceptor enriches product responses.
- `PRICING_SIDECAR_URL`: `http://localhost:8000` (default). URL of the FastAPI pricing sidecar.
- `PRICING_CRON_SCHEDULE`: `0 * * * *` (default — every hour). Standard cron expression for `runPricingTick`.
- `PRICING_SUGGESTION_TTL_HOURS`: `1` (default). How long a price override stays valid before expiring.

### Frontend (.env.development)
- `API_URL`: http://localhost:3000/api
- `SCHEME`: f2t (Deep linking scheme)

### To enable real GHN in test:
1. Register at https://khachhang.ghn.vn (free merchant account)
2. Get test token and shop ID from GHN dashboard
3. Set in .env.development:
   ```
   GHN_API_URL=https://dev-online-gateway.ghn.vn
   GHN_TOKEN=<your_test_token>
   GHN_SHOP_ID=<your_shop_id>
   GHN_SERVICE_ID=53321
   ```

---

## Seed Account Credentials

Run seed: `cd f2t-backend && npx ts-node -r tsconfig-paths/register src/seed/seed.ts`

| Role | Email | Password |
|---|---|---|
| **Admin** | admin@f2t.com | AdminF2T2026! |
| Farm owners | farm1@f2t.vn, farm2@f2t.vn, farm3@f2t.vn | SeedPass123! |
| Consumers | consumer1@f2t.vn, consumer2@f2t.vn, consumer3@f2t.vn | SeedPass123! |
| Suspended | suspended@f2t.vn | SeedPass123! |

Seed is idempotent — re-running clears all `_seeded: true` documents first.

---

## Current Project Status

**Last updated:** 2026-06-08
**Last session:** Phase 5 finalize — cross-sell / recommendations feature. New backend module `recommendations` (JWT-guarded, FP-Growth category rules via sidecar). New `recommender-sidecar` (FastAPI, port 8001). New offline pipeline `recommender-final/` (Instacart 2017 warm-start, category-level). Frontend cart screen shows cross-sell strip. GĐ2 retrain prep script `scripts/export_real_orders.py` added. 5/5 unit tests pass. ESLint clean.

| Phase | Status | Output |
|---|---|---|
| Frontend investigation | ✅ Complete | API contract extracted (7 domains) |
| Backend build | ✅ Complete | All modules implemented |
| Validation | ✅ Complete | Build ✅ Lint ✅ Tests pass |
| Feature: Verification | ✅ Built / ⏸ Bypassed | Endpoints exist, frontend redirect disabled |
| Feature: Upload Module | ✅ Complete | Cloudinary + local fallback |
| Feature: Search & Filter | ✅ Complete | Products & Farms geospatial + text |
| Feature: Profile Editing | ✅ Complete | Backend DTOs/Service + frontend |
| Tech Debt Cleanup | ✅ Complete | ObjectId, typed filters, dead code removed |
| Phase 5 — Posts | ✅ Complete | Mixed media, pagination, population |
| Phase 6 — Statistics | ✅ Complete | Consumer & Farm aggregations |
| Phase 7 — Notifications | ✅ Complete | In-App, Push, Low Stock, cron |
| Phase 8A — Stripe Payments | ✅ Complete | Stripe Checkout + webhook + auto-launch. 7 tests. |
| Phase 8B — GHN Delivery | ✅ Complete (gaps noted) | GHN provider + Dijkstra mock + MapView tracking. 4 tests. |
| Config Files Integration | ✅ Complete | jest.config.ts, .prettierrc, jest-setup.ts, jest-e2e.json |
| Code Cleanup | ✅ Complete | Stale comments removed, billingAddress purged, dead code removed |
| Phase 9 — Admin Module | ✅ Complete | 8 endpoints backend + 4 screens frontend + 4 tests + seed account |
| Filter & Pagination Overhaul | ✅ Complete | DTOs fixed, Axios params cleaned, geospatial product filter, order aggregation sort |
| Phase 8B Gap Fix | ✅ Complete | Dynamic weight (items × 100g), GHN webhook endpoint |
| Payment Pipeline Tests | ⏳ Pending | Manual E2E curl script (see Testing Plan section) |
| Phase 10 — Dynamic Pricing (backend) | ✅ Complete (Tasks 1–3) | Sidecar + NestJS module + interceptor + cron. Shadow + advisory modes. 6 service tests + 6 interceptor tests. |
| Phase 10 — Dynamic Pricing (frontend) | ✅ Complete | CoreML freshness scan, price-suggestions screen, product card enrichment |
| Phase 10 — Dynamic Pricing (graduation) | ✅ Complete | Shadow KPI validation, INTEGRATION.md, advisory graduation checklist |
| Phase 11 — Cross-sell Recommender | ✅ Complete (GĐ1) | FP-Growth category rules, sidecar port 8001, backend module, frontend cart strip. Product-level (GĐ2) pending real order data. |
| Phase 12 — Demand Forecast | ❌ Removed | Module deleted from backend and frontend |

---

## Module Status

| Module | Built | Tested | Lint clean | Notes |
|---|---|---|---|---|
| Auth | ✅ | ✅ | ✅ | JWT, refresh token, bcrypt, OTP endpoints exist but frontend bypass active |
| Users | ✅ | ✅ | ✅ | pushToken (select: false), PUT /push-token |
| Farms | ✅ | ✅ | ✅ | Geospatial $geoNear, address/location, verificationStatus; search matches name+description |
| Products | ✅ | ✅ | ✅ | Low stock triggers; two-stage geospatial filter (farms $near → products $in); inSeason filter; price sort alias |
| Orders | ✅ | ✅ | ✅ | Stripe fields, GHN fields, tracking steps. No billingAddress. paymentStatus/date-range filters; $lookup aggregation for customerName/farmName sort |
| Posts | ✅ | ✅ | ✅ | Mixed media, pagination, population |
| Notifications | ✅ | ✅ | ✅ | Expo Push, unread counts, cron |
| Uploads | ✅ | ✅ | ✅ | images, videos, multi-media |
| Payments | ✅ | ✅ | ✅ | Stripe checkout + webhook. 7 tests. |
| Delivery | ✅ | ✅ | ✅ | GHN provider + Dijkstra mock. 4 tests. |
| Admin | ✅ | ✅ | ✅ | 8 endpoints, AdminGuard, isBanned+verificationStatus. 4 tests. Seed account: admin@f2t.com |
| DynamicPricing | ✅ | ✅ | ✅ | Shadow + advisory modes. 5 routes. PricingTick cron. DynamicPricingInterceptor (APP_INTERCEPTOR). 6 service tests + 6 interceptor tests. Requires pricing-sidecar running (FastAPI). |
| Recommendations | ✅ | ✅ (5/5) | ✅ | GET /api/recommendations/cross-sell. JWT-guarded. Calls recommender-sidecar (port 8001). Graceful fallback: same-farm products when sidecar down. Category-level only (GĐ1). |
| DemandForecast | ❌ Removed | — | — | Module deleted (backend + sidecar + frontend). |

---

## Known Issues & Tech Debt

| ID | Severity | Description | Status |
|---|---|---|---|
| TD-001 | ✅ Fixed | ObjectId `.toHexString()` workaround | Fixed |
| TD-002 | ✅ Fixed | docker-compose.yml obsolete version attribute | Fixed |
| TD-003 | ✅ Fixed | FarmsService injects OrderModel + ProductModel cross-module | Fixed |
| TD-004 | ⚠️ Pending | Docker smoke test not run | Must verify manually |
| TD-007 | 🟡 Low | SMS Service is a stub (console.log only) | Open |
| TD-008 | 🟡 Low | Push notification failure is fire-and-forget | Intentional |
| TD-011 | 🟡 Low | GHN credentials not set — delivery uses mock | Open (see GHN setup above) |
| TD-014 | ✅ Fixed | Checkout screen now auto-launches Stripe after order creation | Fixed |
| TD-015 | ✅ Fixed | `any` types in dynamic-pricing.service.ts — added SidecarOverride interface, typed getSuggestionsForOwner return | Fixed |
| TD-016 | ✅ Fixed | Delivery weight now calculated: items.reduce(sum + qty × 100g) | Fixed |
| TD-017 | ✅ Fixed | payments.service.spec.ts — 7 tests added | Fixed |
| TD-018 | ✅ Fixed | delivery.service.spec.ts — 4 tests added | Fixed |
| TD-019 | ✅ Fixed | GHN webhook at POST /api/delivery/webhook/ghn — appends tracking steps and maps delivered/cancelled to order status | Fixed |
| TD-020 | ✅ Fixed | billingAddress completely removed from frontend and backend | Fixed |
| TD-021 | ✅ Fixed | Config files integrated: jest.config.ts, .prettierrc, jest-setup.ts, jest-e2e.json | Fixed |
| TD-022 | ✅ Fixed | Stale comment removed from main.ts | Fixed |
| TD-023 | ✅ Fixed | Dead commented code removed from orders.service.ts | Fixed |
| TD-024 | 🟡 Low | Email/phone verification disabled (frontend bypass). Re-enable when SMS/email provider ready. | Intentional — restore `needsVerification()` in `src/api/auth/auth-actions.tsx` |
| TD-025 | ✅ Fixed | Filter DTOs missing @Type(() => Number) on numeric params — caused string comparison bugs | Fixed |
| TD-026 | ✅ Fixed | Orders GET response used key `orders` instead of `items` — broke frontend pagination contract | Fixed |
| TD-027 | ✅ Fixed | Frontend hooks used URLSearchParams strings; location object leaked into Axios params | Fixed |
| TD-028 | ✅ Fixed | Products had no geospatial filter — implemented two-stage $near farms → $in products | Fixed |
| TD-029 | ✅ Fixed | Orders could not sort by customerName/farmName — implemented $lookup aggregation pipeline | Fixed |
| TD-030 | ✅ Fixed | products.module.ts did not register FarmSchema — required after TD-028 injection | Fixed |
| TD-031 | ✅ Fixed | DynamicPricing: duplicate productId index warning (schema defines unique, Mongoose also auto-creates) — harmless but noisy in logs | Fixed |
| TD-032 | ✅ Fixed | CoreML freshness classifier not yet wired to frontend (Tasks 4–5) | Fixed |
| TD-033 | ✅ Fixed | Farmer price-suggestions screen not yet built (Task 6) | Fixed |
| TD-034 | ✅ Fixed | Product card dynamic price enrichment not yet built (Task 7) | Fixed |
| TD-035 | ✅ Fixed | Dynamic pricing graduation checklist + INTEGRATION.md not yet written (Task 8) | Fixed |

---

## All API Endpoints (source of truth)

| Method | Path | Module | Auth | Role | Notes |
|---|---|---|---|---|---|
| POST | /api/auth/login | Auth | No | Any | |
| POST | /api/auth/register | Auth | No | Any | |
| POST | /api/auth/refresh-token | Auth | No | Any | |
| GET | /api/auth/me | Auth | Yes | Any | |
| POST | /api/auth/send-email-verification | Auth | No | Any | Exists but frontend no longer calls it |
| POST | /api/auth/verify-email | Auth | No | Any | Exists but frontend no longer calls it |
| POST | /api/auth/send-phone-verification | Auth | No | Any | Exists but frontend no longer calls it |
| POST | /api/auth/verify-phone | Auth | No | Any | Exists but frontend no longer calls it |
| GET | /api/users/profile | Users | Yes | Any | |
| GET | /api/users/profile/stats | Users | Yes | Any | |
| GET | /api/users/:id | Users | Yes | Any | |
| PUT | /api/users/profile | Users | Yes | Any | |
| PUT | /api/users/push-token | Users | Yes | Any | Saves Expo push token |
| GET | /api/farms | Farms | No | Any | search, isActive, lat/lng/radius |
| POST | /api/farms | Farms | Yes | farm | |
| GET | /api/farms/:id | Farms | No | Any | |
| PUT | /api/farms/:id | Farms | Yes | farm | |
| GET | /api/farms/:id/analytics | Farms | Yes | farm | FarmStats payload |
| GET | /api/products | Products | No | Any | search, category, farmId, price, organic, stock |
| POST | /api/products | Products | Yes | farm | |
| GET | /api/products/:id | Products | No | Any | |
| PUT | /api/products/:id | Products | Yes | farm | |
| DELETE | /api/products/:id | Products | Yes | farm | |
| PATCH | /api/products/:id/stock | Products | Yes | farm | |
| GET | /api/orders | Orders | Yes | Any | status, page, limit |
| POST | /api/orders | Orders | Yes | consumer | |
| GET | /api/orders/:id | Orders | Yes | Any | |
| PUT | /api/orders/:id | Orders | Yes | Any | |
| PATCH | /api/orders/:id/status | Orders | Yes | farm | |
| GET | /api/orders/stats | Orders | Yes | Any | |
| GET | /api/posts | Posts | No | Any | page, limit |
| GET | /api/posts/:id | Posts | No | Any | |
| POST | /api/posts/add | Posts | Yes | Any | Non-standard path — frontend contract |
| GET | /api/notifications | Notifications | Yes | Any | items + unreadCount |
| PATCH | /api/notifications/read-all | Notifications | Yes | Any | |
| PATCH | /api/notifications/:id/read | Notifications | Yes | Any | |
| GET | /api/notifications/user/:userId/unread-count | Notifications | Yes | Any | |
| PUT | /api/notifications/preferences | Notifications | Yes | Any | |
| POST | /api/uploads/image | Uploads | Yes | Any | |
| POST | /api/uploads/video | Uploads | Yes | Any | |
| POST | /api/uploads/media | Uploads | Yes | Any | |
| POST | /api/payments/checkout | Payments | Yes | consumer | Body: { orderId } → { sessionId, url } |
| POST | /api/payments/webhook | Payments | No | — | Stripe webhook (raw body, signature verified) |
| GET | /api/delivery/orders/:orderId/tracking | Delivery | Yes | Any | TrackingResponse |
| POST | /api/delivery/orders/:orderId/create-shipment | Delivery | Yes | farm | Trigger GHN shipment |
| POST | /api/delivery/webhook/ghn | Delivery | No | — | GHN push webhook. Body: GhnWebhookDto. Appends tracking step + maps terminal statuses to order.status. |
| GET | /api/admin/users | Admin | Yes | admin | Paginated users. Params: page, limit, search, role, isBanned |
| PATCH | /api/admin/users/:id/ban | Admin | Yes | admin | Body: { isBanned: boolean } |
| PATCH | /api/admin/users/:id/role | Admin | Yes | admin | Body: { role: 'consumer'\|'farm'\|'admin' } |
| GET | /api/admin/farms | Admin | Yes | admin | Paginated farms. Params: page, limit, search, verificationStatus |
| PATCH | /api/admin/farms/:id/verify | Admin | Yes | admin | Body: { verificationStatus: 'verified'\|'rejected', reason? } |
| GET | /api/admin/orders | Admin | Yes | admin | All orders. Params: page, limit, status, paymentStatus |
| GET | /api/admin/analytics | Admin | Yes | admin | Platform-wide stats (totals, revenue, breakdowns) |
| GET | /api/admin/products | Admin | Yes | admin | All products. Params: page, limit, search, farmId |
| GET | /api/recommendations/cross-sell | Recommendations | Yes | Any | Query: productIds (comma-sep ObjectIds), limit (default 6). Returns `{ success, data: Product[] }`. Calls recommender-sidecar; falls back to same-farm products if sidecar unreachable. |
| POST | /api/dynamic-pricing/freshness/:productId | DynamicPricing | Yes | Any | Body: { score: number 0–1 }. Stores reading, returns { medianScore, freshnessTag } |
| GET | /api/dynamic-pricing/suggestions | DynamicPricing | Yes | farm | Pending price suggestions for caller's farms. Returns { items, total } |
| PATCH | /api/dynamic-pricing/suggestions/:id/accept | DynamicPricing | Yes | farm | Accept a price suggestion. ForbiddenException if not farm owner. |
| PATCH | /api/dynamic-pricing/suggestions/:id/reject | DynamicPricing | Yes | farm | Reject a price suggestion. ForbiddenException if not farm owner. |
| GET | /api/dynamic-pricing/shadow-report | DynamicPricing | Yes | admin | KPI report: mode, shadowDays, safetyClipRate, advisoryStats |

---

## How to Re-enable Verification

File: `f2t-frontend/src/api/auth/auth-actions.tsx` — function `needsVerification`.

Restore:
```typescript
const needsEmail = !user.emailVerified;
const needsPhone = !user.phoneVerified;
const needsAny = needsEmail || needsPhone;
return { needsEmail, needsPhone, needsAny };
```

Also wire up an SMS/email provider in the backend `email.service.ts` and ensure `SMTP_*` env vars are set.

---

## Start order
1. `docker start f2t-mongo` (or ensure MongoDB is running)
2. `cd pricing-sidecar && uvicorn main:app --port 8000`
3. `cd recommender-sidecar && ./venv/bin/uvicorn main:app --port 8001`
4. `cd f2t-backend && npm run start:dev`

---

## Dynamic Pricing — Architecture Notes

### Components
- **`pricing-sidecar/`** — standalone FastAPI service (Python 3.11). Loads stateless Double-DQN checkpoints from `dynamic-pricing-v2/checkpoints/` and CoreML freshness classifiers from `freshnessmodels-1/`. Exposes `POST /predict`, `POST /freshness/classify`, and `GET /health`. Start: `cd pricing-sidecar && uvicorn main:app --port 8000`.
- **`f2t-backend/src/modules/dynamic-pricing/`** — NestJS module wrapping the sidecar. Isolated — no changes to any other module's controller/service.
- **`f2t-backend/src/common/interceptors/dynamic-pricing.interceptor.ts`** — `APP_INTERCEPTOR` that enriches `/api/products` responses with `dynamicPrice`, `freshnessScore`, `priceTag` from accepted overrides. Only active when `PRICING_MODE=advisory`.

### MongoDB Collections (new)
- `price_overrides` — lifecycle: `shadow` → `pending_review` → `accepted`/`rejected`/`expired`. TTL index on `expiresAt`. Index on `{ productId, status }`.
- `freshness_cache` — last 5 readings per product, median score, 6h TTL. Unique index on `productId`.

### Deployment Phases
1. **Shadow** (`PRICING_MODE=shadow`): Sidecar runs hourly, overrides stored as `status='shadow'`. No farmer-visible changes. KPI tracked via `/api/dynamic-pricing/shadow-report`.
2. **Advisory** (`PRICING_MODE=advisory`): Overrides stored as `status='pending_review'`. Farmers notified via push. Accept/reject via API. Accepted overrides surface as `dynamicPrice` on product responses.
3. **Live** (out of scope): Direct price writes to `products.pricePerUnit`.

### Sidecar Checkpoint Locations
- DQN agents (v2): `dynamic-pricing-v2/checkpoints/dqn_{leafy,root,fruit,herbs}.pt` — saved as `{"online": state_dict}` by `DoubleDQN.save()`. QNet: 5-dim obs → 128 → 128 → 5 actions.
- Freshness classifiers (CoreML): `freshnessmodels-1/MyFreshnessClassifier-{fruit,root}.mlmodel` — available for macOS only; Weibull fallback used for other categories or non-macOS.
- Archived models (do not use): `untouch/dynamic-pricing-continuous/` (TD3), `untouch/dynamic_pricing_1_copy/` (old QMIX/MADDPG).

### Weibull Fallback (when no freshness scan available)
- vegetables/leafy: λ=0.97, fruits: λ=0.985, herbs: λ=0.96, other: λ=0.995. Freshness = λ^24.

---

## Cross-sell Recommender — Architecture Notes (GĐ1)

### Components
- **`recommender-final/`** — offline Python pipeline. Generates synthetic baskets (Instacart 2017 category distribution), mines FP-Growth association rules via `scripts/mine_rules.py`, outputs `model/category_rules.json` + `model/category_popularity.json`.
- **`recommender-sidecar/`** — standalone FastAPI service (Python). Loads `category_rules.json` at startup. Exposes `POST /recommend` (body: `{cart_categories, top_k}`) and `GET /health`. Start: `cd recommender-sidecar && ./venv/bin/uvicorn main:app --port 8001`. Controlled by `RECOMMENDER_SIDECAR_URL` in backend env.
- **`f2t-backend/src/modules/recommendations/`** — NestJS module. `GET /api/recommendations/cross-sell?productIds=...&limit=6`. JWT-guarded. Maps product categories to sidecar, fetches recommended category products from MongoDB, returns envelope `{ success, data: Product[] }`.
- **Frontend** — cart screen shows horizontal cross-sell strip below cart items. Uses `useRecommendations` hook.

### Backend E2E (manual — requires live MongoDB + seeded data + JWT)
```bash
# 1. Login to get token
TOKEN=$(curl -s -X POST localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"consumer1@f2t.vn","password":"SeedPass123!"}' | jq -r '.data.accessToken')

# 2. Get a product ID (e.g., from product listing)
PRODUCT_ID=<some ObjectId from GET /api/products>

# 3. Call cross-sell
curl -H "Authorization: Bearer $TOKEN" \
  "localhost:3000/api/recommendations/cross-sell?productIds=$PRODUCT_ID&limit=6"
```

### Known Limitations (GĐ1 — truthful)
- **Category-level only:** The warm-start model is 10-category × 10-category (e.g., leafy → herbs). It does NOT predict at product level.
- **External training data:** Trained on synthetic baskets derived from Instacart 2017 distribution mapped to F2T categories. Not trained on real F2T purchase history.
- **No personalization:** No user history used. All users with the same cart categories receive identical recommendations.
- **Cart screen only:** Cross-sell UI is shown only in the cart screen, not on product detail pages.
- **GĐ2 (future):** Product-level retrain on real F2T orders. Script: `recommender-final/scripts/export_real_orders.py` (requires `MONGODB_URI`, needs ≥200 multi-item baskets).

---

## Phase 8B Gaps — Delivery Improvements

1. **Dynamic weight:** Replace hardcoded 500g in `delivery.service.ts:createShipment()` with `order.items.reduce((sum, i) => sum + (i.quantity * 100), 0)` (100g per item unit)
2. **GHN webhook:** Add `POST /api/delivery/webhook/ghn` endpoint to receive push updates from GHN instead of polling
3. **Test environment:** See GHN setup instructions in Environment Configuration section above

---

## Testing Plan — Payment + Buying Pipeline

### Backend Tests (all complete)
- `payments.service.spec.ts` — 7 tests: checkout session creation, webhook handling, signature validation
- `delivery.service.spec.ts` — 4 tests: mock fallback, DB data, GHN not configured, GHN failure
- `admin.service.spec.ts` — 4 tests: analytics, users, farms, orders

### E2E Test Script (manual curl)
Key steps:
1. Register farm + consumer users
2. Farm creates product
3. Consumer creates order (paymentMethod: 'stripe')
4. Consumer calls POST /api/payments/checkout → get URL
5. Simulate: `stripe trigger checkout.session.completed --add checkout_session:metadata.orderId=$ORDER_ID`
6. Verify order.paymentStatus === 'paid'
7. Farm updates order status to 'shipping' → triggers GHN shipment creation (mock)
8. Consumer calls GET /api/delivery/orders/:id/tracking → verify mock response with route

---

---

## How to Start Any New Session

```
Read CONTEXT.md first. That is your memory.
Do not rely on anything else.
Your task for this session: [describe the task]
```

---

## Update Instructions (agent fills this out at session end)

At the end of every session, update:
1. "Last updated" date
2. "Last session" description
3. Phase status table
4. Module status table
5. Known Issues table (add new ones, mark resolved ones)
6. Anything else that changed

Then output the updated CONTEXT.md in full.
