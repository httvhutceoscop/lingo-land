# Claude Code Prompt - Memory Card

## Mục tiêu

Xây dựng game giáo dục "Memory Card" dành cho trẻ em từ 4-8 tuổi.

Mục tiêu giáo dục:

* Rèn luyện trí nhớ ngắn hạn (Short-term Memory)
* Tăng khả năng tập trung
* Phát triển kỹ năng quan sát
* Tăng tốc độ phản xạ nhận diện hình ảnh
* Mở rộng vốn từ vựng
* Học nhận biết động vật, đồ vật, chữ cái, số đếm và màu sắc
* Phát triển tư duy ghi nhớ thông qua trò chơi

Ứng dụng phải được phát triển bằng:

* ReactJS
* TypeScript
* React Konva (ưu tiên)
* TailwindCSS

Game phải hoạt động tốt trên:

* Mobile
* Tablet
* Desktop

Ưu tiên tối ưu cho màn hình cảm ứng.

---

# 1. KIẾN TRÚC VÀ PHÂN CHIA TRÁCH NHIỆM

## ReactJS

React quản lý:

* Game State
* Current Level
* Current Theme
* Score
* Timer
* Moves
* Combo
* Stars
* Achievement
* Sticker Collection
* Daily Challenge
* Parent Statistics

Sử dụng:

* useState
* useReducer
* useEffect
* useMemo
* useCallback
* Custom Hooks

---

## Canvas Layer (React Konva)

Canvas xử lý:

* Animation lật thẻ
* Hiệu ứng ghép cặp
* Particle Effect
* Confetti Effect
* Combo Effect
* Reward Animation
* Level Transition
* Card Shuffle Animation

Không sử dụng Canvas API thuần nếu không cần thiết.

---

# 2. Ý TƯỞNG GAME

## Bối cảnh

Bé tham gia vào Học Viện Trí Nhớ.

Nhiệm vụ:

Lật các thẻ bài và tìm đúng các cặp giống nhau.

Ví dụ:

🐱 🐶 🍎 🐱 🍎 🐶

Bé cần tìm:

🐱 + 🐱

🍎 + 🍎

🐶 + 🐶

---

# 3. GAMEPLAY

## Bước 1

Hiển thị tất cả thẻ bài trong 5 giây.

---

## Bước 2

Úp toàn bộ thẻ bài.

---

## Bước 3

Bé chọn 2 thẻ.

---

## Bước 4

Nếu giống nhau:

✔ Giữ mở

---

Nếu khác nhau:

✘ Úp lại

---

## Bước 5

Tìm hết tất cả cặp.

---

## Bước 6

Nhận thưởng và sang màn tiếp theo.

---

# 4. CHẾ ĐỘ CHƠI

## Mode 1 - Động Vật

Ghép:

* Mèo
* Chó
* Thỏ
* Gấu
* Voi

---

## Mode 2 - Đồ Vật

Ghép:

* Bút
* Sách
* Ghế
* Bàn

---

## Mode 3 - Chữ Cái

Ghép:

* A
* B
* C
* D

---

## Mode 4 - Số Đếm

Ghép:

* 1
* 2
* 3
* 4

---

## Mode 5 - Màu Sắc

Ghép:

* Đỏ
* Vàng
* Xanh
* Tím

---

## Mode 6 - Hình Học

Ghép:

* Tròn
* Vuông
* Tam giác
* Chữ nhật

---

## Mode 7 - Mixed Challenge

Trộn tất cả chủ đề.

---

# 5. LEVEL SYSTEM

## Level 1

2 x 2

4 thẻ

---

## Level 2

3 x 2

6 thẻ

---

## Level 3

4 x 2

8 thẻ

---

## Level 4

4 x 3

12 thẻ

---

## Level 5

4 x 4

16 thẻ

---

## Level 6

5 x 4

20 thẻ

---

## Level 7

6 x 4

24 thẻ

---

## Level 8+

Adaptive Difficulty

---

# 6. CARD SYSTEM

## Card

```typescript
interface Card {
  id: string;
  pairId: string;
  type: string;
  value: string;
  image?: string;
  flipped: boolean;
  matched: boolean;
}
```

---

## Theme

```typescript
interface Theme {
  id: string;
  name: string;
  cards: Card[];
}
```

---

# 7. GAMEPLAY RULES

## Điểm

Ghép đúng:

+100 điểm

---

Ghép nhanh:

+50 điểm

---

Combo

3 cặp liên tiếp:

+200 điểm

---

5 cặp liên tiếp:

+500 điểm

---

# 8. TIMER

Easy

Không giới hạn

---

Normal

120 giây

---

Hard

90 giây

---

Challenge

60 giây

---

# 9. HINT SYSTEM

Mỗi màn:

3 Hint

---

Hint 1

Mở 1 cặp đúng trong 2 giây.

---

Hint 2

Highlight vị trí cặp đúng.

---

Hint 3

Hiện toàn bộ thẻ trong 3 giây.

---

# 10. ĐỒ HỌA

## Theme

Học viện trí nhớ kỳ diệu.

---

## Màu sắc

* Sky Blue
* Mint Green
* Soft Yellow
* Pastel Pink
* Pastel Purple

---

## Font

Ưu tiên:

* Baloo 2
* Nunito

---

# 11. HIỆU ỨNG

## Ghép đúng

* Sparkle
* Star Burst
* Glow Effect

---

## Combo

* Lightning Effect
* Combo Text Animation

---

## Hoàn thành màn

* Confetti
* Firework
* Treasure Reward

---

## Ghép sai

* Shake Effect
* Fade Animation

---

# 12. AUDIO

Sử dụng:

* Web Audio API

---

Âm thanh:

* Flip Card
* Match Success
* Match Failed
* Combo
* Level Complete
* Reward

---

## Voice

Sử dụng Web Speech API

Ví dụ:

Ghép thành công:

🐱

Đọc:

"Mèo"

---

# 13. ACHIEVEMENT SYSTEM

## Trí Nhớ Tốt

Ghép đúng 50 cặp.

---

## Siêu Tốc

Hoàn thành màn dưới 30 giây.

---

## Combo Master

Đạt combo 10.

---

## Bậc Thầy Trí Nhớ

Hoàn thành toàn bộ game.

---

# 14. STICKER COLLECTION

Mở khóa:

* 🐱 Mèo vàng
* 🐶 Chó vàng
* ⭐ Ngôi sao trí nhớ
* 🏆 Cúp vàng
* 🧠 Bộ não siêu cấp

Cho phép xem bộ sưu tập.

---

# 15. DAILY CHALLENGE

Tạo thử thách mỗi ngày.

Ví dụ:

* Hoàn thành 3 màn
* Đạt 1000 điểm
* Ghép đúng 20 cặp

---

Nhận:

* Sticker
* Coin
* Badge

---

# 16. PARENT DASHBOARD

Hiển thị:

* Tổng thời gian chơi
* Tỷ lệ ghi nhớ
* Chủ đề yêu thích
* Điểm cao nhất
* Tiến bộ theo tuần

Lưu bằng Local Storage.

---

# 17. ADAPTIVE LEARNING

Tự động điều chỉnh độ khó.

Nếu:

Tỷ lệ đúng > 90%

→ Tăng số lượng thẻ.

---

Nếu:

Tỷ lệ đúng < 60%

→ Giảm số lượng thẻ.

---

# 18. RESPONSIVE

Hỗ trợ:

* Mobile Portrait
* Mobile Landscape
* Tablet
* Desktop

Tự động scale:

* Card
* Grid
* Canvas
* Touch Area

---

# 19. CẤU TRÚC SOURCE CODE

```text
src/
├── screens/
│   ├── StartScreen.tsx
│   ├── ThemeSelectScreen.tsx
│   ├── PlayingScreen.tsx
│   ├── ResultScreen.tsx
│   └── ParentDashboard.tsx
│
├── components/
│   ├── MemoryBoard.tsx
│   ├── MemoryCard.tsx
│   ├── ProgressBar.tsx
│   ├── ScoreBoard.tsx
│   ├── AchievementPanel.tsx
│   └── StickerGallery.tsx
│
├── canvas/
│   ├── CardCanvas.tsx
│   ├── FlipLayer.tsx
│   ├── ParticleLayer.tsx
│   ├── ConfettiLayer.tsx
│   └── ComboLayer.tsx
│
├── game/
│   ├── CardEngine.ts
│   ├── MatchEngine.ts
│   ├── AdaptiveEngine.ts
│   ├── RewardEngine.ts
│   └── AchievementEngine.ts
│
├── hooks/
│   ├── useMemoryGame.ts
│   ├── useTimer.ts
│   ├── useCombo.ts
│   ├── useProgress.ts
│   └── useAchievements.ts
│
├── services/
│   ├── AudioManager.ts
│   ├── StorageService.ts
│   ├── StatisticsService.ts
│   └── RewardManager.ts
│
├── data/
│   ├── animals.ts
│   ├── letters.ts
│   ├── numbers.ts
│   ├── colors.ts
│   ├── shapes.ts
│   ├── themes.ts
│   └── achievements.ts
│
├── config/
│   └── GameConfig.ts
│
├── types/
│   └── game.ts
│
└── utils/
    ├── shuffle.ts
    ├── scoring.ts
    ├── validation.ts
    └── adaptive.ts
```

---

# 20. DỮ LIỆU MẪU

Sinh sẵn:

* 6 chủ đề học tập
* 500 thẻ dữ liệu
* 100 level
* 20 achievement
* 50 sticker

Không cần backend.

---

# 21. TÍNH NĂNG NÂNG CAO (BONUS)

## Multiplayer Local

2 người chơi trên cùng thiết bị.

---

## Tournament Mode

Thi đấu điểm cao.

---

## Custom Theme Builder

Cho phép phụ huynh thêm:

* Hình ảnh riêng
* Từ vựng riêng

---

## Offline First

Toàn bộ game hoạt động offline.

---

# 22. YÊU CẦU CHẤT LƯỢNG CODE

* TypeScript Strict Mode
* Functional Components
* Hooks Only
* Không memory leak
* Cleanup animation đúng chuẩn
* Responsive
* Hỗ trợ Touch Events
* Không phụ thuộc backend
* Dễ mở rộng dữ liệu
* Dễ mở rộng chủ đề
* Dễ mở rộng chế độ chơi

---

# 23. YÊU CẦU CUỐI CÙNG

Sinh toàn bộ source code hoàn chỉnh.

Không pseudo code.

Không bỏ sót file.

Mọi component phải được code đầy đủ.

Sử dụng:

* Vite
* React
* TypeScript
* React Konva

Sau khi generate phải có thể chạy:

```bash
npm install
npm run dev
```

Tự động tạo:

* 100 level
* 500 thẻ dữ liệu
* Adaptive Learning Engine
* Achievement System
* Parent Dashboard
* Daily Challenge System
* Sticker Collection System

Đảm bảo trẻ em từ 4-8 tuổi có thể vừa chơi vừa phát triển trí nhớ một cách tự nhiên và vui vẻ.
