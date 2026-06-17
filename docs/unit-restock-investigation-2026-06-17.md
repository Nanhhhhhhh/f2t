# Unit consistency & restock train/serve investigation — F2T dynamic pricing

Date: 2026-06-17. Author: independent code investigation (no prior `.md`/report/thesis
used as a source; every claim is traced to source `.ts`/`.tsx`/`.py`/`.ipynb`/`.json`
or to a checkpoint loaded with torch). Where a claim is only directional (sign known,
magnitude not provable in closed form) it says so.

This file is an **output**, not a source.

---

## TL;DR

1. **Restock feature `obs[4]` has a real train/serve distribution mismatch (OOD).**
   Train only ever populates `obs[4] ∈ [0.033, 0.233]` (per-category, max = root 7/30).
   Serve can produce `obs[4] ∈ (0, 1.0]` because `intervalDays` is farmer-set in `[1,30]`.
   For `intervalDays > RESTOCK_EVERY[cat]` the value is fully out of the training support.
   **Runtime-demonstrated effect:** herbs flips from 0 % → −10 % (`obs[4]=0.70`) → −15 %
   (`obs[4]=1.0`) purely from pushing `days_to_restock` OOD. Fixable now, no retrain.

2. **`inventory_ratio` (`obs[1]`) and `inv_coverage` (`obs[9]`) are unit-contaminated.**
   Both are built from raw `availableQuantity`, whose unit is a free farmer choice
   (`kg|g|piece|bunch|box|bag|liter`). The model was trained on an abstract "unit"
   calibrated to ~15–60 inventory and ~2–7 demand/day. **Runtime-demonstrated effect:**
   the same physical aging root stall yields recommended delta −0.05 (qty=8) … −0.25
   (qty=150) — a 20-point markdown swing caused by unit choice alone.

3. **comp_ratio (obs[7]) is ALSO unit-contaminated** (initial read wrongly called it
   immune). `competitor_ref_price` averages nearby competitors' `pricePerUnit` filtered by
   category but **not by unit**, so a competitor pricing the same category by box/g mixes
   incomparable per-unit prices into the ratio. Runtime-proven flip (fruit +0.00 → +0.10).
   Fixed by same-unit competitor matching — no retrain, no docx change.

3b. **Absolute VND scale is immune.** `base_price` only enters obs via ratios; train uses
   USD ref_price but never as an absolute. No VND-vs-USD contamination. The unit problems
   are about the *physical unit* (kg/box/g), not the currency.

4. **`obs_dim` is frozen by the shipped weights** (DDQN first layer = `(128, 20)` =
   12 obs + 8 cat-embed; forecaster LSTM input = 10). Changing the *value* of an existing
   feature needs **no retrain**; changing the *number/definition* of features would.

---

## A. What the model actually eats

Obs builder: `pricing-sidecar/main.py:104-141` (`_build_obs`). 10 features:

| idx | feature | formula (file:line) | clamp / norm | unit nature |
|----|---------|---------------------|--------------|-------------|
| 0 | freshness | `np.clip(freshness,0,1)` `main.py:131` | [0,1] | dimensionless |
| 1 | inventory_ratio | `min(inventory_ratio,2.0)` `main.py:132`; `inventory_ratio = availableQuantity/100` `dynamic-pricing.service.ts:228,490` | [0,2] | **unit-contaminated** |
| 2 | sin(dow) | `main.py:133` | — | dimensionless |
| 3 | cos(dow) | `main.py:134` | — | dimensionless |
| 4 | days_to_restock | `min(days_to_restock/30,1.0)` `main.py:135` | [0,1] | **train/serve OOD** |
| 5 | demand_ratio | `(demand_7d/7)/BASE_DEMAND[cat]` `main.py:121,136` | clip[0,3] | ratio (formula immune; input inherits contamination via forecaster) |
| 6 | prev_delta | `np.clip(prev_delta,-0.30,0.20)` `main.py:137` | [-0.3,0.2] | percent |
| 7 | comp_ratio | `competitor_ref_price/current_price`, `current_price=base*(1+prev_delta)` `main.py:127-128,138` | clip[0.5,2.0] | **unit-contaminated** (competitor avg mixes units — see §E correction) |
| 8 | days_to_waste | `log(0.5/fresh)/log(decay)`, `/14` `main.py:116-119,139` | clip[0,14]/14 | freshness-only (immune) |
| 9 | inv_coverage | `(inventory_ratio*100)/max(demand_7d,1)`, `/3` `main.py:122-123,140` | clip[0,3]/3 | **unit-contaminated** |

DDQN input = these 10 **+** `[d_hat, p_waste]` from the frozen forecaster (`EXTRA_DIM=2`)
→ 12-dim (`main.py:89-91,344-348`). Output = `argmax` over `CANDIDATES`
= 11 discrete **percent** deltas `[-0.30 … +0.20]` (`main.py:358-359`,
`src/rl/reward.py` `CANDIDATES`). Output is a **percentage** price change, not absolute.

Forecaster eats the same 10-dim obs tiled 21× (`main.py:144-165`); output = `demand`
(linear regression head, **unclamped**) + `waste_logit` (`src/forecaster/model.py:31,46-48`).

**Checkpoint contract (loaded with torch):**
`rl_shared_forecaster_best.pt` → `shared.0.weight = (128, 20)` = obs(12)+embed(8);
`forecaster_v4_best.pt` → `model_cfg.obs_dim = 10`, `lstm.weight_ih_l0 = (512, 10)`.
**`obs_dim` is hard-wired into the weights.**

## B. Units / scale at TRAIN time

- Demand is sampled as an **integer quantity of units**: `sample_demand` returns
  `min(int(rng.poisson(lam)), inv)` (`src/env/demand.py:51-62`); the env decrements
  inventory by it (`src/env/market_env.py:72-73`).
- Forecaster label `demand_7d` = **sum of inventory decreases over 7 days** = quantity
  (`src/forecaster/data.py:55-61`).
- **Magnitude origin is revenue, not quantity.** `preprocessing.ipynb` STEP 8 (cell 9):
  `demand_rate = revenue / n_baskets`; `ref_demand = base_demand = mean(demand_rate)`.
  Verbatim comment: *"Use REVENUE (SALES_VALUE) not QUANTITY as demand signal … Revenue
  is unit-agnostic."* So `base_demand` (~2–7) is a revenue-derived **abstract** scale that
  the env then treats as a units/day Poisson rate.
- `ref_price` = mean standardised shelf price from Dunnhumby **US** data (USD per
  normalised unit), ~$1–4.5 — `demand_params.json` (`leafy 1.48, root 1.06, fruit 2.05,
  herbs 4.54`) + notebook STEP 5/8. **Not VND.**

Net: train lives in price ≈ USD 1–4.5, inventory ≈ abstract "units" 15–60
(`market_env.py:32` `integers(15,60)`), demand ≈ abstract 2–7/day.

## C. How production builds each feature

- `competitor_ref_price`: avg nearby competitor `pricePerUnit` (VND) via `$geoNear`,
  fallback `ownPrice*0.95` (`dynamic-pricing.service.ts:84-124`).
- `inventory_ratio = min(availableQuantity/100, 2.0)` (`...service.ts:228,490`).
- `days_to_restock = computeDaysToRestock(schedule, cat, lastRestockedAt)`
  (`...service.ts:71-82`): `intervalDays` from `farm.restockSchedule` (default 5),
  `remaining = intervalDays - (daysSince % intervalDays)`, `max(0, …)`.
- `demand_7d`: **model output, fed back as model input** — `getForecast` calls
  `/forecast` which returns the forecaster's `d_hat` (`demand-forecasting.service.ts:22-74`,
  `...service.ts:254-263`). It is **not** real sales history. (Circular dependency:
  forecaster output → `demand_ratio`/`inv_coverage` obs → DDQN.)
- `prev_delta`: last override `deltaPct/100` (`...service.ts:240,463`).
- `base_price = pricePerUnit` (VND).

## D. Product unit

- `Product.unit` enum: `['kg','g','piece','bunch','box','bag','liter']`
  (`products/schemas/product.schema.ts:70-74`). Free choice.
- Frontend form: free `Select` of those 7 (`components/products/product-form.tsx:188-196`),
  `availableQuantity` a free numeric 0–100000 (`:43-46`), price in VND (`:34`).
  **No conversion to a "model unit", no display of any normalisation.**
- The state vector sent to the sidecar contains **no `unit` field**
  (`...service.ts:265-275,503-513`). The model is blind to which unit a number is in.

## E. Immune vs contaminated (with numbers)

**Immune** (ratio / percent / [0,1]): freshness[0], sin/cos[2,3], prev_delta[6],
days_to_waste[8] (freshness only). `demand_ratio[5]`'s *formula*
is immune (output ÷ base), but its *input* `demand_7d` inherits inventory contamination
because the forecaster reads contaminated `obs[1]/obs[9]`.

**§E CORRECTION — comp_ratio[7] is NOT immune.** Initial read called it immune ("VND/VND").
That is wrong. `comp_ratio = competitor_ref_price / current_price`, and
`competitor_ref_price` (`getCompetitorRefPrice`, `dynamic-pricing.service.ts:109-120`) is
the **average of nearby competitors' `pricePerUnit` filtered by `category` + `status` but
NOT by `unit`**. So the numerator can be a VND/box or VND/g price while the denominator is
the own VND/kg price → the ratio mixes per-different-unit prices. At train the competitor
price is `ref_price × U(0.85,1.15)` (`market_env.py:37`) — same scale/unit as own, so
`comp_ratio ∈ ~[0.71,1.64]` centred on 1.0. **Runtime-proven flip:** own fruit 65000/kg,
true same-unit comp 0.62 → delta **+0.00**; a competitor pricing the same category by box
(250000) drags comp_ratio to 1.67 → **+0.10** (spurious markup). A per-gram competitor
drags it down → spurious markdown. State-dependent like the others, but flips occur.

**Contaminated:** `inventory_ratio[1]` and `inv_coverage[9]`. Both derive from raw
`availableQuantity`, unit-arbitrary. Runtime proof (real shipped DDQN+forecaster, root,
fresh=0.62, same physical stall):

| availableQuantity | inv_ratio | inv_cov | recommended delta |
|---|---|---|---|
| 8  | 0.080 | 0.133 | **−0.05** |
| 30 | 0.300 | 0.500 | −0.15 |
| 150 | 1.500 | 1.000 | **−0.25** |

A farmer entering "8 boxes" vs "150 kg" for the *same* perishing pile gets a 20-point
different markdown. (At high freshness the action is pinned at +0.20 and does not flip,
so the effect is state-dependent — but the obs values are always contaminated.)

## F. Restock train vs serve

- **Train** (`market_env.py:12,133,151`): `days_to_next = RESTOCK_EVERY[cat] - (t %
  RESTOCK_EVERY[cat])`, `RESTOCK_EVERY = {leafy:4, root:7, fruit:5, herbs:3}`.
  `obs[4] = min(days_to_next/30, 1) ∈ [1/30, R/30]`:
  leafy [0.033,0.133], root [0.033,0.233], fruit [0.033,0.167], herbs [0.033,0.100].
  Discrete, narrow, never 0, never > 0.233.
- **Serve** (`...service.ts:71-82`, `main.py:135`): `intervalDays ∈ [1,30]`
  (`farms/schemas/farm.schema.ts:32` `min:1,max:30`) → `obs[4] ∈ (0, 1.0]`.
  `intervalDays > RESTOCK_EVERY[cat]` ⇒ `obs[4] > 0.233` = fully OOD; can reach 1.0
  (≈ 4× the train max).
- **No linear gate**: `obs[4]` goes straight into the first `nn.Linear(obs_dim+embed,
  hidden)` of the MLP (`src/rl/network.py:61-62,75`). No coefficient bounds its effect.
- **Quantified at runtime** (shipped weights, fresh=0.85, inv_ratio=0.4):

  | cat | dtr=1..R (in-dist) | dtr=21 | dtr=30 |
  |---|---|---|---|
  | herbs | delta 0.000 | **−0.100** | **−0.150** |
  | root/fruit | +0.200 | +0.200 | +0.200 |
  | leafy | 0.000 | 0.000 | 0.000 |

  Direction is clear: large `days_to_restock` (allowed by schema) drives obs[4] into an
  unseen region; at least herbs is demonstrably flipped to a spurious markdown. For other
  categories the argmax happened not to move in the sampled states — state-dependent, not
  guaranteed safe.

---

## Root cause

- **Restock:** serve normalises with the same `/30` divisor but feeds raw farmer
  `days_to_restock ∈ (0,30]`, while training only ever produced `days_to_next ∈ [1,R]`,
  `R ≤ 7`. The `min(x/30,1)` clamp caps at 1.0 but does **not** restrict to the train
  support `[1/30, R/30]`. → distribution mismatch / OOD.
- **Inventory:** `availableQuantity/100` bakes the farmer's arbitrary unit into the obs;
  the model learned a single abstract unit. No unit field travels with the number, so the
  scale is uncorrectable from inside the obs without a per-unit calibration the system does
  not have. The fully-correct fix needs either retraining on real unit semantics or a real
  per-unit sales signal.

---

## Phase 2 — Decision & retrain/docx matrix

Two real defects, both fixed without retraining:

### Restock (OOD)
Clamp `days_to_restock` to the per-category training horizon `[1, RESTOCK_EVERY[cat]]`
at the obs boundary. The `min(x/30,1)` form is untouched.

### Inventory (unit contamination + OOD) — revenue-based + per-category calibration
Verified on the shipped model (not just argued):
- Train inventory is tiny (leafy/herbs ~3, fruit ~12, root ~23 → `obs[1] ∈ [0.03, 0.42]`),
  so raw `availableQuantity/100` (production 0.6–1.5) is grossly OOD **and** unit-dependent.
- Express inventory by **monetary value** `inv_value = availableQuantity × pricePerUnit`
  (unit-invariant) and rescale into the train scale:
  `inv_norm = inv_value × S_cat`, `S_cat = TRAIN_INV_MEAN[cat] / REF_INV_VALUE[cat]`.
  `obs[1] = min(inv_norm/100, 2.0)`; `inv_coverage` uses `inv_norm`.
- **Why no retrain:** `obs_dim`, the feature definition and the weights are unchanged; only
  the feature *value* is moved back into the distribution the model already learned (same
  principle as the restock clamp). `demand_7d`/`obs[5]` are not touched → no new contamination.
- **Runtime proof:** carrot stock entered as `120 kg @28000` vs `120000 g @28` (identical
  value) → **identical** `obs[1]=0.2749`, `obs[9]=0.3055`, **identical action_idx=3**
  (pre-fix: `obs[1]` 1.2 vs 2.0). Production-scale stocks now land in `obs[1] ∈ [0.03,0.45]`
  instead of saturating the clamp; under the old OOD inventory the policy was systematically
  over-discounting (e.g. fresh-0.62 fruit −0.30 across the board → realistic 0.00).

### comp_ratio (unit contamination) — same-unit competitor matching
`getCompetitorRefPrice` now filters competitor products to the **same `unit`** as the own
product (`dynamic-pricing.service.ts`), so it averages comparable per-unit prices; the
existing `ownPrice*0.95` fallback covers the no-same-unit-competitor case (benign, ~1.0,
in-distribution). Revenue/value does **not** help here — these are per-unit *prices*, which
are only comparable at the same unit. The `runPricingTick` competitor cache key now includes
`unit`. No obs/formula change → no retrain, **no docx change**.

| Fix | De-units | Retrain? | Touches docx formula? |
|---|---|---|---|
| Restock clamp | n/a (OOD) | **No** | **No** (form `min(x/30,1)` still literally true; optional 1-sentence clarification) |
| Inventory revenue+calibrate | **Yes** | **No** | **Yes** — `inv_ratio` and `inv_coverage` definitions change (see list below) |
| comp_ratio same-unit filter | **Yes** | **No** | **No** (obs formula unchanged; only competitor selection narrows to same unit) |

**Retrain verdict: NOT required for either fix.** `obs_dim` stays 12. If a future change
altered the *number* of features it would require retraining — that did not happen here.

## Phase 3 — Implementation & verification

Code:
- `pricing-sidecar/main.py`: restock clamp (`RESTOCK_EVERY`); revenue-calibrated inventory
  (`_inventory_norm`, calibration JSON load, `obs[1]`/`inv_coverage` from `inv_norm`);
  `available_quantity` added to `ProductStateVector` and both endpoints.
- `pricing-sidecar/inventory_calibration.json` + `pricing-sidecar/calibrate_inventory.py`
  (reproducible per-category `S_cat`; train means from simulating the frozen env, reference
  values from the canonical catalog).
- `f2t-backend/.../dynamic-pricing.service.ts` + `demand-forecasting.service.ts`: send raw
  `available_quantity` on `/predict` and `/forecast`.
- `f2t-backend/.../dynamic-pricing.service.ts` `getCompetitorRefPrice`: same-`unit` filter on
  the competitor query; `runPricingTick` competitor cache key now keyed by `(farmId,
  category, unit)`.

Tests (all green):
- `tests/test_restock_clamp.py` (13), `tests/test_inventory_revenue.py` (9) — pass.
- Checkpoint suites (`test_smoke_load`, `test_forecaster_integration`, `test_new_models`,
  e2e `TestPredict`) pass in isolation.
- Backend `dynamic-pricing.service.spec.ts` (10) pass, incl. a new assertion that the
  `/predict` state vector carries `available_quantity`, and a new test that
  `getCompetitorRefPrice` only averages same-unit competitors. No net-new ESLint errors.
- Pre-existing unrelated failures (documented): sidecar global-`torch.load`-mock leak,
  stale `dqn_loaded` key, image-decode e2e; backend `vegetables` enum (fixed in the spec we
  touched) and a demand-forecasting Redis-miss test (fails identically at baseline).

## Remaining limitations (for the thesis author — prose, not auto-edited into the docx)

1. **Inventory calibration is centre-anchored.** `S_cat` maps the *mean* production
   inventory value to the *mean* train inventory level (same convention as `ref_demand` in
   preprocessing). It corrects scale and unit, not the full distribution shape; products far
   from the category mean still sit off-centre (but inside the clamps).
2. **`S_cat` depends on the catalog.** It is calibrated once from the current price/stock
   regime (`calibrate_inventory.py`) and committed like `demand_params.json`. It should be
   recomputed if the catalogue's pricing or stocking scale shifts materially.
3. **Out-of-domain categories.** honey/eggs/dairy/mushrooms/grains have no trained agent and
   only map to `root`; their inventory value (and price) can still distort. This is a
   pre-existing category-mapping limitation, separate from the unit fix.
4. **`demand_7d` is still the model's own output fed back as an input** (circular), not real
   sales. The inventory fix does not change this; making `demand_7d` real-sales-based would
   require redefining `obs[5]`/`obs[9]` consistently and a retrain.
5. **Safety floor vs sub-unit pricing.** The 1000-VND absolute floor in the safety layer is
   calibrated for per-kg/per-piece prices; for per-gram pricing it clips spuriously (the
   model decision is identical — only the post-hoc safety clamp differs). Out of scope here.

## Exact docx edits required (author to apply; not auto-edited)

Line numbers from `textutil` extraction of `thesis_v7.5.docx`:
- **Line 402** `Tỉ lệ tồn kho = availableQty/100, clip [0,2]` →
  `inv_norm/100, clip [0,2]`, với `inv_norm = availableQty × pricePerUnit × S_cat[category]`.
- **Line 836** `min(availableQty / 100, 2.0)` → `min(inv_norm / 100, 2.0)`.
- **Line 859** `inv_coverage/3` — formula text unchanged, but state that `inv_coverage` now
  uses `inv_norm` (revenue-calibrated) as the inventory numerator instead of raw quantity.
- **Line 1609** `... availableQuantity được backend sử dụng trực tiếp để tính inventory_ratio`
  → `availableQuantity × pricePerUnit (giá trị tồn kho, bất biến đơn vị) được chuẩn hoá theo
  hằng số per-category S_cat rồi mới tính inventory_ratio`.
- **Restock (lines 411 / 844)** `days_to_restock/30, clip [0,1]` — **no change required**
  (the formula still holds); optional clarification: `days_to_restock` is first capped to the
  per-category restock horizon (≤ `RESTOCK_EVERY[cat]`) so the feature stays in-distribution.

