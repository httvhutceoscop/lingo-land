# Claude Code Prompt - Bé Viết Chữ Thần Tốc

## Mục tiêu

Xây dựng game giáo dục "Bé Viết Chữ Thần Tốc" dành cho trẻ em từ 5-7 tuổi chuẩn bị vào lớp 1.

Mục tiêu giáo dục:

* Làm quen bảng chữ cái tiếng Việt
* Học viết chữ đúng nét
* Học viết chữ hoa và chữ thường
* Phát triển vận động tinh (Fine Motor Skills)
* Rèn luyện khả năng điều khiển ngón tay
* Học phát âm chữ cái
* Tăng khả năng ghi nhớ mặt chữ
* Chuẩn bị kỹ năng tập viết trước khi vào lớp 1

Ứng dụng phải được phát triển bằng:

* ReactJS
* TypeScript
* React Konva (ưu tiên)
* TailwindCSS

Game phải hoạt động tốt trên:

* Mobile
* Tablet
* Desktop

Ưu tiên tối ưu cho màn hình cảm ứng và Apple Pencil/Stylus.

---

# 1. KIẾN TRÚC VÀ PHÂN CHIA TRÁCH NHIỆM

## ReactJS

React quản lý:

* Game State
* Current Lesson
* Current Letter
* Current Word
* Progress
* Score
* Stars
* Achievements
* Sticker Collection
* Writing Accuracy
* Parent Statistics

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

* Trace Letter
* Free Drawing
* Stroke Detection
* Path Rendering
* Animation Guide
* Particle Effect
* Success Animation
* Writing Accuracy Visualization

Không sử dụng Canvas API thuần nếu không cần thiết.

---

# 2. Ý TƯỞNG GAME

## Bối cảnh

Bé tham gia Học Viện Chữ Cái.

Mỗi ngày bé sẽ học:

* Một chữ cái
* Một từ mới
* Một bài tập viết

Ví dụ:

Hôm nay học chữ:

A

Bé sẽ:

1. Nghe phát âm
2. Xem cách viết
3. Tô theo nét đứt
4. Viết lại
5. Nhận thưởng

---

# 3. GAMEPLAY

## Bước 1

Hiển thị chữ cái.

Ví dụ:

A

---

## Bước 2

Phát âm.

Ví dụ:

"A"

---

## Bước 3

Animation hướng dẫn nét viết.

Ví dụ:

* Nét 1
* Nét 2
* Nét 3

---

## Bước 4

Bé tô theo nét đứt.

Hệ thống đánh giá:

* Độ chính xác
* Thứ tự nét
* Độ lệch

---

## Bước 5

Nhận sao thưởng.

---

# 4. CHẾ ĐỘ HỌC

## Mode 1 - Học Chữ Cái

Học:

A → Z

và:

Ă Â Đ Ê Ô Ơ Ư

---

## Mode 2 - Chữ Thường

a → z

---

## Mode 3 - Chữ Hoa

A → Z

---

## Mode 4 - Viết Từ

Ví dụ:

* MÈO
* CHÓ
* BÚT
* BÀN

---

## Mode 5 - Viết Câu

Ví dụ:

"EM ĐI HỌC"

---

# 5. HỆ THỐNG NÉT VIẾT

## Stroke Template

Mỗi chữ gồm:

```typescript
interface Stroke {
  id: string;
  points: number[];
  order: number;
}
```

---

## Letter Template

```typescript
interface LetterTemplate {
  id: string;
  letter: string;
  strokes: Stroke[];
  difficulty: number;
}
```

---

# 6. ĐÁNH GIÁ CHỮ VIẾT

## Accuracy Score

Tính theo:

* Khoảng cách với template
* Thứ tự nét
* Độ hoàn chỉnh

---

## Kết quả

90-100%

⭐⭐⭐

Xuất sắc

---

70-89%

⭐⭐

Tốt

---

50-69%

⭐

Cần luyện thêm

---

# 7. LEVEL SYSTEM

## Level 1-10

Nguyên âm

* A
* Ă
* Â
* E
* Ê
* I
* O
* Ô
* Ơ
* U
* Ư

---

## Level 11-20

Phụ âm đơn

---

## Level 21-30

Phụ âm ghép

---

## Level 31-40

Từ đơn giản

---

## Level 41-50

Câu đơn giản

---

# 8. GAMEPLAY RULES

## Điểm

Viết đúng:

+100 điểm

---

Độ chính xác > 90%

+200 điểm

---

Hoàn thành bài học:

+500 điểm

---

Combo

5 chữ liên tiếp:

+300 điểm

---

# 9. HINT SYSTEM

Mỗi bài:

3 Hint

---

Hint:

* Hiện nét tiếp theo
* Hiện hướng kéo
* Highlight vùng cần tô

---

# 10. ĐỒ HỌA

## Theme

Học viện chữ cái kỳ diệu.

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

## Hiệu ứng đúng

* Sparkle
* Confetti
* Star Burst

---

## Hiệu ứng xuất sắc

* Firework
* Huy hiệu vàng

---

# 11. AUDIO

Sử dụng:

* Web Audio API
* Web Speech API

---

Ví dụ:

Hiển thị:

A

Đọc:

"A"

---

Hiển thị:

MÈO

Đọc:

"Mèo"

---

# 12. STICKER COLLECTION

Mở khóa:

* 🔤 Chữ cái vàng
* ✏️ Bút thần kỳ
* 📚 Quyển tập đẹp
* ⭐ Ngôi sao học tập
* 🎓 Học sinh xuất sắc

---

# 13. ACHIEVEMENT SYSTEM

## Thành tích

### Bé Chăm Học

Hoàn thành 10 bài học

---

### Chuyên Gia Chữ Cái

Hoàn thành bảng chữ cái

---

### Siêu Nét Đẹp

Đạt 95% accuracy 20 lần

---

### Nhà Văn Nhí

Hoàn thành 50 từ

---

# 14. PARENT DASHBOARD

Màn hình dành cho phụ huynh.

Hiển thị:

* Tổng thời gian học
* Số bài học hoàn thành
* Accuracy trung bình
* Các chữ còn yếu
* Tiến độ học tập

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
* Stylus
* Apple Pencil

---

# 16. CẤU TRÚC SOURCE CODE

```text
src/
├── screens/
│   ├── StartScreen.tsx
│   ├── LessonScreen.tsx
│   ├── WritingScreen.tsx
│   ├── ResultScreen.tsx
│   └── ParentDashboard.tsx
│
├── components/
│   ├── LetterCard.tsx
│   ├── ProgressBar.tsx
│   ├── AccuracyMeter.tsx
│   ├── StickerGallery.tsx
│   └── AchievementPanel.tsx
│
├── canvas/
│   ├── WritingCanvas.tsx
│   ├── StrokeLayer.tsx
│   ├── GuideLayer.tsx
│   ├── ParticleLayer.tsx
│   └── ConfettiLayer.tsx
│
├── game/
│   ├── StrokeEngine.ts
│   ├── AccuracyEngine.ts
│   ├── LessonEngine.ts
│   └── AchievementEngine.ts
│
├── hooks/
│   ├── useWriting.ts
│   ├── useAccuracy.ts
│   ├── useGameState.ts
│   └── useAchievements.ts
│
├── services/
│   ├── AudioManager.ts
│   ├── RewardManager.ts
│   ├── SpeechService.ts
│   └── StorageService.ts
│
├── data/
│   ├── alphabet.ts
│   ├── lessons.ts
│   ├── words.ts
│   └── achievements.ts
│
├── config/
│   └── GameConfig.ts
│
├── types/
│   └── game.ts
│
└── utils/
    ├── geometry.ts
    ├── random.ts
    ├── drawing.ts
    └── validation.ts
```

---

# 17. HỆ THỐNG NHẬN DIỆN NÉT VIẾT

Xây dựng Accuracy Engine.

Input:

```typescript
UserStroke[]
```

---

So sánh với:

```typescript
LetterTemplate
```

---

Output:

```typescript
{
  accuracy: number;
  missingStroke: boolean;
  wrongOrder: boolean;
}
```

---

Cho phép mở rộng tương lai:

* Machine Learning
* AI Handwriting Recognition

---

# 18. DỮ LIỆU MẪU

Sinh sẵn:

* 29 chữ cái tiếng Việt
* 200 từ vựng
* 50 bài học
* 20 achievement
* 50 sticker

Không cần backend.

---

# 19. YÊU CẦU CHẤT LƯỢNG CODE

* TypeScript Strict Mode
* Functional Components
* Hooks Only
* Không memory leak
* Cleanup animation đúng chuẩn
* Responsive
* Hỗ trợ Touch Events
* Hỗ trợ Stylus
* Không phụ thuộc backend
* Dễ mở rộng dữ liệu
* Dễ mở rộng AI nhận diện chữ viết

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
* 29 chữ cái tiếng Việt
* 200 từ vựng
* Hệ thống accuracy engine
* Hệ thống achievement
* Hệ thống parent dashboard

Đảm bảo trẻ em 5-7 tuổi chuẩn bị vào lớp 1 có thể luyện viết dễ dàng bằng ngón tay hoặc bút cảm ứng.
