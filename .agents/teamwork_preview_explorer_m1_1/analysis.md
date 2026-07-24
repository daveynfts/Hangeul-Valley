# Technical Analysis: Main Character Sprite Generation & Texture Baking Architecture

## Summary of Core Findings
1. **Primary Function Location**: `PixelArtRenderer._genPlayerTextures(scene)` is defined in `d:\Hangeul Valley\game.js` (and duplicated in `d:\Hangeul Valley\assets\game.js`) spanning **lines 1314 to 1828** (515 lines total). It is invoked during game boot at **line 252** inside `PixelArtRenderer.generateAllTextures(scene)`.
2. **Palette Definition**: Palette `P` (lines 1315–1329) contains **48 token keys** (1 transparent `.` + 47 color hex entries), exceeding the minimum requirement of 30 tokens. Token `'K'` (`0x1A1A2E`) serves as the dark silhouette outline token. Multi-tone shading is implemented across skin (6 tokens), hair (3 tokens), clothing/overalls (7 tokens), straw hat (4 tokens), boots (3 tokens), and tools.
3. **Matrices**: Contains **24 matrices** total (12 walk frames, 9 action frames, 3 standalone tool sprites), each strictly formatted as a $16 \times 16$ array of single-character token strings.
4. **Legacy Aliases**: Lines 1801–1804 register legacy aliases `farmer0` (`down_0`), `farmer1` (`down_1`), `farmer2` (`down_0`), and `farmer3` (`down_2`) via `this.createTexture`.
5. **Animation Registrations**: Lines 1806–1827 handle Phaser animation registrations (`player-walk-down`, `player-walk-up`, `player-walk-left`, `player-walk-right`, `player-water`, `player-harvest`, `player-pick`).

---

## 1. `_genPlayerTextures(scene)` Structure & Line Map

| Component | Line Range | Description |
|---|---|---|
| Method Header | 1314 | `static _genPlayerTextures(scene) {` |
| Palette Object `P` | 1315–1329 | Definition of 48 color mapping tokens |
| Walk Down Matrices (`down_0..2`) | 1331–1384 | 3 matrices ($16 \times 16$) for downward movement |
| Walk Up Matrices (`up_0..2`) | 1386–1439 | 3 matrices ($16 \times 16$) for upward movement |
| Walk Left Matrices (`left_0..2`) | 1441–1494 | 3 matrices ($16 \times 16$) for leftward movement |
| Walk Right Matrices (`right_0..2`) | 1496–1549 | 3 matrices ($16 \times 16$) for rightward movement |
| Water Action Matrices (`water_down_0..2`) | 1552–1605 | 3 action matrices ($16 \times 16$) for watering can usage |
| Harvest Action Matrices (`harvest_down_0..2`) | 1607–1660 | 3 action matrices ($16 \times 16$) for crop harvesting |
| Pick Action Matrices (`pick_down_0..2`) | 1662–1715 | 3 action matrices ($16 \times 16$) for fruit picking |
| Tool Sprite Matrices | 1718–1771 | `tool_watering_can`, `tool_basket`, `tool_sickle` ($16 \times 16$) |
| Texture Baking Calls | 1773–1798 | 24 `this.createTexture(scene, key, matrix, P)` calls |
| Legacy Aliases | 1800–1804 | `farmer0..3` texture alias registrations |
| Animation Registrations | 1806–1827 | `scene.anims.create` calls for 7 player animations |
| Method Closing | 1828 | `}` |

---

## 2. Palette Object `P` Token Map

Palette `P` is defined at lines 1315–1329. The full breakdown of all 48 tokens:

| Token | Hex Color | Color Description / Role | Category |
|---|---|---|---|
| `.` | `null` | Transparent background | Background |
| `K` | `0x1A1A2E` | Dark silhouette boundary outline | Outer Boundary Outline |
| `k` | `0x24243B` | Soft inner outline / shadow | Inner Outline |
| `0` | `0x0B090C` | Deep black shoe base | Shoe Base |
| `J` | `0x1D283B` | Dark shadow tone | Clothing Shadow |
| `X` | `0xFFE0C2` | Light skin highlight | Skin (Tone 1) |
| `x` | `0xF1B78B` | Mid skin base | Skin (Tone 2) |
| `i` | `0xD38666` | Shadow skin tone | Skin (Tone 3) |
| `I` | `0x9C533C` | Deep skin shadow | Skin (Tone 4) |
| `O` | `0xFFE0C2` | Facial skin highlight | Skin (Tone 5) |
| `o` | `0xB03A2E` | Blush / mouth red tone | Skin/Face Detail |
| `f` | `0x8D5B3A` | Hair light highlight | Hair (Tone 1) |
| `H` | `0x653E23` | Hair mid base | Hair (Tone 2) |
| `h` | `0x3D2314` | Hair dark shadow | Hair (Tone 3) |
| `t` | `0xF4D685` | Straw hat highlight | Straw Hat (Tone 1) |
| `T` | `0xDC9F42` | Straw hat base | Straw Hat (Tone 2) |
| `V` | `0xB37D2A` | Straw hat shadow | Straw Hat (Tone 3) |
| `v` | `0x7A5016` | Straw hat dark brim edge | Straw Hat (Tone 4) |
| `R` | `0xC23B22` | Red hat ribbon base | Red Ribbon (Tone 1) |
| `r` | `0x731C13` | Red hat ribbon shadow | Red Ribbon (Tone 2) |
| `p` | `0xD94738` | Red hat ribbon highlight | Red Ribbon (Tone 3) |
| `w` | `0xF2ECE1` | White shirt highlight | Shirt Fabric |
| `F` | `0xD5CFBF` | White shirt base | Shirt Fabric |
| `g` | `0x999385` | White shirt shadow | Shirt Fabric |
| `z` | `0x4B6B94` | Blue denim overalls highlight | Overalls (Tone 1) |
| `Z` | `0x334B73` | Blue denim overalls base | Overalls (Tone 2) |
| `q` | `0x213252` | Blue denim overalls shadow | Overalls (Tone 3) |
| `Q` | `0x141E36` | Blue denim deep shadow | Overalls (Tone 4) |
| `B` | `0x60A5FA` | Denim bright blue accent | Overalls (Tone 5) |
| `2` | `0x1E3A8A` | Denim navy blue shadow | Overalls (Tone 6) |
| `b` | `0xE6B830` | Brass button gold | Overalls Detail |
| `L` | `0x854B27` | Leather boot highlight | Boots (Tone 1) |
| `S` | `0x5E3218` | Leather boot base | Boots (Tone 2) |
| `s` | `0x3B1F0E` | Leather boot shadow | Boots (Tone 3) |
| `N` | `0x121016` | Eye pupil dark black | Eyes |
| `W` | `0xFFFFFF` | Eye white sparkle / highlight | Eyes |
| `n` | `0x78350F` | Watering can copper rim | Watering Can |
| `M` | `0x64748B` | Watering can metal body | Watering Can |
| `d` | `0x475569` | Watering can metal shadow | Watering Can |
| `U` | `0x38BDF8` | Water droplet / splash blue | Water |
| `u` | `0x6BB1D6` | Water spray mid blue | Water |
| `m` | `0x94A3B8` | Water / metal shine gray | Water / Metal |
| `G` | `0x22C55E` | Basket leaf green | Basket / Crops |
| `A` | `0xEF4444` | Basket apple red base | Basket / Crops |
| `a` | `0xFCA5A5` | Basket apple red highlight | Basket / Crops |
| `D` | `0x7F1D1D` | Basket apple red shadow | Basket / Crops |
| `j` | `0x78350F` | Basket wicker weave dark | Basket |
| `Y` | `0xFDE047` | Basket wicker highlight | Basket |
| `y` | `0xEAB308` | Basket wicker base | Basket |
| `c` | `0x94A3B8` | Sickle metal shadow | Sickle |
| `C` | `0xE2E8F0` | Sickle metal blade shine | Sickle |
| `e` | `0x59381E` | Sickle wood handle base | Sickle |
| `E` | `0x78350F` | Sickle wood handle shadow | Sickle |

---

## 3. Matrix Mapping

All 24 matrices are defined as arrays of 16 strings of 16 characters each.

### A. Walk Frame Matrices (12 total)
- `player_walk_down_0` (lines 1331–1348): Down idle/rest position.
- `player_walk_down_1` (lines 1349–1366): Down step left foot forward.
- `player_walk_down_2` (lines 1367–1384): Down step right foot forward.
- `player_walk_up_0` (lines 1386–1403): Up idle/rest position (back facing).
- `player_walk_up_1` (lines 1404–1421): Up step left foot forward.
- `player_walk_up_2` (lines 1422–1439): Up step right foot forward.
- `player_walk_left_0` (lines 1441–1458): Left idle/rest position.
- `player_walk_left_1` (lines 1459–1476): Left step frame.
- `player_walk_left_2` (lines 1477–1494): Left stride frame.
- `player_walk_right_0` (lines 1496–1513): Right idle/rest position.
- `player_walk_right_1` (lines 1514–1531): Right step frame.
- `player_walk_right_2` (lines 1532–1549): Right stride frame.

### B. Action Frame Matrices (9 total)
- `player_water_down_0` (lines 1552–1569): Hold watering can ready.
- `player_water_down_1` (lines 1570–1587): Tilt watering can & stream water.
- `player_water_down_2` (lines 1588–1605): Water splash on soil.
- `player_harvest_down_0` (lines 1607–1624): Crouch to harvest crop.
- `player_harvest_down_1` (lines 1625–1642): Gather crop into basket.
- `player_harvest_down_2` (lines 1643–1660): Hold harvested crop overhead triumphantly.
- `player_pick_down_0` (lines 1662–1679): Reach toward tree/bush.
- `player_pick_down_1` (lines 1680–1697): Pluck fruit from branch.
- `player_pick_down_2` (lines 1698–1715): Return to standing with picked fruit.

### C. Tool Sprite Matrices (3 total)
- `tool_watering_can` (lines 1718–1735): Standalone watering can graphic.
- `tool_basket` (lines 1736–1753): Standalone harvest basket graphic filled with apples.
- `tool_sickle` (lines 1754–1771): Standalone curved harvesting sickle.

---

## 4. Legacy Aliases & Animation Registrations

### Legacy Aliases (Lines 1800–1804)
```javascript
this.createTexture(scene, 'farmer0', down_0, P);
this.createTexture(scene, 'farmer1', down_1, P);
this.createTexture(scene, 'farmer2', down_0, P);
this.createTexture(scene, 'farmer3', down_2, P);
```

### Animation Registrations (Lines 1806–1827)
- `player-walk-down`: Frames `['player_walk_down_0', 'player_walk_down_1', 'player_walk_down_0', 'player_walk_down_2']`, `frameRate: 8`, `repeat: -1`.
- `player-walk-up`: Frames `['player_walk_up_0', 'player_walk_up_1', 'player_walk_up_0', 'player_walk_up_2']`, `frameRate: 8`, `repeat: -1`.
- `player-walk-left`: Frames `['player_walk_left_0', 'player_walk_left_1', 'player_walk_left_0', 'player_walk_left_2']`, `frameRate: 8`, `repeat: -1`.
- `player-walk-right`: Frames `['player_walk_right_0', 'player_walk_right_1', 'player_walk_right_0', 'player_walk_right_2']`, `frameRate: 8`, `repeat: -1`.
- `player-water`: Frames `['player_water_down_0', 'player_water_down_1', 'player_water_down_2', 'player_water_down_1']`, `frameRate: 6`, `repeat: 0`.
- `player-harvest`: Frames `['player_harvest_down_0', 'player_harvest_down_1', 'player_harvest_down_2']`, `frameRate: 6`, `repeat: 0`.
- `player-pick`: Frames `['player_pick_down_0', 'player_pick_down_1', 'player_pick_down_2']`, `frameRate: 6`, `repeat: 0`.

---

## 5. Step-by-Step Replacement Strategy for Worker

When replacing the existing character design with a high-quality Stardew Valley Chibi 1:2 pixel art character, the Worker MUST adhere to the following steps and validation criteria:

### Step 1: Target Files
- Both `d:\Hangeul Valley\game.js` AND `d:\Hangeul Valley\assets\game.js` MUST be updated synchronously.

### Step 2: Palette `P` Compliance Rules
1. Must contain **$\ge 30$ color tokens** (excluding transparent `.` key).
2. Token `'K'` MUST be defined as `0x1A1A2E` (or equivalent dark outline hex).
3. Multi-tone shading rules:
   - Skin: $\ge 3$ tones (`X`, `x`, `i`, etc.)
   - Hair: $\ge 3$ tones (`f`, `H`, `h`, etc.)
   - Clothing: $\ge 3$ tones (`z`, `Z`, `q`, etc.)

### Step 3: Matrix Grid & Proportion Rules
1. **Dimensions**: All 24 matrices MUST be strictly $16 \times 16$ arrays of strings.
2. **Tokens**: Every character in every row MUST be either `.` or a token present in `P`.
3. **1px Outer Silhouette Outline (Token `K`)**:
   - Every non-transparent token adjacent (up, down, left, right) to transparent `.` MUST be token `'K'`.
4. **Chibi 1:2 Ratio (Head Height $\ge 35\%$)**:
   - On walk down frames (`down_0`, `down_1`, `down_2`), the head area (hat + hair + facial area) MUST span at least $35\%$ of total non-transparent sprite height ($\ge 5.5$ rows out of 16, recommended 8 rows for true 1:1 head-to-body Chibi proportion).
5. **Facial Features**:
   - Visible face area must span $\ge 3$ rows high by $\ge 6$ columns wide.
   - Must include 2 distinct eyes containing `'NW'` pupil-white pairs.
6. **Bouncy Walk Frame Differences**:
   - Character matrices for walking MUST have a pixel difference of $\ge 8$ characters between `_0` and `_1`, `_1` and `_2`, and `_0` and `_2` across all 4 directions.

### Step 4: Method Code Structure Preservation
- Keep method header `static _genPlayerTextures(scene) {` intact.
- Keep `this.createTexture` calls for all 24 keys intact.
- Keep legacy alias registrations `farmer0..3` intact.
- Keep Phaser animation registrations `player-walk-*`, `player-water`, `player-harvest`, `player-pick` intact.

### Step 5: Verification & Auditing Commands
Run the following verification commands to ensure zero syntax errors and 100% audit pass:
```bash
node -c "d:\Hangeul Valley\game.js"
node -c "d:\Hangeul Valley\assets\game.js"
node "d:\Hangeul Valley\.agents\victory_auditor_player_sdv_v2\verify_all.js"
```
