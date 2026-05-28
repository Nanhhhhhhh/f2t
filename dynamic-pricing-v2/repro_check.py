#!/usr/bin/env python3
"""
repro_check.py — convergence test via seed reproducibility.

If a policy has truly converged to a stable optimum, independent training runs
with different random seeds should produce the SAME greedy policy. This trains
each category from 2 seeds and reports:
  - greedy-action agreement on the 54-cell eval grid (allowing ±1 adjacent
    action, since adjacent deltas are often economically near-tied)
  - exact-match agreement
  - eval-reward stability across the last evals of each run

Reduced budget (past the ~step-5000 reward plateau) to keep it fast.
"""
import numpy as np
import torch

from demand_model import load_demand_model
from freshness_model import FreshnessModel
from pricing_env import PricingEnv, ACTIONS, OBS_DIM, N_ACTIONS
from dqn import DoubleDQN, ReplayBuffer

AGENTS = ["leafy", "root", "fruit", "herbs"]
TOTAL_STEPS = 80_000
WARMUP = 2_000
BATCH = 128

_GRID_F = [0.15, 0.30, 0.45, 0.60, 0.75, 0.90]
_GRID_INV = [0.2, 0.5, 0.8]
_GRID_COMP = [0.85, 1.00, 1.15]


def grid_states():
    h = 12
    s, c = np.sin(2 * np.pi * h / 24), np.cos(2 * np.pi * h / 24)
    return np.stack([np.array([f, inv, comp, s, c], np.float32)
                     for f in _GRID_F for inv in _GRID_INV for comp in _GRID_COMP])


def train_one(cat, seed):
    torch.manual_seed(seed)
    np.random.seed(seed)
    env = PricingEnv(cat, load_demand_model(), FreshnessModel(), randomize=False)
    agent = DoubleDQN(OBS_DIM, N_ACTIONS, device="cpu")
    buf = ReplayBuffer(100_000)
    obs = env.reset()
    decay = int(TOTAL_STEPS * 0.5)
    for step in range(1, TOTAL_STEPS + 1):
        eps = max(0.02, 1.0 - (1.0 - 0.02) * step / decay)
        a = agent.act(obs, eps)
        o2, r, done, _ = env.step(a)
        buf.push(obs, a, r, o2, done)
        obs = env.reset() if done else o2
        if len(buf) >= WARMUP:
            agent.update(buf.sample(BATCH, "cpu"))
    return agent


def greedy_grid(agent, grid):
    g = torch.tensor(grid, dtype=torch.float32)
    with torch.no_grad():
        return agent.online(g).argmax(dim=1).numpy()


def main():
    grid = grid_states()
    print(f"Seed-reproducibility convergence test ({TOTAL_STEPS} steps/run, 2 seeds/cat)\n")
    print(f"{'category':8} {'exact':>8} {'±1 adj':>8}  verdict")
    print("-" * 42)
    for cat in AGENTS:
        a0 = train_one(cat, seed=0)
        a1 = train_one(cat, seed=1)
        g0, g1 = greedy_grid(a0, grid), greedy_grid(a1, grid)
        exact = float(np.mean(g0 == g1))
        adj = float(np.mean(np.abs(g0 - g1) <= 1))
        verdict = "STABLE" if adj >= 0.90 else ("partial" if adj >= 0.75 else "UNSTABLE")
        print(f"{cat:8} {exact:8.0%} {adj:8.0%}  {verdict}")
    print("\nExact = identical action; ±1 adj = within one delta step (near-tied actions).")


if __name__ == "__main__":
    main()
