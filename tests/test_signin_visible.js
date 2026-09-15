/**
 * tests/test_signin_visible.js — the way back in is always on screen.
 *
 * tests/test_persistent_signin.js is about a sign-in surviving. This one is about what the
 * level select shows when it did not, because that turned out to be the half that stranded
 * people: the row is hidden in the markup and only renderAuthUI ever un-hides it, so every
 * path that failed to reach renderAuthUI left a screen with no sign-in on it at all, for the
 * rest of the visit, with nothing that would try again.
 *
 * Four states got there:
 *
 *   - an expired token still in localStorage. `signed` was `user && token`, which an expired
 *     token satisfies, so the Google button was hidden and the chip said signed in. Nothing
 *     synced, and the only way back was to notice Sign out and use it first;
 *   - the Google script not arriving within ten seconds. The poll cleared its interval and
 *     stopped, having never called renderAuthUI;
 *   - /api/config not answering. One attempt, no retry, and no client id means no button
 *     anywhere in the game;
 *   - the script tag erroring outright.
 *
 * Run: node tests/test_signin_visible.js
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

function tokenExpiringAt(msEpoch) {
  const payload = Buffer.from(JSON.stringify({
    exp: Math.floor(msEpoch / 1000), sub: '1', email: 'a@b.c', name: 'A'
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
    removeItem: (k) => m.delete(k)
  };
}

// An element that remembers its classes, because "is the button on screen" is a question
// about exactly one class and answering it with a stub that drops them proves nothing.
function el(cls) {
  const set = new Set(String(cls || '').split(/\s+/).filter(Boolean));
  return {
    innerHTML: '', style: {}, checked: false,
    classList: {
      add: (c) => set.add(c),
      remove: (c) => set.delete(c),
      contains: (c) => set.has(c),
      toggle: (c, on) => { if (on === undefined) { set.has(c) ? set.delete(c) : set.add(c); } else { on ? set.add(c) : set.delete(c); } }
    }
  };
}

/**
 * The sign-in region with the level-select row around it, as index.html ships it: #ls-auth
 * carries `hidden`, the slot does not, and both start empty.
 *
 * `gis` says what Google does — 'grant' hands a token back, 'refuse' reports a prompt that
 * was not displayed, 'absent' means the script never loaded. `fetch` is /api/config.
 */
function ctx(opts) {
  const o = opts || {};
  const nodes = {
    'ls-auth': el('hidden'),
    'ls-auth-status': el(''),
    'hud-auth-status': el(''),
    'ls-remember': el('hidden'),
    'ls-remember-input': el('')
  };
  const slot = el('google-signin-slot');
  const c = {
    console, setTimeout, clearTimeout, setInterval, clearInterval, Date, TextEncoder, AbortController,
    hvT, toasts: [], synced: 0, renderButtonCalls: 0, initArgs: null, autoSelectDisabled: false,
    localStorage: storage(o.local), sessionStorage: storage(o.session),
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    showToast: (m) => c.toasts.push(String(m)),
    collectSave: () => ({ v: 10 }), applySave: () => true,
    fetch: o.fetch || (() => Promise.reject(new Error('no fetch stub'))),
    document: {
      getElementById: (id) => nodes[id] || null,
      querySelectorAll: (sel) => (sel === '.google-signin-slot' ? [slot] : []),
      createElement: () => ({ style: {} }),
      head: { appendChild() {} }
    }
  };
  c.window = c;
  c.__nodes = nodes;
  c.__slot = slot;
  c.google = (o.gis === 'absent') ? undefined : {
    accounts: {
      id: {
        initialize: (args) => { c.initArgs = args; },
        renderButton: (target) => { c.renderButtonCalls++; target.innerHTML = '<iframe id="gsi"></iframe>'; },
        disableAutoSelect: () => { c.autoSelectDisabled = true; },
        prompt: (cb) => {
          if (o.gis === 'grant') { vm.runInContext('onGoogleCredential', c)({ credential: FRESH() }); return; }
          if (cb) cb({ isNotDisplayed: () => true, isSkippedMoment: () => false });
        }
      }
    }
  };
  vm.createContext(c);
  vm.runInContext(block, c);
  vm.runInContext('syncCloudSave = async () => { synced++; };', c);
  vm.runInContext('IS_NODE = false;', c);
  return c;
}
const R = (c, expr) => vm.runInContext(expr, c);
const CFG_OK = () => Promise.resolve({ ok: true, json: async () => ({ googleClientId: 'cid', cloudSave: true }) });

/** What a player looking at the level select can actually see and click. */
function view(c) {
  return {
    row: !c.__nodes['ls-auth'].classList.contains('hidden'),
    slot: !c.__slot.classList.contains('hidden'),
    google: /id="gsi"/.test(c.__slot.innerHTML),
    retry: /auth-retry/.test(c.__slot.innerHTML),
    chip: /auth-name/.test(c.__nodes['ls-auth-status'].innerHTML),
    warn: /auth-sync-warn/.test(c.__nodes['ls-auth-status'].innerHTML),
    remembers: /auth-remembered/.test(c.__nodes['ls-auth-status'].innerHTML),
    signOut: /auth-out/.test(c.__nodes['ls-auth-status'].innerHTML),
    rememberBox: !c.__nodes['ls-remember'].classList.contains('hidden')
  };
}
/** Anything at all the player can press to get signed in. The one invariant of this file. */
const hasWayIn = (v) => v.row && v.slot && (v.google || v.retry);

const settle = () => new Promise((r) => setTimeout(r, 60));

(async () => {
  console.log('====================================================');
  console.log('THE SIGN-IN ROW');
  console.log('====================================================');

  console.log('\n--- 1. The ordinary case, so the rest means something ---');
  {
    const c = ctx({ gis: 'refuse', fetch: CFG_OK });
    await R(c, 'initGoogleAuth')();
    await settle();
    const v = view(c);
    assert(c.renderButtonCalls > 0, 'Google is asked to draw its button');
    assert(v.row, 'the row is on screen');
    assert(v.google, 'with the Google button in it');
    assert(!v.chip, 'and no chip, because nobody is signed in');
    assert(v.rememberBox, 'the switch that decides whether a sign-in is kept is offered too');
    eq(R(c, 'rememberSignIn')(), true, 'and it defaults to keeping it');
  }

  console.log('\n--- 2. A token past its hour is not a session ---');
  {
    // The case that started this: an expired token satisfies `user && token`, and that was
    // the whole test for whether to hide the sign-in button.
    const c = ctx({
      gis: 'refuse',
      local: { hv_google_token: EXPIRED(), hv_google_user: '{"sub":"1","email":"a@b.c"}' },
      fetch: CFG_OK
    });
    await R(c, 'initGoogleAuth')();
    await settle();
    const v = view(c);
    eq(R(c, 'googleTokenIsFresh')(), false, 'the token really is expired');
    assert(hasWayIn(v), 'the sign-in button is on screen, not hidden behind the stale chip');
    assert(v.chip, 'the chip still names the account, so the row says whose session this is');
    assert(v.warn, 'and marks it as expired rather than reading as a working sign-in');
  }

  console.log('\n--- 3. A working session keeps the row clear ---');
  {
    const c = ctx({
      gis: 'refuse',
      local: { hv_google_token: FRESH(), hv_google_user: '{"sub":"1","email":"a@b.c"}' },
      fetch: CFG_OK
    });
    await R(c, 'initGoogleAuth')();
    await settle();
    const v = view(c);
    assert(v.chip && v.signOut, 'the chip and its sign-out button are shown');
    assert(!v.slot, 'and the Google button steps aside — there is nothing to sign in to');
    assert(!v.warn, 'with nothing warned about');

    R(c, 'signOutGoogle')();
    const after = view(c);
    assert(hasWayIn(after), 'signing out brings the button straight back');
    assert(!after.chip, 'and takes the chip away');
  }

  console.log('\n--- 4. The Google script never arrives ---');
  {
    const c = ctx({ gis: 'absent', fetch: CFG_OK });
    await R(c, 'initGoogleAuth')();
    await settle();
    assert(view(c).row, 'the row is painted without waiting for Google');
    // The poll is 40 tries at 250ms. Waiting it out is the point: what used to happen at the
    // end of it was nothing at all.
    await new Promise((r) => setTimeout(r, 11000));
    const v = view(c);
    assert(hasWayIn(v), 'and when the ten seconds are up there is still something to press');
    assert(v.retry, 'specifically a retry, since Google has nothing to draw');
  }

  console.log('\n--- 5. /api/config does not answer ---');
  {
    let calls = 0;
    const c = ctx({ gis: 'refuse', fetch: () => { calls++; return Promise.reject(new Error('offline')); } });
    await R(c, 'initGoogleAuth')();
    await settle();
    assert(calls > 1, 'the config is asked for more than once (' + calls + ' attempts)');
    const v = view(c);
    assert(hasWayIn(v), 'and a failure still leaves a way in rather than an empty screen');
    assert(v.retry, 'the retry button');
  }
  {
    // A build that genuinely has no Google sign-in — the desktop shell — is answering, not
    // failing, and must not be offered a retry of nothing.
    const c = ctx({
      gis: 'refuse',
      fetch: () => Promise.resolve({ ok: true, json: async () => ({ googleClientId: '', cloudSave: false }) })
    });
    await R(c, 'initGoogleAuth')();
    await settle();
    const v = view(c);
    assert(!v.row, 'a build with no client id shows no sign-in row at all');
    assert(!v.retry, 'and no retry button, because there is nothing to retry');
  }

  console.log('\n--- 6. Retrying actually retries ---');
  {
    let ok = false;
    const c = ctx({
      gis: 'refuse',
      fetch: () => (ok
        ? Promise.resolve({ ok: true, json: async () => ({ googleClientId: 'cid' }) })
        : Promise.reject(new Error('offline')))
    });
    await R(c, 'initGoogleAuth')();
    await settle();
    assert(view(c).retry, 'the first load offers the retry');
    ok = true;
    await R(c, 'retryGoogleAuth')();
    await settle();
    const v = view(c);
    assert(v.google, 'and pressing it gets the Google button once the network is back');
    assert(!v.retry, 'with the retry gone');
  }

  console.log('\n--- 7. The browser remembers who was signed in ---');
  {
    const c = ctx({ gis: 'refuse', local: { hv_google_user: '{"sub":"1","email":"a@b.c"}' }, fetch: CFG_OK });
    await R(c, 'initGoogleAuth')();
    await settle();
    const v = view(c);
    assert(hasWayIn(v), 'a refused renewal leaves the button on screen');
    assert(v.remembers, 'and the row names the account, so the button is one tap back to it');
    assert(/a@b\.c/.test(c.__nodes['ls-auth-status'].innerHTML), 'by name');
  }

  console.log('\n--- 8. The switch that stops it remembering ---');
  {
    const c = ctx({
      gis: 'refuse',
      local: { hv_google_token: FRESH(), hv_google_user: '{"sub":"1","email":"a@b.c"}' },
      fetch: CFG_OK
    });
    await R(c, 'initGoogleAuth')();
    await settle();
    eq(R(c, 'hasGoogleSignIn')(), true, 'the sign-in starts remembered');

    R(c, 'setRememberSignIn')(false);
    eq(c.localStorage.getItem('hv_google_user'), null,
      'switching it off forgets the profile now, not at the next sign-in');
    eq(c.localStorage.getItem('hv_google_token'), null, 'and takes the token out of localStorage');
    assert(!!c.sessionStorage.getItem('hv_google_token'),
      'but keeps it for this tab — a setting about future visits does not end the one in progress');
    eq(c.autoSelectDisabled, true, 'and Google is told to stop signing this browser back in');
    assert(view(c).chip, 'the player is still signed in and the chip still says so');

    // What the next visit finds: a tab that closed took the token with it, and nothing else
    // was left behind.
    const next = ctx({ gis: 'refuse', local: { hv_google_remember: '0' }, fetch: CFG_OK });
    await R(next, 'initGoogleAuth')();
    await settle();
    eq(R(next, 'hasGoogleSignIn')(), false, 'so the next visit starts signed out');
    eq(next.initArgs.auto_select, false, 'and does not ask Google to sign anyone in quietly');
    assert(hasWayIn(view(next)), 'with the button there for whoever wants it');
  }

  console.log('\n--- 9. The token is replaced before it dies ---');
  {
    // Nothing used to notice an hour passing until a save came back 401, by which point the
    // renewal is the one Google most often declines.
    const c = ctx({ gis: 'refuse', fetch: CFG_OK });
    const soon = Date.now() + 60 * 60 * 1000;
    R(c, 'setGoogleSession')(tokenExpiringAt(soon), { sub: '1', email: 'a@b.c' });
    const fired = R(c, '_renewTimer');
    assert(!!fired, 'signing in arms a renewal');
    const lead = R(c, 'RENEW_LEAD_MS');
    assert(lead >= 60 * 1000, 'with a lead measured in minutes, not seconds (' + lead + 'ms)');
    assert(R(c, 'tokenExpiresWithin')(61 * 60 * 1000), 'and the lead is read off the token itself');
    assert(!R(c, 'tokenExpiresWithin')(60 * 1000), 'not off a fixed guess');

    R(c, 'signOutGoogle')();
    eq(R(c, '_renewTimer'), null, 'signing out takes the renewal down with it');
  }

  console.log('\n--- 10. prompt() is asked for in a form Chrome still allows ---');
  {
    // Every quiet renewal in the file goes through prompt(), and Chrome refuses One Tap
    // without FedCM now. Without this flag the renewals fail before they reach the player,
    // which is the whole of "why does it keep asking me to sign in".
    const c = ctx({ gis: 'refuse', fetch: CFG_OK });
    await R(c, 'initGoogleAuth')();
    await settle();
    eq(c.initArgs.use_fedcm_for_prompt, true, 'GIS is initialised with FedCM on');
  }

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  if (failed) process.exit(1);
  console.log('\ntest_signin_visible: all passed');
  process.exit(0);
})().catch((e) => {
  console.error('  [FAIL] sign-in visibility test threw: ' + (e && e.stack));
  process.exit(1);
});
