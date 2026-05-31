"""E2E tests for the pricing sidecar using real dynamic-pricing-final models.

Exercises the full flow:
  /health → /forecast → /predict → /freshness/classify

Run:
    cd pricing-sidecar
    pytest tests/test_sidecar_e2e.py -v
"""
from __future__ import annotations

import importlib
import importlib.util
import os
import sys
from pathlib import Path

import pytest
import torch

# ── Paths ────────────────────────────────────────────────────────────
_SIDECAR_ROOT = Path(__file__).resolve().parent.parent
_DP_ROOT = (_SIDECAR_ROOT.parent / "dynamic-pricing-final").resolve()


def _dp_import(rel: str, name: str):
    spec = importlib.util.spec_from_file_location(name, _DP_ROOT / rel)
    mod = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
    sys.modules[name] = mod
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    return mod


# ── Ensure checkpoints exist ──────────────────────────────────────────

@pytest.fixture(scope="session", autouse=True)
def ensure_checkpoints() -> None:
    """Create minimal valid checkpoints from dynamic-pricing-final if missing."""
    ckpt_dir = _DP_ROOT / "checkpoints"
    ddqn_path = ckpt_dir / "rl_shared_best.pt"
    fcast_path = ckpt_dir / "forecaster_v4_best.pt"

    if ddqn_path.exists() and fcast_path.exists():
        return

    _net = _dp_import("src/rl/network.py", "dp_network_ckpt")
    _fcast = _dp_import("src/forecaster/model.py", "dp_forecaster_ckpt")

    ckpt_dir.mkdir(exist_ok=True)

    ddqn = _net.SharedMLPDuelingQNet(obs_dim=10, n_cats=4, cat_embed_dim=8, hidden=128, n_actions=11)
    torch.save({"online": ddqn.state_dict()}, ddqn_path)

    cfg_dict = dict(obs_dim=10, window=21, n_categories=4, cat_embed_dim=8,
                    lstm_hidden=128, lstm_layers=2, lstm_dropout=0.2)
    fnet = _fcast.ForecasterLSTM(_fcast.ForecasterConfig(**cfg_dict))
    torch.save({"model_cfg": cfg_dict, "model_state": fnet.state_dict()}, fcast_path)


# ── Session-scoped TestClient ─────────────────────────────────────────

@pytest.fixture(scope="session")
def client(ensure_checkpoints):
    """FastAPI TestClient with real dynamic-pricing-final DDQN + Forecaster."""
    os.environ.setdefault("DP_ROOT", str(_DP_ROOT))

    # Fresh import so _DP_ROOT / checkpoint paths are picked up
    sys.modules.pop("main", None)
    sys.path.insert(0, str(_SIDECAR_ROOT))

    import main as sidecar  # noqa: PLC0415

    from fastapi.testclient import TestClient
    with TestClient(sidecar.app) as c:
        yield c


# ── Tests ─────────────────────────────────────────────────────────────

class TestHealth:
    def test_health_ok(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["ddqn_loaded"] is True, "DDQN must load from dynamic-pricing-final checkpoints"
        assert data["forecaster_loaded"] is True, "Forecaster must load from dynamic-pricing-final checkpoints"


class TestForecast:
    def test_forecast_returns_demand(self, client):
        resp = client.post("/forecast", json={
            "state_vector": {
                "productId": "prod-001",
                "category": "leafy",
                "freshness": 0.85,
                "inventory_ratio": 0.5,
                "base_price": 25000.0,
                "competitor_ref_price": 23000.0,
                "days_to_restock": 3.0,
                "prev_delta": 0.0,
                "demand_7d": 0.0,
            }
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["productId"] == "prod-001"
        assert isinstance(data["demand7d"], float)
        assert data["demand7d"] >= 0.0
        assert 0.0 <= data["pWaste"] <= 1.0

    def test_forecast_all_categories(self, client):
        for cat in ["leafy", "root", "fruit", "herbs"]:
            resp = client.post("/forecast", json={
                "state_vector": {
                    "productId": f"prod-{cat}",
                    "category": cat,
                    "freshness": 0.7,
                    "inventory_ratio": 1.0,
                    "base_price": 30000.0,
                    "competitor_ref_price": 29000.0,
                }
            })
            assert resp.status_code == 200, f"forecast failed for category={cat}"

    def test_forecast_unknown_category_rejected(self, client):
        resp = client.post("/forecast", json={
            "state_vector": {
                "productId": "x",
                "category": "unknown_cat",
                "freshness": 0.5,
                "inventory_ratio": 0.5,
                "base_price": 10000.0,
                "competitor_ref_price": 9000.0,
            }
        })
        assert resp.status_code == 422


class TestPredict:
    def test_predict_single_product(self, client):
        resp = client.post("/predict", json={
            "state_vectors": [{
                "productId": "prod-abc",
                "category": "fruit",
                "freshness": 0.9,
                "inventory_ratio": 0.4,
                "base_price": 40000.0,
                "competitor_ref_price": 38000.0,
                "days_to_restock": 5.0,
                "prev_delta": 0.0,
                "demand_7d": 15.0,
            }]
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "overrides" in data
        assert len(data["overrides"]) == 1

        ov = data["overrides"][0]
        assert ov["productId"] == "prod-abc"
        assert ov["targetPrice"] > 0
        assert -30.0 <= ov["delta_pct"] <= 20.0
        assert ov["freshness_tag"] in ("fresh", "aging", "critical")
        assert isinstance(ov["safety_clipped"], bool)

    def test_predict_batch_products(self, client):
        state_vectors = [
            {
                "productId": f"prod-{i}",
                "category": cat,
                "freshness": 0.6,
                "inventory_ratio": 0.8,
                "base_price": 20000.0,
                "competitor_ref_price": 19000.0,
            }
            for i, cat in enumerate(["leafy", "root", "fruit", "herbs"])
        ]
        resp = client.post("/predict", json={"state_vectors": state_vectors})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["overrides"]) == 4
        product_ids = {ov["productId"] for ov in data["overrides"]}
        assert product_ids == {"prod-0", "prod-1", "prod-2", "prod-3"}

    def test_predict_critical_freshness_forces_discount(self, client):
        resp = client.post("/predict", json={
            "state_vectors": [{
                "productId": "stale-prod",
                "category": "leafy",
                "freshness": 0.2,
                "inventory_ratio": 1.5,
                "base_price": 30000.0,
                "competitor_ref_price": 28000.0,
            }]
        })
        assert resp.status_code == 200
        ov = resp.json()["overrides"][0]
        assert ov["delta_pct"] < 0, "Critical freshness must result in a discount"
        assert ov["freshness_tag"] == "critical"

    def test_predict_skips_unknown_category(self, client):
        resp = client.post("/predict", json={
            "state_vectors": [
                {
                    "productId": "good",
                    "category": "fruit",
                    "freshness": 0.8,
                    "inventory_ratio": 0.5,
                    "base_price": 20000.0,
                    "competitor_ref_price": 19000.0,
                },
                {
                    "productId": "bad",
                    "category": "unknown",
                    "freshness": 0.8,
                    "inventory_ratio": 0.5,
                    "base_price": 20000.0,
                    "competitor_ref_price": 19000.0,
                },
            ]
        })
        assert resp.status_code == 200
        ids = {ov["productId"] for ov in resp.json()["overrides"]}
        assert "good" in ids
        assert "bad" not in ids


class TestFreshnessClassify:
    def test_classify_no_coreml_returns_fallback(self, client):
        import base64
        dummy_b64 = base64.b64encode(b"not-an-image").decode()
        resp = client.post("/freshness/classify", json={
            "image_b64": dummy_b64,
            "category": "fruit",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert 0.0 <= data["score"] <= 1.0
        assert data["tag"] in ("fresh", "aging", "critical")
        assert data["label"] in ("fresh", "rotten")
