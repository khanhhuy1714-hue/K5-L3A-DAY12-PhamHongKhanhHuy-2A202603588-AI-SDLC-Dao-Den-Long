# CREDITS

## Thư viện & Nền tảng
- **Three.js (v0.160.0)** — MIT License, tải qua jsDelivr CDN (`https://cdn.jsdelivr.net/npm/three@0.160.0/`).
- **Python 3 Standard Library** — PSF License, dùng cho engine mô phỏng tất định, headless CLI, soak test, benchmark runner, local HTTP server, bảng xếp hạng cục bộ và bộ test tự động.

## Mô hình 3D, Hình ảnh & Âm thanh (100% Tự tạo bằng mã nguồn / Procedural)
- **3D Geometry & Textures (`web/game.js`):** Toàn bộ mô hình (Mây đội nón lá treo đèn lồng mini, Đèn Lồng Lớn dạng chùa có thanh dầu & vết rách khi tắt, đom đóm, Bóng Mực, Gió Lạc, Bùa Gió, 3 hòn đảo Đảo Bến/Đảo Cau/Đảo Chuông, cây cau, Tháp Chuông, biển mây, texture quầng sáng canvas) được dựng hoàn toàn bằng mã Three.js.
- **Biểu tượng & Hình minh họa:** Biểu tượng Ngọn Lửa SVG trong `web/index.html` và ảnh minh họa `docs/demo/preview.svg` do nhóm tự tạo.
- **Âm thanh (`SoundEngine` trong `web/game.js`):** Nhạc nền đêm và toàn bộ hiệu ứng âm thanh (nhặt, thắp đèn, châm dầu, tắt đèn, tỏa sáng, nhảy, lướt, bị đánh, Bóng Mực xuất hiện, cảnh báo gió, đếm ngược 10s, thắng/thua) được tổng hợp thời gian thực bằng Web Audio API của trình duyệt — không sử dụng file âm thanh bên ngoài.

## Công cụ AI đã sử dụng
- **Google Antigravity** — hỗ trợ thiết kế kiến trúc, sinh mã nguồn Python/Three.js, viết bộ test/kịch bản tự động, ADR, tài liệu kỹ thuật và kiểm chứng dưới sự điều phối và nghiệm thu của tác giả.
