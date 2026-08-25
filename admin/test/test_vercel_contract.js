'use strict';

/**
 * Asserts Vercel serverless GET handlers return the same JSON shape (and, where
 * they share a lib, the same payload) as the local Express admin server.
 * Writes on Vercel used to 409 for everything. That changed deliberately: the admin can now
 * edit content on production, so the contract is no longer read-only-versus-writable but
 * who-you-are. Reads stay open, and a write is refused with 401 unsigned and 403 signed as
 * anyone but the owner. The old per-resource GET handlers keep refusing writes as before.
 */

const path = require('path');
const levelsLib = require('../lib/levels');
const vocabFactsLib = require('../lib/vocabFacts');
const worldLib = require('../lib/world');
const artLib = require('../lib/art');
const skinsLib = require('../lib/skins');

const rootDir = path.resolve(__dirname, '../../');

function assert(condition, message) {
  if (!condition) throw new Error('Assertion failed: ' + message);
}

function mockRes() {
  const r = {
    statusCode: 200,
    body: null,
    ended: false,
    status(code) { this.statusCode = code; return this; },
    json(obj) { this.body = obj; this.ended = true; return this; },
    end() { this.ended = true; return this; }
  };
  return r;
}

function callHandler(handler, method, extra) {
  const req = Object.assign({ method: method || 'GET', query: {} }, extra || {});
  const res = mockRes();
  handler(req, res);
  return res;
}

function keysOf(obj) {
  return Object.keys(obj || {}).sort();
}

function sameKeys(a, b, label) {
  const ka = keysOf(a).join(',');
  const kb = keysOf(b).join(',');
  assert(ka === kb, label + ' keys: vercel [' + ka + '] vs express [' + kb + ']');
}

async function runTests() {
  const startTime = Date.now();
  let passed = 0;
  let failed = 0;
  const testDetails = [];

  async function test(name, fn) {
    try {
      await fn();
      passed++;
      testDetails.push({ name, passed: true });
    } catch (err) {
      failed++;
      testDetails.push({ name, passed: false, error: err.message });
      console.error('  ❌ [FAIL] ' + name + ': ' + err.message);
    }
  }

  const statsH = require('../../api/stats');
  const levelsH = require('../../api/levels');
  const levelNumH = require('../../api/levels/[num]');
  const vocabH = require('../../api/vocab-facts');
  const artH = require('../../api/art');
  // One handler for all three Unit 10 reads now. They were three files, which cost three of
  // the twelve serverless functions the Hobby plan allows — and the project was on exactly
  // twelve, so the next route added broke the deployment. The URLs are unchanged: a dynamic
  // segment matches the literal, so /api/unit10/layout still answers.
  const unit10H = require('../../api/unit10/[kind]');
  // api/admin-host.js was folded into the one admin function, which is what keeps the
  // project at eleven of the twelve serverless functions the Hobby plan allows. The old
  // URL survives as a rewrite in vercel.json to /api/admin/host.
  const adminH = require('../../api/admin/[...path]');
  const skinsH = require('../../api/skins/catalog');

  await test('GET /api/stats: Vercel body matches Express lib payload', () => {
    const res = callHandler(statsH, 'GET');
    const expected = { success: true, data: levelsLib.getStats(rootDir) };
    assert(res.statusCode === 200, 'status 200, got ' + res.statusCode);
    sameKeys(res.body, expected, 'stats');
    assert(JSON.stringify(res.body.data) === JSON.stringify(expected.data), 'stats.data equal');
  });

  await test('GET /api/levels: Vercel body matches Express lib payload', () => {
    const res = callHandler(levelsH, 'GET');
    const levels = levelsLib.getLevels(rootDir);
    const expected = { success: true, count: levels.length, data: levels };
    assert(res.statusCode === 200, 'status 200, got ' + res.statusCode);
    sameKeys(res.body, expected, 'levels');
    assert(res.body.count === expected.count, 'levels count');
  });

  await test('GET /api/levels/:num: Vercel body matches Express lib payload', () => {
    const res = callHandler(levelNumH, 'GET', { query: { num: '1' } });
    const expected = { success: true, data: levelsLib.getLevelByNum(1, rootDir) };
    assert(res.statusCode === 200, 'status 200, got ' + res.statusCode);
    sameKeys(res.body, expected, 'level 1');
    assert(res.body.data && res.body.data.level === 1, 'level number 1');
  });

  await test('GET /api/vocab-facts: Vercel keys match Express GET', () => {
    const res = callHandler(vocabH, 'GET');
    const data = vocabFactsLib.getVocabFactsData(rootDir);
    const expected = {
      success: true,
      totalFacts: data.totalFacts,
      data: data.facts,
      descriptions: data.descriptions,
      byOrigin: data.byOrigin,
      coveragePercentage: data.coveragePercentage,
      exactMatchCount: data.exactMatchCount,
      casingMismatchCount: data.casingMismatchCount,
      casingDiscrepancies: data.casingDiscrepancies,
      missingFacts: data.missingFacts,
      readOnly: true,
      generatorHint: data.generatorHint
    };
    assert(res.statusCode === 200, 'status 200, got ' + res.statusCode);
    sameKeys(res.body, expected, 'vocab-facts');
    assert(res.body.readOnly === true, 'vocab-facts readOnly');
    assert(res.body.totalFacts === expected.totalFacts, 'vocab-facts totalFacts');
  });

  await test('GET /api/art: Vercel body matches Express lib payload', () => {
    const res = callHandler(artH, 'GET');
    const expected = { success: true, data: artLib.buildReport(rootDir) };
    assert(res.statusCode === 200, 'status 200, got ' + res.statusCode);
    sameKeys(res.body, expected, 'art');
    assert(res.body.data.totals.assets === expected.data.totals.assets, 'art totals.assets');
  });

  await test('GET /api/skins/catalog: Vercel body matches Express lib payload', () => {
    const res = callHandler(skinsH, 'GET');
    const expected = { success: true, data: skinsLib.getCatalog(rootDir) };
    assert(res.statusCode === 200, 'status 200, got ' + res.statusCode);
    assert(JSON.stringify(res.body.data.skins.map((s) => s.id)) === JSON.stringify(expected.data.skins.map((s) => s.id)),
      'skins ids equal');
  });

  await test('GET /api/unit10/layout: Vercel body matches Express lib payload', () => {
    const res = callHandler(unit10H, 'GET', { query: { kind: 'layout' } });
    const expected = { success: true, data: worldLib.getLayout(rootDir) };
    assert(res.statusCode === 200, 'status 200, got ' + res.statusCode);
    assert(JSON.stringify(res.body.data) === JSON.stringify(expected.data), 'layout.data equal');
  });

  await test('GET /api/unit10/quiz: Vercel body matches Express lib payload', () => {
    const res = callHandler(unit10H, 'GET', { query: { kind: 'quiz' } });
    const expected = { success: true, data: worldLib.getQuiz(rootDir) };
    assert(res.statusCode === 200, 'status 200, got ' + res.statusCode);
    assert(JSON.stringify(res.body.data.questions) === JSON.stringify(expected.data.questions), 'quiz questions equal');
  });

  await test('GET /api/unit10/world: Vercel body matches Express lib payload', () => {
    const res = callHandler(unit10H, 'GET', { query: { kind: 'world' } });
    const expected = { success: true, data: worldLib.getWorld(rootDir) };
    assert(res.statusCode === 200, 'status 200, got ' + res.statusCode);
    assert(res.body.data.id === expected.data.id, 'world id');
  });

  // New with the merge: one route serving three names has to refuse a fourth rather than
  // answering with whichever getter happens to be first.
  await test('GET /api/unit10/<unknown>: 404, and the three names are the only ones', () => {
    const res = callHandler(unit10H, 'GET', { query: { kind: 'saves' } });
    assert(res.statusCode === 404, 'status 404, got ' + res.statusCode);
    assert(res.body && res.body.success === false, 'and reports failure');
    const bare = callHandler(unit10H, 'GET', { query: {} });
    assert(bare.statusCode === 404, 'a missing kind is also 404, got ' + bare.statusCode);
    ['layout', 'quiz', 'world'].forEach((k) => {
      assert(callHandler(unit10H, 'GET', { query: { kind: k } }).statusCode === 200, k + ' still answers');
    });
  });

  // The read-only refusal has to survive the merge: the admin panel on Vercel must not look
  // writable, whichever of the three names is asked for.
  await test('PUT /api/unit10/*: still refused, as three separate files did', () => {
    ['layout', 'quiz', 'world'].forEach((k) => {
      const res = callHandler(unit10H, 'PUT', { query: { kind: k } });
      assert(res.statusCode === 409, 'PUT ' + k + ' refused with 409, got ' + res.statusCode);
    });
  });

  // The admin function is async, so its response lands after the handler returns.
  const callAdmin = async (method, parts, extra) => {
    const req = Object.assign({ method, headers: {}, query: { path: parts } }, extra || {});
    // setCors reads req.headers.origin and sets response headers, so the mock has to carry
    // both. The older handlers never touched either, which is why mockRes did not have it.
    const res = Object.assign(mockRes(), { headers: {}, setHeader(k, v) { this.headers[k] = v; return this; } });
    await adminH(req, res);
    return res;
  };

  await test('GET /api/admin/host: readable by anyone, writable by nobody unsigned', async () => {
    const res = await callAdmin('GET', ['host']);
    assert(res.statusCode === 200, 'status 200, got ' + res.statusCode);
    const d = res.body && res.body.data;
    assert(d && d.writable === false, 'an unsigned caller cannot write');
    assert(d.signedIn === false && d.you === null, 'and is reported as signed out');
    assert(typeof d.gameUrl === 'string' && typeof d.hint === 'string', 'gameUrl and hint are strings');
    assert(Array.isArray(d.needsEnv), 'it says which environment variables are still missing');
  });

  await test('GET /api/admin/content: the registry, so a picker can be built from it', async () => {
    const res = await callAdmin('GET', ['content']);
    assert(res.statusCode === 200, 'status 200, got ' + res.statusCode);
    const list = res.body && res.body.data;
    assert(Array.isArray(list) && list.length >= 20, 'every registered file is listed (' + (list || []).length + ')');
    assert(list.every((c) => c.key && c.label && c.group), 'each row carries key, label and group');
    // Paths stay server-side: a picker needs a name, not the repo layout.
    assert(list.every((c) => c.rel === undefined), 'and no row leaks a file path');
  });

  // The gate. These are the assertions that stand between a public URL and anyone rewriting
  // the game's content, so they check the refusal happens before any work, not after.
  await test('PUT /api/admin/content/<key> unsigned: 401, and nothing is validated', async () => {
    const res = await callAdmin('PUT', ['content', 'quiz/unit10'], { body: { questions: [] } });
    assert(res.statusCode === 401, 'unsigned write → 401, got ' + res.statusCode);
    assert(res.body && res.body.success === false, 'success false');
    // An empty questions array would fail validation too. Getting 401 rather than 400 is the
    // proof that the identity check runs first.
    assert(/sign in/i.test(res.body.details || ''), 'and the reason is the sign-in, not the payload');
  });

  await test('PUT /api/admin/content/<key> with a junk token: still 401', async () => {
    const res = await callAdmin('PUT', ['content', 'quiz/unit10'],
      { headers: { authorization: 'Bearer not-a-real-token' }, body: {} });
    assert(res.statusCode === 401 || res.statusCode === 503,
      'a token Google will not vouch for is refused, got ' + res.statusCode);
  });

  await test('an unknown content key is 404, not a path traversed', async () => {
    const res = await callAdmin('GET', ['content', '../../package.json']);
    assert(res.statusCode === 404, 'unknown key → 404, got ' + res.statusCode);
  });

  await test('an unknown admin route is 404', async () => {
    const res = await callAdmin('GET', ['nonsense']);
    assert(res.statusCode === 404, 'unknown route → 404, got ' + res.statusCode);
  });

  // The routing bug that made every admin URL 404 on production while the function itself was
  // plainly running: req.query.path arrived empty, and nothing else was consulted. Every case
  // above passes the segments through the query, so only this one covers the other source.
  await test('routes resolve from the URL when the query carries no segments', async () => {
    const call = async (url) => {
      const req = { method: 'GET', url, headers: {}, query: {} };
      const res = Object.assign(mockRes(), { headers: {}, setHeader(k, v) { this.headers[k] = v; return this; } });
      await adminH(req, res);
      return res;
    };
    const host = await call('/api/admin/host');
    assert(host.statusCode === 200 && host.body.data.writable === false, 'host resolves from the url');
    const list = await call('/api/admin/content');
    assert(Array.isArray(list.body.data) && list.body.data.length >= 20, 'the registry resolves from the url');
    // A key with a slash in it is the case a naive split would lose. Checked with a write
    // rather than a read: a read fetches the file from the CDN, and a unit test that needs
    // the network is a unit test that fails on a train. An unsigned write is refused with
    // 401 only after the key resolves to a real entry — an unknown key 404s first — so the
    // 401 is the proof that world/topik-2 came through whole.
    const req = { method: 'PUT', url: '/api/admin/content/world/topik-2', headers: {}, query: {}, body: {} };
    const res = Object.assign(mockRes(), { headers: {}, setHeader(k, v) { this.headers[k] = v; return this; } });
    await adminH(req, res);
    assert(res.statusCode === 401, 'a multi-segment key resolves, then refuses the write: got ' + res.statusCode);
    const gone = await call('/api/admin/content/world/no-such-world');
    assert(gone.statusCode === 404, 'while an unknown one 404s, got ' + gone.statusCode);
  });

  await test('PUT on a Vercel GET handler is refused with 409', () => {
    const res = callHandler(statsH, 'PUT');
    assert(res.statusCode === 409, 'PUT /api/stats → 409, got ' + res.statusCode);
    assert(res.body && res.body.success === false, 'success false');
    assert(/read-only/i.test(res.body.details || ''), 'details mention read-only');
  });

  await test('PUT /api/admin/host is refused: it reports, it does not set', async () => {
    const res = await callAdmin('PUT', ['host']);
    assert(res.statusCode === 405, 'PUT host → 405, got ' + res.statusCode);
    assert(res.body && res.body.success === false, 'success false');
  });

  const duration = Date.now() - startTime;
  return {
    suiteName: 'Vercel vs Express GET contract (test_vercel_contract.js)',
    total: passed + failed,
    passed,
    failed,
    duration,
    testDetails
  };
}

if (require.main === module) {
  runTests().then((result) => {
    console.log('\n====================================================');
    console.log('  ' + result.suiteName);
    console.log('  Passed: ' + result.passed + '/' + result.total + ' | Duration: ' + result.duration + 'ms');
    console.log('====================================================\n');
    process.exit(result.failed > 0 ? 1 : 0);
  }).catch((err) => {
    console.error('Fatal error running test_vercel_contract:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
