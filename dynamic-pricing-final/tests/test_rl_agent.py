import numpy as np
import pytest
import torch
from src.rl.agent import DuelingDDQNAgent
from src.rl.reward import CANDIDATES, compute_mask


@pytest.fixture
def agent():
    return DuelingDDQNAgent(device="cpu", warmup=10, batch_size=8, buffer_capacity=100)


def _dummy_obs():
    return np.zeros(10, dtype=np.float32)


def test_act_returns_valid_index_greedy(agent):
    mask = compute_mask(0.90)
    idx = agent.act(_dummy_obs(), mask, epsilon=0.0)
    assert 0 <= idx < 11


def test_act_respects_mask_greedy(agent):
    mask = compute_mask(0.60)
    for _ in range(20):
        idx = agent.act(_dummy_obs(), mask, epsilon=0.0)
        assert CANDIDATES[idx] <= 0.0, f"Chose positive delta {CANDIDATES[idx]} at f=0.60"


def test_act_explores_only_within_mask(agent):
    mask = compute_mask(0.60)
    for _ in range(200):
        idx = agent.act(_dummy_obs(), mask, epsilon=1.0)
        assert CANDIDATES[idx] <= 0.0, f"Chose positive delta in exploration: {CANDIDATES[idx]}"


def test_act_discard_zone_always_zero(agent):
    mask = compute_mask(0.50)
    for _ in range(10):
        idx = agent.act(_dummy_obs(), mask, epsilon=1.0)
        assert CANDIDATES[idx] == pytest.approx(0.0)


def test_push_increases_buffer(agent):
    assert len(agent._buf) == 0
    mask = np.ones(11, dtype=bool)
    agent.push(_dummy_obs(), 3, 1.0, _dummy_obs(), False, mask)
    assert len(agent._buf) == 1


def test_train_step_returns_none_before_warmup(agent):
    loss = agent.train_step()
    assert loss is None


def test_train_step_returns_float_after_warmup(agent):
    mask = np.ones(11, dtype=bool)
    for _ in range(15):
        agent.push(_dummy_obs(), 3, 1.0, _dummy_obs(), False, mask)
    loss = agent.train_step()
    assert isinstance(loss, float)
    assert np.isfinite(loss)


def test_sync_target_copies_weights(agent):
    with torch.no_grad():
        for p in agent._online.parameters():
            p.add_(1.0)
    online_p = next(agent._online.parameters())
    target_p = next(agent._target.parameters())
    assert not torch.allclose(online_p, target_p)
    agent.sync_target()
    for op, tp in zip(agent._online.parameters(), agent._target.parameters()):
        assert torch.allclose(op, tp)


def test_decide_interface_matches_mpc(agent):
    obs = np.tile(np.array([0.90, 0.5, 0, 0, 0, 1, 0, 1, 0.5, 0.5], dtype=np.float32), (21, 1))
    result = agent.decide(obs, "leafy", 1.48, 50, 0.90, 0.0)
    for key in ("delta", "reason", "scores", "d_hat_0", "p_waste_0", "t_critical"):
        assert key in result, f"Missing key: {key}"
    assert -0.30 <= result["delta"] <= 0.20


def test_decide_respects_mask_at_low_freshness(agent):
    obs = np.tile(np.array([0.60, 0.5, 0, 0, 0, 1, 0, 1, 0.3, 0.5], dtype=np.float32), (21, 1))
    for _ in range(20):
        result = agent.decide(obs, "leafy", 1.48, 50, 0.60, 0.0)
        assert result["delta"] <= 0.0, f"Positive delta {result['delta']} at f=0.60"


def test_save_and_load(agent, tmp_path):
    path = str(tmp_path / "test_agent.pt")
    agent.save(path)
    agent2 = DuelingDDQNAgent(device="cpu")
    agent2.load(path)
    for p1, p2 in zip(agent._online.parameters(), agent2._online.parameters()):
        assert torch.allclose(p1, p2)

