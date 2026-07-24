# Comprehensive Technical Analysis: Industrial Yellow Farmer Robot Action Frames, Tool Sprites & Player Mechanics

**Milestone**: Milestone 1 — Industrial Yellow Farmer Pixel Robot Replacement & Integration  
**Agent**: Explorer 3 (`teamwork_preview_explorer_m1_3`)  
**Date**: 2026-07-24  
**Target Files**: `d:\Hangeul Valley\game.js` and `d:\Hangeul Valley\assets\game.js`  

---

## Executive Summary
This analysis details the technical architecture, matrix definitions, animation registrations, tool sprite integration, legacy aliases, file synchronization requirements, and physical rendering mechanics (scale, shadows, depth sorting, hitboxes) for the **Industrial Yellow Farmer Pixel Robot** character replacement in `game.js` and `assets/game.js`. 

Key findings include:
1. **Action Frame & Tool Sprites Location**: `PixelArtRenderer._genPlayerTextures(scene)` (lines 1313–1891 in `game.js`) defines 9 action matrices (`player_water_down_0..2`, `player_harvest_down_0..2`, `player_pick_down_0..2`), 3 standalone tool matrices (`tool_watering_can`, `tool_basket`, `tool_sickle`), 4 legacy aliases (`farmer0..3`), and 7 animation sequence registrations (`player-walk-down/up/left/right`, `player-water`, `player-harvest`, `player-pick`).
2. **Action Invocation Logic**: `FarmScene.playPlayerAction(actionType, targetX, targetY, callback)` (lines 8156–8212) triggers player action animations (`player-water`, `player-harvest`, `player-pick`) while dynamically instantiating standalone tool sprites (`tool_watering_can`, `tool_sickle`, `tool_basket`) attached to the player's hands with offset `(±12, -6)` and `player.depth + 1`.
3. **Legacy Filter Maintenance**: `farmer0..3` aliases are registered at lines 1864–1867 (`farmer0` = `down_0`, `farmer1` = `down_1`, `farmer2` = `down_0`, `farmer3` = `down_2`) and explicitly set to `FilterMode.NEAREST` in `FarmScene` (lines 7570–7575).
4. **Physical Rendering Dynamics**:
   - Base texture size: $48 \times 48\text{ px}$ ($16 \times 16$ grid with $PS=3$).
   - Overworld scale: $1.8\times$ (effective display size: $86.4 \times 86.4\text{ px}$).
   - Physics hitbox: $24 \times 16\text{ px}$ set with offset $(12, 32)$ (foot-anchored).
   - Dynamic shadows: `DynamicShadowSystem.createShadow(player, 58, 18, 32)` creates an ground footprint beneath treads with depth $Y-1$.
   - Y-sort depth formula: `playerBaseY = player.y + (displayHeight * (1 - originY)) = player.y + 43.2`.
5. **File Synchronization**: `game.js` and `assets/game.js` must remain byte-for-byte identical (SHA256 checksum matched) with 0 syntax errors (`node -c`).

---

## 1. Action Frames, Tool Sprites & Legacy Aliases Inspection

### 1.1. Action Frame Matrices & Animation Registrations
`_genPlayerTextures(scene)` defines 9 action frame matrices ($16 \times 16$ single-character token arrays):

| Texture Key | Line Range (`game.js`) | Function / Motion Description | Palette Color Tokens | Animation Key & Config |
|---|---|---|---|---|
| `player_water_down_0` | 1615–1632 | Hydro-dispenser ready posture | `K`, `k`, `z`, `Z`, `q`, `Q`, `g`, `F`, `n`, `M`, `d` | `player-water` frame 1 |
| `player_water_down_1` | 1633–1650 | Dispensing fluid nozzle stream | `K`, `k`, `z`, `Z`, `q`, `Q`, `U`, `u`, `W`, `M`, `d` | `player-water` frames 2 & 4 |
| `player_water_down_2` | 1651–1668 | Fluid spray impact & ground splash | `K`, `k`, `z`, `Z`, `q`, `Q`, `U`, `u`, `W`, `M`, `d` | `player-water` frame 3 |
| `player_harvest_down_0` | 1670–1687 | Crouching lower chassis to crop level | `K`, `k`, `z`, `Z`, `q`, `Q`, `g`, `F`, `X`, `x` | `player-harvest` frame 1 |
| `player_harvest_down_1` | 1688–1705 | Plasma cutter slicing stalk into basket | `K`, `k`, `z`, `Z`, `q`, `Q`, `G`, `A`, `a`, `D`, `j` | `player-harvest` frame 2 |
| `player_harvest_down_2` | 1706–1723 | Lifting cargo container overhead | `K`, `k`, `z`, `Z`, `q`, `Q`, `t`, `T`, `G`, `A`, `a` | `player-harvest` frame 3 |
| `player_pick_down_0` | 1725–1742 | Hydraulic arm reaching upward | `K`, `k`, `z`, `Z`, `q`, `Q`, `g`, `F`, `X`, `x` | `player-pick` frame 1 |
| `player_pick_down_1` | 1743–1760 | Manipulator claw grabbing high fruit | `K`, `k`, `z`, `Z`, `q`, `Q`, `a`, `K`, `D`, `g`, `F` | `player-pick` frame 2 |
| `player_pick_down_2` | 1761–1778 | Arm retracting into shoulder cargo bay | `K`, `k`, `z`, `Z`, `q`, `Q`, `g`, `F`, `X`, `x` | `player-pick` frame 3 |

Animation creation code in `game.js` (lines 1882–1889):
```javascript
const regOnce = (key, frames, fps = 6) => {
  if (!anims.exists(key)) {
    anims.create({ key, frames: frames.map(f => ({ key: f })), frameRate: fps, repeat: 0 });
  }
};
regOnce('player-water', ['player_water_down_0', 'player_water_down_1', 'player_water_down_2', 'player_water_down_1']);
regOnce('player-harvest', ['player_harvest_down_0', 'player_harvest_down_1', 'player_harvest_down_2']);
regOnce('player-pick', ['player_pick_down_0', 'player_pick_down_1', 'player_pick_down_2']);
```

### 1.2. Standalone Tool Sprites
The 3 standalone tool sprite matrices rendered during action execution:

| Texture Key | Lines (`game.js`) | Dimensions | Color Palette & Graphic Structure | Attached In Code |
|---|---|---|---|---|
| `tool_watering_can` | 1781–1798 | $16 \times 16$ | Metal body (`M`, `d`, `m`), copper spout (`n`), cyan water drop (`U`, `W`) | `FarmScene.playPlayerAction('water')` |
| `tool_basket` | 1799–1816 | $16 \times 16$ | Wicker body (`Y`, `y`, `j`), filled red apples (`A`, `a`, `D`), green leaves (`G`) | `FarmScene.playPlayerAction('pick')` |
| `tool_sickle` | 1817–1834 | $16 \times 16$ | Metal curved blade (`C`, `c`, `M`, `d`), wood handle (`e`, `E`, `n`) | `FarmScene.playPlayerAction('harvest')` |

Invocation logic in `FarmScene` (lines 8174–8183):
```javascript
const toolKey = actionType === 'water' ? 'tool_watering_can' :
                actionType === 'harvest' ? 'tool_sickle' :
                actionType === 'pick' ? 'tool_basket' : null;

let toolSprite = null;
if (toolKey && this.textures && this.textures.exists(toolKey)) {
  const offsetX = this.player.flipX ? -12 : 12;
  toolSprite = this.add.image(this.player.x + offsetX, this.player.y - 6, toolKey)
    .setDepth(this.player.depth + 1);
}
```

### 1.3. Legacy Aliases
Legacy texture aliases registered in `game.js` (lines 1864–1867):
```javascript
this.createTexture(scene, 'farmer0', down_0, P);
this.createTexture(scene, 'farmer1', down_1, P);
this.createTexture(scene, 'farmer2', down_0, P);
this.createTexture(scene, 'farmer3', down_2, P);
```
And explicitly filtered in `game.js` (lines 7570–7575):
```javascript
for (let fr = 0; fr < 4; fr++) {
  const t = this.textures.get('farmer' + fr);
  if (t && typeof Phaser !== 'undefined' && Phaser.Textures && Phaser.Textures.FilterMode) {
    t.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
}
```
*Requirement*: When replacing `_genPlayerTextures`, these 4 `farmer0..3` creation calls and filter applications MUST be preserved without modification to guarantee zero disruption to legacy texture lookups.

---

## 2. Scale, Shadow, Depth Sorting & Hitbox Mechanics Inspection

### 2.1. Player Scale Harmony
- **Overworld (`FarmScene`)**: `this.player.setScale(1.8)` (line 8478).
  - Unscaled matrix texture: $48 \times 48\text{ px}$ ($16\text{ px} \times PS=3$).
  - Rendered display dimensions: $48 \times 1.8 = 86.4\text{ px} \times 86.4\text{ px}$.
  - Horizontal flip logic: `this.player.setScale(vx < 0 ? -1.8 : 1.8, 1.8)` (line 8544).
- **Dungeon (`DungeonScene`)**: `this.player.setScale(1.0)` ($48 \times 48\text{ px}$).
- **Fishing (`FishingScene`)**: `this.player.setScale(1.0)` ($48 \times 48\text{ px}$).

### 2.2. Dynamic Shadow Rendering (`DynamicShadowSystem`)
- Defined in `class DynamicShadowSystem` (lines 6786–6992).
- Initialized in `FarmScene` (line 8482):
  ```javascript
  this.pShadow = this.shadows.createShadow(this.player, 58, 18, 32);
  ```
  - `baseW = 58` (width of shadow ellipse, ~67% of sprite width $86.4\text{ px}$).
  - `baseH = 18` (height of shadow ellipse).
  - `offsetY = 32` (vertical offset from sprite center $(x, y)$, placing shadow beneath treads).
- Per-frame update (line 8504): `this.shadows.updateShadow(this.pShadow, sunAngle, hour)`.
- Solar math skews the shadow ellipse dynamically based on `DayNightSystem` time of day.
- Static shadow fallback (line 8484): `this.add.ellipse(this.player.x, this.player.y + 32, 58, 18, 0x000000, 0.35).setDepth(499)`.

### 2.3. Y-Sort Depth Sorting
- Code in `FarmScene.update()` (lines 8501–8502):
  ```javascript
  const playerBaseY = this.player.y + (this.player.displayHeight * (1 - this.player.originY));
  this.player.setDepth(playerBaseY);
  ```
- Formula evaluation:
  - Origin: $(0.5, 0.5)$.
  - `displayHeight`: $86.4\text{ px}$.
  - `playerBaseY`: $y + 86.4 \times 0.5 = y + 43.2\text{ px}$ (the bottom edge foot line of the robot).
- All crops, apple trees, NPCs, shops, and buildings sort depth against their respective bottom Y coordinates. This allows the top half of the robot (visor, antenna, upper casing) to naturally pass behind trees and structures when walking above them.

### 2.4. Collision Hitboxes
- Code in `FarmScene` (line 8480):
  ```javascript
  this.player.body.setSize(24, 16).setOffset(12, 32);
  ```
- Physics body specs:
  - Unscaled width: $24\text{ px}$, unscaled height: $16\text{ px}$.
  - Unscaled offset: $X = 12\text{ px}$, $Y = 32\text{ px}$.
  - At $1.8\times$ scale, the physics bounding box spans effective size $43.2\text{ px} \times 28.8\text{ px}$, anchored directly on the tread base.
  - Keeps upper body collision-free for natural top-down depth overlapping.

---

## 3. File Synchronization Requirements

- **Primary Source File**: `d:\Hangeul Valley\game.js`
- **Asset Mirror File**: `d:\Hangeul Valley\assets\game.js`
- **Synchronization Constraint**:
  - `game.js` and `assets/game.js` MUST contain identical code for `_genPlayerTextures` and all player rendering logic.
  - Both files MUST pass `node -c` with 0 syntax errors.
  - SHA256 hashes of `game.js` and `assets/game.js` MUST match.

---

## 4. Industrial Yellow Farmer Robot Specification Design

To fully transform the human farmer into the **Industrial Yellow Farmer Pixel Robot**, the action frames, tool sprites, and legacy aliases must follow this unified design specification:

### 4.1. Color Palette Definitions (Robot Theme)

```javascript
const P = {
  '.': null,       // Transparent background
  'K': 0x0F172A,   // Dark Slate silhouette outline (1px boundary)
  'k': 0x1E293B,   // Inner dark joint/shadow line
  '0': 0x0F172A,   // Deep underchassis black

  // Industrial Yellow Casing
  'Y': 0xFACC15,   // Vibrant yellow highlight
  'y': 0xEAB308,   // Main industrial yellow casing base
  'v': 0xCA8A04,   // Casing shadow / amber tone
  'V': 0xA16207,   // Deep casing bevel shadow

  // Metallic Slate Body & Mechanics
  'm': 0x94A3B8,   // Light steel metallic highlight
  'M': 0x64748B,   // Slate metal base
  'd': 0x475569,   // Dark slate metal shadow
  'J': 0x334155,   // Chassis joint base

  // Glowing LED Visor & Interface Display
  'W': 0xFFFFFF,   // LED visor sparkle highlight
  'U': 0x38BDF8,   // Glowing cyan LED visor display
  'u': 0x06B6D4,   // Cyan LED mid screen
  'N': 0x0284C7,   // Dark cyan screen frame border

  // Antenna & Status Light
  'R': 0xEF4444,   // Red indicator light (active/scan mode)
  'r': 0xB91C1C,   // Dark red indicator base

  // Mechanical Treads & Track Rollers
  'S': 0x334155,   // Rubber tread segment
  's': 0x1E293B,   // Tread inner shadow
  'L': 0x64748B,   // Tread roller pin metallic shine

  // Tool Specific Colors
  'G': 0x22C55E,   // Crop leaf green
  'A': 0xEF4444,   // Crop apple red
  'a': 0xFCA5A5,   // Crop apple highlight
  'D': 0x7F1D1D,   // Crop apple shadow
  'C': 0xE2E8F0,   // Plasma cutter / energy blade shine
  'c': 0x94A3B8    // Energy blade shadow
};
```

### 4.2. Action Frames Design (Robot Wielding Tools / Harvesting / Watering)

1. **Watering Action (`player_water_down_0..2`)**:
   - `player_water_down_0`: Robot standing with side-mounted hydro-dispenser tank. Cyan LED visor displaying liquid status graphics.
   - `player_water_down_1`: Hydraulic arm extending hydro-nozzle forward. Pulsing cyan liquid stream (`U`, `u`, `W`) spraying outward.
   - `player_water_down_2`: Full stream impact; mist/water splash at robot's tread base; status indicator flashing red/cyan.

2. **Harvest Action (`player_harvest_down_0..2`)**:
   - `player_harvest_down_0`: Robot crouching lowering chassis; red status LED (`R`) active on antenna; mechanical manipulator claws lowering to ground level.
   - `player_harvest_down_1`: Dual-action slice & collect: Left arm engages micro plasma cutter (`C`, `c`), right manipulator sweeps crop into high-tech cargo container.
   - `player_harvest_down_2`: Robot standing upright holding metallic harvest cargo crate overhead; LED visor displaying green checkmark pattern.

3. **Picking Action (`player_pick_down_0..2`)**:
   - `player_pick_down_0`: Hydraulic arm extending upward; antenna angled upward.
   - `player_pick_down_1`: Manipulator claw grabbing target fruit (`A`, `a`, `D`) from tree branch; visor showing target cursor (`U`, `W`).
   - `player_pick_down_2`: Hydraulic arm retracting back into shoulder housing; fruit transferred into internal chassis bay.

### 4.3. Standalone Tool Sprites Design (`tool_watering_can`, `tool_basket`, `tool_sickle`)

- `tool_watering_can`: High-tech hydro-dispenser canister with industrial yellow casing (`y`, `Y`), slate metal top/nozzle (`M`, `d`), and cyan liquid gauge window (`U`).
- `tool_basket`: Industrial modular cargo crate with yellow bumper corners (`y`, `v`), slate steel frame (`M`, `d`), filled with harvested produce (`A`, `G`).
- `tool_sickle`: Mechanical plasma cutter tool with slate body (`M`, `d`), glowing energy blade edge (`C`, `c`), and yellow ergonomic grip (`y`).

### 4.4. Legacy Aliases & Animation Mapping

- `farmer0`: Aliased to `down_0` (Robot down idle frame)
- `farmer1`: Aliased to `down_1` (Robot down step 1 frame)
- `farmer2`: Aliased to `down_0` (Robot down idle frame)
- `farmer3`: Aliased to `down_2` (Robot down step 2 frame)
- Animations:
  - `player-walk-down`: `['player_walk_down_0', 'player_walk_down_1', 'player_walk_down_0', 'player_walk_down_2']` (8 fps)
  - `player-walk-up`: `['player_walk_up_0', 'player_walk_up_1', 'player_walk_up_0', 'player_walk_up_2']` (8 fps)
  - `player-walk-left`: `['player_walk_left_0', 'player_walk_left_1', 'player_walk_left_0', 'player_walk_left_2']` (8 fps)
  - `player-walk-right`: `['player_walk_right_0', 'player_walk_right_1', 'player_walk_right_0', 'player_walk_right_2']` (8 fps)
  - `player-water`: `['player_water_down_0', 'player_water_down_1', 'player_water_down_2', 'player_water_down_1']` (6 fps)
  - `player-harvest`: `['player_harvest_down_0', 'player_harvest_down_1', 'player_harvest_down_2']` (6 fps)
  - `player-pick`: `['player_pick_down_0', 'player_pick_down_1', 'player_pick_down_2']` (6 fps)

---

## 5. Verification & Testing Protocol

To independently verify all claims and ensure zero regression:

1. **Syntax Check**:
   ```bash
   node -c "d:\Hangeul Valley\game.js"
   node -c "d:\Hangeul Valley\assets\game.js"
   ```
   *Expected Output*: No errors reported.

2. **File Hashing Check**:
   Confirm identical SHA256 hashes between `game.js` and `assets/game.js`.

3. **Audit Verification**:
   Run victory auditor scripts:
   ```bash
   node "d:\Hangeul Valley\.agents\victory_auditor_player_sdv_v2\verify_all.js"
   ```
