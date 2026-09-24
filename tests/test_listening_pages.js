'use strict';
/**
 * tests/test_listening_pages.js — a 듣기 page is answered off the tape, not off the screen.
 *
 * Every unit bank draws a row's English gloss beside it before the row is checked. On a grammar
 * page that is the help it was written as: the learner knows what the sentence means and has to
 * build the form. On a 듣기 page it is a transcript of what the tape is about to say — "I studied
 * hard, but I did badly in the exam" beside a blank whose buttons are 잘 봐서 / 안 봐서 / 못 봐서
 * — so the page could be done with the sound off. All fourteen 듣기 pages worked that way, and
 * the note above four of them named the key outright ("모범 답안 gives ②", "gives 가을, 1년 and
 * 오후 4시").
 *
 * A page can now hold its gloss back the way the exam bank always has (`holdGloss` on the page,
 * read by the renderer and kept by the admin validator). This suite checks:
 *
 *   1. every 듣기 page in every bank holds it, and every row on one plays a recording;
 *   2. no note above a 듣기 page gives its key — neither by circled number nor by quoting a
 *      row's answer while leaving that row's other buttons out;
 *   3. the shipped renderer, driven in a sandbox, draws no gloss on a 듣기 page until the page is
 *      checked, draws them all afterwards, and still draws them up front on a grammar page;
 *   4. a save through the admin validator keeps the flag on the pages that have it and adds it to
 *      none that do not.
 *
 * Run: node tests/test_listening_pages.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readJson = (rel) => JSON.parse(read(rel));
const nfc = (s) => String(s == null ? '' : s).normalize('NFC');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

const BANKS = fs.readdirSync(path.join(ROOT, 'worlds')).filter((f) => /-(?:text|work)book\.json$/.test(f)).sort();
const pages = [];
BANKS.forEach((f) => {
  const bank = readJson(path.join('worlds', f));
  (bank.exercises || []).forEach((ex) => {
    if (/^듣기/.test(String(ex.no || ''))) pages.push({ f, bank, ex });
  });
});

console.log('====================================================');
console.log('듣기 PAGES — ANSWERED OFF THE TAPE');
console.log('====================================================');

// ── 1. Every page holds its gloss and plays something ────────────────────────
console.log('\n--- 1. Every 듣기 page holds its English and plays a recording ---');
const units = [...new Set(pages.map(({ f }) => f.replace(/-.*$/, '')))];
assert(pages.length === 14 && units.length === 7,
  'fourteen 듣기 pages across seven units (found ' + pages.length + ' across ' + units.join(', ') + ')');
const open = pages.filter(({ bank, ex }) => !(ex.holdGloss === true || bank.holdGloss === true)).map(({ ex }) => ex.id);
assert(open.length === 0, 'every one holds its English gloss until the row is checked'
  + (open.length ? ' — ' + open.join(', ') : ''));
const silent = [];
pages.forEach(({ ex }) => (ex.items || []).forEach((it) => {
  if (!(it.audio && it.audio.src && fs.existsSync(path.join(ROOT, it.audio.src)))) silent.push(ex.id + ' row ' + it.n);
}));
assert(silent.length === 0, 'and every row on one plays a recording that is on disk'
  + (silent.length ? ' — ' + silent.slice(0, 6).join(', ') : ''));

// ── 2. The note above the rows does not answer them ──────────────────────────
console.log('\n--- 2. No note gives its page away ---');
const told = pages.filter(({ ex }) => /\b(?:gives|is|keys)\s*[①-⑩]/.test(String(ex.noteEn || ''))).map(({ ex }) => ex.id);
assert(told.length === 0, 'no note states the circled number 모범 답안 prints'
  + (told.length ? ' — ' + told.join(', ') : ''));
// A note may name a row's buttons — "the four options are long or short, permed or straight" —
// as long as it names them all. Quoting the one that is keyed and none of the others is the key.
const bare = (s) => nfc(s).replace(/^[①-⑩]\s*/, '').replace(/[.?!…]+$/, '').trim();
const quoted = [];
pages.forEach(({ ex }) => {
  const note = nfc(ex.noteEn);
  (ex.items || []).forEach((it) => {
    [[it.answer, it.choices], [it.answer2, it.choices2]].forEach(([ans, list]) => {
      const right = (list || []).find((c) => c.id === ans);
      if (!right) return;
      const ko = bare(right.ko);
      if (ko.replace(/\s/g, '').length < 2 || note.indexOf(ko) < 0) return;
      const others = (list || []).filter((c) => c.id !== ans).map((c) => bare(c.ko));
      if (others.some((o) => note.indexOf(o) < 0)) quoted.push(ex.id + ' row ' + it.n + ' «' + ko + '»');
    });
  });
});
assert(quoted.length === 0, 'and none quotes a row’s answer without its other buttons'
  + (quoted.length ? ' — ' + quoted.join(', ') : ''));

// ── 3. The renderer draws no gloss until the page is checked ─────────────────
console.log('\n--- 3. The shipped renderer holds the gloss ---');
// The DOM stub and sandbox are the ones tests/test_workbook_button_order.js drives.
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

function loadUi() {
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
  Object.assign(real, {
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
  vm.runInContext(read(path.join('js', 'workbookArt.js')), sandbox);
  vm.runInContext(read(path.join('js', 'i18n.js')), sandbox);
  vm.runInContext(read(path.join('js', 'ui.js')), sandbox);
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

// Whether each drawn row carries its gloss, read off the head the renderer built for it.
function glosses(els) {
  return (els['wb-items'].children || []).map((row) => {
    const exp = (row.children || []).find((c) => c.className === 'wb-exp');
    const head = exp && (exp.children || []).find((c) => c.className === 'wb-exp-head');
    return /class="wb-exp-en"/.test(String(head && head.innerHTML));
  });
}

// Unit 12's bank sets no holdGloss of its own, so whatever holds the gloss here is the page.
const u12 = readJson(path.join('worlds', 'unit12-textbook.json'));
assert(u12.holdGloss !== true, 'the bank under test holds nothing itself (' + u12.id + ')');
const listen = u12.exercises.find((e) => e.id === 'u12sgk-listen-1');
const ui = loadUi();
ui.open(u12, listen.id);
const before = glosses(ui.els);
assert(before.length === listen.items.length && before.every((g) => !g),
  'a 듣기 page draws no English beside its ' + listen.items.length + ' rows before it is checked');
// The page only checks once every blank is filled, and filling one is not checking it.
listen.items.forEach((it, i) => ui.run("wbPickChoice(" + i + ", '" + it.answer + "')"));
assert(glosses(ui.els).every((g) => !g), 'nor once every row has an answer picked but not yet checked');
ui.run('checkWorkbook()');
assert(ui.run('workbookState.checked') === true, 'the page checks');
const after = glosses(ui.els);
assert(after.length === listen.items.length && after.every(Boolean),
  'and draws it beside every row once the page is checked');
ui.run('resetWorkbook()');
assert(glosses(ui.els).every((g) => !g), '다시 풀기 holds it back again');
const grammar = u12.exercises.find((e) => e.id === 'u12sgk-gram-1');
const gram = loadUi();
gram.open(u12, grammar.id);
assert(grammar.holdGloss !== true && glosses(gram.els).every(Boolean),
  'a grammar page in the same bank still draws its gloss up front, which is what it is there for');

// ── 4. A save keeps the flag ─────────────────────────────────────────────────
console.log('\n--- 4. A save through the admin keeps it ---');
const { validateWorkbook } = require(path.join(ROOT, 'admin', 'lib', 'workbook.js'));
const saved = validateWorkbook(u12, path.join('worlds', 'unit12-textbook.json'));
const kept = saved.exercises.filter((e) => /^듣기/.test(e.no)).every((e) => e.holdGloss === true);
assert(kept, 'validateWorkbook keeps holdGloss on the 듣기 pages');
assert(saved.exercises.filter((e) => !/^듣기/.test(e.no)).every((e) => !('holdGloss' in e)),
  'and gives it to no page that did not ask for it');

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_listening_pages: all passed');
