# Project: Hangeul Valley Pixel Art Quality Upgrade

## Architecture
- Single Page Web App (Phaser 3 + vanilla HTML/CSS/JS)
- `game.js` (and mirrored `assets/game.js`): Contains `PixelArtRenderer` procedural matrix definitions, `STARDEW_PALETTE` color definitions, texture generation via `generateTexture()`, Phaser animation registration, character controllers, and scene integrations.
- Zero external assets constraint: 100% procedural pixel art rendered via `PixelArtRenderer.drawMatrix(g, matrix, palette)` on 16×16 matrices scaled at `PS=3` (48×48 textures).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Palette Matrix Spec | Inspect all character sprites (Farmer, Cat, Wizard), crop stages, fish species, dungeon monsters, arcade enemies, and texture key registry in `game.js`. | none | DONE |
| 2 | Implementation & Code Sync | Redesign all 16×16 matrices with multi-tone shading (≥3 tones), 1px dark outlines, anatomical details, dithering/AA, and detailed textures. Retain all keys. Sync `game.js` and `assets/game.js`. | M1 | DONE |
| 3 | Verification & Challenge | Verify zero syntax errors (`node -c game.js`), 100% texture key parity, code quality, and synchronization. (Skip victory audit). | M2 | DONE |

## Interface Contracts & Texture Keys
- `PixelArtRenderer` matrix format: 16×16 character grid strings, `PS=3` (48×48 textures).
- Palette usage: `STARDEW_PALETTE` extended with highlight, base, shadow, and deep shadow tones for all colors.
- Character Texture Keys:
  - Farmer Walk (12): `player_walk_down_0/1/2`, `player_walk_up_0/1/2`, `player_walk_left_0/1/2`, `player_walk_right_0/1/2`
  - Farmer Actions (9): `player_water_down_0/1/2`, `player_harvest_down_0/1/2`, `player_pick_down_0/1/2`
  - Tools: `tool_watering_can`, `tool_basket`, `tool_sickle`
  - Ginger Cat (8): `cat_idle_0/1`, `cat_walk_0..2`, `cat_sit_0/1`, `cat_sleep_0/1`, `cat_npc`
  - Wizard Merlin (2): `wizard_idle_0/1`, `wizard_npc`
- Environment & Entity Keys:
  - Crops (5 species × 4 stages = 20): `crop_carrot_0..3`, `crop_radish_0..3`, `crop_cabbage_0..3`, `crop_pepper_0..3`, `crop_rice_0..3` plus legacy aliases `cr_0..4_0..3`
  - Fish (11): `fish_carp`, `fish_salmon`, `fish_tuna`, `fish_squid`, `fish_eel`, `fish_goldfish`, `fish_seabass`, `fish_shrimp`, `fish_octopus`, `fish_catfish`, `fish_mackerel` plus legacy aliases `fishing_*`
  - Dungeon Monsters & Bosses (18+): `dungeon_green_slime`, `dungeon_skeleton_archer`, `dungeon_goblin_warrior`, `dungeon_boss`, loot items
  - Arcade Enemies & Player Ship (9+): `arcade_player_ship`, `alien_scout`, `alien_shooter`, `alien_elite`, `alien_boss`, `laser_player`, powerups
  - Total Inventory: 215 unique texture keys registered in `PixelArtRenderer.generateAllTextures(scene)`.

## Code Layout
- Root: `game.js`, `index.html`
- Assets: `assets/game.js`, `assets/index.html`
