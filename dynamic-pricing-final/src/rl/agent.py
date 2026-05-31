from __future__ import annotations
import numpy as np
import torch
import torch.nn.functional as F
from torch import optim

from src.rl.network import MLPDuelingQNet, SharedMLPDuelingQNet
from src.env.market_env import CATEGORIES

CATEGORY_IDS: dict[str, int] = {cat: i for i, cat in enumerate(CATEGORIES)}
from src.rl.replay import ReplayBuffer
from src.rl.reward import CANDIDATES, compute_mask

OBS_DIM = 10
OBS_WINDOW = 21
N_ACTIONS = 11


class DuelingDDQNAgent:
    """Single-category Dueling DDQN agent (MLP policy).

    Mirrors MPC.decide() interface so it is a drop-in replacement
    in the benchmark pipeline.
    """

    def __init__(
        self,
        obs_dim: int = OBS_DIM,
        hidden: int = 128,
        n_actions: int = N_ACTIONS,
        lr: float = 1e-4,
        gamma: float = 0.99,
        batch_size: int = 256,
        warmup: int = 1_000,
        buffer_capacity: int = 50_000,
        device: str = "cpu",
    ) -> None:
        self.device = torch.device(device)
        self.gamma = gamma
        self.batch_size = batch_size
        self.warmup = warmup
        self._n_actions = n_actions

        self._online = MLPDuelingQNet(obs_dim, hidden, n_actions).to(self.device)
        self._target = MLPDuelingQNet(obs_dim, hidden, n_actions).to(self.device)
        self._target.load_state_dict(self._online.state_dict())
        self._target.eval()

        self._opt = optim.Adam(
            [p for p in self._online.parameters() if p.requires_grad], lr=lr
        )
        self._buf = ReplayBuffer(buffer_capacity, obs_shape=(obs_dim,), n_actions=n_actions)

    def act(self, obs: np.ndarray, mask: np.ndarray, epsilon: float) -> int:
        valid = np.where(mask)[0]
        if np.random.random() < epsilon:
            return int(np.random.choice(valid))
        with torch.no_grad():
            x = torch.tensor(obs, dtype=torch.float32).unsqueeze(0).to(self.device)
            m = torch.tensor(mask, dtype=torch.bool).unsqueeze(0).to(self.device)
            q = self._online(x, m)
        return int(q.squeeze().argmax().item())

    def push(self, obs, action, reward, next_obs, done, next_mask) -> None:
        self._buf.push(obs, action, reward, next_obs, done, next_mask)

    def train_step(self) -> float | None:
        if len(self._buf) < self.warmup:
            return None
        batch = self._buf.sample(self.batch_size)
        obs       = batch["obs"].to(self.device)
        action    = batch["action"].to(self.device)
        reward    = batch["reward"].to(self.device)
        next_obs  = batch["next_obs"].to(self.device)
        done      = batch["done"].to(self.device)
        next_mask = batch["next_mask"].to(self.device)

        with torch.no_grad():
            q_online_next = self._online(next_obs, next_mask)
            a_next = q_online_next.argmax(dim=1)
            q_target_next = self._target(next_obs, next_mask)
            q_next = q_target_next.gather(1, a_next.unsqueeze(1)).squeeze(1)
            target = reward + self.gamma * (1.0 - done) * q_next

        q_curr = self._online(obs).gather(1, action.unsqueeze(1)).squeeze(1)
        loss = F.smooth_l1_loss(q_curr, target)

        self._opt.zero_grad()
        loss.backward()
        torch.nn.utils.clip_grad_norm_(self._online.parameters(), 10.0)
        self._opt.step()
        return float(loss.item())

    def sync_target(self) -> None:
        self._target.load_state_dict(self._online.state_dict())

    def save(self, path: str) -> None:
        torch.save({"online": self._online.state_dict()}, path)

    def load(self, path: str) -> None:
        ckpt = torch.load(path, map_location=self.device, weights_only=False)
        self._online.load_state_dict(ckpt["online"])
        self._target.load_state_dict(ckpt["online"])
        self._target.eval()

    def decide(
        self,
        obs_window: np.ndarray,
        category: str,
        current_price: float,
        current_inv: int,
        current_freshness: float,
        prev_delta: float,
    ) -> dict:
        mask = compute_mask(current_freshness)
        obs = obs_window[-1] if obs_window.ndim == 2 else obs_window
        action_idx = self.act(obs, mask, epsilon=0.0)
        delta = float(CANDIDATES[action_idx])
        return {
            "delta":      delta,
            "reason":     f"DDQN: δ={delta:+.2f}",
            "scores":     [],
            "d_hat_0":    0.0,
            "p_waste_0":  0.0,
            "t_critical": 0.0,
        }


class MultiCatDDQNAgent:
    """Shared-network DDQN agent for all 4 categories (MLP policy).

    One forward/backward pass per env-step instead of 4.
    Category identity is injected via a learned embedding inside the network.
    Set forecaster_path to augment obs with LSTM forecaster features (d_hat, p_waste).
    """

    def __init__(
        self,
        obs_dim: int = OBS_DIM,
        n_cats: int = 4,
        cat_embed_dim: int = 8,
        hidden: int = 128,
        n_actions: int = N_ACTIONS,
        lr: float = 1e-4,
        gamma: float = 0.99,
        batch_size: int = 256,
        warmup: int = 1_000,
        buffer_capacity: int = 50_000,
        device: str = "cpu",
        forecaster_path: str | None = None,
    ) -> None:
        self.device = torch.device(device)
        self.gamma = gamma
        self.batch_size = batch_size
        self._n_actions = n_actions
        self._n_per_cat = max(1, batch_size // n_cats)
        self.warmup = max(warmup, self._n_per_cat)

        if forecaster_path is not None:
            from src.rl.forecaster_encoder import ForecasterEncoder, EXTRA_DIM
            self._forecaster: ForecasterEncoder | None = ForecasterEncoder(forecaster_path, device)
            obs_dim = obs_dim + EXTRA_DIM
        else:
            self._forecaster = None

        self._online = SharedMLPDuelingQNet(obs_dim, n_cats, cat_embed_dim, hidden, n_actions).to(self.device)
        self._target = SharedMLPDuelingQNet(obs_dim, n_cats, cat_embed_dim, hidden, n_actions).to(self.device)
        self._target.load_state_dict(self._online.state_dict())
        self._target.eval()

        if hasattr(torch, "compile") and self.device.type != "cpu":
            try:
                self._online = torch.compile(self._online)
                self._target = torch.compile(self._target)
            except Exception:
                pass

        self._opt = optim.Adam(
            [p for p in self._online.parameters() if p.requires_grad], lr=lr
        )
        self._bufs: dict[str, ReplayBuffer] = {
            cat: ReplayBuffer(buffer_capacity, obs_shape=(obs_dim,), n_actions=n_actions)
            for cat in CATEGORIES
        }
        self._cat_tensors: dict[str, torch.Tensor] = {
            cat: torch.tensor([i], dtype=torch.long).to(self.device)
            for i, cat in enumerate(CATEGORIES)
        }
        self._cat_batch_tensors: list[torch.Tensor] = [
            torch.full((self._n_per_cat,), i, dtype=torch.long, device=self.device)
            for i in range(len(CATEGORIES))
        ]

    def act(self, obs: np.ndarray, cat: str, mask: np.ndarray, epsilon: float) -> int:
        valid = np.where(mask)[0]
        if np.random.random() < epsilon:
            return int(np.random.choice(valid))
        with torch.no_grad():
            x = torch.from_numpy(obs).float().unsqueeze(0).to(self.device)
            c = self._cat_tensors[cat]
            m = torch.from_numpy(mask).unsqueeze(0).to(self.device)
            q = self._online(x, c, m)
        return int(q.squeeze().argmax().item())

    def push(self, obs, cat, action, reward, next_obs, done, next_mask) -> None:
        self._bufs[cat].push(obs, action, reward, next_obs, done, next_mask)

    def train_step(self) -> float | None:
        for cat in CATEGORIES:
            if len(self._bufs[cat]) < self.warmup:
                return None

        obs_l, act_l, rew_l, nobs_l, done_l, nmask_l = [], [], [], [], [], []
        for cat in CATEGORIES:
            b = self._bufs[cat].sample(self._n_per_cat)
            obs_l.append(b["obs"])
            act_l.append(b["action"])
            rew_l.append(b["reward"])
            nobs_l.append(b["next_obs"])
            done_l.append(b["done"])
            nmask_l.append(b["next_mask"])

        obs       = torch.cat(obs_l).to(self.device)
        cat_ids   = torch.cat(self._cat_batch_tensors)
        action    = torch.cat(act_l).to(self.device)
        reward    = torch.cat(rew_l).to(self.device)
        next_obs  = torch.cat(nobs_l).to(self.device)
        done      = torch.cat(done_l).to(self.device)
        next_mask = torch.cat(nmask_l).to(self.device)

        with torch.no_grad():
            q_online_next = self._online(next_obs, cat_ids, next_mask)
            a_next        = q_online_next.argmax(dim=1)
            q_target_next = self._target(next_obs, cat_ids, next_mask)
            q_next        = q_target_next.gather(1, a_next.unsqueeze(1)).squeeze(1)
            target        = reward + self.gamma * (1.0 - done) * q_next

        q_curr = self._online(obs, cat_ids).gather(1, action.unsqueeze(1)).squeeze(1)
        loss = F.smooth_l1_loss(q_curr, target)

        self._opt.zero_grad()
        loss.backward()
        torch.nn.utils.clip_grad_norm_(self._online.parameters(), 10.0)
        self._opt.step()
        return float(loss.item())

    def sync_target(self) -> None:
        self._target.load_state_dict(self._online.state_dict())

    def save(self, path: str) -> None:
        torch.save({"online": self._online.state_dict()}, path)

    def load(self, path: str) -> None:
        ckpt = torch.load(path, map_location=self.device, weights_only=False)
        sd = ckpt["online"]
        if any(k.startswith("_orig_mod.") for k in sd):
            sd = {k[len("_orig_mod."):]: v for k, v in sd.items()}
        self._online.load_state_dict(sd)
        self._target.load_state_dict(sd)
        self._target.eval()

    def decide(
        self,
        obs_window: np.ndarray,
        category: str,
        current_price: float,
        current_inv: int,
        current_freshness: float,
        prev_delta: float,
    ) -> dict:
        obs = obs_window[-1] if obs_window.ndim == 2 else obs_window
        if self._forecaster is not None:
            obs = self._forecaster.augment(obs, obs_window, category)
        mask = compute_mask(current_freshness)
        action_idx = self.act(obs, category, mask, epsilon=0.0)
        delta = float(CANDIDATES[action_idx])
        return {
            "delta":      delta,
            "reason":     f"DDQN: δ={delta:+.2f}",
            "scores":     [],
            "d_hat_0":    0.0,
            "p_waste_0":  0.0,
            "t_critical": 0.0,
        }
