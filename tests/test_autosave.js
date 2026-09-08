/**
 * tests/test_autosave.js — the three ways a session's last stretch of play used to be lost.
 *
 * None of them threw, and none of them showed up in a run that only checks a save round-trips:
 *
 *   - persistSave() restarted its 800ms debounce on every call, and ~35 places call it,
 *     one of them being every quiz answer. Changes arriving closer together than the debounce
 *     postponed the write for as long as they kept arriving, so a player working steadily
 *     could have minutes of progress in memory and nothing on disk.
 *   - A cloud upload that failed was only ever retried by the next thing the player did.
 *     Go offline, play one more round, stop — and the last push was gone, because nothing
 *     calls the cloud again until the next page load.
 *   - flushSave() only *starts* the cloud PUT, and a page being torn down takes its pending
 *     requests with it. The end of every session reached localStorage and nowhere else.
 *
 * Run: node tests/test_autosave.js
 */

'use strict';

const path = require('path');
const vm = require('vm');
const { readGameSource } = require('../scripts/gameSource');

const src = readGameSource();

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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const scheduling = extract(
  '// ── Autosave scheduling ─',
  '// ── Autosave scheduling end ─',
  'autosave scheduling'
);
const cloudBlock = extract(
  '// ── Cloud writes, serialized ─',
  '// ── Cloud writes end ─',
  'cloud writes'
);

/** A sandbox holding just enough browser for the scheduling block to run.
 *
 *  `speed` shortens the two timing constants in the copy that runs here. The shipped waits
 *  are 800ms and 10s, and sitting through them would put eleven seconds into `npm test` to
 *  prove something a tenth of that proves just as well. The real values are asserted
 *  separately, on the relationship that has to hold between them. */
function schedulingContext(opts) {
  const o = opts || {};
  const listeners = {};
  const stored = {};
  const ctx = {
    console,
    setTimeout, clearTimeout, Date,
    flushes: [], beacons: [], files: [],
    localStorage: {
      setItem: (k, v) => { if (o.storageThrows) throw new Error('quota'); stored[k] = v; },
      getItem: (k) => (k in stored ? stored[k] : null)
    },
    window: {
      addEventListener: (name, fn) => { (listeners[name] = listeners[name] || []).push(fn); },
      pywebview: o.pywebview ? { api: { save: (d) => { ctx.files.push(d); return true; } } } : undefined
    },
    document: { addEventListener: (name, fn) => { (listeners[name] = listeners[name] || []).push(fn); },
      visibilityState: 'visible' },
    collectSave: () => ({ v: 10, tag: ctx.tag, updatedAt: Date.now() }),
    pushCloudSave: async (d) => { ctx.flushes.push(d); return { ok: true }; },
    beaconCloudSave: (d) => { ctx.beacons.push(d); return true; },
    tag: 'a',
    fire: (name) => (listeners[name] || []).forEach((fn) => fn())
  };
  vm.createContext(ctx);
  let block = scheduling;
  if (o.speed) {
    block = block.replace('const SAVE_DEBOUNCE_MS = 800;', 'const SAVE_DEBOUNCE_MS = ' + o.speed.debounce + ';')
                 .replace('const SAVE_MAX_WAIT_MS = 10000;', 'const SAVE_MAX_WAIT_MS = ' + o.speed.maxWait + ';');
    if (block === scheduling) throw new Error('the timing constants moved — this rewrite no longer applies');
  }
  vm.runInContext(block, ctx);
  return ctx;
}

(async () => {
  // ── 1. The debounce cannot be starved ──────────────────────────────────────
  console.log('\n--- 1. A steady stream of changes still gets written ---');
  {
    const shipped = schedulingContext();
    assert(vm.runInContext('SAVE_MAX_WAIT_MS', shipped) > vm.runInContext('SAVE_DEBOUNCE_MS', shipped),
      'the shipped ceiling is longer than the shipped debounce, so a lone change still coalesces');

    const ctx = schedulingContext({ speed: { debounce: 200, maxWait: 700 } });
    const persist = vm.runInContext('persistSave', ctx);
    const maxWait = vm.runInContext('SAVE_MAX_WAIT_MS', ctx);

    // A change every 50ms against a 200ms debounce: the shape that used to defer the write
    // for as long as the player kept playing, because each one restarted the timer.
    const started = Date.now();
    const beat = setInterval(persist, 50);
    persist();
    await sleep(maxWait + 300);
    clearInterval(beat);

    assert(ctx.flushes.length >= 1,
      'the write happened despite changes never pausing (' + ctx.flushes.length + ' writes)');
    const elapsed = Date.now() - started;
    assert(elapsed <= maxWait * 2,
      'and it happened within the ceiling rather than waiting for a lull (' + elapsed + 'ms)');
    assert(ctx.localStorage.getItem('hv_save_v2') !== null, 'localStorage holds a copy');
  }

  // ── 2. A quiet change still waits for the debounce ─────────────────────────
  console.log('\n--- 2. A single change is still coalesced, not written instantly ---');
  {
    const ctx = schedulingContext();
    const persist = vm.runInContext('persistSave', ctx);
    persist(); persist(); persist();
    eq(ctx.flushes.length, 0, 'nothing is written while the burst is still arriving');
    await sleep(vm.runInContext('SAVE_DEBOUNCE_MS', ctx) + 250);
    eq(ctx.flushes.length, 1, 'and the burst produces exactly one write');
  }

  // ── 3. Teardown sends the cloud copy, not just the local one ───────────────
  console.log('\n--- 3. Closing the page does not strand the last write ---');
  {
    const ctx = schedulingContext({ pywebview: true });
    vm.runInContext('persistSave', ctx)();
    ctx.fire('pagehide');
    eq(ctx.beacons.length, 1, 'pagehide hands the snapshot to the keepalive request');
    eq(ctx.files.length, 1, 'and the desktop file write is started too');
    assert(ctx.localStorage.getItem('hv_save_v2') !== null, 'and localStorage is written synchronously');
    eq(ctx.flushes.length, 0, 'the ordinary cloud push is not also fired — one copy, one route');

    // And the pending write is now clear, so a second teardown event does not send it twice.
    ctx.fire('beforeunload');
    eq(ctx.beacons.length, 1, 'a second teardown event sends nothing: there is nothing pending');
  }

  console.log('\n--- 4. A backgrounded tab writes, but is not treated as gone ---');
  {
    const ctx = schedulingContext();
    vm.runInContext('persistSave', ctx)();
    ctx.document.visibilityState = 'hidden';
    ctx.fire('visibilitychange');
    await sleep(30);
    eq(ctx.beacons.length, 0, 'hidden is not gone, so no keepalive request is spent');
    eq(ctx.flushes.length, 1, 'the ordinary write runs instead');
  }

  console.log('\n--- 5. A failed local write still clears the pending flag ---');
  {
    // Quota errors are the one way localStorage fails in the wild. The write is lost either
    // way; what must not happen is the failure taking the cloud leg down with it.
    const ctx = schedulingContext({ storageThrows: true });
    await vm.runInContext('flushSave', ctx)();
    eq(ctx.flushes.length, 1, 'the cloud push still goes out when localStorage refuses');
  }

  // ── 6. Which failures are worth another go ─────────────────────────────────
  console.log('\n--- 6. Retryable failures, and the ones that are not ---');
  {
    const ctx = cloudContext(async () => ({ status: 200 }));
    const retryable = vm.runInContext('cloudPushIsRetryable', ctx);
    assert(retryable('network'), 'no network: retry');
    assert(retryable('timeout'), 'a timeout: retry');
    assert(retryable('http:500'), 'a server fault: retry');
    assert(retryable('http:503'), 'a deploy in progress: retry');
    assert(retryable('http:429'), 'rate limited: retry');
    assert(!retryable('http:400'), 'a bad request will be bad next time too');
    assert(!retryable('signed-out'), 'signing out needs the player, not a timer');
    assert(!retryable('stale'), 'a 409 means another device is ahead — resending loses again');
    assert(!retryable(''), 'and no reason at all is not a reason to retry');
  }

  // ── 7. A failed upload retries itself ──────────────────────────────────────
  console.log('\n--- 7. The upload gets another go without the player doing anything ---');
  {
    let attempts = 0;
    const ctx = cloudContext(async () => {
      attempts++;
      if (attempts === 1) throw Object.assign(new Error('offline'), { name: 'TypeError' });
      return { status: 200 };
    });
    // A short backoff so the test does not sit through the shipped one.
    vm.runInContext('CLOUD_PUSH_RETRY_MS.length = 0; CLOUD_PUSH_RETRY_MS.push(30, 60);', ctx);
    const r = await vm.runInContext('pushCloudSave', ctx)({ tag: 'A' });
    eq(r.ok, false, 'the first attempt is reported as the failure it was');
    await sleep(220);
    eq(attempts, 2, 'and a second attempt happened on its own');
    assert(ctx.toasts.some((t) => /cloud|đám mây|uploaded/i.test(t)),
      'the player is told the backlog cleared: ' + JSON.stringify(ctx.toasts));
  }

  console.log('\n--- 8. A failure nobody can retry does not spin a timer ---');
  {
    let attempts = 0;
    const ctx = cloudContext(async () => { attempts++; return { status: 409 }; });
    vm.runInContext('CLOUD_PUSH_RETRY_MS.length = 0; CLOUD_PUSH_RETRY_MS.push(30);', ctx);
    await vm.runInContext('pushCloudSave', ctx)({ tag: 'B' });
    await sleep(160);
    eq(attempts, 1, 'a 409 is not sent again — syncCloudSave settles it on the next load');
  }

  console.log('\n--- 9. The backoff gives up rather than pestering a dead endpoint ---');
  {
    let attempts = 0;
    const ctx = cloudContext(async () => { attempts++; throw Object.assign(new Error('down'), { name: 'TypeError' }); });
    vm.runInContext('CLOUD_PUSH_RETRY_MS.length = 0; CLOUD_PUSH_RETRY_MS.push(20, 20);', ctx);
    await vm.runInContext('pushCloudSave', ctx)({ tag: 'C' });
    await sleep(300);
    eq(attempts, 3, 'the first attempt plus the two backoff steps, and then it stops');
  }

  // ── 10. The keepalive request ──────────────────────────────────────────────
  console.log('\n--- 10. The teardown request is one the browser promises to finish ---');
  {
    const ctx = cloudContext(async () => ({ status: 200 }));
    const beacon = vm.runInContext('beaconCloudSave', ctx);

    eq(beacon({ tag: 'small' }), true, 'a small save is sent');
    eq(ctx.fetches.length, 1, 'exactly one request');
    eq(ctx.fetches[0].url, '/api/save', 'to the save endpoint');
    eq(ctx.fetches[0].opts.method, 'PUT', 'as a PUT');
    eq(ctx.fetches[0].opts.keepalive, true, 'with keepalive, so teardown cannot cancel it');
    assert(/^Bearer /.test(ctx.fetches[0].opts.headers.Authorization),
      'and the bearer token sendBeacon could not have carried');

    // Over the 64KiB keepalive cap the flag has to come off, or the browser rejects the
    // request outright and the write is lost for certain rather than merely at risk.
    const big = { tag: 'x'.repeat(70 * 1024) };
    eq(beacon(big), true, 'an oversized save is still attempted');
    eq(ctx.fetches[1].opts.keepalive, undefined, 'but without keepalive, which it is too big for');

    // Korean is three bytes a character in UTF-8, so a payload can be under the cap by
    // length and over it by size. The check has to be the one the browser makes.
    const korean = { tag: '한'.repeat(30 * 1024) };
    beacon(korean);
    eq(ctx.fetches[2].opts.keepalive, undefined, 'the cap is measured in bytes, not characters');

    ctx.token = '';
    eq(beacon({ tag: 'signed out' }), false, 'a signed-out player has nowhere to send it');
    eq(ctx.fetches.length, 3, 'and no request is made');
  }

  finish();
})().catch((e) => {
  console.error('  [FAIL] autosave test threw: ' + (e && e.stack));
  failed++;
  finish();
});

/** A sandbox for the cloud block: a stubbed request, a stubbed fetch, captured toasts. */
function cloudContext(request) {
  const ctx = {
    console, setTimeout, clearTimeout, Date, TextEncoder,
    hvT,
    token: 'stub-token',
    toasts: [],
    fetches: [],
    getGoogleToken: () => ctx.token,
    setGoogleSession: () => {},
    showToast: (t) => ctx.toasts.push(t),
    collectSave: () => ({ v: 10, tag: 'live', updatedAt: Date.now() }),
    cloudSaveRequest: request,
    fetch: (url, opts) => { ctx.fetches.push({ url, opts }); return Promise.resolve({ status: 200 }); }
  };
  vm.createContext(ctx);
  vm.runInContext(cloudBlock, ctx);
  return ctx;
}

function finish() {
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  if (failed) process.exit(1);
  console.log('\ntest_autosave: all passed');
}
