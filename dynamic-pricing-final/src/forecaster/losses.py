import torch
import torch.nn.functional as F


def pos_weight_from_rate(positive_rate: float) -> float:
    return (1.0 - positive_rate) / positive_rate


def focal_loss(
    logit: torch.Tensor,
    target: torch.Tensor,
    gamma: float = 2.0,
    pos_weight: float = 1.0,
) -> torch.Tensor:
    pw = torch.tensor(pos_weight, dtype=torch.float32, device=logit.device)
    bce = F.binary_cross_entropy_with_logits(
        logit, target, pos_weight=pw, reduction="none"
    )
    # Compute p_t from logit directly, independent of pos_weight
    p_hat = torch.sigmoid(logit)
    p_t = torch.where(target >= 0.5, p_hat, 1.0 - p_hat)
    return ((1.0 - p_t) ** gamma * bce).mean()


def combined_loss(
    demand_pred: torch.Tensor,
    demand_true: torch.Tensor,
    waste_logit: torch.Tensor,
    waste_true: torch.Tensor,
    pos_weight: float,
    w_demand: float = 1.0,
    w_waste: float = 4.0,
) -> torch.Tensor:
    l_demand = F.huber_loss(demand_pred, demand_true, delta=1.0)
    l_waste  = focal_loss(waste_logit, waste_true, gamma=2.0, pos_weight=pos_weight)
    return w_demand * l_demand + w_waste * l_waste
