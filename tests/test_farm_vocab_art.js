/**
 * tests/test_farm_vocab_art.js — every harvest word on Units 11, 13, 15 and
 * TOPIK II has to resolve through the shipped vocab lookup to a PNG on disk.
 *
 * The farm overlay uses vocabIconHtml / vocabArtFile. A word with only a hint
 * emoji never gets an <img>. This suite loads the same three tables the
 * page loads (vocabArt.js, vocabArtUnit14.js, vocabArtMore.js) and checks
 * every unique ko in those four world files.
 *
 * Run: node tests/test_farm_vocab_art.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const WORLDS = ['2b-unit-10', '2b-unit-11', '2b-unit-13', '2b-unit-14', '2b-unit-15', 'topik-2'];

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL: ' + msg);
    process.exit(1);
  }
  console.log('ok  ' + msg);
}

const vocabArt = fs.readFileSync(path.join(ROOT, 'js', 'vocabArt.js'), 'utf8');
const unit14 = fs.readFileSync(path.join(ROOT, 'js', 'vocabArtUnit14.js'), 'utf8');
const more = fs.readFileSync(path.join(ROOT, 'js', 'vocabArtMore.js'), 'utf8');
const vctx = {};
vm.runInNewContext(
  vocabArt + '\n' + unit14 + '\n' + more + '\nthis.ROWS = VOCAB_ART_ROWS;',
  vctx
);
assert(Array.isArray(vctx.ROWS) && vctx.ROWS.length > 0, 'shipped VOCAB_ART_ROWS loads');

const gaps = [];
WORLDS.forEach((id) => {
  const world = JSON.parse(fs.readFileSync(path.join(ROOT, 'worlds', id + '.json'), 'utf8'));
  const words = (world.level && world.level.words) || [];
  const seen = new Set();
  let have = 0;
  words.forEach((word) => {
    if (!word || !word.ko || seen.has(word.ko)) return;
    seen.add(word.ko);
    const row = vctx.ROWS.find((r) => r && r.ko === word.ko);
    if (!row) {
      gaps.push(id + ' missing lookup for ' + word.ko);
      return;
    }
    const png = path.join(ROOT, 'sprites', row.folder, row.slug + '.png');
    if (!fs.existsSync(png)) {
      gaps.push(id + ' ' + word.ko + ' points at missing ' + row.folder + '/' + row.slug + '.png');
      return;
    }
    have++;
  });
  assert(have === seen.size, id + ' harvest kos all have on-disk still-icons (' + have + '/' + seen.size + ')');
});

assert(gaps.length === 0, 'no farm vocab art gaps' + (gaps.length ? ': ' + gaps.slice(0, 8).join('; ') : ''));

['sun_icon', 'newspaper', 'vitamin_bottle', 'justice_scales', 'crescent_moon',
  'desk_globe', 'leather_wallet', 'lit_candle', 'schoolhouse', 'red_heart',
  'silver_mic', 'balcony_rail', 'line_graph', 'fridge', 'hardcover_book',
  'cinema_house', 'homework_notebook', 'trash_bag', 'farm_dog', 'estate_broker']
  .forEach((slug) => {
    assert(fs.existsSync(path.join(ROOT, 'sprites', 'items', slug + '.png')),
      'items/' + slug + '.png exists');
  });

function rowFor(ko) {
  return vctx.ROWS.find((r) => r && r.ko === ko);
}

const DUMP = ['kinds_types', 'red_heart', 'light_bulb', 'restaurant_staff', 'balcony_rail'];
['개', '바나나', '책', '냉장고', '열차', '극장', '그래프', '프랑스', '파리', '한강',
  '숙제', '쓰레기', '고시원', '중개인'].forEach((ko) => {
  const row = rowFor(ko);
  assert(!!row, 'concrete noun maps ' + ko);
  assert(DUMP.indexOf(row.slug) < 0, ko + ' is not a dump slug (got ' + (row && row.slug) + ')');
  assert(fs.existsSync(path.join(ROOT, 'sprites', row.folder, row.slug + '.png')),
    ko + ' still-icon exists');
});
assert(rowFor('고시원').slug === 'studio_oneroom', '고시원 maps to studio_oneroom');
assert(rowFor('중개인').slug === 'estate_broker', '중개인 maps to estate_broker');
assert(rowFor('열차').slug === 'subway_station', '열차 maps to subway_station');
assert(rowFor('바나나').slug === 'farm_apple', '바나나 maps to farm_apple');
assert(rowFor('프랑스').slug === 'desk_globe', '프랑스 maps to desk_globe');
assert(rowFor('파리').slug === 'desk_globe', '파리 maps to desk_globe');
assert(rowFor('한강').slug === 'desk_globe', '한강 maps to desk_globe');
assert(rowFor('낮다').slug !== 'sun_icon', '낮다 does not share the sun slug');

const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'sprites', 'catalog.json'), 'utf8'));
const econ = fs.readFileSync(path.join(ROOT, 'js', 'systems', 'economy.js'), 'utf8');
assert(catalog.cacheKey === 'art-20260827g', 'catalog cacheKey is art-20260827g');
assert(econ.indexOf("ART_CACHE_KEY = 'art-20260827g'") >= 0, 'economy cache key is art-20260827g');

console.log('\ntest_farm_vocab_art: all passed');
