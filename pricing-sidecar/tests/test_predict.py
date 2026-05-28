import pytest
import torch
from unittest.mock import patch
from fastapi.testclient import TestClient

# Mock torch.load globally for tests so the app initialization does not require real checkpoints.
patch("torch.load", side_effect=FileNotFoundError("Mocked file not found")).start()

from main import app
from safety import apply_safety

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_safety_cost_floor():
    # If base_price is 10000, and price is 5000 (below 55% floor of 5500),
    # Rule 3 max tick change actually bounds it to 70% (7000) first,
    # which is >= 55%. The end result is clipped.
    price, clipped = apply_safety(5000, 10000, 1.0)
    assert clipped is True
    assert price == 7000

def test_safety_price_ceiling():
    # If price is above 200%, it gets clipped.
    # Actually, Rule 3 will clip it at 120% (12000).
    price, clipped = apply_safety(25000, 10000, 1.0)
    assert clipped is True
    assert price == 12000

def test_safety_freshness_mandate():
    # freshness=0.3 forces price <= base*0.75
    price, clipped = apply_safety(10000, 10000, 0.3)
    assert clipped is True
    assert price == 7500

def test_safety_no_clip():
    # Valid price, within [-30%, +20%] and >= 1000
    price, clipped = apply_safety(11000, 10000, 1.0)
    assert clipped is False
    assert price == 11000

def test_safety_minimum_vnd():
    # Price of 500 gets clipped to 1000
    price, clipped = apply_safety(500, 500, 1.0)
    assert clipped is True
    assert price == 1000

def test_health_endpoint(client):
    # GET /health returns 200 with status=ok and the 4 stateless DQN agents loaded
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["dqn_loaded"] is True

def test_predict_smoke(client):
    # Stateless 5-dim DQN: each product priced from (freshness, inventory,
    # competitor_ratio, time). Schema no longer carries ctr_proxy /
    # add_to_cart_rate / hours_to_restock. Random weights (mocked torch.load) are
    # fine for a structural smoke test — the safety layer still bounds outputs.
    req_data = {
        "state_vectors": [
            {
                "productId": "p1",
                "category": "fruit",
                "freshness": 0.9,
                "inventory_ratio": 0.5,
                "base_price": 10000.0,
                "competitor_ref_price": 9500.0,
            },
            {
                "productId": "p2",
                "category": "leafy",
                "freshness": 0.8,
                "inventory_ratio": 0.4,
                "base_price": 5000.0,
                "competitor_ref_price": 5500.0,
            },
        ]
    }
    resp = client.post("/predict", json=req_data)
    assert resp.status_code == 200
    data = resp.json()
    assert "overrides" in data
    assert len(data["overrides"]) == 2
    for override in data["overrides"]:
        assert override["targetPrice"] > 0
        assert -30.0 <= override["delta_pct"] <= 20.0
