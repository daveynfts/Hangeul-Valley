# Orchestration Plan — Player Character Redesign (Stardew Valley Style)

## Step 1: Investigation (Explorer Dispatch)
- Spawn 3 `teamwork_preview_explorer` subagents to analyze `game.js`:
  - Explorer 1: Map all `_genPlayerTextures` code, palette tokens, texture keys, matrix dimensions, action frames (`player_water_*`, `player_harvest_*`, `player_pick_*`), and tool sprites (`tool_watering_can`, etc.).
  - Explorer 2: Map player character creation, scale settings, physics body / hitboxes, shadow rendering (`DynamicShadowSystem` / `createShadow`), depth sorting (`depth`, `y` depth sorting), bobbing/wobble animations, and movement mechanics across all scenes.
  - Explorer 3: Audit visual environment harmony, plot alignment, tree collisions, Muop the Cat NPC, Shop, and Fishing Dock position relative to player sprite dimensions.

## Step 2: Implementation (Worker Dispatch)
- Spawn `teamwork_preview_worker` to:
  - Completely replace player palette `P` with a rich Stardew Valley warm earthy palette (cute large eyes, peach skin, brown hair, denim dungarees, straw hat, dark outlines, 3-tone shading).
  - Redesign all 12 walk cycle matrix frames (Down, Up, Left, Right x 3 frames each) with Chibi 1:2 ratio, bouncy movement steps, distinct arm/leg positions.
  - Redesign all action frames and tool sprites to match the new character design seamlessly.
  - Refine player scale, shadow rendering offset, wobble dynamics, depth sorting, and collision body.
  - Validate syntax (`node -c game.js`) and sync `game.js` to `assets/game.js`.

## Step 3: Review & Challenge (Reviewers & Challengers)
- Spawn 2 `teamwork_preview_reviewer` subagents to verify code syntax, animation key consistency, legacy alias preservation, visual quality, and asset sync.
- Spawn 2 `teamwork_preview_challenger` subagents to verify sprite matrix dimensions (strictly 16x16 chars per row/frame), node syntax, asset sync equality, and non-cheating implementations.

## Step 4: Forensic Audit (Auditor Dispatch)
- Spawn 1 `teamwork_preview_auditor` to conduct complete integrity forensics (no hardcoded test hacks, no dummy facades, genuine sprite matrices and animation registrations, full asset sync).

## Step 5: Synthesis & Report
- Synthesize all findings and present the final completion report to Sentinel.
