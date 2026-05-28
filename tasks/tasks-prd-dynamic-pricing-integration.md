# Tasks: Dynamic Pricing Integration

Reference PRD: `tasks/prd-dynamic-pricing-integration.md`

**Wrapper rule:** No existing file may be modified except:
- `f2t-backend/src/app.module.ts` — one import + `APP_INTERCEPTOR` provider
- `f2t-frontend/src/types.ts` — three optional fields added to `Product` type
- One product card component — `dynamicPrice ?? price` ternary + `<FreshnessBadge />` render

All other work is new files only.

---

## Task 1 — FastAPI Pricing Sidecar

**Commit when done:** `feat: add pricing sidecar FastAPI service`

- [ ] 1.1 Create `pricing-sidecar/` directory at repo root with:
  - `main.py` — FastAPI app with `POST /predict` and `GET /health`
  - `requirements.txt` — `fastapi`, `uvicorn`, `torch`, `numpy`, `pydantic`
  - `README.md` — startup instructions (`uvicorn main:app --port 8000`)
- [ ] 1.2 Implement model loader: load `phase3_best_qmix.pt` and `maddpg_phase2_final.pt` from `../dynamic_pricing_1_copy/checkpoints/` on startup; log model sizes.
- [ ] 1.3 Implement GRU hidden-state manager: per-category dict, reset when `GET /health?reset=true`.
- [ ] 1.4 Implement `POST /predict`: accepts state vector array → QMIX forward pass → MADDPG forward pass → safety layer → return overrides.
- [ ] 1.5 Port 5-rule safety layer from `dynamic_pricing_1_copy/env/` into `pricing-sidecar/safety.py`.
- [ ] 1.6 Write `pricing-sidecar/tests/test_predict.py` — unit tests for safety layer + smoke test for `/predict` with mock tensors.
- [ ] 1.7 Verify: `uvicorn main:app --port 8000` starts, `GET /health` returns `200`.

---

## Task 2 — NestJS `DynamicPricingModule` (schemas + service + cron)

**Commit when done:** `feat: add dynamic-pricing NestJS module`

- [ ] 2.1 Create `f2t-backend/src/modules/dynamic-pricing/` with:
  - `dynamic-pricing.module.ts`
  - `dynamic-pricing.service.ts`
  - `dynamic-pricing.controller.ts`
  - `pricing-tick.cron.ts`
  - `dto/submit-freshness.dto.ts`
  - `dto/review-suggestion.dto.ts`
  - `schemas/price-override.schema.ts`
  - `schemas/freshness-cache.schema.ts`
- [ ] 2.2 Define `PriceOverride` Mongoose schema (all fields per PRD including `farmId`, `mode`, `status`, `reviewedAt`, `reviewedBy`). Add TTL index on `expiresAt`.
- [ ] 2.3 Define `FreshnessCache` Mongoose schema. TTL index on `expiresAt` (6h). Readings array capped at 5 via `$push / $slice`.
- [ ] 2.4 Implement `DynamicPricingService` methods:
  - `submitFreshness(productId, score, category)` — upserts `FreshnessCache`, recomputes median, returns tag.
  - `getAcceptedOverridesForProducts(productIds[])` — batch fetch `status:'accepted'` and non-expired overrides.
  - `getSuggestionsForOwner(ownerId)` — returns `status:'pending_review'` overrides for farms owned by this user.
  - `reviewSuggestion(overrideId, ownerId, decision: 'accepted'|'rejected')` — verifies ownership, sets status + `reviewedAt` + `reviewedBy`.
  - `getShadowReport()` — aggregates KPIs + advisory acceptance stats.
  - `runPricingTick()` — full hourly cycle (described below).
- [ ] 2.5 Implement `runPricingTick()`:
  1. Query all active products (`_id`, `category`, `price`, `stockQuantity`, `farmId`).
  2. Left-join with `freshness_cache`; compute Weibull fallback score where cache is missing.
  3. Build state vectors → POST to `PRICING_SIDECAR_URL/predict`.
  4. Write results to `price_overrides` with `mode` and `status` matching `PRICING_MODE`.
  5. If `PRICING_MODE === 'advisory'`: group overrides by `farmId` → for each farm, call `NotificationsService.create(...)` with the push payload defined in the PRD. Inject `NotificationsService` as a dependency; do not modify it.
- [ ] 2.6 Implement `DynamicPricingController` with all 5 routes (per PRD table). JwtGuard on freshness/suggestions routes. AdminGuard on shadow-report. Farm ownership verified in service layer. Full Swagger decorators on every route.
- [ ] 2.7 Implement `PricingTickCron` using `@Cron`. Read `PRICING_CRON_SCHEDULE` env var (default `0 * * * *`).
- [ ] 2.8 Add env vars to `.env.development`: `PRICING_SIDECAR_URL`, `PRICING_MODE=shadow`, `PRICING_CRON_SCHEDULE`, `PRICING_SUGGESTION_TTL_HOURS=1`.
- [ ] 2.9 Import `DynamicPricingModule` into `AppModule` — first and only change to `app.module.ts` at this step.
- [ ] 2.10 Write `dynamic-pricing.service.spec.ts` — cover: freshness median, Weibull fallback, shadow write, advisory write + notification call, accept/reject ownership guard, expired override not returned by `getAcceptedOverridesForProducts`.
- [ ] 2.11 Run `npm run lint && npm test` — all pass.

---

## Task 3 — `DynamicPricingInterceptor` (the wrapper layer)

**Commit when done:** `feat: add DynamicPricingInterceptor to wrap product responses`

- [ ] 3.1 Create `f2t-backend/src/common/interceptors/dynamic-pricing.interceptor.ts`.
- [ ] 3.2 Implement interceptor:
  - Pass through unchanged if route does not match `/api/products`.
  - Pass through unchanged if `PRICING_MODE === 'shadow'`.
  - After `next.handle()`: extract product IDs from `response.data.items[]` or `response.data`.
  - Call `DynamicPricingService.getAcceptedOverridesForProducts(ids)`.
  - Merge `dynamicPrice`, `freshnessScore`, `priceTag` into matching products only.
- [ ] 3.3 Register as `APP_INTERCEPTOR` in `AppModule` (second and final change to `app.module.ts`).
- [ ] 3.4 Write `dynamic-pricing.interceptor.spec.ts`:
  - Shadow mode → response unchanged.
  - Advisory mode, no accepted override → response unchanged.
  - Advisory mode, accepted override → `dynamicPrice` injected.
  - Rejected override → response unchanged.
- [ ] 3.5 Run `npm run lint && npm test` — all pass including all existing `products.controller.spec.ts`.

---

## Task 4 — CoreML On-Device Freshness Wrapper (iOS)

**Commit when done:** `feat: add on-device freshness classifier iOS wrapper`

- [ ] 4.1 Copy both `.mlmodel` files from `dynamic_pricing_1_copy/freshnessmodels-1/` into `f2t-frontend/src/lib/freshness/models/`.
- [ ] 4.2 Evaluate `react-native-coreml` and `expo-ml-kit` for Expo SDK 53 compatibility; install the viable one via `npx expo install`. Document the choice with a one-line comment in `freshness-classifier.ts`.
- [ ] 4.3 Create `f2t-frontend/src/lib/freshness/freshness-classifier.ts`:
  - `classifyImage(imageUri: string, category: 'fruit' | 'root'): Promise<number>`
  - Returns `0.7` on Android or on any model error (logs a warning).
- [ ] 4.4 Write `freshness-classifier.test.ts` — mock native module; verify fallback returns `0.7` on error.

---

## Task 5 — New Freshness Scan Screen (frontend)

**Commit when done:** `feat: add farm freshness scan screen`

- [ ] 5.1 Create `f2t-frontend/src/api/dynamic-pricing/` with:
  - `types.tsx` — all request/response types for the 4 new endpoints
  - `use-submit-freshness.tsx` — mutation hook
  - `use-get-suggestions.tsx` — query hook (stale 30s)
  - `use-accept-suggestion.tsx` — mutation hook (invalidates `suggestions` query on success)
  - `use-reject-suggestion.tsx` — mutation hook (invalidates `suggestions` query on success)
- [ ] 5.2 Create `f2t-frontend/src/app/(app)/farm/freshness-scan.tsx`:
  - Camera view → on-device classify → show score + tag → confirm → `useSubmitFreshness`.
  - Loading/error states. Max ~80 lines.
- [ ] 5.3 Add "Scan Freshness" navigation entry in the farm dashboard (one link line — not a structural change).
- [ ] 5.4 Run `pnpm type-check` — passes.

---

## Task 6 — Farmer Price Suggestions Screen (frontend)

**Commit when done:** `feat: add farmer price suggestions review screen`

- [ ] 6.1 Create `f2t-frontend/src/app/(app)/farm/price-suggestions.tsx`:
  - Lists `pending_review` suggestions from `useGetSuggestions`.
  - Each row: product name | current price → suggested price | % delta pill | freshness tag | Accept / Reject buttons.
  - Accept/Reject call respective mutation hooks; item removed from list on success via query invalidation.
  - Empty state: "No suggestions right now."
  - Loading/error states. Max ~80 lines; extract a `SuggestionRow` sub-component if needed.
- [ ] 6.2 Handle push notification deep link: when notification `data.screen === '/(app)/farm/price-suggestions'`, navigate to this screen. Use the existing notification handler pattern in the app (check `src/app/(app)/` for how other deep links are wired).
- [ ] 6.3 Run `pnpm type-check` — passes.

---

## Task 7 — Frontend Product Display Wrapper

**Commit when done:** `feat: surface accepted dynamic price and freshness badge in product UI`

- [ ] 7.1 Add optional fields to `Product` type in `f2t-frontend/src/types.ts`:
  ```ts
  dynamicPrice?: number;
  freshnessScore?: number;
  priceTag?: 'flash_discount' | 'standard';
  ```
- [ ] 7.2 Create `f2t-frontend/src/components/ui/freshness-badge.tsx` — badge showing "Flash Discount" when `priceTag === 'flash_discount'`. Props: `priceTag`, `originalPrice`, `dynamicPrice`.
- [ ] 7.3 In the existing product card component (`grep -r "product\.price" src/components` to locate it): add `dynamicPrice ?? price` ternary for displayed price and render `<FreshnessBadge />` conditionally. This is the one permitted edit to an existing component.
- [ ] 7.4 Run `pnpm check-all` — passes.

---

## Task 8 — Shadow Mode Monitoring & Advisory Graduation

**Commit when done:** `feat: shadow mode dashboard and advisory-mode graduation docs`

- [ ] 8.1 Verify shadow KPI counters populate: trigger one manual pricing tick and inspect `price_overrides` in MongoDB — all docs should have `status:'shadow'`.
- [ ] 8.2 Confirm `GET /api/dynamic-pricing/shadow-report` returns correct aggregated values with `advisoryStats` showing nulls.
- [ ] 8.3 Document graduation checklist in `dynamic_pricing_1_copy/INTEGRATION.md`:
  - Daily KPI check procedure
  - After 7 consecutive passing days: `PRICING_MODE=advisory` → restart backend → verify push notifications fire on next tick → verify suggestions appear in farm owner's screen
  - Acceptance rate target: ≥ 50% within first 2 weeks (signals farmer trust)
- [ ] 8.4 Full regression run: `npm run lint && npm test` (backend) + `pnpm check-all` (frontend) — all pass.
- [ ] 8.5 Update `CONTEXT.md` with: new `dynamic-pricing` module, all new env vars, sidecar startup command, and the two-step graduation path (shadow → advisory).
