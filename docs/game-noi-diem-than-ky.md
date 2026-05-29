Chuyển đổi ý tưởng game giáo dục mầm non "Nối Điểm Thần Kỳ" cho trẻ từ 3-5 tuổi thành một ứng dụng React hoàn chỉnh sử dụng HTML5 Canvas để render.

Hãy viết code sạch, thuật toán kiểm tra thứ tự nối điểm chính xác, cấu trúc component đóng gói hoàn chỉnh (ví dụ: ConnectDotsGame.jsx).

### 1. KIẾN TRÚC VÀ PHÂN CHIA VAI TRÒ
- ReactJS: Quản lý danh sách các màn chơi (Levels), mỗi màn chơi là một hình ẩn giấu khác nhau. Quản lý trạng thái điểm hiện tại bé cần nối (currentDotIndex), trạng thái hoàn thành màn chơi để mở khóa bức tranh.
- HTML5 Canvas: Chịu trách nhiệm vẽ các chấm tròn (Dots) có đánh số từ 1 đến 10 lên màn hình theo tọa độ định sẵn, lắng nghe sự kiện chuột/touch để vẽ đường nối tạm thời từ chấm hiện tại theo tay người chơi (Rubber-band line), và vẽ đường nối cố định khi bé nối đúng.

### 2. CORE LOGIC & THUẬT TOÁN NỐI ĐIỂM (DOT CONNECTING)
Mỗi Level được định nghĩa bằng một mảng chứa 10 điểm tọa độ tạo thành một hình học đơn giản (Ví dụ: Hình Ngôi sao, Hình Quả táo, Hình Ngôi nhà) và một ảnh nền/emoji ẩn:
`DOTS_LEVELS = [ { id: 1, name: "Ngôi sao", points: [{x:400, y:100}, {x:450, y:220}, ...], finalEmoji: "⭐" } ]`

- Biến trạng thái logic: `activeDotIndex` (khởi tạo bằng 0, tức là điểm số 1).
- Logic tương tác:
  + Khi bé nhấn giữ chuột/touch vào điểm `activeDotIndex` (Điểm số 1): Kích hoạt trạng thái vẽ. Khi di chuyển chuột, vẽ một đường thẳng mờ từ điểm số 1 chạy theo con trỏ chuột.
  + Khi bé nhả chuột (`mouseup` / `touchend`): Kiểm tra xem tọa độ nhả chuột có nằm trong bán kính Hitbox (Radius = 25px để trẻ dễ bấm trúng) của điểm tiếp theo `activeDotIndex + 1` (Điểm số 2) hay không.
  + Nếu ĐÚNG: Vẽ một đường thẳng đậm màu nối cố định từ điểm 1 sang điểm 2. Tăng `activeDotIndex` lên 1 (Điểm hiện tại cần nối tiếp theo sẽ là điểm số 2). Phát tín hiệu cho React biết để chạy âm thanh đọc số.
  + Nếu SAI: Đường thẳng tạm thời biến mất, hệ thống không phạt, điểm chốt hiện tại nhấp nháy nhẹ để báo hiệu bé thử nối lại.

### 3. ĐIỀU KIỆN THẮNG & ĐỒ HỌA CHO TRẺ MẦM NON
- Kích thước Canvas: Cố định 800x500 px. Nền Canvas màu dịu mát (Pastel nhẹ).
- Đồ họa các chấm tròn: Vẽ vòng lặp `ctx.arc` thành các chấm tròn màu sắc sặc sỡ (đường kính 20px), bên dưới hoặc bên cạnh vẽ số thứ tự tương ứng (1, 2, 3... 10) font chữ Bold, dễ nhìn.
- Khi bé nối thành công đến điểm số 10 (Hoàn thành hình): Canvas sẽ tự động vẽ lấp đầy khoảng không gian giữa các đường nối bằng một màu sắc tươi sáng, hoặc hiển thị Emoji khổng lồ của vật thể đó (`finalEmoji`) chính giữa các điểm nối kèm hiệu ứng pháo hoa rực rỡ nổ xung quanh.

### 4. YÊU CẦU ĐẦU RA CHO CODE
- Viết 100% bằng React Functional Component với đầy đủ các React Hooks (`useState`, `useEffect`, `useRef`).
- Đảm bảo xử lý dọn dẹp các Event Listener bọc ngoài Canvas khi component unmount để tránh rò rỉ hiệu năng.
- Giao diện bọc ngoài bằng Tailwind CSS thân thiện. Có nút "CHƠI LẠI", "ĐỔI HÌNH" (Level Selector) kích thước siêu to để các ngón tay nhỏ của bé dễ dàng thao tác trên iPad/Màn hình cảm ứng.