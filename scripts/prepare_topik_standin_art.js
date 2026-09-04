#!/usr/bin/env node
'use strict';

// Build a stable, resumable queue for replacing TOPIK emoji stand-ins with
// dedicated illustrations. Generation happens through the built-in image tool;
// this script owns semantic filenames and preserves recorded source provenance.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_FILE = path.join(ROOT, 'docs', 'topik-art-manifest.json');
const WORLD_FILE = path.join(ROOT, 'worlds', 'topik-2.json');
const QUEUE_FILE = path.join(ROOT, 'docs', 'topik-standin-art-queue.json');

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'of', 'to', 'be', 'is', 'it', 'its', 'one', 'that', 'this',
  'something', 'some', 'and', 'or', 'for', 'with', 'from', 'in', 'on',
  'at', 'as', 'by', 'into', 'up', 'out', 'over', 'after', 'before', 'when', 'word',
  'else', 'them', 'your'
]);

function wordsFromGloss(gloss) {
  return String(gloss || '')
    .normalize('NFKD')
    .replace(/[’']/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function slugTokens(gloss) {
  const all = wordsFromGloss(gloss);
  let useful = all.filter(token => !STOP_WORDS.has(token));
  if (!useful.length) useful = all;
  return useful.slice(0, 7);
}

function coreSlug(word) {
  const core = String(word.en || '').split(/[—;]/, 1)[0];
  return ('topik_' + slugTokens(core).join('_')).replace(/_+$/, '') || 'topik_vocabulary_concept';
}

function detailedSlug(word) {
  return ('topik_' + slugTokens(word.en).join('_')).replace(/_+$/, '') || 'topik_vocabulary_concept';
}

function uniqueSlug(word, used, repeatedCore) {
  const core = coreSlug(word);
  const base = repeatedCore.has(core) || used.has(core) ? detailedSlug(word) : core;
  let slug = base;
  let suffix = 2;
  while (used.has(slug)) slug = base + '_' + suffix++;
  used.add(slug);
  return slug;
}

function briefFor(word) {
  const meaning = String(word.en || '').trim();
  if (/^-/.test(word.ko) || /\b(grammar|written form|needs|close it)\b/i.test(meaning)) {
    return 'A compact cause-and-effect or before-and-after scene that makes the grammar meaning “'
      + meaning + '” readable without text or symbols.';
  }
  if (/^to\b/i.test(meaning)) {
    return 'A clear character action that specifically conveys “' + meaning
      + '”, with the key gesture and affected object visible.';
  }
  return 'A concrete, instantly readable illustration of “' + meaning
    + '”, using the hint ' + (word.hint || 'only as a concept cue') + ' without copying an emoji glyph.';
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
  const words = JSON.parse(fs.readFileSync(WORLD_FILE, 'utf8')).level.words;
  const previous = fs.existsSync(QUEUE_FILE)
    ? JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8')) : { entries: [] };
  const previousByIndex = new Map((previous.entries || []).map(entry => [entry.index, entry]));
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'sprites', 'catalog.json'), 'utf8'));
  const used = new Set([
    ...manifest.entries.map(entry => entry.slug),
    ...catalog.assets.map(entry => path.posix.basename(String(entry.path || '').replace(/\\/g, '/'), '.png'))
  ].filter(Boolean));
  const standIns = manifest.retained.filter(entry => entry.standIn === true).sort((a, b) => a.index - b.index);
  if (!standIns.length) {
    console.log('No TOPIK stand-ins to replace; the existing generation history is unchanged');
    return;
  }
  const coreCounts = new Map();
  standIns.forEach((entry) => {
    const core = coreSlug(words[entry.index]);
    coreCounts.set(core, (coreCounts.get(core) || 0) + 1);
  });
  const repeatedCore = new Set([...coreCounts].filter(([, count]) => count > 1).map(([slug]) => slug));
  const queue = standIns
    .map((standIn) => {
      const word = words[standIn.index];
      if (!word || word.ko !== standIn.ko) throw new Error('Stand-in index mismatch: ' + standIn.ko);
      const previousEntry = previousByIndex.get(standIn.index);
      const old = previousEntry?.ko === word.ko && previousEntry?.priorFile === standIn.file
        ? previousEntry : null;
      const slug = old?.sourceImage && old.slug && !used.has(old.slug)
        ? old.slug : uniqueSlug(word, used, repeatedCore);
      used.add(slug);
      return {
        ...(old || {}),
        index: standIn.index,
        ko: word.ko,
        en: word.en,
        category: word.categoryEn || word.category,
        hint: word.hint || '',
        slug,
        folder: 'items',
        brief: old?.brief || briefFor(word),
        priorFile: standIn.file,
        sourceImage: old?.sourceImage || null,
        sourceThread: old?.sourceThread || null,
        status: old?.sourceImage ? 'generated' : 'queued'
      };
    });
  const result = {
    world: 'topik-2',
    sourceCommit: require('child_process').execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: ROOT, encoding: 'utf8'
    }).trim(),
    outputHeight: manifest.outputHeight || 96,
    styleReference: 'exec-258f8b03-84c3-4e83-9add-c98465bf7b47.png',
    entries: queue
  };
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(result, null, 2) + '\n');
  console.log('TOPIK stand-in art queue: ' + queue.length + ' entries; '
    + queue.filter(entry => entry.sourceImage).length + ' generated');
}

main();
