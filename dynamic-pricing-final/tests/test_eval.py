import numpy as np
import pytest
from src.eval.metrics import SystemResult, paired_ttest_waste, mean_diff_ci_95
from src.eval.compare import build_headline_table


def test_system_result_waste_mean():
    res = SystemResult("test", np.array([0.01, 0.02, 0.03]), np.array([100.0, 110.0, 120.0]))
    assert res.waste_mean == pytest.approx(0.02)


def test_system_result_waste_sem():
    res = SystemResult("test", np.array([0.01, 0.02, 0.03]), np.array([100.0, 110.0, 120.0]))
    assert res.waste_sem > 0


def test_paired_ttest_waste_identical():
    arr = np.array([0.01, 0.02, 0.03])
    ref = SystemResult("ref", arr.copy(), arr.copy())
    other = SystemResult("other", arr.copy(), arr.copy())
    t, p = paired_ttest_waste(ref, other)
    # When all differences are zero, scipy returns nan (0/0 degenerate case)
    # — that is equivalent to p=1.0 (no difference detected), so accept both.
    assert np.isnan(p) or p == pytest.approx(1.0, abs=1e-6)


def test_mean_diff_ci_95():
    ref   = SystemResult("ref",   np.array([0.01, 0.02, 0.03]), np.ones(3))
    other = SystemResult("other", np.array([0.02, 0.03, 0.04]), np.ones(3))
    mean, lo, hi = mean_diff_ci_95(ref, other)
    assert mean == pytest.approx(0.01)
    assert lo < mean < hi


def test_build_headline_table():
    results = {
        "ref":   SystemResult("ref",   np.array([0.01, 0.02]), np.array([100.0, 110.0])),
        "other": SystemResult("other", np.array([0.005, 0.01]), np.array([120.0, 130.0])),
    }
    table = build_headline_table(results, "ref")
    assert "ref" in table
    assert "other" in table
