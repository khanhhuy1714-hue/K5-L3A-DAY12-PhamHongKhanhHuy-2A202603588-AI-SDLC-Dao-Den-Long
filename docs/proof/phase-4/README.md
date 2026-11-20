# Bằng chứng kiểm chứng — Phase 4 (`phase-4` / Release `v1.0.0` / Contract v1.3)

Mọi bằng chứng dưới đây được sinh trực tiếp từ mã nguồn ở tag `phase-4`, không chỉnh sửa tay.

## 1. Bảng truy vết yêu cầu Ticket-04 → Bằng chứng

| Yêu cầu (Ticket-04 & Contract v1.3) | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| `game.contract.json` v1.3 thêm `bench_cmd` & `soak_cmd` | `test_contract_v1_2_schema` | `tests/test_engine.py` | **Đạt** |
| Chế độ Benchmark 1280×720 (`--seed 42 --duration 30 --out bench.json`, 200 Bóng Mực, 100 đom đóm, L1–L3 sáng, camera `r=30, Y=15` CCW `15s/vòng`, 3s warmup) | Chạy `python src/bench.py --seed 42 --duration 30 --out bench.json` | [bench.json](../../../bench.json) (`avg_fps=537.03`, `p1_low_fps=258.0`, `load_ms=2815.9`) | **Đạt** |
| Soak test 10 Đêm liên tiếp (`crashes == 0`, `mem_end_mb ≤ 1.2 × mem_start_mb`) | Chạy `python src/soak.py --seed 7 --nights 10 --out soak.json` | [soak.json](../../../soak.json) (`crashes=0`, `18.79 → 18.81 MB`, `0.55 s`) | **Đạt** |
| Bảng xếp hạng cục bộ Top 10 (3–12 ký tự, hỗ trợ tiếng Việt, lưu đĩa, sắp xếp điểm giảm / sớm hơn đứng trên, CLI `--export-leaderboard`) | `test_leaderboard_validation_sorting_tiebreak_and_top10`, `test_play_export_leaderboard_cli` | `src/core/leaderboard.py`, `leaderboard_sample.json` | **Đạt** |
| Dễ tiếp cận: đổi 9 phím + báo trùng + khôi phục mặc định; phụ đề + mũi tên Bóng Mực xuất hiện/gió/10s/fuel<30; giảm chuyển động; chữ ≥ 18px & ×1.25 | Kiểm tra giao diện & `localStorage` qua `python src/play.py` | `web/index.html`, `web/game.js` | **Đạt** |
| Đóng gói Release `v1.0.0`, `README.md`, `CHANGELOG.md` (4 phase), `CREDITS.md`, `LICENSE`, `retro.md` | Chạy `python scripts/package_release.py` | `dist/dao-den-long-v1.0.0.zip` (`61.9 KB`), `Dockerfile`, `docs/notes/retro.md` | **Đạt** |
| Video demo `.mp4` dưới 5 phút (chơi trực tiếp 3 Đêm, benchmark, test, headless, soak, harness & git) | Chạy `python scripts/record_demo.py` | [demo.mp4](../../demo/demo.mp4) (`19.18 MB`, ~68s, MP4 H.264 `ftyp=True`) | **Đạt** |
| Hồi quy toàn bộ Phase 1–3 còn hiệu lực | `python -m unittest discover -s tests -v` | `20/20` tests PASS (`5.008 s`) | **Đạt** |

## 2. Kết quả chạy thực tế

### Bộ test tự động (20/20 PASS)
```text
Ran 20 tests in 5.008s

OK
```

### Benchmark 3D 1280×720 ([bench.json](../../../bench.json))
```json
{
  "contract_version": "1.3",
  "avg_fps": 537.03,
  "p1_low_fps": 258.0,
  "frame_ms_p95": 2.8,
  "frames": 16113,
  "load_ms": 2815.9,
  "peak_mem_mb": 126.3,
  "vsync_off": true,
  "renderer": "Three.js r160 WebGL (ANGLE (AMD, AMD Radeon(TM) 780M (0x00001900) Direct3D11 vs_5_0 ps_5_0, D3D11))",
  "os": "Windows 11 (AMD64)"
}
```
- `avg_fps`: `537.03 ≥ 60` · `p1_low_fps`: `258.0 ≥ 30` · `load_ms`: `2815.9 ≤ 10000` (vượt xa toàn bộ ngưỡng đạt).

### Soak test 10 Đêm ([soak.json](../../../soak.json))
```json
{
  "nights": 10,
  "crashes": 0,
  "results": ["lost","lost","lost","lost","lost","lost","lost","lost","lost","lost"],
  "mem_start_mb": 18.79,
  "mem_end_mb": 18.81,
  "duration_s": 0.55
}
```
- Tỉ lệ bộ nhớ cuối/đầu: `18.81 / 18.79 = 1.001x` (đạt xa ngưỡng `≤ 1.20x`).
- Thời lượng 10 Đêm liên tiếp: `0.55 s`, `crashes = 0`.
