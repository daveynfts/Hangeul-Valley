# Upgraded Ginger Cat NPC Technical Analysis & Pixel Art Matrix Specification

## 1. Executive Summary

This report presents the complete investigation and architectural specification for upgrading the Cat NPC in **Hangeul Valley**. The upgrade replaces the legacy 2-frame cat sprite ("Muop") with a highly detailed, procedurally generated **Ginger Cat NPC** featuring:
1. Complete removal and replacement of all hardcoded "Muop" references with "Ginger Cat" across `game.js`, `index.html`, and mirror asset files.
2. An upgraded 16×16 procedural pixel art matrix system with rich ginger tabby details: M-mark forehead stripes, dark ginger back/flank stripes, expressive amber eyes with pupils and eyelash outlines, white muzzle/chest/paw socks, pink nose/inner ears/paw pads, and a fluffy multi-pixel tail.
3. 4 distinct, multi-frame animation states (`cat-idle`, `cat-walk`, `cat-sit`, `cat-sleep`) comprising 9 distinct 16×16 texture matrices.
4. Exact Phaser 3 animation configuration parameters (`anims.create`) and texture creation helper blueprints for `_genNpcTextures(scene)` and `_createCatNPC(W, H)`.

---

## 2. Codebase Audit: Hardcoded "Muop" Occurrences

A comprehensive codebase search identified **4 active runtime occurrences** of the name "Muop" across primary and mirror project files.

### 2.1 Summary Table of Required Text Replacements

| File | Line # | Element / Context | Current Text | Target Replacement Text |
|---|---|---|---|---|
| `game.js` | 3537 | Vocab Fact Dictionary (`'cat'`) | `Muop says hi! 🐾` | `Ginger Cat says hi! 🐾` |
| `game.js` | 4543 | `_createCatNPC` World Text Label | `'Muop'` | `'Ginger Cat'` |
| `game.js` | 4965 | `_updateTargetHighlight` SPACE Action | `'[SPACE] Talk to Muop'` | `'[SPACE] Talk to Ginger Cat'` |
| `index.html` | 1508 | Cat Dialog Title Bar (`#cat-dialog-name`) | `🐱 Muop says...` | `🐱 Ginger Cat says...` |
| `assets/game.js` | 3537 | Mirror Vocab Fact Dictionary | `Muop says hi! 🐾` | `Ginger Cat says hi! 🐾` |
| `assets/game.js` | 4543 | Mirror World Text Label | `'Muop'` | `'Ginger Cat'` |
| `assets/game.js` | 4965 | Mirror SPACE Action | `'[SPACE] Talk to Muop'` | `'[SPACE] Talk to Ginger Cat'` |
| `assets/index.html` | 1508 | Mirror Cat Dialog Title Bar | `🐱 Muop says...` | `🐱 Ginger Cat says...` |

### 2.2 Exact Line Code Context & Diffs

#### Location 1: `game.js` — Line 3537 (Vocab Fact)
```javascript
// BEFORE (Line 3537):
   'cat':      {vi:'🐱 Korean cats say "야옹!" (yaong) — longer and moodier than meow! Cat cafes in Seoul have waitlists on weekends. Muop says hi! 🐾',

// AFTER:
   'cat':      {vi:'🐱 Korean cats say "야옹!" (yaong) — longer and moodier than meow! Cat cafes in Seoul have waitlists on weekends. Ginger Cat says hi! 🐾',
```

#### Location 2: `game.js` — Line 4543 (`_createCatNPC` Label)
```javascript
// BEFORE (Lines 4543-4546):
    this.add.text(cx, cy+6, 'Muop', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'10px',
      color:'#FFD700', stroke:'#000', strokeThickness:2
    }).setOrigin(0.5,0).setDepth(cy+1);

// AFTER:
    this.add.text(cx, cy+6, 'Ginger Cat', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'10px',
      color:'#FFD700', stroke:'#000', strokeThickness:2
    }).setOrigin(0.5,0).setDepth(cy+1);
```

#### Location 3: `game.js` — Line 4965 (`_updateTargetHighlight`)
```javascript
// BEFORE (Line 4965):
    if(hx===null&&this.catX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.catX,this.catY)<82){
      hx=this.catX;hy=this.catY-20;lbl='[SPACE] Talk to Muop';col=0xFF88CC;hw=44;hh=44;
    }

// AFTER:
    if(hx===null&&this.catX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.catX,this.catY)<82){
      hx=this.catX;hy=this.catY-20;lbl='[SPACE] Talk to Ginger Cat';col=0xFF88CC;hw=44;hh=44;
    }
```

#### Location 4: `index.html` — Line 1508 (Dialog Title)
```html
<!-- BEFORE (Line 1508): -->
        <span id="cat-dialog-name">🐱 Muop says...</span>

<!-- AFTER: -->
        <span id="cat-dialog-name">🐱 Ginger Cat says...</span>
```

---

## 3. Analysis of Legacy Cat NPC System

### 3.1 Legacy Texture Generation in `_genNpcTextures(scene)`
Lines 1074-1116 in `game.js` define palette `C` and 2 basic 16×16 matrices (`cat_0`, `cat_1`):
- Palette `C`:
  - `.` = `null` (Transparent)
  - `O` = `0xF5813F` (Orange Body)
  - `o` = `0xB84E10` (Dark Brown)
  - `l` = `0xFFBB66` (Light Orange)
  - `w` = `0xFFFFFF` (White belly)
  - `e` = `0xFFCC44` (Amber Eye)
  - `p` = `0xFFAA99` (Pink nose/feet)
  - `u` = `0x1A0800` (Dark Brown pupil)
- Legacy matrices `cat_0` & `cat_1`:
  - Only differ in row 4: `cat_0` has amber eye `e`, `cat_1` has pupil `u` for blinking.
  - Very blocky: 1-pixel wide tail, flat ears, no back stripes, no whiskers, no walking/sitting/sleeping animation frames.

### 3.2 Legacy Procedural Graphics `gc2` in `_createCatNPC(W, H)`
Lines 4227-4265 in `game.js` construct a standalone 13×16 pixel graphic `gc2` for texture key `'cat_npc'`:
- Had custom drawing calls for airplane ears, M-mark forehead stripes, white muzzle, white paw socks.
- **Inconsistency**: `'cat_npc'` texture key was generated differently in `_createCatNPC` than `cat_idle_0`/`cat_idle_1` in `_genNpcTextures`.
- **Solution**: Replace `gc2` with unified procedural matrix generation in `_genNpcTextures(scene)`, aliasing `'cat_npc'` directly to `cat_idle_0`.

---

## 4. Upgraded Ginger Cat Color Palette Specification

The upgraded palette expands color range for tabby contrast, soft highlights, expressive eyes, and crisp outlines:

```javascript
const C = {
  '.': null,      // Transparent background
  'O': 0xF5813F,  // Ginger Orange (Primary coat)
  'o': 0xB84E10,  // Dark Ginger / Brown (Tabby stripes & ear outlines)
  'l': 0xFFC078,  // Light Cream / Ginger Highlight (Tail tip & accents)
  'w': 0xFFFFFF,  // Pure White (Muzzle, chest, belly, paw socks)
  'e': 0xFFCC44,  // Amber Yellow (Bright expressive eyes)
  'p': 0xFFAA99,  // Soft Pink (Nose, inner ears, paw pads)
  'u': 0x1A0800,  // Dark Charcoal (Pupils, whiskers, eyelash outlines)
  's': 0xD97706   // Warm Ginger (Subtle stripe shadow transition)
};
```

---

## 5. Upgraded 16×16 Pixel Art Matrices (9 Frames across 4 Animation States)

All matrices are strictly 16 rows × 16 columns.

### 5.1 Animation State 1: `cat-idle` (Idle Standing & Blinking)

#### Frame 1: `cat_idle_0` (Default Idle - Open Eyes, Tail Perked Up Right)
```
Col: 0123456789012345
R00: ..p..........p..
R01: .OpO........OpO.
R02: .OOoOOOOOOOOoOO.
R03: .OoOooOOOOooOoO.
R04: .OeeuOOOOOOOueO.
R05: u.OwwwwwwwwwwO.u
R06: ..OwwwppwwwwO...
R07: ..OOOOOOOOOOOO..
R08: ..OoOwwwwwwOoO..
R09: ..OoOwwwwwwOoOO.
R10: ..OoOwwwwwwOo.O.
R11: ..OOOOOOOOOOO.lO
R12: ..OOOOOOOOOOOOOO
R13: ..wwww....wwww..
R14: ..pppp....pppp..
R15: ................
```

#### Frame 2: `cat_idle_1` (Idle Blink - Eyes Closed Slit `uu`, Tail Swish Right/Up)
```
Col: 0123456789012345
R00: ..p..........p..
R01: .OpO........OpO.
R02: .OOoOOOOOOOOoOO.
R03: .OoOooOOOOooOoO.
R04: .OuuuuOOOOOOuuO.
R05: u.OwwwwwwwwwwO.u
R06: ..OwwwppwwwwO...
R07: ..OOOOOOOOOOOO..
R08: ..OoOwwwwwwOoO.O
R09: ..OoOwwwwwwOo.lO
R10: ..OoOwwwwwwOo.OO
R11: ..OOOOOOOOOOOOO.
R12: ..OOOOOOOOOOOO..
R13: ..wwww....wwww..
R14: ..pppp....pppp..
R15: ................
```

---

### 5.2 Animation State 2: `cat-walk` (Walking / Trotting)

#### Frame 1: `cat_walk_0` (Stride A - Left Front Paw Forward, Right Rear Paw Back)
```
Col: 0123456789012345
R00: ..p..........p..
R01: .OpO........OpO.
R02: .OOoOOOOOOOOoOO.
R03: .OoOooOOOOooOoO.
R04: .OeeuOOOOOOOueO.
R05: u.OwwwwwwwwwwO.u
R06: ..OwwwppwwwwO...
R07: ..OOOOOOOOOOOO..
R08: ..OoOwwwwwwOoO.O
R09: ..OoOwwwwwwOo.lO
R10: .wOoOwwwwwwOo.OO
R11: p.OOOOOOOOOOOO..
R12: ..wwww......wwww
R13: ..pppp......pppp
R14: ................
R15: ................
```

#### Frame 2: `cat_walk_1` (Stride B / Bounce - Feet Together Passing Phase, Body Perked Up 1px)
```
Col: 0123456789012345
R00: .p..........p...
R01: OpO........OpO..
R02: OOoOOOOOOOOoOO..
R03: OoOooOOOOooOoO..
R04: OeeuOOOOOOOueO..
R05: OwwwwwwwwwwO..u.
R06: OwwwppwwwwO...OO
R07: OOOOOOOOOOOO..lO
R08: OoOwwwwwwOoO..OO
R09: OoOwwwwwwOoO....
R10: OOOOOOOOOOOO....
R11: .wwww..wwww.....
R12: .pppp..pppp.....
R13: ................
R14: ................
R15: ................
```

#### Frame 3: `cat_walk_2` (Stride C - Right Front Paw Forward, Left Rear Paw Back, Tail Swaying)
```
Col: 0123456789012345
R00: ..p..........p..
R01: .OpO........OpO.
R02: .OOoOOOOOOOOoOO.
R03: .OoOooOOOOooOoO.
R04: .OeeuOOOOOOOueO.
R05: u.OwwwwwwwwwwO.u
R06: ..OwwwppwwwwO...
R07: ..OOOOOOOOOOOO..
R08: O.OoOwwwwwwOoO..
R09: lO.OoOwwwwwwOo..
R10: OO.OoOwwwwwwOo.w
R11: ..OOOOOOOOOOOO.p
R12: wwww......wwww..
R13: pppp......pppp..
R14: ................
R15: ................
```

---

### 5.3 Animation State 3: `cat-sit` (Sitting & Grooming)

#### Frame 1: `cat_sit_0` (Upright Sitting Posture, Tail Wrapped Around Feet)
```
Col: 0123456789012345
R00: ....p......p....
R01: ...OpO....OpO...
R02: ...OOoOOOOoOO...
R03: ...OoOooOOoOo...
R04: ...OeeuOOueO....
R05: u..OwwwppwwO..u.
R06: ...OOOOOOOOO....
R07: ...OoOwwwwOo....
R08: ...OoOwwwwOo....
R09: ..OOOOOOOOOOOO..
R10: .OOOOOOOOOOOOOO.
R11: .OOwwwwwwwwwwOO.
R12: .OOppppppppppOO.
R13: ..OOOOOOOOOOOO.l
R14: ...oOOOOOOOOOOoO
R15: ................
```

#### Frame 2: `cat_sit_1` (Paw Lick / Grooming - Paw Raised to Cheek, Happy Blink `uu`)
```
Col: 0123456789012345
R00: ....p......p....
R01: ...OpO....OpO...
R02: ...OOoOOOOoOO...
R03: ...OoOooOOoOo...
R04: ...OuuuuuueO....
R05: u..OwwwppwwO..u.
R06: ...OOOwwOOOO....
R07: ...OoOpwppOo....
R08: ...OoOwwwwOo....
R09: ..OOOOOOOOOOOO..
R10: .OOOOOOOOOOOOOO.
R11: .OOwwwwwwwwwwOO.
R12: .OOppppppppppOO.
R13: ..OOOOOOOOOOOO.l
R14: ...oOOOOOOOOOOoO
R15: ................
```

---

### 5.4 Animation State 4: `cat-sleep` (Sleeping / Curled Up)

#### Frame 1: `cat_sleep_0` (Curled Up Donut Shape, Sleeping Contentedly)
```
Col: 0123456789012345
R00: ................
R01: ................
R02: ................
R03: .....w..........
R04: ....w...........
R05: ...p......p.....
R06: ..OpO....OpO....
R07: .OOOOOOOOOOOO...
R08: .OoOuuuuuuOoO...
R09: .OwwwppppppwO...
R10: oOOOOOOOOOOOOOo.
R11: oOwwwwwwwwwwOoO.
R12: oOppppppppppOoOl
R13: .oOOOOOOOOOOOOo.
R14: ................
R15: ................
```

#### Frame 2: `cat_sleep_1` (Breathing Phase - Body & Zzz Puff Shift 1px Up)
```
Col: 0123456789012345
R00: ....w...........
R01: ...w............
R02: ................
R03: ................
R04: ...p......p.....
R05: ..OpO....OpO....
R06: .OOOOOOOOOOOO...
R07: .OoOuuuuuuOoO...
R08: .OwwwppppppwO...
R09: oOOOOOOOOOOOOOo.
R10: oOwwwwwwwwwwOoO.
R11: oOppppppppppOoOl
R12: .oOOOOOOOOOOOOo.
R13: ................
R14: ................
R15: ................
```

---

## 6. Animation Configuration & Phaser Parameters

The Phaser 3 animation manager registrations inside `_genNpcTextures(scene)` should be updated to register all 4 animation states:

```javascript
// Register All 4 Ginger Cat Animation States in Phaser
const anims = scene.anims;
if (anims) {
  const regCatAnim = (key, frames, frameRate = 4, repeat = -1) => {
    if (!anims.exists(key)) {
      anims.create({
        key: key,
        frames: frames.map(f => ({ key: f })),
        frameRate: frameRate,
        repeat: repeat
      });
    }
  };

  // 1. cat-idle: Standing alertly & blinking (3 fps)
  regCatAnim('cat-idle', ['cat_idle_0', 'cat_idle_1'], 3, -1);

  // 2. cat-walk: Smooth trotting stride cycle (6 fps)
  regCatAnim('cat-walk', ['cat_walk_0', 'cat_walk_1', 'cat_walk_2', 'cat_walk_1'], 6, -1);

  // 3. cat-sit: Sitting & grooming face (2 fps)
  regCatAnim('cat-sit', ['cat_sit_0', 'cat_sit_1'], 2, -1);

  // 4. cat-sleep: Sleeping & gentle breathing (1.5 fps)
  regCatAnim('cat-sleep', ['cat_sleep_0', 'cat_sleep_1'], 1.5, -1);
}
```

---

## 7. Implementation Blueprint for `game.js`

### Step 1: Update `_genNpcTextures(scene)` in `game.js` (lines 1073-1172)
- Replace palette `C` with the upgraded palette definition.
- Replace `cat_0` and `cat_1` array declarations with all 9 matrix definitions (`cat_idle_0`, `cat_idle_1`, `cat_walk_0`, `cat_walk_1`, `cat_walk_2`, `cat_sit_0`, `cat_sit_1`, `cat_sleep_0`, `cat_sleep_1`).
- Call `this.createTexture(scene, key, matrix, C)` for all 9 texture keys plus legacy alias `'cat_npc'`.
- Add animation registration calls for `'cat-idle'`, `'cat-walk'`, `'cat-sit'`, `'cat-sleep'`.

### Step 2: Update `_createCatNPC(W, H)` in `game.js` (lines 4529-4548)
- Remove `gc2` procedural graphics drawing logic in lines 4227-4265 (since textures are cleanly generated in `_genNpcTextures`).
- Update name tag text from `'Muop'` to `'Ginger Cat'`.

### Step 3: Update `_updateTargetHighlight()` in `game.js` (line 4965)
- Update label from `'[SPACE] Talk to Muop'` to `'[SPACE] Talk to Ginger Cat'`.

### Step 4: Update Vocab Fact & HTML Elements
- Update line 3537 in `game.js`: `Muop says hi!` -> `Ginger Cat says hi!`.
- Update line 1508 in `index.html`: `🐱 Muop says...` -> `🐱 Ginger Cat says...`.
- Apply identical changes to mirror files (`assets/game.js`, `assets/index.html`).

---

## 8. Summary of Texture Keys & Animation Mapping

| Animation Key | Frame Keys | Frame Rate | Loop | Description |
|---|---|---|---|---|
| `cat-idle` | `['cat_idle_0', 'cat_idle_1']` | 3 fps | Continuous (-1) | Standing alertly, periodic blinking |
| `cat-walk` | `['cat_walk_0', 'cat_walk_1', 'cat_walk_2', 'cat_walk_1']` | 6 fps | Continuous (-1) | 4-step trotting cycle with vertical bounce |
| `cat-sit` | `['cat_sit_0', 'cat_sit_1']` | 2 fps | Continuous (-1) | Sitting upright, licking paw & face |
| `cat-sleep` | `['cat_sleep_0', 'cat_sleep_1']` | 1.5 fps | Continuous (-1) | Curled in donut shape, Zzz breath animation |

This completes the architectural analysis and design specification for the Ginger Cat character upgrade.
