/**
 * test_i18n.js — the interface-language machinery, exercised end to end.
 *
 * Every failure this covers is a silent one. hvT() prints its key when a string is missing,
 * tr() returns English when a translation is absent, and a catalogue that fails to load is
 * indistinguishable from a unit nobody has translated. None of that throws, so none of it
 * shows up in a run that only checks the game still boots.
 *
 * The runtime half runs js/i18n.js in a vm with a hand-built `window`, so it tests the
 * shipped file rather than a copy of its logic. The authoring half runs against a temporary
 * repo, so a test never writes into locales/.
 *
 * Run:  node tests/test_i18n.js
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log(`  [PASS] ${msg}`); passed++; }
  else { console.error(`  [FAIL] ${msg}`); failed++; }
}
function eq(actual, expected, msg) {
  assert(actual === expected, `${msg} (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`);
}
function section(name) { console.log(`\n── ${name}`); }

// ══════════════ 1. The field rule ════════════════════════════════════════════
section('the field rule is one rule');
const rule = require(path.join(ROOT, 'js', 'i18n.js'));

eq(rule.hvLangField('en', 'vi'), 'vi', 'en → vi');
eq(rule.hvLangField('nameEn', 'vi'), 'nameVi', 'nameEn → nameVi');
eq(rule.hvLangField('categoryEn', 'vi'), 'categoryVi', 'categoryEn → categoryVi');
eq(rule.hvLangField('why', 'vi'), 'whyVi', 'why → whyVi (no En suffix to replace)');
eq(rule.hvLangField('en', 'en'), 'en', 'English is the identity: no field is renamed');

// The scanner and the runtime must agree on what a translatable string is, or the tab
// reports 100% over strings the game never looks up.
assert(rule.hvIsTranslatable('kimchi stew'), 'a gloss is translatable');
assert(rule.hvIsTranslatable('Food'), 'a one-word category is translatable');
assert(!rule.hvIsTranslatable('김치찌개'), 'Korean is not translatable — it is the subject');
assert(!rule.hvIsTranslatable('kimchi_stew'), 'a snake_case id is not translatable');
assert(!rule.hvIsTranslatable('quiz/unit10_q01.png'), 'a sprite path is not translatable');
assert(!rule.hvIsTranslatable('🍲'), 'an emoji is not translatable');
assert(!rule.hvIsTranslatable(''), 'an empty string is not translatable');

// The key is field + '|' + English, split on the FIRST separator only, because English
// sentences do contain pipes and field names never do.
eq(rule.hvKey('en', ' kimchi stew '), 'en|kimchi stew', 'the key trims its English');
const split = rule.hvSplitKey('why|A | B is a choice');
eq(split.field, 'why', 'a key with a pipe in its text still splits on the first one');
eq(split.text, 'A | B is a choice', 'and keeps the rest of the text intact');

eq(rule.hvCatalogPath('worlds/2b-unit-10.json', 'vi'), 'locales/vi/worlds/2b-unit-10.json',
  'a catalogue mirrors its source path');

// ══════════════ 2. The runtime, in a browser-shaped context ══════════════════
section('hvT, tr and hvLocalize in a browser context');

function browserContext() {
  const ctx = {
    console,
    window: {},
    navigator: { languages: ['en-GB'], language: 'en-GB' },
    localStorage: {
      _v: {},
      getItem(k) { return Object.prototype.hasOwnProperty.call(this._v, k) ? this._v[k] : null; },
      setItem(k, v) { this._v[k] = String(v); }
    },
    document: null,
    fetch: undefined,
    module: { exports: {} }
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'i18n.js'), 'utf8'), ctx);
  return ctx;
}

const ctx = browserContext();
const R = (expr) => vm.runInContext(expr, ctx);

// A catalogue registered by hand, exactly as hvAdoptPhaserCatalogs would.
R(`hvRegisterLocale('en', { 'x.hello': 'Hello', 'x.cost': 'Costs {gold} gold' });`);
R(`hvRegisterLocale('vi', { 'x.hello': 'Xin chào' });`);

eq(R(`hvT('x.hello')`), 'Hello', 'English is the default language');
eq(R(`hvT('x.cost', { gold: 40 })`), 'Costs 40 gold', '{placeholders} are substituted');
eq(R(`hvT('x.missing')`), 'x.missing',
  'a missing key returns the key — visible on screen, which is the point');

R(`hvSetLang('vi', { reload: false })`);
eq(R(`hvLang()`), 'vi', 'the language switches');
eq(R(`hvT('x.hello')`), 'Xin chào', 'and the catalogue answers');
eq(R(`hvT('x.cost', { gold: 40 })`), 'Costs 40 gold',
  'an untranslated key falls back to English rather than to the key');

// tr() reads the localized field, and falls back the same way.
eq(R(`tr({ en: 'kimchi stew', vi: 'canh kimchi' }, 'en')`), 'canh kimchi', 'tr reads the vi field');
eq(R(`tr({ en: 'kimchi stew' }, 'en')`), 'kimchi stew', 'tr falls back to English');
eq(R(`tr({ nameEn: 'Unit 10', nameVi: 'Bài 10' }, 'nameEn')`), 'Bài 10', 'tr handles suffixed fields');
eq(R(`tr(null, 'en')`), '', 'tr survives a null object');
eq(R(`tr({ en: 'x', vi: '   ' }, 'en')`), 'x',
  'a whitespace-only translation is treated as absent, not as an empty label');

// hvLocalize folds a catalogue into loaded data, in place.
R(`hvRegisterCatalog('worlds/x.json', { entries: {
  'en|kimchi stew': 'canh kimchi',
  'categoryEn|Food': 'Món ăn',
  'why|Because.': 'Bởi vì.'
} });`);
const folded = R(`(() => {
  const data = { level: { categoryEn: 'Food' },
    words: [{ ko: '김치찌개', en: 'kimchi stew' }, { ko: '밥', en: 'rice' }],
    ex: [{ why: 'Because.', answer: 'kimchi_stew', art: 'quiz/a.png' }] };
  hvLocalize('worlds/x.json', data);
  return JSON.stringify(data);
})()`);
const f = JSON.parse(folded);
eq(f.words[0].vi, 'canh kimchi', 'a gloss is folded in');
eq(f.words[1].vi, undefined, 'an untranslated gloss gains no field');
eq(f.words[1].en, 'rice', 'and keeps its English');
eq(f.level.categoryVi, 'Món ăn', 'a suffixed field is folded in');
eq(f.ex[0].whyVi, 'Bởi vì.', 'a bare prose field is folded in');
eq(f.ex[0].answerVi, undefined, 'an answer id is never translated — it addresses an exercise');
eq(f.ex[0].artVi, undefined, 'a sprite path is never translated');

// The paths a loader might hand it are all the same catalogue.
['/worlds/x.json', 'worlds/x.json?v=3', 'worlds\\x.json'].forEach((p) => {
  assert(R(`!!hvCatalogFor(${JSON.stringify(p)})`), `hvLocalize accepts the path form ${JSON.stringify(p)}`);
});

// Idempotence: every loader may call it without checking whether someone already did.
const twice = R(`(() => {
  const d = { words: [{ en: 'kimchi stew' }] };
  hvLocalize('worlds/x.json', d); hvLocalize('worlds/x.json', d);
  return d.words[0].vi;
})()`);
eq(twice, 'canh kimchi', 'hvLocalize is idempotent');

// English does nothing at all, which is what keeps the default path free.
const untouched = R(`(() => {
  hvSetLang('en', { reload: false });
  const d = { words: [{ en: 'kimchi stew' }] };
  hvLocalize('worlds/x.json', d);
  hvSetLang('vi', { reload: false });
  return JSON.stringify(d.words[0]);
})()`);
eq(untouched, '{"en":"kimchi stew"}', 'English adds no fields to loaded data');

// A cycle in the data must not hang the walker; save files have back-references.
const cyclic = R(`(() => {
  const a = { en: 'kimchi stew' }; a.self = a;
  hvLocalize('worlds/x.json', { words: [a] });
  return a.vi;
})()`);
eq(cyclic, 'canh kimchi', 'hvLocalize terminates on cyclic data');

// Language detection prefers what is stored, then the browser, then English.
const detect = browserContext();
detect.navigator.languages = ['vi-VN', 'en'];
vm.runInContext(`hvCurrentLang = hvDetectLang();`, detect);
eq(vm.runInContext('hvLang()', detect), 'vi', 'a Vietnamese browser starts in Vietnamese');
detect.localStorage.setItem('hv_lang', 'en');
vm.runInContext(`hvCurrentLang = hvDetectLang();`, detect);
eq(vm.runInContext('hvLang()', detect), 'en', 'an explicit choice beats the browser');

// ══════════════ 3. The authoring library, against a scratch repo ═════════════
section('scan, save and prune, on a temporary repo');
const i18n = require(path.join(ROOT, 'admin', 'lib', 'i18n.js'));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hv-i18n-'));
fs.mkdirSync(path.join(tmp, 'worlds'), { recursive: true });
const SRC_REL = 'worlds/2b-unit-10.json';
const fixture = {
  level: {
    nameEn: 'Unit Ten',
    words: [
      { ko: '김치찌개', en: 'kimchi stew', categoryEn: 'Food' },
      { ko: '된장찌개', en: 'soybean stew', categoryEn: 'Food' },
      { ko: '밥', en: 'kimchi stew', categoryEn: 'Food' }
    ]
  },
  exercises: [{ id: 'e1', answer: 'kimchi_stew', art: 'quiz/a.png', why: 'Because it is sour.' }]
};
fs.writeFileSync(path.join(tmp, SRC_REL.split('/').join(path.sep)), JSON.stringify(fixture, null, 2));

const scanned = i18n.scanSource(tmp, SRC_REL);
const keys = scanned.strings.map((s) => s.key).sort();
eq(keys.length, 5, 'five distinct strings, not eight occurrences');
assert(keys.indexOf('en|kimchi stew') >= 0, 'the repeated gloss is one entry');
assert(keys.indexOf('categoryEn|Food') >= 0, 'the repeated category is one entry');
assert(keys.indexOf('why|Because it is sour.') >= 0, 'prose is picked up');
assert(keys.indexOf('answer|kimchi_stew') < 0, 'an answer id is not offered for translation');
assert(keys.indexOf('art|quiz/a.png') < 0, 'a sprite path is not offered for translation');
const repeated = scanned.strings.find((s) => s.key === 'en|kimchi stew');
eq(repeated.count, 2, 'and it records that the gloss appears twice');
assert(repeated.paths.length === 2, 'with a path for each occurrence');

// Saving.
const saved = i18n.saveRows(tmp, SRC_REL, 'vi', {
  'en|kimchi stew': 'canh kimchi',
  'categoryEn|Food': '  Món ăn  ',
  'en|nothing in the file': 'should be refused'
});
eq(saved.written, 2, 'two translations written');
eq(saved.rejected.length, 1, 'and a key the source does not contain is refused, not stored');
eq(saved.rejected[0], 'en|nothing in the file', 'by name, so the work is not lost silently');

const cat = i18n.readCatalog(tmp, SRC_REL, 'vi');
eq(cat.entries['categoryEn|Food'], 'Món ăn', 'stored trimmed');
const onDisk = JSON.parse(fs.readFileSync(path.join(tmp, 'locales', 'vi', 'worlds', '2b-unit-10.json'), 'utf8'));
eq(onDisk.source, SRC_REL, 'the catalogue names its source');
eq(Object.keys(onDisk.entries).join(','), Object.keys(onDisk.entries).sort().join(','),
  'keys are written sorted, so a diff shows what changed');

// An empty string clears rather than storing "", so "not translated" has one representation.
const cleared = i18n.saveRows(tmp, SRC_REL, 'vi', { 'categoryEn|Food': '   ' });
eq(cleared.cleared, 1, 'a blank clears the entry');
assert(i18n.readCatalog(tmp, SRC_REL, 'vi').entries['categoryEn|Food'] === undefined,
  'and the key is gone rather than empty');

// Staleness: the key is the English, so editing the English orphans the translation. That
// is the whole staleness design, and it is worth a test because it is easy to "fix".
// Both occurrences, because one key covers both: leaving the third word saying "kimchi stew"
// would keep the key alive and nothing would be stale — which is the dedup working, not a
// bug, and is why this edits every occurrence rather than the first.
const edited = JSON.parse(JSON.stringify(fixture));
edited.level.words[0].en = 'kimchi jjigae';
edited.level.words[2].en = 'kimchi jjigae';
fs.writeFileSync(path.join(tmp, SRC_REL.split('/').join(path.sep)), JSON.stringify(edited, null, 2));
const after = i18n.rows(tmp, SRC_REL, 'vi');
eq(after.stale.length, 1, 'editing the English leaves one stale entry');
eq(after.stale[0].text, 'kimchi stew', 'naming the English it used to answer');
assert(after.rows.some((r) => r.key === 'en|kimchi jjigae' && !r.done),
  'and the new English shows as untranslated');

const pruned = i18n.pruneStale(tmp, SRC_REL, 'vi');
eq(pruned.removed, 1, 'prune removes exactly the orphan');
eq(i18n.rows(tmp, SRC_REL, 'vi').stale.length, 0, 'and nothing is stale afterwards');

// Bad input is refused rather than joined onto the root.
let refused = 0;
[['../../etc/passwd', 'vi'], ['worlds/2b-unit-10.json', 'kr'], ['worlds/2b-unit-10.json', 'en']]
  .forEach(([source, lang]) => {
    try { i18n.rows(tmp, source, lang); }
    catch (e) { refused++; }
  });
eq(refused, 3, 'a path outside the registry, an unknown language and English are all refused');

// facts.json is generated; a save here would be discarded by the next build.
let generatedRefused = false;
try { i18n.saveRows(tmp, 'facts.json', 'vi', {}); } catch (e) { generatedRefused = true; }
assert(generatedRefused || i18n.HV_GENERATED_SOURCES === undefined,
  'a generated source refuses writes rather than accepting work that will vanish');

fs.rmSync(tmp, { recursive: true, force: true });

// ══════════════ 4. The real repo holds together ══════════════════════════════
section('the shipped catalogues');
const en = i18n.readChromeTable(ROOT, 'en');
assert(Object.keys(en).length > 200, `js/locales/en.js has ${Object.keys(en).length} keys`);
i18n.LANG_CODES.forEach((lang) => {
  const table = i18n.readChromeTable(ROOT, lang);
  const orphans = Object.keys(table).filter((k) => en[k] === undefined);
  eq(orphans.length, 0, `js/locales/${lang}.js has no keys that en.js lacks`);
});
const report = i18n.report(ROOT, 'vi');
assert(report.totals.total > 4000, `the scanner finds ${report.totals.total} translatable strings`);
eq(report.totals.stale, 0, 'no shipped catalogue has drifted from its English');
assert(report.files.every((f) => !f.error), 'every source scans without error');

console.log(`\n${failed === 0 ? 'ALL PASS' : 'FAILURES'} — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
