# Original User Request

## Follow-up — 2026-07-23T08:43:54Z

Sửa lỗi overlap và cải tiến UX cho thanh HUD phía trên game **Hangeul Valley**. Hiện tại có 3 phần tử fixed ở top (HUD bar, Event Banner, Progress Bar) đang chồng chéo nhau, và HUD chứa quá nhiều nút (~15 items) trong 1 hàng ngang gây khó đọc, khó bấm.

Working directory: C:/VibeCode/Hangeul Valley
Integrity mode: development

## Current Problem Analysis

### Layout Overlap (3 elements fighting for top space)
- `#hud` — `position: fixed; top: 14px; left: 14px;` — 15 items in single flex row
- `#event-banner` — `position: fixed; top: 10px; left: 50%; transform: translateX(-50%);` — overlaps HUD
- `#progress-bar-wrap` — `position: fixed; top: 14px; right: 14px;` — overlaps both

### HUD Content Overload (15 items in one row)
1. 🌾 icon + Level name + separator
2. 🌱 word count (hud-progress)
3. 🪙 Coins + 💎 Gems + 🎖️ Honor (3 currency badges)
4. Active buff bar (dynamic)
5. 🍳 Cook + 🐾 Pets + 🎉 Event + 🏅 Ranks + 📜 Quests + 💾 Save + ⚡ Duel + 🐟 Fish + 🏆 Trophies + 🏪 Shop + 📖 Vocab + ☰ Menu (12 buttons!)

## Requirements

### R1. Fix Top-Area Overlap & Layout Hierarchy
Redesign the top-area layout so that the HUD bar, Event Banner, and Progress Bar do NOT overlap each other on any screen width (desktop 1024px+ and tablet 768px). Each element must be clearly visible and accessible without obscuring another. The seasonal event banner should be visually distinct from the main HUD but not cover it.

### R2. Reorganize HUD Into Logical Groups
Reduce visual clutter in the HUD by organizing 15+ items into clear, scannable groups. Players should instantly find what they need. Consider:
- **Status section** (level, word count, progress bar)
- **Currency section** (coins, gems, honor)
- **Action buttons** — grouped or collapsed into fewer visible elements

The result must feel clean and premium (matching the existing 64-Bit Retro Glassmorphism design), not cramped or overwhelming.

### R3. Maintain Functional Parity & Existing Design System
All existing HUD functionality must remain accessible. No features should be removed. The glassmorphism styling (glass-bg, neon borders, glow effects, Press Start 2P font) must be preserved. All `onclick` handlers and element IDs must remain intact for JS compatibility.

## Acceptance Criteria

### Layout & Overlap
- [ ] Running the game at 1024×768 resolution: the HUD, Event Banner, and Progress Bar are all fully visible with zero pixel overlap between any two elements.
- [ ] At 768px viewport width (tablet): all three top elements remain visible and non-overlapping.
- [ ] No element is cut off or extends beyond the viewport.

### Readability & Usability
- [ ] A user can identify their current level name, all 3 currency values, and progress in under 2 seconds of looking at the HUD.
- [ ] The number of simultaneously visible top-level buttons is reduced to ≤8 without losing access to any feature (the rest can be in a submenu, dropdown, or secondary row).

### Code Integrity
- [ ] `node -c game.js` passes with zero syntax errors.
- [ ] All existing `onclick` handlers and element IDs in the HUD remain functional.
- [ ] The root `index.html` and `assets/index.html` are synchronized.
- [ ] The glassmorphism visual style (glass-bg, neon-gold borders, backdrop-filter blur) is preserved.
