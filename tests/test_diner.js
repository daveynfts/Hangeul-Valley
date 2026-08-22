/**
 * tests/test_diner.js — the Unit 10 diner: its content, its order grading, and the fact that
 * the game can reach it at all.
 *
 * The diner shipped with Unit 10 on 2026-08-19 and had no test of any kind — the only part of
 * the repo nothing guarded. Two things had gone wrong in that time and neither could be seen:
 *
 *   - Nothing in the game linked to it. It has had a "← Valley" button home since the day it
 *     landed, so the way out existed and the way in never did; no player could reach it.
 *   - It taught five of the eighteen 주문 words the unit lists. The pizza menu was three
 *     buttons written into the markup, so 야채피자, 고구마피자, 페퍼로니피자, 사이다, both
 *     chickens, the rice and noodle dishes, 인분 and both delivery verbs had nowhere to be.
 *
 * The grading rules are extracted and run here without a DOM: the diner drives real elements
 * through `.dish[data-group=…]` selectors, and the CI test job has no npm install, so jsdom is
 * not available to it. What is worth testing is the judgement, and that is what is extracted.
 *
 * Run: node tests/test_diner.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readJson = (rel) => JSON.parse(read(rel));

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}
function eq(a, b, msg) {
  assert(a === b, msg + ' (got ' + JSON.stringify(a) + ', expected ' + JSON.stringify(b) + ')');
}

const content = readJson('diner/content.json');
const dinerJs = read('diner/diner.js');
const dinerHtml = read('diner/index.html');
const ui = read('js/ui.js');
const unit10 = readJson('worlds/2b-unit-10.json').level.words;
const nfc = (s) => String(s == null ? '' : s).normalize('NFC');

console.log('====================================================');
console.log('UNIT 10 DINER');
console.log('====================================================');

// ── 0. It parses ─────────────────────────────────────────────────────────────
// npm run check walks js/manifest.json, which lists the game's own 24 scripts. The diner is
// not one of them and is not loaded by index.html, so nothing was checking that it parses —
// a syntax error here would ship silently and only show up as a blank page. new vm.Script
// compiles without running, which is all that is wanted.
console.log('\n--- 0. It parses ---');
[['diner/diner.js', dinerJs]].forEach(([rel, src]) => {
  let err = null;
  try { new vm.Script(src, { filename: rel }); } catch (e) { err = e; }
  assert(!err, rel + ' parses' + (err ? ' — ' + err.message : ''));
});

// ── 1. The game can reach it ─────────────────────────────────────────────────
console.log('\n--- 1. The game can reach it ---');
assert(/deskMenuOptions\.push\(\{[\s\S]{0,200}key: 'diner'/.test(ui),
  'the study desk offers the diner as a mode');
assert(/isUnit10World\(\)[\s\S]{0,320}key: 'diner'/.test(ui),
  'and only in the Unit 10 world — it is Unit 10 content, not a Valley feature');
assert(/const DINER_URL = '\/diner\/'/.test(ui), 'the entry point names /diner/');
assert(/function openDiner\(\)/.test(ui) && /window\.location\.href/.test(ui),
  'openDiner navigates rather than opening an overlay — the diner is a page of its own');
// Leaving the page drops in-memory state, so the save has to be written first. The timeout
// matters more than the flush: flushSave awaits a cloud PUT and must not be able to strand
// the player on a desk menu that has stopped responding.
assert(/function openDiner\(\)[\s\S]{0,420}flushSave/.test(ui),
  'and flushes the save before it goes');
assert(/function openDiner\(\)[\s\S]{0,420}setTimeout\(once/.test(ui),
  'with a timeout, so an offline cloud write cannot block the navigation');
assert(/id="btn-back"/.test(dinerHtml) && /location\.href = '\/index\.html'/.test(dinerJs),
  'and the diner still has its way back to the valley');

// ── 2. Unit 10's 주문 vocabulary is all in the order menu ────────────────────
console.log('\n--- 2. Unit 10\'s 주문 vocabulary ---');
const ordering = unit10.filter((w) => w.category === '주문').map((w) => nfc(w.ko));
eq(ordering.length, 18, 'the unit lists eighteen 주문 words');

const O = content.order;
assert(!!O, 'content.json carries an order block');
const menuKo = new Set([
  O.shopKo,
  ...(O.pizzas || []).map((x) => x.ko),
  ...(O.drinks || []).map((x) => x.ko),
  ...(O.sides || []).map((x) => x.ko),
  ...(O.counters || []).map((x) => x.ko),
  ...(O.delivery || []).map((x) => x.ko)
].map(nfc));
const missing = ordering.filter((ko) => !menuKo.has(ko));
assert(missing.length === 0,
  'every 주문 word is on the menu' + (missing.length ? ' — missing: ' + missing.join(', ') : ''));
// The other direction: the menu must not invent vocabulary the unit does not teach, or the
// scene drifts away from the textbook it is porting.
const strays = [...menuKo].filter((ko) => !ordering.includes(ko));
assert(strays.length === 0,
  'and the menu invents nothing the unit does not list' + (strays.length ? ' — extra: ' + strays.join(', ') : ''));

// Spacing is what hid this before: the diner wrote 치즈 피자 while the word list has 치즈피자,
// so nothing matched and the coverage read as zero. The menu has to use the list's spelling —
// it is also what the TTS clips are keyed on.
const spaced = [...menuKo].filter((ko) => /피자$/.test(ko) && ko.includes(' '));
assert(spaced.length === 0,
  'the menu uses the word list\'s spelling, not a spaced variant' + (spaced.length ? ' — ' + spaced.join(', ') : ''));

// ── 3. Counters ──────────────────────────────────────────────────────────────
console.log('\n--- 3. The two counters ---');
const pan = (O.counters || []).find((c) => c.id === 'pan');
const inbun = (O.counters || []).find((c) => c.id === 'inbun');
assert(!!pan && pan.ko === '판', '판 is a counter with an id the grading can name');
assert(!!inbun && inbun.ko === '인분', 'and so is 인분');
eq(pan.numKo, '한', '판 takes a native number — 한 판');
eq(inbun.numKo, '이', 'and 인분 a Sino-Korean one — 이 인분');
assert(pan.forGroup === 'pizza' && inbun.forGroup === 'side',
  'each counter records what it counts, so the copy and the grading cannot drift apart');

// ── 4. Order grading, without a DOM ──────────────────────────────────────────
console.log('\n--- 4. Order grading ---');
const block = (() => {
  const a = dinerJs.indexOf('/* ── Order grading (pure) ─');
  const b = dinerJs.indexOf('/* ── Order grading end ─');
  if (a < 0 || b < 0) throw new Error('could not find the order-grading block in diner/diner.js');
  return dinerJs.slice(a, b);
})();
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(block, ctx);
const gradePizza = vm.runInContext('gradePizzaOrder', ctx);
const gradeSide = vm.runInContext('gradeSideOrder', ctx);
const line = vm.runInContext('orderLine', ctx);

eq(gradePizza({ pizza: 'cheese', counter: 'pan', drink: 'cola' }), 'ok',
  'the order the tape gives is accepted');
eq(gradePizza({ pizza: 'cheese', counter: null, drink: 'cola' }), 'incomplete',
  'a half-made pick is incomplete, not wrong — it must not cost a heart');
eq(gradePizza({ pizza: 'cheese', counter: 'inbun', drink: 'cola' }), 'counter',
  '인분 on a pizza is the counter error, which is the one real mistake on this beat');
eq(gradePizza({ pizza: 'yachae', counter: 'pan', drink: 'cider' }), 'other-order',
  '야채피자 with 사이다 is good Korean aimed at the wrong order, and is told apart from a counter error');
assert(gradePizza({ pizza: 'yachae', counter: 'inbun', drink: 'cider' }) === 'counter',
  'and when both are off, the counter is what gets explained first');

eq(gradeSide({ side: 'bibimbap', counter: 'inbun' }), 'ok', '비빔밥 이 인분 is accepted');
eq(gradeSide({ side: 'kimchi-bokkeumbap', counter: 'pan' }), 'counter',
  '판 on fried rice is the same error the other way round');
eq(gradeSide({ side: null, counter: 'inbun' }), 'incomplete', 'and an unfinished pick is still incomplete');
// Every dish on the row is a fine thing to order. Grading the dish would mark 양념치킨 wrong
// for being 양념치킨, which teaches nothing true.
(O.sides || []).forEach((s) => {
  eq(gradeSide({ side: s.id, counter: 'inbun' }), 'ok', s.ko + ' is an acceptable choice');
});

eq(line({ ko: '치즈피자' }, pan, { ko: '콜라' }), '치즈피자 한 판하고 콜라 하나 주세요.',
  'the built sentence reads as the textbook writes it');
eq(line({ ko: '비빔밥' }, inbun, null), '비빔밥 이 인분 주세요.', 'and drops the drink clause when there is none');
eq(line(null, null, null, '음식'), '음식 몇 주세요.', 'an empty row reads as a sentence being built, not a blank');

// ── 5. The scene list and the progress dots agree ────────────────────────────
console.log('\n--- 5. Scenes ---');
const scenes = (dinerJs.match(/const SCENES = \[([^\]]+)\]/) || [])[1] || '';
const sceneIds = scenes.split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
assert(sceneIds.includes('phone'), 'the phone scene is in the list (' + sceneIds.join(' ') + ')');
const dots = (dinerHtml.match(/<div class="progress"[\s\S]*?<\/div>/) || [''])[0];
eq((dots.match(/<span><\/span>/g) || []).length, sceneIds.length,
  'and the header has one progress dot per scene');

// ── 6. The rest of the content still matches Unit 10's word list ─────────────
console.log('\n--- 6. The rest of the content ---');
[['tastes', '맛'], ['criteria', '식당 평가'], ['dishes', '음식']].forEach(([key, cat]) => {
  const listed = new Set(unit10.filter((w) => w.category === cat).map((w) => nfc(w.ko)));
  const off = (content[key] || []).map((x) => nfc(x.ko)).filter((ko) => !listed.has(ko));
  assert(off.length === 0,
    `every ${key} entry is a Unit 10 ${cat} word` + (off.length ? ' — off-list: ' + off.join(', ') : ''));
});
assert((content.dishes || []).length === 12, 'the twelve dishes the book prints are all there');
assert(content.meta && content.meta.id === '2b-unit-10', 'the content declares which unit it belongs to');

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
process.exit(failed ? 1 : 0);
