# Task 2 — Viết khoá luận F2T hoàn chỉnh (full prose) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nở dàn ý đã fact-check `docs/thesis/dany.md` thành khoá luận tiếng Việt hoàn chỉnh (prose đầy đủ + diagram PlantUML), trung thực 100% với codebase, mỗi câu kỹ thuật mang citation resolve được.

**Architecture:** Đầu ra **chia chương** trong `docs/thesis/final/` (5 file chương + tài liệu tham khảo) + `docs/thesis/final/diagrams/*.puml`. Mỗi leaf-task = 1 cụm mục §x.y hoặc 1 nhóm diagram. Quy trình mỗi leaf-task: xác nhận evidence trong `.handoff/claims-ledger.md` (TÁI DÙNG entry Task 0/1) → viết prose từ dany.md (giữ citation inline `[ref: ...]`) → self-check citation resolve → **dispatch agent verify đối kháng KHÁC agent viết** → done-gate → commit nhỏ + cập nhật `.handoff/`.

**Tech Stack:** Markdown (GFM) tiếng Việt; PlantUML cho diagram; nguồn sự thật = repo f2t (`f2t-backend`, `f2t-frontend`, `dynamic-pricing-final`, `pricing-sidecar`, `freshnessmodels`) + `.handoff/claims-ledger.md` (15 entry sẵn) + `docs/thesis/dany.md` (dàn ý đã fact-check, 662 dòng).

---

## Nguyên tắc xuyên suốt (đọc trước khi thực thi BẤT KỲ task nào)

Trích `.handoff/rules.md` (enforcement protocol — Tiêu chí #1: chân thực 100% với code):

1. **Ledger-first.** Mọi claim kỹ thuật phải có entry trong `.handoff/claims-ledger.md` TRƯỚC khi viết prose. Phần lớn đã có (15 entry Task 0/1). Nếu một câu prose cần fact CHƯA có ledger → dừng, nạp ledger (file:Lxx + lệnh/output), rồi mới viết. **Cấm viết-rồi-bịa-nguồn.**
2. **Citation máy-kiểm inline.** Mỗi câu kỹ thuật mang `[ref: path:Lxx]` hoặc `[ref: ledger <id>]` mà verify mở ra resolve được. **Câu kỹ thuật không citation = auto-reject.** Prose mô tả/diễn giải chung (không claim sự kiện kỹ thuật) không bắt buộc citation.
3. **Verify đối kháng 2 lớp cho CSDL / AI-ML / diagram.** Agent verify KHÁC agent viết, "giả định claim sai cho tới khi resolve được". Có quyền REJECT → trả task về sửa. Section thường (Chương 1 bối cảnh, lý thuyết chung) verify 1 lớp.
4. **Done-gate gắn artifact.** Chỉ `done` khi: prose hoàn chỉnh + citation resolve + verify PASS report ghi vào `.handoff/progress/task-2.md`.
5. **3 giới hạn BẮT BUỘC** (ledger `t0.10-thesis-limitations`) phải xuất hiện đúng trạng thái MỚI ở §5.2 (và nhắc ở §3.3.7a, §4.4.2):
   - (a) Forecaster **đã retrain obs_dim=10** (lstm.weight_ih_l0=(512,10)) → **KHÔNG còn layout mismatch 11≠10**; giới hạn còn lại CHỈ là serve **tile-21× steady-state** (`pricing-sidecar/main.py:135`). TUYỆT ĐỐI không ghi "obs_dim=11" / "layout 11≠10" như giới hạn hiện tại.
   - (b) DoW lệch pha serve `datetime.now().weekday()` vs train `t%7`, ảnh hưởng **<6.2%** (sin/cos_weekly nhỏ, max ±0.023).
   - (c) Freshness chỉ **2/4 model CoreML** (fruit/root); leafy/herbs fallback root.

**CẤM tuyệt đối:** sửa `dynamic-pricing-final/`, `pricing-sidecar/`, `freshnessmodels/`, parquet, checkpoint (CHỈ ĐỌC để fact-check). Không tái verify cái đã có ledger entry. Tiếng Việt. Branch `feature/f2t-ml-verify-thesis`.

### Prompt template bắt buộc cho subagent (copy vào MỌI dispatch)

```
[BỐI CẢNH] Dự án f2t, repo /Users/macos/f2t, branch feature/f2t-ml-verify-thesis.
Đọc trước: .handoff/rules.md (enforcement), docs/thesis/dany.md (dàn ý đã fact-check — NGUỒN nội dung),
.handoff/claims-ledger.md (evidence tái dùng). KHÔNG sửa dynamic-pricing-final/, pricing-sidecar/, freshnessmodels/.
[NHIỆM VỤ] <1 leaf-task duy nhất, tự chứa — viết prose cho cụm mục/diagram cụ thể>
[NGUỒN] dany.md dòng <Lxx-Lyy>; ledger id <...>; file code <path:Lxx> nếu cần resolve thêm.
[ĐẦU RA] Ghi prose vào docs/thesis/final/<file>; ghi finding/verify-note vào .handoff/progress/task-2.md.
[BẰNG CHỨNG] Giữ citation inline [ref: ...] cho mọi câu kỹ thuật. Fact mới (chưa có ledger) → nạp ledger TRƯỚC.
[ĐỊNH NGHĨA DONE] <điều kiện cụ thể + checklist verify>.
[CẤM] Không claim done khi thiếu evidence. Không bịa nguồn. Không sửa code/ngoài phạm vi task. Không tái verify cái đã có ledger.
```

### Quy trình chuẩn 1 leaf-task prose (áp cho mọi T2.4…T2.30)

- [ ] **B1 — Xác nhận evidence:** đọc dòng dany.md tương ứng + ledger id liệt kê trong task. Nếu thiếu fact → nạp ledger mới (file:Lxx + lệnh/output) rồi tiếp.
- [ ] **B2 — Viết prose:** nở bullet dany.md thành đoạn văn tiếng Việt mạch lạc, GIỮ nguyên thứ tự mục + GIỮ citation inline `[ref: ...]`. Heading dùng Markdown `#`/`##`/`###` (đầu ra final khác dany.md là prose + heading thật).
- [ ] **B3 — Self-check:** grep file vừa viết, mọi câu nêu số liệu/kiến trúc/endpoint/schema có `[ref:`. Liệt kê citation trong progress.
- [ ] **B4 — Verify đối kháng:** dispatch agent KHÁC (sonnet) với lệnh "resolve từng citation tại nguồn, giả định sai cho tới khi mở được; REJECT nếu lệch". CSDL/AI-ML/diagram BẮT BUỘC bước này; section thường có thể controller tự verify resolve mẫu.
- [ ] **B5 — Done-gate + commit:** verify PASS → ghi report vào progress/task-2.md → `git commit -m "task(T2.x): <mô tả>"` kèm `.handoff/`.

---

## File Structure

```
docs/thesis/final/
├── 00-trang-bia-muc-luc.md         # trang bìa + mục lục + danh mục hình/bảng (T2.1 skeleton, T2.30 hoàn thiện)
├── chuong-1-gioi-thieu.md          # T2.4, T2.5
├── chuong-2-co-so-ly-thuyet.md     # T2.6–T2.11
├── chuong-3-phan-tich-thiet-ke.md  # T2.12–T2.22
├── chuong-4-trien-khai-thuc-nghiem.md  # T2.23–T2.28
├── chuong-5-ket-luan.md            # T2.29
├── tai-lieu-tham-khao.md           # T2.30
└── diagrams/                       # T2.3a–T2.3g (PlantUML .puml)
    ├── erd.puml
    ├── deployment-architecture.puml
    ├── fdd-functional-decomposition.puml
    ├── contribution-map.puml
    ├── usecase-overview.puml
    ├── usecase-aiml.puml
    ├── sd-01..sd-06.puml           # 6 file sequence e-commerce
    ├── sd-ml-01..sd-ml-03.puml     # 3 file sequence AI/ML
    ├── ad-01,ad-02.puml            # 2 activity e-commerce
    ├── ad-ml-01,ad-ml-02.puml      # 2 activity AI/ML
    ├── business-process-current.puml
    ├── business-process-f2t.puml
    ├── net-forecaster-lstm.puml    # sơ đồ kiến trúc mạng (figure)
    └── net-ddqn-dueling.puml
```

Mỗi file chương: khi viết section nào thì APPEND/điền vào đúng vị trí heading skeleton (T2.1 tạo skeleton trước).

---

## FOUNDATION TASKS

### Task T2.1: Dàn ý thesis đầy đủ + skeleton file

**Files:**
- Create: `docs/thesis/final/00-trang-bia-muc-luc.md`
- Create: `docs/thesis/final/chuong-1-gioi-thieu.md` … `chuong-5-ket-luan.md` (5 file)
- Create: `docs/thesis/final/tai-lieu-tham-khao.md`
- Create: `docs/thesis/final/diagrams/` (thư mục, có `.gitkeep`)
- Create: `docs/thesis/final/STRUCTURE.md` — bảng ánh xạ section → leaf-task → file → diagram → ledger id

- [ ] **Step 1:** Tạo 6 file chương + references với **heading skeleton Markdown** lấy từ `dany.outline.md` (5 chương, ~80 mục). Mỗi section chỉ có heading `##`/`###` + 1 dòng HTML comment `<!-- T2.x: nguồn dany.md Lxx-Lyy; ledger ... -->` đánh dấu nguồn, CHƯA viết prose.
- [ ] **Step 2:** Tạo `STRUCTURE.md` ánh xạ: cột [Section | dany.md dòng | leaf-task | file đích | diagram cần | ledger id | ưu tiên 2-lớp?]. Đây là HỢP ĐỒNG cấu trúc: T2.4…N chỉ điền prose vào skeleton, không đổi thứ tự/cấp mục.
- [ ] **Step 3:** Trang bìa + mục lục skeleton trong `00-trang-bia-muc-luc.md` (tên đề tài, tác giả placeholder, mục lục auto từ heading — điền số trang để trống).
- [ ] **Step 4 — Verify:** controller đối chiếu `STRUCTURE.md` ↔ `dany.outline.md`: đủ 5 chương, mọi §x.y/§x.y.z có mặt, thứ tự khớp, không thêm/bớt mục so outline. PASS → ghi progress.
- [ ] **Step 5 — Commit:** `git commit -m "task(T2.1): skeleton thesis final + STRUCTURE map"`

**Done:** 8 file tồn tại, STRUCTURE.md phủ 100% outline, verify PASS.

---

### Task T2.2: Fact-pack — nạp ledger các fact CHƯA có (non-AI/non-CSDL)

**Mục tiêu:** AI/ML + CSDL đã có 15 ledger entry (TÁI DÙNG, KHÔNG verify lại). Task này chỉ nạp fact MỚI cho prose Chương 1/2/4 sẽ cần. Mỗi fact = 1 lệnh + output → 1 ledger entry nhóm "Task 2".

**Files:** Modify `.handoff/claims-ledger.md` (thêm nhóm `## Nhóm: Task 2 — fact-pack prose`)

- [ ] **Step 1 — Tech stack versions (ledger `t2.2-tech-versions`):** đọc `f2t-backend/package.json` + `f2t-frontend/package.json` + `pricing-sidecar/requirements.txt`. Ghi giá trị thật: NestJS `@nestjs/common 11.0.1`, mongoose `8.19.1`, `@nestjs/mongoose 11.0.3`, bcrypt `6.0.0`, passport-jwt `4.0.1`, stripe `^22.1.1`, `@nestjs/schedule ^6.1.3`, class-validator `0.14.2`; Expo `~53.0.27`, expo-router `~5.1.11`, react-native `0.79.6`, nativewind `^4.1.21`, zustand `^5.0.5`, react-native-mmkv `~3.1.0`, axios `^1.7.5`, `@tanstack/react-query ^5.52.1`; sidecar fastapi/uvicorn/torch/numpy/coremltools/Pillow (từ requirements.txt).
- [ ] **Step 2 — Frontend route groups (ledger `t2.2-frontend-routes`):** `ls f2t-frontend/src/app` → route groups thật: `(app)`, `admin`, `checkout`, `farms`, `feed`, `notifications`, `products`, `settings`, `login.tsx`, `register.tsx`, `register-customer.tsx`, `verification.tsx`, `onboarding.tsx`. Xác nhận số màn hình ≈48 (ledger t1.15-numbers đã có — reference).
- [ ] **Step 3 — Seed accounts (ledger `t2.2-seed`):** đọc `f2t-backend/src/seed/seed.ts` — đếm thật số admin/farm/consumer/suspended. SỬA dany.md §4.2.3 nếu lệch ("Admin×1, Farm×3, Consumer×5, Suspended×1" — verify con số thật).
- [ ] **Step 4 — Stripe + GHN integration (ledger `t2.2-stripe-ghn`):** resolve điểm tích hợp: Stripe Checkout Session + webhook (`f2t-backend/src/modules/payments/`), GHN + Dijkstra fallback (`f2t-backend/src/modules/delivery/delivery.service.ts`). Ghi path:Lxx hàm chính.
- [ ] **Step 5 — NFR/bảo mật (ledger `t2.2-security`):** JWT guard, bcrypt hash, graceful degradation interceptor — resolve path. (DynamicPricingInterceptor đã có ledger t1.4-interceptor-cron.)
- [ ] **Step 6 — Verify:** controller resolve mẫu 3/5 entry (mở file tại Lxx). PASS → commit `task(T2.2): fact-pack ledger Task 2`.

**Done:** ≥5 ledger entry nhóm Task 2, mỗi entry có lệnh+output/path resolve được.

> Ghi chú: nếu khi viết prose phát hiện fact thiếu ledger → nạp bổ sung ngay tại leaf-task đó (ledger-first), không chờ.

---

## DIAGRAM TASKS (T2.3a–T2.3g) — PlantUML bám code

> Mọi diagram phải bám fact đã verify. Tên collection/field/endpoint/actor lấy từ ledger + dany.md, KHÔNG bịa. Diagram = phần ưu tiên 2-lớp verify. Mỗi `.puml` mở đầu bằng comment nguồn `'@source: ledger <id>, dany.md Lxx`.

### Task T2.3a ⭐ (2-lớp): ERD 10 collection

**Files:** Create `docs/thesis/final/diagrams/erd.puml`
**Nguồn:** dany.md §3.4.1 (L399-421) + §3.4.2 (L423-447); ledger `t1.11-schema-detail`, `t1.4-collections`.

- [ ] **Step 1:** Vẽ `@startuml` ERD 10 entity: users, farms, products, orders (+ OrderItem embedded), posts, notifications, notification_preferences, verification_tokens, freshness_cache, price_overrides. Field chính + PK/FK theo §3.4.2. Quan hệ 1-N/1-1 theo §3.4.1 (10 quan hệ, mỗi quan hệ ghi FK ref).
- [ ] **Step 2:** Đánh dấu embedded (OrderItem trong orders) khác reference (ref:ObjectId). Ghi unique/TTL/compound index nổi bật.
- [ ] **Step 3 — Verify đối kháng:** agent KHÁC resolve từng entity/field/quan hệ về schema file (10 file `*.schema.ts` theo ledger t1.11). REJECT nếu có collection/field/quan hệ không tồn tại (vd recommendation_caches). PASS.
- [ ] **Step 4 — Commit** `task(T2.3a): ERD PlantUML`.

**Done:** đúng 10 entity, 0 entity bịa, mọi quan hệ resolve về schema, verify PASS.

### Task T2.3b: Deployment architecture + FDD + Contribution map

**Files:** `deployment-architecture.puml`, `fdd-functional-decomposition.puml`, `contribution-map.puml`
**Nguồn:** §3.3.1 (L243-253), §3.2.3 (L233-239), §1.5 (L47-61); ledger `t1.4-one-sidecar`.

- [ ] **Step 1:** Deployment: Expo app ↔ NestJS(3000) ↔ MongoDB + **1** pricing-sidecar FastAPI(8000) với 3 endpoint /predict /forecast /freshness/classify. KHÔNG vẽ 3 sidecar/8001/8002.
- [ ] **Step 2:** FDD tree: F2T → 4 nhóm (Quản lý người dùng, E-commerce, AI/ML, Quản trị). Nhóm AI/ML đúng 3 chức năng (Dự báo / Định giá / Phân loại tươi), KHÔNG có gợi ý sản phẩm.
- [ ] **Step 3:** Contribution map: 6 đóng góp ĐG1-ĐG6 (theo §1.5) định vị trên kiến trúc.
- [ ] **Step 4 — Verify:** resolve 1 sidecar (app.module.ts:57), 3 chức năng AI (main.py:263/277/316), 6 ĐG. PASS → commit `task(T2.3b)`.

### Task T2.3c: Use case (tổng quan + AI/ML)

**Files:** `usecase-overview.puml`, `usecase-aiml.puml`
**Nguồn:** §3.3.2 (L255-267), §3.3.3 (L269-275); ledger `t1.4-no-recommender`, `t1.4-forecaster-not-holt`.

- [ ] **Step 1:** Overview: 3 actor (Consumer, Farm, Admin) + nhóm UC (UC-01..06).
- [ ] **Step 2:** AI/ML: đúng **2** UC-ML (UC-ML-01 Dự báo nhu cầu, UC-ML-02 Định giá động). KHÔNG có UC recommender.
- [ ] **Step 3 — Verify đối kháng:** REJECT nếu xuất hiện UC gợi ý/recommender. Resolve UC-ML-01 (demand-forecasting.service.ts:43), UC-ML-02 (main.py:277). PASS → commit `task(T2.3c)`.

### Task T2.3d: Sequence E-commerce SD-01..SD-06

**Files:** `sd-01-login-jwt.puml` … `sd-06-ghn-dijkstra.puml` (6 file)
**Nguồn:** §3.3.5 (L295-307); ledger `t2.2-stripe-ghn`, `t2.2-security`.

- [ ] **Step 1:** SD-01 Login+JWT refresh; SD-02 Đăng ký; SD-03 Tìm kiếm geo (2dsphere $near); SD-04 Tạo đơn (embedded snapshot giá); SD-05 Stripe Checkout+Webhook; SD-06 GHN+Dijkstra fallback. Mỗi SD: actor → NestJS controller/service → Mongo/bên thứ ba.
- [ ] **Step 2 — Verify:** resolve geo (farm.schema.ts:113), snapshot (order.schema.ts:105), Stripe/GHN (ledger t2.2). PASS → commit `task(T2.3d)`.

### Task T2.3e ⭐ (2-lớp): Sequence AI/ML SD-ML-01..03

**Files:** `sd-ml-01-pricing-cron.puml`, `sd-ml-02-forecast.puml`, `sd-ml-03-pricing-detail.puml`
**Nguồn:** §3.3.5 (L309-317); ledger `t1.4-interceptor-cron`, `t1.4-forecaster-not-holt`, `t1.4-safety-5-rules`.

- [ ] **Step 1:** SD-ML-01 PricingTickCron `"0 * * * *"` → lấy state → DDQN → Safety 5 rule → PriceOverride → push → Farm accept/reject [pricing-tick.cron.ts:18]. SD-ML-02 DemandForecastingService → sidecar /forecast(8000) → _run_forecaster → ForecasterLSTM → demand 7 ngày [demand-forecasting.service.ts:43; main.py:263]. SD-ML-03 chu kỳ định giá chi tiết [main.py:277; safety.py:1-19].
- [ ] **Step 2 — Verify đối kháng:** resolve cron schedule, /forecast endpoint, /predict, Safety 5 rule. REJECT nếu có cosine/Holt/8001/8002. PASS → commit `task(T2.3e)`.

### Task T2.3f ⭐ (2-lớp phần AI/ML): Activity AD-01,02 + AD-ML-01,02

**Files:** `ad-01-order-lifecycle.puml`, `ad-02-jwt.puml`, `ad-ml-01-forecaster.puml`, `ad-ml-02-ddqn-safety.puml`
**Nguồn:** §3.3.6 (L319-333); ledger `t1.4-forecaster-not-holt`, `t1.4-safety-5-rules`.

- [ ] **Step 1:** AD-01 vòng đời đơn (pending→confirmed→preparing→ready_for_pickup→shipped→delivered/cancelled — đúng enum order.schema.ts status). AD-02 JWT refresh. AD-ML-01 suy luận ForecasterLSTM (/forecast→_run_forecaster→demand/waste_logit) [main.py:128-145]. AD-ML-02 DDQN→Safety 5 rule thứ tự **3→4→1→2→5**→clip→PriceOverride [safety.py:1-19].
- [ ] **Step 2 — Verify đối kháng:** resolve enum status thật, thứ tự Safety rule. PASS → commit `task(T2.3f)`.

### Task T2.3g: Business process (hiện tại + F2T) + figure mạng

**Files:** `business-process-current.puml`, `business-process-f2t.puml`, `net-forecaster-lstm.puml`, `net-ddqn-dueling.puml`
**Nguồn:** §3.1.1 (L197-203), §3.1.2 (L205-209), §3.3.7a/b; ledger `t0.2-forecaster-arch`, `t0.2-ddqn-arch`.

- [ ] **Step 1:** Quy trình hiện tại (Nông dân→Thương lái→Chợ đầu mối→Cửa hàng→NTD). Quy trình F2T (Farm→Admin duyệt→đăng SP→Consumer→đặt→Stripe→GHN→đánh giá) + luồng AI đan xen.
- [ ] **Step 2:** Figure mạng ForecasterLSTM (input obs_dim=10 × window=21 → LSTM 2 lớp h=128 → +cat_embed(4,8) → dual-head demand/waste_logit). Figure SharedMLPDuelingQNet (obs10+embed8→128→128→ V-stream/A-stream → Q=V+A−mean(A)).
- [ ] **Step 3 — Verify:** resolve kiến trúc mạng (model.py:18-49, network.py:51-81). PASS → commit `task(T2.3g)`.

---

## CHƯƠNG 1 — GIỚI THIỆU (file: chuong-1-gioi-thieu.md)

### Task T2.4: §1.1 Sự cần thiết + §1.2 Mục tiêu

**Nguồn:** dany.md L1-29; ledger `t1.15-numbers`, `t1.4-forecaster-not-holt`, `t1.4-safety-5-rules`, `t1.4-freshness-coreml`, `t0.2-*`.
**Verify:** 1-lớp (bối cảnh) + resolve citation MT2-MT6 (technical).

- [ ] B1-B5 theo quy trình chuẩn. Prose §1.1: bối cảnh nông nghiệp VN, 3 vấn đề (trung gian/mất tươi/không dự báo), cơ hội TMĐT+AI (giữ trích FAO/e-Conomy SEA 2023 — nguồn ngoài, đánh dấu [TLTK]). §1.2: 6 mục tiêu MT1-MT6 với citation thật (13 module, ForecasterLSTM, DDQN+Safety, 2 CoreML, 54/54 test).
- [ ] **Verify checklist:** không "recommender/Holt/MobileNetV2/14 module"; MT có citation resolve; số 13 module / 54 test đúng.
- [ ] Commit `task(T2.4): Chương 1 §1.1-§1.2`.

### Task T2.5: §1.3 Phạm vi + §1.4 Phương pháp + §1.5 Đóng góp + §1.6 Cấu trúc

**Nguồn:** dany.md L31-65; ledger `t1.4-one-sidecar`, `t1.4-interceptor-cron`; diagram `contribution-map.puml`.
**Verify:** resolve 6 ĐG (đặc biệt ĐG1 "1 sidecar", ĐG2 interceptor, ĐG3 LSTM, ĐG4 DDQN, ĐG5 CoreML, ĐG6 Dijkstra+snapshot).

- [ ] B1-B5. §1.5 chèn tham chiếu hình `contribution-map.puml`. §1.6 mô tả 5 chương khớp STRUCTURE.md.
- [ ] **Verify checklist:** §1.3 "1 sidecar 3 endpoint" (không 3 sidecar); đúng 6 đóng góp thật; 0 claim bịa.
- [ ] Commit `task(T2.5): Chương 1 §1.3-§1.6`.

---

## CHƯƠNG 2 — CƠ SỞ LÝ THUYẾT (file: chuong-2-co-so-ly-thuyet.md)

### Task T2.6: §2.1 Tổng quan lý thuyết + §2.2 Kiến trúc hệ thống

**Nguồn:** dany.md L67-101. §2.1.1-2.1.3 (TMĐT nông sản, AI trong TMĐT, Agile/Scrum), §2.2.1-2.2.2 (Monolith/Micro/Sidecar, REST).
**Verify:** 1-lớp (lý thuyết chung). LƯU Ý §2.1.2: "4 ứng dụng AI" là lý thuyết chung — phải ghi rõ **F2T chỉ hiện thực 3/4** (không có gợi ý) [ref: ledger t1.4-no-recommender].

- [ ] B1-B5. Prose lý thuyết + lập luận chọn Monolith+1 Sidecar.
- [ ] **Verify checklist:** §2.1.2 nêu rõ F2T 3/4; §2.2 "1 sidecar".
- [ ] Commit `task(T2.6): Chương 2 §2.1-§2.2`.

### Task T2.7: §2.3 Công nghệ và công cụ

**Nguồn:** dany.md L103-135; ledger `t2.2-tech-versions`.
**Verify:** resolve version thật (Expo SDK 53, NestJS 11, mongoose 8, FastAPI…).

- [ ] B1-B5. §2.3.1 RN+Expo SDK 53; §2.3.2 NestJS 11 (DI/Guards/Interceptors/Pipes); §2.3.3 MongoDB/Mongoose 8; §2.3.4 FastAPI+Pydantic+lifespan load model; §2.3.5 Stripe+GHN.
- [ ] **Verify checklist:** mọi version khớp package.json/requirements.txt (ledger t2.2-tech-versions).
- [ ] Commit `task(T2.7): Chương 2 §2.3`.

### Task T2.8 ⭐ (2-lớp AI/ML): §2.4.1 Dự báo chuỗi thời gian với LSTM

**Nguồn:** dany.md L137-149; ledger `t0.2-forecaster-arch`, `t0.4-forecaster-parity`, `t1.6-section-2.4-rewrite`.
**Verify đối kháng BẮT BUỘC.**

- [ ] B1-B5. Lý thuyết LSTM (cell state, 3 gate, vanishing gradient) + ForecasterLSTM thật: input_size=**obs_dim=10** (sau retrain T0.13), hidden=128, 2 lớp, dropout=0.2, cat_embed(4,8), dual-head demand/waste_logit, window=21. Tham chiếu figure `net-forecaster-lstm.puml`.
- [ ] **Verify checklist:** obs_dim=**10** (KHÔNG 11); resolve model.py:9/23-29/31-49; không Holt/EWMA/DoW.
- [ ] Commit `task(T2.8): §2.4.1 LSTM`.

### Task T2.9 ⭐ (2-lớp AI/ML): §2.4.2 Học tăng cường và DDQN

**Nguồn:** dany.md L151-161; ledger `t0.2-ddqn-arch`, `t0.2-action-space`, `t0.3-obs-parity`, `t1.4-ddqn-dims`.

- [ ] B1-B5. RL cơ bản → Q-Learning → DQN(replay) → Double DQN(giảm overestimation) → Dueling(V/A, Q=V+A−mean A) + áp dụng: state 10 chiều (liệt kê đúng), 11 action linspace(−0.30,0.20,11), SharedMLPDuelingQNet+cat_embed. Tham chiếu `net-ddqn-dueling.puml`.
- [ ] **Verify checklist:** 10 chiều/11 action đúng; resolve network.py:51-81, reward.py:6-7; KHÔNG "5-dim/5-action/MLP-5→64→32→5".
- [ ] Commit `task(T2.9): §2.4.2 DDQN`.

### Task T2.10 ⭐ (2-lớp AI/ML): §2.4.3 Phân loại ảnh và CoreML

**Nguồn:** dany.md L163-171; ledger `t0.6-coreml-freshness`, `t0.9-fixes`, `t1.4-freshness-coreml`.

- [ ] B1-B5. Transfer learning + CNN nhẹ (MobileNet/SqueezeNet là lý thuyết chung) + CoreML on-device (.mlmodel, predict, 299×299, BGR-declared/feed RGB đã xác minh) + áp dụng F2T 2 model nhị phân fruit/root.
- [ ] **Verify checklist:** "2 model CoreML nhị phân" (KHÔNG "MobileNetV2 4-class/14MB/dataset thu thập"); BGR→feed RGB nêu đúng (ledger t0.9); resolve main.py:318-333.
- [ ] Commit `task(T2.10): §2.4.3 CoreML`.

### Task T2.11: §2.5 Hệ thống tương tự + §2.6 Nhận xét

**Nguồn:** dany.md L173-189; ledger `t1.4-no-recommender`.
**Verify:** 1-lớp + kiểm kết luận §2.5/§2.6 không claim F2T có recommender.

- [ ] B1-B5. So sánh Foodmap/Sendo Farm/Bac Tom/Lazada Fresh (bảng), kết luận "chưa hệ thống nào tích hợp dự báo+định giá+phân loại tươi" (KHÔNG nêu gợi ý là điểm khác biệt F2T).
- [ ] Commit `task(T2.11): Chương 2 §2.5-§2.6`.

---

## CHƯƠNG 3 — PHÂN TÍCH THIẾT KẾ (file: chuong-3-phan-tich-thiet-ke.md)

### Task T2.12: §3.1 Quy trình nghiệp vụ (3.1.1-3.1.3)

**Nguồn:** dany.md L195-217; diagram `business-process-current.puml`, `business-process-f2t.puml`; ledger `t1.4-interceptor-cron`, `t1.4-no-recommender`.

- [ ] B1-B5. §3.1.2 luồng AI: API trả nhãn tươi+giá động qua DynamicPricingInterceptor; Farm dashboard dự báo+đề xuất giá DDQN (KHÔNG "gợi ý sản phẩm").
- [ ] **Verify checklist:** resolve interceptor:74-77; 0 recommender.
- [ ] Commit `task(T2.12): §3.1`.

### Task T2.13: §3.2 Chức năng nghiệp vụ (3.2.1-3.2.3)

**Nguồn:** dany.md L219-239; diagram `fdd-functional-decomposition.puml`; ledger `t1.4-no-recommender`.

- [ ] B1-B5. §3.2.1 yêu cầu theo vai trò (Consumer 8/Farm 7/Admin 5 — giữ "Farm nhận gợi ý giá" THẬT, bỏ "Consumer xem gợi ý"). §3.2.2 NFR 6 tiêu chí. §3.2.3 FDD nhóm AI/ML = 3 chức năng thật.
- [ ] **Verify checklist:** Consumer không "xem gợi ý"; FDD AI/ML 3 chức năng (không gợi ý SP).
- [ ] Commit `task(T2.13): §3.2`.

### Task T2.14: §3.3.1 Kiến trúc triển khai + §3.3.2 Use case tổng quan

**Nguồn:** dany.md L241-267; diagram `deployment-architecture.puml`, `usecase-overview.puml`; ledger `t1.4-one-sidecar`.

- [ ] B1-B5. §3.3.1 mô tả kiến trúc 1 sidecar 3 endpoint + graceful degradation (tham chiếu hình). §3.3.2 mô tả UC-01..06 (tham chiếu hình).
- [ ] **Verify checklist:** resolve app.module.ts:57, 3 endpoint main.py:263/277/316; 0 "3 sidecar".
- [ ] Commit `task(T2.14): §3.3.1-§3.3.2`.

### Task T2.15: §3.3.3 Use case AI/ML + §3.3.4 Đặc tả UC chi tiết

**Nguồn:** dany.md L269-291; diagram `usecase-aiml.puml`; ledger `t1.4-forecaster-not-holt`, `t1.4-one-sidecar`.

- [ ] B1-B5. §3.3.3 đúng 2 UC-ML (tham chiếu hình). §3.3.4 bảng đặc tả 6 UC tiêu biểu (Đăng ký, Đặt hàng, Thanh toán Stripe, Theo dõi GHN, **Định giá động/gợi ý giá**, Dự báo) — precondition/postcondition/basic flow/exception.
- [ ] **Verify checklist:** 2 UC AI; bảng đặc tả không UC recommender; resolve service paths.
- [ ] Commit `task(T2.15): §3.3.3-§3.3.4`.

### Task T2.16: §3.3.5 Tuần tự (mô tả 9 SD) + §3.3.6 Hoạt động (mô tả 4 AD)

**Nguồn:** dany.md L293-333; diagram SD-01..06, SD-ML-01..03, AD-01,02, AD-ML-01,02 (đã tạo T2.3d/e/f).

- [ ] B1-B5. Prose mô tả từng SD/AD, chèn tham chiếu hình `.puml` tương ứng. §3.3.5 "3 biểu đồ AI" (không 5); §3.3.6 AD-ML-01 LSTM + AD-ML-02 DDQN+Safety.
- [ ] **Verify checklist:** số SD/AD khớp diagram; 0 SD/AD recommender/Holt; resolve citation.
- [ ] Commit `task(T2.16): §3.3.5-§3.3.6`.

### Task T2.17 ⭐ (2-lớp AI/ML): §3.3.7(a) Dự báo nhu cầu

**Nguồn:** dany.md L335-349; ledger `t0.2-forecaster-arch`, `t0.4-forecaster-parity`, `t0.10-thesis-limitations`.

- [ ] B1-B5. ForecasterLSTM kiến trúc thật (obs_dim=10, hidden=128, 2 lớp, cat_embed, dual-head) + luồng serve + **GIỚI HẠN serve tile-21× steady-state (KHÔNG layout mismatch — đã retrain)**.
- [ ] **Verify checklist:** obs_dim=**10**; giới hạn = tile-21× (resolve main.py:135); KHÔNG "obs_dim=11/pad index2/layout 11≠10".
- [ ] Commit `task(T2.17): §3.3.7a Dự báo`.

### Task T2.18 ⭐ (2-lớp AI/ML): §3.3.7(b) Định giá động

**Nguồn:** dany.md L351-379; ledger `t0.2-ddqn-arch`, `t0.2-action-space`, `t0.3-obs-parity`, `t1.8-ddqn-hyperparams`, `t1.4-safety-5-rules`.

- [ ] B1-B5. State 10 chiều + 11 action + SharedMLPDuelingQNet + cat_embed + **bảng hyperparam thật** (buffer=50k, batch=256, warmup=1k, ε1.0→0.05 decay2000, target_sync=500, lr=1e-4, γ=0.99) + **Safety Layer 5 rule thứ tự 3→4→1→2→5** (giá trị chính xác safety.py).
- [ ] **Verify checklist:** hyperparam resolve agent.py:31-35/train.py:12-15; 5 rule resolve safety.py:6/8-10/12-13/15-16/18-19; thứ tự đúng.
- [ ] Commit `task(T2.18): §3.3.7b Định giá`.

### Task T2.19 ⭐ (2-lớp AI/ML): §3.3.7(c) Phân loại độ tươi

**Nguồn:** dany.md L381-395; ledger `t0.6-coreml-freshness`, `t0.9-fixes`, `t1.4-freshness-coreml`, `t0.10-thesis-limitations`.

- [ ] B1-B5. 2 model fruit/root, 299×299 feed RGB, predict target/targetProbability, score=P(fresh)→DDQN, endpoint /freshness/classify + **GIỚI HẠN 2/4 model**.
- [ ] **Verify checklist:** resolve main.py:316-333; giới hạn 2/4; feed RGB đúng.
- [ ] Commit `task(T2.19): §3.3.7c Phân loại tươi`.

### Task T2.20 ⭐ (2-lớp CSDL): §3.4.1 ERD + §3.4.2 Chi tiết 10 collection

**Nguồn:** dany.md L397-447; diagram `erd.puml`; ledger `t1.11-schema-detail`, `t1.4-collections`.

- [ ] B1-B5. Prose mô tả ERD (tham chiếu `erd.puml`) + bảng chi tiết 10 collection (8 nghiệp vụ + 2 AI), field thật. Nhấn: freshness_cache readings[{score,scannedAt}]+medianScore (không scores[5]/label); users location embedded (không addresses[]); price_overrides 5-status enum.
- [ ] **Verify checklist:** đúng 10 collection; field resolve về 10 schema file; 0 recommendation_caches/forecast_caches.
- [ ] Commit `task(T2.20): §3.4.1-§3.4.2 CSDL`.

### Task T2.21 ⭐ (2-lớp CSDL): §3.4.3 Chỉ mục và tối ưu

**Nguồn:** dany.md L449-477; ledger `t1.11-schema-detail`.

- [ ] B1-B5. Bảng index thật: 2dsphere(farms), 3 TTL(freshness_cache/price_overrides/verification_tokens), unique(freshness_cache.productId), compound(price_overrides productId+status, notifications userId+createdAt, verification_tokens userId+type), orders 3 single index (KHÔNG compound 3-field), 3 text index. + Embedded Snapshot OrderItem.
- [ ] **Verify checklist:** mỗi index resolve schema-file:Lxx; orders 3 single (không compound 3-field); 3 TTL đúng.
- [ ] Commit `task(T2.21): §3.4.3 Index`.

### Task T2.22: §3.5 Giao diện chức năng (3.5.1-3.5.3)

**Nguồn:** dany.md L479-485; ledger `t1.4-no-recommender`, `t1.15-numbers`, `t2.2-frontend-routes`.

- [ ] B1-B5. Consumer (Home query thường/Chi tiết nhãn tươi+giá động/Giỏ/Checkout/Tracking — KHÔNG For-You/cross-sell), Farm (Dashboard dự báo★/Quét tươi★/Gợi ý giá★/CRUD/Thống kê), Admin (Shadow Report★).
- [ ] **Verify checklist:** 0 ForYou/sản phẩm tương tự/cross-sell; Farm camera/gợi ý giá GIỮ (thật).
- [ ] Commit `task(T2.22): §3.5 Giao diện`.

---

## CHƯƠNG 4 — TRIỂN KHAI THỰC NGHIỆM (file: chuong-4-trien-khai-thuc-nghiem.md)

### Task T2.23: §4.1 Môi trường + §4.2 Cài đặt triển khai (4.2.1-4.2.3)

**Nguồn:** dany.md L487-523; ledger `t2.2-tech-versions`, `t2.2-seed`, `t1.4-one-sidecar`, `t1.4-interceptor-cron`.

- [ ] B1-B5. §4.1 bảng phần cứng/phần mềm/thư viện (AI/ML: PyTorch+coremltools, KHÔNG sklearn-recommender/statsmodels-Holt); trình tự khởi động Mongo→1 sidecar→NestJS→Expo. §4.2.1 13 module + 1 sidecar; §4.2.2 Interceptor+PricingTickCron+vòng đời PriceOverride 5 trạng thái; §4.2.3 seed accounts (số thật từ ledger t2.2-seed).
- [ ] **Verify checklist:** 13 module/1 sidecar; cron "0 * * * *" (cron:18); seed số đúng.
- [ ] Commit `task(T2.23): §4.1-§4.2`.

### Task T2.24: §4.3 Kiểm thử

**Nguồn:** dany.md L525-533; ledger `t1.15-numbers`.

- [ ] B1-B5. 54/54 test (54 case/21 spec), bảng test theo module, Stripe webhook/GHN cases. "Build TypeScript thành công" (KHÔNG cam kết "0 lỗi" tuyệt đối — chưa chạy tsc, theo ledger t1.15).
- [ ] **Verify checklist:** 54/54 đúng; không overclaim "0 lỗi TS".
- [ ] Commit `task(T2.24): §4.3 Kiểm thử`.

### Task T2.25: §4.4.1 Đánh giá chức năng tổng quan + §4.4.5 Demo

**Nguồn:** dany.md L537-541, L601-603; ledger `t1.15-numbers`, `t1.4-collections`.

- [ ] B1-B5. §4.4.1 bảng 13 module×trạng thái, ≈79 endpoint, 10 collection, ≈48 màn hình. §4.4.5 Demo 8 screenshot (placeholder hình + caption thật, KHÔNG ForYou/cross-sell).
- [ ] **Verify checklist:** số liệu khớp ledger; demo caption 0 recommender.
- [ ] Commit `task(T2.25): §4.4.1+§4.4.5`.

### Task T2.26 ⭐ (2-lớp AI/ML): §4.4.2 Đánh giá dự báo nhu cầu

**Nguồn:** dany.md L543-555; ledger `t0.2-forecaster-arch`, `t0.4-forecaster-parity`, `t0.10-thesis-limitations`.

- [ ] B1-B5. Eval offline eval.py (MAE/day compute_demand_mae, AUROC compute_waste_auroc, baseline Naive, per-category) + **GIỚI HẠN: số serve tile-21× không tin, dùng offline eval**. KHÔNG bịa số MAE/AUROC cụ thể (chưa chạy eval) — trình bày phương pháp + bảng khung.
- [ ] **Verify checklist:** resolve eval.py:12/18/28-85; giới hạn tile-21× obs_dim=10; không số bịa.
- [ ] Commit `task(T2.26): §4.4.2 Eval dự báo`.

### Task T2.27 ⭐ (2-lớp AI/ML): §4.4.3 Đánh giá định giá động

**Nguồn:** dany.md L557-587; ledger `t0.2-action-space`, `t1.4-safety-5-rules`.

- [ ] B1-B5. Phân bố delta_pct (11 action), safety clip rate, simulated revenue+waste (market_env EPISODE_LEN=91), Safety 5 rule, so sánh 3 paper thật (Nassibi 2023/Xue 2025/Kayikci 2022 — giữ, đánh dấu [TLTK]). KHÔNG bịa số doanh thu cụ thể — phương pháp + khung.
- [ ] **Verify checklist:** resolve market_env.py:79-81/99/146-158, safety.py; paper là TLTK; không số bịa.
- [ ] Commit `task(T2.27): §4.4.3 Eval định giá`.

### Task T2.28 ⭐ (2-lớp AI/ML): §4.4.4 Đánh giá phân loại độ tươi

**Nguồn:** dany.md L589-599; ledger `t0.6-coreml-freshness`, `t0.10-thesis-limitations`.

- [ ] B1-B5. 2 model nhị phân, Confusion Matrix **2×2** (BỎ 4×4), accuracy/precision/recall/F1 nhị phân, inference time + **GIỚI HẠN 2/4 model + không dataset tự thu thập**.
- [ ] **Verify checklist:** 2×2 (không 4×4); 2/4 model; resolve main.py:316-333; không số bịa.
- [ ] Commit `task(T2.28): §4.4.4 Eval tươi`.

---

## CHƯƠNG 5 + TLTK

### Task T2.29 ⭐ (2-lớp — chứa 3 giới hạn bắt buộc): §5.1 Kết luận + §5.2 Hạn chế + §5.3 Hướng phát triển

**Nguồn:** dany.md L605-659; ledger `t0.10-thesis-limitations`, `t1.4-*`, `t1.15-numbers`.

- [ ] B1-B5. §5.1 số liệu (13/54/≈48/1 sidecar) + 6 ĐG thật. §5.2 hạn chế thật + **3 GIỚI HẠN BẮT BUỘC trạng thái MỚI** (a tile-21× obs_dim=10 / b dow<6.2% / c freshness 2/4). §5.3 hướng phát triển (gồm "khắc phục forecaster serve chuỗi thật"; "bổ sung recommender là TƯƠNG LAI — chưa có").
- [ ] **Verify checklist:** `grep -c "HẠN CHẾ BẮT BUỘC"` ≥3; giới hạn (a) = tile-21× obs_dim=10 (KHÔNG layout mismatch); recommender = future không overclaim; 6 ĐG thật.
- [ ] Commit `task(T2.29): Chương 5`.

### Task T2.30: TÀI LIỆU THAM KHẢO (IEEE) + hoàn thiện mục lục

**Nguồn:** dany.md L661; toàn bộ marker `[TLTK]` rải trong các chương.

- [ ] B1-B5. Gom mọi nguồn ngoài ([TLTK]: FAO, e-Conomy SEA 2023, 3 paper định giá, React Native/NestJS/MongoDB docs…) thành danh mục IEEE đánh số. Cập nhật `00-trang-bia-muc-luc.md` mục lục từ heading thật của 5 chương.
- [ ] **Verify checklist:** mọi [TLTK] inline có entry IEEE; mục lục khớp heading.
- [ ] Commit `task(T2.30): TLTK + mục lục`.

---

## VERIFY CUỐI

### Task T2.V: Verify toàn văn độc lập (gate cuối)

**Verifier:** controller/agent KHÁC mọi implementer. Đối kháng.

- [ ] **V1 — Citation resolve sweep:** trích mẫu ≥2 citation/chương kỹ thuật, mở file tại Lxx, xác nhận resolve. AI/ML + CSDL + diagram: resolve **toàn bộ** câu kỹ thuật.
- [ ] **V2 — False-claim sweep:** `grep -riE 'recommend|cross-sell|for-you|itemitem|collaborative|content-based|cosine|tf-idf|holt|ewma|mobilenetv2|4-class|confusion matrix 4|recommendation_cache|forecast_cache|8001|8002|3 sidecar|14 module|obs_dim.?11|layout.*11|5-dim|5 action'` trên `docs/thesis/final/` → 0 claim khẳng định sai (chỉ còn phủ định trung thực/ledger-id).
- [ ] **V3 — 3 giới hạn bắt buộc:** xác nhận §5.2 có đủ 3, trạng thái MỚI (a tile-21× obs_dim=10).
- [ ] **V4 — Outline bảo toàn:** đối chiếu STRUCTURE.md ↔ heading thật 5 file chương: đủ mục, đúng thứ tự.
- [ ] **V5 — Diagram bám code:** mỗi `.puml` resolve về ledger/code (đặc biệt ERD 10 entity, 2 UC-ML, 3 SD-ML).
- [ ] **V6 — Report:** ghi `docs/thesis/final/VERIFY-REPORT.md` (PASS/FAIL + bằng chứng). PASS → cập nhật `.handoff/STATE.md` "Task 2 DONE", task-tree, commit `task(T2.V): verify toàn văn PASS — Task 2 DONE`.

**Done Task 2:** đủ prose 5 chương + TLTK + diagram + VERIFY-REPORT PASS + STATE cập nhật.

---

## Self-Review (đã chạy)

**1. Spec coverage:** Mọi mục dany.outline.md (5 chương §x.y/§x.y.z) ánh xạ vào T2.4–T2.30; diagram (ERD/usecase/sequence/activity + business process + network) vào T2.3a–g; fact-pack vào T2.2; skeleton T2.1; verify T2.V. ✅
**2. Placeholder scan:** Không "TODO/TBD"; mỗi task nêu nguồn dany.md dòng + ledger id + verify checklist cụ thể. (Prose thật do executor viết — đúng bản chất writing plan.) ✅
**3. Type consistency:** Tên ledger id, file path, số liệu (obs_dim=10, 11 action, 13 module, 54 test, 10 collection, 2 CoreML, 1 sidecar) đồng nhất toàn plan; 3 giới hạn dùng trạng thái post-retrain nhất quán. ✅
```
