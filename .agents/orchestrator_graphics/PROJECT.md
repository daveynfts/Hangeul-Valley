# Project: Hangeul Valley HD Pixel Art Graphics Upgrade

## Architecture
- Single-Page Application using Phaser 3 for canvas rendering and Vanilla HTML/CSS for 64-Bit Retro Glassmorphism UI overlays.
- Procedural Canvas Pixel Art Engine using Phaser 3 Graphics API (`graphics.fillRect()`, `generateTexture()`) to render all entities without external images.
- 48x48 pixel art standard size for characters, crops, NPCs, enemies, and items.
- Shared asset synchronization between root (`game.js`, `index.html`) and `assets/` directory.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| R1 | Procedural 48x48 Pixel Art Sprite Renderer & Character System | Player 4-dir walk, Cat & Wizard NPCs, 4 crop growth stages, Apple tree, Fishing species/rod, Arcade space/aliens, Dungeon monsters/loot | None | DONE |
| R2 | Tilemap Terrain & Environment Art | FarmScene lush terrain, FishingScene beach/pier, ArcadeScene deep space parallax, DungeonScene stone/corridors | R1 | DONE |
| R3 | Animation, Particle Effects & Weather System | Day/night cycle + ambient lighting + shadows, Weather system [rain/snow/fog], Particles [leaves/dirt dust/water splashes/torch sparks/crop sparkles], Animated water, Parallax scrolling backgrounds | R1, R2 | DONE |
| R4 | Visual Polish & Consistency | Stardew Valley color palette, pixel-perfect crisp rendering, y-sort depth sorting, camera transitions, UI glassmorphism integration, node -c syntax check, root <-> assets sync | R1, R2, R3 | DONE |

## Interface Contracts
### Procedural Pixel Art Generator ↔ Phaser Scenes
- `PixelArtRenderer.generateAllTextures(scene)` -> registers player, NPC, crop, soil, minigame, monster textures
- `PixelArtRenderer.generateTilemapTextures(scene)` -> registers farm, beach, space, dungeon tilemap textures
- `PixelArtRenderer.generateEffectsTextures(scene)` -> registers weather, particle, lighting textures

## Code Layout
- Root: `game.js`, `index.html`, `levels.json`, `save_data.json`
- Assets mirror: `assets/game.js`, `assets/index.html`, `assets/levels.json`, `assets/save_data.json`
- Agent metadata: `.agents/orchestrator_graphics/`
