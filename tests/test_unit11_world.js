'use strict';
/**
 * tests/test_unit11_world.js — 2B Unit 11 (운동을 좀 해 보는 게 어때요?): the map, the
 * word list, and the study desk.
 *
 * Unit 11 ships as the basic farm plus the desk — no kitchen, no taste stall, no
 * workbook. So what there is to get wrong is different from Unit 10 and Unit 14,
 * and this suite is aimed at those three things:
 *
 *   1. The word list is the whole chapter, not just its 어휘 pages. The unit teaches
 *      vocabulary in eight places — 어휘, 문법과 표현, 말하기, 듣고 말하기, 읽고 쓰기,
 *      과제, 문화 산책 — and the footnote glossaries under the exercises are where
 *      half of it lives. A list that stops at 어휘 looks complete and teaches a third
 *      of the unit.
 *
 *   2. No word leaks in from a neighbouring unit. SRS state is keyed by the Korean,
 *      so a word owned by two farms has one review schedule shared between them, and
 *      nothing on screen would say so. Where the chapter re-uses a word Unit 10 or
 *      Unit 14 already owns, the earlier unit keeps it.
 *
 *   3. The desk resolves to Unit 11's own quiz bank. deskQuizUrl() ends in a Unit 10
 *      fallback, so a missing branch does not fail — it silently serves Unit 10's dish
 *      questions on a farm about symptoms and medicine.
 *
 * The icons are not drawn yet. That is deliberate and it is checked rather than
 * assumed: every word carries a hint emoji, which is what vocabIconHtml falls back to,
 * and no desk-quiz row names a PNG that does not exist.
 *
 * Run: node tests/test_unit11_world.js
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

const world = readJson('worlds/2b-unit-11.json');
const quiz = readJson('worlds/unit11-desk-quiz.json');
const econ = read('js/systems/economy.js');
const farm = read('js/scenes/farm.js');
const ui = read('js/ui.js');
const words = world.level.words || [];

console.log('====================================================');
console.log('2B UNIT 11 · 운동을 좀 해 보는 게 어때요?');
console.log('====================================================');

// ── 1. The world file ────────────────────────────────────────────────────────
console.log('\n--- 1. The world file ---');
assert(world.id === '2b-unit-11', 'world id is 2b-unit-11');
assert(world.pack === 'snu-2b', 'belongs to the SNU 2B pack');
assert(world.level.worldId === '2b-unit-11', 'level carries the same worldId');
assert(world.level.world === true, 'level is flagged as a textbook world');
assert(world.titleKo.indexOf('11과') === 0, 'Korean title opens with the chapter number');
assert(world.level.target === 9, 'harvest target matches the other units');

// The map is the whole point of this unit as shipped: a plain farm and one station.
console.log('\n--- 2. The map is the basic farm plus the desk ---');
const map = world.level.map;
assert(Array.isArray(map.extras) && map.extras.length === 0,
  'no valley extras — no shop, board, arcade, cat, beehive, portal or pond');
assert(JSON.stringify(map.stations) === JSON.stringify(['desk', 'cassette']),
  'two stations, the study desk and the cassette player (' + JSON.stringify(map.stations) + ')');
assert(map.stations.indexOf('kitchen') < 0 && map.stations.indexOf('taste') < 0,
  'no kitchen and no taste stall — those are Unit 10 minigames');

// ── 3. The word list is the whole chapter ────────────────────────────────────
console.log('\n--- 3. The word list is the whole chapter ---');
assert(words.length === 155, 'the list holds 155 words (' + words.length + ')');
const incomplete = words.filter((w) => !w.ko || !w.en || !w.category || !w.categoryEn).map((w) => w.ko || '?');
assert(incomplete.length === 0,
  'every word has ko / en / category / categoryEn' + (incomplete.length ? ' — ' + incomplete.slice(0, 5).join(', ') : ''));
const dups = words.map((w) => nfc(w.ko)).filter((k, i, a) => a.indexOf(k) !== i);
assert(dups.length === 0, 'no headword repeats' + (dups.length ? ' — ' + dups.join(', ') : ''));

// One group per section the chapter teaches vocabulary in. The count per group is not
// pinned — the split can move — but the sections are, because a missing group means a
// whole page of the chapter went unharvested.
const SECTIONS = ['증상', '병원', '약', '문법과 표현', '회화', '듣고 말하기', '읽고 쓰기', '문화'];
const byCat = {};
words.forEach((w) => { byCat[w.category] = (byCat[w.category] || 0) + 1; });
SECTIONS.forEach((cat) => assert(byCat[cat] > 0, cat + ' is represented (' + (byCat[cat] || 0) + ' words)'));
assert(Object.keys(byCat).length === SECTIONS.length,
  'and there are no groups beyond the eight sections (' + Object.keys(byCat).join(', ') + ')');
// categoryEn is what the HUD and the notebook actually print, so it has to be one
// label per group rather than drifting per row.
const enByCat = {};
words.forEach((w) => { (enByCat[w.category] = enByCat[w.category] || new Set()).add(w.categoryEn); });
const drifted = Object.entries(enByCat).filter(([, set]) => set.size !== 1).map(([c]) => c);
assert(drifted.length === 0,
  'each group has a single English label' + (drifted.length ? ' — drifted: ' + drifted.join(', ') : ''));

// The pages this suite was written against, named so that a future edit that drops one
// is a deliberate edit to this list. These are the words a learner cannot look up
// anywhere else in the game: the 어휘 spreads and the footnote glossaries under the
// exercises, which is where the chapter hides most of its new vocabulary.
console.log('\n--- 4. The pages the list was harvested from ---');
const ko = new Set(words.map((w) => nfc(w.ko)));
const FROM_THE_BOOK = {
  '어휘 1 · 증상 (p.48)': ['속이 안 좋다', '몸살이 나다', '다리를 다치다', '소화가 안되다',
    '배탈이 나다', '토하다', '어지럽다', '멀미를 하다', '얼굴에 뭐가 나다', '입맛이 없다',
    '기운이 없다', '잠을 잘 못 자다'],
  '어휘 2 · 병원 (p.49)': ['내과', '안과', '치과', '피부과', '정형외과', '이비인후과'],
  '어휘 3 · 약 (p.49)': ['감기약', '두통약', '멀미약', '소화제', '해열제', '안약', '파스', '연고',
    '먹다', '넣다', '붙이다', '바르다'],
  "'ㅅ' 불규칙 glossary (p.50)": ['낫다', '기침이 나다', '계속', '붓다', '짓다', '젓다'],
  'N마다 glossary (p.51)': ['씩'],
  'V-는 게 어때요? glossary (p.54)': ['진료를 받다', '싱겁다', '자꾸', '생활비', '돈이 들다', '화해하다'],
  '말하기 2 glossary (p.56)': ['을/를 위해서', '특별히', '스트레스가 풀리다', '나가다'],
  '말하기 2 연습 2 glossary (p.57)': ['고민', '조언'],
  '듣고 말하기 glossary (p.59)': ['특별하다', '평소'],
  '읽기 glossary (p.60)': ['습관', '영양제', '그러나', '모든', '노력하다', '채소', '외출하다', '예방하다'],
  '과제 · 역할극 (p.62)': ['의사', '환자', '처방', '주의사항', '역할극'],
  '문화 산책 (p.63)': ['인삼']
};
Object.entries(FROM_THE_BOOK).forEach(([page, list]) => {
  const gone = list.filter((k) => !ko.has(nfc(k)));
  assert(gone.length === 0, page + ' is complete' + (gone.length ? ' — missing: ' + gone.join(', ') : ''));
});

// The four ㅅ-irregular verbs are the grammar point of the first half of the chapter,
// and 목이 붓다 is the one place a learner meets one as a symptom. Both have to be there
// or the 문법과 표현 1 page has nothing behind it.
const S_IRREGULAR = ['낫다', '붓다', '짓다', '젓다'];
assert(S_IRREGULAR.every((k) => ko.has(nfc(k))), "all four 'ㅅ' 불규칙 verbs are learnable");
assert(ko.has(nfc('목이 붓다')), '붓다 is also there as the symptom the pharmacy dialogue uses');

// ── 5. No word leaks between units ───────────────────────────────────────────
console.log('\n--- 5. No word leaks between units ---');
[['2b-unit-10', 'Unit 10'], ['2b-unit-14', 'Unit 14']].forEach(([id, label]) => {
  const owned = new Set((readJson('worlds/' + id + '.json').level.words || []).map((w) => nfc(w.ko)));
  const shared = [...ko].filter((k) => owned.has(k));
  assert(shared.length === 0,
    'Unit 11 shares no headword with ' + label + (shared.length ? ' — shared: ' + shared.join(', ') : ''));
});
// Named rather than merely absent: these are words the chapter really does use, left out
// because an earlier unit already teaches them. Should one ever be dropped from that unit,
// this line is what says Unit 11 has to pick it up.
const LEFT_TO_AN_EARLIER_UNIT = {
  '2b-unit-10': ['고기', '생선', '처음', '주말'],
  '2b-unit-14': ['수영을 하다', '다르다']
};
Object.entries(LEFT_TO_AN_EARLIER_UNIT).forEach(([id, list]) => {
  const owned = new Set((readJson('worlds/' + id + '.json').level.words || []).map((w) => nfc(w.ko)));
  const orphaned = list.filter((k) => !owned.has(nfc(k)));
  assert(orphaned.length === 0,
    'the words Unit 11 defers to ' + id + ' are still taught there'
    + (orphaned.length ? ' — now taught nowhere: ' + orphaned.join(', ') : ''));
});

// ── 6. Playable before any icon is drawn ─────────────────────────────────────
console.log('\n--- 6. Playable before any icon is drawn ---');
const noHint = words.filter((w) => !w.hint).map((w) => w.ko);
assert(noHint.length === 0,
  'every word carries a hint emoji to render with' + (noHint.length ? ' — ' + noHint.slice(0, 6).join(', ') : ''));
// artPending means "this one word is the exception to the unit's word→PNG guarantee".
// Unit 11 has no such guarantee yet, so borrowing the flag would say something false and
// would land these 155 words in the pinned pending set in test_unit_vocab_coverage.js.
assert(words.every((w) => !w.artPending),
  'and none of them claims the per-word artPending exemption, which belongs to Unit 14');
const catalogued = new Set(((readJson('sprites/catalog.json').assets) || [])
  .filter((a) => a && a.wordKo).map((a) => nfc(a.wordKo)));
const drawn = [...ko].filter((k) => catalogued.has(k));
console.log('      icons in the catalog for Unit 11 words: ' + drawn.length + ' of ' + words.length
  + (drawn.length ? ' (' + drawn.slice(0, 8).join(', ') + ')' : ''));

// ── 7. The notebook ──────────────────────────────────────────────────────────
console.log('\n--- 7. The notebook ---');
const groups = (world.notebook && world.notebook.groups) || [];
assert(groups.length === SECTIONS.length, 'the notebook lists all eight groups (' + groups.length + ')');
assert(groups.every((g) => g.ko && g.en && g.cat), 'each group has ko / en / cat');
const strayGroup = groups.filter((g) => !byCat[g.cat]).map((g) => g.cat);
assert(strayGroup.length === 0,
  'no notebook group is empty' + (strayGroup.length ? ' — ' + strayGroup.join(', ') : ''));
const ungrouped = Object.keys(byCat).filter((c) => !groups.some((g) => g.cat === c));
assert(ungrouped.length === 0,
  'no category is missing from the notebook' + (ungrouped.length ? ' — ' + ungrouped.join(', ') : ''));

// ── 8. The runtime pack ──────────────────────────────────────────────────────
// Driven rather than grepped: the pack helpers are run against a levelsData built from
// the world file on disk, so a JSON map and a WORLD_PACKS entry that disagree fail here.
console.log('\n--- 8. The runtime pack ---');
const start = econ.indexOf('const VALLEY_EXTRA_IDS');
const end = econ.indexOf('const TEXTBOOK_WORLD_FILES');
assert(start >= 0 && end > start, 'the pack helpers are still in economy.js');
const ctx = {
  console,
  levelsData: [{ nameEn: 'Daily Life' }, { worldId: '2b-unit-11', map }],
  currentLevelIndex: 1
};
ctx.currentLesson = function () { return ctx.levelsData[ctx.currentLevelIndex] || null; };
vm.createContext(ctx);
vm.runInContext(econ.slice(start, end), ctx);
const R = (expr) => vm.runInContext(expr, ctx);

assert(R("!!WORLD_PACKS['2b-unit-11']"), 'WORLD_PACKS has a 2b-unit-11 entry');
assert(R("WORLD_PACKS['2b-unit-11'].stations").join(',') === 'desk,cassette', 'the pack is desk plus cassette');
assert(R("WORLD_PACKS['2b-unit-11'].extras").length === 0, 'the pack has no valley extras');
assert(R('currentWorldPack().id') === '2b-unit-11', 'a Unit 11 lesson resolves to the Unit 11 pack');
assert(R("worldPackHas(null, 'station', 'desk')") === true, 'Unit 11 has the desk');
assert(R("worldPackHas(null, 'station', 'cassette')") === true, 'Unit 11 has the cassette player');
assert(R("worldPackHas(null, 'station', 'kitchen')") === false, 'Unit 11 has no kitchen');
assert(R("worldPackHas(null, 'station', 'taste')") === false, 'Unit 11 has no taste stall');
assert(R("worldPackHas(null, 'extra', 'shop')") === false, 'Unit 11 has no shop');
assert(R("worldPackHas(null, 'extra', 'fishing')") === false, 'Unit 11 has no fishing pond');
assert(JSON.stringify(R("WORLD_PACKS['2b-unit-11'].stations")) === JSON.stringify(map.stations),
  'the JSON map and the runtime pack agree');

const art = R("artLoadForWorldPack('2b-unit-11')");
assert(art.some((a) => a.key === 'study_desk_hd'), 'Unit 11 boot loads the study desk art');
assert(!art.some((a) => a.key === 'unit10_kitchen_hd' || a.key === 'unit10_taste_stall_hd'),
  'and pulls neither the kitchen nor the stall');
assert(art.length === 1, 'one texture, not a copy of the Unit 10 list (' + art.length + ')');

assert(econ.indexOf("{ cache: 'world-2b-11', file: 'worlds/2b-unit-11.json' }") >= 0,
  'TEXTBOOK_WORLD_FILES lists the Unit 11 JSON for the non-Phaser load path');
assert(/function isUnit11World\(\)[\s\S]{0,180}worldId === '2b-unit-11'/.test(econ),
  'isUnit11World is declared and tests only Unit 11');
assert(/function isUnit10World\(\)[\s\S]{0,180}worldId === '2b-unit-10'/.test(econ),
  'and isUnit10World was not widened while adding it');

// ── 9. The farm scene ────────────────────────────────────────────────────────
console.log('\n--- 9. The farm scene ---');
assert(farm.indexOf("this.load.json('world-2b-11','worlds/2b-unit-11.json')") >= 0,
  'FarmScene preloads the Unit 11 world');
assert(farm.indexOf("if (this.cache.json.exists('world-2b-11')) attachTextbookWorld") >= 0,
  'and attaches it, so the level select can list it');
assert(/_isUnit11\(\)\{[\s\S]{0,160}'2b-unit-11'/.test(farm), 'FarmScene knows Unit 11');
assert(/_hasStudyDesk\(\)[\s\S]{0,240}_isUnit11\(\)/.test(farm),
  'the desk fallback covers Unit 11 for the case where worldPackHas is unavailable');
assert(/_isTextbookFarm\(\)[\s\S]{0,240}'2b-unit-11'/.test(farm),
  'and so does the textbook-farm fallback');
assert(/if \(this\._hasStudyDesk\(\)\) this\._ensureStudyDesk\(\)/.test(farm),
  'the desk still spawns through _hasStudyDesk');
// The kitchen and the taste stall are Unit 10 minigames. Their interact handlers are
// gated on _isUnit10(), which is what stops a desk-only unit opening them.
const kitchen = farm.match(/case 'kitchen':[\s\S]{0,200}openCookingUI/);
assert(!!kitchen && kitchen[0].indexOf('_isUnit10()') >= 0, 'the kitchen stays Unit-10-gated');
const taste = farm.match(/case 'taste':[\s\S]{0,200}openTasteGame/);
assert(!!taste && taste[0].indexOf('_isUnit10()') >= 0, 'the taste stall stays Unit-10-gated');

// ── 10. The study desk ───────────────────────────────────────────────────────
// deskQuizUrl() ends in a Unit 10 fallback, so a missing branch is not an error — it is
// Unit 10's dish quiz served on a farm about symptoms and medicine.
console.log('\n--- 10. The study desk ---');
assert(ui.indexOf("return '/worlds/unit11-desk-quiz.json'") >= 0,
  'deskQuizUrl resolves Unit 11 to its own bank');
assert(/isUnit11World\(\)\) return '\/worlds\/unit11-desk-quiz\.json'/.test(ui),
  'and it is guarded by isUnit11World, not by the fallback');
assert(ui.indexOf("if (typeof isUnit14World === 'function' && isUnit14World()) return '/worlds/unit14-desk-quiz.json';") >= 0,
  'the Unit 14 branch is untouched');
// No workbook yet, so openStudyDesk finds one mode and opens it rather than drawing a
// one-row menu. That behaviour is what makes shipping the desk without exercises fine.
assert(ui.indexOf('function workbookUrl') >= 0 && ui.indexOf('unit11-workbook.json') < 0,
  'no workbook is claimed for Unit 11 yet');
assert(/deskMenuOptions\.length === 1[\s\S]{0,80}run\(\)/.test(ui),
  'a desk with one mode opens it directly instead of showing a menu of one');

console.log('\n--- 11. The desk quiz bank ---');
assert(quiz.sessionSize === 10, 'a session is 10 questions (' + quiz.sessionSize + ')');
assert((quiz.questions || []).length === 13,
  'the bank holds 13, so consecutive sessions differ (' + (quiz.questions || []).length + ')');
assert(!!quiz.titleKo && !!quiz.titleEn && !!quiz.doneKo && !!quiz.againKo && !!quiz.closeKo
  && !!quiz.correctKo && !!quiz.wrongKo, 'the overlay strings are all present');
const seenIds = new Set();
const problems = [];
(quiz.questions || []).forEach((q, i) => {
  if (typeof q.id !== 'number') problems.push('row ' + i + ' has no numeric id');
  else if (seenIds.has(q.id)) problems.push('duplicate id ' + q.id);
  else seenIds.add(q.id);
  if (!q.q) problems.push('q' + q.id + ' has no prompt');
  const keys = Object.keys(q.choices || {}).sort().join('');
  if (keys !== 'ABCD') problems.push('q' + q.id + ' offers ' + (keys || 'nothing'));
  if (!q.choices || !q.choices[q.a]) problems.push('q' + q.id + ' answers ' + q.a + ', which is not a choice');
  const texts = Object.values(q.choices || {}).map(nfc);
  if (new Set(texts).size !== texts.length) problems.push('q' + q.id + ' repeats a choice');
});
assert(problems.length === 0,
  'every row has four distinct choices and an answer among them'
  + (problems.length ? ' — ' + problems.slice(0, 5).join(', ') : ''));
// The illustrations come later. renderDeskQuiz hides the slot when a row has no `art`,
// but a row naming a PNG that is not on disk paints a broken image instead.
const named = (quiz.questions || []).filter((q) => q.art);
assert(named.length === 0,
  'no row names art before any is drawn' + (named.length ? ' — ' + named.map((q) => q.art).join(', ') : ''));
// The answer keys, pinned. This is the half a re-edit gets wrong silently: the questions
// still read correctly and the marking is wrong.
const KEYS = ['B', 'C', 'A', 'D', 'B', 'B', 'A', 'A', 'A', 'A', 'B', 'B', 'C'];
const actual = (quiz.questions || []).map((q) => q.a);
assert(JSON.stringify(actual) === JSON.stringify(KEYS),
  'the answer keys are unchanged (' + actual.join('') + ')');
// A bank whose answers cluster on one letter is guessable.
const spread = new Set(actual);
assert(spread.size >= 3, 'answers are spread over at least three letters (' + [...spread].sort().join('') + ')');

// The quiz drills this unit, so its Korean should come from this unit's list. Checked as
// a floor rather than per row, because a question may quote a grammar form rather than a
// headword — 나았어요 is 낫다 conjugated, and pinning that shape would forbid the exercise.
const quizText = nfc(JSON.stringify(quiz));
const quoted = [...ko].filter((k) => k.length > 1 && quizText.indexOf(k) >= 0);
assert(quoted.length >= 20,
  'the bank quotes the Unit 11 word list (' + quoted.length + ' headwords appear)');

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_unit11_world: all passed');
