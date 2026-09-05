/**
 * tests/test_save_precedence.js — which of the two save copies wins on load, and that a
 * queued cloud upload cannot land out of order.
 *
 * Both behaviours used to be wrong in ways no test could see:
 *
 *   - loadSave() always preferred the pywebview file. flushSave() writes localStorage
 *     synchronously and then awaits the bridge, and `pagehide` cannot await, so closing
 *     the window right after a save left the file one write behind — and the next launch
 *     loaded the stale one.
 *   - pushCloudSave() fired PUTs without serialising them and swallowed every error, so a
 *     request delayed in flight could overwrite newer progress and nothing reported it.
 *
 * Run: node tests/test_save_precedence.js
 */

'use strict';

const vm = require('vm');
const { readGameSource } = require('../scripts/gameSource');

const src = readGameSource();

// The cloud-write block speaks through hvT now, so every sandbox below needs the real one
// over the shipped English table — a stub would answer with the key, and the assertions here
// are about what the player is told.
const path = require('path');
const i18n = require('../js/i18n.js');
i18n.hvRegisterLocale('en',
  require('../admin/lib/i18n.js').readChromeTable(path.join(__dirname, '..'), 'en'));
const hvT = i18n.hvT;
let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}
function eq(actual, expected, msg) {
  assert(actual === expected, msg + ' (got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected) + ')');
}

function extract(startMarker, endMarker, label) {
  const a = src.indexOf(startMarker);
  if (a < 0) throw new Error('could not find ' + label + ' start: ' + startMarker);
  const b = src.indexOf(endMarker, a);
  if (b < 0) throw new Error('could not find ' + label + ' end: ' + endMarker);
  return src.slice(a, b + endMarker.length);
}

// ── 1. Save precedence ───────────────────────────────────────────────────────
console.log('\n--- 1. Which copy wins on load ---');

const precedence = extract(
  '// ── Save precedence (pure) ─',
  '// ── Save precedence end ─',
  'save precedence'
);
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(precedence, ctx);
const order = vm.runInContext('orderSaveCandidates', ctx);
const stamp = vm.runInContext('saveStamp', ctx);

const S = (updatedAt, tag) => ({ updatedAt, tag, v: 9 });

let picked = order(S(1000, 'file'), S(2000, 'local'));
eq(picked[0].src, 'localStorage', 'a newer localStorage copy wins over a stale file');
eq(picked[0].data.tag, 'local', 'and it is the actual newer payload that gets applied');
eq(picked.length, 2, 'the older copy is kept as a fallback, not discarded');
eq(picked[1].src, 'file', 'with the file second');

picked = order(S(2000, 'file'), S(1000, 'local'));
eq(picked[0].src, 'file', 'a newer file wins over a stale localStorage copy');

picked = order(S(2000, 'file'), S(2000, 'local'));
eq(picked[0].src, 'file', 'a tie goes to the file — the copy that survives a profile reset');

picked = order(null, S(1000, 'local'));
eq(picked.length, 1, 'with no save file there is one candidate');
eq(picked[0].src, 'localStorage', 'and it is localStorage — the browser build');

picked = order(S(1000, 'file'), null);
eq(picked[0].src, 'file', 'with no localStorage the file is used');

eq(order(null, null).length, 0, 'no copies at all yields no candidates (fresh start)');

// A legacy save predating the updatedAt field must not beat a stamped one.
picked = order({ v: 8, tag: 'legacy-file' }, S(1, 'local'));
eq(picked[0].src, 'localStorage', 'an unstamped legacy copy loses to any stamped copy');
eq(stamp({ v: 8 }), 0, 'a missing updatedAt reads as 0 rather than NaN');
eq(stamp(null), 0, 'and so does a null save');
eq(stamp({ updatedAt: 'nope' }), 0, 'a non-numeric updatedAt is not trusted');

// Garbage from a half-written file must not be treated as a candidate.
eq(order('not an object', S(5, 'local')).length, 1, 'a non-object file copy is ignored');
eq(order(S(5, 'file'), 42).length, 1, 'a non-object localStorage copy is ignored');

// ── 2. Cloud uploads are serialized and coalesced ────────────────────────────
console.log('\n--- 2. Cloud uploads run one at a time ---');

// pushCloudSave leans on module state (getGoogleToken, cloudSaveRequest, showToast), so
// the block is run against stubs rather than the live network.
const cloudBlock = extract(
  '// ── Cloud writes, serialized ─',
  '// ── Cloud writes end ─',
  'cloud write chain'
);

const sent = [];
let inFlight = 0;
let maxConcurrent = 0;
const cctx = {
  console,
  getGoogleToken: () => 'stub-token',
  setGoogleSession: () => {},
  showToast: () => {}, hvT,
  // Slower for the first call, so a naive implementation would let #2 overtake #1.
  cloudSaveRequest: async (method, body) => {
    inFlight++;
    maxConcurrent = Math.max(maxConcurrent, inFlight);
    await new Promise(r => setTimeout(r, body.delay || 0));
    inFlight--;
    sent.push(body.tag);
    return { status: 200, json: { ok: true } };
  }
};
vm.createContext(cctx);
vm.runInContext(cloudBlock, cctx);
const push = vm.runInContext('pushCloudSave', cctx);

(async () => {
  const a = push({ tag: 'A', delay: 40 });
  const b = push({ tag: 'B', delay: 0 });
  const c = push({ tag: 'C', delay: 0 });
  const results = await Promise.all([a, b, c]);

  eq(maxConcurrent, 1, 'never more than one PUT in flight');
  assert(sent.length >= 1, 'at least one upload actually went out');
  eq(sent[sent.length - 1], 'C', 'the newest payload is the last thing written');
  assert(!sent.includes('A') || sent.indexOf('A') < sent.indexOf('C'),
    'an earlier payload can never land after a later one');
  assert(results.every(r => r && (r.ok === true)), 'every caller gets a resolved result');
  assert(results.some(r => r.skipped), 'superseded payloads are skipped, not re-sent');

  // A failure has to reach the caller — this is what the Save button reads.
  const fctx = {
    console,
    getGoogleToken: () => 'stub-token',
    setGoogleSession: () => {},
    showToast: () => {}, hvT,
    cloudSaveRequest: async () => { throw new Error('offline'); }
  };
  vm.createContext(fctx);
  vm.runInContext(cloudBlock, fctx);
  const failRes = await vm.runInContext('pushCloudSave', fctx)({ tag: 'X' });
  eq(failRes.ok, false, 'a network error is reported, not swallowed');
  eq(failRes.reason, 'network error', 'and it says what went wrong');

  const sctx = {
    console,
    getGoogleToken: () => 'stub-token',
    setGoogleSession: () => {},
    showToast: () => {}, hvT,
    cloudSaveRequest: async () => ({ status: 409, json: { error: 'stale save' } })
  };
  vm.createContext(sctx);
  vm.runInContext(cloudBlock, sctx);
  const staleRes = await vm.runInContext('pushCloudSave', sctx)({ tag: 'Y' });
  eq(staleRes.ok, false, 'a 409 from the server is a failure, not a silent success');
  eq(staleRes.reason, 'cloud has newer progress', 'and it names the other device as the reason');
})().then(runSignedOut).catch((e) => {
  console.error('  [FAIL] cloud chain test threw: ' + (e && e.message));
  failed++;
  finish();
});

function runSignedOut() {
  const octx = {
    console,
    getGoogleToken: () => '',
    setGoogleSession: () => {},
    showToast: () => {}, hvT,
    cloudSaveRequest: async () => { throw new Error('must not be called when signed out'); }
  };
  vm.createContext(octx);
  vm.runInContext(cloudBlock, octx);
  const res = vm.runInContext('pushCloudSave', octx)({ tag: 'Z' });
  eq(res.skipped, true, 'signed out: nothing is uploaded');
  eq(res.ok, true, 'and that is not reported to the player as a failure');
  finish();
}

function finish() {
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
}
