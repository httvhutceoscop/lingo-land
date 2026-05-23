Chuyển đổi ý tưởng game giáo dục tư duy logic "Thám Tử Nhí: Truy Tìm Dấu Vết" cho trẻ từ 6-10 tuổi thành một ứng dụng React hoàn chỉnh sử dụng HTML5 Canvas làm giao diện tương tác.

Hãy viết code sạch, chú thích rõ ràng, đóng gói toàn bộ logic trong một cấu trúc component duy nhất (ví dụ: KidDetectiveGame.jsx).

### 1. KIẾN TRÚC VÀ PHÂN CHIA VAI TRÒ
- ReactJS: Quản lý trạng thái câu đố (Dữ liệu gốc về chủ nhân, ngôi nhà, món ăn), danh sách các Manh mối (Clues) hiển thị cho bé đọc, trạng thái kiểm tra đáp án và màn hình Thắng/Thua.
- HTML5 Canvas: Vẽ khu vực Phố Sách/Khu Phố gồm các ngôi nhà đứng cạnh nhau. Xử lý logic kéo thả (Drag and Drop) các Emoji nhân vật và món ăn từ khay đạo cụ vào các vị trí trống (Slots) của từng ngôi nhà trên Canvas.

### 2. CORE LOGIC & CẤU TRÚC ĐỀ BÀI (DEDUCTIVE REASONING)
- Mỗi màn chơi sẽ xoay quanh một nhóm đối tượng gồm 3 thuộc tính (Nhà, Con vật, Món ăn yêu thích).
  Ví dụ Ma trận đáp án đúng (Ẩn đối với người chơi):
  + Nhà số 1 (Màu Đỏ): Chú Chó (🐶) - Thích ăn Xương (🦴)
  + Nhà số 2 (Màu Vàng): Chú Mèo (🐱) - Thích ăn Cá (🐟)
  + Nhà số 3 (Màu Xanh): Chú Thỏ (🐰) - Thích ăn Cà rốt (🥕)
- Hệ thống manh mối (Clues Generator): Xuất hiện dưới dạng text và icon trực quan trên React UI:
  1. "Chú Mèo (🐱) sống ở ngôi nhà ở chính giữa (Nhà số 2)." (Manh mối trực tiếp)
  2. "Ngôi nhà màu Đỏ (Nhà số 1) nằm ngay bên trái ngôi nhà của bạn thích ăn Cá (🐟)." (Manh mối định vị)
  3. "Chú Thỏ (🐰) cực kỳ ghét ăn Xương (🦴) và Cá (🐟)." (Manh mối loại trừ)
- Thuật toán kiểm tra kết quả (Validation): Khi bé bấm nút "PHÁ ÁN", hệ thống sẽ so sánh mảng vị trí nhân vật/món ăn mà bé đã thả trên Canvas với Ma trận đáp án đúng của hệ thống. Nếu trùng khớp 100% -> Thắng. Nếu sai -> Báo hiệu số vị trí chưa chính xác.

### 3. CƠ CHẾ INTERACTION (DRAG & DROP SLOTS TRÊN CANVAS)
- Trên Canvas vẽ 3 (hoặc 4) ngôi nhà xếp hàng ngang. Mỗi ngôi nhà có 2 vùng trống (Slots) hình chữ nhật đứt nét: Slot cho Chủ nhân (Con vật) và Slot cho Món ăn.
- Phía dưới Canvas có một Khay Đạo Cụ chứa các Emoji con vật và món ăn nằm lộn xộn.
- Bé nhấn giữ một Emoji từ Khay Đạo Cụ và kéo thả vào các Slots trên Canvas.
- Khi nhả chuột (mouseup/touchend):
  + Nếu Emoji nằm đè lên một Slot hợp lệ trên một ngôi nhà -> Thả Emoji cố định vào Slot đó (Nếu Slot đã có đồ cũ, đồ cũ tự động bay về Khay Đạo Cụ).
  + Nếu thả ra ngoài -> Emoji tự động quay về khay.
  + Bé có thể kéo một Emoji từ Slot của nhà vứt ngược ra ngoài để xóa.

### 4. THÔNG SỐ KỸ THUẬT & ĐỒ HỌA
- Kích thước Canvas: Tỷ lệ 16:9 (Ví dụ: 800x450 px).
- Đồ họa:
  + Vẽ nền khu phố có mây trắng, cây xanh mướt mờ.
  + Các ngôi nhà: Vẽ bằng nét hình khối cơ bản (thân nhà hình chữ nhật, mái nhà hình tam giác) tô các màu sắc tươi sáng tương ứng với đề bài (Đỏ 🟥, Vàng 🟨, Xanh Dương 🟦).
  + Đồ vật/Nhân vật: Dùng Emoji kích thước lớn (Vd: 🐶, 🐱, 🐰, 🦴, 🐟, 🥕) để vẽ trực tiếp lên tọa độ Slot.

### 5. HỆ THỐNG MÀN CHƠI (LEVELS CONFIG)
Thiết kế sẵn 3 Levels trong `LEVELS_DATA` tăng dần số lượng đối tượng và độ lắt léo của manh mối:
- Level 1 (Thám tử tập sự): 3 Ngôi nhà. Manh mối đơn giản, dễ suy luận loại trừ ngay lập tức.
- Level 2 (Thám tử tài ba): 3 Ngôi nhà nhưng các manh mối mang tính bắc cầu và định vị phức tạp hơn (Phải dùng tư duy "Nếu A ở đây thì B phải ở kia").
- Level 3 (Trưởng phòng thám tử): Mở rộng lên 4 Ngôi nhà (Thêm Nhà màu Tím 🟪, Chú Khỉ 🐵, Quả chuối 🍌), các manh mối đan cài đòi hỏi bé phải suy luận loại trừ qua nhiều bước.

### 6. YÊU CẦU ĐẦU RA CHO CODE
- Viết 100% bằng React Functional Component (Hooks: useState, useEffect, useRef).
- Code xử lý mượt mà sự kiện Mouse và Touch để chạy tốt trên thiết bị di động/máy tính bảng.
- Sử dụng Tailwind CSS để làm phần giao diện bọc ngoài hoành tráng, thiết kế danh sách Clues như một cuốn "Sổ tay thám tử" (Detective Notebook). Có nút "PHÁ ÁN", "XÓA HẾT MÀN", "GỢI Ý". Khi thắng cuộc, hiện hiệu ứng kính lúp phóng to kèm pháo hoa chúc mừng.