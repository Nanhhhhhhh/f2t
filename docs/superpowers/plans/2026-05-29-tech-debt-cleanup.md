# Tech Debt Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close TD-002, TD-031, TD-035, and the two `any` types in dynamic-pricing.service.ts (TD-015 spirit) — 4 independent changes, each committed separately.

**Architecture:** All changes are surgical edits to existing files. No new modules, no new services. TD-002 is a config change; TD-031 is a schema fix; the `any` cleanup is type-only; TD-035 is a new docs file.

**Tech Stack:** NestJS 11 + TypeScript 5.7 + Mongoose + Docker Compose V2

---

## Pre-flight

> Already resolved — do NOT re-touch:
> - **TD-003**: `farms.module.ts` already registers `OrderSchema` + `ProductSchema` via `MongooseModule.forFeature` — correct as-is.
> - **TD-015 (payments.controller.ts)**: Already has `interface JwtUser { userId: string; role: string; email: string }` defined locally — no `any` remaining.

---

## File Map

| File | Change |
|---|---|
| `f2t-backend/docker-compose.yml` | Remove `version:` line |
| `f2t-backend/src/modules/dynamic-pricing/schemas/freshness-cache.schema.ts` | Remove inline `unique: true` from `@Prop` |
| `f2t-backend/src/modules/dynamic-pricing/dynamic-pricing.service.ts` | Add `SidecarOverride` type; type `getSuggestionsForOwner` return |
| `f2t-backend/docs/DYNAMIC-PRICING-INTEGRATION.md` | New file — graduation checklist |

---

## Task 1: TD-002 — Remove obsolete docker-compose `version` attribute

**Files:**
- Modify: `f2t-backend/docker-compose.yml` line 1

- [ ] **Step 1: Remove the `version:` line**

  Open `f2t-backend/docker-compose.yml`. Delete the first line:
  ```yaml
  version: '3.8'
  ```
  The file should now start directly with `services:`.

- [ ] **Step 2: Verify docker-compose parses cleanly**

  ```bash
  cd f2t-backend && docker compose config --quiet
  ```
  Expected: no output, exit code 0. If Docker is not running, `docker compose config` still parses the file without a daemon — exit 0 means valid YAML.

- [ ] **Step 3: Commit**

  ```bash
  git add f2t-backend/docker-compose.yml
  git commit -m "chore: remove obsolete version attribute from docker-compose.yml"
  ```

---

## Task 2: TD-031 — Fix duplicate `productId` unique index in FreshnessCacheSchema

**Files:**
- Modify: `f2t-backend/src/modules/dynamic-pricing/schemas/freshness-cache.schema.ts`

**Background:** The schema has `unique: true` on the `@Prop` decorator AND an explicit `FreshnessCacheSchema.index({ productId: 1 }, { unique: true })` at the bottom. Mongoose treats these as two separate index definitions — the field-level one creates a background index, the explicit one creates another. This produces a "duplicate key index" warning in startup logs. Fix: remove `unique: true` from `@Prop`, keep only the explicit `.index()` call.

- [ ] **Step 1: Remove `unique: true` from the `@Prop` decorator**

  In `freshness-cache.schema.ts`, find:
  ```typescript
  @Prop({ type: Types.ObjectId, required: true, unique: true })
  productId!: Types.ObjectId;
  ```
  Change to:
  ```typescript
  @Prop({ type: Types.ObjectId, required: true })
  productId!: Types.ObjectId;
  ```
  The explicit index at the bottom of the file stays unchanged:
  ```typescript
  FreshnessCacheSchema.index({ productId: 1 }, { unique: true });
  ```

- [ ] **Step 2: Run existing tests to verify no regression**

  ```bash
  cd f2t-backend && npx jest src/modules/dynamic-pricing --passWithNoTests
  ```
  Expected: all dynamic-pricing tests pass (12 tests: 6 service + 6 interceptor).

- [ ] **Step 3: Verify build is clean**

  ```bash
  cd f2t-backend && npm run build 2>&1 | tail -5
  ```
  Expected: `Successfully compiled` with no errors.

- [ ] **Step 4: Commit**

  ```bash
  git add f2t-backend/src/modules/dynamic-pricing/schemas/freshness-cache.schema.ts
  git commit -m "fix: remove duplicate unique index on productId in FreshnessCacheSchema (TD-031)"
  ```

---

## Task 3: Fix `any` types in dynamic-pricing.service.ts

**Files:**
- Modify: `f2t-backend/src/modules/dynamic-pricing/dynamic-pricing.service.ts`

**Background:** Two `any` usages remain:
1. Line ~205: `let ov: any` — holds the sidecar `/predict` response override object
2. Line ~256: `Promise<{ items: any[]; total: number }>` — return type of `getSuggestionsForOwner`

- [ ] **Step 1: Add `SidecarOverride` interface near top of file**

  After the existing imports, add this interface (before the `@Injectable()` decorator):
  ```typescript
  interface SidecarOverride {
    targetPrice?: number;
    target_price?: number;
    deltaPct?: number;
    delta_pct?: number;
    freshnessScore?: number;
    freshness_score?: number;
    freshnessTag?: string;
    freshness_tag?: string;
    safetyClipped?: boolean;
    safety_clipped?: boolean;
    productId?: string;
    product_id?: string;
  }
  ```

- [ ] **Step 2: Replace `let ov: any`**

  Find:
  ```typescript
  let ov: any;
  ```
  Replace with:
  ```typescript
  let ov: SidecarOverride | undefined;
  ```
  The existing `if (!ov) return null;` already guards the undefined case — TypeScript strict mode needs the `| undefined` to not complain about "used before assigned".

- [ ] **Step 3: Type `getSuggestionsForOwner` return**

  Find:
  ```typescript
  async getSuggestionsForOwner(ownerId: string): Promise<{ items: any[]; total: number }> {
  ```
  Replace with:
  ```typescript
  async getSuggestionsForOwner(ownerId: string): Promise<{ items: (Record<string, unknown> & { id: string; productName: string })[]; total: number }> {
  ```

- [ ] **Step 4: Run build to confirm types compile**

  ```bash
  cd f2t-backend && npm run build 2>&1 | tail -10
  ```
  Expected: `Successfully compiled` with no errors. If TypeScript complains about the `SidecarOverride` fields, check that the field names used via `ov.targetPrice ?? ov.target_price` etc. all exist in the interface.

- [ ] **Step 5: Run all tests**

  ```bash
  cd f2t-backend && npm test 2>&1 | tail -10
  ```
  Expected: 46/46 tests pass.

- [ ] **Step 6: Commit**

  ```bash
  git add f2t-backend/src/modules/dynamic-pricing/dynamic-pricing.service.ts
  git commit -m "fix: replace any types with SidecarOverride interface in dynamic-pricing.service.ts (TD-015)"
  ```

---

## Task 4: TD-035 — Write DYNAMIC-PRICING-INTEGRATION.md

**Files:**
- Create: `f2t-backend/docs/DYNAMIC-PRICING-INTEGRATION.md`

- [ ] **Step 1: Create the docs directory if needed**

  ```bash
  mkdir -p f2t-backend/docs
  ```

- [ ] **Step 2: Write the file**

  Create `f2t-backend/docs/DYNAMIC-PRICING-INTEGRATION.md` with the following content:

  ````markdown
  # Dynamic Pricing — Integration & Graduation Guide

  ## Architecture Overview

  Three components work together:

  - **`pricing-sidecar/`** — FastAPI service (Python 3.11). Loads Double-DQN checkpoints from `dynamic-pricing-v2/checkpoints/` and CoreML freshness classifiers from `freshnessmodels-1/`. Exposes `POST /predict`, `POST /freshness/classify`, and `GET /health`. Start with `cd pricing-sidecar && uvicorn main:app --port 8000`.
  - **`f2t-backend/src/modules/dynamic-pricing/`** — NestJS module that wraps the sidecar. Isolated — no changes to any other module's controller or service.
  - **`f2t-backend/src/common/interceptors/dynamic-pricing.interceptor.ts`** — `APP_INTERCEPTOR` that enriches `/api/products` responses with `dynamicPrice`, `freshnessScore`, `priceTag` from accepted overrides. Only active when `PRICING_MODE=advisory`.

  ---

  ## Environment Variables

  | Variable | Default | Description |
  |---|---|---|
  | `PRICING_MODE` | `shadow` | `shadow` = internal KPI only. `advisory` = farmers see suggestions. |
  | `PRICING_SIDECAR_URL` | `http://localhost:8000` | URL of the FastAPI pricing sidecar. |
  | `PRICING_CRON_SCHEDULE` | `0 * * * *` | Cron expression for `runPricingTick` (every hour). |
  | `PRICING_SUGGESTION_TTL_HOURS` | `1` | Hours a price override stays valid before expiring. |

  Add these to `.env.development` (or the appropriate env file). The sidecar must be running for the pricing tick to produce results.

  ---

  ## Phase 1 — Shadow Mode

  **When to use:** Default. Run this for at least 7 days before considering advisory graduation.

  **How it works:**
  1. Every hour, `runPricingTick` fires for all active products.
  2. Sidecar computes a `targetPrice` per product; result stored as `status='shadow'` in `price_overrides` collection.
  3. No farmer-visible changes. Consumers see only `pricePerUnit`.

  **How to monitor:**
  ```
  GET /api/dynamic-pricing/shadow-report   (requires admin JWT)
  ```
  Response fields:
  - `mode` — current pricing mode
  - `shadowDays` — days since first shadow override
  - `safetyClipRate` — fraction of overrides clipped by safety bounds (target: < 0.10)
  - `advisoryStats` — accept/reject counts (zero in shadow mode)

  **Graduation criteria:**
  - `shadowDays >= 7`
  - `safetyClipRate < 0.10` (less than 10% of suggestions clipped)
  - No sidecar error rate > 5% (check backend logs)

  ---

  ## Phase 2 — Advisory Mode

  **When to use:** After Phase 1 graduation criteria are met.

  **How to enable:**
  ```
  # .env.development (or .env.production)
  PRICING_MODE=advisory
  ```
  Restart the backend. No code changes required.

  **How it works:**
  1. Pricing tick stores overrides as `status='pending_review'`.
  2. Farmer receives push notification: "New price suggestion for [product]."
  3. Farmer reviews via `GET /api/dynamic-pricing/suggestions` (farm JWT required).
  4. Farmer accepts (`PATCH .../accept`) or rejects (`PATCH .../reject`).
  5. Accepted overrides: `DynamicPricingInterceptor` enriches `/api/products` responses with `dynamicPrice`, `freshnessScore`, `priceTag`.
  6. Overrides expire after `PRICING_SUGGESTION_TTL_HOURS` (default 1h). Expired overrides revert to base price automatically.

  **Farmer UX validation checklist:**
  - [ ] Push notification received within 5 minutes of pricing tick
  - [ ] `/api/dynamic-pricing/suggestions` returns correct product names and price deltas
  - [ ] Accept action updates product card `dynamicPrice` within one request cycle
  - [ ] Reject action removes suggestion from pending list
  - [ ] Expired suggestion reverts product card to base `pricePerUnit`

  ---

  ## Phase 3 — Live Mode (Future)

  **Out of scope for current implementation.**

  Live mode would write `targetPrice` directly to `products.pricePerUnit` on accept, making the change permanent rather than overlay-based. This requires:
  - Additional audit trail (price history collection)
  - Farmer notification of permanent change
  - Admin override/revert capability

  Do not implement without explicit developer approval.

  ---

  ## Rollback Procedure

  To revert from advisory back to shadow at any time:
  ```
  PRICING_MODE=shadow
  ```
  Restart the backend. All `pending_review` overrides become invisible to farmers immediately. Accepted overrides already applied continue showing until their `expiresAt` TTL lapses (max 1h by default).

  To purge all overrides:
  ```js
  // MongoDB shell
  db.price_overrides.deleteMany({})
  db.freshness_cache.deleteMany({})
  ```

  ---

  ## Sidecar Checkpoint Locations

  | Agent | Path |
  |---|---|
  | Leafy DQN | `dynamic-pricing-v2/checkpoints/dqn_leafy.pt` |
  | Root DQN | `dynamic-pricing-v2/checkpoints/dqn_root.pt` |
  | Fruit DQN | `dynamic-pricing-v2/checkpoints/dqn_fruit.pt` |
  | Herbs DQN | `dynamic-pricing-v2/checkpoints/dqn_herbs.pt` |
  | Fruit freshness (CoreML) | `freshnessmodels-1/MyFreshnessClassifier-fruit.mlmodel` |
  | Root freshness (CoreML) | `freshnessmodels-1/MyFreshnessClassifier-root.mlmodel` |

  Archived models in `untouch/` — do not use.

  **Weibull fallback** (no freshness scan available): vegetables/leafy λ=0.97, fruits λ=0.985, herbs λ=0.96, other λ=0.995. Freshness = λ^24.
  ````

- [ ] **Step 3: Verify the file exists and is non-empty**

  ```bash
  wc -l f2t-backend/docs/DYNAMIC-PRICING-INTEGRATION.md
  ```
  Expected: > 80 lines.

- [ ] **Step 4: Commit**

  ```bash
  git add f2t-backend/docs/DYNAMIC-PRICING-INTEGRATION.md
  git commit -m "docs: add dynamic pricing integration and graduation guide (TD-035)"
  ```

---

## Task 5: Update CONTEXT.md

**Files:**
- Modify: `CONTEXT.md` (repo root)

- [ ] **Step 1: Mark resolved items in Known Issues table**

  Update the following rows:

  | ID | New Status |
  |---|---|
  | TD-002 | ✅ Fixed |
  | TD-003 | ✅ Fixed (was already correct) |
  | TD-015 | ✅ Fixed |
  | TD-031 | ✅ Fixed |
  | TD-032 | ✅ Fixed (was already complete) |
  | TD-033 | ✅ Fixed (was already complete) |
  | TD-034 | ✅ Fixed (was already complete) |
  | TD-035 | ✅ Fixed |

- [ ] **Step 2: Update "Last updated" and "Last session" fields**

  ```
  Last updated: 2026-05-29
  Last session: Tech debt cleanup — resolved TD-002/031/035 + any types in dynamic-pricing.service.ts. Verified TD-003/015/032/033/034 already resolved. Backend 46/46 tests pass. Build clean.
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add CONTEXT.md
  git commit -m "chore: update CONTEXT.md — mark TD-002/003/015/031/032/033/034/035 resolved"
  ```

---

## Final Verification

- [ ] Run full backend test suite: `cd f2t-backend && npm test`  
  Expected: **46/46 tests pass**

- [ ] Run lint: `cd f2t-backend && npm run lint`  
  Expected: no errors

- [ ] Run build: `cd f2t-backend && npm run build`  
  Expected: `Successfully compiled`
