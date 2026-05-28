# Feature Context — Personalized Product Recommender

## What we are building

A "For You" personalized product recommendation system inside the existing f2t marketplace app.

**Inputs:** A consumer's order history + the product catalog.
**Output:** Top-K personalized product recommendations, surfaced as a "For You" section on the home screen and a "Similar products" section on each product detail screen.

## Why this and not dynamic pricing

The Phase 10 dynamic-pricing path is partially built but has supplier game-theoretic issues (farmers would not accept blanket automated markdowns). A recommender solves a related goal — moving the right inventory to the right customers, reducing waste indirectly — without touching prices. It is also the single most universal e-commerce ML feature, easy to demo, and immediately useful to consumers.

## End-state user experience

1. **Home screen, logged-in consumer:** new "For You" section below the search bar, before "Featured products". Shows 6 personalized cards. Pull-to-refresh re-fetches.
2. **Product detail screen:** new "Similar products" carousel at the bottom. Shows 6 items.
3. **Cold-start (no order history):** falls back to "Trending in your area" — top-selling products in the consumer's geographic region (last 30 days).

## Architecture (mirrors existing pricing-sidecar pattern)

```
React Native frontend (f2t-frontend)
    │  src/api/recommendations/use-*.tsx (react-query-kit hooks)
    │  src/components/recommendations/for-you-section.tsx
    │  src/components/recommendations/similar-products.tsx
    ▼
NestJS backend (f2t-backend)
    │  src/modules/recommendations/
    │     recommendations.module.ts
    │     recommendations.controller.ts
    │     recommendations.service.ts
    │     schemas/recommendation-cache.schema.ts
    │     dto/
    │
    │  3 endpoints (mounted at /api/recommendations/):
    │    GET  /for-you                       (auth: consumer)
    │    GET  /similar-to/:productId         (auth: any)
    │    GET  /trending                      (auth: none — cold-start fallback)
    ▼
recommender-sidecar (FastAPI, port 8001 — mirrors pricing-sidecar at 8000)
    │  main.py
    │     POST /recommend/for-user       body: { userId, k }
    │     POST /recommend/similar-items  body: { productId, k }
    │     POST /recommend/trending       body: { region?, k }
    │     POST /train                    (called by cron, rebuilds the model)
    │  model.py
    │     ItemItemCF — co-occurrence + cosine similarity (numpy/scipy)
    │     PopularityModel — fallback for cold-start
    │  data.py
    │     Loads orders + products from MongoDB (read-only)
    ▼
MongoDB (existing f2t database — orders, products, users collections)
```

The sidecar holds the model in memory. On boot it loads orders, builds the co-occurrence matrix, and serves. Retraining is triggered by a cron hourly call from the NestJS module (same pattern as `PricingTick`).

## ML approach (12-hour-feasible)

**Phase A (must ship, hours 1-3):** Item-item collaborative filtering.

- Build a `(user × item)` interaction matrix from the orders collection: cell = 1 if user has ever ordered that item.
- Compute item-item similarity = cosine similarity of column vectors.
- For a user u: score(item) = Σ over u's history of `sim(history_item, item)`. Recommend top-K not-yet-purchased.
- Cold-start (no history): popularity rank.

This is simple, fast (< 1 sec to rebuild on hundreds of users), and is genuine collaborative filtering — defensible as ML.

**Phase B (stretch, hours 9-10, only if A is done and tested):** A neural two-tower model in PyTorch.
- User tower: embedding of last 10 item IDs → mean-pool → 32-dim
- Item tower: embedding from `(category, isOrganic, farmId)` → 32-dim
- Score = dot product
- Trained on positive (ordered) and sampled-negative pairs
- Replaces the cosine scorer if it beats it on hold-out hit-rate@6

Phase B is optional. Do not start it unless Phase A is integrated and demoable.

## What we reuse from existing project

| Concern | Reuse |
|---|---|
| Sidecar pattern | `pricing-sidecar/` — copy structure, requirements.txt format, README structure |
| NestJS module pattern | `src/modules/dynamic-pricing/` — copy module/service/controller layout |
| MongoDB connection | Sidecar reads via `MONGODB_URI` (same env var) using `motor` async driver |
| Frontend api layer | `src/api/products/` — same react-query-kit hook pattern |
| Frontend UI primitives | `src/components/ui/` and `src/components/products/product-card.tsx` |
| Auth | JWT, no changes. Endpoints use `@UseGuards(JwtAuthGuard)` |
| Response envelope | `{ success, data, message? }` enforced by global interceptor |
| Pagination shape | Reuse `{ items, total, page, limit, hasMore }` — but for recommendations we use `{ items, total }` (no pagination, K-capped) |

## What we explicitly skip (12-hour scope cuts)

- No A/B testing framework. Single deploy, all consumers see recommendations.
- No analytics events (no impression/click tracking yet — can be added later).
- No admin tuning UI. Hyperparameters in code constants.
- No fallback to LLM-based generation. ML or popularity.
- No images/photo CNN. Text/ID features only.
- No real-time online learning. Batch retrain hourly is enough.
- No multi-language ranking. Vietnamese product names treated as opaque strings.
- No farm-side recommendations. Consumer-side only for v1.

## Success criteria (definition of "shipped")

By the end of hour 12, all of the following must hold:

1. `recommender-sidecar/` exists, has `requirements.txt`, runs with `uvicorn main:app --port 8001`, responds to all four POST endpoints with valid JSON.
2. NestJS `recommendations` module is wired into `app.module.ts`, lint-clean, unit tests for controller + service pass (minimum 4 tests).
3. Frontend home screen shows the "For You" section for logged-in consumers, with at least 6 product cards rendered from the API. Pull-to-refresh works.
4. Frontend product detail screen shows the "Similar products" carousel.
5. Cold-start works: a brand-new account sees "Trending" cards instead of an empty state.
6. The seed account `consumer1@f2t.vn` has at least 3 orders (use the existing seed; if not, seed more) so we can demo a non-cold-start user.
7. README in `recommender-sidecar/` documents the setup + retraining flow.
8. End-to-end demo: log in as `consumer1@f2t.vn`, open the home screen on a device/simulator, the "For You" section renders within 2 seconds.

If any of 1-6 is missing at hour 11, cut Phase B and any stretch goals; ship Phase A only.
