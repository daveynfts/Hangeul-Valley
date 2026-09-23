/**
 * tests/test_i18n_literals.js — nothing the player reads is English written into the code.
 *
 * The interface is translated through js/locales/*.js and hvT(), and the coverage report
 * (scripts/i18n_report.js) counts what those tables hold. It cannot see text written straight
 * into a call: 54 toasts and a handful of labels drawn on the farm canvas — "Planted!",
 * "+10 COINS! NEW!", "⏰ 3 words due for review!", every arcade and dungeon message — stayed
 * English under the Vietnamese interface while the report said 100%.
 *
 * They go through hvT now. This keeps it that way: a showToast(), a farm _label() or a scene
 * add.text() whose argument is a string literal with English words in it fails here, naming
 * the file and line. Emoji, numbers and Korean on their own are not English and pass.
 *
 * Run: node tests/test_i18n_literals.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'js', 'manifest.json'), 'utf8'));
// Tables of data rather than interface: the locale files themselves and the art registries.
const SKIP = /^js\/(locales\/|vocabArt|workbookArt|hudArt|trophyArt)/;

// A call whose first argument opens with a quote or backtick, captured to the end of that
// literal. Template literals are checked on their fixed text only: what ${...} interpolates is
// data (a word, a number), not wording.
const CALLS = [
  /showToast\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g,
  /\._label\([^,]+,[^,]+,\s*(['"`])((?:\\.|(?!\1).)*)\1/g,
  /\.add\.text\([^,]+,[^,]+,\s*(['"`])((?:\\.|(?!\1).)*)\1/g
];
const ENGLISH = /[A-Za-z]{3,}/;

console.log('====================================================');
console.log('NO ENGLISH WRITTEN INTO THE CODE');
console.log('====================================================\n');

const offenders = [];
let scanned = 0;
manifest.filter((rel) => !SKIP.test(rel)).forEach((rel) => {
  const lines = fs.readFileSync(path.join(ROOT, rel), 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    if (/^\s*\/\//.test(line)) return;
    CALLS.forEach((re) => {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line))) {
        scanned++;
        const fixed = m[1] === '`' ? m[2].replace(/\$\{[^}]*\}/g, '') : m[2];
        if (ENGLISH.test(fixed)) offenders.push(rel + ':' + (i + 1) + '  ' + line.trim().slice(0, 120));
      }
    });
  });
});

assert(scanned > 0, 'scanned ' + scanned + ' literal-argument calls across the game scripts');
assert(offenders.length === 0, 'no toast, farm label or canvas text is English in the code'
  + (offenders.length ? ':\n      ' + offenders.join('\n      ') : ''));

// The detector has to be able to fire, or a clean pass means nothing.
const probe = "showToast('Plant regressed! Water it again.');";
CALLS[0].lastIndex = 0;
const hit = CALLS[0].exec(probe);
assert(!!hit && ENGLISH.test(hit[2]), 'and the check does catch an English toast when there is one');
CALLS[0].lastIndex = 0;
const emoji = CALLS[0].exec("showToast(`🍯 +${n}`);");
assert(!!emoji && !ENGLISH.test(emoji[2].replace(/\$\{[^}]*\}/g, '')), 'while an emoji and a number alone pass');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
