"""Generate train/val/test parquet datasets for the forecaster."""
import sys
import pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

import pandas as pd
import numpy as np
from src.forecaster.data import generate_dataset

N_EPISODES = 3000
N_TRAIN    = 2100
N_VAL      = 450
# N_TEST = 450 (remainder)

RECORDS_PER_EP_PER_CAT = 84   # EPISODE_LEN(91) - 7-day lookahead

print(f"Generating {N_EPISODES} episodes...")
records = generate_dataset(n_episodes=N_EPISODES, seed=42)
print(f"Total records: {len(records):,}")

records_per_ep = RECORDS_PER_EP_PER_CAT * 4  # 4 categories
n_train_rec = N_TRAIN * records_per_ep
n_val_rec   = N_VAL   * records_per_ep

train_records = records[:n_train_rec]
val_records   = records[n_train_rec:n_train_rec + n_val_rec]
test_records  = records[n_train_rec + n_val_rec:]

print(f"train: {len(train_records):,}  val: {len(val_records):,}  test: {len(test_records):,}")

out_dir = pathlib.Path("data/processed")
out_dir.mkdir(parents=True, exist_ok=True)

for split, recs in [("train", train_records), ("val", val_records), ("test", test_records)]:
    df = pd.DataFrame(recs)
    # features is (window, obs_dim) 2D array; store as list of 1-D row arrays so
    # pyarrow can serialize, and _load_dataset can reconstruct with np.stack()
    df["features"] = df["features"].apply(lambda x: list(x))
    df.to_parquet(out_dir / f"{split}.parquet", index=False)
    print(f"Saved {split}.parquet ({len(df):,} rows)")

print("Done.")
