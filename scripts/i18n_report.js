'use strict';

/**
 * What is translated, what is not, and what has gone stale — from the command line.
 *
 *   node scripts/i18n_report.js               coverage for every language
 *   node scripts/i18n_report.js --lang vi     one language
 *   node scripts/i18n_report.js --todo        list the untranslated strings, longest first
 *   node scripts/i18n_report.js --stale       list catalogue entries whose English moved on
 *   node scripts/i18n_report.js --prune       delete those entries (asks for nothing; say it twice)
 *   node scripts/i18n_report.js --reindex     rewrite js/locales/catalogs.js from disk
 *   node scripts/i18n_report.js --json        the report as JSON, for scripting
 *
 * The same numbers the admin's Translate tab shows, from the same library, because a second
 * count computed a second way is a second thing that can be wrong.
 */

const path = require('path');
const i18n = require('../admin/lib/i18n');

const ROOT = path.join(__dirname, '..');
const argv = process.argv.slice(2);
const has = (flag) => argv.indexOf(flag) >= 0;
const valueOf = (flag, fallback) => {
  const at = argv.indexOf(flag);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};

const LANGS = has('--lang') ? [valueOf('--lang', 'vi')] : i18n.LANG_CODES;

function bar(done, total, width) {
  const w = width || 24;
  const filled = total ? Math.round((done / total) * w) : w;
  return '[' + '█'.repeat(filled) + '·'.repeat(w - filled) + ']';
}

function coverage(lang) {
  const rep = i18n.report(ROOT, lang);
  if (has('--json')) { console.log(JSON.stringify(rep, null, 2)); return rep; }

  console.log(`\n  ${lang.toUpperCase()} — ${rep.totals.done}/${rep.totals.total} strings`
    + ` (${rep.totals.percent}%), ${rep.totals.todoWords.toLocaleString()} words to go`
    + (rep.totals.stale ? `, ${rep.totals.stale} stale` : ''));
  console.log('  ' + '─'.repeat(74));
  let group = '';
  rep.files.forEach((f) => {
    if (f.group !== group) { group = f.group; console.log(`  ${group}`); }
    const pct = f.total ? Math.round((f.done / f.total) * 100) : 100;
    console.log('    ' + bar(f.done, f.total) + ' '
      + String(pct + '%').padStart(4) + '  '
      + `${f.done}/${f.total}`.padStart(9) + '  '
      + f.label + (f.stale ? `  ⚠ ${f.stale} stale` : ''));
  });
  return rep;
}

function listTodo(lang) {
  console.log(`\n  Untranslated in ${lang}, longest first:\n`);
  let n = 0;
  i18n.report(ROOT, lang).files.forEach((f) => {
    if (f.done >= f.total) return;
    const { rows } = i18n.rows(ROOT, f.source, lang);
    const todo = rows.filter((r) => !r.done).sort((a, b) => b.text.length - a.text.length);
    if (!todo.length) return;
    console.log(`  ── ${f.label} (${todo.length})`);
    todo.slice(0, 10).forEach((r) => {
      n++;
      console.log(`     ${r.field.padEnd(14)} ${r.text.slice(0, 96).replace(/\s+/g, ' ')}`);
    });
    if (todo.length > 10) console.log(`     … and ${todo.length - 10} more`);
  });
  if (!n) console.log('  Nothing left.');
}

function listStale(lang, prune) {
  let total = 0;
  i18n.report(ROOT, lang).files.forEach((f) => {
    if (!f.stale) return;
    const { stale } = i18n.rows(ROOT, f.source, lang);
    console.log(`\n  ── ${f.label} (${stale.length})`);
    stale.forEach((s) => {
      total++;
      console.log(`     ${s.field.padEnd(12)} was: ${s.text.slice(0, 70).replace(/\s+/g, ' ')}`);
      console.log(`     ${''.padEnd(12)}  vi: ${String(s.target).slice(0, 70).replace(/\s+/g, ' ')}`);
    });
    if (prune) {
      const r = i18n.pruneStale(ROOT, f.source, lang);
      console.log(`     removed ${r.removed}`);
    }
  });
  if (!total) console.log('\n  Nothing stale — every translation still matches its English.');
  else if (!prune) console.log(`\n  ${total} stale. Re-check them in the Translate tab, or drop them with --prune.`);
}

function main() {
  if (has('--reindex')) {
    const index = i18n.writeCatalogIndex(ROOT);
    Object.keys(index).forEach((l) => console.log('  ' + l + ': ' + index[l].length + ' catalogues'));
    return;
  }
  LANGS.forEach((lang) => {
    if (has('--todo')) { listTodo(lang); return; }
    if (has('--stale') || has('--prune')) { listStale(lang, has('--prune')); return; }
    coverage(lang);
  });
  if (!has('--json')) console.log('');
}

if (require.main === module) main();
module.exports = { coverage, listTodo, listStale };
