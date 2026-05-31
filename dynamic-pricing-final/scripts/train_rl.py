"""Train shared Dueling DDQN pricing agent.

Run from project root:
    python scripts/train_rl.py
    python scripts/train_rl.py --forecaster checkpoints/forecaster_v4_best.pt
    python scripts/train_rl.py --forecaster checkpoints/forecaster_v4_best.pt --episodes 1500
    python scripts/train_rl.py --device mps --episodes 1500 --epsilon-decay-ep 1200
"""
import sys
import pathlib

ROOT = pathlib.Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

import argparse

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Dueling DDQN pricing agent")
    parser.add_argument("--episodes", type=int, default=3_000,
                        help="Number of training episodes (default: 3000)")
    parser.add_argument("--epsilon-decay-ep", type=int, default=None,
                        help="Episodes over which epsilon decays (default: 80%% of --episodes)")
    parser.add_argument("--device", type=str, default=None,
                        help="Device: cpu | mps | cuda (default: auto-detect)")
    parser.add_argument("--ckpt-dir", type=str, default="checkpoints",
                        help="Directory for best checkpoints (default: checkpoints/)")
    parser.add_argument("--forecaster", type=str, default=None,
                        help="Forecaster checkpoint to use as feature extractor")
    args = parser.parse_args()

    epsilon_decay_ep = args.epsilon_decay_ep or int(0.8 * args.episodes)

    from src.rl.train import train_all_categories
    print(f"Starting training: {args.episodes} episodes  epsilon_decay_ep={epsilon_decay_ep}")
    paths = train_all_categories(
        n_episodes=args.episodes,
        device=args.device,
        ckpt_dir=args.ckpt_dir,
        verbose=True,
        forecaster_path=args.forecaster,
        epsilon_decay_ep=epsilon_decay_ep,
    )
    print("\nBest checkpoints:")
    for name, p in paths.items():
        print(f"  {name}: {p}")
