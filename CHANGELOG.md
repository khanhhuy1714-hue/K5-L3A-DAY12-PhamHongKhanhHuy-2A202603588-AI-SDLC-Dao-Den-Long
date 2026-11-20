# CHANGELOG — Đảo Đèn Lồng

## [Phase 3 / Contract v1.2] — TICKET-03: "Đèn cạn dầu"

### Breaking Changes (Phá vỡ tương thích so với Contract v1.1 / Phase 2)
1. **Luật thắng mới (`dawn_survived` thay cho `all_lit`):**
   - Bỏ thắng sớm khi thắp hết đèn (`all_lit` không còn được dùng).
   - Thắng khi sống tới bình minh với số đèn sáng `≥ ceil(0.6 × tổng đèn)` (Đêm 1: `3/5`, Đêm 2: `4/6`, Đêm 3: `5/7`).
2. **Thời lượng Đêm rút ngắn:**
   - `night1_duration_s`: `300 → 240 s`, `night2_duration_s`: `330 → 270 s`, `night3_duration_s`: `360 → 300 s`.
3. **Nhiên liệu đèn, tắt đèn & thắp lại:**
   - Đèn sáng có `fuel = 100`, hao `1.0/s` (`1/60` mỗi tick), hết dầu thì tắt (`lantern_out`, `deposited = 0`, `ever_lit = true`).
   - Đèn sáng chưa đầy dầu nhận châm dầu (`refuel`, `+10 fuel/đom đóm`); đèn đã từng sáng (`ever_lit`) chỉ cần `5` đom đóm để thắp lại (`lantern_lit` thêm `relight: true|false`).
4. **Bóng Mực hút dầu (`drain`) & Vùng an toàn theo nhiên liệu:**
   - Đèn có `fuel < 30` mất vùng an toàn `6 m` (đúng `30` vẫn giữ).
   - Bóng Mực `wander` đi tới đèn yếu (`< 30`) gần nhất và hút `5 fuel/s` ở trạng thái `drain` (phát `fuel_drain` mỗi 60 tick).
5. **Thay thế toàn bộ công thức điểm:**
   - Nạp đom đóm (thắp/thắp lại/châm dầu): `+10 → +5`.
   - Thắp lần đầu: `+100`; thắp lại: `+40`.
   - Tỏa Sáng trúng Bóng Mực: `+5` bình thường, **`+15`** nếu đang `drain`.
   - Bỏ thưởng thời gian (`per_second_left: 0`); thưởng bình minh: mỗi đèn sáng `+(50 + floor(fuel))`, mỗi Ngọn Lửa `+50`.
6. **Sức chứa tăng dần & Mở rộng Schema Contract v1.2:**
   - Sức chứa = `min(20, 10 + 2 × successful_lights)`; snapshot `player` thêm `capacity`, `lanterns[]` thêm `fuel`, `ever_lit`, `relit_count`.

### Added
- Chế độ **Bảng màu dễ phân biệt (Mù màu)** lưu trong `localStorage` (`#00B3FF` cho Bóng Mực, `#FFFFFF` + `⚠` cho cảnh báo UI).
- Phân biệt đèn tắt/sáng không cần màu (đèn tắt xẹp 20% + vết rách giấy; đèn yếu `< 30` nhấp nháy 1 Hz kèm thanh dầu 3D).
- Tia năng lượng hút dầu từ Bóng Mực vào đèn yếu.
- [ADR-001](docs/notes/adr-001-lantern-fuel-and-dawn-survival.md).

---

## [Phase 2 / Contract v1.1] — TICKET-02: "Ba hòn đảo"
- Chuẩn hóa thông số điều khiển & điểm số; bổ sung Đêm 2 (Đảo Cau) và Đêm 3 (Đảo Chuông), Lướt, rơi khỏi đảo, Gió Lạc, Bùa Gió, Tạm dừng, Cài đặt, HUD đầy đủ, bảng màu Hex chuẩn và skill `verify-phase`.

## [Phase 1 / Contract v1.0] — PRD-0: "Đảo Đèn Lồng"
- Engine mô phỏng 60 TPS tất định (Python 3 stdlib), CLI headless Contract v1.0, game 3D Three.js Đêm 1 — Đảo Bến.
