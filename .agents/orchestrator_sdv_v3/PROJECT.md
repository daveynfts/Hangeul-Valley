# Project: Hangeul Valley Main Character Sprite Overhaul (SDV Style)

## Architecture & Scope
- **Game Engine**: Phaser 3 Single-Page Application (`game.js` synchronized with `assets/game.js`).
- **Graphics Pipeline**: Procedural Canvas Pixel Art generation via `PixelArtRenderer.drawMatrix()` and `generateTexture()`.
- **Target Entity**: Player Character (`_genPlayerTextures`, `player_walk_down_0..2`, `player_walk_up_0..2`, `player_walk_left_0..2`, `player_walk_right_0..2`, action frames, tool sprites, scale & shadow rendering, depth sorting).

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Architecture Mapping | Map `_genPlayerTextures`, palette definitions, animation key registrations, scale, shadow, and movement physics in `game.js`. | None | DONE |
| 2 | Main Character Pixel Art Redesign & 4-Directional Walk Animations | Completely replace palette `P` and 16x16 pixel art matrix patterns for player character (SDV Chibi 1:2 ratio, cute large eyes, modern Korean farmer with dungarees/straw hat, brown hair, multi-directional walk cycles, action frames, tool sprites). | M1 | DONE |
| 3 | Visual Polish, Scale Harmony, Hitbox & Shadow Alignment | Align player scale ratio, shadow position/rendering, depth sorting, wobble/bobbing dynamics, and collision hitboxes with environment. Sync `game.js` to `assets/game.js`. | M2 | DONE |
| 4 | Verification & Forensic Audit | Run Reviewers, Challengers (syntax check, animation frame integrity, scale tests), and Forensic Auditor for integrity check. | M3 | DONE |

## Code Layout
- `game.js`: Root Phaser 3 game implementation containing `_genPlayerTextures`, player class/sprite handling, physics, animations, and shadows.
- `assets/game.js`: Mirror file of `game.js` required for deployment/runtime assets.
- `index.html` & `assets/index.html`: UI Overlay container.
