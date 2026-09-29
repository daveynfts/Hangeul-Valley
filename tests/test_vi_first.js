/**
 * test_vi_first.js — Vietnamese first: the curriculum's prose written in Vietnamese in the
 * admin, its English written after it by Claude in batches (docs/vietnamese-first.md).
 *
 *   1. admin/public/js/viFirst.js restates two rules of js/i18n.js — which fields translate,
 *      and whether one value in them is English prose — and the two must never disagree.
 *   2. The draft model: setVi, the lists (enTodo, enAI), the status each field shows.
 *   3. The game reads a draft: it wins over the catalogue, and stands in for missing English.
 *   4. The validators carry drafts through a save, refuse the ones that translate nothing, and
 *      accept a line that so far has only its Vietnamese.
 *   5. A meaning written in Vietnamese alone — inline or in a page's glossary — survives.
 *   6. scripts/vi_first.js runs a whole batch on a copy of the repo: status, todo, apply
 *      (English written, Vietnamese filed under it, the old entry pruned, marked AI), ai and
 *      reviewed — and the files still pass their own validators afterwards.
 *
 * Run:  node tests/test_vi_first.js
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const VF = require(path.join(ROOT, 'admin', 'public', 'js', 'viFirst.js'));
const rule = require(path.join(ROOT, 'js', 'i18n.js'));
const R = require(path.join(ROOT, 'js', 'richText.js'));
const workbook = require(path.join(ROOT, 'admin', 'lib', 'workbook.js'));
const world = require(path.join(ROOT, 'admin', 'lib', 'world.js'));
const levels = require(path.join(ROOT, 'admin', 'lib', 'levels.js'));

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log(`  [PASS] ${msg}`); passed++; }
  else { console.error(`  [FAIL] ${msg}`); failed++; }
}
function eq(actual, expected, msg) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${msg} (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`);
}
function throws(fn, re, msg) {
  try { fn(); assert(false, msg + ' (did not throw)'); }
  catch (e) { assert(re.test(e.message), msg + (re.test(e.message) ? '' : ' (threw "' + e.message + '")')); }
}
function section(name) { console.log(`\n── ${name}`); }
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const clone = (v) => JSON.parse(JSON.stringify(v));

// ══════════════ 1. One rule, stated twice ════════════════════════════════════
section('viFirst.js and js/i18n.js agree');
eq(VF.TEXT_FIELDS, rule.HV_TEXT_FIELDS, 'the same translatable fields, in the same order');
assert(VF.TEXT_FIELDS.every((f) => VF.viField(f) === rule.hvLangField(f, 'vi')), 'each drafts under the name the game reads');
{
  // Every string every catalogue source holds in a translatable field, judged by both.
  let n = 0;
  const disagree = [];
  rule.HV_CATALOG_SOURCES.forEach((rel) => {
    if (!fs.existsSync(path.join(ROOT, rel))) return;
    (function walk(node) {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) { node.forEach(walk); return; }
      Object.keys(node).forEach((k) => {
        const v = node[k];
        if (v && typeof v === 'object') { walk(v); return; }
        if (typeof v !== 'string' || !VF.isText(k)) return;
        n++;
        if (VF.translatable(v, k) !== rule.hvIsTranslatable(v, k)) disagree.push(rel + ' ' + k + ': ' + v.slice(0, 50));
      });
    }(read(rel)));
  });
  assert(n > 5000 && disagree.length === 0, `hvIsTranslatable and viFirst.translatable agree on all ${n} strings` + (disagree.length ? ' — ' + disagree.slice(0, 3).join(' | ') : ''));
}

// ══════════════ 2. The draft model ═══════════════════════════════════════════
section('a Vietnamese edit is a draft beside the English');
{
  const entries = { 'why|Because it is polite.': 'Vì nó lịch sự.' };
  const it = { why: 'Because it is polite.' };
  eq(VF.status(it, 'why', entries), 'ok', 'filed Vietnamese and current English: nothing to do');
  eq(VF.viOf(it, 'why', entries), 'Vì nó lịch sự.', 'the Vietnamese is read from the catalogue');
  eq(VF.setVi(it, 'why', 'Vì như vậy là lễ phép.', entries), 'draft', 'new words are a draft');
  eq(it.whyVi, 'Vì như vậy là lễ phép.', '…kept under the name the game reads');
  eq(it.enTodo, ['why'], '…and the English is owed');
  eq(VF.status(it, 'why', entries), 'todo', 'the field says so');
  eq(VF.setVi(it, 'why', ' Vì nó lịch sự. ', entries), 'filed', 'typing back what is filed takes the draft away');
  assert(it.whyVi === undefined && it.enTodo === undefined, '…the draft and the request both');
  VF.requestEnglish(it, 'why');
  eq(VF.status(it, 'why', entries), 'todo', 'asking for a new English puts it on the list');
  VF.setVi(it, 'why', 'Vì đó là phép lịch sự.', entries);
  assert(VF.cancelRequest(it, 'why') && VF.status(it, 'why', entries) === 'sync', 'keeping the English leaves a draft waiting to be filed');
  it.enAI = ['why'];
  delete it.whyVi;
  eq(VF.status(it, 'why', entries), 'ai', 'English Claude wrote and nobody read');
  VF.markReviewed(it, 'why');
  eq(VF.status(it, 'why', entries), 'ok', 'marked as read');
  eq(VF.status({ why: 'Not filed yet.' }, 'why', {}), 'untranslated', 'English with no Vietnamese anywhere');
  const blankOnly = {};
  assert(VF.cancelRequest(Object.assign(blankOnly, { en: '', vi: 'con mèo', enTodo: ['en'] }), 'en') === false, 'a line with only Vietnamese cannot give up its English');
}

section('Korean in a translatable field is edited as itself');
{
  const q = { choices: { A: '두 손으로 드리다', B: 'Smoking', C: '', D: 'id_like_this' } };
  eq(VF.isProse(q.choices, 'A'), false, 'a Korean answer is not prose');
  eq(VF.isProse(q.choices, 'B'), true, 'an English answer is');
  eq(VF.isProse(q.choices, 'C'), true, 'an empty one is: its English is what Claude will write');
  eq(VF.isProse(q.choices, 'D'), false, 'an identifier is not');
  eq(VF.status(q.choices, 'A', {}), 'source', 'and its status says it is shown as it is');
  const c = { A: 'Parking', AVi: 'Đỗ xe', enTodo: ['A'], enAI: ['A'] };
  VF.setSource(c, 'A', '주차');
  eq(c, { A: '주차' }, 'typing Korean over it drops the draft and both lists');
}

section('what a file owes');
{
  const body = { exercises: [{ instructionEn: 'Pick one.', instructionEnVi: 'x', items: [{ en: '', vi: 'con mèo', enTodo: ['en'] }, { why: 'W', whyVi: 'Vì', enAI: ['why'] }] }] };
  const p = VF.pending(body);
  eq(p.map((x) => x.path + ':' + x.field + ':' + x.state), ['exercises.0.items.0:en:todo', 'exercises.0.items.1:why:sync'], 'a to-do and a draft, with where each is');
  eq(VF.countAI(body), 1, 'and one AI line unread');
}

// ══════════════ 3. The game reads a draft ════════════════════════════════════
section('the game shows the newest Vietnamese');
{
  rule.hvRegisterCatalog('worlds/test-vi-first.json', { entries: { 'why|Old English.': 'Tiếng Việt cũ' } });
  const data = { items: [{ why: 'Old English.' }, { why: 'Old English.', whyVi: 'Tiếng Việt mới' }] };
  rule.hvLocalize('worlds/test-vi-first.json', data, 'vi');
  eq(data.items[0].whyVi, 'Tiếng Việt cũ', 'a line with no draft gets the catalogue');
  eq(data.items[1].whyVi, 'Tiếng Việt mới', 'a draft wins over the catalogue');
  rule._setLangForTest('en');
  eq(rule.tr({ en: '', vi: 'con mèo' }, 'en'), 'con mèo', 'English mode shows the Vietnamese while the English is owed');
  eq(rule.tr({ en: 'cat', vi: 'con mèo' }, 'en'), 'cat', 'and the English once it exists');
  rule._setLangForTest('vi');
  eq(rule.tr({ en: 'cat', vi: 'con mèo' }, 'en'), 'con mèo', 'Vietnamese mode shows the Vietnamese');
  rule._setLangForTest('en');
}

// ══════════════ 4. The validators ════════════════════════════════════════════
section('a bank save carries drafts and accepts Vietnamese-only lines');
{
  const bank = read('worlds/unit14-workbook.json');
  const ex = bank.exercises.find((e) => e.type === 'fill' && e.items && e.items.length > 1);
  const i = bank.exercises.indexOf(ex);
  const b = clone(bank);
  const it = b.exercises[i].items[0];
  it.whyVi = 'Vì đó là cách lễ phép.';
  it.enTodo = ['why'];
  const it2 = b.exercises[i].items[1];
  it2.en = ''; it2.why = ''; it2.grammar = '';
  it2.vi = 'Nghĩa mới'; it2.whyVi = 'Giải thích mới'; it2.grammarVi = 'Ngữ pháp mới';
  const out = workbook.validateWorkbook(b, 'worlds/unit14-workbook.json');
  const o1 = out.exercises[i].items[0];
  const o2 = out.exercises[i].items[1];
  eq([o1.whyVi, o1.enTodo], ['Vì đó là cách lễ phép.', ['why']], 'a draft over current English is kept, with its request');
  eq(o2.enTodo, ['en', 'why', 'grammar'], 'a line with only Vietnamese owes all three, whatever the save said');
  assert(o2.vi === 'Nghĩa mới' && o2.grammarVi === 'Ngữ pháp mới', '…and keeps its Vietnamese');
  const junk = clone(bank);
  junk.exercises[i].items[0].pickVi = 'x';
  throws(() => workbook.validateWorkbook(junk, 'worlds/unit14-workbook.json'), /pickVi translates pickEn, which this entry does not have/, 'a draft for a field the entry lacks is refused by name');
  const bad = clone(bank);
  bad.exercises[i].items[0].enTodo = ['phraseKo'];
  throws(() => workbook.validateWorkbook(bad, 'worlds/unit14-workbook.json'), /not a translatable field/, 'a to-do naming a field that never translates is refused');
  const unchanged = workbook.validateWorkbook(clone(bank), 'worlds/unit14-workbook.json');
  assert(JSON.stringify(unchanged) === JSON.stringify(bank), 'and a bank with no drafts comes back byte for byte');
}
{
  const bank = read('worlds/unit14-workbook.json');
  const ex = bank.exercises.find((e) => e.section && e.section !== '어휘' && !e.sectionEn) || null;
  if (ex) {
    const b = clone(bank);
    const e = b.exercises[bank.exercises.indexOf(ex)];
    e.sectionVi = 'Mục mới';
    const out = workbook.validateWorkbook(b, 'worlds/unit14-workbook.json');
    const o = out.exercises[bank.exercises.indexOf(ex)];
    assert(o.sectionVi === 'Mục mới' && (o.enTodo || []).indexOf('sectionEn') >= 0, 'a heading with no English takes its Vietnamese and owes the English');
  } else {
    assert(true, 'no heading without English in this bank to try (skipped)');
  }
}

section('a question\'s custom fields are prose like the rest of the row');
{
  eq([VF.fieldOfDraft('noteVi', { noteEn: '' }), VF.fieldOfDraft('noteVi', { note: 'x' }), VF.fieldOfDraft('noteVi', {}), VF.fieldOfDraft('titleVi', { title: '' })],
    ['noteEn', 'note', 'noteEn', 'title'], 'a draft name two fields share goes to the one the object holds');
  const bank = read('worlds/recipe1-questions.json');
  const b = clone(bank);
  const it = b.exercises[0].items[0];
  it.extra = [
    { labelEn: '', labelVi: 'Mẹo nhớ', noteEn: '', noteVi: 'Nhớ: -다가 = đang làm thì…', fmt: { noteEn: { vi: 'Nhớ: <b>-다가</b> = đang làm thì…' } } },
    { labelEn: '', noteEn: '' },
    { id: 'x1', labelEn: 'Trap', noteEn: 'Watch the tense.' }
  ];
  const out = workbook.validateWorkbook(b, 'worlds/recipe1-questions.json').exercises[0].items[0].extra;
  eq(out.length, 2, 'one left empty is dropped, not refused');
  eq([out[0].id, out[0].labelVi, out[0].noteVi, out[0].enTodo], ['x1', 'Mẹo nhớ', 'Nhớ: -다가 = đang làm thì…', ['noteEn', 'labelEn']],
    'one written only in Vietnamese keeps its words and owes both English lines');
  eq(out[0].fmt, { noteEn: { vi: 'Nhớ: <b>-다가</b> = đang làm thì…' } }, 'and its formatting');
  eq(out[1].id, 'x1_', 'ids stay unique');
  const bad = clone(bank);
  bad.exercises[0].items[0].extra = [{ noteEn: 'x', id: 'no spaces allowed' }];
  throws(() => workbook.validateWorkbook(bad, 'worlds/recipe1-questions.json'), /custom field 1: id/, 'a malformed id is refused with its place');
  const many = clone(bank);
  many.exercises[0].items[0].extra = Array.from({ length: 13 }, (_, k) => ({ noteEn: 'n' + k }));
  throws(() => workbook.validateWorkbook(many, 'worlds/recipe1-questions.json'), /at most 12 custom fields/, 'and more than twelve on one question');
}

section('a word list, a quiz and the levels carry drafts too');
{
  const w = read('worlds/2b-unit-10.json');
  const b = clone(w);
  b.level.words.push({ ko: '새단어', en: '', vi: 'từ mới', hint: '💡', category: b.level.words[0].category, categoryEn: b.level.words[0].categoryEn });
  const out = world.validateWorld(b);
  eq(out.level.words[out.level.words.length - 1].enTodo, ['en'], 'a word with only its Vietnamese owes its English');
  const b2 = clone(w);
  const target = b2.level.words.find((x) => x.example && !x.exampleEn) || b2.level.words.find((x) => x.example);
  delete target.exampleEn;
  target.exampleVi = 'Câu ví dụ.';
  const out2 = world.validateWorld(b2);
  const t2 = out2.level.words.find((x) => x.ko === target.ko);
  assert(t2.exampleEn === '' && (t2.enTodo || []).indexOf('exampleEn') >= 0, 'an example translated before its English carries the draft under an empty exampleEn');
  const b3 = clone(w);
  const noEx = b3.level.words.find((x) => !x.example);
  if (noEx) {
    noEx.exampleVi = 'Không có câu ví dụ.';
    throws(() => world.validateWorld(b3), /no example to translate/, 'but not a translation with no example above it');
  }
}
{
  const q = read('worlds/unit14-desk-quiz.json');
  const b = clone(q);
  b.questions[0].qVi = 'Câu hỏi mới?';
  b.questions[0].enTodo = ['q'];
  b.questions[1].choices.A = '';
  b.questions[1].choices.AVi = 'Đỗ xe';
  const out = world.validateQuiz(b);
  eq([out.questions[0].qVi, out.questions[0].enTodo], ['Câu hỏi mới?', ['q']], 'a quiz prompt drafted in Vietnamese');
  eq(out.questions[1].choices.enTodo, ['A'], 'an answer written only in Vietnamese owes its English');
  assert(JSON.stringify(world.validateQuiz(clone(q))) === JSON.stringify(q), 'and an untouched quiz round-trips byte for byte');
}
{
  const lv = read('levels.json');
  const b = clone(lv);
  const list = Array.isArray(b) ? b : b.levels;
  list[0].words[0].vi = 'bố';
  list[0].words[0].enTodo = ['en'];
  list[0].nameVi = 'Đời sống và con người';
  list[0].enTodo = ['nameEn'];
  const out = levels.validateLevels(b);
  assert(out[0].words[0].vi === 'bố' && out[0].nameVi === 'Đời sống và con người', 'a level keeps a word\'s draft and its own name\'s');
  const bad = clone(lv);
  (Array.isArray(bad) ? bad : bad.levels)[0].enTodo = ['title'];
  throws(() => levels.validateLevels(bad), /which this entry does not have/, 'and refuses a request for English the level has no field for');
}

// ══════════════ 5. Meanings in Vietnamese alone ══════════════════════════════
section('a meaning written only in Vietnamese');
{
  const html = '<span class="hv-gl" data-gl-vi="lông mày">눈썹</span>';
  eq(R.sanitize(html), html, 'an inline meaning with only its Vietnamese is kept');
  assert(R.show(html, 'vi').indexOf('data-gl="lông mày"') >= 0, 'and shown in Vietnamese');
  assert(R.show(html).indexOf('data-gl="lông mày"') >= 0, 'and in English mode, standing in for the English');
  eq(R.sanitize('<span class="hv-gl">눈썹</span>'), '눈썹', 'a meaning with no words in any language is no meaning');
  const d = R.cleanDesign({ glossary: [{ ko: '눈썹', vi: 'lông mày' }] }, 'E');
  eq(d.glossary, [{ ko: '눈썹', vi: 'lông mày' }], 'a glossary word explained in Vietnamese alone');
  eq(R.glossEntries(d, 'en'), [{ ko: '눈썹', gloss: 'lông mày' }], 'shows its Vietnamese in English mode');
  throws(() => R.cleanDesign({ glossary: [{ ko: '눈썹' }] }, 'E'), /needs a meaning/, 'and one with no meaning at all is refused');
}

// ══════════════ 6. A whole batch, on a copy of the repo ══════════════════════
section('scripts/vi_first.js — status, todo, apply, ai, reviewed');
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hv-vifirst-'));
  const copy = (rel) => {
    fs.mkdirSync(path.dirname(path.join(tmp, rel)), { recursive: true });
    fs.copyFileSync(path.join(ROOT, rel), path.join(tmp, rel));
  };
  const files = ['worlds/unit14-workbook.json', 'worlds/2b-unit-10.json', 'worlds/unit14-desk-quiz.json'];
  files.forEach((rel) => { copy(rel); copy('locales/vi/' + rel); });
  fs.cpSync(path.join(ROOT, 'js', 'locales'), path.join(tmp, 'js', 'locales'), { recursive: true });
  const run = (...a) => execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'vi_first.js')].concat(a), { env: Object.assign({}, process.env, { HV_ROOT: tmp }), encoding: 'utf8' });
  const tread = (rel) => JSON.parse(fs.readFileSync(path.join(tmp, rel), 'utf8'));
  const twrite = (rel, body) => fs.writeFileSync(path.join(tmp, rel), JSON.stringify(body, null, 2) + '\n');
  try {
    // The author's edits, as the admin would save them.
    const bank = tread('worlds/unit14-workbook.json');
    const cat = tread('locales/vi/worlds/unit14-workbook.json').entries;
    const ex = bank.exercises.findIndex((e) => e.type === 'fill' && e.items && e.items.length);
    const item = bank.exercises[ex].items[0];
    const oldWhy = item.why;
    const oldKey = 'why|' + oldWhy.trim();
    assert(!!cat[oldKey], 'the copy starts with the old English filed');
    VF.setVi(item, 'why', 'Câu giải thích viết lại bằng tiếng Việt.', cat);
    twrite('worlds/unit14-workbook.json', workbook.validateWorkbook(bank, 'worlds/unit14-workbook.json'));

    // A custom field written in Vietnamese on the same question.
    const bank2 = tread('worlds/unit14-workbook.json');
    bank2.exercises[ex].items[0].extra = [{ id: 'x1', labelEn: '', labelVi: 'Mẹo', noteEn: '', noteVi: 'Nhìn vế sau trước.' }];
    twrite('worlds/unit14-workbook.json', workbook.validateWorkbook(bank2, 'worlds/unit14-workbook.json'));

    const w = tread('worlds/2b-unit-10.json');
    const wcat = tread('locales/vi/worlds/2b-unit-10.json').entries;
    const group = w.level.words[0];
    const sameGroup = w.level.words.filter((x) => x.category === group.category && x.categoryEn === group.categoryEn);
    sameGroup.forEach((x) => VF.setVi(x, 'categoryEn', 'Nhóm món ăn mới', wcat));
    twrite('worlds/2b-unit-10.json', world.validateWorld(w));

    const st = run('status');
    assert(/Total: \d+ English to write/.test(st) && !/Total: 0 English/.test(st), 'status counts the English owed');

    const todoFile = path.join(tmp, 'todo.json');
    run('todo', '--out', todoFile);
    const todo = JSON.parse(fs.readFileSync(todoFile, 'utf8'));
    const whyItem = todo.find((t) => t.file === 'worlds/unit14-workbook.json' && t.field === 'why');
    const groupItems = todo.filter((t) => t.file === 'worlds/2b-unit-10.json' && t.field === 'categoryEn');
    assert(whyItem && whyItem.vi === 'Câu giải thích viết lại bằng tiếng Việt.' && whyItem.enBefore === oldWhy, 'the worklist carries the Vietnamese and the English it replaces');
    assert(whyItem && whyItem.ko.length > 0, '…and the Korean the line is about');
    eq(groupItems.length, 1, 'a group name shared by ' + sameGroup.length + ' words is one line to write');
    eq((groupItems[0].also || []).length, sameGroup.length - 1, '…standing for every word that shares it');
    const extraItems = todo.filter((t) => t.file === 'worlds/unit14-workbook.json' && /\.extra\.0$/.test(t.path));
    eq(extraItems.map((t) => t.field).sort(), ['labelEn', 'noteEn'], 'a custom field\'s heading and text are on the worklist');
    assert(extraItems.every((t) => /custom field 1/.test(t.where) && t.ko === whyItem.ko), '…with where it is and the Korean of its question');

    whyItem.en = 'The explanation, rewritten from the Vietnamese.';
    groupItems[0].en = 'New food group';
    extraItems.forEach((t) => { t.en = t.field === 'labelEn' ? 'Tip' : 'Read the second half first.'; });
    fs.writeFileSync(todoFile, JSON.stringify(todo, null, 2));
    const applied = run('apply', todoFile);
    assert(applied.indexOf('English written: ' + (sameGroup.length + 3) + ',') >= 0,
      'apply writes the English at every place it stands (' + applied.trim().split('\n')[0] + ')');
    const x = tread('worlds/unit14-workbook.json').exercises[ex].items[0].extra[0];
    eq([x.labelEn, x.noteEn, x.labelVi, x.noteVi], ['Tip', 'Read the second half first.', undefined, undefined], 'the custom field has its English, its drafts filed');
    const xcat = tread('locales/vi/worlds/unit14-workbook.json').entries;
    eq([xcat['labelEn|Tip'], xcat['noteEn|Read the second half first.']], ['Mẹo', 'Nhìn vế sau trước.'], 'and its Vietnamese is in the catalogue under it');

    const after = tread('worlds/unit14-workbook.json').exercises[ex].items[0];
    eq(after.why, 'The explanation, rewritten from the Vietnamese.', 'the English is in the field');
    assert(after.whyVi === undefined && after.enTodo === undefined, 'the draft and the request are gone');
    eq(after.enAI, ['why'], 'the English is marked as Claude\'s, unread');
    const newCat = tread('locales/vi/worlds/unit14-workbook.json').entries;
    eq(newCat['why|The explanation, rewritten from the Vietnamese.'], 'Câu giải thích viết lại bằng tiếng Việt.', 'the Vietnamese is filed under the new English');
    assert(!(oldKey in newCat) || tread('worlds/unit14-workbook.json').exercises.some((e) => (e.items || []).some((x) => x.why === oldWhy)), 'the entry the old English left behind is pruned');

    const w2 = tread('worlds/2b-unit-10.json');
    const moved = w2.level.words.filter((x) => x.category === group.category);
    assert(moved.every((x) => x.categoryEn === 'New food group' && x.categoryVi === undefined), 'every word in the group has the one English, and no draft');
    eq(tread('locales/vi/worlds/2b-unit-10.json').entries['categoryEn|New food group'], 'Nhóm món ăn mới', 'filed once for all of them');

    // The files are what their own validators accept.
    workbook.validateWorkbook(tread('worlds/unit14-workbook.json'), 'worlds/unit14-workbook.json');
    world.validateWorld(tread('worlds/2b-unit-10.json'));
    assert(true, 'and both files pass their validators afterwards');

    const aiFile = path.join(tmp, 'ai.json');
    run('ai', '--out', aiFile);
    const ai = JSON.parse(fs.readFileSync(aiFile, 'utf8'));
    assert(ai.some((a) => a.field === 'why' && a.vi === 'Câu giải thích viết lại bằng tiếng Việt.'), 'ai lists the English nobody has read, beside its Vietnamese');
    run('reviewed', aiFile);
    eq(tread('worlds/unit14-workbook.json').exercises[ex].items[0].enAI, undefined, 'reviewed marks it read');
    assert(/Total: 0 English to write, 0 drafts to file, 0 AI English unread/.test(run('status')), 'and nothing is left waiting');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
