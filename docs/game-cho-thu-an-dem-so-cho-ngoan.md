Chuyển đổi ý tưởng game giáo dục mầm non "Cho Thú Ăn: Đếm Số Cho Ngoan" cho trẻ từ 3-5 tuổi thành một ứng dụng React hoàn chỉnh sử dụng HTML5 Canvas.

Hãy viết code sạch, tối ưu hiệu năng kéo thả, cấu trúc component đóng gói hoàn chỉnh trong một file duy nhất (ví dụ: FeedTheAnimalsGame.jsx).

### 1. KIẾN TRÚC VÀ PHÂN CHIA VAI TRÒ
- ReactJS: Quản lý trạng thái màn chơi (Số mục tiêu cần đếm từ 1-10), số lượng thức ăn đã ăn hiện tại (currentCount), trạng thái con vật (Đang đói, Đang nhai, Đã no), và hệ thống nút bấm UI to rõ để đổi màn.
- HTML5 Canvas: Xử lý vòng lặp đồ họa (Animation Loop). Vẽ chú thú cưng ở giữa màn hình, vẽ rổ thức ăn, quản lý mảng tọa độ của từng món ăn, xử lý sự kiện kéo thả (Drag and Drop) mượt mà và hiệu ứng vật lý rơi rụng.

### 2. CORE LOGIC & CƠ CHẾ ĐẾM SỐ (COUNTING ALGORITHM)
- Mỗi màn chơi (Level), React sẽ chọn một số mục tiêu ngẫu nhiên từ 1 đến 10 (Ví dụ: Số 5) và một cặp loài vật - thức ăn tương ứng:
  + Khỉ (🐵) - Chuối (🍌)
  + Thỏ (🐰) - Cà rốt (🥕)
  + Gấu (🐻) - Mật ong (🍯)
- Trên Canvas hiển thị một Bong bóng hội thoại (Speech Bubble) cạnh chú thú, bên trong vẽ Ký tự số mục tiêu thật to (Ví dụ: "Hãy cho tớ ăn 5 quả chuối 🍌").
- Trong Rổ thức ăn ở đáy Canvas sẽ sinh ra một mảng gồm nhiều vật thể (Ví dụ: 12 quả chuối để bé tha hồ chọn). Mỗi vật thể có cấu trúc: `{ id, x, y, startX, startY, radius, isDragging, emoji }`.
- Logic va chạm và Đếm (Collision & Counting):
  + Khi bé kéo một quả chuối thả vào vùng miệng của chú thú (Vùng Hitbox hình tròn quanh đầu con vật):
    * Quả chuối đó biến mất khỏi Canvas (hoặc chạy hiệu ứng thu nhỏ vào miệng).
    * Biến `currentCount` tăng lên 1 (`currentCount += 1`).
    * Kích hoạt trạng thái chú thú đổi emoji sang Đang nhai (mồm há to hoặc híp mắt cười vui sướng 😋 hoặc 🤤) trong 0.8 giây, sau đó quay lại trạng thái chờ ăn.
  + Nếu bé thả quả chuối lơ lửng ở ngoài -> Quả chuối tự động rơi tự do (hoặc bay mượt mà) về lại vị trí cũ trong rổ thức ăn.

### 3. ĐIỀU KIỆN THẮNG (WIN CONDITION) & KHÔNG TRỪ ĐIỂM
- Không áp dụng tính điểm âm, không có thời gian đếm ngược, không có màn hình Game Over để tránh làm trẻ 3-5 tuổi bị áp lực hoặc nản lòng.
- Khi `currentCount === targetCount`: Chú thú chuyển sang trạng thái Đã no (Nhảy múa vui sướng, emoji đổi thành 🥰 hoặc 🥳). Bong bóng hội thoại hiện dấu tích xanh ✅. Sau đó 2.5 giây, hệ thống tự động chuyển sang số tiếp theo hoặc loài vật tiếp theo.

### 4. THÔNG SỐ KỸ THUẬT & XỬ LÝ SỰ KIỆN (CANVAS)
- Kích thước Canvas: Cố định tỷ lệ 16:9 (Ví dụ: 800x450 px).
- Đồ họa: Sử dụng các gam màu Pastel tươi sáng, nhẹ nhàng (Nền vàng nhạt hoặc xanh mint). Vẽ chú thú kích thước lớn ở trung tâm Canvas. Rổ thức ăn vẽ dạng hình hộp chữ nhật mờ ở góc dưới.
- Tương tác kéo thả: Bắt các sự kiện chuột (`mousedown`, `mousemove`, `mouseup`) và sự kiện cảm ứng (`touchstart`, `touchmove`, `touchend`). Khi bấm xuống, tính khoảng cách toán học để xem có trúng quả chuối nào không. Khi di chuyển, cập nhật `x, y` của quả chuối theo tay người dùng.

### 5. YÊU CẦU ĐẦU RA CHO CODE
- Code viết hoàn toàn bằng React Functional Component với đầy đủ React Hooks (`useState`, `useEffect`, `useRef`).
- Hàm dọn dẹp (Cleanup) bộ nhớ chuẩn xác khi unmount component (Xóa bỏ các Event Listener bọc ngoài Canvas).
- Đóng gói giao diện bằng Tailwind CSS rực rỡ, các font chữ hiển thị số đếm phải dùng font không chân (Sans-serif) siêu to, nét đậm. 
- Khi mỗi vật thể được nuốt gọn, hãy render một dòng chữ số đếm bay lên (Ví dụ: Bé thả quả thứ 3, hiện chữ "3" màu xanh lá bay lên rồi mờ dần) để giúp trẻ vừa nghe vừa nhìn thấy tiến trình tăng tiến của số đếm.