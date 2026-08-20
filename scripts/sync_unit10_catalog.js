'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'js', 'vocabArt.js'), 'utf8');
const ctx = {};
vm.runInNewContext(src + '\nthis.ROWS = VOCAB_ART_ROWS;', ctx);
const PARENT = {
  stew: 'food.kimchi_stew',
  noodle: 'food.cold_noodles',
  meat: 'food.grilled_pork_belly',
  pizza: 'food.bulgogi_pizza',
  chicken: 'food.fried_chicken',
  rice: 'food.bibimbap',
  drink: 'food.cola',
  ingredient: 'item.napa_cabbage_head',
  taste: 'item.sweet_taste',
  place: 'item.popular_restaurant',
  people: 'item.restaurant_staff',
  review: 'item.popular_restaurant',
  abstract: 'item.place_order'
};
const KIND = { stew: 'food', noodle: 'food', meat: 'food', pizza: 'food', chicken: 'food', rice: 'food', drink: 'food', ingredient: 'item', taste: 'item', place: 'item', people: 'item', review: 'item', abstract: 'item' };
const rows = ctx.ROWS.map((r) => {
  const id = (r.folder === 'foods' ? 'food.' : 'item.') + r.slug;
  const parentFam = PARENT[r.family] || id;
  return {
    id,
    nameEn: r.nameEn,
    kind: KIND[r.family] || (r.folder === 'foods' ? 'food' : 'item'),
    family: r.family,
    role: 'icon',
    path: r.folder + '/' + r.slug + '.png',
    phaserKey: r.slug + '_hd',
    status: 'shipped',
    heightClass: 'item',
    parentId: r.slug === parentFam.split('.')[1] ? id : parentFam,
    usedBy: r.cooking ? ['2b-unit-10', 'cooking'] : ['2b-unit-10'],
    wordKo: r.ko,
    notes: 'Unit 10 still icon. Magenta-keyed 16-bit. Phaser key equals basename + _hd.'
  };
});
const catPath = path.join(ROOT, 'sprites', 'catalog.json');
const pack = JSON.parse(fs.readFileSync(catPath, 'utf8'));
pack.cacheKey = 'art-20260820d';
const keep = (pack.assets || []).filter((a) => a && a.heightClass !== 'item' && a.kind !== 'food' && a.kind !== 'item');
pack.assets = keep.concat(rows);
fs.writeFileSync(catPath, JSON.stringify(pack, null, 2) + '\n');
console.log('catalog assets', pack.assets.length, 'unit10 rows', rows.length);
