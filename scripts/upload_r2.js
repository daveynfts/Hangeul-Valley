/**
 * Upload Hangeul Valley static content to the shared Cloudflare R2 bucket
 * under prefix hangeul-valley/.
 *
 * Credentials: env R2_* (or --env path). Does not print secrets.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const ROOT = path.resolve(__dirname, '..');
const PREFIX = 'hangeul-valley/';

function loadEnvFile(file) {
  if (!file || !fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (v && !process.env[k] && v !== '[SENSITIVE]') process.env[k] = v;
  }
}

function env(k) {
  return String(process.env[k] || '').trim().replace(/^["']|["']$/g, '');
}

const envPath = process.argv.includes('--env')
  ? process.argv[process.argv.indexOf('--env') + 1]
  : path.join(process.env.TEMP || '/tmp', 'hangeul-r2.env');
loadEnvFile(envPath);
loadEnvFile(path.join(ROOT, '.env.local'));

const accountId = env('R2_ACCOUNT_ID');
const accessKeyId = env('R2_ACCESS_KEY_ID');
const secretAccessKey = env('R2_SECRET_ACCESS_KEY');
const bucket = env('R2_BUCKET_NAME');
const publicBase = (env('R2_PUBLIC_BASE_URL') || env('R2_PUBLIC_URL')).replace(/\/$/, '');

console.log('R2 env present', {
  ACCOUNT_ID: accountId.length,
  ACCESS_KEY_ID: accessKeyId.length,
  SECRET: secretAccessKey.length,
  BUCKET: bucket.length,
  PUBLIC: publicBase.length
});
if (!accountId || !accessKeyId || !secretAccessKey || !bucket || accountId === '[SENSITIVE]') {
  console.error('Missing real R2_* credentials (Vercel Sensitive vars are not readable via env pull).');
  process.exit(1);
}

const FILES = [
  ['levels.json', 'application/json'],
  ['facts.json', 'application/json'],
  ['worlds/2b-unit-10.json', 'application/json'],
  ['worlds/unit10-desk-quiz.json', 'application/json'],
  ['worlds/unit10-layout.json', 'application/json'],
  ['worlds/unit10-mindmap.jpg', 'image/jpeg'],
  ['sprites/study_desk.png', 'image/png'],
  ['sprites/unit10_kitchen.png', 'image/png'],
  ['diner/content.json', 'application/json']
];

function cacheControl(ctype) {
  if (ctype === 'application/json') return 'public, max-age=60';
  return 'public, max-age=86400';
}

(async () => {
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey }
  });

  const uploaded = [];
  for (const [rel, ctype] of FILES) {
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) {
      console.warn('skip missing', rel);
      continue;
    }
    const Key = PREFIX + rel.replace(/\\/g, '/');
    const Body = fs.readFileSync(full);
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key,
      Body,
      ContentType: ctype,
      CacheControl: cacheControl(ctype)
    }));
    uploaded.push({ key: Key, bytes: Body.length, type: ctype });
    console.log('PUT', Key, Body.length + 'B');
  }

  const listed = await client.send(new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: PREFIX
  }));
  const keys = (listed.Contents || []).map((o) => o.Key);
  console.log('LIST', PREFIX, keys.length, 'objects');
  keys.forEach((k) => console.log(' ', k));
  if (publicBase) console.log('PUBLIC_BASE', publicBase);
  console.log('BUCKET', bucket);
  console.log('UPLOADED', uploaded.length);
})().catch((err) => {
  console.error('UPLOAD_FAIL', err && err.name, err && err.message);
  process.exit(1);
});
