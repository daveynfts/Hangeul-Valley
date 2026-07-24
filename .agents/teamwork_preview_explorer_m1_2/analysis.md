# Comprehensive Technical Analysis & Implementation Design: BeeScene Minigame (Milestone 1 - R2)

## Executive Summary
This document presents the detailed architectural analysis and implementation specification for **`BeeScene`** (Milestone 1, Component R2) in `d:\Hangeul Valley\game.js`. It details how Phaser 3 scenes are structured, how procedural pixel art textures are baked, flight trajectory mathematical models, interactive click detection, visual/audio feedback loops, round flow control (10 words per game), and exact code blueprints for seamless integration.

---

## 1. Phaser 3 Scene Architecture in `game.js`

### Existing Scene Class Patterns
In `game.js`, Phaser scenes inherit from `Phaser.Scene` and follow a standard pattern:
- **`FarmScene`** (Line 7269): Primary overworld scene managing crops, NPCs, player movement, environment physics, day/night cycles, lighting, and minigame portals.
- **`ArcadeScene`** (Line 9386): Space shooting minigame with multi-layer background parallax, enemy waves, projectiles, and HUD overlays.
- **`DungeonScene`** (Line 9828): Dungeon crawler minigame with tilemap rendering, monster AI, and combat logic.
- **`FishingScene`** (Line 10292): Stardew-style fishing minigame with ocean water shader/tiles, bobber physics, and fish album UI.

### Scene Lifecycle Standard
1. **`constructor()`**:
   ```javascript
   class BeeScene extends Phaser.Scene {
     constructor() { super({ key: 'BeeScene' }); }
   }
   ```
2. **`preload()`**:
   Bakes procedural textures via `PixelArtRenderer.generateAllTextures(this)` and `PixelArtRenderer.generateTilemapTextures(this)`. Loads external JSON resources (e.g. `levels.json`).
3. **`create()`**:
   - Resets scene state variables (`score`, `accuracy`, `currentWordIndex`, `activeBees`, `targetWord`).
   - Configures camera fade-in (`this.cameras.main.fadeIn(300, 0, 0, 0)`), round pixels (`this.cameras.main.setRoundPixels(true)`), and scene bounds.
   - Sets up multi-layer background (meadow green base, floating flowers, trees, sunny particle atmosphere).
   - Initializes HUD overlays (Target English Word text, Word progress `x/10`, Score, Accuracy %, Exit button `[ESC]`).
   - Registers input listeners (`keydown-ESC`, pointer handlers).
   - Starts word sequence and spawns initial bee wave.
4. **`update(time, delta)`**:
   - Advances active bee flight trajectories based on their motion algorithm (linear, sine wave, zigzag).
   - Updates wing animation flutter frames (`bee_fly_0` <-> `bee_fly_1`).
   - Handles boundary wrapping / despawn.
5. **Scene Transition Protocol**:
   - Launching from `FarmScene`:
     ```javascript
     this.cameras.main.fadeOut(300, 0, 0, 0);
     this.cameras.main.once('camerafadeoutcomplete', () => {
       this.scene.pause();
       this.scene.launch('BeeScene');
     });
     ```
   - Exiting `BeeScene` back to `FarmScene`:
     ```javascript
     this.cameras.main.fadeOut(300, 0, 0, 0);
     this.cameras.main.once('camerafadeoutcomplete', () => {
       this.scene.stop();
       this.scene.resume('FarmScene');
     });
     ```

---

## 2. Scene Registration & Configuration

In `game.js` (Line 10701 - 10711), the global Phaser Game configuration is defined as:
```javascript
const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#3A7015',
  render: { pixelArt: true, antialias: false, antialiasGL: false, roundPixels: true },
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  scene: [FarmScene, ArcadeScene, DungeonScene, FishingScene, BeeScene],
  parent: document.body,
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }
};
const game = new Phaser.Game(config);
```
To register `BeeScene`, add `BeeScene` to the `config.scene` array.

---

## 3. Procedural Pixel-Art Texture Generation (`PixelArtRenderer`)

`PixelArtRenderer` (Line 214) provides static helper methods to bake pixel art graphics into Phaser textures using `createTexture` or custom canvas graphics.

### Bee & Beehive Texture Specifications
We define `_genBeeTextures(scene)` within `PixelArtRenderer`:

```javascript
static _genBeeTextures(scene) {
  if (!scene || !scene.textures || scene.textures.exists('bee_fly_0')) return;

  const BEE_PALETTE = {
    '.': null,
    'K': 0x0F172A, // Dark outline / eyes
    'k': 0x1E293B, // Dark body stripe
    'Y': 0xFDE047, // Bright yellow body stripe
    'y': 0xD97706, // Amber yellow shade
    'W': 0xE0F2FE, // Translucent wing white
    'w': 0xBAE6FD, // Wing highlight
    'H': 0xFFFFFF  // Eye highlight
  };

  // Frame 0: Wings Spread Wide
  this.createTexture(scene, 'bee_fly_0', [
    "..www.....www...",
    ".wWWw.....wWWw..",
    ".wWWw.....wWWw..",
    "..www.kkk.www...",
    "....kYYYYYK.....",
    "...kYkkkYkkkY...",
    "..kYkHkYkHkYk...",
    "..kYkkkYkkkYk...",
    "..kYYYYYYYYYk...",
    "..kykkkykkkyk...",
    "...kYYYYYYYk....",
    "....kyyyykk.....",
    ".....kkyk.......",
    "................",
    "................",
    "................"
  ], BEE_PALETTE, 16, 16, 3);

  // Frame 1: Wings Down / Fluttering
  this.createTexture(scene, 'bee_fly_1', [
    "................",
    "......kkk.......",
    "....kYYYYYK.....",
    "...kYkkkYkkkY...",
    ".wWWkHkYkHkYkWWw",
    "wWWwYkkkYkkkYwWWw",
    ".wwYYYYYYYYYww..",
    "..kykkkykkkyk...",
    "...kYYYYYYYk....",
    "....kyyyykk.....",
    ".....kkyk.......",
    "................",
    "................",
    "................",
    "................",
    "................"
  ], BEE_PALETTE, 16, 16, 3);

  // Pollen Particle Texture
  const makeTex = (key, w, h, drawFn) => {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const g = scene.make.graphics({ add: false });
    drawFn(g);
    g.generateTexture(key, w, h);
    g.destroy();
  };

  makeTex('p_pollen', 6, 6, (g) => {
    g.fillStyle(0xFDE047, 1); g.fillRect(1, 0, 4, 6); g.fillRect(0, 1, 6, 4);
    g.fillStyle(0xFFFFFF, 1); g.fillRect(2, 2, 2, 2);
  });

  makeTex('p_honey_drip', 4, 8, (g) => {
    g.fillStyle(0xF59E0B, 0.9); g.fillRect(1, 0, 2, 8); g.fillRect(0, 4, 4, 4);
    g.fillStyle(0xFEF08A, 1); g.fillRect(1, 1, 1, 3);
  });
}
```

---

## 4. Flight Trajectory Algorithms

Flying bees move across the screen in 3 distinct mathematical motion patterns:

### Algorithm 1: Straight Linear Glide
- **Equation**:
  $$x(t) = x_0 + v_x \cdot t$$
  $$y(t) = y_0 + v_y \cdot t$$
- **Parameters**:
  - $v_x \in [100, 180]$ px/sec (left-to-right or right-to-left)
  - $v_y \in [-20, 20]$ px/sec (slight vertical drift)
- **Use Case**: Smooth, predictable flight pattern for lower-tier target/distractor bees.

### Algorithm 2: Sine Wave Motion
- **Equation**:
  $$x(t) = x_0 + \text{direction} \cdot \text{speed} \cdot t$$
  $$y(t) = \text{baseY} + \sin(\omega \cdot t + \phi) \cdot A$$
- **Parameters**:
  - $\text{speed} \in [110, 160]$ px/sec
  - Amplitude $A \in [30, 60]$ px
  - Frequency $\omega \in [2.5, 4.5]$ rad/sec
  - Phase $\phi \in [0, 2\pi]$ (randomized start offset per bee)
- **Use Case**: Natural undulating bee flight pattern.

### Algorithm 3: Zigzag Movement Pattern
- **Equation**:
  $$x(t) = x_0 + \text{direction} \cdot \text{speed} \cdot t$$
  $$v_y(t) = \begin{cases} +v_{\text{vert}}, & \text{if } \lfloor t / T \rfloor \pmod 2 = 0 \\ -v_{\text{vert}}, & \text{otherwise} \end{cases}$$
  $$y(t) = y(t-\Delta t) + v_y(t) \cdot \Delta t$$
- **Parameters**:
  - Horizontal speed $\in [120, 170]$ px/sec
  - Vertical speed $v_{\text{vert}} \in [80, 140]$ px/sec
  - Switch period $T \in [0.6, 1.0]$ seconds (or bounce when reaching upper/lower screen margin bounds)
- **Use Case**: Energetic, challenging trajectory pattern.

---

## 5. Minigame Mechanics & System Design

### A. Korean Word Labeling & Container System
Each bee entity is instantiated as a `Phaser.GameObjects.Container` containing:
1. `Phaser.GameObjects.Sprite`: Animated bee sprite using `bee_fly_0` / `bee_fly_1` (toggle frame every 120ms).
2. `Phaser.GameObjects.Text`: Korean vocabulary word label rendered below/above the bee sprite:
   ```javascript
   const label = scene.add.text(0, 26, wordKo, {
     fontFamily: '"Press Start 2P", "Galmuri11", sans-serif',
     fontSize: '16px',
     color: '#FFFFFF',
     stroke: '#0F172A',
     strokeThickness: 5,
     backgroundColor: 'rgba(15, 23, 42, 0.75)',
     padding: { x: 8, y: 4 }
   }).setOrigin(0.5, 0);
   ```

### B. Interactive Hit Detection
- Interactive hit area defined on the container or sprite:
  ```javascript
  container.setSize(64, 64);
  container.setInteractive({ useHandCursor: true });
  container.on('pointerdown', () => this.onBeeClicked(beeObj));
  ```

### C. Round Flow & Vocabulary Selection (10 Words per Game)
1. **Vocabulary Source**:
   Fetched from active unlocked levels:
   `const availableWords = unlockedLevels.flatMap(idx => levelsData[idx]?.words || []);`
   If `availableWords` length < 10, fallback to `levelsData[0]?.words || []`.
2. **Round Sequence**:
   - Randomly select 10 unique target words for the round (`roundWords`).
   - Maintain `currentWordIndex` (0 to 9).
   - For each word in `roundWords`:
     - Display target prompt on HUD header: `TARGET: "mother"` (English word).
     - Spawn 1 **Correct Bee** carrying `ko` ("어머니").
     - Spawn 3 **Distractor Bees** carrying incorrect `ko` words from `availableWords`.
     - Assign distinct flight paths (Linear, Sine, Zigzag) and staggered spawn positions ($x < 0$ or $x > W$).

### D. Visual & Audio Feedback
- **Correct Bee Clicked**:
  1. Particle explosion: `p_pollen`, `p_sparkle`, `p_honey_drip` emitted at bee position.
  2. Audio SFX: `playChiptuneSFX('quiz_correct')`.
  3. Score addition (+100 base + speed multiplier). Floating "+100" text tweening upward.
  4. Accuracy tracking incremented (correct hit count +1).
  5. Destroy bee wave, advance `currentWordIndex++`.
  6. If `currentWordIndex === 10`, trigger Round Complete Summary overlay.
- **Wrong Bee Clicked**:
  1. Audio SFX: `playChiptuneSFX('quiz_wrong')`.
  2. Camera Shake: `this.cameras.main.shake(150, 0.012)`.
  3. Bee flash red & horizontal wobble tween (`x` jitter $\pm 10$px).
  4. Deduct score (-20) & record miss count for accuracy calculation.

---

## 6. Syntax Verification & Quality Assurance

- Command to test JS syntax: `node -c game.js`
- Baseline check executed: **0 syntax errors**.

---

## 7. Concrete Code Blueprint for Implementer (R2)

Below is the complete architectural implementation template to be inserted into `game.js`:

```javascript
// ═══════════════ BEE SHOOTING MINIGAME SCENE ═════════════════════════════════
class BeeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BeeScene' });
  }

  preload() {
    PixelArtRenderer.generateAllTextures(this);
    PixelArtRenderer.generateTilemapTextures(this);
  }

  create() {
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.cameras.main.setRoundPixels(true);
    this.W = this.scale.width;
    this.H = this.scale.height;
    this.cameras.main.setBounds(0, 0, this.W, this.H);

    // Meadow Background
    for (let x = 0; x < this.W + 48; x += 48) {
      for (let y = 0; y < this.H + 48; y += 48) {
        this.add.image(x + 24, y + 24, 'tile_grass_base').setDisplaySize(48, 48).setDepth(0);
      }
    }

    // Particle Emitter for Honey/Pollen Explosion
    if (this.textures.exists('p_pollen') && typeof this.add.particles === 'function') {
      try {
        this.pollenEmitter = this.add.particles(0, 0, 'p_pollen', {
          speed: { min: 40, max: 120 },
          scale: { start: 1.2, end: 0.2 },
          alpha: { start: 1, end: 0 },
          lifespan: 600,
          emitting: false
        }).setDepth(20);
      } catch (e) {}
    }

    // Round State Initialization
    this.score = 0;
    this.correctHits = 0;
    this.totalClicks = 0;
    this.currentWordIndex = 0;
    this.activeBees = [];

    // Fetch Vocabulary
    const wordPool = (typeof unlockedLevels !== 'undefined' && Array.isArray(unlockedLevels))
      ? unlockedLevels.flatMap(idx => (levelsData[idx] && levelsData[idx].words) ? levelsData[idx].words : [])
      : [];
    this.wordList = (wordPool.length >= 10) ? wordPool : (levelsData[0]?.words || []);
    
    // Shuffle & Pick 10 Words
    this.roundWords = Phaser.Utils.Array.Shuffle([...this.wordList]).slice(0, 10);

    // UI Overlay Header
    this.targetText = this.add.text(this.W / 2, 35, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '20px',
      color: '#FDE047',
      stroke: '#0F172A',
      strokeThickness: 6,
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      padding: { x: 16, y: 8 }
    }).setOrigin(0.5, 0.5).setDepth(100);

    this.hudText = this.add.text(20, 20, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      color: '#FFFFFF',
      stroke: '#0F172A',
      strokeThickness: 4
    }).setDepth(100);

    const exitBtn = this.add.text(this.W - 20, 20, '[ESC] EXIT', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      color: '#FF00FF',
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      padding: { x: 10, y: 6 }
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).setDepth(100);

    exitBtn.on('pointerdown', () => this.exitGame());
    this.input.keyboard.on('keydown-ESC', () => this.exitGame());

    this.startNextWordRound();
  }

  startNextWordRound() {
    // Clear previous wave
    this.activeBees.forEach(b => b.container.destroy());
    this.activeBees = [];

    if (this.currentWordIndex >= 10) {
      this.showRoundSummary();
      return;
    }

    const currentTarget = this.roundWords[this.currentWordIndex];
    this.targetText.setText(`FIND: "${currentTarget.en.toUpperCase()}"`);
    this.updateHUD();

    // Select Distractors
    const distractors = this.wordList.filter(w => w.ko !== currentTarget.ko);
    const shuffledDistractors = Phaser.Utils.Array.Shuffle([...distractors]).slice(0, 3);
    const waveWords = Phaser.Utils.Array.Shuffle([currentTarget, ...shuffledDistractors]);

    const trajectories = ['linear', 'sine', 'zigzag'];

    waveWords.forEach((wordObj, i) => {
      const isRightToLeft = (i % 2 === 1);
      const startX = isRightToLeft ? (this.W + 60 + i * 40) : (-60 - i * 40);
      const baseY = 140 + i * 100;
      const trajectoryType = trajectories[i % trajectories.length];

      const container = this.add.container(startX, baseY).setDepth(10);
      const sprite = this.add.sprite(0, 0, 'bee_fly_0').setDisplaySize(48, 48);
      const text = this.add.text(0, 28, wordObj.ko, {
        fontFamily: '"Press Start 2P", "Galmuri11", sans-serif',
        fontSize: '16px',
        color: '#FFFFFF',
        stroke: '#0F172A',
        strokeThickness: 5,
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        padding: { x: 6, y: 3 }
      }).setOrigin(0.5, 0);

      container.add([sprite, text]);
      container.setSize(56, 56);
      container.setInteractive({ useHandCursor: true });

      const beeData = {
        container,
        sprite,
        wordObj,
        isCorrect: (wordObj.ko === currentTarget.ko),
        trajectory: trajectoryType,
        startX,
        baseY,
        dir: isRightToLeft ? -1 : 1,
        speed: 120 + Math.random() * 40,
        amp: 40 + Math.random() * 20,
        freq: 3 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
        zigzagTimer: 0,
        zigzagVy: 60
      };

      container.on('pointerdown', () => this.onBeeClicked(beeData));
      this.activeBees.push(beeData);
    });
  }

  onBeeClicked(bee) {
    this.totalClicks++;
    if (bee.isCorrect) {
      this.correctHits++;
      this.score += 100;
      if (typeof playChiptuneSFX === 'function') playChiptuneSFX('quiz_correct');

      if (this.pollenEmitter) {
        this.pollenEmitter.emitParticleAt(bee.container.x, bee.container.y, 16);
      }

      // Floating score animation
      const floatTxt = this.add.text(bee.container.x, bee.container.y - 20, '+100', {
        fontFamily: '"Press Start 2P", monospace', fontSize: '18px', color: '#FDE047', stroke: '#000', strokeThickness: 4
      }).setOrigin(0.5).setDepth(30);
      this.tweens.add({ targets: floatTxt, y: bee.container.y - 60, alpha: 0, duration: 800, onComplete: () => floatTxt.destroy() });

      this.currentWordIndex++;
      this.startNextWordRound();
    } else {
      this.score = Math.max(0, this.score - 20);
      if (typeof playChiptuneSFX === 'function') playChiptuneSFX('quiz_wrong');
      this.cameras.main.shake(150, 0.012);

      this.tweens.add({
        targets: bee.container,
        x: bee.container.x + 10,
        duration: 50,
        yoyo: true,
        repeat: 3
      });

      this.updateHUD();
    }
  }

  updateHUD() {
    const accuracy = this.totalClicks > 0 ? Math.round((this.correctHits / this.totalClicks) * 100) : 100;
    this.hudText.setText(`WORD: ${this.currentWordIndex + 1}/10 | SCORE: ${this.score} | ACCURACY: ${accuracy}%`);
  }

  update(time, delta) {
    const dt = delta / 1000;
    this.activeBees.forEach(b => {
      // Toggle animation frame
      const frameIdx = Math.floor(time / 140) % 2;
      b.sprite.setTexture(frameIdx === 0 ? 'bee_fly_0' : 'bee_fly_1');

      // Update positions according to trajectory
      b.container.x += b.dir * b.speed * dt;

      if (b.trajectory === 'sine') {
        b.container.y = b.baseY + Math.sin(time / 1000 * b.freq + b.phase) * b.amp;
      } else if (b.trajectory === 'zigzag') {
        b.container.y += b.zigzagVy * dt;
        if (b.container.y > b.baseY + 50) b.zigzagVy = -Math.abs(b.zigzagVy);
        if (b.container.y < b.baseY - 50) b.zigzagVy = Math.abs(b.zigzagVy);
      }

      // Screen wrapping
      if (b.dir === 1 && b.container.x > this.W + 80) b.container.x = -60;
      if (b.dir === -1 && b.container.x < -80) b.container.x = this.W + 60;
    });
  }

  showRoundSummary() {
    const accuracy = this.totalClicks > 0 ? Math.round((this.correctHits / this.totalClicks) * 100) : 100;
    
    // Background Overlay Box
    const box = this.add.rectangle(this.W / 2, this.H / 2, 440, 280, 0x0F172A, 0.92)
      .setStrokeStyle(4, 0xF59E0B).setDepth(200);

    const title = this.add.text(this.W / 2, this.H / 2 - 90, '🐝 MINIGAME COMPLETE!', {
      fontFamily: '"Press Start 2P", monospace', fontSize: '18px', color: '#FDE047'
    }).setOrigin(0.5).setDepth(201);

    const stats = this.add.text(this.W / 2, this.H / 2 - 20, 
      `FINAL SCORE: ${this.score}\nACCURACY: ${accuracy}%\nWORDS CLEARED: 10/10`, {
      fontFamily: '"Press Start 2P", monospace', fontSize: '14px', color: '#FFFFFF', align: 'center', lineSpacing: 12
    }).setOrigin(0.5).setDepth(201);

    const closeBtn = this.add.text(this.W / 2, this.H / 2 + 75, '[ RETURN TO FARM ]', {
      fontFamily: '"Press Start 2P", monospace', fontSize: '14px', color: '#4ADE80', backgroundColor: '#1E293B', padding: { x: 12, y: 8 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(201);

    closeBtn.on('pointerdown', () => this.exitGame());
  }

  exitGame() {
    if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop();
      this.scene.resume('FarmScene');
    });
  }
}
```
