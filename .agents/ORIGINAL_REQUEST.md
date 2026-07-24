# Original User Request

## Initial Request — 2026-07-24T20:17:11+07:00

You are the Project Orchestrator for Hangeul Valley.
Your working directory for metadata is `d:\Hangeul Valley\.agents\orchestrator`.
The project root directory is `d:\Hangeul Valley`.

Refer to the user request appended in `d:\Hangeul Valley\.agents\ORIGINAL_REQUEST.md`.

## Task: Storage (Inventory) + Cooking System

### System Requirements:
1. Storage/Inventory System (R1):
   - Persistent inventory with slot capacity (starting ~20, expandable with gold).
   - Stacking by ingredient item type with quantity count.
   - UI accessible via HUD button and keyboard shortcut ('I' or 'E' key).
   - Shows item icons, names, quantities, and allows viewing/managing ingredients.
   - State persists across sessions via existing save/load system (`collectSave` / `applySave`).

2. Harvest-to-Ground Drop Pipeline (R2):
   - Harvest mature crop -> spawns visible pixel-art dropped item sprite near plot with subtle bounce/glow animation.
   - Walking over or interacting with dropped item picks it up into inventory.
   - Full inventory -> shows toast notification and leaves item on ground for later pickup.

3. Cooking System with Recipes (R3):
   - 8-12 recipes of increasing difficulty (requiring more / rarer ingredients).
   - Cooking UI displays available recipes, required ingredients (owned vs needed), and a cook button.
   - Cooking deducts ingredients from inventory, grants vocabulary XP and Gold rewards.
   - Unlocks trophy/achievement when all recipes are completed.
   - Recipes and cooking progress persist via save/load.

4. Integrity & Verification:
   - `node -c game.js` and `node -c assets/game.js` must pass with 0 syntax errors.
   - SHA256 byte synchronization verified between `game.js` <-> `assets/game.js`, and `index.html` <-> `assets/index.html`.

## Follow-up — 2026-07-24T21:22:55Z

Add a Beehive structure to the Hangeul Valley farm world and a new Bee Shooting minigame scene for Korean vocabulary practice. The player interacts with the Beehive to enter a full-screen minigame where bees fly across the screen — each bee displays a Korean word on its body. The game prompts an English word at the top, and the player must click/shoot the correct bee carrying the matching Korean translation. Successfully completing rounds earns Honey, which is added to the player's inventory for use in the existing Cooking system.

Working directory: d:\Hangeul Valley
Integrity mode: development

## Requirements

### R1. Beehive NPC on Farm Map
Add a Beehive structure (pixel art) to the farm world map near the apple tree area. The beehive should have an animated buzzing effect (subtle vibration or particle bees flying around it). When the player approaches and presses SPACE, transition to the Bee Shooting minigame scene. Include a label "🐝 Beehive" and interaction hint "[SPACE]".

### R2. Bee Shooting Vocabulary Minigame Scene
Create a new Phaser Scene (BeeScene) where multiple pixel-art bees fly across the screen in varied patterns (zigzag, sine wave, straight). Each bee displays a Korean vocabulary word on or near its body. An English target word is shown prominently at the top of the screen. The player clicks/taps the bee carrying the correct Korean translation. Correct hits score points, trigger a satisfying hit effect, and advance to the next word. Wrong hits show brief feedback. The game runs for a set number of rounds (e.g., 10 words) with moderate difficulty — bees should move at a learnable pace, giving players enough time to read and identify the correct Korean word. Use vocabulary from the player's current unlocked levels.

### R3. Honey Rewards & Cooking Integration
Completing a round of the Bee minigame awards Honey items to the player's inventory. Honey should be registered as a valid cooking ingredient that can be used in existing or new cooking recipes. The amount of Honey earned should scale with the player's score/accuracy in the minigame. Include at least one cooking recipe that requires Honey as an ingredient.

### R4. Save/Load & Scene Transitions
Beehive state and honey-related data must integrate with the existing save/load system. Scene transitions between FarmScene and BeeScene must use proper camera fade-in/fade-out and cleanly return the player to the farm after the minigame ends.

## Acceptance Criteria

### Beehive & Scene Verification
- [ ] A Beehive pixel-art sprite is visible on the farm map with a label and interaction hint.
- [ ] Pressing SPACE near the beehive transitions to the BeeScene without errors.
- [ ] Returning from BeeScene correctly restores the player to FarmScene.

### Minigame Mechanics Verification
- [ ] BeeScene displays multiple bees flying with Korean words visible on/near each bee.
- [ ] An English target word is shown prominently, and clicking the correct bee registers as a hit.
- [ ] Clicking an incorrect bee shows wrong-answer feedback without crashing.
- [ ] The minigame completes after a set number of rounds and shows a results summary.

### Honey & Cooking Verification
- [ ] Completing the minigame adds Honey to the player's inventory.
- [ ] At least one cooking recipe uses Honey as an ingredient.
- [ ] Honey quantity in inventory persists after save/load.

### Code Quality
- [ ] `node -c game.js` and `node -c assets/game.js` pass with 0 syntax errors.
- [ ] SHA256 byte synchronization verified between `game.js` ↔ `assets/game.js` and `index.html` ↔ `assets/index.html`.

