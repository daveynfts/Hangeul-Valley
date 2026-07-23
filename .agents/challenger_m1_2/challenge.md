# Challenge Report: Milestone R1 — PixelArtRenderer & Character System

## Challenge Summary

**Overall risk assessment**: MEDIUM

As Challenger 2 for Milestone R1 (Procedural 48x48 Pixel Art Sprite Renderer & Character System), empirical stress testing was conducted across texture creation performance, texture memory allocation, texture key collision risks, and file synchronization between `game.js` and `assets/game.js`.

Both `node -c game.js` and `node -c assets/game.js` passed syntax checks with 0 errors, and root `game.js` is currently 100% byte-for-byte identical with `assets/game.js`. Texture creation performance and memory footprints are well within safe bounds (~1.85 ms batch creation time, ~990 KB raw RGBA pixel memory for 110 textures).

However, empirical test harnesses revealed three significant failure modes:
1. **Internal Redundant Texture Creation**: 10 crop texture keys are generated twice within `PixelArtRenderer._genCropAndTreeTextures()`, forcing Phaser to destroy and recreate them during initialization.
2. **Dimension & Key Conflicts**: 7 texture keys (`apple_tree`, `apple_tree_ripe`, `drt_dry`, `drt_wet`, `fishing_dock`, `wizard_npc`, `cat_npc`) conflict in dimensions between `PixelArtRenderer` (uniform 48x48 px) and legacy `_bakeTextures()` (e.g. 54x90 px for trees, 72x48 px for dock).
3. **Dormant System**: `PixelArtRenderer.generateAllTextures(scene)` is defined at line 150 of `game.js` but is **never invoked** by any scene in `game.js`, leaving the new system dormant.

---

## Challenges

### [Medium] Challenge 1: Internal Texture Key Redundancy & Double Creation

- **Assumption challenged**: `PixelArtRenderer.generateAllTextures(scene)` generates each procedural texture key exactly once per scene initialization.
- **Attack scenario**: During `PixelArtRenderer._genCropAndTreeTextures(scene)`, line 768–771 generates `crop_${name}_0..3` inside a `crops.forEach()` loop. Immediately after (lines 779–788), explicit duplicate calls `this.createTexture(scene, 'crop_cabbage_0', c0, P)` (and 9 others) are hardcoded.
- **Blast radius**: When `createTexture` is called for an existing key, Phaser executes `scene.textures.remove(key)`, destroying the existing texture object, allocating canvas graphics again, re-executing 256 pixel draw calls, and generating the texture a second time. This causes 10 unnecessary texture allocations and texture manager churn every time textures are baked.
- **Mitigation**: Remove the redundant explicit calls on lines 779–788 in `PixelArtRenderer._genCropAndTreeTextures()`.

---

### [High] Challenge 2: Dimension & Key Mismatch Between PixelArtRenderer and Legacy `_bakeTextures()`

- **Assumption challenged**: `PixelArtRenderer`'s 48x48 sprite key names align seamlessly with existing sprite usage in `FarmScene` and other game scenes.
- **Attack scenario**: Legacy `_bakeTextures()` in `FarmScene` (lines 3011–3306) generates 29 textures with non-48x48 aspect ratios (e.g. `apple_tree` at 18*PS x 30*PS = 54x90 px, `fishing_dock` at 24*PS x 16*PS = 72x48 px, `wizard_npc` at 16*PS x 22*PS = 48x66 px, `cat_npc` at 13*PS x 16*PS = 39x48 px). `PixelArtRenderer` generates all of these keys as uniform 48x48 px textures.
- **Blast radius**: If `PixelArtRenderer.generateAllTextures(scene)` is called alongside legacy `_bakeTextures()`, the second method to run will overwrite the textures of the first. Replacing 54x90 tree textures or 72x48 dock textures with 48x48 textures distorts sprite aspect ratios, causing visible stretching, squishing, or misaligned collision hitboxes.
- **Mitigation**: Harmonize key names or matrix dimensions between `PixelArtRenderer` and legacy `_bakeTextures()`, or deprecate legacy texture generation in favor of `PixelArtRenderer`.

---

### [High] Challenge 3: Uninvoked (Dormant) PixelArtRenderer Call Site

- **Assumption challenged**: `PixelArtRenderer` actively handles character and sprite rendering during gameplay.
- **Attack scenario**: `PixelArtRenderer` class is declared at line 117 of `game.js`, but `PixelArtRenderer.generateAllTextures(scene)` is **never called** anywhere in `game.js`, `index.html`, or `main.py`. `FarmScene.create()` continues to invoke `this._bakeTextures()` (line 2967).
- **Blast radius**: The entire procedural 48x48 Pixel Art Sprite Renderer & Character System remains unexecuted in production runtime. Features like 4-direction 12-frame player walk cycles (`player_walk_down_0..2`) are created in code but never loaded or animated in the active game.
- **Mitigation**: Replace `this._bakeTextures()` in `FarmScene.create()` and other scenes with `PixelArtRenderer.generateAllTextures(this)`.

---

### [Low] Challenge 4: Absence of Automated Build Sync for `assets/game.js`

- **Assumption challenged**: Changes in root `game.js` are guaranteed to be in sync with `assets/game.js`.
- **Attack scenario**: Developer edits root `game.js` but forgets to manually copy the changes to `assets/game.js`.
- **Blast radius**: `assets/game.js` drifts out of sync. Depending on whether Vercel, static servers, or pywebview serve from `./` or `./assets`, users will see stale code or runtime errors.
- **Mitigation**: Add a build script or pre-commit hook (e.g. `npm run sync` or a Node script) that verifies or copies `game.js` to `assets/game.js`.

---

## Stress Test Results

| Test Scenario | Expected Result | Actual Empirical Result | Status |
|---|---|---|---|
| Syntax Check (`game.js`) | Exit Code 0 | Exit Code 0 (0 errors) | **PASS** |
| Syntax Check (`assets/game.js`) | Exit Code 0 | Exit Code 0 (0 errors) | **PASS** |
| Root vs Assets File Sync | 100% Byte Match | Both files 281,620 bytes (equals=true) | **PASS** |
| Initial Texture Generation Batch | < 50 ms | 1.650 ms (110 texture creations) | **PASS** |
| Un-cached Re-bake Performance | Fast execution | 0.251 ms average across 100 batches | **PASS** |
| Re-bake Guard Check (`_pixelArtTexturesBaked`) | Near-instant bypass | 0.0018 ms execution time | **PASS** |
| Texture Key Uniqueness (Internal) | 110 unique keys | 100 unique keys (10 duplicates) | **FAIL (WARN)** |
| Cross-System Key & Dimension Match | 0 dimension conflicts | 7 overlapping keys with mismatched px sizes | **FAIL** |
| Call Site Integration | Active invocation | 0 call sites found in `game.js` | **FAIL** |
| Memory Footprint (110 textures) | Safe RAM usage | 1,013,760 bytes (~990 KB) raw pixel RAM | **PASS** |

---

## Unchallenged Areas

- **Phaser WebGL GPU Canvas Context Loss**: Stress testing focused on Node.js/headless texture data structures. GPU WebGL context loss recovery was not tested due to headless environment constraints.
- **Save State & Level Progress Compatibility**: Tested sprite renderer generation only; level saving/loading interactions were out of scope for Challenger 2.
