# Comprehensive Analysis Report: Player Mechanics & Systems in `game.js`

**Milestone**: Milestone 1 — Main Character Redesign  
**Agent**: Explorer 2 (`teamwork_preview_explorer_m1_2`)  
**Date**: 2026-07-24  
**Target File**: `d:\Hangeul Valley\game.js`  

---

## Executive Summary
This report provides a line-by-line architectural breakdown of the player character mechanics in `game.js`. It details player instantiation, physics body sizing, hitboxes, scale configurations, shadow rendering systems, depth sorting logic, movement dynamics, and scene-by-scene variations across `FarmScene`, `DungeonScene`, `ArcadeScene`, and `FishingScene`. Recommendations are provided to guide the upcoming sprite matrix update, ensuring hitbox precision, shadow alignment, scale harmony, and enhanced movement juice.

---

## 1. Player Sprite Matrix & Texture Generation

- **Class**: `PixelArtRenderer` (`game.js`, lines 214–266, 1320–1828)
- **Matrix Resolution**: 16 rows × 16 columns per frame.
- **Pixel Scale (`ps`)**: `3` (each matrix pixel renders as a 3×3 rectangle on canvas).
- **Generated Frame Dimensions**: `16 * 3 = 48x48 pixels`.
- **Texture Filter Mode**: `Phaser.Textures.FilterMode.NEAREST` (crisp pixel rendering).
- **Player Texture Keys & Animations**:
  - `player_walk_down_0`, `_1`, `_2` → Animation: `'player-walk-down'` (8 fps, loop)
  - `player_walk_up_0`, `_1`, `_2` → Animation: `'player-walk-up'` (8 fps, loop)
  - `player_walk_left_0`, `_1`, `_2` → Animation: `'player-walk-left'` (8 fps, loop)
  - `player_walk_right_0`, `_1`, `_2` → Animation: `'player-walk-right'` (8 fps, loop)
  - Action animations: `'player-water'`, `'player-harvest'`, `'player-pick'` (6 fps, single-play)
  - Standalone tool sprites: `tool_watering_can`, `tool_basket`, `tool_sickle` (48×48 px)

---

## 2. Scene-by-Scene Player Systems Mapping

### 2.1. `FarmScene` (Primary Overworld Scene)

- **Player Instantiation & Scale**:
  - `game.js:8477-8479`:
    ```javascript
    this.player = this.physics.add.sprite(W/2, H-80, 'player_walk_down_0')
      .setScale(1.8)
      .setCollideWorldBounds(true).setDrag(900,900).setDepth(500);
    ```
  - Base texture: 48×48 px. Display size with scale 1.8: **86.4 × 86.4 px**.
  - Default origin: `(0.5, 0.5)`.

- **Physics Body & Hitbox**:
  - `game.js:8480`:
    ```javascript
    this.player.body.setSize(24, 16).setOffset(12, 32);
    ```
  - Hitbox width: 24 px, height: 16 px.
  - Offset: (12, 32) relative to unscaled texture (48×48 px).
  - Target area: Positioned at the feet of the player model to allow the upper body to overlap behind trees, fences, and buildings naturally.

- **Shadow System**:
  - `game.js:8482`:
    ```javascript
    this.pShadow = this.shadows.createShadow(this.player, 58, 18, 32);
    ```
  - Managed by `DynamicShadowSystem` (`game.js:6889-6992`).
  - Base shadow ellipse size: `baseW = 58`, `baseH = 18`, `offsetY = 32`.
  - Shadow depth: `groundDepth = Math.max(0, targetY - 1)`.
  - Directional shadow stretching updated dynamically per frame based on solar altitude and hour from `DayNightSystem`.
  - Fallback if `shadows` unavailable (`game.js:8484`): Static ellipse `(58, 18)` with depth `499`.

- **Depth Sorting**:
  - `game.js:8501-8502`:
    ```javascript
    const playerBaseY = this.player.y + (this.player.displayHeight * (1 - this.player.originY));
    this.player.setDepth(playerBaseY);
    ```
  - Formula computes foot Y baseline: `y + displayHeight * 0.5`.
  - Evaluated every frame in `update()`. Sorted dynamically against environment objects (shop NPC, notice board, arcade machine, wizard NPC, cat NPC, portal, dock, apple tree, and crops).

- **Movement, Velocity & Direction Handling**:
  - Speed constant: `PLAYER_SPD = 210` (`game.js:3837`).
  - `game.js:8536-8537`:
    ```javascript
    const len = Math.sqrt(vx*vx + vy*vy) || 1;
    this.player.setVelocity((vx/len)*PLAYER_SPD, (vy/len)*PLAYER_SPD);
    ```
  - Diagonal movement is normalized (no speed boost moving diagonally).
  - Drag: `setDrag(900, 900)` ensures snappy stop when movement keys are released.
  - Horizontal flipping & scaling (`game.js:8542-8547`):
    ```javascript
    if (Math.abs(vx) >= Math.abs(vy)) {
      animKey = vx < 0 ? 'player-walk-left' : 'player-walk-right';
      this.player.setScale(vx < 0 ? -1.8 : 1.8, 1.8);
    } else {
      animKey = vy < 0 ? 'player-walk-up' : 'player-walk-down';
      this.player.setScale(1.8, 1.8);
    }
    this.player.setFlipX(false);
    ```
    *Note*: Negative scale `-1.8` is used for leftward facing while `setFlipX(false)` is explicitly invoked.

- **Walking FX & Stepping Dynamics**:
  - `game.js:8550-8567`: Walk frame timer triggers every 160 ms (`walkTimer > 160`).
  - On step frames (`walkFrame === 1` or `3`), spawns a dust puff (`p_dust` texture or semi-transparent ellipse) at `(this.player.x + dx, this.player.y + 14)` with a floating/fading tween over 400 ms.

- **Collisions**:
  - Collides with world bounds.
  - Static collider with Apple Tree trunk zone (`game.js:8167`): `trunkZone` static body (100×48 px).

---

### 2.2. `DungeonScene` (Action Battle Scene)

- **Player Instantiation & Scale**:
  - `game.js:9559`:
    ```javascript
    this.player = this.add.sprite(this.W/2, this.H/2, 'player_walk_down_0').setOrigin(0.5);
    ```
  - Scale: **1.0** (unscaled, display size = 48×48 px).
  - Physics body added via `this.physics.add.existing(this.player)`.

- **Physics Body & Hitbox**:
  - `game.js:9563`:
    ```javascript
    this.player.body.setSize(30, 30);
    ```
  - Offset: Default (0, 0) centered offset.
  - Box dimensions: 30×30 px centered on sprite.

- **Shadow System**:
  - `game.js:9560`:
    ```javascript
    this.pShadow = this.shadows.createShadow(this.player, 30, 10, 15);
    ```
  - Shadow base size: `baseW = 30`, `baseH = 10`, `offsetY = 15`.
  - Updated using point light shadow logic (`updatePointShadow`) calculated relative to the closest torch light (`this.torchLights`).

- **Depth Sorting**:
  - `game.js:9608-9610`:
    ```javascript
    const playerBaseY = this.player.y + (this.player.displayHeight * (1 - this.player.originY));
    this.player.setDepth(playerBaseY);
    if (this.pShadow) this.pShadow.setDepth(playerBaseY - 1);
    ```
  - Monsters and loot drops are also dynamically depth-sorted relative to their bottom base Y.

- **Movement & Velocity**:
  - Speed: `280` px/s (`game.js:9626`).
  - `game.js:9632`:
    ```javascript
    this.player.body.setVelocity(vx, vy);
    ```
  - **No diagonal normalization**: Moving diagonally results in `sqrt(280^2 + 280^2) ≈ 396 px/s`.
  - Plays `'player-walk-left'` / `'right'` animations on scale 1.0 without scale mirroring.

- **Collisions & Overlaps**:
  - Collides with world bounds.
  - Overlaps: Monsters (`hitPlayer`), Loot (`collectLoot`), Dungeon Exit Portal (`48x48 px`).

---

### 2.3. `ArcadeScene` (Space Shooter Minigame)

- **Player Instantiation**:
  - Player character is rendered as a spaceship: `this.ship = this.add.sprite(this.W/2, this.H - 80, 'arcade_player_ship').setOrigin(0.5).setDepth(20);` (`game.js:9116`).
- **Physics Body**: `this.ship.body.setSize(40, 40);` (`game.js:9119`).
- **Depth & Shadows**: Fixed depth of 20, shield aura sprite attached at depth 19. No top-down walking or Y-depth sorting.

---

### 2.4. `FishingScene` (Pond Minigame)

- **Player Instantiation**:
  - Stationary player sprite: `this.player = this.add.sprite(this.W/2, this.H - 110, 'player_walk_down_0').setOrigin(0.5).setDepth(10);` (`game.js:10026`).
- **Scale**: **1.0**.
- **Movement & Physics**: None (stationary fishing minigame).

---

## 3. Discrepancy & Inconsistency Analysis

| Feature / Mechanic | `FarmScene` | `DungeonScene` | `FishingScene` | `ArcadeScene` |
| :--- | :--- | :--- | :--- | :--- |
| **Player Scale** | `1.8` (86.4×86.4 px) | `1.0` (48×48 px) | `1.0` (48×48 px) | N/A (Ship) |
| **Hitbox Size** | `24 × 16` px | `30 × 30` px | None | `40 × 40` px |
| **Hitbox Offset** | `(12, 32)` (Foot-anchored) | `(0, 0)` (Centered) | None | `(0, 0)` |
| **Shadow Base Size** | `58 × 18` (Y-offset 32) | `30 × 10` (Y-offset 15) | None | None |
| **Shadow Light Model** | Solar Directional | Torch Point Light | None | None |
| **Movement Speed** | `210` px/s (Normalized) | `280` px/s (Unnormalized) | N/A | `320` px/s |
| **Drag / Inertia** | `(900, 900)` | `(0, 0)` | N/A | `(0, 0)` |
| **Flip Behavior** | `setScale(-1.8, 1.8)` | Standard anim frames | N/A | N/A |

### Key Issues Identified:
1. **Scale Harmony Breakdown**: The player character appears ~44% smaller in `DungeonScene` (scale 1.0) compared to `FarmScene` (scale 1.8).
2. **Inconsistent Hitbox Placement**: Centered `30x30` hitbox in `DungeonScene` causes player torso collisions with walls/monsters, whereas `FarmScene` foot offset `(12, 32)` delivers clean top-down depth overlapping.
3. **Unnormalized Diagonal Velocity in Dungeon**: Moving diagonally in `DungeonScene` provides an unnormalized speed boost (~396 px/s vs 280 px/s cardinally).
4. **Scale Flipping vs Dedicated Matrices**: `FarmScene` negates scale X (`-1.8`) to mirror sprites when moving left, even though dedicated `left_0`, `left_1`, `left_2` pixel matrices already exist in `PixelArtRenderer`.

---

## 4. Architectural Recommendations for Main Character Redesign

1. **Standardized Foot-Anchored Hitboxes**:
   - For all top-down scenes (`FarmScene`, `DungeonScene`), compute hitbox dimensions based on frame size `W_tex, H_tex` and target scale `S`.
   - Formula:
     ```javascript
     const boxW = Math.round(W_tex * 0.5);
     const boxH = Math.round(H_tex * 0.33);
     const offsetX = Math.round((W_tex - boxW) / 2);
     const offsetY = H_tex - boxH - 2;
     this.player.body.setSize(boxW, boxH).setOffset(offsetX, offsetY);
     ```
   - Ensures consistent collision behavior across scenes.

2. **Shadow Alignment & Scaling**:
   - Maintain `baseW` and `offsetY` values proportional to sprite display scale `S`.
   - Formula: `baseW ≈ 0.65 * displayWidth`, `offsetY ≈ 0.37 * displayHeight`.
   - Preserve depth sorting rule: `shadowDepth = playerBaseY - 1`.

3. **Diagonal Movement Normalization**:
   - Apply vector magnitude normalization across all movable scenes:
     ```javascript
     const len = Math.hypot(vx, vy) || 1;
     this.player.body.setVelocity((vx / len) * speed, (vy / len) * speed);
     ```

4. **Wobble & Walking Juice Enhancements**:
   - Integrate procedural squish/stretch or subtle sine wave Y-bobbing during movement:
     ```javascript
     if (moving) {
       const bob = Math.sin(this.time.now * 0.015) * 0.04;
       this.player.setScale(baseScaleX * (1 + bob), baseScaleY * (1 - bob));
     }
     ```
   - Maintain dust puff step particles on frames 1 and 3.

---

## 5. Verification Method
- Code inspect `game.js` lines:
  - `PixelArtRenderer._genPlayerTextures`: lines 1320–1828
  - `DynamicShadowSystem`: lines 6889–6992
  - `FarmScene._createPlayer` & `update`: lines 8476–8577
  - `DungeonScene._createPlayer` & `update`: lines 9553–9647
  - `ArcadeScene`: lines 9116–9189
  - `FishingScene`: lines 10026–10050
