import numpy as np

# Categories that hold (delta=0) when fresh — no premium pricing
HOLD_CATS = {"leafy", "herbs"}

CANDIDATES = np.linspace(-0.30, 0.20, 11)
CANDIDATES[6] = 0.0
ZERO_IDX        = 6
EXEMPT_HIGH     = 0.85   # f >= this: all actions valid (premium cats)
NEUTRAL         = 0.80   # hold cats: target=0 above this
NEUTRAL_PREMIUM = 0.70   # premium cats: cap zone starts here (wider = more training signal)
DISCOUNT_START  = 0.75   # hold cats: discount starts below this
WASTE_THRESHOLD = 0.50


def freshness_target_delta(f: float, cat: str = "") -> float:
    """Piecewise linear freshness → target delta, category-aware.

    leafy / herbs  (HOLD_CATS):
      f >= 0.75 →  0.00  (hold)
      f =  0.50 → -0.30

    fruit / root  (premium, wide cap zone 0.70–0.85):
      f >= 0.85 → +0.20
      f =  0.70 →  0.00  (neutral)
      f =  0.50 → -0.30
    """
    if cat in HOLD_CATS:
        if f >= DISCOUNT_START:
            return 0.0
        elif f >= WASTE_THRESHOLD:
            return -0.30 * (DISCOUNT_START - f) / (DISCOUNT_START - WASTE_THRESHOLD)
        else:
            return -0.30
    else:
        if f >= EXEMPT_HIGH:
            return +0.20
        elif f >= NEUTRAL_PREMIUM:
            # cap zone [0.70, 0.85): linear 0.0 → +0.20
            return +0.20 * (f - NEUTRAL_PREMIUM) / (EXEMPT_HIGH - NEUTRAL_PREMIUM)
        elif f >= WASTE_THRESHOLD:
            # discount zone [0.50, 0.70): linear 0.0 → -0.30
            return -0.30 * (NEUTRAL_PREMIUM - f) / (NEUTRAL_PREMIUM - WASTE_THRESHOLD)
        else:
            return -0.30


def compute_mask(freshness: float, cat: str = "") -> np.ndarray:
    """Bool array (11,) — True = action valid, category-aware.

    leafy / herbs:
      f <= 0.50          → only delta=0
      f >= 0.50          → no positive deltas (hold cats never premium)

    fruit / root:
      f <= 0.50          → only delta=0
      f <  0.70          → no positive (discount zone)
      0.70 <= f < 0.85   → cap at freshness_target_delta(f)  [wide cap zone]
      f >= 0.85          → all valid
    """
    mask = np.ones(11, dtype=bool)
    if freshness <= WASTE_THRESHOLD:
        mask[:] = False
        mask[ZERO_IDX] = True
    elif cat in HOLD_CATS:
        mask[CANDIDATES > 0.0] = False
    elif freshness < NEUTRAL_PREMIUM:
        mask[CANDIDATES > 0.0] = False
    elif freshness < EXEMPT_HIGH:
        target = freshness_target_delta(freshness, cat)
        mask[CANDIDATES > target + 1e-6] = False
    return mask


def compute_reward(
    price: float,
    ref_price: float,
    sold: float,
    waste_units: float,
    delta: float,
    prev_delta: float,
    freshness: float,
    cat: str = "",
) -> float:
    """Per-step reward, category-aware.

    r_premium only applies to fruit/root (premium categories).
    leafy/herbs guided purely by r_target toward hold (delta=0).
    """
    r_revenue = (price / ref_price) * sold
    r_waste   = -15.0 * waste_units
    r_target  = -100.0 * (delta - freshness_target_delta(freshness, cat)) ** 2
    r_premium = 15.0 * delta * max(0.0, freshness - NEUTRAL)
    r_smooth  = -0.5 * abs(delta - prev_delta)
    return r_revenue + r_waste + r_target + r_premium + r_smooth
