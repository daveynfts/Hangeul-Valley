# Project: Hangeul Valley - Beehive Structure & Bee Shooting Vocabulary Minigame

## Architecture
- `game.js` & `assets/game.js`: Phaser 3 game logic, scene management (`FarmScene`, `BeeScene`), pixel-art rendering (`PixelArtRenderer`), item/inventory system, cooking system, save/load system (`collectSave` / `applySave`).
- `index.html` & `assets/index.html`: Web app overlay UI, DOM elements, HUD, glassmorphism modals.
- `levels.json`: Korean ↔ English vocabulary dictionary by themed levels.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Beehive Farm NPC & BeeScene Minigame Mechanics | Pixel-art Beehive sprite near apple tree with animated buzzing effect, label '🐝 Beehive', interaction hint '[SPACE]', Phaser `BeeScene` class registration, flying bee sprites with varied flight patterns (zigzag, sine wave, straight), target English word HUD, hit/miss interaction logic, 10-word round limit using unlocked level vocabulary, score & accuracy calculation, results summary overlay, clean scene transitions (FarmScene <-> BeeScene) | none | DONE |
| 2 | Honey Rewards, Cooking Integration & Save/Load Persistence | Inventory integration for Honey (`honey` item ID), round completion Honey rewards scaling with performance, registering Honey as cooking ingredient, adding Honey cooking recipe (e.g., Honey Glazed Goods / Honey Tea / Honey Yakgwa), save/load persistence for Beehive & Honey state (`collectSave` / `applySave`) | M1 | DONE |
| 3 | Dual-File Synchronization & E2E Forensic Integrity Audit | Exact byte-level SHA256 synchronization (`game.js` <-> `assets/game.js`, `index.html` <-> `assets/index.html`), 0 syntax errors (`node -c`), full empirical verification and Forensic Audit | M1, M2 | DONE |

## Code Layout
- `game.js` / `assets/game.js`: Phaser 3 game engine & minigame logic
- `index.html` / `assets/index.html`: DOM UI overlays and CSS

## Interface Contracts
### BeeScene & Beehive API
- `BeeScene`: Phaser.Scene class key `'BeeScene'`.
- `Beehive NPC`: Positioned near Apple Tree in `FarmScene`, interactive on `[SPACE]` keypress within range.
- `Bee Flying Entity`: Visual bee texture with Korean word text label attached, moving along trajectory (zigzag, sine wave, linear).
- `Vocabulary Source`: Level vocabulary from player's unlocked level progress.
- `Honey Rewards`: `honey` item added to `inventoryState` via `addItemToInventory('honey', count)`.
- `Cooking Recipe`: Recipe in `COOKING_RECIPES` requiring `'honey'` item.
- `Save/Load Data`: `collectSave()` / `applySave()` includes honey inventory and any minigame stats.
