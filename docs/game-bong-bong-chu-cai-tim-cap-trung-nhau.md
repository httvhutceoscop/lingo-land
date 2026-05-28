Chuyển đổi ý tưởng game giáo dục mầm non "Bong Bóng Chữ Cái: Tìm Cặp Trùng Nhau" cho trẻ từ 3-5 tuổi thành một ứng dụng React hoàn chỉnh sử dụng HTML5 Canvas để render hoạt ảnh.

Hãy viết code sạch, tối ưu bộ nhớ khi sinh vật thể liên tục, cấu trúc component đóng gói hoàn chỉnh trong một file duy nhất (ví dụ: AlphabetBubblesGame.jsx).

### 1. KIẾN TRÚC VÀ PHÂN CHIA VAI TRÒ
- ReactJS: Quản lý bảng chữ cái mục tiêu hiện tại (Target Letter - ví dụ: chữ "A"), điểm số, chọn chủ đề (Chữ hoa hoặc Chữ thường) và hệ thống nút điều khiển UI kích thước lớn cho trẻ mầm non.
- HTML5 Canvas: Vận hành vòng lặp game (Game Loop qua requestAnimationFrame). Vẽ chú voi (hoặc chú cá) dễ thương đang thổi bong bóng, quản lý mảng dữ liệu các bong bóng bay từ dưới lên, và xử lý hiệu ứng nổ bong bóng kèm các hạt màu sắc khi bé click trúng.

### 2. CORE LOGIC & QUẢN LÝ VẬT THỂ (BUBBLE ENGINE)
- Hệ thống React chọn ngẫu nhiên một Chữ cái Mục tiêu (Target Letter) và hiển thị thật to ở góc màn hình (Ví dụ: "Bé hãy tìm chữ: B").
- Mỗi bong bóng trên Canvas là một Object trong mảng `bubbles`: 
  `{ id, x, y, radius, letter, speedX, speedY, color, opacity }`
- Logic sinh bong bóng (Spawning): Cứ sau khoảng 1.2 đến 1.8 giây, một bong bóng mới sẽ xuất hiện ở phía cạnh dưới Canvas và bay chậm rãi lên trên. 
  + Chữ cái bên trong bong bóng (`letter`) sẽ được chọn ngẫu nhiên: 40% tỷ lệ là Chữ cái Mục tiêu (Đúng), 60% là các chữ cái khác trong bảng chữ cái (Sai/Nhiễu).
- Logic dọn dẹp bộ nhớ: Khi một bong bóng bay vượt quá cạnh trên của Canvas (`y + radius < 0`), hệ thống phải tự động xóa Object đó ra khỏi mảng `bubbles` để tránh làm chậm game.

### 3. CƠ CHẾ TƯƠNG TÁC CHỌC VỠ BONG BÓNG (CLICK/TAP DETECTION)
- Trò chơi không áp dụng tính điểm âm hay phạt khi bấm sai để tránh làm trẻ 3-5 tuổi nản lòng.
- Khi người chơi click chuột hoặc chạm tay (touchstart) vào Canvas:
  + Lấy tọa độ `(mouseX, mouseY)`.
  + Duyệt qua mảng `bubbles`. Sử dụng thuật toán tính khoảng cách (Distance Formula) từ tọa độ click đến tâm bong bóng: `if (distance < radius)`.
  + Nếu CLICK TRÚNG: Kích hoạt trạng thái nổ của bong bóng (Biến mất ngay lập tức và sinh ra 10-15 hạt bụi màu sắc - Particles - bay tỏa ra xung quanh).
  + Kiểm tra tính đúng đắn của chữ cái bên trong bong bóng bị chọc vỡ:
    * Nếu chữ cái bên trong TRÙNG với Chữ cái Mục tiêu -> Phát tín hiệu ra React để cộng 10 điểm. Nếu bé thu thập đủ 3 hoặc 5 chữ cái giống nhau, React sẽ đổi sang một Chữ cái Mục tiêu mới.
    * Nếu chữ cái bên trong KHÔNG TRÙNG -> Bong bóng vẫn nổ mượt mà nhưng không được cộng điểm (không phạt tim, không trừ điểm).

### 4. THÔNG SỐ ĐỒ HỌA & UX CHO TRẺ MẦM NON
- Kích thước Canvas: Cố định tỷ lệ 16:9 (Ví dụ: 800x450 px). Nền Canvas màu bầu trời xanh tươi sáng có mây trắng trôi nhẹ.
- Đồ họa Bong bóng: Vẽ bằng lệnh `ctx.arc`, sử dụng màu sắc dạng Gradient mờ (Radial Gradient) để tạo hiệu ứng bong bóng xà phòng chân thực, óng ánh. Chữ cái bên trong vẽ font Sans-serif, size to, đậm và nằm chính giữa tâm vòng tròn.
- Ở góc dưới Canvas, vẽ một chú Voi con (emoji 🐘) hoặc chú Cá voi (emoji 🐳) ngay tại vị trí sinh ra bong bóng để tạo cảm giác con vật đang thổi ra bong bóng.

### 5. YÊU CẦU ĐẦU RA CHO CODE
- Code viết hoàn toàn bằng React Functional Component với đầy đủ React Hooks (`useState`, `useEffect`, `useRef`).
- Xử lý mượt mà, đồng thời cả sự kiện Mouse và Touch để các bé quẹt/gõ trên iPad không bị trượt.
- Đóng gói giao diện bằng Tailwind CSS rực rỡ, trực quan. Khi bé hoàn thành mục tiêu tìm chữ, hiển thị một pop-up chúc mừng ngắn gọn bằng các từ ngữ cổ vũ (Ví dụ: "Bé giỏi quá! 🎉", "Tuyệt vời!🌟") trước khi qua chữ cái mới.