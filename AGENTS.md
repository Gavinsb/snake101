# AGENTS.md - Snake Game

## Project Overview
Vanilla HTML/CSS/JS Snake game (configurable grid, Canvas API). No build step, no dependencies. Modular files loaded via plain `<script>` tags (globals, not ES modules).

## Files (v3.0, modular + subfolders)
- `index.html` - Entry point, loads all modules in order, overlays, D-pad, settings
- `css/style.css` - Theme (dark/light/auto + high-contrast + overlay-bg var), overlays, D-pad, settings form, leaderboard panel, slider
- `js/events.js` - Event bus (`Events.on/off/emit/clear`) — **wire all cross-module signals here**
- `js/settings.js` - Settings + high scores persistence (`localStorage`)
- `js/audio.js` - Web Audio API sounds; subscribes to event bus
- `js/food.js` - 4 food types (normal/bonus/speed/shrink), weighted spawn
- `js/powerups.js` - 3 power-ups (invincible/slowmo/double), timers, non-stacking
- `js/levels.js` - Level progression + hand-designed wall patterns + speed tiers
- `js/render.js` - Canvas 2D drawing, **interpolated** snake movement
- `js/input.js` - Keyboard + touch swipe + D-pad, visibility/blur pause
- `js/game.js` - Coordinator: state machine, game loop, input queue, wires all modules (loaded LAST)
- `docs/DESIGN.md` - System doc + version history (REQUIRED read before changes)

## Run Locally
```bash
cd /home/gazaz/project/snake101 && python3 -m http.server 8080
# Open http://localhost:8080
```

## Key Implementation Details
- Scripts loaded via plain `<script src="js/...">`; only **load order** matters, not folder depth. Order: events → settings → audio → food → powerups → levels → render → input → game
- Scripts attach modules to `window` (e.g. `window.Events`)
- Event bus decouples audio/render/powerup-bar from game logic — emit events, don't call modules directly
- Game loop: `requestAnimationFrame` + fixed timestep; `alpha = accumulator / speed` drives **render interpolation** (snake lerps from `snakePrev` → `snake`)
- **Input queue** (v3): `Game.inputQueue` (cap `INPUT_QUEUE_MAX=3`); validate against last queued entry, not committed direction — prevents dropped rapid turns. `setDirection()` clamps `_accumulator = max(_accumulator, speed * inputResponsiveness)` to cut perceived latency; setting `inputResponsiveness` (0.0=fully deterministic, 1.0=next-tick fire)
- **Powerup bar** (v3) is positioned absolute inside `.canvas-wrapper` (top:8px); never reflows canvas on show/hide
- **Overlay/theme** (v3): `.overlay` uses `var(--overlay-bg)` (dark/light/high-contrast each override). Form inputs use `var(--bg-card)` not `--input-bg`. Light theme overrides `--gold` to stay legible.
- State machine: `idle` → `playing` → `paused`/`gameOver` (in `Game.state`)
- Settings persisted to `localStorage` key `snakeSettings`; high scores to `snakeHighScores`
- No lint/test/typecheck tooling configured; verify JS with `node -c js/<file>`

## Common Tasks
- **Modify game speed**: `SPEED_INCREMENT`/`MIN_SPEED` in `js/game.js`; `Settings.initialSpeed` (default) overrides
- **Change grid size**: Settings panel (15/20/25/30) — `Render.rebuildCanvas()` recomputes `CELL_SIZE`
- **Add food type**: Add to `FOOD_TYPES` in `js/food.js` (weight/score/icon/effect), handle effect in `js/game.js _update()`
- **Add power-up**: Add to `POWERUP_TYPES` in `js/powerups.js`; wire effect in `js/game.js _update()` (collision/score/speed)
- **Add wall pattern**: Append to `WALL_PATTERNS` in `js/levels.js` (relative `fx`/`fy` coords 0-1)
- **Add event**: `Events.emit('namespace:action', data)` + subscribe where needed (audio/render/UI)
- **Add setting**: add to `DEFAULT_SETTINGS` in `js/settings.js`; cache + bind + sync UI in `js/game.js` (`_cacheUi`/`_bindSettings`/`_syncSettingsForm`); add input + CSS row in `index.html`/`css/style.css`

## Change Tracking
- **All changes must be recorded in `docs/DESIGN.md`** with version bump
- Update version number, date, scope delivered, known limitations, and testing notes
- Include rationale for architectural decisions in "Key Decisions & Tradeoffs"