"""
Full pipeline runner — execute from project root:
    python scripts/run_pipeline.py

Steps:
  1. Preprocessing  — re-derive demand params from Dunnhumby data
  2. Data generation — generate 3 000-episode train/val/test parquets
  3. Train           — LSTM forecaster (MPS if available)
  4. Eval + calibrate— isotonic calibration baked into checkpoint
  5. N=200 benchmark — MPC vs static vs markdown
"""

import sys
import pathlib
import time
import json

ROOT = pathlib.Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

import numpy as np
import pandas as pd
import torch

# ─────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────

def section(title: str) -> None:
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def elapsed(t0: float) -> str:
    s = time.time() - t0
    return f"{int(s//60)}m{int(s%60):02d}s"


# ─────────────────────────────────────────────────────────────────
# STEP 1 — Preprocessing
# ─────────────────────────────────────────────────────────────────

def step_preprocessing() -> None:
    section("STEP 1 — Preprocessing (Dunnhumby → demand params)")
    t0 = time.time()

    import nbformat
    nb_path = ROOT / "preprocessing" / "preprocessing.ipynb"
    nb = nbformat.read(str(nb_path), as_version=4)
    code_cells = [c.source for c in nb.cells if c.cell_type == "code"]

    # Run cells 0–13 (all up to and including Step 12 consolidation)
    script = "\n\n".join(code_cells[:14])

    # Execute in the preprocessing directory so relative CSV paths work
    import os
    orig_dir = os.getcwd()
    os.chdir(ROOT / "preprocessing")
    try:
        namespace = {}
        exec(compile(script, "preprocessing.ipynb", "exec"), namespace)
    finally:
        os.chdir(orig_dir)

    FINAL_PARAMS = namespace["FINAL_PARAMS"]

    # Merge: update beta/ref_price/seasonality from notebook;
    # keep simulation-specific fields (spread, base_demand, cost_ratio, gamma)
    params_path = ROOT / "data" / "params" / "demand_params.json"
    with open(params_path) as f:
        current = json.load(f)

    notebook_fields = ("beta", "ref_price", "sin_weekly", "cos_weekly")
    for cat in ("leafy", "root", "fruit", "herbs"):
        for field in notebook_fields:
            if field in FINAL_PARAMS.get(cat, {}):
                current[cat][field] = round(float(FINAL_PARAMS[cat][field]), 6)

    with open(params_path, "w") as f:
        json.dump(current, f, indent=2)

    print("Updated demand_params.json:")
    for cat, p in current.items():
        print(f"  {cat:8s}: beta={p['beta']:+.4f}  ref_price={p['ref_price']:.4f}  "
              f"sin_w={p['sin_weekly']:+.4f}  cos_w={p['cos_weekly']:+.4f}")
    print(f"[done in {elapsed(t0)}]")


# ─────────────────────────────────────────────────────────────────
# STEP 2 — Data generation
# ─────────────────────────────────────────────────────────────────

def step_generate_data() -> None:
    section("STEP 2 — Data generation (3 000 episodes)")
    t0 = time.time()

    from src.forecaster.data import generate_dataset

    N_EPISODES = 3000
    N_TRAIN, N_VAL = 2100, 450
    RECORDS_PER_EP = 84 * 4  # (EPISODE_LEN-7) * n_categories

    print("Generating episodes …")
    records = generate_dataset(n_episodes=N_EPISODES, seed=42)
    print(f"Total records: {len(records):,}")

    n_train = N_TRAIN * RECORDS_PER_EP
    n_val   = N_VAL   * RECORDS_PER_EP
    splits  = [
        ("train", records[:n_train]),
        ("val",   records[n_train:n_train + n_val]),
        ("test",  records[n_train + n_val:]),
    ]

    out_dir = ROOT / "data" / "processed"
    out_dir.mkdir(parents=True, exist_ok=True)

    for name, recs in splits:
        df = pd.DataFrame(recs)
        df["features"] = df["features"].apply(lambda x: list(x))
        path = out_dir / f"{name}.parquet"
        df.to_parquet(path, index=False)
        print(f"  Saved {name}.parquet  ({len(df):,} rows)")

    print(f"[done in {elapsed(t0)}]")


# ─────────────────────────────────────────────────────────────────
# STEP 3 — Train forecaster
# ─────────────────────────────────────────────────────────────────

def step_train() -> str:
    section("STEP 3 — Train LSTM forecaster")
    t0 = time.time()

    from src.forecaster.train import train, TrainConfig, ForecasterConfig
    cfg = TrainConfig(max_epochs=50, patience=5)
    ckpt_path = train(train_cfg=cfg)

    print(f"[done in {elapsed(t0)}]")
    return ckpt_path


# ─────────────────────────────────────────────────────────────────
# STEP 4 — Evaluate + bake isotonic calibration into checkpoint
# ─────────────────────────────────────────────────────────────────

def step_eval_and_calibrate(ckpt_path: str) -> None:
    section("STEP 4 — Eval + isotonic calibration")
    t0 = time.time()

    from src.forecaster.eval import evaluate_checkpoint, print_eval_report

    device = "mps" if torch.backends.mps.is_available() else "cpu"
    results, iso = evaluate_checkpoint(ckpt_path, device=device)
    print_eval_report(results)

    # Bake isotonic regressor into the checkpoint so MPC can use it
    ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=False)
    ckpt["isotonic"] = iso
    torch.save(ckpt, ckpt_path)
    print(f"\nIsotonic calibration saved into checkpoint.")
    print(f"[done in {elapsed(t0)}]")


# ─────────────────────────────────────────────────────────────────
# STEP 5 — N=200 evaluation: MPC vs static vs markdown
# ─────────────────────────────────────────────────────────────────

def step_n200_eval(ckpt_path: str, ddqn_ckpt_dir: str = "checkpoints") -> None:
    section("STEP 5 — N=200 system evaluation")
    t0 = time.time()

    from src.pipeline import run_n_episodes
    from src.mpc.controller import MPC, MPCConfig
    from src.eval.metrics import SystemResult
    from src.eval.compare import build_headline_table, policy_dynamism_check
    from src.env.market_env import CATEGORIES

    N = 200

    def static_policy(obs, cat, env):
        return 0.0

    def markdown_policy(obs, cat, env):
        return -0.25 if obs[0, 0] < 0.65 else 0.0

    mpc = MPC(MPCConfig(), ckpt_path=ckpt_path)

    def mpc_policy(obs, cat, env):
        return mpc.decide(obs, cat, env._prices[cat],
                          env._inventory[cat], env._freshness[cat], 0.0)["delta"]

    policies = [
        ("static",   static_policy),
        ("markdown", markdown_policy),
        ("MPC_v3",   mpc_policy),
    ]

    # Auto-include DDQN if shared checkpoint exists
    import os
    ddqn_available = os.path.exists(f"{ddqn_ckpt_dir}/rl_shared_best.pt")
    ddqn_agents = None
    if ddqn_available:
        from src.rl.evaluate import load_agents, ddqn_policy
        import torch
        device = "mps" if torch.backends.mps.is_available() else "cpu"
        ddqn_agents = load_agents(ddqn_ckpt_dir, device=device)
        policies.append(("DDQN", ddqn_policy(ddqn_agents)))
        print("DDQN checkpoints found — including in benchmark.")
    else:
        print("No DDQN checkpoints found — run `python scripts/train_rl.py` first.")

    print(f"Running {N} episodes per policy …")
    results = {}
    for name, fn in policies:
        t1 = time.time()
        eps = run_n_episodes(fn, n=N, base_seed=0)
        results[name] = SystemResult(
            name=name,
            waste_rates=np.array([e["waste_event_rate"] for e in eps]),
            revenues=np.array([e["total_revenue"] for e in eps]),
        )
        print(f"  {name:12s}: waste={results[name].waste_mean:.4f}  "
              f"rev={results[name].revenues.mean():.1f}  ({elapsed(t1)})")

    print("\n" + build_headline_table(results, ref_name="static"))

    print("\nPolicy dynamism check (MPC):")
    mpc_passed = policy_dynamism_check(mpc)
    print(f"  MPC => {'PASS' if mpc_passed else 'FAIL'}")

    if ddqn_agents is not None:
        from src.rl.evaluate import DDQNMultiAgent
        ddqn_multi = DDQNMultiAgent(ddqn_agents)
        print("\nPolicy dynamism check (DDQN):")
        ddqn_passed = policy_dynamism_check(ddqn_multi)
        print(f"  DDQN => {'PASS' if ddqn_passed else 'FAIL'}")

    print(f"[done in {elapsed(t0)}]")


# ─────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Run full dynamic pricing pipeline")
    parser.add_argument("--skip-preprocessing", action="store_true",
                        help="Skip Step 1 (use existing demand_params.json)")
    parser.add_argument("--skip-data", action="store_true",
                        help="Skip Step 2 (use existing parquet files)")
    parser.add_argument("--skip-train", action="store_true",
                        help="Skip Step 3 (use existing checkpoint)")
    parser.add_argument("--ckpt", default="checkpoints/forecaster_v4_best.pt",
                        help="Checkpoint path (used with --skip-train)")
    args = parser.parse_args()

    t_total = time.time()
    ckpt_path = args.ckpt

    if not args.skip_preprocessing:
        step_preprocessing()

    if not args.skip_data:
        step_generate_data()

    if not args.skip_train:
        ckpt_path = step_train()

    step_eval_and_calibrate(ckpt_path)
    step_n200_eval(ckpt_path)

    section(f"PIPELINE COMPLETE  ({elapsed(t_total)} total)")
