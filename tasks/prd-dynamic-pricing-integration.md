# PRD: Dynamic Pricing Integration (Wrapper Architecture)

## Overview

Integrate the `dynamic_pricing_1_copy` MARL pricing system and CoreML freshness classifier into the F2T app. The integration follows a **strict wrapper pattern**: no existing modules, schemas, controllers, or services are modified. All new code is additive and isolated.

---

## Goals

1. Farm staff can scan produce and submit a freshness score from the iOS app.
2. An hourly background process computes dynamic price suggestions using the RL models.
3. **Farmer advisory mode:** suggested prices are surfaced to farm owners as recommendations they can accept or reject — the algorithm never overrides a farmer's price without consent.
4. Product listings transparently reflect farmer-approved dynamic prices without the existing `products` module knowing about them.
5. A shadow mode validates pricing quality before any suggestion reaches a farmer.

## Non-Goals

- Modifying `products.service.ts`, `products.controller.ts`, `product.schema.ts`, or any existing module.
- Retraining the RL models.
- Android support for on-device freshness inference (Phase 1 iOS only).
- Replacing Stripe or order pricing — dynamic prices affect display and cart only.
- Full automation (live mode) — this PRD ends at farmer advisory mode. Live mode is a future decision.

---

## Deployment Phases

```
Phase 1 — Shadow         Phase 2 — Advisory          Phase 3 — Live (future)
──────────────────       ────────────────────         ──────────────────────
Model runs silently.     Farmers see suggestions.     Model auto-applies prices.
No user sees output.     They accept or reject.       No human review needed.
Internal KPI check       Accepted prices shown        (Out of scope for now)
only. 7-day gate.        to consumers.
```

Transition from Shadow → Advisory: set `PRICING_MODE=advisory` after 7 consecutive days meeting graduation criteria.
Transition from Advisory → Live: explicitly out of scope — requires a separate product decision.

---

## Architecture: Wrapper Pattern

```
┌─────────────────────────────────────────────────────────┐
│  EXISTING CODEBASE (zero changes)                        │
│  ProductsController → ProductsService → products coll.   │
└────────────────────┬────────────────────────────────────┘
                     │ response passes through
                     ▼
┌─────────────────────────────────────────────────────────┐
│  DynamicPricingInterceptor  (APP_INTERCEPTOR)            │
│  Activates only on /api/products routes                  │
│  Merges { dynamicPrice, freshnessScore, priceTag }       │
│  ONLY for overrides with status = 'accepted'             │
│  Reads from price_overrides collection (read-only)       │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  DynamicPricingModule  (new, isolated)                   │
│  ├── price-override.schema.ts  (new collection)          │
│  ├── freshness-cache.schema.ts (new collection)          │
│  ├── dynamic-pricing.service.ts                          │
│  ├── dynamic-pricing.controller.ts                       │
│  │     POST /api/dynamic-pricing/freshness/:productId    │
│  │     GET  /api/dynamic-pricing/suggestions             │
│  │     PATCH /api/dynamic-pricing/suggestions/:id/accept │
│  │     PATCH /api/dynamic-pricing/suggestions/:id/reject │
│  │     GET  /api/dynamic-pricing/shadow-report (admin)   │
│  └── pricing-tick.cron.ts  (hourly cron)                 │
└────────────────────┬──────────────────┬─────────────────┘
                     │ HTTP POST        │ push notification
                     │ /predict         │ (existing NotificationsService)
┌────────────────────▼──────┐  ┌────────▼────────────────────────────────┐
│  FastAPI Pricing Sidecar  │  │  Farm owner's device                     │
│  (new standalone service) │  │  Taps notification → price-suggestions   │
│  POST /predict            │  │  screen → Accept / Reject per product    │
│  GET  /health             │  └─────────────────────────────────────────┘
└───────────────────────────┘
```

### Why this satisfies the wrapper constraint

- `DynamicPricingInterceptor` is registered as `APP_INTERCEPTOR` in `AppModule` (one import added to `app.module.ts`). No controller or service file changes.
- `price_overrides` and `freshness_cache` are separate MongoDB collections. The `products` collection is never written.
- `NotificationsService` is injected into `DynamicPricingModule` as a dependency — not modified.
- The frontend adds three optional fields to the existing `Product` type and one badge component. All existing screens are unchanged.

---

## Components

### 1. FastAPI Pricing Sidecar (`pricing-sidecar/`)

Standalone Python 3.11 FastAPI app. Lives outside both `f2t-backend` and `f2t-frontend`.

**Endpoints:**
```
POST /predict
Body: {
  state_vectors: [{ productId, category, freshness, inventory_ratio,
                    ctr_proxy, base_price, hours_to_restock,
                    competitor_ref_price }]
}
Response: {
  overrides: [{ productId, targetPrice, delta_pct, safety_clipped, freshness_tag }]
}

GET /health
```

**Behavior:**
- Loads `checkpoints/phase3_best_qmix.pt` and `checkpoints/maddpg_phase2_final.pt` at startup.
- Maintains per-category GRU hidden states in memory (reset on restart).
- Applies the 5-rule safety layer before returning prices.
- Returns `safety_clipped: true` when a rule was triggered.

---

### 2. NestJS `DynamicPricingModule`

New module at `f2t-backend/src/modules/dynamic-pricing/`.

#### Schemas (new collections only)

`price_overrides`:
```ts
{
  productId: ObjectId,       // ref only, no populate
  farmId: ObjectId,          // used to route push notifications to the farm owner
  basePrice: number,
  targetPrice: number,
  deltaPct: number,
  freshnessScore: number,
  freshnessTag: 'fresh' | 'aging' | 'critical',
  safetyClipped: boolean,
  mode: 'shadow' | 'advisory',   // snapshot of PRICING_MODE at write time
  status: 'shadow'               // shadow mode — never shown
        | 'pending_review'       // advisory — awaiting farmer decision
        | 'accepted'             // farmer approved — interceptor will inject this
        | 'rejected'             // farmer declined — interceptor ignores
        | 'expired',             // TTL elapsed without a decision
  reviewedAt?: Date,
  reviewedBy?: ObjectId,         // userId of the farm owner who acted
  computedAt: Date,
  expiresAt: Date,               // computedAt + 1h; MongoDB TTL index
}
```

`freshness_cache`:
```ts
{
  productId: ObjectId,
  readings: [{ score: number, scannedAt: Date }],  // last 5, via $push/$slice
  medianScore: number,
  updatedAt: Date,
  expiresAt: Date,   // updatedAt + 6h; MongoDB TTL index
}
```

#### Controller routes

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/dynamic-pricing/freshness/:productId` | JWT + farm owner | Submit freshness scan score |
| `GET` | `/api/dynamic-pricing/suggestions` | JWT + farm owner | List pending suggestions for caller's farms |
| `PATCH` | `/api/dynamic-pricing/suggestions/:id/accept` | JWT + farm owner | Accept a suggestion |
| `PATCH` | `/api/dynamic-pricing/suggestions/:id/reject` | JWT + farm owner | Reject a suggestion |
| `GET` | `/api/dynamic-pricing/shadow-report` | AdminGuard | Shadow mode KPI dashboard |

#### Cron job (`pricing-tick.cron.ts`)

Every hour:
1. Queries MongoDB for all active products (`_id`, `category`, `price`, `stockQuantity`, `farmId`).
2. Left-joins with `freshness_cache` — falls back to Weibull decay formula when no scan exists.
3. Builds state vectors and POSTs to FastAPI sidecar.
4. Writes results to `price_overrides`:
   - `PRICING_MODE=shadow` → `{ mode: 'shadow', status: 'shadow' }`
   - `PRICING_MODE=advisory` → `{ mode: 'advisory', status: 'pending_review' }`
5. In advisory mode: groups new overrides by `farmId`, sends one push notification per farm owner via `NotificationsService.create(...)` (existing service, injected as dependency — not modified).

#### Push notification content (advisory mode)

```
Title: "Gợi ý giá mới"  ("New price suggestions")
Body:  "3 sản phẩm có gợi ý giá cập nhật. Nhấn để xem."
Data:  { screen: '/(app)/farm/price-suggestions' }
```

---

### 3. `DynamicPricingInterceptor`

Registered globally via `APP_INTERCEPTOR` in `AppModule`. Activates only on routes matching `/api/products`.

**Logic:**
1. Calls `next.handle()` to get the original response.
2. Passes through unchanged if `PRICING_MODE === 'shadow'`.
3. Extracts product IDs from `response.data.items[]` or `response.data` (single product).
4. Batch-fetches overrides where `status === 'accepted'` and `expiresAt > now` for those IDs.
5. Merges into each matching product: `dynamicPrice`, `freshnessScore`, `priceTag`.
6. Products with no accepted override pass through unchanged.

---

### 4. React Native Additions (frontend — additive only)

#### Type extension (`src/types.ts`) — 3 optional fields added

```ts
dynamicPrice?: number;
freshnessScore?: number;
priceTag?: 'flash_discount' | 'standard';
```

#### New API layer (`src/api/dynamic-pricing/`)

| File | Purpose |
|---|---|
| `types.tsx` | Request/response types for all 4 new endpoints |
| `use-submit-freshness.tsx` | Mutation: `POST /freshness/:productId` |
| `use-get-suggestions.tsx` | Query: `GET /suggestions` |
| `use-accept-suggestion.tsx` | Mutation: `PATCH /suggestions/:id/accept` |
| `use-reject-suggestion.tsx` | Mutation: `PATCH /suggestions/:id/reject` |

#### New screens

`src/app/(app)/farm/freshness-scan.tsx`
- Camera view → on-device CoreML → confirms score → calls `useSubmitFreshness`.

`src/app/(app)/farm/price-suggestions.tsx`
- Lists `pending_review` suggestions for the logged-in farm owner.
- Each row: product name | current price | suggested price | % delta | freshness tag | Accept / Reject buttons.
- Tapping the push notification deep-links directly to this screen.
- Accepted/rejected items disappear from the list via query invalidation.

#### New component (`src/components/ui/freshness-badge.tsx`)
- Shows "Flash Discount" badge when `product.priceTag === 'flash_discount'`.
- Used in existing product card (one ternary + badge render — the one permitted edit to an existing component).

---

### 5. CoreML On-Device Wrapper

`f2t-frontend/src/lib/freshness/freshness-classifier.ts` — thin TS wrapper around a native module.

- `classifyImage(imageUri: string, category: 'fruit' | 'root'): Promise<number>`
- On Android or model load failure: returns `0.7` (safe default, logs warning).
- Models bundled at `src/lib/freshness/models/MyFreshnessClassifier-{fruit,root}.mlmodel`.

---

## Shadow Mode Graduation Criteria

`PRICING_MODE=shadow` (default). Overrides are written but never shown to any user.

Graduate to advisory mode when **all three hold for 7 consecutive days**:
- Bias-adjusted counterfactual lift ≥ +8%
- Shadow waste rate ≤ 10%
- Safety clip rate ≤ 40%

To graduate: set `PRICING_MODE=advisory` in `.env.development` — no code change required.

---

## Environment Variables (backend)

```
PRICING_SIDECAR_URL=http://localhost:8000       # FastAPI sidecar base URL
PRICING_MODE=shadow                             # shadow | advisory  (live is out of scope)
PRICING_CRON_SCHEDULE=0 * * * *               # default: hourly
PRICING_SUGGESTION_TTL_HOURS=1                 # how long a suggestion stays pending
```

---

## API Contracts

### `POST /api/dynamic-pricing/freshness/:productId`

Auth: JWT + farm owner

Request: `{ "score": 0.82, "category": "fruit" }`

Response: `{ "success": true, "data": { "medianScore": 0.79, "freshnessTag": "fresh" } }`

---

### `GET /api/dynamic-pricing/suggestions`

Auth: JWT (farm owner — filtered to caller's farms)

Response:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "override_id",
        "productId": "abc123",
        "productName": "Cà chua bi",
        "basePrice": 35000,
        "targetPrice": 31500,
        "deltaPct": -10,
        "freshnessTag": "aging",
        "safetyClipped": false,
        "expiresAt": "2026-05-21T15:00:00Z"
      }
    ],
    "total": 1
  }
}
```

---

### `PATCH /api/dynamic-pricing/suggestions/:id/accept`

Auth: JWT + must own the farm the product belongs to

Response: `{ "success": true, "data": { "status": "accepted" } }`

Side effect: `price_overrides.status` → `'accepted'`. Interceptor will now inject this price into product responses.

---

### `PATCH /api/dynamic-pricing/suggestions/:id/reject`

Auth: JWT + farm ownership check

Response: `{ "success": true, "data": { "status": "rejected" } }`

---

### `GET /api/dynamic-pricing/shadow-report`

Auth: AdminGuard

Response:
```json
{
  "success": true,
  "data": {
    "mode": "shadow",
    "shadowDays": 3,
    "avgLift": 0.06,
    "wasteRate": 0.08,
    "safetyClipRate": 0.31,
    "graduated": false,
    "advisoryStats": {
      "totalSuggestions": 0,
      "acceptanceRate": null,
      "rejectionRate": null
    }
  }
}
```

In advisory mode, `advisoryStats` is populated with real acceptance/rejection rates.

---

### `POST /predict` (sidecar — internal)

Request:
```json
{
  "state_vectors": [
    {
      "productId": "abc123",
      "category": "fruit",
      "freshness": 0.82,
      "inventory_ratio": 0.45,
      "ctr_proxy": 0.12,
      "base_price": 35000,
      "hours_to_restock": 18,
      "competitor_ref_price": 33000
    }
  ]
}
```

Response:
```json
{
  "overrides": [
    {
      "productId": "abc123",
      "targetPrice": 31500,
      "delta_pct": -0.1,
      "safety_clipped": false,
      "freshness_tag": "aging"
    }
  ]
}
```

---

## Acceptance Criteria

- [ ] Existing test suites (`npm test`, `pnpm test`) pass with zero modifications to existing files.
- [ ] In shadow mode: product listing API response is completely unchanged regardless of computed overrides.
- [ ] In advisory mode: product listing API response is unchanged until a farmer accepts a suggestion.
- [ ] After a farmer accepts: product listing response contains `dynamicPrice` for that product.
- [ ] After a farmer rejects: product listing response remains unchanged.
- [ ] Farm owner receives a push notification after each hourly tick (advisory mode only).
- [ ] Suggestions screen lists only pending suggestions belonging to the logged-in farm owner.
- [ ] Accepting/rejecting a suggestion removes it from the pending list immediately.
- [ ] A suggestion with no farmer decision expires automatically via MongoDB TTL.
- [ ] Farm staff can submit a freshness score; it appears in `freshness_cache` within 1s.
- [ ] On iOS, freshness classifier runs on-device without a network call.
- [ ] Shadow report endpoint returns correct KPI values and acceptance stats.
- [ ] All new NestJS code passes `npm run lint && npm test`.
- [ ] All new frontend code passes `pnpm check-all`.
