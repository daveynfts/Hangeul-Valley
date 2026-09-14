'use strict';
/**
 * tests/test_art_resolution.js — the artwork reaches the screen at its own resolution.
 *
 * Three generations of art share the same boxes: 48px farm tiles, 96px TOPIK tiles and 192px
 * Unit illustrations. The stylesheet asks for nearest-neighbour sampling, which is the right
 * instruction only when an image lands on a whole multiple of its own pixels — and Chrome
 * applies it downwards too, so a box shorter than the source does not soften the picture, it
 * discards rows of it. A 96px box was halving every Unit illustration on a 1x display, and a
 * 288px quiz stage (three 96px tiles, once) was drawing every second row of one twice.
 *
 * So the sizes are checked against the art on disk rather than against numbers written down
 * here. When a fourth generation arrives at some other height, this fails and names the rules
 * that have to move with it.
 *
 * Run: node tests/test_art_resolution.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(ROOT, 'css', 'game.css'), 'utf8');
const artScaleSource = fs.readFileSync(path.join(ROOT, 'js', 'artScale.js'), 'utf8');

let failures = 0;
function assert(cond, msg) {
  if (!cond) {
    failures++;
    console.error('FAIL: ' + msg);
    return;
  }
  console.log('ok  ' + msg);
}

// ── The art on disk decides the numbers ──────────────────────────────────────
function pngHeight(file) {
  const b = fs.readFileSync(file);
  if (b.length < 24 || b.toString('ascii', 1, 4) !== 'PNG') return 0;
  return b.readUInt32BE(20);
}
function pngsUnder(dir, out) {
  out = out || [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) pngsUnder(p, out);
    else if (e.name.endsWith('.png')) out.push(p);
  });
  return out;
}

// The folders the vocabulary interface draws from. Farm props and characters live elsewhere
// and are drawn in the canvas, where the rules below do not apply.
const VOCAB_ART_DIRS = ['items', 'foods', 'quiz'];
const heights = VOCAB_ART_DIRS
  .flatMap((d) => pngsUnder(path.join(ROOT, 'sprites', d)))
  .map(pngHeight)
  .filter(Boolean);
assert(heights.length > 500, 'the vocabulary art library was found (' + heights.length + ' files)');
const tallest = Math.max.apply(null, heights);
assert(tallest > 0, 'the tallest vocabulary source is ' + tallest + 'px');

// ── The study surfaces show it whole ─────────────────────────────────────────
// Each of these is a place the learner is being asked to look at the picture: the question
// stage in the plant/water/harvest quiz, the card that answers it, and the two Vocabulary Book
// views. On a desktop one CSS pixel is one device pixel, so the box has to be at least as tall
// as the source, and a whole multiple of it or nearest-neighbour has rows to double.
function firstRule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = css.match(new RegExp(escaped + '\\s*\\{[^}]*\\}', 's'));
  return m ? m[0] : '';
}
[
  ['#hint-emoji .vocab-art-icon, #hint-emoji img', 'the quiz question stage'],
  ['#quiz-result-art .vocab-art-icon, #quiz-result-art img', 'the quiz reward card'],
  ['.vc-emoji img.vocab-art-icon', 'a Vocabulary Book card'],
  ['#vff-emoji img.vocab-art-icon', 'the Vocabulary Book word details']
].forEach(([selector, what]) => {
  const rule = firstRule(selector);
  const height = Number((rule.match(/height:\s*(\d+)px/) || [])[1]);
  assert(height >= tallest && height % tallest === 0,
    what + ' shows ' + tallest + 'px artwork at ' + height + 'px, a whole multiple of it');
  assert(/object-fit:\s*contain/.test(rule),
    what + ' fits a wide illustration to the box rather than stretching it');
});

// The enlarged step for a tall window is the one that went wrong last time: it was written as
// 3x a 96px tile and silently became 1.5x when the artwork grew.
const tallWindowStep = Number((css.match(
  /@media \(min-width: \d+px\) and \(min-height: \d+px\)[\s\S]*?#hint-emoji img \{ height: (\d+)px/) || [])[1]);
assert(tallWindowStep >= tallest && tallWindowStep % tallest === 0,
  'the tall-window quiz stage steps to ' + tallWindowStep + 'px, a whole multiple of ' + tallest + 'px');

// ── The rule that picks the sampling mode ────────────────────────────────────
// artScale.js guards its listeners behind `document`, so it evaluates here and leaves the two
// pure functions behind.
const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(artScaleSource + '\nthis.hvArtScaleMode = hvArtScaleMode;'
  + '\nthis.hvArtPaintedHeight = hvArtPaintedHeight;', sandbox);
const { hvArtScaleMode, hvArtPaintedHeight } = sandbox;

[
  // [natural, painted CSS px, dpr, expected, what this is]
  [192, 192, 1, 'pixelated', 'a Unit illustration at 1:1 on a 1x display'],
  [192, 384, 1, 'pixelated', 'the same illustration at a whole 2x'],
  [192, 288, 1, 'auto', 'the 1.5x step that used to be nearest-neighbour'],
  [192, 96, 1, 'auto', 'a 96px box on a 1x display, where nearest dropped three pixels in four'],
  [192, 96, 2, 'pixelated', 'the same box on a 2x phone, which is 1:1 in device pixels'],
  [192, 96, 3, 'auto', 'and on a 3x phone, where it is not'],
  [192, 128, 1.5, 'pixelated', 'a 1.5x desktop whose device pixels happen to land on 1:1'],
  [192, 192, 1.5, 'auto', 'a 1.5x desktop at the ordinary stage size'],
  [96, 192, 1, 'pixelated', 'a TOPIK tile at 2x'],
  [48, 192, 1, 'pixelated', 'a farm tile at 4x'],
  [192, 40, 1, 'auto', 'an inventory slot, far below the source'],
  [192, 0, 1, '', 'an image with no box yet — leave the stylesheet alone'],
  [0, 192, 1, '', 'an image that has not loaded — leave the stylesheet alone']
].forEach(([natural, painted, dpr, expected, what]) => {
  const got = hvArtScaleMode(natural, painted, dpr);
  assert(got === expected, what + ' → ' + (expected || 'no opinion') + (got === expected ? '' : ' (got ' + got + ')'));
});

// object-fit decides what "painted" means: a square box around a wide illustration paints it
// at a fraction of the box height, and judging that image by the box would call a reduction an
// enlargement.
assert(Math.abs(hvArtPaintedHeight(72, 72, 306, 192, 'contain') - 72 * 192 / 306) < 1e-9,
  'a 306x192 illustration in a 72px square is painted 45px tall, not 72px');
assert(hvArtPaintedHeight(192, 192, 194, 192, 'contain') < 192,
  'even a near-square illustration is fitted, not filled');
assert(hvArtPaintedHeight(40, 40, 192, 192, 'fill') === 40, 'without a fit rule the box is the answer');

if (failures) {
  console.error('test_art_resolution: ' + failures + ' failed');
  process.exit(1);
}
console.log('\ntest_art_resolution: all passed');
