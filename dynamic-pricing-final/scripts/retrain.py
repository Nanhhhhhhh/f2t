"""One-shot retraining script — run from project root."""
import sys
import pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from src.forecaster.train import train, TrainConfig, ForecasterConfig
from src.env.market_env import OBS_DIM

if __name__ == "__main__":
    train(
        model_cfg=ForecasterConfig(obs_dim=OBS_DIM),
        train_cfg=TrainConfig(max_epochs=100, patience=8),
    )
