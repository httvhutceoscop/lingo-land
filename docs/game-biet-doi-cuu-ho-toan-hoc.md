Chuyển đổi ý tưởng game giáo dục "Biệt Đội Cứu Hộ Toán Học" cho trẻ 5-7 tuổi thành một ứng dụng React hoàn chỉnh sử dụng HTML5 Canvas. 

Hãy viết code sạch, tường minh và đóng gói toàn bộ logic trong một cấu trúc component hợp lý (ví dụ: MathRescueGame.jsx).

### 1. KIẾN TRÚC VÀ CÁCH PHÂN CHIA VAI TRÒ
- ReactJS: Quản lý trạng thái tổng thể của game (Màn hình chính, Điểm số, Số mạng/Máu, Level, Trạng thái Thắng/Thua, Câu hỏi hiện tại).
- HTML5 Canvas: Xử lý hiệu ứng đồ họa, hoạt ảnh bong bóng rơi (Animation Loop sử dụng requestAnimationFrame), hiệu ứng nổ bong bóng và xử lý va chạm đáy màn hình.

### 2. MÔ TẢ LOGIC GAME & CƠ CHẾ (GAMEPLAY)
- Bối cảnh: Các bong bóng mang phép toán (cộng/trừ trong phạm vi 10 hoặc 20) rơi từ trên đỉnh Canvas xuống đáy với tốc độ tăng dần theo level.
- Tương tác: 
  + Khi một bong bóng xuất hiện, hệ thống React sẽ cập nhật "Câu hỏi hiện tại" dựa trên bong bóng đó (hoặc hiển thị bảng số để chọn).
  + Để tối ưu UI/UX cho trẻ em: Hiển thị một "Bảng keypad số từ 0 đến 20" bằng React UI ở phía dưới hoặc bên cạnh Canvas. 
  + Khi bé bấm vào một số trên keypad: Nếu số đó trùng với đáp án của bong bóng đang rơi thấp nhất -> Kích hoạt hiệu ứng vỡ bong bóng trên Canvas -> Cộng điểm -> Sinh bong bóng mới. Nếu sai -> Hiện hiệu ứng rung đỏ, không trừ điểm nhưng bong bóng tiếp tục rơi.
  + Thất bại: Nếu bong bóng rơi chạm đáy Canvas mà chưa được giải -> Bé mất 1 mạng (Tổng cộng 3 mạng). Hết mạng -> Game Over.

### 3. THÔNG SỐ KỸ THUẬT & ĐỒ HỌA (CANVAS)
- Kích thước Canvas: Responsive hoặc cố định tỷ lệ 4:3 (ví dụ: 800x600 px) để dễ tính toán tọa độ.
- Bubble Object gồm: `id`, `x`, `y`, `radius`, `speed`, `mathString` (vd: "3 + 2"), `answer` (vd: 5), `color`, `animalIcon` (emoji ngẫu nhiên đại diện cho động vật cần cứu hộ như 🐶, 🐱, 🐰).
- Sử dụng font chữ to, bo tròn, dễ đọc trên Canvas (`ctx.font = "bold 20px 'Segoe UI', Arial"`). Vẽ bong bóng bằng đường tròn gradient mờ, bên trong chứa emoji con vật và chuỗi phép tính.

### 4. GAMIFICATION & UI/UX CHO TRẺ EM (5-7 TUỔI)
- Màu sắc chủ đạo: Tươi sáng (Sky blue, Pastel pink, Mint green).
- Trạng thái Game (Game States):
  + SCREEN_START: Nút "BẮT ĐẦU" siêu to, hình ảnh minh họa vui nhộn.
  + SCREEN_PLAYING: Giao diện chơi game gồm Thanh năng lượng/Máu (3 trái tim emoji ❤️), Điểm số, Canvas game, và Bảng số cho bé bấm.
  + SCREEN_GAME_OVER: Hiển thị số điểm đạt được và nút "CHƠI LẠI".
- Hiệu ứng: Khi trả lời đúng, vẽ một hiệu ứng vòng tròn đồng tâm lan tỏa (Particle pop effect) tại tọa độ bong bóng vừa vỡ.

### 5. YÊU CẦU ĐẦU RA CHO CODE
- Viết toàn bộ bằng React (Functional Component, Hooks như: useState, useEffect, useRef).
- Sử dụng CSS lồng trực tiếp (Inline styles) hoặc Tailwind CSS chuẩn để clone giao diện dễ dàng, không phụ thuộc file CSS ngoài phức tạp.
- Code phải xử lý dọn dẹp bộ nhớ tốt (Clear interval/Cancel animation frame khi component unmount hoặc chuyển trạng thái game) để tránh tràn bộ nhớ (memory leak).
- Gom các cấu hình game (Tốc độ rơi, khoảng thời gian spawn bong bóng, phạm vi phép toán theo Level) vào một object `GAME_CONFIG` ở đầu file để dễ tinh chỉnh (Tweak).