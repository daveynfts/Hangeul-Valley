# Project: Hangeul Valley - Storage (Inventory) + Cooking System

## Architecture
- `game.js` & `assets/game.js`: Core game engine, state management, farming system, crop harvest logic, save/load system (`collectSave` / `applySave`), inventory state & UI, cooking logic & UI, dropped items on map.
- `index.html` & `assets/index.html`: DOM structure, modal UIs (Inventory Modal, Cooking Modal), HUD buttons (Inventory Button, Cooking Button), styling/CSS for inventory and cooking interfaces.
- Item/Crop data definitions: Crops harvested produce inventory items (e.g. Radish, Cabbage, Carrot, etc. mapped to Korean vocab words).
- Dropped Item Entities: On-ground entity rendering with gentle bounce/bobbing animation, collision/proximity pickup logic.
- Save Data structure: Persistent inventory slots, slot capacity level/expansion, cooking recipe unlock/completion records.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Inventory Storage & Ground Drop Pipeline | Persistent inventory state, capacity expansion with gold, item stacking, HUD button + key shortcuts ('I'/'E'), Inventory UI modal, dropped item entity spawning on harvest with bounce animation, proximity pickup & full inventory toast warning, save/load integration (`collectSave`/`applySave`) | none | DONE |
| 2 | Cooking System, Recipes & Achievements | 10 cooking recipes (varying difficulty/rarity), Cooking UI displaying recipe list + required vs owned ingredients + cook action button, ingredient deduction, XP & Gold reward granting, recipe completion persistence, achievement unlock on 100% recipes cooked ('master_chef' trophy) | M1 | DONE |
| 3 | Dual-File Synchronization & Forensic Audit | Byte-for-byte SHA256 synchronization between `game.js` <-> `assets/game.js` and `index.html` <-> `assets/index.html`, full syntax check (`node -c`), non-cheating code integrity audit | M1, M2 | DONE |

## Code Layout
- `game.js` / `assets/game.js`: JavaScript game logic
- `index.html` / `assets/index.html`: HTML layout, UI modals, CSS styles

## Interface Contracts
### Storage / Inventory API
- `inventoryState`: `{ maxSlots: 20, items: { itemId: qty } }` or slots array.
- `addItemToInventory(itemId, qty)`: returns boolean (true if added, false if full).
- `removeItemFromInventory(itemId, qty)`: returns boolean.
- `droppedItemsSave`: persistent buffer for ground item entities across scene boot.
- `collectSave()` / `applySave(data)`: serializes inventory, capacity, ground drops, unlocked recipes, cooked recipe stats.

### Cooking API
- `COOKING_RECIPES`: Array of 10 recipes with `id, nameEn, nameKo, icon, ingredients: [{itemId, count}], xpReward, goldReward`.
- `cookRecipe(recipeId)`: checks ingredients, deducts items, awards XP/Gold, updates recipe state, checks for trophy/achievement unlock.
