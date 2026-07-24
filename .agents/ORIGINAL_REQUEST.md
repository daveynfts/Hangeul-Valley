# Original User Request

## 2026-07-24T15:24:33Z

<USER_REQUEST>
Add 6 extra farm plots that start locked (visually distinct — greyed out or with a lock icon) and can be unlocked by purchasing them from the Shop. Also add decorative flowers growing on/along the perimeter fence around the farming area for visual charm.

Working directory: d:\Hangeul Valley
Integrity mode: development

## Requirements

### R1. 6 Locked Expandable Farm Plots
Add 6 additional farm plots beyond the existing ones. These plots start locked — they should be visually distinguishable (e.g., darker soil, lock overlay, or "🔒" indicator). When a player interacts with a locked plot, show a prompt to purchase it. Once purchased (deducting Gold), the plot unlocks and becomes a normal usable farm plot. Unlocked plot state must persist via save/load.

### R2. Shop Integration for Plot Purchases
Add the 6 locked plots as purchasable items in the Shop UI. Each plot should have a price (increasing cost for each subsequent plot, e.g., 100, 200, 350, 500, 750, 1000 Gold). The Shop should clearly show which plots are already unlocked vs. available for purchase. After purchasing, the corresponding plot immediately becomes usable on the farm.

### R3. Decorative Flowers on Farm Fences
Add pixel-art flower decorations growing on or hanging from the perimeter fence posts around the farming area. Use varied flower types (different colors — red, yellow, purple, pink) placed at intervals along the fence for a charming, lived-in farm aesthetic. Flowers should have subtle idle animations (gentle swaying).

## Acceptance Criteria

### Locked Plots Verification
- [ ] 6 additional farm plots are visible on the farm map, visually distinguishable as locked.
- [ ] Interacting with a locked plot shows a purchase prompt with the Gold cost.
- [ ] After purchasing, the plot becomes usable for planting crops.
- [ ] Unlocked plot state persists correctly after save/load.
- [ ] Attempting to purchase with insufficient Gold shows an appropriate message and does not unlock the plot.

### Shop Integration Verification
- [ ] The Shop UI lists available plot expansions with prices.
- [ ] Already-unlocked plots are not shown as purchasable (or shown as "Owned").
- [ ] Gold is correctly deducted upon purchase.

### Fence Flowers Verification
- [ ] Decorative flowers are visible along the farm perimeter fence.
- [ ] At least 3 different flower colors are used.
- [ ] Flowers have a subtle sway/idle animation.

### Code Quality
- [ ] `node -c game.js` and `node -c assets/game.js` pass with 0 syntax errors.
- [ ] SHA256 byte synchronization verified between `game.js` ↔ `assets/game.js` and `index.html` ↔ `assets/index.html`.
</USER_REQUEST>
