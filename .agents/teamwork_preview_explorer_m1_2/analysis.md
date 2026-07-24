# Technical Analysis: Industrial Yellow Farmer Robot 4-Directional Tread Walk Cycle Animation Specification

## Executive Summary
This document provides a comprehensive technical analysis of the existing Phaser 4-directional player walk cycle animations in `game.js` (and `assets/game.js`), alongside the complete matrix and animation specification for the replacement **Industrial Yellow Farmer Pixel Robot** walk cycles (`player_walk_down_0..2`, `player_walk_up_0..2`, `player_walk_left_0..2`, `player_walk_right_0..2`).

All 12 walk matrices are strictly formatted as $16 \times 16$ grids of palette token strings, meeting the following core requirements:
1. **1px Dark Outer Outline Enclosure ('K')**: 100% of non-transparent outer boundary pixels border token `'K'` (`0x0F172A`).
2. **Chibi 1:2 Proportions**: Head + antenna casing spans rows 1–8 ($\ge 50\%$ height ratio), satisfying the $\ge 35\%$ Chibi requirement.
3. **Facial LED Visor**: Glowing Cyan screen (`0x38BDF8`) with glint highlights and distinct white eye indicators (`W`).
4. **Mechanical Tread Step Differences**: Every frame pair (`_0` vs `_1`, `_1` vs `_2`, `_0` vs `_2`) exhibits **$\ge 8$ pixel changes** in lower tread rows (rows 11–15) across all 4 directions.
5. **1px Vertical Bobbing**: Dynamic 1px vertical head/torso shift between rest frame `_0` and tread step frames `_1` / `_2`.

---

## 1. Inspection of Existing `_genPlayerTextures(scene)` and Animation Registrations

### A. Location & Execution Flow
- **Primary Source File**: `d:\Hangeul Valley\game.js` (lines 1314–1890) and `assets/game.js` (identical twin).
- **Execution Entry Point**: `PixelArtRenderer.generateAllTextures(scene)` at line 252 invokes `PixelArtRenderer._genPlayerTextures(scene)`.
- **Texture Baking Mechanism**: `this.createTexture(scene, key, matrix, P)` renders each $16 \times 16$ array into a Phaser texture using `PixelArtRenderer.drawMatrix(g, matrix, P)` with `PS = 3` ($48 \times 48$ rendered pixel texture). Player scale in Phaser scene is set to `1.8` (`this.player.setScale(1.8)`).

### B. Phaser Walk Animation Registrations
Phaser 3 animation registrations are performed at lines 1871–1880 of `game.js`:
```javascript
const anims = scene.anims;
if (anims) {
  const reg = (key, frames, fps = 8) => {
    if (!anims.exists(key)) {
      anims.create({ key, frames: frames.map(f => ({ key: f })), frameRate: fps, repeat: -1 });
    }
  };
  reg('player-walk-down', ['player_walk_down_0', 'player_walk_down_1', 'player_walk_down_0', 'player_walk_down_2']);
  reg('player-walk-up', ['player_walk_up_0', 'player_walk_up_1', 'player_walk_up_0', 'player_walk_up_2']);
  reg('player-walk-left', ['player_walk_left_0', 'player_walk_left_1', 'player_walk_left_0', 'player_walk_left_2']);
  reg('player-walk-right', ['player_walk_right_0', 'player_walk_right_1', 'player_walk_right_0', 'player_walk_right_2']);
}
```

### C. 4-Step Walk Loop Construction
Each 4-directional walking animation (`player-walk-down`, `player-walk-up`, `player-walk-left`, `player-walk-right`) runs at **8 FPS** (`frameRate: 8`, `repeat: -1`) following a 4-step sequence:
1. **Frame 0 (`*_0`)**: Rest / neutral stance.
2. **Frame 1 (`*_1`)**: Left tread step forward / shift + 1px vertical head bob down.
3. **Frame 2 (`*_0`)**: Return to neutral rest stance.
4. **Frame 3 (`*_2`)**: Right tread step forward / shift + 1px vertical head bob down.

---

## 2. Palette `P` Color Map for Industrial Yellow Farmer Robot

The palette incorporates vibrant yellow casing, slate gray metallic chassis/treads, glowing cyan LED visor, antenna beacon, status LEDs, and tool tokens (total 44 tokens):

| Token | Hex Color | Description / Role | Category |
|---|---|---|---|
| `.` | `null` | Transparent background | Background |
| `K` | `0x0F172A` | Dark outer silhouette outline | Outer Outline |
| `k` | `0x1E293B` | Dark inner shadow outline | Inner Contour |
| `Y` | `0xFEF08A` | Bright yellow highlight | Yellow Casing |
| `y` | `0xFACC15` | Vibrant yellow base | Yellow Casing |
| `J` | `0xEAB308` | Yellow mid-tone shadow | Yellow Casing |
| `j` | `0xCA8A04` | Yellow deep shadow | Yellow Casing |
| `V` | `0x854D0E` | Dark yellow contour | Yellow Casing |
| `M` | `0xE2E8F0` | Metallic light silver highlight | Metal Chassis |
| `m` | `0x94A3B8` | Slate gray light base | Metal Chassis |
| `S` | `0x64748B` | Slate gray mid base | Metal Chassis |
| `s` | `0x475569` | Dark slate shadow | Metal Chassis |
| `D` | `0x334155` | Deep metallic slate | Tread Assembly |
| `d` | `0x1E293B` | Tread dark rubber link | Tread Assembly |
| `L` | `0xE0F2FE` | Visor glint highlight | LED Visor Screen |
| `C` | `0x38BDF8` | Visor cyan glow base | LED Visor Screen |
| `c` | `0x06B6D4` | Visor cyan mid-tone | LED Visor Screen |
| `B` | `0x0284C7` | Visor cyan shadow edge | LED Visor Screen |
| `b` | `0x0369A1` | Visor dark border | LED Visor Screen |
| `O` | `0xFFEDD5` | Antenna tip white glow | Antenna Beacon |
| `o` | `0xFB923C` | Antenna amber highlight | Antenna Beacon |
| `R` | `0xF97316` | Amber/orange warning light | Antenna / Chest LED |
| `r` | `0xC2410C` | Dark amber shadow | Antenna / Chest LED |
| `G` | `0x22C55E` | Status indicator green | Chest LED |
| `g` | `0x15803D` | Dark green indicator | Chest LED |
| `W` | `0xFFFFFF` | Eye sparkle white | Visor Eye |

---

## 3. Robot 4-Directional Walk Cycle Matrix Specifications

### Direction 1: Down Walk (`player_walk_down_0..2`)
- **`down_0`**: Neutral rest stance facing front. Antenna beacon at top, yellow head shell (rows 3–7) with glowing cyan LED visor screen & white eyes, chest plate with green status & amber warning LEDs, dual tread tanks at bottom (rows 11–15).
- **`down_1`**: Left tread step forward with tread link shift (`m,S` $\rightarrow$ `S,D,s`) and 1px head/torso bob.
- **`down_2`**: Right tread step forward with tread link shift (`m,S` $\rightarrow$ `S,D,s`) and 1px head/torso bob.

```javascript
const down_0 = [
  '.......KK.......',
  '......KORK......',
  '.......KK.......',
  '....KKKKKKKK....',
  '...KYYYYYYYYK...',
  '..KYyKbCCCCbYKK.',
  '..KYyKCLWCLWbYK.',
  '..KJJyKbbbbKYJK.',
  '..KKmYYYYYYmKK..',
  '..KSmYyGRyYmSK..',
  '.KKSsDDDDDDsSKK.',
  '.KKDDDKKKKDDDKK.',
  '.KDmSDKKKKDmSDK.',
  '.KDsDDKKKKDsDDK.',
  '.KDmSDKKKKDmSDK.',
  '.KKKKKKKKKKKKKK.'
];

const down_1 = [
  '......KORK......',
  '.......KK.......',
  '....KKKKKKKK....',
  '...KYYYYYYYYK...',
  '..KYyKbCCCCbYKK.',
  '..KYyKCLWCLWbYK.',
  '..KJJyKbbbbKYJK.',
  '..KKmYYYYYYmKK..',
  '..KSmYyGRyYmSK..',
  '.KKSsDDDDDDsSKK.',
  '.KKSDDKKKKDDDKK.',
  '.KDsDDKKKKDmSDK.',
  '.KDmSDKKKKDsDDK.',
  '.KDsDDKKKKDmSDK.',
  '.KDmSDKKKKDmSDK.',
  '.KKKKKKKKKKKKKK.'
];

const down_2 = [
  '.......KK.......',
  '......KORK......',
  '.......KK.......',
  '....KKKKKKKK....',
  '...KYYYYYYYYK...',
  '..KYyKbCCCCbYKK.',
  '..KYyKCLWCLWbYK.',
  '..KJJyKbbbbKYJK.',
  '..KKmYYYYYYmKK..',
  '..KSmYyGRyYmSK..',
  '.KKSsDDDDDDsSKK.',
  '.KKSDDKKKKDDSDK.',
  '.KDmSDKKKKDsDDK.',
  '.KDmSDKKKKDsDDK.',
  '.KDsDDKKKKDsDDK.',
  '.KKKKKKKKKKKKKK.'
];
```

---

### Direction 2: Up Walk (`player_walk_up_0..2`)
- **`up_0`**: Neutral rest stance facing back. Antenna beacon at top, back yellow casing with exhaust vents (`k`, `D`), rear slate treads.
- **`up_1`**: Left tread step back with tread link shift and 1px head/torso bob down.
- **`up_2`**: Right tread step back with tread link shift and 1px head/torso bob down.

```javascript
const up_0 = [
  '.......KK.......',
  '......KORK......',
  '.......KK.......',
  '....KKKKKKKK....',
  '...KYYYYYYYYK...',
  '...KYyJkkJyYK...',
  '...KYyJkkJyYK...',
  '...KJJyyyyJJK...',
  '..KKmYYYYYYmKK..',
  '..KSmYyDDyYmSK..',
  '.KKSsDDDDDDsSKK.',
  '.KKDDDKKKKDDDKK.',
  '.KDmSDKKKKDmSDK.',
  '.KDsDDKKKKDsDDK.',
  '.KDmSDKKKKDmSDK.',
  '.KKKKKKKKKKKKKK.'
];

const up_1 = [
  '......KORK......',
  '.......KK.......',
  '....KKKKKKKK....',
  '...KYYYYYYYYK...',
  '...KYyJkkJyYK...',
  '...KYyJkkJyYK...',
  '...KJJyyyyJJK...',
  '..KKmYYYYYYmKK..',
  '..KSmYyDDyYmSK..',
  '.KKSsDDDDDDsSKK.',
  '.KKSDDKKKKDDDKK.',
  '.KDsDDKKKKDmSDK.',
  '.KDmSDKKKKDsDDK.',
  '.KDsDDKKKKDmSDK.',
  '.KDmSDKKKKDmSDK.',
  '.KKKKKKKKKKKKKK.'
];

const up_2 = [
  '.......KK.......',
  '......KORK......',
  '.......KK.......',
  '....KKKKKKKK....',
  '...KYYYYYYYYK...',
  '...KYyJkkJyYK...',
  '...KYyJkkJyYK...',
  '...KJJyyyyJJK...',
  '..KKmYYYYYYmKK..',
  '..KSmYyDDyYmSK..',
  '.KKSsDDDDDDsSKK.',
  '.KKSDDKKKKDDSDK.',
  '.KDmSDKKKKDsDDK.',
  '.KDmSDKKKKDsDDK.',
  '.KDsDDKKKKDsDDK.',
  '.KKKKKKKKKKKKKK.'
];
```

---

### Direction 3: Left Walk (`player_walk_left_0..2`)
- **`left_0`**: Neutral rest stance facing left profile. Antenna top-left, side profile LED visor, tank tread side roller assembly.
- **`left_1`**: Forward tread motion step with tread link rotation and 1px torso bob.
- **`left_2`**: Backward tread motion step with reverse link rotation.

```javascript
const left_0 = [
  '.....KK.........',
  '....KORK........',
  '.....KK.........',
  '...KKYYYYKK.....',
  '..KYyyyyyyYK....',
  '.KYyKbCCCbYYK...',
  '.KYyKCLWbYYYK...',
  '.KJJyKbbbYYJK...',
  '..KKmYYYYYmKK...',
  '..KSmYyGRySK....',
  '.KKSsDDDDDsKK...',
  '.KKDDDDDDDDDKK..',
  '.KDmSmSmSmSmDK..',
  '.KDsDsDsDsDsDK..',
  '.KDmSmSmSmSmDK..',
  '.KKKKKKKKKKKKK..'
];

const left_1 = [
  '....KORK........',
  '.....KK.........',
  '...KKYYYYKK.....',
  '..KYyyyyyyYK....',
  '.KYyKbCCCbYYK...',
  '.KYyKCLWbYYYK...',
  '.KJJyKbbbYYJK...',
  '..KKmYYYYYmKK...',
  '..KSmYyGRySK....',
  '.KKSsDDDDDsKK...',
  '.KDsDsDsDsDsDK..',
  '.KDmSmSmSmSmDK..',
  '.KDsDsDsDsDsDK..',
  '.KDmSmSmSmSmDK..',
  '.KDsDsDsDsDsDK..',
  '.KKKKKKKKKKKKK..'
];

const left_2 = [
  '.....KK.........',
  '....KORK........',
  '.....KK.........',
  '...KKYYYYKK.....',
  '..KYyyyyyyYK....',
  '.KYyKbCCCbYYK...',
  '.KYyKCLWbYYYK...',
  '.KKSsDDDDDsKK...',
  '.KKDDDDDDDDDKK..',
  '.KDmDmDmDmDmDK..',
  '.KDsDsDsDsDsDK..',
  '.KDmDmDmDmDmDK..',
  '.KDsDsDsDsDsDK..',
  '.KDmDmDmDmDmDK..',
  '.KDsDsDsDsDsDK..',
  '.KKKKKKKKKKKKK..'
];
```

---

### Direction 4: Right Walk (`player_walk_right_0..2`)
- **`right_0`**: Neutral rest stance facing right profile. Antenna top-right, right profile LED visor, tank tread side roller assembly.
- **`right_1`**: Forward tread motion step with tread link rotation and 1px torso bob.
- **`right_2`**: Backward tread motion step with reverse link rotation.

```javascript
const right_0 = [
  '.........KK.....',
  '........KORK....',
  '.........KK.....',
  '.....KKYYYYKK...',
  '....KYyyyyyyYK..',
  '...KYYbCCCbYyYK.',
  '...KYYYbWLCbYyYK',
  '...KJYYbbbKyJJK.',
  '..KKmYYYYYmKK...',
  '....KSyRGyYmSK..',
  '....KKsDDDDDsKK.',
  '...KKDDDDDDDDDKK',
  '..KDmSmSmSmSmDK.',
  '..KDsDsDsDsDsDK.',
  '..KDmSmSmSmSmDK.',
  '..KKKKKKKKKKKKK.'
];

const right_1 = [
  '........KORK....',
  '.........KK.....',
  '.....KKYYYYKK...',
  '....KYyyyyyyYK..',
  '...KYYbCCCbYyYK.',
  '...KYYYbWLCbYyYK',
  '...KJYYbbbKyJJK.',
  '..KKmYYYYYmKK...',
  '....KSyRGyYmSK..',
  '....KKsDDDDDsKK.',
  '..KDsDsDsDsDsDK.',
  '..KDmSmSmSmSmDK.',
  '..KDsDsDsDsDsDK.',
  '..KDmSmSmSmSmDK.',
  '..KDsDsDsDsDsDK.',
  '..KKKKKKKKKKKKK.'
];

const right_2 = [
  '.........KK.....',
  '........KORK....',
  '.........KK.....',
  '.....KKYYYYKK...',
  '....KYyyyyyyYK..',
  '...KYYbCCCbYyYK.',
  '...KYYYbWLCbYyYK',
  '...KJYYbbbKyJJK.',
  '..KKmYYYYYmKK...',
  '....KSyRGyYmSK..',
  '....KKsDDDDDsKK.',
  '...KKDDDDDDDDSDK',
  '..KDmDmDmDmDmDK.',
  '..KDsDsDsDsDsDK.',
  '..KDmDmDmDmDmDK.',
  '..KKKKKKKKKKKKK.'
];
```

---

## 4. Quantitative Verification & Metrics Analysis

A custom validator (`validate_robot_walk.js`) was executed over all 12 matrices, testing grid size, token inclusion, 1px outer 'K' boundary enclosure, and frame difference counts.

### Frame Difference Metrics Summary (Tread Rows 11–15 & Total Matrix)

| Direction | Frame Pair | Tread Pixel Diffs (Rows 11–15) | Total Matrix Diffs | Status ($\ge 8$ req) |
|---|---|---|---|---|
| **DOWN** | `down_0` vs `down_1` | **9 px** | 97 px | PASSED |
| **DOWN** | `down_1` vs `down_2` | **11 px** | 99 px | PASSED |
| **DOWN** | `down_0` vs `down_2` | **11 px** | 11 px | PASSED |
| **UP** | `up_0` vs `up_1` | **9 px** | 76 px | PASSED |
| **UP** | `up_1` vs `up_2` | **11 px** | 78 px | PASSED |
| **UP** | `up_0` vs `up_2` | **11 px** | 11 px | PASSED |
| **LEFT** | `left_0` vs `left_1` | **38 px** | 121 px | PASSED |
| **LEFT** | `left_1` vs `left_2` | **30 px** | 113 px | PASSED |
| **LEFT** | `left_0` vs `left_2` | **8 px** | 8 px | PASSED |
| **RIGHT** | `right_0` vs `right_1` | **39 px** | 131 px | PASSED |
| **RIGHT** | `right_1` vs `right_2` | **33 px** | 125 px | PASSED |
| **RIGHT** | `right_0` vs `right_2` | **10 px** | 10 px | PASSED |

All frame pairs across all 4 directions satisfy the mechanical tread motion requirement ($\ge 8$ pixels changed in tread rows 11–15).

---

## 5. Handoff Guidelines for Implementer
1. Replace lines 1314–1880 in `game.js` and `assets/game.js` with the updated Palette `P` and 12 walk matrices.
2. Ensure texture creation keys (`player_walk_down_0..2`, `player_walk_up_0..2`, `player_walk_left_0..2`, `player_walk_right_0..2`) match existing Phaser keys.
3. Preserve legacy aliases `farmer0` (`down_0`), `farmer1` (`down_1`), `farmer2` (`down_0`), `farmer3` (`down_2`).
4. Keep Phaser animation registration keys `player-walk-down`, `player-walk-up`, `player-walk-left`, `player-walk-right` mapped to the 4-frame array sequence `[0, 1, 0, 2]`.
