import json
import math
import numpy as np
from typing import Literal

Category = Literal["leafy", "root", "fruit", "herbs"]


class CrossDemandModel:
    def __init__(self, params: dict) -> None:
        self._params = params

    @classmethod
    def from_json(cls, path: str) -> "CrossDemandModel":
        with open(path) as f:
            return cls(json.load(f))

    def beta_at_freshness(self, f: float, category: Category) -> float:
        """β(f) = β_old + (β_fresh − β_old) × f
        β_fresh = β_base + spread/2  (less elastic when fresh)
        β_old   = β_base − spread/2  (more elastic when old)
        """
        p = self._params[category]
        beta_base = p["beta"]
        spread = p.get("spread", 1.5)
        beta_fresh = beta_base + spread / 2
        beta_old = beta_base - spread / 2
        f_clip = float(np.clip(f, 0.0, 1.0))
        return beta_old + (beta_fresh - beta_old) * f_clip

    def demand_rate(
        self,
        category: Category,
        price: float,
        freshness: float,
        comp_price: float,
        dow: int,
    ) -> float:
        """Expected demand units/day (deterministic)."""
        p = self._params[category]
        beta = self.beta_at_freshness(freshness, category)
        price_ratio = price / p["ref_price"]
        fresh_mult = 0.4 + 0.6 * float(np.clip(freshness, 0.0, 1.0))
        comp_mult = (comp_price / price) ** p.get("gamma", 0.30) if price > 0 else 1.0
        sin_w = p.get("sin_weekly", 0.0)
        cos_w = p.get("cos_weekly", 0.0)
        season = 1.0 + sin_w * math.sin(2 * math.pi * dow / 7) + cos_w * math.cos(2 * math.pi * dow / 7)
        season = max(0.0, season)
        return p["base_demand"] * (price_ratio ** beta) * fresh_mult * comp_mult * season

    def sample_demand(
        self,
        category: Category,
        price: float,
        freshness: float,
        inv: int,
        comp_price: float,
        dow: int,
        rng: np.random.Generator,
    ) -> int:
        lam = self.demand_rate(category, price, freshness, comp_price, dow)
        return min(int(rng.poisson(lam)), inv)
