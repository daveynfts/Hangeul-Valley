#!/usr/bin/env node
'use strict';

// Promote a completely generated and visually reviewed stand-in queue into the
// canonical TOPIK manifest, then remove the obsolete emoji placeholder assets.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { loadCatalog, registerArt, saveCatalog } = require('./art_library');
const { applyTopikArt } = require('./apply_topik_art');
const { loadRows } = require('./audit_vocab_art');

const ROOT = path.resolve(__dirname, '..');
const QUEUE_FILE = path.join(ROOT, 'docs', 'topik-standin-art-queue.json');
const MANIFEST_FILE = path.join(ROOT, 'docs', 'topik-art-manifest.json');
const APPLY = process.argv.includes('--apply');

function spritePath(entry) {
  if (entry.folder !== 'items' || !/^topik_[a-z0-9_]+$/.test(entry.slug || '')) {
    throw new Error('Unsafe generated sprite path: ' + entry.ko);
  }
  return 'sprites/' + entry.folder + '/' + entry.slug + '.png';
}

function obsoleteSpritePath(file) {
  if (!/^sprites\/items\/emoji_[a-z0-9_]+\.png$/.test(file || '')) {
    throw new Error('Refusing to remove a non-placeholder path: ' + file);
  }
  const target = path.resolve(ROOT, file);
  const directory = path.resolve(ROOT, 'sprites', 'items') + path.sep;
  if (!target.startsWith(directory) || !fs.lstatSync(target).isFile()) {
    throw new Error('Placeholder must be a regular file inside sprites/items: ' + file);
  }
  return target;
}

function validatePng(file, height) {
  const data = fs.readFileSync(path.join(ROOT, file));
  if (data.length < 33 || !data.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
      || data.toString('ascii', 12, 16) !== 'IHDR') throw new Error('Invalid PNG: ' + file);
  if (data.readUInt32BE(20) !== height || data.readUInt32BE(16) < 8) {
    throw new Error('Wrong processed size: ' + file);
  }
  return crypto.createHash('sha256').update(data).digest('hex');
}

function main() {
  const queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
  const replacements = queue.entries.slice().sort((a, b) => a.index - b.index);
  if (queue.world !== 'topik-2' || queue.outputHeight !== manifest.outputHeight) {
    throw new Error('Queue world or production size does not match the manifest');
  }
  const standIns = manifest.retained.filter(entry => entry.standIn === true);
  if (replacements.length !== standIns.length || replacements.length === 0) {
    throw new Error('Queue and stand-in counts do not match');
  }
  const standInByIndex = new Map(standIns.map(entry => [entry.index, entry]));
  const slugs = new Set(manifest.entries.map(entry => entry.slug));
  const hashes = new Set();
  const obsoletePaths = new Map();
  for (const entry of replacements) {
    const old = standInByIndex.get(entry.index);
    if (!old || old.ko !== entry.ko || old.file !== entry.priorFile) {
      throw new Error('Queue provenance mismatch: ' + entry.ko);
    }
    if (!/^exec-[a-f0-9-]+\.png$/.test(entry.sourceImage || '')
        || !/^[a-z0-9-]+$/.test(entry.sourceThread || '') || entry.status !== 'generated') {
      throw new Error('Missing generated source: ' + entry.ko);
    }
    if (!/^[a-z][a-z0-9_]*$/.test(entry.slug) || slugs.has(entry.slug)) {
      throw new Error('Invalid or repeated semantic slug: ' + entry.slug);
    }
    slugs.add(entry.slug);
    const hash = validatePng(spritePath(entry), queue.outputHeight);
    if (entry.reviewed !== true || entry.rawReviewed !== true || !entry.reviewPage
        || entry.reviewedSourceImage !== entry.sourceImage || entry.reviewedHash !== hash) {
      throw new Error('Source and exact processed PNG must pass visual review: ' + entry.ko);
    }
    if (hashes.has(hash)) throw new Error('Repeated generated PNG bytes: ' + entry.ko);
    hashes.add(hash);
    if (obsoletePaths.has(entry.priorFile)) throw new Error('Shared placeholder: ' + entry.priorFile);
    obsoletePaths.set(entry.priorFile, { absolute: obsoleteSpritePath(entry.priorFile), ko: entry.ko });
  }
  for (const row of loadRows(ROOT)) {
    const old = obsoletePaths.get('sprites/' + row.folder + '/' + row.slug + '.png');
    if (old && old.ko !== row.ko) throw new Error('Placeholder is still used by another word: ' + row.ko);
  }
  console.log('Validated ' + replacements.length + ' dedicated replacements at '
    + queue.outputHeight + ' px');
  if (!APPLY) {
    console.log('Dry run only; pass --apply after visual gallery review');
    return;
  }

  // Promotion touches several source-of-truth files and then removes hundreds
  // of placeholders. Keep exact bytes so a late validation or filesystem error
  // cannot leave the repository half promoted and impossible to resume.
  const mutableFiles = [MANIFEST_FILE, path.join(ROOT, 'sprites', 'catalog.json'),
    path.join(ROOT, 'js', 'vocabArtMore.js'), path.join(ROOT, 'js', 'systems', 'economy.js')];
  const backups = new Map(mutableFiles.map(file => [file, fs.readFileSync(file)]));
  for (const old of obsoletePaths.values()) backups.set(old.absolute, fs.readFileSync(old.absolute));
  try {
    manifest.retained = manifest.retained.filter(entry => entry.standIn !== true);
    manifest.entries.push(...replacements.map(entry => ({
    index: entry.index,
    ko: entry.ko,
    en: entry.en,
    category: entry.category,
    slug: entry.slug,
    folder: entry.folder,
    brief: entry.brief,
    priorFile: entry.priorFile,
    status: 'reviewed',
    sourceImage: entry.sourceImage,
    sourceThread: entry.sourceThread,
    ...(entry.supersededSources?.length ? { supersededSources: entry.supersededSources.map(source => ({
      ...source, reason: source.reason === 'Visual quality correction'
        ? 'Superseded generated candidate' : source.reason
    })) } : {}),
    ...(entry.keyMagenta ? { keyMagenta: true } : {}),
    reviewPage: entry.reviewPage,
    reviewedHash: entry.reviewedHash,
    rawReviewed: true,
    reviewed: true
    })));
    manifest.entries.sort((a, b) => a.index - b.index);
    fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2) + '\n');

    const catalog = loadCatalog(ROOT);
    replacements.forEach(entry => registerArt(catalog, {
      folder: entry.folder,
      slug: entry.slug,
      nameEn: entry.en,
      family: 'topik-vocabulary',
      wordKo: entry.ko,
      status: 'unused',
      notes: 'Imagegen illustration awaiting TOPIK mapping sync.'
    }));
    saveCatalog(ROOT, catalog);
    applyTopikArt(ROOT, { requireComplete: true });

    const oldPaths = new Set(replacements.map(entry => entry.priorFile.replace(/^sprites\//, '')));
    const synced = loadCatalog(ROOT);
    synced.assets = synced.assets.filter(asset => !oldPaths.has(String(asset.path || '').replace(/\\/g, '/')));
    saveCatalog(ROOT, synced);
    applyTopikArt(ROOT, { requireComplete: true, check: true });
    for (const old of obsoletePaths.values()) fs.unlinkSync(old.absolute);
  } catch (error) {
    for (const [file, contents] of backups) fs.writeFileSync(file, contents);
    throw error;
  }
  console.log('Promoted ' + replacements.length + ' TOPIK illustrations and removed their emoji stand-ins');
}

main();
