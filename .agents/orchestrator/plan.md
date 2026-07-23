# Execution Plan — Top HUD Redesign & Overlap Fix

## Objective
Fix top area layout overlaps (#hud, #event-banner, #progress-bar-wrap) for 1024px+ and 768px viewports, reorganize 15+ HUD items into scannable logical groups with ≤8 visible top-level action buttons, preserve retro glassmorphism design system & functional JS parity, and keep `index.html` and `assets/index.html` 100% synchronized.

## Steps
1. **Phase 1: Exploration**
   - Dispatch 3 Explorers (`teamwork_preview_explorer`) to investigate:
     - Explorer 1: Detailed HTML layout of `#hud`, `#event-banner`, `#progress-bar-wrap`, and all 15+ items in `index.html`.
     - Explorer 2: JS bindings, DOM selections, dynamic updates, and button event listeners in `game.js`.
     - Explorer 3: Responsive CSS styles, glassmorphism rules, break points (1024px, 768px), and layout proposals.
   - Aggregate Explorer findings.

2. **Phase 2: Implementation & Sync**
   - Dispatch Worker (`teamwork_preview_worker`) to:
     - Redesign `#hud`, `#event-banner`, and `#progress-bar-wrap` CSS and HTML structure.
     - Group buttons into clear logical sections: Status, Currency, Main Actions (≤8 visible), plus a dropdown/overflow menu for remaining actions.
     - Ensure retro glassmorphism visual design (neon borders, backdrop blur, Press Start 2P font) is preserved.
     - Maintain all element IDs and `onclick` attributes intact.
     - Sync changes from `index.html` to `assets/index.html`.
     - Run `node -c game.js` syntax check.

3. **Phase 3: Review, Challenge & Audit**
   - Dispatch 2 Reviewers (`teamwork_preview_reviewer`) to independently review HTML/CSS layout, button count (≤8 top-level), element ID preservation, and sync between `index.html` and `assets/index.html`.
   - Dispatch 2 Challengers (`teamwork_preview_challenger`) to run headless tests / viewport tests checking for pixel overlaps at 1024px+ and 768px, verifying click handlers work for all 12 buttons.
   - Dispatch Forensic Auditor (`teamwork_preview_auditor`) to verify zero cheating, fake implementations, or missing files.

4. **Phase 4: Synthesis & Reporting**
   - Synthesize results, update scope & progress metadata, report completion.
