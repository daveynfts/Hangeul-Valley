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
function isUnit14World() {
  return isWorldLevel(currentLesson()) && currentLesson().worldId === '2b-unit-14';
}
function isTextbookFarmWorld() {
  return isUnit10World() || isUnit14World();
}
const TEXTBOOK_WORLD_FILES = [
  { cache: 'world-2b-10', file: 'worlds/2b-unit-10.json' },
  { cache: 'world-2b-14', file: 'worlds/2b-unit-14.json' }
];
const UNIT10_LAYOUT_DEFAULT = {
  stations: [
    { id: 'desk', nameKo: '학습 책상', ox: -28, oy: 480, scale: 1, originX: 0.52, interact: 80 },
    { id: 'kitchen', nameKo: '요리 주방', ox: 328, oy: 252, scale: 1, originX: 0.48, interact: 82 },
    { id: 'taste', nameKo: '한 입 포장마차', ox: 144, oy: 480, scale: 1, originX: 0.5, interact: 80 }
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
const ART_CACHE_KEY = 'art-20260820g';
function artUrl(file) {
  return ART_DIR + file + '?v=' + encodeURIComponent(ART_CACHE_KEY);
}
const ART_LOAD = [
  { key: 'study_desk_hd', file: 'furniture/oak_study_desk.png' },
  { key: 'unit10_kitchen_hd', file: 'furniture/farmhouse_kitchen.png' },
  { key: 'unit10_taste_stall_hd', file: 'stalls/korean_street_food_stall.png' },
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
  const one = (data) => {
    if (data) attachTextbookWorld(data);
    remaining--;
    if (remaining <= 0) {
      textbookWorldsTried = true;
      if (typeof done === 'function') done();
    }
  };
  specs.forEach((spec) => {
    if (typeof sceneRef !== 'undefined' && sceneRef?.cache?.json?.exists?.(spec.cache)) {
      one(sceneRef.cache.json.get(spec.cache));
      return;
    }
    if ((typeof IS_NODE !== 'undefined' && IS_NODE) || typeof fetch !== 'function') {
      one(null);
      return;
    }
    fetch(spec.file)
      .then(r => r && r.ok ? r.json() : null)
      .then(one)
      .catch(() => one(null));
  });
}

function getUnlockedWords() {
  const lesson = currentLesson();
  if (isWorldLevel(lesson)) return (lesson.words || []).slice();
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

function spendGems(amount) {
  if (playerCurrencies.gems >= amount) {
    playerCurrencies.gems -= amount;
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
    dungeon: { reqLevel: 2, minPct: 80, name: levelName(levelsData[2]) || 'Level 3: Time & Weather' },
    duel:    { reqLevel: 3, minPct: 80, name: levelName(levelsData[3]) || 'Level 4: Places & Directions' }
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
  playChiptuneSFX('quiz_wrong');
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

function startShopQuizGate(idx) {
  const allWords = getUnlockedWords();
  const pool = allWords.length >= 4 ? allWords : (levelsData[0]?.words || []);

  // Korean is shown and the buttons carry meanings, so options are deduped on `en`.
  const questions = shuffleInPlace([...pool]).slice(0, 3).map(target => ({
    target,
    options: buildOptionSet(target, pool, 4, labelEn),
  }));

  shopQuizState = { targetIdx: idx, questions, currentQ: 0, correctCount: 0 };
  playerLocked = true;
  document.getElementById('shop-quiz-overlay').classList.add('visible');
  renderShopQuizQuestion();
}

function renderShopQuizQuestion() {
  const q = shopQuizState.questions[shopQuizState.currentQ];
  if (!q) return;

  const ind = document.getElementById('sq-step-indicator');
  if (ind) ind.textContent = `Question ${shopQuizState.currentQ + 1} of 3`;
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
    if (shopQuizState.currentQ >= 3) {
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
let activeQuestTab = 'main';

let questState = {
  mainStep: 1,
  mainProgress: { harvests: 0, mastered: 0, kills: 0, fish: 0, score: 0, duels: 0 },
  mainCompleted: [],
  daily: [],
  weekly: [],
  lastDailyReset: 0,
  lastWeeklyReset: 0
};

const MAIN_STORYLINE = [
  { act: 1, id: 'act_1', title: 'Act I: Harvest of Hangeul', desc: 'Harvest 3 ripe words in farm. Learn 80% of Level 1 (Daily Life & People).', target: 3, reqLevel: 0, minPct: 80, rCoins: 100, rGems: 10, rHonor: 50 },
  { act: 2, id: 'act_2', title: 'Act II: Beast Master', desc: 'Defeat 5 Dungeon beasts. Learn 80% of Level 2 (Food & Dining).', target: 5, reqLevel: 1, minPct: 80, rCoins: 150, rGems: 15, rHonor: 75 },
  { act: 3, id: 'act_3', title: 'Act III: Bonds of Hangeul', desc: 'Win 3 Spell Duels. Learn 80% of Level 4 (Places & Directions).', target: 3, reqLevel: 3, minPct: 80, rCoins: 200, rGems: 20, rHonor: 100 },
  { act: 4, id: 'act_4', title: 'Act IV: Chromatic Angler', desc: 'Catch 5 fish in Crystal Pond. Learn 80% of Level 3 (Time & Weather).', target: 5, reqLevel: 2, minPct: 80, rCoins: 250, rGems: 25, rHonor: 125 },
  { act: 5, id: 'act_5', title: 'Act V: Numeric Dominion', desc: 'Score 500+ in Arcade Machine. Learn 80% of Level 6 (Hobbies & Leisure).', target: 500, reqLevel: 5, minPct: 80, rCoins: 300, rGems: 30, rHonor: 150 },
  { act: 6, id: 'act_6', title: 'Act VI: Grand Sovereign', desc: 'Defeat Grand Necromancer Boss after learning every word in all levels.', target: 1, reqLevel: 0, minPct: 100, rCoins: 500, rGems: 50, rHonor: 300 }
];

function initQuestState() {
  const now = Date.now();
  const DAY_MS = 24 * 3600 * 1000;
  const WEEK_MS = 7 * DAY_MS;

  if (!questState.lastDailyReset || now - questState.lastDailyReset > DAY_MS) {
    questState.lastDailyReset = now;
    questState.daily = [
      { id: 'dq_1', title: '🌾 Daily Harvest', desc: 'Harvest 3 ripe crops in your farm.', current: 0, target: 3, rCoins: 30, rGems: 2, rHonor: 10, claimed: false },
      { id: 'dq_2', title: '📖 Daily Scholar', desc: 'Answer 5 SRS review quizzes correctly.', current: 0, target: 5, rCoins: 40, rGems: 3, rHonor: 15, claimed: false },
      { id: 'dq_3', title: '⚔️ Daily Explorer', desc: 'Defeat 2 monsters or catch 2 fish.', current: 0, target: 2, rCoins: 50, rGems: 5, rHonor: 20, claimed: false }
    ];
  }

  if (!questState.lastWeeklyReset || now - questState.lastWeeklyReset > WEEK_MS) {
    questState.lastWeeklyReset = now;
    questState.weekly = [
      { id: 'wq_1', title: '🟣 Master Scholar', desc: 'Master 5 Korean words (harvest count >= 5).', current: 0, target: 5, rCoins: 150, rGems: 15, rHonor: 50, claimed: false },
      { id: 'wq_2', title: '⚡ Arena Champion', desc: 'Win 3 Spell Duels.', current: 0, target: 3, rCoins: 200, rGems: 20, rHonor: 60, claimed: false },
      { id: 'wq_3', title: '🎣 Master Angler', desc: 'Catch 10 fish in Crystal Pond.', current: 0, target: 10, rCoins: 180, rGems: 18, rHonor: 55, claimed: false }
    ];
  }
}

function checkQuestProgress(type, data = {}) {
  initQuestState();
  if (type === 'harvest') {
    questState.mainProgress.harvests += (data.count || 1);
    questState.daily.forEach(q => { if (q.id === 'dq_1') q.current = Math.min(q.target, q.current + (data.count || 1)); });
  } else if (type === 'quiz') {
    questState.daily.forEach(q => { if (q.id === 'dq_2') q.current = Math.min(q.target, q.current + 1); });
  } else if (type === 'kill') {
    questState.mainProgress.kills += (data.count || 1);
    questState.daily.forEach(q => { if (q.id === 'dq_3') q.current = Math.min(q.target, q.current + (data.count || 1)); });
  } else if (type === 'fish') {
    questState.mainProgress.fish += (data.count || 1);
    questState.daily.forEach(q => { if (q.id === 'dq_3') q.current = Math.min(q.target, q.current + (data.count || 1)); });
    questState.weekly.forEach(q => { if (q.id === 'wq_3') q.current = Math.min(q.target, q.current + (data.count || 1)); });
  } else if (type === 'duel') {
    questState.mainProgress.duels += (data.count || 1);
    questState.weekly.forEach(q => { if (q.id === 'wq_2') q.current = Math.min(q.target, q.current + (data.count || 1)); });
  } else if (type === 'score') {
    if (data.score > questState.mainProgress.score) questState.mainProgress.score = data.score;
  }

  // Mature under the scheduler, not "harvested five times".
  const totalMastered = Object.values(srsData).filter(srsIsMature).length;
  questState.weekly.forEach(q => { if (q.id === 'wq_1') q.current = Math.min(q.target, totalMastered); });

  persistSave();
  if (questOverlayOpen) renderQuestList();
}

function openQuestOverlay() {
  playChiptuneSFX('click');
  initQuestState();
  questOverlayOpen = playerLocked = true;
  document.getElementById('quest-overlay').classList.add('visible');
  renderQuestList();
}

function closeQuestOverlay() {
  playChiptuneSFX('click');
  questOverlayOpen = playerLocked = false;
  document.getElementById('quest-overlay').classList.remove('visible');
}

function switchQuestTab(tab) {
  playChiptuneSFX('click');
  activeQuestTab = tab;
  ['main', 'daily', 'weekly'].forEach(t => {
    const btn = document.getElementById(`qtab-${t}`);
    if (btn) btn.classList.toggle('active', t === tab);
  });
  renderQuestList();
}

function renderQuestList() {
  const container = document.getElementById('quest-list-container');
  if (!container) return;
  container.innerHTML = '';

  if (activeQuestTab === 'main') {
    const act = MAIN_STORYLINE.find(a => a.act === questState.mainStep) || MAIN_STORYLINE[MAIN_STORYLINE.length - 1];
    const isCompleted = questState.mainCompleted.includes(act.id);

    let curr = 0;
    if (act.act === 1) curr = questState.mainProgress.harvests;
    else if (act.act === 2) curr = questState.mainProgress.kills;
    else if (act.act === 3) curr = questState.mainProgress.duels;
    else if (act.act === 4) curr = questState.mainProgress.fish;
    else if (act.act === 5) curr = questState.mainProgress.score;
    else if (act.act === 6) curr = questState.mainProgress.duels >= 1 ? 1 : 0;

    const srsPct = calcLevelProgress(act.reqLevel);
    const reqMet = curr >= act.target && srsPct >= act.minPct;

    const card = document.createElement('div');
    card.className = 'quest-card' + (isCompleted ? ' completed' : '');
    card.innerHTML = `
      <div class="quest-card-header">
        <span class="quest-card-title">${act.title}</span>
        <span class="quest-card-badge">${isCompleted ? 'COMPLETED' : `Learned ${srsPct}% / ${act.minPct}%`}</span>
      </div>
      <div class="quest-card-desc">${act.desc}</div>
      <div class="quest-progress-bg">
        <div class="quest-progress-fill" style="width:${Math.min(100, Math.floor((curr / act.target) * 100))}%"></div>
      </div>
      <div class="quest-progress-text">Progress: ${curr} / ${act.target}</div>
      <div class="quest-rewards-row">
        <div class="quest-reward-tags">
          <span>🪙 +${act.rCoins}</span>
          <span>💎 +${act.rGems}</span>
          <span>🎖️ +${act.rHonor}</span>
        </div>
        ${isCompleted ? '<span style="color:var(--neon-green);font-weight:bold">✅ Claimed</span>' :
          `<button class="quest-claim-btn" ${reqMet ? '' : 'disabled'} onclick="claimMainQuest(${act.act})">Claim Rewards</button>`}
      </div>
    `;
    container.appendChild(card);
  } else {
    const list = activeQuestTab === 'daily' ? questState.daily : questState.weekly;
    list.forEach(q => {
      const card = document.createElement('div');
      card.className = 'quest-card' + (q.claimed ? ' completed' : '');
      const pct = Math.min(100, Math.floor((q.current / q.target) * 100));
      card.innerHTML = `
        <div class="quest-card-header">
          <span class="quest-card-title">${q.title}</span>
          <span class="quest-card-badge">${q.claimed ? 'CLAIMED' : `${pct}%`}</span>
        </div>
        <div class="quest-card-desc">${q.desc}</div>
        <div class="quest-progress-bg">
          <div class="quest-progress-fill" style="width:${pct}%"></div>
        </div>
        <div class="quest-progress-text">Progress: ${q.current} / ${q.target}</div>
        <div class="quest-rewards-row">
          <div class="quest-reward-tags">
            <span>🪙 +${q.rCoins}</span>
            <span>💎 +${q.rGems}</span>
            <span>🎖️ +${q.rHonor}</span>
          </div>
          ${q.claimed ? '<span style="color:var(--neon-green);font-weight:bold">✅ Claimed</span>' :
            `<button class="quest-claim-btn" ${q.current >= q.target ? '' : 'disabled'} onclick="claimSideQuest('${activeQuestTab}', '${q.id}')">Claim Rewards</button>`}
        </div>
      `;
      container.appendChild(card);
    });
  }
}

function claimMainQuest(actNum) {
  const act = MAIN_STORYLINE.find(a => a.act === actNum);
  if (!act || questState.mainCompleted.includes(act.id)) return;

  let curr = 0;
  if (act.act === 1) curr = questState.mainProgress.harvests;
  else if (act.act === 2) curr = questState.mainProgress.kills;
  else if (act.act === 3) curr = questState.mainProgress.duels;
  else if (act.act === 4) curr = questState.mainProgress.fish;
  else if (act.act === 5) curr = questState.mainProgress.score;
  else if (act.act === 6) curr = questState.mainProgress.duels >= 1 ? 1 : 0;

  const srsPct = calcLevelProgress(act.reqLevel);
  if (curr < act.target || srsPct < act.minPct) {
    showToast('⚠️ Quest requirements not met!');
    return;
  }

  questState.mainCompleted.push(act.id);
  if (questState.mainStep <= actNum && actNum < MAIN_STORYLINE.length) {
    questState.mainStep = actNum + 1;
  }

  addCoins(act.rCoins);
  addGems(act.rGems);
  addHonor(act.rHonor);

  showToast(`🎉 Main Story ${act.title} Complete! Earned rewards!`, 4000);
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

  showToast(`🎉 Quest "${q.title}" Claimed! +${q.rCoins} Coins, +${q.rGems} Gems, +${q.rHonor} Honor!`, 4000);
  renderQuestList();
}

const PHASE_CFG = [
  {icon:'🌱', title:'Plant Seed', dots:'●○○', reward:'',    btn:'🌱 Plant Seed'},
  {icon:'💧', title:'Water',      dots:'●●○', reward:'',    btn:'💧 Water'},
  {icon:'🍎', title:'Harvest',    dots:'●●●', reward:'+🪙', btn:'🍎 Harvest'},
];

function saveAllGame(){
  flushSave();   // explicit user action — write through, don't debounce
  const btn=$('save-btn');
  if(btn){
    const prev=btn.textContent;
    btn.textContent = btn.classList.contains('hud-overflow-item') ? '✅ Saved' : '✅';
    setTimeout(()=>{ btn.textContent=prev; }, 1800);
  }
  showToast('💾 Game saved successfully!', 2200);
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
  console.log('[Save] gold='+gold+', levels='+JSON.stringify(unlockedLevels)+', plots='+plotSave.length);
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
let shopOpen=false, catDialogOpen=false, memoryOpen=false, trophyOpen=false, duelOpen=false, fishAlbumOpen=false;
let appleTreeSave = {}; // { ripeAt, ripe } persisted across sessions

