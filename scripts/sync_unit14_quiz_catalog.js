'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'worlds', 'unit14-desk-quiz.json'), 'utf8'));
const catPath = path.join(ROOT, 'sprites', 'catalog.json');
const pack = JSON.parse(fs.readFileSync(catPath, 'utf8'));
pack.cacheKey = 'art-20260820i';
const keep = (pack.assets || []).filter((a) => !(a && a.family === 'unit14-desk-quiz'));
const PARENT = 'quiz.unit14.q01_two_hands';
const rows = (bank.questions || []).map((q) => {
  const slug = String(q.art).replace(/^quiz\//, '').replace(/\.png$/i, '');
  const short = slug.replace(/^unit14_/, '');
  return {
    id: 'quiz.unit14.' + short,
    nameEn: 'Unit 14 desk quiz illustration ' + q.id,
    kind: 'quiz',
    family: 'unit14-desk-quiz',
    role: 'q' + q.id,
    path: q.art,
    status: 'shipped',
    heightClass: 'illustration',
    parentId: PARENT,
    usedBy: ['2b-unit-14'],
    notes: 'Desk-quiz illustration. 16-bit framed scene. HTML overlay, not Phaser.'
  };
});
pack.assets = keep.concat(rows);
fs.writeFileSync(catPath, JSON.stringify(pack, null, 2) + '\n');
console.log('catalog assets', pack.assets.length, 'quiz rows', rows.length, 'cache', pack.cacheKey);
