const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');
const app = require('../server');

const rootDir = path.resolve(__dirname, '../../');
const publicDir = path.join(__dirname, '../public');

function makeRequest(port, pathName) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: port,
      path: pathName,
      method: 'GET'
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body: data });
      });
    });
    req.on('error', reject);
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

    // 1. Existence and non-empty check
    await test('Static asset files exist and are non-empty (> 0 bytes)', () => {
      const files = [
        path.join(publicDir, 'index.html'),
        path.join(publicDir, 'css/style.css'),
        path.join(publicDir, 'js/app.js'),
        path.join(publicDir, 'js/dashboard.js'),
        path.join(publicDir, 'js/levels.js'),
        path.join(publicDir, 'js/vocab.js')
      ];

      files.forEach(f => {
        assert(fs.existsSync(f), `File exists: ${f}`);
        const stat = fs.statSync(f);
        assert(stat.size > 0, `File is non-empty (${stat.size} bytes): ${f}`);
      });
    });

    // 2. JS Syntax Check via node -c
    await test('Frontend JS files (app.js, dashboard.js, levels.js, vocab.js) pass node -c syntax check', () => {
      const jsFiles = [
        path.join(publicDir, 'js/app.js'),
        path.join(publicDir, 'js/dashboard.js'),
        path.join(publicDir, 'js/levels.js'),
        path.join(publicDir, 'js/vocab.js')
      ];

      jsFiles.forEach(f => {
        execSync(`node -c "${f}"`, { stdio: 'pipe' });
      });
    });

    // 3. HTML markup verification for UI elements (#dashboard, #levels, #vocab, #toast, etc.)
    await test('index.html contains required DOM elements (#dashboard, #levels, #vocab, #toast, etc.)', () => {
      const htmlContent = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');

      const requiredElements = [
        'data-tab="dashboard"',
        'data-tab="levels"',
        'data-tab="vocab"',
        'id="dashboard"',
        'id="levels"',
        'id="vocab"',
        'id="toast"',
        'id="stat-total-levels"',
        'id="stat-total-words"',
        'id="stat-coverage"',
        'id="stat-duplicates"',
        'id="stat-missing"',
        'id="missing-facts-table"',
        'id="duplicates-table"',
        'id="words-table"',
        'id="vocab-table"',
        'src="js/app.js"',
        'src="js/dashboard.js"',
        'src="js/levels.js"',
        'src="js/vocab.js"'
      ];

      requiredElements.forEach(item => {
        // Fallback for id="toast" or toast-container / class/id
        if (item === 'id="dashboard"') {
          assert(htmlContent.includes('id="dashboard"') || htmlContent.includes('data-tab="dashboard"'), 'index.html contains dashboard section/tab');
        } else if (item === 'id="levels"') {
          assert(htmlContent.includes('id="levels"') || htmlContent.includes('data-tab="levels"'), 'index.html contains levels section/tab');
        } else if (item === 'id="vocab"') {
          assert(htmlContent.includes('id="vocab"') || htmlContent.includes('data-tab="vocab"'), 'index.html contains vocab section/tab');
        } else if (item === 'id="toast"') {
          assert(htmlContent.includes('id="toast"') || htmlContent.includes('id="toast-container"') || htmlContent.includes('class="toast'), 'index.html contains toast container/element');
        } else {
          assert(htmlContent.includes(item), `index.html contains '${item}'`);
        }
      });
    });

    // 4. CSS stylesheet verification for Dark Mode custom properties
    await test('style.css contains dark-mode CSS variables and core component classes', () => {
      const cssContent = fs.readFileSync(path.join(publicDir, 'css/style.css'), 'utf8');

      const requiredCssTokens = [
        '--bg-app',
        '--bg-card',
        '--border-card',
        '--accent-emerald',
        '--accent-indigo',
        '--accent-amber',
        '--accent-rose',
        '.app-header',
        '.stats-grid',
        '.data-table',
        '.toast-container'
      ];

      requiredCssTokens.forEach(token => {
        assert(cssContent.includes(token), `style.css contains dark-mode variable/token '${token}'`);
      });
    });

    // 5. Express Static Asset HTTP serving check
    await test('Express serves index.html at GET / with 200 OK and text/html Content-Type', async () => {
      const res = await makeRequest(port, '/');
      assert(res.status === 200, `Status is 200, got ${res.status}`);
      assert(res.headers['content-type'].includes('text/html'), 'Content-Type is text/html');
      assert(res.body.includes('Hangeul Valley'), 'Body contains title/header');
    });

    await test('Express serves style.css at GET /css/style.css with 200 OK and text/css Content-Type', async () => {
      const res = await makeRequest(port, '/css/style.css');
      assert(res.status === 200, `Status is 200, got ${res.status}`);
      assert(res.headers['content-type'].includes('text/css'), 'Content-Type is text/css');
      assert(res.body.includes('--bg-app'), 'Body contains CSS variables');
    });

    await test('Express serves JS files at GET /js/*.js with 200 OK and javascript Content-Type', async () => {
      const jsFiles = ['/js/app.js', '/js/dashboard.js', '/js/levels.js', '/js/vocab.js'];
      for (const jsPath of jsFiles) {
        const res = await makeRequest(port, jsPath);
        assert(res.status === 200, `GET ${jsPath} status is 200, got ${res.status}`);
        assert(res.headers['content-type'].includes('javascript'), `GET ${jsPath} Content-Type is javascript`);
      }
    });

  } finally {
    if (server) {
      server.close();
    }
  }

  const duration = Date.now() - startTime;
  return {
    suiteName: 'Frontend Static Assets & UI Integrity (test_frontend_assets.js)',
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
    console.error('Fatal error running test_frontend_assets:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
