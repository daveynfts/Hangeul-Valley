# Milestone 2: Beehive Sprite Polish & Upgrade (R5) Analysis Report

## Summary & Core Findings
This report details the architectural investigation, baseline analysis, upgrade strategy, and non-regression verification for the **Beehive Sprite (`'beehive'`)** in `game.js` under Milestone 2 (R5).

1. **Texture Generation**: The Beehive texture is procedurally generated in `PixelArtGenerator._genBeehiveTextures(scene)` (lines 1396–1456), which is invoked during texture pre-baking by `PixelArtGenerator._bakeTextures(scene)` at line 346.
2. **Baseline Palette & Token Count**: The baseline `BEEHIVE_PALETTE` defines 10 unique colors (11 keys including `'.'`). However, only **8 unique color tokens** (`K`, `b`, `B`, `W`, `D`, `A`, `Y`, `y`) are actively rendered in the 20x22 grid. Two palette entries (`w`, `H`) are unused in the original grid.
3. **Upgrade Objectives**:
   - Multi-tiered straw/skep coiled dome construction with defined ring highlights and overhang shadows.
   - Visible honeycomb cell micro-patterns across the hive surface.
   - Glossy dripping honey droplets hanging from the lower dome rim onto the wooden base.
   - Crisp 1px dark slate outline (`K = 0x0F172A`) enclosing all hive elements.
   - Expanded palette from 8 active color tokens to **16+ active color tokens**.
4. **Non-Regression Verification**:
   - Farm map positioning (`bx = farm.x - 65`, `by = farm.y - 70`), origin `(0.5, 1)`, scale `1.6`, drop shadow (`38x12, offsetY=2`), dynamic depth sorting (`setDepth(by)`), orbiting bee particles (`p_tiny_bee`), proximity threshold (`85px`), and `BeeScene` launch trigger remain 100% intact with 0 breaking changes.

---

## 1. Exact Code Locations & Structural Breakdown (`game.js`)

| Subsystem | File & Line Range | Function / Code Context | Description |
|---|---|---|---|
| **Bake Invocation** | `game.js`: 346 | `PixelArtGenerator._bakeTextures(scene)` | Calls `this._genBeehiveTextures(scene);` during pre-bake phase. |
| **Beehive Texture Bake** | `game.js`: 1396–1437 | `PixelArtGenerator._genBeehiveTextures(scene)` | Defines `BEEHIVE_PALETTE` (lines 1399–1411) and bakes 20x22 grid texture `'beehive'` with pixelSize `2` (40x44 canvas). |
| **Ambient Bee Texture** | `game.js`: 1450–1455 | `PixelArtGenerator._genBeehiveTextures(scene)` | Bakes `'p_tiny_bee'` 5x5 graphics texture for ambient orbiting bees. |
| **World Instantiation** | `game.js`: 7516 | `FarmScene.create()` | Calls `this._createBeehiveNPC(W, H);` to place beehive on farm map. |
| **NPC Setup & Shadow** | `game.js`: 8653–8713 | `FarmScene._createBeehiveNPC(W, H)` | Sets `bx = farm.x - 65`, `by = farm.y - 70`, instantiates `beehiveSprite` image at `(bx, by)` with origin `(0.5, 1)`, scale `1.6`, depth `by`, shadow `(38, 12, 2)`, idle wobble tween, orbiting bees (`beehiveBees`), floating prompt (`beehiveHint`), and ground text. |
| **Proximity & Depth** | `game.js`: 9218–9223 | `FarmScene.update()` | Checks proximity (`Distance < 85`), updates `beehiveHint` visibility, dynamically updates `beehiveSprite.setDepth(this.beehiveY)`, and updates `beehiveBees` elliptical orbits. |
| **HUD Overlay Hint** | `game.js`: 9281–9282 | `FarmScene.update()` | Displays HUD target prompt `[SPACE] Beehive Minigame` at `(hx, hy)` when player distance is `< 85`. |
| **BeeScene Launch Trigger** | `game.js`: 9375–9383 | `FarmScene.update()` | Handles Space key press within 85px: plays scale pop tween (`1.6 -> 1.85`), fades camera out, pauses `FarmScene`, and launches `'BeeScene'`. |
| **Target Scene Class** | `game.js`: 10951–11315 | `class BeeScene extends Phaser.Scene` | Minigame scene launched from the beehive interaction. |

---

## 2. Baseline Color Token Analysis

### Baseline `BEEHIVE_PALETTE` Definition (lines 1399–1411):
```javascript
const BEEHIVE_PALETTE = {
  '.': null,
  'K': 0x0F172A, // Dark slate outline / entrance aperture
  'b': 0x543A24, // Dark wooden base border
  'B': 0x78350F, // Wooden base fill
  'W': 0xA16207, // Wooden base highlight
  'w': 0xCA8A04, // (Unused in baseline grid) Bright wooden accent
  'D': 0xB45309, // Dark amber hive shade
  'A': 0xD97706, // Amber hive outer border / midtone
  'Y': 0xFACC15, // Gold hive main fill
  'y': 0xFDE047, // Light yellow highlight
  'H': 0xFEF08A  // (Unused in baseline grid) Specular highlight
};
```

### Grid Grid Analysis (20x22 pixels, lines 1414–1435):
- Defined Palette Keys: **10 colors** (+ null background).
- Active Rendered Palette Keys in Grid: **8 colors**:
  1. `K` (`0x0F172A`) — Dark Slate
  2. `b` (`0x543A24`) — Dark Wood Border
  3. `B` (`0x78350F`) — Wood Base Shadow
  4. `W` (`0xA16207`) — Wood Base Top Edge
  5. `D` (`0xB45309`) — Dark Amber Shadow
  6. `A` (`0xD97706`) — Hive Contour / Border
  7. `Y` (`0xFACC15`) — Honey Gold Body
  8. `y` (`0xFDE047`) — Light Yellow Highlight
- **Unused Baseline Tokens**: `w` (`0xCA8A04`) and `H` (`0xFEF08A`) are present in the palette object but 0 pixels exist in the 20x22 grid string array.

---

## 3. Beehive Upgrade Strategy (R5 Specification)

To meet the Milestone 2 acceptance criteria and align with the upgraded Robot player character and Apple Tree, the Beehive sprite will be enhanced across 5 core dimensions:

### 1. Honeycomb Surface Texture Detail
- Integrate geometric honeycomb cell micro-patterns across the hive tiers.
- Alternating offset cell highlight (`C`, `H`) and cell shadow (`D`, `d`) pixels to simulate 3D hexagonal indentations.
- Concentric spherical shading curves that follow the dome contours.

### 2. Multi-Layered Straw / Skep & Wood Construction
- 6 distinct horizontal coiled straw tiers, each rendered with clear top highlight (`y`, `H`), warm honey body (`Y`), and lower overhang drop-shadow (`S`, `D`).
- Base wooden stand upgraded from flat brown bars to 3D bevelled wooden plinth with dark mahogany shadow (`b`, `B`), rich teak midtone (`W`, `w`), and polished top bevel (`O`).

### 3. Glossy Dripping Honey Accent Pixels
- Teardrop honey drips extending downward from the bottom straw ring over the wooden plinth edge.
- Translucent golden amber gradient (`G` = `0xF59E0B`, `g` = `0xD97706`, `y` = `0xFDE047`) with a 1px bright specular catchlight (`C` = `0xFFFBEB`) on each drop.

### 4. Crisp 1px Dark Slate Outlines (`K = 0x0F172A`)
- Enclose the entire outer silhouette (straw dome, hanging honey drips, and wooden base stand) in solid `K = 0x0F172A`.
- Refine the central entrance aperture: deep slate core (`K`) surrounded by inner shadow (`k` = `0x1E293B`) and framed by a warm golden entrance arch (`A`, `M`).

### 5. Expanded Color Token Palette (17 Active Color Tokens)

| Token | Hex Value | Color Description | Usage / Role |
|---|---|---|---|
| `.` | `null` | Transparent | Background canvas |
| `K` | `0x0F172A` | Dark Slate | Crisp 1px outer outline & entrance core |
| `k` | `0x1E293B` | Dark Charcoal | Entrance aperture inner depth shadow |
| `b` | `0x451A03` | Dark Walnut | Wooden base outer border & deep shadow |
| `B` | `0x78350F` | Deep Mahogany | Wooden base body shadow |
| `W` | `0x92400E` | Warm Teak | Wooden base body midtone |
| `w` | `0xB45309` | Rich Amber Wood | Wooden base top edge transition |
| `O` | `0xD97706` | Polished Wood Edge | Wooden base highlight bevel |
| `S` | `0x78350F` | Layer Shadow | Coiled straw tier overhang shadow |
| `D` | `0x92400E` | Honeycomb Shadow | Honeycomb cell shadow & tier shadow |
| `A` | `0xB45309` | Dark Amber Contour | Hive body contour & entrance frame |
| `M` | `0xD97706` | Golden Amber | Hive body shading transition |
| `Y` | `0xFACC15` | Honey Gold | Primary hive body gold |
| `y` | `0xFDE047` | Sunflower Yellow | Tier top highlight & honey drip body |
| `H` | `0xFEF08A` | Light Cream | Specular highlight on straw tiers |
| `C` | `0xFFFBEB` | Pure Specular Catchlight | Honey droplet & dome specular shine |
| `G` | `0xF59E0B` | Glossy Honey Gold | Honey drip core |
| `g` | `0xD97706` | Honey Drip Shadow | Honey drip edge shadow |

---

## 4. Non-Regression & Verification Checklist

1. **Grid Resolution**: Maintain 20x22 (or 22x24 at `pixelSize = 2`) so canvas size fits cleanly into existing scale factor (`1.6`).
2. **Anchor & Origin**: Keep `.setOrigin(0.5, 1)` at line 8660 so the bottom center of the wooden base aligns with world coordinate `(bx, by)`.
3. **Drop Shadow Alignment**: `shadows.createShadow(this.beehiveSprite, 38, 12, 2)` expects a ~38px bottom base width, matching the upgraded wooden stand width.
4. **Depth Sorting**: Dynamic depth sorting `setDepth(this.beehiveY)` in `FarmScene.update()` (line 9221) is unchanged.
5. **Orbiting Bees**: `'p_tiny_bee'` creation (line 1450) and orbit updates (lines 9222–9235) remain intact.
6. **Interaction Radius & Minigame Trigger**: Proximity check `Distance < 85` (lines 9218, 9281, 9375) and `this.scene.launch('BeeScene')` (line 9380) remain 100% untouched.

---

## 5. Implementation Recommendation

When implementing the upgrade in `game.js` (and syncing to `assets/game.js`):
1. Update `BEEHIVE_PALETTE` in `PixelArtGenerator._genBeehiveTextures(scene)` (line 1399) with the 17-token expanded color palette.
2. Replace the 20x22 grid array in `this.createTexture(scene, 'beehive', [...])` (lines 1413–1436) with the upgraded pixel grid containing honeycomb details, layered straw tiers, 1px dark slate outlines (`K`), and dripping honey droplets (`G`, `g`, `C`).
3. Retain `'p_tiny_bee'` baking (lines 1450–1455) without modification.
4. Run `node -c game.js` and `node -c assets/game.js` to verify syntax.
5. Verify SHA256 parity between `game.js` and `assets/game.js`.
