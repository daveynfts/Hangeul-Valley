/**
 * admin/test/test_cors_origin.js — who is allowed to call this server.
 *
 * The panel has no authentication and its PUT/POST/DELETE routes rewrite levels.json, the
 * world packs and the skins catalog. It used to run `cors()` with no options, which answers
 * every preflight with `Access-Control-Allow-Origin: *`, and `app.listen(PORT)` with no
 * host, which binds every interface. Together that meant: while the panel was open, any
 * page in the operator's browser could drive those writes, and any host on the same network
 * could reach them directly.
 *
 * These tests pin the fix. They assert on response *headers*, because that is the whole
 * mechanism — a cross-origin write is stopped by the browser refusing to send it, not by
 * the route returning an error.
 */

const http = require('http');
const app = require('../server');

function request(port, method, pathName, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: pathName, method, headers }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, raw: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

function preflight(port, origin, method = 'PUT') {
  return request(port, 'OPTIONS', '/api/levels', {
    Origin: origin,
    'Access-Control-Request-Method': method,
    'Access-Control-Request-Headers': 'content-type'
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function runTests() {
  const startTime = Date.now();
  let passed = 0;
  let failed = 0;
  const testDetails = [];

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

    const HOSTILE = 'https://evil.example';

    await test('a foreign origin gets no Access-Control-Allow-Origin on preflight', async () => {
      const res = await preflight(port, HOSTILE);
      assert(!res.headers['access-control-allow-origin'],
        'expected no ACAO header, got ' + res.headers['access-control-allow-origin']);
    });

    await test('and no Allow-Methods, so the browser never sends the write', async () => {
      const res = await preflight(port, HOSTILE);
      assert(!res.headers['access-control-allow-methods'],
        'expected no Allow-Methods, got ' + res.headers['access-control-allow-methods']);
    });

    for (const method of ['POST', 'DELETE', 'PATCH']) {
      await test(`a foreign origin cannot preflight ${method} either`, async () => {
        const res = await preflight(port, HOSTILE, method);
        assert(!res.headers['access-control-allow-origin'], `${method} preflight leaked an ACAO header`);
      });
    }

    await test('a foreign origin cannot read GET responses either', async () => {
      const res = await request(port, 'GET', '/api/stats', { Origin: HOSTILE });
      assert(!res.headers['access-control-allow-origin'],
        'GET leaked ACAO to ' + HOSTILE + ': ' + res.headers['access-control-allow-origin']);
    });

    await test('a look-alike hostname is not treated as localhost', async () => {
      for (const origin of ['https://localhost.evil.example', 'https://notlocalhost',
                            'https://127.0.0.1.evil.example', 'http://evil.example#localhost']) {
        const res = await preflight(port, origin);
        assert(!res.headers['access-control-allow-origin'], origin + ' was allowed');
      }
    });

    await test('the panel\'s own origin is still allowed', async () => {
      const res = await preflight(port, `http://localhost:${port}`);
      assert(res.headers['access-control-allow-origin'] === `http://localhost:${port}`,
        'panel origin was refused: ' + res.headers['access-control-allow-origin']);
      assert((res.headers['access-control-allow-methods'] || '').indexOf('PUT') >= 0,
        'panel cannot preflight PUT');
    });

    await test('the game\'s desktop origin is allowed, so it can read the curriculum', async () => {
      for (const origin of ['http://127.0.0.1:8742', 'http://localhost:8742', 'http://[::1]:3000']) {
        const res = await preflight(port, origin, 'GET');
        assert(res.headers['access-control-allow-origin'] === origin, origin + ' was refused');
      }
    });

    await test('a request with no Origin header still works (curl, same-origin fetch)', async () => {
      const res = await request(port, 'GET', '/api/stats');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
    });

    await test('listening on an explicit host is what server.js does when run directly', async () => {
      const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'server.js'), 'utf8');
      assert(/app\.listen\(\s*PORT\s*,\s*HOST\s*,/.test(src),
        'app.listen must pass a host, or Node binds every interface');
      assert(/HOST\s*=\s*process\.env\.HOST\s*\|\|\s*'127\.0\.0\.1'/.test(src),
        'the default host must be loopback');
    });
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
  }

  const duration = Date.now() - startTime;
  return {
    suiteName: 'CORS & bind hardening (test_cors_origin.js)',
    total: passed + failed,
    passed,
    failed,
    duration,
    testDetails
  };
}

if (require.main === module) {
  runTests().then((result) => {
    console.log(`\n====================================================`);
    console.log(`  ${result.suiteName}`);
    console.log(`  Passed: ${result.passed}/${result.total} | Duration: ${result.duration}ms`);
    console.log(`====================================================\n`);
    process.exit(result.failed > 0 ? 1 : 0);
  }).catch((err) => {
    console.error('Fatal error running test_cors_origin:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
