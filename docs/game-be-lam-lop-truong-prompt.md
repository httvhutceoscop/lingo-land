# Claude Code Prompt - Bé Làm Lớp Trưởng

## Mục tiêu

Xây dựng game giáo dục "Bé Làm Lớp Trưởng" dành cho trẻ em từ 5-8 tuổi.

Mục tiêu giáo dục:

* Học tinh thần trách nhiệm
* Học kỹ năng lãnh đạo cơ bản
* Học kỹ năng giao tiếp
* Học quản lý lớp học
* Học kỹ năng tổ chức công việc
* Học cách giúp đỡ bạn bè
* Học quy tắc ứng xử trong trường học
* Rèn luyện khả năng ra quyết định

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
* Current School Day
* Current Mission
* Class Happiness
* Reputation Score
* Coins
* Stars
* Student Relationship
* Achievement
* Progress
* Parent Dashboard

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

* Classroom Animation
* Character Movement
* Drag & Drop Student Arrangement
* Attendance Board
* Reward Effects
* Particle Effects
* Event Animation
* Classroom Transition

Không sử dụng Canvas API thuần nếu không cần thiết.

---

# 2. Ý TƯỞNG GAME

## Bối cảnh

Bé được cô giáo giao nhiệm vụ làm lớp trưởng.

Mỗi ngày đến trường, bé sẽ phải:

* Điểm danh lớp
* Nhắc nhở bạn giữ trật tự
* Sắp xếp bàn ghế
* Hỗ trợ cô giáo
* Giúp đỡ bạn bè
* Tổ chức hoạt động lớp học

Thông qua các nhiệm vụ này, trẻ học được:

* Tinh thần trách nhiệm
* Kỹ năng lãnh đạo
* Kỹ năng giao tiếp tích cực
* Tinh thần hợp tác

---

# 3. STORY MODE

## Tuần 1 - Ngày Đầu Làm Lớp Trưởng

### Mission 1

Điểm danh lớp.

Ví dụ:

Danh sách:

* Nam
* Lan
* Minh
* Hoa

Tìm bạn vắng mặt.

---

### Mission 2

Sắp xếp bàn ghế.

Kéo bàn ghế về đúng vị trí.

---

### Mission 3

Nhắc nhở bạn nói chuyện riêng.

Lựa chọn cách ứng xử phù hợp.

---

# Tuần 2 - Giúp Đỡ Bạn Bè

### Mission 1

Bạn quên bút.

Chọn cách xử lý.

✔ Cho bạn mượn bút

✘ Mặc kệ bạn

---

### Mission 2

Bạn bị ngã.

✔ Hỏi thăm
✔ Báo cô giáo

---

# Tuần 3 - Hỗ Trợ Cô Giáo

### Mission 1

Phát vở cho các bạn.

---

### Mission 2

Thu bài tập.

---

### Mission 3

Sắp xếp sách trong lớp.

---

# Tuần 4 - Tổ Chức Hoạt Động

### Mission 1

Chia nhóm học tập.

---

### Mission 2

Tổ chức trò chơi.

---

### Mission 3

Giải quyết mâu thuẫn nhỏ giữa các bạn.

---

# 4. GAMEPLAY MODES

## Mode 1 - Story Mode

Chơi theo cốt truyện.

---

## Mode 2 - Daily School

Mô phỏng một ngày đi học.

---

## Mode 3 - Quick Mission

Nhiệm vụ ngắn 3 phút.

---

## Mode 4 - Challenge Mode

Tình huống bất ngờ.

---

## Mode 5 - Free Classroom

Tự do quản lý lớp học.

---

# 5. HỆ THỐNG NHIỆM VỤ

## Mission

```typescript
interface Mission {
  id: string;
  title: string;
  description: string;
  type:
    | "attendance"
    | "organize"
    | "help_friend"
    | "teacher_support"
    | "leadership"
    | "decision";
  difficulty: number;
  reward: number;
}
```

---

## Student

```typescript
interface Student {
  id: string;
  name: string;
  avatar: string;
  happiness: number;
  friendship: number;
}
```

---

# 6. HỆ THỐNG QUAN HỆ

Mỗi bạn học sinh có:

* Mức độ yêu quý lớp trưởng
* Mức độ hợp tác
* Mức độ vui vẻ

---

Ví dụ:

```typescript
friendship: 0-100
happiness: 0-100
```

---

Quyết định của người chơi sẽ ảnh hưởng tới lớp học.

---

# 7. CLASS HAPPINESS SYSTEM

## Happiness Meter

0 - 100

---

Nếu:

> 80

Lớp học vui vẻ.

---

Nếu:

< 40

Nhiều sự cố xảy ra.

---

Nếu:

< 20

Xuất hiện Crisis Event.

---

# 8. RANDOM EVENT SYSTEM

Ví dụ:

### Bạn làm rơi hộp bút

Chọn:

* Giúp bạn nhặt
* Gọi cô giáo

---

### Hai bạn tranh giành đồ chơi

Chọn:

* Hòa giải
* Báo cô giáo

---

### Bạn mới chuyển trường

Chọn:

* Chào đón
* Giới thiệu với lớp

---

# 9. GAMEPLAY RULES

## Điểm

Hoàn thành nhiệm vụ:

+100

---

Lựa chọn tốt:

+50

---

Giúp bạn bè:

+75

---

Combo 5 nhiệm vụ:

+300

---

# 10. HỆ THỐNG SAO

⭐⭐⭐

Không mắc lỗi.

---

⭐⭐

Sai dưới 2 lần.

---

⭐

Hoàn thành nhiệm vụ.

---

# 11. ĐỒ HỌA

## Theme

Trường học vui vẻ.

---

## Màu sắc

* Sky Blue
* School Yellow
* Soft Green
* Light Orange
* Pastel Pink

---

## Font

Ưu tiên:

* Baloo 2
* Nunito

---

# 12. HIỆU ỨNG

## Thành công

* Confetti
* Star Burst
* Happy Students Animation

---

## Lớp học vui vẻ

* Các bạn cười
* Sticker xuất hiện

---

## Hoàn thành tuần học

* Trophy Animation
* School Celebration

---

# 13. AUDIO

Sử dụng:

* Web Audio API
* Web Speech API

---

Ví dụ:

"Cảm ơn lớp trưởng nhé!"

"Cô rất tự hào về con."

---

Âm thanh:

* Success
* Reward
* School Bell
* Classroom Ambience

---

# 14. ACHIEVEMENT SYSTEM

## Lớp Trưởng Gương Mẫu

Hoàn thành 20 nhiệm vụ.

---

## Người Bạn Tốt

Giúp đỡ 50 bạn học.

---

## Trợ Thủ Của Cô Giáo

Hoàn thành toàn bộ nhiệm vụ hỗ trợ giáo viên.

---

## Lớp Trưởng Xuất Sắc

Hoàn thành toàn bộ game.

---

# 15. STICKER COLLECTION

Mở khóa:

* 🎓 Huy hiệu lớp trưởng
* ⭐ Ngôi sao trách nhiệm
* 📚 Sổ đầu bài vàng
* 🏆 Cúp lớp trưởng xuất sắc
* ❤️ Trái tim bạn bè

---

# 16. PARENT DASHBOARD

Hiển thị:

* Thời gian chơi
* Kỹ năng đã học
* Tỷ lệ hoàn thành nhiệm vụ
* Điểm mạnh
* Điểm cần cải thiện

---

Thống kê theo:

* Trách nhiệm
* Hợp tác
* Lãnh đạo
* Giao tiếp

---

# 17. SOCIAL SKILL ENGINE

Xây dựng hệ thống đánh giá kỹ năng mềm.

```typescript
interface SkillProfile {
  responsibility: number;
  empathy: number;
  teamwork: number;
  communication: number;
  leadership: number;
}
```

---

Các quyết định trong game sẽ ảnh hưởng tới chỉ số này.

---

# 18. ADAPTIVE LEARNING

Nếu trẻ thường:

* Chọn đáp án sai

→ Giảm độ khó.

---

Nếu trẻ:

* Hoàn thành liên tục

→ Tăng độ phức tạp tình huống.

---

# 19. RESPONSIVE

Hỗ trợ:

* Mobile Portrait
* Mobile Landscape
* Tablet
* Desktop

Tối ưu:

* Touch
* Drag & Drop
* Large UI
* Accessibility

---

# 20. CẤU TRÚC SOURCE CODE

```text
src/
├── screens/
│   ├── StartScreen.tsx
│   ├── SchoolMapScreen.tsx
│   ├── MissionScreen.tsx
│   ├── ClassroomScreen.tsx
│   ├── ResultScreen.tsx
│   └── ParentDashboard.tsx
│
├── components/
│   ├── StudentCard.tsx
│   ├── MissionCard.tsx
│   ├── HappinessMeter.tsx
│   ├── ProgressBar.tsx
│   ├── AchievementPanel.tsx
│   └── StickerGallery.tsx
│
├── canvas/
│   ├── ClassroomCanvas.tsx
│   ├── CharacterLayer.tsx
│   ├── EventLayer.tsx
│   ├── ParticleLayer.tsx
│   └── ConfettiLayer.tsx
│
├── game/
│   ├── MissionEngine.ts
│   ├── SocialSkillEngine.ts
│   ├── ClassroomEngine.ts
│   ├── EventEngine.ts
│   ├── RewardEngine.ts
│   └── AchievementEngine.ts
│
├── hooks/
│   ├── useGameState.ts
│   ├── useStudents.ts
│   ├── useClassroom.ts
│   ├── useProgress.ts
│   └── useAchievements.ts
│
├── services/
│   ├── AudioManager.ts
│   ├── SpeechService.ts
│   ├── StorageService.ts
│   └── StatisticsService.ts
│
├── data/
│   ├── students.ts
│   ├── missions.ts
│   ├── events.ts
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
    ├── validation.ts
    └── adaptive.ts
```

---

# 21. DỮ LIỆU MẪU

Sinh sẵn:

* 100 học sinh mẫu
* 200 nhiệm vụ
* 100 tình huống lớp học
* 30 achievement
* 50 sticker

Không cần backend.

Lưu toàn bộ dữ liệu bằng Local Storage.

---

# 22. TÍNH NĂNG NÂNG CAO (BONUS)

## Classroom Builder

Cho phép:

* Trang trí lớp học
* Mở khóa vật phẩm mới
* Đổi giao diện lớp

---

## Weekly Report

Tạo báo cáo hàng tuần.

---

## Teacher Feedback System

Nhận nhận xét từ cô giáo AI.

---

## Offline First

Toàn bộ game hoạt động offline.

---

# 23. YÊU CẦU CHẤT LƯỢNG CODE

* TypeScript Strict Mode
* Functional Components
* Hooks Only
* Không memory leak
* Cleanup animation đúng chuẩn
* Responsive
* Hỗ trợ Touch Events
* Không phụ thuộc backend
* Dễ mở rộng nhiệm vụ
* Dễ mở rộng học sinh
* Dễ mở rộng tình huống giáo dục

---

# 24. YÊU CẦU CUỐI CÙNG

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

* 200 nhiệm vụ
* 100 tình huống lớp học
* Social Skill Engine
* Achievement System
* Parent Dashboard
* Classroom Builder
* Weekly Report

Đảm bảo trẻ em từ 5-8 tuổi vừa chơi vừa học kỹ năng trách nhiệm, giao tiếp, hợp tác và lãnh đạo một cách tự nhiên thông qua vai trò lớp trưởng.
