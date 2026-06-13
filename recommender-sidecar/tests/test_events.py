import importlib
import json
from fastapi.testclient import TestClient


def _client(monkeypatch, tmp_path):
    (tmp_path / "category_rules.json").write_text(json.dumps({
        "leafy": [{"consequent": "herbs", "lift": 2.1, "confidence": 0.5, "support": 0.2}],
    }))
    (tmp_path / "category_popularity.json").write_text(json.dumps({"fruit": 0.4, "root": 0.5}))
    monkeypatch.setenv("RECOMMENDER_MODEL_DIR", str(tmp_path))
    import main
    importlib.reload(main)
    return main, TestClient(main.app)


def test_recommend_contract_unchanged(monkeypatch, tmp_path):
    _, c = _client(monkeypatch, tmp_path)
    r = c.post("/recommend", json={"cart_categories": ["leafy"], "top_k": 5})
    assert set(r.json().keys()) == {"recommendations"}
    assert set(r.json()["recommendations"][0].keys()) == {"category", "score", "source"}


def test_recommend_emits_event(monkeypatch, tmp_path):
    main, c = _client(monkeypatch, tmp_path)
    import events
    events._reset()
    c.post("/recommend", json={"cart_categories": ["leafy"], "top_k": 5})
    evts = [e for e in events.get_since(0) if e["kind"] == "recommend"]
    assert evts and evts[0]["recommendations"][0]["category"] == "herbs"
    assert evts[0]["source"] == "rule"


def test_events_poll_endpoint(monkeypatch, tmp_path):
    _, c = _client(monkeypatch, tmp_path)
    r = c.get("/_events?since=0")
    assert r.status_code == 200 and "events" in r.json()
