const { S3Client } = require('@aws-sdk/client-s3');

function env(name) {
  return String(process.env[name] || '').trim().replace(/^["']|["']$/g, '');
}

function r2Client() {
  const accountId = env('R2_ACCOUNT_ID');
  const accessKeyId = env('R2_ACCESS_KEY_ID');
  const secretAccessKey = env('R2_SECRET_ACCESS_KEY');
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey }
  });
}

function r2Bucket() {
  return env('R2_BUCKET_NAME') || 'daveynfts';
}

function saveKey(sub) {
  const id = String(sub || '').replace(/[^a-zA-Z0-9._-]/g, '');
  if (!id) throw new Error('bad user id');
  return `saves/${id}.json`;
}

function setCors(req, res) {
  const origin = String(req.headers.origin || '');
  const ok =
    /^https:\/\/([a-z0-9-]+\.)*vercel\.app$/i.test(origin) ||
    /^https:\/\/([a-z0-9-]+\.)*daveynfts\.com$/i.test(origin) ||
    origin === 'http://localhost:8742' ||
    origin === 'http://127.0.0.1:8742';
  if (ok) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
  res.setHeader('Vary', 'Origin');
}

async function verifyGoogleIdToken(idToken) {
  if (!idToken) return null;
  const aud = env('GOOGLE_CLIENT_ID');
  if (!aud) {
    const err = new Error('GOOGLE_CLIENT_ID is not configured');
    err.status = 503;
    err.code = 'AUTH_NOT_CONFIGURED';
    throw err;
  }
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken));
  if (!r.ok) return null;
  const p = await r.json();
  if (p.aud !== aud) return null;
  if (p.iss !== 'https://accounts.google.com' && p.iss !== 'accounts.google.com') return null;
  if (!p.sub) return null;
  return {
    sub: p.sub,
    email: p.email || '',
    name: p.name || '',
    picture: p.picture || ''
  };
}

function readBearer(req) {
  const h = String(req.headers.authorization || '');
  const m = /^Bearer\s+(\S+)/i.exec(h);
  return m ? m[1] : '';
}

// Where the game's content lives in the bucket. vercel.json rewrites /worlds/:path* and its
// siblings to cdn.daveynfts.com/hangeul-valley/, so a file written under this prefix is the
// file the game will load on the next request — no deploy in between.
const CONTENT_PREFIX = 'hangeul-valley/';
// The public face of the same objects. vercel.json rewrites /worlds/:path* here, so this
// is what the game reads and therefore what the admin has to read back after a save —
// the copy bundled into a deployment goes stale the moment an edit lands.
const CONTENT_CDN = 'https://cdn.daveynfts.com/' + CONTENT_PREFIX;

// Push one edited content file straight to the CDN, so an admin save is live at once.
//
// The commit still happens: the repo is the source of truth, and scripts/r2Content.js
// re-uploads from it on every publish. Doing both is what keeps that from mattering — the
// bytes here and the bytes in the commit are the same, so the next publish rewrites this
// object with what is already in it. Writing to R2 *alone* would work for about as long as
// it took someone to run publish, and then silently revert.
async function putContent(rel, text) {
  const client = r2Client();
  if (!client) throw new Error('R2 is not configured');
  const { PutObjectCommand } = require('@aws-sdk/client-s3');
  const key = CONTENT_PREFIX + String(rel).split('\\').join('/');
  await client.send(new PutObjectCommand({
    Bucket: r2Bucket(),
    Key: key,
    Body: Buffer.from(text, 'utf8'),
    ContentType: 'application/json; charset=utf-8',
    CacheControl: 'public, max-age=60'
  }));
  return key;
}

module.exports = {
  env, r2Client, r2Bucket, saveKey, setCors, verifyGoogleIdToken, readBearer,
  putContent, CONTENT_PREFIX, CONTENT_CDN
};
