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
check('index.html links css/game.css', html.indexOf('href="css/game.css"') >= 0);
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
const scriptSrcs = [...html.matchAll(/<script\b[^>]*\bsrc="(js\/[^"]+)"[^>]*><\/script>/gi)].map((m) => m[1]);
check('index.html script tags match js/manifest.json',
  JSON.stringify(scriptSrcs) === JSON.stringify(GAME_SCRIPTS),
  scriptSrcs.join(',') + ' vs ' + GAME_SCRIPTS.join(','));

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
  check('2B Unit 10 has the full textbook word list', ww.length === 80, `found ${ww.length}`);
  const cats = new Set(ww.map((w) => w.category));
  check('2B Unit 10 has six vocab groups', ['음식', '맛', '식당 평가', '읽기', '주문', '회화'].every((c) => cats.has(c)),
    [...cats].join(', '));
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
  check('2B Unit 14 has 54 textbook headwords', ww.length === 54, `found ${ww.length}`);
  const cats = new Set(ww.map((w) => w.categoryEn));
  const want = [
    'Etiquette & respect for seniors',
    'Public etiquette & prohibitions',
    'Real-life dialogues',
    'Listening & dormitory rules',
    'Reading & culture'
  ];
  check('2B Unit 14 has five vocab groups', want.every((c) => cats.has(c)), [...cats].join(', '));
  const keepKo = ww.some((w) => w.ko === '높임말[존댓말]을 하다') && ww.some((w) => w.ko === '야단(을) 맞다');
  check('2B Unit 14 keeps OBJECTIVE Korean forms', keepKo);
  const pack = JSON.parse(read(path.join('sprites', 'catalog.json')));
  const byKo = {};
  (pack.assets || []).forEach((a) => { if (a && a.wordKo) byKo[a.wordKo] = a; });
  const artMiss = [];
  ww.forEach((w) => {
    const a = byKo[w.ko];
    if (!a || !a.id || !a.nameEn || !a.path) { artMiss.push(w.ko); return; }
    const pngRel = path.join('sprites', String(a.path).replace(/\\/g, '/'));
    if (!fs.existsSync(path.join(ROOT, pngRel))) artMiss.push(w.ko + ' png');
  });
  check('every Unit 14 headword has catalogued PNG', artMiss.length === 0, artMiss.slice(0, 12).join(', '));
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
    /'2b-unit-10': \{ extras: \[\], stations: \['desk', 'kitchen', 'taste'\] \}/.test(gameJs)
    && /'2b-unit-14': \{ extras: \[\], stations: \['desk'\] \}/.test(gameJs));
  check('farm applies world packs instead of hiding sprites',
    gameJs.indexOf('applyWorld') >= 0
    && gameJs.indexOf('_teardownExtra') >= 0
    && !/syncUnit10World\(\)\{[\s\S]{0,400}_setMinigameSpritesVisible/.test(gameJs));
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
  check('Unit 10 has 80 headwords', words.length === 80, String(words.length));
  const pack = JSON.parse(read(path.join('sprites', 'catalog.json')));
  const byKo = {};
  (pack.assets || []).forEach((a) => { if (a && a.wordKo) byKo[a.wordKo] = a; });
  const missing = [];
  words.forEach((w) => {
    const a = byKo[w.ko];
    if (!a || !a.id || !a.nameEn || !a.path) { missing.push(w.ko); return; }
    const pngRel = path.join('sprites', String(a.path).replace(/\\/g, '/'));
    if (!fs.existsSync(path.join(ROOT, pngRel))) missing.push(w.ko + ' png');
  });
  check('every Unit 10 headword has catalogued PNG', missing.length === 0, missing.slice(0, 12).join(', '));

  const overlays = read(path.join('js', 'overlays.js'));
  const ui = read(path.join('js', 'ui.js'));
  const farm = read(path.join('js', 'scenes', 'farm.js'));
  check('cooking overlay prefers vocabIconHtml', overlays.indexOf('vocabIconHtml(r.nameKo') >= 0);
  check('cooking detail prefers vocabIconHtml', overlays.indexOf('vocabIconHtml(recipe.nameKo') >= 0);
  check('cooking pantry prefers vocabIconHtml', overlays.indexOf('vocabIconHtml(info.nameKo') >= 0);
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

// ── Report ───────────────────────────────────────────────────────────────────
console.log(`\nvalidate_content: ${checks - failures.length}/${checks} invariants hold`);
if (failures.length) {
  console.error('\nFAILED:');
  failures.forEach((f) => console.error(`  ✗ ${f}`));
  process.exit(1);
}
console.log('All content invariants hold ✓');
