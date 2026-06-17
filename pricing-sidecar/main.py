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

import asyncio
import json as _json

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

import events

# ── Pull model definitions from dynamic-pricing-final ─────────────────
_DP_ROOT = os.environ.get(
    "DP_ROOT",
    os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dynamic-pricing-final")),
)

# Import directly from files to avoid triggering src/rl/__init__.py which
# transitively imports src.env.market_env (lives in thesis_v2, not here).
import importlib.util as _ilu

def _dp_import(rel: str, name: str):
    spec = _ilu.spec_from_file_location(name, os.path.join(_DP_ROOT, rel))
    mod = _ilu.module_from_spec(spec)  # type: ignore[arg-type]
    sys.modules[name] = mod
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    return mod

_net_mod    = _dp_import("src/rl/network.py",       "dp_network")
_fcast_mod  = _dp_import("src/forecaster/model.py", "dp_forecaster")
_reward_mod = _dp_import("src/rl/reward.py",        "dp_reward")

SharedMLPDuelingQNet = _net_mod.SharedMLPDuelingQNet
ForecasterLSTM       = _fcast_mod.ForecasterLSTM
ForecasterConfig     = _fcast_mod.ForecasterConfig
CANDIDATES           = _reward_mod.CANDIDATES
compute_mask         = _reward_mod.compute_mask

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
DDQN_CKPT       = os.path.join(_DP_ROOT, "checkpoints", "rl_shared_forecaster_best.pt")
FORECASTER_CKPT = os.path.join(_DP_ROOT, "checkpoints", "forecaster_v4_best.pt")
FRESHNESS_DIR   = os.environ.get(
    "FRESHNESS_DIR",
    os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "freshnessmodels")),
)

CATEGORIES  = ["leafy", "root", "fruit", "herbs"]
CAT_TO_IDX  = {c: i for i, c in enumerate(CATEGORIES)}
OBS_DIM     = 10
N_ACTIONS   = 11
N_CATS      = 4
OBS_WINDOW  = 21

# Forecaster-augmented DDQN: the policy obs is the 10-dim market state plus
# [d_hat, p_waste] from the frozen ForecasterLSTM (EXTRA_DIM=2), matching how
# rl_shared_forecaster_best.pt was trained (train.py concatenates fc_feats onto
# the flat obs). Set USE_FORECASTER_OBS=False to fall back to the 10-dim
# rl_shared_best.pt checkpoint.
USE_FORECASTER_OBS = True
EXTRA_DIM          = 2
DDQN_OBS_DIM       = OBS_DIM + (EXTRA_DIM if USE_FORECASTER_OBS else 0)

DAILY_DECAY     = {"leafy": 0.850, "root": 0.950, "fruit": 0.880, "herbs": 0.800}
WASTE_THRESHOLD = 0.50
BASE_DEMAND     = {"leafy": 7.463, "root": 5.631, "fruit": 2.050, "herbs": 4.575}
# Per-category restock cycle the policy was trained on (market_env.py:12). At train
# days_to_next = RESTOCK_EVERY[cat] - (t % RESTOCK_EVERY[cat]) ∈ [1, RESTOCK_EVERY[cat]]
# (market_env.py:133), so obs[4] = min(days_to_next/30, 1) never exceeds 7/30 = 0.233.
# Production intervalDays is farmer-set in [1, 30] (farm.schema.ts:32) and would push
# obs[4] up to 1.0 — out of the training support. Clamp the raw input back into that
# horizon so the feature stays in-distribution; the /30 normalisation is unchanged.
RESTOCK_EVERY   = {"leafy": 4, "root": 7, "fruit": 5, "herbs": 3}

# ── Inventory revenue calibration ─────────────────────────────────────
# At train, inventory is an abstract integer count (market_env.py:32) whose *typical*
# level per category is small (leafy/herbs ~3, fruit ~12, root ~23 — see
# calibrate_inventory.py), so the policy only ever saw inventory_ratio = inv/100 ∈
# [0.03, 0.42]. Production availableQuantity is in the farmer's free unit and is far
# larger, so raw availableQuantity/100 is both unit-contaminated (kg vs g differ for the
# same stock) and grossly out-of-distribution. Express inventory by its monetary value
# (unit-invariant) and rescale into the training inventory scale:
#   inv_norm = availableQuantity * pricePerUnit * S_CAT[cat]
# obs[1] and inv_coverage are then built from inv_norm exactly as the env built them from
# the integer count. obs_dim / feature definition / weights are unchanged — only the value
# is moved back in-distribution (same idea as the restock clamp). No retrain.
_CALIB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "inventory_calibration.json")
try:
    with open(_CALIB_PATH) as _cf:
        INV_S_CAT: dict = _json.load(_cf)["s_cat"]
    logger.info(f"Inventory calibration loaded: {INV_S_CAT}")
except Exception as _e:  # noqa: BLE001 — degrade to legacy count-based inventory
    INV_S_CAT = {}
    logging.getLogger(__name__).warning(f"Inventory calibration unavailable ({_e}); using legacy inventory_ratio")


def _inventory_norm(category: str, inventory_ratio: float, available_quantity: float, base_price: float) -> float:
    """Inventory expressed on the training count scale.

    Revenue path (preferred, unit-invariant): availableQuantity * pricePerUnit * S_cat.
    Falls back to the legacy count `inventory_ratio * 100` (= availableQuantity pre-clamp)
    when quantity/price/category are unavailable, so old callers keep working.
    """
    s = INV_S_CAT.get(category)
    if s is not None and available_quantity > 0 and base_price > 0:
        return available_quantity * base_price * s
    return inventory_ratio * 100.0

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
    available_quantity: float = 0.0,
) -> np.ndarray:
    dow = datetime.now().weekday()
    decay = DAILY_DECAY[category]
    if freshness <= WASTE_THRESHOLD or decay >= 1.0:
        days_to_waste = 0.0
    else:
        days_to_waste = math.log(WASTE_THRESHOLD / freshness) / math.log(decay)

    # Keep days_to_restock inside the per-category training support [1, RESTOCK_EVERY[cat]]
    # before normalising, so obs[4] is in-distribution (see RESTOCK_EVERY note above).
    restock_horizon = RESTOCK_EVERY.get(category, 7)
    days_to_restock = float(np.clip(days_to_restock, 1.0, restock_horizon))

    # Revenue-calibrated inventory on the training count scale (unit-invariant); both the
    # level feature obs[1] and inv_coverage are built from it, exactly as the env built
    # them from the integer inventory count (market_env.py:148,144). See _inventory_norm.
    inv_norm = _inventory_norm(category, inventory_ratio, available_quantity, base_price)

    demand_ratio = (demand_7d / 7.0) / BASE_DEMAND[category] if demand_7d > 0 else 1.0
    inv_units = inv_norm
    inv_coverage = inv_units / max(demand_7d, 1.0) if demand_7d > 0 else inv_units / max(BASE_DEMAND[category] * 7, 1.0)
    # comp_ratio: env divides by current price (base * (1+prev_delta)), not base_price.
    # market_env.py:134: comp_ratio = self._comp_prices[cat] / max(self._prices[cat], 1e-6)
    # where self._prices[cat] is the current price after applying prev_delta.
    current_price = base_price * (1.0 + prev_delta)
    comp_ratio = competitor_ref_price / max(current_price, 1e-6)

    return np.array([
        float(np.clip(freshness, 0.0, 1.0)),
        float(min(inv_norm / 100.0, 2.0)),
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
    """Tile current obs 21x → run ForecasterLSTM → (d_hat, p_waste).

    Returns the raw forecaster outputs, byte-identical to the training-time
    encoder (src/rl/forecaster_encoder.py): d_hat = out["demand"] (unclamped),
    p_waste = sigmoid(waste_logit). Do NOT clamp d_hat here — the DDQN obs must
    reproduce the exact values rl_shared_forecaster_best.pt was trained on. The
    /forecast endpoint clamps for display; /predict feeds these straight in.
    """
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
        d_hat   = float(out["demand"].item())
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
            obs_dim=DDQN_OBS_DIM, n_cats=N_CATS, cat_embed_dim=8, hidden=128, n_actions=N_ACTIONS
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
    available_quantity: float = 0.0


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
        "model": f"dynamic-pricing-final (DDQN, obs_dim={DDQN_OBS_DIM})",
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
        sv.demand_7d, sv.category, sv.available_quantity,
    )
    d_hat, p_waste = _run_forecaster(obs, sv.category)
    # Clamp for the public-facing demand figure only; the raw d_hat still feeds
    # /predict unchanged so the DDQN obs matches training.
    events.record("forecast", {"productId": sv.productId, "demand7d": max(0.0, d_hat), "pWaste": p_waste})
    return ForecastResponse(productId=sv.productId, demand7d=max(0.0, d_hat), pWaste=p_waste)


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
            sv.demand_7d, sv.category, sv.available_quantity,
        )
        if USE_FORECASTER_OBS:
            # Append frozen-forecaster features [d_hat, p_waste] → obs_dim 10 → 12,
            # matching training (train.py: np.concatenate([flat_obs, fc_feats])).
            d_hat, p_waste = _run_forecaster(obs, sv.category)
            obs = np.concatenate([obs, np.array([d_hat, p_waste], dtype=np.float32)])
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

        # Real DQN internals for observability. Masked actions are -inf in q
        # (network.masked_fill(~mask, -inf)) → not JSON-serializable, so emit
        # them as null and pair with the boolean action_mask.
        q_raw = q.squeeze().tolist()
        q_values = [None if (x != x or x == float("-inf") or x == float("inf"))
                    else round(float(x), 4) for x in q_raw]

        events.record("predict", {
            "productId": sv.productId,
            "category": sv.category,
            "obs": [round(float(x), 4) for x in obs.tolist()],
            "action_idx": action_idx,
            "n_actions": len(CANDIDATES),
            "candidate_delta": round(float(CANDIDATES[action_idx]), 4),
            "candidates": [round(float(c), 4) for c in CANDIDATES.tolist()],
            "q_values": q_values,
            "action_mask": [bool(m) for m in mask_np.tolist()],
            "raw_target": round(float(target_price), 2),
            "targetPrice": final_price,
            "delta_pct": delta_pct,
            "safety_clipped": was_clipped,
            "freshness_tag": tag,
            "base_price": sv.base_price,
        })
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
    events.record("freshness", {"category": req.category, "score": score, "tag": tag, "label": label, "confidence": confidence})
    return ClassifyResponse(score=score, tag=tag, label=label, confidence=confidence)
