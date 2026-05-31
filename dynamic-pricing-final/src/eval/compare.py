import numpy as np
from src.eval.metrics import SystemResult, paired_ttest_waste, mean_diff_ci_95


def policy_dynamism_check(mpc, n_passes: int = 3) -> bool:
    """Pass if f=0.9 (fresh, exempt zone) and f=0.60 (stale, discount zone) give different delta
    for >= n_passes/4 categories."""
    from src.env.market_env import CATEGORIES, OBS_DIM, OBS_WINDOW
    passes = 0
    for cat in CATEGORIES:
        params = mpc.demand_model._params[cat]
        ref = params["ref_price"]
        inv = int(0.8 * 100)

        row_fresh = np.zeros(OBS_DIM, dtype=np.float32)
        row_fresh[0] = 0.90; row_fresh[1] = 0.8; row_fresh[2] = 1.0; row_fresh[8] = 1.0
        row_old = np.zeros(OBS_DIM, dtype=np.float32)
        row_old[0] = 0.60; row_old[1] = 0.8; row_old[2] = 1.0; row_old[8] = 1.0

        r_fresh = mpc.decide(np.tile(row_fresh, (OBS_WINDOW, 1)), cat, ref, inv, 0.90, 0.0)
        r_old   = mpc.decide(np.tile(row_old,   (OBS_WINDOW, 1)), cat, ref, inv, 0.60, 0.0)
        if r_fresh["delta"] != r_old["delta"]:
            passes += 1
            print(f"  {cat}: f=0.9->delta={r_fresh['delta']:+.2f}, f=0.6->delta={r_old['delta']:+.2f} PASS")
        else:
            print(f"  {cat}: f=0.9->delta={r_fresh['delta']:+.2f}, f=0.6->delta={r_old['delta']:+.2f} FAIL (flat)")
    return passes >= n_passes


def build_headline_table(results: dict[str, SystemResult], ref_name: str) -> str:
    ref = results[ref_name]
    lines = [
        f"{'System':<20} {'Waste+-SEM':>14} {'Revenue':>10} {'Dwaste [95%CI]':>22} {'p-value':>10}",
        "-" * 80
    ]
    for name, res in results.items():
        w_str = f"{res.waste_mean:.4f}+-{res.waste_sem:.4f}"
        rev   = f"{res.revenues.mean():.1f}"
        if name == ref_name:
            lines.append(f"{name:<20} {w_str:>14} {rev:>10} {'--':>22} {'--':>10}")
        else:
            mean_d, lo, hi = mean_diff_ci_95(ref, res)
            _, p = paired_ttest_waste(ref, res)
            ci_str = f"[{lo:+.4f},{hi:+.4f}]"
            lines.append(f"{name:<20} {w_str:>14} {rev:>10} {ci_str:>22} {p:>10.2e}")
    return "\n".join(lines)
