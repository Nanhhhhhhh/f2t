# CHƯƠNG 2. CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ LIÊN QUAN

## 2.1. Tổng quan lý thuyết cơ sở

### 2.1.1. Thương mại điện tử nông sản và mô hình Farm-to-Table

Thương mại điện tử (TMĐT) nông sản là hình thức ứng dụng các nền tảng kỹ thuật số — trang web, ứng dụng di động, sàn giao dịch trực tuyến — để thực hiện toàn bộ hoặc một phần chuỗi mua bán các sản phẩm nông nghiệp, từ khâu niêm yết hàng hoá, đặt hàng, thanh toán đến giao nhận [TLTK]. So với thương mại truyền thống, TMĐT nông sản rút ngắn khoảng cách địa lý giữa nông hộ và người tiêu dùng, giảm bớt sự phụ thuộc vào chuỗi phân phối nhiều tầng trung gian vốn đẩy giá bán lên cao đồng thời làm suy giảm chất lượng do thời gian vận chuyển kéo dài. Tại Việt Nam, nơi hơn 60% dân số sinh sống ở khu vực nông thôn và nông nghiệp chiếm vai trò nền tảng trong cơ cấu kinh tế [TLTK], TMĐT nông sản đang nổi lên như một hướng đi tất yếu để hiện đại hoá chuỗi giá trị thực phẩm.

Mô hình Farm-to-Table (F2T) — trực dịch là "từ trang trại đến bàn ăn" — là một biến thể của TMĐT nông sản theo hướng loại bỏ tối đa các khâu trung gian, kết nối trực tiếp nông hộ sản xuất với người tiêu dùng cuối. Thay vì sản phẩm phải qua nhiều cấp thu mua, kho bãi và bán sỉ trước khi đến tay người mua, mô hình F2T thiết lập một kênh giao dịch trực tiếp: nông hộ tự đăng sản phẩm, tự quản lý giá bán và tồn kho; người tiêu dùng đặt hàng, thanh toán và nhận hàng trong vòng vài ngày. Điều này không chỉ giúp nông hộ nhỏ cải thiện biên lợi nhuận mà còn cho phép người tiêu dùng tiếp cận thực phẩm tươi, có nguồn gốc rõ ràng với giá cạnh tranh hơn [TLTK]. Xu hướng này đang được thúc đẩy mạnh mẽ bởi sự phổ biến của điện thoại thông minh, cơ sở hạ tầng thanh toán số (ví điện tử, thẻ ngân hàng) và các dịch vụ giao hàng chặng cuối ngày càng rộng khắp tại Việt Nam [TLTK].

### 2.1.2. Trí tuệ nhân tạo trong thương mại điện tử

Trí tuệ nhân tạo (AI) đang trở thành yếu tố cốt lõi giúp các nền tảng TMĐT nâng cao trải nghiệm người dùng và tối ưu hoá vận hành. Về mặt lý thuyết, có thể kể đến bốn nhóm ứng dụng chính của AI trong TMĐT [TLTK]:

(1) **Hệ thống gợi ý sản phẩm (Recommender Systems):** Sử dụng lọc cộng tác, lọc nội dung hoặc mô hình lai để cá nhân hoá danh sách sản phẩm gợi ý cho từng người dùng. Amazon, Shopee là những ví dụ điển hình — thuật toán gợi ý của họ được ước tính đóng góp 20–35% doanh thu [TLTK].

(2) **Dự báo nhu cầu (Demand Forecasting):** Áp dụng các mô hình chuỗi thời gian (ARIMA, LSTM, Transformer) để dự báo nhu cầu ngắn hạn và trung hạn, hỗ trợ quyết định nhập hàng, quản lý tồn kho và giảm lãng phí. Các sàn TMĐT lớn dùng kỹ thuật này để chủ động điều phối kho vùng [TLTK].

(3) **Định giá động (Dynamic Pricing):** Điều chỉnh giá theo thời gian thực dựa trên cung cầu, hàng tồn kho, giá đối thủ và các yếu tố thị trường. Amazon thay đổi giá hàng triệu sản phẩm mỗi ngày nhờ thuật toán học tăng cường [TLTK].

(4) **Nhận diện và phân loại ảnh (Visual AI):** Sử dụng mạng nơ-ron tích chập (CNN) để phân tích ảnh sản phẩm nhằm phân loại chất lượng, phát hiện hư hỏng, hoặc tự động gắn nhãn danh mục — đặc biệt hữu ích trong thực phẩm tươi sống [TLTK].

Cần lưu ý rằng bốn ứng dụng trên là khung lý thuyết chung áp dụng cho TMĐT nói chung. Trong phạm vi hệ thống F2T được trình bày trong khoá luận này, **cả bốn ứng dụng đều được hiện thực hoá: dự báo nhu cầu (ForecasterLSTM), định giá động (DDQN), phân loại độ tươi từ ảnh (CoreML), và gợi ý sản phẩm trong giỏ hàng (cross-sell FP-Growth association rules, category-level warm-start)** [ref: ledger cross-sell-v1; ledger t1.4-forecaster-not-holt; ledger t0.6-coreml-freshness].

### 2.1.3. Quản lý dự án với Agile/Scrum

Agile là triết lý phát triển phần mềm nhấn mạnh tính linh hoạt, cộng tác liên tục và phân phối giá trị theo từng gia số nhỏ thay vì lập kế hoạch cứng nhắc theo kiểu thác nước (Waterfall) [TLTK]. Scrum là một khung thực hành (framework) phổ biến nhất trong hệ sinh thái Agile, tổ chức công việc thành các vòng lặp cố định có thời hạn gọi là **Sprint** (thường từ một đến bốn tuần), trong đó nhóm cam kết hoàn thành một tập hợp công việc được ưu tiên từ **Product Backlog** [TLTK].

Các nghi lễ chính của Scrum bao gồm **Sprint Planning** (lập kế hoạch Sprint — chọn items từ Backlog vào Sprint Backlog, ước lượng effort), **Daily Standup** (cuộc họp đứng ngắn hàng ngày — cập nhật tiến độ, nêu trở ngại), **Sprint Review** (demo sản phẩm với stakeholder cuối Sprint) và **Sprint Retrospective** (cải tiến quy trình nhóm) [TLTK]. Vai trò chính gồm **Product Owner** (ưu tiên Backlog, đại diện khách hàng), **Scrum Master** (loại bỏ trở ngại, bảo vệ Sprint) và **Development Team** [TLTK].

Trong dự án F2T — vốn được phát triển bởi một sinh viên trong thời gian khoá luận — Scrum được áp dụng theo hướng tinh giản: mỗi Sprint kéo dài một đến hai tuần, tương ứng với việc hoàn thiện một module chức năng cụ thể (xác thực người dùng, quản lý nông trại, đặt hàng, thanh toán, AI/ML sidecar v.v.). Product Backlog được duy trì dưới dạng danh sách task ưu tiên, cập nhật liên tục theo phản hồi từ quá trình kiểm thử và điều chỉnh yêu cầu. Việc áp dụng Scrum giúp kiểm soát phạm vi từng Sprint, tránh tình trạng scope creep khi phát triển nhiều module song song, và đảm bảo mỗi Sprint kết thúc bằng một increment chạy được [ref: ledger t1.4-interceptor-cron].

---

## 2.2. Kiến trúc hệ thống

### 2.2.1. So sánh Monolithic vs Microservices vs Sidecar

Lựa chọn kiến trúc hệ thống là quyết định nền tảng ảnh hưởng đến khả năng bảo trì, mở rộng và phức tạp vận hành trong suốt vòng đời phần mềm. Ba phong cách kiến trúc phổ biến trong phát triển ứng dụng hiện đại được tóm tắt như sau [TLTK]:

**Kiến trúc Monolithic (Đơn khối)** đóng gói toàn bộ logic nghiệp vụ, truy cập dữ liệu và giao diện vào một artifact triển khai duy nhất. Ưu điểm là đơn giản về phát triển ban đầu và debug, giao tiếp nội bộ qua lời gọi hàm (không có độ trễ mạng). Nhược điểm lộ rõ khi ứng dụng lớn lên: mọi thay đổi nhỏ đều yêu cầu build và deploy lại toàn bộ; không thể dùng ngôn ngữ lập trình khác cho một phần logic (ví dụ: không thể chạy Python AI trong cùng process với Node.js).

**Kiến trúc Microservices** phân rã ứng dụng thành các dịch vụ độc lập, mỗi dịch vụ sở hữu nghiệp vụ riêng, CSDL riêng và chu trình triển khai độc lập. Ưu điểm: khả năng mở rộng theo chiều ngang từng dịch vụ riêng biệt, đa ngôn ngữ (polyglot), cách ly lỗi. Nhược điểm: đòi hỏi hạ tầng phức tạp (container orchestration, service mesh, distributed tracing), chi phí vận hành cao, phù hợp với nhóm nhiều người [TLTK].

**Mô hình Monolith + Sidecar** là phương án cân bằng: phần lõi nghiệp vụ vẫn là một monolith duy nhất (dễ phát triển, dễ debug), nhưng các thành phần có yêu cầu công nghệ đặc biệt — cụ thể là AI/ML đòi hỏi Python và PyTorch — được tách ra thành một tiến trình sidecar riêng biệt giao tiếp qua HTTP nội bộ [TLTK]. Cách tiếp cận này giữ sự đơn giản của monolith cho phần backend chính, đồng thời cho phép sử dụng hệ sinh thái Python (PyTorch, coremltools, FastAPI) cho phần AI.

Bảng 2.1 tóm tắt so sánh ba kiến trúc theo năm tiêu chí:

| Tiêu chí | Monolithic | Microservices | Monolith + Sidecar |
|---|---|---|---|
| Độ phức tạp triển khai | Thấp | Cao (container orchestration) | Trung bình (2 process) |
| Đa ngôn ngữ | Không | Có | Có (core + sidecar khác ngôn ngữ) |
| Khả năng mở rộng | Hạn chế | Cao (per-service) | Trung bình (scale cả cụm) |
| Phù hợp nhóm nhỏ | Rất tốt | Kém | Tốt |
| Debug & tracing | Đơn giản | Phức tạp | Đơn giản (giao tiếp HTTP nội bộ) |

Đối với F2T — dự án do một sinh viên phát triển trong thời gian khoá luận — Microservices là quá phức tạp về mặt vận hành, trong khi Monolithic thuần tuý không thể đáp ứng yêu cầu chạy mô hình AI Python. **Monolith + 2 Sidecar** vì vậy là lựa chọn phù hợp nhất [ref: ledger numbers-v3].

### 2.2.2. Kiến trúc REST API và giao tiếp giữa các dịch vụ

REST (Representational State Transfer) là phong cách kiến trúc cho hệ thống phân tán dựa trên giao thức HTTP, sử dụng các phương thức GET, POST, PUT, PATCH, DELETE để thao tác tài nguyên được xác định bởi URI [TLTK]. Dữ liệu trao đổi chủ yếu theo định dạng JSON — nhẹ, dễ parse, được hỗ trợ rộng rãi trên mọi nền tảng. REST API tuân thủ nguyên tắc **stateless** (mỗi request chứa đủ thông tin để xử lý độc lập, server không lưu session) và **uniform interface** (tài nguyên được xác định nhất quán qua URI) [TLTK].

Trong hệ thống F2T, tất cả giao tiếp giữa frontend và backend, cũng như giữa backend NestJS và sidecar Python, đều dùng REST API qua HTTP JSON [ref: f2t-backend/src/app.module.ts:57; ledger t1.4-one-sidecar]. Backend NestJS expose 92 REST endpoint trên 16 controller [ref: ledger numbers-v3]; pricing-sidecar expose 3 endpoint (`/predict`, `/forecast`, `/freshness/classify`) trên cổng 8000 [ref: pricing-sidecar/main.py:263, 277, 316]; recommender-sidecar expose 2 endpoint (`/recommend`, `/health`) trên cổng 8001 [ref: recommender-sidecar/main.py:61,56]. Giao tiếp backend → sidecar diễn ra hoàn toàn nội bộ (localhost), không qua mạng ngoài, nên độ trễ bổ sung là không đáng kể.

Một điểm quan trọng trong thiết kế giao tiếp của F2T là cơ chế **graceful degradation**: khi sidecar không phản hồi (lỗi mạng, sidecar khởi động chậm), backend bắt ngoại lệ và trả về kết quả dự phòng thay vì để request thất bại hoàn toàn [ref: f2t-backend/src/modules/dynamic-pricing/dynamic-pricing.service.ts:283-285; ledger t2.2-security]. Điều này đảm bảo các tính năng TMĐT cốt lõi (duyệt sản phẩm, đặt hàng, thanh toán) không bị gián đoạn ngay cả khi module AI gặp sự cố.

---

## 2.3. Công nghệ và công cụ phát triển

### 2.3.1. Frontend: React Native + Expo

React Native là framework phát triển ứng dụng di động đa nền tảng do Meta (Facebook) phát triển, cho phép viết một codebase JavaScript/TypeScript duy nhất nhưng render ra UI native thực sự trên cả iOS và Android [TLTK]. Không như các giải pháp WebView (Ionic, Cordova) render HTML trong một trình duyệt nhúng, React Native ánh xạ các component React sang các widget native tương ứng của từng nền tảng, nhờ đó đạt hiệu năng và cảm giác tương tác gần với ứng dụng native hoàn toàn [TLTK].

So với Flutter — đối thủ chính trong không gian cross-platform — React Native có lợi thế là tái sử dụng được kiến thức của đội ngũ đã có kinh nghiệm React/JavaScript, có hệ sinh thái thư viện phong phú hơn và được tích hợp chặt hơn với cộng đồng web [TLTK]. Đây là lý do React Native được lựa chọn cho F2T.

**Expo** là nền tảng và bộ công cụ xây dựng trên React Native, cung cấp SDK đóng gói sẵn nhiều API native (camera, file system, push notification, location...) và hệ thống build tự động [TLTK]. F2T sử dụng **Expo SDK ~53.0.27** với các thành phần cốt lõi [ref: ledger t2.2-tech-versions]:

- **expo-router ~5.1.11** — routing file-based theo chuẩn Next.js; 56 màn hình route phân nhóm trong 8 route group `(app)`, `admin`, `checkout`, `farms`, `feed`, `notifications`, `products`, `settings` và 5 file xác thực gốc [ref: ledger t2.2-frontend-routes; t1.15-numbers].
- **react-native 0.79.6** — core bridge React Native.
- **NativeWind ^4.1.21** — utility-first CSS (Tailwind) cho React Native, tạo style qua className string; cần `useMemo` để ổn định object style tránh render loop do `Object.is` comparison [TLTK].
- **Zustand ^5.0.5** — thư viện quản lý state global nhẹ, không cần boilerplate Redux, dùng cho auth state, cart, user session [TLTK].
- **react-native-mmkv ~3.1.0** — persistent key-value storage dựa trên MMKV (Tencent), nhanh hơn AsyncStorage, dùng để lưu JWT token và cache nhỏ [TLTK].
- **@tanstack/react-query ^5.52.1** — quản lý server state, caching và synchronization cho các API call [TLTK].

### 2.3.2. Backend: NestJS + Node.js

NestJS là framework Node.js viết bằng TypeScript, lấy cảm hứng từ kiến trúc Angular với hệ thống **Dependency Injection (DI)** tường minh, giúp các thành phần phụ thuộc được tiêm tự động theo cơ chế IoC (Inversion of Control), giảm coupling và tăng khả năng test [TLTK]. So với Express.js thuần tuý — vốn là micro-framework tự do — NestJS áp đặt cấu trúc module rõ ràng, phù hợp hơn cho dự án quy mô vừa với nhiều tính năng nghiệp vụ [TLTK].

F2T sử dụng **@nestjs/common 11.0.1** và **@nestjs/core 11.0.1** [ref: ledger t2.2-tech-versions], tổ chức nghiệp vụ thành 15 module: `admin`, `auth`, `delivery`, `demand-forecasting`, `dynamic-pricing`, `farms`, `notifications`, `orders`, `payments`, `posts`, `products`, `recommendations`, `reviews`, `uploads`, `users` [ref: f2t-backend/src/modules/ — 15 thư mục; ledger numbers-v3].

Các pattern NestJS được sử dụng trong F2T bao gồm:

- **Guards** (`JwtAuthGuard` mở rộng từ `AuthGuard('jwt')` của `@nestjs/passport`) — kiểm tra JWT token trước mỗi endpoint được bảo vệ [ref: f2t-backend/src/modules/auth/guards/jwt-auth.guard.ts:1-5; ledger t2.2-security].
- **Interceptors** (`DynamicPricingInterceptor`) — chặn response của endpoint `/products` để nhúng thêm `dynamicPrice`, `freshnessScore`, `priceTag` từ sidecar [ref: ledger t1.4-interceptor-cron].
- **Pipes** (`ValidationPipe` toàn cục) — tự động validate và transform request body theo các class DTO dùng **class-validator 0.14.2** và **class-transformer** [ref: ledger t2.2-tech-versions].
- **Scheduler** (`@nestjs/schedule` ^6.1.3) — cron job `PricingTickCron` chạy định kỳ theo lịch `"0 * * * *"` (mỗi giờ đầu giờ) để cập nhật giá hàng loạt [ref: ledger t1.4-interceptor-cron].

TypeScript được chọn vì cung cấp type safety tĩnh, giúp phát hiện lỗi sớm tại compile time, cải thiện tự động hoàn thành (autocomplete) trong IDE và là yêu cầu bắt buộc của NestJS [TLTK].

### 2.3.3. Cơ sở dữ liệu: MongoDB

MongoDB là hệ quản trị cơ sở dữ liệu NoSQL dạng document, lưu dữ liệu theo định dạng BSON (Binary JSON), cho phép mỗi document trong cùng collection có cấu trúc (schema) khác nhau [TLTK]. So với CSDL quan hệ (SQL), MongoDB phù hợp hơn cho TMĐT vì: (1) schema linh hoạt — sản phẩm nông sản có nhiều thuộc tính biến thiên theo danh mục; (2) document embedding — có thể nhúng sub-document (ví dụ: `OrderItem` nhúng trong `Order`) thay vì JOIN nhiều bảng; (3) horizontal sharding dễ dàng khi cần mở rộng [TLTK].

F2T sử dụng **mongoose 8.19.1** làm ODM (Object Document Mapper), cung cấp lớp Schema và Model với validation tích hợp và hỗ trợ Typescript type inference [ref: ledger t2.2-tech-versions]. Hệ thống bao gồm 12 collection: `users`, `farms`, `products`, `orders`, `posts`, `notifications`, `notification_preferences`, `freshness_cache`, `price_overrides`, `verification_tokens`, `reviews`, `password_reset_tokens` [ref: ledger numbers-v3; t1.11-schema-detail]. Đáng chú ý, `OrderItem` được thiết kế dạng **Embedded Document** (`@Schema({_id: false})`) bên trong `Order` — lưu snapshot tên sản phẩm, giá, đơn vị tại thời điểm đặt hàng để đảm bảo tính toàn vẹn lịch sử khi giá hoặc thông tin sản phẩm thay đổi sau này [ref: f2t-backend/src/modules/orders/schemas/order.schema.ts:7-34; ledger t1.11-schema-detail].

### 2.3.4. AI/ML Sidecar: FastAPI + Python

FastAPI là web framework Python hiệu năng cao, xây dựng trên ASGI (Asynchronous Server Gateway Interface) và Pydantic, cho phép khai báo API endpoint và schema validation bằng Python type hint [TLTK]. So với Flask (framework WSGI đồng bộ truyền thống), FastAPI xử lý request bất đồng bộ hiệu quả hơn, tự động sinh tài liệu OpenAPI (Swagger UI) từ type annotation, và tích hợp validation dữ liệu đầu vào/đầu ra qua Pydantic v2 [TLTK]. F2T sử dụng **fastapi>=0.111** và **uvicorn[standard]>=0.29.0** làm ASGI server [ref: ledger t2.2-tech-versions].

Trong sidecar F2T, mô hình AI/ML được load một lần vào bộ nhớ tại thời điểm khởi động service (thông qua cơ chế `lifespan` của FastAPI) và tái sử dụng cho mọi request sau đó — tránh overhead load model lại mỗi lần gọi [ref: pricing-sidecar/main.py]. Ba endpoint của sidecar là:

- `POST /forecast` — nhận vector trạng thái hiện tại và trả về dự báo nhu cầu 7 ngày tới từ ForecasterLSTM [ref: pricing-sidecar/main.py:263].
- `POST /predict` — nhận payload 9 trường từ backend, xây dựng obs 10 chiều, chạy SharedMLPDuelingQNet, áp Safety Layer 5 quy tắc và trả về giá tư vấn [ref: pricing-sidecar/main.py:277].
- `POST /freshness/classify` — nhận ảnh base64, chạy CoreML inference và trả về điểm độ tươi [ref: pricing-sidecar/main.py:316].

Thư viện AI/ML sử dụng: **torch>=2.2.0** (PyTorch — framework deep learning), **coremltools>=7.0** (Apple CoreML Python binding), **Pillow>=10.0.0** (xử lý ảnh), **numpy>=1.26.0** (tính toán số) [ref: ledger t2.2-tech-versions].

### 2.3.5. Tích hợp bên thứ ba

**Stripe:** F2T tích hợp Stripe Checkout Session để xử lý thanh toán trực tuyến. Khi người dùng thanh toán đơn hàng, backend gọi `stripe.checkout.sessions.create(...)` để tạo phiên thanh toán và trả về URL redirect cho frontend [ref: f2t-backend/src/modules/payments/payments.service.ts:54,102; ledger t2.2-stripe-ghn]. Sau khi thanh toán thành công, Stripe gửi webhook event `checkout.session.completed` đến endpoint `POST /payments/webhook`; backend dùng `stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)` để xác thực chữ ký webhook trước khi cập nhật trạng thái đơn hàng [ref: f2t-backend/src/modules/payments/payments.service.ts:120-133; ledger t2.2-stripe-ghn]. Thư viện sử dụng: **stripe ^22.1.1** [ref: ledger t2.2-tech-versions].

**GHN (Giao Hàng Nhanh):** F2T tích hợp GHN API để tạo vận đơn giao hàng thực. Sau khi đơn hàng được xác nhận, backend gọi GHN `POST /v2/shipping-order/create` với header xác thực Token và ShopId; GHN trả về mã vận đơn, thời gian giao dự kiến và phí giao hàng [ref: f2t-backend/src/modules/delivery/providers/ghn.provider.ts:47-89; ledger t2.2-stripe-ghn]. Trong trường hợp GHN chưa tạo vận đơn (demo, test), backend cung cấp một thuật toán Dijkstra minh họa trên đồ thị 10 node TP.HCM làm fallback, trả về mã theo dõi `'GHN-ALGO-F2T-99'` [ref: f2t-backend/src/modules/delivery/delivery.service.ts:98-232; ledger t2.2-stripe-ghn] — đây là giải pháp minh họa thuật toán, không phải routing sản xuất.

---

## 2.4. Nền tảng lý thuyết AI/ML

### 2.4.1. Dự báo chuỗi thời gian với LSTM

**Bài toán dự báo chuỗi thời gian** là bài toán suy luận giá trị tương lai dựa trên chuỗi quan sát trong quá khứ. Trong bối cảnh nông sản, nhu cầu mua hàng thường phụ thuộc vào các chu kỳ ngắn hạn (ngày trong tuần, mùa vụ) và lịch sử gần đây (tồn kho, xu hướng tiêu thụ). Mô hình F2T giải quyết bài toán này bằng cách dự báo nhu cầu 7 ngày tới từ cửa sổ lịch sử 21 bước quan sát (window=21) [ref: dynamic-pricing-final/src/forecaster/model.py:10].

**LSTM (Long Short-Term Memory)** là một biến thể đặc biệt của mạng nơ-ron hồi quy (RNN), được giới thiệu bởi Hochreiter và Schmidhuber (1997), thiết kế để khắc phục vấn đề vanishing gradient của RNN tiêu chuẩn — tức hiện tượng gradient giảm dần về gần 0 theo thời gian khiến mô hình không thể học được các phụ thuộc xa [TLTK]. LSTM đạt được điều này bằng cách giới thiệu **cell state** — một dòng thông tin chạy xuyên suốt chuỗi với ít phép biến đổi — cùng với ba cơ chế kiểm soát gọi là **gate** [TLTK]:

$$i_t = \sigma(W_i \cdot [h_{t-1}, x_t] + b_i) \quad \text{(input gate — kiểm soát thông tin mới)}$$
$$f_t = \sigma(W_f \cdot [h_{t-1}, x_t] + b_f) \quad \text{(forget gate — kiểm soát quên thông tin cũ)}$$
$$o_t = \sigma(W_o \cdot [h_{t-1}, x_t] + b_o) \quad \text{(output gate — kiểm soát đầu ra)}$$
$$c_t = f_t \odot c_{t-1} + i_t \odot \tanh(W_c \cdot [h_{t-1}, x_t] + b_c)$$
$$h_t = o_t \odot \tanh(c_t)$$

trong đó $\sigma$ là hàm sigmoid, $\odot$ là phép nhân phần tử; $c_t$ và $h_t$ lần lượt là cell state và hidden state tại bước $t$ [TLTK]. Ba gate giúp LSTM linh hoạt quyết định thông tin nào cần ghi nhớ dài hạn, thông tin nào cần quên và thông tin nào đưa ra output — từ đó học được các phụ thuộc dài hạn mà RNN thường bỏ qua.

**Kiến trúc ForecasterLSTM trong F2T** được định nghĩa tường minh như sau [ref: dynamic-pricing-final/src/forecaster/model.py:8-49]:

- `ForecasterConfig`: `obs_dim=10`, `window=21`, `n_categories=4`, `cat_embed_dim=8`, `lstm_hidden=128`, `lstm_layers=2`, `lstm_dropout=0.2` [ref: dynamic-pricing-final/src/forecaster/model.py:9-15].
- **Input:** tensor hình dạng `(batch, window=21, obs_dim=10)` — mỗi bước thời gian là một vector 10 chiều đặc trưng sản phẩm (xem §2.4.2 để biết 10 chiều này).
- **Category Embedding:** `nn.Embedding(n_categories=4, cat_embed_dim=8)` — ánh xạ chỉ số category (0..3: leafy/root/fruit/herbs) thành vector 8 chiều, cho phép mô hình học đặc trưng riêng từng danh mục nông sản [ref: dynamic-pricing-final/src/forecaster/model.py:22].
- **LSTM stack:** 2 lớp LSTM xếp chồng (`nn.LSTM(input_size=10, hidden_size=128, num_layers=2, batch_first=True, dropout=0.2)`) — dropout 0.2 áp dụng giữa hai lớp LSTM, giúp regularization [ref: dynamic-pricing-final/src/forecaster/model.py:23-29].
- **Concatenation:** hidden state cuối (`last = lstm_out[:, -1, :]`, shape `128`) nối với category embedding (shape `8`) cho vector ngữ cảnh `z` có chiều `128+8=136` [ref: dynamic-pricing-final/src/forecaster/model.py:30, 44-45].
- **Dual-head output:**
  - `demand_head`: `nn.Linear(136, 1)` → dự báo nhu cầu tổng hợp 7 ngày [ref: dynamic-pricing-final/src/forecaster/model.py:31, 47].
  - `waste_head`: `nn.Sequential(Linear(136,64), ReLU, Dropout(0.2), Linear(64,1))` → logit xác suất hỏng (waste probability) [ref: dynamic-pricing-final/src/forecaster/model.py:32-37, 48].
- **Output:** `{"demand": Tensor(batch,), "waste_logit": Tensor(batch,)}` [ref: dynamic-pricing-final/src/forecaster/model.py:46-49].

Kiến trúc dual-head cho phép một lần forward pass thu được đồng thời hai thông tin hữu ích: dự báo nhu cầu (dùng làm input cho bài toán định giá) và xác suất hỏng (cảnh báo sớm về độ tươi). Sơ đồ kiến trúc chi tiết xem tại Hình §2.4.1 — `diagrams/net-forecaster-lstm.puml` [ref: ledger t0.2-forecaster-arch, t0.4-forecaster-parity].

Sau quá trình retrain với `obs_dim=10` (T0.13), checkpoint hiện tại (`forecaster_v4_best.pt`, epoch 41, `val_loss=3.114`) hoàn toàn khớp với môi trường production — không còn layout mismatch. Giới hạn còn tồn tại trong phiên bản hiện tại: sidecar phục vụ bằng cách tile obs hiện tại 21× (do backend chưa cung cấp chuỗi 21 bước lịch sử thật) — điều này sẽ được thảo luận trong phần giới hạn [ref: ledger t0.10-thesis-limitations].

### 2.4.2. Học tăng cường và DDQN

**Học tăng cường (Reinforcement Learning — RL)** là mô hình học máy trong đó một **Agent** tương tác liên tục với **Môi trường (Environment)**, quan sát **State** $s$, chọn **Action** $a$, nhận **Reward** $r$ và chuyển sang State mới $s'$. Mục tiêu của Agent là học một **Policy** $\pi(a|s)$ tối đa hóa tổng phần thưởng tích lũy chiết khấu $G_t = \sum_{k=0}^{\infty} \gamma^k r_{t+k}$ (với $\gamma \in [0,1)$ là hệ số chiết khấu) [TLTK; ref: ledger t0.2-ddqn-arch].

**Q-Learning** xấp xỉ hàm Q (action-value function) $Q(s,a) = \mathbb{E}[G_t | s_t=s, a_t=a]$ — phần thưởng kỳ vọng tích lũy khi chọn action $a$ ở state $s$ rồi tiếp tục theo policy tối ưu. Bellman equation cho Q tối ưu là $Q^*(s,a) = r + \gamma \max_{a'} Q^*(s', a')$ [TLTK].

**DQN (Deep Q-Network)** (Mnih et al., 2015) thay thế bảng Q-table bằng mạng nơ-ron sâu làm xấp xỉ hàm Q [TLTK]. DQN giới thiệu hai kỹ thuật then chốt: **Experience Replay** (lưu transitions $(s,a,r,s')$ vào replay buffer, huấn luyện từ mini-batch ngẫu nhiên để giảm tương quan giữa các mẫu liên tiếp) và **Target Network** (mạng target riêng, cập nhật chậm để ổn định target Q khi huấn luyện) [TLTK].

**Double DQN (DDQN)** (van Hasselt et al., 2016) giải quyết vấn đề **overestimation bias** của DQN tiêu chuẩn — xảy ra khi cùng mạng vừa chọn action vừa đánh giá giá trị của action đó, dẫn đến ước lượng Q bị thổi phồng [TLTK]. DDQN tách bạch hai bước:

$$a^* = \arg\max_{a'} Q_{\text{online}}(s', a') \quad \text{(online net chọn action)}$$
$$y = r + \gamma \cdot Q_{\text{target}}(s', a^*) \quad \text{(target net đánh giá giá trị)}$$

**Dueling DQN** (Wang et al., 2016) cải tiến kiến trúc mạng bằng cách tách head thành hai nhánh song song [TLTK]:

- **Value stream** $V(s)$: ước lượng giá trị của state $s$ độc lập với action.
- **Advantage stream** $A(s,a)$: ước lượng lợi thế của từng action so với trung bình.
- Kết hợp: $Q(s,a) = V(s) + A(s,a) - \frac{1}{|A|}\sum_{a'} A(s,a')$

Việc trừ đi mean Advantage đảm bảo tính identifiability (tách biệt được V và A). Dueling DQN đặc biệt hiệu quả khi nhiều action có giá trị tương đương — mạng có thể học V(s) tốt ngay cả khi ít được thăm dò đầy đủ mọi action [TLTK].

**Áp dụng trong F2T — bài toán định giá động:**

State 10 chiều được xây dựng tại `pricing-sidecar/main.py:114-125` [ref: pricing-sidecar/main.py:114-125; ledger t0.2-action-space, t1.4-ddqn-dims]:

| Chiều | Tên | Mô tả |
|---|---|---|
| 0 | `freshness` | Điểm độ tươi [0,1] từ CoreML hoặc Weibull fallback |
| 1 | `inv_ratio` | Tỉ lệ tồn kho = `availableQty/100`, clip [0,2] |
| 2 | `sin_dow` | $\sin(2\pi \cdot \text{weekday}/7)$ |
| 3 | `cos_dow` | $\cos(2\pi \cdot \text{weekday}/7)$ |
| 4 | `days_to_restock` | Số ngày đến lần nhập hàng tiếp theo / 30, clip [0,1] |
| 5 | `demand_ratio` | `(demand\_7d/7) / base\_demand`, clip [0,3] |
| 6 | `prev_delta` | Delta giá kỳ trước, clip [-0.30, 0.20] |
| 7 | `comp_ratio` | `competitor\_price / current\_price`, clip [0.5, 2.0] |
| 8 | `days_to_waste` | Số ngày dự kiến hỏng / 14, clip [0,1] |
| 9 | `inv_coverage` | `tồn kho / demand\_7d`, clip [0,3] |

Không gian hành động gồm **11 mức điều chỉnh giá** (action candidates) được xác định bởi `CANDIDATES = np.linspace(-0.30, 0.20, 11)` (bước 0.05, CANDIDATES[6]=0.0 cố định về đúng 0.0) [ref: dynamic-pricing-final/src/rl/reward.py:6-7]: {−0.30, −0.25, −0.20, −0.15, −0.10, −0.05, 0.00, +0.05, +0.10, +0.15, +0.20}. Giá trị dương là tăng giá, âm là giảm giá so với giá gốc.

**Kiến trúc mạng SharedMLPDuelingQNet** [ref: dynamic-pricing-final/src/rl/network.py:51-81]:
- `__init__(obs_dim=10, n_cats=4, cat_embed_dim=8, hidden=128, n_actions=11)`.
- **Category embedding:** `nn.Embedding(4, 8)` — ánh xạ category ID thành vector 8 chiều.
- **Shared MLP:** `Linear(10+8=18, 128) → ReLU → Linear(128, 128) → ReLU` — xử lý obs nối với cat embedding.
- **V-stream:** `Linear(128, 64) → ReLU → Linear(64, 1)` — value head.
- **A-stream:** `Linear(128, 64) → ReLU → Linear(64, 11)` — advantage head.
- **Output:** `Q = V + A − mean(A)`, shape `(batch, 11)` [ref: dynamic-pricing-final/src/rl/network.py:76-81].
- **Action masking:** các action bị cấm (theo freshness/category rule) bị che bằng `-inf` trước khi `argmax` [ref: dynamic-pricing-final/src/rl/network.py:79-81].

Việc chia sẻ một mạng cho cả 4 category qua embedding (thay vì 4 mạng riêng) giảm bộ tham số và cho phép transfer learning giữa các category tương đồng. Sơ đồ kiến trúc chi tiết xem tại Hình §2.4.2 — `diagrams/net-ddqn-dueling.puml` [ref: ledger t0.2-ddqn-arch, t1.4-ddqn-dims].

### 2.4.3. Phân loại ảnh và CoreML

**Transfer Learning** là kỹ thuật tái sử dụng một mô hình đã được huấn luyện trên tập dữ liệu lớn (ví dụ ImageNet với 1.2 triệu ảnh, 1000 class) làm **feature extractor** cho bài toán mới [TLTK]. Thay vì huấn luyện từ đầu (from scratch) — tốn nhiều dữ liệu và thời gian — transfer learning chỉ thay thế lớp phân loại cuối của mạng pretrained bằng lớp phù hợp với bài toán đích, sau đó fine-tune trên tập dữ liệu nhỏ hơn. Kỹ thuật này đặc biệt hiệu quả trong phân loại ảnh nông sản, nơi dữ liệu có nhãn thường khan hiếm [TLTK; ref: ledger t1.4-freshness-coreml].

**Mạng nơ-ron tích chập (CNN)** là kiến trúc deep learning nền tảng cho xử lý ảnh, sử dụng các lớp tích chập (Convolution) để trích xuất đặc trưng không gian phân cấp: từ các đặc trưng cấp thấp (cạnh, góc, kết cấu) đến các đặc trưng cấp cao (hình dạng đối tượng, màu sắc toàn cục) [TLTK]. Các kiến trúc nhẹ như MobileNet hay SqueezeNet — được thiết kế để giảm số tham số và phép tính nhân-cộng (FLOP) — là lựa chọn phù hợp cho inference trên thiết bị edge (mobile, embedded) nơi tài nguyên tính toán và pin có hạn [TLTK; ref: ledger t0.6-coreml-freshness].

**Apple CoreML** là framework on-device machine learning của Apple cho iOS/macOS, cho phép chạy inference trực tiếp trên thiết bị người dùng mà không cần gửi dữ liệu lên server [TLTK]. Model được đóng gói dạng file `.mlmodel`, gọi inference qua Python API `model.predict({"image": img})` trong sidecar (server-side) hoặc qua CoreML framework trong ứng dụng iOS. Đầu vào ảnh cần resize về kích thước chuẩn; đầu ra là dict chứa nhãn dự đoán và xác suất từng class [TLTK; ref: pricing-sidecar/main.py:324].

Một điểm kỹ thuật quan trọng đã được xác minh trong quá trình phát triển F2T: model CoreML khai báo `colorSpace=BGR` trong metadata (artifact của công cụ Create ML/Metal), **nhưng sidecar feed ảnh RGB** qua `.convert("RGB")` — `main.py:324` [ref: pricing-sidecar/main.py:324]. Thực nghiệm xác nhận đây là cách feed đúng: feed RGB cho fresh probability 0.9634 với ảnh lá xanh, trong khi nếu hoán kênh BGR cho kết quả ngược chiều (0.1628). Mã nguồn coremltools 9.0 xác nhận framework chỉ validate mode, **không thực hiện hoán kênh** — vì vậy `colorSpace=BGR` là metadata trang trí, không ảnh hưởng đến thứ tự kênh thực tế khi predict [ref: ledger t0.9-fixes].

**Áp dụng trong F2T:** hệ thống sử dụng **2 model CoreML nhị phân** (phân loại fresh/rotten) [ref: pricing-sidecar/main.py:318-333; ledger t0.6-coreml-freshness, t1.4-freshness-coreml]:

- `MyFreshnessClassifier-fruit.mlmodel` — dành cho category `"fruit"` / `"fruits"`.
- `MyFreshnessClassifier-root.mlmodel` — dành cho tất cả category còn lại (`root`, `leafy`, `herbs`) theo thiết kế fallback cố ý (`model_key = "fruit" if req.category in ("fruit","fruits") else "root"`, `main.py:318`).

Ảnh đầu vào được resize về **299×299 pixel**, feed ở định dạng RGB (`PIL.Image.open(...).convert("RGB").resize((299,299))`). Output của mỗi model gồm:
- `target`: chuỗi `"fresh"` hoặc `"rotten"`.
- `targetProbability`: dict `{"fresh": float, "rotten": float}`.

Sidecar tính điểm tươi `score = fresh_probability`, phân loại thành 3 tag: `"fresh"` (≥0.8), `"aging"` (≥0.4), `"critical"` (<0.4) [ref: pricing-sidecar/main.py:332]. Lưu ý: F2T hiện có 4 category nông sản (leafy/root/fruit/herbs) nhưng chỉ có **2/4 model CoreML riêng biệt**; leafy và herbs dùng chung model `root` — đây là một giới hạn kỹ thuật sẽ được trình bày ở phần hạn chế [ref: ledger t0.10-thesis-limitations].

---

### 2.4.4. Khai phá luật kết hợp và FP-Growth

**Khai phá luật kết hợp (Association Rule Mining)** là kỹ thuật học máy không giám sát nhằm tìm kiếm các mẫu đồng xuất hiện thường xuyên trong tập dữ liệu giao dịch [TLTK]. Đây là lĩnh vực **học máy không giám sát** (unsupervised learning) — không cần nhãn; thuật toán khám phá cấu trúc tiềm ẩn từ dữ liệu thô. Bài toán điển hình là **market-basket analysis**: cho tập hợp các giao dịch mua hàng, tìm các tập mặt hàng thường xuất hiện cùng nhau, từ đó sinh ra các luật dạng "nếu mua X thì thường mua thêm Y" [TLTK].

**Ba độ đo cốt lõi** đánh giá chất lượng một luật A → C [TLTK]:

- **Support** (hỗ trợ): tỉ lệ giao dịch chứa cả A và C trong toàn bộ tập dữ liệu.  
  `support(A → C) = |{t ∈ T : A ∪ C ⊆ t}| / |T|`
- **Confidence** (tin cậy): trong số các giao dịch chứa A, bao nhiêu phần trăm cũng chứa C.  
  `confidence(A → C) = support(A ∪ C) / support(A)`
- **Lift** (độ nâng): mức độ A và C phụ thuộc nhau so với trường hợp ngẫu nhiên. Lift > 1 nghĩa là hai bên xuất hiện cùng nhau nhiều hơn kỳ vọng.  
  `lift(A → C) = confidence(A → C) / support(C)`

**Thuật toán Apriori** (Agrawal & Srikant, 1994) là thuật toán tiên phong khai thác bài toán này bằng nguyên lý phản đơn điệu: mọi tập con của một frequent itemset cũng phải là frequent [TLTK]. Tuy nhiên, Apriori sinh ra số lượng lớn candidate itemset, gây tốn bộ nhớ và I/O trên tập dữ liệu lớn.

**Thuật toán FP-Growth** (Han, Pei & Yin, 2000) giải quyết điểm yếu trên bằng cấu trúc dữ liệu **FP-tree** (Frequent Pattern tree): nén toàn bộ tập dữ liệu vào một cây prefix chỉ qua 2 lần duyệt dữ liệu, sau đó khai thác trực tiếp từ cây mà **không sinh candidate itemset** [TLTK]. Độ phức tạp thực tế thấp hơn Apriori đáng kể trên các tập sparse và large-scale.

**Áp dụng trong F2T — Cross-sell category-level:**
Hệ thống sử dụng thư viện `mlxtend` (Python) để chạy FP-Growth trên tập dữ liệu warm-start **Instacart 2017** (2.874.457 giỏ mua hàng) [ref: recommender-final/README.md §"Actual warm-start run"]. Dữ liệu được tiền xử lý bởi `prepare_instacart.py`: map aisle Instacart → 10 category F2T (`leafy`, `root`, `fruit`, `herbs`, `mushrooms`, `grains`, `dairy`, `eggs`, `honey`, `other`) [ref: recommender-final/scripts/prepare_instacart.py]. Sau đó `mine_rules.py` chạy FP-Growth với ngưỡng `min_support=0.02`, `min_confidence=0.10`, xếp hạng kết quả theo lift [ref: recommender-final/scripts/mine_rules.py]. Kết quả là file JSON `category_rules.json` và `category_popularity.json` được nạp vào recommender-sidecar khi khởi động [ref: recommender-sidecar/main.py:17-29].

Quan trọng: đây là **khai phá luật kết hợp category-level** (antecedent và consequent đều là category, không phải product cụ thể), **không phải** collaborative filtering hay deep learning. Dữ liệu là hành vi siêu thị Mỹ (Instacart), được dùng làm warm-start cho đến khi hệ thống tích lũy đủ đơn hàng F2T thật để retrain.

---

## 2.5. Các hệ thống tương tự

Thị trường TMĐT nông sản Việt Nam đã xuất hiện một số hệ thống đáng chú ý. Bảng 2.2 trình bày so sánh bốn đại diện tiêu biểu với F2T theo các tiêu chí chức năng cốt lõi [TLTK]:

| Tiêu chí | Foodmap | Sendo Farm | Bac Tom | Lazada Fresh | **F2T** |
|---|---|---|---|---|---|
| Mô hình kết nối | Sàn đa nông hộ | Tích hợp siêu thị | Đặc sản vùng miền | Tích hợp Lazada | Farm-to-Table trực tiếp |
| Thanh toán trực tuyến | Có (đa kênh) | Có | Có | Có (Lazada Pay) | Có (Stripe) |
| Dự báo nhu cầu AI | Không công bố | Không | Không | Không rõ | Có (ForecasterLSTM) |
| Định giá động AI | Không | Không | Không | Có (nội bộ Lazada) | Có (DDQN advisory) |
| Phân loại độ tươi từ ảnh | Không | Không | Không | Không | Có (2 model CoreML) |
| Gợi ý sản phẩm trong giỏ hàng | Không | Không | Không | Không | Có (cross-sell category-level FP-Growth) |
| Đối tượng nông hộ | Doanh nghiệp + HTX | Siêu thị đối tác | Hộ đặc sản | Đối tác lớn | Nông hộ nhỏ, cá nhân |
| Nền tảng chính | Web + Mobile | Web + Mobile | Web + App | Mobile | Mobile-first (React Native) |

**Foodmap.asia** là sàn TMĐT nông sản Việt Nam với phạm vi phủ rộng, kết nối nhiều HTX và doanh nghiệp nông nghiệp. Ưu điểm: danh mục phong phú, thương hiệu nhận biết tốt. Nhược điểm: chủ yếu dành cho đơn vị có quy mô, nông hộ nhỏ khó tiếp cận; không có AI định giá hay phân loại chất lượng [TLTK].

**Sendo Farm** (thuộc Sendo) tích hợp nông sản vào nền tảng TMĐT đa danh mục, phần lớn thông qua đối tác siêu thị và chuỗi cung ứng có tổ chức. Ưu điểm: hạ tầng thanh toán và logistics mạnh. Nhược điểm: không có chức năng AI đặc thù cho nông sản, không dành cho nông hộ nhỏ lẻ [TLTK].

**Bac Tom** tập trung vào đặc sản vùng miền (tôm, hải sản miền Bắc), kết nối hộ nuôi trồng nhỏ với người tiêu dùng đô thị. Ưu điểm: niềm tin thương hiệu địa phương, focus chuyên biệt. Nhược điểm: phạm vi danh mục hẹp, không có AI/ML [TLTK].

**Lazada Fresh** là mảng thực phẩm tươi của Lazada, được hỗ trợ bởi hạ tầng logistics và AI của Alibaba Group. Ưu điểm: hệ sinh thái logistics mạnh, có khả năng AI nội bộ Lazada. Nhược điểm: chỉ dành cho đối tác kinh doanh lớn, không có kênh cho nông hộ nhỏ, AI pricing không công khai API cho nông hộ sử dụng [TLTK].

Qua phân tích, có thể rút ra nhận xét: **chưa có hệ thống nào trong số các đối thủ nêu trên tích hợp đồng thời bốn chức năng AI — dự báo nhu cầu, định giá động, phân loại độ tươi từ ảnh và gợi ý sản phẩm trong giỏ hàng — dành riêng cho nông hộ nhỏ trên nền tảng mobile** [ref: ledger cross-sell-v1]. Đây là khoảng trống mà F2T hướng đến lấp đầy.

---

## 2.6. Nhận xét và định hướng giải pháp

Phân tích các hệ thống tương tự cho thấy ba hạn chế chính của thị trường hiện tại: (1) nông hộ nhỏ lẻ chưa được phục vụ đầy đủ bởi các sàn TMĐT lớn vốn ưu tiên đối tác doanh nghiệp; (2) không có hệ thống nào tích hợp AI định giá thích ứng và phân loại chất lượng ngay trong luồng giao dịch; (3) trải nghiệm mobile chưa được tối ưu cho người dùng nông thôn vốn chủ yếu dùng điện thoại làm thiết bị kết nối chính [TLTK; ref: ledger cross-sell-v1].

Từ những khoảng trống đó, F2T định hướng giải pháp theo bốn trục chính:

**Mobile-first:** Toàn bộ trải nghiệm được thiết kế và tối ưu cho màn hình di động trước tiên. React Native + Expo đảm bảo hoạt động đa nền tảng iOS/Android từ một codebase duy nhất; 56 màn hình route bao phủ đầy đủ hành trình nông hộ (đăng ký, quản lý trang trại, đăng sản phẩm, xem đề xuất giá, quét tươi) và người tiêu dùng (tìm kiếm địa lý, đặt hàng, thanh toán, theo dõi giao hàng) [ref: ledger t1.15-numbers; t2.2-frontend-routes].

**AI trong luồng mua hàng — bốn chức năng:** (1) **ForecasterLSTM** dự báo nhu cầu 7 ngày tới từ cửa sổ lịch sử 21 bước với obs_dim=10, hỗ trợ nông hộ quyết định thu hoạch và tồn kho [ref: dynamic-pricing-final/src/forecaster/model.py:9-15; ledger t0.4-forecaster-parity]; (2) **SharedMLPDuelingQNet** (DDQN) đề xuất mức điều chỉnh giá tối ưu qua 11 action candidates trên state 10 chiều, với Safety Layer 5 quy tắc bảo vệ nông hộ khỏi giá bất hợp lý [ref: dynamic-pricing-final/src/rl/network.py:51-81; ledger t0.2-ddqn-arch]; (3) **2 model CoreML** phân loại độ tươi fresh/rotten từ ảnh chụp sản phẩm, cung cấp điểm tươi thực-thời cho cả nông hộ và người mua [ref: pricing-sidecar/main.py:318-333; ledger t0.6-coreml-freshness]; và (4) **Cross-sell FP-Growth** gợi ý sản phẩm "thường mua kèm" trong giỏ hàng dựa trên 34 luật kết hợp category-level được khai phá từ 2.874.457 giỏ Instacart warm-start, xếp hạng theo lift với re-rank ưu tiên cùng trang trại [ref: ledger cross-sell-v1].

**Advisory Pricing (giá tư vấn):** Thay vì tự động áp đặt giá, F2T trình bày kết quả DDQN như một **đề xuất tư vấn** (advisory price) — nông hộ nhìn thấy giá gợi ý kèm giải thích và có quyền chấp nhận hoặc bác bỏ. Mô hình `price_overrides` với trường `mode` enum `{shadow, advisory}` và `status` enum `{shadow, pending_review, accepted, rejected, expired}` phản ánh rõ triết lý này: AI là công cụ hỗ trợ quyết định, không phải tự động hoá thay thế nông hộ [ref: f2t-backend/src/modules/dynamic-pricing/schemas/price-override.schema.ts:43-49; ledger t1.11-schema-detail].
