# Project: Hangeul Valley Expandable Farm Plots & Decorative Fence Flowers

## Architecture
- Target files: `game.js` / `assets/game.js`, `index.html` / `assets/index.html`
- State Management: Farm plot objects array/map, unlock state flag, purchase costs array (100, 200, 350, 500, 750, 1000 Gold).
- UI Layer: Shop modal / tab integration showing plot expansions, owned status, purchase buttons.
- Map/Rendering Layer: Farm grid expansion (+6 plots visually distinct with lock overlay/greyed out soil/lock icon), fence rendering with decorative flowers (varied colors: red, yellow, purple, pink) with subtle sway animation.
- Persistence Layer: Save/load functions serializing unlocked plot array/indexes into localStorage/save data.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Architecture & Exploration | Codebase analysis of farm grid, shop UI, fence rendering, save/load data structures | none | DONE |
| 2 | Locked Plots, Shop UI & Fence Flowers Impl | Implement R1 (6 locked plots, purchase prompt, save/load persistence), R2 (Shop UI expansion list, gold check, state sync), R3 (fence flowers pixel art, sway animation) | M1 | DONE |
| 3 | File Mirror Sync & Forensic Audit | Mirror sync `game.js` <-> `assets/game.js` and `index.html` <-> `assets/index.html`, node -c check, full forensic audit | M2 | DONE |

## Code Layout
- `game.js`: Primary game logic, rendering, shop UI, plot grid management, save system, animation loops.
- `assets/game.js`: Synchronized mirror copy of `game.js`.
- `index.html`: Main HTML entrypoint, canvas, UI elements.
- `assets/index.html`: Synchronized mirror copy of `index.html`.
