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
assert(rowFor('고시원').slug === 'gosiwon_room', '고시원 shows a small room for study and sleep');
assert(rowFor('중개인').slug === 'estate_broker', '중개인 maps to estate_broker');
assert(rowFor('열차').slug === 'passenger_train', '열차 shows a train rather than a station entrance');
assert(rowFor('바나나').slug === 'banana_bunch', '바나나 has an actual banana illustration');
assert(rowFor('바나나').slug !== rowFor('사과').slug, 'banana and apple have different subjects');
assert(rowFor('프랑스').slug === 'france_flag', '프랑스 has its national flag');
assert(rowFor('파리').slug === 'paris_eiffel_tower', '파리 has a recognizable Paris landmark');
assert(rowFor('한강').slug === 'han_river', '한강 has a river illustration');
assert(new Set(['프랑스', '파리', '한강', '세계'].map((ko) => rowFor(ko).slug)).size === 4,
  'France, Paris, the Han River and the world are visually distinct');
assert(rowFor('젓다').slug === 'stir_drink', '젓다 shows the stirring action');
assert(rowFor('낮다').slug !== 'sun_icon', '낮다 does not share the sun slug');

['엿', '떡', '선물', '꽃병', '개나리', '꽃', '책상', '어머니', '대학교',
  '입사 시험', '한국', '생산량', '-도록'].forEach((ko) => {
  const row = rowFor(ko);
  assert(!!row, 'new TOPIK word maps ' + ko);
  assert(DUMP.indexOf(row.slug) < 0, ko + ' is not a dump slug (got ' + (row && row.slug) + ')');
  assert(fs.existsSync(path.join(ROOT, 'sprites', row.folder, row.slug + '.png')),
    ko + ' still-icon exists');
});
assert(rowFor('엿').slug === 'yeot_taffy', '엿 maps to yeot_taffy');
assert(rowFor('떡').slug === 'white_tteok', '떡 maps to white_tteok');
assert(rowFor('선물').slug === 'wrapped_gift', '선물 maps to wrapped_gift');
assert(rowFor('꽃병').slug === 'celadon_vase', '꽃병 maps to celadon_vase');
assert(rowFor('개나리').slug === 'forsythia_spray', '개나리 maps to forsythia_spray');
assert(rowFor('꽃').slug === 'pink_blossom', '꽃 maps to pink_blossom');
assert(rowFor('책상').slug === 'wooden_study_desk', '책상 maps to wooden_study_desk');
assert(rowFor('어머니').slug === 'mother_portrait', '어머니 maps to mother_portrait');
assert(rowFor('대학교').slug === 'campus_building', '대학교 maps to campus_building');
assert(rowFor('입사 시험').slug === 'exam_papers', '입사 시험 maps to exam_papers');
assert(rowFor('한국').slug === 'our_country', '한국 maps to our_country');
assert(rowFor('생산량').slug === 'topik_fruit_output', '생산량 maps to topik_fruit_output');
assert(rowFor('-도록').slug !== 'kinds_types', '-도록 is not the pizza dump');

// These words were specifically redesigned after the visual audit. A different
// filename alone is insufficient: catch copied files as well as reused paths.
const { auditVocabArt } = require('../scripts/audit_vocab_art');
const dailyWords = ['걷다', '발', '편하다', '가볍다', '선풍기', '틀다', '켜다',
  '더럽다', '이불', '맡기다', '세탁소', '달리다', '바로', '활기차다'];
const dailyAudit = auditVocabArt(ROOT, { words: dailyWords });
assert(dailyAudit.words === 14 && dailyAudit.uniqueImages === 14, 'the uniqueness audit actually examines all 14 images');
assert(dailyAudit.structurallyUnique, 'all 14 daily-life words have distinct on-disk images, including file contents');
dailyWords.forEach((ko) => {
  const row = rowFor(ko);
  const otherWords = vctx.ROWS.filter((r) => r.ko !== ko && r.folder === row.folder && r.slug === row.slug);
  assert(otherWords.length === 0, ko + ' illustration is not borrowed by another word');
});
assert(rowFor('설탕').slug === 'sugar_bowl', 'sugar uses the sugar bowl rather than an ornament');
assert(rowFor('소금').slug === 'salt_shaker', 'salt uses the salt shaker rather than an ornament');

const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'sprites', 'catalog.json'), 'utf8'));
const econ = fs.readFileSync(path.join(ROOT, 'js', 'systems', 'economy.js'), 'utf8');
assert(!!catalog.cacheKey, 'the art catalog has a cache key');
assert(econ.includes("ART_CACHE_KEY = '" + catalog.cacheKey + "'"), 'runtime and catalog use the same art cache key');

console.log('\ntest_farm_vocab_art: all passed');
