Chuyển đổi ý tưởng game giáo dục "Đập Thú Toán Học: Thợ Săn Số Chẵn / Số Lẻ" cho trẻ từ 5-8 tuổi thành một ứng dụng React hoàn chỉnh, sử dụng Phaser 3 làm Engine xử lý game bên trong.

Hãy viết code sạch, cấu trúc component hiện đại, tách biệt rõ ràng giữa UI React và logic Phaser Scene. (Tên file gợi ý: WhackAMathPhaser.jsx)

### 1. KIẾN TRÚC KẾT HỢP REACTJS & PHASER 3
- ReactJS: Cung cấp một thẻ <div ref={gameRef} /> để Phaser inject canvas vào. React quản lý các trạng thái UI bọc ngoài như: Màn hình bắt đầu (Start Screen), Điểm số tổng, Số mạng (Máu), Câu hỏi toán học hiện tại (Ví dụ: "ĐẬP SỐ CHẴN" hoặc "ĐẬP SỐ LẺ"), và Màn hình Game Over.
- Phaser 3 Config: Tạo một instance `new Phaser.Game()` bên trong React `useEffect`. Sử dụng chế độ RENDER bằng Phaser.AUTO, kích thước cố định 800x500 px. Đóng gói logic game trong một Phaser.Scene duy nhất.
- Giao tiếp giữa React và Phaser: Sử dụng hệ thống Sự kiện của Phaser (`game.events.emit` và `game.events.on`) để đồng bộ dữ liệu (Ví dụ: Khi Phaser phát hiện bé đập trúng quái, nó sẽ phát một event gửi điểm số hoặc thông báo đúng/sai ra ngoài cho React cập nhật).

### 2. LOGIC GAMEPLAY & TRẠNG THÁI QUÁI (PHASER SCENE)
- Thiết lập một lưới 3x3 gồm 9 tọa độ làm chiếc hố (Holes). 
- Sử dụng Phaser.GameObjects.Group để quản lý 9 con thú (Moles). Mỗi con thú được tạo thành từ một Phaser Container bao gồm:
  + Một Sprite/Graphics đại diện cho con thú (Sử dụng emoji 🐹 hoặc hình vẽ đơn giản).
  + Một Phaser Text hiển thị con số ngẫu nhiên từ 1 đến 30 ngay trên đầu con thú.
- Mỗi con thú vận hành bằng một Máy trạng thái (State Machine): IDLE (dưới hố) -> RISING (trồi lên) -> STAYING (chờ đập) -> HIDING (thụt xuống). Sử dụng hệ thống `Phaser.Tweens` để xử lý chuyển động di chuyển trục Y tịnh tiến mượt mà giữa các trạng thái này.
- Logic sinh quái: Dùng `Phaser.Time.TimerEvent` để cứ sau mỗi khoảng thời gian (ví dụ: 1.5 giây), chọn ngẫu nhiên các hố đang IDLE để đẩy quái lên.

### 3. CƠ CHẾ TƯƠNG TÁC ĐẬP THÚ VÀ TÍNH TOÁN TOÁN HỌC
- Đăng ký sự kiện click/touch trên từng con thú (`moleContainer.setInteractive()`).
- Khi người chơi click vào một con thú đang nhô lên:
  + Kích hoạt hiệu ứng "Búa gõ" (Vẽ một chiếc búa 🔨 xoay góc nhẹ rồi đập xuống bằng Phaser Tween).
  + Chuyển trạng thái con thú sang 'HIT', chạy tween thu nhỏ hoặc biến mất nhanh.
  + Phaser lấy giá trị `numberValue` của con thú đó, gửi tín hiệu ra ngoài cho React để kiểm tra điều kiện Toán học hiện tại (Ví dụ: Yêu cầu là "SỐ CHẴN", nếu số của con thú là 12 -> Đúng -> React cộng điểm; nếu số là 7 -> Sai -> React trừ 1 mạng).

### 4. ĐỒ HỌA & HIỆU ỨNG (VISUAL EFFECTS)
- Thiết kế Phaser Scene: Nền màu xanh đồng cỏ, các chiếc hố vẽ bằng `graphics.fillEllipse` màu nâu đất mờ.
- Khi đập ĐÚNG: Phaser sinh hiệu ứng hạt phun trào (Phaser.GameObjects.Particles) với các hạt hình ngôi sao ⭐ bay ra tỏa khắp màn hình.
- Khi đập SAI: Hiển thị một dấu ❌ màu đỏ nhấp nháy tại vị trí hố.

### 5. YÊU CẦU ĐẦU RA CHO CODE
- Đoạn code phải import đầy đủ React, hooks (useState, useEffect, useRef) và thư viện phaser (`import Phaser from 'phaser'`).
- Đảm bảo xử lý dọn dẹp tài nguyên (Hàm Cleanup `game.destroy(true)`) trong useEffect return của React để tránh bị lỗi lặp lại nhiều instance của Phaser khi component re-render hoặc unmount.
- Giao diện bọc ngoài sử dụng Tailwind CSS chỉn chu, có bảng hướng dẫn luật chơi to rõ cho bé trước khi nhấn "BẮT ĐẦU". Tốc độ trồi sụt của quái (Duration của Tween) sẽ tự động nhanh dần dựa trên số điểm (Level) mà React truyền vào thông qua biến cấu hình toàn cục.