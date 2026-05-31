import numpy as np
import pytest
from unittest.mock import MagicMock
from src.rl.evaluate import ddqn_policy, DDQNMultiAgent, load_agents
from src.env.market_env import CATEGORIES, OBS_WINDOW, OBS_DIM


def _mock_agent(delta_val=0.0):
    """Mock MultiCatDDQNAgent — decide() returns a fixed delta."""
    agent = MagicMock()
    agent.decide.return_value = {
        "delta": delta_val, "reason": "mock", "scores": [],
        "d_hat_0": 0.0, "p_waste_0": 0.0, "t_critical": 0.0,
    }
    return agent


def _mock_env():
    env = MagicMock()
    env._freshness  = {c: 0.80 for c in CATEGORIES}
    env._prices     = {c: 1.5  for c in CATEGORIES}
    env._inventory  = {c: 50   for c in CATEGORIES}
    env._prev_delta = {c: 0.0  for c in CATEGORIES}
    return env


def test_ddqn_policy_returns_float():
    fn = ddqn_policy(_mock_agent(0.10))
    obs = np.zeros((OBS_WINDOW, OBS_DIM), dtype=np.float32)
    delta = fn(obs, "leafy", _mock_env())
    assert isinstance(delta, float)
    assert delta == pytest.approx(0.10)


def test_ddqn_policy_calls_decide_with_correct_category():
    agent = _mock_agent(0.15)
    fn = ddqn_policy(agent)
    obs = np.zeros((OBS_WINDOW, OBS_DIM), dtype=np.float32)
    delta = fn(obs, "root", _mock_env())
    assert delta == pytest.approx(0.15)
    call_args = agent.decide.call_args
    assert call_args[0][1] == "root"


def test_ddqn_multi_agent_decide_routes_to_underlying():
    agent = _mock_agent(-0.10)
    multi = DDQNMultiAgent(agent)
    obs = np.zeros((OBS_WINDOW, OBS_DIM), dtype=np.float32)
    result = multi.decide(obs, "fruit", 1.5, 50, 0.75, 0.0)
    assert result["delta"] == pytest.approx(-0.10)
    agent.decide.assert_called_once()


def test_ddqn_multi_agent_decide_has_mpc_keys():
    multi = DDQNMultiAgent(_mock_agent())
    obs = np.zeros((OBS_WINDOW, OBS_DIM), dtype=np.float32)
    result = multi.decide(obs, "leafy", 1.48, 50, 0.80, 0.0)
    for key in ("delta", "reason", "scores", "d_hat_0", "p_waste_0", "t_critical"):
        assert key in result


def test_load_agents_raises_when_missing_ckpt(tmp_path):
    with pytest.raises(Exception):
        load_agents(ckpt_dir=str(tmp_path))
