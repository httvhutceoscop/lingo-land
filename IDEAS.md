1. 🃏 Memory pairs — "Trò chơi trí nhớ"
Lưới 4×4 thẻ úp, lật tìm cặp EN ↔ emoji (hoặc EN ↔ VI). Cực kỳ hợp trẻ vì hoàn toàn trực quan, không cần đọc nhiều. Tradeoff: chỉ thêm 1 TestMode = 'memory' mới (~150 LOC), gần như không động cấu trúc khác. Quick win lớn nhất.

2. 🌟 Sticker album — "Sổ sưu tập"
Mỗi sub-group pass → unlock 1 sticker (emoji + tên). Một page mới hiển thị bộ sưu tập, ô trống cho sticker chưa mở. Trẻ con cực kỳ thích collect. Tradeoff: thêm 1 view + 1 key localStorage (lingoland_stickers). Không phá vỡ gì.

3. ⏱️ Time challenge — "Thử thách 60 giây"
Mode riêng: 60s, càng nhiều câu đúng càng nhiều ⭐. Khi hết giờ hiện kết quả + nút "Chơi lại". Drives replay loop kiểu Wordle. Tradeoff: 1 view mới, có thể stress với trẻ chậm — nên đặt làm extra mode ở Profile, không bắt buộc.

4. 🐣 Pet mascot — "Bạn đồng hành"
Virtual pet (trứng → nở → lớn 3-4 stage) tiến hoá theo số ngày streak / số sub-group pass. Hiển thị ở Header thay logo "L" khi unlock. Tradeoff: mạnh nhất về retention nhưng tốn UX — cần asset (có thể chỉ emoji stages 🥚🐣🐤🐔) + state mới + animation. Đầu tư trung bình, lời cao.

5. 🔁 Spaced repetition — "Ôn tập hàng ngày"
Mỗi ngày app gợi 1 deck 5-10 từ pick weighted theo "đã bao lâu chưa gặp". Chống quên thực sự (forgetting curve). Tradeoff: cần lưu { wordEn: lastSeenTimestamp } per từ — localStorage phình ~5-10KB; thuật toán SM-2 đơn giản nhưng phải đúng để có giá trị giáo dục.

6. 🔤 Hangman — "Đoán chữ"
Hiện emoji + VI + slot _ _ _ _, trẻ bấm bàn phím ảo đoán chữ cái. Tối đa 6 lần sai. Vừa học chính tả vừa căng thẳng vui. Tradeoff: 1 TestMode = 'hangman' mới, gọn. Có thể khó với trẻ < 6 tuổi chưa thuộc alphabet — chỉ gán cho sub-group "khó".

Ý kiến cá nhân: nếu chọn 2 cái làm trước, tôi đề xuất Memory pairs (vì rẻ nhất + tác động cao nhất với target trẻ em) + Sticker album (vì tạo extrinsic reward loop kết hợp tốt với 4 mini-game đang có). Pet mascot là "vũ khí hạng nặng" nhưng để giai đoạn sau khi base game đã polish.

Bạn muốn đào sâu cái nào, hay có hướng khác (vd nhạc, AR, kể chuyện) tôi chưa nghĩ tới?