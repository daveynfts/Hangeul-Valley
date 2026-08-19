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

// Korean word spacing (띄어쓰기). A particle attaches to the noun before it, but the verb or
// adjective that follows is a separate word — 어깨가 무겁다, not 어깨가무겁다. The original data
// had all 1500 headwords written solid, so learners typing the dictionary spelling were
// graded down, and the answer shown back to them taught the wrong orthography.
//
// This catches the mechanically detectable class: an object particle 을/를 sitting inside the
// word, or a subject particle 이/가 inside a word that ends in the predicate 다. Verb and
// adjective endings that legitimately fuse to a Sino root are excluded — 감동적이다 is 感動的 +
// 이다 and 만족스럽다 is 滿足 + 스럽다, one word each.
//
// Compound nouns are deliberately not checked. 한글 맞춤법 제49항 permits 전문 용어 to be written
// solid, so 중앙도서관 and 지구온난화 are defensible either way and a rule here would be taste.
const FUSED_PREDICATE_ENDING = /(적이다|스럽다|롭다|하다|되다|시키다)$/;
const unspacedPhrases = words
  .map((w) => String(w.ko || '').normalize('NFC'))
  .filter((ko) => {
    if (ko.length < 4 || /\s/.test(ko)) return false;
    if (/[을를]/.test(ko.slice(1, -1))) return true;
    return /[이가]/.test(ko.slice(1, -2)) && ko.endsWith('다') && !FUSED_PREDICATE_ENDING.test(ko);
  });
check('no headword runs a particle into the following predicate', unspacedPhrases.length === 0,
  `${unspacedPhrases.length} need a space, e.g. ${unspacedPhrases.slice(0, 5).join(', ')}`);

// Two headwords sharing an English gloss make a four-option recognition question
// unanswerable: 미술 and 예술 both read "art", so the learner sees two identical buttons and
// one of them scores wrong. buildOptionSet in game.js now dedupes on the rendered label so a
// collision cannot reach the screen, but distinct glosses are what the learner actually needs.
const byGloss = new Map();
words.forEach((w) => {
  const g = String(w.en || '').trim().toLowerCase();
  if (!g) return;
  byGloss.set(g, [...(byGloss.get(g) || []), w.ko]);
});
const sharedGlosses = [...byGloss.entries()]
  .filter(([, kos]) => kos.length > 1)
  .map(([g, kos]) => `"${g}" = ${kos.join(' / ')}`);
check('no two headwords share an English gloss', sharedGlosses.length === 0,
  sharedGlosses.slice(0, 5).join('\n      '));

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

// Modal overlays are `position:fixed` siblings of <body>. If one is nested inside
// another that starts as `display:none` (this happened to inventory inside
// leaderboard), adding `.visible` on the child cannot show it.
const overlayIds = [
  'inventory-overlay', 'cooking-overlay', 'leaderboard-overlay',
  'recipe-overlay', 'quest-overlay', 'shop-overlay', 'vocab-overlay',
  'unit-notebook-overlay', 'taste-overlay', 'desk-quiz-overlay',
  'rank-card-overlay', 'rankup-overlay'
];
(function checkOverlayNesting() {
  const html = read('index.html');
  const stack = [];
  const re = /<\/?div\b([^>]*)>/gi;
  let m;
  const nested = [];
  while ((m = re.exec(html))) {
    const attrs = m[1] || '';
    const idMatch = attrs.match(/id=["']([^"']+)/);
    const id = idMatch ? idMatch[1] : '';
    if (m[0].startsWith('</')) {
      stack.pop();
      continue;
    }
    stack.push(id || '(anon)');
    if (overlayIds.includes(id)) {
      const parentOverlay = stack.slice(0, -1).find((x) => overlayIds.includes(x));
      if (parentOverlay) nested.push(`${id} inside ${parentOverlay}`);
    }
  }
  check('modal overlays are not nested in each other', nested.length === 0, nested.join(', '));
}());

// ── Textbook worlds (SNU 2B …) — separate from the 25 × 60 Valley packs ──────
(function checkTextbookWorlds() {
  const rel = path.join('worlds', '2b-unit-10.json');
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) { check(`${rel} exists`, false); return; }
  let world;
  try { world = JSON.parse(fs.readFileSync(full, 'utf8')); }
  catch (e) { check(`${rel} is valid JSON`, false, e.message); return; }
  check('2B Unit 10 has an id and a level', !!(world.id === '2b-unit-10' && world.level && Array.isArray(world.level.words)));
  const ww = (world.level && world.level.words) || [];
  const missing = ww.filter((w) => !w.ko || !w.en || !w.category || !w.categoryEn).map((w) => w.ko || '?');
  check('2B Unit 10 words have ko / en / category / categoryEn', missing.length === 0, missing.slice(0, 5).join(', '));
  check('2B Unit 10 has the full textbook word list', ww.length === 80, `found ${ww.length}`);
  const cats = new Set(ww.map((w) => w.category));
  check('2B Unit 10 has six vocab groups', ['음식', '맛', '식당 평가', '읽기', '주문', '회화'].every((c) => cats.has(c)),
    [...cats].join(', '));
}());

// ── assets/ mirror ───────────────────────────────────────────────────────────
// main.py serves from assets/ and admin/lib/sync.js writes both copies, so a drift here
// means the desktop build and the browser build disagree.
(function checkDeskQuizBank() {
  const rel = path.join('worlds', 'unit10-desk-quiz.json');
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) { check(`${rel} exists`, false); return; }
  let bank;
  try { bank = JSON.parse(fs.readFileSync(full, 'utf8')); }
  catch (e) { check(`${rel} is valid JSON`, false, e.message); return; }
  const qs = (bank && bank.questions) || [];
  check('desk quiz has 20 questions', qs.length === 20, `found ${qs.length}`);
  check('desk quiz session is 5 questions', bank.sessionSize === 5, String(bank.sessionSize));
  const ids = new Set();
  const bad = [];
  qs.forEach((q, i) => {
    if (!q || typeof q.id !== 'number') bad.push(`q${i} missing id`);
    else if (ids.has(q.id)) bad.push(`duplicate id ${q.id}`);
    else ids.add(q.id);
    if (!q.q || !q.a || !q.choices) bad.push(`q${i} incomplete`);
    else if (!['A', 'B', 'C', 'D'].includes(q.a)) bad.push(`q${q.id} bad key ${q.a}`);
    else if (!q.choices[q.a]) bad.push(`q${q.id} answer not in choices`);
    ['A', 'B', 'C', 'D'].forEach((k) => { if (!q.choices[k]) bad.push(`q${q.id} missing ${k}`); });
    if (VIETNAMESE.test(JSON.stringify(q))) bad.push(`q${q.id} has Vietnamese`);
  });
  check('desk quiz items are well-formed English MCQs', bad.length === 0, bad.slice(0, 6).join(', '));
}());

['game.js', 'index.html', 'levels.json', 'facts.json', path.join('worlds', '2b-unit-10.json'), path.join('worlds', 'unit10-desk-quiz.json'), path.join('worlds', 'unit10-layout.json')].forEach((f) => {
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
