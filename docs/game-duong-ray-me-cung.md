Chuyển đổi ý tưởng game giáo dục "Đường Ray Mê Cung" cho trẻ từ 5-10 tuổi thành một ứng dụng React hoàn chỉnh sử dụng HTML5 Canvas để render bản đồ.

Hãy viết code sạch, tối ưu thuật toán kiểm tra đường đi, cấu trúc component đóng gói hoàn chỉnh (ví dụ: TrainTrackPuzzle.jsx).

### 1. KIẾN TRÚC VÀ PHÂN CHIA VAI TRÒ
- ReactJS: Quản lý ma trận trạng thái của bản đồ (Grid Matrix), màn chơi hiện tại (Level), trạng thái mô phỏng tàu chạy (isSimulating), trạng thái Thắng/Thua.
- HTML5 Canvas: Đọc dữ liệu từ ma trận của React để vẽ lưới đường ray, các hiệu ứng xoay mảnh ray, và hoạt ảnh (Animation) đoàn tàu mini chạy dọc theo đường ray khi bé bấm nút kiểm tra.

### 2. CẤU TRÚC DỮ LIỆU ĐƯỜNG RAY (CORE LOGIC)
Mỗi ô trong lưới (Grid) sẽ là một Object có cấu trúc:
`{ type: 'STRAIGHT' | 'CURVE' | 'START' | 'END' | 'EMPTY', rotation: 0 | 90 | 180 | 270 }`

Quy ước hướng kết nối (Top, Right, Bottom, Left) của các loại ray ở trạng thái mặc định (rotation = 0):
- STRAIGHT (Ray thẳng): Kết nối Left <-> Right.
- CURVE (Ray cong): Kết nối Bottom <-> Right.
- START (Ga xuất phát): Chỉ có 1 đầu ra hướng Right. Cố định, không được xoay.
- END (Ga đích): Chỉ có 1 đầu vào hướng Left. Cố định, không được xoay.
Khi ô ray bị xoay (rotation + 90), các đầu kết nối của nó phải được dịch chuyển tương ứng theo chiều kim đồng hồ để phục vụ thuật toán kiểm tra đường đi.

### 3. CƠ CHẾ GAMEPLAY & TƯƠNG TÁC
- Ban đầu, các ô ray kết nối giữa điểm START và END sẽ có góc xoay ngẫu nhiên (0, 90, 180, 270) khiến đường ray bị đứt đoạn.
- Cách chơi: 
  + Bé bấm chuột (hoặc chạm) vào một ô ray bất kỳ trên Canvas -> Ô đó xoay +90 độ theo chiều kim đồng hồ -> Cập nhật lại state ma trận trong React và vẽ lại trên Canvas.
  + Sau khi sắp xếp xong, bé bấm nút "CHẠY TÀU" (Nút UI bằng React).
- Thuật toán kiểm tra (Pathfinding):
  + Xuất phát từ ô START, kiểm tra xem đầu ra của ô hiện tại có khớp với đầu vào của ô kế tiếp hay không (Dựa trên `type` và `rotation`).
  + Nếu khớp, tiếp tục duyệt ô tiếp theo. Nếu đi được liên tục đến ô END -> Thắng (Success). Nếu gặp ô không khớp (đường cụt) -> Thua (Fail).
  + Khi bấm "CHẠY TÀU", Canvas sẽ vẽ một tàu mini (emoji 🚂) di chuyển mượt mà qua các ô theo danh sách tọa độ hợp lệ vừa tìm được. Nếu gặp đoạn đứt, tàu dừng lại và hiện hiệu ứng khói chấm hỏi (❓).

### 4. THÔNG SỐ KỸ THUẬT & ĐỒ HỌA (CANVAS)
- Kích thước Canvas: Hình chữ nhật tỷ lệ 4:3 (ví dụ: 640x480 px), chia làm lưới 5x4 hoặc 6x5 ô vuông.
- Đồ họa: Vẽ các đoạn ray bằng các nét vẽ sinh động (đường thẳng song song màu nâu/xám, ray cong dùng lệnh `ctx.arc`). Sử dụng Emoji để vẽ nhanh: Ga xuất phát (🏪), Ga đích (🏁), Đoàn tàu (🚂).

### 5. HỆ THỐNG MÀN CHƠI (LEVEL GENERATOR)
Thiết kế sẵn 3 Levels trong `LEVELS_DATA` ở đầu file dưới dạng mảng 2 chiều để dễ quản lý:
- Level 1 (Dễ): Lưới 4x3, đường đi là một đường thẳng hoàn toàn, bé chỉ cần xoay các mảnh STRAIGHT cho đúng hướng.
- Level 2 (Trung bình): Lưới 5x4, đường đi chữ Z, yêu cầu phối hợp cả ray STRAIGHT và ray CURVE.
- Level 3 (Khó): Lưới 6x5, có chứa các ô trống (EMPTY) làm vật cản vật lý, đường đi lắt léo quanh co.

### 6. YÊU CẦU ĐẦU RA CHO CODE
- Viết 100% bằng React Functional Component (Hooks: useState, useEffect, useRef).
- Viết hàm xử lý xoay mảng kết nối logic chính xác tuyệt đối để tránh lỗi tàu chạy sai hướng.
- UI bọc ngoài bằng Tailwind CSS gọn gàng, có nút "Xoay thử", "Chạy tàu", "Chơi lại", "Đổi màn". Hiệu ứng chuyển động của tàu dùng `requestAnimationFrame` để đảm bảo độ mượt.