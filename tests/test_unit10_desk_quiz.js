'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'worlds', 'unit10-desk-quiz.json'), 'utf8'));
const farm = fs.readFileSync(path.join(ROOT, 'js', 'scenes', 'farm.js'), 'utf8');
const ui = fs.readFileSync(path.join(ROOT, 'js', 'ui.js'), 'utf8');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'sprites', 'catalog.json'), 'utf8'));

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL: ' + msg);
    process.exit(1);
  }
  console.log('ok  ' + msg);
}

assert(bank.questions.length === 20, '20 Unit 10 desk questions');
assert(!/_ensureStudyDesk\(\)\{[\s\S]{0,900}wooden_stool_hd/.test(farm), 'desk does not spawn stool');
assert(/hintEmoji[\s\S]{0,180}vocabIconHtml\(word\.ko/.test(ui), 'plant quiz hint uses vocab art');

bank.questions.forEach((q) => {
  assert(!!q.art && q.art.indexOf('quiz/unit10_') === 0, 'Q' + q.id + ' has quiz art path');
  const png = path.join(ROOT, 'sprites', q.art);
  assert(fs.existsSync(png), q.art + ' exists');
  const row = (catalog.assets || []).find((a) => a && a.path === q.art);
  assert(!!row, q.art + ' is catalogued');
});

console.log('\ntest_unit10_desk_quiz: all passed');
