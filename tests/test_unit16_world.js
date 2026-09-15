'use strict';
/**
 * tests/test_unit16_world.js — 2B Unit 16 (설날에는 밥 대신 떡국을 먹어요): the map, the
 * word list, and the eighteen headwords it had to hand back.
 *
 * Unit 16 is the holidays chapter, and holidays are where a language repeats itself. 소금
 * and 간장 were Unit 10's and Unit 11's the first time someone cooked; 여권 and 어른 were
 * Unit 14's; 장을 보다 is Unit 13's and 정리(를) 하다 is Unit 12's, both off *their* 어휘
 * pages, both printed again on p.161 as if new. SRS state is keyed by the Korean, so a
 * headword owned twice is one review schedule shared between two farms with nothing on
 * screen to say so, and the rule has been that the earlier unit keeps it.
 *
 * Handing a word back quietly is how a chapter ends up teaching less than it prints, so
 * each one is asserted twice: that Unit 16 leaves it alone, and that the unit it was left
 * to still has it. Where the chapter's own pages print a longer collocation — 소금을 넣다,
 * 고향에 내려가다, 윷놀이 규칙 — that is what this farm takes instead, and section 5 checks
 * the substitute is here as well as that the original is not.
 *
 * The rest is the shape every world file has to hold:
 *
 *   1. The list is the whole chapter, not its 어휘 pages. A third of Unit 16's vocabulary
 *      is in the footnote glossaries, the 읽기 passage on p.172 and the two 듣기 지문 at
 *      the back of the book (printed p.265).
 *   2. Every example is a sentence printed in 16과, and provable: the repo's own
 *      sentenceUses() is what validate_content runs, so it is what runs here.
 *   3. The unit is playable before a single icon is drawn — a hint emoji on every word.
 *
 * There is no desk quiz yet, so nothing here asserts one. What is asserted is that the
 * farm resolves to the desk and the cassette player, because a world with a station and
 * no bank behind it is the next failure in line.
 *
 * Run: node tests/test_unit16_world.js
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

const world = readJson('worlds/2b-unit-16.json');
const econ = read('js/systems/economy.js');
const farm = read('js/scenes/farm.js');
const words = world.level.words || [];
const ko = new Set(words.map((w) => nfc(w.ko)));

console.log('====================================================');
console.log('2B UNIT 16 · 설날에는 밥 대신 떡국을 먹어요');
console.log('====================================================');

// ── 1. The world file ────────────────────────────────────────────────────────
console.log('\n--- 1. The world file ---');
assert(world.id === '2b-unit-16', 'world id is 2b-unit-16');
assert(world.pack === 'snu-2b', 'belongs to the SNU 2B pack');
assert(world.level.worldId === '2b-unit-16', 'level carries the same worldId');
assert(world.level.world === true, 'level is flagged as a textbook world');
assert(world.titleKo.indexOf('16과') === 0, 'Korean title opens with the chapter number');
assert(nfc(world.level.name) === nfc('설날에는 밥 대신 떡국을 먹어요'),
  'and names the chapter, which is also its N 대신 example sentence');
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
assert(words.length === 133, 'the list holds 133 words (' + words.length + ')');
const incomplete = words.filter((w) => !w.ko || !w.en || !w.category || !w.categoryEn).map((w) => w.ko || '?');
assert(incomplete.length === 0,
  'every word has ko / en / category / categoryEn'
  + (incomplete.length ? ' — ' + incomplete.slice(0, 5).join(', ') : ''));
const dups = words.map((w) => nfc(w.ko)).filter((k, i, a) => a.indexOf(k) !== i);
assert(dups.length === 0, 'no headword repeats' + (dups.length ? ' — ' + dups.join(', ') : ''));

// One group per section the chapter teaches vocabulary in. Counts per group are not pinned
// — the split can move — but the sections are, because a missing group is a page of the
// chapter nobody harvested.
const SECTIONS = ['명절', '집안일', '문법과 표현', '말하기', '듣고 말하기', '읽고 쓰기', '과제', '문화와 발음'];
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
  '어휘 1 · 명절에 하는 일 (p.160)': ['한복을 입다', '고향에 가다', '세배(를) 하다',
    '성묘(를) 하다', '차례를 지내다', '윷놀이(를) 하다'],
  '어휘 2 · 명절 음식 (p.160)': ['떡국', '빈대떡', '송편', '한과', '식혜'],
  '어휘 3 · 집안일 (p.161)': ['방을 닦다', '설거지(를) 하다', '세탁기를 돌리다', '청소기를 돌리다'],
  'V-아/어 놓다 예문 (p.162)': ['예매하다', '창문을 열다'],
  'N 대신 연습 · 보기 and items (p.163)': ['소금을 넣다', '간장을 넣다', '여권을 보여 주다',
    '택시비', '현금', '주소를 쓰다'],
  '말하기 1 glossary (p.164)': ['연휴', '명절', '음식을 차리다'],
  '말하기 1 연습 (pp.164-165)': ['기차표', '설날', '추석', '끓이다', '음력'],
  'V-(으)ㄹ까 하다 예문 (p.166)': ['여름휴가', '가까운 곳'],
  'A/V-(으)ㄹ 테니까 예문 and 연습 (p.167)': ['두껍다', '수업 중', '비행기 표', '환전',
    '가이드북', '여행 준비', '호텔을 알아보다'],
  '말하기 2 glossary and 연습 (p.168)': ['빈대떡을 부치다', '재료를 미리 사다', '반 친구',
    '장을 미리 보다', '가르쳐 주다'],
  '말하기 1·2 연습2 (pp.165, 169)': ['송별회', '의논하다', '전화로 예약하다', '연락(을) 하다'],
  '듣고 말하기 (pp.170-171)': ['곤란한 부탁', '맡아 주다', '고양이', '발표 원고',
    '부탁', '부탁을 들어주다', '거절을 하다'],
  '듣기 지문 · 16과 (printed p.265)': ['서울역', '앵커', '형님', '도와 드리다', '다녀오다',
    '말씀', '고양이를 맡기다', '큰일이다', '잘 봐 주다', '필요한 것'],
  '읽기 · 추석 glossary and passage (p.172)': ['농사', '조상', '추수하다', '곡식', '나눠 먹다',
    '강강술래', '보름달', '소원을 빌다', '씨름', '친척', '한 해', '추석날'],
  '과제 · 윷놀이 (p.174)': ['윷', '윷말', '던지다', '옮기다', '상대방', '잡히다',
    '편을 나누다', '윷놀이 규칙', '이긴 팀', '진 팀'],
  '문화 산책 · 강강술래 (p.175)': ['진도', '전통 놀이나 노래'],
  '발음 · 유음화 (p.176)': ['유음화', '생일날', '실내', '사물놀이 공연', '일 년', '날'],
  '익힘책 16과 (printed pp.138-149)': ['대청소를 하다', '밤늦게', '마트', '청소를 하다',
    '돈을 찾다', '종이에 쓰다', '냉장고에 넣다', '미리 사다', '문을 닫다', '해외여행',
    '국내 여행', '문자', '모자라다', '졸리다']
};
Object.entries(FROM_THE_BOOK).forEach(([page, list]) => {
  const gone = list.filter((k) => !ko.has(nfc(k)));
  assert(gone.length === 0, page + ' is complete' + (gone.length ? ' — missing: ' + gone.join(', ') : ''));
});

// The chapter's own checklist, printed at the top of 자기 평가 on p.177 as "다음 중 아는
// 단어에 √ 하세요". If the book thinks a learner should know these twelve by the end of the
// unit, the farm has to be able to teach them — except the two it handed back, which are
// named in section 5 with the rest.
const SELF_CHECK = ['성묘(를) 하다', '윷놀이(를) 하다', '차례를 지내다', '음식을 차리다',
  '명절', '조상', '떡국', '설거지(를) 하다', '방을 닦다'];
const uncheckable = SELF_CHECK.filter((k) => !ko.has(nfc(k)));
assert(uncheckable.length === 0,
  'every word 자기 평가 asks the learner to tick is farmable'
  + (uncheckable.length ? ' — missing: ' + uncheckable.join(', ') : ''));

// The four grammar points are the chapter, not decoration on it, and each is a headword of
// its own so the farm can quiz the form and not only the words it is made of. The 자기 평가
// on p.177 prints exactly these four in its answer box.
const GRAMMAR = ['V-아/어 놓다', 'N 대신', 'V-(으)ㄹ까 하다', 'A/V-(으)ㄹ 테니까'];
const noGrammar = GRAMMAR.filter((g) => !ko.has(nfc(g)));
assert(noGrammar.length === 0,
  'all four 문법과 표현 points are farmable' + (noGrammar.length ? ' — missing: ' + noGrammar.join(', ') : ''));
// The unit title is itself the N 대신 예문, so the two nouns it turns on have to be here.
assert(ko.has(nfc('떡국')) && ko.has(nfc('설날')),
  'and the two nouns the title sentence turns on came with them');

// ── 5. No word leaks between units ───────────────────────────────────────────
console.log('\n--- 5. No word leaks between units ---');
const NEIGHBOURS = [['2b-unit-10', 'Unit 10'], ['2b-unit-11', 'Unit 11'], ['2b-unit-12', 'Unit 12'],
  ['2b-unit-13', 'Unit 13'], ['2b-unit-14', 'Unit 14'], ['2b-unit-15', 'Unit 15']];
const ownedBy = {};
NEIGHBOURS.concat([['topik-2', 'TOPIK II']]).forEach(([id]) => {
  ownedBy[id] = new Set((readJson('worlds/' + id + '.json').level.words || []).map((w) => nfc(w.ko)));
});
NEIGHBOURS.forEach(([id, label]) => {
  const shared = [...ko].filter((k) => ownedBy[id].has(k));
  assert(shared.length === 0,
    'Unit 16 shares no headword with ' + label + (shared.length ? ' — shared: ' + shared.join(', ') : ''));
});
// The exam world is not a chapter and the repo already lets it overlap a unit or two —
// 오랜만에 is in both Unit 10 and TOPIK II, and was before this unit existed. Unit 16 still
// stays off it, because there is no reason to add the second case knowingly.
{
  const shared = [...ko].filter((k) => ownedBy['topik-2'].has(k));
  assert(shared.length === 0,
    'and none with the TOPIK II farm either' + (shared.length ? ' — shared: ' + shared.join(', ') : ''));
}

// Named rather than merely absent. Each of these is printed in 16과 and left out because
// an earlier unit already teaches it, and each line fails if that unit ever drops it —
// which is the moment Unit 16 would have to pick the word up.
const LEFT_TO_AN_EARLIER_UNIT = {
  '2b-unit-10': ['간장', '갖다 주다', '녹차', '미리', '예약하다', '삼계탕', '물냉면'],
  '2b-unit-11': ['소금', '기자', '이틀'],
  '2b-unit-12': ['정리(를) 하다', '오랫동안'],
  '2b-unit-13': ['장을 보다', '길이 막히다', '알아보다', '규칙', '교통편'],
  '2b-unit-14': ['어른', '여권', '곤란하다', '복잡하다', '공연'],
  'topik-2': ['내려가다', '거절하다', '맡기다', '시민', '밝다', '이웃', '나누다', '재료', '카메라', '맡다']
};
Object.entries(LEFT_TO_AN_EARLIER_UNIT).forEach(([id, list]) => {
  const orphaned = list.filter((k) => !ownedBy[id].has(nfc(k)));
  assert(orphaned.length === 0,
    'the words Unit 16 defers to ' + id + ' are still taught there'
    + (orphaned.length ? ' — now taught nowhere: ' + orphaned.join(', ') : ''));
  const taken = list.filter((k) => ko.has(nfc(k)));
  assert(taken.length === 0,
    'and Unit 16 has not quietly taken one back' + (taken.length ? ' — ' + taken.join(', ') : ''));
});

// Handing a word back is only acceptable if the chapter still teaches the thing, so where
// 16과 prints a longer collocation of its own that is what this farm owns. Each pair below
// is one deferred headword and the phrase the book gave in its place; if the replacement
// ever goes, the chapter is teaching neither.
const INSTEAD = [
  ['소금', '소금을 넣다', 'N 대신 연습 1 보기, p.163'],
  ['간장', '간장을 넣다', 'N 대신 연습 1 보기, p.163'],
  ['여권', '여권을 보여 주다', 'N 대신 연습 1 item, p.163'],
  ['어른', '어른들께 세배를 하다', '말하기 1 연습 1, p.164'],
  ['장을 보다', '장을 미리 보다', '말하기 2 연습 1, p.168'],
  ['재료', '재료를 미리 사다', '말하기 2 연습 1, p.168'],
  ['알아보다', '호텔을 알아보다', 'A/V-(으)ㄹ 테니까 연습 1 보기, p.167'],
  ['예약하다', '전화로 예약하다', '말하기 2 연습 2, p.169'],
  ['내려가다', '고향에 내려가다', '말하기 1, p.164'],
  ['거절하다', '거절을 하다', '듣고 말하기 준비, p.170'],
  ['곤란하다', '곤란한 부탁', '듣고 말하기 준비, p.170'],
  ['맡다', '맡아 주다', '듣기 2, printed p.265'],
  ['맡기다', '고양이를 맡기다', '듣기 2, printed p.265'],
  ['이틀', '이틀 동안', '듣기 2 question 1, p.170'],
  ['나누다', '나눠 먹다', '읽기 · 추석, p.172'],
  ['오랜만에', '오랜만에 만나다', '읽기 · 추석, p.172'],
  ['규칙', '윷놀이 규칙', '과제 · 윷놀이, p.174'],
  ['공연', '사물놀이 공연', '발음 연습 2, p.176']
];
const noStandIn = INSTEAD.filter(([, sub]) => !ko.has(nfc(sub))).map(([, sub]) => sub);
assert(noStandIn.length === 0,
  'each deferred headword left a printed collocation behind, and all ' + INSTEAD.length + ' are here'
  + (noStandIn.length ? ' — missing: ' + noStandIn.join(', ') : ''));
const stillBare = INSTEAD.filter(([orig]) => ko.has(nfc(orig))).map(([orig]) => orig);
assert(stillBare.length === 0,
  'and none of them is also here in its bare form' + (stillBare.length ? ' — ' + stillBare.join(', ') : ''));
// 정리(를) 하다 has no stand-in and that is the honest answer: p.161 prints it and nothing
// else, so Unit 12 keeps it and this chapter is one 어휘 item short. Said out loud here so
// it is a decision on the record rather than an omission.
assert(!ko.has(nfc('정리(를) 하다')) && ownedBy['2b-unit-12'].has(nfc('정리(를) 하다')),
  '정리(를) 하다 stays with Unit 12 — p.161 prints no other form of it for Unit 16 to take');

// ── 6. The examples are the book's, and provable ─────────────────────────────
// validate_content.js runs vocab_examples.sentenceUses() over every word list in CI, so
// that is the rule here rather than a second opinion that could disagree with it. It is
// deliberately conservative — its surface-form generator stops early on one-syllable open
// stems (하다, 주다, 보다), mis-builds the ㅂ and ㅎ finals (입다 → 이워, 넣다 → 내), and a
// headword printed with an optional particle in brackets can never match at all, because
// 세배(를) is not a string any sentence contains. Those rows ship bare, the way Unit 14's
// 야단(을) 맞다 and every one of Unit 15's grammar labels already do.
console.log('\n--- 6. The examples are the book’s, and provable ---');
const vocabExamples = require(path.join(ROOT, 'scripts', 'vocab_examples.js'));
const withExample = words.filter((w) => w.example);
assert(withExample.length >= 85,
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
// The grammar labels are the rows that legitimately have none: N 대신 is not a word, and a
// sentence beside it would be an example of whatever noun was chosen for it.
assert(GRAMMAR.every((g) => !words.find((w) => nfc(w.ko) === nfc(g)).example),
  'the four grammar labels carry no example, because a form is not a word');
// A headword written with an optional particle cannot be matched by sentenceUses, so if one
// ever arrives carrying an example it is an example that was never checked.
const bracketed = words.filter((w) => /\(.\)/.test(w.ko));
assert(bracketed.length > 0 && bracketed.every((w) => !w.example),
  'the ' + bracketed.length + ' headwords printed with an optional particle ship bare, '
  + 'because no sentence contains the bracket');

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
console.log('      icons in the catalog for Unit 16 words: ' + drawn.length + ' of ' + words.length
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
  levelsData: [{ nameEn: 'Daily Life' }, { worldId: '2b-unit-16', map }],
  currentLevelIndex: 1
};
ctx.currentLesson = function () { return ctx.levelsData[ctx.currentLevelIndex] || null; };
vm.createContext(ctx);
vm.runInContext(econ.slice(start, end), ctx);
const R = (expr) => vm.runInContext(expr, ctx);

assert(R("!!WORLD_PACKS['2b-unit-16']"), 'WORLD_PACKS has a 2b-unit-16 entry');
assert(R("WORLD_PACKS['2b-unit-16'].stations").join(',') === 'desk,cassette', 'the pack is desk plus cassette');
assert(R("WORLD_PACKS['2b-unit-16'].extras").length === 0, 'the pack has no valley extras');
assert(R('currentWorldPack().id') === '2b-unit-16', 'a Unit 16 lesson resolves to the Unit 16 pack');
assert(R("worldPackHas(null, 'station', 'desk')") === true, 'Unit 16 has the desk');
assert(R("worldPackHas(null, 'station', 'cassette')") === true, 'Unit 16 has the cassette player');
assert(R("worldPackHas(null, 'station', 'kitchen')") === false, 'Unit 16 has no kitchen');
assert(R("worldPackHas(null, 'extra', 'shop')") === false, 'Unit 16 has no shop');
assert(JSON.stringify(R("WORLD_PACKS['2b-unit-16'].stations")) === JSON.stringify(map.stations),
  'the JSON map and the runtime pack agree');

const art = R("artLoadForWorldPack('2b-unit-16')");
assert(art.some((a) => a.key === 'study_desk_hd'), 'Unit 16 boot loads the study desk art');
assert(art.some((a) => a.key === 'cassette_player_hd'), 'Unit 16 boot loads the reviewed cassette art');
assert(art.length === 2, 'two reviewed textures, not a copy of the Unit 10 list (' + art.length + ')');

assert(econ.indexOf("{ cache: 'world-2b-16', file: 'worlds/2b-unit-16.json' }") >= 0,
  'TEXTBOOK_WORLD_FILES lists the Unit 16 JSON for the non-Phaser load path');
assert(/function isUnit16World\(\)[\s\S]{0,180}worldId === '2b-unit-16'/.test(econ),
  'isUnit16World is declared and tests only Unit 16');
assert(/function isUnit15World\(\)[\s\S]{0,180}worldId === '2b-unit-15'/.test(econ),
  'and isUnit15World was not widened while adding it');

// ── 10. The farm scene ───────────────────────────────────────────────────────
console.log('\n--- 10. The farm scene ---');
assert(/TEXTBOOK_WORLD_FILES\.forEach\([\s\S]{0,200}this\.load\.json\(spec\.cache, spec\.file\)/.test(farm),
  'FarmScene preloads every world on the list, Unit 16 among them');
assert(/TEXTBOOK_WORLD_FILES\.forEach\([\s\S]{0,240}cache\.json\.exists\(spec\.cache\)[\s\S]{0,120}attachTextbookWorld/.test(farm),
  'and attaches every one of them, so the level select can list it');
assert(farm.indexOf("'world-2b-16'") < 0 && farm.indexOf("'2b-unit-16.json'") < 0,
  'without naming Unit 16 a second time, where the two lists could drift apart');

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
  assert(read(rel).indexOf('2b-unit-16') >= 0, what + ' lists Unit 16 (' + rel + ')');
});
assert(read('js/locales/catalogs.js').indexOf('worlds/2b-unit-16.json') >= 0,
  'and the generated catalog index carries it, so the Vietnamese file is actually loaded');

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
process.exit(failed ? 1 : 0);
