'use strict';
/**
 * tests/test_world_load_order.js — the level select lists worlds in list order.
 *
 * loadTextbookWorlds fires one fetch per world, all at once. It used to attach each world as
 * its response arrived, which on a local server is the order of the list and over a CDN is
 * roughly by file size: on production the menu came out 11, 13, 14, 10 because Unit 10 is the
 * largest JSON. The order was therefore a property of the network, and it changed between
 * page loads.
 *
 * These tests drive the shipped function with a fetch that answers in reverse, which is the
 * case the old code got wrong and the one a real network produces often enough to see.
 *
 * Run: node tests/test_world_load_order.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const econ = fs.readFileSync(path.join(ROOT, 'js', 'systems', 'economy.js'), 'utf8');

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

const from = econ.indexOf('let textbookWorldsTried');
const to = econ.indexOf('function getUnlockedWords');
assert(from >= 0 && to > from, 'loadTextbookWorlds is in economy.js');
const src = econ.slice(from, to);

// The real list, read from the file rather than typed out — the same reason farm.js reads it.
const specs = (econ.match(/\{ cache: '[^']+', file: '[^']+' \}/g) || []).map((m) => ({
  cache: m.match(/cache: '([^']+)'/)[1],
  file: m.match(/file: '([^']+)'/)[1]
}));
assert(specs.length >= 5, 'and it names five worlds or more (' + specs.length + ')');

// Each world is a stub carrying only its id: this is a test about order, not about content.
const worldFor = (spec) => ({ id: spec.cache.replace(/^world-/, ''), level: { level: spec.cache } });

function run(opts) {
  const attached = [];
  const pending = [];
  // The loader folds a translation catalogue into each world as it arrives, so the context
  // has to carry that too. Taken from the real js/i18n.js rather than stubbed: with the
  // language left at English both are no-ops, which is exactly what this test wants, and a
  // stub would stop testing the thing that actually runs.
  const i18n = require('../js/i18n.js');
  const ctx = {
    console,
    hvLocalize: i18n.hvLocalize,
    hvLocalizeAsync: i18n.hvLocalizeAsync,
    TEXTBOOK_WORLD_FILES: specs,
    attachTextbookWorld: (w) => { attached.push(w.id); return attached.length - 1; },
    IS_NODE: false,
    fetch: (file) => new Promise((resolve) => {
      const spec = specs.find((s) => s.file === file);
      pending.push(() => resolve(
        opts.missing === file ? { ok: false } : { ok: true, json: () => Promise.resolve(worldFor(spec)) }
      ));
    })
  };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);

  return new Promise((resolve) => {
    vm.runInContext('loadTextbookWorlds(() => { __done = true; })', ctx);
    // Let the forEach queue every fetch, then answer them in whatever order the test wants.
    setImmediate(() => {
      const order = opts.order === 'reverse' ? pending.slice().reverse() : pending.slice();
      order.forEach((fire) => fire());
      // Two ticks: one for the .json() promise, one for the .then that calls one().
      setTimeout(() => resolve({ attached, done: ctx.__done === true }), 20);
    });
  });
}

const want = specs.map((s) => s.cache.replace(/^world-/, ''));

(async () => {
  console.log('\n--- 1. Answers arriving in reverse ---');
  const rev = await run({ order: 'reverse' });
  assert(rev.attached.length === specs.length,
    'every world is attached (' + rev.attached.length + ' of ' + specs.length + ')');
  assert(rev.attached.join(',') === want.join(','),
    'in the order of the list, not of the network (' + rev.attached.join(',') + ')');
  assert(rev.done === true, 'and the caller is told once, at the end');

  console.log('\n--- 2. Answers arriving in list order ---');
  const fwd = await run({ order: 'forward' });
  assert(fwd.attached.join(',') === want.join(','),
    'the same order, so the menu does not change between loads');

  console.log('\n--- 3. One world missing ---');
  const gone = await run({ order: 'reverse', missing: specs[0].file });
  assert(gone.attached.indexOf(want[0]) < 0, 'a world that fails to load is not attached');
  assert(gone.attached.join(',') === want.slice(1).join(','),
    'and the rest keep their order rather than closing the gap in arrival order ('
      + gone.attached.join(',') + ')');
  assert(gone.done === true, 'the caller is still told, so the screen is not left waiting');

  console.log('\n--- 4. The exam world is on the list ---');
  assert(want.indexOf('topik-2') >= 0, 'topik-2 is one of the worlds loaded here');

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  if (failed) process.exit(1);
  console.log('\ntest_world_load_order: all passed');
})();
