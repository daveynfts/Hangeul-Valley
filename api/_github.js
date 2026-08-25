'use strict';

/**
 * Committing one file to the repo through the GitHub Contents API.
 *
 * This exists because Vercel's filesystem is read-only: a function cannot write into the
 * deployment it is running from. The admin therefore does not edit files, it commits them,
 * and the commit is what makes the change real — CI runs the same 1652 invariants against it
 * that every hand-written change goes through, and the history is a history rather than a
 * pile of overwrites.
 *
 * The underscore prefix keeps this out of Vercel's function count, which matters more here
 * than it sounds: the Hobby plan allows twelve, the project uses eleven, and the last time
 * that ceiling was crossed the deployment failed while CI stayed green.
 */

function env(name) {
  return String(process.env[name] || '').trim().replace(/^["']|["']$/g, '');
}

function githubConfig() {
  const token = env('GITHUB_TOKEN');
  const repo = env('GITHUB_REPO');
  const branch = env('GITHUB_BRANCH') || 'main';
  if (!token || !repo) return null;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error('GITHUB_REPO must look like owner/name');
  return { token, repo, branch };
}

function api(cfg, pathPart, init) {
  return fetch('https://api.github.com/repos/' + cfg.repo + pathPart, {
    ...init,
    headers: {
      Authorization: 'Bearer ' + cfg.token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'hangeul-valley-admin',
      ...(init && init.headers)
    }
  });
}

const contentUrl = (rel, branch) =>
  '/contents/' + rel.split('/').map(encodeURIComponent).join('/') + '?ref=' + encodeURIComponent(branch);

// The blob SHA of the file as it stands, or null if it does not exist yet. This is the whole
// concurrency story: GitHub refuses a write whose SHA is stale, so two people editing the
// same bank cannot silently overwrite one another — the second gets a conflict and re-reads.
async function currentSha(cfg, rel) {
  const r = await api(cfg, contentUrl(rel, cfg.branch), { method: 'GET' });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('GitHub read failed: ' + r.status + ' ' + (await r.text()).slice(0, 200));
  const j = await r.json();
  return j.sha || null;
}

/**
 * Commit `text` to `rel`. Returns { committed: false } when the bytes already match, so
 * pressing Save on an untouched file does not add an empty commit to the history — and does
 * not spend a CI run on nothing.
 */
async function commitFile(cfg, rel, text, message) {
  const sha = await currentSha(cfg, rel);
  if (sha) {
    const cur = await api(cfg, contentUrl(rel, cfg.branch), { method: 'GET' });
    if (cur.ok) {
      const j = await cur.json();
      const existing = Buffer.from(String(j.content || ''), 'base64').toString('utf8');
      if (existing === text) return { committed: false, sha, unchanged: true };
    }
  }
  const body = {
    message,
    content: Buffer.from(text, 'utf8').toString('base64'),
    branch: cfg.branch,
    ...(sha ? { sha } : {})
  };
  const r = await api(cfg, '/contents/' + rel.split('/').map(encodeURIComponent).join('/'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (r.status === 409 || r.status === 422) {
    const err = new Error('That file changed since you opened it — reload and reapply your edit.');
    err.status = 409;
    throw err;
  }
  if (!r.ok) throw new Error('GitHub write failed: ' + r.status + ' ' + (await r.text()).slice(0, 200));
  const j = await r.json();
  return {
    committed: true,
    sha: j.content && j.content.sha,
    commit: j.commit && j.commit.sha,
    url: j.commit && j.commit.html_url
  };
}

// Can this token actually write here, and does the branch exist? Both are knowable before a
// save is attempted, and finding out at save time costs a filled-in form and a 403 whose text
// says only "Resource not accessible by personal access token" — true, unhelpful, and silent
// about which of the three usual causes it is.
async function probe(cfg) {
  const out = { repo: cfg.repo, branch: cfg.branch, canWrite: false, branchExists: false, why: '' };
  let r;
  try { r = await api(cfg, '', { method: 'GET' }); }
  catch (e) { out.why = 'GitHub could not be reached: ' + e.message; return out; }
  if (r.status === 401) { out.why = 'The token is not valid — it may have expired or been revoked.'; return out; }
  if (r.status === 404) {
    out.why = 'The token cannot see ' + cfg.repo + '. On a fine-grained token, Repository access'
      + ' must name this repository — the default of Public repositories is not enough.';
    return out;
  }
  if (!r.ok) { out.why = 'GitHub answered ' + r.status + ' when asked about the repository.'; return out; }
  const repo = await r.json();
  // push is the permission the Contents API writes under.
  out.canWrite = !!(repo.permissions && repo.permissions.push);
  if (!out.canWrite) {
    out.why = 'The token can read ' + cfg.repo + ' but not write to it. Set Repository'
      + ' permissions → Contents to Read and write.';
  }
  const b = await api(cfg, '/branches/' + encodeURIComponent(cfg.branch), { method: 'GET' });
  out.branchExists = b.ok;
  if (out.canWrite && !out.branchExists) {
    out.why = 'Branch ' + cfg.branch + ' does not exist on ' + cfg.repo + '.';
  }
  return out;
}

module.exports = { githubConfig, commitFile, currentSha, probe };
