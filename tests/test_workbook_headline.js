'use strict';
/**
 * tests/test_workbook_headline.js — a question is read once.
 *
 * A 'build' row prints a headline above the sentence it builds: the dictionary form, the topic,
 * what the picture shows. On the exam pages the headline was the sentence itself — the 합격 레시피
 * and TOPIK paper printed "운동장에서 (   ) 친구와 부딪혀서 넘어졌다." and then, straight under it,
 * "문장 운동장에서 ____ 친구와 부딪혀서 넘어졌다.", and the TOPIK passages their opening sentence
 * twice. The renderer (js/ui.js wbHeadline) now leaves out a headline that only repeats one of the
 * row's own lines, and this suite drives it over every bank on the desk:
 *
 *   1. no drawn row prints a headline its own lines already print, and the rows that lost one
 *      are exactly the repeats — no cue, label or 밑줄 excerpt went with them;
 *   2. a 밑줄 page underlines the part it asks about, which the paper does and the screen did not;
 *   3. a test question (its gloss held back) gets the even grid of options, and a row with nothing
 *      above its sentence opens on it;
 *   4. the admin Designer's preview answers every row the same way the game does.
 *
 * Run: node tests/test_workbook_headline.js
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

// The DOM stub the other workbook suites write into.
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
  // The format layer the game loads, so a headline written in the designer is drawn as written.
  vm.runInContext(read(path.join('js', 'richText.js')), sandbox);
  vm.runInContext(read(path.join('js', 'ui.js')), sandbox);
  return {
    els, real,
    run: (expr) => vm.runInContext(expr, sandbox),
    open: (bank, exId) => {
      real.__bank = bank;
      vm.runInContext('openWorkbook(__bank)', sandbox);
      vm.runInContext("openWorkbookExercise('" + exId + "')", sandbox);
    }
  };
}

// What a drawn row put above its sentence, as text; null when it put no headline there.
const unescape = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>').replace(/&amp;/g, '&');
function drawn(els) {
  return (els['wb-items'].children || []).map((row) => {
    const exp = (row.children || []).find((c) => c.className === 'wb-exp');
    const head = exp && (exp.children || []).find((c) => c.className === 'wb-exp-head');
    const html = String((head && head.innerHTML) || '');
    const m = html.match(/<span class="wb-exp-phrase">([\s\S]*?)<\/span>(?:<span class="wb-exp-en">|$)/);
    const u = m ? m[1].match(/<u class="wb-under">([\s\S]*?)<\/u>/) : null;
    return {
      row,
      head,
      phraseHtml: m ? m[1] : null,
      phrase: m ? unescape(m[1].replace(/<[^>]+>/g, '')) : null,
      under: u ? unescape(u[1]) : null
    };
  });
}
const flat = (s) => String(s || '').replace(/\(\s*\)/g, '{}').replace(/\s+/g, ' ').trim();

console.log('====================================================');
console.log('A QUESTION IS READ ONCE');
console.log('====================================================');

const banks = fs.readdirSync(path.join(ROOT, 'worlds')).filter((f) => f.endsWith('.json'))
  .map((f) => ({ f, bank: readJson(path.join('worlds', f)) }))
  .filter(({ bank }) => Array.isArray(bank.exercises) && bank.exercises.length);
// One renderer for the whole run: every open starts a sitting of its own, and loading js/ui.js
// afresh for each of three hundred pages only made the suite slow.
const ui = loadUi();

// ── 1. Repeats go, everything else stays ─────────────────────────────────────
console.log('\n--- 1. A headline that repeats a line is left out ---');
const repeatsOut = [], kept = [], dropped = new Map();
let rowsSeen = 0;
banks.forEach(({ f, bank }) => {
  // A whole page each time: a drawOne bank would show one of its questions and the rest would
  // go unchecked, so the bank is opened without the draw.
  const whole = Object.assign({}, bank, { drawOne: false });
  bank.exercises.filter((ex) => ex.type === 'build' || ex.type === 'experience').forEach((ex) => {
    ui.open(whole, ex.id);
    drawn(ui.els).forEach((d, i) => {
      const it = ex.items[i];
      rowsSeen++;
      const own = flat(it.phraseKo);
      const repeat = !!own && (it.lines || []).some((l) => flat(l.ko) === own);
      if (d.phrase !== null && repeat) repeatsOut.push(f + ' ' + ex.id + ' ' + it.n);
      if (repeat && d.phrase === null) dropped.set(f, (dropped.get(f) || 0) + 1);
      if (!repeat && own && d.phrase === null) kept.push(f + ' ' + ex.id + ' ' + it.n);
      if (!repeat && own && d.phrase !== null && flat(d.phrase) !== own) kept.push(f + ' ' + ex.id + ' ' + it.n + ' (reworded)');
    });
  });
});
const rowsThere = banks.reduce((n, { bank }) => n + bank.exercises.filter((ex) => ex.type === 'build' || ex.type === 'experience')
  .reduce((k, ex) => k + (ex.items || []).length, 0), 0);
assert(rowsSeen === rowsThere && rowsSeen > 1000, 'every build and experience row on every desk was drawn (' + rowsSeen + ')');
assert(repeatsOut.length === 0, 'no row prints a headline one of its own lines already prints'
  + (repeatsOut.length ? ' — ' + repeatsOut.slice(0, 5).join(', ') : ''));
assert(kept.length === 0, 'and every headline that is not a repeat is still printed, word for word'
  + (kept.length ? ' — lost ' + kept.slice(0, 5).join(', ') : ''));
const count = (f) => dropped.get(f) || 0;
assert(count('recipe1-questions.json') === 22,
  '합격 레시피: the 22 sentences of 읽기 1-2 are printed once, not with their "(   )" above them ('
  + count('recipe1-questions.json') + ')');
assert(count('topik2-questions.json') >= 40,
  'TOPIK: the blank sentences, headlines and passages no longer open on a repeat of their first line ('
  + count('topik2-questions.json') + ')');
assert(count('review4-workbook.json') + count('review5-workbook.json') + count('review6-workbook.json') === 32,
  '복습 4-6: the 32 questions whose headline was the question already on the line ('
  + (count('review4-workbook.json') + count('review5-workbook.json') + count('review6-workbook.json')) + ')');

// The page in the report.
const recipe = readJson(path.join('worlds', 'recipe1-questions.json'));
const topik = readJson(path.join('worlds', 'topik2-questions.json'));
const cls = () => (ui.els['wb-items'].children || []).map((r) => r.className);
ui.open(recipe, 'r1-grammar-conn');
const first = drawn(ui.els)[0];
const connCls = cls();
assert(first.phrase === null && /운동장에서 <span class="wb-blank empty">/.test(first.row.children
  .find((c) => c.className === 'wb-exp').children.find((c) => c.className === 'wb-exp-line').innerHTML),
'p.18 question 1: 운동장에서 ____ 친구와 부딪혀서 넘어졌다. is on the page once, with its gap');
assert(first.head && first.head.innerHTML === '', 'and its head is empty, which css/game.css takes off the row');
const css = read(path.join('css', 'game.css'));
assert(/\.wb-exp-head:empty\s*\{\s*display:\s*none;\s*\}/.test(css), 'css/game.css hides an empty head');
// A headline that names the task is not touched: a dictionary form, a topic, a 밑줄 excerpt.
const u14 = readJson(path.join('worlds', 'unit14-workbook.json'));
const exU14 = u14.exercises.find((e) => e.type === 'build' && e.items.every((it) => it.phraseKo
  && !(it.lines || []).some((l) => flat(l.ko) === flat(it.phraseKo))));
ui.open(u14, exU14.id);
assert(drawn(ui.els).every((d, i) => d.phrase === exU14.items[i].phraseKo),
  'a textbook page keeps its dictionary forms as headlines (' + exU14.id + ')');
const u14Cls = cls();
const r4 = readJson(path.join('worlds', 'review4-workbook.json'));
ui.open(r4, 'r4-check');
assert(drawn(ui.els).every((d, i) => d.phrase === r4.exercises.find((e) => e.id === 'r4-check').items[i].phraseKo),
  'and 복습 4 keeps the part each O/X question is about, which is in its sentence but not the whole of it');

// ── 2. The underlined part ───────────────────────────────────────────────────
console.log('\n--- 2. A 밑줄 page underlines its part ---');
const underOf = (bank, exId) => {
  ui.open(Object.assign({}, bank, { drawOne: false }), exId);
  return drawn(ui.els).map((d) => d.under);
};
const past = underOf(recipe, 'r1-similar-past');
assert(JSON.stringify(past) === JSON.stringify(['타기만 하면', '수리해 봐야']),
  '제60회 3-4: the underline falls on 타기만 하면 and 수리해 봐야, the parts the paper underlines (' + past.join(' / ') + ')');
// The rest are checked against their own two lines: what the headline has where the gap line
// has its gap, and nothing either side of it.
const againstLines = (bank, exId) => {
  const ex = bank.exercises.find((e) => e.id === exId);
  const got = underOf(bank, exId);
  return got.length === ex.items.length && got.every((u, i) => {
    const whole = flat(ex.items[i].phraseKo);
    const [pre, post] = flat(ex.items[i].lines[0].ko).split('{}');
    return !!u && whole.indexOf(pre) === 0 && whole.endsWith(post)
      && whole.slice(pre.length, whole.length - post.length).trim() === u;
  });
};
assert(againstLines(recipe, 'r1-similar-practice'),
  'p.25: all ten underline exactly the words their gap line leaves out');
const syn = underOf(topik, 'topik2-synonym');
assert(syn[0] === '외모로 인하여' && syn[1] === '켜 놓았다' && againstLines(topik, 'topik2-synonym'),
  'TOPIK 3-4: all ' + syn.length + ' are underlined (' + syn.slice(0, 2).join(' / ') + ' …)');
let stray = 0;
banks.forEach(({ bank }) => {
  bank.exercises.filter((ex) => ex.type === 'build' && !/밑줄/.test(ex.instructionKo || '')
    && !(ex.items || []).some((it) => /밑줄/.test(it.instructionKo || ''))).forEach((ex) => {
    ui.open(Object.assign({}, bank, { drawOne: false }), ex.id);
    stray += drawn(ui.els).filter((d) => d.under !== null).length;
  });
});
assert(stray === 0, 'a page that asks about no underline underlines nothing (' + stray + ')');
// The 복습 pages ask about 밑줄 too, but print the underlined words on a 밑줄 line of their own,
// and their headline is an excerpt of the exchange rather than the sentence over a gap line.
let twice = 0, reviewPages = 0;
['review4-workbook.json', 'review5-workbook.json', 'review6-workbook.json'].forEach((f) => {
  const bank = readJson(path.join('worlds', f));
  bank.exercises.filter((ex) => /밑줄/.test(ex.instructionKo || '')).forEach((ex) => {
    reviewPages++;
    ui.open(bank, ex.id);
    twice += drawn(ui.els).filter((d) => d.under !== null).length;
  });
});
assert(reviewPages >= 6 && twice === 0, 'and the 복습 밑줄 pages, whose underline is a line of its own, are not underlined a second time ('
  + reviewPages + ' pages)');
const shaped = JSON.parse(JSON.stringify(recipe));
const fmtRow = shaped.exercises.find((e) => e.id === 'r1-similar-past').items[0];
fmtRow.fmt = { phraseKo: { html: '<b>' + fmtRow.phraseKo + '</b>' } };
ui.open(shaped, 'r1-similar-past');
const fmtDrawn = drawn(ui.els)[0];
assert(fmtDrawn.under === null && /<b>/.test(fmtDrawn.phraseHtml),
  'a headline formatted in the designer is drawn as its author wrote it, not re-underlined');

// ── 3. The shape of a test question ──────────────────────────────────────────
console.log('\n--- 3. A test question looks like one ---');
assert(connCls.length === 10 && connCls.every((c) => /\bwb-q\b/.test(c) && /\bwb-q-bare\b/.test(c) && !/wb-q-(wide|long)/.test(c)),
  'p.18: every row is a bare test question, its four endings side by side');
ui.open(Object.assign({}, topik, { drawOne: false }), 'topik2-headline');
assert(cls().every((c) => /\bwb-q-long\b/.test(c)), 'a TOPIK headline question gives each of its sentence-long options a line');
ui.open(recipe, 'r1-similar-past');
assert(cls().every((c) => /\bwb-q\b/.test(c) && !/wb-q-bare/.test(c)),
  'a 3-4 row keeps its headline above the sentence, so its number stays beside the headline');
assert(u14Cls.length > 0 && u14Cls.every((c) => !/\bwb-q\b/.test(c)), 'a textbook page that shows its translation is not drawn as a test');
['.wb-row.wb-q .wb-exp-picks', '.wb-row.wb-q.wb-q-wide .wb-exp-picks', '.wb-row.wb-q.wb-q-long .wb-exp-picks',
  '.wb-items-build .wb-row.wb-q-bare', '.wb-row.wb-q-bare .wb-exp-line > .wb-dlg:only-child > .wb-spk', '.wb-under']
  .forEach((sel) => assert(css.indexOf(sel) >= 0, 'css/game.css styles ' + sel));
// The explanation card puts the number beside its sentence too.
ui.open(recipe, 'r1-grammar-conn');
const exConn = recipe.exercises.find((e) => e.id === 'r1-grammar-conn');
exConn.items.forEach((it, i) => ui.run("wbPickChoice(" + i + ", '" + it.answer + "')"));
ui.run('checkWorkbook()');
const why = ui.els['wb-explain'].innerHTML;
assert((why.match(/<div class="wb-why-head"><span class="wb-why-n">\d+\)<\/span><div class="wb-why-lines">/g) || []).length === 10,
  'every explanation card sets its number beside the sentence, in a head of its own');

// ── 4. The Designer draws the same page ──────────────────────────────────────
console.log('\n--- 4. The admin preview agrees ---');
const win = {};
const pctx = { window: win, console, setTimeout, clearTimeout, Promise };
vm.createContext(pctx);
vm.runInContext(read(path.join('admin', 'public', 'js', 'designerPreview.js')), pctx);
const P = win.HVDesignerPreview;
assert(P && typeof P.headline === 'function' && typeof P.questionClasses === 'function',
  'admin/public/js/designerPreview.js exposes its headline and question-shape rules');
const disagree = [];
let compared = 0;
banks.forEach(({ f, bank }) => {
  ui.real.__b = bank;
  ui.real.__st = { bank };
  bank.exercises.forEach((ex, e) => (ex.items || []).forEach((it, i) => {
    const at = f + ' ' + ex.id + ' ' + (it.n || i);
    const ref = '__b.exercises[' + e + ']';
    const g = ui.run('wbHeadline(' + ref + ', ' + ref + '.items[' + i + '])');
    const p = P.headline(ex, it);
    compared++;
    if (JSON.stringify(g) !== JSON.stringify(p)) disagree.push(at + ' headline');
    [null, '<svg></svg>'].forEach((art) => {
      ui.real.__art = art;
      const gc = ui.run('wbQuestionClasses(__st, ' + ref + ', ' + ref + '.items[' + i + '], '
        + 'wbHeadline(' + ref + ', ' + ref + '.items[' + i + ']), __art)');
      const pc = P.questionClasses(bank, ex, it, p, art);
      if (gc !== pc) disagree.push(at + ' shape' + (art ? ' with art' : ''));
    });
  }));
});
assert(compared > 1000 && disagree.length === 0,
  'on all ' + compared + ' rows of every bank, the preview and the game agree on the headline and the shape'
  + (disagree.length ? ' — ' + disagree.slice(0, 5).join(', ') + ' (' + disagree.length + ')' : ''));
const pv = read(path.join('admin', 'public', 'js', 'designerPreview.js'));
assert(pv.indexOf("(head ? '<span class=\"wb-exp-phrase\"") >= 0 && pv.indexOf('questionClasses(bank, ex, it, head, art)') >= 0
  && pv.indexOf('<span class="wb-why-n">') >= 0,
'and the preview draws with them: the headline only when there is one, the row\'s shape, the answer card\'s number');

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_workbook_headline: all passed');
