"""
freshness_model.py — Weibull per-category decay (ported from dynamic_pricing_1).

f_{t+1} = f_t × λ^((1/λ)^k). Per-category (λ, k) set shelf life:
  leafy fast, root slow, fruit medium, herbs very fast.
Instance-level params so domain randomization can perturb them per episode
without accumulating drift across episodes.
"""
import numpy as np

WEIBULL_PARAMS = {
    "leafy": (0.97, 1.8),   # fast decay, 2–3 day shelf life
    "root":  (0.995, 0.6),  # slow, 1–2 week
    "fruit": (0.985, 1.2),  # medium
    "herbs": (0.96, 2.1),   # very fast, daily restock
}


class FreshnessModel:
    def __init__(self):
        self.params = {c: tuple(v) for c, v in WEIBULL_PARAMS.items()}

    def decay(self, f: float, cat: str) -> float:
        lam, k = self.params[cat]
        return float(np.clip(f * lam ** ((1.0 / lam) ** k), 0.0, 1.0))
