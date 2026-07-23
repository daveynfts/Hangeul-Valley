# Milestone R3: Animation, Particle Effects & Weather System
## Technical Handoff Report — Day/Night Cycle, Ambient Lighting & Dynamic Shadows Architecture

**Target File**: `C:/VibeCode/Hangeul Valley/game.js`  
**Report Location**: `C:/VibeCode/Hangeul Valley/.agents/orchestrator_graphics/explorer_m3_1/handoff.md`  
**Author**: Explorer Agent (`explorer_m3_1`)  
**Scope**: Read-only graphics architecture analysis & design plan for Phaser 3 Graphics API primitives implementation.  

---

## 1. Observation

Direct examination of `C:/VibeCode/Hangeul Valley/game.js` (7288 lines) reveals the current state of Day/Night cycle, ambient lighting, shadows, and graphic primitive rendering across the 4 primary Phaser scenes: `FarmScene`, `ArcadeScene`, `DungeonScene`, and `FishingScene`.

### 1.1 Existing Day/Night Implementation
* **Location**: `game.js`, lines 3391–3400 in `FarmScene.create()`.
* **Current Code**:
  ```javascript
  // Ambient Day/Night Lighting Overlay (60s cycle between golden warm and dark blue)
  const dayNightOverlay = this.add.rectangle(W/2, H/2, W*2, H*2, 0x0B132B, 0.04).setDepth(999).setScrollFactor(0);
  this.tweens.add({
    targets: dayNightOverlay,
    fillAlpha: 0.30,
    duration: 30000,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });
  ```
* **Analysis**:
  * The current Day/Night system is a single `Phaser.GameObjects.Rectangle` oscillating opacity from `0.04` to `0.30` over 60 seconds with a hardcoded midnight blue color (`0x0B132B`).
  * It lacks distinct time-of-day phases (Dawn, Morning, Noon, Afternoon, Dusk, Evening, Midnight).
  * Color temperature does NOT adjust (no warm amber golden hour, bright daytime sunlight, or reddish-purple dusk).
  * No sun/moon angle vector is calculated to drive environmental light angles or dynamic shadow lengths.

### 1.2 Existing Ambient Lighting & Light Sources
* **Locations**:
  * `FarmScene`: Line 3798–3800 (`vignette = this.add.graphics().setDepth(9980)... fillStyle(0xFF9900, 0.04)`), static orange box. Line 4046 (`this.appleTreeGlow = this.add.graphics()`). Line 3781 (`well sparkles` using `this.add.circle`).
  * `DungeonScene`: Lines 5108–5118 (`this.add.circle(t.x, t.y, 44, 0xF59E0B, 0.20).setDepth(2)`), static translucent circles under wall torches.
  * `FishingScene`: Lines 5512–5515 (`this.add.polygon(...)` with tweened alpha for water sunbeams).
* **Analysis**:
  * Light sources (torches, apple tree glow, lanterns) are rendered as simple semi-transparent colored circles or polygons drawn directly over the background tiles.
  * No canvas/WebGL blend mode pipeline (`Phaser.BlendModes.MULTIPLY` for darkness + `ADD` / `ERASE` / radial gradients for light cutouts) is currently utilized.
  * As a consequence, during nighttime, light sources do not punch out clear glowing halos through the ambient darkness overlay, resulting in a dim, washed-out appearance.

### 1.3 Existing Shadow Implementation
* **Locations**:
  * `FarmScene`: Line 4174 (`this.pShadow = this.add.ellipse(0, 0, 30, 10, 0, 0.3).setDepth(499)`), updated in `update()` at line 4188 (`this.pShadow.setPosition(this.player.x, this.player.y + 18).setDepth(this.player.y - 1)`).
  * Static environment shadows: Line 3777 (Well), Line 3896 (Notice Board), Line 3910 (Arcade Machine), Line 3925 (Wizard), Line 3948 (Cat), Line 3969 (Portal), Line 4001 (Fishing Pier), Line 4024 (Apple Tree).
  * `DungeonScene`: Line 5122 & Line 5173 (`this.pShadow = this.add.ellipse(...)`).
* **Analysis**:
  * Player and object shadows are static horizontal 2D ellipses with fixed dimensions (`30x10` or `40x10`) and fixed offset `(x, y + 18)`.
  * Shadows do NOT rotate, skew, stretch, or shift directionally based on the position of the sun/moon or nearby point lights (e.g. torches).
  * No directional shadow geometry (`fillPoints()` / skewed polygons) exists for tall structures like trees, buildings, or characters during early morning or late evening.

### 1.4 Phaser Game Configuration & Asset Constraints
* **Location**: `game.js`, lines 5835–5843.
* **Code**:
  ```javascript
  const config = {
    type: Phaser.AUTO,
    width: window.innerWidth, height: window.innerHeight,
    backgroundColor: '#3A7015',
    render: { pixelArt: true, antialias: false, antialiasGL: false, roundPixels: true },
    physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
    scene: [FarmScene, ArcadeScene, DungeonScene, FishingScene],
    parent: document.body,
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }
  };
  const game = new Phaser.Game(config);
  ```
* **Analysis**:
  * `type: Phaser.AUTO` enables WebGL rendering when supported (with Canvas 2D fallback).
  * `PixelArtRenderer` class at line 117 establishes the procedural texture generation paradigm using `scene.make.graphics()` and `generateTexture()`.
  * **Zero External Images Constraint**: All lighting maps, light bloom textures, gradient cutouts, and dynamic shadow shapes must be constructed strictly via Phaser 3 Graphics API (`this.add.graphics()`, `this.make.graphics()`, `generateTexture()`, `this.add.renderTexture()`) without any `.png`, `.jpg`, or `.svg` asset references.

---

## 2. Logic Chain

1. **Reasoning from Observation 1.1 (Day/Night Overlay)**:
   * *Step 1*: The current `dayNightOverlay` (line 3392) uses a fixed color `0x0B132B` and alpha tweening. To achieve a realistic Stardew Valley-like lighting feel, time must progress through a 24-hour cycle (e.g., 1 hour in-game = 1 minute real-time, or 24-minute full day).
   * *Step 2*: Interpolating RGB colors across 4 key phases—Dawn (`#FFB74D` warm gold), Day (`#FFFFFF` bright daylight), Dusk (`#C026D3`/`#F97316` violet orange), and Night (`#0F172A` deep navy blue)—via `Phaser.Display.Color.Interpolate` provides smooth, high-fidelity color temperature transitions instead of simple darkness opacity.
   * *Step 3*: Computing a sun angle `sunAngle = (timeOfDayRatio * 2 * Math.PI) - (Math.PI / 2)` allows calculating normalized directional vectors `(sunX, sunY)` used to calculate both sky tinting and shadow projection.

2. **Reasoning from Observation 1.2 (Ambient Lighting & Light Cutouts)**:
   * *Step 1*: Direct alpha rendering of torch circles (lines 5115, 3799) fails to illuminate dark environments. In Phaser 3, setting an ambient darkness container or overlay with `setBlendMode(Phaser.BlendModes.MULTIPLY)` naturally darkens the underlying tilemap and entity sprites.
   * *Step 2*: Creating a glowing light texture using procedural graphics (`make.graphics()`)—a multi-layered radial gradient built of concentric circles transitioning from solid warm yellow/white (`#FFFBEB`, alpha 1.0) to transparent warm amber (`#F59E0B`, alpha 0.0)—allows light objects to be rendered over the dark MULTIPLY overlay using `setBlendMode(Phaser.BlendModes.ADD)` or `Phaser.BlendModes.SCREEN`.
   * *Step 3*: Alternatively, a full-screen `RenderTexture` or `Graphics` layer updated each frame can draw darkness fill and use `ERASE` mode to cut glowing holes around light sources (player lantern, torches, windows, fireflies), producing crisp light apertures.

3. **Reasoning from Observation 1.3 (Dynamic Shadows)**:
   * *Step 1*: Standard 2D static ellipses (lines 4174, 3896) fail to convey time-of-day progression. A 2.5D top-down view requires shadows to stretch long towards the West at Dawn, shrink under the feet at Noon, stretch long towards the East at Dusk, and soften under ambient moonlight at Night.
   * *Step 2*: The shadow projection offset can be calculated from `sunAngle`:
     * `shadowDx = -Math.cos(sunAngle) * maxShadowLength`
     * `shadowDy = Math.sin(sunAngle) * 0.4 * maxShadowLength` (compressed for top-down perspective)
     * `shadowAlpha = Math.max(0.1, Math.sin(sunAngle) * 0.45)`
   * *Step 3*: For characters (Player, NPCs), scaling and slanting a procedural shadow ellipse or rendering a skewed polygon projection via `g.fillPoints()` creates realistic directional shadows. For point light sources (torches in `DungeonScene`), shadows should project outward away from the nearest torch position.

4. **Reasoning from Observation 1.4 (Phaser 3 Graphics & Performance)**:
   * *Step 1*: Recreating complex graphics textures every frame causes garbage collection spikes. Therefore, reusable light radial textures (e.g., `'light_glow_torch'`, `'light_glow_lantern'`) must be pre-baked in `PixelArtRenderer.generateAllTextures(scene)` (line 150).
   * *Step 2*: Screen-space overlays should use `setScrollFactor(0)` to prevent misalignment during camera movement.
   * *Step 3*: Depth layering must strictly follow:
     * Terrain / Tilemaps: Depth `0 - 99`
     * Shadows: Depth `y - 1` (just beneath object feet)
     * Entities / Characters / Trees: Depth `y` (Y-sorting)
     * Light Glow Particles: Depth `y + 10`
     * Dark Ambient Overlay (`MULTIPLY`): Depth `9990`
     * Screen Vignette & UI Overlays: Depth `9995+`

---

## 3. Caveats

1. **BlendMode Rendering Differences across Browsers/Canvas**:
   * `Phaser.BlendModes.MULTIPLY` requires WebGL rendering context for pixel-perfect performance. On low-end systems where `Phaser.AUTO` falls back to 2D Canvas context, `MULTIPLY` falls back to standard alpha composite modes (`globalCompositeOperation = 'multiply'`). The design must include fallback alpha adjustment if WebGL is unavailable (`this.sys.game.device.os`).
2. **Viewport Resizing & Camera Zoom**:
   * When `scale: Phaser.Scale.RESIZE` triggers (line 5841), full-screen graphics overlays (`dayNightOverlay`, ambient darkness mask) must be resized via a scene `resize` event handler (`this.scale.on('resize', ...)`), ensuring no unlit borders appear when resizing the window.
3. **Indoor / Dungeon Scene Exceptions**:
   * `DungeonScene` is an underground indoor environment and should NOT be subject to the exterior Day/Night sky cycle. It requires a permanent indoor dark ambient overlay (`0x090D16`, alpha `0.75`) driven strictly by torch point-lights.
   * `ArcadeScene` is set in outer space with parallax stars; it should use a cosmic nebula glow effect rather than a terrestrial Day/Night cycle.

---

## 4. Conclusion & Architecture Plan

### 4.1 System Architecture Overview

Implement three modular, reusable system classes in `game.js` before the scene declarations (near line 3360):

```
┌────────────────────────────────────────────────────────────────────────┐
│                          DAY/NIGHT SYSTEM                              │
│  - Tracks in-game time (00:00 - 23:59)                                  │
│  - Computes sunAngle & color matrix (Dawn/Day/Dusk/Night)              │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌──────────────────────────────────────┐ ┌───────────────────────────────┐
│       AMBIENT LIGHTING SYSTEM        │ │    DYNAMIC SHADOW SYSTEM      │
│ - Fullscreen MULTIPLY Darkness Mask  │ │ - Directional Sun Shadows     │
│ - Pre-baked Radial Light Textures    │ │ - Local Torch Point Shadows   │
│ - Light Cutouts (Player, Torches)    │ │ - Dynamic Skewing & Scaling   │
└──────────────────────────────────────┘ └───────────────────────────────┘
```

---

### 4.2 Module 1 Design: `DayNightSystem` Class

* **Responsibilities**:
  * Manages time progression (default: 240 seconds per full 24-hour in-game day cycle).
  * Provides getters: `getTimeString()`, `getSunAngle()`, `getCurrentPhase()`, `getAmbientColor()`.
  * Computes smooth color matrix transitions between 4 keyframe points:
    1. **Dawn (05:00 - 08:00)**: `#FFB74D` (Warm Amber), darkness alpha `0.15`
    2. **Day (08:00 - 17:00)**: `#FFFFFF` (Bright daylight), darkness alpha `0.00`
    3. **Dusk (17:00 - 20:00)**: `#C026D3` / `#F97316` (Deep Violet Orange), darkness alpha `0.25`
    4. **Night (20:00 - 05:00)**: `#0F172A` (Deep Indigo Navy), darkness alpha `0.65`

* **Proposed Implementation Blueprint**:
  ```javascript
  class DayNightSystem {
    constructor(scene, cycleDurationSec = 240) {
      this.scene = scene;
      this.cycleDuration = cycleDurationSec * 1000;
      this.timeMs = 60000; // Start at 06:00 AM (Dawn)
      
      // Full-screen ambient tint graphic
      this.ambientOverlay = scene.add.graphics()
        .setDepth(9990)
        .setScrollFactor(0);
        
      this.phases = [
        { hour: 5,  color: 0xFDBA74, alpha: 0.20 }, // Dawn
        { hour: 8,  color: 0xFFFFFF, alpha: 0.00 }, // Day
        { hour: 17, color: 0xF97316, alpha: 0.20 }, // Sunset
        { hour: 19, color: 0x7C3AED, alpha: 0.40 }, // Dusk
        { hour: 21, color: 0x0F172A, alpha: 0.65 }, // Night
        { hour: 4,  color: 0x1E1B4B, alpha: 0.50 }  // Late Night
      ];
    }

    update(dt) {
      this.timeMs = (this.timeMs + dt) % (24 * 60 * 1000);
      const currentHour = (this.timeMs / (60 * 1000)) % 24;
      const sunAngle = ((currentHour - 6) / 24) * Math.PI * 2;
      
      const state = this._interpolateLighting(currentHour);
      
      this.ambientOverlay.clear();
      if (state.alpha > 0.01) {
        this.ambientOverlay.fillStyle(state.color, state.alpha);
        this.ambientOverlay.fillRect(0, 0, this.scene.scale.width, this.scene.scale.height);
      }
      
      return { hour: currentHour, sunAngle, state };
    }

    _interpolateLighting(hour) {
      // Find bounding keyframes and perform Phaser.Display.Color.Interpolate
      // Returns { color: hexValue, alpha: interpolatedAlpha }
    }
  }
  ```

---

### 4.3 Module 2 Design: `AmbientLightingSystem` Class

* **Responsibilities**:
  * Pre-bakes radial light textures in `PixelArtRenderer`:
    * `'light_glow_torch'` (Radius 96px: `#FFE082` center -> `#F59E0B` middle -> transparent edge).
    * `'light_glow_lantern'` (Radius 64px: `#FFFFFF` center -> `#38BDF8` cyan tint -> transparent edge).
    * `'light_glow_window'` (Rectangular gradient bloom for building windows).
  * Manages active light sources: Player lantern, torches, apple tree glow, windows, fireflies.
  * Applies `Phaser.BlendModes.ADD` / `SCREEN` for light sprites, or utilizes a `RenderTexture` darkness cutout layer.

* **Pre-baking Light Textures Blueprint** (add to `PixelArtRenderer` near line 162):
  ```javascript
  static generateLightingTextures(scene) {
    if (scene.textures.exists('light_glow_soft')) return;
    
    // Bake soft radial light bloom (128x128)
    const g = scene.make.graphics({ add: false });
    const rad = 64;
    for (let r = rad; r > 0; r -= 2) {
      const alpha = Math.pow(1 - (r / rad), 2) * 0.8;
      g.fillStyle(0xFFFB7D, alpha);
      g.fillCircle(rad, rad, r);
    }
    g.generateTexture('light_glow_soft', rad * 2, rad * 2);
    g.destroy();
  }
  ```

---

### 4.4 Module 3 Design: `DynamicShadowSystem` Class

* **Responsibilities**:
  * Upgrades static ellipses to dynamic directional shadows driven by `DayNightSystem.getSunAngle()`.
  * Projects shadows away from light source direction for `FarmScene` (Sun/Moon) and `DungeonScene` (nearest torch).
  * Renders skewed polygon shadows for tall structures (Trees, Notice Board, Fences).

* **Dynamic Shadow Calculation Formula**:
  ```javascript
  updateShadow(shadowSprite, parentX, parentY, sunAngle, baseWidth = 30, baseHeight = 10) {
    // Determine shadow offset based on sun position
    const shadowLength = Math.max(0.4, Math.abs(Math.cos(sunAngle))) * 28;
    const dx = -Math.cos(sunAngle) * shadowLength;
    const dy = 16 + Math.sin(sunAngle) * 6; // Ground perspective offset
    
    // Stretch and rotate shadow ellipse
    shadowSprite.setPosition(parentX + dx, parentY + dy);
    shadowSprite.setScale(1 + Math.abs(dx)/20, 1);
    shadowSprite.setAlpha(Math.min(0.45, Math.max(0.15, Math.sin(sunAngle))));
  }
  ```

---

### 4.5 Scene Integration Plan & Target Line Numbers

| Target Scene | Integration File Location | Required Changes |
| :--- | :--- | :--- |
| **Global Setup** | `game.js`, near line 160 (`PixelArtRenderer`) | Add `generateLightingTextures(scene)` to pre-bake `'light_glow_soft'` and `'light_glow_torch'` textures. |
| **System Classes** | `game.js`, lines 3360–3368 (before `FarmScene`) | Declare `DayNightSystem`, `AmbientLightingSystem`, and `DynamicShadowSystem` helper classes. |
| **`FarmScene.create`** | `game.js`, lines 3381–3400 | Replace existing static `dayNightOverlay` tween with `this.dayNight = new DayNightSystem(this); this.lighting = new AmbientLightingSystem(this); this.shadows = new DynamicShadowSystem(this);`. |
| **`FarmScene.update`** | `game.js`, lines 4185–4220 | Call `const env = this.dayNight.update(dt);` and update player/NPC shadows with `this.shadows.updateShadow(...)`. |
| **`DungeonScene.create`**| `game.js`, lines 5085–5118 | Instantiate indoor darkness layer (`0x090D16`, alpha `0.70`). Attach `'light_glow_torch'` sprites with `setBlendMode(Phaser.BlendModes.ADD)` to torch positions. |
| **`DungeonScene.update`**| `game.js`, lines 5171–5185 | Update player shadow orientation based on nearest torch position. |
| **`FishingScene.create`**| `game.js`, lines 5479–5515 | Bind sea caustics polygon color tint to `DayNightSystem` sky temperature (warm gold at dawn, deep cyan at noon, purple at dusk). |

---

## 5. Verification Method

To independently verify the implementation after code integration:

1. **Syntax Integrity Verification**:
   Execute the Node.js syntax checker on `game.js`:
   ```bash
   node -c "C:/VibeCode/Hangeul Valley/game.js"
   ```
   *Expected Output*: Exit code `0` (Zero syntax errors).

2. **Automated Test Suite Verification**:
   Run the project system tests to verify no regressions in gameplay/economy systems:
   ```bash
   node "C:/VibeCode/Hangeul Valley/test_r3_r4_systems.js"
   ```
   *Expected Output*: `=== ALL R3 & R4 VERIFICATION TESTS PASSED SUCCESSFULLY! ===`

3. **Zero External Assets Inspection**:
   Execute a search script to confirm no image assets were added:
   ```bash
   python -c "with open(r'C:\VibeCode\Hangeul Valley\game.js', encoding='utf-8') as f: text = f.read(); print('Image asset loads found:', [line for line in text.split('\n') if '.png' in line or '.jpg' in line])"
   ```
   *Expected Output*: `Image asset loads found: []`

4. **Visual & Console Verification Procedure**:
   * Open the game in browser via `run.bat` or standard web server.
   * Open Developer Tools Console and manually cycle time-of-day phases:
     ```javascript
     // Force fast-forward time to test transitions
     sceneRef.dayNight.timeMs = 6 * 3600 * 1000;  // Test Dawn (06:00)
     sceneRef.dayNight.timeMs = 12 * 3600 * 1000; // Test Noon (12:00)
     sceneRef.dayNight.timeMs = 18 * 3600 * 1000; // Test Dusk (18:00)
     sceneRef.dayNight.timeMs = 23 * 3600 * 1000; // Test Night (23:00)
     ```
   * *Invalidation Conditions*:
     * Any visual artifact where darkness layer blocks HTML UI overlays.
     * Player shadow disconnecting from player sprite feet.
     * Unhandled texture key errors in console.
