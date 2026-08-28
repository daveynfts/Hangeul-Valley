// ═══════════════ ECONOMY STATE & CURRENCY HELPERS ════════════════════════════
var unlockedLevels = [0];  // Level indices the player has bought
var unlockedTrophies = []; // IDs of the trophies the player has bought
const harvestCounts = new Map(); // word.ko → how many times harvested

// ── Display labels: English primary, Korean kept alongside ───────────────────
// levels.json carries both (`name`/`nameEn`, `category`/`categoryEn`); the Korean
// topic label is itself learnable content, so it is shown rather than discarded.
function levelName(lvl)   { return (lvl && (lvl.nameEn || lvl.name)) || ''; }
function levelNameKo(lvl) { return (lvl && lvl.nameEn && lvl.name) ? lvl.name : ''; }
function wordCategory(w)  { return (w && (w.categoryEn || w.category)) || ''; }

function isWorldLevel(lvl) {
  return !!(lvl && (lvl.world || lvl.worldId || lvl.pack === 'snu-2b'));
}
function isUnit10World() {
  return isWorldLevel(currentLesson()) && currentLesson().worldId === '2b-unit-10';
}
function isUnit11World() {
  return isWorldLevel(currentLesson()) && currentLesson().worldId === '2b-unit-11';
}
function isUnit13World() {
  return isWorldLevel(currentLesson()) && currentLesson().worldId === '2b-unit-13';
}
function isUnit14World() {
  return isWorldLevel(currentLesson()) && currentLesson().worldId === '2b-unit-14';
}
function isUnit15World() {
  return isWorldLevel(currentLesson()) && currentLesson().worldId === '2b-unit-15';
}
// The exam world. Not a chapter of anything: it has no fixed word list, no 퀴즈 and no tape,
// and its content arrives one question at a time. Everything else about it is an ordinary
// world — a farm and a study desk — which is the point, since the words an exam question
// brings in should be farmable like any other.
function isTopikWorld() {
  return isWorldLevel(currentLesson()) && currentLesson().worldId === 'topik-2';
}
function isTextbookFarmWorld() {
  const p = typeof currentWorldPack === 'function' ? currentWorldPack() : null;
  return !!(p && p.id && p.id !== 'valley');
}
const VALLEY_EXTRA_IDS = ['shop', 'board', 'arcade', 'wizard', 'cat', 'beehive', 'portal', 'fishing'];
const WORLD_PACKS = {
  valley: { extras: ['shop', 'board', 'arcade', 'cat', 'beehive', 'portal', 'fishing'], stations: [] },
  '2b-unit-10': { extras: [], stations: ['desk', 'kitchen', 'taste', 'cassette'] },
  '2b-unit-11': { extras: [], stations: ['desk', 'cassette'] },
  '2b-unit-13': { extras: [], stations: ['desk', 'cassette'] },
  '2b-unit-14': { extras: [], stations: ['desk', 'cassette'] },
  '2b-unit-15': { extras: [], stations: ['desk', 'cassette'] },
  'topik-2': { extras: [], stations: ['desk'] }
};
function worldPackIdForLesson(lvl) {
  if (lvl && lvl.worldId && WORLD_PACKS[lvl.worldId]) return lvl.worldId;
  return 'valley';
}
function currentWorldPack() {
  const lvl = typeof currentLesson === 'function' ? currentLesson() : null;
  const id = worldPackIdForLesson(lvl);
  const base = WORLD_PACKS[id] || WORLD_PACKS.valley;
  const map = lvl && lvl.map;
  return {
    id,
    extras: (map && Array.isArray(map.extras)) ? map.extras.slice() : base.extras.slice(),
    stations: (map && Array.isArray(map.stations)) ? map.stations.slice() : base.stations.slice()
  };
}
function worldPackHas(pack, kind, id) {
  const p = pack || currentWorldPack();
  const list = kind === 'station' ? p.stations : p.extras;
  return !!(list && list.indexOf(id) >= 0);
}
function artLoadForWorldPack(id) {
  if (id === '2b-unit-10') {
    return [
      { key: 'study_desk_hd', file: 'furniture/oak_study_desk.png' },
      { key: 'unit10_kitchen_hd', file: 'furniture/farmhouse_kitchen.png' },
      { key: 'unit10_taste_stall_hd', file: 'stalls/korean_street_food_stall.png' }
    ];
  }
  if (id === '2b-unit-11' || id === '2b-unit-13' || id === '2b-unit-14' || id === '2b-unit-15') {
    return [
      { key: 'study_desk_hd', file: 'furniture/oak_study_desk.png' }
    ];
  }
  return [];
}
const TEXTBOOK_WORLD_FILES = [
  { cache: 'world-2b-10', file: 'worlds/2b-unit-10.json' },
  { cache: 'world-2b-11', file: 'worlds/2b-unit-11.json' },
  { cache: 'world-2b-13', file: 'worlds/2b-unit-13.json' },
  { cache: 'world-2b-14', file: 'worlds/2b-unit-14.json' },
  { cache: 'world-2b-15', file: 'worlds/2b-unit-15.json' },
  // Not from a textbook, but it loads the same way and the list is what attaches a world.
  { cache: 'world-topik-2', file: 'worlds/topik-2.json' }
];
const UNIT10_LAYOUT_DEFAULT = {
  stations: [
    { id: 'desk', nameKo: '학습 책상', ox: -28, oy: 480, scale: 1, originX: 0.52, interact: 80 },
    { id: 'kitchen', nameKo: '요리 주방', ox: 328, oy: 252, scale: 1, originX: 0.48, interact: 82 },
    { id: 'taste', nameKo: '한 입 포장마차', ox: 144, oy: 480, scale: 1, originX: 0.5, interact: 80 },
    { id: 'cassette', nameKo: '카세트 플레이어', ox: 300, oy: 478, scale: 1, originX: 0.5, interact: 78 }
  ]
};
function getUnit10Layout() {
  try {
    if (typeof sceneRef !== 'undefined' && sceneRef && sceneRef.cache && sceneRef.cache.json && sceneRef.cache.json.exists('unit10-layout')) {
      return sceneRef.cache.json.get('unit10-layout') || UNIT10_LAYOUT_DEFAULT;
    }
  } catch (e) {}
  return UNIT10_LAYOUT_DEFAULT;
}
function getUnit10Station(id) {
  const pack = getUnit10Layout();
  const found = ((pack && pack.stations) || []).find(s => s && s.id === id);
  return found || UNIT10_LAYOUT_DEFAULT.stations.find(s => s.id === id);
}
function unit10StationXY(farm, spec) {
  const f = farm || { x: 300, y: 220, w: 180, h: 312 };
  const s = spec || {};
  return { x: f.x + (s.ox || 0), y: f.y + (s.oy || 0) };
}
function hdStationScale(spec) {
  const s = spec && spec.scale;
  return (typeof s === 'number' && s > 0 && s <= 1.2) ? s : 1;
}
const CROP_HD_NAMES = ['blossom', 'cabbage', 'strawberry', 'corn', 'sunflower'];
const ART_DIR = 'sprites/';
const ART_CACHE_KEY = 'art-20260827h';
function artUrl(file) {
  return ART_DIR + file + '?v=' + encodeURIComponent(ART_CACHE_KEY);
}
const ART_LOAD = [
  { key: 'fence_rose_red_hd', file: 'decorations/fence_rose_red.png' },
  { key: 'fence_buttercup_yellow_hd', file: 'decorations/fence_buttercup_yellow.png' },
  { key: 'fence_lavender_purple_hd', file: 'decorations/fence_lavender_purple.png' },
  { key: 'wildflower_rose_red_hd', file: 'decorations/wildflower_rose_red.png' },
  { key: 'wildflower_buttercup_yellow_hd', file: 'decorations/wildflower_buttercup_yellow.png' },
  { key: 'wildflower_lavender_purple_hd', file: 'decorations/wildflower_lavender_purple.png' },
  { key: 'cabbage_white_butterfly_open_hd', file: 'decorations/cabbage_white_butterfly_open.png' },
  { key: 'cabbage_white_butterfly_flap_hd', file: 'decorations/cabbage_white_butterfly_flap.png' },
  { key: 'apple_tree_hd', file: 'plants/apple_tree/summer.png' },
  { key: 'apple_tree_ripe_hd', file: 'plants/apple_tree/ripe.png' },
  { key: 'wooden_stool_hd', file: 'furniture/wooden_stool.png' },
  { key: 'wooden_crate_hd', file: 'furniture/wooden_crate.png' },
  { key: 'oak_barrel_hd', file: 'furniture/oak_barrel.png' },
  { key: 'stone_well_hd', file: 'decorations/stone_well.png' },
  { key: 'wooden_signpost_hd', file: 'decorations/wooden_signpost.png' },
  { key: 'oak_fence_post_hd', file: 'decorations/oak_fence_post.png' },
  { key: 'oak_fence_rail_hd', file: 'decorations/oak_fence_rail.png' }
];
const CROP_ART_FOLDER = {
  blossom: 'plants/cherry_blossom',
  cabbage: 'plants/napa_cabbage',
  strawberry: 'plants/strawberry',
  corn: 'plants/sweet_corn',
  sunflower: 'plants/sunflower'
};
const CROP_STAGE_FILE = { 1: 'sprout.png', 2: 'growing.png', 3: 'ripe.png' };
const FARMER_ART_FOLDER = 'characters/valley-farmer';
function cropTex(scene, type, stage) {
  const n = CROP_HD_NAMES[type] || CROP_HD_NAMES[0];
  const hd = 'crop_' + n + '_' + stage + '_hd';
  if (scene && scene.textures && scene.textures.exists(hd)) return hd;
  return 'cr_' + type + '_' + stage;
}
function appleTreeTex(scene, ripe) {
  const hd = ripe ? 'apple_tree_ripe_hd' : 'apple_tree_hd';
  if (scene && scene.textures && scene.textures.exists(hd)) return hd;
  return ripe ? 'apple_tree_ripe' : 'apple_tree';
}
const FENCE_BLOOM_HD = {
  red: 'fence_rose_red_hd',
  yellow: 'fence_buttercup_yellow_hd',
  purple: 'fence_lavender_purple_hd'
};
const GROUND_WILDFLOWER_HD = {
  red: 'wildflower_rose_red_hd',
  yellow: 'wildflower_buttercup_yellow_hd',
  purple: 'wildflower_lavender_purple_hd'
};
function fenceBloomTex(scene, color) {
  const hd = FENCE_BLOOM_HD[color];
  if (hd && scene && scene.textures && scene.textures.exists(hd)) return hd;
  return 'flw_' + color;
}
function wildflowerTex(scene, color) {
  const hd = GROUND_WILDFLOWER_HD[color];
  if (hd && scene && scene.textures && scene.textures.exists(hd)) return hd;
  return 'flw_' + color;
}
function butterflyTex(scene, pose) {
  const hd = pose === 'flap' ? 'cabbage_white_butterfly_flap_hd' : 'cabbage_white_butterfly_open_hd';
  if (scene && scene.textures && scene.textures.exists(hd)) return hd;
  return pose === 'flap' ? 'bf_flap' : 'bf_open';
}
function currentLesson() {
  return (typeof levelsData !== 'undefined' && levelsData[currentLevelIndex]) || null;
}
function attachTextbookWorld(world) {
  if (!world || !world.level || !Array.isArray(levelsData)) return -1;
  const lvl = Object.assign({}, world.level, {
    world: true,
    pack: world.pack || 'snu-2b',
    worldId: world.id,
    map: world.map || (world.level && world.level.map) || null,
    costumeSkinId: world.costumeSkinId || (world.level && world.level.costumeSkinId) || null,
    notebook: world.notebook || null,
    upcoming: world.upcoming || [],
    source: world.source || '',
    pages: world.pages || '',
    title: world.title || world.level.nameEn,
    titleKo: world.titleKo || world.level.name
  });
  const existing = levelsData.findIndex(l => l && l.worldId === world.id);
  if (existing >= 0) { levelsData[existing] = lvl; return existing; }
  levelsData.push(lvl);
  return levelsData.length - 1;
}
let textbookWorldsTried = false;
function loadTextbookWorlds(done) {
  const specs = TEXTBOOK_WORLD_FILES;
  let remaining = specs.length;
  // Attached in list order, not in the order the network answers. These five fetches run at
  // once, so whoever comes back first used to land first — which on localhost is the list
  // order and over a CDN is by file size, putting Unit 10 last. The menu reshuffled itself
  // between page loads. Results are parked by index and attached when all five have settled.
  const got = new Array(specs.length).fill(null);
  const one = (data, i) => {
    got[i] = data || null;
    remaining--;
    if (remaining <= 0) {
      got.forEach((w) => { if (w) attachTextbookWorld(w); });
      textbookWorldsTried = true;
      if (typeof done === 'function') done();
    }
  };
  specs.forEach((spec, i) => {
    if (typeof sceneRef !== 'undefined' && sceneRef?.cache?.json?.exists?.(spec.cache)) {
      one(sceneRef.cache.json.get(spec.cache), i);
      return;
    }
    if ((typeof IS_NODE !== 'undefined' && IS_NODE) || typeof fetch !== 'function') {
      one(null, i);
      return;
    }
    fetch(spec.file)
      .then(r => r && r.ok ? r.json() : null)
      .then((d) => one(d, i))
      .catch(() => one(null, i));
  });
}

function getUnlockedWords() {
  const lesson = currentLesson();
  // A world farms its own chapter list. The exam world is the exception: its list grows one
  // question at a time and starts empty, and an empty pool makes _pickWord() hand back
  // undefined — manual planting dies on a map that otherwise looks perfectly fine. So an
  // empty world list falls through to everything the player owns, which on an exam map is
  // the right pool to be drawing from anyway. A world that has words behaves as before.
  const own = isWorldLevel(lesson) ? (lesson.words || []) : null;
  if (own && own.length) return own.slice();
  if (typeof unlockedLevels === 'undefined' || !Array.isArray(unlockedLevels)) {
    return (typeof levelsData !== 'undefined' && levelsData[0]?.words) ? levelsData[0].words : [];
  }
  const words = unlockedLevels
    .filter(idx => !isWorldLevel(typeof levelsData !== 'undefined' ? levelsData[idx] : null))
    .flatMap(idx => (typeof levelsData !== 'undefined' && levelsData[idx]?.words) ? levelsData[idx].words : []);
  if (words.length > 0) return words;
  return (typeof levelsData !== 'undefined' && levelsData[0]?.words) ? levelsData[0].words : [];
}

function addCoins(amount) {
  let finalAmt = amount;
  if (amount > 0) {
    if (typeof isBuffActive === 'function' && isBuffActive('coin_boost')) {
      finalAmt = Math.round(finalAmt * 2.0);
    }
  }
  playerCurrencies.coins = Math.max(0, playerCurrencies.coins + finalAmt);
  // Spending is already announced by whatever the player clicked; earning had
  // no sound at all. Rate limited in the mixer, so a payout loop cannot buzz.
  if (finalAmt > 0 && typeof playChiptuneSFX === 'function') playChiptuneSFX('coin');
  syncGoldAlias();
  persistSave();
  updateCurrencyHUD(true);
  checkAffordablePacks();
}

function addGems(amount) {
  const finalGems = amount;
  playerCurrencies.gems = Math.max(0, playerCurrencies.gems + finalGems);
  syncGoldAlias();
  persistSave();
  updateCurrencyHUD(true);
  showToast(`💎 Earned +${finalGems} Gem${finalGems > 1 ? 's' : ''}!`);
}

function addHonor(amount) {
  const finalHonor = amount;
  playerCurrencies.honor = Math.max(0, playerCurrencies.honor + finalHonor);
  syncGoldAlias();
  persistSave();
  updateCurrencyHUD(true);
  showToast(`🎖️ Earned +${finalHonor} Honor!`);
  checkQuestProgress('honor', { total: playerCurrencies.honor });
  if (typeof updateLeaderboardMetrics === 'function') updateLeaderboardMetrics();
}

function spendCoins(amount) {
  if (playerCurrencies.coins >= amount) {
    playerCurrencies.coins -= amount;
    syncGoldAlias();
    persistSave();
    updateCurrencyHUD();
    return true;
  }
  return false;
}

function addGold(amount) {
  addCoins(amount);
}

function updateCurrencyHUD(pop = false) {
  const el = document.getElementById('gold-val');
  if (el) el.textContent = playerCurrencies.coins;
  const bg = document.getElementById('shop-gold-val');
  if (bg) bg.textContent = playerCurrencies.coins;
  const tz = document.getElementById('trophy-gold-val');
  if (tz) tz.textContent = playerCurrencies.coins;

  const gVal = document.getElementById('gems-val');
  if (gVal) gVal.textContent = playerCurrencies.gems;
  const hVal = document.getElementById('honor-val');
  if (hVal) hVal.textContent = playerCurrencies.honor;

  if (pop) {
    const hg = document.getElementById('hud-gold');
    if (hg) { hg.classList.add('pop'); setTimeout(() => hg.classList.remove('pop'), 300); }
    const hr = document.getElementById('hud-rank');
    if (hr) { hr.classList.add('pop'); setTimeout(() => hr.classList.remove('pop'), 300); }
  }
  if (typeof updateRankHUD === 'function') updateRankHUD();
}

function updateGoldHUD(pop = false) {
  updateCurrencyHUD(pop);
}

function checkAffordablePacks() {
  if (levelsData && levelsData.length) {
    const affordable = levelsData.findIndex((_, i) =>
      !unlockedLevels.includes(i) && playerCurrencies.coins >= LEVEL_COST(i));
    if (affordable >= 0) showToast(`💡 You can afford "${levelName(levelsData[affordable])}"! Visit 🏪 Shop!`);
  }
}

// ═══════════════ R2: KOREAN-GATED PROGRESSION & HARD LOCKS ════════════════════
// Two separate metrics, deliberately.
//
// Under the real scheduler, "mastered" means an interval of 21+ days, which takes weeks of
// honest reviews to reach. Gating the minigames and quests on that would leave a new player
// staring at locked content for a month — so content gates use `calcLevelProgress`
// (graduated: learned through its steps at least once, reachable in a single session) while
// `calcLevelMastery` reports genuine maturity for the Mastery stat, trophies and dashboard.
function _levelPct(levelIdx, predicate) {
  if (!levelsData || !levelsData[levelIdx] || !levelsData[levelIdx].words) return 0;
  const words = levelsData[levelIdx].words;
  if (words.length === 0) return 100;
  let n = 0;
  words.forEach(w => { if (predicate(peekSrs(w.ko))) n++; });
  return Math.floor((n / words.length) * 100);
}

// % of the level graduated — drives content unlocks.
function calcLevelProgress(levelIdx) { return _levelPct(levelIdx, srsIsGraduated); }

// % of the level mature (interval >= 21 days) — the long-haul Mastery stat.
function calcLevelMastery(levelIdx) { return _levelPct(levelIdx, srsIsMature); }

function isZoneUnlocked(zoneKey) {
  const reqs = {
    arcade:  { reqLevel: 0, minPct: 80, name: levelName(levelsData[0]) || 'Level 1: Daily Life & People' },
    fishing: { reqLevel: 1, minPct: 80, name: levelName(levelsData[1]) || 'Level 2: Food & Dining' },
    dungeon: { reqLevel: 2, minPct: 80, name: levelName(levelsData[2]) || 'Level 3: Time & Weather' }
  };
  const req = reqs[zoneKey];
  if (!req) return { unlocked: true };
  // Graduated, not mature — see calcLevelProgress. Mature gating would lock every zone
  // for weeks on a fresh save.
  const pct = calcLevelProgress(req.reqLevel);
  return { unlocked: pct >= req.minPct, pct, targetPct: req.minPct, reqName: req.name };
}

function showHardLockToast(zoneKey) {
  const check = isZoneUnlocked(zoneKey);
  playChiptuneSFX('denied');
  showToast(`🔒 LOCKED: Learn ${check.targetPct}% of ${check.reqName} first! (Current: ${check.pct}%)`, 4000);
}

// ═══════════════ MULTIPLE-CHOICE OPTION BUILDING ═════════════════════════════
//
// A distractor has to differ from the answer in the text the button actually shows, not
// just in `ko`. Filtering on `ko` alone let two headwords sharing an English gloss land in
// the same question — 미술 and 예술 both read "art" — so the learner saw two identical
// buttons and one of them scored wrong. Six such pairs existed in levels.json; they have
// since been given distinct glosses, but the guard belongs here rather than resting on the
// data staying clean, and it holds for Korean-labelled options too.
//
// Plain Fisher-Yates rather than Phaser.Utils.Array.Shuffle: this runs in the Node test
// harnesses, which evaluate game.js in a bare vm with no Phaser.
function shuffleInPlace(arr){
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Returns the target plus up to `count - 1` distractors, shuffled, no two sharing a label.
// `pool` may contain the target; it is filtered out. Falls short of `count` only when the
// pool genuinely has too few distinct labels, which beats padding with a duplicate.
function buildOptionSet(target, pool, count, labelOf){
  const seen = new Set([labelOf(target)]);
  const picked = [];
  for (const w of shuffleInPlace([...pool])) {
    if (picked.length >= count - 1) break;
    if (w.ko === target.ko) continue;
    const label = labelOf(w);
    if (seen.has(label)) continue;
    seen.add(label);
    picked.push(w);
  }
  return shuffleInPlace([target, ...picked]);
}

const labelEn = w => String(w && w.en || '');
const labelKo = w => String(w && w.ko || '');

// ═══════════════ R2: SHOP PURCHASE QUIZ GATE ══════════════════════════════════
let shopQuizState = { targetIdx: null, questions: [], currentQ: 0, correctCount: 0 };
const SHOP_QUIZ_LEN = 3;   // how many questions the gate asks when the pool allows it

function startShopQuizGate(idx) {
  const allWords = getUnlockedWords();
  const pool = allWords.length >= 4 ? allWords : (levelsData[0]?.words || []);

  // Korean is shown and the buttons carry meanings, so options are deduped on `en`.
  const questions = shuffleInPlace([...pool]).slice(0, SHOP_QUIZ_LEN).map(target => ({
    target,
    options: buildOptionSet(target, pool, 4, labelEn),
  }));

  // An empty pool means levelsData never loaded. Opening the overlay anyway locked the
  // player behind a gate with no questions in it.
  if (!questions.length) {
    showToast('Vocabulary is still loading — try again in a moment.');
    return;
  }

  shopQuizState = { targetIdx: idx, questions, currentQ: 0, correctCount: 0 };
  playerLocked = true;
  document.getElementById('shop-quiz-overlay').classList.add('visible');
  renderShopQuizQuestion();
}

function renderShopQuizQuestion() {
  const q = shopQuizState.questions[shopQuizState.currentQ];
  if (!q) return;

  const ind = document.getElementById('sq-step-indicator');
  if (ind) ind.textContent = `Question ${shopQuizState.currentQ + 1} of ${shopQuizState.questions.length}`;
  const wKo = document.getElementById('sq-word-ko');
  if (wKo) wKo.textContent = q.target.ko;

  const grid = document.getElementById('sq-options-grid');
  if (!grid) return;
  grid.innerHTML = '';
  q.options.forEach((opt) => {
    const btn = document.createElement('button');
    btn.className = 'duel-option-btn';
    btn.textContent = opt.en;
    btn.onclick = () => answerShopQuiz(opt.ko === q.target.ko);
    grid.appendChild(btn);
  });
}

function answerShopQuiz(isCorrect) {
  if (isCorrect) {
    playChiptuneSFX('quiz_correct');
    shopQuizState.correctCount++;
    shopQuizState.currentQ++;
    // Against the list that was actually built, not the SHOP_QUIZ_LEN it was cut to. A pool
    // shorter than that produced fewer questions, and a hardcoded 3 then sent the player
    // back to renderShopQuizQuestion() for a question that did not exist — which bailed on
    // its own guard and left the overlay up with playerLocked still true. The boss gate
    // below has always compared against its own length; this is the same check.
    if (shopQuizState.currentQ >= shopQuizState.questions.length) {
      document.getElementById('shop-quiz-overlay').classList.remove('visible');
      playerLocked = false;
      const targetIdx = shopQuizState.targetIdx;
      if (_doLevelPurchase(targetIdx)) {
        const lsOverlay = document.getElementById('level-select-overlay');
        if (lsOverlay && !lsOverlay.classList.contains('hidden')) {
          buildLevelSelectScreen();
        }
        const shopOverlay = document.getElementById('shop-overlay');
        if (shopOverlay && shopOverlay.classList.contains('visible')) {
          buildShopGrid();
          closeShop();
          setTimeout(() => startLevel(targetIdx), 300);
        }
      }
    } else {
      renderShopQuizQuestion();
    }
  } else {
    playChiptuneSFX('quiz_wrong');
    document.getElementById('shop-quiz-overlay').classList.remove('visible');
    playerLocked = false;
    showToast(`❌ Quiz Gate Failed! 0 Coins deducted. Practice in farm to unlock!`, 4000);
  }
}

function cancelShopQuizGate() {
  document.getElementById('shop-quiz-overlay').classList.remove('visible');
  playerLocked = false;
  showToast('Purchase challenge cancelled.');
}

// ═══════════════ R2: BOSS ENTRANCE GATE CHALLENGE ═════════════════════════════
let bossGateState = { type: null, questions: [], currentQ: 0, callback: null };

function startBossGateChallenge(type, questionsCount, onCompleteCallback) {
  const allWords = getUnlockedWords();
  const pool = allWords.length >= 4 ? allWords : (levelsData[0]?.words || []);

  const questions = shuffleInPlace([...pool]).slice(0, questionsCount).map(target => ({
    target,
    options: buildOptionSet(target, pool, 4, labelEn),
  }));

  bossGateState = { type, questions, currentQ: 0, callback: onCompleteCallback };
  playerLocked = true;
  document.getElementById('boss-gate-overlay').classList.add('visible');
  const tit = document.getElementById('bg-title');
  if (tit) tit.textContent = type === 'dungeon' ? 'DUNGEON BOSS ENTRANCE GATE' : 'GRAND NECROMANCER ENTRANCE GATE';
  renderBossGateQuestion();
}

function renderBossGateQuestion() {
  const q = bossGateState.questions[bossGateState.currentQ];
  if (!q) return;

  const ind = document.getElementById('bg-step-indicator');
  if (ind) ind.textContent = `Gate Challenge ${bossGateState.currentQ + 1} of ${bossGateState.questions.length}`;
  const wKo = document.getElementById('bg-word-ko');
  if (wKo) wKo.textContent = q.target.ko;

  const grid = document.getElementById('bg-options-grid');
  if (!grid) return;
  grid.innerHTML = '';
  q.options.forEach((opt) => {
    const btn = document.createElement('button');
    btn.className = 'duel-option-btn';
    btn.textContent = opt.en;
    btn.onclick = () => answerBossGate(opt.ko === q.target.ko);
    grid.appendChild(btn);
  });
}

function answerBossGate(isCorrect) {
  if (isCorrect) {
    playChiptuneSFX('quiz_correct');
    bossGateState.currentQ++;
    if (bossGateState.currentQ >= bossGateState.questions.length) {
      document.getElementById('boss-gate-overlay').classList.remove('visible');
      playerLocked = false;
      if (bossGateState.callback) bossGateState.callback(true);
    } else {
      renderBossGateQuestion();
    }
  } else {
    playChiptuneSFX('quiz_wrong');
    document.getElementById('boss-gate-overlay').classList.remove('visible');
    playerLocked = false;
    showToast(`❌ Entrance Gate Challenge Failed! Defeat review minions to try again.`, 4000);
    if (bossGateState.callback) bossGateState.callback(false);
  }
}

function cancelBossGate() {
  document.getElementById('boss-gate-overlay').classList.remove('visible');
  playerLocked = false;
  showToast('Retreated from Entrance Gate.');
}

// ═══════════════ R2: QUEST SYSTEM ═════════════════════════════════════════════
let questOverlayOpen = false;
let activeQuestTab = 'daily';
let questMetaTimer = null;

function cookedDishCount() {
  const dishes = (typeof inventoryState !== 'undefined' && inventoryState && inventoryState.cookedDishes)
    ? inventoryState.cookedDishes
    : {};
  return Object.values(dishes).reduce((n, v) => n + (Number(v) || 0), 0);
}

let questState = {
  mainStep: 1,
  mainProgress: { harvests: 0, mastered: 0, kills: 0, fish: 0, score: 0 },
  mainCompleted: [],
  daily: [],
  weekly: [],
  lastDailyReset: 0,
  lastWeeklyReset: 0,
  dailyKey: '',
  weeklyKey: '',
  quizStreakToday: 0
};

const MAIN_STORYLINE = [
  { act: 1, id: 'act_1', title: 'Harvest of Hangeul', desc: 'Harvest 3 ripe words on the farm. Learn 80% of Level 1 (Daily Life & People).', target: 3, reqLevel: 0, minPct: 80, rCoins: 100, rGems: 10, rHonor: 50, icon: '🌾' },
  { act: 2, id: 'act_2', title: 'Beast Master', desc: 'Defeat 5 dungeon beasts. Learn 80% of Level 2 (Food & Dining).', target: 5, reqLevel: 1, minPct: 80, rCoins: 150, rGems: 15, rHonor: 75, icon: '⚔️' },
  { act: 3, id: 'act_3', title: 'Kitchen of Hangeul', desc: 'Cook 3 Korean dishes. Learn 80% of Level 4 (Places & Directions).', target: 3, reqLevel: 3, minPct: 80, rCoins: 200, rGems: 20, rHonor: 100, icon: '🍳' },
  { act: 4, id: 'act_4', title: 'Chromatic Angler', desc: 'Catch 5 fish in Crystal Pond. Learn 80% of Level 3 (Time & Weather).', target: 5, reqLevel: 2, minPct: 80, rCoins: 250, rGems: 25, rHonor: 125, icon: '🎣' },
  { act: 5, id: 'act_5', title: 'Numeric Dominion', desc: 'Score 500+ in the arcade. Learn 80% of Level 6 (Hobbies & Leisure).', target: 500, reqLevel: 5, minPct: 80, rCoins: 300, rGems: 30, rHonor: 150, icon: '🕹️' },
  { act: 6, id: 'act_6', title: 'Grand Sovereign', desc: 'Reach 10 mature words (21-day interval) after learning 80% of Level 1.', target: 10, reqLevel: 0, minPct: 80, rCoins: 500, rGems: 50, rHonor: 300, icon: '👑' }
];

// ── Quest board helpers (pure) ──
const DAILY_QUEST_COUNT = 5;
const WEEKLY_QUEST_COUNT = 3;
const DAILY_QUEST_POOL = [
  { id: 'd_harvest', kind: 'harvest', icon: '🌾', title: 'Morning Harvest', desc: 'Harvest 3 ripe crops on your farm.', how: 'Walk to a ripe plot and finish the harvest quiz.', tag: 'Farm', target: 3, rCoins: 30, rGems: 2, rHonor: 10 },
  { id: 'd_basket', kind: 'harvest', icon: '🧺', title: 'Full Basket', desc: 'Harvest 6 ripe crops today.', how: 'Keep cycling plots — plant, water, then harvest.', tag: 'Farm', target: 6, rCoins: 55, rGems: 5, rHonor: 22 },
  { id: 'd_plant', kind: 'plant', icon: '🌱', title: 'New Seeds', desc: 'Plant 2 new words on empty plots.', how: 'Use an empty dirt plot and pass the first quiz.', tag: 'Farm', target: 2, rCoins: 25, rGems: 2, rHonor: 8 },
  { id: 'd_water', kind: 'water', icon: '💧', title: 'Listen & Water', desc: 'Water 3 growing crops (listening quiz).', how: 'Return to a sprout and pass the Water listening quiz.', tag: 'Farm', target: 3, rCoins: 35, rGems: 3, rHonor: 12 },
  { id: 'd_quiz', kind: 'quiz', icon: '📖', title: 'Study Session', desc: 'Answer 8 farm quizzes correctly.', how: 'Any plant, water, or harvest quiz counts.', tag: 'Study', target: 8, rCoins: 40, rGems: 3, rHonor: 15 },
  { id: 'd_listen', kind: 'listen', icon: '👂', title: 'Sharp Ears', desc: 'Complete 4 listening quizzes.', how: 'Watering a crop is always a listening quiz.', tag: 'Study', target: 4, rCoins: 40, rGems: 3, rHonor: 15 },
  { id: 'd_streak', kind: 'streak', mode: 'max', icon: '🔥', title: 'On a Roll', desc: 'Get 5 correct answers in a row.', how: 'A wrong farm quiz resets the streak.', tag: 'Study', target: 5, rCoins: 45, rGems: 4, rHonor: 18 },
  { id: 'd_new', kind: 'newHarvest', icon: '✨', title: 'Fresh Words', desc: 'Harvest 1 word you have never harvested before.', how: 'Plant a word that is still new in your book.', tag: 'Farm', target: 1, rCoins: 50, rGems: 5, rHonor: 20 },
  { id: 'd_fish', kind: 'fish', need: 'fishing', icon: '🎣', title: 'Pond Visit', desc: 'Catch 2 fish at Crystal Pond.', how: 'Unlock the dock, then fish at Crystal Pond.', tag: 'Valley', target: 2, rCoins: 40, rGems: 3, rHonor: 12 },
  { id: 'd_kill', kind: 'kill', need: 'dungeon', icon: '⚔️', title: 'Dungeon Patrol', desc: 'Defeat 3 review beasts in the dungeon.', how: 'Unlock the portal, then clear review minions.', tag: 'Valley', target: 3, rCoins: 45, rGems: 4, rHonor: 15 },
  { id: 'd_cook', kind: 'cook', icon: '🍳', title: 'Home Cooking', desc: 'Cook 1 Korean dish.', how: 'Open Cooking from the More menu.', tag: 'Kitchen', target: 1, rCoins: 40, rGems: 4, rHonor: 15 },
  { id: 'd_memory', kind: 'memory', icon: '🃏', title: 'Match Maker', desc: 'Finish one memory-match game.', how: 'Talk to the cat and match every pair.', tag: 'Valley', target: 1, rCoins: 35, rGems: 3, rHonor: 12 },
  { id: 'd_arcade', kind: 'arcade', need: 'arcade', mode: 'max', icon: '🕹️', title: 'Arcade Cadet', desc: 'Score 150 or more in the arcade.', how: 'Unlock the arcade machine, then play a round.', tag: 'Valley', target: 150, rCoins: 50, rGems: 5, rHonor: 18 },
  { id: 'd_bee', kind: 'bee', icon: '🐝', title: 'Busy Bee', desc: 'Finish one beehive listening round.', how: 'Tap the beehive on the Valley farm.', tag: 'Valley', target: 1, rCoins: 40, rGems: 3, rHonor: 14 },
  { id: 'd_desk', kind: 'desk', need: 'desk', icon: '📝', title: 'Study Desk', desc: 'Finish one textbook desk quiz.', how: 'Enter Unit 10 or 14 and use the study desk.', tag: 'World', target: 1, rCoins: 45, rGems: 4, rHonor: 16 },
  { id: 'd_taste', kind: 'taste', need: 'taste', icon: '😋', title: 'Taste Test', desc: 'Finish the Unit 10 taste minigame.', how: 'Enter Unit 10 and use the taste station.', tag: 'World', target: 1, rCoins: 40, rGems: 4, rHonor: 14 }
];
const WEEKLY_QUEST_POOL = [
  { id: 'w_mature', kind: 'mature', mode: 'max', icon: '🟣', title: 'Master Scholar', desc: 'Reach 5 mature words (21-day review interval).', how: 'Keep reviewing until a word’s interval hits 21 days.', tag: 'Study', target: 5, rCoins: 150, rGems: 15, rHonor: 50 },
  { id: 'w_cook', kind: 'cook', icon: '🍳', title: 'Kitchen Champion', desc: 'Cook 5 Korean dishes this week.', how: 'Open Cooking from the More menu.', tag: 'Kitchen', target: 5, rCoins: 200, rGems: 20, rHonor: 60 },
  { id: 'w_fish', kind: 'fish', need: 'fishing', icon: '🎣', title: 'Master Angler', desc: 'Catch 10 fish in Crystal Pond.', how: 'Unlock the dock, then fish at Crystal Pond.', tag: 'Valley', target: 10, rCoins: 180, rGems: 18, rHonor: 55 },
  { id: 'w_harvest', kind: 'harvest', icon: '🌾', title: 'Week of Harvests', desc: 'Harvest 15 ripe crops this week.', how: 'Any farm harvest counts.', tag: 'Farm', target: 15, rCoins: 160, rGems: 16, rHonor: 50 },
  { id: 'w_quiz', kind: 'quiz', icon: '📖', title: 'Dedicated Student', desc: 'Answer 25 farm quizzes correctly.', how: 'Plant, water, and harvest quizzes all count.', tag: 'Study', target: 25, rCoins: 170, rGems: 16, rHonor: 55 },
  { id: 'w_kill', kind: 'kill', need: 'dungeon', icon: '⚔️', title: 'Dungeon Veteran', desc: 'Defeat 12 review beasts.', how: 'Unlock the portal, then clear review minions.', tag: 'Valley', target: 12, rCoins: 180, rGems: 18, rHonor: 55 },
  { id: 'w_listen', kind: 'listen', icon: '👂', title: 'Ear for Korean', desc: 'Complete 12 listening quizzes.', how: 'Watering a crop is always a listening quiz.', tag: 'Study', target: 12, rCoins: 170, rGems: 16, rHonor: 52 },
  { id: 'w_desk', kind: 'desk', need: 'desk', icon: '📝', title: 'Textbook Week', desc: 'Finish 3 textbook desk quizzes.', how: 'Enter Unit 10 or 14 and use the study desk.', tag: 'World', target: 3, rCoins: 190, rGems: 18, rHonor: 58 }
];

function questLocalDayKey(ms) {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + m + '-' + day;
}
function questLocalWeekKey(ms) {
  const d = new Date(ms);
  const diff = (d.getDay() + 6) % 7;
  const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
  return questLocalDayKey(mon.getTime());
}
function questHash32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function questSeededShuffle(list, seedStr) {
  const out = list.slice();
  let h = questHash32(String(seedStr || '0'));
  for (let i = out.length - 1; i > 0; i--) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    const j = h % (i + 1);
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}
function instantiateQuest(def) {
  return {
    id: def.id,
    kind: def.kind,
    mode: def.mode || 'add',
    need: def.need || '',
    icon: def.icon || '',
    title: def.title,
    desc: def.desc,
    how: def.how || '',
    tag: def.tag || '',
    target: def.target,
    current: 0,
    rCoins: def.rCoins,
    rGems: def.rGems,
    rHonor: def.rHonor,
    claimed: false
  };
}
function filterQuestPool(pool, flags) {
  const open = flags || {};
  return (pool || []).filter(q => !q.need || !!open[q.need]);
}
function pickQuestBoard(pool, seedKey, count) {
  const shuffled = questSeededShuffle(pool, seedKey);
  const picked = [];
  const usedKind = Object.create(null);
  for (let i = 0; i < shuffled.length; i++) {
    const def = shuffled[i];
    if (usedKind[def.kind]) continue;
    usedKind[def.kind] = true;
    picked.push(instantiateQuest(def));
    if (picked.length >= count) break;
  }
  for (let i = 0; i < shuffled.length && picked.length < count; i++) {
    if (picked.some(q => q.id === shuffled[i].id)) continue;
    picked.push(instantiateQuest(shuffled[i]));
  }
  return picked;
}
function applyQuestEventTo(q, type, data) {
  if (!q || q.claimed || q.kind !== type) return false;
  const before = q.current || 0;
  const payload = data || {};
  const n = payload.count || 1;
  if (q.mode === 'max') {
    const v = payload.total != null ? payload.total : (payload.score != null ? payload.score : 0);
    q.current = Math.min(q.target, Math.max(before, v));
  } else {
    q.current = Math.min(q.target, before + n);
  }
  return before < q.target && q.current >= q.target;
}
function questIsReady(q) {
  return !!(q && !q.claimed && (q.current || 0) >= (q.target || 1));
}
function questListReadyCount(list) {
  return (list || []).filter(questIsReady).length;
}
function msUntilNextLocalDay(ms) {
  const d = new Date(ms);
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return Math.max(0, next.getTime() - ms);
}
function msUntilNextLocalWeek(ms) {
  const d = new Date(ms);
  const diff = (d.getDay() + 6) % 7;
  const nextMon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff + 7);
  return Math.max(0, nextMon.getTime() - ms);
}
function formatQuestCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return h + 'h ' + m + 'm';
  return m + 'm';
}
function questBoardNeedsRoll(list, pool) {
  if (!Array.isArray(list) || !list.length) return true;
  return list.some(q => !q || !q.kind || !pool.some(p => p.id === q.id));
}
// ── Quest board helpers end ──

function initQuestState() {
  if (!questState || typeof questState !== 'object') {
    questState = {
      mainStep: 1,
      mainProgress: { harvests: 0, mastered: 0, kills: 0, fish: 0, score: 0 },
      mainCompleted: [],
      daily: [],
      weekly: [],
      lastDailyReset: 0,
      lastWeeklyReset: 0,
      dailyKey: '',
      weeklyKey: '',
      quizStreakToday: 0
    };
  }
  const now = Date.now();
  const dayKey = questLocalDayKey(now);
  const weekKey = questLocalWeekKey(now);

  const flags = currentQuestNeedFlags();
  // One effective pool per board, used for *both* the validity check and the re-roll.
  // Validating a saved board against the unfiltered pool was what let a Fishing or Dungeon
  // quest that predated the zone gate survive: it was still a known id, so the board looked
  // healthy and nothing re-rolled until the day or week key turned over.
  const dailyPool = filterQuestPool(DAILY_QUEST_POOL, flags);
  const weeklyPool = filterQuestPool(WEEKLY_QUEST_POOL, flags);
  const dailyEffective = dailyPool.length ? dailyPool : DAILY_QUEST_POOL;
  const weeklyEffective = weeklyPool.length ? weeklyPool : WEEKLY_QUEST_POOL;

  if (questState.dailyKey !== dayKey || questBoardNeedsRoll(questState.daily, dailyEffective)) {
    questState.dailyKey = dayKey;
    questState.lastDailyReset = now;
    questState.quizStreakToday = 0;
    questState.daily = pickQuestBoard(dailyEffective, 'daily:' + dayKey, DAILY_QUEST_COUNT);
  }

  if (questState.weeklyKey !== weekKey || questBoardNeedsRoll(questState.weekly, weeklyEffective)) {
    questState.weeklyKey = weekKey;
    questState.lastWeeklyReset = now;
    questState.weekly = pickQuestBoard(weeklyEffective, 'weekly:' + weekKey, WEEKLY_QUEST_COUNT);
  }

  const totalMastered = typeof srsMatureWordCount === 'function' ? srsMatureWordCount() : 0;
  (questState.weekly || []).forEach(function (q) { applyQuestEventTo(q, 'mature', { total: totalMastered }); });
}

function currentQuestNeedFlags() {
  const zoneOn = function (key) {
    if (typeof isZoneUnlocked !== 'function') return false;
    const chk = isZoneUnlocked(key);
    return !!(chk && chk.unlocked);
  };
  const ownsWorld = function (worldId) {
    if (!Array.isArray(unlockedLevels) || typeof levelsData === 'undefined' || !levelsData) return false;
    return unlockedLevels.some(function (i) {
      return levelsData[i] && levelsData[i].worldId === worldId;
    });
  };
  return {
    arcade: zoneOn('arcade'),
    fishing: zoneOn('fishing'),
    dungeon: zoneOn('dungeon'),
    desk: ownsWorld('2b-unit-10') || ownsWorld('2b-unit-14'),
    taste: ownsWorld('2b-unit-10')
  };
}

function mainQuestProgress(act) {
  if (!act) return 0;
  if (act.act === 1) return questState.mainProgress.harvests || 0;
  if (act.act === 2) return questState.mainProgress.kills || 0;
  if (act.act === 3) return cookedDishCount();
  if (act.act === 4) return questState.mainProgress.fish || 0;
  if (act.act === 5) return questState.mainProgress.score || 0;
  if (act.act === 6) return typeof srsMatureWordCount === 'function' ? srsMatureWordCount() : 0;
  return 0;
}

function applyQuestEventToAll(type, data) {
  let becameReady = 0;
  const titleOf = [];
  const bump = (q) => {
    if (applyQuestEventTo(q, type, data)) {
      becameReady++;
      titleOf.push(q.title);
    }
  };
  (questState.daily || []).forEach(bump);
  (questState.weekly || []).forEach(bump);
  return { becameReady, titles: titleOf };
}

function checkQuestProgress(type, data = {}) {
  initQuestState();
  if (type === 'harvest') questState.mainProgress.harvests += (data.count || 1);
  else if (type === 'kill') questState.mainProgress.kills += (data.count || 1);
  else if (type === 'fish') questState.mainProgress.fish += (data.count || 1);
  else if (type === 'score' || type === 'arcade') {
    const sc = data.score || 0;
    if (sc > (questState.mainProgress.score || 0)) questState.mainProgress.score = sc;
  }

  let readyTitles = [];
  if (type === 'quiz') {
    readyTitles = readyTitles.concat(applyQuestEventToAll('quiz', data).titles);
    questState.quizStreakToday = (questState.quizStreakToday || 0) + 1;
    readyTitles = readyTitles.concat(applyQuestEventToAll('streak', { total: questState.quizStreakToday }).titles);
  } else if (type === 'miss') {
    questState.quizStreakToday = 0;
  } else if (type !== 'honor') {
    const eventType = type === 'score' ? 'arcade' : type;
    readyTitles = readyTitles.concat(applyQuestEventToAll(eventType, data).titles);
  }

  const totalMastered = typeof srsMatureWordCount === 'function' ? srsMatureWordCount() : 0;
  applyQuestEventToAll('mature', { total: totalMastered });

  persistSave();
  updateQuestHudBadge();
  if (questOverlayOpen) renderQuestList();
  if (!questOverlayOpen && readyTitles.length && typeof showToast === 'function') {
    const first = readyTitles[0];
    const extra = readyTitles.length > 1 ? ' (+' + (readyTitles.length - 1) + ' more)' : '';
    showToast('📜 Ready to claim: ' + first + extra, 3200);
  }
}

function countClaimableQuests() {
  initQuestState();
  let n = questListReadyCount(questState.daily) + questListReadyCount(questState.weekly);
  const act = MAIN_STORYLINE.find(a => a.act === questState.mainStep);
  if (act && !questState.mainCompleted.includes(act.id)) {
    const srsPct = typeof calcLevelProgress === 'function' ? calcLevelProgress(act.reqLevel) : 0;
    if (mainQuestProgress(act) >= act.target && srsPct >= act.minPct) n++;
  }
  return n;
}

function updateQuestHudBadge() {
  if (typeof document === 'undefined') return;
  const n = countClaimableQuests();
  const btn = document.getElementById('quest-btn');
  if (btn) {
    if (n > 0) btn.setAttribute('data-quest-ready', String(n));
    else btn.removeAttribute('data-quest-ready');
    btn.title = n > 0 ? ('Quest Log — ' + n + ' ready to claim') : 'Quest Log';
  }
  const more = document.getElementById('hud-more-btn');
  if (more) more.classList.toggle('has-quest-ready', n > 0);
}

function bindQuestOverlayChrome() {
  const overlay = document.getElementById('quest-overlay');
  if (!overlay || overlay.getAttribute('data-quest-bound') === '1') return;
  overlay.setAttribute('data-quest-bound', '1');
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeQuestOverlay();
  });
}

function openQuestOverlay() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  initQuestState();
  bindQuestOverlayChrome();
  questOverlayOpen = true;
  if (typeof setModalState === 'function') setModalState('quest-overlay', true);
  else {
    playerLocked = true;
    const el = document.getElementById('quest-overlay');
    if (el) el.classList.add('visible');
  }
  syncQuestTabButtons();
  renderQuestList();
  if (questMetaTimer) clearInterval(questMetaTimer);
  questMetaTimer = setInterval(() => { if (questOverlayOpen) renderQuestMeta(); }, 30000);
}

function closeQuestOverlay() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  questOverlayOpen = false;
  if (questMetaTimer) { clearInterval(questMetaTimer); questMetaTimer = null; }
  if (typeof setModalState === 'function') setModalState('quest-overlay', false);
  else {
    playerLocked = false;
    const el = document.getElementById('quest-overlay');
    if (el) el.classList.remove('visible');
  }
}

function syncQuestTabButtons() {
  ['main', 'daily', 'weekly'].forEach(t => {
    const btn = document.getElementById('qtab-' + t);
    if (btn) {
      btn.classList.toggle('active', t === activeQuestTab);
      btn.setAttribute('aria-selected', t === activeQuestTab ? 'true' : 'false');
    }
  });
}

function switchQuestTab(tab) {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  activeQuestTab = tab === 'daily' || tab === 'weekly' ? tab : 'main';
  syncQuestTabButtons();
  renderQuestList();
}

function questEl(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function renderQuestRewards(row, coins, gems, honor) {
  const tags = questEl('div', 'quest-reward-tags');
  tags.appendChild(questEl('span', 'quest-reward', '🪙 +' + coins));
  tags.appendChild(questEl('span', 'quest-reward', '💎 +' + gems));
  tags.appendChild(questEl('span', 'quest-reward', '🎖️ +' + honor));
  row.appendChild(tags);
}

function renderQuestBar(parent, current, target) {
  const pct = target > 0 ? Math.min(100, Math.floor((current / target) * 100)) : 0;
  const bg = questEl('div', 'quest-progress-bg');
  const fill = questEl('div', 'quest-progress-fill');
  fill.style.width = pct + '%';
  if (pct >= 100) fill.classList.add('full');
  bg.appendChild(fill);
  parent.appendChild(bg);
  return pct;
}

function renderQuestMeta() {
  const meta = document.getElementById('quest-meta');
  if (!meta) return;
  meta.innerHTML = '';
  const now = Date.now();
  const line = questEl('div', 'quest-meta-line');
  if (activeQuestTab === 'main') {
    const step = Math.min(MAIN_STORYLINE.length, questState.mainStep || 1);
    const done = (questState.mainCompleted || []).length;
    line.textContent = 'Story  ·  Act ' + step + ' of ' + MAIN_STORYLINE.length + '  ·  ' + done + ' claimed';
  } else if (activeQuestTab === 'daily') {
    const list = questState.daily || [];
    const done = list.filter(q => q.claimed).length;
    const ready = questListReadyCount(list);
    line.textContent = done + ' / ' + list.length + ' claimed  ·  resets in ' + formatQuestCountdown(msUntilNextLocalDay(now));
    if (ready) line.textContent += '  ·  ' + ready + ' ready';
  } else {
    const list = questState.weekly || [];
    const done = list.filter(q => q.claimed).length;
    const ready = questListReadyCount(list);
    line.textContent = done + ' / ' + list.length + ' claimed  ·  week resets in ' + formatQuestCountdown(msUntilNextLocalWeek(now));
    if (ready) line.textContent += '  ·  ' + ready + ' ready';
  }
  meta.appendChild(line);

  const list = activeQuestTab === 'daily' ? questState.daily : (activeQuestTab === 'weekly' ? questState.weekly : null);
  const ready = list ? questListReadyCount(list) : 0;
  if (ready > 0) {
    const btn = questEl('button', 'quest-claim-all');
    btn.type = 'button';
    btn.textContent = 'Claim all (' + ready + ')';
    btn.onclick = () => claimReadySideQuests(activeQuestTab);
    meta.appendChild(btn);
  }

  const dailyN = document.getElementById('qtab-daily-n');
  const weeklyN = document.getElementById('qtab-weekly-n');
  const mainN = document.getElementById('qtab-main-n');
  const dReady = questListReadyCount(questState.daily);
  const wReady = questListReadyCount(questState.weekly);
  if (dailyN) {
    dailyN.textContent = dReady ? String(dReady) : '';
    dailyN.hidden = !dReady;
  }
  if (weeklyN) {
    weeklyN.textContent = wReady ? String(wReady) : '';
    weeklyN.hidden = !wReady;
  }
  if (mainN) {
    const act = MAIN_STORYLINE.find(a => a.act === questState.mainStep);
    const srsPct = act && typeof calcLevelProgress === 'function' ? calcLevelProgress(act.reqLevel) : 0;
    const mainReady = !!(act && !questState.mainCompleted.includes(act.id) && mainQuestProgress(act) >= act.target && srsPct >= act.minPct);
    mainN.textContent = mainReady ? '1' : '';
    mainN.hidden = !mainReady;
  }
}

function renderQuestList() {
  const container = document.getElementById('quest-list-container');
  if (!container) return;
  container.innerHTML = '';
  initQuestState();
  renderQuestMeta();
  updateQuestHudBadge();

  if (activeQuestTab === 'main') {
    MAIN_STORYLINE.forEach(act => {
      const isCompleted = questState.mainCompleted.includes(act.id);
      const isCurrent = !isCompleted && act.act === questState.mainStep;
      const isLocked = !isCompleted && act.act > questState.mainStep;
      const curr = mainQuestProgress(act);
      const srsPct = typeof calcLevelProgress === 'function' ? calcLevelProgress(act.reqLevel) : 0;
      const reqMet = !isLocked && curr >= act.target && srsPct >= act.minPct;

      const card = questEl('div', 'quest-card' + (isCompleted ? ' completed' : '') + (reqMet && !isCompleted ? ' ready' : '') + (isLocked ? ' locked' : '') + (isCurrent ? ' current' : ''));
      const head = questEl('div', 'quest-card-header');
      const titleWrap = questEl('div', 'quest-card-title-wrap');
      titleWrap.appendChild(questEl('span', 'quest-card-icon', act.icon || '📖'));
      titleWrap.appendChild(questEl('span', 'quest-card-title', 'Act ' + act.act + ' · ' + act.title));
      head.appendChild(titleWrap);
      head.appendChild(questEl('span', 'quest-card-badge' + (isCompleted ? ' claimed' : (reqMet ? ' ready' : (isLocked ? ' locked' : ''))),
        isCompleted ? 'Claimed' : (isLocked ? 'Locked' : (reqMet ? 'Ready' : 'Act ' + act.act))));
      card.appendChild(head);
      card.appendChild(questEl('div', 'quest-card-desc', isLocked ? 'Finish the previous act to unlock this chapter.' : act.desc));

      if (!isLocked) {
        const labels = questEl('div', 'quest-progress-labels');
        labels.appendChild(questEl('span', '', 'Goal'));
        labels.appendChild(questEl('span', '', curr + ' / ' + act.target));
        card.appendChild(labels);
        renderQuestBar(card, curr, act.target);
        const srsRow = questEl('div', 'quest-progress-labels');
        srsRow.appendChild(questEl('span', '', 'Learned'));
        srsRow.appendChild(questEl('span', '', srsPct + '% / ' + act.minPct + '%'));
        card.appendChild(srsRow);
        renderQuestBar(card, srsPct, act.minPct);
      }

      const row = questEl('div', 'quest-rewards-row');
      renderQuestRewards(row, act.rCoins, act.rGems, act.rHonor);
      if (isCompleted) {
        row.appendChild(questEl('span', 'quest-claimed-label', 'Claimed'));
      } else if (!isLocked) {
        const btn = questEl('button', 'quest-claim-btn');
        btn.type = 'button';
        btn.textContent = reqMet ? 'Claim rewards' : 'In progress';
        btn.disabled = !reqMet;
        btn.onclick = () => claimMainQuest(act.act);
        row.appendChild(btn);
      }
      card.appendChild(row);
      container.appendChild(card);
    });
    return;
  }

  const list = (activeQuestTab === 'daily' ? questState.daily : questState.weekly).slice();
  list.sort((a, b) => {
    const ra = questIsReady(a) ? 0 : (a.claimed ? 2 : 1);
    const rb = questIsReady(b) ? 0 : (b.claimed ? 2 : 1);
    return ra - rb;
  });
  if (!list.length) {
    container.appendChild(questEl('div', 'quest-empty', 'No quests on this board yet. Check back after a reset.'));
    return;
  }
  list.forEach(q => {
    const ready = questIsReady(q);
    const card = questEl('div', 'quest-card' + (q.claimed ? ' completed' : '') + (ready ? ' ready' : ''));
    const head = questEl('div', 'quest-card-header');
    const titleWrap = questEl('div', 'quest-card-title-wrap');
    titleWrap.appendChild(questEl('span', 'quest-card-icon', q.icon || '📜'));
    titleWrap.appendChild(questEl('span', 'quest-card-title', q.title));
    head.appendChild(titleWrap);
    const badgeWrap = questEl('div', 'quest-card-badges');
    if (q.tag) badgeWrap.appendChild(questEl('span', 'quest-card-tag', q.tag));
    badgeWrap.appendChild(questEl('span', 'quest-card-badge' + (q.claimed ? ' claimed' : (ready ? ' ready' : '')),
      q.claimed ? 'Claimed' : (ready ? 'Ready' : Math.min(100, Math.floor(((q.current || 0) / q.target) * 100)) + '%')));
    head.appendChild(badgeWrap);
    card.appendChild(head);
    card.appendChild(questEl('div', 'quest-card-desc', q.desc));
    const how = q.how || ((DAILY_QUEST_POOL.concat(WEEKLY_QUEST_POOL).find(p => p.id === q.id) || {}).how) || '';
    if (how && !q.claimed) card.appendChild(questEl('div', 'quest-card-how', how));
    const labels = questEl('div', 'quest-progress-labels');
    labels.appendChild(questEl('span', '', 'Progress'));
    labels.appendChild(questEl('span', '', (q.current || 0) + ' / ' + q.target));
    card.appendChild(labels);
    renderQuestBar(card, q.current || 0, q.target);
    const row = questEl('div', 'quest-rewards-row');
    renderQuestRewards(row, q.rCoins, q.rGems, q.rHonor);
    if (q.claimed) {
      row.appendChild(questEl('span', 'quest-claimed-label', 'Claimed'));
    } else {
      const btn = questEl('button', 'quest-claim-btn');
      btn.type = 'button';
      btn.textContent = ready ? 'Claim rewards' : 'In progress';
      btn.disabled = !ready;
      btn.onclick = () => claimSideQuest(activeQuestTab, q.id);
      row.appendChild(btn);
    }
    card.appendChild(row);
    container.appendChild(card);
  });
}

function claimMainQuest(actNum) {
  const act = MAIN_STORYLINE.find(a => a.act === actNum);
  if (!act || questState.mainCompleted.includes(act.id)) return;
  if (act.act > questState.mainStep) return;

  const curr = mainQuestProgress(act);
  const srsPct = typeof calcLevelProgress === 'function' ? calcLevelProgress(act.reqLevel) : 0;
  if (curr < act.target || srsPct < act.minPct) {
    showToast('Quest requirements not met yet.');
    return;
  }

  questState.mainCompleted.push(act.id);
  if (questState.mainStep <= actNum && actNum < MAIN_STORYLINE.length) {
    questState.mainStep = actNum + 1;
  }

  addCoins(act.rCoins);
  addGems(act.rGems);
  addHonor(act.rHonor);

  showToast('Story complete: ' + act.title + ' — rewards claimed!', 4000);
  updateQuestHudBadge();
  renderQuestList();
}

function claimSideQuest(tab, qId) {
  const list = tab === 'daily' ? questState.daily : questState.weekly;
  const q = list.find(item => item.id === qId);
  if (!q || q.claimed || q.current < q.target) return;

  q.claimed = true;
  addCoins(q.rCoins);
  addGems(q.rGems);
  addHonor(q.rHonor);

  showToast('Claimed "' + q.title + '"  ·  +' + q.rCoins + ' coins, +' + q.rGems + ' gems, +' + q.rHonor + ' honor', 4000);
  updateQuestHudBadge();
  renderQuestList();
}

function claimReadySideQuests(tab) {
  const list = tab === 'daily' ? questState.daily : questState.weekly;
  const ready = (list || []).filter(questIsReady);
  if (!ready.length) return;
  let coins = 0, gems = 0, honor = 0;
  ready.forEach(q => {
    q.claimed = true;
    coins += q.rCoins;
    gems += q.rGems;
    honor += q.rHonor;
  });
  addCoins(coins);
  addGems(gems);
  addHonor(honor);
  showToast('Claimed ' + ready.length + ' quest' + (ready.length === 1 ? '' : 's') + '  ·  +' + coins + ' coins', 4000);
  updateQuestHudBadge();
  renderQuestList();
}

const PHASE_CFG = [
  {icon:'🌱', title:'Plant Seed', dots:'●○○', reward:'',    btn:'🌱 Plant Seed'},
  {icon:'💧', title:'Water',      dots:'●●○', reward:'',    btn:'💧 Water'},
  {icon:'🍎', title:'Harvest',    dots:'●●●', reward:'+🪙', btn:'🍎 Harvest'},
];

// The button used to report success the instant it was pressed: flushSave() was called
// without awaiting it, so "Game saved successfully!" appeared even when the file write or
// the cloud upload went on to fail. It now waits for the real outcome and says which leg
// failed, because "saved" is the one message a player has to be able to trust.
async function saveAllGame(){
  const btn = $('save-btn');
  const inMenu = btn ? btn.classList.contains('hud-overflow-item') : false;
  const paint = (icon, label) => {
    if (!btn) return;
    if (inMenu && typeof hudIconHtml === 'function') {
      btn.innerHTML = hudIconHtml('save', icon, 18) + '<span class="hud-overflow-label">' + label + '</span>';
    } else {
      btn.textContent = inMenu ? icon + ' ' + label : icon;
    }
  };
  const restore = () => {
    if (!btn) return;
    if (inMenu && typeof hudIconHtml === 'function') {
      if (typeof paintHudIcons === 'function') paintHudIcons();
      else btn.innerHTML = hudIconHtml('save', '💾', 18) + '<span class="hud-overflow-label">Save</span>';
    } else {
      btn.textContent = inMenu ? '💾 Save' : '💾';
    }
  };

  paint('⏳', 'Saving');
  let res;
  try {
    res = await flushSave();   // explicit user action — write through, don't debounce
  } catch (e) {
    console.warn('Save failed:', e);
    res = { local: false, file: false, cloud: { ok: false, reason: 'unexpected error' } };
  }

  const failed = [];
  if (!res.local) failed.push('this device');
  if (res.file === false) failed.push('the save file');
  if (res.cloud && res.cloud.ok === false && res.cloud.reason !== 'signed-out') {
    failed.push('the cloud (' + res.cloud.reason + ')');
  }

  if (failed.length) {
    paint('⚠', 'Not saved');
    showToast('⚠ Could not save to ' + failed.join(' or ') + '.', 4200);
  } else {
    paint('✅', 'Saved');
    showToast('💾 Game saved successfully!', 2200);
  }
  setTimeout(restore, 1800);
}

// Run save load once pywebview is ready (or immediately if in browser)

function initSave(){
  // Always try file-based load first, localStorage as fallback
  if(window.pywebview?.api){
    loadSave().then(()=>{ _afterLoad(); });
  } else {
    // Browser mode: try immediately
    loadSave().then(()=>{ _afterLoad(); }).catch(()=>{ _afterLoad(); });
  }
}
function _afterLoad(){
  updateGoldHUD();
  buildLevelSelectScreen();
  if (typeof updateLeaderboardMetrics === 'function') updateLeaderboardMetrics();
  initGoogleAuth();
}
// pywebview fires this event when API is ready; otherwise we init on DOMLoaded.
// `typeof` first, like the flushSave block above: a bare `window.x` on an undeclared
// identifier is a ReferenceError, not undefined, so evaluating game.js in a vm without a
// window mock died right here — which is what has been breaking scripts/verify_m2_m3.js.
if(typeof window !== 'undefined' && window.addEventListener){
  window.addEventListener('pywebviewready', ()=>{ console.log('[pywebview] API ready'); initSave(); }, {once:true});
  // Fallback: pywebviewready never fires outside the desktop shell. The old
  // `gold===0` gate never passed (starter gold is 85), so browser sessions never
  // loaded their save or initialized Google auth; gate on the bridge itself instead.
  setTimeout(()=>{ if(!window.pywebview) initSave(); }, 400);
}
let quizOpen=false, currentWord=null, currentPlot=null;
let playerLocked=false, plantedWords=new Set(); // words currently ON a plot
let shopOpen=false, catDialogOpen=false, memoryOpen=false, trophyOpen=false;
let appleTreeSave = {}; // { ripeAt, ripe } persisted across sessions

