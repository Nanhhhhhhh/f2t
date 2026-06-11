# Recommender Sidecar

FastAPI inference service for F2T's **category-level cross-sell**. Given the categories in
a shopping cart, it returns the categories a shopper is most likely to add next.

The NestJS backend calls it over HTTP; it is **stateless and optional** — if it's
unreachable the backend's `recommendations` module logs a warning and falls back.

It is rule-based (no heavy ML at runtime): it serves association rules and category
popularity mined offline by the `../recommender-final/` pipeline.

---

## Setup & run

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8001 --reload
```

Health check:

```bash
curl http://localhost:8001/health
# { "status":"ok", "model_version":"<mtime>", "n_rules": 9 }
```

Run tests: `pytest tests/`

---

## Model artifacts

Loaded at startup from `../recommender-final/model/` (override with `RECOMMENDER_MODEL_DIR`):

| File | Contents |
|---|---|
| `category_rules.json` | Association rules (antecedent → consequents with `lift`) |
| `category_popularity.json` | Relative purchase frequency per category, 0–1 |

These artifacts are **not committed**; reproduce them by running the
`../recommender-final/` pipeline (Instacart 2017 warm-start). If they are missing or
invalid the service still starts and serves empty rules — every request then uses the
popularity fallback.

Categories: `leafy`, `root`, `fruit`, `herbs`, `mushrooms`, `grains`, `dairy`, `eggs`,
`honey`, `other`.

---

## Endpoint

### `POST /recommend`

```bash
curl -X POST http://localhost:8001/recommend -H "Content-Type: application/json" -d '{
  "cart_categories": ["leafy", "herbs"],
  "top_k": 5
}'
# → { "recommendations": [ { "category":"fruit", "score":2.13, "source":"rule" }, ... ] }
```

Scoring: for each distinct cart category, sum the `lift` of its rules whose consequent is
**not already in the cart**; return the top-`k` by score (`source: "rule"`). If no rules
match, fall back to the most popular not-in-cart categories (`source: "fallback"`).

---

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `RECOMMENDER_MODEL_DIR` | `../recommender-final/model` | Rule + popularity artifacts |

The backend points to this service via `RECOMMENDER_SIDECAR_URL` (default `http://localhost:8001`).
