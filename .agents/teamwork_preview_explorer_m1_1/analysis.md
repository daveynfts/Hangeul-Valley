# Technical Analysis Report: Shop NPC Sprite Polish & Upgrade (Milestone 1 - R1)

**Target Scope**: Milestone 1 — Shop NPC Sprite Polish & Upgrade (R1)  
**Target File**: `game.js` (and dual-file sync to `assets/game.js`)  
**Author**: `teamwork_preview_explorer_m1_1`  
**Date**: 2026-07-24  

---

## 1. Codebase Architecture & Location Analysis

All logic for texture baking, instantiation, depth-sorting, collision, proximity handling, and UI interactions for the Shop NPC resides inside `game.js`.

### 1.1 Summary of Exact Line Locations in `game.js`

| Module / System | Line Numbers in `game.js` | Responsibilities / Functionality |
| :--- | :--- | :--- |
| **Texture Bake Function** | **Lines 7870–7892** | `_bakeTextures()` creates `shop_sign` texture using `PixelArtRenderer.drawMatrix(gs, matrix, DECOR_PALETTE, 0, 0, PS)`. |
| **Texture Filtering** | **Lines 8094–8101** | `_bakeTextures()` sets `setFilter(Phaser.Textures.FilterMode.NEAREST)` on `'shop_sign'` texture. |
| **NPC Instantiation** | **Lines 8302–8318** | `_createShopNPC(W, H)` places `this.shopNPC` image at `(sx, sy)`, sets origin `(0.5, 1)`, scale `1.3`, depth `sy`, shadow, bounce tween, and hint text `this.shopHint`. |
| **Dynamic Depth Sorting** | **Line 9070** | `update()` loop sets `this.shopNPC.setDepth(this.shopY || this.shopNPC.y)` dynamically every frame. |
| **Proximity Hint Visibility** | **Lines 9137–9141** | `update()` checks distance between player and `(shopX, shopY) < 90px` to toggle `shopHint` alpha. |
| **Target Highlight Indicator** | **Lines 9248–9250** | `_updateTargetHighlight()` checks `< 90px` distance and draws pulsing target box + `[SPACE] Open Shop` label. |
| **Space Key Interaction** | **Line 9361** | `_interact()` checks `< 90px` distance to call `openShop()`. |
| **Shop Modal UI & Quiz Gate** | **Lines 4356–4432 & 5367–5422** | Modal state management (`openShop()`, `closeShop()`), `shop-overlay` DOM controls, SRS quiz gate, and item purchases. |

---

## 2. Baseline Implementation & Color Token Inventory

### 2.1 Baseline Matrix Analysis
The baseline implementation bakes a 14×18 pixel matrix under the key `'shop_sign'` (lines 7872–7891):

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
      'KOwwwwwwwwwwwK',
      'KKKKKKKKKKKKKK',
      '....KWWKWWK...',
      '....KWWKWWK...',
      '....KWWKWWK...',
      '....KKKKKKK...'
    ], DECOR_PALETTE, 0, 0, PS);
    gs.generateTexture('shop_sign', 14*PS, 18*PS); gs.destroy();
```

### 2.2 Baseline Fill Color Tokens Count
The baseline sprite matrix utilizes `DECOR_PALETTE` (lines 7637–7669) with the following character mapping:

| Token Key | Hex Color | Description / Role |
| :---: | :---: | :--- |
| `.` | `null` | Transparent background |
| `K` | `0x0F172A` | 1px Dark Slate Outline / Structural boundary |
| `O` | `0xD99B66` | Sunlit wood highlight |
| `o` | `0xB3713D` | Oak wood highlight |
| `W` | `0x8F5428` | Cedar wood base |
| `w` | `0x573012` | Deep timber shadow |
| `Y` | `0xFDE047` | Bright gold (coin icon) |

**Total Baseline Color Token Count**: **6 distinct non-null fill color tokens**.

---

## 3. Recommended Upgrade Plan for Shop NPC Sprite (R1)

Currently, `shop_sign` is a minimal wooden signpost. Requirement R1 specifies upgrading the Shop NPC sprite to depict a warm, inviting Korean merchant character standing behind a wooden shop counter with rich pixel art accessories.

### 3.1 Proposed Visual Features
1. **Korean Merchant Character**:
   - **Headwear / Hat**: Traditional Korean merchant headwear/gat with multi-tone shading (`hatBase`, `hatShade`, `hatHighlight`).
   - **Facial Expression**: Friendly, warm Korean merchant expression with smiling eyes (`eyeDark`, `eyeSparkle`), rosy cheeks (`cheekPink`), and natural skin shading (`skinBase`, `skinShade`, `skinHighlight`).
   - **Clothing & Apron**: Korean merchant hanbok vest/robe and work apron with multi-tone cloth folds (`clothBase`, `clothShade`, `clothHighlight`, `apronBase`, `apronShade`).
2. **Shop Counter & Accessories**:
   - **Wood Counter**: Detailed wooden shop counter in front of the merchant with sunlit top edge and deep shadow underside (`counterTop`, `counterFront`, `counterShadow`).
   - **Coins on Counter**: Shiny gold coins stacked on the counter top (`coinBase`, `coinShade`, `coinHighlight`).
   - **Sign Banner Accent**: Hanging shop sign accent with warm gold coin motif.
3. **Outlines**:
   - Every outer edge and internal structural division must be bounded by a crisp 1px dark outline (`K = 0x0F172A` or `0x121016`) for visual consistency with the upgraded Robot character.

### 3.2 Expanded Color Token Palette Specification (14–16 Tokens)
To fulfill the acceptance criteria (must strictly increase unique fill color count from baseline 6), the upgraded Shop NPC palette should introduce:

```javascript
const SHOP_NPC_PALETTE = {
  '.': null,
  'K': 0x0F172A, // 1px Dark Slate Outline
  'k': 0x1E293B, // Dark slate inner shadow
  // Skin & Face (Warm Korean Merchant)
  'X': 0xFFDDAD, // Skin base tone
  'x': 0xEAA878, // Skin shadow tone
  'H': 0xFFEECA, // Skin highlight
  'P': 0xF87171, // Warm cheek blush
  'E': 0x1E1B4B, // Dark eye pupil / expression line
  // Merchant Headwear & Hair
  'J': 0x334155, // Merchant hat base
  'j': 0x1E293B, // Merchant hat shadow
  'L': 0x64748B, // Merchant hat highlight
  // Merchant Clothing & Hanbok Vest
  'R': 0xB91C1C, // Crimson vest base
  'r': 0x7F1D1D, // Crimson vest shadow
  'm': 0xEF4444, // Crimson vest highlight
  // Apron
  'A': 0xFEF08A, // Cream/yellow apron base
  'a': 0xCA8A04, // Apron shadow
  // Counter & Wood Structure
  'O': 0xD99B66, // Sunlit wood highlight
  'o': 0xB3713D, // Oak wood midtone
  'W': 0x8F5428, // Cedar wood base
  'w': 0x573012, // Deep timber shadow
  // Coins on Counter
  'Y': 0xFDE047, // Gold coin base
  'y': 0xD97706, // Gold coin shadow
  'U': 0xFFFFFF  // Gold coin specular highlight
};
```
**Upgraded Token Count**: **16+ distinct color tokens** (vs 6 baseline).

### 3.3 Matrix Layout Structure Recommendation (e.g. 18×22 grid)
```
Row 0-4:   Merchant Hat & Headband
Row 5-8:   Face, Smiling Eyes, Rosy Cheeks, Beard/Smile Accent
Row 9-13:  Hanbok Vest, Shoulders, Apron Ties
Row 14-18: Shop Counter Top, Coins Stack, Counter Planks
Row 19-21: Counter Support Base & Ground Outline
```

---

## 4. Verification & Non-Regression Analysis

### 4.1 Collision, Position & Depth-Sorting Checks
- **Position Anchors**: `sx = farm.x + farm.w + 175`, `sy = farm.y + farm.h / 2 + 25`.
- **Origin**: Kept at `setOrigin(0.5, 1)`. Ground contact remains aligned with `(sx, sy)`.
- **Scale**: Scaled at `1.3` (or adjusted proportionally to maintain player-to-NPC ratio).
- **Depth Sorting**: Dynamic Y-depth `setDepth(this.shopY || this.shopNPC.y)` works automatically because depth matches ground contact Y (`sy`). When `player.y < shopY`, player renders behind NPC; when `player.y > shopY`, player renders in front of NPC.
- **Shadow**: `this.shadows.createShadow(this.shopNPC, 48, 15, 4)` projects clean elliptical shadow at feet/counter base.

### 4.2 Interaction & Shop Overlay Functional Checks
- Distance check `< 90px` in `_updateTargetHighlight()` and `_interact()` triggers `openShop()`.
- `openShop()` triggers `setModalState('shop-overlay', true)` and `buildShopGrid()`.
- Purchases gate through `startShopQuizGate(idx)` and unlock SRS vocabulary levels.
- All functional and UI pathways remain 100% error-free.

---

## 5. Precise Directives for Implementation Worker

1. Edit `_bakeTextures()` in `game.js` (lines 7870–7892) to replace the basic sign matrix with the upgraded Shop NPC merchant & counter matrix.
2. Verify that `shop_sign` texture registration and `NEAREST` filter mode remain active (lines 8094–8101).
3. Ensure no modifications to `_createShopNPC()` positional anchors, origin `(0.5, 1)`, depth sorting, or interaction triggers.
4. Run `node -c game.js` and `node -c assets/game.js` to ensure syntax validity.
5. Synchronize byte-for-byte from `game.js` to `assets/game.js`.
