'use strict';

// ── The game's own sign-in session ───────────────────────────────────────────
//
// Until this existed, a Google ID token *was* the session: the client kept one in
// localStorage and sent it as a Bearer on every /api/save. A Google ID token lives one
// hour and the One Tap flow issues no refresh token — it is built to prove who somebody
// is once, not to keep them signed in. So every hour the game had to ask Google for
// another one through google.accounts.id.prompt(), which Google declines routinely: after
// a couple of dismissals it applies a cooldown, it does not auto-select when several
// accounts are signed in, and on Safari and Firefox there is no FedCM for it to use at
// all. Each refusal put the sign-in button back in front of a player who never signed out.
//
// The ID token is now exchanged, once, for a session of our own. It is the pattern Google
// documents for exactly this: verify the token server-side, then issue your own cookie and
// stop involving Google until it expires.
//
// The cookie is a signed statement, not a key into a table — there is no session store to
// keep, and Vercel functions have nowhere to keep one anyway. Everything needed to identify
// the player travels in the cookie, and the HMAC is what makes it unforgeable.
//
// It is also strictly safer than what it replaces. The Google token sat in localStorage,
// where any injected script could read it and spend it against /api/save. This cookie is
// HttpOnly: script cannot read it at all.

const crypto = require('crypto');

const COOKIE_BASE = 'hv_session';
// The __Host- prefix is a promise the browser enforces: Secure, Path=/, and no Domain, so
// nothing but this exact origin can have set it. It is rejected over plain http, which is
// what `vercel dev` serves, so the plain name is the fallback there and both are read back.
const COOKIE_SECURE = '__Host-' + COOKIE_BASE;

const SESSION_DAYS = 30;
const SESSION_MAX_AGE_S = SESSION_DAYS * 24 * 60 * 60;
// Re-issued once it has been running for five days, not on every request. An active player
// therefore never reaches the thirty-day edge, and a save does not carry a Set-Cookie it
// has no use for.
const SESSION_REFRESH_AFTER_MS = 5 * 24 * 60 * 60 * 1000;

const SESSION_V = 1;

function env(name) {
  return String(process.env[name] || '').trim().replace(/^["']|["']$/g, '');
}

/** The signing key. Absent means the feature is switched off, and every caller has to keep
 *  working without it — the Bearer path is still there, and a build that started handing out
 *  cookies it could not verify would sign everybody out on the next request. */
function sessionSecret() {
  const s = env('SESSION_SECRET');
  return s.length >= 16 ? s : '';
}

function sessionsEnabled() {
  return !!sessionSecret();
}

const b64u = (buf) => Buffer.from(buf).toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function b64uDecode(s) {
  const t = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(t + '='.repeat((4 - (t.length % 4)) % 4), 'base64');
}

function hmac(secret, data) {
  return crypto.createHmac('sha256', secret).update(data).digest();
}

/**
 * `<payload>.<signature>`, both base64url.
 *
 * Only what the save path actually needs travels in it: the subject is the bucket key, and
 * the other three are what the auth chip draws. No token, nothing from Google that could be
 * replayed anywhere else.
 */
function signSession(user, now) {
  const secret = sessionSecret();
  if (!secret) return '';
  const t = Number(now) || Date.now();
  const payload = {
    v: SESSION_V,
    sub: String(user && user.sub || ''),
    email: String(user && user.email || ''),
    name: String(user && user.name || ''),
    picture: String(user && user.picture || ''),
    iat: t,
    exp: t + SESSION_MAX_AGE_S * 1000
  };
  if (!payload.sub) return '';
  const body = b64u(JSON.stringify(payload));
  return body + '.' + b64u(hmac(secret, body));
}

/**
 * The user this cookie names, or null.
 *
 * Null for every kind of wrong — no secret, no cookie, a bad shape, a signature that does
 * not match, an expired statement. The caller's next move is the same in all of them: fall
 * back to the Bearer token, which is how a session is obtained in the first place.
 */
function verifySession(value, now) {
  const secret = sessionSecret();
  if (!secret || !value) return null;
  const at = String(value).indexOf('.');
  if (at <= 0) return null;
  const body = String(value).slice(0, at);
  const sig = b64uDecode(String(value).slice(at + 1));
  const want = hmac(secret, body);
  // Compared in constant time. A byte-at-a-time comparison leaks where the first difference
  // is, which is enough to walk a signature out one byte per round of requests.
  if (sig.length !== want.length || !crypto.timingSafeEqual(sig, want)) return null;
  let p;
  try { p = JSON.parse(b64uDecode(body).toString('utf8')); } catch { return null; }
  if (!p || p.v !== SESSION_V || !p.sub) return null;
  const t = Number(now) || Date.now();
  if (!(Number(p.exp) > t)) return null;
  return {
    sub: String(p.sub),
    email: String(p.email || ''),
    name: String(p.name || ''),
    picture: String(p.picture || ''),
    iat: Number(p.iat) || 0,
    exp: Number(p.exp) || 0
  };
}

/** Has this session been running long enough to be worth extending? */
function sessionNeedsRefresh(session, now) {
  if (!session || !session.iat) return false;
  return (Number(now) || Date.now()) - session.iat >= SESSION_REFRESH_AFTER_MS;
}

function isSecureRequest(req) {
  if (!req) return false;
  const proto = String((req.headers && req.headers['x-forwarded-proto']) || '');
  if (proto) return proto.split(',')[0].trim() === 'https';
  return !!(req.connection && req.connection.encrypted);
}

function cookieName(req) {
  return isSecureRequest(req) ? COOKIE_SECURE : COOKIE_BASE;
}

/**
 * SameSite=Lax rather than Strict or None.
 *
 * None would need Access-Control-Allow-Credentials, and then any origin this API's CORS
 * list lets through could spend the cookie. Lax keeps it to this site, which is all the
 * game needs — /api/save is same-origin with the page — and it is also what stops a
 * cross-site form from driving a PUT with the player's credentials attached.
 */
function sessionCookie(req, value, maxAgeSeconds) {
  const parts = [
    cookieName(req) + '=' + value,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=' + Math.max(0, Math.floor(maxAgeSeconds))
  ];
  if (isSecureRequest(req)) parts.push('Secure');
  return parts.join('; ');
}

function setSessionCookie(req, res, value) {
  appendCookie(res, sessionCookie(req, value, SESSION_MAX_AGE_S));
}

/** Signing out. Both names are cleared: a session started over http and read back over
 *  https would otherwise leave the other one behind, still valid, still signed. */
function clearSessionCookie(req, res) {
  [COOKIE_SECURE, COOKIE_BASE].forEach((name) => {
    const parts = [name + '=', 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
    if (name === COOKIE_SECURE || isSecureRequest(req)) parts.push('Secure');
    appendCookie(res, parts.join('; '));
  });
}

// Set-Cookie is the one header that may legitimately appear more than once, so it is
// appended rather than assigned — a plain setHeader here would drop the save's refreshed
// cookie on top of anything else the handler had already set.
function appendCookie(res, cookie) {
  const prev = res.getHeader ? res.getHeader('Set-Cookie') : null;
  const list = prev ? (Array.isArray(prev) ? prev.slice() : [prev]) : [];
  list.push(cookie);
  res.setHeader('Set-Cookie', list);
}

function readSessionCookie(req) {
  const raw = String((req && req.headers && req.headers.cookie) || '');
  if (!raw) return '';
  // The secure name wins when both are present: it is the one the browser guarantees came
  // from this origin.
  let fallback = '';
  for (const piece of raw.split(';')) {
    const eq = piece.indexOf('=');
    if (eq < 0) continue;
    const k = piece.slice(0, eq).trim();
    const v = piece.slice(eq + 1).trim();
    if (k === COOKIE_SECURE) return v;
    if (k === COOKIE_BASE) fallback = v;
  }
  return fallback;
}

/** The signed-in user behind this request, by cookie alone. No network, no Google. */
function sessionUser(req, now) {
  return verifySession(readSessionCookie(req), now);
}

module.exports = {
  COOKIE_BASE, COOKIE_SECURE, SESSION_DAYS, SESSION_MAX_AGE_S, SESSION_REFRESH_AFTER_MS,
  sessionSecret, sessionsEnabled, signSession, verifySession, sessionNeedsRefresh,
  sessionCookie, setSessionCookie, clearSessionCookie, readSessionCookie, sessionUser,
  isSecureRequest, cookieName
};
