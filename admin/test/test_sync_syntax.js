const fs = require('fs');
const path = require('path');
const os = require('os');
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
    await test('levels.json exists, parses as an array, and is the single source of truth', () => {
      const levelsPath = path.join(repoRoot, 'levels.json');
      assert(fs.existsSync(levelsPath), 'levels.json exists');
      const content = fs.readFileSync(levelsPath, 'utf8');
      const parsed = JSON.parse(content);
      assert(Array.isArray(parsed), 'levels.json is a valid array');
      assert(parsed.length > 0, 'levels.json is non-empty');
    });

    await test('every js/manifest.json file passes node -c', () => {
      const checked = syncLib.validateGameScripts(repoRoot);
      assert(checked.success === true, 'validateGameScripts succeeded');
      assert(checked.files.length >= 17, `manifest lists split game scripts (got ${checked.files.length})`);
      checked.files.forEach((rel) => {
        const full = path.join(repoRoot, ...rel.split('/'));
        assert(fs.existsSync(full), rel + ' exists');
        const check = syncLib.validateJsSyntax(full);
        assert(check.valid === true, `${rel} valid syntax (${check.error || ''})`);
      });
    });

    await test('Writing a test level updates the root levels.json', () => {
      const testMetadata = { name: 'Level Sync Verification Test' };
      levelsLib.updateLevelMetadata(1, testMetadata, rootDir);

      const content = fs.readFileSync(path.join(rootDir, 'levels.json'), 'utf8');
      assert(content.includes('Level Sync Verification Test'), 'levels.json contains update');
      const parsed = JSON.parse(content);
      assert(parsed[0].name === 'Level Sync Verification Test', 'Parsed JSON level 1 name updated');
    });

    await test('Word origins are read-only: writes are refused and game scripts are left untouched', () => {
      const sample = path.join(repoRoot, 'js', 'systems', 'save.js');
      const before = fs.readFileSync(sample, 'utf8');

      let caught = false;
      try {
        vocabFactsLib.addVocabFact('sync_test_vocab_key', {}, rootDir);
      } catch (err) {
        caught = true;
        assert(err.statusCode === 409, `expected statusCode 409, got ${err.statusCode}`);
        assert(/build_facts_json\.js/.test(err.message), 'error points at the generator');
      }
      assert(caught === true, 'addVocabFact threw instead of writing');
      assert(fs.readFileSync(sample, 'utf8') === before, 'save.js unchanged');

      const facts = JSON.parse(fs.readFileSync(path.join(repoRoot, 'facts.json'), 'utf8'));
      assert(Object.keys(facts).length > 0, 'facts.json parses and is non-empty');
      const checked = syncLib.validateGameScripts(repoRoot);
      assert(checked.success === true, 'game scripts still valid');
    });

    await test('validateJsSyntax rejects invalid JavaScript', () => {
      const tempPath = path.join(os.tmpdir(), '_sync_syntax_temp.js');
      fs.writeFileSync(tempPath, 'const VOCAB_FACTS = { invalid js string syntax without closing brace...', 'utf8');
      try {
        const check = syncLib.validateJsSyntax(tempPath);
        assert(check.valid === false, 'invalid JS is rejected');
      } finally {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
      const checked = syncLib.validateGameScripts(repoRoot);
      assert(checked.success === true, 'live game scripts remain valid');
    });

  } finally {
    rmSandbox(sandbox);
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
