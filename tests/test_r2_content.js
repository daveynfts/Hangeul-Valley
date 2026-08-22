/**
 * tests/test_r2_content.js — publish file list is catalogs + shipped PNGs, no dupes.
 *
 * Run: node tests/test_r2_content.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { collectUploadFiles, missingRequired, parsePublishArgs, REQUIRED_RELS, PREFIX } = require('../scripts/r2Content');

const ROOT = path.join(__dirname, '..');

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

console.log('====================================================');
console.log('R2 PUBLISH FILE LIST');
console.log('====================================================\n');

const files = collectUploadFiles(ROOT);
const rels = files.map((f) => f.rel);
const set = new Set(rels);

assert(missingRequired(ROOT).length === 0, 'required JSON files exist on disk');
REQUIRED_RELS.forEach((rel) => {
  assert(set.has(rel), 'list includes ' + rel);
});

assert(PREFIX === 'hangeul-valley/', 'R2 key prefix is hangeul-valley/');
assert(rels.length === set.size, 'no duplicate rels (' + rels.length + ')');
assert(files.every((f) => f.rel.indexOf('..') < 0), 'no path traversal in rels');
assert(files.every((f) => f.rel.indexOf('\\') < 0), 'rels are posix');

const spriteCat = JSON.parse(fs.readFileSync(path.join(ROOT, 'sprites', 'catalog.json'), 'utf8'));
const shipped = (spriteCat.assets || []).filter((a) => a && a.status === 'shipped' && a.path);
assert(shipped.length > 0, 'sprite catalog has shipped assets');
shipped.forEach((a) => {
  const rel = 'sprites/' + String(a.path).replace(/\\/g, '/');
  assert(set.has(rel), 'shipped ' + rel);
});

const skinCat = JSON.parse(fs.readFileSync(path.join(ROOT, 'skins', 'catalog.json'), 'utf8'));
(skinCat.skins || []).filter((s) => s && s.art === 'hd').forEach((s) => {
  const folder = String(s.folder || '').replace(/\\/g, '/');
  (s.files || []).forEach((name) => {
    assert(set.has('sprites/' + folder + '/' + name), s.id + ' hd ' + name);
  });
});

assert(set.has('worlds/unit10-layout.json'), 'Unit 10 layout is in the batch');
assert(set.has('diner/content.json'), 'diner content is in the batch');

// vercel.json rewrites /worlds/* to the CDN, so in production the repo copy of a
// world file is never read — only the uploaded one is. A file left out of the
// batch does not fall back to the checked-in version, it 404s, and the feature
// that reads it goes quietly missing for everyone. The upload list is hand-kept,
// so this is the check that catches the next one somebody forgets.
const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const worldsGoToCdn = (vercel.rewrites || []).some((r) =>
  /^\/worlds\//.test(r.source || '') && /cdn\./.test(r.destination || ''));
assert(worldsGoToCdn, 'vercel.json still serves /worlds/* from the CDN');
fs.readdirSync(path.join(ROOT, 'worlds'))
  .filter((f) => f.endsWith('.json'))
  .forEach((f) => {
    assert(set.has('worlds/' + f), 'worlds/' + f + ' is uploaded, so production can read it');
  });

// Same trap for the book recordings the workbook plays: /audio/* is rewritten to
// the CDN too, so a clip the content names but the batch omits is a play button
// that does nothing on the deployed site.
const workbook = JSON.parse(fs.readFileSync(path.join(ROOT, 'worlds', 'unit14-workbook.json'), 'utf8'));
(workbook.exercises || []).filter((e) => e.audio && e.audio.src).forEach((e) => {
  assert(fs.existsSync(path.join(ROOT, e.audio.src)), e.audio.src + ' exists on disk');
  assert(set.has(e.audio.src), e.audio.src + ' is uploaded, so the play button works on prod');
});
assert(files.some((f) => f.rel.startsWith('sprites/') && f.ctype === 'image/png'), 'PNG sprites are in the batch');

const flags = parsePublishArgs(['--dry-run', '--skip-deploy', '--env', '.env.local']);
assert(flags.dryRun && flags.skipDeploy && flags.envFile === '.env.local', 'parsePublishArgs reads flags');
let threw = false;
try { parsePublishArgs(['--nope']); } catch (e) { threw = /Unknown flag/.test(e.message); }
assert(threw, 'unknown flag is rejected');

const publishYml = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'publish.yml'), 'utf8');
const ciYml = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8');
assert(/^name: CI\s*$/m.test(ciYml), 'CI workflow is named CI (publish listens for that name)');
assert(/workflow_run:/.test(publishYml), 'publish.yml auto-runs after CI');
assert(/workflows:\s*\[CI\]/.test(publishYml), 'publish.yml listens for the CI workflow');
assert(/workflow_dispatch:/.test(publishYml), 'publish.yml still allows a manual run');
assert(/head_branch == 'main'/.test(publishYml), 'auto-publish is limited to main');
assert(/npm run publish:prod/.test(publishYml), 'publish job runs publish:prod');
assert(/github\.event\.workflow_run\.head_sha/.test(publishYml), 'auto-publish checks out the CI commit');
assert(!/Require Vercel deploy hook/.test(publishYml), 'missing deploy hook does not fail the job');
assert(/VERCEL_TOKEN/.test(publishYml), 'publish job can use Vercel CLI token');

console.log('\n====================================================');
console.log('RESULT: ' + passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
process.exit(failed ? 1 : 0);
