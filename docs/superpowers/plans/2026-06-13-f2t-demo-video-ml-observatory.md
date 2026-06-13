# F2T Demo Video + Live ML Observatory — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a live observability layer over the two AI/ML sidecars + two dashboards (web + Streamlit) to observe them working live, plus the script/checklist/recording guide for a thesis-defense demo video.

**Architecture:** Add a tiny, thread-safe in-memory event ring-buffer to each sidecar that records the *real* internal computation (obs vector, DQN action, FP-Growth rules fired) without changing any existing response contract, and expose it via `GET /_events` (polling) + `GET /_events/stream` (SSE) with dev CORS. Two dashboards consume those endpoints for a live tail of real app traffic plus manual probing. The video is split into a short product tour and a longer live-observatory segment.

**Tech Stack:** FastAPI (sidecars, Python), Vite + vanilla TS (web dashboard), Streamlit (Python dashboard), Markdown (docs).

**Spec:** `docs/superpowers/specs/2026-06-13-f2t-demo-video-ml-observatory-design.md`

**Honesty constraint (carry into every task):** show only real model output, at true capability, and state limits (freshness 2/4 fruit+root; cross-sell category-level; Dijkstra fallback; Stripe backend+WebView; forecaster tile-21×, obs_dim 12). Never fabricate ML data.

---

## File Structure

**Pricing sidecar (`pricing-sidecar/`)**
- Create `events.py` — thread-safe ring buffer + `record/get_since/latest_seq`.
- Modify `main.py` — import `events`, call `events.record(...)` inside `predict`/`forecast`/`classify_freshness`, add `/_events` + `/_events/stream`, add CORS.
- Create `tests/test_events.py` — buffer unit tests + contract-preservation + event-capture tests.

**Recommender sidecar (`recommender-sidecar/`)**
- Create `events.py` — identical small module (intentionally duplicated: each sidecar is a separate deployable with its own venv & cwd; a shared package would need packaging both don't have).
- Modify `main.py` — call `events.record(...)` inside `recommend`, add `/_events` + `/_events/stream`, add CORS.
- Create `tests/test_events.py`.

**Web dashboard (`ml-observatory/`)** — Vite vanilla TS, single page.
- `package.json`, `index.html`, `src/main.js`, `src/api.js`, `src/style.css`.

**Streamlit dashboard (`ml-observatory-streamlit/`)**
- `app.py`, `requirements.txt`.

**Docs (`docs/demo/`)**
- `DEMO-READY-CHECKLIST.md`, `VIDEO-SCRIPT.md`, `RECORDING-GUIDE.md`.

---

## Task 1: Pricing sidecar — event ring-buffer module

**Files:**
- Create: `pricing-sidecar/events.py`
- Test: `pricing-sidecar/tests/test_events.py`

- [ ] **Step 1: Write the failing test**

```python
# pricing-sidecar/tests/test_events.py
import events


def test_record_assigns_monotonic_seq():
    events._reset()  # test helper
    e1 = events.record("predict", {"productId": "a"})
    e2 = events.record("predict", {"productId": "b"})
    assert e1["seq"] == 1
    assert e2["seq"] == 2
    assert e2["ts"] >= e1["ts"]
    assert e2["kind"] == "predict"
    assert e2["productId"] == "b"


def test_get_since_returns_only_newer():
    events._reset()
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd pricing-sidecar && python -m pytest tests/test_events.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'events'`

- [ ] **Step 3: Write minimal implementation**

```python
# pricing-sidecar/events.py
"""In-memory event ring-buffer for live observability.

Thread-safe: FastAPI runs sync endpoints in a threadpool, so record() may be
called from worker threads while the SSE generator reads from the event loop.
We rely on a Lock + deque (deque.append is atomic in CPython). Read-only feed —
this never alters any endpoint's response contract.
"""
import time
from collections import deque
from threading import Lock

_MAX = 200
_events: "deque[dict]" = deque(maxlen=_MAX)
_seq = 0
_lock = Lock()


def record(kind: str, payload: dict) -> dict:
    global _seq
    with _lock:
        _seq += 1
        evt = {"seq": _seq, "ts": time.time(), "kind": kind, **payload}
        _events.append(evt)
        return evt


def get_since(since: int) -> list[dict]:
    with _lock:
        return [e for e in _events if e["seq"] > since]


def latest_seq() -> int:
    with _lock:
        return _seq


def _reset(maxlen: int = _MAX) -> None:
    """Test helper: clear buffer and reset the sequence counter."""
    global _events, _seq
    with _lock:
        _events = deque(maxlen=maxlen)
        _seq = 0
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd pricing-sidecar && python -m pytest tests/test_events.py -v`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add pricing-sidecar/events.py pricing-sidecar/tests/test_events.py
git commit -m "feat(pricing-sidecar): add in-memory event ring-buffer for observability"
```

---

## Task 2: Pricing sidecar — record real computation + expose `/_events` + CORS

**Files:**
- Modify: `pricing-sidecar/main.py` (imports near line 14; `predict` ~296-336; `forecast` ~280-292; `classify_freshness` ~340-356; add endpoints + CORS after `app = FastAPI(...)` ~212)
- Test: `pricing-sidecar/tests/test_events.py` (append)

- [ ] **Step 1: Write the failing test (append to test_events.py)**

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd pricing-sidecar && python -m pytest tests/test_events.py -v`
Expected: FAIL — `test_events_poll_endpoint` 404; `test_predict_emits_event_with_internals` finds no event.

- [ ] **Step 3a: Add imports + CORS + endpoints in `main.py`**

Add to the import block (after `from pydantic import BaseModel`, line ~15):

```python
import asyncio
import json as _json
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

import events
```

Immediately after `app = FastAPI(lifespan=lifespan)` (line ~212), add:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("OBS_CORS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/_events")
def events_poll(since: int = 0):
    return {"events": events.get_since(since), "latest": events.latest_seq()}


@app.get("/_events/stream")
async def events_stream(since: int = 0):
    async def gen():
        last = since
        while True:
            for e in events.get_since(last):
                last = e["seq"]
                yield f"data: {_json.dumps(e)}\n\n"
            await asyncio.sleep(0.5)
    return StreamingResponse(gen(), media_type="text/event-stream")
```

- [ ] **Step 3b: Record real internals inside `predict`**

In `predict`, inside the loop right before `results.append(...)` (line ~329), add:

```python
        events.record("predict", {
            "productId": sv.productId,
            "category": sv.category,
            "obs": [round(float(x), 4) for x in obs.tolist()],
            "action_idx": action_idx,
            "n_actions": len(CANDIDATES),
            "candidate_delta": round(float(CANDIDATES[action_idx]), 4),
            "targetPrice": final_price,
            "delta_pct": delta_pct,
            "safety_clipped": was_clipped,
            "freshness_tag": tag,
            "base_price": sv.base_price,
        })
```

- [ ] **Step 3c: Record in `forecast` and `classify_freshness`**

In `forecast`, before `return ForecastResponse(...)` (line ~292):

```python
    events.record("forecast", {"productId": sv.productId, "demand7d": max(0.0, d_hat), "pWaste": p_waste})
```

In `classify_freshness`, before the final `return ClassifyResponse(...)` (line ~356):

```python
    events.record("freshness", {"category": req.category, "score": score, "tag": tag, "label": label, "confidence": confidence})
```

(Leave the early `model is None` fallback return at line ~344 unrecorded — it is not a model inference.)

- [ ] **Step 4: Run tests**

Run: `cd pricing-sidecar && python -m pytest tests/test_events.py -v`
Expected: PASS for all new tests.

Note: `tests/test_predict.py::test_health_endpoint` and `::test_predict_smoke` fail **pre-existing** (stale assertions: expect `dqn_loaded` key and a non-None net under mocked `torch.load`). They are unrelated to this work — do NOT fix them here.

- [ ] **Step 5: Commit**

```bash
git add pricing-sidecar/main.py pricing-sidecar/tests/test_events.py
git commit -m "feat(pricing-sidecar): record DQN internals + expose /_events (SSE+poll) + CORS"
```

---

## Task 3: Recommender sidecar — event buffer + record rules fired + `/_events` + CORS

**Files:**
- Create: `recommender-sidecar/events.py` (identical to Task 1's module)
- Modify: `recommender-sidecar/main.py` (imports ~1-7; after `app = FastAPI(...)` ~37; inside `recommend` ~62-84)
- Test: `recommender-sidecar/tests/test_events.py`

- [ ] **Step 1: Write the failing test**

```python
# recommender-sidecar/tests/test_events.py
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd recommender-sidecar && python -m pytest tests/test_events.py -v`
Expected: FAIL — `No module named 'events'` / 404 on `/_events`.

- [ ] **Step 3a: Create `recommender-sidecar/events.py`**

Identical content to Task 1 Step 3 (`pricing-sidecar/events.py`). Copy it verbatim.

- [ ] **Step 3b: Wire into `recommender-sidecar/main.py`**

Add to imports (after `from pydantic import BaseModel`, line ~7):

```python
import asyncio
import json as _json
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

import events
```

After `app = FastAPI(title="F2T Recommender Sidecar")` and `_load()` (line ~38), add:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("OBS_CORS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/_events")
def events_poll(since: int = 0):
    return {"events": events.get_since(since), "latest": events.latest_seq()}


@app.get("/_events/stream")
async def events_stream(since: int = 0):
    async def gen():
        last = since
        while True:
            for e in events.get_since(last):
                last = e["seq"]
                yield f"data: {_json.dumps(e)}\n\n"
            await asyncio.sleep(0.5)
    return StreamingResponse(gen(), media_type="text/event-stream")
```

In `recommend`, build a `recs` list as today, then **before each `return RecommendResponse(...)`** record the event. Replace the two return paths so both record. The rule-hit path (line ~75-76) becomes:

```python
    if scores:
        ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)[: req.top_k]
        recs = [Recommendation(category=c, score=round(s, 4), source="rule") for c, s in ranked]
        events.record("recommend", {
            "cart_categories": req.cart_categories,
            "top_k": req.top_k,
            "recommendations": [r.model_dump() for r in recs],
            "source": "rule",
        })
        return RecommendResponse(recommendations=recs)
```

The fallback path (line ~83-84) becomes:

```python
    recs = [Recommendation(category=c, score=round(s, 4), source="fallback") for c, s in pop]
    events.record("recommend", {
        "cart_categories": req.cart_categories,
        "top_k": req.top_k,
        "recommendations": [r.model_dump() for r in recs],
        "source": "fallback",
    })
    return RecommendResponse(recommendations=recs)
```

- [ ] **Step 4: Run tests**

Run: `cd recommender-sidecar && python -m pytest tests/ -v`
Expected: PASS — new event tests + existing `test_recommend.py` all green.

- [ ] **Step 5: Commit**

```bash
git add recommender-sidecar/events.py recommender-sidecar/main.py recommender-sidecar/tests/test_events.py
git commit -m "feat(recommender-sidecar): record FP-Growth rules fired + expose /_events (SSE+poll) + CORS"
```

---

## Task 4: Web dashboard — scaffold + API client + health badges

**Files:**
- Create: `ml-observatory/package.json`, `ml-observatory/index.html`, `ml-observatory/src/api.js`, `ml-observatory/src/style.css`, `ml-observatory/src/main.js`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "ml-observatory",
  "private": true,
  "type": "module",
  "scripts": { "dev": "vite", "build": "vite build", "preview": "vite preview" },
  "devDependencies": { "vite": "^5.4.0" }
}
```

- [ ] **Step 2: Create `index.html`**

```html
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>F2T — Live ML Observatory</title>
    <link rel="stylesheet" href="/src/style.css" />
  </head>
  <body>
    <header>
      <h1>F2T — Live ML Observatory</h1>
      <div id="health"></div>
    </header>
    <main>
      <section class="col">
        <h2>Pricing DDQN <span class="muted">:8000</span></h2>
        <form id="predict-form" class="probe">
          <label>category
            <select name="category"><option>fruit</option><option>root</option><option>leafy</option><option>herbs</option></select></label>
          <label>freshness <input name="freshness" type="number" step="0.05" value="0.9" min="0" max="1"></label>
          <label>inventory_ratio <input name="inventory_ratio" type="number" step="0.1" value="0.5"></label>
          <label>base_price <input name="base_price" type="number" value="10000"></label>
          <label>competitor_ref_price <input name="competitor_ref_price" type="number" value="9500"></label>
          <button type="submit">Probe /predict</button>
        </form>
        <div id="pricing-feed" class="feed"></div>
      </section>
      <section class="col">
        <h2>Recommender FP-Growth <span class="muted">:8001</span></h2>
        <form id="recommend-form" class="probe">
          <label>cart_categories (phẩy)
            <input name="cart_categories" value="leafy,fruit"></label>
          <label>top_k <input name="top_k" type="number" value="5"></label>
          <button type="submit">Probe /recommend</button>
        </form>
        <div id="recommender-feed" class="feed"></div>
      </section>
    </main>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 3: Create `src/api.js`**

```javascript
export const PRICING = import.meta.env.VITE_PRICING_URL || "http://localhost:8000";
export const RECO = import.meta.env.VITE_RECO_URL || "http://localhost:8001";

export async function health(base) {
  try {
    const r = await fetch(`${base}/health`);
    return await r.json();
  } catch {
    return { status: "down" };
  }
}

export async function predict(body) {
  const r = await fetch(`${PRICING}/predict`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  return r.json();
}

export async function recommend(body) {
  const r = await fetch(`${RECO}/recommend`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  return r.json();
}

export function streamEvents(base, onEvent) {
  const es = new EventSource(`${base}/_events/stream`);
  es.onmessage = (m) => onEvent(JSON.parse(m.data));
  return es;
}
```

- [ ] **Step 4: Create `src/style.css`**

```css
:root { color-scheme: dark; font-family: system-ui, sans-serif; }
body { margin: 0; background: #0f1115; color: #e6e6e6; }
header { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; border-bottom: 1px solid #2a2e37; }
h1 { font-size: 18px; margin: 0; }
main { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 16px; }
.col h2 { font-size: 15px; }
.muted { color: #7a828f; font-weight: normal; }
.probe { display: grid; gap: 6px; background: #161a22; padding: 12px; border-radius: 8px; }
.probe label { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; }
.probe input, .probe select { background: #0f1115; color: #e6e6e6; border: 1px solid #2a2e37; border-radius: 4px; padding: 3px 6px; }
button { background: #2f6df6; color: white; border: 0; border-radius: 6px; padding: 8px; cursor: pointer; }
.feed { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
.card { background: #161a22; border-left: 3px solid #2f6df6; border-radius: 6px; padding: 10px; font-size: 13px; animation: flash .6s; }
.card.clip { border-left-color: #f6a52f; }
.card.fallback { border-left-color: #888; }
.kv { display: flex; flex-wrap: wrap; gap: 4px 12px; color: #b9c0cc; }
.bar { height: 6px; background: #2f6df6; border-radius: 3px; }
@keyframes flash { from { background: #24314d; } to { background: #161a22; } }
#health span { margin-left: 10px; font-size: 12px; }
.ok { color: #4ad07a; } .down { color: #f0506e; }
```

- [ ] **Step 5: Create `src/main.js`**

```javascript
import { PRICING, RECO, health, predict, recommend, streamEvents } from "./api.js";

const pricingFeed = document.getElementById("pricing-feed");
const recoFeed = document.getElementById("recommender-feed");

function prepend(feed, el) {
  feed.prepend(el);
  while (feed.children.length > 30) feed.removeChild(feed.lastChild);
}

function priceCard(e) {
  const div = document.createElement("div");
  div.className = "card" + (e.safety_clipped ? " clip" : "");
  const pct = Math.min(100, Math.abs(e.delta_pct) * 3 + 4);
  div.innerHTML = `
    <strong>${e.productId} · ${e.category}</strong> → ${Math.round(e.targetPrice).toLocaleString()}đ
    <div class="kv">
      <span>action ${e.action_idx}/${e.n_actions}</span>
      <span>Δ ${e.delta_pct}%</span>
      <span>tag ${e.freshness_tag}</span>
      <span>${e.safety_clipped ? "⚠ safety-clipped" : "no clip"}</span>
    </div>
    <div class="bar" style="width:${pct}%"></div>
    <div class="kv"><span>obs[${e.obs.length}]: ${e.obs.map((x) => x.toFixed(2)).join(", ")}</span></div>`;
  return div;
}

function recoCard(e) {
  const div = document.createElement("div");
  div.className = "card" + (e.source === "fallback" ? " fallback" : "");
  const recs = e.recommendations.map((r) => `${r.category} (${r.score})`).join(", ");
  div.innerHTML = `
    <strong>cart: ${e.cart_categories.join(", ")}</strong>
    <div class="kv"><span>source: ${e.source}</span><span>top_k ${e.top_k}</span></div>
    <div class="kv"><span>→ ${recs || "(none)"}</span></div>`;
  return div;
}

streamEvents(PRICING, (e) => {
  if (e.kind === "predict") prepend(pricingFeed, priceCard(e));
});
streamEvents(RECO, (e) => {
  if (e.kind === "recommend") prepend(recoFeed, recoCard(e));
});

async function refreshHealth() {
  const [p, r] = await Promise.all([health(PRICING), health(RECO)]);
  document.getElementById("health").innerHTML =
    `<span class="${p.status === "ok" ? "ok" : "down"}">pricing ${p.status}</span>` +
    `<span class="${r.status === "ok" ? "ok" : "down"}">reco ${r.status}</span>`;
}
refreshHealth();
setInterval(refreshHealth, 5000);

document.getElementById("predict-form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const f = new FormData(ev.target);
  await predict({ state_vectors: [{
    productId: "probe-" + Date.now().toString().slice(-4),
    category: f.get("category"),
    freshness: +f.get("freshness"),
    inventory_ratio: +f.get("inventory_ratio"),
    base_price: +f.get("base_price"),
    competitor_ref_price: +f.get("competitor_ref_price"),
  }] });
  // result arrives via the live stream
});

document.getElementById("recommend-form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const f = new FormData(ev.target);
  await recommend({
    cart_categories: f.get("cart_categories").split(",").map((s) => s.trim()).filter(Boolean),
    top_k: +f.get("top_k"),
  });
});
```

- [ ] **Step 6: Install + verify it builds**

Run: `cd ml-observatory && npm install && npm run build`
Expected: Vite build succeeds, `dist/` produced, no errors.

- [ ] **Step 7: Commit**

```bash
git add ml-observatory/
git commit -m "feat(ml-observatory): web dashboard — live-tail SSE + manual probe + health"
```

---

## Task 5: Web dashboard — manual end-to-end verification against live sidecars

**Files:** none (verification task).

- [ ] **Step 1: Start both sidecars**

```bash
cd pricing-sidecar && uvicorn main:app --port 8000 &
cd recommender-sidecar && uvicorn main:app --port 8001 &
```

- [ ] **Step 2: Start the dashboard**

Run: `cd ml-observatory && npm run dev`
Open the printed `http://localhost:5173`.

- [ ] **Step 3: Verify health + probe + live tail**

- Both health badges show `ok` (or `pricing down` if checkpoints absent — note it).
- Click **Probe /predict** → a pricing card appears within ~1s with obs vector, action, Δ%.
- Click **Probe /recommend** → a recommender card appears with rules/fallback.
- Confirm cards stream in live (the SSE feed), not only on button click.

Expected: cards render with REAL values; if pricing shows `model not loaded`, document that real checkpoints are required (see DEMO-READY-CHECKLIST).

- [ ] **Step 4: Stop background servers**

```bash
kill %1 %2 2>/dev/null
```

(No commit — verification only. Record findings in the checklist doc in Task 7.)

---

## Task 6: Streamlit dashboard

**Files:**
- Create: `ml-observatory-streamlit/app.py`, `ml-observatory-streamlit/requirements.txt`

- [ ] **Step 1: Create `requirements.txt`**

```
streamlit>=1.36
requests>=2.31
```

- [ ] **Step 2: Create `app.py`**

```python
"""F2T Live ML Observatory — Streamlit edition.

Polls each sidecar's /_events?since= endpoint (no SSE needed) and lets you
probe /predict and /recommend. Shows REAL model output only.
"""
import os
import requests
import streamlit as st

PRICING = os.environ.get("PRICING_URL", "http://localhost:8000")
RECO = os.environ.get("RECO_URL", "http://localhost:8001")

st.set_page_config(page_title="F2T ML Observatory", layout="wide")
st.title("F2T — Live ML Observatory")

if "p_seq" not in st.session_state:
    st.session_state.p_seq = 0
    st.session_state.r_seq = 0
    st.session_state.p_feed = []
    st.session_state.r_feed = []


def health(base):
    try:
        return requests.get(f"{base}/health", timeout=2).json()
    except Exception:
        return {"status": "down"}


def poll(base, seq_key, feed_key):
    try:
        data = requests.get(f"{base}/_events", params={"since": st.session_state[seq_key]}, timeout=2).json()
    except Exception:
        return
    for e in data.get("events", []):
        st.session_state[feed_key].insert(0, e)
        st.session_state[seq_key] = max(st.session_state[seq_key], e["seq"])
    st.session_state[feed_key] = st.session_state[feed_key][:30]


hc1, hc2 = st.columns(2)
hc1.metric("pricing :8000", health(PRICING).get("status", "down"))
hc2.metric("reco :8001", health(RECO).get("status", "down"))

col1, col2 = st.columns(2)

with col1:
    st.subheader("Pricing DDQN")
    with st.form("predict"):
        cat = st.selectbox("category", ["fruit", "root", "leafy", "herbs"])
        fr = st.slider("freshness", 0.0, 1.0, 0.9, 0.05)
        inv = st.number_input("inventory_ratio", value=0.5)
        bp = st.number_input("base_price", value=10000.0)
        cp = st.number_input("competitor_ref_price", value=9500.0)
        if st.form_submit_button("Probe /predict"):
            requests.post(f"{PRICING}/predict", json={"state_vectors": [{
                "productId": "probe", "category": cat, "freshness": fr,
                "inventory_ratio": inv, "base_price": bp, "competitor_ref_price": cp}]}, timeout=5)
    poll(PRICING, "p_seq", "p_feed")
    for e in st.session_state.p_feed:
        if e["kind"] != "predict":
            continue
        clip = "⚠ clipped" if e["safety_clipped"] else "no clip"
        st.markdown(f"**{e['productId']} · {e['category']}** → {round(e['targetPrice']):,}đ "
                    f"| action {e['action_idx']}/{e['n_actions']} | Δ {e['delta_pct']}% | {e['freshness_tag']} | {clip}")
        st.caption("obs: " + ", ".join(f"{x:.2f}" for x in e["obs"]))

with col2:
    st.subheader("Recommender FP-Growth")
    with st.form("recommend"):
        carts = st.text_input("cart_categories (phẩy)", "leafy,fruit")
        tk = st.number_input("top_k", value=5, step=1)
        if st.form_submit_button("Probe /recommend"):
            requests.post(f"{RECO}/recommend", json={
                "cart_categories": [c.strip() for c in carts.split(",") if c.strip()],
                "top_k": int(tk)}, timeout=5)
    poll(RECO, "r_seq", "r_feed")
    for e in st.session_state.r_feed:
        if e["kind"] != "recommend":
            continue
        recs = ", ".join(f"{r['category']} ({r['score']})" for r in e["recommendations"])
        st.markdown(f"**cart: {', '.join(e['cart_categories'])}** | source: {e['source']}")
        st.caption("→ " + (recs or "(none)"))

st.button("🔄 Refresh feed")  # manual re-run; rerun also refreshes health + polls
```

- [ ] **Step 3: Verify it runs (manual, sidecars up from Task 5)**

```bash
cd ml-observatory-streamlit && pip install -r requirements.txt && streamlit run app.py
```
Expected: page loads; health metrics show status; probing /predict and /recommend then clicking "Refresh feed" shows new event cards with real obs/rules.

- [ ] **Step 4: Commit**

```bash
git add ml-observatory-streamlit/
git commit -m "feat(ml-observatory-streamlit): Streamlit dashboard — poll-based live tail + probe"
```

---

## Task 7: Demo-ready checklist doc

**Files:**
- Create: `docs/demo/DEMO-READY-CHECKLIST.md`

- [ ] **Step 1: Write the checklist**

Content must include, as runnable steps:

1. **Prereqs**: which env vars (`MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`; `UPLOAD_BASE_URL`=LAN IP; leave `GHN_TOKEN` unset → Dijkstra fallback; Stripe optional). Note real pricing needs the checkpoints `dynamic-pricing-final/checkpoints/rl_shared_forecaster_best.pt` + `forecaster_v4_best.pt`; recommender needs `recommender-final/model/category_rules.json`.
2. **Start order (5 terminals)** with exact commands:
   - `cd f2t-backend && npm run seed && npm run start:dev`
   - `cd pricing-sidecar && uvicorn main:app --port 8000`
   - `cd recommender-sidecar && uvicorn main:app --port 8001`
   - `cd ml-observatory && npm run dev`
   - `cd ml-observatory-streamlit && streamlit run app.py`
   - `cd f2t-frontend && pnpm start`
3. **Health gate**: `curl localhost:8000/health` shows `ddqn_loaded: true`; `curl localhost:8001/health` shows `n_rules > 0`; backend `/api-docs` loads.
4. **Demo accounts** per role (consumer/farm/admin) — pull seed credentials from `CONTEXT.md` (read it during execution and copy the actual values in; do not invent).
5. **Smoke pass** matching the video flow: open a farm → product shows dynamic price/tag; add to cart → cross-sell appears; both dashboards show live events; farm freshness scan returns a tag; admin analytics loads.
6. **Honesty reminders** to keep on-screen claims accurate (the limits list from the spec).

- [ ] **Step 2: Verify accounts are real**

Run: `grep -iE "seed|password|admin@|farm@|consumer@|@f2t" CONTEXT.md | head`
Expected: actual seed credentials found; paste them into the checklist. If not found, run `cd f2t-backend && npm run seed` output capture and use those.

- [ ] **Step 3: Commit**

```bash
git add docs/demo/DEMO-READY-CHECKLIST.md
git commit -m "docs(demo): demo-ready checklist (run order, health gates, seed accounts)"
```

---

## Task 8: Video script + storyboard doc

**Files:**
- Create: `docs/demo/VIDEO-SCRIPT.md`

- [ ] **Step 1: Write the script**

Structure (two parts, ~6 min), each scene as a row with: timestamp, on-screen action, Vietnamese voiceover line, on-screen caption. Use this concrete model for tone/precision (write all scenes, not just samples):

Part 1 — Tour (~2.5 min):
- 0:00–0:15 Title. VO: *"F2T — chợ nông sản kết nối nông trại Việt với người mua. Sau đây là demo các tính năng cốt lõi và phần AI của hệ thống."*
- 0:15–1:00 Buyer: farm gần bạn + product card. VO nhấn: giá hiển thị là **giá động từ mô hình RL**, kèm **nhãn độ tươi**. Caption: "Dynamic pricing (DDQN) · Freshness tag".
- 1:00–1:30 Cart cross-sell. VO: gợi ý mua kèm bằng **luật kết hợp FP-Growth ở mức danh mục**. Caption nêu rõ "category-level".
- 1:30–2:00 Checkout → Stripe WebView → đơn. VO ngắn; nêu **Stripe (backend + WebView)**, **phí ship Dijkstra (fallback demo)**.
- 2:00–2:30 Farm: quét tươi (fruit/root) → gợi ý giá RL. VO nêu rõ **chỉ 2/4 mô hình (fruit, root)**.
- 2:30–2:40 Admin: verify + analytics (lướt).

Part 2 — Live ML Observatory (~3.5 min):
- 2:40–3:10 Giới thiệu bố cục: điện thoại bên trái, dashboard bên phải; "mọi số trên dashboard là output thật của model".
- 3:10–4:10 Pricing live: thao tác trên app → card pricing xuất hiện; giải thích obs vector → action DQN → Δ% → safety clip. Nêu giới hạn tile-21×, obs_dim 12.
- 4:10–5:00 Recommender live: thêm sản phẩm vào giỏ → card recommend; chỉ rule FP-Growth + lift, hay fallback. Nêu category-level.
- 5:00–5:40 Probe thủ công: hạ freshness → giá rớt / safety clip bật → chứng minh phản ứng thật.
- 5:40–6:00 Kết: tóm tắt 4 AI function + nêu thẳng các hạn chế (§5.2) + lời cảm ơn.

Each row must include the exact Vietnamese VO sentence (write them out), not a description.

- [ ] **Step 2: Cross-check claims against code**

Re-read the spec §1 limits and confirm every VO claim matches: no item-level cross-sell wording, freshness 2/4 stated, Dijkstra called fallback, Stripe scoped. Fix any drift inline.

- [ ] **Step 3: Commit**

```bash
git add docs/demo/VIDEO-SCRIPT.md
git commit -m "docs(demo): video script + storyboard (VN voiceover, timestamps)"
```

---

## Task 9: Recording + editing guide

**Files:**
- Create: `docs/demo/RECORDING-GUIDE.md`

- [ ] **Step 1: Write the guide**

Must cover:
1. **Capture targets**: app via iOS Simulator/Android Emulator (clean) for most scenes; **freshness scan needs a real device camera** — record on a real iPhone/Android, or demo `/freshness/classify` with a pre-saved photo (base64) if a dev build with CoreML isn't ready. Flag this decision point up front.
2. **macOS screen recording**: QuickTime "New Screen Recording" or `⇧⌘5`; iPhone via QuickTime "Movie Recording" with iPhone as source (USB), or iPhone Mirroring on macOS 15+.
3. **Side-by-side layout** for Part 2: phone capture + dashboard window arranged in the editor (or a screen-recording region covering both).
4. **Voiceover**: record VN narration from `VIDEO-SCRIPT.md` per timestamp (any recorder, or TTS); layer over muted screen capture.
5. **Editing**: free tools (iMovie/DaVinci Resolve/CapCut); add captions per the script's caption column; export 1080p, ~6 min.
6. **Pre-flight**: run the DEMO-READY-CHECKLIST first; verify both dashboards show live events before recording Part 2.

- [ ] **Step 2: Commit**

```bash
git add docs/demo/RECORDING-GUIDE.md
git commit -m "docs(demo): recording + editing guide"
```

---

## Final verification

- [ ] **New sidecar tests pass:** `cd pricing-sidecar && python -m pytest tests/test_events.py -q` and `cd recommender-sidecar && python -m pytest tests/ -q` → green. (Pre-existing `test_predict.py::test_health_endpoint` + `::test_predict_smoke` remain red and are out of scope.)
- [ ] **Both dashboards launch** and show live events against running sidecars (Tasks 5 & 6 verification).
- [ ] **Contract intact:** `/predict`, `/recommend`, `/forecast` response shapes unchanged (covered by Task 2/3 contract tests).
- [ ] **Three docs exist** under `docs/demo/` and every VO/claim matches the honesty limits in the spec.
