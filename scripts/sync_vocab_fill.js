'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { registerArt, loadCatalog, saveCatalog, catalogId } = require('./art_library');

const ROOT = path.join(__dirname, '..');
const vocabSrc = fs.readFileSync(path.join(ROOT, 'js', 'vocabArt.js'), 'utf8');
const vctx = {};
vm.runInNewContext(vocabSrc + '\nthis.ROWS = VOCAB_ART_ROWS;', vctx);

const FILL_SLUGS = new Set([
  'mackerel', 'pond_carp', 'golden_fish', 'squid', 'octopus', 'clam',
  'roasted_corn', 'radish_rice', 'strawberry_jam', 'potato_pancake',
  'royal_samgyetang', 'honey_yakgwa', 'honey_tea'
]);

const pack = loadCatalog(ROOT);
const drop = new Set();
FILL_SLUGS.forEach((slug) => {
  drop.add('foods.' + slug);
  drop.add('food.' + slug);
  drop.add('items.' + slug);
  drop.add('item.' + slug);
});
pack.assets = (pack.assets || []).filter((a) => a && !drop.has(a.id));

const foodParent = catalogId('foods', 'kimchi_jar');
const seen = new Set();
vctx.ROWS.forEach((r) => {
  if (!r || !FILL_SLUGS.has(r.slug) || seen.has(r.slug)) return;
  seen.add(r.slug);
  registerArt(pack, {
    folder: r.folder,
    slug: r.slug,
    nameEn: r.nameEn,
    family: r.family || 'ingredient',
    role: r.slug,
    parentId: foodParent,
    usedBy: ['Inventory', 'RecipeBook', 'Cooking'],
    notes: '16-bit still-icon for inventory / recipe / fishing. Magenta-keyed. HTML overlay.',
    wordKo: r.ko
  });
});

pack.cacheKey = 'art-20260821b';
saveCatalog(ROOT, pack);
console.log('catalog assets', pack.assets.length, 'fill', seen.size, 'cache', pack.cacheKey);
