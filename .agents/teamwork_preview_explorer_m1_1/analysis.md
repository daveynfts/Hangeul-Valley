# Industrial Yellow Farmer Pixel Robot - Design Specification & Analysis

## Executive Summary
This document provides a comprehensive technical analysis of the existing player texture generation system in `game.js` and delivers the full pixel matrix design specification and exact token dictionary for the **Industrial Yellow Farmer Pixel Robot Replacement** (Milestone 1).

The design replaces the human farmer sprites with a compact, high-precision chibi robot featuring:
- **Yellow Metallic Armor Casing**: Vibrant industrial yellow with highlight, mid-shade, and shadow tones.
- **Slate/Gray Metallic Body & Joints**: Industrial slate frame, mechanical shoulder joints, and tread housing.
- **Glowing Cyan LED Visor**: Expressive digital screen with glowing cyan eyes/glare pixels.
- **Top Antenna & Brass Gear Details**: Top warning beacon bulb and chest power core gear.
- **Mechanical Caterpillar Tread Feet**: Twin tread pods supporting 4-directional walk animations with tread step dynamics.
- **1px Dark Outline**: Slate 900 (`0x0F172A`) contouring for crisp pixel art visibility.

---

## 1. Existing Player Texture System Analysis

### 1.1 Architecture & Workflow
Player textures are procedurally generated in `game.js` inside `PixelArtRenderer._genPlayerTextures(scene)` (lines ~1313–1890).
The rendering pipeline operates as follows:
1. **Palette Mapping (`P`)**: A dictionary mapping single-character ASCII tokens to 24-bit hex color values (e.g. `'K': 0x0F172A`).
2. **16×16 Sprite Matrices**: Array of 16 strings, each 16 characters long representing a 2D pixel grid.
3. **Texture Generation**: `PixelArtRenderer.createTexture(scene, key, matrix, palette, width=16, height=16, ps=3)` renders pixels onto a Phaser Graphics object with pixel size `ps = 3` (producing 48×48 pixel Phaser textures) and registers them with `NEAREST` filtering.
4. **Animation Registration**: `scene.anims.create()` links texture frame sequences into walk (`player-walk-down`, etc.) and action (`player-water`, `player-harvest`, `player-pick`) animations.
5. **Legacy Compatibility**: Aliases `farmer0`..`farmer3` map directly to `down_0`, `down_1`, `down_0`, `down_2`.

---

## 2. Color Palette `P` Specification

The palette `P` integrates all required industrial yellow, metallic slate, glowing LED cyan, antenna/gear amber, dark outline, and action/tool compatibility colors:

```javascript
const P = {
  '.': null,       // Transparent background

  // 1px Dark Outline & Contours
  'K': 0x0F172A,   // Dark slate outline (Slate 900)
  'k': 0x1E293B,   // Dark inner contour / chassis shadow (Slate 800)

  // Industrial Yellow Metallic Casing
  'y': 0xFEF08A,   // Yellow casing metallic highlight (Yellow 200)
  'Y': 0xFACC15,   // Yellow casing main base (Yellow 400)
  'j': 0xEAB308,   // Yellow casing mid-shade (Yellow 500)
  'J': 0xCA8A04,   // Yellow casing shadow (Yellow 600)

  // Metallic Gray / Slate Body & Joints
  'C': 0xE2E8F0,   // Bright metal reflection (Slate 200)
  'c': 0xCBD5E1,   // Light joint cap / accent (Slate 300)
  'm': 0x94A3B8,   // Light metal joint / manipulator (Slate 400)
  'M': 0x64748B,   // Mid metal chassis frame (Slate 500)
  'd': 0x475569,   // Dark metal frame / housing (Slate 600)
  'D': 0x334155,   // Deep joint shadow / inner core (Slate 700)

  // Glowing LED Visor & Screen Expressions
  'W': 0xFFFFFF,   // Bright LED glare / eye white highlight
  'V': 0x38BDF8,   // Glowing cyan eye / pixel display (Sky 400)
  'v': 0x06B6D4,   // Visor base screen (Cyan 500)
  'z': 0x0284C7,   // Deep visor screen shadow (Sky 600)
  'Z': 0x0369A1,   // Visor frame border (Sky 700)

  // Antenna Tip & Gear Accent Details
  'o': 0xF97316,   // Warning beacon glow (Orange 500)
  'A': 0xF59E0B,   // Antenna bulb / brass gear core (Amber 500)
  'a': 0xD97706,   // Brass gear shadow (Amber 600)

  // Action FX, Tool & Crop Palette Compatibility Tokens
  'n': 0x78350F,   // Tool wood handle
  'e': 0x59381E,   // Dark handle shadow
  'G': 0x22C55E,   // Crop leaf green
  'R': 0xEF4444,   // Crop berry red
  'u': 0x38BDF8,   // Water droplet cyan
  'U': 0x0284C7,   // Deep water splash blue
  'w': 0xE0F2FE    // Water highlight white-blue
};
```

---

## 3. Complete 16×16 Matrix Design Specifications

### 3.1 Walk Down Cycles (Front Facing)

#### `down_0` (Neutral Stance)
```javascript
const down_0 = [
  '.......KK.......',
  '......KAoK......',
  '...KKKKcKKKK....',
  '..KKyyyyyyyyKK..',
  '.KKYYYYYYYYYYJK.',
  '.KKYZvvVVvvZYJK.',
  '.KKYZvVWvWVzYJK.',
  '.KKYjjjjjjjjJJK.',
  '..KKKKKKKKKKKK..',
  '.KKmYYYYYYYYmKK.',
  'KKmYdMaAaMdymKK.',
  '.KKyJJJJJJJJJKK.',
  '..KKDDDDDDDDKK..',
  '..KKdMMMMMMdKK..',
  '.KKDDkDDkDDkDDKK',
  '.KKKKKKKKKKKKKK.'
];
```

#### `down_1` (Left Tread Forward / Step)
```javascript
const down_1 = [
  '.......KK.......',
  '......KAoK......',
  '...KKKKcKKKK....',
  '..KKyyyyyyyyKK..',
  '.KKYYYYYYYYYYJK.',
  '.KKYZvvVVvvZYJK.',
  '.KKYZvVWvWVzYJK.',
  '.KKYjjjjjjjjJJK.',
  '..KKKKKKKKKKKK..',
  'KKmYYYYYYYYmKK..',
  'KKmYdMaAaMdymKK.',
  '.KKyJJJJJJJJJKK.',
  '..KKDDDDDDDDKK..',
  '.KKdMMMMd.dMMdKK',
  '.KKDDkDDKKDDkDDK',
  '.KKKKKKK.KKKKKK.'
];
```

#### `down_2` (Right Tread Forward / Step)
```javascript
const down_2 = [
  '.......KK.......',
  '......KAoK......',
  '...KKKKcKKKK....',
  '..KKyyyyyyyyKK..',
  '.KKYYYYYYYYYYJK.',
  '.KKYZvvVVvvZYJK.',
  '.KKYZvVWvWVzYJK.',
  '.KKYjjjjjjjjJJK.',
  '..KKKKKKKKKKKK..',
  '..KKmYYYYYYYYmKK',
  '.KKmYdMaAaMdymKK',
  '.KKyJJJJJJJJJKK.',
  '..KKDDDDDDDDKK..',
  'KKdMMd.dMMMMdKK.',
  'KDDkDDKKDDkDDKK.',
  '.KKKKKK.KKKKKKK.'
];
```

---

### 3.2 Walk Up Cycles (Back Facing)

#### `up_0` (Neutral Stance Back)
```javascript
const up_0 = [
  '.......KK.......',
  '......KAoK......',
  '...KKKKcKKKK....',
  '..KKyyyyyyyyKK..',
  '.KKYYYYYYYYYYJK.',
  '.KKYdMMddMMdYJK.',
  '.KKYdDDddDDdYJK.',
  '.KKYjjjjjjjjJJK.',
  '..KKKKKKKKKKKK..',
  '.KKmYYYYYYYYmKK.',
  'KKmYdMdAAdMdYmKK',
  '.KKyJJJJJJJJJKK.',
  '..KKDDDDDDDDKK..',
  '..KKdMMMMMMdKK..',
  '.KKDDkDDkDDkDDKK',
  '.KKKKKKKKKKKKKK.'
];
```

#### `up_1` (Left Tread Step Back)
```javascript
const up_1 = [
  '.......KK.......',
  '......KAoK......',
  '...KKKKcKKKK....',
  '..KKyyyyyyyyKK..',
  '.KKYYYYYYYYYYJK.',
  '.KKYdMMddMMdYJK.',
  '.KKYdDDddDDdYJK.',
  '.KKYjjjjjjjjJJK.',
  '..KKKKKKKKKKKK..',
  'KKmYYYYYYYYmKK..',
  'KKmYdMdAAdMdYmKK',
  '.KKyJJJJJJJJJKK.',
  '..KKDDDDDDDDKK..',
  '.KKdMMMMd.dMMdKK',
  '.KKDDkDDKKDDkDDK',
  '.KKKKKKK.KKKKKK.'
];
```

#### `up_2` (Right Tread Step Back)
```javascript
const up_2 = [
  '.......KK.......',
  '......KAoK......',
  '...KKKKcKKKK....',
  '..KKyyyyyyyyKK..',
  '.KKYYYYYYYYYYJK.',
  '.KKYdMMddMMdYJK.',
  '.KKYdDDddDDdYJK.',
  '.KKYjjjjjjjjJJK.',
  '..KKKKKKKKKKKK..',
  '..KKmYYYYYYYYmKK',
  '.KKmYdMdAAdMdYmK',
  '.KKyJJJJJJJJJKK.',
  '..KKDDDDDDDDKK..',
  'KKdMMd.dMMMMdKK.',
  'KDDkDDKKDDkDDKK.',
  '.KKKKKK.KKKKKKK.'
];
```

---

### 3.3 Walk Left Cycles (Left Facing)

#### `left_0` (Neutral Left Profile)
```javascript
const left_0 = [
  '......KK........',
  '.....KAoK.......',
  '....KKcKK.......',
  '..KKyyyyyKK.....',
  '.KKYYYYYYYJK....',
  '.KKvZvvVvvZYJK..',
  '.KKvZvVWvVzYJK..',
  '.KKYjjjjjjJJK...',
  '..KKKKKKKKKK....',
  '.KKmYYYYYYmKK...',
  'KKmYdMaAaMdYmKK.',
  '.KKyJJJJJJJJJKK.',
  '..KKDDDDDDDDDKK.',
  '..KKdMMMMMMMdKK.',
  '.KKDDkDDkDDkDDKK',
  '.KKKKKKKKKKKKKK.'
];
```

#### `left_1` (Left Tread Step Forward)
```javascript
const left_1 = [
  '......KK........',
  '.....KAoK.......',
  '....KKcKK.......',
  '..KKyyyyyKK.....',
  '.KKYYYYYYYJK....',
  '.KKvZvvVvvZYJK..',
  '.KKvZvVWvVzYJK..',
  '.KKYjjjjjjJJK...',
  '.KKKKKKKKKKK....',
  'KKmYYYYYYmKK....',
  'KKmYdMaAaMdYmKK.',
  '.KKyJJJJJJJJJKK.',
  '..KKDDDDDDDDDKK.',
  '.KKdMMMMMMMdKK..',
  'KKDDkDDkDDkDDKK.',
  'KKKKKKKKKKKKKKK.'
];
```

#### `left_2` (Left Tread Step Rear)
```javascript
const left_2 = [
  '......KK........',
  '.....KAoK.......',
  '....KKcKK.......',
  '..KKyyyyyKK.....',
  '.KKYYYYYYYJK....',
  '.KKvZvvVvvZYJK..',
  '.KKvZvVWvVzYJK..',
  '.KKYjjjjjjJJK...',
  '...KKKKKKKKKK...',
  '..KKmYYYYYYmKK..',
  '..KKmYdMaAaMdYmK',
  '..KKyJJJJJJJJJKK',
  '..KKDDDDDDDDDKK.',
  '..KKdMMMMMMMdKK.',
  '.KKDDkDDkDDkDDKK',
  '.KKKKKKKKKKKKKK.'
];
```

---

### 3.4 Walk Right Cycles (Right Facing)

#### `right_0` (Neutral Right Profile)
```javascript
const right_0 = [
  '........KK......',
  '.......KAoK.....',
  '.......KKcKK....',
  '.....KKyyyyyKK..',
  '....KJYYYYYYYK.',
  '..KJYZvvVvvZvKK.',
  '..KJYzVwWVvZvKK.',
  '...KJJjjjjjjYKK.',
  '....KKKKKKKKKK..',
  '...KKmYYYYYYmKK.',
  '.KKmYdMaAaMdYmKK',
  '.KKJJJJJJJJJyKK.',
  '.KKDDDDDDDDDKK..',
  '.KKdMMMMMMMdKK..',
  'KKDkDkDkDkDDKK..',
  '.KKKKKKKKKKKKKK.'
];
```

#### `right_1` (Right Tread Step Forward)
```javascript
const right_1 = [
  '........KK......',
  '.......KAoK.....',
  '.......KKcKK....',
  '.....KKyyyyyKK..',
  '....KJYYYYYYYK.',
  '..KJYZvvVvvZvKK.',
  '..KJYzVwWVvZvKK.',
  '...KJJjjjjjjYKK.',
  '....KKKKKKKKKKK.',
  '....KKmYYYYYYmKK',
  '.KKmYdMaAaMdYmKK',
  '.KKJJJJJJJJJyKK.',
  '.KKDDDDDDDDDKK..',
  '..KKdMMMMMMMdKK.',
  '.KKDkDkDkDkDDKK.',
  '.KKKKKKKKKKKKKKK'
];
```

#### `right_2` (Right Tread Step Rear)
```javascript
const right_2 = [
  '........KK......',
  '.......KAoK.....',
  '.......KKcKK....',
  '.....KKyyyyyKK..',
  '....KJYYYYYYYK.',
  '..KJYZvvVvvZvKK.',
  '..KJYzVwWVvZvKK.',
  '...KJJjjjjjjYKK.',
  '...KKKKKKKKKK...',
  '..KKmYYYYYYmKK..',
  'KmYdMaAaMdYmKK..',
  'KKJJJJJJJJJyKK..',
  '.KKDDDDDDDDDKK..',
  '.KKdMMMMMMMdKK..',
  'KKDkDkDkDkDDKK..',
  '.KKKKKKKKKKKKKK.'
];
```

---

### 3.5 Action Animations (Water, Harvest, Pick)

#### `water_down_0..2` (Watering Action)
```javascript
const water_down_0 = [
  '.......KK.......',
  '......KAoK......',
  '...KKKKcKKKK....',
  '..KKyyyyyyyyKK..',
  '.KKYYYYYYYYYYJK.',
  '.KKYZvvVVvvZYJK.',
  '.KKYZvVWvWVzYJK.',
  '.KKYjjjjjjjjJJK.',
  '..KKKKKKKKKKKK..',
  '.KKmYYYYYYYYmKK.',
  'KKmYdMaAaMdyKnKK',
  '.KKyJJJJJJJJmMMK',
  '..KKDDDDDDDKdMK.',
  '..KKdMMMMMMKdMK.',
  '.KKDDkDDkDDKdKKK',
  '.KKKKKKKKKKKKKK.'
];

const water_down_1 = [
  '.......KK.......',
  '......KAoK......',
  '...KKKKcKKKK....',
  '..KKyyyyyyyyKK..',
  '.KKYYYYYYYYYYJK.',
  '.KKYZvvVVvvZYJK.',
  '.KKYZvVWvWVzYJK.',
  '.KKYjjjjjjjjJJK.',
  '..KKKKKKKKKKKK..',
  '.KKmYYYYYYYYmKK.',
  'KKmYdMaAaMdyFKKK',
  '.KKyJJJJJJJBFKnK',
  '..KKDDDDDDDZZKMm',
  '..KKdMMMMMM2KdUK',
  '.KKDDkDDkDD2KdWK',
  '.KKKKKKKKKKKKKUK'
];

const water_down_2 = [
  '.......KK.......',
  '......KAoK......',
  '...KKKKcKKKK....',
  '..KKyyyyyyyyKK..',
  '.KKYYYYYYYYYYJK.',
  '.KKYZvvVVvvZYJK.',
  '.KKYZvVWvWVzYJK.',
  '.KKYjjjjjjjjJJK.',
  '..KKKKKKKKKKKK..',
  '.KKmYYYYYYYYmKK.',
  'KKmYdMaAaMdyFKKK',
  '.KKyJJJJJJJBFKKK',
  '..KKDDDDDDDZFKnK',
  '..KKdMMMMMMZKMmK',
  '.KKDDkDDkDD2KdUK',
  '.KKKKKKKKKKKKdWK'
];
```

#### `harvest_down_0..2` (Harvesting Action)
```javascript
const harvest_down_0 = [
  '................',
  '.......KK.......',
  '......KAoK......',
  '...KKKKcKKKK....',
  '..KKyyyyyyyyKK..',
  '.KKYYYYYYYYYYJK.',
  '.KKYZvvVVvvZYJK.',
  '.KKYZvVWvWVzYJK.',
  '.KKYjjjjjjjjJJK.',
  '..KKKKKKKKKKKK..',
  '.KKmYYYYYYYYmKK.',
  'KKmYdMaAaMdymKK.',
  '.KKyJJJJJJJJJKK.',
  '..KKDDDDDDDDKK..',
  '.KKDDkDDkDDkDDKK',
  '.KKKKKKKKKKKKKK.'
];

const harvest_down_1 = [
  '................',
  '................',
  '.......KK.......',
  '......KAoK......',
  '...KKKKcKKKK....',
  '..KKyyyyyyyyKK..',
  '.KKYYYYYYYYYYJK.',
  '.KKYZvvVVvvZYJK.',
  '.KKYZvVWvWVzYJK.',
  '.KKYjjjjjjjjJJK.',
  '..KKKKKKKKKKKK..',
  '.KKmYGAAgGYmKK..',
  'KKmYZaAaAaXZqXKK',
  '.KKyZsDDsZJJQK..',
  '.KKDDkDDkDDkDDKK',
  '.KKKKKKKKKKKKKK.'
];

const harvest_down_2 = [
  '.......KK.......',
  '......KAoK......',
  '..KKgXaAaAXgKK..',
  '..KKXsDDsXKK....',
  '..KKyyyyyyyyKK..',
  '.KKYYYYYYYYYYJK.',
  '.KKYZvvVVvvZYJK.',
  '.KKYZvVWvWVzYJK.',
  '.KKYjjjjjjjjJJK.',
  '..KKKKKKKKKKKK..',
  '.KKmYYYYYYYYmKK.',
  'KKmYdMaAaMdymKK.',
  '.KKyJJJJJJJJJKK.',
  '..KKDDDDDDDDKK..',
  '.KKDDkDDkDDkDDKK',
  '.KKKKKKKKKKKKKK.'
];
```

#### `pick_down_0..2` (Picking Up Item)
```javascript
const pick_down_0 = [
  '.......KK.......',
  '......KAoK......',
  '...KKKKcKKKK....',
  '..KKyyyyyyyyKK..',
  '.KKYYYYYYYYYYJK.',
  '.KKYZvvVVvvZYJK.',
  '.KKYZvVWvWVzYJK.',
  '.KKYjjjjjjjjJJK.',
  '..KKKKKKKKKKKK..',
  '.KKmYYYYYYYYmKK.',
  'KKmYdMaAaMdymXKK',
  '.KKyJJJJJJJJJKXK',
  '..KKDDDDDDDDKKKK',
  '..KKdMMMMMMdKK..',
  '.KKDDkDDkDDkDDKK',
  '.KKKKKKKKKKKKKK.'
];

const pick_down_1 = [
  '.......KKKKKKKKK',
  '......KAoKKXaK..',
  '...KKKKcKKKaK...',
  '..KKyyyyyyyyKDKK',
  '.KKYYYYYYYYYKKKK',
  '.KKYZvvVVvvZYJK.',
  '.KKYZvVWvWVzYJK.',
  '.KKYjjjjjjjjJJK.',
  '..KKKKKKKKKKKK..',
  '.KKmYYYYYYYYmKK.',
  'KKmYdMaAaMdymKK.',
  '.KKyJJJJJJJJJKK.',
  '..KKDDDDDDDDKK..',
  '..KKdMMMMMMdKK..',
  '.KKDDkDDkDDkDDKK',
  '.KKKKKKKKKKKKKK.'
];

const pick_down_2 = [
  '.......KK.......',
  '......KAoK......',
  '...KKKKcKKKK....',
  '..KKyyyyyyyyKK..',
  '.KKYYYYYYYYYYJK.',
  '.KKYZvvVVvvZYJK.',
  '.KKYZvVWvWVzYJK.',
  '.KKYjjjjjjjjJJK.',
  '..KKKKKKKKKKKK..',
  '.KKmYYYYYYYYmKK.',
  'KKmYdMaAaMdymKK.',
  '.KKyJJJJJJJJJKK.',
  '..KKDDDDDDDDKK..',
  '..KKdMMMMMMdKK..',
  '.KKDDkDDkDDkDDKK',
  '.KKKKKKKKKKKKKK.'
];
```

---

### 3.6 Standalone Industrial Tool Sprites

#### `tool_watering_can` (Industrial Robot Water Tank)
```javascript
const tool_watering_can = [
  '................',
  '....KKKKKKKK....',
  '....KKnKKKnKK...',
  '....KKnCCCnKK...',
  '....KKnMMMnKK...',
  '...KKdYYYYYmKK..',
  '..KKdYYYYYYYmKK.',
  '..KKdYYAaYYYmKKK',
  '..KKdYYYYYYYmKnK',
  '..KKdYYYYYYYmKdK',
  '..KKdddddddddKUK',
  '...KKKKKKKKKKKWK',
  '.............KKK',
  '................',
  '................',
  '................'
];
```

#### `tool_basket` (Industrial Cargo Crate)
```javascript
const tool_basket = [
  '.....KKKKKK.....',
  '.....KKmmKK.....',
  '....KKmKKmKK....',
  '....KKmKKmKKK...',
  '...KKmGAAgGmKK..',
  '..KKgXaAaAXgKKK.',
  '.KKgAYsDDsYAaGKK',
  'KKmYjYjYjYjYjYmK',
  'KKmjYjYjYjYjYjmK',
  'KKmYjYjYjYjYjYmK',
  'KKmjYjYjYjYjYjmK',
  '.KKmmmmmmmmmmKKK',
  '.KKKKKKKKKKKKKKK',
  '................',
  '................',
  '................'
];
```

#### `tool_sickle` (Laser Harvester Sickle)
```javascript
const tool_sickle = [
  '................',
  '......KKKKKK....',
  '....KKKKCCCKKK..',
  '...KKKCcVVKKK...',
  '..KKKCcVVdKK....',
  '.KKKCcVVdKK.....',
  '.KKCcVVdKK......',
  'KKKCcVVdK.......',
  'KKKCcVVdK.......',
  '.KKKcVdKK.......',
  '..KKKyyjK.......',
  '...KKKyjKK......',
  '....KKKjjKK.....',
  '.....KKKJKK.....',
  '......KKKK......',
  '................'
];
```

---

## 4. Verification & Implementation Roadmap

1. **Syntax Check**: Ensure matrix strings are valid 16-character array elements.
2. **Key Preservation**: Verify that frame key names (`player_walk_down_0`, `farmer0`, etc.) match standard contract names.
3. **Dual File Sync**: Apply edits to `game.js` and copy `game.js` to `assets/game.js` to guarantee byte-for-byte SHA256 equality.
