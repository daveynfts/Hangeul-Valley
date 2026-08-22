/**
 * tests/test_unit14_workbook.js — the Unit 14 workbook page on the study desk.
 *
 * Covers the textbook answer key for 어휘 연습 1, the one-chip-per-blank rule,
 * the 해요 conjugation the blanks are filled with, scoring, and the explanation
 * cards. The interaction logic runs for real: js/ui.js is loaded into a sandbox
 * with a DOM stub, so the assertions read what the renderer actually wrote
 * rather than trusting that it was called.
 *
 * Run: node tests/test_unit14_workbook.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const wb = JSON.parse(fs.readFileSync(path.join(ROOT, 'worlds', 'unit14-workbook.json'), 'utf8'));
const uiSrc = fs.readFileSync(path.join(ROOT, 'js', 'ui.js'), 'utf8');
const artSrc = fs.readFileSync(path.join(ROOT, 'js', 'workbookArt.js'), 'utf8');
const farm = fs.readFileSync(path.join(ROOT, 'js', 'scenes', 'farm.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'css', 'game.css'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'js', 'manifest.json'), 'utf8'));

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

// ── A DOM stub the renderer can actually write into ──────────────────────────
// The experience row is built from child elements, so its own innerHTML is
// empty. Assertions about what a row shows have to walk the subtree.
function deepHtml(el) {
  if (!el) return '';
  return (el.innerHTML || '') + (el.children || []).map(deepHtml).join('');
}
function deepText(el) {
  if (!el) return '';
  return (el.textContent || '') + (el.children || []).map(deepText).join('');
}

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
    // innerHTML has to drop the children the way the real one does. Without
    // this the renderer's `list.innerHTML = ''` leaves the previous pass in
    // place, every re-render doubles the rows, and an assertion that counts
    // them reads a number no browser would ever produce.
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
    // Lazily materialised, so the renderer finds every id the markup declares.
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

// Everything js/ui.js reaches for at load time that lives in another file
// resolves to a harmless no-op through this proxy. The few globals whose return
// value is actually used are stubbed for real below.
function loadUi() {
  const { document, els } = makeDom();
  const real = Object.create(null);
  const noop = function () { return undefined; };
  const sandbox = new Proxy(real, {
    has() { return true; },
    get(t, k) {
      if (k in t) return t[k];
      if (typeof k === 'symbol') return undefined;
      // Built-ins have to stay themselves: swallowing Promise or Math into the
      // no-op would break the module rather than stub it.
      if (k in globalThis) return globalThis[k];
      return noop;
    },
    set(t, k, v) { t[k] = v; return true; },
    defineProperty(t, k, d) { Object.defineProperty(t, k, d); return true; },
    deleteProperty(t, k) { delete t[k]; return true; }
  });
  const sfx = [];
  const quests = [];
  Object.assign(real, {
    console: { log() {}, info() {}, warn() {}, error() {} },
    IS_NODE: true,
    document: document,
    window: { addEventListener() {} },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    activeModalStack: [],
    playerLocked: false,
    playChiptuneSFX: (t) => { sfx.push(t); },
    checkQuestProgress: (k, o) => { quests.push([k, o]); },
    ensurePlayerRank: noop,
    studySessionXp: (score, total) => score * 14 + 10 + (score === total ? 20 : 0),
    addPlayerXp: (xp) => ({ leveled: false, level: 1, xp: xp, need: 100 }),
    addHonor: noop,
    persistSave: noop,
    updateRankHUD: noop,
    isUnit14World: () => true
  });
  vm.createContext(sandbox);
  // The grammar exercise draws its own icons, so the art module has to be in the
  // sandbox before ui.js renders a row that calls workbookIconSvg.
  vm.runInContext(artSrc, sandbox);
  vm.runInContext(uiSrc, sandbox);
  return {
    els, sfx, quests,
    run: (expr) => vm.runInContext(expr, sandbox),
    call: (fn, ...args) => {
      real.__args = args;
      return vm.runInContext(fn + '.apply(null, __args)', sandbox);
    },
    // openWorkbook lands on the exercise list now, so a test that wants to be
    // inside an exercise has to say which. Passing null stays on the list.
    setBank: (exId) => {
      real.__wb = wb;
      vm.runInContext('openWorkbook(__wb)', sandbox);
      if (exId !== null) {
        vm.runInContext("openWorkbookExercise('" + (exId || 'u14-vocab-1') + "')", sandbox);
      }
    }
  };
}

console.log('====================================================');
console.log('UNIT 14 WORKBOOK');
console.log('====================================================\n');

// ── 1. The exercise matches the textbook ─────────────────────────────────────
console.log('--- 1. Textbook fidelity ---');
const ex = wb.exercises[0];
assert(wb.exercises.length >= 1, 'the workbook holds at least one exercise');
assert(ex.section === '어휘' && ex.no === '연습 1', 'first exercise is 어휘 연습 1');
assert(ex.instructionKo === '[보기]와 같이 알맞은 것을 골라 문장을 만들어 보세요.',
  'the Korean instruction is the printed one');
assert(ex.bank.length === 5, 'five expressions in the box');
const example = ex.bank.filter(b => b.usedByExample);
assert(example.length === 1 && example[0].id === 'two_hands',
  'exactly one expression is spent on the worked example — 두 손으로 드리다');
assert(ex.items.length === 4, 'four sentences to complete');

// The answer key from the back of the book.
const KEY = [
  [1, 'turn_head', '고개를 돌리고 마셔요', '어른들과 술을 마실 때'],
  [2, 'bow', '고개를 숙여서 인사해요', '어른들께 인사할 때'],
  [3, 'honorific', '높임말을 해요', '처음 만난 사람과 이야기할 때'],
  [4, 'yield_seat', '자리를 양보해요', '버스에 나이가 많은 분이 계시면']
];
KEY.forEach(([n, id, polite, stem]) => {
  const item = ex.items.find(i => i.n === n);
  assert(!!item, 'item ' + n + ' exists');
  assert(item && item.answer === id, 'item ' + n + ' answers ' + id);
  assert(item && item.stemKo === stem, 'item ' + n + ' prompt matches the book');
  const chip = ex.bank.find(b => b.id === id);
  assert(chip && chip.polite === polite, 'item ' + n + ' fills in ' + polite);
});

// One-to-one is the rule the circled example establishes.
const answers = ex.items.map(i => i.answer);
assert(new Set(answers).size === answers.length, 'no expression answers two sentences');
assert(answers.every(a => ex.bank.some(b => b.id === a && !b.usedByExample)),
  'every answer is a chip the learner can actually pick');
const spare = ex.bank.filter(b => !b.usedByExample).length - ex.items.length;
assert(spare === 0, 'the four remaining chips map onto the four blanks exactly');

// The 해요 forms are irregular, which is why they are data and not derived.
assert(ex.bank.every(b => b.dict && b.polite && b.dict !== b.polite),
  'every chip carries both the dictionary form and the 해요 form');
assert(ex.bank.find(b => b.id === 'turn_head').dict === '고개를 돌리고 마시다',
  '마시다 is stored in its dictionary form');
assert(ex.example.answer === 'two_hands' &&
  ex.bank.find(b => b.id === 'two_hands').polite === '두 손으로 드려요',
  'the worked example reads 두 손으로 드려요');

console.log('\n--- 2. Every answer is explained ---');
ex.items.forEach(item => {
  assert(!!item.why && item.why.length > 40, 'item ' + item.n + ' explains why the etiquette applies');
  assert(!!item.grammar, 'item ' + item.n + ' explains the conjugation');
  assert(!!item.en, 'item ' + item.n + ' has an English gloss');
});
assert(ex.items.find(i => i.n === 1).grammar.indexOf('마셔요') >= 0, 'item 1 names the 마시다 → 마셔요 contraction');
assert(ex.items.find(i => i.n === 2).grammar.indexOf('해요') >= 0, 'item 2 names the 하다 → 해요 irregular');
assert(ex.items.find(i => i.n === 4).grammar.indexOf('계시다') >= 0, 'item 4 points out the honorific 계시다');

// ── 3. The interaction runs ──────────────────────────────────────────────────
console.log('\n--- 3. Interaction ---');
{
  const ui = loadUi();
  ui.setBank();
  assert(ui.run('!!workbookState'), 'opening the workbook builds state');
  assert(ui.run('workbookState.chips.length') === 4, 'the example chip is not offered as a choice');
  assert(ui.run('workbookState.fill.filter(Boolean).length') === 0, 'all four blanks start empty');
  assert(ui.run('workbookState.focus') === 0, 'focus starts on the first blank');

  // Mouse path: pick a chip for the focused blank.
  ui.run("wbPickChip('bow')");
  assert(ui.run('workbookState.fill[0]') === 'bow', 'picking a chip fills the focused blank');
  assert(ui.run('workbookState.focus') === 1, 'focus advances to the next empty blank');

  // The blank shows the conjugated form, not the dictionary form.
  const rows = ui.els['wb-items'].children;
  assert(rows.length === 4, 'four sentence rows are rendered');
  assert(rows[0].innerHTML.indexOf('고개를 숙여서 인사해요') >= 0,
    'the filled blank shows the 해요 form');
  assert(rows[0].innerHTML.indexOf('고개를 숙여서 인사하다') < 0,
    'and not the dictionary form');

  // One chip per blank: re-picking a placed chip moves it instead of cloning it.
  ui.run('workbookState.focus = 2');
  ui.run("wbPickChip('bow')");
  assert(ui.run('workbookState.fill[0]') === null, 'the chip leaves its old blank');
  assert(ui.run('workbookState.fill[2]') === 'bow', 'and lands in the new one');
  assert(ui.run('workbookState.fill.filter(v => v === "bow").length') === 1,
    'the same expression can never answer two sentences');

  // Keyboard path: focus movement wraps, and clearing empties the focused blank.
  ui.run('workbookState.focus = 3; wbMoveFocus(1)');
  assert(ui.run('workbookState.focus') === 0, 'focus wraps past the last blank');
  ui.run('workbookState.focus = 0; wbMoveFocus(-1)');
  assert(ui.run('workbookState.focus') === 3, 'and wraps backwards past the first');
  ui.run('workbookState.focus = 2; wbClearBlank()');
  assert(ui.run('workbookState.fill[2]') === null, 'clearing empties the focused blank');

  // Check is refused until the page is complete.
  ui.run('checkWorkbook()');
  assert(ui.run('workbookState.checked') === false, 'an incomplete page cannot be checked');
}

// ── 4. Scoring and the explanations ──────────────────────────────────────────
console.log('\n--- 4. Scoring and explanations ---');
{
  const ui = loadUi();
  ui.setBank();
  // Fill it exactly right.
  KEY.forEach(([n, id]) => {
    ui.run('workbookState.focus = ' + (n - 1));
    ui.run("wbPickChip('" + id + "')");
  });
  ui.run('checkWorkbook()');
  assert(ui.run('workbookState.checked') === true, 'a complete page can be checked');
  assert(ui.run('workbookState.score') === 4, 'all four correct scores 4');
  assert(ui.run('workbookState.gain && workbookState.gain.xp > 0'), 'a checked page awards XP');
  assert(ui.quests.some(q => q[0] === 'desk'), 'the page counts toward the desk quest');
  const explain = ui.els['wb-explain'];
  assert(explain.className === 'shown', 'the explanation panel opens after checking');
  assert(explain.innerHTML.indexOf('마셔요') >= 0, 'the explanations name the conjugated answer');
  assert(explain.innerHTML.indexOf('계시다') >= 0, 'and carry the grammar note');
  assert((explain.innerHTML.match(/wb-why/g) || []).length >= 4, 'one card per sentence');
  assert(explain.innerHTML.indexOf('wb-why-yours') < 0,
    'a perfect page does not print "you put" lines');

  // Reset puts the page back without reloading it.
  ui.run('resetWorkbook()');
  assert(ui.run('workbookState.checked') === false && ui.run('workbookState.score') === 0,
    'reset clears the marking');
  assert(ui.run('workbookState.fill.filter(Boolean).length') === 0, 'and empties the blanks');
}
{
  const ui = loadUi();
  ui.setBank();
  // Two swapped: the explanation has to show what was put as well as the answer.
  const wrong = ['bow', 'turn_head', 'honorific', 'yield_seat'];
  wrong.forEach((id, i) => {
    ui.run('workbookState.focus = ' + i);
    ui.run("wbPickChip('" + id + "')");
  });
  ui.run('checkWorkbook()');
  assert(ui.run('workbookState.score') === 2, 'two swapped answers score 2 of 4');
  const explain = ui.els['wb-explain'];
  assert(explain.innerHTML.indexOf('wb-why-yours') >= 0,
    'a wrong blank reports what the learner put');
  assert(explain.innerHTML.indexOf('고개를 돌리고 마셔요') >= 0,
    'and still shows the correct sentence');
  const rows = ui.els['wb-items'].children;
  assert(rows[0].innerHTML.indexOf('✕') >= 0 && rows[2].innerHTML.indexOf('✓') >= 0,
    'each row is marked individually');
}

// ── 5. Wiring ────────────────────────────────────────────────────────────────
console.log('\n--- 5. Wiring ---');
assert(/case 'desk':[\s\S]{0,200}openStudyDesk/.test(farm), 'the desk sprite opens the chooser');
assert(farm.indexOf('openDeskQuiz') >= 0, 'the quiz is still reachable as the fallback');
assert(uiSrc.indexOf("'/worlds/unit14-workbook.json'") >= 0, 'the loader knows the Unit 14 page');
assert(uiSrc.indexOf('deskMenuOptions.length === 1') >= 0,
  'a world with no workbook skips the chooser instead of showing one live row');
['desk-menu-overlay', 'desk-menu-list', 'workbook-overlay', 'wb-instruction', 'wb-example',
  'wb-bank', 'wb-items', 'wb-explain', 'wb-check', 'wb-count', 'wb-hint'
].forEach((id) => {
  assert(html.indexOf('id="' + id + '"') >= 0, 'markup declares #' + id);
});
['openStudyDesk', 'closeDeskMenu', 'openWorkbook', 'closeWorkbook', 'checkWorkbook', 'resetWorkbook']
  .forEach((fn) => {
    assert(uiSrc.indexOf('window.' + fn + ' = ' + fn) >= 0, fn + ' is exported');
  });
assert(css.indexOf('#workbook-overlay') >= 0 && css.indexOf('.wb-chip') >= 0
  && css.indexOf('.wb-why-gram') >= 0, 'the page is styled');
// Escape belongs to the modal-stack handler; handling it twice closes two overlays.
const kb = uiSrc.slice(uiSrc.indexOf("if (e.key === 'Escape') return;"));
assert(uiSrc.indexOf("if (e.key === 'Escape') return;") >= 0,
  'the workbook key handler leaves Escape to the modal stack');
assert(kb.indexOf("top === 'desk-menu-overlay'") >= 0, 'the chooser takes number and arrow keys');
assert(kb.indexOf('wbMoveFocus(1)') >= 0 && kb.indexOf('wbClearBlank()') >= 0,
  'arrows move between blanks and Backspace clears one');
assert(kb.indexOf('/^[1-9]$/') >= 0, 'number keys pick an expression');

// ── 6. One exercise at a time ────────────────────────────────────────────────
console.log('\n--- 6. Exercise list ---');
{
  const ui = loadUi();
  ui.setBank(null);
  assert(ui.run('workbookState.mode') === 'pick', 'the page opens on the list, not on an exercise');
  assert(ui.run('workbookState.ex') === null, 'no exercise is loaded yet');
  // The list is grouped, so its children are section headers plus rows. Only the
  // rows carry data-exercise.
  const rows = ui.els['wb-items'].children.filter(r => r.attrs['data-exercise']);
  assert(rows.length === wb.exercises.length, 'one row per exercise (' + rows.length + ')');
  assert(ui.els['wb-items'].className === 'wb-items-pick', 'the list uses its own layout');
  // Nothing that belongs to an exercise may be on screen while the list is.
  assert(ui.els['wb-bank'].className === 'wb-hidden', 'the bank is hidden on the list');
  assert(ui.els['wb-example'].className === 'wb-hidden', 'the worked example is hidden on the list');
  assert(ui.els['wb-check'].className === 'wb-hidden', 'the check button is hidden on the list');
  assert(ui.els['wb-back'].className === 'wb-hidden', 'the back button is hidden on the list');
  wb.exercises.forEach((ex) => {
    assert(rows.some(r => r.attrs['data-exercise'] === ex.id), 'the list offers ' + ex.no);
  });

  // Keys that only make sense inside an exercise must be inert here.
  ui.run("wbPickChip('no_food')");
  assert(ui.run('workbookState.mode') === 'pick', 'picking a chip on the list does nothing');
  ui.run('checkWorkbook(); resetWorkbook(); wbMoveFocus(1); wbClearBlank()');
  assert(ui.run('workbookState.mode') === 'pick' && ui.run('!workbookState.fill'),
    'no exercise-only call can reach into state that does not exist yet');

  // Open one, then come back.
  ui.run("openWorkbookExercise('u14-vocab-3')");
  assert(ui.run('workbookState.mode') === 'exercise', 'choosing a row opens it');
  assert(ui.run('workbookState.ex.id') === 'u14-vocab-3', 'and opens the row that was chosen');
  assert(ui.els['wb-back'].className === '', 'the back button appears inside an exercise');
  ui.run('backToWorkbookList()');
  assert(ui.run('workbookState.mode') === 'pick' && ui.run('workbookState.ex') === null,
    'back returns to the list');
  ui.run("openWorkbookExercise('nope')");
  assert(ui.run('workbookState.mode') === 'pick', 'an unknown exercise id is ignored');
}

// ── 7. 연습 2 — joining two columns ──────────────────────────────────────────
console.log('\n--- 7. 연습 2 (match) ---');
const ex2 = wb.exercises.find(e => e.id === 'u14-vocab-2');
{
  assert(!!ex2 && ex2.type === 'match', '연습 2 is a match exercise');
  assert(ex2.instructionKo === '알맞은 것끼리 연결하여 한 문장으로 만들어 보세요.',
    'the Korean instruction is the printed one');
  assert(!ex2.example, 'the book prints no worked example for 연습 2');
  assert(ex2.bank.length === 4 && ex2.items.length === 4, 'four phrases join four situations');
  assert(ex2.bank.every(b => b.mark), 'each right-hand phrase keeps its printed ①②③④ mark');
  // The answer key: 1)② 2)③ 3)① 4)④
  const KEY2 = [[1, 'm_call_name', '②'], [2, 'm_one_hand', '③'], [3, 'm_cross_legs', '①'], [4, 'm_banmal', '④']];
  KEY2.forEach(([n, id, mark]) => {
    const item = ex2.items.find(i => i.n === n);
    assert(item && item.answer === id, '연습 2 item ' + n + ' answers ' + mark);
    const chip = ex2.bank.find(b => b.id === id);
    assert(chip && chip.mark === mark, 'and ' + id + ' is the one printed as ' + mark);
  });
  const a2 = ex2.items.map(i => i.answer);
  assert(new Set(a2).size === 4, 'no phrase is used twice');
  assert(ex2.items.every(i => i.why && i.grammar), 'every join is explained');
  assert(ex2.bank.every(b => /지 마세요\.$/.test(b.ko)), 'every phrase is a -지 마세요 command');
  assert(ex2.items.find(i => i.n === 4).grammar.indexOf('하지 마세요') >= 0,
    'item 4 contrasts the regular 하지 마세요 with the irregular 해요');

  const ui = loadUi();
  ui.setBank('u14-vocab-2');
  assert(ui.run('workbookState.chips.length') === 4, 'all four phrases are offered');
  ui.run("wbPickChip('m_call_name')");
  const rows = ui.els['wb-items'].children;
  assert(ui.els['wb-items'].className === 'wb-items-match', 'match rows use the two-column layout');
  assert(rows[0].innerHTML.indexOf('wb-left') >= 0 && rows[0].innerHTML.indexOf('wb-join') >= 0,
    'a match row draws the situation, the join and the phrase');
  assert(rows[0].innerHTML.indexOf('이름을 부르지 마세요.') >= 0, 'the joined phrase is shown in full');
  // Score it exactly right.
  ['m_call_name', 'm_one_hand', 'm_cross_legs', 'm_banmal'].forEach((id, i) => {
    ui.run('workbookState.focus = ' + i);
    ui.run("wbPickChip('" + id + "')");
  });
  ui.run('checkWorkbook()');
  assert(ui.run('workbookState.score') === 4, 'the textbook key scores 4 of 4');
  assert(ui.els['wb-explain'].innerHTML.indexOf('-지 마세요') >= 0,
    'the explanations cover the -지 마세요 form');
}

// ── 8. 연습 3 — completing a dialogue ────────────────────────────────────────
console.log('\n--- 8. 연습 3 (dialogue) ---');
const ex3 = wb.exercises.find(e => e.id === 'u14-vocab-3');
{
  assert(!!ex3 && ex3.type === 'dialogue', '연습 3 is a dialogue exercise');
  assert(ex3.reply === '아, 그래요? 죄송합니다.', "B's line is the same apology throughout");
  assert(ex3.bank.length === 5, 'five signs in the box');
  assert(ex3.bank.filter(b => b.usedByExample).length === 1
    && ex3.bank.find(b => b.usedByExample).id === 'no_smoking',
    '금연 is the circled example');
  // The blank sits mid-sentence, so every line needs a placeholder.
  assert(ex3.example.aKo.indexOf('{}') >= 0, "the example's A line marks where the sign goes");
  assert(ex3.items.every(i => i.aKo.indexOf('{}') >= 0), 'every A line marks where the sign goes');
  const KEY3 = [[1, 'no_food', '음식물 반입 금지'], [2, 'no_photos', '사진 촬영 금지'],
    [3, 'no_phones', '휴대 전화 사용 금지'], [4, 'no_parking', '주차 금지']];
  KEY3.forEach(([n, id, ko]) => {
    const item = ex3.items.find(i => i.n === n);
    assert(item && item.answer === id, '연습 3 item ' + n + ' answers ' + ko);
    assert(ex3.bank.find(b => b.id === id).ko === ko, 'and ' + id + ' reads ' + ko);
  });
  assert(new Set(ex3.items.map(i => i.answer)).size === 4, 'no sign is used twice');
  assert(ex3.items.every(i => i.why && i.grammar), 'every sign is explained');
  assert(ex3.bank.every(b => !b.polite), 'signs are nouns — there is nothing to conjugate');

  const ui = loadUi();
  ui.setBank('u14-vocab-3');
  assert(ui.run('workbookState.chips.length') === 4, 'the example sign is not offered');
  ui.run("wbPickChip('no_food')");
  const rows = ui.els['wb-items'].children;
  assert(ui.els['wb-items'].className === 'wb-items-dialogue', 'dialogue rows use their own layout');
  assert((rows[0].innerHTML.match(/wb-spk/g) || []).length === 2, 'a row shows both speakers');
  assert(rows[0].innerHTML.indexOf('음식물 반입 금지') >= 0, 'the sign lands inside A’s line');
  assert(rows[0].innerHTML.indexOf('아, 그래요? 죄송합니다.') >= 0, "and B's reply is printed");
  assert(rows[0].innerHTML.indexOf('여기는') < rows[0].innerHTML.indexOf('음식물 반입 금지')
    && rows[0].innerHTML.indexOf('음식물 반입 금지') < rows[0].innerHTML.indexOf('입니다'),
    'the sign sits between 여기는 and 입니다, not at the end of the line');
  assert(ui.els['wb-example'].innerHTML.indexOf('금연') >= 0, 'the worked example shows 금연 filled in');
  KEY3.forEach(([n, id]) => {
    ui.run('workbookState.focus = ' + (n - 1));
    ui.run("wbPickChip('" + id + "')");
  });
  ui.run('checkWorkbook()');
  assert(ui.run('workbookState.score') === 4, 'the textbook key scores 4 of 4');
}

// ── 9. Full screen ──────────────────────────────────────────────────────────
console.log('\n--- 9. Full screen ---');
{
  const panel = css.slice(css.indexOf('#workbook-panel {'));
  assert(panel.indexOf('width: 100%') >= 0 && panel.indexOf('height: 100%') >= 0,
    'the workbook panel fills the viewport');
  assert(panel.indexOf('max-width: none') >= 0, 'and is not held to the modal width');
  assert(css.indexOf('.wb-items-pick') >= 0 && css.indexOf('.wb-pick {') >= 0, 'the list is styled');
  assert(css.indexOf('.wb-items-match') >= 0 && css.indexOf('.wb-join') >= 0, 'match rows are styled');
  assert(css.indexOf('.wb-items-dialogue') >= 0 && css.indexOf('.wb-spk') >= 0, 'dialogue rows are styled');
  assert(css.indexOf('.wb-hidden') >= 0, 'a hidden-state class exists for the shared slots');
  assert(html.indexOf('id="wb-back"') >= 0, 'the markup carries the back button');
  const kb2 = uiSrc.slice(uiSrc.indexOf("if (st.mode === 'pick')"));
  assert(uiSrc.indexOf("if (st.mode === 'pick')") >= 0, 'the list has its own key handling');
  assert(kb2.indexOf('openWorkbookExercise') >= 0, 'and number keys open an exercise');
}

// ── 10. 문법과 표현 연습 1 — V-(으)ㄴ 적(이) 있다[없다] ────────────────────────
console.log('\n--- 10. 문법과 표현 연습 1 (experience) ---');
const exG = wb.exercises.find(e => e.id === 'u14-grammar-1');
{
  // A sandbox just for reading the art table and its renderer.
  const base = loadUi();
  assert(!!exG && exG.type === 'experience', 'the grammar exercise is an experience exercise');
  assert(exG.section === '문법과 표현' && exG.no === '연습 1', 'it is 문법과 표현 · 연습 1');
  assert(exG.items.length === 6, 'six pictures, six questions');
  assert(!exG.bank, 'no shared box — the whole point is the choice on each row');

  // The answer key from the back of the book, and the three conjugation classes
  // those six verbs were chosen to cover.
  const KEYG = [
    [1, '간', '러시아에', 'go_russia'],
    [2, '만난', '유명한 사람을', 'meet_famous'],
    [3, '쓴', '연애편지를', 'write_letter'],
    [4, '한', '아르바이트를', 'part_time_job'],
    [5, '들은', '한국 전통 음악을', 'traditional_music'],
    [6, '만든', '불고기를', 'make_bulgogi']
  ];
  KEYG.forEach(([n, form, stem, art]) => {
    const item = exG.items.find(i => i.n === n);
    assert(!!item, 'question ' + n + ' exists');
    const correct = item.choices.find(c => c.id === item.answer);
    assert(correct && correct.ko === form, 'question ' + n + ' answers ' + form);
    assert(item.stemKo === stem, 'question ' + n + ' keeps the printed prompt');
    assert(item.art === art, 'question ' + n + ' uses the ' + art + ' picture');
    assert(item.choices.length === 3, 'question ' + n + ' offers three forms');
    assert(item.choices.some(c => c.id === item.answer), 'and the answer is one of them');
  });
  // Items 5 and 6 are the ones that make this exercise worth doing.
  const five = exG.items.find(i => i.n === 5);
  assert(five.choices.some(c => c.ko === '듣은'),
    'question 5 offers 듣은 — the ㄷ-irregular trap has to be on the row to be a trap');
  assert(five.grammar.indexOf('ㄷ') >= 0, 'and the note names the ㄷ-irregular');
  const six = exG.items.find(i => i.n === 6);
  assert(six.choices.some(c => c.ko === '만들은'), 'question 6 offers 만들은 — the ㄹ trap');
  assert(six.grammar.indexOf('ㄹ') >= 0, 'and the note names the ㄹ drop');
  assert(exG.items.every(i => i.why && i.grammar), 'every form is explained');
  assert(exG.ownLabels.yes === '있어요' && exG.ownLabels.no === '없어요',
    'the two personal answers are 있어요 and 없어요');
  assert(exG.example && exG.example.own === 'no',
    'the worked example is the 없어요 one the book prints');

  // Art: every key the content names must exist, and be a clean 16x16.
  const artKeys = base.run('workbookArtKeys()');
  assert(artKeys.length >= 6, 'the art table holds at least six icons');
  exG.items.forEach((item) => {
    assert(artKeys.includes(item.art), item.art + ' exists in the art table');
    const size = base.run("workbookArtSize('" + item.art + "')");
    assert(size.w === 16 && size.h === 16, item.art + ' is 16x16 (got ' + size.w + 'x' + size.h + ')');
    assert(size.ragged === 0, item.art + ' has no ragged rows');
  });
  const pal = base.run('WORKBOOK_ART_PALETTE');
  artKeys.forEach((k) => {
    const rows = base.run("WORKBOOK_ART['" + k + "']");
    const unknown = [...new Set(rows.join('').split(''))].filter(c => !(c in pal));
    assert(unknown.length === 0, k + ' uses only palette characters'
      + (unknown.length ? ' — found ' + unknown.join('') : ''));
  });
  const svg = base.run("workbookIconSvg('go_russia', 4)");
  assert(svg.indexOf('<svg') === 0 && svg.indexOf('crispEdges') > 0,
    'icons render as crisp-edged SVG, not a blurred image');
  assert(svg.indexOf('viewBox="0 0 16 16"') > 0, 'the viewBox matches the matrix');
  assert(base.run("workbookIconSvg('no_such_icon', 4)") === '', 'an unknown key renders nothing');
}

// ── 11. Two decisions per row, only one of them graded ───────────────────────
console.log('\n--- 11. Grading the form, not the life ---');
{
  const ui = loadUi();
  ui.setBank('u14-grammar-1');
  assert(ui.run('workbookState.own.length') === 6, 'a personal answer is tracked per question');
  assert(ui.run('workbookState.own.every(v => v === null)'), 'and starts unset');
  assert(ui.els['wb-bank'].className === 'wb-hidden', 'the shared box is hidden for this type');

  // A form alone does not finish the page: the sentence needs its ending too.
  exG.items.forEach((item, i) => ui.run("wbPickChoice(" + i + ", '" + item.answer + "')"));
  assert(ui.run('workbookState.fill.every(Boolean)'), 'all six forms are chosen');
  assert(ui.run('wbComplete()') === false, 'the page is not complete without the personal answers');
  ui.run('checkWorkbook()');
  assert(ui.run('workbookState.checked') === false, 'and cannot be checked');

  // Answering 없어요 to everything is a valid life. It must score the same.
  exG.items.forEach((_, i) => ui.run("wbSetOwn(" + i + ", 'no')"));
  assert(ui.run('wbComplete()') === true, 'now the page is complete');
  ui.run('checkWorkbook()');
  assert(ui.run('workbookState.score') === 6, 'six correct forms score 6');

  const flipped = loadUi();
  flipped.setBank('u14-grammar-1');
  exG.items.forEach((item, i) => {
    flipped.run("wbPickChoice(" + i + ", '" + item.answer + "')");
    flipped.run("wbSetOwn(" + i + ", 'yes')");
  });
  flipped.run('checkWorkbook()');
  assert(flipped.run('workbookState.score') === 6,
    'answering 있어요 to everything scores the same — the personal answer is never wrong');

  // A wrong form is wrong, and the row says which one was right.
  const wrong = loadUi();
  wrong.setBank('u14-grammar-1');
  exG.items.forEach((item, i) => {
    const bad = item.choices.find(c => c.id !== item.answer);
    wrong.run("wbPickChoice(" + i + ", '" + bad.id + "')");
    wrong.run("wbSetOwn(" + i + ", 'no')");
  });
  wrong.run('checkWorkbook()');
  assert(wrong.run('workbookState.score') === 0, 'six wrong forms score 0');
  const rowsHtml = wrong.els['wb-items'].children.map(deepHtml).join('');
  const rowClasses = wrong.els['wb-items'].children
    .flatMap(r => (r.children || []).flatMap(c => (c.children || [])))
    .flatMap(c => (c.children || []))
    .map(b => b.className || '');
  assert(rowsHtml.indexOf('wb-chip-key') >= 0, 'the choice buttons are rendered per row');
  assert(rowClasses.filter(c => c.indexOf('wb-pick-form') === 0 && c.indexOf('key') > 0).length === 6,
    'the correct form is marked on every row after checking');
  assert(wrong.els['wb-explain'].innerHTML.indexOf('들은') >= 0,
    'the explanations name the right form');

  // Picking a form on one row must not disturb another.
  const solo = loadUi();
  solo.setBank('u14-grammar-1');
  solo.run("wbPickChoice(0, '" + exG.items[0].answer + "')");
  solo.run("wbPickChoice(1, '" + exG.items[1].answer + "')");
  solo.run("wbPickChoice(0, '" + exG.items[0].choices[1].id + "')");
  assert(solo.run('workbookState.fill[1]') === exG.items[1].answer,
    'changing question 1 leaves question 2 alone');
  solo.run("wbPickChoice(0, 'not_a_choice_here')");
  assert(solo.run('workbookState.fill[0]') === exG.items[0].choices[1].id,
    'a choice that does not belong to the row is refused');
  solo.run("wbSetOwn(0, 'maybe')");
  assert(solo.run('workbookState.own[0]') === null, 'only yes and no are accepted');

  // The assembled sentence is what the book asks the learner to write.
  const sent = loadUi();
  sent.setBank('u14-grammar-1');
  sent.run("wbPickChoice(4, '" + exG.items[4].answer + "')");
  sent.run("wbSetOwn(4, 'no')");
  const row5 = deepHtml(sent.els['wb-items'].children[4]);
  ['저는', '한국 전통 음악을', '들은', '적이', '없어요'].forEach((part) => {
    assert(row5.indexOf(part) >= 0, 'the built sentence contains ' + part);
  });
  assert(row5.indexOf('<svg') >= 0, 'and the row carries its picture');
  assert(deepText(sent.els['wb-items'].children[4]).indexOf('5)') >= 0,
    'and the row is numbered');
}

// ── 12. The interview format is gone ─────────────────────────────────────────
console.log('\n--- 12. Solo-playable ---');
{
  assert(/interview/i.test(exG.noteEn), 'the page says outright that the book asks for an interview');
  assert(/own experience|never marked/i.test(exG.noteEn),
    'and that the personal half is not marked');
  assert(css.indexOf('.wb-pick-own') >= 0 && css.indexOf('.wb-pick-form') >= 0,
    'the two kinds of button are styled apart');
  const ownStyle = css.slice(css.indexOf('.wb-pick-own.on'));
  assert(ownStyle.indexOf('#1e3a8a') !== 0, 'the personal answer is not styled as a correct answer');
  assert(uiSrc.indexOf('Never scored') >= 0, 'the code says why wbSetOwn is not graded');
  assert(manifest.includes('js/workbookArt.js'), 'the art module is in the manifest');
  assert(html.indexOf('js/workbookArt.js') >= 0, 'and has a script tag');
}

// ── 13. 문법과 표현 2 — A/V-았을/었을 때 ──────────────────────────────────────
console.log('\n--- 13. 문법과 표현, A/V-았을/었을 때 ---');
const exW1 = wb.exercises.find(e => e.id === 'u14-grammar-2-1');
const exW2 = wb.exercises.find(e => e.id === 'u14-grammar-2-2');
{
  [exW1, exW2].forEach((e) => {
    assert(!!e && e.type === 'build', (e && e.no) + ' is a build exercise');
    assert(e.pattern === 'A/V-았을/었을 때', 'and names the pattern it drills');
    assert(!e.bank, 'with no shared box — the choice is the conjugation');
    assert(e.items.length === 5, 'five pictures, five questions');
    assert(e.items.every(i => (i.choices || []).length === 3), 'three forms per question');
    assert(e.items.every(i => !i.choices2), 'one blank per row on these two pages');
    assert(e.items.every(i => i.why && i.grammar && i.en), 'every answer is explained');
  });

  // 연습 1: the answer key from the back of the book, and the contraction each
  // item was chosen to teach.
  const KEY1 = [
    [1, '왔을 때', '한국에 오다', 'come_to_korea'],
    [2, '떠났을 때', '지하철이 떠나다', 'train_leaves'],
    [3, '했을 때', '거짓말(을) 하다', 'tell_lie'],
    [4, '떨어졌을 때', '시험에서 떨어지다', 'fail_exam'],
    [5, '봤을 때부터', '처음 보다', 'first_meet']
  ];
  KEY1.forEach(([n, form, phrase, art]) => {
    const item = exW1.items.find(i => i.n === n);
    assert(!!item, '연습 1 question ' + n + ' exists');
    const correct = item.choices.find(c => c.id === item.answer);
    assert(correct && correct.ko === form, '연습 1 item ' + n + ' answers ' + form);
    assert(item.phraseKo === phrase, 'and keeps the printed phrase ' + phrase);
    assert(item.art === art, 'and uses the ' + art + ' picture');
  });
  // A asks the question and B answers it, so a row needs both speakers and the
  // gap has to be on B's side.
  assert(exW1.items.every(i => i.lines.length === 2), '연습 1 rows are two-line dialogues');
  assert(exW1.items.every(i => i.lines[0].who === 'A' && i.lines[1].who === 'B'),
    'A speaks first and B answers');
  assert(exW1.items.every(i => i.lines[0].ko.indexOf('{}') < 0 && i.lines[1].ko.indexOf('{}') >= 0),
    "the blank is in B's line — A's question is what dates it");
  assert(exW1.items.find(i => i.n === 5).choices.some(c => c.ko === '봤을 때'),
    'question 5 offers 봤을 때 without 부터 — A asked 언제부터, and that is the trap');
  assert(exW1.items.find(i => i.n === 5).lines[0].ko.indexOf('언제부터') >= 0,
    'and A’s line is where 부터 is announced');
  assert(exW1.example.answerKo === '어렸을 때', 'the worked example reads 어렸을 때');

  // 연습 2: a bare sentence, no speakers.
  const KEY2 = [
    [1, '아팠을 때', '아프다'],
    [2, '받았을 때', '상을 받다'],
    [3, '할머니가 돌아가셨을 때', '할머니가 돌아가시다'],
    [4, '잃어버렸을 때', '지갑을 잃어버리다'],
    [5, '어렸을 때', '어리다']
  ];
  KEY2.forEach(([n, form, phrase]) => {
    const item = exW2.items.find(i => i.n === n);
    assert(!!item, '연습 2 question ' + n + ' exists');
    const correct = item.choices.find(c => c.id === item.answer);
    assert(correct && correct.ko === form, '연습 2 item ' + n + ' answers ' + form);
    assert(item.phraseKo === phrase, 'and keeps ' + phrase + ' as the phrase to conjugate');
  });
  assert(exW2.items.every(i => i.lines.length === 1 && !i.lines[0].who),
    '연습 2 rows are one sentence with nobody speaking it');
  assert(exW2.items.find(i => i.n === 1).grammar.indexOf('ㅡ') >= 0,
    'item 1 names the ㅡ drop in 아프다');
  assert(exW2.items.find(i => i.n === 2).grammar.indexOf('ㅗ') >= 0,
    'item 2 names the vowel harmony that picks 았 over 었');
  assert(exW2.items.find(i => i.n === 3).choices.some(c => c.ko === '할머니가 돌아갔을 때'),
    'item 3 offers the form with the honorific 시 taken out');
  assert(exW2.items.find(i => i.n === 5).choices.some(c => c.ko === '어려웠을 때'),
    'item 5 offers 어려웠을 때 — 어리다 mistaken for 어렵다');
  assert(/어릴 때/.test(exW2.items.find(i => i.n === 5).grammar),
    'and says outright that 어릴 때 is good Korean too');

  // The dialogue renders with both speakers, and the answer lands mid-sentence.
  const ui = loadUi();
  ui.setBank('u14-grammar-2-1');
  assert(ui.els['wb-bank'].className === 'wb-hidden', 'no shared box is drawn for a build page');
  assert(ui.els['wb-items'].className === 'wb-items-build', 'build rows use their own layout');
  assert(ui.run('workbookState.fill2.length') === 5, 'a second blank is tracked per row');
  ui.run("wbPickChoice(0, 'wasseul')");
  const row1 = deepHtml(ui.els['wb-items'].children[0]);
  assert((row1.match(/wb-spk/g) || []).length === 2, 'a row shows both speakers');
  assert(row1.indexOf('언제 노래방에 가 봤어요?') >= 0, "A's question is printed in full");
  assert(row1.indexOf('왔을 때') >= 0, 'and the chosen form lands in the blank');
  // Measured inside B's line: A's question ends in 가 봤어요 too, so searching the
  // whole row would find that one first and prove nothing.
  const bLine = row1.slice(row1.indexOf('고향 친구가'));
  assert(bLine.indexOf('왔을 때') > 0 && bLine.indexOf('왔을 때') < bLine.indexOf('가 봤어요'),
    'the form sits mid-sentence in B’s line, not at the end of it');
  assert(ui.els['wb-example'].innerHTML.indexOf('어렸을 때') >= 0,
    'the worked example shows its answer filled in');
  exW1.items.forEach((item, i) => ui.run('wbPickChoice(' + i + ", '" + item.answer + "')"));
  assert(ui.run('wbComplete()') === true, 'no personal answer is needed on this page');
  ui.run('checkWorkbook()');
  assert(ui.run('workbookState.score') === 5, 'the textbook key scores 5 of 5');
  assert(ui.els['wb-count'].textContent === '5 / 5', 'and the counter is out of five');
  assert(ui.els['wb-explain'].innerHTML.indexOf('봤을 때부터') >= 0,
    'the explanations name the right form');
}

// ── 14. 문법과 표현 4 — V-(으)면 안 되다 ─────────────────────────────────────
console.log('\n--- 14. 문법과 표현, V-(으)면 안 되다 ---');
const exP1 = wb.exercises.find(e => e.id === 'u14-grammar-4-1');
const exP2 = wb.exercises.find(e => e.id === 'u14-grammar-4-2');
const exP3 = wb.exercises.find(e => e.id === 'u14-grammar-4-3');
{
  [exP1, exP2, exP3].forEach((e) => {
    assert(!!e && e.type === 'build', (e && e.no) + ' is a build exercise');
    assert(e.pattern === 'V-(으)면 안 되다', 'and names the pattern it drills');
    assert(e.items.every(i => i.why && i.grammar && i.en), 'every answer is explained');
  });

  // 연습 1 — the pair. Both halves are asked, so both are marked.
  assert(exP1.items.length === 5 && exP1.items.every(i => i.choices2),
    '연습 1 asks for both halves of all five signs');
  const KEYP1 = [
    [1, '해도 돼요', '하면 안 돼요', 'no_phone'],
    [2, '먹어도 돼요', '먹으면 안 돼요', 'no_food'],
    [3, '찍어도 돼요', '찍으면 안 돼요', 'no_camera'],
    [4, '피워도 돼요', '피우면 안 돼요', 'no_smoking'],
    [5, '해도 돼요', '하면 안 돼요', 'no_swimming']
  ];
  KEYP1.forEach(([n, ask, deny, art]) => {
    const item = exP1.items.find(i => i.n === n);
    assert(!!item, '연습 1 question ' + n + ' exists');
    assert(item.choices.find(c => c.id === item.answer).ko === ask,
      '연습 1 item ' + n + ' asks ' + ask);
    assert(item.choices2.find(c => c.id === item.answer2).ko === deny,
      'and refuses with ' + deny);
    assert(item.art === art, 'and carries the ' + art + ' sign');
    assert(item.lines[0].ko.indexOf('{}') >= 0 && item.lines[1].ko.indexOf('{}') >= 0,
      'with a blank in each speaker’s line');
  });
  // The distractors are the two rules the pattern actually turns on.
  assert(exP1.items.find(i => i.n === 2).choices2.some(c => c.ko === '먹면 안 돼요'),
    'the consonant-stem row offers 먹면 — the missing 으');
  assert(exP1.items.find(i => i.n === 4).choices2.some(c => c.ko === '피우으면 안 돼요'),
    'and the vowel-stem row offers 피우으면 — the 으 that does not belong');
  assert(exP1.items.find(i => i.n === 5).choices.some(c => c.ko === '해도 되요'),
    'item 5 offers 되요 for 돼요');
  assert(/돼/.test(exP1.items.find(i => i.n === 5).grammar), 'and the note explains the spelling');

  // 연습 2 — B's reply is printed, and item 4 is the 반말 one.
  assert(exP2.items.length === 4, '연습 2 has four dialogues');
  assert(exP2.items.every(i => i.lines[1].ko.indexOf('{}') < 0),
    "B's reply is given, not asked for");
  assert(exP2.items.every(i => i.lines[0].ko.indexOf('{}') >= 0), 'the blank is in A’s question');
  const banmal = exP2.items.find(i => i.n === 4);
  assert(banmal.choices.find(c => c.id === banmal.answer).ko === '입으면 안 돼',
    '연습 2 item 4 answers in 반말: 입으면 안 돼');
  assert(banmal.choices.some(c => c.ko === '입으면 안 돼요'),
    'and offers the 존댓말 form as the distractor');
  assert(/언니|반말/.test(banmal.why), 'the note says what makes it 반말');
  // The one place the book's own key and its picture disagree. Saying so beats
  // quietly picking one.
  const leftover = exP2.items.find(i => i.n === 3);
  assert(leftover.phraseKo === '조금만 남기다', '연습 2 item 3 keeps the printed phrase');
  assert(leftover.choices.find(c => c.id === leftover.answer).ko === '남기면 안 돼요',
    'and is answered from that phrase');
  assert(leftover.why.indexOf('안 먹으면 안 돼요') >= 0,
    'while flagging that the book’s answer key prints a different sentence here');

  // 연습 3 — the double negative, and the one item that needs 못.
  assert(exP3.items.length === 4, '연습 3 has four rewrites');
  assert(exP3.items.every(i => i.lines.length === 1 && !i.lines[0].who),
    'a rewrite has nobody saying it');
  assert(exP3.items.every(i => /꼭/.test(i.phraseKo)),
    'each row prints the 꼭 …야 돼요 sentence it comes from');
  const KEYP3 = [[1, '안 하면'], [2, '안 끊으면'], [3, '안 가면'], [4, '못 받으면']];
  KEYP3.forEach(([n, form]) => {
    const item = exP3.items.find(i => i.n === n);
    assert(item && item.choices.find(c => c.id === item.answer).ko === form,
      '연습 3 item ' + n + ' answers ' + form);
  });
  assert(exP3.items.find(i => i.n === 1).choices.some(c => c.ko === '하면'),
    'item 1 offers the single negative — the form that means the opposite');
  assert(/opposite/i.test(exP3.items.find(i => i.n === 1).why),
    'and the note says so outright');
  assert(exP3.items.find(i => i.n === 4).choices.some(c => c.ko === '안 받으면'),
    'item 4 puts 안 against 못');
  assert(/못/.test(exP3.items.find(i => i.n === 4).why), 'and explains why the parcel takes 못');

  // Two blanks per row: both are needed, both are scored, and one right half
  // does not mark the row right.
  const ui = loadUi();
  ui.setBank('u14-grammar-4-1');
  assert(ui.els['wb-count'].textContent === '0 / 10', 'the counter counts blanks, not rows');
  exP1.items.forEach((item, i) => ui.run('wbPickChoice(' + i + ", '" + item.answer + "')"));
  assert(ui.run('wbComplete()') === false, 'a row is not finished with only its first blank');
  assert(ui.els['wb-count'].textContent === '5 / 10', 'and the counter says so');
  ui.run('checkWorkbook()');
  assert(ui.run('workbookState.checked') === false, 'so the page cannot be checked yet');
  exP1.items.forEach((item, i) => ui.run('wbPickChoice(' + i + ", '" + item.answer2 + "', 2)"));
  assert(ui.run('wbComplete()') === true, 'both blanks filled finishes the row');
  const rowP = deepHtml(ui.els['wb-items'].children[0]);
  assert(rowP.indexOf('해도 돼요') >= 0 && rowP.indexOf('하면 안 돼요') >= 0,
    'the row shows both halves of the exchange');

  // Six buttons in one strip left it to the learner to work out which group fed
  // which blank. Each group is broken onto its own line under the speaker chip
  // of the line it fills.
  const picks = ui.els['wb-items'].children[0].children[1].children[2];
  const kinds = picks.children.map(c => c.className);
  assert(kinds.filter(c => c === 'wb-picks-tag').length === 2,
    'each of the two groups is tagged');
  assert(picks.children.filter(c => c.className === 'wb-picks-tag').map(c => c.textContent)
    .join('') === 'AB', 'with the A and B of the lines they fill');
  assert(kinds.indexOf('wb-picks-break') === 4,
    'and the break falls after the first group, so the two do not run together');
  assert(kinds.lastIndexOf('wb-picks-tag') > kinds.indexOf('wb-picks-break'),
    "B's tag comes after the break, with its own buttons");
  assert(css.indexOf('.wb-picks-break') >= 0 && css.indexOf('.wb-picks-tag') >= 0,
    'both are styled');
  // A one-blank row has one group and needs no tag at all.
  const solo = loadUi();
  solo.setBank('u14-grammar-2-1');
  const soloPicks = solo.els['wb-items'].children[0].children[1].children[2];
  assert(soloPicks.children.every(c => c.className.indexOf('wb-picks-tag') < 0),
    'a single-blank row is left untagged');
  ui.run('checkWorkbook()');
  assert(ui.run('workbookState.score') === 10, 'the textbook key scores 10 of 10');
  assert(ui.els['wb-count'].textContent === '10 / 10' &&
    ui.els['wb-count'].className === 'wb-count-all', 'and the page reads as complete');

  const half = loadUi();
  half.setBank('u14-grammar-4-1');
  exP1.items.forEach((item, i) => {
    half.run('wbPickChoice(' + i + ", '" + item.answer + "')");
    const bad = item.choices2.find(c => c.id !== item.answer2);
    half.run('wbPickChoice(' + i + ", '" + bad.id + "', 2)");
  });
  half.run('checkWorkbook()');
  assert(half.run('workbookState.score') === 5, 'five right halves score 5 of 10');
  assert(deepText(half.els['wb-items'].children[0]).indexOf('✕') >= 0
    && half.els['wb-items'].children[0].className.indexOf('bad') > 0,
    'and a row with one half wrong is marked wrong');
  const yours = half.els['wb-explain'].innerHTML;
  assert(yours.indexOf('wb-why-yours') >= 0 && yours.indexOf('해도 돼요 / ') >= 0,
    'the explanation reports both halves, right one included');

  // A choice from the wrong blank must not be accepted into it.
  const cross = loadUi();
  cross.setBank('u14-grammar-4-1');
  cross.run("wbPickChoice(0, '" + exP1.items[0].answer2 + "', 1)");
  assert(cross.run('workbookState.fill[0]') === null,
    "the second blank's forms are refused by the first");
  cross.run("wbPickChoice(0, '" + exP1.items[0].answer + "', 2)");
  assert(cross.run('workbookState.fill2[0]') === null, 'and the other way round');

  // Number keys run left to right across the whole row, so the second blank is
  // reachable from the keyboard too.
  const keys = loadUi();
  keys.setBank('u14-grammar-4-1');
  const n1 = exP1.items[0].choices.length;
  keys.call('wbPickChoice', 0, exP1.items[0].choices2[0].id, 2);
  assert(keys.run('workbookState.fill2[0]') === exP1.items[0].choices2[0].id,
    'slot 2 takes its own choices');
  assert(kb.indexOf('choices2') >= 0 && kb.indexOf('first.length + second.length') >= 0,
    'and the key handler counts past the first blank to reach them');
  assert(n1 === 3, 'each blank offers three forms, so 1-6 covers the row');
}

// ── 15. Telling three 연습 1s apart ─────────────────────────────────────────
console.log('\n--- 15. The exercise list ---');
{
  // 문법과 표현 numbers per grammar point, so the list now holds three rows
  // called 연습 1. Without the pattern printed they would read identically.
  const ones = wb.exercises.filter(e => e.no === '연습 1');
  assert(ones.length === 5, 'five exercises are called 연습 1');
  assert(ones.filter(e => e.section === '문법과 표현').length === 3,
    'three of them in the same section');
  assert(new Set(ones.map(e => e.section + '|' + e.no)).size < ones.length,
    'so section plus number does not tell them apart');
  assert(new Set(wb.exercises.map(e => (e.pattern || '') + '|' + e.section + '|' + e.no)).size
    === wb.exercises.length, 'adding the pattern makes every row unique');

  const ui = loadUi();
  ui.setBank(null);
  const kids = ui.els['wb-items'].children;
  const rows = kids.filter(r => r.attrs['data-exercise']);
  assert(rows.length === wb.exercises.length && rows.length === 13,
    'the list offers all thirteen exercises');
  // 1-9 then 0 is where a keypad runs out. Past that a row gets no key, and its
  // badge is left blank rather than printing one that does nothing — the arrows
  // and the mouse still reach it.
  assert(rows[9].innerHTML.indexOf('>0<') >= 0, 'the tenth row is keyed 0');
  const kbPick = uiSrc.slice(uiSrc.indexOf("if (st.mode === 'pick')"));
  assert(kbPick.indexOf('/^[0-9]$/') >= 0 && kbPick.indexOf('num === 0 ? 9') >= 0,
    'and 0 opens it');
  rows.slice(10).forEach((r, k) => {
    assert(/wb-pick-key"><\/span>/.test(r.innerHTML),
      'row ' + (k + 11) + ' shows no key rather than one that does nothing');
  });
  {
    const nav = loadUi();
    nav.setBank(null);
    nav.run('workbookState.pick = ' + (wb.exercises.length - 1));
    nav.run("openWorkbookExercise(workbookState.bank.exercises[workbookState.pick].id)");
    assert(nav.run('workbookState.ex.id') === wb.exercises[wb.exercises.length - 1].id,
      'and the last row still opens by arrow and Enter');
  }
  const html9 = rows.map(r => r.innerHTML).join('');
  assert(html9.indexOf('wb-pick-pat') >= 0, 'each grammar row prints its pattern');
  assert(html9.indexOf('A/V-았을/었을 때') >= 0 && html9.indexOf('V-(으)면 안 되다') >= 0,
    'and both new grammar points are named');
  assert(css.indexOf('.wb-pick-pat') >= 0, 'the pattern label is styled');

  // What goes big has to be what tells the rows apart. Three exercises print the
  // same Korean instruction word for word, so it cannot be the headline — the
  // list read as one row repeated when it was.
  const headlines = wb.exercises.map(e => e.instructionKo);
  assert(new Set(headlines).size < headlines.length,
    'the Korean instruction repeats across exercises');
  assert(html9.indexOf('그림을 보고 [보기]와 같이 대화를 만들어 보세요.') < 0,
    'so the list does not print it — the exercise itself does');
  assert(wb.exercises.every(e => rows.some(r =>
    r.attrs['data-exercise'] === e.id && r.innerHTML.indexOf(e.pattern || e.no) >= 0)),
    'every row headlines the thing that identifies it');

  // 어휘 and 문법과 표현 get their own headers, so nine rows read as three and six.
  const heads = kids.filter(r => (r.className || '').indexOf('wb-group') === 0);
  assert(heads.length === 3, 'the list is split into three sections');
  assert(heads[0].innerHTML.indexOf('어휘') >= 0 && heads[1].innerHTML.indexOf('문법과 표현') >= 0
    && heads[2].innerHTML.indexOf('문형 연습') >= 0,
    'named 어휘, 문법과 표현 and 문형 연습');
  assert(kids.indexOf(heads[1]) === kids.indexOf(rows[3]) - 1,
    'and the grammar header sits directly above the first grammar row');
  assert(css.indexOf('.wb-group ') >= 0 || css.indexOf('.wb-group {') >= 0,
    'the section header is styled');

  ui.run("openWorkbookExercise('u14-grammar-4-3')");
  assert(ui.els['wb-sub'].textContent.indexOf('V-(으)면 안 되다') >= 0,
    'and the exercise header says which grammar point you are in');
}

// ── 16. Every picture the content names exists ──────────────────────────────
console.log('\n--- 16. Art coverage ---');
{
  const base = loadUi();
  const artKeys = base.run('workbookArtKeys()');
  const named = [...new Set(wb.exercises.flatMap(e => (e.items || []).map(i => i.art))
    .filter(Boolean))];
  assert(named.length >= 21, 'the workbook names ' + named.length + ' pictures');
  named.forEach((key) => {
    assert(artKeys.includes(key), key + ' exists in the art table');
    const size = base.run("workbookArtSize('" + key + "')");
    assert(size.w === 16 && size.h === 16, key + ' is 16x16 (got ' + size.w + 'x' + size.h + ')');
    assert(size.ragged === 0, key + ' has no ragged rows');
    assert(base.run("workbookIconSvg('" + key + "', 4)").indexOf('<svg') === 0,
      key + ' renders');
  });
  // The five 금지 signs share one badge, and it has to be the same pixels on all
  // of them or it reads as decoration rather than notation.
  const signs = ['no_phone', 'no_food', 'no_camera', 'no_smoking', 'no_swimming'];
  const badges = signs.map((k) => base.run("WORKBOOK_ART['" + k + "']")
    .slice(10).map(r => r.slice(10)).join('|'));
  assert(new Set(badges).size === 1, 'all five signs carry the identical 금지 badge');
  assert(badges[0].indexOf('R') >= 0, 'and it is drawn in red');
}

// ── 17. 문형 연습 — the audio drill ──────────────────────────────────────────
console.log('\n--- 17. 문형 연습 (pattern practice) ---');
const exT = wb.exercises.find(e => e.id === 'u14-pattern-1');
{
  assert(!!exT && exT.type === 'build', '문형 연습 연습 1 is a build exercise');
  assert(exT.section === '문형 연습' && exT.sectionEn === 'Pattern Practice',
    'it is its own section, the third in the book');
  assert(exT.pattern === 'V-(으)ㄴ 적(이) 있다[없다]',
    'drilling the same pattern the 문법과 표현 page taught');
  assert(exT.items.length === 4, 'four exchanges');
  assert(/track 10/i.test(exT.noteEn), 'the note says which track it is in the book');

  // The answer key, and the three ways the modifier forms.
  const KEYT = [
    [1, '본', '보다', '이 영화를 처음 봐요?'],
    [2, '먹은', '먹다', '이 음식을 처음 먹어요?'],
    [3, '만난', '만나다', '마이클 씨를 처음 만나요?'],
    [4, '들은', '듣다', '이 노래를 처음 들어요?']
  ];
  KEYT.forEach(([n, form, phrase, ask]) => {
    const item = exT.items.find(i => i.n === n);
    assert(!!item, 'question ' + n + ' exists');
    assert(item.choices.find(c => c.id === item.answer).ko === form,
      '문형 연습 item ' + n + ' answers ' + form);
    assert(item.phraseKo === phrase, 'from ' + phrase);
    assert(item.lines[0].ko === ask, "and keeps the teacher's printed question");
    assert(item.lines[0].who === 'T' && item.lines[1].who === 'S',
      'with the book’s T and S speakers');
    assert(item.lines[1].ko === '아니요, 전에 {} 적이 있어요.',
      'and the answer frame never changes — only the modifier does');
  });
  assert(exT.example.answerKo === '간' && exT.example.lines[0].ko === '경주에 처음 가요?',
    'the worked example is the 경주 one the book prints');
  assert(exT.items.find(i => i.n === 4).choices.some(c => c.ko === '듣은'),
    'question 4 offers 듣은 — the ㄷ-irregular has to be on the row to be a trap');
  assert(exT.items.find(i => i.n === 4).grammar.indexOf('ㄷ') >= 0, 'and the note names it');
  assert(exT.items.find(i => i.n === 2).choices.some(c => c.ko === '먹는'),
    'question 2 offers the present modifier 먹는');
  assert(exT.items.every(i => i.why && i.grammar && i.en), 'every answer is explained');

  const ui = loadUi();
  ui.setBank('u14-pattern-1');
  const row = ui.els['wb-items'].children[0];
  assert(deepHtml(row).indexOf('이 영화를 처음 봐요?') >= 0, "the teacher's line is printed");
  assert((deepHtml(row).match(/wb-spk/g) || []).length === 2, 'both speakers are shown');
  ui.run("wbPickChoice(0, 'bon')");
  assert(deepHtml(ui.els['wb-items'].children[0]).indexOf('본') >= 0,
    'and the chosen modifier lands in the frame');
  exT.items.forEach((item, i) => ui.run('wbPickChoice(' + i + ", '" + item.answer + "')"));
  ui.run('checkWorkbook()');
  assert(ui.run('workbookState.score') === 4, 'the textbook key scores 4 of 4');
}

// ── 17b. 문형 연습 연습 2, 3, 4 ──────────────────────────────────────────────
console.log('\n--- 17b. The rest of the drill ---');
{
  const KEYS = {
    'u14-pattern-2': ['A/V-았을/었을 때', [
      [1, '장학금을 받았을 때', '장학금을 받다', '언제 제일 기뻤어요?'],
      [2, '할머니가 돌아가셨을 때', '할머니가 돌아가시다', '언제 제일 슬펐어요?'],
      [3, '고향에 갔을 때', '고향에 가다', '언제 그 이야기를 들었어요?'],
      [4, '집에 도착했을 때', '집에 도착하다', '언제 나나 씨 전화를 받았어요?']
    ]],
    'u14-pattern-3': ['V-아/어도 되다', [
      [1, '나가도 돼요', '지금 나가다', '지금 나가다'],
      [2, '전화해도 돼요', '밤에 전화하다', '밤에 전화하다'],
      [3, '써도 돼요', '이 컴퓨터를 쓰다', '이 컴퓨터를 쓰다'],
      [4, '먹어도 돼요', '여기에서 음식을 먹다', '여기에서 음식을 먹다']
    ]],
    'u14-pattern-4': ['V-(으)면 안 되다', [
      [1, '주차하면 안 돼요', '주차하다', '여기에 주차해도 돼요?'],
      [2, '담배를 피우면 안 돼요', '담배를 피우다', '여기에서 담배를 피워도 돼요?'],
      [3, '음료수를 마시면 안 돼요', '음료수를 마시다', '여기에서 음료수를 마셔도 돼요?'],
      [4, '노래를 부르면 안 돼요', '노래를 부르다', '여기에서 노래를 불러도 돼요?']
    ]]
  };
  Object.keys(KEYS).forEach((id) => {
    const [pattern, key] = KEYS[id];
    const e = wb.exercises.find(x => x.id === id);
    assert(!!e && e.type === 'build' && e.section === '문형 연습', id + ' is a 문형 연습 drill');
    assert(e.pattern === pattern, 'drilling ' + pattern);
    assert(e.items.length === 4, 'four exchanges');
    assert(e.items.every(i => i.lines[0].who === 'T' && i.lines[1].who === 'S'),
      'with the book’s T and S');
    assert(e.items.every(i => i.lines[0].ko.indexOf('{}') < 0 && i.lines[1].ko.indexOf('{}') >= 0),
      'the teacher’s line is given and the student’s is built');
    key.forEach(([n, form, phrase, ask]) => {
      const item = e.items.find(i => i.n === n);
      assert(!!item, id + ' question ' + n + ' exists');
      assert(item.choices.find(c => c.id === item.answer).ko === form,
        id + ' item ' + n + ' answers ' + form);
      assert(item.phraseKo === phrase, 'from the cue ' + phrase);
      assert(item.lines[0].ko === ask, 'and keeps the teacher’s printed line');
    });
    assert(e.items.every(i => i.why && i.grammar && i.en), 'every answer is explained');
  });

  // 연습 3 is the grammar point the workbook pages skip entirely.
  assert(!wb.exercises.some(e => e.section === '문법과 표현' && e.pattern === 'V-아/어도 되다'),
    'V-아/어도 되다 has no 문법과 표현 page in this unit');
  assert(wb.exercises.some(e => e.pattern === 'V-아/어도 되다'),
    'so the drill is the only place it is practised');

  // 연습 4 item 4 is the one worth the whole page: 르-irregular in the question,
  // regular in the answer.
  const p4 = wb.exercises.find(e => e.id === 'u14-pattern-4');
  const sing = p4.items.find(i => i.n === 4);
  assert(sing.lines[0].ko.indexOf('불러도') >= 0, 'the teacher asks with the irregular 불러도');
  assert(sing.choices.find(c => c.id === sing.answer).ko.indexOf('부르면') >= 0,
    'and the answer is the regular 부르면');
  assert(sing.choices.some(c => c.ko.indexOf('불러면') >= 0),
    'with 불러면 on the row — carrying the irregular where it does not belong');
  assert(/르/.test(sing.grammar), 'and the note names the 르-irregular');

  // Every drill is playable end to end.
  ['u14-pattern-2', 'u14-pattern-3', 'u14-pattern-4'].forEach((id) => {
    const ui = loadUi();
    ui.setBank(id);
    const e = wb.exercises.find(x => x.id === id);
    e.items.forEach((item, i) => ui.run('wbPickChoice(' + i + ", '" + item.answer + "')"));
    ui.run('checkWorkbook()');
    assert(ui.run('workbookState.score') === 4, id + ' scores 4 of 4 on the textbook key');
  });
}

// ── 18. Hearing it ─────────────────────────────────────────────────────────
console.log('\n--- 18. Listening ---');
{
  const ui = loadUi();
  ui.setBank('u14-pattern-1');
  const head = ui.els['wb-items'].children[0].children[1].children[0];
  const say = head.children.find(c => (c.className || '').indexOf('wb-say') === 0);
  assert(!!say, 'a build row carries a listen button');
  assert(say && say.attrs['aria-label'] === 'Listen', 'and is labelled for a screen reader');
  assert(css.indexOf('.wb-say') >= 0, 'the button is styled');
  assert(ui.els['wb-example'].children.some(c => (c.className || '').indexOf('wb-say') === 0),
    'the worked example has one too');

  // Before checking it reads the question only. Speaking the answer to a row
  // that has not been answered would hand it over.
  assert(ui.call('wbRowSpeech', exT, exT.items[0], false) === '이 영화를 처음 봐요?',
    'unchecked, it speaks only the line with nothing missing');
  ui.run("wbPickChoice(0, 'bon')");
  const full = ui.call('wbRowSpeech', exT, exT.items[0], true);
  assert(full === '이 영화를 처음 봐요? 아니요, 전에 본 적이 있어요.',
    'checked, it speaks the whole exchange with the right answer in it');
  assert(full.indexOf('{}') < 0, 'and never reads the placeholder aloud');
  // A two-blank row speaks both halves.
  const pair = wb.exercises.find(e => e.id === 'u14-grammar-4-1');
  const p = loadUi();
  p.setBank('u14-grammar-4-1');
  const both = p.call('wbRowSpeech', pair, pair.items[0], true);
  assert(both.indexOf('해도 돼요') >= 0 && both.indexOf('하면 안 돼요') >= 0,
    'a two-blank row speaks both blanks filled');

  const ui2 = loadUi();
  ui2.setBank('u14-pattern-1');
  assert(uiSrc.indexOf('AudioMixer.voiceStart') >= 0 && uiSrc.indexOf('wbStopTrack') >= 0,
    'a clip goes through the mixer and can be stopped');
  // Leaving the exercise has to silence it — a row's recording has no business
  // playing over the list or over the next exercise.
  ['function backToWorkbookList', 'function closeWorkbook'].forEach((fn) => {
    const body = uiSrc.slice(uiSrc.indexOf(fn), uiSrc.indexOf(fn) + 400);
    assert(body.indexOf('wbStopTrack()') >= 0, fn.replace('function ', '') + ' stops the clip');
  });

  // ── One clip per exchange ────────────────────────────────────────────────
  // The track is cut per exchange, not per drill. A whole-drill clip was 70
  // seconds of which a row needed six, so nothing carries one any more and the
  // player that showed it is gone with it.
  const drills = wb.exercises.filter(e => e.section === '문형 연습');
  assert(drills.length === 4, 'four pattern drills');
  assert(wb.exercises.every(e => !e.audio),
    'no exercise carries a whole-drill recording any more');
  assert(uiSrc.indexOf('wbTrackBar') < 0 && css.indexOf('wb-track') < 0,
    'and the player that played one is gone rather than left inert');
  const secondsOf = (rel) => fs.statSync(path.join(ROOT, rel)).size / 8000;
  drills.forEach((e) => {
    assert(e.items.every(i => i.audio && i.audio.src), e.no + ': every item has its own clip');
    assert(!!(e.example.audio && e.example.audio.src), e.no + ': so does the worked example');
    const srcs = e.items.map(i => i.audio.src).concat(e.example.audio.src);
    assert(new Set(srcs).size === srcs.length, e.no + ': no two rows share a clip');
    srcs.forEach((s) => assert(fs.existsSync(path.join(ROOT, s)), s + ' is on disk'));
    // Each clip is one exchange with the four-second waits taken out: the
    // teacher's line, a breath, the model answer. Anything much longer means the
    // cut ran into the next item.
    const withAnswer = e.items.filter(i => i.audio.askEnd);
    withAnswer.forEach((i) => {
      const secs = secondsOf(i.audio.src);
      assert(secs > 3 && secs < 12, e.no + ' item ' + i.n + ' is one exchange long ('
        + secs.toFixed(1) + 's)');
      assert(i.audio.askEnd > 0 && i.audio.askEnd < secs,
        e.no + ' item ' + i.n + ' stops the prompt inside its own clip');
    });
    // The last item of every drill is the odd one: the track asks it and moves
    // on without recording a model answer. Consistent across all four, which is
    // why the clip is the question alone and carries no askEnd — there is
    // nothing after the prompt to hold back.
    const last = e.items[e.items.length - 1];
    assert(withAnswer.length === 3 && !last.audio.askEnd,
      e.no + ': the last item has no model answer on the track');
    assert(secondsOf(last.audio.src) < secondsOf(e.items[0].audio.src),
      e.no + ': so its clip is the shorter one');
  });
  const allClips = drills.flatMap(e => e.items.map(i => i.audio.src)
    .concat(e.example.audio.src));
  assert(new Set(allClips).size === 20, 'twenty clips in all — four drills of five rows');
  assert(fs.readdirSync(path.join(ROOT, 'audio', 'book')).length === 20,
    'and nothing left over in audio/book from the earlier cuts');

  // The button plays the book, and says so.
  const bookBtn = ui2.els['wb-items'].children[0].children[1].children[0]
    .children.find(c => (c.className || '').indexOf('wb-say') === 0);
  assert(!!bookBtn && bookBtn.className.indexOf('book') > 0,
    'a row with a recording is marked as playing the book, not a synthesised voice');
  assert(css.indexOf('.wb-say.book') >= 0, 'and styled apart');
  // Until the row is answered the clip stops where the prompt ends.
  const play = uiSrc.slice(uiSrc.indexOf('function wbPlayClip'), uiSrc.indexOf('function wbSayButton'));
  assert(play.indexOf('!full && clip.askEnd') >= 0,
    'an unanswered row plays only as far as askEnd');
  assert(play.indexOf('currentTime >= stopAt') >= 0, 'and stops itself there');
  assert(uiSrc.indexOf('wbSayButton(wbRowSpeech(ex, item, st.checked), item.audio, st.checked)') >= 0,
    'the row passes its own checked state, so checking unlocks the model answer');

  // The clip harvest must not render the wrong answers as clean spoken Korean.
  const { collectTtsPhrases } = require('../scripts/ttsClips.js');
  const phrases = collectTtsPhrases(ROOT);
  assert(phrases.includes('이 영화를 처음 봐요? 아니요, 전에 본 적이 있어요.'),
    'the model answer is queued for a clip');
  assert(phrases.includes('이 영화를 처음 봐요?'), 'and so is the question on its own');
  const wrong = ['하아도 돼요', '먹면 안 돼요', '어려웠을 때', '보은', '떠나았을 때'];
  wrong.forEach((w) => {
    assert(!phrases.some(p => p.indexOf(w) >= 0), 'no clip is made for the wrong form ' + w);
  });
}

console.log('\n====================================================');
console.log('RESULT: ' + passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
process.exit(failed ? 1 : 0);
