# Nhật ký dùng AI & Quản lý Token (AI Log)

## Phase 1 (PRD-0 & Test Contract v1.0)
- **Công cụ AI:** Google Antigravity · **Ước tính token:** ~18,000 – 24,000 tokens.
- **Cách tiết kiệm:** Python 3 stdlib (0 dependency), đọc kỹ Contract trước khi code, batch tạo file song song.
- **Harness thiết lập:** `AGENTS.md`, `.github/workflows/ci.yml`.

## Phase 2 (TICKET-02 "Ba hòn đảo" & Test Contract v1.1)
- **Công cụ AI:** Google Antigravity · **Ước tính token:** ~22,000 – 28,000 tokens (+ ~14,000 tokens cho đợt nâng cấp đồ họa, thiết kế nhân vật Mây & minimap radar).
- **Lỗi phát hiện & xử lý:** Chỉnh điểm xuất phát Đêm 3 tránh Tháp Chuông `(0,0,32)`; cập nhật test hồi quy Phase 1 minh bạch theo số liệu chuẩn.
- **Tiến hóa Harness:** Cập nhật `AGENTS.md` (12 bước tick, 5 trạng thái Bóng Mực) + thêm skill `.agents/skills/verify-phase/SKILL.md`.

## Phase 3 (TICKET-03 "Đèn cạn dầu" & Test Contract v1.2)
- **Công cụ AI:** Google Antigravity · **Ước tính token:** ~20,000 – 26,000 tokens.
- **Cách tiết kiệm:** Thiết kế trước mô hình fixed-point nguyên `fuel_60` (1/60) ngay từ đầu nên không phải debug sai số số thực quanh biên `fuel == 30` hay `ceil((100 - fuel)/10)`.
- **Quyết định & Kiểm chứng thay đổi yêu cầu:** Viết [ADR-001](adr-001-lantern-fuel-and-dawn-survival.md), [CHANGELOG.md](../../CHANGELOG.md), thay thế công khai các test cũ bị Ticket-03 ghi đè và giữ nguyên mọi test hồi quy Phase 1–2 còn hiệu lực.
- **Tiến hóa Harness:** Cập nhật [AGENTS.md](../../AGENTS.md) với quy tắc `fuel_60` nguyên, 6 trạng thái Bóng Mực (`+drain`), thứ tự tick có bước trừ dầu/tắt đèn và luật thắng `dawn_survived`.
