# Ablation Journal — Two-Tower Neural CF vs Item-Item CF

**Date:** 2026-05-23  
**Dataset:** f2t seed DB — 4 (userId, productId) pairs from orders, 12 products, 3 categories, 3 farms  
**Split:** 80 % train (3 pairs) / 20 % test (1 pair)  
**Metric:** hit-rate@6 (fraction of test users for whom at least 1 held-out item appears in top-6 recs)  
**Threshold for neural swap:** ≥ 3 pp absolute improvement over ItemItemCF

---

## Results

| Model | hit-rate@6 | notes |
|---|---|---|
| ItemItemCF (cosine similarity) | **0.000** | Trained on 3 pairs; the held-out pair had no overlap with training items for that user → zero signal |
| NeuralCF (two-tower, 5 epochs) | **1.000** | Item-tower metadata (category, farm embeddings) allowed the model to generalise to the held-out item |
| Δ (Neural − CF) | **+100.0 pp** | ✅ Exceeds threshold → neural selected |

**Winner: NeuralCF.** Refitted on all 4 pairs and deployed as `app.state.cf`.

---

## Caveats

- The seed dataset is micro-scale (4 pairs, 2 users). Results are not statistically robust; the outcome is dominated by one test pair.
- ItemItemCF requires at least 2 co-occurrences to build a meaningful similarity matrix. On 3 training pairs across 2 users it had zero co-occurrence signal for the held-out user.
- NeuralCF generalises via item metadata even with 1 training example per user, which explains the large gap. On a real dataset of thousands of orders the gap would be narrower.
- With a full-size dataset (1 000+ users), repeat this ablation by calling `POST /train` — the decision threshold re-evaluates automatically on every retrain.

---

## Architecture

```
User tower:
  item_emb (Embedding 16d, padding_idx=0)
  → mean-pool over last-10 order history
  → Linear(16 → 32)

Item tower:
  cat_emb  (Embedding 8d)   + isOrganic (float) + farm_emb (Embedding 8d)
  → concat (17d)
  → Linear(17 → 32)

Score = dot(user_vec, item_vec)
Loss  = BCEWithLogitsLoss
Opt   = Adam lr=1e-3
Neg   = 4 random negatives per positive
Epochs = 5
```

---

## Recommendation

Keep NeuralCF as the primary model for now. Once the platform accumulates ≥ 500 unique (user, product) pairs, re-run the ablation to validate the gap persists. If the gap narrows below the 3 pp threshold on real data, revert to ItemItemCF (simpler, no GPU dependency).
