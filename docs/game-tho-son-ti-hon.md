Chuyển đổi ý tưởng game giáo dục mầm non "Thợ Sơn Tí Hon: Tập Tô Chữ Và Số" cho trẻ từ 3-5 tuổi thành một ứng dụng React hoàn chỉnh sử dụng HTML5 Canvas.

Hãy viết code sạch, thuật toán nhận diện nét vẽ chính xác, cấu trúc component đóng gói hoàn chỉnh (ví dụ: TracerKidsGame.jsx).

### 1. KIẾN TRÚC VÀ PHÂN CHIA VAI TRÒ
- ReactJS: Quản lý bộ dữ liệu (Chữ cái từ A-Z, Số từ 1-10), lựa chọn ký tự hiện tại để bé tô, quản lý trạng thái hoàn thành (Khi bé tô xong 100% nét vẽ) và nút bấm UI to rõ để đổi chữ/số.
- HTML5 Canvas: Vẽ chữ cái/chữ số đích ở dạng font nét đứt mờ (Dotted/Outline Font) kích thước siêu to ở chính giữa màn hình. Lắng nghe sự kiện di chuyển chuột/touch để vẽ nét tô màu (Sơn vẽ) đè lên chữ mờ đó.

### 2. CORE LOGIC & THUẬT TOÁN TẬP TÔ (TRACING ALGORITHM)
Để đơn giản hóa cho Claude vẽ hình và kiểm tra nét vẽ của trẻ 3-5 tuổi mà không cần cài thư viện ngoài:
- Mỗi chữ/số được định nghĩa bằng một danh sách các điểm chốt (Points Array) tạo nên xương sống của nét chữ. 
  Ví dụ Số 1: `[{x: 350, y: 150}, {x: 400, y: 100}, {x: 400, y: 350}]`
- Trên Canvas, vẽ các điểm chốt này thành các hình tròn nhỏ màu vàng có đánh số thứ tự (1, 2, 3...) để hướng dẫn bé điểm bắt đầu và điểm kết thúc.
- Logic vẽ của bé:
  + Khi bé nhấn giữ chuột (`mousedown`/`touchstart`) trúng vào Điểm chốt đầu tiên -> Kích hoạt trạng thái `isDrawing = true`.
  + Khi bé di chuyển chuột (`mousemove`/`touchmove`): Vẽ một nét mực màu đậm (Vd: Màu Đỏ hoặc Xanh Dương) với kích thước cọ vẽ siêu to (`ctx.lineWidth = 25`) bo tròn đầu (`ctx.lineCap = 'round'`).
  + Hệ thống liên tục kiểm tra xem khoảng cách từ chuột của bé có đi qua tuần tự các Điểm chốt tiếp theo hay không. Nếu bé vẽ đi qua hết tất cả các điểm chốt theo đúng thứ tự -> Hệ thống tính là Hoàn thành chữ cái đó (Level Cleared).

### 3. THÔNG SỐ ĐỒ HỌA & UX CHO TRẺ MẦM NON
- Kích thước Canvas: Cố định 800x500 px. Nền Canvas vẽ màu bảng đen trường học hoặc màu kem tươi sáng, dịu mắt.
- Kính thước chữ/số đích: Sử dụng `ctx.font = "bold 280px 'Segoe UI', Arial"` vẽ dạng nét đứt hoặc màu xám nhạt để làm khung nền cho bé tô đè lên.
- Vẽ con trỏ chuột đặc biệt trên Canvas thành hình một chiếc Bút chì (✏️) hoặc Cọ sơn (🖌️) để bé thích thú dõi theo tay mình vẽ.

### 4. YÊU CẦU ĐẦU RA CHO CODE
- Viết 100% bằng React Functional Component với các hooks: `useState`, `useEffect`, `useRef`.
- Đảm bảo xử lý mượt mà cả sự kiện Mouse (máy tính) và Touch (iPad/Tablet) vì trẻ mầm non chủ yếu chơi game này bằng cách quẹt tay trên màn hình cảm ứng.
- Đóng gói giao diện bọc ngoài bằng Tailwind CSS rực rỡ, sử dụng các icon nút bấm siêu to. Khi bé hoàn thành nét vẽ, chạy hiệu ứng pháo hoa Canvas đầy màu sắc và tự động chuyển sang chữ cái/chữ số tiếp theo sau 2 giây.