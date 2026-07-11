# Design Document & Version Record - Snake Game v3.1

## System Architecture (v2.0)

```
┌─────────────────────────────────────────────────────────────┐
│                        index.html                            │
│  ┌─────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │ Header +    │  │   Canvas (400²)  │  │   Overlays     │  │
│  │ Lvl/Score/  │  │   gameCanvas     │  │ Start/Pause/   │  │
│  │ Settings    │  └────────┬─────────┘  │ GameOver/      │  │
│  └─────────────┘           │            │ Settings       │  │
│                            │            └────────────────┘  │
└────────────────────────────┼────────────────────────────────┘
                             │
   ┌─────────────────────────┴──────────────────────────────┐
   │                     Event Bus (events.js)                │
   │   game:*  snake:*  food:*  powerup:*  level:*  settings:*│
   └───┬───────┬──────────┬───────────┬───────────┬───────────┘
       ▼       ▼          ▼           ▼           ▼
   ┌───────┐ ┌────────┐ ┌────────┐ ┌─────────┐ ┌────────┐
   │game.js│ │render.│ │input.js│ │ audio.js│ │food.js │
   │coord. │ │interpo │ │kbd/swp │ │WebAudio │ │+bonus/ │
   │state  │ │+walls  │ │+D-pad  │ │+toggle  │ │shrink  │
   └───┬───┘ └────────┘ └────────┘ └─────────┘ └────────┘
       │                                      
   ┌───┴────┐  ┌──────────┐  ┌───────────┐  ┌──────────────┐
   │levels. │  │powerups. │  │settings.js│  │  localStorage│
   │wall pat│  │invinc/  │  │persist UI │  │  scores +    │
   │lvl prog│  │slowmo/dbl│ │grid/theme │  │  settings    │
   └────────┘  └──────────┘  └───────────┘  └──────────────┘
```

---

## Component Design

### 1. State Machine (`STATE` enum + `state` variable)
| State | Transitions | Behavior |
|-------|-------------|----------|
| `IDLE` | → `PLAYING` (Start) | Shows start overlay, waits for input |
| `PLAYING` | → `PAUSED` (Esc/P/blur) → `GAME_OVER` (collision) | Runs game loop, processes input |
| `PAUSED` | → `PLAYING` (Resume/Esc/P) | Shows pause overlay, loop stopped |
| `GAME_OVER` | → `PLAYING` (Restart) | Shows final score, saves high score |

**Key invariant**: `state` only changes through explicit functions (`startGame`, `pauseGame`, `resumeGame`, `gameOver`)

### 2. Game Loop (Fixed Timestep)
```javascript
// 60fps target via requestAnimationFrame
// Accumulator pattern: decouples render from update
accumulator += deltaTime;
while (accumulator >= speed) {  // speed = ms per tick (150→60)
    update();                    // deterministic logic
    accumulator -= speed;
}
render();  // interpolated if needed (currently not)
```

**Why fixed timestep**: Snake movement must be deterministic; frame-rate independent.

### 3. Input Handling
| Input | Mapping | Constraints |
|-------|---------|-------------|
| Arrow keys / WASD | `setDirection()` | No 180° reversal, no duplicate |
| Touch swipe (≥30px) | `setDirection()` | Horizontal vs vertical priority |
| Space/Enter | `startGame()` | Only in IDLE/GAME_OVER |
| Escape/P | `pauseGame`/`resumeGame` | Only in PLAYING/PAUSED |

**Touch**: Uses `touchstart`/`touchmove`/`touchend` with `passive: false` to prevent scroll.

### 4. Rendering Pipeline
```
render()
  ├─ clear canvas (bg color)
  ├─ drawGrid()      // 0.5px lines, 20×20
  ├─ drawFood()      // radial gradient + pulse animation + glow
  └─ drawSnake()     // gradient head→tail, rounded rects, eyes
```

**Snake gradient**: Linear interpolation head `#00ff88` → tail `#009955`

### 5. Data Structures
```javascript
snake: [{x, y}, ...]  // head at index 0
food: {x, y}          // single cell, respawns avoiding snake
direction: {x, y}     // current movement vector
nextDirection: {x, y} // buffered input (applied next tick)
```

---

## Key Decisions & Tradeoffs

| Decision | Rationale | Alternative Considered |
|----------|-----------|------------------------|
| **Vanilla JS + Canvas** | Zero deps, runs anywhere | React/Phaser (overkill) |
| **Fixed timestep + accumulator** | Deterministic movement, speed scaling works | Variable timestep (jittery) |
| **Modular split (>600 lines)** | Single file grew unwieldy; modules via `<script>` | ES modules (requires server/CORS) |
| **Event bus (pub/sub)** | Decouples modules; audio reacts to food without coupling | Direct calls (tangled deps) |
| **Global singletons (window.X)** | Simple module sharing, no bundler needed | AMD/CommonJS (needs build) |
| **localStorage: scores + settings** | Persists across sessions, no backend | IndexedDB (overkill), none |
| **CSS custom properties for theming** | Dark/light/auto + high contrast support | Hardcoded colors |
| **Interpolated rendering** | Smooth at any FPS via `alpha = accumulator/speed` | Discrete ticks (v1 jumpiness) |
| **Web Audio API (no files)** | Zero asset deps, procedural sounds | Audio files (larger, async load) |
| **Hand-designed wall patterns** | Few memorable layouts, predictable | Procedural (unfair/unreachable) |
| **Power-ups replace, don't stack** | Predictable, single effect at a time | Stacking (complex balance) |
| **Input queue (v3) vs single slot** | Honors rapid multi-turn sequences in order | Single slot dropped/skipped turns |
| **Accumulator-clamp latency trick** | Configurable snappy feel via `inputResponsiveness` | Pure determinism (only at 0.0) |
| **`--overlay-bg` CSS var (v3)** | One themeable overlay; light/high-contrast override cleanly | Hardcoded dark overlay (v2 bug: dark-on-dark in light mode) |
| **Powerup bar absolute inside canvas (v3)** | Zero layout reflow on show/hide | Flow-positioned (v2 bug: canvas jumped) |
| **`js/`+`css/`+`docs/` subfolders (v3)** | Navigability for future versions, flat rot prevention | Flat (got messy past ~13 files) |

---

## Version History

### v1.0 - Initial Release (2026-07-06)
**Scope Delivered**
- 20×20 grid, 400×400px canvas
- Arrow/WASD + touch swipe controls
- Score + high score (persisted to localStorage)
- Start / Pause / Game Over / Restart
- Speed increases every food (150ms → 60ms min)
- Dark theme + `prefers-color-scheme: light`
- `prefers-reduced-motion` + `prefers-contrast: high`
- Mobile responsive (viewport, touch-action)

**Known Limitations**
| Limitation | Impact | Fix Version |
|------------|--------|-------------|
| No interpolation in render | Snake "jumps" between ticks at low fps | v1.1 |
| High score only (no name) | Can't distinguish players | v1.1 |
| Single food type | No power-ups/variety | v2.0 |
| No sound | Less engaging | v1.1 |
| No keyboard navigation for overlays | Accessibility gap | v1.1 |

**Testing Done**
- Manual: Desktop (Chrome/Firefox/Safari), Mobile (iOS Safari, Android Chrome)
- Keyboard: All mapped keys, pause/resume, restart
- Touch: Swipe 4 directions, threshold 30px
- Visibility: Tab switch pauses, blur pauses
- Reduced motion: Verified animations disable
- High contrast: Verified borders visible

---

### v2.0 - Major Gameplay & Polish Update (2026-07-06)
**Scope Delivered (v1.1 polish + v2.0 features, combined)**
- **Interpolated rendering** via `alpha = accumulator / speed` — smooth at any FPS
- **High score leaderboard**: 3-char name entry, top 5 list, persisted to `localStorage`
- **Sound effects** (Web Audio API): eat (per food type), move (throttled), death, power-up, level-up; toggle persisted
- **Full keyboard accessibility**: focus-visible rings, Enter/Space activation, focus on game-over input
- **Mobile on-screen D-pad** (4 buttons, `@media pointer` aware, user-toggled)
- **4 food types**: normal (70%, +10), bonus/gold (15%, +50, ★), speed/blue (10%, +20, ⚡ speed-down), shrink/pink (5%, +5, ↘ trims tail)
- **3 power-up types**: invincible (5s, pass through self), slowmo (5s), double (10s, 2× score) — 10% spawn chance after food, non-stacking, timer bar UI
- **Level progression**: every 5 foods → level up; hand-designed wall layouts at lvl ≥ 2; speed tier drop every 2 levels
- **Settings panel** (gear icon in header): grid size 15/20/25/30, initial speed, color theme (auto/dark/light), sound, D-pad, high contrast — all persisted
- **Event bus architecture** (`events.js`) decoupling modules
- **Modular file split** (>600 lines threshold): game/render/input/audio/food/powerups/levels/settings

**Resolved Limitations (from v1.0)**
| v1 Limitation | v2 Resolution |
|---------------|---------------|
| No interpolation in render | `Render._drawSnake` lerps `snakePrev → snake` by `alpha` |
| High score only (no name) | Name modal on new high score + top-5 leaderboard |
| Single food type | 4 weighted types with distinct effects/visuals |
| No sound | Procedural Web Audio, per-event tones, toggle |
| No keyboard nav for overlays | `tabindex`, `:focus-visible`, input autofocus |

**New Known Limitations (v2)**
| Limitation | Impact | Fix Version |
|------------|--------|-------------|
| No interpolation across grid-wrap (none — no wrap mode) | N/A | — |
| Wall patterns cycle at high level (only 5 designs) | Repetitive layouts | v2.1 |
| Power-ups non-stackable | Limits strategy depth | v2.1 |
| No persistent level reached stat | Can't track progression | v2.1 |
| Audio context needs user gesture (mobile) | First sound may miss | Browsers enforce |
| Leaderboard name input keyboard on mobile | Native keyboard may cover overlay | v2.1 |

**Testing Done**
- Syntax: `node -c` on all 9 JS modules — all pass
- Manual smoke: start, eat each food type, all 3 power-ups, level transitions, pause/resume, restart, settings save/reload, theme switch, high-contrast toggle, D-pad visibility toggle, name entry + leaderboard render
- Event bus: verified audio/drops on `settings:changed`, powerup bar on `powerup:state`
- localStorage: verified `snakeSettings` + `snakeHighScores` persistence across reload

---

### v3.1 - Code Quality & Bug Fixes (2026-07-11)

**Scope Delivered**
- **Fix inverted `inputResponsiveness` formula** (`js/game.js`): was `threshold = speed * (1 - clamp)`, corrected to `threshold = speed * clamp`. Previously 0.0 (intended deterministic) fired immediately while 1.0 (intended snappy) had no effect — fully reversed.
- **Declare `_lastGridSize`** on `Render` object (`js/render.js`): was an implicit global, now properly declared.
- **Fix `isHighScore` scope** (`js/settings.js`): now checks against the 5th-place score (`scores[4]`) instead of the absolute last stored score (up to 50). A score that beats only 50th place no longer triggers the misleading "NEW HIGH SCORE!" prompt.
- **Add `"use strict"`** to all 9 JS modules to catch undeclared variables and other silent errors.
- **Remove empty `_onFoodEaten` method** and its event binding (`js/game.js`): audio already subscribed independently.
- **Simplify `closeSettings`** (`js/game.js`): removed tautological `this.state !== STATE.GAME_OVER` clause.
- **Replace `switch(true)` anti-pattern** in `_drawEyes` (`js/render.js`) with `if/else` chain.
- **Remove dead CSS** (`css/style.css`): `body[data-theme="high-contrast"]` selector (high contrast uses `data-contrast`, not a theme) and `transition` on `.powerup-timer-fill` (fought with 50ms JS interval causing jitter).
- **Cleanup stale Future Extensions** (`docs/DESIGN.md`): removed already-implemented features (interpolated rendering, sound).

**Resolved Limitations (from v3)**
| v3 Limitation | v3.1 Resolution |
|---------------|-----------------|
| Accumulator clamp perturbs determinism slightly (inverted formula) | Formula corrected; 0.0 = pure tick timing, 1.0 = snappy |
| `_lastGridSize` undeclared global | Declared on `Render` object |

**Testing Done**
- Syntax: `node -c js/<file>` on all 9 modules — all pass with `"use strict"`
- Responsiveness: slider 0.0 = deterministic tick timing; slider 1.0 = next-tick fire
- High score: new score that beats 5th place shows prompt; 6th+ does not
- All overlays, settings, game loop, powerups verified unchanged

---

### v3.0 - Input Responsiveness, Bug Fixes & Directory Restructure (2026-07-06)
**Scope Delivered**
- **Input queue** (`Game.inputQueue`, `INPUT_QUEUE_MAX=3`): validates each enqueued turn against the *last queued* entry (not committed direction) — rapid `RIGHT→DOWN→LEFT` now fires three distinct turns across three ticks instead of dropping/skipping. Replaces single `nextDirection` slot.
- **Adjustable input responsiveness** (`Settings.inputResponsiveness`, 0.0–1.0, default 0.5): `setDirection()` clamps `_accumulator = max(_accumulator, speed * (1 - inputResponsiveness))` so the next turn fires sooner than a full tick. 0.0 = purely deterministic (queue still honors order), 1.0 = near-immediate next-tick fire. Exposed as a slider in the Settings panel.
- **Light theme legibility**: added `--overlay-bg` variable (dark/light/high-contrast overrides); `.overlay` uses it; `<select>`/`.name-input` now use `var(--bg-card)` (was near-transparent `--input-bg`); `--gold` overridden to `#aa8800` in light theme so the level value stays readable.
- **LVL/SCORE badge alignment**: unified shared rules for `.level-badge`/`.score-board` (same flex-align/gap/line-height) and `.level-label`/`.score-label` (same size/weight), and `.level-value`/`.score-value` (same `font-size: 1.5rem`, tabular-nums, monospace) — only color/glow per-element. Removed conflicting mobile override.
- **Slow-mo reflow fix**: `#powerupBar` moved inside `.canvas-wrapper` and repositioned absolute (`top:8px; left/right:8px; z-index:5; pointer-events:none`). Showing/hiding the bar no longer reflows the canvas (previously jumped ~40px down).
- **Game-over: separate leaderboard panel**: replaced single PLAY AGAIN with two buttons (LEADERBOARD / PLAY AGAIN); LEADERBOARD hides score+buttons and reveals an inline `#leaderboardPanel` with TOP SCORES + CLOSE. New high-score entry preserved across views via `_unsavedHighScore` flag (PLAY AGAIN always saves if applicable, with default "AAA").
- **Directory restructure**: flat root → `css/`, `js/`, `docs/`. Load order preserved (`js/events.js` → ... → `js/game.js` last). `AGENTS.md` stays at repo root for tooling discovery; `DESIGN.md` moved to `docs/`.

**Resolved Limitations (from v2)**
| v2 Limitation | v3 Resolution |
|---------------|---------------|
| Wall patterns cycle at high level (5 designs) | (deferred — out of v3 scope) |
| Power-ups non-stackable | (deferred — out of v3 scope) |
| No persistent "level reached" stat | (deferred — out of v3 scope) |
| Leaderboard name input keyboard on mobile | (deferred — out of v3 scope) |
| Key-press delay / dropped rapid turns (latent) | Input queue + clamp (this release) |
| Light mode settings text dark-on-dark | `--overlay-bg` + `--bg-card` for inputs (this release) |
| LVL/SCORE misaligned | Unified badge rules (this release) |
| Slow-mo: canvas jumps down | Bar repositioned absolute inside canvas wrapper (this release) |
| Game over: no leaderboard/start choice | Separate leaderboard panel + two-button row (this release) |

**New Known Limitations (v3)**
| Limitation | Impact | Fix Version |
|------------|--------|-------------|
| Wall pattern variety still cycles at 5 | Repetitive layouts at high level | v3.1 |
| Power-ups non-stackable | Limits strategy depth | v3.1 |
| No persistent "level reached" stat | Can't track progression | v3.1 |
| Mobilekeyboard may cover game-over name input | UX on small screens | v3.1 |
| Accumulator clamp perturbs determinism slightly at responsiveness>0 | Intentional tradeoff for snappier feel; disabled at 0.0 | — (by design) |

**Testing Done**
- Syntax: `node -c js/<file>` on all 9 modules — all pass
- Load order: DevTools Network — 9 JS + 1 CSS load 200 from new paths (in dependency order); game boots to START overlay
- Input: rapid `RIGHT→DOWN→LEFT` produces 3 distinct turns across 3 ticks; reverse (UP while DOWN) ignored; queue caps at 3
- responsiveness=0: deterministic pacing preserved; responsiveness=1: next turn fires within one rAF
- Themes: Light/Dark/Auto — settings panel readable in all; level value legible in light; overlay bg matches theme; high-contrast solid
- Powerup bar: appearing/disappearing does not move the canvas; bar ignores pointer (passes through to canvas)
- Game over: LEADERBOARD reveals panel + CLOSE returns; new high score + Enter saves and restarts; new high score then open leaderboard + PLAY AGAIN still saves (via `_unsavedHighScore` flag)
- LVL vs SCORE: same font size, right-aligned, baseline matched on desktop and mobile

---

## Files Reference (v3.1)

| File | Purpose |
|------|---------|
| `index.html` | Structure, overlays (start/pause/gameover/settings), D-pad, powerup bar (inside canvas wrapper) |
| `css/style.css` | Theme (`--overlay-bg` var, dark/light/auto + high-contrast), overlays, settings form, D-pad, leaderboard panel, powerup bar, slider, badges |
| `js/events.js` | Event bus (on/off/emit/clear) |
| `js/settings.js` | Settings + high scores persistence (localStorage); includes `inputResponsiveness` |
| `js/audio.js` | Web Audio API sounds, reacts to event bus |
| `js/food.js` | 4 food types, weighted spawn (avoids snake + walls) |
| `js/powerups.js` | 3 power-up types, spawns/timers, non-stacking |
| `js/levels.js` | Level progression, hand-designed wall patterns, speed tiers |
| `js/render.js` | Canvas 2D rendering, *interpolated* snake, grid/walls/food/powerups |
| `js/input.js` | Keyboard + touch swipe + D-pad, visibility/blur handling |
| `js/game.js` | Coordinator: state machine, game loop, input queue, wiring all modules |
| `docs/DESIGN.md` | This document |
| `AGENTS.md` | Agent guide + change tracking rule (repo root) |

---

## Future Extensions (Planning)

| Feature | Complexity | Notes |
|---------|------------|-------|
| More wall patterns (only 5 designs) | Low | Cycle becomes repetitive at high levels |
| Stackable power-ups | Medium | Currently replace, don't stack |
| Persistent "level reached" stat | Low | Track in localStorage |
| Particle effects on eat | Medium | Canvas particles |
| Multiplayer (WebRTC) | High | Separate architecture |
| Replay system | Medium | Record inputs, deterministic replay |

---

*Run `python3 -m http.server 8080` to test.*