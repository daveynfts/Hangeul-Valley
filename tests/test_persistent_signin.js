/**
 * tests/test_persistent_signin.js — a sign-in has to last until the player ends it.
 *
 * It did not. Three separate things gave it away, and none of them looked like a bug from
 * inside the code:
 *
 *   - the token lived in sessionStorage, which the browser empties when the tab closes, so
 *     every restart and every new tab began signed out;
 *   - initialize() passed auto_select: false, so Google would not answer a silent request
 *     for a replacement token even when it could have;
 *   - boot only did `if (getGoogleToken()) syncCloudSave()`, so with no token there was
 *     nothing to restore and nothing that tried.
 *
 * And a fourth that would have undone the other three over time: cloudSaveRequest returns
 * 401 both when the server refuses a token and when it could not obtain one, and the write
 * path signed the player out for either. Being briefly offline ended the session.
 *
 * Run: node tests/test_persistent_signin.js
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

const a = src.indexOf('// ── Cloud sign-in ─');
const b = src.indexOf('// ── Cloud sign-in end ─');
if (a < 0 || b < 0) throw new Error('the cloud sign-in region markers are gone from js/systems/save.js');
const block = src.slice(a, b);

/** A JWT whose payload is exactly the exp and sub we want; only the middle segment is read. */
function tokenExpiringAt(msEpoch, sub) {
  const payload = Buffer.from(JSON.stringify({
    exp: Math.floor(msEpoch / 1000), sub: sub || '1', email: 'a@b.c', name: 'A'
  }), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return 'x.' + payload + '.y';
}
const FRESH = () => tokenExpiringAt(Date.now() + 55 * 60 * 1000);
const EXPIRED = () => tokenExpiringAt(Date.now() - 60 * 1000);

function storage(seed) {
  const m = new Map(Object.entries(seed || {}));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    keys: () => [...m.keys()]
  };
}

/**
 * A context holding the sign-in region and just enough browser around it.
 *
 * `gis` decides what Google does when asked quietly for a token: 'grant' hands one back the
 * way the real callback does, 'refuse' reports a prompt that was not displayed, and 'absent'
 * means the script never loaded.
 */
function ctx(opts) {
  const o = opts || {};
  const c = {
    console, setTimeout, clearTimeout, Date, TextEncoder, AbortController,
    hvT,
    toasts: [], synced: 0, initArgs: null, autoSelectDisabled: false, promptCalls: 0,
    localStorage: storage(o.local),
    sessionStorage: storage(o.session),
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    showToast: (m) => c.toasts.push(String(m)),
    collectSave: () => ({ v: 10, updatedAt: Date.now() }),
    applySave: () => true,
    fetch: o.fetch || (() => Promise.reject(new Error('no fetch stub'))),
    document: {
      getElementById: () => null,
      querySelectorAll: () => [],
      createElement: () => ({ style: {}, set onerror(v) {} }),
      head: { appendChild() {} }
    }
  };
  c.window = c;
  // syncCloudSave is the one thing past the boundary of what this file is about; counting the
  // calls says whether a restore reached it, which is the question.
  c.google = (o.gis === 'absent') ? undefined : {
    accounts: {
      id: {
        initialize: (args) => { c.initArgs = args; },
        renderButton: () => {},
        disableAutoSelect: () => { c.autoSelectDisabled = true; },
        prompt: (cb) => {
          c.promptCalls++;
          if (o.gis === 'grant') {
            vm.runInContext('onGoogleCredential', c)({ credential: o.grantToken || FRESH() });
            return;
          }
          // A prompt that was not displayed is an answer, and the code reads it as one.
          if (cb) cb({ isNotDisplayed: () => true, isSkippedMoment: () => false });
        }
      }
    }
  };
  vm.createContext(c);
  vm.runInContext(block, c);
  vm.runInContext('syncCloudSave = async () => { synced++; };', c);
  return c;
}
const R = (c, expr) => vm.runInContext(expr, c);

(async () => {
  // ── 1. The token outlives the tab ──────────────────────────────────────────
  console.log('\n--- 1. The token is kept where closing the tab does not erase it ---');
  {
    const c = ctx({});
    const tok = FRESH();
    R(c, 'setGoogleSession')(tok, { sub: '1', email: 'a@b.c' });
    eq(c.localStorage.getItem('hv_google_token'), tok, 'the token goes to localStorage');
    eq(c.sessionStorage.getItem('hv_google_token'), null, 'and not to sessionStorage, which the tab takes with it');
    eq(JSON.parse(c.localStorage.getItem('hv_google_user')).sub, '1', 'the profile is remembered beside it');

    // A new tab: nothing in memory, everything on disk.
    const fresh = ctx({ local: { hv_google_token: tok, hv_google_user: '{"sub":"1"}' } });
    eq(R(fresh, 'getGoogleToken')(), tok, 'a new tab finds the token without asking anyone');
    eq(R(fresh, 'hasGoogleSignIn')(), true, 'and knows the sign-in was never ended');
  }

  console.log('\n--- 2. Signing out really signs out ---');
  {
    const c = ctx({
      local: { hv_google_token: FRESH(), hv_google_user: '{"sub":"1"}' },
      // The pre-upgrade copy. If sign-out left this behind, getGoogleToken would find it and
      // the player would still be signed in.
      session: { hv_google_token: 'legacy-token' }
    });
    R(c, 'signOutGoogle')();
    eq(c.localStorage.getItem('hv_google_token'), null, 'the token is gone from localStorage');
    eq(c.sessionStorage.getItem('hv_google_token'), null, 'and the pre-upgrade copy is gone too');
    eq(c.localStorage.getItem('hv_google_user'), null, 'the remembered profile is gone');
    eq(R(c, 'getGoogleToken')(), '', 'nothing is left to sign in with');
    eq(R(c, 'hasGoogleSignIn')(), false, 'and no intent is left to restore from');
    eq(c.autoSelectDisabled, true, 'Google is told to stop answering quiet requests as well');
  }

  console.log('\n--- 3. A token left in the old place still works, once ---');
  {
    const tok = FRESH();
    const c = ctx({ session: { hv_google_token: tok } });
    eq(R(c, 'getGoogleToken')(), tok, 'shipping this change does not itself sign anybody out');
  }

  // ── 4. What boot does with each starting state ─────────────────────────────
  console.log('\n--- 4. Restoring at boot ---');
  {
    const c = ctx({ local: { hv_google_token: FRESH(), hv_google_user: '{"sub":"1"}' } });
    await R(c, 'restoreGoogleSession')();
    eq(c.promptCalls, 0, 'a token still inside its hour asks Google for nothing');
    eq(c.synced, 1, 'and the save syncs straight away');
  }
  {
    const c = ctx({ gis: 'grant', local: { hv_google_token: EXPIRED(), hv_google_user: '{"sub":"1"}' } });
    await R(c, 'restoreGoogleSession')();
    eq(c.promptCalls, 1, 'an expired token is replaced by asking Google quietly');
    assert(R(c, 'googleTokenIsFresh')(), 'and the session is usable again');
    eq(c.synced, 1, 'the save syncs once — not once per path into it');
    eq(c.toasts.length, 0, 'and nobody is told they "signed in", because they never signed out');
  }
  {
    // The case the whole change is for: a browser restart. No token anywhere, but a profile
    // that says this player never signed out.
    const c = ctx({ gis: 'grant', local: { hv_google_user: '{"sub":"1"}' } });
    await R(c, 'restoreGoogleSession')();
    eq(c.promptCalls, 1, 'a restart with no token still restores the sign-in');
    eq(c.synced, 1, 'and reaches the cloud save');
    assert(!!c.localStorage.getItem('hv_google_token'), 'with the new token stored for next time');
  }
  {
    const c = ctx({ gis: 'grant' });
    await R(c, 'restoreGoogleSession')();
    eq(c.promptCalls, 0, 'a browser that has never signed in is not prompted at boot');
    eq(c.synced, 0, 'and nothing is synced');
  }
  {
    const c = ctx({ gis: 'refuse', local: { hv_google_user: '{"sub":"1"}' } });
    await R(c, 'restoreGoogleSession')();
    eq(c.promptCalls, 1, 'a refusal is asked for once');
    eq(c.synced, 0, 'nothing is synced without a token');
    eq(R(c, 'hasGoogleSignIn')(), true, 'but the intent survives, so the next load tries again');
    eq(c.toasts.length, 0, 'and a refusal is not an event worth interrupting anyone for');
  }

  console.log('\n--- 5. auto_select is what lets Google answer quietly ---');
  {
    const c = ctx({ gis: 'grant', fetch: () => Promise.resolve({ ok: true, json: async () => ({ googleClientId: 'cid' }) }) });
    R(c, 'IS_NODE = false;');
    await R(c, 'initGoogleAuth')();
    assert(c.initArgs, 'GIS is initialised');
    eq(c.initArgs.auto_select, true, 'with auto_select on');
    eq(c.initArgs.client_id, 'cid', 'and the client id the config handed back');
  }

  // ── 6. The 401 that must not end a session ─────────────────────────────────
  console.log('\n--- 6. Being unable to refresh is not the same as being refused ---');
  {
    // The token is expired and Google will not re-issue, so cloudSaveRequest never sends the
    // request: it answers 401 with expired set. That is a local condition, not a verdict.
    const c = ctx({ gis: 'refuse', local: { hv_google_token: EXPIRED(), hv_google_user: '{"sub":"1"}' } });
    R(c, 'CLOUD_PUSH_RETRY_MS.length = 0;');   // no live timer once the case is made
    const r = await R(c, 'pushCloudSave')({ v: 10 });
    eq(r.ok, false, 'the push fails');
    eq(r.reason, 'expired', 'and says why in a way the caller can act on');
    eq(R(c, 'hasGoogleSignIn')(), true, 'the sign-in is kept — offline is not a sign-out');
    assert(!c.toasts.some((t) => /sign in again/i.test(t)),
      'and the player is not told to sign in again: ' + JSON.stringify(c.toasts));
    assert(R(c, 'cloudPushIsRetryable')('expired'), 'it is retried, since the cool-off passes');
  }
  {
    // The server refusing a token it could read is the real thing.
    const c = ctx({
      local: { hv_google_token: FRESH(), hv_google_user: '{"sub":"1"}' },
      fetch: () => Promise.resolve({ status: 401, json: async () => ({ error: 'sign in required' }) })
    });
    R(c, 'CLOUD_PUSH_RETRY_MS.length = 0;');
    const r = await R(c, 'pushCloudSave')({ v: 10 });
    eq(r.reason, 'signed-out', 'a 401 from the server is a sign-out');
    eq(R(c, 'hasGoogleSignIn')(), false, 'the session is ended');
    assert(c.toasts.some((t) => /sign in again/i.test(t)), 'and the player is told');
  }

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  if (failed) process.exit(1);
  console.log('\ntest_persistent_signin: all passed');
})().catch((e) => {
  console.error('  [FAIL] persistent sign-in test threw: ' + (e && e.stack));
  process.exit(1);
});
