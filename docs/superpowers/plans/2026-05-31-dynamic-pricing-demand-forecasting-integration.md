# Dynamic Pricing + Demand Forecasting Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the pricing sidecar from the old v2 stateless DQN (obs_dim=5) to the new `dynamic-pricing-final` Dueling DDQN (obs_dim=10, 11 actions), add a `/forecast` endpoint backed by ForecasterLSTM, and expose this capability as two clean NestJS modules: `demand-forecasting` (new) and `dynamic-pricing` (upgraded).

**Architecture:** The sidecar (`pricing-sidecar/main.py`) is rebuilt to load `SharedMLPDuelingQNet` + `ForecasterLSTM` from absolute paths in `dynamic-pricing-final/checkpoints/`. The NestJS `DemandForecastingModule` calls sidecar `/forecast` and caches results in Redis for 6 hours. The `DynamicPricingModule` calls `DemandForecastingService` first to get `demand_7d`, then builds the full 10-dim state vector before calling `/predict`. Farm owners configure restock intervals per category so the model can include `days_to_restock` in its observation.

**Tech Stack:** Python 3.11 / FastAPI / PyTorch (sidecar), NestJS 11 / TypeScript 5.7 / Mongoose / ioredis (backend), MongoDB 7, Redis 7.

---

## Checkpoint Inventory

| File | Role |
|---|---|
| `dynamic-pricing-final/checkpoints/rl_shared_best.pt` | `SharedMLPDuelingQNet` (obs_dim=10, n_cats=4, cat_embed=8, hidden=128, n_actions=11) — trained **without** forecaster |
| `dynamic-pricing-final/checkpoints/forecaster_v4_best.pt` | `ForecasterLSTM` — obs_dim in `ckpt["model_cfg"]`, returns demand_7d + p_waste |
| `dynamic-pricing-final/data/params/demand_params.json` | base_demand per category (leafy=7.463, root=5.631, fruit=2.05, herbs=4.575) |

## 10-Dim Observation Vector

| Dim | Field | Source |
|---|---|---|
| 0 | freshness | FreshnessCache.medianScore |
| 1 | inv_ratio = min(qty/100, 2.0) | product.availableQuantity |
| 2 | sin(2π·dow/7) | sidecar: datetime.now().weekday() |
| 3 | cos(2π·dow/7) | sidecar |
| 4 | min(days_to_restock/30, 1.0) | NestJS: farm.restockSchedule + product.lastRestockedAt |
| 5 | demand_ratio = (demand_7d/7) / base_demand, capped [0, 3]; default 1.0 | DemandForecastingService |
| 6 | prev_delta | last PriceOverride.deltaPct/100 for product |
| 7 | competitor_ratio = comp_price/base_price, clipped [0.5, 2.0] | existing getCompetitorRefPrice() |
| 8 | min(days_to_waste, 14) / 14 | sidecar: freshness + DAILY_DECAY |
| 9 | min(inv / max(demand_7d, 1), 3) / 3 | sidecar: inventory + demand_7d |

Category mapping (existing, unchanged): vegetables→leafy, herbs→herbs, fruits→fruit, else→root.

---

## File Map

### New files
| Path | Responsibility |
|---|---|
| `f2t-backend/src/common/redis/redis.module.ts` | Global Redis module, exports REDIS_CLIENT token |
| `f2t-backend/src/common/redis/redis.constants.ts` | `REDIS_CLIENT` injection token |
| `f2t-backend/src/modules/demand-forecasting/demand-forecasting.module.ts` | Module wiring |
| `f2t-backend/src/modules/demand-forecasting/demand-forecasting.service.ts` | Calls `/forecast`, Redis cache 6h |
| `f2t-backend/src/modules/demand-forecasting/demand-forecasting.controller.ts` | REST endpoints |
| `f2t-backend/src/modules/demand-forecasting/demand-forecasting.service.spec.ts` | Unit tests |
| `f2t-backend/src/modules/demand-forecasting/dto/forecast.dto.ts` | Request/response DTOs |

### Modified files
| Path | Change |
|---|---|
| `pricing-sidecar/main.py` | Full rewrite: new model, new obs format, add /forecast |
| `f2t-backend/src/modules/farms/schemas/farm.schema.ts` | Add `restockSchedule` field |
| `f2t-backend/src/modules/farms/dto/farm.dto.ts` | Add `UpdateRestockScheduleDto` |
| `f2t-backend/src/modules/farms/farms.service.ts` | Add `updateRestockSchedule()` |
| `f2t-backend/src/modules/farms/farms.controller.ts` | Add `PATCH /farms/me/restock-schedule` |
| `f2t-backend/src/modules/products/schemas/product.schema.ts` | Add `lastRestockedAt?: Date` |
| `f2t-backend/src/modules/dynamic-pricing/dynamic-pricing.service.ts` | Build 10-dim state vector |
| `f2t-backend/src/modules/dynamic-pricing/dynamic-pricing.module.ts` | Import DemandForecastingModule |
| `f2t-backend/src/app.module.ts` | Add DemandForecastingModule, Redis env vars |
| `f2t-backend/.env.development` | Add `REDIS_URL=redis://localhost:6379` |

---

## Task 1: Farm Restock Schedule

Farm owners declare how often they restock each product category (e.g., leafy every 3 days).

**Files:**
- Modify: `f2t-backend/src/modules/farms/schemas/farm.schema.ts`
- Modify: `f2t-backend/src/modules/farms/dto/farm.dto.ts`
- Modify: `f2t-backend/src/modules/farms/farms.service.ts`
- Modify: `f2t-backend/src/modules/farms/farms.controller.ts`

- [ ] **Step 1.1: Add RestockScheduleItem embedded class to farm schema**

In `f2t-backend/src/modules/farms/schemas/farm.schema.ts`, add before the `Farm` class:

```typescript
@Schema({ _id: false })
class RestockScheduleItem {
  @Prop({ required: true })
  category!: string;  // "vegetables" | "fruits" | "herbs" | "grains" | etc.

  @Prop({ required: true, min: 1, max: 30 })
  intervalDays!: number;
}

const RestockScheduleItemSchema = SchemaFactory.createForClass(RestockScheduleItem);
```

Then inside the `Farm` class, add the new field after `businessHours`:

```typescript
@Prop({ type: [RestockScheduleItemSchema], default: [] })
restockSchedule!: RestockScheduleItem[];
```

- [ ] **Step 1.2: Add DTO**

In `f2t-backend/src/modules/farms/dto/farm.dto.ts`, add:

```typescript
import { IsString, IsInt, Min, Max, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class RestockScheduleItemDto {
  @ApiProperty({ example: 'vegetables' })
  @IsString()
  category!: string;

  @ApiProperty({ example: 4, minimum: 1, maximum: 30 })
  @IsInt()
  @Min(1)
  @Max(30)
  intervalDays!: number;
}

export class UpdateRestockScheduleDto {
  @ApiProperty({ type: [RestockScheduleItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RestockScheduleItemDto)
  schedule!: RestockScheduleItemDto[];
}
```

- [ ] **Step 1.3: Add service method**

In `f2t-backend/src/modules/farms/farms.service.ts`, add method:

```typescript
async updateRestockSchedule(ownerId: string, schedule: { category: string; intervalDays: number }[]): Promise<Farm> {
  const farm = await this.farmModel.findOne({ ownerId: new Types.ObjectId(ownerId) });
  if (!farm) throw new NotFoundException('Farm not found');
  farm.restockSchedule = schedule;
  return farm.save();
}
```

- [ ] **Step 1.4: Add controller endpoint**

In `f2t-backend/src/modules/farms/farms.controller.ts`, add:

```typescript
@Patch('me/restock-schedule')
@UseGuards(JwtAuthGuard)
@ApiOperation({ summary: 'Set restock schedule per category for my farm' })
@ApiResponse({ status: 200, description: 'Schedule updated' })
async updateRestockSchedule(
  @CurrentUser() user: { userId: string },
  @Body() dto: UpdateRestockScheduleDto,
) {
  return this.farmsService.updateRestockSchedule(user.userId, dto.schedule);
}
```

- [ ] **Step 1.5: Add `lastRestockedAt` to Product schema**

In `f2t-backend/src/modules/products/schemas/product.schema.ts`, add to the `Product` class:

```typescript
@Prop()
lastRestockedAt?: Date;
```

- [ ] **Step 1.6: Commit**

```bash
cd f2t-backend
npm run lint && npm test -- --testPathPattern="farms" --passWithNoTests
git add src/modules/farms/schemas/farm.schema.ts \
        src/modules/farms/dto/farm.dto.ts \
        src/modules/farms/farms.service.ts \
        src/modules/farms/farms.controller.ts \
        src/modules/products/schemas/product.schema.ts
git commit -m "feat(farms): add restockSchedule per category + product.lastRestockedAt"
```

---

## Task 2: Redis Module

**Files:**
- Create: `f2t-backend/src/common/redis/redis.constants.ts`
- Create: `f2t-backend/src/common/redis/redis.module.ts`

- [ ] **Step 2.1: Install ioredis**

```bash
cd f2t-backend
npm install ioredis
npm install --save-dev @types/ioredis 2>/dev/null || true
```

Expected: `ioredis` added to `package.json`.

- [ ] **Step 2.2: Create injection token**

Create `f2t-backend/src/common/redis/redis.constants.ts`:

```typescript
export const REDIS_CLIENT = 'REDIS_CLIENT';
```

- [ ] **Step 2.3: Create global Redis module**

Create `f2t-backend/src/common/redis/redis.module.ts`:

```typescript
import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL', 'redis://localhost:6379');
        return new Redis(url);
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
```

- [ ] **Step 2.4: Add REDIS_URL to app.module validation schema and .env**

In `f2t-backend/src/app.module.ts`, add to the Joi validation object inside `ConfigModule.forRoot`:

```typescript
REDIS_URL: Joi.string().optional().default('redis://localhost:6379'),
```

Import and add `RedisModule` to the `imports` array in `AppModule`:

```typescript
import { RedisModule } from './common/redis/redis.module';
// ...
imports: [
  RedisModule,
  // ... existing modules
]
```

In `f2t-backend/.env.development`, add:

```
REDIS_URL=redis://localhost:6379
```

- [ ] **Step 2.5: Verify Redis connection compiles**

```bash
cd f2t-backend
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 2.6: Commit**

```bash
cd f2t-backend
git add src/common/redis/redis.constants.ts \
        src/common/redis/redis.module.ts \
        src/app.module.ts \
        .env.development \
        package.json package-lock.json
git commit -m "feat(redis): add global Redis module with ioredis"
```

---

## Task 3: Sidecar Rebuild

Replace the old `dynamic-pricing-v2` stateless DQN with the new `SharedMLPDuelingQNet` + `ForecasterLSTM` from `dynamic-pricing-final/`.

**Files:**
- Modify: `pricing-sidecar/main.py` (full rewrite)

### Obs construction reference

```python
DAILY_DECAY = {"leafy": 0.850, "root": 0.950, "fruit": 0.880, "herbs": 0.800}
WASTE_THRESHOLD = 0.50
BASE_DEMAND = {"leafy": 7.463, "root": 5.631, "fruit": 2.050, "herbs": 4.575}
CAT_TO_IDX = {"leafy": 0, "root": 1, "fruit": 2, "herbs": 3}
CANDIDATES = linspace(-0.30, 0.20, 11)  # 11 action candidates
```

10-dim obs:
```
[0] freshness
[1] min(inv_ratio, 2.0)
[2] sin(2π·dow/7)
[3] cos(2π·dow/7)
[4] min(days_to_restock/30, 1.0)
[5] clip(demand_ratio, 0, 3)   — default 1.0 when demand_7d unknown
[6] prev_delta
[7] clip(comp_ref_price/base_price, 0.5, 2.0)
[8] clip(days_to_waste, 0, 14) / 14
[9] clip(inv/max(demand_7d,1), 0, 3) / 3
```

`days_to_waste`: if freshness > WASTE_THRESHOLD and decay < 1.0:  
`math.log(WASTE_THRESHOLD / freshness) / math.log(DAILY_DECAY[cat])`; else 0.

- [ ] **Step 3.1: Write failing test for sidecar `/health` with new model**

Create `pricing-sidecar/tests/test_new_models.py`:

```python
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient

def test_health_reports_new_model():
    from main import app
    client = TestClient(app)
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["model"] == "dynamic-pricing-final (DDQN, obs_dim=10)"
    assert data["ddqn_loaded"] is True
    assert data["forecaster_loaded"] is True

def test_predict_returns_11_action_space():
    from main import app
    client = TestClient(app)
    resp = client.post("/predict", json={"state_vectors": [{
        "productId": "abc123",
        "category": "leafy",
        "freshness": 0.82,
        "inventory_ratio": 0.35,
        "base_price": 50000,
        "competitor_ref_price": 47000,
        "days_to_restock": 2.0,
        "prev_delta": 0.0,
        "demand_7d": 0.0,
    }]})
    assert resp.status_code == 200
    overrides = resp.json()["overrides"]
    assert len(overrides) == 1
    delta_pct = overrides[0]["delta_pct"]
    assert -30.5 <= delta_pct <= 21.0  # 11 candidates in [-30%, +20%]

def test_forecast_returns_demand_and_waste():
    from main import app
    client = TestClient(app)
    resp = client.post("/forecast", json={"state_vector": {
        "productId": "abc123",
        "category": "leafy",
        "freshness": 0.82,
        "inventory_ratio": 0.35,
        "base_price": 50000,
        "competitor_ref_price": 47000,
        "days_to_restock": 2.0,
        "prev_delta": 0.0,
        "demand_7d": 0.0,
    }})
    assert resp.status_code == 200
    data = resp.json()
    assert "demand7d" in data
    assert "pWaste" in data
    assert 0.0 <= data["pWaste"] <= 1.0
```

Run test (expected FAIL because main.py still has old code):

```bash
cd pricing-sidecar
python -m pytest tests/test_new_models.py -v 2>&1 | tail -20
```

Expected: FAIL with `AssertionError` on model field or shape mismatch.

- [ ] **Step 3.2: Rewrite `pricing-sidecar/main.py`**

```python
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
import torch.nn as nn

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
    obs_padded = obs[:forecaster_obs_dim] if len(obs) >= forecaster_obs_dim else np.pad(obs, (0, forecaster_obs_dim - len(obs)))
    window = np.tile(obs_padded, (OBS_WINDOW, 1))  # (21, obs_dim)
    feat = torch.tensor(window, dtype=torch.float32).unsqueeze(0)
    cidx = torch.tensor([CAT_TO_IDX[category]], dtype=torch.long)
    with torch.no_grad():
        out = forecaster_net(feat, cidx)
    d_hat   = float(max(0.0, out["demand"].item()))
    p_waste = float(torch.sigmoid(out["waste_logit"]).item())
    return d_hat, p_waste


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
                           ("root", "MyFreshnessClassifier-root.mlmodel")]:
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
    category: str           # "leafy" | "root" | "fruit" | "herbs"
    freshness: float
    inventory_ratio: float  # availableQuantity / 100
    base_price: float
    competitor_ref_price: float
    days_to_restock: float = 3.0
    prev_delta: float = 0.0
    demand_7d: float = 0.0  # 0 means unknown → uses demand_ratio=1.0


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
```

- [ ] **Step 3.3: Run the tests**

```bash
cd pricing-sidecar
python -m pytest tests/test_new_models.py -v 2>&1 | tail -30
```

Expected: all 3 tests PASS.

- [ ] **Step 3.4: Smoke-test sidecar manually**

```bash
cd pricing-sidecar
uvicorn main:app --port 8000 &
sleep 2
curl -s http://localhost:8000/health | python3 -m json.tool
curl -s -X POST http://localhost:8000/forecast \
  -H "Content-Type: application/json" \
  -d '{"state_vector":{"productId":"x","category":"leafy","freshness":0.82,"inventory_ratio":0.35,"base_price":50000,"competitor_ref_price":47000,"days_to_restock":2.0,"prev_delta":0.0,"demand_7d":0.0}}' \
  | python3 -m json.tool
kill %1
```

Expected: health shows `ddqn_loaded: true, forecaster_loaded: true`; forecast returns `demand7d` float and `pWaste` in [0, 1].

- [ ] **Step 3.5: Commit**

```bash
cd /Users/macos/f2t
git add pricing-sidecar/main.py pricing-sidecar/tests/test_new_models.py
git commit -m "feat(sidecar): upgrade to DDQN+Forecaster from dynamic-pricing-final"
```

---

## Task 4: DemandForecastingModule (NestJS)

**Files:**
- Create: `f2t-backend/src/modules/demand-forecasting/dto/forecast.dto.ts`
- Create: `f2t-backend/src/modules/demand-forecasting/demand-forecasting.service.ts`
- Create: `f2t-backend/src/modules/demand-forecasting/demand-forecasting.service.spec.ts`
- Create: `f2t-backend/src/modules/demand-forecasting/demand-forecasting.controller.ts`
- Create: `f2t-backend/src/modules/demand-forecasting/demand-forecasting.module.ts`

- [ ] **Step 4.1: Write the failing test**

Create `f2t-backend/src/modules/demand-forecasting/demand-forecasting.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { REDIS_CLIENT } from '@common/redis/redis.constants';
import { DemandForecastingService } from './demand-forecasting.service';

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
};
const mockHttp = { post: jest.fn() };
const mockConfig = { get: jest.fn((key: string, def?: string) => def ?? '') };

describe('DemandForecastingService', () => {
  let service: DemandForecastingService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DemandForecastingService,
        { provide: HttpService, useValue: mockHttp },
        { provide: ConfigService, useValue: mockConfig },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();
    service = module.get(DemandForecastingService);
  });

  it('returns cached forecast when Redis hit', async () => {
    mockRedis.get.mockResolvedValue(
      JSON.stringify({ demand7d: 12.5, pWaste: 0.15, computedAt: new Date().toISOString() }),
    );
    const result = await service.getForecast('prod123', 'leafy', 0.85, 0.3, 50000, 47000, 2, 0.0);
    expect(result.demand7d).toBe(12.5);
    expect(mockHttp.post).not.toHaveBeenCalled();
  });

  it('calls sidecar and caches on Redis miss', async () => {
    mockRedis.get.mockResolvedValue(null);
    mockHttp.post.mockReturnValue(
      of({ data: { productId: 'prod123', demand7d: 18.0, pWaste: 0.08 } }),
    );
    const result = await service.getForecast('prod123', 'leafy', 0.85, 0.3, 50000, 47000, 2, 0.0);
    expect(mockHttp.post).toHaveBeenCalledWith(
      expect.stringContaining('/forecast'),
      expect.objectContaining({ state_vector: expect.objectContaining({ productId: 'prod123' }) }),
      expect.any(Object),
    );
    expect(mockRedis.set).toHaveBeenCalledWith(
      'df:v1:prod123',
      expect.any(String),
      'EX',
      21600,
    );
    expect(result.demand7d).toBe(18.0);
  });

  it('returns zeros on sidecar error', async () => {
    mockRedis.get.mockResolvedValue(null);
    mockHttp.post.mockImplementation(() => { throw new Error('sidecar down'); });
    const result = await service.getForecast('prod123', 'leafy', 0.85, 0.3, 50000, 47000, 2, 0.0);
    expect(result.demand7d).toBe(0);
    expect(result.pWaste).toBe(0);
  });
});
```

Run test (expected FAIL — service not created yet):

```bash
cd f2t-backend
npx jest src/modules/demand-forecasting/demand-forecasting.service.spec.ts --no-coverage 2>&1 | tail -10
```

Expected: `Cannot find module './demand-forecasting.service'`.

- [ ] **Step 4.2: Create DTOs**

Create `f2t-backend/src/modules/demand-forecasting/dto/forecast.dto.ts`:

```typescript
export class ForecastResultDto {
  productId!: string;
  demand7d!: number;
  pWaste!: number;
  computedAt!: string;
}
```

- [ ] **Step 4.3: Implement DemandForecastingService**

Create `f2t-backend/src/modules/demand-forecasting/demand-forecasting.service.ts`:

```typescript
import { Injectable, Inject, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@common/redis/redis.constants';
import { ForecastResultDto } from './dto/forecast.dto';

const CACHE_TTL_SECONDS = 6 * 3600; // 6 hours
const CACHE_KEY = (productId: string) => `df:v1:${productId}`;

@Injectable()
export class DemandForecastingService {
  private readonly logger = new Logger(DemandForecastingService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async getForecast(
    productId: string,
    category: string,
    freshness: number,
    inventoryRatio: number,
    basePrice: number,
    competitorRefPrice: number,
    daysToRestock: number,
    prevDelta: number,
  ): Promise<ForecastResultDto> {
    const key = CACHE_KEY(productId);
    try {
      const cached = await this.redis.get(key);
      if (cached) return JSON.parse(cached) as ForecastResultDto;
    } catch (e) {
      this.logger.warn(`Redis get failed: ${String(e)}`);
    }

    const sidecarUrl = this.config.get<string>('PRICING_SIDECAR_URL', 'http://localhost:8000');
    try {
      const resp$ = this.http.post<ForecastResultDto>(
        `${sidecarUrl}/forecast`,
        {
          state_vector: {
            productId,
            category,
            freshness,
            inventory_ratio: inventoryRatio,
            base_price: basePrice,
            competitor_ref_price: competitorRefPrice,
            days_to_restock: daysToRestock,
            prev_delta: prevDelta,
            demand_7d: 0.0,
          },
        },
        { timeout: 8000 },
      );
      const { data } = await firstValueFrom(resp$);
      const result: ForecastResultDto = {
        productId: data.productId,
        demand7d: data.demand7d,
        pWaste: data.pWaste,
        computedAt: new Date().toISOString(),
      };
      await this.redis.set(key, JSON.stringify(result), 'EX', CACHE_TTL_SECONDS);
      return result;
    } catch (e) {
      this.logger.warn(`Forecast sidecar error for ${productId}: ${String(e)}`);
      return { productId, demand7d: 0, pWaste: 0, computedAt: new Date().toISOString() };
    }
  }

  async invalidate(productId: string): Promise<void> {
    await this.redis.del(CACHE_KEY(productId));
  }
}
```

- [ ] **Step 4.4: Run the test — expect PASS**

```bash
cd f2t-backend
npx jest src/modules/demand-forecasting/demand-forecasting.service.spec.ts --no-coverage 2>&1 | tail -15
```

Expected: `Tests: 3 passed, 3 total`.

- [ ] **Step 4.5: Create controller**

Create `f2t-backend/src/modules/demand-forecasting/demand-forecasting.controller.ts`:

```typescript
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from '@modules/products/schemas/product.schema';
import { Farm, FarmDocument } from '@modules/farms/schemas/farm.schema';
import { FreshnessCache, FreshnessCacheDocument } from '@modules/dynamic-pricing/schemas/freshness-cache.schema';
import { DemandForecastingService } from './demand-forecasting.service';

@ApiTags('demand-forecasting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('demand-forecasting')
export class DemandForecastingController {
  constructor(
    private readonly service: DemandForecastingService,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Farm.name) private farmModel: Model<FarmDocument>,
    @InjectModel(FreshnessCache.name) private freshnessCacheModel: Model<FreshnessCacheDocument>,
  ) {}

  @Get('forecast/:productId')
  @ApiOperation({ summary: 'Get 7-day demand forecast for a product' })
  @ApiResponse({ status: 200, description: 'Forecast result' })
  async getForecast(@Param('productId') productId: string) {
    const product = await this.productModel.findById(productId)
      .select('farmId category pricePerUnit availableQuantity').lean();
    if (!product) return { demand7d: 0, pWaste: 0 };

    const farm = await this.farmModel.findById(product.farmId)
      .select('restockSchedule').lean();
    const scheduleItem = farm?.restockSchedule?.find(
      (s: { category: string }) => s.category === product.category
    );
    const daysToRestock = scheduleItem?.intervalDays ?? 5;

    const cache = await this.freshnessCacheModel.findOne({ productId: new Types.ObjectId(productId) }).lean();
    const freshness = cache?.medianScore ?? 0.7;

    return this.service.getForecast(
      productId,
      product.category,
      freshness,
      Math.min((product.availableQuantity ?? 0) / 100, 2.0),
      product.pricePerUnit,
      product.pricePerUnit * 0.95,
      daysToRestock,
      0.0,
    );
  }

  @Get('farm/:farmId/forecasts')
  @ApiOperation({ summary: 'Get forecasts for all products in a farm' })
  @ApiResponse({ status: 200, description: 'Array of forecast results' })
  async getFarmForecasts(@Param('farmId') farmId: string) {
    const products = await this.productModel
      .find({ farmId: new Types.ObjectId(farmId), status: 'available' })
      .select('_id category pricePerUnit availableQuantity').lean();

    const farm = await this.farmModel.findById(farmId).select('restockSchedule').lean();
    const productIds = products.map((p) => p._id);
    const caches = await this.freshnessCacheModel.find({ productId: { $in: productIds } }).lean();
    const cacheMap = new Map(caches.map((c) => [c.productId.toString(), c.medianScore]));

    return Promise.all(
      products.map((p) => {
        const scheduleItem = farm?.restockSchedule?.find(
          (s: { category: string }) => s.category === p.category
        );
        const freshness = cacheMap.get(p._id.toString()) ?? 0.7;
        return this.service.getForecast(
          p._id.toString(),
          p.category,
          freshness,
          Math.min((p.availableQuantity ?? 0) / 100, 2.0),
          p.pricePerUnit,
          p.pricePerUnit * 0.95,
          scheduleItem?.intervalDays ?? 5,
          0.0,
        );
      }),
    );
  }
}
```

- [ ] **Step 4.6: Create module**

Create `f2t-backend/src/modules/demand-forecasting/demand-forecasting.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { Product, ProductSchema } from '@modules/products/schemas/product.schema';
import { Farm, FarmSchema } from '@modules/farms/schemas/farm.schema';
import { FreshnessCache, FreshnessCacheSchema } from '@modules/dynamic-pricing/schemas/freshness-cache.schema';
import { DemandForecastingService } from './demand-forecasting.service';
import { DemandForecastingController } from './demand-forecasting.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Farm.name, schema: FarmSchema },
      { name: FreshnessCache.name, schema: FreshnessCacheSchema },
    ]),
    HttpModule,
  ],
  controllers: [DemandForecastingController],
  providers: [DemandForecastingService],
  exports: [DemandForecastingService],
})
export class DemandForecastingModule {}
```

- [ ] **Step 4.7: Register in AppModule**

In `f2t-backend/src/app.module.ts`, add:

```typescript
import { DemandForecastingModule } from './modules/demand-forecasting/demand-forecasting.module';
// ...
imports: [
  // ... existing
  DemandForecastingModule,
]
```

- [ ] **Step 4.8: Build and run tests**

```bash
cd f2t-backend
npm run build 2>&1 | tail -10
npx jest src/modules/demand-forecasting/ --no-coverage 2>&1 | tail -15
```

Expected: build succeeds, 3 tests pass.

- [ ] **Step 4.9: Commit**

```bash
cd f2t-backend
git add src/modules/demand-forecasting/ src/app.module.ts
git commit -m "feat(demand-forecasting): new module — sidecar /forecast + Redis 6h cache"
```

---

## Task 5: DynamicPricingModule — Upgrade State Vector

Build the full 10-dim state vector by pulling data from `DemandForecastingService`, the last `PriceOverride`, and farm's `restockSchedule`.

**Files:**
- Modify: `f2t-backend/src/modules/dynamic-pricing/dynamic-pricing.service.ts`
- Modify: `f2t-backend/src/modules/dynamic-pricing/dynamic-pricing.module.ts`

- [ ] **Step 5.1: Write a failing test for buildStateVector helpers**

In `f2t-backend/src/modules/dynamic-pricing/dynamic-pricing.service.spec.ts`, add the following test (keep existing tests, add this block):

```typescript
describe('computeDaysToRestock', () => {
  it('returns full interval when no lastRestockedAt', () => {
    // Service method: computeDaysToRestock(schedule, category, lastRestockedAt?)
    // schedule: [{ category: 'vegetables', intervalDays: 4 }]
    // lastRestockedAt: undefined → returns intervalDays
    const days = (service as any).computeDaysToRestock(
      [{ category: 'vegetables', intervalDays: 4 }],
      'vegetables',
      undefined,
    );
    expect(days).toBe(4);
  });

  it('returns remaining days when restocked today', () => {
    const now = new Date();
    const days = (service as any).computeDaysToRestock(
      [{ category: 'vegetables', intervalDays: 4 }],
      'vegetables',
      now,
    );
    expect(days).toBeCloseTo(4, 0);
  });

  it('returns default 5 when no schedule entry for category', () => {
    const days = (service as any).computeDaysToRestock([], 'herbs', undefined);
    expect(days).toBe(5);
  });
});
```

Run (expected FAIL):

```bash
cd f2t-backend
npx jest src/modules/dynamic-pricing/dynamic-pricing.service.spec.ts --no-coverage 2>&1 | tail -15
```

Expected: `TypeError: (service as any).computeDaysToRestock is not a function`.

- [ ] **Step 5.2: Add `computeDaysToRestock` private method to DynamicPricingService**

In `f2t-backend/src/modules/dynamic-pricing/dynamic-pricing.service.ts`, add private method:

```typescript
private computeDaysToRestock(
  schedule: { category: string; intervalDays: number }[],
  category: string,
  lastRestockedAt?: Date,
): number {
  const item = schedule.find((s) => s.category === category);
  const intervalDays = item?.intervalDays ?? 5;
  if (!lastRestockedAt) return intervalDays;
  const daysSince = (Date.now() - lastRestockedAt.getTime()) / 86_400_000;
  const remaining = intervalDays - (daysSince % intervalDays);
  return Math.max(0, remaining);
}
```

- [ ] **Step 5.3: Run test — expect PASS**

```bash
cd f2t-backend
npx jest src/modules/dynamic-pricing/dynamic-pricing.service.spec.ts --no-coverage 2>&1 | tail -15
```

Expected: all tests pass.

- [ ] **Step 5.4: Inject DemandForecastingService into DynamicPricingService**

In `dynamic-pricing.service.ts`, add to constructor:

```typescript
import { DemandForecastingService } from '@modules/demand-forecasting/demand-forecasting.service';

// In constructor:
private demandForecastingService: DemandForecastingService,
```

- [ ] **Step 5.5: Upgrade `generateSuggestionForProduct`**

Replace the existing `stateVector` building block in `generateSuggestionForProduct` with the full 10-dim version:

```typescript
// Fetch farm for restockSchedule
const farmDoc = await this.farmModel.findById(product.farmId).select('restockSchedule').lean();
const schedule = (farmDoc?.restockSchedule as { category: string; intervalDays: number }[]) ?? [];

// Fetch last non-expired override for prev_delta
const lastOverride = await this.overrideModel
  .findOne({ productId: product._id, status: { $in: ['accepted', 'shadow', 'pending_review'] } })
  .sort({ computedAt: -1 })
  .select('deltaPct')
  .lean();
const prevDelta = lastOverride ? (lastOverride.deltaPct ?? 0) / 100 : 0.0;

// Resolve product.lastRestockedAt (field may be undefined for older products)
const productFull = await this.productModel
  .findById(product._id)
  .select('lastRestockedAt availableQuantity category pricePerUnit')
  .lean();
const daysToRestock = this.computeDaysToRestock(
  schedule,
  product.category,
  productFull?.lastRestockedAt,
);

// Demand forecast (Redis-cached 6h)
const agentCat = this.mapProductCategoryToAgent(product.category);
const inventoryRatio = Math.min((product.availableQuantity ?? 0) / 100, 2.0);
const competitorRefPrice = await this.getCompetitorRefPrice(product.farmId, product.category, product.pricePerUnit);
const forecast = await this.demandForecastingService.getForecast(
  product._id.toString(),
  agentCat,
  freshness,
  inventoryRatio,
  product.pricePerUnit,
  competitorRefPrice,
  daysToRestock,
  prevDelta,
);

const stateVector = {
  productId: product._id.toString(),
  category: agentCat,
  freshness,
  inventory_ratio: inventoryRatio,
  base_price: product.pricePerUnit,
  competitor_ref_price: competitorRefPrice,
  days_to_restock: daysToRestock,
  prev_delta: prevDelta,
  demand_7d: forecast.demand7d,
};
```

- [ ] **Step 5.6: Upgrade `runPricingTick`**

In `runPricingTick`, replace the state_vectors building loop with:

```typescript
// Pre-fetch all farms for restockSchedule
const farmIds = [...new Set(products.map((p) => p.farmId.toString()))];
const farms = await this.farmModel.find({ _id: { $in: farmIds } }).select('_id restockSchedule').lean();
const farmScheduleMap = new Map(
  farms.map((f) => [f._id.toString(), (f.restockSchedule as { category: string; intervalDays: number }[]) ?? []])
);

// Pre-fetch last overrides for prev_delta per product
const lastOverrides = await this.overrideModel.aggregate([
  { $match: { productId: { $in: productIds }, status: { $in: ['accepted', 'shadow', 'pending_review'] } } },
  { $sort: { computedAt: -1 } },
  { $group: { _id: '$productId', deltaPct: { $first: '$deltaPct' } } },
]);
const prevDeltaMap = new Map(
  lastOverrides.map((o: { _id: Types.ObjectId; deltaPct: number }) => [o._id.toString(), (o.deltaPct ?? 0) / 100])
);

// Pre-fetch lastRestockedAt for products
const productsWithRestock = await this.productModel
  .find({ _id: { $in: productIds } })
  .select('_id lastRestockedAt')
  .lean();
const lastRestockedMap = new Map(
  productsWithRestock.map((p) => [p._id.toString(), p.lastRestockedAt as Date | undefined])
);

// Build state_vectors with demand forecast
const state_vectors = await Promise.all(
  products.map(async (p) => {
    const cache = cacheMap.get(p._id.toString());
    const freshness = cache?.medianScore ?? this.computeWeibullFallback(p.category);
    const agentCat = this.mapProductCategoryToAgent(p.category);
    const compKey = `${p.farmId}:${p.category}`;
    const competitorRefPrice = competitorPairCache.get(compKey) ?? p.pricePerUnit * 0.95;
    const schedule = farmScheduleMap.get(p.farmId.toString()) ?? [];
    const daysToRestock = this.computeDaysToRestock(schedule, p.category, lastRestockedMap.get(p._id.toString()));
    const prevDelta = prevDeltaMap.get(p._id.toString()) ?? 0.0;
    const inventoryRatio = Math.min((p.availableQuantity ?? 0) / 100, 2.0);

    const forecast = await this.demandForecastingService.getForecast(
      p._id.toString(), agentCat, freshness, inventoryRatio,
      p.pricePerUnit, competitorRefPrice, daysToRestock, prevDelta,
    );

    return {
      productId: p._id.toString(),
      category: agentCat,
      freshness,
      inventory_ratio: inventoryRatio,
      base_price: p.pricePerUnit,
      competitor_ref_price: competitorRefPrice,
      days_to_restock: daysToRestock,
      prev_delta: prevDelta,
      demand_7d: forecast.demand7d,
    };
  })
);
```

- [ ] **Step 5.7: Update DynamicPricingModule to import DemandForecastingModule**

In `dynamic-pricing.module.ts`:

```typescript
import { DemandForecastingModule } from '@modules/demand-forecasting/demand-forecasting.module';

@Module({
  imports: [
    // ... existing imports
    DemandForecastingModule,
  ],
  // ...
})
```

- [ ] **Step 5.8: Build and run all tests**

```bash
cd f2t-backend
npm run build 2>&1 | tail -10
npm test -- --passWithNoTests 2>&1 | tail -20
```

Expected: build succeeds, all existing tests pass.

- [ ] **Step 5.9: Commit**

```bash
cd f2t-backend
git add src/modules/dynamic-pricing/dynamic-pricing.service.ts \
        src/modules/dynamic-pricing/dynamic-pricing.module.ts
git commit -m "feat(dynamic-pricing): upgrade to 10-dim obs with demand forecast + restock schedule"
```

---

## Task 6: End-to-End Smoke Test

Verify the full pipeline: sidecar → NestJS → MongoDB → Redis.

- [ ] **Step 6.1: Start Redis (if not running)**

```bash
redis-server --daemonize yes
redis-cli ping
```

Expected: `PONG`.

- [ ] **Step 6.2: Start sidecar**

```bash
cd /Users/macos/f2t/pricing-sidecar
uvicorn main:app --port 8000 --log-level info &
sleep 3
curl -s http://localhost:8000/health | python3 -m json.tool
```

Expected: `ddqn_loaded: true, forecaster_loaded: true`.

- [ ] **Step 6.3: Start NestJS backend**

```bash
cd /Users/macos/f2t/f2t-backend
npm run start:dev &
sleep 5
```

- [ ] **Step 6.4: Seed and get auth token**

```bash
npm run seed
# Login as farm owner (credentials in CONTEXT.md)
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"farm@example.com","password":"password123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")
echo "TOKEN: $TOKEN"
```

- [ ] **Step 6.5: Set restock schedule for farm**

```bash
curl -s -X PATCH http://localhost:3000/api/farms/me/restock-schedule \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"schedule":[{"category":"vegetables","intervalDays":4},{"category":"fruits","intervalDays":5},{"category":"herbs","intervalDays":3}]}' \
  | python3 -m json.tool
```

Expected: farm object returned with `restockSchedule` populated.

- [ ] **Step 6.6: Trigger pricing tick and check suggestions**

```bash
# Trigger manual tick (admin token needed)
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")

curl -s -X POST http://localhost:3000/api/dynamic-pricing/run-tick \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool

# Check suggestions
curl -s http://localhost:3000/api/dynamic-pricing/suggestions \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected: `{ items: [...], total: N }` with at least one suggestion containing `targetPrice`, `deltaPct` in [-30%, +20%].

- [ ] **Step 6.7: Verify Redis caching**

```bash
redis-cli keys "df:v1:*" | head -5
redis-cli ttl "$(redis-cli keys 'df:v1:*' | head -1)"
```

Expected: keys exist, TTL near 21600 (6 hours).

- [ ] **Step 6.8: Check demand forecast endpoint**

```bash
# Get a productId from seed data
PRODUCT_ID=$(curl -s "http://localhost:3000/api/products?limit=1" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['items'][0]['id'])")

curl -s "http://localhost:3000/api/demand-forecasting/forecast/$PRODUCT_ID" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected: `{ productId, demand7d, pWaste, computedAt }` with `pWaste` in [0, 1].

- [ ] **Step 6.9: Final commit**

```bash
cd /Users/macos/f2t
git add -A
git commit -m "test(integration): verify dynamic-pricing + demand-forecasting e2e smoke"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|---|---|
| Farm self-reports restock schedule | Task 1 |
| Redis cache for demand forecasts (6h) | Task 2, Task 4 |
| Sidecar uses absolute checkpoint paths | Task 3 (`_DP_ROOT`) |
| New sidecar loads SharedMLPDuelingQNet (obs_dim=10) | Task 3 |
| New sidecar adds `/forecast` endpoint backed by ForecasterLSTM | Task 3 |
| DemandForecastingModule — new NestJS module | Task 4 |
| DynamicPricingModule — uses full 10-dim state vector | Task 5 |
| `days_to_restock` from farm.restockSchedule | Task 1 + Task 5 |
| `prev_delta` from last PriceOverride | Task 5 |
| `demand_7d` flows into demand_ratio + inv_coverage_7d | Task 3 + Task 5 |
| End-to-end smoke test | Task 6 |

### Placeholder scan

No TBD, TODO, or "similar to" references found. All code blocks are complete.

### Type consistency

- `schedule: { category: string; intervalDays: number }[]` used consistently in Task 1 DTO and Task 5 service
- `ForecastResultDto.demand7d / pWaste` match sidecar `ForecastResponse` field names
- `CACHE_KEY` helper is defined once and used in `getForecast` and `invalidate`
- `compute_mask(freshness, category)` called with both args in Task 3 (matches reward.py signature)
