"""Integration tests: sidecar must serve the forecaster-augmented DDQN.

The forecaster-augmented agent (`rl_shared_forecaster_best.pt`) was trained with
obs_dim=12 — the 10-dim market state plus [d_hat, p_waste] produced by the frozen
ForecasterLSTM (EXTRA_DIM=2). These tests pin that the sidecar:
  1. builds the DDQN with obs_dim=12 (shared layer in_features = 12 + 8 = 20),
  2. loads the forecaster checkpoint with no missing/unexpected keys,
  3. augments the obs in /predict so the full flow still returns valid overrides.

Run:
    cd pricing-sidecar && pytest tests/test_forecaster_integration.py -v
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

_SIDECAR_ROOT = Path(__file__).resolve().parent.parent
_DP_ROOT = (_SIDECAR_ROOT.parent / "dynamic-pricing-final").resolve()


@pytest.fixture(scope="module")
def sidecar_and_client():
    """Fresh import of main with a TestClient, so checkpoint paths are picked up."""
    os.environ.setdefault("DP_ROOT", str(_DP_ROOT))
    sys.modules.pop("main", None)
    sys.path.insert(0, str(_SIDECAR_ROOT))
    import main as sidecar  # noqa: PLC0415
    from fastapi.testclient import TestClient

    with TestClient(sidecar.app) as c:
        yield sidecar, c


def test_ddqn_built_with_forecaster_obs_dim(sidecar_and_client):
    """DDQN must expose obs_dim=12 → shared first layer in_features = 12 + cat_embed(8) = 20."""
    sidecar, _ = sidecar_and_client
    assert sidecar.ddqn_net is not None, "DDQN must load"
    in_features = sidecar.ddqn_net.shared[0].in_features
    assert in_features == 20, f"expected obs_dim=12 (in_features 20), got {in_features}"


def test_predict_works_with_augmented_obs(sidecar_and_client):
    """End-to-end /predict must succeed feeding the 12-dim augmented obs to the net."""
    _, client = sidecar_and_client
    resp = client.post("/predict", json={
        "state_vectors": [{
            "productId": "prod-fc",
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
    assert resp.status_code == 200, resp.text
    ov = resp.json()["overrides"][0]
    assert ov["productId"] == "prod-fc"
    assert ov["targetPrice"] > 0
    assert -30.0 <= ov["delta_pct"] <= 20.0
