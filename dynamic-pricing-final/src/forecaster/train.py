import json
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Optional

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from torch.utils.data import DataLoader

from src.forecaster.model import ForecasterLSTM, ForecasterConfig
from src.forecaster.losses import combined_loss, pos_weight_from_rate
from src.forecaster.data import PerishableForecastDataset


@dataclass
class TrainConfig:
    lr:             float = 3e-4
    weight_decay:   float = 1e-4
    batch_size:     int   = 512        # 256 → 512
    max_epochs:     int   = 50
    patience:       int   = 5
    grad_clip:      float = 1.0
    checkpoint_dir: str   = "checkpoints"
    device:         str   = "mps" if __import__("torch").backends.mps.is_available() else "cpu"


def _load_dataset(path: str) -> PerishableForecastDataset:
    df = pd.read_parquet(path)
    records = df.to_dict("records")
    for r in records:
        # features stored as object array of shape (window,) where each element
        # is a 1-D array of shape (obs_dim,); stack into (window, obs_dim)
        r["features"] = np.stack(r["features"]).astype(np.float32)
    return PerishableForecastDataset(records)


def train(model_cfg: Optional[ForecasterConfig] = None,
          train_cfg: Optional[TrainConfig] = None) -> str:
    if model_cfg is None:
        model_cfg = ForecasterConfig()
    if train_cfg is None:
        train_cfg = TrainConfig()

    device = torch.device(train_cfg.device)
    Path(train_cfg.checkpoint_dir).mkdir(exist_ok=True)
    Path(f"{train_cfg.checkpoint_dir}/plots").mkdir(exist_ok=True)

    train_ds = _load_dataset("data/processed/train.parquet")
    val_ds   = _load_dataset("data/processed/val.parquet")

    # Compute pos_weight from training set
    waste_rate = sum(int(r["waste_7d"]) for r in train_ds._records) / len(train_ds)
    pos_weight = pos_weight_from_rate(max(waste_rate, 0.01))
    print(f"waste_rate={waste_rate:.4f}, pos_weight={pos_weight:.2f}")

    train_loader = DataLoader(
        train_ds, batch_size=train_cfg.batch_size,
        shuffle=True, num_workers=0,
    )
    val_loader = DataLoader(
        val_ds, batch_size=train_cfg.batch_size,
        shuffle=False, num_workers=0,
    )

    model = ForecasterLSTM(model_cfg).to(device)
    if hasattr(torch, "compile"):
        try:
            model = torch.compile(model)
        except Exception:
            pass  # MPS fallback gracefully
    optimizer = torch.optim.Adam(model.parameters(),
                                  lr=train_cfg.lr,
                                  weight_decay=train_cfg.weight_decay)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer, T_max=train_cfg.max_epochs
    )

    best_val_loss = float("inf")
    patience_count = 0
    best_epoch = 0
    ckpt_path = f"{train_cfg.checkpoint_dir}/forecaster_v4_best.pt"
    history = {"train_loss": [], "val_loss": []}

    for epoch in range(1, train_cfg.max_epochs + 1):
        # --- Train ---
        model.train()
        train_loss_sum = 0.0
        for batch in train_loader:
            feat   = batch["features"].to(device)
            cidx   = batch["category_idx"].to(device)
            d_true = batch["demand_7d"].to(device)
            w_true = batch["waste_7d"].to(device)
            out = model(feat, cidx)
            loss = combined_loss(out["demand"], d_true, out["waste_logit"], w_true, pos_weight)
            optimizer.zero_grad()
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), train_cfg.grad_clip)
            optimizer.step()
            train_loss_sum += loss.item() * len(feat)
        train_loss = train_loss_sum / len(train_ds)

        # --- Validate ---
        model.eval()
        val_loss_sum = 0.0
        with torch.no_grad():
            for batch in val_loader:
                feat   = batch["features"].to(device)
                cidx   = batch["category_idx"].to(device)
                d_true = batch["demand_7d"].to(device)
                w_true = batch["waste_7d"].to(device)
                out = model(feat, cidx)
                loss = combined_loss(out["demand"], d_true, out["waste_logit"], w_true, pos_weight)
                val_loss_sum += loss.item() * len(feat)
        val_loss = val_loss_sum / len(val_ds)

        scheduler.step()
        history["train_loss"].append(train_loss)
        history["val_loss"].append(val_loss)
        print(f"Epoch {epoch:02d}/{train_cfg.max_epochs} | "
              f"train={train_loss:.4f} | val={val_loss:.4f}")

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_epoch = epoch
            patience_count = 0
            torch.save({
                "model_state": getattr(model, "_orig_mod", model).state_dict(),
                "model_cfg":   asdict(model_cfg),
                "epoch":       epoch,
                "val_loss":    val_loss,
            }, ckpt_path)
        else:
            patience_count += 1
            if patience_count >= train_cfg.patience:
                print(f"Early stop at epoch {epoch}, best epoch={best_epoch}")
                break

    # --- Save loss plot ---
    fig, ax = plt.subplots()
    ax.plot(history["train_loss"], label="train")
    ax.plot(history["val_loss"],   label="val")
    ax.set_xlabel("epoch")
    ax.set_ylabel("loss")
    ax.legend()
    ax.set_title("Forecaster Training Loss")
    plot_path = f"{train_cfg.checkpoint_dir}/plots/training_loss.png"
    fig.savefig(plot_path, dpi=120)
    plt.close(fig)
    print(f"Loss plot saved: {plot_path}")
    print(f"Best checkpoint: {ckpt_path} (epoch {best_epoch}, val_loss={best_val_loss:.4f})")

    return ckpt_path


if __name__ == "__main__":
    train()
