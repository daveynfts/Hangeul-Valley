'use strict';
/**
 * tests/test_unit17_world.js — 2B Unit 17 (비행기를 놓칠 뻔했어요): the map, the word list,
 * and the twenty-four headwords it had to hand back.
 *
 * Unit 17 is the chapter about things going wrong, and things go wrong in every chapter.
 * 넘어지다, 지갑, 여권, 앉다 and 노트북 are Unit 14's, off its own 어휘 pages; 달리다 and
 * 동호회 are Unit 11's; 어울리다, 광고 and 연락하다 are Unit 13's; 편리하다 is Unit 15's;
 * 갖다 주다 is Unit 10's; and 놓치다, 바닥, 색깔, 걸리다, 두다, 상황, 티셔츠, 세탁소,
 * 도서관 and 카메라 are all already in the exam world. SRS state is keyed by the Korean, so
 * a headword owned twice is one review schedule shared between two farms with nothing on
 * screen to say so, and the rule has been that the earlier unit keeps it.
 *
 * Handing a word back quietly is how a chapter ends up teaching less than it prints, so
 * each one is asserted twice: that Unit 17 leaves it alone, and that the unit it was left
 * to still has it. Where 17과's own pages print a longer collocation — 비행기를 놓치다,
 * 벽에 걸려 있다, 하얀색 티셔츠 — that is what this farm takes instead, and section 5 checks
 * the substitute is here as well as that the original is not.
 *
 * The rest is the shape every world file has to hold:
 *
 *   1. The list is the whole chapter, not its 어휘 pages. A third of Unit 17's vocabulary
 *      is in the footnote glossaries, the 읽기 notice on p.194, the 문화 산책 on p.197 and
 *      the two 듣기 지문 at the back of the book (printed p.265).
 *   2. Every example is a sentence printed in 17과, and provable: the repo's own
 *      sentenceUses() is what validate_content runs, so it is what runs here.
 *   3. The unit is playable before a single icon is drawn — a hint emoji on every word.
 *
 * Run: node tests/test_unit17_world.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const world = JSON.parse(read(path.join('worlds', '2b-unit-17.json')));
const lvl = world.level || {};
const words = lvl.words || [];
const mine = new Set(words.map((w) => w.ko));

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

console.log('====================================================');
console.log('2B UNIT 17 · 17과 비행기를 놓칠 뻔했어요');
console.log('====================================================');

// ── 1. The world file ────────────────────────────────────────────────────────
console.log('\n--- 1. The world file ---');
assert(world.id === '2b-unit-17', 'the world names itself');
assert(world.pack === 'snu-2b', 'and belongs to the 2B pack');
assert(world.titleKo === '17과 비행기를 놓칠 뻔했어요', 'the Korean title is the chapter’s own');
assert(/Unit 17/.test(world.source || ''), 'and it says which book it came from');
assert(lvl.worldId === '2b-unit-17' && lvl.world === true, 'the level is a world, not a valley level');
assert(lvl.level === '2B-17', 'and is numbered 2B-17');
assert(lvl.target === 9, 'nine harvests clear it, the same as every other 2B chapter');

// ── 2. The map is the basic farm plus two stations ───────────────────────────
console.log('\n--- 2. The map ---');
assert(JSON.stringify(lvl.map) === JSON.stringify({ extras: [], stations: ['desk', 'cassette'] }),
  'the farm carries a study desk and a cassette player and nothing else: ' + JSON.stringify(lvl.map));
const econ = read(path.join('js', 'systems', 'economy.js'));
assert(/'2b-unit-17': \{ extras: \[\], stations: \['desk', 'cassette'\] \}/.test(econ),
  'and the runtime pack agrees');

// ── 3. The word list is the whole chapter ────────────────────────────────────
console.log('\n--- 3. The word list ---');
assert(words.length === 126, '126 headwords (found ' + words.length + ')');
const GROUPS = {
  '사고': 19, '색과 무늬': 30, '문법과 표현': 19, '말하기': 17,
  '듣고 말하기': 15, '읽고 쓰기': 11, '과제': 3, '문화와 발음': 12
};
const counts = {};
words.forEach((w) => { counts[w.category] = (counts[w.category] || 0) + 1; });
assert(Object.keys(counts).join('|') === Object.keys(GROUPS).join('|'),
  'eight groups, in the order the chapter prints its sections (' + Object.keys(counts).join(', ') + ')');
const offBy = Object.keys(GROUPS).filter((k) => counts[k] !== GROUPS[k])
  .map((k) => k + ' ' + counts[k] + '≠' + GROUPS[k]);
assert(offBy.length === 0, 'and each holds what it should' + (offBy.length ? ' — ' + offBy.join(', ') : ''));
// A third of the list is not on the 어휘 pages at all, which is the point of harvesting the
// whole chapter rather than its vocabulary spread.
const beyondVocab = words.filter((w) => w.category !== '사고' && w.category !== '색과 무늬').length;
assert(beyondVocab === 77, '77 of the 126 come from outside the 어휘 pages (found ' + beyondVocab + ')');
const dup = Object.entries(words.reduce((a, w) => { a[w.ko] = (a[w.ko] || 0) + 1; return a; }, {}))
  .filter(([, n]) => n > 1).map(([k]) => k);
assert(dup.length === 0, 'no headword appears twice' + (dup.length ? ' — ' + dup.join(', ') : ''));
const noEn = words.filter((w) => !w.en || !w.categoryEn).map((w) => w.ko);
assert(noEn.length === 0, 'every word carries English and an English group name'
  + (noEn.length ? ' — ' + noEn.slice(0, 4).join(', ') : ''));

// ── 4. The four grammar points ───────────────────────────────────────────────
console.log('\n--- 4. The grammar the chapter is for ---');
['V-아다/어다 주다', 'V-(으)ㄹ 뻔하다', 'V-아/어 있다'].forEach((g) => {
  assert(mine.has(g), 'the list farms ' + g);
});
// The fourth point is a class of stems rather than an ending, so it is farmed as the stems.
const HSTEMS = ['빨갛다', '노랗다', '파랗다', '까맣다', '하얗다'];
assert(HSTEMS.every((k) => mine.has(k)),
  'and the ㅎ-irregular as all five of its colour stems (' + HSTEMS.filter((k) => !mine.has(k)).join(', ') + ')');
// The 발음 page is the other half of 유음화, and its three printed examples are here.
assert(['한라산', '편리하다', '연락처'].every((k) => mine.has(k) || mine.has('지하철이 편리하다')),
  'the three 유음화 words the 발음 page prints are in the list');

// ── 5. No word leaks between units ───────────────────────────────────────────
console.log('\n--- 5. No word leaks between units ---');
const owner = new Map();
['2b-unit-10', '2b-unit-11', '2b-unit-12', '2b-unit-13', '2b-unit-14', '2b-unit-15',
  '2b-unit-16', 'topik-2'].forEach((other) => {
    const f = path.join(ROOT, 'worlds', other + '.json');
    if (!fs.existsSync(f)) { assert(false, other + '.json is on disk'); return; }
    const o = JSON.parse(fs.readFileSync(f, 'utf8'));
    const lvls = Array.isArray(o.level) ? o.level : [o.level];
    const theirs = new Set();
    lvls.forEach((l) => ((l && l.words) || []).forEach((x) => { if (x && x.ko) theirs.add(x.ko); }));
    theirs.forEach((k) => { if (!owner.has(k)) owner.set(k, other); });
    const shared = [...theirs].filter((k) => mine.has(k));
    assert(shared.length === 0, 'Unit 17 shares no headword with ' + other
      + (shared.length ? ' — ' + shared.join(', ') : ''));
  });
assert(owner.size > 1500, 'the other worlds between them own ' + owner.size + ' headwords');

// Every bare word 17과 uses that somebody else already farms, with what 17과 takes instead.
// Asserted three ways: this unit does not have the bare word, the named unit still does, and
// the substitute really is on this list — so a later edit cannot quietly drop either half.
const INSTEAD = [
  ['놓치다', 'topik-2', '비행기를 놓치다'],
  ['넘어지다', '2b-unit-14', '계단에서 넘어지다'],
  ['바닥', 'topik-2', '바닥에 떨어뜨리다'],
  ['지각하다', '2b-unit-14', '지각할 뻔하다'],
  ['색깔', 'topik-2', '머리 색깔'],
  ['걸리다', 'topik-2', '벽에 걸려 있다'],
  ['달리다', '2b-unit-11', '인형이 달려 있다'],
  ['앉다', '2b-unit-14', '교실에 앉아 있다'],
  ['지갑', '2b-unit-14', '지갑을 잃어버리다'],
  ['두다', 'topik-2', '두고 나오다'],
  ['여권', '2b-unit-14', '여권을 가지고 가다'],
  ['상황', 'topik-2', '상황을 설명하다'],
  ['편리하다', '2b-unit-15', '지하철이 편리하다'],
  ['노트북', '2b-unit-14', '노트북이 고장이 나다'],
  ['티셔츠', 'topik-2', '하얀색 티셔츠'],
  ['동호회', '2b-unit-11', '동호회에 가입하다'],
  ['세탁소', 'topik-2', '옷을 찾아다 주다'],
  ['도서관', 'topik-2', '책을 빌려다 주다'],
  ['갖다 주다', '2b-unit-10', '치즈피자를 갖다 주다'],
  ['어울리다', '2b-unit-13', '옷이 어울리다'],
  ['카메라', 'topik-2', '잃어버린 카메라'],
  ['광고', '2b-unit-13', '광고를 만들다'],
  ['연락하다', '2b-unit-13', '연락'],
  ['외출하다', '2b-unit-11', '외출']
];
assert(INSTEAD.length === 24, 'twenty-four words were handed back (' + INSTEAD.length + ')');
INSTEAD.forEach(([bare, unit, sub]) => {
  const ok = !mine.has(bare) && owner.get(bare) === unit && mine.has(sub);
  assert(ok, bare + ' stays with ' + unit + ', and 17과 teaches ' + sub
    + (ok ? '' : ' — ' + (mine.has(bare) ? '17과 has the bare word; ' : '')
      + (owner.get(bare) === unit ? '' : 'owner is ' + (owner.get(bare) || 'nobody') + '; ')
      + (mine.has(sub) ? '' : 'no ' + sub)));
});

// ── 6. The examples are the book's, and provable ─────────────────────────────
console.log('\n--- 6. The examples ---');
const { sentenceUses } = require(path.join(ROOT, 'scripts', 'vocab_examples.js'));
const withEx = words.filter((w) => w.example);
assert(withEx.length === 75, '75 of the 126 carry an example sentence (' + withEx.length + ')');
const unprovable = withEx.filter((w) => !sentenceUses(w.example, w.ko)).map((w) => w.ko);
assert(unprovable.length === 0,
  'and every one of them contains its own headword, by the repo’s own sentenceUses()'
  + (unprovable.length ? ' — ' + unprovable.slice(0, 5).join(', ') : ''));
const noGloss = withEx.filter((w) => !w.exampleEn).map((w) => w.ko);
assert(noGloss.length === 0, 'each example is glossed'
  + (noGloss.length ? ' — ' + noGloss.slice(0, 4).join(', ') : ''));
// The rule that produced this list: a row whose example could not be verified ships with no
// example at all rather than with one nobody checked.
const blankButGlossed = words.filter((w) => !w.example && w.exampleEn).map((w) => w.ko);
assert(blankButGlossed.length === 0, 'and no row carries a gloss for an example it does not have'
  + (blankButGlossed.length ? ' — ' + blankButGlossed.join(', ') : ''));

// ── 7. Playable before any icon is drawn ─────────────────────────────────────
console.log('\n--- 7. Playable before any icon is drawn ---');
const noHint = words.filter((w) => !w.hint).map((w) => w.ko);
assert(noHint.length === 0, 'every word renders as a hint emoji until its illustration exists'
  + (noHint.length ? ' — ' + noHint.slice(0, 5).join(', ') : ''));
const withArt = words.filter((w) => w.art).map((w) => w.ko);
assert(withArt.length === 0, 'and none of them claims artwork that has not been drawn yet'
  + (withArt.length ? ' — ' + withArt.slice(0, 4).join(', ') : ''));

// ── 8. The notebook ──────────────────────────────────────────────────────────
console.log('\n--- 8. The notebook ---');
const nb = world.notebook || {};
assert(/Unit 17/.test(nb.title || ''), 'the notebook names the chapter');
const nbCats = (nb.groups || []).map((g) => g.cat);
assert(nbCats.join('|') === Object.keys(GROUPS).join('|'),
  'and lists the same eight groups in the same order (' + nbCats.join(', ') + ')');
const orphanCat = nbCats.filter((c) => !counts[c]);
assert(orphanCat.length === 0, 'with no group the word list has nothing in'
  + (orphanCat.length ? ' — ' + orphanCat.join(', ') : ''));

// ── 9. The tools that have to know it exists ─────────────────────────────────
console.log('\n--- 9. Wiring ---');
assert(econ.indexOf("file: 'worlds/2b-unit-17.json'") >= 0, 'the world loads at boot');
assert(/function isUnit17World\(\)[\s\S]{0,180}worldId === '2b-unit-17'/.test(econ),
  'isUnit17World is declared and is Unit-17-only');
assert(/id === '2b-unit-17'/.test(econ), 'and the farm gets the desk and the cassette player’s art');
const ui = read(path.join('js', 'ui.js'));
[['desk quiz', 'unit17-desk-quiz'], ['익힘책', 'unit17-workbook'],
  ['교과서', 'unit17-textbook'], ['tape', 'unit17-cassette']].forEach(([label, file]) => {
    assert(ui.indexOf("isUnit17World()) return '/worlds/" + file + ".json'") >= 0,
      'the ' + label + ' resolves to ' + file + '.json');
  });
assert(read(path.join('js', 'i18n.js')).indexOf("'worlds/2b-unit-17.json'") >= 0,
  'the word list is a translatable source');
assert(read(path.join('scripts', 'ttsClips.js')).indexOf("'worlds/2b-unit-17.json'") >= 0,
  'and the TTS harvest knows about it');
assert(read(path.join('admin', 'lib', 'content.js')).indexOf("id: '2b-unit-17'") >= 0,
  'the admin panel can open it');
const { collectUploadFiles } = require(path.join(ROOT, 'scripts', 'r2Content.js'));
const batch = new Set(collectUploadFiles(ROOT).map((x) => x.rel.replace(/\\/g, '/')));
assert(batch.has('worlds/2b-unit-17.json'), 'and the world file publishes');

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_unit17_world: all passed');
