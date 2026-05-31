import numpy as np
import pytest
from src.rl.warmstart import collect_mpc_experience, bc_pretrain, seed_buffer
from src.rl.agent import MultiCatDDQNAgent
from src.env.market_env import CATEGORIES


def test_collect_returns_expected_keys():
    transitions = collect_mpc_experience(n_episodes=1, ckpt_path=None)
    assert len(transitions) > 0
    t = transitions[0]
    for key in ("obs", "cat", "cat_id", "action_idx", "reward", "next_obs", "done", "next_mask"):
        assert key in t, f"Missing key: {key}"


def test_collect_action_idx_in_range():
    transitions = collect_mpc_experience(n_episodes=1, ckpt_path=None)
    for t in transitions:
        assert 0 <= t["action_idx"] <= 10


def test_collect_obs_shapes():
    transitions = collect_mpc_experience(n_episodes=1, ckpt_path=None)
    for t in transitions:
        assert t["obs"].shape == (10,)
        assert t["next_obs"].shape == (10,)
        assert t["next_mask"].shape == (11,)


def test_collect_cat_id_matches_cat():
    transitions = collect_mpc_experience(n_episodes=1, ckpt_path=None)
    for t in transitions:
        assert t["cat_id"] == CATEGORIES.index(t["cat"])


def test_bc_pretrain_decreases_loss():
    import torch
    import torch.nn.functional as F
    transitions = collect_mpc_experience(n_episodes=2, ckpt_path=None)
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
    transitions = collect_mpc_experience(n_episodes=2, ckpt_path=None)
    agent = MultiCatDDQNAgent(device="cpu", warmup=0)
    seed_buffer(agent, transitions)
    for cat in CATEGORIES:
        assert len(agent._bufs[cat]) > 0, f"Buffer empty for {cat}"


def test_train_time_limit_stops_immediately():
    from src.rl.train import train_all_categories
    result = train_all_categories(
        n_episodes=10_000,
        time_limit_sec=0,
        verbose=False,
        eval_every=1,
    )
    assert "shared" in result


def test_train_accepts_prebuilt_agent():
    from src.rl.train import train_all_categories
    agent = MultiCatDDQNAgent(device="cpu", warmup=0, batch_size=8)
    # time_limit_sec=0 exits before any train_step, avoiding buffer-underflow with warmup=0
    result = train_all_categories(
        n_episodes=10_000,
        time_limit_sec=0,
        eval_every=9999,
        verbose=False,
        agent=agent,
        ckpt_name="rl_test_tmp.pt",
    )
    assert "shared" in result
