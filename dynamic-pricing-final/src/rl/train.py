from __future__ import annotations
import numpy as np
import pathlib
import time
from typing import Optional

from src.env.market_env import MarketEnv, CATEGORIES, OBS_DIM
from src.rl.agent import MultiCatDDQNAgent
from src.rl.reward import compute_reward, compute_mask, CANDIDATES

EPISODES = 3_000
EPSILON_START = 1.0
EPSILON_END = 0.05
EPSILON_DECAY_EP = 2_000
TARGET_SYNC_STEPS = 500
EVAL_EVERY = 500
EVAL_EPISODES = 10


def _epsilon(episode: int) -> float:
    frac = min(1.0, episode / EPSILON_DECAY_EP)
    return EPSILON_START + frac * (EPSILON_END - EPSILON_START)


def _eval_waste(agent: MultiCatDDQNAgent, n: int = EVAL_EPISODES) -> float:
    from src.pipeline import run_n_episodes
    from src.rl.evaluate import ddqn_policy
    eps = run_n_episodes(ddqn_policy(agent), n=n, base_seed=9999)
    return float(np.mean([e["waste_event_rate"] for e in eps]))


def train_all_categories(
    n_episodes: int = EPISODES,
    device: Optional[str] = None,
    ckpt_dir: str = "checkpoints",
    ckpt_name: Optional[str] = None,
    verbose: bool = True,
    forecaster_path: Optional[str] = None,
    epsilon_start: float = EPSILON_START,
    epsilon_decay_ep: int = EPSILON_DECAY_EP,
    warmup: int = 1_000,
    eval_every: int = EVAL_EVERY,
    time_limit_sec: Optional[float] = None,
    agent: Optional[MultiCatDDQNAgent] = None,
    update_every: int = 4,
) -> dict[str, str]:
    """Train shared DDQN agent across all categories. Returns dict of checkpoint paths.

    agent: if provided, skip agent construction (used by warm-start script).
    ckpt_name: override default checkpoint filename.
    time_limit_sec: stop training after this many seconds, saving best checkpoint before exit.
    epsilon_start / epsilon_decay_ep: override default ε schedule.
    warmup: minimum buffer size before gradient steps (ignored when agent is provided).
    eval_every: run waste evaluation every N episodes.
    """
    import torch
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
        print(f"eval_every={eval_every}  time_limit={time_limit_sec}s")

    best_waste = float("inf")
    global_step = 0
    env = MarketEnv()
    ref_prices = {cat: env._demand_model._params[cat]["ref_price"] for cat in CATEGORIES}
    t_start = time.time()

    for episode in range(n_episodes):
        if time_limit_sec is not None and (time.time() - t_start) > time_limit_sec:
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
                flat_obs = env.obs(cat).copy()
                obs[cat] = np.concatenate([flat_obs, fc_feats[cat]]) if use_forecaster else flat_obs
                mask = compute_mask(env._freshness[cat], cat)
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
                    ref_price=ref_prices[cat],
                    sold=env._demand_yesterday[cat],
                    waste_units=waste_units,
                    delta=deltas[cat],
                    prev_delta=prev_deltas[cat],
                    freshness=prev_freshness[cat],
                    cat=cat,
                )
                next_obs = env.obs(cat)
                if use_forecaster:
                    next_obs = np.concatenate([next_obs, next_fc_feats[cat]])
                next_mask = compute_mask(env._freshness[cat], cat)
                agent.push(obs[cat], cat, action_idxs[cat], reward,
                           next_obs, done, next_mask)

            global_step += 1
            if global_step % update_every == 0:
                agent.train_step()
            if global_step % TARGET_SYNC_STEPS == 0:
                agent.sync_target()

        if (episode + 1) % eval_every == 0:
            t0 = time.time()
            waste = _eval_waste(agent)
            dt = time.time() - t0
            if verbose:
                print(f"[ep {episode+1:5d}/{n_episodes}] ε={eps:.3f}  "
                      f"eval_waste={waste:.4f}  ({dt:.1f}s)")
            if waste < best_waste:
                best_waste = waste
                agent.save(ckpt_path)
                if verbose:
                    print(f"  → best waste={waste:.4f}, checkpoint updated")

    return {"shared": ckpt_path}
