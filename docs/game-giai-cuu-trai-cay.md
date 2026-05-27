Chuyển đổi ý tưởng game giáo dục luyện phản xạ "Giải Cứu Trái Cây: Đập Sâu Bảo Vệ Vườn Lợn" cho trẻ từ 5-10 tuổi thành một ứng dụng React hoàn chỉnh, sử dụng Phaser 3 làm Engine xử lý game bên trong.

Hãy viết code sạch, tối ưu hiệu năng, cấu trúc component hiện đại, tách biệt rõ ràng giữa UI React và logic Phaser Scene. (Tên file gợi ý: FruitRescuePhaser.jsx)

### 1. KIẾN TRÚC KẾT HỢP REACTJS & PHASER 3
- ReactJS: Cung cấp container <div ref={gameRef} /> để Phaser render. Quản lý trạng thái UI tổng bọc ngoài gồm: Màn hình Start, Điểm số, Số Tim (Mạng chơi), Level hiện tại, và màn hình Game Over / Hoàn thành.
- Phaser 3 Config: Khởi tạo instance Phaser.Game trong React `useEffect`. Sử dụng chế độ RENDER tự động (Phaser.AUTO), kích thước 800x500 px. Đóng gói logic trò chơi trong một Phaser.Scene duy nhất.
- Giao tiếp Event: Phaser gửi tín hiệu ra ngoài cho React thông qua `game.events.emit` mỗi khi có va chạm hoặc sự kiện (Ví dụ: Đập đúng sâu -> React cộng điểm; Đập nhầm heo/trái cây -> React trừ mạng).

### 2. LOGIC ĐỐI TƯỢNG VÀ MÁY TRẠNG THÁI (PHASER SCENE)
- Thiết lập lưới 3x3 gồm 9 chiếc hố (Holes) cố định trên đồng cỏ.
- Tại mỗi chiếc hố, hệ thống sẽ ngẫu nhiên đẩy lên 1 trong 3 đối tượng (sử dụng Emoji kích thước lớn để vẽ trực tiếp lên Phaser Canvas):
  1. Sâu Ăn Lá (🐛): Đối tượng CẦN ĐẬP.
  2. Lợn Con Dễ Thương (🐷): Đối tượng CẤN BẢO VỆ (Cấm đập).
  3. Quả Táo Chín (🍎): Đối tượng CẦN BẢO VỆ (Cấm đập).
- Mỗi đối tượng vận hành bằng một Máy trạng thái (State Machine) thông qua Phaser Tweens: IDLE (ở dưới hố) -> RISING (trồi lên từ miệng hố) -> STAYING (đứng chờ một khoảng thời gian ngắn) -> HIDING (tự động thụt xuống nếu không bị tác động).

### 3. CƠ CHẾ TƯƠNG TÁC (INPUT POINTER & HIT DETECTION)
- Kích hoạt tính năng tương tác chuột/touch trên các đối tượng (`setInteractive()`).
- Khi bé click/tap vào một đối tượng đang nhô lên:
  + Phaser chạy hiệu ứng một chiếc Búa (🔨) xuất hiện gõ xuống tại tọa độ đó.
  + Chuyển trạng thái đối tượng sang 'HIT' và thu nhỏ biến mất nhanh.
  + Kiểm tra loại đối tượng (Type Check):
    * Nếu là Sâu (🐛): Phaser phát event báo cho React cộng 10 điểm. Sinh hiệu ứng nổ hạt (Phaser Particles) màu xanh lá vui mắt.
    * Nếu là Lợn (🐷) hoặc Táo (🍎): Phaser phát event báo cho React trừ 1 mạng chơi. Hiển thị dấu ❌ màu đỏ nhấp nháy và phát hiệu ứng con vật kêu "Úi!" (nếu có).
- Logic bỏ sót: Nếu Sâu (🐛) trồi lên rồi tự thụt xuống (`HIDING`) mà bé không kịp đập -> Hệ thống tính là bỏ sót quái, React sẽ trừ của bé 5 điểm để thúc đẩy tốc độ phản xạ.

### 4. ĐỒ HỌA & HIỆU ỨNG THỊ GIÁC (VISUALS)
- Nền Phaser Scene: Vẽ một khu vườn trái cây màu xanh mướt, có các đốm hoa nhỏ. Các chiếc hố vẽ bằng hình oval (graphics.fillEllipse) màu nâu.
- Để tạo cảm giác đối tượng chui từ dưới hố lên chứ không phải bay lơ lửng: Sử dụng tính năng `Geometry Mask` (Mặt nạ cắt hình) của Phaser 3 quanh khu vực cái hố. Đối tượng chỉ hiển thị khi phần tọa độ Y của nó vượt lên trên đường biên mặt nạ của miệng hố.

### 5. YÊU CẦU ĐẦU RA CHO CODE
- Viết 100% bằng React Functional Component kết hợp Phaser 3 độc lập (`import Phaser from 'phaser'`).
- Xử lý dọn dẹp tài nguyên (Hàm Cleanup `game.destroy(true)`) chuẩn xác trong hook useEffect để tránh rò rỉ bộ nhớ (Memory leak).
- Độ khó của game (Thời gian quái đứng chờ `STAYING` và tần suất sinh quái) phải tự động nhanh dần dựa trên số điểm/Level hiện tại mà React cập nhật xuống cho Phaser.
- Giao diện bao bọc ngoài dùng Tailwind CSS đồng bộ, hiển thị thanh máu bằng các Emoji Tim (❤️) sinh động, tạo cảm giác thân thiện, lôi cuốn cho trẻ em.