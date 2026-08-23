/**
 * tests/test_unit10_workbook.js — the Unit 10 workbook page on the study desk.
 *
 * Unit 10's 어휘 연습 1 is a checklist: tick the dishes you have tried. Nothing
 * can mark that, so the same twelve dishes become two matching exercises —
 * picture to name — reusing the food icons Unit 10 already ships. This suite
 * checks the twelve are the twelve the book prints, that every picture is a
 * sprite on disk that the game already publishes, and that the page renders and
 * scores. The 문법과 표현 pages are checked the same way, against the answer key
 * the book prints at the back: the choices marked correct, dropped into the
 * printed line, have to read as the key does. The interaction runs for real
 * against js/ui.js in a sandbox.
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
const { collectUploadFiles } = require('../scripts/r2Content.js');
const css = fs.readFileSync(path.join(ROOT, 'css', 'game.css'), 'utf8');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}
// A 'build' row is assembled from elements rather than one innerHTML string, so
// reading it back means walking the children.
function deepHtml(el) {
  if (!el) return '';
  return (el.innerHTML || '') + (el.children || []).map(deepHtml).join('');
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
// Scoped to 어휘: the 문법과 표현 pages have a text match of their own now.
const dishes = wb.exercises.filter(e => e.type === 'match' && e.section === '어휘');
const vocabPages = wb.exercises.filter(e => e.section === '어휘');
assert(vocabPages.length === 4, 'four exercises off the 어휘 pages');
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
vocabPages.forEach((e) => {
  e.items.forEach((it) => {
    assert(it.why && it.why.length > 40, e.no + ' item ' + it.n + ' says what the dish is');
    assert(it.grammar && it.grammar.length > 30, 'and takes the name apart');
    assert(it.en, 'and glosses it');
  });
});
// Korean food names are compounds, and that is the lesson worth carrying out of
// a vocabulary page. Spot-check the ones where the seam does real work.
const note = (ko) => {
  const ex = wb.exercises.find(e => (e.bank || []).some(b => b.ko === ko));
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

// ── 5. 문법과 표현 1 — N 중에(서) ────────────────────────────────────────────
console.log('\n--- 5. N 중에(서) ---');
const grammar = wb.exercises.filter(e => e.pattern === 'N 중에(서)'
  && e.section === '문법과 표현');
const g1 = grammar[0], g2 = grammar[1];
assert(grammar.length === 2, 'both 연습 off the 문법과 표현 1 page are here');
assert(grammar.every(e => e.type === 'build'), 'and each row carries its own choices');
assert(grammar.every(e => e.section === '문법과 표현'),
  'filed under 문법과 표현, and found by their pattern — the section holds two'
  + ' grammar points now, and both number their 연습 from 1');
assert(grammar.map(e => e.no).join(' ') === '연습 1 연습 2', 'numbered as the book numbers them');

// 연습 1 — the group is the answer. The key at the back of the book prints five
// phrases; the choice each row marks correct has to be one of them.
const KEY_G1 = ['과일 중에서', '음식 중에서', '운동 중에서', '우리 반 학생 중에서', '1년 중에서'];
const ASK_G1 = ['{} 뭘 제일 좋아해요?', '{} 뭐가 제일 맛있어요?', '{} 뭘 제일 잘해요?',
  '{} 누가 제일 한국말을 잘해요?', '{} 몇 월이 제일 더워요?'];
const REPLY_G1 = ['저는 딸기를 좋아해요.', '불고기가 제일 맛있어요.', '저는 농구를 잘해요.',
  '아키라 씨가 제일 잘해요.', '8월이 제일 더워요.'];
assert(g1.items.length === 5, '연습 1 has the book’s five rows');
g1.items.forEach((it, i) => {
  const got = (it.choices.find(c => c.id === it.answer) || {}).ko;
  assert(got === KEY_G1[i], '연습 1 item ' + (i + 1) + ' answers ' + KEY_G1[i]);
  assert(it.lines.length === 2 && it.lines[0].who === 'A' && it.lines[1].who === 'B',
    'and is an A/B exchange');
  assert(it.lines[0].ko === ASK_G1[i], 'A asks what the book prints');
  assert(it.lines[1].ko === REPLY_G1[i], 'and B answers what the book prints');
});
assert(g1.example.lines[0].ko === '민수 씨 {} 누가 제일 키가 커요?'
  && g1.example.lines[1].ko === '동생이 제일 커요.'
  && g1.example.answerKo === '가족 중에서',
  'the [보기] is the family photograph the page opens with');

// Two ways to be wrong, both of them mistakes a learner makes: the place
// particle on something that is not a place, and the winner standing where the
// group belongs.
g1.items.forEach((it, i) => {
  const at = '연습 1 item ' + (i + 1);
  assert(it.choices.length === 3, at + ' offers three phrases');
  const wrong = it.choices.filter(c => c.id !== it.answer).map(c => c.ko);
  assert(wrong.some(k => /에서$/.test(k) && k.indexOf('중에서') < 0),
    at + ': one wrong answer puts the place particle on a group');
  const swap = wrong.find(k => k.indexOf('중에서') >= 0);
  assert(!!swap, at + ': the other keeps 중에서 and swaps the noun');
  assert(swap && it.lines[1].ko.indexOf(swap.replace(' 중에서', '')) >= 0,
    at + ': and the noun it swaps in is the one B answers with — ' + swap);
  // 중에 and 중에서 are both right, which is what the brackets in the title mean.
  // Marking either wrong would teach a falsehood.
  assert(!wrong.some(k => /중에$/.test(k)), at + ': 중에 is never a distractor, being correct');
});

// The book photographs the group and prints no words at all. There are no
// photographs here, so the members are named in the row's phrase instead.
assert(g1.items.every(it => !it.art), '연습 1 draws no icon');
assert(g1.items.every(it => (it.phraseKo || '').indexOf('·') > 0),
  'each row lists the members the photograph showed');
assert(/photograph/i.test(g1.noteEn), 'and the page says outright what the book had there');
assert(g1.items[0].phraseKo.indexOf('사과') >= 0 && g1.items[0].phraseKo.indexOf('딸기') >= 0,
  'the fruit row names the fruit, one of which is what B picks');

// 연습 2 — A's whole question, out of a place and an adjective. Filled in, it
// has to come out as the key writes it.
const KEY_G2 = [
  '세계에서 제일 높은 산이 어디예요?',
  '한국에서 제일 큰 섬이 어디예요?',
  '서울에서 제일 복잡한 곳이 어디예요?',
  '학교 근처에서 제일 맛있는 식당이 어디예요?',
  '우리 반에서 제일 인기가 많은 사람이 누구예요?'
];
const REPLY_G2 = ['에베레스트 산이 제일 높아요.', '제주도가 가장 큰 섬이에요.',
  '강남 근처가 제일 복잡한 것 같아요.', '서울식당이 제일 맛있어요.',
  '글쎄요, 켈리 씨인 것 같아요.'];
assert(g2.items.length === 5, '연습 2 has the book’s five rows');
g2.items.forEach((it, i) => {
  const a = (it.choices.find(c => c.id === it.answer) || {}).ko;
  const b = (it.choices2.find(c => c.id === it.answer2) || {}).ko;
  assert(it.lines[0].ko.replace('{}', a).replace('{}', b) === KEY_G2[i],
    'the key’s question comes out whole: ' + KEY_G2[i]);
  assert(it.lines[1].ko === REPLY_G2[i], 'and B says what the book prints');
  assert(it.phraseKo.indexOf(' / ') > 0, 'the row carries the book’s place / adjective label');
});
assert(g2.example.answerKo === '서울에서' && g2.example.answer2Ko === '큰'
  && g2.example.lines[1].ko === '남대문시장이 가장 커요.',
  'the [보기] is the Namdaemun market one, 가장 and all');

// Two blanks, two decisions, and 중에서 is the wrong one on every row — which is
// the whole reason the two 연습 sit next to each other.
g2.items.forEach((it, i) => {
  const at = '연습 2 item ' + (i + 1);
  assert(it.choices.length === 3 && it.choices2.length === 3, at + ' offers three for each blank');
  const ids = new Set(it.choices.map(c => c.id));
  assert(it.choices2.every(c => !ids.has(c.id)),
    at + ': no id is shared, so a placed form cannot be read into the other blank');
  const wrong = it.choices.filter(c => c.id !== it.answer).map(c => c.ko);
  assert(wrong.some(k => k.indexOf('중에서') >= 0), at + ': 중에서 is offered, and is wrong here');
  assert(wrong.some(k => /에$/.test(k)), at + ': and 에 is offered against 에서');
  assert(it.choices2.filter(c => c.id !== it.answer2).length === 2,
    at + ': and two endings the adjective does not take');
});
assert(g2.items[0].choices2.some(c => c.ko === '높는'),
  '높다 is put against the -는 that an adjective never takes');
assert(g2.items[1].choices2.some(c => c.ko === '크은'),
  '크다 is put against the 으 a vowel stem never takes');
assert(g2.items[3].choices2.some(c => c.ko === '맛있은') && /있다/.test(g2.items[3].grammar),
  '맛있는 is put against 맛있은, and the note says 있다 is the reason');
assert(/우리 반 학생 중에서/.test(g2.items[4].grammar),
  'and the last row points back at 연습 1, where the students were the set');

grammar.forEach((e) => {
  e.items.forEach((it) => {
    assert(it.why && it.why.length > 40,
      e.no + ' item ' + it.n + ' says how the answer is arrived at');
    assert(it.grammar && it.grammar.length > 30, 'and names the rule behind it');
    assert(it.en, 'and glosses the exchange');
  });
});

// ── 5b. The grammar pages run ────────────────────────────────────────────────
console.log('\n--- 5b. Building the questions ---');
{
  const ui = loadUi();
  ui.open('u10-grammar-1-1');
  assert(ui.els['wb-bank'].className === 'wb-hidden',
    'no shared box is drawn: the choices hang off each row');
  assert(ui.els['wb-items'].className === 'wb-items-build', 'build rows use their own layout');
  assert(ui.els['wb-count'].textContent === '0 / 5', 'five blanks on 연습 1');
  g1.items.forEach((it, i) => ui.run('wbPickChoice(' + i + ", '" + it.answer + "')"));
  assert(ui.run('wbComplete()') === true, 'one phrase per row finishes the page');
  ui.run('checkWorkbook()');
  assert(ui.run('workbookState.score') === 5, 'the textbook key scores 5 of 5');
  const row1 = deepHtml(ui.els['wb-items'].children[0]);
  assert(row1.indexOf('과일 중에서') >= 0 && row1.indexOf('저는 딸기를 좋아해요.') >= 0,
    'the finished row reads as the book’s dialogue');
  assert(row1.indexOf('사과 · 딸기 · 오렌지 · 포도') >= 0,
    'with the group named where the photograph was');

  // 연습 2 asks two things of every row and scores both.
  const two = loadUi();
  two.open('u10-grammar-1-2');
  assert(two.els['wb-count'].textContent === '0 / 10',
    'ten blanks on 연습 2 — the counter counts blanks, not rows');
  g2.items.forEach((it, i) => two.run('wbPickChoice(' + i + ", '" + it.answer + "')"));
  assert(two.run('wbComplete()') === false, 'the place alone does not finish a row');
  g2.items.forEach((it, i) => two.run('wbPickChoice(' + i + ", '" + it.answer2 + "', 2)"));
  assert(two.run('wbComplete()') === true, 'the adjective finishes it');
  two.run('checkWorkbook()');
  assert(two.run('workbookState.score') === 10, 'the whole key scores 10 of 10');
  const row4 = deepHtml(two.els['wb-items'].children[3]);
  assert(row4.indexOf('학교 근처에서') >= 0 && row4.indexOf('맛있는') >= 0,
    'and a row shows both halves it was built from');
  const eg = two.els['wb-example'].innerHTML;
  assert(eg.indexOf('<b>서울에서</b>') >= 0 && eg.indexOf('<b>큰</b>') >= 0
    && eg.indexOf('시장이 어디예요?') >= 0,
    'the worked example prints both halves filled in, not the puzzle again');

  // Both blanks fall in A's line — the book's question is one line long — so
  // the speaker chip cannot tell the two groups of buttons apart on its own,
  // and the tag carries the blank it fills with it.
  const picks = two.els['wb-items'].children[0].children[1].children[2];
  const tags = picks.children.filter(c => c.className === 'wb-picks-tag')
    .map(c => c.textContent);
  assert(tags.join(' ') === 'A1 A2', 'the two groups are tagged A1 and A2');
  assert(picks.children.some(c => c.className === 'wb-picks-break'),
    'and are broken onto their own lines, in the order the blanks come');

  // Half a question is not the answer to it.
  const half = loadUi();
  half.open('u10-grammar-1-2');
  g2.items.forEach((it, i) => {
    half.run('wbPickChoice(' + i + ", '" + it.answer + "')");
    const bad = it.choices2.find(c => c.id !== it.answer2);
    half.run('wbPickChoice(' + i + ", '" + bad.id + "', 2)");
  });
  half.run('checkWorkbook()');
  assert(half.run('workbookState.score') === 5,
    'five right places with five wrong forms scores 5 of 10');
  assert(half.els['wb-items'].children[0].className.indexOf('bad') > 0,
    'and a row with one half wrong is marked wrong');

}

// ── 6. 문법과 표현 2 — 반말 ──────────────────────────────────────────────────
console.log('\n--- 6. 반말 ---');
const banmal = wb.exercises.filter(e => e.pattern === '반말'
  && e.section === '문법과 표현');
const [b1, b2, b3, b4, b5] = banmal;
assert(banmal.length === 5, 'all five 연습 off the 반말 page are here');
assert(banmal.map(e => e.no).join(' ') === '연습 1 연습 2 연습 3 연습 4 연습 5',
  'numbered as the book numbers them');
assert(banmal.every(e => e.section === '문법과 표현'), 'all five are filed under 문법과 표현');
assert(b1.type === 'dialogue' && banmal.slice(1).every(e => e.type === 'build'),
  '연습 1 shares one box of words; the other four carry their choices per row');

// The text a row reads as once the answers marked correct are dropped in. Every
// key check below goes through this, so a wrong answer id cannot pass by being
// spelled right in the prose.
function wbFill(ex, holder) {
  const texts = ex.type === 'build'
    ? [holder.answerKo !== undefined
      ? holder.answerKo
      : ((holder.choices || []).find(c => c.id === holder.answer) || {}).ko,
    holder.answer2Ko !== undefined
      ? holder.answer2Ko
      : ((holder.choices2 || []).find(c => c.id === holder.answer2) || {}).ko]
    : [(ex.bank.find(c => c.id === holder.answer) || {}).ko];
  let slot = 0;
  return (holder.lines || []).map(l => String(l.ko).replace(/\{\}/g, () => texts[slot++]))
    .join(' ');
}

// 연습 1 — the box the book prints, in the book's order: two rows of six, 나 down
// the first and 너 down the second.
const BOX = ['내가', '나는', '나를', '나도', '나한테', '내',
  '네가', '너는', '너를', '너도', '너한테', '네'];
assert(JSON.stringify(b1.bank.map(c => c.ko)) === JSON.stringify(BOX),
  'the box holds the twelve words the book prints, in its order');
assert(b1.bank.filter(c => c.usedByExample).length === 1
  && b1.bank.find(c => c.usedByExample).ko === '내가',
  'and 내가 is spent on the [보기], as the book spends it');
assert(wbFill(b1, b1.example) === '오늘 배운 문법을 잘 모르겠어. 내가 가르쳐 줄게.',
  'the [보기] reads as the book prints it');
const KEY_B1 = ['나한테', '나는', '내', '너한테', '네', '나도'];
const SCRIPT_B1 = [
  ['수업 끝나면 {} 전화해.', '그래, 전화할게.'],
  ['같이 점심 먹자.', '{} 벌써 먹었는데.'],
  ['이거 누구 책이야?', '아, 그거 {} 책이야.'],
  ['아까 내가 {} 전화했는데 몰랐어?', '그랬어? 오늘 휴대폰을 집에 놓고 왔어.'],
  ['이거 {} 거야?', '응, 내 거야.'],
  ['오늘 나나 생일이라서 저녁에 나나 집에 갈 거야. 너도 갈 거지?', '응, {} 갈 거야.']
];
assert(b1.items.length === 6, '연습 1 has the book’s six dialogues');
b1.items.forEach((it, i) => {
  const at = '연습 1 item ' + (i + 1);
  assert((b1.bank.find(c => c.id === it.answer) || {}).ko === KEY_B1[i],
    at + ' answers ' + KEY_B1[i]);
  assert(it.lines.length === 2 && it.lines[0].who === 'A' && it.lines[1].who === 'B',
    at + ' is an A/B exchange');
  assert(it.lines[0].ko === SCRIPT_B1[i][0] && it.lines[1].ko === SCRIPT_B1[i][1],
    at + ' prints both lines as the book does');
});
// The blank moves between the speakers, which is the thing the old one-A-line
// shape could not express — and it is 나 for the answers and 너 for the questions.
assert(b1.items.filter(it => it.lines[0].ko.indexOf('{}') >= 0).map(it => it.n).join() === '1,4,5',
  'the blank falls in A’s line on items 1, 4 and 5 and in B’s on the other three —'
  + ' which is the shape a shared A line could not have expressed');
assert(/내/.test(b1.noteEn) && /네/.test(b1.noteEn),
  'the page names both shape changes up front');
assert(/니/.test(b1.items[4].grammar),
  'and item 5 says why 네 is pronounced 니 — it is spelled like the word for yes');

// 연습 2 — fifteen sentences out of 해요체. The polite original is printed above
// the row; the row itself is the 반말 with a gap in it.
const SRC_B2 = ['그 식당은 분위기가 좋아요.', '냉면이 좀 매워요.', '저는 매일 아침 운동을 해요.',
  '숙제하고 나서 영화를 볼 거예요.', '시험이 어렵지 않을 거예요.',
  '친구가 제 카메라를 잃어버렸어요.', '이 옷은 작년에 산 거예요.', '내일은 제 친구 생일이에요.',
  '극장에 사람이 정말 많네요.', '같이 커피 마시러 가요.', '도착하면 저한테 전화해 주세요.',
  '내일은 늦지 마세요.', '제가 전화로 주문할게요.', '주말에 같이 산에 갈까요?',
  '오늘 날씨가 아주 춥지요?'];
const KEY_B2 = ['그 식당은 분위기가 좋아.', '냉면이 좀 매워.', '나는 매일 아침 운동을 해.',
  '숙제하고 나서 영화를 볼 거야.', '시험이 어렵지 않을 거야.', '친구가 내 카메라를 잃어버렸어.',
  '이 옷은 작년에 산 거야.', '내일은 내 친구 생일이야.', '극장에 사람이 정말 많네.',
  '같이 커피 마시러 가자.', '도착하면 나한테 전화해 줘.', '내일은 늦지 마.',
  '내가 전화로 주문할게.', '주말에 같이 산에 갈까?', '오늘 날씨가 아주 춥지?'];
assert(b2.items.length === 15, '연습 2 has all fifteen sentences');
assert(wbFill(b2, b2.example) === '비빔밥이 맛있어요. → 비빔밥이 맛있어.',
  'the [보기] shows the 요 coming off');
b2.items.forEach((it, i) => {
  const at = '연습 2 item ' + (i + 1);
  assert(it.phraseKo === SRC_B2[i], at + ' prints the polite original: ' + SRC_B2[i]);
  assert(wbFill(b2, it) === '→ ' + KEY_B2[i], at + ' comes out as ' + KEY_B2[i]);
  assert(!it.lines[0].who, at + ' has nobody saying it — it is a rewrite, not a dialogue');
});
// The rows where 저/제 has to become 나/내 are the ones the book chose to hide it
// in, and they are the rows with two blanks.
assert(b2.items.filter(it => it.choices2).map(it => it.n).join() === '3,6,8,11,13',
  'five rows carry a second blank, and they are the five with 저 or 제 in them');
b2.items.filter(it => it.choices2).forEach((it) => {
  assert(/^(저|제)/.test(it.phraseKo) || /\s(저|제)/.test(it.phraseKo),
    '연습 2 item ' + it.n + ' is a two-blank row because the pronoun changes too');
  assert(/저|제/.test(it.why) || /저|제/.test(it.grammar),
    'and it says so in the explanation');
});
assert(b2.items[3].choices.some(c => c.ko === '거예') && /거 \+ 이에요|거 ?\+ ?이에요/.test(b2.items[3].grammar),
  '거예요 is put against 거예, and the note takes 거예요 apart into 거 + 이에요');
assert(b2.items[7].choices2.map(c => c.ko).join() === '이야,이에요,야',
  'item 8 puts 이야 against the bare 야, which is the final-consonant decision');
assert(/자/.test(b2.items[9].grammar) && /까/.test(b2.items[13].grammar),
  'the stated suggestion becomes -자 and the asked one keeps -(으)ㄹ까');
assert(b2.items[12].choices2.some(c => c.ko === '께') && /께/.test(b2.items[12].grammar),
  'and 주문할게 is put against the 께 it is pronounced as');

// 연습 3 — the book leaves B's whole line open. The model answer from the key is
// offered against two that answer the question but slip somewhere else.
const ASK_B3 = ['지금 식당에 갈 거야?', '주말에 같이 영화 보러 갈까?', '어제 뭐 했어?',
  '오늘 수업 끝나고 뭐 해?', '생일이 며칠이야?'];
const KEY_B3 = ['응, 지금 갈 거야.', '그래, 가자.', '집에서 숙제했어.',
  '점심 먹으러 갈 거야.', '내 생일은 9월 20일이야.'];
assert(b3.items.length === 5, '연습 3 has the book’s five exchanges');
assert(wbFill(b3, b3.example)
  === '이 근처에 서점이 어디에 있는지 알아? 응, 지하철역 옆에 있어.',
  'the [보기] is the bookshop one');
b3.items.forEach((it, i) => {
  const at = '연습 3 item ' + (i + 1);
  assert(it.lines[0].ko === ASK_B3[i] && it.lines[0].who === 'A', at + ': A asks the book’s question');
  assert(it.lines[1].who === 'B' && it.lines[1].ko === '{}',
    at + ': and B’s whole line is the blank, as the book prints it');
  assert((it.choices.find(c => c.id === it.answer) || {}).ko === KEY_B3[i],
    at + ' answers ' + KEY_B3[i]);
});
assert(/네/.test(b3.noteEn), 'the page warns that 네 gives it away as surely as 요 does');
assert(b3.items[0].choices.some(c => c.ko === '네, 지금 갈 거야.'),
  'item 1 puts 응 against 네 with the rest of the sentence held identical');
assert(b3.items[4].choices.some(c => c.ko === '내 생일은 9월 20일이에요.'),
  'and item 5 offers a half-반말 half-존댓말 sentence, which is the commonest slip of all');

// 연습 4 — three registers side by side, and only 반말 is asked for.
const SRC_B4 = ['지금 어디에서 사십니까?', '한국 생활이 재미있어요?', '무슨 음식을 좋아해요?',
  '한국어 공부 때문에 힘들지요?', '몇 시쯤 집에 갈 거예요?', '성함이 어떻게 되십니까?',
  '오늘 점심 같이 먹을까요?', '오늘 기분이 어때요?', '내일 아침에 늦지 마세요.',
  '주말에 만납시다.'];
const KEY_B4 = ['지금 어디에서 살아?', '한국 생활이 재미있어?', '무슨 음식을 좋아해?',
  '한국어 공부 때문에 힘들지?', '몇 시쯤 집에 갈 거야?', '이름이 뭐야?',
  '오늘 점심 같이 먹을까?', '오늘 기분이 어때?', '내일 아침에 늦지 마.', '주말에 만나자.'];
assert(b4.items.length === 10, '연습 4 has all ten sentences');
b4.items.forEach((it, i) => {
  const at = '연습 4 item ' + (i + 1);
  assert(it.phraseKo === SRC_B4[i], at + ' prints the original: ' + SRC_B4[i]);
  assert(wbFill(b4, it) === '→ ' + KEY_B4[i], at + ' comes out as ' + KEY_B4[i]);
});
assert(b4.items.filter(it => it.choices2).map(it => it.n).join() === '6',
  'only item 6 needs two blanks, because only there do the words change and not the ending');
assert(b4.items[5].choices.some(c => c.ko === '성함이')
  && b4.items[5].choices2.some(c => c.ko === '어떻게 되셔')
  && /성함|honorific/i.test(b4.items[5].grammar),
  '성함 and the honorific 시 are both offered and both wrong, and the note says why');
assert(/이름/.test(b4.items[5].grammar) && /연세|나이/.test(b4.items[5].grammar),
  'and it gives the other honorific pairs to go with it');
// Every row offers something from the formal style, so 반말 is being chosen out of
// three rather than out of two.
const FORMAL = /(니까|시다|시오|니다)$/;
b4.items.forEach((it) => {
  // Item 6 is the exception and has to be: what is wrong there is the honorific
  // vocabulary, so 성함 and 되셔 are the distractors rather than a formal ending.
  if (it.n === 6) return;
  const wrong = it.choices.filter(c => c.id !== it.answer).map(c => c.ko)
    .concat((it.choices2 || []).filter(c => c.id !== it.answer2).map(c => c.ko));
  assert(wrong.some(k => FORMAL.test(k)),
    '연습 4 item ' + it.n + ' offers the formal style as well as the polite one');
  assert(wrong.some(k => /요[.?]?$/.test(k)),
    'and the 해요체 form beside it, so 반말 is chosen out of three registers');
});

// 연습 5 — one call, kept in order. The book's frame has fifteen blanks; a turn
// of two sentences becomes two rows, because a row draws at most two groups.
const KEY_B5 = ['응', '괜찮아', '중이었어', '좋아하지', '응', '좋아해', '왜', '네가',
  '전화했어', '그래', '하는데', '물어봐', '줄게', '응', '고마워'];
const WHO_B5 = ['스티븐', '스티븐', '정우', '스티븐', '스티븐', '정우', '스티븐', '정우', '스티븐'];
assert(b5.items.length === 9, 'the call comes to nine rows');
const blanks5 = b5.items.reduce((out, it) => out.concat([
  (it.choices.find(c => c.id === it.answer) || {}).ko,
  it.choices2 ? (it.choices2.find(c => c.id === it.answer2) || {}).ko : null
].filter(v => v !== null)), []);
assert(JSON.stringify(blanks5) === JSON.stringify(KEY_B5),
  'and its fifteen blanks are the key’s fifteen words, in the key’s order');
assert(JSON.stringify(b5.items.map(it => it.lines[0].who)) === JSON.stringify(WHO_B5),
  'the speakers alternate as the book has them, 정우 and 스티븐 by name');
assert(b5.items.every(it => it.lines.length === 1),
  'one line per row, so the polite original above it lines up with it');
assert(wbFill(b5, b5.example) === '스티븐, 지금 통화 괜찮아?',
  'the [보기] is 정우’s opening line, with 씨 already gone');
assert(b5.example.phraseKo === '스티븐 씨, 지금 통화 괜찮아요?',
  'and the polite version of it is printed above');
assert(/씨/.test(b5.noteEn), 'the page says what happens to 씨 and to 스티븐 씨가');
assert(b5.items[5].phraseKo.indexOf('스티븐 씨가') >= 0
  && b5.items[5].phraseKo.indexOf('국립국악원') === 0
  && /전화했어요\.$/.test(b5.items[5].phraseKo),
  'the long turn is printed whole, third-person 스티븐 씨가 and all');
assert(b5.items[5].choices.some(c => c.ko === '너가') && /표준|standard/i.test(b5.items[5].grammar),
  '너가 is offered and the note says outright that it is not the standard form');
assert([1, 4, 9].every(n => b5.items.find(it => it.n === n).choices
  .map(c => c.ko).join() === '응,네,예'),
  'the three yes-answers all put 응 against 네 and 예');

// The whole point of the page: the answer never keeps its 요, and the politeness
// is always on offer as a wrong one.
const polite = (s) => /요[.?]?$/.test(String(s));
banmal.slice(1).forEach((ex) => {
  ex.items.forEach((it) => {
    const at = ex.no + ' item ' + it.n;
    const right = [(it.choices.find(c => c.id === it.answer) || {}).ko]
      .concat(it.choices2 ? [(it.choices2.find(c => c.id === it.answer2) || {}).ko] : []);
    const wrong = it.choices.filter(c => c.id !== it.answer).map(c => c.ko)
      .concat((it.choices2 || []).filter(c => c.id !== it.answer2).map(c => c.ko));
    assert(right.every(k => !polite(k)), at + ': no correct answer keeps its 요');
    assert(wrong.some(k => polite(k)), at + ': and the polite form is offered as a wrong one');
  });
});
banmal.forEach((e) => {
  e.items.forEach((it) => {
    assert(it.why && it.why.length > 40, e.no + ' item ' + it.n + ' explains the answer');
    assert(it.grammar && it.grammar.length > 30, 'and names the rule behind it');
    assert(it.en, 'and glosses the line');
  });
});

// ── 6b. The 반말 pages run ───────────────────────────────────────────────────
console.log('\n--- 6b. Speaking 반말 ---');
{
  // 연습 1 keeps the shared box: one word per blank, and eleven to choose from
  // once the [보기] has spent 내가.
  const ui = loadUi();
  ui.open('u10-grammar-2-1');
  assert(ui.run('workbookState.chips.length') === 11,
    'eleven words are offered — the twelve less the one the [보기] used');
  assert(ui.els['wb-bank'].children.length === 11, 'and the box above the rows holds them');
  assert(ui.els['wb-example'].innerHTML.indexOf('내가') >= 0,
    'the [보기] shows its answer filled in');
  assert(ui.els['wb-count'].textContent === '0 / 6', 'six blanks');
  b1.items.forEach((it, i) => {
    ui.run('workbookState.focus = ' + i);
    ui.run("wbPickChip('" + it.answer + "')");
  });
  ui.run('checkWorkbook()');
  assert(ui.run('workbookState.score') === 6, 'the textbook key scores 6 of 6');
  const r1 = deepHtml(ui.els['wb-items'].children[0]);
  assert(r1.indexOf('수업 끝나면') >= 0 && r1.indexOf('나한테') >= 0
    && r1.indexOf('그래, 전화할게.') >= 0, 'and the row reads as the book’s dialogue');

  // 연습 2 — twenty blanks over fifteen rows, and the rewrite rows have nobody
  // speaking them, so no group tag is drawn.
  const two = loadUi();
  two.open('u10-grammar-2-2');
  assert(two.els['wb-bank'].className === 'wb-hidden', 'no shared box on a build page');
  assert(two.els['wb-count'].textContent === '0 / 20',
    'twenty blanks: fifteen rows, five of them with a second');
  b2.items.forEach((it, i) => {
    two.run('wbPickChoice(' + i + ", '" + it.answer + "')");
    if (it.choices2) two.run('wbPickChoice(' + i + ", '" + it.answer2 + "', 2)");
  });
  assert(two.run('wbComplete()') === true, 'every blank filled finishes the page');
  two.run('checkWorkbook()');
  assert(two.run('workbookState.score') === 20, 'the textbook key scores 20 of 20');
  const rowThree = two.els['wb-items'].children[2];
  const picks3 = rowThree.children[1].children[2];
  assert(picks3.children.filter(c => c.className === 'wb-picks-tag').length === 0,
    'a rewrite row draws no group tag — there is no speaker to name, and a bare'
    + ' number would read as the key badge on the button beside it');
  assert(picks3.children.some(c => c.className === 'wb-picks-break'),
    'the two groups are still broken onto their own lines');
  const rowThreeHtml = deepHtml(rowThree);
  assert(rowThreeHtml.indexOf('저는 매일 아침 운동을 해요.') >= 0,
    'the polite original is printed on the row');
  assert(rowThreeHtml.indexOf('나는') >= 0 && rowThreeHtml.indexOf('wb-line-solo') >= 0,
    'and the rewrite is drawn as a line with no speaker chip');

  // 연습 3 — B's whole line is one blank.
  const three = loadUi();
  three.open('u10-grammar-2-3');
  assert(three.els['wb-count'].textContent === '0 / 5', 'five blanks, one per exchange');
  b3.items.forEach((it, i) => three.run('wbPickChoice(' + i + ", '" + it.answer + "')"));
  three.run('checkWorkbook()');
  assert(three.run('workbookState.score') === 5, 'the model answers score 5 of 5');
  const r3 = deepHtml(three.els['wb-items'].children[1]);
  assert(r3.indexOf('주말에 같이 영화 보러 갈까?') >= 0 && r3.indexOf('그래, 가자.') >= 0,
    'the exchange reads as a question and its answer');

  // 연습 4 — eleven blanks, ten rows.
  const four = loadUi();
  four.open('u10-grammar-2-4');
  assert(four.els['wb-count'].textContent === '0 / 11',
    'eleven blanks: item 6 changes two things');
  b4.items.forEach((it, i) => {
    four.run('wbPickChoice(' + i + ", '" + it.answer + "')");
    if (it.choices2) four.run('wbPickChoice(' + i + ", '" + it.answer2 + "', 2)");
  });
  four.run('checkWorkbook()');
  assert(four.run('workbookState.score') === 11, 'the textbook key scores 11 of 11');
  assert(deepHtml(four.els['wb-items'].children[5]).indexOf('이름이') >= 0,
    'and 성함이 어떻게 되십니까 comes out as 이름이 뭐야');

  // 연습 5 — fifteen blanks, and the speakers are names rather than initials.
  const five = loadUi();
  five.open('u10-grammar-2-5');
  assert(five.els['wb-count'].textContent === '0 / 15', 'fifteen blanks, as the frame has');
  const rowOne = deepHtml(five.els['wb-items'].children[0]);
  assert(rowOne.indexOf('data-name') > 0 && rowOne.indexOf('스티븐') >= 0,
    'a name-length speaker chip says so, since the pixel font has no Hangul');
  const tags5 = five.els['wb-items'].children[0].children[1].children[2].children
    .filter(c => c.className === 'wb-picks-tag');
  assert(tags5.map(c => c.textContent).join(' ') === '스티븐1 스티븐2',
    'and where one line owns both blanks the tag carries which blank it fills');
  assert(tags5.every(c => c.getAttribute('data-name') === '1'),
    'those tags are drawn in the Korean face too');
  b5.items.forEach((it, i) => {
    five.run('wbPickChoice(' + i + ", '" + it.answer + "')");
    if (it.choices2) five.run('wbPickChoice(' + i + ", '" + it.answer2 + "', 2)");
  });
  five.run('checkWorkbook()');
  assert(five.run('workbookState.score') === 15, 'the whole call scores 15 of 15');
  assert(deepHtml(five.els['wb-items'].children[5]).indexOf('네가') >= 0,
    '스티븐 씨가 comes out as 네가');
  ['.wb-spk[data-name]', '.wb-picks-tag[data-name]'].forEach((sel) => {
    assert(css.indexOf(sel.replace('[data-name]', '[data-name]')) >= 0
      || /\.wb-spk\[data-name\], \.wb-picks-tag\[data-name\]/.test(css),
      'the name-length chip is styled');
  });

  // A one-letter speaker is left exactly as it was — Unit 14 and the previous
  // grammar point both depend on it.
  const prev = loadUi();
  prev.open('u10-grammar-1-2');
  const prevTags = prev.els['wb-items'].children[0].children[1].children[2].children
    .filter(c => c.className === 'wb-picks-tag');
  assert(prevTags.map(c => c.textContent).join(' ') === 'A1 A2',
    'A stays A, with the blank number after it');
  assert(prevTags.every(c => !c.getAttribute('data-name')),
    'and keeps the pixel font, because A is a letter the font has');


}

// ── 6c. Invariants across the whole book ────────────────────────────────────
console.log('\n--- 6c. Every page holds together ---');
{
  let rowCount = 0, blankCount = 0;
  wb.exercises.forEach((ex) => {
    const at = ex.id;
    (ex.items || []).forEach((it) => {
      rowCount++;
      if (!it.choices) return;
      const sets = [it.choices].concat(it.choices2 ? [it.choices2] : []);
      blankCount += sets.length;
      const ids = new Set();
      sets.forEach((set, s) => {
        const texts = set.map(c => c.ko);
        assert(new Set(texts).size === texts.length,
          at + ' item ' + it.n + ' blank ' + (s + 1) + ': no form is offered twice');
        set.forEach((c) => {
          assert(!ids.has(c.id),
            at + ' item ' + it.n + ': choice id ' + c.id + ' is used once in the row');
          ids.add(c.id);
        });
      });
      // A blank the renderer can fill has to exist in the script, and a script
      // gap with no buttons under it renders as already answered.
      const gaps = (it.lines || []).reduce((n, l) => n + l.ko.split('{}').length - 1, 0);
      assert(gaps === sets.length,
        at + ' item ' + it.n + ': ' + sets.length + ' choice set(s) and ' + gaps + ' gap(s)');
    });
    if (ex.example && ex.type === 'build') {
      const gaps = (ex.example.lines || [])
        .reduce((n, l) => n + l.ko.split('{}').length - 1, 0);
      assert(gaps === (ex.example.answer2Ko ? 2 : 1),
        at + ': the [보기] has a gap for every answer it carries');
    }
  });
  assert(rowCount === 115, 'a hundred and fifteen questions across the twenty pages');
  assert(blankCount === 121, 'and a hundred and twenty-one blanks over the fourteen build pages');
  // Nothing in the book is answered by a form it also offers as wrong.
  wb.exercises.filter(e => e.bank).forEach((ex) => {
    const answers = ex.items.map(it => it.answer);
    assert(new Set(answers).size === answers.length,
      ex.id + ': one word per blank, so no word answers two rows');
  });
}

// ── 7. 문법과 표현 3 — V-(으)ㄹ래요 ──────────────────────────────────────────
console.log('\n--- 7. V-(으)ㄹ래요 ---');
const willing = wb.exercises.filter(e => e.pattern === 'V-(으)ㄹ래요'
  && e.section === '문법과 표현');
const [w1, w2] = willing;
assert(willing.length === 2, 'both 연습 off the V-(으)ㄹ래요 page are here');
assert(willing.every(e => e.type === 'build' && e.section === '문법과 표현'),
  'both carry their choices per row, under 문법과 표현');
assert(willing.map(e => e.no).join(' ') === '연습 1 연습 2', 'numbered as the book numbers them');

// 연습 1 — the plan, then the invitation. Both blanks are in A's line.
const KEY_W1 = [
  '영화 보러 가려고 하는데 같이 갈래요?',
  '태권도를 배우려고 하는데 같이 배울래요?',
  '점심 먹으려고 하는데 같이 먹을래요?',
  '산책하려고 하는데 같이 할래요?',
  '테니스를 치려고 하는데 같이 칠래요?'
];
const REPLY_W1 = ['네, 좋아요.', '저는 운동하는 걸 별로 안 좋아해요.',
  '전 조금 전에 친구랑 먹었어요.', '네, 좋아요.', '전 테니스를 전혀 칠 줄 몰라요.'];
assert(w1.items.length === 5, '연습 1 has the book’s five pictures');
assert(wbFill(w1, w1.example) === '라면을 끓이려고 하는데 같이 먹을래요? 네, 좋아요.',
  'the [보기] is the ramyeon one');
assert(w1.example.answerKo === '끓이려고' && w1.example.answer2Ko === '먹을래요',
  'and its two verbs are different ones — you boil it, you ask about eating it');
assert(/끓이|boil/i.test(w1.noteEn) || /same one/.test(w1.noteEn),
  'which the page says outright, since every row after it uses one verb twice');
w1.items.forEach((it, i) => {
  const at = '연습 1 item ' + (i + 1);
  assert(it.lines.length === 2 && it.lines[0].who === 'A' && it.lines[1].who === 'B',
    at + ' is an A/B exchange');
  assert(it.lines[0].ko.split('{}').length - 1 === 2,
    at + ': both blanks fall in A’s line, which is what the book leaves open');
  assert(wbFill(w1, it) === KEY_W1[i] + ' ' + REPLY_W1[i], at + ' comes out as ' + KEY_W1[i]);
  assert(it.lines[1].ko === REPLY_W1[i], 'and B answers what the book prints');
  assert(/다$/.test(it.phraseKo), at + ' names the verb in its dictionary form');
});
// This page is 존댓말 all through, which is what makes 연습 2 the 반말 one.
w1.items.forEach((it) => {
  const right = [(it.choices.find(c => c.id === it.answer) || {}).ko,
    (it.choices2.find(c => c.id === it.answer2) || {}).ko];
  assert(/요$/.test(right[1]), '연습 1 item ' + it.n + ' invites in 존댓말: ' + right[1]);
  assert(right[1].indexOf('ㄹ래요') >= 0 || /래요$/.test(right[1]),
    'and the invitation is -(으)ㄹ래요 rather than anything else');
});
// The 으 goes in after a consonant and nowhere else, and item 3 is the only
// consonant stem on the page — so it is the only row whose answers carry one.
const stem1 = (it) => (it.choices.find(c => c.id === it.answer) || {}).ko;
assert(stem1(w1.items[2]) === '먹으려고'
  && (w1.items[2].choices2.find(c => c.id === w1.items[2].answer2) || {}).ko === '먹을래요',
  'item 3 is the consonant stem, so both its endings take the 으');
assert([0, 1, 3, 4].every(i => stem1(w1.items[i]).indexOf('으려고') < 0),
  'and no vowel stem takes one');
assert(w1.items[2].choices.some(c => c.ko === '먹려고'),
  'item 3 is put against the form with the 으 left out');
assert([0, 3].every(i => w1.items[i].choices.some(c => /러$/.test(c.ko))),
  '-(으)러 is offered against -(으)려고, which is the confusion worth having');
// Every row puts -(으)ㄹ래요 against -(으)ㄹ게요: 래 asks you, 게 promises I.
w1.items.forEach((it) => {
  const wrong2 = it.choices2.filter(c => c.id !== it.answer2).map(c => c.ko);
  assert(wrong2.some(k => /게요$/.test(k)),
    '연습 1 item ' + it.n + ' offers the -(으)ㄹ게요 that promises instead of asking');
  assert(wrong2.some(k => /레요$/.test(k)), 'and the 래/레 spelling it is always losing');
});
assert(/게/.test(w1.items[0].grammar) || /게/.test(w1.items[1].grammar)
  || /게/.test(w1.items[3].grammar) || /게/.test(w2.items[1].grammar),
  'and somewhere on the two pages the 래 / 게 difference is spelled out');
assert(/할래요/.test(wbFill(w1, w1.items[3])) && /산책할래요/.test(wbFill(w1, w1.items[3])) === false,
  'item 4 shortens to 할래요 on the second mention rather than repeating 산책');

// 연습 2 — two pictures, and all of it 반말.
const KEY_W2 = [
  '집에 갈 때 택시 타고 갈래? 길이 막히니까 지하철을 타자.',
  '선물 사러 백화점에 갈래? 백화점은 비싸니까 시장에 가자.',
  '이번 주말에 등산할래? 등산은 힘드니까 바다에 가자.',
  '커피 마실래? 커피는 아까 마셨으니까 아이스크림 먹자.'
];
const PAIRS_W2 = ['택시 / 지하철', '백화점 / 시장', '산 / 바다', '커피 / 아이스크림'];
assert(w2.items.length === 4, 'four rows — the book’s fifth is two question marks');
assert(/fifth/.test(w2.noteEn) && /question marks/.test(w2.noteEn)
  && /invent/i.test(w2.noteEn),
  'and the page says why the fifth is not here');
assert(wbFill(w2, w2.example) === '점심에 갈비탕 먹을래? 날씨가 더우니까 냉면 먹자.',
  'the [보기] is the 갈비탕 / 냉면 one');
assert(w2.example.phraseKo === '갈비탕 / 냉면', 'labelled the way the book labels its pictures');
w2.items.forEach((it, i) => {
  const at = '연습 2 item ' + (i + 1);
  assert(it.phraseKo === PAIRS_W2[i], at + ' carries the book’s two labels: ' + PAIRS_W2[i]);
  assert(wbFill(w2, it) === KEY_W2[i], at + ' comes out as the key has it');
  assert(it.lines[0].who === 'A' && it.lines[1].who === 'B',
    at + ': A offers and B counters, one blank each');
  assert(it.lines.every(l => l.ko.split('{}').length - 1 === 1),
    at + ': the two blanks are in different lines, so the button groups are tagged A and B');
  // The reason is printed, not asked. That is the part the book gives you.
  assert(/니까/.test(it.lines[1].ko), at + ': B’s reason clause is printed with -(으)니까 in it');
});
w2.items.forEach((it) => {
  const at = '연습 2 item ' + it.n;
  const right1 = (it.choices.find(c => c.id === it.answer) || {}).ko;
  const right2 = (it.choices2.find(c => c.id === it.answer2) || {}).ko;
  assert(!polite(right1) && /래$/.test(right1), at + ': A asks in 반말 — ' + right1);
  assert(!polite(right2) && /자$/.test(right2), at + ': and B answers with -자 — ' + right2);
  assert(it.choices.some(c => c.ko === right1 + '요'),
    at + ': the 요 form is offered against it, since that is the slip this page is about');
  assert(it.choices2.filter(c => c.id !== it.answer2).some(c => polite(c.ko)),
    at + ': and the 해요체 suggestion is offered against -자');
});
assert(/힘드니까/.test(w2.items[2].grammar) && /ㄹ/.test(w2.items[2].grammar),
  'item 3 explains 힘들다 → 힘드니까, the ㄹ dropping in front of ㄴ');
assert(w2.items[3].choices2.some(c => c.ko === '아이스크림 먹으자')
  && /으/.test(w2.items[3].grammar),
  'item 4 puts -자 against 먹으자, and says -자 never takes the 으');
assert(/아서|어서/.test(w2.noteEn),
  'and the page says why the reason is -(으)니까 and not -아/어서');
willing.forEach((e) => {
  e.items.forEach((it) => {
    assert(it.why && it.why.length > 40, e.no + ' item ' + it.n + ' explains the exchange');
    assert(it.grammar && it.grammar.length > 30, 'and names the rule behind the forms');
    assert(it.en, 'and glosses it');
  });
});

// ── 7b. The V-(으)ㄹ래요 pages run ───────────────────────────────────────────
console.log('\n--- 7b. Asking and counter-offering ---');
{
  const one = loadUi();
  one.open('u10-grammar-3-1');
  assert(one.els['wb-count'].textContent === '0 / 10', 'ten blanks: five rows of two');
  const tags1 = one.els['wb-items'].children[0].children[1].children[2].children
    .filter(c => c.className === 'wb-picks-tag');
  assert(tags1.map(c => c.textContent).join(' ') === 'A1 A2',
    'both groups are A’s, so the tag says which blank each fills');
  w1.items.forEach((it, i) => {
    one.run('wbPickChoice(' + i + ", '" + it.answer + "')");
    one.run('wbPickChoice(' + i + ", '" + it.answer2 + "', 2)");
  });
  assert(one.run('wbComplete()') === true, 'both halves of every row finish the page');
  one.run('checkWorkbook()');
  assert(one.run('workbookState.score') === 10, 'the textbook key scores 10 of 10');
  const r3 = deepHtml(one.els['wb-items'].children[2]);
  assert(r3.indexOf('점심 먹다') >= 0 && r3.indexOf('먹으려고') >= 0
    && r3.indexOf('먹을래요') >= 0 && r3.indexOf('전 조금 전에 친구랑 먹었어요.') >= 0,
    'the consonant-stem row reads as the book’s dialogue, 으 and all');

  const two = loadUi();
  two.open('u10-grammar-3-2');
  assert(two.els['wb-count'].textContent === '0 / 8', 'eight blanks: four rows of two');
  const tags2 = two.els['wb-items'].children[0].children[1].children[2].children
    .filter(c => c.className === 'wb-picks-tag');
  assert(tags2.map(c => c.textContent).join(' ') === 'A B',
    'here the blanks are in different lines, so the speakers name the groups');
  assert(tags2.every(c => !c.getAttribute('data-name')),
    'and one-letter speakers keep the pixel font');
  w2.items.forEach((it, i) => {
    two.run('wbPickChoice(' + i + ", '" + it.answer + "')");
    two.run('wbPickChoice(' + i + ", '" + it.answer2 + "', 2)");
  });
  two.run('checkWorkbook()');
  assert(two.run('workbookState.score') === 8, 'the textbook key scores 8 of 8');
  const r1 = deepHtml(two.els['wb-items'].children[0]);
  assert(r1.indexOf('택시 / 지하철') >= 0 && r1.indexOf('택시 타고 갈래') >= 0
    && r1.indexOf('길이 막히니까') >= 0 && r1.indexOf('지하철을 타자') >= 0,
    'and a row shows the labels, the offer and the counter-offer');

  // Half a row is not the answer to it, here as everywhere.
  const half = loadUi();
  half.open('u10-grammar-3-2');
  w2.items.forEach((it, i) => {
    half.run('wbPickChoice(' + i + ", '" + it.answer + "')");
    const bad = it.choices2.find(c => c.id !== it.answer2);
    half.run('wbPickChoice(' + i + ", '" + bad.id + "', 2)");
  });
  half.run('checkWorkbook()');
  assert(half.run('workbookState.score') === 4, 'four right offers with four wrong counters scores 4 of 8');


}

// ── 8. 문법과 표현 4 — A-(으)ㄴ데, V-는데, N인데 2 ─────────────────────────────
console.log('\n--- 8. A-(으)ㄴ데, V-는데, N인데 2 ---');
const contrast = wb.exercises.filter(e => e.pattern === 'A-(으)ㄴ데, V-는데, N인데 2'
  && e.section === '문법과 표현');
const [c1, c2, c3] = contrast;
assert(contrast.length === 3, 'all three 연습 off the -는데 page are here');
assert(contrast.every(e => e.section === '문법과 표현'), 'filed under 문법과 표현');
assert(contrast.map(e => e.no).join(' ') === '연습 1 연습 2 연습 3',
  'numbered as the book numbers them');
assert(c1.type === 'build' && c2.type === 'build' && c3.type === 'match',
  '연습 1 and 2 pick a form per row; 연습 3 pairs an opening with an ending');
assert(/2$/.test(c1.pattern),
  'the pattern keeps the book’s 2 — this is the second use of the ending, the'
  + ' contrastive one, and the first was in an earlier unit');

// 연습 1 — two pictures a row, and one sentence across them.
const KEY_C1 = [
  '저는 소고기는 먹는데 돼지고기는 안 먹어요.',
  '저는 부산은 가 봤는데 제주도는 안 가 봤어요.',
  '나나 씨 집은 학교에서 가까운데 켈리 씨 집은 멀어요.',
  '어제는 날씨가 좋았는데 오늘은 비가 오네요.',
  '코미디 영화는 좋아하는데 무서운 영화는 별로 안 좋아해요.',
  '녹차는 자주 마시는데 커피는 자주 안 마셔요.'
];
const PAIRS_C1 = ['소고기 / 돼지고기', '부산 / 제주도', '나나 씨 집 / 켈리 씨 집',
  '어제 / 오늘', '코미디 영화 / 무서운 영화', '녹차 / 커피'];
assert(c1.items.length === 6, '연습 1 has the book’s six rows');
assert(wbFill(c1, c1.example) === '저는 축구는 잘하는데 농구는 못해요.',
  'the [보기] is the football-and-basketball one');
c1.items.forEach((it, i) => {
  const at = '연습 1 item ' + (i + 1);
  assert(it.phraseKo === PAIRS_C1[i], at + ' carries what the two pictures show: ' + PAIRS_C1[i]);
  assert(wbFill(c1, it) === KEY_C1[i], at + ' comes out as ' + KEY_C1[i]);
  assert(!it.lines[0].who && it.lines.length === 1,
    at + ' is one sentence with nobody saying it');
  const joiner = (it.choices.find(c => c.id === it.answer) || {}).ko;
  assert(/데$/.test(joiner), at + ': the joining form ends in 데 — ' + joiner);
});
// The book prints everything but the joining form on 1 to 4, and nothing at all on
// 5 and 6 — so those two are the rows with a second blank.
assert(c1.items.filter(it => it.choices2).map(it => it.n).join() === '5,6',
  'the two rows the book leaves blank end to end are the two with both halves to fill');
// Word class decides the ending, and the tense overrules it.
assert((c1.items[0].choices.find(c => c.id === c1.items[0].answer) || {}).ko === '먹는데'
  && c1.items[0].choices.some(c => c.ko === '먹은데'),
  'a verb takes -는데, and the adjective ending is offered against it');
assert((c1.items[2].choices.find(c => c.id === c1.items[2].answer) || {}).ko === '가까운데'
  && c1.items[2].choices.some(c => c.ko === '가깝은데')
  && /ㅂ/.test(c1.items[2].grammar),
  '가깝다 takes -(으)ㄴ데 through the ㅂ-irregular, and 가깝은데 is offered against it');
[1, 3].forEach((i) => {
  const it = c1.items[i];
  const right = (it.choices.find(c => c.id === it.answer) || {}).ko;
  assert(/는데$/.test(right), '연습 1 item ' + it.n + ': a past tense takes -는데 — ' + right);
  assert(it.choices.some(c => /은데$/.test(c.ko)),
    'and the -(으)ㄴ데 after a past tense is offered as the wrong one');
});
assert(c1.items[3].choices.some(c => c.ko === '좋은데') && /좋은데/.test(c1.items[3].grammar),
  'item 4 offers the present 좋은데 as well, and says why the past wins over the word class');
assert(/별로/.test(c1.items[4].why) && c1.items[4].choices2.some(c => c.ko === '별로 좋아해요'),
  'item 5 offers 별로 without a negative, and says 별로 only ever takes one');
[4, 5].forEach((i) => {
  assert(c1.items[i].choices2.some(c => /^안 /.test(c.ko)),
    '연습 1 item ' + c1.items[i].n + ' offers 안 in front of the adverb, where it cannot go');
});
assert(c1.items[4].choices.some(c => /대$/.test(c.ko)) && /대/.test(c1.items[4].grammar),
  'and -는대 is offered against -는데, with the note saying which is the quotative');

// 연습 2 — 반말 dialogues, and the irregulars are the point.
const KEY_C2 = ['잤는데', '더운데', '잘하는데', '살았는데', '아는데'];
const ASK_C2 = ['나나, 어제 잘 못 잤어?', '요즘 부산 날씨는 어때?',
  '샤오밍, 저 가수 노래 정말 잘하지?', '스티븐, 네 친구 에도도 한국말 잘해?',
  '한자를 쓸 줄 알아?'];
const REPLY_C2 = ['아니, 잘 {} 피곤해.', '낮에는 좀 {} 아침, 저녁은 시원해.',
  '노래는 {} 춤은 잘 못 추는 것 같아.', '아니, 한국에서 오래 {} 잘 못해.',
  '아니, 읽을 줄은 {} 쓸 줄은 몰라.'];
assert(c2.items.length === 5, '연습 2 has the book’s five exchanges');
assert(wbFill(c2, c2.example)
  === '줄리앙, 이번 시험 잘 봤어? 아니, 열심히 공부했는데 생각보다 잘 못 봤어.',
  'the [보기] is the exam one');
c2.items.forEach((it, i) => {
  const at = '연습 2 item ' + (i + 1);
  assert(it.lines[0].ko === ASK_C2[i] && it.lines[0].who === 'A',
    at + ': A asks what the book prints');
  assert(it.lines[1].ko === REPLY_C2[i] && it.lines[1].who === 'B',
    at + ': and B’s line is the book’s, with the gap where the book puts it');
  assert((it.choices.find(c => c.id === it.answer) || {}).ko === KEY_C2[i],
    at + ' answers ' + KEY_C2[i]);
  // 반말 throughout, so nothing on the page keeps a 요.
  it.choices.forEach((c) => {
    assert(!polite(c.ko), at + ': no form on offer carries a 요 — ' + c.ko);
  });
});
assert(c2.items[1].choices.some(c => c.ko === '덥은데') && /ㅂ/.test(c2.items[1].grammar),
  '덥다 → 더운데 is put against 덥은데, and the note names the ㅂ-irregular');
assert(c2.items[4].choices.some(c => c.ko === '알는데') && /ㄹ/.test(c2.items[4].grammar),
  '알다 → 아는데 is put against 알는데, and the note names the ㄹ drop');
assert(/사는데/.test(c2.items[3].grammar),
  'and item 4 says what the present of 살다 would have been, since its past hides it');
[1, 2].forEach((i) => {
  assert(c2.items[i].choices.some(c => /^.*(워|해)는데$/.test(c.ko)),
    '연습 2 item ' + c2.items[i].n + ' offers the 아/어 form with -는데 stuck on it');
});

// 연습 3 — the opening is printed and the ending is the thing that does not follow.
assert(c3.items.length === 4, 'four rows — the book’s fifth is blank from the start');
assert(c3.bank.length === 5 && c3.bank.filter(b => b.usedByExample).length === 1,
  'five endings in the box, one of them spent on the [보기]');
assert(c3.bank.find(b => b.usedByExample).ko === '별로 춥지 않아요'
  && c3.example.stemKo === '겨울인데',
  'and the spent one is the 겨울인데 of the example');
const KEY_C3 = [['시험 기간인데', '공부를 많이 못 했어요'],
  ['약을 먹었는데', '아직도 아파요'],
  ['점심을 많이 먹었는데', '배고파요'],
  ['친구한테 전화를 했는데', '안 받았어요']];
c3.items.forEach((it, i) => {
  const at = '연습 3 item ' + (i + 1);
  assert(it.stemKo === KEY_C3[i][0], at + ' prints the book’s opening: ' + KEY_C3[i][0]);
  assert((c3.bank.find(b => b.id === it.answer) || {}).ko === KEY_C3[i][1],
    at + ' is answered by ' + KEY_C3[i][1]);
  assert(!it.img, at + ' has no picture — the book prints words here, not pictures');
});
assert(c3.items.filter(it => /먹었는데$/.test(it.stemKo)).length === 2
  && /먹었는데/.test(c3.noteEn),
  'two openings are the same 먹었는데, and the page says what tells them apart');
assert(/인데/.test(c3.items[0].grammar) && /기간/.test(c3.items[0].grammar),
  'the 시험 기간인데 row explains -인데, which is the N인데 of the heading');
assert(/ㅡ/.test(c3.items[1].grammar) && /ㅡ/.test(c3.items[2].grammar),
  '아프다 and 배고프다 both get the ㅡ-irregular spelled out');
assert(/(cannot be marked|Writing cannot)/i.test(c3.noteEn) || /marked/.test(c3.noteEn),
  'and the page says why free writing became a pairing');

contrast.forEach((e) => {
  e.items.forEach((it) => {
    assert(it.why && it.why.length > 40, e.no + ' item ' + it.n + ' explains the contrast');
    assert(it.grammar && it.grammar.length > 30, 'and names the rule behind the form');
    assert(it.en, 'and glosses the sentence');
  });
});

// ── 8b. The -는데 pages run ──────────────────────────────────────────────────
console.log('\n--- 8b. Saying the other half ---');
{
  const one = loadUi();
  one.open('u10-grammar-4-1');
  assert(one.els['wb-count'].textContent === '0 / 8',
    'eight blanks: four rows of one and two of two');
  const picks1 = one.els['wb-items'].children[0].children[1].children[2];
  assert(picks1.children.filter(c => c.className === 'wb-picks-tag').length === 0,
    'a one-blank row with no speaker draws no group tag');
  c1.items.forEach((it, i) => {
    one.run('wbPickChoice(' + i + ", '" + it.answer + "')");
    if (it.choices2) one.run('wbPickChoice(' + i + ", '" + it.answer2 + "', 2)");
  });
  assert(one.run('wbComplete()') === true, 'every blank filled finishes the page');
  one.run('checkWorkbook()');
  assert(one.run('workbookState.score') === 8, 'the textbook key scores 8 of 8');
  const r4 = deepHtml(one.els['wb-items'].children[3]);
  assert(r4.indexOf('어제 / 오늘') >= 0 && r4.indexOf('좋았는데') >= 0
    && r4.indexOf('오늘은 비가 오네요.') >= 0,
    'the past-tense row reads as the book’s sentence');

  const two = loadUi();
  two.open('u10-grammar-4-2');
  assert(two.els['wb-count'].textContent === '0 / 5', 'five blanks, one per exchange');
  c2.items.forEach((it, i) => two.run('wbPickChoice(' + i + ", '" + it.answer + "')"));
  two.run('checkWorkbook()');
  assert(two.run('workbookState.score') === 5, 'the textbook key scores 5 of 5');
  const r5 = deepHtml(two.els['wb-items'].children[4]);
  assert(r5.indexOf('한자를 쓸 줄 알아?') >= 0 && r5.indexOf('아는데') >= 0
    && r5.indexOf('쓸 줄은 몰라.') >= 0, 'and the ㄹ-drop row reads as the book’s dialogue');

  // 연습 3 is a text match: the box goes back above the rows, since there are no
  // pictures to put in a second column.
  const three = loadUi();
  three.open('u10-grammar-4-3');
  assert(three.els['wb-items'].className === 'wb-items-match',
    'a match with no pictures is not laid out as paired columns');
  assert(three.els['wb-bank'].children.length === 4,
    'and its box holds the four endings — the fifth is spent on the [보기]');
  assert(three.els['wb-count'].textContent === '0 / 4', 'four rows to pair up');
  const row1 = three.els['wb-items'].children[0].innerHTML;
  assert(row1.indexOf('시험 기간인데') >= 0 && row1.indexOf('wb-join') >= 0,
    'a row prints its opening and the join to the ending');
  c3.items.forEach((it, i) => {
    three.run('workbookState.focus = ' + i);
    three.run("wbPickChip('" + it.answer + "')");
  });
  three.run('checkWorkbook()');
  assert(three.run('workbookState.score') === 4, 'the key’s pairing scores 4 of 4');
  assert(three.els['wb-explain'].innerHTML.indexOf('아직도 아파요') >= 0,
    'and the explanations name the endings');
  // One ending per opening: moving a placed chip relocates it rather than cloning.
  const move = loadUi();
  move.open('u10-grammar-4-3');
  move.run("wbPickChip('baegopayo')");
  move.run('workbookState.focus = 2');
  move.run("wbPickChip('baegopayo')");
  assert(move.run('workbookState.fill[0]') === null
    && move.run('workbookState.fill[2]') === 'baegopayo',
    'an ending dragged to another opening leaves the first one empty');


}

// ── 9. 문형 연습 — the drills off track 2 ────────────────────────────────────
console.log('\n--- 9. 문형 연습 ---');
const drills = wb.exercises.filter(e => e.section === '문형 연습');
assert(drills.length === 4, 'four drills off track 2');
assert(drills.every(e => e.type === 'build'), 'each row carries its own choices');
assert(drills.map(e => e.no).join(' ') === '연습 1 연습 2 연습 3 연습 4',
  'numbered as the book numbers them');
// Each drill practises one of the unit's grammar points, in the order the
// 문법과 표현 pages take them.
assert(drills.map(e => e.pattern).join(' | ')
  === 'N 중에(서) | 반말 | V-(으)ㄹ래요 | A-(으)ㄴ데, V-는데, N인데 2',
  'and each is filed under the point it drills, in the book’s order');
assert(drills.every(e => e.sectionEn === 'Pattern Practice'), 'the section is named in English too');

// The answer key at the back, for all twenty exchanges.
const KEY_D = [
  ['한국 음식 중에서 비빔밥이 제일 맛있어.', '꽃 중에서 장미가 제일 예뻐.',
    '한국 노래 중에서 이 노래가 제일 좋아.', '일주일 중에서 월요일이 제일 바빠.',
    '우리 반 학생 중에서 샤오밍 씨가 제일 멋있어.'],
  ['몇 시에 일어나?', '음악을 자주 들어?', '집이 여기서 멀어?', '지난 주말에 뭐 했어?',
    '이번 방학에 어디에 갈 거야?'],
  ['주말에 도서관에 갈래요?', '이번 방학에 제주도에 갈래요?', '저녁에 학교 앞에서 만날래요?',
    '일요일에 우리 집에 올래요?', '점심에 비빔밥을 먹을래요?'],
  ['축구는 잘하는데 농구는 잘 못해요.', '김치는 좋아하는데 김치찌개는 안 좋아해요.',
    '버스 정류장은 가까운데 지하철역은 멀어요.', '얼굴은 아는데 이름은 몰라요.',
    '아침에는 비가 왔는데 지금은 안 와요.']
];
const TEACHER_D = [
  ['한국 음식, 비빔밥, 맛있다', '꽃, 장미, 예쁘다', '한국 노래, 이 노래, 좋다',
    '일주일, 월요일, 바쁘다', '우리 반 학생, 샤오밍 씨, 멋있다'],
  ['몇 시에 일어나요?', '음악을 자주 들어요?', '집이 여기서 멀어요?', '지난 주말에 뭐 했어요?',
    '이번 방학에 어디에 갈 거예요?'],
  ['주말, 도서관, 가다', '이번 방학, 제주도, 가다', '저녁, 학교 앞, 만나다',
    '일요일, 우리 집, 오다', '점심, 비빔밥, 먹다'],
  ['축구는 잘해요. 농구는 잘 못해요.', '김치는 좋아해요. 김치찌개는 안 좋아해요.',
    '버스 정류장은 가까워요. 지하철역은 멀어요.', '얼굴은 알아요. 이름은 몰라요.',
    '아침에는 비가 왔어요. 지금은 안 와요.']
];
// The [보기] first, then the four items — the order the recording has them in.
const exchangesOf = (e) => [{
  label: e.no + ' 보기', clip: e.example.audio, lines: e.example.lines,
  filled: wbFill(e, e.example)
}].concat(e.items.map(it => ({
  label: e.no + ' item ' + it.n, clip: it.audio, lines: it.lines, filled: wbFill(e, it)
})));
drills.forEach((e, d) => {
  const rows = exchangesOf(e);
  assert(rows.length === 5, e.no + ' has the [보기] and four items');
  rows.forEach((r, k) => {
    const at = e.no + ' ' + (k === 0 ? '보기' : 'item ' + k);
    assert(r.lines[0].who === 'T' && r.lines[1].who === 'S',
      at + ': the teacher reads and the student answers');
    assert(r.lines[0].ko === TEACHER_D[d][k], at + ': the teacher’s cue is ' + TEACHER_D[d][k]);
    assert(r.lines[0].ko.indexOf('{}') < 0, at + ': the teacher’s line has no gap in it');
    assert(r.filled === r.lines[0].ko + ' ' + KEY_D[d][k],
      at + ' answers ' + KEY_D[d][k]);
  });
});
// The particle is the drill in 연습 1 and 연습 3, and which one depends on the word
// or the verb rather than on the position in the list.
const p1 = drills[0], p3 = drills[2];
assert(p1.items.map(it => (it.choices.find(c => c.id === it.answer) || {}).ko).join()
  === '장미가,이 노래가,월요일이,샤오밍 씨가',
  '연습 1 picks 가 after a vowel and 이 after a consonant');
assert(p1.items.every(it => it.choices.some(c => /[을를]$/.test(c.ko))),
  'and offers the object particle against it, which an adjective cannot take');
assert(p3.items.map(it => (it.choices.find(c => c.id === it.answer) || {}).ko).join()
  === '제주도에,학교 앞에서,우리 집에,비빔밥을',
  '연습 3 takes 에 with 가다 and 오다, 에서 with 만나다, 을 with 먹다');
assert(/에서/.test(p3.noteEn) && /만나/.test(p3.noteEn),
  'and the page says the verb is what decides it');
assert(p1.items[0].choices2.some(c => c.ko === '예쁘어')
  && p1.items[2].choices2.some(c => c.ko === '바쁘아'),
  'the two ㅡ-irregulars are put against the form with the ㅡ left in');
// What picks 아 or 어 once the ㅡ has dropped is the vowel of the syllable in
// front, not whether there is one: 예쁘 has 예 in front and still takes 어. These
// two notes said the other thing once, so the rule they give is pinned here.
const euNote = (n) => p1.items.find(i => i.n === n).grammar;
assert(/ㅏ/.test(euNote(1)) && /ㅗ/.test(euNote(1)),
  '예쁘다 → 예뻐 names the two vowels that would have given 아 instead');
assert(euNote(1).indexOf('no syllable') < 0,
  'and does not put it down to 예쁘 having nothing in front of it');
assert(/바 has ㅏ/.test(euNote(3)), '바쁘다 → 바빠 names the ㅏ that decides it');
assert(/no syllable in front/.test(wb.exercises.find(e => e.id === 'u10-vocab-3')
  .items.find(i => i.n === 3).grammar),
  'and 쓰다 → 써 keeps that reason, which is the one word on the page it fits');
drills.forEach((e) => {
  e.items.forEach((it) => {
    assert(it.why && it.why.length > 40, e.no + ' item ' + it.n + ' explains the exchange');
    assert(it.grammar && it.grammar.length > 30, 'and names the rule behind the answer');
    assert(it.en, 'and glosses it');
  });
});

// ── 9b. The cut of track 2 ──────────────────────────────────────────────────
console.log('\n--- 9b. Track 2, cut per exchange ---');
{
  // 64 kbps mono, so bytes divide straight into seconds.
  const secondsOf = (rel) => fs.statSync(path.join(ROOT, rel)).size / 8000;
  const clips = [];
  drills.forEach((e) => {
    exchangesOf(e).forEach((r) => {
      assert(!!(r.clip && r.clip.src), r.label + ' has a clip');
      assert(fs.existsSync(path.join(ROOT, r.clip.src)), r.clip.src + ' is on disk');
      clips.push(r.clip.src);
      const secs = secondsOf(r.clip.src);
      // One exchange with the student's four seconds taken out. Anything much
      // longer means the cut ran into the next item.
      assert(secs > 3 && secs < 13, r.label + ' is one exchange long (' + secs.toFixed(1) + 's)');
      assert(r.clip.askEnd > 0.5 && r.clip.askEnd < secs - 0.5,
        r.label + ' splits inside its own clip');
    });
  });
  assert(new Set(clips).size === 20, 'twenty clips, and no two rows share one');
  assert(clips.every(s => /^audio\/book\/2b-u10-p[1-4]-[0-4]\.mp3$/.test(s)),
    'each is named for its drill and its row');
  // Counts the workbook drill clips rather than the whole directory. The directory
  // total used to stand in for this, which meant the next feature to put a legitimate
  // recording in audio/book — the Unit 11 cassette — failed a Unit 10 assertion about
  // Unit 10's own clips. What is being pinned is that the two workbooks own forty
  // between them and nothing strays into their naming.
  const drill = fs.readdirSync(path.join(ROOT, 'audio', 'book'))
    .filter(f => /^2b-u(10|14)-p/.test(f));
  assert(drill.length === 40,
    'forty workbook clips in audio/book — Unit 14’s twenty and Unit 10’s twenty (found ' + drill.length + ')');
  assert(wb.exercises.every(e => !e.audio),
    'nothing carries a whole-drill recording; the track is cut per exchange');

  // The pairing check. File sizes cannot see a pairing error — a clip holds the
  // right amount of audio, just the wrong lines — but the reading pace can. One
  // narrator at one pace holds a steady syllables-per-second against the text
  // printed beside the clip.
  //
  // Track 2 needs its own thresholds rather than Unit 14's. On two of the four
  // drills the teacher dictates a list of three words with a second of silence
  // between them, so a third of that half of the clip is silence and the rate
  // comes out near 1.8 syl/s instead of 3.2. Which shape a row has is in the
  // text: a dictated list is printed with commas.
  const BREATH = 0.7;
  const syl = (s) => [...String(s).normalize('NFC')].filter(c => c >= '가' && c <= '힣').length;
  const spread = (v) => {
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    return { mean: m, sd: Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length) };
  };
  const answerRates = [];
  const teacherByDrill = [];
  drills.forEach((e, d) => {
    const mine = [];
    exchangesOf(e).forEach((r, k) => {
      const total = secondsOf(r.clip.src);
      const askSecs = r.clip.askEnd - BREATH / 2;
      const ansSecs = total - r.clip.askEnd - BREATH / 2;
      assert(askSecs > 0.5 && ansSecs > 0.5, r.label + ': room for both lines');
      const tRate = syl(TEACHER_D[d][k]) / askSecs;
      const aRate = syl(KEY_D[d][k]) / ansSecs;
      const dictated = r.lines[0].ko.indexOf(', ') >= 0;
      const band = dictated ? [1.2, 2.6] : [2.4, 4.6];
      assert(tRate > band[0] && tRate < band[1],
        r.label + ': the teacher reads at ' + tRate.toFixed(2) + ' syl/s, in the band for '
        + (dictated ? 'a dictated list' : 'a spoken sentence'));
      answerRates.push([r.label, aRate]);
      mine.push(tRate);
    });
    teacherByDrill.push({ no: e.no, ...spread(mine) });
  });
  answerRates.forEach(([what, rate]) => {
    assert(rate > 3.0 && rate < 7.0,
      what + ': the model answer reads at a human pace (' + rate.toFixed(2) + ' syl/s)');
  });
  const a = spread(answerRates.map(r => r[1]));
  assert(answerRates.length === 20, 'twenty model answers measured');
  assert(a.sd < 0.70, 'and they are one narrator at one pace, not two lines swapped'
    + ' (mean ' + a.mean.toFixed(2) + ' ±' + a.sd.toFixed(2) + ' syl/s)');
  // Shifting the pairing by one inside a drill takes this to ±0.96 or worse and
  // pushes lines outside a human range, which is what makes it a check.
  teacherByDrill.forEach((t) => {
    assert(t.sd < 0.35, t.no + ': the teacher’s five lines hold one pace (±'
      + t.sd.toFixed(2) + ' syl/s)');
  });

  // The publish batch derives audio from the workbook, so a new clip needs no
  // edit anywhere — but it does have to actually be in the batch.
  const batch2 = new Set(collectUploadFiles(ROOT).map(f => f.rel));
  clips.forEach((s) => assert(batch2.has(s), s.split('/').pop() + ' is published'));
}

// ── 9c. The drills run ──────────────────────────────────────────────────────
console.log('\n--- 9c. Listening and answering ---');
{
  const totals = { 'u10-pattern-1': 8, 'u10-pattern-2': 4, 'u10-pattern-3': 8, 'u10-pattern-4': 4 };
  drills.forEach((e) => {
    const ui = loadUi();
    ui.open(e.id);
    assert(ui.els['wb-count'].textContent === '0 / ' + totals[e.id],
      e.no + ' counts ' + totals[e.id] + ' blanks');
    e.items.forEach((it, i) => {
      ui.run('wbPickChoice(' + i + ", '" + it.answer + "')");
      if (it.choices2) ui.run('wbPickChoice(' + i + ", '" + it.answer2 + "', 2)");
    });
    assert(ui.run('wbComplete()') === true, e.no + ': every blank filled finishes it');
    ui.run('checkWorkbook()');
    assert(ui.run('workbookState.score') === totals[e.id],
      e.no + ': the textbook key scores ' + totals[e.id] + ' of ' + totals[e.id]);
    // A row with a recording says it is playing the book rather than a voice.
    const head = ui.els['wb-items'].children[0].children[1].children[0];
    const say = head.children.find(c => (c.className || '').indexOf('wb-say') === 0);
    assert(!!say && say.className.indexOf('book') > 0,
      e.no + ': the listen button plays the book’s recording');
    assert(ui.els['wb-example'].children.some(c => (c.className || '').indexOf('wb-say') === 0),
      e.no + ': and the [보기] has one too');
  });
  // The fallback voice, for a row whose clip will not load: the whole exchange
  // with the answer in it, never the placeholder.
  const ui = loadUi();
  ui.open('u10-pattern-3');
  const spoken = ui.run("wbRowSpeech(workbookState.ex, workbookState.ex.items[1])");
  assert(spoken === '저녁, 학교 앞, 만나다 저녁에 학교 앞에서 만날래요?',
    'the fallback voice reads the cue and the finished answer');
  assert(spoken.indexOf('{}') < 0, 'and never the placeholder');

  // The list: twenty rows in three sections now.
  const pick = loadUi();
  pick.open();
  const kids = pick.els['wb-items'].children;
  const groups = kids.filter(c => c.className === 'wb-group').map(c => c.innerHTML);
  assert(groups.length === 3 && /어휘/.test(groups[0]) && /문법과 표현/.test(groups[1])
    && /문형 연습/.test(groups[2]), 'three headings: 어휘, 문법과 표현, 문형 연습');
  const rows = kids.filter(c => (c.className || '').indexOf('wb-pick') === 0);
  assert(pick.els['wb-items'].className === 'wb-items-pick', 'the list draws as the picker');
  assert(rows.length === 20, 'twenty exercises on the list');
  const keys = rows.map((r) => {
    const m = /wb-pick-key">([^<]*)</.exec(r.innerHTML);
    return m ? m[1] : '?';
  });
  assert(keys.slice(0, 10).join('') === '1234567890',
    'the first ten carry the number keys 1-9 and 0');
  assert(keys.slice(10).join('') === '',
    'and the ten past them carry no badge rather than a key that does nothing');
  assert(rows.slice(4).every(r => r.innerHTML.indexOf('wb-pick-pat') >= 0),
    'every row outside 어휘 is headlined by its pattern, drills included');
  // Each grammar point heads the 문법과 표현 pages that teach it and the one drill
  // that practises it, which is what the 문형 연습 section is for.
  [['N 중에(서)', 3], ['>반말<', 6], ['V-(으)ㄹ래요', 3], ['N인데 2', 4]].forEach(([pat, n]) => {
    assert(rows.filter(r => r.innerHTML.indexOf(pat) >= 0).length === n,
      pat.replace(/[<>]/g, '') + ' heads ' + n + ' rows: its pages and its drill');
  });
}
// ── 9d. Every wrong button is answered ────────────────────────────────────
console.log('\n--- 9d. Every wrong button is answered ---');
{
  // The explanation panel is what a learner reads after getting a row wrong, so
  // a distractor the page never mentions leaves them reading about something
  // else. Most single-row distractors are answered by a class rule rather than
  // by name — '장미 ends in a vowel, so the particle is 가' rules out 장미이
  // without ever printing it — and demanding the literal form everywhere would
  // fire on correct content. The real gap is a distractor SHAPE that recurs
  // across most of a page and is never named on it: a systematic teaching point
  // going unmentioned, rather than a form the learner can derive.
  //
  // Unit 10's V-(으)ㄹ래요 page shipped exactly that — -(으)ㄹ게요 and the 래/레
  // misspelling stood as wrong answers on all five rows with nothing said about
  // either, so picking 갈게요 returned a note about 으 insertion instead.
  const KO = /[^가-힣]/g;
  let pages = 0;
  wb.exercises.forEach((ex) => {
    const rows = (ex.items || []).filter(it => it.choices);
    if (rows.length < 3) return;
    pages++;
    const seen = new Map();
    rows.forEach((it) => {
      const sigs = new Set();
      ['choices', 'choices2'].forEach((k) => {
        (it[k] || []).forEach((c) => {
          if (c.id === it.answer || c.id === it.answer2) return;
          const syl = c.ko.replace(KO, '');
          if (syl.length >= 2) sigs.add(syl.slice(-2));
        });
      });
      sigs.forEach(s => seen.set(s, (seen.get(s) || 0) + 1));
    });
    // The whole page counts, not just the row: a rule that holds for every row
    // belongs in noteEn, said once, and the rows then only point at it.
    const said = [ex.noteEn || '']
      .concat(rows.map(it => (it.why || '') + ' ' + (it.grammar || '')))
      .join(' ').replace(KO, '');
    seen.forEach((n, sig) => {
      if (n >= 3 && n >= rows.length / 2) {
        assert(said.indexOf(sig) >= 0,
          ex.id + ': -' + sig + ' is wrong on ' + n + ' of ' + rows.length
          + ' rows, so the page says why');
      }
    });
  });
  assert(pages >= 8, 'the check reaches every page with choices (' + pages + ')');

  // And the three fields the panel prints are all there to print.
  let rowCount = 0;
  wb.exercises.forEach(ex => (ex.items || []).forEach((it) => {
    rowCount++;
    ['en', 'why', 'grammar'].forEach((f) => {
      assert(typeof it[f] === 'string' && it[f].trim().length > 0,
        ex.id + ' item ' + it.n + ' carries ' + f);
    });
    // A note that names none of the row’s own answers is a note about some
    // other row. Only one is required: a two-blank row explains the decision it
    // is about and leaves the routine half to the page, and demanding both would
    // push every note towards boilerplate.
    const tails = [it.answer, it.answer2].filter(Boolean).map((id) => {
      const chosen = [].concat(it.choices || [], it.choices2 || [])
        .find(c => c.id === id);
      return chosen ? chosen.ko.replace(KO, '').slice(-2) : '';
    }).filter(t => t.length >= 1);
    if (tails.length) {
      const note = (it.grammar + ' ' + it.why).replace(KO, '');
      assert(tails.some(t => note.indexOf(t) >= 0),
        ex.id + ' item ' + it.n + ': the note names what the row answers');
    }
  }));
  assert(rowCount === 115, 'across all 115 rows');
}


// ── 10. Wiring ────────────────────────────────────────────────────────────────
console.log('\n--- 10. Wiring ---');
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

const batch = new Set(collectUploadFiles(ROOT).map(f => f.rel));
assert(batch.has('worlds/unit10-workbook.json'), 'Unit 10’s workbook is published');
wb.exercises.forEach(e => e.items.filter(i => i.img).forEach((it) => {
  assert(batch.has(it.img), it.img.split('/').pop() + ' is published');
}));

console.log('\n====================================================');
console.log('RESULT: ' + passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
process.exit(failed ? 1 : 0);
