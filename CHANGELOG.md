# CHANGELOG — Đảo Đèn Lồng

## [v1.0.0 — Phase 4 / Contract v1.3] — TICKET-04: "Bình minh: phát hành v1.0.0"

### Added
- **Test Contract v1.3 (`game.contract.json`):** bổ sung `bench_cmd` và `soak_cmd`.
- **Chế độ Benchmark (`src/bench.py` + `web/game.js?bench=1`):** cảnh Đêm 1 chuẩn 1280×720, 200 Bóng Mực `wander` + 100 đom đóm (`InstancedMesh`), L1–L3 sáng `fuel 100`, camera quỹ đạo `r=30 m, Y=15 m` ngược chiều kim đồng hồ `15 s/vòng`, 3s warmup, xuất `bench.json`.
- **Soak Test (`src/soak.py`):** chạy headless 10 Đêm liên tiếp trong cùng tiến trình với input ngẫu nhiên theo seed, đo RSS đầu/cuối đa nền tảng, xuất `soak.json`.
- **Bảng xếp hạng cục bộ (`src/core/leaderboard.py` + `src/play.py --export-leaderboard`):** lưu Top 10 bền vững tại `data/leaderboard.json`, kiểm tra tên 3–12 ký tự (hỗ trợ tiếng Việt có dấu), xếp hạng theo điểm giảm dần & thời điểm đạt trước, UI xem & lưu điểm sau Bình Minh hoặc khi thua.
- **Dễ tiếp cận (Accessibility):**
  - Đổi toàn bộ 9 phím điều khiển kèm phát hiện trùng phím & nút "Khôi phục mặc định".
  - Phụ đề & chỉ báo hình ảnh cho Bóng Mực xuất hiện (kèm mũi tên mép màn hình), gió sắp thổi, 10s cuối, đèn `fuel < 30`.
  - Tùy chọn "Giảm chuyển động" (tắt rung camera, chớp viền màn hình, FOV kick).
  - Cỡ chữ UI tối thiểu `18px` ở 1280×720 + tùy chọn "Chữ lớn (×1.25)".
- **Đóng gói phát hành & Tài liệu:** `Dockerfile`, `scripts/package_release.py` (`dist/dao-den-long-v1.0.0.zip`), `docs/notes/retro.md`, `docs/demo/preview.svg`.

---

## [Phase 3 / Contract v1.2] — TICKET-03: "Đèn cạn dầu"

### Breaking Changes (Phá vỡ tương thích so với Contract v1.1 / Phase 2)
1. **Luật thắng mới (`dawn_survived` thay cho `all_lit`):** Bỏ thắng sớm; thắng khi sống tới bình minh với `≥ ceil(0.6 × tổng đèn)` (Đêm 1: `3/5`, Đêm 2: `4/6`, Đêm 3: `5/7`).
2. **Thời lượng Đêm rút ngắn:** `240 / 270 / 300 s`.
3. **Nhiên liệu đèn (fixed-point `1/60`), tắt đèn & thắp lại:** Hao `1/s`, châm dầu `+10/đom đóm` (`refuel`), hết dầu tắt (`lantern_out`, `ever_lit = true`), thắp lại tốn `5` đom đóm (`relight: true`).
4. **Bóng Mực hút dầu (`drain`) & Vùng an toàn theo nhiên liệu:** Đèn `< 30` mất vùng an toàn `6 m`; Bóng `wander` hút `5/s` (`fuel_drain` mỗi 60 tick).
5. **Thay thế toàn bộ công thức điểm:** Nạp `+5`, thắp lần đầu `+100`, thắp lại `+40`, Tỏa Sáng `+5` (`+15` nếu đang `drain`), bỏ thưởng thời gian, thưởng bình minh `+(50 + floor(fuel))` mỗi đèn sáng & `+50` mỗi Ngọn Lửa.
6. **Sức chứa tăng dần:** `min(20, 10 + 2 × successful_lights)` + mở rộng schema Contract v1.2.

### Added
- Chế độ **Bảng màu dễ phân biệt (Mù màu)** (`#00B3FF` cho Bóng Mực, `#FFFFFF + ⚠` cho UI nguy hiểm), đèn tắt xẹp 20% kèm vết rách giấy, thanh dầu 3D nhấp nháy 1 Hz `< 30`, [ADR-001](docs/notes/adr-001-lantern-fuel-and-dawn-survival.md).

---

## [Phase 2 / Contract v1.1] — TICKET-02: "Ba hòn đảo"
- Chuẩn hóa toàn bộ thông số gameplay & bảng màu Hex chuẩn; mở rộng 3 Đêm (Đảo Bến, Đảo Cau, Đảo Chuông), Lướt, rơi khỏi đảo, Gió Lạc, Bùa Gió, Tạm dừng, Cài đặt, HUD đầy đủ, nhân vật Mây cử động, minimap radar, Web Audio SFX và skill `verify-phase`.

---

## [Phase 1 / Contract v1.0] — PRD-0: "Đảo Đèn Lồng"
- Engine mô phỏng 60 TPS tất định (Python 3 stdlib), CLI headless Contract v1.0, game 3D Three.js Đêm 1 — Đảo Bến.
