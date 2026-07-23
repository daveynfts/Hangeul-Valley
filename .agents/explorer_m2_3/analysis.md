# Procedural Texture & Environment Art Analysis Report for ArcadeScene and DungeonScene

**Milestone**: R2 — Tilemap Terrain & Environment Art  
**Agent**: Explorer 3 (`explorer_m2_3`)  
**Target Repository**: Hangeul Valley (`C:/VibeCode/Hangeul Valley/game.js`)  
**Date**: 2026-07-22  

---

## 1. Executive Summary

This report provides a comprehensive analysis of the existing background and environment rendering systems in `ArcadeScene` and `DungeonScene` within `game.js`, and formulates an actionable architectural blueprint for upgrading both scenes with high-quality, procedural 48x48 pixel resolution art generated via the Phaser 3 Graphics API (`make.graphics()`, `fillRect()`, `fillCircle()`, `generateTexture()`).

### Key Findings
1. **Current ArcadeScene Drawing Logic (`game.js`, lines 4252–4264)**: Uses a static `#030712` background rectangle, vector grid lines drawn on a single `Phaser.GameObjects.Graphics` object, and 80 independently tweened 1x1–3x3 rectangle GameObjects. It lacks parallax depth, nebulae, celestial objects, and seamless space textures.
2. **Current DungeonScene Drawing Logic (`game.js`, lines 4650–4662)**: Uses a static `#0F172A` rectangle background with basic vector floor grid lines and 4 simple static circles at screen corners with sparkle sprites. It lacks stone floor tiling, cracked variations, mossy wall structures, sconce mounts, and magical glowing runes.
3. **Proposed Upgrade**: Generate 10+ pixel-perfect 48x48 procedural textures using Phaser 3 `make.graphics()` and `generateTexture()`, integrated into `PixelArtRenderer.generateAllTextures(scene)`.
   - **ArcadeScene**: 5-layer parallax space environment (`tile_space_dark`, `tile_stars_far`, `tile_stars_near`, `nebula_purple`, `nebula_cyan`, `planet_ringed`, `planet_gas_giant`).
   - **DungeonScene**: Modular stone tilemap & decor system (`tile_dungeon_floor`, `tile_dungeon_cracked`, `tile_dungeon_wall_moss`, `dungeon_torch`, `tile_dungeon_rune`).

---

## 2. Current Scene Analysis (`game.js`)

### 2.1 ArcadeScene Background Logic (`game.js`: lines 4252–4264)

```javascript
// Current Implementation in ArcadeScene.create():
// 1. Solid dark rectangle fill
this.add.rectangle(0, 0, this.W, this.H, 0x030712).setOrigin(0);

// 2. Vector grid lines
const g = this.add.graphics();
g.lineStyle(1, 0x1E1B4B, 0.4);
for(let x=0; x<this.W; x+=50) g.lineBetween(x, 0, x, this.H);
for(let y=0; y<this.H; y+=50) g.lineBetween(0, y, this.W, y);

// 3. Simple random star rectangles with alpha tweening
for(let i=0; i<80; i++){
  const s = this.add.rectangle(Math.random()*this.W, Math.random()*this.H, Phaser.Math.Between(1,3), Phaser.Math.Between(1,3), 0x38BDF8, Math.random());
  this.tweens.add({ targets: s, alpha: 0.1, duration: 1000 + Math.random()*1500, yoyo: true, repeat: -1 });
}
```

#### Deficiencies Identified:
- **No Parallax Motion**: Stars and grid lines are fixed to screen coordinates. Moving the player ship does not trigger scrolling background layers.
- **Flat Visual Appearance**: Solid `#030712` rectangle without cosmic dust, nebulae, or deep space texture.
- **Performance Inefficiency**: Spawning 80 individual `Phaser.GameObjects.Rectangle` nodes with 80 active active tween timers creates unnecessary CPU overhead compared to scrolling seamless `TileSprite` textures.
- **Lack of Atmospheric Detail**: Missing planets, space dust, gas clouds, and multi-colored star flare variations.

---

### 2.2 DungeonScene Environment Logic (`game.js`: lines 4650–4662)

```javascript
// Current Implementation in DungeonScene.create():
// 1. Solid dark blue-gray floor fill
this.add.rectangle(0, 0, this.W, this.H, 0x0F172A).setOrigin(0);

// 2. Vector floor grid lines
const g = this.add.graphics();
g.lineStyle(1, 0x1E293B, 0.6);
for(let x=0; x<this.W; x+=40) g.lineBetween(x, 0, x, this.H);
for(let y=0; y<this.H; y+=40) g.lineBetween(0, y, this.W, y);

// 3. Basic corner light circles
[ {x:60,y:60}, {x:this.W-60,y:60}, {x:60,y:this.H-60}, {x:this.W-60,y:this.H-60} ].forEach(t => {
  this.add.circle(t.x, t.y, 40, 0xF59E0B, 0.15);
  const torch = this.add.sprite(t.x, t.y, 'sparkle').setOrigin(0.5);
  this.tweens.add({ targets:torch, scale:{from:0.9,to:1.2}, duration:400+Math.random()*200, yoyo:true, repeat:-1 });
});
```

#### Deficiencies Identified:
- **Monotonous Floor Surface**: Entire dungeon floor is represented by a single rectangle color `#0F172A` with basic vector grid lines.
- **No Floor Variations**: Lacks stone texture details, cracked tiles, or ancient magical rune carvings.
- **No Wall Boundaries**: Missing perimeter wall textures, stone block masonry, or mossy creeping vegetation.
- **Simplistic Torch Lighting**: Reuses generic `'sparkle'` particle sprite with a flat yellow circle. Lacks dedicated iron sconce wall mounts, flame particle animations, and ambient torch lighting overlays.

---

## 3. Procedural Texture Specifications (48x48 Pixel Resolution)

All proposed textures are designed to be generated dynamically at 48x48 pixel resolution using Phaser 3 `make.graphics()` and stored in Phaser's Texture Manager via `generateTexture()`.

Textures use either 16x16 matrices rendered at pixel scale `ps = 3` ($16 \times 3 = 48$ pixels) or direct programmatic 48x48 Graphics drawing methods.

---

### 3.1 ArcadeScene Textures

#### 1. `tile_space_dark` (48x48 Deep Space Background Tile)
- **Dimensions**: 48x48 pixels (16x16 matrix, `ps = 3`)
- **Palette**:
  - `.` / `K`: `0x030712` (Abyssal black-blue base)
  - `d`: `0x070B19` (Deep navy cosmic noise)
  - `v`: `0x0E1329` (Muted violet space dust)
  - `p`: `0x151936` (Indigo dust speckle)
- **Matrix (Seamless Tiling Pattern)**:
```
KKKKKKKdKKKKKKvK
KKvKKKKKKKKdKKKK
KKKKKpKKKKKKKKKK
dKKKKKKKKvKKKKKd
KKKKvKKKKKKKKpKK
KKKKKKKKdKKKKKKK
KKdKKKKKKKKKKvKK
KKKKKKpKKKKKKKKK
vKKKKKKKKKKdKKvK
KKKKKdKKKKKKKKKK
KKpKKKKKKvKKKKKK
KKKKKKKKKKKKpKKd
dKKKKvKKKKKKKKKK
KKKKKKKKdKKKKvKK
KKvKKKKKKKKpKKKK
KKKKKKpKKKKKKKKK
```

---

#### 2. `tile_stars_far` (48x48 Distant Star Density Layer)
- **Dimensions**: 48x48 pixels (16x16 matrix, `ps = 3`, transparent background)
- **Palette**:
  - `.`: `null` (Transparent)
  - `w`: `0x94A3B8` (Dim slate white pixel star)
  - `W`: `0xE2E8F0` (Soft white pixel star)
  - `c`: `0x38BDF8` (Faint cyan star)
  - `p`: `0xC084FC` (Faint purple star)
- **Matrix**:
```
................
..w..........c..
.......W........
................
....p.......w...
................
.........W......
..c.............
................
.....w......p...
................
..W.............
.......c....w...
................
....p.....W.....
................
```

---

#### 3. `tile_stars_near` (48x48 Near Star & Lens Flare Layer)
- **Dimensions**: 48x48 pixels (16x16 matrix, `ps = 3`, transparent background)
- **Palette**:
  - `.`: `null` (Transparent)
  - `W`: `0xFFFFFF` (Pure white core)
  - `C`: `0x00FFFF` (Neon cyan lens flare)
  - `Y`: `0xFDE047` (Bright yellow lens flare)
  - `M`: `0xF472B6` (Magenta lens flare)
  - `c`: `0x7DD3FC` (Cyan halo pixel)
- **Matrix (Includes 4-point cross flare stars)**:
```
......C.........
.....CWC........
......C.........
..........M.....
.........MWM....
..........M.....
................
....c...........
...cWc..........
....c...........
.........Y......
........YWY.....
.........Y......
................
..W.............
................
```

---

#### 4. `nebula_purple` (48x48 Purple Cosmic Cloud Layer)
- **Dimensions**: 48x48 pixels (Direct Phaser 3 Graphics drawing with alpha blending)
- **Color Palette**:
  - Outer cloud halo: `0x3B0764` (Alpha 0.35)
  - Mid nebula plasma: `0x7E22CE` (Alpha 0.55)
  - Core cloud density: `0xA855F7` (Alpha 0.75)
  - Stellar core highlight: `0xE9D5FF` (Alpha 0.90)
- **Drawing Recipe**:
  - Organic overlapping circles centered along a diagonal axis across the 48x48 canvas.

---

#### 5. `nebula_cyan` (48x48 Cyan Cosmic Cloud Layer)
- **Dimensions**: 48x48 pixels (Direct Phaser 3 Graphics drawing with alpha blending)
- **Color Palette**:
  - Outer teal wisps: `0x042F2E` (Alpha 0.35)
  - Mid cyan plasma: `0x0F766E` (Alpha 0.55)
  - Neon cyan core: `0x06B6D4` (Alpha 0.75)
  - Core highlight: `0xCFFAFE` (Alpha 0.90)
- **Drawing Recipe**:
  - Wispy curved plasma filaments rendered with overlapping semi-transparent circles and pill arcs.

---

#### 6. `planet_ringed` (48x48 Ringed Planet Silhouette)
- **Dimensions**: 48x48 pixels
- **Components**:
  - **Planet Body**: 24px diameter sphere at center (24, 24). Radial gradient fill from deep violet (`0x2E1065`) to vivid violet (`0x8B5CF6`) with a bottom-left dark shadow crescent (`0x0F0728`).
  - **Planetary Rings**: Elliptical ring belt tilted at -25° across the planet sphere. Ring layers: Outer ring (`0xF472B6`), mid gap (`null`), inner ring (`0xFDE047`), core accent (`0x38BDF8`).
  - **Atmospheric Glow**: Ambient light circle aura (`0x38BDF8`, alpha 0.25).

---

#### 7. `planet_gas_giant` (48x48 Banded Gas Giant Planet)
- **Dimensions**: 48x48 pixels
- **Components**:
  - **Sphere Body**: 34px diameter sphere at center (24, 24).
  - **Banded Atmosphere**: Alternating horizontal cloud belts:
    - Band 1 (Top Pole): Muted dark rust (`0x78350F`)
    - Band 2: Bright amber (`0xD97706`)
    - Band 3 (Equatorial): Coral orange (`0xFB923C`) & cream stripe (`0xFEF3C7`)
    - Band 4: Deep burgundy (`0x991B1B`)
    - Band 5 (Bottom Pole): Muted brown (`0x451A03`)
  - **Great Red Spot**: Oval storm vortex at (29, 27) in vibrant crimson (`0xDC2626`) with a dark border (`0x7F1D1D`).
  - **Spherical Shading**: Dark right-limb shadow crescent (`0x0F172A`, alpha 0.6) for 3D depth.

---

### 3.2 DungeonScene Textures

#### 1. `tile_dungeon_floor` (48x48 Dark Stone Floor Tile)
- **Dimensions**: 48x48 pixels (16x16 matrix, `ps = 3`)
- **Palette**:
  - `K`: `0x0F172A` (Mortar gap / shadow)
  - `S`: `0x1E293B` (Base stone slab body)
  - `s`: `0x334155` (Stone texture variation)
  - `H`: `0x475569` (Top/left bevel edge highlight)
  - `D`: `0x090D16` (Bottom/right bevel drop shadow)
- **Matrix (4 Paver Slabs with Mortar Joints)**:
```
HHHHHHHHHKHHHHHH
HSSSSSSSDKSsSSSS
HSSsSSSSDKSSSSsS
HSSSSSSSDKSSSSSS
DDDDDDDDDKDDDDDD
KKKKKKKKKKKKKKKK
HHHHHHHKHHHHHHHH
HSSsSSSDKSsSSSSD
HSSSSSSDKSSSSSSD
HSSSSSSDKSSsSSSD
DDDDDDDDKDDDDDDD
KKKKKKKKKKKKKKKK
HHHHHHHHHHHHHHHH
HSSSSsSSSSSSSSSD
HSSsSSSSSSSsSSSD
DDDDDDDDDDDDDDDD
```

---

#### 2. `tile_dungeon_cracked` (48x48 Cracked Stone Floor Tile)
- **Dimensions**: 48x48 pixels (16x16 matrix, `ps = 3`)
- **Palette**: Same as `tile_dungeon_floor`, plus:
  - `X`: `0x020617` (Abyss crack fissure core)
  - `x`: `0x0F172A` (Crack line shadow)
  - `c`: `0x475569` (Chipped stone highlight along crack edge)
- **Matrix**:
```
HHHHHHHHHKHHHHHH
HSSSSSSSDKSsSSSS
HSSSXsssDKSSSSsS
HSSxXcSSDKSSSSSS
DDDxXDDDDKDDDDDD
KKKxXKKKKKKKKKKK
HHHcXHHKHHHHHHHH
HSSScXxDKSsSSSSD
HSSSScXXDKSSSSSD
HSSSSScXxKSSsSSD
DDDDDDDcxXDDDDDD
KKKKKKKKcxXKKKKK
HHHHHHHHHcxXHHHH
HSSSSsSSSSScXxSD
HSSsSSSSSSSScXXD
DDDDDDDDDDDDDDXD
```

---

#### 3. `tile_dungeon_wall_moss` (48x48 Mossy Stone Wall Tile)
- **Dimensions**: 48x48 pixels (16x16 matrix, `ps = 3`)
- **Palette**:
  - `K`: `0x0F172A` (Deep wall mortar)
  - `B`: `0x334155` (Wall stone brick)
  - `b`: `0x475569` (Brick face highlight)
  - `H`: `0x64748B` (Brick top bevel)
  - `M`: `0x15803D` (Dark forest moss base)
  - `m`: `0x22C55E` (Vivid lime moss patch)
  - `L`: `0x86EFAC` (Bright moss tip highlight)
- **Matrix (Horizontal Brick Masonry with Moss Creeping from Base and Joint Crevices)**:
```
HHHHHHHHHHHHHHHH
HBBBBbBBBBBBBBBB
HBBBBBBBBbBBBBBB
KKKKKKKKKKKKKKKK
HHHHHHHKHHHHHHHH
HBBbBBBDKBBBBbBD
HBBBBBBDKBBBBBBD
KKKKKKKKKKKKKKKK
HHHHHHHHHHHHHHHH
HBBBBbBBBDKBBbBD
HBBBBBBBBDKMBBBD
KKKKKKKKKKKMMKKK
HHHHHHHHHKHMMHHH
HMBbBBBBDKmMLbBD
HMmMBBBBDKMmLmBD
MMmMMMMMMMMmMmMM
```

---

#### 4. `dungeon_torch` (48x48 Torch Sconce Mount)
- **Dimensions**: 48x48 pixels (Direct Phaser 3 Graphics drawing)
- **Palette**:
  - Iron mount: `0x1E293B` (Body), `0x475569` (Frame), `0x94A3B8` (Rivet dots)
  - Wooden torch handle: `0x78350F` (Wood stem), `0x451A03` (Shading)
  - Sconce cup: `0x334155` (Iron rim)
  - Fire flame: `0x991B1B` (Base flare), `0xEA580C` (Mid flame), `0xFACC15` (Hot flame), `0xFFFFFF` (Flame core)
  - Ambient glow halo: `0xF59E0B` (Alpha 0.3)
- **Structure**:
  - Wall plate rectangle at (18, 26, 12, 16).
  - Torch handle diagonal rod extending upwards to cup at (24, 18).
  - Multi-layered flame polygons at top (24, 8) with warm radial light aura circle.

---

#### 5. `tile_dungeon_rune` (48x48 Glowing Magical Rune Tile)
- **Dimensions**: 48x48 pixels (16x16 matrix, `ps = 3`)
- **Palette**:
  - Stone paver base: `K` (`0x0F172A`), `S` (`0x1E293B`), `D` (`0x090D16`)
  - Magic Rune Glyph:
    - `R`: `0x06B6D4` (Neon cyan glow)
    - `r`: `0x38BDF8` (Vivid blue rune line)
    - `W`: `0xE0F2FE` (Glowing rune core highlight)
    - `P`: `0xA855F7` (Arcane purple accent)
- **Matrix (Features central Hangeul-inspired magic rune glyph)**:
```
HHHHHHHHHKHHHHHH
HSSSSSSSDKSsSSSS
HSSsSRRRRRDSSsSS
HSSsRWWWWWRSSSSS
DDDRWDrrRDWDDDDD
KKKRWDrrRDWKKKKK
HHHRWDrrRDWHHHHH
HSSRWDWWWRDSSSsD
HSSRWDWWWRDSSSSD
HSSsRWWWWWRSSsSD
DDDRWDrrRDWDDDDD
KKKRWDrrRDWKKKKK
HHHRWDrrRDWHHHHH
HSSsRRRRRRDSsSSD
HSSsSSSSSSSsSSSD
DDDDDDDDDDDDDDDD
```

---

## 4. Code Implementation Recipes for `PixelArtRenderer`

The following code snippets should be added to `PixelArtRenderer` in `game.js`.

### 4.1 Arcade Texture Generator Snippet (`_genArcadeTextures`)

```javascript
static _genArcadeSpaceTextures(scene) {
  // 1. tile_space_dark (48x48)
  const P_space = {
    '.': 0x030712, 'K': 0x030712, 'd': 0x070B19, 'v': 0x0E1329, 'p': 0x151936
  };
  const matrix_space = [
    'KKKKKKKdKKKKKKvK','KKvKKKKKKKKdKKKK','KKKKKpKKKKKKKKKK','dKKKKKKKKvKKKKKd',
    'KKKKvKKKKKKKKpKK','KKKKKKKKdKKKKKKK','KKdKKKKKKKKKKvKK','KKKKKKpKKKKKKKKK',
    'vKKKKKKKKKKdKKvK','KKKKKdKKKKKKKKKK','KKpKKKKKKvKKKKKK','KKKKKKKKKKKKpKKd',
    'dKKKKvKKKKKKKKKK','KKKKKKKKdKKKKvKK','KKvKKKKKKKKpKKKK','KKKKKKpKKKKKKKKK'
  ];
  this.createTexture(scene, 'tile_space_dark', matrix_space, P_space, 16, 16, 3);

  // 2. tile_stars_far (48x48)
  const P_stars_far = {
    '.': null, 'w': 0x94A3B8, 'W': 0xE2E8F0, 'c': 0x38BDF8, 'p': 0xC084FC
  };
  const matrix_stars_far = [
    '................','..w..........c..','.......W........','................',
    '....p.......w...','................','.........W......','..c.............',
    '................','.....w......p...','................','..W.............',
    '.......c....w...','................','....p.....W.....','................'
  ];
  this.createTexture(scene, 'tile_stars_far', matrix_stars_far, P_stars_far, 16, 16, 3);

  // 3. tile_stars_near (48x48)
  const P_stars_near = {
    '.': null, 'W': 0xFFFFFF, 'C': 0x00FFFF, 'Y': 0xFDE047, 'M': 0xF472B6, 'c': 0x7DD3FC
  };
  const matrix_stars_near = [
    '......C.........','.....CWC........','......C.........','..........M.....',
    '.........MWM....','..........M.....','................','....c...........',
    '...cWc..........','....c...........','.........Y......','........YWY.....',
    '.........Y......','................','..W.............','................'
  ];
  this.createTexture(scene, 'tile_stars_near', matrix_stars_near, P_stars_near, 16, 16, 3);

  // 4. nebula_purple (48x48)
  const g_neb_p = scene.make.graphics({ add: false });
  g_neb_p.fillStyle(0x3B0764, 0.35); g_neb_p.fillCircle(24, 24, 22);
  g_neb_p.fillStyle(0x7E22CE, 0.55); g_neb_p.fillCircle(20, 20, 15);
  g_neb_p.fillStyle(0xA855F7, 0.75); g_neb_p.fillCircle(18, 18, 9);
  g_neb_p.fillStyle(0xE9D5FF, 0.90); g_neb_p.fillCircle(16, 16, 4);
  g_neb_p.generateTexture('nebula_purple', 48, 48);
  g_neb_p.destroy();

  // 5. nebula_cyan (48x48)
  const g_neb_c = scene.make.graphics({ add: false });
  g_neb_c.fillStyle(0x042F2E, 0.35); g_neb_c.fillCircle(24, 24, 22);
  g_neb_c.fillStyle(0x0F766E, 0.55); g_neb_c.fillCircle(28, 26, 14);
  g_neb_c.fillStyle(0x06B6D4, 0.75); g_neb_c.fillCircle(30, 28, 8);
  g_neb_c.fillStyle(0xCFFAFE, 0.90); g_neb_c.fillCircle(32, 29, 3);
  g_neb_c.generateTexture('nebula_cyan', 48, 48);
  g_neb_c.destroy();

  // 6. planet_ringed (48x48)
  const g_plan_r = scene.make.graphics({ add: false });
  // Atmosphere aura
  g_plan_r.fillStyle(0x38BDF8, 0.25); g_plan_r.fillCircle(24, 24, 16);
  // Back ring
  g_plan_r.lineStyle(3, 0xF472B6, 0.8); g_plan_r.strokeEllipse(24, 24, 40, 10);
  // Planet body
  g_plan_r.fillStyle(0x4C1D95, 1); g_plan_r.fillCircle(24, 24, 12);
  g_plan_r.fillStyle(0x8B5CF6, 1); g_plan_r.fillCircle(22, 22, 9);
  // Shadow crescent
  g_plan_r.fillStyle(0x0F0728, 0.5); g_plan_r.fillCircle(27, 27, 10);
  // Front ring segment
  g_plan_r.lineStyle(2, 0xFDE047, 1); g_plan_r.strokeRect(6, 23, 16, 3);
  g_plan_r.generateTexture('planet_ringed', 48, 48);
  g_plan_r.destroy();

  // 7. planet_gas_giant (48x48)
  const g_plan_g = scene.make.graphics({ add: false });
  // Base sphere
  g_plan_g.fillStyle(0xD97706, 1); g_plan_g.fillCircle(24, 24, 17);
  // Horizontal bands
  g_plan_g.fillStyle(0x78350F, 0.8); g_plan_g.fillRect(8, 12, 32, 4);
  g_plan_g.fillStyle(0xFB923C, 0.9); g_plan_g.fillRect(7, 20, 34, 5);
  g_plan_g.fillStyle(0x991B1B, 0.8); g_plan_g.fillRect(8, 28, 32, 4);
  // Great Red Spot
  g_plan_g.fillStyle(0xDC2626, 1); g_plan_g.fillEllipse(29, 22, 7, 5);
  // Shading mask
  g_plan_g.fillStyle(0x1E1B4B, 0.45); g_plan_g.fillCircle(28, 26, 16);
  g_plan_g.generateTexture('planet_gas_giant', 48, 48);
  g_plan_g.destroy();
}
```

---

### 4.2 Dungeon Texture Generator Snippet (`_genDungeonTextures`)

```javascript
static _genDungeonEnvironmentTextures(scene) {
  // 1. tile_dungeon_floor (48x48)
  const P_floor = {
    'K': 0x0F172A, 'S': 0x1E293B, 's': 0x334155, 'H': 0x475569, 'D': 0x090D16
  };
  const matrix_floor = [
    'HHHHHHHHHKHHHHHH','HSSSSSSSDKSsSSSS','HSSsSSSSDKSSSSsS','HSSSSSSSDKSSSSSS',
    'DDDDDDDDDKDDDDDD','KKKKKKKKKKKKKKKK','HHHHHHHKHHHHHHHH','HSSsSSSDKSsSSSSD',
    'HSSSSSSDKSSSSSSD','HSSSSSSDKSSsSSSD','DDDDDDDDKDDDDDDD','KKKKKKKKKKKKKKKK',
    'HHHHHHHHHHHHHHHH','HSSSSsSSSSSSSSSD','HSSsSSSSSSSsSSSD','DDDDDDDDDDDDDDDD'
  ];
  this.createTexture(scene, 'tile_dungeon_floor', matrix_floor, P_floor, 16, 16, 3);

  // 2. tile_dungeon_cracked (48x48)
  const P_cracked = {
    'K': 0x0F172A, 'S': 0x1E293B, 's': 0x334155, 'H': 0x475569, 'D': 0x090D16,
    'X': 0x020617, 'x': 0x0F172A, 'c': 0x475569
  };
  const matrix_cracked = [
    'HHHHHHHHHKHHHHHH','HSSSSSSSDKSsSSSS','HSSSXsssDKSSSSsS','HSSxXcSSDKSSSSSS',
    'DDDxXDDDDKDDDDDD','KKKxXKKKKKKKKKKK','HHHcXHHKHHHHHHHH','HSSScXxDKSsSSSSD',
    'HSSSScXXDKSSSSSD','HSSSSScXxKSSsSSD','DDDDDDDcxXDDDDDD','KKKKKKKKcxXKKKKK',
    'HHHHHHHHHcxXHHHH','HSSSSsSSSSScXxSD','HSSsSSSSSSSScXXD','DDDDDDDDDDDDDDXD'
  ];
  this.createTexture(scene, 'tile_dungeon_cracked', matrix_cracked, P_cracked, 16, 16, 3);

  // 3. tile_dungeon_wall_moss (48x48)
  const P_wall_moss = {
    'K': 0x0F172A, 'B': 0x334155, 'b': 0x475569, 'H': 0x64748B,
    'M': 0x15803D, 'm': 0x22C55E, 'L': 0x86EFAC, 'D': 0x0F172A
  };
  const matrix_wall_moss = [
    'HHHHHHHHHHHHHHHH','HBBBBbBBBBBBBBBB','HBBBBBBBBbBBBBBB','KKKKKKKKKKKKKKKK',
    'HHHHHHHKHHHHHHHH','HBBbBBBDKBBBBbBD','HBBBBBBDKBBBBbBD','KKKKKKKKKKKKKKKK',
    'HHHHHHHHHHHHHHHH','HBBBBbBBBDKBBbBD','HBBBBBBBBDKMBBBD','KKKKKKKKKKKMMKKK',
    'HHHHHHHHHKHMMHHH','HMBbBBBBDKmMLbBD','HMmMBBBBDKMmLmBD','MMmMMMMMMMMmMmMM'
  ];
  this.createTexture(scene, 'tile_dungeon_wall_moss', matrix_wall_moss, P_wall_moss, 16, 16, 3);

  // 4. dungeon_torch (48x48)
  const g_torch = scene.make.graphics({ add: false });
  // Ambient warm light glow halo
  g_torch.fillStyle(0xF59E0B, 0.30); g_torch.fillCircle(24, 14, 20);
  // Iron sconce wall plate
  g_torch.fillStyle(0x1E293B, 1); g_torch.fillRect(18, 26, 12, 16);
  g_torch.lineStyle(2, 0x475569, 1); g_torch.strokeRect(18, 26, 12, 16);
  // Torch handle bracket
  g_torch.fillStyle(0x78350F, 1); g_torch.fillRect(22, 16, 4, 14);
  g_torch.fillStyle(0x334155, 1); g_torch.fillRect(20, 14, 8, 4);
  // Flame layers
  g_torch.fillStyle(0x991B1B, 1); g_torch.fillTriangle(18, 14, 30, 14, 24, 4);
  g_torch.fillStyle(0xEA580C, 1); g_torch.fillTriangle(20, 14, 28, 14, 24, 7);
  g_torch.fillStyle(0xFACC15, 1); g_torch.fillTriangle(21, 14, 27, 14, 24, 9);
  g_torch.fillStyle(0xFFFFFF, 1); g_torch.fillTriangle(22, 14, 26, 14, 24, 11);
  g_torch.generateTexture('dungeon_torch', 48, 48);
  g_torch.destroy();

  // 5. tile_dungeon_rune (48x48)
  const P_rune = {
    'K': 0x0F172A, 'S': 0x1E293B, 's': 0x334155, 'H': 0x475569, 'D': 0x090D16,
    'R': 0x06B6D4, 'r': 0x38BDF8, 'W': 0xE0F2FE, 'd': 0x0F172A
  };
  const matrix_rune = [
    'HHHHHHHHHKHHHHHH','HSSSSSSSDKSsSSSS','HSSsSRRRRRDSSsSS','HSSsRWWWWWRSSSSS',
    'DDDRWDrrRDWDDDDD','KKKRWDrrRDWKKKKK','HHHRWDrrRDWHHHHH','HSSRWDWWWRDSSSsD',
    'HSSRWDWWWRDSSSSD','HSSsRWWWWWRSSsSD','DDDRWDrrRDWDDDDD','KKKRWDrrRDWKKKKK',
    'HHHRWDrrRDWHHHHH','HSSsRRRRRRDSsSSD','HSSsSSSSSSSsSSSD','DDDDDDDDDDDDDDDD'
  ];
  this.createTexture(scene, 'tile_dungeon_rune', matrix_rune, P_rune, 16, 16, 3);
}
```

---

## 5. Integration Strategies

### 5.1 ArcadeScene Multi-Layer Parallax Integration

To replace the static background in `ArcadeScene.create()`, integrate a 5-layer parallax `TileSprite` stack:

```javascript
// ArcadeScene.create() Multi-Layer Parallax Setup:

// Layer 0: Deep space base tile
this.bgSpace = this.add.tileSprite(0, 0, this.W, this.H, 'tile_space_dark').setOrigin(0).setDepth(-50);

// Layer 1: Celestial Planets (Background decor)
this.bgPlanet1 = this.add.image(this.W * 0.8, 120, 'planet_ringed').setDepth(-40).setAlpha(0.85);
this.bgPlanet2 = this.add.image(this.W * 0.15, this.H * 0.65, 'planet_gas_giant').setDepth(-40).setAlpha(0.75);

// Layer 2: Nebula Clouds (Semi-transparent drifting overlays)
this.bgNebulaPurple = this.add.tileSprite(0, 0, this.W, this.H, 'nebula_purple').setOrigin(0).setDepth(-30).setAlpha(0.45);
this.bgNebulaCyan = this.add.tileSprite(0, 0, this.W, this.H, 'nebula_cyan').setOrigin(0).setDepth(-25).setAlpha(0.35);

// Layer 3: Distant Starfield Layer (Slow vertical scroll)
this.bgStarsFar = this.add.tileSprite(0, 0, this.W, this.H, 'tile_stars_far').setOrigin(0).setDepth(-20);

// Layer 4: Near Starfield & Flare Layer (Fast vertical scroll + alpha pulse)
this.bgStarsNear = this.add.tileSprite(0, 0, this.W, this.H, 'tile_stars_near').setOrigin(0).setDepth(-10);

// Pulsing twinkle tween for near stars
this.tweens.add({
  targets: this.bgStarsNear,
  alpha: { from: 0.6, to: 1.0 },
  duration: 1200,
  yoyo: true,
  repeat: -1
});
```

#### ArcadeScene Parallax Update Loop (`ArcadeScene.update(t, dt)`):

```javascript
// Continuous vertical space scrolling effect:
this.bgSpace.tilePositionY -= 0.2;
this.bgNebulaPurple.tilePositionY -= 0.3;
this.bgNebulaPurple.tilePositionX += 0.1;
this.bgNebulaCyan.tilePositionY -= 0.4;
this.bgStarsFar.tilePositionY -= 0.8;
this.bgStarsNear.tilePositionY -= 1.8;

// Parallax sway relative to player ship velocity:
if (this.ship && this.ship.body) {
  const vx = this.ship.body.velocity.x;
  this.bgStarsNear.tilePositionX += vx * 0.001;
  this.bgStarsFar.tilePositionX += vx * 0.0004;
}
```

---

### 5.2 DungeonScene Tilemap & Environmental Decor Integration

To replace the static flat background in `DungeonScene.create()`, implement procedural floor tile generation, mossy perimeter wall blocks, and torch sconces:

```javascript
// DungeonScene.create() Tilemap & Environment Setup:

const tileSize = 48;
const cols = Math.ceil(this.W / tileSize);
const rows = Math.ceil(this.H / tileSize);

// 1. Procedural Floor Tiling Grid
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const x = c * tileSize + tileSize / 2;
    const y = r * tileSize + tileSize / 2;

    let tileKey = 'tile_dungeon_floor';
    const rand = Math.random();
    
    // 15% Cracked floor tiles, 5% Arcane Rune tiles, 80% Standard stone floor
    if (rand < 0.05) {
      tileKey = 'tile_dungeon_rune';
    } else if (rand < 0.20) {
      tileKey = 'tile_dungeon_cracked';
    }

    const floorTile = this.add.image(x, y, tileKey).setOrigin(0.5).setDepth(0);

    // If rune tile, add magical pulsing glow tween
    if (tileKey === 'tile_dungeon_rune') {
      this.tweens.add({
        targets: floorTile,
        alpha: { from: 0.75, to: 1.0 },
        tint: { from: 0xFFFFFF, to: 0x67E8F9 },
        duration: 1500 + Math.random() * 500,
        yoyo: true,
        repeat: -1
      });
    }
  }
}

// 2. Perimeter Mossy Stone Wall Boundaries
for (let c = 0; c < cols; c++) {
  // Top Wall Boundary
  this.add.image(c * tileSize + tileSize/2, tileSize/2, 'tile_dungeon_wall_moss').setOrigin(0.5).setDepth(2);
  // Bottom Wall Boundary
  this.add.image(c * tileSize + tileSize/2, this.H - tileSize/2, 'tile_dungeon_wall_moss').setOrigin(0.5).setDepth(2);
}
for (let r = 1; r < rows - 1; r++) {
  // Left Wall Boundary
  this.add.image(tileSize/2, r * tileSize + tileSize/2, 'tile_dungeon_wall_moss').setOrigin(0.5).setDepth(2);
  // Right Wall Boundary
  this.add.image(this.W - tileSize/2, r * tileSize + tileSize/2, 'tile_dungeon_wall_moss').setOrigin(0.5).setDepth(2);
}

// 3. Wall Torch Sconces & Dynamic Light Overlay
const torchPositions = [
  { x: tileSize * 2, y: tileSize },
  { x: this.W - tileSize * 2, y: tileSize },
  { x: tileSize * 2, y: this.H - tileSize },
  { x: this.W - tileSize * 2, y: this.H - tileSize }
];

torchPositions.forEach(pos => {
  // Torch Mount Sprite
  const torch = this.add.sprite(pos.x, pos.y, 'dungeon_torch').setOrigin(0.5).setDepth(5);
  
  // Ambient radial warm light overlay
  const lightAura = this.add.circle(pos.x, pos.y, 75, 0xF59E0B, 0.18).setDepth(4).setBlendMode(Phaser.BlendModes.ADD);

  // Flame flickering animation
  this.tweens.add({
    targets: [torch, lightAura],
    scaleX: { from: 0.95, to: 1.08 },
    scaleY: { from: 0.95, to: 1.12 },
    alpha: { from: 0.85, to: 1.0 },
    duration: 250 + Math.random() * 200,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });
});
```

---

## 6. Performance & Memory Considerations

1. **One-Time Texture Baking**: By placing texture generation inside `PixelArtRenderer.generateAllTextures(scene)` with the `scene._pixelArtTexturesBaked` check, all 10+ environment textures are generated once during startup and reused across scenes without duplicate GPU allocations.
2. **Batch Rendering with TileSprites**: Multi-layer background scrolling in `ArcadeScene` uses `TileSprite` instances rather than hundreds of individual star/cloud game objects, eliminating GameObject instantiation and GC overhead.
3. **Filter Mode Configuration**: Ensure `tex.setFilter(Phaser.Textures.FilterMode.NEAREST)` is applied to all generated textures (as done in `PixelArtRenderer.createTexture`) to guarantee sharp pixel art without bilinear blur.

---

## 7. Summary Table of Procedural Assets

| Texture Key | Resolution | Target Scene | Layer/Usage | Visual Characteristics |
|---|---|---|---|---|
| `tile_space_dark` | 48x48 | `ArcadeScene` | Background Tile (Depth -50) | Abyssal black-blue space tile with cosmic dust noise |
| `tile_stars_far` | 48x48 | `ArcadeScene` | Parallax Layer (Depth -20) | Distant dim white/cyan/purple 1x1 starfield |
| `tile_stars_near` | 48x48 | `ArcadeScene` | Parallax Layer (Depth -10) | Bright white/cyan/yellow 4-point flare cross stars |
| `nebula_purple` | 48x48 | `ArcadeScene` | Atmosphere Layer (Depth -30) | Soft magenta/purple semi-transparent cloud plasma |
| `nebula_cyan` | 48x48 | `ArcadeScene` | Atmosphere Layer (Depth -25) | Cyan/teal cosmic plasma wisps |
| `planet_ringed` | 48x48 | `ArcadeScene` | Parallax Decor (Depth -40) | Glowing violet sphere with tilted rose/yellow rings |
| `planet_gas_giant` | 48x48 | `ArcadeScene` | Parallax Decor (Depth -40) | Jupiter-style banded gas giant with Great Red Spot |
| `tile_dungeon_floor` | 48x48 | `DungeonScene` | Floor Tile (Depth 0) | Dark slate stone floor slab with bevels & mortar |
| `tile_dungeon_cracked` | 48x48 | `DungeonScene` | Floor Variant (Depth 0) | Cracked slate floor tile with abyss crack fissure |
| `tile_dungeon_wall_moss` | 48x48 | `DungeonScene` | Wall Boundary (Depth 2) | Stone masonry wall block with creeping emerald moss |
| `dungeon_torch` | 48x48 | `DungeonScene` | Wall Decor (Depth 5) | Iron sconce bracket with 4-color animated flame |
| `tile_dungeon_rune` | 48x48 | `DungeonScene` | Floor Special (Depth 0) | Slate tile with glowing neon cyan Hangeul magic rune |

---
