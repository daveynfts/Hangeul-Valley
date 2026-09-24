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
 * The same holds for the label tables js/overlays.js builds its dashboards from, which never
 * pass through any of those calls: a `lbl:` or `label:` field, or an entry of a map named like
 * LBL or LABELS. The Progress panel's practice log and per-skill rows ("Exercises",
 * "⌨️ Type (production)") stayed English that way.
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
function isEnglish(quote, body) {
  return ENGLISH.test(quote === '`' ? body.replace(/\$\{[^}]*\}/g, '') : body);
}

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
        if (isEnglish(m[1], m[2])) offenders.push(rel + ':' + (i + 1) + '  ' + line.trim().slice(0, 120));
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

// ── Label tables ─────────────────────────────────────────────────────────────
// js/overlays.js builds its dashboards from small tables — rows of { icon, lbl }, or a map of
// id → label — and pastes them into innerHTML, where none of the calls above look. A `lbl:` or
// `label:` field, or an entry of an object assigned to a label-named constant (LBL, LABELS,
// skillLabels …), whose value is a string literal with English words in it fails here. An
// hvT() call is not a literal, and a literal shaped like a catalogue key is not wording: a
// table may hold the key and look it up later.
const LABEL_FILES = ['js/overlays.js'];
const LABEL_FIELD = /(?:^|[{,])\s*(?:lbl|label)\s*:\s*(['"`])((?:\\.|(?!\1).)*)\1/g;
const LABEL_MAP = /\b(?:const|let|var)\s+((?:[A-Z][A-Z0-9_]*_)?(?:LBL|LABELS?)|[a-z]\w*(?:Lbl|Labels?)|lbl|labels?)\s*=\s*\{/g;
const MAP_ENTRY = /([A-Za-z_$][\w$]*)\s*:\s*(['"`])((?:\\.|(?!\2).)*)\2/g;
const KEY_SHAPE = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)+$/;
const isWording = (quote, body) => isEnglish(quote, body) && !KEY_SHAPE.test(body);

// The object literal that opens at src[open], up to its matching brace. Strings and comments
// are stepped over, so a brace or an apostrophe inside one does not end it early.
function objectAt(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      for (i++; i < src.length && src[i] !== c; i++) if (src[i] === '\\') i++;
    } else if (c === '/' && src[i + 1] === '/') {
      i = src.indexOf('\n', i);
      if (i < 0) break;
    } else if (c === '/' && src[i + 1] === '*') {
      i = src.indexOf('*/', i + 2) + 1;
      if (i <= 0) break;
    } else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return src.slice(open, i + 1);
  }
  return src.slice(open);
}

function labelOffenders(rel, src) {
  const out = [];
  src.split(/\r?\n/).forEach((line, i) => {
    if (/^\s*\/\//.test(line)) return;
    LABEL_FIELD.lastIndex = 0;
    let m;
    while ((m = LABEL_FIELD.exec(line))) {
      if (isWording(m[1], m[2])) out.push(rel + ':' + (i + 1) + '  ' + line.trim().slice(0, 120));
    }
  });
  LABEL_MAP.lastIndex = 0;
  let map;
  while ((map = LABEL_MAP.exec(src))) {
    const open = map.index + map[0].length - 1;
    const first = src.slice(0, open).split('\n').length;
    objectAt(src, open).split(/\r?\n/).forEach((line, j) => {
      if (/^\s*\/\//.test(line)) return;
      MAP_ENTRY.lastIndex = 0;
      let e;
      while ((e = MAP_ENTRY.exec(line))) {
        if (isWording(e[2], e[3])) out.push(rel + ':' + (first + j) + '  ' + map[1] + '.' + e[1] + ' = ' + e[2] + e[3] + e[2]);
      }
    });
  }
  return out;
}

console.log('');
let labelsScanned = 0;
const labelHits = [];
LABEL_FILES.forEach((rel) => {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  labelsScanned += (src.match(/(?:^|[{,])\s*(?:lbl|label)\s*:/gm) || []).length + (src.match(LABEL_MAP) || []).length;
  labelHits.push(...labelOffenders(rel, src));
});
assert(labelsScanned > 0, 'scanned ' + labelsScanned + ' label fields and label maps in ' + LABEL_FILES.join(', '));
assert(labelHits.length === 0, 'no dashboard label is English in the code'
  + (labelHits.length ? ':\n      ' + labelHits.join('\n      ') : ''));

// And it fires — on a table row, and on a map written across several lines, at the line of the
// entry — while what is fine to leave in a table passes.
const rowHits = labelOffenders('probe', "const ROWS = [{ k: 'wb', icon: '✍️', lbl: 'Exercises', unit: 'page' }];");
assert(rowHits.length === 1, 'the check does catch an English lbl: in a table row');
const mapHits = labelOffenders('probe', [
  'const LBL = {',
  "  type: '⌨️ Type (production)',",
  "  listen: hvT('ui.prog.skill.listen')",
  '};'
].join('\n'));
assert(mapHits.length === 1 && mapHits[0].indexOf('probe:2  LBL.type') === 0,
  'and an English entry of a label map, on the line it is on' + (mapHits.length ? ' (' + mapHits.join('; ') + ')' : ''));
const fine = labelOffenders('probe',
  "const ROWS = [{ lbl: '✍️' }, { label: 'ui.prog.prac.exercises' }, { lbl: hvT('ui.prog.learned') }];");
assert(fine.length === 0, 'while an emoji, a catalogue key and an hvT() call pass');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
