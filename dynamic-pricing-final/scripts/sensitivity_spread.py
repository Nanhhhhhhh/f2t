# scripts/sensitivity_spread.py
"""Sweep spread parameter and save policy heatmaps for user review."""
import json
import copy
from pathlib import Path
from src.mpc.controller import MPC, MPCConfig
from src.monitoring.heatmap import save_four_category_heatmap

SPREADS = [0.5, 1.0, 1.5, 2.0]
Path("checkpoints/plots/sensitivity").mkdir(parents=True, exist_ok=True)

for spread in SPREADS:
    with open("data/params/demand_params.json") as f:
        params = json.load(f)
    for cat in params:
        params[cat]["spread"] = spread

    mpc = MPC(MPCConfig())
    mpc.demand_model._params = params

    path = f"checkpoints/plots/sensitivity/heatmap_spread_{spread}.png"
    save_four_category_heatmap(mpc, path, suptitle=f"Spread = {spread}")
    print(f"Spread {spread} done -> {path}")

print("\nAll heatmaps saved to checkpoints/plots/sensitivity/")
