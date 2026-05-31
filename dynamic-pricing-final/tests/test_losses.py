import pytest
import torch
from src.forecaster.losses import focal_loss, combined_loss, pos_weight_from_rate


def test_focal_loss_penalizes_hard_examples_more():
    """focal_loss với γ=2 phải penalize hard examples (p_t~0.5) hơn easy examples (p_t~1)."""
    hard_logit = torch.tensor([0.0])    # p_t ≈ 0.5 → hard
    hard_label = torch.tensor([1.0])
    hard = focal_loss(hard_logit, hard_label, gamma=2.0)

    easy_logit = torch.tensor([5.0])    # p_t ≈ 0.99 → easy
    easy_label = torch.tensor([1.0])
    easy = focal_loss(easy_logit, easy_label, gamma=2.0)

    assert hard > easy, f"hard={hard.item():.4f} phải > easy={easy.item():.4f}"


def test_focal_loss_gamma_zero_equals_bce():
    """Khi γ=0, focal_loss phải bằng standard BCE."""
    import torch.nn.functional as F
    logit = torch.tensor([0.5, -0.5, 1.0])
    label = torch.tensor([1.0, 0.0, 1.0])
    fl = focal_loss(logit, label, gamma=0.0)
    bce = F.binary_cross_entropy_with_logits(logit, label)
    assert fl == pytest.approx(bce.item(), rel=1e-4)


def test_focal_loss_output_is_scalar():
    logit = torch.randn(16)
    label = torch.randint(0, 2, (16,)).float()
    out = focal_loss(logit, label, gamma=2.0)
    assert out.shape == ()
    assert out.item() > 0


def test_combined_loss_default_w_waste_is_4():
    """w_waste default là 4.0 (updated from 3.0)."""
    import inspect
    sig = inspect.signature(combined_loss)
    assert sig.parameters["w_waste"].default == 4.0


def test_focal_loss_modulation_independent_of_pos_weight():
    """p_t modulation must come from logit, not from weighted BCE.
    With pos_weight=1 vs pos_weight=5 on the same logit/label,
    the modulating factor (1-p_t)^gamma must be the same."""
    logit = torch.tensor([0.0])   # sigmoid = 0.5, p_t = 0.5 for label=1
    label = torch.tensor([1.0])

    fl_pw1 = focal_loss(logit, label, gamma=2.0, pos_weight=1.0)
    fl_pw5 = focal_loss(logit, label, gamma=2.0, pos_weight=5.0)

    # With the correct formula, the ratio should equal the pos_weight ratio
    # because only the bce term scales, not the modulating factor
    # fl_pw5 / fl_pw1 == 5.0 (approximately)
    ratio = fl_pw5.item() / fl_pw1.item()
    assert abs(ratio - 5.0) < 0.1, f"Expected ratio ≈ 5.0, got {ratio:.3f}"


def test_combined_loss_scalar_positive():
    d_pred = torch.tensor([3.0, 5.0, 2.0])
    d_true = torch.tensor([3.5, 4.0, 2.5])
    w_logit = torch.tensor([0.5, -0.5, 1.0])
    w_true  = torch.tensor([1.0, 0.0, 1.0])
    pw = pos_weight_from_rate(0.43)
    loss = combined_loss(d_pred, d_true, w_logit, w_true, pw)
    assert loss.shape == ()
    assert loss.item() > 0
