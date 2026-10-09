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

