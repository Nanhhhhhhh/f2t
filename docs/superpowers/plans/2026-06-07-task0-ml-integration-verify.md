# Task 0 — Verify ML Integration: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chứng minh bằng runtime evidence rằng `pricing-sidecar` phục vụ kiến trúc ML mới (`dynamic-pricing-final`: `SharedMLPDuelingQNet` + `ForecasterLSTM` + CoreML freshness) đúng 100%, và `f2t-backend` output đủ tài nguyên cho sidecar.

**Architecture:** Verification-driven (không TDD build feature). Mỗi task: chạy lệnh/đọc code → so với output kỳ vọng → ghi finding vào `.handoff/progress/task-0.md` + fact vào `.handoff/claims-ledger.md` → qua gate kỹ thuật (phải có bằng chứng runtime hoặc bảng so khớp) mới `done`.

**Tech Stack:** Python 3.13 (`pricing-sidecar/.venv`), PyTorch, coremltools, FastAPI/uvicorn, NestJS (`f2t-backend`), codegraph cho tra cứu cấu trúc.

**Mức verify:** Chạy thật + integration test (đã chốt trong spec). Mọi gate yêu cầu evidence resolve được.

---

## Bootstrap (đã thực hiện trong phiên design)

`.handoff/` được khởi tạo trực tiếp: `ONBOARDING.md`, `STATE.md`, `rules.md`, `task-tree.md`, `claims-ledger.md`, `progress/{task-0,task-1,task-2}.md`, kèm pointer `~/.claude/memory/project_f2t_handoff.md`. Mọi task dưới đây ghi tiến độ vào các file này.

**Quy ước evidence (Task 0 — biến thể enforcement):**
- "Citation" = log boot server / response JSON thật / bảng so khớp dim có trỏ `file:Lxx`.
- "Verify đối kháng" = chạy lại gate kỹ thuật độc lập (vd agent khác re-run smoke script và đối chiếu).
- Không `done` nếu thiếu output runtime thật.

---

## Task 1: Diff dynamic-pricing-v3 ↔ dynamic-pricing-final (T0.1)

**Files:**
- Read: `/Users/macos/dynamic-pricing-v3/`, `/Users/macos/f2t/dynamic-pricing-final/`
- Write findings: `/Users/macos/f2t/.handoff/progress/task-0.md`

- [ ] **Step 1: Diff cây thư mục src (bỏ nhiễu)**

Run:
```bash
diff -qr /Users/macos/dynamic-pricing-v3/src /Users/macos/f2t/dynamic-pricing-final/src \
  -x '__pycache__' -x '*.pyc' 2>&1
```
Expected: Liệt kê file chỉ-có-một-bên hoặc khác nội dung. Ghi lại toàn bộ.

- [ ] **Step 2: Diff nội dung các file ML lõi**

Run:
```bash
for f in src/rl/network.py src/forecaster/model.py src/rl/reward.py src/env/market_env.py; do
  echo "===== $f ====="
  diff /Users/macos/dynamic-pricing-v3/$f /Users/macos/f2t/dynamic-pricing-final/$f 2>&1 || echo "(khác hoặc thiếu)"
done
```
Expected: Lý tưởng là không khác (copy đầy đủ). Mọi khác biệt phải được giải thích là cố ý hay là bug.

- [ ] **Step 3: Ghi finding + ledger**

Vào `.handoff/progress/task-0.md`: bảng "file | trạng thái (identical/diff/only-v3/only-final) | kết luận". Vào `claims-ledger.md`: fact "dynamic-pricing-final copy đầy đủ từ v3 (trừ <danh sách khác biệt cố ý>)" với evidence là output diff.

- [ ] **Step 4: Gate + commit**

Gate: nếu có file ML lõi *only-in-v3* (thiếu khi copy) → tạo task fix, KHÔNG done. Nếu chỉ khác cố ý/đã giải thích → pass.
```bash
git add .handoff/ && git commit -m "task(T0.1): diff v3 vs dynamic-pricing-final"
```

---

## Task 2: Verify định nghĩa model khớp hằng số sidecar (T0.2)

**Files:**
- Read: `dynamic-pricing-final/src/rl/network.py`, `src/forecaster/model.py`, `src/rl/reward.py`, `pricing-sidecar/main.py:70-85`
- Write: `.handoff/progress/task-0.md`, `.handoff/claims-ledger.md`

- [ ] **Step 1: Đọc chữ ký SharedMLPDuelingQNet**

Dùng codegraph: `codegraph_node` cho `SharedMLPDuelingQNet` (network.py:42). Xác nhận `__init__` nhận `obs_dim, n_cats, cat_embed_dim, hidden, n_actions` và `forward(obs, cat, mask)`.
Expected: khớp lời gọi sidecar `SharedMLPDuelingQNet(obs_dim=10, n_cats=4, cat_embed_dim=8, hidden=128, n_actions=11)` (`main.py:151-153`).

- [ ] **Step 2: Đọc ForecasterConfig + ForecasterLSTM**

`codegraph_node` cho `ForecasterConfig` (model.py:8) và `ForecasterLSTM` (model.py:18). Xác nhận `forward` trả dict có key `demand` và `waste_logit` (sidecar dùng `out["demand"]`, `out["waste_logit"]` ở `main.py:136-137`).
Expected: key khớp chính xác. Nếu lệch tên key → bug tích hợp.

- [ ] **Step 3: Đọc reward.py**

Xác nhận `CANDIDATES` là list delta (len = 11 = N_ACTIONS) và `compute_mask(freshness, category) -> array[bool] len 11`.
Expected: `len(CANDIDATES) == 11`; mask khớp N_ACTIONS.

- [ ] **Step 4: Ghi bảng so khớp + ledger + gate + commit**

Bảng "hằng số sidecar | định nghĩa model | khớp?". Bất kỳ lệch nào (dim, tên key, độ dài) = bug → task fix. Ghi ledger các fact kiến trúc (sẽ dùng cho thesis AI/ML). Commit `task(T0.2)`.

---

## Task 3: Obs parity — sidecar._build_obs ↔ market_env (T0.3) ⭐

**Files:**
- Read: `pricing-sidecar/main.py:88-121` (`_build_obs`), `dynamic-pricing-final/src/env/market_env.py`
- Write: `.handoff/progress/task-0.md`, `.handoff/claims-ledger.md`

- [ ] **Step 1: Trích cách build observation lúc train**

Dùng codegraph tìm hàm build observation trong `market_env.py` (vd `_get_obs`/`_build_observation`/`reset`/`step`). Liệt kê thứ tự + công thức từng chiều của vector quan sát mà model được train trên đó.
Expected: vector 10 chiều (khớp OBS_DIM=10).

- [ ] **Step 2: Lập bảng so khớp 10 chiều**

So từng chiều giữa `_build_obs` (sidecar) và observation của env:

| # | Sidecar (main.py:110-120) | market_env | Khớp? |
|---|---|---|---|
| 0 | clip(freshness,0,1) | ? | ? |
| 1 | min(inventory_ratio,2) | ? | ? |
| 2 | sin(2π·dow/7) | ? | ? |
| 3 | cos(2π·dow/7) | ? | ? |
| 4 | min(days_to_restock/30,1) | ? | ? |
| 5 | clip(demand_ratio,0,3) | ? | ? |
| 6 | clip(prev_delta,-0.3,0.2) | ? | ? |
| 7 | clip(comp_ratio,0.5,2) | ? | ? |
| 8 | clip(days_to_waste,0,14)/14 | ? | ? |
| 9 | clip(inv_coverage,0,3)/3 | ? | ? |

Điền cột market_env từ code thật, đánh khớp/lệch từng dòng.

- [ ] **Step 3: Kết luận parity + ledger**

Nếu mọi chiều khớp (cùng thứ tự, cùng scale/normalization) → ghi fact "obs parity OK" vào ledger với evidence 2 đoạn code. Nếu lệch (thứ tự khác, normalization khác, hằng số khác như DAILY_DECAY/BASE_DEMAND) → đây là bug train↔serve nghiêm trọng → ghi rõ chiều nào lệch, tạo task fix T0.9.

- [ ] **Step 4: Gate + commit**

Gate: parity phải có bảng đầy đủ 10 dòng + kết luận từng dòng. Commit `task(T0.3): obs parity sidecar vs market_env`.

---

## Task 4: Forecaster parity — tiling 21× ↔ cách train (T0.4) ⭐

**Files:**
- Read: `pricing-sidecar/main.py:124-141` (`_run_forecaster`), `dynamic-pricing-final/src/forecaster/{data.py,train.py,model.py}`
- Write: `.handoff/progress/task-0.md`, `.handoff/claims-ledger.md`

- [ ] **Step 1: Xác định input shape model được train**

Đọc `forecaster/data.py` + `train.py`: forecaster được train trên chuỗi shape `(batch, OBS_WINDOW, obs_dim)` + category index. Xác định `obs_dim` thật (từ `ForecasterConfig` checkpoint) và ý nghĩa của window (21 ngày lịch sử thật).
Expected: rõ obs_dim train (có thể = 10, có thể khác).

- [ ] **Step 2: Đối chiếu với hack "tile 21×"**

Sidecar `_run_forecaster` tile obs hiện tại 21 lần (`np.tile(obs_padded, (21,1))`) → giả lập "21 ngày giống hệt nhau". Đánh giá: (a) `forecaster_obs_dim` khớp slicing/pad ở `main.py:130`? (b) tiling có làm sai lệch nghiêm trọng demand/p_waste so với input chuỗi thật không (về mặt ngữ nghĩa)?
Expected: ghi rõ đây là xấp xỉ; xác định mức chấp nhận được hay cần input chuỗi thật.

- [ ] **Step 3: Ledger + gate + commit**

Ghi fact "forecaster obs_dim=<X>, sidecar tile 21× là xấp xỉ vì backend chưa cung cấp chuỗi lịch sử" + evidence. Nếu `obs_dim` lệch gây pad sai → bug → task fix. Commit `task(T0.4)`.

---

## Task 5: Smoke-load checkpoint + inference (T0.5)

**Files:**
- Create: `/Users/macos/f2t/pricing-sidecar/tests/test_smoke_load.py`
- Read: `pricing-sidecar/main.py:144-176`

- [ ] **Step 1: Viết smoke test load + inference**

Create `pricing-sidecar/tests/test_smoke_load.py`:
```python
import os, torch, numpy as np
import importlib.util as ilu

DP = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "dynamic-pricing-final"))

def _imp(rel, name):
    spec = ilu.spec_from_file_location(name, os.path.join(DP, rel))
    m = ilu.module_from_spec(spec); spec.loader.exec_module(m); return m

def test_ddqn_loads_and_infers():
    net_mod = _imp("src/rl/network.py", "dp_net")
    Net = net_mod.SharedMLPDuelingQNet
    ckpt = torch.load(os.path.join(DP, "checkpoints", "rl_shared_best.pt"), map_location="cpu", weights_only=False)
    net = Net(obs_dim=10, n_cats=4, cat_embed_dim=8, hidden=128, n_actions=11)
    sd = ckpt["online"]
    if any(k.startswith("_orig_mod.") for k in sd):
        sd = {k[len("_orig_mod."):]: v for k, v in sd.items()}
    net.load_state_dict(sd); net.eval()
    obs = torch.zeros(1, 10); cat = torch.tensor([0]); mask = torch.ones(1, 11, dtype=torch.bool)
    with torch.no_grad():
        q = net(obs, cat, mask)
    assert q.shape == (1, 11)

def test_forecaster_loads_and_infers():
    fc_mod = _imp("src/forecaster/model.py", "dp_fc")
    ck = torch.load(os.path.join(DP, "checkpoints", "forecaster_v4_best.pt"), map_location="cpu", weights_only=False)
    cfg = fc_mod.ForecasterConfig(**ck["model_cfg"])
    net = fc_mod.ForecasterLSTM(cfg); net.load_state_dict(ck["model_state"]); net.eval()
    feat = torch.zeros(1, 21, cfg.obs_dim); cidx = torch.tensor([0])
    with torch.no_grad():
        out = net(feat, cidx)
    assert "demand" in out and "waste_logit" in out
```

- [ ] **Step 2: Chạy test**

Run: `cd /Users/macos/f2t/pricing-sidecar && .venv/bin/python -m pytest tests/test_smoke_load.py -v`
Expected: 2 PASS. Nếu `load_state_dict` lỗi missing/unexpected keys → checkpoint không khớp định nghĩa → bug nghiêm trọng (ghi rõ key lệch).

- [ ] **Step 3: Ledger + gate + commit**

Ghi evidence: output pytest PASS + shape `q=(1,11)`, key forecaster. Gate: phải PASS thật. Commit `task(T0.5): smoke-load checkpoints`.

---

## Task 6: CoreML freshness load + predict (T0.6)

**Files:**
- Create: `/Users/macos/f2t/pricing-sidecar/tests/test_coreml_freshness.py`
- Read: `pricing-sidecar/main.py:177-188,312-329`, `freshnessmodels/`

- [ ] **Step 1: Kiểm coremltools có trong venv**

Run: `cd /Users/macos/f2t/pricing-sidecar && .venv/bin/python -c "import coremltools, PIL; print('ok')"`
Expected: `ok`. Nếu ImportError → ghi blocker (CoreML chỉ chạy trên macOS); test sẽ skip có điều kiện.

- [ ] **Step 2: Viết test load + predict ảnh dummy**

Create `pricing-sidecar/tests/test_coreml_freshness.py`:
```python
import os, pytest
ct = pytest.importorskip("coremltools")
from PIL import Image
FRESH = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "freshnessmodels"))

@pytest.mark.parametrize("fname", ["MyFreshnessClassifier-fruit.mlmodel", "MyFreshnessClassifier-root.mlmodel"])
def test_coreml_predict(fname):
    path = os.path.join(FRESH, fname)
    assert os.path.exists(path), f"missing {path}"
    model = ct.models.MLModel(path)
    img = Image.new("RGB", (299, 299), (120, 180, 90))
    out = model.predict({"image": img})
    assert "target" in out or "targetProbability" in out
```

- [ ] **Step 3: Chạy + xác nhận chủ đích fallback**

Run: `cd /Users/macos/f2t/pricing-sidecar && .venv/bin/python -m pytest tests/test_coreml_freshness.py -v`
Expected: 2 PASS (hoặc skip nếu coremltools thiếu). Ghi rõ: chỉ có `fruit` & `root`; `main.py:314` map mọi category ≠ fruit → key "root" (chủ đích). Xác nhận đây là thiết kế đã biết, không phải bug.

- [ ] **Step 4: Ledger + gate + commit**

Evidence: output predict (keys). Commit `task(T0.6): coreml freshness load+predict`.

---

## Task 7: Backend output đủ 9 field ProductStateVector (T0.7) ⭐

**Files:**
- Read: `f2t-backend/` (tìm chỗ build request gọi sidecar)
- Write: `.handoff/progress/task-0.md`, `.handoff/claims-ledger.md`

- [ ] **Step 1: Tìm điểm tích hợp sidecar trong backend**

Dùng codegraph/grep tìm nơi backend gọi sidecar:
```bash
grep -rniE "predict|forecast|freshness/classify|sidecar|:8000|ProductStateVector|competitor_ref_price|inventory_ratio" \
  /Users/macos/f2t/f2t-backend/src 2>/dev/null | grep -vi node_modules
```
Expected: ra file service gọi HTTP tới sidecar (vd `dynamic-pricing.service.ts` hoặc tương tự).

- [ ] **Step 2: Đối chiếu payload với 9 field**

Đọc file tìm được. Lập bảng: 9 field (`productId, category, freshness, inventory_ratio, base_price, competitor_ref_price, days_to_restock, prev_delta, demand_7d`) — backend có cung cấp mỗi field không, lấy từ nguồn dữ liệu nào (DB/tính toán/default).
Expected: rõ field nào thật, field nào để default (sidecar có default `days_to_restock=3.0, prev_delta=0.0, demand_7d=0.0`).

- [ ] **Step 3: Kết luận "đủ tài nguyên" + ledger**

Đánh giá: thiếu field nào quan trọng (vd `competitor_ref_price`, `inventory_ratio`) không? Nếu backend không gửi → sidecar dùng gì? Ghi fact + evidence `file:Lxx`. Field thiếu nghiêm trọng → task fix T0.9.

- [ ] **Step 4: Gate + commit**

Commit `task(T0.7): backend payload vs ProductStateVector`.

---

## Task 8: Integration test — boot sidecar + gọi endpoint (T0.8)

**Files:**
- Read: `pricing-sidecar/main.py:246-329`
- Write: `.handoff/progress/task-0.md`

- [ ] **Step 1: Cài deps nếu thiếu**

Run: `cd /Users/macos/f2t/pricing-sidecar && .venv/bin/python -c "import fastapi, uvicorn, torch; print('deps ok')"`
Expected: `deps ok`. Nếu thiếu: `.venv/bin/pip install -r requirements.txt`.

- [ ] **Step 2: Boot sidecar (background)**

Run (background): `cd /Users/macos/f2t/pricing-sidecar && .venv/bin/python -m uvicorn main:app --port 8000 --log-level info`
Expected log: `DDQN loaded ...`, `Forecaster loaded ... (obs_dim=...)`, `CoreML 'fruit'/'root' loaded`. Ghi lại log boot (đây là citation runtime).

- [ ] **Step 3: Gọi /health**

Run: `curl -s localhost:8000/health | python3 -m json.tool`
Expected: `ddqn_loaded:true, forecaster_loaded:true, coreml_loaded:["fruit","root"]`. Bất kỳ `false` nào = model không load → bug.

- [ ] **Step 4: Gọi /predict**

Run:
```bash
curl -s -X POST localhost:8000/predict -H 'Content-Type: application/json' -d '{
  "state_vectors":[{"productId":"p1","category":"leafy","freshness":0.9,
  "inventory_ratio":0.5,"base_price":10000,"competitor_ref_price":11000}]}' | python3 -m json.tool
```
Expected: `overrides[0]` có `targetPrice, delta_pct, safety_clipped, freshness_tag`. Giá hợp lệ (> cost floor).

- [ ] **Step 5: Gọi /forecast và /freshness/classify**

Run `/forecast` với 1 state_vector → expected `demand7d, pWaste` là số hữu hạn ≥ 0.
Run `/freshness/classify` với ảnh dummy base64 (category "fruit") → expected `score, tag, label, confidence`.

- [ ] **Step 6: (Nếu được) e2e từ backend**

Nếu `f2t-backend` boot được (xem README backend), gọi endpoint backend kích hoạt pricing → xác nhận backend → sidecar → response chảy đúng.

- [ ] **Step 7: Tắt server, ghi evidence + gate + commit**

Lưu toàn bộ response JSON vào `.handoff/progress/task-0.md`. Gate: cả 4 endpoint trả 2xx + payload hợp lệ. Commit `task(T0.8): integration test sidecar endpoints`.

---

## Task 9: Fix gaps phát hiện + re-verify (T0.9)

**Files:** tuỳ finding (có thể `pricing-sidecar/main.py`, `f2t-backend/...`, hoặc tài liệu).

- [ ] **Step 1: Tổng hợp danh sách lệch**

Đọc lại `.handoff/progress/task-0.md`: gom mọi mục đánh "lệch/bug" từ T0.1–T0.8 thành danh sách ưu tiên (nghiêm trọng train↔serve trước).

- [ ] **Step 2: Sửa từng lệch (nếu có)**

Với mỗi lệch: sửa tối thiểu, đúng nguyên nhân gốc (vd đồng bộ `_build_obs` với env, sửa key, bổ sung field backend). KHÔNG retrain. Mỗi fix 1 commit `fix(T0.9): <mô tả>`.

- [ ] **Step 3: Re-run gate liên quan**

Chạy lại smoke/integration test của task bị ảnh hưởng. Expected: PASS sau fix.

- [ ] **Step 4: Nếu không có lệch nào**

Ghi rõ "không phát hiện lệch — integration đã đúng 100%" với liệt kê evidence các gate đã pass. Commit.

---

## Task 10: Kết luận + nạp ledger cho thesis (T0.10)

**Files:**
- Write: `.handoff/progress/task-0.md`, `.handoff/claims-ledger.md`, `.handoff/STATE.md`, `.handoff/task-tree.md`

- [ ] **Step 1: Viết kết luận Task 0**

Vào `progress/task-0.md`: tóm tắt "sidecar phục vụ dynamic-pricing-final 100%? (có/không + bằng chứng)", "backend output đủ tài nguyên? (có/không + field nào default)", danh sách fix đã làm.

- [ ] **Step 2: Nạp fact AI/ML + DB cho thesis**

Vào `claims-ledger.md`: nạp các fact tái dùng cho thesis (kiến trúc SharedMLPDuelingQNet, obs 10 chiều + công thức, ForecasterLSTM, CoreML 2 loại, luồng backend→sidecar), mỗi fact kèm `file:Lxx` đã verify.

- [ ] **Step 3: Cập nhật STATE + task-tree, đóng Task 0**

`task-tree.md`: đánh T0.1–T0.10 = done. `STATE.md`: phase = "Task 0 hoàn thành; việc tiếp theo = Task 1 (convert dany.docx)". Commit `task(T0.10): kết luận Task 0 + nạp ledger`.

---

## Self-Review (đã chạy)

- **Spec coverage:** T0.1–T0.10 phủ đủ mục 3/TASK 0 của spec; bootstrap `.handoff/` phủ mục 2.1–2.2; enforcement biến thể runtime phủ mục 2.9.
- **Placeholder:** không có TODO/TBD; mọi step có lệnh + output kỳ vọng cụ thể.
- **Type consistency:** tên hằng số (OBS_DIM=10, N_ACTIONS=11, n_cats=4, embed=8, hidden=128), key checkpoint (`online`, `model_cfg`, `model_state`), key forecast (`demand`, `waste_logit`) dùng nhất quán, khớp `main.py`.
