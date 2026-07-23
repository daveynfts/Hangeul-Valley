# Implementation Plan — Hangeul Valley Pixel Art Quality Upgrade

## Objectives & Requirements
1. **Character Sprite Redesign (R1)**:
   - Farmer: 12 walk frames (4 directions × 3) + 9 action frames (watering, harvesting, fruit picking) with visible separate arms/hands, clothing folds, anatomical proportions, weight shift, multi-tone shading (≥3 tones per color area), 1px dark outline, anti-aliasing, and dithering.
   - Ginger Cat: 8 frames (idle 0/1, walk 0/1, sit 0/1, sleep 0/1) with detailed tabby stripes, fur dithering, expressive tail/ears, 1px dark outline, multi-tone shading.
   - Wizard Merlin: 2 frames (idle 0/1) with flowing robe, fabric fold shading, beard hair strands, inner glow staff crystal, 1px dark outline, multi-tone shading.
2. **Environment & Entity Sprites Upgrade (R2)**:
   - 5 Crop species × 4 growth stages (20 textures): detailed leaf shapes, stem structure, harvest-ready sparkle/richness, multi-tone shading.
   - 11 Fish species: distinct scale patterns, fin details, species-specific coloring with iridescent highlights.
   - Dungeon Monsters: menacing design, idle breathing/pulsing, detailed weapon/armor on skeleton/goblin, multi-tone shading.
   - Arcade Enemies: sleek sci-fi design, engine glow, distinct silhouettes, multi-tone shading.
3. **Zero External Assets (R3)**:
   - All sprites generated programmatically via `PixelArtRenderer.drawMatrix(g, matrix, palette)` on 16×16 grids scaled at PS=3 (48×48 textures).
4. **Integration & Integrity (R4)**:
   - Retain 100% existing texture keys, animation keys, gameplay triggers, and scene integrations.
   - Synchronize `game.js` and `assets/game.js`. Validate with `node -c game.js`.
   - Skip victory audit phase per user instructions.

## Milestone Plan

### Milestone 1: Exploration & Palette/Matrix Specification
- **Goal**: Analyze `game.js` sprite renderer, existing palette, all texture key definitions, and design the multi-tone shading color palettes and 16×16 matrices for characters, crops, fish, monsters, and arcade enemies.
- **Dispatch**:
  - `explorer_m1_1`: Character Sprites (Farmer 21 frames, Ginger Cat 8 frames, Wizard 2 frames) - design multi-tone palettes (highlight, base, shadow, deep shadow), 1px outline rules, anatomical details, dithering, and matrices.
  - `explorer_m1_2`: Environment & Entity Sprites (5 crops × 4 stages, 11 fish species) - design leaf/scale/highlight palettes and 16×16 matrices.
  - `explorer_m1_3`: Monsters, Arcade Enemies & Texture Registry - design monster/enemy multi-tone matrices and inventory all texture keys in `game.js`.

### Milestone 2: Implementation & Code Synchronization
- **Goal**: Replace all 16×16 matrix definitions in `game.js` with the upgraded professional pixel art matrices, extend `STARDEW_PALETTE` with multi-tone colors, ensure zero texture key drops, synchronize `game.js` with `assets/game.js`, and verify with `node -c game.js`.
- **Dispatch**: `worker_m2`.

### Milestone 3: Verification & Challenge (Skip Victory Audit)
- **Goal**: Perform independent code review, texture key parity check, syntax validation, and challenge verification.
- **Dispatch**:
  - `reviewer_m3_1`: Code quality, key parity & sync verification.
  - `reviewer_m3_2`: Requirement compliance & art quality verification.
  - `challenger_m3_1`: Syntax check (`node -c game.js`) & key registry validation.
