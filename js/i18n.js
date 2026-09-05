/**
 * Hangeul Valley — interface language
 * ─────────────────────────────────────────────────────────────────────────────
 * Korean is the subject. English was, until now, also the only language the game
 * explained the subject *in*, which is a different job and did not have to be the
 * same language. This file is what lets the explaining half be swapped.
 *
 * Two kinds of text need translating and they are kept apart on purpose:
 *
 *   1. Chrome — buttons, headings, toasts. Authored here, keyed by a stable id,
 *      and looked up with hvT('hud.quests'). Lives in js/locales/<lang>.js.
 *
 *   2. Curriculum — the glosses, the exercise prompts, the teaching notes that sit
 *      inside levels.json and worlds/*.json. Those files are NOT edited. A parallel
 *      catalogue under locales/<lang>/ carries the translations, and hvLocalize()
 *      folds them into the data as it enters the game.
 *
 * Why a sidecar rather than a "vi" field beside every "en" field, which is what the
 * ko/en pairs already in the content would suggest:
 *
 *   · The curriculum files are checked by 1600-odd invariants and rewritten by the
 *     admin's own validators. Adding a field to all twenty-four of them means every
 *     one of those checks has to be re-argued. A file that is never touched cannot
 *     regress.
 *   · The key is the English itself, so editing an English sentence orphans its
 *     translation automatically. That is the whole staleness problem solved by the
 *     data shape rather than by a timestamp somebody has to remember to bump.
 *   · The same gloss translated once is translated everywhere it appears in that file.
 *
 * The cost is that a translation is a lookup rather than a field read, which is why
 * hvLocalize() writes the result back onto the object as `vi` / `nameVi` / `whyVi`.
 * After that every render site is a plain field read again — tr(word, 'en').
 */

// ═══════════════ THE LANGUAGES ═══════════════════════════════════════════════
const HV_LANGS = [
  { code: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'vi', label: 'Vietnamese', native: 'Tiếng Việt', flag: '🇻🇳' }
];
const HV_DEFAULT_LANG = 'en';
const HV_LANG_STORAGE_KEY = 'hv_lang';

// ═══════════════ THE FIELD RULE ══════════════════════════════════════════════
//
// One rule, used by the runtime, by the admin scanner and by the validator. The
// content already names its English half two ways — a bare `en` for a gloss, an
// `xxxEn` suffix for everything else — so the Vietnamese half follows the same
// shape rather than inventing a third.
//
//   en          → vi
//   nameEn      → nameVi
//   why         → whyVi
//
function hvLangField(base, lang) {
  if (!lang || lang === 'en') return base;
  const suffix = lang.charAt(0).toUpperCase() + lang.slice(1);
  if (base === 'en') return lang;
  if (base.length > 2 && base.slice(-2) === 'En') return base.slice(0, -2) + suffix;
  return base + suffix;
}

// Every field in the curriculum whose value is English written for the learner.
//
// Deliberately not "every string": `answer`, `art`, `id` and `src` are identifiers and
// file paths that happen to be spelled in Latin letters, and translating one breaks the
// exercise it addresses. `o` is an origin enum — its label is chrome, and lives in the
// catalogue above. `p` is the hanja breakdown in facts.json, which is generated; see
// HV_GENERATED_SOURCES below.
//
// `title`, `description`, `note` and `source` are listed even though most of their
// values are Korean, because some are not. hvIsTranslatable() sorts that out per string,
// which is the only place it can be decided correctly.
const HV_TEXT_FIELDS = [
  'en',
  'categoryEn', 'nameEn', 'descriptionEn', 'titleEn', 'instructionEn', 'blurbEn',
  'noteEn', 'exampleEn', 'sectionEn', 'secEn', 'pickEn', 'checkEn', 'againEn',
  'backEn', 'doneEn', 'hintEn', 'promptEn', 'subtitleEn', 'labelEn',
  'why', 'q', 'A', 'B', 'C', 'D',
  'note', 'l', 'description', 'source', 'title'
];

// Fields that look like prose to a regular expression and are not. Kept as a list
// rather than as a rule because the reason differs per field, and a rule that covered
// all of them would also cover something it should not.
const HV_NEVER_TRANSLATE = ['id', 'src', 'art', 'answer', 'answer2', 'o', 'h', 'n', 'p',
  'keep', 'drop', 'hint', 'icon', 'pack', 'worldId', 'type', 'section', 'file', 'cache'];

/**
 * Is this particular string something a translator should see?
 *
 * The field allow-list says "values here are usually English prose". This says whether
 * this one is — a Korean headword, a snake_case id or a sprite path all reach these
 * fields and none of them wants translating.
 */
function hvIsTranslatable(value) {
  if (typeof value !== 'string') return false;
  const s = value.trim();
  if (!s) return false;
  // No Latin letters at all: Korean, hanja, digits, emoji. Nothing to translate.
  if (!/[A-Za-z]{2}/.test(s)) return false;
  // A single token carrying _ or / is an identifier or a path, not a sentence.
  if (!/\s/.test(s) && (s.indexOf('_') >= 0 || s.indexOf('/') >= 0)) return false;
  if (/^https?:/i.test(s)) return false;
  if (/\.(png|jpe?g|webp|gif|mp3|ogg|wav|json|js)$/i.test(s)) return false;
  // Mostly Korean, with a Latin acronym in it, is a Korean string — not English prose that
  // happens to mention Korean. A bare "has Latin letters" test offered
  // "스마트폰, 인터넷, SNS, 언론 및 미디어 어휘" for translation on the strength of "SNS".
  // Teaching prose runs the other way: "된장 is fermented soybean paste" is forty Latin
  // letters against two Hangul, and must stay in.
  const hangul = (s.match(/[가-힣]/g) || []).length;
  if (hangul) {
    const latin = (s.match(/[A-Za-z]/g) || []).length;
    if (latin <= hangul) return false;
  }
  return true;
}

// Content the admin must not offer for editing, because a save would be discarded.
// facts.json is built by scripts/build_facts_json.js; its Vietnamese has to come from
// the same generator or the next run drops it.
const HV_GENERATED_SOURCES = ['facts.json'];

// ═══════════════ CATALOGUE KEYS ══════════════════════════════════════════════
//
// key = field + '|' + the English source text.
//
// A plain separator rather than a hash, and the source text rather than an id, because
// both properties that buys are the ones that matter here: a diff of a catalogue is
// readable, and editing an English sentence orphans its translation without anything
// having to notice. Split on the FIRST '|' only — field names never contain one, English
// sentences sometimes do.
const HV_KEY_SEP = '|';
function hvKey(field, text) {
  return String(field) + HV_KEY_SEP + String(text).trim();
}
function hvSplitKey(key) {
  const at = String(key).indexOf(HV_KEY_SEP);
  if (at < 0) return { field: '', text: String(key) };
  return { field: key.slice(0, at), text: key.slice(at + 1) };
}

/** Where a source file's translations live. worlds/x.json → locales/vi/worlds/x.json */
function hvCatalogPath(rel, lang) {
  return 'locales/' + lang + '/' + String(rel).split('\\').join('/');
}

// ═══════════════ CURRENT LANGUAGE ════════════════════════════════════════════
let hvCurrentLang = HV_DEFAULT_LANG;

function hvIsKnownLang(code) {
  return HV_LANGS.some((l) => l.code === code);
}

function hvLang() {
  return hvCurrentLang;
}

function hvLangInfo(code) {
  return HV_LANGS.find((l) => l.code === (code || hvCurrentLang)) || HV_LANGS[0];
}

/**
 * Read the stored preference. Falls back to the browser's own languages before English,
 * so a Vietnamese browser opening the game for the first time gets Vietnamese without
 * having to find the setting.
 */
function hvDetectLang() {
  try {
    const stored = localStorage.getItem(HV_LANG_STORAGE_KEY);
    if (stored && hvIsKnownLang(stored)) return stored;
  } catch (e) { /* private mode, or no storage at all */ }
  try {
    const prefs = (navigator.languages && navigator.languages.length)
      ? navigator.languages : [navigator.language || ''];
    for (const p of prefs) {
      const code = String(p).toLowerCase().split('-')[0];
      if (hvIsKnownLang(code)) return code;
    }
  } catch (e) { /* no navigator: Node, or a very old browser */ }
  return HV_DEFAULT_LANG;
}

/**
 * Switch language.
 *
 * This reloads. Half of what is on screen at any moment was painted by Phaser into a
 * canvas or written into a panel that is already open, and re-rendering all of it in
 * place means every screen in the game growing a redraw path that exists for one button.
 * Progress lives in the save, so a reload costs a second and cannot leave the interface
 * half-translated — which is the failure mode worth avoiding.
 */
function hvSetLang(code, opts) {
  const next = hvIsKnownLang(code) ? code : HV_DEFAULT_LANG;
  const changed = next !== hvCurrentLang;
  hvCurrentLang = next;
  try { localStorage.setItem(HV_LANG_STORAGE_KEY, next); } catch (e) { /* nothing to do */ }
  if (typeof document !== 'undefined' && document && document.documentElement) {
    document.documentElement.setAttribute('lang', next);
  }
  const reload = !opts || opts.reload !== false;
  if (changed && reload && typeof location !== 'undefined' && location.reload) {
    location.reload();
    return next;
  }
  if (typeof applyI18n === 'function' && typeof document !== 'undefined' && document) applyI18n(document);
  return next;
}

// ═══════════════ CHROME STRINGS ══════════════════════════════════════════════
//
// js/locales/<lang>.js assigns into this. Plain data assignment rather than a fetch:
// the catalogue has to be in hand before the first paint, and the level select is built
// synchronously from a <script> tag. English is the fallback for anything untranslated,
// and the key itself is the fallback for anything unwritten — a visible key in the corner
// of a screen is a bug report, where silently blank text is not.
const HV_LOCALES = (typeof window !== 'undefined' && window.HV_LOCALES) || {};
if (typeof window !== 'undefined') window.HV_LOCALES = HV_LOCALES;

function hvRegisterLocale(code, table) {
  HV_LOCALES[code] = Object.assign(HV_LOCALES[code] || {}, table || {});
  return HV_LOCALES[code];
}

/**
 * hvT('shop.buy')                      → 'Mua'
 * hvT('shop.cost', { gold: 40 })       → 'Giá 40 vàng'
 *
 * {name} placeholders are substituted after lookup, so a translation may reorder them.
 */
function hvT(key, vars) {
  const table = HV_LOCALES[hvCurrentLang] || null;
  const fallback = HV_LOCALES[HV_DEFAULT_LANG] || null;
  let s = (table && Object.prototype.hasOwnProperty.call(table, key)) ? table[key] : undefined;
  if (s === undefined || s === null || s === '') {
    s = (fallback && Object.prototype.hasOwnProperty.call(fallback, key)) ? fallback[key] : undefined;
  }
  if (s === undefined || s === null) return key;
  if (!vars) return s;
  return String(s).replace(/\{(\w+)\}/g, (m, name) =>
    (Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : m));
}

/** Does this key exist in any catalogue? Used by the tests and the coverage report. */
function hvHasKey(key) {
  return HV_LANGS.some((l) => {
    const table = HV_LOCALES[l.code];
    return !!(table && Object.prototype.hasOwnProperty.call(table, key));
  });
}

// ═══════════════ CURRICULUM STRINGS ══════════════════════════════════════════
//
// tr(word, 'en') is the whole read side. It is a field read with a fallback, and it is
// deliberately not a catalogue lookup: hvLocalize() has already folded the catalogue in,
// so a render site does not need to know which file its object came from.
function tr(obj, base) {
  if (!obj) return '';
  const field = base || 'en';
  if (hvCurrentLang !== HV_DEFAULT_LANG) {
    const localized = obj[hvLangField(field, hvCurrentLang)];
    if (typeof localized === 'string' && localized.trim()) return localized;
  }
  const v = obj[field];
  return typeof v === 'string' ? v : (v === undefined || v === null ? '' : String(v));
}

/** Both halves at once, for the places that show the gloss under the Korean. */
function trPair(obj, base) {
  const field = base || 'en';
  return { en: (obj && obj[field]) || '', out: tr(obj, field) };
}

// ═══════════════ CATALOGUE LOADING AND FOLDING ═══════════════════════════════
const HV_CATALOGS = {};       // rel → { entries: {key: translation} }
let hvCatalogsLoading = null;
const hvCatalogPending = {};   // rel → the fetch already in flight for it

/**
 * A load site names its file however it happens to name it — 'worlds/x.json' in one place,
 * '/worlds/x.json' in another, 'worlds/x.json?v=3' in a third. All three are the same
 * catalogue, and normalising here means no call site has to think about it.
 */
function hvRel(rel) {
  return String(rel || '').split('\\').join('/').split('?')[0].replace(/^\/+/, '');
}

function hvCatalogFor(rel) {
  return HV_CATALOGS[hvRel(rel)] || null;
}

/** Register a catalogue that arrived by some other route — Phaser's cache, or a test. */
function hvRegisterCatalog(rel, catalog) {
  const key = hvRel(rel);
  if (!catalog || typeof catalog !== 'object') return null;
  HV_CATALOGS[key] = { entries: catalog.entries || {} };
  return HV_CATALOGS[key];
}

// The catalogue keys Phaser's loader is asked for in FarmScene.preload().
const HV_PHASER_PREFIX = 'i18n:';

/**
 * Ask Phaser to fetch the catalogues alongside everything else it preloads.
 *
 * Going through the scene loader rather than fetch() is what makes create() able to
 * translate synchronously: by the time create() runs, every catalogue that exists is in
 * the JSON cache. A catalogue that 404s — an untranslated unit — logs a loader error and
 * is simply absent, which is the same as not being translated yet.
 */
/**
 * The catalogues that actually exist for a language.
 *
 * js/locales/catalogs.js is generated whenever one is written, and loaded by a script tag,
 * so this answer is in hand before the scene preloads. Asking for all twenty-four instead
 * and letting the missing ones 404 worked, but cost fifty failed requests and fifty console
 * errors on every load in a partly-translated language — which is exactly where a real error
 * would then go unnoticed.
 *
 * With no index at all it falls back to asking for everything: a fresh checkout that has
 * never run the writer still translates, it is just noisy about it.
 */
function hvCatalogsFor(lang) {
  const index = (typeof window !== 'undefined' && window.HV_CATALOG_INDEX)
    || (typeof HV_CATALOG_INDEX !== 'undefined' ? HV_CATALOG_INDEX : null);
  if (!index) return HV_CATALOG_SOURCES.slice();
  const listed = index[lang || hvCurrentLang];
  return Array.isArray(listed) ? listed.slice() : [];
}

function hvPreloadCatalogs(scene) {
  if (!scene || !scene.load || hvCurrentLang === HV_DEFAULT_LANG) return 0;
  const wanted = hvCatalogsFor(hvCurrentLang);
  wanted.forEach((rel) => {
    scene.load.json(HV_PHASER_PREFIX + rel, hvCatalogPath(rel, hvCurrentLang));
  });
  return wanted.length;
}

/** Move whatever the preload managed to fetch into HV_CATALOGS. */
function hvAdoptPhaserCatalogs(scene) {
  if (!scene || !scene.cache || !scene.cache.json || hvCurrentLang === HV_DEFAULT_LANG) return 0;
  let n = 0;
  hvCatalogsFor(hvCurrentLang).forEach((rel) => {
    const key = HV_PHASER_PREFIX + rel;
    if (!scene.cache.json.exists(key)) return;
    if (hvRegisterCatalog(rel, scene.cache.json.get(key))) n++;
  });
  return n;
}

/**
 * hvLocalize, for the loaders that arrive by fetch and cannot wait synchronously.
 *
 * It fetches only the catalogue for the file being loaded, not all of them. Asking for the
 * whole set here meant the six that FarmScene already pulls through Phaser's loader were
 * fetched a second time on every load, because this runs before create() has had a chance to
 * register them. One file, when that file is needed, cannot overlap with the preload at all.
 */
function hvLocalizeAsync(rel, data) {
  if (!data || hvCurrentLang === HV_DEFAULT_LANG) return Promise.resolve(data);
  const key = hvRel(rel);
  if (hvCatalogFor(key)) return Promise.resolve(hvLocalize(key, data));
  if (hvCatalogsFor(hvCurrentLang).indexOf(key) < 0) return Promise.resolve(data);
  return hvLoadCatalogs([key]).then(() => hvLocalize(key, data)).catch(() => data);
}

/**
 * Fold a catalogue into a freshly loaded content object, in place.
 *
 * Idempotent, and a no-op when the language is English or the catalogue is missing, so
 * every load site can call it without first working out whether it needs to.
 */
function hvLocalize(rel, data, lang) {
  const code = lang || hvCurrentLang;
  if (!data || code === HV_DEFAULT_LANG) return data;
  const cat = hvCatalogFor(hvRel(rel));
  if (!cat) return data;
  const entries = cat.entries || {};
  const seen = new Set();
  (function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) { node.forEach(walk); return; }
    for (const field of Object.keys(node)) {
      const value = node[field];
      if (value && typeof value === 'object') { walk(value); continue; }
      if (typeof value !== 'string') continue;
      if (HV_TEXT_FIELDS.indexOf(field) < 0) continue;
      if (!hvIsTranslatable(value)) continue;
      const hit = entries[hvKey(field, value)];
      if (typeof hit === 'string' && hit.trim()) node[hvLangField(field, code)] = hit;
    }
  }(data));
  return data;
}

/**
 * Fetch the catalogues for a set of source files. Resolves even when every one of them
 * 404s: a missing catalogue means "not translated yet", which is a normal state for a
 * language being filled in unit by unit, and must not stop the game loading.
 */
function hvLoadCatalogs(rels, lang) {
  const code = lang || hvCurrentLang;
  if (code === HV_DEFAULT_LANG) return Promise.resolve(HV_CATALOGS);
  if (typeof fetch !== 'function') return Promise.resolve(HV_CATALOGS);
  const wanted = (rels || []).map(hvRel).filter((r) => !HV_CATALOGS[r]);
  if (!wanted.length) return Promise.resolve(HV_CATALOGS);
  // Parked per file rather than per call. The level select and the scene preload can both
  // ask for the same catalogue in the same tick, and the "already have it" filter above
  // cannot see a request that has not come back yet — which fetched every catalogue twice.
  return Promise.all(wanted.map((rel) => {
    if (hvCatalogPending[rel]) return hvCatalogPending[rel];
    hvCatalogPending[rel] = fetch(hvCatalogPath(rel, code))
      .then((r) => (r && r.ok ? r.json() : null))
      .then((c) => { if (c) hvRegisterCatalog(rel, c); })
      .catch(() => { /* untranslated is not an error */ });
    return hvCatalogPending[rel];
  })).then(() => HV_CATALOGS);
}

/**
 * The gate every content loader waits on. Started once, at load, so the fetches overlap
 * with Phaser's own preload rather than queueing behind it.
 */
function hvCatalogsReady() {
  if (!hvCatalogsLoading) hvCatalogsLoading = hvLoadCatalogs(hvCatalogsFor(hvCurrentLang));
  return hvCatalogsLoading;
}

// Every curriculum file that carries translatable text. Kept here rather than derived
// from the loaders, because scripts/i18n_sync.js and the admin need the same list and
// neither of them can run the game to find out what it fetched.
const HV_CATALOG_SOURCES = [
  'levels.json',
  'worlds/2b-unit-10.json', 'worlds/2b-unit-11.json', 'worlds/2b-unit-13.json',
  'worlds/2b-unit-14.json', 'worlds/2b-unit-15.json', 'worlds/topik-2.json',
  'worlds/unit10-workbook.json', 'worlds/unit10-textbook.json',
  'worlds/unit14-workbook.json', 'worlds/unit14-textbook.json',
  'worlds/unit15-textbook.json', 'worlds/topik2-questions.json',
  'worlds/unit10-desk-quiz.json', 'worlds/unit11-desk-quiz.json',
  'worlds/unit13-desk-quiz.json', 'worlds/unit14-desk-quiz.json',
  'worlds/unit15-desk-quiz.json', 'worlds/topik2-desk-quiz.json',
  'worlds/unit10-cassette.json', 'worlds/unit11-cassette.json',
  'worlds/unit13-cassette.json', 'worlds/unit14-cassette.json',
  'worlds/unit15-cassette.json'
];

// ═══════════════ THE DOM PASS ════════════════════════════════════════════════
//
// Static chrome carries its key in the markup, so index.html stays readable as English
// and the translation is a lookup rather than a second copy of the page.
//
//   <button data-i18n="hud.quests">📜 Quests</button>
//   <input data-i18n-placeholder="quiz.placeholder">
//   <button data-i18n-title="audio.close" data-i18n-aria-label="audio.close">
//
// The English in the markup is left alone when the language is English, which means the
// page is correct before this ever runs and a missing key costs nothing.
const HV_I18N_ATTRS = ['placeholder', 'title', 'aria-label', 'alt', 'value'];

function applyI18n(root) {
  const scope = root || (typeof document !== 'undefined' ? document : null);
  if (!scope || !scope.querySelectorAll) return 0;
  let n = 0;
  scope.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    const value = hvT(key);
    if (value === key) return;              // untranslated: keep the authored English
    // Only the text is replaced. An element that wraps an icon <span> keeps it, because
    // the icon is not language and re-rendering it would drop the sprite binding.
    const icon = el.querySelector('[data-hud-icon], .nav-icon, .btn-icon');
    if (icon) {
      let node = icon.nextSibling;
      while (node && node.nodeType !== 3) node = node.nextSibling;
      if (node) { node.nodeValue = ' ' + value; n++; return; }
    }
    el.textContent = value;
    n++;
  });
  HV_I18N_ATTRS.forEach((attr) => {
    scope.querySelectorAll('[data-i18n-' + attr + ']').forEach((el) => {
      const key = el.getAttribute('data-i18n-' + attr);
      if (!key) return;
      const value = hvT(key);
      if (value === key) return;
      el.setAttribute(attr, value);
      n++;
    });
  });
  return n;
}

// ═══════════════ THE PICKER ══════════════════════════════════════════════════
//
// Rendered rather than written into index.html, so adding a language is a line in HV_LANGS
// and not an edit in however many places a picker happens to appear. Any element with
// class="hv-lang-picker" becomes one.
function hvRenderLangPickers(root) {
  const scope = root || (typeof document !== 'undefined' ? document : null);
  if (!scope || !scope.querySelectorAll) return 0;
  const nodes = scope.querySelectorAll('.hv-lang-picker');
  nodes.forEach((box) => {
    box.innerHTML = '';
    HV_LANGS.forEach((l) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'hv-lang-btn' + (l.code === hvCurrentLang ? ' active' : '');
      b.setAttribute('data-lang', l.code);
      b.setAttribute('lang', l.code);
      // The native name, always in its own language — the one label that must never be
      // translated, because it is what someone who cannot read the current interface reads.
      b.textContent = l.flag + ' ' + l.native;
      b.setAttribute('aria-pressed', l.code === hvCurrentLang ? 'true' : 'false');
      b.addEventListener('click', () => hvSetLang(l.code));
      box.appendChild(b);
    });
  });
  return nodes.length;
}

// ═══════════════ BOOT ════════════════════════════════════════════════════════
const HV_IS_NODE = typeof process !== 'undefined' && !!(process.versions && process.versions.node);
if (!HV_IS_NODE) {
  hvCurrentLang = hvDetectLang();
  if (typeof document !== 'undefined' && document && document.documentElement) {
    document.documentElement.setAttribute('lang', hvCurrentLang);
  }
  // Deliberately not started here. FarmScene.preload() pulls the catalogues through Phaser's
  // loader, and hvLocalizeAsync() starts this lazily for the screens that fetch on their own.
  // Starting it at boot as well fetched every catalogue twice.
  if (typeof document !== 'undefined' && document && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', () => {
      applyI18n(document);
      hvRenderLangPickers(document);
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    HV_LANGS, HV_DEFAULT_LANG, HV_LANG_STORAGE_KEY,
    HV_TEXT_FIELDS, HV_NEVER_TRANSLATE, HV_GENERATED_SOURCES, HV_CATALOG_SOURCES,
    HV_KEY_SEP, hvKey, hvSplitKey, hvCatalogPath,
    hvLangField, hvIsTranslatable, hvIsKnownLang,
    hvLang, hvSetLang, hvLangInfo, hvRegisterLocale, hvT, hvHasKey,
    tr, trPair, hvLocalize, hvLocalizeAsync, hvRegisterCatalog, hvCatalogFor, hvRel,
    hvPreloadCatalogs, hvAdoptPhaserCatalogs, hvCatalogsFor, applyI18n, hvRenderLangPickers,
    hvLoadCatalogs, hvCatalogsReady, hvDetectLang,
    _setLangForTest(code) { hvCurrentLang = code; }
  };
}
