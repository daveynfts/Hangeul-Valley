# Project: Hangeul Valley Top HUD Redesign

## Architecture
- Single Page Web App (Phaser 3 + vanilla HTML/CSS/JS)
- `index.html` (and mirrored `assets/index.html`): Top UI layout containing `#hud`, `#event-banner`, `#progress-bar-wrap`, modal overlays, HUD action buttons.
- `game.js`: References UI elements by ID (e.g. currency updates, progress updates, buff badges, event banner visibility).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Architecture | Analyze `#hud`, `#event-banner`, `#progress-bar-wrap` structure in `index.html` & `game.js` references | none | DONE |
| 2 | HUD Redesign Implementation | Redesign CSS flex/grid layout to eliminate top-area overlap at 1024px+ and 768px; group HUD buttons (≤8 top-level visible + dropdown/more menu for remaining); preserve IDs & onclick handlers; sync `index.html` and `assets/index.html` | M1 | DONE |
| 3 | Verification, Challenge & Audit | Verify code syntax (`node -c game.js`), verify HTML sync, perform adversarial challenge & forensic audit | M2 | DONE |

## Interface Contracts
- CSS classes: `.glass-bg`, `.neon-border`, `Press Start 2P` font.
- Element IDs: `#hud`, `#event-banner`, `#progress-bar-wrap`, `#hud-level-name`, `#hud-progress`, `#coins-val`, `#gems-val`, `#honor-val`, `#active-buffs`, and all 12 action button IDs/handlers.

## Code Layout
- Root: `index.html`, `game.js`
- Assets: `assets/index.html`
