"""Generate minimal valid checkpoints for the pricing sidecar.

Usage:
    python3 scripts/create_test_checkpoints.py

Creates:
    dynamic-pricing-final/checkpoints/rl_shared_best.pt
    dynamic-pricing-final/checkpoints/forecaster_v4_best.pt
"""
from __future__ import annotations

import os
import sys
import importlib.util
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent


def _load(rel_path: str, mod_name: str):
    path = _ROOT / rel_path
    spec = importlib.util.spec_from_file_location(mod_name, path)
    mod = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    return mod


def main() -> None:
    import torch

    network = _load("src/rl/network.py", "dp_network")
    forecaster = _load("src/forecaster/model.py", "dp_forecaster")

    SharedMLPDuelingQNet = network.SharedMLPDuelingQNet
    ForecasterLSTM = forecaster.ForecasterLSTM
    ForecasterConfig = forecaster.ForecasterConfig

    ckpt_dir = _ROOT / "checkpoints"
    ckpt_dir.mkdir(exist_ok=True)

    # DDQN checkpoint — format expected by pricing-sidecar/main.py
    ddqn = SharedMLPDuelingQNet(obs_dim=10, n_cats=4, cat_embed_dim=8, hidden=128, n_actions=11)
    torch.save({"online": ddqn.state_dict()}, ckpt_dir / "rl_shared_best.pt")
    print(f"Saved DDQN      → {ckpt_dir / 'rl_shared_best.pt'}")

    # Forecaster checkpoint — format expected by pricing-sidecar/main.py
    cfg_dict = dict(obs_dim=10, window=21, n_categories=4, cat_embed_dim=8,
                    lstm_hidden=128, lstm_layers=2, lstm_dropout=0.2)
    fnet = ForecasterLSTM(ForecasterConfig(**cfg_dict))
    torch.save({"model_cfg": cfg_dict, "model_state": fnet.state_dict()},
               ckpt_dir / "forecaster_v4_best.pt")
    print(f"Saved Forecaster → {ckpt_dir / 'forecaster_v4_best.pt'}")
    print("Done.")


if __name__ == "__main__":
    main()
