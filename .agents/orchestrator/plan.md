# Implementation Plan — Hangeul Valley Character Design Upgrade

## Objectives & Requirements
1. **Farmer Action Animations & Tool Sprites (R1)**:
   - Create 3+ frame procedural pixel art action animation sets for Farmer: Watering (bình tưới nước), Harvesting (thu hoạch), Fruit Picking (hái quả).
   - Create separate tool sprites (watering can, basket/sickle).
   - Trigger animations at gameplay moments (watering on Phase 2 quiz success, harvesting on Phase 3 quiz success, fruit picking on apple tree interaction).
2. **Ginger Cat Character Redesign (R2)**:
   - Rename Cat NPC from "Muop" to "Ginger Cat" across the codebase (game.js and assets/game.js).
   - Richer pixel art (ginger tabby with visible stripes, expressive face/whiskers, fluffy tail).
   - At least 4 animation states: idle-blink, walking/trotting, sitting/grooming, sleeping/curled up (≥2 frames each).
   - Contextual behavior in FarmScene.
3. **Seamless Integration & Integrity (R3)**:
   - All sprites rendered procedurally via Phaser Graphics API (PixelArtRenderer class, 16×16 matrix at PS=3). Zero external image files.
   - `node -c game.js` must pass with zero errors.
   - Farmer 12-frame walk cycle preserved.
   - Root `game.js` and `assets/game.js` must be synchronized.

## Milestone Plan

### Milestone 1: Exploration & Architecture Analysis
- **Goal**: Thoroughly analyze `game.js` sprite rendering pipeline, matrix structure, palette colors, Phaser animation definitions, cat NPC hardcoded references, and FarmScene trigger points.
- **Dispatch**:
  - `explorer_m1_1`: Analyze Farmer character matrix format, palette keys, existing 12 walk frames, and how action frames should be structured and animated.
  - `explorer_m1_2`: Analyze Cat NPC "Muop" references, current 2 idle frames, and how to structure 4+ animation states (idle-blink, walk, sit, sleep) with striped tabby design.
  - `explorer_m1_3`: Analyze FarmScene interaction logic for watering (Phase 2 success), harvesting (Phase 3 success), and apple picking, and exact line locations for animation triggers.
- **Output**: Consolidated exploration findings report in `.agents/explorer_m1_1/analysis.md`.

### Milestone 2: Implementation & Synchronization
- **Goal**: Implement all character matrices, textures, Phaser animation registrations, renaming, contextual cat behaviors, and gameplay trigger hooks. Synchronize root `game.js` and `assets/game.js`.
- **Dispatch**: Worker subagent (`worker_m2`).
- **Output**: Updated `game.js` and `assets/game.js` with passing `node -c game.js`.

### Milestone 3: Verification, Challenge & Forensic Audit
- **Goal**: Independently review code quality, verify animation frame counts, challenge trigger hooks and naming parity, and perform forensic integrity audit.
- **Dispatch**:
  - `reviewer_m3_1` & `reviewer_m3_2`: Verify code structure, animation parameters, frame counts, naming parity, sync between `game.js` and `assets/game.js`.
  - `challenger_m3_1` & `challenger_m3_2`: Verify syntax, test animation triggers, verify zero remaining "Muop" instances.
  - `auditor_m3`: Forensic integrity audit for cheating/fake code detection.
