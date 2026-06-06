**CHƯƠNG 1. GIỚI THIỆU (~5 trang)**

**1.1. Sự cần thiết của bài toán (~1 trang)**

- Bối cảnh: \>60% dân số VN liên quan nông nghiệp, chuỗi cung ứng qua 4-5 trung gian

- Vấn đề 1: Trung gian → tăng giá 30-50%, nông dân bị ép giá

- Vấn đề 2: Vận chuyển dài → mất 25-30% độ tươi sau thu hoạch (trích FAO)

- Vấn đề 3: Không có công cụ dự báo → nông dân không biết trồng gì, bao nhiêu

- Cơ hội: TMĐT di động VN tăng trưởng 18%/năm (e-Conomy SEA 2023) + AI/ML dễ tiếp cận

- Kết luận: Cần 1 nền tảng kết nối trực tiếp Farm↔Consumer, tích hợp AI hỗ trợ quyết định

**1.2. Mục tiêu nghiên cứu (~0.5 trang)**

- MT1: Xây dựng app mobile đa nền tảng (React Native + Expo) kết nối 3 vai trò: Consumer, Farm, Admin

- MT2: Backend NestJS + MongoDB với 13 module nghiệp vụ, tích hợp Stripe và GHN [ref: f2t-backend/src/modules/ — 13 thư mục: admin, auth, delivery, demand-forecasting, dynamic-pricing, farms, notifications, orders, payments, posts, products, uploads, users]

- MT3: Dự báo nhu cầu bằng ForecasterLSTM (LSTM 2 lớp, window=21, output demand + waste_logit) [ref: dynamic-pricing-final/src/forecaster/model.py:18-49; ledger t1.4-forecaster-not-holt, t0.2-forecaster-arch]

- MT4: Định giá động (DDQN đa-category SharedMLPDuelingQNet, Safety Layer 5 quy tắc, chế độ advisory) [ref: dynamic-pricing-final/src/rl/network.py:51-57; pricing-sidecar/safety.py:1-19; ledger t1.4-safety-5-rules]

- MT5: Phân loại độ tươi sản phẩm từ ảnh bằng 2 model CoreML (fruit/root), nhị phân fresh/rotten, phục vụ qua pricing-sidecar [ref: pricing-sidecar/main.py:316-318; freshnessmodels/MyFreshnessClassifier-fruit.mlmodel; ledger t1.4-freshness-coreml, t0.6]

- MT6: Kiểm thử đạt ≥95% unit test pass (thực tế: 54/54 test case trong 21 file spec) [ref: ledger t1.15-numbers]

**1.3. Phạm vi nghiên cứu (~0.5 trang)**

- Bao gồm: app mobile (iOS/Android), backend REST API, 3 sidecar FastAPI

- Không bao gồm: xác thực email/SMS, web client, chế độ định giá "live"

**1.4. Phương pháp tiếp cận (~0.5 trang)**

- Agile/Scrum: Sprint 2-4 tuần

- Thiết kế hướng đối tượng (UML)

- Transfer Learning cho model ảnh

- Unit test Jest + mongodb-memory-server

**1.5. Đóng góp của khóa luận (~1.5 trang)**

- ★ ĐG1: Kiến trúc Monolith + 1 Sidecar (pricing-sidecar) — tách AI Python ra khỏi Node.js thành 1 FastAPI sidecar duy nhất (port 8000, 3 endpoint: /predict, /forecast, /freshness/classify), graceful degradation khi sidecar không phản hồi [ref: f2t-backend/src/common/interceptors/dynamic-pricing.interceptor.ts:9; ledger t1.4-one-sidecar]

- ★ ĐG2: Tích hợp giá AI tự động qua DynamicPricingInterceptor — NestJS APP_INTERCEPTOR chặn /products response và nhúng dynamicPrice + freshnessScore + priceTag mà không cần sửa controller [ref: f2t-backend/src/common/interceptors/dynamic-pricing.interceptor.ts:16-18; ledger t1.4-interceptor-cron]

- ★ ĐG3: Dự báo nhu cầu bằng ForecasterLSTM — LSTM 2 lớp, window=21, output demand + waste_logit, phục vụ qua pricing-sidecar /forecast [ref: dynamic-pricing-final/src/forecaster/model.py:18-49; ledger t1.4-forecaster-not-holt, t0.2-forecaster-arch]

- ★ ĐG4: Định giá động (DDQN SharedMLPDuelingQNet đa-category + Safety Layer 5 quy tắc + advisory mode) — obs 10 chiều, 11 hành động CANDIDATES ∈ [-0.30, +0.20] [ref: dynamic-pricing-final/src/rl/network.py:51-57; pricing-sidecar/safety.py:1-19; ledger t1.4-safety-5-rules, t1.4-ddqn-dims]

- ★ ĐG5: Phân loại độ tươi bằng 2 model CoreML (fruit/root), nhị phân fresh/rotten, phục vụ qua pricing-sidecar /freshness/classify; non-fruit category fallback về root model [ref: pricing-sidecar/main.py:316-318; freshnessmodels/MyFreshnessClassifier-fruit.mlmodel; ledger t1.4-freshness-coreml, t0.6]

- ★ ĐG6: Tích hợp end-to-end (Dijkstra fallback giao hàng khi GHN không khả dụng, Embedded Snapshot giá vào orders chống sai giá lịch sử) [ref: f2t-backend/src/modules/delivery/delivery.service.ts; f2t-backend/src/modules/orders/schemas/order.schema.ts:105; ledger t1.4-interceptor-cron]

- Kèm: Bản đồ đóng góp (contribution map) — sơ đồ 1 trang thể hiện 6 đóng góp nằm ở đâu trong hệ thống

**1.6. Cấu trúc khóa luận (~0.5 trang)**

- Mô tả ngắn nội dung 5 chương

**CHƯƠNG 2. CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ LIÊN QUAN (~12 trang)**

**2.1. Tổng quan lý thuyết cơ sở (~2 trang)**

*2.1.1. Thương mại điện tử nông sản và mô hình Farm-to-Table*

- Khái niệm TMĐT nông sản

- Mô hình F2T: bỏ trung gian

- Xu hướng tại VN

*2.1.2. Trí tuệ nhân tạo trong thương mại điện tử*

- 4 ứng dụng chính: gợi ý, dự báo, định giá, nhận diện ảnh

- Ví dụ thực tế: Amazon, Shopee

*2.1.3. Quản lý dự án với Agile/Scrum*

- Sprint, Product Backlog, Sprint Planning, Daily Standup

- Áp dụng F2T: mỗi Sprint = 1 module

**2.2. Kiến trúc hệ thống (~2 trang)**

*2.2.1. So sánh Monolithic vs Microservices vs Sidecar*

- Bảng so sánh 5 tiêu chí

- tự lập luận: Monolith quá đơn giản (không chạy Python AI), Microservices quá phức tạp (1 người) → Monolith+Sidecar là cân bằng

*2.2.2. Kiến trúc REST API và giao tiếp giữa các dịch vụ*

- HTTP JSON, NestJS ↔ FastAPI sidecars

**2.3. Công nghệ và công cụ phát triển (~3 trang)**

*2.3.1. Frontend: React Native + Expo*

- React Native là gì, tại sao không Flutter

- Expo SDK 53: Expo Router, NativeWind, MMKV, Zustand

*2.3.2. Backend: NestJS + Node.js*

- NestJS vs Express.js

- Pattern: DI, Guards, Interceptors, Pipes

- Tại sao TypeScript

*2.3.3. Cơ sở dữ liệu: MongoDB*

- NoSQL vs SQL cho e-commerce

- Mongoose ODM, Embedded Documents

*2.3.4. AI/ML Sidecar: FastAPI + Python*

- FastAPI vs Flask (ASGI nhanh hơn)

- Pydantic validation, Lifespan load model 1 lần

*2.3.5. Tích hợp bên thứ ba*

- Stripe: Checkout Sessions + Webhook

- GHN: tạo vận đơn API + Dijkstra fallback

**2.4. Nền tảng lý thuyết AI/ML (~4 trang)**

*2.4.1. Dự báo chuỗi thời gian với LSTM*

- Bài toán chuỗi thời gian: dự báo nhu cầu ngắn hạn (7 ngày) từ cửa sổ lịch sử 21 bước [ref: dynamic-pricing-final/src/forecaster/model.py:L9-10]

- LSTM (Long Short-Term Memory): kiến trúc RNN có cell state + 3 gate (input, forget, output) — khắc phục vanishing gradient của RNN thường [ref: dynamic-pricing-final/src/forecaster/model.py:L23-29]

- Kiến trúc ForecasterLSTM: input_size=obs_dim, hidden=128, 2 lớp LSTM chồng, dropout=0.2 giữa các lớp; category embedding (n_cats=4, embed_dim=8) nối với output LSTM trước khi vào head [ref: dynamic-pricing-final/src/forecaster/model.py:L22-31]

- Hai đầu ra (dual-head): `demand_head` (Linear → demand dự báo) và `waste_head` (Linear→ReLU→Dropout→Linear → logit xác suất hỏng) — hai mục tiêu song song từ cùng biểu diễn ẩn [ref: dynamic-pricing-final/src/forecaster/model.py:L31-37, L46-49]

- Window=21 bước; obs_dim=11 (checkpoint v4); mỗi bước = vector đặc trưng tổng hợp của sản phẩm trong môi trường giả lập [ref: dynamic-pricing-final/src/forecaster/model.py:L9-15, ledger t0.4-forecaster-parity]

*2.4.2. Học tăng cường và DDQN*

- RL cơ bản: Agent, State, Action, Reward; Q-function Q(s,a) = phần thưởng kỳ vọng tích lũy [ref: ledger t0.2-ddqn-arch]

- Q-Learning → DQN (xấp xỉ Q bằng mạng neuron, Experience Replay) → Double DQN: tách chọn hành động (online net) và đánh giá giá trị (target net) — giảm overestimation bias [ref: dynamic-pricing-final/src/rl/network.py:L7-39]

- Dueling DQN: tách nhánh Value V(s) và Advantage A(s,a); Q = V + A − mean(A) — ổn định hơn khi nhiều action tương đương [ref: dynamic-pricing-final/src/rl/network.py:L61-78]

- Áp dụng cho định giá: state = 10 chiều [freshness, inv_ratio, sin_dow, cos_dow, days_to_restock, demand_ratio, prev_delta, comp_ratio, days_to_waste, inv_coverage]; 11 hành động CANDIDATES = linspace(−0.30, 0.20, 11) bước 0.05 [ref: dynamic-pricing-final/src/rl/reward.py:L6-7, pricing-sidecar/main.py:L114-125, ledger t0.2-action-space, t1.4-ddqn-dims]

- Mạng SharedMLPDuelingQNet: dùng chung cho 4 category qua category embedding (n_cats=4, embed_dim=8); shared MLP Linear(obs_dim+8, 128) + ReLU; V-head và A-head mỗi cái 128→64→1/n_actions; action masking theo freshness/category [ref: dynamic-pricing-final/src/rl/network.py:L51-81, ledger t0.2-ddqn-arch]

*2.4.3. Phân loại ảnh và CoreML*

- Transfer Learning: dùng lại mạng CNN pretrained (ImageNet) làm feature extractor — tiết kiệm dữ liệu và thời gian huấn luyện; chỉ thay lớp phân loại cuối cho bài toán mới [ref: ledger t1.4-freshness-coreml]

- CNN và kiến trúc nhẹ cho thiết bị di động: mạng tích chập trích đặc trưng không gian (spatial features) từ ảnh; các biến thể nhẹ (MobileNet, SqueezeNet) phù hợp inference trên thiết bị edge [ref: ledger t0.6-coreml-freshness]

- Apple CoreML (Create ML): framework on-device inference cho iOS/macOS; model đóng gói dạng .mlmodel, predict qua API `model.predict({"image": img})`; ảnh resize 299×299. Lưu ý: model khai báo colorSpace=BGR nhưng sidecar feed RGB (`.convert("RGB")`) — đã xác minh đây là cách feed đúng (coremltools không hoán kênh) [ref: pricing-sidecar/main.py:L324, ledger t0.9-fixes, t0.6-coreml-freshness]

- Áp dụng trong F2T: 2 model CoreML nhị phân (fresh/rotten) — `MyFreshnessClassifier-fruit.mlmodel` (cho category fruit) và `MyFreshnessClassifier-root.mlmodel` (cho root/leafy/herbs); output gồm `target` (string "fresh"/"rotten") + `targetProbability` (dict xác suất); score = fresh probability [ref: pricing-sidecar/main.py:L318-333, ledger t0.6-coreml-freshness, t1.4-freshness-coreml]

**2.5. Các hệ thống tương tự (~1 trang)**

- Foodmap: ưu/nhược

- Sendo Farm: ưu/nhược

- Bac Tom: ưu/nhược

- Lazada Fresh: ưu/nhược

- Bảng so sánh: chức năng, thanh toán, AI/ML, đối tượng

- ★ Kết luận: chưa hệ thống nào tích hợp gợi ý + dự báo + định giá + phân loại tươi cho nông sản nhỏ

**2.6. Nhận xét và định hướng giải pháp (~0.5 trang)**

- Hạn chế hệ thống hiện có → F2T định hướng: mobile-first, AI trong luồng mua hàng, advisory pricing

------------------------------------------------------------------------

**CHƯƠNG 3. PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG (~25 trang)**

**3.1. Mô tả quy trình nghiệp vụ (~2 trang)**

*3.1.1. Quy trình hiện tại (thủ công)*

- Nông dân → Thương lái → Chợ đầu mối → Cửa hàng → Người tiêu dùng

- Sơ đồ 5 bước

- 4 vấn đề: ép giá, mất tươi, không truy xuất nguồn gốc, không dự báo

*3.1.2. Quy trình đề xuất (F2T)*

- Farm đăng ký → Admin duyệt → Farm đăng sản phẩm → Consumer tìm kiếm → Đặt hàng → Thanh toán Stripe → Giao hàng GHN → Đánh giá

- ★ Luồng AI đan xen: Consumer mở app → API trả sản phẩm KÈM gợi ý + nhãn tươi + giá động. Farm mở dashboard → thấy dự báo + gợi ý giá

*3.1.3. 3 tác nhân hệ thống*

- Consumer: duyệt, mua, thanh toán, tracking, đánh giá

- Farm Owner: đăng sản phẩm, chụp ảnh tươi, xem dự báo, chấp nhận/từ chối giá

- Admin: duyệt farm, quản lý đơn, quản lý user, thống kê

**3.2. Phân tích, thiết kế chức năng nghiệp vụ (~3 trang)**

*3.2.1. Yêu cầu chức năng theo vai trò*

- Consumer: 8 yêu cầu (đăng ký, tìm kiếm geo, xem gợi ý, giỏ hàng, thanh toán, tracking, đánh giá, thông báo)

- Farm: 7 yêu cầu (đăng ký farm, CRUD sản phẩm, chụp ảnh tươi, xem dự báo, nhận gợi ý giá, thống kê, thông báo)

- Admin: 5 yêu cầu (duyệt farm, quản lý user, quản lý đơn, thống kê, cấu hình)

*3.2.2. Yêu cầu phi chức năng*

- Bảng 6 tiêu chí: Bảo mật (JWT, bcrypt), Hiệu năng (API \<500ms), Độ tin cậy (graceful degradation), Usability (mobile-first), Scalability (sidecar scale riêng), Maintainability (TypeScript, lint)

*3.2.3. Sơ đồ phân rã chức năng*

- Sơ đồ cây: F2T → 4 nhóm (Quản lý người dùng, E-commerce, AI/ML, Quản trị)

- Mỗi nhóm phân rã 3-5 chức năng con

**3.3. Phân tích, thiết kế kiến trúc hệ thống (~15 trang)**

*3.3.1. Kiến trúc triển khai tổng quan (~1.5 trang)*

- Sơ đồ: App ↔ NestJS (3000) ↔ MongoDB + 3 Sidecar FastAPI

  - Recommender (8001): ItemItemCF + Content-Based

  - Forecast (8002): Holt EWMA + DoW

  - Pricing (8000): DDQN + MobileNetV2

- ★ Graceful degradation: sidecar chết → NestJS fallback → trả sản phẩm mới nhất, user không thấy lỗi

*3.3.2. Biểu đồ Use Case tổng quan (~2 trang)*

- UC-01: Use case tổng quan (3 tác nhân, 7 nhóm)

- UC-02: Đặt hàng & Thanh toán

- UC-03: Quản lý sản phẩm

- UC-04: Quản lý trang trại

- UC-05: Theo dõi giao hàng

- UC-06: Quản lý Admin

*3.3.3. Biểu đồ Use Case module AI/ML (~1 trang)*

- UC-ML-01: Hệ thống gợi ý (Consumer xem For-You + Cross-sell)

- UC-ML-02: Dự báo nhu cầu (Farm xem dự báo 7 ngày)

- UC-ML-03: Định giá động (Farm chụp ảnh → nhận gợi ý giá → chấp nhận/từ chối)

- ★ SV tự thiết kế 3 UC AI tích hợp vào hệ thống TMĐT

*3.3.4. Đặc tả Use Case chi tiết (~2 trang)*

- Bảng đặc tả đầy đủ (precondition, postcondition, basic flow, exception) cho 6 UC tiêu biểu:

  - Đăng ký

  - Đặt hàng

  - Thanh toán Stripe

  - Theo dõi giao hàng

  - Gợi ý AI

  - Định giá động

*3.3.5. Biểu đồ tuần tự (~4 trang)*

E-commerce (6 biểu đồ):

- SD-01: Đăng nhập & JWT refresh

- SD-02: Đăng ký

- SD-03: Tìm kiếm theo vị trí (Geospatial 2dsphere)

- SD-04: Tạo đơn hàng (embedded snapshot giá)

- SD-05: Thanh toán Stripe Checkout + Webhook

- SD-06: Tạo vận đơn GHN + Dijkstra fallback

AI/ML (5 biểu đồ):

- SD-ML-01: Gợi ý For-You (NestJS → Sidecar 8001 → cosine similarity → trả kết quả)

- SD-ML-02: Cross-sell giỏ hàng (NestJS → Sidecar 8001 → co-occurrence → trả kết quả)

- SD-ML-03: Cron huấn luyện lại mỗi giờ

- SD-ML-04: Dự báo nhu cầu (NestJS → Sidecar 8002 → Holt EWMA → trả 7 ngày)

- SD-ML-06: Chu kỳ định giá (Cron → lấy state → DDQN → Safety check → ghi PriceOverride → push notification → Farm chấp nhận/từ chối)

- ★ SV tự thiết kế 5 biểu đồ tuần tự AI, mô tả luồng NestJS ↔ FastAPI ↔ Model

*3.3.6. Biểu đồ hoạt động (~2 trang)*

E-commerce:

- AD-01: Vòng đời đơn hàng (7 trạng thái: pending → confirmed → packing → shipping → delivered → completed / cancelled)

- AD-02: Xác thực JWT (access token hết hạn → refresh → cấp mới)

AI/ML:

- AD-ML-01: Thuật toán gợi ý (cây quyết định: có ≥5 đơn → ItemItemCF, không → Content-Based → cold-start popularity)

- AD-ML-03: Holt EWMA + DoW (có ≥14 ngày → tính DoW → nhân vào forecast, không → dùng forecast thuần)

- AD-ML-04: Suy luận DDQN + Safety Layer (DDQN chọn action → Safety check 5 quy tắc → clip nếu vi phạm → ghi PriceOverride)

- ★ SV tự vẽ lưu đồ thuật toán, phải giải thích được từng nhánh quyết định

*3.3.7. Thuật toán chi tiết các module AI/ML (~4 trang)*

**(a) DỰ BÁO NHU CẦU (~1 trang)**

ForecasterLSTM — kiến trúc thật:

- LSTM 2 lớp, hidden=128, dropout=0.2; input_size=11 (obs_dim train), window=21 bước [ref: dynamic-pricing-final/src/forecaster/model.py:L9-15, L23-29]

- Category embedding: nn.Embedding(n_categories=4, cat_embed_dim=8) ghép vào hidden state [ref: model.py:L22]

- Dual-head output: demand_head (Linear z→1) + waste_head (Linear→ReLU→Dropout→Linear z→1) → trả `{demand, waste_logit}` [ref: model.py:L31-49]

- Luồng serve: backend `/demand-forecasting/forecast` → DemandForecastingService → sidecar `/forecast` (port 8000) → `_run_forecaster` → ForecasterLSTM [ref: pricing-sidecar/main.py:L128-137, L263-274]

- ⚠️ **GIỚI HẠN TRAIN↔SERVE:** checkpoint train với obs_dim=11 layout cũ + chuỗi 21 bước thật; khi serve, sidecar pad-cuối 10→11 (`main.py:L134`) thay vì chèn đúng vị trí index 2, rồi tile-21× (`main.py:L135`) thay vì chuỗi thật — LSTM không thấy temporal dynamics. Serve `/forecast` là **xấp xỉ thấp**; kết quả tin cậy cần chạy offline eval `dynamic-pricing-final/src/forecaster/eval.py` [ref: ledger t0.4-forecaster-parity, t0.10-thesis-limitations]

**(b) ĐỊNH GIÁ ĐỘNG (~1.5 trang)**

DDQN (Double DQN) — kiến trúc thật:

- **State 10 chiều:** [freshness, inv_ratio, sin(2π×dow/7), cos(2π×dow/7), days_to_restock/30, demand_ratio, prev_delta, comp_ratio, days_to_waste/14, inv_coverage/3] [ref: pricing-sidecar/main.py:L114-125, ledger t0.3-obs-parity]

- **11 hành động:** CANDIDATES = np.linspace(-0.30, 0.20, 11), bước 0.05; CANDIDATES[6]=0.0 [ref: dynamic-pricing-final/src/rl/reward.py:L6-7, ledger t0.2-action-space]

- **Mạng SharedMLPDuelingQNet:** Linear(obs_dim+cat_embed_dim=10+8, hidden=128)→ReLU→Linear(128,128)→ReLU → Dueling: V-stream Linear(128,64)→ReLU→Linear(64,1); A-stream Linear(128,64)→ReLU→Linear(64,11); Q = V + A − mean(A) [ref: dynamic-pricing-final/src/rl/network.py:L51-81, ledger t0.2-ddqn-arch]

- Category embedding: nn.Embedding(n_cats=4, cat_embed_dim=8) ghép vào obs trước shared layers [ref: network.py:L60-64]

- **Hyperparameter thật (đọc từ nguồn):** buffer_capacity=50 000 [agent.py:L35], batch_size=256 [agent.py:L33], warmup=1 000 [agent.py:L34], ε_start=1.0 → ε_end=0.05 decay qua 2 000 episode [train.py:L12-14], target_sync=500 step [train.py:L15], lr=1e-4 [agent.py:L31], γ=0.99 [agent.py:L32]

Safety Layer — 5 quy tắc theo thứ tự áp dụng 3→4→1→2→5:

- Rule 3 (tick-clip): price ∈ [base×0.70, base×1.20] — giới hạn bước tối đa −30%/+20% [ref: pricing-sidecar/safety.py:L6]

- Rule 4 (freshness mandate): freshness < 0.4 → price ≤ base×0.75 [ref: safety.py:L8-10]

- Rule 1 (sàn chi phí): price ≥ base×0.55 [ref: safety.py:L12-13]

- Rule 2 (trần tuyệt đối): price ≤ base×2.0 [ref: safety.py:L15-16]

- Rule 5 (giá tối thiểu): price ≥ 1 000 VND [ref: safety.py:L18-19]

- Chế độ vận hành: shadow → advisory; farm chấp nhận/từ chối đề xuất [ref: ledger t1.4-safety-5-rules]

- ★ Safety Layer 5 quy tắc = đóng góp thực tiễn quan trọng nhất; Rule 3 clip ±tick, Rule 1/2 bảo vệ sàn/trần tuyệt đối độc lập với tick

**(c) PHÂN LOẠI ĐỘ TƯƠI (~0.5 trang)**

CoreML (Apple Create ML) — 2 model nhị phân:

- 2 model `.mlmodel`: `MyFreshnessClassifier-fruit.mlmodel` (danh mục fruit/fruits) và `MyFreshnessClassifier-root.mlmodel` (tất cả danh mục còn lại: leafy, herbs, root) [ref: pricing-sidecar/main.py:L318, ledger t1.4-freshness-coreml]

- Input: ảnh 299×299 (model khai báo colorSpace=BGR nhưng sidecar feed PIL.convert("RGB") — đúng, coremltools không swap channel) [ref: pricing-sidecar/main.py:L324, ledger t0.9-fixes]

- Predict: `model.predict({"image": img})` → output `{target: "fresh"/"rotten", targetProbability: {fresh: float, rotten: float}}` [ref: main.py:L325-330, ledger t0.6-coreml-freshness]

- Freshness score = `targetProbability["fresh"]` → input freshness cho DDQN state [ref: main.py:L330]

- Endpoint: FastAPI POST `/freshness/classify`, nhận ảnh base64 → trả `{score, tag, label, confidence}` [ref: main.py:L316-333]

- ⚠️ **GIỚI HẠN:** chỉ 2/4 danh mục có model riêng (fruit, root); leafy và herbs dùng chung model root; không có training script hay dataset tự thu thập [ref: ledger t0.10-thesis-limitations]

**3.4. Phân tích, thiết kế cơ sở dữ liệu (~3 trang)**

*3.4.1. Sơ đồ quan hệ thực thể (ERD)*

- User ↔ Farm (1-N), Farm ↔ Product (1-N), User ↔ Order (1-N)

*3.4.2. Chi tiết 10 collections*

7 collection e-commerce:

- users: \_id, name, email, password(bcrypt), role, phone, addresses\[\], location{Point}

- farms: \_id, ownerId, name, description, location{Point}, certificates\[\], isVerified

- products: \_id, farmId, name, price, stock, images\[\], category, tags\[\], createdAt

- orders: \_id, userId, items\[{productSnapshot, qty, price}\], totalAmount, status, stripeSessionId

- posts: \_id, userId, content, images\[\], likes\[\], comments\[\]

- notifications: \_id, userId, title, body, type, isRead, data{}

- price_overrides: \_id, productId, suggestedPrice, delta_pct, status(pending/accepted/rejected), expiresAt

3 collection cache AI:

- freshness_cache: productId(unique), scores\[5\], label, expiresAt(TTL 6h)

- recommendation_caches: userId, type(for-you/cart), productIds\[\], expiresAt(TTL 1h)

- forecast_caches: productId, predictions\[7\], confidence, expiresAt(TTL 6h)

*3.4.3. Chỉ mục và tối ưu*

- 2dsphere: farms.location

- TTL: freshness_cache 6h, recommendation_caches 1h

- Unique: freshness_cache.productId

- Compound: orders(userId + status + createdAt)

- ★ Embedded Snapshot trong Orders chống sai giá lịch sử, TTL tự dọn cache AI

**3.5. Phân tích, thiết kế giao diện chức năng (~2 trang)**

*3.5.1. Consumer:* Home (gợi ý For-You ★AI), Chi tiết (nhãn tươi ★AI + giá động ★AI + sản phẩm tương tự ★AI), Giỏ hàng (cross-sell ★AI), Checkout (Stripe WebView), Tracking (MapView)

*3.5.2. Farm:* Dashboard (biểu đồ dự báo 7 ngày ★AI), Quét độ tươi (camera ★AI), Gợi ý giá (chấp nhận/từ chối ★AI), CRUD sản phẩm, Thống kê

*3.5.3. Admin:* Dashboard, Duyệt farm, Quản lý đơn, Quản lý user, Shadow Report ★AI

**CHƯƠNG 4. TRIỂN KHAI VÀ THỰC NGHIỆM (~15 trang)**

**4.1. Môi trường phát triển (~2 trang)**

- Bảng phần cứng + phần mềm

- Bảng thư viện Backend (NestJS 11, Mongoose, passport-jwt, bcrypt, stripe...)

- Bảng thư viện Frontend (Expo SDK 53, axios, zustand, mmkv, nativewind...)

- Bảng thư viện AI/ML (FastAPI, PyTorch/TensorFlow, numpy, sklearn, scipy)

- Trình tự khởi động: MongoDB → 3 Sidecar → NestJS → Expo

**4.2. Cài đặt và triển khai (~3 trang)**

*4.2.1. Cấu trúc mã nguồn*

- Backend: 14 module NestJS

- Frontend: route groups

- Sidecars: 3 thư mục Python

*4.2.2. Tích hợp NestJS ↔ AI Sidecars*

- DynamicPricingInterceptor: đăng ký APP_INTERCEPTOR → chặn response /api/products → tra price_overrides → nhúng dynamicPrice + priceTag → Frontend không cần sửa

- PricingTickCron: chạy mỗi giờ

- Vòng đời PriceOverride: pending → accepted/rejected → expired

- ★ SV tự thiết kế Interceptor — giá AI nhúng tự động vào API mà không sửa controller

*4.2.3. Tài khoản seed*

- Admin ×1, Farm ×3, Consumer ×5, Suspended ×1

**4.3. Kiểm thử (~2 trang)**

- Unit test: 54/54 pass (Jest + mongodb-memory-server)

- Bảng test cases theo 10 module

- TypeScript build: 0 lỗi

- Tích hợp: Stripe webhook 7 cases, GHN+Dijkstra 4 cases

**4.4. Đánh giá hệ thống (~8 trang)**

*4.4.1. Đánh giá chức năng tổng quan (~1 trang)*

- Bảng 14 module × trạng thái hoàn thành

- 24+ REST endpoints, 10 collections, 42 màn hình

*4.4.2. Đánh giá hệ thống gợi ý (~1.5 trang)*

- Hit-Rate@6: % user có ≥1 sản phẩm gợi ý được mua

- So sánh: ItemItemCF vs Content-Based vs Random baseline

- Thời gian phản hồi sidecar (ms)

- Tỷ lệ cold-start fallback

- Bảng kết quả + biểu đồ cột

- SV tự đánh giá 3 phương pháp trên cùng dataset

*4.4.3. Đánh giá dự báo nhu cầu (~1.5 trang)*

- MAE (sai số trung bình, đơn vị: số bó rau)

- MAPE (% sai số)

- So sánh: Holt+DoW vs Holt không DoW vs Naive (lấy hôm qua)

- Restock warning: % cảnh báo đúng

- Bảng cho 3-5 loại rau phổ biến

- SV chứng minh DoW cải thiện MAE bao nhiêu %

*4.4.4. Đánh giá định giá động (~2 trang)*

- Phân bố delta_pct (histogram)

- Safety clip rate: % Safety Layer can thiệp

- Simulated revenue: DDQN vs giá cố định vs giảm giá đều

- Simulated waste reduction: % giảm lãng phí

- So sánh với 3-4 nghiên cứu quốc tế:

  - Nassibi et al. (2023): dự báo nhu cầu ML — F2T thêm pricing

  - Xue et al. (2025): định giá rau theo price elasticity — F2T thêm RL

  - Kayikci et al. (2022): giảm lãng phí bằng dynamic pricing — F2T thêm safety layer

  - Bảng so sánh: phương pháp, dữ liệu, kết quả, có safety layer không

- SV tự so sánh F2T với nghiên cứu quốc tế → định vị đóng góp

*4.4.5. Đánh giá phân loại độ tươi (~1 trang)*

- Accuracy trên test set

- Confusion Matrix 4×4

- F1-score trung bình

- So sánh: MobileNetV2 vs đánh giá bằng mắt 3 người

- Inference time (ms)

- Dataset rau VN tự thu thập = đóng góp riêng

*4.4.6. Demo sản phẩm (~2 trang)*

- 8 screenshots: Home+ForYou, Chi tiết+nhãn tươi, Giỏ hàng+cross-sell, Tracking bản đồ, Farm Dashboard+dự báo, Farm gợi ý giá, Farm quét tươi, Admin Dashboard

**CHƯƠNG 5. KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN (~3 trang)**

**5.1. Kết luận (~1.5 trang)**

- Kết quả: 14 module, 54/54 test, 42 màn hình, 3 sidecar AI

- 6 đóng góp (nhắc lại + kèm số liệu benchmark từ Chương 4)

- Bài học: Sidecar pattern, embedded snapshot, webhook as truth, safety layer

**5.2. Hạn chế (~0.75 trang)**

- Email/SMS verify tắt

- GHN dùng Dijkstra fallback chưa token thật

- Định giá chỉ advisory chưa live

- Dataset tươi nhỏ (~2000 ảnh)

- Sidecar chưa Docker

- Chưa có rating/review

**5.3. Hướng phát triển (~0.75 trang)**

- Chuyển định giá sang live + A/B testing

- Thu thập thêm ảnh rau VN

- Nâng cấp DDQN → Multi-Agent RL (nhiều sản phẩm)

- GHN thật + webhook hai chiều

- Docker Compose + CI/CD

- Web portal Farm Owner

- Chatbot AI tư vấn (LLM)

**TÀI LIỆU THAM KHẢO (~2 trang, chuẩn IEEE)**
