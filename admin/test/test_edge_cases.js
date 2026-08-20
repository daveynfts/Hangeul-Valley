const fs = require('fs');
const path = require('path');
const syncLib = require('../lib/sync');
const levelsLib = require('../lib/levels');
const vocabFactsLib = require('../lib/vocabFacts');
const { makeWriteSandbox, rmSandbox } = require('./sandbox');

const repoRoot = path.resolve(__dirname, '../../');

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  const startTime = Date.now();
  let passed = 0;
  let failed = 0;
  const testDetails = [];

  const sandbox = makeWriteSandbox(repoRoot);
  const rootDir = sandbox;

  async function test(name, fn) {
    try {
      await fn();
      passed++;
      testDetails.push({ name, passed: true });
    } catch (err) {
      failed++;
      testDetails.push({ name, passed: false, error: err.message });
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
    }
  }

  try {
    // 1. Multi-byte Hangul Characters handling
    await test('Multi-byte Hangul: Handles complex syllables, NFD/NFC, double consonants without corruption', () => {
      const complexHangulWord = {
        ko: '앉다 & 갉아먹다 (뷁쀍)',
        en: 'complex_hangul_test',
        hint: '🇰🇷',
        category: '복잡한 어휘'
      };

      const addResult = levelsLib.addWord(1, complexHangulWord, rootDir);
      assert(addResult.word.ko === complexHangulWord.ko, 'Korean word matches exactly');

      const reReadLevels = levelsLib.getLevels(rootDir);
      const readWord = reReadLevels[0].words[addResult.wordIndex];
      assert(readWord.ko === '앉다 & 갉아먹다 (뷁쀍)', 'Readback Hangul string preserved');

      // Word origins are keyed by the Korean headword, so multi-byte keys must round-trip
      // out of facts.json intact, including hanja and the 한자어 label inside descriptions.
      const factsData = vocabFactsLib.getVocabFactsData(rootDir);
      assert(factsData.facts['부모'] !== undefined, 'Multi-byte Hangul key 부모 resolves in facts.json');
      assert(factsData.facts['부모'].h === '父母', 'CJK hanja string preserved through JSON round-trip');
      assert(factsData.descriptions['부모'].includes('父 (부)'), 'Hanja + Hangul reading preserved in description');
      assert(factsData.descriptions['부모'].includes('한자어'), 'Korean label preserved in description');
      assert(Object.keys(factsData.facts).every(k => k === k.normalize('NFC')), 'All facts.json keys are NFC-normalized');

      // Validate syntax on disk
      const syntaxCheck = syncLib.validateGameScripts(repoRoot);
      assert(syntaxCheck.success === true, 'game scripts remain valid JS syntax with multi-byte strings');
    });

    // 2. Emojis and Unicode Symbols handling
    await test('Emojis & Unicode: Multi-byte emojis in hints and definitions parse and save accurately', () => {
      const emojiWord = {
        ko: '가족',
        en: 'family_emoji_test',
        hint: '👨‍👩‍👧‍👦 🎨 🧪 🚀',
        category: '가족'
      };

      const addRes = levelsLib.addWord(1, emojiWord, rootDir);
      assert(addRes.word.hint === '👨‍👩‍👧‍👦 🎨 🧪 🚀', 'Emoji string in hint preserved');

      const readLevels = levelsLib.getLevels(rootDir);
      const savedHint = readLevels[0].words[addRes.wordIndex].hint;
      assert(savedHint === '👨‍👩‍👧‍👦 🎨 🧪 🚀', 'Emoji string readback verified');
    });

    // 3. Quotes, Backslashes, Newlines & HTML Escaping
    // Word origins moved out of game.js into generated JSON, so the escaping risk now sits
    // in levels.json (still writable) rather than in a spliced JS literal.
    await test('Special Characters & Escaping: Double quotes, single quotes, backticks, backslashes, HTML tags', () => {
      const edgeWord = {
        ko: '따옴표 "큰" \'작은\' \\백슬래시\\',
        en: `Quote test: "Double", 'Single', \`Backtick\`, \\Backslash\\, <script>alert('XSS')</script>`,
        hint: '🧪',
        category: '가족과 사람'
      };

      const addRes = levelsLib.addWord(1, edgeWord, rootDir);
      const readLevels = levelsLib.getLevels(rootDir);
      const saved = readLevels[0].words[addRes.wordIndex];

      assert(saved.ko === edgeWord.ko, 'Quotes and backslashes preserved in Korean field');
      assert(saved.en.includes('"Double"'), 'Double quotes preserved in English field');
      assert(saved.en.includes('<script>'), 'HTML stored verbatim (escaping is a render-time concern)');

      // levels.json on disk must still be parseable after those characters round-trip
      const raw = fs.readFileSync(path.join(rootDir, 'levels.json'), 'utf8');
      assert(JSON.parse(raw).length > 0, 'levels.json still parses after special characters');

      const syntaxCheck = syncLib.validateGameScripts(repoRoot);
      assert(syntaxCheck.success === true, 'game scripts pass node -c');
    });

    // 4. Boundary Values
    await test('Boundary Values: Index 0, max index, level 1, level 25, out-of-bounds index handling', () => {
      const levels = levelsLib.getLevels(rootDir);
      const lvl1 = levelsLib.getLevelByNum(1, rootDir);
      const lvl25 = levelsLib.getLevelByNum(25, rootDir);

      assert(lvl1 !== null && lvl1.level === 1, 'Level 1 accessible');
      assert(lvl25 !== null && lvl25.level === 25, 'Level 25 accessible');

      // Word update at index 0 (boundary minimum)
      const originalWord0 = lvl1.words[0];
      const updatedWord0 = levelsLib.updateWord(1, 0, { ko: originalWord0.ko, en: originalWord0.en, hint: '🏁' }, rootDir);
      assert(updatedWord0.hint === '🏁', 'Boundary index 0 updated');

      // Word update at last index (boundary maximum)
      const lastIdx = lvl1.words.length - 1;
      const originalWordLast = lvl1.words[lastIdx];
      const updatedWordLast = levelsLib.updateWord(1, lastIdx, { ko: originalWordLast.ko, en: originalWordLast.en, hint: '🔚' }, rootDir);
      assert(updatedWordLast.hint === '🔚', `Boundary last index ${lastIdx} updated`);

      // Out of bounds checks
      let errLow = false;
      try {
        levelsLib.updateWord(1, -1, { ko: 'test' }, rootDir);
      } catch (e) {
        errLow = true;
      }
      assert(errLow === true, 'Out of bounds negative index throws error');

      let errHigh = false;
      try {
        levelsLib.updateWord(1, 9999, { ko: 'test' }, rootDir);
      } catch (e) {
        errHigh = true;
      }
      assert(errHigh === true, 'Out of bounds large index throws error');
    });

    // 5. Empty Payloads & Invalid Inputs
    await test('Empty Payloads & Invalid Inputs: Throws clear errors for empty/missing required properties', () => {
      let errMissingKo = false;
      try {
        levelsLib.addWord(1, { en: 'only_en' }, rootDir);
      } catch (e) {
        errMissingKo = true;
      }
      assert(errMissingKo === true, 'addWord without "ko" throws error');

      // Origin writes are refused outright now, regardless of key validity, because
      // facts.json is regenerated by scripts/build_facts_json.js.
      let originWriteRefused = false;
      try {
        vocabFactsLib.updateVocabFact('부모', {}, rootDir);
      } catch (e) {
        originWriteRefused = e.statusCode === 409 && /build_facts_json\.js/.test(e.message);
      }
      assert(originWriteRefused === true, 'updateVocabFact refuses with 409 and names the generator');

      let deleteRefused = false;
      try {
        vocabFactsLib.deleteVocabFact('부모', rootDir);
      } catch (e) {
        deleteRefused = e.statusCode === 409;
      }
      assert(deleteRefused === true, 'deleteVocabFact refuses with 409');
    });

    // 6. Duplicate Detection Logic
    await test('Duplicate Detection: Correctly detects duplicate Korean words across levels in getStats()', () => {
      // Add a duplicate word to level 1 and level 2
      const duplicateKo = '중복검증단어_테스트';
      levelsLib.addWord(1, { ko: duplicateKo, en: 'dup_test_1', hint: '1' }, rootDir);
      levelsLib.addWord(2, { ko: duplicateKo, en: 'dup_test_2', hint: '2' }, rootDir);

      const stats = levelsLib.getStats(rootDir);
      const foundDup = stats.duplicates.find(d => d.ko === duplicateKo);

      assert(foundDup !== undefined, 'Duplicate Korean word detected in stats');
      assert(foundDup.count >= 2, `Duplicate count is at least 2 (got ${foundDup.count})`);
    });

    // 7. Missing Facts Reporting Logic
    await test('Missing Facts Reporting: Accurately identifies words lacking a curated origin', () => {
      const missingEnKey = 'missing_fact_test_xyz_999';
      levelsLib.addWord(1, { ko: '누락단어테스트', en: missingEnKey, hint: '❓' }, rootDir);

      const factsData = vocabFactsLib.getVocabFactsData(rootDir);
      const foundMissing = factsData.missingFacts.find(m => m.en === missingEnKey);

      assert(foundMissing !== undefined, 'Missing fact entry reported in getVocabFactsData');
      assert(foundMissing.ko === '누락단어테스트', 'Missing fact details match added word');
    });

  } finally {
    rmSandbox(sandbox);
  }

  const duration = Date.now() - startTime;
  return {
    suiteName: 'Edge Cases & Data Integrity (test_edge_cases.js)',
    total: passed + failed,
    passed,
    failed,
    duration,
    testDetails
  };
}

if (require.main === module) {
  runTests().then(result => {
    console.log(`\n====================================================`);
    console.log(`  ${result.suiteName}`);
    console.log(`  Passed: ${result.passed}/${result.total} | Duration: ${result.duration}ms`);
    console.log(`====================================================\n`);
    process.exit(result.failed > 0 ? 1 : 0);
  }).catch(err => {
    console.error('Fatal error running test_edge_cases:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
