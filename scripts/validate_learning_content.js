'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const levels = require(path.join(root, 'levels.json'));
const curriculum = require(path.join(root, 'curriculum.js'));

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function hash(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
}

function assertKorean(value, label) {
  assert(/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(value), `${label} must contain Korean text`);
}

assert(Array.isArray(levels) && levels.length >= 25, 'Expected the complete 25-level vocabulary dataset');
const allWords = levels.flatMap(level => level.words || []);
assert(allWords.length >= 1500, `Expected at least 1500 vocabulary entries, found ${allWords.length}`);

const knownKorean = new Set();
for (const [index, word] of allWords.entries()) {
  assert(word && typeof word === 'object', `Vocabulary entry ${index} must be an object`);
  assert(typeof word.ko === 'string' && word.ko.trim(), `Vocabulary entry ${index}.ko is required`);
  assert(typeof word.en === 'string' && word.en.trim(), `Vocabulary entry ${index}.en is required`);
  assert(typeof word.category === 'string' && word.category.trim(), `Vocabulary entry ${index}.category is required`);
  assert(!knownKorean.has(word.ko), `Duplicate Korean vocabulary key: ${word.ko}`);
  knownKorean.add(word.ko);
}

assert.strictEqual(curriculum.version, 1, 'Unexpected curriculum version');
assert.strictEqual(curriculum.locale, 'vi-VN', 'Curriculum must target Vietnamese learners');
assert.strictEqual(curriculum.targetLanguage, 'ko-KR', 'Curriculum target language must be Korean');
assert.strictEqual(curriculum.qa.status, 'editorial-review-required', 'Curriculum must not claim unverified linguistic QA');
assert.strictEqual(curriculum.qa.linguisticReview, 'pending', 'Native/teacher linguistic review must remain explicit');
assert.strictEqual(curriculum.qa.audioPolicy, 'browser-speech-synthesis-fallback', 'Audio policy must document the TTS fallback');
assert(Array.isArray(curriculum.chapters) && curriculum.chapters.length >= 10, 'Expected at least 10 curriculum chapters');

const chapterIds = new Set();
const missionIds = new Set();
let missionCount = 0;
let grammarCount = 0;
let vocabularyReferenceCount = 0;

curriculum.chapters.forEach((chapter, chapterIndex) => {
  assert.strictEqual(chapter.order, chapterIndex + 1, `Chapter order mismatch at ${chapter.id}`);
  assert(!chapterIds.has(chapter.id), `Duplicate chapter id: ${chapter.id}`);
  chapterIds.add(chapter.id);
  assert(chapter.band === 'A0' || chapter.band === 'A1', `${chapter.id} must declare an A0/A1 band`);
  assertKorean(chapter.titleKo, `${chapter.id}.titleKo`);
  assert(typeof chapter.titleVi === 'string' && chapter.titleVi.trim(), `${chapter.id}.titleVi is required`);
  assert(typeof chapter.canDoVi === 'string' && chapter.canDoVi.trim(), `${chapter.id}.canDoVi is required`);
  assert(Array.isArray(chapter.wordRefs) && chapter.wordRefs.length >= 3, `${chapter.id} needs target vocabulary`);
  vocabularyReferenceCount += chapter.wordRefs.length;

  if (chapter.id !== 'a0-hangul-blocks') {
    chapter.wordRefs.forEach(ko => assert(knownKorean.has(ko), `${chapter.id} references unknown vocabulary: ${ko}`));
  }

  assert(Array.isArray(chapter.grammar) && chapter.grammar.length >= 1, `${chapter.id} needs a grammar point`);
  chapter.grammar.forEach(point => {
    grammarCount++;
    assert(point.id && point.form && point.meaningVi, `${chapter.id} has an incomplete grammar point`);
    assertKorean(point.form, `${chapter.id}.${point.id}.form`);
    assert(Array.isArray(point.examples) && point.examples.length >= 2, `${point.id} needs at least two examples`);
    point.examples.forEach(example => {
      assertKorean(example.ko, `${point.id}.example.ko`);
      assert(typeof example.vi === 'string' && example.vi.trim(), `${point.id}.example.vi is required`);
    });
  });

  assert(Array.isArray(chapter.dialogue) && chapter.dialogue.length >= 2, `${chapter.id} needs a contextual dialogue`);
  chapter.dialogue.forEach(line => {
    assertKorean(line.ko, `${chapter.id}.dialogue.ko`);
    assert(line.speaker && line.vi, `${chapter.id} dialogue lines need speaker and Vietnamese meaning`);
  });

  assert(Array.isArray(chapter.missions) && chapter.missions.length >= 3, `${chapter.id} needs at least three missions`);
  chapter.missions.forEach(mission => {
    missionCount++;
    assert(!missionIds.has(mission.id), `Duplicate mission id: ${mission.id}`);
    missionIds.add(mission.id);
    assertKorean(mission.contextKo, `${mission.id}.contextKo`);
    assertKorean(mission.correctKo, `${mission.id}.correctKo`);
    assert(typeof mission.promptVi === 'string' && mission.promptVi.trim(), `${mission.id}.promptVi is required`);
    assert(typeof mission.explanationVi === 'string' && mission.explanationVi.trim(), `${mission.id}.explanationVi is required`);
    assert(Array.isArray(mission.choicesKo) && mission.choicesKo.length >= 4, `${mission.id} needs four choices`);
    assert.strictEqual(new Set(mission.choicesKo).size, mission.choicesKo.length, `${mission.id} choices must be unique`);
    assert(mission.choicesKo.includes(mission.correctKo), `${mission.id} choices must include the correct answer`);
    mission.choicesKo.forEach(choice => assertKorean(choice, `${mission.id}.choice`));
  });
});

for (const file of ['game.js', 'index.html', 'levels.json', 'learning-core.js', 'curriculum.js']) {
  const assetFile = path.join('assets', file);
  assert(fs.existsSync(path.join(root, assetFile)), `Missing mirrored asset: ${assetFile}`);
  assert.strictEqual(hash(file), hash(assetFile), `${file} and ${assetFile} are out of sync`);
}

const html = read('index.html');
const curriculumScriptAt = html.indexOf('<script src="curriculum.js"></script>');
const learningScriptAt = html.indexOf('<script src="learning-core.js"></script>');
const gameScriptAt = html.indexOf('<script src="game.js"></script>');
assert(curriculumScriptAt >= 0 && curriculumScriptAt < learningScriptAt, 'curriculum.js must load before learning-core.js');
assert(learningScriptAt < gameScriptAt, 'learning-core.js must load before game.js');
assert(html.includes('id="learning-path-overlay"'), 'Learning Path overlay is missing');
assert(html.includes('onclick="openGingerLearningPath()"'), 'Ginger must link to the Learning Path');

const game = read('game.js');
assert(game.includes('activity:\'npc_ginger_context\''), 'Context missions must feed the learning engine');
assert(game.includes('curriculum: curriculumState'), 'Curriculum progress must be persisted');
assert(game.includes('v: 7'), 'Save schema v7 is required for curriculum and visual progress');
assert(game.includes('visual: visualState'), 'Visual world state must be persisted with the save');
assert(game.includes('let saveInitStarted = false'), 'Save initialization must be guarded independently of player currency');
assert(!game.includes('if(gold===0 && harvestCounts.size===0) initSave()'), 'Browser save loading must not depend on the starting coin balance');
assert(!game.includes('__M2_TEST__') && !game.includes('__M3_TEST__'), 'Test-only globals must not ship in runtime code');

console.log(
  `✓ Learning content valid: ${levels.length} levels, ${allWords.length} words, ` +
  `${curriculum.chapters.length} chapters, ${grammarCount} grammar points, ` +
  `${missionCount} context missions, ${vocabularyReferenceCount} target references.`
);
