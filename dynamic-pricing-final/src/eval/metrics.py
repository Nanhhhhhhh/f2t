import numpy as np
from dataclasses import dataclass
from scipy import stats


@dataclass
class SystemResult:
    name: str
    waste_rates: np.ndarray   # shape (N,) — one per episode
    revenues: np.ndarray      # shape (N,)

    @property
    def waste_mean(self): return float(self.waste_rates.mean())
    @property
    def waste_sem(self): return float(self.waste_rates.std(ddof=1) / np.sqrt(len(self.waste_rates)))


def paired_ttest_waste(ref: SystemResult, other: SystemResult) -> tuple[float, float]:
    t, p = stats.ttest_rel(ref.waste_rates, other.waste_rates)
    return float(t), float(p)


def mean_diff_ci_95(ref: SystemResult, other: SystemResult) -> tuple[float, float, float]:
    diffs = other.waste_rates - ref.waste_rates
    mean = float(diffs.mean())
    sem  = float(diffs.std(ddof=1) / np.sqrt(len(diffs)))
    return mean, mean - 1.96 * sem, mean + 1.96 * sem
