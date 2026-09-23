const { GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { r2Client, r2Bucket, saveKey, setCors, verifyGoogleIdToken, readBearer } = require('./_r2');
const { stampSave, trustedStamp } = require('./_stamp');
const { sessionUser, sessionNeedsRefresh, signSession, setSessionCookie } = require('./_session');
const { PREFIX: LB_PREFIX, entryFromSave } = require('./_leaderboard');
// How large a save may be, and how a compressed one is read. See api/_saveBody.js.
const { readSaveBody, saveClaimsOtherAccount } = require('./_saveBody');
// The same merge the client runs, for a closing tab's tail (PATCH below).
const { mergeSaves } = require('../js/systems/saveMerge.js');

// Same sanitising as saveKey: the sub reaches a bucket key, so nothing but the safe alphabet
// gets through. Kept next to the write rather than in _leaderboard.js, which stays free of
// anything that could throw.
function leaderboardKey(sub) {
  const id = String(sub || '').replace(/[^a-zA-Z0-9._-]/g, '');
  if (!id) throw new Error('bad user id');
  return LB_PREFIX + id + '.json';
}

// The save, then its leaderboard row.
//
// The leaderboard row is a byproduct of the save rather than something the client posts
// separately. This endpoint already knows who the player is, and the numbers are already
// here, so a second route would only add another thing to authenticate and another place
// for the board to disagree with the save it came from.
//
// It is written after the save and never allowed to fail it. A player whose progress was
// stored but whose board row was not is behind by one save; a player told their save
// failed when it did not would go looking for lost progress. entryFromSave clamps and
// strips everything it reads — see api/_leaderboard.js.
async function storeSave(client, Key, payload, user, writeNow) {
  await client.send(new PutObjectCommand({
    Bucket: r2Bucket(),
    Key,
    Body: JSON.stringify(payload),
    ContentType: 'application/json',
    CacheControl: 'private, no-store'
  }));
  try {
    await client.send(new PutObjectCommand({
      Bucket: r2Bucket(),
      Key: leaderboardKey(user.sub),
      Body: JSON.stringify(entryFromSave(payload, user, writeNow)),
      ContentType: 'application/json',
      CacheControl: 'public, max-age=30'
    }));
  } catch (e) {
    console.warn('[save] leaderboard row not written:', e && e.name, e && e.message);
  }
}

// The revision a stored save is at. Saves written before revisions existed have none, and
// count as revision 0 — which is also what a client that read nothing sends as its base.
function storedRev(save) {
  const r = save && Number(save.rev);
  return Number.isInteger(r) && r > 0 ? r : 0;
}

async function getObjectJson(client, Key) {
  let text;
  try {
    const out = await client.send(new GetObjectCommand({ Bucket: r2Bucket(), Key }));
    text = await out.Body.transformToString();
  } catch (e) {
    const name = e && e.name;
    if (name === 'NoSuchKey' || name === 'NotFound' || (e.$metadata && e.$metadata.httpStatusCode === 404)) {
      return null;
    }
    throw e;
  }
  // An object that is there but does not parse counts as no object, not as a failed request.
  //
  // It used to throw, and the throw reached the handler's catch and came back as a 500. That
  // is the worst possible answer here, because the GET is what runs at sign-in: one truncated
  // or half-written save and the account could never sign in again — and never overwrite the
  // bad copy either, because the write it needed was on the other side of the read that kept
  // failing. Returning null lets the client sign in and push its own save over the top, which
  // is the only recovery there is. api/leaderboard.js already treats its rows this way.
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('[save] unreadable object at', Key, '-', e && e.message,
      '- treating as absent so the account can recover');
    return null;
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

  // The cookie first, and it answers without leaving the machine: the signature is checked
  // locally, so an authenticated save costs no round trip to Google at all. The Bearer path
  // below is what a client uses before it has a session — and what every client used before
  // sessions existed, which is why it stays.
  const now = Date.now();
  const session = sessionUser(req, now);
  let user = session;
  if (!user) {
    try {
      user = await verifyGoogleIdToken(readBearer(req));
    } catch (e) {
      if (e && (e.code === 'AUTH_NOT_CONFIGURED' || e.status === 503)) {
        res.status(503).json({ error: 'sign in not configured' });
        return;
      }
      // Anything else here is a failure to reach Google, not a failure of the save. It used to
      // be rethrown from outside the try below, so it escaped the handler entirely: the platform
      // turned it into a 500 with nothing in the log to say why, and the client read that as
      // "the save is broken" rather than "try again". 502 says which side it was.
      console.error('[save] token check failed:', e && e.name, e && e.message);
      res.status(502).json({ error: 'could not reach the sign-in service' });
      return;
    }
  }
  if (!user) {
    res.status(401).json({ error: 'sign in required' });
    return;
  }
  // Extend a session the player is plainly still using, so thirty days runs from the last
  // time they played rather than from the day they signed in. Written here so it rides
  // whatever this request answers with.
  if (session && sessionNeedsRefresh(session, now)) {
    const fresh = signSession(session, now);
    if (fresh) setSessionCookie(req, res, fresh);
  }

  // saveKey throws on an id that sanitises to nothing. That cannot come from a verified
  // Google token, but it sat outside the try below where a throw would have been a bare 500.
  let Key;
  try {
    Key = saveKey(user.sub);
  } catch (e) {
    console.error('[save] unusable account id:', e && e.message);
    res.status(400).json({ error: 'unusable account id' });
    return;
  }

  try {
    if (req.method === 'GET') {
      const data = await getObjectJson(client, Key);
      res.setHeader('Cache-Control', 'private, no-store');
      // Only the four fields the auth chip draws. A session user also carries iat and exp,
      // and the client writes whatever this returns straight into its stored profile.
      res.status(200).json({
        user: { sub: user.sub, email: user.email || '', name: user.name || '', picture: user.picture || '' },
        data
      });
      return;
    }
    if (req.method === 'PUT') {
      let body;
      try {
        body = await readSaveBody(req);
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
      // Somebody else's progress, on its way into this account from a shared browser. The
      // stored copy is left alone; see saveClaimsOtherAccount.
      if (saveClaimsOtherAccount(body, user.sub)) {
        res.setHeader('Cache-Control', 'private, no-store');
        res.status(409).json({ error: 'account mismatch' });
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
      const currentRev = storedRev(current);

      // The revision is what decides now. A timestamp only says when a device wrote, not what
      // it had seen: a laptop whose tab had been open since yesterday wrote a newer stamp than
      // the phone that played this morning, and so won, putting yesterday back over the
      // morning's reviews. `baseRev` is the revision the client's state was built on. If
      // somebody has written since, the client is handed the current copy, merges the two
      // (js/systems/saveMerge.js) and sends again on top of it.
      if (Object.prototype.hasOwnProperty.call(body, 'baseRev')) {
        if (current && Number(body.baseRev) !== currentRev) {
          res.setHeader('Cache-Control', 'private, no-store');
          res.status(409).json({ error: 'conflict', rev: currentRev, updatedAt: currentAt, data: current });
          return;
        }
      } else if (currentAt > payload.updatedAt) {
        // A build that predates revisions: the timestamp rule it was written against.
        res.setHeader('Cache-Control', 'private, no-store');
        res.status(409).json({
          error: 'stale save',
          updatedAt: currentAt,
          sentAt: payload.updatedAt,
          data: current
        });
        return;
      }
      delete payload.baseRev;
      payload.rev = currentRev + 1;
      await storeSave(client, Key, payload, user, writeNow);
      res.status(200).json({ ok: true, updatedAt: payload.updatedAt, rev: payload.rev });
      return;
    }
    // A closing tab's tail: only what changed since that tab's last upload landed, merged into
    // the copy held here. The whole save is past keepalive's 64 KiB for nearly everyone who
    // plays, and the ordinary request a closing page falls back to is the one it cancels, so
    // without this the end of every session reached that device and nowhere else. It is a
    // merge (js/systems/saveMerge.js), so it needs no base revision: records keep their most
    // recent answer whichever side they came from, and the tail's game-in-the-moment wins only
    // if it is the newer of the two.
    if (req.method === 'PATCH') {
      let tail;
      try {
        tail = await readSaveBody(req);
      } catch (e) {
        if (e && e.status === 413) { res.status(413).json({ error: 'save too large' }); return; }
        throw e;
      }
      if (!tail || typeof tail !== 'object' || !tail.patch) {
        res.status(400).json({ error: 'patch body required' });
        return;
      }
      if (saveClaimsOtherAccount(tail, user.sub)) {
        res.status(409).json({ error: 'account mismatch' });
        return;
      }
      const current = await getObjectJson(client, Key);
      if (!current) {
        // A tail needs something to land on. This device's copy still holds the progress, and
        // its next visit writes it whole.
        res.status(409).json({ error: 'nothing to patch' });
        return;
      }
      const writeNow = Date.now();
      const tailAt = stampSave(tail.updatedAt, writeNow);
      const currentAt = trustedStamp(current.updatedAt, writeNow);
      const merged = mergeSaves(current, tail, { prefer: tailAt >= currentAt ? 'b' : 'a' });
      delete merged.patch;
      delete merged.baseRev;
      merged.updatedAt = Math.max(tailAt, currentAt);
      merged.cloudUser = user.sub;
      merged.rev = storedRev(current) + 1;
      await storeSave(client, Key, merged, user, writeNow);
      res.status(200).json({ ok: true, updatedAt: merged.updatedAt, rev: merged.rev });
      return;
    }
    res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    console.error('[save]', e && e.name, e && e.message);
    res.status(500).json({ error: 'save failed' });
  }
};
