# Dynamic Pricing for F2T — Design, Training, and Evaluation

*A thesis writeup compiled from the engineering journals of `dynamic-pricing-v2`
(the deployed discrete Double-DQN) and `dynamic-pricing-continuous` (the TD3
comparison). It documents the full research arc: why the original multi-agent
system was rebuilt, how the deployed model was designed and trained, an honest
account of what "convergence" was and was not achieved, and a controlled
experiment that tested — and rejected — a continuous-action alternative.*

---

## 1. Problem and motivation

F2T (Farm-to-Table) sells perishable produce. The economic tension is that fresh
produce loses value continuously, so a price that is optimal today is wrong
tomorrow. The dynamic-pricing module recommends, per product, a price delta that
trades off two objectives: **maximize revenue** and **minimize waste** (stock that
spoils unsold). The model runs as a Python sidecar; the NestJS backend sends a
product state vector per pricing tick and receives a recommended price.

## 2. Why the original system was rebuilt

The first implementation was a hybrid **QMIX (value-based) + MADDPG
(policy-based)** multi-agent system with a 16-dimensional observation and a
GRU-based recurrent agent per category. Investigation found five disqualifying
problems:

1. **Recurrent Q-learning never converged.** The GRU agent suffered the classic
   "stale hidden state" instability; evaluation reward swung by ±700 and the
   action distribution drifted 25–48 % between evaluations even at ε = 0.02.
2. **Cold-start fragility.** A recurrent policy depends on accumulated hidden
   state. Every sidecar restart zeroed it, producing "+20 % for everything" until
   it warmed up — days, on an hourly tick.
3. **The cooperative QMIX mixer was unnecessary.** In production each product is
   priced independently (the sidecar cannot observe other categories' live
   prices), so the mixing network added training instability for zero deployment
   value.
4. **A reward bug inverted the objective.** An "urgency multiplier" (×1.9 at low
   freshness) made *holding* aging stock more rewarding than discounting it — the
   opposite of the waste-reduction goal.
5. **Over half the observation was fake in production.** `ctr_proxy` was
   hardcoded to 0.1, `add_to_cart_rate` defaulted to 0.3, `hours_to_restock` was
   hardcoded to 24, the "price history" was just the base price repeated, and the
   MADDPG multiplier `M` and `demand_ratio` had no real source.

## 3. What was kept: the Dunnhumby demand model

The data foundation was sound and was retained. The demand model is fitted from
the **Dunnhumby "Complete Journey"** retail dataset (2.6 M transactions, 92 K
products, 36.8 M causal rows) by `preprocess.py`, which:

- reconstructs the shelf price (adds discounts back before elasticity fitting);
- filters outliers by IQR per category × unit;
- fits **genuine quantity elasticities** (correcting a circular
  `SALES_VALUE / baskets` bias that had pinned all elasticities near +1);
- fits a cross-price elasticity matrix and Fourier seasonality.

The resulting per-category own-price elasticities (β) are economically sane and
pass four validation gates (negative β; discount raises demand; low freshness
lowers demand; cross-price effects active):

| Category | β (own-price) | Interpretation |
|---|---|---|
| leafy | −2.449 | highly elastic |
| root | −0.457 | inelastic |
| fruit | −1.126 | moderately elastic |
| herbs | −1.348 | moderately elastic |

A simulation environment wraps this demand model with Weibull freshness decay and
a per-category restock schedule. A **competitor substitution term** —
`demand ×= (market_price / our_price)^0.3` — is added so the single competitor
observation is causally meaningful; this is an explicit modeling assumption, not
fitted from Dunnhumby (which has no competitor data).

## 4. The deployed model: stateless Double-DQN

The rebuild replaces the recurrent multi-agent design with four **independent,
stateless Double-DQN agents** (one per category). The design rationale:

- **Markovian state ⇒ no recurrence.** Freshness + inventory + market position is
  a sufficient statistic for the pricing decision; a fresh, high-stock product
  should be priced the same regardless of how it got there. Dropping the GRU
  removes the instability *and* the cold-start problem — a stateless network
  returns identical output for identical input, on every restart.
- **Independent agents.** Production prices each product independently, so the
  cooperative mixer is dropped entirely.

**Observation (5-dim, every dimension genuinely available in production):**

| Index | Feature | Source |
|---|---|---|
| 0 | freshness ∈ [0,1] | CoreML classifier median |
| 1 | inventory_ratio ∈ [0,1] | availableQuantity / 100 |
| 2 | competitor_ratio = competitor_price / base_price (clip [0.5, 2.0]) | nearest-farms `$geoNear` |
| 3 | sin(2π·hour/24) | clock |
| 4 | cos(2π·hour/24) | clock |

**Action:** five discrete deltas `[−30 %, −15 %, 0 %, +10 %, +20 %]` (asymmetric —
biased toward clearance discounts over opportunistic markups; matches the safety
layer). **Network:** MLP 5 → 128 → 128 → 5 (Q-value per action). **Reward (per
step):** `margin_ratio·sold − holding_cost − move_penalty·|delta|`, where
`margin_ratio = (price−cost)/ref_price` (normalizes scale across categories), the
holding cost penalizes carrying aging stock, and the move penalty discourages
large price swings (a menu-cost term). No urgency multiplier.

Three engineering choices were decisive in making training stable:

1. **Stateless MLP** (Markovian state — no recurrence).
2. **Train on expected demand, not Poisson samples.** The Poisson sampling noise
   was unobserved and put a variance floor on the Q-targets; using expected demand
   removes it without changing the optimal risk-neutral policy.
3. **Reward normalized by reference price, and restock sized to be clearable.**
   This fixed a 4× scale imbalance (herbs' high reference price had dominated
   shared hyperparameters) and a structural oversupply of fast-spoiling fruit
   (where restock had exceeded what could be sold before spoiling, making every
   policy lose money).

## 5. Results (deployed checkpoints, deterministic evaluation)

Each agent beats every fixed-action baseline and the hand-written freshness rule.
The learned policies are economically interpretable:

| Category | Policy (low → high freshness) | DQN revenue | Best baseline |
|---|---|---|---|
| leafy | −30 % (f ≤ 0.45) → 0 % (fresh) | **46.9** | 34.5 (rule) |
| root | 0 % (f ≤ 0.3) → +20 % | **59.8** | 43.7 (rule) |
| fruit | −30 % → +10 % | **−50.4** | −55.9 (rule) |
| herbs | −30 % (always; very fast decay) | **−1.7** | −22.0 (rule) |

- **leafy** (highly elastic): discounts aging stock hard, holds when fresh — a
  textbook freshness-graded policy; the clearest ML win.
- **root** (inelastic, slow decay): holds price high, discounts only critical
  stock — matches the economic optimum and beats the rule.
- **herbs** (fast decay): clears aggressively; a clear win over the rule and the
  only category whose formal grid-stability check fired (at step 145 000).
- **fruit** (low demand, fast spoil): structurally marginal — every policy is
  loss-making; the DQN is simply the least-bad option.

The real ML value concentrates in **leafy and herbs**, where freshness-timed
discounting matters most; root and fruit are close to what a simple rule achieves.

## 6. Convergence — an honest account

"Convergence" was tested rigorously by training each category from independent
random seeds and comparing the resulting policies (a converged policy should be
seed-independent). The findings, stated plainly:

- **Value converges.** Across seeds, episode reward is tight (e.g. leafy 48/49/50,
  root 59/57/61 — a spread of ±1–2). This is the standard RL convergence
  criterion, and it holds.
- **The exact action does *not* converge to a unique policy.** A 3-seed test gave
  exact-action agreement of only 46 % (leafy), 50 % (root), 28 % (fruit), 56 %
  (herbs). The disagreement is concentrated at **economically-tied states** —
  e.g. for fresh elastic produce, 0 % and −15 % yield nearly identical profit, so
  the argmax flips between near-equivalent choices.
- **The behaviorally important part converges.** Every seed discounts aggressively
  when stock is critical (the "clear before waste" reflex); only the fresh-stock
  price is seed-dependent, and that variation is revenue-neutral.
- **Deployment is deterministic regardless.** A *fixed* trained checkpoint returns
  identical output for identical input — verified — so the deployed system is
  reproducible even though the *training* optimum is not globally unique.

An attempt to *force* a unique policy via an ε-tolerance tie-break achieved 100 %
seed agreement but collapsed the policy to "do nothing" (0 % everywhere) — it
gamed the metric and was rejected. The conclusion: only value-convergence is
honestly achievable, because the reward surface is genuinely flat at indifferent
states.

## 7. Controlled experiment: continuous-action TD3

A natural hypothesis was that the discrete action *buckets* caused the
non-uniqueness, and that a continuous action (one real-valued delta) would fix it.
This was tested with a **TD3 (Twin-Delayed DDPG)** agent — a deterministic
continuous-control actor — built in `dynamic-pricing-continuous/`. Everything
except the action space (observation, reward, dynamics, the four independent
agents) was held identical to the DQN so the comparison isolates discrete-vs-
continuous.

Both models were evaluated on **identical episodes** (same seeds → same initial
states and dynamics; the discrete agent's action index is mapped to its delta and
fed to the same continuous environment):

| Category | DQN revenue | TD3 revenue | DQN δ-spread (3 seeds) | TD3 δ-spread |
|---|---|---|---|---|
| leafy | 47.1 | 45.7 | 0.027 | 0.024 (tie) |
| root | 56.7 | 54.5 | 0.044 | 0.063 (DQN better) |
| fruit | −62.0 | −73.7 | 0.061 | 0.136 (DQN better) |
| herbs | −20.7 | −28.2 | 0.049 | 0.134 (DQN better) |

**TD3 lost on both axes:** revenue (DQN ≥ TD3 in all four categories) and
cross-seed convergence (TD3's delta-spread was *worse* for three of four). The
verdict was **DQN stays deployed**.

**The valuable finding.** The hypothesis was wrong, and the experiment shows
*why*: the non-uniqueness is caused by **flat reward surfaces at indifferent
states, not by discretization.** A continuous actor has infinite resolution to
land anywhere in a flat region, so independent seeds spread out *more* (in delta
terms) than the discrete DQN, which at least snaps to one of five buckets — the
discretization acts as a mild quantizer that *limits* the spread. This empirically
refutes "the discrete action space is the cause," and confirms that the
limitation is intrinsic to the problem's economics (equal-profit prices exist at
many states). No action representation removes it; value-convergence — which the
DQN already has — is the achievable and correct bar.

## 8. Conclusions

- The deployed model is the **stateless Double-DQN**: value-converged,
  deterministic/restart-safe, and beating every baseline in simulation. It fixes
  all five failures of the original QMIX+MADDPG system.
- Its limits are stated honestly: results are **in-simulation** against a
  Dunnhumby-fitted demand model with a synthetic competitor term, so they
  demonstrate soundness rather than predict a specific real-world lift; the exact
  policy is not uniquely converged (only value-converged), which the controlled
  TD3 experiment shows to be intrinsic, not fixable by switching to continuous
  control.
- Recommended operation is **advisory mode** (the farmer accepts or rejects each
  suggestion) with the hard safety layer always bounding outputs, and a re-fit on
  real F2T sales once that data is collected.
