Chuyển đổi ý tưởng game giáo dục tư duy logic "Cân Bằng Sinh Thái" cho trẻ từ 5-10 tuổi thành một ứng dụng React hoàn chỉnh sử dụng HTML5 Canvas.

Hãy viết code sạch, chú thích rõ ràng, đóng gói toàn bộ logic trong một cấu trúc component duy nhất (ví dụ: EcoBalanceGame.jsx).

### 1. KIẾN TRÚC VÀ PHÂN CHIA VAI TRÒ
- ReactJS: Quản lý trạng thái màn chơi (Level), trạng thái câu đố (Dữ liệu quy đổi khối lượng), điểm số, số mạng (máu), và các nút điều khiển UI (Bấm "KIỂM TRA", "CÀI LẠI").
- HTML5 Canvas: Xử lý vòng lặp game (Game Loop bằng requestAnimationFrame). Vẽ đòn cân bập bênh (Scale Beam) có khả năng xoay góc (Rotate) dựa trên chênh lệch trọng lượng, vẽ các khay chứa, xử lý sự kiện kéo thả (Drag and Drop) các con vật từ thanh công cụ vào đĩa cân.

### 2. CORE LOGIC & THUẬT TOÁN CÂN BẰNG
- Mỗi con vật có một trọng lượng ẩn (Weight) do hệ thống quy định (Ví dụ: Chuột 🐭 = 1, Mèo 🐱 = 2, Chó 🐶 = 4). Trẻ không nhìn thấy số này mà phải tự suy luận.
- Đĩa cân bên TRÁI (Left Pan): Chứa các con vật cố định do hệ thống tạo sẵn làm đề bài (Ví dụ: Gồm 1 chú Chó 🐶 và 1 chú Chuột 🐭 -> Tổng trọng lượng = 5).
- Đĩa cân bên PHẢI (Right Pan): Là nơi để trẻ kéo các con vật từ khay chọn vào để tìm cách cân bằng với đĩa bên trái (Ví dụ: Trẻ cần kéo 2 chú Mèo 🐱 và 1 chú Chuột 🐭 -> Tổng trọng lượng = 5).
- Góc xoay của đòn cân (Scale Rotation Angle): Được tính bằng công thức nội suy dựa trên chênh lệch trọng lượng: 
  `angle = (Left_Weight - Right_Weight) * SENSITIVITY_FACTOR`. Cho phép góc xoay tối đa là +15 độ (nghiêng trái) hoặc -15 độ (nghiêng phải). Khi hai bên bằng nhau, góc xoay = 0 (cân thăng bằng).

### 3. CƠ CHẾ INTERACTION (DRAG & DROP TRÊN CANVAS)
- Phía dưới Canvas có một Khay chứa các con vật (Animal Inventory) đại diện cho các khối lượng khác nhau.
- Người chơi nhấn giữ (mousedown/touchstart) vào một con vật trong khay, di chuyển chuột (mousemove/touchmove) để kéo nó lên đĩa cân bên phải.
- Khi nhả chuột (mouseup/touchend):
  + Nếu tọa độ thả nằm trong phạm vi (Hitbox) của Đĩa cân bên PHẢI -> Thêm con vật đó vào mảng `rightPanItems`. Đòn cân tự động tính lại góc nghiêng mượt mà.
  + Nếu thả ra ngoài -> Con vật tự động bay ngược trở lại khay chứa.
  + Người chơi có thể kéo một con vật từ trên đĩa cân vứt ra ngoài để xóa nó khỏi đĩa.

### 4. THÔNG SỐ KỸ THUẬT & ĐỒ HỌA
- Kích thước Canvas: Tỷ lệ 16:9 (Ví dụ: 800x450 px).
- Đồ họa: Vẽ trục cân ở chính giữa, đòn cân nằm ngang. Hai đĩa cân được treo vào hai đầu đòn cân bằng các đường thẳng. Lưu ý: Khi đòn cân xoay góc `theta`, tọa độ tâm của hai đĩa cân phải được tính toán lại bằng công thức lượng giác (Sin/Cos) dựa trên điểm neo (Pivot) ở giữa đòn cân để đĩa cân di chuyển lên xuống đồng bộ nhưng luôn giữ phương thẳng đứng.
- Sử dụng các Emoji con vật to rõ: 🐭 (Chuột), 🐱 (Mèo), 🐶 (Chó), 🦊 (Cáo).

### 5. HỆ THỐNG CÂU ĐỐ (LEVELS CONFIG)
Thiết kế sẵn 3 màn chơi tăng dần độ khó trong `LEVELS_DATA`:
- Level 1 (Trực quan): 1 Mèo 🐱 = 2 Chuột 🐭. Đề bài bên trái cho 1 Mèo. Bé phải kéo 2 Chuột vào bên phải.
- Level 2 (Bắc cầu): 1 Chó 🐶 = 2 Mèo 🐱; 1 Mèo 🐱 = 2 Chuột 🐭. Đề bài bên trái cho 1 Chó. Bé phải tìm cách cân bằng bằng các con vật khác.
- Level 3 (Phức tạp): Đề bài bên trái trộn lẫn: 1 Chó 🐶 + 1 Mèo 🐱. Khay bên phải bắt buộc dùng sự kết hợp của nhiều loài khác nhau.

### 6. YÊU CẦU ĐẦU RA CHO CODE
- Code viết hoàn toàn bằng React Functional Component (Sử dụng `useState`, `useEffect`, `useRef`).
- Phần tính toán tọa độ xoay vật lý của đòn cân và đĩa cân phải chính xác, không bị giật lag.
- Đóng gói giao diện bằng Tailwind CSS hoặc CSS inline đẹp mắt, có nút "KIỂM TRA" để xác nhận kết quả sau khi xếp xong, màn hình chúc mừng rực rỡ khi hoàn thành màn chơi.