# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — runs `tsc --noEmit` then `vite build`; emits to `dist/`
- `npm run typecheck` — type-check only
- `npm run preview` — preview the production build locally

No test runner is configured.

## Deployment

GitHub Pages via [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml) on push to `main`. The site is served at `https://vietnt.github.io/lingo-land/`, so [vite.config.ts](vite.config.ts) sets `base: '/lingo-land/'`. If you rename the repo, update `base` **and** the PWA manifest's `scope` / `start_url` (both are `/lingo-land/`) — otherwise built assets 404 and the installed PWA loses its session.

## PWA

Configured via `vite-plugin-pwa` in [vite.config.ts](vite.config.ts) with `registerType: 'autoUpdate'` — the SW is auto-registered (injected `registerSW.js`) and silently updates on next reload. Icons live in `public/` as SVG (`icon.svg`, `icon-maskable.svg`, `favicon.svg`). Apple touch icon + theme-color meta are in [index.html](index.html).

Runtime caching (workbox `CacheFirst`) is set up for the three external origins this app depends on: `cdn.tailwindcss.com`, Google Fonts, and `assets.mixkit.co` (SFX). Without these caches the app breaks offline because Tailwind is CDN-loaded (see Styling section). Add a new `runtimeCaching` entry if you introduce another external origin.

## Architecture

LingoLand is a single-page Vietnamese-language English vocabulary game. React 18 + TypeScript + Vite. No router, no test framework, no CSS pipeline.

### View routing lives in App.tsx, not a router

[src/App.tsx](src/App.tsx) holds a `view: View` state (`'map' | 'category' | 'flashcard' | 'test' | 'result' | 'leader' | 'profile' | 'pron'`) plus `activeCategory`, `activeSubGroup`, `quizResult`. Conditionally renders one view component per state. Navigation is callback props (`onPickCategory`, `onPickSubGroup`, `onComplete`, `onFinish`, `onBack`, `onNavigate`) — no URL routing. Adding a screen: extend `View` union, add conditional render in `App.tsx`, thread callback into the trigger.

The `test` view dispatches to one of 4 mini-game components based on `activeSubGroup.mode`: [QuizView](src/views/QuizView.tsx), [MatchingView](src/views/MatchingView.tsx), [ListeningView](src/views/ListeningView.tsx), [TypingView](src/views/TypingView.tsx). All 4 share the contract `(words: Word[], onFinish: (r: QuizResult) => void)` — keep that shape if you add a 5th mode.

`BottomNav` exposes `'map' | 'pron' | 'leader' | 'profile'` (see `NavKey` in [src/components/BottomNav.tsx](src/components/BottomNav.tsx)); in-flow screens (`category`, `flashcard`, `test`, `result`) are reached only via callbacks and collapse to `'map'` for the nav's `active` highlight. The `pron` tab shows [PronunciationView](src/views/PronunciationView.tsx) — a reference IPA chart, independent of the game progression flow.

### Game state: Context + localStorage

[src/context/GameContext.tsx](src/context/GameContext.tsx) owns `score`, `streak`, `unlockedSubGroups` (string IDs like `'animals.pets'`) and exposes `addScore`, `unlockNext`, `isUnlocked`. State is hydrated from and synced back to `localStorage` under these exact keys:

- `lingoland_score`
- `lingoland_streak`
- `lingoland_subgroups_v2` (JSON `string[]` of unlocked sub-group IDs; default = first sub-group of every category)

On mount, GameContext removes the legacy key `lingoland_levels` (old `number[]` format) — that one-shot migration can be deleted once you're confident no users have stale state.

`useGame()` throws if used outside `GameProvider`. The Profile screen's "reset" button does `localStorage.clear()` + `location.reload()`, so any new persisted keys should use the `lingoland_` prefix to stay consistent and get cleared together.

### Level progression

Data is static in [src/data/gameData.ts](src/data/gameData.ts) as `CATEGORIES: Category[]`, each with `subGroups: SubGroup[]`. A `SubGroup` has a stable `id` (used in localStorage), a `mode: TestMode` (which mini-game runs after the flashcard study), and 4-6 `words`.

Categories are always open. Within each category, sub-groups unlock **sequentially**: only the first is unlocked by default; passing one (`correct >= total * 0.7` in [ResultView](src/views/ResultView.tsx)) calls `unlockNext(currentId)`, which uses `nextSubGroupId()` from gameData to find the next sub-group in the **same** category. Last-in-category passes are a no-op (no cross-category unlock).

Scoring (`addScore(20)` per correct answer) happens inside each mini-game as the user answers, *not* on the result screen.

Distractor pool: [QuizView](src/views/QuizView.tsx) and [ListeningView](src/views/ListeningView.tsx) sample wrong answers from `ALL_WORDS` (a precomputed flatten of every sub-group's words) — adding a sub-group changes the distractor pool for every quiz/listening test.

### Styling and assets are CDN/inline, not bundled

[index.html](index.html) loads Tailwind via `cdn.tailwindcss.com` and Google Fonts, and defines all custom CSS (`perspective-1000`, `card-inner`, `flipped`, `floating`, `progress-bar`, `island-node`, `locked`) in an inline `<style>` block. There is **no** PostCSS / Tailwind config in the repo. To add a custom class, edit the `<style>` block in `index.html`.

Sound effects are `<audio>` elements in `index.html` with fixed IDs (`snd-correct`, `snd-wrong`), played by [src/lib/audio.ts](src/lib/audio.ts) `playSfx(id)` via `document.getElementById`. Pronunciation uses `window.speechSynthesis` (`speak()` in the same file). Adding a new SFX = add an `<audio id="snd-...">` in `index.html`, then call `playSfx('snd-...')`.

### IPA reference data

[src/data/ipaData.ts](src/data/ipaData.ts) holds the 44-phoneme English IPA chart used by [PronunciationView](src/views/PronunciationView.tsx). Each `Phoneme` carries `ipa`, `type` (short vowel / long vowel / diphthong / consonant), example words, and a Vietnamese pronunciation hint. The helper `youtubeSearchUrl(ipa)` builds a `youtube.com/results?search_query=...` URL — note we **deliberately do not hardcode specific video IDs** since they can disappear; users land on a search results page to pick a current video.

### Shared types

`Word`, `TestMode`, `SubGroup`, `Category` are exported from [src/data/gameData.ts](src/data/gameData.ts), along with helpers `ALL_WORDS`, `TOTAL_SUBGROUPS`, `findSubGroup(id)`, `nextSubGroupId(id)`. `Phoneme`, `PhonemeType` are exported from [src/data/ipaData.ts](src/data/ipaData.ts). `QuizResult` is exported from [src/views/ResultView.tsx](src/views/ResultView.tsx). `NavKey` is exported from [src/components/BottomNav.tsx](src/components/BottomNav.tsx). Import these rather than redefining locally.
