# Milestone 1: NPC Rendering Engine, Sprite Bake Infrastructure & Visual Consistency Audit

## 1. Texture Baking System & Pixel Art Rendering Infrastructure

### 1.1 Architecture & Pipeline Overview
The game uses a two-tier procedural texture baking system in `game.js`:

1. **`PixelArtRenderer` Class (`game.js:214-2280`)**:
   - `PixelArtRenderer.drawMatrix(g, matrix, palette, ox, oy, ps)` (lines 215-227): Parses 2D character matrices (ASCII maps), mapping non-null tokens in `palette` to `g.fillStyle(col, 1); g.fillRect((ox + rx) * ps, (oy + ry) * ps, ps, ps);`.
   - `PixelArtRenderer.createTexture(scene, key, matrix, palette, width, height, ps)` (lines 229-245): Instantiates an offscreen Phaser Graphics object (`scene.make.graphics({ add: false })`), renders matrix cells, generates a Phaser texture via `g.generateTexture(key, width * ps, height * ps)`, destroys graphics, and sets `FilterMode.NEAREST` filtering on the texture.
   - `PixelArtRenderer.generateAllTextures(scene)` (lines 247-266): Preload master bake method called during `FarmScene.preload()` (line 7460). Sets `scene._pixelArtTexturesBaked = true;`. Delegates to:
     - `_genPlayerTextures(scene)` (lines 1452-2022): Bakes 12 walk cycle matrices (`player_walk_down_0..2`, `up_0..2`, `left_0..2`, `right_0..2`), 9 action matrices (`player_water_down_0..2`, `harvest_down_0..2`, `pick_down_0..2`), tool textures, and legacy farmer aliases. Uses 16x16 matrices with Palette `P` (41 tokens) and `ps=3` (48x48 px textures).
     - `_genNpcTextures(scene)` (lines 2025-2280): Bakes Cat NPC animations (`cat_idle_0..1`, `cat_walk_0..2`, `cat_sit_0..1`, `cat_sleep_0..1`, `cat_npc`) using Palette `C` (14 tokens, 16x16 matrix). Also bakes Wizard NPC animations (`wizard_idle_0`, `wizard_idle_1`, `wizard_npc`) using Palette `W_PAL` (21 tokens, 16x16 matrix `wiz_0`/`wiz_1`).
     - `_genCropAndTreeTextures`, `_genFishingTextures`, `_genArcadeTextures`, `_genDungeonTextures`, `_genBossTextures`, `generateTilemapTextures`, `_genParticleTextures`, etc.

2. **Scene Imperative Bake `FarmScene._bakeTextures()` (`game.js:7510-8100`)**:
   - Executed during `FarmScene.create()` (line 7484).
   - Generates environment and decor textures using offscreen graphics (`mk = () => this.make.graphics({add:false})`):
     - `apple_tree` & `apple_tree_ripe` (lines 7512-7620): Uses `appleTree_unripe` / `appleTree_ripe` string matrices (22x32) drawn via helper `drawS(gat, matrix)` plus direct imperative `pR(gat, x, y, w, h, c)` calls for green/red apples, bark knot details, and white specular highlights (`aW = 0xFFFFFF`). Rendered at `22*PS x 32*PS` (66x96 px).
     - Decor textures (lines 7673-8022): Uses `DECOR_PALETTE` (29 tokens) with `PixelArtRenderer.drawMatrix(...)`:
       - `shop_sign` (14x18 matrix, ps=3 -> 42x54 px): Current texture used by `_createShopNPC`.
       - `notice_board` (18x16 matrix, ps=3 -> 54x48 px).
       - `dungeon_portal` (20x28 matrix, ps=3 -> 60x84 px).
       - `fishing_dock` (26x20 matrix, ps=3 -> 78x60 px).
       - `arcade_machine` (16x22 matrix, ps=3 -> 48x66 px).
       - `stone_well`, `pixel_barrel`, `pixel_crate`, `signpost`, `tree`, `fnc_post`, `fnc_rail`, `sparkle`, `coin`.
       - `wizard_npc` (lines 8004-8022): Procedural `pR` block rendering a 16x22 canvas (`gwiz.generateTexture('wizard_npc', 16*PS, 22*PS)`). Note: `_genNpcTextures` also bakes `wizard_idle_0`/`1` which `_createWizardNPC` uses for animation.

---

## 2. Visual Outlines & Shading Analysis (Player/Tree vs. Shop/Wizard)

| Asset | Outline Implementation | Outline Token & Color | Shading & Detail Level | Compliance with Milestone 1 Standard |
|---|---|---|---|---|
| **Robot Player Character** | Full outer 1px perimeter outline around all 16x16 walk/action matrices | Palette `P`: `'K': 0x0F172A` (Slate 900) & `'k': 0x1E293B` (Slate 800) | Multi-tone metallic casing (`Y`,`y`,`J`,`j`), joints (`C`,`c`,`m`,`M`,`d`,`D`), LED visor specular highlights (`W`,`L`,`V`,`v`,`z`,`Z`), warning lights (`R`,`r`,`A`,`a`) | **Gold Standard Baseline** |
| **Apple Tree / Tree** | Perimeter outlined with dark boundary tokens (`'K': 0x0F172A` in `tree`, leaf shading in `apple_tree`) | `'K': 0x0F172A` | Lush multi-tone canopy, individual ripe apples with dark shade (`aRd`), main red (`aR`), highlight (`aRh`), white specular (`aW=0xFFFFFF`), textured bark knots | **High Quality Baseline** |
| **Wizard NPC** | Incomplete matrix outline (`wiz_0`/`wiz_1`). Outer robe edges lack left `'K'` boundary; procedural `gwiz` in `_bakeTextures` lacks dark outline entirely. | Palette `W_PAL`: `'K': 0x121016` (used partially); absent in procedural fallback | Single-tone flat purple blocks in `gwiz`, basic beard (`d`,`D`,`b`), yellow star (`y`,`Y`), basic staff (`S`,`s`). Needs fabric folds, embroidery, glowing staff highlights, magical aura, and full 1px dark slate outline. | **Requires Upgrade (R2)** |
| **Shop NPC** | Currently uses `shop_sign` (wood board with yellow coin icon `Y`). Outlined with `'K': 0x0F172A`, but represents a signpost rather than a character sprite. | `DECOR_PALETTE`: `'K': 0x0F172A` | Flat sign graphic (wood planks `O`,`o`,`W`,`w`, gold coin `Y`). Missing merchant character body, clothing, face, hat, apron, counter, and multi-tone shading. | **Requires Upgrade (R1)** |

---

## 3. Depth Sorting, Positioning, Scales & Interaction Mechanics

### 3.1 Shop NPC Specs
- **Instantiation Method**: `_createShopNPC(W, H)` (`game.js:8303-8318`)
- **Positioning**:
  - `shopX = farm.x + farm.w + 175`
  - `shopY = farm.y + farm.h / 2 + 25`
- **Sprite Type & Scale**: `this.add.image(sx, sy, 'shop_sign').setOrigin(0.5, 1).setScale(1.3).setDepth(sy)`
- **Dynamic Tween**: Floating tween `y: sy - 4`, duration 900ms, yoyo true, `Sine.InOut`.
- **Shadow**: `shadows.createShadow(this.shopNPC, 48, 15, 4)`
- **Depth Sorting (`depthSort`)**: `update()` line 9112: `this.shopNPC.setDepth(this.shopY || this.shopNPC.y)`. Player depth is `playerBaseY = player.y + (player.displayHeight * (1 - player.originY))`.
- **Interaction Distance**: Threshold is strictly **90 pixels**.
  - Hint text label (`shopHint` alpha toggle): `Phaser.Math.Distance.Between(player.x, player.y, shopX, shopY) < 90` (line 9181).
  - Target highlight box (`_updateTargetHighlight`): `< 90` (line 9290).
  - SPACE key trigger (`_interact`): `< 90` -> calls `openShop()` (line 9361).

### 3.2 Wizard NPC Specs
- **Instantiation Method**: `_createWizardNPC(W, H)` (`game.js:8350-8370`)
- **Positioning**:
  - `wizardX = farm.x + farm.w + 160`
  - `wizardY = farm.y - 85`
- **Sprite Type & Scale**: `this.add.sprite(wx, wy, 'wizard_idle_0')`. Plays animation `wizard-idle`. `setOrigin(0.5, 1).setScale(1.8).setDepth(wy)`.
- **Dynamic Tween**: Floating tween `y: wy - 4`, duration 900ms, yoyo true, `Sine.InOut`.
- **Shadow**: `shadows.createShadow(this.wizardSprite, 38, 12, 6)`
- **Name Label**: Text `'Merlin'` at `(wx, wy + 6)`, depth `wy + 1`.
- **Depth Sorting**: `update()` line 9115: `this.wizardSprite.setDepth(this.wizardY || this.wizardSprite.y)`.
- **Interaction Distance**: Threshold is strictly **85 pixels**.
  - Hint text label (`wizardHint` alpha toggle): `< 85` (line 9203).
  - Target highlight box: `< 85` (line 9272).
  - SPACE key trigger (`_interact`): `< 85` -> unlocks check `isZoneUnlocked('duel')` -> `openSpellDuel()` (line 9344).

---

## 4. Color Token Counting Methodology for Acceptance Testing

### 4.1 Definition of Color Token
A **color token** is defined as an explicit, distinct non-null 24-bit RGB hexadecimal color value (e.g., `0x0F172A`) defined in the texture palette dictionary (`palette[char]`) or passed to imperative drawing routines (`pR(g, x, y, w, h, color)`) used during texture generation.

### 4.2 Baseline Enumeration

1. **Shop NPC Baseline**:
   - Current texture: `shop_sign` in `DECOR_PALETTE` (`game.js:7872-7892`).
   - Active tokens used in matrix: `'K'` (`0x0F172A`), `'O'` (`0xD99B66`), `'o'` (`0xB3713D`), `'W'` (`0x8F5428`), `'w'` (`0x573012`), `'Y'` (`0xFDE047`).
   - **Baseline Token Count = 6 distinct color tokens**.

2. **Wizard NPC Baseline**:
   - Current texture: `W_PAL` in `PixelArtRenderer._genNpcTextures` (`game.js:2214-2223`).
   - Palette hex values: `0x121016`, `0x251C2B`, `0xA78BFA`, `0x8B5CF6`, `0x6D28D9`, `0x4C1D95`, `0xFFFFFF`, `0xE2E8F0`, `0x94A3B8`, `0xFBBF24`, `0xD97706`, `0x7DD3FC`, `0x38BDF8`, `0x0284C7`, `0x78350F`, `0x451A03`, `0xEAA878`, `0xC87858`, `0x984838`, `0xE0F2FE`.
   - **Baseline Token Count = 20 distinct color tokens**.

### 4.3 Automated Verification Formula
For acceptance testing (Acceptance Criterion 1):
```javascript
function countUniqueColorTokens(paletteObject) {
  const hexSet = new Set();
  Object.entries(paletteObject).forEach(([char, val]) => {
    if (char !== '.' && char !== ' ' && val !== null && val !== undefined) {
      hexSet.add(typeof val === 'number' ? val.toString(16).toUpperCase() : val);
    }
  });
  return hexSet.size;
}
```
- **Shop NPC Upgrade Acceptance Threshold**: `new_token_count > 6` (Target: 18 - 25 tokens).
- **Wizard NPC Upgrade Acceptance Threshold**: `new_token_count > 20` (Target: 24 - 30 tokens).

---

## 5. Architectural Guidelines for Implementer/Worker

1. **Dual-File Synchronicity Constraint**:
   - `game.js` and `assets/game.js` MUST be maintained in exact byte-for-byte SHA256 synchronization.
   - After updating `game.js`, run `copy /Y "d:\Hangeul Valley\game.js" "d:\Hangeul Valley\assets\game.js"`.
   - Run `node -c game.js` and `node -c assets/game.js` to ensure 0 syntax errors.

2. **Bake Pipeline Integration**:
   - Place matrix and palette definitions in `PixelArtRenderer._genNpcTextures(scene)` (lines 2025-2280).
   - For Wizard NPC: Upgrade `W_PAL` and matrices `wiz_0` & `wiz_1` with full 1px dark slate outlines (`'K': 0x0F172A`), multi-tone robe shading, embroidery detail, and particle staff highlights. Ensure procedural `gwiz` in `_bakeTextures()` either delegates to or mirrors `wiz_0`.
   - For Shop NPC: Create a dedicated character sprite matrix (e.g. `shop_npc_idle_0`, `shop_npc_idle_1` or `shop_npc`) depicting a warm Korean merchant character with clothing shading, hat, apron, and counter coins, surrounded by crisp 1px dark slate outlines (`'K': 0x0F172A`).
   - Ensure `tex.setFilter(Phaser.Textures.FilterMode.NEAREST)` is applied to all generated textures (handled automatically by `PixelArtRenderer.createTexture`).

3. **Game Loop & Component Non-Regression**:
   - Maintain `setOrigin(0.5, 1)` on all NPC sprites so feet/base align with ground Y coordinates.
   - Maintain exact base coordinates (`shopX`, `shopY`, `wizardX`, `wizardY`).
   - Do NOT alter depth sorting logic in `update()` (`this.shopNPC.setDepth(this.shopY)`, `this.wizardSprite.setDepth(this.wizardY)`).
   - Preserve shadow creation calls (`this.shadows.createShadow(...)`).
   - Preserve exact interaction distance thresholds (Shop: `< 90`, Wizard: `< 85`).
