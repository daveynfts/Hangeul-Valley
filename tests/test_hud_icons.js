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
['Quests', 'Cooking', 'Recipes', 'Audio', 'Save', 'Progress', 'Ranks', 'Fish', 'Trophies']
  .forEach((label) => {
    assert(html.indexOf('data-hud-label="' + label + '"') >= 0, 'More menu labels ' + label);
  });
assert(html.indexOf('data-hud-icon="duel"') < 0, 'Duel HUD button is gone');
assert(html.indexOf('duel-overlay') < 0, 'Duel overlay is gone');
assert(hudArt.indexOf("id: 'duel'") < 0, 'HUD art table has no duel row');
assert(css.indexOf('#progress-title') >= 0 && css.indexOf('#4a2a0d') >= 0, 'progress title uses dark ink');
assert(css.indexOf('.lb-title') >= 0 && css.indexOf('.lb-pb-chip') >= 0, 'ranks panel uses ink-on-parchment chips');
assert(css.indexOf('.hud-overflow-label') >= 0, 'overflow label style exists');
assert(css.indexOf('.hud-btn:not(.hud-overflow-item)') >= 0, 'circle size does not clip More rows');

const hud = (catalog.assets || []).filter((a) => a && a.kind === 'ui' && a.family === 'hud-icons');
assert(hud.length === 19, 'catalog has 19 HUD glyphs (got ' + hud.length + ')');
hud.forEach((a) => {
  const png = path.join(ROOT, 'sprites', a.path);
  assert(fs.existsSync(png), a.path + ' exists');
});
assert(typeof catalog.cacheKey === 'string' && catalog.cacheKey.indexOf('art-') === 0,
  'catalog cacheKey is an art token');

console.log('\ntest_hud_icons: all passed');
