# F2T — Git History

**Author:** Nan Hyeager `<nanhyeager@gmail.com>`
**Span:** 23 Feb 2026 → 23 May 2026 (3 months, solo)

---

## Condensed log (`git log --oneline`)

```
a3f91d2 fix(pricing): apply accepted suggestion price to product immediately
7c04e1b feat(pricing): add POST /dynamic-pricing/run-tick for manual trigger
8b2de05 docs: write JOURNAL.md for forecast-sidecar
f19a3c4 docs: write ARCHITECTURE.md for forecast-sidecar
e72c880 docs: write JOURNAL.md for recommender-sidecar
d5a1042 docs: write ARCHITECTURE.md for recommender-sidecar
c3b9f17 chore: archive stale prompt and agent config files
b84aa31 fix(pricing): change PRICING_MODE shadow → advisory so suggestions reach UI
2f6c09e fix(pricing): rename product_id → productId in state vector payload (422 fix)
91d4c50 fix(forecast): _params → _holt_params attribute after Holt rewrite
4e87b1c refactor(pricing): load v16 QMIX+MADDPG checkpoints, per-category M vector
3d218fa refactor(recommender): add hard negatives, early stopping, EMBED_DIM 32→64
a92b15f refactor(recommender): temporal+quantity decay on ItemItemCF and MarketBasket
7f50c31 feat(frontend): DynamicPriceBadge on ProductCard for AI-adjusted prices
5c3e8d9 feat(frontend): analytics screen shortcut to price-suggestions
44a902f feat(frontend): price-suggestions screen — FreshnessScanner + SuggestionCard
e109b28 feat(pricing): NestJS dynamic-pricing module — cron, suggestions, review flow
3b74c11 feat(pricing): pricing-sidecar FastAPI with QMIX+MADDPG and safety layer
d81f044 feat(frontend): DemandForecastSection — sparklines, CI bars, restock alert
c9a6f20 feat(frontend): demand-forecast API hook, types, farm analytics integration
b5d83e7 feat(forecast): NestJS demand-forecast module — cache, cron, endpoints
82fe341 feat(forecast): ForecastModel Holt EWMA — CI bounds, DOW multipliers
7a1e095 feat(forecast): init forecast-sidecar FastAPI with motor data loader
3f0c9a2 feat(frontend): cart cross-sell "Complete your basket" horizontal section
2c88d4a feat(recommender): MarketBasketModel time-decayed co-occurrence + endpoint
f4ad7c8 feat(recommender): NeuralCF two-tower — BPR loss, item price/stock features
97b3c55 feat(recommender): ItemItemCF cosine similarity on user-item matrix
8e21c07 feat(recommender): NestJS recommendations module — cache, hydration, cron
6d40f1a feat(recommender): init recommender-sidecar FastAPI with PopularityModel
5b8e9f3 feat(frontend): add ForYou, Similar, Trending carousels on home screen
4af2e10 fix(frontend): resolve token refresh race condition on parallel 401 responses
3d91b82 feat(frontend): admin screens — ban, verify farm, platform analytics
9c07fa5 feat(frontend): farm owner dashboard, inventory, order lifecycle management
8b14c29 feat(frontend): Stripe checkout with expo-web-browser, order tracking maps
7a0fd18 feat(frontend): cart with Zustand persistence, quantity controls, price total
620c543 feat(frontend): product detail, farm profile, geospatial farm search screens
5f1e307 feat(frontend): auth screens — login, register, JWT storage in MMKV
4d93c1b feat(frontend): init React Native Expo SDK 53, NativeWind, file-based routing
3c820a6 feat(posts): community feed with mixed text/image/video, pagination, likes
2b7fe15 feat(uploads): Cloudinary upload with local uploads/ fallback
1a94d30 feat(admin): admin module — ban/verify/role-change, platform analytics
09f83e4 feat(notifications): low-stock cron alert, Expo Push integration
f8b7260 feat(notifications): notification schema, unread count, mark-read endpoint
e7c614d feat(delivery): GHN shipping provider with Dijkstra mock fallback
d6b5023 test(payments): add 7 test cases for Stripe webhook and checkout session
c5a4f12 feat(payments): Stripe webhook handler — authoritative order status update
b4930e1 feat(payments): Stripe Checkout Sessions, rawBody middleware for sig verify
a3821f0 feat(orders): full order lifecycle — pending → confirmed → shipped → delivered
923d0ef test(orders): embedded snapshot ensures price immutability after product update
82cef49 feat(products): category/price/stock filters, text search, low-stock trigger
71bd838 feat(farms): $geoNear two-phase geospatial search, verificationStatus flow
60ac727 fix(farms): swap coordinate order to [lng, lat] for GeoJSON Point compliance
4f0e5db feat(farms): farm schema with GeoJSON Point, delivery zones, business hours
3e9c616 test(auth): unit tests for login, register, JWT refresh, role guard
2d8b524 feat(users): user profile schema, update endpoint, push token (select:false)
1c7b433 feat(auth): JWT login/register/refresh, bcrypt, passport-jwt strategy
0b6a342 chore: configure MongoDB connection, ConfigModule, ValidationPipe, Swagger
9a5f21b chore: init NestJS 11 project — TypeScript 5.7, path aliases, ESLint
```

---

## Full commit log (`git log`)

```
commit a3f91d2e1b4c8d9f0a23456789abcdef01234567
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Fri May 23 22:35:08 2026 +0700

    fix(pricing): apply accepted suggestion price to product immediately

    reviewSuggestion() was updating the PriceSuggestion doc status to
    "accepted" but never writing targetPrice back to the Product document.
    Add findByIdAndUpdate(productId, { pricePerUnit: targetPrice }) on accept.
    Rejection leaves the product price unchanged as intended.

commit 7c04e1b3a2d5f8e9c0b1234567890abcdef12345
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Fri May 23 21:48:22 2026 +0700

    feat(pricing): add POST /dynamic-pricing/run-tick for manual trigger

    Cron fires only on the hour. Add a dev/admin endpoint so pricing
    suggestions can be generated on demand without waiting. Protected
    by AdminGuard. Injects PricingTickCron and calls runTick() directly.

commit 8b2de05f7c6e4d3b2a1098765432109876543210
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Fri May 23 17:20:44 2026 +0700

    docs: write JOURNAL.md for forecast-sidecar

    Full re-creation guide: environment setup, seed requirements, startup
    commands, verification steps. Covers every design decision with rationale
    (why Holt over ARIMA/Prophet, why α=0.3 β=0.1, why 80% CI, why min 14
    days for DOW multipliers). Training internals line-by-line. Common failure
    modes and how to recover. Upgrade path to STL/SARIMA at scale.

commit f19a3c4e8d7b6a5c4321098765432109876543ab
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Fri May 23 16:05:33 2026 +0700

    docs: write ARCHITECTURE.md for forecast-sidecar

    Documents Holt's EWMA equations (level/trend update, prediction interval,
    DOW multipliers, cold-start fallback). API endpoint table with request/
    response shapes. NestJS integration (cache TTL, cron, graceful degradation).
    Frontend component overview. Full dependency list.

commit e72c880b9a1d2e3f4567890123456789abcdef00
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Fri May 23 14:44:19 2026 +0700

    docs: write JOURNAL.md for recommender-sidecar

    Re-creation guide from zero: venv, seed, startup, manual retrain, health
    check. Design decision rationale: item-item vs user-user CF, temporal
    decay lambda and log1p(qty) choices, BPR loss, hard negatives, why
    min_count=2.0 in MarketBasket. Training internals with pseudocode.
    Current ablation results. Common issues (cold-start, motor connection).

commit d5a10422c3b4e5f6789012345678901234567890
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Fri May 23 11:30:57 2026 +0700

    docs: write ARCHITECTURE.md for recommender-sidecar

    Full system design: service topology, data flow diagram, all four model
    descriptions (ItemItemCF, NeuralCF two-tower, MarketBasket, Popularity).
    Weight formula w = log1p(qty) * exp(-λ*days). BPR loss and hard negative
    sampling. API endpoint table. NestJS cache/hydration integration.
    Performance benchmarks at current data scale.

commit c3b9f17d8e2a1b4c5678901234567890abcdef11
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Thu May 22 20:15:36 2026 +0700

    chore: archive stale prompt and agent config files to _archive/

    Move 21 obsolete files/dirs (FEATURE_PHASE*.md, RULE.md, WORKFLOW.md,
    VALIDATION_*.md, config files/, feature-recommender/, prompts/, etc.)
    to _archive/ so they are preserved but out of the way. Root directory
    now contains only active project files.

commit b84aa31f9e0d1c2b3456789012345678901234ab
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Thu May 22 15:22:48 2026 +0700

    fix(pricing): change PRICING_MODE shadow → advisory so suggestions reach UI

    With PRICING_MODE=shadow all PriceSuggestion docs get status="shadow".
    getSuggestionsForOwner() filters for status="pending_review" so farm
    owners saw 0 suggestions. Switch to "advisory" mode which sets
    status="pending_review" and sends push notifications on generation.

commit 2f6c09e4a8b7c6d5e3210987654321098765432f
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Thu May 22 11:08:03 2026 +0700

    fix(pricing): rename product_id → productId in state vector payload (422)

    pricing-tick.cron.ts was building state vectors with key "product_id"
    (snake_case). The FastAPI Pydantic model expects "productId" (camelCase).
    Mismatch caused HTTP 422 Unprocessable Entity on every tick. One-line fix
    in dynamic-pricing.service.ts runPricingTick().

commit 91d4c50e3f2b1a0c9876543210987654321098ab
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Wed May 21 22:44:17 2026 +0700

    fix(forecast): _params → _holt_params attribute after Holt rewrite

    After upgrading ForecastModel from polyfit to Holt EWMA, the internal
    dict was renamed _holt_params but main.py still referenced model._params
    in both the /health endpoint and the /train response. Caused 500 on
    every health check. Fixed both references.

commit 4e87b1cf0d9e8a7b6543210987654321098765cd
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Wed May 21 19:30:52 2026 +0700

    refactor(pricing): load v16 QMIX+MADDPG checkpoints, per-category M vector

    Replace the old pricing-sidecar implementation:
    - QMIXAgent obs_dim 15 → 16 (adds demand_ratio at position [15])
    - MADDPGActor scalar output → (4,) per-category M vector, no tanh
    - Checkpoint paths → phase3_best_qmix_v16.pt / phase3_best_maddpg_v16.pt
    - Price formula: delta = ACTIONS[argmax] + (M[cat] - 1.0), clipped ±0.30
    - M clipped to [0.85, 1.15] (from MADDPGTrainer clip_lo/clip_hi)

commit 3d218fab2e1c0d9f8765432109876543210987ef
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Tue May 20 21:15:44 2026 +0700

    refactor(recommender): hard negatives, early stopping, EMBED_DIM 32→64

    NeuralCF upgrades:
    - EMBED_DIM 32 → 64, ITEM_EMBED 16 → 32, CAT_EMBED/FARM_EMBED 8 → 16
    - Hard negatives sampled from top-50% popular items (not random)
    - Early stopping: patience=2, delta=0.001, restore best weights
    - Gradient clipping: clip_grad_norm_(params, 1.0)
    - price_norm and stock_norm added to item tower features

commit a92b15f3d4e5b6c7890123456789012345678901
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Tue May 20 16:40:28 2026 +0700

    refactor(recommender): temporal+quantity decay on ItemItemCF and MarketBasket

    Replace raw interaction counts with:
      weight = log1p(qty) * exp(-λ * days_ago)  where λ=0.02
    MarketBasket co-occurrence similarly decayed, min_count=2.0 prune threshold.
    load_orders_rich() and load_order_baskets_with_time() added to data.py.
    Backward-compatible: load_orders() delegates to load_orders_rich().

commit 7f50c31e6d4b3a2c1987654321098765432109bc
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Mon May 19 20:05:11 2026 +0700

    feat(frontend): DynamicPriceBadge on ProductCard for AI-adjusted prices

    Add dynamicPrice prop to ProductCardProps. When an accepted AI price
    exists, render the base price with strikethrough and an orange "AI" badge
    beside it. Works on both Default and Compact card variants.

commit 5c3e8d9f1a2b4c3e5678901234567890abcdef45
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Mon May 19 14:22:37 2026 +0700

    feat(frontend): analytics screen shortcut to price-suggestions

    Add "Gợi ý giá AI" action button below DemandForecastSection on the farm
    analytics screen. Tapping navigates to /(app)/farm/price-suggestions.
    Add price-suggestions to farm _layout.tsx Stack.Screen registry.

commit 44a902f8b7c5d4e3f2109876543210987654321a
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Sun May 18 21:50:09 2026 +0700

    feat(frontend): price-suggestions screen — FreshnessScanner + SuggestionCard

    New screen at /(app)/farm/price-suggestions:
    - FreshnessScanner: product horizontal scroll, 3 freshness presets
      (Tươi 90% / Già 60% / Khẩn 20%), result banner after submit
    - SuggestionCard: base vs target price, delta%, freshness tag badge,
      accept/reject buttons with loading state
    - Protected by RouteGuard allowedRoles=['farm']

commit e109b28c7a6d5e4f3210987654321098765432bc
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Sat May 17 18:33:52 2026 +0700

    feat(pricing): NestJS dynamic-pricing module — cron, suggestions, review

    New module f2t-backend/src/modules/dynamic-pricing/:
    - PricingTickCron: hourly cron, calls runPricingTick() on service
    - DynamicPricingService: submitFreshness, runPricingTick, reviewSuggestion,
      getSuggestionsForOwner, getShadowReport
    - Controller: POST freshness/:productId, GET suggestions,
      PATCH suggestions/:id/accept|reject, GET shadow-report
    - Schemas: PriceOverride (TTL on expiresAt), FreshnessCache

commit 3b74c11d2e3a4b5c6789012345678901234567de
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Fri May 16 20:14:28 2026 +0700

    feat(pricing): pricing-sidecar FastAPI — QMIX + MADDPG + safety layer

    New pricing-sidecar/ service on port 8000:
    - QMIXAgent: GRU(obs=15, hidden=64) → Q-values for 5 price actions
    - MADDPGActor: MLP(obs=20) → strategic M multiplier
    - safety.py: ±30% bounds, freshness<0.4 forces ≤75%, cost floor 55%
    - POST /predict: takes ProductStateVector list, returns PriceOverride list
    - GET /health: model loaded status + hidden state summary

commit d81f044e9f0a1b2c3456789012345678901234ef
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Thu May 15 21:08:55 2026 +0700

    feat(frontend): DemandForecastSection — sparklines, CI bars, restock alert

    New component in src/components/dashboard/:
    - Sparkline: 7 bars, translucent CI range + solid point bar per day
    - confidenceStyle(): blue (≥70%), amber (≥40%), gray (<40%)
    - RestockAlert: ⚠ shown when trend=up AND confidence≥0.5
    - SkeletonRow loading state (3 rows)
    - Top 5 products by totalForecast, Vietnamese labels

commit c9a6f20f8e7d6b5a4321098765432109876543ab
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Wed May 14 16:45:22 2026 +0700

    feat(frontend): demand-forecast hook, types, farm analytics integration

    - src/api/demand-forecast/: types.tsx (PredictionPoint with lower/upper),
      use-get-farm-forecast.tsx (createQuery, stale 5min, cache 30min)
    - Add <DemandForecastSection farmId={farm.id} /> to farm analytics screen
      below revenue chart

commit b5d83e7a3c2b1d0e9876543210987654321098cd
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Tue May 13 20:30:14 2026 +0700

    feat(forecast): NestJS demand-forecast module — cache, cron, endpoints

    New module f2t-backend/src/modules/demand-forecast/:
    - DemandForecastService: getFarmForecast (1h cache), getProductForecast
    - DemandForecastCronService: hourly retrain via FORECAST_RETRAIN_CRON
    - ForecastCache schema: key/forecasts/expiresAt with TTL index
    - GET /api/demand-forecast/farm/:farmId
    - GET /api/demand-forecast/product/:productId
    - Fallback: { items: [], source: 'unavailable' } when sidecar unreachable

commit 82fe341c4d5e6f7a8901234567890123456789bc
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Mon May 12 19:55:43 2026 +0700

    feat(forecast): ForecastModel Holt EWMA — CI bounds, DOW multipliers

    Replace linear polyfit (unreliable on noisy short series) with Holt's
    Linear Exponential Smoothing:
    - α=0.3 (level), β=0.1 (trend)
    - 80% PI: ci_half = 1.28 * σ * √h, widens with horizon
    - DOW multipliers computed when product has ≥14 days of history
    - Category medians as cold-start fallback (<3 data points)
    - Confidence tiers: High(≥14d), Med(≥7d), Med-Low(≥3d), Low(<3d)

commit 7a1e095e8f9a0b1c2345678901234567890123de
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Sun May 11 17:20:38 2026 +0700

    feat(forecast): init forecast-sidecar FastAPI with motor data loader

    New forecast-sidecar/ service on port 8002:
    - data.py: load_order_items() async motor aggregation (qty by productId/day)
    - main.py: lifespan auto-fits on startup
    - POST /forecast/products, POST /train, GET /health
    - requirements.txt: fastapi, uvicorn, motor, pymongo, numpy, pandas

commit 3f0c9a2d1e4b5c6a789012345678901234567890
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Sat May 10 20:44:11 2026 +0700

    feat(frontend): cart cross-sell "Complete your basket" section

    New component CartCrossSellSection in src/components/recommendations/:
    - Horizontal scroll of up to 4 ProductCard (compact variant)
    - Hidden when cart is empty or cross-sell returns 0 items
    - use-get-cart-crosssell.tsx: createQuery on productIds, stale 10min
    - Rendered in cart.tsx below cart items, above checkout button

commit 2c88d4ab3f1e0d9c8765432109876543210987ef
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Fri May 09 21:18:55 2026 +0700

    feat(recommender): MarketBasketModel time-decayed co-occurrence + endpoint

    MarketBasketModel.fit() takes list[(basket, timestamp)].
    Co-occurrence weight decayed same as ItemItemCF (λ=0.02).
    min_count=2.0 prunes low-signal pairs.
    POST /recommend/cart-crosssell added to sidecar.
    POST /api/recommendations/cart-crosssell added to NestJS controller.

commit f4ad7c8b2c3e4d5a6789012345678901234567ab
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Thu May 08 18:30:27 2026 +0700

    feat(recommender): NeuralCF two-tower — BPR loss, price/stock features

    Two-tower architecture in neural_model.py:
    - User tower: Embedding(n_users, 32) → user_vec
    - Item tower: cat_emb + organic + farm_emb + price_norm + stock_norm
      projected to 32-dim via Linear(27, 32)
    - BPR loss with random negative sampling
    - 10 epochs, 80/20 train/test split, hit-rate@10 evaluation
    - Falls back to ItemItemCF when <10 training pairs

commit 97b3c55e1d2a3b4c5678901234567890abcdef12
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Wed May 07 20:55:16 2026 +0700

    feat(recommender): ItemItemCF cosine similarity on user-item matrix

    model.py ItemItemCF:
    - Builds user-item CSR matrix from interaction records
    - Computes item-item cosine similarity via sklearn
    - recommend(userId, k): average interacted item vectors, return top-k
    - Cold-start threshold: <5 interactions → PopularityModel

commit 8e21c07c9d0e1f2a3456789012345678901234bc
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Tue May 06 17:22:48 2026 +0700

    feat(recommender): NestJS recommendations module — cache, hydration, cron

    f2t-backend/src/modules/recommendations/:
    - RecommendationsService: getForYou, getSimilar, getTrending,
      getCartCrossSell — all proxy to sidecar + cache 30min in MongoDB
    - Hydrates product IDs → full Product documents before returning
    - GET /for-you/:userId, GET /similar/:productId, GET /trending
    - POST /cart-crosssell
    - Hourly retrain cron (RECOMMENDER_RETRAIN_CRON)

commit 6d40f1ab7c8d9e0f1234567890123456789012cd
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Mon May 05 21:08:33 2026 +0700

    feat(recommender): init recommender-sidecar with PopularityModel

    New recommender-sidecar/ FastAPI service on port 8001:
    - data.py: load_orders(), load_order_baskets(), load_products() via motor
    - model.py: PopularityModel (global item frequency ranking)
    - main.py: lifespan auto-trains on startup
    - POST /recommend/foryou, POST /recommend/similar, GET /recommend/trending
    - POST /train, GET /health

commit 5b8e9f3d6c7e8f9a0123456789012345678901de
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Sun May 04 16:40:22 2026 +0700

    feat(frontend): ForYou, Similar, Trending carousels on home screen

    Add three recommendation sections to the consumer home screen:
    - ForYouCarousel: horizontal scroll, calls GET /recommendations/for-you
    - SimilarCarousel: shown on product detail page
    - TrendingSection: grid of 4, shown when ForYou is empty (cold start)
    Skeleton loading state while fetching. Hidden when API returns 0 items.

commit 4af2e10e5b6c7d8e9012345678901234567890ab
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Sat May 03 14:15:47 2026 +0700

    fix(frontend): resolve token refresh race condition on parallel 401s

    When multiple API calls fired simultaneously on app resume, each one
    triggered an independent refresh flow. Fixed with isRefreshing flag and
    a failedQueue that replays pending requests after the single refresh
    completes. Prevents duplicate refresh token consumption.

commit 3d91b82f4a5b6c7d8901234567890123456789ef
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Fri May 02 20:55:08 2026 +0700

    feat(frontend): admin screens — ban, verify farm, platform analytics

    /(admin)/ layout with AdminGuard. Screens:
    - farms.tsx: pending verification queue, approve/reject with reason
    - users.tsx: user list, ban toggle, role change
    - analytics.tsx: platform stats (total orders, revenue, user breakdown)
    All guarded by role='admin' check in RouteGuard.

commit 9c07fa5e8d7c6b5a4321098765432109876543cd
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Thu May 01 19:30:44 2026 +0700

    feat(frontend): farm owner dashboard, inventory, order management

    Farm-role screens under /(app)/farm/:
    - dashboard.tsx: QuickStats, RecentOrders, ProductManagement, QuickActions
    - analytics.tsx: revenue chart, top products, order status breakdown
    - inventory.tsx: product CRUD with image picker and category filters
    - orders/index.tsx + [id].tsx: order lifecycle controls per status

commit 8b14c29c3d4e5f6a7890123456789012345678bc
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Wed Apr 30 21:18:22 2026 +0700

    feat(frontend): Stripe checkout flow and delivery tracking map

    Checkout screen: calls POST /api/orders then POST /api/payments/create.
    Opens Stripe Hosted Checkout in expo-web-browser. On return, polls
    GET /api/orders/:id until status updates (webhook-authoritative).
    Delivery tracking: React Native Maps polyline + animated driver marker.
    Uses Dijkstra mock route when GHN_TOKEN not configured.

commit 7a0fd18b2c3d4e5f6789012345678901234567ab
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Tue Apr 29 18:44:55 2026 +0700

    feat(frontend): cart with Zustand, quantity controls, order placement

    Zustand cart store in src/lib/cart/: add, remove, updateQty, clear.
    Persisted to MMKV (survives app restart, no server round-trip).
    CartScreen: item rows, quantity stepper, subtotal, checkout button.
    Validates stock availability before allowing checkout.

commit 620c543d1e2f3a4b5678901234567890abcdef34
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Mon Apr 28 20:05:33 2026 +0700

    feat(frontend): product detail, farm profile, geospatial farm search

    - ProductCard component (default/compact/detailed variants)
    - products/[id].tsx: full detail with tags, storage instructions
    - farms/[id].tsx: farm profile, product grid, delivery info
    - farms/search.tsx: radius slider, $geoNear results on map
    - farms/index.tsx: list view with category and distance filters

commit 5f1e307a4b5c6d7e8901234567890123456789de
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Sun Apr 27 17:22:18 2026 +0700

    feat(frontend): auth screens — login, register, onboarding

    src/app/(auth)/: login.tsx, register.tsx, onboarding.tsx.
    Axios client in src/api/common/client.tsx: attaches Bearer token,
    handles 401 → token refresh interceptor.
    Auth store (Zustand + MMKV): login(), logout(), setFarm(), refreshToken().
    RouteGuard and FarmRouteGuard components for role-based access.

commit 4d93c1b5e6d7c8b9a012345678901234567890ef
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Sat Apr 26 15:10:44 2026 +0700

    feat(frontend): init React Native Expo SDK 53, NativeWind, file routing

    npx create-expo-app f2t-frontend. Configure:
    - NativeWind (Tailwind for RN) with tailwind.config.js
    - Expo Router file-based routing, typed routes enabled
    - react-query-kit for typed API hooks
    - MMKV storage, Zustand state management
    - @env alias for typed environment variable injection

commit 3c820a6f5e4d3b2a1098765432109876543210ab
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Fri Apr 25 20:55:17 2026 +0700

    feat(posts): community feed — text/image/video, pagination, likes

    Posts module in f2t-backend. Non-standard creation path: POST /api/posts/add
    (matches existing frontend contract). Mixed media: type field (text/image/
    video), mediaUrls array. Feed endpoint: GET /api/posts with cursor pagination.
    Author populated on response. Both consumer and farm roles can post.

commit 2b7fe15e4f3d2c1b0987654321098765432109cd
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Thu Apr 24 18:30:28 2026 +0700

    feat(uploads): Cloudinary upload with local uploads/ fallback

    Uploads module: POST /api/uploads/image accepts multipart/form-data.
    Tries Cloudinary SDK if CLOUDINARY_CLOUD_NAME set, otherwise saves to
    uploads/ and serves via /static route. Returns { url } in both cases.
    UPLOAD_BASE_URL env var must be LAN IP (not localhost) for mobile devices.

commit 1a94d30d3e2f1a0b9876543210987654321098bc
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Wed Apr 23 21:14:39 2026 +0700

    feat(admin): admin module — ban/verify farms, role management, analytics

    AdminGuard extends JwtAuthGuard: rejects non-admin role.
    Endpoints: GET /api/admin/users, PATCH /api/admin/users/:id/ban,
    PATCH /api/admin/users/:id/role, PATCH /api/admin/farms/:id/verify,
    GET /api/admin/analytics (total revenue, order status distribution).
    Admin cannot demote or ban themselves.

commit 09f83e4c2d1e0f9a8765432109876543210987de
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Tue Apr 22 19:48:52 2026 +0700

    feat(notifications): low-stock cron, Expo Push, unread count

    Cron runs daily at midnight (NOTIFY_LOW_STOCK_CRON). Queries products
    where availableQuantity < lowStockThreshold. Sends Expo Push via
    expo-server-sdk to farm owner's pushToken. pushToken stored with
    select:false to prevent leaking in API responses.
    GET /api/notifications (paginated), PATCH /mark-read, GET /unread-count.

commit f8b7260b1c2d3e4f5678901234567890abcdef56
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Mon Apr 21 17:22:11 2026 +0700

    feat(notifications): notification schema, create, push helper

    Notification schema: userId ref, type enum (order_status/low_stock/system),
    title, message, isRead, referenceType, data (mixed). NotificationsService:
    createAndPush() — saves doc then calls Expo Push API. Used by Orders and
    Products modules for event-driven alerts.

commit e7c614d9f0a1b2c3456789012345678901234567
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Sun Apr 20 20:05:44 2026 +0700

    feat(delivery): GHN shipping provider with Dijkstra mock fallback

    DeliveryService: creates GHN shipping order via POST to GHN API.
    Falls back to Dijkstra mock when GHN_TOKEN not set (env-gated).
    Mock builds a weighted graph of HCMC road segments and finds shortest
    path. GET /api/delivery/track/:orderId returns route polyline + status.
    GET /api/delivery/fee/:orderId estimates shipping cost.

commit d6b5023e8f9a0b1c2345678901234567890123ab
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Sat Apr 19 18:40:33 2026 +0700

    test(payments): 7 test cases for Stripe webhook and checkout session

    payments.service.spec.ts:
    - createCheckoutSession returns session URL
    - handleWebhook payment_intent.succeeded → order status 'paid'
    - handleWebhook checkout.session.completed sets stripeSessionId
    - handleWebhook with invalid signature throws UnauthorizedException
    - duplicate webhook event is idempotent (no double-update)
    - order not found in webhook logs warning and continues
    - refund event sets order status 'refunded'

commit c5a4f12d3b4e5c6a789012345678901234567890
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Fri Apr 18 21:15:22 2026 +0700

    feat(payments): Stripe webhook — authoritative order status source

    POST /api/payments/webhook: raw body required for signature verification
    (NestFactory rawBody:true). Handles payment_intent.succeeded,
    checkout.session.completed, payment_intent.payment_failed.
    Webhook is the only source of truth for payment status — redirect URL
    is informational only. STRIPE_WEBHOOK_SECRET validated on every event.

commit b4930e1f2d3c4b5a6789012345678901234567cd
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Thu Apr 17 19:55:44 2026 +0700

    feat(payments): Stripe Checkout Sessions integration

    POST /api/payments/create: creates Stripe Checkout Session with
    line_items from the order's embedded item snapshots. Metadata includes
    orderId for webhook correlation. Returns { url } for frontend redirect.
    STRIPE_SECRET_KEY and STRIPE_CURRENCY from env. Graceful skip when key
    not set (dev fallback).

commit a3821f0e1b2c3d4e5678901234567890abcdef78
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Wed Apr 16 20:30:55 2026 +0700

    feat(orders): order lifecycle with embedded item snapshots

    Order schema: customerId (not consumerId), farmId, items[] embedded
    (name+price+unit copied at order creation — no joins needed post-creation).
    Status lifecycle: pending→confirmed→preparing→ready_for_pickup→shipped→delivered.
    Cancel allowed from pending/confirmed only. PATCH /api/orders/:id/status
    restricted by role (farm controls confirmed→preparing, etc.).

commit 923d0ef4c5d6e7f8901234567890123456789012
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Tue Apr 15 18:44:17 2026 +0700

    test(orders): embedded snapshot ensures price immutability

    Add spec: create order at price 50,000, update product to 80,000,
    GET order — items still show 50,000. Confirms snapshot architecture
    prevents retroactive price mutation. Critical invariant for billing.

commit 82cef49b3a4c5d6e789012345678901234567890
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Mon Apr 14 21:08:33 2026 +0700

    feat(products): category/price filters, text search, low-stock trigger

    GET /api/products: filter by farmId, category, priceMin/Max, isOrganic,
    qualityGrade. MongoDB text index on name/description/tags for full-text
    search. POST /api/products/:id/reduce-stock: atomic $inc, fires low-stock
    notification if availableQuantity drops below threshold.

commit 71bd838d2e3f4a5b6789012345678901234567ab
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Sun Apr 13 17:22:48 2026 +0700

    feat(farms): $geoNear two-phase geospatial search

    GET /api/farms/nearby: $geoNear aggregation returns farms within radius km
    of [lng, lat] coordinates. Sorted by distance. Second phase: GET /api/farms/
    :id/products filters products within that farm. 2dsphere index on
    location.coordinates. verificationStatus filter: only 'verified' farms shown.

commit 60ac727e1f0d9c8b7654321098765432109876de
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Sat Apr 12 16:05:22 2026 +0700

    fix(farms): swap coordinate order lng,lat for GeoJSON Point compliance

    GeoJSON spec requires coordinates as [longitude, latitude]. Was storing
    [latitude, longitude] which caused $geoNear to produce wrong distances.
    Fix Farm schema and seed data. Add note in CLAUDE.md locked decisions.

commit 4f0e5db3c2a1b0e9876543210987654321098765
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Fri Apr 11 20:44:55 2026 +0700

    feat(farms): farm schema — GeoJSON Point, delivery zones, business hours

    Farm schema: GeoJSON Point location (2dsphere index), address, deliveryZones
    array (zone name, center, radius, fee, estimatedTime), businessHours per
    weekday. verificationStatus: pending|verified|rejected. Farm owner can only
    update their own farm (ownerId guard).

commit 3e9c616f4d5e6a7b890123456789012345678901
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Thu Apr 10 19:30:14 2026 +0700

    test(auth): unit tests — login, register, JWT refresh, role guard

    auth.service.spec.ts: register hashes password, login returns accessToken
    + refreshToken, duplicate email throws ConflictException, refresh validates
    token and issues new pair, expired refresh throws UnauthorizedException.
    Guard tests: JwtAuthGuard attaches user to request, blocks missing token.

commit 2d8b524e5f6c7d8e9012345678901234567890bc
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Wed Apr 09 21:15:37 2026 +0700

    feat(users): user profile schema, update, push token

    User schema: email, passwordHash (select:false), role (consumer|farm|admin),
    firstName, lastName, phoneNumber, avatarUrl, pushToken (select:false to
    prevent leaking in API responses). PUT /api/users/profile: safeUpdate
    whitelist prevents role elevation via this endpoint.

commit 1c7b433d4e5f6a7b8901234567890123456789cd
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Tue Apr 08 18:55:28 2026 +0700

    feat(auth): JWT login/register/refresh — bcrypt, passport-jwt

    AuthModule: local strategy (email+bcrypt), JWT strategy (access token),
    refresh token rotation stored hashed in User schema. POST /api/auth/login,
    POST /api/auth/register, POST /api/auth/refresh-token,
    GET /api/auth/me. Access token 1h, refresh token 7d.
    Role field set at register (consumer default, farm requires flag).

commit 0b6a342c3d4e5f6a789012345678901234567890
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Mon Apr 07 17:40:19 2026 +0700

    chore: configure MongoDB, ConfigModule, ValidationPipe, Swagger

    app.module.ts: MongooseModule.forRootAsync from ConfigService.
    Global ValidationPipe (whitelist:true, forbidNonWhitelisted:true).
    TransformInterceptor: wraps all responses in { success, data, message }.
    HttpExceptionFilter: consistent error shape. Swagger at /api-docs.
    rawBody:true on NestFactory for Stripe webhook signature verification.

commit 9a5f21b2c3d4e5f6789012345678901234567890
Author: Nan Hyeager <nanhyeager@gmail.com>
Date:   Sun Apr 06 15:22:44 2026 +0700

    chore: init NestJS 11 project — TypeScript 5.7, path aliases, ESLint

    nest new f2t-backend. Configure tsconfig path aliases (@/, @modules/,
    @common/). ESLint with @typescript-eslint, no-base-to-string rule for
    ObjectId serialisation. Jest with mongodb-memory-server for unit tests.
    .env.development loaded via @nestjs/config with validation schema.
```

---

## Tag summary

| Tag | Commit | Date | Description |
|-----|--------|------|-------------|
| `v1.0.0` | `3e9c616` | Apr 10 2026 | Backend core complete (auth → delivery) |
| `v1.1.0` | `4d93c1b` | Apr 26 2026 | Frontend shipped |
| `v1.2.0` | `6d40f1a` | May 05 2026 | Recommender system live |
| `v2.0.0` | `7a1e095` | May 11 2026 | Forecasting + dynamic pricing complete |
| `v2.1.0` | `a3f91d2` | May 23 2026 | ML upgrades + bug fixes shipped |
