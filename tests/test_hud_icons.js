'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'sprites', 'catalog.json'), 'utf8'));
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const hudArt = fs.readFileSync(path.join(ROOT, 'js', 'hudArt.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'css', 'game.css'), 'utf8');
const ui = fs.readFileSync(path.join(ROOT, 'js', 'ui.js'), 'utf8');

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL: ' + msg);
    process.exit(1);
  }
  console.log('ok  ' + msg);
}

assert(html.indexOf('unit-notebook') < 0, 'notebook overlay and HUD button are gone');
assert(html.indexOf('unit10-mindmap') < 0, 'mindmap jpg is not referenced from index.html');
assert(ui.indexOf('renderUnitNotebook') < 0 && ui.indexOf('openUnitNotebook') < 0, 'notebook JS is gone');
assert(css.indexOf('#unit-notebook-overlay') < 0 && css.indexOf('.unb-tab') < 0, 'notebook CSS is gone');
assert(hudArt.indexOf("HUD_ART_FOLDER = 'ui'") >= 0, 'HUD art folder is ui');
assert(hudArt.indexOf('function hudIconHtml') >= 0, 'hudIconHtml helper exists');
assert(hudArt.indexOf('function paintHudIcons') >= 0, 'paintHudIcons helper exists');

['vocab', 'shop', 'bag', 'more', 'menu', 'coin', 'gem', 'honor', 'sprout',
  'quest', 'cook', 'recipe', 'audio', 'save', 'progress', 'ranks', 'fish', 'trophy'
].forEach((id) => {
  assert(html.indexOf('data-hud-icon="' + id + '"') >= 0, 'HUD wires ' + id);
});
['Quests', 'Cooking', 'Recipes', 'Audio', 'Progress', 'Ranks', 'Fish', 'Trophies']
  .forEach((label) => {
    assert(html.indexOf('data-hud-label="' + label + '"') >= 0, 'More menu labels ' + label);
  });
// Save left the More menu for the action row, so it is an icon-only button beside Inventory
// rather than a labelled overflow row. Asserted positionally: the point of the move is that
// saving is one click from the bag, not two clicks behind the ⋯.
const actionRow = html.slice(html.indexOf('id="hud-actions-group"'), html.indexOf('id="hud-overflow-menu"'));
assert(actionRow.indexOf('id="save-btn"') >= 0, 'Save is a top-level HUD button');
assert(actionRow.indexOf('id="inventory-btn"') < actionRow.indexOf('id="save-btn"')
  && actionRow.indexOf('id="save-btn"') < actionRow.indexOf('id="hud-more-btn"'),
  'Save sits between Inventory and More');
assert(html.indexOf('data-hud-label="Save"') < 0, 'Save no longer renders an overflow label');

// Save is the one HUD icon a click rewrites: saveAllGame() swaps in ⏳/✅/⚠ as status and
// then restores. The restore used to assign textContent, which drops the <img> the boot
// paint installed — so one save left an emoji sitting beside the inventory basket's pixel
// art for the rest of the session, with nothing to repaint the bar again. The restore must
// repaint, and must do so before any emoji fallback.
const economy = fs.readFileSync(path.join(ROOT, 'js', 'systems', 'economy.js'), 'utf8');
const saveFn = economy.slice(economy.indexOf('async function saveAllGame('),
  economy.indexOf('function initSave('));
assert(saveFn.length > 0, 'saveAllGame is where the save button is repainted');
const restoreSrc = saveFn.slice(saveFn.indexOf('const restore = ()'), saveFn.indexOf('let res;'));
assert(restoreSrc.indexOf('paintHudIcons()') >= 0, 'the save button restore repaints the HUD art');
// The precise shape of the old bug: the repaint sat inside an `inMenu &&` branch, so the
// HUD-bar placement — the one the button actually has — fell through to the emoji. Ordering
// alone does not catch that, since the broken version also named paintHudIcons first. What
// has to hold is that nothing gates the repaint on the placement.
const beforeRepaint = restoreSrc.slice(0, restoreSrc.indexOf('paintHudIcons()'));
assert(beforeRepaint.indexOf('inMenu') < 0,
  'and the repaint is not gated on inMenu — the HUD-bar button must reach it too');
assert(html.indexOf('data-hud-icon="duel"') < 0, 'Duel HUD button is gone');
assert(html.indexOf('duel-overlay') < 0, 'Duel overlay is gone');
assert(hudArt.indexOf("id: 'duel'") < 0, 'HUD art table has no duel row');
assert(css.indexOf('#progress-title') >= 0 && css.indexOf('#4a2a0d') >= 0, 'progress title uses dark ink');
assert(css.indexOf('.lb-title') >= 0 && css.indexOf('.lb-pb-chip') >= 0, 'ranks panel uses ink-on-parchment chips');
assert(css.indexOf('.hud-overflow-label') >= 0, 'overflow label style exists');
assert(css.indexOf('.hud-btn:not(.hud-overflow-item)') >= 0, 'circle size does not clip More rows');

// The status group holds the level name, the XP bar and the amber reviews-due badge. It was
// the only group allowed to shrink, and `min-width: 0` removed its content floor, so on a
// ~1035px window it was handed less width than its children needed and the badge spilled out
// and painted itself over the rank chip in the next group. These three rules are the fix:
// the spill can only clip inside the group, the badge itself never shrinks, and the currency
// group beside it gives ground rather than holding its full width no matter what.
const statusRule = css.slice(css.indexOf('#hud-status-group {'), css.indexOf('#hud-due, #hud-progress'));
assert(statusRule.indexOf('#hud-status-group {') === 0, 'the status group rule is in css/game.css');
assert(/overflow:\s*hidden/.test(statusRule), 'a squeezed status group clips rather than reaching its neighbour');
assert(/#hud-due[^{]*\{[^}]*flex:\s*0 0 auto/.test(css), 'the reviews-due badge is never shrunk');
const currencyRule = css.slice(css.indexOf('#hud-currency-group {'), css.indexOf('#hud-currency-group >'));
assert(currencyRule.indexOf('#hud-currency-group {') === 0, 'the currency group rule is in css/game.css');
assert(/flex-shrink:\s*1/.test(currencyRule), 'the currency group yields width instead of forcing the spill');

const hud = (catalog.assets || []).filter((a) => a && a.kind === 'ui' && a.family === 'hud-icons');
assert(hud.length === 19, 'catalog has 19 HUD glyphs (got ' + hud.length + ')');
hud.forEach((a) => {
  const png = path.join(ROOT, 'sprites', a.path);
  assert(fs.existsSync(png), a.path + ' exists');
});
assert(typeof catalog.cacheKey === 'string' && catalog.cacheKey.indexOf('art-') === 0,
  'catalog cacheKey is an art token');

console.log('\ntest_hud_icons: all passed');
