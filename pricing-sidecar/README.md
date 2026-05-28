# Pricing Sidecar

FastAPI application for F2T dynamic pricing system.

## Prerequisites
- Python 3.11
- pip

## Setup
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Start
```bash
uvicorn main:app --port 8000 --reload
```
The `.pt` checkpoint files are read from `../dynamic_pricing_1_copy/checkpoints/` (relative to `pricing-sidecar/`).

## Run tests
```bash
pytest tests/
```

## Health check
```bash
curl http://localhost:8000/health
```

## Example Prediction
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "state_vectors": [
      {
        "productId": "123",
        "category": "leafy",
        "freshness": 0.9,
        "inventory_ratio": 0.5,
        "ctr_proxy": 0.1,
        "base_price": 10000,
        "hours_to_restock": 24,
        "competitor_ref_price": 9500,
        "add_to_cart_rate": 0.3
      }
    ]
  }'
```
