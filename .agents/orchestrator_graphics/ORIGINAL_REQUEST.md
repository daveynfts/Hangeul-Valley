# Original User Request

## Follow-up — 2026-07-22T10:41:14Z

Nâng cấp toàn bộ đồ họa game **Hangeul Valley** từ emoji text sprites lên phong cách **HD Pixel Art kiểu Stardew Valley** sử dụng **Canvas Pixel Art** (Phaser 3 Graphics API — vẽ trực tiếp bằng rectangles, circles, polygons, không cần file ảnh bên ngoài). Kích thước sprite mục tiêu: **48×48 pixel**. Nâng cấp tất cả 7 scenes với hiệu ứng visual đẳng cấp: day/night cycle, weather, particle effects, animated water, smooth character animations, crop growth stages, và parallax scrolling backgrounds.

Working directory: C:/VibeCode/Hangeul Valley
Integrity mode: development

## Current Architecture Context

Game là single-page web app (Phaser 3 + vanilla HTML/CSS/JS):
- **`game.js`**: Toàn bộ game logic Phaser 3 (~6000+ lines) — 7 scenes: FarmScene, FishingScene, ArcadeScene, DungeonScene, SpellDuel (HTML overlay), MemoryMatch (HTML overlay), CatDialog (HTML overlay)
- **`index.html`**: Toàn bộ UI overlays styled with 64-Bit Retro Glassmorphism CSS
- **`assets/`**: Mirror copy of root files (must stay synced)
- All current sprites are **emoji text** rendered via `this.add.text()` — no image files exist

**Key constraint**: The game must remain a **zero-external-assets web app** — all pixel art graphics must be generated programmatically using Phaser 3's built-in Graphics API (`this.add.graphics()`, `this.make.graphics()`, `generateTexture()`). No PNG/SVG/image files. This keeps the game deployable on Vercel as a single HTML+JS bundle.

## Requirements

### R1. Pixel Art Sprite Renderer & Character System
Replace ALL emoji text sprites across all scenes with **48×48 procedural pixel art** drawn using Phaser Graphics API (`graphics.fillRect()` grid patterns rendered to textures via `generateTexture()`). Each entity should look like a hand-crafted Stardew Valley pixel art character:
- **Player character**: Farmer with hat, overalls, and tool — 4-directional walk cycle animation (at least 3 frames per direction = 12 frames total).
- **NPCs**: Cat (Muop 🐱), Wizard (Merlin), each with idle animation and unique pixel art design.
- **Farm elements**: Crops with 4 growth stages (seed → sprout → growing → harvestable), each visually distinct. Apple tree with seasonal appearance. Farmland tiles (tilled soil, watered soil, grass).
- **Fishing scene**: Detailed fish sprites for each species, wooden dock, fishing rod with line animation.
- **Arcade scene**: Pixel art spaceship, alien enemies, boss, projectiles, power-ups.
- **Dungeon scene**: Dungeon walls/floor tiles, monster sprites, loot drops, boss sprite.

### R2. Tilemap Terrain & Environment Art
Build a rich **tilemap-based environment** for each Phaser scene using procedurally generated tile textures (grass, dirt, water, stone, wood, sand):
- **FarmScene**: Lush green farm with fenced areas, paths between plots, flower patches, a farmhouse silhouette, pond/stream, trees along borders. The world should feel alive and cozy like Stardew Valley's Pelican Town.
- **FishingScene**: Ocean coastline with sandy beach, wooden pier extending into water, rocky shoreline, seashells, distant horizon.
- **ArcadeScene**: Deep space background with stars, nebulae, planet silhouettes — parallax scrolling at multiple depth layers.
- **DungeonScene**: Dark stone dungeon with torch-lit corridors, cracked floor tiles, moss on walls, mysterious glowing runes.

### R3. Animation, Particle Effects & Weather System
Implement visual effects that bring the world to life:
- **Day/Night Cycle**: Smooth ambient lighting transition cycling through dawn (warm orange), day (bright), dusk (purple-pink), night (dark blue with stars). Dynamic shadows that shift with "sun" position. Light sources (lanterns, torches, fireflies) glow realistically at night.
- **Weather System**: Rain (animated droplets + puddle splashes + darkened sky), snow (soft falling flakes + white ground accumulation), fog/mist (translucent overlay that drifts). Weather should change periodically or randomly.
- **Particle Effects**: Falling leaves in farm, dust clouds when walking on dirt, water splashes when fishing, fire sparks from torches, sparkle effects on harvested crops, explosion particles in arcade.
- **Animated Water**: Rivers/ponds/ocean with flowing wave animation, reflective surface shimmer, foam at edges.
- **Parallax Scrolling**: Multi-layer depth backgrounds (at least 3 layers) creating depth perception in all outdoor scenes.

### R4. Visual Polish & Consistency
Ensure overall visual quality matches the Stardew Valley aesthetic standard:
- **Color Palette**: Use a cohesive, warm pixel art color palette (earthy greens, warm browns, sky blues, golden harvest tones) consistent across all scenes.
- **Pixel-perfect rendering**: All sprites must use `image-rendering: pixelated` / crisp-edges. No blurry upscaling.
- **Depth sorting**: Proper y-sort depth so characters walk behind/in front of objects naturally.
- **Screen transitions**: Smooth fade/wipe transitions between scenes matching the existing camera fade system.
- **UI integration**: The existing Glassmorphism HTML overlay UI panels must remain functional and visually harmonious with the new pixel art world beneath them.

## Acceptance Criteria

### Visual Quality
- [ ] Zero emoji text sprites remain in any Phaser scene — all entities use procedural pixel art textures generated via Graphics API.
- [ ] Player character has smooth 4-directional walk animation with at least 3 frames per direction.
- [ ] At least 4 distinct crop growth stage sprites are visible when planting and growing crops.
- [ ] Each Phaser scene (Farm, Fishing, Arcade, Dungeon) has a unique, detailed tilemap terrain — not flat colored backgrounds.
- [ ] Color palette feels warm, cohesive, and distinctly "Stardew Valley-like" across all scenes.

### Effects & Animation
- [ ] Day/night lighting cycle is visible and smooth — the screen color temperature and brightness change over time.
- [ ] At least one weather effect (rain OR snow OR fog) is implemented and triggers during gameplay.
- [ ] Particle effects are visible during at least 3 gameplay actions (e.g., harvesting, walking on dirt, fishing splash).
- [ ] Water surfaces (pond, ocean, river) have animated wave/shimmer effects — not static.
- [ ] At least one scene uses parallax scrolling with 2+ depth layers.

### System Integrity
- [ ] Running `node -c game.js` produces zero syntax errors.
- [ ] All existing gameplay mechanics (triple currency, quests, crafting, pets, seasonal events, leaderboard) remain fully functional after the graphics upgrade.
- [ ] Root files (`index.html`, `game.js`) and `assets/` copies remain synchronized.
- [ ] Game loads and runs without errors in a modern browser — no external image files are required.
- [ ] Existing Glassmorphism UI overlays continue to display correctly on top of the new pixel art scenes.
