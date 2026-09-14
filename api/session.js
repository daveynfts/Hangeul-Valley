'use strict';

// ── /api/session — trade a Google ID token for a sign-in that lasts ──────────
//
//   POST    verify the Bearer ID token with Google, then set the cookie. Once per sign-in.
//   GET     who this cookie says you are, or 401. This is what a page load asks, and it is
//           the reason a returning player no longer meets Google at all.
//   DELETE  sign out: clear the cookie.
//
// See api/_session.js for why this exists and what the cookie is.

const { setCors, verifyGoogleIdToken, readBearer } = require('./_r2');
const {
  sessionsEnabled, signSession, sessionUser, setSessionCookie, clearSessionCookie,
  SESSION_MAX_AGE_S
} = require('./_session');

function publicUser(u) {
  return { sub: u.sub, email: u.email || '', name: u.name || '', picture: u.picture || '' };
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  // Never cached, by anything. A response that says who is signed in has no business in a
  // shared cache, and a stale one is worse than none.
  res.setHeader('Cache-Control', 'private, no-store');

  // DELETE first and unconditionally: signing out must work even on a deployment that has
  // no secret configured, so a cookie left over from one that did cannot outlive the intent
  // to end it.
  if (req.method === 'DELETE') {
    clearSessionCookie(req, res);
    res.status(200).json({ ok: true });
    return;
  }

  if (!sessionsEnabled()) {
    // Not an error the player can do anything about, and not one the client should treat as
    // a sign-out: it falls back to sending the Google token on every request, exactly as it
    // did before this endpoint existed.
    res.status(501).json({ error: 'sessions not configured', code: 'SESSION_NOT_CONFIGURED' });
    return;
  }

  if (req.method === 'GET') {
    const user = sessionUser(req);
    if (!user) { res.status(401).json({ error: 'no session' }); return; }
    res.status(200).json({ user: publicUser(user), expiresAt: user.exp });
    return;
  }

  if (req.method === 'POST') {
    let user;
    try {
      user = await verifyGoogleIdToken(readBearer(req));
    } catch (e) {
      if (e && (e.code === 'AUTH_NOT_CONFIGURED' || e.status === 503)) {
        res.status(503).json({ error: 'sign in not configured' });
        return;
      }
      // Google was unreachable. Saying so as a 502 keeps it apart from "your token was
      // refused", which is the one answer that should end a session.
      console.error('[session] token check failed:', e && e.name, e && e.message);
      res.status(502).json({ error: 'could not reach the sign-in service' });
      return;
    }
    if (!user) { res.status(401).json({ error: 'sign in required' }); return; }

    const value = signSession(user, Date.now());
    if (!value) { res.status(500).json({ error: 'could not start a session' }); return; }
    setSessionCookie(req, res, value);
    res.status(200).json({
      ok: true,
      user: publicUser(user),
      expiresAt: Date.now() + SESSION_MAX_AGE_S * 1000
    });
    return;
  }

  res.status(405).json({ error: 'method not allowed' });
};
