/**
 * verify_facts_json.js — facts.json must be exactly what its generator emits.
 *
 * facts.json is a generated artifact and the file's own header forbids editing it
 * by hand. The failure this guards against is quiet: `npm run validate` and
 * `npm test` both pass on a hand-edited facts.json, because neither regenerates
 * it. CI catches it (it re-runs the generator and diffs), which means the first
 * sign of trouble is a red build on main and a skipped publish — the content
 * never reaches the CDN.
 *
 * The naive local version of this check does not work:
 *
 *   node scripts/build_facts_json.js && git diff --exit-code -- facts.json
 *
 * The generator overwrites facts.json before the diff runs, so an *uncommitted*
 * hand-edit is silently repaired and the check reports success. It only fails
 * once the bad file is already committed, which is exactly too late.
 *
 * So: read the file first, regenerate, compare against what was read. That
 * reports the mismatch whether or not it has been committed, and leaves the
 * corrected file on disk so the fix is one `git add` away.
 *
 * Run:  node scripts/verify_facts_json.js   (or npm run verify:facts)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const FACTS = path.join(ROOT, 'facts.json');
const GEN = path.join(__dirname, 'build_facts_json.js');

if (!fs.existsSync(FACTS)) {
  console.error('verify:facts — facts.json is missing; run node scripts/build_facts_json.js');
  process.exit(1);
}

const before = fs.readFileSync(FACTS);

try {
  execFileSync(process.execPath, [GEN], { cwd: ROOT, stdio: 'pipe' });
} catch (e) {
  // The generator has its own guard: it aborts, listing curated entries that
  // match no word in levels.json. That is the message worth showing.
  const out = [e.stdout, e.stderr].filter(Boolean).map(String).join('');
  console.error(out.trim() || ('verify:facts — the generator failed: ' + (e && e.message)));
  process.exit(1);
}

const after = fs.readFileSync(FACTS);

if (before.equals(after)) {
  console.log('verify:facts — facts.json matches its generator ✓');
  process.exit(0);
}

// Say which keys moved, not just that something did: a respelled headword is the
// usual cause and naming it points straight at the curated table to fix.
let detail = '';
try {
  const a = JSON.parse(before.toString('utf8'));
  const b = JSON.parse(after.toString('utf8'));
  const ka = Object.keys(a), kb = Object.keys(b);
  const gone = ka.filter(k => !(k in b));
  const added = kb.filter(k => !(k in a));
  const changed = ka.filter(k => k in b && JSON.stringify(a[k]) !== JSON.stringify(b[k]));
  const show = (label, list) => list.length
    ? '\n  ' + label + ' (' + list.length + '): ' + list.slice(0, 10).join(', ')
      + (list.length > 10 ? ', …' : '')
    : '';
  detail = show('only in the committed file', gone)
         + show('only in the generated file', added)
         + show('different value', changed);
} catch (_) { /* a malformed file is still a failure; the byte compare said so */ }

console.error('verify:facts — facts.json did NOT match its generator.' + detail
  + '\n\nIt has been regenerated in place, so `git diff facts.json` now shows what was'
  + '\nwrong. facts.json is generated: fix the curated tables in'
  + '\nscripts/build_facts_json.js rather than the artifact, then re-run.');
process.exit(1);
