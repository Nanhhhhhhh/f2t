import sys
import os
import math
import logging
import base64
import io
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Optional

import numpy as np
import torch

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# ── Pull model definitions from dynamic-pricing-final ─────────────────
_DP_ROOT = "/Users/macos/f2t/dynamic-pricing-final"
sys.path.insert(0, _DP_ROOT)

from src.rl.network import SharedMLPDuelingQNet
from src.forecaster.model import ForecasterLSTM, ForecasterConfig
from src.rl.reward import CANDIDATES, compute_mask

try:
    import coremltools as ct
    from PIL import Image as PILImage
    _COREML_AVAILABLE = True
except ImportError:
    _COREML_AVAILABLE = False

try:
    from safety import apply_safety
except ImportError:
    def apply_safety(target_price, base_price, freshness):
        cost_floor = base_price * 0.55 * 1.05
        clipped = max(target_price, cost_floor)
        return clipped, clipped != target_price

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Constants ────────────────────────────────────────────────────────
DDQN_CKPT       = os.path.join(_DP_ROOT, "checkpoints", "rl_shared_best.pt")
FORECASTER_CKPT = os.path.join(_DP_ROOT, "checkpoints", "forecaster_v4_best.pt")
FRESHNESS_DIR   = os.path.join(os.path.dirname(__file__), "..", "freshnessmodels-1")

CATEGORIES  = ["leafy", "root", "fruit", "herbs"]
CAT_TO_IDX  = {c: i for i, c in enumerate(CATEGORIES)}
OBS_DIM     = 10
N_ACTIONS   = 11
N_CATS      = 4
OBS_WINDOW  = 21

DAILY_DECAY     = {"leafy": 0.850, "root": 0.950, "fruit": 0.880, "herbs": 0.800}
WASTE_THRESHOLD = 0.50
BASE_DEMAND     = {"leafy": 7.463, "root": 5.631, "fruit": 2.050, "herbs": 4.575}

# ── Global model holders ─────────────────────────────────────────────
ddqn_net: Optional[SharedMLPDuelingQNet] = None
forecaster_net: Optional[ForecasterLSTM] = None
forecaster_obs_dim: int = OBS_DIM
freshness_models: dict = {}


def _build_obs(
    freshness: float,
    inventory_ratio: float,
    base_price: float,
    competitor_ref_price: float,
    days_to_restock: float,
    prev_delta: float,
    demand_7d: float,
    category: str,
) -> np.ndarray:
    dow = datetime.now().weekday()
    decay = DAILY_DECAY[category]
    if freshness <= WASTE_THRESHOLD or decay >= 1.0:
        days_to_waste = 0.0
    else:
        days_to_waste = math.log(WASTE_THRESHOLD / freshness) / math.log(decay)

    demand_ratio = (demand_7d / 7.0) / BASE_DEMAND[category] if demand_7d > 0 else 1.0
    inv_units = inventory_ratio * 100.0
    inv_coverage = inv_units / max(demand_7d, 1.0) if demand_7d > 0 else inv_units / max(BASE_DEMAND[category] * 7, 1.0)
    comp_ratio = (competitor_ref_price / base_price) if base_price > 0 else 1.0

    return np.array([
        float(np.clip(freshness, 0.0, 1.0)),
        float(min(inventory_ratio, 2.0)),
        math.sin(2 * math.pi * dow / 7),
        math.cos(2 * math.pi * dow / 7),
        float(min(days_to_restock / 30.0, 1.0)),
        float(np.clip(demand_ratio, 0.0, 3.0)),
        float(np.clip(prev_delta, -0.30, 0.20)),
        float(np.clip(comp_ratio, 0.5, 2.0)),
        float(np.clip(days_to_waste, 0.0, 14.0)) / 14.0,
        float(np.clip(inv_coverage, 0.0, 3.0)) / 3.0,
    ], dtype=np.float32)


def _run_forecaster(obs: np.ndarray, category: str) -> tuple[float, float]:
    """Tile current obs 21x → run ForecasterLSTM → (demand7d, p_waste)."""
    global forecaster_net, forecaster_obs_dim
    if forecaster_net is None:
        return 0.0, 0.0
    try:
        obs_padded = obs[:forecaster_obs_dim] if len(obs) >= forecaster_obs_dim else np.pad(obs, (0, forecaster_obs_dim - len(obs)))
        window = np.tile(obs_padded, (OBS_WINDOW, 1))
        feat = torch.tensor(window, dtype=torch.float32).unsqueeze(0)
        cidx = torch.tensor([CAT_TO_IDX[category]], dtype=torch.long)
        with torch.no_grad():
            out = forecaster_net(feat, cidx)
        d_hat   = float(max(0.0, out["demand"].item()))
        p_waste = float(torch.sigmoid(out["waste_logit"]).item())
        return d_hat, p_waste
    except Exception as e:
        logger.warning(f"Forecaster inference error: {e}")
        return 0.0, 0.0


@asynccontextmanager
async def lifespan(app: FastAPI):
    global ddqn_net, forecaster_net, forecaster_obs_dim, freshness_models

    # ── Load DDQN ─────────────────────────────────────────────────
    try:
        ckpt = torch.load(DDQN_CKPT, map_location="cpu", weights_only=False)
        ddqn_net = SharedMLPDuelingQNet(
            obs_dim=OBS_DIM, n_cats=N_CATS, cat_embed_dim=8, hidden=128, n_actions=N_ACTIONS
        )
        sd = ckpt["online"]
        if any(k.startswith("_orig_mod.") for k in sd):
            sd = {k[len("_orig_mod."):]: v for k, v in sd.items()}
        ddqn_net.load_state_dict(sd)
        ddqn_net.eval()
        logger.info(f"DDQN loaded from {DDQN_CKPT}")
    except Exception as e:
        logger.error(f"DDQN load failed: {e}")

    # ── Load Forecaster ───────────────────────────────────────────
    try:
        fckpt = torch.load(FORECASTER_CKPT, map_location="cpu", weights_only=False)
        cfg = ForecasterConfig(**fckpt["model_cfg"])
        forecaster_obs_dim = cfg.obs_dim
        forecaster_net = ForecasterLSTM(cfg)
        forecaster_net.load_state_dict(fckpt["model_state"])
        forecaster_net.eval()
        for p in forecaster_net.parameters():
            p.requires_grad = False
        logger.info(f"Forecaster loaded from {FORECASTER_CKPT} (obs_dim={cfg.obs_dim})")
    except Exception as e:
        logger.error(f"Forecaster load failed: {e}")

    # ── Load CoreML freshness models ──────────────────────────────
    if _COREML_AVAILABLE:
        for key, fname in [("fruit", "MyFreshnessClassifier-fruit.mlmodel"),
                           ("root",  "MyFreshnessClassifier-root.mlmodel")]:
            path = os.path.join(FRESHNESS_DIR, fname)
            if os.path.exists(path):
                try:
                    freshness_models[key] = ct.models.MLModel(path)
                    logger.info(f"CoreML '{key}' loaded")
                except Exception as e:
                    logger.warning(f"CoreML '{key}' failed: {e}")

    yield


app = FastAPI(lifespan=lifespan)


# ── Pydantic models ───────────────────────────────────────────────────
class ProductStateVector(BaseModel):
    productId: str
    category: str
    freshness: float
    inventory_ratio: float
    base_price: float
    competitor_ref_price: float
    days_to_restock: float = 3.0
    prev_delta: float = 0.0
    demand_7d: float = 0.0


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


class ForecastRequest(BaseModel):
    state_vector: ProductStateVector


class ForecastResponse(BaseModel):
    productId: str
    demand7d: float
    pWaste: float


class ClassifyRequest(BaseModel):
    image_b64: str
    category: str


class ClassifyResponse(BaseModel):
    score: float
    tag: str
    label: str
    confidence: float


# ── Endpoints ─────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": "dynamic-pricing-final (DDQN, obs_dim=10)",
        "ddqn_loaded": ddqn_net is not None,
        "forecaster_loaded": forecaster_net is not None,
        "coreml_loaded": list(freshness_models.keys()),
    }


@app.post("/forecast", response_model=ForecastResponse)
def forecast(req: ForecastRequest) -> ForecastResponse:
    sv = req.state_vector
    if sv.category not in CAT_TO_IDX:
        raise HTTPException(status_code=422, detail=f"Unknown category: {sv.category}")
    obs = _build_obs(
        sv.freshness, sv.inventory_ratio, sv.base_price,
        sv.competitor_ref_price, sv.days_to_restock, sv.prev_delta,
        sv.demand_7d, sv.category,
    )
    demand7d, p_waste = _run_forecaster(obs, sv.category)
    return ForecastResponse(productId=sv.productId, demand7d=demand7d, pWaste=p_waste)


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest) -> PredictResponse:
    if ddqn_net is None:
        raise HTTPException(status_code=503, detail="DDQN model not loaded")
    results: list[PriceOverride] = []
    for sv in req.state_vectors:
        if sv.category not in CAT_TO_IDX:
            logger.warning(f"Unknown category '{sv.category}' — skipping {sv.productId}")
            continue
        obs = _build_obs(
            sv.freshness, sv.inventory_ratio, sv.base_price,
            sv.competitor_ref_price, sv.days_to_restock, sv.prev_delta,
            sv.demand_7d, sv.category,
        )
        obs_t   = torch.tensor(obs, dtype=torch.float32).unsqueeze(0)
        cat_t   = torch.tensor([CAT_TO_IDX[sv.category]], dtype=torch.long)
        mask_np = compute_mask(sv.freshness, sv.category)
        mask_t  = torch.tensor(mask_np, dtype=torch.bool).unsqueeze(0)

        with torch.no_grad():
            q = ddqn_net(obs_t, cat_t, mask_t)
            action_idx = int(q.squeeze().argmax().item())

        delta = float(CANDIDATES[action_idx])
        target_price = sv.base_price * (1.0 + delta)
        final_price, was_clipped = apply_safety(target_price, sv.base_price, sv.freshness)
        tag = "fresh" if sv.freshness >= 0.8 else ("aging" if sv.freshness >= 0.4 else "critical")
        delta_pct = round((final_price / sv.base_price - 1.0) * 100, 2)

        results.append(PriceOverride(
            productId=sv.productId,
            targetPrice=final_price,
            delta_pct=delta_pct,
            safety_clipped=was_clipped,
            freshness_tag=tag,
        ))
    return PredictResponse(overrides=results)


@app.post("/freshness/classify", response_model=ClassifyResponse)
def classify_freshness(req: ClassifyRequest) -> ClassifyResponse:
    model_key = "fruit" if req.category in ("fruit", "fruits") else "root"
    model = freshness_models.get(model_key)
    if model is None:
        return ClassifyResponse(score=0.75, tag="aging", label="fresh", confidence=0.75)
    try:
        img_bytes = base64.b64decode(req.image_b64)
        img = PILImage.open(io.BytesIO(img_bytes)).convert("RGB").resize((299, 299))
        predictions = model.predict({"image": img})
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Image classification failed: {e}")
    probs = predictions.get("targetProbability", {})
    label = predictions.get("target", "fresh")
    score = float(probs.get("fresh", 1.0 - probs.get("rotten", 0.0)))
    confidence = float(probs.get(label, 0.0))
    tag = "fresh" if score >= 0.8 else ("aging" if score >= 0.4 else "critical")
    return ClassifyResponse(score=score, tag=tag, label=label, confidence=confidence)
