'use strict';

/**
 * The admin in Vietnamese first (admin/public/js/lang.js, lang.vi.js) and the Vietnamese box
 * every content form shares (viField.js).
 *
 *   - The dictionary: every entry has a translation, keeps its {placeholders} and its inline
 *     tags, and no two keys are the same key once spaces are folded.
 *   - The translator: exact entries, templates whose counts only match numbers (so "Unit {n}"
 *     cannot swallow a whole sentence), {vars} filled in, and English mode left alone.
 *   - Coverage: every piece of interface text in index.html, outside translate="no", has an
 *     entry — the static half of "check the screen, not the report". What JavaScript draws is
 *     checked in the browser (docs/vietnamese-first.md).
 *   - The shared box: Vietnamese in the input, Claude's English beside it and marked
 *     translate="no", the state it is in, and a Korean answer edited as the Korean it is.
 *   - The scripts load in the order they need each other.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PUB = path.resolve(__dirname, '..', 'public');
const read = (rel) => fs.readFileSync(path.join(PUB, rel), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error('Assertion failed: ' + message);
}

// lang.js and viField.js in a window of their own. The document is only as real as the two
// scripts need at load: they read readyState, and lang.js wraps confirm/alert/prompt.
function loadPanel(lang) {
  const store = {};
  if (lang) store.hv_admin_lang = lang;
  const win = {
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
    document: { readyState: 'loading', addEventListener() {}, getElementById: () => null, documentElement: { setAttribute() {} } },
    location: { pathname: '/', reload() {} },
    confirm: (m) => m, alert: (m) => m, prompt: (m) => m
  };
  win.window = win;
  const ctx = vm.createContext(win);
  ['js/lang.vi.js', 'js/lang.js', 'js/viFirst.js', 'js/viField.js'].forEach((f) => vm.runInContext(read(f), ctx, { filename: f }));
  return win;
}

// index.html as a tree: enough of an HTML parser to find the text a reader sees.
const VOID = new Set(['input', 'br', 'img', 'meta', 'link', 'hr', 'source', 'area', 'base', 'col', 'embed', 'param', 'track', 'wbr']);
function parse(html) {
  const src = html.replace(/<!DOCTYPE[^>]*>/i, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '');
  const root = { tag: '#root', attrs: {}, kids: [], start: 0 };
  const stack = [root];
  const re = /<\/?([a-zA-Z0-9-]+)((?:[^>"']|"[^"]*"|'[^']*')*)>|([^<]+)/g;
  let m;
  while ((m = re.exec(src))) {
    const top = stack[stack.length - 1];
    if (m[3] !== undefined) { top.kids.push({ text: m[3] }); continue; }
    const tag = m[1].toLowerCase();
    if (m[0][1] === '/') {
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === tag) { stack[i].inner = src.slice(stack[i].start, m.index); stack.length = i; break; }
      }
      continue;
    }
    const attrs = {};
    m[2].replace(/([a-zA-Z-:]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|[^\s>]+))?/g, (all, k, v, dq, sq) => {
      attrs[k.toLowerCase()] = dq !== undefined ? dq : (sq !== undefined ? sq : (v || ''));
      return all;
    });
    const node = { tag, attrs, kids: [], start: re.lastIndex };
    top.kids.push(node);
    if (!VOID.has(tag) && !/\/\s*$/.test(m[2])) stack.push(node);
  }
  return root;
}
const norm = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, '&');
// Not interface language: the product's name, codes, and words that read the same in Vietnamese.
const SAME = new Set(['Hangeul Valley', 'VI', 'EN', 'JSON', 'TOPIK II', 'Phaser', 'ox', 'oy', 'Game ↗']);

async function runTests() {
  const startTime = Date.now();
  let passed = 0;
  let failed = 0;
  const testDetails = [];
  async function test(name, fn) {
    try { await fn(); passed++; testDetails.push({ name, passed: true }); }
    catch (err) {
      failed++;
      testDetails.push({ name, passed: false, error: err.message });
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
    }
  }

  const vi = loadPanel();
  const dict = vi.HV_ADMIN_VI;
  const t = vi.AdminLang.t;
  const known = (s) => { const k = norm(s); return Object.prototype.hasOwnProperty.call(dict, k) || t(k) !== k; };

  await test('every entry has a translation, with its placeholders and tags', async () => {
    const keys = Object.keys(dict);
    assert(keys.length > 600, 'the dictionary is filled in: ' + keys.length + ' entries');
    const tags = (s) => (s.match(/<\/?[a-z]+/gi) || []).map((x) => x.toLowerCase()).sort().join(',');
    const vars = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');
    const bad = keys.filter((k) => typeof dict[k] !== 'string' || !dict[k].trim() || vars(k) !== vars(dict[k]) || tags(k) !== tags(dict[k]));
    assert(!bad.length, 'entries that lose a placeholder or a tag: ' + bad.slice(0, 5).join(' | '));
    const folded = new Map();
    keys.forEach((k) => {
      const n = norm(k);
      assert(!folded.has(n), '"' + k + '" and "' + folded.get(n) + '" are the same key');
      folded.set(n, k);
    });
  });

  await test('the translator: entries, templates, counts that only match numbers, English mode', async () => {
    assert(t('Save') === 'Lưu', 'an entry: ' + t('Save'));
    assert(t('Unit 10') === 'Bài 10', 'a template: ' + t('Unit 10'));
    assert(t('Showing 1-50 of 1500 entries') === 'Đang hiện 1-50 trong 1500 mục', 'three counts: ' + t('Showing 1-50 of 1500 entries'));
    assert(t('Exact: 1,500') === 'Khớp: 1,500', 'a count with a thousands comma: ' + t('Exact: 1,500'));
    assert(t('Unit 10 has twelve lessons') === 'Unit 10 has twelve lessons',
      '"Unit {n}" does not read a sentence as a unit number: ' + t('Unit 10 has twelve lessons'));
    assert(t('Unit 10 quiz saved (5 questions)') === 'Đã lưu quiz Unit 10 (5 câu hỏi)',
      'while the template that is that sentence still matches it: ' + t('Unit 10 quiz saved (5 questions)'));
    assert(t('{unit} quiz saved ({n} questions)', { unit: 'TOPIK II', n: 3 }) === 'Đã lưu quiz TOPIK II (3 câu hỏi)', 'vars filled into the entry');
    assert(t('Nothing like this is in the dictionary') === 'Nothing like this is in the dictionary', 'no entry, no change');
    assert(vi.confirm('There are unsaved changes. Switch anyway?') === 'Còn thay đổi chưa lưu. Vẫn chuyển?', 'the browser dialogs are translated too');
    const en = loadPanel('en');
    assert(en.AdminLang.lang === 'en' && en.AdminLang.t('Save') === 'Save', 'English mode is the panel untranslated');
    assert(en.AdminLang.t('{n} Q', { n: 4 }) === '4 Q', 'and still fills in its values');
  });

  await test('every piece of interface text in index.html has its Vietnamese', async () => {
    const tree = parse(read('index.html'));
    const missing = new Set();
    (function walk(node, off) {
      if (node.attrs && node.attrs.translate === 'no') return;
      if (off) return;
      // A sentence with inline markup is one entry, keyed as the browser serialises it —
      // entities in its text stay entities (&lt;unit&gt;), which is what the source has.
      if (node.inner !== undefined && /</.test(node.inner) && known(norm(node.inner))) return;
      ['title', 'placeholder', 'aria-label'].forEach((a) => {
        const v = node.attrs && node.attrs[a];
        if (v && /[A-Za-z]{2}/.test(v) && !SAME.has(norm(v)) && !known(decode(v))) missing.add(a + ': ' + norm(v));
      });
      (node.kids || []).forEach((k) => {
        if (k.text !== undefined) {
          const s = norm(decode(k.text));
          if (/[A-Za-z]{2}/.test(s) && !SAME.has(s) && !known(s)) missing.add(s);
          return;
        }
        walk(k, false);
      });
    }(tree, false));
    assert(missing.size === 0, missing.size + ' string(s) with no Vietnamese: ' + Array.from(missing).slice(0, 12).join(' | '));
  });

  await test('the shared Vietnamese box: its value, Claude\'s English, its state', async () => {
    const F = vi.HVViField;
    const entries = { 'why|Because it is polite.': 'Vì nó lịch sự.' };
    const html = F.html({ why: 'Because it is polite.' }, 'why', { ref: 'i0', label: 'Why this is the answer (VI)', entries, multiline: true });
    assert(/<textarea[^>]*data-vf-in[^>]*>Vì nó lịch sự\.<\/textarea>/.test(html), 'the Vietnamese is in the box: ' + html.slice(0, 200));
    assert(/<span class="vf-en-t" translate="no">Because it is polite\.<\/span>/.test(html), 'the English beside it, never translated');
    assert(/data-vf-state="ok"/.test(html) && /vf-state-ok/.test(html), 'and it is up to date');
    const owed = F.html({ why: 'Because it is polite.', whyVi: 'Vì như vậy là lễ phép.', enTodo: ['why'] }, 'why', { ref: 'i0', label: 'x', entries });
    assert(/data-vf-state="todo"/.test(owed) && /Vì như vậy là lễ phép\./.test(owed), 'a draft shows as waiting for Claude');
    assert(/Chờ Claude viết tiếng Anh/.test(owed), '…in Vietnamese');
    const ko = F.html({ A: '두 손으로 드리다' }, 'A', { ref: 'c', label: 'A', entries: {}, korean: true });
    assert(/data-vf-src/.test(ko) && !/data-vf-in/.test(ko) && /두 손으로 드리다/.test(ko), 'a Korean answer is typed as itself');
    assert(/data-vf-mode="vi"/.test(ko), '…with the switch to write it in Vietnamese instead');
    const compact = F.html({ en: 'kimchi stew' }, 'en', { ref: 'w0', compact: true, entries: { 'en|kimchi stew': 'canh kimchi' } });
    assert(/vf-compact/.test(compact) && !/<label>/.test(compact) && /canh kimchi/.test(compact), 'the table cell form has no label');
    assert(F.owed({ items: [{ en: '', vi: 'x', enTodo: ['en'] }], design: { blocks: [{ enTodo: ['html'] }] } }) === 2, 'owed counts drafts and design blocks');
  });

  await test('the scripts load in the order they need each other', async () => {
    const html = read('index.html');
    const at = (f) => html.indexOf('src="js/' + f + '"');
    ['lang.vi.js', 'lang.js', 'viFirst.js', 'viField.js'].forEach((f) => assert(at(f) > 0, f + ' is loaded'));
    assert(at('lang.vi.js') < at('lang.js'), 'the dictionary before the translator');
    assert(at('viFirst.js') < at('viField.js'), 'the model before the box');
    ['auth.js', 'app.js', 'workbook.js', 'world.js', 'levels.js', 'designer.js'].forEach((f) => assert(at('viField.js') < at(f), 'the box before ' + f));
    assert(/id="admin-lang"[^>]*translate="no"/.test(html), 'the language switch itself is never translated');
  });

  return { total: passed + failed, passed, failed, duration: Date.now() - startTime, details: testDetails };
}

module.exports = { runTests };

if (require.main === module) {
  runTests().then((r) => {
    r.details.filter((d) => !d.passed).forEach((d) => console.error('FAIL ' + d.name + ': ' + d.error));
    console.log(`${r.passed}/${r.total} passed`);
    process.exit(r.failed ? 1 : 0);
  });
}
