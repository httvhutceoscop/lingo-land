Chuyển đổi ý tưởng game giáo dục "Thám Hiểm Lòng Đại Dương: Săn Tìm Từ Vựng" cho trẻ 7-9 tuổi thành một ứng dụng React hoàn chỉnh sử dụng HTML5 Canvas.

Hãy viết code sạch, tối ưu hiệu năng, cấu trúc component tường minh (ví dụ: OceanVocabularyGame.jsx).

### 1. KIẾN TRÚC VÀ PHÂN CHIA VAI TRÒ
- ReactJS: Quản lý trạng thái tổng thể (Màn hình chính, Điểm số, Từ vựng hiện tại cần hoàn thành, Mạng chơi, Cấp độ, Trạng thái Thắng/Thua).
- HTML5 Canvas: Xử lý vòng lặp game (Game Loop bằng requestAnimationFrame), hoạt ảnh tàu ngầm di chuyển, chướng ngại vật trôi qua, các bong bóng chữ cái trôi nổi, và xử lý va chạm vật lý.

### 2. MÔ TẢ LOGIC GAME & CƠ CHẾ (GAMEPLAY)
- Người chơi điều khiển một Tàu ngầm (Submarine) ở phía bên trái màn hình. Tàu ngầm có thể di chuyển Lên/Xuống/Sang trái/Sang phải bằng các phím mũi tên (hoặc WASD).
- Mục tiêu: Ở mỗi lượt, hệ thống React sẽ chọn ngẫu nhiên một từ tiếng Anh theo chủ đề (ví dụ: "FISH", "SHARK", "CORAL"). Từ này sẽ hiển thị ở trên cùng màn hình dưới dạng các ô trống (Vd: F _ _ H). Bé phải điều khiển tàu ngầm đi "ăn" các bong bóng chữ cái theo đúng thứ tự để hoàn thành từ.
- Vật phẩm trên Canvas:
  + Bong bóng chữ cái (Letter Bubbles): Trôi từ phải sang trái. Gồm cả chữ cái đúng và chữ cái nhiễu.
  + Chướng ngại vật (Obstacles): Cá mập, đá ngầm hoặc rác thải đại dương (sử dụng emoji 🦈, 🪨, 🗑️) trôi từ phải sang trái.
- Cơ chế va chạm & Tương tác:
  + Nếu tàu ngầm chạm vào chữ cái ĐÚNG tiếp theo của từ: Chữ cái đó được điền vào ô trống, cộng điểm, phát hiệu ứng nổ nhẹ.
  + Nếu tàu ngầm chạm vào chữ cái SAI hoặc SAI THỨ TỰ: Tàu ngầm bị đẩy lùi lại, chữ cái biến mất, không trừ điểm nhưng gây mất thời gian.
  + Nếu tàu ngầm va vào Chướng ngại vật (🦈, 🪨): Tàu ngầm bị nhấp nháy (bất tử trong 1.5 giây), người chơi mất 1 mạng (Tổng cộng 3 mạng). Hết mạng -> Game Over.

### 3. THÔNG SỐ KỸ THUẬT & ĐỒ HỌA (CANVAS)
- Kích thước Canvas: Cố định tỷ lệ 16:9 (ví dụ: 960x540 px) để tạo cảm giác không gian đại dương rộng.
- Nền Canvas: Vẽ màu gradient xanh biển sâu (Deep Sea Blue), có thể thêm vài hiệu ứng hạt nhỏ (particles) giả làm bọt khí trôi ngược về sau để tạo cảm giác tàu ngầm đang tiến về phía trước.
- Đối tượng (Objects):
  + Submarine: `x`, `y`, `width`, `height`, `speed`. Vẽ bằng hình ảnh đơn giản bằng ctx hoặc dùng emoji 🚤 / 🚢 lớn (hoặc tự vẽ bằng các khối lệnh arc/rect của ctx nếu được).
  + LetterBubble: `id`, `x`, `y`, `letter`, `radius`, `speed`. Vẽ bằng hình tròn gradient mờ màu xanh nước biển, bên trong chứa chữ cái font to rõ ràng.
  + Obstacle: `id`, `x`, `y`, `width`, `height`, `type` (emoji tương ứng), `speed`.
- Thuật toán va chạm: Sử dụng AABB (Bounding Box) cho va chạm tàu ngầm - chướng ngại vật, và Circle Collision (khoảng cách tâm) cho tàu ngầm - bong bóng chữ cái.

### 4. GAMIFICATION & UI/UX CHO TRẺ 7-9 TUỔI
- Màu sắc: Tông màu xanh dương, neon nhẹ cho các bong bóng chữ để nổi bật dưới đáy biển.
- Trạng thái Game (Game States):
  + SCREEN_START: Giao diện chọn chủ đề từ vựng (Động vật, Màu sắc, Trái cây).
  + SCREEN_PLAYING: Hiển thị thanh máu (3 Tim ❤️), điểm số, từ hiện tại (các ký tự đã tìm được và dấu gạch dưới), kèm theo Canvas game.
  + SCREEN_SUCCESS: Xuất hiện khi hoàn thành một từ, hiện pháo hoa và nút "TIẾP TỤC".
  + SCREEN_GAME_OVER: Hiện bảng điểm và nút "THỬ LẠI".

### 5. YÊU CẦU ĐẦU RA CHO CODE
- Code viết hoàn toàn bằng React (Functional Component, Hooks: useState, useEffect, useRef).
- Xử lý mượt mà sự kiện `keydown` và `keyup` để tàu ngầm di chuyển không bị khựng.
- Đảm bảo cơ chế dọn dẹp bộ nhớ (removeEventListener, cancelAnimationFrame) khi game kết thúc hoặc component unmount.
- Tạo sẵn một mảng dữ liệu từ vựng `VOCABULARY_DATA` phân theo chủ đề ở đầu file (mỗi từ gồm: word, hint, topic) để game có nội dung phong phú.
- Sử dụng CSS inline hoặc Tailwind CSS chuẩn để đóng gói giao diện đẹp mắt mà không cần file css ngoài.