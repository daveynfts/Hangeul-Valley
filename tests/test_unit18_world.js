'use strict';
/**
 * tests/test_unit18_world.js — 2B Unit 18 (한국에 온 지 벌써 6개월이 되었어요): the map, the
 * word list, and the forty-three headwords it had to hand back.
 *
 * The book's last chapter is about time having passed, and so it uses words every earlier
 * chapter already taught. 벌써, 서로, 지내다 and 항상 are Unit 10's; 계속, 웃다, 식사 and
 * 동호회 are Unit 11's; 즐겁다 and 회사원 are Unit 12's; 연락하다, 생활하다, 어울리다 and
 * 구경하다 are Unit 13's; 기억에 남다 — one of this chapter's own five 어휘 — is Unit 14's; and
 * 계절, 날씨, 봄, 여름 and 겨울 are all already in the exam world. SRS state is keyed by the
 * Korean, so a headword owned twice is one review schedule shared between two farms with
 * nothing on screen to say so, and the rule has been that the earlier unit keeps it.
 *
 * Handing a word back quietly is how a chapter ends up teaching less than it prints, so each
 * one is asserted: that Unit 18 leaves it alone, and that the unit it was left to still has
 * it. Where 18과's own pages print a longer phrase — 가장 기억에 남다, 계절의 변화, 울고 웃다,
 * 계속 연락하다 — that is what this farm takes instead, and section 5 checks the substitute
 * is here as well as that the original is not. Twenty of the forty-three have no phrase of
 * their own in the chapter and are simply left where they are.
 *
 * The rest is the shape every world file has to hold:
 *
 *   1. The list is the whole chapter, not its 어휘 pages — the 말하기 2 passage, both 듣기
 *      지문 at the back of the book, the 읽기 speech, the 익힘책's passages and 문화 산책's frame.
 *   2. Every example is a sentence printed in 18과, and provable by the repo's own
 *      sentenceUses(). This chapter is the plain style, and the conjugator does not build
 *      핀다 from 피다 or 흘리셨다 from 흘리다 — so a quarter of the rows ship without an
 *      example rather than with a sentence rewritten to get past the checker.
 *   3. The unit is playable before a single icon is drawn — a hint emoji on every word.
 *
 * Run: node tests/test_unit18_world.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const world = JSON.parse(read(path.join('worlds', '2b-unit-18.json')));
const lvl = world.level || {};
const words = lvl.words || [];
const mine = new Set(words.map((w) => w.ko));

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

console.log('====================================================');
console.log('2B UNIT 18 · 18과 한국에 온 지 벌써 6개월이 되었어요');
console.log('====================================================');

// ── 1. The world file ────────────────────────────────────────────────────────
console.log('\n--- 1. The world file ---');
assert(world.id === '2b-unit-18', 'the world names itself');
assert(world.pack === 'snu-2b', 'and belongs to the 2B pack');
assert(world.titleKo === '18과 한국에 온 지 벌써 6개월이 되었어요', 'the Korean title is the chapter’s own');
assert(/Unit 18/.test(world.source || ''), 'and it says which book it came from');
assert(lvl.worldId === '2b-unit-18' && lvl.world === true, 'the level is a world, not a valley level');
assert(lvl.level === '2B-18', 'and is numbered 2B-18');
assert(lvl.target === 9, 'nine harvests clear it, the same as every other 2B chapter');

// ── 2. The map is the basic farm plus two stations ───────────────────────────
console.log('\n--- 2. The map ---');
assert(JSON.stringify(lvl.map) === JSON.stringify({ extras: [], stations: ['desk', 'cassette'] }),
  'the farm carries a study desk and a cassette player and nothing else: ' + JSON.stringify(lvl.map));
const econ = read(path.join('js', 'systems', 'economy.js'));
assert(/'2b-unit-18': \{ extras: \[\], stations: \['desk', 'cassette'\] \}/.test(econ),
  'and the runtime pack agrees');

// ── 3. The word list is the whole chapter ────────────────────────────────────
console.log('\n--- 3. The word list ---');
assert(words.length === 108, '108 headwords (found ' + words.length + ')');
const GROUPS = {
  '감정': 11, '계절과 날씨': 28, '문법과 표현': 31, '말하기': 7,
  '듣고 말하기': 15, '읽고 쓰기': 8, '과제': 3, '문화와 발음': 5
};
const counts = {};
words.forEach((w) => { counts[w.category] = (counts[w.category] || 0) + 1; });
assert(Object.keys(counts).join('|') === Object.keys(GROUPS).join('|'),
  'eight groups, in the order the chapter prints its sections (' + Object.keys(counts).join(', ') + ')');
const offBy = Object.keys(GROUPS).filter((k) => counts[k] !== GROUPS[k])
  .map((k) => k + ' ' + counts[k] + '≠' + GROUPS[k]);
assert(offBy.length === 0, 'and each holds what it should' + (offBy.length ? ' — ' + offBy.join(', ') : ''));
const beyondVocab = words.filter((w) => w.category !== '감정' && w.category !== '계절과 날씨').length;
assert(beyondVocab === 69, '69 of the 108 come from outside the two 어휘 pages (found ' + beyondVocab + ')');
const dup = Object.entries(words.reduce((a, w) => { a[w.ko] = (a[w.ko] || 0) + 1; return a; }, {}))
  .filter(([, n]) => n > 1).map(([k]) => k);
assert(dup.length === 0, 'no headword appears twice' + (dup.length ? ' — ' + dup.join(', ') : ''));
const noEn = words.filter((w) => !w.en || !w.categoryEn).map((w) => w.ko);
assert(noEn.length === 0, 'every word carries English and an English group name'
  + (noEn.length ? ' — ' + noEn.slice(0, 4).join(', ') : ''));
// The seventeen 어휘 the 복습 6 page lists for 18과 — five feelings and twelve kinds of weather.
// 기억에 남다 is Unit 14's, so the one this farm carries is the chapter's own 가장 기억에 남다.
const OFFICIAL = ['그립다', '아쉽다', '정(이) 들다', '후회가 되다', '가장 기억에 남다',
  '꽃이 피다', '바람이 불다', '건조하다', '장마가 시작되다', '태풍이 오다', '습도가 높다',
  '단풍이 들다', '나뭇잎이 떨어지다', '쌀쌀하다', '얼음이 얼다', '눈이 내리다', '기온이 영하로 내려가다'];
const noOfficial = OFFICIAL.filter((k) => !mine.has(k));
assert(noOfficial.length === 0, 'all seventeen of the chapter’s own 어휘 are here'
  + (noOfficial.length ? ' — missing ' + noOfficial.join(', ') : ''));

// ── 4. The four grammar points ───────────────────────────────────────────────
console.log('\n--- 4. The grammar the chapter is for ---');
['V-(으)ㄴ 지', 'N(이)나 2', 'A-다, V-ㄴ다/는다', 'N(이)다'].forEach((g) => {
  assert(mine.has(g), 'the list farms ' + g);
});
// N(이)나 2 is the book's own label — the second meaning, surprise at a large amount — and it
// must not be confused with Unit 15's N(이)나, the one that means "or".
assert(!mine.has('N(이)나'), 'and leaves Unit 15’s N(이)나 where it is');

// ── 5. No word leaks between units ───────────────────────────────────────────
console.log('\n--- 5. No word leaks between units ---');
const owner = new Map();
['2b-unit-10', '2b-unit-11', '2b-unit-12', '2b-unit-13', '2b-unit-14', '2b-unit-15',
  '2b-unit-16', '2b-unit-17', 'topik-2'].forEach((other) => {
    const f = path.join(ROOT, 'worlds', other + '.json');
    if (!fs.existsSync(f)) { assert(false, other + '.json is on disk'); return; }
    const o = JSON.parse(fs.readFileSync(f, 'utf8'));
    const lvls = Array.isArray(o.level) ? o.level : [o.level];
    const theirs = new Set();
    lvls.forEach((l) => ((l && l.words) || []).forEach((x) => { if (x && x.ko) theirs.add(x.ko); }));
    theirs.forEach((k) => { if (!owner.has(k)) owner.set(k, other); });
    const shared = [...theirs].filter((k) => mine.has(k));
    assert(shared.length === 0, 'Unit 18 shares no headword with ' + other
      + (shared.length ? ' — ' + shared.join(', ') : ''));
  });
assert(owner.size > 1700, 'the other worlds between them own ' + owner.size + ' headwords');

// Every bare word 18과 uses that somebody else already farms. Where the chapter prints a
// phrase of its own, the third column is what 18과 takes instead — asserted three ways, so a
// later edit cannot quietly drop either half. Where it prints none, the word is simply left.
const INSTEAD = [
  ['기억에 남다', '2b-unit-14', '가장 기억에 남다'],
  ['남다', '2b-unit-14', '가장 기억에 남다'],
  ['계절', 'topik-2', '사계절'],
  ['변화', 'topik-2', '계절의 변화'],
  ['봄', 'topik-2', '꽃이 피다'],
  ['여름', 'topik-2', '장마'],
  ['겨울', 'topik-2', '눈이 내리다'],
  ['날씨', 'topik-2', '기온이 영하로 내려가다'],
  ['방송', 'topik-2', '방송을 시작하다'],
  ['울다', 'topik-2', '울고 웃다'],
  ['웃다', '2b-unit-11', '울고 웃다'],
  ['되다', 'topik-2', '후회가 되다'],
  ['N(이)나', '2b-unit-15', 'N(이)나 2'],
  ['졸업하다', '2b-unit-15', '대학교를 졸업하다'],
  ['복잡하다', '2b-unit-14', '막히다'],
  ['가족처럼', '2b-unit-13', '대하다'],
  ['즐겁다', '2b-unit-12', '즐겁게 생활하다'],
  ['생활하다', '2b-unit-13', '즐겁게 생활하다'],
  ['어울리다', '2b-unit-13', '계절에 어울리다'],
  ['계속', '2b-unit-11', '계속 연락하다'],
  ['연락하다', '2b-unit-13', '계속 연락하다'],
  ['동호회', '2b-unit-11', '가입하다'],
  ['동호회에 가입하다', '2b-unit-17', '가입하다'],
  ['매우', 'topik-2', null], ['얇다', 'topik-2', null], ['벌써', '2b-unit-10', null],
  ['서로', '2b-unit-10', null], ['지내다', '2b-unit-10', null], ['항상', '2b-unit-10', null],
  ['식사', '2b-unit-11', null], ['싸우다', '2b-unit-11', null], ['회사원', '2b-unit-12', null],
  ['가족사진', '2b-unit-12', null], ['편하다', '2b-unit-13', null], ['구경하다', '2b-unit-13', null],
  ['부산', '2b-unit-14', null], ['담배를 피우다', '2b-unit-14', null], ['얼마나', '2b-unit-15', null],
  ['그동안', '2b-unit-15', null], ['앞으로', '2b-unit-15', null], ['다니다', '2b-unit-15', null],
  ['서두르다', '2b-unit-16', null], ['두껍다', '2b-unit-16', null]
];
assert(INSTEAD.length === 43, 'forty-three words were handed back (' + INSTEAD.length + ')');
assert(INSTEAD.filter((r) => r[2]).length === 23, 'twenty-three of them for a phrase the chapter prints');
INSTEAD.forEach(([bare, unit, sub]) => {
  const ok = !mine.has(bare) && owner.get(bare) === unit && (!sub || mine.has(sub));
  assert(ok, bare + ' stays with ' + unit + (sub ? ', and 18과 teaches ' + sub : '')
    + (ok ? '' : ' — ' + (mine.has(bare) ? '18과 has the bare word; ' : '')
      + (owner.get(bare) === unit ? '' : 'owner is ' + (owner.get(bare) || 'nobody') + '; ')
      + (!sub || mine.has(sub) ? '' : 'no ' + sub)));
});

// ── 6. The examples are the book's, and provable ─────────────────────────────
console.log('\n--- 6. The examples ---');
const { sentenceUses } = require(path.join(ROOT, 'scripts', 'vocab_examples.js'));
const withEx = words.filter((w) => w.example);
assert(withEx.length === 83, '83 of the 108 carry an example sentence (' + withEx.length + ')');
const unprovable = withEx.filter((w) => !sentenceUses(w.example, w.ko)).map((w) => w.ko);
assert(unprovable.length === 0,
  'and every one of them contains its own headword, by the repo’s own sentenceUses()'
  + (unprovable.length ? ' — ' + unprovable.slice(0, 5).join(', ') : ''));
const noGloss = withEx.filter((w) => !w.exampleEn).map((w) => w.ko);
assert(noGloss.length === 0, 'each example is glossed'
  + (noGloss.length ? ' — ' + noGloss.slice(0, 4).join(', ') : ''));
const blankButGlossed = words.filter((w) => !w.example && w.exampleEn).map((w) => w.ko);
assert(blankButGlossed.length === 0, 'and no row carries a gloss for an example it does not have'
  + (blankButGlossed.length ? ' — ' + blankButGlossed.join(', ') : ''));
// The four grammar labels are notation, not words, so sentenceUses() needs a pattern for each.
// These are the four this unit added to vocab_examples.js, each tried on a sentence that must
// pass and one that must not — V-(으)ㄴ 지 against the 지 of 하지 않다, the plain style against
// 합니다, the copula against a plain verb.
[['V-(으)ㄴ 지', '한국에 온 지 벌써 네 달 됐어요.', '저는 매일 운동하지 않아요.'],
  ['N(이)나 2', '아니에요. 두 그릇이나 먹었어요.', '저는 빵을 먹었어요.'],
  ['A-다, V-ㄴ다/는다', '시간이 빨리 지나간다.', '시간이 빨리 지나갑니다.'],
  ['N(이)다', '내일부터 방학이다.', '시간이 빨리 지나간다.']].forEach(([g, yes, no]) => {
  assert(sentenceUses(yes, g) && !sentenceUses(no, g),
    g + ' is recognised in «' + yes + '» and not in «' + no + '»');
});
// Nothing here was rewritten into 해요체 to get past the checker. The weather rows that do carry
// one carry the 익힘책's own dialogue — 요즘 산에 단풍이 들어서 참 아름다워요 is printed on p.167.
const bloom = words.find((w) => w.ko === '꽃이 피다') || {};
assert(!bloom.example, '꽃이 피다 ships bare: every sentence the book prints it in is one the checker cannot read');

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
assert(/Unit 18/.test(nb.title || ''), 'the notebook names the chapter');
const nbCats = (nb.groups || []).map((g) => g.cat);
assert(nbCats.join('|') === Object.keys(GROUPS).join('|'),
  'and lists the same eight groups in the same order (' + nbCats.join(', ') + ')');
const orphanCat = nbCats.filter((c) => !counts[c]);
assert(orphanCat.length === 0, 'with no group the word list has nothing in'
  + (orphanCat.length ? ' — ' + orphanCat.join(', ') : ''));

// ── 9. The tools that have to know it exists ─────────────────────────────────
console.log('\n--- 9. Wiring ---');
assert(econ.indexOf("file: 'worlds/2b-unit-18.json'") >= 0, 'the world loads at boot');
assert(/function isUnit18World\(\)[\s\S]{0,180}worldId === '2b-unit-18'/.test(econ),
  'isUnit18World is declared and is Unit-18-only');
assert(/id === '2b-unit-18'/.test(econ), 'and the farm gets the desk and the cassette player’s art');
const ui = read(path.join('js', 'ui.js'));
[['desk quiz', 'unit18-desk-quiz'], ['익힘책', 'unit18-workbook'],
  ['교과서', 'unit18-textbook'], ['tape', 'unit18-cassette']].forEach(([label, file]) => {
    assert(ui.indexOf("isUnit18World()) return '/worlds/" + file + ".json'") >= 0,
      'the ' + label + ' resolves to ' + file + '.json');
  });
assert(read(path.join('js', 'i18n.js')).indexOf("'worlds/2b-unit-18.json'") >= 0,
  'the word list is a translatable source');
assert(read(path.join('scripts', 'ttsClips.js')).indexOf("'worlds/2b-unit-18.json'") >= 0,
  'and the TTS harvest knows about it');
assert(read(path.join('admin', 'lib', 'content.js')).indexOf("id: '2b-unit-18'") >= 0,
  'the admin panel can open it');
const { collectUploadFiles } = require(path.join(ROOT, 'scripts', 'r2Content.js'));
const batch = new Set(collectUploadFiles(ROOT).map((x) => x.rel.replace(/\\/g, '/')));
assert(batch.has('worlds/2b-unit-18.json'), 'and the world file publishes');

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_unit18_world: all passed');
