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
