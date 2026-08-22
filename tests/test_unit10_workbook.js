/**
 * tests/test_unit10_workbook.js — the Unit 10 workbook page on the study desk.
 *
 * Unit 10's 어휘 연습 1 is a checklist: tick the dishes you have tried. Nothing
 * can mark that, so the same twelve dishes become two matching exercises —
 * picture to name — reusing the food icons Unit 10 already ships. This suite
 * checks the twelve are the twelve the book prints, that every picture is a
 * sprite on disk that the game already publishes, and that the page renders and
 * scores. The interaction runs for real against js/ui.js in a sandbox.
 *
 * Run: node tests/test_unit10_workbook.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const wb = JSON.parse(fs.readFileSync(path.join(ROOT, 'worlds', 'unit10-workbook.json'), 'utf8'));
const world = JSON.parse(fs.readFileSync(path.join(ROOT, 'worlds', '2b-unit-10.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'sprites', 'catalog.json'), 'utf8'));
const uiSrc = fs.readFileSync(path.join(ROOT, 'js', 'ui.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'css', 'game.css'), 'utf8');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

// The same DOM stub the Unit 14 suite uses, kept local so the two suites cannot
// drift into each other.
function mkEl(tag) {
  const el = {
    tagName: (tag || 'div').toUpperCase(),
    textContent: '', className: '', type: '', disabled: false, tabIndex: -1,
    children: [], attrs: Object.create(null), onclick: null, onkeydown: null,
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      contains(c) { return this._s.has(c); }, toggle() {} },
    style: {}, dataset: Object.create(null), value: '', hidden: false,
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

function loadUi() {
  const els = Object.create(null);
  const document = {
    readyState: 'complete', documentElement: mkEl('html'), body: mkEl('body'),
    getElementById(id) { if (!(id in els)) els[id] = mkEl('div'); return els[id]; },
    createElement: mkEl, querySelectorAll: () => [], addEventListener() {}
  };
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
    IS_NODE: true, document, window: { addEventListener() {} },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 1, clearInterval() {},
    activeModalStack: [], playerLocked: false,
    playChiptuneSFX: noop, checkQuestProgress: noop, ensurePlayerRank: noop,
    studySessionXp: (s, t) => s * 14 + 10 + (s === t ? 20 : 0),
    addPlayerXp: (xp) => ({ leveled: false, level: 1, xp, need: 100 }),
    addHonor: noop, persistSave: noop, updateRankHUD: noop,
    isUnit10World: () => true, isUnit14World: () => false
  });
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'workbookArt.js'), 'utf8'), sandbox);
  vm.runInContext(uiSrc, sandbox);
  return {
    els,
    run: (expr) => vm.runInContext(expr, sandbox),
    open: (exId) => {
      real.__wb = wb;
      vm.runInContext('openWorkbook(__wb)', sandbox);
      if (exId) vm.runInContext("openWorkbookExercise('" + exId + "')", sandbox);
    }
  };
}

console.log('====================================================');
console.log('UNIT 10 WORKBOOK');
console.log('====================================================\n');

// ── 1. The twelve dishes the book prints ─────────────────────────────────────
console.log('--- 1. Textbook fidelity ---');
// 어휘 연습 1 lists twelve, in this order, and the world's word list already
// carries them — so the workbook must agree with both rather than inventing a
// thirteenth or renaming one.
const BOOK = ['김치찌개', '된장찌개', '순두부찌개', '감자탕', '매운탕', '설렁탕',
  '냉면', '칼국수', '비빔국수', '삼겹살', '떡갈비', '갈비찜'];
const dishes = wb.exercises.filter(e => e.type === 'match');
assert(wb.exercises.length === 4, 'four exercises off the 어휘 pages');
assert(dishes.length === 2, 'the twelve dishes are split across two matching pages');
const named = dishes.flatMap(e => e.bank.map(b => b.ko));
assert(named.length === 12, 'twelve names in all');
assert(JSON.stringify(named) === JSON.stringify(BOOK),
  'and they are the twelve the book prints, in the book’s order');
const worldWords = world.level.words.map(w => w.ko);
BOOK.forEach((ko) => {
  assert(worldWords.indexOf(ko) >= 0, ko + ' is already a Unit 10 vocabulary word');
});
assert(/tick|check/i.test(dishes[0].noteEn),
  'the page says what the book asked for, since the tick-list cannot be marked');

// 연습 2 — five taste adjectives, each in a different grammatical shape. That
// is the exercise: one word list, five endings, two of them irregular.
const taste = wb.exercises.find(e => e.id === 'u10-vocab-3');
assert(!!taste && taste.type === 'dialogue', '연습 3 is a dialogue page');
const KEY2 = [[1, '짜다', '짜요'], [2, '맵다', '매운'], [3, '쓰다', '써서'],
  [4, '달다', '단'], [5, '시다', '시어요']];
KEY2.forEach(([n, dict, form]) => {
  const it = taste.items.find(i => i.n === n);
  const chip = taste.bank.find(b => b.id === it.answer);
  assert(chip && chip.dict === dict, '연습 2 item ' + n + ' picks ' + dict);
  assert(chip && chip.polite === form, 'and the blank fills with ' + form);
});
assert(new Set(taste.bank.map(b => b.polite)).size === 5,
  'no two blanks want the same form — that is what the page drills');
assert(taste.items.every(i => i.lines.length === 2), 'each row is a two-line exchange');
assert(taste.items.filter(i => i.lines[0].ko.indexOf('{}') >= 0).length === 2
  && taste.items.filter(i => i.lines[1].ko.indexOf('{}') >= 0).length === 3,
  'and the blank falls in A’s line on two of them and B’s on three — which the'
  + ' old one-A-line-plus-shared-reply shape could not express');
assert(/ㅂ/.test(taste.items.find(i => i.n === 2).grammar), 'item 2 names the ㅂ-irregular');
assert(/ㅡ/.test(taste.items.find(i => i.n === 3).grammar), 'item 3 names the ㅡ-irregular');
assert(/ㄹ/.test(taste.items.find(i => i.n === 4).grammar), 'item 4 names the ㄹ drop');

// 연습 3 — the blank sits mid-sentence and takes its particle with it.
const rest = wb.exercises.find(e => e.id === 'u10-vocab-4');
assert(!!rest && rest.type === 'fill', '연습 4 is a fill page');
assert(rest.items.length === 3 && rest.bank.length === 5,
  'three sentences out of a box of five — the book offers more than it uses');
const KEY3 = [[1, '분위기', '분위기가'], [2, '서비스', '서비스가'], [3, '교통', '교통이']];
KEY3.forEach(([n, dict, form]) => {
  const it = rest.items.find(i => i.n === n);
  const chip = rest.bank.find(b => b.id === it.answer);
  assert(chip && chip.dict === dict, '연습 3 item ' + n + ' answers ' + dict);
  assert(chip && chip.polite === form, 'and carries its particle: ' + form);
});
assert(rest.bank.every(b => /[이가]$/.test(b.polite)), 'every entry brings a subject particle');
assert(rest.bank.filter(b => b.polite.endsWith('이')).length === 3
  && rest.bank.filter(b => b.polite.endsWith('가')).length === 2,
  'and the split is by final consonant, not by whim');
assert(rest.items.every(i => i.stemKo.indexOf('{}') >= 0),
  'the blank is marked mid-sentence rather than appended at the end');

// ── 2. Pictures are reused, not redrawn ──────────────────────────────────────
console.log('\n--- 2. Reusing the Unit 10 art ---');
const shipped = new Map((catalog.assets || [])
  .filter(a => a && a.status === 'shipped' && a.path)
  .map(a => ['sprites/' + String(a.path).replace(/\\/g, '/'), a]));
let imgCount = 0;
dishes.forEach((e) => {
  e.items.forEach((it) => {
    imgCount++;
    assert(!!it.img, e.no + ' item ' + it.n + ' shows a picture');
    assert(fs.existsSync(path.join(ROOT, it.img)), it.img + ' is on disk');
    const asset = shipped.get(it.img);
    assert(!!asset, it.img + ' is a shipped catalogue asset, not a new file');
    // The catalogue knows which word each icon is for. It has to be the word the
    // row is answered with, or the picture and the name disagree.
    const wantKo = e.bank.find(b => b.id === it.answer).ko;
    assert(asset && asset.wordKo === wantKo,
      it.img.split('/').pop() + ' is the catalogue’s icon for ' + wantKo);
    assert(asset && (asset.usedBy || []).indexOf('2b-unit-10') >= 0,
      'and Unit 10 already used it');
  });
  assert(e.items.every(it => !it.stemKo),
    e.no + ': no Korean on the left — the picture is the prompt, so printing the'
    + ' name there would answer the row');
});
assert(imgCount === 12, 'twelve pictures, one per dish');
assert(new Set(dishes.flatMap(e => e.items.map(i => i.img))).size === 12,
  'and no picture is used twice');

// ── 3. Every row is explained ────────────────────────────────────────────────
console.log('\n--- 3. What the names mean ---');
wb.exercises.forEach((e) => {
  e.items.forEach((it) => {
    assert(it.why && it.why.length > 40, e.no + ' item ' + it.n + ' says what the dish is');
    assert(it.grammar && it.grammar.length > 30, 'and takes the name apart');
    assert(it.en, 'and glosses it');
  });
});
// Korean food names are compounds, and that is the lesson worth carrying out of
// a vocabulary page. Spot-check the ones where the seam does real work.
const note = (ko) => {
  const ex = wb.exercises.find(e => e.bank.some(b => b.ko === ko));
  const id = ex.bank.find(b => b.ko === ko).id;
  return ex.items.find(i => i.answer === id).grammar;
};
assert(/매운|맵다/.test(note('매운탕')), '매운탕 names the 맵다 → 매운 modifier');
assert(/비비다|비빔/.test(note('비빔국수')), '비빔국수 names 비비다 → 비빔');
assert(/삼|겹|살/.test(note('삼겹살')), '삼겹살 is taken apart into three + layer + flesh');
assert(/찜|찌다|구이/.test(note('갈비찜')), '갈비찜 explains 찜 as the cooking, not the ingredient');
assert(/냉|면/.test(note('냉면')), '냉면 is given its Sino-Korean roots');

// ── 4. It renders and scores ─────────────────────────────────────────────────
console.log('\n--- 4. The page runs ---');
{
  const ui = loadUi();
  ui.open('u10-vocab-1');
  assert(ui.run('workbookState.chips.length') === 6, 'six names are offered');

  // Two columns, the way the book prints a matching exercise. The shared box
  // above the rows — which every other type uses — put six full-width name bars
  // over six pictures and read as two unrelated lists.
  assert(ui.els['wb-items'].className === 'wb-items-match wb-paired',
    'a picture match is laid out as a pair of columns');
  assert(ui.els['wb-bank'].className === 'wb-hidden',
    'and the box above the rows is gone, not just restyled');
  const cols = ui.els['wb-items'].children;
  assert(cols.length === 1 && cols[0].className === 'wb-cols', 'the list holds one two-column block');
  const left = cols[0].children[0], right = cols[0].children[1];
  assert(left && right && right.className.indexOf('wb-names') >= 0,
    'pictures in the first column, names in the second');
  const rows = left.children;
  assert(rows.length === 6, 'six picture rows');
  assert(right.children.length === 6, 'six names beside them');
  assert(right.children.every(c => (c.className || '').indexOf('wb-chip') === 0),
    'the names are the same chips the other exercises use');
  assert(rows[0].innerHTML.indexOf('<img class="wb-photo"') >= 0, 'a row draws its picture');
  assert(rows[0].innerHTML.indexOf('/sprites/foods/kimchi_stew.png') >= 0,
    'from the shipped sprite');
  assert(rows[0].innerHTML.indexOf('wb-join') >= 0, 'with the join between picture and name');
  assert(rows[0].className.indexOf('photo') > 0, 'and is marked as a picture row');
  ['.wb-photo', '.wb-cols', '.wb-names'].forEach((sel) => {
    assert(css.indexOf(sel) >= 0, sel + ' is styled');
  });
  // The blank is a grid item, so width:auto alone still stretches it the width
  // of the cell — which is the dashed rule that made this look wrong.
  assert(css.indexOf('.wb-items-match.wb-paired .wb-blank') >= 0
    && /\.wb-items-match\.wb-paired \.wb-blank \{[^}]*justify-self: start/.test(css),
    'and the blank is held to its own width rather than the cell’s');
  // A match without pictures keeps the box above the rows.
  const plain = loadUi();
  plain.run('__wb = ' + JSON.stringify({
    id: 'x', exercises: [{
      id: 'p', type: 'match', section: '어휘', no: '연습 1', instructionKo: 'x',
      bank: [{ id: 'a', ko: '가' }, { id: 'b', ko: '나' }],
      items: [{ n: 1, stemKo: '하나', answer: 'a', en: '', why: 'w', grammar: 'g' },
        { n: 2, stemKo: '둘', answer: 'b', en: '', why: 'w', grammar: 'g' }]
    }]
  }));
  plain.run("openWorkbook(__wb); openWorkbookExercise('p')");
  assert(plain.els['wb-items'].className === 'wb-items-match',
    'a text match is not paired');
  assert(plain.els['wb-bank'].children.length === 2, 'and keeps its box of chips');

  const ex1 = wb.exercises[0];
  ex1.items.forEach((it, i) => {
    ui.run('workbookState.focus = ' + i);
    ui.run("wbPickChip('" + it.answer + "')");
  });
  ui.run('checkWorkbook()');
  assert(ui.run('workbookState.score') === 6, 'naming all six correctly scores 6');
  assert(ui.els['wb-explain'].className === 'shown', 'the explanations open');
  assert(ui.els['wb-explain'].innerHTML.indexOf('김치찌개') >= 0, 'and name the dishes');

  // One name per picture: re-picking a placed chip moves it.
  const move = loadUi();
  move.open('u10-vocab-1');
  move.run("wbPickChip('ox_bone_soup')");
  move.run('workbookState.focus = 3');
  move.run("wbPickChip('ox_bone_soup')");
  assert(move.run('workbookState.fill[0]') === null, 'the name leaves its old picture');
  assert(move.run('workbookState.fill[3]') === 'ox_bone_soup', 'and lands on the new one');
}

// ── 4b. Dragging a name onto a picture ───────────────────────────────────────
console.log('\n--- 4b. Drag and drop ---');
{
  const ui = loadUi();
  ui.open('u10-vocab-1');
  const cols = ui.els['wb-items'].children[0];
  const rows = cols.children[0].children;
  const chips = cols.children[1].children;

  // Both ends of the gesture are wired: a name can be picked up, a picture can
  // be identified as the thing it was dropped on.
  assert(typeof chips[0].onpointerdown === 'function', 'a name can be picked up');
  assert(rows.every((r, i) => r.attrs['data-row'] === i),
    'and every picture row says which blank it is, so a drop knows where it landed');

  // The drag runs on pointer events, not the native drag-and-drop API, because
  // that one never fires on a touchscreen.
  assert(uiSrc.indexOf("addEventListener('pointermove'") >= 0
    && uiSrc.indexOf("addEventListener('pointerup'") >= 0
    && uiSrc.indexOf("addEventListener('pointercancel'") >= 0,
    'the drag is followed on the window, and cancelling cleans up');
  assert(uiSrc.indexOf('dragstart') < 0 && uiSrc.indexOf('dataTransfer') < 0,
    'and not on HTML5 drag-and-drop, which a finger cannot use');
  assert(/WB_DRAG_SLOP/.test(uiSrc), 'a few pixels of movement separate a drag from a tap');
  assert(css.indexOf('.wb-ghost') >= 0 && css.indexOf('.wb-row.drop') >= 0
    && /\.wb-chip \{ touch-action: none/.test(css),
    'the ghost, the drop target and the touch behaviour are styled');

  // The click that follows a real drag would undo the drop, so it is suppressed
  // — but only then. A plain click has to keep working, since it is what the
  // keyboard path and every other exercise type use.
  assert(/wbClickBlocked/.test(uiSrc), 'the click after a drag is dropped');
  ui.run('wbClickBlocked = false');
  ui.run('workbookState.focus = 2');
  chips[4].onclick();
  assert(ui.run('workbookState.fill[2]') === 'spicy_fish_stew',
    'a plain click still assigns a name');
  ui.run('wbClickBlocked = true');
  ui.run('workbookState.focus = 0');
  chips[0].onclick();
  assert(ui.run('workbookState.fill[0]') === null,
    'and the click right after a drop does not fire twice');
  ui.run('wbClickBlocked = false');

  // A marked page is finished; nothing may be dragged on it.
  const done = loadUi();
  done.open('u10-vocab-1');
  const ex1 = wb.exercises[0];
  ex1.items.forEach((it, i) => {
    done.run('workbookState.focus = ' + i);
    done.run("wbPickChip('" + it.answer + "')");
  });
  done.run('checkWorkbook()');
  done.run("wbDragBegin({ clientX: 0, clientY: 0, button: 0 }, 'kimchi_stew', -1, null)");
  assert(done.run('wbDrag') === null, 'a checked page cannot be dragged on');
}

// ── 5. Wiring ────────────────────────────────────────────────────────────────
console.log('\n--- 5. Wiring ---');
assert(uiSrc.indexOf("'/worlds/unit10-workbook.json'") >= 0,
  'the desk knows where Unit 10’s workbook lives');
const urlFn = uiSrc.slice(uiSrc.indexOf('function workbookUrl'), uiSrc.indexOf('function loadWorkbook'));
assert(urlFn.indexOf('isUnit14World') >= 0 && urlFn.indexOf('isUnit10World') >= 0,
  'and picks by world, the way the desk quiz already does');
// The publish batch and the clip harvest find workbooks by name rather than
// listing them, so a third unit needs no edit in either.
const r2 = fs.readFileSync(path.join(ROOT, 'scripts', 'r2Content.js'), 'utf8');
const tts = fs.readFileSync(path.join(ROOT, 'scripts', 'ttsClips.js'), 'utf8');
// Both look for the literal source text of the pattern, so a regex written to
// test a regex cannot quietly pass on the wrong escaping.
const PATTERN = '-workbook\\.json$';
assert(r2.indexOf(PATTERN) >= 0, 'the publish batch finds workbooks by pattern');
assert(tts.indexOf(PATTERN) >= 0, 'and so does the clip harvest');
assert(r2.indexOf("'worlds/unit14-workbook.json'") < 0,
  'no workbook is hand-listed for upload any more');
const { collectUploadFiles } = require('../scripts/r2Content.js');
const batch = new Set(collectUploadFiles(ROOT).map(f => f.rel));
assert(batch.has('worlds/unit10-workbook.json'), 'Unit 10’s workbook is published');
wb.exercises.forEach(e => e.items.filter(i => i.img).forEach((it) => {
  assert(batch.has(it.img), it.img.split('/').pop() + ' is published');
}));

console.log('\n====================================================');
console.log('RESULT: ' + passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
process.exit(failed ? 1 : 0);
