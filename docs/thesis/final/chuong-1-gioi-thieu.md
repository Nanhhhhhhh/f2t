# CHƯƠNG 1. GIỚI THIỆU

## 1.1. Sự cần thiết của bài toán

Nông nghiệp luôn giữ vai trò trọng yếu trong nền kinh tế Việt Nam, với hơn 60% dân số có sinh kế gắn liền với sản xuất và phân phối nông sản [TLTK]. Tuy nhiên, chuỗi cung ứng thực phẩm tươi hiện nay vẫn vận hành qua bốn đến năm tầng trung gian — từ nông dân đến đại lý thu mua, nhà phân phối, chợ bán sỉ, đến người bán lẻ — trước khi sản phẩm đến tay người tiêu dùng cuối. Mỗi tầng trung gian cộng thêm chi phí vận hành và biên lợi nhuận, khiến giá bán lẻ thường cao hơn 30 đến 50% so với giá nông trại trong khi bản thân nông dân lại bị ép ở mức giá thấp, hạn chế khả năng tái đầu tư và phát triển.

Vấn đề thứ hai mang tính vật chất rõ ràng hơn: quãng đường vận chuyển dài qua nhiều công đoạn khiến nông sản mất từ 25 đến 30% độ tươi sau khi rời khỏi nông trại, theo thống kê của Tổ chức Nông Lương Liên Hợp Quốc [TLTK]. Đối với các loại rau củ tươi và trái cây, mức hao hụt này không chỉ làm giảm giá trị dinh dưỡng mà còn trực tiếp gây lãng phí kinh tế ở cả hai đầu chuỗi cung ứng. Người tiêu dùng nhận được sản phẩm đã suy giảm chất lượng, trong khi nông dân chịu áp lực bán nhanh ở mức giá thấp hơn để tránh hư hỏng toàn phần.

Vấn đề thứ ba liên quan đến thiếu hụt thông tin quyết định. Nông dân Việt Nam hiện nay gần như không có công cụ dự báo nhu cầu thị trường có độ tin cậy cao, dẫn đến tình trạng canh tác theo quán tính hoặc theo trào lưu đám đông — một số loại cây trồng được gieo trồng ồ ạt, dẫn đến dư cung và giá sụp đổ, trong khi các loại khác lại thiếu hụt theo mùa. Hậu quả là vòng lặp thua lỗ dai dẳng không xuất phát từ năng lực sản xuất mà từ sự bất cân xứng thông tin giữa bên cung và bên cầu.

Trong bối cảnh đó, hai xu hướng công nghệ đang tạo ra cơ hội chuyển đổi chưa từng có. Thứ nhất, thị trường thương mại điện tử di động Việt Nam đang tăng trưởng ở mức 18% mỗi năm theo báo cáo e-Conomy SEA 2023 [TLTK], đồng nghĩa với việc người dùng — kể cả ở vùng nông thôn — ngày càng quen thuộc với việc giao dịch qua ứng dụng di động. Thứ hai, các công cụ học máy hiện đại đã trở nên tiếp cận được với quy mô dự án vừa và nhỏ, cho phép tích hợp trí tuệ nhân tạo vào hệ thống phân phối thực phẩm mà không đòi hỏi hạ tầng dữ liệu khổng lồ của các tập đoàn lớn.

Từ ba vấn đề cốt lõi và hai cơ hội nêu trên, luận văn này xác định nhu cầu cấp thiết cần xây dựng một nền tảng kết nối trực tiếp Farm↔Consumer — một hệ thống loại bỏ hoàn toàn các tầng trung gian không cần thiết, đồng thời tích hợp trí tuệ nhân tạo để hỗ trợ quyết định định giá, dự báo nhu cầu, và đánh giá chất lượng sản phẩm ngay trong luồng giao dịch thực.

## 1.2. Mục tiêu nghiên cứu

Khóa luận này đặt ra sáu mục tiêu nghiên cứu được thiết kế để giải quyết toàn diện các vấn đề đã xác định ở phần trên, từ tầng giao diện người dùng cho đến tầng học máy nhúng trong hệ thống.

**MT1.** Xây dựng ứng dụng di động đa nền tảng (React Native + Expo) kết nối ba vai trò người dùng: Consumer (người tiêu dùng), Farm (nông trại), và Admin (quản trị viên). Ứng dụng phải vận hành trên cả iOS lẫn Android từ một codebase duy nhất.

**MT2.** Triển khai backend NestJS kết hợp MongoDB với đầy đủ 15 module nghiệp vụ, tích hợp cổng thanh toán Stripe và dịch vụ giao hàng GHN [ref: f2t-backend/src/modules/ — 15 thư mục: admin, auth, delivery, demand-forecasting, dynamic-pricing, farms, notifications, orders, payments, posts, products, recommendations, reviews, uploads, users]. Hệ thống phải đáp ứng 92 REST endpoint phục vụ ba vai trò người dùng [ref: ledger numbers-v3].

**MT3.** Xây dựng mô hình dự báo nhu cầu ForecasterLSTM — mạng LSTM 2 lớp, cửa sổ đầu vào window=21 bước thời gian, vector quan sát obs_dim=10 chiều, xuất ra hai đầu độc lập: dự báo nhu cầu (demand) và xác suất lãng phí (waste_logit) [ref: dynamic-pricing-final/src/forecaster/model.py:18-49; ledger t1.4-forecaster-not-holt, t0.2-forecaster-arch].

**MT4.** Phát triển hệ thống định giá động dựa trên thuật toán học tăng cường Double DQN (DDQN) với kiến trúc SharedMLPDuelingQNet đa danh mục, không gian quan sát 10 chiều, 11 hành động thuộc khoảng [−0.30, +0.20], và Safety Layer gồm 5 quy tắc ràng buộc [ref: dynamic-pricing-final/src/rl/network.py:51-57; pricing-sidecar/safety.py:1-19; ledger t1.4-safety-5-rules]. Hệ thống vận hành ở chế độ advisory — đề xuất điều chỉnh giá mà không tự động áp lên giao dịch thực.

**MT5.** Tích hợp phân loại độ tươi sản phẩm từ hình ảnh bằng hai model CoreML (fruit và root), phân loại nhị phân fresh/rotten, phục vụ qua endpoint /freshness/classify của pricing-sidecar [ref: pricing-sidecar/main.py:316-318; freshnessmodels/MyFreshnessClassifier-fruit.mlmodel; ledger t1.4-freshness-coreml, t0.6].

**MT6.** Đảm bảo chất lượng phần mềm với tỷ lệ unit test pass đạt ≥95%. Kết quả thực tế: 54/54 test case pass trong 21 file spec [ref: ledger t1.15-numbers].

## 1.3. Phạm vi nghiên cứu

Hệ thống F2T (Farm-to-Table) trong phạm vi khóa luận này bao gồm ba thành phần chính: (1) ứng dụng di động đa nền tảng iOS/Android xây dựng bằng React Native + Expo; (2) backend REST API NestJS triển khai trên môi trường Node.js với MongoDB làm hệ quản trị cơ sở dữ liệu; và (3) hai sidecar FastAPI — pricing-sidecar (port 8000) phục vụ /predict (định giá DDQN), /forecast (dự báo ForecasterLSTM), và /freshness/classify (phân loại CoreML); recommender-sidecar (port 8001) phục vụ /recommend (cross-sell FP-Growth) [ref: ledger numbers-v3].

Kiến trúc Monolith + 2 Sidecar này được lựa chọn có chủ đích: toàn bộ logic Python AI/ML được cô lập trong các tiến trình FastAPI riêng biệt, tách biệt hoàn toàn khỏi runtime Node.js, đồng thời backend NestJS được cấu hình để graceful degradation khi sidecar không phản hồi.

Phạm vi nghiên cứu không bao gồm: xác thực email và SMS thực tế (chỉ có flow xác thực qua token); giao diện web client (chỉ mobile); và chế độ định giá "live" tự động áp giá vào đơn hàng (chỉ advisory mode).

## 1.4. Phương pháp tiếp cận

Khóa luận áp dụng phương pháp phát triển phần mềm Agile/Scrum với chu kỳ Sprint từ hai đến bốn tuần, cho phép điều chỉnh yêu cầu linh hoạt khi các thành phần AI/ML có kết quả thực nghiệm mới. Mỗi sprint bao gồm giai đoạn lập kế hoạch, phát triển, kiểm thử tích hợp, và đánh giá kết quả.

Thiết kế hệ thống theo hướng đối tượng (Object-Oriented Design) được thể hiện qua bộ sơ đồ UML gồm sơ đồ use case, sơ đồ tuần tự, sơ đồ hoạt động, và sơ đồ triển khai. Các sơ đồ này đóng vai trò tài liệu sống (living documentation) được cập nhật đồng bộ với code trong suốt quá trình phát triển.

Đối với các model phân loại độ tươi sản phẩm, phương pháp Transfer Learning được áp dụng để tận dụng các đặc trưng thị giác đã học từ tập dữ liệu lớn, từ đó tinh chỉnh trên tập dữ liệu nông sản cụ thể và xuất sang định dạng CoreML phục vụ suy luận trên thiết bị iOS.

Kiểm thử phần mềm được thực hiện bằng framework Jest kết hợp mongodb-memory-server để unit test toàn bộ module NestJS trong môi trường cô lập mà không phụ thuộc instance MongoDB thực. Phương pháp này cho phép chạy test nhanh trong pipeline CI mà không cần kết nối cơ sở dữ liệu bên ngoài.

## 1.5. Đóng góp của khóa luận

Khóa luận này tạo ra sáu đóng góp kỹ thuật có thể kiểm chứng tại nguồn (xem Hình 1.1 — `diagrams/contribution-map.puml`):

**ĐG1 — Kiến trúc Monolith + 2 Sidecar tích hợp AI/ML.** Hệ thống triển khai hai FastAPI sidecar chuyên biệt: pricing-sidecar (port 8000) với ba endpoint /predict, /forecast, và /freshness/classify; recommender-sidecar (port 8001) với endpoint /recommend phục vụ cross-sell FP-Growth. Backend NestJS giao tiếp với các sidecar qua HTTP nội bộ và thực hiện graceful degradation tự động khi sidecar không khả dụng [ref: f2t-backend/src/common/interceptors/dynamic-pricing.interceptor.ts:9; ledger numbers-v3]. Thiết kế này giảm độ phức tạp triển khai, tập trung hóa quản lý phụ thuộc Python, và cho phép mở rộng hoặc thay thế từng model AI mà không ảnh hưởng đến luồng nghiệp vụ chính.

**ĐG2 — Tích hợp giá AI tự động qua DynamicPricingInterceptor.** NestJS APP_INTERCEPTOR chặn toàn bộ response của /products và nhúng ba trường bổ sung — dynamicPrice, freshnessScore, và priceTag — mà không cần sửa đổi bất kỳ controller hay service nghiệp vụ nào [ref: f2t-backend/src/common/interceptors/dynamic-pricing.interceptor.ts:16-18; ledger t1.4-interceptor-cron]. Song song đó, PricingTickCron thực hiện cập nhật giá theo batch theo lịch cron mặc định "0 * * * *" (mỗi giờ một lần) cho toàn bộ danh mục sản phẩm đang hoạt động. Cơ chế này đảm bảo giá AI luôn hiện diện trong API response mà không tạo thêm overhead cho consumer gọi API.

**ĐG3 — Dự báo nhu cầu bằng ForecasterLSTM.** Mô hình ForecasterLSTM được xây dựng với kiến trúc LSTM 2 lớp, cửa sổ đầu vào window=21 bước thời gian, vector quan sát obs_dim=10 chiều (post-retrain T0.13), và hai đầu xuất song song: demand_head dự báo nhu cầu tuyệt đối và waste_head dự báo xác suất lãng phí (waste_logit) [ref: dynamic-pricing-final/src/forecaster/model.py:18-49; ledger t1.4-forecaster-not-holt, t0.2-forecaster-arch]. Mô hình phục vụ qua endpoint /forecast của pricing-sidecar, cho phép backend thu thập dự báo 7 ngày trong một lần gọi API.

**ĐG4 — Định giá động bằng DDQN với Safety Layer 5 quy tắc.** Hệ thống định giá dựa trên Double DQN sử dụng kiến trúc SharedMLPDuelingQNet đa danh mục với vector quan sát 10 chiều, 11 hành động thuộc CANDIDATES = linspace(−0.30, 0.20, 11) (bước 0.05), và chế độ advisory [ref: dynamic-pricing-final/src/rl/network.py:51-57; pricing-sidecar/safety.py:1-19; ledger t1.4-safety-5-rules, t1.4-ddqn-dims]. Safety Layer thực thi 5 quy tắc theo thứ tự xác định 3→4→1→2→5: Rule 3 kẹp giá trong khoảng [base×0.70, base×1.20]; Rule 4 ép giá xuống ≤base×0.75 khi freshness<0.4; Rule 1 bảo đảm sàn giá ≥base×0.55; Rule 2 giới hạn trần ≤base×2.0; và Rule 5 đảm bảo giá tối thiểu 1000 VND.

**ĐG5 — Phân loại độ tươi từ ảnh bằng 2 model CoreML.** Hai model CoreML (MyFreshnessClassifier-fruit.mlmodel và MyFreshnessClassifier-root.mlmodel) thực hiện phân loại nhị phân fresh/rotten từ ảnh RGB 299×299 pixel [ref: pricing-sidecar/main.py:316-318; freshnessmodels/MyFreshnessClassifier-fruit.mlmodel; ledger t1.4-freshness-coreml, t0.6]. Routing logic tự động phân loại danh mục fruit/fruits sang model fruit; tất cả danh mục còn lại (root, leafy, herbs) sử dụng model root làm fallback có chủ đích. Kết quả phân loại được lưu vào FreshnessCache (MongoDB) với TTL tự động, và được sử dụng trực tiếp trong quá trình tính toán giá của DDQN.

**ĐG6 — Tích hợp end-to-end với Dijkstra fallback và Embedded Snapshot giá.** Khi dịch vụ GHN không khả dụng, delivery.service.ts kích hoạt fallback Dijkstra trên đồ thị 10 nút biểu diễn mạng lưới giao thông TP.HCM [ref: f2t-backend/src/modules/delivery/delivery.service.ts; ledger t1.4-interceptor-cron]. Đồng thời, mỗi đơn hàng thực hiện Embedded Snapshot — toàn bộ thông tin giá tại thời điểm đặt hàng (pricePerUnit, totalPrice, tên sản phẩm, tên nông trại) được nhúng trực tiếp vào OrderItem embedded document [ref: f2t-backend/src/modules/orders/schemas/order.schema.ts:105] — chống sai lệch giá lịch sử khi giá sản phẩm thay đổi sau khi đơn hàng đã được tạo.

## 1.6. Cấu trúc khóa luận

Khóa luận được tổ chức thành năm chương với nội dung như sau.

**Chương 1 — Giới thiệu** (chương hiện tại) trình bày bối cảnh và sự cần thiết của bài toán, xác định các mục tiêu nghiên cứu, phạm vi hệ thống, phương pháp tiếp cận, và sáu đóng góp kỹ thuật của khóa luận.

**Chương 2 — Cơ sở lý thuyết và tổng quan công nghệ** trình bày nền tảng lý thuyết cho các thành phần kỹ thuật chính: LSTM cho dự báo chuỗi thời gian, Double DQN với Dueling Network cho học tăng cường trong định giá, CoreML cho suy luận ảnh trên thiết bị, kiến trúc hệ thống tổng thể (Monolith + Sidecar), stack công nghệ (NestJS, React Native/Expo, FastAPI, MongoDB), và khảo sát các hệ thống tương tự trên thị trường.

**Chương 3 — Phân tích và thiết kế hệ thống** đi sâu vào quy trình nghiệp vụ (mô hình hóa hiện trạng và quy trình F2T mới), phân rã chức năng, kiến trúc triển khai, các sơ đồ use case (tổng quan và AI/ML), đặc tả ca sử dụng, sơ đồ tuần tự và hoạt động cho cả luồng nghiệp vụ lẫn luồng AI/ML, thiết kế chi tiết ba thành phần học máy (ForecasterLSTM, DDQN+Safety, CoreML freshness), thiết kế cơ sở dữ liệu MongoDB (ERD, 10 collection, chiến lược index), và thiết kế giao diện người dùng.

**Chương 4 — Cài đặt và kiểm thử** mô tả môi trường triển khai thực tế, quy trình cài đặt và khởi tạo dữ liệu mẫu, kết quả kiểm thử unit (54/54 test case trong 21 file spec) [ref: ledger numbers-v3], đánh giá chức năng (92 endpoint REST), đánh giá định lượng bốn thành phần AI/ML (ForecasterLSTM offline eval, DDQN reward curve, CoreML accuracy, cross-sell FP-Growth), và demo luồng end-to-end.

**Chương 5 — Kết luận và hướng phát triển** tổng kết các kết quả đạt được so với sáu mục tiêu đề ra, trình bày bảy hạn chế hiện tại của hệ thống một cách trung thực (ba hạn chế kỹ thuật AI: serve tile-21× của forecaster, lệch pha day-of-week nhỏ <6.2%, phạm vi 2/4 danh mục có model CoreML riêng; bốn hạn chế cross-sell: category-level không phải product-level, warm-start Instacart, chưa đánh giá precision@k, chỉ hiển thị trong giỏ hàng), và đề xuất lộ trình phát triển ba giai đoạn cho hệ thống gợi ý.
