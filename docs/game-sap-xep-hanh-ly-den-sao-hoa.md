Chuyển đổi ý tưởng game giáo dục tư duy logic "Sắp Xếp Hành Lý Đến Sao Hỏa" cho trẻ từ 6-10 tuổi thành một ứng dụng React hoàn chỉnh sử dụng HTML5 Canvas.

Hãy viết code sạch, tối ưu thuật toán kiểm tra ma trận hình học, cấu trúc component đóng gói hoàn chỉnh (ví dụ: MarsPackingGame.jsx).

### 1. KIẾN TRÚC VÀ PHÂN CHIA VAI TRÒ
- ReactJS: Quản lý cấp độ (Level), điểm số, danh sách các khối hành lý còn lại trong kho, trạng thái kiểm tra xem khoang tàu đã khít 100% chưa, và trạng thái Thắng/Thua.
- HTML5 Canvas: Xử lý vòng lặp vẽ (Animation Loop). Vẽ lưới khoang tàu vũ trụ (Grid Cargo), vẽ các khối hành lý với nhiều hình dạng khác nhau (Polyominoes), xử lý kéo thả (Drag & Drop), tự động hút vào lưới (Grid Snapping) và bắt sự kiện Click chuột để xoay khối hình.

### 2. CẤU TRÚC DỮ LIỆU KHỐI HÌNH VÀ XOAY MA TRẬN (CORE LOGIC)
- Khoang tàu vũ trụ (Cargo Bay) là một ma trận 2 chiều (ví dụ: lưới 6x6). Ô trống = 0, ô bị cản/không được xếp = -1, ô đã có hành lý = ID của khối hình.
- Mỗi Khối hành lý (Luggage Piece) được định nghĩa bằng một mảng tọa độ cục bộ (Local Coordinates) đại diện cho hình dạng của nó:
  + Khối chữ L: `[{x:0, y:0}, {x:0, y:1}, {x:0, y:2}, {x:1, y:2}]`
  + Khối chữ T: `[{x:0, y:0}, {x:1, y:0}, {x:2, y:0}, {x:1, y:1}]`
  + Khối đường thẳng: `[{x:0, y:0}, {x:0, y:1}, {x:0, y:2}]`
- Thuật toán xoay khối hình 90 độ (khi người chơi Click vào khối hình đang chọn):
  + Áp dụng công thức xoay tọa độ $90^\circ$ quanh gốc $(0,0)$: `newX = -y`, `newY = x`.
  + Sau đó, tìm giá trị `minX` và `minY` trong mảng mới và tịnh tiến toàn bộ khối về gốc tọa độ dương (chuẩn hóa ma trận) để khối hình không bị văng ra ngoài tầm kiểm tra.

### 3. CƠ CHẾ INTERACTION & GRID SNAPPING
- Người chơi chọn một khối hành lý từ khay chứa, kéo (Drag) vào khu vực lưới Khoang tàu trên Canvas.
- Khi nhả chuột (mouseup/touchend):
  + Tính toán xem điểm góc trên bên trái của khối hình đang nằm ở ô `(col, row)` nào của lưới Khoang tàu.
  + Kiểm tra tính hợp lệ (Validation): Duyệt qua từng ô nhỏ của khối hình, cộng với tọa độ `(col, row)` hiện tại. Nếu TẤT CẢ các ô đều nằm TRONG phạm vi lưới AND các ô đó trên lưới đang bằng 0 (chưa bị chiếm chỗ) -> Gán khối hình cố định vào lưới (Grid Snapping thành công).
  + Nếu có bất kỳ ô nào vi phạm (lệch ra ngoài hoặc đè lên khối khác) -> Trả khối hình ngược về vị trí cũ trong khay chứa.
- Người chơi có thể kéo một khối hình đã xếp trên lưới vứt ngược trở lại khay chứa để dọn chỗ xếp lại.

### 4. THÔNG SỐ KỸ THUẬT & ĐỒ HỌA (CANVAS)
- Kích thước Canvas: Tỷ lệ 16:9 (Ví dụ: 800x450 px). Chia đôi không gian: Bên trái vẽ Lưới khoang tàu, bên phải vẽ Khay chứa hành lý chưa xếp.
- Mỗi ô vuông trên lưới có kích thước cố định (Ví dụ: 40x40 px).
- Đồ họa: 
  + Khoang tàu vũ trụ: Thiết kế mang phong cách viễn tưởng (Sci-fi) với viền neon xanh dương, các ô lưới rỗng vẽ bằng nét đứt mờ.
  + Các khối hành lý: Vẽ bằng các màu sắc rực rỡ khác nhau (Cam, Hồng, Mint, Tím) bo tròn góc, bên trên mỗi ô nhỏ của khối vẽ lồng một Emoji vật phẩm tương ứng cho sinh động (Vd: Khối oxy 🧪, khối thức ăn 📦, khối pin năng lượng 🔋).

### 5. HỆ THỐNG MÀN CHƠI (LEVELS CONFIG)
Tạo sẵn 3 Levels tăng dần độ phức tạp trong `LEVELS_DATA`:
- Level 1 (Dễ): Lưới khoang tàu 4x4 hoàn hảo. Cho sẵn 4 khối hình đơn giản vừa khít lưới.
- Level 2 (Trung bình): Lưới khoang tàu 5x5 nhưng có 3 ô bị đánh dấu `-1` (vật cản cố định trong khoang tàu, không được xếp đồ vào). Cho sẵn 5 khối hình lắt léo hơn.
- Level 3 (Khó): Lưới khoang tàu hình dạng đặc biệt (hình chữ thập hoặc hình phi thuyền cắt góc). Người chơi phải dùng tư duy logic cao độ để xếp khít toàn bộ hành lý.

### 6. YÊU CẦU ĐẦU RA CHO CODE
- Viết 100% bằng React Functional Component (Hooks: `useState`, `useEffect`, `useRef`).
- Hàm dọn dẹp bộ nhớ (Cleanup) đầy đủ khi component unmount.
- Xử lý mượt mà cả sự kiện Chuột (Mouse) và Cảm ứng (Touch) để chơi được trên iPad/Tablet.
- Giao diện bọc ngoài bằng Tailwind CSS đẹp mắt, có nút "Xoay khối hình" (nếu bé không dùng double-click), nút "CHƠI LẠI", và màn hình chúc mừng "Tàu vũ trụ đã sẵn sàng bay đến Sao Hỏa! 🚀" khi lưới được lấp đầy 100%.