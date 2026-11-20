# 🏮 Đảo Đèn Lồng — Ba Hòn Đảo (Contract v1.1)

> **Video demo:** *(Sẽ cập nhật ở Phase 4 / Release `v1.0.0`)*

Game 3D góc nhìn thứ ba qua **3 Đêm**: **Đêm 1 — Đảo Bến**, **Đêm 2 — Đảo Cau**, **Đêm 3 — Đảo Chuông**. Điều khiển **Mây** (đội nón lá treo đèn lồng nhỏ) gom đom đóm thắp sáng các Đèn Lồng Lớn, lướt né **Bóng Mực**, đối phó **Gió Lạc**, nhặt **Bùa Gió** và vượt địa hình nhiều tầng để đón Bình Minh.

---

## Cài đặt & Chạy game (tối đa 3 lệnh)

Yêu cầu: **Python 3.10+** (0 thư viện ngoài) và trình duyệt hỗ trợ WebGL.

```bash
# 1. Kiểm tra biên dịch
python3 -m compileall -q src

# 2. Mở game 3D trên trình duyệt (tự mở http://127.0.0.1:8000/web/)
python3 src/play.py
```

---

## Điều khiển

| Phím / Thao tác | Chức năng |
|---|---|
| `W A S D` / Phím mũi tên | Di chuyển Mây (`6.0 m/s`, với Bùa Gió `7.2 m/s`) |
| `Space` | Nhảy (`7.0 m/s`) |
| `Shift` | Lướt (`14 m/s`, `0.2 s`, hồi chiêu `1.5 s`, `0 s` khi có Bùa Gió) |
| `E` | Nạp đom đóm vào Đèn Lồng Lớn gần nhất (bán kính `2.0 m`, cần `10` đom đóm/đèn) |
| `F` hoặc `X` | Tỏa Sáng xua & làm choáng Bóng Mực / Gió Lạc (tốn `3` đom đóm, hồi chiêu `3.0 s`) |
| `Q` / `C` hoặc kéo chuột | Xoay camera 3D |
| `Esc` / `P` | Tạm dừng (Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu) |

---

## Cách tính điểm (Chuẩn hóa Contract v1.1)

Toàn bộ thông số khai báo tại [game.contract.json](game.contract.json):
- Nạp 1 đom đóm vào đèn: **+10 điểm**
- Thắp sáng 1 Đèn Lồng Lớn (đủ 10 đom đóm): **+100 điểm**
- Mỗi Bóng Mực trúng Tỏa Sáng: **+5 điểm**
- Thưởng khi thắng Đêm: **+2 × `floor(giây còn lại)`** + **+50 × Ngọn Lửa còn lại**
- Tổng điểm chiến dịch = tổng điểm các Đêm đã thắng.

---

## Chạy Test & Chế độ Headless (Test Contract v1.1)

```bash
# Chạy toàn bộ 15 test (hồi quy Phase 1 + 6 kịch bản tính năng mới Phase 2 + hiệu năng + determinism)
python3 -m unittest discover -s tests -v

# Chạy chế độ headless cho Đêm 1, 2 hoặc 3
python3 src/headless.py --seed 42 --night 1 --ticks 600 --out /tmp/out.jsonl --snapshot-every 10
python3 src/headless.py --seed 99 --night 3 --ticks 21600 --out /tmp/night3.jsonl --snapshot-every 600
```

---

## Sáng tạo của tôi

Các yếu tố sáng tạo được cô lập ở lớp hiển thị/âm thanh trình duyệt (`web/game.js`), **không làm đổi đầu ra headless theo Test Contract v1.1**:
1. **Âm thanh tổng hợp Web Audio API:** Nhạc nền đêm dịu nhẹ cùng hiệu ứng đầy đủ cho nhặt đom đóm, thắp đèn, tỏa sáng, nhảy, lướt, bị đánh, Bóng Mực xuất hiện, đếm ngược 10 giây cuối, thắng/thua; điều chỉnh & lưu âm lượng qua `localStorage`.
2. **Hiệu ứng trực quan & chỉ dẫn:** Vòng hào quang vùng an toàn `6 m` quanh đèn sáng, sóng Tỏa Sáng lan tỏa, thanh 10 ô đom đóm phát sáng và mũi tên định hướng tự động chỉ về Đèn Lồng chưa sáng gần nhất khi nằm ngoài màn hình.

Bằng chứng kiểm chứng & hồi quy: [docs/proof/phase-2/README.md](docs/proof/phase-2/README.md).

---

## Tài liệu & Ghi chép SDLC
- Harness AI: [AGENTS.md](AGENTS.md), [.agents/skills/verify-phase/SKILL.md](.agents/skills/verify-phase/SKILL.md), [.github/workflows/ci.yml](.github/workflows/ci.yml)
- Spec & Giả định: [docs/notes/phase-1.md](docs/notes/phase-1.md), [docs/notes/phase-2.md](docs/notes/phase-2.md)
- Nhật ký AI & Token: [docs/notes/ai-log.md](docs/notes/ai-log.md)
- Bằng chứng: [docs/proof/phase-1/README.md](docs/proof/phase-1/README.md), [docs/proof/phase-2/README.md](docs/proof/phase-2/README.md)
- Bản quyền & Nguồn asset: [LICENSE](LICENSE), [CREDITS.md](CREDITS.md)
