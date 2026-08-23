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
  // Split, because the two halves guarantee different things. The 54 are the textbook's own
  // 어휘 list and that count is a fidelity claim — it must not drift. The rest are words the
  // unit's exercises drill that the 어휘 list does not carry: the six 금지 actions off
  // 문법과 표현 4 and 문형 연습 4, which a learner met on the page and could not otherwise learn.
  // They are marked artPending because their icons are still to be drawn; see the art check
  // below, which names them rather than waving them through.
  const drawn = ww.filter((w) => !w.artPending);
  check('2B Unit 14 keeps its 54 textbook headwords', drawn.length === 54, `found ${drawn.length}`);
  check('2B Unit 14 exercise words are all in one group',
    ww.filter((w) => w.artPending).every((w) => w.categoryEn === 'Public etiquette & prohibitions'),
    ww.filter((w) => w.artPending).map((w) => w.ko + ':' + w.categoryEn).join(', '));
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
    /'2b-unit-10': \{ extras: \[\], stations: \['desk', 'kitchen', 'taste'\] \}/.test(gameJs)
    && /'2b-unit-14': \{ extras: \[\], stations: \['desk'\] \}/.test(gameJs));
  check('farm applies world packs instead of hiding sprites',
    gameJs.indexOf('applyWorld') >= 0
    && gameJs.indexOf('_teardownExtra') >= 0
    && !/syncUnit10World\(\)\{[\s\S]{0,400}_setMinigameSpritesVisible/.test(gameJs));
  check('Unit 14 is the desk-only pack',
    /'2b-unit-14': \{ extras: \[\], stations: \['desk'\] \}/.test(gameJs));
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
    // The illustrations come later; a row must not name a PNG that is not there,
    // because the overlay would paint a broken image rather than fall back.
    if (q && q.art) bad.push(`q${q.id} names art ${q.art} before any is drawn`);
  });
  check('Unit 11 desk quiz rows are complete and art-free', bad.length === 0, bad.slice(0, 6).join(', '));
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
  const scripted = tracks.filter((t) => Array.isArray(t.lines));
  check('six tracks carry a script', scripted.length === 6, `found ${scripted.length}`);
  const silent = tracks.filter((t) => !Array.isArray(t.lines));
  check('the two listen-only tracks are 18 and 19',
    silent.map((t) => t.n).join(',') === '18,19', silent.map((t) => t.n).join(','));
  check('and each says why it has no script', silent.every((t) => !!t.noteEn));

  const items = (c.dictation && c.dictation.items) || [];
  check('25 dictation sentences', items.length === 25, `found ${items.length}`);
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
  check('rows split from a longer turn say so', splits.length === 4, `found ${splits.length}`);
  check('and each split row is a substring of the turn it names',
    splits.every((i) => i.splitFrom.replace(/\s/g, '').indexOf(i.ko.replace(/\s/g, '')) >= 0));
}());

(function checkUnit11CassetteWiring() {
  const gameJs = readGameSource();
  check('the cassette sprite is baked', /createTexture\(this, 'cassette_player'/.test(gameJs));
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
  const silent = tracks.filter((t) => !Array.isArray(t.lines));
  check('the two listen-only tracks are 38 and 39',
    silent.map((t) => t.n).join(',') === '38,39', silent.map((t) => t.n).join(','));
  check('and each says why it has no script', silent.every((t) => !!t.noteEn));
  const items = (c.dictation && c.dictation.items) || [];
  check('37 dictation sentences', items.length === 37, `found ${items.length}`);
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

// ── Vercel's function budget ─────────────────────────────────────────────────
// Every file under api/ that is not a helper becomes a serverless function, and the Hobby
// plan allows twelve per deployment. Adding the thirteenth does not fail here, or in any
// suite, or in CI — it fails in Vercel's build, minutes later, and leaves the previous
// deployment serving. So the whole pipeline goes green and nothing ships, which is what
// happened when api/leaderboard.js was added to a project already sitting on twelve.
//
// Underscore-prefixed files are modules the routes require, not routes, and are not counted.
// Every admin read now lives in api/[...path].js — eight files became one — so the count sits
// at four with room to spare. If this ever trips again, look for routes that differ only in
// which getter they call: that is what the catch-all already absorbed.
(function checkVercelFunctionBudget() {
  const VERCEL_HOBBY_MAX = 12;
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
  check(
    `api/ has at most ${VERCEL_HOBBY_MAX} serverless functions`,
    routes.length <= VERCEL_HOBBY_MAX,
    `${routes.length} routes: ${routes.sort().join(', ')}`
  );

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
