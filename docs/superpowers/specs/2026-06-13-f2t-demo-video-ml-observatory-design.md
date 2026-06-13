# F2T — Video demo luận văn + Live ML Observatory

> Spec ngày 2026-06-13. Branch: `feature/f2t-thesis-merge-main`.
> Mục tiêu: sản xuất video demo cho buổi bảo vệ luận văn, kèm bộ công cụ
> quan sát live 2 sidecar AI/ML để làm phần "phụ lục kỹ thuật" của video.

## 1. Mục tiêu & nguyên tắc

- **Đối tượng**: hội đồng bảo vệ luận văn.
- **Định dạng**: video ~6 phút, voiceover tiếng Việt thu sẵn theo timestamp.
- **Cấu trúc**: 2 phần — (1) Tour sản phẩm ngắn (~2.5 phút), (2) Live ML
  Observatory (~3.5 phút) là phần trọng tâm.
- **Nguyên tắc tối thượng — TRUNG THỰC 100% VỚI CODE.** Không dựng màn hình
  hay số liệu ML giả. Mọi thứ lên hình phải là dữ liệu thật chạy ra từ model,
  show đúng mức năng lực thật và **nêu rõ giới hạn**:
  - Freshness: chỉ 2/4 model CoreML (fruit, root — KHÔNG có leafy, herbs).
  - Cross-sell: FP-Growth **category-level**, không phải item-level.
  - Delivery: Dijkstra là **fallback demo** (không có `GHN_TOKEN`).
  - Stripe: chỉ backend + WebView.
  - Forecaster serve tile-21× steady-state, obs_dim 10→12 (xem §5.2 thesis).
- **Cắt bỏ** mọi tính năng "app nào cũng có" khỏi video: login/register/
  profile/CRUD cơ bản. Chỉ giữ cảnh đặc thù marketplace nông sản + 4 AI function.

## 2. Hiện trạng đã verify (nền tảng của spec)

### Pricing sidecar `:8000` (`pricing-sidecar/main.py`)
- `POST /predict` — input `state_vectors[]` (productId, category, freshness,
  inventory_ratio, base_price, competitor_ref_price, days_to_restock,
  prev_delta, demand_7d); pipeline: `_build_obs` → (nếu `USE_FORECASTER_OBS`)
  nối `[d_hat, p_waste]` thành obs_dim 12 → DDQN `argmax` action → `delta` từ
  `CANDIDATES` → `apply_safety` clip → output `overrides[]`
  {targetPrice, delta_pct, safety_clipped, freshness_tag}.
- `POST /forecast` — {productId, demand7d, pWaste}.
- `POST /freshness/classify` — {score, tag, label, confidence}.
- `GET /health` — {status, model, ddqn_loaded, forecaster_loaded, coreml_loaded}.
- Hằng số: `CATEGORIES = ["leafy","root","fruit","herbs"]`, `DDQN_OBS_DIM=12`,
  `CANDIDATES` từ reward module.

### Recommender sidecar `:8001` (`recommender-sidecar/main.py`)
- `POST /recommend` — input {cart_categories[], top_k=5}; pipeline: cộng `lift`
  của các rule FP-Growth khớp antecedent → rank top_k → nếu rỗng rơi về
  `category_popularity`; output `recommendations[]` {category, score, source:
  rule|fallback}.
- `GET /health` — {status, model_version, n_rules}.
- Artifact thật tồn tại: `recommender-final/model/category_rules.json` (~4KB),
  `category_popularity.json`.

### Backend tích hợp (đã có)
- Interceptor gắn `dynamicPrice` / `priceTag` / `freshnessScore` vào product
  response → giá hiển thị trên app là giá model thật.

## 3. Kịch bản video

### Phần 1 — Tour sản phẩm (~2.5 phút)
| # | Cảnh | Điểm nhấn |
|---|---|---|
| 1 | Farm gần bạn | Geospatial `$geoNear`; product card hiện **giá động + tag tươi** (field thật) |
| 2 | Thêm vào giỏ | **Cross-sell gợi ý mua kèm** (category-level) |
| 3 | Checkout | Lướt nhanh: phí ship (Dijkstra fallback) → **Stripe WebView** → đơn + theo dõi |
| 4 | Nông dân | **Quét tươi (fruit/root)** → **gợi ý giá từ RL** |
| 5 | Admin | Verify farm + analytics (~10s lướt) |

### Phần 2 — Live ML Observatory (~3.5 phút) ⭐
- Bố cục quay: **app trên điện thoại bên cạnh dashboard trên màn hình**.
- Thao tác trên app (xem sản phẩm, thêm giỏ) → dashboard **stream live**
  request/response của 2 sidecar (live-tail traffic thật).
- **Pricing panel**: obs vector vào → action DQN chọn → `delta_pct`,
  `safety_clipped`, `freshness_tag`. Voiceover nêu giới hạn tile-21×, obs_dim 12.
- **Recommender panel**: rule FP-Growth nào fire + `lift`, hay `source=fallback`.
  Voiceover nêu rõ category-level.
- **Probe thủ công**: chỉnh tay freshness/inventory trên dashboard → giá đổi
  theo → chứng minh model phản ứng thật (không phải clip dựng sẵn).

## 4. Thành phần build

### 4.1 Instrument 2 sidecar (read-only, KHÔNG đổi contract hiện có)
- Module event-bus dùng chung (hoặc copy nhỏ ở mỗi sidecar): ring-buffer
  in-memory (`collections.deque(maxlen=N)`) lưu các event gần nhất.
- Trong `predict()` / `recommend()` / `forecast()` / `classify()`: sau khi tính
  xong, push 1 event chứa **request tóm tắt + giá trị nội bộ tính được thật**
  (pricing: obs vector, action_idx, delta, các field override; recommender:
  rules fired + lift + source). KHÔNG thay đổi response trả về client.
- Endpoint mới `GET /_events`:
  - Chế độ stream SSE (`text/event-stream`) là chính; kèm fallback polling
    `GET /_events?since=<seq>` trả JSON cho client không dùng SSE (Streamlit).
- Bật `CORSMiddleware` (chỉ dev; `allow_origins` từ env, mặc định `*` local)
  để web dashboard khác origin gọi được.
- Các thay đổi nằm gọn trong file sidecar; có test smoke cho `/_events` và
  test khẳng định response `/predict`,`/recommend` **byte-identical** trước/sau
  instrument (bảo toàn contract).

### 4.2 Dashboard A — Web standalone (`ml-observatory/`)
- Vite + React (hoặc vanilla nếu đủ) — 1 trang, 2 panel (Pricing / Recommender).
- Live-tail: kết nối SSE `/_events` của cả 2 sidecar, render dòng event mới
  nhất (timeline) + chi tiết event đang chọn (obs, action, delta / rules, lift).
- Probe: form gửi `/predict` (chỉnh category, freshness, inventory,
  base_price...) và `/recommend` (chọn cart_categories), hiện full I/O.
- Health badge cho mỗi sidecar (poll `/health`).

### 4.3 Dashboard B — Streamlit (`ml-observatory-streamlit/`)
- `app.py` Streamlit, cùng năng lực: live-tail (poll `GET /_events?since=`),
  probe `/predict` + `/recommend`, health.
- Trực quan ML đậm chất khoa học: bar chart delta theo action, bảng rules + lift.

> Lý do build cả A và B: prototype song song để chọn cái lên hình đẹp/ổn hơn
> cho video. Cả hai dùng chung instrumentation §4.1.

### 4.4 Tài liệu giao kèm
- **Kịch bản + storyboard**: file Markdown — từng cảnh, lời voiceover tiếng Việt
  theo timestamp, ghi chú thao tác màn hình.
- **Checklist demo-ready**: lệnh chạy backend (`:3000`) + pricing sidecar
  (`:8000`) + recommender sidecar (`:8001`) + frontend Expo + 2 dashboard;
  verify seed; tài khoản demo từng vai (consumer/farm/admin).
- **Hướng dẫn quay/dựng**: công cụ screen record (macOS QuickTime / iPhone
  mirroring), bố cục side-by-side, đè voiceover, phụ đề.

## 5. Rủi ro & việc cần verify khi thực thi
- **Freshness scan** cần camera + có thể cần **dev build** cho CoreML (Expo Go /
  Simulator không có camera). Fallback: quay iPhone thật, hoặc demo classify
  qua ảnh chụp sẵn (`/freshness/classify` nhận base64). Verify sớm.
- **Recommender** chỉ ra rule có nghĩa nếu `category_rules.json` có rule khớp
  cart; nếu không sẽ ra `source=fallback` — vẫn hợp lệ nhưng cần seed cart hợp lý.
- **Seed data** phải đủ để giá động & cross-sell ra kết quả có nghĩa khi quay.
- **SSE qua mạng LAN**: nếu quay app trên thiết bị thật, dashboard và sidecar
  phải cùng mạng; dùng IP LAN, không `localhost`.

## 6. Phi mục tiêu (YAGNI)
- KHÔNG dựng tính năng mới trong app RN cho thesis (dashboard là công cụ demo,
  tách rời, không đưa vào phạm vi luận văn → tránh overclaim).
- KHÔNG đổi contract `/predict` `/recommend` `/forecast`.
- KHÔNG thu âm hộ — chỉ giao script; người làm tự thu hoặc dùng TTS.
- KHÔNG tự dựng/encode video — chỉ giao script + hướng dẫn.

## 7. Tiêu chí hoàn thành
- 2 sidecar có `/_events` (SSE + polling) + CORS; test contract-bảo-toàn PASS.
- Dashboard A và B đều: live-tail traffic app thật + probe thủ công + health.
- Có script video đầy đủ (2 phần, voiceover timestamp tiếng Việt).
- Có checklist demo-ready chạy được end-to-end + hướng dẫn quay/dựng.
