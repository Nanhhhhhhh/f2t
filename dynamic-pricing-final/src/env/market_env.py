import math
from typing import Optional
import numpy as np
from src.env.freshness import (
    WASTE_THRESHOLD, RESTOCK_MIN_FRESH, DAILY_DECAY, decay_step, is_waste
)
from src.env.demand import CrossDemandModel

OBS_DIM = 10
CATEGORIES = ["leafy", "root", "fruit", "herbs"]

RESTOCK_EVERY = {"leafy": 4, "root": 7, "fruit": 5, "herbs": 3}
RESTOCK_QTY   = {"leafy": (4, 9), "root": (20, 45), "fruit": (10, 22), "herbs": (4, 9)}
EPISODE_LEN   = 91
OBS_WINDOW    = 21


class MarketEnv:
    def __init__(self, seed: Optional[int] = None) -> None:
        self._demand_model = CrossDemandModel.from_json("data/params/demand_params.json")
        self._base_seed = seed
        self.reset(seed=seed)

    def reset(self, seed: Optional[int] = None) -> dict[str, np.ndarray]:
        s = seed if seed is not None else self._base_seed
        self._rng = np.random.default_rng(s)
        self._t = 0

        params = self._demand_model._params
        self._prices     = {c: params[c]["ref_price"] for c in CATEGORIES}
        self._freshness  = {c: float(self._rng.uniform(0.70, 0.95)) for c in CATEGORIES}
        self._inventory  = {c: int(self._rng.integers(15, 60)) for c in CATEGORIES}
        self._prev_delta = {c: 0.0 for c in CATEGORIES}
        self._demand_yesterday = {c: params[c]["base_demand"] for c in CATEGORIES}

        # synthetic competitor price per episode: Uniform(0.85, 1.15) × ref_price
        self._comp_prices = {
            c: params[c]["ref_price"] * float(self._rng.uniform(0.85, 1.15))
            for c in CATEGORIES
        }

        # obs history buffer: (OBS_WINDOW, OBS_DIM) per category, circular head pointer
        self._obs_buffer = {c: np.zeros((OBS_WINDOW, OBS_DIM), dtype=np.float32) for c in CATEGORIES}
        self._obs_head   = {c: 0 for c in CATEGORIES}
        obs = self._build_obs()
        for c in CATEGORIES:
            self._obs_buffer[c][:] = obs[c]   # fill all rows with initial state
        return obs

    def step(
        self, deltas: dict[str, float]
    ) -> tuple[dict[str, np.ndarray], dict, bool, dict]:
        info: dict = {}
        params = self._demand_model._params
        dow = self._t % 7

        for cat in CATEGORIES:
            p = params[cat]
            ref = p["ref_price"]
            cost_floor = ref * p["cost_ratio"] * 1.05
            price_ceil = ref * 2.0

            # 1. Apply delta — non-compound: always relative to ref_price
            new_price = ref * (1.0 + deltas[cat])
            self._prices[cat] = float(np.clip(new_price, cost_floor, price_ceil))

            # 2. Sample demand
            sold = self._demand_model.sample_demand(
                cat, self._prices[cat], self._freshness[cat],
                self._inventory[cat], self._comp_prices[cat], dow, self._rng
            )
            self._inventory[cat] = max(0, self._inventory[cat] - sold)
            self._demand_yesterday[cat] = float(sold)

            # 3. Decay freshness
            self._freshness[cat] = decay_step(self._freshness[cat], cat)

            # 4. Waste check (end of day)
            if is_waste(self._freshness[cat], self._inventory[cat]):
                info.setdefault("waste_events", {})[cat] = self._inventory[cat]
                self._inventory[cat] = 0

            # 5. Restock
            if self._t > 0 and self._t % RESTOCK_EVERY[cat] == 0:
                lo, hi = RESTOCK_QTY[cat]
                f_delivery = float(self._rng.uniform(0.70, 1.0))
                self._attempt_restock(cat, f_delivery,
                                      qty=int(self._rng.integers(lo, hi + 1)))

            # 6. Track prev delta
            self._prev_delta[cat] = deltas[cat]

        self._t += 1
        obs = self._build_obs()
        for c in CATEGORIES:
            self._obs_buffer[c][self._obs_head[c]] = obs[c]
            self._obs_head[c] = (self._obs_head[c] + 1) % OBS_WINDOW

        done = self._t >= EPISODE_LEN
        return obs, info, done, {}

    def obs_window(self, category: str) -> np.ndarray:
        """Return (OBS_WINDOW, OBS_DIM) history oldest-first, for LSTM input."""
        h = self._obs_head[category]
        buf = self._obs_buffer[category]
        return np.concatenate([buf[h:], buf[:h]])

    def obs(self, category: str) -> np.ndarray:
        """Return current (OBS_DIM,) observation — view into ring buffer, no copy."""
        h = (self._obs_head[category] - 1) % OBS_WINDOW
        return self._obs_buffer[category][h]

    def _attempt_restock(self, cat: str, f_delivery: float, qty: Optional[int] = None) -> None:
        if f_delivery < RESTOCK_MIN_FRESH:
            return  # reject batch
        if qty is None:
            lo, hi = RESTOCK_QTY[cat]
            qty = int(self._rng.integers(lo, hi + 1))
        old_inv = self._inventory[cat]
        old_f   = self._freshness[cat]
        if old_inv + qty > 0:
            self._freshness[cat] = (old_inv * old_f + qty * f_delivery) / (old_inv + qty)
        self._inventory[cat] += qty

    def _build_obs(self) -> dict[str, np.ndarray]:
        obs = {}
        params = self._demand_model._params
        for cat in CATEGORIES:
            p = params[cat]
            f   = self._freshness[cat]
            inv = self._inventory[cat]
            dow = self._t % 7
            days_to_next = RESTOCK_EVERY[cat] - (self._t % RESTOCK_EVERY[cat])
            comp_ratio = self._comp_prices[cat] / max(self._prices[cat], 1e-6)

            # [9] days_to_waste_threshold: ngày còn lại đến khi freshness < WASTE_THRESHOLD
            decay_rate = DAILY_DECAY[cat]
            if f <= WASTE_THRESHOLD or decay_rate >= 1.0:
                days_to_waste = 0.0
            else:
                days_to_waste = math.log(WASTE_THRESHOLD / f) / math.log(decay_rate)

            # [10] inv_coverage_7d: tỉ lệ tồn kho / dự báo bán 7 ngày
            coverage_7d = inv / max(self._demand_yesterday[cat] * 7, 1.0)

            obs[cat] = np.array([
                f,                                                                                    # [0] freshness
                min(inv / 100.0, 2.0),                                                                # [1] inv_ratio
                math.sin(2 * math.pi * dow / 7),                                                      # [2] sin_dow
                math.cos(2 * math.pi * dow / 7),                                                      # [3] cos_dow
                min(days_to_next / 30.0, 1.0),                                                        # [4] days_to_restock
                float(np.clip(self._demand_yesterday[cat] / p["base_demand"], 0.0, 3.0)),             # [5] demand_ratio
                self._prev_delta[cat],                                                                 # [6] prev_delta
                float(np.clip(comp_ratio, 0.5, 2.0)),                                                 # [7] competitor_ratio
                float(np.clip(days_to_waste, 0.0, 14.0)) / 14.0,                                     # [8] days_to_waste_threshold
                float(np.clip(coverage_7d, 0.0, 3.0)) / 3.0,                                         # [9] inv_coverage_7d
            ], dtype=np.float32)
        return obs
