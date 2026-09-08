/**
 * The Timings tab: the span rules the save path enforces, and the two things the browser
 * side needs from the server to work at all.
 *
 * A span is `at`/`end` on a transcript line, in seconds, and the 듣기 screen plays exactly
 * that stretch when the ▶ beside the line is pressed. Most are measured by
 * scripts/cassette_timings.js; the rest are dragged in by hand in this tab, which is the
 * reason these rules exist here rather than only in the offline tool. A span that is present
 * and wrong is a button that plays the wrong sentence, so the shapes a hand can produce are
 * refused at the write rather than discovered by a learner.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const app = require('../server');
const cassette = require('../lib/cassette');

const rootDir = path.resolve(__dirname, '../../');
const publicDir = path.join(__dirname, '../public');

function get(port, pathName) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: pathName, method: 'GET' }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.end();
  });
}

function assert(cond, message) {
  if (!cond) throw new Error(`Assertion failed: ${message}`);
}

/** A minimal bank the validator accepts, so each case below changes exactly one thing. */
function bank(lines) {
  return {
    unit: '10',
    tracks: [{
      n: 1, sec: '문법과 표현 1-1', secEn: 'N 중에(서)', dur: 12.4,
      src: 'audio/book/2b-u10-trk02.mp3',
      lines: lines
    }]
  };
}
const L = (ko, extra) => Object.assign({ who: 'A', ko: ko }, extra || {});

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
      testDetails.push({ name, status: 'PASS' });
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failed++;
      testDetails.push({ name, status: 'FAIL', error: err.message });
      console.log(`  ✗ ${name}\n      ${err.message}`);
    }
  }
  /** The validator must refuse `body`, and say so in a way that names the problem. */
  function refuses(body, needle) {
    let msg = '';
    try { cassette.validateCassette(body); } catch (e) { msg = e.message; }
    assert(msg, 'expected a refusal, got none');
    assert(msg.toLowerCase().includes(needle.toLowerCase()),
      `message should mention "${needle}" — got "${msg}"`);
  }

  console.log('\n── Timings: span rules ──');

  await test('a line with no span is still fine — most lines have none', () => {
    cassette.validateCassette(bank([L('한국 음식 중에서 뭘 제일 좋아해요?'), L('불고기를 제일 좋아해요.')]));
  });

  await test('a good span is accepted', () => {
    cassette.validateCassette(bank([
      L('한국 음식 중에서 뭘 제일 좋아해요?', { at: 1.2, end: 4.5 }),
      L('불고기를 제일 좋아해요.', { at: 5, end: 7.2 })
    ]));
  });

  await test('half a span is refused — at without end is an interrupted edit', () => {
    refuses(bank([L('한국 음식 중에서 뭘 제일 좋아해요?', { at: 1.2 })]), 'both at and end');
    refuses(bank([L('한국 음식 중에서 뭘 제일 좋아해요?', { end: 4.5 })]), 'both at and end');
  });

  await test('a span must be numbers of seconds', () => {
    refuses(bank([L('한국 음식', { at: '1.2', end: 4.5 })]), 'numbers of seconds');
    refuses(bank([L('한국 음식', { at: 1.2, end: NaN })]), 'numbers of seconds');
  });

  await test('a span must run forwards', () => {
    refuses(bank([L('한국 음식', { at: 4.5, end: 1.2 })]), 'must come after');
  });

  await test('a negative start is refused', () => {
    refuses(bank([L('한국 음식', { at: -0.5, end: 2 })]), 'negative');
  });

  await test('a span shorter than a quarter second is not a sentence', () => {
    refuses(bank([L('한국 음식', { at: 1, end: 1.1 })]), 'too short');
  });

  await test('a span cannot run past the end of its track', () => {
    refuses(bank([L('한국 음식', { at: 10, end: 30 })]), 'past the');
  });

  await test('a span may touch the very end of the track', () => {
    // The length is measured to the hundredth and a line can legitimately run to the last
    // sound, so the check has a tenth of slack rather than being exact.
    cassette.validateCassette(bank([L('한국 음식', { at: 10, end: 12.45 })]));
  });

  await test('spans must follow the transcript, not cross over it', () => {
    refuses(bank([
      L('첫 번째', { at: 6, end: 9 }),
      L('두 번째', { at: 1, end: 4 })
    ]), 'before line 1 ended');
  });

  await test('two lines may touch, which is what a run of dialogue does', () => {
    cassette.validateCassette(bank([
      L('첫 번째', { at: 1, end: 4 }),
      L('두 번째', { at: 4, end: 7 })
    ]));
  });

  await test('an untimed line between two timed ones does not break the ordering', () => {
    cassette.validateCassette(bank([
      L('첫 번째', { at: 1, end: 4 }),
      L('가운데'),
      L('세 번째', { at: 6, end: 9 })
    ]));
  });

  console.log('\n── Timings: what the tab needs from the server ──');

  server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  port = server.address().port;
  app.setRootDir(rootDir);

  await test('the recordings are served, so the tab can draw a waveform from them', async () => {
    const res = await get(port, '/audio-preview/book/2b-u10-trk02.mp3');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(res.body.length > 1000, 'expected an actual mp3 body');
  });

  await test('and only the recordings — /audio-preview is not a way out of audio/', async () => {
    // express.static resolves the path before serving, so the traversal is already dead; the
    // extension gate is the second lock and the one that keeps this route to its one job.
    const climb = await get(port, '/audio-preview/../../levels.json');
    assert(climb.status !== 200, `traversal should not be served, got ${climb.status}`);
    const other = await get(port, '/audio-preview/book/../../levels.json');
    assert(other.status !== 200, `traversal should not be served, got ${other.status}`);
    const notMp3 = await get(port, '/audio-preview/book/anything.json');
    assert(notMp3.status === 404, `a non-mp3 should 404, got ${notMp3.status}`);
  });

  await test('the cassette banks are readable through the content registry', async () => {
    const res = await get(port, '/api/admin/content?key=' + encodeURIComponent('cassette/unit10'));
    assert(res.status === 200, `expected 200, got ${res.status}`);
    const json = JSON.parse(res.body.toString('utf8'));
    assert(json.data && json.data.body && Array.isArray(json.data.body.tracks),
      'the tab reads the file from data.body');
  });

  await test('the tab is wired into the panel — button, section, script and route', () => {
    const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
    assert(html.includes('data-tab="timings"'), 'nav button');
    assert(html.includes('id="tab-timings"'), 'section');
    assert(html.includes('js/timings.js'), 'script tag');
    const appJs = fs.readFileSync(path.join(publicDir, 'js', 'app.js'), 'utf8');
    assert(/'timings':\s*\(\)\s*=>/.test(appJs), 'route registered');
    assert(fs.existsSync(path.join(publicDir, 'js', 'timings.js')), 'the file exists');
  });

  await test('the tab styles itself from the panel tokens, not from colours of its own', () => {
    // The first draft hardcoded a light card and reached for var(--border, …), which does not
    // exist here — so it fell back to the light default on an admin that is dark throughout.
    const css = fs.readFileSync(path.join(publicDir, 'css', 'style.css'), 'utf8');
    const block = css.slice(css.indexOf('/* ── Line timings tab'));
    assert(block.length > 200, 'the block is there');
    assert(!/var\(--border,/.test(block.replace(/\/\*[\s\S]*?\*\//g, '')), 'no --border fallback');
    assert(block.includes('var(--bg-card)') && block.includes('var(--border-card)'),
      'uses the panel tokens');
  });

  if (server) await new Promise((r) => server.close(r));

  return {
    name: 'Timings tab',
    total: passed + failed,
    passed,
    failed,
    duration: Date.now() - startTime,
    details: testDetails
  };
}

module.exports = { runTests };

if (require.main === module) {
  runTests().then((r) => {
    console.log(`\n${r.passed} passed, ${r.failed} failed`);
    process.exit(r.failed ? 1 : 0);
  });
}
