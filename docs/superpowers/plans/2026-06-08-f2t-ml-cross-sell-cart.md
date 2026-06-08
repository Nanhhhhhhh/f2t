# F2T ML Cross-sell Giỏ hàng — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm tính năng cross-sell "Thường mua kèm" trong giỏ hàng F2T, dùng association-rule mining (FP-Growth, category-level) warm-start từ Instacart 2017, phục vụ qua sidecar Python cổng 8001, backend re-rank ưu tiên cùng farm, frontend hiển thị trong màn hình giỏ.

**Architecture:** 5 lớp tuần tự: (1) pipeline Python đào luật category-level → artifact JSON; (2) sidecar FastAPI `/recommend` nạp artifact; (3) module NestJS `recommendations` gọi sidecar + lọc tồn kho + boost cùng-farm + hydrate; (4) frontend hook + component; (5) wiring (app.module, cart.tsx). Sidecar = chấm điểm ML thuần; backend = nghiệp vụ + dữ liệu thật; fallback graceful ở mọi lớp.

**Tech Stack:** Python 3 (pandas, mlxtend, FastAPI, uvicorn, pytest) · NestJS 11 + Mongoose + @nestjs/axios (Jest) · React Native/Expo + react-query-kit + NativeWind (Jest).

**Spec:** `docs/superpowers/specs/2026-06-08-f2t-ml-cross-sell-cart-design.md`

---

## File Structure

**Tạo mới:**
- `recommender-final/requirements.txt` — deps train
- `recommender-final/category_map.json` — map aisle/department Instacart → category F2T
- `recommender-final/scripts/prepare_instacart.py` — CSV → baskets category (đã lọc)
- `recommender-final/scripts/mine_rules.py` — FP-Growth → artifact
- `recommender-final/scripts/generate_synthetic.py` — sinh baskets tổng hợp để test e2e khi chưa có Instacart
- `recommender-final/scripts/export_real_orders.py` — (GĐ2) export đơn thật → baskets product-level
- `recommender-final/tests/test_prepare.py`, `tests/test_mine.py`
- `recommender-final/model/.gitkeep` — nơi chứa artifact (`category_rules.json`, `category_popularity.json`)
- `recommender-final/README.md`
- `recommender-sidecar/requirements.txt`
- `recommender-sidecar/main.py` — FastAPI `/health` + `/recommend`
- `recommender-sidecar/tests/test_recommend.py`
- `f2t-backend/src/modules/recommendations/recommendations.module.ts`
- `f2t-backend/src/modules/recommendations/recommendations.controller.ts` (+ `.spec.ts`)
- `f2t-backend/src/modules/recommendations/recommendations.service.ts` (+ `.spec.ts`)
- `f2t-backend/src/modules/recommendations/dto/cross-sell.dto.ts`
- `f2t-backend/src/modules/recommendations/dto/recommend-sidecar.dto.ts`
- `f2t-frontend/src/api/recommendations/types.tsx`
- `f2t-frontend/src/api/recommendations/use-cross-sell.tsx`
- `f2t-frontend/src/components/cart/cross-sell.tsx`

**Sửa:**
- `f2t-backend/src/app.module.ts` — đăng ký `RecommendationsModule`
- `f2t-frontend/src/app/(app)/cart.tsx` — render `<CrossSell>`

---

## Contracts (định nghĩa 1 lần, dùng xuyên suốt)

**Categories F2T** (nguồn `product.schema.ts`): `leafy, root, fruit, herbs, mushrooms, grains, dairy, eggs, honey, other`.

**Sidecar `POST /recommend`:**
- Request: `{ "cart_categories": string[], "top_k": number }`
- Response: `{ "recommendations": [{ "category": string, "score": number, "source": "rule" | "fallback" }] }`

**Sidecar `GET /health`:** `{ "status": "ok", "model_version": string, "n_rules": number }`

**Artifact `category_rules.json`:** `{ "<antecedentCategory>": [{ "consequent": string, "lift": number, "confidence": number, "support": number }], ... }`

**Artifact `category_popularity.json`:** `{ "<category>": number, ... }` (tần suất xuất hiện, đã chuẩn hoá 0..1)

**Backend endpoint:** `GET /api/recommendations/cross-sell?productIds=<id1>,<id2>&limit=6` → envelope `{ success, data: Product[] }`.

---

# PHASE 1 — Pipeline Python (recommender-final/)

### Task 1.1: Scaffold thư mục + deps

**Files:**
- Create: `recommender-final/requirements.txt`
- Create: `recommender-final/model/.gitkeep`
- Create: `recommender-final/.gitignore`

- [ ] **Step 1: Tạo requirements.txt**

```
pandas>=2.0
mlxtend>=0.23
pyarrow>=14.0
pytest>=8.0
```

- [ ] **Step 2: Tạo .gitignore (không commit CSV/parquet lớn + venv)**

```
data/
venv/
__pycache__/
*.parquet
model/*.json
```

- [ ] **Step 3: Tạo model/.gitkeep (giữ thư mục rỗng)**

File trống.

- [ ] **Step 4: Commit**

```bash
git add recommender-final/requirements.txt recommender-final/model/.gitkeep recommender-final/.gitignore
git commit -m "chore(recommender): scaffold recommender-final pipeline dir"
```

---

### Task 1.2: category_map.json (map Instacart → F2T)

**Files:**
- Create: `recommender-final/category_map.json`

- [ ] **Step 1: Tạo file map (key = aisle Instacart lowercase; value = category F2T). Aisle không có trong map ⇒ bị loại.**

```json
{
  "fresh vegetables": "leafy",
  "packaged vegetables fruits": "leafy",
  "fresh herbs": "herbs",
  "fresh fruits": "fruit",
  "packaged produce": "fruit",
  "frozen produce": "fruit",
  "eggs": "eggs",
  "milk": "dairy",
  "yogurt": "dairy",
  "cream": "dairy",
  "butter": "dairy",
  "other creams cheeses": "dairy",
  "honeys syrups nectars": "honey",
  "grains rice dried goods": "grains",
  "bulk grains rice dried goods": "grains"
}
```

- [ ] **Step 2: Commit**

```bash
git add recommender-final/category_map.json
git commit -m "feat(recommender): aisle->F2T category map (drop non-mappable)"
```

> Ghi chú heuristic bổ sung (áp dụng trong prepare): nếu `product_name` chứa "mushroom" → category `mushrooms` (Instacart không có aisle nấm riêng); nếu chứa "carrot/potato/onion/radish/beet/ginger/garlic" và aisle là "fresh vegetables" → `root`. Logic này nằm trong `prepare_instacart.py`, không trong JSON.

---

### Task 1.3: prepare_instacart.py

**Files:**
- Create: `recommender-final/scripts/prepare_instacart.py`
- Test: `recommender-final/tests/test_prepare.py`

- [ ] **Step 1: Viết test thất bại (`tests/test_prepare.py`)**

```python
import pandas as pd
from scripts.prepare_instacart import map_aisle, build_baskets

def test_map_aisle_drops_unmappable():
    cmap = {"fresh vegetables": "leafy", "milk": "dairy"}
    assert map_aisle("fresh vegetables", "lettuce", cmap) == "leafy"
    assert map_aisle("milk", "whole milk", cmap) == "dairy"
    assert map_aisle("snacks", "chips", cmap) is None  # không map -> None (bỏ)

def test_map_aisle_mushroom_heuristic():
    cmap = {"fresh vegetables": "leafy"}
    assert map_aisle("fresh vegetables", "white mushroom", cmap) == "mushrooms"

def test_map_aisle_root_heuristic():
    cmap = {"fresh vegetables": "leafy"}
    assert map_aisle("fresh vegetables", "organic carrot", cmap) == "root"

def test_build_baskets_groups_distinct_categories():
    df = pd.DataFrame({
        "order_id": [1, 1, 1, 2],
        "category": ["leafy", "leafy", "dairy", "fruit"],
    })
    baskets = build_baskets(df)
    assert sorted(baskets[1]) == ["dairy", "leafy"]  # distinct
    assert baskets[2] == ["fruit"]
```

- [ ] **Step 2: Chạy test → FAIL**

Run: `cd recommender-final && python -m pytest tests/test_prepare.py -v`
Expected: FAIL `ModuleNotFoundError: scripts.prepare_instacart`

- [ ] **Step 3: Viết implementation**

```python
"""Đọc CSV Instacart, map aisle->F2T category (bỏ phần không map), gom baskets mức category."""
import json
import os
import sys
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

_ROOT_KEYWORDS = ("carrot", "potato", "onion", "radish", "beet", "ginger", "garlic", "turnip")

def map_aisle(aisle: str, product_name: str, cmap: dict) -> str | None:
    """Trả category F2T hoặc None nếu phải bỏ."""
    name = (product_name or "").lower()
    if "mushroom" in name:
        return "mushrooms"
    base = cmap.get((aisle or "").lower())
    if base == "leafy" and any(k in name for k in _ROOT_KEYWORDS):
        return "root"
    return base

def build_baskets(df: pd.DataFrame) -> dict[int, list[str]]:
    """df: cột order_id, category. Trả {order_id: [category distinct]}."""
    out: dict[int, set] = {}
    for oid, cat in zip(df["order_id"], df["category"]):
        out.setdefault(oid, set()).add(cat)
    return {k: sorted(v) for k, v in out.items()}

def main(data_dir: str, out_path: str) -> None:
    cmap = json.load(open(os.path.join(ROOT, "category_map.json")))
    products = pd.read_csv(os.path.join(data_dir, "products.csv"))
    aisles = pd.read_csv(os.path.join(data_dir, "aisles.csv"))
    products = products.merge(aisles, on="aisle_id", how="left")

    frames = []
    for fn in ("order_products__prior.csv", "order_products__train.csv"):
        fp = os.path.join(data_dir, fn)
        if os.path.exists(fp):
            frames.append(pd.read_csv(fp, usecols=["order_id", "product_id"]))
    order_products = pd.concat(frames, ignore_index=True)

    merged = order_products.merge(
        products[["product_id", "aisle", "product_name"]], on="product_id", how="left"
    )
    merged["category"] = [
        map_aisle(a, n, cmap) for a, n in zip(merged["aisle"], merged["product_name"])
    ]
    merged = merged.dropna(subset=["category"])  # bỏ item không map được

    baskets = build_baskets(merged[["order_id", "category"]])
    rows = [{"order_id": k, "categories": "|".join(v)} for k, v in baskets.items()]
    pd.DataFrame(rows).to_parquet(out_path, index=False)
    print(f"Wrote {len(rows)} baskets -> {out_path}")

if __name__ == "__main__":
    data_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "data")
    out_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, "baskets_category.parquet")
    main(data_dir, out_path)
```

- [ ] **Step 4: Chạy test → PASS**

Run: `cd recommender-final && python -m pytest tests/test_prepare.py -v`
Expected: PASS (4 passed)

- [ ] **Step 5: Commit**

```bash
git add recommender-final/scripts/prepare_instacart.py recommender-final/tests/test_prepare.py
git commit -m "feat(recommender): prepare_instacart - map+project baskets to F2T categories"
```

---

### Task 1.4: mine_rules.py (FP-Growth → artifact)

**Files:**
- Create: `recommender-final/scripts/mine_rules.py`
- Test: `recommender-final/tests/test_mine.py`

- [ ] **Step 1: Viết test thất bại**

```python
from scripts.mine_rules import mine

def test_mine_produces_rule_schema():
    baskets = [
        ["leafy", "herbs"], ["leafy", "herbs"], ["leafy", "herbs"],
        ["leafy", "fruit"], ["fruit", "honey"], ["leafy", "herbs", "fruit"],
    ]
    rules, popularity = mine(baskets, min_support=0.2, min_confidence=0.3)
    assert "leafy" in rules
    entry = rules["leafy"][0]
    assert set(entry.keys()) == {"consequent", "lift", "confidence", "support"}
    assert "leafy" in popularity and 0 <= popularity["leafy"] <= 1
```

- [ ] **Step 2: Chạy test → FAIL**

Run: `cd recommender-final && python -m pytest tests/test_mine.py -v`
Expected: FAIL `ModuleNotFoundError`

- [ ] **Step 3: Viết implementation**

```python
"""FP-Growth trên baskets category -> association rules (antecedent đơn -> consequent đơn)."""
import json
import os
import sys
import pandas as pd
from mlxtend.preprocessing import TransactionEncoder
from mlxtend.frequent_patterns import fpgrowth, association_rules

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def mine(baskets: list[list[str]], min_support: float = 0.02, min_confidence: float = 0.1):
    te = TransactionEncoder()
    arr = te.fit_transform(baskets)
    df = pd.DataFrame(arr, columns=te.columns_)

    freq = fpgrowth(df, min_support=min_support, use_colnames=True)
    rules_df = association_rules(freq, metric="lift", min_threshold=1.0)
    rules_df = rules_df[rules_df["confidence"] >= min_confidence]
    # chỉ giữ luật 1-1 (1 antecedent -> 1 consequent)
    rules_df = rules_df[
        (rules_df["antecedents"].apply(len) == 1) & (rules_df["consequents"].apply(len) == 1)
    ]

    rules: dict[str, list[dict]] = {}
    for _, r in rules_df.iterrows():
        a = next(iter(r["antecedents"]))
        c = next(iter(r["consequents"]))
        rules.setdefault(a, []).append({
            "consequent": c,
            "lift": round(float(r["lift"]), 4),
            "confidence": round(float(r["confidence"]), 4),
            "support": round(float(r["support"]), 4),
        })
    for a in rules:
        rules[a].sort(key=lambda x: x["lift"], reverse=True)

    n = len(baskets)
    counts: dict[str, int] = {}
    for b in baskets:
        for c in set(b):
            counts[c] = counts.get(c, 0) + 1
    popularity = {k: round(v / n, 4) for k, v in counts.items()}
    return rules, popularity

def main(baskets_path: str, out_dir: str, min_support: float, min_confidence: float) -> None:
    df = pd.read_parquet(baskets_path)
    baskets = [s.split("|") for s in df["categories"]]
    rules, popularity = mine(baskets, min_support, min_confidence)
    os.makedirs(out_dir, exist_ok=True)
    json.dump(rules, open(os.path.join(out_dir, "category_rules.json"), "w"), indent=2)
    json.dump(popularity, open(os.path.join(out_dir, "category_popularity.json"), "w"), indent=2)
    print(f"Wrote {sum(len(v) for v in rules.values())} rules, {len(popularity)} categories")

if __name__ == "__main__":
    baskets_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "baskets_category.parquet")
    out_dir = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, "model")
    ms = float(sys.argv[3]) if len(sys.argv) > 3 else 0.02
    mc = float(sys.argv[4]) if len(sys.argv) > 4 else 0.10
    main(baskets_path, out_dir, ms, mc)
```

- [ ] **Step 4: Chạy test → PASS**

Run: `cd recommender-final && python -m pytest tests/test_mine.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add recommender-final/scripts/mine_rules.py recommender-final/tests/test_mine.py
git commit -m "feat(recommender): mine_rules - FP-Growth -> category rules + popularity artifact"
```

---

### Task 1.5: generate_synthetic.py + sinh artifact để test e2e

**Files:**
- Create: `recommender-final/scripts/generate_synthetic.py`

- [ ] **Step 1: Viết script sinh baskets tổng hợp khớp 10 category F2T**

```python
"""Sinh baskets tổng hợp (khi chưa tải Instacart) để chạy mine_rules end-to-end."""
import os, sys, random
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATS = ["leafy", "root", "fruit", "herbs", "mushrooms", "grains", "dairy", "eggs", "honey", "other"]
# cặp hay đi cùng (mô phỏng tín hiệu) — chỉ để test pipeline, KHÔNG dùng cho thesis
AFFINITY = [("leafy", "herbs"), ("leafy", "root"), ("fruit", "honey"), ("dairy", "eggs"), ("grains", "eggs")]

def gen(n: int, seed: int = 42) -> list[list[str]]:
    random.seed(seed)
    out = []
    for _ in range(n):
        basket = set(random.sample(CATS, k=random.randint(1, 3)))
        for a, b in AFFINITY:
            if a in basket and random.random() < 0.6:
                basket.add(b)
        out.append(sorted(basket))
    return out

if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 5000
    out_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, "baskets_category.parquet")
    rows = [{"order_id": i, "categories": "|".join(b)} for i, b in enumerate(gen(n))]
    pd.DataFrame(rows).to_parquet(out_path, index=False)
    print(f"Wrote {n} synthetic baskets -> {out_path}")
```

- [ ] **Step 2: Sinh baskets + artifact, kiểm tra artifact tồn tại**

Run:
```bash
cd recommender-final && python scripts/generate_synthetic.py 5000 && python scripts/mine_rules.py baskets_category.parquet model 0.05 0.2 && ls -la model/
```
Expected: in ra `category_rules.json` + `category_popularity.json` trong `model/`.

- [ ] **Step 3: Commit (chỉ script, KHÔNG commit artifact/parquet — đã gitignore)**

```bash
git add recommender-final/scripts/generate_synthetic.py
git commit -m "feat(recommender): synthetic basket generator for e2e pipeline test"
```

---

### Task 1.6: README pipeline

**Files:**
- Create: `recommender-final/README.md`

- [ ] **Step 1: Viết README**

Nội dung bắt buộc có: (a) mục đích warm-start; (b) link Kaggle Instacart 2017 + cách tải về `data/`; (c) lệnh chạy `prepare_instacart.py` → `mine_rules.py`; (d) lệnh `generate_synthetic.py` cho test; (e) ghi rõ artifact `model/*.json` không commit, tái tạo được; (f) giới hạn category-level + lý do retrain.

- [ ] **Step 2: Commit**

```bash
git add recommender-final/README.md
git commit -m "docs(recommender): pipeline README (Instacart download, run, limitations)"
```

---

# PHASE 2 — Sidecar recommender (cổng 8001)

### Task 2.1: requirements + scaffold

**Files:**
- Create: `recommender-sidecar/requirements.txt`

- [ ] **Step 1: requirements.txt**

```
fastapi>=0.110
uvicorn>=0.29
pydantic>=2.0
pytest>=8.0
httpx>=0.27
```

- [ ] **Step 2: Commit**

```bash
git add recommender-sidecar/requirements.txt
git commit -m "chore(recommender-sidecar): requirements"
```

---

### Task 2.2: main.py — /health + /recommend (TDD)

**Files:**
- Create: `recommender-sidecar/main.py`
- Test: `recommender-sidecar/tests/test_recommend.py`

- [ ] **Step 1: Viết test thất bại (dùng FastAPI TestClient + monkeypatch artifact)**

```python
import importlib
from fastapi.testclient import TestClient

def _client(monkeypatch, tmp_path):
    import json
    (tmp_path / "category_rules.json").write_text(json.dumps({
        "leafy": [{"consequent": "herbs", "lift": 2.1, "confidence": 0.5, "support": 0.2}],
        "fruit": [{"consequent": "honey", "lift": 1.8, "confidence": 0.3, "support": 0.1}],
    }))
    (tmp_path / "category_popularity.json").write_text(json.dumps({"leafy": 0.6, "fruit": 0.4, "root": 0.5}))
    monkeypatch.setenv("RECOMMENDER_MODEL_DIR", str(tmp_path))
    import main
    importlib.reload(main)
    return TestClient(main.app)

def test_health(monkeypatch, tmp_path):
    c = _client(monkeypatch, tmp_path)
    r = c.get("/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"
    assert r.json()["n_rules"] == 2

def test_recommend_rule_hit(monkeypatch, tmp_path):
    c = _client(monkeypatch, tmp_path)
    r = c.post("/recommend", json={"cart_categories": ["leafy"], "top_k": 5})
    recs = r.json()["recommendations"]
    assert recs[0]["category"] == "herbs" and recs[0]["source"] == "rule"

def test_recommend_excludes_cart_categories(monkeypatch, tmp_path):
    c = _client(monkeypatch, tmp_path)
    r = c.post("/recommend", json={"cart_categories": ["leafy", "herbs"], "top_k": 5})
    cats = [x["category"] for x in r.json()["recommendations"]]
    assert "herbs" not in cats and "leafy" not in cats

def test_recommend_fallback_popularity(monkeypatch, tmp_path):
    c = _client(monkeypatch, tmp_path)
    r = c.post("/recommend", json={"cart_categories": ["mushrooms"], "top_k": 2})
    recs = r.json()["recommendations"]
    assert len(recs) > 0 and recs[0]["source"] == "fallback"
```

- [ ] **Step 2: Chạy test → FAIL**

Run: `cd recommender-sidecar && python -m pytest tests/test_recommend.py -v`
Expected: FAIL (no module `main`)

- [ ] **Step 3: Viết implementation**

```python
import json
import logging
import os

from fastapi import FastAPI
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_DIR = os.environ.get(
    "RECOMMENDER_MODEL_DIR",
    os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "recommender-final", "model")),
)

CATEGORY_RULES: dict[str, list[dict]] = {}
CATEGORY_POPULARITY: dict[str, float] = {}
MODEL_VERSION = "none"


def _load() -> None:
    global CATEGORY_RULES, CATEGORY_POPULARITY, MODEL_VERSION
    rules_path = os.path.join(MODEL_DIR, "category_rules.json")
    pop_path = os.path.join(MODEL_DIR, "category_popularity.json")
    try:
        CATEGORY_RULES = json.load(open(rules_path))
        CATEGORY_POPULARITY = json.load(open(pop_path))
        MODEL_VERSION = str(int(os.path.getmtime(rules_path)))
        logger.info(f"Loaded {len(CATEGORY_RULES)} antecedents from {rules_path}")
    except FileNotFoundError:
        logger.warning(f"Artifact not found in {MODEL_DIR}; serving empty rules (fallback only)")
        CATEGORY_RULES, CATEGORY_POPULARITY, MODEL_VERSION = {}, {}, "none"


app = FastAPI(title="F2T Recommender Sidecar")
_load()


class RecommendRequest(BaseModel):
    cart_categories: list[str]
    top_k: int = 5


class Recommendation(BaseModel):
    category: str
    score: float
    source: str


class RecommendResponse(BaseModel):
    recommendations: list[Recommendation]


@app.get("/health")
def health():
    return {"status": "ok", "model_version": MODEL_VERSION, "n_rules": len(CATEGORY_RULES)}


@app.post("/recommend", response_model=RecommendResponse)
def recommend(req: RecommendRequest) -> RecommendResponse:
    in_cart = set(req.cart_categories)
    scores: dict[str, float] = {}
    for cat in req.cart_categories:
        for rule in CATEGORY_RULES.get(cat, []):
            c = rule["consequent"]
            if c in in_cart:
                continue
            scores[c] = scores.get(c, 0.0) + float(rule["lift"])

    if scores:
        ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)[: req.top_k]
        recs = [Recommendation(category=c, score=round(s, 4), source="rule") for c, s in ranked]
        return RecommendResponse(recommendations=recs)

    # fallback: popularity, loại category đã có trong giỏ
    pop = sorted(
        ((c, s) for c, s in CATEGORY_POPULARITY.items() if c not in in_cart),
        key=lambda kv: kv[1],
        reverse=True,
    )[: req.top_k]
    recs = [Recommendation(category=c, score=round(s, 4), source="fallback") for c, s in pop]
    return RecommendResponse(recommendations=recs)
```

- [ ] **Step 4: Chạy test → PASS**

Run: `cd recommender-sidecar && python -m pytest tests/test_recommend.py -v`
Expected: PASS (4 passed)

- [ ] **Step 5: Commit**

```bash
git add recommender-sidecar/main.py recommender-sidecar/tests/test_recommend.py
git commit -m "feat(recommender-sidecar): /recommend (rule + popularity fallback) + /health"
```

---

# PHASE 3 — Backend module `recommendations`

### Task 3.1: DTOs

**Files:**
- Create: `f2t-backend/src/modules/recommendations/dto/cross-sell.dto.ts`
- Create: `f2t-backend/src/modules/recommendations/dto/recommend-sidecar.dto.ts`

- [ ] **Step 1: cross-sell.dto.ts (query DTO)**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CrossSellQueryDto {
  @ApiProperty({ description: 'Comma-separated productIds đang có trong giỏ' })
  @IsString()
  productIds!: string;

  @ApiPropertyOptional({ description: 'Số gợi ý tối đa', default: 6 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;
}
```

- [ ] **Step 2: recommend-sidecar.dto.ts (kiểu phản hồi sidecar)**

```typescript
export interface SidecarRecommendation {
  category: string;
  score: number;
  source: 'rule' | 'fallback';
}

export interface SidecarRecommendResponse {
  recommendations: SidecarRecommendation[];
}
```

- [ ] **Step 3: Commit**

```bash
git add f2t-backend/src/modules/recommendations/dto/
git commit -m "feat(recommendations): cross-sell query DTO + sidecar response types"
```

---

### Task 3.2: recommendations.service.ts (TDD)

**Files:**
- Create: `f2t-backend/src/modules/recommendations/recommendations.service.ts`
- Test: `f2t-backend/src/modules/recommendations/recommendations.service.spec.ts`

- [ ] **Step 1: Viết test thất bại**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { of, throwError } from 'rxjs';
import { Product } from '@modules/products/schemas/product.schema';
import { RecommendationsService } from './recommendations.service';

const mockHttp = { post: jest.fn() };
const mockConfig = { get: jest.fn((k: string, d?: string) => d ?? '') };

// chainable mock cho productModel.find().select().lean()
function leanResult(rows: any[]) {
  return { select: () => ({ lean: () => Promise.resolve(rows) }) };
}

const mockProductModel = { find: jest.fn() };

describe('RecommendationsService', () => {
  let service: RecommendationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        { provide: HttpService, useValue: mockHttp },
        { provide: ConfigService, useValue: mockConfig },
        { provide: getModelToken(Product.name), useValue: mockProductModel },
      ],
    }).compile();
    service = module.get(RecommendationsService);
  });

  it('returns [] for empty productIds', async () => {
    const res = await service.getCrossSell([], 6);
    expect(res).toEqual([]);
    expect(mockHttp.post).not.toHaveBeenCalled();
  });

  it('maps sidecar categories to in-stock products, excludes cart items, boosts same farm', async () => {
    // cart lookup
    mockProductModel.find.mockReturnValueOnce(
      leanResult([{ _id: 'p1', category: 'leafy', farmId: 'farmA' }]),
    );
    mockHttp.post.mockReturnValue(
      of({ data: { recommendations: [{ category: 'herbs', score: 2.1, source: 'rule' }] } }),
    );
    // candidate lookup: 1 cùng farm, 1 khác farm
    mockProductModel.find.mockReturnValueOnce(
      leanResult([
        { _id: 'p2', category: 'herbs', farmId: 'farmB', availableQuantity: 5 },
        { _id: 'p3', category: 'herbs', farmId: 'farmA', availableQuantity: 5 },
      ]),
    );
    const res = await service.getCrossSell(['p1'], 6);
    expect(mockHttp.post).toHaveBeenCalledWith(
      expect.stringContaining('/recommend'),
      expect.objectContaining({ cart_categories: ['leafy'] }),
      expect.any(Object),
    );
    // p3 (cùng farmA) phải xếp trước p2
    expect(res.map((p: any) => p._id)).toEqual(['p3', 'p2']);
  });

  it('falls back to same-farm products when sidecar errors', async () => {
    mockProductModel.find.mockReturnValueOnce(
      leanResult([{ _id: 'p1', category: 'leafy', farmId: 'farmA' }]),
    );
    mockHttp.post.mockReturnValue(throwError(() => new Error('sidecar down')));
    mockProductModel.find.mockReturnValueOnce(
      leanResult([{ _id: 'p9', category: 'root', farmId: 'farmA', availableQuantity: 3 }]),
    );
    const res = await service.getCrossSell(['p1'], 6);
    expect(res.map((p: any) => p._id)).toEqual(['p9']);
  });
});
```

- [ ] **Step 2: Chạy test → FAIL**

Run: `cd f2t-backend && npx jest src/modules/recommendations/recommendations.service.spec.ts`
Expected: FAIL (cannot find module)

- [ ] **Step 3: Viết implementation**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { Product, ProductDocument } from '@modules/products/schemas/product.schema';
import { SidecarRecommendResponse } from './dto/recommend-sidecar.dto';

const FARM_BOOST = 1.5;
const ACTIVE_STATUS = ['available', 'seasonal'];

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
  ) {}

  async getCrossSell(productIds: string[], limit: number): Promise<Product[]> {
    if (!productIds.length) return [];

    const ids = productIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    const cartProducts = await this.productModel
      .find({ _id: { $in: ids } })
      .select('category farmId')
      .lean();
    if (!cartProducts.length) return [];

    const cartCategories = [...new Set(cartProducts.map((p) => p.category))];
    const cartFarmIds = new Set(cartProducts.map((p) => p.farmId.toString()));
    const cartProductIds = new Set(productIds);

    // 1) hỏi sidecar (graceful fallback)
    let recCategories: string[] = [];
    const scoreByCat = new Map<string, number>();
    const sidecarUrl = this.config.get<string>('RECOMMENDER_SIDECAR_URL', 'http://localhost:8001');
    try {
      const resp$ = this.http.post<SidecarRecommendResponse>(
        `${sidecarUrl}/recommend`,
        { cart_categories: cartCategories, top_k: 5 },
        { timeout: 5000 },
      );
      const { data } = await firstValueFrom(resp$);
      for (const r of data.recommendations) {
        recCategories.push(r.category);
        scoreByCat.set(r.category, r.score);
      }
    } catch (e) {
      this.logger.warn(`Recommender sidecar error: ${String(e)}`);
    }

    // 2) candidate query: theo category gợi ý HOẶC (fallback) cùng farm trong giỏ
    const orClauses: Record<string, unknown>[] = [];
    if (recCategories.length) orClauses.push({ category: { $in: recCategories } });
    orClauses.push({ farmId: { $in: [...cartFarmIds].map((f) => new Types.ObjectId(f)) } });

    const candidates = await this.productModel
      .find({
        $or: orClauses,
        status: { $in: ACTIVE_STATUS },
        availableQuantity: { $gt: 0 },
        _id: { $nin: ids },
      })
      .select('-__v')
      .lean();

    // 3) re-rank: ruleScore × farmBoost (loại item đã có trong giỏ; tie-break tồn kho)
    const ranked = candidates
      .filter((p) => !cartProductIds.has(p._id.toString()))
      .map((p) => {
        const ruleScore = scoreByCat.get(p.category) ?? 0.1; // fallback farm-product điểm nền
        const farmBoost = cartFarmIds.has(p.farmId.toString()) ? FARM_BOOST : 1.0;
        return { p, score: ruleScore * farmBoost };
      })
      .sort((a, b) => b.score - a.score || (b.p.availableQuantity ?? 0) - (a.p.availableQuantity ?? 0))
      .slice(0, limit)
      .map((x) => x.p as Product);

    return ranked;
  }
}
```

- [ ] **Step 4: Chạy test → PASS**

Run: `cd f2t-backend && npx jest src/modules/recommendations/recommendations.service.spec.ts`
Expected: PASS (3 passed)

> Lưu ý cho test: `.select()` trong code dùng chuỗi khác nhau ('category farmId' vs '-__v') nhưng mock `leanResult` bỏ qua tham số select nên vẫn khớp. Thứ tự `find` mock: lần 1 = cart lookup, lần 2 = candidate lookup.

- [ ] **Step 5: Commit**

```bash
git add f2t-backend/src/modules/recommendations/recommendations.service.ts f2t-backend/src/modules/recommendations/recommendations.service.spec.ts
git commit -m "feat(recommendations): service - sidecar call + stock filter + same-farm re-rank + fallback"
```

---

### Task 3.3: recommendations.controller.ts (TDD)

**Files:**
- Create: `f2t-backend/src/modules/recommendations/recommendations.controller.ts`
- Test: `f2t-backend/src/modules/recommendations/recommendations.controller.spec.ts`

- [ ] **Step 1: Viết test thất bại**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';

const mockService = { getCrossSell: jest.fn() };

describe('RecommendationsController', () => {
  let controller: RecommendationsController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationsController],
      providers: [{ provide: RecommendationsService, useValue: mockService }],
    }).compile();
    controller = module.get(RecommendationsController);
  });

  it('parses productIds csv and forwards to service with default limit 6', async () => {
    mockService.getCrossSell.mockResolvedValue([{ _id: 'p2' }]);
    const res = await controller.crossSell({ productIds: 'p1,p2', limit: undefined });
    expect(mockService.getCrossSell).toHaveBeenCalledWith(['p1', 'p2'], 6);
    expect(res).toEqual([{ _id: 'p2' }]);
  });

  it('returns [] for blank productIds', async () => {
    const res = await controller.crossSell({ productIds: '', limit: 6 });
    expect(res).toEqual([]);
    expect(mockService.getCrossSell).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Chạy test → FAIL**

Run: `cd f2t-backend && npx jest src/modules/recommendations/recommendations.controller.spec.ts`
Expected: FAIL

- [ ] **Step 3: Viết implementation**

```typescript
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RecommendationsService } from './recommendations.service';
import { CrossSellQueryDto } from './dto/cross-sell.dto';

@ApiTags('recommendations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly service: RecommendationsService) {}

  @Get('cross-sell')
  @ApiOperation({ summary: 'Sản phẩm "thường mua kèm" theo nội dung giỏ hàng (cross-sell)' })
  @ApiResponse({ status: 200, description: 'Danh sách sản phẩm gợi ý' })
  async crossSell(@Query() query: CrossSellQueryDto) {
    const ids = (query.productIds ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!ids.length) return [];
    return this.service.getCrossSell(ids, query.limit ?? 6);
  }
}
```

- [ ] **Step 4: Chạy test → PASS**

Run: `cd f2t-backend && npx jest src/modules/recommendations/recommendations.controller.spec.ts`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add f2t-backend/src/modules/recommendations/recommendations.controller.ts f2t-backend/src/modules/recommendations/recommendations.controller.spec.ts
git commit -m "feat(recommendations): cross-sell controller (GET /recommendations/cross-sell)"
```

---

### Task 3.4: recommendations.module.ts + đăng ký app.module

**Files:**
- Create: `f2t-backend/src/modules/recommendations/recommendations.module.ts`
- Modify: `f2t-backend/src/app.module.ts`

- [ ] **Step 1: recommendations.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { Product, ProductSchema } from '@modules/products/schemas/product.schema';
import { RecommendationsService } from './recommendations.service';
import { RecommendationsController } from './recommendations.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    HttpModule,
  ],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
```

- [ ] **Step 2: Đăng ký trong app.module.ts**

Thêm import (cạnh các module ML khác, gần dòng 1-2):
```typescript
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
```
Thêm `RecommendationsModule` vào mảng `imports:` (cạnh `DemandForecastingModule`).

Kiểm tra Joi env (gần dòng 57) — `RECOMMENDER_SIDECAR_URL` đã có trong `.env.development`; nếu khối validationSchema có liệt kê sidecar khác, thêm:
```typescript
RECOMMENDER_SIDECAR_URL: Joi.string().optional().default('http://localhost:8001'),
```

- [ ] **Step 3: Build + toàn bộ test backend xanh**

Run: `cd f2t-backend && npm run lint && npx jest src/modules/recommendations`
Expected: lint sạch; tất cả test recommendations PASS.

- [ ] **Step 4: Commit**

```bash
git add f2t-backend/src/modules/recommendations/recommendations.module.ts f2t-backend/src/app.module.ts
git commit -m "feat(recommendations): module wiring + register in app.module"
```

---

# PHASE 4 — Frontend

### Task 4.1: api/recommendations (types + hook)

**Files:**
- Create: `f2t-frontend/src/api/recommendations/types.tsx`
- Create: `f2t-frontend/src/api/recommendations/use-cross-sell.tsx`

- [ ] **Step 1: types.tsx**

```tsx
import type { Product } from '@/types';

export type CrossSellVariables = { productIds: string[]; limit?: number };

export type CrossSellResponse = {
  success: boolean;
  data: Product[];
  message?: string;
};
```

- [ ] **Step 2: use-cross-sell.tsx (react-query-kit createQuery, theo pattern dynamic-pricing)**

```tsx
import { createQuery } from 'react-query-kit';

import { client } from '../common/client';
import type { CrossSellResponse, CrossSellVariables } from './types';

export const useCrossSell = createQuery<CrossSellResponse, CrossSellVariables, Error>({
  queryKey: ['cross-sell'],
  fetcher: async (variables) => {
    if (!variables.productIds.length) {
      return { success: true, data: [] };
    }
    const response = await client.get('/recommendations/cross-sell', {
      params: {
        productIds: variables.productIds.join(','),
        limit: variables.limit ?? 6,
      },
    });
    return response.data as CrossSellResponse;
  },
  staleTime: 2 * 60 * 1000,
  gcTime: 5 * 60 * 1000,
});
```

- [ ] **Step 3: Type-check**

Run: `cd f2t-frontend && pnpm type-check`
Expected: 0 lỗi (nếu `Product` type path khác, sửa import cho khớp `src/types`).

- [ ] **Step 4: Commit**

```bash
git add f2t-frontend/src/api/recommendations/
git commit -m "feat(api): cross-sell recommendations hook (react-query-kit)"
```

---

### Task 4.2: components/cart/cross-sell.tsx (TDD)

**Files:**
- Create: `f2t-frontend/src/components/cart/cross-sell.tsx`
- Test: `f2t-frontend/src/components/cart/cross-sell.test.tsx`

- [ ] **Step 1: Viết test thất bại (mock hook + cart store)**

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { CrossSell } from './cross-sell';

const mockAddItem = jest.fn();
jest.mock('@/lib/cart', () => ({ useCart: () => ({ addItem: mockAddItem }) }));

const mockUse = jest.fn();
jest.mock('@/api/recommendations/use-cross-sell', () => ({
  useCrossSell: (args: any) => mockUse(args),
}));

describe('CrossSell', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders nothing when no recommendations', () => {
    mockUse.mockReturnValue({ data: { success: true, data: [] }, isLoading: false });
    const { toJSON } = render(<CrossSell productIds={['p1']} />);
    expect(toJSON()).toBeNull();
  });

  it('renders products and adds to cart on press', () => {
    mockUse.mockReturnValue({
      data: { success: true, data: [{ id: 'p2', name: 'Rau mùi', pricePerUnit: 10000 }] },
      isLoading: false,
    });
    render(<CrossSell productIds={['p1']} />);
    expect(screen.getByText('Rau mùi')).toBeTruthy();
    fireEvent.press(screen.getByTestId('cross-sell-add-p2'));
    expect(mockAddItem).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Chạy test → FAIL**

Run: `cd f2t-frontend && npx jest src/components/cart/cross-sell.test.tsx`
Expected: FAIL (cannot find module)

- [ ] **Step 3: Viết implementation (< 80 dòng, named export, NativeWind)**

```tsx
import React from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';

import { useCrossSell } from '@/api/recommendations/use-cross-sell';
import { Text, View } from '@/components/ui';
import { useCart } from '@/lib/cart';
import type { Product } from '@/types';

type Props = { productIds: string[] };

export const CrossSell = ({ productIds }: Props) => {
  const { addItem } = useCart();
  const { data, isLoading } = useCrossSell({ variables: { productIds } });
  const items: Product[] = data?.data ?? [];

  if (isLoading || items.length === 0) return null;

  return (
    <View className="mt-4 px-4">
      <Text className="mb-2 text-base font-semibold">Thường mua kèm</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {items.map((p) => (
          <View key={p.id} className="mr-3 w-32 rounded-xl border border-neutral-200 p-2">
            <Text numberOfLines={1} className="text-sm font-medium">
              {p.name}
            </Text>
            <Text className="mt-1 text-xs text-neutral-500">
              {p.pricePerUnit?.toLocaleString('vi-VN')}đ
            </Text>
            <TouchableOpacity
              testID={`cross-sell-add-${p.id}`}
              className="mt-2 rounded-lg bg-primary-600 py-1"
              onPress={() => addItem(p, 1)}
            >
              <Text className="text-center text-xs text-white">Thêm</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};
```

- [ ] **Step 4: Chạy test → PASS**

Run: `cd f2t-frontend && npx jest src/components/cart/cross-sell.test.tsx`
Expected: PASS (2 passed)

> Nếu `useCrossSell` của react-query-kit nhận `{ variables }` khác cách mock, chỉnh test/mock cho khớp chữ ký thật. Kiểm `Text/View` có nhận `className` (NativeWind) — theo `components/ui`.

- [ ] **Step 5: Commit**

```bash
git add f2t-frontend/src/components/cart/cross-sell.tsx f2t-frontend/src/components/cart/cross-sell.test.tsx
git commit -m "feat(cart): CrossSell component (thường mua kèm)"
```

---

### Task 4.3: Tích hợp vào cart.tsx

**Files:**
- Modify: `f2t-frontend/src/app/(app)/cart.tsx`

- [ ] **Step 1: Import + render dưới danh sách CartItem (sau dòng ~154, trước Cart Summary)**

Thêm import:
```tsx
import { CrossSell } from '@/components/cart/cross-sell';
```
Trong JSX, ngay sau khối map `<CartItem .../>` (khoảng dòng 154) và còn trong `<ScrollView>`:
```tsx
<CrossSell productIds={cart.items.map((i) => i.productId)} />
```

- [ ] **Step 2: Type-check + test giỏ không vỡ**

Run: `cd f2t-frontend && pnpm type-check && npx jest src/lib/cart`
Expected: 0 lỗi type; test cart hiện có vẫn PASS.

- [ ] **Step 3: Commit**

```bash
git add "f2t-frontend/src/app/(app)/cart.tsx"
git commit -m "feat(cart): render CrossSell in cart screen"
```

---

# PHASE 5 — Hoàn tất & kiểm thử tích hợp

### Task 5.1: Full backend lint + test

- [ ] **Step 1: Chạy toàn bộ**

Run: `cd f2t-backend && npm run lint && npm test`
Expected: lint 0 lỗi; toàn bộ suite PASS (bao gồm recommendations service + controller).

- [ ] **Step 2: Nếu fail — sửa theo lỗi cụ thể, KHÔNG bỏ qua test.**

---

### Task 5.2: E2E thủ công sidecar ↔ backend (verification, không commit code)

- [ ] **Step 1: Sinh artifact synthetic (nếu chưa có Instacart)**

Run: `cd recommender-final && python scripts/generate_synthetic.py 5000 && python scripts/mine_rules.py baskets_category.parquet model 0.05 0.2`

- [ ] **Step 2: Chạy sidecar**

Run (background): `cd recommender-sidecar && uvicorn main:app --port 8001`
Kiểm: `curl localhost:8001/health` → `status: ok`, `n_rules > 0`.
Kiểm: `curl -X POST localhost:8001/recommend -H 'Content-Type: application/json' -d '{"cart_categories":["leafy"],"top_k":5}'` → có `recommendations`.

- [ ] **Step 2b: Chạy backend, gọi endpoint với token thật**

Sau khi `npm run start:dev` + đăng nhập seed account lấy JWT:
`curl -H "Authorization: Bearer <token>" "localhost:3000/api/recommendations/cross-sell?productIds=<id giỏ>&limit=6"`
Expected: envelope `{success:true, data:[...]}`; tắt sidecar → vẫn trả (fallback cùng farm), không 500.

- [ ] **Step 3: Ghi kết quả verification vào commit message hoặc STATE.md (không có file code mới).**

---

### Task 5.3: export_real_orders.py (GĐ2 — chuẩn bị retrain, chưa kích hoạt)

**Files:**
- Create: `recommender-final/scripts/export_real_orders.py`

- [ ] **Step 1: Viết script export đơn thật → baskets product-level**

```python
"""GĐ2: export orders thật từ Mongo -> baskets mức product để retrain product-level.
Chạy thủ công khi đã tích luỹ đủ đơn thật. Cần MONGODB_URI."""
import os, sys, json
from collections import defaultdict
from pymongo import MongoClient  # thêm pymongo vào requirements khi dùng

def export(mongo_uri: str, out_path: str, min_baskets: int = 200) -> None:
    db = MongoClient(mongo_uri).get_default_database()
    baskets = defaultdict(set)
    for o in db.orders.find({}, {"_id": 1, "items.productId": 1}):
        for it in o.get("items", []):
            baskets[str(o["_id"])].add(str(it["productId"]))
    rows = [{"order_id": k, "products": "|".join(sorted(v))} for k, v in baskets.items() if len(v) > 1]
    if len(rows) < min_baskets:
        print(f"WARN: chỉ {len(rows)} giỏ >1 item (<{min_baskets}); chưa đủ retrain product-level.")
    json.dump(rows, open(out_path, "w"))
    print(f"Wrote {len(rows)} baskets -> {out_path}")

if __name__ == "__main__":
    uri = os.environ.get("MONGODB_URI") or sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else "baskets_product.json"
    export(uri, out)
```

- [ ] **Step 2: Commit (script chuẩn bị, chưa wire vào pipeline tự động)**

```bash
git add recommender-final/scripts/export_real_orders.py
git commit -m "feat(recommender): GĐ2 export real orders -> product-level baskets (retrain prep)"
```

---

### Task 5.4: Cập nhật tài liệu dự án

**Files:**
- Modify: `CONTEXT.md` (hoặc README phù hợp)

- [ ] **Step 1: Ghi module mới + sidecar 8001 + lộ trình retrain + giới hạn category-level vào CONTEXT.md (mục module/known-issues).**

- [ ] **Step 2: Commit**

```bash
git add CONTEXT.md
git commit -m "docs: ghi nhận recommendations module + recommender sidecar 8001"
```

---

## Self-Review (đã rà trong lúc viết)

- **Spec coverage:** §3 kiến trúc → Phase 1-5; §4 pipeline → Task 1.2-1.6; §5 sidecar → Phase 2; §6 backend → Phase 3; §7 frontend → Phase 4; §8 retrain → Task 5.3; §10 fallback xếp lớp → sidecar fallback (Task 2.2) + backend same-farm fallback (Task 3.2); §11 testing → test ở mỗi task; §12 giới hạn → Task 1.6 README + Task 5.4 CONTEXT.
- **Type consistency:** `getCrossSell(productIds: string[], limit: number)` dùng nhất quán ở service + controller + spec; sidecar contract `{cart_categories, top_k}` / `{recommendations:[{category,score,source}]}` khớp giữa Task 2.2, 3.1, 3.2; artifact schema `category_rules.json` khớp giữa Task 1.4 và 2.2.
- **Placeholder scan:** không còn TBD/TODO; mọi step code đều có code thật.

---

## Execution Handoff

Sau khi review plan, chọn cách thực thi:
1. **Subagent-Driven (khuyên dùng)** — mỗi task 1 subagent mới, review giữa các task.
2. **Inline Execution** — chạy tuần tự trong session này với checkpoint.
