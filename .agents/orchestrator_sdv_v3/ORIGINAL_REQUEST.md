# Original User Request

## Follow-up — 2026-07-24T11:26:51Z

Completely remove the existing main character (Player) design and create a brand new, highly detailed, Stardew Valley-inspired pixel art main character (Chibi 1:2 ratio, cute large eyes, modern Korean farmer look with dungarees/straw hat, brown hair) with full multi-directional movement animations in Hangeul Valley.

Working directory: d:\Hangeul Valley
Integrity mode: development

## Requirements

### R1. Complete Main Character Sprite Redesign
Completely wipe and replace the existing player character drawing/rendering logic. Create a brand-new pixel art character sprite set featuring a modern Korean farmer aesthetic (Stardew Valley style), cute Chibi 1:2 proportions, expressively shaded facial features/eyes, stylish outfit (t-shirt, overalls/dungarees/kaki, straw hat accents), and rich color palette.

### R2. Multi-Directional Walk Animations
Implement complete 4-directional (Down, Up, Left, Right) walk cycle animations for the new main character with smooth frame transitions, walking wobble/bobbing dynamics, and responsive movement feedback.

### R3. Visual Polish & Scale Harmony
Ensure the new player character sprite maintains perfect scale ratio, shadow rendering, depth sorting, and aesthetic harmony relative to the environment (plots, trees, NPCs like Muop the Cat, Shop, and Fishing Dock).

## Acceptance Criteria

### Main Character Sprite & Animation Verification
- [ ] Old player sprite texture baking and drawing routines are completely removed and replaced with the new pixel art character.
- [ ] Character features 4-directional walking animations (down, up, left, right) with proper sprite flipping/textures for all directions.
- [ ] Character scale and shadow fit cleanly with the game world elements without visual distortion or misaligned hitboxes.
- [ ] The game builds and runs cleanly without any console errors or broken movement controls.
- [ ] `node -c game.js` passes with 0 syntax errors, and `game.js` is synchronized to `assets/game.js`.
