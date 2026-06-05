# Claude Code Prompt - Ghép Hình Động Vật

## Mục tiêu

Xây dựng game giáo dục "Ghép Hình Động Vật" dành cho trẻ em từ 4-8 tuổi.

Mục tiêu giáo dục:

* Nhận biết các loài động vật
* Phát triển tư duy không gian
* Rèn luyện khả năng quan sát
* Tăng khả năng phối hợp tay - mắt
* Phát triển kỹ năng giải quyết vấn đề
* Rèn luyện tính kiên nhẫn và tập trung

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
* Level
* Score
* Stars
* Timer
* Current Puzzle
* Completed Pieces
* Achievement
* Sticker Collection
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

* Drag & Drop Puzzle Piece
* Snap To Position
* Highlight Target Area
* Particle Effect
* Confetti Effect
* Level Transition
* Piece Animation
* Hint Animation

Không sử dụng Canvas API thuần nếu không thật sự cần thiết.

---

# 2. Ý TƯỞNG GAME

## Bối cảnh

Bé giúp các con vật ghép lại bức tranh bị vỡ thành nhiều mảnh.

Ví dụ:

🐱 Con mèo bị tách thành:

* Đầu
* Thân
* Chân
* Đuôi

Bé kéo các mảnh vào đúng vị trí để hoàn thành bức tranh.

---

## Gameplay

1. Hiển thị silhouette (khung mờ)
2. Hiển thị các mảnh ghép bị xáo trộn
3. Bé kéo mảnh ghép
4. Thả vào vị trí tương ứng
5. Nếu đúng:

   * Snap tự động
   * Khóa vị trí
6. Nếu sai:

   * Trả về vị trí cũ
7. Hoàn thành tất cả mảnh ghép
8. Mở khóa động vật mới

---

# 3. CHẾ ĐỘ CHƠI

## Mode 1 - Ghép Bộ Phận

Phù hợp:

4-5 tuổi

Ví dụ:

Con mèo gồm:

* Đầu
* Thân
* Chân
* Đuôi

4 mảnh lớn.

---

## Mode 2 - Puzzle Cơ Bản

Phù hợp:

5-6 tuổi

Puzzle:

2x2

Tổng:

4 mảnh

---

## Mode 3 - Puzzle Trung Bình

Phù hợp:

6-7 tuổi

Puzzle:

3x3

Tổng:

9 mảnh

---

## Mode 4 - Puzzle Nâng Cao

Phù hợp:

7-8 tuổi

Puzzle:

4x4

Tổng:

16 mảnh

---

## Mode 5 - Time Challenge

Giới hạn thời gian.

Ghép nhanh nhất để đạt điểm cao.

---

# 4. LEVEL SYSTEM

## Level 1-10

Động vật nuôi

* Mèo
* Chó
* Thỏ
* Gà
* Vịt

---

## Level 11-20

Động vật trang trại

* Bò
* Ngựa
* Cừu
* Heo

---

## Level 21-30

Động vật rừng

* Hổ
* Sư tử
* Voi
* Khỉ

---

## Level 31-40

Động vật biển

* Cá heo
* Cá mập
* Bạch tuộc
* Rùa biển

---

## Level 41-50

Động vật đặc biệt

* Khủng long
* Kỳ lân
* Rồng
* Phượng hoàng

---

# 5. GAMEPLAY RULES

## Điểm

Ghép đúng:

+50 điểm

---

Hoàn thành puzzle:

+500 điểm

---

Combo

Ghép đúng liên tiếp:

3 mảnh:

+100 điểm

---

5 mảnh:

+300 điểm

---

# 6. HINT SYSTEM

Mỗi màn:

3 Hint

Khi sử dụng:

* Highlight vị trí đúng
* Mảnh ghép phát sáng
* Hiển thị trong 2 giây

---

# 7. TIMER

Easy

Không giới hạn

---

Normal

180 giây

---

Hard

120 giây

---

Challenge

60 giây

---

# 8. DỮ LIỆU PUZZLE

## Puzzle Piece

```typescript
interface PuzzlePiece {
  id: string;
  image: string;
  correctX: number;
  correctY: number;
  currentX: number;
  currentY: number;
  width: number;
  height: number;
  locked: boolean;
}
```

---

## Puzzle

```typescript
interface Puzzle {
  id: string;
  name: string;
  animal: string;
  image: string;
  difficulty: "easy" | "normal" | "hard";
  rows: number;
  cols: number;
  pieces: PuzzlePiece[];
}
```

---

# 9. GAME CONFIG

```typescript
export const GAME_CONFIG = {
  INITIAL_HINTS: 3,
  SCORE_PER_PIECE: 50,
  SCORE_PER_PUZZLE: 500,
  SNAP_DISTANCE: 30,
  COMBO_X3: 3,
  COMBO_X5: 5,
  HINT_DURATION: 2000,
  LEVEL_COMPLETE_DELAY: 1500
};
```

---

# 10. ĐỒ HỌA

## Theme

Thế giới động vật vui nhộn.

---

## Màu sắc

* Sky Blue
* Mint Green
* Soft Yellow
* Pastel Orange
* Pastel Purple

---

## Font

Ưu tiên:

* Baloo 2
* Nunito

---

## Hiệu ứng đúng

* Snap Effect
* Sparkle Effect
* Ngôi sao xuất hiện

---

## Hiệu ứng hoàn thành

* Confetti
* Firework
* Animal Dance Animation

---

## Hiệu ứng sai

* Rung nhẹ
* Trả về vị trí cũ

---

# 11. AUDIO

Sử dụng:

* Web Audio API

Âm thanh:

* Drag Piece
* Snap Success
* Puzzle Complete
* Reward
* Level Up

---

## Voice

Sử dụng Web Speech API

Khi hoàn thành:

Ví dụ:

🐱

"Mèo"

Đọc tên động vật.

---

# 12. STICKER COLLECTION

Mở khóa:

* 🐱 Mèo
* 🐶 Chó
* 🐰 Thỏ
* 🦁 Sư tử
* 🐼 Gấu trúc
* 🐬 Cá heo
* 🦖 Khủng long

Cho phép xem bộ sưu tập.

---

# 13. ACHIEVEMENT SYSTEM

## Thành tích

### Puzzle Master

Hoàn thành 10 puzzle

---

### Animal Explorer

Mở khóa 20 động vật

---

### Speed Solver

Hoàn thành puzzle dưới 30 giây

---

### Genius Kid

Đạt 10000 điểm

---

# 14. RESPONSIVE

Hỗ trợ:

* Mobile Portrait
* Mobile Landscape
* Tablet
* Desktop

Tự động scale:

* Puzzle
* Piece
* Canvas
* Touch Area

---

# 15. PUZZLE GENERATOR

Xây dựng Puzzle Generator.

Input:

```typescript
{
  image: string,
  rows: number,
  cols: number
}
```

Output:

```typescript
PuzzlePiece[]
```

Tự động:

* Cắt ảnh
* Sinh piece
* Tính toán vị trí
* Random vị trí ban đầu

Cho phép tái sử dụng với hàng trăm ảnh động vật.

---

# 16. CẤU TRÚC SOURCE CODE

```text
src/
├── components/
│
├── screens/
│   ├── StartScreen.tsx
│   ├── PlayingScreen.tsx
│   ├── ResultScreen.tsx
│
├── canvas/
│   ├── PuzzleCanvas.tsx
│   ├── PuzzlePiece.tsx
│   ├── ParticleLayer.tsx
│   ├── HintLayer.tsx
│   └── ConfettiLayer.tsx
│
├── game/
│   ├── PuzzleGenerator.ts
│   ├── PuzzleEngine.ts
│   ├── HintEngine.ts
│   └── AchievementEngine.ts
│
├── hooks/
│   ├── usePuzzle.ts
│   ├── useGameState.ts
│   ├── useTimer.ts
│   └── useAchievements.ts
│
├── services/
│   ├── AudioManager.ts
│   ├── RewardManager.ts
│   └── StickerManager.ts
│
├── data/
│   ├── animals.ts
│   ├── puzzles.ts
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
    ├── collision.ts
    ├── random.ts
    └── geometry.ts
```

---

# 17. DỮ LIỆU MẪU

Sinh sẵn:

* 50 puzzle
* 50 động vật
* 20 achievement
* 100 sticker reward

Không cần backend.

Có thể chạy ngay.

---

# 18. YÊU CẦU CHẤT LƯỢNG CODE

* TypeScript Strict Mode
* Functional Components
* Hooks Only
* Không memory leak
* Cleanup animation đúng chuẩn
* Responsive
* Hỗ trợ touch
* Không phụ thuộc backend
* Dễ mở rộng thêm puzzle
* Dễ mở rộng thêm động vật
* Dễ mở rộng thêm chế độ chơi

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

* 50 puzzle
* 50 động vật
* Hệ thống achievement hoàn chỉnh
* Hệ thống sticker hoàn chỉnh
* Puzzle generator hoàn chỉnh

Đảm bảo trẻ em từ 4-8 tuổi có thể sử dụng dễ dàng bằng cảm ứng hoặc chuột.
