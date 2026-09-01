'use strict';
/**
 * tests/test_topik_map.js — the TOPIK II exam world.
 *
 * This world breaks the shape the other four keep, and the differences are the reason it
 * needs a suite of its own rather than a row in an existing one:
 *
 *   1. It has no chapter. Questions arrive one at a time and the word list grows out of
 *      them, so there is no "this chapter has N words" number to pin. Section 1 pins the
 *      shape of an entry instead.
 *
 *   2. Overlapping vocabulary is the point, not a defect. It is a personal study room: a
 *      word met in an exam question belongs here whether or not it was first met on a farm.
 *      Section 3 proves that costs nothing — srsData is keyed by the Korean word globally,
 *      so a repeat shares one card, and srsDueWords() plants it once. It is asserted rather
 *      than assumed so nobody "fixes" the overlap later.
 *
 *   3. It was the first world with a desk and no 퀴즈 of its own, which is how it found
 *      deskQuizUrl's bare fallback to Unit 10's quiz — a screen that works perfectly and
 *      asks about 10과 food on a map that has nothing to do with 10과. Section 4 guards it.
 *
 * Run: node tests/test_topik_map.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readJson = (rel) => JSON.parse(read(rel));
const nfc = (s) => String(s == null ? '' : s).normalize('NFC').trim();
const { readGameSource } = require('../scripts/gameSource');
const src = readGameSource();

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

// Sliced on markers rather than matched with a newline-bearing regex: this repo has no
// .gitattributes, so a working copy is CRLF on Windows and LF in CI.
function extract(startMarker, endMarker, label) {
  const a = src.indexOf(startMarker);
  if (a < 0) throw new Error('could not find ' + label + ' start: ' + startMarker);
  const b = src.indexOf(endMarker, a);
  if (b < 0) throw new Error('could not find ' + label + ' end: ' + endMarker);
  return src.slice(a, b + endMarker.length);
}

const world = readJson('worlds/topik-2.json');
const bank = readJson('worlds/topik2-questions.json');
const words = (world.level && world.level.words) || [];
const exercises = bank.exercises || [];
const rows = exercises.flatMap((ex) => (ex.items || []).map((it) => ({ ex, it })));

console.log('====================================================');
console.log('TOPIK II · 시험 준비 — THE EXAM WORLD');
console.log('====================================================');

// ── 1. The world ─────────────────────────────────────────────────────────────
console.log('\n--- 1. The world ---');
assert(world.id === 'topik-2', 'the world names itself topik-2');
assert(world.level.worldId === 'topik-2' && world.level.world === true,
  'and the level inside it is a world level with the same id');
const stations = (world.level.map && world.level.map.stations) || [];
assert(stations.join(',') === 'desk',
  'it carries a study desk and nothing else yet (' + stations.join(', ') + ')');
// currentWorldPack() prefers lvl.map.stations and only falls back to WORLD_PACKS, so the two
// have to agree — a station in one and not the other is a station that does not appear.
const packLine = /'topik-2':\s*\{[^}]*stations:\s*\[([^\]]*)\]/.exec(src);
assert(!!packLine, 'WORLD_PACKS declares a station list for it');
if (packLine) {
  const fromPack = packLine[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
  assert(fromPack.join(',') === stations.join(','),
    'and it is the same list the world JSON carries (' + fromPack.join(', ') + ')');
}
assert(!stations.includes('cassette'),
  'no cassette player: there is no exam audio yet, and a radio with nothing to play is worse than none');
// No count to pin — the list grows a question at a time — so pin the shape of an entry.
const thin = words.filter((w) => !w || !w.ko || !w.en || !w.category || !w.categoryEn || !w.hint)
  .map((w) => (w && w.ko) || '?');
assert(thin.length === 0, 'every word carries ko / en / category / categoryEn / hint'
  + (thin.length ? ' — ' + thin.slice(0, 5).join(', ') : ''));
const kos = words.map((w) => nfc(w.ko));
const dups = kos.filter((k, i) => kos.indexOf(k) !== i);
assert(dups.length === 0, 'no word is listed twice inside this world'
  + (dups.length ? ' — ' + dups.join(', ') : ''));
const declared = ((world.notebook && world.notebook.mindmap) || []).map((g) => g.cat);
const inUse = [...new Set(words.map((w) => w.category))];
assert(inUse.every((c) => declared.includes(c)) && declared.every((c) => inUse.includes(c)),
  'the mindmap names exactly the categories the words use ('
  + (declared.length ? declared.join(', ') : 'none yet') + ')');

const volunteerDataWords = [
  '그림책', '자원봉사자', '모집', '꿈', '희망', '자격', '고등학생', '또는',
  '신청 방법', '홈페이지', '활동 기간', '봉사 활동', '참여하다', '그래프',
  '고려 사항', '기준', '규모', '비율', '전체', '이상', '이하'
];
const volunteerDataSource = (world.vocabularySources || [])
  .find((source) => source.id === 'user-2026-09-01-volunteer-data');
assert(!!volunteerDataSource, 'the volunteer and chart list records its learner-supplied provenance');
assert(!!volunteerDataSource
    && volunteerDataSource.words.map(nfc).join('|') === volunteerDataWords.join('|'),
  'its source record preserves all 21 requested headwords in order');
const volunteerDataEntries = volunteerDataWords
  .map((ko) => words.find((word) => nfc(word.ko) === ko))
  .filter(Boolean);
assert(volunteerDataEntries.length === volunteerDataWords.length,
  'all 21 volunteer, application and chart headwords are available in the TOPIK map');
assert(volunteerDataWords.every((ko) => kos.filter((listed) => listed === ko).length === 1),
  'each requested headword appears exactly once, including the reused 이상 entry');
assert(volunteerDataEntries.every((word) => nfc(word.example) && nfc(word.exampleEn)),
  'every requested headword has an original Korean example and an English explanation');
assert(volunteerDataEntries.filter((word) => word.ko !== '이상')
  .every((word) => ['봉사·모집', '자료 해석'].includes(word.category)),
  'the 20 appended entries are grouped for recruitment reading or chart interpretation');

// ── 2. The question bank ─────────────────────────────────────────────────────
console.log('\n--- 2. The question bank ---');
assert(bank.id === 'topik2-questions', 'the bank names itself topik2-questions');
assert(bank.titleKo === '기출 문제', 'and the desk labels it 기출 문제');
assert(Array.isArray(bank.exercises), 'it holds an exercises array');
const gids = exercises.map((e) => e.id);
assert(new Set(gids).size === gids.length, 'no two question groups share an id');
const problems = [];
rows.forEach(({ ex, it }) => {
  const at = ex.id + ' row ' + (it.n || '?');
  if (!it.en || !it.why || !it.grammar) problems.push(at + ': missing en / why / grammar');
  // The explanation is what this world is FOR. A one-line why is a question filed, not taught.
  if (String(it.why || '').length < 80) problems.push(at + ': why is too thin to teach from');
  const sets = (it.choices2 || it.answer2) ? 2 : 1;
  const gaps = (it.lines || []).reduce((n, l) => n + String(l.ko || '').split('{}').length - 1, 0);
  if (gaps !== sets) problems.push(at + ': ' + gaps + ' blanks for ' + sets + ' choice sets');
  if (!(it.choices || []).some((c) => c.id === it.answer)) problems.push(at + ': answer not among its choices');
  // TOPIK prints four options, always. Three means a transcription dropped one.
  if ((it.choices || []).length !== 4) problems.push(at + ': ' + (it.choices || []).length + ' choices, not 4');
  const texts = (it.choices || []).map((c) => nfc(c.ko));
  if (new Set(texts).size !== texts.length) problems.push(at + ': repeats a choice');
});
assert(problems.length === 0, 'every question is four-choice, answerable and explained'
  + (problems.length ? ' — ' + problems.slice(0, 5).join('; ') : ''));
console.log('        (' + exercises.length + ' question groups, ' + rows.length + ' questions so far)');

// ── 3. Overlapping vocabulary is allowed, and costs nothing ──────────────────
// The rule for this world, stated as a test so it survives a later tidy-up: a word already
// taught in levels.json or in a unit MAY be listed here too. What follows proves the two
// mechanisms that make that free rather than merely tolerated.
console.log('\n--- 3. Overlap with the rest of the game is deliberate ---');
const levels = readJson('levels.json');
const elsewhere = new Set(levels.flatMap((l) => (l.words || []).map((w) => nfc(w.ko))));
['2b-unit-10', '2b-unit-11', '2b-unit-13', '2b-unit-14'].forEach((u) => {
  readJson('worlds/' + u + '.json').level.words.forEach((w) => elsewhere.add(nfc(w.ko)));
});
const overlap = kos.filter((k) => elsewhere.has(k));
assert(true, 'the exam world repeats ' + overlap.length + ' word(s) taught elsewhere — allowed by design');

// srsData is keyed by the Korean word alone, so the same word in two lists is one card.
const srsKeyed = extract('let srsData  = {}', ';', 'srsData declaration');
assert(/srsData\s+=\s+\{\}/.test(srsKeyed) && src.indexOf('srsData[ko]') >= 0,
  'srsData is keyed by the Korean word, so a repeat shares one card rather than making a second');

// And srsDueWords() dedupes before planting, so a repeat is never planted twice.
const dueSrc = extract('function srsDueWords(', 'return out;', 'srsDueWords') + '\n}';
const ctx = {
  console,
  unlockedLevels: [0, 1],
  levelsData: [
    { words: [{ ko: '사람', en: 'person' }, { ko: '학교', en: 'school' }] },
    { words: [{ ko: '사람', en: 'person' }, { ko: '시험', en: 'exam' }] }   // the exam world
  ],
  srsData: {
    '사람': { m: { type: { due: 10 } } },
    '학교': { m: { type: { due: 20 } } },
    '시험': { m: { type: { due: 5 } } }
  },
  dueModality: (ko) => (ctx.srsData[ko] ? 'type' : null)
};
vm.createContext(ctx);
vm.runInContext(dueSrc, ctx);
const due = vm.runInContext('srsDueWords(1000)', ctx);
assert(due.length === 3, 'a word in two lists comes back once, not twice (' + due.length + ' entries for 4 listings)');
assert(due.filter((d) => d.word.ko === '사람').length === 1, 'and 사람 specifically appears exactly once');
assert(due.map((d) => d.word.ko).join(',') === '시험,사람,학교', 'still sorted by due date, soonest first');

// ── 4. The two traps this world found ────────────────────────────────────────
console.log('\n--- 4. The two traps this world found ---');
// (a) deskQuizUrl used to end in a bare return of Unit 10's quiz.
const dqAt = src.indexOf('function deskQuizUrl()');
const dqBody = dqAt >= 0 ? src.slice(dqAt, src.indexOf('function loadDeskQuiz', dqAt)) : '';
assert(dqBody.length > 0, 'deskQuizUrl is where it is expected to be');
const unguarded = dqBody.split(/\r?\n/)
  .filter((l) => /return '\/worlds\//.test(l) && !/is[A-Za-z0-9]+World\(\)/.test(l));
assert(unguarded.length === 0, 'every quiz url it returns is guarded by that world\'s own test'
  + (unguarded.length ? ' — ' + unguarded.map((l) => l.trim()).join(' | ') : ''));
assert(/return null;/.test(dqBody), 'and a world with no quiz of its own gets null');
assert(/if \(deskQuizUrl\(\)\) \{/.test(src), 'the desk only builds a 퀴즈 row when there is a quiz to open');
// The exam world had no quiz of its own when this test was written, which is what made it
// the case the bare return would have broken. It has one now, so the check moved with the
// fact: what still has to be true is that the desk serves the exam world its own quiz and
// not another world's.
assert(/isTopikWorld\(\)\) return '\/worlds\/topik2-desk-quiz\.json'/.test(dqBody),
  'the exam desk is served its own quiz, guarded by its own world test');
assert(fs.existsSync(path.join(ROOT, 'worlds', 'topik2-desk-quiz.json')),
  'and that quiz file is on disk');
assert(!/isTopikWorld\(\)\) return '\/worlds\/unit\d+-desk-quiz/.test(dqBody),
  'and never a unit quiz — that was the bug');

// (b) an empty world word list used to make _pickWord() hand back undefined.
// Sliced between two function names — no newline in either marker, for the reason given at
// the top of this file.
const gAt = src.indexOf('function getUnlockedWords()');
const gEnd = src.indexOf('function addCoins(', gAt);
assert(gAt >= 0 && gEnd > gAt, 'getUnlockedWords is where it is expected to be');
const guardSrc = src.slice(gAt, gEnd);
const ctx2 = {
  console,
  unlockedLevels: [0, 1],
  levelsData: [
    { words: [{ ko: '사람' }, { ko: '학교' }] },
    { world: true, worldId: 'topik-2', words: [] }
  ],
  isWorldLevel: (lvl) => !!(lvl && (lvl.world || lvl.worldId)),
  currentLesson: () => ctx2.levelsData[ctx2.i]
};
ctx2.i = 1;
vm.createContext(ctx2);
vm.runInContext(guardSrc, ctx2);
const empty = vm.runInContext('getUnlockedWords()', ctx2);
assert(empty.length === 2, 'standing on a world with no words yet still yields a plantable pool ('
  + empty.length + ')');
ctx2.levelsData[1].words = [{ ko: '시험' }];
const seeded = vm.runInContext('getUnlockedWords()', ctx2);
assert(seeded.length === 1 && seeded[0].ko === '시험',
  'and once the world has its own words it farms those, exactly as before');
ctx2.i = 0;
const valley = vm.runInContext('getUnlockedWords()', ctx2);
assert(valley.length === 2 && valley.every((w) => w.ko !== '시험'),
  'a plain level still farms the non-world levels only');

// ── 5. Wiring ────────────────────────────────────────────────────────────────
console.log('\n--- 5. Wiring ---');
assert(/function isTopikWorld\(\)/.test(src) && src.indexOf("worldId === 'topik-2'") >= 0,
  'isTopikWorld tests the world id');
assert(src.indexOf("isTopikWorld()) return '/worlds/topik2-questions.json'") >= 0,
  'topikBankUrl resolves the exam world to its own bank');
assert(src.indexOf("file: 'worlds/topik-2.json'") >= 0,
  'the world is fetched alongside the textbook worlds');
assert(/key: 'topik'/.test(src), 'the desk builds a row for it');
const { WORKBOOKS, workbookRel } = require(path.join(ROOT, 'admin', 'lib', 'workbook.js'));
assert(workbookRel('topik2-questions').split(path.sep).join('/') === 'worlds/topik2-questions.json',
  'the admin registry resolves the bank to this file and no other');
const targets = Object.values(WORKBOOKS).map((r) => r.split(path.sep).join('/'));
assert(new Set(targets).size === targets.length, 'and no two registry keys point at the same file');
const { collectUploadFiles } = require(path.join(ROOT, 'scripts', 'r2Content.js'));
const batch = new Set(collectUploadFiles(ROOT).map((x) => x.rel.split(path.sep).join('/')));
assert(batch.has('worlds/topik-2.json') && batch.has('worlds/topik2-questions.json'),
  'both files publish to the CDN');

// ── 6. The two study aids ────────────────────────────────────────────────────
// Both are one line from being silently inert — a gloss pass nobody calls, a bank flag
// nothing reads — and neither failure looks like an error. So the index is built here with
// the shipped code and pointed at the shipped question.
console.log('\n--- 6. The study aids ---');
const badForms = [];
words.forEach((w) => {
  if (w.forms === undefined) return;
  if (!Array.isArray(w.forms) || !w.forms.length) { badForms.push(w.ko + ': not a non-empty array'); return; }
  w.forms.forEach((f) => {
    // The index drops anything under two characters, so a shorter form is dead weight
    // that reads as though it works.
    if (typeof f !== 'string' || f.trim().length < 2) badForms.push(w.ko + ': "' + f + '"');
  });
});
assert(badForms.length === 0, 'every listed surface form is long enough to match'
  + (badForms.length ? ' — ' + badForms.join(', ') : ''));

const glossSrc = src.slice(src.indexOf('let wbGlossIndex = null;'), src.indexOf('function wbApplyGloss('));
assert(glossSrc.length > 0 && glossSrc.indexOf('function wbGlossTable(') >= 0,
  'the gloss index builder is where it is expected to be');
const gctx = { console, currentLesson: () => ({ words }) };
vm.createContext(gctx);
vm.runInContext(glossSrc, gctx);
const idx = vm.runInContext('wbGlossTable()', gctx);
assert(!!idx, 'the exam world builds a gloss index from its own word list');
if (idx) {
  const hits = (text) => {
    idx.re.lastIndex = 0;
    return (String(text).match(idx.re) || []);
  };
  // The words this question actually turns on. If the index misses these it is decoration.
  const headline = rows.length ? rows[0].it.lines[0].ko : '';
  const onHeadline = hits(headline);
  ['썰렁한', '재래시장', '배달', '출구', '모색'].forEach((k) =>
    assert(onHeadline.includes(k), 'the headline glosses ' + k));
  // 썰렁하다 never appears as 썰렁하다 — it turns up as 썰렁한 — so a headword alone would
  // have missed the single hardest word on the page. That is what `forms` is for.
  assert(!headline.includes('썰렁하다') && onHeadline.includes('썰렁한'),
    'and it does so through a listed surface form, not the dictionary form');
  // Longest match wins, or a compound gets explained as its tail.
  assert(onHeadline.includes('재래시장') && !onHeadline.includes('시장'),
    '재래시장 is glossed whole rather than as 시장');
  const perOption = (rows.length ? rows[0].it.choices : []).map((c) => hits(c.ko).length);
  assert(perOption.every((n) => n >= 3),
    'every option carries at least three glossed words (' + perOption.join(', ') + ')');
  const singles = [...idx.map.keys()].filter((k) => k.length < 2);
  assert(singles.length === 0, 'no single-character key ever enters the index'
    + (singles.length ? ' — ' + singles.join(', ') : ''));
  assert(idx.map.get('경기') && /business|trade/i.test(idx.map.get('경기')),
    '경기 is glossed as trade rather than as a sports match — the sense this paper uses');
}
assert(bank.holdGloss === true, 'the exam bank holds its translation back until a row is checked');
assert(src.indexOf('st.bank && st.bank.holdGloss') >= 0 && src.indexOf("holdGloss ? '' :") >= 0,
  'and the renderer honours that flag');
assert(src.indexOf('wbApplyGloss(explain);') >= 0, 'the answer view runs the gloss pass');
const css = read('css/game.css');
assert(css.indexOf('content: attr(data-gl)') >= 0 && css.indexOf('.wb-gl:focus-visible::after') >= 0,
  'the tooltip is drawn, and reachable by keyboard as well as by mouse');

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_topik_map: all passed');
