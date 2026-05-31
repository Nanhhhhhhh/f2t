#!/usr/bin/env python
"""MPC warm-start RL training. Usage: python scripts/warmstart_train.py --mode {A,B,C}"""
from __future__ import annotations
import argparse
import sys
sys.path.insert(0, ".")

import torch
from src.rl.agent import MultiCatDDQNAgent
from src.rl.warmstart import collect_mpc_experience, bc_pretrain, seed_buffer
from src.rl.train import train_all_categories

TIME_LIMIT_SEC = 600  # 10 minutes

# Per-mode ε schedule; warmup=0 because buffer is seeded or network is BC-trained
MODE_CFG = {
    "A": dict(epsilon_start=0.30, epsilon_decay_ep=1000),
    "B": dict(epsilon_start=0.15, epsilon_decay_ep=500),
    "C": dict(epsilon_start=0.10, epsilon_decay_ep=300),
}


def main() -> None:
    parser = argparse.ArgumentParser(description="MPC warm-start DDQN training")
    parser.add_argument("--mode", choices=["A", "B", "C"], required=True,
                        help="A=buffer-seed, B=BC+RL, C=BC+buffer-seed+RL")
    parser.add_argument("--n-collect", type=int, default=100,
                        help="MPC episodes to collect (default 100 ≈ 36k transitions)")
    parser.add_argument("--n-episodes", type=int, default=3000,
                        help="Max RL episodes (time_limit_sec=1800 stops earlier)")
    parser.add_argument("--ckpt-dir", default="checkpoints")
    parser.add_argument("--cache-path", default="checkpoints/mpc_experience_cache.npz",
                        help="Shared MPC experience cache (modes A/B/C reuse; delete to refresh)")
    args = parser.parse_args()

    cfg = MODE_CFG[args.mode]
    ckpt_name = f"rl_warmstart_{args.mode}_best.pt"

    # ── 1. Collect MPC experience (or load from cache) ───────────────────────
    print(f"\n=== Mode {args.mode}: collecting {args.n_collect} MPC episodes ===")
    transitions = collect_mpc_experience(n_episodes=args.n_collect, cache_path=args.cache_path)
    print(f"  {len(transitions)} transitions ready across all categories")

    # ── 2. Build agent ────────────────────────────────────────────────────────
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    agent  = MultiCatDDQNAgent(device=device, warmup=0)

    # ── 3. Apply warm-start ───────────────────────────────────────────────────
    if args.mode in ("B", "C"):
        print("  BC pre-training (500 steps)...")
        bc_pretrain(agent, transitions, n_steps=500, batch_size=256)
        print("  BC done.")

    if args.mode in ("A", "C"):
        print(f"  Seeding replay buffer with {len(transitions)} transitions...")
        seed_buffer(agent, transitions)
        print("  Buffer seeded.")

    # ── 4. RL fine-tune ───────────────────────────────────────────────────────
    print(f"\n  RL fine-tune: ε_start={cfg['epsilon_start']}, "
          f"ε_decay={cfg['epsilon_decay_ep']}ep, time_limit=10min → {ckpt_name}")
    train_all_categories(
        n_episodes=args.n_episodes,
        device=device,
        ckpt_dir=args.ckpt_dir,
        ckpt_name=ckpt_name,
        verbose=True,
        epsilon_start=cfg["epsilon_start"],
        epsilon_decay_ep=cfg["epsilon_decay_ep"],
        warmup=0,
        eval_every=200,
        time_limit_sec=TIME_LIMIT_SEC,
        agent=agent,
        update_every=4,
    )
    print(f"\nDone. Checkpoint saved to {args.ckpt_dir}/{ckpt_name}")


if __name__ == "__main__":
    main()
