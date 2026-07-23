# Milestone R1 Analysis Report: Procedural 48x48 Pixel Art Sprite Renderer & Character System

## 1. Executive Summary & Context

This analysis report lays out the design, specification, and architectural plan for **Milestone R1: Procedural 48x48 Pixel Art Sprite Renderer & Character System** in Hangeul Valley (`game.js`).

Currently, Hangeul Valley uses a mix of:
1. Crude 1-directional 42x75 pixel art textures (`farmer0..3`) baked dynamically in `FarmScene._bakeTextures()` for the player character, with horizontal flipping for left/right movement and no back-facing walk frames.
2. Emoji text objects (`🗡️`, `🎣`, `🛸`) in `DungeonScene`, `FishingScene`, and `ArcadeScene`.
3. Static single-frame pixel art textures for `cat_npc` (39x48 px) and `wizard_npc` (48x66 px) in `FarmScene`, animated only via Phaser position Y-tweens.

This investigation establishes the blueprint for a unified, procedural **48x48 Pixel Art Grid Renderer module (`PixelArtRenderer`)** using Phaser 3 Graphics API (`graphics.fillRect()` and `generateTexture()`). The module will procedurally generate **16 high-quality 48x48 pixel art textures**:
- **Player Farmer Character**: 12 textures covering 4 walk directions (DOWN, UP, LEFT, RIGHT) with 3 frames per direction (`player_walk_down_0..2`, `player_walk_up_0..2`, `player_walk_left_0..2`, `player_walk_right_0..2`).
- **Cat NPC (Muop 🐱)**: 2 textures for 2-frame idle animation (`cat_idle_0`, `cat_idle_1`) featuring tail wagging and eye blinking.
- **Wizard NPC (Merlin 🧙‍♂️)**: 2 textures for 2-frame idle animation (`wizard_idle_0`, `wizard_idle_1`) featuring staff crystal pulsing and floating robe aura.

---

## 2. Audit of Existing Sprite & Rendering Logic in `game.js`

### 2.1 Texture Generation Audit (`_bakeTextures()`, Lines 1616–1912)
In `game.js`, `FarmScene._bakeTextures()` uses `this.make.graphics({add:false})` and a custom helper `pR(graphics, x, y, w, h, color)` to draw pixel blocks.

- **Current Player Sprite Generation** (Lines 1813–1844):
  - Size: `14*PS` x `25*PS` (where `PS=3`, resulting in 42x75 pixels).
  - Frames: 4 frames (`farmer0`, `farmer1`, `farmer2`, `farmer3`).
  - Direction: Single south-facing (front) view only.
  - Movement: Left/Right walking is handled by horizontal flipping (`this.player.setFlipX(true/false)` at line 2384), resulting in asymmetric elements (like belt buckles or tools) mirroring unnaturally. Up/North walking displays front face moving backwards.
- **Current Cat NPC Sprite Generation** (Lines 1873–1911):
  - Size: `13*PS` x `16*PS` (39x48 pixels).
  - Texture: Single static texture `cat_npc`.
  - Animation: Simple Y-bounce tween in `FarmScene` (Line 2140: `yoyo: true, repeat: -1`).
- **Current Wizard NPC Sprite Generation** (Lines 1794–1811):
  - Size: `16*PS` x `22*PS` (48x66 pixels).
  - Texture: Single static texture `wizard_npc`.
  - Animation: Simple Y-float tween in `FarmScene` (Line 2117: `yoyo: true, repeat: -1`).

### 2.2 Scene-by-Scene Sprite Usage Breakdown

| Scene | Current Player Implementation | Current NPC Implementation | Target Integration |
|---|---|---|---|
| **FarmScene** (Lines 1558–2829) | `this.physics.add.sprite(W/2, H-80, 'farmer0')` with 4 front-facing walk frames | `this.catSprite` (`cat_npc`), `this.wizardSprite` (`wizard_npc`) | 4-directional 48x48 animated farmer sprite (`player_walk_*`); 2-frame animated Cat (`cat-idle`) & Wizard (`wizard-idle`) |
| **DungeonScene** (Lines 3221–3578) | `this.add.text(W/2, H/2, '🗡️', {fontSize:'36px'})` with physics body | Monster text emojis (`👹`, `👾`) | Replace emoji text player with 48x48 directional farmer sprite using sword/tool layer |
| **FishingScene** (Lines 3579–3900) | `this.add.text(W/2, H-110, '🎣', {fontSize:'52px'})` | N/A | Replace emoji text player with 48x48 farmer sprite in fishing/standing stance |
| **ArcadeScene** (Lines 2830–3220) | `this.add.text(W/2, H-80, '🛸', {fontSize:'42px'})` | Alien emojis (`👾`) | Retain retro arcade ship or add 48x48 pixel hero ship |

---

## 3. Procedural 48x48 Pixel Art Grid System Design

### 3.1 Grid Coordinate & Canvas Specification
- **Grid Dimensions**: 48 × 48 pixels (x: 0 to 47, y: 0 to 47).
- **Pixel Scale**: Native 1x scale (`PS = 1`), drawing directly into 48x48 graphics canvas, generated via `graphics.generateTexture(key, 48, 48)`.
- **Filtering**: Set `texture.setFilter(Phaser.Textures.FilterMode.NEAREST)` to ensure pixel-perfect, crisp rendering when scaled in Phaser.

### 3.2 Master Color Palette

| Component | Role | Primary HEX | Shadow HEX | Highlight HEX |
|---|---|---|---|---|
| **Skin Tone** | Face, hands, arms | `0xFFDDAD` | `0xE0A96D` | `0xFFF0D4` |
| **Straw Hat** | Farmer hat crown & brim | `0xEAB308` | `0xCA8A04` | `0xFDE047` |
| **Hat Ribbon** | Accent band | `0xEF4444` | `0xB91C1C` | `0xF87171` |
| **Hair** | Brown hair/bangs | `0x5C3A21` | `0x3B2312` | `0x8B5A2B` |
| **Overalls** | Denim bib & pants | `0x2563EB` | `0x1D4ED8` | `0x60A5FA` |
| **Shirt** | Inner shirt under bib | `0xF8FAFC` | `0xCBD5E1` | `0xFFFFFF` |
| **Buckles** | Overalls bronze buttons | `0xF59E0B` | `0xB45309` | `0xFDE047` |
| **Boots** | Leather work boots | `0x78350F` | `0x451A03` | `0x92400E` |
| **Tool (Hoe)** | Wooden handle & iron blade | `0x78350F` (wood) | `0x451A03` | `0x94A3B8` (iron head) |
| **Cat Fur (Muop)** | Korean ginger tabby body | `0xF97316` | `0xC2410C` | `0xFFEDD5` |
| **Cat Chest/Paws** | White muzzle, belly, socks | `0xFFFFFF` | `0xE2E8F0` | `0xFFFFFF` |
| **Cat Eyes/Nose** | Amber eyes, pink nose | `0xFACC15` (eyes) | `0x1E293B` (pupil) | `0xF472B6` (nose/ears) |
| **Wizard Robe** | Deep violet robe | `0x5B21B6` | `0x3C0764` | `0x7C3AED` |
| **Wizard Beard** | Flowing white beard | `0xF8FAFC` | `0xCBD5E1` | `0xFFFFFF` |
| **Wizard Staff** | Wood shaft & glowing crystal | `0x78350F` (staff) | `0x06B6D4` (crystal) | `0x67E8F9` (glow aura) |

---

### 3.3 Character 1: Farmer Player Character (12 Textures)

The farmer sprite occupies a 28x40 box centered inside the 48x48 grid (X: 10..37, Y: 4..44).

#### 3.3.1 Layer Breakdown (Z-Order Back to Front)
1. **Tool Layer**: Handheld tool (hoe/sickle) rendered behind or beside body depending on direction.
2. **Body & Skin Base**: Neck, face, arms, hands, legs.
3. **Hair Layer**: Back hair and front bangs.
4. **Clothing Layer**: Inner shirt, overalls with shoulder straps and bronze buckles, leather boots.
5. **Straw Hat Layer**: Wide circular brim with shadow, central dome crown, bright red ribbon band.
6. **Face Details**: Eyes (2x2 px), rosy cheeks (2x1 px pink), mouth line.

#### 3.3.2 Frame Specifications & Coordinates

##### Direction 1: DOWN (Facing South / Forward)
- **`player_walk_down_0` (Idle Stance)**:
  - Hat Brim: `X: 12..35, Y: 10..13`; Hat Dome: `X: 16..31, Y: 4..10`; Red Ribbon: `X: 16..31, Y: 10`.
  - Hair: Bangs `X: 18..29, Y: 13..15`. Face: Skin `X: 17..30, Y: 14..22`, Eyes `(20,18)`, `(27,18)`, Rosy cheeks `(19,20)`, `(28,20)`.
  - Overalls: Bib `X: 19..28, Y: 23..33`, Straps `X: 19..21` & `X: 26..28` (`Y: 23..26`), Bronze buckles `(20,26)`, `(27,26)`.
  - Arms: Left Arm `X: 14..18, Y: 23..31`; Right Arm `X: 29..33, Y: 23..31`.
  - Legs & Boots: Left Leg `X: 18..22, Y: 34..40`, Right Leg `X: 25..29, Y: 34..40`; Boots `X: 17..23, Y: 41..44` & `X: 24..30, Y: 41..44`.
  - Tool (Hoe): Shaft `X: 34..35, Y: 18..42`; Iron head `X: 32..38, Y: 16..19`.

- **`player_walk_down_1` (Left Foot Step)**:
  - Vertical Bob: Head, Hat, Torso shifted down 1px (`Y + 1`).
  - Left Leg: Shifted down 2px (`Y: 36..42`), Boot `Y: 42..45`.
  - Right Leg: Lifted up 1px (`Y: 33..38`), Boot `Y: 39..42`.
  - Left Arm: Swung slightly forward/outward (`X: 13..17`). Right Arm & Tool: Swung back (`X: 30..34`).

- **`player_walk_down_2` (Right Foot Step)**:
  - Vertical Bob: Torso shifted down 1px (`Y + 1`).
  - Right Leg: Shifted down 2px (`Y: 36..42`), Boot `Y: 42..45`.
  - Left Leg: Lifted up 1px (`Y: 33..38`), Boot `Y: 39..42`.
  - Right Arm & Tool: Swung forward (`X: 31..35, Y: 21..29`). Left Arm: Swung back (`X: 15..19`).

##### Direction 2: UP (Facing North / Away)
- **`player_walk_up_0` (Idle Stance)**:
  - Hat Dome: `X: 16..31, Y: 4..11` (covering upper head); Hat Brim: `X: 12..35, Y: 11..14`.
  - Neck Hair: Dark brown hair extending below brim `X: 18..29, Y: 14..18`.
  - Back Overalls: Cross straps `X: 19..21` & `X: 26..28` (`Y: 19..33`), Blue denim back `X: 18..29, Y: 24..33`.
  - Boots (Rear): Dark soles `X: 17..22, Y: 41..44` & `X: 25..30, Y: 41..44`.
  - Tool: Angled across back (`X: 12..36, Y: 18..38`).

- **`player_walk_up_1` (Left Foot Step)**:
  - Vertical Bob: Torso/Hat shifted down 1px.
  - Left Leg & Boot: Shifted up/forward 2px (`Y: 39..42`), Right Leg extended (`Y: 42..45`).

- **`player_walk_up_2` (Right Foot Step)**:
  - Vertical Bob: Torso/Hat shifted down 1px.
  - Right Leg & Boot: Shifted up/forward 2px (`Y: 39..42`), Left Leg extended (`Y: 42..45`).

##### Direction 3: LEFT (Facing West / Profile)
- **`player_walk_left_0` (Idle Stance)**:
  - Hat Brim: Asymmetrical profile `X: 10..32, Y: 10..13`; Hat Dome: `X: 14..27, Y: 4..10`.
  - Profile Face: Nose profile extending left `(15,18)`, Eye `(18,17)`.
  - Overalls: Single side-profile strap `X: 18..21, Y: 22..33`.
  - Legs & Boots: Side profile legs `X: 18..26, Y: 34..44`.
  - Tool: Held forward in left hand (`X: 8..12, Y: 16..40`).

- **`player_walk_left_1` (Left Foot Striding Forward)**:
  - Left Leg: Extended left/forward `X: 12..18, Y: 36..44`.
  - Right Leg: Extended right/back `X: 24..30, Y: 34..42`.
  - Body Bob: 1px lower (`Y + 1`).

- **`player_walk_left_2` (Right Foot Striding Forward)**:
  - Right Leg: Extended left/forward `X: 14..20, Y: 36..44`.
  - Left Leg: Extended right/back `X: 22..28, Y: 34..42`.

##### Direction 4: RIGHT (Facing East / Profile)
- **`player_walk_right_0` (Idle Stance)**:
  - Hat Brim: Profile `X: 16..38, Y: 10..13`; Hat Dome: `X: 21..34, Y: 4..10`.
  - Profile Face: Nose profile extending right `(32,18)`, Eye `(29,17)`.
  - Tool: Held forward in right hand (`X: 36..40, Y: 16..40`).

- **`player_walk_right_1` (Right Foot Striding Forward)**:
  - Right Leg: Extended right/forward `X: 30..36, Y: 36..44`.
  - Left Leg: Extended left/back `X: 18..24, Y: 34..42`.

- **`player_walk_right_2` (Left Foot Striding Forward)**:
  - Left Leg: Extended right/forward `X: 28..34, Y: 36..44`.
  - Right Leg: Extended left/back `X: 20..26, Y: 34..42`.

---

### 3.4 Character 2: Cat NPC Muop (2 Textures)

Muop is a Korean Ginger Tabby Cat sitting in a 48x48 box (X: 12..35, Y: 12..42).

#### 3.4.1 Frame Specifications
- **`cat_idle_0` (Standard Sitting Stance)**:
  - Pointy Ears: Left Ear `X: 14..18, Y: 10..15`; Right Ear `X: 29..33, Y: 10..15`; Pink inner ear `(16,12)`, `(31,12)`.
  - Head: Ginger head `X: 16..31, Y: 15..25`; M-stripes on forehead `(21..26, 16..18)`.
  - Face: Muzzle white `X: 20..27, Y: 22..26`; Pink nose `(23,23)`; Amber eyes open `X: 18..21, Y: 19..21` & `X: 26..29, Y: 19..21`.
  - Body: Ginger body `X: 15..32, Y: 25..39`; White chest/belly `X: 19..28, Y: 26..38`.
  - Front Paws: White socks `X: 17..21, Y: 39..42` & `X: 26..30, Y: 39..42`.
  - Tail: Curled to right side `X: 33..41, Y: 28..38`.

- **`cat_idle_1` (Blink & Tail Wag Frame)**:
  - Eyes: Closed happy arcs (`^ ^` shape rendered via dark line `X: 18..21, Y: 20` & `X: 26..29, Y: 20`).
  - Tail Wag: Tail tip raised 4px higher and swished `X: 34..43, Y: 22..34`.
  - Ears: Ear tips twitched outward by 1px.

---

### 3.5 Character 3: Wizard NPC Merlin (2 Textures)

Merlin is a Master Wizard in a 48x48 box (X: 10..38, Y: 2..44).

#### 3.5.1 Frame Specifications
- **`wizard_idle_0` (Ground Stance)**:
  - Pointed Wizard Hat: Floppy tip `X: 28..35, Y: 2..6`; Main cone `X: 18..32, Y: 6..15`; Wide brim `X: 12..36, Y: 15..18`; Gold moon buckle `(22,15)`.
  - Head & Face: Face skin `X: 20..27, Y: 18..22`; Mysterious dark eyes `(21,20)`, `(26,20)`.
  - Beard: Majestic long white beard covering chest `X: 17..30, Y: 22..38`.
  - Violet Robe: Main robe `X: 14..33, Y: 24..43`, shadow folds `X: 16..18, Y: 28..43`.
  - Staff & Crystal: Wooden staff `X: 36..38, Y: 12..44`; Glowing cyan orb `X: 34..40, Y: 8..14` (`0x06B6D4` outer, `0x67E8F9` core, `0xFFFFFF` shine).

- **`wizard_idle_1` (Floating & Glowing Staff Frame)**:
  - Float Effect: Whole wizard sprite (Hat, Head, Robe, Beard) shifted up 1px (`Y - 1`).
  - Staff Crystal Pulse: Orb aura expands to 10x10 px (`X: 33..41, Y: 7..15`) with cyan sparkle pixels (`0x22D3EE` & `0xFFFFFF` surrounding particles).
  - Robe Swish: Robe bottom hem flares outward 1px (`X: 13..34, Y: 43..44`).

---

## 4. Architecture & Structure of the `PixelArtRenderer` Module

To ensure clean, maintainable, and modular texture generation across all Phaser scenes, the `PixelArtRenderer` module will be structured as a singleton class in `game.js`.

### 4.1 Module Design

```javascript
/**
 * PixelArtRenderer — Procedural 48x48 Pixel Art Texture & Animation Generator
 * Generates high-quality pixel art textures and registers Phaser animations.
 */
class PixelArtRenderer {
  static initialized = false;

  /**
   * Initializes and bakes all 48x48 pixel art textures into Phaser TextureManager
   * @param {Phaser.Scene} scene - Any active Phaser scene context
   */
  static init(scene) {
    if (PixelArtRenderer.initialized) return;

    console.log('[PixelArtRenderer] Baking 48x48 procedural pixel art textures...');

    // Helper functions for drawing onto 48x48 Phaser Graphics
    const pR = (g, x, y, w, h, col, alpha = 1) => {
      g.fillStyle(col, alpha);
      g.fillRect(x, y, w, h);
    };
    const pP = (g, x, y, col, alpha = 1) => {
      g.fillStyle(col, alpha);
      g.fillRect(x, y, 1, 1);
    };

    // 1. Bake 12 Farmer Walk Cycle Textures
    PixelArtRenderer._bakeFarmerTextures(scene, pR, pP);

    // 2. Bake 2 Cat NPC Textures
    PixelArtRenderer._bakeCatTextures(scene, pR, pP);

    // 3. Bake 2 Wizard NPC Textures
    PixelArtRenderer._bakeWizardTextures(scene, pR, pP);

    // 4. Register Animations globally in Phaser
    PixelArtRenderer._createAnimations(scene);

    PixelArtRenderer.initialized = true;
    console.log('[PixelArtRenderer] Texture baking complete. 16 textures & 6 animations registered.');
  }

  static _bakeFarmerTextures(scene, pR, pP) {
    const directions = ['down', 'up', 'left', 'right'];
    for (const dir of directions) {
      for (let frame = 0; frame < 3; frame++) {
        const key = `player_walk_${dir}_${frame}`;
        const g = scene.make.graphics({ add: false });
        
        // Call internal generator function for direction & frame
        PixelArtRenderer._drawFarmerFrame(g, dir, frame, pR, pP);
        
        g.generateTexture(key, 48, 48);
        g.destroy();
        
        // Ensure nearest-neighbor pixel crispness
        if (scene.textures.exists(key)) {
          scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
      }
    }
  }

  static _bakeCatTextures(scene, pR, pP) {
    for (let frame = 0; frame < 2; frame++) {
      const key = `cat_idle_${frame}`;
      const g = scene.make.graphics({ add: false });
      PixelArtRenderer._drawCatFrame(g, frame, pR, pP);
      g.generateTexture(key, 48, 48);
      g.destroy();
      if (scene.textures.exists(key)) {
        scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }
  }

  static _bakeWizardTextures(scene, pR, pP) {
    for (let frame = 0; frame < 2; frame++) {
      const key = `wizard_idle_${frame}`;
      const g = scene.make.graphics({ add: false });
      PixelArtRenderer._drawWizardFrame(g, frame, pR, pP);
      g.generateTexture(key, 48, 48);
      g.destroy();
      if (scene.textures.exists(key)) {
        scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }
  }

  static _createAnimations(scene) {
    const anims = scene.anims;
    
    // Player Walk Animations (8 fps, ping-pong sequence: 0 -> 1 -> 0 -> 2)
    const dirs = ['down', 'up', 'left', 'right'];
    dirs.forEach(dir => {
      anims.create({
        key: `player-walk-${dir}`,
        frames: [
          { key: `player_walk_${dir}_0` },
          { key: `player_walk_${dir}_1` },
          { key: `player_walk_${dir}_0` },
          { key: `player_walk_${dir}_2` }
        ],
        frameRate: 8,
        repeat: -1
      });
    });

    // Cat Idle Animation (2 fps, repeat indefinitely)
    anims.create({
      key: 'cat-idle',
      frames: [
        { key: 'cat_idle_0', duration: 1800 },
        { key: 'cat_idle_1', duration: 400 }
      ],
      frameRate: 2,
      repeat: -1
    });

    // Wizard Idle Animation (2 fps, subtle float & glow pulse)
    anims.create({
      key: 'wizard-idle',
      frames: [
        { key: 'wizard_idle_0', duration: 700 },
        { key: 'wizard_idle_1', duration: 700 }
      ],
      frameRate: 2,
      repeat: -1
    });
  }
}
```

### 4.2 Scene Integration Strategy

#### 1. Global Initialization Point
Call `PixelArtRenderer.init(this)` inside `FarmScene.preload()` or `FarmScene.create()`. Because `PixelArtRenderer.init()` checks `initialized`, textures are generated once upon initial launch and become available globally to all Phaser scenes.

#### 2. FarmScene Player & NPC Update
- **Player Creation**: Replace `this.physics.add.sprite(W/2, H-80, 'farmer0')` with `this.physics.add.sprite(W/2, H-80, 'player_walk_down_0')`.
- **Movement Update**:
  ```javascript
  // Direction determination in FarmScene.update()
  if (vy > 0) {
    this.player.play('player-walk-down', true);
    this.currentDir = 'down';
  } else if (vy < 0) {
    this.player.play('player-walk-up', true);
    this.currentDir = 'up';
  } else if (vx < 0) {
    this.player.play('player-walk-left', true);
    this.currentDir = 'left';
  } else if (vx > 0) {
    this.player.play('player-walk-right', true);
    this.currentDir = 'right';
  } else {
    this.player.anims.stop();
    this.player.setTexture(`player_walk_${this.currentDir || 'down'}_0`);
  }
  ```
- **Cat NPC Creation**:
  ```javascript
  this.catSprite = this.add.sprite(cx, cy, 'cat_idle_0').setOrigin(0.5, 1);
  this.catSprite.play('cat-idle');
  ```
- **Wizard NPC Creation**:
  ```javascript
  this.wizardSprite = this.add.sprite(wx, wy, 'wizard_idle_0').setOrigin(0.5, 1);
  this.wizardSprite.play('wizard-idle');
  ```

#### 3. DungeonScene & FishingScene Player Update
- **DungeonScene**: Replace `this.add.text(this.W/2, this.H/2, '🗡️')` with `this.physics.add.sprite(this.W/2, this.H/2, 'player_walk_down_0')`. Wire 4-directional walk animations to WASD/Arrow keys.
- **FishingScene**: Replace `this.add.text(this.W/2, this.H - 110, '🎣')` with `this.add.sprite(this.W/2, this.H - 110, 'player_walk_right_0')`.

---

## 5. Verification & Test Plan

1. **Texture Generation Verification**:
   - Verify that all 16 textures (`player_walk_down_0..2`, `player_walk_up_0..2`, `player_walk_left_0..2`, `player_walk_right_0..2`, `cat_idle_0..1`, `wizard_idle_0..1`) are correctly added to `scene.textures`.
2. **Animation Playback Verification**:
   - Test 4-directional walk cycle in `FarmScene` and `DungeonScene`. Confirm that moving Up shows back-facing textures, Down shows front-facing, Left shows left-profile, and Right shows right-profile without awkward horizontal flips.
   - Test idle stopping: Confirm player reverts to frame `0` of the active direction when movement stops.
   - Test Cat Muop: Confirm 2-frame idle loop triggers tail wag and blink.
   - Test Wizard Merlin: Confirm 2-frame idle loop triggers staff glow pulse and float.
3. **Performance & Memory Check**:
   - Ensure `make.graphics` objects are destroyed with `.destroy()` immediately after `.generateTexture()` to prevent memory leaks.
