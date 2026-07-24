# Analysis Report: Visual Environment Harmony, Entity Scaling, Synchronization & Verification

**Agent**: Explorer 3  
**Milestone**: Milestone 1 – Main Character Redesign  
**Project**: Hangeul Valley (`d:\Hangeul Valley`)  
**Date**: 2026-07-24  

---

## 1. Executive Summary

This investigation analyzed `d:\Hangeul Valley\game.js` and `d:\Hangeul Valley\assets\game.js` to establish exact environmental scaling metrics, evaluate asset synchronization protocols, document build/syntax verification procedures, and identify potential visual distortion and layering conflicts when shifting the player character to **Stardew Valley 1:2 Chibi style**.

### Core Findings Summary:
1. **Canonical Asset Source & Sync**: `d:\Hangeul Valley\game.js` is the single source of truth. `main.py` (lines 95–103) automatically copies `game.js` to `assets/game.js` on startup. Manual changes to `assets/game.js` risk being overwritten.
2. **Current Player Proportions**: The player sprite is generated from a `16x16` pixel matrix (`ps=3` -> `48x48px` base texture) and scaled by `1.8` in-game (`86.4px x 86.4px` display size).
3. **Environment Scale Harmony**: Surrounding entities range from `36px` tall (Muop the Cat NPC @ `0.75x`) to `86.4px` tall (Wizard Merlin @ `1.8x`) and `172.8px` tall (Apple Tree @ `3.6x`).
4. **1:2 Chibi Transition Risks**: Transitioning the player matrix to 1:2 Chibi (e.g., `16x32` pixels) without adjusting `setScale`, `originY`, physics `setOffset`, and dynamic depth sorting will cause character blow-up (172.8px giant), collision box displacement to waist height, tool/shadow misalignment, and z-ordering clipping.

---

## 2. Detailed Environment Entity Metrics

All procedural textures are generated via `PixelArtRenderer.createTexture()` using base pixel size `ps = 3` (1 matrix cell = 3x3 canvas pixels).

| Entity | Texture Key(s) | Base Matrix (WxH) | Base Texture Size (ps=3) | In-Game Scale | Display Dimensions (WxH) | Origin (X, Y) | Collision / Trigger Box | Depth Sorting Anchor | Interaction Radius |
|---|---|---|---|---|---|---|---|---|---|
| **Player (Current)** | `player_walk_*` | 16 x 16 | 48 x 48 px | `1.8` | **86.4 x 86.4 px** | `(0.5, 0.5)` | Body: `24x16 px`<br>Offset: `(12, 32)` | `player.y + displayHeight * 0.5` | N/A |
| **Farm Plots** | `drt_dry`, `drt_wet` | 16 x 16 | 48 x 48 px | DisplaySize `(48,48)` | **48.0 x 48.0 px** | `(0.5, 0.5)` | Circle Radius: `19.2 px` (`0.4 * PLOT_SIZE`) | `p.y + 10` (for crops) | `74 px` (`PLOT_SIZE + 26`) |
| **Apple Tree** | `apple_tree`, `apple_tree_ripe` | 16 x 16 | 48 x 48 px | `3.6` | **172.8 x 172.8 px** | `(0.5, 1.0)` | Static Zone: `100x48 px`<br>Offset: `(ax, ay - 10)` | `ay + 1` (`this.appleY`) | Harvest prompt trigger |
| **Muop the Cat NPC** | `cat_npc`, `cat_idle_*`, `cat_walk_*` | 16 x 16 | 48 x 48 px | `0.75` | **36.0 x 36.0 px** | `(0.5, 1.0)` | N/A | `cy` (`this.catY`) | `65 px` |
| **Merlin NPC** | `wizard_npc`, `wizard_idle_*` | 16 x 16 | 48 x 48 px | `1.8` | **86.4 x 86.4 px** | `(0.5, 1.0)` | N/A | `wy` (`this.wizardY`) | `85 px` |
| **Shop Sign / NPC** | `shop_sign` | 14 x 18 | 42 x 54 px | `1.3` | **54.6 x 70.2 px** | `(0.5, 1.0)` | N/A | `sy` (`this.shopY`) | `90 px` |
| **Fishing Dock** | `fishing_dock` | 24 x 18 | 72 x 54 px | `1.6` | **115.2 x 86.4 px** | `(0.5, 1.0)` | N/A | `fy` (`this.fishY`) | Dock trigger zone |
| **Notice Board** | `notice_board` | 18 x 16 | 54 x 48 px | `1.3` | **70.2 x 62.4 px** | `(0.5, 1.0)` | N/A | `by` (`this.boardY`) | `80 px` |
| **Arcade Machine** | `arcade_machine` | 16 x 20 | 48 x 60 px | `1.5` | **72.0 x 90.0 px** | `(0.5, 1.0)` | N/A | `ay` (`this.arcadeY`) | `80 px` |
| **Dungeon Portal** | `dungeon_portal` | 20 x 24 | 60 x 72 px | `1.6` | **96.0 x 115.2 px** | `(0.5, 1.0)` | N/A | `py` (`this.portalY`) | Portal trigger zone |

---

## 3. Code Evidence & Source References

### A. Player Creation & Physics (`game.js`, lines 8476–8489)
```javascript
_createPlayer(W, H){
  this.player = this.physics.add.sprite(W/2, H-80, 'player_walk_down_0')
    .setScale(1.8)
    .setCollideWorldBounds(true).setDrag(900,900).setDepth(500);
  this.player.body.setSize(24, 16).setOffset(12, 32);
  if (this.shadows) {
    this.pShadow = this.shadows.createShadow(this.player, 58, 18, 32);
  }
}
```

### B. Player Depth Sorting (`game.js`, lines 8501–8502)
```javascript
const playerBaseY = this.player.y + (this.player.displayHeight * (1 - this.player.originY));
this.player.setDepth(playerBaseY);
```

### C. NPC & World Depth Sorting (`game.js`, lines 8514–8521)
```javascript
if (this.shopNPC) this.shopNPC.setDepth(this.shopY || this.shopNPC.y);
if (this.boardSprite) this.boardSprite.setDepth(this.boardY || this.boardSprite.y);
if (this.arcadeSprite) this.arcadeSprite.setDepth(this.arcadeY || this.arcadeSprite.y);
if (this.wizardSprite) this.wizardSprite.setDepth(this.wizardY || this.wizardSprite.y);
if (this.catSprite) this.catSprite.setDepth(this.catY || this.catSprite.y);
if (this.portalSprite) this.portalSprite.setDepth(this.portalY || this.portalSprite.y);
if (this.dockSprite) this.dockSprite.setDepth(this.fishY || this.dockSprite.y);
if (this.appleTreeSprite) this.appleTreeSprite.setDepth(this.appleY || this.appleTreeSprite.y);
```

### D. Automated Asset Synchronization in `main.py` (lines 95–103)
```python
# Synchronize root asset files to assets/ directory
import shutil
assets_dir = os.path.join(BASE_DIR, 'assets')
os.makedirs(assets_dir, exist_ok=True)
for fname in ('game.js', 'index.html', 'levels.json', 'save_data.json'):
    src = os.path.join(BASE_DIR, fname)
    dst = os.path.join(assets_dir, fname)
    if os.path.exists(src):
        shutil.copy2(src, dst)
print("[Sync] Root asset files successfully synchronized to assets/ directory.")
```

---

## 4. Stardew Valley 1:2 Chibi Style Transition Impact Analysis

When shifting player proportions from the current **16x16 (1:1 square)** matrix to a **16x32 (1:2 tall Chibi)** matrix:

### 1. Frame Matrix Grid & Truncation
- If `createTexture()` is called with default `width = 16, height = 16`, any 32-row matrix will be cut off.
- `createTexture()` calls for player frames must explicitly pass `width = 16, height = 32`.

### 2. Scale Factor Blowup (`setScale(1.8)`)
- Base texture size for 16x32 @ `ps=3` is `48px wide x 96px tall`.
- Applying `setScale(1.8)` yields `48 * 1.8 = 86.4px` wide by `96 * 1.8 = 172.8px` tall!
- **Visual Disruption**: A 172.8px tall player will be twice as tall as Wizard Merlin (86.4px), equal in height to the Apple Tree (172.8px), and nearly 5 times the size of Muop the Cat (36px).
- **Target Scale Adjustment**: Scale factor MUST be reduced to `0.9` (if `ps=3`, `96 * 0.9 = 86.4px`) or `1.0` (if `ps=2.7`, `86.4px`) to preserve scale harmony with Merlin and the environment.

### 3. Origin & Depth Sorting Misalignment
- Currently, NPCs use `originY = 1.0` (feet anchor) and depth = `y`.
- Player uses `originY = 0.5` (center anchor) and depth = `player.y + displayHeight * 0.5`.
- As character height expands to 96px+, using `originY = 0.5` causes visual clipping when walking behind tall objects like the Apple Tree, Wizard Merlin, or Notice Board.
- **Fix**: Standardize player origin to `setOrigin(0.5, 1.0)` and depth sorting to `setDepth(this.player.y)`.

### 4. Arcade Physics Hitbox Misalignment
- Current physics body: `setSize(24, 16).setOffset(12, 32)` (calibrated for 48x48 base texture).
- For a 48x96 base texture, `setOffset(12, 32)` places the collision box at the character's *stomach/waist* rather than feet!
- **Fix**: Recalibrate offset to `setOffset(12, 80)` (for 48x96px texture @ ps=3) to keep collision anchored at the feet.

### 5. Tool, Pet, Shadow & Visual FX Offsets
- Tool offset: `player.y - 6`
- Pet target Y: `player.y + 10`
- Walking dust puff: `player.y + 14`
- Shadow Y offset: `32`
- Changing player sprite origin or height requires re-anchoring these offsets to match the hand and feet positions of the new 1:2 Chibi frame.

---

## 5. Synchronization & Build Verification Procedures

### Rules for Asset Synchronization:
1. **Primary Workspace**: Always edit `d:\Hangeul Valley\game.js`.
2. **Synchronization Action**: Copy `game.js` to `assets/game.js` after edits, or launch `python main.py` to trigger auto-sync.
3. **Integrity Validation**: Ensure SHA256 hashes match across both files.

### Verification Checklist & Commands:
```bash
# 1. Check JavaScript syntax of root file
node -c game.js

# 2. Check JavaScript syntax of assets file
node -c assets/game.js

# 3. Verify SHA256 file hash identity
powershell -Command "Get-FileHash game.js, assets/game.js | Format-Table -AutoSize"

# 4. Run automated matrix & texture validation test harness
node test_m2_harness.js
```

---

## 6. Recommendations for Implementation Team

1. **Maintain Target Player Height**: Keep total rendered player height between **84px and 88px** (matching Wizard Merlin at 86.4px).
   - If matrix is 16x32 @ ps=3 (48x96px base), set scale to `0.9` (`86.4px` display height).
2. **Standardize Feet Anchor**: Update `_createPlayer()` to `.setOrigin(0.5, 1.0)`. Update player Y-sorting in `update()` to `this.player.setDepth(this.player.y)`.
3. **Update Physics Hitbox**: Set Arcade body to `this.player.body.setSize(24, 16).setOffset(12, 80)` (for 16x32 @ ps=3).
4. **Recalibrate Accessory Offsets**:
   - Shadow offset: `this.pShadow = this.shadows.createShadow(this.player, 58, 18, 0);`
   - Tool render offset: `toolSprite = this.add.image(this.player.x + offsetX, this.player.y - 42, toolKey);`
5. **Run Verification Protocol**: Always execute syntax check `node -c game.js`, copy to `assets/game.js`, and verify hashes before completing tasks.
