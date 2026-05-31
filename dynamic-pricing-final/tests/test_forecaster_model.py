import torch
import pytest
from src.forecaster.model import ForecasterLSTM, ForecasterConfig
from src.forecaster.losses import combined_loss, pos_weight_from_rate


def test_forward_output_keys():
    cfg = ForecasterConfig()
    model = ForecasterLSTM(cfg)
    features = torch.randn(4, 21, 11)      # 11 thay vì 9
    cat_idx  = torch.tensor([0, 1, 2, 3])
    out = model(features, cat_idx)
    assert "demand" in out
    assert "waste_logit" in out


def test_output_shapes():
    cfg = ForecasterConfig()
    model = ForecasterLSTM(cfg)
    B = 8
    features = torch.randn(B, 21, 11)      # 11 thay vì 9
    cat_idx  = torch.zeros(B, dtype=torch.long)
    out = model(features, cat_idx)
    assert out["demand"].shape == (B,)
    assert out["waste_logit"].shape == (B,)


def test_combined_loss_is_scalar():
    demand_pred = torch.tensor([3.0, 5.0, 2.0])
    demand_true = torch.tensor([3.5, 4.0, 2.5])
    waste_logit = torch.tensor([0.5, -0.5, 1.0])
    waste_true  = torch.tensor([1.0, 0.0, 1.0])
    pw = pos_weight_from_rate(0.11)
    loss = combined_loss(demand_pred, demand_true, waste_logit, waste_true, pw)
    assert loss.shape == ()
    assert loss.item() > 0


def test_pos_weight_from_rate():
    pw = pos_weight_from_rate(0.11)
    assert pw == pytest.approx((1 - 0.11) / 0.11, rel=1e-4)


def test_waste_head_is_mlp():
    """waste_head phải là Sequential (MLP), không phải Linear đơn."""
    cfg = ForecasterConfig()
    model = ForecasterLSTM(cfg)
    assert isinstance(model.waste_head, torch.nn.Sequential), \
        "waste_head phải là nn.Sequential"
    # 4 sub-modules: Linear → ReLU → Dropout → Linear
    assert len(list(model.waste_head.children())) == 4


def test_model_param_count():
    """Param count phải nằm trong khoảng hợp lý sau khi tăng obs_dim và MLP head."""
    cfg = ForecasterConfig()
    model = ForecasterLSTM(cfg)
    n = sum(p.numel() for p in model.parameters())
    assert 210_000 < n < 225_000, f"Param count {n} ngoài khoảng kỳ vọng"
