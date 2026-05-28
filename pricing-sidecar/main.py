import os
import math
import logging
import base64
import io
import torch
import torch.nn as nn
from typing import Dict, Optional
from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
from pydantic import BaseModel
from datetime import datetime
from safety import apply_safety

try:
    import coremltools as ct
    from PIL import Image as PILImage
    _COREML_AVAILABLE = True
except ImportError:
    _COREML_AVAILABLE = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class QNet(nn.Module):
    """Stateless pricing Q-network (dynamic-pricing-v2). 5-dim obs → 5 action Q-values.

    obs = [freshness, inventory_ratio, competitor_ratio, sin(2π·hour/24), cos(2π·hour/24)]
    Markovian (no recurrence) → identical output for identical input, every restart.
    """
    def __init__(self, obs_dim: int = 5, n_actions: int = 5, hidden: int = 128):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(obs_dim, hidden), nn.ReLU(),
            nn.Linear(hidden, hidden), nn.ReLU(),
            nn.Linear(hidden, n_actions),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


CATEGORIES = ['leafy', 'root', 'fruit', 'herbs']
CAT_TO_IDX = {cat: i for i, cat in enumerate(CATEGORIES)}
ACTIONS = [-0.30, -0.15, 0.0, +0.10, +0.20]
OBS_DIM = 5

dqn_agents: Dict[str, QNet] = {}
freshness_models: Dict[str, object] = {}   # "fruit" | "root" → CoreML MLModel

_DQN_DIR = os.path.join(os.path.dirname(__file__), "..", "dynamic-pricing-v2", "checkpoints")

_FRESHNESS_DIR   = os.path.join(os.path.dirname(__file__), "..", "freshnessmodels-1")
FRUIT_MODEL_PATH = os.path.join(_FRESHNESS_DIR, "MyFreshnessClassifier-fruit.mlmodel")
ROOT_MODEL_PATH  = os.path.join(_FRESHNESS_DIR, "MyFreshnessClassifier-root.mlmodel")


def _build_obs(freshness: float, inventory_ratio: float,
               competitor_ratio: float, hour: int) -> torch.Tensor:
    """5-dim observation matching dynamic-pricing-v2/pricing_env.py."""
    obs = [
        float(freshness),
        float(min(max(inventory_ratio, 0.0), 1.0)),
        float(min(max(competitor_ratio, 0.5), 2.0)),
        math.sin(2 * math.pi * hour / 24),
        math.cos(2 * math.pi * hour / 24),
    ]
    return torch.tensor(obs, dtype=torch.float32).unsqueeze(0)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global dqn_agents, freshness_models

    # --- Stateless DQN pricing agents (dynamic-pricing-v2, obs_dim=5) ---
    for cat in CATEGORIES:
        agent = QNet(obs_dim=OBS_DIM)
        ckpt = os.path.join(_DQN_DIR, f"dqn_{cat}.pt")
        if os.path.exists(ckpt):
            try:
                sd = torch.load(ckpt, map_location="cpu", weights_only=False)
                agent.load_state_dict(sd["online"])
                logger.info(f"DQN '{cat}' loaded from {ckpt}")
            except Exception as e:
                logger.warning(f"DQN '{cat}' failed to load ({e}) — random weights")
        else:
            logger.warning(f"DQN checkpoint not found: {ckpt} — random weights")
        agent.eval()
        dqn_agents[cat] = agent

    # --- CoreML freshness classifiers (macOS only) ---
    if _COREML_AVAILABLE:
        for key, path in [("fruit", FRUIT_MODEL_PATH), ("root", ROOT_MODEL_PATH)]:
            if os.path.exists(path):
                try:
                    freshness_models[key] = ct.models.MLModel(path)
                    logger.info(f"CoreML freshness model '{key}' loaded from {path}")
                except Exception as e:
                    logger.warning(f"CoreML model '{key}' failed to load: {e}")
            else:
                logger.warning(f"CoreML model not found: {path}")
    else:
        logger.warning("coremltools not installed — /freshness/classify will return fallback scores")

    yield


app = FastAPI(lifespan=lifespan)


class ProductStateVector(BaseModel):
    productId: str
    category: str
    freshness: float
    inventory_ratio: float
    base_price: float
    competitor_ref_price: float


class PriceOverride(BaseModel):
    productId: str
    targetPrice: float
    delta_pct: float
    safety_clipped: bool
    freshness_tag: str


class PredictRequest(BaseModel):
    state_vectors: list[ProductStateVector]


class PredictResponse(BaseModel):
    overrides: list[PriceOverride]


class ClassifyRequest(BaseModel):
    image_b64: str          # base64-encoded JPEG/PNG
    category: str           # "fruit" | "root" | any produce category string


class ClassifyResponse(BaseModel):
    score: float            # 0.0 (rotten) – 1.0 (fresh)
    tag: str                # "fresh" | "aging" | "critical"
    label: str              # raw model label: "fresh" | "rotten"
    confidence: float       # probability of the winning label


def _map_category_to_model_key(category: str) -> str:
    return "fruit" if category in ("fruit", "fruits") else "root"


@app.post("/freshness/classify", response_model=ClassifyResponse)
def classify_freshness(req: ClassifyRequest) -> ClassifyResponse:
    """Classify produce freshness from a base64 image using CoreML."""
    model_key = _map_category_to_model_key(req.category)
    model = freshness_models.get(model_key)

    if model is None:
        logger.warning(f"No CoreML model for '{model_key}' — returning Weibull fallback score")
        return ClassifyResponse(score=0.75, tag="aging", label="fresh", confidence=0.75)

    try:
        img_bytes = base64.b64decode(req.image_b64)
        img = PILImage.open(io.BytesIO(img_bytes)).convert("RGB").resize((299, 299))
        predictions = model.predict({"image": img})
    except Exception as e:
        logger.error(f"CoreML inference error: {e}")
        raise HTTPException(status_code=422, detail=f"Image classification failed: {e}")

    probs: dict = predictions.get("targetProbability", {})
    label: str  = predictions.get("target", "fresh")
    score  = float(probs.get("fresh", 1.0 - probs.get("rotten", 0.0)))
    confidence = float(probs.get(label, 0.0))
    tag = "fresh" if score >= 0.8 else ("aging" if score >= 0.4 else "critical")

    logger.info(f"classify_freshness category={req.category} label={label} score={score:.3f}")
    return ClassifyResponse(score=score, tag=tag, label=label, confidence=confidence)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "dqn_loaded": len(dqn_agents) == 4,
        "model": "dynamic-pricing-v2 (stateless DQN, obs_dim=5)",
        "coreml_loaded": list(freshness_models.keys()),
    }


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest) -> PredictResponse:
    """Stateless per-product pricing. Each product's price delta is a function of
    its own (freshness, inventory, competitor ratio, time) — no shared/recurrent
    state, so output is identical across sidecar restarts for identical input."""
    hour = datetime.now().hour
    results: list[PriceOverride] = []

    for p in req.state_vectors:
        if p.category not in dqn_agents:
            logger.warning(f"Unknown category '{p.category}' — skipping {p.productId}")
            continue

        competitor_ratio = (p.competitor_ref_price / p.base_price) if p.base_price > 0 else 1.0
        obs = _build_obs(p.freshness, p.inventory_ratio, competitor_ratio, hour)

        with torch.no_grad():
            q_vals = dqn_agents[p.category](obs)
            action_idx = int(torch.argmax(q_vals[0]).item())

        delta = ACTIONS[action_idx]
        target_price = p.base_price * (1.0 + delta)
        final_price, was_clipped = apply_safety(target_price, p.base_price, p.freshness)

        tag = "fresh" if p.freshness >= 0.8 else ("aging" if p.freshness >= 0.4 else "critical")
        delta_pct = round((final_price / p.base_price - 1.0) * 100, 2)

        results.append(PriceOverride(
            productId=p.productId,
            targetPrice=final_price,
            delta_pct=delta_pct,
            safety_clipped=was_clipped,
            freshness_tag=tag,
        ))

    return PredictResponse(overrides=results)
