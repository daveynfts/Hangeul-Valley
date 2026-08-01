/**
 * validate_content.js — data invariants, as a CI gate.
 *
 * Adapted from scripts/validate_learning_content.js on the parallel
 * codex/korean-learning-upgrade branch. Only the portable assertions are kept: that branch's
 * version also asserted the shape of a curriculum.js module that does not exist here, and
 * checked its own new content for Vietnamese while leaving the 1,865 Vietnamese lines still
 * in its game.js unguarded.
 *
 * The English-only invariant in particular was established by hand in an earlier pass and
 * never automated, so it could have regressed silently at any point.
 *
 * Run:  node scripts/validate_content.js
 * Exits non-zero on the first violated invariant.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

let checks = 0;
const failures = [];

function check(label, condition, detail) {
  checks++;
  if (condition) return true;
  failures.push(detail ? `${label}\n      ${detail}` : label);
  return false;
}

// Vietnamese tone marks and letters, minus three characters that appear in legitimate
// English-language content in this repo. Each exclusion is deliberate and auditable:
//
//   ã, õ  — Portuguese loanword etymologies in facts.json (pão for 빵, sabão for 비누)
//   é     — "pet cafés" in the animal-category hint in game.js
//
// Everything else in the Vietnamese repertoire would be a regression, since the project is
// English-only as of the language-unification pass.
const VIETNAMESE = /[ăâêôơưđĂÂÊÔƠƯĐáàảạấầẩẫậắằẳẵặèẻẽẹềếểễệìíỉĩịòóỏọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/;

// Korean vocabulary includes a handful of Latin-letter initialisms borrowed wholesale —
// SNS (social networking service) and PD (producer). They are real curriculum entries, so
// `ko` is allowed to be Hangul *or* a short initialism.
const LATIN_INITIALISM = /^[A-Z0-9]{1,4}$/;

// ── levels.json ──────────────────────────────────────────────────────────────
const levels = JSON.parse(read('levels.json'));

check('levels.json is an array of 25 levels', Array.isArray(levels) && levels.length === 25,
  `found ${Array.isArray(levels) ? levels.length : typeof levels}`);

const words = levels.flatMap((l) => l.words || []);
check('levels.json holds 1500 words', words.length === 1500, `found ${words.length}`);

const seenKo = new Map();
const dupes = [];
const missingFields = [];
const missingEnglish = [];

words.forEach((w, i) => {
  if (!w || typeof w !== 'object') { missingFields.push(`entry ${i} is not an object`); return; }
  ['ko', 'en', 'category'].forEach((f) => {
    if (typeof w[f] !== 'string' || !w[f].trim()) missingFields.push(`entry ${i} (${w.ko || '?'}) is missing ${f}`);
  });
  if (!w.categoryEn) missingEnglish.push(`${w.ko}: categoryEn`);
  const ko = String(w.ko || '').normalize('NFC');
  if (seenKo.has(ko)) dupes.push(`${ko} (entries ${seenKo.get(ko)} and ${i})`);
  else seenKo.set(ko, i);
});

check('every word has ko / en / category', missingFields.length === 0, missingFields.slice(0, 5).join('\n      '));
check('no duplicate Korean headwords', dupes.length === 0, dupes.slice(0, 5).join('\n      '));
check('every word has categoryEn', missingEnglish.length === 0,
  `${missingEnglish.length} missing, e.g. ${missingEnglish.slice(0, 3).join(', ')}`);

const levelsMissingEn = levels.filter((l) => !l.nameEn || !l.descriptionEn).map((l) => l.name);
check('every level has nameEn and descriptionEn', levelsMissingEn.length === 0, levelsMissingEn.join(', '));

// Korean headwords must actually be Korean, and English glosses must not be Vietnamese.
const notKorean = words
  .filter((w) => {
    const ko = String(w.ko || '');
    return !/[가-힣]/.test(ko) && !LATIN_INITIALISM.test(ko);
  })
  .map((w) => w.ko);
check('every ko is Hangul or a Latin initialism', notKorean.length === 0, notKorean.slice(0, 5).join(', '));

const viInData = [];
words.forEach((w) => {
  ['en', 'categoryEn'].forEach((f) => {
    if (w[f] && VIETNAMESE.test(w[f])) viInData.push(`${w.ko}.${f}: ${w[f]}`);
  });
});
levels.forEach((l) => {
  ['nameEn', 'descriptionEn'].forEach((f) => {
    if (l[f] && VIETNAMESE.test(l[f])) viInData.push(`level ${l.level}.${f}: ${l[f]}`);
  });
});
check('no Vietnamese in English fields of levels.json', viInData.length === 0, viInData.slice(0, 5).join('\n      '));

// ── facts.json ───────────────────────────────────────────────────────────────
const facts = JSON.parse(read('facts.json'));

check('facts.json covers every word', Object.keys(facts).length === words.length,
  `${Object.keys(facts).length} entries for ${words.length} words`);

const factsWithoutWord = Object.keys(facts).filter((k) => !seenKo.has(k));
check('facts.json has no orphan entries', factsWithoutWord.length === 0, factsWithoutWord.slice(0, 5).join(', '));

const wordsWithoutFact = [...seenKo.keys()].filter((k) => !facts[k]);
check('every word has a facts.json entry', wordsWithoutFact.length === 0, wordsWithoutFact.slice(0, 5).join(', '));

// Every emitted origin class must have a case in renderOrigin, or it displays as blank.
// The generator enforces this too; asserting it here means CI catches a hand-edit as well.
const gameJs = read('game.js');
const renderOrigin = gameJs.slice(gameJs.indexOf('function renderOrigin('), gameJs.indexOf('function renderStructure('));
const renderable = new Set([...renderOrigin.matchAll(/case '([a-z-]+)':/g)].map((m) => m[1]).concat('unknown'));
const emitted = [...new Set(Object.values(facts).map((f) => f.o))];
const unrenderable = emitted.filter((o) => !renderable.has(o));
check('every origin class in facts.json is renderable by game.js', unrenderable.length === 0, unrenderable.join(', '));

// A curated entry that renders nothing is worse than an honest `unknown`.
const emptyNote = Object.entries(facts)
  .filter(([, f]) => (f.o === 'idiom' || f.o === 'discourse' || f.o === 'native') && f.note !== undefined && !String(f.note).trim())
  .map(([k]) => k);
check('no curated entry has an empty note', emptyNote.length === 0, emptyNote.slice(0, 5).join(', '));

// ── Shipped source ───────────────────────────────────────────────────────────
['game.js', 'index.html'].forEach((f) => {
  const src = read(f);
  const hits = src.split('\n')
    .map((line, i) => ({ line, n: i + 1 }))
    .filter(({ line }) => VIETNAMESE.test(line))
    .map(({ line, n }) => `${f}:${n}: ${line.trim().slice(0, 70)}`);
  check(`no Vietnamese in ${f}`, hits.length === 0, hits.slice(0, 5).join('\n      '));
});

// ── assets/ mirror ───────────────────────────────────────────────────────────
// main.py serves from assets/ and admin/lib/sync.js writes both copies, so a drift here
// means the desktop build and the browser build disagree.
['game.js', 'index.html', 'levels.json', 'facts.json'].forEach((f) => {
  const a = path.join(ROOT, f);
  const b = path.join(ROOT, 'assets', f);
  if (!fs.existsSync(b)) { check(`assets/${f} exists`, false); return; }
  const norm = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
  check(`assets/${f} matches the root copy`, norm(a) === norm(b));
});

// ── Report ───────────────────────────────────────────────────────────────────
console.log(`\nvalidate_content: ${checks - failures.length}/${checks} invariants hold`);
if (failures.length) {
  console.error('\nFAILED:');
  failures.forEach((f) => console.error(`  ✗ ${f}`));
  process.exit(1);
}
console.log('All content invariants hold ✓');
