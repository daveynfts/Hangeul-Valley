#!/usr/bin/env node
'use strict';

// Validate the entire batch before changing any runtime file. A manifest is a
// work queue, not evidence that a PNG has been generated or visually reviewed.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { loadCatalog } = require('./art_library');
const { loadRows } = require('./audit_vocab_art');
const BEGIN = '// BEGIN REVIEWED TOPIK ART';
const END = '// END REVIEWED TOPIK ART';

function appendReviewedArtFingerprint(root, fingerprint) {
  // TOPIK owns the shared runtime cache key, so other reviewed sprite batches must
  // participate in its fingerprint or the next TOPIK sync would roll their cache bust back.
  const files = ['docs/valley-map-art-manifest.json'];
  let count = 0;
  files.forEach((manifestFile) => {
    const fullManifest = path.join(root, manifestFile);
    if (!fs.existsSync(fullManifest)) return;
    const manifest = JSON.parse(fs.readFileSync(fullManifest, 'utf8'));
    const entries = Array.isArray(manifest.entries) ? manifest.entries.filter(entry => entry.reviewed === true) : [];
    entries.sort((a, b) => String(a.file || '').localeCompare(String(b.file || ''))).forEach((entry) => {
      if (!/^sprites\/(characters|decorations|furniture|stalls)\/[a-z][a-z0-9_]*\.png$/.test(entry.file || '')) {
        throw new Error('Invalid reviewed art path in ' + manifestFile + ': ' + (entry.file || 'missing'));
      }
      const full = path.join(root, entry.file);
      if (!fs.existsSync(full)) throw new Error('Reviewed art is missing: ' + entry.file);
      const data = fs.readFileSync(full);
      fingerprint.update(JSON.stringify({
        manifest: manifestFile,
        role: entry.role,
        file: entry.file,
        sourceImage: entry.sourceImage,
        height: entry.height,
        mapScale: entry.mapScale
      }));
      fingerprint.update(crypto.createHash('sha256').update(data).digest('hex'));
      count++;
    });
  });
  return count;
}

// 'Society & everyday life' -> 'topik-society-and-everyday-life'. The '&' becomes a spelled
// 'and' rather than vanishing, because the admin reads the key back as the shelf's heading
// and a dropped ampersand cannot be told from a missing word: 'Health & the body' would
// come back as 'Health the body' with nothing to say which one it had been.
function topikFamily(category) {
  const slug = String(category).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug) throw new Error('Unusable TOPIK category: ' + category);
  return 'topik-' + slug;
}

function prepareTopikArt(root, options = {}) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'docs/topik-art-manifest.json'), 'utf8'));
  const world = JSON.parse(fs.readFileSync(path.join(root, 'worlds/topik-2.json'), 'utf8'));
  if (manifest.world !== 'topik-2' || !Array.isArray(manifest.entries)
      || !Array.isArray(manifest.retained)) throw new Error('Invalid TOPIK art manifest');
  const outputHeight = Number(manifest.outputHeight || 48);
  if (!Number.isInteger(outputHeight) || outputHeight < 48 || outputHeight > 256) {
    throw new Error('Invalid TOPIK outputHeight');
  }
  const words = world.level.words;
  const declared = [...manifest.retained, ...manifest.entries];
  const declaredWords = new Set(declared.map(entry => entry.ko));
  if (declaredWords.size !== declared.length) throw new Error('Duplicate word in TOPIK art manifest');
  if (declared.length !== words.length || declared.some(entry => words[entry.index]?.ko !== entry.ko)
      || words.some(word => !declaredWords.has(word.ko))) {
    throw new Error('Every TOPIK word must be declared once, at its correct world index');
  }
  const ready = manifest.entries.filter(entry => entry.reviewed === true);
  if (options.requireComplete && ready.length !== manifest.entries.length) {
    throw new Error('Every TOPIK word must have retained or reviewed artwork before completion');
  }
  const pack = loadCatalog(root);
  const files = new Map();
  const hashes = new Map();
  const readyPaths = new Map();
  const rows = [...manifest.retained, ...ready].sort((a, b) => a.index - b.index).map(entry => {
    const generated = !Object.hasOwn(entry, 'file');
    const file = generated ? 'sprites/' + entry.folder + '/' + entry.slug + '.png' : entry.file;
    if (!/^sprites\/(items|foods)\/[a-z][a-z0-9_]*\.png$/.test(file)) {
      throw new Error('Invalid sprite path for ' + entry.ko);
    }
    if (generated && (!entry.sourceImage || entry.rawReviewed !== true || entry.status !== 'reviewed')) {
      throw new Error('Reviewed image lacks source and visual review evidence: ' + entry.ko);
    }
    if (!generated && entry.reviewed !== true) {
      throw new Error('Retained image lacks visual review evidence: ' + entry.ko);
    }
    const full = path.join(root, file);
    if (!fs.existsSync(full)) throw new Error('Reviewed image is missing: ' + entry.ko);
    const data = fs.readFileSync(full);
    if (data.length < 33 || !data.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
        || data.toString('ascii', 12, 16) !== 'IHDR') throw new Error('Invalid PNG for ' + entry.ko);
    if (generated && (data.readUInt32BE(20) !== outputHeight || data.readUInt32BE(16) < 8)) {
      throw new Error('Reviewed sprite must be ' + outputHeight + ' px tall: ' + entry.ko);
    }
    if (files.has(file)) throw new Error('Shared image: ' + entry.ko + ' / ' + files.get(file));
    files.set(file, entry.ko);
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    if (hashes.has(hash)) throw new Error('Copied PNG: ' + entry.ko + ' / ' + hashes.get(hash));
    hashes.set(hash, entry.ko);
    const relative = file.slice('sprites/'.length);
    const asset = pack.assets.find(item => item.path === relative);
    if (!asset) throw new Error('Register the image first: ' + relative);
    if (generated) {
      readyPaths.set(file, entry.ko);
      asset.status = 'shipped';
      asset.notes = 'Dedicated TOPIK illustration; individually reviewed at ' + outputHeight
        + ' px. Prompt and source in docs/topik-art-manifest.json.';
      // The catalogue is what the admin art library reads, and for a while every one of
      // these landed in a single `topik-vocabulary` family: 778 rows in one table, headed
      // by whichever gloss happened to sort first. The manifest already knows which of the
      // sixteen categories a word belongs to, so the family follows the category and the
      // library gets sixteen named shelves instead of one unlabelled pile.
      if (!entry.category) throw new Error('Manifest entry needs a category: ' + entry.ko);
      asset.family = topikFamily(entry.category);
      // Searching by the Korean word is the whole point of a vocabulary illustration,
      // so refuse to ship one the registration forgot to name.
      if (asset.wordKo !== entry.ko) {
        throw new Error('Catalogued image must record its headword: ' + entry.ko
          + ' (catalogue says ' + JSON.stringify(asset.wordKo || null) + ')');
      }
      // Where the picture actually shows up. Left empty, the admin's detail panel reports
      // "Not referenced in-game" for art the vocabulary book draws on every card.
      asset.usedBy = ['vocabulary-book', 'word-detail', 'farm'];
    }
    // Which headwords draw the picture is deliberately not written here. It is derivable for
    // the whole library from the runtime rows, and two scripts stamping one field is how the
    // field starts disagreeing with itself — scripts/index_art_words.js owns it, and runs
    // after this one because this one is what rewrites the rows it reads.
    return { ko: entry.ko, slug: path.posix.basename(file, '.png'),
      folder: file.split('/')[1], nameEn: words[entry.index].en, family: 'topik-vocabulary' };
  });

  // A headword can appear in several worlds; a different headword cannot borrow
  // a newly drawn image, even outside TOPIK.
  for (const row of loadRows(root)) {
    const owner = readyPaths.get('sprites/' + row.folder + '/' + row.slug + '.png');
    if (owner && owner !== row.ko) throw new Error('Dedicated image borrowed by ' + row.ko + ': ' + owner);
  }
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify(rows));
  for (const hash of hashes.keys()) fingerprint.update(hash);
  const supplemental = appendReviewedArtFingerprint(root, fingerprint);
  const cacheKey = 'art-topik-' + ready.length
    + (supplemental ? '-extra-' + supplemental : '')
    + '-' + fingerprint.digest('hex').slice(0, 12);
  pack.cacheKey = cacheKey;
  const block = BEGIN + '\n'
    + '// Generated from docs/topik-art-manifest.json by scripts/apply_topik_art.js.\n'
    + 'const TOPIK_VOCAB_ART_ROWS = ' + JSON.stringify(rows, null, 2) + ';\n'
    + 'if (typeof VOCAB_ART_ROWS !== \'undefined\' && Array.isArray(VOCAB_ART_ROWS)) {\n'
    + '  TOPIK_VOCAB_ART_ROWS.forEach(function (row) {\n'
    + '    const existing = VOCAB_ART_ROWS.find(function (item) { return item && item.ko === row.ko; });\n'
    + '    if (existing) Object.assign(existing, row);\n'
    + '    else VOCAB_ART_ROWS.push(row);\n'
    + '  });\n'
    + '}\n'
    + 'if (typeof window !== \'undefined\') window.TOPIK_VOCAB_ART_ROWS = TOPIK_VOCAB_ART_ROWS;\n'
    + END;
  let source = fs.readFileSync(path.join(root, 'js/vocabArtMore.js'), 'utf8');
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  const sourceBlock = newline === '\n' ? block : block.replace(/\n/g, newline);
  const start = source.indexOf(BEGIN);
  if (start >= 0) {
    const finish = source.indexOf(END, start);
    if (finish < 0 || source.indexOf(BEGIN, start + BEGIN.length) >= 0) throw new Error('Invalid TOPIK mapping block');
    source = source.slice(0, start) + sourceBlock + source.slice(finish + END.length);
  } else {
    if (source.includes(END)) throw new Error('Invalid TOPIK mapping block');
    source = source.trimEnd() + newline + newline + sourceBlock + newline;
  }
  const economy = fs.readFileSync(path.join(root, 'js/systems/economy.js'), 'utf8');
  if (!/ART_CACHE_KEY = '[^']+'/.test(economy)) throw new Error('Cannot locate runtime art cache key');
  return {
    reviewed: ready.length, remaining: manifest.entries.length - ready.length,
    retained: manifest.retained.length, cacheKey,
    writes: {
      'js/vocabArtMore.js': source,
      'sprites/catalog.json': JSON.stringify(pack, null, 2) + '\n',
      'js/systems/economy.js': economy.replace(/ART_CACHE_KEY = '[^']+'/, "ART_CACHE_KEY = '" + cacheKey + "'")
    }
  };
}

function applyTopikArt(root, options = {}) {
  const result = prepareTopikArt(root, options);
  if (options.check) {
    for (const [file, source] of Object.entries(result.writes)) {
      if (fs.readFileSync(path.join(root, file), 'utf8') !== source) {
        throw new Error('TOPIK art is out of sync; run scripts/apply_topik_art.js: ' + file);
      }
    }
  } else {
    for (const [file, source] of Object.entries(result.writes)) fs.writeFileSync(path.join(root, file), source);
  }
  return result;
}

if (require.main === module) {
  const result = applyTopikArt(path.resolve(__dirname, '..'), {
    requireComplete: process.argv.includes('--require-complete'), check: process.argv.includes('--check')
  });
  console.log(result.reviewed + ' reviewed + ' + result.retained + ' retained TOPIK images; '
    + result.remaining + ' still need review. Cache key: ' + result.cacheKey);
}

module.exports = { prepareTopikArt, applyTopikArt };
