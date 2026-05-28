# VALIDATION_WORKFLOW.md — F2T Backend Validation Workflow

> Run every check in this file in order. Do not skip steps. Do not mark a phase complete until every check in it is done. Produce the Validation Report as you go.

---

## Before You Start

Create this running report in your context and fill it in as you go:

```
## VALIDATION REPORT — F2T Backend
Date: <today>
Validator: Agent (self-validation)

### Summary (fill at the end)
| Category | Passed | Failed | Critical |
|---|---|---|---|
| Structure | | | |
| Tech Stack | | | |
| Auth | | | |
| Contracts | | | |
| Schemas | | | |
| Response Shape | | | |
| Tests | | | |
| Docker | | | |
| Frontend Sync | | | |
| TOTAL | | | |

### Overall Verdict: [ ] GO  [ ] NO-GO
```

---

## Phase V1 — File Structure Audit

**Goal:** Confirm every required file exists before checking content.

```bash
# Run this to get the full backend tree
find src/ -type f -name "*.ts" | sort
```

**Check per module** (`auth`, `users`, `farms`, `products`, `orders`, `posts`, `notifications`):

| File | Exists? |
|---|---|
| `src/<module>/<module>.module.ts` | ✅ / ❌ |
| `src/<module>/<module>.controller.ts` | ✅ / ❌ |
| `src/<module>/<module>.service.ts` | ✅ / ❌ |
| `src/<module>/<module>.schema.ts` (or `schemas/`) | ✅ / ❌ |
| `src/<module>/dto/` (at least 1 file) | ✅ / ❌ |

**Common layer checks:**

| File | Exists? |
|---|---|
| `src/common/guards/jwt-auth.guard.ts` | ✅ / ❌ |
| `src/common/guards/roles.guard.ts` | ✅ / ❌ |
| `src/common/decorators/roles.decorator.ts` | ✅ / ❌ |
| `src/common/decorators/current-user.decorator.ts` | ✅ / ❌ |
| `src/common/interceptors/response.interceptor.ts` (or similar) | ✅ / ❌ |
| `src/common/dto/pagination.dto.ts` (or similar) | ✅ / ❌ |
| `src/common/filters/http-exception.filter.ts` (or similar) | ✅ / ❌ |

**Other required files:**

| File | Exists? |
|---|---|
| `Dockerfile` | ✅ / ❌ |
| `docker-compose.yml` | ✅ / ❌ |
| `.env.development` | ✅ / ❌ |
| `.env.staging` | ✅ / ❌ |
| `.env.production` | ✅ / ❌ |
| `test/` (E2E test directory) | ✅ / ❌ |

**→ Record all missing files as 🔴 CRITICAL in the report.**

---

## Phase V2 — Package.json Audit

```bash
cat package.json
```

**Check:**

| Dependency | Expected | Found | Status |
|---|---|---|---|
| `@nestjs/jwt` | present | | |
| `passport` | present | | |
| `passport-jwt` | present | | |
| `@nestjs/passport` | present | | |
| `express-session` | **MUST BE ABSENT** | | |
| `connect-mongo` | **MUST BE ABSENT** | | |
| `mongoose` | present | | |
| `@nestjs/mongoose` | present | | |
| `bcrypt` | present | | |
| `class-validator` | present | | |
| `class-transformer` | present | | |
| `@nestjs/swagger` | present | | |
| `mongodb-memory-server` | in devDeps | | |
| `supertest` | in devDeps | | |
| `engines.node` | `>=20.0.0` | | |

**→ `express-session` or `connect-mongo` present = 🔴 CRITICAL**

---

## Phase V3 — Auth Implementation Audit

**Step 1: Read `src/auth/auth.service.ts`**
- [ ] `bcrypt.hash()` called before saving password
- [ ] `bcrypt.compare()` called during login
- [ ] `jwtService.sign()` called to produce `accessToken`
- [ ] `jwtService.sign()` called with different secret/expiry to produce `refreshToken`
- [ ] Password field is **excluded** from any returned user object (check for `select: false` on schema or manual deletion)

**Step 2: Read `src/auth/auth.controller.ts`**
- [ ] `POST /auth/login` exists
- [ ] `POST /auth/register` exists
- [ ] `POST /auth/refresh-token` exists and accepts `{ refreshToken }`
- [ ] `GET /auth/me` exists and is protected by `JwtAuthGuard`

**Step 3: Read `src/auth/strategies/jwt.strategy.ts`** (or equivalent)
- [ ] Extends `PassportStrategy(Strategy)` from `passport-jwt`
- [ ] Reads token from `Authorization: Bearer` header (`fromAuthHeaderAsBearerToken()`)
- [ ] Validates payload and returns user object

**Step 4: Read `src/common/guards/jwt-auth.guard.ts`**
- [ ] Extends `AuthGuard('jwt')` from `@nestjs/passport`

**Step 5: Read `src/common/guards/roles.guard.ts`**
- [ ] Checks `role` field from the JWT payload
- [ ] Returns 403 if role doesn't match required roles

**→ Any missing item = 🔴 CRITICAL**

---

## Phase V4 — Response Shape Audit

**Step 1: Read `src/common/interceptors/` (response interceptor file)**
- [ ] Implements `NestInterceptor`
- [ ] Wraps response in `{ success: true, data: <original>, message?: string }`

**Step 2: Read `src/main.ts`**
- [ ] `app.useGlobalInterceptors(new ResponseInterceptor())` (or equivalent) is present
- [ ] `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))` is present
- [ ] `app.useGlobalFilters(...)` for exception filter is present

**Step 3: Read `src/common/dto/pagination.dto.ts`** (or equivalent)
- [ ] Defines a class or interface with: `items`, `total`, `page`, `limit`, `hasMore`

**Step 4: Spot-check one service** (e.g., `products.service.ts`) **for pagination:**
- [ ] `findAll()` or equivalent uses `skip()` and `limit()` on the Mongoose query
- [ ] Returns object matching `{ items, total, page, limit, hasMore }` shape

**→ Missing global interceptor or wrong envelope = 🔴 CRITICAL**

---

## Phase V5 — Contract Audit (Route-by-Route)

Read each controller file and verify every route path and method matches the contract exactly.

```bash
grep -r "@Get\|@Post\|@Put\|@Patch\|@Delete" src/ --include="*.controller.ts"
```

Use the output to fill in this table:

| Expected Method | Expected Path | Found in controller? | Status |
|---|---|---|---|
| POST | /auth/login | | |
| POST | /auth/register | | |
| POST | /auth/refresh-token | | |
| GET | /auth/me | | |
| GET | /products | | |
| POST | /products | | |
| GET | /products/:id | | |
| PUT | /products/:id | | |
| DELETE | /products/:id | | |
| PATCH | /products/:id/stock | | |
| GET | /farms | | |
| POST | /farms | | |
| GET | /farms/:id | | |
| PUT | /farms/:id | | |
| GET | /farms/:id/analytics | | |
| GET | /orders | | |
| POST | /orders | | |
| GET | /orders/:id | | |
| PUT | /orders/:id | | |
| PATCH | /orders/:id/status | | |
| GET | /orders/stats | | |
| GET | /posts | | |
| GET | /posts/:id | | |
| POST | /posts/add | | |
| GET | /notifications | | |
| PATCH | /notifications/:id/read | | |
| PUT | /notifications/preferences | | |

**→ Any missing or wrong path = 🔴 CRITICAL**

---

## Phase V6 — Schema Audit

Read each schema file and verify required fields exist.

```bash
cat src/users/schemas/user.schema.ts     # or equivalent path
cat src/farms/schemas/farm.schema.ts
cat src/products/schemas/product.schema.ts
cat src/orders/schemas/order.schema.ts
cat src/notifications/schemas/notification.schema.ts
```

**User schema:**
- [ ] `email` — String, required, unique
- [ ] `password` — String, required, `select: false` (or stripped in service)
- [ ] `role` — enum `['consumer', 'farm']`, required
- [ ] `status` — enum `['active', 'suspended', 'pending']`
- [ ] `location` — present (String or object)
- [ ] `timestamps: true`

**Farm schema:**
- [ ] `ownerId` — ObjectId, ref: 'User', required
- [ ] `name`, `description`, `isActive` — present
- [ ] `deliveryMethods`, `deliveryZones`, `businessHours` — present

**Product schema:**
- [ ] `farmId` — ObjectId, ref: 'Farm', required
- [ ] `category`, `pricePerUnit`, `unit`, `availableQuantity`, `status` — present
- [ ] `images` — Array
- [ ] `isOrganic` — Boolean

**Order schema:**
- [ ] `consumerId`, `farmId` — ObjectId refs
- [ ] `items` — Array of embedded sub-documents containing: `productName`, `pricePerUnit`, `unit` (snapshot fields — NOT refs)
- [ ] `status`, `paymentStatus`, `totalAmount`, `trackingSteps` — present

**Notification schema:**
- [ ] `userId` — ObjectId ref
- [ ] `type`, `message` — present
- [ ] `status` — enum `['read', 'unread']`

**→ Missing snapshot fields in Order = 🔴 CRITICAL**
**→ Missing required field = 🟠 HIGH**

---

## Phase V7 — Order Snapshot Logic Audit

Read `src/orders/orders.service.ts` — specifically the `create()` method:

- [ ] It reads product details from the database (`ProductsService` or direct model query)
- [ ] It copies `productName` (or `name`), `pricePerUnit`, `unit` into each `OrderItem`
- [ ] It does **NOT** use `.populate('productId')` as the sole source of product info for display

**→ Missing snapshot logic = 🔴 CRITICAL**

---

## Phase V8 — Test Suite Audit

```bash
# Run unit tests
npm run test -- --verbose 2>&1 | tail -30

# Run E2E tests
npm run test:e2e 2>&1 | tail -30

# Run linter
npm run lint 2>&1 | tail -20
```

Record exact output:

| Suite | Tests run | Passed | Failed | Status |
|---|---|---|---|---|
| Unit (`npm run test`) | | | | |
| E2E (`npm run test:e2e`) | | | | |
| Lint (`npm run lint`) | errors: | | | |

**→ Any failing test = 🟠 HIGH (🔴 CRITICAL if auth or orders)**
**→ Any lint error = 🟡 MEDIUM**
**→ Zero tests run = 🔴 CRITICAL**

---

## Phase V9 — Docker & Environment Audit

**Step 1: Read `Dockerfile`**
- [ ] Multi-stage: first `FROM` is builder, second `FROM node:20-alpine` is production
- [ ] Production stage does NOT copy `node_modules` from host — runs `npm ci --only=production`

**Step 2: Read `docker-compose.yml`**
- [ ] `app` service defined
- [ ] `mongodb` service defined with image `mongo:7.0`
- [ ] Both on a shared named network (e.g., `f2t-network`)
- [ ] Named volume `mongodb_data` for MongoDB persistence
- [ ] `app` service has a `healthcheck` or depends on MongoDB

**Step 3: Read `.env.development`**
- [ ] `MONGODB_URI` present
- [ ] `JWT_SECRET` present
- [ ] `JWT_REFRESH_SECRET` present
- [ ] `PORT` present
- [ ] `NODE_ENV=development`
- [ ] No obviously fake or placeholder secrets used in `.env.staging` / `.env.production`

**Step 4: Find `/health` endpoint**
```bash
grep -r "health" src/ --include="*.controller.ts" -l
```
- [ ] A `/health` or `/api/health` endpoint exists and returns 200

---

## Phase V10 — Frontend client.tsx Audit

Read `src/api/common/client.tsx` in the **frontend** codebase:

- [ ] Axios request interceptor exists that reads `accessToken` from MMKV
- [ ] Sets `Authorization: Bearer <token>` header on every request
- [ ] Axios response interceptor exists that catches 401 responses
- [ ] On 401: calls `/auth/refresh-token` with `{ refreshToken }` from MMKV
- [ ] Stores new `accessToken` from refresh response back to MMKV
- [ ] Retries the original failed request with new token
- [ ] If refresh also fails: calls `signOut()` from auth store

**→ Missing interceptors = 🔴 CRITICAL (app cannot authenticate)**

---

## Phase V11 — Swagger Audit

```bash
# Start server locally
npm run start:dev &
sleep 5

# Check /api-docs is reachable
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api-docs
```

- [ ] Returns `200` (or `301` redirect to `/api-docs/`)

Spot-check one controller (e.g., `auth.controller.ts`):
```bash
grep -c "@ApiOperation\|@ApiResponse" src/auth/auth.controller.ts
```
- [ ] Count is ≥ number of endpoints in the controller (each endpoint needs at least 2 decorators)

---

## Final Step — Write the Validation Report

Fill in the summary table at the top of the report and issue the final verdict:

**GO** = Zero 🔴 CRITICAL issues, zero 🟠 HIGH issues (or all HIGH issues documented and accepted by developer).

**NO-GO** = One or more 🔴 CRITICAL issues remain unresolved.

For every issue found, output:

```
### ISSUE-001
Severity: 🔴 CRITICAL
Phase: V5 (Contract Audit)
Finding: POST /posts/add not found in posts.controller.ts. Found POST /posts instead.
Evidence: grep output line 42
Fix required: Update @Post() decorator in posts.controller.ts from '' to 'add'
```

Send the complete Validation Report to the developer before making any fixes.
