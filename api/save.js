const { GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { r2Client, r2Bucket, saveKey, setCors, verifyGoogleIdToken, readBearer } = require('./_r2');

const SAVE_BODY_MAX = 256 * 1024;

// How far ahead of the server's own clock a client stamp is allowed to be. Wide enough to
// absorb ordinary drift and the flight time of the request, narrow enough that a wrong
// device clock cannot park the save in the future. See stampSave below.
const CLOCK_SKEW_MAX = 5 * 60 * 1000;

// updatedAt decides which copy wins, both in the staleness check below and in the client's
// syncCloudSave. It arrives from the client, so a device whose clock is set years ahead used
// to be able to write a timestamp no honest save could ever beat: every later PUT 409'd, and
// on each load the client saw the remote as newer and pulled that stale copy back over the
// player's real progress. One bad clock pinned the account permanently.
//
// stampSave is what gets written: a stamp that cannot be true is replaced by server time
// rather than rejected, because the save itself is still good and refusing it would strand a
// player behind a clock they may not know is wrong.
function stampSave(value, now) {
  if (!isPlausibleStamp(value, now)) return now;
  return value;
}

// trustedStamp is what the staleness comparison reads. Here an impossible stamp has to score
// zero, not `now` — clamping it up would outrank the timestamp the client just sent and keep
// rejecting honest writes forever, which is the exact failure this is meant to clear.
function trustedStamp(value, now) {
  return isPlausibleStamp(value, now) ? value : 0;
}

function isPlausibleStamp(value, now) {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value >= 0
    && value <= now + CLOCK_SKEW_MAX;
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') {
    if (Buffer.byteLength(JSON.stringify(req.body)) > SAVE_BODY_MAX) {
      const err = new Error('save too large');
      err.status = 413;
      throw err;
    }
    return req.body;
  }
  if (typeof req.body === 'string') {
    if (Buffer.byteLength(req.body) > SAVE_BODY_MAX) {
      const err = new Error('save too large');
      err.status = 413;
      throw err;
    }
    try { return JSON.parse(req.body); } catch { return null; }
  }
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > SAVE_BODY_MAX) {
      const err = new Error('save too large');
      err.status = 413;
      throw err;
    }
    chunks.push(c);
  }
  if (!chunks.length) return null;
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return null; }
}

async function getObjectJson(client, Key) {
  try {
    const out = await client.send(new GetObjectCommand({ Bucket: r2Bucket(), Key }));
    const text = await out.Body.transformToString();
    return JSON.parse(text);
  } catch (e) {
    const name = e && e.name;
    if (name === 'NoSuchKey' || name === 'NotFound' || (e.$metadata && e.$metadata.httpStatusCode === 404)) {
      return null;
    }
    throw e;
  }
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const client = r2Client();
  if (!client) {
    res.status(503).json({ error: 'cloud save not configured' });
    return;
  }

  let user;
  try {
    user = await verifyGoogleIdToken(readBearer(req));
  } catch (e) {
    if (e && (e.code === 'AUTH_NOT_CONFIGURED' || e.status === 503)) {
      res.status(503).json({ error: 'sign in not configured' });
      return;
    }
    throw e;
  }
  if (!user) {
    res.status(401).json({ error: 'sign in required' });
    return;
  }

  const Key = saveKey(user.sub);

  try {
    if (req.method === 'GET') {
      const data = await getObjectJson(client, Key);
      res.setHeader('Cache-Control', 'private, no-store');
      res.status(200).json({ user, data });
      return;
    }
    if (req.method === 'PUT') {
      let body;
      try {
        body = await readBody(req);
      } catch (e) {
        if (e && e.status === 413) {
          res.status(413).json({ error: 'save too large' });
          return;
        }
        throw e;
      }
      if (!body || typeof body !== 'object') {
        res.status(400).json({ error: 'save body required' });
        return;
      }
      // One clock reading for both stamps below. Two Date.now() calls would leave the stored
      // copy a few milliseconds "newer" than the payload and 409 a save that should land.
      const writeNow = Date.now();
      const payload = Object.assign({}, body, {
        updatedAt: stampSave(body.updatedAt, writeNow),
        cloudUser: user.sub
      });

      // Refuse to move the save backwards. The write used to be unconditional, so a stale
      // PUT — a request delayed in flight, or a second device that had been offline — would
      // overwrite newer progress and there was nothing to detect it afterwards. The client
      // serializes its own writes; this is the guard for everything it cannot see.
      //
      // A same-timestamp PUT is allowed through: it is the common "re-upload the copy I
      // already have" case, and rejecting it would make a retry after a dropped response
      // look like a conflict.
      const current = await getObjectJson(client, Key);
      // A stored stamp from the future is not evidence of newer progress, so it does not get
      // to win this comparison. Anything already in the bucket was written before stampSave
      // existed, and reading it raw here would keep 409ing every honest write exactly as
      // before — the account would stay pinned even though new writes are now clamped. It is
      // discarded the same way a missing or non-numeric stamp is: unusable, so it blocks
      // nothing. Clamping it to `now` instead would be worse than doing nothing, because
      // `now` outranks the timestamp the client just sent.
      const currentAt = trustedStamp(current && current.updatedAt, writeNow);
      if (currentAt > payload.updatedAt) {
        res.setHeader('Cache-Control', 'private, no-store');
        res.status(409).json({
          error: 'stale save',
          updatedAt: currentAt,
          sentAt: payload.updatedAt,
          data: current
        });
        return;
      }

      await client.send(new PutObjectCommand({
        Bucket: r2Bucket(),
        Key,
        Body: JSON.stringify(payload),
        ContentType: 'application/json',
        CacheControl: 'private, no-store'
      }));
      res.status(200).json({ ok: true, updatedAt: payload.updatedAt });
      return;
    }
    res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    console.error('[save]', e && e.name, e && e.message);
    res.status(500).json({ error: 'save failed' });
  }
};

// Hung off the handler so the stamp rules can be tested without a bucket or a signed token.
// Vercel only ever calls the default export, so the extra properties are inert in production.
module.exports.stampSave = stampSave;
module.exports.trustedStamp = trustedStamp;
module.exports.CLOCK_SKEW_MAX = CLOCK_SKEW_MAX;
