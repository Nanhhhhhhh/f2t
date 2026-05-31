import pytest
import json
import math
from src.env.demand import CrossDemandModel


@pytest.fixture
def model():
    return CrossDemandModel.from_json("data/params/demand_params.json")


def test_beta_at_fresh_is_less_negative(model):
    beta_fresh = model.beta_at_freshness(1.0, "leafy")
    beta_old = model.beta_at_freshness(0.0, "leafy")
    assert beta_fresh > beta_old  # closer to zero = less elastic


def test_beta_average_matches_base(model):
    # integral of β(f) over [0,1] = β_base (constraint: spread symmetric)
    betas = [model.beta_at_freshness(f, "leafy") for f in [i/100 for i in range(101)]]
    avg = sum(betas) / len(betas)
    assert avg == pytest.approx(-2.449, abs=0.05)


def test_demand_decreases_with_higher_price(model, rng):
    low_price = model.demand_rate("leafy", price=1.0, freshness=0.8,
                                   comp_price=1.4797, dow=2)
    high_price = model.demand_rate("leafy", price=2.0, freshness=0.8,
                                    comp_price=1.4797, dow=2)
    assert low_price > high_price


def test_demand_increases_with_freshness(model, rng):
    fresh = model.demand_rate("leafy", price=1.4797, freshness=0.9,
                               comp_price=1.4797, dow=2)
    old = model.demand_rate("leafy", price=1.4797, freshness=0.3,
                              comp_price=1.4797, dow=2)
    assert fresh > old


def test_comp_mult_raises_demand_when_competitor_expensive(model):
    cheap_comp = model.demand_rate("leafy", price=1.4797, freshness=0.8,
                                    comp_price=1.2, dow=2)
    expensive_comp = model.demand_rate("leafy", price=1.4797, freshness=0.8,
                                        comp_price=1.8, dow=2)
    assert expensive_comp > cheap_comp


def test_saturday_demand_higher_than_tuesday(model):
    # Saturday=5, Tuesday=1
    sat = model.demand_rate("leafy", price=1.4797, freshness=0.8,
                             comp_price=1.4797, dow=5)
    tue = model.demand_rate("leafy", price=1.4797, freshness=0.8,
                             comp_price=1.4797, dow=1)
    assert sat > tue


def test_revenue_gain_from_discount_smaller_when_fresh(model):
    # revenue(δ=-30%) / revenue(δ=0) should be smaller at high freshness
    def rev_ratio(f):
        ref_price = 1.4797
        r0 = model.demand_rate("leafy", price=ref_price, freshness=f,
                                comp_price=ref_price, dow=2) * ref_price
        r_disc = model.demand_rate("leafy", price=ref_price * 0.70, freshness=f,
                                    comp_price=ref_price, dow=2) * (ref_price * 0.70)
        return r_disc / r0
    ratio_fresh = rev_ratio(0.9)
    ratio_old = rev_ratio(0.3)
    assert ratio_fresh < ratio_old  # discount less beneficial when fresh
