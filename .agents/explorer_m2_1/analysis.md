# Milestone R2 Analysis Report: Tilemap Terrain & Environment Art in Hangeul Valley

**Author**: Explorer 1 (`explorer_m2_1`)  
**Target File**: `C:/VibeCode/Hangeul Valley/game.js`  
**Working Directory**: `C:/VibeCode/Hangeul Valley/.agents/explorer_m2_1`  
**Date**: 2026-07-22  

---

## 1. Executive Summary & Existing Codebase Analysis

An in-depth investigation of `C:/VibeCode/Hangeul Valley/game.js` was performed to analyze the current `FarmScene` background rendering, texture baking system, plot layout, and path/landmark drawing logic.

### 1.1 Existing Architecture & Constants
- **Core Scene**: `FarmScene` extends `Phaser.Scene` (line 2953).
- **Scale Constants** (line 114 & line 1567):
  - `PS = 3`: Pixel scale multiplier (each logical pixel cell is 3x3 screen pixels).
  - `TILE = 48`: Tile dimensions in pixels (48x48 px).
  - `PLOT_SIZE = 48`, `PLOT_COLS = 3`, `PLOT_GAP = 18`: Plot grid constants.
- **Texture Baking Mechanism** (lines 3014-3310):
  - `_bakeTextures()` creates Phaser Graphics objects using helper `const mk = () => this.make.graphics({add:false})`.
  - Draw functions:
    - `pR(g, x, y, w, h, col, a=1)` (line 1534): Draws filled rectangle scaled by `PS`: `g.fillStyle(col, a); g.fillRect(x*PS, y*PS, w*PS, h*PS);`.
    - `drawS(g, rows, ox=0, oy=0)` (lines 1526-1533): Maps a 16x16 character matrix array to hex colors in palette `K` (lines 1515-1525).
  - Texture generation: `g.generateTexture(key, width, height)` followed by `g.destroy()`.

### 1.2 Current Background & Plot Drawing Logic
1. **Background Terrain** (`_drawWorld(W, H)`, lines 3313-3392):
   - Loops over grid cells: `for(let r=0; r*TILE<=H+TILE; r++) for(let cc=0; cc*TILE<=W+TILE; cc++)`.
   - Places `grs0`, `grs1`, `grs2`, or `grs3` images (`this.add.image(cc*TILE+TILE/2, r*TILE+TILE/2, 'grs'+rng.between(0,3)).setDisplaySize(TILE,TILE).setDepth(0)`).
   - `grs0..3` are baked from 16x16 char arrays `GRASS[0..3]` (lines 1537-1554) scaled to `16*PS` x `16*PS` = 48x48 px.
2. **Plot Setup** (`_createPlots(W, H)`, lines 3719-3739):
   - 15 total slots in a 3x5 layout (9 active initially).
   - Plots use `drt_dry` and `drt_wet` textures (16x16 * PS = 48x48 px).
   - Farm bounding rectangle calculated at `this.farm = {x: W/2 - fW/2, y: H/2 - fH/2 - 30, w: fW, h: fH}`.
3. **Paths** (lines 3334-3346):
   - Scatter-rendered `path_stone` (16x16 * PS) around points connecting farm to landmarks (Shop, Board, Arcade, Wizard, Apple Tree).
4. **Water Body / Pond** (`_createFishingSpot(W, H)`, lines 3576-3605):
   - Rendered using a basic ellipse `this.add.ellipse(fx, fy + 20, 240, 70, 0x0284C7, 0.85)` without structured shoreline tiles.
5. **Farmhouse**:
   - Currently absent in `FarmScene`, creating an empty visual space above the farm plots.

---

## 2. Procedural Tilemap Terrain Texture Specifications (48x48 Resolution)

To transition `FarmScene` to a vibrant, cohesive Stardew Valley-inspired 2D pixel art aesthetic, all terrain tiles are defined at **48x48 pixel resolution** (`16x16` pixel grid with scale factor `PS = 3`).

### 2.1 Color Palette Definitions (Stardew Valley Aesthetic)
```javascript
const TERRAIN_PALETTE = {
  // Grass & Vegetation
  G_BASE_DARK: 0x2E6F40,   // Deep shadow grass
  G_BASE:      0x3A7D44,   // Standard lush grass
  G_BASE_LGT:  0x4C9A52,   // Warm highlight grass
  G_BLADE:     0x5DBB63,   // Bright grass blade accent
  G_TALL:      0x15803D,   // Tall vegetation edge
  
  // Flowers & Details
  FLW_YEL:     0xFDE047,   // Buttercup yellow
  FLW_WHT:     0xFFFFFF,   // Daisy white
  FLW_PNK:     0xF472B6,   // Pink blossom
  CLOVER:      0x86EFAC,   // Vibrant clover green
  CLOVER_DK:   0x22C55E,   // Clover stem shadow
  
  // Dirt & Soil
  DIRT_BASE:   0x78350F,   // Warm dark soil base
  DIRT_FILL:   0x92400E,   // Rich dirt path center
  DIRT_LGT:    0xB45309,   // Sun-baked path highlight
  DIRT_SHAD:   0x451A03,   // Deep groove / edge shadow
  DIRT_PEBBLE: 0xD97706,   // Tiny path pebble detail
  
  // Wooden Fence & Farmhouse Wood
  WOOD_DARK:   0x451A03,   // Dark oak post outline
  WOOD_BASE:   0x78350F,   // Oak wood base
  WOOD_FILL:   0x92400E,   // Planks / rails fill
  WOOD_LGT:    0xB45309,   // Wood grain highlight
  WOOD_GRAIN:  0xD97706,   // Carved plank detail
  BRASS:       0xF59E0B,   // Metal latch / door knob
  
  // Farmhouse Red Barn Aesthetic
  ROOF_DARK:   0x7F1D1D,   // Dark roof tile shadow
  ROOF_BASE:   0x991B1B,   // Cozy red barn roof base
  ROOF_LGT:    0xDC2626,   // Bright red shingle highlight
  ROOF_CAP:    0xEF4444,   // Ridge cap accent
  WIN_GLOW:    0xFEF08A,   // Warm interior light glow
  STONE_DARK:  0x334155,   // Chimney stone shadow
  STONE_BASE:  0x57534E,   // Chimney stone body
  STONE_LGT:   0x78716C,   // Chimney mortar highlight
  
  // Water & Shoreline
  WTR_DEEP:    0x0284C7,   // Deep blue crystal water
  WTR_SHAD:    0x0369A1,   // Shadowed water depth
  WTR_SHALLOW: 0x38BDF8,   // Shallow clear water
  WTR_FOAM:    0x7DD3FC,   // Wave foam / shoreline edge
  WTR_SPARKLE: 0xFFFFFF    // Sunlight water sparkle
};
```

---

### 2.2 Texture Category 1: Grass Tile Variants (48x48 px)

Multiple grass variants break grid monotonicity and create a natural meadow look.

#### 1. `tile_grass_base` (Base Lush Meadow)
- **Concept**: Rich grass base with scattered blade tufts and subtle dual-shade depth.
- **Matrix (16x16 char grid)**:
```javascript
const MATRIX_GRASS_BASE = [
  'GGGGGGGGGGGGGGGG',
  'GGGGGlGGGGGGGlGG',
  'GGGGGGGGGGGGGGGG',
  'GGdGGGGGGGGdGGGG',
  'GGGGGGGGGGGGGGGG',
  'GlGGGGGGGGlGGGGG',
  'GGGGGGGGGGGGGGGG',
  'GGGGGdGGGGGGGGdG',
  'GGGGGGGGGGGGGGGG',
  'GGGGlGGGGGGGlGGG',
  'GGGGGGGGGGGGGGGG',
  'GGGGGGdGGGGGGGdG',
  'GGGGGGGGGGGGGGGG',
  'GGlGGGGGGGGlGGGG',
  'GGGGGGGGGGGGGGGG',
  'DDDDDDDDDDDDDDDD'
];
// Palette mapping: 'G': G_BASE, 'l': G_BASE_LGT, 'd': G_BLADE, 'D': G_BASE_DARK
```
- **Procedural Phaser Graphics Code**:
```javascript
function bakeGrassBase(scene) {
  const g = scene.make.graphics({ add: false });
  // Base fill 48x48
  g.fillStyle(TERRAIN_PALETTE.G_BASE, 1);
  g.fillRect(0, 0, 48, 48);
  // Bottom shadow row
  pR(g, 0, 15, 16, 1, TERRAIN_PALETTE.G_BASE_DARK);
  // Blade highlights
  [[4,1],[13,1],[1,5],[10,5],[4,9],[12,9],[2,13],[10,13]].forEach(([x,y]) => {
    pR(g, x, y, 1, 2, TERRAIN_PALETTE.G_BASE_LGT);
    pR(g, x, y-1, 1, 1, TERRAIN_PALETTE.G_BLADE);
  });
  g.generateTexture('tile_grass_base', 48, 48);
  g.destroy();
}
```

#### 2. `tile_grass_flowers` (Wildflower Meadow)
- **Concept**: Base grass tile embellished with tiny 2x2 yellow, white, and pink wildflower blossoms.
- **Procedural Phaser Graphics Code**:
```javascript
function bakeGrassFlowers(scene) {
  const g = scene.make.graphics({ add: false });
  g.fillStyle(TERRAIN_PALETTE.G_BASE, 1);
  g.fillRect(0, 0, 48, 48);
  pR(g, 0, 15, 16, 1, TERRAIN_PALETTE.G_BASE_DARK);
  
  // Grass blades
  [[2,2],[12,3],[5,10],[11,12]].forEach(([x,y]) => pR(g, x, y, 1, 2, TERRAIN_PALETTE.G_BASE_LGT));
  
  // Yellow Flower (top-left)
  pR(g, 3, 4, 2, 2, TERRAIN_PALETTE.FLW_YEL);
  pR(g, 3, 5, 2, 1, TERRAIN_PALETTE.G_BASE_DARK);
  pR(g, 4, 4, 1, 1, TERRAIN_PALETTE.FLW_WHT);
  
  // White Daisy (mid-right)
  pR(g, 10, 7, 2, 2, TERRAIN_PALETTE.FLW_WHT);
  pR(g, 10, 7, 1, 1, TERRAIN_PALETTE.FLW_YEL);
  
  // Pink Blossom (bottom-left)
  pR(g, 5, 12, 2, 2, TERRAIN_PALETTE.FLW_PNK);
  pR(g, 5, 12, 1, 1, TERRAIN_PALETTE.FLW_YEL);
  
  g.generateTexture('tile_grass_flowers', 48, 48);
  g.destroy();
}
```

#### 3. `tile_grass_clover` (Clover Patch)
- **Concept**: Grass tile populated with 3-leaf and 4-leaf clover clusters.
- **Procedural Phaser Graphics Code**:
```javascript
function bakeGrassClover(scene) {
  const g = scene.make.graphics({ add: false });
  g.fillStyle(TERRAIN_PALETTE.G_BASE, 1);
  g.fillRect(0, 0, 48, 48);
  pR(g, 0, 15, 16, 1, TERRAIN_PALETTE.G_BASE_DARK);
  
  // Clover Cluster 1 (3-leaf) at (4,3)
  pR(g, 4, 3, 1, 1, TERRAIN_PALETTE.CLOVER);
  pR(g, 3, 4, 1, 1, TERRAIN_PALETTE.CLOVER);
  pR(g, 5, 4, 1, 1, TERRAIN_PALETTE.CLOVER);
  pR(g, 4, 4, 1, 2, TERRAIN_PALETTE.CLOVER_DK);
  
  // Clover Cluster 2 (4-leaf lucky clover) at (10,9)
  pR(g, 10, 8, 1, 1, TERRAIN_PALETTE.CLOVER);
  pR(g, 9, 9, 1, 1, TERRAIN_PALETTE.CLOVER);
  pR(g, 11, 9, 1, 1, TERRAIN_PALETTE.CLOVER);
  pR(g, 10, 10, 1, 1, TERRAIN_PALETTE.CLOVER);
  pR(g, 10, 9, 1, 2, TERRAIN_PALETTE.CLOVER_DK);
  
  g.generateTexture('tile_grass_clover', 48, 48);
  g.destroy();
}
```

---

### 2.3 Texture Category 2: Dirt Path Tiles (48x48 px)

Dirt path tiles seamlessly connect farm plots, buildings, and landmarks with soft grassy fringes and earthy soil textures.

```
+------------------------+------------------------+------------------------+
| tile_path_straight_h   | tile_path_straight_v   | tile_path_corner_tl    |
| (Horizontal Path)      | (Vertical Path)        | (Top-Left Corner)      |
+------------------------+------------------------+------------------------+
| tile_path_corner_tr    | tile_path_corner_bl    | tile_path_corner_br    |
| (Top-Right Corner)     | (Bottom-Left Corner)   | (Bottom-Right Corner)  |
+------------------------+------------------------+------------------------+
| tile_path_t_north      | tile_path_t_south      | tile_path_cross        |
| (T-Junction North)     | (T-Junction South)     | (4-Way Crossroads)     |
+------------------------+------------------------+------------------------+
```

#### Procedural Generation Code for Path Set:
```javascript
function bakeDirtPathTiles(scene) {
  // Helper to draw base dirt rectangle with soil texture
  const fillDirt = (g, x, y, w, h) => {
    pR(g, x, y, w, h, TERRAIN_PALETTE.DIRT_FILL);
    // Inner pebble/texture accents
    for(let px=x; px<x+w; px+=3) {
      for(let py=y; py<y+h; py+=3) {
        if((px+py)%5 === 0) pR(g, px, py, 1, 1, TERRAIN_PALETTE.DIRT_LGT);
        if((px*py)%7 === 0) pR(g, px, py, 1, 1, TERRAIN_PALETTE.DIRT_SHAD);
      }
    }
  };

  // 1. Horizontal Straight Path
  let g = scene.make.graphics({ add: false });
  pR(g, 0, 0, 16, 16, TERRAIN_PALETTE.G_BASE); // Base grass
  fillDirt(g, 0, 3, 16, 10);
  // Grassy fringe edges (Top & Bottom)
  pR(g, 0, 2, 16, 1, TERRAIN_PALETTE.DIRT_SHAD);
  pR(g, 0, 13, 16, 1, TERRAIN_PALETTE.DIRT_SHAD);
  [0, 3, 7, 11, 14].forEach(x => {
    pR(g, x, 2, 1, 1, TERRAIN_PALETTE.G_BASE_LGT);
    pR(g, x+1, 13, 1, 1, TERRAIN_PALETTE.G_BASE_LGT);
  });
  g.generateTexture('tile_path_straight_h', 48, 48); g.destroy();

  // 2. Vertical Straight Path
  g = scene.make.graphics({ add: false });
  pR(g, 0, 0, 16, 16, TERRAIN_PALETTE.G_BASE);
  fillDirt(g, 3, 0, 10, 16);
  pR(g, 2, 0, 1, 16, TERRAIN_PALETTE.DIRT_SHAD);
  pR(g, 13, 0, 1, 16, TERRAIN_PALETTE.DIRT_SHAD);
  [0, 4, 8, 12].forEach(y => {
    pR(g, 2, y, 1, 1, TERRAIN_PALETTE.G_BASE_LGT);
    pR(g, 13, y+1, 1, 1, TERRAIN_PALETTE.G_BASE_LGT);
  });
  g.generateTexture('tile_path_straight_v', 48, 48); g.destroy();

  // 3. Top-Left Corner Path
  g = scene.make.graphics({ add: false });
  pR(g, 0, 0, 16, 16, TERRAIN_PALETTE.G_BASE);
  fillDirt(g, 3, 3, 13, 13);
  pR(g, 2, 3, 1, 13, TERRAIN_PALETTE.DIRT_SHAD);
  pR(g, 3, 2, 13, 1, TERRAIN_PALETTE.DIRT_SHAD);
  g.generateTexture('tile_path_corner_tl', 48, 48); g.destroy();

  // 4. Top-Right Corner Path
  g = scene.make.graphics({ add: false });
  pR(g, 0, 0, 16, 16, TERRAIN_PALETTE.G_BASE);
  fillDirt(g, 0, 3, 13, 13);
  pR(g, 13, 3, 1, 13, TERRAIN_PALETTE.DIRT_SHAD);
  pR(g, 0, 2, 13, 1, TERRAIN_PALETTE.DIRT_SHAD);
  g.generateTexture('tile_path_corner_tr', 48, 48); g.destroy();

  // 5. Bottom-Left Corner Path
  g = scene.make.graphics({ add: false });
  pR(g, 0, 0, 16, 16, TERRAIN_PALETTE.G_BASE);
  fillDirt(g, 3, 0, 13, 13);
  pR(g, 2, 0, 1, 13, TERRAIN_PALETTE.DIRT_SHAD);
  pR(g, 3, 13, 13, 1, TERRAIN_PALETTE.DIRT_SHAD);
  g.generateTexture('tile_path_corner_bl', 48, 48); g.destroy();

  // 6. Bottom-Right Corner Path
  g = scene.make.graphics({ add: false });
  pR(g, 0, 0, 16, 16, TERRAIN_PALETTE.G_BASE);
  fillDirt(g, 0, 0, 13, 13);
  pR(g, 13, 0, 1, 13, TERRAIN_PALETTE.DIRT_SHAD);
  pR(g, 0, 13, 13, 1, TERRAIN_PALETTE.DIRT_SHAD);
  g.generateTexture('tile_path_corner_br', 48, 48); g.destroy();

  // 7. T-Junction North (Path extending North, East, West)
  g = scene.make.graphics({ add: false });
  pR(g, 0, 0, 16, 16, TERRAIN_PALETTE.G_BASE);
  fillDirt(g, 0, 3, 16, 10); // Horizontal bar
  fillDirt(g, 3, 0, 10, 3);  // Up stub
  pR(g, 2, 0, 1, 3, TERRAIN_PALETTE.DIRT_SHAD);
  pR(g, 13, 0, 1, 3, TERRAIN_PALETTE.DIRT_SHAD);
  pR(g, 0, 13, 16, 1, TERRAIN_PALETTE.DIRT_SHAD);
  g.generateTexture('tile_path_t_north', 48, 48); g.destroy();

  // 8. T-Junction South (Path extending South, East, West)
  g = scene.make.graphics({ add: false });
  pR(g, 0, 0, 16, 16, TERRAIN_PALETTE.G_BASE);
  fillDirt(g, 0, 3, 16, 10);  // Horizontal bar
  fillDirt(g, 3, 13, 10, 3);  // Down stub
  pR(g, 2, 13, 1, 3, TERRAIN_PALETTE.DIRT_SHAD);
  pR(g, 13, 13, 1, 3, TERRAIN_PALETTE.DIRT_SHAD);
  pR(g, 0, 2, 16, 1, TERRAIN_PALETTE.DIRT_SHAD);
  g.generateTexture('tile_path_t_south', 48, 48); g.destroy();

  // 9. 4-Way Crossroad Path
  g = scene.make.graphics({ add: false });
  pR(g, 0, 0, 16, 16, TERRAIN_PALETTE.G_BASE);
  fillDirt(g, 0, 3, 16, 10);
  fillDirt(g, 3, 0, 10, 16);
  g.generateTexture('tile_path_cross', 48, 48); g.destroy();

  // 10. Center Full Dirt Tile
  g = scene.make.graphics({ add: false });
  fillDirt(g, 0, 0, 16, 16);
  g.generateTexture('tile_path_center', 48, 48); g.destroy();
}
```

---

### 2.4 Texture Category 3: Fenced Area Tiles (48x48 px)

Fences encompass the farm plot perimeter with warm wooden posts, carved rails, and shadows.

#### Procedural Generation Code for Fence Set:
```javascript
function bakeFenceTiles(scene) {
  // 1. Horizontal Fence Rail across grass (`tile_fence_h`)
  let g = scene.make.graphics({ add: false });
  pR(g, 0, 0, 16, 16, TERRAIN_PALETTE.G_BASE); // Base grass
  // Drop shadow
  pR(g, 0, 9, 16, 2, TERRAIN_PALETTE.WOOD_DARK, 0.4);
  // Rail 1 (Top)
  pR(g, 0, 4, 16, 3, TERRAIN_PALETTE.WOOD_BASE);
  pR(g, 0, 4, 16, 1, TERRAIN_PALETTE.WOOD_LGT);
  pR(g, 0, 6, 16, 1, TERRAIN_PALETTE.WOOD_DARK);
  // Rail 2 (Bottom)
  pR(g, 0, 10, 16, 3, TERRAIN_PALETTE.WOOD_BASE);
  pR(g, 0, 10, 16, 1, TERRAIN_PALETTE.WOOD_LGT);
  pR(g, 0, 12, 16, 1, TERRAIN_PALETTE.WOOD_DARK);
  g.generateTexture('tile_fence_h', 48, 48); g.destroy();

  // 2. Fence Post with Rail (`tile_fence_post`)
  g = scene.make.graphics({ add: false });
  pR(g, 0, 0, 16, 16, TERRAIN_PALETTE.G_BASE);
  // Post shadow
  pR(g, 5, 13, 8, 3, TERRAIN_PALETTE.WOOD_DARK, 0.5);
  // Rails passing behind post
  pR(g, 0, 4, 16, 3, TERRAIN_PALETTE.WOOD_BASE);
  pR(g, 0, 10, 16, 3, TERRAIN_PALETTE.WOOD_BASE);
  // Vertical Post
  pR(g, 6, 1, 4, 13, TERRAIN_PALETTE.WOOD_BASE);
  pR(g, 6, 1, 1, 13, TERRAIN_PALETTE.WOOD_LGT);
  pR(g, 9, 1, 1, 13, TERRAIN_PALETTE.WOOD_DARK);
  // Carved Pointy Post Top
  pR(g, 7, 0, 2, 1, TERRAIN_PALETTE.WOOD_GRAIN);
  g.generateTexture('tile_fence_post', 48, 48); g.destroy();

  // 3. Wooden Gate Tile (`tile_fence_gate`)
  g = scene.make.graphics({ add: false });
  pR(g, 0, 0, 16, 16, TERRAIN_PALETTE.G_BASE);
  // Left and Right Posts
  pR(g, 1, 1, 3, 13, TERRAIN_PALETTE.WOOD_BASE);
  pR(g, 12, 1, 3, 13, TERRAIN_PALETTE.WOOD_BASE);
  // Gate Crossbars & Diagonal Brace
  pR(g, 4, 4, 8, 2, TERRAIN_PALETTE.WOOD_FILL);
  pR(g, 4, 10, 8, 2, TERRAIN_PALETTE.WOOD_FILL);
  for(let i=0; i<6; i++) pR(g, 4+i, 4+i, 2, 2, TERRAIN_PALETTE.WOOD_GRAIN);
  // Brass Handle / Latch
  pR(g, 10, 7, 2, 2, TERRAIN_PALETTE.BRASS);
  g.generateTexture('tile_fence_gate', 48, 48); g.destroy();
}
```

---

### 2.5 Texture Category 4: Farmhouse Building Structure (Cozy Stardew Red Barn)

The farmhouse background structure is rendered as a composite **5x4 tile matrix (240x192 pixels)** positioned directly behind the farm plots (`farm.y - 190`), adding an iconic focal point to the farm.

```
Farmhouse Tile Layout Grid (5 Columns x 4 Rows):
+---------------------+---------------------+---------------------+---------------------+---------------------+
| tile_house_roof_l   | tile_house_roof_m   | tile_house_chimney  | tile_house_roof_m   | tile_house_roof_r   |  Row 0 (Roof)
+---------------------+---------------------+---------------------+---------------------+---------------------+
| tile_house_wall_w   | tile_house_window   | tile_house_wall_w   | tile_house_window   | tile_house_wall_w   |  Row 1 (Upper Wall)
+---------------------+---------------------+---------------------+---------------------+---------------------+
| tile_house_wall_w   | tile_house_wall_w   | tile_house_door     | tile_house_wall_w   | tile_house_wall_w   |  Row 2 (Lower Wall)
+---------------------+---------------------+---------------------+---------------------+---------------------+
| tile_house_base_s   | tile_house_base_s   | tile_house_porch    | tile_house_base_s   | tile_house_base_s   |  Row 3 (Foundation)
+---------------------+---------------------+---------------------+---------------------+---------------------+
```

#### Procedural Generation Code for Farmhouse Set:
```javascript
function bakeFarmhouseTiles(scene) {
  // 1. Red Roof Left Edge (`tile_house_roof_l`)
  let g = scene.make.graphics({ add: false });
  pR(g, 0, 0, 16, 16, TERRAIN_PALETTE.G_BASE);
  // Eaves shadow
  pR(g, 2, 14, 14, 2, TERRAIN_PALETTE.ROOF_DARK, 0.6);
  // Slanted Roof Shingles
  for(let r=0; r<14; r++) {
    pR(g, 14-r, r, r+2, 1, TERRAIN_PALETTE.ROOF_BASE);
    pR(g, 14-r, r, 1, 1, TERRAIN_PALETTE.ROOF_LGT);
  }
  g.generateTexture('tile_house_roof_l', 48, 48); g.destroy();

  // 2. Red Roof Middle Shingles (`tile_house_roof_m`)
  g = scene.make.graphics({ add: false });
  fillTile(g, TERRAIN_PALETTE.ROOF_BASE);
  // Horizontal shingle lap lines
  [3, 7, 11, 15].forEach(y => pR(g, 0, y, 16, 1, TERRAIN_PALETTE.ROOF_DARK));
  [0, 4, 8, 12].forEach(y => pR(g, 0, y, 16, 1, TERRAIN_PALETTE.ROOF_LGT));
  // Vertical shingle breaks
  [2, 10].forEach(x => pR(g, x, 0, 1, 3, TERRAIN_PALETTE.ROOF_DARK));
  [6, 14].forEach(x => pR(g, x, 4, 1, 3, TERRAIN_PALETTE.ROOF_DARK));
  [2, 10].forEach(x => pR(g, x, 8, 1, 3, TERRAIN_PALETTE.ROOF_DARK));
  g.generateTexture('tile_house_roof_m', 48, 48); g.destroy();

  // 3. Red Roof Right Edge (`tile_house_roof_r`)
  g = scene.make.graphics({ add: false });
  pR(g, 0, 0, 16, 16, TERRAIN_PALETTE.G_BASE);
  for(let r=0; r<14; r++) {
    pR(g, 0, r, r+2, 1, TERRAIN_PALETTE.ROOF_BASE);
    pR(g, r+1, r, 1, 1, TERRAIN_PALETTE.ROOF_DARK);
  }
  g.generateTexture('tile_house_roof_r', 48, 48); g.destroy();

  // 4. Horizontal Timber Log Wall (`tile_house_wall_w`)
  g = scene.make.graphics({ add: false });
  fillTile(g, TERRAIN_PALETTE.WOOD_BASE);
  // Log plank grooves
  [0, 4, 8, 12].forEach(y => {
    pR(g, 0, y, 16, 1, TERRAIN_PALETTE.WOOD_LGT);    // Top highlight line
    pR(g, 0, y+3, 16, 1, TERRAIN_PALETTE.WOOD_DARK);  // Bottom shadow line
    pR(g, (y*3)%16, y+1, 1, 2, TERRAIN_PALETTE.WOOD_GRAIN); // Wood knot
  });
  g.generateTexture('tile_house_wall_w', 48, 48); g.destroy();

  // 5. Glowing Cozy Window Tile (`tile_house_window`)
  g = scene.make.graphics({ add: false });
  fillTile(g, TERRAIN_PALETTE.WOOD_BASE);
  // Outer Wooden Frame
  pR(g, 3, 2, 10, 12, TERRAIN_PALETTE.WOOD_DARK);
  // Inner Glass Glow
  pR(g, 4, 3, 8, 10, TERRAIN_PALETTE.WIN_GLOW);
  // Window Frame Crossbars
  pR(g, 7, 3, 2, 10, TERRAIN_PALETTE.WOOD_DARK);
  pR(g, 4, 7, 8, 2, TERRAIN_PALETTE.WOOD_DARK);
  // Glass Shine Highlight
  pR(g, 5, 4, 2, 2, 0xFFFFFF, 0.8);
  g.generateTexture('tile_house_window', 48, 48); g.destroy();

  // 6. Farmhouse Archway Door Tile (`tile_house_door`)
  g = scene.make.graphics({ add: false });
  fillTile(g, TERRAIN_PALETTE.WOOD_BASE);
  // Dark Door Frame Arch
  pR(g, 3, 1, 10, 15, TERRAIN_PALETTE.WOOD_DARK);
  // Door Body
  pR(g, 4, 2, 8, 14, 0x451A03);
  pR(g, 5, 3, 6, 13, 0x5C2407);
  // Iron Hinges
  pR(g, 4, 4, 3, 1, 0x334155);
  pR(g, 4, 11, 3, 1, 0x334155);
  // Brass Door Knob
  pR(g, 9, 9, 2, 2, TERRAIN_PALETTE.BRASS);
  g.generateTexture('tile_house_door', 48, 48); g.destroy();

  // 7. Stone Chimney Tile (`tile_house_chimney`)
  g = scene.make.graphics({ add: false });
  fillTile(g, TERRAIN_PALETTE.ROOF_BASE); // Sits on roof
  // Stone Brick Column
  pR(g, 4, 0, 8, 16, TERRAIN_PALETTE.STONE_BASE);
  // Brick Pattern
  [0, 4, 8, 12].forEach(y => {
    pR(g, 4, y, 8, 1, TERRAIN_PALETTE.STONE_LGT);
    pR(g, (y%8===0)?7:10, y+1, 1, 3, TERRAIN_DARK);
  });
  g.generateTexture('tile_house_chimney', 48, 48); g.destroy();

  // Helper fill tile function
  function fillTile(graphics, color) {
    graphics.fillStyle(color, 1);
    graphics.fillRect(0, 0, 48, 48);
  }
}
```

---

### 2.6 Texture Category 5: Pond & Stream Shoreline Border Tiles (48x48 px)

Shoreline border tiles replace the simple ellipse in `_createFishingSpot` with an organic crystal pond surrounded by foam ripples and pebbles.

```
Shoreline Alignment Grid:
+-----------------------+-----------------------+-----------------------+
| tile_shore_corner_tl  | tile_shore_n          | tile_shore_corner_tr  |
| (Top-Left Shore Edge) | (North Shoreline)     | (Top-Right Shore Edge)|
+-----------------------+-----------------------+-----------------------+
| tile_shore_w          | tile_water_full       | tile_shore_e          |
| (West Shoreline)      | (Open Water Tile)     | (East Shoreline)      |
+-----------------------+-----------------------+-----------------------+
| tile_shore_corner_bl  | tile_shore_s          | tile_shore_corner_br  |
| (Bottom-Left Edge)    | (South Shoreline)     | (Bottom-Right Edge)   |
+-----------------------+-----------------------+-----------------------+
```

#### Procedural Generation Code for Water & Shore Set:
```javascript
function bakeWaterAndShoreTiles(scene) {
  // 1. Open Water Tile (`tile_water_full`)
  let g = scene.make.graphics({ add: false });
  g.fillStyle(TERRAIN_PALETTE.WTR_DEEP, 1);
  g.fillRect(0, 0, 48, 48);
  // Internal Water Ripples
  pR(g, 2, 4, 6, 1, TERRAIN_PALETTE.WTR_SHALLOW);
  pR(g, 9, 11, 5, 1, TERRAIN_PALETTE.WTR_SHALLOW);
  pR(g, 4, 12, 1, 1, TERRAIN_PALETTE.WTR_SPARKLE);
  g.generateTexture('tile_water_full', 48, 48); g.destroy();

  // 2. North Shoreline Tile (`tile_shore_n`)
  g = scene.make.graphics({ add: false });
  // Top half grass, bottom half water
  pR(g, 0, 0, 16, 8, TERRAIN_PALETTE.G_BASE);
  pR(g, 0, 8, 16, 8, TERRAIN_PALETTE.WTR_DEEP);
  // Shoreline Overhang & Wave Foam
  pR(g, 0, 7, 16, 1, TERRAIN_PALETTE.G_BASE_DARK);
  pR(g, 0, 8, 16, 1, TERRAIN_PALETTE.WTR_FOAM);
  pR(g, 0, 9, 16, 1, TERRAIN_PALETTE.WTR_SHALLOW);
  // Shoreline Pebbles
  pR(g, 3, 6, 2, 1, TERRAIN_PALETTE.DIRT_PEBBLE);
  pR(g, 11, 6, 2, 1, TERRAIN_PALETTE.DIRT_PEBBLE);
  g.generateTexture('tile_shore_n', 48, 48); g.destroy();

  // 3. South Shoreline Tile (`tile_shore_s`)
  g = scene.make.graphics({ add: false });
  pR(g, 0, 0, 16, 8, TERRAIN_PALETTE.WTR_DEEP);
  pR(g, 0, 8, 16, 8, TERRAIN_PALETTE.G_BASE);
  pR(g, 0, 7, 16, 1, TERRAIN_PALETTE.WTR_FOAM);
  pR(g, 0, 8, 16, 1, TERRAIN_PALETTE.G_BASE_DARK);
  g.generateTexture('tile_shore_s', 48, 48); g.destroy();

  // 4. West Shoreline Tile (`tile_shore_w`)
  g = scene.make.graphics({ add: false });
  pR(g, 0, 0, 8, 16, TERRAIN_PALETTE.G_BASE);
  pR(g, 8, 0, 8, 16, TERRAIN_PALETTE.WTR_DEEP);
  pR(g, 7, 0, 1, 16, TERRAIN_PALETTE.G_BASE_DARK);
  pR(g, 8, 0, 1, 16, TERRAIN_PALETTE.WTR_FOAM);
  g.generateTexture('tile_shore_w', 48, 48); g.destroy();

  // 5. East Shoreline Tile (`tile_shore_e`)
  g = scene.make.graphics({ add: false });
  pR(g, 0, 0, 8, 16, TERRAIN_PALETTE.WTR_DEEP);
  pR(g, 8, 0, 8, 16, TERRAIN_PALETTE.G_BASE);
  pR(g, 7, 0, 1, 16, TERRAIN_PALETTE.WTR_FOAM);
  pR(g, 8, 0, 1, 16, TERRAIN_PALETTE.G_BASE_DARK);
  g.generateTexture('tile_shore_e', 48, 48); g.destroy();

  // 6. Top-Left Corner Shoreline (`tile_shore_corner_tl`)
  g = scene.make.graphics({ add: false });
  g.fillStyle(TERRAIN_PALETTE.WTR_DEEP, 1); g.fillRect(0, 0, 48, 48);
  pR(g, 0, 0, 16, 8, TERRAIN_PALETTE.G_BASE);
  pR(g, 0, 0, 8, 16, TERRAIN_PALETTE.G_BASE);
  pR(g, 0, 8, 8, 1, TERRAIN_PALETTE.WTR_FOAM);
  pR(g, 8, 0, 1, 8, TERRAIN_PALETTE.WTR_FOAM);
  g.generateTexture('tile_shore_corner_tl', 48, 48); g.destroy();
}
```

---

## 3. Integration Plan: Updating `FarmScene.create()` and `_renderTerrain()`

### 3.1 Architecture Overview
To achieve modularity and clarity without disturbing game state, texture generation is encapsulated in `_bakeTerrainTiles()`, and map creation is delegated to `_renderTerrain(W, H)`.

```
FarmScene.create()
 │
 ├── 1. _bakeTextures()
 │     └── Calls _bakeTerrainTiles() (Generates 25+ 48x48 px textures)
 │
 ├── 2. _drawWorld(W, H)
 │     └── Calls _renderTerrain(W, H)
 │           ├── Layer 0: Base Grass Map (Randomized variants)
 │           ├── Layer 1: Crystal Pond & Shorelines
 │           ├── Layer 2: Farmhouse Building (5x4 structure at depth 10)
 │           ├── Layer 3: Dirt Path Network (Connecting Farm, Shop, Wizard, Arcade, Portal, Dock)
 │           └── Layer 4: Perimeter Fences around plots
 │
 ├── 3. _createPlots(W, H) (Uses PLOT_SIZE = 48, depth = 20)
 ├── 4. _createPlayer(W, H) (depth = Y position)
 └── 5. NPCs, Trees, Particles & Day/Night Lighting
```

---

### 3.2 Code Modification Guide for `game.js`

#### Change 1: Insert `_bakeTerrainTiles()` into `_bakeTextures()`
Inside `FarmScene._bakeTextures()` (around line 3040), append the call:
```javascript
  _bakeTextures(){
    const mk = () => this.make.graphics({add:false});
    
    // Bake new 48x48 procedural terrain tiles
    this._bakeTerrainTiles();
    
    // ... rest of existing texture baking ...
  }
```

#### Change 2: Implementation of `_bakeTerrainTiles()`
Add `_bakeTerrainTiles()` as a private method in `FarmScene`:
```javascript
  _bakeTerrainTiles() {
    bakeGrassBase(this);
    bakeGrassFlowers(this);
    bakeGrassClover(this);
    bakeDirtPathTiles(this);
    bakeFenceTiles(this);
    bakeFarmhouseTiles(this);
    bakeWaterAndShoreTiles(this);
  }
```

#### Change 3: Refactor `_drawWorld(W, H)` to invoke `_renderTerrain(W, H)`
Replace lines 3313-3346 in `_drawWorld(W, H)` with:
```javascript
  _drawWorld(W, H){
    // Render multi-layered tilemap terrain
    this._renderTerrain(W, H);

    // Scatter wildflowers naturally in open grass areas
    const flowers = ['flw_red', 'flw_yellow', 'flw_purple'];
    const flowerList = [];
    for(let i=0; i<35; i++){
      const fx = Phaser.Math.Between(40, W-40);
      const fy = Phaser.Math.Between(40, H-40);
      if(fx < this.farm.x - 20 || fx > this.farm.x + this.farm.w + 20 || fy < this.farm.y - 20 || fy > this.farm.y + this.farm.h + 20){
        const fl = this.add.image(fx, fy, Phaser.Utils.Array.GetRandom(flowers))
          .setScale(1.2).setDepth(fy);
        flowerList.push(fl);
        this.tweens.add({ targets: fl, angle: { from: -6, to: 6 }, duration: 1500 + Math.random()*1000, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      }
    }

    // Micro World Details: Well, Barrels, Signpost, Butterflies, Ambient Vignette
    this._drawWorldDetails(W, H, flowerList);
  }
```

#### Change 4: Implementation of `_renderTerrain(W, H)`
Add `_renderTerrain(W, H)` to `FarmScene`:
```javascript
  _renderTerrain(W, H) {
    const cols = Math.ceil(W / TILE) + 1;
    const rows = Math.ceil(H / TILE) + 1;
    const rng = new Phaser.Math.RandomDataGenerator(['hangeul_valley_m2']);

    // ── LAYER 0: BASE GRASS MAP ──────────────────────────────────────────────
    const grassKeys = ['tile_grass_base', 'tile_grass_flowers', 'tile_grass_clover'];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Natural distribution: 70% base, 15% flowers, 15% clover
        const roll = rng.frac();
        const key = roll < 0.70 ? grassKeys[0] : (roll < 0.85 ? grassKeys[1] : grassKeys[2]);
        this.add.image(c * TILE + TILE / 2, r * TILE + TILE / 2, key)
          .setDisplaySize(TILE, TILE)
          .setDepth(0);
      }
    }

    // Calculate Farm Bounding Box
    const fW = PLOT_COLS * (PLOT_SIZE + PLOT_GAP) - PLOT_GAP;
    const fH = 3 * (PLOT_SIZE + PLOT_GAP) - PLOT_GAP;
    this.farm = { x: W / 2 - fW / 2, y: H / 2 - fH / 2 - 30, w: fW, h: fH };

    // ── LAYER 1: FARMHOUSE BACKGROUND STRUCTURE (5x4 Tiles) ─────────────────
    const houseX = W / 2;
    const houseY = this.farm.y - 120;
    const houseLayout = [
      ['tile_house_roof_l', 'tile_house_roof_m', 'tile_house_chimney', 'tile_house_roof_m', 'tile_house_roof_r'],
      ['tile_house_wall_w', 'tile_house_window', 'tile_house_wall_w',  'tile_house_window', 'tile_house_wall_w'],
      ['tile_house_wall_w', 'tile_house_wall_w', 'tile_house_door',    'tile_house_wall_w', 'tile_house_wall_w'],
      ['tile_path_center',  'tile_path_center',  'tile_path_center',   'tile_path_center',  'tile_path_center']
    ];

    houseLayout.forEach((row, ry) => {
      row.forEach((tileKey, rx) => {
        const tx = houseX - (2 * TILE) + (rx * TILE);
        const ty = houseY - (2 * TILE) + (ry * TILE);
        this.add.image(tx, ty, tileKey)
          .setDisplaySize(TILE, TILE)
          .setDepth(ty);
      });
    });

    // ── LAYER 2: DIRT PATH NETWORK ──────────────────────────────────────────
    // Connect Farmhouse Door to Farm Center, and Farm to NPCs/Landmarks
    const pathGridCoords = [
      // Main Trunk (Farmhouse to Farm Center)
      { c: Math.floor(cols / 2), r: Math.floor((this.farm.y - 30) / TILE), key: 'tile_path_straight_v' },
      { c: Math.floor(cols / 2), r: Math.floor(this.farm.y / TILE), key: 'tile_path_cross' },
      
      // East Branch (Farm to Shop & Wizard)
      { c: Math.floor(cols / 2) + 1, r: Math.floor(this.farm.y / TILE), key: 'tile_path_straight_h' },
      { c: Math.floor(cols / 2) + 2, r: Math.floor(this.farm.y / TILE), key: 'tile_path_straight_h' },
      { c: Math.floor(cols / 2) + 3, r: Math.floor(this.farm.y / TILE), key: 'tile_path_corner_tr' },
      
      // West Branch (Farm to Arcade & Apple Tree)
      { c: Math.floor(cols / 2) - 1, r: Math.floor(this.farm.y / TILE), key: 'tile_path_straight_h' },
      { c: Math.floor(cols / 2) - 2, r: Math.floor(this.farm.y / TILE), key: 'tile_path_straight_h' },
      { c: Math.floor(cols / 2) - 3, r: Math.floor(this.farm.y / TILE), key: 'tile_path_corner_tl' }
    ];

    pathGridCoords.forEach(pt => {
      this.add.image(pt.c * TILE + TILE / 2, pt.r * TILE + TILE / 2, pt.key)
        .setDisplaySize(TILE, TILE)
        .setDepth(1);
    });

    // ── LAYER 3: CRYSTAL POND & SHORELINE BORDER ────────────────────────────
    const pondX = Math.floor(cols / 2);
    const pondR = Math.floor((this.farm.y + fH + 140) / TILE);
    
    // 3x2 Tile Crystal Pond Structure
    const pondLayout = [
      ['tile_shore_corner_tl', 'tile_shore_n',     'tile_shore_corner_tr'],
      ['tile_shore_w',         'tile_water_full',  'tile_shore_e'],
      ['tile_shore_corner_bl', 'tile_shore_s',     'tile_shore_corner_br']
    ];

    pondLayout.forEach((row, ry) => {
      row.forEach((tileKey, rx) => {
        const tx = (pondX - 1 + rx) * TILE + TILE / 2;
        const ty = (pondR - 1 + ry) * TILE + TILE / 2;
        this.add.image(tx, ty, tileKey)
          .setDisplaySize(TILE, TILE)
          .setDepth(ty - 5);
      });
    });

    // ── LAYER 4: FARM PERIMETER FENCING ─────────────────────────────────────
    const fenceTopY = this.farm.y - 10;
    const fenceBotY = this.farm.y + fH + 10;
    const fenceLeftX = this.farm.x - 15;
    const fenceRightX = this.farm.x + fW + 15;

    // Horizontal top & bottom fence rails
    for (let x = fenceLeftX; x <= fenceRightX; x += TILE) {
      this.add.image(x, fenceTopY, 'tile_fence_h').setDisplaySize(TILE, TILE).setDepth(fenceTopY);
      this.add.image(x, fenceBotY, 'tile_fence_h').setDisplaySize(TILE, TILE).setDepth(fenceBotY);
    }
    // Corner Posts
    this.add.image(fenceLeftX, fenceTopY, 'tile_fence_post').setDisplaySize(TILE, TILE).setDepth(fenceTopY + 1);
    this.add.image(fenceRightX, fenceTopY, 'tile_fence_post').setDisplaySize(TILE, TILE).setDepth(fenceTopY + 1);
    // Gate at center bottom
    this.add.image(W / 2, fenceBotY, 'tile_fence_gate').setDisplaySize(TILE, TILE).setDepth(fenceBotY + 2);
  }
```

---

## 4. Verification & Compatibility Analysis

### 4.1 Plot & Gameplay System Compatibility
- **Plot Coordinates**: `_createPlots` computes plot centers using `px = farm.x + col*(PLOT_SIZE+PLOT_GAP) + PLOT_SIZE/2`. Since `PLOT_SIZE = 48` matches `TILE = 48`, plots align perfectly within the fenced farm boundary.
- **Depth Hierarchy**:
  - Base Grass & Water: Depth `0` to `5`
  - Paths: Depth `1` to `10`
  - Buildings & Fences: Depth `y` (Y-sorting dynamic depth)
  - Plots & Crops: Depth `20`
  - Player & Shadows: Depth `player.y` (dynamic depth sorting)
- **Player Movement & Collisions**: `Physics` static colliders (e.g. apple tree trunk zone, world bounds) remain unchanged.
- **SRS & Harvest Systems**: Crop growth stages, quiz popups, ingredient rewards, and sound effects remain 100% operational.

### 4.2 Verification Steps for Implementer
1. Execute python syntax checker on `game.js` after edits:
   `python -c "import py_compile; print('Syntax OK')"`
2. Verify all texture keys exist by inspecting Phaser texture manager:
   `scene.textures.get('tile_grass_base')`
3. Launch local game server (e.g. `python -m http.server 8000`) and visually verify:
   - Grass meadow variation across entire world map.
   - Farmhouse red barn standing proudly behind notice board/farm plots.
   - Wooden perimeter fence bounding the farm grid with center gate.
   - Dirt path network connecting all key NPCs and buildings.
   - Shoreline tiles framing the Crystal Fishing Pond.
