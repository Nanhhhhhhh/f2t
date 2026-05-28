# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**F2T (Farm to Table)** — a mobile marketplace connecting Vietnamese farms and consumers.

- `f2t-frontend/` — React Native + Expo SDK 53 (pnpm, file-based routing via Expo Router)
- `f2t-backend/` — NestJS 11 + TypeScript 5.7 + MongoDB 7 + Mongoose

**Always read `CONTEXT.md` at the start of a new session.** It is the authoritative project memory (module status, known issues, API contracts, seed credentials).

---

## Commands

### Backend (`cd f2t-backend`)

```bash
npm run start:dev       # dev server with watch
npm run build           # compile to dist/
npm run test            # unit tests (Jest, mongodb-memory-server)
npm run test:e2e        # E2E tests (Supertest)
npm run test:cov        # coverage report
npm run lint            # ESLint --fix
npm run seed            # seed DB with demo accounts
npx jest src/modules/payments/payments.service.spec.ts  # single test file
```

### Frontend (`cd f2t-frontend`)

```bash
pnpm start              # Expo dev server
pnpm android            # run on Android
pnpm ios                # run on iOS
pnpm test               # Jest
pnpm test:watch         # Jest watch mode
pnpm lint               # ESLint
pnpm type-check         # tsc --noemit
pnpm check-all          # lint + type-check + lint:translations + test
npx jest src/components/ui/button.test.tsx  # single test file
```

---

## Architecture

### Backend

All modules live in `src/modules/<name>/` with: `module.ts`, `controller.ts`, `service.ts`, `schema.ts`, `dto/`, and `*.spec.ts`.

Shared code: `src/common/` (guards, decorators, filters, interceptors, pagination DTOs).

| Module | Key responsibility |
|---|---|
| Auth | JWT login/register/refresh, OTP endpoints (disabled in frontend) |
| Users | Profile, stats, push token (`pushToken` is `select: false` by default) |
| Farms | Geospatial `$geoNear` queries, verificationStatus, analytics |
| Products | Category/price/stock filters, low-stock notification trigger |
| Orders | Full lifecycle, embedded item snapshots, Stripe fields, GHN fields |
| Posts | Mixed-media community feed, pagination, author population |
| Notifications | Expo Push, unread counts, cron for low-stock alerts |
| Uploads | Cloudinary (if configured) → local `uploads/` fallback |
| Payments | Stripe Checkout + webhook (webhook is authoritative, not redirect URL) |
| Delivery | GHN provider → Dijkstra mock fallback when `GHN_TOKEN` not set |
| Admin | AdminGuard, ban/verify/role-change, platform analytics |

Global wiring in `main.ts`:
- `rawBody: true` on `NestFactory.create` — required for Stripe webhook signature
- Global prefix: `/api`
- Global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`
- Global `TransformInterceptor` wraps all responses in `{ success, data, message? }`
- Global `HttpExceptionFilter` for consistent error shape
- Swagger at `/api-docs`

### Frontend

File-based routing via Expo Router under `src/app/`:
- `(app)/` — authenticated consumer routes (orders, payment, profile)
- `(app)/farm/` — authenticated farm-owner routes
- `(admin)/` — admin screens
- `checkout/`, `farms/`, `products/`, `feed/`, `notifications/`, `settings/` — public or shared

State management: Zustand stores in `src/lib/auth/` and `src/lib/cart/`. Tokens stored in MMKV (never cookies).

API layer: `src/api/<domain>/` — each domain has `types.tsx` + `use-*.tsx` hooks built with `react-query-kit`. The Axios client in `src/api/common/client.tsx` sets `Authorization: Bearer <token>` and handles 401 → token refresh.

Styling: NativeWind (Tailwind for RN). Use `src/components/ui/` primitives. Use only colors/fonts defined in `tailwind.config.js`.

---

## Locked Decisions — Do Not Change Without Developer Approval

| Decision | Value |
|---|---|
| Auth mechanism | JWT Bearer token (MMKV storage, no cookies) |
| Response envelope | `{ success, data, message? }` — enforced by TransformInterceptor |
| Pagination shape | `{ items, total, page, limit, hasMore }` — all list endpoints |
| Order items | Embedded snapshots (name+price+unit copied at creation — no joins) |
| Posts creation path | `POST /api/posts/add` (non-standard — matches frontend contract) |
| ObjectId serialization | `.toHexString()` (ESLint `no-base-to-string` enforced) |
| Farm location | GeoJSON Point `{ type: 'Point', coordinates: [lng, lat] }` |
| Payment authority | Stripe webhook (`POST /api/payments/webhook`) — not the redirect URL |
| Delivery fallback | Dijkstra mock — active when `GHN_TOKEN` not set |
| Order field | `customerId` (not `consumerId`) |
| Email/phone verification | Disabled in frontend — `needsVerification()` in `src/api/auth/auth-actions.tsx` always returns false |

---

## Environment Setup

Backend env file loaded by `NODE_ENV`: `.env.development` (default), `.env.staging`, `.env.production`.

Required vars: `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`. Stripe and GHN vars are optional — app degrades gracefully.

`UPLOAD_BASE_URL` must be set to the LAN IP (not `localhost`) so mobile devices can load uploaded images (e.g., `http://192.168.1.x:3000`).

Stripe local testing requires `stripe listen --forward-to localhost:3000/api/payments/webhook` to be running so `STRIPE_WEBHOOK_SECRET` matches.

---

## Key Conventions

### Backend
- Every controller method needs a unit test (`.spec.ts`) and Swagger decorators (`@ApiOperation`, `@ApiResponse`).
- Tests use `mongodb-memory-server` — never connect to a real DB in tests.
- Run `npm run lint && npm test` before marking any module done.
- Path aliases in tests: `@/` → `src/`, `@modules/` → `src/modules/`, `@common/` → `src/common/`.

### Frontend
- All file/directory names: kebab-case.
- All imports use `@/` alias (maps to `src/`).
- Use `types` over `interfaces`; avoid `enum` — use `const` objects with `as const`.
- Components: functional only, max ~80 lines, named exports.
- Install new packages with `npx expo install <package>` (not `pnpm add`) to get compatible versions.
- Commit message prefixes: `feat:`, `fix:`, `perf:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`.

---

## Task Workflow (Cursor Rules)

When implementing features from a PRD in `tasks/`:
1. Use `tasks/prd-*.md` as the spec and `tasks/tasks-prd-*.md` for the checklist.
2. Complete one sub-task at a time; mark `[x]` after each; pause for user confirmation before the next.
3. When all sub-tasks in a parent task are done: run tests → stage → commit (conventional commit format) → mark parent `[x]`.
