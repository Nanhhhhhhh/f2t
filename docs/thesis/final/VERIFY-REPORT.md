# VERIFY-REPORT — Gate T2.V: Adversarial Final Verification

**Ngày:** 2026-06-08  
**Verifier:** Adversarial độc lập (T2.V gate)  
**Scope:** 5 file chương (chuong-1..5) + 00-trang-bia-muc-luc.md + tai-lieu-tham-khao.md + 23 diagram .puml + STRUCTURE.md  
**Nguyên tắc:** Giả định mọi claim sai cho tới khi resolve tại source. Có quyền FAIL.

---

## V1 — Citation Resolve Sweep

### Lệnh chạy

```bash
grep -rhoE "ref: [a-zA-Z0-9_./-]+\.(ts|py|json|pt|mlmodel)" docs/thesis/final/chuong-*.md \
  | sed 's/ref: //' | sort -u
# + riêng .tsx extension:
grep -rhoE "ref: [a-zA-Z0-9_./-]+\.tsx" docs/thesis/final/chuong-*.md | sed 's/ref: //'
```

### Kết quả resolve (tất cả path kiểm tra bằng `ls -la`)

| Path (ref) | Tồn tại? | Ghi chú |
|---|---|---|
| `dynamic-pricing-final/src/env/market_env.py` | OK | |
| `dynamic-pricing-final/src/forecaster/eval.py` | OK | |
| `dynamic-pricing-final/src/forecaster/model.py` | OK | |
| `dynamic-pricing-final/src/rl/agent.py` | OK | |
| `dynamic-pricing-final/src/rl/network.py` | OK | |
| `dynamic-pricing-final/src/rl/reward.py` | OK | |
| `dynamic-pricing-final/checkpoints/forecaster_v4_best.pt` | OK | 857 117 bytes, Jun 7 20:10 |
| `f2t-backend/src/app.module.ts` | OK | L57=`PRICING_SIDECAR_URL default("http://localhost:8000")`, L58=`PRICING_MODE` |
| `f2t-backend/src/common/interceptors/dynamic-pricing.interceptor.ts` | OK | L74-77 = `dynamicPrice/freshnessScore/priceTag` inject |
| `f2t-backend/src/main.ts` | OK | |
| `f2t-backend/src/modules/auth/guards/jwt-auth.guard.ts` | OK | |
| `f2t-backend/src/modules/auth/schemas/verification-token.schema.ts` | OK | L8-26 = VerificationToken fields |
| `f2t-backend/src/modules/delivery/delivery.service.spec.ts` | OK | |
| `f2t-backend/src/modules/delivery/delivery.service.ts` | OK | |
| `f2t-backend/src/modules/delivery/providers/ghn.provider.ts` | OK | |
| `f2t-backend/src/modules/demand-forecasting/demand-forecasting.service.ts` | OK | |
| `f2t-backend/src/modules/dynamic-pricing/dynamic-pricing.controller.ts` | OK | |
| `f2t-backend/src/modules/dynamic-pricing/dynamic-pricing.service.spec.ts` | OK | |
| `f2t-backend/src/modules/dynamic-pricing/dynamic-pricing.service.ts` | OK | |
| `f2t-backend/src/modules/dynamic-pricing/pricing-tick.cron.ts` | OK | |
| `f2t-backend/src/modules/dynamic-pricing/schemas/freshness-cache.schema.ts` | OK | |
| `f2t-backend/src/modules/dynamic-pricing/schemas/price-override.schema.ts` | OK | |
| `f2t-backend/src/modules/farms/farms.service.ts` | OK | |
| `f2t-backend/src/modules/farms/schemas/farm.schema.ts` | OK | |
| `f2t-backend/src/modules/notifications/schemas/notification-preferences.schema.ts` | OK | |
| `f2t-backend/src/modules/notifications/schemas/notification.schema.ts` | OK | |
| `f2t-backend/src/modules/orders/schemas/order.schema.ts` | OK | L8-34=OrderItem fields, L105=items field, L239-241=3 indexes |
| `f2t-backend/src/modules/payments/payments.service.spec.ts` | OK | |
| `f2t-backend/src/modules/payments/payments.service.ts` | OK | |
| `f2t-backend/src/modules/posts/schemas/post.schema.ts` | OK | |
| `f2t-backend/src/modules/products/schemas/product.schema.ts` | OK | |
| `f2t-backend/src/modules/users/schemas/user.schema.ts` | OK | |
| `f2t-backend/src/modules/users/users.service.ts` | OK | |
| `f2t-backend/src/seed/seed.ts` | OK | |
| `f2t-frontend/package.json` | OK | |
| `f2t-frontend/src/app/admin/index.tsx` | OK | file .tsx tồn tại 4245 bytes (regex gốc trích thiếu 'x' — không phải broken ref) |
| `pricing-sidecar/main.py` | OK | L98=`datetime.now().weekday()`, L135=`np.tile`, L318=`/freshness/classify` |
| `pricing-sidecar/safety.py` | OK | L1-19 = 5 rules thứ tự 3→4→1→2→5 |

**Chuong-5 citations resolve:**
- `app.module.ts:57` → L57=`PRICING_SIDECAR_URL localhost:8000` (sidecar 1 port 8000) ✓
- `app.module.ts:58` → L58=`PRICING_MODE "shadow"/"advisory"` (không có mode "live") ✓
- `interceptor.ts:74-77` → L74-77=`dynamicPrice`, `freshnessScore`, `priceTag` inject ✓
- `model.py:18-49` → L18-49=`ForecasterLSTM.__init__` + `forward` (obs_dim, LSTM 2 lớp, dual-head) ✓
- `network.py:51-57` → L51-57=`SharedMLPDuelingQNet.__init__` (obs_dim=10, n_cats=4, hidden=128, n_actions=11) ✓
- `safety.py:1-19` → L1-19=5 rules thứ tự 3→4→1→2→5 ✓
- `main.py:135` → L135=`np.tile(obs_padded, (OBS_WINDOW, 1))` (tile-21×) ✓
- `main.py:98` → L98=`datetime.now().weekday()` (DoW serve) ✓
- `main.py:318` → L318=`/freshness/classify` route, `model_key = "fruit" if req.category in ("fruit","fruits") else "root"` ✓
- `order.schema.ts:105` → L105=`items!: OrderItem[]` field ✓
- `verification-token.schema.ts:8-26` → L8-26=VerificationToken fields (userId, token, type, expiresAt, used, _seeded) ✓
- `market_env.py:132` → L132=`dow = self._t % 7` (train-time DoW) ✓
- `checkpoints/forecaster_v4_best.pt` → EXISTS (857117 bytes) ✓

**WARN-V1-A:** `order.schema.ts:L8-34` tại chuong-3:L493 và `order.schema.ts:L239` tại chuong-3:L605-607 dùng path rút gọn (thiếu `f2t-backend/src/modules/orders/schemas/`). File tồn tại, nội dung đúng, path chỉ là viết tắt trong ô bảng — không phải broken ref.

### Verdict V1: **PASS** (0 broken ref; 2 WARN path viết tắt không chặn)

---

## V2 — False-Claim Sweep (toàn văn)

### Lệnh chạy

```bash
grep -rniE "recommend|cross-sell|for-you|itemitem|collaborative|content-based|cosine|tf-idf|
holt|ewma|mobilenetv2|4-class|confusion matrix 4|confusion 4|recommendation_cache|
forecast_cache|8001|8002|3 sidecar|14 module|obs_dim.?11|layout.*11.?.?10|5-dim|5 action|
packing-completed|scores\[5\]|addresses\[\]|5 biểu đồ AI" docs/thesis/final/chuong-*.md \
docs/thesis/final/00-trang-bia-muc-luc.md docs/thesis/final/tai-lieu-tham-khao.md
```

### Bảng phán định từng hit

| Pattern khớp | File:dòng | Nguyên câu (tóm tắt) | Verdict |
|---|---|---|---|
| `recommend` (nhiều hit) | chuong-2,3,4,5 | Tất cả đều là **phủ định**: "F2T không có hệ thống gợi ý", "không có module recommender", "không có endpoint gợi ý" hoặc là lý thuyết §2.1.2 (hệ thống gợi ý nói chung) | TRUNG THỰC |
| `collaborative` | chuong-2:15, chuong-5:61 | §2.1.2 mô tả lý thuyết; chuong-5:61 phủ định "hiện chưa tồn tại trong codebase" | LÝTHUYẾT / PHỦ ĐỊNH |
| `content-based` | chuong-5:61 | Phủ định rõ ràng | PHỦ ĐỊNH |
| `cosine` | chuong-5:61 | Phủ định rõ ràng | PHỦ ĐỊNH |
| `recommendation_cache` | chuong-3:405, chuong-4:184 | "**KHÔNG** có collection recommendation_caches hay forecast_caches" | PHỦ ĐỊNH TRUNG THỰC |
| `forecast_cache` | chuong-4:184 | "kết quả dự báo được cache ở tầng Redis chứ không tạo collection riêng" | PHỦ ĐỊNH TRUNG THỰC |
| `holt` | chuong-1:23,57; chuong-3:57,133; chuong-5:13 | Tất cả đều là ledger id `t1.4-forecaster-not-holt` — citation xác nhận KHÔNG dùng Holt | PHỦ ĐỊNH / LEDGER |
| `addresses\[\]` | chuong-3:426 | "**KHÔNG phải** mảng `addresses[]`" — phủ định trực tiếp | PHỦ ĐỊNH TRUNG THỰC |
| `scores\[5\]` | chuong-3:559 | "**KHÔNG phải** mảng cố định 5 phần tử `scores[5]`" — phủ định | PHỦ ĐỊNH TRUNG THỰC |
| `8001` / `8002` | KHÔNG KHỚP | Không tồn tại trong thesis | N/A |
| `mobilenetv2` | KHÔNG KHỚP | Không tồn tại trong thesis | N/A |
| `4-class` / `confusion matrix 4` | KHÔNG KHỚP | Không tồn tại trong thesis | N/A |
| `ewma` | KHÔNG KHỚP | Không tồn tại trong thesis | N/A |
| `3 sidecar` / `ba sidecar` | KHÔNG KHỚP | Không tồn tại trong thesis | N/A |
| `14 module` | KHÔNG KHỚP | Không tồn tại (thesis nói 13 module + 14 controller) | N/A |
| `obs_dim.*11` | KHÔNG KHỚP | Không tồn tại | N/A |
| `layout.*11.*10` | chuong-2:157, chuong-5:41 | Cả hai nói "đã được khắc phục hoàn toàn" | ĐÃ FIX — TRUNG THỰC |
| `5 action` | KHÔNG KHỚP | Không tồn tại | N/A |

**Tất cả hit:** không có khẳng định F2T THẬT có recommender, Holt, MobileNetV2, obs_dim=11, 3 sidecar, port 8001/8002.

### Verdict V2: **PASS** (0 false-claim; mọi hit đều là phủ định/lý thuyết/ledger)

---

## V3 — 3 Giới hạn bắt buộc §5.2

### Lệnh chạy

```bash
grep -c "HẠN CHẾ BẮT BUỘC" docs/thesis/final/chuong-5-ket-luan.md
# Output: 4  (1 dòng giới thiệu + 3 mục (a)(b)(c))
grep -n "HẠN CHẾ BẮT BUỘC" docs/thesis/final/chuong-5-ket-luan.md
```

### Kết quả

| Mục | Dòng | Nội dung | Trạng thái ghi nhận | Đúng yêu cầu? |
|---|---|---|---|---|
| Giới thiệu | 39 | "có ba HẠN CHẾ BẮT BUỘC về tính trung thực kỹ thuật" | — | — |
| (a) Tiling steady-state | 41 | "checkpoint forecaster_v4_best.pt đã có obs_dim=10 khớp... vấn đề layout mismatch 11≠10 **đã được khắc phục hoàn toàn**... hạn chế vẫn còn tồn tại ở cấp phục vụ online: tile-21×" | ĐÃ KHẮC PHỤC mismatch; còn tiling limitation | PASS (đúng trạng thái) |
| (b) DoW lệch pha | 43 | "Ảnh hưởng... nhỏ hơn 6,2% biên độ đặc trưng" | <6.2% confirmed | PASS |
| (c) Freshness 2/4 | 45 | "chỉ có model riêng biệt cho hai danh mục fruit và root; leafy và herbs... dùng chung root làm fallback" | 2/4 model | PASS |

Xác nhận: (a) KHÔNG ghi "layout mismatch 11≠10 còn tồn tại" — đúng yêu cầu STRUCTURE.md ("hết layout mismatch").

### Verdict V3: **PASS** (3/3 giới hạn bắt buộc đúng trạng thái)

---

## V4 — Số liệu canonical nhất quán toàn 5 chương

### Lệnh chạy

```bash
grep -rniE "obs_dim ?= ?11|11 chiều|12 module|14 module|3 endpoint|port 8001|port 8002" \
  docs/thesis/final/chuong-*.md | head -20

grep -rnoE "obs_dim ?= ?10|10 chiều|13 module|11 (action|hành động)|54/54|\
21 (spec|tệp|file)|2 (model )?CoreML|port 8000" docs/thesis/final/chuong-*.md | sort | head -30
```

### Kết quả kiểm tra mâu thuẫn

| Kiểm | Kết quả | Verdict |
|---|---|---|
| `obs_dim=11` / `11 chiều` (là obs) | KHÔNG KHỚP — tất cả "11 chiều" trong thesis chỉ về DDQN action space (Q-values 11 chiều, mask 11 chiều), KHÔNG phải obs_dim | PASS |
| `12 module` / `14 module` | KHÔNG KHỚP | PASS |
| `3 endpoint` (sidecar có đúng 3) | thesis nói "3 endpoint: /predict, /forecast, /freshness/classify" — nhất quán, không mâu thuẫn | PASS |
| `port 8001` / `port 8002` | KHÔNG KHỚP | PASS |

### Kết quả canonical matches

| Canonical | Bằng chứng code | Xuất hiện thesis | Nhất quán? |
|---|---|---|---|
| 13 module NestJS | `ls f2t-backend/src/modules/` = 13 thư mục | chuong-1, 2, 3, 4, 5 đều ghi 13 module | PASS |
| 14 controller | `find ... *.controller.ts \| grep -v spec \| wc -l` = 14 | chuong-2:63, chuong-4:184, chuong-5:5 đều "14 controller" | PASS |
| 10 collection | 10 schema file đúng 10 collection | chuong-2, 3, 4, 5 đều "10 collection" | PASS |
| 54/54 test / 21 spec | `find ... *.spec.ts \| wc -l` = 21 spec | chuong-1, 4, 5 đều "54/54 test / 21 file spec" | PASS |
| obs_dim=10 | `dynamic-pricing-final/src/rl/network.py:53` `obs_dim: int = 10`; `model.py:23` | toàn thesis nhất quán obs_dim=10 | PASS |
| 11 action linspace(−0.30,0.20,11) | `reward.py:6` `CANDIDATES = np.linspace(-0.30, 0.20, 11)` | chuong-1,2,3,4,5 đều "11 hành động" | PASS |
| 2 CoreML (fruit/root) | `main.py:318-321` `model_key = "fruit" if ... else "root"` | chuong-1,2,3,4,5 đều "2 model CoreML" | PASS |
| port 8000 | `app.module.ts:57` default `http://localhost:8000` | chuong-1,2,3,4 đều "cổng 8000" | PASS |
| Safety 5 rule 3→4→1→2→5 | `safety.py:5,8,12,15,18` (Rule 3,4,1,2,5 theo thứ tự) | chuong-3:198,239; chuong-4 nhất quán | PASS |
| 23 diagram .puml | `ls docs/thesis/final/diagrams/*.puml \| wc -l` = 23 | STRUCTURE.md scope | PASS |

### Verdict V4: **PASS** (0 mâu thuẫn với canonical; tất cả 10 chỉ số nhất quán)

---

## V5 — Outline khớp

### Lệnh chạy

```bash
grep -nE '^#{1,3} ' docs/thesis/final/chuong-*.md
```

### Đối chiếu Mục lục (00-trang-bia-muc-luc.md) ↔ Heading thật

| Mục lục ghi | Heading thật trong file | Khớp? |
|---|---|---|
| Chương 1. GIỚI THIỆU | `# CHƯƠNG 1. GIỚI THIỆU` | ✓ |
| 1.1 Sự cần thiết của bài toán | `## 1.1. Sự cần thiết của bài toán` | ✓ |
| 1.2 Mục tiêu nghiên cứu | `## 1.2. Mục tiêu nghiên cứu` | ✓ |
| 1.3 Phạm vi nghiên cứu | `## 1.3. Phạm vi nghiên cứu` | ✓ |
| 1.4 Phương pháp tiếp cận | `## 1.4. Phương pháp tiếp cận` | ✓ |
| 1.5 Đóng góp của khóa luận | `## 1.5. Đóng góp của khóa luận` | ✓ |
| 1.6 Cấu trúc khóa luận | `## 1.6. Cấu trúc khóa luận` | ✓ |
| Chương 2. CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ LIÊN QUAN | `# CHƯƠNG 2. CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ LIÊN QUAN` | ✓ |
| 2.1/2.1.1/2.1.2/2.1.3 | Khớp đúng text và cấp | ✓ |
| 2.2/2.2.1/2.2.2 | Khớp | ✓ |
| 2.3/2.3.1..2.3.5 | Khớp | ✓ |
| 2.4/2.4.1/2.4.2/2.4.3 | Khớp | ✓ |
| 2.5/2.6 | Khớp | ✓ |
| Chương 3. PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG | `# CHƯƠNG 3. PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG` | ✓ |
| 3.1/3.1.1/3.1.2/3.1.3 | Khớp | ✓ |
| 3.2/3.2.1/3.2.2/3.2.3 | Khớp | ✓ |
| 3.3/3.3.1..3.3.7 | Khớp (3.3.7 dùng sub-heading #### (a)(b)(c) trong nội dung) | ✓ |
| 3.4/3.4.1/3.4.2/3.4.3 | Khớp (3.4.2 ghi "Chi tiết 10 collections") | ✓ |
| 3.5/3.5.1/3.5.2/3.5.3 | Khớp | ✓ |
| Chương 4. TRIỂN KHAI VÀ THỰC NGHIỆM | `# CHƯƠNG 4. TRIỂN KHAI VÀ THỰC NGHIỆM` | ✓ |
| 4.1..4.4.5 | Khớp đủ (4.4.1..4.4.5 hiện diện) | ✓ |
| Chương 5. KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN | `# CHƯƠNG 5. KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN` | ✓ |
| 5.1/5.2/5.3 | Khớp | ✓ |
| Tài liệu tham khảo | file tai-lieu-tham-khao.md | ✓ |

Không có mục nào trong mục lục bị thiếu hoặc thừa heading trong file. Thứ tự đúng, cấp đúng.

### Verdict V5: **PASS** (mục lục khớp 100% với heading thật)

---

## V6 — 0 số eval bịa toàn §4.4

### Lệnh chạy

```bash
grep -rnE "MAE|AUROC|accuracy|doanh thu|precision|recall|F1" \
  docs/thesis/final/chuong-4-trien-khai-thuc-nghiem.md | head -40
```

### Kết quả kiểm tra từng bảng

**Bảng §4.4.2 — Eval dự báo (Bảng 4.7):**

```
| `leafy`  | ForecasterLSTM | —  | —  | —  |
| `leafy`  | Naive          | —  | —  | —  |
| `root`   | ForecasterLSTM | —  | —  | —  |
...
| **Tổng** | ForecasterLSTM | —  | —  | —  |
```

Tất cả ô MAE/day, AUROC, Waste rate đều là `—`. Không có số cụ thể. ✓

**Bảng §4.4.3 — Eval định giá (Bảng 4.8):**

```
| Tổng doanh thu mô phỏng (91 ngày) | —  | —  | —  |
| Số sự kiện lãng phí               | —  | —  | —  |
| Safety clip rate (%)              | —  | —  | —  |
```

Tất cả ô đều là `—`. ✓

**Bảng §4.4.3 — Phân bố 11 action (Bảng 4.9):**  
Tần suất chọn (%) = `—` cho toàn bộ 11 action. ✓

**Bảng §4.4.4 — Eval freshness (sau Bảng 4.11):**

```
| fruit model | —  | —  | —  | —  | —  |
| root model  | —  | —  | —  | —  | —  |
```

Accuracy, Precision, Recall, F1-score, Inference time đều `—`. ✓

**Phân tích các hit MAE/AUROC/precision/recall/F1:**
- `MAE/day` + `AUROC` → dùng để **định nghĩa công thức** (LaTeX equation), không phải kết quả đo. OK.
- `F1-score` → tên cột trong Bảng 4.11 (header), không phải số đo. OK.
- `doanh thu` → tên chỉ số trong Bảng 4.8 (header), không phải số đo. OK.
- Ngưỡng tham khảo "MAE/day < 3.0 và AUROC > 0.85" → trích từ `eval.py:90-92` là ngưỡng của script, không phải kết quả đo của mô hình. OK.
- Hằng số kỹ thuật: EPISODE_LEN=91, 11 action, obs_dim=10 — KHÔNG phải số eval. Hợp lệ.

Không có số eval cụ thể (như "MAE = 2.3", "AUROC 0.87", "accuracy 92%") được trình bày như kết quả đo thật.

### Verdict V6: **PASS** (0 số eval bịa; mọi ô bảng đều là "—" placeholder)

---

## Bảng tổng kết

| Kiểm | Tên | Verdict |
|---|---|---|
| V1 | Citation resolve sweep | **PASS** |
| V2 | False-claim sweep (toàn văn) | **PASS** |
| V3 | 3 giới hạn bắt buộc §5.2 | **PASS** |
| V4 | Số liệu canonical nhất quán | **PASS** |
| V5 | Outline khớp | **PASS** |
| V6 | 0 số eval bịa §4.4 | **PASS** |

---

## VERDICT TỔNG: PASS

**0 FAIL. 0 REJECT.**

Khoá luận F2T (5 chương + TLTK + mục lục + 23 diagram) đạt chuẩn trung thực 100% với code:
- Toàn bộ 38 path ref (bao gồm .tsx) resolve tại source thực.
- Không có claim bịa đặt (recommender, Holt, MobileNetV2, obs_dim=11, 3 sidecar, port 8001/8002, số eval cụ thể).
- 3 giới hạn bắt buộc hiện diện đúng và đúng trạng thái.
- 10 canonical numbers nhất quán xuyên suốt 5 chương.
- Mục lục khớp hoàn toàn với heading thật.
- Tất cả ô bảng eval §4.4 đều là "—" placeholder — không có số bịa.

---

## Mục WARN ghi nhận (không chặn)

| ID | Mô tả | Ảnh hưởng |
|---|---|---|
| WARN-V1-A | `order.schema.ts:L8-34`, `order.schema.ts:L239/240/241` tại chuong-3:493,605-607 dùng path rút gọn (thiếu `f2t-backend/src/modules/orders/schemas/`) | Không ảnh hưởng tính đúng đắn — file tồn tại, nội dung chính xác; chỉ là shorthand trong ô bảng |
| WARN-V1-B | `f2t-frontend/src/app/admin/index.ts` trong danh sách regex gốc là artifact của regex không bắt `.tsx` — file thực tế là `index.tsx` và tồn tại | Không phải broken ref |
| WARN-V2-A | §2.5 đối thủ tương tự [33-35]: 3 paper so sánh có thông tin tổng hợp best-effort (không verify từng paper) | Theo STRUCTURE.md: TLTK paper là best-effort, hợp lệ |
| WARN-V6-A | Ngưỡng "MAE/day < 3.0 và AUROC > 0.85" trích từ `eval.py:90-92` là ngưỡng của script, chưa đo được vì bảng còn "—" | Cần ghi rõ đây là threshold kỳ vọng, không phải kết quả đo — đã ghi rõ trong footnote |

---

*Report được tạo bởi Adversarial Verifier T2.V — 2026-06-08*
