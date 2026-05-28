# Feature Rules — Recommender Build

This file is feature-scoped. The project-wide `/Users/macos/f2t/CLAUDE.md` and `/Users/macos/f2t/CONTEXT.md` still apply. These rules only OVERRIDE or ADD when explicit.

## Hard build discipline (because we have 12 hours)

- **No alternative-design discussions.** When you hit a decision point, pick the simpler option and proceed.
- **No new dependencies beyond:** `fastapi, uvicorn, motor, numpy, scipy, pydantic` on the sidecar; nothing new on the backend (Mongoose, Nest already cover us); nothing new on the frontend (react-query-kit, Axios, NativeWind already cover us).
- **No refactoring of existing code.** If a file needs a 1-line addition (e.g. register module in `app.module.ts`), make that 1-line addition. Nothing more.
- **No tests beyond the bare minimum required for ship.** 4 backend unit tests (2 service, 2 controller). 0 frontend tests. No e2e.
- **No translation files updated.** Use English strings inline for the new UI; we can localise later.
- **No new "locked decisions".** Inherit everything from `f2t/CONTEXT.md`.

## Where things go (filesystem map)

```
f2t/
├── recommender-sidecar/                      ← create at project root, sibling to pricing-sidecar/
│   ├── main.py                               (FastAPI app — 4 endpoints)
│   ├── model.py                              (ItemItemCF + PopularityModel)
│   ├── data.py                               (Mongo loader, async via motor)
│   ├── requirements.txt
│   ├── README.md
│   └── tests/test_model.py                   (3 sanity tests)
│
├── f2t-backend/src/modules/recommendations/  ← new module
│   ├── recommendations.module.ts
│   ├── recommendations.controller.ts
│   ├── recommendations.service.ts
│   ├── recommendations.controller.spec.ts    (2 tests)
│   ├── recommendations.service.spec.ts       (2 tests)
│   ├── schemas/recommendation-cache.schema.ts
│   └── dto/recommendation-response.dto.ts
│
└── f2t-frontend/src/
    ├── api/recommendations/
    │   ├── types.tsx                         (RecommendationResponse, etc.)
    │   ├── use-get-for-you.tsx
    │   ├── use-get-similar.tsx
    │   ├── use-get-trending.tsx
    │   └── index.tsx
    └── components/recommendations/
        ├── for-you-section.tsx               (component for home screen)
        └── similar-products.tsx              (component for product detail)
```

The only files touched outside of those four directories:

1. `f2t-backend/src/app.module.ts` — add `RecommendationsModule` to `imports`.
2. `f2t-backend/.env.development` — add `RECOMMENDER_SIDECAR_URL=http://localhost:8001` and `RECOMMENDER_RETRAIN_CRON=0 * * * *`.
3. `f2t-frontend/src/app/(app)/home.tsx` — insert `<ForYouSection />` component between search and Featured products.
4. `f2t-frontend/src/app/products/[id].tsx` (or whichever the product detail file is — locate during Phase 0) — append `<SimilarProducts productId={id} />`.

## Decision defaults

| Choice point | Default — use unless blocking |
|---|---|
| Sidecar port | 8001 (pricing-sidecar uses 8000) |
| Cache TTL | 1 hour. Re-fetch from sidecar after that. |
| K (number of recommendations) | 6 |
| ItemItemCF similarity | Cosine on binary user-item matrix |
| Cold-start threshold | < 3 orders → use Trending |
| Trending lookback | Last 30 days |
| Trending scope | Global (no geo filter in v1 — geo is a stretch goal) |
| Sidecar timeout from NestJS | 1500 ms — fall back to popularity in NestJS service if sidecar is slow/down |
| Frontend stale time | 5 min (react-query) |
| Frontend cache time | 30 min |
| Loading state | Skeleton placeholders matching ProductCard shape |
| Empty state | Hide the whole section (don't show empty title) |
| Error state | Log and hide the section. Never crash the home screen. |

## Hard "no" list

- No streaming responses.
- No GraphQL anywhere.
- No new auth flows. Reuse `JwtAuthGuard`.
- No background workers in NestJS beyond the existing `@nestjs/schedule`.
- No new Mongo indexes beyond what `recommendation-cache.schema.ts` defines on its own document.
- No image/video work.
- No localisation. English strings inline.
- No farm-side recommender. Consumer side only.

## Code style reminders specific to this feature

- **Sidecar:** type-hint every public function. `pydantic` BaseModel for every request/response. Logging at INFO level for `/train` and `/recommend/for-user`.
- **NestJS:** controller method per endpoint, Swagger decorator on each, service injected. Throw `HttpException` only for 4xx user errors; let unhandled errors bubble to the global filter.
- **Frontend:** every component a named function export, max ~80 lines, NativeWind classes only, no inline styles. Hook names start with `use*`. Tap targets ≥ 44pt.
- **Logging:** in the NestJS service, log a single line per request: `recommend.for_you userId=… k=6 source=sidecar|fallback durationMs=…`. Same line shape for `similar-to` and `trending`.

## Stop-or-cut triggers

If at the end of hour N you have not hit phase-N's exit criterion in WORKFLOW.md, cut as follows in this order:

1. Drop Phase B (neural two-tower). Stay with ItemItemCF.
2. Drop the cron retrain. Retrain on sidecar boot only; recommend a manual restart.
3. Drop the similar-products carousel on the product detail screen. Ship only the home-screen "For You".
4. Drop the trending fallback's geo filter (already defaulted off — confirm).
5. Drop the "no order history" fallback altogether and show a static "Popular this week" section using `useGetProducts({ sort: '-createdAt' })`.

Do not cut: the sidecar itself, the home-screen integration, the auth on `/for-you`, the response envelope, or the lint/test gate before commit.
