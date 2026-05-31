from __future__ import annotations
import os
import numpy as np
import torch
import torch.nn.functional as F

from src.env.market_env import MarketEnv, CATEGORIES
from src.mpc.controller import MPC, MPCConfig
from src.rl.reward import CANDIDATES, compute_reward, compute_mask

_CAT_IDS = {cat: i for i, cat in enumerate(CATEGORIES)}


def _save_transitions(transitions: list[dict], path: str) -> None:
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    np.savez_compressed(
        path,
        obs        = np.array([t["obs"]        for t in transitions], dtype=np.float32),
        cat_ids    = np.array([t["cat_id"]      for t in transitions], dtype=np.int32),
        action_idxs= np.array([t["action_idx"]  for t in transitions], dtype=np.int32),
        rewards    = np.array([t["reward"]       for t in transitions], dtype=np.float32),
        next_obs   = np.array([t["next_obs"]     for t in transitions], dtype=np.float32),
        dones      = np.array([t["done"]         for t in transitions], dtype=np.float32),
        next_masks = np.array([t["next_mask"]    for t in transitions], dtype=bool),
    )


def _load_transitions(path: str) -> list[dict]:
    data = np.load(path)
    n = len(data["obs"])
    return [
        {
            "obs":        data["obs"][i],
            "cat":        CATEGORIES[int(data["cat_ids"][i])],
            "cat_id":     int(data["cat_ids"][i]),
            "action_idx": int(data["action_idxs"][i]),
            "reward":     float(data["rewards"][i]),
            "next_obs":   data["next_obs"][i],
            "done":       float(data["dones"][i]),
            "next_mask":  data["next_masks"][i],
        }
        for i in range(n)
    ]


def collect_mpc_experience(
    n_episodes: int = 100,
    ckpt_path: str = "checkpoints/forecaster_v4_best.pt",
    cache_path: str | None = None,
) -> list[dict]:
    """Run MPC on MarketEnv and collect transitions for RL warm-start.

    Batches LSTM forward passes across all 4 categories per step (4x faster).
    Saves to cache_path on first run; subsequent calls load from disk instantly.
    """
    if cache_path and os.path.exists(cache_path):
        print(f"  Loading MPC experience from cache: {cache_path}")
        return _load_transitions(cache_path)

    mpc = MPC(MPCConfig(), ckpt_path=ckpt_path)
    env = MarketEnv()
    ref_prices = {cat: env._demand_model._params[cat]["ref_price"] for cat in CATEGORIES}
    transitions: list[dict] = []
    has_model = mpc._model is not None

    for ep in range(n_episodes):
        env.reset(seed=ep)
        done = False
        while not done:
            prev_freshness = {cat: env._freshness[cat] for cat in CATEGORIES}
            prev_deltas    = {cat: env._prev_delta[cat] for cat in CATEGORIES}

            # Batch LSTM forward for all 4 categories in one pass
            if has_model:
                windows = np.stack([env.obs_window(cat) for cat in CATEGORIES])
                d_hats, p_wastes = mpc._forecast_batch(windows, CATEGORIES)
                forecasts = {cat: (d_hats[i], p_wastes[i]) for i, cat in enumerate(CATEGORIES)}

            deltas: dict[str, float] = {}
            obs_flat: dict[str, np.ndarray] = {}
            for i, cat in enumerate(CATEGORIES):
                obs_flat[cat] = env.obs(cat).copy()
                d_hat_ov, pw_ov = forecasts[cat] if has_model else (None, None)
                result = mpc.decide(
                    env.obs_window(cat), cat,
                    env._prices[cat], env._inventory[cat],
                    env._freshness[cat], prev_deltas[cat],
                    _d_hat_override=d_hat_ov,
                    _p_waste_override=pw_ov,
                )
                deltas[cat] = result["delta"]

            _, info, done, _ = env.step(deltas)

            for cat in CATEGORIES:
                action_idx  = int(np.argmin(np.abs(CANDIDATES - deltas[cat])))
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
                transitions.append({
                    "obs":        obs_flat[cat],
                    "cat":        cat,
                    "cat_id":     _CAT_IDS[cat],
                    "action_idx": action_idx,
                    "reward":     float(reward),
                    "next_obs":   env.obs(cat).copy(),
                    "done":       float(done),
                    "next_mask":  compute_mask(env._freshness[cat], cat),
                })

    if cache_path:
        _save_transitions(transitions, cache_path)
        print(f"  MPC experience cached to: {cache_path}")

    return transitions


def bc_pretrain(
    agent,
    transitions: list[dict],
    n_steps: int = 500,
    batch_size: int = 256,
) -> None:
    """Behavioural cloning: minimise cross-entropy(Q, MPC_action) so argmax Q ≈ MPC policy.

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
