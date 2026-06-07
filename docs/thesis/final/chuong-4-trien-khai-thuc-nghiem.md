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
<!-- T2.24: dany.md L525-533; 54/54 test; ledger t1.15-numbers -->

## 4.4. Đánh giá hệ thống

### 4.4.1. Đánh giá chức năng tổng quan
<!-- T2.25: dany.md L537-541; 13 module, ≈79 endpoint, 10 collection, ≈48 màn hình; ledger t1.15-numbers, t1.4-collections -->

### 4.4.2. Đánh giá dự báo nhu cầu
<!-- T2.26 ⭐2-lớp: dany.md L543-555; eval.py offline + giới hạn tile-21×; KHÔNG bịa số; ledger t0.4-forecaster-parity, t0.10 -->

### 4.4.3. Đánh giá định giá động
<!-- T2.27 ⭐2-lớp: dany.md L557-587; market_env sim + Safety + 3 paper [TLTK]; KHÔNG bịa số; ledger t0.2-action-space, t1.4-safety-5-rules -->

### 4.4.4. Đánh giá phân loại độ tươi
<!-- T2.28 ⭐2-lớp: dany.md L589-599; Confusion Matrix 2×2 + giới hạn 2/4; KHÔNG bịa số; ledger t0.6-coreml-freshness, t0.10 -->

### 4.4.5. Demo sản phẩm
<!-- T2.25: dany.md L601-603; 8 screenshot; ledger t1.4-no-recommender, t1.15-numbers -->
