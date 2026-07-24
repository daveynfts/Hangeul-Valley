# Project: Hangeul Valley Industrial Yellow Farmer Pixel Robot Replacement

## Architecture
- Single Page Web App (Phaser 3 + vanilla HTML/CSS/JS)
- `game.js` (and mirrored `assets/game.js`): Contains `PixelArtRenderer` procedural matrix definitions, character textures (`_genPlayerTextures`), game state, save/load system, and Phaser scenes.
- Constraint: Zero external image files — 100% procedural pixel art rendered via `PixelArtRenderer.drawMatrix(g, matrix, palette)` on 16×16 matrices.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Industrial Yellow Farmer Pixel Robot Replacement & Integration | Replace human player sprite matrices and texture routines with Industrial Yellow Farmer Pixel Robot (yellow/gray casing, LED visor, antenna/gear, 1px dark outlines, chibi proportions), 4-directional tread walk animations (Down, Up, Left, Right), 9 action frames, tool sprites, legacy aliases, 1.8x scale, dynamic shadow, y-sort, and sync `game.js` → `assets/game.js`. | none | DONE |

## Interface Contracts & Constraints
- Robot Character Sprites:
  - Format: 16×16 character grids, `PS=3` (48×48 rendered textures) with 1.8x player scale.
  - Palette: Vibrant yellow (`0xFACC15`, `0xEAB308`, `0xCA8A04`), slate metallic gray (`0x94A3B8`, `0x64748B`, `0x475569`, `0x334155`), glowing cyan LED visor screen (`0x38BDF8`, `0x06B6D4`, `0x0284C7`), antenna/beacon glow, dark outline (`0x0F172A`).
  - Retain all walk keys (`player_walk_down_0..2`, `player_walk_up_0..2`, `player_walk_left_0..2`, `player_walk_right_0..2`) and action keys (`player_water_down_0..2`, `player_harvest_down_0..2`, `player_pick_down_0..2`).
  - Retain tool sprites (`tool_watering_can`, `tool_basket`, `tool_sickle`) and legacy aliases (`farmer0..3`).
  - Chibi proportions with mechanical tread feet / tread movement frame steps & mechanical bobbing dynamics.
- System Verification:
  - `node -c game.js` and `node -c assets/game.js` pass with 0 syntax errors.
  - `game.js` and `assets/game.js` share 100% identical SHA256 checksums (`27fce209444d80fdbc8b1e3fc0dbac928ffdb2c3367636d16b8b93b7e8dddfa2`).
  - Forensic Auditor verdict is CLEAN.

## Code Layout
- Main code: `game.js`
- Asset mirror: `assets/game.js`
