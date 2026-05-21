Chuyển đổi ý tưởng game giáo dục tư duy logic "Đảo Thần Kỳ 2048: Tiến Hóa Động Vật" cho trẻ từ 5-10 tuổi thành một ứng dụng React hoàn chỉnh sử dụng HTML5 Canvas.

Hãy viết code sạch, tối ưu thuật toán dịch chuyển ma trận 2048, cấu trúc component đóng gói hoàn chỉnh (ví dụ: AnimalEvolution2048.jsx).

### 1. KIẾN TRÚC VÀ PHÂN CHIA VAI TRÒ
- ReactJS: Quản lý ma trận trạng thái 4x4 của trò chơi, điểm số hiện tại, điểm cao nhất (High Score), trạng thái Thắng/Thua (Win/Game Over).
- HTML5 Canvas: Xử lý vòng lặp render (Animation Loop). Đọc ma trận từ React để vẽ nền hòn đảo xanh, vẽ các ô thú cưng dưới dạng Emoji kèm hiệu ứng hoạt ảnh di chuyển tịnh tiến (Slide Animation) và hiệu ứng phóng to/thu nhỏ khi gộp ô (Merge/Pop Animation).

### 2. CORE LOGIC & CHUỖI TIẾN HÓA (2048 MECHANICS)
- Quy ước chuỗi tiến hóa của các động vật trên đảo (tương ứng với các lũy thừa của 2):
  + 2 = 🥚 (Trứng thần kỳ)
  + 4 = 🐥 (Gà con)
  + 8 = 🐰 (Thỏ tai dài)
  + 16 = 🦊 (Cáo tinh nghịch)
  + 32 = 🐵 (Khỉ thông thái)
  + 64 = 🐗 (Heo rừng)
  + 128 = 🐯 (Hổ dũng mãnh)
  + 256 = 🦁 (Sư tử vương)
  + 512 = 🐻 (Gấu khổng lồ)
  + 1024 = 🐘 (Voi lực sĩ)
  + 2048 = 🐉 (Rồng huyền thoại - Mục tiêu tối cao của game)
- Logic dịch chuyển (Slide & Merge Matrix):
  + Người chơi sử dụng các phím mũi tên (UP, DOWN, LEFT, RIGHT) hoặc vuốt màn hình.
  + Khi bấm một hướng, tất cả các ô thú cưng sẽ dồn về hướng đó. Nếu hai ô có cùng loài vật nằm cạnh nhau trên hướng di chuyển, chúng sẽ gộp lại (Merge) tạo thành loài vật ở cấp tiến hóa tiếp theo. Cộng điểm tương ứng với giá trị ô mới tạo thành.
  + Sau mỗi lượt di chuyển hợp lệ, hệ thống tự động sinh ngẫu nhiên một ô 🥚 (Trứng - giá trị 2) hoặc 🐥 (Gà con - giá trị 4) ở một ô trống bất kỳ trên lưới.

### 3. THÔNG SỐ KỸ THUẬT & HOẠT ẢNH MƯỢT MÀ (CANVAS)
- Kích thước Canvas: Hình vuông (Ví dụ: 450x450 px), chia đều thành lưới ma trận 4x4 ô vuông.
- Để tạo chuyển động trượt mượt mà (không bị biến mất rồi xuất hiện đột ngột): Mỗi thực thể trong ô lưới (Tile Object) cần lưu: `value`, `gridX`, `gridY` (tọa độ đích trên lưới) và `visualX`, `visualY` (tọa độ hiển thị pixel thực tế trên Canvas). Trong Game Loop, sử dụng thuật toán nội suy tuyến tính (Linear Interpolation - LERP) để cập nhật `visualX` và `visualY` tiến dần về tọa độ đích sau mỗi frame.
- Thiết kế đồ họa: Ô lưới bo tròn góc (Rounded rect), màu nền pastel tươi sáng (mỗi cấp độ tiến hóa có một màu nền riêng để phân biệt rõ ràng). Vẽ Emoji của con vật to, chính giữa ô.

### 4. GAMIFICATION & UI/UX CHO TRẺ EM
- Giao diện: Tông màu chủ đạo là xanh lá/xanh biển như một hòn đảo hoang sơ hoành tráng.
- Bảng tiến hóa (Evolution Guide): Hiển thị một thanh bảng nhỏ ở trên hoặc bên cạnh Canvas xếp theo thứ tự từ Trứng -> Rồng để bé nhìn vào biết được con vật nào sẽ tiến hóa thành con vật nào tiếp theo.
- Trạng thái Game:
  + SCREEN_PLAYING: Hiển thị Điểm số, Nút "CHƠI LẠI", Bảng tiến hóa và Canvas game. Có hỗ trợ bắt sự kiện vuốt (Touch events) cho các thiết bị máy tính bảng.
  + SCREEN_WIN: Xuất hiện ngay khi bé tạo ra 🐉 (Rồng 2048). Hiện pháo hoa chúc mừng nhưng cho phép bấm nút "CHƠI TIẾP" để phá kỷ lục điểm số.
  + SCREEN_GAME_OVER: Xuất hiện khi lưới đầy và không còn nước đi hợp lệ (không dồn được hướng nào nữa).

### 5. YÊU CẦU ĐẦU RA CHO CODE
- Code viết hoàn toàn bằng React (Functional Component, các Hook: useState, useEffect, useRef).
- Thuật toán gộp ô 2048 phải xử lý chính xác (một ô không được gộp 2 lần trong cùng một lượt di chuyển).
- Quản lý tốt việc lắng nghe sự kiện bàn phím (keydown), loại bỏ hành vi cuộn trang mặc định của trình duyệt (e.preventDefault()) khi bé bấm phím mũi tên để tránh lỗi giật màn hình web.
- Toàn bộ bọc ngoài bằng Tailwind CSS hoặc CSS inline đẹp mắt, scannable và responsive gọn gàng.