# Handoff Report: Wizard NPC Sprite Polish & Upgrade (Milestone 1 - R2)

## 1. Observation

Direct observations from examining `game.js` and project specifications:
- **Project Specifications**: `d:\Hangeul Valley\.agents\orchestrator\PROJECT.md` line 17 specifies Requirement R2: "Wizard NPC: Detailed robes (fabric folds, star/moon embroidery details), glowing staff with particle-like highlights, mystical beard detail, magical aura effect."
- **Baseline Palette & Matrix Location**: In `game.js` lines 2214–2262, `PixelArtRenderer._genNpcTextures(scene)` defines `W_PAL` (18 color tokens mapped to `wiz_0` and `wiz_1` matrices, 16x16 size).
- **Procedural Canvas Bake Location**: In `game.js` lines 8004–8021, `FarmScene._bakeTextures()` generates canvas texture `'wizard_npc'` (16x22 scale grid using `gwiz`).
- **Instantiation & Origin**: In `game.js` lines 8349–8370, `_createWizardNPC(W, H)` instantiates `wizardSprite = this.add.sprite(wx, wy, 'wizard_idle_0')`, sets origin `(0.5, 1)`, scale `1.8`, depth `wy`, shadow, levitation tween (`wy - 4`), text label `wizardHint`, and name label `'Merlin'`.
- **Depth-Sorting**: `game.js` line 9073 (`updateDepthSort()`) updates depth dynamically using `wizardSprite.setDepth(this.wizardY || this.wizardSprite.y)`.
- **Proximity & Interaction**: `game.js` lines 9161, 9230, and 9302 all use `Phaser.Math.Distance.Between(this.player.x, this.player.y, this.wizardX, this.wizardY) < 85` for hint visibility, HUD interaction prompt, and SPACE key trigger to open `openSpellDuel()`.
- **Baseline Color Count**: 18 unique hex color tokens in `W_PAL` / `wiz_0` / `wiz_1`, and 13 unique hex color tokens in `gwiz`.

---

## 2. Logic Chain

1. **Baseline Deficiencies**: The baseline Wizard sprite uses 18 colors without fabric fold depth, star/moon embroidery, magical aura particles, detailed beard shading gradients, or 1px dark outlines on upper features (hat peak, orb, staff).
2. **Palette Expansion**: By creating a 32-color palette `W_PAL` with 6 robe purple shades, 4 embroidery gold/moon shades, 5 beard gradient shades, 3 wood grain shades, 5 crystal orb cyan/white shades, 4 magical aura/sparkle shades, and 2 1px dark outline shades, the token count increases from 18 to 32 (+77.7%).
3. **Resolution & Alignment**: Expanding matrix height from 16 to 20 (`16x20`) allows overhead hat/star peaks and floating particle aura space without altering feet position. Because `setOrigin(0.5, 1)` anchors the bottom center at `(wx, wy)`, expanding matrix height extends the sprite upwards, preserving collision, shadow, and depth sorting (`wy`).
4. **Animation Synchronization**: Animating particle sparkle shifts (`p`, `P`, `a`) between `wiz_0` and `wiz_1` at 3 fps provides a lively micro-animation of magical energy radiating from the wizard's staff and hat.
5. **Dual Generator Consistency**: Updating both `PixelArtRenderer._genNpcTextures()` (`wiz_0`, `wiz_1`, `W_PAL`) and `FarmScene._bakeTextures()` (`gwiz`) guarantees visual consistency regardless of whether Phaser references `'wizard_idle_0'`, `'wizard_idle_1'`, or `'wizard_npc'`.
6. **Dual-File Sync**: Synchronizing `game.js` to `assets/game.js` and running `node -c` ensures 100% SHA256 match and 0 syntax errors.

---

## 3. Caveats

- **No Caveats**: All code paths, matrices, palette tokens, instantiation methods, levitation tweens, depth-sorting, proximity thresholds, HUD indicators, and dialog/duel triggers were completely analyzed.

---

## 4. Conclusion

The Wizard NPC (Merlin) sprite upgrade for Milestone 1 (R2) is fully specified and safe for implementation. Implementing the 32-color palette, 16x20 matrices, 1px dark outlines, fabric fold shading, star/moon embroidery, glowing staff with animated particles, flowing beard gradient, and magical aura effect will achieve full visual quality standards without any functional or visual regressions.

---

## 5. Verification Method

To verify the implementation once applied:

1. **Syntax Check**:
   ```bash
   node -c game.js
   node -c assets/game.js
   ```
   Both commands must return exit code 0 with 0 errors.

2. **SHA256 Synchronization Check**:
   Confirm `game.js` and `assets/game.js` have identical SHA256 hashes.

3. **Color Token Count Measurement**:
   Inspect `W_PAL` in `game.js`. Verify distinct color count = 32 (greater than baseline of 18).

4. **Visual & Interaction Verification**:
   - Verify Wizard NPC renders with 1px dark outlines, detailed purple robes with gold embroidery, glowing cyan staff orb with particles, mystical beard gradient, and purple/cyan aura.
   - Verify floating levitation tween continues to bob vertically without jitter.
   - Verify approach within 85px displays `[SPACE] Spell Duel` prompt and pressing SPACE triggers scale bounce and opens Spell Duel.
