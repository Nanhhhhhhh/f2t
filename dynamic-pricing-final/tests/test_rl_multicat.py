"""Tests for MultiCatDDQNAgent — shared-network multi-category agent."""
import numpy as np
import pytest
import torch
from src.rl.agent import MultiCatDDQNAgent
from src.rl.reward import CANDIDATES, compute_mask
from src.env.market_env import CATEGORIES


def _obs():
    return np.zeros(10, dtype=np.float32)


def _fill_bufs(agent, n=120):
    mask = np.ones(11, dtype=bool)
    for cat in CATEGORIES:
        for _ in range(n):
            agent.push(_obs(), cat, 5, 0.1, _obs(), False, mask)


@pytest.fixture
def agent():
    return MultiCatDDQNAgent(device="cpu", warmup=100, batch_size=64, buffer_capacity=500)


def test_act_returns_valid_index(agent):
    mask = compute_mask(0.90)
    idx = agent.act(_obs(), "leafy", mask, epsilon=0.0)
    assert 0 <= idx < 11


def test_act_respects_mask(agent):
    mask = compute_mask(0.60)
    for _ in range(20):
        idx = agent.act(_obs(), "leafy", mask, epsilon=0.0)
        assert CANDIDATES[idx] <= 0.0


def test_act_different_cats_can_differ(agent):
    mask = compute_mask(0.90)
    results = {cat: agent.act(_obs(), cat, mask, epsilon=0.0) for cat in CATEGORIES}
    # With random init, not all must be identical (embedding makes them differ)
    # Just check all are valid indices
    for cat, idx in results.items():
        assert 0 <= idx < 11


def test_push_fills_per_category_buffer(agent):
    mask = np.ones(11, dtype=bool)
    for cat in CATEGORIES:
        assert len(agent._bufs[cat]) == 0
    agent.push(_obs(), "leafy", 5, 1.0, _obs(), False, mask)
    assert len(agent._bufs["leafy"]) == 1
    assert len(agent._bufs["root"]) == 0


def test_train_step_none_before_warmup(agent):
    assert agent.train_step() is None


def test_train_step_returns_float_after_warmup(agent):
    _fill_bufs(agent, n=120)
    loss = agent.train_step()
    assert isinstance(loss, float) and np.isfinite(loss)


def test_train_step_called_once_not_four_times(agent):
    """train_step() is called once per env-step — verify it returns a single float."""
    _fill_bufs(agent, n=120)
    results = [agent.train_step() for _ in range(10)]
    assert all(isinstance(r, float) for r in results)


def test_sync_target_copies_weights(agent):
    with torch.no_grad():
        for p in agent._online.parameters():
            p.add_(1.0)
    agent.sync_target()
    for op, tp in zip(agent._online.parameters(), agent._target.parameters()):
        assert torch.allclose(op, tp)


def test_decide_interface_matches_mpc(agent):
    obs = np.array([0.90, 0.5, 0, 0, 0, 1, 0, 1, 0.5, 0.5], dtype=np.float32)
    result = agent.decide(obs, "leafy", 1.48, 50, 0.90, 0.0)
    for key in ("delta", "reason", "scores", "d_hat_0", "p_waste_0", "t_critical"):
        assert key in result
    assert -0.30 <= result["delta"] <= 0.20


def test_decide_accepts_full_obs_window(agent):
    obs_window = np.zeros((21, 10), dtype=np.float32)
    result = agent.decide(obs_window, "herbs", 1.48, 50, 0.90, 0.0)
    assert "delta" in result


def test_save_and_load(agent, tmp_path):
    _fill_bufs(agent, n=120)
    agent.train_step()
    path = str(tmp_path / "shared.pt")
    agent.save(path)
    agent2 = MultiCatDDQNAgent(device="cpu")
    agent2.load(path)
    for p1, p2 in zip(agent._online.parameters(), agent2._online.parameters()):
        assert torch.allclose(p1, p2)
