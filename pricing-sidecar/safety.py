def apply_safety(price: float, base_price: float, freshness: float) -> tuple[float, bool]:
    original_price = price
    clipped_price = price

    # Rule 3 — Max tick change: price must be within [-30%, +20%] of base_price
    clipped_price = max(base_price * 0.70, min(clipped_price, base_price * 1.20))
    
    # Rule 4 — Freshness mandate: if freshness < 0.4, force price <= base_price * 0.75
    if freshness < 0.4:
        clipped_price = min(clipped_price, base_price * 0.75)
        
    # Rule 1 — Cost floor: price must be >= base_price * 0.55
    clipped_price = max(clipped_price, base_price * 0.55)

    # Rule 2 — Price ceiling: price must be <= base_price * 2.0
    clipped_price = min(clipped_price, base_price * 2.0)
    
    # Rule 5 — Minimum viable price: price must be >= 1000
    clipped_price = max(clipped_price, 1000.0)

    safety_clipped = (clipped_price != original_price)

    return clipped_price, safety_clipped
