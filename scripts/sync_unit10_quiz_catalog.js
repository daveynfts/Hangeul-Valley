'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const bankPath = path.join(ROOT, 'worlds', 'unit10-desk-quiz.json');
const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
const ART = {
  1: 'quiz/unit10_q01_kimchi_stew.png',
  2: 'quiz/unit10_q02_soybean_paste_stew.png',
  3: 'quiz/unit10_q03_soft_tofu_stew.png',
  4: 'quiz/unit10_q04_pork_bone_potato_stew.png',
  5: 'quiz/unit10_q05_spicy_fish_stew.png',
  6: 'quiz/unit10_q06_ox_bone_soup.png',
  7: 'quiz/unit10_q07_cold_noodles.png',
  8: 'quiz/unit10_q08_knife_cut_noodles.png',
  9: 'quiz/unit10_q09_spicy_mixed_noodles.png',
  10: 'quiz/unit10_q10_grilled_pork_belly.png',
  11: 'quiz/unit10_q11_grilled_minced_ribs.png',
  12: 'quiz/unit10_q12_braised_short_ribs.png',
  13: 'quiz/unit10_q13_ginseng_chicken_soup.png',
  14: 'quiz/unit10_q14_chicken_meat.png',
  15: 'quiz/unit10_q15_sweet.png',
  16: 'quiz/unit10_q16_salty.png',
  17: 'quiz/unit10_q17_bitter.png',
  18: 'quiz/unit10_q18_sour.png',
  19: 'quiz/unit10_q19_spicy.png',
  20: 'quiz/unit10_q20_flavor.png'
};
(bank.questions || []).forEach((q) => {
  if (ART[q.id]) q.art = ART[q.id];
});
fs.writeFileSync(bankPath, JSON.stringify(bank, null, 2) + '\n');

const catPath = path.join(ROOT, 'sprites', 'catalog.json');
const pack = JSON.parse(fs.readFileSync(catPath, 'utf8'));
pack.cacheKey = 'art-20260820i';
const keep = (pack.assets || []).filter((a) => !(a && a.family === 'unit10-desk-quiz'));
const PARENT = 'quiz.unit10.q01_kimchi_stew';
const rows = (bank.questions || []).map((q) => {
  const slug = String(q.art).replace(/^quiz\//, '').replace(/\.png$/i, '');
  const short = slug.replace(/^unit10_/, '');
  return {
    id: 'quiz.unit10.' + short,
    nameEn: 'Unit 10 desk quiz illustration ' + q.id,
    kind: 'quiz',
    family: 'unit10-desk-quiz',
    role: 'q' + q.id,
    path: q.art,
    status: 'shipped',
    heightClass: 'illustration',
    parentId: PARENT,
    usedBy: ['2b-unit-10'],
    notes: 'Desk-quiz illustration. 16-bit framed still life. HTML overlay, not Phaser.'
  };
});
pack.assets = keep.concat(rows);
fs.writeFileSync(catPath, JSON.stringify(pack, null, 2) + '\n');
console.log('quiz questions with art', (bank.questions || []).filter((q) => q.art).length);
console.log('catalog assets', pack.assets.length, 'unit10 quiz rows', rows.length, 'cache', pack.cacheKey);
