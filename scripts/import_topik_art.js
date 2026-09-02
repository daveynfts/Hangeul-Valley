#!/usr/bin/env node
'use strict';

// Import the outputs of separate Imagegen calls. Review the originals before
// passing --raw-reviewed; final processed-art approval remains a separate manual step.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { loadCatalog, saveCatalog, registerArt } = require('./art_library');
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const pythonAt = args.indexOf('--python');
const python = pythonAt < 0 ? 'python' : args[pythonAt + 1];
if (!python) throw new Error('--python requires an executable');
const imports = JSON.parse(fs.readFileSync(0, 'utf8'));
if (!Array.isArray(imports) || !imports.length) throw new Error('Pass a nonempty JSON array on stdin');
const manifestPath = path.join(ROOT, 'docs/topik-art-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const outputHeight = Number(manifest.outputHeight || 48);
if (!Number.isInteger(outputHeight) || outputHeight < 48 || outputHeight > 256) {
  throw new Error('Invalid TOPIK outputHeight');
}
const seen = new Set();
for (const row of imports) {
  const entry = manifest.entries.find(e => e.slug === row.slug);
  if (!entry || seen.has(row.slug)) throw new Error('Unknown or repeated slug: ' + row.slug);
  if (entry.reviewed) throw new Error('Already reviewed; explicitly reopen the entry before replacement: ' + row.slug);
  if (!path.isAbsolute(row.sourcePath) || !/\.png$/i.test(row.sourcePath)
      || !fs.existsSync(row.sourcePath)) throw new Error('Missing source PNG for ' + row.slug);
  seen.add(row.slug);
}
const pack = loadCatalog(ROOT);
for (const row of imports) {
  const entry = manifest.entries.find(e => e.slug === row.slug);
  registerArt(pack, {
    folder: entry.folder, slug: entry.slug, nameEn: entry.en,
    family: 'topik-vocabulary', wordKo: entry.ko, status: 'unused',
    notes: 'Imagegen illustration; awaiting final ' + outputHeight
      + ' px review in docs/topik-art-manifest.json.'
  });
}
// Register the batch once before processing, rather than rewriting the catalog
// for every image while Windows file watchers may be reading it.
saveCatalog(ROOT, pack);
for (const row of imports) {
  const entry = manifest.entries.find(e => e.slug === row.slug);
  const result = spawnSync(python, [
    path.join(ROOT, '.grok/skills/farm-pixel-props/scripts/process_prop.py'),
    '--root', ROOT, '--height', String(outputHeight), '--subdir', entry.folder,
    // Opt in only after confirming that magenta is reserved for the backdrop.
    ...(args.includes('--key-magenta') ? ['--key-magenta'] : []),
    row.sourcePath, entry.slug
  ], { cwd: ROOT, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.error || result.stderr || result.stdout);
  entry.sourceImage = path.basename(row.sourcePath);
  entry.sourceThread = path.basename(path.dirname(row.sourcePath));
  entry.rawReviewed = args.includes('--raw-reviewed');
  entry.reviewed = false;
  entry.status = 'processed';
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(entry.ko + ': ' + entry.folder + '/' + entry.slug + '.png');
}
console.log(imports.length + ' imported; inspect the ' + outputHeight
  + ' px previews before setting reviewed: true.');
