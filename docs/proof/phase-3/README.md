# Bằng chứng kiểm chứng — Phase 3 (`phase-3` / Contract v1.2)

Mọi bằng chứng dưới đây được sinh trực tiếp từ mã nguồn ở tag `phase-3`, không sửa tay.

## 1. Bảng truy vết yêu cầu Ticket-03 → Bằng chứng

| Yêu cầu (Ticket-03 & Contract v1.2) | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| `game.contract.json` v1.2 đủ khóa mới & thời lượng `240/270/300 s` | `test_contract_v1_2_schema` | `tests/test_engine.py` | **Đạt** |
| Hao dầu `1/60` nguyên, châm dầu `+10/mote`, đèn đầy không chọn | `test_fuel_decay_refuel_and_full_lantern_not_selected` | `tests/test_engine.py` | **Đạt** |
| Hết dầu phát `lantern_out`, thắp lại tốn `5` (`relight: true`, `+40`), sức chứa tăng `10 + 2×k` (max 20) | `test_lantern_out_relight_5_motes_and_progressive_capacity` + `p3_fuel_dawn_out.jsonl` | `p3_fuel_dawn_out.jsonl` | **Đạt** |
| Bóng Mực `drain` đèn yếu `< 30` (`5/s`, `fuel_drain` mỗi 60 tick) & Tỏa Sáng trúng `drain` `+15` | `test_shade_drain_ai_fuel_drain_event_and_pulse_15_bonus` | `tests/test_engine.py` | **Đạt** |
| Châm dầu lại lên `≥ 30` khôi phục vùng an toàn `6 m` & đẩy Bóng Mực trong 30 tick | `test_refuel_above_30_restores_safe_zone_and_pushes_draining_shade` | `tests/test_engine.py` | **Đạt** |
| Không thắng sớm `all_lit`; thắng `dawn_survived` (≥60% đèn + thưởng bình minh), thua `dawn` & ưu tiên `no_flames` | `test_first_light_does_not_end_night_early_ticket03`, `test_dawn_survived_win_dawn_lose_and_no_flames_priority` | `tests/test_engine.py`, `p3_fuel_dawn_out.jsonl` | **Đạt** |
| Hồi quy toàn bộ luật Phase 1–2 không bị thay thế (di chuyển, nhảy, dash/charm, fall, drifter, pause, jump pad) | `TestPhase1And2RegressionV12` + `test_p2_*` | `tests/test_engine.py` | **Đạt** |
| Hiệu năng trọn Đêm 3 (`18,000` tick `≤ 30 s`) & tính tất định | `test_full_night3_performance_and_determinism` | `night3_full_v12.jsonl` (`1.013 s`), `det_n3_1.jsonl == det_n3_2.jsonl` | **Đạt** |
| 3D Web: thanh dầu 3D + nhấp nháy 1 Hz `< 30`, đèn tắt xẹp 20% + vết rách giấy, tia hút dầu, chế độ mù màu (`#00B3FF`, `#FFFFFF + ⚠`) | Kiểm tra mã nguồn & chơi trực tiếp qua `python3 src/play.py` | `web/index.html`, `web/game.js` | **Đạt** |
| ADR thiết kế & CHANGELOG breaking changes | Rà soát tài liệu | `docs/notes/adr-001-lantern-fuel-and-dawn-survival.md`, `CHANGELOG.md` | **Đạt** |

## 2. Kết quả chạy thực tế

```text
Ran 17 tests in 3.124s

OK
NIGHT3_18000_TICKS_SEC=1.013
DET_N3_MATCH=True SHA256=34D23E176050683C36CF41DA41F20165087C82AC2B449008373D3C54D7CE49FF
```

## 3. Tóm tắt kịch bản End-to-End ([p3_fuel_dawn_out.jsonl](p3_fuel_dawn_out.jsonl))
- Tick 0: `L1` có `fuel = 0.2`, `L2`/`L3` có `fuel = 80.0`, `capacity = 10`, `score = 0`.
- Tick 12: `lantern_out` cho `L1`.
- Tick 26: `deposit` 5 đom đóm + `lantern_lit` (`relight: true`) → `score = 65` (`5×5 + 40`), `capacity` tăng lên `12`, `relit_count = 1`.
- Tick 120 (bình minh): `game_over` (`won`, `dawn_survived`), `score = 619` (`65 + (50+98) + (50+78) + (50+78) + 3×50`).
