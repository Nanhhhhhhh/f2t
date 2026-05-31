# MPC Warm-Start for DDQN — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Warm-start the DDQN agent from MPC experience so it produces freshness-aware pricing (matching or beating the MPC trajectory table) within a 30-minute RL fine-tune budget.

**Architecture:** Three modes — A (buffer seeding only), B (BC pre-train + lower ε), C (BC + buffer seeding). All share a `collect_mpc_experience()` function that runs the MPC controller on `MarketEnv` and stores `(obs, cat, action_idx, reward, next_obs, done, next_mask)` transitions. A CLI script drives each mode, reusing the extended `train_all_categories()` for the RL fine-tune phase.

**Tech Stack:** Python 3.13, PyTorch, NumPy, `src.rl.agent.MultiCatDDQNAgent`, `src.mpc.controller.MPC`, `src.env.market_env.MarketEnv`

**Working directory:** All commands run from `/Users/macos/dynamic-pricing-v3/.claude/worktrees/feature+ddqn-pricing`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/rl/warmstart.py` | **Create** | `collect_mpc_experience`, `bc_pretrain`, `seed_buffer` |
| `src/rl/train.py` | **Modify** | Add `epsilon_start`, `epsilon_decay_ep`, `warmup`, `eval_every`, `time_limit_sec`, `agent` params to `train_all_categories()` |
| `scripts/warmstart_train.py` | **Create** | CLI entrypoint: collect → warm-start → RL fine-tune for modes A/B/C |
| `scripts/compare_warmstart.py` | **Create** | Print 14-day trajectory table for MPC + all three RL checkpoints |
| `tests/test_rl_warmstart.py` | **Create** | Unit tests for all three warmstart functions + train param changes |

---

## Task 1: `src/rl/warmstart.py` — skeleton + `collect_mpc_experience`

**Files:**
- Create: `src/rl/warmstart.py`
- Create: `tests/test_rl_warmstart.py`

- [ ] **Step 1.1: Write failing tests**

Create `tests/test_rl_warmstart.py`:

```python
import numpy as np
import pytest
from src.rl.warmstart import collect_mpc_experience, bc_pretrain, seed_buffer
from src.rl.agent import MultiCatDDQNAgent
from src.env.market_env import CATEGORIES


def test_collect_returns_expected_keys():
    transitions = collect_mpc_experience(n_episodes=1)
    assert len(transitions) > 0
    t = transitions[0]
    for key in ("obs", "cat", "cat_id", "action_idx", "reward", "next_obs", "done", "next_mask"):
        assert key in t, f"Missing key: {key}"


def test_collect_action_idx_in_range():
    transitions = collect_mpc_experience(n_episodes=1)
    for t in transitions:
        assert 0 <= t["action_idx"] <= 10


def test_collect_obs_shapes():
    transitions = collect_mpc_experience(n_episodes=1)
    for t in transitions:
        assert t["obs"].shape == (11,)
        assert t["next_obs"].shape == (11,)
        assert t["next_mask"].shape == (11,)


def test_collect_cat_id_matches_cat():
    transitions = collect_mpc_experience(n_episodes=1)
    for t in transitions:
        assert t["cat_id"] == CATEGORIES.index(t["cat"])


def test_bc_pretrain_decreases_loss():
    import torch
    import torch.nn.functional as F
    transitions = collect_mpc_experience(n_episodes=2)
    agent = MultiCatDDQNAgent(device="cpu", warmup=0, batch_size=32)
    obs     = torch.tensor(np.array([t["obs"]        for t in transitions[:32]]), dtype=torch.float32)
    cat_ids = torch.tensor(np.array([t["cat_id"]     for t in transitions[:32]]), dtype=torch.long)
    acts    = torch.tensor(np.array([t["action_idx"] for t in transitions[:32]]), dtype=torch.long)
    with torch.no_grad():
        loss_before = F.cross_entropy(agent._online(obs, cat_ids), acts).item()
    bc_pretrain(agent, transitions, n_steps=200, batch_size=32)
    with torch.no_grad():
        loss_after = F.cross_entropy(agent._online(obs, cat_ids), acts).item()
    assert loss_after < loss_before, f"BC loss did not decrease: {loss_before:.4f} → {loss_after:.4f}"


def test_seed_buffer_fills_all_categories():
    transitions = collect_mpc_experience(n_episodes=2)
    agent = MultiCatDDQNAgent(device="cpu", warmup=0)
    seed_buffer(agent, transitions)
    for cat in CATEGORIES:
        assert len(agent._bufs[cat]) > 0, f"Buffer empty for {cat}"
```

- [ ] **Step 1.2: Run tests — expect ImportError (module doesn't exist yet)**

```bash
cd /Users/macos/dynamic-pricing-v3/.claude/worktrees/feature+ddqn-pricing
python -m pytest tests/test_rl_warmstart.py -v 2>&1 | head -20
```

Expected: `ImportError: cannot import name 'collect_mpc_experience' from 'src.rl.warmstart'` (or ModuleNotFoundError)

- [ ] **Step 1.3: Implement `src/rl/warmstart.py` with all three functions**

Create `src/rl/warmstart.py`:

```python
from __future__ import annotations
import numpy as np
import torch
import torch.nn.functional as F

from src.env.market_env import MarketEnv, CATEGORIES
from src.mpc.controller import MPC, MPCConfig
from src.rl.reward import CANDIDATES, compute_reward, compute_mask


def collect_mpc_experience(
    n_episodes: int = 100,
    ckpt_path: str = "checkpoints/forecaster_v4_best.pt",
) -> list[dict]:
    """Run MPC on MarketEnv and collect transitions for RL warm-start.

    Each transition: {obs(11,), cat, cat_id, action_idx, reward, next_obs(11,), done, next_mask(11,)}
    action_idx is the CANDIDATES index closest to MPC's returned delta.
    """
    mpc = MPC(MPCConfig(), ckpt_path=ckpt_path)
    env = MarketEnv()
    transitions: list[dict] = []

    for ep in range(n_episodes):
        env.reset(seed=ep)
        done = False
        while not done:
            prev_freshness = {cat: env._freshness[cat] for cat in CATEGORIES}
            prev_deltas    = {cat: env._prev_delta[cat] for cat in CATEGORIES}

            deltas: dict[str, float] = {}
            obs_flat: dict[str, np.ndarray] = {}
            for cat in CATEGORIES:
                obs_flat[cat] = env.obs(cat).copy()
                result = mpc.decide(
                    env.obs_window(cat), cat,
                    env._prices[cat], env._inventory[cat],
                    env._freshness[cat], prev_deltas[cat],
                )
                deltas[cat] = result["delta"]

            _, info, done, _ = env.step(deltas)

            for cat in CATEGORIES:
                action_idx  = int(np.argmin(np.abs(CANDIDATES - deltas[cat])))
                waste_units = info.get("waste_events", {}).get(cat, 0)
                reward = compute_reward(
                    price=env._prices[cat],
                    sold=env._demand_yesterday[cat],
                    waste_units=waste_units,
                    delta=deltas[cat],
                    prev_delta=prev_deltas[cat],
                    freshness=prev_freshness[cat],
                )
                transitions.append({
                    "obs":        obs_flat[cat],
                    "cat":        cat,
                    "cat_id":     CATEGORIES.index(cat),
                    "action_idx": action_idx,
                    "reward":     float(reward),
                    "next_obs":   env.obs(cat).copy(),
                    "done":       float(done),
                    "next_mask":  compute_mask(env._freshness[cat]),
                })

    return transitions


def bc_pretrain(
    agent,
    transitions: list[dict],
    n_steps: int = 500,
    batch_size: int = 256,
) -> None:
    """Behavioral cloning: minimise cross-entropy(Q, MPC_action) so argmax Q ≈ MPC policy.

    Modifies agent._online in-place and syncs target at the end.
    """
    obs_arr = np.array([t["obs"]        for t in transitions], dtype=np.float32)
    cat_arr = np.array([t["cat_id"]     for t in transitions], dtype=np.int64)
    act_arr = np.array([t["action_idx"] for t in transitions], dtype=np.int64)
    n = len(transitions)

    for _ in range(n_steps):
        idxs    = np.random.randint(0, n, batch_size)
        obs     = torch.tensor(obs_arr[idxs]).to(agent.device)
        cat_ids = torch.tensor(cat_arr[idxs]).to(agent.device)
        actions = torch.tensor(act_arr[idxs]).to(agent.device)

        q    = agent._online(obs, cat_ids)       # (B, 11)
        loss = F.cross_entropy(q, actions)

        agent._opt.zero_grad()
        loss.backward()
        torch.nn.utils.clip_grad_norm_(agent._online.parameters(), 10.0)
        agent._opt.step()

    agent.sync_target()


def seed_buffer(agent, transitions: list[dict]) -> None:
    """Pre-fill agent replay buffers with MPC transitions (one per category buffer)."""
    for t in transitions:
        agent.push(
            t["obs"], t["cat"], t["action_idx"], t["reward"],
            t["next_obs"], bool(t["done"]), t["next_mask"],
        )
```

- [ ] **Step 1.4: Run tests — expect all pass**

```bash
python -m pytest tests/test_rl_warmstart.py -v
```

Expected output (all 6 tests pass, ~60s for the BC loss test):
```
PASSED tests/test_rl_warmstart.py::test_collect_returns_expected_keys
PASSED tests/test_rl_warmstart.py::test_collect_action_idx_in_range
PASSED tests/test_rl_warmstart.py::test_collect_obs_shapes
PASSED tests/test_rl_warmstart.py::test_collect_cat_id_matches_cat
PASSED tests/test_rl_warmstart.py::test_bc_pretrain_decreases_loss
PASSED tests/test_rl_warmstart.py::test_seed_buffer_fills_all_categories
```

- [ ] **Step 1.5: Commit**

```bash
git add src/rl/warmstart.py tests/test_rl_warmstart.py
git commit -m "feat(rl): warmstart module — collect_mpc_experience, bc_pretrain, seed_buffer"
```

---

## Task 2: Extend `train_all_categories()` with warm-start params

**Files:**
- Modify: `src/rl/train.py`

The current signature lacks: `epsilon_start`, `epsilon_decay_ep`, `warmup`, `eval_every`, `time_limit_sec`, `agent`. The warm-start script needs all of these to hand in a pre-built agent and control the ε schedule.

- [ ] **Step 2.1: Write failing test**

Add to `tests/test_rl_warmstart.py`:

```python
def test_train_time_limit_stops_immediately():
    """time_limit_sec=0 must exit before completing any episode."""
    from src.rl.train import train_all_categories
    result = train_all_categories(
        n_episodes=10_000,
        time_limit_sec=0,
        verbose=False,
        eval_every=1,
    )
    assert "shared" in result


def test_train_accepts_prebuilt_agent():
    """Passing agent= should not raise and should use that agent."""
    from src.rl.train import train_all_categories
    agent = MultiCatDDQNAgent(device="cpu", warmup=0, batch_size=8)
    result = train_all_categories(
        n_episodes=2,
        time_limit_sec=30,
        eval_every=9999,
        verbose=False,
        agent=agent,
        ckpt_name="rl_test_tmp.pt",
    )
    assert "shared" in result
```

- [ ] **Step 2.2: Run tests — expect FAIL (unexpected keyword arguments)**

```bash
python -m pytest tests/test_rl_warmstart.py::test_train_time_limit_stops_immediately tests/test_rl_warmstart.py::test_train_accepts_prebuilt_agent -v
```

Expected: `TypeError: train_all_categories() got an unexpected keyword argument 'time_limit_sec'`

- [ ] **Step 2.3: Modify `src/rl/train.py`**

Replace the `train_all_categories` signature and body. Full new version of the function (keep `_epsilon`, `_eval_waste`, and module-level constants unchanged above it):

```python
def train_all_categories(
    n_episodes: int = EPISODES,
    device: Optional[str] = None,
    ckpt_dir: str = "checkpoints",
    ckpt_name: Optional[str] = None,
    verbose: bool = True,
    pretrained_lstm_path: Optional[str] = None,
    forecaster_path: Optional[str] = None,
    epsilon_start: float = EPSILON_START,
    epsilon_decay_ep: int = EPSILON_DECAY_EP,
    warmup: int = 1_000,
    eval_every: int = EVAL_EVERY,
    time_limit_sec: Optional[float] = None,
    agent: Optional[MultiCatDDQNAgent] = None,
) -> dict[str, str]:
    """Train shared DDQN agent across all categories. Returns dict of checkpoint paths.

    agent: if provided, skip agent construction (used by warm-start script).
    ckpt_name: override default checkpoint filename.
    time_limit_sec: stop training after this many seconds (saves best before exit).
    epsilon_start / epsilon_decay_ep: override default ε schedule.
    warmup: minimum buffer size before gradient steps (ignored if agent is provided).
    eval_every: evaluate waste every N episodes (default 500; use 200 for warm-start).
    """
    import torch
    import time as _time
    if device is None:
        device = "mps" if torch.backends.mps.is_available() else "cpu"

    use_forecaster = forecaster_path is not None

    if agent is None:
        agent = MultiCatDDQNAgent(
            device=device,
            forecaster_path=forecaster_path,
            warmup=warmup,
        )

    if ckpt_name is None:
        ckpt_name = "rl_shared_forecaster_best.pt" if use_forecaster else "rl_shared_best.pt"
    ckpt_path = f"{ckpt_dir}/{ckpt_name}"
    pathlib.Path(ckpt_dir).mkdir(parents=True, exist_ok=True)

    if verbose:
        print(f"Training on device: {device}")
        print(f"ε schedule: start={epsilon_start}, decay_ep={epsilon_decay_ep}, end={EPSILON_END}")
        print(f"eval_every={eval_every}, time_limit={time_limit_sec}s")

    best_waste = float("inf")
    global_step = 0
    env = MarketEnv()
    t_start = _time.time()

    for episode in range(n_episodes):
        if time_limit_sec is not None and (_time.time() - t_start) > time_limit_sec:
            if verbose:
                print(f"Time limit {time_limit_sec:.0f}s reached at episode {episode}, stopping.")
            break

        frac = min(1.0, episode / max(1, epsilon_decay_ep))
        eps  = epsilon_start + frac * (EPSILON_END - epsilon_start)
        env.reset(seed=episode)

        for _ in range(91):
            obs: dict[str, np.ndarray] = {}
            action_idxs: dict[str, int] = {}
            prev_freshness = {cat: env._freshness[cat] for cat in CATEGORIES}
            prev_deltas    = {cat: env._prev_delta[cat] for cat in CATEGORIES}

            if use_forecaster:
                fc_feats = agent._forecaster.encode_batch(
                    {cat: env.obs_window(cat) for cat in CATEGORIES}
                )
            for cat in CATEGORIES:
                flat_obs = env.obs(cat)
                obs[cat] = np.concatenate([flat_obs, fc_feats[cat]]) if use_forecaster else flat_obs
                mask = compute_mask(env._freshness[cat])
                action_idxs[cat] = agent.act(obs[cat], cat, mask, eps)

            deltas = {cat: float(CANDIDATES[action_idxs[cat]]) for cat in CATEGORIES}
            _, info, done, _ = env.step(deltas)

            if use_forecaster:
                next_fc_feats = agent._forecaster.encode_batch(
                    {cat: env.obs_window(cat) for cat in CATEGORIES}
                )
            for cat in CATEGORIES:
                waste_units = info.get("waste_events", {}).get(cat, 0)
                reward = compute_reward(
                    price=env._prices[cat],
                    sold=env._demand_yesterday[cat],
                    waste_units=waste_units,
                    delta=deltas[cat],
                    prev_delta=prev_deltas[cat],
                    freshness=prev_freshness[cat],
                )
                next_obs = env.obs(cat)
                if use_forecaster:
                    next_obs = np.concatenate([next_obs, next_fc_feats[cat]])
                next_mask = compute_mask(env._freshness[cat])
                agent.push(obs[cat], cat, action_idxs[cat], reward,
                           next_obs, done, next_mask)

            agent.train_step()
            global_step += 1
            if global_step % TARGET_SYNC_STEPS == 0:
                agent.sync_target()

        if (episode + 1) % eval_every == 0:
            t0 = _time.time()
            waste = _eval_waste(agent)
            dt = _time.time() - t0
            if verbose:
                print(f"[ep {episode+1:5d}/{n_episodes}] ε={eps:.3f}  "
                      f"eval_waste={waste:.4f}  ({dt:.1f}s)")
            if waste < best_waste:
                best_waste = waste
                agent.save(ckpt_path)
                if verbose:
                    print(f"  → best waste={waste:.4f}, checkpoint updated")

    return {"shared": ckpt_path}
```

Also add `Optional` to the imports at the top of `train.py` if not already present:
```python
from typing import Optional
```

- [ ] **Step 2.4: Run tests — expect pass**

```bash
python -m pytest tests/test_rl_warmstart.py -v
```

Expected: all 8 tests pass.

- [ ] **Step 2.5: Run existing train tests to check no regressions**

```bash
python -m pytest tests/test_rl_agent.py tests/test_rl_evaluate.py tests/test_rl_network.py tests/test_rl_replay.py tests/test_rl_reward.py -v
```

Expected: all pass.

- [ ] **Step 2.6: Commit**

```bash
git add src/rl/train.py tests/test_rl_warmstart.py
git commit -m "feat(rl): extend train_all_categories — epsilon_start, warmup, time_limit, agent override"
```

---

## Task 3: `scripts/warmstart_train.py` — CLI entrypoint

**Files:**
- Create: `scripts/warmstart_train.py`

- [ ] **Step 3.1: Create the script**

```python
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

TIME_LIMIT_SEC = 1800  # 30 minutes

# Per-mode ε schedule and buffer settings
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
                        help="Max RL episodes (time_limit_sec=1800 will stop earlier)")
    parser.add_argument("--ckpt-dir", default="checkpoints")
    args = parser.parse_args()

    cfg = MODE_CFG[args.mode]
    ckpt_name = f"rl_warmstart_{args.mode}_best.pt"

    # ── 1. Collect MPC experience ─────────────────────────────────────────────
    print(f"\n=== Mode {args.mode}: collecting {args.n_collect} MPC episodes ===")
    transitions = collect_mpc_experience(n_episodes=args.n_collect)
    print(f"  {len(transitions)} transitions collected across all categories")

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
          f"ε_decay={cfg['epsilon_decay_ep']}ep, time_limit=30min → {ckpt_name}")
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
    )
    print(f"\nDone. Checkpoint saved to {args.ckpt_dir}/{ckpt_name}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 3.2: Smoke-test with a tiny run (2 collect episodes, 5 RL episodes)**

```bash
python scripts/warmstart_train.py --mode B --n-collect 2 --n-episodes 5
```

Expected: prints collection count, BC done, then RL loop prints nothing (eval_every=200 > 5 episodes), exits cleanly. No exceptions.

- [ ] **Step 3.3: Commit**

```bash
git add scripts/warmstart_train.py
git commit -m "feat: warmstart_train.py CLI — modes A/B/C, 30-min RL fine-tune"
```

---

## Task 4: `scripts/compare_warmstart.py` — trajectory table

**Files:**
- Create: `scripts/compare_warmstart.py`

- [ ] **Step 4.1: Create the script**

```python
#!/usr/bin/env python
"""Compare 14-day trajectory tables: MPC vs RL warmstart modes A, B, C."""
from __future__ import annotations
import sys
import os
sys.path.insert(0, ".")

import numpy as np
from src.env.freshness import DAILY_DECAY, WASTE_THRESHOLD
from src.env.market_env import OBS_DIM, OBS_WINDOW, CATEGORIES


def run_trajectory(decider, category, f0=0.95, inv=80, days=14):
    """Run 14-day trajectory for a single category using any decide() interface."""
    from src.env.demand import CrossDemandModel
    demand = CrossDemandModel.from_json("data/params/demand_params.json")
    ref = demand._params[category]["ref_price"]
    c = DAILY_DECAY[category]
    f, prev_delta, price = f0, 0.0, ref
    rows = {}
    for day in range(1, days + 1):
        if f <= WASTE_THRESHOLD:
            for d in range(day, days + 1):
                rows[d] = ("—", "DISC")
            break
        obs_row = np.zeros(OBS_DIM, dtype=np.float32)
        obs_row[0] = f
        obs_row[1] = inv / 100.0
        obs_row[2] = price / ref
        obs_row[7] = prev_delta
        obs_row[8] = 1.0
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
    from src.rl.evaluate import load_agents, DDQNMultiAgent
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
```

- [ ] **Step 4.2: Smoke-test (MPC only, no RL checkpoints yet)**

```bash
python scripts/compare_warmstart.py
```

Expected: prints MPC table (matching the spec baseline exactly), then skips A/B/C with "checkpoint not found".

- [ ] **Step 4.3: Commit**

```bash
git add scripts/compare_warmstart.py
git commit -m "feat: compare_warmstart.py — trajectory table for MPC + all three RL modes"
```

---

## Task 5: Run Mode B (30-min training)

- [ ] **Step 5.1: Launch Mode B**

```bash
python scripts/warmstart_train.py --mode B
```

This runs for up to 30 minutes. Expected output pattern:
```
=== Mode B: collecting 100 MPC episodes ===
  36400 transitions collected across all categories
  BC pre-training (500 steps)...
  BC done.

  RL fine-tune: ε_start=0.15, ε_decay=500ep, time_limit=30min → rl_warmstart_B_best.pt
Training on device: mps
ε schedule: start=0.15, decay_ep=500, end=0.05
[ep   200/3000] ε=0.112  eval_waste=0.XXXX  (Xs)
  → best waste=0.XXXX, checkpoint updated
[ep   400/3000] ...
Time limit 1800s reached at episode XXXX, stopping.
Done. Checkpoint saved to checkpoints/rl_warmstart_B_best.pt
```

- [ ] **Step 5.2: Compare trajectory table**

```bash
python scripts/compare_warmstart.py
```

**Pass criteria (from spec):**
- Mode B delta sign matches MPC for ≥80% of non-DISC cells
- leafy day 1: delta > 0
- root day 10: delta < −0.10
- |RL_delta − MPC_delta| ≤ 0.05 on ≥80% of non-DISC cells

---

## Task 6: Run Mode A, then Mode C

- [ ] **Step 6.1: Run Mode A**

```bash
python scripts/warmstart_train.py --mode A
```

- [ ] **Step 6.2: Run Mode C**

```bash
python scripts/warmstart_train.py --mode C
```

- [ ] **Step 6.3: Full comparison**

```bash
python scripts/compare_warmstart.py
```

Check mode ranking: Mode C waste ≤ Mode B waste ≤ Mode A waste. If not, note the result — it may mean BC is overfitting MPC's suboptimal actions (per spec criterion 5).

- [ ] **Step 6.4: Final commit on branch**

```bash
git add -p   # review any uncommitted changes
git commit -m "results: MPC warm-start A/B/C — trajectory tables and checkpoints"
```

---

## Self-Review

**Spec coverage:**
- `collect_mpc_experience` ✓ Task 1
- `bc_pretrain` ✓ Task 1
- `seed_buffer` ✓ Task 1
- `train_all_categories` param extensions ✓ Task 2
- `scripts/warmstart_train.py` modes A/B/C ✓ Task 3
- `scripts/compare_warmstart.py` ✓ Task 4
- 30-min kill via `time_limit_sec` ✓ Tasks 2+3
- `eval_every=200` for warm-start ✓ Task 3 (passed to `train_all_categories`)
- Success criteria check ✓ Tasks 5+6

**Placeholder scan:** No TBD, no "implement later", all code blocks complete.

**Type consistency:**
- `agent.push(obs, cat, action_idx, reward, next_obs, done, next_mask)` — matches `MultiCatDDQNAgent.push()` signature in `agent.py:push(self, obs, cat, action, reward, next_obs, done, next_mask)`
- `agent._online(obs, cat_ids)` — matches `SharedMLPDuelingQNet.forward(obs, cat_ids, mask=None)`
- `train_all_categories(agent=agent, ckpt_name=..., ...)` — all new params match Task 2 definition
