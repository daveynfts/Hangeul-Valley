# Implementation Plan — Expandable Farm Plots & Decorative Fence Flowers

## Overview
Implement 6 expandable locked farm plots with shop purchasing and save/load persistence, integrate plot purchases into the Shop UI, add animated decorative flowers along perimeter fence posts, and maintain exact dual-file byte sync between `game.js` <-> `assets/game.js` and `index.html` <-> `assets/index.html`.

## Milestone Plan

### Milestone 1: Exploration & Technical Design
- Dispatch 3 Explorers (`teamwork_preview_explorer`) to analyze existing farm grid rendering, plot interaction logic, shop UI code, fence rendering routines, and save/load state schema.
- Explorers deliver detailed reports on exact locations for changes and precise technical strategy.

### Milestone 2: Implementation & Iteration Gate (R1, R2, R3)
- Dispatch Worker (`teamwork_preview_worker`) to implement R1 (6 locked plots), R2 (Shop UI purchase integration), and R3 (perimeter fence decorative flowers with sway animation).
- Dispatch 2 Reviewers (`teamwork_preview_reviewer`) to evaluate visual quality, UI integration, persistence, and syntax.
- Dispatch 2 Challengers (`teamwork_preview_challenger`) to stress test purchase mechanics, gold deduction, insufficient gold prompts, save/load state round-trips, fence flower animations, and node syntax checks.
- Dispatch 1 Forensic Auditor (`teamwork_preview_auditor`) to verify zero integrity violations / zero cheating.

### Milestone 3: Dual-File Sync & Final Forensic Audit
- Dispatch Worker to ensure exact SHA256 byte sync between `game.js` ↔ `assets/game.js` and `index.html` ↔ `assets/index.html`.
- Run `node -c game.js` and `node -c assets/game.js`.
- Dispatch Final Forensic Auditor (`teamwork_preview_auditor`) to issue final CLEAN verification verdict.
- Report completion to Sentinel.
