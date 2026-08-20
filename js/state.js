/**
 * Hangeul Valley – Thematic Economy Edition
 * ─────────────────────────────────────────────────────────────
 * Core loop:
 *  Plant a word → crop ripens → harvest → earn Gold → buy the next Level pack
 * The player picks their own learning route; levels are never force-advanced.
 */

// ═══════════════ GLOBAL STATE ════════════════════════════════════════════════
//
// The test harnesses evaluate this file in Node with hand-written `window` and `document`
// mocks, so `typeof window !== 'undefined'` does not mean "in a browser" — it means "someone
// defined window". Two module-scope side effects relied on that and fired under Node:
// the buff-HUD ticker (a 1s repeating interval, never cleared, which kept the process alive
// so test_m1_challenger_harness.js had to be killed by hand and could not go into CI) and
// loadFacts()'s fetch of a relative URL, which threw ERR_INVALID_URL into every run's output.
//
// `process.versions.node` is the check a DOM mock cannot fake. There is no bundler here, so
// nothing shims `process` in the browser build.
const IS_NODE = typeof process !== 'undefined' && !!(process.versions && process.versions.node);

let levelsData = [];
let sceneRef = null;
let currentLevelIndex = 0;
let progress = 0;

