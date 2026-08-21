'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { registerArt, loadCatalog, saveCatalog, catalogId } = require('./art_library');

const ROOT = path.join(__dirname, '..');
const trophySrc = fs.readFileSync(path.join(ROOT, 'js', 'trophyArt.js'), 'utf8');
const tctx = {};
vm.runInNewContext(trophySrc + '\nthis.ROWS = TROPHY_ART_ROWS;', tctx);

const vocabSrc = fs.readFileSync(path.join(ROOT, 'js', 'vocabArt.js'), 'utf8');
const vctx = {};
vm.runInNewContext(vocabSrc + '\nthis.ROWS = VOCAB_ART_ROWS;', vctx);

const NEW_SLUGS = new Set([
  'kimchi_jar', 'bulgogi_plate', 'tteokbokki_bowl', 'haemul_pajeon',
  'japchae_bowl', 'gimbap_roll', 'corn_cob', 'farm_apple', 'honey_jar',
  'garden_strawberry', 'river_salmon', 'cooked_shrimp'
]);

const pack = loadCatalog(ROOT);
const drop = new Set();
tctx.ROWS.forEach((r) => {
  drop.add('ui.trophy.' + r.slug);
  drop.add('ui.' + r.slug);
  drop.add(catalogId('ui', r.slug, 'trophy-icons'));
});
vctx.ROWS.forEach((r) => {
  if (r && NEW_SLUGS.has(r.slug)) {
    drop.add(r.folder + '.' + r.slug);
    drop.add(catalogId(r.folder, r.slug));
  }
});
pack.assets = (pack.assets || []).filter((a) => a && !drop.has(a.id));

const trophyParent = catalogId('ui', 'trophy_bronze_apple', 'trophy-icons');
tctx.ROWS.forEach((r) => {
  registerArt(pack, {
    folder: 'ui',
    slug: r.slug,
    nameEn: r.nameEn,
    family: 'trophy-icons',
    role: r.id,
    parentId: trophyParent,
    usedBy: ['Trophies'],
    notes: '16-bit oak plaque trophy. Magenta-keyed. HTML overlay.'
  });
});

const foodParent = catalogId('foods', 'kimchi_jar');
const itemParent = catalogId('items', 'corn_cob');
const seen = new Set();
vctx.ROWS.forEach((r) => {
  if (!r || !NEW_SLUGS.has(r.slug) || seen.has(r.slug)) return;
  seen.add(r.slug);
  registerArt(pack, {
    folder: r.folder,
    slug: r.slug,
    nameEn: r.nameEn,
    family: r.family || 'ingredient',
    role: r.slug,
    parentId: r.folder === 'foods' ? foodParent : itemParent,
    usedBy: ['Inventory', 'RecipeBook'],
    notes: '16-bit still-icon for inventory / recipe book. Magenta-keyed. HTML overlay.'
  });
});

pack.cacheKey = 'art-20260821a';
saveCatalog(ROOT, pack);
console.log('catalog assets', pack.assets.length, 'cache', pack.cacheKey);
