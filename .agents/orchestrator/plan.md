# Execution Plan — Hangeul Valley NPC Sprite Polish & Upgrade

## Overview
Polish and upgrade all NPC sprites in Hangeul Valley (Shop NPC, Wizard NPC, Cat NPC Muop, Notice Board, Portal, and Beehive) with richer pixel art detail, multi-tone shading, specular highlights, crisp 1px dark outlines, micro-animations, and increased color token count.

## Milestones & Phased Plan

### Milestone 1: Shop NPC & Wizard NPC Polish (R1 & R2)
- **Phase 1: Exploration**: Spawn 3 Explorers to locate exact sprite creation/bake/rendering functions for Shop NPC and Wizard NPC in `game.js`, count baseline color tokens, inspect current drawing routines, and formulate pixel art upgrade designs.
- **Phase 2: Implementation**: Spawn Worker to implement Shop NPC & Wizard NPC upgrades in `game.js`. Worker runs syntax check (`node -c game.js`) and verifies rendering logic.
- **Phase 3: Review & Challenge**: Spawn 2 Reviewers (code quality, outline compliance, non-regression) and 2 Challengers (empirical verification of color token count increase, 1px outlines, interaction stability).
- **Phase 4: Audit**: Spawn 1 Forensic Auditor for M1 integrity check.

### Milestone 2: Cat NPC, Notice Board, Portal & Beehive Polish (R3, R4, R5)
- **Phase 1: Exploration**: Spawn 3 Explorers to analyze Cat NPC Muop (world sprite), Notice Board, Portal, and Beehive sprite drawing functions in `game.js`.
- **Phase 2: Implementation**: Spawn Worker to implement R3, R4, R5 upgrades in `game.js`.
- **Phase 3: Review & Challenge**: Spawn 2 Reviewers and 2 Challengers to verify pixel art improvements, color token increases, tail-swish animation, particle/glow effects, and non-regression.
- **Phase 4: Audit**: Spawn 1 Forensic Auditor for M2 integrity check.

### Milestone 3: Dual-File Sync & Final E2E Forensic Integrity Audit
- **Phase 1: Sync & Verify**: Spawn Worker to synchronize `game.js` -> `assets/game.js` and `index.html` -> `assets/index.html`, verifying 100% SHA256 match and passing `node -c` syntax checks.
- **Phase 2: E2E Forensic Audit**: Spawn Forensic Auditor for complete project verification across R1-R5 and acceptance criteria.
- **Phase 3: Victory Report**: Report victory claim back to Sentinel/User.
