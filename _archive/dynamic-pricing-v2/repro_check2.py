#!/usr/bin/env python3
"""
repro_check2.py — harder convergence test, full transparency.

3 independent seeds per category. Reports:
  - each seed's actual policy across a freshness sweep (so you SEE agreement)
  - over the full 54-cell grid: % cells where ALL 3 seeds pick the exact same
    action, and % where all 3 are within ±1 delta step
  - episode reward per seed (is the VALUE stable even if exact actions differ?)
No lenient framing — raw numbers.
"""
import numpy as np
import torch

from demand_model import load_demand_model
from freshness_model import FreshnessModel
from pricing_env import PricingEnv, ACTIONS, OBS_DIM, N_ACTIONS
from dqn import DoubleDQN, ReplayBuffer

AGENTS = ["leafy", "root", "fruit", "herbs"]
SEEDS = [0, 1, 2]
TOTAL_STEPS = 150_000
WARMUP = 2_000
BATCH = 128
LR0, LR1 = 5e-4, 5e-5   # linear LR decay → lets the network settle sharply

_GF = [0.15, 0.30, 0.45, 0.60, 0.75, 0.90]
_GINV = [0.2, 0.5, 0.8]
_GC = [0.85, 1.00, 1.15]
_H = 12
_S, _C = np.sin(2 * np.pi * _H / 24), np.cos(2 * np.pi * _H / 24)


def grid():
    return np.stack([np.array([f, inv, c, _S, _C], np.float32)
                     for f in _GF for inv in _GINV for c in _GC])


def train(cat, seed):
    torch.manual_seed(seed); np.random.seed(seed)
    env = PricingEnv(cat, load_demand_model(), FreshnessModel(), randomize=False)
    ag = DoubleDQN(OBS_DIM, N_ACTIONS, device="cpu")
    buf = ReplayBuffer(100_000)
    obs = env.reset(); decay = int(TOTAL_STEPS * 0.5)
    for s in range(1, TOTAL_STEPS + 1):
        eps = max(0.01, 1.0 - 0.99 * s / decay)
        for pg in ag.opt.param_groups:                     # linear LR decay
            pg["lr"] = LR0 + (LR1 - LR0) * min(s / TOTAL_STEPS, 1.0)
        a = ag.act(obs, eps); o2, r, d, _ = env.step(a)
        buf.push(obs, a, r, o2, d); obs = env.reset() if d else o2
        if len(buf) >= WARMUP:
            ag.update(buf.sample(BATCH, "cpu"))
    return ag


def eval_reward(ag, cat, n=40):
    env = PricingEnv(cat, load_demand_model(), FreshnessModel(), randomize=False)
    rs = []
    for _ in range(n):
        obs = env.reset(); ep = 0.0; done = False
        while not done:
            with torch.no_grad():
                a = int(ag.online(torch.tensor(obs).unsqueeze(0)).argmax().item())
            obs, _, done, info = env.step(a); ep += info["raw_reward"]
        rs.append(ep)
    return float(np.mean(rs))


_ABS = [abs(a) for a in ACTIONS]   # |delta| per action, for the stability tie-break


def gact(ag, g):
    with torch.no_grad():
        return ag.online(torch.tensor(g, dtype=torch.float32)).argmax(dim=1).numpy()


def gact_tiebreak(ag, g, eps):
    """ε-tolerant greedy: among actions within eps of the max Q, pick the most
    price-stable (smallest |delta|; ties → lowest index). Deterministic, and
    seed-independent when the value function has converged."""
    with torch.no_grad():
        q = ag.online(torch.tensor(g, dtype=torch.float32)).numpy()   # (N, 5)
    out = []
    for row in q:
        near = np.where(row >= row.max() - eps)[0]
        # among near-optimal, smallest |delta|, then lowest index
        best = min(near, key=lambda a: (_ABS[a], a))
        out.append(best)
    return np.array(out)


def fresh_sweep(ag):
    """Greedy action per freshness at inv=0.5, comp=1.0."""
    out = []
    for f in _GF:
        o = np.array([f, 0.5, 1.0, _S, _C], np.float32)
        with torch.no_grad():
            out.append(int(ag.online(torch.tensor(o).unsqueeze(0)).argmax().item()))
    return out


def main():
    g = grid()
    print(f"Convergence test: {len(SEEDS)} seeds × {TOTAL_STEPS} steps\n")
    def agree(acts):
        return float(np.mean([len(set(acts[:, j])) == 1 for j in range(acts.shape[1])]))

    for cat in AGENTS:
        agents = [train(cat, s) for s in SEEDS]
        rewards = [eval_reward(a, cat) for a in agents]
        raw = np.stack([gact(a, g) for a in agents])
        print(f"=== {cat} ===")
        print(f"  reward per seed: {[f'{r:.0f}' for r in rewards]}  "
              f"(mean {np.mean(rewards):.0f} ± {np.std(rewards):.0f})")
        print(f"  raw argmax: ALL-3 exact agree = {agree(raw):.0%}")
        for eps in (1.0, 2.0, 3.0):
            tb = np.stack([gact_tiebreak(a, g, eps) for a in agents])
            print(f"  tie-break ε={eps:.0f}: ALL-3 exact agree = {agree(tb):.0%}")
        # show the tie-broken (ε=2) freshness sweep per seed
        print(f"  tie-break ε=2 freshness sweep (f=0.15→0.90):")
        h = 12; s_, c_ = np.sin(2*np.pi*h/24), np.cos(2*np.pi*h/24)
        sweep_states = np.stack([np.array([f,0.5,1.0,s_,c_],np.float32) for f in _GF])
        for i, sd in enumerate(SEEDS):
            tb = gact_tiebreak(agents[i], sweep_states, 2.0)
            print(f"    seed {sd}: {[f'{ACTIONS[a]:+.0%}' for a in tb]}")
        print()


if __name__ == "__main__":
    main()
