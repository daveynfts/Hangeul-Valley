'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'js', 'vocabArtUnit14.js'), 'utf8');
const ctx = {};
vm.runInNewContext(src + '\nthis.ROWS = UNIT14_VOCAB_ART_ROWS;', ctx);
const PARENT = {
  etiquette: 'item.give_two_hands',
  sign: 'item.no_smoking',
  action: 'item.eat_food',
  emotion: 'item.feel_embarrassed',
  people: 'item.elderly',
  abstract: 'item.keep_rules',
  place: 'item.cafeteria'
};
const rows = ctx.ROWS.map((r) => {
  const id = 'item.' + r.slug;
  const parentFam = PARENT[r.family] || id;
  const parentId = r.slug === parentFam.split('.')[1] ? id : parentFam;
  return {
    id,
    nameEn: r.nameEn,
    kind: 'item',
    family: r.family,
    role: 'icon',
    path: r.folder + '/' + r.slug + '.png',
    phaserKey: r.slug + '_hd',
    status: 'shipped',
    heightClass: 'item',
    parentId,
    usedBy: ['2b-unit-14'],
    wordKo: r.ko,
    notes: 'Unit 14 still icon. Magenta-keyed 16-bit. Phaser key equals basename + _hd.'
  };
});
const catPath = path.join(ROOT, 'sprites', 'catalog.json');
const pack = JSON.parse(fs.readFileSync(catPath, 'utf8'));
pack.cacheKey = 'art-20260820f';
const keep = (pack.assets || []).filter((a) => !(a && a.usedBy && a.usedBy.length === 1 && a.usedBy[0] === '2b-unit-14' && a.heightClass === 'item'));
const ids = new Set(keep.map((a) => a && a.id));
rows.forEach((r) => {
  if (!ids.has(r.id)) keep.push(r);
});
pack.assets = keep;
fs.writeFileSync(catPath, JSON.stringify(pack, null, 2) + '\n');
console.log('catalog assets', pack.assets.length, 'unit14 rows', rows.length);
