/**
 * tests/test_desktop_allowlist.js — the desktop build serves everything the game fetches.
 *
 * main.py serves an allowlist rather than the repo root, so a folder the game reads has to be
 * named in it or its files 404 on desktop. `locales/` never was: every translation catalogue
 * 404'd, and the desktop build showed level names, glosses and whole units in English under
 * the Vietnamese interface. tests/test_desktop_server.py checks what main.py serves, but it
 * needs Python, and it only knew the folders someone had thought to list.
 *
 * This reads the other side — the folders vercel.json serves from the CDN, and the catalogue
 * path js/i18n.js builds — and requires the allowlist to cover every one. No Python needed.
 *
 * Run: node tests/test_desktop_allowlist.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

// The two frozensets in main.py, read as the strings they hold.
const py = read('main.py');
function frozenset(name) {
  const m = new RegExp(name + '\\s*=\\s*frozenset\\(\\{([\\s\\S]*?)\\}\\)').exec(py);
  if (!m) throw new Error('main.py no longer defines ' + name);
  return [...m[1].replace(/#.*$/gm, '').matchAll(/'([^']+)'/g)].map((x) => x[1]);
}
const files = frozenset('ALLOWED_FILES');
const dirs = frozenset('ALLOWED_DIRS');
const allowed = (rel) => files.includes(rel) || dirs.includes(rel.split('/')[0]);

console.log('====================================================');
console.log('DESKTOP ALLOWLIST COVERS WHAT THE GAME FETCHES');
console.log('====================================================');

// ── 1. Everything vercel.json serves from the CDN ─────────────────────────────
console.log('\n--- 1. The CDN-backed paths ---');
const vercel = JSON.parse(read('vercel.json'));
const cdn = (vercel.rewrites || []).filter((r) => /^https:\/\/cdn\./.test(r.destination));
assert(cdn.length >= 5, 'vercel.json rewrites ' + cdn.length + ' paths to the CDN');
cdn.forEach((r) => {
  const rel = r.source.replace(/^\//, '').replace(/\/:path\*$/, '');
  // /sprite-preview is the admin's alias for sprites/, not a path the game asks for.
  if (rel === 'sprite-preview') return;
  assert(allowed(rel) || allowed(rel + '/x'), 'desktop serves ' + r.source + ' too');
});

// ── 2. The catalogue path the game builds ────────────────────────────────────
console.log('\n--- 2. Translation catalogues ---');
const i18n = read('js/i18n.js');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(i18n.slice(i18n.indexOf('function hvCatalogPath('), i18n.indexOf('// ═══════════════ CURRENT LANGUAGE')), ctx);
const catalog = vm.runInContext('hvCatalogPath("worlds/2b-unit-10.json", "vi")', ctx);
assert(/^locales\//.test(catalog), 'the game fetches catalogues from ' + catalog);
assert(allowed(catalog), 'and the desktop allowlist serves that folder');
assert(fs.existsSync(path.join(ROOT, catalog)), 'which is a real file in the repo');

// ── 3. The page's own scripts ────────────────────────────────────────────────
console.log('\n--- 3. Every local script index.html loads ---');
const html = read('index.html');
const srcs = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]).filter((s) => !/:\/\//.test(s));
assert(srcs.length > 20, srcs.length + ' local scripts');
const missing = srcs.map((s) => s.split('?')[0]).filter((s) => !allowed(s));
assert(missing.length === 0, 'all of them are in allowed folders' + (missing.length ? ': ' + missing.join(', ') : ''));

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
