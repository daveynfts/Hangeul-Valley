'use strict';

const assert = require('assert');
const learning = require('./learning-core.js');

function run() {
  learning.reset();

  const father = { ko: '아버지', en: 'father', acceptedAnswers: ['아버님'] };
  assert.strictEqual(learning.normalizeKorean('  아버지\u200b. '), '아버지');
  assert.strictEqual(learning.isAnswerCorrect('아버님', father), true);
  assert.strictEqual(learning.isAnswerCorrect('아버지!', father), true);
  assert.strictEqual(learning.isAnswerCorrect('어머니', father), false);
  assert.strictEqual(learning.romanizeHangul('아버지'), 'a-beo-ji');
  assert.strictEqual(learning.stableId(father), learning.stableId({ ko: '아버지', en: 'dad' }));

  const first = learning.recordAttempt({
    word: father,
    activity: 'farm_phase_1',
    modality: 'production',
    correct: true,
    responseMs: 3200
  });
  assert.strictEqual(first.correct, true);
  assert.strictEqual(first.scheduledReview, true);
  assert.ok(first.mastery > 0);

  const immediate = learning.recordAttempt({
    word: father,
    activity: 'farm_phase_2',
    modality: 'production',
    correct: true,
    responseMs: 2200,
    at: Date.now() + 30000
  });
  assert.strictEqual(immediate.scheduledReview, false, 'massed farm repetition must not count as spaced review');

  const snapshotAfterImmediate = learning.exportState();
  const fatherRecord = snapshotAfterImmediate.items[learning.stableId(father)].modalities.production;
  assert.strictEqual(fatherRecord.successfulReviews, 1);
  assert.strictEqual(fatherRecord.intervalDays, 1);

  const wrong = learning.recordAttempt({
    word: father,
    activity: 'spell_duel',
    modality: 'recognition',
    correct: false,
    responseMs: 5050
  });
  assert.strictEqual(wrong.correct, false);
  assert.ok(learning.dueAtForWord(father) > Date.now());

  const idiom = { ko: '발이 넓다', en: 'to know many people', acceptedAnswers: ['발이넓다'] };
  assert.strictEqual(learning.isAnswerCorrect('발이넓다', idiom), true);

  learning.reset();
  learning.bootstrapFromHarvestCounts(
    { '발이넓다': 3 },
    [idiom]
  );
  assert.ok(learning.getMastery(idiom) >= 70, 'legacy harvest mastery should migrate to the corrected spaced item');

  const dueWord = learning.selectNextWord([father, idiom], { now: Date.now() + 31 * 86400000 });
  assert.ok(dueWord && dueWord.ko);

  const exported = learning.exportState();
  const masteryBeforeImport = learning.getMastery(idiom);
  learning.reset();
  learning.importState(exported);
  assert.strictEqual(learning.getMastery(idiom), masteryBeforeImport);

  const summary = learning.getSummary([father, idiom]);
  assert.ok(Number.isFinite(summary.accuracy));
  assert.ok(Number.isFinite(summary.mastered));

  console.log('✅ Learning Core: all tests passed');
}

run();
