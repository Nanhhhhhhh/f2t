"""
demand_model.py — CrossDemandModel (ported from dynamic_pricing_1, unchanged logic).

Poisson demand with: own-price elasticity, promo lift, Fourier seasonality,
freshness multiplier, and cross-category price effects. Fitted on Dunnhumby
(see preprocess.py). This is the simulation's ground truth for training.
"""
import json
import numpy as np

AGENTS = ["leafy", "root", "fruit", "herbs"]

# Cost as a fraction of ref_price (no cost data in Dunnhumby — standard retail margins)
_COST_RATIO = {"leafy": 0.55, "root": 0.50, "fruit": 0.58, "herbs": 0.45}

# base_demand was fitted on weekly aggregates; convert to per-tick (hourly) and
# scale by store traffic (multiple basket-sessions per hour in a real store).
HOURLY_TRAFFIC = 5.0


class CrossDemandModel:
    AGENTS = AGENTS

    def __init__(self, params: dict, E: np.ndarray):
        self.params = params
        self.E = E
        self.ref_price = {c: params[c]["ref_price"] for c in AGENTS}
        self.cost = {c: params[c]["ref_price"] * _COST_RATIO[c] for c in AGENTS}

    def sample(self, prices: dict, freshness: dict, t: int, cat: str,
               promoted: bool = False) -> int:
        """Poisson-sampled units sold for one category this tick."""
        p = self.params[cat]
        i = AGENTS.index(cat)
        log_p = np.log(prices[cat] / p["ref_price"] + 1e-9)
        own = np.exp(p["beta"] * log_p)
        promo = np.exp(p["promo_eff"]) if promoted else 1.0
        season = 1.0 + (
            p["sin_daily"]  * np.sin(2 * np.pi * t / 24) +
            p["cos_daily"]  * np.cos(2 * np.pi * t / 24) +
            p["sin_weekly"] * np.sin(2 * np.pi * t / 168) +
            p["cos_weekly"] * np.cos(2 * np.pi * t / 168))
        fresh_mult = 0.4 + 0.6 * float(freshness[cat])
        lam = p["base_demand"] * own * promo * season * fresh_mult
        for j, other in enumerate(AGENTS):
            if j != i and other in self.params:
                log_other = np.log(
                    prices.get(other, self.params[other]["ref_price"])
                    / self.params[other]["ref_price"] + 1e-9)
                lam *= np.exp(self.E[i, j] * log_other)
        return int(np.random.poisson(np.clip(lam, 0.0, 1e6)))

    def expected(self, prices: dict, freshness: dict, t: int, cat: str,
                 promoted: bool = False) -> float:
        """Expected (mean) units sold — deterministic, for analysis/eval."""
        p = self.params[cat]
        i = AGENTS.index(cat)
        log_p = np.log(prices[cat] / p["ref_price"] + 1e-9)
        own = np.exp(p["beta"] * log_p)
        promo = np.exp(p["promo_eff"]) if promoted else 1.0
        season = 1.0 + (
            p["sin_daily"]  * np.sin(2 * np.pi * t / 24) +
            p["cos_daily"]  * np.cos(2 * np.pi * t / 24) +
            p["sin_weekly"] * np.sin(2 * np.pi * t / 168) +
            p["cos_weekly"] * np.cos(2 * np.pi * t / 168))
        fresh_mult = 0.4 + 0.6 * float(freshness[cat])
        lam = p["base_demand"] * own * promo * season * fresh_mult
        for j, other in enumerate(AGENTS):
            if j != i and other in self.params:
                log_other = np.log(
                    prices.get(other, self.params[other]["ref_price"])
                    / self.params[other]["ref_price"] + 1e-9)
                lam *= np.exp(self.E[i, j] * log_other)
        return float(np.clip(lam, 0.0, 1e6))


def load_demand_model(params_path="data/demand_params.json",
                      matrix_path="data/cross_elasticity_matrix.npy") -> CrossDemandModel:
    with open(params_path) as f:
        params = json.load(f)
    E = np.load(matrix_path)
    for cat in params:
        params[cat]["base_demand"] = params[cat]["base_demand"] / 168.0 * HOURLY_TRAFFIC
    return CrossDemandModel(params, E)
