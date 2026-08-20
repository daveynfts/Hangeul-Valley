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
assert(files.some((f) => f.rel.startsWith('sprites/') && f.ctype === 'image/png'), 'PNG sprites are in the batch');

const flags = parsePublishArgs(['--dry-run', '--skip-deploy', '--env', '.env.local']);
assert(flags.dryRun && flags.skipDeploy && flags.envFile === '.env.local', 'parsePublishArgs reads flags');
let threw = false;
try { parsePublishArgs(['--nope']); } catch (e) { threw = /Unknown flag/.test(e.message); }
assert(threw, 'unknown flag is rejected');

console.log('\n====================================================');
console.log('RESULT: ' + passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
process.exit(failed ? 1 : 0);
