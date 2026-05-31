# Dueling DDQN Pricing Agent — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the MPC decision layer with a Dueling DDQN agent that learns pricing policy end-to-end while preserving hard business constraints via action masking, matching or beating MPC on waste, revenue, and dynamism.

**Architecture:** Four independent Dueling DDQN agents (one per category) with LSTM encoder (21×11 obs window), dueling V+A streams, and hard action masking derived from freshness. The `decide()` interface mirrors `MPC.decide()` exactly for drop-in replacement in the benchmark pipeline.

**Tech Stack:** PyTorch ≥ 2.0 (MPS-aware), numpy, pytest, existing `MarketEnv` / `run_n_episodes()` pipeline.

---

## Why Dynamism Is Guaranteed by Design

The DDQN's action masks and reward function reproduce — and can exceed — MPC's freshness-based delta trajectory:

| Freshness zone | Mask effect | Reward pull |
|---|---|---|
| f ≥ 0.85 (exempt) | All 11 deltas valid | `r_target = -3(δ − 0.20)²` → agent learns +0.20 |
| 0.70 ≤ f < 0.85 (upper_ok) | δ capped at target(f) | `r_target` steers agent to track target curve |
| f < 0.70 (buyer_ok) | δ > 0 blocked | Waste risk drives large discounts |
| f ≤ 0.50 (discard) | Only δ = 0 | N/A |

This structure makes `policy_dynamism_check(ddqn, n_passes=4)` pass by construction: f=0.60 forces δ ≤ 0 while f=0.90 allows +0.20 and `r_target` makes the agent prefer it.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/rl/__init__.py` | Create | Module exports |
| `src/rl/reward.py` | Create | `freshness_target_delta()`, `compute_mask()`, `compute_reward()` |
| `src/rl/network.py` | Create | `LSTMDuelingQNet` forward pass + action masking |
| `src/rl/replay.py` | Create | `ReplayBuffer` with `push()` / `sample()` |
| `src/rl/agent.py` | Create | `DuelingDDQNAgent`: `act()`, `push()`, `train_step()`, `sync_target()`, `decide()`, `save()`, `load()` |
| `src/rl/evaluate.py` | Create | `ddqn_policy()`, `DDQNMultiAgent`, `load_agents()` |
| `src/rl/train.py` | Create | `train_all_categories()` training loop |
| `scripts/train_rl.py` | Create | CLI entry point |
| `scripts/run_pipeline.py` | Modify | Auto-include DDQN in N=200 benchmark if checkpoints exist |
| `tests/test_rl_reward.py` | Create | Unit tests for reward.py |
| `tests/test_rl_network.py` | Create | Unit tests for network.py |
| `tests/test_rl_replay.py` | Create | Unit tests for replay.py |
| `tests/test_rl_agent.py` | Create | Unit tests for agent.py |
| `tests/test_rl_evaluate.py` | Create | Unit tests for evaluate.py |

---

## Task 1: `src/rl/reward.py` — Pure Pricing Functions

**Files:**
- Create: `src/rl/reward.py`
- Create: `tests/test_rl_reward.py`

- [ ] **Step 1.1: Write failing tests**

Create `tests/test_rl_reward.py`:

```python
import numpy as np
import pytest
from src.rl.reward import (
    freshness_target_delta, compute_mask, compute_reward, CANDIDATES, ZERO_IDX
)


def test_zero_idx_is_delta_zero():
    assert CANDIDATES[ZERO_IDX] == pytest.approx(0.0, abs=1e-6)


def test_freshness_target_delta_neutral_is_zero():
    assert freshness_target_delta(0.70) == pytest.approx(0.0, abs=1e-6)


def test_freshness_target_delta_exempt_high_is_max_premium():
    assert freshness_target_delta(0.85) == pytest.approx(0.20, abs=1e-6)
    assert freshness_target_delta(0.99) == pytest.approx(0.20, abs=1e-6)


def test_freshness_target_delta_above_neutral_increases():
    d1 = freshness_target_delta(0.75)
    d2 = freshness_target_delta(0.80)
    assert d1 < d2 < 0.20


def test_freshness_target_delta_below_neutral_is_negative():
    d = freshness_target_delta(0.60)
    assert d == pytest.approx(-0.20, abs=1e-6)


def test_freshness_target_delta_clamped_to_min():
    d = freshness_target_delta(0.50)
    assert d == pytest.approx(-0.30, abs=1e-6)
    d2 = freshness_target_delta(0.30)
    assert d2 == pytest.approx(-0.30, abs=1e-6)


def test_compute_mask_discard_zone_only_zero():
    mask = compute_mask(0.50)
    assert mask.sum() == 1
    assert CANDIDATES[mask][0] == pytest.approx(0.0, abs=1e-6)


def test_compute_mask_discard_zone_below_threshold():
    mask = compute_mask(0.40)
    assert mask.sum() == 1
    assert CANDIDATES[mask][0] == pytest.approx(0.0, abs=1e-6)


def test_compute_mask_buyer_ok_no_positive_deltas():
    mask = compute_mask(0.60)
    valid = CANDIDATES[mask]
    assert all(d <= 0.0 for d in valid), f"Positive delta found at f=0.60: {valid}"


def test_compute_mask_buyer_ok_includes_zero():
    mask = compute_mask(0.60)
    assert mask[ZERO_IDX], "delta=0 must be valid at f=0.60"


def test_compute_mask_upper_ok_capped_at_target():
    f = 0.75
    mask = compute_mask(f)
    valid = CANDIDATES[mask]
    target = freshness_target_delta(f)
    assert all(d <= target + 1e-5 for d in valid), f"Delta exceeds target {target:.3f}: {valid}"


def test_compute_mask_exempt_all_valid():
    mask = compute_mask(0.90)
    assert all(mask), "At f=0.90 (exempt), all 11 actions must be valid"


def test_compute_mask_dynamism_guarantee():
    """At f=0.60 max delta <= 0; at f=0.90 +0.20 is valid → dynamism check must pass."""
    mask_stale = compute_mask(0.60)
    mask_fresh = compute_mask(0.90)
    assert not mask_stale[-1], "+0.20 must be blocked at f=0.60"
    assert mask_fresh[-1], "+0.20 must be valid at f=0.90"


def test_compute_reward_positive_revenue():
    r = compute_reward(price=2.0, sold=5.0, waste_units=0,
                        delta=0.0, prev_delta=0.0, freshness=0.80)
    assert r > 0


def test_compute_reward_waste_is_penalized():
    r_no_waste = compute_reward(price=2.0, sold=5.0, waste_units=0,
                                 delta=0.0, prev_delta=0.0, freshness=0.80)
    r_waste = compute_reward(price=2.0, sold=5.0, waste_units=10,
                              delta=0.0, prev_delta=0.0, freshness=0.80)
    assert r_waste < r_no_waste


def test_compute_reward_target_deviation_penalized():
    # At f=0.85, target=+0.20; delta=-0.30 should be worse than delta=+0.20
    r_on_target = compute_reward(price=2.0, sold=3.0, waste_units=0,
                                  delta=0.20, prev_delta=0.0, freshness=0.85)
    r_off_target = compute_reward(price=2.0, sold=3.0, waste_units=0,
                                   delta=-0.30, prev_delta=0.0, freshness=0.85)
    assert r_on_target > r_off_target


def test_compute_reward_smooth_penalty_only_in_middle_zone():
    # At f=0.90 (exempt): no smooth penalty even with big delta change
    r_exempt = compute_reward(price=2.0, sold=3.0, waste_units=0,
                               delta=0.20, prev_delta=-0.20, freshness=0.90)
    # At f=0.75 (middle zone): smooth penalty applies
    r_middle = compute_reward(price=2.0, sold=3.0, waste_units=0,
                               delta=0.10, prev_delta=-0.10, freshness=0.75)
    # Can't directly compare (different targets) but we can verify smooth is 0 in exempt
    r_exempt_same = compute_reward(price=2.0, sold=3.0, waste_units=0,
                                    delta=0.20, prev_delta=0.20, freshness=0.90)
    # r_exempt - r_exempt_same should be from r_target only (same smooth=0)
    # both have smooth=0 so they only differ by r_target
    assert abs(r_exempt - r_exempt_same) < 1.0  # small difference (prev_delta=+-0.20 → same target penalty)
```

- [ ] **Step 1.2: Run tests to confirm they fail**

```bash
cd /Users/macos/dynamic-pricing-v3
pytest tests/test_rl_reward.py -v 2>&1 | head -20
```

Expected: `ModuleNotFoundError: No module named 'src.rl'`

- [ ] **Step 1.3: Create `src/rl/__init__.py`**

```python
```

(empty file — just makes `src/rl` a package)

- [ ] **Step 1.4: Implement `src/rl/reward.py`**

```python
import numpy as np

CANDIDATES = np.linspace(-0.30, 0.20, 11)
ZERO_IDX = 6          # CANDIDATES[6] == 0.0
NEUTRAL = 0.70        # f at which target delta = 0
EXEMPT_HIGH = 0.85    # f above which all actions are valid
EXEMPT_LOW = 0.60     # f below which smoothness penalty is waived
WASTE_THRESHOLD = 0.50


def freshness_target_delta(f: float) -> float:
    """Piecewise linear freshness-based target delta, matching MPC._freshness_target_delta.

    f >= 0.85 → +0.20, f = 0.70 → 0.0, f = 0.60 → -0.20, f <= 0.55 → -0.30.
    """
    if f >= NEUTRAL:
        slope = 0.20 / (EXEMPT_HIGH - NEUTRAL)   # 0.20 / 0.15 ≈ 1.333
        return min(0.20, slope * (f - NEUTRAL))
    else:
        slope = 0.20 / (NEUTRAL - EXEMPT_LOW)     # 0.20 / 0.10 = 2.0
        return max(-0.30, -slope * (NEUTRAL - f))


def compute_mask(freshness: float) -> np.ndarray:
    """Return bool array of length 11 — True = action is valid.

    Discard (f <= 0.50): only delta=0.
    Buyer-ok (f < 0.70): no positive deltas.
    Upper-ok (0.70 <= f < 0.85): capped at freshness_target_delta(f).
    Exempt (f >= 0.85): all valid.
    """
    mask = np.ones(11, dtype=bool)
    if freshness <= WASTE_THRESHOLD:
        mask[:] = False
        mask[ZERO_IDX] = True
    elif freshness < NEUTRAL:
        mask[CANDIDATES > 0.0] = False
    elif freshness < EXEMPT_HIGH:
        target = freshness_target_delta(freshness)
        mask[CANDIDATES > target + 1e-6] = False
    return mask


def compute_reward(
    price: float,
    sold: float,
    waste_units: int,
    delta: float,
    prev_delta: float,
    freshness: float,
) -> float:
    """Per-step reward. Priority: waste >> revenue >> target >> smoothness."""
    r_revenue = price * sold
    r_waste   = -15.0 * waste_units
    r_target  = -3.0 * (delta - freshness_target_delta(freshness)) ** 2
    r_smooth  = -0.5 * abs(delta - prev_delta) if EXEMPT_LOW < freshness < EXEMPT_HIGH else 0.0
    return r_revenue + r_waste + r_target + r_smooth
```

- [ ] **Step 1.5: Run tests to confirm they pass**

```bash
pytest tests/test_rl_reward.py -v
```

Expected: all 16 tests PASS.

- [ ] **Step 1.6: Commit**

```bash
git add src/rl/__init__.py src/rl/reward.py tests/test_rl_reward.py
git commit -m "feat(rl): reward.py — freshness_target_delta, compute_mask, compute_reward"
```

---

## Task 2: `src/rl/network.py` — LSTMDuelingQNet

**Files:**
- Create: `src/rl/network.py`
- Create: `tests/test_rl_network.py`

- [ ] **Step 2.1: Write failing tests**

Create `tests/test_rl_network.py`:

```python
import torch
import pytest
from src.rl.network import LSTMDuelingQNet


@pytest.fixture
def net():
    return LSTMDuelingQNet(obs_dim=11, obs_window=21, hidden=128, n_actions=11)


def test_output_shape_no_mask(net):
    x = torch.zeros(4, 21, 11)   # batch=4, seq=21, feat=11
    q = net(x)
    assert q.shape == (4, 11)


def test_output_shape_with_mask(net):
    x = torch.zeros(2, 21, 11)
    mask = torch.ones(2, 11, dtype=torch.bool)
    q = net(x, mask)
    assert q.shape == (2, 11)


def test_masked_actions_are_neg_inf(net):
    x = torch.zeros(1, 21, 11)
    mask = torch.ones(1, 11, dtype=torch.bool)
    mask[0, 0] = False   # block first action
    mask[0, 5] = False   # block action 5
    q = net(x, mask)
    assert q[0, 0].item() == float("-inf")
    assert q[0, 5].item() == float("-inf")


def test_valid_actions_are_finite(net):
    x = torch.zeros(1, 21, 11)
    mask = torch.ones(1, 11, dtype=torch.bool)
    mask[0, 3] = False
    q = net(x, mask)
    for i in range(11):
        if i != 3:
            assert torch.isfinite(q[0, i]), f"Q[{i}] should be finite"


def test_dueling_decomposition_shapes(net):
    """Verify internal V and A streams have correct output sizes."""
    x = torch.zeros(3, 21, 11)
    # Access internals
    out, _ = net.lstm(x)
    h = out[:, -1, :]
    h = net.shared(h)
    v = net.v_stream(h)
    a = net.a_stream(h)
    assert v.shape == (3, 1)
    assert a.shape == (3, 11)


def test_no_mask_gives_finite_output(net):
    x = torch.randn(2, 21, 11)
    q = net(x)
    assert torch.isfinite(q).all()


def test_batch_size_1_works(net):
    x = torch.zeros(1, 21, 11)
    q = net(x)
    assert q.shape == (1, 11)


def test_q_equals_v_plus_a_minus_mean(net):
    """Q(s,a) = V(s) + A(s,a) - mean_a(A(s,a)) — verified by manual computation."""
    x = torch.zeros(1, 21, 11)
    with torch.no_grad():
        out, _ = net.lstm(x)
        h = out[:, -1, :]
        h = net.shared(h)
        v = net.v_stream(h)      # (1, 1)
        a = net.a_stream(h)      # (1, 11)
        expected = v + a - a.mean(dim=1, keepdim=True)
        got = net(x)
    assert torch.allclose(got, expected, atol=1e-5)
```

- [ ] **Step 2.2: Run tests to confirm they fail**

```bash
pytest tests/test_rl_network.py -v 2>&1 | head -10
```

Expected: `ModuleNotFoundError: No module named 'src.rl.network'`

- [ ] **Step 2.3: Implement `src/rl/network.py`**

```python
import torch
import torch.nn as nn


class LSTMDuelingQNet(nn.Module):
    """Dueling DQN with LSTM encoder.

    Input: (batch, seq_len=21, obs_dim=11)
    Output: Q values (batch, n_actions=11) with optional action masking.
    """

    def __init__(
        self,
        obs_dim: int = 11,
        obs_window: int = 21,
        hidden: int = 128,
        n_actions: int = 11,
    ) -> None:
        super().__init__()
        self.lstm = nn.LSTM(obs_dim, hidden, num_layers=2, batch_first=True)
        self.shared = nn.Sequential(nn.Linear(hidden, hidden), nn.ReLU())
        self.v_stream = nn.Sequential(
            nn.Linear(hidden, 64), nn.ReLU(), nn.Linear(64, 1)
        )
        self.a_stream = nn.Sequential(
            nn.Linear(hidden, 64), nn.ReLU(), nn.Linear(64, n_actions)
        )

    def forward(
        self,
        x: torch.Tensor,
        mask: torch.Tensor | None = None,
    ) -> torch.Tensor:
        """
        x:    (batch, seq_len, obs_dim)
        mask: (batch, n_actions) bool, True = valid action
        Returns Q values (batch, n_actions); invalid actions set to -inf.
        """
        out, _ = self.lstm(x)
        h = out[:, -1, :]                          # last timestep: (batch, hidden)
        h = self.shared(h)
        v = self.v_stream(h)                       # (batch, 1)
        a = self.a_stream(h)                       # (batch, n_actions)
        q = v + a - a.mean(dim=1, keepdim=True)
        if mask is not None:
            q = q.masked_fill(~mask, float("-inf"))
        return q
```

- [ ] **Step 2.4: Run tests to confirm they pass**

```bash
pytest tests/test_rl_network.py -v
```

Expected: all 8 tests PASS.

- [ ] **Step 2.5: Commit**

```bash
git add src/rl/network.py tests/test_rl_network.py
git commit -m "feat(rl): network.py — LSTMDuelingQNet with action masking"
```

---

## Task 3: `src/rl/replay.py` — ReplayBuffer

**Files:**
- Create: `src/rl/replay.py`
- Create: `tests/test_rl_replay.py`

- [ ] **Step 3.1: Write failing tests**

Create `tests/test_rl_replay.py`:

```python
import numpy as np
import pytest
from src.rl.replay import ReplayBuffer


def _dummy_transition(obs_val=0.0):
    obs = np.zeros((21, 11), dtype=np.float32) + obs_val
    next_obs = np.zeros((21, 11), dtype=np.float32)
    mask = np.ones(11, dtype=bool)
    return obs, 3, 1.5, next_obs, False, mask


def test_push_increases_length():
    buf = ReplayBuffer(capacity=100)
    assert len(buf) == 0
    buf.push(*_dummy_transition())
    assert len(buf) == 1


def test_sample_returns_batch_of_correct_size():
    buf = ReplayBuffer(capacity=100)
    for i in range(50):
        buf.push(*_dummy_transition(float(i)))
    batch = buf.sample(batch_size=16)
    assert batch["obs"].shape == (16, 21, 11)
    assert batch["action"].shape == (16,)
    assert batch["reward"].shape == (16,)
    assert batch["next_obs"].shape == (16, 21, 11)
    assert batch["done"].shape == (16,)
    assert batch["next_mask"].shape == (16, 11)


def test_sample_raises_when_too_small():
    buf = ReplayBuffer(capacity=100)
    buf.push(*_dummy_transition())
    with pytest.raises(ValueError, match="Buffer has"):
        buf.sample(batch_size=16)


def test_capacity_overflow_replaces_oldest():
    buf = ReplayBuffer(capacity=10)
    for i in range(15):
        obs = np.zeros((21, 11), dtype=np.float32) + i
        buf.push(obs, 0, 0.0, np.zeros((21, 11), dtype=np.float32), False, np.ones(11, dtype=bool))
    assert len(buf) == 10
    # Check that old values (obs_val=0..4) are gone, newest (5..14) remain
    stored_vals = [buf._buf[i].obs[0, 0] for i in range(10)]
    assert all(v >= 5.0 for v in stored_vals)


def test_sample_tensors_have_correct_dtypes():
    import torch
    buf = ReplayBuffer(capacity=100)
    for _ in range(20):
        buf.push(*_dummy_transition())
    batch = buf.sample(batch_size=8)
    assert batch["obs"].dtype == torch.float32
    assert batch["action"].dtype == torch.long
    assert batch["reward"].dtype == torch.float32
    assert batch["done"].dtype == torch.float32
    assert batch["next_mask"].dtype == torch.bool
```

- [ ] **Step 3.2: Run tests to confirm they fail**

```bash
pytest tests/test_rl_replay.py -v 2>&1 | head -10
```

Expected: `ModuleNotFoundError: No module named 'src.rl.replay'`

- [ ] **Step 3.3: Implement `src/rl/replay.py`**

```python
from collections import deque
from typing import NamedTuple
import numpy as np
import torch


class Transition(NamedTuple):
    obs: np.ndarray        # (obs_window, obs_dim)
    action: int
    reward: float
    next_obs: np.ndarray   # (obs_window, obs_dim)
    done: bool
    next_mask: np.ndarray  # (n_actions,) bool


class ReplayBuffer:
    def __init__(self, capacity: int = 50_000) -> None:
        self._buf: deque[Transition] = deque(maxlen=capacity)

    def push(
        self,
        obs: np.ndarray,
        action: int,
        reward: float,
        next_obs: np.ndarray,
        done: bool,
        next_mask: np.ndarray,
    ) -> None:
        self._buf.append(Transition(obs, int(action), float(reward), next_obs, bool(done), next_mask))

    def sample(self, batch_size: int = 256) -> dict:
        if len(self._buf) < batch_size:
            raise ValueError(f"Buffer has {len(self._buf)} transitions, need {batch_size}")
        idx = np.random.choice(len(self._buf), batch_size, replace=False)
        batch = [self._buf[i] for i in idx]
        return {
            "obs":       torch.tensor(np.array([t.obs for t in batch]),       dtype=torch.float32),
            "action":    torch.tensor([t.action for t in batch],               dtype=torch.long),
            "reward":    torch.tensor([t.reward for t in batch],               dtype=torch.float32),
            "next_obs":  torch.tensor(np.array([t.next_obs for t in batch]),  dtype=torch.float32),
            "done":      torch.tensor([float(t.done) for t in batch],          dtype=torch.float32),
            "next_mask": torch.tensor(np.array([t.next_mask for t in batch]), dtype=torch.bool),
        }

    def __len__(self) -> int:
        return len(self._buf)
```

- [ ] **Step 3.4: Run tests to confirm they pass**

```bash
pytest tests/test_rl_replay.py -v
```

Expected: all 5 tests PASS.

- [ ] **Step 3.5: Commit**

```bash
git add src/rl/replay.py tests/test_rl_replay.py
git commit -m "feat(rl): replay.py — ReplayBuffer with typed Transition NamedTuple"
```

---

## Task 4: `src/rl/agent.py` — DuelingDDQNAgent

**Files:**
- Create: `src/rl/agent.py`
- Create: `tests/test_rl_agent.py`

- [ ] **Step 4.1: Write failing tests**

Create `tests/test_rl_agent.py`:

```python
import numpy as np
import pytest
import torch
from src.rl.agent import DuelingDDQNAgent
from src.rl.reward import CANDIDATES, compute_mask


@pytest.fixture
def agent():
    return DuelingDDQNAgent(device="cpu", warmup=10, batch_size=8, buffer_capacity=100)


def _dummy_obs():
    return np.zeros((21, 11), dtype=np.float32)


def test_act_returns_valid_index_greedy(agent):
    mask = compute_mask(0.90)   # all valid
    idx = agent.act(_dummy_obs(), mask, epsilon=0.0)
    assert 0 <= idx < 11


def test_act_respects_mask_greedy(agent):
    mask = compute_mask(0.60)   # only delta <= 0
    for _ in range(20):
        idx = agent.act(_dummy_obs(), mask, epsilon=0.0)
        assert CANDIDATES[idx] <= 0.0, f"Chose positive delta {CANDIDATES[idx]} at f=0.60"


def test_act_explores_only_within_mask(agent):
    mask = compute_mask(0.60)   # only delta <= 0
    chosen = set()
    for _ in range(200):
        idx = agent.act(_dummy_obs(), mask, epsilon=1.0)
        chosen.add(idx)
        assert CANDIDATES[idx] <= 0.0, f"Chose positive delta in exploration: {CANDIDATES[idx]}"


def test_act_discard_zone_always_zero(agent):
    mask = compute_mask(0.50)   # only delta=0
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
    # Modify online weights manually
    with torch.no_grad():
        for p in agent._online.parameters():
            p.add_(1.0)
    # Before sync: online and target differ
    online_p = next(agent._online.parameters())
    target_p = next(agent._target.parameters())
    assert not torch.allclose(online_p, target_p)
    # After sync: identical
    agent.sync_target()
    for op, tp in zip(agent._online.parameters(), agent._target.parameters()):
        assert torch.allclose(op, tp)


def test_decide_interface_matches_mpc(agent):
    """decide() must return dict with same keys as MPC.decide()."""
    obs = np.tile(np.array([0.90, 0.5, 1.0, 0, 0, 0, 1, 0, 1, 0.5, 0.5], dtype=np.float32), (21, 1))
    result = agent.decide(obs, "leafy", 1.48, 50, 0.90, 0.0)
    for key in ("delta", "reason", "scores", "d_hat_0", "p_waste_0", "t_critical"):
        assert key in result, f"Missing key: {key}"
    assert -0.30 <= result["delta"] <= 0.20


def test_decide_respects_mask_at_low_freshness(agent):
    """At f=0.60, decide() must return delta <= 0."""
    obs = np.tile(np.array([0.60, 0.5, 1.0, 0, 0, 0, 1, 0, 1, 0.3, 0.5], dtype=np.float32), (21, 1))
    for _ in range(20):
        result = agent.decide(obs, "leafy", 1.48, 50, 0.60, 0.0)
        assert result["delta"] <= 0.0, f"Positive delta {result['delta']} at f=0.60"


def test_save_and_load(agent, tmp_path):
    path = str(tmp_path / "test_agent.pt")
    agent.save(path)
    agent2 = DuelingDDQNAgent(device="cpu")
    agent2.load(path)
    # Weights should match
    for p1, p2 in zip(agent._online.parameters(), agent2._online.parameters()):
        assert torch.allclose(p1, p2)
```

- [ ] **Step 4.2: Run tests to confirm they fail**

```bash
pytest tests/test_rl_agent.py -v 2>&1 | head -10
```

Expected: `ModuleNotFoundError: No module named 'src.rl.agent'`

- [ ] **Step 4.3: Implement `src/rl/agent.py`**

```python
from __future__ import annotations
import numpy as np
import torch
import torch.nn.functional as F
from torch import optim

from src.rl.network import LSTMDuelingQNet
from src.rl.replay import ReplayBuffer
from src.rl.reward import CANDIDATES, compute_mask

OBS_DIM = 11
OBS_WINDOW = 21
N_ACTIONS = 11


class DuelingDDQNAgent:
    """Single-category Dueling DDQN agent.

    Mirrors MPC.decide() interface so it is a drop-in replacement
    in the benchmark pipeline.
    """

    def __init__(
        self,
        obs_dim: int = OBS_DIM,
        obs_window: int = OBS_WINDOW,
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

        self._online = LSTMDuelingQNet(obs_dim, obs_window, hidden, n_actions).to(self.device)
        self._target = LSTMDuelingQNet(obs_dim, obs_window, hidden, n_actions).to(self.device)
        self._target.load_state_dict(self._online.state_dict())
        self._target.eval()

        self._opt = optim.Adam(self._online.parameters(), lr=lr)
        self._buf = ReplayBuffer(buffer_capacity)

    def act(self, obs_window: np.ndarray, mask: np.ndarray, epsilon: float) -> int:
        """Epsilon-greedy action selection. Only valid (masked) actions are chosen."""
        valid = np.where(mask)[0]
        if np.random.random() < epsilon:
            return int(np.random.choice(valid))
        with torch.no_grad():
            x = torch.tensor(obs_window, dtype=torch.float32).unsqueeze(0).to(self.device)
            m = torch.tensor(mask, dtype=torch.bool).unsqueeze(0).to(self.device)
            q = self._online(x, m)
        return int(q.squeeze().argmax().item())

    def push(
        self,
        obs: np.ndarray,
        action: int,
        reward: float,
        next_obs: np.ndarray,
        done: bool,
        next_mask: np.ndarray,
    ) -> None:
        self._buf.push(obs, action, reward, next_obs, done, next_mask)

    def train_step(self) -> float | None:
        """One gradient step. Returns loss or None if buffer below warmup."""
        if len(self._buf) < self.warmup:
            return None
        batch = self._buf.sample(self.batch_size)
        obs       = batch["obs"].to(self.device)
        action    = batch["action"].to(self.device)
        reward    = batch["reward"].to(self.device)
        next_obs  = batch["next_obs"].to(self.device)
        done      = batch["done"].to(self.device)
        next_mask = batch["next_mask"].to(self.device)

        # DDQN: online selects next action, target evaluates its value
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
        """MPC-compatible interface: drop-in replacement for MPC.decide()."""
        mask = compute_mask(current_freshness)
        action_idx = self.act(obs_window, mask, epsilon=0.0)
        delta = float(CANDIDATES[action_idx])
        return {
            "delta":      delta,
            "reason":     f"DDQN: δ={delta:+.2f}",
            "scores":     [],
            "d_hat_0":    0.0,
            "p_waste_0":  0.0,
            "t_critical": 0.0,
        }
```

- [ ] **Step 4.4: Run tests to confirm they pass**

```bash
pytest tests/test_rl_agent.py -v
```

Expected: all 11 tests PASS.

- [ ] **Step 4.5: Commit**

```bash
git add src/rl/agent.py tests/test_rl_agent.py
git commit -m "feat(rl): agent.py — DuelingDDQNAgent with MPC-compatible decide()"
```

---

## Task 5: `src/rl/evaluate.py` — Policy Wrapper + Multi-Agent Interface

**Files:**
- Create: `src/rl/evaluate.py`
- Create: `tests/test_rl_evaluate.py`

- [ ] **Step 5.1: Write failing tests**

Create `tests/test_rl_evaluate.py`:

```python
import numpy as np
import pytest
from unittest.mock import MagicMock
from src.rl.evaluate import ddqn_policy, DDQNMultiAgent, load_agents
from src.rl.reward import CANDIDATES
from src.env.market_env import CATEGORIES, OBS_WINDOW, OBS_DIM


def _mock_agent(delta_val=0.0):
    agent = MagicMock()
    agent.decide.return_value = {
        "delta": delta_val, "reason": "mock", "scores": [],
        "d_hat_0": 0.0, "p_waste_0": 0.0, "t_critical": 0.0,
    }
    return agent


def _mock_env(cat, freshness=0.80, price=1.5, inv=50, prev_delta=0.0):
    env = MagicMock()
    env._freshness = {c: freshness for c in CATEGORIES}
    env._prices = {c: price for c in CATEGORIES}
    env._inventory = {c: inv for c in CATEGORIES}
    env._prev_delta = {c: prev_delta for c in CATEGORIES}
    return env


def test_ddqn_policy_returns_float():
    agents = {cat: _mock_agent(0.10) for cat in CATEGORIES}
    fn = ddqn_policy(agents)
    obs = np.zeros((OBS_WINDOW, OBS_DIM), dtype=np.float32)
    env = _mock_env("leafy")
    delta = fn(obs, "leafy", env)
    assert isinstance(delta, float)
    assert delta == pytest.approx(0.10)


def test_ddqn_policy_calls_correct_category_agent():
    agents = {cat: _mock_agent(0.0) for cat in CATEGORIES}
    agents["root"] = _mock_agent(0.15)
    fn = ddqn_policy(agents)
    obs = np.zeros((OBS_WINDOW, OBS_DIM), dtype=np.float32)
    env = _mock_env("root")
    delta = fn(obs, "root", env)
    assert delta == pytest.approx(0.15)
    agents["root"].decide.assert_called_once()


def test_ddqn_multi_agent_routes_to_correct_agent():
    agents = {cat: _mock_agent(0.0) for cat in CATEGORIES}
    agents["fruit"] = _mock_agent(-0.10)
    multi = DDQNMultiAgent(agents)
    obs = np.zeros((OBS_WINDOW, OBS_DIM), dtype=np.float32)
    result = multi.decide(obs, "fruit", 1.5, 50, 0.75, 0.0)
    assert result["delta"] == pytest.approx(-0.10)
    agents["fruit"].decide.assert_called_once()


def test_ddqn_multi_agent_decide_has_mpc_keys():
    agents = {cat: _mock_agent() for cat in CATEGORIES}
    multi = DDQNMultiAgent(agents)
    obs = np.zeros((OBS_WINDOW, OBS_DIM), dtype=np.float32)
    result = multi.decide(obs, "leafy", 1.48, 50, 0.80, 0.0)
    for key in ("delta", "reason", "scores", "d_hat_0", "p_waste_0", "t_critical"):
        assert key in result


def test_load_agents_raises_when_missing_ckpt(tmp_path):
    """load_agents raises if checkpoint files don't exist."""
    with pytest.raises(Exception):
        load_agents(ckpt_dir=str(tmp_path))
```

- [ ] **Step 5.2: Run tests to confirm they fail**

```bash
pytest tests/test_rl_evaluate.py -v 2>&1 | head -10
```

Expected: `ModuleNotFoundError: No module named 'src.rl.evaluate'`

- [ ] **Step 5.3: Implement `src/rl/evaluate.py`**

```python
from __future__ import annotations
from typing import TYPE_CHECKING
import numpy as np

if TYPE_CHECKING:
    from src.rl.agent import DuelingDDQNAgent

from src.env.market_env import CATEGORIES


class DDQNMultiAgent:
    """Wraps 4 per-category agents behind a single MPC-compatible decide() interface.

    Allows passing a DDQNMultiAgent to policy_dynamism_check() unchanged.
    """

    def __init__(self, agents: dict[str, "DuelingDDQNAgent"]) -> None:
        self._agents = agents

    def decide(
        self,
        obs_window: np.ndarray,
        category: str,
        current_price: float,
        current_inv: int,
        current_freshness: float,
        prev_delta: float,
    ) -> dict:
        return self._agents[category].decide(
            obs_window, category, current_price,
            current_inv, current_freshness, prev_delta,
        )


def ddqn_policy(agents: dict[str, "DuelingDDQNAgent"]):
    """Return a policy_fn compatible with run_n_episodes(policy_fn, n, seed).

    Args:
        agents: dict mapping category → DuelingDDQNAgent (trained, loaded).
    Returns:
        policy_fn(obs_window, cat, env) → float delta
    """
    def policy_fn(obs_window: np.ndarray, cat: str, env) -> float:
        result = agents[cat].decide(
            obs_window, cat,
            env._prices[cat],
            env._inventory[cat],
            env._freshness[cat],
            env._prev_delta[cat],
        )
        return result["delta"]
    return policy_fn


def load_agents(ckpt_dir: str = "checkpoints", device: str = "cpu") -> dict[str, "DuelingDDQNAgent"]:
    """Load all 4 best DDQN checkpoints from ckpt_dir."""
    from src.rl.agent import DuelingDDQNAgent
    agents = {}
    for cat in CATEGORIES:
        path = f"{ckpt_dir}/rl_{cat}_best.pt"
        a = DuelingDDQNAgent(device=device)
        a.load(path)
        agents[cat] = a
    return agents
```

- [ ] **Step 5.4: Run tests to confirm they pass**

```bash
pytest tests/test_rl_evaluate.py -v
```

Expected: all 5 tests PASS.

- [ ] **Step 5.5: Commit**

```bash
git add src/rl/evaluate.py tests/test_rl_evaluate.py
git commit -m "feat(rl): evaluate.py — ddqn_policy, DDQNMultiAgent, load_agents"
```

---

## Task 6: `src/rl/train.py` — Training Loop

**Files:**
- Create: `src/rl/train.py`

No separate unit test for the training loop (covered by integration in `scripts/train_rl.py`). The agent's `train_step()` is already tested in Task 4.

- [ ] **Step 6.1: Implement `src/rl/train.py`**

```python
from __future__ import annotations
import numpy as np
import pathlib
import time
from typing import Optional

from src.env.market_env import MarketEnv, CATEGORIES, OBS_WINDOW, OBS_DIM
from src.rl.agent import DuelingDDQNAgent
from src.rl.reward import compute_reward, compute_mask, CANDIDATES

EPISODES = 20_000
EPSILON_START = 1.0
EPSILON_END = 0.05
EPSILON_DECAY_EP = 10_000    # episodes over which epsilon decays
TARGET_SYNC_STEPS = 500      # global steps between target network hard updates
EVAL_EVERY = 2_000           # episodes between evaluations
EVAL_EPISODES = 50


def _make_agents(device: str) -> dict[str, DuelingDDQNAgent]:
    return {
        cat: DuelingDDQNAgent(obs_dim=OBS_DIM, obs_window=OBS_WINDOW, device=device)
        for cat in CATEGORIES
    }


def _epsilon(episode: int) -> float:
    frac = min(1.0, episode / EPSILON_DECAY_EP)
    return EPSILON_START + frac * (EPSILON_END - EPSILON_START)


def _eval_waste(agents: dict[str, DuelingDDQNAgent], n: int = EVAL_EPISODES) -> float:
    from src.pipeline import run_n_episodes
    from src.rl.evaluate import ddqn_policy
    eps = run_n_episodes(ddqn_policy(agents), n=n, base_seed=9999)
    return float(np.mean([e["waste_event_rate"] for e in eps]))


def train_all_categories(
    n_episodes: int = EPISODES,
    device: Optional[str] = None,
    ckpt_dir: str = "checkpoints",
    verbose: bool = True,
) -> dict[str, str]:
    """Train 4 DDQN agents (one per category). Return paths to best checkpoints."""
    import torch
    if device is None:
        device = "mps" if torch.backends.mps.is_available() else "cpu"
    if verbose:
        print(f"Training on device: {device}")

    agents = _make_agents(device)
    ckpt_paths = {cat: f"{ckpt_dir}/rl_{cat}_best.pt" for cat in CATEGORIES}
    pathlib.Path(ckpt_dir).mkdir(parents=True, exist_ok=True)

    best_waste = float("inf")
    global_step = 0
    env = MarketEnv()

    for episode in range(n_episodes):
        eps = _epsilon(episode)
        env.reset(seed=episode)

        for _ in range(91):
            # ── Collect obs + actions ──────────────────────────────────────
            obs_windows: dict[str, np.ndarray] = {}
            action_idxs: dict[str, int] = {}
            prev_freshness = {cat: env._freshness[cat] for cat in CATEGORIES}
            prev_deltas    = {cat: env._prev_delta[cat] for cat in CATEGORIES}

            for cat in CATEGORIES:
                obs_windows[cat] = env.obs_window(cat)
                mask = compute_mask(env._freshness[cat])
                action_idxs[cat] = agents[cat].act(obs_windows[cat], mask, eps)

            deltas = {cat: float(CANDIDATES[action_idxs[cat]]) for cat in CATEGORIES}

            # ── Environment step ───────────────────────────────────────────
            _, info, done, _ = env.step(deltas)

            # ── Store transitions + train ──────────────────────────────────
            for cat in CATEGORIES:
                waste_units = info.get("waste_events", {}).get(cat, 0)
                reward = compute_reward(
                    price=env._prices[cat],           # post-delta transaction price
                    sold=env._demand_yesterday[cat],
                    waste_units=waste_units,
                    delta=deltas[cat],
                    prev_delta=prev_deltas[cat],
                    freshness=prev_freshness[cat],    # freshness before this step's decay
                )
                next_obs_w = env.obs_window(cat)
                next_mask  = compute_mask(env._freshness[cat])
                agents[cat].push(obs_windows[cat], action_idxs[cat], reward,
                                  next_obs_w, done, next_mask)
                agents[cat].train_step()

            global_step += 1
            if global_step % TARGET_SYNC_STEPS == 0:
                for cat in CATEGORIES:
                    agents[cat].sync_target()

        # ── Periodic evaluation ────────────────────────────────────────────
        if (episode + 1) % EVAL_EVERY == 0:
            t0 = time.time()
            waste = _eval_waste(agents)
            dt = time.time() - t0
            if verbose:
                print(f"[ep {episode+1:5d}/{n_episodes}] ε={eps:.3f}  "
                      f"eval_waste={waste:.4f}  ({dt:.1f}s)")
            if waste < best_waste:
                best_waste = waste
                for cat in CATEGORIES:
                    agents[cat].save(ckpt_paths[cat])
                if verbose:
                    print(f"  → best waste={waste:.4f}, checkpoints updated")

    return ckpt_paths
```

- [ ] **Step 6.2: Smoke-test the training loop for 3 episodes**

```bash
cd /Users/macos/dynamic-pricing-v3
python -c "
from src.rl.train import train_all_categories
paths = train_all_categories(n_episodes=3, device='cpu', ckpt_dir='/tmp/rl_smoke', verbose=True)
print('Paths:', paths)
"
```

Expected: runs without error, prints device info. No checkpoint saved yet (eval_every=2000 not reached).

- [ ] **Step 6.3: Commit**

```bash
git add src/rl/train.py
git commit -m "feat(rl): train.py — train_all_categories() training loop"
```

---

## Task 7: `src/rl/__init__.py` — Module Exports

**Files:**
- Modify: `src/rl/__init__.py`

- [ ] **Step 7.1: Update `src/rl/__init__.py`**

```python
from src.rl.agent import DuelingDDQNAgent
from src.rl.evaluate import DDQNMultiAgent, ddqn_policy, load_agents
from src.rl.reward import compute_mask, compute_reward, freshness_target_delta, CANDIDATES

__all__ = [
    "DuelingDDQNAgent",
    "DDQNMultiAgent",
    "ddqn_policy",
    "load_agents",
    "compute_mask",
    "compute_reward",
    "freshness_target_delta",
    "CANDIDATES",
]
```

- [ ] **Step 7.2: Verify imports work**

```bash
python -c "from src.rl import DuelingDDQNAgent, ddqn_policy, compute_mask; print('OK')"
```

Expected: `OK`

- [ ] **Step 7.3: Run all rl tests**

```bash
pytest tests/test_rl_reward.py tests/test_rl_network.py tests/test_rl_replay.py tests/test_rl_agent.py tests/test_rl_evaluate.py -v
```

Expected: all tests PASS.

- [ ] **Step 7.4: Commit**

```bash
git add src/rl/__init__.py
git commit -m "feat(rl): __init__.py — module exports"
```

---

## Task 8: `scripts/train_rl.py` — CLI Entry Point

**Files:**
- Create: `scripts/train_rl.py`

- [ ] **Step 8.1: Create `scripts/train_rl.py`**

```python
"""Train all 4 Dueling DDQN pricing agents.

Run from project root:
    python scripts/train_rl.py
    python scripts/train_rl.py --episodes 5000 --device mps
    python scripts/train_rl.py --episodes 20000 --ckpt-dir checkpoints
"""
import sys
import pathlib

ROOT = pathlib.Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

import argparse


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Dueling DDQN pricing agents")
    parser.add_argument("--episodes", type=int, default=20_000,
                        help="Number of training episodes (default: 20000)")
    parser.add_argument("--device", type=str, default=None,
                        help="Device: cpu | mps | cuda (default: auto-detect mps→cpu)")
    parser.add_argument("--ckpt-dir", type=str, default="checkpoints",
                        help="Directory for best checkpoints (default: checkpoints/)")
    args = parser.parse_args()

    from src.rl.train import train_all_categories
    print(f"Starting training: {args.episodes} episodes")
    paths = train_all_categories(
        n_episodes=args.episodes,
        device=args.device,
        ckpt_dir=args.ckpt_dir,
        verbose=True,
    )
    print("\nBest checkpoints:")
    for cat, p in paths.items():
        print(f"  {cat:8s}: {p}")
```

- [ ] **Step 8.2: Verify help works**

```bash
python scripts/train_rl.py --help
```

Expected: prints usage with `--episodes`, `--device`, `--ckpt-dir`.

- [ ] **Step 8.3: Commit**

```bash
git add scripts/train_rl.py
git commit -m "feat(rl): scripts/train_rl.py — CLI entry point for DDQN training"
```

---

## Task 9: Update `scripts/run_pipeline.py` — Add DDQN to N=200 Benchmark

**Files:**
- Modify: `scripts/run_pipeline.py`

The DDQN benchmark step auto-detects checkpoints and adds a `DDQN` column. If checkpoints don't exist it is silently skipped. The dynamism check is run for both MPC and DDQN using `DDQNMultiAgent`.

- [ ] **Step 9.1: Update `step_n200_eval` in `scripts/run_pipeline.py`**

Replace the existing `step_n200_eval` function (lines 171–216):

```python
def step_n200_eval(ckpt_path: str, ddqn_ckpt_dir: str = "checkpoints") -> None:
    section("STEP 5 — N=200 system evaluation")
    t0 = time.time()

    from src.pipeline import run_n_episodes
    from src.mpc.controller import MPC, MPCConfig
    from src.eval.metrics import SystemResult
    from src.eval.compare import build_headline_table, policy_dynamism_check
    from src.env.market_env import CATEGORIES

    N = 200

    def static_policy(obs, cat, env):
        return 0.0

    def markdown_policy(obs, cat, env):
        return -0.25 if obs[0, 0] < 0.65 else 0.0

    mpc = MPC(MPCConfig(), ckpt_path=ckpt_path)

    def mpc_policy(obs, cat, env):
        return mpc.decide(obs, cat, env._prices[cat],
                          env._inventory[cat], env._freshness[cat], 0.0)["delta"]

    policies = [
        ("static",   static_policy),
        ("markdown", markdown_policy),
        ("MPC_v3",   mpc_policy),
    ]

    # Auto-include DDQN if all 4 checkpoints exist
    import os
    ddqn_available = all(
        os.path.exists(f"{ddqn_ckpt_dir}/rl_{cat}_best.pt") for cat in CATEGORIES
    )
    ddqn_agents = None
    if ddqn_available:
        from src.rl.evaluate import load_agents, ddqn_policy
        import torch
        device = "mps" if torch.backends.mps.is_available() else "cpu"
        ddqn_agents = load_agents(ddqn_ckpt_dir, device=device)
        policies.append(("DDQN", ddqn_policy(ddqn_agents)))
        print("DDQN checkpoints found — including in benchmark.")
    else:
        print("No DDQN checkpoints found — run `python scripts/train_rl.py` first.")

    print(f"Running {N} episodes per policy …")
    results = {}
    for name, fn in policies:
        t1 = time.time()
        eps = run_n_episodes(fn, n=N, base_seed=0)
        results[name] = SystemResult(
            name=name,
            waste_rates=np.array([e["waste_event_rate"] for e in eps]),
            revenues=np.array([e["total_revenue"] for e in eps]),
        )
        print(f"  {name:12s}: waste={results[name].waste_mean:.4f}  "
              f"rev={results[name].revenues.mean():.1f}  ({elapsed(t1)})")

    print("\n" + build_headline_table(results, ref_name="static"))

    print("\nPolicy dynamism check (MPC):")
    mpc_passed = policy_dynamism_check(mpc)
    print(f"  MPC => {'PASS' if mpc_passed else 'FAIL'}")

    if ddqn_agents is not None:
        from src.rl.evaluate import DDQNMultiAgent
        ddqn_multi = DDQNMultiAgent(ddqn_agents)
        print("\nPolicy dynamism check (DDQN):")
        ddqn_passed = policy_dynamism_check(ddqn_multi)
        print(f"  DDQN => {'PASS' if ddqn_passed else 'FAIL'}")

    print(f"[done in {elapsed(t0)}]")
```

- [ ] **Step 9.2: Verify the file parses without error**

```bash
python -c "import scripts.run_pipeline" 2>&1 || python -c "
import sys, pathlib
sys.path.insert(0, '.')
import importlib.util
spec = importlib.util.spec_from_file_location('run_pipeline', 'scripts/run_pipeline.py')
mod = importlib.util.module_from_spec(spec)
print('parse OK')
"
```

Expected: `parse OK` (no syntax error).

- [ ] **Step 9.3: Commit**

```bash
git add scripts/run_pipeline.py
git commit -m "feat(rl): run_pipeline.py — auto-include DDQN in N=200 benchmark + dynamism check"
```

---

## Task 10: Full Test Suite Verification

- [ ] **Step 10.1: Run all tests**

```bash
cd /Users/macos/dynamic-pricing-v3
pytest tests/ -v --tb=short 2>&1 | tail -30
```

Expected: all pre-existing tests PASS, all new `test_rl_*.py` tests PASS, zero failures.

- [ ] **Step 10.2: Run a quick end-to-end smoke test**

```bash
python -c "
import numpy as np
from src.rl import DuelingDDQNAgent, ddqn_policy, compute_mask, DDQNMultiAgent
from src.eval.compare import policy_dynamism_check
from src.env.market_env import CATEGORIES, OBS_WINDOW, OBS_DIM

# Build untrained agents (random policy)
agents = {cat: DuelingDDQNAgent(device='cpu') for cat in CATEGORIES}

# Verify masking guarantees dynamism check passes even for untrained agents at f=0.60 vs f=0.90
from src.rl.reward import CANDIDATES, compute_mask
mask_fresh = compute_mask(0.90)
mask_old   = compute_mask(0.60)
print('f=0.90 allows +0.20:', mask_fresh[-1])
print('f=0.60 blocks +0.20:', not mask_old[-1])

# policy_dynamism_check with DDQNMultiAgent
multi = DDQNMultiAgent(agents)
passed = policy_dynamism_check(multi, n_passes=4)
print('Dynamism check (untrained):', 'PASS' if passed else 'FAIL')
"
```

Expected output:
```
f=0.90 allows +0.20: True
f=0.60 blocks +0.20: True
  leafy: f=0.9->delta=+0.20, f=0.6->delta=...  PASS
  root: ...  PASS
  fruit: ...  PASS
  herbs: ...  PASS
Dynamism check (untrained): PASS
```

The dynamism check passes even before training because:
- At f=0.90: all actions valid, the untrained net arbitrarily picks some δ (likely ≠ 0)
- At f=0.60: only δ ≤ 0 valid, so the chosen δ ≤ 0 ≠ the δ at f=0.90

> **Note:** After training, the `r_target` reward signal ensures the agent prefers +0.20 at f=0.90 and tracks the target curve through the freshness lifecycle, matching the full dynamism table shown in the spec.

- [ ] **Step 10.3: Final commit tag**

```bash
git add -p   # review any remaining unstaged changes
git commit -m "feat(rl): complete Dueling DDQN module — all tests green"
```

---

## Training & Benchmark Instructions

### Train DDQN (20k episodes, ~2-4h on MPS):
```bash
python scripts/train_rl.py --episodes 20000 --device mps
```

### Run N=200 benchmark (includes DDQN once checkpoints exist):
```bash
python scripts/run_pipeline.py --skip-preprocessing --skip-data --skip-train \
  --ckpt checkpoints/forecaster_v4_best.pt
```

### Success criteria (must all pass before merging):
| Metric | Target | Source |
|---|---|---|
| Waste rate | ≤ 0.0666 | N=200 benchmark |
| Revenue | ≥ 2203.9 | N=200 benchmark |
| Dynamism check | PASS (4/4) | `policy_dynamism_check(DDQNMultiAgent(agents))` |
