'use strict';
/**
 * tests/test_workbook_draw.js — one question at a time, on any page of several.
 *
 * A page of ten questions is answered all at once and, once checked, explains all ten at once:
 * a wall of cards to find your own mistakes in. The desk can now take a page one question at a
 * time instead — the 🎲 above its questions draws one at random, checking it opens that
 * question's answer and explanation alone, and the button under it draws the next. It is the
 * TOPIK paper's draw (wbDrawOne), asked for by the learner rather than set by the bank.
 *
 * This suite drives the shipped js/ui.js in a sandbox with a seeded Math.random:
 *
 *   1. the switch is offered on a page of several questions, and nowhere it would mean nothing;
 *   2. a drawn page is one real question, and says which one and how far into the round it is;
 *   3. checking it explains that question alone, and moves on from there — by button or Enter;
 *   4. a round meets every question once before any comes back;
 *   5. a drawn question is paid its share of the page, so one at a time is not an XP farm, and
 *      the whole page and the TOPIK paper are paid as they were;
 *   6. the page goes back to whole on request, and on leaving it;
 *   7. the markup and both interface languages carry it.
 *
 * Run: node tests/test_workbook_draw.js
 */

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

function seeded(seed) {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5; x >>>= 0;
    return (x % 1000003) / 1000003;
  };
}

function makeDom() {
  const els = Object.create(null);
  function mkEl(tag) {
    const el = {
      tagName: (tag || 'div').toUpperCase(),
      textContent: '', className: '', type: '', title: '',
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

// The game's own pay table, lifted out of js/systems/save.js, so the share is checked against
// what a sitting really earns rather than against a stand-in.
const saveSrc = read(path.join('js', 'systems', 'save.js'));
const xpFrom = saveSrc.indexOf('function studySessionXp(');
const xpTo = saveSrc.indexOf('\n}', xpFrom) + 2;
const xpCtx = {};
vm.createContext(xpCtx);
vm.runInContext(saveSrc.slice(xpFrom, xpTo) + '\nthis.studySessionXp = studySessionXp;', xpCtx);
const studySessionXp = xpCtx.studySessionXp;

function loadUi(seed) {
  const { document, els } = makeDom();
  const real = Object.create(null);
  const noop = function () { return undefined; };
  const listeners = Object.create(null);
  const honour = [];
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
  const win = { addEventListener(type, fn) { listeners[type] = fn; } };
  Object.assign(real, {
    Math: math,
    console: { log() {}, info() {}, warn() {}, error() {} },
    IS_NODE: true,
    document: document,
    window: win,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    activeModalStack: ['workbook-overlay'],
    playerLocked: false,
    playChiptuneSFX: noop,
    checkQuestProgress: noop,
    ensurePlayerRank: noop,
    studySessionXp: studySessionXp,
    addPlayerXp: (xp) => ({ leveled: false, level: 1, xp: xp, need: 100 }),
    addHonor: (n) => { honour.push(n); },
    persistSave: noop,
    updateRankHUD: noop
  });
  vm.createContext(sandbox);
  vm.runInContext(read(path.join('js', 'workbookArt.js')), sandbox);
  vm.runInContext(read(path.join('js', 'i18n.js')), sandbox);
  // The English table, so the buttons read as a player sees them rather than as their keys.
  vm.runInContext(read(path.join('js', 'locales', 'en.js')), sandbox);
  vm.runInContext(read(path.join('js', 'ui.js')), sandbox);
  return {
    els, real, honour,
    run: (expr) => vm.runInContext(expr, sandbox),
    open: (bank, exId) => {
      real.__bank = bank;
      vm.runInContext('openWorkbook(__bank)', sandbox);
      if (exId) vm.runInContext("openWorkbookExercise('" + exId + "')", sandbox);
    },
    key: (k) => listeners.keydown && listeners.keydown({ key: k, preventDefault() {} })
  };
}

const rows = (ui) => (ui.els['wb-items'].children || []);
const bar = (ui) => ui.els['wb-draw'];
const barButton = (ui) => (bar(ui).children || []).find((c) => c.className === 'wb-draw-btn') || null;
const barStatus = (ui) => (bar(ui).children || []).find((c) => c.className === 'wb-draw-status') || null;
const answerAll = (ui) => {
  const items = ui.run('workbookState.ex.items');
  items.forEach((it, i) => ui.run("wbPickChoice(" + i + ", '" + it.answer + "')"));
};
const answerWrong = (ui) => {
  const items = ui.run('workbookState.ex.items');
  items.forEach((it, i) => {
    const wrong = it.choices.find((c) => c.id !== it.answer);
    ui.run("wbPickChoice(" + i + ", '" + wrong.id + "')");
  });
};

console.log('====================================================');
console.log('ONE QUESTION AT A TIME');
console.log('====================================================');

const recipe = readJson(path.join('worlds', 'recipe1-questions.json'));
const topik = readJson(path.join('worlds', 'topik2-questions.json'));
const PAGE = 'r1-grammar-conn';
const page = recipe.exercises.find((e) => e.id === PAGE);
const N = page.items.length;

// ── 1. Where the switch is ───────────────────────────────────────────────────
console.log('\n--- 1. The switch ---');
const ui = loadUi(4242);
ui.open(recipe);
assert(bar(ui).className === 'wb-hidden', 'the list of exercises offers no draw — there is no page yet');
ui.run("openWorkbookExercise('" + PAGE + "')");
assert(rows(ui).length === N && N > 1, 'a page opens whole: all ' + N + ' questions of p.18');
assert(bar(ui).className === '' && barButton(ui) && barButton(ui).textContent === '🎲 One question at random'
  && !barStatus(ui), 'and offers to take them one at a time, above the questions');
const single = JSON.parse(JSON.stringify(recipe));
single.exercises[0].items = single.exercises[0].items.slice(0, 1);
const one = loadUi(1);
one.open(single, single.exercises[0].id);
assert(bar(one).className === 'wb-hidden', 'a page of one question offers nothing to draw from');
const paper = loadUi(9);
paper.open(topik, topik.exercises[0].id);
assert(bar(paper).className === 'on' && !barButton(paper) && /^🎲 Question \d+, drawn at random — 1 of \d+ this round$/.test(barStatus(paper).textContent),
  'the TOPIK paper, which always draws, says which question it drew and has no switch ("' + barStatus(paper).textContent + '")');

// ── 2. A drawn page ──────────────────────────────────────────────────────────
console.log('\n--- 2. A drawn question ---');
barButton(ui).onclick();
const ex1 = ui.run('workbookState.ex');
assert(ui.run('workbookState.draw') === true && rows(ui).length === 1 && ex1.items.length === 1,
  'the 🎲 leaves one question on the page');
assert(page.items.indexOf(ex1.items[0]) >= 0 || page.items.some((it) => it.n === ex1.items[0].n && it.answer === ex1.items[0].answer),
  'and it is one of the page\'s own questions (' + ex1.items[0].n + ')');
assert(ex1.id === PAGE && ex1.drawnFrom === N && ex1.drawnSeen === 1, 'drawn from the whole page, the first of its round');
assert(barStatus(ui).textContent === '🎲 Question ' + ex1.items[0].n + ', drawn at random — 1 of ' + N + ' this round',
  'the strip says which question it is: "' + barStatus(ui).textContent + '"');
assert(barButton(ui).textContent === '📋 All ' + N + ' questions', 'and offers the whole page back');
assert(ui.els['wb-count'].textContent === '0 / 1', 'the count is out of the one question on the page');
const dealt = ui.run('wbRowChoices(workbookState.ex.items[0], 0, 1)').map((c) => c.id).join();
assert(dealt === ex1.items[0].choices.map((c) => c.id).join(), 'its options keep the book\'s order, as the whole page does');

// ── 3. Checking it ───────────────────────────────────────────────────────────
console.log('\n--- 3. Its answer, alone ---');
answerAll(ui);
ui.run('checkWorkbook()');
const why = ui.els['wb-explain'].innerHTML;
assert((why.match(/class="wb-why-head"/g) || []).length === 1 && why.indexOf('>' + ex1.items[0].n + ')<') >= 0,
  'checking opens one explanation — this question\'s — and not the page\'s ten');
assert(ui.els['wb-check'].textContent === '다음 문제 →', 'the button under it moves on to the next question');
ui.els['wb-check'].onclick();
const ex2 = ui.run('workbookState.ex');
assert(ui.run('workbookState.checked') === false && ex2.items.length === 1 && ex2.drawnSeen === 2
  && ex2.items[0].n !== ex1.items[0].n, 'which is another question, the second of the round');
answerAll(ui);
ui.run('checkWorkbook()');
ui.key('Enter');
const ex3 = ui.run('workbookState.ex');
assert(ex3.drawnSeen === 3 && ui.run('workbookState.checked') === false,
  'Enter after checking does what the button says: the next question, not the same one again');

// ── 4. A round ───────────────────────────────────────────────────────────────
console.log('\n--- 4. A round meets every question once ---');
const seen = [ex1.items[0].n, ex2.items[0].n, ex3.items[0].n];
const order = [ex1.drawnSeen, ex2.drawnSeen, ex3.drawnSeen];
for (let k = 3; k < N; k++) {
  answerAll(ui);
  ui.run('checkWorkbook()');
  ui.run('wbAfterCheck()');
  const ex = ui.run('workbookState.ex');
  seen.push(ex.items[0].n);
  order.push(ex.drawnSeen);
}
assert(new Set(seen).size === N && seen.length === N, 'the first ' + N + ' draws are the ' + N + ' questions, each once ('
  + seen.join(' ') + ')');
assert(order.join() === Array.from({ length: N }, (_, i) => i + 1).join(), 'and count the round 1 to ' + N);
answerAll(ui);
ui.run('checkWorkbook()');
ui.run('wbAfterCheck()');
const next = ui.run('workbookState.ex');
assert(next.drawnSeen === 1 && next.items[0].n !== seen[N - 1],
  'the next round starts again at 1, and not on the question that closed the last one');

// ── 5. What a drawn question pays ────────────────────────────────────────────
console.log('\n--- 5. Its share of the page ---');
const pay = loadUi(77);
pay.open(recipe, PAGE);
pay.run('wbSetDraw(true)');
answerAll(pay);
pay.run('checkWorkbook()');
const right = pay.run('workbookState.gain.xp');
const whole = studySessionXp(N, N);
assert(right === Math.round(whole / N), 'a right answer drawn from p.18 earns ' + right + ' XP, a tenth of a clean page (' + whole + ')');
pay.run('wbAfterCheck()');
answerWrong(pay);
pay.run('checkWorkbook()');
const wrong = pay.run('workbookState.gain.xp');
assert(wrong === Math.round(studySessionXp(0, N) / N), 'a wrong one ' + wrong + ' XP, a tenth of a page with nothing right');
assert(right * N <= whole + N && studySessionXp(1, 1) > right * 2,
  'so ten right one at a time pay what the page pays (' + (right * N) + ' against ' + whole + '), not ten sittings\' worth ('
  + (studySessionXp(1, 1) * N) + ')');
assert(pay.honour.length === 0, 'and no honour: that is for a clean page, not a clean question');
pay.run('wbSetDraw(false)');
assert(rows(pay).length === N, 'the whole page again');
answerAll(pay);
pay.run('checkWorkbook()');
assert(pay.run('workbookState.gain.xp') === whole && pay.honour.join() === '2',
  'which pays as it always did: ' + whole + ' XP and the honour for a clean page');
const tp = loadUi(3);
tp.open(topik, topik.exercises[0].id);
answerAll(tp);
tp.run('checkWorkbook()');
assert(tp.run('workbookState.gain.xp') === studySessionXp(1, 1) && tp.honour.join() === '2',
  'and the TOPIK paper, a question a sitting by design, pays a sitting as before (' + studySessionXp(1, 1) + ' XP)');
assert(tp.els['wb-check'].textContent === (topik.nextKo || '다음 문제') + ' →', 'with its next-question button');
tp.key('Enter');
assert(tp.run('workbookState.checked') === false && tp.run('workbookState.ex.drawnSeen') === 2,
  'where Enter now draws the next question too, instead of re-asking the one whose answer is on screen');

// ── 6. Back to whole ─────────────────────────────────────────────────────────
console.log('\n--- 6. Back to the whole page ---');
const back = loadUi(12);
back.open(recipe, PAGE);
back.run('wbSetDraw(true)');
barButton(back).onclick();
assert(back.run('workbookState.draw') === false && rows(back).length === N && barButton(back).textContent === '🎲 One question at random',
  '📋 puts all ' + N + ' questions back, with the 🎲 above them');
back.run('wbSetDraw(true)');
back.run('backToWorkbookList()');
assert(back.run('workbookState.draw') === false && bar(back).className === 'wb-hidden', 'leaving for the list ends the draw');
back.run("openWorkbookExercise('" + PAGE + "')");
assert(rows(back).length === N, 'so the next page opens whole — one at a time is a choice made on a page');
answerAll(back);
back.run('checkWorkbook()');
const before = back.run('JSON.stringify(workbookState.ex.items.map(function (it) { return it.n; }))');
back.key('Enter');
assert(back.run('workbookState.checked') === false && rows(back).length === N
  && back.run('JSON.stringify(workbookState.ex.items.map(function (it) { return it.n; }))') === before,
'Enter on a checked whole page still deals it again (다시 풀기)');
// A shared box works drawn as well: one blank, the whole box of names to fill it from.
const u10 = readJson(path.join('worlds', 'unit10-workbook.json'));
const boxed = u10.exercises.find((e) => e.id === 'u10-vocab-4');
const box = loadUi(5);
box.open(u10, boxed.id);
box.run('wbSetDraw(true)');
const drawnRow = box.run('workbookState.ex.items[0]');
box.run("wbPickChip('" + drawnRow.answer + "')");
box.run('checkWorkbook()');
assert(rows(box).length === 1 && box.run('workbookState.chips.length') === boxed.bank.filter((c) => !c.usedByExample).length
  && box.run('workbookState.score') === 1, 'a page with a shared box draws too: one blank, the whole box, scored (' + boxed.id + ')');

// ── 7. Markup and words ──────────────────────────────────────────────────────
console.log('\n--- 7. Markup and both languages ---');
const html = read('index.html');
const at = (id) => html.indexOf('id="' + id + '"');
assert(at('wb-draw') > at('wb-blocks-example') && at('wb-draw') < at('wb-bank'),
  'index.html has the strip\'s host above the questions, after the worked example');
const en = read(path.join('js', 'locales', 'en.js'));
const vi = read(path.join('js', 'locales', 'vi.js'));
['ui.wb.draw.one', 'ui.wb.draw.all', 'ui.wb.draw.status'].forEach((k) => {
  const e = (en.match(new RegExp('"' + k.replace(/\./g, '\\.') + '": "([^"]*)"')) || [])[1];
  const v = (vi.match(new RegExp('"' + k.replace(/\./g, '\\.') + '": "([^"]*)"')) || [])[1];
  assert(!!e && !!v && e !== v, k + ' reads "' + e + '" and, in Vietnamese, "' + v + '"');
});
const ui2 = read(path.join('js', 'ui.js'));
assert(ui2.indexOf("hvT('ui.wb.draw.status'") >= 0 && ui2.indexOf("hvT('ui.wb.draw.one')") >= 0
  && ui2.indexOf("hvT('ui.wb.draw.all'") >= 0, 'and js/ui.js draws all three through hvT');

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_workbook_draw: all passed');
