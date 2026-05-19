Chuyển đổi ý tưởng game giáo dục "Vương Quốc Code Nhí" cho trẻ từ 8-10 tuổi thành một ứng dụng React hoàn chỉnh sử dụng HTML5 Canvas để mô phỏng thuật toán.

Hãy viết code sạch, cấu trúc component logic, tách biệt rõ ràng giữa khu vực xây dựng lệnh (React) và khu vực hiển thị bản đồ (Canvas). (Tên file gợi ý: CodeKingdomGame.jsx)

### 1. KIẾN TRÚC VÀ PHÂN CHIA VAI TRÒ
- ReactJS: Quản lý danh sách các khối lệnh có sẵn (Commands Pool), danh sách lệnh bé đã chọn (Workspace Array), Level hiện tại, Trạng thái chạy thử (IsExecuting).
- HTML5 Canvas: Vẽ một bản đồ dạng lưới ô vuông (Grid Map dụ: 6x6 hoặc 88 px mỗi ô). Vẽ các chướng ngại vật, các viên kim cương cần nhặt, vị trí đích (Portal) và hoạt ảnh (Animation) chú robot di chuyển từng bước theo các khối lệnh được truyền vào.

### 2. MÔ TẢ LOGIC GAME & CƠ CHẾ (GAMEPLAY)
- Bản đồ Grid-based: Mỗi ô trên lưới Canvas có thể là: Đường đi (Empty), Vật cản (Wall/Rock - 🧱), Kim cương (Gem - 💎), hoặc Cổng đích (Portal - 🌀). Chú robot (🤖) xuất hiện ở một tọa độ xuất phát (Vd: x:0, y:0) và hướng mặt ban đầu (Vd: UP, DOWN, LEFT, RIGHT).
- Hệ thống lệnh (Commands): Bé có một danh sách các khối lệnh bằng nút bấm UI của React ở bên cạnh Canvas:
  + "MOVE_FORWARD" (Đi thẳng 1 ô)
  + "TURN_LEFT" (Xoay trái 90 độ tại chỗ)
  + "TURN_RIGHT" (Xoay phải 90 độ tại chỗ)
- Luồng vận hành (Execution Flow):
  1. Bé bấm các nút lệnh để thêm vào "Bảng lập trình" (Vd: [Đi thẳng, Xoay phải, Đi thẳng, Đi thẳng]). Bé có thể bấm Xóa để làm lại.
  2. Bé bấm nút "CHẠY LỆNH" (Nút Run siêu to): React sẽ khóa UI và truyền mảng lệnh này vào Game Loop của Canvas.
  3. Canvas bắt đầu thực thi tuần tự TỪNG LỆNH MỘT. Mỗi lệnh chạy trong khoảng 0.5 giây để bé kịp quan sát robot di chuyển/xoay hướng trên lưới.
- Điều kiện Thắng/Thua:
  + Thắng (Success): Robot đi qua các ô chứa Kim cương (để ăn) và dừng chân đúng ô Cổng đích (Portal) sau khi kết thúc mảng lệnh. Hiện pháo hoa, mở khóa Level tiếp theo.
  + Thua (Fail): Lệnh chạy hết mà robot chưa đến đích, HOẶC robot đâm vào tường (🧱), HOẶC robot đi ra ngoài rìa bản đồ. Xuất hiện bảng thông báo "Lập trình chưa đúng rồi, hãy sửa lại code nhé!" và reset robot về vị trí xuất phát.

### 3. THÔNG SỐ KỸ THUẬT & ĐỒ HỌA (CANVAS ANIMATION)
- Kích thước Canvas: Cố định dạng hình vuông (Vd: 500x500 px) chia thành các ô lưới (Vd: 5x5 hoặc 6x6 ô).
- Robot State gồm: `gridX`, `gridY`, `direction` (0: UP, 1: RIGHT, 2: DOWN, 3: LEFT), `currentVisualX`, `currentVisualY` (dùng để nội suy tọa độ tạo hiệu ứng trượt mượt mà giữa các ô thay vì bị giật cục).
- Để vẽ bản đồ và robot, sử dụng các ký tự Emoji to rõ: Robot (🤖), Kim cương (💎), Đá ngăn đường (🧱), Đích đến (🌀).

### 4. HỆ THỐNG MÀN CHƠI (LEVELS CONFIG)
Tạo sẵn một mảng dữ liệu `LEVELS_DATA` gồm ít nhất 3 màn chơi tăng dần độ khó:
- Level 1: Đường thẳng đơn giản (Chỉ cần 2-3 lệnh MOVE_FORWARD).
- Level 2: Có góc cua (Yêu cầu phối hợp TURN_RIGHT/LEFT và MOVE_FORWARD).
- Level 3: Mê cung nhỏ có đá cản, yêu cầu né đá để nhặt kim cương trước khi về đích.

### 5. YÊU CẦU ĐẦU RA CHO CODE
- Code viết hoàn toàn bằng React Functional Component với Hooks (`useState`, `useEffect`, `useRef`).
- Phần xử lý chuyển động tuần tự của Robot trên Canvas cần sử dụng một bộ đếm thời gian hoặc state máy trạng thái (Animation State Machine) trong `requestAnimationFrame` để xử lý mượt mà việc chuyển từ lệnh này sang lệnh tiếp theo mà không làm đơ trình duyệt.
- Giao diện bọc ngoài sử dụng Tailwind CSS hoặc CSS inline đẹp mắt, chia đôi màn hình: Bên trái là Canvas Map, Bên phải là Bảng kéo/thả xếp khối lệnh của bé.