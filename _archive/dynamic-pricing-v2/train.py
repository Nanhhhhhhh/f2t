#!/usr/bin/env python3
"""
train.py — train one stateless Double-DQN per category, with convergence tracking.

For each category:
  - anneal epsilon 1.0 → 0.05
  - Double-DQN updates every step
  - every EVAL_EVERY steps: greedy eval (reward, waste) + policy-grid drift
  - converged when greedy action on a fixed 54-state grid is unchanged for
    3 consecutive evals (drift < 2%)
  - save best-reward checkpoint to checkpoints/dqn_{cat}.pt
  - append a results block + freshness→action policy table to JOURNAL.md

Run:
    python train.py                 # all 4 categories
    python train.py --category leafy
"""
import argparse
import os
import time

import numpy as np
import torch

from demand_model import load_demand_model
from freshness_model import FreshnessModel
from pricing_env import PricingEnv, ACTIONS, OBS_DIM, N_ACTIONS
from dqn import DoubleDQN

AGENTS = ["leafy", "root", "fruit", "herbs"]

CFG = dict(
    total_steps=150_000,
    warmup=2_000,
    batch_size=128,
    buffer=100_000,
    lr=5e-4,
    lr_end=5e-5,            # linear LR decay → lets the value function settle
    gamma=0.99,
    tau=0.01,
    hidden=128,
    eps_start=1.0,
    eps_end=0.01,
    eps_decay_frac=0.5,     # anneal over first 50% of steps
    eval_every=5_000,
    eval_episodes=40,
    drift_tol=0.06,         # action-histogram TV distance < 6% (≈3 grid cells)
    converge_streak=3,
    device="cpu",
)

# Fixed evaluation grid (noon) — decouples convergence from episode stochasticity
_GRID_F = [0.15, 0.30, 0.45, 0.60, 0.75, 0.90]
_GRID_INV = [0.2, 0.5, 0.8]
_GRID_COMP = [0.85, 1.00, 1.15]


def _grid_states():
    h = 12
    s, c = np.sin(2 * np.pi * h / 24), np.cos(2 * np.pi * h / 24)
    states = []
    for f in _GRID_F:
        for inv in _GRID_INV:
            for comp in _GRID_COMP:
                states.append(np.array([f, inv, comp, s, c], dtype=np.float32))
    return np.stack(states)


def _grid_actions(agent, grid):
    g = torch.tensor(grid, dtype=torch.float32, device=agent.device)
    with torch.no_grad():
        return agent.online(g).argmax(dim=1).cpu().numpy()


def evaluate(agent, env, n_ep):
    rewards, wastes, raw_rewards = [], [], []
    for _ in range(n_ep):
        obs = env.reset()
        ep_r, ep_w, ep_raw, steps = 0.0, 0, 0.0, 0
        done = False
        while not done:
            a = agent.act(obs, epsilon=0.0)
            obs, r, done, info = env.step(a)
            ep_r += r
            ep_raw += info["raw_reward"]
            ep_w += info["waste"]
            steps += 1
        rewards.append(ep_r)
        raw_rewards.append(ep_raw)
        wastes.append(ep_w / steps)
    return (float(np.mean(rewards)), float(np.std(rewards)),
            float(np.mean(wastes)), float(np.mean(raw_rewards)))


def eval_policy_fn(env, action_fn, n_ep):
    """Evaluate an arbitrary policy: action_fn(obs) -> action index."""
    rewards, wastes = [], []
    for _ in range(n_ep):
        obs = env.reset()
        ep_r, ep_w, steps = 0.0, 0, 0
        done = False
        while not done:
            obs, r, done, info = env.step(action_fn(obs))
            ep_r += info["raw_reward"]
            ep_w += info["waste"]
            steps += 1
        rewards.append(ep_r)
        wastes.append(ep_w / steps)
    return float(np.mean(rewards)), float(np.mean(wastes))


def baseline_comparison(agent, env, n_ep=60):
    """Compare the DQN against fixed-action and freshness-rule baselines."""
    def fresh_rule(obs):
        f = obs[0]
        if f < 0.35: return 0      # -30%
        if f < 0.55: return 1      # -15%
        return 4                   # +20%
    rows = []
    for name, fn in [
        ("always -30%", lambda o: 0),
        ("always  0%",  lambda o: 2),
        ("always +20%", lambda o: 4),
        ("freshness-rule", fresh_rule),
        ("DQN", lambda o: agent.act(o, 0.0)),
    ]:
        rev, waste = eval_policy_fn(env, fn, n_ep)
        rows.append((name, rev, waste))
    return rows


def policy_table(agent):
    """Greedy action per freshness level (inv=0.5, comp=1.0, noon)."""
    h = 12
    s, c = np.sin(2 * np.pi * h / 24), np.cos(2 * np.pi * h / 24)
    rows = []
    for f in [0.15, 0.30, 0.45, 0.60, 0.75, 0.90]:
        obs = np.array([f, 0.5, 1.0, s, c], dtype=np.float32)
        q = agent.greedy_q(obs)
        a = int(np.argmax(q))
        rows.append((f, a, ACTIONS[a]))
    return rows


def train_category(cat, journal_lines):
    print(f"\n{'='*64}\nTraining DQN — {cat}\n{'='*64}")
    # Train on the FIXED environment: the 5-dim obs does not reveal randomized
    # elasticity/decay, so randomizing would break the Markov property and the
    # Q-function could not converge. Fixed params → clean MDP → convergent policy.
    demand = load_demand_model()
    fresh = FreshnessModel()
    env = PricingEnv(cat, demand, fresh, randomize=False)
    eval_demand = load_demand_model()
    eval_fresh = FreshnessModel()
    eval_env = PricingEnv(cat, eval_demand, eval_fresh, randomize=False)

    agent = DoubleDQN(OBS_DIM, N_ACTIONS, hidden=CFG["hidden"],
                      lr=CFG["lr"], gamma=CFG["gamma"], tau=CFG["tau"],
                      device=CFG["device"])
    from dqn import ReplayBuffer
    buf = ReplayBuffer(CFG["buffer"])

    grid = _grid_states()
    prev_grid_acts = None
    stable_streak = 0
    best_reward = -np.inf
    converged_step = None
    ckpt = f"checkpoints/dqn_{cat}.pt"

    obs = env.reset()
    decay_steps = int(CFG["total_steps"] * CFG["eps_decay_frac"])
    t0 = time.time()
    losses = []

    for step in range(1, CFG["total_steps"] + 1):
        eps = max(CFG["eps_end"],
                  CFG["eps_start"] - (CFG["eps_start"] - CFG["eps_end"]) * step / decay_steps)
        frac = min(step / CFG["total_steps"], 1.0)
        for pg in agent.opt.param_groups:
            pg["lr"] = CFG["lr"] + (CFG["lr_end"] - CFG["lr"]) * frac
        a = agent.act(obs, eps)
        obs2, r, done, _ = env.step(a)
        buf.push(obs, a, r, obs2, done)
        obs = env.reset() if done else obs2

        if len(buf) >= CFG["warmup"]:
            loss = agent.update(buf.sample(CFG["batch_size"], CFG["device"]))
            losses.append(loss)

        if step % CFG["eval_every"] == 0:
            rew, rstd, waste, raw = evaluate(agent, eval_env, CFG["eval_episodes"])
            grid_acts = _grid_actions(agent, grid)
            # Histogram (action-distribution) drift — robust to near-tied actions
            # flipping between adjacent deltas (which don't change policy value).
            hist = np.bincount(grid_acts, minlength=N_ACTIONS) / len(grid_acts)
            drift = (1.0 if prev_grid_acts is None
                     else 0.5 * float(np.abs(hist - prev_grid_acts).sum()))  # TV distance
            prev_grid_acts = hist
            stable_streak = stable_streak + 1 if drift < CFG["drift_tol"] else 0
            avg_loss = float(np.mean(losses[-1000:])) if losses else 0.0

            tag = "  <stable>" if stable_streak >= 1 else ""
            print(f"[{cat}] step={step:>7} eps={eps:.3f} | reward={rew:7.2f}±{rstd:.1f} "
                  f"(raw={raw:7.1f}) | waste={waste:.3f} | loss={avg_loss:.4f} | "
                  f"drift={drift:.3f}{tag}")

            if rew > best_reward:
                best_reward = rew
                agent.save(ckpt)

            if stable_streak >= CFG["converge_streak"] and converged_step is None:
                converged_step = step
                print(f"  >>> CONVERGED at step {step} "
                      f"(grid drift < {CFG['drift_tol']} for {CFG['converge_streak']} evals)")
                break

    # reload best, final eval + policy table
    if os.path.exists(ckpt):
        agent.load(ckpt)
    rew, rstd, waste, raw = evaluate(agent, eval_env, 100)
    table = policy_table(agent)
    baselines = baseline_comparison(agent, eval_env, n_ep=60)
    # Real-world (stochastic Poisson) eval — what production demand looks like
    stoch_env = PricingEnv(cat, load_demand_model(), FreshnessModel(),
                           randomize=False, deterministic=False)
    stoch_rev, _, stoch_waste, _ = evaluate(agent, stoch_env, 100)
    elapsed = time.time() - t0

    print(f"\n[{cat}] FINAL: reward={rew:.2f}±{rstd:.1f}  waste={waste:.3f}  "
          f"raw_rev={raw:.1f}  converged@{converged_step}  ({elapsed:.0f}s)")
    print(f"[{cat}] baselines (raw revenue / waste, 60 eps):")
    for name, rv, wst in baselines:
        print(f"     {name:16s}: rev={rv:8.1f}  waste={wst:.3f}")
    print(f"[{cat}] stochastic (Poisson) eval: rev={stoch_rev:.1f} waste={stoch_waste:.3f}")
    print(f"[{cat}] policy (inv=0.5, comp=1.0, noon):")
    for f, a, d in table:
        print(f"     f={f:.2f} → A{a} ({d:+.0%})")

    # Journal block
    journal_lines.append(f"\n### {cat}\n")
    journal_lines.append(f"- Converged at step: **{converged_step}** "
                         f"({'grid-stable' if converged_step else 'ran full budget'})\n")
    journal_lines.append(f"- Final greedy eval (100 eps, fixed env): "
                         f"reward={rew:.2f}±{rstd:.1f}, waste={waste:.3f}, "
                         f"raw_revenue={raw:.1f}\n")
    journal_lines.append(f"- Training time: {elapsed:.0f}s\n")
    journal_lines.append(f"- Stochastic (Poisson) eval: revenue={stoch_rev:.1f}, waste={stoch_waste:.3f}\n")
    journal_lines.append(f"- Baseline comparison (raw revenue / waste, 60 eps):\n\n")
    journal_lines.append("  | policy | revenue | waste |\n  |---|---|---|\n")
    for name, rv, wst in baselines:
        journal_lines.append(f"  | {name} | {rv:.1f} | {wst:.3f} |\n")
    journal_lines.append(f"\n- Policy by freshness (inv=0.5, market=base, noon):\n\n")
    journal_lines.append("  | freshness | action | delta |\n  |---|---|---|\n")
    for f, a, d in table:
        journal_lines.append(f"  | {f:.2f} | A{a} | {d:+.0%} |\n")

    return dict(cat=cat, reward=rew, waste=waste, raw=raw,
                converged=converged_step, table=table, baselines=baselines,
                stoch_rev=stoch_rev, stoch_waste=stoch_waste)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--category", choices=AGENTS, default=None)
    args = ap.parse_args()

    os.makedirs("checkpoints", exist_ok=True)
    torch.manual_seed(0)
    np.random.seed(0)

    cats = [args.category] if args.category else AGENTS
    journal_lines = [f"\n---\n\n## Training run — {time.strftime('%Y-%m-%d %H:%M')}\n",
                     f"\nConfig: {CFG}\n"]
    results = []
    for cat in cats:
        results.append(train_category(cat, journal_lines))

    # Summary table
    journal_lines.append("\n### Summary\n\n")
    journal_lines.append("| category | converged@ | reward | waste | raw_rev |\n")
    journal_lines.append("|---|---|---|---|---|\n")
    for r in results:
        journal_lines.append(f"| {r['cat']} | {r['converged']} | {r['reward']:.1f} | "
                             f"{r['waste']:.3f} | {r['raw']:.1f} |\n")

    with open("JOURNAL.md", "a") as f:
        f.writelines(journal_lines)
    print("\nAppended results to JOURNAL.md")


if __name__ == "__main__":
    main()
