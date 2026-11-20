# Bằng chứng kiểm chứng — Phase 2 (`phase-2` / Contract v1.1)

Mọi bằng chứng dưới đây được sinh trực tiếp từ mã nguồn ở tag `phase-2`, không chỉnh sửa tay.

## 1. Bảng truy vết yêu cầu → Bằng chứng

| Yêu cầu (Ticket-02 & Contract v1.1) | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| `game.contract.json` v1.1 khớp toàn bộ số liệu chuẩn | `test_contract_v1_1_schema` | `tests/test_engine.py` | **Đạt** |
| Hồi quy Phase 1 với số liệu chuẩn (di chuyển, nhảy, nhặt, nạp, thắp, pulse, safe zone, hit/recoil) | 8 test trong `TestPhase1RegressionStandardized` | `tests/test_engine.py` | **Đạt** |
| Lướt (`dash`) + Bùa Gió (`C1` không hồi chiêu Lướt, tốc độ `7.2 m/s`) | Scenario `p2_dash_charm_*` (Đêm 2) | `test_scenario_dash_and_wind_charm` | **Đạt** |
| Rơi khỏi đảo (`Y < -10`), mất 1 lửa + hết đom đóm, chờ 60 tick hồi sinh | Scenario `p2_fall_*` (Đêm 1) | `test_scenario_fall_off_island_and_respawn` | **Đạt** |
| Gió Lạc cướp đom đóm (`drifter_steal`) & Tỏa Sáng thả lại (`drifter_drop`) | Scenario `p2_drifter_*` (Đêm 2) | `test_scenario_drifter_steal_and_pulse_drop` | **Đạt** |
| Tạm dừng (`paused`) đóng băng `sim_tick` và tiếp tục (`resumed`) | Scenario `p2_pause_*` (Đêm 1) | `test_scenario_pause_and_resume` | **Đạt** |
| Bản đồ Đêm 2 (Đảo Cau) + Bục nhảy phóng sang đảo B | Scenario `p2_jumppad_*` (Đêm 2) | `test_scenario_night2_jump_pad` | **Đạt** |
| Bản đồ Đêm 3 (Đảo Chuông 3 tầng, dốc, gió) + Hiệu năng trọn Đêm `21,600` tick `≤ 30 s` | Chạy `headless.py --night 3 --ticks 21600` | `night3_full.jsonl` (`0.211 s`) | **Đạt** |
| Tính tất định tuyệt đối & mã thoát `2` khi file inputs lỗi | `test_determinism_and_exit_code_2` + SHA-256 | `det_n2_1.jsonl` == `det_n2_2.jsonl` | **Đạt** |
| 3D Web: 3 Đêm, chuỗi màn chơi, Pause, Cài đặt `localStorage`, bảng màu chuẩn, HUD đầy đủ | Kiểm tra mã nguồn & chạy `python3 src/play.py` | `web/index.html`, `web/game.js` | **Đạt** |

## 2. Kết quả thực tế

```text
Ran 15 tests in 1.509s

OK
NIGHT3_21600_TICKS_SEC=0.211
DET_N2_MATCH=True SHA256=6E06A27D51F14D86519B367A2D9CCCA15AD5EC7BF9ED11FB29894DEB0579EB3E
```
