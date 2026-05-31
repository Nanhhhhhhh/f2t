from __future__ import annotations
import numpy as np
import torch
from src.forecaster.model import ForecasterLSTM, ForecasterConfig
from src.env.market_env import CATEGORIES

CATEGORY_IDS: dict[str, int] = {cat: i for i, cat in enumerate(CATEGORIES)}
EXTRA_DIM = 2  # [d_hat, p_waste]


class ForecasterEncoder:
    """Frozen forecaster used as a feature extractor.

    Takes obs_window (seq_len, obs_dim) + category → appends (d_hat, p_waste)
    to the flat current-state obs, expanding obs_dim from 10 to 12.
    """

    def __init__(self, ckpt_path: str, device: str = "cpu") -> None:
        self._device = torch.device(device)
        ckpt = torch.load(ckpt_path, map_location=self._device, weights_only=False)
        cfg = ForecasterConfig(**ckpt["model_cfg"])
        self._model = ForecasterLSTM(cfg).to(self._device)
        self._model.load_state_dict(ckpt["model_state"])
        self._model.eval()
        for p in self._model.parameters():
            p.requires_grad = False

    @torch.no_grad()
    def encode(self, obs_window: np.ndarray, cat: str) -> np.ndarray:
        """obs_window: (seq_len, obs_dim) → (2,) array: [d_hat, p_waste]"""
        x = torch.tensor(obs_window, dtype=torch.float32).unsqueeze(0).to(self._device)
        c = torch.tensor([CATEGORY_IDS[cat]], dtype=torch.long).to(self._device)
        out = self._model(x, c)
        d_hat   = float(out["demand"].item())
        p_waste = float(torch.sigmoid(out["waste_logit"]).item())
        return np.array([d_hat, p_waste], dtype=np.float32)

    @torch.no_grad()
    def encode_batch(self, obs_windows: dict[str, np.ndarray]) -> dict[str, np.ndarray]:
        """Encode all categories in one batched forward pass.

        obs_windows: {cat: (seq_len, obs_dim)}
        Returns: {cat: (2,)} — [d_hat, p_waste]
        """
        cats = list(obs_windows.keys())
        x = torch.tensor(
            np.stack([obs_windows[c] for c in cats]), dtype=torch.float32
        ).to(self._device)
        c = torch.tensor([CATEGORY_IDS[c] for c in cats], dtype=torch.long).to(self._device)
        out = self._model(x, c)
        d_hats   = out["demand"].cpu().numpy()
        p_wastes = torch.sigmoid(out["waste_logit"]).cpu().numpy()
        return {
            cat: np.array([d_hats[i], p_wastes[i]], dtype=np.float32)
            for i, cat in enumerate(cats)
        }

    def augment(self, obs: np.ndarray, obs_window: np.ndarray, cat: str) -> np.ndarray:
        """Append forecaster features to flat obs. Returns (obs_dim + 2,) array."""
        return np.concatenate([obs, self.encode(obs_window, cat)])
