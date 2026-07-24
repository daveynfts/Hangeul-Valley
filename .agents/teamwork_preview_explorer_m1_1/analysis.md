# Milestone 1 (R1) Technical Analysis Report: Beehive Farm NPC & Scene Setup

## Executive Summary
This report provides a comprehensive code analysis and structural plan for **Requirement R1: Beehive Farm NPC on Farm Map & Scene Transition**.
The investigation covers `game.js` architectural patterns, `PixelArtRenderer` texture creation, `FarmScene` rendering, proximity/interaction systems, Phaser scene state management (`pause`/`launch`/`resume`), and syntax verification (`node -c game.js`).

---

## 1. Investigation Findings & Code Architecture

### 1.1 `FarmScene` Object, NPC & Label Rendering Architecture
- **Location**: `d:\Hangeul Valley\game.js` (Lines 7269–9385)
- **Apple Tree Setup**:
  - Defined in `_createAppleTree(W, H)` (Lines 8412–8458).
  - Calculated position: `ax = this.farm.x - 130`, `ay = this.farm.y - 85`.
  - Sprite rendering: `this.appleTreeSprite = this.add.image(ax, ay, 'apple_tree').setOrigin(0.5, 1).setScale(3.6).setDepth(ay + 1);`
  - Dynamic shadow creation: `if (this.shadows) this.shadows.createShadow(this.appleTreeSprite, 170, 44, 0);`
  - Collision box: `const trunkZone = this.add.zone(ax, ay - 10, 110, 52); this.physics.add.existing(trunkZone, true); this.physics.add.collider(this.player, trunkZone);`
  - Idle Animation: `this.tweens.add({ targets: this.appleTreeSprite, angle: { from: -1.2, to: 1.2 }, duration: 3200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });`
  - Floating Interaction Text Label:
    ```javascript
    this.appleTreeLabel = this.add.text(ax, ay - 260, '🍎 HARVEST!\n[SPACE]', {
      fontFamily: '"Press Start 2P",monospace', fontSize: '14px',
      color: '#FFFFFF', stroke: '#000', strokeThickness: 4, align: 'center'
    }).setOrigin(0.5, 1).setDepth(ay + 100).setAlpha(0);
    ```
  - Fixed Name Tag Label:
    ```javascript
    this.add.text(ax, ay + 38, '🍎 Apple Tree', {
      fontFamily: '"Press Start 2P",monospace', fontSize: '10px',
      color: '#FFD700', stroke: '#000', strokeThickness: 2, align: 'center'
    }).setOrigin(0.5, 0).setDepth(ay + 10);
    ```

- **NPC Pattern (Arcade, Wizard, Cat, Dungeon Portal, Fishing Dock)**:
  - NPC entities follow a unified 4-part pattern:
    1. Create sprite/image with `setOrigin(0.5, 1)` and depth anchor `setDepth(y)`.
    2. Add dynamic shadow via `this.shadows.createShadow(sprite, width, height, offsetY)`.
    3. Add a floating interaction hint text (`[SPACE]`) with `setAlpha(0)` and a vertical sine bobbing tween (`duration: 600-700ms, yoyo: true`).
    4. Store position coordinates (`this.<npc>X`, `this.<npc>Y`) on `FarmScene` for proximity checks and depth updates.

- **Proximity Checks & Interaction Hints (`[SPACE]`)**:
  - In `FarmScene.update(_t, dt)` (Lines 8843–8972):
    - Depth sorting: NPC depth dynamically set each frame: `if (this.beehiveSprite) this.beehiveSprite.setDepth(this.beehiveY || this.beehiveSprite.y);`
    - Hint visibility: Distance check using `Phaser.Math.Distance.Between(this.player.x, this.player.y, this.beehiveX, this.beehiveY) < 85`. Sets `this.beehiveHint.setAlpha(near ? 1 : 0)`.
    - Corner Highlight Box & Target Text: `_updateTargetHighlight()` (Lines 8976–9041) checks proximity to interactable objects, drawing corner bracket graphics and showing target banner (`[SPACE] Enter Beehive`).
    - Keypress Trigger: `Phaser.Input.Keyboard.JustDown(this.spaceKey)` triggers `this._interact()` (Lines 9055–9130).

---

### 1.2 Pixel-Art Beehive Texture Generation & Buzzing FX
- **Location**: `PixelArtRenderer` class (Lines 214–3700)
- **Texture Generation Pattern**:
  - Textures are procedurally created in `PixelArtRenderer.generateAllTextures(scene)` (Line 247).
  - Helper methods `PixelArtRenderer.createTexture(scene, key, matrix, palette, width, height, ps)` or custom graphics drawing in static renderer methods:
    - Matrix-based drawing maps color tokens to hex values (e.g. amber yellow `0xFACC15`, dark amber `0xD97706`, wooden base `0x78350F`, dark entrance `0x1E293B`, wing translucent `0xE2E8F0`).
    - Filter mode: `Phaser.Textures.FilterMode.NEAREST` ensures crisp pixel art without blur.
- **Textures to generate for Beehive**:
  1. `'beehive'`: 20×22 pixel art grid (scaled 1.5–1.8x) depicting a ribbed straw/amber dome beehive on a wooden base with a dark entrance hole and golden honey highlights.
  2. `'p_tiny_bee'`: 5×5 pixel particle texture representing a tiny honeybee with striped body and translucent wings.
- **Buzzing Particle Effect & Vibration Animation**:
  - **Vibration Animation**: A rapid, subtle jitter tween applied to `beehiveSprite`:
    `this.tweens.add({ targets: this.beehiveSprite, x: { from: bx - 1, to: bx + 1 }, duration: 90, yoyo: true, repeat: -1, ease: 'Sine.InOut' });`
  - **Buzzing Bee Swarm Particles**:
    Spawn 3–4 tiny bee sprites (`p_tiny_bee`) orbiting around `(bx, by - 25)` in sine/cosine trajectories in `FarmScene.update()`:
    ```javascript
    this.beehiveBees.forEach((bee) => {
      bee.angle += bee.speed;
      bee.sprite.x = bee.baseX + Math.cos(bee.angle) * bee.radiusX + Math.sin(bee.angle * 2.5) * 2;
      bee.sprite.y = bee.baseY + Math.sin(bee.angle) * bee.radiusY + Math.cos(bee.angle * 1.8) * 2;
    });
    ```

---

### 1.3 Phaser Scene Management & Transition Mechanisms
- **Scene Registration**:
  - Located at Lines 10701–10710 in `game.js`:
    ```javascript
    const config = {
      type: Phaser.AUTO,
      width: window.innerWidth, height: window.innerHeight,
      backgroundColor: '#3A7015',
      render: { pixelArt: true, antialias: false, antialiasGL: false, roundPixels: true },
      physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
      scene: [FarmScene, ArcadeScene, DungeonScene, FishingScene, BeeScene],
      parent: document.body,
      scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }
    };
    ```
- **Transition from `FarmScene` to `BeeScene`**:
  - Exact pattern used by `ArcadeScene`, `DungeonScene`, and `FishingScene` (Lines 9084, 9097, 9108):
    ```javascript
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.pause();
      this.scene.launch('BeeScene');
    });
    ```
- **Transition back from `BeeScene` to `FarmScene`**:
  - Exact pattern used by `ArcadeScene` (Line 9814–9818):
    ```javascript
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop();
      this.scene.resume('FarmScene');
    });
    ```
- **Fade-in Handling upon Resume**:
  - Handled in `FarmScene.create()` (Lines 7290–7292):
    ```javascript
    this.events.off('resume');
    this.events.on('resume', () => {
      this.cameras.main.fadeIn(300, 0, 0, 0);
    });
    ```

---

### 1.4 State & Player Position Preservation
- When `this.scene.pause()` is invoked in `FarmScene`, Phaser freezes execution of `FarmScene` without destroying scene state or game objects.
- `this.player.x`, `this.player.y`, active crops, crop growth timers (`_checkSRS`), dropped items (`droppedItems`), day/night cycle, weather state, and all scene references remain active in memory.
- When `BeeScene` calls `this.scene.stop()` and `this.scene.resume('FarmScene')`, `FarmScene` resumes cleanly from the exact saved player position with 0 state loss or reload overhead.

---

### 1.5 Syntax Verification Command
- Node.js syntax verification test:
  ```bash
  node -c game.js
  ```
- Result: **0 syntax errors** (Exit code 0).

---

## 2. Implementation Blueprint for R1

### Step 1: Add Texture Generation in `PixelArtRenderer`
- Add `_genBeehiveTextures(scene)` method to `PixelArtRenderer` (or integrate into `_genCropAndTreeTextures`).
- Register `this._genBeehiveTextures(scene)` inside `PixelArtRenderer.generateAllTextures(scene)`.
- Generate `'beehive'` texture and `'p_tiny_bee'` particle texture.

### Step 2: Add `BeeScene` Skeleton Class & Register in `config.scene`
- Declare `class BeeScene extends Phaser.Scene` near `ArcadeScene` / `FishingScene`.
- Implement `constructor() { super({ key: 'BeeScene' }); }`, `preload()`, `create()`, `update()`.
- Add exit handler to return to `FarmScene` using `camerafadeoutcomplete` + `this.scene.stop()` + `this.scene.resume('FarmScene')`.
- Add `BeeScene` to `config.scene: [FarmScene, ArcadeScene, DungeonScene, FishingScene, BeeScene]`.

### Step 3: Instantiate Beehive NPC in `FarmScene`
- Implement `_createBeehiveNPC(W, H)` in `FarmScene`:
  - Position near Apple Tree: `bx = this.farm.x - 65`, `by = this.farm.y - 70`.
  - Create image `this.beehiveSprite = this.add.image(bx, by, 'beehive').setOrigin(0.5, 1).setScale(1.6).setDepth(by);`.
  - Add shadow `this.shadows.createShadow(this.beehiveSprite, 40, 12, 4)`.
  - Add vibration tween on `beehiveSprite`.
  - Add orbiting bee particle swarm `beehiveBees`.
  - Add hint label `this.beehiveHint = this.add.text(bx, by - 58, '🐝 BEEHIVE\n[SPACE]', ...)` with bobbing tween.
  - Add name label `this.add.text(bx, by + 6, '🐝 Beehive', ...)`.
  - Call `this._createBeehiveNPC(W, H)` inside `FarmScene.create()`.

### Step 4: Proximity & Interaction Integration in `FarmScene`
- In `FarmScene.update()`:
  - Add `this.beehiveSprite.setDepth(this.beehiveY || this.beehiveSprite.y);`.
  - Add proximity check for `beehiveHint`: distance < 85 -> `setAlpha(1)`, else `0`.
  - Update `beehiveBees` orbital positions.
- In `_updateTargetHighlight()`:
  - Add check for `beehiveX` proximity < 85 -> display corner brackets & `[SPACE] Enter Beehive`.
- In `_interact()`:
  - Add check for `beehiveX` proximity < 85 -> play bounce tween, trigger camera fadeOut, pause `FarmScene`, launch `'BeeScene'`.

### Step 5: Dual-File Sync & Verification
- Synchronize all edits to `assets/game.js`.
- Test syntax with `node -c game.js` and `node -c assets/game.js`.

---
*Report compiled by Explorer 1 for Milestone 1.*
