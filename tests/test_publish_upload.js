/**
 * tests/test_publish_upload.js — publish uploads what changed, in parallel.
 *
 * Publish took 25 minutes for a commit that touched five files, none of which R2 even
 * serves. Two reasons, both in scripts/r2Content.js: every object went up on every run
 * (`dropPublishedClips` exempted the Korean clips and nothing else), and both loops were
 * sequential — a PUT per file, then a HeadObject per file, 3406 round-trips to Cloudflare
 * one after another. 19 minutes of upload, 6 of verify, inside a job capped at 40.
 *
 * The skip is the dangerous half. This repo's whole failure mode is content that is on disk
 * and not on the CDN: /worlds/*, /locales/* and /audio/* are rewritten to R2, so an object
 * left behind does not fall back to the checked-in copy — it 404s, and whatever reads it
 * goes quietly missing. So the tests below are mostly about what must NOT be skipped:
 *
 *   - a file whose bytes changed but whose length did not (the case a size check gets wrong)
 *   - a file R2 has never seen
 *   - a file the plan names and the disk does not have (must reach the error, not be dropped)
 *   - an object whose ETag is not a plain MD5, so it says nothing about the bytes
 *
 * No network and no @aws-sdk/client-s3: CI's test job runs with no root node_modules, so
 * everything here is the pure planning half plus a source-level check that the two loops go
 * through the pool.
 *
 * Run: node tests/test_publish_upload.js
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const {
  pooled, dropUnchanged, ttsSizes, parsePublishArgs
} = require('../scripts/r2Content');
const { TTS_DIR_REL } = require('../scripts/ttsClips');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}
function eq(actual, expected, msg) {
  assert(actual === expected,
    msg + ' (got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected) + ')');
}
const md5 = (buf) => crypto.createHash('md5').update(buf).digest('hex');

(async () => {

// ── 1. The pool ──────────────────────────────────────────────────────────────
console.log('\n--- 1. pooled: bounded, ordered, and it gives up on failure ---');
{
  const order = await pooled([1, 2, 3, 4, 5], 2, async (n) => n * 10);
  eq(order.join(','), '10,20,30,40,50', 'results come back in the input order, not completion order');

  eq((await pooled([], 8, async () => 1)).length, 0, 'an empty list is no work and no error');

  // The width is the point: 16 in flight is the fix, 17 would be a different fix.
  let inFlight = 0, maxInFlight = 0, done = 0;
  await pooled(Array.from({ length: 12 }, (_, i) => i), 4, async () => {
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((r) => setTimeout(r, 5));
    inFlight--;
    done++;
  });
  eq(maxInFlight, 4, 'never more than the limit are in flight at once');
  eq(done, 12, 'and every item still runs');

  // A publish that is about to fail must not go on issuing requests behind the error.
  let started = 0;
  let caught = null;
  try {
    await pooled(Array.from({ length: 20 }, (_, i) => i), 2, async (i) => {
      started++;
      await new Promise((r) => setTimeout(r, 2));
      if (i === 2) throw new Error('boom at 2');
    });
  } catch (e) { caught = e; }
  assert(caught && /boom at 2/.test(caught.message), 'the first error is what comes out');
  assert(started < 20, 'it stops handing out work rather than running the rest (' + started + ' of 20 started)');

  // A worker that never throws must not be able to leave a hole in the results.
  const sparse = await pooled([0, 1, 2], 3, async (n) => (n === 1 ? null : n));
  eq(JSON.stringify(sparse), '[0,null,2]', 'a falsy result is a result, not a gap');
}

// ── 2. What may be skipped, and what may not ─────────────────────────────────
console.log('\n--- 2. dropUnchanged ---');
{
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hv-upload-'));
  const write = (rel, body) => {
    const full = path.join(base, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, body);
    return Buffer.isBuffer(body) ? body : Buffer.from(body);
  };

  const same = write('levels.json', '{"a":1}');
  const edited = write('worlds/2b-unit-10.json', '{"a":1}');      // same length, different byte
  const grown = write('worlds/2b-unit-13.json', '{"a":1,"b":2}');  // different length
  const fresh = write('locales/vi/worlds/new.json', '{"new":1}');  // never published
  const multi = write('sprites/items/big.png', 'PNGDATA');         // multipart-looking ETag
  write('sprites/items/ok.png', 'PNG');

  const plan = [
    { rel: 'levels.json', ctype: 'application/json' },
    { rel: 'worlds/2b-unit-10.json', ctype: 'application/json' },
    { rel: 'worlds/2b-unit-13.json', ctype: 'application/json' },
    { rel: 'locales/vi/worlds/new.json', ctype: 'application/json' },
    { rel: 'sprites/items/big.png', ctype: 'image/png' },
    { rel: 'sprites/items/ok.png', ctype: 'image/png' },
    { rel: 'sprites/items/absent.png', ctype: 'image/png' }
  ];

  const remote = new Map([
    ['levels.json', { size: same.length, etag: md5(same) }],
    // Same length as the local file, different content. A size check calls this published.
    ['worlds/2b-unit-10.json', { size: edited.length, etag: md5(Buffer.from('{"a":2}')) }],
    ['worlds/2b-unit-13.json', { size: grown.length - 3, etag: md5(Buffer.from('{"a":1}')) }],
    ['sprites/items/big.png', { size: multi.length, etag: '' }],   // etagHex refused it
    ['sprites/items/ok.png', { size: 3, etag: md5(Buffer.from('PNG')) }],
    ['sprites/items/absent.png', { size: 10, etag: md5(Buffer.from('0123456789')) }]
  ]);

  const out = dropUnchanged(plan, remote, base);
  const kept = out.files.map((f) => f.rel);

  assert(!kept.includes('levels.json'), 'an object already on R2 byte for byte is not re-uploaded');
  assert(!kept.includes('sprites/items/ok.png'), 'and nor is an unchanged sprite');
  assert(kept.includes('worlds/2b-unit-10.json'),
    'a file whose bytes changed but whose LENGTH did not is still uploaded');
  assert(kept.includes('worlds/2b-unit-13.json'), 'so is one whose length changed');
  assert(kept.includes('locales/vi/worlds/new.json'), 'a file R2 has never seen is uploaded');
  assert(kept.includes('sprites/items/big.png'),
    'an ETag that is not a plain MD5 proves nothing, so the object is uploaded again');
  assert(kept.includes('sprites/items/absent.png'),
    'a file the plan names and the disk lacks is KEPT, so uploadFiles reports it instead of it being dropped');
  eq(out.skipped, 2, 'the count says how many were skipped');
  eq(out.files.length + out.skipped, plan.length, 'every planned file is either kept or counted');

  // The fallbacks. A listing that failed must not turn into "nothing to do".
  eq(dropUnchanged(plan, null, base).files.length, plan.length, 'no listing keeps the whole plan');
  eq(dropUnchanged(plan, new Map(), base).files.length, plan.length, 'an empty listing keeps the whole plan');
  eq(dropUnchanged(plan, null, base).skipped, 0, 'and skips nothing');
  eq(dropUnchanged(null, remote, base).files.length, 0, 'a missing plan is not a crash');
  assert(dropUnchanged(plan, remote, base).files !== plan, 'the plan is not mutated in place');
  eq(plan.length, 7, 'so the caller still holds all of it');

  fs.rmSync(base, { recursive: true, force: true });
}

// ── 3. The clip sizes come out of the same listing ───────────────────────────
console.log('\n--- 3. ttsSizes ---');
{
  const remote = new Map([
    ['levels.json', { size: 10, etag: 'a'.repeat(32) }],
    [TTS_DIR_REL + '/aaaa.mp3', { size: 1234, etag: 'b'.repeat(32) }],
    [TTS_DIR_REL + '/bbbb.mp3', { size: 5678, etag: 'c'.repeat(32) }],
    ['audio/book/2b-u15-p4-2.mp3', { size: 99, etag: 'd'.repeat(32) }]
  ]);
  const sizes = ttsSizes(remote);
  eq(sizes.size, 2, 'only the Korean clips are taken');
  eq(sizes.get(TTS_DIR_REL + '/aaaa.mp3'), 1234, 'as path to size, which is what the render step reads');
  assert(!sizes.has('audio/book/2b-u15-p4-2.mp3'), 'a book recording is not a generated clip');
  eq(ttsSizes(null).size, 0, 'no listing is an empty map, not a crash');
}

// ── 4. The loops actually use the pool, and the escape hatch exists ──────────
console.log('\n--- 4. The wiring ---');
{
  const src = fs.readFileSync(path.join(ROOT, 'scripts', 'r2Content.js'), 'utf8');
  const fn = (name) => {
    const from = src.indexOf('async function ' + name + '(');
    if (from < 0) return '';
    const next = src.indexOf('\nasync function ', from + 1);
    const alt = src.indexOf('\nfunction ', from + 1);
    const end = Math.min(next < 0 ? src.length : next, alt < 0 ? src.length : alt);
    return src.slice(from, end);
  };

  const up = fn('uploadFiles');
  assert(up.indexOf('pooled(') > 0, 'uploadFiles goes through the pool');
  assert(!/for \(const \{ rel, ctype \} of files\)/.test(up), 'and no longer PUTs one file at a time');
  const ver = fn('verifyS3');
  assert(ver.indexOf('pooled(') > 0, 'verifyS3 goes through the pool');
  assert(!/for \(const row of uploaded\)/.test(ver), 'and no longer HEADs one object at a time');

  const pub = src.slice(src.indexOf('async function runPublish('));
  assert(pub.indexOf('dropUnchanged(') > 0, 'runPublish prunes the plan against the listing');
  assert(pub.indexOf('!flags.forceUpload') > 0, '--force-upload sends the whole plan anyway');
  assert(pub.indexOf('dropPublishedClips(') > 0, 'and the clip rule still runs before it');

  const flags = parsePublishArgs(['--force-upload']);
  assert(flags.forceUpload === true, 'parsePublishArgs reads --force-upload');
  assert(parsePublishArgs([]).forceUpload === false, 'and it is off by default');
  assert(/--force-upload/.test(require('../scripts/r2Content').HELP), 'the flag is documented in --help');

  // The upload:r2 path is deliberately the one that still sends everything: it is what a
  // metadata change or a suspected-bad object is re-pushed with.
  // A call, not a mention: the comment there explains why it is absent, and matching the
  // bare name made this pass for the wrong reason the moment that comment was written.
  const run = src.slice(src.indexOf('async function runUpload('), src.indexOf('const HELP ='));
  assert(run.indexOf('dropUnchanged(') < 0, 'upload:r2 stays the force path and prunes nothing');
  assert(run.indexOf('uploadFiles(') > 0, 'but it still uploads through the pooled path');
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);

})().catch((e) => {
  console.error('  [FAIL] threw: ' + (e && e.stack));
  process.exit(1);
});
