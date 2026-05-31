import numpy as np
import pytest
import torch
from src.rl.replay import ReplayBuffer


def _buf(capacity=100):
    return ReplayBuffer(capacity=capacity, obs_shape=(10,), n_actions=11)


def _dummy(obs_val=0.0):
    obs      = np.zeros(10, dtype=np.float32) + obs_val
    next_obs = np.zeros(10, dtype=np.float32)
    mask     = np.ones(11, dtype=bool)
    return obs, 3, 1.5, next_obs, False, mask


def test_push_increases_length():
    buf = _buf()
    assert len(buf) == 0
    buf.push(*_dummy())
    assert len(buf) == 1


def test_sample_returns_batch_of_correct_size():
    buf = _buf()
    for i in range(50):
        buf.push(*_dummy(float(i)))
    batch = buf.sample(batch_size=16)
    assert batch["obs"].shape       == (16, 10)
    assert batch["action"].shape    == (16,)
    assert batch["reward"].shape    == (16,)
    assert batch["next_obs"].shape  == (16, 10)
    assert batch["done"].shape      == (16,)
    assert batch["next_mask"].shape == (16, 11)


def test_sample_raises_when_too_small():
    buf = _buf()
    buf.push(*_dummy())
    with pytest.raises(ValueError, match="Buffer has"):
        buf.sample(batch_size=16)


def test_capacity_overflow_replaces_oldest():
    buf = ReplayBuffer(capacity=10, obs_shape=(10,), n_actions=11)
    for i in range(15):
        obs = np.zeros(10, dtype=np.float32) + i
        buf.push(obs, 0, 0.0, np.zeros(10, dtype=np.float32), False, np.ones(11, dtype=bool))
    assert len(buf) == 10
    vals = buf._obs[:, 0]      # ring has 10 slots, overwritten with values 5..14
    assert vals.min() == 5.0
    assert vals.max() == 14.0


def test_sample_tensors_have_correct_dtypes():
    buf = _buf()
    for _ in range(20):
        buf.push(*_dummy())
    batch = buf.sample(batch_size=8)
    assert batch["obs"].dtype       == torch.float32
    assert batch["action"].dtype    == torch.long
    assert batch["reward"].dtype    == torch.float32
    assert batch["done"].dtype      == torch.float32
    assert batch["next_mask"].dtype == torch.bool


def test_2d_obs_shape_works():
    """ReplayBuffer is obs-shape-agnostic — 2D obs shapes work for any seq_len."""
    buf = ReplayBuffer(capacity=50, obs_shape=(21, 10), n_actions=11)
    obs = np.zeros((21, 10), dtype=np.float32)
    buf.push(obs, 0, 1.0, obs, False, np.ones(11, dtype=bool))
    batch = buf.sample(1)
    assert batch["obs"].shape == (1, 21, 10)
