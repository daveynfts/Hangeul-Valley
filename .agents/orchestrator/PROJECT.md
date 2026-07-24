# Project: Hangeul Valley Character Enhancement & Pet Removal

## Architecture
- Single Page Web App (Phaser 3 + vanilla HTML/CSS/JS)
- `game.js` (and mirrored `assets/game.js`): Contains `PixelArtRenderer` procedural matrix definitions, character textures, game state, save/load system, and Phaser scenes.
- `index.html` (and mirrored `assets/index.html`): UI overlays (HUD, modals, overlays).
- Constraint: Zero external image files — 100% procedural pixel art rendered via `PixelArtRenderer.drawMatrix(g, matrix, palette)` on 16×16 matrices.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Main Character Micro Pixel Enhancement | Upgrade player sprite matrices/shading in `game.js` & `assets/game.js` with sub-pixel shading, accessory highlights, outfit texture details, hair strands, and facial expression nuances maintaining SDV Chibi 1:2 style. | none | DONE |
| 2 | Complete Removal of Pet Companion System | Purge all pet textures, pet state, pet overlay UI, pet following logic, pet passive bonuses, and pet save/load data from `game.js`, `assets/game.js`, `index.html`, `assets/index.html`. | none | DONE |

## Interface Contracts & Constraints
- Main Character Sprites:
  - Format: 16×16 character grids, `PS=3` (48×48 rendered textures) or scale 1.8x.
  - Retain all walk keys (`player_walk_down_0..2`, `player_walk_up_0..2`, `player_walk_left_0..2`, `player_walk_right_0..2`) and action keys (`player_water_down_0..2`, `player_harvest_down_0..2`, `player_pick_down_0..2`).
  - Maintain SDV Chibi 1:2 style and warm earthy color palette.
- Pet System Purge:
  - 0 references to `petState`, `petSprite`, `petShadow`, `_updatePetCompanion`, `_genPetTextures`, `isPetActive`, `getPetPassiveMultiplier`, `addPetXP` in `game.js` / `assets/game.js`.
  - 0 references to `pet-overlay` in `index.html` / `assets/index.html`.
- System Verification:
  - `node -c game.js` and `node -c assets/game.js` pass with 0 syntax errors.
  - HTML file pairs and JS file pairs must be 100% synchronized.
  - Forensic Auditor verdict must be CLEAN.

## Code Layout
- Main code: `game.js`, `index.html`
- Asset mirror: `assets/game.js`, `assets/index.html`
