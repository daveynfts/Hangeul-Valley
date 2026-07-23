# Milestone R4 Investigation Report & Fix Strategy

## Executive Summary
This report analyzes `game.js` and `index.html` for **Milestone R4: Visual Polish & Consistency**. The analysis focuses on three core pillars:
1. **Stardew Valley color palette tuning** (unification of warm earthy tones vs. current saturated RGB presets).
2. **Pixel-perfect crisp rendering settings** (anti-aliasing off, nearest filtering on generated textures, canvas CSS image-rendering, camera pixel rounding).
3. **Dynamic Y-Sort depth sorting** for all characters, NPCs, crops, trees, monsters, and interactive structures across scenes.

All findings are documented below with direct code evidence, logical analysis, caveats, conclusion, and an explicit verification protocol. **No code implementation was performed.**

---

## 1. Observation

### 1.1 Color Palette & Aesthetic Tone Observations
- **Player Palette (`game.js`, lines 767-773, 4058-4071)**:
  - In `PixelArtRenderer._genPlayerTextures`: `P = { 'T': 0xF59E0B, 'R': 0xEF4444, 'Z': 0x3B82F6, 'z': 0x1D4ED8, 'Q': 0x1E40AF, 'q': 0x1E3A8A }`.
  - Overalls use electric Tailwind blue-500 (`#3B82F6`) and blue-600 (`#1D4ED8`). Shirt ribbon uses glaring red-500 (`#EF4444`). Rosy cheeks use bright pink (`#F472B6`).
- **Terrain & Tilemap Colors (`game.js`, lines 192-212, 381-396, 723-763)**:
  - Base Grass: `0x22C55E` (Tailwind green-500, saturated lime green), `0x15803D` (green-700), `0x4ADE80` (green-400).
  - Beach Sand: `0xFDE047` (glaring bright yellow), `0xF59E0B` (amber-500), `0xFEF08A` (yellow-200). Wet sand pools: `0x38BDF8` (neon cyan).
  - Ocean Water: `0x0284C7` (sky-600), `0x38BDF8` (sky-400), `0x67E8F9` (cyan-300).
  - Flowers: `0xEF4444` (neon red), `0xFDE047` (neon yellow), `0xF97316` (neon orange).
- **Crops Matrix Palette (`game.js`, lines 4085-4090)**:
  - `CC = [ [0xFF88B4, 0xAA1844, 0xFFCCE4], [0x88EE44, 0x448A22, 0xCCFF99], [0xFF4444, 0xAA1111, 0xFF9999], [0xFFCC00, 0xCC8800, 0xFFEE99], [0xFFEE44, 0xCCAA00, 0xFFFF99] ]`.
  - Crop textures use hot pink, electric lime, bright primary red, and pure yellow.
- **Dungeon & NPC Palettes (`game.js`, lines 4018-4050, 4115-4151, 5589-5603)**:
  - Wizard NPC: `0x5B21B6`, `0x7C3AED` (electric neon purple).
  - Dungeon Runes / Portals: `0xA855F7`, `0xEC4899` (hot neon pink/purple).

### 1.2 Crisp Pixel-Art Rendering Settings Observations
- **Phaser Engine Config (`game.js`, lines 6398-6408)**:
  ```js
  const config={
    type:Phaser.AUTO,
    width:window.innerWidth, height:window.innerHeight,
    backgroundColor:'#3A7015',
    render:{pixelArt:true, antialias:false, antialiasGL:false, roundPixels:true},
    physics:{default:'arcade',arcade:{gravity:{y:0},debug:false}},
    scene:[FarmScene, ArcadeScene, DungeonScene, FishingScene],
    parent:document.body,
    scale:{mode:Phaser.Scale.RESIZE, autoCenter:Phaser.Scale.CENTER_BOTH},
  };
  ```
  - `pixelArt: true`, `antialias: false`, and `roundPixels: true` are configured at the global engine level.
  - **Camera Rounding Gap**: None of the scenes (`FarmScene.create()`, `DungeonScene.create()`, `FishingScene.create()`, `ArcadeScene.create()`) call `this.cameras.main.setRoundPixels(true)`. Sub-pixel camera offsets during motion can cause subtle sub-pixel jitter or edge blurring.
  - **Procedural Texture Filter Gap (`game.js`, lines 3861-4151)**:
    - Textures generated via `PixelArtRenderer.createTexture()` call `tex.setFilter(Phaser.Textures.FilterMode.NEAREST)`.
    - However, textures generated inside `FarmScene._bakeTextures()` (such as `apple_tree`, `apple_tree_ripe`, `grs0`..`grs3`, `drt_dry`, `drt_wet`, `stone_well`, `pixel_barrel`, `pixel_crate`, `signpost`, `tree`, `fnc_post`, `fnc_rail`, `coin`, `shop_sign`, `notice_board`, `dungeon_portal`, `fishing_dock`, `arcade_machine`, `wizard_npc`, `farmer0`..`farmer3`, `cr_0_1`..`cr_4_3`, `cat_npc`) use `g.generateTexture(...)` directly WITHOUT calling `setFilter(NEAREST)`.
- **Canvas CSS In `index.html`**:
  - `index.html` contains no `canvas` styling rules enforcing `image-rendering: pixelated`, `image-rendering: crisp-edges`, or `-webkit-optimize-contrast`. On high-DPI displays (Retina/4K), browsers apply bilinear interpolation when scaling canvas elements.

### 1.3 Depth Sorting (Y-Sort) Observations
- **FarmScene (`game.js`, lines 4663, 4319-4466, 4928)**:
  - In `FarmScene.update()` (line 4663): `this.player.setDepth(this.player.y);`. Only the player's depth is updated per frame.
  - Static Depth Assignments:
    - `this.shopNPC`: statically set to `sy` in `_createShopNPC` (line 4319).
    - `this.boardSprite`: statically set to `by` in `_createBoardNPC` (line 4336).
    - `this.arcadeSprite`: statically set to `ay` in `_createArcadeNPC` (line 4350).
    - `this.wizardSprite`: statically set to `wy` in `_createWizardNPC` (line 4366).
    - `this.catSprite`: statically set to `cy` in `_createCatNPC` (line 4390).
    - `this.portalSprite`: statically set to `py` in `_createPortalNPC` (line 4409).
    - `this.dockSprite`: statically set to `fy` in `_createFishingSpot` (line 4441).
    - `this.appleTreeSprite`: statically set to `ay+1` in `_createAppleTree` (line 4466).
    - Crop plants (`plot.plant`): statically set to `plot.y + 5` on creation (line 4928).
  - **Flicker Bug on Tweened Sprites**: `catSprite`, `wizardSprite`, `shopNPC`, and `appleTreeSprite` bob up and down using Phaser Tweens (e.g. `y: cy - 3`, `y: wy - 4`). When player `y` is close to NPC `y`, the animated `y` causes the NPC's depth to fluctuate, resulting in z-fighting flicker against the player.
- **DungeonScene (`game.js`, lines 5648, 5693, 5817, 5866, 5907)**:
  - In `DungeonScene.update()` (lines 5693-5756), NO dynamic depth sorting is performed at all.
  - `this.player`: created without explicit depth (defaults to 0).
  - Monsters (`this.monsters`): created with static `.setDepth(10)` or `.setDepth(30)`.
  - Loot items (`this.lootGroup`): created with static `.setDepth(15)`.
  - **Visual Flaw**: When the player is south of a Goblin or Slime (`player.y > monster.y`), the monster's fixed depth (10 or 30) draws the monster OVER the player's head, violating 2.5D perspective.
- **FishingScene (`game.js`, lines 6085, 6090)**:
  - Player is statically set to `.setDepth(10)`. Dock is set to `.setDepth(2)`. No Y-sorting is performed during fishing.

---

## 2. Logic Chain

1. **Palette Harmony Reasoning**:
   - *Observation*: Grass is `#22C55E`, sand is `#FDE047`, water is `#38BDF8`, crop pink is `#FF88B4`. These are pure, unadjusted digital primary/secondary colors.
   - *Deduction*: Stardew Valley's visual identity relies on warm, cohesive earthy tones with muted saturation, warm yellow-green undertones for foliage, warm unbleached straw for wood, and deep teal-blue for water.
   - *Conclusion*: All procedural texture generators must be updated to reference a unified `STARDEW_PALETTE` color dictionary.

2. **Crisp Rendering Reasoning**:
   - *Observation*: `config.render.pixelArt` is true, but `FarmScene._bakeTextures()` directly calls `g.generateTexture()` without setting `FilterMode.NEAREST` on the resulting texture instances, and `index.html` lacks `canvas` `image-rendering` CSS rules.
   - *Deduction*: Without `NEAREST` filter forced on all generated textures and canvas CSS crisp-edges rules, browser compositor scaling and WebGL texture binding can apply linear interpolation.
   - *Conclusion*: Every `generateTexture` call must set nearest filtering, main camera pixel rounding must be enabled in `create()`, and CSS pixelated rules must be added to `index.html`.

3. **Y-Sort Depth Sorting Reasoning**:
   - *Observation*: In `FarmScene.update()`, only `player.y` is updated dynamically while NPCs have fixed depth or tweened `y`. In `DungeonScene.update()`, no Y-sorting occurs, causing monsters at fixed depth 10/30 to overlap players walking south of them.
   - *Deduction*: In a 2.5D top-down game, depth must equal ground-footprint Y coordinate (`baseY`). For bobbing/tweened sprites, depth must anchor to the static base Y (`anchorY`), not the animated vertical position.
   - *Conclusion*: A standardized Y-sort routine must update player, monsters, NPCs, crops, trees, and loot items every frame based on their ground-level base Y coordinate.

---

## 3. Caveats

- **No Code Implementation**: In accordance with instructions, no source code changes have been applied to `game.js` or `index.html`.
- **ArcadeScene Scope**: `ArcadeScene` is a 2D top-down space shooter with fixed layer depths (Background depth 0..4, Boss depth 15, Player Ship depth 20, UI depth 100). Ground-plane Y-sorting does not apply to `ArcadeScene`.
- **Performance Budget**: Dynamically updating `.setDepth()` in `update()` for 20-50 active sprites per frame is fast in Phaser 3 (O(N) property set, O(N log N) render list sort). It adds < 0.1ms per frame on desktop/mobile browsers.

---

## 4. Conclusion & Fix Strategy

### 4.1 Color Palette Tuning Fix Strategy (Stardew Valley Earthy Tone Palette)
Define a global `STARDEW_PALETTE` object in `game.js` and refactor all procedural texture functions to use these warm, organic color values:

```javascript
const STARDEW_PALETTE = {
  // Grass & Nature
  grassBase: 0x4A7C59,      // Warm forest green (was 0x22C55E)
  grassShadow: 0x2D4E35,    // Deep shade green (was 0x15803D)
  grassHighlight: 0x6B9E77, // Soft spring green (was 0x4ADE80)
  flowerRed: 0xD85858,      // Muted rose red (was 0xEF4444)
  flowerYellow: 0xE8B84B,   // Warm buttercup (was 0xFDE047)
  flowerPurple: 0x9B70C8,   // Soft lavender (was 0xA855F7)

  // Soil & Paths
  dirtDry: 0x7E5436,        // Warm rich earth (was 0x78350F)
  dirtWet: 0x4E311B,        // Moist dark loam (was 0x451A03)
  pathStone: 0x7D7571,      // Weathered cobble (was 0x57534E)
  pathMortar: 0x4A4440,     // Dark mortar (was 0x334155)

  // Wood & Fences
  woodBase: 0x8F5428,       // Warm cedar brown (was 0x8B4513)
  woodHighlight: 0xB3713D,  // Warm oak highlight (was 0xD2691E)
  woodShadow: 0x573012,     // Deep timber shadow (was 0x451A03)

  // Water & Beach
  oceanDeep: 0x1E506B,      // Deep teal ocean (was 0x0284C7)
  oceanShimmer: 0x3D7898,   // Subtle wave shimmer (was 0x38BDF8)
  oceanFoam: 0x96C5D4,      // Desaturated seafoam (was 0x67E8F9)
  sandBase: 0xEAD08B,       // Warm golden beach sand (was 0xFDE047)
  sandShadow: 0xCBA65B,     // Warm dune shadow (was 0xF59E0B)

  // Player Outfit
  overallsBase: 0x3B4D7A,   // Muted indigo denim (was 0x3B82F6)
  overallsDark: 0x263354,   // Dark indigo shadow (was 0x1D4ED8)
  strawHat: 0xD4AA63,       // Unbleached straw (was 0xF59E0B)
  hatRibbon: 0x9E3B2D,      // Muted terracotta red (was 0xEF4444)
  boots: 0x59381E,          // Leather brown (was 0x78350F)

  // Dungeon & Stone
  dungeonWall: 0x2C363F,    // Deep mossy slate (was 0x334155)
  dungeonFloor: 0x1E242B,   // Dark stone tile (was 0x1E293B)
  torchAmber: 0xE68A2E,     // Cozy firelight amber (was 0xF59E0B)
};
```

### 4.2 Pixel-Perfect Crisp Rendering Fix Strategy
1. **HTML Canvas CSS (`index.html`)**:
   Add crisp pixel rendering CSS to `index.html`:
   ```css
   canvas {
     image-rendering: -webkit-optimize-contrast;
     image-rendering: crisp-edges;
     image-rendering: pixelated;
     -ms-interpolation-mode: nearest-neighbor;
   }
   ```
2. **Camera & Texture Filtering (`game.js`)**:
   - In `FarmScene`, `DungeonScene`, `FishingScene`, `ArcadeScene` `create()` methods, add:
     `this.cameras.main.setRoundPixels(true);`
   - In `FarmScene._bakeTextures()`, create a helper `makeNearestTexture(graphics, key, width, height)`:
     ```javascript
     const makeNearestTexture = (g, key, w, h) => {
       if (this.textures.exists(key)) this.textures.remove(key);
       g.generateTexture(key, w, h);
       g.destroy();
       const tex = this.textures.get(key);
       if (tex) tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
     };
     ```
     Wrap all procedural texture generations using `makeNearestTexture` to guarantee nearest-neighbor filtering across all WebGL texture units.

### 4.3 Y-Sort Depth Sorting Fix Strategy
1. **FarmScene Y-Sort Implementation**:
   In `FarmScene.update(_t, dt)`:
   ```javascript
   // Player feet base Y
   const playerBaseY = this.player.y + (this.player.displayHeight * (1 - this.player.originY));
   this.player.setDepth(playerBaseY);

   // Static/Tweened NPCs (use un-animated base Y anchor to prevent tween flickering)
   if (this.shopNPC) this.shopNPC.setDepth(this.shopY);
   if (this.boardSprite) this.boardSprite.setDepth(this.boardY);
   if (this.arcadeSprite) this.arcadeSprite.setDepth(this.arcadeY);
   if (this.wizardSprite) this.wizardSprite.setDepth(this.wizardY);
   if (this.catSprite) this.catSprite.setDepth(this.catY);
   if (this.portalSprite) this.portalSprite.setDepth(this.portalY);
   if (this.dockSprite) this.dockSprite.setDepth(this.fishY);
   if (this.appleTreeSprite) this.appleTreeSprite.setDepth(this.appleY);

   // Plot Crops (base Y = plot.y + 10)
   this.plots.forEach(p => {
     if (p.plant && p.plant.active) {
       p.plant.setDepth(p.y + 10);
     }
   });
   ```
2. **DungeonScene Y-Sort Implementation**:
   In `DungeonScene.update(_t, dt)`:
   ```javascript
   // Dynamic Y-sort for player
   const playerBaseY = this.player.y + (this.player.displayHeight * (1 - this.player.originY));
   this.player.setDepth(playerBaseY);
   if (this.pShadow) this.pShadow.setDepth(playerBaseY - 1);

   // Dynamic Y-sort for monsters
   this.monsters.children.entries.forEach(m => {
     if (m && m.active) {
       const mBaseY = m.y + (m.displayHeight * (1 - m.originY));
       m.setDepth(mBaseY);
     }
   });

   // Dynamic Y-sort for loot drops
   this.lootGroup.children.entries.forEach(l => {
     if (l && l.active) {
       l.setDepth(l.y + 8);
       if (l.sparkle) l.sparkle.setDepth(l.y + 9);
     }
   });
   ```

---

## 5. Verification Method

### 5.1 Verification Commands
- Execute syntax and runtime integrity check:
  `node -c game.js`
- Run existing R3/R4 systems test suite:
  `node test_r3_r4_systems.js`

### 5.2 Manual / Visual Inspection Steps
1. **Palette Verification**: Open `index.html` in browser. Verify grass, sand, water, player outfit, and crops display warm Stardew Valley earthy tones without harsh neon green/yellow highlights.
2. **Pixel Crispness Verification**: Zoom browser in to 200% / 300%. Inspect sprite edges on canvas. Verify pixel edges remain sharp and crisp with zero bilinear blur.
3. **Y-Sort Verification**:
   - In `FarmScene`, walk player north and south of `catSprite` (Muop), `wizardSprite` (Merlin), `appleTreeSprite`, and grown crop plots. Verify player correctly renders behind objects when north, and in front when south.
   - In `DungeonScene`, spawn monsters. Walk player north and south of Slimes / Goblins. Verify depth sorting correctly renders player behind/in front based on Y position.

### 5.3 Invalidation Conditions
- Invalidation occurs if `node -c game.js` fails with syntax errors.
- Invalidation occurs if canvas pixels blur when zoomed.
- Invalidation occurs if player renders behind an NPC/Monster when standing south of it (`player.y > npc.y`).
