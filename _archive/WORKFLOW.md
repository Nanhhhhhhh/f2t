# WORKFLOW.md — Frontend Investigation & Backend Rebuild Workflow

> Follow these phases **in order**. Complete each phase fully and report findings before moving to the next. Do not skip steps.

---

## Phase 0 — Setup & Orientation

**Goal:** Understand the project structure before touching any file.

```
Steps:
1. List the full directory tree of the frontend project (src/)
2. Identify the API client file (src/api/common/client.tsx or equivalent)
3. Identify the auth state file (src/lib/auth.ts or equivalent)
4. List all directories inside src/api/ — these are your domain modules
5. List all files inside src/types/ — these define the global data model
```

**Output:** A table mapping each `src/api/` directory to its likely backend module (e.g., `src/api/farms/` → `FarmsModule`).

**Checkpoint ✅** — Report findings to developer before proceeding.

---

## Phase 1 — Global Configuration & Authentication

**Goal:** Understand how the frontend communicates with the backend and handles auth.

> ⚠️ **Mobile context:** This is a React Native / Expo app. Auth tokens are stored in **MMKV** (not cookies). Your primary job here is to determine: **does the frontend send a Bearer token or session cookies?** This decides the entire backend auth architecture.

```
Steps:
1. Read src/api/common/client.tsx
   → Note: base URL, default headers, interceptors
   → CRITICAL CHECK: Does Axios set `Authorization: Bearer ${token}` header? → JWT auth
   → CRITICAL CHECK: Does Axios set `withCredentials: true`? → session cookie auth
   → Check: How are 401 errors handled? (redirect to login? token refresh?)

2. Read src/lib/auth.ts (Zustand store)
   → Note: What fields are stored after login? (token, refreshToken, user, farm?)
   → Check: signIn() — what does it save to MMKV?
   → Check: signOut() — what does it clear?
   → Extract: the User object shape stored in state
   → Extract: how isConsumer and isFarm flags are determined

3. Read src/api/auth/types.tsx
   → Extract: LoginRequest, RegisterRequest, AuthResponse shapes
   → Check: Does AuthResponse include a `token` field? → confirms JWT

4. Read src/api/auth/use-*.tsx (all hooks)
   → Map: each hook → HTTP method + path + payload + response
```

**Deliverable:** A completed Auth Contract table:

| Hook | Method | Path | Request Body | Response Shape | Auth Required |
|---|---|---|---|---|---|
| useLogin | POST | /auth/login | `{ email, password }` | `{ user, token? }` | No |
| useRegister | POST | /auth/register | `{ ... }` | `{ user, token? }` | No |
| useLogout | POST | /auth/logout | — | — | Yes |
| useMe | GET | /auth/me | — | `User` | Yes |

**Auth Architecture Decision** (must be documented before Phase 5):

| Finding | Backend Auth to implement |
|---|---|
| Axios sets `Authorization: Bearer` header | JWT — use `@nestjs/jwt` + `passport-jwt` |
| Axios sets `withCredentials: true` | Session — use `express-session` + `connect-mongo` |
| Ambiguous | Ask developer before proceeding |

**Checkpoint ✅** — Confirm Auth Contract AND auth mechanism decision with developer before proceeding.

---

## Phase 2 — Domain-by-Domain API Mapping

**Goal:** Extract the full API contract for every domain module.

**Known domains from frontend report (confirm by listing `src/api/`):**
- `auth/` — authentication
- `products/` — product discovery, categories, filtering
- `farms/` — farm profiles, registration, location-based discovery
- `orders/` — order placement, status tracking, order management
- `users/` — user profile management

**Repeat the following for EACH directory in `src/api/`:**

```
For domain X (e.g., orders):

1. Read src/api/X/types.tsx
   → List all TypeScript types/interfaces
   → Classify each as: Request | Response | Shared
   → Note all optional (?) vs mandatory fields

2. Read all src/api/X/use-*.tsx files
   → For each hook, extract:
     - HTTP Method (GET / POST / PUT / PATCH / DELETE)
     - URL path (exact string)
     - Query params (if any) — especially: page, limit, cursor, filters
     - Request body / payload shape
     - Expected response shape
     - React Query queryKey
     - Is this an infinite scroll hook? (useInfiniteQuery) → backend needs pagination
     - Any client-side data transformation in queryFn / mutationFn

3. Check for any inline API calls outside hooks
```

**Pagination note:** If a hook uses `useInfiniteQuery` or `getNextPageParam`, the endpoint **must** return a paginated response. Document the expected shape (e.g., `{ data: T[], nextCursor, total }` or `{ data: T[], page, totalPages }`).

**Deliverable per domain:** A Domain Contract table:

| Hook | Method | Path | Params / Body | Response Type | Paginated | Notes |
|---|---|---|---|---|---|---|
| useProducts | GET | /products | `?category=&page=&limit=` | `Product[]` | ✅ | Infinite scroll |
| useCreateOrder | POST | /orders | `CreateOrderDto` | `Order` | — | |
| useOrderStatus | PATCH | /orders/:id/status | `{ status }` | `Order` | — | Farm only |

**Order statuses to capture from `src/types/constants.ts`:**
Expected values: `pending`, `preparing`, `shipping`, `delivered`, `cancelled` — verify exact values from the file.

**Checkpoint ✅** — Report all domain contracts before proceeding.

---

## Phase 3 — Global Entity & Schema Mapping

**Goal:** Define the Mongoose schema for every entity.

```
Steps:
1. Read src/types/index.ts
   → Extract all entity interfaces (User, Farm, Product, etc.)
   → Trace nesting: Does Order contain full Product or just productId?
   → Identify which fields are DB fields vs computed/frontend-only

2. Read src/types/api.ts (if present)
   → Note any API-specific wrappers (e.g., PaginatedResponse<T>)

3. Read src/types/constants.ts
   → Extract all enums: Roles, Statuses, Categories, etc.
   → These become the ONLY valid enum values in Mongoose schemas
```

**Deliverable:** Entity Schema Map — one per entity:

```
Entity: Farm
Fields:
  - name: string (required)
  - ownerId: ObjectId → ref: User (required)
  - status: enum ['active', 'inactive'] (required)
  - location: string (optional)
  - createdAt / updatedAt: auto (timestamps: true)
```

**Checkpoint ✅** — Confirm all schemas with developer before writing code.

---

## Phase 4 — Mock Data Validation

**Goal:** Use mock data as the ground truth for response shapes.

```
Steps:
1. Read all mock-*.ts files in the frontend
2. For each mock:
   → Verify it matches the TypeScript type defined in src/types/
   → Note any fields present in the mock but missing from types (or vice versa)
   → Use mock data as the expected shape for backend responses
3. Flag any inconsistencies between mocks, types, and API hooks
```

**Deliverable:** A Discrepancy Log:

| Entity | Issue | Location | Resolution |
|---|---|---|---|
| Farm | `rating` field in mock but not in type | mock-farms.ts:12 | Add to schema or strip from response |

**Checkpoint ✅** — Resolve all discrepancies with developer before proceeding.

---

## Phase 5 — Backend Implementation

**Goal:** Build the NestJS backend module by module, fully aligned to the contracts above.

**Order of implementation:**

```
1. Project scaffold
   → nest new f2t-backend (TypeScript strict mode)
   → Install all dependencies from RULE.md tech stack table
   → If auth investigation confirmed JWT: also install @nestjs/jwt, @nestjs/passport, passport, passport-jwt
   → Set up: ConfigModule (with Joi env validation for dev/staging/prod), MongooseModule,
             global ValidationPipe, CORS, auth middleware

2. Environment files
   → Create .env.development, .env.staging, .env.production
   → Validate all required vars at startup (fail fast if missing)

3. Common layer
   → AuthGuard (src/common/guards/auth.guard.ts)
   → RolesGuard + @Roles() decorator (consumer | farm)
   → CurrentUser decorator (src/common/decorators/current-user.decorator.ts)
   → LoggerMiddleware
   → Global exception filter (consistent error shape)
   → Global response interceptor (consistent success shape)
   → Pagination helper (PageDto, PaginatedResponseDto)

4. Auth module (always first)
   → Schema: User (fields from Phase 3, include role: 'consumer' | 'farm')
   → DTOs: LoginDto, RegisterDto (Consumer), RegisterFarmDto
   → Auth strategy: JWT (if confirmed) or Session (if confirmed)
   → Controller: POST /auth/login, POST /auth/register, POST /auth/logout, GET /auth/me
   → Service: token generation (JWT) or session creation, bcrypt compare

5. Users module
6. Farms module (farm profile, location, registration)
7. Products module (with category filters, pagination)
8. Orders module (full lifecycle — statuses from constants.ts)

9. Docker
   → Dockerfile (multi-stage: builder → node:20-alpine production)
   → docker-compose.yml (app + mongodb + f2t-network + mongodb_data volume)
   → /health endpoint

10. E2E tests
    → One test file per module using Supertest + mongodb-memory-server
```

**Checkpoint ✅** per module — Run tests + ESLint before marking a module done.

---

## Phase 6 — Contract Verification

**Goal:** Confirm the backend matches the frontend contract exactly.

```
For each endpoint:
1. Start the backend locally (or via Docker Compose)
2. Open Swagger at /api-docs
3. Manually verify: method, path, request body schema, response schema
4. Cross-reference with the Domain Contract table from Phase 2
5. Run E2E tests — all must pass
```

**Deliverable:** Contract Verification Report:

| Endpoint | Contract Match | Test Status | Notes |
|---|---|---|---|
| POST /auth/login | ✅ | ✅ PASS | — |
| GET /farms | ✅ | ✅ PASS | — |
| PATCH /farms/:id | ⚠️ | ❌ FAIL | Missing `status` field in response |

**Checkpoint ✅** — All endpoints must be ✅ before the project is considered done.

---

## Reporting Template (use after each phase)

```
## Phase [N] Report — [Phase Name]

**Status:** Complete / Blocked / Needs Review

**Findings:**
- ...

**Decisions made:**
- ...

**Open questions for developer:**
1. ...

**Next step:** Proceeding to Phase [N+1] / Waiting for developer input
```
