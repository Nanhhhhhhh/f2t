# Report 5 — Dynamic Pricing Final: System Architecture

> Codebase: `dynamic-pricing-final/`  
> Tích hợp với: `f2t-backend/`, `pricing-sidecar/`

---

## 1. Tổng quan hệ thống

```
┌─────────────────────────────────────────────────────────────────┐
│                    dynamic-pricing-final                        │
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│  │  MarketEnv   │   │ ForecasterLSTM│   │  DDQN Agent      │   │
│  │  (simulation)│   │ (supervised) │   │  (RL policy)     │   │
│  │              │──▶│              │──▶│                  │   │
│  │ generates    │   │ predicts     │   │ selects          │   │
│  │ training data│   │ demand7d &   │   │ price delta      │   │
│  │              │   │ pWaste       │   │ action           │   │
│  └──────────────┘   └──────────────┘   └──────────────────┘   │
│                                                ▼               │
│                                      ┌──────────────────┐      │
│                                      │  Safety Layer    │      │
│                                      │  (hard rules)    │      │
│                                      └──────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  pricing-sidecar   │
                    │  FastAPI :8000     │
                    │  (inference only)  │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │   f2t-backend      │
                    │   NestJS :3000     │
                    └────────────────────┘
```

---

## 2. Các thành phần chính

### 2.1 MarketEnv — Môi trường giả lập

```
File: src/env/market_env.py
```

Mô phỏng thị trường rau củ quả với 4 categories song song trong một episode 91 ngày:

```
State per category: {price, freshness, inventory, prev_delta, comp_price}

Mỗi timestep (1 ngày):
  1. Agent set delta → price mới
  2. Demand sample từ Poisson(demand_rate)
  3. Freshness decay: f_{t+1} = f_t × λ_cat
  4. Waste check: f < 0.5 → inventory = 0
  5. Restock theo schedule (4–7 ngày/lần)

Episode: 91 ngày (~3 tháng mùa vụ)
```

**Restock schedule:**
| Category | Mỗi N ngày | Số lượng |
|----------|-----------|---------|
| leafy | 4 | 4–9 units |
| root | 7 | 20–45 units |
| fruit | 5 | 10–22 units |
| herbs | 3 | 4–9 units |

Freshness delivery ngẫu nhiên `Uniform(0.70, 1.0)`. Nếu `f_delivery < 0.70` → batch bị reject.

---

### 2.2 CrossDemandModel — Mô hình cầu

```
File: src/env/demand.py
Params: data/params/demand_params.json
```

Demand rate (units/day) theo mô hình kinh tế lượng:

```
demand_rate = base_demand
            × (p/p_ref)^β(f)       ← price elasticity, freshness-dependent
            × (0.4 + 0.6f)         ← freshness quality multiplier
            × (p_comp/p)^γ         ← cross-price elasticity
            × seasonal(dow)        ← Fourier weekly pattern
```

Demand thực tế: `sold ~ min(Poisson(rate), inventory)`

---

### 2.3 Observation Vector (10 chiều)

Cầu nối giữa env state và model input. Được tính giống nhau ở cả training (MarketEnv._build_obs) và inference (sidecar._build_obs):

```
obs[0]: freshness              ∈ [0, 1]
obs[1]: inventory_ratio        = min(qty/100, 2.0)
obs[2]: sin(2π×dow/7)          ← day-of-week encoding
obs[3]: cos(2π×dow/7)
obs[4]: days_to_restock/30     ∈ [0, 1]
obs[5]: demand_ratio           = (demand_7d/7) / BASE_DEMAND[cat], clipped [0,3]
obs[6]: prev_delta             ∈ [-0.30, 0.20]
obs[7]: comp_ratio             = comp_price/base_price, clipped [0.5, 2.0]
obs[8]: days_to_waste/14       ∈ [0, 1]
obs[9]: inv_coverage/3         = (qty/demand_7d) / 3, clipped [0, 1]
```

---

### 2.4 ForecasterLSTM — Demand Forecaster

```
File: src/forecaster/model.py
Checkpoint: checkpoints/forecaster_v4_best.pt
```

Supervised model, train trước DDQN:

```
Input:  obs_window (21, obs_dim) + category_idx
Output: demand_7d (float), pWaste (float ∈ 0-1)

Architecture: LSTM(128, 2 layers) → concat cat_embed(8)
              → demand_head (linear)
              → waste_head (MLP)

Training data: 3,000 episodes × 4 categories từ MarketEnv simulation
               với 3 policies: random, markdown, static
```

Vai trò: cung cấp `demand_7d` cho obs[5], giúp DDQN có thông tin về nhu cầu tương lai khi quyết định giá.

---

### 2.5 SharedMLPDuelingQNet — DDQN Policy

```
File: src/rl/network.py
Checkpoint: checkpoints/rl_shared_best.pt
```

RL agent quyết định price delta:

```
Input:  obs (10,) + category_id (int)
Output: Q-values (11,) → argmax → delta ∈ [-30%,+20%]

Architecture: cat_embed(8) concat obs → shared MLP(128,128)
              → V-stream(1) + A-stream(11)
              → Q = V + A - mean(A)

Training: DDQN với per-category replay buffers (4 × 50K)
          Reward: revenue + waste + alignment + premium + smoothness
```

---

### 2.6 Safety Layer

```
File: pricing-sidecar/safety.py
```

5 hard rules apply **sau** DDQN, không trainable:

```
1. Cost floor:      price ≥ base × 0.55
2. Price ceiling:   price ≤ base × 2.0
3. Max tick:        price ∈ [base×0.70, base×1.20]
4. Freshness force: f < 0.4 → price ≤ base × 0.75
5. Min viable:      price ≥ 1,000 VNĐ
```

---

## 3. Training Pipeline

```
Phase 1: Generate synthetic data
  ├── Chạy MarketEnv × 3,000 episodes × 4 categories
  ├── 3 random policies: random, markdown, static
  └── Output: data/processed/train.parquet, val.parquet

Phase 2: Train ForecasterLSTM (supervised)
  ├── Input: obs_window (21, obs_dim) từ simulation
  ├── Labels: demand_7d (7-day inventory decrease sum)
  │           waste_7d (binary: freshness < 0.5 trong 7 ngày)
  ├── Loss: Huber(demand) + 4×FocalLoss(waste)
  ├── Optimizer: Adam lr=3e-4, CosineAnnealingLR, early-stop patience=5
  └── Output: checkpoints/forecaster_v4_best.pt

Phase 3: Train DDQN (reinforcement learning)
  ├── Optionally load ForecasterEncoder để augment obs
  │   (obs_dim += 2 nếu dùng forecaster features)
  ├── Run MarketEnv episodes
  ├── Per step: compute obs → act (ε-greedy) → env.step → reward
  ├── Store transitions vào 4 per-category buffers
  ├── Train step: sample balanced batch → DDQN update
  ├── Sync target network định kỳ
  └── Output: checkpoints/rl_shared_best.pt

Phase 4 (optional): Warm-start
  ├── File: scripts/warmstart_train.py
  └── Khởi tạo network từ behavior cloning trước khi RL training
      → giúp hội tụ nhanh hơn
```

---

## 4. Inference Pipeline (production)

```
pricing-sidecar/main.py

Startup:
  ├── Load SharedMLPDuelingQNet từ checkpoints/rl_shared_best.pt
  ├── Load ForecasterLSTM từ checkpoints/forecaster_v4_best.pt
  └── Load CoreML models: fruit.mlmodel, root.mlmodel

Per request (POST /predict):
  for each product in state_vectors:

    1. _build_obs(sv) → obs[10]
    2. compute_mask(freshness, category) → mask[11]
    3. ddqn_net(obs, cat_id, mask) → Q[11]
    4. action_idx = argmax(Q)
    5. delta = CANDIDATES[action_idx]
    6. target_price = base_price × (1 + delta)
    7. final_price, was_clipped = apply_safety(target_price, ...)
    8. tag = "fresh/aging/critical" from freshness

  return PriceOverride[] per product

Separate (POST /forecast):
  1. _build_obs(sv, demand_7d=0.0) → obs[10]
  2. tile obs 21× → window (21, obs_dim)
  3. forecaster_net(window, cat_id)
  4. return demand7d, pWaste
```

---

## 5. Integration với f2t-backend

```
f2t-backend calls sidecar:

  A) PricingTickCron (mỗi giờ):
     ├── Lấy tất cả products "available" từ MongoDB
     ├── Tính freshness (FreshnessCache hoặc Weibull)
     ├── Tính competitor price (geo query 10km)
     ├── Gọi DemandForecastingService.getForecast() → Redis → /forecast
     └── Batch call POST /predict → save PriceOverride[]

  B) Freshness scan (ngay lập tức):
     ├── POST /freshness/:id/scan → base64 image → POST /freshness/classify
     ├── CoreML classify → score
     ├── Update FreshnessCache
     └── Re-run generateSuggestionForProduct() → POST /predict

  C) Frontend forecast view:
     └── GET /demand-forecasting/farm/:farmId/forecasts
         → getForecast() per product → Redis → /forecast
```

---

## 6. Data flow tổng thể

```
Farm chụp ảnh
      │
      ▼
CoreML /freshness/classify
  → score ∈ [0,1]
      │
      ▼
FreshnessCache (MongoDB)
  medianScore (thực ra là latest score)
  TTL: 6 tiếng
      │
      ├──────────────────────────────────┐
      │                                  │
      ▼                                  ▼
  Cron tick (hourly)              Frontend request
  DynamicPricingService           DemandForecastingController
      │                                  │
      ▼                                  ▼
  getCompetitorRefPrice()         competitor = price × 0.95 (gap!)
  (geo query thực)
      │                                  │
      └──────────────┬───────────────────┘
                     │
                     ▼
              Redis check [df:v1:{productId}]
              TTL: 6 tiếng
                     │
              hit ───┼─── miss
                     │         │
                     │         ▼
                     │    POST /forecast → LSTM
                     │    → demand7d, pWaste
                     │    → save Redis
                     │
                     ▼
             POST /predict → DDQN
             → targetPrice, delta_pct
             → safety_clipped, tag
                     │
                     ▼
             PriceOverride (MongoDB)
             shadow → advisory → accepted
                     │
                     ▼
             Farm UI hiển thị card gợi ý
             Farm accept/reject
             (advisory mode)
```

---

## 7. Category-aware design

Toàn bộ system được thiết kế category-aware ở nhiều tầng:

| Tầng | Mechanism |
|------|-----------|
| MarketEnv | `DAILY_DECAY`, `RESTOCK_EVERY`, `RESTOCK_QTY` per category |
| CrossDemandModel | `beta`, `spread`, `ref_price`, `gamma` per category từ JSON |
| obs[8] | `days_to_waste` dùng `DAILY_DECAY[cat]` |
| ForecasterLSTM | `cat_embed(4, 8)` concat vào prediction heads |
| DDQN | `cat_embed(4, 8)` concat vào shared trunk |
| compute_mask | HOLD_CATS vs premium cats policy |
| reward `r_target` | `freshness_target_delta(f, cat)` category-specific |
| reward `r_premium` | Chỉ apply cho fruit/root |
| Safety Rule 4 | Applied theo freshness, không phân biệt category |

---

## 8. Model versions và naming

| File | Model | Notes |
|------|-------|-------|
| `checkpoints/rl_shared_best.pt` | SharedMLPDuelingQNet | Production DDQN — shared across 4 cats |
| `checkpoints/forecaster_v4_best.pt` | ForecasterLSTM | v4 = final stable version |
| `freshnessmodels/MyFreshnessClassifier-fruit.mlmodel` | CoreML CNN | Trained on fruit images |
| `freshnessmodels/MyFreshnessClassifier-root.mlmodel` | CoreML CNN | Trained on root vegetable images |

---

## 9. Thư mục codebase

```
dynamic-pricing-final/
├── src/
│   ├── env/
│   │   ├── market_env.py      ← Simulation environment (91-day episode)
│   │   ├── demand.py          ← CrossDemandModel (econometric demand)
│   │   └── freshness.py       ← Decay model, waste threshold
│   ├── forecaster/
│   │   ├── model.py           ← ForecasterLSTM + ForecasterConfig
│   │   ├── train.py           ← Training loop, Adam + CosineAnnealing
│   │   ├── losses.py          ← Huber + FocalLoss + combined_loss
│   │   └── data.py            ← PerishableForecastDataset, generate_dataset
│   ├── rl/
│   │   ├── network.py         ← MLPDuelingQNet, SharedMLPDuelingQNet
│   │   ├── agent.py           ← DuelingDDQNAgent, MultiCatDDQNAgent
│   │   ├── reward.py          ← compute_reward, compute_mask, CANDIDATES
│   │   ├── replay.py          ← ReplayBuffer
│   │   ├── train.py           ← RL training loop
│   │   ├── warmstart.py       ← Behavior cloning warmstart
│   │   └── forecaster_encoder.py ← Augment obs với LSTM features
│   ├── mpc/
│   │   └── controller.py      ← MPC baseline (benchmark comparison)
│   └── eval/
│       └── metrics.py         ← Evaluation metrics
├── scripts/
│   ├── train_rl.py            ← Main training entry point
│   ├── warmstart_train.py     ← Warmstart + RL pipeline
│   └── run_pipeline.py        ← Full pipeline (data gen → train → eval)
└── checkpoints/
    ├── rl_shared_best.pt
    └── forecaster_v4_best.pt
```

---

## 10. Key design decisions

### 10.1 Shared network thay vì 4 networks riêng
**Decision:** 1 `SharedMLPDuelingQNet` với category embedding thay vì 4 `MLPDuelingQNet` riêng.  
**Why:** Shared network tận dụng transfer learning giữa categories (nhu cầu và freshness dynamics tương tự nhau về mặt cấu trúc). Ít tham số hơn, training nhanh hơn, balanced batch dễ implement.

### 10.2 Discrete action space (11 actions)
**Decision:** Rời rạc hóa [-30%, +20%] thành 11 bước thay vì continuous action.  
**Why:** DQN-based algorithms hoạt động tốt hơn với discrete actions. 11 mức đủ granular cho pricing decisions trong thực tế (granularity ~5%).

### 10.3 Tiled obs trong inference thay vì real time-series
**Decision:** Tile obs hiện tại 21 lần khi inference.  
**Why:** Không có per-product time-series lịch sử trong production. Đây là practical compromise — LSTM vẫn có ích vì nó học non-linear feature extraction qua nhiều obs dims, không hoàn toàn dựa vào temporal dynamics.

### 10.4 Safety layer tách khỏi reward
**Decision:** Hard rules apply post-model thay vì encode vào reward.  
**Why:** Business constraints cứng (margin, compliance) phải được đảm bảo 100%, không phải "học" → Hard constraints dễ audit và không bị agent exploit.

### 10.5 Per-category replay buffers
**Decision:** 4 buffers riêng, sample balanced batch.  
**Why:** Nếu dùng 1 buffer chung, category có nhiều data hơn sẽ dominate training → lệch policy. Balanced sampling đảm bảo mỗi category học đồng đều.

### 10.6 DDQN thay vì DQN
**Decision:** Double DQN (tách online/target cho action selection và evaluation).  
**Why:** DQN có systematic overestimation bias → policy chọn action suboptimal. DDQN giảm bias này mà không tăng computational cost đáng kể.
