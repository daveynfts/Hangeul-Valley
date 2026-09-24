'use strict';
/**
 * tests/test_workbook_button_order.js — the right answer is not always button 1.
 *
 * Nearly every bank on the desk is written with the right answer first: all 57 rows of Unit 18's
 * 교과서, all 70 of Unit 12's 익힘책, all 78 of Unit 13's 교과서. The renderer used to draw a
 * row's buttons in exactly that order, and the number keys pressed them in that order too, so a
 * learner could press 1 on every row and score full marks without reading a word. Five shared
 * boxes had the same fault the other way round — their chips were listed in the order of the
 * rows they answer, so a picture page could be matched straight across.
 *
 * A sitting now deals the buttons in an order of its own (wbDeal in js/ui.js). This suite drives
 * the shipped renderer in a sandbox, with a seeded Math.random so it either passes or fails
 * rather than usually passing, and reads the buttons it actually drew:
 *
 *   1. over many sittings the right answer turns up in every position, not only the first;
 *   2. within a sitting the order holds still across re-renders, and 다시 풀기 deals again;
 *   3. the number keys read the same dealt list the renderer draws;
 *   4. two orders that mean something are kept — an exam bank (drawOne), whose explanations
 *      cite options by the number the paper prints, and a row whose every button opens on the
 *      book's ①②③, which is laid out in that order;
 *   5. shared-box chips are dealt as well.
 *
 * Run: node tests/test_workbook_button_order.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readJson = (rel) => JSON.parse(read(rel));
const i18nSrc = read(path.join('js', 'i18n.js'));
const uiSrc = read(path.join('js', 'ui.js'));
const artSrc = read(path.join('js', 'workbookArt.js'));

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

// A deterministic stand-in for Math.random, as in test_topik_draw.js: "the answer moves" is a
// claim a real random source makes usually true, which is the kind of test that passes on the
// day it should fail.
function seeded(seed) {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5; x >>>= 0;
    return (x % 1000003) / 1000003;
  };
}

// The same DOM stub the Unit 14 suite writes into: enough element for the renderer to build
// rows out of, and innerHTML that drops children the way the real one does.
function makeDom() {
  const els = Object.create(null);
  function mkEl(tag) {
    const el = {
      tagName: (tag || 'div').toUpperCase(),
      textContent: '', className: '', type: '',
      disabled: false, tabIndex: -1, children: [], attrs: Object.create(null),
      onclick: null, onkeydown: null,
      classList: {
        _s: new Set(),
        add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
        contains(c) { return this._s.has(c); },
        toggle(c, on) { if (on === undefined) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); } else if (on) this._s.add(c); else this._s.delete(c); }
      },
      style: {}, dataset: Object.create(null), value: '', hidden: false, parentElement: null,
      setAttribute(k, v) { this.attrs[k] = v; },
      getAttribute(k) { return this.attrs[k]; },
      appendChild(c) { this.children.push(c); return c; },
      insertBefore(c) { this.children.unshift(c); return c; },
      removeAttribute(k) { delete this.attrs[k]; },
      addEventListener() {}, removeEventListener() {},
      querySelector: () => null, querySelectorAll: () => [],
      remove() {}, focus() {}, blur() {}, click() {}
    };
    let markup = '';
    Object.defineProperty(el, 'innerHTML', {
      get() { return markup; },
      set(v) { markup = String(v); el.children.length = 0; },
      enumerable: true
    });
    return el;
  }
  const document = {
    readyState: 'complete',
    documentElement: mkEl('html'),
    body: mkEl('body'),
    getElementById(id) {
      if (!(id in els)) els[id] = mkEl('div');
      return els[id];
    },
    createElement: mkEl,
    querySelectorAll: () => [],
    addEventListener() {}
  };
  return { document, els };
}

function loadUi(seed) {
  const { document, els } = makeDom();
  const real = Object.create(null);
  const noop = function () { return undefined; };
  const sandbox = new Proxy(real, {
    has() { return true; },
    get(t, k) {
      if (k in t) return t[k];
      if (typeof k === 'symbol') return undefined;
      if (k in globalThis) return globalThis[k];
      return noop;
    },
    set(t, k, v) { t[k] = v; return true; },
    defineProperty(t, k, d) { Object.defineProperty(t, k, d); return true; },
    deleteProperty(t, k) { delete t[k]; return true; }
  });
  const math = Object.create(Math);
  math.random = seeded(seed);
  Object.assign(real, {
    Math: math,
    console: { log() {}, info() {}, warn() {}, error() {} },
    IS_NODE: true,
    document: document,
    window: { addEventListener() {} },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    activeModalStack: [],
    playerLocked: false,
    playChiptuneSFX: noop,
    checkQuestProgress: noop,
    ensurePlayerRank: noop,
    studySessionXp: () => 10,
    addPlayerXp: (xp) => ({ leveled: false, level: 1, xp: xp, need: 100 }),
    addHonor: noop,
    persistSave: noop,
    updateRankHUD: noop
  });
  vm.createContext(sandbox);
  vm.runInContext(artSrc, sandbox);
  vm.runInContext(i18nSrc, sandbox);
  vm.runInContext(uiSrc, sandbox);
  return {
    els,
    run: (expr) => vm.runInContext(expr, sandbox),
    open: (bank, exId) => {
      real.__bank = bank;
      vm.runInContext('openWorkbook(__bank)', sandbox);
      vm.runInContext("openWorkbookExercise('" + exId + "')", sandbox);
    }
  };
}

// The buttons a row actually drew, as their Korean text, in the order they sit on screen.
const unescape = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const stripKey = (html) => unescape(String(html || '').replace(/<span class="wb-chip-key">[^<]*<\/span>/, '')
  .replace(/<[^>]+>/g, '').trim());
function drawnRows(els) {
  return (els['wb-items'].children || []).map((row) => {
    const exp = (row.children || []).find((c) => c.className === 'wb-exp');
    const picks = exp && (exp.children || []).find((c) => c.className === 'wb-exp-picks');
    return ((picks && picks.children) || [])
      .filter((b) => /^wb-pick-form/.test(b.className || ''))
      .map((b) => stripKey(b.innerHTML));
  });
}
// A shared box is drawn above the rows — or, on a picture page, as the second of two columns
// inside the item list, beside the pictures it names.
function drawnChips(els) {
  const top = els['wb-bank'].children || [];
  const cols = ((els['wb-items'].children || [])[0] || {});
  const names = ((cols.children || []).find((c) => /wb-names/.test(c.className || '')) || {}).children || [];
  return (top.length ? top : names).map((b) => b.getAttribute('data-chip'));
}

console.log('====================================================');
console.log('WORKBOOK BUTTON ORDER');
console.log('====================================================');

// ── 0. Why this suite exists ─────────────────────────────────────────────────
console.log('\n--- 0. The banks are written with the answer first ---');
const survey = fs.readdirSync(path.join(ROOT, 'worlds')).filter((f) => /^unit\d+-(work|text)book\.json$/.test(f));
let rowsTotal = 0, rowsFirst = 0;
survey.forEach((f) => {
  readJson(path.join('worlds', f)).exercises.forEach((ex) => (ex.items || []).forEach((it) => {
    if (!Array.isArray(it.choices)) return;
    rowsTotal++;
    if ((it.choices[0] || {}).id === it.answer) rowsFirst++;
  }));
});
assert(rowsTotal > 800 && rowsFirst / rowsTotal > 0.8,
  'the unit banks list the right answer first on ' + rowsFirst + ' of ' + rowsTotal
  + ' rows, which is why the order they are drawn in cannot be the order they are written in');

// ── 1. Over many sittings the answer turns up everywhere ─────────────────────
console.log('\n--- 1. The right answer moves ---');
const u18 = readJson(path.join('worlds', 'unit18-textbook.json'));
const u18ex = u18.exercises.find((e) => e.id === 'u18sgk-gram-1');
const keyed = (it) => it.choices.find((c) => c.id === it.answer).ko;
assert(u18ex.items.every((it) => it.choices[0].id === it.answer),
  'the page under test is written answer-first (' + u18ex.id + ')');
const positions = u18ex.items.map(() => new Map());
const ui = loadUi(12345);
for (let s = 0; s < 60; s++) {
  ui.open(u18, u18ex.id);
  drawnRows(ui.els).forEach((buttons, r) => {
    const at = buttons.indexOf(keyed(u18ex.items[r]));
    positions[r].set(at, (positions[r].get(at) || 0) + 1);
  });
}
positions.forEach((pos, r) => {
  const n = u18ex.items[r].choices.length;
  assert(!pos.has(-1), 'row ' + (r + 1) + ': the right answer is always one of the buttons drawn');
  assert(pos.size === n, 'row ' + (r + 1) + ': over 60 sittings it is drawn in all ' + n + ' positions ('
    + [...pos.entries()].sort().map(([k, v]) => (k + 1) + '×' + v).join(' ') + ')');
  assert(Math.max(...pos.values()) < 40, 'and no position takes two thirds of them');
});

// ── 2. Still within a sitting, dealt again on 다시 풀기 ───────────────────────
console.log('\n--- 2. Stable within a sitting ---');
const one = loadUi(99);
one.open(u18, u18ex.id);
const before = JSON.stringify(drawnRows(one.els));
one.run("wbPickChoice(0, '" + u18ex.items[0].answer + "')");
one.run('renderWorkbook()');
assert(JSON.stringify(drawnRows(one.els)) === before,
  'picking a button and re-rendering leaves every button where it was');
one.run('checkWorkbook()');
assert(JSON.stringify(drawnRows(one.els)) === before, 'and so does checking the page');
let moved = false;
for (let k = 0; k < 10 && !moved; k++) {
  one.run('resetWorkbook()');
  if (JSON.stringify(drawnRows(one.els)) !== before) moved = true;
}
assert(moved, '다시 풀기 deals the buttons again rather than putting them back');

// ── 3. The keys press what the renderer drew ─────────────────────────────────
console.log('\n--- 3. Number keys and badges agree ---');
const keys = loadUi(7);
keys.open(u18, u18ex.id);
const drawn = drawnRows(keys.els);
const dealt = u18ex.items.map((it, r) => keys.run('wbRowChoices(workbookState.ex.items[' + r + '], ' + r + ', 1)')
  .map((c) => c.ko));
assert(JSON.stringify(dealt) === JSON.stringify(drawn),
  'wbRowChoices returns the buttons in the order the row drew them');
const kb = uiSrc.slice(uiSrc.indexOf("if (e.key === 'Escape') return;"));
assert(kb.indexOf('wbRowChoices(item, st.focus, 1)') >= 0 && kb.indexOf('wbRowChoices(item, st.focus, 2)') >= 0,
  'and the number keys read the same dealt list, for both blanks');
// A two-blank row deals each blank on its own.
const u10 = readJson(path.join('worlds', 'unit10-workbook.json'));
const twoEx = u10.exercises.find((e) => (e.items || []).some((it) => it.choices2));
const twoRow = twoEx.items.findIndex((it) => it.choices2);
const two = loadUi(31);
two.open(u10, twoEx.id);
const second = two.run('wbRowChoices(workbookState.ex.items[' + twoRow + '], ' + twoRow + ', 2)').map((c) => c.id).sort();
assert(JSON.stringify(second) === JSON.stringify(twoEx.items[twoRow].choices2.map((c) => c.id).sort()),
  'a second blank is dealt from its own buttons (' + twoEx.id + ' row ' + (twoRow + 1) + ')');

// ── 4. Orders that mean something are kept ───────────────────────────────────
console.log('\n--- 4. Orders that are kept ---');
const topik = readJson(path.join('worlds', 'topik2-questions.json'));
assert(topik.drawOne === true, 'the exam bank draws one question a sitting');
const tEx = topik.exercises[0];
const exam = loadUi(5);
let examKept = true;
for (let s = 0; s < 12; s++) {
  exam.open(topik, tEx.id);
  const at = exam.run('workbookState.ex.drawnAt');
  const want = tEx.items[at].choices.map((c) => c.ko);
  if (JSON.stringify(drawnRows(exam.els)[0]) !== JSON.stringify(want)) examKept = false;
}
assert(examKept, 'an exam question keeps the paper’s order, because its explanations cite option 1 to 4');
const u15 = readJson(path.join('worlds', 'unit15-textbook.json'));
const circledEx = u15.exercises.find((e) => (e.items || []).some((it) => it.choices.every((c) => /^[①-⑩]/.test(c.ko))));
assert(!!circledEx, 'a bank row carries the book’s own circled numbers on every button');
const cRow = circledEx.items.findIndex((it) => it.choices.every((c) => /^[①-⑩]/.test(c.ko)));
const circled = loadUi(11);
let bookOrder = true;
for (let s = 0; s < 8; s++) {
  circled.open(u15, circledEx.id);
  const buttons = drawnRows(circled.els)[cRow];
  const marks = buttons.map((b) => '①②③④⑤⑥⑦⑧⑨⑩'.indexOf(b.charAt(0)));
  if (marks.some((m, k) => k && m < marks[k - 1])) bookOrder = false;
}
assert(bookOrder, 'and such a row is laid out ① ② ③, the way the book prints it, however the sitting deals ('
  + circledEx.id + ' row ' + (cRow + 1) + ')');

// ── 5. Shared boxes are dealt too ────────────────────────────────────────────
console.log('\n--- 5. Shared boxes ---');
const boxEx = u10.exercises.find((e) => e.id === 'u10-vocab-1');
const written = (boxEx.bank || []).filter((c) => !c.usedByExample).map((c) => c.id);
assert(JSON.stringify(boxEx.items.map((it) => it.answer)) === JSON.stringify(written),
  'the box under test lists its chips in the order of the rows they answer (' + boxEx.id + ')');
const box = loadUi(2024);
const orders = new Set();
for (let s = 0; s < 20; s++) {
  box.open(u10, boxEx.id);
  const chips = drawnChips(box.els);
  assert(chips.slice().sort().join() === written.slice().sort().join(), 'sitting ' + (s + 1) + ' draws every chip once');
  orders.add(chips.join());
}
assert(orders.size > 10, 'and the chips come out in a different order from sitting to sitting (' + orders.size + ' of 20)');
assert(!orders.has(written.join()) || orders.size > 15, 'so matching straight across is not the answer');
const chipKey = uiSrc.indexOf('const chip = st.chips[num - 1];');
assert(chipKey > 0, 'the number keys press st.chips, the same dealt list the box is drawn from');

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_workbook_button_order: all passed');
