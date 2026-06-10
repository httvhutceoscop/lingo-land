---
name: lingo-land-game
description: Implementation guide để thêm một game mới vào codebase lingo-land. Dùng skill này sau khi đã có thiết kế game (tự viết hoặc từ skill educational-game-designer) và sẵn sàng viết code. Skill walk-through các nơi cần sửa (tạo View file mới, GameKey, GameCard entry, GAME_COMPONENTS registry trong App.tsx) sau khi app chuyển sang react-router (HashRouter) — routing/BGM/nav giờ tự động theo path, giúp chọn HTML vs Canvas vs Phaser, và tuân thủ convention localStorage / BGM / SFX của dự án.
---

# Lingo-Land — Hướng dẫn implement game mới

Skill này là **đối tác kỹ thuật** của `educational-game-designer`. Khi đã có thiết kế (mục tiêu học, độ tuổi, core loop, mechanics), skill này hướng dẫn cách wire game vào codebase chính xác và đúng convention.

> ⚠️ Trước khi bắt đầu, kiểm tra lại bằng việc đọc [CLAUDE.md](../../../CLAUDE.md), [src/App.tsx](../../../src/App.tsx), và [src/views/GameIslandsView.tsx](../../../src/views/GameIslandsView.tsx) để bắt mọi thay đổi convention gần đây — file này có thể đã cũ.

> 🧭 **App dùng `react-router-dom` v6 + `HashRouter`** (xem [src/main.tsx](../../../src/main.tsx)). Mỗi game ở Đảo Trò Chơi nằm tại route `/game/:key`. Việc dispatch không còn qua `switch pickGame()` + render thủ công nữa — giờ là **registry `GAME_COMPONENTS`** trong [App.tsx](../../../src/App.tsx). BGM, highlight bottom-nav, và nút Quay-lại đều tự động theo `pathname`, nên thêm game gọn hơn hẳn so với mô hình `view: View` cũ.

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

## Checklist: thêm 1 Game Island game

Chỉ còn **4 bước**, gói gọn trong 2 file ([GameIslandsView.tsx](../../../src/views/GameIslandsView.tsx) + [App.tsx](../../../src/App.tsx)) cộng file view mới. Routing, BGM, nav-highlight, và nút Quay-lại được lo tự động — KHÔNG còn `View` union, `GAME_ISLAND_VIEWS` set, `pickGame` switch, hay render thủ công như trước.

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

- `onBack` quay về Đảo Trò Chơi (`/games`). Bạn KHÔNG cần tự wire — `GameRoute` trong App.tsx truyền sẵn `onBack={() => navigate('/games')}`. Trong game chỉ cần gọi `onBack()`.
- Phaser-based: `export default function` được wrap bằng pattern dùng `useEffect` + ref `<div>` mount Phaser game; tham chiếu 3 view Phaser hiện có.
- Canvas-based: dùng `useRef<HTMLCanvasElement>` + `useEffect` setup RAF, cleanup trong return.

### Bước 2 — Mở rộng `GameKey` trong [src/views/GameIslandsView.tsx](../../../src/views/GameIslandsView.tsx)

```ts
export type GameKey = 'feedanimal' | 'count' | /* ... | */ 'mygame';
```

Thêm key mới vào cuối union để minimal-diff. `key` này chính là segment trong URL: `/game/mygame`.

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

### Bước 4 — Thêm vào `GAME_COMPONENTS` registry trong [src/App.tsx](../../../src/App.tsx)

Đây là chỗ duy nhất cần đụng trong App.tsx. Thêm 1 dòng vào object `GAME_COMPONENTS` (mapping `GameKey → component`) và import component ở đầu file:

```tsx
// đầu file App.tsx — static import nếu game nhẹ:
import MyGameView from './views/MyGameView';

// ...trong const GAME_COMPONENTS: Record<GameKey, ComponentType<{ onBack }>> = {
  // ...
  mygame: MyGameView,
// };
```

Route `/game/:key` (`GameRoute`) tự tra registry, tự bọc `Suspense`, tự truyền `onBack`. **Không cần** thêm `<Route>`, không cần render thủ công, không cần `pickGame`. (`GAME_COMPONENTS` là `Record<GameKey, …>` đầy đủ — quên một key sẽ lỗi typecheck ngay, đỡ quên thầm lặng như `GAME_ISLAND_VIEWS` cũ.)

**Nếu game nặng (Phaser ~1MB, hoặc asset SVG lớn) → lazy import:**

```tsx
const MyGameView = lazy(() => import('./views/MyGameView'));
// rồi vẫn: mygame: MyGameView,  trong GAME_COMPONENTS
```

`GameRoute` đã wrap mọi component trong `Suspense` với fallback `"Đang tải…"`, nên lazy game chạy ngay — KHÔNG tự thêm `<Suspense>`. (Muốn fallback đặc biệt như ColoringView "🎨 Đang tải tranh tô màu…" thì sửa hàm `gameFallback(key)` trong App.tsx.)

> `'challenge'` (TimeChallengeView) cũng chỉ là một `GameKey` trong registry, không có route đặc biệt — vào tại `/game/challenge`.

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
Đã handle theo path: vào route `/game/*` → `startBgm()`, rời → `stopBgm()` (một `useEffect` watch `useLocation().pathname` trong App.tsx). Không gọi tay. Vì game của bạn ở `/game/<key>`, BGM tự bật — không cần đăng ký thêm bất cứ đâu.

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

**BẮT BUỘC `React.lazy`** khi đăng ký trong `GAME_COMPONENTS` — phaser ~1MB.

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
1. Mở Đảo Trò Chơi từ map (`/games`).
2. Card mới hiển thị đúng nhóm tuổi (preschool/primary).
3. Tap card → URL đổi sang `/lingo-land/#/game/mygame`, vào game → nhạc BGM bật.
4. Chơi 1 vòng, đảm bảo SFX phản hồi đúng.
5. Nhấn nút Quay lại → về `/games` (Đảo Trò Chơi, KHÔNG về map), BGM tiếp tục.
6. Đi đến Map (qua BottomNav) → BGM dừng.
7. **Deep-link & reload**: dán thẳng `…/#/game/mygame` vào tab mới → vào đúng game. F5 reload tại game → vẫn ở game + state localStorage giữ đúng.
8. Mở DevTools → Application → Local Storage → tìm key `lingoland_<game>_*`.

**Không có test runner.** Verify thủ công là duy nhất.

## Trường hợp đặc biệt

### Game không vào Game Island (rare)
Nếu là ref tool, screen secondary (vd "đồng hồ" trong SideDrawer):
- KHÔNG thêm vào `GAMES`, `GameKey`, `GAME_COMPONENTS`.
- KHÔNG bật BGM tự động (BGM chỉ bật ở route `/game/*`).
- Cấp một route riêng cho nó (vd `/clock`) trong `<Routes>` của App.tsx, rồi thêm item gọi `navigate('/clock')` + đóng drawer trong SideDrawer. Xem [src/components/SideDrawer.tsx](../../../src/components/SideDrawer.tsx) và cách `/alphabet`, `/numbers` được wire.

### Game tham gia hệ unlock của Knowledge Island (rare)
- Đây là re-design lớn. Hỏi user trước.
- Cần thêm `SubGroup`, `mode: TestMode`, distractor pool, sticker reward — không đơn giản "thêm game".
- Xem section "Level progression" trong CLAUDE.md.

### Game lưu state phức tạp (vd record per-picture như ColoringView)
Bespoke shape OK. Đặt key dạng `lingoland_<game>` (không suffix), document shape ở comment đầu file view, encode/decode JSON với try/catch.

## Tránh

- ❌ Quên thêm vào `GAME_COMPONENTS` (route `/game/<key>` sẽ redirect về `/games`, game không mở được).
- ❌ Quên prefix `lingoland_` (key không bị reset).
- ❌ Phaser không lazy-load (initial bundle phình).
- ❌ Static import asset coloring/svg lớn → bundle.
- ❌ Tự thêm `<Suspense>` quanh game trong registry (GameRoute đã bọc sẵn — thừa).
- ❌ Tự viết BGM riêng cho game (đè lên loop chung).
- ❌ Đẩy progress vào GameContext khi không thuộc Knowledge Island.
- ❌ Animation chạy 60fps với `useState` thay vì `useRef` (lag re-render).
- ❌ `speak()` chain không đợi `onend` (speechSynthesis queue chết).
- ❌ Dùng leaderboard/tên thật/so sánh hơn-thua giữa trẻ (anti-pattern giáo dục).

## Tóm tắt mental model

1. Thiết kế xong (từ `educational-game-designer`) → quyết HTML/Canvas/Phaser → tạo view file (contract `{ onBack }`).
2. Wire 2 file: trong **GameIslandsView.tsx** thêm `GameKey` + `GAMES` card; trong **App.tsx** thêm 1 dòng vào `GAME_COMPONENTS` (+ import, `lazy` nếu nặng). Routing/BGM/nav/back tự động theo path.
3. Chọn localStorage suffix đúng (`_hs` / `_passed` / `_done`), prefix `lingoland_`.
4. BGM tự động (route `/game/*`). SFX: prefer `beep.ts` synthesize, dùng `<audio>` chỉ khi cần asset cố định.
5. `npm run typecheck` → `npm run dev` → verify thủ công trong browser (gồm deep-link & reload).
