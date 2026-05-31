# tests/test_monitoring.py
import pytest
from src.monitoring.explainer import DecisionExplainer, FreshnessZone


def test_freshness_zone_critical():
    assert DecisionExplainer.freshness_zone(0.52) == FreshnessZone.CRITICAL


def test_freshness_zone_caution():
    assert DecisionExplainer.freshness_zone(0.62) == FreshnessZone.CAUTION


def test_freshness_zone_healthy():
    assert DecisionExplainer.freshness_zone(0.80) == FreshnessZone.HEALTHY


def test_explain_output_keys():
    result = {
        "delta": -0.10, "d_hat_0": 28.0, "p_waste_0": 0.34,
        "t_critical": 2.5, "scores": []
    }
    exp = DecisionExplainer.explain(
        category="leafy", mpc_result=result,
        current_freshness=0.72, current_inv=45,
        current_price=1.48, comp_price=1.60,
        revenue_at_recommended=48.2, revenue_at_hold=41.1,
    )
    for key in ("category", "recommended_delta", "reason", "freshness_zone",
                "competitor_position", "waste_probability",
                "revenue_at_recommended", "revenue_at_hold"):
        assert key in exp


def test_competitor_position_cheaper():
    result = {"delta": 0.0, "d_hat_0": 10.0, "p_waste_0": 0.1,
              "t_critical": 5.0, "scores": []}
    exp = DecisionExplainer.explain("leafy", result, 0.8, 20, 1.48, 1.20, 40.0, 38.0)
    assert exp["competitor_position"] == "our_price_higher"
