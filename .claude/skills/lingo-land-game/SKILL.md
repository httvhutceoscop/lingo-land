---
name: lingo-land-game
description: Implementation guide để thêm một game mới vào codebase lingo-land. Dùng skill này sau khi đã có thiết kế game (tự viết hoặc từ skill educational-game-designer) và sẵn sàng viết code. Skill walk-through đầy đủ 7 nơi cần sửa (View union, GameKey, GAME_ISLAND_VIEWS, pickGame switch, App.tsx render, GameCard entry, View file mới), giúp chọn HTML vs Canvas vs Phaser, và tuân thủ convention localStorage / BGM / SFX của dự án.
---

# Lingo-Land — Hướng dẫn implement game mới

Skill này là **đối tác kỹ thuật** của `educational-game-designer`. Khi đã có thiết kế (mục tiêu học, độ tuổi, core loop, mechanics), skill này hướng dẫn cách wire game vào codebase chính xác và đúng convention.

> ⚠️ Trước khi bắt đầu, kiểm tra lại bằng việc đọc [CLAUDE.md](../../../CLAUDE.md), [src/App.tsx](../../../src/App.tsx), và [src/views/GameIslandsView.tsx](../../../src/views/GameIslandsView.tsx) để bắt mọi thay đổi convention gần đây — file này có thể đã cũ.

## Quyết định đầu tiên: HTML vs Canvas vs Phaser

| Tiêu chí | HTML + Tailwind | Canvas + RAF | Phaser |
|---|---|---|---|
| **Khi dùng** | UI dạng grid/list, quiz, ghép cặp, button-tap | Animation phức tạp, particle, drag với vật lý nhẹ, vẽ tự do | Game có scene, collision, sprite-sheet, physics engine cần |
| **Bundle cost** | 0 | 0 | ~1MB (đã lazy-load) |
| **Ví dụ trong repo** | `feedanimal`, `count`, `plus`, `matchpuzzle` | [DinoAlphabetView](../../../src/views/DinoAlphabetView.tsx), [FruitScaleView](../../../src/views/FruitScaleView.tsx), [TracerKidsView](../../../src/views/TracerKidsView.tsx) | [WhackMathView](../../../src/views/WhackMathView.tsx), [FruitRescueView](../../../src/views/FruitRescueView.tsx), [SpellingKingView](../../../src/views/SpellingKingView.tsx) |
| **State pattern** | React `useState` | `useRef` + RAF loop, render tự quản | Phaser scene state, React chỉ là container |
| **Lazy load?** | Không cần | Không cần | **BẮT BUỘC** (`React.lazy`) — phaser nặng |

**Quy tắc rút gọn:**
- Bắt đầu bằng HTML. Nếu cần >5 phần tử chuyển động song song hoặc drag-với-velocity → Canvas. Nếu cần collision/sprite/physics nghiêm túc → Phaser.
- Đừng dùng Phaser cho 1 màn quiz đơn giản — phí 1MB bundle.

## Checklist 7 bước: thêm 1 Game Island game

Mỗi bước có chi tiết bên dưới. Mọi bước đều BẮT BUỘC, thiếu 1 bước game sẽ hỏng theo cách khác nhau.

### Bước 1 — Tạo file view mới `src/views/<Tên>View.tsx`

Contract chuẩn:

```tsx
type Props = { onBack: () => void };

export default function MyGameView({ onBack }: Props) {
  // ... game state, UI
  return (
    <div className="min-h-screen ...">
      <button onClick={onBack}>← Quay lại</button>
      {/* game UI */}
    </div>
  );
}
```

- `onBack` luôn quay về `gameisland` (KHÔNG về `map`) — đã xử lý trong App.tsx.
- Phaser-based: `export default function` được wrap bằng pattern dùng `useEffect` + ref `<div>` mount Phaser game; tham chiếu 3 view Phaser hiện có.
- Canvas-based: dùng `useRef<HTMLCanvasElement>` + `useEffect` setup RAF, cleanup trong return.

### Bước 2 — Mở rộng `GameKey` trong [src/views/GameIslandsView.tsx](../../../src/views/GameIslandsView.tsx)

```ts
export type GameKey = 'feedanimal' | 'count' | /* ... | */ 'mygame';
```

Thêm key mới vào cuối union để minimal-diff.

### Bước 3 — Thêm entry vào `GAMES: GameCard[]` (cùng file)

```ts
{
  key: 'mygame',
  emoji: '🎯',
  title: 'Tên Tiếng Việt',
  subtitle: 'Một câu mô tả ngắn',
  gradient: 'from-orange-400 to-pink-500',
  shadow: 'shadow-orange-300',
  age: 'preschool', // hoặc 'primary' — bắt buộc, AgeGroup type
}
```

- `gradient` / `shadow` lấy từ Tailwind, ưu tiên gradient chưa dùng để game nổi bật.
- `age`: `'preschool'` cho 1-5t, `'primary'` cho 6-10t. View sẽ render game theo nhóm tuổi.
- `emoji` đại diện hoạt động cốt lõi, không chỉ trang trí.

### Bước 4 — Mở rộng `View` union trong [src/App.tsx](../../../src/App.tsx)

```ts
type View = 'map' | 'knowledge' | /* ... | */ 'mygame';
```

`View` là superset của `GameKey` cho Game Island view names. Tên view = key game (lowercase, không space).

### Bước 5 — Thêm vào `GAME_ISLAND_VIEWS` Set (cùng file App.tsx)

```ts
const GAME_ISLAND_VIEWS = new Set<View>([
  'feedanimal',
  // ...
  'mygame',
]);
```

**Đây là bước hay quên nhất.** Nếu thiếu:
- BGM sẽ KHÔNG tự bật/tắt khi vào game.
- BottomNav sẽ không highlight `'map'` (active state lỗi).

### Bước 6 — Thêm `case` vào `pickGame(key)` trong App.tsx

```ts
case 'mygame': setView('mygame'); break;
```

### Bước 7 — Thêm conditional render trong App.tsx

```tsx
{view === 'mygame' && <MyGameView onBack={() => setView('gameisland')} />}
```

**Import:** ở đầu file App.tsx. Nếu game không phải Phaser và không nặng asset → static import. Nếu nặng → lazy:

```tsx
const MyGameView = lazy(() => import('./views/MyGameView'));

// Trong JSX:
<Suspense fallback={<div className="...">Đang tải…</div>}>
  <MyGameView onBack={() => setView('gameisland')} />
</Suspense>
```

## localStorage: chọn đúng suffix

Convention từ CLAUDE.md (`lingoland_<game>_<suffix>`):

| Suffix | Khi dùng | Shape | Ví dụ |
|---|---|---|---|
| `_hs` | High score per phiên (replay nhiều lần) | `number` (string-encoded) | `lingoland_count_hs` |
| `_passed` | Game/level pass/fail (boolean tập) | JSON `string[]` hoặc `boolean` | `lingoland_codekingdom_passed` |
| `_done` | Once-and-done, completion record | JSON `boolean` hoặc record | `lingoland_dinoalphabet_done` |

**Cách chọn:**
- Có thể chơi lại để cải thiện điểm → `_hs`
- Mỗi màn pass/fail, không cải thiện điểm → `_passed`
- Hoàn thành xong là xong, không replay → `_done`

**BẮT BUỘC prefix `lingoland_`** — Profile reset button gọi `localStorage.clear()` nên key sai prefix sẽ không bị clear → state rác.

Helper pattern (đặt trong file view):

```ts
const KEY = 'lingoland_mygame_hs';
const loadHs = (): number => {
  try { return parseInt(localStorage.getItem(KEY) ?? '0', 10) || 0; }
  catch { return 0; }
};
const saveHs = (n: number) => {
  try { localStorage.setItem(KEY, String(n)); } catch {}
};
```

Nếu game **xứng đáng** vào hệ thống GameContext (score / streak / SRS chung): suy nghĩ lại — Game Island về nguyên tắc tách biệt. Chỉ Knowledge Island mới tham gia score chung. Đừng "kéo" Game Island vào `addScore` trừ khi có lý do rõ ràng.

## Audio: chọn đúng API

### BGM (tự động)
Đã handle: vào view trong `GAME_ISLAND_VIEWS` → `startBgm()`, rời → `stopBgm()`. Không gọi tay.

Tắt cho user: env var `VITE_BGM_ENABLED=false`. Đừng thêm UI tắt nhạc trong game riêng — đã có cơ chế global.

### SFX ngắn (reaction cues)

Ưu tiên **synthesize** qua [src/lib/beep.ts](../../../src/lib/beep.ts) — không cần thêm asset:

```ts
import { playTing, playBip, playPop, playMiss } from '../lib/beep';

playTing();  // đúng / win nhỏ
playBip();   // sai / tap nhầm
playPop();   // tap UI
playMiss();  // bỏ lỡ target
```

### SFX dài / asset cố định
Dùng `<audio>` trong [index.html](../../../index.html) + `playSfx('snd-xxx')` từ [src/lib/audio.ts](../../../src/lib/audio.ts):

```ts
import { playSfx } from '../lib/audio';
playSfx('snd-correct');
```

Nếu thêm `<audio>` mới với source off-origin → cập nhật `runtimeCaching` trong [vite.config.ts](../../../vite.config.ts) để PWA offline vẫn chạy.

### Voice / Speech
```ts
import { speak, LANG_SPEAK_DEFAULT } from '../lib/audio';

speak('Con voi', LANG_SPEAK_DEFAULT); // tiếng Việt
speak('elephant'); // tiếng Anh mặc định 'en-US'
```

Đừng chain nhiều `speak()` liên tiếp — speechSynthesis queue có thể đứng. Một câu, đợi `onend`, rồi câu kế tiếp nếu cần.

## Phaser game: pattern bắt buộc

```tsx
import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

export default function MyPhaserGame({ onBack }: { onBack: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 360, height: 640,
      backgroundColor: '#...',
      scene: { /* MyScene */ },
      // ⚠️ KHÔNG dùng audio config của Phaser cho BGM —
      // dự án đã có BGM riêng qua bgm.ts. Dùng beep.ts cho SFX.
    });
    gameRef.current = game;
    return () => { game.destroy(true); gameRef.current = null; };
  }, []);

  return (
    <div className="min-h-screen ...">
      <button onClick={onBack}>← Quay lại</button>
      <div ref={containerRef} />
    </div>
  );
}
```

**BẮT BUỘC `React.lazy`** trong App.tsx — phaser ~1MB.

## Canvas + RAF: pattern bắt buộc

```tsx
useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let rafId = 0;
  const tick = () => {
    // update + draw
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);

  return () => cancelAnimationFrame(rafId);
}, []);
```

State game (vị trí, vận tốc, sprite frame) đặt trong `useRef` thay vì `useState` để tránh re-render mỗi frame.

## Kiểm tra cuối: chạy gì trước khi báo "done"

```bash
npm run typecheck   # gate duy nhất — phải pass
npm run dev         # mở http://localhost:5173/lingo-land/
```

**Test trong browser:**
1. Mở Đảo Trò Chơi từ map.
2. Card mới hiển thị đúng nhóm tuổi (preschool/primary).
3. Tap card → vào game → nhạc BGM bật.
4. Chơi 1 vòng, đảm bảo SFX phản hồi đúng.
5. Nhấn nút Quay lại → về `gameisland` (KHÔNG về `map`), BGM tiếp tục.
6. Đi đến Map (qua BottomNav) → BGM dừng.
7. F5 reload → state localStorage giữ đúng (nếu game có persist).
8. Mở DevTools → Application → Local Storage → tìm key `lingoland_<game>_*`.

**Không có test runner.** Verify thủ công là duy nhất.

## Trường hợp đặc biệt

### Game không vào Game Island (rare)
Nếu là ref tool, screen secondary (vd "đồng hồ" trong SideDrawer):
- KHÔNG thêm vào `GAMES`, `GameKey`, `GAME_ISLAND_VIEWS`.
- KHÔNG bật BGM tự động.
- Thêm vào SideDrawer items thay vì Game Island grid. Xem [src/components/SideDrawer.tsx](../../../src/components/SideDrawer.tsx).

### Game tham gia hệ unlock của Knowledge Island (rare)
- Đây là re-design lớn. Hỏi user trước.
- Cần thêm `SubGroup`, `mode: TestMode`, distractor pool, sticker reward — không đơn giản "thêm game".
- Xem section "Level progression" trong CLAUDE.md.

### Game lưu state phức tạp (vd record per-picture như ColoringView)
Bespoke shape OK. Đặt key dạng `lingoland_<game>` (không suffix), document shape ở comment đầu file view, encode/decode JSON với try/catch.

## Tránh

- ❌ Quên `GAME_ISLAND_VIEWS` (BGM hỏng câm lặng).
- ❌ Quên prefix `lingoland_` (key không bị reset).
- ❌ Phaser không lazy-load (initial bundle phình).
- ❌ Static import asset coloring/svg lớn → bundle.
- ❌ Tự viết BGM riêng cho game (đè lên loop chung).
- ❌ Đẩy progress vào GameContext khi không thuộc Knowledge Island.
- ❌ Animation chạy 60fps với `useState` thay vì `useRef` (lag re-render).
- ❌ `speak()` chain không đợi `onend` (speechSynthesis queue chết).
- ❌ Dùng leaderboard/tên thật/so sánh hơn-thua giữa trẻ (anti-pattern giáo dục).

## Tóm tắt mental model

1. Thiết kế xong (từ `educational-game-designer`) → quyết HTML/Canvas/Phaser → tạo view file.
2. Wire 7 chỗ: GameKey, GAMES card, View union, GAME_ISLAND_VIEWS, pickGame switch, App.tsx render, import (+ lazy nếu cần).
3. Chọn localStorage suffix đúng (`_hs` / `_passed` / `_done`), prefix `lingoland_`.
4. BGM tự động. SFX: prefer `beep.ts` synthesize, dùng `<audio>` chỉ khi cần asset cố định.
5. `npm run typecheck` → `npm run dev` → verify thủ công trong browser.
