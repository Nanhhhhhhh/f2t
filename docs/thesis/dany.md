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

- MT2: Backend NestJS + MongoDB với 14 module nghiệp vụ, tích hợp Stripe và GHN

- MT3: Hệ thống gợi ý sản phẩm (ItemItemCF + Content-Based Filtering)

- MT4: Dự báo nhu cầu (Holt EWMA + DoW seasonality)

- MT5: Định giá động (DDQN + Safety Layer, chế độ advisory)

- MT6: Phân loại độ tươi rau từ ảnh (MobileNetV2 qua API)

- MT7: Kiểm thử đạt ≥95% unit test pass

**1.3. Phạm vi nghiên cứu (~0.5 trang)**

- Bao gồm: app mobile (iOS/Android), backend REST API, 3 sidecar FastAPI

- Không bao gồm: xác thực email/SMS, web client, chế độ định giá "live"

**1.4. Phương pháp tiếp cận (~0.5 trang)**

- Agile/Scrum: Sprint 2-4 tuần

- Thiết kế hướng đối tượng (UML)

- Transfer Learning cho model ảnh

- Unit test Jest + mongodb-memory-server

**1.5. Đóng góp của khóa luận (~1.5 trang)**

- ★ ĐG1: Kiến trúc Monolith+Sidecar → tách AI Python ra khỏi Node.js, graceful degradation

- ★ ĐG2: Hệ thống gợi ý đa tầng (ItemItemCF + Content-Based + cold-start handling)

- ★ ĐG3: Dự báo nhu cầu (Holt EWMA + DoW seasonality + confidence interval)

- ★ ĐG4: Định giá động (DDQN + Safety Layer 5 quy tắc + advisory mode)

- ★ ĐG5: Phân loại độ tươi (MobileNetV2 API + dataset rau VN tự thu thập)

- ★ ĐG6: Tích hợp end-to-end (Interceptor giá AI, Dijkstra fallback, Embedded Snapshot)

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

*2.4.1. Lọc cộng tác (Collaborative Filtering)*

- Khái niệm: "người giống bạn cũng mua X"

- Công thức Cosine Similarity (viết công thức + ví dụ số)

- ItemItemCF: so sánh sản phẩm, không so sánh người dùng

- Temporal decay: đơn hàng cũ giảm trọng số, λ=0.02

*2.4.2. Gợi ý dựa trên nội dung (Content-Based Filtering)*

- TF-IDF trên tags sản phẩm

- Cosine Similarity giữa sản phẩm đang xem và tất cả sản phẩm khác

- Kết hợp với ItemItemCF → hệ thống hybrid

*2.4.3. Dự báo chuỗi thời gian:*

*2.4.4. Mùa vụ theo ngày trong tuần (DoW Seasonality)*

- Hệ số mùa vụ = trung bình doanh số ngày X / trung bình chung

- Nhân hệ số vào dự báo Holt

- Điều kiện: cần ≥14 ngày dữ liệu

*2.4.5. Học tăng cường và DDQN*

- RL cơ bản: Agent, State, Action, Reward

- Q-Learning → DQN → Double DQN (2 mạng giảm overestimate)

- Áp dụng cho định giá: state = \[tồn kho, độ tươi, giờ, giá, nhu cầu\], 5 hành động \[-20%, -10%, 0%, +10%, +20%\]

*2.4.6. Phân loại ảnh với MobileNetV2*

- Transfer Learning: pretrained ImageNet, thay lớp cuối

- MobileNetV2: 14MB, Inverted Residual, Depthwise Separable Conv

- 4 class: Tươi, Hơi héo, Héo, Hỏng

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

**(a) HỆ THỐNG GỢI Ý (~1.5 trang)**

ItemItemCF — SV tự cài đặt:

- B1: Thu thập lịch sử mua → ma trận user×product (csr_matrix)

- B2: Tính trọng số co-occurrence có temporal decay: w = count × exp(-λ × days_ago), λ=0.02

- B3: Cosine Similarity giữa các cặp sản phẩm

- B4: Với mỗi user, lấy Top-K=6 sản phẩm tương tự chưa mua

- Giả mã: 15-20 dòng

Content-Based Filtering — SV tự cài đặt:

- B1: Mỗi sản phẩm có tags ("rau lá", "vitamin A", "xào", "luộc"...)

- B2: TF-IDF vectorize tags → ma trận sản phẩm×features

- B3: Cosine Similarity giữa sản phẩm đang xem và tất cả sản phẩm khác

- B4: Trả Top-6 tương tự nhất

- Dùng cho: trang chi tiết ("Sản phẩm tương tự")

Hybrid — SV tự thiết kế:

- Có ≥5 đơn → dùng ItemItemCF (For-You)

- User mới (cold-start) → Content-Based + sản phẩm bán chạy nhất

- Giỏ hàng: co-occurrence đơn giản (ai mua A thường mua B)

- ★ SV tự thiết kế logic kết hợp + xử lý cold-start, không dùng thư viện recommendation

**(b) DỰ BÁO NHU CẦU (~1 trang)**

Holt EWMA + DoW — SV tự cài đặt:

- Level: L_t = 0.3×y_t + 0.7×(L\_{t-1} + T\_{t-1})

- Trend: T_t = 0.1×(L_t - L\_{t-1}) + 0.9×T\_{t-1}

- Forecast h bước: F\_{t+h} = L_t + h×T_t

- CI 80%: F ± 1.28×σ (σ từ MAE lịch sử)

- DoW: đủ 14 ngày → tính hệ số ngày trong tuần → nhân vào forecast

- Cold-start: \<7 ngày → median cùng danh mục, confidence=0.2

- ★ SV tự thêm DoW seasonality + cold-start fallback, không dùng statsmodels/Prophet

**(c) ĐỊNH GIÁ ĐỘNG (~1 trang)**

DDQN — SV tự cài đặt:

- State 5 chiều: \[tồn_kho_pct, độ_tươi, giờ_trong_ngày, giá_hiện_tại, nhu_cầu_dự_báo\]

- 5 hành động: \[-20%, -10%, 0%, +10%, +20%\]

- Reward = units_sold × price × freshness_bonus — waste_penalty

- Mạng Q: MLP (5→64→32→5), ReLU, target network cập nhật mỗi 100 step

- Experience Replay: buffer 10000, batch 32, ε-greedy 0.1→0.01

Safety Layer — SV tự thiết kế:

- QT1: Giá không giảm quá 30% so với giá gốc

- QT2: Giá không tăng quá 20% so với giá gốc

- QT3: Sàn giá = 55% giá gốc (bảo vệ nông dân)

- QT4: Độ tươi \<0.4 → bắt buộc giảm ≥20%

- QT5: Giá tối thiểu 1000 VND

- Chế độ: shadow → advisory (farm chấp nhận/từ chối)

- ★ Safety Layer 5 quy tắc = đóng góp thực tiễn quan trọng nhất

**(d) PHÂN LOẠI ĐỘ TƯƠI (~0.5 trang)**

MobileNetV2 qua API — SV tự train:

- Dataset: tự chụp 5-10 loại rau × 4 mức × 100 ảnh = 2000 ảnh + augmentation

- Model: MobileNetV2 pretrained, thay lớp cuối → 4 class

- Train: freeze base 10 epoch → fine-tune 30 lớp cuối 20 epoch

- Deploy: FastAPI POST /freshness/classify, nhận ảnh base64 → trả score 0-1

- Freshness score = confidence class "Tươi" → input cho DDQN

- ★ SV tự thu thập ảnh rau VN, tự train, tự deploy API

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
