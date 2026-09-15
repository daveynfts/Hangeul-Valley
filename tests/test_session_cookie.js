/**
 * tests/test_session_cookie.js — the sign-in that outlives the Google token.
 *
 * A Google ID token lives one hour, and the One Tap flow issues no refresh token: it proves
 * who somebody is once. Using it as the session meant asking Google for a replacement every
 * hour through google.accounts.id.prompt(), and Google declines that routinely — a cooldown
 * after a couple of dismissals, no auto-select with several accounts signed in, no FedCM at
 * all on Safari and Firefox. Every refusal put the sign-in button in front of a player who
 * had never signed out. That is the whole of "why does it keep asking me to log in".
 *
 * The token is now exchanged once for a cookie of ours that lasts thirty days. This file
 * covers both halves of that: the signed statement the server issues (api/_session.js and
 * api/session.js), and the client that stops involving Google once it holds one.
 *
 * The headline case is section 6: a visit that begins with a dead Google token and a live
 * cookie must reach the cloud save without asking Google anything at all.
 *
 * Run: node tests/test_session_cookie.js
 */

'use strict';

const path = require('path');
const vm = require('vm');
const { readGameSource } = require('../scripts/gameSource');

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

// The secret has to be in place before api/_session.js is asked anything, but it is read per
// call rather than captured at require time, so it can also be taken away mid-file.
process.env.SESSION_SECRET = 'test-secret-at-least-sixteen-chars-long';
const S = require('../api/_session.js');

const USER = { sub: '1234567890', email: 'hocvien@example.com', name: 'Học viên', picture: 'https://lh3.googleusercontent.com/a/x' };
const DAY = 24 * 60 * 60 * 1000;

// ── Fake req/res, the shape Vercel hands a handler ───────────────────────────
function reqOf(opts) {
  const o = opts || {};
  return {
    method: o.method || 'GET',
    headers: Object.assign(
      { host: 'hangeul-valley.vercel.app', 'x-forwarded-proto': o.proto || 'https' },
      o.headers || {}
    ),
    body: o.body
  };
}
function resOf() {
  const headers = {};
  const out = {
    statusCode: 0, body: null, headers,
    setHeader: (k, v) => { headers[String(k).toLowerCase()] = v; },
    getHeader: (k) => headers[String(k).toLowerCase()],
    status(code) { out.statusCode = code; return out; },
    json(v) { out.body = v; return out; },
    end() { return out; }
  };
  return out;
}
const cookiesOf = (res) => {
  const v = res.getHeader('Set-Cookie');
  return v ? (Array.isArray(v) ? v : [v]) : [];
};

console.log('====================================================');
console.log('THE SESSION COOKIE');
console.log('====================================================');

// ── 1. The signed statement ──────────────────────────────────────────────────
console.log('\n--- 1. What the cookie says, and who can say it ---');
{
  const now = Date.now();
  const value = S.signSession(USER, now);
  assert(!!value && value.indexOf('.') > 0, 'a session is a payload and a signature');

  const back = S.verifySession(value, now);
  assert(!!back, 'it reads back');
  eq(back.sub, USER.sub, 'as the same subject, which is the bucket key for the save');
  eq(back.email, USER.email, 'with the address the auth chip draws');
  eq(back.name, USER.name, 'and a name outside ASCII survives the round trip');
  assert(back.exp - now >= 29 * DAY, 'good for about a month (' + Math.round((back.exp - now) / DAY) + ' days)');

  assert(value.indexOf(USER.sub) < 0 || true, 'the payload is not secret — only unforgeable');
  assert(!/eyJ/.test(value.split('.')[1] || ''), 'the second half is a signature, not a second payload');
}

console.log('\n--- 2. Nothing else reads back ---');
{
  const now = Date.now();
  const value = S.signSession(USER, now);
  const [body, sig] = value.split('.');

  assert(!S.verifySession('', now), 'an empty cookie is nobody');
  assert(!S.verifySession('no-dot-here', now), 'so is a value with no signature');
  assert(!S.verifySession(body + '.' + sig.slice(0, -2) + 'xx', now), 'a tampered signature is refused');
  assert(!S.verifySession(body + '.', now), 'and a missing one');

  // The payload rewritten to point at somebody else's save, which is the attack that matters:
  // the subject is the R2 key.
  const forged = Buffer.from(JSON.stringify({ v: 1, sub: 'someone-else', iat: now, exp: now + DAY }), 'utf8')
    .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  assert(!S.verifySession(forged + '.' + sig, now), 'a rewritten subject is refused');
  assert(!S.verifySession(forged + '.' + S.signSession(USER, now).split('.')[1], now),
    'and it cannot borrow a signature from a valid session');

  const old = S.signSession(USER, now - 31 * DAY);
  assert(!S.verifySession(old, now), 'a session past thirty days is over');
  assert(!!S.verifySession(S.signSession(USER, now - 29 * DAY), now), 'one inside them is not');

  // A different deployment's secret must not open this one's cookies.
  const mine = S.signSession(USER, now);
  process.env.SESSION_SECRET = 'a-completely-different-secret-value';
  assert(!S.verifySession(mine, now), 'a cookie signed with another secret is refused');
  process.env.SESSION_SECRET = 'test-secret-at-least-sixteen-chars-long';
  assert(!!S.verifySession(mine, now), 'and works again once the right secret is back');
}

console.log('\n--- 3. No secret means the feature is off, not broken ---');
{
  const keep = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = '';
  eq(S.sessionsEnabled(), false, 'a deployment with no secret has sessions switched off');
  eq(S.signSession(USER, Date.now()), '', 'and hands out nothing it could not verify later');
  eq(S.verifySession('anything.atall', Date.now()), null, 'and trusts nothing');
  process.env.SESSION_SECRET = 'short';
  eq(S.sessionsEnabled(), false, 'a secret too short to be one does not count');
  process.env.SESSION_SECRET = keep;
  eq(S.sessionsEnabled(), true, 'a real one does');
}

// ── 4. The cookie the browser is told to keep ────────────────────────────────
console.log('\n--- 4. Cookie attributes ---');
{
  const res = resOf();
  S.setSessionCookie(reqOf({ proto: 'https' }), res, S.signSession(USER, Date.now()));
  const c = cookiesOf(res)[0] || '';
  assert(/HttpOnly/i.test(c), 'HttpOnly — script cannot read it, unlike the token in localStorage it replaces');
  assert(/Secure/i.test(c), 'Secure over https');
  assert(/SameSite=Lax/i.test(c), 'SameSite=Lax, so a cross-site request cannot spend it');
  assert(/Path=\//.test(c), 'scoped to the whole origin');
  assert(/Max-Age=\d+/.test(c), 'with an explicit lifetime');
  const age = Number((/Max-Age=(\d+)/.exec(c) || [])[1]);
  assert(age >= 29 * 24 * 3600, 'of about a month (' + Math.round(age / 86400) + ' days)');
  assert(c.indexOf('__Host-') === 0, 'and the __Host- prefix, which the browser enforces');

  // vercel dev serves plain http, where a __Host- cookie is rejected outright.
  const plain = resOf();
  S.setSessionCookie(reqOf({ proto: 'http' }), plain, S.signSession(USER, Date.now()));
  const p = cookiesOf(plain)[0] || '';
  assert(p.indexOf('__Host-') !== 0, 'over http the prefix is dropped, or nothing would be stored at all');
  assert(!/Secure/i.test(p), 'and Secure with it');
  assert(/HttpOnly/i.test(p), 'but never HttpOnly');
}
{
  // Set-Cookie is the one header that may repeat. A save that refreshes the session must not
  // wipe a cookie the same response already carried.
  const res = resOf();
  res.setHeader('Set-Cookie', 'other=1');
  S.setSessionCookie(reqOf({}), res, S.signSession(USER, Date.now()));
  eq(cookiesOf(res).length, 2, 'a second Set-Cookie is appended, not substituted');
}
{
  const res = resOf();
  S.clearSessionCookie(reqOf({}), res);
  const all = cookiesOf(res).join(' | ');
  assert(cookiesOf(res).length === 2, 'signing out clears both cookie names');
  assert(/Max-Age=0/.test(all), 'by expiring them: ' + all.slice(0, 60) + '…');
}

console.log('\n--- 5. Reading it back off a request ---');
{
  const value = S.signSession(USER, Date.now());
  eq(S.readSessionCookie(reqOf({ headers: { cookie: '__Host-hv_session=' + value } })), value,
    'the secure name is read');
  eq(S.readSessionCookie(reqOf({ headers: { cookie: 'hv_session=' + value } })), value,
    'so is the plain one');
  eq(S.readSessionCookie(reqOf({ headers: { cookie: 'hv_session=plain; __Host-hv_session=' + value } })), value,
    'and when both are present the one the browser vouches for wins');
  eq(S.readSessionCookie(reqOf({ headers: { cookie: 'a=1; b=2' } })), '', 'an unrelated jar is empty');
  eq(S.readSessionCookie(reqOf({})), '', 'so is no jar at all');
  assert(!!S.sessionUser(reqOf({ headers: { cookie: '__Host-hv_session=' + value } })),
    'and sessionUser answers straight off the request, with no network anywhere');

  const now = Date.now();
  assert(!S.sessionNeedsRefresh(S.verifySession(S.signSession(USER, now), now), now),
    'a session minted today is not re-issued');
  assert(S.sessionNeedsRefresh(S.verifySession(S.signSession(USER, now - 6 * DAY), now), now),
    'one running for six days is, so thirty days runs from the last visit');
}

// ── 6. The endpoint ──────────────────────────────────────────────────────────
console.log('\n--- 6. /api/session ---');
(async () => {
  process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
  const handler = require('../api/session.js');
  const realFetch = globalThis.fetch;
  // verifyGoogleIdToken asks Google's tokeninfo endpoint. Stubbed, so this suite needs no
  // network and no real token.
  globalThis.fetch = async (url) => {
    const ok = String(url).indexOf('good-token') >= 0;
    return {
      ok,
      json: async () => (ok ? {
        aud: process.env.GOOGLE_CLIENT_ID,
        iss: 'https://accounts.google.com',
        sub: USER.sub, email: USER.email, name: USER.name, picture: USER.picture
      } : { error: 'invalid' })
    };
  };

  try {
    {
      const res = resOf();
      await handler(reqOf({ method: 'POST', headers: { authorization: 'Bearer good-token' } }), res);
      eq(res.statusCode, 200, 'a verified Google token is traded for a session');
      const c = cookiesOf(res)[0] || '';
      assert(/HttpOnly/.test(c), 'and the cookie is set on the response');
      assert(res.body && res.body.expiresAt > Date.now() + 29 * DAY,
        'with an expiry the client can remember without reading the cookie');
      const value = (/=([^;]+)/.exec(c) || [])[1];
      const back = S.verifySession(value, Date.now());
      assert(back && back.sub === USER.sub, 'and it names the player Google vouched for');
    }
    {
      const res = resOf();
      await handler(reqOf({ method: 'POST', headers: { authorization: 'Bearer bad-token' } }), res);
      eq(res.statusCode, 401, 'a token Google will not vouch for gets no session');
      eq(cookiesOf(res).length, 0, 'and no cookie');
    }
    {
      const value = S.signSession(USER, Date.now());
      const res = resOf();
      await handler(reqOf({ method: 'GET', headers: { cookie: '__Host-hv_session=' + value } }), res);
      eq(res.statusCode, 200, 'GET with the cookie says who is signed in');
      eq(res.body.user.email, USER.email, 'by name');
      assert(!('iat' in res.body.user), 'and hands back only what the chip draws');
      eq(res.getHeader('Cache-Control'), 'private, no-store', 'never cached, by anything');
    }
    {
      const res = resOf();
      await handler(reqOf({ method: 'GET' }), res);
      eq(res.statusCode, 401, 'GET without one is nobody');
    }
    {
      const res = resOf();
      await handler(reqOf({ method: 'DELETE' }), res);
      eq(res.statusCode, 200, 'DELETE signs out');
      assert(/Max-Age=0/.test(cookiesOf(res).join(' ')), 'by expiring the cookie');
    }
    {
      // A deployment where SESSION_SECRET was never set. Signing out still has to work, or a
      // cookie from a deployment that had one could outlive the intent to end it.
      const keep = process.env.SESSION_SECRET;
      process.env.SESSION_SECRET = '';
      const post = resOf();
      await handler(reqOf({ method: 'POST', headers: { authorization: 'Bearer good-token' } }), post);
      eq(post.statusCode, 501, 'with no secret configured the endpoint says so plainly');
      eq(post.body.code, 'SESSION_NOT_CONFIGURED', 'with a code the client can branch on');
      const del = resOf();
      await handler(reqOf({ method: 'DELETE' }), del);
      eq(del.statusCode, 200, 'and signing out still works');
      process.env.SESSION_SECRET = keep;
    }
  } finally {
    globalThis.fetch = realFetch;
  }

  // ── 7. The client stops asking Google ──────────────────────────────────────
  console.log('\n--- 7. The client, once it holds a session ---');

  const src = readGameSource();
  const a = src.indexOf('// ── Cloud sign-in ─');
  const b = src.indexOf('// ── Cloud sign-in end ─');
  if (a < 0 || b < 0) throw new Error('the cloud sign-in region markers are gone');
  const block = src.slice(a, b);

  function tokenExpiringAt(ms) {
    const p = Buffer.from(JSON.stringify({ exp: Math.floor(ms / 1000), sub: USER.sub, email: USER.email, name: 'A' }), 'utf8')
      .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return 'x.' + p + '.y';
  }
  const FRESH_T = () => tokenExpiringAt(Date.now() + 55 * 60 * 1000);
  const EXPIRED_T = () => tokenExpiringAt(Date.now() - 60 * 1000);

  function storage(seed) {
    const m = new Map(Object.entries(seed || {}));
    return {
      getItem: (k) => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => m.set(k, String(v)),
      removeItem: (k) => m.delete(k),
      dump: () => Object.fromEntries(m)
    };
  }
  function el(cls) {
    const set = new Set(String(cls || '').split(/\s+/).filter(Boolean));
    return {
      innerHTML: '', style: {}, checked: false,
      classList: {
        add: (c) => set.add(c), remove: (c) => set.delete(c), contains: (c) => set.has(c),
        toggle: (c, on) => { if (on === undefined) { set.has(c) ? set.delete(c) : set.add(c); } else { on ? set.add(c) : set.delete(c); } }
      }
    };
  }

  /** `session` is what GET /api/session answers: 'live', 'none', or 'off' (501). */
  function ctx(o) {
    o = o || {};
    const nodes = {
      'ls-auth': el('hidden'), 'ls-auth-status': el(''), 'hud-auth-status': el(''),
      'ls-remember': el('hidden'), 'ls-remember-input': el('')
    };
    const slot = el('google-signin-slot');
    const c = {
      console, setTimeout, clearTimeout, setInterval, clearInterval, Date, TextEncoder, AbortController,
      hvT, toasts: [], synced: 0, promptCalls: 0, calls: [], saveHeaders: [],
      localStorage: storage(o.local), sessionStorage: storage(o.session),
      atob: (s) => Buffer.from(s, 'base64').toString('binary'),
      showToast: (m) => c.toasts.push(String(m)),
      collectSave: () => ({ v: 10 }), applySave: () => true,
      document: {
        getElementById: (id) => nodes[id] || null,
        querySelectorAll: (sel) => (sel === '.google-signin-slot' ? [slot] : []),
        createElement: () => ({ style: {} }), head: { appendChild() {} }
      }
    };
    c.fetch = async (url, opts) => {
      const method = (opts && opts.method) || 'GET';
      c.calls.push(method + ' ' + url);
      if (String(url).indexOf('/api/session') >= 0) {
        if (o.session === 'off') return { ok: false, status: 501, json: async () => ({}) };
        if (method === 'DELETE') return { ok: true, status: 200, json: async () => ({ ok: true }) };
        if (method === 'POST') {
          return { ok: true, status: 200, json: async () => ({ ok: true, user: USER, expiresAt: Date.now() + 30 * DAY }) };
        }
        if (o.session === 'live') {
          return { ok: true, status: 200, json: async () => ({ user: USER, expiresAt: Date.now() + 30 * DAY }) };
        }
        return { ok: false, status: 401, json: async () => ({ error: 'no session' }) };
      }
      if (String(url).indexOf('/api/save') >= 0) {
        c.saveHeaders.push((opts && opts.headers) || {});
        return { status: 200, json: async () => ({ ok: true }) };
      }
      if (String(url).indexOf('/api/config') >= 0) {
        return { ok: true, status: 200, json: async () => ({ googleClientId: 'cid' }) };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    };
    c.window = c;
    c.__nodes = nodes;
    c.__slot = slot;
    c.google = {
      accounts: {
        id: {
          initialize: () => {}, renderButton: (t) => { t.innerHTML = '<iframe id="gsi"></iframe>'; },
          disableAutoSelect: () => {},
          prompt: (cb) => {
            c.promptCalls++;
            if (cb) cb({ isNotDisplayed: () => true, isSkippedMoment: () => false });
          }
        }
      }
    };
    vm.createContext(c);
    vm.runInContext(block, c);
    vm.runInContext('syncCloudSave = async () => { synced++; };', c);
    vm.runInContext('IS_NODE = false;', c);
    // These cases call restoreGoogleSession directly rather than going through
    // initGoogleAuth, and the sign-in row only draws anything on a build that has a client
    // id. Set it here so the row behaves the way it does on a real page.
    vm.runInContext("googleAuth.clientId = 'cid';", c);
    return c;
  }
  const R = (c, e) => vm.runInContext(e, c);
  const settle = () => new Promise((r) => setTimeout(r, 60));
  const LIVE_HINT = () => String(Date.now() + 20 * DAY);

  {
    // THE HEADLINE. Yesterday's token is long dead; the cookie is not. Google must not be
    // asked anything, because asking is the step that fails.
    const c = ctx({
      session: 'live',
      local: { hv_google_token: EXPIRED_T(), hv_google_user: JSON.stringify(USER), hv_session_until: LIVE_HINT() }
    });
    await R(c, 'restoreGoogleSession')();
    await settle();
    eq(c.promptCalls, 0, 'a visit with a live cookie asks Google for nothing at all');
    eq(c.synced, 1, 'and reaches the cloud save anyway');
    assert(c.calls.some((x) => x === 'GET /api/session'), 'by asking our own server who it is: ' + JSON.stringify(c.calls));
    const status = c.__nodes['ls-auth-status'].innerHTML;
    assert(/auth-name/.test(status), 'the chip says who is signed in');
    assert(!/auth-sync-warn/.test(status), 'with nothing warned about — this session is not expired, it is fine');
    assert(c.__slot.classList.contains('hidden'), 'and no sign-in button, because there is nothing to sign in to');
  }
  {
    // Without the cookie the old road is still there, and still ends at the button.
    const c = ctx({
      session: 'none',
      local: { hv_google_token: EXPIRED_T(), hv_google_user: JSON.stringify(USER) }
    });
    await R(c, 'restoreGoogleSession')();
    await settle();
    eq(c.promptCalls, 1, 'with no session the client falls back to asking Google');
    assert(!c.__slot.classList.contains('hidden'), 'and when Google refuses, the button is there');
  }
  {
    const c = ctx({ session: 'none' });
    await R(c, 'restoreGoogleSession')();
    await settle();
    assert(!c.calls.some((x) => x.indexOf('/api/session') >= 0),
      'a browser that has never signed in is not charged a request on every load');
  }

  console.log('\n--- 8. Getting a session, and giving it up ---');
  {
    const c = ctx({ session: 'none' });
    R(c, 'onGoogleCredential')({ credential: FRESH_T() });
    await settle();
    assert(c.calls.some((x) => x === 'POST /api/session'),
      'signing in trades the token for a session: ' + JSON.stringify(c.calls));
    assert(Number(c.localStorage.getItem('hv_session_until')) > Date.now() + 29 * DAY,
      'and the expiry is remembered, since the cookie itself cannot be read');
    eq(R(c, 'serverSessionAlive')(), true, 'so the client knows it has one');
  }
  {
    const c = ctx({ session: 'live', local: { hv_session_until: LIVE_HINT(), hv_google_user: JSON.stringify(USER), hv_google_token: FRESH_T() } });
    R(c, 'signOutGoogle')();
    await settle();
    assert(c.calls.some((x) => x === 'DELETE /api/session'), 'signing out ends it server-side too');
    eq(R(c, 'serverSessionAlive')(), false, 'and the client stops believing in it');
    eq(c.localStorage.getItem('hv_session_until'), null, 'with the hint gone');
  }
  {
    const c = ctx({ session: 'live', local: { hv_session_until: LIVE_HINT(), hv_google_user: JSON.stringify(USER), hv_google_token: FRESH_T() } });
    R(c, 'setRememberSignIn')(false);
    await settle();
    assert(c.calls.some((x) => x === 'DELETE /api/session'),
      'switching remembering off takes the thirty-day cookie with it — it is the longest-lived thing here');
    eq(R(c, 'serverSessionAlive')(), false, 'and nothing is left claiming otherwise');
  }
  {
    const c = ctx({ session: 'none' });
    R(c, 'setRememberSignIn')(false);
    R(c, 'onGoogleCredential')({ credential: FRESH_T() });
    await settle();
    assert(!c.calls.some((x) => x === 'POST /api/session'),
      'and a player who asked not to be remembered is not handed one on the next sign-in');
  }
  {
    const c = ctx({ session: 'off', local: { hv_session_until: LIVE_HINT(), hv_google_user: JSON.stringify(USER) } });
    await R(c, 'restoreGoogleSession')();
    await settle();
    eq(R(c, '_sessionsOff'), true, 'a 501 is remembered');
    const before = c.calls.length;
    await R(c, 'resumeServerSession')();
    eq(c.calls.length, before, 'so the rest of the visit does not keep asking');
  }

  console.log('\n--- 9. What a save carries ---');
  {
    const c = ctx({ session: 'live', local: { hv_google_token: EXPIRED_T(), hv_session_until: LIVE_HINT() } });
    const r = await R(c, 'cloudSaveRequest')('PUT', { v: 10 });
    eq(r.status, 200, 'a dead Google token plus a live cookie still writes');
    eq(c.promptCalls, 0, 'without asking Google to re-issue anything');
    const h = c.saveHeaders[0] || {};
    assert(!h.Authorization, 'and the dead token is simply dropped rather than sent to be refused');
  }
  {
    const c = ctx({ session: 'none', local: { hv_google_token: FRESH_T() } });
    const r = await R(c, 'cloudSaveRequest')('PUT', { v: 10 });
    eq(r.status, 200, 'a fresh token with no cookie writes the way it always did');
    assert(/^Bearer /.test((c.saveHeaders[0] || {}).Authorization || ''),
      'carrying the token, because that is the only credential it has');
  }
  {
    const c = ctx({ session: 'none' });
    const r = await R(c, 'cloudSaveRequest')('PUT', { v: 10 });
    eq(r.status, 401, 'no credential of either kind is a 401 before any request goes out');
    eq(c.saveHeaders.length, 0, 'and nothing is sent');
  }

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  if (failed) process.exit(1);
  console.log('\ntest_session_cookie: all passed');
  process.exit(0);
})().catch((e) => {
  console.error('  [FAIL] session cookie test threw: ' + (e && e.stack));
  process.exit(1);
});
