# Neon Tic-Tac-Toe

Tic-Tac-Toe phong cách Neon/Cyberpunk với AI Minimax, viết bằng HTML/CSS/JavaScript thuần (ES Modules, không framework, không thư viện ngoài).

## Tính năng

- 🤖 **Đấu AI** 3 mức độ: Dễ / Vừa / Khó (mức Khó không bao giờ thua), chọn đi trước hoặc đi sau
- 👥 **2 người** chơi trên cùng máy
- ↶ **Đi lại (Undo)**: khi đấu AI sẽ lùi cả nước của AI
- 💡 **Gợi ý** nước đi tốt nhất (dùng chính Minimax)
- ✨ Hiệu ứng neon: quân cờ tự vẽ nét, đường thắng phát sáng, confetti khi thắng, bàn cờ rung khi thua
- 🔊 Âm thanh synth tạo bằng Web Audio API (không cần file âm thanh), có nút tắt tiếng
- 📊 **Thống kê** thắng/thua/hòa theo từng độ khó, lưu trên máy (`localStorage`)
- 💾 Ghi nhớ cài đặt giữa các lần mở game
- ⌨️ Phím tắt: `1`–`9` đánh (từ trái sang phải, trên xuống dưới) · `H` gợi ý · `U` đi lại · `N` ván mới
- 📱 Responsive cho điện thoại, hỗ trợ chế độ giảm chuyển động (`prefers-reduced-motion`)

## Chạy game

ES Modules không chạy khi mở `index.html` trực tiếp (`file://`), nên cần một local server:

- **VS Code:** cài extension *Live Server* → chuột phải `index.html` → *Open with Live Server*
- **Hoặc dùng terminal:** `npm start` (chạy `npx serve .`) rồi mở địa chỉ được in ra

## Chạy test

```bash
npm test        # = node --test (cần Node 20+)
```

## Cấu trúc

| Thư mục | Vai trò | Được dùng DOM? |
|---|---|---|
| `js/core/` | **Model** – luật chơi, trạng thái ván, lịch sử Undo | ❌ |
| `js/ai/` | **AI** – Minimax (có memoization), độ khó, gợi ý | ❌ |
| `js/storage/` | Thống kê & cài đặt, an toàn khi `localStorage` bị chặn/hỏng | ❌ |
| `js/controller/` | **Controller** – nối Model ↔ View, điều phối lượt AI, ghi thống kê | ❌ (qua View) |
| `js/ui/` | **View** – vẽ giao diện, hiệu ứng, âm thanh | ✅ |
| `css/` | `variables` (màu) · `base` (layout) · `controls` · `board` · `effects` (keyframes) | — |

## AI

| Độ khó | Tỉ lệ nước đi dùng Minimax | Phần còn lại |
|---|---|---|
| Dễ | 50% | đánh ngẫu nhiên |
| Vừa | 80% | đánh ngẫu nhiên |
| Khó | 100% | — (không bao giờ thua) |

Khi có nhiều nước tốt ngang nhau, AI chọn ngẫu nhiên một nước nên mỗi ván sẽ khác nhau.

> Mỗi ván chỉ được ghi thống kê **một lần**: thua rồi bấm Đi lại để thắng lại thì vẫn tính là thua 😉

## Đưa game lên mạng để chia sẻ

Game chỉ gồm file tĩnh nên có thể dùng bất kỳ dịch vụ hosting tĩnh miễn phí nào.

### Cách 1 – Netlify Drop (nhanh nhất, không cần cài gì)
1. Mở <https://app.netlify.com/drop>
2. Kéo thả **cả thư mục** `tic-tac-toe-neon` vào trang
3. Nhận ngay link dạng `https://ten-ngau-nhien.netlify.app` (có thể đổi tên trong phần Site settings)

### Cách 2 – GitHub Pages
1. Tạo repository mới trên GitHub, ví dụ `tic-tac-toe-neon`
2. Đẩy code lên:
   ```bash
   git init
   git add .
   git commit -m "Neon Tic-Tac-Toe"
   git branch -M main
   git remote add origin https://github.com/<tên-bạn>/tic-tac-toe-neon.git
   git push -u origin main
   ```
3. Vào **Settings → Pages** → *Source*: `Deploy from a branch` → Branch `main`, thư mục `/ (root)` → Save
4. Sau khoảng 1 phút, game có tại `https://<tên-bạn>.github.io/tic-tac-toe-neon/`

## Tiến độ

- [x] **Bước 1** – Bàn cờ, luật chơi 2 người, Undo, test
- [x] **Bước 2** – Minimax, độ khó Dễ/Vừa/Khó, gợi ý nước đi, chọn đi trước/sau
- [x] **Bước 3** – Giao diện Neon, hiệu ứng, âm thanh, confetti, thống kê, phím tắt, responsive
- [ ] Deploy (xem hướng dẫn ở trên)
