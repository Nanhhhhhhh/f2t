from __future__ import annotations

import torch
import torch.nn as nn


class MLPDuelingQNet(nn.Module):
    """Dueling DQN with flat MLP encoder.

    Input:  (batch, obs_dim=10) — flat current-state vector.
    Output: Q values (batch, n_actions=11) with optional action masking.
    """

    def __init__(
        self,
        obs_dim: int = 10,
        hidden: int = 256,
        n_actions: int = 11,
    ) -> None:
        super().__init__()
        self.shared = nn.Sequential(
            nn.Linear(obs_dim, hidden), nn.ReLU(),
            nn.Linear(hidden, hidden),  nn.ReLU(),
        )
        self.v_stream = nn.Sequential(nn.Linear(hidden, 64), nn.ReLU(), nn.Linear(64, 1))
        self.a_stream = nn.Sequential(nn.Linear(hidden, 64), nn.ReLU(), nn.Linear(64, n_actions))

    def forward(
        self,
        x: torch.Tensor,
        mask: torch.Tensor | None = None,
    ) -> torch.Tensor:
        h = self.shared(x)
        v = self.v_stream(h)
        a = self.a_stream(h)
        q = v + a - a.mean(dim=1, keepdim=True)
        if mask is not None:
            q = q.masked_fill(~mask, float("-inf"))
        return q


class SharedMLPDuelingQNet(nn.Module):
    """Dueling DQN shared across all categories via a learned category embedding.

    One network, one backward pass per env-step instead of 4.

    Input:  obs (batch, obs_dim=10) + cat_ids (batch,) int
    Output: Q values (batch, n_actions=11) with optional action masking.
    """

    def __init__(
        self,
        obs_dim: int = 10,
        n_cats: int = 4,
        cat_embed_dim: int = 8,
        hidden: int = 128,
        n_actions: int = 11,
    ) -> None:
        super().__init__()
        self.cat_embed = nn.Embedding(n_cats, cat_embed_dim)
        self.shared = nn.Sequential(
            nn.Linear(obs_dim + cat_embed_dim, hidden), nn.ReLU(),
            nn.Linear(hidden, hidden), nn.ReLU(),
        )
        self.v_stream = nn.Sequential(nn.Linear(hidden, 64), nn.ReLU(), nn.Linear(64, 1))
        self.a_stream = nn.Sequential(nn.Linear(hidden, 64), nn.ReLU(), nn.Linear(64, n_actions))

    def forward(
        self,
        obs: torch.Tensor,
        cat_ids: torch.Tensor,
        mask: torch.Tensor | None = None,
    ) -> torch.Tensor:
        emb = self.cat_embed(cat_ids)
        h = self.shared(torch.cat([obs, emb], dim=1))
        v = self.v_stream(h)
        a = self.a_stream(h)
        q = v + a - a.mean(dim=1, keepdim=True)
        if mask is not None:
            q = q.masked_fill(~mask, float("-inf"))
        return q
