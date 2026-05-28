# RULE.md — F2T Backend Rebuild Agent Rules

> These rules are **non-negotiable**. The agent must follow every rule in this file at all times. Any deviation must be flagged to the developer before proceeding.

---

## 1. IDENTITY & SCOPE

- You are a **backend engineer** rebuilding the `f2t-backend` service so it **perfectly serves the existing frontend** without requiring any frontend changes.
- Your single source of truth is: **what the frontend expects**. The backend must conform to the frontend — not the other way around.
- You do **not** invent endpoints, fields, or behaviors. Everything you build must be traceable to a frontend file.

---

## 2. MANDATORY TECH STACK

You must use **exactly** the following stack. No substitutions without explicit developer approval.

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | 20.x (alpine) |
| Language | TypeScript | 5.7.3 |
| Framework | NestJS | 11.0.1 |
| HTTP Platform | Express.js | v5 |
| Database | MongoDB | 7.0 |
| ODM | Mongoose + @nestjs/mongoose | 8.19.1 / 11.0.3 |
| Auth | @nestjs/jwt + passport + passport-jwt | latest compatible |
| Password Hashing | bcrypt | 6.0.0 |
| Validation | class-validator + class-transformer | 0.14.2 / 0.5.1 |
| Config | @nestjs/config | 4.0.2 |
| API Docs | Swagger / OpenAPI 3.0 (swagger-ui-express) | 5.0.1 |
| Testing | Jest + ts-jest + Supertest | 30.0.0 / 7.1.4 |
| Test DB | mongodb-memory-server | 10.2.3 |
| Linting | ESLint v9 + typescript-eslint | — |
| Formatting | Prettier | 3.4.2 |
| Build | tsc + @nestjs/cli | 11.0.0 |
| Containerization | Docker (multi-stage) + Docker Compose | — |

> ❌ `express-session` and `connect-mongo` are **NOT used** in this project. JWT Bearer tokens are the confirmed auth mechanism.

---

## 2a. CONFIRMED RESPONSE CONTRACTS

**All API responses must follow this envelope — no exceptions:**
```json
{ "success": true, "data": <payload>, "message": "optional string" }
```

**All paginated list responses must follow this shape — no exceptions:**
```json
{ "items": [], "total": 0, "page": 1, "limit": 10, "hasMore": false }
```

**Order items must be stored as embedded snapshots** (product name + price copied at order creation time — no joins required for display).

---

## 3. ARCHITECTURE RULES

### 3.1 Module Structure
- Every domain must live in its own **NestJS module**. Confirmed domains from investigation:

| Module | Frontend source | Notes |
|---|---|---|
| `AuthModule` | `src/api/auth/` | Login, register, refresh-token, me — JWT |
| `UsersModule` | `src/api/users/` | Profile, role management |
| `FarmsModule` | `src/api/farms/` | Farm profiles, analytics, discovery |
| `ProductsModule` | `src/api/products/` | Listings, categories, filters, stock |
| `OrdersModule` | `src/api/orders/` | Full order lifecycle, status, stats |
| `PostsModule` | `src/api/posts/` | Community/feed posts — discovered in investigation |
| `NotificationsModule` | `src/api/notifications/` | Read status, preferences — discovered in investigation |

- Each module must contain: `module.ts`, `controller.ts`, `service.ts`, `schema.ts`, and a `dto/` folder.
- Shared logic (guards, decorators, middleware) lives in `src/common/`.
- Do **not** cross-import between domain modules — use shared services or events instead.

### 3.2 API Design
- All routes must be **RESTful** and match the frontend's expected paths **exactly** (method + path + response shape).
- Response shapes must match the frontend types **field-for-field** — including optional fields, nested objects, and array structures.
- Use **standard HTTP status codes**: `200`, `201`, `400`, `401`, `403`, `404`, `409`, `500`.
- All responses must follow a **consistent JSON envelope** shape.

**Pagination:** The frontend uses `react-query-kit` with infinite scroll hooks. All list endpoints must support `?page=` and `?limit=` (or `?cursor=`) query params. Investigate `src/api/*/use-*.tsx` to determine which pagination style the frontend expects.

**CORS — Mobile override:** React Native Expo apps do **not** send browser-style CORS preflight requests for native HTTP calls. However, if the app also runs on Expo Web (via browser), CORS must still be configured. Set `origin` broadly for development (`*`) and restrict per environment in staging/production. Do **not** hardcode `localhost:8081` as the only allowed origin.

**Roles:** The frontend has two roles — `consumer` and `farm`. Role-based guards must be implemented:
- `consumer` — can browse products, place orders, manage own profile
- `farm` — can manage farm profile, manage products, manage incoming orders
- Some endpoints are accessible to both; some are role-restricted — investigate `src/lib/auth.ts` (`isConsumer`, `isFarm` flags)

### 3.3 Authentication

> ✅ **CONFIRMED — JWT Bearer Token auth.**

- Use `@nestjs/jwt` + `passport` + `passport-jwt`
- Token flow: `accessToken` + `refreshToken` returned on login/register
- Implement `/auth/refresh-token` endpoint to issue a new `accessToken`
- `express-session` and `connect-mongo` are **NOT used** — remove from dependencies
- Protect routes using `JwtAuthGuard` from `src/common/guards/`
- Passwords must be hashed with **bcrypt** before storage. Never log or return passwords or tokens.
- Implement **role-based access control** for two roles: `consumer` and `farm` via `RolesGuard` + `@Roles()` decorator

### 3.4 Validation
- A **global `ValidationPipe`** must be active with `whitelist: true` and `forbidNonWhitelisted: true`.
- Every request body must have a corresponding **DTO** decorated with `class-validator` decorators.
- Never trust raw request data — always validate at the DTO level.

### 3.5 Configuration
- All secrets and environment-specific values must come from **`.env` files** via `@nestjs/config`.
- Never hardcode secrets, URLs, or ports.
- Use typed config files (`database.config.ts`, `auth.config.ts`) injected via `ConfigService`.
- Support **three environments** matching the frontend: `development`, `staging`, `production`.
  - `.env.development` → local Docker Compose
  - `.env.staging` → staging server
  - `.env.production` → production server
- Validate all environment variables at startup using `Joi` or a custom validation schema — fail fast if required vars are missing.

### 3.6 Database
- All schemas must be defined using **Mongoose `@Schema()` / `@Prop()` decorators**.
- Use **connection pooling** (`maxPoolSize: 10`, `socketTimeoutMS: 45000`).
- Every schema must include `timestamps: true` unless there is a documented reason not to.

---

## 4. INVESTIGATION RULES

- **Never assume** a field, endpoint, or behavior exists — read the frontend file first.
- Every backend decision must cite the **frontend file that justifies it** (e.g., `src/api/farms/types.tsx`, line 12).
- If a frontend file is ambiguous, **ask the developer** before implementing.
- Mock data files are **authoritative** for response shape — backend output must match them.
- Enums and constants in `src/types/constants.ts` are the **only valid values** for statuses, roles, and categories.

---

## 5. QUALITY RULES

- Every controller method must have a corresponding **unit test**.
- Every module must have at least one **E2E test** using Supertest.
- Tests must use `mongodb-memory-server` — never connect to a real DB during tests.
- ESLint and Prettier must pass with **zero errors** before any code is considered done.
- Swagger decorators (`@ApiOperation`, `@ApiResponse`, `@ApiBody`) must be present on every endpoint.

---

## 6. DOCKER RULES

- The `Dockerfile` must be **multi-stage**: `builder` stage → `production` stage using `node:20-alpine`.
- `docker-compose.yml` must define: `app` service + `mongodb` service on a shared bridge network (`f2t-network`).
- MongoDB data must be persisted via a named volume (`mongodb_data`).
- The app must expose a `/health` endpoint checked by Docker health checks.

---

## 7. FORBIDDEN ACTIONS

| ❌ Never do this |
|---|
| Return passwords or auth tokens in any response |
| Hardcode any URL, secret, or credential |
| Create an endpoint not required by the frontend |
| Skip DTO validation on any request body |
| Implement auth before reading `src/lib/auth.ts` and `src/api/common/client.tsx` |
| Use session cookies on a mobile-native client without confirming the frontend sends `withCredentials` |
| Modify the frontend to match the backend |
| Push code with ESLint errors or failing tests |
| Use a library not in the approved tech stack without approval |
| Omit the Orders module — it is a core domain |
| Hardcode CORS origin to `localhost:8081` only |
| Return a list endpoint without pagination support |
