# F2T Backend

REST API and business logic for the Farm-to-Table marketplace.

**Stack:** NestJS 11 · TypeScript 5.7 · MongoDB 7 (Mongoose) · Redis · Stripe · GHN · JWT.

API is served under the global prefix **`/api`**, with interactive docs at **`/api-docs`** (Swagger).

---

## Quick start

```bash
npm install
# configure environment (see below) in .env.development
npm run seed          # demo accounts, farms, products, posts
npm run start:dev     # watch mode → http://localhost:3000
```

| Command | Purpose |
|---|---|
| `npm run start:dev` | Dev server (watch) |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run compiled build |
| `npm test` | Unit tests (Jest + `mongodb-memory-server`) |
| `npm run test:e2e` | E2E tests (Supertest) |
| `npm run test:cov` | Coverage |
| `npm run lint` | ESLint (`--fix`) |
| `npm run seed` | Seed demo data |
| `npm run seed:images` | Seed demo images |
| `npx jest path/to/file.spec.ts` | Single test file |

---

## Running the infrastructure (MongoDB, Redis, Stripe)

The API needs **MongoDB** (required) and optionally **Redis** (forecast cache) and
**Stripe** (payments). Pick whichever setup fits.

### Option A — Docker (MongoDB + API)

`docker-compose.yml` builds the API from the `Dockerfile` and runs **MongoDB 7** alongside it:

```bash
docker compose up --build      # API on :3000, MongoDB on :27017
```

> The compose file does **not** include Redis. If you need the forecast cache, run Redis
> separately (Option B) and set `REDIS_URL`. Without it the demand-forecasting cache is
> simply skipped.

### Option B — Local dev (run dependencies, then `npm run start:dev`)

```bash
# MongoDB 7
docker run -d --name f2t-mongo -p 27017:27017 mongo:7.0
#   or, if installed locally:  brew services start mongodb-community@7.0

# Redis (optional — forecast cache)
docker run -d --name f2t-redis -p 6379:6379 redis:7
#   or:  brew services start redis
```

Then point `.env.development` at them and start the API:

```
MONGODB_URI=mongodb://localhost:27017/f2t
REDIS_URL=redis://localhost:6379
```

```bash
npm run seed && npm run start:dev
```

### Stripe (payments — optional)

Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, then forward webhook events to the
local API (the **webhook is authoritative**, not the redirect URL):

```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
```

Copy the `whsec_…` it prints into `STRIPE_WEBHOOK_SECRET` so signatures match. Without any
Stripe vars the app still boots — payment endpoints just degrade gracefully.

---

## Modules

All modules live under `src/modules/<name>/` with `*.module.ts`, `*.controller.ts`,
`*.service.ts`, `schemas/`, `dto/`, and `*.spec.ts`.

| Module | Responsibility |
|---|---|
| `auth` | JWT login / register / refresh, OTP endpoints (disabled in frontend) |
| `users` | Profile, stats, push token (`pushToken` is `select: false`) |
| `farms` | Geospatial `$geoNear` queries, `verificationStatus`, analytics |
| `products` | Category/price/stock filters, low-stock notification trigger, dynamic-price embedding |
| `orders` | Full lifecycle, embedded item snapshots, Stripe + GHN fields, applies accepted price overrides |
| `posts` | Mixed-media community feed, pagination, author population |
| `reviews` | Product reviews & ratings |
| `notifications` | Expo Push, unread counts, cron for low-stock alerts |
| `uploads` | Cloudinary (if configured) → local `uploads/` fallback |
| `payments` | Stripe Checkout + webhook (**webhook is authoritative**, not the redirect URL) |
| `delivery` | GHN provider → Dijkstra mock fallback when `GHN_TOKEN` unset |
| `admin` | `AdminGuard`, ban/verify/role-change, platform analytics |
| `dynamic-pricing` | Hourly pricing cron → pricing sidecar `/predict`; freshness via `/freshness/classify`; override review workflow |
| `demand-forecasting` | Calls pricing sidecar `/forecast`, caches results in Redis |
| `recommendations` | Cart cross-sell via recommender sidecar `/recommend` |

Shared code lives in `src/common/` (guards, decorators, filters, interceptors, pagination DTOs, Redis).

### AI sidecar integration

The pricing and recommendation features delegate inference to the two Python sidecars
(see repo root README). They are **optional**: on any sidecar error the service logs a
warning and degrades gracefully (zeros / fallback / no override). Relevant pieces:

- `DynamicPricingInterceptor` embeds `dynamicPrice` / `freshnessScore` / `priceTag` into product responses.
- The pricing cron (`PRICING_CRON_SCHEDULE`, default hourly) computes suggestions per product.
- `PRICING_MODE=shadow` records suggestions without applying them; `advisory` marks them `pending_review`
  for the farm owner. Only an **accepted** `PriceOverride` is applied to listings, cart, and orders.

---

## Global wiring (`src/main.ts` / `app.module.ts`)

- `rawBody: true` on `NestFactory.create` — required for Stripe webhook signature verification.
- Global prefix `/api`; CORS enabled; static assets served from `/uploads/`.
- Global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`).
- Global `TransformInterceptor` wraps every response as `{ success, data, message? }`.
- Global `HttpExceptionFilter` for a consistent error shape.
- Swagger document at `/api-docs`.

---

## Environment

Loaded from `.env.${NODE_ENV}` (default `.env.development`). Validated by Joi at boot.

| Variable | Required | Default | Notes |
|---|---|---|---|
| `PORT` | — | `3000` | |
| `MONGODB_URI` | ✅ | — | |
| `JWT_SECRET` | ✅ | — | |
| `JWT_REFRESH_SECRET` | ✅ | — | |
| `JWT_EXPIRATION` | — | `1h` | |
| `JWT_REFRESH_EXPIRATION` | — | `7d` | |
| `UPLOAD_BASE_URL` | — | — | Set to your **LAN IP** (not `localhost`) so devices can load uploaded images |
| `REDIS_URL` | — | `redis://localhost:6379` | Forecast cache |
| `PRICING_SIDECAR_URL` | — | `http://localhost:8000` | |
| `RECOMMENDER_SIDECAR_URL` | — | `http://localhost:8001` | |
| `PRICING_MODE` | — | `shadow` | `shadow` \| `advisory` |
| `PRICING_CRON_SCHEDULE` | — | `0 * * * *` | Hourly |
| `PRICING_SUGGESTION_TTL_HOURS` | — | `1` | |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_CURRENCY` | — | (`vnd`) | App degrades gracefully if unset |
| `GHN_API_URL` / `GHN_TOKEN` / `GHN_SHOP_ID` / `GHN_SERVICE_ID` | — | (`53321`) | Without `GHN_TOKEN`, delivery uses the Dijkstra mock |

For running MongoDB / Redis / Stripe locally, see
[Running the infrastructure](#running-the-infrastructure-mongodb-redis-stripe) above.

---

## Seed accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@f2t.com` | `AdminF2T2026!` |
| Farm owner | `farm1@f2t.vn` … | `SeedPass123!` |
| Consumer | `consumer1@f2t.vn` … | `SeedPass123!` |
| Suspended (test) | `suspended@f2t.vn` | `SeedPass123!` |

---

## Conventions

- Every controller method needs a `*.spec.ts` unit test and Swagger decorators (`@ApiOperation`, `@ApiResponse`).
- Tests use `mongodb-memory-server` — never connect to a real DB in tests.
- Path aliases: `@/` → `src/`, `@modules/` → `src/modules/`, `@common/` → `src/common/`.
- Run `npm run lint && npm test` before marking a module done.

See the repository-root `CLAUDE.md` for the full list of **locked decisions** (response
envelope, pagination shape, embedded order snapshots, payment authority, etc.) — do not
change those without developer approval.
