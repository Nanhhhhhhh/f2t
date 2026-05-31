# tests/test_freshness.py
import pytest
from src.env.freshness import (
    WASTE_THRESHOLD, RESTOCK_MIN_FRESH, DAILY_DECAY,
    decay_step, is_waste, shelf_life_days
)

def test_waste_threshold_is_050():
    assert WASTE_THRESHOLD == 0.50

def test_restock_min_fresh_is_070():
    assert RESTOCK_MIN_FRESH == 0.70

def test_decay_step_reduces_freshness():
    f = decay_step(0.85, "leafy")
    assert f == pytest.approx(0.85 * 0.850)

def test_decay_step_clips_at_zero():
    f = decay_step(0.001, "herbs")
    assert f >= 0.0

def test_is_waste_true_below_threshold():
    assert is_waste(0.49, inv=5) is True

def test_is_waste_false_at_threshold():
    assert is_waste(0.50, inv=5) is False

def test_is_waste_false_when_no_inventory():
    assert is_waste(0.30, inv=0) is False

def test_shelf_life_leafy():
    # from f0=0.85, leafy (c=0.85), reaches 0.50 in ~3.3 days
    days = shelf_life_days(f0=0.85, category="leafy")
    assert 3.0 < days < 3.5

def test_shelf_life_herbs_very_short():
    # herbs (c=0.80): from 0.85 to 0.50 in ~2.4 days
    days = shelf_life_days(f0=0.85, category="herbs")
    assert 2.0 < days < 2.5
