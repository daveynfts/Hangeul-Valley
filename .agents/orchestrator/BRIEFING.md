# BRIEFING — 2026-07-23T10:54:00Z

## Mission
Orchestrate bug fixes for Hangeul Valley Pixel Art Inconsistencies & Matrix Errors in `c:/VibeCode/Hangeul Valley/game.js` and `c:/VibeCode/Hangeul Valley/assets/game.js`:
1. Fix matrix row length errors (fishing_legendary, dock_plank, dock_post, rod, DIRT_DRY, DIRT_WET).
2. Fix multi-character token parsing bugs (replace 'Wood', 'Metal', etc. with single-char symbols in palettes and matrices).
3. Add 1px dark contour outlines to 20 crop matrices, apple trees (tree_apple_summer, tree_apple_bare), fishing bobber, fishing_legendary, and tool_sickle.
4. Harmonize outline colors and ensure visual consistency across sprite generators.
5. Synchronize `game.js` and `assets/game.js`, ensuring `node -c game.js` passes and matrix check scripts pass.

## 🔒 My Identity
- Archetype: Project Orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: C:\VibeCode\Hangeul Valley\.agents\orchestrator
- Target repository: C:\VibeCode\Hangeul Valley
- Original parent: sentinel (id: e4a69aae-8992-433d-aaa7-90f4ae76a587)
- Original parent conversation ID: e4a69aae-8992-433d-aaa7-90f4ae76a587

## 🔒 My Workflow
- **Pattern**: Project Pattern (Orchestrator → Explorer → Worker → Reviewer → Challenger)
- **Scope document**: C:\VibeCode\Hangeul Valley\.agents\orchestrator\PROJECT.md
1. **Decompose**: Split work into 3 Milestones:
   - M1: Fix matrix row dimensions & multi-char token bugs
   - M2: Add outlines to crops/trees/tools/fishing sprites
   - M3: Verification, matrix audit script validation, & code synchronization
2. **Dispatch & Execute**: Direct iteration loop per milestone
3. **On failure**: Retry -> Replace -> Skip -> Redistribute -> Redesign
4. **Succession**: Self-succeed at 16 spawns
- **Work items**:
  1. M1: Matrix dimension & multi-char token fixes [in-progress]
  2. M2: Crop/Tree/Tool/Fishing outline additions [pending]
  3. M3: Verification & code sync [pending]
- **Current phase**: 2
- **Current focus**: Milestone 1 Execution (Exploration & Implementation)

## 🔒 Key Constraints
- NEVER write, modify, or create source code files directly as orchestrator.
- NEVER run build/test commands directly as orchestrator.
- All matrix rows must be exactly 16 single characters.
- All palette keys used in `drawMatrix()` must be single characters.
- Outlines must be 1px dark contour matching character outline style.
- Preserve all existing texture keys, animation keys, and gameplay triggers.
- Synchronize `game.js` and `assets/game.js`.
- Must pass `node -c game.js` with zero errors.

## Current Parent
- Conversation ID: e4a69aae-8992-433d-aaa7-90f4ae76a587
- Updated: 2026-07-23T10:54:00Z

## Key Decisions Made
- Decomposed scope into 3 distinct verifiable milestones.
- Set up target repository as `C:/VibeCode/Hangeul Valley`.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|

## Succession Status
- Succession required: no
- Spawn count: 0 / 16
- Pending subagents: none
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: pending
- Safety timer: none

## Artifact Index
- C:\VibeCode\Hangeul Valley\.agents\ORIGINAL_REQUEST.md — Original User Request
- C:\VibeCode\Hangeul Valley\.agents\orchestrator\BRIEFING.md — Briefing state
- C:\VibeCode\Hangeul Valley\.agents\orchestrator\plan.md — Detailed execution plan
- C:\VibeCode\Hangeul Valley\.agents\orchestrator\progress.md — Progress tracking & heartbeat
- C:\VibeCode\Hangeul Valley\.agents\orchestrator\context.md — Context summary
- C:\VibeCode\Hangeul Valley\.agents\orchestrator\PROJECT.md — Scope & layout document
