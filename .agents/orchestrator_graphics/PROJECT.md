# Project: Hangeul Valley Pixel Art Graphics Upgrade (Phase 2)

## Architecture
- Single-Page Application using Phaser 3 for canvas rendering and Vanilla HTML/CSS for 64-Bit Retro Glassmorphism UI overlays.
- Procedural Canvas Pixel Art Engine using Phaser 3 Graphics API (`drawMatrix()`, `generateTexture()`) to render all entities without external images.
- 48x48 pixel art standard size for characters, crops, NPCs, enemies, and items.
- Single-character matrix color mapping tokens (e.g., `'K'`, `'g'`, `'G'`) parsed by `drawMatrix()`.
- Shared asset synchronization between root (`game.js`, `index.html`) and `assets/` directory (`assets/game.js`, `assets/index.html`).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Farm & Fishing Sprites Upgrade | Tilemaps in `generateTilemapTextures()` (grass, path, fence, house, shore tiles) and farm scene decorations (trees, flowers, stone well, barrels, crates, signpost, notice board, shop sign, arcade machine, dungeon portal, fishing dock); 13 fish species + fishing accessories (bobber, rod, dock_plank, dock_post) in `_genFishingTextures()` using `STARDEW_PALETTE` and 1px dark outline `K`=`0x0F172A`. | None | DONE |
| M2 | Arcade & Dungeon Sprites Upgrade | All arcade sprites in `_genArcadeTextures()` (player ship, 4 aliens, laser, 3 powerups) with sci-fi neon glow; All dungeon sprites in `_genDungeonTextures()` (4 enemies, 5 loot items) with dark fantasy palette and glowing accents. | M1 | DONE |
| M3 | Verification, Compatibility & Integration | Strict adherence to forbidden elements (Player Farmer, Ginger Cat, Wizard Merlin, DynamicShadowSystem unchanged), single-char token validation, exact row width validation, 100% texture key parity, zero `node -c game.js` syntax errors, 100% sync `game.js` ↔ `assets/game.js`. | M1, M2 | DONE |

## Interface Contracts
### Procedural Pixel Art Generator ↔ Phaser Scenes
- `PixelArtRenderer.generateTilemapTextures(scene)` -> registers farm, beach, shore, path, fence, house, and decoration textures.
- `PixelArtRenderer._genFishingTextures(scene)` -> registers 13 fish species and fishing accessories textures.
- `PixelArtRenderer._genArcadeTextures(scene)` -> registers spaceship, 4 aliens, laser, 3 powerups textures.
- `PixelArtRenderer._genDungeonTextures(scene)` -> registers 4 dungeon enemies and 5 loot item textures.

## Code Layout
- Root: `game.js`, `index.html`, `levels.json`, `save_data.json`
- Assets mirror: `assets/game.js`, `assets/index.html`, `assets/levels.json`, `assets/save_data.json`
- Agent metadata: `.agents/orchestrator_graphics/`
