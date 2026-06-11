# F2T — Farm to Table

A mobile marketplace connecting Vietnamese farms directly with consumers, with AI-assisted
dynamic pricing, demand forecasting, freshness scoring, and cross-sell recommendations.

This repository is a polyglot monorepo: a React Native app, a NestJS API, and two Python
ML sidecars, plus the offline pipelines that train the models the sidecars serve.

---

## Repository layout

| Path | What it is | Stack | Default port |
|---|---|---|---|
| `f2t-frontend/` | Mobile app (consumer, farm-owner, admin) | React Native + Expo SDK 53 | Metro |
| `f2t-backend/` | REST API + business logic | NestJS 11 + MongoDB 7 + Redis | `3000` |
| `pricing-sidecar/` | Dynamic pricing / forecast / freshness inference service | FastAPI + PyTorch + CoreML | `8000` |
| `recommender-sidecar/` | Category cross-sell inference service | FastAPI | `8001` |
| `dynamic-pricing-final/` | Offline training pipeline for the pricing models (DDQN + LSTM forecaster) | PyTorch | — |
| `recommender-final/` | Offline pipeline that mines cross-sell rules (Instacart warm-start) | Python | — |
| `freshnessmodels/` | CoreML freshness classifiers (`*.mlmodel`) loaded by the pricing sidecar | CoreML | — |
| `docs/` | Architecture notes, ML analysis, thesis sources & diagrams | — | — |

> The two `*-final/` folders and `freshnessmodels/` are **build inputs**, not runtime services:
> they produce the checkpoints/artifacts the sidecars load at startup.

---

## How the pieces connect

```
                       ┌─────────────────────────┐
   Mobile app  ───────▶│   f2t-backend (NestJS)   │
 (Expo / RN)   HTTPS   │   /api  •  Swagger        │
                       └───────────┬──────────────┘
                       MongoDB ◀───┤   Redis (cache) ◀───┐
                                   │                     │
              POST /predict /forecast /freshness/classify│
                                   ▼                     │
                       ┌─────────────────────────┐       │ forecast cache
                       │  pricing-sidecar :8000   │───────┘
                       │  DDQN + LSTM + CoreML    │
                       └─────────────────────────┘
                                   ▲
              POST /recommend      │
                       ┌───────────┴─────────────┐
                       │ recommender-sidecar :8001│
                       │  association rules       │
                       └─────────────────────────┘
```

The backend is the only client of the sidecars. It reaches them over HTTP at
`PRICING_SIDECAR_URL` and `RECOMMENDER_SIDECAR_URL`. **Both sidecars are optional** —
if either is down or unset, the backend logs a warning and degrades gracefully
(forecasts return zeros, recommendations fall back, pricing simply produces no override).

Pricing safety: the backend never blindly trusts the model. `PRICING_MODE=shadow`
(the default) records suggestions without applying them; `advisory` surfaces them as
`pending_review` for the farm owner to accept/reject. Accepted `PriceOverride`s are then
applied to product listings, the cart, and orders.

---

## Quick start

You need: **Node 20+**, **pnpm**, **Python 3.11**, **MongoDB 7**, and **Redis** (optional).
Each component runs independently; start only what you need.

### 0. Infrastructure (MongoDB / Redis)

```bash
# MongoDB — required. Either the backend's compose file (also runs the API):
cd f2t-backend && docker compose up --build      # API :3000 + MongoDB :27017
# …or just MongoDB on its own:
docker run -d -p 27017:27017 mongo:7.0

# Redis — optional (forecast cache); not in compose, run it yourself if needed:
docker run -d -p 6379:6379 redis:7
```

Stripe (payments) is optional — see `f2t-backend/README.md` for the `stripe listen` setup.

### 1. Backend (required)

```bash
cd f2t-backend
npm install
cp .env.development .env.development.local   # then fill in MONGODB_URI, JWT secrets…
npm run seed          # demo accounts, farms, products, posts
npm run start:dev     # http://localhost:3000/api  •  docs at /api-docs
```

### 2. Mobile app

```bash
cd f2t-frontend
pnpm install
# set API_URL in .env.development to your LAN IP, e.g. http://192.168.1.10:3000/api
pnpm start            # then press i / a, or scan the QR with Expo Go
```

### 3. Pricing sidecar (optional — enables AI pricing/forecast/freshness)

```bash
cd pricing-sidecar
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8000 --reload
```

### 4. Recommender sidecar (optional — enables cross-sell)

```bash
cd recommender-sidecar
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8001 --reload
```

Each component has its own README with full details.

---

## Seed accounts

After `npm run seed` (see `f2t-backend`):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@f2t.com` | `AdminF2T2026!` |
| Farm owner | `farm1@f2t.vn` … | `SeedPass123!` |
| Consumer | `consumer1@f2t.vn` … | `SeedPass123!` |
| Suspended (test) | `suspended@f2t.vn` | `SeedPass123!` |

---

## Documentation

- `CLAUDE.md` — architecture, conventions, and **locked decisions** (read this before changing API contracts).
- `docs/ml-pipeline-analysis.md` — how the ML pipeline fits together.
- `f2t-backend/README.md`, `f2t-frontend/README.md`, `pricing-sidecar/README.md`, `recommender-sidecar/README.md`.
