import asyncio
import json
import json as _json
import logging
import os
from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

import events

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

CATEGORY_RULES: dict[str, list[dict]] = {}
CATEGORY_POPULARITY: dict[str, float] = {}
MODEL_VERSION = "none"


def _load() -> None:
    global CATEGORY_RULES, CATEGORY_POPULARITY, MODEL_VERSION
    model_dir = os.environ.get(
        "RECOMMENDER_MODEL_DIR",
        os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "recommender-final", "model")),
    )
    rules_path = os.path.join(model_dir, "category_rules.json")
    pop_path = os.path.join(model_dir, "category_popularity.json")
    try:
        with open(rules_path) as f:
            CATEGORY_RULES = json.load(f)
        with open(pop_path) as f:
            CATEGORY_POPULARITY = json.load(f)
        MODEL_VERSION = str(int(os.path.getmtime(rules_path)))
        logger.info(f"Loaded {len(CATEGORY_RULES)} antecedents from {rules_path}")
    except (FileNotFoundError, json.JSONDecodeError):
        logger.warning(f"Artifact not found/invalid in {model_dir}; serving empty rules (fallback only)")
        CATEGORY_RULES, CATEGORY_POPULARITY, MODEL_VERSION = {}, {}, "none"


app = FastAPI(title="F2T Recommender Sidecar")
_load()

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
        try:
            while True:
                for e in events.get_since(last):
                    last = e["seq"]
                    yield f"data: {_json.dumps(e)}\n\n"
                await asyncio.sleep(0.5)
        except asyncio.CancelledError:
            return
    return StreamingResponse(gen(), media_type="text/event-stream")


class RecommendRequest(BaseModel):
    cart_categories: list[str]
    top_k: int = 5


class Recommendation(BaseModel):
    category: str
    score: float
    source: Literal["rule", "fallback"]


class RecommendResponse(BaseModel):
    recommendations: list[Recommendation]


@app.get("/health")
def health():
    return {"status": "ok", "model_version": MODEL_VERSION, "n_rules": len(CATEGORY_RULES)}


@app.post("/recommend", response_model=RecommendResponse)
def recommend(req: RecommendRequest) -> RecommendResponse:
    in_cart = set(req.cart_categories)
    scores: dict[str, float] = {}
    for cat in set(req.cart_categories):  # dedupe so duplicate cart entries don't double-count
        for rule in CATEGORY_RULES.get(cat, []):
            c = rule.get("consequent")
            lift = rule.get("lift")
            if c is None or lift is None or c in in_cart:
                continue
            scores[c] = scores.get(c, 0.0) + float(lift)

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

    pop = sorted(
        ((c, s) for c, s in CATEGORY_POPULARITY.items() if c not in in_cart),
        key=lambda kv: kv[1],
        reverse=True,
    )[: req.top_k]
    recs = [Recommendation(category=c, score=round(s, 4), source="fallback") for c, s in pop]
    events.record("recommend", {
        "cart_categories": req.cart_categories,
        "top_k": req.top_k,
        "recommendations": [r.model_dump() for r in recs],
        "source": "fallback",
    })
    return RecommendResponse(recommendations=recs)
