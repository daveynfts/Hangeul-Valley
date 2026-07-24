# Project: Hangeul Valley NPC Sprite Polish & Upgrade

## Architecture
- Target file: `game.js` (and synced to `assets/game.js`).
- Procedural Texture Bake & Canvas Rendering Engine: NPC sprites are procedurally baked onto Canvas textures or drawn via canvas rendering routines in `game.js`.
- Upgrades enhance texture baking / pixel rendering functions with multi-tone shading, specular highlights, 1px dark outlines, accessory details, micro-animations, and increased color token count.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Shop & Wizard NPC Polish | R1 (Shop NPC), R2 (Wizard NPC) sprite bake & render functions upgrade with 1px outlines, shading, and details | None | DONE |
| 2 | M2: Cat, Notice Board, Portal & Beehive Polish | R3 (Cat NPC Muop), R4 (Notice Board & Portal NPC), R5 (Beehive) sprite bake & render functions upgrade | M1 | DONE |
| 3 | M3: Dual-File Sync & Forensic Integrity Audit | Node syntax verification (`node -c`), SHA256 byte sync (`game.js` <-> `assets/game.js`), E2E interaction test, and Forensic Integrity Audit | M1, M2 | DONE |

## Interface Contracts & Requirements
- **R1. Shop NPC**: Richer pixel art detail, multi-tone clothing shading, facial expression refinement, accessory details (apron, hat, coins on counter), crisp 1px dark outlines, warm Korean merchant character style. [DONE - 18 color tokens, 18x22 grid]
- **R2. Wizard NPC**: Detailed robes (fabric folds, star/moon embroidery details), glowing staff with particle-like highlights, mystical beard detail, magical aura effect. [DONE - 32 color tokens, 16x20 grid]
- **R3. Cat NPC (Muop)**: World sprite (not dialog portrait canvas) upgraded with richer fur texture detail, visible stripes/tabby pattern, expressive eyes with catchlights, subtle tail-swish idle animation.
- **R4. Notice Board & Portal NPC**:
  - Notice Board: wood grain detail, pinned paper notes with visible text marks, warm lantern glow effect.
  - Portal: richer magical rune detail, swirling energy core, pulsing glow particles.
- **R5. Beehive**: Honeycomb texture detail on surface, layered straw/wood construction, dripping honey accent pixels at bottom.

## Acceptance Criteria
1. Color Tokens: Each NPC sprite uses strictly MORE unique color tokens than the original baseline version.
2. Outlines: All NPC sprites maintain crisp 1px dark outlines for visual consistency with Robot player character.
3. Non-Regression: NPC positions, scales, shadows, depth-sort, collision zones, and interaction mechanics remain intact and error-free.
4. Code Quality: Syntax checks `node -c game.js` and `node -c assets/game.js` pass with 0 errors.
5. Dual-File Sync: SHA256 byte-level synchronization verified between `game.js` ↔ `assets/game.js` and `index.html` ↔ `assets/index.html`.
6. Forensic Integrity Audit: CLEAN verdict required.

## Code Layout
- `game.js` — Primary game logic and canvas rendering / sprite bake code.
- `assets/game.js` — Mirror copy of `game.js` (must be SHA256 identical).
- `index.html` — HTML shell.
- `assets/index.html` — Mirror copy of `index.html` (must be SHA256 identical).
