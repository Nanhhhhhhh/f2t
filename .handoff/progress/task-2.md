# progress/task-2.md — Viết khoá luận hoàn chỉnh từ dany.md

Plan: `docs/superpowers/plans/2026-06-07-task2-thesis-full-prose.md`.
Đầu ra: `docs/thesis/final/` (chia chương) + `diagrams/*.puml`.
Quy trình mỗi leaf-task: ledger-first → viết prose (giữ citation inline) → verify đối kháng độc lập (CSDL/AI-ML/diagram 2-lớp) → done-gate → commit.

## T2.1 — Skeleton thesis final + STRUCTURE map ✅
- Tạo `docs/thesis/final/`: 00-trang-bia-muc-luc.md, chuong-1..5, tai-lieu-tham-khao.md, diagrams/.gitkeep, STRUCTURE.md.
- Skeleton heading lấy từ `dany.outline.md`; mỗi section có comment `<!-- T2.x: nguồn dany.md Lxx; ledger ... -->`.
- STRUCTURE.md = hợp đồng cấu trúc: bảng ánh xạ 40 section → leaf-task → file → diagram → ledger + số liệu canonical + 3 giới hạn bắt buộc + quy ước [TLTK].
- **Verify (controller):** heading khớp 100% dany.outline.md — ch1 6 mục; ch2 6×§y + 13×§y.z; ch3 5×§y + 19×§y.z + 3×(a/b/c); ch4 4×§y + 8×§y.z; ch5 3×§y. Thứ tự + cấp giữ nguyên. PASS.
