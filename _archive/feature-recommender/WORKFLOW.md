# Workflow — 12-Hour Recommender Build

Total budget: **12 hours**. Each phase has a hard hour budget. If you run over, apply the cut rules in `RULES.md`.

Commit at the end of each phase. Conventional commit messages (`feat:`, `fix:`, `chore:`).

---

## Phase 0 — Sidecar scaffold (45 min, budget 0:00-0:45)

**Goal:** A FastAPI service at port 8001 that returns dummy recommendations.

**Tasks:**
1. `mkdir recommender-sidecar` at project root.
2. Copy structure from `pricing-sidecar/`: `main.py`, `requirements.txt`, `README.md`, `tests/`.
3. `requirements.txt`: `fastapi, uvicorn[standard], motor, numpy, scipy, pydantic, pytest, httpx`.
4. `main.py`: declare the 4 endpoints, each returning hardcoded `{"items": [], "source": "stub"}`. Pydantic models for request/response.
5. Test by hand: `cd recommender-sidecar && uvicorn main:app --port 8001 --reload`, then `curl -X POST http://localhost:8001/recommend/trending -H 'Content-Type: application/json' -d '{"k": 6}'`.
6. Commit: `feat(recommender): scaffold sidecar`.

**Exit:** all 4 endpoints reachable with valid JSON envelopes.

---

## Phase 1 — Data layer + ItemItemCF model (2h, budget 0:45-2:45)

**Goal:** Real model wired to MongoDB. `recommend/for-user` returns real product IDs.

**Tasks:**
1. `data.py`:
   - Async Mongo connection via `motor`.
   - `load_orders()` → list of `(userId, productId)` pairs from `orders.items[]`.
   - `load_products()` → list of product dicts (id, category, isOrganic, farmId).
   - Filter: only orders with `status in {paid, shipped, delivered}`. Last 90 days for performance.
2. `model.py`:
   - `class ItemItemCF`:
     - `fit(orders)`: build user-item sparse matrix; compute item-item cosine similarity via `sklearn.metrics.pairwise.cosine_similarity` (add `scikit-learn` to requirements if needed) OR pure scipy.sparse.
     - `recommend_for_user(user_id, k)` → top-k product IDs not already bought.
     - `similar_to(product_id, k)` → top-k by similarity.
   - `class PopularityModel`:
     - `fit(orders)`: rank by total order count last 30 days.
     - `top_k(k)` → product IDs.
3. `main.py` wire:
   - Boot-time: `await load_orders()`, `model.fit()`, store models in `app.state`.
   - `/recommend/for-user`: try `ItemItemCF`; if user has < 3 orders, use `PopularityModel`.
   - `/recommend/similar-items`: `ItemItemCF.similar_to`.
   - `/recommend/trending`: `PopularityModel.top_k`.
   - `/train`: rebuild both models from current DB state.
4. **Sanity tests (3, in `tests/test_model.py`):**
   - Cold-start user (empty history) → returns popular items, not empty.
   - User with history → returns items not in history.
   - `similar_to(X)` returns items, X not in the result.

**Exit:**
- Curl test with `consumer1@f2t.vn`'s actual user ID returns 6 product IDs from the live DB.
- `pytest tests/` passes 3 tests.
- Sidecar boot time < 10s on the seed dataset.

**Commit:** `feat(recommender): item-item CF + popularity model`.

---

## Phase 2 — NestJS recommendations module (2h, budget 2:45-4:45)

**Goal:** Three authenticated endpoints in the f2t backend that proxy to the sidecar.

**Tasks:**
1. `nest g module recommendations` (or create manually following `dynamic-pricing` module layout).
2. `recommendations.module.ts`:
   - Imports: `HttpModule` (for axios to sidecar), `MongooseModule.forFeature([{name: 'Product', schema: ProductSchema}])` so we can hydrate product details.
   - Provides: `RecommendationsService`, `RecommendationsController`.
3. `schemas/recommendation-cache.schema.ts`:
   - `{ key: string (e.g. "for-you:userId"), productIds: string[], expiresAt: Date }`.
   - TTL index on `expiresAt`. Cache TTL = 1h.
4. `recommendations.service.ts`:
   - `getForUser(userId, k=6)`:
     - Check cache → return if fresh.
     - Else: HTTP POST to `${RECOMMENDER_SIDECAR_URL}/recommend/for-user` with timeout 1500ms.
     - Hydrate product IDs → full Product documents (Mongoose `find({_id: {$in: ids}})`, preserve order).
     - Cache and return.
   - `getSimilar(productId, k=6)`: same pattern.
   - `getTrending(k=6)`: same pattern. No auth.
   - **Fallback** on sidecar error: query Mongoose `Product.find().sort({popularity: -1}).limit(k)` or fallback to `Product.find().sort({-createdAt}).limit(k)`. Log the fallback. Never throw.
5. `recommendations.controller.ts`:
   - `GET /api/recommendations/for-you` — `@UseGuards(JwtAuthGuard)`, takes user from `@CurrentUser()` decorator.
   - `GET /api/recommendations/similar-to/:productId` — auth: any.
   - `GET /api/recommendations/trending` — no auth.
   - Each returns `{ items: Product[], total: number }`.
6. Register in `app.module.ts`.
7. Add to `.env.development`: `RECOMMENDER_SIDECAR_URL=http://localhost:8001`.
8. **Tests (4, minimum):**
   - `recommendations.service.spec.ts`:
     - Cache hit returns without HTTP call (use mocked HttpService).
     - Sidecar failure → fallback path.
   - `recommendations.controller.spec.ts`:
     - `/for-you` requires auth.
     - `/trending` does not require auth.

**Exit:**
- `curl -H 'Authorization: Bearer <consumer1 token>' http://localhost:3000/api/recommendations/for-you` returns `{ success: true, data: { items: [...6 products], total: 6 } }`.
- `npm run lint` clean. `npm test src/modules/recommendations/` passes.

**Commit:** `feat(recommendations): backend module + sidecar proxy + fallback`.

---

## Phase 3 — Frontend API layer (1h, budget 4:45-5:45)

**Goal:** React-query hooks that the UI can consume.

**Tasks:**
1. Create `f2t-frontend/src/api/recommendations/`:
   - `types.tsx`: `RecommendationsResponse = { items: Product[]; total: number }`.
   - `use-get-for-you.tsx`: `createQuery` from react-query-kit, GET `/recommendations/for-you`.
   - `use-get-similar.tsx`: takes `productId` variable.
   - `use-get-trending.tsx`: no variables.
   - `index.tsx`: re-export.
2. Stale time 5 min, cache time 30 min.
3. Disable `for-you` query when no user is logged in (use `enabled` flag).

**Exit:** Hooks compile. `pnpm type-check` clean.

**Commit:** `feat(recommendations): frontend api hooks`.

---

## Phase 4 — Frontend integration on home screen (1.5h, budget 5:45-7:15)

**Goal:** "For You" section live on the home screen, demoable on a device.

**Tasks:**
1. Create `f2t-frontend/src/components/recommendations/for-you-section.tsx`:
   - Title row: "For You" (left) + invisible chevron link (no nav target for v1).
   - Calls `useGetForYou` for consumers; `useGetTrending` for guests/cold-start.
   - Horizontal scroll of `<ProductCard />` (reuse the existing component).
   - Loading: 3 skeleton cards.
   - Empty / error: render nothing (whole section hides).
2. Edit `src/app/(app)/home.tsx`: import and place `<ForYouSection />` immediately below the search bar, before "Featured products".
3. Run the app on a simulator. Log in as `consumer1@f2t.vn`. Confirm rendering.

**Exit:**
- Section appears for `consumer1@f2t.vn`. Cards render. Scroll works.
- Section also appears for a fresh seed account (trending fallback).
- Pull-to-refresh on home screen refetches the section.

**Commit:** `feat(recommendations): For You section on home`.

---

## Phase 5 — Frontend integration on product detail (1h, budget 7:15-8:15)

**Goal:** Similar-products carousel under each product detail screen.

**Tasks:**
1. Locate the product detail file (search for the route handling `products/[id]` or similar in `src/app/`).
2. Create `f2t-frontend/src/components/recommendations/similar-products.tsx`:
   - Calls `useGetSimilar({ productId })`.
   - Same shape as ForYouSection but title "Similar products".
3. Add to product detail screen at the bottom.

**Exit:**
- Open any product detail in the running app — carousel appears with 6 items.

**Commit:** `feat(recommendations): similar products on product detail`.

---

## Phase 6 — Cron retrain + reliability polish (45 min, budget 8:15-9:00)

**Goal:** The sidecar's model stays fresh as new orders happen.

**Tasks:**
1. Add a `RecommendationsRetrainCron` service in the backend (use `@nestjs/schedule` — already in the project per pricing-sidecar pattern):
   - `@Cron(RECOMMENDER_RETRAIN_CRON)` (default `0 * * * *` — hourly).
   - HTTP POST to `${RECOMMENDER_SIDECAR_URL}/train`.
   - Log success/failure. Don't crash on sidecar down.
2. Manual sanity: `curl -X POST http://localhost:8001/train` returns 200 and rebuild logs appear.
3. Verify the home-screen recommendations update after a new order is placed and `/train` is hit.

**Exit:** Cron registered, manual `/train` works, logs show retrain success.

**Commit:** `feat(recommendations): hourly retrain cron`.

---

## Phase 7 — Demo prep + README + screenshots (1h, budget 9:00-10:00)

**Goal:** Anything you'd want before walking into a thesis demo.

**Tasks:**
1. `recommender-sidecar/README.md`:
   - How to install (`pip install -r requirements.txt`).
   - How to run (`uvicorn main:app --port 8001`).
   - The 4 endpoints with example curl.
   - Retrain frequency note.
2. Update `f2t/CONTEXT.md` "Module Status" table — add a row for `Recommendations`. (One line only. Inherit format.)
3. Take 3 screenshots: home with "For You" section, product detail with "Similar products", terminal with sidecar boot logs. Save under `f2t/feature-recommender/screenshots/`.
4. Smoke test the full flow once on device. Note any bugs in a `KNOWN_ISSUES.md` if you can't fix them in budget.

**Commit:** `docs(recommendations): README + module status + screenshots`.

---

## Phase 8 — STRETCH: Two-tower neural model (1.5h, budget 10:00-11:30)

**Skip this entire phase if Phases 0-7 are not all green by hour 9:30.**

**Goal:** A small PyTorch model that beats `ItemItemCF` on hit-rate@6 on a hold-out split. If it wins, swap it in.

**Tasks:**
1. Add `torch` to sidecar requirements. New file `neural_model.py`:
   - User tower: nn.EmbeddingBag for last 10 ordered product IDs, → mean-pool → Linear(32).
   - Item tower: concat of (categoryEmbed, isOrganicFlag, farmEmbed) → Linear(32).
   - Score = dot product.
2. Train script: positive (user, item) pairs from orders; sample 4 negatives per positive; BCE loss; 5 epochs; Adam 1e-3.
3. Hold-out 20% of (user, item) pairs. Compute hit-rate@6 for both models.
4. If neural wins by ≥ 3pp absolute hit-rate, set `app.state.model = NeuralCF`. Otherwise keep `ItemItemCF`. Log the decision.

**Exit:** A JOURNAL-style note documenting which model won and by how much.

**Commit:** `feat(recommender): neural CF baseline + ablation`.

---

## Phase 9 — Final pass (30 min, budget 11:30-12:00)

**Tasks:**
1. Run all backend tests: `cd f2t-backend && npm run lint && npm test`. Both must be clean.
2. Run frontend lint + type-check: `cd f2t-frontend && pnpm check-all`. Must be clean.
3. Verify both services still start cleanly: backend `npm run start:dev`, sidecar `uvicorn main:app --port 8001`.
4. Last screenshot for the demo.
5. Final commit if needed.

**Definition of done:** all 8 success criteria in CONTEXT.md hold true.

---

## Time accounting cheat sheet

| Phase | Budget | Cumulative |
|---|---|---|
| 0 — Sidecar scaffold | 0:45 | 0:45 |
| 1 — ItemItemCF model | 2:00 | 2:45 |
| 2 — NestJS module | 2:00 | 4:45 |
| 3 — Frontend api hooks | 1:00 | 5:45 |
| 4 — Home screen integration | 1:30 | 7:15 |
| 5 — Product detail integration | 1:00 | 8:15 |
| 6 — Cron + reliability | 0:45 | 9:00 |
| 7 — README + screenshots | 1:00 | 10:00 |
| 8 — STRETCH neural CF | 1:30 | 11:30 |
| 9 — Final pass | 0:30 | 12:00 |

If you are 30 minutes behind by hour 6, drop Phase 5 (product detail) and Phase 8 (neural CF). Ship home-screen recommendations only.
