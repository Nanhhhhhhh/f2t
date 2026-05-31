import numpy as np
import pytest
from src.forecaster.data import generate_dataset, PerishableForecastDataset

def test_generate_dataset_small():
    records = generate_dataset(n_episodes=3, seed=0)
    assert len(records) > 0
    first = records[0]
    assert "features" in first and "category_idx" in first
    assert "demand_7d" in first and "waste_7d" in first

def test_features_shape():
    records = generate_dataset(n_episodes=3, seed=0)
    first = records[0]
    assert first["features"].shape == (21, 10)  # (OBS_WINDOW, OBS_DIM)

def test_waste_label_is_binary():
    records = generate_dataset(n_episodes=5, seed=0)
    labels = [r["waste_7d"] for r in records]
    assert all(v in (0, 1) for v in labels)

def test_demand_label_non_negative():
    records = generate_dataset(n_episodes=5, seed=0)
    assert all(r["demand_7d"] >= 0 for r in records)

def test_dataset_wraps_records():
    records = generate_dataset(n_episodes=3, seed=0)
    ds = PerishableForecastDataset(records)
    assert len(ds) == len(records)
    sample = ds[0]
    assert set(sample.keys()) >= {"features", "category_idx", "demand_7d", "waste_7d"}
