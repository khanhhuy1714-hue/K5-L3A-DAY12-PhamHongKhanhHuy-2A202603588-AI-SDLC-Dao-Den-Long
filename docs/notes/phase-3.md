# Phase 3 Notes — TICKET-03: Change Request "Đèn cạn dầu" (Contract v1.2)

## 1. Phân tích ảnh hưởng thay đổi yêu cầu
- **Kiến trúc & Quyết định thiết kế:** Chi tiết tại [ADR-001](adr-001-lantern-fuel-and-dawn-survival.md).
- **Danh sách breaking changes:** Chi tiết tại [CHANGELOG.md](../../CHANGELOG.md).
- **Test cũ bị ảnh hưởng & Cách xử lý minh bạch (không bỏ qua âm thầm):**
  - `test_deposit_light_lantern_and_win_standardized_score` (Phase 2) kiểm tra thắng sớm `all_lit` và điểm `+10/mote + time_bonus` → đã thay bằng `test_first_light_does_not_end_night_early_ticket03` (xác nhận thắp đủ 5 đèn vẫn `playing`, tính điểm `+5/mote + 100`, tăng `capacity` lên `12`) và `test_dawn_survived_win_dawn_lose_and_no_flames_priority` (kiểm tra đủ 3 kết cục mới: `dawn_survived`, `dawn`, `no_flames` ưu tiên ở tick cuối).
  - Các test không bị thay thế (di chuyển/yaw/norm, nhảy, nhặt, pulse normal, safe zone khi `fuel >= 30`, shade hit/recoil, dash+charm, fall+respawn, drifter steal+drop, pause+resume, Night 2 jump pad, Night 3 full-night performance & determinism) được giữ nguyên và chạy xanh 100%.

## 2. Acceptance Criteria Phase 3
1. Nhiên liệu cố định `1/60` chính xác, hao `1/s`, châm dầu đúng công thức `ceil((100 - fuel) / 10)`, đèn đầy dầu không bị chọn, hết dầu phát `lantern_out` & `ever_lit = true`, thắp lại tốn `5` đom đóm (`relight: true`).
2. Đèn `< 30` mất vùng an toàn; Bóng Mực `wander` tự tìm tới hút `5/s` (`drain`, phát `fuel_drain` mỗi 60 tick); trúng Tỏa Sáng lúc `drain` cộng tổng `+15`; châm lại lên `≥ 30` đẩy Bóng Mực ra mép 6 m trong 30 tick.
3. Thời lượng `240 / 270 / 300 s`; không thắng sớm; thắng `dawn_survived` khi hết giờ còn sống và đạt `≥ ceil(0.6 × tổng đèn)`; hết Ngọn Lửa luôn thua `no_flames` trước.
4. Sức chứa tăng `10 + 2 × successful_lights` (tối đa 20), đặt lại mỗi Đêm.
5. Chế độ mù màu lưu `localStorage` (`#00B3FF` cho Bóng Mực, `#FFFFFF + ⚠` cho UI nguy hiểm), đèn tắt xẹp 20% + vết rách giấy, đèn yếu nhấp nháy 1 Hz kèm thanh dầu 3D.
