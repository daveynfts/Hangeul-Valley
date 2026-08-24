/**
 * tests/test_cloud_load_state.js — what has to happen to in-memory state when a save is
 * loaded over a session that is already running, plus the timestamp rules the cloud
 * endpoint applies to it.
 *
 * Loading a save is not the same as starting from one. applySave() replaces every field it
 * owns, but three things escaped that:
 *
 *   - harvestCounts is a module-level Map and was accumulated into rather than replaced, so
 *     a guest session's counts survived a sign-in for every word the incoming save did not
 *     mention. Harvest payouts are 10 * 0.85^prev, so the leak quietly suppressed them.
 *   - plotSave was replaced but the farm was not redrawn. _restorePlots() runs once, at
 *     scene creation, and collectSave() reads the live scene rather than plotSave — so the
 *     pre-load farm was written straight back over the copy that had just been loaded.
 *   - api/save.js took the client's updatedAt at face value. A device with a clock set years
 *     ahead wrote a stamp no honest save could beat; every later PUT 409'd and every load
 *     pulled that stale copy back down. One bad clock pinned the account for good.
 *
 * Run: node tests/test_cloud_load_state.js
 */

'use strict';

const path = require('path');
const vm = require('vm');

const { readGameSource } = require('../scripts/gameSource');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}
function eq(actual, expected, msg) {
  assert(actual === expected, msg + ' (got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected) + ')');
}

// ── Sandbox ──────────────────────────────────────────────────────────────────
// The whole game source, same as tests/test_m2_harness.js. applySave and collectSave sit on
// top of most of the module graph, so extracting slices the way the smaller suites do would
// mean rebuilding half of it by hand.

function chainable(kind) {
  const o = { _kind: kind, destroyed: false, texture: null, tint: null, alpha: 1, x: 0, y: 0 };
  const self = new Proxy(o, {
    get(t, k) {
      if (k in t) return t[k];
      if (typeof k !== 'string') return undefined;
      if (k === 'destroy') return () => { t.destroyed = true; };
      if (k === 'setTexture') return (v) => { t.texture = v; return self; };
      if (k === 'setTint') return (v) => { t.tint = v; return self; };
      if (k === 'clearTint') return () => { t.tint = null; return self; };
      if (k === 'setAlpha') return (v) => { t.alpha = v; return self; };
      return () => self;                       // every other Phaser setter just chains
    },
    set(t, k, v) { t[k] = v; return true; }
  });
  return self;
}

function makeSandbox() {
  const els = {};
  const el = () => {
    const classes = new Set();
    return {
      style: { cssText: '' }, children: [], innerHTML: '', textContent: '', disabled: false,
      classList: {
        add: (...c) => c.forEach(x => classes.add(x)),
        remove: (...c) => c.forEach(x => classes.delete(x)),
        contains: (c) => classes.has(c),
        toggle: (c, f) => { const on = f === undefined ? !classes.has(c) : !!f; on ? classes.add(c) : classes.delete(c); return on; }
      },
      appendChild(c) { this.children.push(c); return c; },
      addEventListener() {}, setAttribute() {}, getAttribute() { return null; },
      hasAttribute() { return false; }, removeAttribute() {},
      querySelector() { return null; }, querySelectorAll() { return []; },
      remove() {}, focus() {}, blur() {}, click() {}
    };
  };
  const doc = {
    getElementById: (id) => els[id] || (els[id] = el()),
    createElement: () => el(),
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {},
    body: el(), documentElement: el(), head: el()
  };
  const storage = () => {
    const m = new Map();
    return {
      getItem: k => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => m.set(k, String(v)),
      removeItem: k => m.delete(k),
      clear: () => m.clear(),
      get length() { return m.size; }
    };
  };
  const scene = { Scene: class {} };
  const sb = {
    console, IS_NODE: true,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    document: doc, localStorage: storage(), sessionStorage: storage(),
    fetch: () => Promise.reject(new Error('offline in tests')),
    navigator: { userAgent: 'node', language: 'en' },
    location: { href: 'http://localhost/', origin: 'http://localhost' },
    performance: { now: () => 0 },
    Image: class {}, Audio: class { play() {} pause() {} },
    atob: s => Buffer.from(s, 'base64').toString('binary'),
    btoa: s => Buffer.from(s, 'binary').toString('base64'),
    TextDecoder,
    addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    // Enough Phaser for the scene classes to define themselves. Nothing here is exercised
    // beyond the plot methods, which get their own hand-built `this` below.
    Phaser: {
      AUTO: 0, Scene: scene.Scene, Game: class {}, Scale: { RESIZE: 0, CENTER_BOTH: 0 },
      Math: { Between: a => a, FloatBetween: a => a, Clamp: (v, a, b) => Math.min(b, Math.max(a, v)), Distance: { Between: () => 0 }, RND: { pick: a => a && a[0] } },
      Geom: { Rectangle: class {}, Circle: class {} },
      Display: { Color: { HexStringToColor: () => ({ color: 0 }), GetColor: () => 0, Interpolate: { ColorWithColor: () => ({ r: 0, g: 0, b: 0 }) } } },
      Utils: { Array: { Shuffle: a => a, GetRandom: a => a && a[0] } },
      Input: { Keyboard: { KeyCodes: new Proxy({}, { get: () => 0 }), JustDown: () => false } },
      Textures: { FilterMode: { NEAREST: 1 } },
      GameObjects: { Graphics: class {}, Container: class {}, Sprite: class {}, Image: class {}, Text: class {} },
      BlendModes: { NORMAL: 0, ADD: 1 }, Tilemaps: {}, Curves: {}, Structs: {}
    }
  };
  sb.window = sb;
  sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(readGameSource(), sb, { filename: 'game.js' });
  return sb;
}

const sb = makeSandbox();
const R = (expr) => vm.runInContext(expr, sb);

// levelsData normally arrives by fetch, which the sandbox refuses. _findWord scans it to
// resolve a saved plot back to its word, so it has to hold the real content.
sb.__levelsJson = require(path.join('..', 'levels.json'));
R(`levelsData = __levelsJson;`);

// A farm scene with just enough of Phaser hanging off it for the plot methods to run.
function fakeFarmScene(plotDefs) {
  const FarmScene = R('FarmScene');
  const s = Object.create(FarmScene.prototype);
  s.add = { image: () => chainable('image'), text: () => chainable('text'), graphics: () => chainable('graphics') };
  s.tweens = { add: () => chainable('tween') };
  s.textures = { exists: () => false };
  s.shadows = null;
  s.plots = plotDefs.map((d, i) => Object.assign({
    index: i, x: i * 60, y: 100, active: true,
    tile: chainable('tile'), shad: chainable('shad'),
    plant: null, glow: null, hintLabel: null, cropShadow: null,
    sState: '', ko: null, word: null, plantedAt: 0, reviewModality: null
  }, d));
  return s;
}

// ── 1. harvestCounts is replaced, not merged ─────────────────────────────────
console.log('\n--- 1. harvestCounts is replaced, not merged ---');

R(`harvestCounts.clear(); harvestCounts.set('사과', 12); harvestCounts.set('학교', 4);`);
R(`sceneRef = null;`);
R(`applySave({ v: 9, currencies: { coins: 10, gems: 0, honor: 0 }, unlockedLevels: [0],
              harvests: { '학교': 1 }, srs: {}, plots: [], updatedAt: 1 })`);

eq(R(`harvestCounts.get('사과')`), undefined,
  'a word the loaded save never mentions is gone, not carried over from the previous profile');
eq(R(`harvestCounts.get('학교')`), 1, 'and a word it does mention takes the loaded value');
eq(R(`harvestCounts.size`), 1, 'nothing else survives the load');

// The leak mattered because of this curve: a stale count of 12 pays 1 coin where a fresh
// word pays 10, and the +10 Honor bonus fires on exactly the tenth harvest.
const reward = (prev) => Math.max(1, Math.floor(10 * Math.pow(0.85, prev)));
eq(reward(0), 10, 'a first harvest pays 10 coins');
eq(reward(12), 1, 'and a twelfth pays 1 — what a leaked count silently did to the payout');

// ── 2. A loaded save's plots reach the live farm ──────────────────────────────
console.log('\n--- 2. A loaded save\'s plots reach the live farm ---');

// 2a. applySave hands off to the scene, and only after plotSave has been replaced.
let handoff = null;
R(`sceneRef = { plots: [], reloadPlotsFromSave: null, refreshPlotAccess: null };`);
sb.__spy = () => { handoff = R(`JSON.stringify(plotSave)`); };
R(`sceneRef.reloadPlotsFromSave = __spy;`);
R(`applySave({ v: 9, currencies: { coins: 1, gems: 0, honor: 0 }, unlockedLevels: [0],
              harvests: {}, srs: {}, plots: [{ i: 5, ko: '바다', sState: '4', plantedAt: 999 }], updatedAt: 2 })`);
assert(handoff !== null, 'applySave calls reloadPlotsFromSave on the live scene');
assert(handoff !== null && handoff.includes('바다'),
  'and by then plotSave already holds the loaded plots, not the pre-load ones');

// 2b. The scene method itself: the old crop goes, the loaded one lands.
const words = R(`levelsData[0].words.slice(0, 3).map(w => w.ko)`);
const [wA, wB] = words;
R(`plotSave = ${JSON.stringify([{ i: 1, ko: wB, sState: '3', plantedAt: 777 }])};`);
R(`plantedWords.clear(); plantedWords.add(${JSON.stringify(wA)});`);

const scene = fakeFarmScene([
  { ko: wA, sState: '4', plantedAt: 111, reviewModality: 'listen', plant: chainable('oldPlant'), cropShadow: chainable('oldShadow') },
  {},
  {}
]);
scene.reloadPlotsFromSave();

eq(scene.plots[0].ko, null, 'the crop that was on plot 0 before the load is cleared');
eq(scene.plots[0].plantedAt, 0, 'its plant time is cleared with it');
eq(scene.plots[0].reviewModality, null,
  'and so is its review modality — the next crop here must not inherit which skill was being tested');
assert(scene.plots[0].cropShadow === null, 'its drop shadow is released rather than orphaned on an empty tile');
eq(scene.plots[1].ko, wB, 'the loaded save\'s crop is planted on the plot it belongs to');
eq(scene.plots[1].plantedAt, 777, 'carrying its saved plant time');
eq(R(`plantedWords.has(${JSON.stringify(wA)})`), false, 'plantedWords drops the crop that is gone');
eq(R(`plantedWords.has(${JSON.stringify(wB)})`), true, 'and picks up the one that arrived');

// 2c. The regression itself: what the next write puts back.
R(`sceneRef = null;`);
R(`plotSave = ${JSON.stringify([{ i: 0, ko: wA, sState: '3', plantedAt: 111 }])};`);
const live = fakeFarmScene([{}, {}, {}, {}, {}, {}]);
sb.__scene = live;
R(`sceneRef = __scene;`);
R(`applySave({ v: 9, currencies: { coins: 1, gems: 0, honor: 0 }, unlockedLevels: [0],
              harvests: {}, srs: {},
              plots: [{ i: 3, ko: ${JSON.stringify(wB)}, sState: '3', plantedAt: 888 }], updatedAt: 3 })`);
const written = JSON.parse(R(`JSON.stringify(collectSave().plots)`));
eq(written.length, 1, 'the next save writes exactly the plots the loaded save had');
eq(written[0] && written[0].ko, wB, 'and it is the loaded crop, not the one the farm was showing');
assert(!written.some(p => p.ko === wA),
  'the pre-load farm is not written back over the copy that was just loaded — the bug this guards');

// ── 3. The shop quiz gate asks as many questions as it built ──────────────────
console.log('\n--- 3. The shop quiz gate asks as many questions as it built ---');

const realLevels = R(`levelsData`);
R(`levelsData = [{ level: 1, name: 'tiny', words: [{ ko: '가', en: 'a' }, { ko: '나', en: 'b' }] }];
   unlockedLevels = [0]; playerCurrencies = { coins: 9999, gems: 0, honor: 0 }; playerLocked = false;`);
R(`startShopQuizGate(0)`);
eq(R(`shopQuizState.questions.length`), 2, 'a two-word pool yields two questions, not three');
eq(R(`document.getElementById('sq-step-indicator').textContent`), 'Question 1 of 2',
  'and the indicator says two rather than a hardcoded three');
R(`answerShopQuiz(true); answerShopQuiz(true);`);
eq(R(`document.getElementById('shop-quiz-overlay').classList.contains('visible')`), false,
  'answering every question closes the gate');
eq(R(`playerLocked`), false, 'and releases the player — a hardcoded 3 left them locked here');

R(`levelsData = []; playerLocked = false;
   document.getElementById('shop-quiz-overlay').classList.remove('visible');`);
R(`startShopQuizGate(0)`);
eq(R(`document.getElementById('shop-quiz-overlay').classList.contains('visible')`), false,
  'with no vocabulary loaded the gate does not open at all');
eq(R(`playerLocked`), false, 'so there is no empty overlay to be trapped behind');
sb.__levels = realLevels;
R(`levelsData = __levels;`);

// ── 4. api/_stamp.js timestamp rules ─────────────────────────────────────────
console.log('\n--- 4. api/_stamp.js timestamp rules ---');

// api/_stamp.js, not api/save.js: the handler requires the AWS SDK on its first line, and the
// CI `test` job has no npm install step, so requiring it here failed with MODULE_NOT_FOUND on
// CI while passing locally. Anything tests/ pulls in has to be dependency-free.
const { stampSave, trustedStamp, CLOCK_SKEW_MAX } = require(path.join('..', 'api', '_stamp.js'));
const NOW = 1_700_000_000_000;

eq(stampSave(NOW - 5000, NOW), NOW - 5000, 'an ordinary client stamp is written as sent');
eq(stampSave(NOW + 1000, NOW), NOW + 1000, 'a stamp inside the skew window is trusted');
eq(stampSave(NOW + CLOCK_SKEW_MAX + 1, NOW), NOW, 'a stamp past the window is replaced by server time');
eq(stampSave(NOW + 4_000_000_000_000, NOW), NOW, 'a clock set years ahead cannot park the save in the future');
eq(stampSave(undefined, NOW), NOW, 'a missing stamp becomes server time');
eq(stampSave(NaN, NOW), NOW, 'NaN is not a stamp');
eq(stampSave(Infinity, NOW), NOW, 'neither is Infinity');
eq(stampSave(-1, NOW), NOW, 'nor a negative');
eq(stampSave('123', NOW), NOW, 'nor a string that looks like one');

eq(trustedStamp(NOW - 5000, NOW), NOW - 5000, 'the staleness check trusts a plausible stored stamp');
eq(trustedStamp(NOW + 4_000_000_000_000, NOW), 0,
  'but scores an impossible one at zero, so it cannot outrank the save being written');
eq(trustedStamp(undefined, NOW), 0, 'a save with no stamp blocks nothing');
eq(trustedStamp(null, NOW), 0, 'and neither does a null one');

// The whole point of scoring it zero: an account already holding a future stamp has to be
// able to accept the next honest write. Clamping to `now` instead would keep rejecting it.
const pinned = NOW + 4_000_000_000_000;
const incoming = stampSave(NOW - 1000, NOW);
assert(!(trustedStamp(pinned, NOW) > incoming),
  'an account pinned by an old future-dated write accepts the next real save');
assert(stampSave(pinned, NOW) > incoming,
  'whereas clamping the stored stamp to server time would have kept 409ing it — why the two rules differ');

// And the guard it must not break: a genuinely newer save still wins.
assert(trustedStamp(NOW, NOW) > stampSave(NOW - 60_000, NOW),
  'a stale PUT is still refused — the backwards-move guard is intact');

// ── 5. The Google JWT payload is UTF-8 ───────────────────────────────────────
console.log('\n--- 5. The Google JWT payload is UTF-8 ---');

// atob yields one byte per character, so a name outside ASCII — which for a Korean-learning
// app is most of them — used to arrive as mojibake.
const claims = { sub: '1', email: '', name: '김민준', picture: '' };
const b64url = Buffer.from(JSON.stringify(claims), 'utf8').toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
sb.__token = 'header.' + b64url + '.sig';
const decoded = R(`decodeJwtPayload(__token)`);
eq(decoded.name, '김민준', 'a Korean display name survives the decode');
eq(R(`decodeJwtPayload(__token).sub`), '1', 'and the rest of the payload is unharmed');

// The name is what the auth chip falls back to when a Google profile carries no email.
R(`setGoogleSession(__token, { email: '', name: '김민준', picture: '' }); renderAuthUI();`);
assert(R(`document.getElementById('hud-auth-status').innerHTML`).includes('김민준'),
  'so the signed-in chip shows it rather than replacement characters');
R(`setGoogleSession('', null);`);

// ── 6. Signing in on a second machine must not upload a blank game ───────────
// The whole point of cloud save is "open another browser, sign in, get everything back", and
// it did the opposite. A browser that has never seen the account writes hv_save_v2 within six
// seconds of loading the page — before any sign-in, measured on production — so that save is
// always the newest one in existence. syncCloudSave compared timestamps alone, so signing in
// pushed 85 gold and no review history over the player's real save.
//
// The rule now: a newer local save only outranks the cloud when it also holds more earned
// progress. saveProgressWeight counts only fields that never go down — SRS records, the
// attempt log, harvests, trophies, levels beyond the first, and the rank counters. Gold is
// deliberately not among them, because gold is spent.
console.log('\n--- 6. Signing in on a second machine ---');
const CNOW = 1700000000000;
const FRESH = (at) => ({ gold: 85, srs: {}, attempts: [], harvests: {}, unlockedLevels: [0],
  unlockedTrophies: [], playerRank: { xp: 0, asked: 0, sessions: 0 }, updatedAt: at });
const RICH = (at) => ({ gold: 8400, srs: { a: 1, b: 1, c: 1 }, attempts: [1, 2, 3, 4],
  harvests: { a: 9 }, unlockedLevels: [0, 1, 2], unlockedTrophies: ['t'],
  playerRank: { xp: 920, asked: 640, sessions: 31 }, updatedAt: at });

const weight = (s) => R('saveProgressWeight(' + JSON.stringify(s) + ')');
assert(weight(RICH(CNOW)) > weight(FRESH(CNOW)), 'a save with history outweighs a fresh one');
eq(weight(FRESH(CNOW)), 0, 'a fresh save weighs nothing');
assert(weight(null) < 0, 'and no save at all is lighter still, so any real save beats it');
// Gold must not count, or spending it would look like losing progress.
const spent = RICH(CNOW);
spent.gold = 0;
eq(weight(spent), weight(RICH(CNOW)), 'spending every coin does not reduce the weight');

// Drive syncCloudSave itself, with the network and the writers stubbed. Everything stubbed
// here is put back afterwards: these are script-scoped bindings shared by the whole file,
// and a section that leaves them replaced silently breaks every section after it.
R(`__realSync = { applySave, pushCloudSave, peekLocalSave, cloudSaveRequest,
                 collectSave, getGoogleToken };`);
async function reconcile(local, remote) {
  sb.__local = local;
  sb.__remote = remote;
  sb.__acts = [];
  R(`peekLocalSave = () => __local;
     cloudSaveRequest = async () => ({ status: 200, json: { user: { sub: 'u' }, data: __remote } });
     applySave = (d) => { __acts.push('pull:' + d.gold); return true; };
     pushCloudSave = async (d) => { __acts.push('push:' + d.gold); return { ok: true }; };
     collectSave = () => (__local || { gold: 85, updatedAt: 1 });
     getGoogleToken = () => 'tok';`);
  await R('syncCloudSave()');
  return sb.__acts.join(',');
}

(async () => {
  eq(await reconcile(null, RICH(CNOW - 86400000)), 'pull:8400',
    'a brand-new browser with nothing saved pulls the cloud save');
  eq(await reconcile(FRESH(CNOW), RICH(CNOW - 86400000)), 'pull:8400',
    'and so does one that auto-saved a blank game first — newer but emptier does not win');
  eq(await reconcile(RICH(CNOW), RICH(CNOW - 86400000)), 'push:8400',
    'genuine offline progress still uploads');
  eq(await reconcile(RICH(CNOW), null), 'push:8400',
    'and an empty cloud still gets seeded from this device');
  eq(await reconcile(FRESH(CNOW - 86400000), RICH(CNOW)), 'pull:8400',
    'a newer cloud save wins on the timestamp alone, as before');

  R(`applySave = __realSync.applySave; pushCloudSave = __realSync.pushCloudSave;
     peekLocalSave = __realSync.peekLocalSave; cloudSaveRequest = __realSync.cloudSaveRequest;
     collectSave = __realSync.collectSave; getGoogleToken = __realSync.getGoogleToken;`);

  // ── 7. The practice log ───────────────────────────────────────────────────
  // attemptLog answers "how is this word going" and cannot answer "have I done this
  // exercise, and how many times": it is keyed by headword, capped at the last 500 answers,
  // and knows nothing about tracks or dictation lines. Nothing recorded any of that before —
  // workbookState was never saved at all, and the dictation screen's score reset every time
  // it opened — so this is the log that makes "thành quả học" a number.
  console.log('\n--- 7. The practice log ---');
  R('practiceLog = {};');
  eq(R(`practiceKey('wb', 'unit14-textbook', 'u14sgk-read-1')`), 'wb:unit14-textbook:u14sgk-read-1',
    'a workbook key names its bank and its exercise');
  eq(R(`practiceKey('trk', '2b-unit-14', 44)`), 'trk:2b-unit-14:44', 'a track key names its unit and number');
  eq(R(`practiceKey('nope', 'a', 'b')`), '', 'an unknown kind makes no key');
  eq(R(`practiceKey('wb', '', 'x')`), '', 'and neither does a missing half');
  // The key reaches a save that is uploaded and read back, so it is built from a safe
  // alphabet rather than from whatever the content happened to name an exercise. Dots stay —
  // an exercise id may legitimately carry one — but a colon must not survive, because
  // practiceSummary reads the kind back off the first one.
  const dirty = R(`practiceKey('wb', 'a/b', 'c d:e')`);
  eq(dirty, 'wb:ab:cde', 'slashes and spaces are stripped');
  eq(dirty.split(':').length, 3, 'and a colon in the content cannot add a field to the key');
  eq(dirty.slice(0, dirty.indexOf(':')), 'wb', 'so the kind still reads back off the front');

  R(`recordPractice(practiceKey('wb', 'bk', 'ex1'), 7, 10, 1000);`);
  R(`recordPractice(practiceKey('wb', 'bk', 'ex1'), 9, 10, 2000);`);
  const e1 = R(`practiceEntry(practiceKey('wb', 'bk', 'ex1'))`);
  eq(e1.n, 2, 'two sittings are counted as two');
  eq(e1.ok, 16, 'and the marks accumulate across them');
  eq(e1.of, 20, 'against the total that was on offer');
  eq(e1.at, 2000, 'with the last time kept');
  // Lifetime accuracy, not the last attempt: a learner improving from 7/10 to 9/10 should
  // not see 90% and think they have always been at 90%.
  eq(Math.round((e1.ok / e1.of) * 100), 80, 'so the readout is lifetime accuracy (80%)');

  // A track has no score. It must count without inventing one.
  R(`recordPractice(practiceKey('trk', 'u14', 44));`);
  R(`recordPractice(practiceKey('trk', 'u14', 44));`);
  R(`recordPractice(practiceKey('trk', 'u14', 44));`);
  const t1 = R(`practiceEntry(practiceKey('trk', 'u14', 44))`);
  eq(t1.n, 3, 'three listens are three');
  eq(t1.of, 0, 'and no score is fabricated for them');

  R(`recordPractice(practiceKey('dic', 'u14', 12), 1, 1);`);
  R(`recordPractice(practiceKey('dic', 'u14', 13), 0, 1);`);
  const sum = R('practiceSummary()');
  eq(sum.wb.n, 2, 'the summary counts exercise sittings');
  eq(sum.wb.items, 1, 'across the pages they were on');
  eq(sum.wb.pct, 80, 'with lifetime accuracy');
  eq(sum.trk.n, 3, 'listens are counted separately');
  eq(sum.trk.pct, null, 'and carry no percentage, because there is nothing to be right about');
  eq(sum.dic.n, 2, 'dictation lines too');
  eq(sum.dic.items, 2, 'one entry per sentence');
  eq(sum.dic.pct, 50, 'one right out of two');

  // A bad key must not create a phantom entry.
  const before = R('Object.keys(practiceLog).length');
  R(`recordPractice('', 1, 1);`);
  eq(R('Object.keys(practiceLog).length'), before, 'an empty key records nothing');
  // ok is clamped to of, so a miscounted caller cannot push accuracy over 100%.
  R(`recordPractice(practiceKey('wb', 'bk', 'ex2'), 99, 4);`);
  eq(R(`practiceEntry(practiceKey('wb', 'bk', 'ex2'))`).ok, 4, 'more right than there were questions is clamped');

  // It has to survive the round trip, or the count resets every time the game is closed.
  R(`practiceLog = {}; recordPractice(practiceKey('wb', 'bk', 'ex9'), 3, 4, 500);`);
  const round = R('migrateSaveData(JSON.parse(JSON.stringify(collectSave())))');
  eq(round.v, 10, 'collectSave writes v10');
  // The round trip. collectSave has been replaced by a stub in section 6, so this asserts on
  // the shipped source for the write side and drives applySave for the read side — the two
  // halves that decide whether a count survives closing the game.
  const saveSrc = require('fs').readFileSync(
    require('path').join(__dirname, '..', 'js', 'systems', 'save.js'), 'utf8');
  assert(/practice: practiceLog,/.test(saveSrc), 'collectSave writes the practice log into the save');
  assert(/practiceLog = \(migrated\.practice/.test(saveSrc), 'and applySave reads it back out');

  sb.__round = { v: 10, practice: { 'wb:bk:ex9': { n: 4, ok: 11, of: 16, at: 500 } } };
  R('applySave(__round);');
  eq(R(`practiceEntry('wb:bk:ex9') && practiceEntry('wb:bk:ex9').n`), 4,
    'a save loaded from the cloud brings its counts with it');
  // A save from before v10 has no log at all; that must land as empty rather than as undefined,
  // or every read after it throws.
  sb.__old = { v: 9 };
  R('applySave(migrateSaveData(__old));');
  eq(R('typeof practiceLog'), 'object', 'a pre-v10 save leaves an object behind');
  eq(R('Object.keys(practiceLog).length'), 0, 'an empty one');

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
