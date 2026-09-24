/**
 * tests/test_cache_headers.js — the game's own code is always fresh, and still cacheable.
 *
 * The scripts and stylesheets index.html loads have plain names (js/ui.js, css/game.css), so
 * a browser holding one past a deploy would run it against the new versions of everything
 * else. Each has to be revalidated before every use. That is all `no-store` was for, and it
 * cost more than it bought: a browser may not keep a no-store response at all, so every
 * visit downloaded all 34 files again (~450 KB gzipped), identical or not. `no-cache` keeps
 * them and asks first; Vercel answers an unchanged file with a 304.
 *
 * This reads vercel.json the way Vercel applies it and checks both halves for every local
 * file the page loads.
 *
 * Run: node tests/test_cache_headers.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

// What Vercel sends for a static file no rule names.
const VERCEL_DEFAULT = 'public, max-age=0, must-revalidate';

// A `source` in vercel.json's path-to-regexp syntax, for the forms this file uses:
// literal paths, `(.*)` wildcards and `(a|b)` alternatives.
function sourceToRegExp(src) {
  const WILD = '\u0000';
  const body = src.replace(/\(\.\*\)/g, WILD).replace(/[.+?^${}[\]\\]/g, '\\$&').split(WILD).join('.*');
  return new RegExp('^' + body + '$');
}

const vercel = JSON.parse(read('vercel.json'));
function cacheControlFor(urlPath) {
  let value = VERCEL_DEFAULT;
  for (const rule of vercel.headers || []) {
    if (!sourceToRegExp(rule.source).test(urlPath)) continue;
    const h = (rule.headers || []).find((x) => x.key.toLowerCase() === 'cache-control');
    if (h) value = h.value;
  }
  return value;
}
const revalidated = (v) => /\bno-cache\b/.test(v) || /\bno-store\b/.test(v) ||
  (/\bmax-age=0\b/.test(v) && /\bmust-revalidate\b/.test(v));
const storable = (v) => !/\bno-store\b/.test(v);

console.log('====================================================');
console.log('GAME CODE IS REVALIDATED, NOT RE-DOWNLOADED');
console.log('====================================================');

// ── 1. Every local script and stylesheet ─────────────────────────────────────
console.log('\n--- 1. What index.html loads ---');
const html = read('index.html');
const local = [
  ...html.matchAll(/<script src="([^"]+)"/g),
  ...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)
].map((m) => m[1].split('?')[0]).filter((s) => !/:\/\//.test(s));
assert(local.length > 20, local.length + ' local scripts and stylesheets');

const byHeader = new Map();
for (const rel of local) {
  const v = cacheControlFor('/' + rel);
  if (!byHeader.has(v)) byHeader.set(v, []);
  byHeader.get(v).push(rel);
}
for (const [v, rels] of byHeader) {
  const folders = [...new Set(rels.map((r) => r.split('/')[0] + '/'))].join(', ');
  const count = rels.length === 1 ? '1 file in ' + folders + ' is' : rels.length + ' files in ' + folders + ' are';
  assert(revalidated(v), count + ' checked before every use (' + v + ')');
  assert(storable(v), 'and a browser may keep them, so an unchanged one comes back as a 304');
}

// ── 2. The page itself ───────────────────────────────────────────────────────
console.log('\n--- 2. The page that names them ---');
for (const p of ['/', '/index.html']) {
  const v = cacheControlFor(p);
  assert(revalidated(v), p + ' is never used from a cache unchecked (' + v + ')');
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
