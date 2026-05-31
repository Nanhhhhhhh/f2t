import numpy as np
import torch
from torch.utils.data import Dataset
from src.env.market_env import MarketEnv, CATEGORIES, OBS_WINDOW, OBS_DIM, EPISODE_LEN
from src.env.freshness import WASTE_THRESHOLD

CATEGORY_IDX = {c: i for i, c in enumerate(CATEGORIES)}


def _random_policy(obs, cat, rng):
    return float(rng.uniform(-0.30, 0.20))

def _markdown_policy(obs, cat, rng):
    return -0.25 if obs[0] < 0.65 else 0.0

def _static_policy(obs, cat, rng):
    return 0.0


def generate_dataset(n_episodes: int = 3000, seed: int = 0) -> list[dict]:
    rng = np.random.default_rng(seed)
    policies = [_random_policy, _markdown_policy, _static_policy]
    records: list[dict] = []

    for ep in range(n_episodes):
        policy_fn = policies[ep % len(policies)]
        env = MarketEnv(seed=int(rng.integers(0, 2**31)))
        env.reset()
        history: dict[str, list] = {c: [] for c in CATEGORIES}

        # Burn-in: fill obs_buffer (OBS_WINDOW days)
        for _ in range(OBS_WINDOW):
            current_obs = env._build_obs()
            deltas = {c: policy_fn(current_obs[c], c, rng) for c in CATEGORIES}
            env.step(deltas)

        # Collect anchors for remaining episode
        for t in range(EPISODE_LEN):
            current_obs = {c: env.obs_window(c) for c in CATEGORIES}
            for c in CATEGORIES:
                history[c].append({
                    "t": t,
                    "obs_window": current_obs[c].copy(),
                    "inv": env._inventory[c],
                    "freshness": env._freshness[c],
                })
            current_obs_step = env._build_obs()
            deltas = {c: policy_fn(current_obs_step[c], c, rng) for c in CATEGORIES}
            env.step(deltas)

        # Build 7-day lookahead labels for each anchor
        for c in CATEGORIES:
            hist = history[c]
            n = len(hist)
            for i in range(n - 7):
                # demand_7d: approximate as sum of inventory decreases over next 7 days
                demand_7d = 0.0
                for j in range(i, i + 7):
                    inv_now  = hist[j]["inv"]
                    inv_next = hist[j + 1]["inv"] if j + 1 < n else 0
                    demand_7d += max(0, inv_now - inv_next)
                waste_7d = int(any(
                    hist[j+1]["freshness"] < WASTE_THRESHOLD and hist[j]["inv"] > 0
                    for j in range(i + 1, i + 8)
                    if j + 1 < len(hist)
                ))
                records.append({
                    "features":     hist[i]["obs_window"].astype(np.float32),
                    "category_idx": CATEGORY_IDX[c],
                    "demand_7d":    float(demand_7d),
                    "waste_7d":     waste_7d,
                })

    return records


class PerishableForecastDataset(Dataset):
    def __init__(self, records: list[dict]) -> None:
        self._records = records

    def __len__(self) -> int:
        return len(self._records)

    def __getitem__(self, idx: int) -> dict:
        r = self._records[idx]
        return {
            "features":     torch.tensor(r["features"], dtype=torch.float32),
            "category_idx": torch.tensor(r["category_idx"], dtype=torch.long),
            "demand_7d":    torch.tensor(r["demand_7d"], dtype=torch.float32),
            "waste_7d":     torch.tensor(float(r["waste_7d"]), dtype=torch.float32),
        }
