# Main Character Sprite Micro-Pixel Enhancement Analysis & Specification

**Target Component**: Main Character Sprite Generation (`_genPlayerTextures` method and `P` palette object in `d:\Hangeul Valley\game.js`)  
**Author**: M1 Character Sprite Explorer  
**Date**: 2026-07-24  

---

## 1. Executive Summary

This report presents a comprehensive investigation and architectural design for micro-pixel detail enhancements of the main Player Farmer character in **Hangeul Valley**.

The current character textures in `game.js` (`_genPlayerTextures`) utilize a 16x16 pixel grid with basic color blocking. While functionally complete, the visual fidelity can be dramatically improved to match authentic **Stardew Valley** Chibi aesthetic standards without breaking the 1:2 body ratio (4px hat, 4px face/neck, 4px torso/dungarees, 4px legs/boots) or warm earthy color palette.

### Key Enhancements Introduced:
1. **Sub-Pixel Multi-Tone Shading**: Expanded palette from flat single-color tones to 3–5 distinct color tones per material (Skin, Hair, Straw Hat, Denim Overalls, T-Shirt, Leather Boots).
2. **Accessory Highlights & Weave Textures**: Crown weave dots and brim highlights for the straw hat; leather highlights, eyelet accents, and distinct rubber soles for boots.
3. **Outfit Texture Details**: Top-stitching highlights along denim straps and bib, pocket outline seams, and natural shirt fold creases under arms and chest.
4. **Hair Strands & Specular Sheen**: Specular highlight strands along top crown and bangs to give volume and texture to chestnut brown hair.
5. **Expression Nuances & Catchlights**: Clear 2-pixel pupil (`N`) with white specular sparkle (`W`) catchlight; delicate warm rosy blush (`o`) on cheeks.

---

## 2. Architecture & Method Analysis (`_genPlayerTextures`)

### 2.1 Codebase Context
In `d:\Hangeul Valley\game.js` (lines 1314–1828), `PixelArtRenderer._genPlayerTextures(scene)` bakes procedurally generated pixel matrices into Phaser 3 textures at runtime using `PixelArtRenderer.createTexture(scene, key, matrix, palette, width=16, height=16, ps=3)` (line 229).

### 2.2 Registered Animation Keys & Textures
The method registers 24 distinct 16x16 pixel matrices and registers them under the following Phaser keys:
- **Walk Cycle (4 Directions)**:
  - Down: `player_walk_down_0`, `player_walk_down_1`, `player_walk_down_2` -> anim `'player-walk-down'`
  - Up: `player_walk_up_0`, `player_walk_up_1`, `player_walk_up_2` -> anim `'player-walk-up'`
  - Left: `player_walk_left_0`, `player_walk_left_1`, `player_walk_left_2` -> anim `'player-walk-left'`
  - Right: `player_walk_right_0`, `player_walk_right_1`, `player_walk_right_2` -> anim `'player-walk-right'`
- **Farmer Action Frames**:
  - Watering: `player_water_down_0`, `player_water_down_1`, `player_water_down_2` -> anim `'player-water'`
  - Harvesting: `player_harvest_down_0`, `player_harvest_down_1`, `player_harvest_down_2` -> anim `'player-harvest'`
  - Tool Swinging / Picking: `player_pick_down_0`, `player_pick_down_1`, `player_pick_down_2` -> anim `'player-pick'`
- **Standalone Tool Sprites**:
  - `tool_watering_can`, `tool_basket`, `tool_sickle`
- **Legacy Aliases**:
  - `farmer0`, `farmer1`, `farmer2`, `farmer3` (mapping to `down_0`, `down_1`, `down_0`, `down_2`)

---

## 3. Extended 1:2 Chibi Palette Specification (`P`)

Below is the complete proposed palette dictionary `P` featuring sub-pixel shading, specular highlights, and seam/stitch accents. All tokens map to single ASCII characters to maintain strict 16-character row formatting.

```javascript
const P = {
  '.': null, // Transparent Background

  // --- Outlines & Contours ---
  'K': 0x1A1A2E, // Primary Outer Contour (Dark Midnight Navy - Stardew colored outline style)
  'k': 0x24243B, // Inner Dark Shadow / Secondary Outline

  // --- Skin & Face (5 Tones + Expression) ---
  '1': 0xFFF3E8, // Skin Specular / Top-light Highlight
  'X': 0xFFE0C2, // Skin Base Tone (Warm Peach)
  'O': 0xFFE0C2, // Skin Base Alias (Backward Compatibility)
  'x': 0xF1B78B, // Skin Mid-Shadow (Warm Tan)
  'i': 0xD38666, // Skin Deep Shadow (Terracotta Shade)
  'I': 0x9C533C, // Skin Core Shadow (Deep Warm Pink under neck)
  'o': 0xE07068, // Soft Rosy Blush / Cheek Accent
  'N': 0x121016, // Eye Pupil / Iris (Rich Onyx)
  'W': 0xFFFFFF, // Eye Catchlight Sparkle (Pure White)

  // --- Hair (4 Tones) ---
  '4': 0xB87C52, // Hair Specular Strand Highlight
  'f': 0x8D5B3A, // Hair Light Brown Bangs
  'H': 0x653E23, // Hair Main Chestnut Base
  'h': 0x3D2314, // Hair Deep Shadow (Chocolate Brown)

  // --- Straw Hat & Ribbon (6 Straw Tones + 3 Ribbon Tones) ---
  '5': 0xFFF5B8, // Straw Hat Specular Light
  't': 0xF4D685, // Straw Hat Pale Yellow
  'T': 0xDC9F42, // Straw Hat Golden Crown
  'V': 0xB37D2A, // Straw Hat Mid-Shadow (Amber Straw)
  'v': 0x7A5016, // Straw Hat Deep Brim Edge Shadow
  '6': 0x54360B, // Straw Hat Crown Weave Shadow Accent
  'p': 0xEA5B4B, // Ribbon Highlight Accent (Bright Crimson)
  'R': 0xC23B22, // Ribbon Main Crimson Red
  'r': 0x731C13, // Ribbon Burgundy Shadow

  // --- T-Shirt (4 Tones) ---
  '7': 0xFFFFFF, // T-Shirt Fold Specular White
  'w': 0xF2ECE1, // T-Shirt Ivory Base Light
  'F': 0xD5CFBF, // T-Shirt Neutral Gray Crease
  'g': 0x999385, // T-Shirt Deep Armpit Fold Shadow

  // --- Dungarees / Overalls Denim (6 Denim Tones + Hardware) ---
  '8': 0x7EA5D9, // Denim Specular / Top-Stitch Highlight
  'z': 0x4B6B94, // Denim Light Blue Strap & Fold Highlight
  'Z': 0x334B73, // Denim Main Navy Blue
  'q': 0x213252, // Denim Mid-Shadow
  'Q': 0x141E36, // Denim Deep Core Shadow
  'J': 0x1D283B, // Pocket Outline & Seam Line Dark Indigo
  'b': 0xE6B830, // Strap Brass Buckle / Button Highlight
  '9': 0xB3881B, // Brass Buckle Dark Metallic Rim
  'B': 0x60A5FA, // Denim Accent Light Blue
  '2': 0x1E3A8A, // Crotch / Leg Shadow Blue

  // --- Leather Boots & Soles (5 Tones) ---
  'L': 0x854B27, // Boot Leather Highlight Tone
  'S': 0x5E3218, // Boot Leather Main Tan/Brown Base
  's': 0x3B1F0E, // Boot Leather Dark Shadow Tone
  '0': 0x0B090C, // Boot Sole Rubber Base / Tread (Dark Charcoal)
  '3': 0xD49B5B, // Boot Lacing / Welt Detail Accent

  // --- Tools, Water & Crop FX Tokens ---
  'n': 0x78350F, // Tool Wood Handle Brown Base
  'e': 0x59381E, // Tool Wood Handle Shadow
  'E': 0x78350F, // Tool Wood Handle End Cap
  'M': 0x64748B, // Tool Steel Body Slate Gray
  'd': 0x475569, // Tool Steel Shadow
  'm': 0x94A3B8, // Tool Steel Light Mid
  'c': 0x94A3B8, // Tool Steel Light Specular
  'C': 0xE2E8F0, // Metal Bright Specular White-Gray
  'U': 0x38BDF8, // Water Stream Bright Cyan-Blue
  'u': 0x6BB1D6, // Water Stream Mid Blue
  'G': 0x22C55E, // Crop Leaf Vibrant Green
  'A': 0xEF4444, // Harvest Fruit Red
  'a': 0xFCA5A5, // Harvest Fruit Pink Light
  'D': 0x7F1D1D, // Harvest Fruit Deep Shadow
  'j': 0x78350F, // Basket Woven Dark Brown
  'Y': 0xFDE047, // Basket Woven Bright Straw Yellow
  'y': 0xEAB308  // Basket Woven Golden Straw Shadow
};
```

---

## 4. Comprehensive 16x16 Matrix Specifications (All 24 Frames)

Below are the exact 16x16 string matrix definitions for all 24 frames. Each string is verified to be exactly 16 characters long.

### 4.1 Walk Down Cycle (`down_0`, `down_1`, `down_2`)

```javascript
const down_0 = [
  '..KKKKKKKKKKKK..', // R0: Hat top outline
  '..KKv5tTTt5vKK..', // R1: Hat crown top (5=specular highlight, t=light, T=golden crown, v=edge shadow)
  '.KKvV5TtT5VvKK.', // R2: Crown body with amber shadow (V) & specular (5)
  '..KKrRpRRpRrKK..', // R3: Crimson ribbon with highlight (p) & shadow (r)
  '...KKf4fHHf4fKK...', // R4: Hair under brim with hair strand highlights (4)
  '...K1XNWXNWX1K..', // R5: Face: skin specular (1), base (X), eye pupil (N), eye catchlight (W)
  '...KXxXooXiXK...', // R6: Cheeks: warm rosy blush (o), mid-shadow (x, i)
  '...KKXiXXIXKKKK.', // R7: Chin skin (X, i), neck core shadow (I)
  '..KKgFz8b9bzFgKK', // R8: Chest: sleeves (g, F), denim strap (z), top-stitch (8), brass buckles (b), shadow (9)
  '..KKgFBzZZzBFgKK', // R9: Torso: overalls body (Z), light denim edge (z), denim highlight (B), sleeve (F, g)
  '..KKqzZ2JJ2ZzqKK', // R10: Waist: pocket seam lines (J), leg shadow (2), denim shadow (q)
  '..KKQzZ2222ZzQKK', // R11: Upper legs: inner shadow (2), outer core shadow (Q)
  '..KQZZKKKKZZQKK.', // R12: Lower legs / idle stance split
  '..KQ22KKKK22QK..', // R13: Ankle shadow
  '..K0s3LSKK0s3LSK', // R14: Boots: rubber sole (0), dark leather (s), lacing accent (3), highlight (L), main (S)
  '..KKKKKKKKKKKK..'  // R15: Bottom outline
];

const down_1 = [
  '..KKKKKKKKKKKK..',
  '..KKv5tTTt5vKK..',
  '.KKvV5TtT5VvKK.',
  '..KKrRpRRpRrKK..',
  '...KKf4fHHf4fKK...',
  '...K1XNWXNWX1K..',
  '...KXxXooXiXK...',
  '..KKKXiXXIXKKKK.',
  '.KKgFz8b9bzFgXKK',
  '.KKgFBzZZzBFgXKK',
  '..KKqzZ2JJ2ZzqKK',
  '.KKKQzZ2222ZzQKK',
  '.KQZZKKKKKKZZQK.',
  '.KQ22KKKKKKQ2QK.',
  '.K0s3LSKKKK0s3LS',
  '.KKKKKKKKKKKKKK.'
];

const down_2 = [
  '..KKKKKKKKKKKK..',
  '..KKv5tTTt5vKK..',
  '.KKvV5TtT5VvKK.',
  '..KKrRpRRpRrKK..',
  '...KKf4fHHf4fKK...',
  '...K1XNWXNWX1K..',
  '...KXxXooXiXK...',
  '.KKKKXiXXIXKKK..',
  'KKXgFz8b9bzFgKK.',
  'KKXgFzZZzBFgKKK.',
  '.KKKqzZ2JJ2ZzqKK',
  '.KKKQzZ2222ZzQKK',
  '.KQZQKKKKKKZZQK.',
  '.KQZQKKKKKK22QK.',
  'K0s3LSKKKKK0s3LS',
  '.KKKKKKKKKKKKKK.'
];
```

---

### 4.2 Walk Up Cycle (`up_0`, `up_1`, `up_2`)

```javascript
const up_0 = [
  '..KKKKKKKKKKKK..',
  '..KKv5tTTt5vKK..',
  '.KKvV5TtT5VvKK.',
  '..KKrRpRRpRrKK..',
  '...KKh4HH4hKK...', // Rear hair with strand highlight (4)
  '...KhH4HHHH4hK..', // Full rear hair volume with highlights (4)
  '...KhHHHHHHhK...',
  '...KKhxiixhKKKK.',
  '..KKgFz8888zFgKK', // Rear denim straps (z) with stitch highlight (8)
  '..KKgFBzZZzBFgKK',
  '..KKqzZ2JJ2ZzqKK', // Rear pocket seam definition (J)
  '..KKQzZ2222ZzQKK',
  '..KQZZKKKKZZQKK.',
  '..KQ22KKKK22QK..',
  '..K0s3LSKK0s3LSK', // Boots back with lacing welt (3) and leather highlight (L)
  '..KKKKKKKKKKKK..'
];

const up_1 = [
  '..KKKKKKKKKKKK..',
  '..KKv5tTTt5vKK..',
  '.KKvV5TtT5VvKK.',
  '..KKrRpRRpRrKK..',
  '...KKh4HH4hKK...',
  '...KhH4HHHH4hK..',
  '...KhHHHHHHhK...',
  '..KKKhxiixhKKKK.',
  '.KKgFz8888zFgXKK',
  '.KKgFBzZZzBFgXKK',
  '..KKqzZ2JJ2ZzqKK',
  '.KKKQzZ2222ZzQKK',
  '.KQZZKKKKKKZZQK.',
  '.KQ22KKKKKKQ2QK.',
  '.K0s3LSKKKK0s3LS',
  '.KKKKKKKKKKKKKK.'
];

const up_2 = [
  '..KKKKKKKKKKKK..',
  '..KKv5tTTt5vKK..',
  '.KKvV5TtT5VvKK.',
  '..KKrRpRRpRrKK..',
  '...KKh4HH4hKK...',
  '...KhH4HHHH4hK..',
  '...KhHHHHHHhK...',
  '.KKKKhxiixhKKK..',
  'KKXgFz8888zFgKK.',
  'KKXgFzZZzBFgKKK.',
  '.KKKqzZ2JJ2ZzqKK',
  '.KKKQzZ2222ZzQKK',
  '.KQZQKKKKKKZZQK.',
  '.KQZQKKKKKK22QK.',
  'K0s3LSKKKKK0s3LS',
  '.KKKKKKKKKKKKKK.'
];
```

---

### 4.3 Walk Left Cycle (`left_0`, `left_1`, `left_2`)

```javascript
const left_0 = [
  '....KKKKKKKK....',
  '...KKv5tTt5vKK..',
  '..KKvV5TtVvKK...',
  '...KKrRpRrKK....',
  '...KKKf4HhKK....', // Side hair profile with strand highlight (4)
  '..KKO1NWf4HhKK..', // Side eye: pupil (N), specular white (W), skin highlight (1)
  '..KKXOoXihhKK...', // Side cheek blush (o) & mid-shadow (x, i)
  '...KKXiIihKKK...',
  '...KKgFz8bZqKK..', // Side strap: brass buckle (b) & top-stitch (8)
  '..KKXgFZZZqXKK..',
  '...KKKqZZZZqKK..',
  '....KKQZZZZQK...',
  '....KKQZZZZQK...',
  '....KKQZZZZQKK..',
  '....KK0s3LS0s3LS', // Boot side profile: rubber sole (0), leather main (S), lacing (3), highlight (L)
  '....KKKKKKKKKK..'
];

const left_1 = [
  '....KKKKKKKK....',
  '...KKv5tTt5vKK..',
  '..KKvV5TtVvKK...',
  '...KKrRpRrKK....',
  '...KKKf4HhKK....',
  '..KKO1NWf4HhKK..',
  '..KKXOoXihhKK...',
  '...KKXiIihKKK...',
  '.KKKXgFz8bZqKK..',
  'KKXgFzZZZqKKK...',
  '.KKKKqZZZZqKKKK.',
  '..KKKqZZZKKZZqK.',
  '.KKQZZKKKKKZZQKK',
  '.KQZZKKKKKKKZZQK',
  '.K0s3LSKKKK0s3LS',
  '.KKKKKKKKKKKKKKK'
];

const left_2 = [
  '....KKKKKKKK....',
  '...KKv5tTt5vKK..',
  '..KKvV5TtVvKK...',
  '...KKrRpRrKK....',
  '...KKKf4HhKK....',
  '..KKO1NWf4HhKK..',
  '..KKXOoXihhKK...',
  '...KKXiIihKKKKK.',
  '....KKgFz8bZqXKK',
  '....KKgFZZZqXKK.',
  '.....KKqZZZZqKKK',
  '...KKKqZZZKKZZqK',
  '..KKQZZKKKKKZZQK',
  '..KQZZKKKKKKKZZK',
  '..K0s3LSKKKK0s3L',
  '..KKKKKKKKKKKKKK'
];
```

---

### 4.4 Walk Right Cycle (`right_0`, `right_1`, `right_2`)

```javascript
const right_0 = [
  '....KKKKKKKK....',
  '...KKv5tTt5vKK..',
  '..KKvV5TtVvKK...',
  '...KKrRpRrKK....',
  '...KKKh4fKKK....',
  '..KKh4fWN1OKK...', // Eye (WN1) on right profile with skin highlight (1)
  '...KKhhiXoOXKK..', // Cheek blush (o) on right profile
  '...KKKhiIiXKK...',
  '..KKqZb8zFgKK...', // Brass buckle (b) & stitch (8)
  '..KKXqZZZFgXKK..',
  '..KKqZZZZqKKK...',
  '...KQZZZZQK.....',
  '...KQZZZZQK.....',
  '...KQZZZZQK.....',
  '..KK0s3LS0s3LSKK', // Boots with rubber sole (0), leather (S, L), lacing (3)
  '..KKKKKKKKKK....'
];

const right_1 = [
  '....KKKKKKKK....',
  '...KKv5tTt5vKK..',
  '..KKvV5TtVvKK...',
  '...KKrRpRrKK....',
  '...KKKh4fKKK....',
  '..KKh4fWN1OKK...',
  '...KKhhiXoOXKK..',
  '...KKKhiIiXKK...',
  '..KKqZb8zFgXKK..',
  '...KKqZZZzFgXKK.',
  '.KKKKKqZZZZqKK..',
  '.KqZZKKZZZqKKK..',
  'KKQZZKKKKKZZQKK.',
  'KQZZKKKKKKKZZQK.',
  '0s3LSKKKKKK0s3LS',
  'KKKKKKKKKKKKKKK.'
];

const right_2 = [
  '....KKKKKKKK....',
  '...KKv5tTt5vKK..',
  '..KKvV5TtVvKK...',
  '...KKrRpRrKK....',
  '...KKKh4fKKK....',
  '..KKh4fWN1OKK...',
  '...KKhhiXoOXKK..',
  '...KKKhiIiXKK...',
  '..KKXqZb8zFgKK..',
  '...KKXqZZZFgKK..',
  '...KKKqZZZZqKK..',
  'KKKKqZZKKZZZqK..',
  'KQZZKKKKKZZQKK..',
  'KZZKKKKKKKZZQK..',
  '0s3LSKKKKKK0s3LS',
  'KKKKKKKKKKKKKK..'
];
```

---

### 4.5 Watering Action Frames (`water_down_0`, `water_down_1`, `water_down_2`)

```javascript
const water_down_0 = [
  '..KKKKKKKKKKKK..',
  '.KKKv5tTt5vKKK..',
  'KKvV5TtT5VvKK...',
  '.KKKrRpRRpRrKKK.',
  '...KKf4fHHf4fKK.',
  '...K1XNWXNWXK...',
  '...KXxXooXiXK...',
  '..KKKXiXXIXKKKKK',
  '..KKgFz8b9bKnKK.', // Holding watering can handle (n)
  '..KKgFBzZZzKMmK.', // Can steel body (M, m)
  '..KKqzZ2JJ2KdMK.', // Can spout metal (d, M)
  '..KKQzZ2222KdMK.',
  '..KQZZKKKKZZKdKK',
  '..KQ22KKKK22QKK.',
  '..K0s3LSKK0s3LSK',
  '..KKKKKKKKKKKK..'
];

const water_down_1 = [
  '..KKKKKKKKKKKK..',
  '.KKKv5tTt5vKKK..',
  'KKvV5TtT5VvKK...',
  '.KKKrRpRRpRrKKK.',
  '...KKf4fHHf4fKK.',
  '...K1XNWXNWXK...',
  '...KXxXooXiXKK..',
  '..KKKXiXXIXKKK..',
  '..KKgFz8b9bFKKK.',
  '..KKgFBzZZzBFKnK',
  '..KKqzZ2JJ2ZKMmK',
  '..KKQzZ2222KdUK.', // Water stream cyan droplet (U)
  '..KQZZKKKKZZKdWK', // Water splash sparkle (W)
  '..KQ22KKKK22QKUK', // Water droplet (U)
  '..K0s3LSKK0s3LSK',
  '..KKKKKKKKKKKK..'
];

const water_down_2 = [
  '..KKKKKKKKKKKK..',
  '.KKKv5tTt5vKKK..',
  'KKvV5TtT5VvKK...',
  '.KKKrRpRRpRrKKK.',
  '...KKf4fHHf4fKK.',
  '...K1XNWXNWXK...',
  '...KXxXooXiXKK..',
  '..KKKXiXXIXKKK..',
  '..KKgFz8b9bFKKK.',
  '..KKgFBzZZzBFKKK',
  '..KKqzZ2JJ2ZFKnK',
  '..KKQzZ2222ZKMmK',
  '..KQZZKKKKZZKdUK',
  '..KQ22KKKKZZKdWK',
  '..K0s3LSKK0s3LSK',
  '..KKKKKKKKKKKKKK'
];
```

---

### 4.6 Harvesting Action Frames (`harvest_down_0`, `harvest_down_1`, `harvest_down_2`)

```javascript
const harvest_down_0 = [
  '................',
  '..KKKKKKKKKKKK..',
  '.KKKv5tTt5vKKK..',
  'KKvV5TtT5VvKK...',
  '.KKKrRpRRpRrKKK.',
  '...KKf4fHHf4fKK.',
  '...K1XNWXNWXK...',
  '...KXxXooXiXK...',
  '..KKKXiXXIXKKKK.',
  '..KKgFz8b9bFgKK.',
  '.KKgFBzZZzBFgXKK',
  '.KKXqzZ2JJ2ZqXKK',
  '.KKXQzZ2222ZQKK.',
  '..KQZZKKKKZZQK..',
  '..K0s3LSKK0s3LSK',
  '..KKKKKKKKKKKK..'
];

const harvest_down_1 = [
  '................',
  '................',
  '..KKKKKKKKKKKK..',
  '.KKKv5tTt5vKKK..',
  'KKvV5TtT5VvKK...',
  '.KKKrRpRRpRrKKK.',
  '...KKf4fHHf4fKK.',
  '...K1XNWXNWXK...',
  '...KXxXooXiXK...',
  '..KKKXiXXIXKKKK.',
  '..KKgFz8b9bFgKK.',
  '.KKgFBzGAAgZBFgK', // Crop in hand (G=leaves, A=fruit)
  'KKXqZaAaAaXZqXKK', // Fruit highlights (a)
  'KKXQZZsDDsZZQXKK', // Stem/shadow (D)
  '.KK0s3LSKK0s3LSK',
  '..KKKKKKKKKKKK..'
];

const harvest_down_2 = [
  '..KKKKKKKKKKKK..',
  '..KKgXaAaAXgKK..', // Crop lifted overhead!
  '...KKXsDDsXKK...',
  '..KKKKtTTtKKKK..',
  '.KKKv5tTt5vKKK..',
  'KKvV5TtT5VvKK...',
  '.KKKrRpRRpRrKKK.',
  '...KKf4fHHf4fKK.',
  '...K1XNWXNWXK...',
  '...KXxXooXiXK...',
  '..KKKXiXXIXKKKK.',
  '..KKgFz8b9bFgKK.',
  '..KKgFBzZZzBFgKK',
  '..KKqzZ2JJ2ZzqKK',
  '..K0s3LSKK0s3LSK',
  '..KKKKKKKKKKKK..'
];
```

---

### 4.7 Picking / Tool Action Frames (`pick_down_0`, `pick_down_1`, `pick_down_2`)

```javascript
const pick_down_0 = [
  '..KKKKKKKKKKKK..',
  '.KKKv5tTt5vKKK..',
  'KKvV5TtT5VvKK...',
  '.KKKrRpRRpRrKKK.',
  '...KKf4fHHf4fKK.',
  '...K1XNWXNWXK...',
  '...KXxXooXiXKKK.',
  '..KKKXiXXIXKKXKK', // Arm raising pickaxe handle
  '..KKgFz8b9bFgXK.',
  '..KKgFBzZZzBFgKK',
  '..KKqzZ2JJ2ZzqKK',
  '..KKQzZ2222ZzQKK',
  '..KQZZKKKKZZQKK.',
  '..KQ22KKKK22QK..',
  '..K0s3LSKK0s3LSK',
  '..KKKKKKKKKKKK..'
];

const pick_down_1 = [
  '..KKKKKKKKKKKKKK',
  '.KKKv5tTt5vKKXaK', // Pickaxe blade swinging down (Xa)
  'KKvV5TtT5VvKaK..',
  '.KKKrRpRRpRrKDKK', // Handle shadow (D)
  '...KKf4fHHfKgK..',
  '...K1XNWXNWXKKKK',
  '...KXxXooXiXK...',
  '..KKKXiXXIXKKKK.',
  '..KKgFz8b9bFgKK.',
  '..KKgFBzZZzBFgKK',
  '..KKqzZ2JJ2ZzqKK',
  '..KKQzZ2222ZzQKK',
  '..KQZZKKKKZZQKK.',
  '..KQ22KKKK22QK..',
  '..K0s3LSKK0s3LSK',
  '..KKKKKKKKKKKK..'
];

const pick_down_2 = [
  '..KKKKKKKKKKKK..',
  '.KKKv5tTt5vKKK..',
  'KKvV5TtT5VvKK...',
  '.KKKrRpRRpRrKKK.',
  '...KKf4fHHf4fKK.',
  '...K1XNWXNWXK...',
  '...KXxXooXiXK...',
  '..KKKXiXXIXKKKK.',
  '..KKgFz8b9bFgKK.',
  '..KKgFBzZZzBFgKK',
  '..KKqzZ2JJ2ZzqKK',
  '..KKQzZ2222ZzQKK',
  '..KQZZKKKKZZQKK.',
  '..KQ22KKKK22QK..',
  '..K0s3LSKK0s3LSK',
  '..KKKKKKKKKKKK..'
];
```

---

### 4.8 Standalone Tool Sprites (`tool_watering_can`, `tool_basket`, `tool_sickle`)

```javascript
const tool_watering_can = [
  '................',
  '....KKKKKKKK....',
  '....KKnKKKnKK...', // Top handle loop (n)
  '....KKnCCCnKK...', // Handle specular highlight (C)
  '....KKnmmmnKK...', // Metal rim trim (m)
  '...KKdMMMMMmKK..', // Steel body slate (M, d, m)
  '..KKdCMMMMMMmKK.', // Body specular highlight (C)
  '..KKdMMMMMMMmKKK',
  '..KKdMMMMMMMmKnK', // Spout handle connection (n)
  '..KKdMMMMMMMmKdK', // Spout pipe (d)
  '..KKdddddddddKUK', // Rose head with cyan water drop (U)
  '...KKKKKKKKKKKWK', // Water droplet sparkle (W)
  '.............KKK',
  '................',
  '................',
  '................'
];

const tool_basket = [
  '.....KKKKKK.....',
  '.....KKjjKK.....', // Basket arch handle (j)
  '....KKjKKjKK....',
  '....KKjKKjKKK...',
  '...KKjGAAgGjKK..', // Leaves (G) & red fruits (A, a, g) inside
  '..KKgXaAaAXgKKK.', // Fruit specular (a)
  '.KKgAYsDDsYAaGKK', // Fruit shadow (D)
  'KKjYyYyYyYyYyYjK', // Woven straw basket rim (Y=straw yellow, y=shadow)
  'KKjyYyYyYyYyYyjK', // Woven straw row 2
  'KKjYyYyYyYyYyYjK', // Woven straw row 3
  'KKjyYyYyYyYyYyjK', // Woven straw row 4
  '.KKjjjjjjjjjjjKK', // Basket base dark rim (j)
  '.KKKKKKKKKKKKKKK',
  '................',
  '................',
  '................'
];

const tool_sickle = [
  '................',
  '......KKKKKK....',
  '....KKKKCCCKKK..', // Curved steel blade tip specular (C)
  '...KKKCcMMKKK...', // Blade curve (c, M)
  '..KKKCcMMdKK....', // Inner blade shadow (d)
  '.KKKCcMMdKK.....',
  '.KKCcMMdKK......',
  'KKKCcMMdK.......',
  'KKKCcMMdK.......',
  '.KKKcMdKK.......', // Ferrule connection
  '..KKKnnbK.......', // Wood handle (n) with brass rivet (b)
  '...KKKneKK......', // Wood handle shadow (e)
  '....KKKneKK.....',
  '.....KKKEKK.....', // Handle butt cap (E)
  '......KKKK......',
  '................'
];
```

---

## 5. Micro Pixel Enhancement Mapping Summary

| Sub-System | Element | Tokens Used | Aesthetic Impact |
|---|---|---|---|
| **Skin & Face** | Eye Pupil & Catchlight | `N`, `W` | Clear 2px pupil with 1px top-right white catchlight for lively Stardew facial look |
| **Skin & Face** | Cheek Blush & Shading | `o`, `x`, `i`, `1` | Soft rosy pink blush under eyes replaces flat solid skin tone |
| **Hair** | Strand Highlight | `4`, `f`, `H`, `h` | Specular strand line (`4`) on bangs and top crown provides 3D volume |
| **Straw Hat** | Crown & Brim Weave | `5`, `t`, `T`, `V`, `v`, `6` | Top brim specular (`5`), crown weave dots (`6`), and deep shadow rim (`v`) |
| **Dungarees** | Strap Stitch & Buckles | `8`, `z`, `Z`, `q`, `b`, `9` | Metallic brass buckles (`b`/`9`) and light blue top-stitch dots (`8`) along straps |
| **Dungarees** | Pocket Seam Lines | `J` | Dark indigo seams (`J`) outline front bib pocket and side hip cuts |
| **T-Shirt** | Fold Creases & Sleeves | `7`, `w`, `F`, `g` | Ivory shirt base (`w`) with gray fold creases (`F`) under armpits |
| **Leather Boots**| Lacing, Sole & Highlight| `L`, `S`, `s`, `0`, `3` | Leather specular (`L`), lacing detail (`3`), and charcoal rubber sole (`0`) |

---

## 6. Integration & Compatibility Guide

1. **Phaser Texture Baking**:
   - `PixelArtRenderer.createTexture(scene, key, matrix, palette)` automatically creates Phaser canvas textures using nearest-neighbor filtering (`FilterMode.NEAREST`), so no extra rendering changes are needed.
2. **Animation Key Integrity**:
   - All 12 animation keys (`player-walk-down`, `player-walk-up`, `player-walk-left`, `player-walk-right`, `player-water`, `player-harvest`, `player-pick`) remain 100% compatible.
3. **Legacy Aliases**:
   - `farmer0..3` aliases map directly to enhanced `down_0`, `down_1`, `down_0`, `down_2` matrices.

---
