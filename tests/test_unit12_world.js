'use strict';
/**
 * tests/test_unit12_world.js — 2B Unit 12 (저는 좀 조용한 편이에요): the map, the word
 * list, and the way it had to give three headwords up.
 *
 * Unit 12 is the chapter that describes people — a face on p.70, a personality on p.71, a
 * hair salon on p.80 — and that is exactly why it collides with its neighbours more than
 * any unit so far. 키가 크다 is already Unit 10's. 생기다 is already Unit 15's, in its
 * other sense entirely ("to come into being"). SRS state is keyed by the Korean, so a
 * headword owned twice is one review schedule shared between two farms with nothing on
 * screen to say so, and the rule has been that the earlier unit keeps it.
 *
 * Giving a word up quietly is how a chapter ends up teaching less than it prints, so each
 * one is asserted twice here: that Unit 12 still leaves it alone, and that the unit it was
 * left to still has it. The day one of those moves, this suite says so rather than passing
 * because the word is absent from both.
 *
 * The rest is the shape every world file has to hold:
 *
 *   1. The list is the whole chapter, not its 어휘 pages. Half of Unit 12's vocabulary is
 *      in the footnote glossary under each exercise, and the 듣기 지문 at the back of the
 *      book (p.263) is where the hair salon conversation actually is.
 *   2. Every example is a sentence printed in 12과, and provable: the repo's own
 *      sentenceUses() is what validate_content runs, so it is what runs here.
 *   3. The unit is playable before a single icon is drawn — a hint emoji on every word.
 *
 * The banks behind the stations have their own suites — the 익힘책, the 교과서, the 퀴즈 and the
 * cassette each in tests/test_unit12_*.js. What is asserted here is that the farm resolves to
 * the desk and the cassette player, because a world with a station and no bank behind it is a
 * station that silently offers nothing.
 *
 * Run: node tests/test_unit12_world.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readJson = (rel) => JSON.parse(read(rel));
const nfc = (s) => String(s == null ? '' : s).normalize('NFC').trim();

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

const world = readJson('worlds/2b-unit-12.json');
const econ = read('js/systems/economy.js');
const farm = read('js/scenes/farm.js');
const words = world.level.words || [];
const ko = new Set(words.map((w) => nfc(w.ko)));

console.log('====================================================');
console.log('2B UNIT 12 · 저는 좀 조용한 편이에요');
console.log('====================================================');

// ── 1. The world file ────────────────────────────────────────────────────────
console.log('\n--- 1. The world file ---');
assert(world.id === '2b-unit-12', 'world id is 2b-unit-12');
assert(world.pack === 'snu-2b', 'belongs to the SNU 2B pack');
assert(world.level.worldId === '2b-unit-12', 'level carries the same worldId');
assert(world.level.world === true, 'level is flagged as a textbook world');
assert(world.titleKo.indexOf('12과') === 0, 'Korean title opens with the chapter number');
assert(nfc(world.level.name) === nfc('저는 좀 조용한 편이에요'),
  'and names the chapter, which is also its grammar point');
assert(world.level.target === 9, 'harvest target matches the other units');

// ── 2. The map is the basic farm plus two stations ───────────────────────────
console.log('\n--- 2. The map is the basic farm plus two stations ---');
const map = world.level.map;
assert(Array.isArray(map.extras) && map.extras.length === 0,
  'no valley extras — no shop, board, arcade, cat, beehive, portal or pond');
assert(JSON.stringify(map.stations) === JSON.stringify(['desk', 'cassette']),
  'two stations, the study desk and the cassette player (' + JSON.stringify(map.stations) + ')');
assert(map.stations.indexOf('kitchen') < 0 && map.stations.indexOf('taste') < 0,
  'no kitchen and no taste stall — those are Unit 10 minigames');

// ── 3. The word list is the whole chapter ────────────────────────────────────
console.log('\n--- 3. The word list is the whole chapter ---');
assert(words.length === 140, 'the list holds 140 words (' + words.length + ')');
const incomplete = words.filter((w) => !w.ko || !w.en || !w.category || !w.categoryEn).map((w) => w.ko || '?');
assert(incomplete.length === 0,
  'every word has ko / en / category / categoryEn'
  + (incomplete.length ? ' — ' + incomplete.slice(0, 5).join(', ') : ''));
const dups = words.map((w) => nfc(w.ko)).filter((k, i, a) => a.indexOf(k) !== i);
assert(dups.length === 0, 'no headword repeats' + (dups.length ? ' — ' + dups.join(', ') : ''));

// One group per section the chapter teaches vocabulary in. Counts per group are not pinned
// — the split can move — but the sections are, because a missing group is a page of the
// chapter nobody harvested.
const SECTIONS = ['외모', '성격', '미용실', '문법과 표현', '말하기', '읽고 쓰기', '과제', '문화와 발음'];
const byCat = {};
words.forEach((w) => { byCat[w.category] = (byCat[w.category] || 0) + 1; });
SECTIONS.forEach((cat) => assert(byCat[cat] > 0, cat + ' is represented (' + (byCat[cat] || 0) + ' words)'));
assert(Object.keys(byCat).length === SECTIONS.length,
  'and there are no groups beyond the eight sections (' + Object.keys(byCat).join(', ') + ')');
const enByCat = {};
words.forEach((w) => { (enByCat[w.category] = enByCat[w.category] || new Set()).add(w.categoryEn); });
const drifted = Object.entries(enByCat).filter(([, set]) => set.size !== 1).map(([c]) => c);
assert(drifted.length === 0,
  'each group has a single English label' + (drifted.length ? ' — drifted: ' + drifted.join(', ') : ''));

// ── 4. The pages the list was harvested from ─────────────────────────────────
// Named page by page so that a future edit dropping one of them is a deliberate edit to
// this list. The footnote glossaries are the ones worth having here: they are the half of
// the chapter that is easiest to skip, because they are printed in six-point type at the
// bottom of an exercise.
console.log('\n--- 4. The pages the list was harvested from ---');
const FROM_THE_BOOK = {
  '어휘 1 · 외모 (p.70)': ['눈이 크다', '눈이 작다', '눈썹이 진하다', '눈썹이 연하다',
    '쌍꺼풀이 있다', '쌍꺼풀이 없다', '코가 높다', '코가 낮다', '입이 크다', '입이 작다',
    '입술이 두껍다', '입술이 얇다', '이마가 넓다', '이마가 좁다', '어깨가 넓다', '어깨가 좁다',
    '키가 작다'],
  '어휘 2 · 성격 (p.71)': ['활발하다', '내성적이다', '꼼꼼하다', '남성적이다', '여성적이다',
    '성격이 급하다'],
  'A-아/어 보이다 glossary (p.72)': ['날씬하다', '뚱뚱하다'],
  'N처럼[같이] glossary (p.73)': ['모델', '인형', '가수', '수영 선수', '요리사'],
  '말하기 1 glossary (p.74)': ['자매', '닮다', '졸업식', '행복하다', '머리 모양'],
  'A-(으)ㄴ 편이다 glossary (p.76)': ['마르다'],
  'A-게 glossary (p.77)': ['자르다', '시간을 지키다', '정확하다', '글씨'],
  '말하기 2 glossary (pp.78-79)': ['이상형', '외모'],
  '듣고 말하기 glossary (p.80)': ['파마를 하다', '앞머리를 다듬다', '염색을 하다'],
  '듣기 지문 · 미용실 (p.263)': ['미용사', '파마머리', '앞머리', '다듬다', '긴 머리', '짧은 머리'],
  '읽기 glossary (p.82)': ['새롭다', '제스처'],
  '쓰기 glossary (p.83)': ['정리(를) 하다', '스트레스가 쌓이다', '속마음'],
  '과제 glossary (p.84)': ['보통이다'],
  '문화 산책 glossary (p.85)': ['완전히', '붕어빵'],
  '발음 · 받침 ㄻ (p.86)': ['받침 ㄻ', '젊다', '젊게 살다', '닮지 않다', '부모']
};
Object.entries(FROM_THE_BOOK).forEach(([page, list]) => {
  const gone = list.filter((k) => !ko.has(nfc(k)));
  assert(gone.length === 0, page + ' is complete' + (gone.length ? ' — missing: ' + gone.join(', ') : ''));
});

// The chapter's own checklist, printed at the top of 자기 평가 on p.87 as "다음 중 아는
// 단어에 √ 하세요". If the book thinks a learner should know these twelve by the end of the
// unit, the farm has to be able to teach them. 어리다 is the exception and it is named in
// section 5 with the rest.
const SELF_CHECK = ['쌍꺼풀이 있다', '입술이 얇다', '눈썹이 진하다', '이마가 넓다', '활발하다',
  '내성적이다', '꼼꼼하다', '성격이 급하다', '닮다', '날씬하다', '머리를 자르다'];
const uncheckable = SELF_CHECK.filter((k) => !ko.has(nfc(k)));
assert(uncheckable.length === 0,
  "every word 자기 평가 asks the learner to tick is farmable"
  + (uncheckable.length ? ' — missing: ' + uncheckable.join(', ') : ''));

// The four grammar points are the chapter, not decoration on it, and each is a headword of
// its own so the farm can quiz the form and not only the words it is made of.
const GRAMMAR = ['A-아/어 보이다', 'N처럼', 'N같이', 'A-(으)ㄴ 편이다', 'V-는 편이다', 'A-게'];
const noGrammar = GRAMMAR.filter((g) => !ko.has(nfc(g)));
assert(noGrammar.length === 0,
  'all four 문법과 표현 points are farmable' + (noGrammar.length ? ' — missing: ' + noGrammar.join(', ') : ''));
// 편이다 is the unit title's own form, so it would be an odd thing to teach in the
// abstract: both halves carry a printed 예문 in the word list's examples or nowhere.
assert(ko.has(nfc('조용하다')) && ko.has(nfc('마르다')),
  'and the two adjectives the 편이다 예문 are built on came with them');

// ── 5. No word leaks between units ───────────────────────────────────────────
console.log('\n--- 5. No word leaks between units ---');
const NEIGHBOURS = [['2b-unit-10', 'Unit 10'], ['2b-unit-11', 'Unit 11'],
  ['2b-unit-13', 'Unit 13'], ['2b-unit-14', 'Unit 14'], ['2b-unit-15', 'Unit 15']];
const ownedBy = {};
NEIGHBOURS.forEach(([id]) => {
  ownedBy[id] = new Set((readJson('worlds/' + id + '.json').level.words || []).map((w) => nfc(w.ko)));
});
NEIGHBOURS.forEach(([id, label]) => {
  const shared = [...ko].filter((k) => ownedBy[id].has(k));
  assert(shared.length === 0,
    'Unit 12 shares no headword with ' + label + (shared.length ? ' — shared: ' + shared.join(', ') : ''));
});

// Named rather than merely absent. Each of these is printed in 12과 and left out because
// an earlier unit already teaches it, and each line fails if that unit ever drops it —
// which is the moment Unit 12 would have to pick the word up.
const LEFT_TO_AN_EARLIER_UNIT = {
  '2b-unit-10': ['키가 크다', '친절하다', '값', '예약하다', '친하다', '늦다', '분위기'],
  '2b-unit-11': ['심심하다'],
  '2b-unit-13': ['어울리다', '소개하다', '시원하다', '불편하다', '가족처럼'],
  '2b-unit-14': ['어리다', '어른', '비슷하다', '다르다', '사진을 찍다', '제주도'],
  '2b-unit-15': ['생기다', '기다리다', '부모님']
};
Object.entries(LEFT_TO_AN_EARLIER_UNIT).forEach(([id, list]) => {
  const orphaned = list.filter((k) => !ownedBy[id].has(nfc(k)));
  assert(orphaned.length === 0,
    'the words Unit 12 defers to ' + id + ' are still taught there'
    + (orphaned.length ? ' — now taught nowhere: ' + orphaned.join(', ') : ''));
  const taken = list.filter((k) => ko.has(nfc(k)));
  assert(taken.length === 0,
    'and Unit 12 has not quietly taken one back' + (taken.length ? ' — ' + taken.join(', ') : ''));
});

// Giving a word up is only acceptable if the chapter still teaches the thing. 키가 크다 is
// on the 어휘 page as half of a pair, and the 보기 under it is 키가 커 보여요 — so the tall
// half survives as the 보이다 form. 생기다 never appears bare in 12과: it is 어떻게 생겼어요
// and 인형같이 생겼어요, and both of those are here.
assert(ko.has(nfc('커 보이다')) && ko.has(nfc('키가 작다')),
  'both halves of the 키 pair are still taught — as 커 보이다 and 키가 작다');
assert(ko.has(nfc('어떻게 생기다')) && ko.has(nfc('인형같이 생기다')),
  'and both of 생기다’s printed collocations, which is the only way 12과 uses it');

// ── 6. The examples are the book's, and provable ─────────────────────────────
// validate_content.js runs vocab_examples.sentenceUses() over every word list in CI, so
// that is the rule here rather than a second opinion that could disagree with it. It is
// deliberately conservative — its surface-form generator stops early on one-syllable open
// stems (하다, 주다, 크다) and mis-builds the ㅂ irregular — so a printed sentence can be a
// good example and still be unprovable. Those rows ship bare, the way Unit 14's 야단(을)
// 맞다 and every one of Unit 15's grammar labels already do.
console.log('\n--- 6. The examples are the book’s, and provable ---');
const vocabExamples = require(path.join(ROOT, 'scripts', 'vocab_examples.js'));
const withExample = words.filter((w) => w.example);
assert(withExample.length >= 60,
  'most of the list carries an example sentence (' + withExample.length + ' of ' + words.length + ')');
const unproven = withExample.filter((w) => !vocabExamples.sentenceUses(w.example, w.ko)).map((w) => w.ko);
assert(unproven.length === 0,
  'every example uses the word it illustrates'
  + (unproven.length ? ' — ' + unproven.slice(0, 6).join(', ') : ''));
const orphanGloss = words.filter((w) => w.exampleEn && !w.example).map((w) => w.ko);
assert(orphanGloss.length === 0,
  'no English gloss without the Korean above it' + (orphanGloss.length ? ' — ' + orphanGloss.join(', ') : ''));
const noGloss = withExample.filter((w) => !w.exampleEn).map((w) => w.ko);
assert(noGloss.length === 0,
  'and no example without its English' + (noGloss.length ? ' — ' + noGloss.join(', ') : ''));
const notASentence = withExample.filter((w) => !/[.?!]$/.test(w.example.trim())).map((w) => w.ko);
assert(notASentence.length === 0,
  'each example is a whole sentence rather than a cue off a substitution box'
  + (notASentence.length ? ' — ' + notASentence.join(', ') : ''));
const stillABlank = withExample.filter((w) => w.example.indexOf('{}') >= 0).map((w) => w.ko);
assert(stillABlank.length === 0,
  'and none of them is an exercise with the answer still cut out'
  + (stillABlank.length ? ' — ' + stillABlank.join(', ') : ''));
// The grammar labels are the rows that legitimately have none: A-게 is not a word, and a
// sentence beside it would be an example of whatever adjective was chosen for it.
assert(GRAMMAR.every((g) => !words.find((w) => nfc(w.ko) === nfc(g)).example),
  'the six grammar labels carry no example, because a form is not a word');

// ── 7. Playable before any icon is drawn ─────────────────────────────────────
console.log('\n--- 7. Playable before any icon is drawn ---');
const noHint = words.filter((w) => !w.hint).map((w) => w.ko);
assert(noHint.length === 0,
  'every word carries a hint emoji to render with'
  + (noHint.length ? ' — ' + noHint.slice(0, 6).join(', ') : ''));
assert(words.every((w) => !w.artPending),
  'and none of them claims the per-word artPending exemption, which belongs to Unit 14');
const catalogued = new Set(((readJson('sprites/catalog.json').assets) || [])
  .filter((a) => a && a.wordKo).map((a) => nfc(a.wordKo)));
const drawn = [...ko].filter((k) => catalogued.has(k));
console.log('      icons in the catalog for Unit 12 words: ' + drawn.length + ' of ' + words.length
  + (drawn.length ? ' (' + drawn.slice(0, 8).join(', ') + ')' : ''));

// ── 8. The notebook ──────────────────────────────────────────────────────────
console.log('\n--- 8. The notebook ---');
const groups = (world.notebook && world.notebook.groups) || [];
assert(groups.length === SECTIONS.length, 'the notebook lists all eight groups (' + groups.length + ')');
assert(groups.every((g) => g.ko && g.en && g.cat), 'each group has ko / en / cat');
const strayGroup = groups.filter((g) => !byCat[g.cat]).map((g) => g.cat);
assert(strayGroup.length === 0,
  'no notebook group is empty' + (strayGroup.length ? ' — ' + strayGroup.join(', ') : ''));
const ungrouped = Object.keys(byCat).filter((c) => !groups.some((g) => g.cat === c));
assert(ungrouped.length === 0,
  'no category is missing from the notebook' + (ungrouped.length ? ' — ' + ungrouped.join(', ') : ''));

// ── 9. The runtime pack ──────────────────────────────────────────────────────
// Driven rather than grepped: the pack helpers run against a levelsData built from the
// world file on disk, so a JSON map and a WORLD_PACKS entry that disagree fail here.
console.log('\n--- 9. The runtime pack ---');
const start = econ.indexOf('const VALLEY_EXTRA_IDS');
const end = econ.indexOf('const TEXTBOOK_WORLD_FILES');
assert(start >= 0 && end > start, 'the pack helpers are still in economy.js');
const ctx = {
  console,
  levelsData: [{ nameEn: 'Daily Life' }, { worldId: '2b-unit-12', map }],
  currentLevelIndex: 1
};
ctx.currentLesson = function () { return ctx.levelsData[ctx.currentLevelIndex] || null; };
vm.createContext(ctx);
vm.runInContext(econ.slice(start, end), ctx);
const R = (expr) => vm.runInContext(expr, ctx);

assert(R("!!WORLD_PACKS['2b-unit-12']"), 'WORLD_PACKS has a 2b-unit-12 entry');
assert(R("WORLD_PACKS['2b-unit-12'].stations").join(',') === 'desk,cassette', 'the pack is desk plus cassette');
assert(R("WORLD_PACKS['2b-unit-12'].extras").length === 0, 'the pack has no valley extras');
assert(R('currentWorldPack().id') === '2b-unit-12', 'a Unit 12 lesson resolves to the Unit 12 pack');
assert(R("worldPackHas(null, 'station', 'desk')") === true, 'Unit 12 has the desk');
assert(R("worldPackHas(null, 'station', 'cassette')") === true, 'Unit 12 has the cassette player');
assert(R("worldPackHas(null, 'station', 'kitchen')") === false, 'Unit 12 has no kitchen');
assert(R("worldPackHas(null, 'extra', 'shop')") === false, 'Unit 12 has no shop');
assert(JSON.stringify(R("WORLD_PACKS['2b-unit-12'].stations")) === JSON.stringify(map.stations),
  'the JSON map and the runtime pack agree');

const art = R("artLoadForWorldPack('2b-unit-12')");
assert(art.some((a) => a.key === 'study_desk_hd'), 'Unit 12 boot loads the study desk art');
assert(art.some((a) => a.key === 'cassette_player_hd'), 'Unit 12 boot loads the reviewed cassette art');
assert(art.length === 2, 'two reviewed textures, not a copy of the Unit 10 list (' + art.length + ')');

assert(econ.indexOf("{ cache: 'world-2b-12', file: 'worlds/2b-unit-12.json' }") >= 0,
  'TEXTBOOK_WORLD_FILES lists the Unit 12 JSON for the non-Phaser load path');
assert(/function isUnit12World\(\)[\s\S]{0,180}worldId === '2b-unit-12'/.test(econ),
  'isUnit12World is declared and tests only Unit 12');
assert(/function isUnit13World\(\)[\s\S]{0,180}worldId === '2b-unit-13'/.test(econ),
  'and isUnit13World was not widened while adding it');

// ── 10. The farm scene ───────────────────────────────────────────────────────
console.log('\n--- 10. The farm scene ---');
assert(/TEXTBOOK_WORLD_FILES\.forEach\([\s\S]{0,200}this\.load\.json\(spec\.cache, spec\.file\)/.test(farm),
  'FarmScene preloads every world on the list, Unit 12 among them');
assert(/TEXTBOOK_WORLD_FILES\.forEach\([\s\S]{0,240}cache\.json\.exists\(spec\.cache\)[\s\S]{0,120}attachTextbookWorld/.test(farm),
  'and attaches every one of them, so the level select can list it');
assert(farm.indexOf("'world-2b-12'") < 0 && farm.indexOf("'2b-unit-12.json'") < 0,
  'without naming Unit 12 a second time, where the two lists could drift apart');

// ── 11. The tools that have to know it exists ────────────────────────────────
// A world file nothing lists is a farm with no translation, no clips and no admin row —
// and every one of those fails silently, by simply never mentioning the unit.
console.log('\n--- 11. The tools that have to know it exists ---');
const listed = [
  ['js/i18n.js', 'the translation source list'],
  ['scripts/ttsClips.js', 'the TTS harvest'],
  ['scripts/vocab_examples.js', 'the example corpus'],
  ['admin/lib/i18n.js', 'the admin’s translator labels'],
  ['admin/lib/content.js', 'the admin’s world picker'],
  ['admin/public/js/world.js', 'the admin’s word-list editor']
];
listed.forEach(([rel, what]) => {
  assert(read(rel).indexOf('2b-unit-12') >= 0, what + ' lists Unit 12 (' + rel + ')');
});
assert(read('js/locales/catalogs.js').indexOf('worlds/2b-unit-12.json') >= 0,
  'and the generated catalog index carries it, so the Vietnamese file is actually loaded');

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
process.exit(failed ? 1 : 0);
