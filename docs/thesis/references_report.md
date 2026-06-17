# Báo cáo Tài liệu tham khảo — URL + Tóm tắt (Bước 1)

37/37 mục đều tìm được URL nguồn thật → **không xoá mục nào**. Mỗi mục: trích dẫn IEEE, URL, tóm tắt ngắn (cơ sở để map `[TLTK]`→`[n]`). Các mục [33][34][35] tra qua web search; các paper kinh điển và tài liệu chính thức dùng URL chính tắc của tác giả/nhà xuất bản.

| [n] | Nguồn | URL | Tóm tắt |
|---|---|---|---|
| 1 | Tổng cục Thống kê, *Niên giám thống kê 2022* | https://www.gso.gov.vn/du-lieu-va-so-lieu-thong-ke/2023/06/nien-giam-thong-ke-2022/ | Số liệu thống kê chính thức của Việt Nam (dân số, nông nghiệp, kinh tế-xã hội). Dùng cho các con số "60% dân số nông thôn/nông nghiệp". |
| 2 | FAO, *The State of Food and Agriculture 2019* | https://www.fao.org/publications/sofa/2019/en/ | Báo cáo FAO về thất thoát & lãng phí thực phẩm toàn cầu; nguồn cho con số hao hụt sau thu hoạch 20–30%. |
| 3 | Google/Temasek/Bain, *e-Conomy SEA 2023* | https://economysea.withgoogle.com/ | Báo cáo kinh tế số Đông Nam Á; nguồn cho tăng trưởng TMĐT di động VN ~18%/năm. |
| 4 | Foodmap.asia | https://foodmap.asia/ | Sàn TMĐT nông sản VN phủ rộng, B2B+B2C; đối chứng hệ thống tương tự. |
| 5 | Sendo Farm | https://www.sendo.vn/ | Kênh nông sản của Sendo; hạ tầng thanh toán/logistics mạnh, không AI nông sản đặc thù. |
| 6 | Bac Tom | https://bactom.vn/ | Chuỗi thực phẩm sạch nội địa; thương hiệu địa phương, danh mục hẹp, không AI/ML. |
| 7 | Lazada Fresh | https://www.lazada.vn/ | Mảng thực phẩm tươi của Lazada; cho đối tác lớn, AI pricing không mở API. |
| 8 | Schwaber & Sutherland, *The Scrum Guide* (2020) | https://scrumguides.org/scrum-guide.html | Định nghĩa chính tắc Scrum: Sprint, các sự kiện, vai trò (PO/SM/Dev Team). |
| 9 | R. T. Fielding, *REST dissertation* (2000) | https://ics.uci.edu/~fielding/pubs/dissertation/top.htm | Luận án gốc định nghĩa kiến trúc REST (stateless, uniform interface, HTTP/URI). |
| 10 | C. Richardson, *Microservices Patterns* (2018) | https://www.manning.com/books/microservices-patterns | Sách mẫu thiết kế microservices & các phong cách kiến trúc (monolith↔microservices, sidecar). |
| 11 | S. Newman, *Building Microservices* 2e (2021) | https://www.oreilly.com/library/view/building-microservices-2nd/9781492034018/ | Sách về thiết kế hệ phân tán microservices: lợi/hại, hạ tầng vận hành. |
| 12 | React Native Documentation | https://reactnative.dev/docs/getting-started | Framework di động đa nền tảng của Meta, render UI native từ một codebase JS/TS. |
| 13 | Expo Documentation | https://docs.expo.dev/ | Nền tảng trên React Native: SDK API native đóng gói sẵn + build tự động. |
| 14 | NativeWind Documentation | https://www.nativewind.dev/ | Tailwind CSS cho React Native (style qua className). |
| 15 | Zustand Documentation | https://zustand-demo.pmnd.rs/ | Thư viện state global nhẹ, không boilerplate Redux. |
| 16 | react-native-mmkv | https://github.com/mrousavy/react-native-mmkv | Lưu key-value bền dựa trên MMKV (Tencent), nhanh hơn AsyncStorage. |
| 17 | TanStack Query (react-query) | https://tanstack.com/query/latest | Quản lý server-state: caching, đồng bộ, invalidation cho API call. |
| 18 | NestJS Documentation | https://docs.nestjs.com/ | Framework backend Node có cấu trúc module + Dependency Injection (IoC). |
| 19 | Node.js Documentation | https://nodejs.org/en/docs/ | Runtime JavaScript phía server. |
| 20 | TypeScript Documentation | https://www.typescriptlang.org/docs/ | Ngôn ngữ bổ sung type tĩnh cho JS; bắt buộc trong NestJS. |
| 21 | MongoDB Documentation | https://www.mongodb.com/docs/ | CSDL NoSQL document (BSON), schema linh hoạt, nhúng sub-document, sharding. |
| 22 | FastAPI Documentation | https://fastapi.tiangolo.com/ | Framework Python ASGI + Pydantic; sinh OpenAPI tự động từ type hint. |
| 23 | Uvicorn Documentation | https://www.uvicorn.org/ | ASGI server chạy FastAPI. |
| 24 | Flask Documentation | https://flask.palletsprojects.com/ | Micro-framework web Python. |
| 25 | Apple Core ML | https://developer.apple.com/documentation/coreml | Framework ML on-device của Apple (inference ngay trên thiết bị). |
| 26 | Hochreiter & Schmidhuber, "LSTM" (1997) | https://www.bioinf.jku.at/publications/older/2604.pdf | Bài báo gốc LSTM: cell state + 3 gate giải quyết vanishing gradient của RNN. |
| 27 | Sutton & Barto, *Reinforcement Learning* 2e (2018) | http://incompleteideas.net/book/the-book-2nd.html | Giáo trình nền tảng RL: MDP, Bellman equation, Q-learning. |
| 28 | Mnih et al., "Human-level control… DQN" *Nature* (2015) | https://www.nature.com/articles/nature14236 | DQN: xấp xỉ Q bằng deep net + Experience Replay + Target Network. |
| 29 | van Hasselt et al., "Double Q-learning" AAAI (2016) | https://arxiv.org/abs/1509.06461 | Double DQN: tách chọn-action và đánh-giá-action để giảm overestimation bias. |
| 30 | Wang et al., "Dueling network architectures" ICML (2016) | https://arxiv.org/abs/1511.06581 | Dueling DQN: tách 2 nhánh V(s) và A(s,a), hiệu quả khi nhiều action giá trị tương đương. |
| 31 | Pan & Yang, "A survey on transfer learning" *TKDE* (2010) | https://ieeexplore.ieee.org/document/5288526 | Khảo sát transfer learning: tái dùng mô hình pretrained làm feature extractor. |
| 32 | Howard et al., "MobileNets" (2017) | https://arxiv.org/abs/1704.04861 | CNN nhẹ cho thiết bị di động (depthwise separable convolution). |
| 33 | Nassibi, Fasihuddin & Hsairi, "Demand Forecasting Models for Food Industry…" IJACSA 14(3) (2023) | https://thesai.org/Publications/ViewPaper?Volume=14&Issue=3&Code=IJACSA&SerialNo=101 | So sánh các mô hình ML dự báo nhu cầu sản phẩm thực phẩm; không có thành phần định giá. |
| 34 | Xue et al., "Automatic Pricing & Replenishment for Vegetable Products…" SDSC (2025), Springer | https://link.springer.com/chapter/10.1007/978-3-031-99879-9_10 | Định giá & nhập hàng rau tươi dựa trên ước lượng co giãn giá (OLS) + tối ưu lợi nhuận. |
| 35 | Kayikci et al., "Data-driven optimal dynamic pricing… perishable food waste" *J. Cleaner Production* (2022) | https://shura.shu.ac.uk/29838/ | Định giá động giảm giá theo hạn dùng để giảm lãng phí thực phẩm tươi ở bán lẻ (IoT, 4 giai đoạn). |
| 36 | Agrawal & Srikant, "Fast Algorithms for Mining Association Rules" VLDB (1994) | https://www.vldb.org/conf/1994/P487.PDF | Thuật toán Apriori: khai phá luật kết hợp bằng nguyên lý phản đơn điệu; support/confidence/lift. |
| 37 | Han, Pei & Yin, "Mining frequent patterns without candidate generation" SIGMOD (2000) | https://doi.org/10.1145/342009.335372 | FP-Growth: nén dữ liệu vào FP-tree, khai thác không sinh candidate (2 lần duyệt). |

## Ánh xạ [TLTK] → [n] (56 vị trí map được; 14 bỏ vì chung chung)
- Chương 1: 60% dân số/nông nghiệp→[1]; hao hụt FAO→[2]; e-Conomy SEA→[3].
- Chương 2: Scrum (Sprint/vai trò)→[8]; kiến trúc microservices/monolith→[10][11]; REST→[9]; React Native→[12]; Expo→[13]; NativeWind→[14]; Zustand→[15]; mmkv→[16]; react-query→[17]; NestJS→[18]; TypeScript→[20]; MongoDB→[21]; FastAPI→[22]; LSTM→[26]; RL Bellman→[27]; DQN→[28]; Double DQN→[29]; Dueling→[30]; transfer learning→[31]; MobileNets→[32]; Core ML→[25]; Apriori/assoc rules→[36]; FP-Growth→[37]; 4 hệ thống tương tự→[4][5][6][7].
- Chương 3: thất thoát rau quả→[2].
- Chương 4: Nassibi→[33]; Xue→[34]; Kayikci→[35] (so sánh quốc tế Bảng 4.10).
- **Bỏ qua (không rõ nguồn trong 37 mục)**: định nghĩa TMĐT/F2T chung, taxonomy "4 nhóm AI trong TMĐT" (recommender 20–35%, demand, dynamic pricing, visual AI — các câu giới thiệu chung), 30–50% chênh giá, NFR/môi trường dev.
