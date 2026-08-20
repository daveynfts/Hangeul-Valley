'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'js', 'hudArt.js'), 'utf8');
const ctx = {};
vm.runInNewContext(src + '\nthis.ROWS = HUD_ART_ROWS;', ctx);
const PARENT = 'ui.hud.vocab_book';
const rows = ctx.ROWS.map((r) => {
  const id = 'ui.hud.' + r.slug;
  return {
    id,
    nameEn: r.nameEn,
    kind: 'ui',
    family: 'hud-icons',
    role: r.id,
    path: 'ui/' + r.slug + '.png',
    status: 'shipped',
    heightClass: 'ui',
    parentId: PARENT,
    usedBy: ['HUD'],
    notes: 'HUD glyph. Magenta-keyed 16-bit. HTML overlay, not Phaser.'
  };
});
const catPath = path.join(ROOT, 'sprites', 'catalog.json');
const pack = JSON.parse(fs.readFileSync(catPath, 'utf8'));
pack.cacheKey = 'art-20260820g';
const keep = (pack.assets || []).filter((a) => !(a && a.kind === 'ui' && a.family === 'hud-icons'));
const ids = new Set(keep.map((a) => a && a.id));
rows.forEach((r) => {
  if (!ids.has(r.id)) keep.push(r);
});
pack.assets = keep;
fs.writeFileSync(catPath, JSON.stringify(pack, null, 2) + '\n');
console.log('catalog assets', pack.assets.length, 'hud rows', rows.length, 'cache', pack.cacheKey);
