# Project: Hangeul Valley Character Design Upgrade

## Architecture
- Single Page Web App (Phaser 3 + vanilla HTML/CSS/JS)
- `game.js` (and mirrored `assets/game.js`): Contains `PixelArtRenderer` procedural matrix definitions, texture generation, animation registration, character controllers, NPC behavior, and FarmScene interaction logic.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Architecture | Inspect `PixelArtRenderer` matrices, palette colors, Phaser animation definitions, cat NPC implementation, and FarmScene trigger points in `game.js`. | none | DONE |
| 2 | Implementation & Sync | Implement Farmer action animations (watering, harvesting, fruit picking) & tool sprites; redesign Ginger Cat with 4 animation states & rename "Muop" -> "Ginger Cat"; hook animations to gameplay triggers & contextual behaviors; sync `game.js` and `assets/game.js`. | M1 | DONE |
| 3 | Verification, Challenge & Audit | Run `node -c game.js`, verify code quality & animation frame counts, challenge gameplay triggers and naming parity, perform forensic audit. | M2 | DONE |

## Interface Contracts
- `PixelArtRenderer` matrix format: 16×16 character grid strings, `PS=3` (48×48 textures).
- Palette usage: `STARDEW_PALETTE` and harmonious color codes.
- Phaser texture keys & animation keys: `player_water_*`, `player_harvest_*`, `player_pick_*`, `tool_watering_can`, `tool_basket`, `cat_idle_*`, `cat_walk_*`, `cat_sit_*`, `cat_sleep_*`, `player-water`, `player-harvest`, `player-pick`, `cat-idle`, `cat-walk`, `cat-sit`, `cat-sleep`.
- Cat NPC name: "Ginger Cat" across all UI labels, dialogs, and text highlights (0 instances of "Muop").

## Code Layout
- Root: `game.js`, `index.html`
- Assets: `assets/game.js`, `assets/index.html`
