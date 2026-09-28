'use strict';
/**
 * tests/test_recipe_unit1.js — TOPIK II 합격 레시피, Unit 1 (3급 Chapter 1, 읽기 1-8).
 *
 * The world is the book's own questions, so the thing that most needs pinning is the key.
 * There are two kinds, and the bank says which each row has:
 *
 *   keySource 'book'     the eight 기출문제 (제60회 TOPIK II 읽기 1-8), whose 정답 and 해설 the
 *                        book prints beside them. Their keys are pinned here as printed.
 *   keySource 'ranking'  the seventy 예상문제. The book prints their answers in a separate
 *                        booklet (책 속의 책 · 정답과 해설) that the scanned PDF does not have,
 *                        so each was keyed from the book's own Ranking table, named in
 *                        rankingRef. This test re-derives every one of them from that row:
 *                        a grammar key is the one option built on the row's pattern, and an
 *                        ad key is the one option the row names.
 *
 * If the booklet turns up and disagrees with a derived key, the fix is the row and the pin
 * below together — never the pin alone.
 *
 * Run: node tests/test_recipe_unit1.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const readText = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const world = readJson('worlds/recipe-unit-1.json');
const bank = readJson('worlds/recipe1-questions.json');
const quiz = readJson('worlds/recipe1-desk-quiz.json');

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

const CIRCLED = '①②③④';
const rows = [];
bank.exercises.forEach((ex) => (ex.items || []).forEach((it) => rows.push({ ex, it })));
const answerOf = (it) => ((it.choices || []).find((c) => c.id === it.answer) || {}).ko;

// ── 1. What the files say they are ───────────────────────────────────────────
console.log('\n--- 1. The world, its bank and its quiz ---');
assert(world.id === 'recipe-unit-1' && world.level && world.level.worldId === 'recipe-unit-1',
  'the world names itself recipe-unit-1');
assert(world.pack === 'topik-recipe' && world.level.pack === 'topik-recipe',
  'and belongs to the 합격 레시피 pack');
assert(world.pages === 'Unit 1', 'and says which unit it is, for the level-select card');
assert(/합격 레시피/.test(world.source) && /pp\.14-42/.test(world.source),
  'and names the book and the pages it came from (' + world.source + ')');
assert(JSON.stringify(world.level.map.stations) === '["desk"]',
  'the world is a study desk and nothing else — Chapter 1 is all reading');
const words = world.level.words || [];
assert(words.length >= 200, 'the word list carries the chapter (' + words.length + ' headwords)');
const CATS = ['연결어미', '종결어미', '유사 문법', '유사 표현', '제품 광고', '업소 광고', '공익 광고', '광고의 상세 설명'];
const cats = [...new Set(words.map((w) => w.category))];
assert(cats.length === CATS.length && CATS.every((c) => cats.indexOf(c) >= 0),
  'in the eight groups the book teaches them in (' + cats.join(', ') + ')');
assert(bank.id === 'recipe1-questions', 'the bank names itself recipe1-questions');
assert(bank.exercises.length === 10 && rows.length === 78,
  'and holds ten pages, 78 questions (' + bank.exercises.length + ', ' + rows.length + ')');

// ── 2. The 기출문제, keyed as the book prints them ────────────────────────────
console.log('\n--- 2. The eight 기출문제 ---');
const PRINTED = { 1: '②', 2: '①', 3: '③', 4: '④', 5: '③', 6: '④', 7: '③', 8: '②' };
const past = rows.filter(({ it }) => it.keySource === 'book');
assert(past.length === 8, 'eight rows carry the book’s printed key (' + past.length + ')');
Object.keys(PRINTED).forEach((n) => {
  const hit = past.find(({ it }) => it.source === '제60회 TOPIK II 읽기 ' + n + '번');
  if (!hit) { assert(false, '읽기 ' + n + '번 is in the bank'); return; }
  const it = hit.it;
  const key = PRINTED[n];
  assert(it.bookKey === key && it.answer === 'o' + (CIRCLED.indexOf(key) + 1),
    '읽기 ' + n + '번 is keyed ' + key + ' as the book prints it (' + answerOf(it) + ')');
  const paras = String(it.why || '').split(/\n\n/);
  assert(paras.length >= 2 && paras[1].indexOf('교재 해설 · p.' + it.bookPage + ' — 정답은 ' + key + '번') === 0,
    '  and its explanation quotes the book’s 해설 on p.' + it.bookPage);
});

// ── 3. The 예상문제: every key pinned, and named for the row it came from ────
console.log('\n--- 3. The seventy 예상문제 ---');
const DERIVED = {
  'r1-grammar-conn': [
    [1, '축구하다가', '연결어미 01'], [2, '먹고 나서', '연결어미 02'], [3, '열리는데', '연결어미 03'],
    [4, '선물하려고', '연결어미 04'], [5, '않으려면', '연결어미 05'], [6, '나오느라고', '연결어미 06'],
    [7, '다해야', '연결어미 07'], [8, '잊어버릴까 봐서', '연결어미 08'], [9, '아프거나', '연결어미 09'],
    [10, '졸업하자마자', '연결어미 10']
  ],
  'r1-grammar-final': [
    [1, '넣어 놓았다', '종결어미 01'], [2, '빼기로 했다', '종결어미 02'], [3, '들어가면 된다', '종결어미 03'],
    [4, '하게 했다', '종결어미 04'], [5, '맡게 됐다', '종결어미 05'], [6, '배운 적이 있다', '종결어미 06'],
    [7, '닫혀 있었다', '종결어미 07'], [8, '되어 간다', '종결어미 08'], [9, '마친 셈이다', '종결어미 09'],
    [10, '치료해 왔다', '종결어미 10']
  ],
  'r1-similar-practice': [
    [1, '올 모양이다', '유사 문법 01'], [2, '몰라보게', '유사 문법 02'], [3, '실수하는 법이다', '유사 문법 03'],
    [4, '타야만 했다', '유사 문법 04'], [5, '가까운 데다가', '유사 문법 05'], [6, '떠드는 통에', '유사 문법 06'],
    [7, '넘어질 것 같아서', '유사 문법 07'], [8, '끝나는 대로', '유사 문법 08'], [9, '마친 거나 같다', '유사 문법 09'],
    [10, '물어보지 않아도', '유사 문법 10']
  ],
  'r1-ads-product': [
    [1, '시계', '제품 광고 01'], [2, '안경', '제품 광고 02'], [3, '신발', '제품 광고 03'],
    [4, '자동차', '제품 광고 04'], [5, '사진기', '제품 광고 05'], [6, '화장품', '제품 광고 06'],
    [7, '가습기', '제품 광고 07'], [8, '우산', '제품 광고 08'], [9, '샴푸', '제품 광고 09'],
    [10, '에어컨', '제품 광고 10']
  ],
  'r1-ads-business': [
    [1, '백화점', '업소 광고 01'], [2, '문구점', '업소 광고 02'], [3, '지하철', '업소 광고 03'],
    [4, '도서관', '업소 광고 04'], [5, '미술관', '업소 광고 05'], [6, '시장', '업소 광고 06'],
    [7, '옷 가게', '업소 광고 07'], [8, '택배 회사', '업소 광고 08'], [9, '아파트', '업소 광고 09'],
    [10, '예식장', '업소 광고 10']
  ],
  'r1-ads-public': [
    [1, '봉사 활동', '공익 광고 01'], [2, '환경 보호', '공익 광고 03'], [3, '일회용품', '공익 광고 05'],
    [4, '음식물 쓰레기', '공익 광고 04'], [5, '안전 관리', '공익 광고 12'], [6, '건강 관리', '공익 광고 14'],
    [7, '전기 절약', '공익 광고 07'], [8, '공공 예절', '공익 광고 17'], [9, '안전 운전', '공익 광고 09'],
    [10, '언어 예절', '공익 광고 18']
  ],
  'r1-ads-detail': [
    [1, '사용 방법', '광고의 상세 설명 01'], [2, '회원 모집', '광고의 상세 설명 02'], [3, '행사 안내', '광고의 상세 설명 03'],
    [4, '상품 특징', '광고의 상세 설명 04'], [5, '사용 소감', '광고의 상세 설명 13'], [6, '주의 사항', '광고의 상세 설명 06'],
    [7, '보관 방법', '광고의 상세 설명 07'], [8, '등록 안내', '광고의 상세 설명 08'], [9, '교환 방법', '광고의 상세 설명 11'],
    [10, '구입 안내', '광고의 상세 설명 18']
  ]
};
const derived = rows.filter(({ it }) => it.keySource === 'ranking');
assert(derived.length === 70, 'seventy rows are keyed from a Ranking row (' + derived.length + ')');
assert(rows.every(({ it }) => it.keySource === 'book' || it.keySource === 'ranking'),
  'and no row is keyed any third way');
const REF = /^(연결어미|종결어미|유사 문법|제품 광고|업소 광고|공익 광고|광고의 상세 설명) (\d{2})$/;
assert(derived.every(({ it }) => REF.test(it.rankingRef || '') && !it.bookKey),
  'every derived key names its Ranking row, and none pretends to be printed');
Object.keys(DERIVED).forEach((id) => {
  const ex = bank.exercises.find((e) => e.id === id);
  if (!ex) { assert(false, id + ' is in the bank'); return; }
  const pin = DERIVED[id];
  const wrong = pin.filter(([n, ko, ref]) => {
    const it = ex.items.find((i) => i.n === n);
    return !it || answerOf(it) !== ko || it.rankingRef !== ref;
  }).map(([n]) => n);
  assert(ex.items.length === pin.length && wrong.length === 0,
    id + ': all ' + pin.length + ' keys are the pinned ones' + (wrong.length ? ' — not ' + wrong.join(', ') : ''));
});

// ── 4. A grammar key is the one option built on the Ranking row’s pattern ───────
console.log('\n--- 4. Grammar keys, re-derived from the Ranking table ---');
// The surface each Ranking pattern leaves at the end of a word. The book's practice questions
// put four forms of one verb side by side, so exactly one of them should wear it.
const SURFACE = {
  '연결어미 01': /다가$/, '연결어미 02': /고 나서$/, '연결어미 03': /(는데|은데|ㄴ데)$/,
  '연결어미 04': /려고$/, '연결어미 05': /려면$/, '연결어미 06': /느라고$/, '연결어미 07': /(아|어|해)야$/,
  '연결어미 08': /까 봐(서)?$/, '연결어미 09': /거나$/, '연결어미 10': /자마자$/,
  '종결어미 01': /(아|어) 놓았다$/, '종결어미 02': /기로 했다$/, '종결어미 03': /면 된다$/,
  '종결어미 04': /게 했다$/, '종결어미 05': /게 (됐다|되었다)$/, '종결어미 06': / 적이 있다$/,
  '종결어미 07': /(아|어|혀) 있었다$/, '종결어미 08': /(아|어) 간다$/, '종결어미 09': / 셈이다$/,
  '종결어미 10': /(아|어|해) 왔다$/,
  // 유사 문법: the equivalent the book prints beside the underlined headword.
  '유사 문법 01': /모양이다$/, '유사 문법 02': /게$/, '유사 문법 03': /는 법이다$/, '유사 문법 04': /야만 했다$/,
  '유사 문법 05': /데다가$/, '유사 문법 06': /통에$/, '유사 문법 07': /것 같아서$/, '유사 문법 08': /는 대로$/,
  '유사 문법 09': /거나 같다$/, '유사 문법 10': /지 않아도$/
};
derived.filter(({ it }) => /^(연결어미|종결어미|유사 문법) /.test(it.rankingRef)).forEach(({ ex, it }) => {
  const re = SURFACE[it.rankingRef];
  const hits = (it.choices || []).filter((c) => re && re.test(String(c.ko).replace(/\s+/g, ' ').trim()));
  assert(hits.length === 1 && hits[0].id === it.answer,
    ex.id + ' ' + it.n + ': ' + it.rankingRef + ' is worn by ' + (hits.map((c) => c.ko).join(', ') || 'no option'));
  // And the row's own grammar note prints that same Ranking line, so the learner can check it.
  assert(String(it.grammar || '').indexOf('Ranking ' + it.rankingRef + ' · ') === 0,
    '  and its grammar note opens on the Ranking line it was keyed from');
});

// ── 5. An ad key is the one option its Ranking row names ─────────────────────
console.log('\n--- 5. Ad keys, re-derived from the Ranking table ---');
// The Ranking line as the grammar note prints it: "Ranking 제품 광고 05 · 카메라(사진기) — 광고 핵심어: …".
// A name like 카메라(사진기) or 제품(상품) 소개 carries its alternative in brackets; 교환, 환불 is two
// names; and a 상세 설명 row adds the option words the book lists under it.
function namesOf(it) {
  const m = /^Ranking (.+?) (\d{2}) · (.+?) — (광고 핵심어|선택지 어휘): ([^.]+)\./.exec(String(it.grammar || ''));
  if (!m) return null;
  const head = m[3].replace(/ \([^)]*\)$/, '');     // the (공동체)-style group label
  const out = new Set();
  head.split(/,\s*/).forEach((part) => {
    const alt = /^(.*?)([가-힣]+)\(([가-힣]+)\)(.*)$/.exec(part);
    if (alt) {
      out.add((alt[1] + alt[2] + alt[4]).trim());
      out.add((alt[1] + alt[3] + alt[4]).trim());
      if (!alt[4].trim()) out.add(alt[3]);
    } else out.add(part.trim());
  });
  if (m[4] === '선택지 어휘') m[5].split(/,\s*/).forEach((w) => out.add(w.trim()));
  // 제품(상품) 소개: whatever it says of a 제품 it says of a 상품.
  if (/제품\(상품\)/.test(head)) [...out].forEach((w) => { if (/제품/.test(w)) out.add(w.replace('제품', '상품')); });
  return out;
}
// The book's option says 예식장 where its Ranking table says 결혼식장: the same place.
const ALIAS = { 예식장: '결혼식장' };
// One row where two options fall under the same Ranking heading, so the table narrows it to
// two and the ad settles it: a list of what the thing is like is 특징, not 효과. Its
// explanation says so, and this list is the only place such a row is allowed.
const JUDGED = { 'r1-ads-detail 4': '제품 효과' };
derived.filter(({ it }) => /광고/.test(it.rankingRef)).forEach(({ ex, it }) => {
  const names = namesOf(it);
  if (!names) { assert(false, ex.id + ' ' + it.n + ': its grammar note prints its Ranking line'); return; }
  const named = (it.choices || []).filter((c) => names.has(c.ko) || names.has(ALIAS[c.ko]));
  const key = answerOf(it);
  const also = named.filter((c) => c.id !== it.answer).map((c) => c.ko);
  const judged = JUDGED[ex.id + ' ' + it.n];
  const ok = named.some((c) => c.id === it.answer)
    && (also.length === 0 || (also.length === 1 && also[0] === judged && String(it.why).indexOf(judged) >= 0));
  const note = !also.length ? ''
    : ok ? ' (and ' + also.join(', ') + ', which its explanation rules out)'
      : ' — but it also names ' + also.join(', ');
  assert(ok, ex.id + ' ' + it.n + ': ' + it.rankingRef + ' names ' + key + note);
});

// ── 6. How the bank is dealt and shown ───────────────────────────────────────
console.log('\n--- 6. The bank behaves like a paper ---');
assert(bank.holdGloss === true, 'it holds its English back until a row is checked');
assert(bank.keepOrder === true, 'it keeps ① to ④ in the book’s order, because the 해설 cites them by number');
assert(bank.examView === true, 'and opens its explanations on the 핵심 단서, like the TOPIK paper');
assert(/정답과 해설/.test(bank.keyNote || '') && /test_recipe_unit1\.js/.test(bank.keyNote || ''),
  'and says in the file which keys are the book’s and which were derived');
const practiceEx = bank.exercises.filter((e) => /예상/.test(e.no));
assert(practiceEx.length === 7 && practiceEx.every((e) => /정답과 해설/.test(e.noteEn)),
  'every 예상 page tells the learner its keys were derived (' + practiceEx.length + ' pages)');
rows.forEach(({ ex, it }) => {
  const gaps = (it.lines || []).reduce((n, l) => n + String(l.ko).split('{}').length - 1, 0);
  const kos = (it.choices || []).map((c) => c.ko);
  const ok = gaps === 1 && kos.length === 4 && new Set(kos).size === 4
    && !!answerOf(it) && !!it.en && !!it.why && !!it.grammar && !!it.source && it.bookPage > 0;
  if (!ok) assert(false, ex.id + ' ' + it.n + ' has one gap, four different options, and its notes');
});
assert(true, 'every row has one gap, four different options, an answer among them, and its notes');
// 3-4 are shown the TOPIK world's way: the sentence as printed, then again with a gap where the
// underline was — so the row read aloud is the sentence with the right paraphrase in it.
const underline = rows.filter(({ ex }) => /^r1-similar-/.test(ex.id));
const badUnderline = underline.filter(({ it }) => {
  const line = it.lines.length === 1 ? String(it.lines[0].ko) : '';
  const [pre, post] = line.split('{}');
  const s = String(it.phraseKo || '');
  return !(pre !== undefined && post !== undefined && s.indexOf(pre) === 0 && s.endsWith(post)
    && s.length > pre.length + post.length);
}).map(({ ex, it }) => ex.id + ' ' + it.n);
assert(underline.length === 12 && badUnderline.length === 0,
  'every 3-4 row prints the sentence, then the same sentence with its underline cut out'
  + (badUnderline.length ? ' — not ' + badUnderline.join(', ') : ''));

// The deal itself, run rather than read: with keepOrder, the buttons come out as printed.
const ui = readText('js/ui.js');
const from = ui.indexOf('function wbDealIds(');
const to = ui.indexOf('function wbRowChoices(');
if (from < 0 || to < from) assert(false, 'the dealing helpers are in js/ui.js');
else {
  const ctx = { Math, Array, Map, String, WB_CIRCLED: CIRCLED, wbShuffled: (a) => a.slice().reverse() };
  vm.createContext(ctx);
  vm.runInContext(ui.slice(from, to), ctx);
  const ex = bank.exercises[0];
  const st = { bank, ex };
  ctx.wbDeal(st);
  assert(st.order.every((ids, i) => ids.join() === ex.items[i].choices.map((c) => c.id).join()),
    'wbDeal hands the 합격 레시피 bank its buttons in the book’s order');
  const st2 = { bank: Object.assign({}, bank, { keepOrder: false }), ex };
  ctx.wbDeal(st2);
  assert(st2.order.some((ids, i) => ids.join() !== ex.items[i].choices.map((c) => c.id).join()),
    'and a bank without keepOrder is still shuffled');
}
assert(ui.indexOf("st.bank.examView === true") >= 0, 'the explanation view honours examView');

// ── 7. The desk quiz ─────────────────────────────────────────────────────────
console.log('\n--- 7. The desk quiz ---');
const qs = quiz.questions || [];
assert(qs.length === 149, 'the desk quiz asks 149 questions from the Ranking tables (' + qs.length + ')');
assert(new Set(qs.map((q) => q.id)).size === qs.length, 'with an id each');
const badQ = qs.filter((q) => {
  const ch = ['A', 'B', 'C', 'D'].map((k) => (q.choices || {})[k]);
  return ['A', 'B', 'C', 'D'].indexOf(q.a) < 0 || ch.some((c) => !c) || new Set(ch).size !== 4
    || !REF.test(q.rankingRef || '');
}).map((q) => q.id);
assert(badQ.length === 0, 'every question has four different options, a key among them, and its Ranking row'
  + (badQ.length ? ' — not ' + badQ.join(', ') : ''));
const letters = ['A', 'B', 'C', 'D'].map((k) => qs.filter((q) => q.a === k).length);
assert(letters.every((n) => n >= qs.length * 0.2 && n <= qs.length * 0.3),
  'and the key is not always behind the same letter (' + letters.join(' / ') + ')');

// ── 8. Wired in everywhere a world has to be ─────────────────────────────────
console.log('\n--- 8. Wiring ---');
const econ = readText('js/systems/economy.js');
assert(/function isRecipeUnit1World\(\)[\s\S]{0,200}'recipe-unit-1'/.test(econ),
  'isRecipeUnit1World is defined against the world id');
assert(econ.indexOf("'recipe-unit-1': { extras: [], stations: ['desk'] }") >= 0,
  'WORLD_PACKS gives it the desk, as its world JSON does');
assert(econ.indexOf("file: 'worlds/recipe-unit-1.json'") >= 0, 'and it is fetched with the other worlds');
assert(ui.indexOf("isRecipeUnit1World()) return '/worlds/recipe1-desk-quiz.json'") >= 0,
  'the desk quiz resolves to its own file on its own world');
assert(ui.indexOf("return '/worlds/recipe1-questions.json'") >= 0 && ui.indexOf("key: 'recipe'") >= 0,
  'and the desk offers the book’s questions as a row of its own');
const i18n = readText('js/i18n.js');
assert(['worlds/recipe-unit-1.json', 'worlds/recipe1-questions.json', 'worlds/recipe1-desk-quiz.json']
  .every((f) => i18n.indexOf("'" + f + "'") >= 0), 'all three files are translation sources');
const { WORKBOOKS, validateWorkbook } = require(path.join(ROOT, 'admin', 'lib', 'workbook.js'));
assert(WORKBOOKS['recipe1-questions'] === path.join('worlds', 'recipe1-questions.json'),
  'the admin can open the bank');
const sorted = (o) => JSON.stringify(o, (k, v) => (v && typeof v === 'object' && !Array.isArray(v)
  ? Object.keys(v).sort().reduce((r, x) => { r[x] = v[x]; return r; }, {}) : v));
let saved = null;
try { saved = validateWorkbook(JSON.parse(JSON.stringify(bank)), 'worlds/recipe1-questions.json'); } catch (e) {
  assert(false, 'the admin validator accepts the bank: ' + e.message);
}
if (saved) {
  assert(sorted(saved) === sorted(bank),
    'and a save through it keeps every field — keySource, bookKey, rankingRef, keepOrder, examView, keyNote');
}
const { validateQuiz } = require(path.join(ROOT, 'admin', 'lib', 'world.js'));
assert(sorted(validateQuiz(JSON.parse(JSON.stringify(quiz)))) === sorted(quiz),
  'and a quiz save keeps each question’s rankingRef');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
