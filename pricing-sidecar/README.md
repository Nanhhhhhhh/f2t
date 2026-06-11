# Pricing Sidecar

FastAPI inference service for F2T's AI pricing. The NestJS backend calls it over HTTP;
it is **stateless and optional** (the backend degrades gracefully when it is unreachable).

It serves three model families:

- **Dynamic pricing** — a Dueling DDQN (`SharedMLPDuelingQNet`) picks a price delta per product.
- **Demand forecasting** — an LSTM forecaster (`ForecasterLSTM`) predicts 7-day demand and waste probability.
- **Freshness classification** — CoreML image classifiers score product photos.

Model code is imported from `../dynamic-pricing-final/src/`; weights and artifacts are
loaded at startup (see [Model artifacts](#model-artifacts)).

---

## Prerequisites

- Python 3.11
- The sibling folders `../dynamic-pricing-final/` (model code + checkpoints) and
  `../freshnessmodels/` (CoreML models)
- CoreML support (`coremltools`) — freshness only runs where it can load; on unsupported
  platforms the service still starts and `/freshness/classify` returns a neutral fallback.

## Setup & run

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8000 --reload
```

Health check:

```bash
curl http://localhost:8000/health
# { "status":"ok", "model":"dynamic-pricing-final (DDQN, obs_dim=10)",
#   "ddqn_loaded":true, "forecaster_loaded":true, "coreml_loaded":["fruit","root"] }
```

Run tests: `pytest tests/`

---

## Model artifacts

Loaded once at startup (FastAPI lifespan):

| Artifact | Default path | Override |
|---|---|---|
| DDQN checkpoint | `../dynamic-pricing-final/checkpoints/rl_shared_best.pt` | `DP_ROOT` |
| Forecaster checkpoint | `../dynamic-pricing-final/checkpoints/forecaster_v4_best.pt` | `DP_ROOT` |
| CoreML freshness models | `../freshnessmodels/MyFreshnessClassifier-{fruit,root}.mlmodel` | `FRESHNESS_DIR` |

If a checkpoint fails to load, the error is logged and the corresponding endpoint returns
`503` (pricing) or a neutral fallback (forecast/freshness) instead of crashing.

Supported categories: `leafy`, `root`, `fruit`, `herbs`. Observation dim is 10; the DDQN
chooses among 11 price-delta candidates.

---

## Endpoints

### `GET /health`
Liveness + which models loaded.

### `POST /predict` → price overrides
Batch: one state vector per product, returns one override each (unknown categories skipped).

```bash
curl -X POST http://localhost:8000/predict -H "Content-Type: application/json" -d '{
  "state_vectors": [{
    "productId": "123", "category": "leafy",
    "freshness": 0.9, "inventory_ratio": 0.5, "base_price": 10000,
    "competitor_ref_price": 9500, "days_to_restock": 3,
    "prev_delta": 0.0, "demand_7d": 7.0
  }]
}'
# → { "overrides": [{ "productId","targetPrice","delta_pct","safety_clipped","freshness_tag" }] }
```

### `POST /forecast` → demand & waste
```bash
curl -X POST http://localhost:8000/forecast -H "Content-Type: application/json" -d '{
  "state_vector": { "productId":"123","category":"leafy","freshness":0.9,
    "inventory_ratio":0.5,"base_price":10000,"competitor_ref_price":9500 }
}'
# → { "productId":"123", "demand7d": 6.2, "pWaste": 0.18 }
```

### `POST /freshness/classify` → freshness score from a photo
Body: `{ "image_b64": "<base64 RGB image>", "category": "fruit" | "root" | ... }`
(`fruit*` → fruit model, everything else → root model). Returns `score`, `tag`
(`fresh` ≥ 0.8, `aging` ≥ 0.4, else `critical`), `label`, `confidence`. Falls back to a
neutral score if CoreML isn't available.

---

## Safety guardrails (`safety.py`)

`apply_safety(price, base_price, freshness)` clips every model price before it leaves the
service, and reports whether clipping occurred (`safety_clipped`):

1. **Cost floor** — `price ≥ base_price × 0.55`
2. **Price ceiling** — `price ≤ base_price × 2.0`
3. **Max tick change** — within `[-30%, +20%]` of `base_price`
4. **Freshness mandate** — if `freshness < 0.4`, force `price ≤ base_price × 0.75`
5. **Minimum viable price** — `price ≥ 1000`

---

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `DP_ROOT` | `../dynamic-pricing-final` | Model code + checkpoints |
| `FRESHNESS_DIR` | `../freshnessmodels` | CoreML `.mlmodel` files |

The backend points to this service via `PRICING_SIDECAR_URL` (default `http://localhost:8000`).
