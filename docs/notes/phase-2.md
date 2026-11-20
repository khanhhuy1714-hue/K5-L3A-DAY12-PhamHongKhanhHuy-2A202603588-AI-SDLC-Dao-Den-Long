# Phase 2 Spec & Notes — TICKET-02: "Ba hòn đảo" (Contract v1.1)

## 1. Chuẩn hóa số liệu từ Phase 1 → Phase 2
Các thay đổi bắt buộc từ Ticket-02 đã được cập nhật đồng bộ trong `game.contract.json`, `src/core/engine.py`, `src/core/maps.py`, `web/game.js`, và các test Phase 1 đã được cập nhật kèm lý do rõ ràng:
- `player_speed`: `7.0 → 6.0 m/s`; nhảy: `vy = 7.0 m/s`, `g = -20 m/s²`.
- `carry_capacity`: `5 → 10`; `lantern_cost`: `4 → 10`; `pickup_radius`: `2.0 → 1.0 m` (kèm `ΔY ≤ 1.5 m`); `interact_radius`: `3.0 → 2.0 m`.
- `pulse_cost`: `2 → 3`; `pulse_radius`: `8.0 → 5.0 m` (3D từ `chân + 0.8 m`); `pulse_stun_s`: `3.0 → 2.0 s` (120 tick); `pulse_push_m`: `5.0 → 4.0 m` (trong 15 tick đầu); `pulse_cooldown_s`: `2.0 → 3.0 s`.
- `shade_speed`: `4.2 → 4.0 m/s` (Đêm 3: `4.5 m/s`); `shade_hit_radius`: `1.2 → 1.0 m`; thêm trạng thái chuẩn `spawning`, `wander`, `chase`, `recoil`, `stunned`.
- `fall_enabled`: `false → true` (`Y < -10`: −1 lửa, mất toàn bộ đom đóm, chờ 60 tick, hồi sinh với 90 tick bất tử).
- Điểm số: `+10` mỗi đom đóm **nạp** (thay vì nhặt), `+100` mỗi đèn thắp, `+5` mỗi Bóng Mực trúng Tỏa Sáng, thưởng thắng `floor(time_left_s)*2 + flames*50`.

## 2. Acceptance Criteria cho từng mục ở Phần 3 (Ticket-02)
| Tính năng (Phần 3) | Tiêu chí nghiệm thu (Acceptance Criteria) | Kiểm chứng |
|---|---|---|
| **Lướt (Dash)** | Nhấn `dash` (rising edge) → vận tốc `14 m/s` trong `12 tick` (`0.2 s`), hồi chiêu `90 tick` (`1.5 s`), giữ nguyên độ cao trên không, không bất tử, phát `dash {}`. | `test_scenario_dash_and_wind_charm` |
| **Rơi khỏi đảo (`Y < -10`)** | Vượt mép đảo rơi xuống `Y < -10` → mất 1 Ngọn Lửa (bỏ qua bất tử), mất hết đom đóm, phát `player_hit (by: fall, lost: n)`, chờ 60 tick rồi hồi sinh tại điểm xuất phát với `invuln_ticks = 90`. | `test_scenario_fall_off_island_and_respawn` |
| **Gió Lạc (Drifters, Đêm 2 & 3)** | Sinh lúc tick 1200, 2400… tối đa 2 con; `idle → chase` khi Mây mang `≥ 5` và cách `≤ 15 m`; chạm `≤ 1.2 m` cướp `min(3, carried)` (`drifter_steal`) rồi `flee` 240 tick; bị Tỏa Sáng khi `flee` có đồ → thả hết (`drifter_drop`) và biến mất sau 120 tick. | `test_scenario_drifter_steal_and_pulse_drop` |
| **Bùa Gió (Charms)** | Đêm 2 tại `(35,0,0)` (`C1`), Đêm 3 tại `(±30,0,25)` (`C1, C2`); nhặt phát `charm_picked`, hiệu lực 600 tick: tốc độ `7.2 m/s`, Lướt hồi chiêu 0; tái sinh sau 2700 tick. | `test_scenario_dash_and_wind_charm` |
| **Bản đồ 3 Đêm & Bục nhảy / Gió** | Đêm 1 (Đảo Bến `r=40`, 5 đèn), Đêm 2 (Đảo Cau 2 đảo + cầu tre + 2 bục nhảy + 6 đèn), Đêm 3 (Đảo Chuông 3 tầng + 2 dốc 30°/150° + bục nhảy + Tháp Chuông + gió mỗi 30s + 7 đèn). | `test_scenario_night2_jump_pad`, `test_scenario_night3_wind_and_full_night_performance` |
| **Tạm dừng (Pause/Resume)** | Nhấn `pause` dừng hoàn toàn `sim_tick`, thời gian, hồi chiêu, TTL, spawn (`state: "paused"`, phát `paused`); nhấn lại phát `resumed` và tiếp tục. UI có Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu. | `test_scenario_pause_and_resume` + `web/game.js` |
| **Chuỗi 3 Đêm, Cài đặt, Âm thanh, HUD & Bảng màu chuẩn** | Menu chính → Giới thiệu Đêm (lời Ông Đăng) → Chơi → Kết quả → Đêm kế tiếp → Màn hình Bình Minh; lưu âm lượng/độ nhạy chuột bằng `localStorage`; đủ SFX + nhạc nền; HUD đủ thanh 10 ô, đồng hồ nhấp nháy đỏ `≤ 30 s`, mũi tên chỉ đèn ngoài màn hình; màu đúng bảng Hex chuẩn và ánh sáng `0.15 + 0.55*(lit/total)`. | `web/index.html`, `web/game.js` |
| **Hiệu năng Headless** | Chạy trọn Đêm 3 (`21,600` tick) trong `≤ 30 s`. | `test_scenario_night3_wind_and_full_night_performance` (`0.211 s`) |
