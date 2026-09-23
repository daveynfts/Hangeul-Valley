'use strict';

/**
 * The whole admin API, in one serverless function.
 *
 * One, not one per resource, and not by preference. Vercel's Hobby plan allows twelve
 * functions and this project uses eleven; the last time that ceiling was crossed the build
 * failed on Vercel while CI stayed green and nothing shipped (see api/unit10/[kind].js). So
 * every admin route dispatches through admin/lib/content.js instead, which is also what makes
 * "is every piece of content reachable from the admin" a question with an answer.
 *
 *   GET  /api/admin/host             what this copy can do, and who you are
 *   GET  /api/admin/content          the editable files, for building a picker
 *   GET  /api/admin/content/<key>    the file as it stands
 *   PUT  /api/admin/content/<key>    validate, commit, publish
 *
 * A write does two things, and both matter:
 *
 *   1. Commits to GitHub. The repo stays the source of truth, so the edit is versioned,
 *      revertible, and run through the same 1652 invariants in CI as a hand-written change.
 *   2. Uploads the identical bytes to R2, where vercel.json points /worlds/:path* — so the
 *      change is live at once rather than after a ten-minute pipeline.
 *
 * Doing only the second would work until someone ran `npm run publish:prod`, which re-uploads
 * from the repo and would silently revert every edit. Doing both means the next publish
 * rewrites each object with what is already in it.
 */

const path = require('path');
const {
  setCors, verifyGoogleIdToken, readBearer, env, putContent, CONTENT_CDN
} = require('../_r2');
const { githubConfig, commitFile, readFile, blobSha, probe } = require('../_github');
const { repoRoot } = require('../_repoRoot');
const content = require('../../admin/lib/content');

const json = (res, code, body) => { res.status(code).json(body); };

// Where the route segments come from. req.query.path is the documented home for a catch-all,
// and on this project it arrives empty — so the URL is read as well and whichever answers
// wins. Trusting one mechanism is what made every route 404 on production while the function
// itself was plainly running and returning its own error text.
// The content key travels in a query parameter, not in the path.
//
// api/admin/[...path].js is named as a catch-all and Vercel matches exactly one segment after
// /api/admin/ — /api/admin/content answers, /api/admin/content/levels is a platform 404 that
// never reaches this file. Rather than keep guessing at the router across deploys, the key
// stops being part of the path: ?key=world/topik-2 has no depth to get wrong, and one segment
// is demonstrably enough. The path form is still read so the local Express server and any
// direct call keep working.
function keyOf(req, parts) {
  const q = (req.query && req.query.key) || '';
  if (q) return String(Array.isArray(q) ? q[0] : q);
  return parts.slice(1).join('/');
}

function segmentsOf(req) {
  const fromQuery = [].concat((req.query && req.query.path) || []).filter(Boolean);
  if (fromQuery.length) return fromQuery.map(String);
  const raw = String(req.url || '').split('?')[0].replace(/\/+$/, '');
  // The legacy URL, which vercel.json rewrites here. It has to be matched before the prefix
  // strip below, because '/api/admin' is a prefix of '/api/admin-host' and stripping it
  // leaves '-host' — which is how this endpoint 404'd while every other route worked.
  if (raw === '/api/admin-host') return ['host'];
  const base = '/api/admin/';
  const at = raw.indexOf(base);
  const tail = at >= 0 ? raw.slice(at + base.length) : raw.replace(/^\/+/, '');
  return tail.split('/').filter(Boolean).map(decodeURIComponent);
}
const fail = (res, code, error, details) =>
  json(res, code, { success: false, error, details: details || undefined });

// Signed in, and the one person allowed to write. Reading stays open — it was open before
// this function existed, and the content is served publicly from the CDN anyway.
async function whoami(req) {
  const token = readBearer(req);
  if (!token) return { user: null, owner: false };
  let user = null;
  try { user = await verifyGoogleIdToken(token); } catch (e) { user = null; }
  if (!user) return { user: null, owner: false };
  const allowed = env('ADMIN_GOOGLE_SUB');
  return { user, owner: !!allowed && user.sub === allowed };
}

// Read the file as the game currently sees it, which after an admin save is the copy on the
// CDN and not the one in this deployment's bundle. Reading from the bundle would hand back
// yesterday's file, and the next save would quietly undo the last one.
//
// Returned as the text as well as the parsed body: the text's blob SHA is the version the
// editor saves against (see handleWrite).
async function readCurrent(rel) {
  const url = CONTENT_CDN + rel.split(path.sep).join('/') + '?t=' + Date.now();
  const r = await fetch(url, { cache: 'no-store' });
  if (r.ok) { const text = await r.text(); return { text, body: JSON.parse(text) }; }
  // Only reached if the CDN has never had this file — a world added to the registry before
  // its first publish.
  const fs = require('fs');
  const full = path.join(repoRoot(), rel);
  if (fs.existsSync(full)) { const text = fs.readFileSync(full, 'utf8'); return { text, body: JSON.parse(text) }; }
  const err = new Error(`${rel} is neither on the CDN nor in this build`);
  err.status = 404;
  throw err;
}

async function handleHost(req, res) {
  const { user, owner } = await whoami(req);
  const gh = (() => { try { return githubConfig(); } catch (e) { return null; } })();
  // Asked only for the account that could actually use the answer: it is two GitHub calls,
  // and telling an anonymous visitor about the repository's permissions is not its business.
  const git = (gh && owner) ? await probe(gh).catch(() => null) : null;
  const allowed = env('ADMIN_GOOGLE_SUB');
  const missing = [];
  if (!gh) missing.push('GITHUB_TOKEN and GITHUB_REPO');
  if (!allowed) missing.push('ADMIN_GOOGLE_SUB');
  return json(res, 200, {
    success: true,
    data: {
      // A token that cannot write makes this copy read-only in fact, so it says so rather
      // than offering a Save that will spend an edit and come back 403. If the probe itself
      // could not run, that is not evidence of anything and does not block.
      writable: !!(gh && owner && (!git || git.canWrite)),
      gameUrl: '/',
      signedIn: !!user,
      // Shown so the first sign-in can supply the value that unlocks editing: there is no way
      // to know your own Google sub before signing in once, and hunting for it elsewhere is
      // worse than being handed it here.
      you: user ? { sub: user.sub, email: user.email, name: user.name } : null,
      owner,
      branch: gh ? gh.branch : null,
      // What the token can actually do, checked rather than assumed. Without this the first
      // sign of a read-only token is a 403 at the end of an edit.
      git,
      // Writing to a branch that does not publish puts the CDN ahead of the repository: the
      // change is live for players, and the branch the pipeline builds from has never seen it.
      // The next publish then reverts it without a word. Worth saying out loud on every screen
      // rather than discovering from a stray "(test)" in a learner's instruction line.
      scratchBranch: !!(gh && gh.branch !== 'main'),
      needsEnv: missing,
      // Four states, not three. Collapsing 'not signed in' into 'signed in as the wrong
      // person' told an anonymous caller they were signed in, which is both untrue and the
      // opposite of the instruction they needed.
      hint: !gh
        ? 'Set GITHUB_TOKEN and GITHUB_REPO in Vercel to edit from here.'
        : (!allowed
          ? 'Sign in, then set ADMIN_GOOGLE_SUB to the sub shown here to unlock editing.'
          : (!user
            ? 'Sign in with Google to edit.'
            : (!owner
              ? 'Signed in, but this is not the account allowed to edit.'
              : ((git && git.why) || ''))))
    }
  });
}

async function handleRead(req, res, key) {
  const entry = content.byKey(key);
  if (!entry) return fail(res, 404, 'Not Found', `No content registered under "${key}"`);
  const { text, body } = await readCurrent(entry.rel);
  return json(res, 200, {
    success: true,
    // `version` is the git blob SHA of exactly the bytes shown. The editor sends it back as
    // If-Match, and a file that has changed on GitHub since is not saved over.
    data: { key: entry.key, label: entry.label, group: entry.group, rel: entry.rel, body, version: blobSha(text) }
  });
}

async function handleWrite(req, res, key) {
  const entry = content.byKey(key);
  if (!entry) return fail(res, 404, 'Not Found', `No content registered under "${key}"`);

  const { user, owner } = await whoami(req);
  if (!user) return fail(res, 401, 'Unauthorized', 'Sign in with Google to edit.');
  if (!owner) return fail(res, 403, 'Forbidden', 'This account is not allowed to edit content.');

  let gh;
  try { gh = githubConfig(); } catch (e) { return fail(res, 503, 'Not configured', e.message); }
  if (!gh) return fail(res, 503, 'Not configured', 'GITHUB_TOKEN and GITHUB_REPO are not set.');

  // Validated before anything is written anywhere. The same rules the local admin enforces
  // and, for most of them, the same rules CI enforces afterwards — so a bad edit is refused
  // here rather than becoming a red build ten minutes later with the broken copy already live.
  let normalised;
  try {
    normalised = entry.validate(req.body, { rootDir: repoRoot(), rel: entry.rel });
  } catch (e) {
    return fail(res, 400, 'Rejected', e.message);
  }

  const text = JSON.stringify(normalised, null, 2) + '\n';
  const rel = entry.rel.split(path.sep).join('/');
  const message = `content: ${entry.label} via admin\n\nEdited by ${user.email || user.sub} at ${new Date().toISOString()}.\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>`;

  // The version the editor opened (see handleRead). A copy opened an hour ago must not be
  // saved over a commit made since — by a second tab, by the local admin, by hand.
  const expectedSha = String(req.headers['if-match'] || '').replace(/^W\//, '').replace(/"/g, '') || undefined;

  let commit;
  try {
    commit = await commitFile(gh, rel, text, message, { expectedSha });
  } catch (e) {
    if (e.status === 409) return fail(res, 409, 'Conflict', e.message);
    // A 403 here is almost always the token's permissions, and GitHub's own wording — "Resource
    // not accessible by personal access token" — is true and tells you nothing about which of
    // the three usual causes it is. Ask, then say.
    if (/403/.test(e.message)) {
      const p = await probe(gh).catch(() => null);
      return fail(res, 403, 'GitHub refused the write',
        (p && p.why) || 'The token cannot write to ' + gh.repo
        + '. Check Repository permissions → Contents: Read and write.');
    }
    return fail(res, 502, 'GitHub write failed', e.message);
  }

  // Only after the commit. If the upload fails the repo is still right and the next publish
  // fixes the CDN; if it were the other way round a failed commit would leave R2 holding
  // content the repo has never seen and the next publish would revert it without a trace.
  let published = null;
  try { published = await putContent(rel, text); }
  catch (e) { published = null; }

  return json(res, 200, {
    success: true,
    data: {
      key: entry.key,
      rel,
      body: normalised,
      // What the next save from this editor is made against.
      version: blobSha(text),
      unchanged: commit.unchanged === true,
      commit: commit.commit || null,
      commitUrl: commit.url || null,
      branch: gh.branch,
      live: !!published,
      // Said plainly rather than reported as "Saved": the CDN is live now, the invariants run
      // afterwards, and those are two different kinds of done.
      note: published
        ? (gh.branch === 'main'
          ? 'Live on the CDN now. CI will run the full invariant set against the commit.'
          : 'Live on the CDN now, but committed to ' + gh.branch + ' — main has not seen this,'
            + ' and the next publish from main will overwrite it.')
        : 'Committed, but the CDN upload failed — it will catch up on the next publish.'
    }
  });
}

/// ── Translations ────────────────────────────────────────────────────────────
//
// Reads scan the repo copy bundled with this function rather than the CDN, which is a
// deliberate difference from handleRead above. The two are asking different questions: a
// content read wants the file as the game currently sees it, while the translator wants
// the English that the catalogue keys were built against — and after an English edit those
// are the same thing only until the next deploy. Scanning the bundle keeps the key, the
// English on screen and the catalogue in agreement; the alternative shows new English
// against keys nothing will match, which reads as "everything went stale at once".
//
// The catalogue is another matter. The bundle's copy is as old as the deployment, so a
// save's merge runs on the copy GitHub holds, and the rows a translator reads come from the
// CDN copy the last save uploaded — otherwise a second save before the next deploy merged
// into the deployment's copy and quietly dropped the first, and the tab went on showing the
// translations as missing after they had been saved.
//
// Both run in a scratch directory under the OS temp dir. The function's own filesystem is
// read-only on Vercel, which the save used to write straight into — so it never worked there.
//
// vercel.json's `functions` block bundles levels.json and worlds/** for this route.
const I18N_INDEX_REL = 'js/locales/catalogs.js';

function bundleText(root, rel) {
  const fs = require('fs');
  const full = path.join(root, rel.split('/').join(path.sep));
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
}

async function cdnText(rel) {
  try {
    const r = await fetch(CONTENT_CDN + rel + '?t=' + Date.now(), { cache: 'no-store' });
    return r.ok ? await r.text() : null;
  } catch (e) {
    return null;
  }
}

/** A scratch root holding `files` ({ rel: text }), for the i18n library to read and write. */
function scratchRoot(files) {
  const fs = require('fs');
  const os = require('os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hv-i18n-'));
  Object.keys(files).forEach((rel) => {
    if (files[rel] === null || files[rel] === undefined) return;
    const dest = path.join(tmp, rel.split('/').join(path.sep));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, files[rel]);
  });
  return tmp;
}

function dropScratch(tmp) {
  try { require('fs').rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
}

async function handleI18n(req, res) {
  const i18n = require('../../admin/lib/i18n');
  const root = repoRoot();
  const lang = String((req.query && req.query.lang) || 'vi');
  const englishOf = (src) => (src === i18n.CHROME_KEY ? 'js/locales/en.js' : src);
  const catalogOf = (src, code) =>
    path.relative(root, i18n.catalogPathFor(root, src, code)).split(path.sep).join('/');

  if (req.method === 'GET') {
    const source = req.query && req.query.source;
    if (!source) return json(res, 200, { success: true, data: i18n.report(root, lang) });
    const src = i18n.assertSource(String(source));
    const code = i18n.assertLang(lang);
    const fresh = await cdnText(catalogOf(src, code));
    if (fresh === null) return json(res, 200, { success: true, data: i18n.rows(root, src, code) });
    const tmp = scratchRoot({
      [englishOf(src)]: bundleText(root, englishOf(src)),
      [catalogOf(src, code)]: fresh
    });
    try {
      return json(res, 200, { success: true, data: i18n.rows(tmp, src, code) });
    } finally { dropScratch(tmp); }
  }

  if (req.method !== 'PUT') return fail(res, 405, 'Method Not Allowed');

  const { user, owner } = await whoami(req);
  if (!user) return fail(res, 401, 'Unauthorized', 'Sign in with Google to edit.');
  if (!owner) return fail(res, 403, 'Forbidden', 'This account is not allowed to edit content.');

  let gh;
  try { gh = githubConfig(); } catch (e) { return fail(res, 503, 'Not configured', e.message); }
  if (!gh) return fail(res, 503, 'Not configured', 'GITHUB_TOKEN and GITHUB_REPO are not set.');

  const body = req.body || {};
  const src = i18n.assertSource(body.source);
  const code = i18n.assertLang(body.lang || lang);
  const rel = catalogOf(src, code);
  const chrome = src === i18n.CHROME_KEY;

  let latest;
  try { latest = await readFile(gh, rel); }
  catch (e) { return fail(res, 502, 'GitHub read failed', e.message); }

  const tmp = scratchRoot({
    [englishOf(src)]: bundleText(root, englishOf(src)),
    [rel]: latest ? latest.text : bundleText(root, rel)
  });
  try {
    // Merged and validated in the library, against the same scan the read used. Written to
    // the scratch copy first, then read back as bytes: the file on disk is what has to reach
    // GitHub and R2, and re-serialising it here would be a second implementation of the
    // writer that could disagree with the local one. The index is left to the code below,
    // since the scratch copy holds this one catalogue and a rescan would list nothing else.
    const result = i18n.saveRows(tmp, src, code, body.entries || {}, { index: false });
    const text = require('fs').readFileSync(path.join(tmp, rel.split('/').join(path.sep)), 'utf8');

    const message = `i18n: ${src} → ${code} via admin\n\nEdited by ${user.email || user.sub}`
      + ` at ${new Date().toISOString()}.\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>`;
    let commit;
    // Against the copy the merge ran on: a save that lands in between is not written over.
    try { commit = await commitFile(gh, rel, text, message, { expectedSha: latest ? latest.sha : undefined }); }
    catch (e) {
      if (e.status === 409) return fail(res, 409, 'Conflict', 'Another save of this catalogue landed a moment ago — save again.');
      return fail(res, 502, 'GitHub write failed', e.message);
    }

    // A curriculum catalogue the game has never loaded needs its line in js/locales/catalogs.js,
    // or the game never asks for it; one that has just been emptied loses its line. Only that
    // one entry is changed, against the index GitHub holds, so a catalogue created by an
    // earlier save that this deployment has not seen stays listed.
    let indexed = null;
    if (!chrome) {
      try {
        const idx = await readFile(gh, I18N_INDEX_REL);
        const idxText = idx ? idx.text : bundleText(root, I18N_INDEX_REL);
        const present = Object.keys(i18n.readCatalog(tmp, src, code).entries).length > 0;
        const next = i18n.renderCatalogIndex(
          i18n.setCatalogIndexed(i18n.parseCatalogIndex(idxText), src, code, present));
        if (next !== idxText) {
          indexed = await commitFile(gh, I18N_INDEX_REL, next,
            `i18n: index ${present ? 'adds' : 'drops'} ${src} → ${code}`
            + '\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>',
            { expectedSha: idx ? idx.sha : undefined });
        }
      } catch (e) {
        return fail(res, 502, 'The catalogue was saved, but the index was not',
          e.message + ' — save again to retry.');
      }
    }

    let published = null;
    try { published = await putContent(rel, text); }
    catch (e) { published = null; }

    // Said per kind of file, because they reach players by different roads. A curriculum
    // catalogue is read from the CDN, so the upload makes it live. The interface table and
    // the index are part of the site itself and ship with the next deploy, after CI.
    const note = chrome
      ? 'Committed. Interface strings are part of the site, so players on ' + code
        + ' see them after the next deploy, once CI has passed.'
      : (published
        ? 'Live on the CDN now — players on ' + code + ' see it on their next load.'
          + (indexed ? ' This catalogue is new, though: the game starts asking for it with the next deploy.' : '')
        : 'Committed, but the CDN upload failed — it will catch up on the next publish.');

    return json(res, 200, {
      success: true,
      data: Object.assign({}, result, {
        rel,
        commit: commit.commit || null,
        commitUrl: commit.url || null,
        indexCommit: (indexed && indexed.commit) || null,
        branch: gh.branch,
        live: !chrome && !!published,
        note
      })
    });
  } finally {
    dropScratch(tmp);
  }
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const parts = segmentsOf(req);
  const head = parts[0] || '';
  const key = keyOf(req, parts);

  try {
    if (head === 'host') {
      if (req.method !== 'GET') return fail(res, 405, 'Method Not Allowed');
      return await handleHost(req, res);
    }
    if (head === 'i18n') return await handleI18n(req, res);
    if (head === 'content') {
      if (!key) {
        if (req.method !== 'GET') return fail(res, 405, 'Method Not Allowed');
        return json(res, 200, { success: true, data: content.list() });
      }
      if (req.method === 'GET') return await handleRead(req, res, key);
      if (req.method === 'PUT') return await handleWrite(req, res, key);
      return fail(res, 405, 'Method Not Allowed');
    }
    return fail(res, 404, 'Not Found',
      `Unknown admin route "${parts.join('/')}" (url ${String(req.url || '').split('?')[0]})`);
  } catch (e) {
    return fail(res, e.status || 500, 'Server error', e.message);
  }
};
