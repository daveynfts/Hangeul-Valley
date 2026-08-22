'use strict';

/**
 * Asserts Vercel serverless GET handlers return the same JSON shape (and, where
 * they share a lib, the same payload) as the local Express admin server.
 * Writes on Vercel must 409. admin-host.writable is false on Vercel, true locally.
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
  const hostH = require('../../api/admin-host');
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

  await test('GET /api/admin-host: same keys; Vercel is read-only, Express is writable', () => {
    const vercel = callHandler(hostH, 'GET');
    const local = {
      success: true,
      data: { writable: true, gameUrl: 'http://localhost:8742/', hint: '' }
    };
    assert(vercel.statusCode === 200, 'status 200');
    sameKeys(vercel.body, local, 'admin-host');
    sameKeys(vercel.body.data, local.data, 'admin-host.data');
    assert(vercel.body.data.writable === false, 'Vercel writable is false');
    assert(typeof vercel.body.data.gameUrl === 'string', 'gameUrl is a string');
    assert(typeof vercel.body.data.hint === 'string', 'hint is a string');
  });

  await test('PUT on a Vercel GET handler is refused with 409', () => {
    const res = callHandler(statsH, 'PUT');
    assert(res.statusCode === 409, 'PUT /api/stats → 409, got ' + res.statusCode);
    assert(res.body && res.body.success === false, 'success false');
    assert(/read-only/i.test(res.body.details || ''), 'details mention read-only');
  });

  await test('PUT /api/admin-host is refused', () => {
    const res = callHandler(hostH, 'PUT');
    assert(res.statusCode === 405 || res.statusCode === 409, 'PUT admin-host is not 200, got ' + res.statusCode);
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
