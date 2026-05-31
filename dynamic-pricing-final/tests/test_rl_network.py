import torch
import pytest
from src.rl.network import MLPDuelingQNet, SharedMLPDuelingQNet


@pytest.fixture
def mlp():
    return MLPDuelingQNet(obs_dim=10, hidden=256, n_actions=11)


def test_mlp_output_shape_no_mask(mlp):
    x = torch.zeros(4, 10)
    assert mlp(x).shape == (4, 11)


def test_mlp_output_shape_with_mask(mlp):
    x = torch.zeros(2, 10)
    mask = torch.ones(2, 11, dtype=torch.bool)
    assert mlp(x, mask).shape == (2, 11)


def test_mlp_masked_actions_are_neg_inf(mlp):
    x = torch.zeros(1, 10)
    mask = torch.ones(1, 11, dtype=torch.bool)
    mask[0, 2] = False
    q = mlp(x, mask)
    assert q[0, 2].item() == float("-inf")
    assert torch.isfinite(q[0, 1])


def test_mlp_no_mask_gives_finite_output(mlp):
    x = torch.randn(4, 10)
    assert torch.isfinite(mlp(x)).all()


def test_mlp_batch_size_1_works(mlp):
    x = torch.zeros(1, 10)
    assert mlp(x).shape == (1, 11)


def test_mlp_dueling_decomposition(mlp):
    x = torch.zeros(3, 10)
    with torch.no_grad():
        h = mlp.shared(x)
        v = mlp.v_stream(h)
        a = mlp.a_stream(h)
        expected = v + a - a.mean(dim=1, keepdim=True)
        got = mlp(x)
    assert torch.allclose(got, expected, atol=1e-5)
    assert v.shape == (3, 1)
    assert a.shape == (3, 11)


@pytest.fixture
def shared():
    return SharedMLPDuelingQNet(obs_dim=10, n_cats=4, cat_embed_dim=8, hidden=128, n_actions=11)


def test_shared_output_shape_no_mask(shared):
    obs = torch.zeros(4, 10)
    cat_ids = torch.zeros(4, dtype=torch.long)
    assert shared(obs, cat_ids).shape == (4, 11)


def test_shared_output_shape_with_mask(shared):
    obs = torch.zeros(2, 10)
    cat_ids = torch.zeros(2, dtype=torch.long)
    mask = torch.ones(2, 11, dtype=torch.bool)
    assert shared(obs, cat_ids, mask).shape == (2, 11)


def test_shared_masked_actions_are_neg_inf(shared):
    obs = torch.zeros(1, 10)
    cat_ids = torch.zeros(1, dtype=torch.long)
    mask = torch.ones(1, 11, dtype=torch.bool)
    mask[0, 0] = False
    mask[0, 5] = False
    q = shared(obs, cat_ids, mask)
    assert q[0, 0].item() == float("-inf")
    assert q[0, 5].item() == float("-inf")


def test_shared_different_cats_give_different_q(shared):
    obs = torch.zeros(1, 10)
    q0 = shared(obs, torch.tensor([0]))
    q1 = shared(obs, torch.tensor([1]))
    assert not torch.allclose(q0, q1), "Different categories should yield different Q values"
