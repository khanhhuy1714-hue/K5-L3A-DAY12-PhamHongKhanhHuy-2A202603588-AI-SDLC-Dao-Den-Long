# 🏮 Đảo Đèn Lồng — Đèn Cạn Dầu (Contract v1.2)

> **Video demo:** *(Sẽ cập nhật ở Phase 4 / Release `v1.0.0`)*

Game 3D góc nhìn thứ ba qua **3 Đêm**: **Đêm 1 — Đảo Bến (240s)**, **Đêm 2 — Đảo Cau (270s)**, **Đêm 3 — Đảo Chuông (300s)**. Điều khiển **Mây** (đội nón lá treo đèn lồng nhỏ) thắp sáng, châm dầu và bảo vệ các Đèn Lồng Lớn khỏi Bóng Mực hút dầu để **giữ đảo sáng tới bình minh**!

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
| `E` | Thắp đèn (lần đầu `10`, thắp lại `5`) hoặc **Châm dầu** cho đèn đang sáng (`+10 dầu/đom đóm`) |
| `F` hoặc `X` | Tỏa Sáng xua & làm choáng Bóng Mực / Gió Lạc (tốn `3` đom đóm, hồi chiêu `3.0 s`) |
| `Q` / `C` hoặc kéo chuột | Xoay camera 3D |
| `Esc` / `P` | Tạm dừng (Tiếp tục / Chơi lại Đêm / Cài đặt âm thanh, chuột & **Chế độ mù màu** / Về menu) |

---

## Luật chơi & Cách tính điểm (Contract v1.2)

Toàn bộ thông số khai báo tại [game.contract.json](game.contract.json):
- **Giữ đảo sáng tới bình minh:** Thắng khi hết giờ còn sống và giữ sáng `≥ 60%` tổng số đèn (Đêm 1: `3/5`, Đêm 2: `4/6`, Đêm 3: `5/7`). Không thắng sớm khi thắp đủ đèn.
- **Nhiên liệu đèn:** Đèn sáng bắt đầu ở `100` dầu, tự hao `1/s`; dưới `30` dầu sẽ mất vùng an toàn `6 m` và bị Bóng Mực hút thêm `5/s` (`drain`). Hết dầu đèn tắt (`ever_lit = true`), thắp lại chỉ tốn `5` đom đóm.
- **Sức chứa tăng dần:** `10 + 2 × số lần thắp thành công trong Đêm` (tối đa `20`).
- **Điểm số:**
  - Nạp 1 đom đóm (thắp mới / thắp lại / châm dầu): **+5**
  - Thắp lần đầu: **+100** · Thắp lại: **+40**
  - Bóng Mực trúng Tỏa Sáng: **+5** (hoặc **+15** nếu đang `drain`)
  - Thưởng bình minh (khi thắng): mỗi đèn sáng **+50 + `floor(fuel)`**; mỗi Ngọn Lửa còn lại **+50** (không còn thưởng thời gian).

---

## Chạy Test & Chế độ Headless (Test Contract v1.2)

```bash
# Chạy toàn bộ test (hồi quy Phase 1–2 + kiểm chứng toàn diện Ticket-03 + hiệu năng + determinism)
python3 -m unittest discover -s tests -v

# Chạy chế độ headless cho Đêm 1, 2 hoặc 3
python3 src/headless.py --seed 42 --night 1 --ticks 600 --out /tmp/out.jsonl --snapshot-every 10
python3 src/headless.py --seed 99 --night 3 --ticks 18000 --out /tmp/night3.jsonl --snapshot-every 600
```

---

## Sáng tạo của tôi

Các yếu tố sáng tạo được cô lập hoàn toàn ở lớp hiển thị/âm thanh trình duyệt (`web/`), **giữ đúng bảng màu chuẩn Hex, hỗ trợ chế độ mù màu và không làm đổi đầu ra headless Contract v1.2**:
1. **Thiết kế nhân vật & hiệu ứng cổ tích:** Nhân vật Mây cử động tay chân theo nhịp chạy, khăn quàng đỏ bay, nón lá treo đèn lồng đung đưa, đom đóm đã nhặt bay xoay quanh người (tới 20 đốm), bóng mờ + FOV khi Lướt, tia năng lượng hút dầu của Bóng Mực, thanh dầu 3D trên đèn và đèn tắt xẹp 20% kèm vết rách giấy.
2. **UI & Hỗ trợ tiếp cận:** Minimap radar theo dõi đèn yếu/đèn tắt/kẻ địch, chế độ **Bảng màu dễ phân biệt (Mù màu)** (`#00B3FF` & `#FFFFFF + ⚠`), thanh đom đóm co giãn động theo sức chứa `10..20`, bộ đếm FPS trực tiếp và mũi tên chỉ ưu tiên đèn sắp cạn dầu ngoài màn hình.
3. **Âm thanh tổng hợp Web Audio API:** Nhạc nền đêm dịu nhẹ cùng hiệu ứng đầy đủ cho nhặt, thắp đèn, châm dầu, tắt đèn, tỏa sáng, lướt, nhảy, bị đánh, cảnh báo gió mạnh và đếm ngược 10 giây cuối.

Bằng chứng kiểm chứng & hồi quy: [docs/proof/phase-3/README.md](docs/proof/phase-3/README.md).

---

## Tài liệu & Ghi chép SDLC
- Harness AI: [AGENTS.md](AGENTS.md), [.agents/skills/verify-phase/SKILL.md](.agents/skills/verify-phase/SKILL.md), [.github/workflows/ci.yml](.github/workflows/ci.yml)
- ADR & Changelog: [docs/notes/adr-001-lantern-fuel-and-dawn-survival.md](docs/notes/adr-001-lantern-fuel-and-dawn-survival.md), [CHANGELOG.md](CHANGELOG.md)
- Spec & Ghi chép: [docs/notes/phase-1.md](docs/notes/phase-1.md), [docs/notes/phase-2.md](docs/notes/phase-2.md), [docs/notes/phase-3.md](docs/notes/phase-3.md), [docs/notes/ai-log.md](docs/notes/ai-log.md)
- Bằng chứng: [docs/proof/phase-1/README.md](docs/proof/phase-1/README.md), [docs/proof/phase-2/README.md](docs/proof/phase-2/README.md), [docs/proof/phase-3/README.md](docs/proof/phase-3/README.md)
- Bản quyền & Nguồn asset: [LICENSE](LICENSE), [CREDITS.md](CREDITS.md)
