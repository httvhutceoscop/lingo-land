Chuyển đổi ý tưởng game giáo dục "Hiệp Sĩ Xanh: Phân Loại Rác Thải" cho trẻ từ 5-10 tuổi thành một ứng dụng React hoàn chỉnh sử dụng HTML5 Canvas.

Hãy viết code sạch, chú thích rõ ràng, cấu trúc component đóng gói hoàn chỉnh (ví dụ: GreenKnightRecycleGame.jsx).

### 1. KIẾN TRÚC VÀ PHÂN CHIA VAI TRÒ
- ReactJS: Quản lý trạng thái tổng thể (Màn hình chính, Điểm số, Số mạng/Máu, Level, Tiến trình hoàn thành, Trạng thái Thắng/Thua).
- HTML5 Canvas: Xử lý vòng lặp game (Game Loop bằng requestAnimationFrame). Vẽ băng chuyền chuyển động, các icon rác thải trôi qua, 4 thùng rác cố định, hiệu ứng kéo thả (Drag and Drop) trực tiếp trên tọa độ Canvas, và hiệu ứng cộng/trừ điểm.

### 2. MÔ TẢ LOGIC GAME & CƠ CHẾ (GAMEPLAY)
- Bối cảnh: Phía dưới màn hình Canvas có 4 Thùng rác được dán nhãn rõ ràng bằng màu sắc và Emoji:
  1. Hữu cơ (Màu Xanh Lá - 🍏): Thức ăn thừa, vỏ trái cây, lá cây.
  2. Tái chế (Màu Cam/Vàng - 🍾): Chai nhựa, lon nước, giấy báo, vỏ hộp sữa.
  3. Vô cơ/Rác còn lại (Màu Xám/Xanh Dương - 🪠): Túi nilon, gốm sứ vỡ, tã bỉm.
  4. Nguy hại (Màu Đỏ - 🔋): Pin, bóng đèn, chai thuốc tẩy, thiết bị điện tử cũ.
- Cách chơi: 
  + Một băng chuyền (Conveyor belt) chạy từ trái sang phải ở giữa Canvas. Các món rác (vẽ bằng Emoji to rõ) sẽ xuất hiện trên băng chuyền và trôi dần đi.
  + Bé nhấn giữ chuột (hoặc chạm tay) vào một món rác, kéo nó ra khỏi băng chuyền và thả vào đúng thùng rác tương ứng.
- Cơ chế thả rác và tính điểm:
  + Nếu thả ĐÚNG thùng: Cộng 10 điểm, món rác biến mất, hiển thị hiệu ứng dấu tích xanh (✅) bay lên.
  + Nếu thả SAI thùng: Trừ 5 điểm (hoặc không trừ), món rác tự động bay ngược trở lại băng chuyền, hiển thị hiệu ứng dấu (❌).
  + Nếu rác trôi hết băng chuyền và rơi ra ngoài (Bé không kịp phân loại): Người chơi mất 1 mạng (Tổng cộng 3 mạng). Hết mạng -> Game Over.
  + Tốc độ băng chuyền và tần suất xuất hiện rác tăng dần theo số điểm đạt được (tăng Level).

### 3. THÔNG SỐ KỸ THUẬT & XỬ LÝ SỰ KIỆN (CANVAS)
- Kích thước Canvas: Tỷ lệ 16:9 (ví dụ: 800x450 px), giao diện responsive cơ bản.
- Quản lý tương tác: Sử dụng các sự kiện `mousedown`, `mousemove`, `mouseup` (và `touchstart`, `touchmove`, `touchend` tương ứng) bọc quanh Canvas.
- Khi `mousedown`/`touchstart`: Duyệt qua danh sách các món rác hiện có, dùng thuật toán tính khoảng cách (Distance) để xem tọa độ bấm có nằm trong vùng tròn của món rác nào không. Nếu có -> Gán trạng thái `isDragging = true` và lưu `selectedTrashId`.
- Khi `mousemove`/`touchmove`: Nếu đang drag, cập nhật tọa độ `x, y` của món rác theo tọa độ chuột/tay người dùng.
- Khi `mouseup`/`touchend`: Kiểm tra xem tọa độ hiện tại của món rác có nằm đè lên (Overlap) vùng hình chữ nhật của thùng rác nào không (Bounding Box Collision). Tiến hành kiểm tra đúng/sai và reset trạng thái drag.

### 4. GAMIFICATION & UI/UX CHO TRẺ EM
- Thiết kế: Tông màu tươi sáng, thân thiện với môi trường (Xanh lá, bầu trời xanh, mây trắng).
- Đối tượng Rác (Trash Object): `id`, `x`, `y`, `type` (organic, recyclable, inorganic, hazardous), `name`, `emoji`, `speed`, `isDragging`.
- Trạng thái Game (Game States):
  + SCREEN_START: Tiêu đề game, nút "VÀO CHƠI", hướng dẫn ngắn gọn phân biệt 4 loại rác bằng hình ảnh.
  + SCREEN_PLAYING: Hiển thị Điểm số, Level, Số Tim (❤️), khu vực Canvas chơi game.
  + SCREEN_GAME_OVER: Chúc mừng hiệp sĩ nhí, hiển thị số rác đã cứu trái đất thành công và nút "CHƠI LẠI".

### 5. YÊU CẦU ĐẦU RA CHO CODE
- Code viết hoàn toàn bằng React Functional Component với đầy đủ clean-up logic khi unmount.
- Tạo sẵn một mảng dữ liệu `TRASH_ITEMS_POOL` đa dạng (khoảng 12-15 món rác khác nhau với đầy đủ phân loại đúng) để hệ thống spawn ngẫu nhiên.
- Toàn bộ giao diện bọc ngoài dùng Tailwind CSS hoặc CSS inline gọn gàng, đẹp mắt.