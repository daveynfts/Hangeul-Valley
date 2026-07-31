const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const syncLib = require('../lib/sync');
const levelsLib = require('../lib/levels');
const vocabFactsLib = require('../lib/vocabFacts');

const rootDir = path.resolve(__dirname, '../../');

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

  const originalLevels = fs.readFileSync(path.join(rootDir, 'levels.json'), 'utf8');
  const originalGameJs = fs.readFileSync(path.join(rootDir, 'game.js'), 'utf8');

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
    // 1. levels.json & assets/levels.json content equality check & JSON parsing
    await test('levels.json & assets/levels.json exist, parse cleanly, and match equality', () => {
      const rootLevelsPath = path.join(rootDir, 'levels.json');
      const assetLevelsPath = path.join(rootDir, 'assets/levels.json');

      assert(fs.existsSync(rootLevelsPath), 'levels.json exists');
      assert(fs.existsSync(assetLevelsPath), 'assets/levels.json exists');

      const rootContent = fs.readFileSync(rootLevelsPath, 'utf8');
      const assetContent = fs.readFileSync(assetLevelsPath, 'utf8');

      const rootParsed = JSON.parse(rootContent);
      const assetParsed = JSON.parse(assetContent);

      assert(Array.isArray(rootParsed), 'root levels.json is valid array');
      assert(Array.isArray(assetParsed), 'assets levels.json is valid array');
      assert(rootParsed.length === assetParsed.length, 'both levels files have same length');

      // Compare JSON strings
      assert(rootContent === assetContent, 'levels.json and assets/levels.json content strings match exactly');
    });

    // 2. node -c execution checks via execSync for game.js and assets/game.js
    await test('node -c game.js & assets/game.js execution checks pass with 0 syntax errors', () => {
      const rootGameJsPath = path.join(rootDir, 'game.js');
      const assetGameJsPath = path.join(rootDir, 'assets/game.js');

      assert(fs.existsSync(rootGameJsPath), 'game.js exists');
      assert(fs.existsSync(assetGameJsPath), 'assets/game.js exists');

      // Execute node -c directly via child_process.execSync
      execSync(`node -c "${rootGameJsPath}"`, { stdio: 'pipe' });
      execSync(`node -c "${assetGameJsPath}"`, { stdio: 'pipe' });

      // Also verify via syncLib.validateJsSyntax
      const rootCheck = syncLib.validateJsSyntax(rootGameJsPath);
      const assetCheck = syncLib.validateJsSyntax(assetGameJsPath);

      assert(rootCheck.valid === true, `root game.js valid syntax (${rootCheck.error || ''})`);
      assert(assetCheck.valid === true, `assets/game.js valid syntax (${assetCheck.error || ''})`);
    });

    // 3. Auto-sync test for levels: mutate level via lib, verify both root and assets mirror files update synchronously
    await test('Auto-sync levels: writing test level updates both root and assets mirror files synchronously', () => {
      const testLevelNum = 1;
      const testMetadata = { name: 'Level Sync Verification Test' };

      levelsLib.updateLevelMetadata(testLevelNum, testMetadata, rootDir);

      const rootContent = fs.readFileSync(path.join(rootDir, 'levels.json'), 'utf8');
      const assetContent = fs.readFileSync(path.join(rootDir, 'assets/levels.json'), 'utf8');

      assert(rootContent === assetContent, 'Root and asset mirror level files are identical after edit');
      assert(rootContent.includes('Level Sync Verification Test'), 'Root levels.json contains update');
      assert(assetContent.includes('Level Sync Verification Test'), 'assets/levels.json contains update');

      const rootParsed = JSON.parse(rootContent);
      const assetParsed = JSON.parse(assetContent);
      assert(rootParsed[0].name === 'Level Sync Verification Test', 'Parsed JSON level 1 name updated');
      assert(assetParsed[0].name === 'Level Sync Verification Test', 'Parsed asset level 1 name updated');
    });

    // 4. Word origins are read-only and no longer live in game.js: they were moved to
    // the generated facts.json, so a write must be refused rather than rewriting game.js.
    await test('Word origins are read-only: writes are refused and game.js is left untouched', () => {
      const rootBefore = fs.readFileSync(path.join(rootDir, 'game.js'), 'utf8');
      const assetBefore = fs.readFileSync(path.join(rootDir, 'assets/game.js'), 'utf8');

      let caught = false;
      try {
        vocabFactsLib.addVocabFact('sync_test_vocab_key', {}, rootDir);
      } catch (err) {
        caught = true;
        assert(err.statusCode === 409, `expected statusCode 409, got ${err.statusCode}`);
        assert(/build_facts_json\.js/.test(err.message), 'error points at the generator');
      }
      assert(caught === true, 'addVocabFact threw instead of writing');

      assert(fs.readFileSync(path.join(rootDir, 'game.js'), 'utf8') === rootBefore, 'game.js unchanged');
      assert(fs.readFileSync(path.join(rootDir, 'assets/game.js'), 'utf8') === assetBefore, 'assets/game.js unchanged');
      assert(rootBefore === assetBefore, 'game.js and assets/game.js remain identical');

      // facts.json itself must be valid JSON and mirrored into assets/
      const facts = JSON.parse(fs.readFileSync(path.join(rootDir, 'facts.json'), 'utf8'));
      assert(Object.keys(facts).length > 0, 'facts.json parses and is non-empty');

      execSync(`node -c "${path.join(rootDir, 'game.js')}"`, { stdio: 'pipe' });
      execSync(`node -c "${path.join(rootDir, 'assets/game.js')}"`, { stdio: 'pipe' });
    });

    // 5. Syntax Error Rejection & Rollback test
    await test('Syntax Error Rejection & Rollback: invalid JS prevents sync and preserves intact original files', () => {
      const invalidJsContent = 'const VOCAB_FACTS = { invalid js string syntax without closing brace...';

      let caught = false;
      try {
        syncLib.syncGameJs(invalidJsContent, rootDir);
      } catch (err) {
        caught = true;
        assert(err.message.includes('syntax error'), 'Error message mentions syntax error');
      }

      assert(caught === true, 'syncGameJs threw error on invalid JS');

      // Verify node -c on original files after failed sync attempt
      const rootCheck = syncLib.validateJsSyntax(path.join(rootDir, 'game.js'));
      const assetCheck = syncLib.validateJsSyntax(path.join(rootDir, 'assets/game.js'));
      assert(rootCheck.valid === true, 'root game.js remains valid syntax after rollback');
      assert(assetCheck.valid === true, 'assets/game.js remains valid syntax after rollback');
    });

  } finally {
    // Restore original files
    syncLib.syncLevels(JSON.parse(originalLevels), rootDir);
    syncLib.syncGameJs(originalGameJs, rootDir);
  }

  const duration = Date.now() - startTime;
  return {
    suiteName: 'Data Sync & Syntax Verification (test_sync_syntax.js)',
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
    console.error('Fatal error running test_sync_syntax:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
