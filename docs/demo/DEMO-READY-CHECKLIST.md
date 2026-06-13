# F2T Demo-Ready Checklist

Pre-recording checklist for the F2T thesis demo video. Complete every step in order before pressing Record. Each section ends with a pass/fail gate — do not proceed if a gate fails.

---

## 0. Prerequisites

### Environment variables (backend `.env.development`)

| Variable | Required | Notes |
|---|---|---|
| `MONGODB_URI` | YES | e.g. `mongodb://localhost:27017/f2t_dev` |
| `JWT_SECRET` | YES | any long random string |
| `JWT_REFRESH_SECRET` | YES | different random string |
| `UPLOAD_BASE_URL` | YES | LAN IP, not localhost — e.g. `http://192.168.x.x:3000` (so the physical device loads images) |
| `GHN_TOKEN` | **UNSET** | leave absent; triggers Dijkstra mock delivery fallback (what the demo uses) |
| `PRICING_SIDECAR_URL` | optional | defaults to `http://localhost:8000` — only set if the pricing sidecar runs on a different host/port |
| `RECOMMENDER_SIDECAR_URL` | optional | defaults to `http://localhost:8001` — only set if the recommender sidecar runs on a different host/port |
| `STRIPE_*` | optional | Stripe Checkout + WebView still works without live webhook in demo |

### Model artifacts (already present — do not re-train)

- Pricing checkpoints: `dynamic-pricing-final/checkpoints/`
  - `rl_shared_forecaster_best.pt` — DDQN weights with forecaster, obs_dim 12
  - `forecaster_v4_best.pt` — LSTM forecaster weights
  - `rl_shared_best.pt` — baseline DDQN (not used by sidecar, kept for reference)
- CoreML models: `freshnessmodels/` (fruit + root); the pricing sidecar reads them via `FRESHNESS_DIR`, which defaults to `../freshnessmodels`
- Recommender artifacts: `recommender-final/model/category_rules.json`, `category_popularity.json`

---

## 1. Start Order (7 terminals)

Open seven terminal tabs. Start them in this order; wait for each service to be listening before starting the next.

> **Note:** Terminal 1 (seed) is a one-shot command — it exits after completion, so its tab can be reused for the frontend (Terminal 7).

### Terminal 1 — Seed the database (one-time, before backend starts)

```bash
cd /Users/macos/f2t/f2t-backend
npm run seed
```

Wait for the process to exit with no `[ERROR]` output (exit code 0); `seed.ts` has no explicit success banner. This populates demo accounts, farms, products, and orders.

### Terminal 2 — Backend

```bash
cd /Users/macos/f2t/f2t-backend
npm run start:dev
```

Wait until you see `NestApplication successfully started` on port 3000.

### Terminal 3 — Pricing sidecar (port 8000)

```bash
cd /Users/macos/f2t/pricing-sidecar
python3 -m uvicorn main:app --port 8000
```

No venv is used — system `python3` has fastapi, torch, and coremltools installed. Wait until Uvicorn logs `Application startup complete`.

### Terminal 4 — Recommender sidecar (port 8001)

```bash
cd /Users/macos/f2t/recommender-sidecar
./venv/bin/python -m uvicorn main:app --port 8001
```

Uses the local venv at `recommender-sidecar/venv/`. Wait until `Application startup complete`.

### Terminal 5 — Vite ML Observatory dashboard (port 5173)

```bash
cd /Users/macos/f2t/ml-observatory
npm run dev
```

Wait until Vite prints `Local: http://localhost:5173`.

### Terminal 6 — Streamlit ML Observatory (port 8501)

```bash
cd /Users/macos/f2t/ml-observatory-streamlit
./venv/bin/streamlit run app.py
```

Uses the local venv at `ml-observatory-streamlit/venv/`. Wait until `You can now view your Streamlit app in your browser`.

### Terminal 7 — Frontend (Expo)

```bash
cd /Users/macos/f2t/f2t-frontend
pnpm start
```

Open on the physical device or simulator once the Metro bundler is ready.

---

## 2. Health Gate

Run all five checks. All must pass before recording.

### 2a. Pricing sidecar

```bash
curl -s http://localhost:8000/health | python3 -m json.tool
```

**Expected:**

```json
{
    "status": "ok",
    "model": "dynamic-pricing-final (DDQN, obs_dim=12)",
    "ddqn_loaded": true,
    "forecaster_loaded": true,
    "coreml_loaded": ["fruit", "root"]
}
```

PASS criteria: `status == "ok"`, `ddqn_loaded == true`, `coreml_loaded` contains at least `"fruit"` and `"root"`.

### 2b. Recommender sidecar

```bash
curl -s http://localhost:8001/health | python3 -m json.tool
```

**Expected:**

```json
{
    "status": "ok",
    "model_version": "<unix-timestamp — thay đổi theo máy>",
    "n_rules": 8
}
```

PASS criteria: `status == "ok"`, `n_rules > 0` (the exact `model_version` timestamp varies per machine and is not part of the PASS criteria).

### 2c. Backend API

Open in browser: `http://localhost:3000/api-docs`

PASS criteria: Swagger UI loads and lists all endpoints.

### 2d. ML Observatory (Vite)

Open in browser: `http://localhost:5173`

PASS criteria: dashboard renders without a blank/error page.

### 2e. ML Observatory (Streamlit)

Open in browser: `http://localhost:8501`

PASS criteria: Streamlit app renders without an exception traceback.

---

## 3. Demo Accounts

All accounts use the password: **`SeedPass123!`** (set by `npm run seed`).

| Role | Email | Password | Notes |
|---|---|---|---|
| Farm owner 1 | `farm1@f2t.vn` | `SeedPass123!` | Nguyễn Văn Thắng — Nông Trại Xanh |
| Farm owner 2 | `farm2@f2t.vn` | `SeedPass123!` | Trần Thị Mai — Vườn Hữu Cơ Phú Mỹ |
| Farm owner 3 | `farm3@f2t.vn` | `SeedPass123!` | Lê Quốc Việt — Trang Trại Đà Lạt |
| Consumer 1 | `consumer1@f2t.vn` | `SeedPass123!` | Phạm Thanh Hải |
| Consumer 2 | `consumer2@f2t.vn` | `SeedPass123!` | Hoàng Minh Tuấn |
| Admin | `admin@f2t.com` | `AdminF2T2026!` | Full admin panel access |
| Suspended (edge-case) | `suspended@f2t.vn` | `SeedPass123!` | Do not use as main demo account |

> If the seed was already run on a previous session, re-run `npm run seed` to reset accounts — it clears `_seeded: true` documents before re-inserting.

---

## 4. Smoke Pass

Run these checks end-to-end before the camera rolls. Each one maps to a demo scene.

### 4a. Dynamic pricing — /predict (curl)

```bash
curl -s -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"state_vectors":[{"productId":"demo1","category":"fruit","freshness":0.35,"inventory_ratio":0.9,"base_price":20000,"competitor_ref_price":19000,"demand_7d":10}]}'
```

**Example output — exact numbers depend on the DDQN action:**

```json
{"overrides":[{"productId":"demo1","targetPrice":15000.0,"delta_pct":-25.0,"safety_clipped":true,"freshness_tag":"critical"}]}
```

PASS criteria:
- `freshness_tag == "critical"` (freshness 0.35 < 0.4)
- `targetPrice <= 15000` (safety Rule 4 caps fruit at base×0.75 when freshness < 0.4)
- response is well-formed (`overrides` array with the 5 fields present)

(values may differ by a few % depending on the DDQN action; the assertions above are what matters)

### 4b. Cross-sell recommendations — /recommend (curl)

```bash
curl -s -X POST http://localhost:8001/recommend \
  -H "Content-Type: application/json" \
  -d '{"cart_categories":["leafy"],"top_k":3}'
```

**Expected response:**

```json
{"recommendations":[{"category":"herbs","score":1.3844,"source":"rule"},{"category":"root","score":1.3221,"source":"rule"},{"category":"eggs","score":1.1443,"source":"rule"}]}
```

PASS: 3 recommendations returned, all `source == "rule"`, scores > 1.0.

### 4c. App — farm product listing with dynamic price

1. Log in as `farm1@f2t.vn` / `SeedPass123!`.
2. Navigate to your farm's product list.
3. Confirm at least one product shows a freshness tag and an adjusted price (not identical to base price).

### 4d. App — consumer cart with cross-sell

1. Log in as `consumer1@f2t.vn` / `SeedPass123!`.
2. Add a leafy-category product to the cart.
3. Confirm a "You might also like" or equivalent cross-sell row appears showing herbs/root/eggs categories.

### 4e. App — freshness scan

1. As farm owner, navigate to the freshness scan feature.
2. Submit a scan (camera or manual input).
3. Confirm a freshness tag (`fresh` / `near_expiry` / `critical`) is returned and displayed.

### 4f. ML Observatory — live events

1. With both dashboards open (`http://localhost:5173` and `http://localhost:8501`), trigger a `/predict` call from the app or with the curl from 4a.
2. Confirm the event appears in the Vite dashboard's event log within ~2 seconds.
3. Confirm the Streamlit dashboard updates its metrics or chart.

### 4g. Admin analytics

1. Log in as `admin@f2t.com` / `AdminF2T2026!`.
2. Navigate to the admin analytics screen.
3. Confirm platform metrics (users, orders, revenue) load without error.

---

## 5. Honesty Reminders

Keep these limits on-screen or in mind during the demo to ensure all claims are accurate.

| Feature | What is real | What is NOT in the demo |
|---|---|---|
| Freshness ML (CoreML) | `fruit` and `root` models only | `leafy` and `herbs` models are not available — do not demo freshness scan on those categories |
| Cross-sell model | Category-level FP-Growth association rules (`n_rules=8`) | Item-level recommendations — cross-sell operates on product categories, not individual SKUs |
| Delivery | Dijkstra mock (graph-based fallback, always active) | GHN real-time courier integration — `GHN_TOKEN` is intentionally unset |
| Payment | Stripe Checkout + WebView end-to-end | Live Stripe webhook requires `stripe listen` locally; do not claim real money movement |
| Forecaster | Steady-state tile output (21× repeated), obs_dim=12 | Real-time demand forecasting from live data — the LSTM serves tile-21 inference, not a rolling window |
| DDQN pricing | Trained offline, inference at request time | Online learning / live retraining during the demo |

---

*Last updated: 2026-06-13. All commands verified against repo state on branch `feature/f2t-thesis-merge-main`.*
