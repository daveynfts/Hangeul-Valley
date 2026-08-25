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
const { githubConfig, commitFile } = require('../_github');
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
async function readCurrent(rel) {
  const url = CONTENT_CDN + rel.split(path.sep).join('/') + '?t=' + Date.now();
  const r = await fetch(url, { cache: 'no-store' });
  if (r.ok) return r.json();
  // Only reached if the CDN has never had this file — a world added to the registry before
  // its first publish.
  const fs = require('fs');
  const full = path.join(repoRoot(), rel);
  if (fs.existsSync(full)) return JSON.parse(fs.readFileSync(full, 'utf8'));
  const err = new Error(`${rel} is neither on the CDN nor in this build`);
  err.status = 404;
  throw err;
}

async function handleHost(req, res) {
  const { user, owner } = await whoami(req);
  const gh = (() => { try { return githubConfig(); } catch (e) { return null; } })();
  const allowed = env('ADMIN_GOOGLE_SUB');
  const missing = [];
  if (!gh) missing.push('GITHUB_TOKEN and GITHUB_REPO');
  if (!allowed) missing.push('ADMIN_GOOGLE_SUB');
  return json(res, 200, {
    success: true,
    data: {
      writable: !!(gh && owner),
      gameUrl: '/',
      signedIn: !!user,
      // Shown so the first sign-in can supply the value that unlocks editing: there is no way
      // to know your own Google sub before signing in once, and hunting for it elsewhere is
      // worse than being handed it here.
      you: user ? { sub: user.sub, email: user.email, name: user.name } : null,
      owner,
      branch: gh ? gh.branch : null,
      needsEnv: missing,
      hint: !gh
        ? 'Set GITHUB_TOKEN and GITHUB_REPO in Vercel to edit from here.'
        : (!allowed
          ? 'Sign in, then set ADMIN_GOOGLE_SUB to the sub shown here to unlock editing.'
          : (owner ? '' : 'Signed in, but this is not the account allowed to edit.'))
    }
  });
}

async function handleRead(req, res, key) {
  const entry = content.byKey(key);
  if (!entry) return fail(res, 404, 'Not Found', `No content registered under "${key}"`);
  const body = await readCurrent(entry.rel);
  return json(res, 200, {
    success: true,
    data: { key: entry.key, label: entry.label, group: entry.group, rel: entry.rel, body }
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

  let commit;
  try {
    commit = await commitFile(gh, rel, text, message);
  } catch (e) {
    return fail(res, e.status === 409 ? 409 : 502, e.status === 409 ? 'Conflict' : 'GitHub write failed', e.message);
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
      unchanged: commit.unchanged === true,
      commit: commit.commit || null,
      commitUrl: commit.url || null,
      branch: gh.branch,
      live: !!published,
      // Said plainly rather than reported as "Saved": the CDN is live now, the invariants run
      // afterwards, and those are two different kinds of done.
      note: published
        ? 'Live on the CDN now. CI will run the full invariant set against the commit.'
        : 'Committed, but the CDN upload failed — it will catch up on the next publish.'
    }
  });
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
