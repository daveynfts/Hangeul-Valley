'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'worlds', 'unit14-desk-quiz.json'), 'utf8'));
const farm = fs.readFileSync(path.join(ROOT, 'js', 'scenes', 'farm.js'), 'utf8');
const ui = fs.readFileSync(path.join(ROOT, 'js', 'ui.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'sprites', 'catalog.json'), 'utf8'));

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL: ' + msg);
    process.exit(1);
  }
  console.log('ok  ' + msg);
}

assert(bank.questions.length === 10, '10 Unit 14 desk questions');
assert(bank.sessionSize === 10, 'session plays all 10');
assert(bank.questions[0].a === 'C' && bank.questions[1].a === 'B' && bank.questions[2].a === 'B',
  'Q1-Q3 keys');
assert(bank.questions[3].a === 'B' && bank.questions[4].a === 'A' && bank.questions[5].a === 'C',
  'Q4-Q6 keys');
assert(bank.questions[6].a === 'B' && bank.questions[7].a === 'C' && bank.questions[8].a === 'B'
  && bank.questions[9].a === 'B', 'Q7-Q10 keys');

assert(farm.indexOf('_hasStudyDesk') >= 0, 'farm has study-desk helper');
assert(farm.indexOf('_isUnit14') >= 0, 'farm knows Unit 14');
assert(/if \(this\._hasStudyDesk\(\)\) this\._ensureStudyDesk\(\)/.test(farm), 'Unit 14 spawns the desk');
// The desk offers the quiz and the workbook page now, so the sprite opens the
// chooser rather than the quiz directly. openStudyDesk falls back to the quiz on
// a world that has no workbook, which is what keeps Unit 10 unchanged.
assert(/_hasStudyDesk\(\)[\s\S]{0,280}openStudyDesk/.test(farm), 'desk interact opens the chooser');
assert(/_hasStudyDesk\(\)[\s\S]{0,320}openDeskQuiz/.test(farm), 'and still falls back to the quiz');
assert(ui.indexOf('function openStudyDesk') >= 0, 'ui ships the chooser');
assert(/deskMenuOptions\.length === 1[\s\S]{0,80}run\(\)/.test(ui),
  'a single-mode desk opens that mode instead of showing a one-row menu');
assert(ui.indexOf('unit14-desk-quiz.json') >= 0, 'quiz loader knows Unit 14 bank');
assert(html.indexOf('id="desk-art"') >= 0, 'quiz overlay has illustration slot');

bank.questions.forEach((q) => {
  const png = path.join(ROOT, 'sprites', q.art);
  assert(fs.existsSync(png), q.art + ' exists');
  const row = (catalog.assets || []).find((a) => a && a.path === q.art);
  assert(!!row, q.art + ' is catalogued');
});

console.log('\ntest_unit14_desk_quiz: all passed');
