# progress/task-2.md — Viết khoá luận hoàn chỉnh từ dany.md

Plan: `docs/superpowers/plans/2026-06-07-task2-thesis-full-prose.md`.
Đầu ra: `docs/thesis/final/` (chia chương) + `diagrams/*.puml`.
Quy trình mỗi leaf-task: ledger-first → viết prose (giữ citation inline) → verify đối kháng độc lập (CSDL/AI-ML/diagram 2-lớp) → done-gate → commit.

## T2.1 — Skeleton thesis final + STRUCTURE map ✅
- Tạo `docs/thesis/final/`: 00-trang-bia-muc-luc.md, chuong-1..5, tai-lieu-tham-khao.md, diagrams/.gitkeep, STRUCTURE.md.
- Skeleton heading lấy từ `dany.outline.md`; mỗi section có comment `<!-- T2.x: nguồn dany.md Lxx; ledger ... -->`.
- STRUCTURE.md = hợp đồng cấu trúc: bảng ánh xạ 40 section → leaf-task → file → diagram → ledger + số liệu canonical + 3 giới hạn bắt buộc + quy ước [TLTK].
- **Verify (controller):** heading khớp 100% dany.outline.md — ch1 6 mục; ch2 6×§y + 13×§y.z; ch3 5×§y + 19×§y.z + 3×(a/b/c); ch4 4×§y + 8×§y.z; ch5 3×§y. Thứ tự + cấp giữ nguyên. PASS.

## T2.2 — Fact-pack ledger ✅

5 entry đã nạp vào `claims-ledger.md` nhóm "Task 2 — fact-pack prose":

| Entry ID | Phát biểu | Path:Lxx chính | Trạng thái |
|---|---|---|---|
| `t2.2-tech-versions` | Version thư viện Backend/Frontend/Sidecar | `f2t-backend/package.json:29-51`, `f2t-frontend/package.json:53-97`, `pricing-sidecar/requirements.txt:1-9` | PASS |
| `t2.2-frontend-routes` | 8 route groups + 5 file gốc, ≈48 màn hình | `ls f2t-frontend/src/app` (thực thi), ledger t1.15-numbers | PASS |
| `t2.2-seed` | Đếm tài khoản seed thật | `f2t-backend/src/seed/seed.ts:59,87,116,381` | PASS — KHỚP dany.md |
| `t2.2-stripe-ghn` | Stripe checkout/webhook + GHN createOrder + Dijkstra | `payments.service.ts:54,102,120,126`, `ghn.provider.ts:47`, `delivery.service.ts:98,131,232` | PASS |
| `t2.2-security` | JwtAuthGuard, bcrypt saltRounds=10, graceful degrade | `jwt-auth.guard.ts:5`, `users.service.ts:18`, `dynamic-pricing.service.ts:154,283,522` | PASS |

**Con số seed thật (đọc seed.ts trực tiếp):**
- Admin×1 (`seed.ts:381`) — role `'admin'`, email `admin@f2t.com`
- Farm×3 (`seed.ts:59`, vòng `i=1..3`) — role `'farm'`, status `'active'`
- Consumer×5 (`seed.ts:87`, vòng `i=1..5`) — role `'consumer'`, status `'active'`
- Suspended×1 (`seed.ts:116`) — role `'consumer'`, status `'suspended'`
- **Tổng: 10 user — KHỚP dany.md §4.2.3 "Admin×1, Farm×3, Consumer×5, Suspended×1" — KHÔNG lệch.**

**Ghi chú kỹ thuật:**
- Frontend: `react-native-mmkv` trong package.json ghi `~3.1.0` (đúng như spec). Không có `@stripe/stripe-react-native` — Stripe chỉ ở backend + WebView redirect flow.
- Dijkstra trong delivery.service.ts là fallback demo (no GHN code) — graph 10 node HCMC hardcoded, trả `trackingCode: 'GHN-ALGO-F2T-99'`. Thesis nên trình bày rõ đây là fallback minh họa, không phải routing production.
