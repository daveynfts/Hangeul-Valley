#!/usr/bin/env node
'use strict';

// Write onto every catalogued sprite the list of headwords that actually draw it.
//
// The catalogue has always carried `wordKo`: the one word an image was registered for. The
// game is looser than that on purpose — around two fifths of the slugs serve more than one
// word, because there is nothing to draw for 종류 that a learner would recognise as 종류, so
// abstract nouns share a tile. `wordKo` cannot say that, and the admin had no way to show a
// picture next to a word it was not registered under: Unit 11 listed 98 of its 155 words with
// an empty art cell while the game was drawing something for every one of them.
//
// The mapping the game uses is VOCAB_ART_ROWS, so that is what is read here — the same
// first-match lookup, through the same loader the audits use, rather than a second guess at
// it. `words` is rebuilt from scratch on each run, so running twice writes the same bytes.
//
// Run after changing a vocabulary art row, and before `npm run art:topik:apply` if both are
// due: TOPIK owns the 840 entries of its own world and will restate them either way.
const fs = require('fs');
const path = require('path');
const { loadCatalog, saveCatalog } = require('./art_library');
const { loadRows } = require('./audit_vocab_art');

function indexArtWords(root, options = {}) {
  const pack = loadCatalog(root);
  const byPath = new Map();
  // First match wins, exactly as vocabArtRow resolves it, so a word that appears in several
  // worlds is counted once and against the tile the game would actually show.
  const seen = new Set();
  loadRows(root).forEach((row) => {
    if (!row || !row.ko || !row.slug || !row.folder) return;
    if (seen.has(row.ko)) return;
    seen.add(row.ko);
    const rel = row.folder + '/' + row.slug + '.png';
    if (!byPath.has(rel)) byPath.set(rel, new Set());
    byPath.get(rel).add(row.ko);
  });
  let stamped = 0;
  let cleared = 0;
  (pack.assets || []).forEach((asset) => {
    const rel = String(asset.path || '').replace(/\\/g, '/');
    const drawn = byPath.get(rel);
    // A word registered on the asset but no longer mapped to it still belongs in the list:
    // it is what the catalogue was told the picture is of.
    const owners = new Set(drawn || []);
    if (asset.wordKo) owners.add(asset.wordKo);
    if (!owners.size) {
      // A character sheet or a HUD icon is not a vocabulary word. Say nothing rather than
      // leaving an empty array that reads as "we looked and there are none".
      if (asset.words) { delete asset.words; cleared++; }
      return;
    }
    const words = [...owners].sort();
    if (JSON.stringify(asset.words || null) !== JSON.stringify(words)) stamped++;
    asset.words = words;
  });
  const report = {
    assets: (pack.assets || []).length,
    withWords: (pack.assets || []).filter((a) => a.words && a.words.length).length,
    changed: stamped,
    cleared,
    unmapped: [...byPath.keys()].filter((rel) => !(pack.assets || []).some((a) => String(a.path || '').replace(/\\/g, '/') === rel))
  };
  if (report.unmapped.length) {
    throw new Error('Vocabulary art points at uncatalogued files: ' + report.unmapped.slice(0, 5).join(', '));
  }
  if (!options.check) saveCatalog(root, pack);
  return { pack, report };
}

module.exports = { indexArtWords };

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const check = process.argv.includes('--check');
  const { pack, report } = indexArtWords(root, { check });
  if (check) {
    const onDisk = fs.readFileSync(path.join(root, 'sprites', 'catalog.json'), 'utf8');
    if (onDisk !== JSON.stringify(pack, null, 2) + '\n') {
      throw new Error('Catalogued headwords are out of date; run scripts/index_art_words.js');
    }
  }
  console.log(report.withWords + ' of ' + report.assets + ' catalogued sprites name the words that draw them'
    + (check ? ' (checked)' : '; ' + report.changed + ' updated, ' + report.cleared + ' cleared'));
}
