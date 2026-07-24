# Handoff Report: Shop NPC Sprite Polish & Upgrade (Milestone 1 - R1)

**Agent**: `teamwork_preview_explorer_m1_1`  
**Role**: Read-only Explorer  
**Task**: Milestone 1 - Shop NPC Sprite Polish & Upgrade (R1) Analysis  
**Working Directory**: `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m1_1`  

---

## 1. Observation

Direct observations from inspecting `d:\Hangeul Valley\game.js` and workspace documents (`.agents\orchestrator\PROJECT.md`, `.agents\ORIGINAL_REQUEST.md`):

1. **Texture Baking Location (`game.js:7870–7892`)**:
   `shop_sign` texture is baked inside `_bakeTextures()`:
   ```javascript
   // Shop sign texture 14x18
   const gs = mk();
   PixelArtRenderer.drawMatrix(gs, [
     '..KKKKKKKKKK..',
     '..KOOOOOOOOK..',
     '..KOOOOOOOOK..',
     'KKKKKKKKKKKKKK',
     'KOOOOOOOOOOOoK',
     'KOWWKKYYKKWWwK',
     'KOWKYYYYYYKWwK',
     'KOWKYYYYYYKWwK',
     'KOWKYYYYYYKWwK',
     'KOWWKKYYKKWWwK',
     'KOWWWWWWWWWWwK',
     'KOWWWWWWWWWWwK',
     'KOwwwwwwwwxxxK',
     'KKKKKKKKKKKKKK',
     '....KWWKWWK...',
     '....KWWKWWK...',
     '....KWWKWWK...',
     '....KKKKKKK...'
   ], DECOR_PALETTE, 0, 0, PS);
   gs.generateTexture('shop_sign', 14*PS, 18*PS); gs.destroy();
   ```

2. **Baseline Palette & Color Count (`game.js:7637–7669`)**:
   `DECOR_PALETTE` maps matrix characters:
   - `.` : null (transparent)
   - `K` : `0x0F172A` (1px Dark Slate Outline)
   - `O` : `0xD99B66` (Sunlit wood highlight)
   - `o` : `0xB3713D` (Oak wood highlight)
   - `W` : `0x8F5428` (Cedar wood base)
   - `w` : `0x573012` (Deep timber shadow)
   - `Y` : `0xFDE047` (Bright gold coin icon)
   **Distinct Fill Color Count**: Exactly **6 unique color tokens**.

3. **Texture Registry & Filter Setup (`game.js:8094–8101`)**:
   `'shop_sign'` is registered in the list of procedurally baked decor textures and forced to `Phaser.Textures.FilterMode.NEAREST`.

4. **NPC Instantiation (`game.js:8303–8318`)**:
   `_createShopNPC(W, H)` initializes the sprite:
   - Position: `sx = farm.x + farm.w + 175`, `sy = farm.y + farm.h / 2 + 25`
   - Image creation: `this.shopNPC = this.add.image(sx, sy, 'shop_sign').setOrigin(0.5, 1).setScale(1.3).setDepth(sy);`
   - Shadow: `this.shadows.createShadow(this.shopNPC, 48, 15, 4)`
   - Idle tween: `y: sy - 4`, duration 900ms, Sine.InOut
   - Hint text: `this.shopHint = this.add.text(sx, sy + 10, '🏪 SHOP\n[SPACE]', ...)`

5. **Dynamic Depth Sorting (`game.js:9070`)**:
   `if (this.shopNPC) this.shopNPC.setDepth(this.shopY || this.shopNPC.y);` executed on every update frame.

6. **Proximity & Interaction Logic (`game.js:9138, 9248, 9361`)**:
   - Distance threshold: `Distance < 90px` between `(player.x, player.y)` and `(shopX, shopY)`.
   - Actions: Toggles `shopHint` alpha, renders `[SPACE] Open Shop` target highlight, calls `openShop()` when `SPACE` key is pressed.

---

## 2. Logic Chain

1. **Observation 1 & 2** establish that the baseline `shop_sign` sprite is a basic 14×18 signpost with only 6 unique color tokens.
2. **Acceptance Criteria Requirement (R1)** mandates upgrading the Shop NPC sprite with a warm Korean merchant character, multi-tone clothing, face details, apron, hat, coins on counter, crisp 1px dark outlines (`K = 0x0F172A`), and an increased unique color token count (> 6 tokens).
3. **Observations 3, 4, 5, & 6** prove that all game systems rely on the texture key `'shop_sign'`, origin `(0.5, 1)`, scale `1.3`, depth `sy`, and anchor coordinates `(shopX, shopY)` with a 90px interaction radius.
4. Therefore, upgrading the pixel art matrix directly inside `_bakeTextures()` (lines 7870–7892) while maintaining the key name `'shop_sign'`, origin `(0.5, 1)`, and depth/collision anchors guarantees 100% visual improvement without breaking any scene references, physics shadows, or `openShop()` UI logic.

---

## 3. Caveats

- **Pixel Scale vs Texture Dimension**: If the upgraded matrix grid is expanded (e.g. from 14×18 to 18×22), `generateTexture('shop_sign', W*PS, H*PS)` will automatically adjust width and height. The scale factor `1.3` in `_createShopNPC()` should be spot-checked to ensure the NPC height relative to the player character (~1.8 scale) remains visually balanced.
- **Dual-File Sync**: Any change to `game.js` must be byte-for-byte copied to `assets/game.js` to satisfy the SHA256 sync criterion.

---

## 4. Conclusion

The Shop NPC baseline implementation is fully located and understood. Upgrading the Shop NPC sprite requires replacing the 14×18 signpost matrix in `_bakeTextures()` (lines 7870–7892 of `game.js`) with an expanded, multi-tone pixel matrix featuring a Korean merchant character behind a wooden counter with shiny gold coins, bounded by crisp 1px dark outlines (`K`), utilizing 14–16 color tokens. All functional, positional, depth-sorting, and modal interaction dependencies remain intact.

---

## 5. Verification Method

1. **Syntax Check**:
   Run `node -c game.js` and `node -c assets/game.js`. Both must report 0 syntax errors.
2. **Color Token Count Inspection**:
   Inspect the new matrix in `_bakeTextures()` and verify that the set of non-null fill color tokens contains > 6 unique colors.
3. **Dual-File Synchronization**:
   Run SHA256 hash comparison between `game.js` and `assets/game.js` to verify 100% byte match.
4. **Functional & Interaction Verification**:
   Inspect `openShop()`, proximity check (< 90px), dynamic Y-sorting depth, shadow anchor, and modal dialog overlay to confirm zero functional regression.
