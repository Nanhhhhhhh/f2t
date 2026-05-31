import numpy as np
import torch
import pandas as pd
from typing import Optional, Tuple, Dict
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import roc_auc_score
from src.forecaster.model import ForecasterLSTM, ForecasterConfig
from src.forecaster.data import PerishableForecastDataset
from torch.utils.data import DataLoader


def compute_waste_auroc(logits: np.ndarray, labels: np.ndarray) -> float:
    if labels.sum() == 0 or labels.sum() == len(labels):
        return float("nan")
    return float(roc_auc_score(labels, logits))


def compute_demand_mae(preds: np.ndarray, trues: np.ndarray) -> float:
    return float(np.mean(np.abs(preds - trues)))


def fit_isotonic(logits: np.ndarray, labels: np.ndarray) -> IsotonicRegression:
    iso = IsotonicRegression(out_of_bounds="clip")
    iso.fit(logits, labels)
    return iso


def evaluate_checkpoint(
    ckpt_path: str,
    test_parquet: str = "data/processed/test.parquet",
    device: str = "cpu",
) -> Tuple[Dict, IsotonicRegression]:
    ckpt = torch.load(ckpt_path, map_location=device, weights_only=False)
    cfg = ForecasterConfig(**ckpt["model_cfg"])
    model = ForecasterLSTM(cfg).to(device)
    model.load_state_dict(ckpt["model_state"])
    model.eval()

    df = pd.read_parquet(test_parquet)
    records = df.to_dict("records")
    for r in records:
        r["features"] = np.stack(r["features"]).astype(np.float32)
    ds = PerishableForecastDataset(records)
    loader = DataLoader(ds, batch_size=512, shuffle=False)

    all_demand_pred, all_demand_true = [], []
    all_waste_logit, all_waste_true  = [], []
    all_cat_idx = []

    with torch.no_grad():
        for batch in loader:
            out = model(batch["features"].to(device), batch["category_idx"].to(device))
            all_demand_pred.append(out["demand"].cpu().numpy())
            all_demand_true.append(batch["demand_7d"].numpy())
            all_waste_logit.append(out["waste_logit"].cpu().numpy())
            all_waste_true.append(batch["waste_7d"].numpy())
            all_cat_idx.append(batch["category_idx"].numpy())

    d_pred  = np.concatenate(all_demand_pred)
    d_true  = np.concatenate(all_demand_true)
    w_logit = np.concatenate(all_waste_logit)
    w_true  = np.concatenate(all_waste_true)
    cat_idx = np.concatenate(all_cat_idx)

    # Fit isotonic on test set (used in production)
    iso = fit_isotonic(w_logit, w_true)

    results = {
        "demand_mae_day": compute_demand_mae(d_pred / 7, d_true / 7),
        "waste_auroc":    compute_waste_auroc(w_logit, w_true),
        "per_category":   {},
    }

    cat_names = ["leafy", "root", "fruit", "herbs"]
    for i, name in enumerate(cat_names):
        mask = cat_idx == i
        if mask.sum() == 0:
            continue
        results["per_category"][name] = {
            "demand_mae_day": compute_demand_mae(d_pred[mask] / 7, d_true[mask] / 7),
            "waste_auroc":    compute_waste_auroc(w_logit[mask], w_true[mask]),
            "waste_rate":     float(w_true[mask].mean()),
        }

    return results, iso


def print_eval_report(results: Dict) -> None:
    print(f"\n=== Forecaster Eval Report ===")
    print(f"Demand MAE/day : {results['demand_mae_day']:.4f}  (threshold: < 3.0)")
    auroc_str = f"{results['waste_auroc']:.4f}" if not np.isnan(results['waste_auroc']) else "N/A"
    print(f"Waste AUROC    : {auroc_str}  (threshold: > 0.85)")
    print("\nPer-category:")
    for cat, m in results["per_category"].items():
        a = f"{m['waste_auroc']:.4f}" if not np.isnan(m['waste_auroc']) else "N/A"
        print(f"  {cat:8s} | MAE/day={m['demand_mae_day']:.4f} | "
              f"AUROC={a} | waste_rate={m['waste_rate']:.4f}")
