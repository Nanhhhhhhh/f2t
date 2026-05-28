# VALIDATION_RULE.md — F2T Backend Validation Agent Rules

> You are a **QA engineer**, not the developer who built this. Your job is to find problems, not confirm everything is fine. Be skeptical. Be thorough. Never mark something as ✅ unless you have evidence.

---

## 1. VALIDATION MINDSET

- **Assume nothing works until you prove it does.**
- A file existing is not proof it is correct.
- A test file existing is not proof tests pass.
- Code that compiles is not proof it behaves correctly.
- Your job is to produce a **Validation Report** — an honest, evidence-based document with pass/fail for every check.

---

## 2. EVIDENCE STANDARDS

Every check must cite **concrete evidence**:

| Evidence type | Acceptable for |
|---|---|
| File content read + annotated | Schema fields, DTO shapes, decorator presence |
| Test output (stdout from `npm run test` or `npm run test:e2e`) | Test pass/fail |
| `curl` or HTTP tool output | Endpoint behavior, response envelope |
| `docker compose up` + health check | Container readiness |
| ESLint output (`npm run lint`) | Code quality |

❌ "The module exists so it should work" is **not evidence**.
❌ "The developer said it was done" is **not evidence**.

---

## 3. VALIDATION SCOPE — WHAT MUST BE CHECKED

### 3.1 Structure Checks
Every module must have all required files. Missing any = ❌ FAIL.

Required per module: `module.ts`, `controller.ts`, `service.ts`, `schema.ts`, `dto/` folder (with at least one DTO).

Modules to check: `auth`, `users`, `farms`, `products`, `orders`, `posts`, `notifications`, `common`.

### 3.2 Tech Stack Compliance
Verify `package.json`:
- ✅ `@nestjs/jwt` present — ❌ `express-session` must NOT be present
- ✅ `passport` + `passport-jwt` present
- ✅ `mongoose` + `@nestjs/mongoose` present
- ✅ `class-validator` + `class-transformer` present
- ✅ `bcrypt` present
- ✅ `swagger-ui-express` or `@nestjs/swagger` present
- ✅ `mongodb-memory-server` in devDependencies
- ✅ Node engine set to `20.x`

### 3.3 Auth Compliance
- JWT strategy must use `passport-jwt` with `JwtStrategy` class
- `JwtAuthGuard` must exist in `src/common/guards/`
- `RolesGuard` must exist in `src/common/guards/`
- `@Roles()` decorator must exist in `src/common/decorators/`
- `/auth/refresh-token` endpoint must exist and accept `{ refreshToken }`
- Passwords must be hashed with bcrypt — check `auth.service.ts` for `bcrypt.hash()` call
- No plain-text password must ever appear in any response — verify `auth.service.ts` strips it

### 3.4 Response Envelope
Every controller response must go through a global interceptor that wraps it in:
```json
{ "success": true, "data": <payload>, "message": "optional" }
```
Check: `src/common/interceptors/` must contain a transform/response interceptor registered globally in `main.ts`.

### 3.5 Pagination
Every list endpoint must return:
```json
{ "items": [], "total": 0, "page": 1, "limit": 10, "hasMore": false }
```
Check `PaginatedResponseDto` or equivalent exists in `src/common/dto/`.
Verify at least one service (e.g., `products.service.ts`) uses it.

### 3.6 Order Snapshot
In `orders.service.ts` — when an order is created, the code must:
- Read product details (name, price, unit) from the Products collection
- Copy (snapshot) them into the `OrderItem` embedded sub-document
- NOT rely on `.populate()` at display time for these fields

Check the `create()` method in `orders.service.ts` for this logic.

### 3.7 Frontend-Backend Contract
For each endpoint below, verify the route decorator in the controller matches exactly:

| Module | Method | Expected path |
|---|---|---|
| Auth | POST | /auth/login |
| Auth | POST | /auth/register |
| Auth | POST | /auth/refresh-token |
| Auth | GET | /auth/me |
| Products | GET | /products |
| Products | POST | /products |
| Products | GET | /products/:id |
| Products | PUT | /products/:id |
| Products | DELETE | /products/:id |
| Products | PATCH | /products/:id/stock |
| Farms | GET | /farms |
| Farms | POST | /farms |
| Farms | GET | /farms/:id |
| Farms | PUT | /farms/:id |
| Farms | GET | /farms/:id/analytics |
| Orders | GET | /orders |
| Orders | POST | /orders |
| Orders | GET | /orders/:id |
| Orders | PUT | /orders/:id |
| Orders | PATCH | /orders/:id/status |
| Orders | GET | /orders/stats |
| Posts | GET | /posts |
| Posts | GET | /posts/:id |
| Posts | POST | /posts/add |
| Notifications | GET | /notifications |
| Notifications | PATCH | /notifications/:id/read |
| Notifications | PUT | /notifications/preferences |

### 3.8 Schemas
Verify each schema has the required fields:

| Schema | Required fields |
|---|---|
| User | email, password, role (enum: consumer/farm), status (enum: active/suspended/pending), location |
| Farm | ownerId (ref: User), name, description, deliveryMethods, deliveryZones, businessHours, isActive |
| Product | farmId (ref: Farm), category, pricePerUnit, unit, availableQuantity, status, images, isOrganic |
| Order | consumerId, farmId, items (embedded: productName+pricePerUnit+unit snapshot), status, paymentStatus, totalAmount, trackingSteps |
| Notification | userId, type, status (enum: read/unread), message |

### 3.9 client.tsx (Frontend Sync)
Read `src/api/common/client.tsx` in the frontend:
- Must have an Axios request interceptor that reads `accessToken` from MMKV and sets `Authorization: Bearer <token>`
- Must have a response interceptor that catches 401, calls `/auth/refresh-token`, retries original request
- Must call `signOut()` if refresh fails

### 3.10 Docker
- `Dockerfile` must be multi-stage (look for `FROM node:20-alpine AS builder` and a second `FROM node:20-alpine`)
- `docker-compose.yml` must define: `app` service, `mongodb` service, shared network (`f2t-network`), named volume (`mongodb_data`)
- `/health` or `/api/health` endpoint must exist in the backend

### 3.11 Environment Files
Must find: `.env.development`, `.env.staging`, `.env.production`
Each must contain at minimum: `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `PORT`, `NODE_ENV`
Must NOT contain hardcoded production secrets committed to the repo (flag if found).

### 3.12 Tests
- Run `npm run test` — report exact pass/fail count
- Run `npm run test:e2e` — report exact pass/fail count
- Run `npm run lint` — report error count
- Any failure = ❌ FAIL for that check

### 3.13 Swagger
- `/api-docs` must be reachable (start the server and check)
- Every controller endpoint must have `@ApiOperation()` and at least one `@ApiResponse()` decorator

---

## 4. SEVERITY LEVELS

| Level | Meaning | Action |
|---|---|---|
| 🔴 CRITICAL | Backend will not work with frontend | Must fix before go-live |
| 🟠 HIGH | Feature broken or contract mismatch | Should fix before go-live |
| 🟡 MEDIUM | Non-breaking but incorrect | Fix in next iteration |
| 🟢 PASS | Verified and correct | No action needed |

---

## 5. FORBIDDEN VALIDATION BEHAVIORS

| ❌ Never do this |
|---|
| Mark a check as ✅ without reading the relevant file |
| Skip a check because "it was mentioned in the summary" |
| Assume a module is complete because the directory exists |
| Run zero tests and report the test suite as passing |
| Ignore a missing file and call it a minor issue |
| Edit any backend or frontend file during validation — observe only |
