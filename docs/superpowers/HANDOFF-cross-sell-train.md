# HANDOFF — Train model thật cho feature Cross-sell (F2T)

> **Đối tượng đọc:** một agent (Claude) trên máy/account khác, KHÔNG có context phiên trước. Đọc hết file này trước khi làm gì. Mọi đường dẫn là tương đối so với gốc repo `f2t/`.

---

## 0. TL;DR — bạn cần làm gì

Code của feature cross-sell ĐÃ XONG và đã test/verify SHIP-READY (pipeline + sidecar + backend + frontend). **Việc còn lại duy nhất: huấn luyện model warm-start THẬT trên dữ liệu Instacart 2017**, vì ở máy gốc đĩa đầy (chỉ còn ~600 MB) nên chưa tải/giải nén được dataset (~5–6 GB).

Nhiệm vụ của bạn:
1. Tải dataset Instacart 2017 về `recommender-final/data/`.
2. Chạy `prepare_instacart.py` → `mine_rules.py` để sinh artifact THẬT (`model/category_rules.json`, `model/category_popularity.json`).
3. Verify sidecar nạp artifact thật và `/recommend` trả luật hợp lý.
4. Cập nhật `.handoff/STATE.md` (hoặc báo lại) trạng thái "đã train warm-start thật".

**KHÔNG commit dataset CSV/parquet hay file `model/*.json`** — đã `.gitignore`, đó là dữ liệu tái tạo được. Chỉ commit code/doc nếu có sửa.

---

## 1. Branch & vị trí

- Branch: `feature/f2t-ml-cross-sell-cart` (đã push lên `origin`). Tách từ `main`, độc lập với branch khoá luận `feature/f2t-ml-verify-thesis`.
- Lấy về:
  ```bash
  git fetch origin
  git checkout feature/f2t-ml-cross-sell-cart
  ```
- Tài liệu nền (đọc để hiểu thiết kế, KHÔNG bắt buộc để chạy train):
  - Spec: `docs/superpowers/specs/2026-06-08-f2t-ml-cross-sell-cart-design.md`
  - Plan: `docs/superpowers/plans/2026-06-08-f2t-ml-cross-sell-cart.md`

---

## 2. RÀNG BUỘC TRUNG THỰC (bắt buộc — dự án này lấy tính chân thực làm tiêu chí #1)

- Warm-start GĐ1 là **category-level (10×10)**, KHÔNG phải product-level. Không nói quá trong bất kỳ báo cáo nào.
- Dataset Instacart là **dữ liệu ngoài**, map sang category F2T qua dict curated (`category_map.json`); item không map được bị **bỏ hẳn**.
- `recommender-final/scripts/generate_synthetic.py` CHỈ để smoke-test pipeline; affinity của nó là bịa. **Artifact sinh từ synthetic TUYỆT ĐỐI không dùng để phục vụ thật / không đưa vào thesis.** Khi bạn train thật, nó sẽ GHI ĐÈ lên artifact synthetic (nếu còn) — tốt.
- Không bao giờ điền số "kết quả model" do bịa. Nếu muốn đánh giá định lượng, phải chạy thật và ghi đúng.

---

## 3. Kiến trúc (để biết artifact chảy đi đâu)

```
Instacart CSV ──prepare_instacart.py──► baskets_category.parquet ──mine_rules.py──►
  recommender-final/model/category_rules.json + category_popularity.json
        │ (sidecar nạp lúc khởi động qua env RECOMMENDER_MODEL_DIR, default ../recommender-final/model)
        ▼
  recommender-sidecar/main.py  :8001   POST /recommend {cart_categories[], top_k}
        ▲ httpService.post                  ▼ {recommendations:[{category,score,source}]}
  f2t-backend  RecommendationsService  ──► GET /api/recommendations/cross-sell?productIds=...&limit=6
        ▼
  f2t-frontend  components/cart/cross-sell.tsx  (mục "Thường mua kèm" trong giỏ)
```

**Contract artifact** (mine_rules.py phải xuất đúng cái này, sidecar đọc đúng key này):
- `category_rules.json`: `{ "<antecedent>": [{ "consequent": str, "lift": float, "confidence": float, "support": float }], ... }`
- `category_popularity.json`: `{ "<category>": float 0..1, ... }`
- 10 category F2T: `leafy, root, fruit, herbs, mushrooms, grains, dairy, eggs, honey, other`

---

## 4. ĐIỀU KIỆN TIÊN QUYẾT — kiểm tra trước khi tải

```bash
df -h .                       # CẦN >= ~8–10 GB trống (zip 700MB + giải nén ~5–6GB + parquet)
ls ~/.kaggle/kaggle.json      # creds Kaggle (ở máy gốc đã có; máy bạn cần tự đặt nếu thiếu)
```

- Nếu **đĩa < ~8 GB trống**: DỪNG, dọn đĩa trước. Đừng cố tải (sẽ fail giữa chừng + lấp đĩa).
- Nếu thiếu `kaggle.json`: tạo Kaggle API token (Kaggle → Account → Create New API Token) đặt vào `~/.kaggle/kaggle.json`, `chmod 600`.
- Dataset Instacart nằm trong **competition** `instacart-market-basket-analysis` → phải **đăng nhập Kaggle và bấm "Join/Accept rules"** một lần trên web, nếu không CLI sẽ báo 403.

---

## 5. Môi trường Python (venv đã có ở máy gốc; máy mới thì tạo lại)

```bash
cd recommender-final
python3 -m venv venv                       # nếu chưa có
./venv/bin/pip install -r requirements.txt # pandas, mlxtend, pyarrow, pytest
./venv/bin/pip install kaggle              # CLI tải dataset (chưa nằm trong requirements)
```

Sanity test pipeline (KHÔNG cần data, dùng synthetic — chỉ để chắc venv ổn):
```bash
./venv/bin/pytest -q          # kỳ vọng 8 passed (test_prepare 5 + test_mine 3)
```

---

## 6. TẢI DATASET

```bash
cd recommender-final
mkdir -p data
./venv/bin/kaggle competitions download -c instacart-market-basket-analysis -p data
cd data && unzip -o instacart-market-basket-analysis.zip
# Một số file bên trong lại là .csv.zip → giải nén tiếp:
for z in *.csv.zip; do [ -f "$z" ] && unzip -o "$z"; done
ls -la   # phải thấy: orders.csv, order_products__prior.csv, order_products__train.csv, products.csv, aisles.csv, departments.csv
```

> Nếu `kaggle` báo 403/forbidden: chưa accept competition rules trên web. Nếu báo "command not found": dùng `./venv/bin/kaggle`. Nếu hết đĩa giữa chừng: dọn đĩa, xoá `data/`, làm lại.

---

## 7. TRAIN (sinh artifact thật)

```bash
cd recommender-final
# Bước 1: map + project về baskets mức category (bỏ item không map được)
./venv/bin/python scripts/prepare_instacart.py
#   -> ghi baskets_category.parquet (mặc định dùng data/ và order_products__prior + __train)
# Bước 2: FP-Growth -> luật + popularity
./venv/bin/python scripts/mine_rules.py
#   -> ghi model/category_rules.json + model/category_popularity.json
```

Tham số mặc định của `mine_rules.py`: `min_support=0.02`, `min_confidence=0.10` (đối số dòng lệnh: `mine_rules.py <baskets.parquet> <out_dir> <min_support> <min_confidence>`). Với Instacart đầy đủ, mặc định thường cho ra luật tốt; nếu **quá ít luật**, hạ `min_support` (vd 0.01); nếu **quá nhiễu**, tăng lên. Ghi lại giá trị thực dùng vào README nếu đổi.

**Kiểm tra artifact đúng schema:**
```bash
./venv/bin/python - <<'PY'
import json
r = json.load(open("model/category_rules.json"))
p = json.load(open("model/category_popularity.json"))
assert isinstance(r, dict) and r, "rules rỗng?"
k = next(iter(r)); e = r[k][0]
assert set(e) == {"consequent","lift","confidence","support"}, e
assert all(0<=v<=1 for v in p.values())
print("OK:", len(r), "antecedents;", sum(len(v) for v in r.values()), "rules; cats:", list(p))
PY
```

---

## 8. VERIFY end-to-end với sidecar (không cần MongoDB)

```bash
cd recommender-sidecar
python3 -m venv venv 2>/dev/null; ./venv/bin/pip install -r requirements.txt
./venv/bin/pytest -q                      # kỳ vọng 6 passed
# Chạy sidecar nạp artifact THẬT (default RECOMMENDER_MODEL_DIR = ../recommender-final/model)
./venv/bin/uvicorn main:app --port 8001 &
sleep 2
curl -s localhost:8001/health             # status ok, n_rules > 0 (số antecedent thật)
curl -s -X POST localhost:8001/recommend -H 'Content-Type: application/json' \
     -d '{"cart_categories":["leafy"],"top_k":5}'   # phải trả luật source:"rule"
kill %1
```

Đối chiếu: gợi ý cho `leafy` phải hợp lý về mặt nông sản (vd herbs/root/fruit), KHÔNG phải các cặp bịa của synthetic. Nếu `n_rules` khớp số antecedent ở bước 7 → sidecar đang dùng artifact thật.

### (Tuỳ chọn) verify qua backend — CẦN MongoDB + seed + JWT
```bash
# Bật MongoDB, cd f2t-backend && npm run seed && npm run start:dev (cùng bật sidecar 8001)
# Đăng nhập 1 seed account lấy token, lấy 1 productId trong giỏ, rồi:
curl -H "Authorization: Bearer <token>" \
  "localhost:3000/api/recommendations/cross-sell?productIds=<productId>&limit=6"
# Kỳ vọng: {success:true, data:[...]} ; tắt sidecar -> vẫn trả (fallback cùng-farm), không 500.
```

---

## 9. SAU KHI TRAIN XONG

- KHÔNG commit `data/`, `*.parquet`, `model/*.json` (đã gitignore — kiểm tra `git status` sạch).
- Nếu có đổi ngưỡng `min_support/min_confidence` → cập nhật `recommender-final/README.md` ghi giá trị thật đã dùng + sơ lược số liệu (số antecedent/luật). Commit doc đó.
- Cập nhật trạng thái cho phiên sau: thêm 1 dòng vào `.handoff/STATE.md` mục tương ứng, ví dụ: "Cross-sell warm-start ĐÃ train thật trên Instacart 2017 (min_support=…, N antecedent/M luật); artifact ở recommender-final/model (không commit)."
- (Tuỳ chọn, GĐ2 — chỉ khi F2T đã có đơn thật đủ nhiều) dùng `recommender-final/scripts/export_real_orders.py` (cần `pip install pymongo`, `MONGODB_URI`) để export baskets **mức product** rồi mine product-level thay cho category-level. Đây là hướng tương lai, KHÔNG làm trong lần handoff này.

---

## 10. Trạng thái hiện tại (tóm tắt cho bạn)

| Hạng mục | Trạng thái |
|---|---|
| Pipeline `recommender-final/` (code + 8 test) | ✅ xong |
| Sidecar `recommender-sidecar/` :8001 (code + 6 test) | ✅ xong |
| Backend module `recommendations` (5 test, build+lint clean) | ✅ xong |
| Frontend hook + `CrossSell` trong giỏ (2 test) | ✅ xong |
| Tích hợp + verify end-to-end contract | ✅ SHIP-READY |
| **Model warm-start THẬT trên Instacart** | ❌ **CHƯA** (đĩa máy gốc đầy → việc của bạn) |
| Artifact đang nằm trên đĩa máy gốc | chỉ là synthetic smoke-test (KHÔNG dùng thật) |

Gotcha quan trọng nhất: **đĩa đầy** là lý do chưa train. Đảm bảo đủ chỗ trước khi tải.
