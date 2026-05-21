Chuyển đổi ý tưởng game giáo dục tư duy logic "Kỹ Sư Ánh Sáng" cho trẻ từ 8-10 tuổi thành một ứng dụng React hoàn chỉnh sử dụng HTML5 Canvas để mô phỏng tia laser.

Hãy viết code sạch, tối ưu thuật toán bắn tia (Raycasting) và phản xạ gương, cấu trúc component đóng gói hoàn chỉnh (ví dụ: LightEngineerGame.jsx).

### 1. KIẾN TRÚC VÀ PHÂN CHIA VAI TRÒ
- ReactJS: Quản lý trạng thái màn chơi (Level), số lượng gương khả dụng trong túi đồ (Inventory), trạng thái bật/tắt nguồn laser, điểm số và màn hình Thắng/Thua.
- HTML5 Canvas: Xử lý vòng lặp vẽ (Animation Loop). Vẽ nguồn phát laser, mục tiêu, các tấm gương, xử lý thao tác kéo thả và click xoay gương của người chơi, đồng thời tính toán đường đi của tia laser theo thời gian thực (Real-time Raytracing).

### 2. CORE LOGIC & THUẬT TOÁN BẮN TIA (RAYCASTING + REFLECTION)
- Bản đồ Canvas chứa:
  + Nguồn phát (Laser Source): Cố định, có tọa độ (x, y) và một vector hướng phát ban đầu.
  + Mục tiêu (Target/Gem): Là một vùng hình tròn cố định có tọa độ (x, y) và bán kính (radius).
  + Gương (Mirrors): Các đoạn thẳng có độ dài cố định, có tâm (x, y) và góc xoay (angle).
- Thuật toán tính tia sáng (Hàm traceLaser):
  + Xuất phát từ nguồn phát, tia sáng đi theo một đường thẳng.
  + Duyệt qua danh sách tất cả các gương trên Canvas để tìm điểm giao nhau (Intersection Point) gần nhất giữa đường thẳng tia sáng và đoạn thẳng của gương.
  + Nếu tia sáng chạm vào một gương: Tính toán Vector pháp tuyến (Normal vector) của gương tại điểm chạm. Sau đó, tính toán Vector phản xạ mới theo công thức vật lý phẳng: R = I - 2 * (I · N) * N (với I là vector tới, N là pháp tuyến). Tia sáng sẽ đổi hướng và tiếp tục hành trình từ điểm chạm đó.
  + Giới hạn số lần phản xạ tối đa (Max Bounces = 5 hoặc 6) để tránh vòng lặp vô hạn nếu 2 gương đặt đối diện nhau.
  + Nếu trên đường đi (hoặc tại điểm cuối), tia laser cắt qua (hoặc chạm vào) vùng hình tròn của Mục tiêu (Target) -> Kích hoạt trạng thái Thắng (Level Cleared).

### 3. CƠ CHẾ INTERACTION (TƯƠNG TÁC TRÊN CANVAS)
- Người chơi có một khay chứa các tấm gương bằng React UI ở bên cạnh. Bé có thể kéo (Drag) gương thả vào các vị trí trống trên Canvas.
- Khi một tấm gương đã nằm trên Canvas:
  + Bé có thể nhấn giữ và kéo gương để thay đổi vị trí (x, y).
  + Bé có thể click chuột (hoặc chạm) vào gương để xoay góc của nó (mỗi lần click xoay thêm 15 độ hoặc 45 độ tùy cấu hình) để điều hướng tia sáng.
  + Có nút "BẮN LASER" bằng React UI. Khi bấm nút, tia sáng mới thực sự được vẽ và tính toán xem có trúng đích hay không.

### 4. THÔNG SỐ KỸ THUẬT & ĐỒ HỌA
- Kích thước Canvas: Tỷ lệ 16:9 (Ví dụ: 800x450 px).
- Đồ họa:
  + Nền Canvas màu tối (Dark Navy hoặc Đen) để làm nổi bật tia laser.
  + Tia laser: Vẽ bằng nét thẳng (`ctx.lineTo`) màu Đỏ Neon hoặc Xanh Neon phát sáng (`ctx.shadowBlur = 10`).
  + Gương: Vẽ bằng nét thẳng dày màu xanh bạc, có hai đầu mút rõ ràng.
  + Sử dụng Emoji để trang trí nhanh: Nguồn phát (🔦 hoặc 🗼), Mục tiêu (💎 hoặc 🎯).

### 5. HỆ THỐNG MÀN CHƠI (LEVELS CONFIG)
Thiết kế sẵn 3 màn chơi trong `LEVELS_DATA`:
- Level 1 (Dễ): Người chơi được cấp 1 tấm gương. Mục tiêu nằm chếch 90 độ so với nguồn phát. Bé chỉ cần đặt gương ở góc phòng và xoay góc 45 độ để bẻ hướng tia sáng trúng đích.
- Level 2 (Trung bình): Mục tiêu bị che khuất bởi một khối đá cản (Vật cản tĩnh không phản xạ). Người chơi cần phối hợp dùng 2 tấm gương để đưa tia sáng đi đường vòng né vật cản.
- Level 3 (Khó): Mục tiêu nằm ở vị trí lắt léo, cần dùng tới 3 tấm gương phản xạ liên tiếp qua các khe hẹp để chạm tới viên ngọc.

### 6. YÊU CẦU ĐẦU RA CHO CODE
- Viết hoàn toàn bằng React Functional Component với đầy đủ các hook cần thiết.
- Hàm tính toán va chạm đoạn thẳng (Line-Line Intersection) và phản xạ vector phải được viết chính xác toán học, xử lý mượt mà không gây đơ trình duyệt.
- Thiết kế giao diện bọc ngoài hiện đại bằng Tailwind CSS, tạo cảm giác như một phòng thí nghiệm công nghệ cao cho bé.