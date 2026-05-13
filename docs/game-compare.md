Hãy tạo một mini game web dành cho trẻ em từ 2 - 6 tuổi để học khái niệm:

- Nhỏ hơn (<)
- Lớn hơn (>)
- Bằng (=)

Phong cách game:
- Màu sắc tươi sáng, dễ thương, thân thiện với trẻ em
- Thiết kế đơn giản, ít chữ
- Responsive cho tablet và mobile
- Animation nhẹ nhàng khi chọn đúng/sai
- Có âm thanh vui nhộn cho đáp án đúng và âm thanh nhẹ cho đáp án sai

Gameplay:
- Hiển thị 2 nhóm đồ vật ở bên trái và bên phải
- Ở giữa là ô trống để bé chọn:
  - <
  - >
  - =
- Bé sẽ kéo thả hoặc tap vào ký hiệu đúng để điền vào ô giữa

Ví dụ:
- 1 quả táo bên trái và 2 quả táo bên phải → đáp án đúng là <
- 2 quả lê bên trái và 2 quả lê bên phải → đáp án đúng là =
- 3 quả cam bên trái và 2 quả cam bên phải → đáp án đúng là >

Yêu cầu chức năng:
1. Có nhiều câu hỏi random
2. Random:
   - loại trái cây
   - số lượng đồ vật
   - vị trí trái/phải
3. Số lượng object:
   - từ 1 → 5
4. Sau khi chọn:
   - đúng → hiện animation vui vẻ + âm thanh
   - sai → rung nhẹ + cho chọn lại
5. Có nút:
   - Next
   - Replay
6. Hiển thị điểm:
   - số câu đúng
   - tổng số câu
7. Sau khi hoàn thành:
   - hiện màn hình chúc mừng
   - có sticker/ngôi sao thưởng
8. Có chế độ:
   - Easy: 1-3 object
   - Medium: 1-5 object
9. Tự động đọc bằng giọng nói:
   - “Hãy chọn dấu đúng”
   - “Chính xác!”
   - “Thử lại nhé!”

Yêu cầu UI:
- Các object lớn, dễ nhìn
- Khoảng cách rộng để trẻ dễ bấm
- Font to, bo góc mềm mại
- Ký hiệu < > = hiển thị dạng card lớn

Danh sách object:
- Táo
- Cam
- Lê
- Chuối
- Dâu
- Kẹo
- Sao
- Bóng bay

Bonus:
- Có confetti khi hoàn thành
- Có hiệu ứng phát sáng khi chọn đúng
- Có mascot dễ thương hướng dẫn bé chơi
- Có background nhạc nhẹ

UX flow:
1. Màn hình welcome
2. Chọn level
3. Chơi game
4. Feedback đúng/sai
5. Tổng kết điểm
6. Chơi lại

Hãy:
- Viết toàn bộ source code hoàn chỉnh
- Có comment rõ ràng
- Tạo UI đẹp giống ứng dụng giáo dục trẻ em
- Sử dụng emoji hoặc SVG minh họa trái cây
- Không dùng asset trả phí
- Code clean và dễ maintain