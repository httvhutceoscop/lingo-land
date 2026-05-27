Chuyển đổi ý tưởng game giáo dục ngôn ngữ "Vua Chính Tả: Đập Từ Đúng - Tha Từ Sai" cho trẻ từ 7-10 tuổi thành một ứng dụng React hoàn chỉnh, sử dụng Phaser 3 làm Engine xử lý game bên trong.

Hãy viết code sạch, tối ưu hiệu năng, cấu trúc component hiện đại, tách biệt rõ ràng giữa UI React và logic Phaser Scene. (Tên file gợi ý: SpellingKingPhaser.jsx)

### 1. KIẾN TRÚC KẾT HỢP REACTJS & PHASER 3
- ReactJS: Cung cấp container <div ref={gameRef} /> để Phaser inject Canvas vào. Quản lý trạng thái UI bọc ngoài gồm: Màn hình chọn chủ đề (Tiếng Việt l/n, ch/tr hoặc Tiếng Anh), Điểm số, Số mạng (Máu), Level, và Yêu cầu hiện tại của màn chơi (Ví dụ: "ĐẬP TỪ VIẾT SAI CHÍNH TẢ để sửa lỗi!").
- Phaser 3 Config: Khởi tạo instance Phaser.Game trong React `useEffect` với kích thước 800x500 px. Đóng gói logic trò chơi trong một Phaser.Scene duy nhất.
- Giao tiếp Event: Sử dụng hệ thống sự kiện của Phaser (`game.events.emit`) để gửi tín hiệu ra ngoài cho React cập nhật trạng thái khi bé đập trúng quái (Đúng từ sai -> Cộng điểm; Đập nhầm từ đúng -> Trừ mạng).

### 2. NGÂN HÀNG DỮ LIỆU TỪ VỰNG (VOCABULARY POOL)
Tạo một hằng số `SPELLING_DATA` ở đầu file chứa các cặp từ đúng/sai theo chủ đề để React truyền vào Phaser:
- Chủ đề L/N: `{ correct: "Lấp lánh", incorrect: "Nấp nánh" }`, `{ correct: "No nê", incorrect: "Lo lê" }`
- Chủ đề CH/TR: `{ correct: "Tròn trịa", incorrect: "Chòn chịa" }`, `{ correct: "Chong chóng", incorrect: "Trong chóng" }`
- Chủ đề Tiếng Anh: `{ correct: "Apple", incorrect: "Aple" }`, `{ correct: "Beautiful", incorrect: "Beautifull" }`

### 3. LOGIC ĐỐI TƯỢNG VÀ MÁY TRẠNG THÁI (PHASER SCENE)
- Thiết lập lưới 3x2 hoặc 3x3 gồm các chiếc hố cố định trên Canvas.
- Khi một con thú (Mole) chuẩn bị trồi lên, Phaser sẽ lấy ngẫu nhiên một từ trong gói dữ liệu hiện tại. Hệ thống sẽ quyết định con thú này mang từ ĐÚNG hay từ SAI (tỷ lệ 50/50).
- Mỗi đối tượng gồm: Một Sprite con thú (sử dụng Emoji 🐻 hoặc 🐹) và một `Phaser.GameObjects.Text` hiển thị từ vựng ngay trên đầu con thú. Text cần dùng font chữ to, rõ ràng, bo viền (stroke) để bé dễ đọc nhanh dưới áp lực thời gian.
- Vận hành bằng Phaser Tweens để xử lý chuyển động trục Y mượt mà: IDLE (dưới hố) -> RISING (trồi lên) -> STAYING (đứng chờ bé đọc) -> HIDING (tự động thụt xuống).

### 4. CƠ CHẾ TƯƠNG TÁC & HOẠT ẢNH (HIT DETECTION)
- Kích hoạt tính năng tương tác chuột/touch trên các con thú (`setInteractive()`).
- Khi bé click/tap vào một con thú đang nhô lên:
  + Chạy hiệu ứng một chiếc Búa (🔨) xuất hiện gõ xuống tại tọa độ đó bằng Phaser Tween.
  + Chuyển trạng thái con thú sang 'HIT', chạy hoạt ảnh biến mất nhanh.
  + Kiểm tra logic từ vựng (Word Validation):
    * Nếu bé đập trúng từ VIẾT SAI (Đúng yêu cầu giải cứu): Phaser báo cho React cộng 10 điểm. Sinh hiệu ứng nổ chữ, các hạt ngôi sao bay ra lấp lánh.
    * Nếu bé đập nhầm từ VIẾT ĐÚNG: Phaser báo cho React trừ 1 mạng (mất 1 tim). Hiển thị dấu ❌ nhấp nháy đỏ trên màn hình.
- Logic bỏ sót: Nếu con thú mang từ VIẾT SAI trồi lên rồi tự thụt xuống mà bé bỏ sót không đập -> Không trừ mạng nhưng không được cộng điểm.

### 5. YÊU CẦU ĐẦU RA CHO CODE
- Viết bằng React Functional Component kết hợp Phaser 3 độc lập (`import Phaser from 'phaser'`).
- Xử lý dọn dẹp tài nguyên triệt để bằng hàm `game.destroy(true)` trong return của `useEffect` để tránh lỗi tạo nhiều Canvas khi re-render.
- Toàn bộ giao diện bao bọc ngoài dùng Tailwind CSS. Thanh máu hiển thị bằng các Emoji Tim (❤️). Tốc độ trồi sụt của thú và độ dài của từ vựng sẽ tăng tiến độ khó dần theo điểm số (Level) của người chơi.