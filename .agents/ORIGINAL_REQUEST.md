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
