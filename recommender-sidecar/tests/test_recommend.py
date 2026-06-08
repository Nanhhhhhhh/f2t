import importlib
from fastapi.testclient import TestClient

def _client(monkeypatch, tmp_path):
    import json
    (tmp_path / "category_rules.json").write_text(json.dumps({
        "leafy": [{"consequent": "herbs", "lift": 2.1, "confidence": 0.5, "support": 0.2}],
        "fruit": [{"consequent": "honey", "lift": 1.8, "confidence": 0.3, "support": 0.1}],
    }))
    (tmp_path / "category_popularity.json").write_text(json.dumps({"leafy": 0.6, "fruit": 0.4, "root": 0.5}))
    monkeypatch.setenv("RECOMMENDER_MODEL_DIR", str(tmp_path))
    import main
    importlib.reload(main)
    return TestClient(main.app)

def test_health(monkeypatch, tmp_path):
    c = _client(monkeypatch, tmp_path)
    r = c.get("/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"
    assert r.json()["n_rules"] == 2

def test_recommend_rule_hit(monkeypatch, tmp_path):
    c = _client(monkeypatch, tmp_path)
    r = c.post("/recommend", json={"cart_categories": ["leafy"], "top_k": 5})
    recs = r.json()["recommendations"]
    assert recs[0]["category"] == "herbs" and recs[0]["source"] == "rule"

def test_recommend_excludes_cart_categories(monkeypatch, tmp_path):
    c = _client(monkeypatch, tmp_path)
    r = c.post("/recommend", json={"cart_categories": ["leafy", "herbs"], "top_k": 5})
    cats = [x["category"] for x in r.json()["recommendations"]]
    assert "herbs" not in cats and "leafy" not in cats

def test_recommend_fallback_popularity(monkeypatch, tmp_path):
    c = _client(monkeypatch, tmp_path)
    r = c.post("/recommend", json={"cart_categories": ["mushrooms"], "top_k": 2})
    recs = r.json()["recommendations"]
    assert len(recs) > 0 and recs[0]["source"] == "fallback"

def test_malformed_json_does_not_crash(monkeypatch, tmp_path):
    (tmp_path / "category_rules.json").write_text("{ this is not valid json")
    (tmp_path / "category_popularity.json").write_text("{}")
    monkeypatch.setenv("RECOMMENDER_MODEL_DIR", str(tmp_path))
    import importlib, main
    importlib.reload(main)
    from fastapi.testclient import TestClient
    c = TestClient(main.app)
    assert c.get("/health").json()["n_rules"] == 0

def test_duplicate_cart_categories_not_double_counted(monkeypatch, tmp_path):
    c = _client(monkeypatch, tmp_path)
    r = c.post("/recommend", json={"cart_categories": ["leafy", "leafy"], "top_k": 5})
    herbs = next(x for x in r.json()["recommendations"] if x["category"] == "herbs")
    assert herbs["score"] == 2.1  # not 4.2
