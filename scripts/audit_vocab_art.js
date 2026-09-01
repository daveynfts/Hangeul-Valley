#!/usr/bin/env node
'use strict';

// Inventory health is not semantic coverage: hundreds of words can resolve to
// one existing PNG. Report that separately instead of calling it complete art.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

function loadRows(root) {
  const context = vm.createContext({});
  ['vocabArt.js', 'vocabArtUnit14.js', 'vocabArtMore.js'].forEach((file) => {
    vm.runInContext(fs.readFileSync(path.join(root, 'js', file), 'utf8'), context);
  });
  return vm.runInContext('VOCAB_ART_ROWS', context);
}

function auditVocabArt(root, options = {}) {
  // Match vocabArtRow's first-match lookup exactly; one word shared across
  // worlds is not a collision between different vocabulary entries.
  const byWord = new Map();
  loadRows(root).forEach((row) => { if (!byWord.has(row.ko)) byWord.set(row.ko, row); });
  let words = options.words;
  if (options.world) {
    if (!/^[a-z0-9-]+$/.test(options.world)) throw new Error('Invalid world id');
    const world = JSON.parse(fs.readFileSync(path.join(root, 'worlds', options.world + '.json'), 'utf8'));
    words = world.level.words.map((word) => word.ko);
  }
  const selected = words ? [...new Set(words)] : [...byWord.keys()];
  const fileGroups = new Map();
  const missing = [];
  for (const ko of selected) {
    const row = byWord.get(ko);
    if (!row) { missing.push({ ko, reason: 'no mapping' }); continue; }
    const file = 'sprites/' + row.folder + '/' + row.slug + '.png';
    if (!fs.existsSync(path.join(root, file))) { missing.push({ ko, file, reason: 'no PNG' }); continue; }
    if (!fileGroups.has(file)) fileGroups.set(file, []);
    fileGroups.get(file).push(ko);
  }
  const reusedImages = [...fileGroups].filter(([, kos]) => kos.length > 1)
    .map(([file, kos]) => ({ file, words: kos }))
    .sort((a, b) => b.words.length - a.words.length || a.file.localeCompare(b.file));
  const hashes = new Map();
  for (const file of fileGroups.keys()) {
    const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
    if (!hashes.has(hash)) hashes.set(hash, []);
    hashes.get(hash).push(file);
  }
  const identicalFiles = [...hashes.values()].filter((files) => files.length > 1);
  return {
    scope: options.world || (words ? 'selected words' : 'all mapped vocabulary'),
    words: selected.length,
    uniqueImages: fileGroups.size,
    extraSharedMappings: reusedImages.reduce((sum, group) => sum + group.words.length - 1, 0),
    missing,
    reusedImages,
    identicalFiles,
    // A clean result means structural uniqueness, not a machine verdict on meaning.
    structurallyUnique: !missing.length && !reusedImages.length && !identicalFiles.length
  };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const worldAt = args.indexOf('--world');
  const jsonAt = args.indexOf('--json');
  const report = auditVocabArt(path.resolve(__dirname, '..'), {
    world: worldAt < 0 ? undefined : args[worldAt + 1]
  });
  if (jsonAt >= 0) {
    if (!args[jsonAt + 1]) throw new Error('--json needs an output filename');
    fs.writeFileSync(args[jsonAt + 1], JSON.stringify(report, null, 2) + '\n');
  }
  console.log('Vocabulary art:', report.scope);
  console.log(' ', report.words, 'words;', report.uniqueImages, 'different PNG paths');
  console.log(' ', report.reusedImages.length, 'reused images;', report.extraSharedMappings, 'extra shared mappings');
  console.log(' ', report.missing.length, 'missing;', report.identicalFiles.length, 'identical-file groups');
  report.reusedImages.slice(0, 8).forEach((group) => {
    console.log(' ', group.file, '—', group.words.length, 'words:', group.words.slice(0, 5).join(', '));
  });
  if (!report.structurallyUnique) console.log('  NEEDS ART REVIEW: file existence alone does not satisfy unique, meaningful illustrations.');
  if (args.includes('--strict') && !report.structurallyUnique) process.exitCode = 1;
}

module.exports = { auditVocabArt, loadRows };
