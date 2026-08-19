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
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken));
  if (!r.ok) return null;
  const p = await r.json();
  const aud = env('GOOGLE_CLIENT_ID');
  if (aud && p.aud !== aud) return null;
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

module.exports = {
  env, r2Client, r2Bucket, saveKey, setCors, verifyGoogleIdToken, readBearer
};
