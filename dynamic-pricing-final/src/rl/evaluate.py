from __future__ import annotations
from typing import TYPE_CHECKING
import numpy as np

if TYPE_CHECKING:
    from src.rl.agent import MultiCatDDQNAgent

from src.env.market_env import CATEGORIES


class DDQNMultiAgent:
    """Wraps MultiCatDDQNAgent behind a single MPC-compatible decide() interface."""

    def __init__(self, agent: "MultiCatDDQNAgent") -> None:
        self._agent = agent
        from src.env.demand import CrossDemandModel
        self.demand_model = CrossDemandModel.from_json("data/params/demand_params.json")

    def decide(
        self,
        obs_window: np.ndarray,
        category: str,
        current_price: float,
        current_inv: int,
        current_freshness: float,
        prev_delta: float,
    ) -> dict:
        return self._agent.decide(
            obs_window, category, current_price,
            current_inv, current_freshness, prev_delta,
        )


def ddqn_policy(agent: "MultiCatDDQNAgent"):
    """Return a policy_fn compatible with run_n_episodes(policy_fn, n, seed)."""
    def policy_fn(obs_window: np.ndarray, cat: str, env) -> float:
        result = agent.decide(
            obs_window, cat,
            env._prices[cat],
            env._inventory[cat],
            env._freshness[cat],
            env._prev_delta[cat],
        )
        return result["delta"]
    return policy_fn


def load_agents(ckpt_dir: str = "checkpoints", ckpt_name: str = "rl_shared_best.pt", device: str = "cpu") -> "MultiCatDDQNAgent":
    """Load shared DDQN checkpoint."""
    from src.rl.agent import MultiCatDDQNAgent
    agent = MultiCatDDQNAgent(device=device)
    agent.load(f"{ckpt_dir}/{ckpt_name}")
    return agent
