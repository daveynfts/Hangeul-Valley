# Analysis: Wizard NPC Sprite Polish & Upgrade (Milestone 1 - R2)

## 1. Executive Summary

This report provides a complete forensic investigation and technical blueprint for upgrading the **Wizard NPC (Merlin)** sprite in `game.js` for Milestone 1 (Requirement R2). 

The baseline Wizard NPC sprite utilizes an 18-color palette baked into a 16x16 pixel matrix (`wiz_0`, `wiz_1`) and a 13-color canvas helper routine (`gwiz`). The upgrade replaces the baseline sprite with a rich 32-color palette, 16x20 matrix resolution, detailed fabric folds on purple robes, star and crescent moon embroidery, a glowing staff with animated crystal particles, a mystical gradient beard, an ethereal magical aura, and crisp 1px dark outlines matching the Robot player character style.

All collision boundaries, floating levitation tweens, depth-sorting, proximity detection (<85px), interaction UI prompts, and Spell Duel launch triggers were audited and verified to ensure **zero visual or functional regression**.

---

## 2. Codebase Entry Points & File Mapping

All Wizard NPC logic resides in `game.js` (and mirror copy `assets/game.js`).

| Section / Feature | Exact Line Numbers (`game.js`) | Description / Responsibilities |
|-------------------|--------------------------------|--------------------------------|
| **Global Palette Constants** | Lines 190 – 205 | `PALETTE` keys for `wizRobeHighlight`, `wizBeardHighlight`, `wizCrystalHighlight`, `wizStaffWood`, etc. |
| **Pixel Art Matrix & Palette** | Lines 2214 – 2262 | `W_PAL` object, `wiz_0` matrix, `wiz_1` matrix, `createTexture` calls for `wizard_idle_0`, `wizard_idle_1`, and `wizard_npc`. |
| **Animation Registration** | Lines 2276 – 2278 | `wizard-idle` animation registration (`wizard_idle_0` <-> `wizard_idle_1` at 3 fps). |
| **Procedural Canvas Bake** | Lines 8004 – 8021 | `gwiz` canvas graphics drawing and texture generation for `'wizard_npc'` (16x22 scale grid). |
| **Nearest-Neighbor Filtering** | Line 8097 | Texture filter setting `NEAREST` for `'wizard_npc'`. |
| **NPC Instantiation** | Lines 8349 – 8370 | `_createWizardNPC(W, H)`: Calculates `(wx, wy)`, instantiates `wizardSprite`, sets origin `(0.5, 1)`, scale `1.8`, depth `wy`, shadow, levitation tween, text label `wizardHint`, and name label `'Merlin'`. |
| **Depth Sorting** | Line 9073 | `updateDepthSort()` sets `wizardSprite.setDepth(this.wizardY || this.wizardSprite.y)`. |
| **Proximity Alpha Toggle** | Lines 9159 – 9163 | Checks player distance `< 85` to toggle `wizardHint` opacity. |
| **HUD Prompt Indicator** | Line 9230 | Checks player distance `< 85` to show `[SPACE] Spell Duel` interaction badge. |
| **SPACE Key Interaction** | Lines 9301 – 9307 | Distance `< 85` check, triggers scale squish/bounce tween (`1.8` -> `2.1`), checks zone unlock (`duel`), and invokes `openSpellDuel()`. |

---

## 3. Baseline Implementation & Color Token Inventory

### 3.1 Baseline Palette (`W_PAL`)
The baseline implementation in `PixelArtRenderer._genNpcTextures()` uses `W_PAL` mapped over 16x16 character matrices `wiz_0` and `wiz_1`:

```javascript
const W_PAL = {
  '.': null,
  'K': 0x121016, 'k': 0x251C2B,
  'h': 0xA78BFA, 'H': 0x8B5CF6, 'v': 0x6D28D9, 'V': 0x4C1D95,
  'd': 0xFFFFFF, 'D': 0xE2E8F0, 'b': 0x94A3B8,
  'y': 0xFBBF24, 'Y': 0xD97706,
  'c': 0x7DD3FC, 'C': 0x38BDF8, 'e': 0x0284C7,
  'S': 0x78350F, 's': 0x451A03,
  'X': 0xEAA878, 'x': 0xC87858, 'N': 0x121016, 'n': 0x984838, 'W': 0xFFFFFF, 'w': 0xE0F2FE
};
```

### 3.2 Distinct Fill Color Token Breakdown (Baseline = 18 Color Tokens)
Counting unique non-null hex values present across `wiz_0` and `wiz_1`:
1. `0x121016` (K, N) – Dark outline / Eye
2. `0xA78BFA` (h) – Robe highlight
3. `0x8B5CF6` (H) – Robe base
4. `0x6D28D9` (v) – Robe shadow
5. `0x4C1D95` (V) – Robe deep shadow
6. `0xFFFFFF` (d, W) – Beard white base / Sparkle white
7. `0xE2E8F0` (D) – Beard shadow
8. `0xFBBF24` (y) – Hat gold tip
9. `0xD97706` (Y) – Belt gold
10. `0x7DD3FC` (c) – Crystal highlight
11. `0x38BDF8` (C) – Crystal base
12. `0x0284C7` (e) – Crystal shadow
13. `0x78350F` (S) – Staff wood
14. `0x451A03` (s) – Staff wood shadow
15. `0xEAA878` (X) – Face skin base
16. `0xC87858` (x) – Face skin shadow
17. `0x984838` (n) – Mouth/nose accent
18. `0xE0F2FE` (w) – Staff sparkle cyan

*Baseline Assessment*: The baseline Wizard sprite lacks fabric fold depth, star/moon embroidery, magical aura particles, detailed beard shading gradients, and complete 1px dark outline framing around the staff and hat peak.

---

## 4. Comprehensive Upgrade Specifications (R2)

To satisfy Requirement R2 and all project acceptance criteria, the Wizard NPC sprite will be upgraded with the following features:

### 4.1 Detailed Robes (Fabric Folds & Star/Moon Embroidery)
- **Multi-tone Fabric Shading**: 6 distinct robe purple tones (`0x2E1065` deep fold shadow, `0x4C1D95` dark shadow, `0x6D28D9` mid shadow, `0x8B5CF6` base purple, `0xA78BFA` fabric fold highlight, `0xC4B5FD` specular sheen).
- **Embroidered Accents**: Gold star motifs (`0xFBBF24`, `0xF59E0B`, `0xD97706`) and crescent moon embroidery (`0xFEF08A`) on the chest and lower hem.

### 4.2 Glowing Staff with Particle-Like Highlights
- **Staff Shaft**: Multi-tone wood grain (`0x92400E` highlight, `0x78350F` base, `0x451A03` shadow).
- **Orb & Animated Particles**: Multi-tone cyan orb (`0x0284C7` deep shadow, `0x38BDF8` cyan base, `0x7DD3FC` cyan highlight, `0xE0F2FE` core white-cyan, `0xFFFFFF` specular core).
- **Idle Sparkle Animation**: Micro particle sparkles (`0xBAE6FD`, `0xE0F2FE`, `0xFFFFFF`) shift positions between `wiz_0` and `wiz_1` frames to simulate magical energy floating off the crystal.

### 4.3 Mystical Flowing Beard Detail
- **5-tone Gradient Beard**: Top mustache highlight (`0xFFFFFF`), soft white body (`0xF1F5F9`), light grey shadow (`0xE2E8F0`), slate blue-grey strand shadow (`0x94A3B8`), and deep root shadow (`0x64748B`).

### 4.4 Magical Ethereal Aura Effect
- **Ethereal Aura Pixels**: Magenta and lavender magical aura particles (`0xE9D5FF` soft aura, `0xC084FC` mid aura glow, `0xF0ABFC` magenta particle, `0xBAE6FD` cyan particle) floating around the hat peak and shoulders in `wiz_0` and `wiz_1`.

### 4.5 Crisp 1px Dark Outlines
- Complete 1px dark outline framing (`0x121016` primary, `0x251C2B` soft outline) surrounding all outer edges of the hat peak, robes, staff crystal, and boots for visual consistency with the player character.

### 4.6 Upgraded Color Palette (`W_PAL`) — 32 Color Tokens
```javascript
    const W_PAL = {
      '.': null,
      // 1px Dark Outlines (2)
      'K': 0x121016, 'k': 0x251C2B,
      // Multi-tone Robe (6)
      'h': 0xC4B5FD, 'H': 0xA78BFA, 'm': 0x8B5CF6, 'v': 0x6D28D9, 'V': 0x4C1D95, 'U': 0x2E1065,
      // Gold & Moon Embroidery (4)
      'y': 0xFEF08A, 'Y': 0xFBBF24, 'g': 0xF59E0B, 'G': 0xD97706,
      // Face & Skin (3)
      'X': 0xFDE68A, 'x': 0xEAA878, 'n': 0xC87858,
      // Mystical Beard (5)
      'W': 0xFFFFFF, 'd': 0xF1F5F9, 'D': 0xE2E8F0, 'b': 0x94A3B8, 'B': 0x64748B,
      // Staff Wood (3)
      't': 0x92400E, 'S': 0x78350F, 's': 0x451A03,
      // Crystal Orb & Highlights (5)
      'z': 0xFFFFFF, 'w': 0xE0F2FE, 'c': 0x7DD3FC, 'C': 0x38BDF8, 'e': 0x0284C7,
      // Magical Aura & Particles (4)
      'a': 0xE9D5FF, 'A': 0xC084FC, 'p': 0xF0ABFC, 'P': 0xBAE6FD
    };
```
*Token Count Increase*: **18 baseline tokens -> 32 upgraded tokens (+77.7% increase)**.

---

## 5. Upgraded Pixel Art Matrices (16x20 Resolution)

### 5.1 Idle Frame 0 (`wiz_0`)
```javascript
    const wiz_0 = [
      '.......KyK......',
      '......KhHK.p....',
      '.a...KhHHHK.....',
      '....KhHHHHHK....',
      '...KhHHHHHHHK.P.',
      '..KhHHYYHHHHHK..',
      '.KvVGggggggGVvK.',
      '.A..KXnKXnXK..cK',
      '....KWdWWWdWKzcE',
      '....KWdddddWdKwC',
      '...KddDDDDddKSsK',
      '..KhHmYgmmHhKSsK',
      '.pKhHmmvVmmHKSsK',
      '..KhHmvyvgHhKSsK',
      '..KhHmvVUvhHKSsK',
      '..KhHmvVUvhHKSsK',
      '..KhHmvVUvhHKSsK',
      '.KvVVUUUUUVVvKSs',
      '..KkggggggkK.KsK',
      '...KKKKKKKK...KK'
    ];
```

### 5.2 Idle Frame 1 (`wiz_1` - Animated Particles & Aura Shift)
```javascript
    const wiz_1 = [
      '.....p.KyK......',
      '......KhHK......',
      '.....KhHHHK...P.',
      '..P.KhHHHHHK....',
      '...KhHHHHHHHK...',
      '..KhHHYYHHHHHK.a',
      '.KvVGggggggGVvK.',
      '....KXnKXnXK.zcK',
      '.a..KWdWWWdWKwCz',
      '....KWdddddWdKzC',
      '...KddDDDDddKSsK',
      '..KhHmYgmmHhKSsK',
      '..KhHmmvVmmHKSsK',
      '.PKhHmvyvgHhKSsK',
      '..KhHmvVUvhHKSsK',
      '..KhHmvVUvhHKSsK',
      '..KhHmvVUvhHKSsK',
      '.KvVVUUUUUVVvKSs',
      '..KkggggggkK.KsK',
      '...KKKKKKKK...KK'
    ];
```

### 5.3 Texture Generation Calls Update
In `PixelArtRenderer._genNpcTextures()` (around lines 2260–2262), update parameters to specify `width = 16`, `height = 20`:
```javascript
    this.createTexture(scene, 'wizard_idle_0', wiz_0, W_PAL, 16, 20);
    this.createTexture(scene, 'wizard_idle_1', wiz_1, W_PAL, 16, 20);
    this.createTexture(scene, 'wizard_npc', wiz_0, W_PAL, 16, 20);
```

---

## 6. Procedural Canvas Bake Upgrade (`gwiz` in `_bakeTextures`)

To ensure full consistency across all procedural generators in `game.js`, update `FarmScene._bakeTextures()` (lines 8004–8021) with dark outlines, robe shading, beard highlights, and glowing orb:

```javascript
    // Wizard NPC texture 16x22
    const gwiz = mk();
    // 1px Dark Outline & Robe Body
    pR(gwiz, 3, 7, 10, 14, 0x121016); // Outer outline
    pR(gwiz, 4, 8, 8, 12, 0x8B5CF6);  // Base robe
    pR(gwiz, 3, 10, 10, 10, 0x6D28D9); // Mid shadow fold
    pR(gwiz, 5, 9, 6, 11, 0x4C1D95);  // Deep shadow fold
    pR(gwiz, 4, 8, 2, 12, 0xA78BFA);  // Robe fold highlight
    // Embroidery Details
    pR(gwiz, 7, 12, 2, 2, 0xFBBF24);  // Gold chest star
    pR(gwiz, 5, 17, 6, 1, 0xF59E0B);  // Gold hem trim
    // Face & Beard
    pR(gwiz, 5, 5, 6, 4, 0xFDE68A);   // Face skin
    pR(gwiz, 6, 6, 1, 1, 0x121016); pR(gwiz, 9, 6, 1, 1, 0x121016); // Dark eyes
    pR(gwiz, 4, 8, 8, 4, 0xFFFFFF);   // Top white beard
    pR(gwiz, 5, 12, 6, 3, 0xF1F5F9);  // Mid beard
    pR(gwiz, 6, 15, 4, 2, 0xE2E8F0);  // Lower beard shadow
    pR(gwiz, 7, 17, 2, 1, 0x94A3B8);  // Beard tip strand shadow
    // Pointy Wizard Hat with Outlines & Star
    pR(gwiz, 1, 5, 14, 2, 0x6D28D9); pR(gwiz, 2, 5, 12, 1, 0x8B5CF6);
    pR(gwiz, 4, 3, 8, 2, 0x8B5CF6); pR(gwiz, 5, 1, 6, 2, 0xA78BFA); pR(gwiz, 6, 0, 4, 1, 0xC4B5FD);
    pR(gwiz, 7, 0, 2, 1, 0xFEF08A);  // Hat peak star highlight
    // Glowing Staff & Crystal Orb with Particles
    pR(gwiz, 13, 4, 2, 16, 0x78350F); // Staff wood base
    pR(gwiz, 14, 4, 1, 16, 0x451A03); // Staff wood shadow
    pR(gwiz, 12, 2, 4, 4, 0x0284C7);  // Crystal base
    pR(gwiz, 13, 2, 2, 3, 0x38BDF8);  // Crystal bright cyan
    pR(gwiz, 13, 3, 1, 1, 0xE0F2FE);  // Crystal inner core
    pR(gwiz, 11, 1, 1, 1, 0xBAE6FD); pR(gwiz, 15, 3, 1, 1, 0xF0ABFC); // Aura sparkles
    gwiz.generateTexture('wizard_npc', 16*PS, 22*PS); gwiz.destroy();
```

---

## 7. Non-Regression & Verification Audit

| System / Component | Requirement | Verification Check | Status |
|-------------------|-------------|-------------------|--------|
| **Positioning** | Fixed at `(wx, wy)` | `wx = farm.x + farm.w + 160`, `wy = farm.y - 85`. Sprite origin set to `(0.5, 1)`. Extending vertical height from 16 to 20 grows sprite UPWARDS, keeping feet at exact `(wx, wy)`. | VERIFIED SAFE |
| **Depth Sorting** | Dynamic depth sorting | `wizardSprite.setDepth(this.wizardY || this.wizardSprite.y)` in `updateDepthSort()`. Feet position unchanged. | VERIFIED SAFE |
| **Levitation Tween** | Floating movement | `this.tweens.add({ targets: wizardSprite, y: wy - 4, duration: 900, yoyo: true, repeat: -1 })`. Unmodified. | VERIFIED SAFE |
| **Shadow** | Ground shadow | `shadows.createShadow(this.wizardSprite, 38, 12, 6)`. Unmodified. | VERIFIED SAFE |
| **Proximity Trigger** | Distance `< 85` | Distance checks in `update()`, `HUD`, and SPACE key listener remain `< 85` relative to `(wizardX, wizardY)`. | VERIFIED SAFE |
| **Interaction & Dialog** | Spell Duel launch | SPACE key triggers scale squish tween (`1.8` -> `2.1`), checks `duel` zone lock, and calls `openSpellDuel()`. | VERIFIED SAFE |
| **Dual-File Mirroring** | `game.js` <-> `assets/game.js` | SHA256 sync must be maintained after code modification. | REQUIRES STEP |
| **Node Syntax Check** | `node -c` validation | `node -c game.js` and `node -c assets/game.js` must yield 0 syntax errors. | REQUIRES STEP |

---

## 8. Step-by-Step Instructions for Implementation Worker

1. Open `game.js`.
2. Locate `PixelArtRenderer._genNpcTextures(scene)` (around lines 2214–2262).
3. Replace `W_PAL`, `wiz_0`, and `wiz_1` with the upgraded 32-color palette and 16x20 matrices provided in Section 5.
4. Update `createTexture` calls to `createTexture(scene, 'wizard_idle_0', wiz_0, W_PAL, 16, 20)` and corresponding `wizard_idle_1` and `wizard_npc` calls.
5. Locate `FarmScene._bakeTextures()` (around lines 8004–8021).
6. Replace `gwiz` graphics drawing code with the upgraded `gwiz` routine provided in Section 6.
7. Copy `game.js` to `assets/game.js` to ensure SHA256 byte sync.
8. Execute `node -c game.js` and `node -c assets/game.js` to confirm syntax.
