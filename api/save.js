const { GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { r2Client, r2Bucket, saveKey, setCors, verifyGoogleIdToken, readBearer } = require('./_r2');

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
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

  const user = await verifyGoogleIdToken(readBearer(req));
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
      const body = await readBody(req);
      if (!body || typeof body !== 'object') {
        res.status(400).json({ error: 'save body required' });
        return;
      }
      const payload = Object.assign({}, body, {
        updatedAt: typeof body.updatedAt === 'number' ? body.updatedAt : Date.now(),
        cloudUser: user.sub
      });
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
