# Nhật ký dùng AI & Quản lý Token (AI Log)

## Phase 1 (PRD-0 & Test Contract v1.0)
- **Công cụ AI:** Google Antigravity
- **Ước tính token Phase 1:** ~18,000 – 24,000 tokens.
- **Cách tiết kiệm token:** Chọn Python 3 stdlib (0 dependency), đọc kỹ Test Contract trước khi code, batch tạo file song song.
- **Phát hiện & xử lý:** Môi trường local không có `node`, chuyển sang `Python 3.12 + Web Three.js`.
- **Harness thiết lập:** `AGENTS.md`, `.github/workflows/ci.yml`.

## Phase 2 (TICKET-02 "Ba hòn đảo" & Test Contract v1.1)
- **Công cụ AI:** Google Antigravity
- **Ước tính token Phase 2:** ~22,000 – 28,000 tokens (mở rộng 3 bản đồ chuẩn `maps.py`, nâng cấp `engine.py` theo thứ tự 12 bước Contract v1.1, nâng cấp toàn bộ 3D/HUD/Menu/Audio `web/`, viết 6 kịch bản headless mới & test hồi quy).
- **Lỗi AI phát hiện & khắc phục:**
  - *Phát hiện sớm khi thiết kế Đêm 3:* Điểm xuất phát mặc định `(0,0,0)` sẽ trùng vào hình trụ Tháp Chuông (bán kính `2 m` ở tâm tầng 2) → đã chỉnh điểm xuất phát Đêm 3 sang `(0, 0, 32)` trên tầng 0 (vẫn tôn trọng `scenario.player.pos` nếu test truyền vào).
  - *Cập nhật test hồi quy Phase 1 minh bạch:* Khi Ticket-02 chuẩn hóa `per_mote` thành điểm lúc **nạp** (thay vì lúc nhặt) và đổi `carry_capacity = 10`, `lantern_cost = 10`, đã cập nhật trực tiếp các test cũ kèm chú thích lý do thay vì tắt test.
- **Tiến hóa Harness AI:**
  - Cập nhật [AGENTS.md](../../AGENTS.md) với quy tắc thứ tự 12 bước tick, 5 trạng thái Bóng Mực chuẩn (`spawning/wander/chase/recoil/stunned`), và ngưỡng hiệu năng `≤ 30 s` cho 21.600 tick.
  - Bổ sung skill [.agents/skills/verify-phase/SKILL.md](../../.agents/skills/verify-phase/SKILL.md) chuẩn hóa quy trình kiểm chứng trước khi gắn tag.
