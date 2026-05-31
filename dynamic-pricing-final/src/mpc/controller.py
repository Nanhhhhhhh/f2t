import math
from dataclasses import dataclass
from typing import Optional, List

import numpy as np
import torch

from src.env.freshness import WASTE_THRESHOLD, DAILY_DECAY
from src.env.demand import CrossDemandModel

CANDIDATES = np.linspace(-0.30, 0.20, 11)
ZERO_IDX   = 6   # index of δ=0


@dataclass
class MPCConfig:
    lambda_waste:        float = 10.0
    lambda_move:         float = 5.0
    lambda_target:       float = 50.0   # penalty for deviating from freshness-based target delta
    floor_ratio:         float = 0.85
    horizon:             int   = 7
    clearability_horizon: int  = 6
    tier_b_gamma:        float = 0.0
    max_delta_step:      float = 0.10
    freshness_neutral:   float = 0.70   # anchor: f=neutral→delta=0, above→premium, below→discount
    smooth_exempt_high:  float = 0.85   # bypass max_delta_step when f ≥ this (jump to premium)
    smooth_exempt_low:   float = 0.60   # bypass max_delta_step when f ≤ this (jump to discount)


class MPC:
    def __init__(self, cfg: MPCConfig, ckpt_path: Optional[str] = None) -> None:
        self.cfg = cfg
        self.demand_model = CrossDemandModel.from_json("data/params/demand_params.json")
        self._model = None
        self._iso   = None
        if ckpt_path:
            self._load_forecaster(ckpt_path)

    def _load_forecaster(self, path: str) -> None:
        from src.forecaster.model import ForecasterLSTM, ForecasterConfig
        ckpt = torch.load(path, map_location="cpu", weights_only=False)
        cfg  = ForecasterConfig(**ckpt["model_cfg"])
        self._model = ForecasterLSTM(cfg)
        self._model.load_state_dict(ckpt["model_state"])
        self._model.eval()
        self._iso = ckpt.get("isotonic")

    def _forecast(self, obs_window: np.ndarray, category: str):
        cat_idx = {"leafy": 0, "root": 1, "fruit": 2, "herbs": 3}[category]
        feat = torch.tensor(obs_window, dtype=torch.float32).unsqueeze(0)
        cidx = torch.tensor([cat_idx], dtype=torch.long)
        with torch.no_grad():
            out = self._model(feat, cidx)
        d_hat = float(out["demand"].item())
        logit = float(out["waste_logit"].item())
        if self._iso is not None:
            p_waste = float(self._iso.predict([logit])[0])
        else:
            p_waste = float(torch.sigmoid(torch.tensor(logit)).item())
        return max(0.0, d_hat), float(np.clip(p_waste, 0.0, 1.0))

    def _forecast_batch(self, obs_windows: np.ndarray, categories: list) -> tuple:
        """Batch LSTM forward for multiple categories. obs_windows: (n, seq, obs_dim)."""
        _cat_map = {"leafy": 0, "root": 1, "fruit": 2, "herbs": 3}
        feat = torch.tensor(obs_windows, dtype=torch.float32)
        cidx = torch.tensor([_cat_map[c] for c in categories], dtype=torch.long)
        with torch.no_grad():
            out = self._model(feat, cidx)
        d_hats   = [max(0.0, float(out["demand"][i])) for i in range(len(categories))]
        logits   = [float(out["waste_logit"][i]) for i in range(len(categories))]
        if self._iso is not None:
            p_wastes = [float(self._iso.predict([l])[0]) for l in logits]
        else:
            p_wastes = [float(torch.sigmoid(torch.tensor(l)).item()) for l in logits]
        return d_hats, p_wastes

    def decide(
        self,
        obs_window: np.ndarray,
        category: str,
        current_price: float,
        current_inv: int,
        current_freshness: float,
        prev_delta: float,
        _d_hat_override: float | None = None,
        _p_waste_override: float | None = None,
    ) -> dict:
        # Items below waste threshold are discarded — no pricing needed
        if current_freshness <= WASTE_THRESHOLD:
            return {
                "delta":      0.0,
                "reason":     "discard: freshness ≤ waste_threshold",
                "scores":     [],
                "d_hat_0":    0.0,
                "p_waste_0":  1.0,
                "t_critical": 0.0,
            }

        p          = self.demand_model._params[category]
        beta_f     = self.demand_model.beta_at_freshness(current_freshness, category)
        ref_price  = p["ref_price"]
        cost_floor = ref_price * p["cost_ratio"] * 1.05
        price_ceil = ref_price * 2.0

        # LSTM forecast (or pre-computed batch override, or fallback)
        if _d_hat_override is not None:
            d_hat_0, p_waste_0 = _d_hat_override, _p_waste_override
        elif self._model is not None:
            d_hat_0, p_waste_0 = self._forecast(obs_window, category)
        else:
            d_hat_0   = min(float(p["base_demand"]), current_inv / max(self.cfg.horizon, 1))
            p_waste_0 = 0.10 if current_freshness < 0.65 else 0.02

        # t_critical: days until freshness hits WASTE_THRESHOLD
        c = self._estimate_decay(obs_window, category)
        if current_freshness <= WASTE_THRESHOLD:
            t_critical = 0.0
        elif c >= 1.0:
            t_critical = float(self.cfg.horizon + 1)
        else:
            t_critical = math.log(WASTE_THRESHOLD / current_freshness) / math.log(c)

        # Clearability override: only for inelastic categories (β_base > -1, i.e. root)
        beta_base = p["beta"]
        if (self.cfg.clearability_horizon > 0
                and current_freshness > WASTE_THRESHOLD
                and beta_base > -1.0
                and 0 < t_critical < self.cfg.clearability_horizon):
            lo_ratio    = 1.0 + CANDIDATES[0]
            max_md_rate = (d_hat_0 / self.cfg.horizon) * (lo_ratio ** beta_f)
            clearable   = max_md_rate * t_critical
            if clearable < 0.80 * current_inv:
                target_delta = max(CANDIDATES[0], prev_delta - self.cfg.max_delta_step)
                return {
                    "delta":     float(target_delta),
                    "reason":    (f"clearability_override(smooth): t_crit={t_critical:.1f}d "
                                  f"< {self.cfg.clearability_horizon}d, "
                                  f"clearable={clearable:.0f} < 0.80×{current_inv}, "
                                  f"target={target_delta:+.2f}"),
                    "scores":    [],
                    "d_hat_0":   d_hat_0,
                    "p_waste_0": p_waste_0,
                    "t_critical": t_critical,
                }

        # Score all 11 candidates
        scores = self._score_all(
            CANDIDATES, current_price, d_hat_0, p_waste_0, t_critical,
            current_inv, prev_delta, ref_price, cost_floor, price_ceil,
            beta_f, current_freshness,
        )

        # Smooth constraint: limit change to ±max_delta_step per step
        # Exempt when freshness is very high (jump straight to premium) or very low (jump to discount)
        step   = self.cfg.max_delta_step
        exempt = (current_freshness >= self.cfg.smooth_exempt_high or
                  current_freshness <= self.cfg.smooth_exempt_low)
        if exempt:
            in_range = np.ones(len(CANDIDATES), dtype=bool)
        else:
            in_range = (CANDIDATES >= prev_delta - step) & (CANDIDATES <= prev_delta + step)
            if not in_range.any():
                in_range = np.ones(len(CANDIDATES), dtype=bool)

        # Buyer protection: no price increases when freshness is below neutral
        neutral  = self.cfg.freshness_neutral
        buyer_ok = (CANDIDATES <= 0.0) if current_freshness < neutral \
                   else np.ones(len(CANDIDATES), dtype=bool)

        # Premium middle zone: cap delta at freshness target so price descends as freshness falls
        if neutral <= current_freshness < self.cfg.smooth_exempt_high:
            upper_ok = CANDIDATES <= self._freshness_target_delta(current_freshness)
        else:
            upper_ok = np.ones(len(CANDIDATES), dtype=bool)

        hard_ok = in_range & buyer_ok & upper_ok
        if not hard_ok.any():
            hard_ok = buyer_ok & upper_ok  # relax smooth constraint first
        if not hard_ok.any():
            hard_ok = buyer_ok             # relax upper_ok if still empty

        # Revenue floor: only enforce in premium zone
        if current_freshness >= neutral:
            rev_0    = scores["revenues"][ZERO_IDX]
            feasible = (scores["revenues"] >= self.cfg.floor_ratio * rev_0) & hard_ok
        else:
            feasible = hard_ok

        if not feasible.any():
            masked = np.where(hard_ok, scores["total_scores"], np.inf)
            best_idx = int(np.argmin(masked))
        else:
            masked = np.where(feasible, scores["total_scores"], np.inf)
            best_idx = int(np.argmin(masked))

        chosen = float(CANDIDATES[best_idx])
        return {
            "delta":      chosen,
            "reason":     f"MPC: δ={chosen:+.2f}, score={scores['total_scores'][best_idx]:.3f}",
            "scores":     scores["total_scores"].tolist(),
            "d_hat_0":    d_hat_0,
            "p_waste_0":  p_waste_0,
            "t_critical": t_critical,
        }

    def _score_all(
        self, candidates, current_price, d_hat_0, p_waste_0,
        t_critical, current_inv, prev_delta, ref_price,
        cost_floor, price_ceil, beta_f, freshness,
    ) -> dict:
        new_prices   = np.clip(ref_price * (1.0 + candidates), cost_floor, price_ceil)
        price_ratios = new_prices / current_price
        demand_hat   = d_hat_0 * (price_ratios ** beta_f)
        revenues     = new_prices * demand_hat

        h = self.cfg.horizon
        if t_critical >= h:
            p_wastes = np.full(len(candidates), p_waste_0)
        else:
            t_eff          = max(t_critical, 0.0)
            demand_by_crit = demand_hat * (t_eff / h)
            inv_at_crit    = np.maximum(0.0, current_inv - demand_by_crit)
            survival_frac  = np.clip(inv_at_crit / max(current_inv, 1), 0.0, 1.0)
            p_wastes       = p_waste_0 * survival_frac

        diff           = candidates - prev_delta
        move_penalties = self.cfg.lambda_move * (np.abs(diff) + 0.5 * diff ** 2)

        # Tier B: quality premium
        if self.cfg.tier_b_gamma > 0:
            quality_mult = 1.0 + self.cfg.tier_b_gamma * freshness * np.maximum(0.0, candidates)
            revenues_adj = revenues * quality_mult
        else:
            revenues_adj = revenues

        total_scores = self.cfg.lambda_waste * p_wastes - revenues_adj + move_penalties

        # Target-tracking: steer toward freshness-based target delta
        if self.cfg.lambda_target > 0:
            target       = self._freshness_target_delta(freshness)
            total_scores = total_scores + self.cfg.lambda_target * (candidates - target) ** 2

        return {"revenues": revenues, "total_scores": total_scores, "p_wastes": p_wastes}

    def _freshness_target_delta(self, freshness: float) -> float:
        """Piecewise linear target anchored at freshness_neutral→0.
        Premium: slope from neutral to smooth_exempt_high reaches +0.20.
        Discount: slope from neutral to smooth_exempt_low reaches -0.20, capped at -0.30."""
        neutral = self.cfg.freshness_neutral
        hi      = self.cfg.smooth_exempt_high
        lo      = self.cfg.smooth_exempt_low
        if freshness >= neutral:
            slope = 0.20 / max(hi - neutral, 1e-6)
            return min(0.20, slope * (freshness - neutral))
        else:
            slope = 0.20 / max(neutral - lo, 1e-6)
            return max(-0.30, -slope * (neutral - freshness))

    def _estimate_decay(self, obs_window: np.ndarray, category: str) -> float:
        f_series = obs_window[:, 0]
        run_len  = 0
        for i in range(len(f_series) - 1, 0, -1):
            if f_series[i] < f_series[i - 1]:
                run_len += 1
            else:
                break
        if run_len < 3:
            return DAILY_DECAY[category]
        f_end   = f_series[-1]
        f_start = f_series[-(run_len + 1)]
        if f_start <= 0.01 or f_end >= f_start:
            return DAILY_DECAY[category]
        c_est = float((f_end / f_start) ** (1.0 / run_len))
        c_est = float(np.clip(c_est, 0.50, 0.999))
        return 0.5 * DAILY_DECAY[category] + 0.5 * c_est
