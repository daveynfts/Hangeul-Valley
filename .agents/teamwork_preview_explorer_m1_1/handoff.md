# Handoff Report: Main Character Redesign Codebase Investigation (Milestone 1)

## 1. Observation
- **Target File**: `d:\Hangeul Valley\game.js` (and twin copy `d:\Hangeul Valley\assets\game.js`).
- **Function Location**: `PixelArtRenderer._genPlayerTextures(scene)` at lines 1314–1828 (515 lines).
- **Boot Invocation**: Called at line 252 inside `PixelArtRenderer.generateAllTextures(scene)`.
- **Palette `P`**: Defined at lines 1315–1329 with 48 color mapping tokens (`.` transparent + 47 hex values). Dark silhouette outline token is `'K'` (`0x1A1A2E`). Multi-tone shading defined for skin, hair, overalls, straw hat, ribbon, boots, and tools.
- **Character & Tool Matrices**: 24 matrices total ($16 \times 16$ arrays of 16-char strings):
  - 12 Walk frames: `down_0..2` (1331–1384), `up_0..2` (1386–1439), `left_0..2` (1441–1494), `right_0..2` (1496–1549).
  - 9 Action frames: `water_down_0..2` (1552–1605), `harvest_down_0..2` (1607–1660), `pick_down_0..2` (1662–1715).
  - 3 Tool sprites: `tool_watering_can` (1718–1735), `tool_basket` (1736–1753), `tool_sickle` (1754–1771).
- **Texture Registrations**: Lines 1773–1798 create 24 textures via `this.createTexture(scene, key, matrix, P)`.
- **Legacy Aliases**: Lines 1801–1804 register `farmer0` (`down_0`), `farmer1` (`down_1`), `farmer2` (`down_0`), `farmer3` (`down_2`).
- **Animation Registrations**: Lines 1806–1827 register 7 Phaser animations (`player-walk-down`, `player-walk-up`, `player-walk-left`, `player-walk-right`, `player-water`, `player-harvest`, `player-pick`).
- **Auditor Script**: Checked `.agents/victory_auditor_player_sdv_v2/verify_all.js`, which enforces 9 strict criteria including 1px `'K'` outer boundary outline, $\ge 35\%$ head height ratio, facial size $\ge 3 \times 6$, 2 eyes (`NW`), bouncy walk diffs $\ge 8$ px, $\ge 30$ tokens in `P`, and legacy `farmer0..3` aliases.

---

## 2. Logic Chain
1. **Goal**: Map all player sprite generation code in `game.js` to enable a Worker to wipe and replace the current character with a Stardew Valley Chibi 1:2 pixel art character.
2. **Finding 1**: All main character sprite texture generation logic is self-contained within `static _genPlayerTextures(scene)` between lines 1314 and 1828 of `game.js`.
3. **Finding 2**: The game engine relies on texture keys generated inside `_genPlayerTextures`. Main gameplay calls `player.anims.play('player-walk-down')`, `player.setTexture('player_walk_down_0')`, `tool_watering_can`, etc. Legacy systems expect `farmer0..3`.
4. **Finding 3**: Existing tests and victory auditors (`verify_all.js`) validate player textures strictly by parsing `_genPlayerTextures(scene)` body, evaluating Palette `P`, checking matrix dimensions ($16 \times 16$), outer boundary `'K'` enclosure, Chibi head ratio ($\ge 35\%$), facial dimensions ($\ge 3 \times 6$, 2 eyes), frame differences ($\ge 8$ px), and syntax correctness.
5. **Conclusion**: Worker can safely wipe lines 1315–1827 inside `_genPlayerTextures(scene)` and insert the new Stardew Valley Chibi 1:2 palette and matrix definitions without modifying caller sites in `game.js` (such as `_createPlayer` or `update`), provided all 24 matrix keys, legacy `farmer0..3` aliases, and 7 animation keys are preserved.

---

## 3. Caveats
- `assets/game.js` is a duplicate file of `game.js` in the repository. Both files must be edited in parallel by Worker to prevent divergence.
- Player scale in scene is set to `1.8` (`this.player.setScale(1.8)` at line 8478) and physics body size is set to `24 x 16` with offset `(12, 32)`. The $16 \times 16$ pixel matrix baked at $3\times$ scale produces a $48 \times 48$ pixel texture.

---

## 4. Conclusion
The entire player sprite generation system has been fully mapped in `analysis.md` and this handoff report. The Worker agent has a complete, risk-free step-by-step strategy for wiping and replacing `_genPlayerTextures` in both `game.js` and `assets/game.js` while maintaining total compatibility with game mechanics and 100% compliance with victory auditor checks.

---

## 5. Verification Method
1. Inspect `game.js` lines 1314–1828 to verify method boundary and structure.
2. Run syntax check on modified files:
   ```bash
   node -c "d:\Hangeul Valley\game.js"
   node -c "d:\Hangeul Valley\assets\game.js"
   ```
3. Run victory auditor script:
   ```bash
   node "d:\Hangeul Valley\.agents\victory_auditor_player_sdv_v2\verify_all.js"
   ```
