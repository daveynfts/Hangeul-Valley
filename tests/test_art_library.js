'use strict';
const fs = require('fs');
const path = require('path');
const {
  ART_FOLDERS,
  catalogId,
  catalogPath,
  processArgs,
  registerArt,
  auditArt
} = require('../scripts/art_library');

const ROOT = path.join(__dirname, '..');

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL: ' + msg);
    process.exit(1);
  }
  console.log('ok  ' + msg);
}

assert(!!ART_FOLDERS.foods && !!ART_FOLDERS.items && !!ART_FOLDERS.ui,
  'taxonomy includes foods, items, ui');
assert(catalogPath('ui', 'trophy_bronze_apple') === 'ui/trophy_bronze_apple.png',
  'trophy path is ui/<slug>.png');
assert(catalogId('ui', 'trophy_bronze_apple', 'trophy-icons') === 'ui.trophy.bronze_apple',
  'trophy catalog id drops the extra trophy_ prefix');
assert(catalogId('ui', 'trophy_cup') === 'ui.trophy_cup',
  'HUD trophy_cup is not rewritten as a plaque id');
assert(catalogPath('foods', 'kimchi_jar') === 'foods/kimchi_jar.png',
  'food path is foods/<slug>.png');
assert(catalogId('foods', 'kimchi_jar') === 'food.kimchi_jar',
  'food catalog id uses kind food, not folder foods');
assert(catalogId('items', 'corn_cob') === 'item.corn_cob',
  'item catalog id uses kind item, not folder items');
assert(processArgs('ui', 'trophy_bronze_apple').height === 48,
  'ui icons process at height 48');
assert(processArgs('foods', 'kimchi_jar').height === 48,
  'food still-icons process at height 48');

let threw = false;
try { catalogPath('misc', 'foo'); } catch (e) { threw = true; }
assert(threw, 'unknown folder is rejected');
threw = false;
try { catalogPath('foods', 'Kimchi Jar'); } catch (e) { threw = true; }
assert(threw, 'non snake_case slug is rejected');

const pack = { assets: [] };
const row = registerArt(pack, {
  folder: 'ui',
  slug: 'trophy_bronze_apple',
  nameEn: 'Bronze apple plaque',
  family: 'trophy-icons',
  role: 'bronze_apple',
  usedBy: ['Trophies']
});
assert(row.id === 'ui.trophy.bronze_apple', 'registerArt writes the canonical trophy id');
assert(row.path === 'ui/trophy_bronze_apple.png', 'registerArt writes the canonical path');
assert(row.nameEn === 'Bronze apple plaque', 'registerArt requires a real-world nameEn');
assert(pack.assets.length === 1, 'registerArt inserts one row');
registerArt(pack, {
  folder: 'ui',
  slug: 'trophy_bronze_apple',
  nameEn: 'Bronze apple plaque',
  family: 'trophy-icons',
  role: 'bronze_apple'
});
assert(pack.assets.length === 1, 'registerArt updates in place, no duplicate path');

const report = auditArt(ROOT);
assert(report.ok, 'live catalog matches disk (no orphans, no missing)');
assert(report.disk === report.catalog, 'png count equals catalog rows (' + report.disk + ')');
assert(report.orphans.length === 0, 'no uncatalogued PNG');
assert(report.missing.length === 0, 'no catalog row without a PNG');
assert(report.unnamed.length === 0, 'every catalog row has id, nameEn, path, kind');
assert(report.badFolder.length === 0, 'every catalog path uses a known folder');
assert(report.badSlug.length === 0, 'every PNG basename is snake_case');
assert(report.badId.length === 0, 'every catalog id starts with folder kind');

// The admin puts a picture next to a word by looking the word up in the catalogue, so a
// vocabulary tile that does not name its words is invisible from the word table even though
// the game draws it. Unit 11 showed 98 of its 155 words as blank that way. The index is
// derived, so the only thing worth pinning is that it has been run.
const { indexArtWords } = require('../scripts/index_art_words');
const { loadRows } = require('../scripts/audit_vocab_art');
const { pack: indexed, report: wordIndex } = indexArtWords(ROOT, { check: true });
const catalogueOnDisk = fs.readFileSync(path.join(ROOT, 'sprites', 'catalog.json'), 'utf8');
assert(catalogueOnDisk === JSON.stringify(indexed, null, 2) + '\n',
  'catalogued headwords are current — run npm run art:words');
assert(wordIndex.unmapped.length === 0, 'vocabulary art points only at catalogued files');
const rows = loadRows(ROOT);
const drawn = new Set(rows.map((r) => r.ko));
const named = new Set();
(indexed.assets || []).forEach((a) => (a.words || []).forEach((ko) => named.add(ko)));
const unfindable = [...drawn].filter((ko) => !named.has(ko));
assert(unfindable.length === 0, 'all ' + drawn.size + ' drawn headwords are findable by their own word'
  + (unfindable.length ? ' — missing ' + unfindable.slice(0, 8).join(', ') : ''));

console.log('\ntest_art_library: all passed');
