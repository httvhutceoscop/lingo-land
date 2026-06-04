# Claude Code Prompt - Thám Tử Tìm Điểm Khác Biệt

## Mục tiêu

Xây dựng game giáo dục "Thám Tử Tìm Điểm Khác Biệt" dành cho trẻ em từ 5-10 tuổi.

Mục tiêu giáo dục:

* Rèn luyện khả năng quan sát
* Tăng sự tập trung
* Phát triển trí nhớ ngắn hạn
* Cải thiện tư duy so sánh
* Tăng khả năng nhận diện hình ảnh và chi tiết
* Rèn luyện tính kiên nhẫn

Ứng dụng phải được phát triển bằng:

* ReactJS
* TypeScript
* React Konva (ưu tiên)
* TailwindCSS

Game phải hoạt động tốt trên:

* Mobile
* Tablet
* Desktop

---

# 1. KIẾN TRÚC VÀ PHÂN CHIA TRÁCH NHIỆM

## ReactJS

React quản lý:

* Game State
* Current Level
* Score
* Lives
* Timer
* Stars
* Hint Count
* Found Differences
* Achievement
* Progress

Sử dụng:

* useState
* useEffect
* useReducer
* useMemo
* useCallback
* Custom Hooks

---

## Canvas Layer (React Konva)

Canvas xử lý:

* Hiển thị 2 bức ảnh
* Zoom hình ảnh
* Highlight điểm khác biệt
* Hiệu ứng click đúng
* Hiệu ứng click sai
* Particle animation
* Confetti animation
* Hint animation
* Transition animation

Không sử dụng Canvas API thuần nếu không cần thiết.

---

# 2. Ý TƯỞNG GAME

## Bối cảnh

Bé trở thành một thám tử nhí.

Nhiệm vụ:

Tìm tất cả điểm khác biệt giữa hai bức tranh.

Ví dụ:

Bức tranh bên trái:

🐶 có nơ đỏ

Bức tranh bên phải:

🐶 không có nơ đỏ

=> Đây là 1 điểm khác biệt.

---

## Gameplay

Mỗi màn chơi:

* Hiển thị 2 bức tranh gần giống nhau
* Có từ 3-10 điểm khác biệt
* Bé nhấn vào vị trí phát hiện khác biệt
* Nếu đúng:

  * Đánh dấu vị trí
  * Cộng điểm
* Nếu sai:

  * Hiệu ứng rung
  * Trừ thời gian hoặc trừ mạng

---

# 3. GAME MODES

## Easy

* 3 điểm khác biệt
* Hình lớn
* Không giới hạn thời gian

---

## Normal

* 5 điểm khác biệt
* Có đồng hồ đếm ngược

---

## Hard

* 8 điểm khác biệt
* Hình phức tạp hơn
* Có giới hạn số lần sai

---

## Detective Challenge

* 10 điểm khác biệt
* Có timer
* Có leaderboard local

---

# 4. GAMEPLAY RULES

## Điểm

Tìm đúng:

+100 điểm

---

Combo

Tìm đúng liên tiếp:

3 lần:

+200 bonus

---

5 lần:

+500 bonus

---

## Sai

Nhấn sai:

-10 điểm

---

## Mạng

Khởi tạo:

❤️ ❤️ ❤️

Sai:

-1 ❤️

Hết mạng:

Game Over

---

# 5. TIMER

Easy:

Không giới hạn

---

Normal:

120 giây

---

Hard:

90 giây

---

Challenge:

60 giây

---

# 6. HINT SYSTEM

Mỗi màn:

3 Hint

Khi sử dụng:

* Vùng khác biệt nhấp nháy
* Highlight trong 2 giây

---

# 7. LEVEL SYSTEM

## Level 1-10

Chủ đề động vật

Ví dụ:

* Chó
* Mèo
* Thỏ
* Gấu trúc

---

## Level 11-20

Chủ đề gia đình

Ví dụ:

* Phòng khách
* Nhà bếp
* Phòng ngủ

---

## Level 21-30

Chủ đề trường học

Ví dụ:

* Lớp học
* Sân trường
* Thư viện

---

## Level 31-40

Chủ đề thành phố

Ví dụ:

* Công viên
* Siêu thị
* Nhà ga

---

## Level 41+

Chủ đề phiêu lưu

Ví dụ:

* Hải tặc
* Không gian
* Khủng long
* Rừng nhiệt đới

---

# 8. CẤU TRÚC DỮ LIỆU

## Difference Area

```typescript
interface DifferenceArea {
  id: string;
  x: number;
  y: number;
  radius: number;
  found: boolean;
}
```

---

## Level

```typescript
interface Level {
  id: number;
  name: string;
  leftImage: string;
  rightImage: string;
  differences: DifferenceArea[];
  difficulty: "easy" | "normal" | "hard";
}
```

---

# 9. GAME CONFIG

```typescript
export const GAME_CONFIG = {
  INITIAL_LIVES: 3,
  INITIAL_HINTS: 3,
  SCORE_PER_DIFFERENCE: 100,
  WRONG_CLICK_PENALTY: 10,
  COMBO_X3: 3,
  COMBO_X5: 5,
  HINT_DURATION: 2000,
  LEVEL_COMPLETE_DELAY: 1500
};
```

---

# 10. ĐỒ HỌA

## Màu sắc

* Sky Blue
* Soft Yellow
* Mint Green
* Pastel Purple

---

## Font

Ưu tiên:

* Baloo 2
* Nunito

---

## Hiệu ứng đúng

* Vòng tròn xanh lá
* Particle Effect
* Ngôi sao bay ra

---

## Hiệu ứng sai

* Dấu X đỏ
* Rung nhẹ
* Âm thanh sai

---

## Hoàn thành màn

* Confetti
* Pháo hoa
* Huy hiệu thám tử

---

# 11. AUDIO

Sử dụng:

* Web Audio API

Âm thanh:

* Click đúng
* Click sai
* Hoàn thành màn
* Level up
* Nhận thưởng

---

# 12. ACHIEVEMENT SYSTEM

## Thành tích

Mở khóa:

### Mắt Cú Mèo

Tìm đúng 50 điểm khác biệt

---

### Siêu Quan Sát

Tìm đúng 100 điểm khác biệt

---

### Thám Tử Tập Sự

Hoàn thành 10 màn

---

### Sherlock Nhí

Hoàn thành 50 màn

---

# 13. STICKER COLLECTION

Mở khóa sticker:

* 🔍 Kính lúp
* 🕵️ Thám tử
* 🏆 Cúp vàng
* ⭐ Siêu sao quan sát
* 🎖️ Huy chương vàng

Cho phép xem bộ sưu tập.

---

# 14. RESPONSIVE

Hỗ trợ:

* Mobile Portrait
* Mobile Landscape
* Tablet
* Desktop

Tự động:

* Scale ảnh
* Scale vùng click
* Scale animation

---

# 15. CẤU TRÚC SOURCE CODE

```text
src/
├── components/
│
├── screens/
│   ├── StartScreen.tsx
│   ├── PlayingScreen.tsx
│   ├── ResultScreen.tsx
│
├── game/
│   ├── DifferenceEngine.ts
│   ├── HintSystem.ts
│   ├── LevelManager.ts
│
├── canvas/
│   ├── DifferenceCanvas.tsx
│   ├── HighlightLayer.tsx
│   ├── ParticleLayer.tsx
│   └── ConfettiLayer.tsx
│
├── hooks/
│   ├── useGameState.ts
│   ├── useTimer.ts
│   ├── useHint.ts
│   └── useAchievements.ts
│
├── services/
│   ├── AudioManager.ts
│   ├── AchievementService.ts
│   └── RewardService.ts
│
├── data/
│   ├── levels.ts
│   └── achievements.ts
│
├── config/
│   └── GameConfig.ts
│
├── types/
│   └── game.ts
│
└── utils/
    ├── image.ts
    ├── random.ts
    └── collision.ts
```

---

# 16. AI LEVEL GENERATOR (BONUS)

Xây dựng module tạo level tự động:

Input:

* 1 ảnh gốc
* Danh sách điểm khác biệt

Output:

* Ảnh trái
* Ảnh phải
* Metadata vị trí khác biệt

Cho phép mở rộng trong tương lai để tích hợp AI tạo level.

---

# 17. DỮ LIỆU MẪU

Sinh sẵn:

* 50 level
* 5 chủ đề
* 300 điểm khác biệt
* 20 achievement

Có thể chạy ngay không cần backend.

---

# 18. YÊU CẦU CHẤT LƯỢNG CODE

* TypeScript Strict Mode
* Functional Components
* Hooks Only
* Không memory leak
* Cleanup animation đúng chuẩn
* Responsive
* Accessibility cơ bản
* Không phụ thuộc backend
* Dễ mở rộng thêm level
* Dễ mở rộng thêm hình ảnh
* Dễ mở rộng thêm achievement

---

# 19. YÊU CẦU CUỐI CÙNG

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

* 50 level mẫu
* 300 điểm khác biệt
* Hệ thống achievement hoàn chỉnh
* Hệ thống sticker hoàn chỉnh

Đảm bảo trẻ em từ 5-10 tuổi có thể chơi dễ dàng bằng cảm ứng hoặc chuột.
