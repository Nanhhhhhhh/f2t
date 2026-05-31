from __future__ import annotations
import numpy as np
import torch


class ReplayBuffer:
    """Pre-allocated numpy ring buffer.

    O(1) push. O(batch) sample via numpy fancy indexing (vs O(n*batch) with deque).
    obs_shape is arbitrary — pass (obs_dim,) for flat obs or (seq_len, obs_dim) for windows.
    """

    def __init__(self, capacity: int, obs_shape: tuple, n_actions: int) -> None:
        self._obs      = np.zeros((capacity, *obs_shape), dtype=np.float32)
        self._next_obs = np.zeros((capacity, *obs_shape), dtype=np.float32)
        self._actions  = np.zeros(capacity, dtype=np.int64)
        self._rewards  = np.zeros(capacity, dtype=np.float32)
        self._dones    = np.zeros(capacity, dtype=np.float32)
        self._masks    = np.zeros((capacity, n_actions), dtype=bool)
        self._ptr      = 0
        self._size     = 0
        self._capacity = capacity

    def push(
        self,
        obs: np.ndarray,
        action: int,
        reward: float,
        next_obs: np.ndarray,
        done: bool,
        next_mask: np.ndarray,
    ) -> None:
        self._obs[self._ptr]      = obs
        self._next_obs[self._ptr] = next_obs
        self._actions[self._ptr]  = action
        self._rewards[self._ptr]  = reward
        self._dones[self._ptr]    = float(done)
        self._masks[self._ptr]    = next_mask
        self._ptr  = (self._ptr + 1) % self._capacity
        self._size = min(self._size + 1, self._capacity)

    def sample(self, batch_size: int) -> dict:
        if self._size < batch_size:
            raise ValueError(f"Buffer has {self._size} transitions, need {batch_size}")
        idx = np.random.randint(0, self._size, batch_size)
        return {
            "obs":       torch.from_numpy(self._obs[idx]),
            "action":    torch.from_numpy(self._actions[idx]),
            "reward":    torch.from_numpy(self._rewards[idx]),
            "next_obs":  torch.from_numpy(self._next_obs[idx]),
            "done":      torch.from_numpy(self._dones[idx]),
            "next_mask": torch.from_numpy(self._masks[idx]),
        }

    def __len__(self) -> int:
        return self._size
