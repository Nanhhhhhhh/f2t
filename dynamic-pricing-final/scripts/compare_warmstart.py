#!/usr/bin/env python
"""Compare 14-day trajectory tables: MPC vs RL warm-start modes A, B, C."""
from __future__ import annotations
import os
import sys
sys.path.insert(0, ".")

import numpy as np
from src.env.freshness import DAILY_DECAY, WASTE_THRESHOLD
from src.env.market_env import OBS_DIM, OBS_WINDOW, CATEGORIES


def run_trajectory(decider, category, f0=0.95, inv=80, days=14):
    import math
    from src.env.demand import CrossDemandModel
    from src.env.market_env import RESTOCK_EVERY
    demand = CrossDemandModel.from_json("data/params/demand_params.json")
    ref        = demand._params[category]["ref_price"]
    base_dem   = demand._params[category]["base_demand"]
    restock_ev = RESTOCK_EVERY[category]
    c = DAILY_DECAY[category]
    f, prev_delta, price = f0, 0.0, ref
    rows = {}
    for day in range(1, days + 1):
        if f <= WASTE_THRESHOLD:
            for d in range(day, days + 1):
                rows[d] = ("—", "DISC")
            break
        dow = (day - 1) % 7
        days_to_restock = restock_ev - ((day - 1) % restock_ev)
        days_to_waste   = math.log(WASTE_THRESHOLD / f) / math.log(c) if f > WASTE_THRESHOLD and c < 1.0 else 0.0
        coverage_7d     = inv / max(base_dem * 7, 1.0)

        obs_row = np.array([
            f,                                          # [0] freshness
            min(inv / 100.0, 2.0),                      # [1] inv_ratio
            price / ref,                                # [2] price_ratio
            math.sin(2 * math.pi * dow / 7),            # [3] sin_dow
            math.cos(2 * math.pi * dow / 7),            # [4] cos_dow
            min(days_to_restock / 30.0, 1.0),           # [5] days_to_restock
            1.0,                                        # [6] demand_ratio (normal)
            prev_delta,                                 # [7] prev_delta
            1.0,                                        # [8] competitor_ratio (at parity)
            min(days_to_waste, 14.0) / 14.0,            # [9] days_to_waste_threshold
            min(coverage_7d, 3.0) / 3.0,               # [10] inv_coverage_7d
        ], dtype=np.float32)
        obs = np.tile(obs_row, (OBS_WINDOW, 1))
        r = decider.decide(obs, category, price, inv, f, prev_delta)
        rows[day] = (f"{f:.3f}", f"{r['delta']:+.2f}")
        prev_delta = r["delta"]
        price *= (1 + r["delta"])
        f *= c
    return rows


def print_table(name: str, decider) -> None:
    trajs = {cat: run_trajectory(decider, cat) for cat in CATEGORIES}
    print(f"\n{'='*72}")
    print(f"  {name}")
    print(f"{'='*72}")
    print(f"{'Day':>4} | {'f':>6} {'leafy':>6} | {'f':>6} {'root':>6} | "
          f"{'f':>6} {'fruit':>6} | {'f':>6} {'herbs':>6}")
    print("─" * 72)
    for day in range(1, 15):
        cols = [f"{day:>4}"]
        for cat in CATEGORIES:
            f_str, d_str = trajs[cat].get(day, ("—", "—"))
            cols.append(f"{f_str:>6} {d_str:>6}")
        print(" | ".join(cols))


def load_mpc():
    from src.mpc.controller import MPC, MPCConfig
    return MPC(MPCConfig(), ckpt_path="checkpoints/forecaster_v4_best.pt")


def load_rl(ckpt_path: str):
    from src.rl.evaluate import DDQNMultiAgent
    from src.rl.agent import MultiCatDDQNAgent
    agent = MultiCatDDQNAgent(device="cpu")
    agent.load(ckpt_path)
    return DDQNMultiAgent(agent)


if __name__ == "__main__":
    print_table("MPC (baseline)", load_mpc())

    for mode in ("A", "B", "C"):
        ckpt = f"checkpoints/rl_warmstart_{mode}_best.pt"
        if os.path.exists(ckpt):
            print_table(f"RL Warm-Start Mode {mode}  [{ckpt}]", load_rl(ckpt))
        else:
            print(f"\n[Mode {mode}] checkpoint not found: {ckpt} — skip")
