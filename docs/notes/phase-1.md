# Phase 1 Notes — PRD-0: Đảo Đèn Lồng (Đêm 1 – Đảo Bến)

## 1. Giả định cho các chỗ mơ hồ trong PRD-0
| Hạng mục | Giả định đã chọn | Ghi chú trong `game.contract.json` |
|---|---|---|
| Kích thước Đảo Bến | Hình tròn bán kính `38.0 m`, mặt đất `Y = 0` | Giới hạn mềm ở rìa đảo (`fall_enabled: false`) |
| Vị trí 5 Đèn Lồng Lớn | Xếp đối xứng trên vòng tròn bán kính `24.0 m` (`L1..L5`) | Có thể ghi đè qua `scenario.lanterns` |
| Tốc độ & sức chứa | `player_speed = 7.0 m/s`, `carry_capacity = 5`, `lantern_cost = 4` | Đủ nhanh hơn Bóng Mực (`4.2 m/s`) để né |
| Tỏa sáng (Pulse) | Tốn `2` đom đóm, bán kính `8.0 m`, choáng `3.0 s`, đẩy `5.0 m`, hồi chiêu `2.0 s` | Đẩy theo hướng xuyên tâm XZ từ Mây → Bóng Mực |
| Bị Bóng Mực chạm | Mất `1` lửa (`flames = 3`), bất tử `1.5 s`, rơi `floor(carried * 0.5)` đom đóm | Hết lửa → `game_over (lost, no_flames)` |
| Vùng an toàn quanh đèn | Bóng Mực không thể vào trong bán kính `6.0 m` quanh các đèn **đã thắp** | Đẩy ra rìa `safe_radius` theo mặt phẳng XZ |
| Thời lượng & Điểm số | `300 s` (5 phút); nhặt đom đóm `+10`, thắp đèn `+100`, làm choáng `+25`, thưởng thắng: `floor(time_left_s) * 2 + flames * 50` | Hết giờ → `game_over (lost, dawn)` |
| Sinh ngẫu nhiên | Mặc định `15` đom đóm (hồi mỗi `4 s`) và `2` Bóng Mực (tối đa `4`, sinh mỗi `15 s`) | Tắt hoàn toàn khi `random_motes: false` / `random_shades: false` |

## 2. Tiêu chí nghiệm thu (Acceptance Criteria)
1. **Contract & CLI:** `game.contract.json` hợp lệ; `headless.py` chạy đúng 60 TPS, thoát mã `0` khi thành công, mã `2` khi file scenario/inputs sai định dạng.
2. **Tính tất định:** Chạy 2 lần cùng `--seed`, `--scenario`, `--inputs` ra output JSONL giống hệt nhau từng byte.
3. **Gameplay lõi:** Di chuyển theo `cam_yaw_deg` (chuẩn hóa vector > 1), nhảy, nhặt đom đóm, nạp & thắp 5 đèn, tỏa sáng làm choáng/đẩy Bóng Mực, `safe_radius`, mất máu/rơi đom đóm, thắng (`all_lit`) & thua (`no_flames` / `dawn`).
4. **Bản 3D chơi được:** Chạy qua `python3 src/play.py`, đầy đủ nhân vật Mây (nón lá + đèn nhỏ), 5 Đèn Lồng Lớn, đảo sáng dần, HUD, chơi lại sau thắng/thua.

## 3. Kiến trúc
- Tách hoàn toàn logic thuần ở `src/core/engine.py` (Python 3 stdlib, 0 thư viện ngoài → chạy nhanh trên macOS/Linux/Windows).
- `src/headless.py` bọc `GameEngine` đúng Test Contract v1.0.
- `web/` (Three.js 3D) đọc trực tiếp `game.contract.json` để đồng bộ mọi thông số tuning.
