'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL: ' + msg);
    process.exit(1);
  }
  console.log('ok  ' + msg);
}

const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'sprites', 'catalog.json'), 'utf8'));
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const ui = fs.readFileSync(path.join(ROOT, 'js', 'ui.js'), 'utf8');
const overlays = fs.readFileSync(path.join(ROOT, 'js', 'overlays.js'), 'utf8');
const trophyArt = fs.readFileSync(path.join(ROOT, 'js', 'trophyArt.js'), 'utf8');
const vocabArt = fs.readFileSync(path.join(ROOT, 'js', 'vocabArt.js'), 'utf8');
const vocabArtUnit14 = fs.readFileSync(path.join(ROOT, 'js', 'vocabArtUnit14.js'), 'utf8');
const vocabArtMore = fs.readFileSync(path.join(ROOT, 'js', 'vocabArtMore.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'css', 'game.css'), 'utf8');
const econ = fs.readFileSync(path.join(ROOT, 'js', 'systems', 'economy.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'js', 'manifest.json'), 'utf8'));

assert(manifest.indexOf('js/trophyArt.js') >= 0, 'manifest lists trophyArt.js');
assert(html.indexOf('js/trophyArt.js') >= 0, 'index.html loads trophyArt.js');
assert(trophyArt.indexOf('function trophyIconHtml') >= 0, 'trophyIconHtml is shipped');
assert(trophyArt.indexOf('function crateIconHtml') >= 0, 'crateIconHtml is shipped');
assert(overlays.indexOf('trophyIconHtml(t.id') >= 0, 'trophy cards use trophyIconHtml');
assert(ui.indexOf('vocabIconHtml') >= 0 && ui.indexOf('crateIconHtml') >= 0, 'inventory uses vocab + crate art');
assert(ui.indexOf('setInventoryTab') >= 0, 'inventory has crop/dish tabs');
assert(html.indexOf('data-inv-tab="ingredients"') >= 0, 'inventory Crops tab is in HTML');
assert(overlays.indexOf('recipe-pantry-chip') >= 0, 'recipe pantry uses icon chips');
assert(overlays.indexOf('art(r.name, r.icon, 48)') >= 0, 'recipe cards use dish art');
assert(html.indexOf('>Inventory</div>') >= 0, 'inventory title is Inventory');
assert(html.indexOf('Korean Recipe Book') >= 0, 'recipe book title is Korean Recipe Book');
assert(css.indexOf('.trophy-art-icon') >= 0, 'trophy art CSS exists');
assert(css.indexOf('.recipe-req-chip') >= 0, 'recipe ingredient chip CSS exists');

const ctx = { console };
vm.createContext(ctx);
vm.runInContext(
  'function artUrl(f){ return "sprites/"+f+"?v=x"; }\n' + trophyArt,
  ctx
);
['bronze_apple', 'silver_spade', 'gold_tractor', 'diamond_crown', 'master_scholar', 'master_chef']
  .forEach((id) => {
    const htmlIcon = vm.runInContext('trophyIconHtml("' + id + '", "?", 48)', ctx);
    assert(htmlIcon.indexOf('<img') >= 0 && htmlIcon.indexOf('trophy_') >= 0,
      'trophyIconHtml(' + id + ') returns an img');
  });
assert(vm.runInContext('crateIconHtml(28)', ctx).indexOf('wooden_crate.png') >= 0,
  'empty inventory slot uses the crate sprite');

const trophies = (catalog.assets || []).filter((a) => a && a.family === 'trophy-icons');
assert(trophies.length === 6, 'catalog has 6 trophy plaques (got ' + trophies.length + ')');
trophies.forEach((a) => {
  assert(fs.existsSync(path.join(ROOT, 'sprites', a.path)), a.path + ' exists');
});

const vctx = {};
vm.runInNewContext(vocabArt + '\nthis.ROWS = VOCAB_ART_ROWS;', vctx);
['김치', '불고기', '떡볶이', '해물파전', '잡채', '김밥', '옥수수', '딸기', '사과', '꿀', '연어', '새우',
  '고등어', '잉어', '황금물고기', '오징어', '문어', '조개',
  '옥수수구이', '무밥', '딸기잼', '감자전', '궁중 삼계탕', '꿀약과', '꿀차']
  .forEach((ko) => {
    const row = vctx.ROWS.find((r) => r && r.ko === ko);
    assert(!!row, 'vocab art maps ' + ko);
    assert(fs.existsSync(path.join(ROOT, 'sprites', row.folder, row.slug + '.png')),
      row.folder + '/' + row.slug + '.png exists');
  });

const uniqueBySlug = {};
['연어', '고등어', '잉어', '황금물고기', '새우', '오징어', '문어', '조개'].forEach((ko) => {
  const row = vctx.ROWS.find((r) => r && r.ko === ko);
  assert(!!row, 'fish vocab maps ' + ko);
  assert(!uniqueBySlug[row.slug], ko + ' does not share slug ' + row.slug);
  uniqueBySlug[row.slug] = ko;
});
assert(vctx.ROWS.find((r) => r.ko === '옥수수구이').slug === 'roasted_corn',
  'roasted corn is not the raw cob');

const vctxAll = {};
vm.runInNewContext(
  vocabArt + '\n' + vocabArtUnit14 + '\n' + vocabArtMore + '\nthis.ROWS = VOCAB_ART_ROWS;',
  vctxAll
);
['2b-unit-11', '2b-unit-13', '2b-unit-15', 'topik-2'].forEach((id) => {
  const world = JSON.parse(fs.readFileSync(path.join(ROOT, 'worlds', id + '.json'), 'utf8'));
  const seen = new Set();
  const gaps = [];
  ((world.level && world.level.words) || []).forEach((word) => {
    if (!word || !word.ko || seen.has(word.ko)) return;
    seen.add(word.ko);
    const row = vctxAll.ROWS.find((r) => r && r.ko === word.ko);
    if (!row) {
      gaps.push(word.ko);
      return;
    }
    if (!fs.existsSync(path.join(ROOT, 'sprites', row.folder, row.slug + '.png'))) {
      gaps.push(word.ko + ' png');
    }
  });
  assert(gaps.length === 0, id + ' farm kos resolve to on-disk still-icons (' + seen.size + ')');
});

assert(econ.indexOf("ART_CACHE_KEY = 'art-20260827e'") >= 0, 'economy cache key matches the new art batch');
assert(catalog.cacheKey === 'art-20260827e', 'catalog cacheKey is art-20260827e');

console.log('\ntest_panel_art: all passed');
