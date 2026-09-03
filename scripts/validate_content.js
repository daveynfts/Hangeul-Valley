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
const { GAME_SCRIPTS, readGameSource } = require('./gameSource');
const { auditArt } = require('./art_library');
const { STATIC_FILES } = require('./r2Content');
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
//   é     — "pet cafés" in the animal-category hint in js/data.js
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
const gameJs = readGameSource();
const renderOrigin = gameJs.slice(gameJs.indexOf('function renderOrigin('), gameJs.indexOf('function renderStructure('));
const renderable = new Set([...renderOrigin.matchAll(/case '([a-z-]+)':/g)].map((m) => m[1]).concat('unknown'));
const emitted = [...new Set(Object.values(facts).map((f) => f.o))];
const unrenderable = emitted.filter((o) => !renderable.has(o));
check('every origin class in facts.json is renderable by renderOrigin()', unrenderable.length === 0, unrenderable.join(', '));

// A curated entry that renders nothing is worse than an honest `unknown`.
const emptyNote = Object.entries(facts)
  .filter(([, f]) => (f.o === 'idiom' || f.o === 'discourse' || f.o === 'native') && f.note !== undefined && !String(f.note).trim())
  .map(([k]) => k);
check('no curated entry has an empty note', emptyNote.length === 0, emptyNote.slice(0, 5).join(', '));

// ── Shipped source ───────────────────────────────────────────────────────────
check('game.js monolith is gone', !fs.existsSync(path.join(ROOT, 'game.js')));
check('js/manifest.json lists scripts', Array.isArray(GAME_SCRIPTS) && GAME_SCRIPTS.length > 0);

const html = read('index.html');
check('index.html links a cache-busted css/game.css',
  /href="css\/game\.css\?v=[a-z0-9-]+"/i.test(html));
check('quiz has no romanization hint', html.indexOf("revealQuizHint('roman')") < 0);
check('vocab book cards use vocabIconHtml',
  /vc-emoji[\s\S]{0,120}vocabIconHtml|vocabIconHtml\([\s\S]{0,40}vc-emoji/.test(gameJs)
  && gameJs.indexOf("vocabIconHtml(w.ko") >= 0);
check('vocab fun-fact uses vocabIconHtml', gameJs.indexOf("vocabIconHtml(word.ko") >= 0);
check('plant quiz hint uses vocabIconHtml',
  /hintEmoji[\s\S]{0,180}vocabIconHtml\(word\.ko/.test(gameJs));
check('crop quiz has a success continue beat',
  html.indexOf('id="quiz-result"') >= 0
  && gameJs.indexOf('function showQuizSuccess') >= 0
  && /delay: ph === 3 \? 0/.test(gameJs)
  && gameJs.indexOf("setTimeout(()=>{ closeQuiz(); if(sceneRef) sceneRef.advancePlot(cp,cw,ph,grade); },650)") < 0);
check('phase 3 success waits for the player to dismiss',
  /if \(delay === 0\)/.test(gameJs)
  && gameJs.indexOf('delay: 0') >= 0);
check('quiz steps mark Plant Water Harvest', html.indexOf('id="quiz-steps"') >= 0);
check('phase 3 recall uses shape tiles, not category essays',
  gameJs.indexOf('function renderRecallScaffoldHtml') >= 0
  && gameJs.indexOf('recall-tile') >= 0
  && !/ffCulture\.textContent = getFunFact\(word\)\.hint/.test(gameJs));
check('recall scaffold never prints syllable characters',
  /function renderRecallScaffoldHtml[\s\S]{0,900}s\.hasBatchim/.test(gameJs)
  && !/function renderRecallScaffoldHtml[\s\S]{0,1200}s\.char/.test(gameJs));
check('recall tiles group by vocab spacing, no open/closed caption',
  gameJs.indexOf('function hangulSyllableGroups') >= 0
  && gameJs.indexOf('recall-word') >= 0
  && !/function renderRecallScaffoldHtml[\s\S]{0,800}closed/.test(gameJs)
  && !/function renderRecallScaffoldHtml[\s\S]{0,800}recall-caption/.test(gameJs));
check('study desk does not spawn the stool',
  !/_ensureStudyDesk\(\)\{[\s\S]{0,900}wooden_stool_hd/.test(gameJs));
check('HUD paints catalogued farm icons', gameJs.indexOf('function hudIconHtml') >= 0 && gameJs.indexOf('function paintHudIcons') >= 0);
check('HUD art folder is ui', gameJs.indexOf("HUD_ART_FOLDER = 'ui'") >= 0);
check('Mindmap / Words notebook is gone',
  gameJs.indexOf('function renderUnitNotebook') < 0
  && gameJs.indexOf('openUnitNotebook') < 0
  && html.indexOf('unit-notebook') < 0
  && html.indexOf('unit10-mindmap') < 0);
check('shipped source has no Hangul romanizer', gameJs.indexOf('getHangulRomanization') < 0 && gameJs.indexOf('function getRoman(') < 0);
check('Korean audio plays CDN clips before Web Speech',
  gameJs.indexOf("TTS_CLIP_DIR = 'audio/ko/'") >= 0
  && gameJs.indexOf('function ttsClipStem') >= 0
  && gameJs.indexOf('this._playClip') >= 0
  && gameJs.indexOf("TTS_CACHE_KEY = 'sunhi-1'") >= 0);
const appRelease = (html.match(/<body\b[^>]*\bdata-ui-release="([^"]+)"/i) || [])[1] || '';
const scriptSrcsWithVersion = [...html.matchAll(/<script\b[^>]*\bsrc="(js\/[^"]+)"[^>]*><\/script>/gi)].map((m) => m[1]);
const scriptSrcs = scriptSrcsWithVersion.map((src) => src.split('?')[0]);
check('every app script uses the current cache-busting release',
  !!appRelease && scriptSrcsWithVersion.every((src) => src.endsWith('?v=' + appRelease)),
  appRelease || 'missing data-ui-release');
check('index.html script tags match js/manifest.json',
  JSON.stringify(scriptSrcs) === JSON.stringify(GAME_SCRIPTS),
  scriptSrcs.join(',') + ' vs ' + GAME_SCRIPTS.join(','));

// The check above compares two files a person edits together, so it agrees even when both are
// wrong about what is on disk. A .js file added to js/ and left out of the manifest is never
// loaded by anything: no 404, no console error, just whatever it defined quietly absent. That
// matters here because a second session works in this checkout and adds files to js/.
//
// A file may be deliberately unloaded, but it has to say so here with a reason.
(function checkEveryScriptLoads() {
  const NOT_LOADED = {
    // 'js/example.js': 'why this one is intentionally not in the manifest',
  };
  const found = [];
  (function walk(dir) {
    fs.readdirSync(dir).forEach((n) => {
      const f = path.join(dir, n);
      if (fs.statSync(f).isDirectory()) return walk(f);
      if (n.endsWith('.js')) found.push('js/' + path.relative(path.join(ROOT, 'js'), f).split(path.sep).join('/'));
    });
  }(path.join(ROOT, 'js')));

  check('there are scripts on disk to compare against', found.length > 10, `${found.length} found`);

  const listed = new Set(GAME_SCRIPTS);
  const unloaded = found.filter((f) => !listed.has(f) && !NOT_LOADED[f]);
  check('every .js in js/ is loaded, or says why not', unloaded.length === 0,
    unloaded.join(', ') + ' — add to js/manifest.json, or to NOT_LOADED with a reason');

  // The reverse — a manifest entry with no file — is deliberately not checked here. Every listed
  // script is read by readGameSource() far above this line, so such a check could never fire; it
  // would sit in the count looking like protection. gameSource.js reports it instead, and says
  // "js/manifest.json lists X, which is not on disk" rather than throwing a bare ENOENT.
}());

['index.html', path.join('css', 'game.css'), path.join('sprites', 'catalog.json'), path.join('skins', 'catalog.json')]
  .concat(GAME_SCRIPTS)
  .forEach((f) => {
    let src;
    try { src = read(f); }
    catch (e) {
      check(`readable ${f}`, false, e.message);
      return;
    }
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
  'taste-overlay', 'desk-quiz-overlay',
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
  // Split the same way Unit 14's is. The 80 are the textbook's own 어휘 list and that count is a
  // fidelity claim; the rest are the words the chapter's other pages drill — the grammar boxes,
  // 말하기, 과제 and 발음 — which have no icons yet and so render as their hint emoji.
  const drawn10 = ww.filter((w) => !w.artPending);
  check('2B Unit 10 keeps its 80 textbook headwords', drawn10.length === 80, `found ${drawn10.length}`);
  const cats = new Set(ww.map((w) => w.category));
  const want10 = ['음식', '맛', '식당 평가', '읽기', '주문', '회화'];
  check('2B Unit 10 keeps its six 어휘 vocab groups', want10.every((c) => cats.has(c)),
    [...cats].join(', '));
  const stray10 = drawn10.filter((w) => !want10.includes(w.category)).map((w) => w.ko);
  check('2B Unit 10 drawn headwords stay in the six 어휘 groups', stray10.length === 0, stray10.slice(0, 8).join(', '));
  const declared10 = ((world.notebook && world.notebook.mindmap) || []).map((g) => g.cat);
  const inUse10 = [...new Set(ww.map((w) => w.category))];
  check('2B Unit 10 mindmap groups match the categories in use',
    declared10.every((c) => inUse10.includes(c)) && inUse10.every((c) => declared10.includes(c)),
    'mindmap: ' + declared10.join(', ') + ' | words: ' + inUse10.join(', '));
  const dups10 = ww.map((w) => w.ko).filter((k, i, arr) => arr.indexOf(k) !== i);
  check('2B Unit 10 has no repeated headword', dups10.length === 0, dups10.join(', '));
  check('2B Unit 10 does not force matrix chef', !world.costumeSkinId,
    String(world.costumeSkinId));
}());

(function checkUnit14World() {
  const rel = path.join('worlds', '2b-unit-14.json');
  const full = path.join(ROOT, rel);
  if (!check(`${rel} exists`, fs.existsSync(full))) return;
  let world;
  try { world = JSON.parse(fs.readFileSync(full, 'utf8')); }
  catch (e) { check(`${rel} is valid JSON`, false, e.message); return; }
  check('2B Unit 14 has an id and a level', !!(world.id === '2b-unit-14' && world.level && Array.isArray(world.level.words)));
  const ww = (world.level && world.level.words) || [];
  const missing = ww.filter((w) => !w.ko || !w.en || !w.category || !w.categoryEn).map((w) => w.ko || '?');
  check('2B Unit 14 words have ko / en / category / categoryEn', missing.length === 0, missing.slice(0, 5).join(', '));
  // Split, because the two halves guarantee different things. The 54 are the textbook's own
  // 어휘 list and that count is a fidelity claim — it must not drift. The rest are words the
  // unit's other pages drill that the 어휘 list does not carry: the 금지 actions off 문법과 표현 4
  // and 문형 연습 4, and now the grammar boxes, 말하기, 듣고 말하기, 읽고 쓰기, 과제 and 발음 —
  // every one a word a learner met on the page and could not otherwise learn. They are marked
  // artPending because their icons are still to be drawn; see the art check below, which names
  // them rather than waving them through.
  const drawn = ww.filter((w) => !w.artPending);
  check('2B Unit 14 keeps its 54 textbook headwords', drawn.length === 54, `found ${drawn.length}`);
  const cats = new Set(ww.map((w) => w.categoryEn));
  const want = [
    'Etiquette & respect for seniors',
    'Public etiquette & prohibitions',
    'Real-life dialogues',
    'Listening & dormitory rules',
    'Reading & culture'
  ];
  // The 어휘 pages own these five, so the drawn 54 may not wander out of them — that is what
  // keeps the fidelity claim above about the 어휘 list rather than about the unit at large.
  const strayDrawn = drawn.filter((w) => !want.includes(w.categoryEn)).map((w) => w.ko);
  check('2B Unit 14 drawn headwords stay in the five 어휘 groups',
    strayDrawn.length === 0, strayDrawn.slice(0, 8).join(', '));
  check('2B Unit 14 keeps its five 어휘 vocab groups', want.every((c) => cats.has(c)), [...cats].join(', '));
  // The later pages may open new groups — 과제 and 발음 did — and `notebook` is the unit's own
  // statement of what those groups are. Nothing renders it today (the notebook UI is gone; see
  // 'Mindmap / Words notebook is gone' above), so nothing would complain if the two lists drifted,
  // which is exactly why it is asserted here. Same shape as Unit 11's check: both directions, so
  // neither a group with no words nor a category the unit never declared can slip through.
  const inUse = new Set(ww.map((w) => w.category));
  const groups = ((world.notebook && world.notebook.groups) || []).map((g) => g.cat);
  check('2B Unit 14 notebook groups match the categories in use',
    groups.every((c) => inUse.has(c)) && [...inUse].every((c) => groups.includes(c)),
    'notebook: ' + groups.join(', ') + ' | words: ' + [...inUse].join(', '));
  const dups = ww.map((w) => w.ko).filter((k, i, a) => a.indexOf(k) !== i);
  check('2B Unit 14 has no repeated headword', dups.length === 0, dups.join(', '));
  const keepKo = ww.some((w) => w.ko === '높임말[존댓말]을 하다') && ww.some((w) => w.ko === '야단(을) 맞다');
  check('2B Unit 14 keeps OBJECTIVE Korean forms', keepKo);
  const pack = JSON.parse(read(path.join('sprites', 'catalog.json')));
  const byKo = {};
  (pack.assets || []).forEach((a) => { if (a && a.wordKo) byKo[a.wordKo] = a; });
  const artMiss = [];
  ww.filter((w) => !w.artPending).forEach((w) => {
    const a = byKo[w.ko];
    if (!a || !a.id || !a.nameEn || !a.path) { artMiss.push(w.ko); return; }
    const pngRel = path.join('sprites', String(a.path).replace(/\\/g, '/'));
    if (!fs.existsSync(path.join(ROOT, pngRel))) artMiss.push(w.ko + ' png');
  });
  check('every drawn Unit 14 headword has catalogued PNG', artMiss.length === 0, artMiss.slice(0, 12).join(', '));
  // artPending is the only way out of that check, so it has to be loud. A word carrying it
  // renders as its `hint` emoji — vocabIconHtml falls back when there is no art file — so the
  // unit is playable meanwhile; this line is what stops the flag becoming permanent by being
  // forgotten. Drop the flag when the PNG lands and the check above starts covering the word.
  const pending = ww.filter((w) => w.artPending).map((w) => w.ko);
  check('Unit 14 words still waiting on art are declared, not silent',
    pending.every((ko) => ww.find((w) => w.ko === ko).hint),
    'every artPending word needs a hint emoji to render with');
  if (pending.length) console.log(`      Unit 14 awaiting art (${pending.length}): ${pending.join(', ')}`);
}());

(function checkUnit14FarmOnly() {
  const gameJs = readGameSource();
  check('textbook load path lists Unit 14 JSON', gameJs.indexOf('worlds/2b-unit-14.json') >= 0);
  check('farm preload cache key world-2b-14', gameJs.indexOf("world-2b-14") >= 0);
  check('isUnit10World stays Unit-10-only',
    /function isUnit10World\(\)[\s\S]{0,180}worldId === '2b-unit-10'/.test(gameJs));
  check('isUnit14World is declared', gameJs.indexOf('function isUnit14World') >= 0);
  check('world packs are declared',
    gameJs.indexOf('const WORLD_PACKS') >= 0 && gameJs.indexOf('function currentWorldPack') >= 0);
  check('kitchen/taste belong to the Unit 10 pack only',
    /'2b-unit-10': \{ extras: \[\], stations: \['desk', 'kitchen', 'taste', 'cassette'\] \}/.test(gameJs)
    && /'2b-unit-14': \{ extras: \[\], stations: \['desk', 'cassette'\] \}/.test(gameJs));
  check('farm applies world packs instead of hiding sprites',
    gameJs.indexOf('applyWorld') >= 0
    && gameJs.indexOf('_teardownExtra') >= 0
    && !/syncUnit10World\(\)\{[\s\S]{0,400}_setMinigameSpritesVisible/.test(gameJs));
  // Unit 14 was desk-only until its own tracks were cut; it is now the desk plus the deck,
  // the same pack shape as Units 11 and 13.
  check('Unit 14 is the desk plus the cassette player',
    /'2b-unit-14': \{ extras: \[\], stations: \['desk', 'cassette'\] \}/.test(gameJs));
  check('cassette url resolves Unit 14 to its own bank',
    /isUnit14World\(\)\) return '\/worlds\/unit14-cassette\.json'/.test(gameJs));
  // BOTH lists, for every unit, because currentWorldPack() prefers lvl.map.stations from the
  // world JSON and falls back to WORLD_PACKS only when the JSON has none. Editing the pack
  // alone therefore leaves the station not spawning while every grep says it is wired —
  // which is exactly how Unit 14's cassette player shipped invisible. Unit 11's suite has
  // asserted this for itself since it was built; nothing asserted it for the others.
  ['2b-unit-10', '2b-unit-11', '2b-unit-13', '2b-unit-14', 'topik-2'].forEach((u) => {
    const world = JSON.parse(read(path.join('worlds', u + '.json')));
    const json = ((world.level && world.level.map && world.level.map.stations) || []);
    const m = new RegExp("'" + u + "': \\{ extras: \\[\\], stations: \\[([^\\]]*)\\]").exec(gameJs);
    const pack = m ? m[1].replace(/['\s]/g, '').split(',').filter(Boolean) : null;
    check(`${u} lists the same stations in its world JSON as in WORLD_PACKS`,
      !!pack && pack.join(',') === json.join(','),
      'pack [' + (pack || []).join(',') + '] vs json [' + json.join(',') + ']');
  });
  check('study desk spawns on Unit 10 and Unit 14',
    gameJs.indexOf('_hasStudyDesk') >= 0 && gameJs.indexOf('_ensureStudyDesk') >= 0);
  const taste = gameJs.match(/case 'taste':[\s\S]{0,280}openTasteGame/);
  check('taste interact remains Unit-10-gated', !!(taste && taste[0].indexOf('_isUnit10()') >= 0));
  check('desk interact uses _hasStudyDesk',
    /_hasStudyDesk\(\)[\s\S]{0,280}openDeskQuiz/.test(gameJs));
  check('farm mouse pointer plan is shipped',
    gameJs.indexOf('function pointerWorldPlan') >= 0
    && gameJs.indexOf('_onWorldPointerDown') >= 0
    && gameJs.indexOf('pointerWorldPlan(this.player') >= 0
    && gameJs.indexOf('function nearestInRange') >= 0);
  const farmJs = read(path.join('js', 'scenes', 'farm.js'));
  check('farm world prompts are Click not SPACE',
    farmJs.indexOf('[SPACE]') < 0 && farmJs.indexOf('WORLD_CLICK_HINT') >= 0);
  check('cooking recipes still Unit-10-gated',
    /isUnit10World\(\)[\s\S]{0,80}UNIT10_COOKING_RECIPES/.test(gameJs));
}());

// ── 2B Unit 11 (운동을 좀 해 보는 게 어때요?) ─────────────────────────────────
// The unit ships as the basic farm plus the study desk: no kitchen, no taste stall,
// no workbook yet. What it does ship is the whole word list, harvested from every
// section of the chapter — 어휘, 문법과 표현, 말하기, 듣고 말하기, 읽고 쓰기, 과제,
// 문화 산책 — so the farm can teach the unit before any minigame exists.
//
// No icons are drawn for it. Unit 14's per-word artPending flag is not used here
// because it means "this one word is the exception"; for Unit 11 every word is
// waiting, so the guarantee this block enforces is the one that keeps the unit
// playable meanwhile: a hint emoji on every entry, which vocabIconHtml falls back
// to when there is no PNG. Add the word→PNG check here when the art lands.
// ── The same three coherence checks, over every world ────────────────────────
// Two words with one gloss, a category with two English names, a forms list naming its own
// headword. All three were found in the exam world and fixed there; running them over the
// units found five more categories in Unit 10 with two names apiece.
// ── The art table must not name a word twice ─────────────────────────────────
// VOCAB_ART_ROWS is built by pushing rows and skipping any ko already present, so a repeat
// is silent: the second row is simply ignored and whichever came first wins. Nine had
// accumulated across several sittings before anything looked, and the effect is that an
// edit to the visible row does nothing while the invisible one keeps deciding the picture.
// ── Every option in an exam question has to be hoverable ───────────────────
// The check done by hand in a browser after every question, run over all of them instead.
// It caught four options that no gloss touched — 가서, 꽂아 가지고, 믿더라도 and two more — and
// every one had the same cause: the entry existed from an earlier question, so the builder
// skipped it and the new form was never added.
//
// Deliberately weak: one key winning somewhere inside the option is enough. 오는 대신에 is a
// grammar point and a verb, and demanding every syllable be covered would be demanding a
// dictionary. What this catches is an option nothing touches at all.
// ── The desk quiz may not test what the paper has not taught ───────────────────
// The 20-row quiz beside the exam desk was written before most of the 27 questions existed,
// and the two grow separately. A row asking about a pattern no question introduces and no
// word list carries is asking the learner something they have not met — which is worse than
// a wrong answer key, because it reads as their fault rather than the paper's.
//
// Runs of three syllables or more only: two-syllable fragments match half the corpus and
// would make this pass no matter what the quiz said.
(function checkExamQuizTeachesFirst() {
  const wRel = path.join('worlds', 'topik-2.json');
  const bRel = path.join('worlds', 'topik2-questions.json');
  const qRel = path.join('worlds', 'topik2-desk-quiz.json');
  if (![wRel, bRel, qRel].every((r) => fs.existsSync(path.join(ROOT, r)))) return;
  let world = null, qbank = null, quiz = null;
  try {
    world = JSON.parse(read(wRel));
    qbank = JSON.parse(read(bRel));
    quiz = JSON.parse(read(qRel));
  } catch (e) { return; }
  const taught = [];
  ((world.level && world.level.words) || []).forEach((wd) => {
    [wd.ko].concat(Array.isArray(wd.forms) ? wd.forms : []).forEach((k) => taught.push(k));
  });
  (qbank.exercises || []).forEach((ex) => {
    taught.push(ex.instructionKo, ex.noteEn, ex.pattern, ex.section);
    (ex.items || []).forEach((it) => {
      taught.push(it.phraseKo, it.why, it.grammar);
      (it.lines || []).forEach((l) => taught.push(l.ko));
      (it.choices || []).forEach((c) => taught.push(c.ko));
    });
  });
  const corpus = taught.filter(Boolean)
    .map((t) => String(t).normalize('NFC')).join('  ');
  const runs = (t) => (String(t).normalize('NFC')
    .match(/[\uac00-\ud7a3]{3,}/g) || []);
  const untaught = [];
  (quiz.questions || []).forEach((q) => {
    [q.q].concat(Object.keys(q.choices || {}).map((k) => q.choices[k])).forEach((bit) => {
      runs(bit).forEach((r) => {
        if (corpus.indexOf(r) < 0) {
          const at = '#' + q.id + ' ' + r;
          if (untaught.indexOf(at) < 0) untaught.push(at);
        }
      });
    });
  });
  check('the exam desk quiz tests nothing the paper has not taught',
    untaught.length === 0, untaught.slice(0, 6).join(', '));
}());

(function checkExamChoicesGloss() {
  const wRel = path.join('worlds', 'topik-2.json');
  const bRel = path.join('worlds', 'topik2-questions.json');
  if (!fs.existsSync(path.join(ROOT, wRel)) || !fs.existsSync(path.join(ROOT, bRel))) return;
  let world = null, qbank = null;
  try { world = JSON.parse(read(wRel)); qbank = JSON.parse(read(bRel)); } catch (e) { return; }
  const keys = [];
  ((world.level && world.level.words) || []).forEach((wd) => {
    [wd.ko].concat(Array.isArray(wd.forms) ? wd.forms : []).forEach((k) => {
      const key = String(k || '').normalize('NFC').trim();
      if (key.length >= 2 && keys.indexOf(key) < 0) keys.push(key);
    });
  });
  if (!keys.length) return;
  keys.sort((a, b) => b.length - a.length);
  const esc = (k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(keys.map(esc).join('|'), 'g');
  const dark = [];
  (qbank.exercises || []).forEach((ex) => {
    // 순서 배열 offers orderings rather than sentences — '(나) - (라) - (가) - (다)' — and the
    // labels are one character each, which the gloss index drops. There is nothing to hover
    // there and nothing a learner needs to hover: the words are all in the four lines above,
    // which this check still covers. Declared on the exercise rather than sniffed out of the
    // option text, so an ordinary option that has genuinely lost its vocabulary still fails.
    if (ex.labelOptions === true) return;
    (ex.items || []).forEach((it) => {
      (it.choices || []).concat(it.choices2 || []).forEach((c) => {
        const text = String(c.ko || '').normalize('NFC');
        if (!text) return;
        re.lastIndex = 0;
        if (!re.test(text)) dark.push('q' + it.n + ' "' + text.slice(0, 22) + '"');
      });
    });
  });
  check('every exam option has at least one word a learner can hover',
    dark.length === 0, dark.slice(0, 6).join(', '));

  // The same check over the whole question, narrowed to the patterns the paper is testing.
  //
  // The broad version — every entry whose key appears must win — flagged six things and only
  // half were faults: 영향을 미치고 loses to 악영향 and 책이 to 부동산 정책, and in both the
  // learner hovers and gets a gloss that is right for what is under the cursor. Shipping a
  // check that cries wolf half the time is shipping a check nobody reads.
  //
  // So: only grammar entries, and only when no key of the entry wins anywhere in the item.
  // A pattern the question exists to test, with no gloss at all on the page that tests it,
  // is a fault every time. 에 대한 in question 17 was one — 취업 had been keyed on 취업에,
  // which ate the 에 it needed.
  const stemDark = [];
  const grammarWords = ((world.level && world.level.words) || [])
    .filter((wd) => /^[-N]/.test(String(wd.ko || '')));
  (qbank.exercises || []).forEach((ex) => {
    (ex.items || []).forEach((it) => {
      const shown = [it.phraseKo].concat((it.lines || []).map((l) => l.ko))
        .concat((it.choices || []).map((c) => c.ko));
      const onScreen = shown.filter(Boolean).map((t) => String(t).normalize('NFC')).join('  ');
      if (!onScreen) return;
      // Winners are counted on the sentence and its options only, never on the notes. The
      // first version counted the notes too, and that masked the very bug it was written
      // for: 에 대한 is named in question 17's grammar note, so the entry looked reachable
      // while the option line it belongs to had no gloss on it at all.
      const winners = new Set();
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(onScreen))) winners.add(m[0]);
      grammarWords.forEach((wd) => {
        const mine = [wd.ko].concat(Array.isArray(wd.forms) ? wd.forms : [])
          .map((k) => String(k || '').normalize('NFC').trim())
          .filter((k) => k.length >= 2);
        if (!mine.some((k) => onScreen.indexOf(k) >= 0)) return;
        if (mine.some((k) => winners.has(k))) return;
        stemDark.push('q' + it.n + ' ' + wd.ko);
      });
    });
  });
  check('and every grammar point a question uses is hoverable somewhere in that question',
    stemDark.length === 0, stemDark.slice(0, 6).join(', '));
}());

(function checkArtRowsUnique() {
  const rel = path.join('js', 'vocabArtMore.js');
  if (!fs.existsSync(path.join(ROOT, rel))) return;
  const src = read(rel);
  const kos = (src.match(/{ ko: "[^"]+"/g) || []).map((m) => m.slice(7, -1));
  check('the art table lists rows', kos.length > 200, String(kos.length));
  const seen = new Set();
  const dup = [];
  kos.forEach((k) => { if (seen.has(k)) dup.push(k); else seen.add(k); });
  check('and never names the same word twice', dup.length === 0,
    [...new Set(dup)].slice(0, 6).join(', '));
}());

(function checkEveryWorldCoheres() {
  const dir = path.join(ROOT, 'worlds');
  const files = fs.readdirSync(dir).filter((f) => /^(2b-unit-\d+|topik-2)\.json$/.test(f));
  check('there are worlds to check', files.length >= 5, String(files.length));
  const sameGloss = [];
  const catClash = [];
  const selfForm = [];
  files.forEach((f) => {
    let world = null;
    try { world = JSON.parse(read(path.join('worlds', f))); } catch (e) { return; }
    const words = (world.level && world.level.words) || [];
    const seenEn = new Map();
    const seenCat = new Map();
    words.forEach((wd) => {
      const g = String(wd.en || '').trim().toLowerCase();
      if (g) {
        if (seenEn.has(g)) sameGloss.push(f + ': ' + seenEn.get(g) + ' / ' + wd.ko);
        else seenEn.set(g, wd.ko);
      }
      if (wd.category) {
        if (!seenCat.has(wd.category)) seenCat.set(wd.category, wd.categoryEn);
        else if (seenCat.get(wd.category) !== wd.categoryEn) {
          catClash.push(f + ' ' + wd.category + ': ' + seenCat.get(wd.category)
            + ' vs ' + wd.categoryEn);
        }
      }
      if (Array.isArray(wd.forms) && wd.forms.indexOf(wd.ko) >= 0) {
        selfForm.push(f + ': ' + wd.ko);
      }
    });
  });
  check('no world gives two of its words the same gloss', sameGloss.length === 0,
    sameGloss.slice(0, 4).join(', '));
  check('and every category has one English name in the world that uses it',
    catClash.length === 0, [...new Set(catClash)].slice(0, 4).join(' | '));
  check('and no entry anywhere lists its own headword among its forms',
    selfForm.length === 0, selfForm.slice(0, 4).join(', '));
}());

(function checkUnit15World() {
  const rel = path.join('worlds', '2b-unit-15.json');
  if (!check(rel + ' exists', fs.existsSync(path.join(ROOT, rel)))) return;
  let world;
  try { world = JSON.parse(read(rel)); } catch (e) {
    check(rel + ' is valid JSON', false, e.message); return;
  }
  check('Unit 15 names itself 2b-unit-15',
    world.id === '2b-unit-15' && world.level.worldId === '2b-unit-15');
  check('and says which pages it is, so the level select can label its card',
    world.pages === 'Unit 15', String(world.pages));
  const ww = world.level.words || [];
  check('every Unit 15 word has ko / en / hint / category / categoryEn',
    ww.every((w) => w.ko && w.en && w.hint && w.category && w.categoryEn));
  const kos = ww.map((w) => w.ko);
  const dup = kos.filter((k, i) => kos.indexOf(k) !== i);
  check('and no word twice inside Unit 15', dup.length === 0, dup.join(', '));

  // The 어휘 pages draw 17 headwords — eleven life events and six change verbs — and all
  // seventeen are here whatever else in the game already carries them. Everything else
  // that collided with another unit or with levels.json was dropped, because srsData is
  // keyed by the Korean word across the whole game and two entries for one word are one
  // entry with two glosses fighting over it. This list is the fidelity claim; if a word
  // ever goes missing from it, the unit has stopped matching the book.
  const DRAWN = ['태어나다', '입학하다', '친구를 사귀다', '사랑에 빠지다', '졸업하다',
    '취직하다', '결혼하다', '아기를 낳다', '승진하다', '은퇴하다', '죽다',
    '늘다', '줄다', '오르다', '내리다', '생기다', '발전하다'];
  const missing = DRAWN.filter((k) => kos.indexOf(k) < 0);
  check('all 17 drawn 어휘 headwords are in the Unit 15 list',
    missing.length === 0, missing.join(', '));

  // Stations are declared twice — in the world JSON and in WORLD_PACKS — and the farm
  // reads whichever it finds first, so a disagreement is a station that appears on one
  // path and not the other. The tape is deliberately absent from both until the book's
  // recording exists; this check is what will make adding it to one place only fail.
  const econ15 = read(path.join('js', 'systems', 'economy.js'));
  const pack = (econ15.match(/'2b-unit-15': \{ extras: \[([^\]]*)\], stations: \[([^\]]*)\] \}/) || []);
  check('economy.js declares a pack for Unit 15', pack.length > 0);
  if (pack.length) {
    const packStations = pack[2].split(',').map((t) => t.trim().replace(/'/g, '')).filter(Boolean);
    const jsonStations = (world.level.map && world.level.map.stations) || [];
    check('and its stations match the ones in the world JSON',
      packStations.join(',') === jsonStations.join(','),
      packStations.join(',') + ' vs ' + jsonStations.join(','));
  }
  check('Unit 15 is on the list the loader walks',
    econ15.indexOf("{ cache: 'world-2b-15', file: 'worlds/2b-unit-15.json' }") >= 0);
  check('and isUnit15World is defined against the world id',
    /function isUnit15World\(\)[\s\S]{0,200}'2b-unit-15'/.test(econ15));
}());

(function checkUnit15Textbook() {
  const rel = path.join('worlds', 'unit15-textbook.json');
  if (!check(rel + ' exists', fs.existsSync(path.join(ROOT, rel)))) return;
  let bank;
  try { bank = JSON.parse(read(rel)); } catch (e) {
    check(rel + ' is valid JSON', false, e.message); return;
  }
  const exs = bank.exercises || [];
  check('the Unit 15 교과서 holds its pages', exs.length >= 10, String(exs.length));
  const ids = exs.map((e) => e.id);
  check('no two pages share an id', new Set(ids).size === ids.length);
  const thin = [];
  exs.forEach((e) => {
    (e.items || []).forEach((it) => {
      const at = e.id + '#' + it.n;
      if (!it.phraseKo || !it.en || !it.why || !it.grammar) thin.push(at + ' fields');
      if (!(it.choices || []).some((c) => c.id === it.answer)) thin.push(at + ' answer');
      if ((it.choices || []).length < 3) thin.push(at + ' choices');
      const blanks = (it.lines || []).reduce((n, l) => n + (String(l.ko).match(/\{\}/g) || []).length, 0);
      const slots = it.answer2 ? 2 : 1;
      if (blanks !== slots) thin.push(at + ' has ' + blanks + ' blanks for ' + slots);
      if (it.answer2 && !(it.choices2 || []).some((c) => c.id === it.answer2)) thin.push(at + ' answer2');
    });
  });
  check('every Unit 15 교과서 row is complete and its answer is among its choices',
    thin.length === 0, thin.slice(0, 6).join(', '));
  // 듣기 1 and 듣기 2 are absent on purpose — both ask the learner to choose after
  // listening, and the recording has not been supplied. Writing an answer key for a
  // conversation nobody can hear would mean inventing one. If a 듣기 page ever appears
  // here it has to bring an audio source with it.
  //
  // This is a tripwire for a page that does not exist yet, so `listen` is empty and the
  // check passes over nothing. That is intended, but an empty pass and a real pass read
  // identically, and a filter that quietly stopped matching would look the same again —
  // so the count goes in the message. `exs` is asserted non-empty above, which is what
  // keeps the emptiness a fact about the content rather than about the filter.
  const listen = exs.filter((e) => String(e.section || '').indexOf('듣기') >= 0
    || String(e.no || '').indexOf('듣기') >= 0);
  check(`no Unit 15 듣기 page ships without a recording (${listen.length} on the page)`,
    listen.every((e) => (e.items || []).every((it) => it.audio && it.audio.src)),
    listen.map((e) => e.id).join(', '));
}());

(function checkUnit15Cassette() {
  const rel = path.join('worlds', 'unit15-cassette.json');
  if (!check(rel + ' exists', fs.existsSync(path.join(ROOT, rel)))) return;
  let c;
  try { c = JSON.parse(read(rel)); } catch (e) {
    check(rel + ' is valid JSON', false, e.message); return;
  }
  const tracks = c.tracks || [];
  check('the Unit 15 tape holds tracks 52-61',
    tracks.map((t) => t.n).join(',') === '52,53,54,55,56,57,58,59,60,61',
    tracks.map((t) => t.n).join(','));
  // Every clip the tape names has to be a file that exists. A missing one is a button
  // that plays nothing, and the pane cannot tell the difference until it is pressed.
  const srcs = tracks.map((t) => t.src)
    .concat(((c.dictation || {}).items || []).map((i) => (i.audio || {}).src));
  const gone = srcs.filter((p) => !p || !fs.existsSync(path.join(ROOT, p)));
  check('every recording the Unit 15 tape names is on disk',
    gone.length === 0, gone.slice(0, 4).join(', '));
  // The other direction: a clip nothing points at still ships, because publish uploads
  // whatever is in audio/book. Five were left behind by the keep/drop pass the first time.
  const dir = path.join(ROOT, 'audio', 'book');
  const present = fs.readdirSync(dir).filter((f) => f.indexOf('2b-u15-') === 0)
    .map((f) => 'audio/book/' + f);
  const used = new Set(srcs.map((p) => String(p).replace(/\\/g, '/')));
  const orphans = present.filter((p) => !used.has(p));
  check('and no Unit 15 recording ships that nothing can play',
    orphans.length === 0, orphans.slice(0, 4).join(', '));

  const scripted = tracks.filter((t) => (t.lines || []).length);
  const silent = tracks.filter((t) => !(t.lines || []).length);
  check('seven Unit 15 tracks carry their printed script',
    scripted.length === 7, String(scripted.length));
  // 57, 58 and 59 have no Korean here — 말하기 2's page was not photographed and the two
  // 듣기 transcripts live on the 듣기 지문 pages. A track with no script has to say so on
  // screen rather than open an empty pane.
  check('and the three without one explain why, on the track itself',
    silent.length === 3 && silent.every((t) => String(t.noteEn || '').length > 40),
    silent.map((t) => t.n).join(','));
  check('no dictation line is drawn from a track with no script',
    ((c.dictation || {}).items || []).every((i) => [57, 58, 59].indexOf(i.track) < 0));

  const items = (c.dictation || {}).items || [];
  check('the Unit 15 dictation set is worth sitting down to', items.length >= 20,
    String(items.length));
  const thin = items.filter((i) => !i.ko || !i.en || !i.why || !(i.tags || []).length
    || !i.audio || !i.audio.src);
  check('every dictation line has its text, its meaning, its reason and its clip',
    thin.length === 0, thin.slice(0, 4).map((i) => i.id).join(', '));
  // A syllable count that does not match the clip means the clip holds different words.
  // The band is calibrated to this tape rather than guessed: the 21 lines on it run 3.6 to
  // 6.3 syllables a second, so the guard sits just outside that. It has to be that tight to
  // be worth anything — the bug it exists for, the 발음 item numbers being cut into the
  // sentence, read 3.14, and a floor of 3.0 waved it through when it was probed.
  const syl = (t) => (String(t).match(/[\uac00-\ud7a3]/g) || []).length;
  const off = items.filter((i) => {
    if (syl(i.ko) !== i.syl) return true;
    const r = i.syl / i.audio.voiced;
    return !(r > 3.4 && r < 6.8) || Math.abs(r - i.audio.rate) > 0.05;
  }).map((i) => i.id + ' (' + (i.syl / i.audio.voiced).toFixed(1) + '/s)');
  check('and a length that matches the words it claims to hold',
    off.length === 0, off.slice(0, 5).join(', '));
  const long = items.filter((i) => i.syl > 24 || i.syl < 7).map((i) => i.id + ':' + i.syl);
  check('every line is between 7 and 24 syllables, as the filter says',
    long.length === 0, long.join(', '));
  const ids = items.map((i) => i.id);
  check('and the ids run without a gap or a repeat',
    ids.join(',') === ids.map((_, k) => k + 1).join(','));

  const uiTape = read(path.join('js', 'ui.js'));
  check('the desk offers the Unit 15 tape on the Unit 15 world',
    uiTape.indexOf("isUnit15World()) return '/worlds/unit15-cassette.json'") >= 0);
}());

(function checkUnit15DeskQuiz() {
  const rel = path.join('worlds', 'unit15-desk-quiz.json');
  if (!check(rel + ' exists', fs.existsSync(path.join(ROOT, rel)))) return;
  let q;
  try { q = JSON.parse(read(rel)); } catch (e) {
    check(rel + ' is valid JSON', false, e.message); return;
  }
  const rows = q.questions || [];
  check('the Unit 15 quiz has more rows than a session, so two sittings differ',
    rows.length > (q.sessionSize || 10), rows.length + ' rows, session ' + q.sessionSize);
  const bad = rows.filter((r) => {
    const vals = Object.keys(r.choices || {}).map((k) => r.choices[k]);
    return vals.length !== 4 || new Set(vals).size !== 4 || !r.choices[r.a];
  }).map((r) => r.id);
  check('every row has four distinct choices and an answer among them',
    bad.length === 0, bad.join(', '));
  const keys = rows.map((r) => r.a).join('');
  check('and the answers are spread over at least three letters',
    new Set(keys.split('')).size >= 3, keys);
  const artMissing = rows.filter((r) => {
    if (!r.art || !String(r.art).startsWith('quiz/')) return true;
    return !fs.existsSync(path.join(ROOT, 'sprites', String(r.art).replace(/\\/g, '/')));
  }).map((r) => r.id);
  check('every Unit 15 quiz row names a quiz PNG that is on disk',
    artMissing.length === 0, artMissing.slice(0, 6).join(', '));
}());

(function checkUnit11World() {
  const rel = path.join('worlds', '2b-unit-11.json');
  const full = path.join(ROOT, rel);
  if (!check(`${rel} exists`, fs.existsSync(full))) return;
  let world;
  try { world = JSON.parse(fs.readFileSync(full, 'utf8')); }
  catch (e) { check(`${rel} is valid JSON`, false, e.message); return; }
  check('2B Unit 11 has an id and a level',
    !!(world.id === '2b-unit-11' && world.level && Array.isArray(world.level.words)));
  const ww = (world.level && world.level.words) || [];
  const missing = ww.filter((w) => !w.ko || !w.en || !w.category || !w.categoryEn).map((w) => w.ko || '?');
  check('2B Unit 11 words have ko / en / category / categoryEn', missing.length === 0, missing.slice(0, 5).join(', '));
  check('2B Unit 11 carries the whole-unit word list', ww.length === 155, `found ${ww.length}`);
  const noHint = ww.filter((w) => !w.hint).map((w) => w.ko);
  check('every Unit 11 word renders as a hint emoji until its icon is drawn',
    noHint.length === 0, noHint.slice(0, 8).join(', '));
  check('2B Unit 11 declares no artPending exemptions',
    ww.every((w) => !w.artPending),
    'the unit is art-pending as a whole; the per-word flag belongs to Unit 14');
  const cats = new Set(ww.map((w) => w.category));
  const want = ['증상', '병원', '약', '문법과 표현', '회화', '듣고 말하기', '읽고 쓰기', '문화'];
  check('2B Unit 11 has eight vocab groups, one per textbook section',
    want.length === cats.size && want.every((c) => cats.has(c)), [...cats].join(', '));
  const groups = ((world.notebook && world.notebook.groups) || []).map((g) => g.cat);
  check('2B Unit 11 notebook groups match the categories in use',
    want.every((c) => groups.includes(c)) && groups.every((c) => cats.has(c)), groups.join(', '));
  const dups = ww.map((w) => w.ko).filter((k, i, a) => a.indexOf(k) !== i);
  check('2B Unit 11 has no repeated headword', dups.length === 0, dups.join(', '));
  // A word in two units is invisible: it just quietly turns up in the wrong farm, and the
  // SRS state is keyed by the Korean, so the two farms would share one review schedule.
  // Where the chapter re-uses a word an earlier unit already owns (고기, 생선, 주말, 처음,
  // 수영을 하다), the earlier unit keeps it and Unit 11 leaves it out.
  ['2b-unit-10', '2b-unit-14'].forEach((other) => {
    const of = path.join(ROOT, 'worlds', other + '.json');
    if (!fs.existsSync(of)) return;
    const owned = new Set((JSON.parse(fs.readFileSync(of, 'utf8')).level.words || []).map((w) => w.ko));
    const shared = ww.map((w) => w.ko).filter((ko) => owned.has(ko));
    check(`2B Unit 11 shares no headword with ${other}`, shared.length === 0, shared.join(', '));
  });
}());

(function checkUnit11FarmAndDesk() {
  const gameJs = readGameSource();
  check('textbook load path lists Unit 11 JSON', gameJs.indexOf('worlds/2b-unit-11.json') >= 0);
  check('farm preload cache key world-2b-11', gameJs.indexOf('world-2b-11') >= 0);
  check('isUnit11World is declared and Unit-11-only',
    /function isUnit11World\(\)[\s\S]{0,180}worldId === '2b-unit-11'/.test(gameJs));
  check('Unit 11 is the basic farm plus the desk and the cassette player',
    /'2b-unit-11': \{ extras: \[\], stations: \['desk', 'cassette'\] \}/.test(gameJs));
  // Membership of the desk-only art branch, not the whole condition. Pinning the
  // literal `'2b-unit-11' || '2b-unit-14'` failed the moment Unit 13 joined that same
  // branch — a correct edit breaking a check about a different unit. What matters is
  // that Unit 11 is in the branch that loads only the desk; which other units share
  // it is their business, and the driven test in tests/test_unit11_world.js is what
  // actually asserts the resulting list has one entry.
  // Matching on "starts with study_desk_hd" is not enough — the Unit 10 branch does
  // too, and being the first match it is what exec returns. The branch wanted is the
  // one whose returned list holds exactly one texture.
  const branches = [...gameJs.matchAll(/if \((id === '2b-unit-[0-9]+'(?: \|\| id === '2b-unit-[0-9]+')*)\) \{\s*return \[([\s\S]*?)\];/g)];
  const deskOnly = branches.filter((m) => (m[2].match(/\{ key:/g) || []).length === 1
    && m[2].indexOf("'study_desk_hd'") >= 0);
  check('Unit 11 loads the study desk art and nothing else',
    deskOnly.some((m) => m[1].indexOf("'2b-unit-11'") >= 0),
    branches.length + ' art branches, ' + deskOnly.length + ' desk-only');
  // Without this line the desk on Unit 11 opens Unit 10's dish quiz, which reads as
  // working software right up to the first question.
  check('desk quiz url resolves Unit 11 to its own bank',
    /isUnit11World\(\)\) return '\/worlds\/unit11-desk-quiz\.json'/.test(gameJs));
  const ttsSrc = read(path.join('scripts', 'ttsClips.js'));
  check('TTS harvest covers the Unit 11 word list and desk quiz',
    ttsSrc.indexOf('worlds/2b-unit-11.json') >= 0 && ttsSrc.indexOf('worlds/unit11-desk-quiz.json') >= 0);
}());

(function checkUnit11DeskQuiz() {
  const rel = path.join('worlds', 'unit11-desk-quiz.json');
  const full = path.join(ROOT, rel);
  if (!check(`${rel} exists`, fs.existsSync(full))) return;
  let bank;
  try { bank = JSON.parse(fs.readFileSync(full, 'utf8')); }
  catch (e) { check(`${rel} is valid JSON`, false, e.message); return; }
  const qs = (bank && bank.questions) || [];
  check('Unit 11 desk quiz has 13 questions', qs.length === 13, `found ${qs.length}`);
  check('Unit 11 desk quiz plays 10 of them', bank.sessionSize === 10, String(bank.sessionSize));
  const ids = new Set();
  const bad = [];
  qs.forEach((q, i) => {
    if (!q || typeof q.id !== 'number') bad.push(`q${i} missing id`);
    else if (ids.has(q.id)) bad.push(`duplicate id ${q.id}`);
    else ids.add(q.id);
    if (!q.q) bad.push(`q${q && q.id} has no prompt`);
    const keys = Object.keys((q && q.choices) || {}).sort().join('');
    if (keys !== 'ABCD') bad.push(`q${q && q.id} choices are ${keys || 'missing'}`);
    if (!q || !q.choices || !q.choices[q.a]) bad.push(`q${q && q.id} answer ${q && q.a} is not a choice`);
    if (!q || !q.art || !String(q.art).startsWith('quiz/')) bad.push(`q${q && q.id} missing quiz art`);
    else if (!fs.existsSync(path.join(ROOT, 'sprites', String(q.art).replace(/\\/g, '/')))) {
      bad.push(`q${q.id} art missing`);
    }
  });
  check('Unit 11 desk quiz rows are complete with art', bad.length === 0, bad.slice(0, 6).join(', '));
}());

// ── Unit 11 cassette player ──────────────────────────────────────────────────
// The station plays the textbook's own recordings and runs dictation off them, so
// what this block guards is the join between three things that are edited apart:
// the curated sentences, the mp3s cut for them, and the upload batch. A clip the
// content names but the batch omits is a play button that does nothing on the
// deployed site, and nothing about it looks broken until you press it.
(function checkUnit11Cassette() {
  const rel = path.join('worlds', 'unit11-cassette.json');
  const full = path.join(ROOT, rel);
  if (!check(`${rel} exists`, fs.existsSync(full))) return;
  let c;
  try { c = JSON.parse(fs.readFileSync(full, 'utf8')); }
  catch (e) { check(`${rel} is valid JSON`, false, e.message); return; }
  check('cassette content belongs to Unit 11', c.unit === '2b-unit-11', String(c.unit));

  const tracks = c.tracks || [];
  check('all eight Unit 11 tracks are listed', tracks.length === 8, `found ${tracks.length}`);
  check('the tracks are 12 through 19',
    tracks.map((t) => t.n).join(',') === '12,13,14,15,16,17,18,19', tracks.map((t) => t.n).join(','));
  const noFile = tracks.filter((t) => !fs.existsSync(path.join(ROOT, t.src || ''))).map((t) => t.n);
  check('every track has its mp3 on disk', noFile.length === 0, 'missing for track ' + noFile.join(','));
  // 18 and 19 are the listening sections: the book prints their questions but not
  // their script. They must stay scriptless AND say why, or the pane reads as a bug.
  // Was six of eight, 18 and 19 being listen-only. The 듣기 지문 printed at the back of
  // the book gives those two a transcript, so every track is scripted now.
  const scripted = tracks.filter((t) => Array.isArray(t.lines));
  check('every Unit 11 track carries a script', scripted.length === tracks.length, `${scripted.length} of ${tracks.length}`);
  check('so no Unit 11 track needs a no-script note', tracks.every((t) => !t.noteEn),
    tracks.filter((t) => t.noteEn).map((t) => t.n).join(','));

  const items = (c.dictation && c.dictation.items) || [];
  check('47 dictation sentences', items.length === 47, `found ${items.length}`);
  const bad = items.filter((i) => !i.ko || !i.en || !i.why || !i.tags || !i.audio || !i.audio.src).map((i) => i.id);
  check('every sentence has text, gloss, reason, tags and a clip', bad.length === 0, 'id ' + bad.join(','));
  const clipMiss = items.filter((i) => !fs.existsSync(path.join(ROOT, i.audio.src))).map((i) => i.audio.src);
  check('every dictation clip is on disk', clipMiss.length === 0, clipMiss.slice(0, 5).join(', '));
  // Dictation is checked against this string, so it has to be the Korean the clip
  // actually says. A sentence drawn from a track with no printed script could not be.
  const scriptedNs = new Set(scripted.map((t) => t.n));
  const orphan = items.filter((i) => !scriptedNs.has(i.track)).map((i) => i.id);
  check('no sentence comes from a listen-only track', orphan.length === 0, 'id ' + orphan.join(','));
  // The filter is content: it is what makes the set defensible rather than arbitrary,
  // and it is shown on the page.
  const f = (c.dictation && c.dictation.filter) || {};
  check('the selection rule ships with the set',
    Array.isArray(f.keep) && f.keep.length >= 3 && Array.isArray(f.drop) && f.drop.length >= 3);
  const syl = (t) => [...String(t).normalize('NFC')].filter((ch) => ch >= '가' && ch <= '힣').length;
  const wrong = items.filter((i) => syl(i.ko) !== i.syl).map((i) => i.id);
  check('each stated syllable count matches its Korean', wrong.length === 0, 'id ' + wrong.join(','));
  const outside = items.filter((i) => syl(i.ko) < 5 || syl(i.ko) > 22).map((i) => i.id);
  check('every sentence sits in the 5-22 syllable band the filter claims',
    outside.length === 0, 'id ' + outside.join(','));
  // A split row must name the printed turn it came out of, so the change of shape is
  // visible rather than looking like the book prints short lines.
  const splits = items.filter((i) => i.splitFrom);
  check('rows split from a longer turn say so', splits.length === 13, `found ${splits.length}`);
  check('and each split row is a substring of the turn it names',
    splits.every((i) => i.splitFrom.replace(/\s/g, '').indexOf(i.ko.replace(/\s/g, '')) >= 0));
}());

(function checkUnit11CassetteWiring() {
  const gameJs = readGameSource();
  check('the cassette uses only its reviewed sprite',
    /hdKey: 'cassette_player_hd'/.test(gameJs)
    && /const tex = this\._reviewedTex\(hdKey\)/.test(gameJs)
    && !/createTexture\(this, 'cassette_player'/.test(gameJs));
  check('the cassette spawns and tears down with the pack',
    gameJs.indexOf('_ensureCassette') >= 0 && gameJs.indexOf('_teardownCassette') >= 0
    && /stations\.indexOf\('cassette'\) >= 0/.test(gameJs));
  check('interacting with it opens the player', /case 'cassette':[\s\S]{0,120}openCassette/.test(gameJs));
  check('the cassette has a layout slot of its own',
    /id: 'cassette'[\s\S]{0,120}ox: 300/.test(gameJs));
  check('the player UI is shipped',
    gameJs.indexOf('function openCassette') >= 0 && gameJs.indexOf('function renderDictation') >= 0);
  // Music comes off while any study screen is open; a new one has to join that list
  // or the score plays over the recording you are trying to hear.
  check('the cassette screens quiet the score',
    /STUDY_OVERLAYS = \[[^\]]*cassette-overlay/.test(gameJs));
  const layout = JSON.parse(read(path.join('worlds', 'unit10-layout.json')));
  const st = (layout.stations || []).find((x) => x && x.id === 'cassette');
  check('the shared layout file carries the cassette too', !!st);
  const spots = {};
  let clash = '';
  (layout.stations || []).forEach((x) => {
    const k = x.ox + ',' + x.oy;
    if (spots[k]) clash = x.id + ' sits on ' + spots[k];
    spots[k] = x.id;
  });
  check('no two stations share a spot on the farm', !clash, clash);
}());

(function checkUnit11CassetteUploads() {
  // The trap this exists for: the collector used to reach only into a workbook's
  // exercises, so the cassette's clips — named by a file that is not a workbook —
  // would have been uploaded nowhere while everything on disk looked right.
  const { collectUploadFiles } = require(path.join(ROOT, 'scripts', 'r2Content.js'));
  const batch = new Set(collectUploadFiles(ROOT).map((f) => f.rel.replace(/\\/g, '/')));
  const c = JSON.parse(read(path.join('worlds', 'unit11-cassette.json')));
  const named = [...(c.tracks || []).map((t) => t.src),
    ...((c.dictation && c.dictation.items) || []).map((i) => i.audio.src)];
  const absent = named.filter((s) => !batch.has(s));
  check(`all ${named.length} cassette recordings are in the upload batch`,
    absent.length === 0, absent.slice(0, 6).join(', '));
  check('the cassette content file itself publishes too',
    batch.has('worlds/unit11-cassette.json'));
}());

// ── 2B Unit 13 (주변이 조용해서 살기 좋아요) ─────────────────────────────────
// Same shape as Unit 11: the whole-chapter word list, the desk, and the cassette
// player with the book's own recordings behind it.
(function checkUnit13World() {
  const rel = path.join('worlds', '2b-unit-13.json');
  if (!check(`${rel} exists`, fs.existsSync(path.join(ROOT, rel)))) return;
  let world;
  try { world = JSON.parse(read(rel)); } catch (e) { check(`${rel} is valid JSON`, false, e.message); return; }
  check('2B Unit 13 has an id and a level',
    !!(world.id === '2b-unit-13' && world.level && Array.isArray(world.level.words)));
  const ww = world.level.words || [];
  const missing = ww.filter((w) => !w.ko || !w.en || !w.category || !w.categoryEn).map((w) => w.ko || '?');
  check('2B Unit 13 words have ko / en / category / categoryEn', missing.length === 0, missing.slice(0, 5).join(', '));
  check('2B Unit 13 carries the whole-unit word list', ww.length === 104, `found ${ww.length}`);
  const noHint = ww.filter((w) => !w.hint).map((w) => w.ko);
  check('every Unit 13 word renders as a hint emoji until its icon is drawn',
    noHint.length === 0, noHint.slice(0, 8).join(', '));
  const want = ['주거', '집 조건', '생활비', '부동산', '문법과 표현', '읽고 쓰기', '과제', '문화와 발음'];
  const cats = new Set(ww.map((w) => w.category));
  check('2B Unit 13 has eight vocab groups, one per textbook section',
    want.length === cats.size && want.every((c) => cats.has(c)), [...cats].join(', '));
  const dups = ww.map((w) => w.ko).filter((k, i, a) => a.indexOf(k) !== i);
  check('2B Unit 13 has no repeated headword', dups.length === 0, dups.join(', '));
  // Three neighbours now, and the SRS state is keyed by the Korean, so one word in two
  // farms means one review schedule shared between them with nothing saying so.
  ['2b-unit-10', '2b-unit-11', '2b-unit-14'].forEach((other) => {
    const owned = new Set((JSON.parse(read(path.join('worlds', other + '.json'))).level.words || []).map((w) => w.ko));
    const shared = ww.map((w) => w.ko).filter((ko) => owned.has(ko));
    check(`2B Unit 13 shares no headword with ${other}`, shared.length === 0, shared.join(', '));
  });
}());

(function checkUnit13Wiring() {
  const gameJs = readGameSource();
  check('textbook load path lists Unit 13 JSON', gameJs.indexOf('worlds/2b-unit-13.json') >= 0);
  check('farm preload cache key world-2b-13', gameJs.indexOf('world-2b-13') >= 0);
  check('isUnit13World is declared and Unit-13-only',
    /function isUnit13World\(\)[\s\S]{0,180}worldId === '2b-unit-13'/.test(gameJs));
  check('Unit 13 is the basic farm plus the desk and the cassette player',
    /'2b-unit-13': \{ extras: \[\], stations: \['desk', 'cassette'\] \}/.test(gameJs));
  check('desk quiz url resolves Unit 13 to its own bank',
    /isUnit13World\(\)\) return '\/worlds\/unit13-desk-quiz\.json'/.test(gameJs));
  check('cassette url resolves Unit 13 to its own bank',
    /isUnit13World\(\)\) return '\/worlds\/unit13-cassette\.json'/.test(gameJs));
  const ttsSrc = read(path.join('scripts', 'ttsClips.js'));
  check('TTS harvest covers Unit 13',
    ttsSrc.indexOf('worlds/2b-unit-13.json') >= 0 && ttsSrc.indexOf('worlds/unit13-desk-quiz.json') >= 0);
}());

(function checkUnit13Cassette() {
  const rel = path.join('worlds', 'unit13-cassette.json');
  if (!check(`${rel} exists`, fs.existsSync(path.join(ROOT, rel)))) return;
  const c = JSON.parse(read(rel));
  check('cassette content belongs to Unit 13', c.unit === '2b-unit-13', String(c.unit));
  const tracks = c.tracks || [];
  check('all ten Unit 13 tracks are listed', tracks.length === 10, `found ${tracks.length}`);
  check('the tracks are 32 through 41',
    tracks.map((t) => t.n).join(',') === '32,33,34,35,36,37,38,39,40,41', tracks.map((t) => t.n).join(','));
  const noFile = tracks.filter((t) => !fs.existsSync(path.join(ROOT, t.src || ''))).map((t) => t.n);
  check('every Unit 13 track has its mp3 on disk', noFile.length === 0, 'missing for ' + noFile.join(','));
  check('every Unit 13 track carries a script',
    tracks.every((t) => Array.isArray(t.lines)), tracks.filter((t) => !t.lines).map((t) => t.n).join(','));
  check('so no Unit 13 track needs a no-script note', tracks.every((t) => !t.noteEn),
    tracks.filter((t) => t.noteEn).map((t) => t.n).join(','));
  const items = (c.dictation && c.dictation.items) || [];
  check('60 dictation sentences', items.length === 60, `found ${items.length}`);
  const bad = items.filter((i) => !i.ko || !i.en || !i.why || !(i.tags || []).length || !i.audio || !i.audio.src).map((i) => i.id);
  check('every Unit 13 sentence is complete', bad.length === 0, 'id ' + bad.join(','));
  const clipMiss = items.filter((i) => !fs.existsSync(path.join(ROOT, i.audio.src))).map((i) => i.audio.src);
  check('every Unit 13 dictation clip is on disk', clipMiss.length === 0, clipMiss.slice(0, 5).join(', '));
  const scripted = new Set(tracks.filter((t) => Array.isArray(t.lines)).map((t) => t.n));
  check('no Unit 13 sentence comes from a listen-only track', items.every((i) => scripted.has(i.track)));
  const syl = (t) => [...String(t).normalize('NFC')].filter((ch) => ch >= '가' && ch <= '힣').length;
  const off = items.filter((i) => syl(i.ko) !== i.syl || syl(i.ko) < 5 || syl(i.ko) > 22).map((i) => i.id);
  check('every Unit 13 sentence is 5-22 syllables and says so truthfully', off.length === 0, 'id ' + off.join(','));
  // The unit's 발음 page is 유기음화, so the set should lean on it — that is the point of
  // choosing these sentences rather than any others.
  const asp = items.filter((i) => (i.tags || []).indexOf('유기음화') >= 0).length;
  check('the set leans on this unit’s own aspiration rule', asp >= 8, asp + ' of ' + items.length);
}());

// ── 2B Unit 14 cassette (예의를 지켜요, tracks 42-51) ─────────────────────────
// Nine of the ten are scripted. The 듣기 지문 pages at the back supplied 48 and 49, the same
// way they did for Units 11 and 13; 47 is the one left, because the unit page draws that
// conversation and the 번역 page gives it in English only, so there is nothing to check an
// answer against. That count is pinned rather than tolerated: adding the last script is then
// a deliberate edit here too.
(function checkUnit14Cassette() {
  const rel = path.join('worlds', 'unit14-cassette.json');
  if (!check(`${rel} exists`, fs.existsSync(path.join(ROOT, rel)))) return;
  const c = JSON.parse(read(rel));
  check('cassette content belongs to Unit 14', c.unit === '2b-unit-14', String(c.unit));
  const tracks = c.tracks || [];
  check('all ten Unit 14 tracks are listed', tracks.length === 10, `found ${tracks.length}`);
  check('the tracks are 42 through 51',
    tracks.map((t) => t.n).join(',') === '42,43,44,45,46,47,48,49,50,51', tracks.map((t) => t.n).join(','));
  const noFile = tracks.filter((t) => !fs.existsSync(path.join(ROOT, t.src || ''))).map((t) => t.n);
  check('every Unit 14 track has its mp3 on disk', noFile.length === 0, 'missing for ' + noFile.join(','));
  const scriptedTracks = tracks.filter((t) => Array.isArray(t.lines));
  check('nine Unit 14 tracks carry a script', scriptedTracks.length === 9,
    scriptedTracks.map((t) => t.n).join(','));
  const silent = tracks.filter((t) => !Array.isArray(t.lines));
  check('and the one scriptless track is 47',
    silent.map((t) => t.n).join(',') === '47', silent.map((t) => t.n).join(','));
  // A blank pane reads as a bug, so the renderer prints noteEn instead — which only works
  // if every scriptless track actually has one.
  check('every scriptless Unit 14 track says why it is silent',
    silent.every((t) => typeof t.noteEn === 'string' && t.noteEn.length > 20),
    silent.filter((t) => !t.noteEn).map((t) => t.n).join(','));
  const items = (c.dictation && c.dictation.items) || [];
  check('32 dictation sentences', items.length === 32, `found ${items.length}`);
  const bad = items.filter((i) => !i.ko || !i.en || !i.why || !(i.tags || []).length || !i.audio || !i.audio.src).map((i) => i.id);
  check('every Unit 14 sentence is complete', bad.length === 0, 'id ' + bad.join(','));
  const clipMiss = items.filter((i) => !fs.existsSync(path.join(ROOT, i.audio.src))).map((i) => i.audio.src);
  check('every Unit 14 dictation clip is on disk', clipMiss.length === 0, clipMiss.slice(0, 5).join(', '));
  const scripted = new Set(scriptedTracks.map((t) => t.n));
  check('no Unit 14 sentence comes from a listen-only track', items.every((i) => scripted.has(i.track)),
    items.filter((i) => !scripted.has(i.track)).map((i) => i.id).join(','));
  // 24 rather than Unit 11's 22, and the filter printed on the page says so: this unit's
  // 말하기 turns are longer, and trimming a printed line to fit a cap is not on offer.
  const syl = (t) => [...String(t).normalize('NFC')].filter((ch) => ch >= '가' && ch <= '힣').length;
  const off = items.filter((i) => syl(i.ko) !== i.syl || syl(i.ko) < 5 || syl(i.ko) > 24).map((i) => i.id);
  check('every Unit 14 sentence is 5-24 syllables and says so truthfully', off.length === 0, 'id ' + off.join(','));
  // The unit's 발음 page is ㄱ/ㄷ/ㅈ tensing after a ㄴ or ㅁ stem final, so the set should lean
  // on it — that is the reason for choosing these sentences over any others. Matched on the
  // exact tag, not on a 경음화 prefix: the set also carries tensing after ㄱ and after ㄷ, which
  // are different environments, and counting those would let the unit's own rule thin out
  // while the number stayed put.
  const RULE = '경음화 (ㄴ, ㅁ 뒤)';
  const tense = items.filter((i) => (i.tags || []).indexOf(RULE) >= 0).length;
  check('the set leans on this unit’s own tensing rule', tense >= 6, tense + ' of ' + items.length);
  const looseTag = items.filter((i) => (i.tags || []).some((t) => t === '경음화')).map((i) => i.id);
  check('and every 경음화 tag names the environment it happens in',
    looseTag.length === 0, 'id ' + looseTag.join(','));
  // A split row is a claim about its parent, and the claim is checkable.
  const liar = items.filter((i) => i.splitFrom && String(i.splitFrom).indexOf(i.ko) < 0).map((i) => i.id);
  check('every Unit 14 split row really is part of the turn it names', liar.length === 0, 'id ' + liar.join(','));
}());

// ── Unit 10 desk quiz ────────────────────────────────────────────────────────
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
    if (!q.art || !String(q.art).startsWith('quiz/')) bad.push(`q${q.id} missing quiz art`);
    else {
      const pngRel = path.join('sprites', String(q.art).replace(/\\/g, '/'));
      if (!fs.existsSync(path.join(ROOT, pngRel))) bad.push(`q${q.id} art missing`);
    }
  });
  check('desk quiz items are well-formed English MCQs with art', bad.length === 0, bad.slice(0, 6).join(', '));
}());

(function checkUnit14DeskQuiz() {
  const rel = path.join('worlds', 'unit14-desk-quiz.json');
  const full = path.join(ROOT, rel);
  if (!check(`${rel} exists`, fs.existsSync(full))) return;
  let bank;
  try { bank = JSON.parse(fs.readFileSync(full, 'utf8')); }
  catch (e) { check(`${rel} is valid JSON`, false, e.message); return; }
  const qs = (bank && bank.questions) || [];
  check('Unit 14 desk quiz has 10 questions', qs.length === 10, `found ${qs.length}`);
  check('Unit 14 desk quiz session is 10 questions', bank.sessionSize === 10, String(bank.sessionSize));
  check('desk quiz loads Unit 14 JSON on that world',
    gameJs.indexOf('unit14-desk-quiz.json') >= 0 && gameJs.indexOf('function deskQuizUrl') >= 0);
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
    if (!q.art || !String(q.art).startsWith('quiz/')) bad.push(`q${q.id} missing quiz art`);
    else {
      const pngRel = path.join('sprites', String(q.art).replace(/\\/g, '/'));
      if (!fs.existsSync(path.join(ROOT, pngRel))) bad.push(`q${q.id} art missing`);
    }
  });
  check('Unit 14 desk quiz items are well-formed with art', bad.length === 0, bad.slice(0, 8).join(', '));
}());

// ── 2B 교과서 pages (Units 10 and 14) ───────────────────────────────
// The study desk carries two sets of pages from two different books: 연습 문제 is the
// 익힘책, and this is the 교과서's own 말하기 / 읽기 / 과제 / 문화 산책 / 발음 / 자기 평가.
// Same file format, same renderer, one desk — which is precisely why the two have to be
// checked against each other. Two books drilling one chapter will reach for the same
// sentence unless something says they may not, and a learner who meets 먹으면 안 돼요 twice
// under two names has been given one exercise and charged for two.
//
// Both units run the same checks. Unit 14 came first and Unit 10 followed; the counts are
// the only thing that differs between them, so they are the only thing spelled out per unit.
(function checkTextbookBanks() {
  const BANKS = [
    { unit: 'unit14', label: 'Unit 14', world: 'isUnit14World', exs: 9, rows: 41 },
    { unit: 'unit10', label: 'Unit 10', world: 'isUnit10World', exs: 7, rows: 30 }
  ];
  const TYPES = ['fill', 'match', 'dialogue', 'experience', 'build'];
  const gameJs = readGameSource();
  const wbLib = read(path.join('admin', 'lib', 'workbook.js'));
  let anyBank = false;

  BANKS.forEach((bank) => {
    const U = bank.label + ': ';
    const rel = path.join('worlds', bank.unit + '-textbook.json');
    if (!check(U + rel + ' exists', fs.existsSync(path.join(ROOT, rel)))) return;
    let tb;
    try { tb = JSON.parse(read(rel)); } catch (e) { check(U + rel + ' is valid JSON', false, e.message); return; }
    anyBank = true;
    check(U + 'the 교과서 bank knows which book it is from',
      tb.id === bank.unit + '-textbook' && /교과서/.test(tb.source || ''),
      String(tb.id) + ' | ' + String(tb.source));
    check(U + 'and the desk labels it 교과서', tb.titleKo === '교과서' && tb.titleEn === 'Textbook',
      String(tb.titleKo) + ' / ' + String(tb.titleEn));
    const exs = tb.exercises || [];
    check(U + bank.exs + ' 교과서 exercises', exs.length === bank.exs, 'found ' + exs.length);
    const rows = exs.reduce((n, e) => n + ((e.items || []).length), 0);
    check(U + bank.rows + ' rows across them', rows === bank.rows, 'found ' + rows);
    const structure = [];
    const ids = new Set();
    exs.forEach((ex) => {
      if (!ex.id || ids.has(ex.id)) structure.push('id ' + ex.id);
      ids.add(ex.id);
      if (TYPES.indexOf(ex.type) < 0) structure.push(ex.id + ' type ' + ex.type);
      if (!ex.no || !ex.instructionKo) structure.push(ex.id + ' heading');
      if (!ex.noteEn) structure.push(ex.id + ' noteEn');
      (ex.items || []).forEach((it, k) => {
        const at = ex.id + ' row ' + (k + 1);
        if (!it.why || !it.grammar || !it.en) structure.push(at + ' prose');
        const sets = (it.choices2 || it.answer2) ? 2 : 1;
        const gaps = (it.lines || []).reduce((n, l) => n + String(l.ko || '').split('{}').length - 1, 0);
        if (gaps !== sets) structure.push(at + ' has ' + gaps + ' blanks for ' + sets + ' choice sets');
        if (!(it.choices || []).some((c) => c.id === it.answer)) structure.push(at + ' answer');
        if (sets === 2 && !(it.choices2 || []).some((c) => c.id === it.answer2)) structure.push(at + ' answer2');
      });
    });
    check(U + 'every 교과서 row is complete and fillable', structure.length === 0, structure.slice(0, 6).join(', '));
    // Every reshaped exercise says so. The book asks for a lot of these out loud, and a
    // learner comparing the page to the screen deserves to be told what changed.
    check(U + 'every 교과서 exercise says how it differs from the printed page',
      exs.every((ex) => String(ex.noteEn).length > 60),
      exs.filter((ex) => String(ex.noteEn).length <= 60).map((ex) => ex.id).join(', '));

    const wbRel = path.join('worlds', bank.unit + '-workbook.json');
    if (fs.existsSync(path.join(ROOT, wbRel))) {
      const wb = JSON.parse(read(wbRel));
      const wbIds = new Set((wb.exercises || []).map((e) => e.id));
      const idClash = [...ids].filter((id) => wbIds.has(id));
      check(U + 'no 교과서 exercise reuses a 연습 문제 exercise id', idClash.length === 0, idClash.join(', '));
      const lineSet = (b) => {
        const out = new Set();
        (b.exercises || []).forEach((ex) => (ex.items || []).forEach((it) => {
          (it.lines || []).forEach((l) => {
            const t = String(l.ko || '').normalize('NFC').trim();
            if (t.indexOf('{}') >= 0 && t.replace(/\{\}/g, '').length > 6) out.add(t);
          });
        }));
        return out;
      };
      const wbLines = lineSet(wb);
      const shared = [...lineSet(tb)].filter((t) => wbLines.has(t));
      check(U + 'and no 교과서 row drills the same gapped sentence as a 연습 문제 row',
        shared.length === 0, shared.slice(0, 3).join(' | '));
    }

    const clips = [];
    const walkAudio = (n) => {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n)) { n.forEach(walkAudio); return; }
      if (typeof n.src === 'string' && n.src.indexOf('audio/') === 0) clips.push(n);
      Object.keys(n).forEach((k) => walkAudio(n[k]));
    };
    walkAudio(exs);
    const srcs = [...new Set(clips.map((c) => c.src))];
    const clipMiss = srcs.filter((s2) => !fs.existsSync(path.join(ROOT, s2)));
    check(U + 'every recording the 교과서 pages name is on disk', clipMiss.length === 0, clipMiss.join(', '));
    // A row that says "track 06" while playing trk02 sends the learner to the wrong page of
    // the book, and nothing on screen gives that away. The number is in both strings, so
    // make the two agree.
    const drift = clips.filter((c) => {
      const inSrc = /-trk(\d+)\.mp3$/.exec(c.src);
      const inLbl = /track\s*(\d+)/.exec(String(c.labelEn || ''));
      return inSrc && inLbl && Number(inSrc[1]) !== Number(inLbl[1]);
    });
    check(U + 'and each clip label names the track it actually plays', drift.length === 0,
      drift.map((c) => c.src + ' labelled "' + c.labelEn + '"').join(', '));
    // A 교과서 clip pointing at a book track the cassette does not carry is a page
    // reference to a recording this unit never cut.
    const csRel = path.join('worlds', bank.unit + '-cassette.json');
    if (fs.existsSync(path.join(ROOT, csRel))) {
      const cs = JSON.parse(read(csRel));
      const known = new Set((cs.tracks || []).map((t) => t.src));
      const stray = srcs.filter((s2) => /-trk\d+\.mp3$/.test(s2) && !known.has(s2));
      check(U + 'and every book track it names is one the cassette carries', stray.length === 0, stray.join(', '));
    }

    check(U + 'the desk offers the 교과서 as its own row',
      gameJs.indexOf(bank.world + "()) return '/worlds/" + bank.unit + "-textbook.json'") >= 0
      && gameJs.indexOf("key: 'textbook'") >= 0);
    // The admin editor resolves one file per key, and a key pointing at another unit's file
    // is what "the editor shows Unit 14 for every unit" looked like.
    check(U + "the admin registry can open this unit's 교과서",
      wbLib.indexOf("'" + bank.unit + "-textbook': path.join('worlds', '" + bank.unit + "-textbook.json')") >= 0);
  });

  // The renderer plays a book clip where the content names one and a pre-rendered TTS clip
  // otherwise, so a page missing from the harvest is a row with a dead play button.
  if (anyBank) {
    const ttsSrc = read(path.join('scripts', 'ttsClips.js'));
    check('the TTS harvest reads -textbook.json as well as -workbook.json',
      /-\(\?:work\|text\)book\\\.json\$/.test(ttsSrc));
  }
}());

// ── The exam world ───────────────────────────────────────────────────
// TOPIK II is not a chapter of anything, so this world breaks the shape every other world
// keeps: no fixed word list, no 퀴즈, no tape. Questions arrive one at a time and the word list
// grows out of them, so the usual "this chapter has exactly N words" check has nothing to pin.
// What is worth pinning instead is the shape of each entry, the wiring, and one thing that is
// deliberately NOT checked — see the note on cross-world overlap below.
(function checkTopikWorld() {
  const rel = path.join('worlds', 'topik-2.json');
  if (!check(rel + ' exists', fs.existsSync(path.join(ROOT, rel)))) return;
  let world;
  try { world = JSON.parse(read(rel)); } catch (e) { check(rel + ' is valid JSON', false, e.message); return; }
  check('the exam world names itself topik-2',
    world.id === 'topik-2' && world.level && world.level.worldId === 'topik-2', String(world.id));
  check('and it is a world level carrying a study desk',
    world.level.world === true
    && ((world.level.map && world.level.map.stations) || []).indexOf('desk') >= 0);

  const ww = (world.level && world.level.words) || [];
  const thinWord = ww.filter((w) => !w || !w.ko || !w.en || !w.category || !w.categoryEn || !w.hint)
    .map((w) => (w && w.ko) || '?');
  check('every exam-world word has ko / en / category / categoryEn / hint',
    thinWord.length === 0, thinWord.slice(0, 6).join(', '));
  const kos = ww.map((w) => String(w.ko).normalize('NFC'));
  const dups = kos.filter((k, i) => kos.indexOf(k) !== i);
  check('and no word is listed twice inside the exam world itself', dups.length === 0, dups.join(', '));
  // ── Faults that accrue when a list grows one question at a time ─────────────────
  // The list reached 317 words across 22 questions before anything looked at it as a whole.
  // These three are what that first look found, and all three are invisible to the checks
  // above, which ask whether a word can be reached rather than whether it makes sense.
  //
  // Two other findings from the same pass were false positives and are deliberately not
  // enforced: N와의 전쟁 and -앟이 sit under 언론 because they are headline devices, and
  // 안 + V and 하고 말하다 sit under 문법 despite not starting with - or N.
  const glossOf = new Map();
  const sameGloss = [];
  ww.forEach((wd) => {
    const k = String(wd.en || '').trim().toLowerCase();
    if (!k) return;
    if (glossOf.has(k)) sameGloss.push(glossOf.get(k) + ' / ' + wd.ko);
    else glossOf.set(k, wd.ko);
  });
  // Three words once read 'to grow in number' — 늘다, 늘어나다 and 많아지다. Hovering
  // any of them returned the same sentence, which is the one thing a gloss exists not to do.
  check('no two exam-world words carry the same gloss', sameGloss.length === 0,
    sameGloss.slice(0, 4).join(', '));

  // The label a category shows depends on whichever of its words is read first, so two
  // English names for one category is a coin toss on screen. 음식 and 문화 each had two.
  const catName = new Map();
  const catClash = [];
  ww.forEach((wd) => {
    if (!wd.category) return;
    if (!catName.has(wd.category)) catName.set(wd.category, wd.categoryEn);
    else if (catName.get(wd.category) !== wd.categoryEn) {
      catClash.push(wd.category + ': ' + catName.get(wd.category) + ' vs ' + wd.categoryEn);
    }
  });
  check('each exam-world category has exactly one English name',
    catClash.length === 0, [...new Set(catClash)].slice(0, 3).join(' | '));

  // A forms list saying the word wears a shape it does not wear. Harmless to the gloss
  // table, which dedupes its keys, and still a list that is not true.
  const selfForm = ww.filter((wd) => Array.isArray(wd.forms) && wd.forms.indexOf(wd.ko) >= 0)
    .map((wd) => wd.ko);
  check('and no entry lists its own headword among its forms',
    selfForm.length === 0, selfForm.slice(0, 4).join(', '));
  // Words come from a paper or an explicit learner-supplied list. The list started with a field of 경제
  // vocabulary I wrote out myself — 매출, 불황, 유통, twenty-nine words in all — which read as
  // useful and was not: a personal study room fills up from the papers that go through it,
  // and anything else is a guess about what the exam will ask. The check is cheap and the
  // rule is the point, so it is enforced rather than remembered. User lists are recorded
  // separately; never invent a paper or put unrelated vocabulary into an explanation.
  const requestedWords = new Set();
  const sourceIds = new Set();
  const sourceProblems = [];
  const sources = world.vocabularySources === undefined ? [] : world.vocabularySources;
  if (!Array.isArray(sources)) sourceProblems.push('vocabularySources must be an array');
  (Array.isArray(sources) ? sources : []).forEach((source) => {
    if (!source || source.type !== 'user-list' || !source.id || !source.titleEn
      || !source.note || !/^\d{4}-\d{2}-\d{2}$/.test(source.date || '')) {
      sourceProblems.push('a user list needs its id, date, title and source note');
      return;
    }
    if (sourceIds.has(source.id)) sourceProblems.push('duplicate source: ' + source.id);
    sourceIds.add(source.id);
    if (!Array.isArray(source.words) || !source.words.length) {
      sourceProblems.push(source.id + ': needs headwords'); return;
    }
    const inList = new Set();
    source.words.forEach((ko) => {
      if (typeof ko !== 'string' || !kos.includes(ko) || inList.has(ko)) {
        sourceProblems.push(source.id + ': missing or repeated headword ' + ko); return;
      }
      inList.add(ko);
      requestedWords.add(ko);
    });
  });
  check('explicit learner vocabulary lists name real, unique headwords and their source',
    sourceProblems.length === 0, sourceProblems.slice(0, 5).join(', '));
  const bankRelForWords = path.join('worlds', 'topik2-questions.json');
  if (fs.existsSync(path.join(ROOT, bankRelForWords))) {
    let qbank = null;
    try { qbank = JSON.parse(read(bankRelForWords)); } catch (e) { qbank = null; }
    if (qbank) {
      const seen2 = [];
      (qbank.exercises || []).forEach((ex) => {
        seen2.push(ex.instructionKo, ex.pattern, ex.section);
        (ex.items || []).forEach((it) => {
          seen2.push(it.phraseKo);
          // The per-question notes count as source too. A verb and its ending sometimes
          // appear only fused — 믿어서는 is the only shape 믿다 wears in any paper here — and
          // exactly one of the two can own that string for the hover to work. The other is
          // found by its own name, which is printed in the grammar note. Widening the
          // corpus is what lets the note carry it. The rule still binds every word to a
          // paper the user sent, which is what it was written for; what it no longer
          // catches is a word introduced only by the commentary on a real question.
          seen2.push(it.why, it.grammar);
          (it.lines || []).forEach((l) => seen2.push(l.ko));
          (it.choices || []).forEach((c) => seen2.push(c.ko));
          (it.choices2 || []).forEach((c) => seen2.push(c.ko));
        });
      });
      const corpus = seen2.filter(Boolean).map((t) => String(t).normalize('NFC')).join(' | ');
      const rootless = ww.filter((wd) => {
        if (requestedWords.has(wd.ko)) return false;
        const keys = [String(wd.ko).normalize('NFC')]
          .concat(Array.isArray(wd.forms) ? wd.forms.map((f) => String(f).normalize('NFC')) : []);
        return !keys.some((k) => k && corpus.indexOf(k) >= 0);
      }).map((wd) => wd.ko);
      check('every exam-world word traces to a question or an explicit learner vocabulary list',
        rootless.length === 0, rootless.slice(0, 8).join(', '));
    }
  }
  // A word may list the shapes it actually wears in a sentence, because 썬렁하다 turns up as
  // 썬렁한 and no rule short of a conjugator gets there. The gloss table drops any key under
  // two characters, so a one-character form is dead weight that looks like it works.
  const badForms = [];
  ww.forEach((wd) => {
    if (wd.forms === undefined) return;
    if (!Array.isArray(wd.forms) || !wd.forms.length) {
      badForms.push(wd.ko + ': forms must be a non-empty array'); return;
    }
    wd.forms.forEach((f) => {
      if (typeof f !== 'string' || f.trim().length < 2) {
        badForms.push(wd.ko + ': "' + f + '" is too short to ever match');
      }
    });
  });
  check('every surface form a word lists is long enough to match', badForms.length === 0,
    badForms.slice(0, 5).join(', '));
  // Deliberately absent: any check that a word here is absent from levels.json or from a unit.
  // This is a personal study room, not a syllabus — a word met in an exam question belongs in
  // the exam room whether or not it was first met on a farm. It costs nothing either, because
  // srsData is keyed by the Korean word globally, so a repeat shares one card rather than
  // creating a second, and srsDueWords() already dedupes before planting. Anyone tempted to
  // "fix" this with a cross-world dedupe should read section 3 of tests/test_topik_map.js,
  // which asserts the overlap is allowed on purpose.
  const declared = ((world.notebook && world.notebook.mindmap) || []).map((g) => g.cat);
  const inUse = [...new Set(ww.map((w) => w.category))];
  check('the exam world mindmap names exactly the categories its words use',
    inUse.every((c) => declared.includes(c)) && declared.every((c) => inUse.includes(c)),
    'mindmap: ' + declared.join(', ') + ' | words: ' + inUse.join(', '));

  const bankRel = path.join('worlds', 'topik2-questions.json');
  if (check(bankRel + ' exists', fs.existsSync(path.join(ROOT, bankRel)))) {
    let bank;
    try { bank = JSON.parse(read(bankRel)); } catch (e) { bank = null; check(bankRel + ' is valid JSON', false, e.message); }
    if (bank) {
      check('the exam bank names itself topik2-questions', bank.id === 'topik2-questions', String(bank.id));
      check('and the desk labels it 기출 문제', bank.titleKo === '기출 문제', String(bank.titleKo));
      const exs = Array.isArray(bank.exercises) ? bank.exercises : null;
      check('the exam bank holds an exercises array', !!exs);
      if (exs) {
        const ids = exs.map((e) => e.id);
        check('no two question groups share an id', new Set(ids).size === ids.length, ids.join(', '));
        const thin = [];
        exs.forEach((ex) => {
          if (!ex.id || !ex.no || !ex.instructionKo) thin.push(String(ex.id) + ' heading');
          (ex.items || []).forEach((it, k) => {
            const at = ex.id + ' row ' + (k + 1);
            if (!it.why || !it.grammar || !it.en) thin.push(at + ' prose');
            // The explanation is the product of this world, not a nicety on top of it.
            if (String(it.why || '').length < 80) thin.push(at + ' why too thin');
            const sets = (it.choices2 || it.answer2) ? 2 : 1;
            const gaps = (it.lines || []).reduce((n, l) => n + String(l.ko || '').split('{}').length - 1, 0);
            if (gaps !== sets) thin.push(at + ' has ' + gaps + ' blanks for ' + sets + ' choice sets');
            if (!(it.choices || []).some((c) => c.id === it.answer)) thin.push(at + ' answer');
            // TOPIK prints four options, always. Three is a transcription that dropped one.
            if ((it.choices || []).length !== 4) thin.push(at + ' has ' + (it.choices || []).length + ' choices, not 4');
          });
        });
        check('every exam question is complete, four-choice and explained', thin.length === 0,
          thin.slice(0, 6).join(', '));
        // A sitting at the exam desk is one question drawn from the whole paper. That is a
        // property of the content and the renderer together — the bank opts in, the renderer
        // honours it, and the button afterwards offers the next question rather than the same
        // one again. Any one of the three on its own is a feature that does not work.
        check('the exam bank draws one question a sitting', bank.drawOne === true,
          String(bank.drawOne));
        check('and names the button that draws the next one',
          !!String(bank.nextKo || '').trim(), String(bank.nextKo));
        const paper = (exs[0] && exs[0].items) || [];
        check('with enough questions for the draw to mean anything', paper.length >= 3,
          String(paper.length));
      }
    }
  }

  const gameJs = readGameSource();
  // ── Every word can actually be hovered ─────────────────────────────────
  // wbGlossTable keys on ko plus forms, drops anything under two characters, keeps the first
  // claimant of a key, and matches longest-first. So two entries claiming the same string
  // silently hands the hover to whichever was listed earlier, and a short form sitting inside
  // a longer one from a different entry never wins a position at all. Both had already
  // happened by question 9 — '안 물어요' swallowing 물다, and '적이 있' underlining half a
  // modifier — and both were found by reading rather than by running, which does not scale
  // past a couple of hundred entries.
  (function checkExamGlossKeys() {
    const wRel = path.join('worlds', 'topik-2.json');
    const bRel = path.join('worlds', 'topik2-questions.json');
    if (!fs.existsSync(path.join(ROOT, wRel)) || !fs.existsSync(path.join(ROOT, bRel))) return;
    let world = null, qbank = null;
    try { world = JSON.parse(read(wRel)); qbank = JSON.parse(read(bRel)); } catch (e) { return; }
    const words = (world.level && world.level.words) || [];
    const keysOf = (wd) => [wd.ko].concat(Array.isArray(wd.forms) ? wd.forms : [])
      .map((k) => String(k || '').normalize('NFC').trim())
      .filter((k) => k.length >= 2);
    const owner = new Map();
    const clash = [];
    words.forEach((wd) => {
      keysOf(wd).forEach((key) => {
        if (!owner.has(key)) { owner.set(key, wd.ko); return; }
        if (owner.get(key) !== wd.ko) clash.push(key + ' (' + owner.get(key) + ' vs ' + wd.ko + ')');
      });
    });
    check('no two exam-world entries claim the same hover key',
      clash.length === 0, clash.slice(0, 6).join(', '));
    // A learner may request a one-syllable word such as 발 for the farm. It does
    // not need a fabricated particle form merely to be indexed in an exam paper.
    const short = words.filter((wd) => !requestedWords.has(wd.ko) && keysOf(wd).length === 0)
      .map((wd) => wd.ko);
    check('and every paper-derived entry has a key long enough to be indexed',
      short.length === 0, short.slice(0, 6).join(', '));
    const corpus = [];
    (qbank.exercises || []).forEach((ex) => {
      corpus.push(ex.instructionKo, ex.noteEn);
      (ex.items || []).forEach((it) => {
        corpus.push(it.phraseKo, it.en, it.why, it.grammar);
        (it.lines || []).forEach((l) => corpus.push(l.ko));
        (it.choices || []).forEach((c) => corpus.push(c.ko));
      });
    });
    // Two spaces between fields, so a key cannot match across a boundary that is not
    // really there. A newline would do as well, but a plain separator survives being
    // written out through a shell heredoc — which this line did not, the first time.
    const text = corpus.filter(Boolean).map((t) => String(t).normalize('NFC')).join('  ');
    const keys = [...owner.keys()].sort((a, b) => b.length - a.length);
    if (!keys.length) return;
    const esc = (k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(keys.map(esc).join('|'), 'g');
    const winners = new Set();
    let m;
    while ((m = re.exec(text))) winners.add(m[0]);
    const shadowed = words
      // Supplemental words need a paper hover only if an indexable key actually
      // occurs there. Keep them in owner/re so they cannot hide an existing gloss.
      .filter((wd) => !requestedWords.has(wd.ko) || keysOf(wd).some((k) => text.includes(k)))
      .filter((wd) => !keysOf(wd).some((k) => owner.get(k) === wd.ko && winners.has(k)))
      .map((wd) => wd.ko);
    check('every word used by the exam paper wins a hover position',
      shadowed.length === 0, shadowed.slice(0, 8).join(', '));
    // A gloss that fires inside a different word. Korean does not space within a word, so a
    // key landing with Hangul on both sides is underlining part of something else — '전에'
    // did exactly that across the middle of 텔레비전에서는, captioned "before doing it".
    //
    // Endings and particles are the exception, and only in one direction: 와의 전쟁, 로 인해,
    // 라는 and 앟이 are built to attach to the noun or stem in front of them. They are told
    // apart by their headword — an ending is written '-…' or 'N…' — which is why 앟이 is filed
    // as -앟이 rather than as a noun. A content word has no such licence: '책이' would put
    // "a book" under the tail of 정책이, and today it only escapes because 부동산 정책 is longer
    // and wins first.
    //
    // Known limit, found by probing rather than by reasoning: the Hangul-on-both-sides half
    // cannot tell a particle stack from a word. 텔레비전에서는 breaks as 텔레비전 + 에서 + 는,
    // so a key on 에서 would sit between two Hangul syllables and be flagged even though it is
    // parsing correctly. Nothing in the world hits that today. If a stacking particle is ever
    // added and this fails on it, the check is wrong and not the content — loosen it then,
    // with the case written down here.
    const isEnding = (ko) => /^[-N]/.test(String(ko || ''));
    const hangul = (ch) => !!ch && ch >= '\uac00' && ch <= '\ud7a3';
    const midWord = [];
    re.lastIndex = 0;
    let hit;
    while ((hit = re.exec(text))) {
      const before = hit.index > 0 ? text[hit.index - 1] : '';
      if (!hangul(before)) continue;
      const after = text[hit.index + hit[0].length] || '';
      const insideAWord = hangul(after);
      const unlicensed = !isEnding(owner.get(hit[0]));
      if (!insideAWord && !unlicensed) continue;
      const at = before + '[' + hit[0] + ']' + after;
      if (midWord.indexOf(at) < 0) midWord.push(at);
    }
    check('no gloss fires inside another word', midWord.length === 0,
      midWord.slice(0, 6).join('  '));
  }());

  // ── A world with a quiz has to be offered that quiz by the admin too ────────────
  // deskQuizUrl is what the game reads; admin/public/js/world.js is what the editor reads.
  // They are two lists of the same fact, and the exam world got its quiz in one of them
  // only — the picker went on saying quiz: null, which is the admin quietly reporting that
  // this world has none.
  (function checkAdminQuizPicker() {
    const uiRel = path.join('js', 'ui.js');
    const pickerRel = path.join('admin', 'public', 'js', 'world.js');
    if (!fs.existsSync(path.join(ROOT, pickerRel))) return;
    const uiSrc = read(uiRel);
    const picker = read(pickerRel);
    const dqFrom = uiSrc.indexOf('function deskQuizUrl()');
    const dqTo = uiSrc.indexOf('function loadDeskQuiz', dqFrom);
    const body = dqFrom >= 0 && dqTo > dqFrom ? uiSrc.slice(dqFrom, dqTo) : '';
    const served = (body.match(/'\/worlds\/([a-z0-9-]+)-desk-quiz\.json'/g) || [])
      .map((m) => m.replace(/^'\/worlds\//, '').replace(/-desk-quiz\.json'$/, ''));
    check('the game serves at least five desk quizzes', served.length >= 5,
      served.join(', '));
    const nulled = served.filter((stem) => {
      const world = stem.indexOf('unit') === 0 ? '2b-' + stem.replace('unit', 'unit-')
        : (stem === 'topik2' ? 'topik-2' : stem);
      const row = picker.match(new RegExp("\\{ id: '" + world + "'[^}]*\\}"));
      return row && /quiz:\s*null/.test(row[0]);
    });
    check('and every one of them is offered by the admin unit picker as well',
      nulled.length === 0, nulled.join(', '));

    // 'topik2'.replace('unit', 'Unit ') is 'topik2'. Every other key is unitNN, which is
    // why the row read 'topik2 · 퀵즈' and nobody saw it until the panel was opened.
    const reg = require(path.join(ROOT, 'admin', 'lib', 'content.js'));
    const ugly = (reg.list ? reg.list() : [])
      .filter((e) => String(e.key || '').indexOf('quiz/') === 0)
      .filter((e) => /^[a-z0-9]+ ·/.test(String(e.label || '')))
      .map((e) => e.key + ': ' + e.label);
    check('and no quiz row is labelled with its raw file stem', ugly.length === 0,
      ugly.join(', '));
  }());

  const uiForDraw = read(path.join('js', 'ui.js'));
  check('openWorkbookExercise draws instead of opening the whole paper',
    /const ex = wbDrawOne\(st\.bank, whole\)/.test(uiForDraw));
  check('and a bank that did not ask for it is handed back untouched',
    /if \(!bank \|\| !bank\.drawOne \|\| items\.length < 2\) return ex;/.test(uiForDraw));
  check('the draw is a bag, not a bare Math.random on every press',
    uiForDraw.indexOf('wbDrawBags') >= 0 && /bag\.left\.pop\(\)/.test(uiForDraw));
  check('after checking, a drawn paper offers the next question rather than the same one',
    /btn\.onclick = drawn \? \(\) => openWorkbookExercise\(st\.ex\.id\) : resetWorkbook;/.test(uiForDraw));
  // Glossing the question before it is answered underlines the words it turns on, which is
  // most of the way to answering it. Once the answer is out there is nothing left to give away.
  check('the question is glossed only once the answer is out',
    /if \(st\.checked\) wbApplyGloss\(list\);/.test(uiForDraw));
  check('and the explanation is glossed as it always was',
    uiForDraw.indexOf('wbApplyGloss(explain)') >= 0);
  check('the desk offers the exam bank on the exam world',
    gameJs.indexOf("isTopikWorld()) return '/worlds/topik2-questions.json'") >= 0);
  check('and isTopikWorld is defined against the world id',
    /function isTopikWorld\(\)[\s\S]{0,200}'topik-2'/.test(gameJs));
  check('the exam world is fetched alongside the textbook worlds',
    gameJs.indexOf("file: 'worlds/topik-2.json'") >= 0);
  // The bug this world was the first to expose. deskQuizUrl used to end in a bare return of
  // Unit 10's quiz, so any world with a desk and no quiz of its own was silently served 10과
  // food words — a screen that works perfectly and asks the wrong questions. Sliced and read
  // line by line rather than matched as one regex, because the repo has no .gitattributes and
  // a pattern spanning a literal newline passes in CI and fails on a Windows checkout.
  const dqAt = gameJs.indexOf('function deskQuizUrl()');
  const dqBody = dqAt >= 0 ? gameJs.slice(dqAt, gameJs.indexOf('function loadDeskQuiz', dqAt)) : '';
  // Widened from /isUnit\d+World/ when the exam desk gained a quiz of its own: its guard
  // is isTopikWorld, a world test that is not named after a unit number. What this rule is
  // for is that no line hands back a quiz without first asking which world it is in — the
  // shape of the guard's name was never the point, and pinning it would have meant every
  // future non-unit world failing a check about Unit 10's bug.
  const unguarded = dqBody.split(/\r?\n/)
    .filter((l) => /return '\/worlds\//.test(l) && !/is[A-Za-z0-9]+World\(\)/.test(l));
  check('every quiz url in deskQuizUrl is guarded by its own world test',
    dqBody.length > 0 && unguarded.length === 0, unguarded.join(' | '));
  check('and deskQuizUrl returns null for a world that has no quiz', /return null;/.test(dqBody));
  check('the desk only offers a 퀴즈 row when there is a quiz to open',
    /if \(deskQuizUrl\(\)\) \{/.test(gameJs));
  // An empty word list on a world makes _pickWord() hand back undefined, so this guard is what
  // keeps the map plantable between the day it is created and its first question.
  check('an empty world word list falls through to the global pool',
    /const own = isWorldLevel\(lesson\) \? \(lesson\.words \|\| \[\]\) : null;/.test(gameJs)
    && /if \(own && own\.length\) return own\.slice\(\);/.test(gameJs));
  const wbLib = read(path.join('admin', 'lib', 'workbook.js'));
  check('the admin registry can open the exam bank',
    wbLib.indexOf("'topik2-questions': path.join('worlds', 'topik2-questions.json')") >= 0);
  check('and it keeps holdGloss through a save rather than normalising it away',
    wbLib.indexOf('holdGloss: body.holdGloss === true') >= 0);
  // The two study aids this world exists to carry. Both are one line away from being
  // silently inert — a gloss pass nobody calls, a stylesheet with no rule for the span —
  // and neither failure shows up as an error, only as a feature quietly not happening.
  check('the answer view runs the gloss pass over what it just rendered',
    gameJs.indexOf('wbApplyGloss(explain);') >= 0
    && gameJs.indexOf('function wbApplyGloss(') >= 0
    && gameJs.indexOf('function wbGlossTable(') >= 0);
  check('and a glossed word is reachable without a mouse',
    gameJs.indexOf("className = 'wb-gl'") >= 0
    && gameJs.indexOf("setAttribute('tabindex', '0')") >= 0);
  const css = read(path.join('css', 'game.css'));
  check('the stylesheet draws the gloss and its tooltip',
    css.indexOf('.wb-gl') >= 0 && css.indexOf('content: attr(data-gl)') >= 0
    && css.indexOf('.wb-gl:focus-visible::after') >= 0);
  check('a bank can hold its translation back until the row is checked',
    gameJs.indexOf('st.bank && st.bank.holdGloss') >= 0
    && gameJs.indexOf("holdGloss ? '' :") >= 0);
}());

// ── Every piece of content has a way into the admin ──────────────────────────
// Admin routes were added a unit at a time, and the result was uneven in a way no single file
// showed: levels.json and Unit 10 were fully editable while Units 11, 13 and 14, the whole
// TOPIK world and every cassette bank had no route at all. Nothing was broken — they were
// simply never connected, and there was nowhere for that absence to surface.
//
// So it surfaces here. Every file the publish step actually uploads is either registered in
// admin/lib/content.js or listed as deliberately not editable, with a reason. Adding a world
// without an admin route now fails the build instead of going unnoticed for four units.
(function checkAdminCoverage() {
  let content, r2;
  try {
    content = require(path.join(ROOT, 'admin', 'lib', 'content.js'));
    r2 = require(path.join(ROOT, 'scripts', 'r2Content.js'));
  } catch (e) {
    check('the content registry loads', false, e.message);
    return;
  }
  check('the content registry loads', true);
  const rels = r2.collectUploadFiles(ROOT).map((f) => f.rel);
  const cov = content.coverage(rels);
  check('every published file is either editable in the admin or excused by name',
    cov.uncovered.length === 0,
    cov.uncovered.slice(0, 8).join(', '));
  // A reason is required. "Not in the table" and "not editable on purpose" look identical
  // from outside, and only one of them is fine.
  const mute = (content.UNEDITABLE || []).filter((u) => String(u.why || '').length < 20);
  check('and every excuse says why', mute.length === 0,
    mute.map((u) => String(u.rel || u.match)).join(', '));
  // Two keys pointing at one file is what "the editor shows Unit 14 for every unit" looked
  // like, and the registry is now the only place that mistake can be made.
  const paths = (content.CONTENT || []).map((c) => String(c.rel).split(path.sep).join('/'));
  const dupPath = paths.filter((r, i) => paths.indexOf(r) !== i);
  check('no two registry keys point at the same file', dupPath.length === 0, dupPath.join(', '));
  const keys = (content.CONTENT || []).map((c) => c.key);
  check('and no key is registered twice', new Set(keys).size === keys.length);
  const noFile = paths.filter((r) => !fs.existsSync(path.join(ROOT, r)));
  check('every registered file is on disk', noFile.length === 0, noFile.join(', '));
  // The registry is worth nothing if its validators do not accept what the repo ships.
  const rejects = [];
  (content.CONTENT || []).forEach((c) => {
    const full = path.join(ROOT, c.rel);
    if (!fs.existsSync(full)) return;
    try { c.validate(JSON.parse(fs.readFileSync(full, 'utf8')), { rootDir: ROOT, rel: c.rel }); }
    catch (e) { rejects.push(c.key + ': ' + e.message); }
  });
  check('and every shipped file passes the validator that guards it', rejects.length === 0,
    rejects.slice(0, 4).join(' | '));
}());

// ── The docs point at files that exist ───────────────────────────────────────
// Prose rots two ways: numbers and names. The numbers are guarded below. This guards the names,
// which happen to be healthy right now — 110 file references across README.md and docs/, none
// broken — and that is the moment to put the net up rather than after a rename lands.
//
// A path written as "no `tests/test_unit15_cassette.js`" is asserting the file's absence on
// purpose, so a line that says "no" before the path is left alone. Bare filenames with no
// directory are prose, not references, and are skipped too.
(function checkDocFileRefs() {
  const docs = ['README.md'].concat(
    fs.readdirSync(path.join(ROOT, 'docs'))
      .filter((f) => f.endsWith('.md'))
      .map((f) => 'docs/' + f)
  );
  let seen = 0;
  const missing = [];
  docs.forEach((d) => {
    read(d).split('\n').forEach((line) => {
      [...line.matchAll(/`([\w./-]+\.(?:js|json|md|css|html))`/g)].forEach((m) => {
        const rel = m[1];
        if (rel.indexOf('/') < 0) return;                       // a bare filename is prose
        if (rel.indexOf('*') >= 0) return;                      // a glob describes many
        if (new RegExp('\\bno\\s+`?' + rel.replace(/[.[\]/]/g, '\\$&')).test(line)) return;
        seen++;
        if (!fs.existsSync(path.join(ROOT, rel))) missing.push(d + ' -> ' + rel);
      });
    });
  });
  check('the docs reference files, and they were found', seen > 50, `only ${seen} references`);
  check(`all ${seen} files the docs name exist`, missing.length === 0, missing.join('; '));
}());

// ── The README's numbers ─────────────────────────────────────────────────────
// A count written into prose goes stale the next time a unit lands, and it had happened four
// times before this check existed: the function ceiling said four when it was eleven, the world
// loader said five fetches over six worlds, the save comment said thirteen KB across three units
// over five, and the README said 1,500 words when the worlds had taken the game to 2,313.
//
// Everywhere else the fix was to stop writing the number down. The README is the one place a
// concrete figure earns its keep — it is the first thing anyone reads — so the figure stays and
// this check keeps it honest. Words are deduped by `ko`, which is how srsData is keyed, so a word
// a world shares with levels.json counts once.
(function checkReadmeCounts() {
  const readme = read('README.md');
  const claim = (label, re) => {
    const m = readme.match(re);
    if (!m) { check(`README states its ${label}`, false, 'no match for ' + re); return null; }
    return Number(m[1].replace(/,/g, ''));
  };
  const levelsClaim = claim('level count', /([\d,]+) levels of/);
  const wordsClaim = claim('level-mode word count', /levels of ([\d,]+) words/);
  const worldsClaim = claim('world count', /plus (six|seven|eight|nine|ten|[\d,]+) textbook/);
  const totalClaim = claim('total word count', /([\d,]+) unique\s+words/);

  const NUMBER_WORDS = { six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const worldsSaid = Number.isNaN(worldsClaim)
    ? NUMBER_WORDS[(readme.match(/plus (\w+) textbook/) || [])[1]]
    : worldsClaim;

  const levels = (function () {
    const lv = JSON.parse(read('levels.json'));
    return lv.levels || lv;
  }());
  const seen = new Set();
  levels.forEach((l) => (l.words || []).forEach((w) => { if (w && w.ko) seen.add(w.ko); }));
  const levelWords = seen.size;

  const worldFiles = fs.readdirSync(path.join(ROOT, 'worlds'))
    .filter((f) => /^(2b-unit-\d+|topik-2)\.json$/.test(f));
  worldFiles.forEach((f) => {
    const w = JSON.parse(read(path.join('worlds', f)));
    const lvls = Array.isArray(w.level) ? w.level : [w.level];
    lvls.forEach((l) => ((l && l.words) || []).forEach((x) => { if (x && x.ko) seen.add(x.ko); }));
  });

  check(`README says ${levelsClaim} levels and levels.json has ${levels.length}`,
    levelsClaim === levels.length);
  check(`README says ${wordsClaim} words in level mode, and there are ${levelWords}`,
    wordsClaim === levelWords);
  check(`README says ${worldsSaid} worlds and worlds/ holds ${worldFiles.length}`,
    worldsSaid === worldFiles.length, worldFiles.join(', '));
  check(`README says ${totalClaim} unique words in all, and there are ${seen.size}`,
    totalClaim === seen.size);
}());

// ── The Vercel function ceiling ────────────────────────────────────────
// The Hobby plan allows twelve serverless functions, and every file under api/ that is not a
// helper becomes one. Crossing the ceiling fails no test, no suite and not CI: the build fails
// minutes later on Vercel, the previous deployment keeps serving, and the whole pipeline reads
// green while nothing ships. A count is cheap; finding out the other way costs a deploy.
//
// Room has been made twice, both times by merging rather than deleting: api/unit10/[kind].js
// carries three routes in one file, and every admin read lives in api/admin/[...path].js. If
// this trips, look for routes that differ only in which getter they call.
//
// The remaining headroom is deliberately not written down here. A second copy of this check,
// further down the file, said the count "sits at four with room to spare" when the true figure
// was eleven of twelve — the opposite of a warning, and stale within a week of being typed.
// The check prints the live number and the routes behind it, which cannot go out of date.
(function checkFunctionBudget() {
  const LIMIT = 12;
  const dir = path.join(ROOT, 'api');
  const found = [];
  const walk = (d, prefix) => {
    fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
      if (e.isDirectory()) { walk(path.join(d, e.name), prefix + e.name + '/'); return; }
      if (!e.name.endsWith('.js')) return;
      // A leading underscore marks a helper; Vercel does not turn those into functions.
      if (e.name.charAt(0) === '_') return;
      found.push(prefix + e.name);
    });
  };
  if (fs.existsSync(dir)) walk(dir, '');
  check(`api/ holds at most ${LIMIT} serverless functions (found ${found.length})`,
    found.length <= LIMIT, found.join(', '));
}());

// ── vercel.json says only what Vercel understands ───────────────────────────
// JSON has no comments, and Vercel validates this file against a closed schema: an extra key
// on a rewrite is not ignored, it fails the build. The failure surfaces nowhere useful — CI
// stays green, the deploy dies, and the status link points at the configuration docs rather
// than at the offending line. That is exactly what an "_comment" key on a rewrite did.
(function checkVercelConfig() {
  const rel = 'vercel.json';
  if (!check(rel + ' exists', fs.existsSync(path.join(ROOT, rel)))) return;
  let cfg;
  try { cfg = JSON.parse(read(rel)); } catch (e) { check(rel + ' is valid JSON', false, e.message); return; }
  const ALLOWED = {
    rewrites: ['source', 'destination', 'has', 'missing', 'statusCode'],
    redirects: ['source', 'destination', 'permanent', 'statusCode', 'has', 'missing'],
    headers: ['source', 'headers', 'has', 'missing']
  };
  const stray = [];
  Object.keys(ALLOWED).forEach((section) => {
    (Array.isArray(cfg[section]) ? cfg[section] : []).forEach((entry, i) => {
      Object.keys(entry || {}).forEach((k) => {
        if (ALLOWED[section].indexOf(k) < 0) stray.push(`${section}[${i}].${k}`);
      });
    });
  });
  check('no rewrite, redirect or header carries a key Vercel would reject',
    stray.length === 0, stray.join(', '));
  // cleanUrls strips /index.html and .html from URLs and 308s anything that still carries
  // one. A rewrite whose destination ends in .html therefore points at an address the router
  // will redirect away from, and the rewrite dead-ends in a 404 — which is how /admin/ came to
  // return "The page could not be found" while every asset under it served fine.
  if (cfg.cleanUrls === true) {
    const dotHtml = (cfg.rewrites || [])
      .filter((r) => /\.html$/.test(String(r.destination || '')))
      .map((r) => r.source + ' → ' + r.destination);
    check('with cleanUrls on, no rewrite points at a .html address the router redirects away from',
      dotHtml.length === 0, dotHtml.join(', '));
  }
  // The admin frontend still asks for the old URL, and the function that used to answer it is
  // gone. Without this rewrite the panel loads and silently believes it cannot write.
  const rw = (cfg.rewrites || []).some((r) => r.source === '/api/admin-host' && r.destination === '/api/admin/host');
  check('the old /api/admin-host URL still resolves to the merged admin function', rw);
}());

// ── The admin suite can run on its own dependencies ─────────────────────────
// CI runs `npm ci` and `npm test` inside admin/, which installs express and cors and nothing
// else. The contract test reaches into api/ from there, so anything it loads must not need a
// root-only dependency at import time.
//
// This is another failure that cannot be seen from a developer machine: locally the root
// node_modules sits one directory up and Node finds it, so the suite passes; on CI it is not
// there and the suite crashes on require. It cost a red build on main. Simulated here by
// making the package unresolvable in a child process, which is the only honest way to check
// an absence on a machine where the thing is present.
(function checkAdminDependencyClosure() {
  const ROOT_ONLY = Object.keys(JSON.parse(read('package.json')).dependencies || {});
  const ADMIN_DEPS = Object.keys(JSON.parse(read(path.join('admin', 'package.json'))).dependencies || {});
  const forbidden = ROOT_ONLY.filter((d) => ADMIN_DEPS.indexOf(d) < 0);
  check('the admin package installs fewer dependencies than the root, so the check has teeth',
    forbidden.length > 0, 'root-only: ' + forbidden.join(', '));
  if (!forbidden.length) return;

  const ENTRIES = [
    path.join('api', '_r2.js'),
    path.join('api', 'admin', '[...path].js'),
    path.join('admin', 'lib', 'content.js')
  ].filter((rel) => fs.existsSync(path.join(ROOT, rel)));

  const script = `
    const Module = require('module');
    const blocked = ${JSON.stringify(forbidden)};
    const real = Module._resolveFilename;
    Module._resolveFilename = function (req, ...rest) {
      if (blocked.indexOf(req) >= 0 || blocked.some((b) => req.indexOf(b + '/') === 0)) {
        const e = new Error("Cannot find module '" + req + "'");
        e.code = 'MODULE_NOT_FOUND';
        throw e;
      }
      return real.call(this, req, ...rest);
    };
    const bad = [];
    ${JSON.stringify(ENTRIES)}.forEach((rel) => {
      try { require(require('path').join(${JSON.stringify(ROOT)}, rel)); }
      catch (e) { bad.push(rel + ': ' + e.message); }
    });
    process.stdout.write(JSON.stringify(bad));
  `;
  let out = '[]';
  try {
    const { execFileSync } = require('child_process');
    out = execFileSync(process.execPath, ['-e', script], { encoding: 'utf8', stdio: 'pipe' });
  } catch (e) {
    out = JSON.stringify(['the probe itself failed: ' + (e.message || e)]);
  }
  let bad = [];
  try { bad = JSON.parse(out || '[]'); } catch (e) { bad = ['unreadable probe output']; }
  check('nothing the admin suite loads needs a root-only dependency at import time',
    bad.length === 0, bad.slice(0, 3).join(' | '));
}());

// ── The admin can actually be used ─────────────────────────────────────
// A registry with no screen is a feature nobody can reach, which is the state the panel was
// in for four units: routes existed for Unit 10 and the workbooks, and the other nineteen
// files had nowhere to be opened from. A tab is four separate pieces — button, section,
// route, script — and losing any one of them leaves the other three looking fine.
(function checkAdminContentTab() {
  const html = read(path.join("admin", "public", "index.html"));
  const app = read(path.join("admin", "public", "js", "app.js"));
  check("the admin has a Content tab button", html.indexOf('data-tab="content"') >= 0);
  check("and a section for it to render into", html.indexOf('id="tab-content"') >= 0);
  check("and the view script is loaded", html.indexOf("js/content.js") >= 0);
  check("and the router knows the route",
    /'content':\s*\(\)\s*=>\s*window\.ContentView/.test(app));
  const view = read(path.join("admin", "public", "js", "content.js"));
  check("the view reads its list from the server rather than a copy",
    view.indexOf("apiFetch.listContent") >= 0 && view.indexOf("apiFetch.saveContent") >= 0);
  // Two handlers on one Express path is dead code that registers without complaint: the
  // first match wins and the second never runs. That is how ?key= silently returned the
  // whole list instead of the file.
  const server = read(path.join("admin", "server.js"));
  // Counted by literal, not matched by pattern: the route strings contain slashes and the
  // escaping is not worth the risk of a regex that quietly matches nothing.
  const countOf = (needle) => server.split(needle).length - 1;
  const dupes = [];
  ['/api/admin/content', '/api/admin-host', '/api/workbook/:unit', '/api/skins/catalog']
    .forEach((route) => {
      ['get', 'put'].forEach((verb) => {
        if (countOf("app." + verb + "('" + route + "'") > 1) dupes.push(verb.toUpperCase() + ' ' + route);
      });
    });
  check("no Express path is registered twice for the same method", dupes.length === 0, dupes.join(", "));
}());

// ── The units workspace offers every unit ─────────────────────────────────
// The screen with the map pins, the desk quiz and the word table was written when Unit 10
// was the only unit, and stayed pinned to it for four more — so the nav read "Unit 10" and
// every other unit had no friendly editor at all, only raw JSON. The panels were always
// general; only the six API calls were not.
//
// This is what stops it happening again: the units it offers are compared against the worlds
// the content registry knows, so adding a world without adding it here fails the build.
(function checkUnitsWorkspace() {
  const view = read(path.join("admin", "public", "js", "world.js"));
  const html = read(path.join("admin", "public", "index.html"));
  let registry;
  try { registry = require(path.join(ROOT, "admin", "lib", "content.js")); }
  catch (e) { check("the units workspace can be checked against the registry", false, e.message); return; }

  const inRegistry = registry.CONTENT.filter((c) => c.key.indexOf("world/") === 0)
    .map((c) => c.key.slice("world/".length)).sort();
  const offered = (view.match(/id: '([a-z0-9-]+)', label:/g) || [])
    .map((m) => m.replace(/^id: '/, "").replace(/', label:$/, "")).sort();
  check("the workspace offers every world the registry carries",
    offered.length > 0 && offered.join(",") === inRegistry.join(","),
    "offered [" + offered.join(", ") + "] vs registry [" + inRegistry.join(", ") + "]");

  // The old per-unit helpers are what the coupling looked like. Their absence is the
  // difference between a screen that happens to work for Unit 10 and one that is unit-aware.
  const stale = ["getUnit10World", "saveUnit10World", "getUnit10Quiz", "saveUnit10Quiz"]
    .filter((fn) => view.indexOf(fn) >= 0);
  check("and it no longer reaches for the Unit-10-only endpoints", stale.length === 0, stale.join(", "));
  check("the nav does not call the workspace Unit 10", html.indexOf("</span> Unit 10") < 0);
  check("and the workspace has somewhere to draw its unit picker",
    html.indexOf('id="u10-unitpick"') >= 0 && view.indexOf("paintUnitPicker") >= 0);
}());

// ── The panel only calls endpoints production actually has ────────────────────
// admin/server.js and api/ are two different servers. A route that exists only in Express
// works perfectly on a developer machine and 404s on the deployed site, and nothing in the
// test suite can see the difference — the Workbooks tab called /api/workbooks and had been
// broken on production since the day it was written.
//
// So: every /api/ path the browser code asks for must be answerable by something under api/,
// either as a file or through the one admin function.
(function checkFrontendEndpoints() {
  const dir = path.join(ROOT, "admin", "public", "js");
  if (!fs.existsSync(dir)) { check("the admin frontend is present", false); return; }
  const asked = new Set();
  fs.readdirSync(dir).filter((f) => f.endsWith(".js")).forEach((f) => {
    const src = fs.readFileSync(path.join(dir, f), "utf8");
    (src.match(/['"`]\/api\/[A-Za-z0-9_\-\/]*/g) || []).forEach((m) => {
      asked.add(m.slice(1).split("?")[0].replace(/\/$/, ""));
    });
  });
  // What api/ can answer: a file per route, plus everything the admin function dispatches.
  const served = new Set(["/api/admin", "/api/admin/host", "/api/admin/content", "/api/admin-host"]);
  // Routes that exist only on the local Express server, on purpose. /api/sync rewrites files
  // on disk, which a Vercel function has none of. Being on this list is a promise that the
  // panel hides the control where it cannot work — asserted just below.
  const LOCAL_ONLY = { "/api/sync": "btn-sync-now" };
  Object.keys(LOCAL_ONLY).forEach((r) => served.add(r));
  const walk = (d, prefix) => {
    fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
      if (e.isDirectory()) { walk(path.join(d, e.name), prefix + e.name + "/"); return; }
      if (!e.name.endsWith(".js") || e.name.charAt(0) === "_") return;
      served.add("/api/" + prefix + e.name.replace(/\.js$/, "").replace(/^index$/, ""));
    });
  };
  walk(path.join(ROOT, "api"), "");
  // A dynamic segment answers for anything one level below it.
  const dynamicParents = [...served].filter((r) => r.indexOf("[") >= 0)
    .map((r) => r.slice(0, r.lastIndexOf("/")));
  const missing = [...asked].filter((r) => {
    if (served.has(r)) return false;
    if (dynamicParents.some((p) => r.indexOf(p + "/") === 0)) return false;
    // A concrete path under a route file, e.g. /api/levels/3 under api/levels/[num].js.
    return ![...served].some((sv) => r.indexOf(sv + "/") === 0);
  });
  check("every /api/ path the admin panel calls is answerable on production",
    missing.length === 0, missing.sort().join(", "));
  const appJs = read(path.join("admin", "public", "js", "app.js"));
  const unhidden = Object.keys(LOCAL_ONLY).filter((r) =>
    appJs.indexOf(LOCAL_ONLY[r]) < 0 || appJs.indexOf(".hidden = !isLocal") < 0);
  check("and a local-only control is hidden where it cannot work", unhidden.length === 0,
    unhidden.join(", "));
}());

// ── A world on the menu, not just in memory ────────────────────────────────
// A world reaches levelsData two ways: the scene preloads it into Phaser's cache, or
// loadTextbookWorlds fetches it later. Both work, and only the first is in time for the
// level select to paint — so a world missing from the preload is present in memory and
// absent from the menu, which is a bug with nothing to look at. The TOPIK world spent a day
// like that.
//
// farm.js used to name the four worlds twice, once to load and once to attach. It reads the
// list now, and this is what keeps it reading rather than drifting back to a copy.
(function checkWorldPreload() {
  const farm = read(path.join("js", "scenes", "farm.js"));
  const econ = read(path.join("js", "systems", "economy.js"));
  const specs = (econ.match(/cache: '[^']+', file: '[^']+'/g) || [])
    .map((m) => m.replace(/^cache: '/, "").split("'")[0]);
  check("economy.js declares the worlds to load", specs.length >= 5, specs.join(", "));
  // Named individually rather than looped is the shape that drifts.
  const hardcoded = specs.filter((key) => farm.indexOf("'" + key + "'") >= 0);
  check("farm.js does not name individual worlds, it walks the list",
    hardcoded.length === 0, hardcoded.join(", "));
  check("and it uses that list for both the preload and the attach",
    (farm.match(/TEXTBOOK_WORLD_FILES/g) || []).length >= 2);
}());

// ── A world card says which world it is ───────────────────────────────────
// The label used to be rebuilt from the trailing digits of lvl.level, which works for
// 2B-14 and yields nothing for TOPIK-II — that card came out reading "Textbook", the one
// word on it that said nothing about which world it was. And its heading said SNU Korean
// 2B over a world that is not from that book. Both facts live in the world JSON already,
// so the rule is that the screen reads them rather than deriving them.
(function checkWorldCardLabels() {
  const econ = read(path.join('js', 'systems', 'economy.js'));
  const files = (econ.match(/file: '([^']+)'/g) || []).map((m) => m.split("'")[1])
    .filter((f) => f.indexOf('worlds/') === 0);
  const ui = read(path.join('js', 'ui.js'));
  const headed = (ui.match(/PACK_HEADING = \{([^}]*)\}/) || [])[1] || '';
  const packs = [];
  files.forEach((rel) => {
    let w = null;
    try { w = JSON.parse(read(rel)); } catch (e) { w = null; }
    if (!w) { check(rel + ' parses', false); return; }
    check(rel + ' names itself for the card', !!String(w.pages || '').trim(),
      JSON.stringify(w.pages || ''));
    const pack = String((w.level && w.level.pack) || w.pack || '');
    if (pack && packs.indexOf(pack) < 0) packs.push(pack);
  });
  const homeless = packs.filter((p) => headed.indexOf("'" + p + "'") < 0
    && headed.indexOf(p + ':') < 0);
  check('and every world pack has a heading of its own on the level select',
    homeless.length === 0, homeless.join(', '));
  check('the card label is read from the world, not rebuilt from the level id',
    ui.indexOf("String(lvl.pages || '').trim()") >= 0);
}());

// ── Every clip the content asks for must name a file that can exist ──────────
// A clip is named for its text in hex, six characters per Korean syllable, so a 40-syllable
// script overruns the 255-byte filename limit. Three of them did, and the publish job died
// with ENAMETOOLONG halfway through rendering — after this validator had passed, because
// nothing but that job ever writes a clip. The check belongs here and not only in the test
// suite: the publish job runs this first, so this is the last gate before the render.
(function checkTtsClipNames() {
  const tts = require(path.join(ROOT, 'scripts', 'ttsClips.js'));
  let phrases = [];
  try { phrases = tts.collectTtsPhrases(ROOT); } catch (e) {
    check('the TTS phrase harvest runs', false, e.message);
    return;
  }
  check('the TTS harvest finds the whole corpus', phrases.length > 1500, String(phrases.length));
  const LIMIT = 255;
  const names = phrases.map((p) => ({ p: p, n: tts.ttsClipStem(p) + '.mp3' }));
  const over = names.filter((x) => x.n.length > LIMIT);
  check('every clip the content asks for names a file the filesystem will accept',
    over.length === 0,
    over.length + ' too long, longest ' + Math.max(0, ...over.map((x) => x.n.length))
      + ' bytes, e.g. ' + (over[0] ? over[0].p.slice(0, 40) : ''));
  // listLocalTtsFiles picks clips off disk with /^[0-9a-f]+\.mp3$/, so a name outside that
  // renders a clip which then never reaches the upload batch — silently, on production only.
  const bad = names.filter((x) => !/^[0-9a-f]+\.mp3$/.test(x.n));
  check('and a name the upload collector will pick up', bad.length === 0,
    bad.slice(0, 3).map((x) => x.p.slice(0, 24)).join(' | '));
}());

function pngSize(rel) {
  const buf = fs.readFileSync(path.join(ROOT, rel));
  if (buf.length < 24 || buf.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error(rel + ' is not a PNG');
  }
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

(function checkArtCatalog() {
  const rel = path.join('sprites', 'catalog.json');
  let pack;
  try { pack = JSON.parse(read(rel)); }
  catch (e) { check(`${rel} is valid JSON`, false, e.message); return; }
  check('art catalog has assets[]', Array.isArray(pack.assets) && pack.assets.length > 0);
  const ids = new Set();
  const catalogPaths = new Set();
  const gameJs = readGameSource();
  check('shipped source declares ART_LOAD', gameJs.indexOf('const ART_LOAD') >= 0);
  check('shipped source declares CROP_ART_FOLDER', gameJs.indexOf('const CROP_ART_FOLDER') >= 0);
  check('shipped source declares FARMER_ART_FOLDER', gameJs.indexOf('const FARMER_ART_FOLDER') >= 0);
  check('ART_CACHE_KEY matches catalog cacheKey',
    new RegExp('const ART_CACHE_KEY = [\'"]' + String(pack.cacheKey || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\'"]').test(gameJs),
    pack.cacheKey);
  check('preload uses artUrl', gameJs.indexOf('artUrl(a.file)') >= 0);
  const heightGroups = {};
  const shippedPaths = new Set();
  (pack.assets || []).forEach((a) => {
    if (!a || !a.id || !a.path) {
      check('catalog row has id+path', false, JSON.stringify(a));
      return;
    }
    const posix = String(a.path).replace(/\\/g, '/');
    check(`catalog id unique: ${a.id}`, !ids.has(a.id));
    ids.add(a.id);
    check(`catalog path unique: ${posix}`, !catalogPaths.has(posix), a.id);
    catalogPaths.add(posix);
    const pngRel = path.join('sprites', posix);
    if (!check(`${pngRel} exists`, fs.existsSync(path.join(ROOT, pngRel)))) return;
    if (a.status === 'shipped') {
      shippedPaths.add(posix);
      const folder = posix.includes('/') ? posix.slice(0, posix.lastIndexOf('/')) : '';
      check(`shipped source knows folder for ${posix}`, !folder || gameJs.indexOf(folder) >= 0);
    } else {
      check(`${a.id} unused has no phaserKey`, !a.phaserKey);
    }
    if (a.heightClass === 'character') {
      const sz = pngSize(pngRel);
      check(`${posix} character height 80`, sz.h === 80, sz.w + 'x' + sz.h);
      const fam = a.family || 'character';
      if (!heightGroups[fam]) heightGroups[fam] = sz.w;
      else check(`${posix} shares ${fam} width ${heightGroups[fam]}`, sz.w === heightGroups[fam], `${sz.w} vs ${heightGroups[fam]}`);
    }
    if (a.status === 'shipped' && a.phaserKey &&
        (a.heightClass === 'fence-bloom' || a.heightClass === 'ground-bloom' || a.heightClass === 'fauna')) {
      const base = posix.split('/').pop().replace(/\.png$/i, '');
      check(`${posix} phaserKey is basename_hd`, a.phaserKey === base + '_hd', a.phaserKey);
      check(`ART_LOAD includes ${a.phaserKey}`, gameJs.indexOf("key: '" + a.phaserKey + "'") >= 0);
    }
    if (a.status === 'shipped' && a.phaserKey &&
        (a.heightClass === 'item' || a.kind === 'food' || a.kind === 'item')) {
      const base = posix.split('/').pop().replace(/\.png$/i, '');
      check(`${posix} phaserKey is basename_hd`, a.phaserKey === base + '_hd', a.phaserKey);
    }
  });
  const listPng = (dir, prefix) => {
    if (!fs.existsSync(dir)) return [];
    const out = [];
    fs.readdirSync(dir).sort().forEach((n) => {
      const full = path.join(dir, n);
      const relN = prefix ? prefix + '/' + n : n;
      if (fs.statSync(full).isDirectory()) listPng(full, relN).forEach((x) => out.push(x));
      else if (n.toLowerCase().endsWith('.png')) out.push(relN.replace(/\\/g, '/'));
    });
    return out;
  };
  const onDisk = listPng(path.join(ROOT, 'sprites'));
  const orphans = onDisk.filter((p) => !catalogPaths.has(p));
  check('every PNG is in the art catalog', orphans.length === 0, orphans.slice(0, 8).join(', '));
  const artLib = auditArt(ROOT);
  check('art library disk count equals catalog', artLib.disk === artLib.catalog,
    artLib.disk + ' png vs ' + artLib.catalog + ' rows');
  check('art library has no unnamed rows', artLib.unnamed.length === 0, artLib.unnamed.slice(0, 8).join(', '));
  check('art library paths use taxonomy folders', artLib.badFolder.length === 0,
    artLib.badFolder.slice(0, 8).join(', '));
  check('art library filenames are snake_case', artLib.badSlug.length === 0,
    artLib.badSlug.slice(0, 8).join(', '));
  check('art library ids start with folder kind', artLib.badId.length === 0,
    artLib.badId.slice(0, 8).join(', '));
  check('art library has no duplicate ids', artLib.duplicateId.length === 0,
    artLib.duplicateId.slice(0, 8).join(', '));
  check('shipped source has the valley-farmer folder', gameJs.indexOf('characters/valley-farmer') >= 0);
  const hud = (pack.assets || []).filter((a) => a && a.kind === 'ui' && a.family === 'hud-icons' && a.status === 'shipped');
  check('HUD icon family has 19 shipped glyphs', hud.length === 19, String(hud.length));
  check('index HUD uses data-hud-icon',
    html.indexOf('data-hud-icon="vocab"') >= 0 && html.indexOf('data-hud-icon="coin"') >= 0);
}());

(function checkUnit10StationAabb() {
  const rel = path.join('worlds', 'unit10-layout.json');
  let pack;
  try { pack = JSON.parse(read(rel)); }
  catch (e) { check(`${rel} is valid JSON`, false, e.message); return; }
  const farm = pack.farm || { w: 180, h: 312 };
  const pngFor = {
    desk: path.join('sprites', 'furniture', 'oak_study_desk.png'),
    kitchen: path.join('sprites', 'furniture', 'farmhouse_kitchen.png'),
    taste: path.join('sprites', 'stalls', 'korean_street_food_stall.png')
  };
  const boxes = [];
  (pack.stations || []).forEach((st) => {
    const relPng = pngFor[st.id];
    if (!relPng || !fs.existsSync(path.join(ROOT, relPng))) return;
    let size;
    try { size = pngSize(relPng); }
    catch (e) { check(`${relPng} IHDR`, false, e.message); return; }
    check(`${st.id} station height is 156`, size.h === 156, `${relPng} is ${size.w}x${size.h}`);
    const ox = st.ox, oy = st.oy, originX = typeof st.originX === 'number' ? st.originX : 0.5;
    const left = ox - originX * size.w;
    const right = ox + (1 - originX) * size.w;
    const top = oy - size.h;
    const bottom = oy;
    if (st.id === 'desk' || st.id === 'taste') {
      check(`${st.id} south of farm`, oy - size.h >= farm.h, `oy ${oy} h ${size.h} farm.h ${farm.h}`);
    }
    if (st.id === 'kitchen') {
      check(`${st.id} east of farm`, ox - originX * size.w >= farm.w, `left ${left} farm.w ${farm.w}`);
    }
    boxes.push({ id: st.id, left, right, top, bottom });
  });
  check('taste stall PNG is in the layout set', boxes.some((b) => b.id === 'taste'));
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      const hit = a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      check(`${a.id} AABB does not overlap ${b.id}`, !hit,
        `[${a.left.toFixed(1)},${a.right.toFixed(1)}]x[${a.top},${a.bottom}] vs [${b.left.toFixed(1)},${b.right.toFixed(1)}]x[${b.top},${b.bottom}]`);
    }
  }
}());

(function checkSkinCatalog() {
  const rel = path.join('skins', 'catalog.json');
  let pack;
  try { pack = JSON.parse(read(rel)); }
  catch (e) { check(`${rel} is valid JSON`, false, e.message); return; }
  check('skin catalog has skins[]', Array.isArray(pack.skins) && pack.skins.length > 0);
  check('skin catalog defaultSkinId is farmer', pack.defaultSkinId === 'farmer');
  const ID_RE = /^[a-z][a-z0-9_]{1,31}$/;
  const ids = new Set();
  const gameJs = readGameSource();
  const boot = gameJs.match(/const SKIN_CATALOG_BOOT_V = ['"]([^'"]+)['"]/);
  check('SKIN_CATALOG_BOOT_V matches catalog cacheKey',
    !!(boot && boot[1] === pack.cacheKey), pack.cacheKey);
  (pack.skins || []).forEach((s) => {
    if (!s || !s.id) { check('skin row has id', false); return; }
    check(`skin id charset: ${s.id}`, ID_RE.test(s.id));
    check(`skin id unique: ${s.id}`, !ids.has(s.id));
    ids.add(s.id);
    check(`${s.id} has English nameEn`, typeof s.nameEn === 'string' && s.nameEn.trim());
    check(`${s.id} art is matrix or hd`, s.art === 'matrix' || s.art === 'hd');
    check(`${s.id} has matrixPrefix`, typeof s.matrixPrefix === 'string' && s.matrixPrefix);
    if (Array.isArray(s.worldCostumeOf)) {
      s.worldCostumeOf.forEach((wid) => check(`${s.id} worldCostumeOf ${wid} is a string`, typeof wid === 'string' && wid));
    }
    if (s.art === 'hd') {
      const folder = String(s.folder || ('skins/' + s.id)).replace(/\\/g, '/');
      check(`${s.id} hd folder has no ..`, folder.indexOf('..') < 0);
      const files = Array.isArray(s.files) ? s.files : [];
      check(`${s.id} hd files[] is non-empty`, files.length > 0);
      const walk = (s.states && s.states.walk) || { dirs: ['down', 'up', 'left', 'right'], frames: 3 };
      const dirs = walk.dirs || ['down', 'up', 'left', 'right'];
      const n = walk.frames || 3;
      dirs.forEach((dir) => {
        for (let f = 0; f < n; f++) {
          const name = 'walk_' + dir + '_' + f + '.png';
          check(`${s.id} lists ${name}`, files.indexOf(name) >= 0);
          check(`sprites/${folder}/${name} exists`, fs.existsSync(path.join(ROOT, 'sprites', folder, name)));
        }
      });
      if (s.states && s.states.idle && !s.states.idle.derived) {
        check(`${s.id} idle is derived in v1`, false);
      }
    } else {
      check(`${s.id} matrix has empty files[]`, !s.files || s.files.length === 0);
    }
  });
  check('catalog contains farmer', ids.has('farmer'));
  check('catalog contains chef', ids.has('chef'));

  const start = gameJs.indexOf('const SKIN_CATALOG_DEFAULT =');
  check('shipped source declares SKIN_CATALOG_DEFAULT', start >= 0);
  if (start < 0) return;
  const brace = gameJs.indexOf('{', start);
  let depth = 0, end = -1;
  for (let i = brace; i < gameJs.length; i++) {
    if (gameJs[i] === '{') depth++;
    else if (gameJs[i] === '}') {
      depth--;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  check('SKIN_CATALOG_DEFAULT object is closed', end > brace);
  if (end <= brace) return;
  let defPack;
  try {
    defPack = Function('"use strict"; return (' + gameJs.slice(brace, end) + ')')();
  } catch (e) {
    check('SKIN_CATALOG_DEFAULT parses', false, e.message);
    return;
  }
  check('DEFAULT defaultSkinId matches catalog', defPack.defaultSkinId === pack.defaultSkinId);
  const defIds = (defPack.skins || []).map((s) => s.id).sort().join(',');
  const liveIds = (pack.skins || []).map((s) => s.id).sort().join(',');
  check('DEFAULT skin ids match catalog', defIds === liveIds, defIds + ' vs ' + liveIds);
  (pack.skins || []).forEach((live) => {
    const d = (defPack.skins || []).find((s) => s.id === live.id);
    check(`DEFAULT ${live.id} matrixPrefix matches`, d && d.matrixPrefix === live.matrixPrefix);
    if (live.id === pack.defaultSkinId) {
      check(`DEFAULT ${live.id} art is hd`, d && d.art === 'hd');
      check(`DEFAULT ${live.id} files[] match catalog`,
        d && JSON.stringify(d.files || []) === JSON.stringify(live.files || []));
      check(`DEFAULT ${live.id} folder matches catalog`, d && d.folder === live.folder);
    } else {
      check(`DEFAULT ${live.id} art is matrix`, d && d.art === 'matrix');
      check(`DEFAULT ${live.id} files[] is empty`, d && Array.isArray(d.files) && d.files.length === 0);
    }
  });
}());

(function checkUnit10VocabArt() {
  const world = JSON.parse(read(path.join('worlds', '2b-unit-10.json')));
  const words = (((world || {}).level || {}).words) || [];
  // artPending is the only way out of the PNG gate below, so the drawn count is what is
  // pinned: flipping a shipped 어휘 word to artPending to dodge its picture drops it to 79.
  const drawnArt = words.filter((w) => !w.artPending);
  check('Unit 10 has 80 drawn headwords', drawnArt.length === 80, String(drawnArt.length));
  const pack = JSON.parse(read(path.join('sprites', 'catalog.json')));
  const byKo = {};
  (pack.assets || []).forEach((a) => { if (a && a.wordKo) byKo[a.wordKo] = a; });
  const missing = [];
  drawnArt.forEach((w) => {
    const a = byKo[w.ko];
    if (!a || !a.id || !a.nameEn || !a.path) { missing.push(w.ko); return; }
    const pngRel = path.join('sprites', String(a.path).replace(/\\/g, '/'));
    if (!fs.existsSync(path.join(ROOT, pngRel))) missing.push(w.ko + ' png');
  });
  check('every Unit 10 headword has catalogued PNG', missing.length === 0, missing.slice(0, 12).join(', '));

  const overlays = read(path.join('js', 'overlays.js'));
  const ui = read(path.join('js', 'ui.js'));
  const farm = read(path.join('js', 'scenes', 'farm.js'));
  // The kitchen's three icon sites now route through one `ckArt` helper instead of
  // repeating the vocabIconHtml call, so asserting the old literal call shape would fail
  // on a refactor that kept the guarantee intact. What actually matters is unchanged:
  // the helper resolves to vocabIconHtml, and all three sites go through the helper — so
  // none of them can quietly fall back to a bare emoji.
  const ckArtDef = /function ckArt\([\s\S]{0,400}?vocabIconHtml\(/.test(overlays);
  check('cooking art helper resolves to vocabIconHtml', ckArtDef);
  check('cooking overlay prefers vocabIconHtml', ckArtDef && overlays.indexOf('ckArt(r.nameKo') >= 0);
  check('cooking detail prefers vocabIconHtml', ckArtDef && overlays.indexOf('ckArt(recipe.nameKo') >= 0);
  check('cooking pantry prefers vocabIconHtml', ckArtDef && overlays.indexOf('ckArt(info.nameKo') >= 0);
  check('inventory prefers vocabIconHtml', ui.indexOf('vocabIconHtml') >= 0);
  check('inventory empty slots use crate art', ui.indexOf('crateIconHtml') >= 0);
  check('trophy cards use trophyIconHtml', overlays.indexOf('trophyIconHtml(t.id') >= 0);
  check('recipe book pantry uses vocab chips', overlays.indexOf('recipe-pantry-chip') >= 0);
  check('farm loads cooking HD via vocabArtLoadEntries', farm.indexOf('vocabArtLoadEntries') >= 0);

  const recStart = overlays.indexOf('var UNIT10_COOKING_RECIPES =');
  const recEnd = overlays.indexOf('];', recStart);
  const recBlock = recStart >= 0 ? overlays.slice(recStart, recEnd) : '';
  const dishKos = [...recBlock.matchAll(/nameKo: '([^']+)'/g)].map((m) => m[1]);
  const ingMatch = overlays.match(/var UNIT10_INGREDIENTS = \[([^\]]+)\]/);
  const ings = ingMatch
    ? [...ingMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
    : [];
  const unwired = [];
  dishKos.concat(ings).forEach((ko) => {
    const a = byKo[ko];
    if (!a || !a.path) { unwired.push(ko); return; }
    const pngRel = path.join('sprites', String(a.path).replace(/\\/g, '/'));
    if (!fs.existsSync(path.join(ROOT, pngRel))) unwired.push(ko + ' png');
  });
  check('every Unit 10 cooking ingredient/dish has wired HD icon', unwired.length === 0, unwired.slice(0, 12).join(', '));
  check('Unit 10 cooking has dishes and ingredients', dishKos.length >= 12 && ings.length >= 14,
    `dishes ${dishKos.length} ings ${ings.length}`);

  const vocabArt = read(path.join('js', 'vocabArt.js'));
  const farmStart = overlays.indexOf('var COOKING_RECIPES =');
  const farmEnd = overlays.indexOf('];', farmStart);
  const farmBlock = farmStart >= 0 ? overlays.slice(farmStart, farmEnd) : '';
  const farmKos = [...farmBlock.matchAll(/nameKo: '([^']+)'/g)].map((m) => m[1]);
  const farmMissing = farmKos.filter((ko) => {
    const hit = vocabArt.indexOf("ko: '" + ko + "'") >= 0;
    return !hit;
  });
  check('every farm cooking dish has a vocabArt row', farmMissing.length === 0, farmMissing.join(', '));

  const fishSrc = read(path.join('js', 'data.js'));
  const fishKos = [...fishSrc.matchAll(/ko:'([^']+)'/g)].map((m) => m[1]);
  const slugOf = (ko) => {
    const m = vocabArt.match(new RegExp("ko: '" + ko.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "', slug: '([^']+)'"));
    return m ? m[1] : '';
  };
  const fishSlugs = fishKos.map(slugOf);
  check('every fish has a vocabArt slug', fishSlugs.every(Boolean), fishKos.filter((_, i) => !fishSlugs[i]).join(', '));
  check('fish vocab slugs are unique', new Set(fishSlugs).size === fishSlugs.length, fishSlugs.join(', '));
}());

STATIC_FILES.forEach(([rel]) => {
  check(rel + ' exists for R2 upload', fs.existsSync(path.join(ROOT, rel)));
});

// ── vercel.json's `functions` block matches the routes on disk ───────────────
// The ceiling itself is counted once, under "The Vercel function ceiling" above; a second copy
// lived here and drifted, so what stays is only the half that has no other home. The route list
// is rebuilt here because both checks below are about which routes vercel.json names.
(function checkVercelFunctionsBlock() {
  const apiDir = path.join(ROOT, 'api');
  const routes = [];
  (function walk(dir, rel) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) { walk(full, rel ? rel + '/' + name : name); continue; }
      if (!name.endsWith('.js') || name.startsWith('_')) continue;
      routes.push(rel ? rel + '/' + name : name);
    }
  }(apiDir, ''));

  // The other half of the same trap, and the one that actually broke the last two
  // deployments. vercel.json's `functions` block names each function by path and lists the data
  // files to bundle with it, so deleting or renaming a route without editing that block fails
  // the build with "the pattern api/art.js ... doesn't match any Serverless Functions inside
  // the api directory" — one second in, after CI has already gone green. The block is the real
  // mechanism for getting levels.json and sprites/ into a function; the require() calls beside
  // the handlers are not.
  const vercelCfg = JSON.parse(read('vercel.json'));
  const declared = Object.keys(vercelCfg.functions || {});
  const orphaned = declared.filter((rel) => !fs.existsSync(path.join(ROOT, rel)));
  check('every vercel.json `functions` pattern matches a file', orphaned.length === 0,
    orphaned.join(', '));
  // And the reverse, which fails quietly rather than loudly: a route that reads a data file but
  // is not in the block ships without it and throws at runtime instead of at build time.
  const undeclared = routes.filter((rel) => !declared.includes('api/' + rel));
  check('routes outside the `functions` block need no bundled data',
    undeclared.every((rel) => {
      const src = read(path.join('api', rel));
      return !/require\('\.\.\/[^']*\.json'\)/.test(src);
    }),
    'these require a JSON but are not in vercel.json functions: ' + undeclared.join(', '));
}());

// ── Report ───────────────────────────────────────────────────────────────────
console.log(`\nvalidate_content: ${checks - failures.length}/${checks} invariants hold`);
if (failures.length) {
  console.error('\nFAILED:');
  failures.forEach((f) => console.error(`  ✗ ${f}`));
  process.exit(1);
}
console.log('All content invariants hold ✓');
