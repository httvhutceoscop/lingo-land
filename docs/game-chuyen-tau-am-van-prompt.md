# Claude Code Prompt - Chuyến Tàu Âm Vần

## Mục tiêu

Xây dựng game giáo dục "Chuyến Tàu Âm Vần" dành cho trẻ em từ 5-7 tuổi chuẩn bị vào lớp 1.

Mục tiêu giáo dục:

* Nhận biết âm đầu, vần và thanh điệu tiếng Việt
* Học ghép âm thành tiếng
* Học đánh vần theo chương trình Tiếng Việt lớp 1
* Phát triển kỹ năng đọc sớm
* Rèn luyện khả năng nghe và phát âm
* Tăng vốn từ vựng cơ bản
* Chuẩn bị nền tảng đọc hiểu trước khi vào tiểu học

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
* Current Lesson
* Current Train
* Current Word
* Level
* Score
* Combo
* Stars
* Progress
* Achievement
* Sticker Collection
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

* Animation đoàn tàu
* Kéo thả toa tàu
* Hiệu ứng ghép âm
* Particle Effect
* Star Effect
* Reward Animation
* Scene Transition
* Progress Animation

Không sử dụng Canvas API thuần nếu không cần thiết.

---

# 2. Ý TƯỞNG GAME

## Bối cảnh

Bé là trưởng tàu của "Chuyến Tàu Âm Vần".

Mỗi toa tàu chứa:

* Âm đầu
* Vần
* Thanh điệu

Bé phải ghép đúng các toa để tạo thành từ hoàn chỉnh.

Ví dụ:

Đầu tàu:

M

Toa vần:

EO

Kết quả:

MEO

Sau đó thêm thanh huyền:

MÈO

Đoàn tàu chạy tới ga tiếp theo.

---

# 3. GAMEPLAY

## Bước 1

Hiển thị hình ảnh.

Ví dụ:

🐱

---

## Bước 2

Đọc từ.

Ví dụ:

"Mèo"

---

## Bước 3

Hiển thị các toa tàu.

Ví dụ:

* M
* N
* B

và

* EO
* AO
* AI

---

## Bước 4

Bé kéo đúng toa.

Ví dụ:

M + EO

---

## Bước 5

Chọn thanh điệu.

Ví dụ:

* Không dấu
* Huyền
* Sắc
* Hỏi
* Ngã
* Nặng

---

## Bước 6

Ghép thành:

MÈO

---

## Bước 7

Tàu chạy tới ga tiếp theo.

---

# 4. CHẾ ĐỘ CHƠI

## Mode 1 - Nhận Biết Âm Đầu

Ví dụ:

🐱

Chọn:

M

---

## Mode 2 - Nhận Biết Vần

Ví dụ:

🐱

Chọn:

EO

---

## Mode 3 - Ghép Âm

Ví dụ:

M + EO

---

## Mode 4 - Chọn Thanh Điệu

Ví dụ:

MEO

→

MÈO

---

## Mode 5 - Đánh Vần Hoàn Chỉnh

Ví dụ:

M + EO + HUYỀN

→

MÈO

---

## Mode 6 - Đọc Nhanh

Giới hạn thời gian.

---

# 5. LEVEL SYSTEM

## Level 1-10

Nguyên âm đơn

* a
* e
* i
* o
* u

---

## Level 11-20

Âm đầu đơn

* b
* c
* d
* g
* h
* k
* l
* m
* n

---

## Level 21-30

Vần đơn

* an
* am
* at
* ac
* ai
* ao

---

## Level 31-40

Vần ghép

* iêu
* uôn
* uyên
* oang
* oai

---

## Level 41-50

Từ hoàn chỉnh

---

## Level 51+

Câu đơn giản

---

# 6. HỆ THỐNG ÂM VẦN

## Initial Sound

```typescript
interface InitialSound {
  id: string;
  value: string;
  pronunciation: string;
}
```

---

## Rhyme

```typescript
interface Rhyme {
  id: string;
  value: string;
  pronunciation: string;
}
```

---

## Tone

```typescript
interface Tone {
  id: string;
  name: string;
  symbol: string;
}
```

---

## Word

```typescript
interface Word {
  id: string;
  image: string;
  word: string;
  initial: string;
  rhyme: string;
  tone: string;
}
```

---

# 7. GAMEPLAY RULES

## Điểm

Ghép đúng:

+100 điểm

---

Ghép hoàn chỉnh:

+300 điểm

---

Combo

3 lần liên tiếp:

+200 điểm

---

5 lần liên tiếp:

+500 điểm

---

# 8. HINT SYSTEM

Mỗi màn:

3 Hint

---

Hint 1

Highlight âm đầu.

---

Hint 2

Highlight vần.

---

Hint 3

Highlight toàn bộ đáp án.

---

# 9. AUDIO SYSTEM

## Web Speech API

Đọc:

* Âm đầu
* Vần
* Từ hoàn chỉnh

Ví dụ:

"M"

"EO"

"MÈO"

---

## Sound Effect

* Correct
* Wrong
* Level Up
* Reward
* Train Departure

---

# 10. ĐỒ HỌA

## Theme

Đoàn tàu học chữ kỳ diệu.

---

## Màu sắc

* Sky Blue
* Mint Green
* Soft Yellow
* Pastel Purple
* Pastel Orange

---

## Font

Ưu tiên:

* Baloo 2
* Nunito

---

## Hiệu ứng đúng

* Ngôi sao bay
* Sparkle
* Đoàn tàu tăng tốc

---

## Hoàn thành bài

* Confetti
* Firework
* Huy hiệu học giỏi

---

# 11. STORY MAP

Bé đi qua các ga:

### Ga Nguyên Âm

---

### Ga Âm Đầu

---

### Ga Vần

---

### Ga Thanh Điệu

---

### Ga Từ Vựng

---

### Ga Đọc Thành Thạo

---

Mỗi ga mở khóa phần kiến thức mới.

---

# 12. STICKER COLLECTION

Mở khóa:

* 🚂 Đầu tàu
* 🚃 Toa tàu
* ⭐ Ngôi sao
* 🎓 Học sinh giỏi
* 📖 Quyển sách thần kỳ

Cho phép xem bộ sưu tập.

---

# 13. ACHIEVEMENT SYSTEM

### Nhà Ga Nguyên Âm

Hoàn thành tất cả nguyên âm.

---

### Bậc Thầy Âm Đầu

Hoàn thành tất cả âm đầu.

---

### Chuyên Gia Âm Vần

Hoàn thành 100 từ.

---

### Siêu Đầu Tàu

Hoàn thành toàn bộ game.

---

# 14. PARENT DASHBOARD

Hiển thị:

* Tổng số từ đã học
* Âm đầu còn yếu
* Vần còn yếu
* Tỷ lệ chính xác
* Thời gian học

Lưu Local Storage.

---

# 15. RESPONSIVE

Hỗ trợ:

* Mobile Portrait
* Mobile Landscape
* Tablet
* Desktop

Tối ưu:

* Touch
* Drag & Drop
* Tablet Learning

---

# 16. CẤU TRÚC SOURCE CODE

```text
src/
├── screens/
│   ├── StartScreen.tsx
│   ├── StationMapScreen.tsx
│   ├── LessonScreen.tsx
│   ├── PlayingScreen.tsx
│   ├── ResultScreen.tsx
│   └── ParentDashboard.tsx
│
├── components/
│   ├── Train.tsx
│   ├── TrainCar.tsx
│   ├── WordCard.tsx
│   ├── ProgressBar.tsx
│   ├── AchievementPanel.tsx
│   └── StickerGallery.tsx
│
├── canvas/
│   ├── TrainCanvas.tsx
│   ├── DragLayer.tsx
│   ├── ParticleLayer.tsx
│   ├── ConfettiLayer.tsx
│   └── RewardLayer.tsx
│
├── game/
│   ├── WordEngine.ts
│   ├── LessonEngine.ts
│   ├── PronunciationEngine.ts
│   ├── RewardEngine.ts
│   └── AchievementEngine.ts
│
├── hooks/
│   ├── useGameState.ts
│   ├── useAudio.ts
│   ├── useProgress.ts
│   └── useAchievements.ts
│
├── services/
│   ├── AudioManager.ts
│   ├── SpeechService.ts
│   ├── StorageService.ts
│   └── RewardManager.ts
│
├── data/
│   ├── initials.ts
│   ├── rhymes.ts
│   ├── tones.ts
│   ├── words.ts
│   ├── lessons.ts
│   └── achievements.ts
│
├── config/
│   └── GameConfig.ts
│
├── types/
│   └── game.ts
│
└── utils/
    ├── random.ts
    ├── validation.ts
    ├── pronunciation.ts
    └── scoring.ts
```

---

# 17. DỮ LIỆU MẪU

Sinh sẵn:

* 29 chữ cái tiếng Việt
* 100 âm đầu và vần
* 500 từ vựng lớp 1
* 50 bài học
* 20 achievement
* 50 sticker

Không cần backend.

---

# 18. NÂNG CAO (BONUS)

## Adaptive Learning

Tự động tăng hoặc giảm độ khó theo:

* Tỷ lệ đúng
* Tốc độ hoàn thành
* Số lần sai

---

## Daily Practice

Tạo bài luyện tập mỗi ngày.

---

## Review Mode

Tự động ôn tập những âm/vần còn yếu.

---

# 19. YÊU CẦU CHẤT LƯỢNG CODE

* TypeScript Strict Mode
* Functional Components
* Hooks Only
* Không memory leak
* Cleanup animation đúng chuẩn
* Responsive
* Hỗ trợ Touch Events
* Không phụ thuộc backend
* Dễ mở rộng dữ liệu âm vần
* Dễ mở rộng từ vựng
* Dễ mở rộng chương trình học

---

# 20. YÊU CẦU CUỐI CÙNG

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

* 50 bài học
* 500 từ vựng
* Hệ thống âm đầu
* Hệ thống vần
* Hệ thống thanh điệu
* Achievement System
* Parent Dashboard

Đảm bảo trẻ em 5-7 tuổi chuẩn bị vào lớp 1 có thể học đánh vần và đọc tiếng Việt một cách vui vẻ thông qua cơ chế đoàn tàu tương tác.
