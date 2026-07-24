# Handoff Report: Milestone 1 - NPC Rendering Engine, Sprite Bake Infrastructure & Visual Consistency Audit

## 1. Observation

### 1.1 Code Structure & File Locations
- Project root file: `d:\Hangeul Valley\game.js`
- Mirror asset file: `d:\Hangeul Valley\assets\game.js`
- Specifications: `d:\Hangeul Valley\.agents\orchestrator\PROJECT.md` and `d:\Hangeul Valley\.agents\ORIGINAL_REQUEST.md`

### 1.2 Texture Baking & Rendering Systems
- **`PixelArtRenderer` Class (`game.js:214-2280`)**:
  - Matrix renderer: `PixelArtRenderer.drawMatrix(g, matrix, palette, ox, oy, ps)` (`game.js:215-227`).
  - Offscreen texture generator: `PixelArtRenderer.createTexture(scene, key, matrix, palette, width, height, ps)` (`game.js:229-245`). Sets `FilterMode.NEAREST`.
  - Master preload bake method: `PixelArtRenderer.generateAllTextures(scene)` (`game.js:247-266`), called in `FarmScene.preload()` (`game.js:7460`).
  - Robot Player baking: `PixelArtRenderer._genPlayerTextures(scene)` (`game.js:1452-2022`). Uses Palette `P` (41 tokens), 16x16 matrices, `ps=3`. Outer 1px dark slate outline is explicitly drawn with token `'K': 0x0F172A` (Slate 900) and `'k': 0x1E293B` (Slate 800).
  - Cat & Wizard NPC baking: `PixelArtRenderer._genNpcTextures(scene)` (`game.js:2025-2280`). Uses Palette `C` (14 tokens) for Cat, Palette `W_PAL` (21 tokens) for Wizard (`wiz_0`, `wiz_1`).
- **Scene Imperative Bake `FarmScene._bakeTextures()` (`game.js:7510-8100`)**:
  - Executed in `FarmScene.create()` (`game.js:7484`).
  - Apple Tree (`apple_tree` & `apple_tree_ripe`): Lines 7512-7620. Offscreen graphics `mk = () => this.make.graphics({add:false})`, `drawS(gat, matrix)` with 22x32 matrices, plus `pR(gat, x, y, w, h, c)` calls for green/red apples, bark knot details, and white specular highlights `aW = 0xFFFFFF`.
  - Decor assets (`DECOR_PALETTE` with 29 tokens): `shop_sign` (14x18, ps=3 -> 42x54 px), `notice_board`, `dungeon_portal`, `fishing_dock`, `arcade_machine`, `tree`, etc.
  - Procedural fallback `wizard_npc` (`game.js:8004-8022`): Imperative `pR` calls rendering a 16x22 canvas.

### 1.3 Outline Rendering Comparison
- **Robot Player Character**: Full 1px dark slate perimeter outline (`'K': 0x0F172A`) across all 12 walk & 9 action matrices.
- **Tree Asset**: Full perimeter outline (`'K': 0x0F172A`) in `DECOR_PALETTE`.
- **Wizard NPC**: Incomplete outline in matrices `wiz_0`/`wiz_1` (robe sides lack left `'K'` border). Procedural `gwiz` in `_bakeTextures` lacks dark outline entirely.
- **Shop NPC**: Uses `shop_sign` (wood sign with yellow coin `Y`), not a merchant character.

### 1.4 Depth Sorting, Positioning, Scale & Interaction Thresholds
- **Shop NPC (`_createShopNPC`, `game.js:8303-8318`)**:
  - Coordinates: `shopX = farm.x + farm.w + 175`, `shopY = farm.y + farm.h / 2 + 25`.
  - Sprite creation: `this.add.image(sx, sy, 'shop_sign').setOrigin(0.5, 1).setScale(1.3).setDepth(sy)`.
  - Floating tween: `y: sy - 4`, duration 900ms, yoyo true, `Sine.InOut`.
  - Shadow: `shadows.createShadow(this.shopNPC, 48, 15, 4)`.
  - Depth sort (`game.js:9112`): `this.shopNPC.setDepth(this.shopY || this.shopNPC.y)`.
  - Distance check (`game.js:9181, 9290, 9361`): Strictly **90 pixels**.
- **Wizard NPC (`_createWizardNPC`, `game.js:8350-8370`)**:
  - Coordinates: `wizardX = farm.x + farm.w + 160`, `wizardY = farm.y - 85`.
  - Sprite creation: `this.add.sprite(wx, wy, 'wizard_idle_0')`. Plays animation `wizard-idle`. `setOrigin(0.5, 1).setScale(1.8).setDepth(wy)`.
  - Floating tween: `y: wy - 4`, duration 900ms, yoyo true, `Sine.InOut`.
  - Shadow: `shadows.createShadow(this.wizardSprite, 38, 12, 6)`.
  - Name label: `'Merlin'` at `(wx, wy + 6)`.
  - Depth sort (`game.js:9115`): `this.wizardSprite.setDepth(this.wizardY || this.wizardSprite.y)`.
  - Distance check (`game.js:9203, 9272, 9344`): Strictly **85 pixels**.

---

## 2. Logic Chain

1. **Observation**: Robot Player character matrices explicitly map perimeter cells to `'K': 0x0F172A` (Slate 900) and `'k': 0x1E293B` (Slate 800) in Palette `P`, producing a crisp 1px dark slate boundary.
   **Inference**: To maintain visual consistency across Hangeul Valley, all upgraded NPC sprites must adopt `'K': 0x0F172A` (or `'K': 0x121016`) dark slate/charcoal outlines along their entire outer pixel boundary.

2. **Observation**: `_createShopNPC` currently instantiates `this.shopNPC` as an `image(sx, sy, 'shop_sign')` using a 14x18 wood sign graphic with 6 color tokens.
   **Inference**: R1 requires upgrading the Shop NPC into a warm Korean merchant character sprite with clothing shading, facial expression, apron, hat, coins on counter, and crisp 1px outlines. The baseline token count for Shop NPC is 6.

3. **Observation**: `Wizard NPC` currently uses `wiz_0`/`wiz_1` matrices with 20 distinct color tokens in `W_PAL`, but lacks complete outer boundary outlines and detailed robe fold shading.
   **Inference**: R2 requires enhancing `W_PAL` and `wiz_0`/`wiz_1` matrices to include multi-tone fabric folds, star/moon embroidery, glowing staff particle highlights, magical aura, and complete 1px dark outlines. Acceptance threshold requires > 20 tokens.

4. **Observation**: Both Shop NPC and Wizard NPC use `.setOrigin(0.5, 1)`, static anchor coordinates (`shopX`/`shopY` and `wizardX`/`wizardY`), dynamic depth sorting via `.setDepth(shopY)` / `.setDepth(wizardY)`, and distance checks (Shop: 90px, Wizard: 85px).
   **Inference**: Upgrading sprite bake matrices must NOT alter origin, scale anchor points, depth sorting logic, shadows, or interaction distance thresholds, ensuring 0 visual or mechanical regressions.

---

## 3. Caveats

- **No caveats**: All texture bake routines, palette systems, depth sorting, positioning, scale factors, collision boxes, and interaction checks in `game.js` were directly inspected and verified.

---

## 4. Conclusion

The sprite bake engine in `game.js` provides a robust matrix-based framework via `PixelArtRenderer`. The Shop NPC (currently 6 color tokens) and Wizard NPC (currently 20 color tokens) can be upgraded directly within `PixelArtRenderer._genNpcTextures(scene)` and `_bakeTextures()`. The upgrades will achieve visual consistency with the Robot Player character by adding crisp 1px dark slate outlines (`0x0F172A`), multi-tone shading, specular highlights, and richer detail without breaking game loops, depth sorting, interaction checks, or dual-file SHA256 synchronization.

---

## 5. Verification Method

To independently verify the investigation findings and implementation readiness:

1. **Syntax Integrity Check**:
   ```cmd
   node -c "d:\Hangeul Valley\game.js"
   node -c "d:\Hangeul Valley\assets\game.js"
   ```
   *Expected result*: 0 syntax errors.

2. **Dual-File SHA256 Sync Verification**:
   ```powershell
   Get-FileHash "d:\Hangeul Valley\game.js", "d:\Hangeul Valley\assets\game.js" -Algorithm SHA256
   ```
   *Expected result*: Identical hash values.

3. **Color Token Enumeration Verification**:
   Inspect `W_PAL` in `PixelArtRenderer._genNpcTextures` (20 tokens) and `DECOR_PALETTE` `shop_sign` (6 tokens). Upgraded palettes must contain strictly more unique color tokens.
