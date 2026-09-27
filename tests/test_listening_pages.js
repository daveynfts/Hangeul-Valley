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
 * read by the renderer and kept by the admin validator), and so can one row. The same goes for a
 * 읽기 page, whose question row's gloss is "Which is true…? — The atmosphere and the service are
 * good.", and for a question row on any other page. This suite checks:
 *
 *   1. every 듣기 page in every bank holds it, and every row on one plays a recording;
 *   2. no note above a 듣기 page gives its key — neither by circled number nor by quoting a
 *      row's answer while leaving that row's other buttons out;
 *   3. the shipped renderer, driven in a sandbox, draws no gloss on a 듣기 page until the page is
 *      checked, draws them all afterwards, and still draws them up front on a grammar page;
 *   4. a save through the admin validator keeps the flag on the pages that have it and adds it to
 *      none that do not;
 *   5. and a held row keeps its voice as well: with no recording of its own, its 🔊 would read the
 *      row out with the key in it, so it has none until the page is checked.
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
const readingPages = [];
const questionRows = [];
// A question row asks something and takes a whole sentence as its answer — a Q or 질문 line and
// a line that is nothing but the blank. Its gloss is "Question? — Answer." wherever it sits.
const isQuestionRow = (it) => Array.isArray(it.lines)
  && it.lines.some((l) => /^(Q|질문)$/.test(l.who || '')) && it.lines.some((l) => String(l.ko).trim() === '{}');
BANKS.forEach((f) => {
  const bank = readJson(path.join('worlds', f));
  (bank.exercises || []).forEach((ex) => {
    if (/^듣기/.test(String(ex.no || ''))) pages.push({ f, bank, ex });
    else if (/^읽기/.test(String(ex.no || ''))) readingPages.push({ f, bank, ex });
    else (ex.items || []).filter(isQuestionRow).forEach((it) => questionRows.push({ f, bank, ex, it }));
  });
});

console.log('====================================================');
console.log('듣기 PAGES — ANSWERED OFF THE TAPE');
console.log('====================================================');

// ── 1. Every page holds its gloss and plays something ────────────────────────
console.log('\n--- 1. Every 듣기 page holds its English and plays a recording ---');
// Counted per unit: the 익힘책's 복습 banks carry 듣기 pages of their own, and belong to no unit.
const unitPages = pages.filter(({ f }) => /^unit\d+-/.test(f));
const units = [...new Set(unitPages.map(({ f }) => f.replace(/-.*$/, '')))];
assert(unitPages.length === 18 && units.length === 9,
  'eighteen 듣기 pages across the nine units (found ' + unitPages.length + ' across ' + units.join(', ') + ')');
const reviewPages = pages.filter(({ f }) => /^review\d+-/.test(f));
assert(reviewPages.length >= 5, 'and the 복습 banks their own (' + reviewPages.length + ')');
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

// ── 2b. A 읽기 page and a question row are answered off the page, not off the gloss ──
// "Which is true of this restaurant? — The atmosphere and the service are good." beside the row
// is the reading done for the learner. So every 읽기 page holds its English as a 듣기 page does,
// and a question row on any other page — a 과제's "which throw moves you two spaces? — Gae." —
// holds its own, leaving the rest of that page's glosses where they help.
console.log('\n--- 2b. 읽기 pages and question rows hold their English ---');
assert(readingPages.length >= 9, 'every unit’s 읽기 page is found (' + readingPages.length + ')');
const openReading = readingPages.filter(({ bank, ex }) => !(ex.holdGloss === true || bank.holdGloss === true)).map(({ ex }) => ex.id);
assert(openReading.length === 0, 'and every one holds its English until the page is checked'
  + (openReading.length ? ' — ' + openReading.join(', ') : ''));
const toldReading = readingPages.filter(({ ex }) => /\b(?:gives|is|keys)\s*[①-⑩]/.test(String(ex.noteEn || ''))).map(({ ex }) => ex.id);
assert(toldReading.length === 0, 'and no note above one states its key' + (toldReading.length ? ' — ' + toldReading.join(', ') : ''));
assert(questionRows.length >= 4, 'question rows on other pages are found (' + questionRows.length + ')');
const openQ = questionRows.filter(({ bank, ex, it }) => !(it.holdGloss === true || ex.holdGloss === true || bank.holdGloss === true))
  .map(({ ex, it }) => ex.id + ' row ' + it.n);
assert(openQ.length === 0, 'and each of them holds its own English' + (openQ.length ? ' — ' + openQ.join(', ') : ''));

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
// One held row on an otherwise open page: 문화 산책's question about the poem's season.
const u18 = readJson(path.join('worlds', 'unit18-textbook.json'));
const culture = u18.exercises.find((e) => e.id === 'u18sgk-culture-1');
const heldAt = culture.items.findIndex((it) => it.holdGloss === true);
const rowUi = loadUi();
rowUi.open(u18, culture.id);
const shown = glosses(rowUi.els);
assert(heldAt >= 0 && shown.length === culture.items.length && !shown[heldAt]
  && shown.filter((g, k) => k !== heldAt).every(Boolean),
  'a row that holds its gloss draws none, and the rest of its page still draws theirs (' + culture.id + ' row ' + (heldAt + 1) + ')');
culture.items.forEach((it, i) => rowUi.run("wbPickChoice(" + i + ", '" + it.answer + "')"));
rowUi.run('checkWorkbook()');
assert(glosses(rowUi.els).every(Boolean), 'and draws it once the page is checked');

// A held row's 🔊 reads the row out with the right answers filled in — what a drill wants, and
// on a held row the key. So until the page is checked it has no button unless it has a
// recording of its own, which is the tape the page is about.
const sayButton = (els, k) => {
  const row = (els['wb-items'].children || [])[k];
  const exp = row && (row.children || []).find((c) => c.className === 'wb-exp');
  const head = exp && (exp.children || []).find((c) => c.className === 'wb-exp-head');
  return ((head && head.children) || []).find((c) => /^wb-say/.test(c.className || '')) || null;
};
const reading = u12.exercises.find((e) => e.holdGloss === true && /^읽기/.test(e.no)
  && e.items.every((it) => !it.audio));
const readUi = loadUi();
readUi.open(u12, reading.id);
assert(reading.items.every((it, k) => !sayButton(readUi.els, k)),
  'a held row with no recording has no 🔊 before the page is checked (' + reading.id + ')');
readUi.run('var __spoken = []; speakKorean = function (t) { __spoken.push(String(t)); };');
reading.items.forEach((it, i) => readUi.run("wbPickChoice(" + i + ", '" + it.answer + "')"));
readUi.run('checkWorkbook()');
const after0 = sayButton(readUi.els, 0);
assert(!!after0, 'and gets one once it has been checked');
if (after0) after0.onclick({ stopPropagation() {} });
const keyed0 = reading.items[0].choices.find((c) => c.id === reading.items[0].answer).ko;
assert(readUi.run('__spoken.length') === 1 && readUi.run('__spoken[0]').indexOf(keyed0) >= 0,
  'which reads the row with its answer in it, as it always did');
const listenUi = loadUi();
listenUi.open(u12, listen.id);
assert(listen.items.every((it, k) => !!sayButton(listenUi.els, k)),
  'a 듣기 row keeps its button before checking — it plays the tape, which is the question');
assert(grammar.items.every((it, k) => !!sayButton(gram.els, k)),
  'and so does every row on a page that holds nothing');

// ── 4. A save keeps the flag ─────────────────────────────────────────────────
console.log('\n--- 4. A save through the admin keeps it ---');
const { validateWorkbook } = require(path.join(ROOT, 'admin', 'lib', 'workbook.js'));
const saved = validateWorkbook(u12, path.join('worlds', 'unit12-textbook.json'));
const kept = saved.exercises.filter((e) => /^(듣기|읽기)/.test(e.no)).every((e) => e.holdGloss === true);
assert(kept, 'validateWorkbook keeps holdGloss on the 듣기 and 읽기 pages');
const sameFlags = saved.exercises.every((e, k) => (e.holdGloss === true) === (u12.exercises[k].holdGloss === true)
  && e.items.every((it, j) => (it.holdGloss === true) === (u12.exercises[k].items[j].holdGloss === true)));
assert(sameFlags, 'and on the rows that ask for it, giving it to no page or row that did not');
assert(saved.exercises.some((e) => e.items.some((it) => it.holdGloss === true)), 'a held row survives the save as well');

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_listening_pages: all passed');
