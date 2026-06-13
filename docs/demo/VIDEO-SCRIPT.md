# VIDEO-SCRIPT.md — F2T Thesis Demo Video (~6 phút)

> **Ghi chú về tính trung thực:** Mọi câu thoại thuyết minh trong kịch bản này được ràng buộc phải phù hợp với mã nguồn thực tế. Xem `docs/demo/DEMO-READY-CHECKLIST.md` để biết quy trình cài đặt và kiểm tra trước khi ghi hình; xem `docs/thesis/final/chuong-5-ket-luan.md §5.2` để biết danh sách hạn chế chính thức. Người đọc thuyết minh không được tự ý thêm số liệu, thay "2/4" bằng "4/4", hay nói "GHN thực tế" — những thay đổi đó sẽ vi phạm nguyên tắc trung thực học thuật của khoá luận.

---

## PHẦN 1 — Product Tour (~2 phút 40 giây)

| Timestamp | On-screen action | Voiceover (Tiếng Việt — đọc nguyên văn) | Caption |
|-----------|-----------------|------------------------------------------|---------|
| **0:00–0:15** | Màn hình tiêu đề: logo F2T, tên đề tài, tên sinh viên/MSSV placeholder, tên trường, năm 2025. Nhạc nền nhẹ. | "Kính chào quý thầy cô trong Hội đồng bảo vệ. Video này trình bày bản demo hệ thống F2T — Farm to Table — một nền tảng thương mại điện tử nông sản Việt Nam tích hợp bốn chức năng trí tuệ nhân tạo. Thực hiện bởi [Tên sinh viên / MSSV]." | **F2T — Farm to Table** · [Tên sinh viên / MSSV] |
| **0:15–0:35** | Mở app trên điện thoại (người dùng consumer). Màn hình "Trang chủ" hiện danh sách trang trại. Vuốt bản đồ mini, thấy marker các trang trại xung quanh vị trí hiện tại. | "Người mua mở ứng dụng và thấy ngay danh sách trang trại gần vị trí của mình. Backend sử dụng truy vấn địa lý không gian `$geoNear` của MongoDB để trả về các trang trại trong bán kính lựa chọn, sắp xếp theo khoảng cách thực tế." | Geospatial · `$geoNear` · MongoDB |
| **0:35–1:00** | Nhấn vào một trang trại, mở danh sách sản phẩm. Nhấn vào một sản phẩm trái cây (fruit). Card sản phẩm hiện: giá gốc, `dynamicPrice` (giá AI đề xuất), `freshnessScore`, và nhãn `priceTag` (ví dụ "flash\_discount"). | "Mỗi card sản phẩm hiển thị giá do mô hình Reinforcement Learning đề xuất — trường `dynamicPrice` — cùng với điểm độ tươi `freshnessScore` và nhãn phân loại như `flash_discount` hay `standard`. Đây là output thật của mô hình DDQN, được một NestJS Interceptor toàn cục gắn tự động vào mọi response của endpoint `/products` mà không cần sửa từng controller." | `dynamicPrice` · `freshnessScore` · `priceTag` · DynamicPricingInterceptor |
| **1:00–1:30** | Thêm sản phẩm rau lá (leafy) vào giỏ hàng. Màn hình giỏ hàng xuất hiện. Ở phía dưới giỏ hàng có mục "Có thể bạn cũng thích" gợi ý ba danh mục: Thảo mộc (herbs), Củ quả (root), Trứng (eggs). | "Khi giỏ hàng có sản phẩm thuộc danh mục rau lá, hệ thống gọi recommender-sidecar và nhận gợi ý mua kèm: thảo mộc, củ quả, trứng — với điểm lift lần lượt 1,38, 1,32, 1,14. Đây là kết quả của thuật toán FP-Growth association rules, được khai thác ở **cấp độ danh mục** — không phải cấp độ sản phẩm riêng lẻ — warm-start từ tập dữ liệu Instacart 2017." | Cross-sell · FP-Growth · Category-level · lift 1.38 / 1.32 / 1.14 |
| **1:30–1:50** | Nhấn "Đặt hàng". Màn hình checkout hiện phí giao hàng đã tính và thời gian dự kiến. Nhấn "Thanh toán". Mở Stripe WebView (trang thanh toán của Stripe). | "Phí giao hàng được tính bằng thuật toán Dijkstra trên đồ thị mẫu — đây là chế độ fallback demo vì token GHN thực chưa được cấu hình. Người dùng nhấn thanh toán và hệ thống mở trang Stripe Checkout qua WebView tích hợp trong ứng dụng." | Dijkstra fallback · Stripe Checkout WebView |
| **1:50–2:00** | Hoàn tất thanh toán trên Stripe (dùng thẻ test 4242...). App chuyển về màn hình đơn hàng, hiện trạng thái "Đã xác nhận". | "Sau khi Stripe webhook xác nhận thanh toán thành công, backend tự động cập nhật trạng thái đơn hàng. Lưu ý: nguồn sự thật thanh toán là webhook, không phải URL redirect." | Stripe webhook · Order confirmed |
| **2:00–2:30** | Chuyển sang tài khoản farmer (đăng xuất, đăng nhập lại hoặc dùng thiết bị thứ hai). Vào màn hình "Quản lý sản phẩm". Chọn một sản phẩm trái cây hoặc củ quả, nhấn "Quét độ tươi", chụp ảnh. Kết quả hiện: nhãn `fresh`/`aging`/`critical` và giá RL gợi ý tương ứng. | "Chuyển sang giao diện người nông dân. Tính năng quét độ tươi sử dụng hai model CoreML nhị phân, hiện hỗ trợ **hai trong số bốn danh mục**: trái cây và củ quả. Các danh mục rau lá và thảo mộc chưa có model riêng — đây là hạn chế được ghi nhận trong khoá luận. Điểm độ tươi từ CoreML trực tiếp ảnh hưởng đến đề xuất giá của mô hình RL." | Freshness CoreML · 2/4 danh mục · fruit + root |
| **2:30–2:40** | Chuyển sang giao diện Admin. Lướt nhanh qua: danh sách trang trại chờ duyệt, nút "Verify", trang Analytics với biểu đồ doanh thu, số đơn. | "Cuối cùng là giao diện quản trị: admin có thể xác minh trang trại, quản lý tài khoản và xem analytics nền tảng. Chúng ta chuyển sang phần hai — Live ML Observatory." | Admin · Verify farm · Analytics |

---

## PHẦN 2 — Live ML Observatory (~3 phút 20 giây)

| Timestamp | On-screen action | Voiceover (Tiếng Việt — đọc nguyên văn) | Caption |
|-----------|-----------------|------------------------------------------|---------|
| **2:40–3:10** | Split-screen: bên trái là điện thoại chạy app F2T; bên phải là trình duyệt mở dashboard ML Observatory (localhost:5173). Dashboard có hai card lớn: "Pricing" và "Recommender", mỗi card hiện log dạng bảng cuộn real-time. | "Chúng ta chuyển sang phần hai — Live ML Observatory. Màn hình bên trái là ứng dụng F2T trên điện thoại; màn hình bên phải là dashboard web chạy ở cổng 5173, live-tail các sidecar AI. Mọi con số xuất hiện trên dashboard đều là output thật của mô hình — không phải dữ liệu giả lập hay mock. Mỗi khi người dùng thực hiện một thao tác trên app, một request thật được gửi đến sidecar và kết quả được hiển thị ngay trên dashboard." | Live ML Observatory · port 5173 · Real model I/O |
| **3:10–3:40** | Trên điện thoại: mở danh sách sản phẩm, cuộn qua các card. Dashboard bên phải: card "Pricing" cập nhật — hiện obs vector 12 chiều (10 đặc trưng thị trường + `d_hat` + `p_waste` từ forecaster), action index DDQN chọn, Δ% tương ứng, và trường `safety_clipped`. | "Mô hình DDQN hoạt động với không gian quan sát 12 chiều: 10 đặc trưng thị trường cơ bản, cộng thêm hai đặc trưng từ ForecasterLSTM là `d_hat` — nhu cầu dự báo — và `p_waste` — xác suất hàng tồn đọng. Từ vector quan sát đó, DDQN chọn một trong 11 hành động rời rạc phân bổ đều trong khoảng âm 30% đến dương 20%, sau đó Safety Layer kiểm tra năm quy tắc cứng trước khi ghi vào hệ thống." | DDQN · obs_dim=12 · 11 actions · [-30%, +20%] · Safety Layer |
| **3:40–4:10** | Trên điện thoại: mở chi tiết một sản phẩm cụ thể, thấy giá AI. Dashboard: log pricing request hiện đầy đủ trường — `productId`, `category`, `freshness`, `base_price`, `targetPrice`, `delta_pct`, `safety_clipped`, `freshness_tag`. | "Một lưu ý kỹ thuật quan trọng: ForecasterLSTM hiện được phục vụ theo chế độ **tile steady-state** — sidecar nhân bản cùng một vector quan sát hiện tại 21 lần để tạo đầu vào cho LSTM thay vì chuỗi lịch sử thực 21 ngày. Đây là hạn chế được thừa nhận thẳng thắn: LSTM chưa khai thác được đúng khả năng mô hình hoá chuỗi thời gian của mình trong chế độ online hiện tại." | ForecasterLSTM · tile-21× steady-state · Known limitation |
| **4:10–4:40** | Trên điện thoại: thêm sản phẩm thứ nhất (rau lá) vào giỏ. Dashboard: card "Recommender" cập nhật — hiện `cart_categories`, danh sách luật FP-Growth được áp dụng, score, `source` (rule hoặc fallback). | "Chuyển sang card Recommender. Khi giỏ hàng có danh mục rau lá, recommender-sidecar trả về luật FP-Growth với herbs đạt lift 1,38, root đạt 1,32, và eggs đạt 1,14 — tất cả từ nguồn `rule`. Một lần nữa nhấn mạnh: đây là **gợi ý cấp độ danh mục** — hệ thống xác định *loại* sản phẩm nên mua kèm, không xác định sản phẩm cụ thể. Không có hệ thống gợi ý cá nhân hoá theo hành vi người dùng trong phiên bản hiện tại." | FP-Growth · Category-level · lift scores · source=rule |
| **4:40–5:00** | Trên điện thoại: thêm thêm sản phẩm khác (ví dụ trứng). Dashboard: Recommender cập nhật lại với giỏ hàng mới; nếu luật không còn áp dụng, `source` chuyển sang `fallback`. | "Nếu giỏ hàng không khớp với bất kỳ luật nào trong tập luật FP-Growth — tổng cộng 34 luật từ 8 danh mục tiền đề — hệ thống graceful fallback về danh sách phổ biến nhất. Cơ chế này đảm bảo người dùng luôn nhận được gợi ý ngay cả khi mô hình không có luật phù hợp." | FP-Growth fallback · source=fallback |
| **5:00–5:40** | Thao tác thủ công (probe): dùng terminal gọi thẳng API pricing sidecar với `category=fruit`, `freshness=0.35`. Dashboard và/hoặc terminal hiện response: `targetPrice=15000`, `delta_pct=-25.0`, `safety_clipped=true`, `freshness_tag=critical`. Chiếu cả hai màn hình cùng lúc. | "Để chứng minh phản ứng thật của mô hình, chúng ta probe thủ công: gửi một request với trái cây có độ tươi 0,35 — dưới ngưỡng 0,4. Kết quả: giá mục tiêu 15.000 đồng, giảm 25% so với giá gốc 20.000 đồng, Safety Layer bật cờ `safety_clipped=true`, nhãn `freshness_tag=critical`. Đây là quy tắc cứng số 4 trong Safety Layer: khi độ tươi dưới 0,4, giá bị chặn ở mức tối đa 75% giá gốc. Phản ứng này là xác định và có thể tái hiện — không phải ngẫu nhiên." | Probe: fruit · freshness=0.35 → 15,000đ · safety\_clipped=true · critical |
| **5:40–6:00** | Màn hình kết: logo F2T, danh sách tóm tắt 4 chức năng AI và các hạn chế, lời cảm ơn. | "Tóm lại, hệ thống F2T tích hợp bốn chức năng AI đã hoạt động end-to-end: định giá động DDQN, phân loại độ tươi CoreML, dự báo nhu cầu LSTM, và cross-sell FP-Growth. Chúng tôi xin nêu thẳng các hạn chế hiện tại: freshness chỉ có 2 trong 4 danh mục; cross-sell ở cấp danh mục, chưa cấp sản phẩm; giao hàng dùng Dijkstra fallback, chưa có token GHN thực; thanh toán qua Stripe WebView; forecaster phục vụ theo chế độ tile steady-state, chưa khai thác chuỗi thời gian thực. Xin trân trọng cảm ơn Hội đồng đã lắng nghe." | 4 AI Functions · Hạn chế thẳng thắn · Cảm ơn |

---

## Ghi chú sản xuất

### Thiết bị và layout ghi hình

| Phần | Layout màn hình |
|------|-----------------|
| Phần 1 (0:00–2:40) | Toàn màn hình điện thoại (screen recording hoặc capture vật lý) |
| Phần 2 (2:40–6:00) | Split-screen: điện thoại bên trái, dashboard :5173 bên phải |

### Thứ tự khởi động dịch vụ

Xem `docs/demo/DEMO-READY-CHECKLIST.md §1` để biết 7 terminal cần mở theo thứ tự trước khi bấm ghi hình.

### Tài khoản demo

| Vai trò | Email | Ghi chú |
|---------|-------|---------|
| Consumer | (xem seed output) | Dùng cho Phần 1 cảnh mua hàng |
| Farmer | (xem seed output) | Dùng cho cảnh quét độ tươi |
| Admin | (xem seed output) | Dùng cho cảnh lướt Admin |

### Sản phẩm demo được khuyến nghị

- **Freshness scan**: chọn sản phẩm danh mục `fruit` hoặc `root` — **không dùng leafy/herbs** (model CoreML chưa có cho hai danh mục này).
- **Cross-sell**: thêm sản phẩm danh mục `leafy` để luật herbs/root/eggs kích hoạt đúng ví dụ trong script.
- **Pricing probe**: dùng curl với `freshness=0.35` như trong cảnh 5:00–5:40.

### Thẻ test Stripe

`4242 4242 4242 4242`, bất kỳ ngày hết hạn tương lai, CVC tùy ý.

### Honesty re-read checklist (đã kiểm tra trước khi commit)

- [x] Không có câu nào nói "4/4 freshness" hoặc "tất cả danh mục độ tươi"
- [x] Freshness được nói rõ "2 trong 4 danh mục: trái cây và củ quả"
- [x] Cross-sell được nói rõ "cấp độ danh mục — không phải sản phẩm riêng lẻ"
- [x] Giao hàng được nói rõ "Dijkstra fallback demo, chưa có token GHN thực"
- [x] Thanh toán được nói rõ "Stripe WebView" (không nói "Stripe native SDK")
- [x] Forecaster được nói rõ "tile steady-state, chưa khai thác chuỗi thời gian thực"
- [x] obs_dim được nói đúng là 12 (10 + d_hat + p_waste)
- [x] Số hành động DDQN được nói đúng là 11
- [x] Ví dụ probe: fruit freshness=0.35 → 15,000đ, -25%, safety_clipped=true, critical — khớp với output thật trong DEMO-READY-CHECKLIST.md dòng 199
- [x] lift scores: herbs 1.38, root 1.32, eggs 1.14 — khớp với output thật trong DEMO-READY-CHECKLIST.md dòng 220
- [x] Không có câu nào nói "AI chọn nhà cung cấp" hay "AI tự quản lý kho"
- [x] Không có câu nào nói "gợi ý cá nhân hoá theo lịch sử người dùng"
