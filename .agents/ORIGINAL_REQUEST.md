# Original User Request

## 2026-07-24T14:47:39Z

<USER_REQUEST>
Polish and upgrade all NPC sprites in Hangeul Valley with richer pixel art detail, multi-tone shading, specular highlights, and improved micro-animations. The goal is to make every NPC feel premium, cohesive, and visually stunning — matching the quality level of the recently upgraded Robot player character and Apple Tree.

Working directory: d:\Hangeul Valley
Integrity mode: development

## Requirements

### R1. Shop NPC Sprite Polish
Upgrade the Shop NPC sprite with richer pixel art detail: multi-tone clothing shading, facial expression refinement, accessory details (apron, hat, coins on counter), and crisp 1px dark outlines. The shop NPC should look like a warm, inviting Korean merchant character.

### R2. Wizard NPC Sprite Polish
Upgrade the Wizard NPC with detailed robes (fabric folds, star/moon embroidery details), glowing staff with particle-like highlights, mystical beard detail, and a magical aura effect. The wizard should feel powerful and arcane.

### R3. Cat NPC (Muop) Sprite Polish
Upgrade the Muop tabby cat world sprite (not the dialog portrait canvas) with richer fur texture detail, visible stripes/tabby pattern, expressive eyes with catchlights, and a subtle tail-swish idle animation. Muop should look adorable and lively on the farm.

### R4. Notice Board & Portal NPC Polish
Upgrade the Notice Board with wood grain detail, pinned paper notes with visible text marks, and a warm lantern glow effect. Upgrade the Dungeon Portal with richer magical rune detail, swirling energy core, and pulsing glow particles.

### R5. Beehive Polish
Upgrade the Beehive sprite with honeycomb texture detail visible on the hive surface, layered straw/wood construction, and dripping honey accent pixels at the bottom.

## Acceptance Criteria

### Visual Quality Verification
- [ ] Each NPC sprite uses more unique color tokens than the previous version (measurable by counting distinct fill colors in the texture bake routine).
- [ ] All NPC sprites maintain crisp 1px dark outlines for visual consistency with the Robot player character.
- [ ] No visual regression — NPC positions, scales, shadows, depth-sort, collision zones, and interaction mechanics remain correct.

### Code Quality
- [ ] `node -c game.js` and `node -c assets/game.js` pass with 0 syntax errors.
- [ ] SHA256 byte synchronization verified between `game.js` ↔ `assets/game.js` and `index.html` ↔ `assets/index.html`.
- [ ] All existing NPC interactions (Shop opens, Wizard dialog, Cat dialog, Board overlay, Portal transition, Beehive → BeeScene) continue to function without errors.
</USER_REQUEST>
