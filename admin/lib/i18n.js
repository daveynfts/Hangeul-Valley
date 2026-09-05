'use strict';

/**
 * The translation side of the admin, in one library.
 *
 * Everything here answers one of three questions:
 *
 *   what is there to translate      scanSource / scanChrome
 *   what has been translated        readCatalog / report
 *   record this translation         saveRows
 *
 * The rule for which fields carry translatable text, and how a Vietnamese field is named,
 * is NOT restated here. It lives in js/i18n.js, which the game also loads, so the scanner
 * and the runtime cannot drift into disagreeing about what a translation is — the failure
 * that would show up as a tab reporting 100% while the game still says "kimchi stew".
 *
 * Two shapes of source, one shape of catalogue:
 *
 *   curriculum   levels.json, worlds/*.json — scanned for HV_TEXT_FIELDS strings, and the
 *                catalogue lands at locales/<lang>/<same path>.
 *   chrome       js/locales/en.js — a flat key→English table, and the catalogue is the
 *                matching js/locales/<lang>.js.
 *
 * Both come back from rows() as the same list of {key, source, target, ...}, so the tab
 * has one table to render and one save route to call.
 */

const fs = require('fs');
const path = require('path');
const { atomicWriteText, atomicWriteJson } = require('./atomicWrite');
const rule = require('../../js/i18n.js');

const {
  HV_LANGS, HV_DEFAULT_LANG, HV_TEXT_FIELDS, HV_GENERATED_SOURCES, HV_CATALOG_SOURCES,
  hvKey, hvSplitKey, hvIsTranslatable
} = rule;

// The chrome catalogue is a JS file rather than JSON because the game has no bundler and
// the level select paints from a <script> tag — the strings have to be in hand before the
// first frame, and a fetch is not. Marker comments delimit the JSON payload so reading it
// back is a slice and a JSON.parse rather than an eval of a file the admin then rewrites.
const CHROME_BEGIN = '/* @hv-locale-begin ';
const CHROME_END = '/* @hv-locale-end */';
const CHROME_REL = (lang) => path.join('js', 'locales', lang + '.js');
const CHROME_KEY = 'chrome';

const LANG_CODES = HV_LANGS.map((l) => l.code).filter((c) => c !== HV_DEFAULT_LANG);

function assertLang(lang) {
  const code = String(lang || '');
  if (!rule.hvIsKnownLang(code) || code === HV_DEFAULT_LANG) {
    const e = new Error(`"${code}" is not a translation language. Known: ${LANG_CODES.join(', ')}`);
    e.status = 400;
    throw e;
  }
  return code;
}

// A source key is what the API addresses a file by: 'chrome', or the repo-relative path of
// a curriculum file. Anything else is refused rather than joined onto the root — a path
// arriving from a browser is not allowed to name a file outside the registry.
function assertSource(key) {
  const k = String(key || '').split('\\').join('/');
  if (k === CHROME_KEY) return k;
  if (HV_CATALOG_SOURCES.indexOf(k) < 0) {
    const e = new Error(`"${k}" is not a translatable source file`);
    e.status = 404;
    throw e;
  }
  return k;
}

// ═══════════════ READING THE SOURCES ═════════════════════════════════════════

/**
 * Every translatable string in a curriculum file, deduplicated.
 *
 * Deduplicated because the catalogue key is the English itself: "kimchi stew" appears in
 * the word list and again in three exercises, and it is one decision for the translator,
 * not four. `paths` keeps every place it occurs so a translator can check that one
 * Vietnamese phrase really does suit all of them.
 */
function scanSource(rootDir, rel) {
  const full = path.join(rootDir, rel.split('/').join(path.sep));
  if (!fs.existsSync(full)) return { rel, strings: [] };
  const data = JSON.parse(fs.readFileSync(full, 'utf8'));
  const byKey = new Map();
  const seen = new Set();
  (function walk(node, trail) {
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) { node.forEach((v, i) => walk(v, trail + '[' + i + ']')); return; }
    Object.keys(node).forEach((field) => {
      const value = node[field];
      const here = trail ? trail + '.' + field : field;
      if (value && typeof value === 'object') { walk(value, here); return; }
      if (typeof value !== 'string') return;
      if (HV_TEXT_FIELDS.indexOf(field) < 0) return;
      if (!hvIsTranslatable(value)) return;
      const key = hvKey(field, value);
      const hit = byKey.get(key);
      if (hit) { hit.count++; if (hit.paths.length < 8) hit.paths.push(here); return; }
      byKey.set(key, { key, field, text: value.trim(), count: 1, paths: [here] });
    });
  }(data, ''));
  // Longest prose first inside each field group: the expensive strings are the ones a
  // translator wants to see when they open a unit, not the tenth one-word gloss.
  const strings = [...byKey.values()].sort((a, b) =>
    (a.field === b.field ? b.text.length - a.text.length : a.field.localeCompare(b.field)));
  return { rel, strings };
}

/** The chrome table: js/locales/en.js is the source of truth for both keys and English. */
function scanChrome(rootDir) {
  const table = readChromeTable(rootDir, HV_DEFAULT_LANG);
  const strings = Object.keys(table).sort().map((key) => ({
    key: hvKey('ui', key),
    field: 'ui',
    id: key,
    text: String(table[key]),
    count: 1,
    paths: [key]
  }));
  return { rel: CHROME_KEY, strings };
}

// ═══════════════ THE CATALOGUES ══════════════════════════════════════════════

function catalogPathFor(rootDir, source, lang) {
  if (source === CHROME_KEY) return path.join(rootDir, CHROME_REL(lang));
  return path.join(rootDir, rule.hvCatalogPath(source, lang).split('/').join(path.sep));
}

function readChromeTable(rootDir, lang) {
  const full = path.join(rootDir, CHROME_REL(lang));
  if (!fs.existsSync(full)) return {};
  const src = fs.readFileSync(full, 'utf8');
  const open = src.indexOf(CHROME_BEGIN);
  if (open < 0) return {};
  const jsonStart = src.indexOf('*/', open);
  const close = src.indexOf(CHROME_END, jsonStart);
  if (jsonStart < 0 || close < 0) {
    throw new Error(`${CHROME_REL(lang)} has an opening marker with no @hv-locale-end`);
  }
  const body = src.slice(jsonStart + 2, close).trim();
  try { return JSON.parse(body); }
  catch (e) { throw new Error(`${CHROME_REL(lang)} payload is not valid JSON: ${e.message}`); }
}

/** entries: catalogue key → translation. Chrome tables are re-keyed so both look alike. */
function readCatalog(rootDir, source, lang) {
  const src = assertSource(source);
  const code = assertLang(lang);
  if (src === CHROME_KEY) {
    const table = readChromeTable(rootDir, code);
    const entries = {};
    Object.keys(table).forEach((k) => { entries[hvKey('ui', k)] = table[k]; });
    return { lang: code, source: src, entries };
  }
  const full = catalogPathFor(rootDir, src, code);
  if (!fs.existsSync(full)) return { lang: code, source: src, entries: {} };
  const body = JSON.parse(fs.readFileSync(full, 'utf8'));
  return { lang: code, source: src, entries: (body && body.entries) || {} };
}

const CHROME_HEADER = (lang, native) => `/**
 * Hangeul Valley — ${native} interface strings.
 *
 * Generated and rewritten by the admin's Translate tab. The payload between the markers is
 * plain JSON; edit it there rather than by hand, so the keys stay in step with js/locales/en.js.
 *
 * A key missing here falls back to English rather than showing blank, so a partial file is a
 * working file — which is what lets this be filled in a screen at a time.
 */
(function (root) {
  root.HV_LOCALES = root.HV_LOCALES || {};
  root.HV_LOCALES[${JSON.stringify(lang)}] =
${CHROME_BEGIN}${lang} */
`;

const CHROME_FOOTER = (quotedLang) => `
${CHROME_END}
  ;
  if (typeof hvRegisterLocale === 'function') {
    hvRegisterLocale(${quotedLang}, root.HV_LOCALES[${quotedLang}]);
  }
}(typeof window !== 'undefined' ? window : globalThis));
`;

function writeChromeTable(rootDir, lang, table) {
  const native = (HV_LANGS.find((l) => l.code === lang) || {}).native || lang;
  const sorted = {};
  Object.keys(table).sort().forEach((k) => {
    const v = table[k];
    if (typeof v === 'string' && v.trim()) sorted[k] = v;
  });
  const text = CHROME_HEADER(lang, native)
    + JSON.stringify(sorted, null, 2)
    + CHROME_FOOTER(JSON.stringify(lang));
  atomicWriteText(path.join(rootDir, CHROME_REL(lang)), text);
  return sorted;
}

// Which catalogues exist, as a script the game loads before Phaser's preload runs.
//
// Without it the runtime has to ask for all twenty-four per language and find out by 404
// which ones are there — fifty failed requests and fifty console errors on every load, with
// any real error buried among them. It cannot be a fetched JSON file because the answer is
// needed synchronously, before the scene preloads; it cannot be hand-kept because a
// translator adding a unit would have to remember to edit it. So it is written here, by the
// only code that ever creates a catalogue.
const INDEX_REL = path.join('js', 'locales', 'catalogs.js');
const INDEX_BEGIN = '/* @hv-catalog-index */';
const INDEX_END = '/* @hv-catalog-index-end */';

function listCatalogs(rootDir) {
  const out = {};
  LANG_CODES.forEach((lang) => {
    const found = HV_CATALOG_SOURCES.filter((rel) => {
      const full = path.join(rootDir, rule.hvCatalogPath(rel, lang).split('/').join(path.sep));
      if (!fs.existsSync(full)) return false;
      try {
        const body = JSON.parse(fs.readFileSync(full, 'utf8'));
        return Object.keys((body && body.entries) || {}).length > 0;
      } catch (e) { return false; }
    });
    if (found.length) out[lang] = found;
  });
  return out;
}

function writeCatalogIndex(rootDir) {
  const index = listCatalogs(rootDir);
  const text = `/**
 * Which translation catalogues exist, per language. Generated — see admin/lib/i18n.js.
 *
 * The game reads this before FarmScene.preload() so it asks only for catalogues that are
 * there. A file listed here but missing on disk is a 404 the loader shrugs off; a file on
 * disk but missing here is simply not loaded, and the unit stays English. Both are why this
 * is written by the code that creates catalogues rather than kept by hand.
 */
(function (root) {
  root.HV_CATALOG_INDEX =
${INDEX_BEGIN}
${JSON.stringify(index, null, 2)}
${INDEX_END}
  ;
}(typeof window !== 'undefined' ? window : globalThis));
`;
  atomicWriteText(path.join(rootDir, INDEX_REL), text);
  return index;
}

// Delimited the same way the chrome catalogues are, and for the same reason: the payload has
// to come back out by slice-and-parse rather than by eval. Finding it by brace-matching
// instead looked simpler and was wrong — the last '}' in the file belongs to the IIFE
// wrapper, so every read came back empty and the index check failed against itself.
function readCatalogIndex(rootDir) {
  const full = path.join(rootDir, INDEX_REL);
  if (!fs.existsSync(full)) return {};
  const src = fs.readFileSync(full, 'utf8');
  const open = src.indexOf(INDEX_BEGIN);
  const close = src.indexOf(INDEX_END, open);
  if (open < 0 || close < 0) return {};
  try { return JSON.parse(src.slice(open + INDEX_BEGIN.length, close).trim()); }
  catch (e) { return {}; }
}

function writeCatalog(rootDir, source, lang, entries) {
  const src = assertSource(source);
  const code = assertLang(lang);
  if (src === CHROME_KEY) {
    const table = {};
    Object.keys(entries).forEach((k) => { table[hvSplitKey(k).text] = entries[k]; });
    writeChromeTable(rootDir, code, table);
    return readCatalog(rootDir, src, code);
  }
  // Sorted keys, so a catalogue's diff shows what changed rather than where the object
  // iteration order happened to land. Empty translations are dropped rather than stored as
  // "", which keeps "not translated" a single state instead of two that look different.
  const clean = {};
  Object.keys(entries).sort().forEach((k) => {
    const v = entries[k];
    if (typeof v === 'string' && v.trim()) clean[k] = v.trim();
  });
  const body = {
    lang: code,
    source: src,
    note: 'Keys are field|English-source. Editing the English orphans its translation on purpose.',
    entries: clean
  };
  atomicWriteJson(catalogPathFor(rootDir, src, code), JSON.stringify(body, null, 2) + '\n');
  // Rewritten on every save, so the index can never describe a state the disk is not in.
  writeCatalogIndex(rootDir);
  return { lang: code, source: src, entries: clean };
}

// ═══════════════ WHAT THE TAB RENDERS ════════════════════════════════════════

function scan(rootDir, source) {
  return source === CHROME_KEY ? scanChrome(rootDir) : scanSource(rootDir, source);
}

/**
 * One row per string: the English, the translation if there is one, and where it appears.
 *
 * `stale` is the other half of the coverage picture — a catalogue entry whose English no
 * longer exists in the source. It is not an error and nothing is deleted for it; it is
 * shown so a translator can tell "never done" apart from "done, then the English moved on".
 */
function rows(rootDir, source, lang) {
  const src = assertSource(source);
  const code = assertLang(lang);
  const { strings } = scan(rootDir, src);
  const { entries } = readCatalog(rootDir, src, code);
  const live = new Set(strings.map((s) => s.key));
  const out = strings.map((s) => Object.assign({}, s, {
    target: entries[s.key] || '',
    done: !!(entries[s.key] && String(entries[s.key]).trim())
  }));
  const stale = Object.keys(entries).filter((k) => !live.has(k)).map((k) => {
    const { field, text } = hvSplitKey(k);
    return { key: k, field, text, target: entries[k] };
  });
  return { source: src, lang: code, rows: out, stale, generated: isGenerated(src) };
}

function isGenerated(source) {
  return HV_GENERATED_SOURCES.indexOf(source) >= 0;
}

/**
 * Coverage for every source, which is what the tab's left rail and the CLI report both
 * show. Cheap enough to recompute per request — the whole corpus is under half a megabyte
 * and the alternative is a cache that can be wrong.
 */
function report(rootDir, lang) {
  const code = assertLang(lang);
  const files = [CHROME_KEY].concat(HV_CATALOG_SOURCES);
  const out = files.map((src) => {
    let scanned;
    try { scanned = scan(rootDir, src); }
    catch (e) { return { source: src, label: labelFor(src), group: groupFor(src), error: e.message, total: 0, done: 0, words: 0 }; }
    const { entries } = readCatalog(rootDir, src, code);
    const live = new Set(scanned.strings.map((s) => s.key));
    const done = scanned.strings.filter((s) => entries[s.key] && String(entries[s.key]).trim()).length;
    const words = scanned.strings.reduce((n, s) => n + s.text.split(/\s+/).length, 0);
    const todoWords = scanned.strings
      .filter((s) => !(entries[s.key] && String(entries[s.key]).trim()))
      .reduce((n, s) => n + s.text.split(/\s+/).length, 0);
    return {
      source: src,
      label: labelFor(src),
      group: groupFor(src),
      total: scanned.strings.length,
      done,
      words,
      todoWords,
      stale: Object.keys(entries).filter((k) => !live.has(k)).length,
      generated: isGenerated(src)
    };
  });
  const total = out.reduce((n, f) => n + f.total, 0);
  const done = out.reduce((n, f) => n + f.done, 0);
  return {
    lang: code,
    // The picker in the tab is built from this rather than from a list typed into the view:
    // adding a language is a line in js/i18n.js and nothing else.
    langs: HV_LANGS.filter((l) => l.code !== HV_DEFAULT_LANG).map((l) => ({ code: l.code, native: l.native, label: l.label })),
    files: out,
    totals: {
      total,
      done,
      words: out.reduce((n, f) => n + f.words, 0),
      todoWords: out.reduce((n, f) => n + f.todoWords, 0),
      stale: out.reduce((n, f) => n + f.stale, 0),
      percent: total ? Math.round((done / total) * 1000) / 10 : 0
    }
  };
}

// Names a translator recognises. The file stems are accurate and say nothing — "2b-unit-13"
// is not what anyone calls that unit while working on it.
const LABELS = {
  chrome: 'Interface — buttons, menus, messages',
  'levels.json': 'Core 1500 words',
  'worlds/2b-unit-10.json': 'Unit 10 · word list',
  'worlds/2b-unit-11.json': 'Unit 11 · word list',
  'worlds/2b-unit-13.json': 'Unit 13 · word list',
  'worlds/2b-unit-14.json': 'Unit 14 · word list',
  'worlds/2b-unit-15.json': 'Unit 15 · word list',
  'worlds/topik-2.json': 'TOPIK II · word list',
  'worlds/unit10-workbook.json': 'Unit 10 · workbook',
  'worlds/unit10-textbook.json': 'Unit 10 · textbook',
  'worlds/unit14-workbook.json': 'Unit 14 · workbook',
  'worlds/unit14-textbook.json': 'Unit 14 · textbook',
  'worlds/unit15-textbook.json': 'Unit 15 · textbook',
  'worlds/topik2-questions.json': 'TOPIK II · questions'
};
function labelFor(src) {
  if (LABELS[src]) return LABELS[src];
  const m = /^worlds\/(?:2b-)?unit-?(\d+)-(\w+)\.json$/.exec(src);
  if (m) return 'Unit ' + m[1] + ' · ' + m[2].replace('-', ' ');
  const q = /^worlds\/(\w+)-desk-quiz\.json$/.exec(src);
  if (q) return q[1].replace('topik2', 'TOPIK II').replace('unit', 'Unit ') + ' · desk quiz';
  const c = /^worlds\/(\w+)-cassette\.json$/.exec(src);
  if (c) return c[1].replace('unit', 'Unit ') + ' · cassette';
  return src;
}
function groupFor(src) {
  if (src === CHROME_KEY) return 'Interface';
  if (src === 'levels.json') return 'Core';
  if (/-desk-quiz\.json$/.test(src)) return 'Desk quizzes';
  if (/-cassette\.json$/.test(src)) return 'Cassette banks';
  if (/(workbook|textbook|questions)\.json$/.test(src)) return 'Exercises';
  return 'Word lists';
}

/**
 * Record translations. Only keys the source still contains are accepted — a row whose
 * English has since changed is refused by name rather than written into a catalogue where
 * nothing would ever read it again.
 */
function saveRows(rootDir, source, lang, edits) {
  const src = assertSource(source);
  const code = assertLang(lang);
  if (isGenerated(src)) {
    const e = new Error(`${src} is generated — translate it in its generator, not here.`);
    e.status = 409;
    throw e;
  }
  if (!edits || typeof edits !== 'object') {
    const e = new Error('Expected an object of catalogue key → translation'); e.status = 400; throw e;
  }
  const { strings } = scan(rootDir, src);
  const live = new Set(strings.map((s) => s.key));
  const current = readCatalog(rootDir, src, code).entries;
  const next = Object.assign({}, current);
  const rejected = [];
  let written = 0;
  let cleared = 0;
  Object.keys(edits).forEach((key) => {
    const value = edits[key];
    if (!live.has(key)) { rejected.push(key); return; }
    if (typeof value !== 'string' || !value.trim()) {
      if (next[key] !== undefined) { delete next[key]; cleared++; }
      return;
    }
    if (next[key] !== value.trim()) written++;
    next[key] = value.trim();
  });
  const saved = writeCatalog(rootDir, src, code, next);
  return {
    source: src, lang: code, written, cleared, rejected,
    total: strings.length,
    done: strings.filter((s) => saved.entries[s.key]).length
  };
}

/** Drop catalogue entries whose English no longer exists. Only ever on an explicit ask. */
function pruneStale(rootDir, source, lang) {
  const src = assertSource(source);
  const code = assertLang(lang);
  const { strings } = scan(rootDir, src);
  const live = new Set(strings.map((s) => s.key));
  const current = readCatalog(rootDir, src, code).entries;
  const kept = {};
  let removed = 0;
  Object.keys(current).forEach((k) => { if (live.has(k)) kept[k] = current[k]; else removed++; });
  writeCatalog(rootDir, src, code, kept);
  return { source: src, lang: code, removed };
}

module.exports = {
  INDEX_REL, listCatalogs, writeCatalogIndex, readCatalogIndex,
  CHROME_KEY, CHROME_REL, CHROME_BEGIN, CHROME_END, LANG_CODES,
  assertLang, assertSource, scan, scanSource, scanChrome,
  readCatalog, writeCatalog, readChromeTable, writeChromeTable,
  rows, report, saveRows, pruneStale, isGenerated, labelFor, groupFor,
  catalogPathFor
};
