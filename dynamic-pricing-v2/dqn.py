"""
dqn.py — stateless Double-DQN for single-product pricing.

A plain MLP Q-network (no recurrence). The 5-dim observation is a sufficient
Markovian statistic for the pricing decision, so no GRU/history is needed — this
is what makes the policy converge reliably AND makes it restart-safe in
production (identical output for identical input, every time).

Components:
  - QNet: MLP 5 → 128 → 128 → 5 (Q-value per action)
  - ReplayBuffer: transition-level (s, a, r, s', done)
  - DoubleDQN: online net selects argmax, target net evaluates; Huber loss;
    soft target update; epsilon-greedy action selection.
"""
import random
from collections import deque

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F


class QNet(nn.Module):
    def __init__(self, obs_dim=5, n_actions=5, hidden=128):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(obs_dim, hidden), nn.ReLU(),
            nn.Linear(hidden, hidden), nn.ReLU(),
            nn.Linear(hidden, n_actions),
        )

    def forward(self, x):
        return self.net(x)


class ReplayBuffer:
    def __init__(self, capacity=100_000):
        self.buf = deque(maxlen=capacity)

    def push(self, s, a, r, s2, done):
        self.buf.append((s, a, r, s2, float(done)))

    def sample(self, batch_size, device):
        batch = random.sample(self.buf, batch_size)
        s, a, r, s2, d = zip(*batch)
        return (
            torch.tensor(np.array(s), dtype=torch.float32, device=device),
            torch.tensor(a, dtype=torch.int64, device=device).unsqueeze(1),
            torch.tensor(r, dtype=torch.float32, device=device).unsqueeze(1),
            torch.tensor(np.array(s2), dtype=torch.float32, device=device),
            torch.tensor(d, dtype=torch.float32, device=device).unsqueeze(1),
        )

    def __len__(self):
        return len(self.buf)


class DoubleDQN:
    def __init__(self, obs_dim=5, n_actions=5, hidden=128,
                 lr=5e-4, gamma=0.99, tau=0.01, grad_clip=10.0, device="cpu"):
        self.device = device
        self.n_actions = n_actions
        self.gamma = gamma
        self.tau = tau
        self.grad_clip = grad_clip
        self.online = QNet(obs_dim, n_actions, hidden).to(device)
        self.target = QNet(obs_dim, n_actions, hidden).to(device)
        self.target.load_state_dict(self.online.state_dict())
        for p in self.target.parameters():
            p.requires_grad = False
        self.opt = torch.optim.Adam(self.online.parameters(), lr=lr)

    @torch.no_grad()
    def act(self, obs, epsilon: float) -> int:
        if random.random() < epsilon:
            return random.randrange(self.n_actions)
        o = torch.tensor(obs, dtype=torch.float32, device=self.device).unsqueeze(0)
        return int(self.online(o).argmax(dim=1).item())

    @torch.no_grad()
    def greedy_q(self, obs) -> np.ndarray:
        o = torch.tensor(obs, dtype=torch.float32, device=self.device).unsqueeze(0)
        return self.online(o).cpu().numpy()[0]

    def update(self, batch) -> float:
        s, a, r, s2, d = batch
        q = self.online(s).gather(1, a)                       # Q(s,a)
        with torch.no_grad():
            # Double DQN: online selects, target evaluates
            next_a = self.online(s2).argmax(dim=1, keepdim=True)
            q_next = self.target(s2).gather(1, next_a)
            y = r + self.gamma * q_next * (1.0 - d)
        loss = F.smooth_l1_loss(q, y)                         # Huber
        self.opt.zero_grad()
        loss.backward()
        nn.utils.clip_grad_norm_(self.online.parameters(), self.grad_clip)
        self.opt.step()
        # soft target update
        with torch.no_grad():
            for tp, op in zip(self.target.parameters(), self.online.parameters()):
                tp.data.mul_(1 - self.tau).add_(self.tau * op.data)
        return float(loss.item())

    def save(self, path):
        torch.save({"online": self.online.state_dict()}, path)

    def load(self, path):
        sd = torch.load(path, map_location=self.device)
        self.online.load_state_dict(sd["online"])
        self.target.load_state_dict(self.online.state_dict())
