import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
from typing import Optional
from src.env.market_env import CATEGORIES, OBS_DIM, OBS_WINDOW
from src.mpc.controller import MPC, MPCConfig

FRESHNESS_LEVELS = np.linspace(0.55, 0.95, 9)
INV_RATIO_LEVELS = np.array([0.2, 0.5, 1.0, 1.5, 2.0])


def _make_obs(f: float, inv: float, price_ratio: float = 1.0) -> np.ndarray:
    row = np.zeros(OBS_DIM, dtype=np.float32)
    row[0] = f
    row[1] = inv
    row[2] = price_ratio
    row[8] = 1.0
    return np.tile(row, (OBS_WINDOW, 1))


def generate_policy_heatmap(
    mpc: MPC,
    category: str,
    title: str = "",
    ax: Optional[plt.Axes] = None,
) -> plt.Axes:
    """Heatmap of recommended delta across freshness x inv_ratio grid."""
    params = mpc.demand_model._params[category]
    ref_price = params["ref_price"]
    grid = np.zeros((len(INV_RATIO_LEVELS), len(FRESHNESS_LEVELS)))

    for i, inv in enumerate(INV_RATIO_LEVELS):
        for j, f in enumerate(FRESHNESS_LEVELS):
            obs = _make_obs(f, inv)
            current_inv = int(inv * 100)
            result = mpc.decide(obs, category, ref_price, current_inv, f, 0.0)
            grid[i, j] = result["delta"]

    if ax is None:
        _, ax = plt.subplots()

    cmap = plt.cm.RdYlGn
    norm = mcolors.Normalize(vmin=-0.30, vmax=0.20)
    ax.imshow(grid, aspect="auto", cmap=cmap, norm=norm,
              origin="lower", extent=[0, len(FRESHNESS_LEVELS), 0, len(INV_RATIO_LEVELS)])
    ax.set_xticks(np.arange(len(FRESHNESS_LEVELS)) + 0.5)
    ax.set_xticklabels([f"{f:.2f}" for f in FRESHNESS_LEVELS], rotation=45, fontsize=7)
    ax.set_yticks(np.arange(len(INV_RATIO_LEVELS)) + 0.5)
    ax.set_yticklabels([f"{v:.1f}" for v in INV_RATIO_LEVELS], fontsize=7)
    ax.set_xlabel("Freshness")
    ax.set_ylabel("Inventory Ratio")
    ax.set_title(title or category)

    # Add delta values as text
    for i in range(len(INV_RATIO_LEVELS)):
        for j in range(len(FRESHNESS_LEVELS)):
            ax.text(j + 0.5, i + 0.5, f"{grid[i,j]:+.2f}",
                    ha="center", va="center", fontsize=6, color="black")
    return ax


def save_four_category_heatmap(mpc: MPC, path: str, suptitle: str = "") -> None:
    fig, axes = plt.subplots(2, 2, figsize=(14, 9))
    axes_list = list(axes.flat)
    for ax, cat in zip(axes_list, CATEGORIES):
        generate_policy_heatmap(mpc, cat, title=cat, ax=ax)
    # Add colorbar
    sm = plt.cm.ScalarMappable(cmap=plt.cm.RdYlGn,
                                norm=mcolors.Normalize(vmin=-0.30, vmax=0.20))
    fig.colorbar(sm, ax=axes_list, label="delta recommended", shrink=0.6)
    if suptitle:
        fig.suptitle(suptitle, fontsize=11)
    fig.tight_layout()
    fig.savefig(path, dpi=120, bbox_inches="tight")
    plt.close(fig)
    print(f"Heatmap saved: {path}")
