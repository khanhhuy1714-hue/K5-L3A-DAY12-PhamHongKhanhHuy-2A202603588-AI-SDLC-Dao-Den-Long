# ADR-001: Mô hình nhiên liệu đèn 1/60 cố định & Luật thắng Sống sót tới Bình minh

- **Trạng thái:** Đã chấp nhận & triển khai (Phase 3 / Contract v1.2)
- **Bối cảnh:** `TICKET-03` thay đổi cốt lõi gameplay từ "thắp đủ toàn bộ đèn là thắng ngay" sang "giữ đảo sáng tới bình minh" (đèn cạn dầu `1.0/s`, Bóng Mực hút dầu `5.0/s` ở đèn yếu `< 30`, thắp lại tốn `5` đom đóm, châm dầu `+10`/đom đóm).

## Quyết định thiết kế

### 1. Biểu diễn nhiên liệu bằng số nguyên `fuel_60` (đơn vị `1/60`)
- **Vấn đề:** Nếu lưu `fuel` dạng `float` và trừ `1.0 / 60.0` mỗi tick, sai số dấu phẩy động (IEEE-754) sẽ làm lệch ngưỡng `fuel == 30.0` (vùng an toàn) và công thức `ceil((100 - fuel) / 10)` khi châm dầu.
- **Giải pháp:** Lưu `fuel_60: int` trong khoảng `0..6000` (`6000 = 100.0`, `1800 = 30.0`, hao tự nhiên `-1`/tick, hút `-5`/tick/Bóng Mực, châm dầu `+600`/đom đóm). Công thức số đom đóm cần khi châm dầu trở thành phép chia nguyên chính xác tuyệt đối: `needed = (6000 - fuel_60 + 599) // 600`. Chỉ chuyển sang số thực làm tròn 1 chữ số thập phân (`round(fuel_60 / 60.0, 1)`) khi xuất JSONL.
- **Hệ quả:** Đảm bảo 100% tính tất định giữa Python engine, bản 3D Web (`web/game.js`) và mọi nền tảng CPU/OS.

### 2. Chuyển trạng thái Đèn & Bóng Mực (`drain`)
- Mỗi đèn mang 3 thuộc tính bền vững trong Đêm: `lit`, `ever_lit`, `relit_count` cùng `fuel_60`.
- Ngay sau Bước 2 (trừ hao hụt + bị hút), mọi đèn có `fuel_60 <= 0` lập tức tắt (`lit = False`, `deposited = 0`, `ever_lit = True`, phát `lantern_out`) và giải phóng mọi Bóng Mực đang `drain` đèn đó về `wander`.
- Vùng an toàn 6 m chỉ kích hoạt khi `lit and fuel_60 >= 1800`. Khi thắp đèn hoặc châm dầu vượt lại ngưỡng `1800`, mọi Bóng Mực trong 6 m lập tức thoát `drain` và bị đẩy ra mép 6 m trong tối đa 30 tick (không gây sát thương lúc bị đẩy).

### 3. Luật thắng/thua mới tại Bước 11
- Loại bỏ nhánh thắng sớm `all_lit`.
- Ưu tiên đánh giá tại Bước 11 (sau toàn bộ cập nhật tick, kể cả tick bình minh):
  1. `player_flames <= 0` → `lost` (`no_flames`).
  2. `time_left_s <= 0` và `count(lit) >= ceil(0.6 * total)` → `won` (`dawn_survived`) kèm thưởng bình minh `sum(50 + fuel_60 // 60) + 50 * flames`.
  3. `time_left_s <= 0` và `count(lit) < ceil(0.6 * total)` → `lost` (`dawn`).
