import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, "/Users/macos/f2t/dynamic-pricing-final")

from fastapi.testclient import TestClient

_SV = {
    "productId": "abc123",
    "category": "leafy",
    "freshness": 0.82,
    "inventory_ratio": 0.35,
    "base_price": 50000,
    "competitor_ref_price": 47000,
    "days_to_restock": 2.0,
    "prev_delta": 0.0,
    "demand_7d": 0.0,
}

def test_health_reports_new_model():
    from main import app
    with TestClient(app) as client:
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["model"] == "dynamic-pricing-final (DDQN, obs_dim=12)"
        assert data["ddqn_loaded"] is True
        assert data["forecaster_loaded"] is True

def test_predict_returns_11_action_space():
    from main import app
    with TestClient(app) as client:
        resp = client.post("/predict", json={"state_vectors": [_SV]})
        assert resp.status_code == 200
        overrides = resp.json()["overrides"]
        assert len(overrides) == 1
        delta_pct = overrides[0]["delta_pct"]
        assert -30.5 <= delta_pct <= 21.0

def test_forecast_returns_demand_and_waste():
    from main import app
    with TestClient(app) as client:
        resp = client.post("/forecast", json={"state_vector": _SV})
        assert resp.status_code == 200
        data = resp.json()
        assert "demand7d" in data
        assert "pWaste" in data
        assert 0.0 <= data["pWaste"] <= 1.0
