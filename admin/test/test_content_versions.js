'use strict';

/**
 * The local admin's content saves are made against the version that was opened.
 *
 * Every read of /api/admin/content hands back the git blob SHA of the bytes it showed, and
 * the editor sends it back as If-Match. A file changed on disk since — by a second tab, a
 * script, a `git pull` — is refused with 409 instead of being written over by a copy that
 * never saw the change. The same token as the Vercel copy, so one editor works against both.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const app = require('../server');
const { makeWriteSandbox, rmSandbox } = require('./sandbox');
const { blobSha } = require('../../api/_github');

const repoRoot = path.resolve(__dirname, '../../');

function request(port, method, pathName, body, headers) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1', port, path: pathName, method,
      headers: Object.assign({
        'Content-Type': 'application/json',
        'Content-Length': payload ? Buffer.byteLength(payload) : 0
      }, headers || {})
    }, (res) => {
      // Decoded as a stream: a large reply arrives in chunks, and a Korean character split
      // across two of them turns to replacement characters if each chunk is decoded alone.
      res.setEncoding('utf8');
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch (e) { parsed = null; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) throw new Error('Assertion failed: ' + message);
}

async function runTests() {
  const startTime = Date.now();
  let passed = 0;
  let failed = 0;
  const testDetails = [];
  const sandbox = makeWriteSandbox(repoRoot);
  app.setRootDir(sandbox);
  let server = null;
  let port = 0;

  async function test(name, fn) {
    try { await fn(); passed++; testDetails.push({ name, passed: true }); }
    catch (err) {
      failed++;
      testDetails.push({ name, passed: false, error: err.message });
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
    }
  }

  const url = '/api/admin/content?key=' + encodeURIComponent('world/topik-2');
  const file = path.join(sandbox, 'worlds', 'topik-2.json');

  try {
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => { port = server.address().port; resolve(); });
    });

    let opened = null;
    await test('a read hands back the version of the bytes it showed', async () => {
      opened = await request(port, 'GET', url);
      assert(opened.status === 200, 'status ' + opened.status);
      assert(opened.body.data.version === blobSha(fs.readFileSync(file, 'utf8')), 'version is the blob SHA of the file on disk');
    });

    await test('a save made on a copy the file has changed under is refused', async () => {
      const onDisk = JSON.parse(fs.readFileSync(file, 'utf8'));
      onDisk.titleKo = (onDisk.titleKo || '') + ' (edited elsewhere)';
      fs.writeFileSync(file, JSON.stringify(onDisk, null, 2) + '\n');
      const edit = Object.assign({}, opened.body.data.body, { source: 'from the stale editor' });
      const r = await request(port, 'PUT', url, edit, { 'If-Match': opened.body.data.version });
      assert(r.status === 409, 'status ' + r.status);
      assert(/changed since you opened it/.test(JSON.stringify(r.body)), 'says why');
      assert(JSON.parse(fs.readFileSync(file, 'utf8')).titleKo.indexOf('(edited elsewhere)') >= 0, 'the other change stands');
    });

    await test('a save on top of the current version goes through and hands back the next one', async () => {
      const reopened = await request(port, 'GET', url);
      const edit = Object.assign({}, reopened.body.data.body, { source: 'from a fresh editor' });
      const r = await request(port, 'PUT', url, edit, { 'If-Match': reopened.body.data.version });
      assert(r.status === 200, 'status ' + r.status);
      assert(r.body.data.version === blobSha(fs.readFileSync(file, 'utf8')), 'the new version matches the file written');
    });

    await test('a save with no version still works, as before', async () => {
      const cur = await request(port, 'GET', url);
      const r = await request(port, 'PUT', url, cur.body.data.body);
      assert(r.status === 200, 'status ' + r.status);
    });
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    app.setRootDir(repoRoot);
    rmSandbox(sandbox);
  }

  return { total: passed + failed, passed, failed, duration: Date.now() - startTime, details: testDetails };
}

module.exports = { runTests };

if (require.main === module) {
  runTests().then((r) => {
    console.log(`${r.passed}/${r.total} passed`);
    process.exit(r.failed ? 1 : 0);
  });
}
