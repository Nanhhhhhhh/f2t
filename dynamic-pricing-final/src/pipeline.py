import numpy as np
from src.env.market_env import MarketEnv, CATEGORIES


def run_episode(policy_fn, seed: int) -> dict:
    """Run one episode with policy_fn(obs_window, category, env) -> delta.
    Returns: {waste_event_rate, total_revenue, per_cat_waste, per_cat_revenue}
    """
    env = MarketEnv(seed=seed)
    env.reset()
    waste_events = {c: 0 for c in CATEGORIES}
    revenues     = {c: 0.0 for c in CATEGORIES}

    done = False
    while not done:
        deltas = {}
        for cat in CATEGORIES:
            obs_w = env.obs_window(cat)
            deltas[cat] = policy_fn(obs_w, cat, env)
        obs, info, done, _ = env.step(deltas)
        for cat in CATEGORIES:
            revenues[cat] += env._prices[cat] * env._demand_yesterday[cat]
        for cat, units in info.get("waste_events", {}).items():
            waste_events[cat] += 1

    total_steps = 91 * len(CATEGORIES)
    waste_rate = sum(waste_events.values()) / total_steps
    return {
        "waste_event_rate": waste_rate,
        "total_revenue": sum(revenues.values()),
        "per_cat_waste": waste_events,
        "per_cat_revenue": revenues,
    }


def run_n_episodes(policy_fn, n: int = 200, base_seed: int = 0) -> list[dict]:
    return [run_episode(policy_fn, seed=base_seed + i) for i in range(n)]
