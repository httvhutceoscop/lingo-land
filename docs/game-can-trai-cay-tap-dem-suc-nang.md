Chuyển đổi ý tưởng game giáo dục mầm non "Cân Trái Cây: Tập Đếm Sức Nặng" cho trẻ từ 3-5 tuổi thành một ứng dụng React hoàn chỉnh sử dụng HTML5 Canvas để mô phỏng đòn cân vật lý.

Hãy viết code sạch, tối ưu thuật toán tính góc nghiêng lượng giác và kéo thả vật thể, cấu trúc component đóng gói hoàn chỉnh trong một file duy nhất (ví dụ: FruitScaleGame.jsx).

### 1. KIẾN TRÚC VÀ PHÂN CHIA VAI TRÒ
- ReactJS: Quản lý trạng thái màn chơi (Số mục tiêu cần đếm từ 1-10), số lượng trái cây hiện tại trên đĩa cân bên phải (currentCount), trạng thái cân (Nghiêng trái, Nghiêng phải, Thăng bằng) và hệ thống nút điều khiển UI to rõ.
- HTML5 Canvas: Xử lý vòng lặp đồ họa (Animation Loop). Vẽ trục cân cố định, vẽ đòn cân bập bềnh và 2 đĩa cân di chuyển lên xuống dựa trên góc nghiêng, quản lý mảng tọa độ các quả trái cây, xử lý sự kiện kéo thả (Drag and Drop) mượt mà.

### 2. CORE LOGIC & THUẬT TOÁN CÂN BẬP BÊNH (SCALE PHYSICS)
- Mỗi màn chơi (Level), đĩa cân bên TRÁI sẽ hiển thị một Ký tự số mục tiêu ngẫu nhiên từ 1 đến 10 (Ví dụ: Số 4) được vẽ to, đậm nét.
- Đĩa cân bên PHẢI là vùng chứa (Drop Zone) để bé kéo thả các quả trái cây vào. Loại trái cây thay đổi theo màn chơi (Ví dụ: 🍓 Quả dâu, 🍇 Quả nho, 🍊 Quả cam).
- Thuật toán tính góc xoay của đòn cân (Scale Rotation Angle):
  + Góc xoay (tính bằng radian hoặc độ) phụ thuộc vào chênh lệch giữa Số mục tiêu (Target) và Số trái cây hiện tại trên đĩa phải (Count).
  + Công thức góc: `angle = (Target - Count) * SENSITIVITY`. Giới hạn góc nghiêng tối đa là +15 độ (khi đĩa phải trống rỗng, cân nghiêng hẳn về bên trái) và -15 độ (khi đĩa phải quá nặng/quá nhiều trái cây).
  + Khi đòn cân xoay góc `angle`, tọa độ tâm của 2 đĩa cân (Trái/Phải) phải được tính toán lại bằng công thức lượng giác (Sin/Cos) dựa trên điểm neo (Pivot) cố định ở giữa đòn cân. Đĩa cân phải di chuyển tịnh tiến lên xuống đồng bộ với thanh đòn nhưng luôn giữ phương thẳng đứng.

### 3. CƠ CHẾ KÉO THẢ VÀ SNAPPING VẬT THỂ
- Phía dưới Canvas có một Khay chứa vô hạn các quả trái cây (Emoji 🍓, 🍇 hoặc 🍊).
- Bé nhấn giữ một quả trái cây từ khay, kéo và thả vào đĩa cân bên PHẢI.
- Logic khi nhả chuột (`mouseup` / `touchend`):
  + Nếu tọa độ thả nằm trong phạm vi (Hitbox) của đĩa cân bên PHẢI -> Quả trái cây được thêm vào mảng `placedFruits`. Tọa độ `(x, y)` của quả trái cây đó sẽ dính chặt (Snap) tương đối theo tọa độ chuyển động của đĩa cân phải (để khi đĩa cân đi xuống, trái cây đi xuống theo). Biến `currentCount` tăng lên 1.
  + Nếu thả ra ngoài đĩa cân -> Quả trái cây tự động bay mượt mà hoặc rơi tự do về lại khay chứa dưới đáy.
  + Bé có thể bốc một quả trái cây từ trên đĩa cân vứt ra ngoài để xóa (giảm `currentCount` đi 1), đòn cân sẽ tự động nghiêng ngược trở lại.

### 4. ĐIỀU KIỆN THẮNG & ĐỒ HỌA MẦM NON
- Khi `currentCount === targetCount` -> Góc xoay của đòn cân bằng 0 (Cân thăng bằng hoàn hảo). Chạy một đoạn nhạc vui tai, hiện ngôi sao lấp lánh quanh đĩa cân. Hệ thống giữ trạng thái thăng bằng trong 2.5 giây rồi tự động đổi sang số mục tiêu mới.
- Không áp dụng tính điểm âm, không có Game Over để phù hợp tâm lý trẻ 3-5 tuổi.
- Kích thước Canvas: Cố định 800x450 px. Nền Canvas vẽ màu pastel tươi sáng. Thanh đòn cân và trục cân vẽ bằng các nét màu gỗ hoặc màu vàng đồng thân thiện.

### 5. YÊU CẦU ĐẦU RA CHO CODE
- Code viết hoàn toàn bằng React Functional Component với đầy đủ các React Hooks (`useState`, `useEffect`, `useRef`).
- Đảm bảo viết đầy đủ hàm Cleanup xử lý xóa bỏ Event Listener trên Canvas khi component unmount để tránh tràn bộ nhớ.
- Hỗ trợ mượt mà cả sự kiện Mouse và Touch (chuột và quẹt màn hình iPad). Giao diện bao bọc ngoài dùng Tailwind CSS với các nút bấm kích thước lớn, font chữ số hiển thị trên đĩa cân phải là font Serif hoặc Sans-serif siêu to, dễ nhìn.