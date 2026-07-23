# Technical Exploration Report: Milestone M2 - Arcade & Dungeon Sprites Upgrade

## 1. Executive Summary
This report provides a detailed read-only codebase analysis for **Milestone M2: Arcade & Dungeon Sprites Upgrade** in `C:\VibeCode\Hangeul Valley\game.js`.

The objective of M2 is to upgrade the visual quality of the Arcade and Dungeon mini-game sprites (pixel art matrices and color palettes) while maintaining 100% backward compatibility with all existing texture keys, game logic, and scene references.

---

## 2. Location & Structure of Texture Generation Routines

- **File**: `C:\VibeCode\Hangeul Valley\game.js`
- **Class**: `PixelArtRenderer` (Lines 214–3463)
- **Top-Level Calling Routine**:
  - `PixelArtRenderer.generateAllTextures(scene)` (Lines 247–263)
  - Calls `this._genArcadeTextures(scene);` at **Line 256**
  - Calls `this._genDungeonTextures(scene);` at **Line 257**
- **Arcade Generation Function**: `static _genArcadeTextures(scene)` (**Lines 2993–3227**)
- **Dungeon Generation Function**: `static _genDungeonTextures(scene)` (**Lines 3230–3462**)
- **Helper Function**: `PixelArtRenderer.createTexture(scene, key, matrix, palette, width = 16, height = 16, ps = 3)` (**Lines 229–245**)

---

## 3. Inventory of Texture Keys

### Arcade Mini-Game (9 Keys Total)
| # | Texture Key | Category | Exact Line Numbers in `game.js` | Current Matrix Var | Current Palette Var |
|---|---|---|---|---|---|
| 1 | `'arcade_player_ship'` | Player Ship | Matrix: 3000–3017, Register: 3218 | `ship` | `P_SHIP` |
| 2 | `'alien_scout'` | Alien (Scout - Tier 1) | Matrix: 3025–3042, Register: 3219 | `scout` | `P_SCOUT` |
| 3 | `'alien_shooter'` | Alien (Shooter - Tier 2) | Matrix: 3050–3067, Register: 3220 | `shooter` | `P_SHOOTER` |
| 4 | `'alien_elite'` | Alien (Elite - Tier 3) | Matrix: 3075–3092, Register: 3221 | `elite` | `P_ELITE` |
| 5 | `'alien_boss'` | Alien (Boss / Dreadnought) | Matrix: 3100–3117, Register: 3222 | `boss` | `P_BOSS` |
| 6 | `'laser_player'` | Weapon / Laser | Matrix: 3125–3141, Register: 3223 | `laser` | `P_LASER` |
| 7 | `'powerup_weapon'` | Powerup (Weapon) | Matrix: 3149–3166, Register: 3224 | `pw_weapon` | `P_PW_WEAPON` |
| 8 | `'powerup_shield'` | Powerup (Shield) | Matrix: 3174–3191, Register: 3225 | `pw_shield` | `P_PW_SHIELD` |
| 9 | `'powerup_nuke'` | Powerup (Nuke) | Matrix: 3199–3216, Register: 3226 | `pw_nuke` | `P_PW_NUKE` |

### Dungeon Mini-Game (9 Keys Total)
| # | Texture Key | Category | Exact Line Numbers in `game.js` | Current Matrix Var | Current Palette Var |
|---|---|---|---|---|---|
| 1 | `'dungeon_green_slime'` | Enemy (Slime) | Matrix: 3237–3254, Register: 3452 | `slime` | `P_SLIME` |
| 2 | `'dungeon_goblin_warrior'` | Enemy (Goblin Warrior) | Matrix: 3287–3304, Register: 3453 | `goblin` | `P_GOBLIN` |
| 3 | `'dungeon_skeleton_archer'` | Enemy (Skeleton Archer) | Matrix: 3262–3279, Register: 3454 | `skeleton` | `P_SKELETON` |
| 4 | `'dungeon_boss'` | Enemy (Demon Lord Boss) | Matrix: 3312–3329, Register: 3455 | `boss` | `P_DUNGEON_BOSS` |
| 5 | `'loot_coin'` | Loot (Gold Coin) | Matrix: 3361–3378, Register: 3457 | `coin` | `P_COIN` |
| 6 | `'loot_gem'` | Loot (Magic Gem) | Matrix: 3385–3402, Register: 3458 | `gem` | `P_GEM` |
| 7 | `'loot_potion'` | Loot (Health Potion) | Matrix: 3409–3426, Register: 3459 | `potion` | `P_POTION` |
| 8 | `'loot_chest'` | Loot (Treasure Chest) | Matrix: 3337–3354, Register: 3460 | `chest` | `P_CHEST` |
| 9 | `'loot_scroll'` | Loot (Magic Scroll) | Matrix: 3433–3450, Register: 3461 | `scroll` | `P_SCROLL` |

---

## 4. Matrix Grid & Palette Token Specifications

### Matrix Grid Structure
- All 18 existing matrices are defined as arrays of **16 strings**, where each string is exactly **16 characters long** (16×16 grid).
- `PixelArtRenderer.createTexture(scene, key, matrix, palette, width = 16, height = 16, ps = 3)` iterates over each row string:
  - If a character is `'.'` or `' '`, it is treated as transparent (no pixel rendered).
  - Character tokens map directly to hex color values in the associated palette object.
  - Pixel scale `ps` defaults to `3`, producing a canvas texture of $(16 \times 3) \times (16 \times 3) = 48 \times 48$ pixels.
- **Row Length Requirement**: If matrix size is kept at 16×16, every row string **MUST be exactly 16 characters**. If upgraded to higher resolution (e.g., 24×24 or 32×32), every row string **MUST be exactly $W$ characters long** ($W$ rows of length $W$), and `createTexture` MUST be called with explicit `width` and `height` arguments.

### Character Mappings & Color Aesthetics

#### Arcade Palette Specifications (Sci-Fi Neon Glow)
- **Player Ship (`P_SHIP`)**: Outlines in Slate Dark (`0x0F172A`), Hull in Sky Blue (`0x0284C7`), Cyan Highlights (`0x38BDF8`), Cockpit in Ice Glow (`0xE0F2FE`), Thrusters in Orange/Yellow (`0xF97316`, `0xFDE047`), Wing Lasers in Red (`0xEF4444`).
- **Alien Scout (`P_SCOUT`)**: Outlines in Dark Emerald (`0x052E16`), Body in Alien Green (`0x16A34A`, `0x4ADE80`), Visor in Red/Yellow (`0xEF4444`, `0xFDE047`), Cyber Cyan (`0x06B6D4`).
- **Alien Shooter (`P_SHOOTER`)**: Outlines in Deep Violet (`0x3B0764`), Body in Vivid Purple/Violet (`0x7E22CE`, `0xC084FC`), Cannons in Magenta Glow (`0xEC4899`), Energy Core in White/Yellow (`0xFFFFFF`, `0xFDE047`).
- **Alien Elite (`P_ELITE`)**: Outlines in Dark Bronze (`0x431407`), Armor in Fiery Orange (`0xEA580C`, `0xFB923C`), Claws in Plasma Yellow (`0xFDE047`), Shields in Cyan (`0x06B6D4`).
- **Alien Boss / Dreadnought (`P_BOSS`)**: Outlines in Dark Crimson (`0x500724`), Hull in Rose Crimson (`0xBE123C`, `0xE11D48`), Neon Pink Highlights (`0xFB7185`), Core in Plasma Purple (`0xA855F7`) and Matrix Green (`0x22C55E`).
- **Player Laser (`P_LASER`)**: Neon Cyan (`0x06B6D4`, `0x67E8F9`) with pure White energy core (`0xFFFFFF`).
- **Powerups (`P_PW_*`)**: Golden Amber for Weapon (`0xEAB308`, `0xEF4444`), Ice Sky Blue for Shield (`0x38BDF8`, `0xBAE6FD`), Radiation Yellow/Red for Nuke (`0xDC2626`, `0xFDE047`, `0x0F172A`).

#### Dungeon Palette Specifications (Dark Fantasy)
- **Green Slime (`P_SLIME`)**: Emerald Body (`0x10B981`), Mint Highlights (`0x34D399`, `0xA7F3D0`), Deep Slime Core (`0x059669`), Dark Emerald Border (`0x064E3B`).
- **Skeleton Archer (`P_SKELETON`)**: White/Grey Bone (`0xF5F5F4`, `0xD6D3D1`, `0x78716C`), Red Glowing Eye Sockets (`0xEF4444`), Brown Bow Wood (`0x78350F`), Steel Arrowhead (`0x94A3B8`).
- **Goblin Warrior (`P_GOBLIN`)**: Dark Goblin Green Skin (`0x16A34A`, `0x4ADE80`), Iron Armor (`0x64748B`), Steel Blade (`0xCBD5E1`), Red Loincloth/Eyes (`0xDC2626`).
- **Demon Lord Boss (`P_DUNGEON_BOSS`)**: Obsidian Horns (`0x18181B`, `0x52525B`), Fiery Red/Orange Skin (`0xDC2626`, `0xF97316`, `0xFDE047`), Glowing Eyes (`0xFEF08A`).
- **Loot Items (`P_COIN`, `P_GEM`, `P_POTION`, `P_CHEST`, `P_SCROLL`)**: High-contrast gold (`0xEAB308`), sapphire cyan (`0x06B6D4`), health potion crimson (`0xEF4444`), dark wood chest (`0x78350F`), aged parchment scroll (`0xFFFEF0`).

---

## 5. Mini-Game Scene Texture Usages

### ArcadeScene (Lines 7087–7523)
- Line 7156: `this.ship = this.add.sprite(this.W/2, this.H - 80, 'arcade_player_ship').setOrigin(0.5).setDepth(20);`
- Line 7197: `this.bossSprite = this.add.sprite(0, 0, 'alien_boss').setOrigin(0.5);`
- Line 7277: `const laser = this.add.sprite(x, this.ship.y - 25, 'laser_player').setOrigin(0.5);`
- Line 7307: `const alienKeys = ['alien_scout', 'alien_shooter', 'alien_elite'];`
- Line 7325: `const pMap = { '🔫': 'powerup_weapon', '🛡️': 'powerup_shield', '💣': 'powerup_nuke' };`

### DungeonScene (Lines 7524–7973)
- Line 7726: `const slash = this.add.sprite(this.player.x, this.player.y - 10, 'laser_player').setOrigin(0.5).setDepth(50);` *(Note: uses `'laser_player'` texture for sword slash effect!)*
- Lines 7763–7766: Enemy key mappings:
  - `'dungeon_green_slime'`
  - `'dungeon_goblin_warrior'`
  - `'dungeon_skeleton_archer'`
  - `'dungeon_boss'`
- Line 7827: `const lootKeys = ['loot_scroll', 'loot_coin', 'loot_gem', 'loot_potion', 'loot_chest'];`
- Line 7870: `const boss = this.add.sprite(this.W/2, 120, 'dungeon_boss').setOrigin(0.5).setDepth(30);`

---

## 6. Forbidden Elements & Protection Line Map

To ensure zero regressions in the main game, the implementing Worker subagent MUST NOT edit or touch the following code blocks:

| Forbidden Element | Affected Feature | Line Range in `game.js` | Reason / Protection Notice |
|---|---|---|---|
| **Player Farmer** | Farm Player Walk & Actions | Lines 1294–1808, 5800–5825, 5910–5920 | Core farm avatar rendering and walk cycles |
| **Ginger Cat NPC** | Cat companion & dialogue | Lines 1810–1997, 5853–5895, 6170–6190, 6446–6477, 6625–6629, 6696–6697, 6762–6765 | Cat state machine, animations, interaction logic |
| **Wizard Merlin NPC** | Wizard shop & dialogue | Lines 190–205, 1999–2050, 5780–5790, 6150–6165 | Wizard textures, spawn point, dialogue trigger |
| **DynamicShadowSystem** | Ground shadow physics/rendering | Lines 5097–5200, 5313, 6176, 7560 | Universal shadow system for Farm & Dungeon |

---

## 7. Recommendations for Worker Subagent

1. **Keep Texture Key Names Identical**: Ensure all 18 texture keys remain unchanged.
2. **Matrix Uniformity**: Ensure every row string in each matrix array has the exact same character count as all other rows in that array.
3. **Preserve `'laser_player'`**: Remember that `'laser_player'` is referenced in BOTH ArcadeScene (player laser) AND DungeonScene (player melee attack slash).
4. **Scope Isolation**: Restrict edits strictly within `PixelArtRenderer._genArcadeTextures(scene)` (Lines 2993–3227) and `PixelArtRenderer._genDungeonTextures(scene)` (Lines 3230–3462).
