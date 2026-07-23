# HD Pixel Art Graphics Upgrade Execution Plan

## Milestone Breakdown & Strategy

### Milestone R1: Procedural 48x48 Pixel Art Sprite Renderer & Character System
1. **Explorer Phase**: Analyze existing sprite creation (`this.add.text` emoji usage) across all Phaser scenes in `game.js`. Map all entity creation points to be replaced with 48x48 procedural pixel art textures.
2. **Implementation Phase**: Implement `PixelArtRenderer` helper class that builds 48x48 pixel grid textures using Phaser 3 Graphics API (`fillRect` color grids converted via `generateTexture`). Define textures for:
   - Player character with 4-directional walk animation (3 frames/dir = 12 textures).
   - Cat (Muop 🐱) & Wizard (Merlin) NPCs with idle animations.
   - Farm crops with 4 growth stages (seedling, sprout, growing, mature) and Apple Tree.
   - Fishing scene species, dock, fishing rod & line.
   - Arcade scene player ship, alien types, boss, laser projectiles, power-ups.
   - Dungeon scene monster types (slime, goblin, skeleton, boss), loot items.
3. **Verification Phase**: Reviewers + Challengers + Forensic Auditor verify visual texture creation, animation setup, build/syntax check (`node -c game.js`), zero external image dependencies, and integrity checks.

### Milestone R2: Tilemap Terrain & Environment Art
1. **Explorer Phase**: Analyze terrain & background generation in `FarmScene`, `FishingScene`, `ArcadeScene`, `DungeonScene`.
2. **Implementation Phase**: Replace flat color rectangles and basic shapes with rich tilemap terrain:
   - `FarmScene`: Grass tiles, tilled soil, watered soil, wooden fence tiles, dirt paths, flower tiles, farmhouse background, pond boundaries.
   - `FishingScene`: Ocean water tiles, sandy beach, wooden pier, rocks, seashells.
   - `ArcadeScene`: Deep space starfield tilemap, nebula layers, planet silhouettes.
   - `DungeonScene`: Dark stone tiles, mossy stone walls, torch mounts, cracked floor tiles, glowing rune tiles.
3. **Verification Phase**: Reviewers + Challengers + Forensic Auditor verify scene rendering, tile alignment, tilemap performance, syntax check, and sync.

### Milestone R3: Animation, Particle Effects & Weather System
1. **Explorer Phase**: Investigate scene update loops and visual effects setup.
2. **Implementation Phase**: Add dynamic atmospheric and visual effects:
   - **Day/Night Lighting Cycle**: Smooth color tinting / light overlay cycling through Dawn -> Day -> Dusk -> Night with starry night sky and light sources (torches, lanterns, fireflies).
   - **Weather Engine**: Rain (falling drops, puddle splashes), Snow (falling flakes, white ground accumulation), Fog (drifting translucent mist).
   - **Particle Systems**: Leaves falling, dirt dust clouds when moving, water splashes, crop harvesting sparkles, torch embers, arcade explosions.
   - **Animated Water**: Flowing wave graphics, specular shimmer, edge foam on ponds and ocean.
   - **Parallax Backgrounds**: Multi-layer background scrolling in outdoor/arcade scenes.
3. **Verification Phase**: Reviewers + Challengers + Forensic Auditor verify atmospheric systems, particle performance, frame rates, and integrity.

### Milestone R4: Visual Polish & Consistency
1. **Explorer Phase**: Audit overall color palette, rendering crispness, depth sorting, scene transitions, and HTML UI integration.
2. **Implementation Phase**:
   - Palette unification (Stardew Valley warm earthy tone palette).
   - Enforce pixelated crisp rendering (`image-rendering: pixelated`, `roundPixels: true`).
   - Implement dynamic Y-Sort depth sorting (`depth = y + height`).
   - Camera fade-in / fade-out transitions between Phaser scenes.
   - Verify 64-Bit Glassmorphism HTML overlays stay perfectly positioned above canvas.
   - Run syntax check (`node -c game.js`) and synchronize root files with `assets/`.
3. **Verification Phase**: Full Reviewer, Challenger, and Forensic Auditor pass. Prepare final report.
