# CONTEXT.md — F2T Project Handoff

> This file is the agent's memory. It is updated at the end of every session.
> Every new session starts by reading this file before doing anything else.
> Do not trust your training data or previous conversation — trust this file.

---

## Project Identity

- **Project:** F2T (Farm to Table) — mobile marketplace connecting farms and consumers
- **Frontend:** React Native + Expo SDK 53, Axios, Zustand, MMKV, React Query
- **Backend:** NestJS 11 + TypeScript 5.7 + MongoDB 7 + Mongoose + JWT (passport-jwt)
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

---

## Current Project Status

**Last updated:** 2026-04-25
**Last session:** Fix session — all 5 validation issues resolved

| Phase | Status | Output |
|---|---|---|
| Frontend investigation | ✅ Complete | API contract extracted (7 domains) |
| Backend build | ✅ Complete | All 7 modules implemented |
| Validation | ✅ Complete | NO-GO → all issues fixed |
| Fix session | ✅ Complete | Build ✅ Lint ✅ Tests 17/17 ✅ |
| Docker smoke test | ⚠️ Pending | Run `docker compose up -d` + curl `/api/health` on local machine |

---

## Module Status

| Module | Built | Tested | Lint clean | Notes |
|---|---|---|---|---|
| Auth | ✅ | ✅ | ✅ | JWT, refresh token, bcrypt |
| Users | ✅ | ✅ | ✅ | UsersController added in fix session |
| Farms | ✅ | ✅ | ✅ | Analytics endpoint implemented (real aggregation) |
| Products | ✅ | ✅ | ✅ | Typed DTOs, ObjectId fix applied |
| Orders | ✅ | ✅ | ✅ | Snapshot logic confirmed, stats implemented |
| Posts | ✅ | ✅ | ✅ | MongooseModule registration fix applied |
| Notifications | ✅ | ✅ | ✅ | |

---

## Known Issues & Tech Debt

| ID | Severity | Description | Status |
|---|---|---|---|
| TD-001 | 🟡 Low | `String(x as unknown as string)` workaround still present in some services | Open — proper fix: type schema fields as `Types.ObjectId` and call `.toHexString()` |
| TD-002 | 🟡 Low | `docker-compose.yml` has obsolete `version` attribute | Open — remove the `version:` line |
| TD-003 | 🟡 Low | FarmsService.getAnalytics injects OrderModel — cross-module dependency | Open — consider an OrdersService method instead |
| TD-004 | ⚠️ Pending | Docker smoke test not run (Docker unavailable in agent env) | Must verify manually |

---

## All API Endpoints (source of truth)

| Method | Path | Module | Auth | Role |
|---|---|---|---|---|
| POST | /api/auth/login | Auth | No | Any |
| POST | /api/auth/register | Auth | No | Any |
| POST | /api/auth/refresh-token | Auth | No | Any |
| GET | /api/auth/me | Auth | Yes | Any |
| GET | /api/users/profile | Users | Yes | Any |
| GET | /api/users/:id | Users | Yes | Any |
| PUT | /api/users/profile | Users | Yes | Any |
| GET | /api/farms | Farms | No | Any |
| POST | /api/farms | Farms | Yes | farm |
| GET | /api/farms/:id | Farms | No | Any |
| PUT | /api/farms/:id | Farms | Yes | farm |
| GET | /api/farms/:id/analytics | Farms | Yes | farm |
| GET | /api/products | Products | No | Any |
| POST | /api/products | Products | Yes | farm |
| GET | /api/products/:id | Products | No | Any |
| PUT | /api/products/:id | Products | Yes | farm |
| DELETE | /api/products/:id | Products | Yes | farm |
| PATCH | /api/products/:id/stock | Products | Yes | farm |
| GET | /api/orders | Orders | Yes | Any |
| POST | /api/orders | Orders | Yes | consumer |
| GET | /api/orders/:id | Orders | Yes | Any |
| PUT | /api/orders/:id | Orders | Yes | Any |
| PATCH | /api/orders/:id/status | Orders | Yes | farm |
| GET | /api/orders/stats | Orders | Yes | Any |
| GET | /api/posts | Posts | No | Any |
| GET | /api/posts/:id | Posts | No | Any |
| POST | /api/posts/add | Posts | Yes | Any |
| GET | /api/notifications | Notifications | Yes | Any |
| PATCH | /api/notifications/:id/read | Notifications | Yes | Any |
| PUT | /api/notifications/preferences | Notifications | Yes | Any |

---

## How to Start Any New Session

Paste this at the top of every new session:

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