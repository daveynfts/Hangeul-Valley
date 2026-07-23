## 2026-07-22T10:43:39Z
You are Worker 1 for Milestone R1: Procedural 48x48 Pixel Art Sprite Renderer & Character System in Hangeul Valley.
Working directory: C:/VibeCode/Hangeul Valley/.agents/worker_m1

Your task:
Implement Milestone R1 in `C:/VibeCode/Hangeul Valley/game.js`:
1. Build `PixelArtRenderer` helper class in `game.js` that uses Phaser 3 Graphics API (`make.graphics()`, `fillRect()` grid drawing with pixel scaling `PS = 3` for 16x16 matrix = 48x48 px textures, `generateTexture()`, `NEAREST` filter mode).
2. Generate and register textures for:
   - **Player farmer character**: 4-directional walk cycle (3 frames per direction = 12 textures: `player_walk_down_0..2`, `player_walk_up_0..2`, `player_walk_left_0..2`, `player_walk_right_0..2`). Register animations: `player-walk-down`, `player-walk-up`, `player-walk-left`, `player-walk-right`.
   - **NPCs**: Cat (Muop 🐱: `cat_idle_0..1` + `cat-idle` anim), Wizard (Merlin 🧙‍♂️: `wizard_idle_0..1` + `wizard-idle` anim).
   - **Farm Crops & Trees**: 4 growth stages for crops (`crop_[name]_0..3`), Apple tree (`tree_apple_summer`, `tree_apple_bare`), soil tiles (`tile_tilled_soil`, `tile_watered_soil`, `tile_grass`).
   - **Fishing Scene**: 48x48 fish species (`fishing_salmon`, `fishing_tuna`, `fishing_snapper`, `fishing_legendary`, etc.), dock tiles (`dock_plank`, `dock_post`), fishing rod & bobber (`fishing_bobber`).
   - **Arcade Scene**: Player ship (`arcade_player_ship`), aliens (`alien_scout`, `alien_shooter`, `alien_elite`, `alien_boss`), lasers (`laser_player`), powerups (`powerup_weapon`, `powerup_shield`, `powerup_nuke`).
   - **Dungeon Scene**: Monsters (`dungeon_green_slime`, `dungeon_goblin_warrior`, `dungeon_skeleton_archer`, `dungeon_boss`), loot drops (`loot_coin`, `loot_gem`, `loot_potion`, `loot_chest`, `loot_scroll`).
3. Refactor all scenes (`FarmScene`, `FishingScene`, `ArcadeScene`, `DungeonScene`) in `game.js` to replace emoji text sprites (`this.add.text`) with `this.add.sprite` / `this.add.image` using the newly generated 48x48 pixel art textures.
4. Run syntax check `node -c game.js`.
5. Sync updated `game.js` to `assets/game.js`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Document all changes and test results in `C:/VibeCode/Hangeul Valley/.agents/worker_m1/handoff.md`.
