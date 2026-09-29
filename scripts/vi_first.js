#!/usr/bin/env node
'use strict';

/**
 * scripts/vi_first.js — Claude's side of "Vietnamese first".
 *
 * The author writes the curriculum's prose in Vietnamese in the admin; each edit is a draft
 * beside the English it will replace (admin/public/js/viFirst.js). The English is written
 * afterwards, in batches, by Claude — this script lists what is owed and files the result.
 * The full procedure is docs/vietnamese-first.md.
 *
 *   node scripts/vi_first.js status                what is waiting, file by file
 *   node scripts/vi_first.js todo [--out f.json]   the worklist: every English still to write,
 *                                                  with its Vietnamese, the English it replaces
 *                                                  and the Korean it is about
 *   node scripts/vi_first.js apply f.json          write the English from a filled worklist,
 *                                                  then file every draft in its catalogue
 *   node scripts/vi_first.js settle                file the drafts whose English is current
 *   node scripts/vi_first.js ai [--out f.json]     English Claude wrote that nobody has read
 *   node scripts/vi_first.js reviewed f.json       mark those English lines as read
 *
 * Filing means: the English goes into the field, the Vietnamese into locales/vi/<file> under
 * `field|English` — the catalogue the game and the Translate tab already read — and the draft
 * leaves the content file, so the repo is back to its one storage model. Catalogue entries the
 * new English orphaned are pruned in the same pass, which keeps validate_content's "no stale
 * translations" gate green.
 */

const fs = require('fs');
const path = require('path');

// HV_ROOT points it at a copy of the repo — tests/test_vi_first.js runs a whole batch in one.
const ROOT = process.env.HV_ROOT ? path.resolve(process.env.HV_ROOT) : path.join(__dirname, '..');
const vi = require('../admin/public/js/viFirst.js');
const rich = require('../js/richText.js');
const i18n = require('../admin/lib/i18n.js');
const content = require('../admin/lib/content.js');

const args = process.argv.slice(2);
const cmd = args[0] || 'status';
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };

// Every content file that can carry drafts, with the validator its saves go through.
function files() {
  return content.CONTENT
    .filter((c) => /^(levels\.json|worlds\/)/.test(c.rel.split(path.sep).join('/')))
    .map((c) => ({ rel: c.rel.split(path.sep).join('/'), entry: c }))
    // A copy of the repo made for a test holds only the files it is about.
    .filter(({ rel }) => fs.existsSync(path.join(ROOT, rel)));
}
function readJson(rel) { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); }
function writeContent(rel, entry, body) {
  const clean = entry.validate(body, { rootDir: ROOT, rel });
  fs.writeFileSync(path.join(ROOT, rel), JSON.stringify(clean, null, 2) + '\n');
  return clean;
}
function catalogOf(rel) {
  try { return i18n.readCatalog(ROOT, rel, 'vi').entries || {}; } catch (e) { return {}; }
}
function getAt(root, p) {
  return !p ? root : p.split('.').reduce((o, k) => (o == null ? undefined : o[/^\d+$/.test(k) ? Number(k) : k]), root);
}

// The Korean a line of English is about, so a translator is never working from the Vietnamese
// alone: the object's own Korean, its lines, its prompt, its phrase.
function koreanOf(obj) {
  const bits = [];
  ['ko', 'phraseKo', 'stemKo', 'instructionKo', 'example', 'section', 'pattern', 'category'].forEach((k) => {
    if (typeof obj[k] === 'string' && obj[k].trim()) bits.push(obj[k].trim());
  });
  (obj.lines || []).forEach((l) => { if (l && l.ko) bits.push((l.who ? l.who + ': ' : '') + l.ko); });
  (obj.choices && Array.isArray(obj.choices) ? obj.choices : []).forEach((c) => { if (c && c.ko) bits.push('· ' + c.ko); });
  // A desk quiz keeps its four answers as { A, B, C, D }; the Korean ones are the context.
  if (obj.choices && !Array.isArray(obj.choices) && typeof obj.choices === 'object') {
    Object.keys(obj.choices).forEach((k) => {
      const v = obj.choices[k];
      if (typeof v === 'string' && /[가-힣]/.test(v)) bits.push(k + ': ' + v);
    });
  }
  return bits.join(' / ');
}
// An object with no Korean of its own (a quiz's answers) takes its context from the one holding it.
// A custom field (items.3.extra.0) sits two levels under its question, so the climb goes on
// until something has Korean in it, and stops at the question's own group.
function contextOf(body, p, obj) {
  let own = koreanOf(obj);
  let at = p || '';
  for (let up = 0; !own && at.indexOf('.') >= 0 && up < 3; up++) {
    at = at.split('.').slice(0, -1).join('.');
    const parent = getAt(body, at);
    own = parent && typeof parent === 'object' && !Array.isArray(parent) ? koreanOf(parent) : '';
  }
  return own;
}
function whereOf(body, p) {
  const ps = p ? p.split('.') : [];
  const bits = [];
  const ei = ps.indexOf('exercises');
  if (ei >= 0) {
    const ex = (body.exercises || [])[Number(ps[ei + 1])];
    if (ex) bits.push((ex.section || '') + ' · ' + (ex.no || '') + (ex.pattern ? ' (' + ex.pattern + ')' : ''));
  }
  const ii = ps.indexOf('items');
  if (ii >= 0) bits.push('question ' + (Number(ps[ii + 1]) + 1));
  const xi = ps.indexOf('extra');
  if (xi >= 0) bits.push('custom field ' + (Number(ps[xi + 1]) + 1));
  const qi = ps.indexOf('questions');
  if (qi >= 0) bits.push('quiz question ' + (Number(ps[qi + 1]) + 1));
  const wi = ps.indexOf('words');
  if (wi >= 0) bits.push('word ' + (Number(ps[wi + 1]) + 1));
  return bits.join(' · ') || '(file)';
}

// The text boxes a page's design places (js/richText.js blocks) carry their Vietnamese in
// block.vi and list the English they still need on block.enTodo — no catalogue involved.
function blocksOf(body) {
  const out = [];
  const add = (design, base) => ((design && Array.isArray(design.blocks)) ? design.blocks : [])
    .forEach((b, i) => out.push({ path: base + 'design.blocks.' + i, block: b }));
  add(body.design, '');
  (body.exercises || []).forEach((ex, i) => add(ex && ex.design, 'exercises.' + i + '.'));
  return out;
}
const blockList = (b, name) => (Array.isArray(b[name]) ? b[name] : []);

function status() {
  let todo = 0, sync = 0, ai = 0;
  files().forEach(({ rel }) => {
    const body = readJson(rel);
    const p = vi.pending(body);
    const bl = blocksOf(body);
    const t = p.filter((x) => x.state === 'todo').length + bl.reduce((n, { block }) => n + blockList(block, 'enTodo').length, 0);
    const s = p.filter((x) => x.state === 'sync').length;
    const a = vi.countAI(body) + bl.reduce((n, { block }) => n + blockList(block, 'enAI').length, 0);
    todo += t; sync += s; ai += a;
    if (t || s || a) console.log(rel.padEnd(36) + ' English to write ' + String(t).padStart(3) + '   drafts to file ' + String(s).padStart(3) + '   AI English unread ' + String(a).padStart(3));
  });
  console.log('\nTotal: ' + todo + ' English to write, ' + sync + ' drafts to file, ' + ai + ' AI English unread.');
  if (todo) console.log('Next: node scripts/vi_first.js todo --out <scratch>/todo.json — then fill each "en" and run apply.');
  else if (sync) console.log('Next: node scripts/vi_first.js settle');
}

function todo() {
  const out = [];
  files().forEach(({ rel }) => {
    const body = readJson(rel);
    const entries = catalogOf(rel);
    vi.pending(body).filter((x) => x.state === 'todo').forEach(({ path: p, field, obj }) => {
      out.push({
        file: rel,
        path: p,
        field,
        where: whereOf(body, p),
        ko: contextOf(body, p, obj),
        vi: vi.viOf(obj, field, entries),
        viBefore: vi.filedOf(obj, field, entries) || '',
        enBefore: typeof obj[field] === 'string' ? obj[field] : '',
        en: ''
      });
    });
    blocksOf(body).forEach(({ path: p, block }) => {
      blockList(block, 'enTodo').forEach((field) => {
        out.push({
          file: rel, path: p, field, kind: 'block',
          where: whereOf(body, p) + ' · ' + (block.heading || block.id || 'block'),
          ko: '',
          vi: (block.vi && block.vi[field]) || '',
          enBefore: typeof block[field] === 'string' ? block[field] : '',
          // A text block's field is HTML: keep the Vietnamese's own <b>, <i>, <mark> in the English.
          en: ''
        });
      });
    });
  });
  // The same Vietnamese over the same English is one line to write, wherever it appears — a
  // group name shared by forty words gets one English, not forty that might differ.
  const one = [];
  const seen = new Map();
  out.forEach((it) => {
    const k = [it.file, it.kind || '', it.field, it.vi, it.enBefore].join('\u0000');
    const first = seen.get(k);
    if (first && it.vi) { (first.also = first.also || []).push(it.path); return; }
    seen.set(k, it);
    one.push(it);
  });
  const dest = flag('--out');
  const text = JSON.stringify(one, null, 2) + '\n';
  if (dest) { fs.writeFileSync(dest, text); console.log(one.length + ' English line(s) to write → ' + dest); }
  else process.stdout.write(text);
}

// File every draft in one content file whose English is current: the Vietnamese into the
// catalogue under field|English, the draft out of the content file. A field the catalogue does
// not scan (English that is mostly Korean, say) keeps its Vietnamese inline — the game reads it
// there just as well — and is reported.
function settleFile(rel, entry, body) {
  const entries = {};
  const kept = [];
  const moves = [];
  vi.walk(body, (obj, p) => {
    Object.keys(obj).forEach((k) => {
      const field = vi.fieldOfDraft(k, obj);
      if (!field || typeof obj[k] !== 'string' || !obj[k].trim()) return;
      if (vi.list(obj, vi.TODO).indexOf(field) >= 0) return;
      const en = typeof obj[field] === 'string' ? obj[field].trim() : '';
      if (!en) return;
      const key = vi.key(field, en);
      if (entries[key] && entries[key] !== obj[k].trim()) {
        console.warn('  ! ' + rel + ' ' + p + '.' + field + ': the same English is drafted two ways; the later wins');
      }
      entries[key] = obj[k].trim();
      moves.push({ obj, k, key, p, field });
    });
  });
  if (!moves.length) return { filed: 0, kept: 0 };
  // The content file first: the catalogue only accepts keys whose English is in the file.
  const live = new Set(i18n.scanSource(ROOT, rel).strings.map((s) => s.key));
  const fileable = {};
  moves.forEach((m) => {
    if (live.has(m.key)) { fileable[m.key] = entries[m.key]; delete m.obj[m.k]; }
    else kept.push(rel + ' ' + m.p + '.' + m.field);
  });
  if (Object.keys(fileable).length) {
    writeContent(rel, entry, body);
    i18n.saveRows(ROOT, rel, 'vi', fileable);
  }
  i18n.pruneStale(ROOT, rel, 'vi');
  kept.forEach((k) => console.log('  = kept inline (not a catalogued string): ' + k));
  return { filed: Object.keys(fileable).length, kept: kept.length };
}

function apply(file) {
  if (!file || !fs.existsSync(file)) { console.error('apply needs the filled worklist: node scripts/vi_first.js apply todo.json'); process.exit(1); }
  const list = JSON.parse(fs.readFileSync(file, 'utf8'));
  const byFile = new Map();
  // A line the worklist folded together (`also`) is written at every place it stands.
  list.forEach((it) => [it.path].concat(Array.isArray(it.also) ? it.also : []).forEach((p) => {
    if (!byFile.has(it.file)) byFile.set(it.file, []);
    byFile.get(it.file).push(Object.assign({}, it, { path: p }));
  }));
  const reg = new Map(files().map((f) => [f.rel, f.entry]));
  let written = 0, unchanged = 0, skipped = 0, filed = 0;
  byFile.forEach((items, rel) => {
    const entry = reg.get(rel);
    if (!entry) { console.warn('  ! ' + rel + ' is not an editable content file — skipped'); skipped += items.length; return; }
    const body = readJson(rel);
    const entries = catalogOf(rel);
    items.forEach((it) => {
      const en = String(it.en || '').trim();
      const obj = getAt(body, it.path);
      if (!en) { skipped++; return; }
      if (it.kind === 'block') {
        if (!obj || blockList(obj, 'enTodo').indexOf(it.field) < 0) {
          console.warn('  ! ' + rel + ' ' + it.path + ' ' + it.field + ' is no longer waiting — skipped'); skipped++; return;
        }
        const before = typeof obj[it.field] === 'string' ? obj[it.field].trim() : '';
        obj[it.field] = en;
        const todoLeft = blockList(obj, 'enTodo').filter((f) => f !== it.field);
        if (todoLeft.length) obj.enTodo = todoLeft; else delete obj.enTodo;
        if (en !== before) {
          obj.enAI = blockList(obj, 'enAI').filter((f) => f !== it.field).concat([it.field]);
          written++;
        } else unchanged++;
        return;
      }
      if (!obj || typeof obj !== 'object' || vi.list(obj, vi.TODO).indexOf(it.field) < 0) {
        console.warn('  ! ' + rel + ' ' + it.path + '.' + it.field + ' is no longer waiting — skipped'); skipped++; return;
      }
      if (String(vi.viOf(obj, it.field, entries)).trim() !== String(it.vi || '').trim()) {
        console.warn('  ! ' + rel + ' ' + it.path + '.' + it.field + ': the Vietnamese changed since the worklist was made — skipped'); skipped++; return;
      }
      const before = typeof obj[it.field] === 'string' ? obj[it.field].trim() : '';
      // A Vietnamese edit that asked for a new English, or a request to have it written again,
      // may leave the English exactly as it was — then nothing is marked as machine-written.
      if (!vi.draftOf(obj, it.field)) {
        const filedVi = vi.filedOf(obj, it.field, entries);
        if (filedVi) obj[vi.viField(it.field)] = filedVi;
      }
      obj[it.field] = en;
      obj[vi.TODO] = vi.list(obj, vi.TODO).filter((f) => f !== it.field);
      if (!obj[vi.TODO].length) delete obj[vi.TODO];
      if (en !== before) {
        obj[vi.AI] = vi.list(obj, vi.AI).concat(vi.list(obj, vi.AI).indexOf(it.field) >= 0 ? [] : [it.field]);
        written++;
        // Formatting written over the old English no longer reads the same; its box and size stay.
        const spec = obj.fmt && obj.fmt[it.field];
        if (spec && spec.html && !rich.matches(spec.html, en)) {
          delete spec.html;
          if (!Object.keys(spec).length) delete obj.fmt[it.field];
          if (obj.fmt && !Object.keys(obj.fmt).length) delete obj.fmt;
        }
      } else unchanged++;
    });
    writeContent(rel, entry, body);
    const r = settleFile(rel, entry, readJson(rel));
    filed += r.filed;
  });
  console.log('English written: ' + written + ', kept as it was: ' + unchanged + ', skipped: ' + skipped + ', Vietnamese filed: ' + filed + '.');
  console.log('Next: npm run validate, npm test (or at least the unit\'s own suites), then commit when asked.');
}

function settle() {
  let filed = 0, kept = 0;
  files().forEach(({ rel, entry }) => {
    const r = settleFile(rel, entry, readJson(rel));
    filed += r.filed; kept += r.kept;
  });
  console.log('Vietnamese filed: ' + filed + (kept ? ', kept inline: ' + kept : '') + '.');
}

function ai() {
  const out = [];
  files().forEach(({ rel }) => {
    const body = readJson(rel);
    const entries = catalogOf(rel);
    vi.walk(body, (obj, p) => {
      vi.list(obj, vi.AI).forEach((field) => {
        out.push({ file: rel, path: p, field, where: whereOf(body, p), ko: koreanOf(obj), vi: vi.viOf(obj, field, entries), en: obj[field] || '' });
      });
    });
    blocksOf(body).forEach(({ path: p, block }) => {
      blockList(block, 'enAI').forEach((field) => {
        out.push({ file: rel, path: p, field, kind: 'block', where: whereOf(body, p), ko: '', vi: (block.vi && block.vi[field]) || '', en: block[field] || '' });
      });
    });
  });
  const dest = flag('--out');
  const text = JSON.stringify(out, null, 2) + '\n';
  if (dest) { fs.writeFileSync(dest, text); console.log(out.length + ' AI English line(s) → ' + dest); }
  else process.stdout.write(text);
}

function reviewed(file) {
  const list = JSON.parse(fs.readFileSync(file, 'utf8'));
  const reg = new Map(files().map((f) => [f.rel, f.entry]));
  const byFile = new Map();
  list.forEach((it) => { if (!byFile.has(it.file)) byFile.set(it.file, []); byFile.get(it.file).push(it); });
  let n = 0;
  byFile.forEach((items, rel) => {
    const body = readJson(rel);
    items.forEach((it) => {
      const obj = getAt(body, it.path);
      if (it.kind === 'block') {
        const left = obj ? blockList(obj, 'enAI').filter((f) => f !== it.field) : [];
        if (obj && left.length !== blockList(obj, 'enAI').length) { if (left.length) obj.enAI = left; else delete obj.enAI; n++; }
        return;
      }
      if (obj && vi.list(obj, vi.AI).indexOf(it.field) >= 0) { vi.markReviewed(obj, it.field); n++; }
    });
    writeContent(rel, reg.get(rel), body);
  });
  console.log(n + ' line(s) marked as read.');
}

if (require.main === module) {
  if (cmd === 'status') status();
  else if (cmd === 'todo') todo();
  else if (cmd === 'apply') apply(args[1]);
  else if (cmd === 'settle') settle();
  else if (cmd === 'ai') ai();
  else if (cmd === 'reviewed') reviewed(args[1]);
  else { console.error('Unknown command "' + cmd + '". See the header of scripts/vi_first.js.'); process.exit(1); }
}

module.exports = { files, settleFile, koreanOf, whereOf, ROOT };
