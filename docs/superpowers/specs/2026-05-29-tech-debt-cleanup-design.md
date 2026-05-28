# Design: Tech Debt Cleanup & Dynamic Pricing Integration Doc

**Date:** 2026-05-29
**Scope:** 5 open items from CONTEXT.md — TD-002, TD-003, TD-015, TD-031, TD-035

---

## Context

F2T backend is fully implemented with 46/46 tests passing. Three previously-pending Phase 10 frontend items (TD-032, TD-033, TD-034) were found to be already resolved. The remaining open items are 4 low-severity code quality issues and 1 missing documentation artifact.

---

## Items In Scope

### TD-002 — docker-compose.yml obsolete `version` attribute

**Problem:** Top-level `version:` key in `docker-compose.yml` is deprecated in Docker Compose V2 and generates a warning on every `docker compose` invocation.

**Fix:** Remove the `version:` line. No functional change — Compose V2 ignores it anyway.

**File:** `f2t-backend/docker-compose.yml` (or repo root)

---

### TD-003 — FarmsService cross-module model injection

**Problem:** `FarmsService` injects `OrderModel` and `ProductModel` from other modules to compute farm analytics. This creates hidden cross-module coupling — FarmsModule depends on schemas it doesn't own.

**Fix:** Register `OrderSchema` and `ProductSchema` inside `FarmsModule` via `MongooseModule.forFeature([...])`. This makes the dependency explicit in the module definition without requiring a shared service or architectural overhaul. The service methods stay unchanged.

**Files:**
- `f2t-backend/src/modules/farms/farms.module.ts` — add `MongooseModule.forFeature` entries
- No changes needed to `farms.service.ts`

---

### TD-015 — `any` type in payments.controller.ts

**Problem:** The `@AuthUser()` decorator parameter is typed as `any`, losing type safety on `user.userId` access throughout the controller.

**Fix:** Import or define a `JwtUser` interface `{ userId: string; role: string; email: string }` in `src/common/` (or reuse if already defined in `auth.guard.ts`), then replace `any` with `JwtUser`.

**Files:**
- `f2t-backend/src/modules/payments/payments.controller.ts`
- `f2t-backend/src/common/` — check for existing JwtUser type first; create if absent

---

### TD-031 — Duplicate `productId` unique index warning

**Problem:** The `FreshnessCache` schema declares `productId` with `unique: true` on the field definition. Mongoose also auto-generates an index for it, producing a duplicate-index warning in logs on every startup.

**Fix:** Remove the inline `unique: true` from the field definition and use `schema.index({ productId: 1 }, { unique: true })` explicitly once. This gives Mongoose a single source of truth for the index.

**Files:**
- `f2t-backend/src/modules/dynamic-pricing/schemas/freshness-cache.schema.ts`

---

### TD-035 — INTEGRATION.md for Dynamic Pricing graduation

**Problem:** No documentation exists for how to graduate the dynamic pricing system from shadow → advisory → live mode. Developers and operators have no reference for KPI thresholds or env var changes required at each phase.

**Content:**
1. Architecture overview (sidecar + interceptor + cron)
2. Env vars reference (`PRICING_MODE`, `PRICING_SIDECAR_URL`, `PRICING_CRON_SCHEDULE`, `PRICING_SUGGESTION_TTL_HOURS`)
3. Phase 1 — Shadow: how to run, what to monitor, KPIs via `/api/dynamic-pricing/shadow-report`
4. Phase 2 — Advisory graduation checklist: safetyClipRate threshold, minimum shadow days, farmer UX validation
5. Phase 3 — Live (out of scope, documented as future work)
6. Rollback procedure

**File:** `f2t-backend/docs/DYNAMIC-PRICING-INTEGRATION.md`

---

## What Is Excluded

| Item | Reason |
|---|---|
| TD-007 (SMS stub) | Needs real provider (Twilio etc.) — external dependency |
| TD-008 (push fire-and-forget) | Intentional design decision |
| TD-011 (GHN creds) | Needs GHN merchant account |
| TD-024 (verification bypass) | Intentional — restore only when SMS/email provider ready |
| TD-004 (Docker smoke test) | Manual verification — not automatable here |
| TD-032/033/034 | Already resolved in codebase |

---

## Execution Order

1. TD-002 — 1-line docker-compose fix → commit
2. TD-015 — JwtUser type → verify no other controllers need same fix → commit
3. TD-031 — schema index fix → run tests to confirm no regression → commit
4. TD-003 — FarmsModule wiring → run `npm test` → commit
5. TD-035 — Write INTEGRATION.md → commit

Each item is independent. Steps 1–4 are backend code changes; step 5 is docs only.

---

## Success Criteria

- `docker compose up` produces no `version` deprecation warning
- `npm run build && npm test` passes (46/46) after all backend changes
- `npm run lint` clean on changed files
- `payments.controller.ts` has zero `any` types
- No duplicate-index warning in backend startup logs
- `DYNAMIC-PRICING-INTEGRATION.md` covers all three deployment phases
