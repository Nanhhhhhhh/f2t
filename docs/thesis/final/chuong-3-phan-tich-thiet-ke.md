# CHƯƠNG 3. PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG

## 3.1. Mô tả quy trình nghiệp vụ

Chương này trình bày quy trình nghiệp vụ hiện tại và quy trình đề xuất của hệ thống F2T, làm cơ sở cho toàn bộ phân tích và thiết kế tiếp theo. Cả hai quy trình được hình thức hóa bằng sơ đồ quy trình nghiệp vụ chuẩn BPMN (xem Hình business-process-current.puml và business-process-f2t.puml).

### 3.1.1. Quy trình hiện tại (thủ công)

Chuỗi cung ứng nông sản tươi tại Việt Nam hiện nay vận hành theo mô hình trung gian nhiều tầng [TLTK]. Quy trình điển hình gồm năm bước tuần tự: (1) **Nông dân** thu hoạch và bán sản phẩm thô tại vườn hoặc điểm thu mua địa phương; (2) **Thương lái** thu gom, phân loại sơ bộ và vận chuyển về đầu mối; (3) **Chợ đầu mối** tập kết và phân phối theo lô lớn; (4) **Cửa hàng / siêu thị** mua buôn, chia nhỏ và bày bán lẻ; (5) **Người tiêu dùng** mua trực tiếp tại quầy (xem Hình business-process-current.puml).

Mô hình nhiều trung gian này phát sinh ít nhất ba nhóm vấn đề nghiêm trọng. Thứ nhất, **thông tin giá bất cân xứng**: nông dân thiếu dữ liệu thị trường thực thời, buộc phải chấp nhận giá thương lái đặt ra, thường thấp hơn 30–50% so với giá bán lẻ cuối cùng [TLTK]. Thứ hai, **mất tươi trong lưu thông**: sản phẩm phải qua 3–4 điểm trung chuyển mà không có cơ chế giám sát nhiệt độ hay thời gian, dẫn đến tỷ lệ thất thoát sau thu hoạch ở Việt Nam ước tính lên tới 20–30% đối với rau quả tươi [TLTK]. Thứ ba, **thiếu truy xuất nguồn gốc và dự báo**: người tiêu dùng không biết sản phẩm xuất phát từ trang trại nào, còn cả chuỗi cung ứng không có công cụ dự báo nhu cầu để điều phối sản xuất — hậu quả là vừa thiếu hàng khi nhu cầu tăng đột biến, vừa thừa ứ khi thu hoạch đồng loạt.

### 3.1.2. Quy trình đề xuất (F2T)

Hệ thống F2T thiết kế lại quy trình nghiệp vụ theo mô hình nền tảng kết nối trực tiếp (xem Hình business-process-f2t.puml), loại bỏ các tầng trung gian không tạo giá trị và tích hợp AI/ML vào từng điểm tiếp xúc then chốt.

Luồng chính gồm tám giai đoạn: (1) Farm chủ đăng ký tài khoản và thông tin trang trại; (2) Admin duyệt hồ sơ đảm bảo chất lượng; (3) Farm đăng sản phẩm kèm ảnh tươi để CoreML phân loại; (4) Consumer tìm kiếm theo vị trí địa lý; (5) Đặt hàng; (6) Thanh toán qua Stripe Checkout; (7) Giao hàng qua GHN; (8) Đánh giá sau nhận hàng.

**Luồng AI đan xen** là điểm phân biệt cốt lõi của F2T. Mỗi khi Consumer gọi API lấy danh sách sản phẩm, `DynamicPricingInterceptor` tự động bổ sung vào phản hồi ba trường: `dynamicPrice` (giá động), `freshnessScore` (điểm tươi từ CoreML) và `priceTag` (nhãn "flash\_discount" hoặc "standard") [ref: f2t-backend/src/common/interceptors/dynamic-pricing.interceptor.ts:74-77]. Interceptor này hoạt động trong suốt mà không làm thay đổi API contract — Consumer nhận thông tin giá cập nhật nhất mà không cần gọi endpoint riêng. Giá động được tính bởi `PricingTickCron` chạy định kỳ mỗi giờ theo lịch cron mặc định `"0 * * * *"` (có thể cấu hình qua biến môi trường `PRICING_CRON_SCHEDULE`) [ref: f2t-backend/src/modules/dynamic-pricing/pricing-tick.cron.ts:18], gọi sidecar FastAPI `/predict` để mô hình DDQN đề xuất delta giá, sau đó qua Safety Layer 5 quy tắc trước khi ghi vào MongoDB.

Về phía Farm, dashboard hiển thị hai loại hỗ trợ AI: (a) **dự báo nhu cầu 7 ngày** do ForecasterLSTM sinh ra qua endpoint `/forecast` [ref: pricing-sidecar/main.py:263]; (b) **đề xuất giá** từ DDQN (SharedMLPDuelingQNet) — Farm có quyền chấp nhận hoặc từ chối đề xuất, không bị ép giá tự động [ref: f2t-backend/src/common/interceptors/dynamic-pricing.interceptor.ts:74-77; ledger t1.4-interceptor-cron]. Hệ thống không có recommender **cá nhân hoá** / lọc cộng tác (collaborative filtering) cho người mua; **có** cross-sell giỏ hàng category-level bằng FP-Growth association rules, hiển thị trong màn hình giỏ hàng (`(app)/cart.tsx`) qua component `CrossSell` [ref: ledger cross-sell-v1].

### 3.1.3. Ba tác nhân hệ thống

F2T xác định ba tác nhân chính tương tác với hệ thống, với vai trò và đặc quyền phân tách rõ ràng.

**Consumer (Người tiêu dùng)** là tác nhân cuối của chuỗi cung ứng. Consumer sử dụng ứng dụng di động để duyệt sản phẩm theo vị trí địa lý, đặt hàng, thanh toán trực tuyến, theo dõi trạng thái giao hàng theo thời gian thực và gửi đánh giá sau khi nhận hàng. Consumer nhận thấy điểm tươi và giá động được tích hợp trực tiếp vào danh sách sản phẩm mà không cần thao tác thêm [ref: f2t-backend/src/common/interceptors/dynamic-pricing.interceptor.ts:74-77].

**Farm Owner (Chủ trang trại)** là nhà cung cấp sản phẩm. Farm Owner đăng ký trang trại qua ứng dụng, thực hiện CRUD sản phẩm, chụp ảnh rau quả để hệ thống phân loại độ tươi bằng CoreML, xem bảng dự báo nhu cầu 7 ngày và nhận đề xuất giá từ DDQN. Farm Owner có toàn quyền chấp nhận hoặc từ chối đề xuất giá, xem thống kê doanh thu và nhận thông báo đẩy khi có đơn hàng mới.

**Admin (Quản trị viên)** là tác nhân có đặc quyền cao nhất, chịu trách nhiệm vận hành nền tảng. Admin duyệt hoặc từ chối đăng ký trang trại, quản lý tài khoản người dùng (bao gồm khả năng tạm khóa tài khoản), giám sát và xử lý các đơn hàng có vấn đề, xem thống kê toàn hệ thống và thực hiện cấu hình vận hành.

---

## 3.2. Phân tích, thiết kế chức năng nghiệp vụ

### 3.2.1. Yêu cầu chức năng theo vai trò

Dựa trên phân tích quy trình nghiệp vụ và đặc điểm ba tác nhân ở mục 3.1, hệ thống F2T xác định tổng cộng 20 yêu cầu chức năng phân theo vai trò như sau.

**Consumer — 8 chức năng:**

1. **CF-01: Đăng ký và xác thực tài khoản** — Đăng ký bằng email, xác thực OTP, đăng nhập JWT.
2. **CF-02: Tìm kiếm sản phẩm theo vị trí địa lý** — Lọc trang trại và sản phẩm trong bán kính địa lý bằng chỉ mục 2dsphere của MongoDB.
3. **CF-03: Xem sản phẩm với nhãn tươi và giá động** — Mỗi sản phẩm hiển thị `freshnessScore`, `dynamicPrice` và `priceTag` do `DynamicPricingInterceptor` bổ sung [ref: f2t-backend/src/common/interceptors/dynamic-pricing.interceptor.ts:74-77].
4. **CF-04: Quản lý giỏ hàng** — Thêm, sửa số lượng, xóa sản phẩm, tính tổng thanh toán.
5. **CF-05: Thanh toán trực tuyến qua Stripe** — Tạo Stripe Checkout Session, nhận kết quả qua webhook.
6. **CF-06: Theo dõi giao hàng** — Xem trạng thái đơn hàng và thông tin vận đơn GHN theo thời gian thực.
7. **CF-07: Đánh giá sản phẩm và trang trại** — Gửi đánh giá sau khi đơn hàng ở trạng thái "delivered".
8. **CF-08: Nhận thông báo đẩy** — Nhận push notification về cập nhật trạng thái đơn hàng.

**Farm Owner — 7 chức năng:**

1. **FF-01: Đăng ký và quản lý trang trại** — Đăng ký thông tin trang trại, chờ Admin duyệt, chỉnh sửa hồ sơ.
2. **FF-02: Quản lý sản phẩm (CRUD)** — Tạo, sửa, xóa sản phẩm; gắn danh mục và giá cơ sở.
3. **FF-03: Quét và phân loại độ tươi** — Chụp ảnh sản phẩm để CoreML (2 model fruit/root) phân loại nhị phân fresh/rotten [ref: pricing-sidecar/main.py:316; ledger t0.6-coreml-freshness].
4. **FF-04: Xem dự báo nhu cầu 7 ngày** — Dashboard hiển thị kết quả ForecasterLSTM qua `/forecast` [ref: pricing-sidecar/main.py:263; ledger t1.4-forecaster-not-holt].
5. **FF-05: Nhận và xử lý đề xuất giá (gợi ý giá)** — Xem đề xuất delta giá từ DDQN sau Safety Layer; chấp nhận hoặc từ chối [ref: pricing-sidecar/main.py:277; ledger t1.4-safety-5-rules].
6. **FF-06: Xem thống kê doanh thu** — Biểu đồ doanh thu, số đơn theo thời gian.
7. **FF-07: Nhận thông báo đẩy** — Nhận thông báo về đơn hàng mới, đề xuất giá mới.

**Admin — 5 chức năng:**

1. **AF-01: Duyệt đăng ký trang trại** — Xem xét và phê duyệt hoặc từ chối hồ sơ farm mới.
2. **AF-02: Quản lý người dùng** — Xem danh sách, tạm khóa hoặc kích hoạt tài khoản Consumer và Farm.
3. **AF-03: Quản lý đơn hàng** — Giám sát và can thiệp các đơn hàng có vấn đề.
4. **AF-04: Xem thống kê toàn hệ thống** — Biểu đồ doanh thu, số đơn, số farm/consumer theo thời gian.
5. **AF-05: Cấu hình vận hành** — Thiết lập các tham số hệ thống.

### 3.2.2. Yêu cầu phi chức năng

Hệ thống F2T phải đáp ứng sáu nhóm yêu cầu phi chức năng (NFR) sau. Các tiêu chí được thiết kế để đảm bảo hệ thống hoạt động ổn định trong môi trường di động và đám mây thực tế [TLTK].

| Tiêu chí | Mô tả | Cơ chế thực hiện |
|---|---|---|
| **Bảo mật** | Xác thực bằng JWT, mật khẩu lưu trữ dưới dạng bcrypt hash với saltRounds=10 | `JwtAuthGuard` [ref: f2t-backend/src/modules/auth/guards/jwt-auth.guard.ts:1-5]; `bcrypt.hash(password, 10)` [ref: f2t-backend/src/modules/users/users.service.ts:18; ledger t2.2-security] |
| **Hiệu năng** | Thời gian phản hồi API mục tiêu dưới 500ms cho các endpoint nghiệp vụ thông thường | Chỉ mục MongoDB (2dsphere, compound) [ref: ledger t1.11-schema-detail], NestJS không đồng bộ I/O, cache kết quả dự báo bằng Redis [ref: f2t-backend/src/modules/demand-forecasting/demand-forecasting.service.ts:34,66] |
| **Khả dụng & Graceful Degradation** | Khi sidecar FastAPI không phản hồi, NestJS trả về dữ liệu dự phòng thay vì lỗi 5xx; Consumer không nhận thấy sự cố | `catch` block tại `dynamic-pricing.service.ts:283-285` (predict) và `dynamic-pricing.service.ts:154-161` (freshness) trả null / fallback Weibull [ref: ledger t2.2-security] |
| **Khả mở rộng** | Hai sidecar FastAPI (port 8000, 8001) có thể scale ngang độc lập với NestJS backend; 15 module NestJS tách biệt nhau [ref: f2t-backend/src/app.module.ts:57,60; ledger numbers-v3] | Kiến trúc monolith NestJS + 2 sidecar riêng biệt |
| **Khả bảo trì** | Toàn bộ backend TypeScript/NestJS, sidecar Python typing với Pydantic; lint và kiểm thử 54 test case / 21 file spec [ref: ledger t1.15-numbers] | TypeScript strict, ESLint, Jest với coverage |
| **Khả dùng (Usability)** | Giao diện mobile-first, ≈48 màn hình route Expo Router [ref: ledger t1.15-numbers]; luồng đặt hàng tối ưu dưới 5 bước | NativeWind TailwindCSS trên React Native |

### 3.2.3. Sơ đồ phân rã chức năng

Sơ đồ phân rã chức năng (FDD) phân cấp toàn bộ chức năng của hệ thống từ gốc F2T xuống bốn nhóm chức năng chính, mỗi nhóm tiếp tục phân rã thành các chức năng lá (xem Hình fdd-functional-decomposition.puml).

**Nhóm Quản lý người dùng** bao gồm: đăng ký, xác thực OTP, đăng nhập/đăng xuất, quản lý hồ sơ và phân quyền theo vai trò (Consumer/Farm/Admin).

**Nhóm E-commerce** bao gồm: quản lý sản phẩm, tìm kiếm địa lý, giỏ hàng, đặt hàng, thanh toán Stripe và theo dõi giao hàng GHN.

**Nhóm AI/ML** gồm 4 chức năng thực sự có trong hệ thống [ref: ledger cross-sell-v1]:
1. **Dự báo nhu cầu** — ForecasterLSTM chạy qua endpoint `/forecast` của sidecar [ref: pricing-sidecar/main.py:263].
2. **Định giá động** — DDQN (SharedMLPDuelingQNet) kết hợp Safety Layer 5 quy tắc, chạy qua endpoint `/predict` và `PricingTickCron` [ref: pricing-sidecar/main.py:277].
3. **Phân loại độ tươi** — 2 model CoreML (fruit/root), nhị phân fresh/rotten, chạy qua endpoint `/freshness/classify` [ref: pricing-sidecar/main.py:316].
4. **Cross-sell giỏ hàng category-level** — FP-Growth association rules (warm-start Instacart), artifact `category_rules.json` + `category_popularity.json` nạp vào bộ nhớ sidecar lúc khởi động; component `CrossSell` hiển thị trong màn hình giỏ hàng [ref: ledger cross-sell-v1].

**Nhóm Quản trị** bao gồm: duyệt farm, quản lý tài khoản, giám sát đơn hàng và thống kê vận hành.

---

## 3.3. Phân tích, thiết kế kiến trúc hệ thống

### 3.3.1. Kiến trúc triển khai tổng quan

Hệ thống F2T được triển khai theo kiến trúc **monolith NestJS kết hợp hai sidecar ML** (xem Hình deployment-architecture.puml). Quyết định kiến trúc này xuất phát từ bối cảnh đây là hệ thống khóa luận của một sinh viên, trong đó tính đơn giản và khả năng vận hành độc lập quan trọng hơn tính phân tán quy mô lớn.

**Backend NestJS 11** [ref: ledger t2.2-tech-versions] chạy trên cổng mặc định 3000 [ref: f2t-backend/src/main.ts:59-60], gồm **15 module** [ref: ledger numbers-v3]: `admin`, `auth`, `delivery`, `demand-forecasting`, `dynamic-pricing`, `farms`, `notifications`, `orders`, `payments`, `posts`, `products`, `recommendations`, `reviews`, `uploads` và `users`. Backend kết nối tới **MongoDB** để lưu trữ dữ liệu nghiệp vụ và tới **Redis** (qua `RedisModule`) để cache kết quả dự báo nhu cầu [ref: f2t-backend/src/app.module.ts:84; f2t-backend/src/modules/demand-forecasting/demand-forecasting.service.ts:34,66]. Toàn bộ cấu hình URL sidecar được đọc từ biến môi trường `PRICING_SIDECAR_URL` với giá trị mặc định `http://localhost:8000` [ref: f2t-backend/src/app.module.ts:57].

**Pricing Sidecar FastAPI** (`pricing-sidecar/`) chạy trên cổng 8000 và cung cấp đúng 3 endpoint phục vụ các chức năng định giá + dự báo + phân loại tươi [ref: ledger t1.4-one-sidecar]:

- `/predict` (POST) — nhận state vector 10 chiều, trả delta giá từ DDQN sau Safety Layer [ref: pricing-sidecar/main.py:277].
- `/forecast` (POST) — nhận state vector, trả `demand7d` và `pWaste` từ ForecasterLSTM [ref: pricing-sidecar/main.py:263].
- `/freshness/classify` (POST) — nhận ảnh sản phẩm (JPEG/PNG), trả nhãn "fresh"/"rotten" và xác suất từ 2 model CoreML [ref: pricing-sidecar/main.py:316].

**Recommender Sidecar FastAPI** (`recommender-sidecar/`) chạy trên cổng 8001 và cung cấp 2 endpoint phục vụ chức năng cross-sell [ref: recommender-sidecar/main.py:56,61]:

- `POST /recommend` — nhận `{cart_categories, top_k}`, trả `{recommendations: [{category, score, source}]}` dựa trên category rules FP-Growth.
- `GET /health` — kiểm tra trạng thái sidecar.

Sidecar nạp artifact JSON (`category_rules.json`, `category_popularity.json`) từ `recommender-final/model/` khi khởi động; **không truy cập MongoDB** [ref: recommender-sidecar/main.py:17-29]. URL được cấu hình qua biến môi trường `RECOMMENDER_SIDECAR_URL` [ref: f2t-backend/src/app.module.ts:60].

**Ứng dụng di động** (React Native / Expo) giao tiếp với NestJS backend qua REST API. Frontend không gọi trực tiếp sidecar — mọi logic AI/ML đều được trừu tượng hóa phía backend.

**Graceful degradation** là cơ chế bảo vệ then chốt: khi sidecar không phản hồi (timeout, restart, lỗi), NestJS bắt ngoại lệ và trả về dữ liệu dự phòng thay vì lỗi 5xx — Consumer vẫn nhận được danh sách sản phẩm với giá cuối cùng được lưu trong MongoDB, không trải nghiệm lỗi hệ thống [ref: f2t-backend/src/modules/dynamic-pricing/dynamic-pricing.service.ts:283-285; ledger t2.2-security].

### 3.3.2. Biểu đồ Use Case tổng quan

Biểu đồ use case tổng quan mô hình hóa tập hợp đầy đủ các chức năng mà ba tác nhân tương tác với hệ thống F2T (xem Hình usecase-overview.puml). Sáu nhóm use case được tổ chức theo miền chức năng:

- **UC-01: Quản lý tài khoản** — Consumer và Farm Owner đăng ký, đăng nhập, quản lý hồ sơ; Admin quản lý người dùng. Bao gồm xác thực OTP email và refresh JWT.
- **UC-02: Đặt hàng & Thanh toán** — Consumer tìm kiếm sản phẩm theo vị trí, thêm vào giỏ, đặt hàng và thanh toán qua Stripe Checkout. Giá hiển thị trong use case này đã được DynamicPricingInterceptor xử lý [ref: f2t-backend/src/common/interceptors/dynamic-pricing.interceptor.ts:74-77].
- **UC-03: Quản lý sản phẩm** — Farm Owner thực hiện CRUD sản phẩm, thiết lập giá cơ sở và danh mục.
- **UC-04: Quản lý trang trại** — Farm Owner đăng ký và duy trì thông tin trang trại; Admin duyệt hoặc từ chối đăng ký.
- **UC-05: Theo dõi giao hàng** — Consumer và Farm Owner xem trạng thái đơn hàng và thông tin vận đơn GHN.
- **UC-06: Quản lý vận hành Admin** — Admin xem thống kê, giám sát đơn hàng và thực hiện cấu hình hệ thống.

### 3.3.3. Biểu đồ Use Case module AI/ML

Module AI/ML của F2T bổ sung **bốn** use case mở rộng tích hợp trí tuệ nhân tạo vào quy trình nghiệp vụ e-commerce (xem Hình usecase-aiml.puml). Hệ thống không có recommender **cá nhân hoá** (collaborative filtering / content-based) cho người mua; **có** cross-sell giỏ hàng category-level bằng FP-Growth (UC-ML-03) — gợi ý sản phẩm xuất hiện trong màn hình giỏ hàng, không phải trang chủ hay feed [ref: ledger cross-sell-v1].

**UC-ML-01: Dự báo nhu cầu** — Tác nhân: Farm Owner. Farm Owner xem bảng dự báo nhu cầu 7 ngày cho từng sản phẩm trên dashboard. Phía backend, `DemandForecastingService` gọi `${sidecarUrl}/forecast` [ref: f2t-backend/src/modules/demand-forecasting/demand-forecasting.service.ts:43], sidecar nhận state vector và chạy hàm `_run_forecaster` → `ForecasterLSTM` để trả về giá trị `demand7d` và `pWaste` (xác suất thất thoát) [ref: pricing-sidecar/main.py:263]. Kết quả dự báo giúp Farm Owner điều phối kế hoạch sản xuất và thu hoạch. Đây là use case do sinh viên tự thiết kế tích hợp ML vào nền tảng TMĐT [ref: ledger t1.4-forecaster-not-holt].

**UC-ML-02: Định giá động (gợi ý giá)** — Tác nhân: Farm Owner. `PricingTickCron` tự động kích hoạt mỗi giờ [ref: f2t-backend/src/modules/dynamic-pricing/pricing-tick.cron.ts:18] để DDQN tính toán đề xuất delta giá cho từng sản phẩm. Farm Owner thấy đề xuất giá trên dashboard và quyết định chấp nhận hoặc từ chối. Khi Farm Owner chấp nhận, hệ thống ghi `PriceOverride` vào MongoDB và `DynamicPricingInterceptor` bắt đầu trả giá mới cho Consumer [ref: pricing-sidecar/main.py:277; ledger t1.4-one-sidecar]. Đây là thiết kế advisory (tư vấn), không ép giá tự động.

**UC-ML-03: Cross-sell giỏ hàng (gợi ý sản phẩm thường mua kèm)** — Tác nhân: Consumer. Khi Consumer mở màn hình giỏ hàng, component `CrossSell` gửi request `GET /api/recommendations/cross-sell?productIds=...&limit=6` tới `RecommendationsController` [ref: f2t-backend/src/modules/recommendations/recommendations.controller.ts:15]. `RecommendationsService.getCrossSell()` trích xuất category từ productIds → gọi `recommender-sidecar :8001/recommend` (timeout 5000ms; nếu sidecar lỗi → fallback graceful — logger.warn + trả sản phẩm cùng farm, không throw 500) [ref: f2t-backend/src/modules/recommendations/recommendations.service.ts:48,56] → lọc tồn kho → re-rank với FARM_BOOST=1.5 cho sản phẩm cùng trang trại [ref: f2t-backend/src/modules/recommendations/recommendations.service.ts:10,86] → trả top 6 sản phẩm. Đây là **cross-sell category-level** dựa trên FP-Growth association rules, **không** phải collaborative filtering hay cá nhân hoá [ref: ledger cross-sell-v1].

**UC-RV-01: Đánh giá sản phẩm** — Tác nhân: Consumer (đã mua). Consumer đã nhận đơn hàng có thể đánh giá sản phẩm (rating 1–5 sao, comment tối đa 500 ký tự, tùy chọn thêm ảnh) qua `POST /api/reviews` [ref: f2t-backend/src/modules/reviews/reviews.controller.ts:45]. Ràng buộc: `orderId` bắt buộc — chỉ người đã đặt hàng mới review được. Service cập nhật `product.averageRating` và `product.reviewCount` sau mỗi review mới [ref: f2t-backend/src/modules/reviews/reviews.service.ts:131]. Consumer xem danh sách review qua `GET /api/reviews?productId=...` [ref: f2t-backend/src/modules/reviews/reviews.controller.ts:31].

### 3.3.4. Đặc tả Use Case chi tiết

Mục này trình bày đặc tả chi tiết cho 6 use case tiêu biểu, bao gồm tác nhân, tiền điều kiện, hậu điều kiện, luồng chính và ngoại lệ. Các use case được chọn đại diện cho toàn bộ các luồng nghiệp vụ quan trọng của hệ thống.

---

**UC-01: Đăng ký tài khoản**

| Thuộc tính | Nội dung |
|---|---|
| **Tác nhân** | Consumer, Farm Owner (vai trò tương tự) |
| **Tiền điều kiện** | Người dùng chưa có tài khoản; có kết nối mạng |
| **Hậu điều kiện** | Tài khoản được tạo, email xác thực OTP hoàn tất, có thể đăng nhập |
| **Luồng chính** | 1. Người dùng nhập email, mật khẩu, tên hiển thị. 2. Backend tạo tài khoản, mã hóa mật khẩu bcrypt saltRounds=10 [ref: f2t-backend/src/modules/users/users.service.ts:18]. 3. Hệ thống gửi mã OTP qua email. 4. Người dùng nhập OTP để xác thực. 5. Hệ thống cấp JWT access token + refresh token. |
| **Ngoại lệ** | Email đã tồn tại → trả HTTP 409. OTP hết hạn → yêu cầu gửi lại. Mật khẩu không đủ mạnh → trả HTTP 422 với chi tiết lỗi. |

---

**UC-02: Đặt hàng**

| Thuộc tính | Nội dung |
|---|---|
| **Tác nhân** | Consumer (đã đăng nhập) |
| **Tiền điều kiện** | Consumer đã xác thực JWT; giỏ hàng có ít nhất 1 sản phẩm còn hàng |
| **Hậu điều kiện** | Đơn hàng tạo thành công với trạng thái `pending`; snapshot giá được nhúng vào đơn hàng |
| **Luồng chính** | 1. Consumer xem giỏ hàng với giá động hiện tại (qua interceptor). 2. Consumer xác nhận đặt hàng. 3. Backend tạo Order document, nhúng snapshot OrderItem gồm `productId`, `quantity`, `unitPrice` (giá tại thời điểm đặt) [ref: f2t-backend/src/modules/orders/schemas/order.schema.ts:128-138]. 4. Trạng thái đơn chuyển sang `pending`. 5. Farm nhận push notification về đơn mới. |
| **Ngoại lệ** | Sản phẩm hết hàng → trả HTTP 422. JWT hết hạn → refresh tự động. Lỗi mạng → đơn chưa tạo, giỏ hàng giữ nguyên. |

---

**UC-03: Thanh toán Stripe**

| Thuộc tính | Nội dung |
|---|---|
| **Tác nhân** | Consumer |
| **Tiền điều kiện** | Đơn hàng đang ở trạng thái `pending`; Consumer có thẻ thanh toán hợp lệ |
| **Hậu điều kiện** | Stripe xác nhận thanh toán; đơn hàng chuyển sang `confirmed`; Farm nhận thông báo |
| **Luồng chính** | 1. Consumer khởi tạo thanh toán → backend gọi `stripe.checkout.sessions.create` [ref: f2t-backend/src/modules/payments/payments.service.ts:102]. 2. Backend trả URL Stripe Checkout. 3. Consumer hoàn thành thanh toán trên Stripe. 4. Stripe gửi webhook `checkout.session.completed` đến `POST /payments/webhook` [ref: f2t-backend/src/modules/payments/payments.service.ts:120-138]. 5. Backend xác thực webhook signature và cập nhật trạng thái đơn hàng. |
| **Ngoại lệ** | Thẻ bị từ chối → Stripe trả lỗi, đơn giữ trạng thái `pending`. Webhook không hợp lệ (signature sai) → HTTP 400, bỏ qua. Timeout Stripe → retry webhook tự động do Stripe. |

---

**UC-04: Theo dõi giao hàng GHN**

| Thuộc tính | Nội dung |
|---|---|
| **Tác nhân** | Consumer, Farm Owner |
| **Tiền điều kiện** | Đơn hàng đã `confirmed`; vận đơn GHN đã tạo hoặc đang dùng fallback Dijkstra |
| **Hậu điều kiện** | Người dùng xem được trạng thái giao hàng hiện tại |
| **Luồng chính** | 1. Người dùng xem chi tiết đơn hàng. 2. Backend kiểm tra `ghnOrderCode` trong document. 3. Nếu có GHN code: gọi `ghnProvider.getTracking` → trả trạng thái thực từ GHN API. 4. Nếu không có GHN code (fallback demo): backend chạy thuật toán Dijkstra trên graph 10 node HCMC hardcoded, trả route mô phỏng với `trackingCode: 'GHN-ALGO-F2T-99'` [ref: f2t-backend/src/modules/delivery/delivery.service.ts:131,232; ledger t2.2-stripe-ghn]. |
| **Ngoại lệ** | GHN API không phản hồi → graceful degrade: trả DB data có `ghnOrderCode` thay vì crash [ref: f2t-backend/src/modules/delivery/delivery.service.ts:255-278]. |

---

**UC-05: Định giá động / Gợi ý giá**

| Thuộc tính | Nội dung |
|---|---|
| **Tác nhân** | Hệ thống (cron), Farm Owner (phê duyệt) |
| **Tiền điều kiện** | Sản phẩm đã đăng; sidecar FastAPI đang chạy trên port 8000 |
| **Hậu điều kiện** | PriceOverride mới ghi vào MongoDB; Farm nhận thông báo đề xuất giá; Consumer nhận giá mới qua interceptor |
| **Luồng chính** | 1. Cron `"0 * * * *"` kích hoạt `runPricingTick` [ref: f2t-backend/src/modules/dynamic-pricing/pricing-tick.cron.ts:18]. 2. Backend thu thập state vector 10 chiều cho từng sản phẩm. 3. Gọi sidecar `POST /predict` [ref: pricing-sidecar/main.py:277]. 4. Sidecar chạy DDQN → Safety Layer 5 quy tắc (thứ tự 3→4→1→2→5) [ref: pricing-sidecar/safety.py:1-19; ledger t1.4-safety-5-rules] → trả `targetPrice` và `delta_pct`. 5. Backend ghi PriceOverride với status `pending_review`. 6. Farm nhận push notification. 7. Farm chấp nhận → status chuyển `accepted`; từ chối → `rejected`. |
| **Ngoại lệ** | Sidecar không phản hồi → `catch` block trả null, không ghi PriceOverride [ref: f2t-backend/src/modules/dynamic-pricing/dynamic-pricing.service.ts:283-285]. Category không xác định → sidecar bỏ qua sản phẩm đó. |

---

**UC-06: Dự báo nhu cầu**

| Thuộc tính | Nội dung |
|---|---|
| **Tác nhân** | Farm Owner |
| **Tiền điều kiện** | Farm Owner đã đăng nhập; sản phẩm có danh mục hợp lệ (fruit/vegetable/herbs/root) |
| **Hậu điều kiện** | Dashboard hiển thị tổng nhu cầu dự kiến 7 ngày và xác suất thất thoát |
| **Luồng chính** | 1. Farm Owner mở dashboard sản phẩm. 2. Frontend gọi API dự báo. 3. Backend `DemandForecastingService` gọi `POST /forecast` [ref: f2t-backend/src/modules/demand-forecasting/demand-forecasting.service.ts:43]. 4. Sidecar chạy `_run_forecaster` → `ForecasterLSTM` → tile obs 21× → trả `{demand7d, pWaste}` [ref: pricing-sidecar/main.py:128-145]. 5. Backend trả kết quả về frontend. 6. Dashboard hiển thị tổng nhu cầu 7 ngày và xác suất thất thoát. |
| **Ngoại lệ** | Sidecar không phản hồi → trả `demand7d=0.0` (fallback hardcoded) [ref: pricing-sidecar/main.py:131-132]. Category không hợp lệ → HTTP 422 từ sidecar. |

---

### 3.3.5. Biểu đồ tuần tự

Hệ thống F2T có tổng cộng **9 biểu đồ tuần tự**: 6 biểu đồ mô tả luồng e-commerce chính và **3 biểu đồ AI/ML** mô tả tương tác giữa NestJS backend và FastAPI sidecar. Các biểu đồ được thiết kế bám sát cấu trúc call stack thực tế trong code.

**Nhóm E-commerce (6 biểu đồ):**

**SD-01: Đăng nhập và JWT refresh** (xem Hình sd-01-login-jwt.puml) — Mô tả luồng Consumer gửi credentials → AuthService xác thực, `bcrypt.compare` hash → cấp `accessToken` + `refreshToken`. Luồng refresh: khi access token hết hạn, client gửi refresh token → backend cấp access token mới mà không yêu cầu đăng nhập lại.

**SD-02: Đăng ký tài khoản** (xem Hình sd-02-register.puml) — Mô tả luồng nhập form → backend tạo user với `bcrypt.hash(password, 10)` [ref: f2t-backend/src/modules/users/users.service.ts:18] → gửi OTP email → người dùng xác thực → hệ thống đánh dấu `emailVerified=true`.

**SD-03: Tìm kiếm theo vị trí địa lý** (xem Hình sd-03-search-geo.puml) — Mô tả Consumer cung cấp tọa độ → backend thực hiện MongoDB `$near` query với chỉ mục 2dsphere → trả danh sách sản phẩm theo khoảng cách. `DynamicPricingInterceptor` tự động bổ sung `dynamicPrice`, `freshnessScore`, `priceTag` vào mỗi phần tử kết quả [ref: f2t-backend/src/common/interceptors/dynamic-pricing.interceptor.ts:74-77].

**SD-04: Tạo đơn hàng** (xem Hình sd-04-create-order.puml) — Mô tả Consumer xác nhận giỏ hàng → backend kiểm tra tồn kho → tạo Order document với OrderItem embedded (snapshot giá tại thời điểm đặt, tránh drift giá) [ref: f2t-backend/src/modules/orders/schemas/order.schema.ts:128-138] → đơn hàng trạng thái `pending` → push notification đến Farm.

**SD-05: Thanh toán Stripe Checkout** (xem Hình sd-05-stripe-checkout.puml) — Mô tả luồng đầy đủ: Consumer khởi tạo thanh toán → backend gọi `stripe.checkout.sessions.create` với line\_items từ order items [ref: f2t-backend/src/modules/payments/payments.service.ts:102] → trả URL Stripe → Consumer hoàn thành thanh toán trên Stripe → Stripe gọi webhook `POST /payments/webhook` → backend `stripe.webhooks.constructEvent` [ref: f2t-backend/src/modules/payments/payments.service.ts:126] → cập nhật trạng thái đơn hàng.

**SD-06: Tạo vận đơn GHN và Dijkstra fallback** (xem Hình sd-06-ghn-dijkstra.puml) — Mô tả hai nhánh: (1) Khi đơn đã có GHN code, backend gọi `ghnProvider.createOrder` → `POST ${GHN_API}/v2/shipping-order/create` [ref: f2t-backend/src/modules/delivery/providers/ghn.provider.ts:73; ledger t2.2-stripe-ghn] (nhánh kích hoạt fallback khi chưa có GHN code được quyết định tại [ref: f2t-backend/src/modules/delivery/delivery.service.ts:98]); (2) Khi chưa có GHN code (fallback demo), backend chạy thuật toán Dijkstra trên graph 10 node HCMC hardcoded, trả route mô phỏng với `trackingCode: 'GHN-ALGO-F2T-99'` [ref: f2t-backend/src/modules/delivery/delivery.service.ts:131,232]. Cần lưu ý rằng fallback Dijkstra là minh họa học thuật, không phải routing production — trong triển khai thực tế, toàn bộ đơn hàng đều dùng GHN API thật.

**Nhóm AI/ML (3 biểu đồ tuần tự):**

**SD-ML-01: PricingTickCron — chu kỳ định giá mỗi giờ** (xem Hình sd-ml-01-pricing-cron.puml) — Mô tả `PricingTickCron` kích hoạt theo lịch cron `"0 * * * *"` [ref: f2t-backend/src/modules/dynamic-pricing/pricing-tick.cron.ts:18]. Backend thu thập state sản phẩm (freshness, inventory, giá, competitor) → gọi `POST /predict` hàng loạt → DDQN `SharedMLPDuelingQNet` chọn action trong 11 phần tử CANDIDATES [ref: ledger t0.2-action-space] → Safety Layer 5 quy tắc kiểm tra và clip → ghi `PriceOverride` status `pending_review` → push notification đến Farm → Farm chấp nhận (`accepted`) hoặc từ chối (`rejected`).

**SD-ML-02: Dự báo nhu cầu theo yêu cầu** (xem Hình sd-ml-02-forecast.puml) — Mô tả Farm Owner mở dashboard → frontend gọi API → backend `DemandForecastingService` gọi `POST /forecast` trên sidecar port 8000 [ref: f2t-backend/src/modules/demand-forecasting/demand-forecasting.service.ts:43] → sidecar nhận state vector → `_run_forecaster` tile obs 21× → `ForecasterLSTM` forward pass (LSTM 2 lớp, hidden 128, dual-head) → trả `{demand7d, pWaste}` [ref: pricing-sidecar/main.py:263] → backend trả kết quả → dashboard hiển thị dự báo 7 ngày và xác suất thất thoát.

**SD-ML-03: Chu kỳ định giá chi tiết — DDQN và Safety Layer** (xem Hình sd-ml-03-pricing-detail.puml) — Mô tả chi tiết hơn SD-ML-01, tập trung vào luồng xử lý trong sidecar: state vector 10 chiều [ref: pricing-sidecar/main.py:114-125] → `SharedMLPDuelingQNet` forward với `obs_t`, `cat_t`, `mask_t` → `compute_mask` dựa trên freshness/category [ref: ledger t0.2-action-space] → `argmax(Q)` chọn action → Safety Layer `apply_safety` áp 5 quy tắc thứ tự 3→4→1→2→5 [ref: pricing-sidecar/safety.py:1-19; ledger t1.4-safety-5-rules] → trả `{targetPrice, delta_pct, safety_clipped}` [ref: pricing-sidecar/main.py:277].

### 3.3.6. Biểu đồ hoạt động

Hệ thống F2T có 4 biểu đồ hoạt động mô tả logic rẽ nhánh và điều kiện chuyển trạng thái của các quy trình quan trọng nhất: 2 biểu đồ e-commerce và 2 biểu đồ AI/ML.

**AD-01: Vòng đời đơn hàng** (xem Hình ad-01-order-lifecycle.puml) — Biểu đồ hoạt động mô tả vòng đời đầy đủ của một đơn hàng qua 7 trạng thái enum được định nghĩa tường minh trong schema [ref: f2t-backend/src/modules/orders/schemas/order.schema.ts:128-138]:

1. `pending` — Đơn vừa được tạo, chờ xác nhận từ Farm.
2. `confirmed` — Farm xác nhận đơn hàng (thường sau khi Stripe webhook thành công).
3. `preparing` — Farm đang chuẩn bị hàng.
4. `ready_for_pickup` — Hàng sẵn sàng để GHN lấy.
5. `shipped` — GHN đã lấy hàng, đang giao.
6. `delivered` — Người dùng đã nhận hàng.
7. `cancelled` — Đơn hàng bị hủy (từ bất kỳ trạng thái nào trước `shipped`).

Biểu đồ thể hiện hai nhánh song song quan trọng: nhánh thanh toán Stripe (Consumer) và nhánh xử lý đơn (Farm). Trạng thái `cancelled` là nút cuối của nhánh ngoại lệ, có thể đến từ `pending`, `confirmed` hoặc `preparing`.

**AD-02: Xác thực JWT** (xem Hình ad-02-jwt.puml) — Biểu đồ mô tả luồng xác thực stateless của hệ thống. Khi client gửi request với access token: `JwtAuthGuard` [ref: f2t-backend/src/modules/auth/guards/jwt-auth.guard.ts:1-5] xác thực chữ ký và thời gian hết hạn. Nếu token còn hạn → request tiếp tục. Nếu token hết hạn → client gửi refresh token → backend cấp access token mới → client thử lại request gốc. Nếu refresh token cũng hết hạn hoặc không hợp lệ → HTTP 401, yêu cầu đăng nhập lại.

**AD-ML-01: Luồng suy luận ForecasterLSTM** (xem Hình ad-ml-01-forecaster.puml) — Biểu đồ mô tả quy trình inference của mô hình dự báo nhu cầu. Bắt đầu từ request `/forecast`: (1) Kiểm tra `forecaster_net is None` — nếu chưa load trả `(0.0, 0.0)` [ref: pricing-sidecar/main.py:131-132]; (2) Xây dựng vector quan sát 10 chiều từ state vector; (3) Tile obs 21× tạo cửa sổ thời gian `(21, 10)` [ref: pricing-sidecar/main.py:135]; (4) ForecasterLSTM forward pass: LSTM encoder 2 lớp (hidden=128) → hidden state → dual-head: `demand_head` và `waste_head`; (5) `max(0.0, demand)` clip giá trị âm; `sigmoid(waste_logit)` cho xác suất thất thoát [ref: pricing-sidecar/main.py:140-141]; (6) Nếu exception (lỗi tensor, OOM) → catch, log warning, trả `(0.0, 0.0)` [ref: pricing-sidecar/main.py:143-145]. Điểm giới hạn cần ghi nhận: do backend chưa cung cấp chuỗi 21 ngày lịch sử thực, sidecar tile obs hiện tại 21× (steady-state), do đó LSTM không quan sát temporal dynamics thực sự — đây là hạn chế của triển khai hiện tại.

**AD-ML-02: Suy luận DDQN kết hợp Safety Layer** (xem Hình ad-ml-02-ddqn-safety.puml) — Biểu đồ mô tả quy trình định giá đầy đủ, bao gồm DDQN và Safety Layer 5 quy tắc với thứ tự áp dụng bắt buộc [ref: pricing-sidecar/safety.py:1-19; ledger t1.4-safety-5-rules]:

1. Nhận state vector → xây dựng obs 10 chiều.
2. `compute_mask(freshness, category)` → vector bool 11 chiều mask các action không hợp lệ.
3. `SharedMLPDuelingQNet.forward(obs_t, cat_t, mask_t)` → Q-values 11 chiều (masked).
4. `argmax(Q[mask])` → `action_idx` → `delta = CANDIDATES[action_idx]`.
5. `price_raw = base_price * (1 + delta)`.
6. **Safety Layer áp thứ tự 3→4→1→2→5:**
   - **Quy tắc 3** (tick clip): `price ∈ [base×0.70, base×1.20]` — giới hạn biến động mỗi chu kỳ.
   - **Quy tắc 4** (freshness mandate): nếu `freshness < 0.4` thì `price ≤ base×0.75` — ép giảm giá hàng gần hết hạn.
   - **Quy tắc 1** (cost floor): `price ≥ base×0.55` — sàn tránh bán lỗ.
   - **Quy tắc 2** (price ceiling): `price ≤ base×2.0` — trần tránh thổi giá.
   - **Quy tắc 5** (minimum viable): `price ≥ 1000` VND — giá tối thiểu tuyệt đối.
7. Nếu `clipped_price ≠ original_price` → `safety_clipped=True`.
8. Trả `{targetPrice, delta_pct, safety_clipped}` về backend.

Thứ tự 3→4→1→2→5 không tùy tiện: Quy tắc 3 thiết lập biên tick trước, Quy tắc 4 override biên đó khi hàng sắp hỏng, sau đó Quy tắc 1 và 2 bảo vệ biên tuyệt đối, cuối cùng Quy tắc 5 đảm bảo giá có nghĩa kinh tế [ref: pricing-sidecar/safety.py:1-19].

### 3.3.7. Thuật toán chi tiết các module AI/ML

#### (a) Dự báo nhu cầu

Mô-đun dự báo nhu cầu trong F2T được xây dựng trên kiến trúc **ForecasterLSTM** — một mạng nơ-ron hồi tiếp với hai lớp LSTM xếp chồng, được thiết kế để xử lý chuỗi trạng thái thị trường theo cửa sổ thời gian. Kiến trúc cụ thể bao gồm: LSTM 2 lớp, kích thước ẩn (`hidden_size`) 128 đơn vị, hệ số dropout 0,2 (áp dụng giữa các lớp LSTM), và kích thước đầu vào (`input_size`) bằng `obs_dim = 10` — khớp chính xác với vector quan sát 10 chiều của môi trường sau lần huấn luyện lại T0.13 [ref: dynamic-pricing-final/src/forecaster/model.py:9,23-29]. Cửa sổ thời gian đầu vào có độ dài `window = 21` bước, tạo ra tensor đầu vào có hình dạng `(batch, 21, 10)` [ref: dynamic-pricing-final/src/forecaster/model.py:13].

Bên cạnh chuỗi trạng thái, mô hình còn tích hợp thông tin danh mục hàng hoá thông qua một lớp nhúng học được (`nn.Embedding(n_categories=4, cat_embed_dim=8)`) [ref: dynamic-pricing-final/src/forecaster/model.py:22]. Vector nhúng danh mục (8 chiều) được ghép nối (`concat`) với trạng thái ẩn cuối cùng của LSTM (128 chiều), tạo ra vector tổng hợp `z` có số chiều `z_dim = 128 + 8 = 136` chiều. Vector `z` này là đầu vào chung cho hai nhánh đầu ra song song (**dual-head**):

- **`demand_head`**: lớp tuyến tính `Linear(136, 1)` — dự báo nhu cầu tổng hợp 7 ngày tới (đơn vị tương đối so với `base_demand`).
- **`waste_head`**: chuỗi `Linear(136, 64) → ReLU → Dropout(0.2) → Linear(64, 1)` — dự báo log-odds xác suất lãng phí (`waste_logit`); sidecar lấy `sigmoid(waste_logit)` để chuyển về xác suất `p_waste ∈ (0, 1)`.

Hàm `forward` trả về từ điển `{"demand": Tensor, "waste_logit": Tensor}` [ref: dynamic-pricing-final/src/forecaster/model.py:46-49], trong đó `demand` và `waste_logit` đều có hình dạng `(batch,)`.

**Luồng phục vụ (serve):** Khi Farm xem dự báo nhu cầu, backend gọi `DemandForecastingService`, dịch vụ này gửi yêu cầu POST đến endpoint `/forecast` trên sidecar FastAPI (cổng 8000) [ref: pricing-sidecar/main.py:263-274]. Sidecar nhận vector trạng thái, gọi hàm `_build_obs(...)` để xây dựng vector quan sát 10 chiều, rồi chuyển tiếp sang hàm `_run_forecaster(obs, category)` [ref: pricing-sidecar/main.py:128-137]. Bên trong `_run_forecaster`, sidecar load checkpoint `forecaster_v4_best.pt`, khởi tạo `ForecasterLSTM` theo cấu hình lưu trong checkpoint, rồi thực hiện suy luận để trả về cặp `(demand7d, p_waste)` [ref: pricing-sidecar/main.py:128-145].

**Giới hạn kỹ thuật (trạng thái sau retrain T0.13):** Sau khi huấn luyện lại với `obs_dim = 10`, lỗi không khớp layout (`11 ≠ 10`) đã được giải quyết hoàn toàn — thao tác pad/slice tại `main.py:134` nay là no-op vì `forecaster_obs_dim = 10 = len(obs)` [ref: pricing-sidecar/main.py:134]. Giới hạn duy nhất còn tồn tại là cách sidecar xây dựng đầu vào chuỗi: thay vì cung cấp 21 vector quan sát từ 21 ngày thực sự khác nhau, sidecar **tile-21×** cùng một vector trạng thái hiện tại (`np.tile(obs_padded, (OBS_WINDOW, 1))`) [ref: pricing-sidecar/main.py:135], do backend chưa lưu trữ và cung cấp chuỗi lịch sử 21 ngày. Hậu quả là LSTM nhận 21 hàng đầu vào giống hệt nhau — được gọi là chế độ **steady-state** — và không quan sát được biến động thời gian thực. Kết quả từ endpoint `/forecast` do đó là xấp xỉ; đánh giá tin cậy cần chạy offline bằng script `dynamic-pricing-final/src/forecaster/eval.py` với chuỗi trạng thái thực [ref: pricing-sidecar/main.py:134-135; ledger t0.4-forecaster-parity, t0.10-thesis-limitations].

#### (b) Định giá động

Mô-đun định giá động trong F2T sử dụng thuật toán **Double DQN (DDQN)** với kiến trúc mạng Dueling, được huấn luyện trong môi trường mô phỏng thị trường nông sản tươi. Toàn bộ pipeline bao gồm ba thành phần thiết kế chính: không gian trạng thái 10 chiều, không gian hành động rời rạc 11 phần tử, và mạng `SharedMLPDuelingQNet` dùng chung cho bốn danh mục hàng hoá.

**Không gian trạng thái — 10 chiều:**

| Chiều | Tên | Công thức / Nguồn |
|---|---|---|
| 0 | `freshness` | Điểm tươi ∈ [0, 1] từ CoreML |
| 1 | `inv_ratio` | `min(availableQty / 100, 2.0)` |
| 2 | `sin(2π·dow/7)` | Chu kỳ tuần (thành phần sin) |
| 3 | `cos(2π·dow/7)` | Chu kỳ tuần (thành phần cos) |
| 4 | `days_to_restock/30` | Ngày đến đợt nhập hàng, chuẩn hoá theo 30 |
| 5 | `demand_ratio` | `(demand_7d / 7) / base_demand`, clip [0, 3] |
| 6 | `prev_delta` | Delta giá chu kỳ trước, clip [−0.30, +0.20] |
| 7 | `comp_ratio` | `competitor_ref_price / max(current_price, 1e−6)` |
| 8 | `days_to_waste/14` | Ngày còn lại đến ngưỡng lãng phí, chuẩn hoá theo 14 |
| 9 | `inv_coverage/3` | Tồn kho / tổng cầu 7 ngày, chuẩn hoá theo 3 |

[ref: pricing-sidecar/main.py:114-125; ledger t0.3-obs-parity]

**Không gian hành động — 11 phần tử:** Tập hành động được định nghĩa là `CANDIDATES = np.linspace(-0.30, 0.20, 11)`, tạo ra 11 mức delta giá cách đều nhau 0,05: [−0.30, −0.25, −0.20, −0.15, −0.10, −0.05, 0.00, +0.05, +0.10, +0.15, +0.20]. Phần tử thứ 7 (chỉ số 6) được cố định bằng 0,0 để đảm bảo hành động giữ nguyên giá chính xác tuyệt đối (`CANDIDATES[6] = 0.0`) [ref: dynamic-pricing-final/src/rl/reward.py:6-7; ledger t0.2-action-space].

**Kiến trúc mạng — SharedMLPDuelingQNet:** Mạng chia sẻ một bộ mã hoá MLP cho toàn bộ bốn danh mục, tránh phải duy trì bốn mạng riêng biệt. Thông tin danh mục được đưa vào qua lớp nhúng `nn.Embedding(n_cats=4, cat_embed_dim=8)` [ref: dynamic-pricing-final/src/rl/network.py:60-64], vector nhúng (8 chiều) được ghép nối với vector quan sát (10 chiều) trước khi đi qua các lớp chung. Cấu trúc đầy đủ:

- **Shared layers:** `Linear(10 + 8, 128) → ReLU → Linear(128, 128) → ReLU`
- **V-stream (giá trị trạng thái):** `Linear(128, 64) → ReLU → Linear(64, 1)` → ra `V(s)` vô hướng
- **A-stream (lợi thế hành động):** `Linear(128, 64) → ReLU → Linear(64, 11)` → ra `A(s, a)` vector 11 chiều
- **Tổng hợp Dueling:** `Q(s, a) = V(s) + A(s, a) − mean(A(s, ·))` [ref: dynamic-pricing-final/src/rl/network.py:51-81; ledger t0.2-ddqn-arch]

**Siêu tham số huấn luyện:**

| Tham số | Giá trị | Nguồn |
|---|---|---|
| Learning rate (`lr`) | 1×10⁻⁴ | `agent.py:L144`: `MultiCatDDQNAgent.__init__` `lr: float = 1e-4` |
| Hệ số chiết khấu (γ) | 0,99 | `agent.py:L145`: `gamma: float = 0.99` (gán `self.gamma` tại L154) |
| Kích thước batch | 256 | `agent.py:L146`: `batch_size: int = 256` |
| Warmup (min buffer) | 1 000 bước | `agent.py:L147`: `warmup: int = 1_000` |
| Dung lượng replay buffer | 50 000 | `agent.py:L148`: `buffer_capacity: int = 50_000` |
| ε ban đầu | 1,0 | `train.py:L12`: `EPSILON_START = 1.0` |
| ε kết thúc | 0,05 | `train.py:L13`: `EPSILON_END = 0.05` |
| Số episode decay ε | 2 000 | `train.py:L14`: `EPSILON_DECAY_EP = 2_000` |
| Chu kỳ đồng bộ target net | 500 bước | `train.py:L15`: `TARGET_SYNC_STEPS = 500` |

[ref: dynamic-pricing-final/src/rl/agent.py; dynamic-pricing-final/src/rl/train.py; ledger t1.8-ddqn-hyperparams]

Thuật toán cập nhật tuân theo nguyên lý Double DQN: mạng online chọn hành động tốt nhất ở trạng thái tiếp theo, mạng target đánh giá giá trị Q tương ứng. Mục tiêu Bellman `target = r + γ · (1 − done) · Q_target(s', argmax_a Q_online(s', a))` [ref: dynamic-pricing-final/src/rl/agent.py:236]. Hàm mất mát là Smooth L1 (Huber loss) [ref: dynamic-pricing-final/src/rl/agent.py:239]. Gradient được cắt (`clip_grad_norm_ = 10.0`) [ref: dynamic-pricing-final/src/rl/agent.py:243] trước khi cập nhật tham số bằng Adam optimizer [ref: dynamic-pricing-final/src/rl/agent.py:178].

**Safety Layer — 5 quy tắc theo thứ tự áp dụng 3→4→1→2→5:**

Sau khi mạng DDQN xuất ra delta giá đề xuất (`delta`), giá mục tiêu `target_price = base_price × (1 + delta)` được qua một tầng an toàn cứng trước khi ghi vào cơ sở dữ liệu. Năm quy tắc được áp dụng tuần tự, mỗi quy tắc có thể thu hẹp thêm khoảng giá hợp lệ [ref: pricing-sidecar/safety.py:1-19]:

| Thứ tự áp | Quy tắc | Điều kiện | Ràng buộc |
|---|---|---|---|
| 1 | **Quy tắc 3** — Tick-clip | Luôn áp | `price ∈ [base × 0.70, base × 1.20]` |
| 2 | **Quy tắc 4** — Freshness mandate | `freshness < 0.4` | `price ≤ base × 0.75` |
| 3 | **Quy tắc 1** — Sàn chi phí | Luôn áp | `price ≥ base × 0.55` |
| 4 | **Quy tắc 2** — Trần tuyệt đối | Luôn áp | `price ≤ base × 2.0` |
| 5 | **Quy tắc 5** — Giá tối thiểu | Luôn áp | `price ≥ 1 000 VND` |

Thứ tự 3→4→1→2→5 không tuỳ tiện: Quy tắc 3 (tick-clip) thiết lập biên bước tối đa [−30%, +20%] so với `base_price` trước tiên; Quy tắc 4 ghi đè giới hạn trên khi hàng sắp hỏng (freshness < 0,4), buộc giảm giá tối đa còn 75% base; Quy tắc 1 và 2 sau đó áp biên tuyệt đối [55%, 200%] độc lập với tick; cuối cùng Quy tắc 5 đảm bảo giá có ý nghĩa kinh tế (≥ 1 000 VND) [ref: pricing-sidecar/safety.py:6,8-10,12-13,15-16,18-19]. Trường hợp bất kỳ quy tắc nào thay đổi giá, sidecar trả về cờ `safety_clipped = true` trong phản hồi để backend ghi nhận.

Hệ thống vận hành theo chế độ **shadow** trong giai đoạn ban đầu — giá đề xuất được ghi vào collection `price_overrides` với trạng thái `shadow` và hiển thị cho Farm dưới dạng đề xuất tham khảo. Farm chủ động chấp nhận hoặc từ chối đề xuất; khi được chấp nhận, trạng thái chuyển sang `accepted` và `DynamicPricingInterceptor` phục vụ `dynamicPrice` này cho Consumer [ref: ledger t1.4-safety-5-rules].

#### (c) Phân loại độ tươi

Mô-đun phân loại độ tươi trong F2T dựa trên **Apple CoreML** — framework suy luận máy học tại thiết bị của Apple — với hai mô hình nhị phân riêng biệt được triển khai trong sidecar FastAPI:

- **`MyFreshnessClassifier-fruit.mlmodel`**: dùng cho các sản phẩm thuộc danh mục `fruit` và `fruits`.
- **`MyFreshnessClassifier-root.mlmodel`**: dùng cho tất cả danh mục còn lại, bao gồm `leafy`, `herbs`, và `root`.

Mapping danh mục sang mô hình được thực hiện tại `main.py:318`: `model_key = "fruit" if req.category in ("fruit", "fruits") else "root"` [ref: pricing-sidecar/main.py:318; ledger t1.4-freshness-coreml].

**Pipeline phân loại:** Endpoint FastAPI POST `/freshness/classify` [ref: pricing-sidecar/main.py:316-333] nhận ảnh sản phẩm ở định dạng base64. Sidecar giải mã ảnh, chuyển đổi không gian màu bằng `PIL.Image.convert("RGB")`, và resize về kích thước đầu vào `299 × 299` pixel [ref: pricing-sidecar/main.py:324]. Lưu ý: mặc dù metadata model khai báo `colorSpace = BGR`, coremltools phiên bản 9.0 không thực hiện hoán đổi kênh màu khi nhận ảnh PIL — do đó việc feed ảnh ở định dạng RGB là **đúng** và cho kết quả chính xác [ref: pricing-sidecar/main.py:324; ledger t0.9-fixes].

Kết quả suy luận từ lời gọi `model.predict({"image": img})` trả về từ điển có hai khoá: `target` (chuỗi `"fresh"` hoặc `"rotten"`) và `targetProbability` (từ điển chuỗi → xác suất float) [ref: pricing-sidecar/main.py:325-330; ledger t0.6-coreml-freshness]. Điểm tươi cuối cùng được tính là `score = targetProbability["fresh"]` — tức xác suất để nhãn dự đoán là `"fresh"` [ref: pricing-sidecar/main.py:330]. Giá trị `score ∈ (0, 1)` này được sử dụng trực tiếp làm chiều số 0 trong vector trạng thái 10 chiều của DDQN ở mỗi chu kỳ định giá. Phản hồi trả về backend gồm bốn trường: `{score, tag, label, confidence}`, trong đó `tag ∈ {"fresh", "aging", "critical"}` được phân loại theo ngưỡng `score ≥ 0.8 / ≥ 0.4` [ref: pricing-sidecar/main.py:332-333].

**Giới hạn kỹ thuật:** Hệ thống hiện chỉ có **2 trong 4 danh mục** được trang bị mô hình CoreML riêng (fruit và root); các danh mục `leafy` và `herbs` sử dụng chung mô hình root theo cơ chế fallback thiết kế cố ý. Ngoài ra, không có training script hay dataset ảnh nông sản tự thu thập — hai mô hình `.mlmodel` được tạo bằng Apple Create ML với dữ liệu không công khai, và quá trình huấn luyện không thuộc phạm vi hệ thống F2T. Đây là giới hạn cần công khai khi đánh giá độ tổng quát của mô hình [ref: ledger t0.10-thesis-limitations].

#### 3.3.7d. Cross-sell — Khai phá luật kết hợp FP-Growth

**Bài toán:** Cho giỏ hàng hiện tại của Consumer gồm tập category `C = {c₁, c₂, ...}`, tìm tập sản phẩm thuộc các category `C'` có xu hướng mua kèm cao nhất với `C`, theo thứ tự lift giảm dần, ưu tiên cùng trang trại.

**Pipeline offline (khai phá luật):**

```
Instacart 2017 orders.csv
    ↓ prepare_instacart.py
    map aisle → 10 category F2T (leafy/root/fruit/herbs/mushrooms/grains/dairy/eggs/honey/other)
    → baskets_category.parquet  (2,874,457 giỏ)
    ↓ mine_rules.py  (mlxtend FP-Growth)
    min_support=0.02, min_confidence=0.10
    xếp theo lift giảm dần
    → category_rules.json  (34 luật, 8 antecedent, 9 category)
    → category_popularity.json  (tần suất category)
```

[ref: recommender-final/scripts/prepare_instacart.py; recommender-final/scripts/mine_rules.py; recommender-final/README.md §"Actual warm-start run"]

**Kết quả khai phá** (warm-start Instacart 2017):
- Tổng giỏ: **2,874,457** | Luật hội tụ: **34** | Antecedent: **8** | Category hiện diện: **9**
- Sample rules tiêu biểu: herbs↔root (lift 1.94), mushrooms→root (lift 1.58), leafy→herbs (lift 1.38), dairy→eggs (lift 1.12)
- Popularity: fruit 0.71, leafy 0.60, dairy 0.59, root 0.32, eggs 0.16, herbs 0.11

**Serving (sidecar):** Recommender Sidecar nạp `category_rules.json` và `category_popularity.json` khi khởi động [ref: recommender-sidecar/main.py:17-33]. Endpoint `POST /recommend` lookup luật có antecedent⊆cart_categories, tính score = tổng lift của các luật match, fallback về popularity nếu không match [ref: recommender-sidecar/main.py:62-83]. Luồng đầy đủ xem Hình sd-cross-sell.

**Giới hạn thiết kế (bắt buộc ghi rõ):**
1. Category-level: luật chỉ định danh *loại* sản phẩm, không định danh sản phẩm cụ thể — cross-sell suggestions gợi ý theo category, không theo SKU.
2. Warm-start Instacart ≠ F2T thật: luật học từ hành vi siêu thị Mỹ (US grocery), cần retrain GĐ2 trên đơn hàng F2T thật để phản ánh đúng thói quen mua rau sạch Việt Nam.
3. Chưa đánh giá precision@k / recall — hiện chỉ có thống kê mô tả luật (34 luật, lift values); đánh giá online A/B test thuộc phạm vi GĐ2.

### 3.3.8. Module Reviews (Đánh giá sản phẩm)

Module `reviews` cung cấp chức năng đánh giá sản phẩm, liên kết chặt chẽ với module `orders` (ràng buộc `orderId`) và module `products` (cập nhật aggregated rating).

**Controller** `ReviewsController` phơi bày 4 endpoint tại `/api/reviews` [ref: f2t-backend/src/modules/reviews/reviews.controller.ts:27]:
- `GET /api/reviews` — truy vấn danh sách review theo `productId`, phân trang [ref: :31].
- `GET /api/reviews/my` — lấy review của người dùng đang đăng nhập [ref: :37].
- `POST /api/reviews` — tạo review mới; body yêu cầu `productId`, `orderId`, `rating` (1–5), `comment` (max 500 ký tự); tùy chọn `photos` (mảng URL) [ref: :45].
- `DELETE /api/reviews/:id` — xóa review (chỉ chủ sở hữu hoặc admin) [ref: :53].

**Service** `ReviewsService` sau khi tạo review thành công: thực hiện aggregation MongoDB để tính lại `averageRating` và `reviewCount` trên collection `products`.

**Schema** `Review` [ref: f2t-backend/src/modules/reviews/schemas/review.schema.ts]:

| Trường | Kiểu | Ràng buộc |
|--------|------|-----------|
| `productId` | ObjectId | required, ref Product — L20 |
| `orderId` | ObjectId | required, ref Order — L23 |
| `customerId` | ObjectId | required, ref User — L26 |
| `customerName` | String | required — L29 |
| `customerAvatarUrl` | String | optional — L32 |
| `rating` | Number | required, min 1 – max 5 — L35 |
| `comment` | String | required, maxlength 500 — L38 |
| `photos` | String[] | default [] — L41 |
| `createdAt`, `updatedAt` | Date | auto (timestamps: true) |

Index: `{ productId: 1 }` — truy vấn theo sản phẩm [ref: :46]; `{ customerId: 1 }` — truy vấn review của người dùng [ref: :47].

Schema `Product` được bổ sung 2 trường [ref: f2t-backend/src/modules/products/schemas/product.schema.ts]:
- `averageRating: Number` (default 0) — L141
- `reviewCount: Number` (default 0) — L144

**Frontend:** Consumer đánh giá tại màn hình `products/add-review.tsx` sau khi nhận đơn. Review list hiển thị trực tiếp trên trang chi tiết sản phẩm qua component `components/products/product-reviews.tsx`. Admin quản lý review tại `admin/reviews.tsx`.

---

### 3.3.9. Module Recommendations (Cross-sell)

Module `recommendations` hiện thực chức năng gợi ý sản phẩm "thường mua kèm" trong giỏ hàng dựa trên FP-Growth association rules (category-level).

**Controller** `RecommendationsController` [ref: f2t-backend/src/modules/recommendations/recommendations.controller.ts:11]:

```
GET /api/recommendations/cross-sell?productIds=<ids>&limit=6
```

Endpoint bảo vệ bởi `JwtAuthGuard` [ref: :15]. Nhận `productIds` (comma-separated), trả mảng `Product` gợi ý.

**Service** `RecommendationsService.getCrossSell()` thực hiện pipeline 4 bước [ref: f2t-backend/src/modules/recommendations/recommendations.service.ts:23]:
1. Trích xuất category từ productIds (truy vấn MongoDB `products` collection, field `category` và `farmId`).
2. Gọi `recommender-sidecar :8001/recommend` với `{cart_categories, top_k}`. Timeout 5000ms [ref: :48]. Nếu sidecar không phản hồi: fallback graceful — `logger.warn` + trả sản phẩm cùng farm, không throw 500 [ref: :56].
3. Lọc tồn kho: chỉ giữ sản phẩm có `status ∈ {available, seasonal}` và `availableQuantity > 0`; bỏ sản phẩm đã có trong giỏ [ref: :70-72].
4. Re-rank: sản phẩm cùng trang trại với sản phẩm trong giỏ được nhân hệ số `FARM_BOOST = 1.5` [ref: :10,86-87]. Sắp xếp giảm dần theo score, trả top 6 [ref: :89-90].

**Recommender Sidecar** `recommender-sidecar/main.py`:
- Nạp `category_rules.json` và `category_popularity.json` từ `recommender-final/model/` lúc khởi động qua hàm `_load()` [ref: recommender-sidecar/main.py:17-35].
- `POST /recommend` [ref: :61]: lookup luật antecedent⊆cart_categories, tính score = lift (cộng dồn qua các antecedents), dedup consequent, fallback về popularity nếu không có luật match.
- **Không truy cập MongoDB** — hoàn toàn stateless.

**Cấu hình:** `RECOMMENDER_SIDECAR_URL` (env, default `http://localhost:8001`) đăng ký trong `f2t-backend/src/app.module.ts` [ref: f2t-backend/src/app.module.ts:60].

**Frontend:** Component `CrossSell` trong `f2t-frontend/src/components/cart/cross-sell.tsx` render danh sách "Thường mua kèm". Được gọi trong màn hình giỏ hàng `(app)/cart.tsx`.

---

## 3.4. Phân tích, thiết kế cơ sở dữ liệu

### 3.4.1. Sơ đồ quan hệ thực thể (ERD)

Cơ sở dữ liệu của hệ thống F2T được xây dựng trên MongoDB và bao gồm đúng **10 collection** [ref: ledger t1.4-collections], trong đó 8 collection phục vụ nghiệp vụ chính và 2 collection chuyên biệt cho module AI/ML định giá động. Toàn bộ quan hệ giữa các thực thể được hình thức hóa trong sơ đồ ERD (xem Hình erd.puml).

**Cấu trúc tổng quan 10 thực thể và 10 quan hệ:**

Thực thể trung tâm là **users** — biểu diễn cả ba vai trò Consumer, Farm Owner và Admin thông qua trường `role` enum. Từ thực thể này, năm quan hệ tỏa ra:

1. **users → farms (1-N):** Trường `Farm.ownerId` tham chiếu `User._id` — mỗi trang trại thuộc về đúng một người dùng có vai trò `'farm'` [ref: f2t-backend/src/modules/farms/schemas/farm.schema.ts:L51-52].
2. **users → orders (1-N):** Trường `Order.customerId` tham chiếu `User._id` — mỗi đơn hàng được đặt bởi đúng một Consumer [ref: f2t-backend/src/modules/orders/schemas/order.schema.ts:L99-100].
3. **users → notifications (1-N):** Trường `Notification.userId` tham chiếu `User._id` — thông báo gửi đến từng người dùng [ref: f2t-backend/src/modules/notifications/schemas/notification.schema.ts:L20-21].
4. **users → notification_preferences (1-1):** Trường `NotificationPreferences.userId` tham chiếu `User._id` với ràng buộc `unique: true` — mỗi người dùng có đúng một bộ tùy chọn thông báo [ref: f2t-backend/src/modules/notifications/schemas/notification-preferences.schema.ts:L20-24].
5. **users → posts (1-N):** Trường `Post.authorId` tham chiếu `User._id`; trường `Post.farmId` (tùy chọn) tham chiếu `Farm._id` khi bài đăng thuộc về một trang trại cụ thể [ref: f2t-backend/src/modules/posts/schemas/post.schema.ts:L76-77, L82-83].
6. **users → verification_tokens (1-N):** Trường `VerificationToken.userId` tham chiếu `User._id` — mỗi người dùng có thể có nhiều token xác minh email/điện thoại tại các thời điểm khác nhau [ref: f2t-backend/src/modules/auth/schemas/verification-token.schema.ts:L9-10].

Từ thực thể **farms**, một quan hệ tiếp tục phát sinh:

7. **farms → products (1-N):** Trường `Product.farmId` tham chiếu `Farm._id` — mỗi sản phẩm thuộc về đúng một trang trại [ref: f2t-backend/src/modules/products/schemas/product.schema.ts:L38-39].

Từ thực thể **products**, hai quan hệ kết nối sang module AI/ML:

8. **products → freshness_cache (1-1):** Trường `FreshnessCache.productId` tham chiếu `Product._id` với ràng buộc `unique: true` — mỗi sản phẩm có đúng một bản ghi cache kết quả phân loại độ tươi CoreML [ref: f2t-backend/src/modules/dynamic-pricing/schemas/freshness-cache.schema.ts:L26-27, L44].
9. **products → price_overrides (1-N):** Trường `PriceOverride.productId` tham chiếu `Product._id`; đồng thời `PriceOverride.farmId` tham chiếu `Farm._id` — mỗi đề xuất giá từ DDQN gắn với một sản phẩm và trang trại cụ thể [ref: f2t-backend/src/modules/dynamic-pricing/schemas/price-override.schema.ts:L19-22].

Quan hệ đặc biệt quan trọng về mặt thiết kế là:

10. **orders → OrderItem (embedded, 1-N):** Danh sách `items` trong collection `orders` là mảng các document `OrderItem` được nhúng trực tiếp (`@Schema({ _id: false })`), không phải collection riêng [ref: f2t-backend/src/modules/orders/schemas/order.schema.ts:L6-34, L105-106]. Mỗi `OrderItem` lưu trữ **snapshot thông tin sản phẩm tại thời điểm đặt hàng** — bao gồm `productName`, `pricePerUnit`, `unit`, `totalPrice`, `farmId` và `farmName` — để đảm bảo tính toàn vẹn lịch sử đơn hàng ngay cả khi thông tin sản phẩm sau đó bị thay đổi hoặc xóa.

Hệ thống **không** có các collection `recommendation_caches` hay `forecast_caches` — artifact cross-sell là file JSON (`category_rules.json`, `category_popularity.json`) nạp vào bộ nhớ sidecar lúc khởi động, không tạo collection MongoDB; kết quả dự báo được cache ở tầng Redis chứ không tạo collection riêng [ref: recommender-sidecar/main.py:17-29; ledger cross-sell-v1, t1.4-collections].

### 3.4.2. Chi tiết 10 collections

Mục này trình bày chi tiết cấu trúc field, kiểu dữ liệu, enum và quan hệ khóa ngoại của từng collection, được resolve trực tiếp từ 10 file schema trong codebase.

#### 8 collection nghiệp vụ chính

**Collection `users`** lưu trữ thông tin tài khoản của cả ba vai trò hệ thống [ref: f2t-backend/src/modules/users/schemas/user.schema.ts:L19-99].

| Field | Kiểu | Ràng buộc / Ghi chú |
|---|---|---|
| `_id` | ObjectId | PK tự sinh (Mongoose) |
| `email` | String | `unique: true`, `lowercase: true`, `trim: true` — L20-21 |
| `password` | String | bcrypt hash, `select: false` (không trả về mặc định) — L23-24 |
| `firstName` | String | `required: true` — L26-27 |
| `lastName` | String | `required: true` — L29-30 |
| `phoneNumber` | String | `required: true` — L32-33 |
| `avatarUrl` | String | default `''` — L35-36 |
| `role` | String | enum `['consumer', 'farm', 'admin']`, default `'consumer'` — L38-43 |
| `status` | String | enum `['active', 'suspended', 'pending']`, default `'active'` — L45-50 |
| `location` | Embedded Object | `{ coordinates: {latitude, longitude}, address: {street, city, zipCode, country} }`, `_id: false` — L52-78. **Đây là 1 địa chỉ embedded duy nhất, KHÔNG phải mảng `addresses[]`.** |
| `refreshToken` | String | `select: false` — L80-81 |
| `pushToken` | String | `select: false` — L83-84 |
| `emailVerified` | Boolean | default `false` — L86-87 |
| `phoneVerified` | Boolean | default `false` — L89-90 |
| `isBanned` | Boolean | default `false` — L95-96 |

Điểm thiết kế đáng chú ý: trường `location` được nhúng embedded với cấu trúc hai lớp — tọa độ số học (`coordinates`) và địa chỉ văn bản (`address`) — trong cùng một object. Không có mảng `addresses[]` đa địa chỉ trong schema.

**Collection `farms`** lưu thông tin trang trại, liên kết với `users` qua khóa ngoại `ownerId` [ref: f2t-backend/src/modules/farms/schemas/farm.schema.ts:L50-108].

| Field | Kiểu | Ràng buộc / Ghi chú |
|---|---|---|
| `_id` | ObjectId | PK tự sinh |
| `ownerId` | ObjectId | FK → `users._id`, `ref: 'User'`, `required: true` — L51-52 |
| `name` | String | `required: true`, `trim: true` — L54-55 |
| `description` | String | `required: true` — L57-58 |
| `location` | GeoJSON Point | `{ type: 'Point', coordinates: [lng, lat] }` — PointSchema L6-13. Hỗ trợ chỉ mục 2dsphere. |
| `address` | Embedded Object | `{ street, city, zipCode, country }`, `_id: false` — AddressSchema L17-25 |
| `contactEmail` | String | `required: true` — L66-67 |
| `contactPhone` | String | `required: true` — L69-70 |
| `deliveryMethods` | String[] | enum `['pickup', 'farm_delivery', 'both']` — L72-77 |
| `restockSchedule` | RestockScheduleItem[] | `[{ category, intervalDays }]` — L85-86 |
| `isActive` | Boolean | default `true` — L88-89 |
| `verificationStatus` | String | enum `['pending', 'verified', 'rejected']`, default `'pending'` — L106-107 |

**Collection `products`** lưu thông tin sản phẩm, liên kết với `farms` qua khóa ngoại `farmId` [ref: f2t-backend/src/modules/products/schemas/product.schema.ts:L37-142].

| Field | Kiểu | Ràng buộc / Ghi chú |
|---|---|---|
| `_id` | ObjectId | PK tự sinh |
| `farmId` | ObjectId | FK → `farms._id`, `ref: 'Farm'`, `required: true` — L38-39 |
| `name` | String | `required: true`, `trim: true` — L41-42 |
| `description` | String | `required: true` — L44-45 |
| `category` | String | enum 10 giá trị: `['leafy', 'root', 'fruit', 'herbs', 'mushrooms', 'grains', 'dairy', 'eggs', 'honey', 'other']` — L47-61 |
| `pricePerUnit` | Number | `required: true` — L67-68 |
| `unit` | String | enum `['kg', 'g', 'piece', 'bunch', 'box', 'bag', 'liter']` — L70-73 |
| `availableQuantity` | Number | `required: true`, default `0` — L76-77 |
| `minimumOrder` | Number | `required: true`, default `1` — L79-80 |
| `status` | String | enum `['available', 'sold_out', 'unavailable', 'seasonal']`, default `'available'` — L82-87 |
| `images` | String[] | Danh sách URL ảnh — L89-90 |
| `isOrganic` | Boolean | default `false` — L101-102 |
| `tags` | String[] | Nhãn tìm kiếm — L113-114 |
| `nutritionalInfo` | Embedded Object | `{ calories, protein, carbs, fat, fiber, vitamins[] }` — NutritionalInfo L7-14 |
| `estimatedShelfLife` | Number | Thời gian bảo quản (ngày) — L98-99 |
| `lastRestockedAt` | Date | Thời điểm nhập hàng gần nhất — L137-138 |

**Collection `orders`** lưu đơn hàng và chứa `OrderItem` embedded [ref: f2t-backend/src/modules/orders/schemas/order.schema.ts:L6-34, L95-241].

| Field | Kiểu | Ràng buộc / Ghi chú |
|---|---|---|
| `_id` | ObjectId | PK tự sinh |
| `orderNumber` | String | `unique: true`, `required: true` — L96-97 |
| `customerId` | ObjectId | FK → `users._id`, `ref: 'User'`, `required: true` — L99-100 |
| `farmId` | ObjectId | FK → `farms._id`, `ref: 'Farm'`, `required: true` — L102-103 |
| `items` | OrderItem[] | Mảng OrderItem **embedded** (`_id: false`) — L105-106. Snapshot tại thời điểm đặt hàng. |
| `subtotal` | Number | `required: true` — L111-112 |
| `deliveryFee` | Number | `required: true`, default `0` — L114-115 |
| `tax` | Number | `required: true`, default `0` — L117-118 |
| `total` | Number | `required: true` — L120-121 |
| `status` | String | enum 7 giá trị: `['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'shipped', 'delivered', 'cancelled']`, default `'pending'` — L126-138 |
| `paymentStatus` | String | enum `['pending', 'paid', 'failed', 'refunded']`, default `'pending'` — L141-146 |
| `paymentMethod` | String | enum `['cash', 'stripe']`, `required: true` — L148-149 |
| `stripeSessionId` | String | Tùy chọn, lưu session ID Stripe — L151-152 |
| `ghnOrderCode` | String | Tùy chọn, mã vận đơn GHN — L188-189 |
| `timeline` | OrderTrackingStep[] | Lịch sử chuyển trạng thái — L227-228 |

`OrderItem` là sub-schema embedded với `@Schema({ _id: false })` — không có `_id` riêng, không phải collection độc lập [ref: f2t-backend/src/modules/orders/schemas/order.schema.ts:L6-7]. Các field của OrderItem: `productId` (ObjectId, ref Product), `productName` (String), `productImage` (String), `quantity` (Number), `pricePerUnit` (Number), `unit` (String), `totalPrice` (Number), `farmId` (ObjectId, ref Farm), `farmName` (String) — tất cả là **snapshot** ghi nhận tại thời điểm đặt hàng [ref: order.schema.ts:L8-34].

**Collection `posts`** lưu bài đăng cộng đồng của Consumer và Farm Owner [ref: f2t-backend/src/modules/posts/schemas/post.schema.ts:L75-111].

| Field | Kiểu | Ràng buộc / Ghi chú |
|---|---|---|
| `_id` | ObjectId | PK tự sinh |
| `authorId` | ObjectId | FK → `users._id`, `ref: 'User'`, `required: true` — L76-77 |
| `authorRole` | String | enum `['consumer', 'farm']`, `required: true` — L79-80 |
| `farmId` | ObjectId | FK → `farms._id` (tùy chọn) — L82-83 |
| `title` | String | `required: true`, maxlength 200 — L85-86 |
| `body` | String | `required: true`, maxlength 2000 — L88-89 |
| `media` | MediaItem[] | `[{ url, type: ['image','video'], thumbnailUrl }]` — L91-92 |
| `tags` | Tag[] | `[{ id, type: ['consumer','farm'], name }]` — L94-95 |
| `hashtags` | String[] | Danh sách hashtag — L97-98 |
| `comments` | Comment[] | Bình luận embedded `[{ authorId, authorName, authorAvatarUrl, content }]` — L100-101 |
| `likesCount` | Number | default `0` — L103-104 |
| `commentsCount` | Number | default `0` — L106-107 |

**Collection `notifications`** lưu thông báo hệ thống gửi đến từng người dùng [ref: f2t-backend/src/modules/notifications/schemas/notification.schema.ts:L19-49].

| Field | Kiểu | Ràng buộc / Ghi chú |
|---|---|---|
| `_id` | ObjectId | PK tự sinh |
| `userId` | ObjectId | FK → `users._id`, `ref: 'User'`, `required: true` — L20-21 |
| `type` | String | enum theo `NotificationType` — L23 |
| `title` | String | `required: true` — L25-26 |
| `message` | String | `required: true` — L29-30 |
| `isRead` | Boolean | default `false` — L32-33 |
| `referenceId` | String | Tùy chọn, ID đối tượng liên quan (orderId, productId...) — L35-36 |
| `referenceType` | String | Tùy chọn, loại đối tượng (`'order'`, `'product'`, `'farm'`) — L38-39 |
| `data` | Mixed | Metadata bổ sung — L41-42 |
| `pushSent` | Boolean | default `false` — L44-45 |

**Collection `notification_preferences`** lưu tùy chọn thông báo của từng người dùng [ref: f2t-backend/src/modules/notifications/schemas/notification-preferences.schema.ts:L19-37].

| Field | Kiểu | Ràng buộc / Ghi chú |
|---|---|---|
| `_id` | ObjectId | PK tự sinh |
| `userId` | ObjectId | FK → `users._id`, `ref: 'User'`, `required: true`, **`unique: true`** — L20-26 |
| `emailNotifications` | Boolean | default `true` — L28 |
| `smsNotifications` | Boolean | default `true` — L29 |
| `pushNotifications` | Boolean | default `true` — L30 |
| `orderUpdates` | Boolean | default `true` — L31 |
| `promotions` | Boolean | default `false` — L32 |
| `newsletter` | Boolean | default `false` — L33 |

**Collection `verification_tokens`** lưu token xác minh email và điện thoại [ref: f2t-backend/src/modules/auth/schemas/verification-token.schema.ts:L8-26].

| Field | Kiểu | Ràng buộc / Ghi chú |
|---|---|---|
| `_id` | ObjectId | PK tự sinh |
| `userId` | ObjectId | FK → `users._id`, `ref: 'User'`, `required: true` — L9-10 |
| `token` | String | `required: true` — L12-13 |
| `type` | String | enum `['email', 'phone']`, `required: true` — L15-16 |
| `expiresAt` | Date | `required: true` — L18-19. Được dùng làm trường TTL index. |
| `used` | Boolean | default `false` — L21-22 |

#### 2 collection AI/ML định giá động

**Collection `freshness_cache`** lưu kết quả phân loại độ tươi từ CoreML cho từng sản phẩm [ref: f2t-backend/src/modules/dynamic-pricing/schemas/freshness-cache.schema.ts:L6-40].

| Field | Kiểu | Ràng buộc / Ghi chú |
|---|---|---|
| `_id` | ObjectId | PK tự sinh |
| `productId` | ObjectId | FK → `products._id`, `required: true`. Có **unique index** — L26-27, L44 |
| `readings` | FreshnessReading[] | Mảng lịch sử các lần scan: `[{ score: Number, scannedAt: Date }]` — L29-30. **Đây là cấu trúc đúng — KHÔNG phải mảng cố định 5 phần tử `scores[5]` hay trường `label`.** |
| `medianScore` | Number | Điểm trung vị của các lần scan, `required: true`, default `0.7` — L32-33 |
| `updatedAt` | Date | Thời điểm cập nhật gần nhất, `required: true` — L35-36 |
| `expiresAt` | Date | Thời điểm hết hạn cache, `required: true` — L38-39. Được dùng làm trường TTL index. |

Thiết kế dùng mảng `readings[{score, scannedAt}]` thay vì một điểm số duy nhất cho phép lưu lịch sử nhiều lần quét CoreML của cùng một sản phẩm. Trường `medianScore` là giá trị tổng hợp được tính từ mảng `readings`, được `DynamicPricingInterceptor` đọc nhanh mà không cần tính lại.

**Collection `price_overrides`** lưu các đề xuất giá từ DDQN cho từng sản phẩm [ref: f2t-backend/src/modules/dynamic-pricing/schemas/price-override.schema.ts:L17-63].

| Field | Kiểu | Ràng buộc / Ghi chú |
|---|---|---|
| `_id` | ObjectId | PK tự sinh |
| `productId` | ObjectId | FK → `products._id`, `required: true` — L18-19 |
| `farmId` | ObjectId | FK → `farms._id`, `required: true` — L21-22 |
| `basePrice` | Number | Giá gốc tại thời điểm tính — L24-25 |
| `targetPrice` | Number | Giá đề xuất từ DDQN sau Safety Layer — L27-28 |
| `deltaPct` | Number | Phần trăm thay đổi giá — L30-31 |
| `freshnessScore` | Number | Điểm tươi tại thời điểm tính — L33-34 |
| `freshnessTag` | String | enum `['fresh', 'aging', 'critical']`, `required: true` — L36-37 |
| `safetyClipped` | Boolean | `true` nếu Safety Layer đã điều chỉnh giá — L39-40 |
| `mode` | String | enum `['shadow', 'advisory']`, `required: true` — L42-43 |
| `status` | String | enum 5 giá trị: `['shadow', 'pending_review', 'accepted', 'rejected', 'expired']`, default `'shadow'` — L45-50 |
| `reviewedAt` | Date | Tùy chọn, thời điểm Farm xem xét — L52-53 |
| `reviewedBy` | ObjectId | Tùy chọn, FK → `users._id` của Farm Owner — L55-56 |
| `computedAt` | Date | Thời điểm DDQN tính đề xuất — L58-59 |
| `expiresAt` | Date | Thời điểm đề xuất hết hạn — L61-62. Được dùng làm trường TTL index. |

Vòng đời của một `price_override` bắt đầu với `status: 'shadow'` — giai đoạn DDQN vừa tính xong nhưng chưa hiển thị cho Farm. Khi PricingTickCron xử lý xong, trạng thái chuyển sang `pending_review` để Farm xem xét. Farm chấp nhận → `accepted`; từ chối → `rejected`; tự động hết hạn → `expired`. Thiết kế 5 trạng thái này đảm bảo tính minh bạch và khả năng kiểm toán của toàn bộ vòng đời đề xuất giá.

### 3.4.3. Chỉ mục và tối ưu

Chiến lược chỉ mục của F2T được thiết kế theo bốn nhóm chức năng: (1) chỉ mục địa lý phục vụ tìm kiếm gần kề; (2) chỉ mục TTL tự động dọn dẹp dữ liệu tạm thời; (3) chỉ mục duy nhất đảm bảo tính toàn vẹn dữ liệu; và (4) chỉ mục ghép và đơn tăng tốc các truy vấn nghiệp vụ thường gặp. Toàn bộ chỉ mục được khai báo tường minh trong file schema tương ứng.

**Bảng tổng hợp chỉ mục hệ thống:**

| Loại | Collection | Field(s) | Tùy chọn | Mục đích | Nguồn |
|---|---|---|---|---|---|
| 2dsphere | `farms` | `location` | — | Truy vấn địa lý `$near` — tìm trang trại trong bán kính | `farm.schema.ts:L113` |
| TTL | `freshness_cache` | `expiresAt` | `expireAfterSeconds: 0` | MongoDB tự xóa document khi `expiresAt` đã qua | `freshness-cache.schema.ts:L45` |
| TTL | `price_overrides` | `expiresAt` | `expireAfterSeconds: 0` | Tự xóa đề xuất giá hết hạn | `price-override.schema.ts:L68` |
| TTL | `verification_tokens` | `expiresAt` | `expireAfterSeconds: 0` | Tự xóa token xác minh email/điện thoại hết hạn | `verification-token.schema.ts:L31` |
| Unique | `freshness_cache` | `productId` | `unique: true` | Đảm bảo đúng 1 bản ghi cache per sản phẩm | `freshness-cache.schema.ts:L44` |
| Unique (implicit) | `notification_preferences` | `userId` | `unique: true` | Đảm bảo đúng 1 bộ tùy chọn per người dùng | `notification-preferences.schema.ts:L24` |
| Ghép (Compound) | `price_overrides` | `productId + status` | — | Tra đề xuất đang hoạt động theo sản phẩm và trạng thái | `price-override.schema.ts:L67` |
| Ghép (Compound) | `notifications` | `userId + createdAt (desc)` | — | Lấy thông báo mới nhất của người dùng | `notification.schema.ts:L52` |
| Ghép (Compound) | `verification_tokens` | `userId + type` | — | Tra token email/điện thoại của người dùng | `verification-token.schema.ts:L32` |
| Đơn (Single) | `orders` | `customerId` | — | Lọc đơn hàng theo khách | `order.schema.ts:L239` |
| Đơn (Single) | `orders` | `farmId` | — | Lọc đơn hàng theo trang trại | `order.schema.ts:L240` |
| Đơn (Single) | `orders` | `status` | — | Lọc đơn hàng theo trạng thái | `order.schema.ts:L241` |
| Text | `farms` | `name + description` | — | Tìm kiếm trang trại theo từ khóa | `farm.schema.ts:L116` |
| Text | `products` | `name + description + tags` | — | Tìm kiếm sản phẩm theo từ khóa và nhãn | `product.schema.ts:L147` |
| Text | `posts` | `title + body + hashtags` | — | Tìm kiếm bài đăng theo nội dung và hashtag | `post.schema.ts:L116` |
| Đơn (Single) | `products` | `farmId`, `category`, `status`, `pricePerUnit` | — | Lọc/sắp xếp sản phẩm theo trang trại, danh mục, trạng thái, giá | `product.schema.ts:L148-151` |
| Đơn (Single) | `posts` | `createdAt (desc)`, `authorId`, `farmId`, `hashtags` | — | Dòng thời gian feed, lọc bài theo tác giả/trang trại/hashtag | `post.schema.ts:L115,117-119` |

**Phân tích chi tiết theo nhóm chức năng:**

**Nhóm 2dsphere — tìm kiếm địa lý:** Chỉ mục `FarmSchema.index({ location: '2dsphere' })` tại `farm.schema.ts:L113` cho phép MongoDB thực thi truy vấn `$near` và `$geoWithin` trên trường `location` kiểu GeoJSON Point. Chỉ mục này là nền tảng cho use case CF-02 (tìm kiếm sản phẩm theo vị trí Consumer) và cho `DynamicPricingService` khi tính `competitor_ref_price` từ các trang trại trong bán kính 10km [ref: f2t-backend/src/modules/dynamic-pricing/dynamic-pricing.service.ts:84-124].

**Nhóm TTL — dọn dẹp tự động:** Ba chỉ mục TTL với `expireAfterSeconds: 0` cho phép MongoDB engine tự động xóa document khi trường `expiresAt` vượt qua thời điểm hiện tại, mà không cần bất kỳ cronjob ngoài nào:
- `freshness-cache.schema.ts:L45` — cache độ tươi CoreML hết hạn tự xóa để tránh tích lũy dữ liệu lỗi thời ảnh hưởng đến định giá.
- `price-override.schema.ts:L68` — đề xuất giá DDQN có vòng đời hữu hạn; sau khi hết hạn, document tự xóa thay vì tồn tại vô thời hạn trong trạng thái `expired`.
- `verification-token.schema.ts:L31` — token OTP/xác minh email hết hạn tự xóa, đảm bảo vệ sinh bảo mật mà không cần bảo trì thủ công.

**Nhóm Unique — toàn vẹn dữ liệu:** Chỉ mục `FreshnessCacheSchema.index({ productId: 1 }, { unique: true })` tại `freshness-cache.schema.ts:L44` đảm bảo luật nghiệp vụ "mỗi sản phẩm có đúng một bản ghi cache độ tươi". Trường `userId` trong `notification_preferences` khai báo `unique: true` trực tiếp trong decorator `@Prop` tại `notification-preferences.schema.ts:L24`, đảm bảo mỗi người dùng chỉ có một bộ tùy chọn thông báo.

**Nhóm Ghép (Compound) — truy vấn nghiệp vụ:** Ba chỉ mục ghép phục vụ các pattern truy vấn quan trọng:
- `PriceOverrideSchema.index({ productId: 1, status: 1 })` tại `price-override.schema.ts:L67` — kết hợp hai điều kiện lọc phổ biến nhất: "đề xuất nào đang ở trạng thái nào cho sản phẩm này". MongoDB có thể thỏa mãn truy vấn hoàn toàn từ chỉ mục mà không cần fetch document.
- `NotificationSchema.index({ userId: 1, createdAt: -1 })` tại `notification.schema.ts:L52` — cho phép truy vấn "lấy N thông báo mới nhất của người dùng X" theo thứ tự thời gian giảm dần mà không cần sort giai đoạn sau index scan.
- `VerificationTokenSchema.index({ userId: 1, type: 1 })` tại `verification-token.schema.ts:L32` — tra token theo người dùng và loại (`'email'` hoặc `'phone'`), hỗ trợ luồng xác minh OTP.

**Nhóm Đơn (Single) — collection orders:** Collection `orders` có **3 chỉ mục đơn riêng lẻ** thay vì một chỉ mục ghép ba trường [ref: f2t-backend/src/modules/orders/schemas/order.schema.ts:L239-241]: `customerId` để Consumer xem đơn hàng của mình, `farmId` để Farm Owner xem đơn hàng trang trại, và `status` để lọc đơn theo trạng thái. Quyết định dùng 3 chỉ mục đơn (không phải 1 chỉ mục ghép 3 trường) phù hợp với các pattern truy vấn thực tế — Consumer chỉ cần lọc theo `customerId`, Farm chỉ cần lọc theo `farmId`; truy vấn kết hợp cả ba trường không phải pattern phổ biến.

**Nhóm Text — tìm kiếm full-text:** Ba chỉ mục text cho phép Consumer tìm kiếm sản phẩm (`products`), trang trại (`farms`) và bài đăng cộng đồng (`posts`) theo từ khóa tự nhiên. MongoDB Text Index hỗ trợ stemming và scoring, trả kết quả theo độ liên quan.

**Nhóm chỉ mục đơn bổ trợ — products và posts:** Ngoài chỉ mục text, collection `products` còn khai báo bốn chỉ mục đơn trên `farmId`, `category`, `status` và `pricePerUnit` [ref: f2t-backend/src/modules/products/schemas/product.schema.ts:L148-151] phục vụ các truy vấn lọc danh mục và sắp xếp theo giá thường gặp trên trang chủ Consumer. Tương tự, collection `posts` có bốn chỉ mục trên `createdAt` (giảm dần, cho dòng thời gian feed), `authorId`, `farmId` và `hashtags` [ref: f2t-backend/src/modules/posts/schemas/post.schema.ts:L115,117-119].

**Quyết định tối ưu — Embedded Snapshot OrderItem:** Thiết kế nhúng `OrderItem` trực tiếp vào `orders` thay vì tách thành collection riêng và dùng FK là quyết định tối ưu đọc có chủ đích. Khi Consumer hoặc Admin xem chi tiết đơn hàng, backend chỉ cần đọc đúng một document từ collection `orders` — toàn bộ thông tin sản phẩm (tên, đơn giá, trang trại) đã có sẵn trong mảng `items` [ref: f2t-backend/src/modules/orders/schemas/order.schema.ts:L6-34, L105-106]. Phương án thay thế dùng FK sang `products` sẽ yêu cầu `$lookup` (MongoDB join) hoặc nhiều lần truy vấn, đồng thời rủi ro mất thông tin lịch sử nếu sản phẩm bị sửa hoặc xóa sau khi đặt hàng. Embedded Snapshot loại bỏ hoàn toàn rủi ro này — giá và thông tin trang trại tại thời điểm đặt hàng được bảo toàn vĩnh viễn trong đơn hàng.

## 3.5. Phân tích, thiết kế giao diện chức năng

### 3.5.1. Consumer

Nhóm giao diện dành cho Consumer được tổ chức theo luồng nghiệp vụ tuyến tính: khám phá sản phẩm → đặt hàng → thanh toán → theo dõi giao hàng → tương tác cộng đồng. Toàn bộ nhóm này được xây dựng trên Expo Router với file-system routing, chiếm phần lớn trong tổng số ≈48 màn hình route của ứng dụng [ref: ledger t1.15-numbers, t2.2-frontend-routes].

**Trang chủ và danh sách sản phẩm** (`(app)/home.tsx`, `(app)/products.tsx`) là điểm vào chính của Consumer. Màn hình này thực hiện truy vấn sản phẩm thông thường lên NestJS REST API; không có thuật toán gợi ý hay cá nhân hóa nào được nhúng vào tầng này. Gợi ý sản phẩm cross-sell category-level chỉ xuất hiện trong màn hình **giỏ hàng** (`(app)/cart.tsx`) qua component `CrossSell` [ref: ledger cross-sell-v1]. Điểm đặc trưng của F2T nằm ở phía backend: `DynamicPricingInterceptor` đăng ký toàn cục dưới dạng `APP_INTERCEPTOR` tự động bổ sung ba trường `dynamicPrice`, `freshnessScore` và `priceTag` vào mỗi phần tử sản phẩm trong phản hồi API trước khi trả về client [ref: f2t-backend/src/common/interceptors/dynamic-pricing.interceptor.ts:74-77]. Nhờ đó, màn hình danh sách hiển thị trực tiếp nhãn độ tươi (fresh / aging / critical) và giá động cập nhật theo chu kỳ cron hàng giờ mà không cần thêm bất kỳ logic phía client nào.

**Màn hình chi tiết sản phẩm** (`products/[id].tsx`) trình bày đầy đủ thông tin một mặt hàng, trong đó ba trường AI được ưu tiên hiển thị nổi bật: `freshnessScore` (điểm tươi 0–1 từ CoreML), `dynamicPrice` (giá đề xuất sau Safety Layer) và `priceTag` (nhãn phân loại giá). Consumer có thể thêm sản phẩm vào giỏ hàng trực tiếp từ màn hình này.

**Tìm kiếm theo vị trí địa lý** (`farms/search.tsx`, `(app)/farms.tsx`) cho phép Consumer lọc trang trại và sản phẩm trong một bán kính địa lý nhất định. Truy vấn được thực hiện thông qua chỉ mục 2dsphere trên collection `farms` trong MongoDB, đảm bảo hiệu năng với dữ liệu địa lý thực [ref: f2t-backend/src/modules/farms/schemas/farm.schema.ts:L113; ledger t1.11-schema-detail].

**Giỏ hàng** (`(app)/cart.tsx`) quản lý danh sách sản phẩm đã chọn, cho phép điều chỉnh số lượng và hiển thị tổng giá trị đơn hàng bao gồm phí giao hàng ước tính. Từ màn hình này, Consumer chuyển sang luồng thanh toán.

**Checkout và thanh toán** (`checkout/index.tsx`, `checkout/success.tsx`) tích hợp Stripe Checkout Session: backend tạo session với danh sách line_items từ đơn hàng rồi trả về `url` redirect; frontend mở Stripe WebView để Consumer hoàn tất thanh toán; kết quả xác nhận được backend nhận qua webhook [ref: f2t-backend/src/modules/payments/payments.service.ts:54-118; ledger t2.2-stripe-ghn]. Màn hình `payment/result.tsx` hiển thị trạng thái thành công hoặc lỗi sau khi Stripe redirect.

**Theo dõi đơn hàng** (`(app)/orders/index.tsx`, `(app)/orders/[id].tsx`, `(app)/orders/tracking.tsx`) cho phép Consumer xem lịch sử và trạng thái chi tiết từng đơn. Khi đơn hàng đã có mã vận đơn GHN, màn hình tracking hiển thị thông tin từ GHN Provider; trong trường hợp chưa có mã GHN, hệ thống fallback về Dijkstra trên đồ thị 10 node TP.HCM để ước tính lộ trình [ref: f2t-backend/src/modules/delivery/delivery.service.ts:98-232; ledger t2.2-stripe-ghn].

**Hồ sơ cá nhân** (`(app)/profile.tsx`, `(app)/profile/edit.tsx`) cho phép Consumer xem và chỉnh sửa thông tin tài khoản, bao gồm địa chỉ giao hàng nhúng trực tiếp trong document user [ref: f2t-backend/src/modules/users/schemas/user.schema.ts:L20-97; ledger t1.11-schema-detail].

**Feed cộng đồng** (`(app)/feed.tsx`, `feed/[id].tsx`, `feed/add-post.tsx`) là không gian chia sẻ bài đăng giữa người dùng trên nền tảng. Đây là chức năng cộng đồng thuần túy dựa trên collection `posts`; hệ thống không triển khai lọc cộng tác (collaborative filtering) hay cá nhân hoá feed. Gợi ý sản phẩm cross-sell category-level (FP-Growth) chỉ xuất hiện trong màn hình **giỏ hàng**, không trong feed [ref: ledger cross-sell-v1].

### 3.5.2. Farm

Nhóm giao diện dành cho Farm Owner tập trung vào ba chức năng cốt lõi: quản lý catalog sản phẩm, xử lý đơn hàng và tiếp nhận hỗ trợ từ hệ thống AI/ML. Ba màn hình tích hợp AI — ★ Dashboard dự báo, ★ Quét độ tươi và ★ Gợi ý giá — là điểm khác biệt rõ nét nhất của nền tảng F2T so với các giải pháp thương mại điện tử truyền thống.

**★ Dashboard và dự báo nhu cầu** (`(app)/dashboard.tsx`, `(app)/farm/forecast-insights.tsx`) là màn hình tổng quan dành cho Farm Owner. Điểm nổi bật là biểu đồ dự báo nhu cầu 7 ngày tới do `ForecasterLSTM` tính toán và trả về qua endpoint `/forecast` của pricing-sidecar [ref: pricing-sidecar/main.py:263; ledger t0.2-forecaster-arch]. Ngoài chỉ số nhu cầu dự kiến (`demand`), model còn trả về `waste_logit` — xác suất tồn kho hư hỏng — được hiển thị bằng màu cảnh báo để Farm chủ động điều chỉnh lượng xuất hàng [ref: dynamic-pricing-final/src/forecaster/model.py:46-49; ledger t0.2-forecaster-arch]. Dữ liệu được phân loại theo bốn danh mục sản phẩm: rau lá (leafy), củ (root), quả (fruit) và rau thơm (herbs) [ref: f2t-frontend/src/app/(app)/farm/forecast-insights.tsx].

**★ Quét độ tươi** (tích hợp trong `(app)/farm/price-suggestions.tsx`) là chức năng cho phép Farm Owner chụp ảnh sản phẩm trực tiếp từ camera thiết bị, sau đó gửi ảnh lên backend để phân loại độ tươi bằng hai mô hình CoreML (fruit model và root model, ảnh đầu vào 299×299 RGB). Backend trả về nhãn nhị phân `fresh` hoặc `rotten` kèm xác suất tương ứng; kết quả được lưu vào `FreshnessCache` và dùng làm đầu vào cho chu kỳ định giá động tiếp theo [ref: pricing-sidecar/main.py:314, 321-326; ledger t0.6-coreml-freshness, t1.4-freshness-coreml]. Ngoài luồng camera, màn hình cũng hỗ trợ nhập điểm tươi thủ công qua các preset định sẵn (fresh/aging/critical) để Farm Owner có thể kiểm thử đề xuất giá mà không cần thiết bị camera.

**★ Gợi ý giá** (`(app)/farm/price-suggestions.tsx`) hiển thị danh sách đề xuất delta giá từ mô hình DDQN (`SharedMLPDuelingQNet`) sau khi đã qua Safety Layer 5 quy tắc [ref: pricing-sidecar/safety.py:1-19; ledger t1.4-safety-5-rules]. Với mỗi sản phẩm, màn hình trình bày: giá gốc, giá đề xuất, delta phần trăm và trạng thái hiện tại (`shadow` / `pending_review`). Farm Owner có toàn quyền chấp nhận (`accepted`) hoặc từ chối (`rejected`) từng đề xuất — hệ thống hoạt động ở chế độ **advisory**, không ép giá tự động [ref: f2t-backend/src/modules/dynamic-pricing/dynamic-pricing.service.ts:289-291; ledger t1.4-interceptor-cron]. Vòng đời đề xuất gồm năm trạng thái: `shadow → pending_review → accepted/rejected → expired` [ref: f2t-backend/src/modules/dynamic-pricing/schemas/price-override.schema.ts:17-63; ledger t1.4-collections].

**Quản lý sản phẩm** (`products/add.tsx`, `products/[id]/edit.tsx`, `(app)/inventory/index.tsx`) cung cấp đầy đủ các thao tác CRUD: thêm mới sản phẩm kèm ảnh, chỉnh sửa thông tin (đơn giá, số lượng, mô tả), và xem tồn kho hiện tại. Trường `availableQuantity` được backend sử dụng trực tiếp để tính `inventory_ratio` trong vector quan sát của DDQN [ref: f2t-backend/src/modules/dynamic-pricing/dynamic-pricing.service.ts:228; ledger t0.7-backend-payload].

**Quản lý đơn hàng** (`(app)/farm/orders/index.tsx`, `(app)/farm/orders/[id].tsx`) cho phép Farm Owner xem danh sách đơn hàng theo trạng thái, xem chi tiết từng đơn và cập nhật trạng thái xử lý. Thông tin sản phẩm trong đơn hàng được lưu theo mô hình Embedded Snapshot nên Farm Owner xem được đúng giá và thông tin tại thời điểm đặt hàng [ref: f2t-backend/src/modules/orders/schemas/order.schema.ts:L6-34; ledger t1.11-schema-detail].

**Thống kê** (`(app)/farm/analytics.tsx`) cung cấp số liệu tổng hợp về doanh thu, số đơn hàng và đánh giá của trang trại, hỗ trợ Farm Owner đưa ra quyết định kinh doanh.

### 3.5.3. Admin

Nhóm giao diện Admin tập trung vào bốn nhiệm vụ vận hành chính: kiểm soát chất lượng nhà cung cấp, quản lý người dùng, giám sát hệ thống AI định giá và quản lý nội dung. Admin truy cập thông qua route group riêng biệt (`admin/`) với quyền hạn cao nhất trên nền tảng [ref: f2t-frontend/src/app/admin/; ledger t2.2-frontend-routes].

**Dashboard tổng quan** (`admin/index.tsx`) hiển thị các chỉ số vận hành cốt lõi lấy từ `AdminAnalytics` endpoint: tổng số người dùng, tổng trang trại, tổng đơn hàng, doanh thu tích lũy, số người dùng mới trong tháng và phân bổ đơn hàng theo trạng thái. Dashboard cũng trình bày `farmsByVerification` — phân bổ trang trại theo `verificationStatus` — cho phép Admin nắm bắt nhanh số lượng trang trại đang chờ duyệt [ref: f2t-frontend/src/app/admin/index.tsx:106-115]. Từ dashboard, Admin điều hướng trực tiếp đến các màn hình chức năng qua ba nút nhanh: Users, Farms, Orders.

**Duyệt trang trại** (`admin/farms.tsx`) là màn hình kiểm soát chất lượng nhà cung cấp. Admin xem danh sách trang trại kèm `verificationStatus` (pending / verified / rejected), có thể lọc theo trạng thái và thực hiện phê duyệt hoặc từ chối hồ sơ đăng ký. Chỉ các trang trại có trạng thái `verified` mới có thể đăng sản phẩm và tiếp nhận đơn hàng từ Consumer. Cơ chế này đảm bảo chất lượng và tính xác thực của nhà cung cấp trên nền tảng [ref: f2t-backend/src/modules/farms/schemas/farm.schema.ts:L50-108; ledger t1.11-schema-detail].

**Quản lý người dùng** (`admin/users.tsx`) cho phép Admin xem danh sách tài khoản người dùng theo vai trò (consumer / farm / admin) và thực hiện ban (cấm vĩnh viễn) hoặc suspend (tạm khóa) tài khoản vi phạm. Trạng thái tài khoản `suspended` được phản ánh trực tiếp trong field `status` của schema `users` [ref: f2t-backend/src/modules/users/schemas/user.schema.ts:L20-97; ledger t1.11-schema-detail]. Tài khoản seed thử nghiệm bao gồm một tài khoản `suspended@f2t.vn` minh họa trạng thái này [ref: f2t-backend/src/seed/seed.ts:116-135; ledger t2.2-seed].

**★ Shadow Report** (truy cập qua `admin/index.tsx` → endpoint `GET /dynamic-pricing/shadow-report`) là màn hình giám sát chuyên biệt cho hệ thống định giá AI ở chế độ shadow/advisory. Khi biến môi trường `PRICING_MODE=shadow` (mặc định), mọi đề xuất giá từ DDQN được ghi vào MongoDB với status `shadow` mà không tự động áp dụng — Admin có thể theo dõi toàn bộ hành vi mô hình qua endpoint `GET /dynamic-pricing/shadow-report` [ref: f2t-backend/src/modules/dynamic-pricing/dynamic-pricing.controller.ts:78-84]. Report tổng hợp các chỉ số KPI: số ngày hoạt động shadow (`shadowDays`), tỷ lệ Safety Layer can thiệp (`safetyClipRate`) — tức tỷ lệ đề xuất bị Safety Layer điều chỉnh lại trước khi ghi — và phân bổ đề xuất theo trạng thái [ref: f2t-backend/src/modules/dynamic-pricing/dynamic-pricing.service.ts:379-405]. Chức năng này cho phép Admin đánh giá mức độ tin cậy và an toàn của mô hình AI trước khi quyết định chuyển sang chế độ `pending_review` (Farm có thể duyệt) hoặc áp dụng tự động.

**Quản lý đơn hàng** (`admin/orders.tsx`) cung cấp cho Admin tầm nhìn toàn hệ thống về đơn hàng, cho phép tra cứu, lọc theo trạng thái và can thiệp vào các đơn có vấn đề.

**Thống kê hệ thống** được tích hợp vào dashboard tổng quan và có thể mở rộng thêm theo nhu cầu vận hành. Các số liệu nền tảng hiện tại bao gồm phân bổ người dùng theo vai trò, phân bổ đơn hàng theo trạng thái và tổng doanh thu, phục vụ công tác báo cáo và đưa ra quyết định vận hành của đội ngũ quản trị.
