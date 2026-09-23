/**
 * tests/test_world_identity.js — a world is remembered by its name, not its number.
 *
 * A world's place in levelsData is an accident of the session: the 25 levels, then every file
 * in TEXTBOOK_WORLD_FILES order that managed to load. The save kept that place — `lastLevel`
 * for where the player was, a world's index in `unlockedLevels` for having been there — so a
 * saved number meant a different world whenever the list changed. It changed with every unit
 * release: Units 11, 12, 13, 15, 16, 17 and 18 were each inserted in the middle of the list,
 * and after each one a player who had been in a later world resumed somewhere else. One world
 * failing to load shifted every world after it for that session, and srsDueWords() scanned
 * `unlockedLevels`, so a world whose number moved also dropped out of the review queue.
 *
 * Run: node tests/test_world_identity.js
 */

'use strict';

const fs = require('fs');
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

function makeSandbox() {
  const el = () => {
    const classes = new Set();
    return {
      style: { cssText: '' }, children: [], innerHTML: '', textContent: '', value: '', disabled: false,
      classList: {
        add: (...c) => c.forEach(x => classes.add(x)), remove: (...c) => c.forEach(x => classes.delete(x)),
        contains: (c) => classes.has(c),
        toggle: (c, f) => { const on = f === undefined ? !classes.has(c) : !!f; on ? classes.add(c) : classes.delete(c); return on; }
      },
      appendChild(c) { this.children.push(c); return c; }, insertBefore(c) { return c; },
      addEventListener() {}, setAttribute() {}, getAttribute() { return null; },
      hasAttribute() { return false; }, removeAttribute() {},
      querySelector() { return null; }, querySelectorAll() { return []; },
      remove() {}, focus() {}, blur() {}, click() {}, animate() { return {}; }
    };
  };
  const els = {};
  const doc = {
    getElementById: (id) => els[id] || (els[id] = el()), createElement: () => el(),
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {},
    body: el(), documentElement: el(), head: el()
  };
  const storage = () => {
    const m = new Map();
    return {
      getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)),
      removeItem: k => m.delete(k), clear: () => m.clear(), get length() { return m.size; }
    };
  };
  const sb = {
    console, IS_NODE: true,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    document: doc, localStorage: storage(), sessionStorage: storage(),
    fetch: () => Promise.resolve({ ok: false, status: 404, json: async () => ({}) }),
    navigator: { userAgent: 'node', language: 'en' },
    location: { href: 'http://localhost/', origin: 'http://localhost' },
    performance: { now: () => 0 },
    Image: class {}, Audio: class { play() {} pause() {} },
    atob: s => Buffer.from(s, 'base64').toString('binary'),
    btoa: s => Buffer.from(s, 'binary').toString('base64'),
    TextDecoder, addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    Phaser: {
      AUTO: 0, Scene: class {}, Game: class {}, Scale: { RESIZE: 0, CENTER_BOTH: 0 },
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

const ROOT = path.join(__dirname, '..');
const sb = makeSandbox();
const R = (expr) => vm.runInContext(expr, sb);
const q = (v) => JSON.stringify(v);

const LEVELS = JSON.parse(fs.readFileSync(path.join(ROOT, 'levels.json'), 'utf8'));
const WORLD_FILES = R('TEXTBOOK_WORLD_FILES').map(s => s.file.split('?')[0]);
const WORLDS = WORLD_FILES.map(f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')));
const ids = WORLDS.map(w => w.id);

/**
 * What FarmScene.create() does with the world list: note where the player is, rebuild
 * levelsData from levels.json plus whichever worlds loaded, then settle the references.
 */
function bootWith(worlds) {
  sb.__levels = JSON.parse(JSON.stringify(LEVELS));
  sb.__worlds = JSON.parse(JSON.stringify(worlds));
  R('noteCurrentWorld(); levelsData = __levels; __worlds.forEach(w => attachTextbookWorld(w)); resolveWorldRefs(true);');
}
/** A fresh page: nothing in memory, the save applied before the world list exists. */
function reload(save, worlds) {
  R('levelsData = []; currentLevelIndex = 0; currentWorldId = null; visitedWorlds = null; _worldRefsFromIndex = false; _worldsSettled = false; unlockedLevels = [0];');
  sb.__save = JSON.parse(JSON.stringify(save));
  R('applySave(__save);');
  bootWith(worlds);
}
const here = () => R('currentLesson() && currentLesson().worldId');
const indexOf = (id) => R('worldIndexOf(' + q(id) + ')');

console.log('====================================================');
console.log('WORLDS ARE REMEMBERED BY ID');
console.log('====================================================');

// ── 1. Where the player was survives a unit being inserted ────────────────────
console.log('\n--- 1. A new unit lands in the middle of the list ---');
assert(ids.indexOf('topik-2') === ids.length - 1, 'topik-2 is last in the list today, where each new unit went in front of it');
bootWith(WORLDS);
R('selectLesson(' + indexOf('topik-2') + ')');
eq(here(), 'topik-2', 'the player walks into the exam world');
const save = JSON.parse(R('JSON.stringify(collectSave())'));
eq(save.lastWorld, 'topik-2', 'the save names the world');
assert(Array.isArray(save.visitedWorlds) && save.visitedWorlds.indexOf('topik-2') >= 0, 'and lists it as visited');

// The next release: a unit inserted ahead of topik-2, exactly as Units 15–18 each were.
const unit19 = Object.assign(JSON.parse(JSON.stringify(WORLDS[WORLDS.length - 2])), { id: '2b-unit-19' });
const nextRelease = WORLDS.slice(0, -1).concat([unit19, WORLDS[WORLDS.length - 1]]);
reload(save, nextRelease);
eq(here(), 'topik-2', 'after the release the player resumes in the exam world, not in the unit that took its number');
assert(R('currentLevelIndex') === save.lastLevel + 1, 'at its new number, one further along');
eq(R('unlockedLevels.includes(' + indexOf('topik-2') + ')'), true, 'its new number is the visited one');
eq(R('unlockedLevels.includes(' + indexOf('2b-unit-19') + ')'), false, 'and the new unit, never entered, is not');

// ── 2. A world that fails to load ────────────────────────────────────────────
console.log('\n--- 2. One world does not load this session ---');
const withoutUnit16 = WORLDS.filter(w => w.id !== '2b-unit-16');
reload(save, withoutUnit16);
eq(here(), 'topik-2', 'every world after the missing one keeps its identity');
reload(save, WORLDS.filter(w => w.id !== 'topik-2'));
eq(R('currentLevelIndex'), 0, 'the player’s own world missing lands them on level 1, not in whatever took its slot');
const kept = JSON.parse(R('JSON.stringify(collectSave())'));
eq(kept.lastWorld, 'topik-2', 'and the save still remembers where they were, for when it loads again');
reload(kept, WORLDS);
eq(here(), 'topik-2', 'which it does');

// ── 3. Saves written before ids ──────────────────────────────────────────────
console.log('\n--- 3. A save from before ids ---');
bootWith(WORLDS);
const u14 = indexOf('2b-unit-14');
const legacy = { v: 10, lastLevel: u14, unlockedLevels: [0, 1, u14, indexOf('2b-unit-10')] };
reload(legacy, WORLDS);
eq(here(), '2b-unit-14', 'its number is read once, against this build’s list');
const converted = JSON.parse(R('JSON.stringify(collectSave())'));
eq(converted.lastWorld, '2b-unit-14', 'and from then on it is kept by id');
eq(JSON.stringify(converted.visitedWorlds.slice().sort()), JSON.stringify(['2b-unit-10', '2b-unit-14']),
  'the worlds its numbers pointed at become its visited list');
reload(converted, nextRelease);
eq(here(), '2b-unit-14', 'so the next insertion cannot move it');

reload({ v: 10, lastLevel: 999, unlockedLevels: [0] }, WORLDS);
eq(R('currentLevelIndex'), 0, 'a number past the end of the list resumes on level 1 instead of nowhere');

reload({ v: 10, lastLevel: 3, unlockedLevels: [0, 1, 2, 3] }, WORLDS);
eq(R('currentLevelIndex'), 3, 'a numbered level keeps its number — those do not move');
eq(R('currentWorldId'), null, 'and is not mistaken for a world');

// Nothing is written in the ids' place until the save has been read against a list.
R('levelsData = []; currentLevelIndex = 0; currentWorldId = null; visitedWorlds = null; _worldRefsFromIndex = false; _worldsSettled = false;');
sb.__early = { v: 10, lastLevel: u14, unlockedLevels: [0, u14] };
R('applySave(__early);');
const early = JSON.parse(R('JSON.stringify(collectSave())'));
eq('lastWorld' in early, false, 'a save written before the world list settles leaves lastWorld out rather than guessing');
eq('visitedWorlds' in early, false, 'and visitedWorlds');

// ── 4. Reviews do not depend on a world's number ─────────────────────────────
console.log('\n--- 4. Reviews ---');
bootWith(WORLDS);
const worldOnly = WORLDS.find(w => w.id === '2b-unit-16').level.words
  .map(w => w.ko).find(k => !LEVELS.some(l => l.words.some(x => x.ko === k)));
assert(!!worldOnly, 'Unit 16 has a word no numbered level has (' + worldOnly + ')');
R('srsData = {}; unlockedLevels = [0];');
sb.__due = { m: { type: { st: 'review', step: 0, ivl: 3, ease: 2.5, reps: 2, lapses: 0, due: 1000, last: 1 } } };
R('srsData[' + q(worldOnly) + '] = __due;');
eq(R('srsDueWords(5000).map(d => d.word.ko).join()'), worldOnly,
  'a due word from a world is found even when that world’s number is not in unlockedLevels');

// ── 5. Resume does not read a stale key ──────────────────────────────────────
console.log('\n--- 5. hv_lastLevel ---');
bootWith(WORLDS);
R('selectLesson(' + indexOf('2b-unit-13') + ')');
R('localStorage.setItem("hv_lastLevel", "3"); resumeGame();');
eq(here(), '2b-unit-13', 'resuming goes where the save says, not where an old build’s hv_lastLevel said');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
console.log('\ntest_world_identity: all passed');
