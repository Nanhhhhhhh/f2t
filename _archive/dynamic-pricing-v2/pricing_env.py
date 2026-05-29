"""
pricing_env.py — single-product pricing MDP with a 5-dim Markovian observation.

One category per environment instance (agents are independent in v2). A 168-step
week of hourly decisions. The observation contains ONLY signals the f2t app can
actually provide in production.

Observation (5-dim):
    [0] freshness          ∈ [0,1]
    [1] inventory_ratio    ∈ [0,1]   (inv / 100, capped)
    [2] competitor_ratio             (market_price / base_price, clipped [0.5,2.0])
    [3] sin(2π·hour/24)
    [4] cos(2π·hour/24)

Action: index into ACTIONS = [-0.30, -0.15, 0.0, +0.10, +0.20] (price delta).

Reward (no urgency multiplier — that was the v1 bug):
    reward = margin·sold − waste_penalty·waste − holding_cost
    holding_cost = max(0, 0.7 − freshness) · inventory · hold_coef
    waste fires when freshness < waste_threshold and inventory > 0

Competitor effect (NOT from Dunnhumby — explicit cross-store substitution model):
    demand ×= (market_price / our_price) ** comp_sensitivity
    → if we are pricier than the local market, customers leave; if cheaper, we gain.
    This makes the competitor_ratio observation causally meaningful. Documented
    as a modeling assumption in JOURNAL.md.
"""
import numpy as np

ACTIONS = [-0.30, -0.15, 0.0, +0.10, +0.20]
N_ACTIONS = 5
OBS_DIM = 5

# Restock schedule + quantity per category (ported from dynamic_pricing_1)
RESTOCK_HOURS = {
    "leafy": [0, 72, 120],
    "root":  [0, 96],
    "fruit": [0, 48, 96, 144],
    "herbs": [0, 24, 48, 72, 96, 120, 144],
}
# Restock sized to be clearable within the high-freshness window of each cycle.
# Fast-spoiling, lower-demand fruit/herbs are stocked lighter — a rational farm
# does not over-order produce that spoils before it can sell (otherwise no pricing
# policy can avoid the loss; verified: every policy was negative at the old levels).
RESTOCK_QTY = {
    "leafy": (30, 90), "root": (30, 90),
    "fruit": (4, 10), "herbs": (8, 18),
}

_WEIBULL = {  # for per-episode randomization reference
    "leafy": (0.97, 1.8), "root": (0.995, 0.6),
    "fruit": (0.985, 1.2), "herbs": (0.96, 2.1),
}


class PricingEnv:
    def __init__(self, category, demand_model, freshness_model,
                 hold_coef=0.04, hold_threshold=0.5, waste_threshold=0.35,
                 comp_sensitivity=0.3, reward_scale=1.0, randomize=False,
                 deterministic=True, move_penalty=0.15, stochastic_env=False):
        assert category in demand_model.AGENTS
        self.cat = category
        self.demand = demand_model
        self.fresh = freshness_model
        self.hold_coef = hold_coef
        self.hold_threshold = hold_threshold      # holding cost is 0 above this freshness
        self.waste_threshold = waste_threshold    # tracked for reporting (not in reward)
        self.comp_sensitivity = comp_sensitivity
        self.reward_scale = reward_scale
        self.randomize = randomize
        # Small cost per unit of deviation from base price. Breaks the near-ties
        # between adjacent deltas (−15% vs −30%) so the argmax is seed-stable, and
        # is economically real (frequent large swings are poor UX / menu cost).
        self.move_penalty = move_penalty
        # deterministic=True uses expected demand (lam capped at inv) instead of a
        # Poisson sample. This removes UNOBSERVED reward noise so the Q-function
        # converges precisely; the optimal risk-neutral policy is unchanged.
        self.deterministic = deterministic
        # stochastic_env=False removes the remaining Q-target noise sources (random
        # restock quantity, within-episode market drift) so the MDP is effectively
        # deterministic and independent seeds converge to the SAME Q/policy. Both
        # are also more realistic (a farm restocks a planned qty; the local market
        # is ~stable within an hour). State coverage still comes from random resets.
        self.stochastic_env = stochastic_env
        self.episode_len = 168
        self.ref_price = demand_model.ref_price[category]
        self.cost = demand_model.cost[category]
        # other categories held at their ref price (cross-elasticity term → neutral)
        self._other_prices = {c: demand_model.ref_price[c] for c in demand_model.AGENTS}
        self._orig_beta = demand_model.params[category]["beta"]
        self._orig_base = demand_model.params[category]["base_demand"]
        self._orig_weibull = _WEIBULL[category]

    # ------------------------------------------------------------------
    def reset(self):
        self.t = 0
        # Full-range starts (DQN replay decorrelates; no curriculum needed)
        self.inv = float(np.random.randint(10, 120))
        self.f = float(np.random.uniform(0.20, 1.0))
        self.base_price = self.ref_price
        self.market_price = self.ref_price * float(np.random.uniform(0.80, 1.20))

        if self.randomize:
            # ±30% elasticity, ±20% base demand, ±20% Weibull per episode
            self.demand.params[self.cat]["beta"] = self._orig_beta * np.random.uniform(0.7, 1.3)
            self.demand.params[self.cat]["base_demand"] = self._orig_base * np.random.uniform(0.8, 1.2)
            lam, k = self._orig_weibull
            self.fresh.params[self.cat] = (lam * np.random.uniform(0.8, 1.2),
                                           k * np.random.uniform(0.85, 1.15))
        return self._obs()

    def _obs(self):
        return np.array([
            self.f,
            min(self.inv / 100.0, 1.0),
            float(np.clip(self.market_price / self.base_price, 0.5, 2.0)),
            np.sin(2 * np.pi * self.t / 24),
            np.cos(2 * np.pi * self.t / 24),
        ], dtype=np.float32)

    # ------------------------------------------------------------------
    def step(self, action_idx):
        delta = ACTIONS[int(action_idx)]
        our_price = self.base_price * (1.0 + delta)
        our_price = float(np.clip(our_price, self.cost * 1.05, self.ref_price * 2.0))

        # Expected demand from the fitted model, then competitor substitution effect
        prices = dict(self._other_prices)
        prices[self.cat] = our_price
        lam = self.demand.expected(prices, {self.cat: self.f,
                                            **{c: 0.8 for c in self._other_prices if c != self.cat}},
                                   self.t, self.cat)
        comp_effect = (self.market_price / max(our_price, 1e-6)) ** self.comp_sensitivity
        lam = max(lam * comp_effect, 0.0)
        if self.deterministic:
            sold = min(lam, float(self.inv))          # expected demand (fractional OK)
        else:
            sold = float(min(int(np.random.poisson(lam)), int(self.inv)))

        self.inv -= sold
        self.f = self.fresh.decay(self.f, self.cat)

        # Reward normalized by ref_price so all categories train at the same scale
        # (herbs ref=4.54 was 4× leafy and destabilized shared DQN hyperparameters).
        #   margin_ratio = (price − cost) / ref_price   → revenue per unit in ref terms
        #   holding      = continuous carrying cost of aging stock (units × staleness)
        # No binary waste term (that discontinuity swamped the gradient); waste is
        # still tracked below for reporting only.
        margin_ratio = (our_price - self.cost) / self.ref_price
        holding = max(0.0, self.hold_threshold - self.f) * self.inv * self.hold_coef
        move_cost = self.move_penalty * abs(delta)
        raw_reward = margin_ratio * sold - holding - move_cost
        reward = raw_reward / self.reward_scale
        waste = 1 if (self.f < self.waste_threshold and self.inv > 0) else 0

        # Restock at scheduled hours (blend freshness, don't reset to 1.0)
        if self.t > 0 and self.t in RESTOCK_HOURS[self.cat]:
            lo, hi = RESTOCK_QTY[self.cat]
            if self.stochastic_env:
                qty = np.random.randint(lo, hi)
                f_new = float(np.random.uniform(0.85, 1.0))
            else:
                qty = (lo + hi) // 2          # planned restock quantity
                f_new = 0.925                  # mean delivery freshness
            if self.inv + qty > 0:
                self.f = (self.inv * self.f + qty * f_new) / (self.inv + qty)
            self.inv += qty

        # Market price: drift within episode only if stochastic_env (else stable —
        # set once at reset, so competitor_ratio is a clean observed state feature)
        if self.stochastic_env:
            self.market_price = float(np.clip(
                self.market_price * (1 + np.random.normal(0, 0.01)),
                self.ref_price * 0.70, self.ref_price * 1.30))

        self.t += 1
        done = self.t >= self.episode_len
        info = {"sold": sold, "waste": waste, "price": our_price,
                "raw_reward": raw_reward, "delta": delta}
        return self._obs(), reward, done, info
