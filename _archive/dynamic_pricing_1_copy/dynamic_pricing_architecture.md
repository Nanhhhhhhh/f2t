# F2T Dynamic Pricing Module — Architecture Reference

> **Vietnamese farm-to-table iOS ecommerce app.**  
> Three integrated ML systems: Computer Vision (freshness scoring) →
> Recommendation System (SVD + re-ranker) →
> Dynamic Pricing (QMIX cooperative + MADDPG competitive).  
> This document covers the Dynamic Pricing module in full.

---

## 1. System overview

```
Camera scan (MobileNetV3-Small)
        │  freshness score f ∈ [0,1]
        ▼
freshness_cache/{skuId}   ←──────────────────────────────────────┐
        │                                                         │
        ├──► QMIX agent state obs[0]                             │
        │       (15-dim per SKU agent)                           │
        │                                                         │
        └──► RecSys item tower (FiLM conditioning)               │
                                                                  │
QMIX (cooperative, intra-vendor)                                  │
  4 SKU agents: leafy / root / fruit / herbs                     │
  GRU(64) → Q(5 actions)                                         │
  Actions: {-30%, -15%, 0%, +10%, +20%}                          │
        │                                                         │
        ▼                                                         │
MADDPG actor (competitive, inter-vendor)                         │
  Outputs vendor multiplier M ∈ [0.70, 1.30]                    │
        │                                                         │
        ▼                                                         │
Final price = base_price × M × (1 + QMIX_delta_i)              │
        │                                                         │
        ▼                                                         │
Safety layer (5 hard rules)                                      │
        │                                                         │
        ▼                                                         │
FastAPI server → Firebase RTDB prices/{skuId} ───────────────────┘
        │
        ▼
iOS app (real-time Firebase listener)
```

---

## 2. Project file structure

```
project/
├── transaction_data.csv
├── product.csv
├── causal_data.csv
│
├── preprocessing.ipynb          ← START HERE (see Section 3)
│
├── data/                        ← outputs of preprocessing
│   ├── demand_params.json       ← FINAL_PARAMS (4 categories)
│   ├── cross_elasticity_matrix.npy  ← 4×4 E matrix
│   └── demand_params_subcategory.json
│
├── env/
│   └── market_env.py            ← PettingZoo Parallel MarketEnv
│
├── models/
│   ├── demand.py                ← CrossDemandModel
│   ├── freshness.py             ← Weibull decay model
│   └── restock.py               ← restock schedule + blended freshness
│
├── phase1/
│   ├── networks.py              ← QMIXAgent (GRU) + QMIXMixer (hypernetwork)
│   ├── buffer.py                ← EpisodeReplayBuffer (complete episodes)
│   ├── runner.py                ← EpisodeRunner (collects 1 episode)
│   └── trainer.py               ← QMIXTrainer (TD loss, double Q, soft update)
│
├── phase2/
│   ├── networks.py              ← MADDPGActor + MADDPGCritic + OUNoise
│   ├── buffer.py                ← MADDPGBuffer (transition-level)
│   ├── env.py                   ← HybridPricingEnv (QMIX inside, MADDPG outside)
│   └── trainer.py               ← MADDPGTrainer (centralized critic)
│
├── train.py                     ← Phase 1 QMIX training loop
├── train_phase2.py              ← Phase 2 MADDPG training loop
├── train_phase3.py              ← Phase 3 joint fine-tuning
└── rllib_train.py               ← RLlib fallback (optional)
```

---

## 3. Preprocessing pipeline — current status and known issues

### 3.1 What the pipeline must produce

Two files that feed `CrossDemandModel` directly:

| File | Content | Used by |
|------|---------|---------|
| `data/demand_params.json` | 4-category dict with β, base_demand, ref_price, promo_eff, Fourier coefficients | `models/demand.py` |
| `data/cross_elasticity_matrix.npy` | 4×4 numpy array E[i,j] | `models/demand.py` |

### 3.2 Known issues to resolve (in priority order)

**Issue 1 — Elasticity estimation approach (highest priority) — RESOLVED**

The original notebook used `SALES_VALUE / n_baskets` as the demand metric in
log-log OLS. This is circular: `SALES_VALUE ≈ price × quantity`, so:

```
log(SALES_VALUE/baskets) ≈ log(price) + log(qty/baskets)
```

Regressing this on `log(price)` mechanically adds **+1 to every beta**, causing all
elasticities to cluster at +0.75 to +1.06 regardless of true price sensitivity.

**Fix applied:** switched to `qty_normalized / n_baskets` as the demand metric,
where `qty_normalized = QUANTITY × normalized_size` (units converted to lb-equivalents).
This gives genuine quantity elasticities. Results after fix:
leafy=−2.449, root=−0.457, fruit=−1.126, herbs=−1.348 (all negative, as required).

Category-level OLS (not product fixed-effects) — uses `cat_weekly` aggregation.
No traffic control (collinear with price variation at weekly level).

Literature fallback betas (Andreyeva et al. 2010 / USDA ERS):
```python
LITERATURE_BETAS = {
    'leafy': -1.76,
    'root':  -0.69,
    'fruit': -1.32,
    'herbs': -0.49,
}
```

Expected outcome: root_LB and fruit_LB should produce genuine OLS estimates
(~-0.3 to -1.1). leafy_LB weaker but negative. herbs uses literature.
3–4 real estimates, remainder literature overrides.

**Issue 2 — Negative promo_eff values**

Current notebook produces negative promo_eff for all categories. Promotions
must increase demand. The OLS for promo_eff is confounded by price-promo collinearity.

Fix: compute promo_eff as the log ratio of mean demand in promoted vs non-promoted
weeks, then clip to [0.0, 0.50]:
```python
promo_eff = log(mean_demand_promoted / mean_demand_non_promoted)
promo_eff = clip(promo_eff, 0.0, 0.50)
```

**Issue 3 — herbs LB price floor not respected**

After IQR filter, herbs LB still shows min=$0.05. Add a hard floor:
```python
herbs_lb = (trans_produce['category']=='herbs') & (trans_produce['final_unit']=='LB')
trans_produce = trans_produce[~(herbs_lb & (trans_produce['standard_price'] < 0.50))]
```

**Issue 4 — OUNCE unit not handled**

Two products have unit=OUNCE after size parsing. Add to `clean_final_units`:
```python
if u in ('OZ','OUNCE'): return 'LB'  # already normalised by normalize_to_lbs
```

**Issue 5 — Missing VN market adjustments before saving**

After consolidating to FINAL_PARAMS, apply Vietnamese market priors before saving:
```python
VN_BETA_SCALE   = {'leafy':1.25, 'root':1.20, 'fruit':1.30, 'herbs':1.10}
VN_DEMAND_SCALE = {'leafy':1.40, 'root':0.95, 'fruit':0.85, 'herbs':2.10}
for cat in AGENTS:
    FINAL_PARAMS[cat]['beta']        *= VN_BETA_SCALE[cat]
    FINAL_PARAMS[cat]['base_demand'] *= VN_DEMAND_SCALE[cat]
```

Rationale: Vietnamese fresh produce buyers are 20–30% more price-sensitive than
US supermarket shoppers. Vietnamese herb consumption is ~2× higher than US baseline.

### 3.3 Validation gates (all must pass before training)

The notebook's validation suite (Step 15) checks four conditions:
1. All betas negative
2. -30% price discount increases demand
3. Low freshness (f=0.15) reduces demand vs fresh (f=0.90)
4. Cross-price effects are non-zero (not the 1.0**E[i,j] bug)

**Do not proceed to Phase 1 training until all four pass.**

---

## 4. Simulation environment — MarketEnv

### 4.1 Environment specification

| Parameter | Value |
|-----------|-------|
| Type | PettingZoo Parallel API |
| Agents | 4 SKU categories: leafy, root, fruit, herbs |
| Episode length | 168 steps (1 week × 24 hours) |
| Tick | 1 simulated hour |
| `batch_mode` | `complete_episodes` — **mandatory for GRU** |

### 4.2 Agent observation vector (dim=15)

```
obs[0]    freshness f ∈ [0,1]          — Weibull decay, seeded by FreshnessModel
obs[1]    inventory / 100              — depleted each tick, reset on restock
obs[2]    CTR proxy                    — demand.pred_ctr(price, cat)
obs[3]    add-to-cart rate             — avg units per buying basket
obs[4:7]  price history [t-1,t-2,t-3] — last 3 tick prices
obs[7:10] competitor prices            — 3 reference prices (simulated)
obs[10]   MADDPG multiplier M          — 1.0 in Phase 1, real M in Phase 2+
obs[11]   hours_to_next_restock / 168  — deterministic clock feature
obs[12:16] sin/cos(hour), sin/cos(dow) — time encoding
```

### 4.3 Global state vector (dim=38) — mixer only, training only

```
[0:4]   freshness f₁…f₄
[4:8]   inventory inv₁…inv₄ (normalised)
[8:12]  current prices p₁…p₄
[12:16] demand velocities d₁…d₄
[16:20] rolling revenue 1h r₁…r₄
[20:24] waste events w₁…w₄
[24]    total platform inventory
[25]    session rate
[26]    MADDPG multiplier M
[27]    episode progress t/168
[28:32] time encoding sin/cos(hour, dow)
[32:38] padding zeros
```

### 4.4 Reward function

```
R = Σᵢ [margin_i × sold_i × ω(fᵢ)] − λ × waste_events

Urgency tiers ω(f):
  f ≥ 0.8  →  ω = 1.0   (peak fresh, premium OK)
  0.6–0.8  →  ω = 1.15  (good, hold price)
  0.4–0.6  →  ω = 1.40  (aging, discount rewarded)
  f < 0.4  →  ω = 1.90  (near-expiry, sell fast)

λ = 3.0 (start value; tune range 1.0–8.0)
waste fires when f < 0.2 AND inventory > 0 at end of tick
```

### 4.5 Freshness model (Weibull decay per category)

```python
f(t) = f₀ × exp(-(t / λ_cat) ** k_cat)

Category  λ      k      Interpretation
leafy     0.97   1.8    Fast decay, 2-3 day shelf life
root      0.995  0.6    Slow decay, 1-2 week shelf life
fruit     0.985  1.2    Medium decay
herbs     0.96   2.1    Very fast decay, daily restocking
```

### 4.6 Restock model

Restock happens at fixed scheduled hours. On restock, freshness is blended
(not reset to 1.0 — models mixing old stock with new delivery):

```python
f_new = (inv_old × f_old + qty_new × f_delivery) / (inv_old + qty_new)
```

Restock schedule:
```
leafy: hours [0, 72, 120]
root:  hours [0, 96]
fruit: hours [0, 48, 96, 144]
herbs: hours [0, 24, 48, 72, 96, 120, 144]
```

### 4.7 Curriculum (3 stages)

| Stage | Steps | inv₀ | f₀ | Advance when |
|-------|-------|------|-----|--------------|
| 1 | 0–150k | [50,80] | [0.85,1.0] | waste rate < 20% |
| 2 | 150–350k | full range | [0.5,0.95] | waste rate < 12% |
| 3 | 350–500k | full | [0.2,1.0] | 500k reached |

Domain randomization (every episode reset): ±30% elasticity, ±20% Weibull decay.

---

## 5. Phase 1 — QMIX training

### 5.1 Network architectures

**QMIXAgent** (one per SKU):
```
Input: obs (B, T, 15)
GRU(input=15, hidden=64, batch_first=True)
Linear(64, 5)
Output: Q-values (B, T, 5)
```

**QMIXMixer** (one shared):
```
Input: agent_qs (B, T, 4) + global_state (B, T, 38)
Hypernetwork layer 1: Linear(38, 4×32) → abs() → weights (B×T, 4, 32)
Hypernetwork bias 1:  Linear(38, 32)
Hidden: ELU activation
Hypernetwork layer 2: Linear(38, 32) → abs() → weights (B×T, 32, 1)
Hypernetwork bias 2:  Linear(38, 1)
Output: Q_total (B, T)

CRITICAL: abs() not ReLU — ensures ∂Q_total/∂Qᵢ ≥ 0 (monotonicity invariant)
```

### 5.2 Training configuration

```python
total_steps      = 500_000
batch_size       = 8          # complete episodes
buffer_capacity  = 500        # complete episodes (NOT transitions)
lr               = 5e-4
gamma            = 0.99
tau              = 0.005      # soft target update
grad_clip        = 10
epsilon_start    = 1.0
epsilon_end      = 0.05
epsilon_steps    = 300_000
train_every      = 1          # episode
```

**CRITICAL:** `batch_mode = "complete_episodes"` — truncating episodes breaks
GRU temporal context. Agents cannot learn pre-restock urgency without this.

### 5.3 TD loss (Double Q-learning)

```
y = Σᵢ rᵢₜ + γ × Q_total_target(s_{t+1}, argmax_a Q_online(o_{t+1}))
L = MSE(Q_total_online, y.detach())
```

Online network selects greedy action; target network evaluates it.
Reduces overestimation bias by ~15–20% vs single Q.

### 5.4 Expected results at convergence (500k steps)

| Metric | Target |
|--------|--------|
| Waste rate | 6–12% |
| Oracle ratio | ≥70% of oracle revenue |
| Action −30% frequency | 3–8% (rare, only near-expiry) |
| Action 0% frequency | 30–45% |
| TD loss | 0.05–0.20 (stable) |
| Curriculum | Stage 3 reached |

**Note on curriculum advancement:** the rolling-average waste metric has high
per-episode variance (range 0.000–0.749 observed), making it hard for the 100-episode
rolling average to consistently drop below the 0.20 Stage 2 threshold. The trained
policy achieved 6.3% waste (fixed env) despite staying in Stage 1 throughout.
If curriculum advancement is required, use a 200-episode window or lower the
Stage 1 threshold to 0.25.

### 5.5 Stress tests (run before Phase 2)

```python
# Must all pass:
test_freshness_response()    # f<0.4 + high inv → discount action (0 or 1)
test_demand_spike()          # f=0.9 + 3× demand → hold/markup action (≥2)
test_empty_inventory()       # inv=0 → hold price (no discount)
test_throughput()            # >500 steps/sec on CPU
test_smoke()                 # episode completes without error/NaN
```

---

## 6. Phase 2 — MADDPG competitive layer

**Frozen QMIX + new MADDPG actor/critic.**

### 6.1 Architecture

**MADDPGActor** (decentralised, runs per-vendor at inference):
```
Input: vendor_obs (B, 18)
MLP: 18 → 128 → 64 → 1 → Tanh
Output: M = 1.0 + 0.3 × tanh_output  ∈ [0.70, 1.30]
```

**MADDPGCritic** (centralised, training only):
```
Input: all_obs (B, 3, 18) + all_acts (B, 3, 1) → flatten → (B, 57)
MLP: 57 → 256 → 128 → 1
Output: Q(o₁…o₃, a₁…a₃)
```

### 6.2 Vendor observation vector (dim=20)

```
[0:8]   competitor prices for all 4 cats × 2 competitors (8 dims)
[8]     platform session rate
[9]     aggregate demand index
[10]    own portfolio avg freshness
[11]    own total inventory (normalised)
[12:16] own relative prices (own_prices / own_prices.mean)  ← 4 dims
[16:20] time encoding sin/cos(hour, dow)                    ← 4 dims
```

Note: spec originally stated dim=18; implementation produces 20. All network
constants in `phase2/networks.py`, `phase2/buffer.py`, `phase2/env.py` use
`VENDOR_OBS = 20`.

### 6.3 Training configuration

```python
total_steps     = 200_000
batch_size      = 256          # transitions (not episodes)
buffer_capacity = 100_000      # transitions
lr_actor        = 1e-4
lr_critic       = 1e-3
gamma           = 0.99
tau             = 0.005
exploration     = OUNoise(theta=0.15, sigma=0.20, sigma_decay=0.9999,
                          sigma_min=0.10)   # floor MUST be ≥ 0.10
```

**Buffer type: transition-level** (not episode-level — MADDPG actors are MLPs, no recurrent state).

**M clip during training: [0.90, 1.10]** — tighter than the inference range [0.70, 1.30].
Prevents actor from locking onto extreme M values before the critic can correct it.
Both `HybridPricingEnv.step()` and `MADDPGTrainer.act()` must clip to [0.90, 1.10]
during Phase 2 training. Widen to [0.80, 1.20] only after confirming M_std ≥ 0.05.

**Sigma floor failure mode:** with sigma_min=0.05 over 200k steps, sigma decays to
~2e-9 (effectively zero). The actor's deterministic output then dominates. If the actor
has a positive bias (common with tanh + reward gradient pushing toward higher M), M
collapses to the ceiling and never recovers. sigma_min=0.10 prevents this.

**Actor ceiling bias (known persistent issue):** even with sigma_min=0.10 and M clip
[0.90, 1.10], the MADDPG actor's deterministic output converges to M≈1.3 (the
architecture maximum). The training clip prevents this from affecting training, but
it means the actor has not learned to genuinely vary M based on market state.
Root cause: the actor's reward gradient (`−Q`) always favors higher M because higher
prices increase per-unit margin without the actor directly observing the resulting
demand/waste effects (those flow through QMIX, not the MADDPG reward path).

**Proper fix (future):** add a waste-rate term to the MADDPG reward:
```python
maddpg_reward = vendor_reward - alpha * waste_rate   # alpha ≈ 50
```
Or use output weight regularization (`L2` toward M=1.0) in the actor loss.
Until then, keep sigma_min=0.10 and M clip [0.90, 1.10] for safe operation;
effective M during inference is ~N(1.065, 0.046).

### 6.4 Update rule

For each vendor i:
1. Target actors produce next actions for all vendors
2. Target critic i evaluates: Q_next = critic_target_i(obs_next, next_acts)
3. y = r_i + γ × Q_next × (1 − done)
4. Critic loss: MSE(critic_i(obs, acts), y)
5. Actor loss: −critic_i(obs, acts_with_i_replaced_by_actor_i(obs_i))
6. Soft update targets τ=0.005

### 6.5 Expected results at convergence

| Metric | Target |
|--------|--------|
| M_mean | 0.95–1.05 (near-neutral) |
| M_std  | 0.06–0.12 (exploring both directions) |
| M_range in practice | [0.78, 1.22] |
| Vendor revenue | ≥85% of no-competitor baseline |

**Price war signal:** M_mean < 0.80 sustained for 10k+ steps → apply price war fix.

---

## 7. Phase 3 — Joint fine-tuning

**Both QMIX and MADDPG unfrozen. Differential learning rates.**

### 7.1 Configuration

```python
total_steps          = 200_000
lr_qmix              = 5e-5   # 10× lower than Phase 1
lr_maddpg_actor      = 5e-5   # lower than Phase 2
lr_maddpg_critic     = 5e-4
qmix_unfreeze_at     = 10_000 # gate: MADDPG adapts first
qmix_update_every    = 4      # QMIX updates less often
eval_every           = 5_000
patience             = 5      # early stop
```

**Always return the best checkpoint, not the final weights.**

**Phase 3 design note:** if MADDPG collapsed in Phase 2 (M→ceiling), do not run
the original joint fine-tuning. Instead use the frozen-MADDPG variant in
`train_phase3.py`: freeze MADDPG, fine-tune QMIX only under M~N(M_mean, 0.12)
where M_mean is the Phase 2 empirical mean. Evaluate every N *episodes* (not steps)
to avoid LCM alignment issues (LCM(168, 5000) = 105000 — only one eval in 200k steps).

**Regression baseline must match eval env:** always measure the Phase 1 baseline on
`RandomizedMarketEnv` if Phase 3 trains on `RandomizedMarketEnv`. A baseline from
`MarketEnv` is ~2× higher and will cause a false regression failure.

### 7.2 Validation before shadow mode (all three required)

1. **QMIX regression:** solo-vendor revenue ≥ 90% of Phase 1 baseline (same env class)
2. **MADDPG stability:** M stays in [0.90, 1.10] for >80% of steps
3. **Freshness urgency:** f<0.4 triggers discount within 6 steps

### 7.3 Expected results

| Metric | Target |
|--------|--------|
| Joint reward | ≥ Phase 1 baseline × 1.05 |
| QMIX regression ratio | ≥ 0.90 |
| Waste rate | ≤ 10% |
| M_mean | 0.93–1.07 |

---

## 8. Production deployment

### 8.0 Shadow mode — entry criteria and graduation

**Entry: system is ready for shadow mode with these checkpoints:**
  - QMIX:   checkpoints/phase3_best_qmix.pt   (Phase 3v2, ep=500, regression ratio=0.921)
  - MADDPG: checkpoints/maddpg_phase2_final.pt (Phase 2v2, noise active, sigma_min=0.10)
  - Fallback (M=1.0 only): checkpoints/qmix_step_420000.pt

**Shadow mode writes to** `shadow_prices/{skuId}` (see §8.1 schema).
Live prices are unaffected. Counterfactual revenue is estimated from demand model.

**Counterfactual revenue bias warning:**
The MADDPG actor has a systematic M≈1.065 markup bias (see §6.3 actor ceiling note).
A persistent 6.5% markup will inflate counterfactual revenue estimates by roughly 3–6%
(depending on elasticity). Adjust the counterfactual calculation:

```python
# In shadow mode revenue estimator — deduct M bias before comparing to live
M_bias_factor = 1.065
counterfactual_revenue = shadow_revenue / M_bias_factor  # normalise to M=1.0 equivalent
```

**Randomized-env waste rate context:**
Section 5.4 target of 6–12% waste applies to fixed-parameter env.
On RandomizedMarketEnv (±30% elasticity), 33–35% waste is expected — the agent
encounters out-of-distribution demand curves. Monitor shadow waste rate against the
fixed-env 10% threshold; it will improve as the Bayesian online adapter replaces
Dunnhumby priors with real Vietnamese transaction data.

**Graduation criteria (all three required for 7 consecutive days):**
1. Counterfactual lift ≥ +8% (bias-adjusted, see above)
2. Shadow waste rate ≤ 10%
3. Safety clip rate ≤ 40% of ticks (i.e. price change proposals are not being
   capped by the ±15% per-tick hard limit more than 40% of the time)

**Remaining architectural debt (Phase 4, not a shadow-mode blocker):**
- MADDPG reward signal needs waste penalty: `maddpg_reward += -alpha * waste_rate`
  (alpha ≈ 50) before the competitive layer can be trusted to price near-expiry
  stock correctly under competitive pressure.
- Until then: MADDPG safe to run with noise active and M clip [0.90, 1.10].

### 8.1 Firebase RTDB schema

```
prices/{skuId}
  price:     float
  updated_at: epoch
  freshness:  float

shadow_prices/{skuId}    ← shadow mode writes here
  shadow_price: float
  live_price:   float
  delta_pct:    float
  ts:           epoch

freshness_cache/{skuId}
  score:    float        ← median of last 5 scans, 6h TTL
  ts:       epoch
  n_scans:  int
  expires:  epoch

freshness_scans/{skuId}/{autoId}
  score:       float
  urgency:     string
  ts:          epoch

demand_velocity/{skuId}
  rate:  float
  ts:    epoch
```

### 8.2 Safety layer (5 rules, applied in order)

```python
# Rule 1: cost floor
price = max(price, cost × 1.05)

# Rule 2: price ceiling
price = min(price, base_price × 2.0)

# Rule 3: per-tick rate limit
price = clip(price, current × 0.85, current × 1.15)

# Rule 4: hourly rate limit
price = apply_hourly_rate_limit(sku, price)  # max ±25%/hour

# Rule 5: freshness urgency mandate (MOST IMPORTANT for F2T)
# Overrides MADDPG competitive markup — non-negotiable
if freshness < 0.4:
    price = min(price, base_price × 0.70)
```

### 8.3 Circuit breaker conditions (any one triggers kill switch)

- Safety clip rate > 50% of ticks in past hour
- Revenue drop > 30% vs same hour yesterday
- Waste rate > 25% in current rolling period
- Customer price complaints > 5 per hour
- Any action > 70% frequency (action collapse)

### 8.4 Shadow mode graduation

Run shadow mode before going live. Graduate when:
- Counterfactual revenue lift ≥ +8% sustained over 7 days
- Waste rate in shadow recommendations < 10%

Do not deploy if lift < +5%.

### 8.5 Online adaptation schedule

| Cadence | What | Risk |
|---------|------|------|
| Weekly | Demand model OLS re-fit on real sales | Low |
| Nightly | QMIX fine-tune (70% real + 30% sim, lr=1e-5) | Medium |
| Bi-weekly | MADDPG competitor update (50k steps) | Higher |

**Never update QMIX and MADDPG simultaneously. Stagger by 48 hours minimum.**

---

## 9. Hyperparameter sensitivity (tune in this order)

| Priority | Parameter | Safe start | Range | Failure mode |
|----------|-----------|-----------|-------|--------------|
| 1 | Waste penalty λ | 3.0 | 1.0–8.0 | Too high → action collapse (always -30%) |
| 2 | Gradient clip | 10.0 | 5–20 | Too high → NaN loss at ~100k steps |
| 3 | ε anneal schedule | 300k steps | 200k–400k | Too fast → policy locks early |
| 4 | Learning rate | 5e-4 | 1e-4–1e-3 | Too high → TD loss oscillates |
| 5 | Mixing embed dim | 32 | 16–64 | Low sensitivity — any value works |

---

## 10. Misbehavior diagnostic

| Symptom | Cause | Fix |
|---------|-------|-----|
| Action always -30% (>60% freq) | λ too high | Reduce λ, continue from checkpoint |
| M collapses to 0.70 floor | MADDPG price war | Reset critics + add market-share reward |
| Price oscillates ±20% every 2–3 ticks | Target network τ too high | Reduce τ from 0.005 → 0.001 |
| Freshness-price decoupled (stale at premium) | CV feed disconnected | Check Firebase freshness_cache TTL |
| NaN in TD loss | Gradient explosion | Reduce grad_clip to 5, halve lr |
| QMIX regression < 90% in Phase 3 | MADDPG gradient interfering | Halve lr_qmix, increase unfreeze gate to 20k |
| Throughput < 200 steps/sec | Demand model bottleneck | Vectorise sample_all(), use multiprocessing.Pool(8) |

---

## 11. Key numbers reference

```
QMIX:
  obs_dim=15, state_dim=38, n_agents=4, n_actions=5, hidden=64, episode_len=168

MADDPG:
  vendor_obs_dim=18, n_vendors=3, M_range=[0.70,1.30]

Freshness cache:
  TTL=6h, median of last 5 scans
  Fallback: f_prior = exp(-(age_hours/λ_cat)^k_cat)

Safety:
  cost_floor=1.05×cost, ceiling=2.0×base, tick_rate=±15%, hour_rate=±25%
  freshness_mandate: f<0.4 → price ≤ 0.70×base (overrides all)
```

## 9. Known issues and architectural debt

| Priority | Issue | Mitigation | Fix |
|----------|-------|-----------|-----|
| RESOLVED (was P0) | MADDPG actor ceiling bias — fixed by waste-rate penalty + centering regularizer + gradient clip in actor loss | sigma_min=0.10 + M clip [0.90,1.10] active | phase2/env.py: -20*waste_rate; phase2/trainer.py: clamp+0.30*(M-1)^2 |
| RESOLVED (was P1) | Curriculum never advances — CURRICULUM target_stage values were (1,2) instead of (2,3); check `curriculum < target_stage` always failed | — | train.py: fixed to [(0.20,2),(0.12,3)] + 200-ep rolling window |
| RESOLVED (was P1) | Phase 3 regression check compared RandomizedMarketEnv against MarketEnv baseline | — | Fixed in train_phase3.py (baseline=900 on same env class) |
| RESOLVED (was P2) | LCM alignment bug in train_phase2.py: save_every=10000 never fired (LCM(168,10000)=210000 > 200k) | — | train_phase2.py: episode-counter saves + best-balance checkpoint tracking |
| RESOLVED (was P2) | RandomizedMarketEnv drift bug — each reset randomized from previous episode's params | — | Fixed: originals saved in __init__ |
| RESOLVED (was P3) | VENDOR_OBS spec says 18, implementation is 20 | — | All constants updated to 20; spec note added |
