#!/usr/bin/env node
'use strict';

// Snapshot only new source/export pairs. An existing review page is evidence
// that the pair was inspected, not approval; approval remains in the queue.
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const python = process.argv[2];
const limit = Number(process.argv[3] || 48);
if (!python || !Number.isInteger(limit) || limit < 1 || limit > 446) {
  throw new Error('Usage: node scripts/prepare_topik_standin_reviews.js <python> [count 1..446]');
}
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const key = row => [row.index, row.sourceThread, row.sourceImage, row.reviewedHash].join(':');
const seen = new Set();
for (const file of fs.readdirSync(path.join(root, 'docs'))) {
  if (!/^topik-new-art-review-.*\.review\.json$/.test(file)) continue;
  for (const row of read('docs/' + file)) seen.add(key(row));
}
const queue = read('docs/topik-standin-art-queue.json');
const cache = read('.codex-topik-processing-cache.json');
const rows = queue.entries.filter(entry => {
  if (!entry.sourceImage || entry.reviewed) return false;
  const sprite = path.join(root, 'sprites', entry.folder, entry.slug + '.png');
  if (!fs.existsSync(sprite)) return false;
  const source = path.join(os.homedir(), '.codex', 'generated_images', entry.sourceThread, entry.sourceImage);
  const spec = cache[entry.slug]?.spec;
  if (!fs.existsSync(source) || spec?.sourceHash !== hash(fs.readFileSync(source))
      || spec.height !== queue.outputHeight || spec.colors !== 32
      || spec.keyMagenta !== Boolean(entry.keyMagenta)) return false;
  const reviewedHash = hash(fs.readFileSync(sprite));
  if (cache[entry.slug].spriteHash !== reviewedHash) return false;
  return !seen.has(key({ ...entry, reviewedHash }));
}).sort((a, b) => a.index - b.index).slice(0, limit);

const pages = [];
for (let start = 0; start < rows.length; start += 12) {
  const chunk = rows.slice(start, start + 12);
  const digest = hash(JSON.stringify(chunk.map(row => [row.index, row.sourceImage, cache[row.slug].spriteHash]))).slice(0, 8);
  const output = 'docs/topik-new-art-review-' + chunk[0].index + '-'
    + chunk[chunk.length - 1].index + '-' + digest + '.png';
  execFileSync(python, ['scripts/preview_topik_art.py', '--queue', '--indices',
    chunk.map(row => row.index).join(','), '--output', output], { cwd: root, stdio: 'pipe' });
  pages.push(output);
}
fs.writeFileSync(path.join(root, '.codex-topik-next-review-pages.json'), JSON.stringify(pages, null, 2) + '\n');
console.log(JSON.stringify({ count: rows.length, pages }, null, 2));
