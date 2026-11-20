# Nhật ký dùng AI & Quản lý Token (AI Log)

## Phase 1 (PRD-0 & Test Contract v1.0)
- **Công cụ AI:** Google Antigravity · **Ước tính token:** ~21,000 tokens.
- **Cách tiết kiệm:** Python 3 stdlib (0 dependency), đọc kỹ Contract trước khi code, batch tạo file song song.
- **Harness thiết lập:** `AGENTS.md`, `.github/workflows/ci.yml`.

## Phase 2 (TICKET-02 "Ba hòn đảo" & Test Contract v1.1)
- **Công cụ AI:** Google Antigravity · **Ước tính token:** ~39,000 tokens (gồm cả đợt nâng cấp thiết kế nhân vật Mây, đồ họa 3D & minimap).
- **Lỗi phát hiện & xử lý:** Dời điểm xuất phát Đêm 3 sang `(0,0,32)` tránh Tháp Chuông; cập nhật test hồi quy Phase 1 minh bạch.
- **Tiến hóa Harness:** Cập nhật `AGENTS.md` + thêm skill `.agents/skills/verify-phase/SKILL.md`.

## Phase 3 (TICKET-03 "Đèn cạn dầu" & Test Contract v1.2)
- **Công cụ AI:** Google Antigravity · **Ước tính token:** ~23,000 tokens.
- **Quyết định thiết kế:** Fixed-point nguyên `fuel_60` (`1/60`), ADR-001, `CHANGELOG.md`, cập nhật công khai test bị thay thế.
- **Tiến hóa Harness:** Cập nhật `AGENTS.md` với luật nhiên liệu nguyên, trạng thái `drain` và `dawn_survived`.

## Phase 4 (TICKET-04 "Bình minh: phát hành v1.0.0" & Test Contract v1.3)
- **Công cụ AI:** Google Antigravity · **Ước tính token:** ~26,000 tokens.
- **Tối ưu & Kiểm chứng:** Dùng `THREE.InstancedMesh` cho 200 Bóng Mực & 100 đom đóm trong cảnh benchmark chuẩn (cắt từ >1.200 xuống 2 draw calls); chạy soak test 10 Đêm thật kiểm tra RSS đầu/cuối; kiểm thử tự động bảng xếp hạng & export CLI.
- **Tổng ước tính 4 Phase:** ~109,000 tokens (~$0.40 – $0.80). Chi tiết đánh giá xem [retro.md](retro.md).
