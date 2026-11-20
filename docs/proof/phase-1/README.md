# Bằng chứng kiểm chứng — Phase 1 (`phase-1`)

Mọi bằng chứng dưới đây được sinh trực tiếp từ mã nguồn ở tag `phase-1`, không sửa tay.

## 1. Bảng truy vết yêu cầu → Bằng chứng

| Yêu cầu (PRD-0 & Contract v1.0) | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| `game.contract.json` hợp lệ ở gốc repo | `test_contract_schema` | `tests/test_engine.py` | **Đạt** |
| Di chuyển theo `cam_yaw_deg` & chuẩn hóa vector > 1 | `test_movement_yaw_and_normalization` | `tests/test_engine.py` | **Đạt** |
| Nhảy & phát hiện rising edge | `test_jump_physics_and_rising_edge` | `tests/test_engine.py` | **Đạt** |
| Nhặt đom đóm trong `pickup_radius`, giới hạn `carry_capacity` | `test_mote_pickup_and_capacity` | `tests/test_engine.py` | **Đạt** |
| Nạp đom đóm, thắp Đèn Lồng Lớn, thắng `all_lit` & cộng điểm thưởng | `test_deposit_light_lantern_and_win` + scenario end-to-end | `quick_win_out.jsonl` | **Đạt** |
| Tỏa sáng (Pulse) làm choáng & đẩy Bóng Mực | `test_pulse_stuns_and_pushes_shades` | `tests/test_engine.py` | **Đạt** |
| Bóng Mực không vào `safe_radius` quanh đèn đã thắp | `test_safe_radius_blocks_shade` | `tests/test_engine.py` | **Đạt** |
| Bị Bóng Mực chạm mất lửa, rơi đom đóm, thua `no_flames` | `test_shade_hit_drop_and_lose_no_flames` | `tests/test_engine.py` | **Đạt** |
| Hết thời gian thua `dawn` | `test_lose_by_dawn` | `tests/test_engine.py` | **Đạt** |
| Tính tất định tuyệt đối (2 lần chạy cùng seed giống hệt nhau) | `test_determinism_identical_jsonl` + so sánh SHA-256 | `det_run1.jsonl` == `det_run2.jsonl` | **Đạt** |
| File scenario/inputs sai định dạng thoát mã `2` | `test_malformed_inputs_returns_exit_code_2`, `test_malformed_json_returns_exit_code_2` | `tests/test_engine.py` | **Đạt** |
| Bản 3D chơi được Đêm 1 – Đảo Bến (Mây nón lá, 5 đèn, HUD, chơi lại) | Chạy `python3 src/play.py` và kiểm tra trực tiếp trên trình duyệt | `web/index.html`, `web/game.js`, `src/play.py` | **Đạt** |

## 2. Kết quả chạy bộ test tự động

Lệnh chạy:
```bash
python -m compileall -q src
python -m unittest discover -s tests -v
```

Kết quả thực tế:
```text
Ran 13 tests in 0.703s

OK
```

## 3. Kiểm chứng tính tất định (Determinism)

Lệnh chạy:
```bash
python src/headless.py --seed 42 --night 1 --ticks 300 --out docs/proof/phase-1/det_run1.jsonl
python src/headless.py --seed 42 --night 1 --ticks 300 --out docs/proof/phase-1/det_run2.jsonl
```

Kết quả thực tế:
- `DET_MATCH=True`
- `SHA256 = 3CF3182988AF933ADFD2449D865CD046712905AA00EC02070253CFCC8DA41BCE` (hai file `det_run1.jsonl` và `det_run2.jsonl` khớp nhau từng byte).

## 4. Kịch bản Headless mẫu (`quick_win_out.jsonl`)

Xem toàn bộ output tại [quick_win_out.jsonl](quick_win_out.jsonl) (chạy với `tests/scenarios/quick_win_scenario.json` và `tests/scenarios/quick_win_inputs.json`):
- Tick 0: snapshot khởi tạo, `score = 0` (không phát sự kiện khi dựng scenario).
- Tick 26: `mote_picked` (`carried = 4`).
- Tick 86: `deposit` (`L1`, `amount = 4`), `lantern_lit` (`L1`), `game_over` (`won`, `all_lit`).
- Dòng cuối: `{"type":"end","ticks":86,"state":"won","score":656}`.
