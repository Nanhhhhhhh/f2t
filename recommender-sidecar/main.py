import json
import logging
import os

from fastapi import FastAPI
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_DIR = os.environ.get(
    "RECOMMENDER_MODEL_DIR",
    os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "recommender-final", "model")),
)

CATEGORY_RULES: dict[str, list[dict]] = {}
CATEGORY_POPULARITY: dict[str, float] = {}
MODEL_VERSION = "none"


def _load() -> None:
    global CATEGORY_RULES, CATEGORY_POPULARITY, MODEL_VERSION
    rules_path = os.path.join(MODEL_DIR, "category_rules.json")
    pop_path = os.path.join(MODEL_DIR, "category_popularity.json")
    try:
        with open(rules_path) as f:
            CATEGORY_RULES = json.load(f)
        with open(pop_path) as f:
            CATEGORY_POPULARITY = json.load(f)
        MODEL_VERSION = str(int(os.path.getmtime(rules_path)))
        logger.info(f"Loaded {len(CATEGORY_RULES)} antecedents from {rules_path}")
    except FileNotFoundError:
        logger.warning(f"Artifact not found in {MODEL_DIR}; serving empty rules (fallback only)")
        CATEGORY_RULES, CATEGORY_POPULARITY, MODEL_VERSION = {}, {}, "none"


app = FastAPI(title="F2T Recommender Sidecar")
_load()


class RecommendRequest(BaseModel):
    cart_categories: list[str]
    top_k: int = 5


class Recommendation(BaseModel):
    category: str
    score: float
    source: str


class RecommendResponse(BaseModel):
    recommendations: list[Recommendation]


@app.get("/health")
def health():
    return {"status": "ok", "model_version": MODEL_VERSION, "n_rules": len(CATEGORY_RULES)}


@app.post("/recommend", response_model=RecommendResponse)
def recommend(req: RecommendRequest) -> RecommendResponse:
    in_cart = set(req.cart_categories)
    scores: dict[str, float] = {}
    for cat in req.cart_categories:
        for rule in CATEGORY_RULES.get(cat, []):
            c = rule["consequent"]
            if c in in_cart:
                continue
            scores[c] = scores.get(c, 0.0) + float(rule["lift"])

    if scores:
        ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)[: req.top_k]
        recs = [Recommendation(category=c, score=round(s, 4), source="rule") for c, s in ranked]
        return RecommendResponse(recommendations=recs)

    pop = sorted(
        ((c, s) for c, s in CATEGORY_POPULARITY.items() if c not in in_cart),
        key=lambda kv: kv[1],
        reverse=True,
    )[: req.top_k]
    recs = [Recommendation(category=c, score=round(s, 4), source="fallback") for c, s in pop]
    return RecommendResponse(recommendations=recs)
