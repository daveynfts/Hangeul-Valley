'use strict';

/**
 * Give every piece of English in index.html a key, and put the key in the markup.
 *
 *   <div id="audio-sub">Music, ambience …</div>
 *   →  <div id="audio-sub" data-i18n="ui.audio.sub">Music, ambience …</div>
 *
 * The English stays in the file. That is the point: the page is correct before any
 * catalogue loads, a key with no translation costs nothing, and the markup goes on reading
 * as English to whoever is editing it. js/i18n.js's applyI18n() swaps the text in at boot
 * when the language is not English.
 *
 * Run it again after adding markup — it is idempotent, skips anything already keyed, and
 * only ever adds attributes. `--check` fails instead of writing, which is what CI wants.
 *
 *   node scripts/i18n_extract.js            rewrite index.html and js/locales/en.js
 *   node scripts/i18n_extract.js --check    report what is unkeyed, change nothing
 *
 * Why a tokeniser and not a DOM library: there is no build step in this project and no
 * HTML parser in node_modules. The markup is hand-authored and well-formed, and the walker
 * below only has to be right about tag boundaries and the element stack — it never
 * rewrites structure, only appends attributes to opening tags it has already located.
 */

const fs = require('fs');
const path = require('path');
const { atomicWriteText } = require('../admin/lib/atomicWrite');
const adminI18n = require('../admin/lib/i18n');

const ROOT = path.join(__dirname, '..');
const HTML_REL = 'index.html';
const CHECK = process.argv.indexOf('--check') >= 0;

// Elements whose text is not language: script, style, and the two pixel-font displays whose
// content is a number the game rewrites every frame.
const SKIP_ELEMENTS = ['script', 'style', 'svg', 'canvas'];
const VOID_ELEMENTS = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
  'meta', 'param', 'source', 'track', 'wbr'];
// Attributes worth translating. `value` is deliberately absent: every value= in this file is
// a slider position, and translating "80" is not a thing.
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
// A child element that is decoration rather than content. applyI18n keeps these and replaces
// only the text beside them, so a button may hold one and still be keyed.
const ICON_ATTR = /\bdata-hud-icon=|\bclass="[^"]*\b(nav-icon|btn-icon|ls-logo)\b/;

// ── Tokeniser ────────────────────────────────────────────────────────────────
function tokenize(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const lt = src.indexOf('<', i);
    if (lt < 0) { out.push({ type: 'text', start: i, end: src.length }); break; }
    if (lt > i) out.push({ type: 'text', start: i, end: lt });
    if (src.startsWith('<!--', lt)) {
      const close = src.indexOf('-->', lt);
      const end = close < 0 ? src.length : close + 3;
      out.push({ type: 'comment', start: lt, end });
      i = end;
      continue;
    }
    const gt = findTagEnd(src, lt);
    out.push({ type: 'tag', start: lt, end: gt });
    i = gt;
  }
  return out;
}

// A '>' inside a quoted attribute value does not close the tag. onclick handlers in this
// file contain plenty of them.
function findTagEnd(src, from) {
  let i = from + 1;
  let quote = '';
  while (i < src.length) {
    const c = src[i];
    if (quote) { if (c === quote) quote = ''; }
    else if (c === '"' || c === "'") quote = c;
    else if (c === '>') return i + 1;
    i++;
  }
  return src.length;
}

function parseTag(raw) {
  const m = /^<\s*(\/)?\s*([a-zA-Z][\w-]*)/.exec(raw);
  if (!m) return null;
  return {
    closing: !!m[1],
    name: m[2].toLowerCase(),
    selfClosing: /\/\s*>$/.test(raw) || VOID_ELEMENTS.indexOf(m[2].toLowerCase()) >= 0,
    raw
  };
}

function attrOf(raw, name) {
  const re = new RegExp('\\s' + name + '\\s*=\\s*"([^"]*)"');
  const m = re.exec(raw);
  return m ? m[1] : null;
}

// ── Keys ─────────────────────────────────────────────────────────────────────
//
// An element with an id gets a key built from it, because the id is already the stable name
// for that thing and a translator reading "ui.audio.sub" in the admin can find it. Everything
// else is named for its nearest keyed ancestor plus a few words of its own text, which is
// stable as long as the sentence is — and when the sentence changes, the English changing is
// exactly when its translation should be re-checked.
function slug(text, words) {
  const parts = String(text).toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ').trim().split(/\s+/).filter(Boolean).slice(0, words || 4);
  if (!parts.length) return 'text';
  return parts[0] + parts.slice(1).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

function keyFromId(id) {
  return 'ui.' + String(id).replace(/^ls-/, 'levelSelect-').replace(/[-_]+/g, '.');
}

// ── The pass ─────────────────────────────────────────────────────────────────
function run() {
  const full = path.join(ROOT, HTML_REL);
  const src = fs.readFileSync(full, 'utf8');
  const tokens = tokenize(src);

  const stack = [];
  const elements = [];
  let skipDepth = 0;

  tokens.forEach((tok) => {
    const raw = src.slice(tok.start, tok.end);
    if (tok.type === 'comment') return;
    if (tok.type === 'text') {
      if (skipDepth > 0 || !stack.length) return;
      const text = raw.trim();
      if (text) stack[stack.length - 1].texts.push({ text, start: tok.start, end: tok.end });
      return;
    }
    const tag = parseTag(raw);
    if (!tag) return;
    if (tag.closing) {
      if (SKIP_ELEMENTS.indexOf(tag.name) >= 0 && skipDepth > 0) skipDepth--;
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].name === tag.name) { stack.length = i; break; }
      }
      return;
    }
    if (SKIP_ELEMENTS.indexOf(tag.name) >= 0) { if (!tag.selfClosing) skipDepth++; return; }
    // Where a new attribute goes: immediately after the last one, before the '>' or '/>'
    // that closes the opening tag. Computed here, from this tag's own text, rather than by
    // searching backwards for a '>' at patch time — a backwards search from a tag that does
    // not end where it is assumed to lands inside the *previous* element, which is how a
    // second run wrote `</button data-i18n="…">` into three closing tags.
    const tail = /\s*\/?\s*>$/.exec(raw);
    const el = {
      name: tag.name,
      raw,
      tagStart: tok.start,
      tagEnd: tok.end,
      insertAt: tok.end - (tail ? tail[0].length : 1),
      id: attrOf(raw, 'id'),
      texts: [],
      childTags: 0,
      iconChildren: 0,
      depth: stack.length,
      parent: stack.length ? stack[stack.length - 1] : null
    };
    if (el.parent) {
      el.parent.childTags++;
      if (ICON_ATTR.test(raw)) el.parent.iconChildren++;
    }
    elements.push(el);
    if (!tag.selfClosing && skipDepth === 0) stack.push(el);
  });

  // Which elements may carry data-i18n: exactly one run of text, and no child elements
  // beyond decoration that applyI18n knows to preserve.
  const used = new Set();
  const catalog = {};
  const patches = [];
  const skipped = [];

  const keyFor = (el, text, suffix) => {
    let base;
    if (el.id) base = keyFromId(el.id);
    else {
      let anc = el.parent;
      while (anc && !anc.id) anc = anc.parent;
      base = (anc ? keyFromId(anc.id) : 'ui') + '.' + slug(text);
    }
    let key = suffix ? base + '.' + suffix : base;
    let n = 2;
    while (used.has(key) && catalog[key] !== text) key = (suffix ? base + '.' + suffix : base) + n++;
    used.add(key);
    return key;
  };

  // An element that already carries a key keeps it, and its English is still recorded —
  // otherwise a hand-written key vanishes from js/locales/en.js on the next run and the
  // translator loses the string while the markup goes on claiming it is handled.
  const adopt = (key, text) => {
    used.add(key);
    catalog[key] = text;
  };

  elements.forEach((el) => {
    // Attributes first: they are independent of whether the text itself can be keyed.
    ATTRS.forEach((attr) => {
      const value = attrOf(el.raw, attr);
      if (!value || !isTranslatableChrome(value)) return;
      const already = attrOf(el.raw, 'data-i18n-' + attr);
      if (already) { adopt(already, value); return; }
      const key = keyFor(el, value, attr.replace('aria-label', 'aria'));
      catalog[key] = value;
      patches.push({ at: el.insertAt, insert: ` data-i18n-${attr}="${key}"` });
    });

    if (el.texts.length !== 1) return;
    const text = el.texts[0].text;
    if (!isTranslatableChrome(text)) return;
    const already = attrOf(el.raw, 'data-i18n');
    if (already) { adopt(already, text); return; }
    if (el.childTags > el.iconChildren) { skipped.push({ id: el.id, text: text.slice(0, 60) }); return; }
    const key = keyFor(el, text);
    catalog[key] = text;
    patches.push({ at: el.insertAt, insert: ` data-i18n="${key}"` });
  });

  // Applied back-to-front, so an insertion never moves the offset of one still to come.
  patches.sort((a, b) => b.at - a.at);
  let out = src;
  patches.forEach((p) => { out = out.slice(0, p.at) + p.insert + out.slice(p.at); });

  const existing = adminI18n.readChromeTable(ROOT, 'en');
  const merged = Object.assign({}, existing, catalog);

  // Keys the game code asks for that no catalogue answers. hvT() falls back to printing the
  // key, so a typo here is a raw "ui.quiz.itIs" on screen rather than a crash — visible, but
  // only to whoever happens to open that screen. Naming them at build time is cheaper.
  const orphans = scanCodeKeys().filter((k) => !merged[k]);

  if (CHECK) {
    const added = Object.keys(catalog).filter((k) => existing[k] !== catalog[k]);
    console.log(`[i18n] ${Object.keys(catalog).length} keyed strings in ${HTML_REL}`);
    console.log(`[i18n] ${added.length} would change in js/locales/en.js`);
    if (skipped.length) {
      console.log(`[i18n] ${skipped.length} text runs skipped (mixed markup — key by hand if wanted):`);
      skipped.slice(0, 12).forEach((s) => console.log(`         ${s.id || '(no id)'} · ${s.text}`));
    }
    if (orphans.length) {
      console.log(`[i18n] ${orphans.length} hvT() key(s) with no English text:`);
      orphans.forEach((k) => console.log(`         ${k}`));
    }
    process.exitCode = (out !== src || added.length || orphans.length) ? 1 : 0;
    return;
  }

  if (out !== src) atomicWriteText(full, out);
  adminI18n.writeChromeTable(ROOT, 'en', merged);
  console.log(`[i18n] ${patches.length} attributes added to ${HTML_REL}`);
  console.log(`[i18n] js/locales/en.js now holds ${Object.keys(merged).length} keys`);
  if (skipped.length) {
    console.log(`[i18n] ${skipped.length} text runs left alone (mixed markup):`);
    skipped.slice(0, 20).forEach((s) => console.log(`         ${s.id || '(no id)'} · ${s.text}`));
  }
  if (orphans.length) {
    console.log(`[i18n] ⚠ ${orphans.length} hvT() key(s) have no English text — add them to js/locales/en.js:`);
    orphans.forEach((k) => console.log(`         ${k}`));
    process.exitCode = 1;
  }
}

/** Every literal key the game code passes to hvT(). */
function scanCodeKeys() {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'js', 'manifest.json'), 'utf8'));
  const keys = new Set();
  // js/i18n.js is skipped: it defines hvT and its doc comment shows example calls, which are
  // not keys anybody expects a catalogue to answer.
  const SELF = ['js/i18n.js'];
  manifest.filter((rel) => rel.indexOf('js/locales/') !== 0 && SELF.indexOf(rel) < 0).forEach((rel) => {
    const full = path.join(ROOT, rel.split('/').join(path.sep));
    if (!fs.existsSync(full)) return;
    const src = fs.readFileSync(full, 'utf8');
    for (const m of src.matchAll(/\bhvT\(\s*['"]([^'"]+)['"]/g)) keys.add(m[1]);
  });
  return [...keys].sort();
}

// Chrome is not curriculum: a bare number, a percent readout or an emoji on its own is not
// a sentence anyone translates, and keying it would put noise in front of the translator.
function isTranslatableChrome(value) {
  const s = String(value).trim();
  if (!s) return false;
  if (!/[A-Za-z]{2}/.test(s)) return false;
  if (/^\d+%?$/.test(s)) return false;
  if (/^[a-z]+([A-Z][a-z]+)*$/.test(s) && s.length < 4) return false;
  return true;
}

if (require.main === module) run();
module.exports = { run, tokenize, findTagEnd, slug, isTranslatableChrome, scanCodeKeys };
