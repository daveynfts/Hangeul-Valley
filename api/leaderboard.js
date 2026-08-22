// GET /api/leaderboard?tab=vocab&limit=20
//
// Reads the board. Writing is not a route of its own: entries are written by the save PUT in
// api/save.js, which already holds a verified Google identity. There is deliberately no way for
// a client to post a score directly — a submit endpoint would be a second thing to authenticate
// and a second place for the numbers to disagree with the save they came from.
//
// Auth is optional. Anyone may read the board; a caller who sends a Bearer token also gets
// `you`, their own row and its position, which is what lets the client show a player their
// standing when they are outside the top N.

const { ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const { r2Client, r2Bucket, setCors, verifyGoogleIdToken, readBearer } = require('./_r2');
const { PREFIX, rankBoard, publicRow, publicId } = require('./_leaderboard');

const LIMIT_DEFAULT = 20;
const LIMIT_MAX = 100;
// Every read walks the whole prefix, which is fine at this size and would not be at a much
// larger one. The cap keeps a pathological bucket from turning one request into thousands of
// GETs; when it bites, the response says so rather than quietly serving a partial board.
const SCAN_MAX = 500;

async function readEntry(client, Bucket, Key) {
  try {
    const out = await client.send(new GetObjectCommand({ Bucket, Key }));
    const entry = JSON.parse(await out.Body.transformToString());
    return entry && entry.id ? entry : null;
  } catch {
    // One unreadable or half-written row must not take the whole board down with it.
    return null;
  }
}

async function listEntryKeys(client, Bucket) {
  const keys = [];
  let token;
  let truncated = false;
  do {
    const out = await client.send(new ListObjectsV2Command({
      Bucket, Prefix: PREFIX, ContinuationToken: token
    }));
    for (const o of out.Contents || []) {
      if (!o || !o.Key || !o.Key.endsWith('.json')) continue;
      if (keys.length >= SCAN_MAX) { truncated = true; break; }
      keys.push(o.Key);
    }
    token = (!truncated && out.IsTruncated) ? out.NextContinuationToken : undefined;
  } while (token);
  return { keys, truncated };
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET') { res.status(405).json({ error: 'method not allowed' }); return; }

  const client = r2Client();
  if (!client) { res.status(503).json({ error: 'leaderboard not configured' }); return; }

  const q = (req.query && typeof req.query === 'object') ? req.query : {};
  const tab = String(q.tab || 'vocab');
  const limit = Math.min(LIMIT_MAX, Math.max(1, Number(q.limit) || LIMIT_DEFAULT));

  // Identifying the caller is a convenience, never a requirement. A bad or expired token means
  // no `you` block, not a failed read — a signed-out player still gets to see the board.
  let me = null;
  try {
    const user = await verifyGoogleIdToken(readBearer(req));
    if (user && user.sub) me = publicId(user.sub);
  } catch { me = null; }

  try {
    const Bucket = r2Bucket();
    const { keys, truncated } = await listEntryKeys(client, Bucket);
    const entries = (await Promise.all(keys.map((k) => readEntry(client, Bucket, k)))).filter(Boolean);

    const ranked = rankBoard(entries, tab);
    const rows = ranked.slice(0, limit).map((e, i) => ({ rank: i + 1, ...publicRow(e) }));

    let you = null;
    if (me) {
      const at = ranked.findIndex((e) => e.id === me);
      if (at >= 0) you = { rank: at + 1, ...publicRow(ranked[at]) };
    }

    // `you` is the caller's own standing, so a shared cache must not hand it to the next
    // reader. Vary on Authorization for the same reason.
    res.setHeader('Vary', 'Origin, Authorization');
    res.setHeader('Cache-Control', me ? 'private, no-store' : 'public, max-age=30');
    res.status(200).json({
      tab, total: ranked.length, truncated,
      rows,
      you,
      // Told plainly rather than implied: these numbers come from each player's own save, so
      // the board reflects what clients reported. Callers can show that if they choose.
      trust: 'client-reported'
    });
  } catch (e) {
    console.error('[leaderboard]', e && e.name, e && e.message);
    res.status(500).json({ error: 'leaderboard unavailable' });
  }
};
