# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — runs `tsc --noEmit` then `vite build`; emits to `dist/`
- `npm run typecheck` — type-check only
- `npm run preview` — preview the production build locally

No test runner / linter / formatter is configured. `npm run typecheck` is the only static-analysis gate; it runs as part of `build`, so a green build implies a clean TS compile.

## Deployment

GitHub Pages via [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml) on push to `main`. The site is served at `https://vietnt.github.io/lingo-land/`, so [vite.config.ts](vite.config.ts) sets `base: '/lingo-land/'`. If you rename the repo, update `base` **and** the PWA manifest's `scope` / `start_url` (both are `/lingo-land/`) — otherwise built assets 404 and the installed PWA loses its session.

## Env vars (Vite)

`.env.example` shows the public env contract; both are optional.

- `VITE_GOOGLE_TAG` — gtag ID. If set, a custom Vite plugin (`googleTagPlugin` in [vite.config.ts](vite.config.ts)) injects the gtag.js snippet into `index.html` at build time. Leave empty for local/dev.
- `VITE_BGM_ENABLED` — set to `'false'` to disable background music globally; any other value (or unset) keeps BGM on. Checked once at module load in [src/lib/bgm.ts](src/lib/bgm.ts).

## PWA

Configured via `vite-plugin-pwa` in [vite.config.ts](vite.config.ts) with `registerType: 'autoUpdate'` — the SW is auto-registered (injected `registerSW.js`) and silently updates on next reload. Icons live in `public/` as SVG (`icon.svg`, `icon-maskable.svg`, `favicon.svg`). Apple touch icon + theme-color meta are in [index.html](index.html).

Runtime caching (workbox `CacheFirst`) is set up for the three external origins this app depends on: `cdn.tailwindcss.com`, Google Fonts, and `assets.mixkit.co` (SFX). Without these caches the app breaks offline because Tailwind is CDN-loaded (see Styling section). Add a new `runtimeCaching` entry if you introduce another external origin.

## Architecture

LingoLand is a single-page Vietnamese-language English vocabulary game **plus a kids' mini-game collection**. React 18 + TypeScript + Vite. Routing via **`react-router-dom` v6 with `HashRouter`** (hash URLs work on GitHub Pages with no SPA-fallback hack and survive PWA reloads). No test framework, no CSS pipeline.

### URL routing lives in App.tsx (HashRouter)

`HashRouter` wraps the tree in [src/main.tsx](src/main.tsx) (`HashRouter > GameProvider > App`). [src/App.tsx](src/App.tsx) declares the `<Routes>` table. URLs look like `/lingo-land/#/game/traffichero`. There is no longer a `view: View` union or `pickGame()` switch — those were replaced by routes + a registry. The route table:

- `/` → MapView (hub) · `/games` → GameIslandsView · `/game/:key` → individual Game Island game
- `/knowledge` → KnowledgeIslandsView · `/category/:categoryId` (`Category.id`, a number)
- `/learn/:subGroupId/flashcard` · `/learn/:subGroupId/test` · `/learn/:subGroupId/result` (`subGroupId` is `SubGroup.id` like `animals.pets`, resolved via `findSubGroup`)
- `/math` → MathLandView · `/math/:levelId` (`MathLevel.id` like `math.plus.5`)
- `/review` · `/leaderboard` · `/profile` · `/stickers` · `/pronunciation` · `/alphabet` · `/numbers`
- `*` → redirect to `/`

**Game Island games are dispatched by a registry, not per-view JSX.** `GAME_COMPONENTS: Record<GameKey, ComponentType<{ onBack }>>` in [App.tsx](src/App.tsx) maps every `GameKey` to its component; the `/game/:key` route (`GameRoute`) looks up the component, wraps it in `Suspense` (lazy games included), and passes `onBack={() => navigate('/games')}`. An unknown `:key` redirects to `/games`. **Adding a Game Island game now needs just: an entry in `GAME_COMPONENTS` + a card in `GAMES` ([GameIslandsView](src/views/GameIslandsView.tsx)).** No `View` union / `pickGame` / conditional-render edits anymore. (`'challenge'`/TimeChallengeView is a `GameKey` like any other, reached at `/game/challenge`.)

The 7 vocab mini-games are likewise dispatched by a `TEST_COMPONENTS: Record<TestMode, …>` registry inside `TestRoute`, keyed off `subGroup.mode`.

**Deep-linkable state**: category id, sub-group id, and math level id all live in the URL, so refresh/share preserves the screen. The one exception is `/learn/:subGroupId/result` — `QuizResult` is passed via `navigate(..., { state: { result } })` (history state, not the URL), so a hard refresh of the result page has no result and `ResultRoute` redirects back to `/category/:id`.

**BGM** is started/stopped by a `useEffect` watching `useLocation().pathname` — on when `pathname.startsWith('/game/')` (covers every Game Island game incl. `/game/challenge`), off otherwise. **Bottom-nav highlight** comes from `navKeyForPath(pathname)`: `/leaderboard`→`leader`, `/pronunciation`→`pron`, `/profile`+`/stickers`→`profile`, everything else→`map`. `NAV_PATHS` maps each `NavKey` back to its path for `onNavigate`.

**MapView is a hub**, not the category picker. [MapView](src/views/MapView.tsx) renders four cards: Daily Review (conditional on `dueDeck.length > 0`), Đảo Tri Thức (→ [KnowledgeIslandsView](src/views/KnowledgeIslandsView.tsx)), Đảo Toán Học (→ [MathLandView](src/views/MathLandView.tsx)), Đảo Trò Chơi (→ [GameIslandsView](src/views/GameIslandsView.tsx)). The 60-second time challenge is **not** a top-level card anymore — it lives inside Game Island. Categories (`CATEGORIES`) are listed inside `KnowledgeIslandsView`, not on the map.

The `test` view dispatches to one of 7 mini-game components based on `activeSubGroup.mode` (`TestMode` in [src/data/gameData.ts](src/data/gameData.ts)): [QuizView](src/views/QuizView.tsx), [MatchingView](src/views/MatchingView.tsx), [ListeningView](src/views/ListeningView.tsx), [TypingView](src/views/TypingView.tsx), [MemoryView](src/views/MemoryView.tsx), [HangmanView](src/views/HangmanView.tsx), [ShadowView](src/views/ShadowView.tsx). All 7 share the contract `(words: Word[], onFinish: (r: QuizResult) => void, onExit: () => void)` — keep that shape if you add an 8th mode. `onExit` should be wired to [TestExitButton](src/components/TestExitButton.tsx), the shared "✕ Thoát" widget that shows a confirm modal before discarding mid-test progress. Completion-gated modes (matching, memory, shadow) always emit a 100% pass since the user must complete every pair/round to exit (shadow advances only on a correct drag-drop; wrong drops just shake and stay on the current round). Hangman emits `correct/total` where each word is a win/lose round (6 wrong-letter limit).

`BottomNav` exposes `'map' | 'pron' | 'leader' | 'profile'` (see `NavKey` in [src/components/BottomNav.tsx](src/components/BottomNav.tsx)); the active highlight is computed by `navKeyForPath(pathname)` in [App.tsx](src/App.tsx) — `/leaderboard`→`leader`, `/pronunciation`→`pron`, `/profile`+`/stickers`→`profile`, and every other path (the whole learning flow, math, review, all Game Island routes) collapses to `map`. `/stickers` is reached only via a button inside ProfileView, not the nav.

A right-side **slide-in drawer** ([SideDrawer](src/components/SideDrawer.tsx)) is mounted at the App container level (not BottomNav) and toggled via a ☰ button in [Header](src/components/Header.tsx). It hosts secondary tap-to-speak reference tools that don't deserve a bottom-nav slot: [AlphabetView](src/views/AlphabetView.tsx) (26 letters A-Z, examples drawn from `ALL_WORDS`) and [NumberView](src/views/NumberView.tsx) (0-10 / 11-19 / 20-90 / 100-1000 grouped sections; data in [src/data/numberData.ts](src/data/numberData.ts)). The drawer is `fixed`-positioned (viewport-scoped), locks body scroll while open, closes on backdrop tap / ✕ button / Escape key, and uses Tailwind's `translate-x-full ↔ translate-x-0` transition. Items inside the drawer should `navigate(...)` to the target route AND close the drawer in one tap handler.

### Lazy loading

Four views are loaded via `React.lazy` + `Suspense` in [App.tsx](src/App.tsx). All other views are statically imported.

- [ColoringView](src/views/ColoringView.tsx) — pulls in the entire coloring SVG set (auto-imported via `import.meta.glob('../assets/coloring/*.svg')` in [src/data/coloringData.ts](src/data/coloringData.ts)) plus the SVG parsing/render path.
- [WhackMathView](src/views/WhackMathView.tsx), [FruitRescueView](src/views/FruitRescueView.tsx), [SpellingKingView](src/views/SpellingKingView.tsx) — these are the **Phaser-based** games. `phaser` (~1 MB) is a runtime dependency only because of these three; keep them lazy so the dep doesn't land in the initial bundle. Their `Suspense` fallback is a plain `"Đang tải…"` div; ColoringView's fallback is a longer "🎨 Đang tải tranh tô màu…" message.

If you add another asset-heavy or Phaser-based screen, follow the same pattern: `const X = lazy(() => import('./views/X'))` with a Vietnamese-text Suspense fallback.

### Game state: Context + localStorage

[src/context/GameContext.tsx](src/context/GameContext.tsx) owns `score`, `streak`, `unlockedSubGroups`, `passedSubGroups` (both `string[]` of sub-group IDs like `'animals.pets'`), `petName` (string), `timeHighScore`, `wordStats`, `mathPassed`. Exposes `addScore`, `unlockNext`, `markPassed`, `isUnlocked`, `isPassed`, `setPetName`, `submitTimeScore`, `addWordsToSRS`, `recordReview`, `isMathPassed`, `isMathUnlocked`, `markMathPassed`, plus the memoized `dueDeck` selector. **Unlocked ≠ passed**: a sub-group is unlocked the moment its predecessor passes (or it's the first in its category), and passed only after the user themselves clears it. Stickers, the KnowledgeIslandsView progress bar, ProfileView's "Tiến độ tổng quát", AND the pet stage all key off `passedSubGroups`. State is hydrated from and synced back to `localStorage` under these exact keys:

- `lingoland_score`
- `lingoland_streak`
- `lingoland_subgroups_v2` (JSON `string[]` of unlocked sub-group IDs; default = first sub-group of every category). On load, `loadUnlocked` **merges in the first sub-group of every category** so that categories added after a user's first visit show up unlocked instead of staying invisible.
- `lingoland_passed_v2` (JSON `string[]` of passed sub-group IDs; default `[]`)
- `lingoland_pet_name` (string, default `'Bí'`, max 16 chars via `setPetName`)
- `lingoland_time_hs` (integer high score for the 60-second time challenge; only ever increases via `submitTimeScore`)
- `lingoland_word_stats` (JSON `Record<wordEn, { level, lastSeen }>` for spaced-repetition state; keys are `Word.en` strings)
- `lingoland_math_passed` (JSON `string[]` of passed math level IDs like `'math.symbols'`, `'math.plus.10'`)

Game Island views own **their own** storage keys (not exposed via GameContext). Naming is ad-hoc — there are three suffix conventions in use, pick whichever fits:

- `*_hs` for per-session high scores (integer). Examples: `lingoland_count_hs`, `lingoland_plus_hs`, `lingoland_subtract_hs`, `lingoland_match_hs`, `lingoland_sequence_hs`, `lingoland_time_hs`, `lingoland_fruitrescue_hs`, `lingoland_greenknight_hs`, `lingoland_mathrescue_hs`, `lingoland_ocean_hs`, `lingoland_spelling_hs`, `lingoland_whackmath_hs`, `lingoland_bubbleletter_hs`.
- `*_passed` for boolean "this game/level cleared" sets, JSON-encoded. Examples: `lingoland_codekingdom_passed`, `lingoland_connectdots_passed`, `lingoland_ecobalance_passed`, `lingoland_lightengineer_passed`, `lingoland_traintrack_passed`.
- `*_done` for once-and-done completion records. Examples: `lingoland_dinoalphabet_done`, `lingoland_feedcount_done`, `lingoland_fruitscale_done`, `lingoland_tracer_done`.
- A handful of games (`detective`, `magic`, `marspack`, `riverrescue`) use a bespoke single-key shape — grep their view file before assuming.

Plus the special-shape one: `lingoland_coloring` ([ColoringView](src/views/ColoringView.tsx)) — JSON `Record<pictureId, Record<regionId, hexColor>>`. Persists per-region fill choices across sessions.

To see every key currently in use: `grep -hoE "lingoland_[a-z_]+" src/views/*.tsx src/context/*.tsx | sort -u`.

On mount, GameContext removes the legacy key `lingoland_levels` (old `number[]` format) — that one-shot migration can be deleted once you're confident no users have stale state.

`useGame()` throws if used outside `GameProvider`. The Profile screen's "reset" button does `localStorage.clear()` + `location.reload()`, so any new persisted keys should use the `lingoland_` prefix to stay consistent and get cleared together (including the game-island keys above).

### Level progression (Knowledge Island)

Data is static in [src/data/gameData.ts](src/data/gameData.ts) as `CATEGORIES: Category[]`, each with `subGroups: SubGroup[]`. A `SubGroup` has a stable `id` (used in localStorage), a `mode: TestMode` (which mini-game runs after the flashcard study), and 4-6 `words`.

Categories are always open. Within each category, sub-groups unlock **sequentially**: only the first is unlocked by default; passing one (`correct >= total * 0.7` in [ResultView](src/views/ResultView.tsx)) calls `markPassed(id)` then `unlockNext(currentId)`, which uses `nextSubGroupId()` from gameData to find the next sub-group in the **same** category. Last-in-category passes are a no-op for unlock but still mark the sub-group as passed (so the user gets the sticker).

Stickers are surfaced through [StickersView](src/views/StickersView.tsx) — a gallery of every sub-group icon, locked ones rendered as 🔒 with `???` label. Reachable from a button inside [ProfileView](src/views/ProfileView.tsx), not the bottom nav.

### Spaced repetition (Daily Review)

[src/data/srsData.ts](src/data/srsData.ts) defines a 4-level Leitner-style schedule with intervals `[1, 3, 7, 14]` days. Word-keyed state lives in [GameContext](src/context/GameContext.tsx) as `wordStats: Record<wordEn, { level, lastSeen }>` plus a memoized `dueDeck: Word[]` selector (filters `ALL_WORDS` where `isDue(stat)`, sorts by oldest `lastSeen`, caps at 10 = `DAILY_CAP`).

Entry points to the system:
1. **First pass of a sub-group** ([ResultView](src/views/ResultView.tsx)) → `addWordsToSRS(subGroup.words)` adds each word at level 0, `lastSeen=now`. Re-passing the same sub-group is a no-op (only adds words NOT already in stats).
2. **Daily review session** ([DailyReviewView](src/views/DailyReviewView.tsx)) → for each answered word calls `recordReview(wordEn, correct)` which sets new `lastSeen=now` and `level = correct ? min(level+1, 3) : 0` (a single wrong answer resets the word to the start of the schedule — strict but matches Leitner spirit).

The MapView card for daily review is **conditional on `dueDeck.length > 0`** — if nothing is due, the card disappears and only the three island cards show. First-time users see no review card until their first pass + the level-0 interval (1 day) elapses. To test locally without waiting, edit `lingoland_word_stats` in DevTools and rewind a `lastSeen` value, then refresh.

DailyReviewView snapshots `dueDeck` into local state at mount (`useState(() => dueDeck)`) so the session list does NOT shrink mid-session as `recordReview` updates `wordStats` (which causes `dueDeck` to recompute). Each correct answer pays `addScore(+10)` — half of a regular test answer, since review is easier and recurrent.

### Math Land (off-path)

[MathLandView](src/views/MathLandView.tsx) + [MathQuizView](src/views/MathQuizView.tsx) implement a standalone arithmetic mode reached from the indigo→purple→pink Đảo Toán Học card on MapView. **Not** wired into the `Word`/SubGroup/sticker/SRS systems — math has its own progression state (`mathPassed: string[]` in GameContext) and storage key (`lingoland_math_passed`).

Level catalog lives in [src/data/mathData.ts](src/data/mathData.ts) as `MATH_LEVELS: MathLevel[]` — 7 entries total: 1 symbol recognition intro (`math.symbols`, 5 questions covering +/−/×/:/=) followed by 6 compute levels (`math.plus.5` ↔ `math.minus.20`, 10 questions each). Levels unlock **sequentially**: `isMathUnlocked(id)` returns true iff the previous level in `MATH_LEVELS` order is passed (or `id` is the first). Pass rule mirrors regular tests: `correct >= total * 0.7`.

`generateQuestions(level)` returns `MathQuestion[]` discriminated as `'symbol' | 'compute'`:
- **symbol**: pick distinct entries from `SYMBOLS` (5 total), each question shows the glyph (uses `×` and `:` literally — not `x` and `÷` — to match Vietnamese textbook convention) and offers 4 Vietnamese name options.
- **compute**: addition picks `a ∈ [0, range]`, `b ∈ [0, range - a]` so `a + b ≤ range` (no overflow). Subtraction picks `a ∈ [0, range]`, `b ∈ [0, a]` so result is never negative. `buildNumberOptions(answer, range)` samples 3 distractors at `answer ± [1..3]` clamped to a safe range; falls back to filling with low numbers if the candidate pool is too small (matters only for `range=5`).

MathQuizView has 2 phases (`'playing' | 'done'`) — no intro screen (children don't need a click delay). On `'done'`, if pass: confetti (indigo/purple/pink palette) + `markMathPassed(id)`. The `restart` button regenerates the deck via `generateQuestions(level)` again so each replay is fresh. `addScore(+10)` per correct answer (same rate as Daily Review).

### Game Island (off-path mini-game collection)

[GameIslandsView](src/views/GameIslandsView.tsx) is reached from the pink→fuchsia→blue Đảo Trò Chơi card on MapView. It lists **~50 standalone kids' games** keyed by `GameKey` (exported from the same file). Each entry is a `GameCard` carrying `key`, `emoji`, `title`, `subtitle`, `gradient`, `shadow`, and an `AgeGroup` tag of either `'preschool'` (1-5 yrs: tap / drag / colour / count) or `'primary'` (6-10 yrs: arithmetic, reading, logic, spatial). The grid is rendered grouped by age. The full canonical list of games + emojis + Vietnamese titles lives in the `GAMES: GameCard[]` array in [GameIslandsView](src/views/GameIslandsView.tsx) — treat that file as the source of truth rather than duplicating the list here.

Three broad implementation styles coexist:
- **HTML/Tailwind**: ordinary React components with React state for game flow (most of the older games — `feedanimal`, `count`, `plus`, `subtract`, `compare`, `matchpuzzle`, `sequence`, `numberpop`, etc.).
- **`<canvas>` + RAF**: hand-rolled 2D rendering for richer animation (e.g. [DinoAlphabetView](src/views/DinoAlphabetView.tsx), [FruitScaleView](src/views/FruitScaleView.tsx), [TracerKidsView](src/views/TracerKidsView.tsx)). These usually keep gameplay state in refs (not React state) and run a single `requestAnimationFrame` loop.
- **Phaser**: [WhackMathView](src/views/WhackMathView.tsx), [FruitRescueView](src/views/FruitRescueView.tsx), [SpellingKingView](src/views/SpellingKingView.tsx) embed a Phaser 4 scene inside the React tree. These three are the **only** consumers of the `phaser` runtime dep and are lazy-loaded for that reason (see Lazy loading).

**None** of these participate in the Knowledge Island unlock/sticker/SRS systems. There's no cross-game progression: each game owns its own internal phase machine (typically `'idle' | 'playing' | 'finished'`) and persists state under its own `lingoland_*` key — three suffix conventions are in use (`_hs` / `_passed` / `_done`); see the localStorage section. [ColoringView](src/views/ColoringView.tsx) is the exception — it persists per-picture fills, not a score.

Routing/back behaviour: each Game Island view receives `onBack` (wired to `navigate('/games')`, so back returns to the island list, not the map). Dispatch happens via the `GAME_COMPONENTS` registry + `/game/:key` route in [App.tsx](src/App.tsx) (see "URL routing" above) — adding a game needs only a `GAME_COMPONENTS` entry **and** a `GAMES` card entry here; BGM and nav-collapse are path-based now and need no per-game wiring.

### Background music

[src/lib/bgm.ts](src/lib/bgm.ts) hand-synthesizes a chip-tune-style loop using the WebAudio API (no audio assets — oscillators + a noise click for accents, no bundle/network cost beyond the code itself). `startBgm()` lazily initializes a shared `AudioContext` on first call (browsers block AudioContext until a user gesture, and the first call typically follows a tap), schedules notes ~300 ms ahead via `setInterval`, ramps the master gain from 0 → `MASTER_GAIN` over 0.4s, and alternates between two 16-step melodies (`MELODY_A` / `MELODY_B`). `stopBgm()` ramps the master gain back to 0 and clears the scheduler; the context is kept alive for the next start.

BGM is scoped to **Game Island views only** (the `GAME_ISLAND_VIEWS` set in [App.tsx](src/App.tsx) — every Game Island view including `'challenge'`). Entering one of those views starts the loop; leaving stops it. Knowledge tests, Math Land, daily review, and reference screens stay silent. Disable globally with `VITE_BGM_ENABLED=false`.

### In-game SFX synthesis

Two adjacent files complement the HTML `<audio>` element approach in [src/lib/audio.ts](src/lib/audio.ts), generating sound entirely from WebAudio so no extra network requests / mixkit dependency is needed:

- [src/lib/beep.ts](src/lib/beep.ts) — short oscillator-based effects shared by reflex games: `playTing` (correct), `playBip` (wrong tap), `playMiss` (missed target), `playChomp`, `playPop`, `playEggCrack`. Lazily creates a shared `AudioContext` on first call. Prefer these over adding new `<audio>` tags for short reaction cues.
- [src/lib/trainSounds.ts](src/lib/trainSounds.ts) — train-themed loops/whistles for [TrainTrackPuzzleView](src/views/TrainTrackPuzzleView.tsx).

### Pet mascot

A virtual pet (`🥚 → 🐣 → 🐤 → 🐥 → 🐔`) lives in [src/data/petData.ts](src/data/petData.ts) and evolves based on `passedSubGroups.length` thresholds (0, 3, 7, 12, 18). The pet icon + custom `petName` show in [Header](src/components/Header.tsx) on every screen, replacing what used to be the static "L" logo. [ProfileView](src/views/ProfileView.tsx) shows a big pet card with editable name, tap-to-bounce animation, and a progress bar to the next stage. [ResultView](src/views/ResultView.tsx) snapshots `passedSubGroups.length` at mount (via `useState(() => ...)`) so it can detect if the just-finished pass triggers an evolution — if yes, it shows a purple "đã tiến hoá!" banner with an extra confetti burst. The snapshot pattern is important: by the time `markPassed` flushes, `passedSubGroups` already includes the new ID, so we'd otherwise miss the transition.

Scoring (`addScore(20)` per correct answer) happens inside each Knowledge Island mini-game as the user answers, *not* on the result screen. Daily Review and Math Land pay `+10` per correct answer instead.

Distractor pool: [QuizView](src/views/QuizView.tsx) and [ListeningView](src/views/ListeningView.tsx) sample wrong answers from `ALL_WORDS` (a precomputed flatten of every sub-group's words) — adding a sub-group changes the distractor pool for every quiz/listening test.

### Styling and assets are CDN/inline, not bundled

[index.html](index.html) loads Tailwind via `cdn.tailwindcss.com` and Google Fonts, and defines all custom CSS (`perspective-1000`, `card-inner`, `flipped`, `floating`, `progress-bar`, `island-node`, `locked`) in an inline `<style>` block. There is **no** PostCSS / Tailwind config in the repo. To add a custom class, edit the `<style>` block in `index.html`.

Sound effects are `<audio>` elements in `index.html` with fixed IDs (`snd-correct`, `snd-wrong`, sourced from `assets.mixkit.co`), played by [src/lib/audio.ts](src/lib/audio.ts) `playSfx(id)` via `document.getElementById`. Pronunciation uses `speak(text, lang = 'en-US')`; `LANG_SPEAK_DEFAULT = 'vi-VN'` is also exported for the Vietnamese voice prompts used by Game Island views. `speak()` stays **synchronous** (so its ~180 call sites are untouched) but is **OpenAI-TTS-first with `window.speechSynthesis` as fallback**: if a user-supplied OpenAI key exists (BYOK — stored in `localStorage['lingoland_openai_key']`, entered via a field in [ProfileView](src/views/ProfileView.tsx); helpers `getOpenAIKey`/`setOpenAIKey` exported from audio.ts), it `POST`s to `api.openai.com/v1/audio/speech` (`gpt-4o-mini-tts`, voice `nova`), plays the mp3 blob, and caches it in-memory keyed by `(lang, voice, localized-text)`; on no-key / network error / blocked autoplay it falls back to `speechSynthesis`. No key is ever embedded in the bundle (public GitHub Pages site). `localize()` (numbers + math operators → words) is applied once before either path, including before the OpenAI request. Adding a new SFX = add an `<audio id="snd-...">` in `index.html`, then call `playSfx('snd-...')` (and if the asset is hosted off-origin, add a `runtimeCaching` entry in [vite.config.ts](vite.config.ts) so it works offline). Game Island BGM is **not** an `<audio>` element — see the Background music section.

### IPA reference data

[src/data/ipaData.ts](src/data/ipaData.ts) holds the 44-phoneme English IPA chart used by [PronunciationView](src/views/PronunciationView.tsx). Each `Phoneme` carries `ipa`, `type` (short vowel / long vowel / diphthong / consonant), example words, and a Vietnamese pronunciation hint. The helper `youtubeSearchUrl(ipa)` builds a `youtube.com/results?search_query=...` URL — note we **deliberately do not hardcode specific video IDs** since they can disappear; users land on a search results page to pick a current video.

### Shared types

`Word`, `TestMode`, `SubGroup`, `Category` are exported from [src/data/gameData.ts](src/data/gameData.ts), along with helpers `ALL_WORDS`, `TOTAL_SUBGROUPS`, `findSubGroup(id)`, `nextSubGroupId(id)`. `Phoneme`, `PhonemeType` are exported from [src/data/ipaData.ts](src/data/ipaData.ts). `QuizResult` is exported from [src/views/ResultView.tsx](src/views/ResultView.tsx). `NavKey` is exported from [src/components/BottomNav.tsx](src/components/BottomNav.tsx). `GameKey` is exported from [src/views/GameIslandsView.tsx](src/views/GameIslandsView.tsx). `MathLevel`, `MathQuestion` and the `TOTAL_MATH_LEVELS` count are exported from [src/data/mathData.ts](src/data/mathData.ts). Import these rather than redefining locally.
