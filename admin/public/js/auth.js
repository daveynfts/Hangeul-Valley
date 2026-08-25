/**
 * Signing in to the admin.
 *
 * /admin is a public URL. That was harmless while the panel could only read; the moment it
 * could write, an open endpoint would let anyone rewrite the game's content. So a write now
 * carries a Google ID token and the server checks the `sub` against ADMIN_GOOGLE_SUB.
 *
 * The same verifier the cloud saves use (verifyGoogleIdToken in api/_r2.js) does the checking,
 * so there is no second notion of identity in the project and no password anywhere to leak.
 *
 * Locally this does nothing: the Express server writes to the working tree on the operator's
 * own machine, is bound to loopback, and has no owner to be. The button only appears where
 * the API says a token would mean something.
 */
(function () {
  'use strict';

  const KEY = 'hv-admin-idtoken';
  let idToken = '';
  let profile = null;
  let clientId = '';

  try { idToken = sessionStorage.getItem(KEY) || ''; } catch (e) { idToken = ''; }

  // sessionStorage, not localStorage: an ID token is good for an hour and this is a tab you
  // open to make an edit, not a session to keep. Closing the tab should end it.
  function remember(t) {
    idToken = t || '';
    try { if (idToken) sessionStorage.setItem(KEY, idToken); else sessionStorage.removeItem(KEY); }
    catch (e) { /* private browsing; the token still works for this page */ }
  }

  function decodeSub(t) {
    // Read-only peek at the payload so the UI can say who you are before the server answers.
    // Nothing is trusted from it — the server verifies the signature with Google.
    try {
      const p = JSON.parse(decodeURIComponent(escape(atob(String(t).split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))));
      return { sub: p.sub, email: p.email || '', name: p.name || '' };
    } catch (e) { return null; }
  }

  function loadGis() {
    if (window.google && window.google.accounts && window.google.accounts.id) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Google sign-in did not load'));
      document.head.appendChild(s);
    });
  }

  async function clientIdFor() {
    if (clientId) return clientId;
    const r = await fetch('/api/config').then((x) => x.json()).catch(() => null);
    clientId = (r && r.data && (r.data.googleClientId || r.data.GOOGLE_CLIENT_ID)) || (r && r.googleClientId) || '';
    return clientId;
  }

  const AdminAuth = {
    token: () => idToken,
    user: () => profile || (idToken ? decodeSub(idToken) : null),
    signedIn: () => !!idToken,

    async signIn(onDone) {
      const id = await clientIdFor();
      if (!id) throw new Error('GOOGLE_CLIENT_ID is not configured on this deployment');
      await loadGis();
      window.google.accounts.id.initialize({
        client_id: id,
        callback: (resp) => {
          remember(resp && resp.credential);
          profile = decodeSub(idToken);
          if (typeof onDone === 'function') onDone(AdminAuth.user());
        }
      });
      window.google.accounts.id.prompt();
    },

    signOut(onDone) {
      remember('');
      profile = null;
      try { if (window.google && window.google.accounts) window.google.accounts.id.disableAutoSelect(); } catch (e) {}
      if (typeof onDone === 'function') onDone(null);
    },

    // Attached to every request. Harmless on the reads, which are open, and the only thing
    // that makes a write possible.
    headers() {
      return idToken ? { Authorization: 'Bearer ' + idToken } : {};
    }
  };

  window.AdminAuth = AdminAuth;
}());
