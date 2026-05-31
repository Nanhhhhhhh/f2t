# tests/test_forecaster_eval.py
import torch
import numpy as np
import pytest
from src.forecaster.eval import (
    compute_waste_auroc, compute_demand_mae, fit_isotonic
)

def test_auroc_perfect():
    logits = np.array([2.0, -2.0, 2.0, -2.0])
    labels = np.array([1, 0, 1, 0])
    assert compute_waste_auroc(logits, labels) == pytest.approx(1.0)

def test_auroc_random():
    rng = np.random.default_rng(0)
    logits = rng.standard_normal(100)
    labels = rng.integers(0, 2, 100)
    auroc = compute_waste_auroc(logits, labels)
    assert 0.0 <= auroc <= 1.0

def test_demand_mae():
    preds = np.array([3.0, 5.0, 2.0])
    trues = np.array([3.5, 4.0, 2.5])
    mae = compute_demand_mae(preds, trues)
    assert mae == pytest.approx((0.5 + 1.0 + 0.5) / 3)

def test_isotonic_fit_monotone():
    logits = np.linspace(-3, 3, 50)
    labels = (logits > 0).astype(float)
    iso = fit_isotonic(logits, labels)
    probs = iso.predict(logits)
    # Isotonic output must be non-decreasing
    assert all(probs[i] <= probs[i+1] + 1e-9 for i in range(len(probs)-1))
