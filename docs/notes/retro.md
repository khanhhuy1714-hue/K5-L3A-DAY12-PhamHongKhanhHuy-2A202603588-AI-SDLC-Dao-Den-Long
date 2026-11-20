# Retrospective — Day 12 AI SDLC: Đảo Đèn Lồng (v1.0.0)

## 1. Tổng hợp Evaluation qua 4 Phase

| Phase | Mục tiêu & Contract | Kết quả kiểm chứng | Điểm nổi bật / Điều chỉnh |
|---|---|---|---|
| **Phase 1** | PRD-0 & Contract v1.0 (Đêm 1 – Đảo Bến) | `13/13` test PASS, determinism khớp từng byte | Tách sạch `src/core/engine.py` (Python 3 stdlib, 0 dependency) khỏi lớp 3D `web/` ngay từ đầu. |
| **Phase 2** | Ticket-02 & Contract v1.1 (3 Đảo, Lướt, Gió Lạc, Bùa Gió, Pause, HUD, màu chuẩn) | `15/15` test PASS, trọn Đêm 3 chạy `0.211 s` (`≤ 30 s`) | Chuẩn hóa mọi hằng số từ `game.contract.json`, nâng cấp nhân vật Mây & minimap, thêm skill `verify-phase`. |
| **Phase 3** | Ticket-03 & Contract v1.2 (Đèn cạn dầu `1/60`, Bóng Mực `drain`, thắng `dawn_survived`, mù màu) | `17/17` test PASS, trọn Đêm 3 chạy `1.013 s` | Viết ADR-001 chọn fixed-point nguyên `fuel_60` loại bỏ hoàn toàn sai số float; cập nhật test cũ minh bạch & ghi `CHANGELOG.md`. |
| **Phase 4** | Ticket-04 & Contract v1.3 (Benchmark 1280×720, Soak 10 Đêm, Bảng xếp hạng, Tiếp cận, Release `v1.0.0`) | `20/20` test PASS, Soak 10 Đêm `crashes=0`, RSS ổn định | Bổ sung `InstancedMesh` cho 200 Bóng Mực + 100 đom đóm trong cảnh benchmark, đổi phím + chống trùng, phụ đề hình ảnh, chữ ≥ 18px & ×1.25. |

## 2. Điều hiệu quả & chưa hiệu quả khi làm việc với AI

**Hiệu quả:**
- **Đọc kỹ Test Contract trước khi thiết kế:** Tách hẳn simulation engine (Python thuần, 0 thư viện ngoài) khỏi renderer (Three.js ES module) giúp toàn bộ test tự động, hồi quy, determinism và soak test chạy trong vài giây mà không gặp rắc rối môi trường cài đặt trên macOS/Linux/Windows.
- **Số nguyên fixed-point cho nhiên liệu (`fuel_60`):** Thiết kế ngay từ đầu theo gợi ý Ticket-03 tránh hoàn toàn các bug lệch biên `fuel == 30.0` và `ceil((100 - fuel)/10)`.
- **Kiểm chứng ngay sau mỗi phase:** Mọi kịch bản đều chạy thật và xuất bằng chứng JSONL/JSON chưa qua chỉnh sửa.

**Chưa hiệu quả / Vấp phải trong quá trình làm:**
- **Quên commit & gắn tag riêng ngay cuối Phase 1:** Mãi đến sau Phase 2 mới kiểm tra `git tag --list` và phát hiện chưa chạy lệnh git ngoài sandbox (do sandbox chặn ghi `.git/index.lock`). Bài học là phải chạy `git tag` & `git push` lập tức sau khi chốt từng phase.
- **Song song 2 bản logic (Python cho headless & JS cho Web 3D):** Tuy nhanh và 0 dependency nhưng mỗi khi Ticket-02/03 đổi luật phải đồng bộ cẩn thận cả `engine.py` lẫn `web/game.js`.

## 3. Các lỗi của AI đã phát hiện & cách xử lý

1. **Giả định có `node` trên máy trước khi kiểm tra môi trường:** Đầu Phase 1 định dùng TypeScript/Node.js, nhưng lệnh kiểm tra môi trường phát hiện máy không cài `node`, chỉ có Python 3.12 → chuyển kịp sang Python 3 stdlib + Static Three.js web, giúp tiết kiệm hàng chục phút cài môi trường.
2. **Điểm xuất phát Đêm 3 trùng Tháp Chuông:** Trong thiết kế nháp `maps.py`, điểm xuất phát Đêm 3 đặt ở `(0,0,0)` nằm bên trong hình trụ Tháp Chuông bán kính `2 m` trên tầng 2 → phát hiện khi review bản đồ và dời sang `(0, 0, 32)` trên tầng 0 (vẫn giữ đúng `scenario.player.pos` nếu test truyền vào).
3. **PowerShell 5.1 không hỗ trợ `&&`:** Lệnh kiểm chứng chuỗi bị lỗi cú pháp trên Windows PowerShell → chuyển sang dấu `;` và kiểm tra exit code trực tiếp.
4. **Cảnh Benchmark với 200 Bóng Mực:** Nếu tạo 200 nhóm mesh riêng lẻ (mỗi con 6 mesh = 1.200 draw calls) sẽ kéo tụt FPS → tối ưu sang `THREE.InstancedMesh` cho 200 Bóng Mực & 100 đom đóm (chỉ 2 draw calls) mà vẫn giữ đầy đủ ánh sáng/bóng đổ.
5. **Lỗi `ctypes` 64-bit handle trên Windows trong `src/soak.py`:** Lần chạy đầu `GetProcessMemoryInfo` gặp `OSError: [WinError -1073741816]` do chưa khai báo `restype = ctypes.c_void_p` cho `GetCurrentProcess()` làm cắt 64-bit handle xuống 32-bit → test `test_soak_cli_short_run` bắt ngay lỗi này, sửa bằng khai báo rõ `argtypes`/`restype`, chạy lại 10 Đêm pass với `mem_start_mb = 18.79`, `mem_end_mb = 18.81`.

## 4. Harness AI nào giúp nhiều nhất?
- **[AGENTS.md](../../AGENTS.md)** (cập nhật qua cả 4 phase): giữ AI luôn bám sát *Single Source of Truth* (`game.contract.json`), thứ tự tick bắt buộc, danh sách trạng thái Bóng Mực chính xác, và quy tắc cấm tắt test âm thầm.
- **Skill [.agents/skills/verify-phase/SKILL.md](../../.agents/skills/verify-phase/SKILL.md)** & **[.github/workflows/ci.yml](../../.github/workflows/ci.yml)**: đảm bảo không bao giờ quên kiểm tra compile, hồi quy, tính tất định và hiệu năng trước khi chốt phase.

## 5. Ước tính Token / Chi phí AI & Cách tiết kiệm
- **Phase 1:** ~21,000 tokens
- **Phase 2 (gồm nâng cấp đồ họa & nhân vật):** ~39,000 tokens
- **Phase 3 (Change Request + ADR + Changelog):** ~23,000 tokens
- **Phase 4 (Bench, Soak, Leaderboard, Accessibility, Packaging, Retro):** ~26,000 tokens
- **Tổng ước tính toàn dự án:** ~109,000 tokens (tương đương ~$0.40 – $0.80 tùy biểu giá model).
- **Cách tiết kiệm token:** Giữ `AGENTS.md` ngắn dưới 40 dòng; không cài framework nặng sinh boilerplate; gộp đọc/ghi nhiều file song song trong cùng một lượt; chạy kiểm chứng gộp một lệnh thay vì gọi lẻ tẻ.

## 6. Nếu làm lại từ đầu thì sẽ đổi gì?
1. Gắn tag `phase-1` ngay lập tức sau khi xong Phase 1 trước khi đụng vào Phase 2.
2. Cho bản Web 3D gọi chung logic qua WebSocket/Pyodide hoặc biên dịch chung một nguồn (WASM/TypeScript) để chỉ phải bảo trì **một** bản simulation duy nhất thay vì đồng bộ `engine.py` và `web/game.js`.
3. Gói sẵn `three.module.js` cục bộ trong `web/vendor/` ngay từ Phase 1 để game 3D chạy offline 100% không phụ thuộc CDN.
