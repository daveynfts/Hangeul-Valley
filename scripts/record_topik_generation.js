#!/usr/bin/env node
'use strict';

// Records built-in Imagegen output names without passing untrusted text through
// shell syntax. The sole argument is base64-encoded JSON:
// [{"index":394,"sourceImage":"exec-....png","sourceThread":"..."}]
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const QUEUE_FILE = path.join(ROOT, 'docs', 'topik-standin-art-queue.json');
const LOCK_FILE = QUEUE_FILE + '.lock';
// Named up here rather than beside the write, so the finally below can reach it. The write
// used to declare it inside the try, which put it out of scope of the only cleanup this
// script has: a rename that exhausted its retries, or failed for a reason other than a
// Windows sharing violation, threw with the temp file still on disk. One of them —
// docs/topik-standin-art-queue.json.34604.tmp, 380 KB — sat in the working tree untracked,
// one `git add .` away from being committed as a near-copy of the queue it was replacing.
const TEMP_FILE = QUEUE_FILE + '.' + process.pid + '.tmp';
if (process.argv.length !== 3 || !/^[A-Za-z0-9+/=]+$/.test(process.argv[2])) {
  throw new Error('Pass exactly one base64 JSON argument');
}
const records = JSON.parse(Buffer.from(process.argv[2], 'base64').toString('utf8'));
if (!Array.isArray(records) || !records.length) throw new Error('Generation records must be a nonempty array');
let lock;
for (let attempt = 0; attempt < 300; attempt++) {
  try {
    lock = fs.openSync(LOCK_FILE, 'wx');
    break;
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  }
}
if (lock == null) throw new Error('Timed out waiting for the TOPIK generation queue lock');
try {
  const queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
  const byIndex = new Map(queue.entries.map(entry => [entry.index, entry]));
  for (const record of records) {
    const entry = byIndex.get(record.index);
    if (!entry) throw new Error('Unknown queue index: ' + record.index);
    if (!/^exec-[a-f0-9-]+\.png$/.test(record.sourceImage || '')) {
      throw new Error('Invalid generated source name for ' + entry.ko);
    }
    if (!/^[a-z0-9-]+$/.test(record.sourceThread || '')) {
      throw new Error('Invalid source thread for ' + entry.ko);
    }
    if (record.reviewed === true) {
      if (record.sourceImage !== entry.sourceImage || record.sourceThread !== entry.sourceThread) {
        throw new Error('The image changed since visual review: ' + entry.ko);
      }
      if (record.rawReviewed !== true || !record.reviewPage) {
        throw new Error('Both source and processed image need a review page: ' + entry.ko);
      }
      if (entry.folder !== 'items' || !/^topik_[a-z0-9_]+$/.test(entry.slug)) {
        throw new Error('Unsafe sprite path: ' + entry.ko);
      }
      const sprite = fs.readFileSync(path.join(ROOT, 'sprites', entry.folder, entry.slug + '.png'));
      const spriteHash = crypto.createHash('sha256').update(sprite).digest('hex');
      if (record.reviewedHash !== spriteHash) {
        throw new Error('The processed PNG changed since the review page was made: ' + entry.ko);
      }
      entry.reviewed = true;
      entry.rawReviewed = true;
      entry.reviewedSourceImage = entry.sourceImage;
      entry.reviewedHash = spriteHash;
      entry.reviewPage = String(record.reviewPage);
      continue;
    }
    if (entry.sourceImage && entry.sourceImage !== record.sourceImage) {
      entry.supersededSources = [...(entry.supersededSources || []), {
        sourceImage: entry.sourceImage, sourceThread: entry.sourceThread,
        reason: record.reason || 'Superseded generated candidate'
      }];
    }
    entry.sourceImage = record.sourceImage;
    entry.sourceThread = record.sourceThread;
    entry.status = 'generated';
    entry.keyMagenta = record.keyMagenta === true;
    if (record.brief) entry.brief = String(record.brief);
    for (const key of ['reviewed', 'rawReviewed', 'reviewedSourceImage', 'reviewedHash', 'reviewPage']) {
      delete entry[key];
    }
  }
  fs.writeFileSync(TEMP_FILE, JSON.stringify(queue, null, 2) + '\n');
  let renamed = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      fs.renameSync(TEMP_FILE, QUEUE_FILE);
      renamed = true;
      break;
    } catch (error) {
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(error.code)) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
  if (!renamed) throw new Error('Timed out replacing the TOPIK generation queue');
} finally {
  // The temp file is gone on success — the rename consumed it — so this only fires on the
  // failure paths. Same shape as admin/lib/atomicWrite.js: never leave the scratch copy
  // behind, and never let cleanup mask the error that got us here.
  try { fs.unlinkSync(TEMP_FILE); } catch (_) {}
  fs.closeSync(lock);
  fs.unlinkSync(LOCK_FILE);
}
console.log('Recorded ' + records.length + ' TOPIK art update(s)');
