# Explorer 2 Handoff Report: BeeScene Minigame Architecture & Implementation Design

## 1. Observation
- **File Analyzed**: `d:\Hangeul Valley\game.js`
- **Phaser Scene Classes**:
  - `FarmScene` (Line 7269): `class FarmScene extends Phaser.Scene { constructor(){ super({key:'FarmScene'}); } ... }`
  - `ArcadeScene` (Line 9386): `class ArcadeScene extends Phaser.Scene { constructor(){ super({key:'ArcadeScene'}); } ... }`
  - `DungeonScene` (Line 9828): `class DungeonScene extends Phaser.Scene { constructor(){ super({key:'DungeonScene'}); } ... }`
  - `FishingScene` (Line 10292): `class FishingScene extends Phaser.Scene { constructor(){ super({key:'FishingScene'}); } ... }`
- **Phaser Game Config**:
  - Line 10701-10711:
    ```javascript
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
    const game=new Phaser.Game(config);
    ```
- **Procedural Texture Generation System**:
  - Line 214: `class PixelArtRenderer` containing static method `createTexture(scene, key, matrix, palette, width, height, ps)` and `generateAllTextures(scene)` (Line 247).
- **Scene Transition Logic in `FarmScene`**:
  - Line 9086-9087: `this.scene.pause(); this.scene.launch('DungeonScene');`
  - Line 9098-9099: `this.scene.pause(); this.scene.launch('FishingScene');`
  - Line 9110-9111: `this.scene.pause(); this.scene.launch('ArcadeScene');`
  - Minigame Exits (Lines 9816-9817, 10280-10281, 10656-10657): `this.scene.stop(); this.scene.resume('FarmScene');`
- **Audio Synthesizer Engine**:
  - Lines 15-106: `ChiptuneSynthEngine` with `playChiptuneSFX(type)` supporting `'quiz_correct'`, `'quiz_wrong'`, `'harvest'`, `'click'`.
- **Vocabulary Source & Unlocked Levels**:
  - Line 4211, 9482, 10731: `const allWords = unlockedLevels.flatMap(idx => levelsData[idx]?.words || []);`
- **Syntax Check Verification Command**:
  - Executed `node -c game.js`: stdout empty, exit code 0 (zero errors).

---

## 2. Logic Chain
1. **Observation 1 (Scene Architecture)**: All existing minigame scenes (`ArcadeScene`, `DungeonScene`, `FishingScene`) inherit from `Phaser.Scene`, instantiate with `super({ key: 'SceneName' })`, invoke `PixelArtRenderer` texture generation in `preload()`, and build world, UI, input listeners, and state in `create()`.
   - **Inference**: `BeeScene` must follow this exact class structure with `super({ key: 'BeeScene' })`.
2. **Observation 2 (Registration)**: `new Phaser.Game(config)` maintains an explicit `scene` array: `scene: [FarmScene, ArcadeScene, DungeonScene, FishingScene]`.
   - **Inference**: To make `BeeScene` available to Phaser's SceneManager, `BeeScene` must be added to this array as `scene: [FarmScene, ArcadeScene, DungeonScene, FishingScene, BeeScene]`.
3. **Observation 3 (Texture Baking)**: `PixelArtRenderer.generateAllTextures(scene)` bakes all pixel-art textures when a scene loads.
   - **Inference**: Adding `_genBeeTextures(scene)` to `PixelArtRenderer` ensures `bee_fly_0`, `bee_fly_1`, `p_pollen`, and `p_honey_drip` are available across all scenes.
4. **Observation 4 (Flight Math)**: Updating sprite positions in `update(time, delta)` allows applying mathematical position equations per frame:
   - Linear Glide: $x = x_0 + v_x \cdot t$
   - Sine Wave: $y = \text{baseY} + \sin(\omega t + \phi) \cdot A$
   - Zigzag: Alternating $v_y$ direction every $T$ seconds or at screen boundary bounds.
5. **Observation 5 (Interactivity & Round Flow)**: Using `Phaser.GameObjects.Container` containing a sprite and text label allows atomic movement and click detection (`container.setInteractive()`). Fetching `unlockedLevels.flatMap(...)` provides level-appropriate vocabulary. Correct hits trigger `playChiptuneSFX('quiz_correct')` and particle emitters; wrong hits trigger `playChiptuneSFX('quiz_wrong')`, camera shake, and accuracy penalties. Round loop completes at 10 words.
6. **Observation 6 (Syntax Verification)**: `node -c game.js` verifies JavaScript parsing without running runtime side-effects.

---

## 3. Caveats
- **Dual-File Synchronization**: Changes in `game.js` must eventually be mirrored in `assets/game.js` during Milestone 3 (or by dual-file writers).
- **Phaser Particle Emitter Compatibility**: `this.add.particles` API in Phaser 3 varies across sub-versions (e.g. `add.particles(x, y, key, config)` vs `add.particles(key).createEmitter(config)`). The code blueprint wraps particle emitter creation in a `try/catch` block for defensive compatibility.
- **Font Availability**: Uses fallback font stack `"Press Start 2P", "Galmuri11", sans-serif` for Korean character rendering on canvas text objects.

---

## 4. Conclusion
`BeeScene` can be cleanly integrated into `game.js` without breaking any existing scene or system. The implementation design provided in `analysis.md` gives Implementer 2 (R2) exact code structures for:
1. `BeeScene` class definition and registration in `config.scene`.
2. `PixelArtRenderer._genBeeTextures` method for procedural pixel-art bee textures and particle assets.
3. 3 flight trajectory algorithms (linear, sine, zigzag).
4. Container-based entity management with interactive click detection, Korean text overlays, audio/visual hit effects, and 10-word round summary flow.

---

## 5. Verification Method
- **Command Verification**: Run `node -c game.js` from `d:\Hangeul Valley`. Output must be clean with return code 0.
- **File Inspection**: Verify `analysis.md` and `handoff.md` in `d:\Hangeul Valley\.agents\teamwork_preview_explorer_m1_2`.
- **Code Inspection**:
  - Check `game.js` for `class BeeScene extends Phaser.Scene`.
  - Check `config.scene` array includes `BeeScene`.
  - Check `PixelArtRenderer` contains `_genBeeTextures`.
