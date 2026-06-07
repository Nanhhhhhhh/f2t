# CHƯƠNG 4. TRIỂN KHAI VÀ THỰC NGHIỆM

## 4.1. Môi trường phát triển

Hệ thống F2T được phát triển và kiểm thử trên máy trạm cá nhân chạy macOS, với cấu hình phần cứng và phần mềm được mô tả trong **Bảng 4.1** [TLTK].

**Bảng 4.1 — Môi trường phần cứng và phần mềm**

| Thành phần | Giá trị |
|---|---|
| CPU | Apple M-series (ARM64) |
| RAM | 16 GB |
| Hệ điều hành | macOS (Darwin 24.x) |
| Node.js | v22.x (nvm) |
| Python | 3.13 (.venv) |
| Công cụ quản lý gói | npm (backend), pnpm (frontend), pip (sidecar) |
| Cơ sở dữ liệu | MongoDB 7 (local instance) |
| Trình soạn thảo | VS Code |

Hệ thống khởi động theo trình tự bốn bước: MongoDB được khởi động trước, tiếp theo là một pricing-sidecar FastAPI trên cổng 8000 [ref: f2t-backend/src/app.module.ts:57; ledger t1.4-one-sidecar], sau đó máy chủ NestJS được khởi động trên cổng 3000, và cuối cùng Expo dev server phục vụ ứng dụng di động [TLTK]. Trình tự này đảm bảo NestJS có thể kết nối sidecar ngay từ lần khởi tạo module.

**Bảng 4.2 — Thư viện Backend chính**

| Thư viện | Phiên bản | Vai trò |
|---|---|---|
| `@nestjs/common` | 11.0.1 | Framework NestJS — module, controller, service [ref: ledger t2.2-tech-versions] |
| `mongoose` | 8.19.1 | ODM cho MongoDB [ref: ledger t2.2-tech-versions] |
| `passport-jwt` | 4.0.1 | Xác thực JWT với Passport.js [ref: ledger t2.2-tech-versions] |
| `bcrypt` | 6.0.0 | Băm mật khẩu (saltRounds=10) [ref: ledger t2.2-tech-versions] |
| `stripe` | ^22.1.1 | Thanh toán trực tuyến Stripe Checkout + Webhook [ref: ledger t2.2-tech-versions] |
| `class-validator` | 0.14.2 | Xác thực DTO qua decorator [ref: ledger t2.2-tech-versions] |
| `@nestjs/schedule` | ^6.1.3 | Cron job định kỳ (PricingTickCron) [ref: ledger t2.2-tech-versions] |

**Bảng 4.3 — Thư viện Frontend chính**

| Thư viện | Phiên bản | Vai trò |
|---|---|---|
| `expo` | ~53.0.27 | SDK Expo — build và runtime React Native [ref: ledger t2.2-tech-versions] |
| `expo-router` | ~5.1.11 | Định tuyến dựa trên hệ thống tệp [ref: ledger t2.2-tech-versions] |
| `react-native` | 0.79.6 | Runtime React Native [ref: ledger t2.2-tech-versions] |
| `axios` | ^1.7.5 | HTTP client gọi API backend [ref: ledger t2.2-tech-versions] |
| `zustand` | ^5.0.5 | Quản lý trạng thái toàn cục (auth, giỏ hàng) [ref: ledger t2.2-tech-versions] |
| `react-native-mmkv` | ~3.1.0 | Lưu trữ token JWT tại thiết bị [ref: ledger t2.2-tech-versions] |
| `nativewind` | ^4.1.21 | Tailwind CSS cho React Native (NativeWind) [ref: ledger t2.2-tech-versions] |

**Bảng 4.4 — Thư viện AI/ML (pricing-sidecar)**

| Thư viện | Phiên bản | Vai trò |
|---|---|---|
| `fastapi` | >=0.111.0 | Web framework ASGI phục vụ 3 endpoint AI [ref: ledger t2.2-tech-versions] |
| `torch` | >=2.2.0 | PyTorch — suy luận DDQN (SharedMLPDuelingQNet) và ForecasterLSTM [ref: ledger t2.2-tech-versions] |
| `coremltools` | >=7.0 | Tải và chạy 2 model CoreML phân loại độ tươi [ref: ledger t2.2-tech-versions] |
| `numpy` | >=1.26.0 | Xử lý vector quan sát 10 chiều [ref: ledger t2.2-tech-versions] |
| `pydantic` | >=2.0.0 | Xác thực schema request/response FastAPI [ref: ledger t2.2-tech-versions] |

## 4.2. Cài đặt và triển khai

### 4.2.1. Cấu trúc mã nguồn

Mã nguồn dự án F2T được tổ chức thành ba thành phần chính: backend NestJS, frontend Expo React Native, và pricing-sidecar Python, tương ứng với kiến trúc Monolith + 1 Sidecar đã phân tích tại Chương 3.

**Backend (`f2t-backend/src/modules/`)** gồm 13 module NestJS, mỗi module đóng gói đầy đủ controller, service, schema và các tệp kiểm thử tương ứng [ref: f2t-backend/src/modules/ — 13 thư mục; ledger t1.4-one-sidecar]:

| STT | Module | Chức năng chính |
|---|---|---|
| 1 | `admin` | Quản trị viên: cấm, xác minh, thống kê nền tảng |
| 2 | `auth` | Đăng ký, đăng nhập, làm mới JWT |
| 3 | `delivery` | Tích hợp GHN + Dijkstra fallback |
| 4 | `demand-forecasting` | Gọi `/forecast` trên sidecar, trả demand_7d |
| 5 | `dynamic-pricing` | Cron tick, interceptor, vòng đời PriceOverride |
| 6 | `farms` | CRUD trang trại, truy vấn địa không gian `$geoNear` |
| 7 | `notifications` | Expo Push, đếm chưa đọc, cron cảnh báo tồn kho thấp |
| 8 | `orders` | Vòng đời đặt hàng, snapshot nhúng OrderItem |
| 9 | `payments` | Stripe Checkout + Webhook |
| 10 | `posts` | Bảng tin cộng đồng, phân trang |
| 11 | `products` | Lọc theo danh mục/giá/tồn kho |
| 12 | `uploads` | Cloudinary hoặc fallback local `uploads/` |
| 13 | `users` | Hồ sơ, thống kê, push token |

**Frontend (`f2t-frontend/src/app/`)** sử dụng Expo Router với định tuyến dựa trên hệ thống tệp, tổ chức thành 8 nhóm route và 5 tệp màn hình gốc, phục vụ tổng cộng ≈48 màn hình [ref: ledger t2.2-frontend-routes, t1.15-numbers]. Các nhóm route chính gồm: `(app)/` (Consumer đã xác thực — đặt hàng, thanh toán, hồ sơ), `(app)/farm/` (Farm owner — quản lý sản phẩm, gợi ý giá), `admin/` (Admin), và các nhóm chức năng mở `checkout/`, `farms/`, `products/`, `feed/`, `notifications/`, `settings/`.

**AI/ML Sidecar (`pricing-sidecar/`)** là một thư mục Python duy nhất chứa toàn bộ logic suy luận AI/ML, phục vụ ba endpoint REST trên cổng 8000 [ref: f2t-backend/src/app.module.ts:57; pricing-sidecar/main.py:263,277,316; ledger t1.4-one-sidecar]:
- `POST /forecast` — Dự báo nhu cầu qua ForecasterLSTM [ref: pricing-sidecar/main.py:263]
- `POST /predict` — Đề xuất giá động qua DDQN + Safety Layer [ref: pricing-sidecar/main.py:277]
- `POST /freshness/classify` — Phân loại độ tươi qua CoreML [ref: pricing-sidecar/main.py:316]

Thiết kế một sidecar duy nhất phục vụ cả ba chức năng AI giúp giảm chi phí vận hành, đồng thời cho phép NestJS kết nối toàn bộ năng lực AI/ML qua một biến môi trường `PRICING_SIDECAR_URL` duy nhất [ref: f2t-backend/src/app.module.ts:57; ledger t1.4-one-sidecar].

### 4.2.2. Tích hợp NestJS ↔ AI Sidecar

Điểm tích hợp chính giữa NestJS và pricing-sidecar được hiện thực qua ba cơ chế phối hợp: `DynamicPricingInterceptor`, `PricingTickCron`, và vòng đời `PriceOverride`.

**DynamicPricingInterceptor** được đăng ký làm `APP_INTERCEPTOR` toàn cục [ref: f2t-backend/src/common/interceptors/dynamic-pricing.interceptor.ts:74-77; ledger t1.4-interceptor-cron]. Sau khi controller trả về response, interceptor chặn mọi phản hồi từ đường dẫn `/api/products`, tra bảng `price_overrides` trong MongoDB, rồi nhúng ba trường bổ sung vào từng phần tử sản phẩm: `dynamicPrice` (giá tư vấn AI), `freshnessScore` (điểm độ tươi từ CoreML), và `priceTag` (nhãn phân loại giá, ví dụ `"flash_discount"` hoặc `"standard"`) [ref: f2t-backend/src/common/interceptors/dynamic-pricing.interceptor.ts:74-77; ledger t1.4-interceptor-cron]. Nhờ thiết kế này, ứng dụng di động nhận được thông tin AI/ML hoàn chỉnh trong cùng một phản hồi sản phẩm thông thường mà không cần thay đổi bất kỳ controller hay frontend nào.

**PricingTickCron** chạy định kỳ theo lịch `"0 * * * *"` (mỗi đầu giờ), có thể cấu hình lại qua biến môi trường `PRICING_CRON_SCHEDULE` [ref: f2t-backend/src/modules/dynamic-pricing/pricing-tick.cron.ts:18; ledger t1.4-interceptor-cron]. Mỗi lần chạy, cron duyệt toàn bộ sản phẩm đang hoạt động, gọi `/predict` trên sidecar để lấy đề xuất giá mới từ DDQN, sau đó tạo hoặc cập nhật bản ghi `PriceOverride` tương ứng. Nếu sidecar không phản hồi, lệnh gọi thất bại được bắt trong khối `catch` và ghi nhật ký cảnh báo mà không làm sập tiến trình cron [ref: ledger t2.2-security].

**Vòng đời PriceOverride** bao gồm năm trạng thái được định nghĩa tường minh trong schema [ref: f2t-backend/src/modules/dynamic-pricing/schemas/price-override.schema.ts:45-50; ledger t1.4-collections]:

| Trạng thái | Ý nghĩa |
|---|---|
| `shadow` | AI tính toán nội bộ, chưa hiển thị cho Farm |
| `pending_review` | Đang chờ Farm xem xét và phê duyệt |
| `accepted` | Farm chấp nhận — `dynamicPrice` được áp dụng |
| `rejected` | Farm từ chối — giá gốc được giữ nguyên |
| `expired` | Vượt quá TTL — bản ghi hết hiệu lực |

Cơ chế này đảm bảo định giá AI có tính chất tư vấn (advisory): AI đề xuất nhưng Farm chủ động quyết định chấp nhận hay từ chối, phù hợp với yêu cầu phi chức năng về độ tin cậy và tính minh bạch đã đặt ra tại §3.2.2.

Điểm đáng chú ý của thiết kế tích hợp là toàn bộ ba chức năng AI — dự báo nhu cầu (`/forecast`), định giá động (`/predict`), và phân loại độ tươi (`/freshness/classify`) — đều được phục vụ bởi một sidecar duy nhất trên cổng 8000, đơn giản hóa việc triển khai và giám sát so với kiến trúc đa-sidecar [ref: f2t-backend/src/app.module.ts:57; pricing-sidecar/main.py:263,277,316; ledger t1.4-one-sidecar].

### 4.2.3. Tài khoản seed

Để phục vụ kiểm thử tích hợp và demo sản phẩm, tập lệnh `seed.ts` khởi tạo sẵn mười tài khoản mẫu đại diện cho đầy đủ các vai trò và trạng thái trong hệ thống [ref: f2t-backend/src/seed/seed.ts:59,87,116,381; ledger t2.2-seed]:

| Loại tài khoản | Số lượng | Email mẫu | Trạng thái |
|---|---|---|---|
| Admin | 1 | `admin@f2t.com` | `active` |
| Farm (trang trại) | 3 | `farm1@f2t.vn` — `farm3@f2t.vn` | `active` |
| Consumer (người dùng) | 5 | `consumer1@f2t.vn` — `consumer5@f2t.vn` | `active` |
| Suspended (bị tạm khóa) | 1 | `suspended@f2t.vn` | `suspended` |
| **Tổng** | **10** | | |

Các tài khoản Farm được tạo bằng vòng lặp `for (let i = 1; i <= 3; i++)` [ref: f2t-backend/src/seed/seed.ts:59; ledger t2.2-seed], tương tự Consumer được tạo qua `for (let i = 1; i <= 5; i++)` [ref: f2t-backend/src/seed/seed.ts:87; ledger t2.2-seed]. Tài khoản Suspended được tạo riêng lẻ với `status: 'suspended'` để kiểm thử luồng xử lý tài khoản bị vô hiệu hóa [ref: f2t-backend/src/seed/seed.ts:116; ledger t2.2-seed]. Tài khoản Admin duy nhất được tạo cuối cùng với `emailVerified: true` và quyền `role: 'admin'` [ref: f2t-backend/src/seed/seed.ts:381; ledger t2.2-seed].

Tất cả mật khẩu seed được băm bằng bcrypt với `saltRounds=10` [ref: f2t-backend/src/modules/users/users.service.ts:18; ledger t2.2-security] trước khi lưu vào MongoDB, đảm bảo tính nhất quán với cơ chế bảo mật của hệ thống sản xuất.

## 4.3. Kiểm thử

### 4.3.1. Chiến lược kiểm thử

Chiến lược kiểm thử của dự án F2T tập trung vào kiểm thử đơn vị (unit test) tự động, được tích hợp vào quy trình phát triển thường ngày. Toàn bộ bộ kiểm thử backend được viết bằng Jest, sử dụng `mongodb-memory-server` để khởi tạo một phiên bản MongoDB in-memory trong bộ nhớ cho mỗi lần chạy thử — đảm bảo mỗi test case hoàn toàn độc lập, không phụ thuộc vào cơ sở dữ liệu thực, và có thể tái tạo ở bất kỳ môi trường nào [ref: CLAUDE.md — quy ước test]. Phương pháp này loại bỏ sự cần thiết phải kết nối MongoDB thật trong quá trình CI/CD, đồng thời giảm thiểu thời gian khởi động bộ kiểm thử.

Mỗi module NestJS được kiểm thử thông qua ít nhất một tệp `*.spec.ts` đặt cạnh module tương ứng trong thư mục `src/modules/<tên-module>/`. Ngoài các tệp spec theo module, dự án còn bao gồm một tệp kiểm thử cho controller gốc (`app.controller.spec.ts`) và một tệp kiểm thử riêng cho `DynamicPricingInterceptor` — thành phần xuyên cắt quan trọng được đặt tại `src/common/interceptors/` [ref: f2t-backend/src/common/interceptors/dynamic-pricing.interceptor.spec.ts].

### 4.3.2. Kết quả kiểm thử đơn vị

Bộ kiểm thử backend gồm **54 test case** phân bố trên **21 tệp spec**, tất cả đều đạt kết quả PASS [ref: ledger t1.15-numbers]. **Bảng 4.5** trình bày phân bố số lượng test case theo từng tệp spec, được đếm trực tiếp từ mã nguồn.

**Bảng 4.5 — Phân bố test case theo tệp spec (54 test case / 21 tệp)**

| STT | Tệp spec | Số test case |
|---|---|---|
| 1 | `app.controller.spec.ts` | 1 |
| 2 | `common/interceptors/dynamic-pricing.interceptor.spec.ts` | 6 |
| 3 | `modules/admin/admin.service.spec.ts` | 4 |
| 4 | `modules/auth/auth.controller.spec.ts` | 1 |
| 5 | `modules/auth/auth.service.spec.ts` | 1 |
| 6 | `modules/delivery/delivery.service.spec.ts` | 7 |
| 7 | `modules/demand-forecasting/demand-forecasting.service.spec.ts` | 3 |
| 8 | `modules/dynamic-pricing/dynamic-pricing.service.spec.ts` | 9 |
| 9 | `modules/farms/farms.controller.spec.ts` | 1 |
| 10 | `modules/farms/farms.service.spec.ts` | 2 |
| 11 | `modules/notifications/notifications.controller.spec.ts` | 1 |
| 12 | `modules/notifications/notifications.service.spec.ts` | 1 |
| 13 | `modules/orders/orders.controller.spec.ts` | 1 |
| 14 | `modules/orders/orders.service.spec.ts` | 3 |
| 15 | `modules/payments/payments.service.spec.ts` | 7 |
| 16 | `modules/posts/posts.controller.spec.ts` | 1 |
| 17 | `modules/posts/posts.service.spec.ts` | 1 |
| 18 | `modules/products/products.controller.spec.ts` | 1 |
| 19 | `modules/products/products.service.spec.ts` | 1 |
| 20 | `modules/users/users.controller.spec.ts` | 1 |
| 21 | `modules/users/users.service.spec.ts` | 1 |
| | **Tổng** | **54** |

[ref: f2t-backend/src/modules/*/*.spec.ts; f2t-backend/src/app.controller.spec.ts; f2t-backend/src/common/interceptors/dynamic-pricing.interceptor.spec.ts; ledger t1.15-numbers]

Hai module có mật độ test case cao nhất là `dynamic-pricing` (9 case) và `payments`/`delivery` (7 case mỗi module), phản ánh độ phức tạp nghiệp vụ và số lượng nhánh xử lý ngoại lệ của các module này. Module `dynamic-pricing` bao gồm các trường hợp cho toàn bộ vòng đời `PriceOverride` (shadow, pending\_review, accepted, rejected, expired) cũng như cơ chế xử lý lỗi khi sidecar không phản hồi [ref: f2t-backend/src/modules/dynamic-pricing/dynamic-pricing.service.spec.ts].

### 4.3.3. Kiểm thử tích hợp các thành phần trọng yếu

**Tích hợp thanh toán Stripe.** Tệp `payments.service.spec.ts` kiểm thử đầy đủ hai luồng nghiệp vụ trọng yếu: (1) `createCheckoutSession` — bao gồm các kịch bản tạo phiên thanh toán thành công, từ chối khi đơn hàng thuộc người dùng khác (`ForbiddenException`), từ chối khi đơn hàng đã thanh toán, và từ chối khi phương thức thanh toán là tiền mặt (`BadRequestException`); (2) `handleWebhook` — bao gồm các kịch bản cập nhật trạng thái đơn hàng khi nhận sự kiện `checkout.session.completed` (thanh toán thành công), cập nhật khi nhận sự kiện `checkout.session.expired` (thanh toán thất bại/hết hạn), và ném ngoại lệ khi chữ ký Stripe không hợp lệ [ref: f2t-backend/src/modules/payments/payments.service.spec.ts]. Thiết kế kiểm thử này bao phủ các kịch bản idempotency quan trọng — webhook là nguồn xác thực duy nhất cho trạng thái thanh toán, theo quy ước đã xác lập [ref: f2t-backend/src/modules/payments/payments.service.ts:120-138; ledger t2.2-stripe-ghn].

**Tích hợp giao vận GHN và fallback Dijkstra.** Tệp `delivery.service.spec.ts` kiểm thử ba nhóm kịch bản chính: (1) `createShipment` — kiểm thử thoát nhẹ nhàng (graceful skip) khi GHN chưa được cấu hình, và kiểm thử ném `BadRequestException` khi đơn hàng thiếu địa chỉ giao hàng; (2) `handleGhnWebhook` — kiểm thử ghi nhận bước theo dõi và cập nhật trạng thái đơn hàng khi nhận webhook `delivered`, và kiểm thử bỏ qua webhook khi mã đơn GHN không tồn tại; (3) `getTracking` — kiểm thử trả về tuyến đường Dijkstra mock khi đơn hàng chưa có mã GHN, kiểm thử tính trọng lượng động từ danh sách sản phẩm, và kiểm thử degrade gracefully về dữ liệu DB khi GHN API không khả dụng [ref: f2t-backend/src/modules/delivery/delivery.service.spec.ts; f2t-backend/src/modules/delivery/delivery.service.ts:98,131,232; ledger t2.2-stripe-ghn].

### 4.3.4. Quy trình đảm bảo chất lượng mã nguồn

Ngoài kiểm thử đơn vị, dự án áp dụng quy trình kiểm tra chất lượng mã nguồn nhiều lớp thông qua lệnh `pnpm check-all` tại frontend, bao gồm ba bước liên tiếp: (1) ESLint phân tích tĩnh mã nguồn TypeScript; (2) `tsc --noemit` kiểm tra kiểu TypeScript strict mà không sinh mã; và (3) chạy toàn bộ bộ kiểm thử Jest [ref: f2t-frontend/package.json scripts; CLAUDE.md — quy trình]. Quy trình này đặt mục tiêu CI là toàn bộ ba bước đều đi qua mà không có lỗi, đảm bảo tính nhất quán kiểu dữ liệu xuyên suốt codebase TypeScript. Tương tự, backend áp dụng `npm run lint` (ESLint --fix) kết hợp với `npm run test` trước khi đánh dấu hoàn thành bất kỳ module nào [ref: CLAUDE.md — quy ước backend].

## 4.4. Đánh giá hệ thống

### 4.4.1. Đánh giá chức năng tổng quan

Hệ thống F2T được triển khai hoàn chỉnh dưới dạng kiến trúc Monolith + 1 Sidecar, bao gồm 13 module NestJS phía backend [ref: f2t-backend/src/modules/ — 13 thư mục; ledger t1.4-one-sidecar], một pricing-sidecar Python duy nhất trên cổng 8000 phục vụ ba chức năng AI/ML [ref: f2t-backend/src/app.module.ts:57; ledger t1.4-one-sidecar], và ≈48 màn hình route trên ứng dụng di động Expo React Native [ref: ledger t1.15-numbers, t2.2-frontend-routes]. Toàn bộ backend phơi bày khoảng 79 REST endpoint được đếm từ 14 controller thông qua lệnh `grep -rhoE "@(Get|Post|Put|Patch|Delete)\(" src --include="*.controller.ts" | wc -l` [ref: ledger t1.15-numbers], phân bố trên 10 collection MongoDB không có bảng cache suy luận bổ sung [ref: ledger t1.4-collections].

**Bảng 4.6 — Trạng thái hoàn thành 13 module NestJS**

| STT | Module | Endpoint tiêu biểu | Trạng thái chức năng |
|---|---|---|---|
| 1 | `admin` | GET /analytics, PATCH /users/:id/ban | Đã tích hợp đầy đủ |
| 2 | `auth` | POST /register, POST /login, POST /refresh | Đã tích hợp đầy đủ |
| 3 | `delivery` | POST /shipments, GET /tracking/:id | Đã tích hợp (GHN + Dijkstra fallback) [ref: f2t-backend/src/modules/delivery/delivery.service.ts:131,232; ledger t2.2-stripe-ghn] |
| 4 | `demand-forecasting` | POST /demand-forecasting/forecast | Đã tích hợp (gọi ForecasterLSTM qua `/forecast`) [ref: f2t-backend/src/modules/demand-forecasting/demand-forecasting.service.ts:43; ledger t1.4-forecaster-not-holt] |
| 5 | `dynamic-pricing` | GET /price-overrides, PATCH /price-overrides/:id/accept | Đã tích hợp (cron + interceptor + vòng đời PriceOverride) [ref: f2t-backend/src/common/interceptors/dynamic-pricing.interceptor.ts:74-77; ledger t1.4-interceptor-cron] |
| 6 | `farms` | GET /farms/nearby, POST /farms, PATCH /farms/:id | Đã tích hợp đầy đủ |
| 7 | `notifications` | GET /notifications, POST /notifications/read-all | Đã tích hợp (Expo Push + cron cảnh báo tồn kho) |
| 8 | `orders` | POST /orders, PATCH /orders/:id/status | Đã tích hợp đầy đủ |
| 9 | `payments` | POST /payments/checkout, POST /payments/webhook | Đã tích hợp (Stripe Checkout + Webhook) [ref: f2t-backend/src/modules/payments/payments.service.ts:102,120; ledger t2.2-stripe-ghn] |
| 10 | `posts` | POST /posts/add, GET /posts | Đã tích hợp đầy đủ |
| 11 | `products` | GET /products, GET /products/:id | Đã tích hợp đầy đủ |
| 12 | `uploads` | POST /uploads | Đã tích hợp (Cloudinary hoặc fallback local) |
| 13 | `users` | GET /users/me, PATCH /users/me | Đã tích hợp đầy đủ |

Cột "Trạng thái chức năng" phản ánh mức độ tích hợp luồng nghiệp vụ hoàn chỉnh; các module AI/ML (`demand-forecasting`, `dynamic-pricing`) có lưu ý về giới hạn độ chính xác mô hình phục vụ được trình bày chi tiết tại §4.4.2 và §4.4.3. Cụ thể, ForecasterLSTM hiện phục vụ bằng cơ chế tile-21× (lặp lại cùng một vector trạng thái 21 lần thay cho chuỗi lịch sử thật 21 ngày) [ref: pricing-sidecar/main.py:135; ledger t0.4-forecaster-parity, t0.10-thesis-limitations] — xem §4.4.2 để phân tích giới hạn này.

Về giao diện người dùng, ứng dụng Consumer không có màn hình gợi ý sản phẩm [ref: ledger t1.4-no-recommender]; các tính năng AI/ML hiển thị với người dùng cuối bao gồm: nhãn độ tươi và giá động được nhúng vào phản hồi danh sách sản phẩm bởi `DynamicPricingInterceptor` [ref: f2t-backend/src/common/interceptors/dynamic-pricing.interceptor.ts:74-77; ledger t1.4-interceptor-cron], biểu đồ dự báo nhu cầu trên Farm Dashboard, tính năng gợi ý giá DDQN dành cho Farm owner, và tính năng quét độ tươi bằng CoreML cũng dành cho Farm owner [ref: pricing-sidecar/main.py:316; ledger t0.6-coreml-freshness, t1.4-freshness-coreml].

### 4.4.2. Đánh giá dự báo nhu cầu

#### Mô hình và tập dữ liệu đánh giá

Thành phần dự báo nhu cầu trong hệ thống F2T được hiện thực bởi **ForecasterLSTM** — mạng LSTM hai lớp với `obs_dim=10`, `window=21`, `lstm_hidden=128`, và hai đầu ra song song (`demand_head` cho dự báo cầu 7 ngày, `waste_head` cho xác suất hàng tồn bị hỏng) [ref: dynamic-pricing-final/src/forecaster/model.py:9-15,31-49; ledger t0.2-forecaster-arch]. Đánh giá hiệu năng mô hình được thực hiện hoàn toàn **offline** thông qua script `dynamic-pricing-final/src/forecaster/eval.py`, chạy trên tập kiểm tra `data/processed/test.parquet` [ref: dynamic-pricing-final/src/forecaster/eval.py:28-44]. Dữ liệu được tải qua `PerishableForecastDataset`, đưa vào mô hình theo lô 512 mẫu, và toàn bộ suy luận diễn ra trong chế độ `torch.no_grad()` [ref: dynamic-pricing-final/src/forecaster/eval.py:43-57].

#### Định nghĩa chỉ số đánh giá

Hai chỉ số chính được sử dụng để đánh giá ForecasterLSTM:

**MAE/day (Mean Absolute Error per ngày)** đo lường sai số tuyệt đối trung bình của dự báo cầu, tính trên đơn vị *ngày* (không phải 7 ngày). Hàm `compute_demand_mae` tính bằng công thức [ref: dynamic-pricing-final/src/forecaster/eval.py:18-19]:

$$\text{MAE/day} = \frac{1}{N} \sum_{i=1}^{N} \left| \frac{\hat{d}_i}{7} - \frac{d_i}{7} \right|$$

trong đó $\hat{d}_i$ là cầu dự báo 7 ngày và $d_i$ là cầu thực tế 7 ngày của mẫu $i$. Phép chia 7 chuyển đổi đơn vị từ tổng 7 ngày sang trung bình ngày, đảm bảo chỉ số có ý nghĩa trực quan về số đơn vị sản phẩm sai lệch mỗi ngày [ref: dynamic-pricing-final/src/forecaster/eval.py:69].

**AUROC (Area Under the ROC Curve)** đánh giá khả năng phân biệt của đầu ra `waste_logit` so với nhãn nhị phân `waste_7d` (1 nếu hàng tồn bị hỏng trong 7 ngày, 0 nếu không). Hàm `compute_waste_auroc` gọi trực tiếp `roc_auc_score` của scikit-learn; trường hợp tập dữ liệu chỉ có một lớp (toàn 0 hoặc toàn 1), hàm trả về `NaN` thay vì báo lỗi [ref: dynamic-pricing-final/src/forecaster/eval.py:12-15]:

```python
def compute_waste_auroc(logits: np.ndarray, labels: np.ndarray) -> float:
    if labels.sum() == 0 or labels.sum() == len(labels):
        return float("nan")
    return float(roc_auc_score(labels, logits))
```

#### Phương pháp so sánh baseline

Ở trạng thái hiện tại, script `eval.py` tính trực tiếp các chỉ số của **ForecasterLSTM** trên tập `test.parquet` (MAE/day tổng thể và AUROC waste), kèm phân rã theo danh mục [ref: dynamic-pricing-final/src/forecaster/eval.py:68-83]. Ngoài ra, `eval.py` còn hiệu chỉnh xác suất waste bằng hồi quy đơn điệu (Isotonic Regression) khớp trên tập kiểm tra để dùng khi phục vụ [ref: dynamic-pricing-final/src/forecaster/eval.py:22-25,66]. Để định vị giá trị học được của mô hình, phương pháp đánh giá **đề xuất** đối chiếu thêm với một baseline **Naive** (dự báo ngây thơ: lấy giá trị ngày hôm qua làm dự báo cho ngày hôm nay) trên cùng tập `test.parquet` và cùng hai chỉ số. Cần lưu ý baseline Naive này **chưa được hiện thực trong `eval.py`** (script hiện chỉ chấm điểm ForecasterLSTM); việc bổ sung Naive là một mở rộng nhỏ của quy trình đánh giá, được trình bày ở đây như một khung so sánh tham chiếu [ref: dynamic-pricing-final/src/forecaster/eval.py:28-85].

#### Kết quả đánh giá theo danh mục (bảng khung)

Script `eval.py` phân rã kết quả theo bốn danh mục sản phẩm: `leafy` (rau lá), `root` (củ), `fruit` (trái cây), và `herbs` (thảo mộc), tương ứng với `n_categories=4` trong `ForecasterConfig` [ref: dynamic-pricing-final/src/forecaster/eval.py:74-83; dynamic-pricing-final/src/forecaster/model.py:11]. Với mỗi danh mục, ba chỉ số được ghi nhận: MAE/day (sai số cầu trung bình ngày), AUROC (khả năng phân biệt waste), và `waste_rate` (tỉ lệ mẫu thực sự bị hỏng trong tập kiểm tra).

**Bảng 4.7 — Kết quả đánh giá ForecasterLSTM trên tập test.parquet (bảng khung)**
*(Bảng khung — giá trị được điền khi chạy `eval.py`. Hàng ForecasterLSTM do `eval.py` sinh trực tiếp; hàng Naive là baseline đề xuất, cần mở rộng `eval.py` mới tính được — xem ghi chú.)*

| Danh mục | Mô hình | MAE/day (đơn vị SP) | AUROC | Waste rate |
|---|---|---|---|---|
| `leafy` (rau lá) | ForecasterLSTM | — | — | — |
| `leafy` (rau lá) | Naive (đề xuất) | — | — | — |
| `root` (củ) | ForecasterLSTM | — | — | — |
| `root` (củ) | Naive (đề xuất) | — | — | — |
| `fruit` (trái cây) | ForecasterLSTM | — | — | — |
| `fruit` (trái cây) | Naive (đề xuất) | — | — | — |
| `herbs` (thảo mộc) | ForecasterLSTM | — | — | — |
| `herbs` (thảo mộc) | Naive (đề xuất) | — | — | — |
| **Tổng thể** | ForecasterLSTM | — | — | — |
| **Tổng thể** | Naive (đề xuất) | — | — | — |

*Ghi chú: Hàng ForecasterLSTM được điền bằng lệnh `python -m src.forecaster.eval --ckpt <path> --test data/processed/test.parquet` từ thư mục `dynamic-pricing-final/` [ref: dynamic-pricing-final/src/forecaster/eval.py:28-97]. Hàng Naive (đề xuất) hiện CHƯA có trong `eval.py` — chỉ được điền sau khi bổ sung hàm tính baseline ngây thơ. Ngưỡng tham khảo in trong báo cáo của `eval.py`: MAE/day < 3.0 và AUROC > 0.85 [ref: dynamic-pricing-final/src/forecaster/eval.py:90-92].*

[ref: dynamic-pricing-final/src/forecaster/eval.py:74-83,88-97]

#### Giới hạn của đánh giá khi phục vụ trực tuyến

Một hạn chế quan trọng cần lưu ý khi diễn giải kết quả là sự khác biệt giữa đánh giá offline và phục vụ trực tuyến. Trong môi trường phục vụ (serving), hàm `_run_forecaster` tại `pricing-sidecar/main.py` hiện thực cơ chế **tile-21×**: thay vì nhận chuỗi lịch sử 21 ngày thật, sidecar lấy vector quan sát hiện tại (10 chiều) và nhân bản nó thành ma trận `(21, 10)` trước khi đưa vào ForecasterLSTM [ref: pricing-sidecar/main.py:135]:

```python
window = np.tile(obs_padded, (OBS_WINDOW, 1))  # (21, 10)
```

Hệ quả là LSTM nhận đầu vào ở trạng thái steady-state — tất cả 21 bước thời gian đều giống hệt nhau — và không nhìn thấy được các biến động chuỗi thời gian thật (xu hướng, chu kỳ, bất thường). Cơ chế này là một xấp xỉ thực dụng khi chưa có pipeline lưu trữ và cung cấp chuỗi lịch sử 21 ngày trên môi trường phục vụ. Hạn chế này không ảnh hưởng đến đánh giá offline, vốn sử dụng chuỗi dữ liệu thật từ `test.parquet`; do đó, **đánh giá tin cậy về hiệu năng mô hình phải dựa trên kết quả offline từ `eval.py`**, không nên dùng số liệu từ endpoint `/forecast` trong môi trường phục vụ [ref: pricing-sidecar/main.py:135; ledger t0.4-forecaster-parity, t0.10-thesis-limitations].

### 4.4.3. Đánh giá định giá động
<!-- T2.27 ⭐2-lớp: dany.md L557-587; market_env sim + Safety + 3 paper [TLTK]; KHÔNG bịa số; ledger t0.2-action-space, t1.4-safety-5-rules -->

### 4.4.4. Đánh giá phân loại độ tươi
<!-- T2.28 ⭐2-lớp: dany.md L589-599; Confusion Matrix 2×2 + giới hạn 2/4; KHÔNG bịa số; ledger t0.6-coreml-freshness, t0.10 -->

### 4.4.5. Demo sản phẩm

Phần này trình bày tám màn hình đại diện của ứng dụng F2T, bao quát đầy đủ ba vai trò người dùng (Consumer, Farm owner, Admin) và minh họa cách các chức năng AI/ML biểu hiện tường minh trên giao diện sản phẩm. Tất cả màn hình được chụp từ phiên demo với dữ liệu seed (`npm run seed`) trên máy phát triển chạy Expo Go.

---

**Hình 4.1 — [ảnh chụp màn hình: màn hình Home Consumer — danh sách sản phẩm nổi bật theo farm lân cận]**

Màn hình Home hiển thị danh sách sản phẩm được lọc theo vị trí địa lý thông qua truy vấn `$geoNear` trên collection `farms` [ref: f2t-backend/src/modules/farms/farms.service.ts]. Mỗi thẻ sản phẩm hiển thị tên, giá gốc, và ảnh bìa. Không có ô "sản phẩm gợi ý" hay phần "Có thể bạn thích" trên màn hình này — ứng dụng Consumer không có module gợi ý sản phẩm [ref: ledger t1.4-no-recommender].

---

**Hình 4.2 — [ảnh chụp màn hình: màn hình Chi tiết sản phẩm — nhãn độ tươi + giá động DDQN]**

Màn hình Chi tiết sản phẩm hiển thị hai trường bổ sung do `DynamicPricingInterceptor` nhúng vào response: `freshnessScore` (điểm độ tươi từ mô hình CoreML, hiển thị dưới dạng nhãn màu, ví dụ "Tươi — 0.82") và `dynamicPrice` (giá tư vấn AI từ DDQN, ví dụ "23.500 ₫") cùng nhãn `priceTag` ("flash\_discount" khi `deltaPct < 0`, "standard" khi ngược lại) [ref: f2t-backend/src/common/interceptors/dynamic-pricing.interceptor.ts:74-77; ledger t1.4-interceptor-cron]. Cơ chế này hoạt động hoàn toàn trong lớp interceptor mà không yêu cầu thay đổi controller hay frontend.

---

**Hình 4.3 — [ảnh chụp màn hình: màn hình Giỏ hàng và Thanh toán Stripe]**

Màn hình Giỏ hàng tổng hợp danh sách sản phẩm đã chọn với số lượng và đơn giá snapshot (giá tại thời điểm thêm vào giỏ, nhúng trong `OrderItem` theo cơ chế embedded snapshot [ref: f2t-backend/src/modules/orders/schemas/order.schema.ts:7-34; ledger t1.11-schema-detail]). Khi nhấn "Thanh toán", ứng dụng gọi `POST /api/payments/checkout`, nhận `url` Stripe Checkout Session, và mở WebView để Consumer hoàn tất thanh toán [ref: f2t-backend/src/modules/payments/payments.service.ts:102; ledger t2.2-stripe-ghn]. Trạng thái đơn hàng chỉ được cập nhật sau khi nhận webhook `checkout.session.completed` từ Stripe — không dựa vào redirect URL [ref: f2t-backend/src/modules/payments/payments.service.ts:120; ledger t2.2-stripe-ghn].

---

**Hình 4.4 — [ảnh chụp màn hình: màn hình Theo dõi đơn hàng — bản đồ tuyến đường GHN/Dijkstra]**

Màn hình Tracking hiển thị trạng thái đơn hàng theo vòng đời bảy bước (`pending → confirmed → preparing → ready_for_pickup → shipped → delivered → cancelled`) [ref: f2t-backend/src/modules/orders/schemas/order.schema.ts:128-138]. Khi `GHN_TOKEN` được cấu hình, hệ thống sử dụng API GHN để tạo vận đơn và theo dõi trạng thái thực [ref: f2t-backend/src/modules/delivery/delivery.service.ts:131; ledger t2.2-stripe-ghn]; khi chưa cấu hình, hệ thống fallback về thuật toán Dijkstra minh họa với đồ thị 10 nút HCMC hardcoded, trả mã vận đơn demo `GHN-ALGO-F2T-99` [ref: f2t-backend/src/modules/delivery/delivery.service.ts:232; ledger t2.2-stripe-ghn].

---

**Hình 4.5 — [ảnh chụp màn hình: Farm Dashboard — biểu đồ dự báo nhu cầu 7 ngày tới (ForecasterLSTM)]**

Farm Dashboard hiển thị biểu đồ dự báo nhu cầu 7 ngày tới cho từng sản phẩm, lấy từ endpoint `/forecast` của pricing-sidecar qua module `demand-forecasting` [ref: f2t-backend/src/modules/demand-forecasting/demand-forecasting.service.ts:43; ledger t1.4-forecaster-not-holt]. Mô hình phục vụ là ForecasterLSTM (LSTM 2 lớp, window=21, dual-head demand + waste\_logit), tuy nhiên đầu vào hiện tại được tile-21× từ cùng một vector trạng thái thay vì chuỗi lịch sử thật [ref: ledger t0.4-forecaster-parity, t0.10-thesis-limitations] — giới hạn này được phân tích chi tiết tại §4.4.2. Tile hiển thị `demand_7d` (tổng cầu dự kiến 7 ngày) và `waste_prob` (xác suất hàng tồn bị hỏng).

---

**Hình 4.6 ★AI — [ảnh chụp màn hình: Farm — Trang gợi ý giá DDQN (màn hình "Đề xuất giá AI")]**

Màn hình Gợi ý giá cho phép Farm owner xem đề xuất giá tư vấn từ DDQN (SharedMLPDuelingQNet, 11 action `delta_pct ∈ linspace(-0.30, 0.20, 11)`) đã qua Safety Layer 5 quy tắc [ref: pricing-sidecar/safety.py:1-23; ledger t1.4-safety-5-rules]. Mỗi đề xuất hiển thị `targetPrice` (giá tư vấn sau safety clip), `deltaPct` (mức điều chỉnh so với giá gốc), `freshnessScore`, và cờ `safetyClipped` cho biết Safety Layer có can thiệp điều chỉnh hay không. Farm owner có thể chọn "Chấp nhận" (chuyển `PriceOverride.status` sang `accepted`) hoặc "Từ chối" (sang `rejected`) — AI đóng vai trò tư vấn, Farm giữ quyền quyết định cuối [ref: f2t-backend/src/modules/dynamic-pricing/schemas/price-override.schema.ts:45-50; ledger t1.4-interceptor-cron].

---

**Hình 4.7 ★AI — [ảnh chụp màn hình: Farm — Trang quét độ tươi CoreML (camera + kết quả phân loại nhị phân)]**

Màn hình Quét độ tươi cho phép Farm owner chụp ảnh sản phẩm và nhận kết quả phân loại nhị phân (fresh / rotten) từ mô hình CoreML [ref: pricing-sidecar/main.py:316; ledger t0.6-coreml-freshness, t1.4-freshness-coreml]. Ảnh được encode base64, gửi đến endpoint `POST /freshness/classify` của sidecar; sidecar chọn model theo danh mục — `MyFreshnessClassifier-fruit.mlmodel` cho danh mục `fruit`, `MyFreshnessClassifier-root.mlmodel` cho các danh mục còn lại [ref: pricing-sidecar/main.py:316-319]. Kết quả trả về gồm `label` ("fresh"/"rotten"), `score` (0–1), và `tag` mô tả mức độ tươi. Điểm tươi này được lưu vào collection `freshness_cache` và cập nhật vào `PriceOverride` ở lần cron tick tiếp theo.

---

**Hình 4.8 — [ảnh chụp màn hình: Admin Dashboard — thống kê tổng quan nền tảng]**

Màn hình Admin Dashboard nạp dữ liệu từ endpoint `/admin/analytics` và hiển thị khối Overview gồm sáu thẻ chỉ số: tổng người dùng, tổng Farm, tổng đơn hàng, tổng doanh thu, số người dùng mới trong tháng và số đơn mới trong tháng; bên dưới là hai bảng phân rã "Orders by Status" (số đơn theo từng trạng thái) và "Farms by Verification" (số Farm theo trạng thái xác minh) [ref: f2t-frontend/src/app/admin/index.tsx:68-108; f2t-frontend/src/api/admin/use-get-admin-analytics.tsx:12-15]. Từ màn hình này, Admin điều hướng sang các màn quản trị con (Users, Farms, Orders) để thực hiện phê duyệt/từ chối Farm, ban/unban tài khoản và thay đổi vai trò — các thao tác được bảo vệ bởi `AdminGuard` ở phía backend [ref: f2t-backend/src/modules/admin/; ledger t1.4-one-sidecar]. (Báo cáo Shadow — danh sách `PriceOverride` ở trạng thái `shadow` — hiện chỉ tồn tại dưới dạng endpoint backend `GET /dynamic-pricing/shadow-report` [ref: f2t-backend/src/modules/dynamic-pricing/dynamic-pricing.controller.ts:78-84] và CHƯA được tích hợp vào màn hình Admin trên ứng dụng di động.)
