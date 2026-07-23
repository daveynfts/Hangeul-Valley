# Detailed Execution Plan — Phase 2 Pixel Art Graphics Upgrade

## Milestone Breakdown & Execution Strategy

### Milestone M1: Farm & Fishing Sprites Upgrade (R1 & R2)
- **Scope**:
  - `generateTilemapTextures()`: grass, path, fence, house, shore tiles and farm decorations (trees, flowers, stone well, barrels, crates, signpost, notice board, shop sign, arcade machine, dungeon portal, fishing dock). Stardew Valley aesthetic, warm palette, subtle dithering/texture variation, 1px dark outline, `STARDEW_PALETTE`.
  - `_genFishingTextures()`: 13 fish species (carp, salmon, tuna, squid, eel, goldfish, seabass, shrimp, octopus, catfish, mackerel, legendary, clam) and accessories (bobber, rod, dock_plank, dock_post). Distinct silhouette, multi-tone shading (>=3 tones), 1px dark outline `K`=`0x0F172A`.
- **Subagents**:
  - `explorer_p2_m1`: Investigate `generateTilemapTextures()` and `_genFishingTextures()` in `game.js`, check existing texture keys, matrix arrays, and token mappings.
  - `worker_p2_m1`: Implement Farm tilemaps/decorations and Fishing 13 species + accessories upgrades in `game.js` & `assets/game.js`.
  - `reviewer_p2_m1_1` & `reviewer_p2_m1_2`: Code & texture quality review.
  - `challenger_p2_m1_1` & `challenger_p2_m1_2`: Run syntax checks, single-character token checks, matrix row length checks, and texture key parity checks.
  - `auditor_p2_m1`: Forensic integrity verification.

### Milestone M2: Arcade & Dungeon Sprites Upgrade (R3 & R4)
- **Scope**:
  - `_genArcadeTextures()`: player ship, 4 aliens (scout, shooter, elite, boss/dreadnought), laser, 3 powerups (weapon, shield, nuke). Neon glow aesthetic, crisp outlines, multi-tone metallic/energy shading.
  - `_genDungeonTextures()`: 4 enemies (green slime, skeleton archer, goblin warrior, demon lord boss) and 5 loot items (coin, gem, potion, chest, scroll). Dark fantasy palette, glowing accents, sparkling highlights.
- **Subagents**:
  - `explorer_p2_m2`: Investigate `_genArcadeTextures()` and `_genDungeonTextures()`.
  - `worker_p2_m2`: Implement Arcade & Dungeon upgrades in `game.js` & `assets/game.js`.
  - `reviewer_p2_m2_1` & `reviewer_p2_m2_2`: Code review.
  - `challenger_p2_m2_1` & `challenger_p2_m2_2`: Verification scripts.
  - `auditor_p2_m2`: Forensic audit.

### Milestone M3: Verification, Compatibility & Integration (R5)
- **Scope**:
  - Verify forbidden elements: Player Farmer, Ginger Cat, Wizard Merlin, DynamicShadowSystem MUST NOT BE MODIFIED.
  - Single-char token check, matrix row width check across all matrices, 100% texture key parity across all textures.
  - Syntax check `node -c game.js`.
  - Sync check between `game.js` and `assets/game.js`.
- **Subagents**:
  - `worker_p2_m3`: Perform any fixup/sync if needed.
  - `reviewer_p2_m3_1` & `reviewer_p2_m3_2`: Final code review.
  - `challenger_p2_m3_1` & `challenger_p2_m3_2`: Automated test harness suite.
  - `auditor_p2_m3`: Final Forensic Audit.
