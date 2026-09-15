'use strict';
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root, 'js/vocabArt.js'), 'utf8'), context);
vm.runInContext(`
  let lesson = { worldId: '2b-unit-10' };
  function currentLesson() { return lesson; }
  const UNIT_VOCAB_ART_ROWS = [
    {ko:'김치찌개',slug:'unit10_kimchi_stew',folder:'foods',worldId:'2b-unit-10',cooking:true},
    {ko:'김치찌개',slug:'unit14_other_meaning',folder:'items',worldId:'2b-unit-14'}
  ];
`, context);
const run = code => vm.runInContext(code, context);
assert.equal(run("vocabArtFile('김치찌개')"), 'foods/unit10_kimchi_stew.png');
run("lesson = {worldId:'topik-2'}");
assert.equal(run("vocabArtFile('김치찌개')"), 'foods/kimchi_stew.png');
run("lesson = {worldId:'2b-unit-14'}");
assert.equal(run("vocabArtFile('김치찌개')"), 'items/unit14_other_meaning.png');
run('lesson = null');
assert.equal(run("vocabArtFile('김치찌개')"), 'foods/kimchi_stew.png');
assert.equal(run("vocabArtFile('not a word')"), '');
assert.ok(run("vocabArtLoadEntries().some(r => r.key === 'unit10_kimchi_stew_hd')"));
assert.ok(!run("vocabArtLoadEntries().some(r => r.key === 'unit14_other_meaning_hd')"));
console.log('Unit artwork: world-specific lookup, TOPIK isolation, fallback and pickup preload passed');

// Saving an edited quiz in admin must not silently strip its illustration.
const { validateQuiz } = require('../admin/lib/world');
for (const unit of [10, 11, 13, 14, 15]) {
  const bank = JSON.parse(fs.readFileSync(path.join(root, `worlds/unit${unit}-desk-quiz.json`), 'utf8'));
  const saved = validateQuiz(bank);
  assert.equal(saved.sessionSize, bank.sessionSize);
  assert.deepEqual(saved.questions.map(q => q.art), bank.questions.map(q => q.art));
}
const question = { id: 1, q: 'Prompt', a: 'A', choices: { A: 'A', B: 'B', C: 'C', D: 'D' } };
assert.throws(() => validateQuiz({ questions: [{ ...question, art: '../private.png' }] }), /local quiz PNG/);
assert.throws(() => validateQuiz({ questions: [{ ...question, art: 'https://example.com/image.png' }] }), /local quiz PNG/);
assert.equal(validateQuiz({ questions: [question] }).questions[0].art, undefined);
console.log('Unit artwork: admin save preserves illustrations and rejects unsafe paths');
