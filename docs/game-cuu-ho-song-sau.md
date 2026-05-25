Chuyển đổi ý tưởng game giáo dục tư duy logic "Cứu Hộ Sông Sâu" cho trẻ từ 6-10 tuổi thành một ứng dụng React hoàn chỉnh sử dụng HTML5 Canvas để xử lý chuyển động.

Hãy viết code sạch, tối ưu hóa thuật toán kiểm tra trạng thái an toàn, đóng gói toàn bộ trong một file component duy nhất (ví dụ: RiverRescueGame.jsx).

### 1. KIẾN TRÚC VÀ PHÂN CHIA VAI TRÒ
- ReactJS: Quản lý cấp độ (Level), trạng thái hiện tại của các nhân vật (ở Bờ Trái, Trên Thuyền, hay Bờ Phải), vị trí của thuyền (Trái/Phải), kiểm tra điều kiện Thua cuộc (Game Over) sau mỗi lượt đi, và trạng thái Thắng cuộc khi đưa tất cả sang sông an toàn.
- HTML5 Canvas: Xử lý vòng lặp vẽ (Animation Loop). Vẽ dòng sông, hai bờ đất, các nhân vật dưới dạng Emoji và chuyển động tịnh tiến (Linear Interpolation - Lerp) của chiếc thuyền khi di chuyển qua lại giữa bờ trái và bờ phải.

### 2. CORE LOGIC & THUẬT TOÁN ĐỒ THỊ (STATE-SPACE VALIDATION)
- Mỗi nhân vật có một ID độc lập và các thuộc tính tương tác độc hại hoặc cần bảo vệ lẫn nhau.
- Trạng thái hệ thống (State) được định nghĩa bởi vị trí của thuyền (`boatPosition: 'left' | 'right'`) và danh sách nhân vật ở `leftBank`, `rightBank`, `onBoat`.
- Thuật toán kiểm tra an toàn (Safety Check): Mỗi khi thuyền di chuyển từ bờ này sang bờ kia, hệ thống phải kiểm tra bờ mà THUYỀN VỪA RỜI ĐI (không còn sự giám sát của Đội trưởng/Người lái thuyền).
  + Quy tắc vi phạm: Nếu ở bờ đó có cặp nhân vật xung đột (ví dụ: Sói 🐺 và Cừu 🐑) mà KHÔNG CÓ người kiểm soát -> Kích hoạt trạng thái Thua cuộc ngay lập tức và hiện lý do: "Sói đã ăn thịt Cừu mất rồi!".

### 3. CƠ CHẾ INTERACTION (CLICK TO BOARD / LÊN THUYỀN)
- Thiết kế tương tác đơn giản cho trẻ em: Thay vì kéo thả phức tạp, sử dụng cơ chế Click/Tap trực tiếp vào nhân vật.
- Nếu nhân vật đang ở Bờ Trái và thuyền đang ở Bờ Trái -> Click vào nhân vật sẽ đưa họ lên Thuyền (nếu thuyền còn chỗ trống). Click lần nữa khi họ trên thuyền sẽ đưa họ trở lại bờ.
- Thuyền chỉ có tối đa 2 chỗ ngồi (1 chỗ bắt buộc cho Người điều khiển ở Level khó, hoặc 1 slot cho Đội trưởng cứu hộ).
- Có một nút "CHO THUYỀN SANG SÔNG" (GO/SAIL) trên React UI. Nút này chỉ ấn được nếu trên thuyền có ít nhất một nhân vật có khả năng lái thuyền (theo quy định của Level).

### 4. THÔNG SỐ KỸ THUẬT & ĐỒ HỌA CANVAS ANIMATION
- Kích thước Canvas: Tỷ lệ 16:9 (Ví dụ: 800x450 px).
  + Tọa độ X từ 0 - 200: Bờ sông bên Trái.
  + Tọa độ X từ 200 - 600: Dòng sông xanh dương (có hiệu ứng sóng lượn nhẹ).
  + Tọa độ X từ 600 - 800: Bờ sông bên Phải.
- Khi người chơi bấm "SANG SÔNG", đặt trạng thái `isAnimating = true`. Tọa độ X của thuyền sẽ chạy mượt mà từ vị trí bờ cũ sang bờ mới bằng hàm Delta Time / Lerp trong vòng lặp `requestAnimationFrame`. Trong lúc đang chạy animation, khóa toàn bộ tương tác click của người chơi.
- Đồ họa:
  + Dòng sông vẽ bằng các dải màu xanh lam, có các nét đứt màu trắng chuyển động để tạo cảm giác nước chảy.
  + Nhân vật: Dùng các Emoji lớn (Vd: 👨‍🚒, 🐺, 🐑, 🥬) vẽ trực tiếp lên Canvas tại các tọa độ cố định của Bờ Trái, Bờ Phải hoặc trên Thuyền.

### 5. HỆ THỐNG MÀN CHƠI (LEVELS CONFIG)
Tạo sẵn 3 Levels kinh điển trong `LEVELS_DATA`:
- Level 1 (Tập sự - Sói, Cừu, Bắp cải): Thuyền chở được 2 đối tượng. Có Đội trưởng cứu hộ (👨‍🚒), Sói (🐺), Cừu (🐑), Bắp cải (🥬). Đội trưởng phải lái thuyền. Sói ăn Cừu, Cừu ăn Bắp cải nếu vắng Đội trưởng.
- Level 2 (Nâng cao - Gia đình nhà gấu): Có Gấu Mẹ, Gấu Con, Hổ Mẹ, Hổ Con. Thuyền chở được tối đa 2 con. Thú lớn mới biết lái thuyền. Thú con của loài này không được ở cạnh thú lớn của loài khác nếu không có mẹ nó bảo vệ.
- Level 3 (Kỷ lục - 3 Chú lính và 3 Kẻ trộm): Đưa 3 Chú lính (👮) và 3 Kẻ trộm (🦹) qua sông. Thuyền chở được tối đa 2 người, bất kỳ ai cũng biết lái thuyền. Tuy nhiên, ở bất kỳ bờ nào, nếu số lượng Kẻ trộm ĐÔNG HƠN số lượng Chú lính -> Chú lính sẽ bị bắt (Thua cuộc).

### 6. YÊU CẦU ĐẦU RA CHO CODE
- Viết 100% bằng React Functional Component với đầy đủ các React Hooks (`useState`, `useEffect`, `useRef`).
- Code xử lý mượt mà sự kiện Click/Touch trên cả máy tính lẫn iPad.
- Sử dụng Tailwind CSS để bọc giao diện bên ngoài. Có khu vực hiển thị "Quy tắc an toàn" của màn chơi hiện tại thật rõ ràng bằng các Bullet Points kèm icon. Có nút "ĐỔI MÀN", "CHƠI LẠI".
- Khi vi phạm quy tắc, hiển thị một Pop-up thông báo nguyên nhân trực quan (Ví dụ: hiện ảnh to hoặc text nhấp nháy: "🚨 BÁO ĐỘNG! Thỏ đã ăn mất Cà rốt!"). Khi hoàn thành, hiện pháo hoa chúc mừng: "Xuất sắc! Đội cứu hộ đã hoàn thành nhiệm vụ! 🚢".