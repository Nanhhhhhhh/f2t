import json
import enum
from pathlib import Path
from datetime import datetime


class FreshnessZone(str, enum.Enum):
    CRITICAL = "critical"   # f < 0.55: < 1 day to waste
    CAUTION  = "caution"    # 0.55 ≤ f < 0.70
    HEALTHY  = "healthy"    # f ≥ 0.70


class DecisionExplainer:
    @staticmethod
    def freshness_zone(f: float) -> FreshnessZone:
        if f < 0.55:
            return FreshnessZone.CRITICAL
        if f < 0.70:
            return FreshnessZone.CAUTION
        return FreshnessZone.HEALTHY

    @staticmethod
    def explain(
        category: str,
        mpc_result: dict,
        current_freshness: float,
        current_inv: int,
        current_price: float,
        comp_price: float,
        revenue_at_recommended: float,
        revenue_at_hold: float,
    ) -> dict:
        delta     = mpc_result["delta"]
        d_hat_0   = mpc_result.get("d_hat_0", 0.0)
        p_waste   = mpc_result.get("p_waste_0", 0.0)
        t_crit    = mpc_result.get("t_critical", 99.0)

        zone = DecisionExplainer.freshness_zone(current_freshness)

        if comp_price > current_price * 1.05:
            comp_pos = "competitor_more_expensive"
        elif comp_price < current_price * 0.95:
            comp_pos = "our_price_higher"
        else:
            comp_pos = "price_parity"

        if delta < -0.15:
            action = "discount aggressively"
        elif delta < 0.0:
            action = "discount slightly"
        elif delta == 0.0:
            action = "hold price"
        else:
            action = "raise price"

        reason = (
            f"{action} — freshness {current_freshness:.2f} ({zone.value}), "
            f"~{t_crit:.1f}d to waste threshold, "
            f"inventory {current_inv} units, "
            f"demand forecast {d_hat_0:.0f} units/7d, "
            f"waste probability {p_waste:.0%}"
        )

        return {
            "category":               category,
            "recommended_delta":      round(delta, 4),
            "reason":                 reason,
            "freshness_zone":         zone.value,
            "competitor_position":    comp_pos,
            "waste_probability":      round(p_waste, 4),
            "revenue_at_recommended": round(revenue_at_recommended, 2),
            "revenue_at_hold":        round(revenue_at_hold, 2),
        }

    @staticmethod
    def log_decision(
        explanation: dict,
        obs_vector: list[float],
        applied_delta: float,
        seller_override: bool,
        log_dir: str = "logs/decisions",
    ) -> None:
        Path(log_dir).mkdir(parents=True, exist_ok=True)
        date_str = datetime.now().strftime("%Y-%m-%d")
        path = Path(log_dir) / f"{date_str}.jsonl"
        record = {
            "timestamp":       datetime.now().isoformat(),
            "category":        explanation["category"],
            "obs_vector":      obs_vector,
            "recommended_delta": explanation["recommended_delta"],
            "applied_delta":   applied_delta,
            "seller_override": seller_override,
            "outcome":         None,
        }
        with open(path, "a") as f:
            f.write(json.dumps(record) + "\n")
