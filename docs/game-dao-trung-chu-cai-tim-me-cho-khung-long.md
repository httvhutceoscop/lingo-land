Chuyển đổi ý tưởng game giáo dục mầm non "Đảo Trứng Chữ Cái: Tìm Mẹ Cho Khủng Long" cho trẻ từ 3-5 tuổi thành một ứng dụng React hoàn chỉnh sử dụng HTML5 Canvas để xử lý tương tác và hoạt ảnh.

Hãy viết code sạch, tối ưu thuật toán kéo thả và vẽ đường đi tự động, cấu trúc component đóng gói hoàn chỉnh trong một file duy nhất (ví dụ: DinosaurAlphabetGame.jsx).

### 1. KIẾN TRÚC VÀ PHÂN CHIA VAI TRÒ
- ReactJS: Quản lý bộ dữ liệu chữ cái (Cặp chữ Hoa - Thường tương ứng, ví dụ: A-a, B-b, C-c), quản lý trạng thái màn chơi (Level), trạng thái so khớp Đúng/Sai khi bé thả trứng, và hệ thống nút bấm UI to rõ để chuyển đổi màn chơi.
- HTML5 Canvas: Xử lý vòng lặp đồ họa (Animation Loop). Vẽ tổ chim/khủng long mẹ ở giữa, vẽ các quả trứng chữ cái, xử lý sự kiện kéo thả (Drag and Drop) trứng vào mục tiêu, và xử lý hoạt ảnh chú khủng long con nở ra rồi đi bộ vẽ nét chữ.

### 2. CORE LOGIC & THUẬT TOÁN ĐIỀU HƯỚNG KHỦNG LONG (PATH ANIMATION)
Mỗi Level được định nghĩa bằng một Object chứa Chữ Hoa (Khủng long mẹ), Chữ Thường đúng (Trứng đúng), 2 Chữ Thường nhiễu (Trứng sai) và một mảng tọa độ nét vẽ:
`LEVEL_DATA = { id: 1, uppercase: "B", correctLowercase: "b", distractors: ["d", "q"], strokePath: [{x: 400, y: 150}, {x: 400, y: 350}, {x: 400, y: 150}, {x: 480, y: 200}, ...] }`

- Logic Kéo Thả Trứng:
  + Canvas vẽ 3 quả trứng nằm ở khay dưới, mỗi quả mang một chữ cái thường (ví dụ: b, d, q).
  + Người chơi nhấn giữ và kéo một quả trứng thả vào vùng Hitbox của Khủng long mẹ (ở trung tâm Canvas).
  + Nếu thả SAI quả trứng: Quả trứng tự động bay mượt mà về lại vị trí cũ dưới khay. Hệ thống không phạt điểm, không trừ mạng.
  + Nếu thả ĐÚNG quả trứng: Kích hoạt trạng thái Trứng Nở. Quả trứng vỡ đôi, xuất hiện một chú Khủng long con (emoji 🦖 hoặc 🦕).

- Logic Khủng Long Con Tập Viết (Stroke Order Animation):
  + Chú khủng long con sẽ bắt đầu xuất hiện tại điểm đầu tiên của `strokePath` (`strokePath[0]`).
  + Sử dụng thuật toán nội suy tuyến tính (Lerp) trong Game Loop để dịch chuyển tọa độ (x, y) của khủng long con tiến dần qua từng điểm trong mảng `strokePath`.
  + Khi khủng long con di chuyển đến đâu, Canvas dùng lệnh `ctx.lineTo` vẽ một đường mực đậm màu, có cọ vẽ to (`lineWidth = 15`) lưu lại phía sau dấu chân của nó. Khi di chuyển qua hết các điểm, đường mực này sẽ hiện rõ hình dạng của chữ cái viết thường (ví dụ: chữ "b") để bé nhận diện cách viết.

### 3. THÔNG SỐ KỸ THUẬT & ĐỒ HỌA CANVAS
- Kích thước Canvas: Cố định 800x450 px. Nền Canvas vẽ bối cảnh một hòn đảo thời tiền sử xanh mướt, có cây cối rừng rậm rực rỡ phong cách hoạt hình mầm non.
- Khủng long mẹ vẽ bằng Emoji lớn (🦖/🦕) đứng cạnh một cái bảng đá hiển thị chữ cái viết Hoa (Ví dụ: "B") font chữ siêu to, nét đậm.
- Các quả trứng vẽ bằng hình bầu dục (graphics/arc) có màu sắc hoa văn chấm bi sặc sỡ, chứa chữ cái viết thường ở chính giữa.

### 4. YÊU CẦU ĐẦU RA CHO CODE
- Code viết hoàn toàn bằng React Functional Component với đầy đủ React Hooks (`useState`, `useEffect`, `useRef`).
- Đảm bảo viết đầy đủ hàm Cleanup xử lý xóa bỏ Event Listener trên Canvas khi component unmount để tối ưu bộ nhớ.
- Hỗ trợ mượt mà cả sự kiện Mouse (máy tính) và Touch (thiết bị cảm ứng như iPad/Tablet) để phù hợp với hành vi quẹt màn hình của trẻ nhỏ.
- Giao diện bao bọc ngoài dùng Tailwind CSS trẻ trung. Khi khủng long con hoàn thành việc đi bộ vẽ xong chữ, hiển thị một pop-up chúc mừng dễ thương (Ví dụ: "Bé giỏi quá! Khủng long con tìm được mẹ rồi! 🦖❤️👶") và tự động chuyển sang màn chơi mới sau 3 giây.