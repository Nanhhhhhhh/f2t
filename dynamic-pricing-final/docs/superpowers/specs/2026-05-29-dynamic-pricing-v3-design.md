# Dynamic Pricing v3 — Design Spec

_Date: 2026-05-29_

## 1. Problem & Goals

Xây dựng dynamic pricing module cho app e-commerce thực phẩm sạch (F2T). Module nhận trạng thái hiện tại của từng sản phẩm và đề xuất mức điều chỉnh giá (price delta) cho người bán.

**Hai mục tiêu:**
- Giảm thiểu waste rate (hàng bị bỏ vì hết độ tươi)
- Tối đa hóa revenue

**Yêu cầu cứng từ business:**
- Mặt hàng nào có freshness < 0.50 → bắt buộc bỏ, không được bán (WASTE_THRESHOLD = 0.50)
- Khi nhập hàng, chỉ chấp nhận lô hàng có f_delivery ≥ 0.70; dưới ngưỡng này → từ chối batch

**Output cho người bán:**
```json
{
  "category": "leafy",
  "recommended_delta": -0.10,
  "reason": "freshness 0.72, còn ~2 ngày, tồn kho 45 units, demand dự báo 28 units → cần giảm để clear",
  "freshness_zone": "caution",
  "competitor_position": "cheaper_than_market",
  "waste_probability": 0.34,
  "revenue_at_recommended": 48.2,
  "revenue_at_hold": 41.1
}
```

---

## 2. Context — Những gì đã thử và tại sao chưa ưng

### dynamic-pricing-v2 (Double DQN)
- Policy không duy nhất: seed agreement 28-56%
- Fruit/herbs/root luôn chọn +20% bất kể freshness → flat policy, không dynamic
- Black box, không giải thích được cho seller

### thesis_v2 (MPC + LSTM)
- Về số liệu tốt (waste -86%, revenue +25% vs static) nhưng:
- **Root cause của flat policy:** β là hằng số → với leafy β=−2.45, revenue(−30%) = 1.677× revenue(0%) luôn luôn, bất kể freshness hay inventory → MPC luôn chọn max discount
- MPC = elasticity_rule 7 dòng trên canonical env (p=0.187, không có ý nghĩa thống kê)
- Dùng WASTE_THRESHOLD=0.20 không phản ánh business rule thực tế (phải là 0.50)

**Yêu cầu cho v3:** Policy phải thực sự dynamic — f=0.9 và f=0.3 phải cho recommendations khác nhau.

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   SHARED FOUNDATION                     │
│  MarketEnv (daily) + Dunnhumby data + Eval framework    │
│  Monitoring dashboard + Decision explainer              │
└────────────────┬───────────────────────────────────────┘
                 │
        ┌────────▼────────┐
        │   TIER A        │  β(f) demand model
        │   LSTM + MPC    │  freshness-dependent elasticity
        └────────┬────────┘
                 │ flat policy? revenue drop?
        ┌────────▼────────┐
        │   TIER B        │  + quality premium trong MPC score
        │   LSTM + MPC+   │
        └────────┬────────┘
                 │ still insufficient?
        ┌────────▼────────┐
        │   TIER C        │  + Bayesian β(f) update từ real data
        │   Bandit + MPC  │  bridges Phase 1 → Phase 2
        └─────────────────┘
```

**Nguyên tắc:** Build foundation chung một lần, implement từng tier, evaluate, chuyển tier nếu chưa đủ.

**Không thay đổi từ thesis_v2:** LSTM architecture (ForecasterLSTM), isotonic calibration, revenue floor, clearability override, shared model + category embedding, daily timestep, evaluation protocol (N=200 paired episodes).

---

## 4. Environment — Business Rules & Constants

### Business rules cứng
```
WASTE_THRESHOLD  = 0.50   (thesis_v2 dùng 0.20 — sai với thực tế)
RESTOCK_MIN_FRESH = 0.70   (từ chối batch nếu f_delivery < 0.70)

f_delivery ~ Uniform(0.70, 1.0)
if f_delivery < 0.70: bỏ qua restock ngày hôm đó (hụt hàng)
```

### Shelf life thực tế (với WASTE_THRESHOLD = 0.50)

| Category | c (decay) | Shelf life f₀=0.85→0.50 | Shelf life f₀=1.0→0.50 |
|---|---|---|---|
| leafy | 0.850 | 4.5 ngày | 5.5 ngày |
| root | 0.950 | 12.6 ngày | 14.2 ngày |
| fruit | 0.880 | 5.7 ngày | 6.8 ngày |
| herbs | 0.800 | 3.0 ngày | 3.8 ngày |

Herbs chỉ còn 3 ngày từ nhập đến bắt buộc bỏ — pricing phải react nhanh.

### Observation vector (obs_dim = 9)

| Index | Tên | Range | Ghi chú |
|---|---|---|---|
| [0] | freshness | [0, 1] | CoreML score |
| [1] | inv_ratio | [0, 2] | inv/100, capped |
| [2] | price_ratio | [~0.7, 2.0] | price/ref_price |
| [3] | sin_dow | [-1, 1] | seasonality |
| [4] | cos_dow | [-1, 1] | seasonality |
| [5] | days_to_restock | [0, 1] | min(days/30, 1.0) |
| [6] | demand_ratio | [0, 3] | sold_yesterday/base_demand |
| [7] | prev_delta | [-0.30, 0.20] | δ applied at t-1 |
| [8] | competitor_ratio | [0.5, 2.0] | median_comp_price/our_price |

**Phase 1:** competitor_ratio ~ Uniform(0.85, 1.15) per episode reset (synthetic)
**Phase 2:** competitor_ratio từ real platform data (swap in, không cần retrain từ đầu)

---

## 5. Demand Model — Freshness-Dependent Elasticity β(f)

### Root cause của flat policy và fix

```
Thesis_v2: λ = base_demand × (p/p_ref)^β × (0.4 + 0.6×f)
           β hằng số → revenue(-30%)/revenue(0%) = (0.70)^(1+β) không đổi theo f
           → MPC luôn chọn max discount với β < -1

V3:        β(f) = β_old + (β_fresh − β_old) × f
           β_fresh = β_base + spread/2   (ít co giãn khi tươi — quality premium)
           β_old   = β_base − spread/2   (co giãn mạnh khi cũ — phải clear)
           spread  = 2.0 (default, tune qua sensitivity analysis)

Constraint: ∫₀¹ β(f)df = β_base → giữ nguyên average elasticity từ Dunnhumby
```

### Revenue ratio tại δ=−30% với β(f), spread=2.0

```
Leafy (β_base=−2.45, β_fresh=−1.45, β_old=−3.45):
  f=0.9: β(f)=−1.54 → revenue gain = (0.70)^(−0.54) = +26%  ← move penalty có thể chặn
  f=0.6: β(f)=−2.45 → revenue gain = (0.70)^(−1.45) = +68%  ← moderate-strong discount
  f=0.3: β(f)=−3.35 → revenue gain = (0.70)^(−2.35) = +180% ← max discount tối ưu
```

→ Khi f cao, revenue gain từ discount nhỏ hơn nhiều → `λ_move=3.0` đủ sức tạo price stickiness.

### Demand model đầy đủ

```
λ = base_demand × (p/p_ref)^β(f) × (0.4 + 0.6×f) × comp_mult × season(dow)

comp_mult = (p_comp / p_our)^γ,  γ = 0.30 (tunable)
  Phase 1: p_comp từ synthetic Uniform(0.85, 1.15) × ref_price
  Phase 2: p_comp từ platform data

season(dow) = 1 + sin_weekly×sin(2πd/7) + cos_weekly×cos(2πd/7)
  Weekend boost: amplitude ~20% (scale up từ Dunnhumby's 3% — không thực tế)
```

### Cross-elasticity

Tắt hoàn toàn trong Tier A để isolate β(f) effect và dễ debug. Sẽ xem xét lại nếu cần.

---

## 6. LSTM Forecaster

### Kiến trúc (giữ từ thesis_v2, chỉ đổi obs_dim)

```
Input:
  features: (B, T=21, D=9)    ← tăng từ 8 lên 9
  category_idx: (B,)

Layers:
  cat_embed = Embedding(4, 8)
  lstm = LSTM(input=9, hidden=128, layers=2, dropout=0.2)

Heads:
  demand_head = Linear(136 → 1)
  waste_head  = Linear(136 → 1)

Calibration: Isotonic regression (giữ từ thesis_v2)
```

### Labels thay đổi với WASTE_THRESHOLD=0.50

```
waste_7d = 1 nếu có ≥1 waste event trong 7 ngày tới
           (waste event: f < 0.50 AND inv > 0)

Waste rate sẽ cao hơn thesis_v2 (threshold cao hơn)
→ pos_weight cần recalculate từ actual waste_rate
→ training data generation cần reflect threshold mới
```

### Training (giữ từ thesis_v2)

```
3000 episodes, policies: ~33% random / ~33% markdown / ~33% static
Split: 70/15/15, stratified theo (policy × has_waste)
Optimizer: Adam(lr=3e-4, wd=1e-4), CosineAnnealingLR
Batch=256, patience=5, grad_clip=1.0
```

---

## 7. MPC Controller

### Tier A — Scoring không đổi, β(f) làm việc ngầm

```
score(δ) = λ_waste × P_waste(δ) − revenue(δ) + λ_move × |δ − δ_prev|

Không thay đổi công thức, nhưng revenue(δ) giờ dùng β(f) thay β_base
→ khi f=0.9: revenue gain nhỏ → λ_move chặn được discount
→ khi f=0.3: revenue gain lớn → MPC tự nhiên chọn discount
```

### Tier A — Thay đổi constants

```
clearability_horizon: 12 → 6 ngày  (shelf life ngắn hơn với threshold 0.50)

Clearability override trigger:
  Điều kiện 4: 0 < t_critical < 6  (từ < 12)
  t_critical tính tới f=0.50 thay vì f=0.20
```

### Tier B — Quality premium (chỉ implement nếu Tier A vẫn flat)

```
score(δ) = λ_waste × P_waste(δ)
         − revenue(δ) × quality_mult(f, δ)
         + λ_move × |δ − δ_prev|

quality_mult(f, δ) = 1.0 + γ × f × max(0, δ),  γ=0.5
  → f=0.9, δ=+0.10: mult=1.045 → premium pricing được reward thêm
  → f=0.3, δ=+0.10: mult=1.015 → gần như không có effect → favor discount
```

---

## 8. Monitoring Layer

### 1. Training monitor (real-time)

Mỗi eval checkpoint:
- `train_loss`, `val_loss` (demand + waste riêng biệt)
- Waste AUROC per category
- Demand MAE per category
- Auto-save plots vào `checkpoints/plots/`

### 2. Policy heatmap (sau mỗi training run)

```
Axis X: freshness (0.2 → 1.0, 9 levels)
Axis Y: inv_ratio (0.2 → 2.0, 5 levels)
Cell:   δ được MPC recommend

Generate cho cả 4 categories
Pass criterion: f=0.9 ≠ f=0.3 trong ≥ 3/4 categories
```

### 3. Decision explainer (output cho seller)

```json
{
  "category": "leafy",
  "recommended_delta": -0.10,
  "reason": "<text giải thích>",
  "freshness_zone": "caution | healthy | critical",
  "competitor_position": "cheaper | parity | premium",
  "waste_probability": 0.34,
  "revenue_at_recommended": 48.2,
  "revenue_at_hold": 41.1
}
```

**Freshness zones với WASTE_THRESHOLD=0.50:**
```
critical: f < 0.55  (còn < 1 ngày với decay rate)
caution:  0.55 ≤ f < 0.70
healthy:  f ≥ 0.70
```

---

## 9. Phase 1 → Phase 2 Transition

### Phase 1 (hiện tại)

- Demand params từ Dunnhumby + β(f) model
- competitor_ratio synthetic
- Recommendations đưa cho seller để confirm trước khi apply

### Transition trigger (bất kỳ điều kiện nào)

```
- N_transactions ≥ 500 per category
- Hoặc 90 ngày vận hành
```

### Data logging schema (bridge Phase 1→2)

```python
{
  "timestamp": ...,
  "category": ...,
  "obs_vector": [...],         # 9-dim
  "recommended_delta": ...,
  "applied_delta": ...,        # seller có thể override
  "seller_override": bool,     # True → exclude khỏi supervised training
  "outcome": {
    "units_sold_next_day": ...,
    "units_wasted": ...,
    "revenue": ...
  }
}
```

### Phase 2

- Fine-tune LSTM với real transactions
- Refit β_fresh và β_old endpoints từ actual demand-price data
- Swap competitor_ratio từ platform data (obs_dim không thay đổi → fine-tune, không retrain)

---

## 10. Evaluation Criteria

| Metric | Nguồn | Pass threshold |
|---|---|---|
| Waste event rate | N=200 paired episodes | ≤ 0.0033 (thesis_v2 baseline) |
| Total revenue | N=200 paired episodes | ≥ 3,328 (thesis_v2 baseline) |
| **Policy dynamism** | Policy heatmap | f=0.9 ≠ f=0.3 trong ≥ 3/4 categories |
| Waste AUROC | Forecaster eval | ≥ 0.85 per category |
| Demand MAE/day | Forecaster eval | ≤ 3.0 overall |

"Policy dynamism" là metric mới — đây là thứ thesis_v2 failed.

---

## 11. Thứ tự Build

```
1.  Fix demand model (β(f) + seasonality + comp_mult + WASTE_THRESHOLD=0.50)
2.  Update MarketEnv (obs_dim 8→9, business rules)
3.  Generate training data (3000 episodes)
4.  Train LSTM (ForecasterLSTM, checkpoint v4)
5.  Eval + policy heatmap → USER CONFIRMS
6.  Nếu pass policy dynamism → Tier A done
7.  Nếu flat → implement Tier B (quality_mult trong MPC)
8.  Re-eval + heatmap → USER CONFIRMS
9.  Nếu pass → done
10. Nếu vẫn fail → design Tier C (Bayesian β(f) update)
```

Mỗi bước 5, 8, 10: show kết quả, user confirm trước khi tiếp tục.

---

## 12. Parameter Rationale (evidence-based)

### spread = 1.5 cho β(f)
Literature về quality premium trong food pricing cho thấy premium organic products có β≈−0.3, discount products cùng category có β≈−1.8 — khoảng cách ≈1.5. Spread=1.5 phù hợp với evidence này. Spread=2.0 (ban đầu) hơi aggressive so với data.

Sensitivity analysis cần chạy với spread ∈ {0.5, 1.0, 1.5, 2.0} và plot policy heatmap — bạn confirm spread nào tạo ra behavior đúng trước khi commit vào training.

**Sources:** Binary Consulting Group Price Elasticity in Fresh Produce; ResearchGate Demand Elasticities for Fresh Fruit at Retail Level.

### γ = 0.30 cho comp_mult
Cross-price elasticity cho food substitutes điển hình 0.2–0.5. Beef-pork (close substitutes) = 0.33; fresh & chilled vs frozen = 0.64. Within-platform fresh produce (rất substitutable) → γ=0.30 là conservative estimate hợp lý, nằm trong khoảng literature.

**Sources:** NIESR Estimating Food and Drink Demand Elasticities (2022); PMC8424883 cross-price elasticity analysis.

### weekend_boost = 20% cho seasonality
Literature xác nhận Friday/Saturday demand spike là real và đáng kể trong fresh produce retail. RELEX Solutions: "safety stock on Saturday guarantees spoilage on Monday" — implying variation >2x giữa Saturday và Monday. Holiday spikes thực đo được 18–30%. 20% là conservative lower bound của estimate này.

Dunnhumby's 3% amplitude clearly under-estimates thực tế (US supermarket data, không phải F2T Vietnamese market). 20% là prior hợp lý; cần calibrate khi có real transaction data.

**Sources:** RELEX Solutions Fresh Forecasting Weekday Variations; AgrierERP Seasonality & Demand Fluctuations.

### Remaining open questions (cần confirm khi implement)

1. **spread**: chạy sensitivity analysis, plot heatmap, bạn confirm trước khi commit
2. **Categories**: giữ nguyên leafy/root/fruit/herbs — có thể điều chỉnh khi integrate vào app thực
