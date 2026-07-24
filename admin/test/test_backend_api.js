const fs = require('fs');
const path = require('path');
const http = require('http');
const app = require('../server');
const syncLib = require('../lib/sync');
const levelsLib = require('../lib/levels');
const vocabFactsLib = require('../lib/vocabFacts');

const rootDir = path.resolve(__dirname, '../../');

function makeRequest(port, method, pathName, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port: port,
      path: pathName,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload ? Buffer.byteLength(payload) : 0
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

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

  let server = null;
  let port = 0;

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
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        port = server.address().port;
        resolve();
      });
    });

    // 1. GET /api/stats
    await test('GET /api/stats returns valid stats', async () => {
      const res = await makeRequest(port, 'GET', '/api/stats');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.success === true, 'Response success is true');
      assert(typeof res.body.data.totalLevels === 'number', 'totalLevels is a number');
      assert(typeof res.body.data.totalWords === 'number', 'totalWords is a number');
      assert(typeof res.body.data.coveragePercentage === 'number', 'coveragePercentage is a number');
    });

    // 2. GET /api/levels
    await test('GET /api/levels returns list of all levels', async () => {
      const res = await makeRequest(port, 'GET', '/api/levels');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.success === true, 'Response success is true');
      assert(Array.isArray(res.body.data), 'data is an array');
      assert(res.body.count === res.body.data.length, 'count matches array length');
    });

    // 3. GET /api/levels/:levelNum
    await test('GET /api/levels/1 returns Level 1 details', async () => {
      const res = await makeRequest(port, 'GET', '/api/levels/1');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.success === true, 'Response success is true');
      assert(res.body.data.level === 1, 'Level number is 1');
      assert(Array.isArray(res.body.data.words), 'words is an array');
    });

    await test('GET /api/levels/999 returns 404 Not Found', async () => {
      const res = await makeRequest(port, 'GET', '/api/levels/999');
      assert(res.status === 404, `Expected 404, got ${res.status}`);
      assert(res.body.success === false, 'Response success is false');
    });

    // 4. PUT /api/levels (batch update)
    await test('PUT /api/levels accepts valid levels array', async () => {
      const currentLevels = JSON.parse(originalLevels);
      const res = await makeRequest(port, 'PUT', '/api/levels', currentLevels);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.success === true, 'success is true');
    });

    await test('PUT /api/levels returns 400 Bad Request when body is not an array', async () => {
      const res = await makeRequest(port, 'PUT', '/api/levels', { invalid: 'object' });
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      assert(res.body.error === 'Bad Request', 'error is Bad Request');
    });

    // 5. PUT /api/levels/:levelNum (Level metadata update)
    await test('PUT /api/levels/1 updates metadata', async () => {
      const res = await makeRequest(port, 'PUT', '/api/levels/1', {
        name: '기초 어휘 (Test Update)',
        target: 60
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.data.name === '기초 어휘 (Test Update)', 'name updated');
    });

    await test('PUT /api/levels/abc returns 400 Bad Request', async () => {
      const res = await makeRequest(port, 'PUT', '/api/levels/abc', { name: 'New Name' });
      assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test('PUT /api/levels/999 returns 404 Not Found', async () => {
      const res = await makeRequest(port, 'PUT', '/api/levels/999', { name: 'New Name' });
      assert(res.status === 404, `Expected 404, got ${res.status}`);
    });

    // 6. Word CRUD (POST, PUT, DELETE)
    let addedWordIndex = -1;

    await test('POST /api/levels/1/words adds a new word', async () => {
      const newWord = { ko: '테스트단어API', en: 'api_test_word', hint: '🧪', category: '일상' };
      const res = await makeRequest(port, 'POST', '/api/levels/1/words', newWord);
      assert(res.status === 201, `Expected 201, got ${res.status}`);
      assert(res.body.success === true, 'success is true');
      assert(res.body.data.ko === '테스트단어API', 'Korean word matches');
      addedWordIndex = res.body.wordIndex;
      assert(addedWordIndex >= 0, 'valid word index returned');
    });

    await test('POST /api/levels/1/words returns 400 when missing required fields', async () => {
      const res = await makeRequest(port, 'POST', '/api/levels/1/words', { ko: '단어' });
      assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test('POST /api/levels/abc/words returns 400 Bad Request', async () => {
      const res = await makeRequest(port, 'POST', '/api/levels/abc/words', { ko: '단어', en: 'word' });
      assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test('POST /api/levels/999/words returns 404 Not Found', async () => {
      const res = await makeRequest(port, 'POST', '/api/levels/999/words', { ko: '단어', en: 'word' });
      assert(res.status === 404, `Expected 404, got ${res.status}`);
    });

    await test('PUT /api/levels/1/words/:wordIndex updates word', async () => {
      const res = await makeRequest(port, 'PUT', `/api/levels/1/words/${addedWordIndex}`, {
        ko: '테스트수정API',
        en: 'api_test_word_updated'
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.data.ko === '테스트수정API', 'word updated');
    });

    await test('PUT /api/levels/1/words/abc returns 400 Bad Request', async () => {
      const res = await makeRequest(port, 'PUT', '/api/levels/1/words/abc', { ko: '수정' });
      assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test('PUT /api/levels/1/words/99999 returns 404 Out of Bounds', async () => {
      const res = await makeRequest(port, 'PUT', '/api/levels/1/words/99999', { ko: '수정' });
      assert(res.status === 404, `Expected 404, got ${res.status}`);
    });

    await test('DELETE /api/levels/1/words/:wordIndex removes word', async () => {
      const res = await makeRequest(port, 'DELETE', `/api/levels/1/words/${addedWordIndex}`);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.success === true, 'success is true');
    });

    await test('DELETE /api/levels/1/words/abc returns 400 Bad Request', async () => {
      const res = await makeRequest(port, 'DELETE', '/api/levels/1/words/abc');
      assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test('DELETE /api/levels/1/words/99999 returns 404 Out of Bounds', async () => {
      const res = await makeRequest(port, 'DELETE', '/api/levels/1/words/99999');
      assert(res.status === 404, `Expected 404, got ${res.status}`);
    });

    // 7. GET /api/vocab-facts & VOCAB_FACTS CRUD
    await test('GET /api/vocab-facts returns vocabulary facts dictionary', async () => {
      const res = await makeRequest(port, 'GET', '/api/vocab-facts');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.success === true, 'success is true');
      assert(typeof res.body.data === 'object', 'data is object');
      assert(typeof res.body.totalFacts === 'number', 'totalFacts is number');
    });

    const testFactKey = 'api_backend_unit_test_key';

    await test('POST /api/vocab-facts creates new vocab fact entry', async () => {
      const res = await makeRequest(port, 'POST', '/api/vocab-facts', {
        key: testFactKey,
        vi: 'Nghĩa tiếng Việt test',
        ko: '한국어 설명 test'
      });
      assert(res.status === 201, `Expected 201, got ${res.status}`);
      assert(res.body.key === testFactKey, 'key matches created entry');
    });

    await test('POST /api/vocab-facts with empty key returns 400 Bad Request', async () => {
      const res = await makeRequest(port, 'POST', '/api/vocab-facts', { key: '   ', vi: 'Vi', ko: 'Ko' });
      assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test('PUT /api/vocab-facts/:key updates existing vocab fact entry', async () => {
      const res = await makeRequest(port, 'PUT', `/api/vocab-facts/${testFactKey}`, {
        vi: 'Nghĩa tiếng Việt updated',
        ko: '한국어 설명 updated'
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.data.vi === 'Nghĩa tiếng Việt updated', 'vi updated');
    });

    await test('DELETE /api/vocab-facts/:key deletes vocab fact entry', async () => {
      const res = await makeRequest(port, 'DELETE', `/api/vocab-facts/${testFactKey}`);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.key === testFactKey, 'key matches deleted entry');
    });

    await test('DELETE /api/vocab-facts/non_existent_key_123 returns 404 Not Found', async () => {
      const res = await makeRequest(port, 'DELETE', '/api/vocab-facts/non_existent_key_123');
      assert(res.status === 404, `Expected 404, got ${res.status}`);
    });

    // 8. POST /api/sync
    await test('POST /api/sync triggers full dataset sync', async () => {
      const res = await makeRequest(port, 'POST', '/api/sync');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.success === true, 'success is true');
    });

  } finally {
    if (server) {
      server.close();
    }
    // Restore original state of files to guarantee pristine codebase
    syncLib.syncLevels(JSON.parse(originalLevels), rootDir);
    syncLib.syncGameJs(originalGameJs, rootDir);
  }

  const duration = Date.now() - startTime;
  return {
    suiteName: 'REST API Endpoints (test_backend_api.js)',
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
    console.error('Fatal error running test_backend_api:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
