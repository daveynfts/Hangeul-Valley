# Detailed Analysis & Design Report: Procedural 48x48 Pixel Art Sprite Renderer (Crops, Trees, Soil)

**Milestone**: M1 - Procedural 48x48 Pixel Art Sprite Renderer & Character System  
**Author**: Explorer 2  
**Target Project**: Hangeul Valley (`C:/VibeCode/Hangeul Valley`)  
**Target Code File**: `C:/VibeCode/Hangeul Valley/game.js`  

---

## Executive Summary

The current crop rendering system in `game.js` relies on a combination of basic 12x20 string-drawn sprites (scaled up by a factor of 3 to 36x60), emoji icons (`🌸`, `🥬`, `🍓`, `🌽`, `🌻`), and 5 generic color palette swaps. It lacks distinct custom 48x48 pixel art graphics for individual crop species, misses a dedicated Stage 0 (Seed/Dirt Mound) sprite, and renders crops with uniform shapes regardless of whether they are radishes, carrots, pumpkins, or corn.

This analysis provides a comprehensive, production-ready procedural pixel art design spec using Phaser 3 `Graphics` API (`graphics.fillRect()` and `generateTexture()`) for:
1. **Soil Tiles (48x48)**: Tilled soil (`drt_dry`), Watered soil (`drt_wet`), and Grass variations (`grs0..3`).
2. **Crops (4 Growth Stages x 6 Crops)**: 48x48 resolution grid designs for Stage 0 (Seed/Mound), Stage 1 (Sprout), Stage 2 (Growing Plant), and Stage 3 (Mature Crop) across Radish (무), Carrot (당근), Strawberry (딸기), Pumpkin (호박), Corn (옥수수), and Cabbage (배추).
3. **Apple Tree (Multi-Tile 48x48 / 64x64 / 96x96)**: Multi-tile procedural tree with realistic wooden trunk, multi-layered foliage canopy, and vibrant red apples with unripened vs. ripe states.

---

## Part 1: Analysis of Existing Crop & Tree Rendering in `game.js`

### 1.1 Existing Soil Tile Textures
- **Location**: `game.js`, lines 142-170, 1642-1644
- **Implementation**:
  - `GRASS`: 4 pattern arrays (16x16 characters). Generated as `grs0`, `grs1`, `grs2`, `grs3` using `drawS(g, rows)` where `PS = 3` (16 * 3 = 48px).
  - `DIRT_DRY`: 18x16 character array drawn as `drt_dry` (16*PS x 16*PS = 48x48px). Palette consists of `#BAAAaA` light dry earth tones.
  - `DIRT_WET`: 17x16 character array drawn as `drt_wet` (16*PS x 16*PS = 48x48px). Palette consists of `#WWwWW` dark moist earth tones with white specks (`J`).
- **Issues Identified**:
  - `DIRT_DRY` and `DIRT_WET` lack rich tilled furrow ridges, moist sheen specular highlights, and natural organic dirt textures.
  - Grass tiles lack distinct blade tufts, clover patches, and depth shadows.

### 1.2 Existing Crop Rendering System
- **Location**: `game.js`, lines 173, 1846-1871, 2606-2717
- **Implementation**:
  - `CROP_ICONS`: `['🌸','🥬','🍓','🌽','🌻']` used as plot background text overlays (line 173, 2367).
  - `CC` (Color Palettes): 5 array tuples defining `[MainColor, DarkColor, LightColor]` for generic crops:
    ```javascript
    const CC = [
      [0xFF88B4, 0xAA1844, 0xFFCCE4], // Index 0: Radish / Pink
      [0x88EE44, 0x448A22, 0xCCFF99], // Index 1: Cabbage / Green
      [0xFF4444, 0xAA1111, 0xFF9999], // Index 2: Strawberry / Red
      [0xFFCC00, 0xCC8800, 0xFFEE99], // Index 3: Corn / Yellow
      [0xFFEE44, 0xCCAA00, 0xFFFF99], // Index 4: Sunflower/Carrot / Gold
    ];
    ```
  - Textures `cr_${t}_1`, `cr_${t}_2`, `cr_${t}_3` are generated procedurally on a 12x20 grid (`PS = 3` -> 36x60 px canvas) in `_bakeTextures()`:
    - **Stage 1 (`cr_${t}_1`)**: 2 small green stem rectangles (`K.P`, `K.v`).
    - **Stage 2 (`cr_${t}_2`)**: Taller 12px stem rectangle with side leaves.
    - **Stage 3 (`cr_${t}_3`)**: Same stem as Stage 2 + a solid rectangular fruit block at top (`g3.fillRect(3*PS, 0, 6*PS, 6*PS)`).
- **Issues Identified**:
  - All 5 crops share the exact same rectangular silhouette! The only difference between a radish, corn, and strawberry is the hex color of the top rectangle box.
  - Stage 0 (Seed/Mound) does not exist as a graphic texture. P1 planting immediately shows a Stage 1 sprout.
  - The crops are 36x60 on a 48x48 tile, causing origin mismatch and floating fruit shapes.

### 1.3 Existing Apple Tree Rendering System
- **Location**: `game.js`, lines 1616-1640, 2207-2268, 2286-2315
- **Implementation**:
  - `crown2` & `crown` (18x30 string array, `PS = 3` -> 54x90 px canvas).
  - Textures: `apple_tree` (unripe) and `apple_tree_ripe` (ripe with red pixel dots at fixed grid coordinates `(3,5)`, `(2,9)`, `(8,10)`).
  - In `_createAppleTree(W, H)`, the image is rendered with `setScale(2.5)` (making it ~135x225 px rendered in game).
- **Issues Identified**:
  - Hardcoded string array limits canopy density and foliage shading.
  - Tree trunk is a simple 4x11 rectangle with minimal bark detail.
  - Apple spots are small 3x2 blocks overlaid on green foliage.

---

## Part 2: Procedural 48x48 Pixel Art Architecture

### 2.1 Technical Specs
- **Grid Resolution**: 48x48 pixels per tile (`PLOT_SIZE = 48`, `TILE = 48`).
- **Scale Strategy**: Standardized 16x16 pixel matrix with pixel scaling factor `PS = 3` ($16 \times 3 = 48\text{px}$) OR direct 48x48 coordinate drawing using `graphics.fillRect(x, y, w, h)`. Using `PS = 3` guarantees pixel-perfect retro aesthetics matching the rest of the game engine.
- **Color Palette Standards**:
  - **Earth / Dirt**: Dark Mud `#1F0E02`, Dry Tilled Soil `#5C3010`, Moist Soil `#3E1C08`, Soil Highlight `#7A480A`, Specular Sheen `#4A6B82`.
  - **Foliage Green**: Deep Shadow `#166534`, Forest Green `#15803D`, Mid-leaf `#22C55E`, Bright Leaf `#4ADE80`, Sprout Shoot `#86EFAC`, Golden Lime `#A3E635`.
  - **Fruit & Vegetables**:
    - Radish: Body `#FFFFFF`, Root Shadow `#CBD5E1`, Purple Crown `#8B5CF6`, Deep Purple `#6D28D9`.
    - Carrot: Root `#FF6B00`, Deep Orange `#EA580C`, Highlight `#FDBA74`, Fronds `#10B981`.
    - Strawberry: Berry `#EF4444`, Crimson `#B91C1C`, Seeds `#FDE047`, Leaf `#15803D`.
    - Pumpkin: Skin `#F97316`, Rib Shadow `#C2410C`, Highlight `#FDBA74`, Vine `#166534`.
    - Corn: Husk `#86EFAC`, Dark Husk `#15803D`, Cob `#EAB308`, Kernel Shadow `#CA8A04`, Silk `#FDE047`.
    - Cabbage: Outer Leaf `#166534`, Mid Leaf `#22C55E`, Inner Core `#86EFAC`, Rib `#DCFCE7`.

---

## Part 3: Soil Tile Pixel Designs (48x48 Resolution)

Each soil tile is generated via Phaser 3 `Graphics` API as a 48x48 texture.

### 3.1 Tilled Soil Tile (`drt_dry` / `soil_tilled`)
- **Visual Concept**: Rich, dark brown tilled earth with distinct horizontal furrow lines, small dirt mounds, and scattered pebble accents.
- **Color Key**:
  - `B1`: Base Tilled Soil `#5C3010`
  - `B2`: Furrow Shadow `#3E1C08`
  - `B3`: Ridge Highlight `#7A480A`
  - `P1`: Small Pebble `#78716C`
  - `P2`: Pebble Shadow `#44403C`
- **16x16 Matrix Code (Scaled by `PS = 3`)**:
  ```javascript
  // 16x16 grid for Tilled Soil (drt_dry)
  const TILE_TILLED = [
    'B1B1B3B1B1B1B3B1B1B1B3B1B1B1B3B1',
    'B2B2B2B2B2B2B2B2B2B2B2B2B2B2B2B2',
    'B1B3B1B1P1B1B1B3B1B1B1B3B1P1B1B1',
    'B1B1B1B1P2B1B1B1B1B1B1B1B1P2B1B1',
    'B2B2B2B2B2B2B2B2B2B2B2B2B2B2B2B2',
    'B3B1B1B1B1B1B3B1B1B1B3B1B1B1B3B1',
    'B1B1B1P1B1B1B1B1B1B1B1B1P1B1B1B1',
    'B2B2B2B2B2B2B2B2B2B2B2B2B2B2B2B2',
    'B1B3B1B1B1B1B3B1B1B3B1B1B1B1B3B1',
    'B1B1B1B1B1B1B1B1B1B1B1B1B1B1B1B1',
    'B2B2B2B2B2B2B2B2B2B2B2B2B2B2B2B2',
    'B3B1B1P1B1B1B3B1B1B1B3B1B1P1B1B1',
    'B1B1B1P2B1B1B1B1B1B1B1B1B1P2B1B1',
    'B2B2B2B2B2B2B2B2B2B2B2B2B2B2B2B2',
    'B1B3B1B1B1B1B3B1B1B1B3B1B1B1B3B1',
    'B1B1B1B1B1B1B1B1B1B1B1B1B1B1B1B1',
  ];
  ```

### 3.2 Watered Soil Tile (`drt_wet` / `soil_watered`)
- **Visual Concept**: Dark, saturated moist earth with subtle cyan/blue specular water droplets and glistening moisture sheen.
- **Color Key**:
  - `W1`: Deep Dark Wet Mud `#2A1404`
  - `W2`: Moist Base `#3E1C08`
  - `W3`: Water Sheen `#4A6B82`
  - `W4`: Droplet Highlight `#67E8F9`
  - `W5`: Wet Shadow `#1F0E02`
- **16x16 Matrix Code (Scaled by `PS = 3`)**:
  ```javascript
  const TILE_WATERED = [
    'W1W1W2W1W1W1W2W1W1W1W2W1W1W1W2W1',
    'W5W5W5W5W5W5W5W5W5W5W5W5W5W5W5W5',
    'W1W2W1W1W4W1W1W2W1W1W1W2W1W4W1W1',
    'W1W1W1W1W3W1W1W1W1W1W1W1W1W3W1W1',
    'W5W5W5W5W5W5W5W5W5W5W5W5W5W5W5W5',
    'W2W1W1W1W1W1W2W1W4W1W2W1W1W1W2W1',
    'W1W1W1W4W1W1W1W1W3W1W1W1W4W1W1W1',
    'W5W5W5W5W5W5W5W5W5W5W5W5W5W5W5W5',
    'W1W2W1W3W1W1W2W1W1W2W1W1W3W1W2W1',
    'W1W1W1W1W1W1W1W1W1W1W1W1W1W1W1W1',
    'W5W5W5W5W5W5W5W5W5W5W5W5W5W5W5W5',
    'W2W1W1W4W1W1W2W1W1W1W2W1W1W4W1W1',
    'W1W1W1W3W1W1W1W1W1W1W1W1W1W3W1W1',
    'W5W5W5W5W5W5W5W5W5W5W5W5W5W5W5W5',
    'W1W2W1W1W1W1W2W1W1W1W2W1W1W1W2W1',
    'W1W1W1W1W1W1W1W1W1W1W1W1W1W1W1W1',
  ];
  ```

### 3.3 Grass Variations (`grs0`, `grs1`, `grs2`, `grs3`)
- **Visual Concept**: Vibrant green meadow tiles with randomized blade tufts, wildflowers, and clover accents for seamless tiling.
- **Palette**: Base `#5DA832`, Dark Grass `#4A9225`, Light Blade `#77CC44`, High Blade `#88EE44`, Wildflower `#FDE047`.

---

## Part 4: Crop Procedural Grid Designs (4 Growth Stages x 6 Crops)

Each crop has 4 distinct textures generated in `_bakeTextures()`:
- `crop_<name>_0`: Stage 0 (Seed / Dirt Mound)
- `crop_<name>_1`: Stage 1 (Small Green Sprout)
- `crop_<name>_2`: Stage 2 (Growing Plant / Mid Foliage)
- `crop_<name>_3`: Stage 3 (Mature Harvestable Crop)

```
        Stage 0               Stage 1               Stage 2               Stage 3
   +---------------+     +---------------+     +---------------+     +---------------+
   |               |     |               |     |    \  |  /    |     |   \  |||  /   |
   |               |     |     \   /     |     |   --\ | /--   |     |  --(FOLIAGE)--|
   |    (Mound)    |     |      \ /      |     |     (LEAF)    |     |    (CROP BODY)|
   |   [::SEED::]  |     |       |       |     |       ||      |     |    (ROOT/VEG) |
   +---------------+     +---------------+     +---------------+     +---------------+
```

---

### 4.1 Radish (무)

- **Stage 0 (Seed / Dirt Mound)**: 
  - Small dirt mound (width 10px, height 4px at bottom center) in `#7A480A` & `#3E1C08`.
  - Tiny white/yellow seed speck (`#FEF08A`) at center $(8, 11)$.
- **Stage 1 (Sprout)**: 
  - Central stem (height 5px, width 2px) in `#15803D`.
  - 2 tiny diagonal cotyledon leaves spreading at top in `#86EFAC`.
- **Stage 2 (Growing Plant)**:
  - 4 bushy serrated leaf fronds in `#22C55E` and `#15803D` reaching 10px high.
  - Tiny white root crown (`#F8FAFC`) peeking 2px out of soil.
- **Stage 3 (Mature Harvestable Radish)**:
  - **Root Body**: Plump rounded white/purple radish body (width 8px, height 10px) sitting at grid $(4..11, 6..15)$.
  - **Upper Crown**: Vibrant purple gradient (`#8B5CF6`, `#7C3AED`) at top shoulder.
  - **Lower Root**: Smooth cream white (`#FFFFFF`, `#F1F5F9`) with taproot tip extending into dirt.
  - **Top Foliage**: 5 lush, tall leaf stalks (`#22C55E`, `#16A34A`, `#4ADE80`) fanning outward from top of radish.

#### Phaser 3 Procedural Code for Radish:
```javascript
// Radish Stage 0
const gR0 = mk();
pR(gR0, 3, 12, 10, 3, 0x7A480A); pR(gR0, 4, 11, 8, 2, 0x3E1C08);
pR(gR0, 7, 11, 2, 2, 0xFEF08A);
gR0.generateTexture('crop_radish_0', 16*PS, 16*PS); gR0.destroy();

// Radish Stage 1
const gR1 = mk();
pR(gR1, 7, 10, 2, 5, 0x15803D); // stem
pR(gR1, 5, 8, 3, 2, 0x86EFAC); pR(gR1, 8, 8, 3, 2, 0x86EFAC); // leaves
gR1.generateTexture('crop_radish_1', 16*PS, 16*PS); gR1.destroy();

// Radish Stage 2
const gR2 = mk();
pR(gR2, 7, 7, 2, 7, 0x15803D);
pR(gR2, 4, 5, 4, 4, 0x22C55E); pR(gR2, 8, 5, 4, 4, 0x22C55E); // side foliage
pR(gR2, 6, 3, 4, 3, 0x4ADE80); // top sprout
pR(gR2, 7, 12, 2, 2, 0xF8FAFC); // root crown
gR2.generateTexture('crop_radish_2', 16*PS, 16*PS); gR2.destroy();

// Radish Stage 3 (Mature)
const gR3 = mk();
// Leaf canopy
pR(gR3, 3, 1, 4, 5, 0x15803D); pR(gR3, 9, 1, 4, 5, 0x15803D);
pR(gR3, 5, 0, 6, 5, 0x22C55E); pR(gR3, 6, 0, 4, 3, 0x4ADE80);
// Leaf stems
pR(gR3, 7, 4, 2, 4, 0x16A34A);
// Radish Body (Purple top, White bottom)
pR(gR3, 4, 7, 8, 3, 0x8B5CF6); pR(gR3, 5, 7, 6, 1, 0xA78BFA); // Purple shoulder + highlight
pR(gR3, 4, 10, 8, 4, 0xFFFFFF); pR(gR3, 5, 14, 6, 2, 0xF1F5F9); // White body
pR(gR3, 7, 15, 2, 1, 0xCBD5E1); // Taproot tip
gR3.generateTexture('crop_radish_3', 16*PS, 16*PS); gR3.destroy();
```

---

### 4.2 Carrot (당근)

- **Stage 0 (Seed / Dirt Mound)**: 
  - Dirt mound in `#7A480A` with tiny orange seed speck (`#FF6B00`).
- **Stage 1 (Sprout)**: 
  - Thin green shoot (`#10B981`) with 2 feather-like leaves.
- **Stage 2 (Growing Plant)**: 
  - Feathery carrot fronds (`#059669`, `#10B981`, `#34D399`) extending upward to 12px. Small orange root top peeking.
- **Stage 3 (Mature Harvestable Carrot)**:
  - **Root Body**: Elongated conical bright orange carrot body (`#FF6B00`, `#EA580C`) tapering down from grid $(5..10, 7..15)$.
  - **Highlights**: Orange highlight line (`#FDBA74`) down the left side, horizontal texture ridges (`#C2410C`).
  - **Feathery Fronds**: Deep layered fern-like green fronds (`#10B981`, `#059669`, `#047857`) fanning broadly at top.

#### Phaser 3 Procedural Code for Carrot:
```javascript
// Carrot Stage 0
const gC0 = mk();
pR(gC0, 3, 12, 10, 3, 0x7A480A); pR(gC0, 4, 11, 8, 2, 0x3E1C08);
pR(gC0, 7, 11, 2, 2, 0xFF6B00);
gC0.generateTexture('crop_carrot_0', 16*PS, 16*PS); gC0.destroy();

// Carrot Stage 1
const gC1 = mk();
pR(gC1, 7, 9, 2, 6, 0x059669);
pR(gC1, 5, 7, 3, 3, 0x10B981); pR(gC1, 8, 7, 3, 3, 0x10B981);
gC1.generateTexture('crop_carrot_1', 16*PS, 16*PS); gC1.destroy();

// Carrot Stage 2
const gC2 = mk();
pR(gC2, 6, 5, 4, 9, 0x059669);
pR(gC2, 3, 3, 5, 5, 0x10B981); pR(gC2, 8, 3, 5, 5, 0x10B981);
pR(gC2, 7, 12, 2, 3, 0xFF6B00); // Orange crown
gC2.generateTexture('crop_carrot_2', 16*PS, 16*PS); gC2.destroy();

// Carrot Stage 3 (Mature)
const gC3 = mk();
// Feathery Fronds
pR(gC3, 2, 1, 5, 5, 0x059669); pR(gC3, 9, 1, 5, 5, 0x059669);
pR(gC3, 4, 0, 8, 4, 0x10B981); pR(gC3, 6, 0, 4, 2, 0x34D399);
pR(gC3, 7, 4, 2, 3, 0x047857);
// Carrot Tapered Body
pR(gC3, 5, 7, 6, 3, 0xFF6B00); pR(gC3, 5, 7, 2, 3, 0xFDBA74); // Highlight
pR(gC3, 6, 10, 4, 3, 0xEA580C);
pR(gC3, 7, 13, 2, 3, 0xC2410C); // Taper tip into dirt
gC3.generateTexture('crop_carrot_3', 16*PS, 16*PS); gC3.destroy();
```

---

### 4.3 Strawberry (딸기)

- **Stage 0 (Seed / Dirt Mound)**: 
  - Dirt mound with small dark seed specks.
- **Stage 1 (Sprout)**: 
  - Low 3-leaf sprout in `#15803D`.
- **Stage 2 (Growing Plant)**: 
  - Bushy trifoliate green leaves + small 5-petaled white/yellow flower blossoms (`#FFFFFF`, `#FDE047`).
- **Stage 3 (Mature Harvestable Strawberry)**:
  - **Berries**: 3 distinct bright red heart-shaped strawberries (`#EF4444`, `#DC2626`) clustering among leaves.
  - **Details**: Yellow seed dots (`#FDE047`) on berries, green leaf caps (`#22C55E`), white shine pixels (`#FEE2E2`).
  - **Foliage**: Low sprawling green foliage base (`#15803D`, `#166534`).

#### Phaser 3 Procedural Code for Strawberry:
```javascript
// Strawberry Stage 0
const gS0 = mk();
pR(gS0, 3, 12, 10, 3, 0x7A480A); pR(gS0, 7, 11, 2, 2, 0xB91C1C);
gS0.generateTexture('crop_strawberry_0', 16*PS, 16*PS); gS0.destroy();

// Strawberry Stage 1
const gS1 = mk();
pR(gS1, 7, 10, 2, 5, 0x15803D);
pR(gS1, 4, 9, 3, 3, 0x22C55E); pR(gS1, 9, 9, 3, 3, 0x22C55E);
gS1.generateTexture('crop_strawberry_1', 16*PS, 16*PS); gS1.destroy();

// Strawberry Stage 2
const gS2 = mk();
pR(gS2, 3, 7, 10, 6, 0x15803D); pR(gS2, 4, 6, 8, 4, 0x22C55E);
// Flower blossom
pR(gS2, 7, 4, 2, 2, 0xFDE047); pR(gS2, 6, 4, 1, 2, 0xFFFFFF); pR(gS2, 9, 4, 1, 2, 0xFFFFFF);
gS2.generateTexture('crop_strawberry_2', 16*PS, 16*PS); gS2.destroy();

// Strawberry Stage 3 (Mature)
const gS3 = mk();
// Leaf Bush
pR(gS3, 2, 4, 12, 6, 0x15803D); pR(gS3, 4, 2, 8, 4, 0x22C55E);
// Center Red Berry
pR(gS3, 6, 8, 4, 5, 0xEF4444); pR(gS3, 7, 13, 2, 1, 0xDC2626);
pR(gS3, 7, 9, 1, 1, 0xFDE047); pR(gS3, 6, 8, 1, 1, 0xFEE2E2); // Seed & Shine
// Left Berry
pR(gS3, 2, 9, 3, 4, 0xEF4444); pR(gS3, 3, 10, 1, 1, 0xFDE047);
// Right Berry
pR(gS3, 11, 9, 3, 4, 0xEF4444); pR(gS3, 12, 10, 1, 1, 0xFDE047);
gS3.generateTexture('crop_strawberry_3', 16*PS, 16*PS); gS3.destroy();
```

---

### 4.4 Pumpkin (호박)

- **Stage 0 (Seed / Dirt Mound)**: 
  - Mound with flat green pumpkin seed.
- **Stage 1 (Sprout)**: 
  - Curved vine tendril shoot in `#166534`.
- **Stage 2 (Growing Plant)**: 
  - Sprawling wide green leaves (`#15803D`) + bright yellow trumpet flower (`#EAB308`). Small green pumpkin bulb.
- **Stage 3 (Mature Harvestable Pumpkin)**:
  - **Body**: Large, plump, ribbed orange pumpkin (`#F97316`, `#EA580C`) filling grid $(2..13, 7..15)$.
  - **Rib Shading**: Vertical dark orange rib lines (`#C2410C`) dividing the pumpkin into 4 segments.
  - **Stem & Vines**: Sturdy brown/green stem (`#78350F`, `#166534`) at top with curly vine tendrils.

#### Phaser 3 Procedural Code for Pumpkin:
```javascript
// Pumpkin Stage 0
const gP0 = mk();
pR(gP0, 3, 12, 10, 3, 0x7A480A); pR(gP0, 7, 11, 2, 2, 0x166534);
gP0.generateTexture('crop_pumpkin_0', 16*PS, 16*PS); gP0.destroy();

// Pumpkin Stage 1
const gP1 = mk();
pR(gP1, 6, 10, 4, 4, 0x166534); pR(gP1, 4, 9, 4, 2, 0x22C55E);
gP1.generateTexture('crop_pumpkin_1', 16*PS, 16*PS); gP1.destroy();

// Pumpkin Stage 2
const gP2 = mk();
pR(gP2, 2, 8, 12, 5, 0x15803D); pR(gP2, 4, 6, 8, 4, 0x22C55E);
pR(gP2, 10, 5, 3, 3, 0xEAB308); // Yellow flower
gP2.generateTexture('crop_pumpkin_2', 16*PS, 16*PS); gP2.destroy();

// Pumpkin Stage 3 (Mature)
const gP3 = mk();
// Top Stem & Vine
pR(gP3, 7, 4, 2, 3, 0x78350F); pR(gP3, 5, 5, 6, 2, 0x166534);
// Large Ribbed Pumpkin Body
pR(gP3, 2, 7, 12, 8, 0xF97316);
pR(gP3, 3, 7, 10, 1, 0xFDBA74); // Top highlight
// Vertical Rib Lines
pR(gP3, 5, 7, 1, 8, 0xC2410C); pR(gP3, 8, 7, 1, 8, 0xC2410C); pR(gP3, 10, 7, 1, 8, 0xC2410C);
pR(gP3, 3, 14, 10, 1, 0xEA580C); // Bottom shadow
gP3.generateTexture('crop_pumpkin_3', 16*PS, 16*PS); gP3.destroy();
```

---

### 4.5 Corn (옥수수)

- **Stage 0 (Seed / Dirt Mound)**: 
  - Mound with golden yellow corn seed.
- **Stage 1 (Sprout)**: 
  - Tall single shoot in `#22C55E`.
- **Stage 2 (Growing Plant)**: 
  - Tall leafy stalk (14px high) with overlapping long leaves.
- **Stage 3 (Mature Harvestable Corn)**:
  - **Stalk**: Tall sturdy green corn stalk (`#15803D`).
  - **Ear of Corn**: Golden yellow corn cob (`#EAB308`, `#CA8A04`) peeking out of pale green husks (`#86EFAC`).
  - **Kernels**: Grid pattern of individual yellow kernel pixels.
  - **Corn Silk**: Soft golden-brown silk threads (`#FDE047`, `#D97706`) crowning the cob top.

#### Phaser 3 Procedural Code for Corn:
```javascript
// Corn Stage 0
const gCn0 = mk();
pR(gCn0, 3, 12, 10, 3, 0x7A480A); pR(gCn0, 7, 11, 2, 2, 0xEAB308);
gCn0.generateTexture('crop_corn_0', 16*PS, 16*PS); gCn0.destroy();

// Corn Stage 1
const gCn1 = mk();
pR(gCn1, 7, 6, 2, 9, 0x22C55E); pR(gCn1, 5, 8, 2, 4, 0x86EFAC);
gCn1.generateTexture('crop_corn_1', 16*PS, 16*PS); gCn1.destroy();

// Corn Stage 2
const gCn2 = mk();
pR(gCn2, 7, 2, 2, 13, 0x15803D);
pR(gCn2, 3, 4, 4, 6, 0x22C55E); pR(gCn2, 9, 6, 4, 6, 0x22C55E);
gCn2.generateTexture('crop_corn_2', 16*PS, 16*PS); gCn2.destroy();

// Corn Stage 3 (Mature)
const gCn3 = mk();
// Central Stalk & Leaves
pR(gCn3, 7, 0, 2, 16, 0x15803D);
pR(gCn3, 2, 2, 5, 8, 0x22C55E); pR(gCn3, 9, 4, 5, 8, 0x22C55E);
// Corn Cob Body (Right side of stalk)
pR(gCn3, 9, 5, 4, 7, 0xEAB308);
pR(gCn3, 10, 6, 2, 5, 0xCA8A04); // Kernel grid depth
// Green Husk wrapping cob
pR(gCn3, 8, 8, 3, 5, 0x86EFAC); pR(gCn3, 12, 7, 2, 5, 0x86EFAC);
// Corn Silk
pR(gCn3, 10, 3, 2, 2, 0xFDE047); pR(gCn3, 11, 4, 1, 2, 0xD97706);
gCn3.generateTexture('crop_corn_3', 16*PS, 16*PS); gCn3.destroy();
```

---

### 4.6 Cabbage (배추 / 양배추)

- **Stage 0 (Seed / Dirt Mound)**: 
  - Dirt mound with dark round seed speck.
- **Stage 1 (Sprout)**: 
  - 2 rounded green cotyledon leaves (`#86EFAC`).
- **Stage 2 (Growing Plant)**: 
  - Rosette of 6 spreading ruffled leaves (`#22C55E`).
- **Stage 3 (Mature Harvestable Cabbage)**:
  - **Head**: Large, dense, round layered head of cabbage (`#86EFAC`, `#22C55E`, `#166534`) spanning grid $(2..13, 4..15)$.
  - **Inner Core**: Pale lime-white inner core leaves (`#DCFCE7`, `#86EFAC`).
  - **Outer Leaves**: Deep forest green crinkled outer wrapper leaves (`#166534`, `#15803D`) hugging the base.
  - **Leaf Veins**: Light white/pale-green leaf ribs (`#DCFCE7`).

#### Phaser 3 Procedural Code for Cabbage:
```javascript
// Cabbage Stage 0
const gCb0 = mk();
pR(gCb0, 3, 12, 10, 3, 0x7A480A); pR(gCb0, 7, 11, 2, 2, 0x166534);
gCb0.generateTexture('crop_cabbage_0', 16*PS, 16*PS); gCb0.destroy();

// Cabbage Stage 1
const gCb1 = mk();
pR(gCb1, 7, 10, 2, 5, 0x15803D);
pR(gCb1, 4, 8, 4, 4, 0x86EFAC); pR(gCb1, 8, 8, 4, 4, 0x86EFAC);
gCb1.generateTexture('crop_cabbage_1', 16*PS, 16*PS); gCb1.destroy();

// Cabbage Stage 2
const gCb2 = mk();
pR(gCb2, 2, 7, 12, 7, 0x15803D); pR(gCb2, 4, 5, 8, 7, 0x22C55E);
pR(gCb2, 6, 7, 4, 4, 0x86EFAC);
gCb2.generateTexture('crop_cabbage_2', 16*PS, 16*PS); gCb2.destroy();

// Cabbage Stage 3 (Mature)
const gCb3 = mk();
// Outer Dark Leaves
pR(gCb3, 1, 5, 14, 9, 0x166534); pR(gCb3, 2, 4, 12, 10, 0x15803D);
// Mid-layer Leaves
pR(gCb3, 3, 5, 10, 8, 0x22C55E); pR(gCb3, 4, 6, 8, 6, 0x4ADE80);
// Inner Pale Core
pR(gCb3, 5, 7, 6, 4, 0x86EFAC); pR(gCb3, 6, 8, 4, 2, 0xDCFCE7);
// Leaf Vein Ribs
pR(gCb3, 7, 4, 2, 10, 0xDCFCE7); pR(gCb3, 4, 8, 8, 1, 0xDCFCE7);
gCb3.generateTexture('crop_cabbage_3', 16*PS, 16*PS); gCb3.destroy();
```

---

## Part 5: Apple Tree Multi-Tile Procedural Design

The Apple Tree is a multi-tile structure designed for a 64x64 / 96x96 bounds (18x30 grid scaled by `PS = 3` = 54x90 pixels, or 24x32 grid scaled by `PS = 3` = 72x96 pixels).

### 5.1 Structure & Component Layout
- **Trunk**: 
  - Width 6px (18px rendered), height 12px (36px rendered).
  - Rich brown wood bark (`#5C3010`, `#7A480A`, `#3E1C08`).
  - Left highlight (`#9A6538`), right shadow (`#2A1A0A`), root flare at base $(6..11, 18..29)$.
- **Canopy (Foliage)**:
  - Multi-layered organic leaf crown:
    - Shadow Base (`#166534`): Outer contour shadow.
    - Deep Leaves (`#15803D`): Main canopy fill.
    - Mid Leaves (`#22C55E`): Upper foliage clusters.
    - Highlight Leaves (`#4ADE80`): Top sunlit dapples.
- **Apples**:
  - Distinct 3x3 pixel apples with stem and highlight:
    - Base Red: `#EF4444` / `#DC2626`
    - Specular Highlight: `#FEE2E2` at top-left pixel
    - Stem: `#78350F` at top-center pixel

```
          [LEAF CANOPY - HIGHLIGHT #4ADE80]
     (Apple)                              (Apple)
    [LEAF CANOPY - MID GREEN #22C55E]
          (Apple)              (Apple)
     [LEAF CANOPY - SHADOW #166534]
                 ||        ||   <- TRUNK (#5C3010 / #7A480A)
                 ||        ||
                /  \      /  \  <- ROOT FLARE
```

### 5.2 Unripe vs. Ripe Textures

#### Unripe State (`apple_tree`):
- Canopy is lush green with small unripened yellow-green buds (`#A3E635`). No red apples.

#### Ripe State (`apple_tree_ripe`):
- Canopy is filled with 7-9 shiny red apples distributed across different depths of the crown.

```javascript
// Procedural Apple Tree Generator
function bakeAppleTreeTextures(scene) {
  const mk = () => scene.make.graphics({ add: false });
  const PS = 3;

  // 1. Unripe Apple Tree
  const gTree = mk();
  // Trunk
  pR(gTree, 7, 16, 4, 12, 0x5C3010); pR(gTree, 7, 16, 1, 12, 0x7A480A); pR(gTree, 10, 16, 1, 12, 0x3E1C08);
  pR(gTree, 6, 26, 6, 2, 0x5C3010); // Root flare
  // Canopy Base Shadow
  pR(gTree, 2, 2, 14, 14, 0x166534);
  pR(gTree, 1, 4, 16, 10, 0x15803D);
  // Canopy Mid-green Layers
  pR(gTree, 3, 1, 12, 12, 0x22C55E); pR(gTree, 4, 0, 10, 10, 0x4ADE80);
  // Unripe yellow-green buds
  [[4,5],[9,4],[3,9],[12,8],[7,11]].forEach(([x,y]) => {
    pR(gTree, x, y, 2, 2, 0xA3E635);
  });
  gTree.generateTexture('apple_tree', 18*PS, 30*PS); gTree.destroy();

  // 2. Ripe Apple Tree
  const gRipe = mk();
  // Trunk
  pR(gRipe, 7, 16, 4, 12, 0x5C3010); pR(gRipe, 7, 16, 1, 12, 0x7A480A); pR(gRipe, 10, 16, 1, 12, 0x3E1C08);
  pR(gRipe, 6, 26, 6, 2, 0x5C3010); // Root flare
  // Canopy Base Shadow
  pR(gRipe, 2, 2, 14, 14, 0x166534);
  pR(gRipe, 1, 4, 16, 10, 0x15803D);
  // Canopy Mid-green Layers
  pR(gRipe, 3, 1, 12, 12, 0x22C55E); pR(gRipe, 4, 0, 10, 10, 0x4ADE80);
  // Ripe Red Apples (3x3 with stem and highlight)
  const apples = [[3,4],[9,3],[2,8],[7,7],[12,7],[5,11],[10,11]];
  apples.forEach(([x,y]) => {
    pR(gRipe, x, y-1, 1, 1, 0x78350F); // Stem
    pR(gRipe, x-1, y, 3, 3, 0xEF4444); // Red Berry
    pR(gRipe, x-1, y, 1, 1, 0xFEE2E2); // Specular highlight
    pR(gRipe, x+1, y+2, 1, 1, 0xDC2626); // Shadow
  });
  gRipe.generateTexture('apple_tree_ripe', 18*PS, 30*PS); gRipe.destroy();
}
```

---

## Part 6: Crop Texture Mapping & Integration Plan

### 6.1 Mapping Korean Vocabulary to Crop Species
In `game.js`, when a word is planted on plot `p`, we assign a specific crop species based on the word's category or index:

| Korean Name | English Name | Assigned Species | Texture Key Prefix |
| :--- | :--- | :--- | :--- |
| **무** / Basic Nouns | Radish | Radish | `crop_radish_` |
| **당근** / Food & Animals | Carrot | Carrot | `crop_carrot_` |
| **딸기** / Colors & Fruits | Strawberry | Strawberry | `crop_strawberry_` |
| **호박** / Nature & Family | Pumpkin | Pumpkin | `crop_pumpkin_` |
| **옥수수** / Numbers & Advanced | Corn | Corn | `crop_corn_` |
| **배추** / Special Cooking | Cabbage | Cabbage | `crop_cabbage_` |

### 6.2 State Transition Matrix (`sState` in `game.js`)
Currently, `advancePlot()` handles stage progression. We map Phaser textures seamlessly to the 4 state codes:

| State Code (`sState`) | Growth Description | Soil Texture | Crop Texture Key | Visual Effects |
| :---: | :--- | :--- | :--- | :--- |
| `''` | Empty Plot | `drt_dry` | `null` | Bare tilled dirt |
| `'0'` | Planted Seed / Mound | `drt_wet` | `crop_<species>_0` | Soil moist, seed mound visible |
| `'1'` | Seedling / Sprout | `drt_wet` | `crop_<species>_1` | Green shoot rising |
| `'2'` | Wilting (Review Needed) | `drt_wet` | `crop_<species>_1` | Tinted yellow (`0xFFCC44`), 💧 label |
| `'3'` | Growing Plant | `drt_wet` | `crop_<species>_2` | Bushier foliage |
| `'4'` | Mature / Harvestable | `drt_wet` | `crop_<species>_3` | Full crop + fruit, gold glow ring |

---

## Part 7: Verification & Testing Plan

1. **Visual Texture Verification**:
   - Inspect Phaser cache via `scene.textures.exists('crop_radish_3')`, `scene.textures.exists('crop_carrot_3')`, etc.
   - Verify non-zero width and height (`48x48` for crops, `54x90` for apple tree).
2. **Growth Stage Cycle Test**:
   - Plant seed on plot $\rightarrow$ verify Stage 0 graphic displays on wet dirt.
   - Advance to Stage 1 $\rightarrow$ verify sprout displays.
   - Advance to Stage 2 $\rightarrow$ verify growing plant displays.
   - Advance to Stage 3 $\rightarrow$ verify mature harvestable crop displays with fruit/veggie.
3. **Apple Tree Regrowth Test**:
   - Verify `apple_tree` displays when unripened.
   - Verify `apple_tree_ripe` displays with 7 bright red apples when countdown reaches 0.
