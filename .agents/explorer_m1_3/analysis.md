# Milestone R1 Analysis Report: Subgame Procedural 48x48 Pixel Art Renderer

**Agent**: Explorer 3 (`explorer_m1_3`)  
**Working Directory**: `C:\VibeCode\Hangeul Valley\.agents\explorer_m1_3`  
**Target Codebase File**: `C:\VibeCode\Hangeul Valley\game.js`  
**Scope**: Fishing Scene, Arcade Minigame Scene, Dungeon Crawler ARPG Scene  

---

## 1. Executive Summary

This report establishes the complete architectural audit and procedural 48x48 pixel art design specification for replacing all temporary emoji text sprites (`🎣`, `🐟`, `🍣`, `🛸`, `👾`, `🗡️`, `🟢`, `💀`, `📜`, etc.) across the **Fishing Scene**, **Arcade Scene**, and **Dungeon Scene** in `game.js`.

### Key Technical Findings:
1. **Current State**: Subgame scenes rely heavily on Phaser 3 Text GameObjects rendering system emojis (e.g. `this.add.text(x, y, '👾', {fontSize:'34px'})`). Emoji rendering introduces cross-platform visual inconsistencies (Windows Segoe UI Emoji vs. macOS/Android Apple Color Emoji) and lacks animation frames, hitboxes matching sprite silhouettes, and cohesive pixel art styling.
2. **Texture Generation Architecture**: `game.js` utilizes a pixel baking pattern (`_bakeTextures()` in `FarmScene`) driven by `PS = 3` (Pixel Scale multiplier). Drawing a `16×16` block grid using `pR(graphics, x, y, w, h, color)` with `PS = 3` produces exact `48×48` pixel textures (`16 × 3 = 48px`).
3. **Texture Atlas / Key Plan**: All new textures will be baked centrally via a dedicated texture generator helper (`_bakeSubgameTextures(scene)`) or scene-specific texture initialization methods, producing named Phaser textures (`fishing_salmon`, `arcade_player_ship`, `dungeon_green_slime`, etc.) that are seamlessly referenced by `this.add.sprite()` or `this.physics.add.sprite()`.

---

## 2. Codebase Audit of `game.js` Subgames

### 2.1 Fishing Minigame Scene (`FishingScene`, lines 3579 – 3870)

| Element | Current Implementation | File Line(s) | Proposed Pixel Art Replacement Asset | Target Texture Key | Target Dimensions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Player Angler** | `this.add.text(this.W/2, this.H - 110, '🎣', {fontSize:'52px'})` | 3623 | 48x48 Procedural Angler Sprite with Fishing Rod | `fishing_player_idle`, `fishing_player_cast`, `fishing_player_reel` | 48×48 px |
| **Bobber / Float** | `this.add.text(x, y, '🔴', {fontSize:'28px'})` | 3693 | Red & White Floater Lure with Water Ripple Ring | `fishing_bobber` | 24×24 px / 48x48 frame |
| **Tension Bar Fish Icon** | `this.add.text(barX, fishIconY, '🐟', {fontSize:'26px'})` | 3666, 3723 | Animated Fish Sprite corresponding to target species | `fishing_salmon`, `fishing_tuna`, `fishing_snapper`, `fishing_legendary` | 48×48 px |
| **Wooden Pier / Dock** | `this.add.rectangle(this.W/2, this.H - 50, this.W, 100, 0x78350F)` | 3613 – 3620 | Tiled 48x48 Wooden Dock Plank & Lantern Posts | `dock_plank`, `dock_post`, `dock_lantern` | 48×48 px |
| **Bite Warning & Splash** | `this.add.text(x, y - 35, '💦 BITE!')` | 3708 | Water Splash Particle / Animated Splash Frame | `fishing_splash` | 48×48 px |
| **Fish Database (`FISH_DB`)** | Emojis: `🍣` (Salmon), `🐟` (Mackerel), `🦑` (Squid), `🎏` (Carp), `🦐` (Shrimp), `🐙` (Octopus), `🐚` (Clam), `🌟` (Golden Fish) | 899 – 908 | Dedicated 48x48 Procedural Textures for each species | `fishing_salmon`, `fishing_mackerel`, `fishing_squid`, `fishing_carp`, `fishing_shrimp`, `fishing_octopus`, `fishing_clam`, `fishing_legendary` | 48×48 px |

---

### 2.2 Arcade Minigame Scene (`ArcadeScene`, lines 2830 – 3220)

| Element | Current Implementation | File Line(s) | Proposed Pixel Art Replacement Asset | Target Texture Key | Target Dimensions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Player Spaceship** | `this.add.text(this.W/2, this.H - 80, '🛸', {fontSize:'42px'})` | 2872 | Sci-Fi Cyberpunk Starfighter with Cyan Wingtips & Engine Flames | `arcade_player_ship` | 48×48 px |
| **Alien Scout Enemy** | `this.add.text(x, -40, '👾', {fontSize:'34px'})` | 3013 | Fast Agile Insectoid Alien Ship (Lime Green / Emerald) | `alien_scout` | 48×48 px |
| **Alien Shooter Enemy** | `this.add.text(x, -40, '👾', {fontSize:'34px'})` | 3013 | Violet/Purple Battlecraft with Dual Plasma Cannons | `alien_shooter` | 48×48 px |
| **Alien Elite Enemy** | `this.add.text(x, -40, '👾', {fontSize:'34px'})` | 3013 | Crimson Heavy Armor Warship with Golden Shields | `alien_elite` | 48×48 px |
| **Alien Boss** | `this.add.text(0, 0, '👾', {fontSize:'80px'})` | 2913 | 48x48 / 64x64 King Hangeul Alien Dreadnought (Neon Pink/Magenta Core) | `alien_boss` | 48×48 px / 64x64 px |
| **Player Laser** | `this.add.rectangle(x, y - 25, 6, 22, 0x00FFFF)` | 2983 | Dual Energy Beam Bolt with Hot Cyan Core & Blue Aura | `laser_player` | 16×32 px / 48x48 frame |
| **Boss Bullet** | `this.add.circle(x, y + 40, 8, 0EC4899)` | 3003 | Glowing Plasma Orb with Magenta Trail | `bullet_boss` | 24×24 px / 48x48 frame |
| **Power-up Items** | `this.add.text(mx, my, pType)` with `🔫`, `🛡️`, `💣` | 3028 – 3030 | Glowing Sci-Fi Orbs (Weapon/Triple Shot, Energy Shield, Nuke Bomb) | `powerup_weapon`, `powerup_shield`, `powerup_nuke` | 48×48 px |

---

### 2.3 Dungeon Crawler ARPG Scene (`DungeonScene`, lines 3221 – 3578)

| Element | Current Implementation | File Line(s) | Proposed Pixel Art Replacement Asset | Target Texture Key | Target Dimensions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Player Hero** | `this.add.text(this.W/2, this.H/2, '🗡️', {fontSize:'36px'})` | 3251 | Knight Warrior / Hero Character with Sword & Leather Armor | `dungeon_hero_idle`, `dungeon_hero_walk` | 48×48 px |
| **Sword Slash Effect** | `this.add.text(x, y - 10, '⚔️', {fontSize:'44px'})` | 3339 | Animated Arc Blade Swing Slash Graphic | `dungeon_slash` | 48×48 px |
| **Green Slime Monster** | `types`: `🟢 Slime` | 3376, 3393 | Translucent Bouncy Green Slime Monster with Shine | `dungeon_green_slime` | 48×48 px |
| **Goblin Warrior Monster** | `types`: `👿 Demon` / Golem / Skeleton | 3377–3379, 3393 | Fierce Green Goblin with Leather Vest & Jagged Dagger | `dungeon_goblin_warrior` | 48×48 px |
| **Skeleton Archer Monster** | `types`: `💀 Skeleton` | 3377, 3393 | Undead Bone Skeleton with Wooden Bow & Crimson Eyes | `dungeon_skeleton_archer` | 48×48 px |
| **Dungeon Boss Sentinel** | `this.add.text(x, y, '👹', {fontSize:'64px'})` | 3481 | Corrupted Sentinel King Demon Lord (Dark Armor, Horns, Flame Aura) | `dungeon_boss` | 48×48 px / 64x64 px |
| **Loot - Gold Coins** | Loot system reward / `addCoins()` | 3405–3500 | Shiny 3D Gold Coin with Stamped Rim | `loot_coin` | 48×48 px |
| **Loot - Gems** | `addGems(10)` | 3414, 3433 | Radiant Faceted Violet Crystal Gem | `loot_gem` | 48×48 px |
| **Loot - Potions** | Health item / potion drop logic | 3405–3500 | Glass Flask with Bubbling Red Elixir & Cork | `loot_potion` | 48×48 px |
| **Loot - Treasure Chest** | Boss Chamber Portal `👑` / Boss Chest | 3454, 3481 | Heavy Oak Wood Chest with Gold Straps & Keyhole | `loot_chest` | 48×48 px |
| **Loot - Vocab Scroll** | `this.add.text(mx, my, '📜', {fontSize:'32px'})` | 3440 | Ancient Parchment Vocab Scroll with Purple Ribbon | `loot_scroll` | 48×48 px |

---

## 3. Procedural 48x48 Pixel Art Grid Designs

All designs are formatted as 16×16 character matrices. When generated using `PS = 3` (Pixel Scale multiplier of 3 in `game.js`), each matrix unit expands into a 3×3 pixel square, producing a crisp `48×48` pixel texture.

---

### 3.1 Fishing Scene 48x48 Sprite Grids

#### 1. Salmon (`fishing_salmon`)
**Color Palette**:
- `.` = Transparent
- `R` = `#EF4444` (Salmon Pink/Red Upper Body)
- `r` = `#F87171` (Salmon Pink Mid Body)
- `W` = `#FCA5A5` (Pale Pink Belly)
- `w` = `#FFFFFF` (Belly Sparkle / Eye Highlight)
- `D` = `#991B1B` (Dark Red Stripes / Outline)
- `E` = `#111827` (Eye Pupil)
- `F` = `#DC2626` (Tail & Fins)

```
Matrix Layout (16x16):
. . . . . . . . . . . . . . . .
. . . . . . . D D D D . . . . .
. . . . . D D R R R R D D . . .
. . . D D R R R E R R R R D F .
. . D r r r r r r r r r R R D F
. D r r r r r r r r r r r R D .
D r r D D r r D D r r r r R D .
D r D W W D D W W D r r r D . .
D W W W W W W W W W D r D . . .
. D W W w W W W W W D D . . . .
. . D D W W W W D D . F F . . .
. . . . D D D D . . F F . . . .
. . . . . . . . . . F . . . . .
. . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . .
```

#### 2. Tuna (`fishing_tuna`)
**Color Palette**:
- `.` = Transparent
- `B` = `#1E3A8A` (Deep Ocean Blue Dorsal Ridge)
- `b` = `#3B82F6` (Electric Blue Mid Flank)
- `S` = `#93C5FD` (Silver Blue Belly)
- `Y` = `#EAB308` (Yellow Dorsal Finlets & Fin Tail)
- `E` = `#0F172A` (Dark Eye)
- `W` = `#FFFFFF` (Eye Sparkle)
- `D` = `#1E1B4B` (Outline Dark Blue)

```
Matrix Layout (16x16):
. . . . . . . . . . . . . . . .
. . . . D D D D D . . . . . . .
. . . D B B B B B D Y Y . . . .
. . D B B B E B B B D Y Y . . .
. D B B B B W B B B B D Y Y Y .
D B b b b b b b b b B B D Y Y .
D b b b b b b b b b b B B D . Y
D S S S S S S S S b b b B D Y Y
. D S S S S S S S S b b B D Y .
. . D S S S S S S S b B D . . .
. . . D D S S S S B D D . . . .
. . . . . D D D D D . Y Y . . .
. . . . . . . . . . Y Y . . . .
. . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . .
```

#### 3. Snapper (`fishing_snapper`)
**Color Palette**:
- `.` = Transparent
- `C` = `#991B1B` (Crimson Dorsal Spikes & Contour)
- `R` = `#DC2626` (Red Scales)
- `P` = `#F87171` (Light Coral Pink)
- `W` = `#FEF2F2` (White Belly)
- `Y` = `#FDE047` (Golden Eye Ring)
- `E` = `#18181B` (Black Eye Pupil)

```
Matrix Layout (16x16):
. . . . C . C . C . . . . . . .
. . . C C C C C C C . . . . . .
. . C R R R R R R R C C . . . .
. C R R R Y Y R R R R R C C . .
C R R R Y E W Y R R R R R C C .
C R R R R W Y R R R R R R R C C
C P P P P R R R R R R R R R C C
. C P P P P P P P P P R R C C .
. . C W W W W W W P P R C C . .
. . . C W W W W W W R C C . . .
. . . . C C W W C C C . . . . .
. . . . . . C C . C C C . . . .
. . . . . . . . . . C C . . . .
. . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . .
```

#### 4. Legendary Golden Fish (`fishing_legendary`)
**Color Palette**:
- `.` = Transparent
- `G` = `#F59E0B` (Rich Metallic Gold Body)
- `Y` = `#FDE047` (Radiant Yellow Highlight)
- `L` = `#FEF08A` (Glowing Light Gold Aura)
- `D` = `#B45309` (Dark Amber Shadow Contour)
- `R` = `#EF4444` (Ruby Red Glowing Eye)
- `W` = `#FFFFFF` (Blinding Sparkle)

```
Matrix Layout (16x16):
. . . . L . L . L . . . . . . .
. . . L Y Y Y Y Y L . . . . . .
. . L Y G G G G G Y L L . . . .
. L Y G G R R G G G Y Y L W . .
L Y G G R W R G G G G Y L L L .
L G G G G R G G G G G G Y L L L
D G G G G G G G G G G G G L L L
D G G G G G G G G G G G G L L L
. D G G G G G G G G G G Y L L .
. . D G G G G G G G G Y L L . .
. . . D D D G G G Y Y L . . . .
. . . . . D D D D L L L L . . .
. . . . . . . . . L L . L L . .
. . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . .
```

#### 5. Wooden Dock Assets (`dock_plank`, `dock_post`, `dock_lantern`)
- **Dock Plank (`dock_plank`, 16x16 -> 48x48)**:
  - Top edge `#92400E` (highlight), center `#78350F` (wood main), bottom seam `#451A03` (shadow groove).
  - Corner rusty nails `#D97706` / `#38240D` at (2,2), (13,2), (2,13), (13,13).
- **Dock Post (`dock_post`, 16x16 -> 48x48)**:
  - Vertical wood log with dark bark edges `#451A03`, central wood grain `#78350F` / `#A16207`, horizontal rope wrap `#D97706` at rows 6 & 10.
- **Dock Lantern (`dock_lantern`, 16x16 -> 48x48)**:
  - Iron lantern frame `#1C1917`, amber glass `#F59E0B`, center flame `#FEF08A` with radial fire glow `#EA580C`.

---

### 3.2 Arcade Scene 48x48 Sprite Grids

#### 1. Player Spaceship (`arcade_player_ship`)
**Color Palette**:
- `.` = Transparent
- `C` = `#0284C7` (Hull Blue Steel)
- `c` = `#38BDF8` (Cyan Neon Trim)
- `G` = `#00FFFF` (Glowing Cockpit Glass)
- `W` = `#FFFFFF` (Hot Cockpit Sparkle / Thruster Core)
- `R` = `#F43F5E` (Wingtip Laser Cannons)
- `F` = `#60A5FA` (Engine Thruster Plasma Flame)
- `D` = `#0F172A` (Dark Structural Metal Frame)

```
Matrix Layout (16x16):
. . . . . . D D . . . . . . . .
. . . . . D G G D . . . . . . .
. . . . D G W G G D . . . . . .
. . . . D c G G c D . . . . . .
. . . D D c c c c D D . . . . .
. . . D C C C C C C D . . . . .
. . D D C C C C C C D D . . . .
. R D C C c c c c C C D R . . .
. R D C c c c c c c C D R . . .
D R D C C C C C C C C D R D . .
D D D C C C C C C C C D D D . .
. D D D C D D D D C D D D . . .
. . . D D F W W F D D . . . . .
. . . . . F F F F . . . . . . .
. . . . . . F F . . . . . . . .
. . . . . . . . . . . . . . . .
```

#### 2. Alien Scout Enemy (`alien_scout`)
**Color Palette**:
- `.` = Transparent
- `G` = `#22C55E` (Lime Green Alien Chitin)
- `g` = `#15803D` (Dark Green Shadow)
- `L` = `#86EFAC` (Bright Emerald Wingtips)
- `R` = `#EF4444` (Glowing Red Visor Sensor)
- `W` = `#FFFFFF` (Visor Glint)
- `D` = `#052E16` (Outer Chitin Border)

```
Matrix Layout (16x16):
. . . . . . D D . . . . . . . .
. . . . . D L L D . . . . . . .
. . D D D G G G G D D D . . . .
. D L G G G G G G G G L D . . .
D L G G R R R R R R G G L D . .
D G G R R W R R W R R G G D . .
D G g g R R R R R R g g G D . .
D D g g g g g g g g g g D D . .
. D D g g D D D D g g D D . . .
. . D D g D . . D g D D . . . .
. . . D L D . . D L D . . . . .
. . . D D . . . . D D . . . . .
. . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . .
```

#### 3. Alien Shooter Enemy (`alien_shooter`)
**Color Palette**:
- `.` = Transparent
- `P` = `#A855F7` (Bright Violet Armor)
- `p` = `#7E22CE` (Deep Purple Carapace)
- `Y` = `#FDE047` (Plasma Cannon Muzzles)
- `C` = `#C084FC` (Central Glowing Core)
- `D` = `#3B0764` (Dark Purple Outline)

```
Matrix Layout (16x16):
. . D D . . . . . . D D . . . .
. Y P D D . . . . D D P Y . . .
. Y P P D D D D D D P P Y . . .
. D P P P P P P P P P P D . . .
. . D P P p C C p P P D . . . .
. . D P p C C C C p P D . . . .
. D P P p C C C C p P P D . . .
D P P P p p p p p p P P P D . .
D P D D D D D D D D D D P D . .
. D . . D P P P P D . . D . . .
. . . . D P p p P D . . . . . .
. . . . D D D D D D . . . . . .
. . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . .
```

#### 4. Alien Elite Enemy (`alien_elite`)
**Color Palette**:
- `.` = Transparent
- `R` = `#DC2626` (Heavy Crimson Armor)
- `r` = `#991B1B` (Dark Crimson Shadow)
- `Y` = `#F59E0B` (Golden Energy Shields)
- `W` = `#FEF08A` (Pulse Cannon Muzzle Core)
- `D` = `#450A0A` (Dark Crimson Outline)

```
Matrix Layout (16x16):
. . . . . D R R D . . . . . . .
. . . . D R R R R D . . . . . .
. . . D R R R R R R D . . . . .
. . D Y Y R R R R Y Y D . . . .
. D Y Y Y R R R R Y Y Y D . . .
D Y Y R R R W W R R Y Y D . . .
D Y R R R R W W R R R Y D . . .
D R R R r r r r r r R R D . . .
D R R r r r r r r r r R D . . .
. D R R r D D D D r R R D . . .
. . D R D D . . D D R D . . . .
. . D D D . . . . D D D . . . .
. . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . .
```

#### 5. Alien Boss - King Hangeul Alien (`alien_boss`)
**Color Palette**:
- `.` = Transparent
- `M` = `#EC4899` (Neon Pink Carapace)
- `m` = `#831843` (Deep Magenta Shadow)
- `B` = `#38BDF8` (Cyan Central Energy Core)
- `Y` = `#FDE047` (Gold Crown Spikes)
- `W` = `#FFFFFF` (Blinding Core Center)
- `D` = `#500724` (Outer Dark Outline)

```
Matrix Layout (16x16):
. Y . Y . . Y Y . . Y . Y . . .
D Y D Y D D Y Y D D Y D Y D . .
D M M M M M M M M M M M M D . .
D M M B B M M M M B B M M D . .
D M B B W B M M B W B B M D . .
D M B W W B M M B W W B M D . .
D m M B B M M M M B B M m D . .
D m m M M M M M M M M m m D . .
D m m m m m m m m m m m m D . .
. D m m D D D D D D m m D . . .
. . D D D M M M M D D D . . . .
. . . . D m m m m D . . . . . .
. . . . . D D D D . . . . . . .
. . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . .
```

---

### 3.3 Dungeon Scene 48x48 Sprite Grids

#### 1. Green Slime (`dungeon_green_slime`)
**Color Palette**:
- `.` = Transparent
- `G` = `#22C55E` (Vibrant Slime Green)
- `g` = `#15803D` (Dark Jelly Shadow)
- `H` = `#86EFAC` (Gelatinous Top Highlight)
- `E` = `#052E16` (Dark Slime Eyes)
- `W` = `#FFFFFF` (Eye Reflection)

```
Matrix Layout (16x16):
. . . . . . . . . . . . . . . .
. . . . . H H H H . . . . . . .
. . . . H G G G G H . . . . . .
. . . H G G G G G G H . . . . .
. . H G G G G G G G G H . . . .
. H G G E E G G E E G G H . . .
. H G G E W G G E W G G H . . .
H G G G E E G G E E G G G H . .
H G G G G G G G G G G G G H . .
H g g g g g g g g g g g g H . .
. H g g g g g g g g g g H . . .
. . H H H H H H H H H H . . . .
. . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . .
```

#### 2. Goblin Warrior (`dungeon_goblin_warrior`)
**Color Palette**:
- `.` = Transparent
- `G` = `#16A34A` (Goblin Green Skin)
- `g` = `#14532D` (Skin Shadow)
- `R` = `#DC2626` (Red Cloth Headband)
- `B` = `#78350F` (Leather Armor Vest)
- `S` = `#94A3B8` (Steel Dagger Blade)
- `E` = `#FDE047` (Glinting Yellow Eye)
- `D` = `#052E16` (Outline Green/Dark)

```
Matrix Layout (16x16):
. . . . R R R R R R . . . . . .
. . . R R R R R R R R . . . . .
. . D G G G G G G G G D . . . .
. D G E G G G G E G G G D . . .
. D G G G G G G G G G G D . . .
. . D G G D D D D G G D . . S .
. . D B B B B B B B B D . S S .
. D B B B B B B B B B B D S S .
. D B B B B B B B B B B D S S .
. . D D g g g g g g D D . S . .
. . . D g g . . g g D . . S . .
. . . D g g . . g g D . . . . .
. . . D D D . . D D D . . . . .
. . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . .
```

#### 3. Skeleton Archer (`dungeon_skeleton_archer`)
**Color Palette**:
- `.` = Transparent
- `W` = `#F3F4F6` (White Bone)
- `w` = `#9CA3AF` (Grey Bone Shadow)
- `E` = `#EF4444` (Crimson Glowing Eye Socket)
- `B` = `#78350F` (Wooden Recurve Bow)
- `S` = `#E2E8F0` (Arrow Shaft / Tip)
- `D` = `#1F2937` (Dark Bone Outline)

```
Matrix Layout (16x16):
. . . . D W W W W D . . . B . .
. . . D W W W W W W D . B B . .
. . . D W E W W E W D . B . . .
. . . D W W W W W W D B B . . .
. . . . D W D D W D . B . . . .
. . . . . D W W D . . B S S S S
. . . . D W W W W D . B . . . .
. . . D W w W W w W D B B . . .
. . . D W w D D w W D . B . . .
. . . . D D . . D D . . B B . .
. . . . D w . . w D . . . B . .
. . . D W W . . W W D . . . . .
. . . D D D . . D D D . . . . .
. . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . .
```

#### 4. Dungeon Boss Sentinel (`dungeon_boss`)
**Color Palette**:
- `.` = Transparent
- `K` = `#991B1B` (Corrupted Crimson Armor)
- `k` = `#450A0A` (Dark Crimson Shadow Plate)
- `Y` = `#F59E0B` (Golden Runes & Horns)
- `E` = `#EF4444` (Glowing Demon Eye)
- `W` = `#FFFFFF` (Eye Glow Center)
- `F` = `#DC2626` (Fiery Cape / Aura)

```
Matrix Layout (16x16):
. Y . . . . . . . . . . . Y . .
. Y Y . . . . . . . . . Y Y . .
. D Y Y D K K K K D Y Y D . . .
. D K K K K K K K K K K D . . .
. D K K E W K K E W K K D . . .
. D K K K K K K K K K K D . . .
D F K K Y Y Y Y Y Y K K F D . .
D F K K Y K K K K Y K K F D . .
D F k k k k k k k k k k F D . .
. D F k k k k k k k k F D . . .
. . D F k k . . k k F D . . . .
. . . D D D . . D D D . . . . .
. . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . .
```

#### 5. Loot Items (`loot_coin`, `loot_gem`, `loot_potion`, `loot_chest`, `loot_scroll`)
- **Gold Coin (`loot_coin`)**:
  - Gold face `#F59E0B`, bright rim `#FDE047`, outer dark edge `#B45309`, center sparkle `#FFFFFF`.
- **Faceted Gem (`loot_gem`)**:
  - Faceted crystal in `#A855F7` & `#C084FC`, dark shadow `#6B21A8`, top sparkle facet `#E9D5FF`.
- **Health Potion (`loot_potion`)**:
  - Glass flask outline `#0284C7`, red elixir liquid `#EF4444` with light red bubbles `#F87171`, cork stopper `#78350F`, blue reflection `#FFFFFF`.
- **Treasure Chest (`loot_chest`)**:
  - Wood body `#78350F`, dark wood planks `#451A03`, gold bands & keyhole lock `#F59E0B` / `#FDE047`.
- **Vocab Scroll (`loot_scroll`)**:
  - Rolled parchment paper `#FEF3C7` / `#FDE68A`, rolled edge `#D97706`, tied purple ribbon `#A855F7`.

---

## 4. Texture Baking & Code Generator Integration

To integrate these procedural textures into `game.js`, a helper method `_bakeSubgameTextures(scene)` should be added during scene initialization or inside `FarmScene._bakeTextures()` so that textures are available across all Phaser scenes (`FarmScene`, `ArcadeScene`, `DungeonScene`, `FishingScene`).

### 4.1 Sample Helper Code Snippet

```javascript
function _bakeSubgameTextures(scene) {
  const mk = () => scene.make.graphics({ add: false });
  const PS = 3; // 16x16 grid * 3 = 48x48px texture

  const colorMaps = {
    salmon: {
      '.': null, 'R': 0xEF4444, 'r': 0xF87171, 'W': 0xFCA5A5, 'w': 0xFFFFFF,
      'D': 0x991B1B, 'E': 0x111827, 'F': 0xDC2626
    },
    arcade_ship: {
      '.': null, 'C': 0x0284C7, 'c': 0x38BDF8, 'G': 0x00FFFF, 'W': 0xFFFFFF,
      'R': 0xF43F5E, 'F': 0x60A5FA, 'D': 0x0F172A
    },
    slime: {
      '.': null, 'G': 0x22C55E, 'g': 0x15803D, 'H': 0x86EFAC, 'E': 0x052E16, 'W': 0xFFFFFF
    }
  };

  function buildTexture(key, matrix, cmap) {
    const g = mk();
    matrix.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        const char = row[rx];
        const col = cmap[char];
        if (col != null) {
          g.fillStyle(col, 1);
          g.fillRect(rx * PS, ry * PS, PS, PS);
        }
      }
    });
    g.generateTexture(key, 16 * PS, 16 * PS);
    g.destroy();
  }

  // Bake textures dynamically
  buildTexture('fishing_salmon', SALMON_MATRIX, colorMaps.salmon);
  buildTexture('arcade_player_ship', SHIP_MATRIX, colorMaps.arcade_ship);
  buildTexture('dungeon_green_slime', SLIME_MATRIX, colorMaps.slime);
}
```

---

## 5. Scene Replacement Migration Plan

### 5.1 Fishing Scene Replacement
- **Angler**: Replace `this.add.text(..., '🎣')` with `this.add.sprite(this.W/2, this.H - 110, 'fishing_player_idle')`.
- **Bobber**: Replace `this.add.text(..., '🔴')` with `this.add.sprite(x, y, 'fishing_bobber')`.
- **Fish in Bar**: Replace `this.add.text(..., '🐟')` with `this.add.sprite(barX, fishIconY, 'fishing_' + targetFish.speciesKey)`.
- **Dock**: Replace `this.add.rectangle(...)` with tiled `this.add.tileSprite(this.W/2, this.H - 50, this.W, 48, 'dock_plank')` and `dock_lantern`.

### 5.2 Arcade Scene Replacement
- **Player Ship**: Replace `this.add.text(..., '🛸')` with `this.ship = this.add.sprite(this.W/2, this.H - 80, 'arcade_player_ship')`.
- **Enemies**: Replace `this.add.text(..., '👾')` with `this.add.sprite(x, y, enemyTypeKey)`.
- **Lasers**: Replace `this.add.rectangle(...)` with `this.add.sprite(x, y, 'laser_player')`.
- **Powerups**: Replace text emojis `🔫`, `🛡️`, `💣` with `this.add.sprite(mx, my, 'powerup_' + pType)`.

### 5.3 Dungeon Scene Replacement
- **Hero**: Replace `this.add.text(..., '🗡️')` with `this.player = this.add.sprite(this.W/2, this.H/2, 'dungeon_hero_idle')`.
- **Monsters**: Replace `this.add.text(..., type.emoji)` with `this.add.sprite(x, y, 'dungeon_' + type.key)`.
- **Loot**: Replace `this.add.text(..., '📜')` with `this.add.sprite(mx, my, 'loot_' + dropType)`.

---

## 6. Independent Verification Method

1. **Static Analysis Verification**:
   - Inspect `game.js` line numbers: `ArcadeScene` (2830–3220), `DungeonScene` (3221–3578), `FishingScene` (3579–3870).
   - Confirm texture scale consistency (`PS = 3`) matching `FarmScene._bakeTextures()`.
2. **Visual Inspection**:
   - Launch application via `run.bat` or HTTP server.
   - Enter Fishing Pond, Arcade Cabinet, and Dungeon Portal.
   - Confirm crisp pixel rendering with no blurred emoji artifacts.
3. **Hitbox & Collision Verification**:
   - Verify arcade player body size (`40, 40`), dungeon player body size (`30, 30`), and monster body sizes align cleanly with 48x48 pixel bounding boxes.

---
*Report completed by Explorer 3 for Milestone R1.*
