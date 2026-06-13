import pytest
import events


@pytest.fixture(autouse=True)
def fresh_buffer():
    events._reset()
    yield


def test_record_assigns_monotonic_seq():
    e1 = events.record("predict", {"productId": "a"})
    e2 = events.record("predict", {"productId": "b"})
    assert e1["seq"] == 1
    assert e2["seq"] == 2
    assert e2["ts"] >= e1["ts"]
    assert e2["kind"] == "predict"
    assert e2["productId"] == "b"


def test_get_since_returns_only_newer():
    events.record("predict", {"productId": "a"})
    events.record("predict", {"productId": "b"})
    newer = events.get_since(1)
    assert [e["productId"] for e in newer] == ["b"]
    assert events.latest_seq() == 2


def test_ring_buffer_caps_size():
    events._reset(maxlen=3)
    for i in range(5):
        events.record("predict", {"i": i})
    all_evts = events.get_since(0)
    assert len(all_evts) == 3
    assert [e["i"] for e in all_evts] == [2, 3, 4]


import pytest
import torch
from unittest.mock import patch
from fastapi.testclient import TestClient

# Mock torch.load so app init does not require real checkpoints (mirrors test_predict.py).
patch("torch.load", side_effect=FileNotFoundError("Mocked")).start()
import main  # noqa: E402


@pytest.fixture
def client():
    # torch.load is mocked → lifespan leaves ddqn_net=None and /predict would 503.
    # Inject a real random-weight net (obs_dim=12) AFTER lifespan so the full
    # predict path runs structurally. forecaster_net stays None → _run_forecaster
    # returns (0.0, 0.0), so obs is still augmented to DDQN_OBS_DIM.
    with TestClient(main.app) as c:
        main.ddqn_net = main.SharedMLPDuelingQNet(
            obs_dim=main.DDQN_OBS_DIM, n_cats=main.N_CATS,
            cat_embed_dim=8, hidden=128, n_actions=main.N_ACTIONS)
        main.ddqn_net.eval()
        yield c


def test_predict_response_contract_unchanged(client):
    # Recording an event must NOT add/remove fields on the /predict response.
    req = {"state_vectors": [{
        "productId": "p1", "category": "fruit", "freshness": 0.9,
        "inventory_ratio": 0.5, "base_price": 10000.0, "competitor_ref_price": 9500.0,
    }]}
    resp = client.post("/predict", json=req)
    assert resp.status_code == 200
    body = resp.json()
    assert set(body.keys()) == {"overrides"}
    assert set(body["overrides"][0].keys()) == {
        "productId", "targetPrice", "delta_pct", "safety_clipped", "freshness_tag"}


def test_predict_emits_event_with_internals(client):
    import events
    before = events.latest_seq()
    req = {"state_vectors": [{
        "productId": "p7", "category": "fruit", "freshness": 0.9,
        "inventory_ratio": 0.5, "base_price": 10000.0, "competitor_ref_price": 9500.0,
    }]}
    client.post("/predict", json=req)
    new = events.get_since(before)
    pred = [e for e in new if e["kind"] == "predict" and e["productId"] == "p7"]
    assert pred, "no predict event recorded"
    e = pred[0]
    assert isinstance(e["obs"], list) and len(e["obs"]) == main.DDQN_OBS_DIM
    assert 0 <= e["action_idx"] < len(main.CANDIDATES)
    assert "delta_pct" in e and "safety_clipped" in e


def test_events_poll_endpoint(client):
    r = client.get("/_events?since=0")
    assert r.status_code == 200
    data = r.json()
    assert "events" in data and "latest" in data
