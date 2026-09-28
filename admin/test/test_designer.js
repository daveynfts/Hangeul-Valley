'use strict';

/**
 * The Designer tab, end to end on the local server.
 *
 *   - Pictures: the media routes take PNG/JPEG/WebP/GIF by their bytes, refuse SVG and junk,
 *     name each file by its content, and a picture uploaded is a picture the game can serve.
 *   - The preview's view of the game: /game/<folder> serves the game's own files read-only,
 *     and nothing outside the listed folders, however the path climbs.
 *   - Saves: a bank carrying formatting and a design goes through the registry and comes back
 *     as written; formatting written for words the text no longer has is refused by name.
 *   - The Vercel half answers the same media route: readable without GitHub configured, and a
 *     write refused unsigned before anything is looked at.
 *   - The tab is wired: button, section, route, scripts, stylesheet — and its scripts parse.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');
const app = require('../server');
const { makeWriteSandbox, rmSandbox } = require('./sandbox');
const mediaLib = require('../lib/media');
const contentLib = require('../lib/content');
const rich = require('../../js/richText.js');

const repoRoot = path.resolve(__dirname, '../../');

// A real 2×2 PNG: signature, IHDR, one IDAT, IEND.
const PNG_2x2 = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000020000000208020000'
  + '00fdd49a730000001649444154789c63f8cfc0f09f81e13f03c3ff0c'
  + '0c00001ff505fbfd3a61c90000000049454e44ae426082', 'hex');

function request(port, method, pathName, body, headers) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1', port, path: pathName, method,
      headers: Object.assign({ 'Content-Type': 'application/json', 'Content-Length': payload ? Buffer.byteLength(payload) : 0 }, headers || {})
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks);
        let parsed = null;
        try { parsed = JSON.parse(raw.toString('utf8')); } catch (e) { parsed = null; }
        resolve({ status: res.statusCode, type: res.headers['content-type'] || '', body: parsed, raw });
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
  // The preview reads the game's stylesheets; the shared sandbox does not carry them.
  fs.cpSync(path.join(repoRoot, 'css'), path.join(sandbox, 'css'), { recursive: true });
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

  try {
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => { port = server.address().port; resolve(); });
    });

    // ── Pictures ─────────────────────────────────────────────────────────────
    let uploaded = null;
    await test('a checkout with no uploads lists none', async () => {
      const r = await request(port, 'GET', '/api/admin/media');
      assert(r.status === 200 && Array.isArray(r.body.data.items) && r.body.data.items.length === 0, 'empty list, got ' + JSON.stringify(r.body));
      assert(r.body.data.maxBytes === mediaLib.MAX_BYTES, 'and it says how large a picture may be');
    });

    await test('a PNG uploads, named by its content, into media/', async () => {
      const r = await request(port, 'PUT', '/api/admin/media', { name: 'Bảng 눈썹 banner.PNG', data: 'data:image/png;base64,' + PNG_2x2.toString('base64') });
      assert(r.status === 200, 'status ' + r.status + ' ' + JSON.stringify(r.body));
      uploaded = r.body.data;
      assert(/^media\/bang-banner-[0-9a-f]{12}\.png$/.test(uploaded.src), 'readable slug plus hash: ' + uploaded.src);
      assert(uploaded.type === 'image/png' && uploaded.size && uploaded.size.w === 2 && uploaded.size.h === 2, 'type and size read from the bytes');
      assert(fs.existsSync(path.join(sandbox, uploaded.src)), 'the file is on disk');
      assert(fs.readFileSync(path.join(sandbox, uploaded.src)).equals(PNG_2x2), 'byte for byte');
      assert(rich.cleanSrc(uploaded.src) === uploaded.src, 'and a design may point at it');
    });

    await test('the same picture twice is one file', async () => {
      const r = await request(port, 'POST', '/api/admin/media', { name: 'again.png', data: PNG_2x2.toString('base64') });
      assert(r.status === 200, 'status ' + r.status);
      assert(r.body.data.existed === false || r.body.data.src !== uploaded.src, 'a different name is a different file');
      const again = await request(port, 'PUT', '/api/admin/media', { name: 'Bảng 눈썹 banner.PNG', data: PNG_2x2.toString('base64') });
      assert(again.body.data.src === uploaded.src && again.body.data.existed === true, 'the same name and bytes say so');
      const list = await request(port, 'GET', '/api/admin/media');
      assert(list.body.data.items.some((m) => m.src === uploaded.src), 'the list shows it');
    });

    await test('SVG, junk and oversize pictures are refused with a reason', async () => {
      const svg = await request(port, 'PUT', '/api/admin/media', { name: 'x.svg', data: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>').toString('base64') });
      assert(svg.status === 400 && /SVG is not accepted/.test(svg.body.details), 'SVG: ' + JSON.stringify(svg.body));
      const junk = await request(port, 'PUT', '/api/admin/media', { name: 'x.png', data: Buffer.from('not a picture at all').toString('base64') });
      assert(junk.status === 400 && /not a PNG, JPEG, WebP or GIF/.test(junk.body.details), 'junk: ' + JSON.stringify(junk.body));
      const renamed = await request(port, 'PUT', '/api/admin/media', { name: 'evil.png', data: Buffer.from('<html><script>x</script></html>').toString('base64') });
      assert(renamed.status === 400, 'a name ending .png does not make it one');
      const big = Buffer.concat([PNG_2x2, Buffer.alloc(mediaLib.MAX_BYTES)]);
      const huge = await request(port, 'PUT', '/api/admin/media', { name: 'big.png', data: big.toString('base64') });
      assert(huge.status === 400 && /the limit is/.test(huge.body.details), 'oversize: ' + JSON.stringify(huge.body).slice(0, 200));
      const none = await request(port, 'PUT', '/api/admin/media', { name: 'x.png' });
      assert(none.status === 400, 'no data');
    });

    // ── The preview's view of the game ───────────────────────────────────────
    await test('the admin host tells the Designer where the game\'s files are', async () => {
      const r = await request(port, 'GET', '/api/admin-host');
      assert(r.body.data.assetBase === '/game/', 'assetBase /game/, got ' + r.body.data.assetBase);
    });

    await test('/game/ serves the game\'s stylesheets, scripts and uploads', async () => {
      const css = await request(port, 'GET', '/game/css/rich.css');
      assert(css.status === 200 && /text\/css/.test(css.type), 'rich.css ' + css.status + ' ' + css.type);
      const js = await request(port, 'GET', '/game/js/richText.js');
      assert(js.status === 200 && /javascript/.test(js.type), 'richText.js ' + js.status + ' ' + js.type);
      const pic = await request(port, 'GET', '/game/' + uploaded.src);
      assert(pic.status === 200 && /image\/png/.test(pic.type) && pic.raw.equals(PNG_2x2), 'the upload');
    });

    await test('and nothing else, however the path climbs', async () => {
      for (const p of ['/game/levels.json', '/game/admin/server.js', '/game/css/../levels.json',
        '/game/js/../../package.json', '/game/css/%2e%2e/levels.json', '/game/.git/config', '/game/']) {
        const r = await request(port, 'GET', p);
        assert(r.status === 404 || r.status === 403, p + ' → ' + r.status);
      }
    });

    // ── Saves through the registry ────────────────────────────────────────────
    const key = 'bank/unit12-textbook';
    const url = '/api/admin/content?key=' + encodeURIComponent(key);
    await test('a bank with formatting and a design saves and comes back as written', async () => {
      const open = await request(port, 'GET', url);
      const bank = open.body.data.body;
      const ex = bank.exercises[0];
      const it = ex.items[0];
      it.fmt = { phraseKo: { html: '<b>' + it.phraseKo + '</b>', size: 'lg', box: 'tip' } };
      ex.design = { theme: 'notebook', glossary: [{ ko: '눈썹', gl: 'eyebrow', vi: 'lông mày' }],
        blocks: [{ id: 'b1', kind: 'image', at: 'top', src: uploaded.src, width: 50, caption: 'x' }] };
      const r = await request(port, 'PUT', url, bank, { 'If-Match': open.body.data.version });
      assert(r.status === 200, 'status ' + r.status + ' ' + JSON.stringify(r.body).slice(0, 300));
      const disk = JSON.parse(fs.readFileSync(path.join(sandbox, 'worlds', 'unit12-textbook.json'), 'utf8'));
      assert(disk.exercises[0].items[0].fmt.phraseKo.box === 'tip', 'the formatting is in the file');
      assert(disk.exercises[0].design.blocks[0].src === uploaded.src, 'and so is the design');
      assert(disk.exercises[0].items[0].phraseKo === it.phraseKo, 'the text itself is untouched');
    });

    await test('a save changes only what was edited', async () => {
      const file = path.join(sandbox, 'worlds', 'unit13-textbook.json');
      const before = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
      const open = await request(port, 'GET', '/api/admin/content?key=' + encodeURIComponent('bank/unit13-textbook'));
      const bank = open.body.data.body;
      bank.exercises[1].fmt = { instructionEn: { color: 'blue' } };
      const r = await request(port, 'PUT', '/api/admin/content?key=' + encodeURIComponent('bank/unit13-textbook'), bank);
      assert(r.status === 200, 'status ' + r.status);
      const a = before.split('\n');
      const b = fs.readFileSync(file, 'utf8').split('\n');
      // Lines of the new file the old one did not have, counted as a multiset.
      const pool = new Map();
      a.forEach((l) => pool.set(l, (pool.get(l) || 0) + 1));
      let fresh = 0;
      b.forEach((l) => { const n = pool.get(l) || 0; if (n) pool.set(l, n - 1); else fresh++; });
      assert(b.length - a.length === 5, 'five lines added for the one setting (' + (b.length - a.length) + ')');
      assert(fresh <= 6, 'and nothing else moved — the setting and one comma (' + fresh + ' new lines)');
    });

    await test('formatting written for other words is refused, by place', async () => {
      const open = await request(port, 'GET', url);
      const bank = open.body.data.body;
      bank.exercises[0].items[0].phraseKo = 'Different words now';
      const r = await request(port, 'PUT', url, bank);
      assert(r.status === 400, 'status ' + r.status);
      assert(/Exercise 1 item 1 fmt\.phraseKo: the formatted text no longer reads the same/.test(r.body.details), r.body.details);
    });

    await test('script in a formatted field is written out harmless', async () => {
      const open = await request(port, 'GET', url);
      const bank = open.body.data.body;
      const it = bank.exercises[0].items[1];
      it.fmt = { en: { html: '<img src=x onerror=alert(1)><b onclick="x()">' + it.en + '</b><script>alert(1)</script>' } };
      const r = await request(port, 'PUT', url, bank);
      assert(r.status === 200, 'status ' + r.status + ' ' + JSON.stringify(r.body).slice(0, 200));
      const saved = r.body.data.body.exercises[0].items[1].fmt.en.html;
      assert(saved === '<b>' + rich.escText(it.en) + '</b>', 'only the bold survives: ' + saved);
    });

    // ── The Vercel half ────────────────────────────────────────────────────
    const adminH = require('../../api/admin/[...path]');
    const callAdmin = async (method, parts, extra) => {
      const req = Object.assign({ method, headers: {}, query: { path: parts } }, extra || {});
      const res = { statusCode: 200, body: null, headers: {}, status(c) { this.statusCode = c; return this; },
        json(o) { this.body = o; return this; }, end() { return this; }, setHeader(k, v) { this.headers[k] = v; return this; } };
      await adminH(req, res);
      return res;
    };
    await test('Vercel answers the media route: a list without GitHub, a refusal unsigned', async () => {
      const saved = { t: process.env.GITHUB_TOKEN, r: process.env.GITHUB_REPO };
      delete process.env.GITHUB_TOKEN; delete process.env.GITHUB_REPO;
      try {
        const list = await callAdmin('GET', ['media']);
        assert(list.statusCode === 200 && Array.isArray(list.body.data.items), 'GET → 200 list, got ' + list.statusCode);
        const put = await callAdmin('PUT', ['media'], { body: { name: 'x.png', data: PNG_2x2.toString('base64') } });
        assert(put.statusCode === 401 && /sign in/i.test(put.body.details || ''), 'unsigned PUT → 401, got ' + put.statusCode);
        const del = await callAdmin('DELETE', ['media']);
        assert(del.statusCode === 405, 'DELETE → 405, got ' + del.statusCode);
        const host = await callAdmin('GET', ['host']);
        assert(host.body.data.assetBase === '/', 'the deployed game is the site itself');
      } finally {
        if (saved.t !== undefined) process.env.GITHUB_TOKEN = saved.t;
        if (saved.r !== undefined) process.env.GITHUB_REPO = saved.r;
      }
    });

    // ── The tab ──────────────────────────────────────────────────────────────
    await test('the Designer tab is wired: button, section, route, scripts, stylesheet', async () => {
      const html = fs.readFileSync(path.join(repoRoot, 'admin', 'public', 'index.html'), 'utf8');
      const appJs = fs.readFileSync(path.join(repoRoot, 'admin', 'public', 'js', 'app.js'), 'utf8');
      ['data-tab="designer"', 'id="tab-designer"', 'id="designer-root"', 'src="js/richEditor.js"',
        'src="js/designerPreview.js"', 'src="js/designer.js"', 'href="css/designer.css"', 'id="u14-designer"']
        .forEach((s) => assert(html.indexOf(s) >= 0, 'index.html has ' + s));
      assert(/'designer':\s*\(\)\s*=>\s*window\.DesignerView/.test(appJs), 'the router knows the route');
      assert(appJs.indexOf("'/api/admin/media'") >= 0, 'and the client knows the media route');
      ['richEditor.js', 'designerPreview.js', 'designer.js'].forEach((f) => {
        execFileSync(process.execPath, ['--check', path.join(repoRoot, 'admin', 'public', 'js', f)], { stdio: 'pipe' });
      });
      const listed = contentLib.list().filter((c) => c.key.indexOf('bank/') === 0);
      assert(listed.length > 0 && listed.every((c) => c.editor && c.editor.tab === 'designer' && c.editor.unit),
        'every bank opens in the Designer from the Content tab');
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
