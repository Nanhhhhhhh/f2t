import math
from typing import Literal

WASTE_THRESHOLD: float = 0.50
RESTOCK_MIN_FRESH: float = 0.70

DAILY_DECAY: dict[str, float] = {
    "leafy": 0.850,
    "root":  0.950,
    "fruit": 0.880,
    "herbs": 0.800,
}

Category = Literal["leafy", "root", "fruit", "herbs"]


def decay_step(f: float, category: Category) -> float:
    return max(0.0, f * DAILY_DECAY[category])


def is_waste(f: float, inv: int) -> bool:
    return f < WASTE_THRESHOLD and inv > 0


def shelf_life_days(f0: float, category: Category) -> float:
    """Days from f0 until freshness drops below WASTE_THRESHOLD."""
    c = DAILY_DECAY[category]
    if c >= 1.0:
        return float("inf")
    return math.log(WASTE_THRESHOLD / f0) / math.log(c)
