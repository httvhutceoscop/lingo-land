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

[src/App.tsx](src/App.tsx) holds a `view: View` state (`'map' | 'level' | 'quiz' | 'result' | 'leader' | 'profile'`) plus `activeLevel` and `quizResult`, and conditionally renders one of six view components. Navigation is callback props (`onPickLevel`, `onComplete`, `onFinish`, `onBack`, `onNavigate`) — there is no URL routing. Adding a new screen means: extend the `View` union, add the conditional render in `App.tsx`, and thread the navigation callback into whatever triggers it.

`BottomNav` only exposes `'map' | 'leader' | 'profile'` (see `NavKey` in [src/components/BottomNav.tsx](src/components/BottomNav.tsx)); the in-flow screens (`level`, `quiz`, `result`) are reached only via callbacks and collapse to `'map'` for the nav's `active` highlight.

### Game state: Context + localStorage

[src/context/GameContext.tsx](src/context/GameContext.tsx) owns `score`, `streak`, `unlockedLevels` and exposes `addScore` / `unlockLevel`. State is hydrated from and synced back to `localStorage` under these exact keys:

- `lingoland_score`
- `lingoland_streak`
- `lingoland_levels` (JSON array of unlocked level IDs; default `[1]`)

`useGame()` throws if used outside `GameProvider`. The Profile screen's "reset" button does `localStorage.clear()` + `location.reload()`, so any new persisted keys should use the `lingoland_` prefix to stay consistent and get cleared together.

### Level progression

Levels are static in [src/data/gameData.ts](src/data/gameData.ts) (`LEVELS: Level[]`, each with `Word[]`). Progression rule lives in [src/views/ResultView.tsx](src/views/ResultView.tsx): passing means `correct >= total * 0.7`, which calls `unlockLevel(level.id + 1)`. Quiz scoring (`addScore(20)` per correct answer) happens in [src/views/QuizView.tsx](src/views/QuizView.tsx) as the user answers, *not* on the result screen.

Quiz distractors are sampled from **all levels' words** (`LEVELS.flatMap(l => l.words)`), not the current level — this is deliberate and means adding a level changes the distractor pool for every other level.

### Styling and assets are CDN/inline, not bundled

[index.html](index.html) loads Tailwind via `cdn.tailwindcss.com` and Google Fonts, and defines all custom CSS (`perspective-1000`, `card-inner`, `flipped`, `floating`, `progress-bar`, `island-node`, `locked`) in an inline `<style>` block. There is **no** PostCSS / Tailwind config in the repo. To add a custom class, edit the `<style>` block in `index.html`.

Sound effects are `<audio>` elements in `index.html` with fixed IDs (`snd-correct`, `snd-wrong`), played by [src/lib/audio.ts](src/lib/audio.ts) `playSfx(id)` via `document.getElementById`. Pronunciation uses `window.speechSynthesis` (`speak()` in the same file). Adding a new SFX = add an `<audio id="snd-...">` in `index.html`, then call `playSfx('snd-...')`.

### Shared types

`Word` and `Level` are exported from [src/data/gameData.ts](src/data/gameData.ts). `QuizResult` is exported from [src/views/ResultView.tsx](src/views/ResultView.tsx) (the result view is the canonical consumer). `NavKey` is exported from [src/components/BottomNav.tsx](src/components/BottomNav.tsx). Import these rather than redefining locally.
