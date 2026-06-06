# Claude Code Prompt - Bay Vào Vũ Trụ Số

## Mục tiêu

Xây dựng game giáo dục "Bay Vào Vũ Trụ Số" dành cho trẻ em từ 5-8 tuổi chuẩn bị vào lớp 1.

Mục tiêu giáo dục:

* Học nhận biết số từ 0-100
* Học đếm số
* Học cộng trừ cơ bản
* Học so sánh số lớn hơn, nhỏ hơn, bằng nhau
* Học quy luật số học đơn giản
* Phát triển tư duy logic
* Rèn luyện phản xạ tính toán nhanh
* Tạo hứng thú học toán thông qua chủ đề khám phá vũ trụ

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

# 1. Ý TƯỞNG GAME

## Cốt truyện

Bé trở thành phi hành gia nhí điều khiển tàu vũ trụ.

Để khám phá các hành tinh mới, bé phải vượt qua các thử thách toán học.

Mỗi hành tinh đại diện cho một chủ đề toán học:

* Hành tinh Đếm Số
* Hành tinh Cộng
* Hành tinh Trừ
* Hành tinh So Sánh
* Hành tinh Quy Luật
* Hành tinh Siêu Trí Tuệ

Sau mỗi nhiệm vụ thành công:

* Thu thập sao năng lượng
* Mở khóa hành tinh mới
* Nâng cấp tàu vũ trụ
* Nhận huy hiệu phi hành gia

---

# 2. GAMEPLAY LOOP

## Bước 1

Tàu vũ trụ bay đến hành tinh.

---

## Bước 2

Robot AI giao nhiệm vụ.

Ví dụ:

"Chúng ta cần 7 tinh thể năng lượng.
Hiện tại có 3 tinh thể.
Cần thêm bao nhiêu?"

---

## Bước 3

Bé trả lời bằng:

* Chọn đáp án
* Kéo thả số
* Bắn thiên thạch đúng số
* Ghép số

---

## Bước 4

Hoàn thành nhiệm vụ.

---

## Bước 5

Nhận thưởng.

---

## Bước 6

Mở khóa nhiệm vụ tiếp theo.

---

# 3. HỆ THỐNG HÀNH TINH

## Planet 1 - Hành Tinh Đếm Số

Kiến thức:

* Đếm từ 1-10
* Đếm đồ vật

Ví dụ:

⭐⭐⭐⭐⭐

Có bao nhiêu ngôi sao?

---

## Planet 2 - Hành Tinh Số Học

Kiến thức:

* Nhận biết số

Ví dụ:

Chọn số 8.

---

## Planet 3 - Hành Tinh Cộng

Ví dụ:

3 + 4 = ?

---

## Planet 4 - Hành Tinh Trừ

Ví dụ:

9 - 2 = ?

---

## Planet 5 - Hành Tinh So Sánh

Ví dụ:

7 ? 5

Chọn:

* >
* <
* =

---

## Planet 6 - Hành Tinh Quy Luật

Ví dụ:

2 - 4 - 6 - ?

---

## Planet 7 - Hành Tinh Thiên Tài

Kết hợp toàn bộ kiến thức.

---

# 4. MINI GAME SYSTEM

## Mini Game 1

Bắn thiên thạch đúng số.

Ví dụ:

Yêu cầu:

"Tìm số 9"

---

## Mini Game 2

Thu thập số lượng sao.

---

## Mini Game 3

Kéo nhiên liệu đúng đáp án.

---

## Mini Game 4

Ghép hành tinh với phép tính.

---

## Mini Game 5

Lái tàu vượt mê cung số.

---

## Mini Game 6

Giải cứu robot bằng toán học.

---

# 5. GAME MODES

## Story Mode

Khám phá vũ trụ.

---

## Quick Practice

10 câu ngẫu nhiên.

---

## Daily Mission

Nhiệm vụ hằng ngày.

---

## Endless Space

Chơi vô tận.

---

## Parent Training Mode

Phụ huynh chọn nội dung học.

---

# 6. HỆ THỐNG DỮ LIỆU

## Question

```typescript
interface Question {
  id: string;
  type:
    | "count"
    | "number"
    | "add"
    | "subtract"
    | "compare"
    | "pattern";
  question: string;
  options: string[];
  answer: string;
  difficulty: number;
}
```

---

## Planet

```typescript
interface Planet {
  id: string;
  name: string;
  difficulty: number;
  questions: Question[];
}
```

---

## Spaceship

```typescript
interface Spaceship {
  level: number;
  speed: number;
  fuel: number;
  skin: string;
}
```

---

# 7. ĐIỂM SỐ

## Trả lời đúng

+100 điểm

---

## Trả lời nhanh

+50 điểm

---

## Combo

3 câu liên tiếp:

+200 điểm

---

5 câu liên tiếp:

+500 điểm

---

10 câu liên tiếp:

+1000 điểm

---

# 8. NĂNG LƯỢNG

❤️ ❤️ ❤️ ❤️ ❤️

---

Sai:

-1 năng lượng

---

Hết năng lượng:

Quay lại checkpoint gần nhất.

---

# 9. HỆ THỐNG TÀU VŨ TRỤ

## Nâng cấp

Thu thập:

* Sao năng lượng
* Tinh thể
* Kim cương

---

Mở khóa:

* Tàu mới
* Hiệu ứng mới
* Động cơ mới

---

## Spaceship Skin

* Classic Rocket
* Space Cat Rocket
* Rainbow Rocket
* Golden Rocket
* Galaxy Rocket

---

# 10. HỆ THỐNG THƯỞNG

## Reward

```typescript
interface Reward {
  id: string;
  type: "coin" | "star" | "crystal" | "badge";
  amount: number;
}
```

---

# 11. ĐỒ HỌA

## Theme

Vũ trụ hoạt hình đáng yêu.

---

## Màu sắc

* Cosmic Blue
* Galaxy Purple
* Neon Cyan
* Star Yellow
* Rocket Orange

---

## Font

Ưu tiên:

* Baloo 2
* Nunito

---

# 12. HIỆU ỨNG

## Trả lời đúng

* Star Explosion
* Sparkle
* Energy Wave

---

## Mở khóa hành tinh

* Planet Reveal
* Cosmic Light
* Warp Effect

---

## Hoàn thành hành tinh

* Firework
* Medal Ceremony
* Rocket Launch

---

# 13. AUDIO

Sử dụng:

* Web Audio API
* Web Speech API

---

Ví dụ:

"Tuyệt vời! Chúng ta đã đến hành tinh mới."

---

Âm thanh:

* Correct
* Wrong
* Rocket Launch
* Collect Star
* Planet Unlock

---

# 14. ACHIEVEMENT SYSTEM

## Phi Hành Gia Mới

Hoàn thành 10 nhiệm vụ.

---

## Thợ Săn Thiên Hà

Thu thập 100 ngôi sao.

---

## Bậc Thầy Toán Học

Trả lời đúng 200 câu.

---

## Huyền Thoại Vũ Trụ

Hoàn thành toàn bộ game.

---

# 15. STICKER COLLECTION

Mở khóa:

* 🚀 Rocket
* 🌎 Earth
* 🪐 Saturn
* ⭐ Super Star
* 👨‍🚀 Astronaut
* 🤖 Robot AI

---

# 16. PARENT DASHBOARD

Hiển thị:

* Số đã học
* Chủ đề đã hoàn thành
* Tỷ lệ chính xác
* Thời gian học
* Điểm mạnh
* Điểm cần cải thiện

---

# 17. ADAPTIVE LEARNING

Nếu:

Tỷ lệ đúng > 90%

→ Tăng độ khó.

---

Nếu:

Tỷ lệ đúng < 60%

→ Hiển thị thêm gợi ý.

---

Nếu:

Sai liên tục 3 lần

→ Chuyển sang chế độ hỗ trợ.

---

# 18. RESPONSIVE

Hỗ trợ:

* Mobile Portrait
* Mobile Landscape
* Tablet
* Desktop

Tối ưu:

* Touch
* Drag & Drop
* Accessibility
* Large UI

---

# 19. CẤU TRÚC SOURCE CODE

```text
src/
├── screens/
│   ├── StartScreen.tsx
│   ├── GalaxyMapScreen.tsx
│   ├── PlanetScreen.tsx
│   ├── MissionScreen.tsx
│   ├── SpaceshipGarageScreen.tsx
│   ├── ResultScreen.tsx
│   └── ParentDashboard.tsx
│
├── components/
│   ├── Spaceship.tsx
│   ├── PlanetCard.tsx
│   ├── QuestionCard.tsx
│   ├── ProgressBar.tsx
│   ├── AchievementPanel.tsx
│   └── StickerGallery.tsx
│
├── canvas/
│   ├── SpaceCanvas.tsx
│   ├── PlanetLayer.tsx
│   ├── SpaceshipLayer.tsx
│   ├── AsteroidLayer.tsx
│   ├── ParticleLayer.tsx
│   └── WarpLayer.tsx
│
├── game/
│   ├── QuestionEngine.ts
│   ├── PlanetEngine.ts
│   ├── RewardEngine.ts
│   ├── AdaptiveLearningEngine.ts
│   ├── SpaceshipEngine.ts
│   └── AchievementEngine.ts
│
├── hooks/
│   ├── useGameState.ts
│   ├── useQuestion.ts
│   ├── useProgress.ts
│   ├── useSpaceship.ts
│   └── useAchievements.ts
│
├── services/
│   ├── AudioManager.ts
│   ├── SpeechService.ts
│   ├── StorageService.ts
│   └── StatisticsService.ts
│
├── data/
│   ├── planets.ts
│   ├── questions.ts
│   ├── rewards.ts
│   ├── achievements.ts
│   └── stickers.ts
│
├── config/
│   └── GameConfig.ts
│
├── types/
│   └── game.ts
│
└── utils/
    ├── scoring.ts
    ├── random.ts
    ├── adaptive.ts
    └── validation.ts
```

---

# 20. DỮ LIỆU MẪU

Sinh sẵn:

* 7 hành tinh
* 500 câu hỏi
* 100 level
* 50 achievement
* 100 sticker
* 20 loại tàu vũ trụ

Không cần backend.

Lưu bằng Local Storage.

---

# 21. TÍNH NĂNG NÂNG CAO (BONUS)

## Galaxy Collection

Sưu tập hành tinh.

---

## Daily Login Reward

Thưởng đăng nhập mỗi ngày.

---

## Space Encyclopedia

Kho kiến thức về vũ trụ.

---

## Offline First

Toàn bộ game hoạt động offline.

---

## AI Tutor

Robot hướng dẫn khi trẻ gặp khó khăn.

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
* Dễ mở rộng level
* Dễ mở rộng câu hỏi
* Dễ mở rộng hành tinh

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
* 500 câu hỏi
* 7 hành tinh
* 6 mini game
* Adaptive Learning Engine
* Achievement System
* Parent Dashboard
* Spaceship Upgrade System
* Galaxy Collection System

Đảm bảo trẻ em từ 5-8 tuổi có thể học toán một cách vui vẻ thông qua hành trình khám phá vũ trụ và điều khiển tàu không gian.
