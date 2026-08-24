// ── Unified File-Based Save (pywebview API → file, localStorage as backup) ─────
let fishAlbumSave = {}; // { ko: count }

// ═══════════════ R1: TRIPLE CURRENCY ECONOMY & SAVE V4 ═══════════════════════
var playerCurrencies = { coins: 85, gems: 10, honor: 0 };
var equippedSkinId = 'farmer';
var ownedSkinIds = ['farmer'];
var debugSkinOverride = null;
var playerRank = { xp: 0, level: 1, sessions: 0, correct: 0, asked: 0, perfects: 0, recentIds: [] };

const RANK_MAX = 60;
const VALLEY_RANKS = [
  { min: 1,  ko: '입문자',      en: 'Newcomer',           icon: '🌱' },
  { min: 2,  ko: '견습생',      en: 'Apprentice',         icon: '✏️' },
  { min: 4,  ko: '맛초보',      en: 'Taste Rookie',       icon: '🥄' },
  { min: 7,  ko: '밭지기',      en: 'Plot Keeper',        icon: '🌾' },
  { min: 10, ko: '주방보조',    en: 'Kitchen Hand',       icon: '🥢' },
  { min: 14, ko: '맛감정사',    en: 'Palate Scout',       icon: '🧂' },
  { min: 18, ko: '수습요리사',  en: 'Line Cook',          icon: '🍳' },
  { min: 23, ko: '한식학도',    en: 'Hansik Scholar',     icon: '📘' },
  { min: 28, ko: '수셰프',      en: 'Sous Chef',          icon: '🍲' },
  { min: 34, ko: '한식당장',    en: 'Dining Master',      icon: '🏅' },
  { min: 40, ko: '미식가',      en: 'Gourmet',            icon: '👑' },
  { min: 47, ko: '전설의 셰프', en: 'Legend Chef',        icon: '🔥' },
  { min: 55, ko: '한식의 달인', en: 'Hansik Grandmaster', icon: '💎' }
];

function defaultPlayerRank() {
  return { xp: 0, level: 1, sessions: 0, correct: 0, asked: 0, perfects: 0, recentIds: [] };
}
function ensurePlayerRank() {
  if (!playerRank || typeof playerRank !== 'object') playerRank = defaultPlayerRank();
  if (typeof playerRank.xp !== 'number') playerRank.xp = 0;
  if (typeof playerRank.level !== 'number' || playerRank.level < 1) playerRank.level = 1;
  if (playerRank.level > RANK_MAX) playerRank.level = RANK_MAX;
  if (!Array.isArray(playerRank.recentIds)) playerRank.recentIds = [];
  ['sessions', 'correct', 'asked', 'perfects'].forEach(k => {
    if (typeof playerRank[k] !== 'number') playerRank[k] = 0;
  });
  return playerRank;
}
function xpToNextLevel(lv) {
  const n = Math.max(1, lv | 0);
  return Math.round(36 + n * 14 + Math.pow(n, 1.42) * 3.2);
}
function rankTitleFor(lv) {
  let found = VALLEY_RANKS[0];
  VALLEY_RANKS.forEach(r => { if (lv >= r.min) found = r; });
  return found;
}
function nextRankTitle(lv) {
  return VALLEY_RANKS.find(r => r.min > lv) || null;
}
function addPlayerXp(amount) {
  ensurePlayerRank();
  const gain = Math.max(0, amount | 0);
  if (!gain) return { leveled: [], level: playerRank.level, xp: playerRank.xp, need: xpToNextLevel(playerRank.level) };
  playerRank.xp += gain;
  const leveled = [];
  while (playerRank.level < RANK_MAX && playerRank.xp >= xpToNextLevel(playerRank.level)) {
    playerRank.xp -= xpToNextLevel(playerRank.level);
    playerRank.level += 1;
    leveled.push(rankTitleFor(playerRank.level));
  }
  if (playerRank.level >= RANK_MAX) playerRank.xp = 0;
  persistSave();
  updateRankHUD();
  return { leveled, level: playerRank.level, xp: playerRank.xp, need: xpToNextLevel(playerRank.level) };
}
function studySessionXp(score, total) {
  let xp = score * 14 + 10;
  if (score === total) xp += 20;
  else if (score === total - 1) xp += 8;
  return xp;
}
function updateRankHUD() {
  ensurePlayerRank();
  const t = rankTitleFor(playerRank.level);
  const need = xpToNextLevel(playerRank.level);
  const pct = playerRank.level >= RANK_MAX ? 100 : Math.min(100, Math.floor((playerRank.xp / need) * 100));
  const icon = document.getElementById('hud-rank-icon');
  const lv = document.getElementById('hud-rank-lv');
  const fill = document.getElementById('hud-rank-fill');
  const chip = document.getElementById('hud-rank');
  if (icon && !(typeof icon.getAttribute === 'function' && icon.getAttribute('data-hud-icon'))) {
    icon.textContent = t.icon;
  }
  if (lv) lv.textContent = 'Lv.' + playerRank.level;
  if (fill) fill.style.width = pct + '%';
  if (chip) chip.title = t.ko + ' · ' + t.en + ' · ' + playerRank.xp + '/' + need + ' EXP';
}
function renderRankCard() {
  ensurePlayerRank();
  const t = rankTitleFor(playerRank.level);
  const nxt = nextRankTitle(playerRank.level);
  const need = xpToNextLevel(playerRank.level);
  const pct = playerRank.level >= RANK_MAX ? 100 : Math.min(100, Math.floor((playerRank.xp / need) * 100));
  const acc = playerRank.asked ? Math.round((playerRank.correct / playerRank.asked) * 100) : 0;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('rank-seal', t.icon);
  set('rank-lv', 'LV. ' + playerRank.level);
  set('rank-title-ko', t.ko);
  set('rank-title-en', t.en);
  set('rank-xp-num', playerRank.level >= RANK_MAX ? 'MAX' : (playerRank.xp + ' / ' + need + ' EXP'));
  const fill = document.getElementById('rank-xp-fill');
  if (fill) fill.style.width = pct + '%';
  set('rank-stat-sessions', String(playerRank.sessions));
  set('rank-stat-perfects', String(playerRank.perfects));
  set('rank-stat-acc', acc + '%');
  set('rank-next', nxt ? ('Next title: ' + nxt.icon + ' ' + nxt.ko + ' · ' + nxt.en + ' at Lv.' + nxt.min) : 'Hansik Grandmaster — peak of the valley.');
}
function openRankCard() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  renderRankCard();
  setModalState('rank-card-overlay', true);
}
function closeRankCard() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  setModalState('rank-card-overlay', false);
}
function showRankUp(title, hops) {
  const t = title || rankTitleFor(playerRank.level);
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('rankup-icon', t.icon);
  set('rankup-lv', 'LV. ' + playerRank.level);
  set('rankup-ko', t.ko);
  set('rankup-en', t.en + (hops > 1 ? '  (+' + hops + ')' : ''));
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('levelup');
  setModalState('rankup-overlay', true);
}
function closeRankUp() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  setModalState('rankup-overlay', false);
}
var gold = 85; // kept in sync for 100% backward compatibility
var quizStreak = 0; // consecutive correct quiz streak

var ITEM_DB = {
  '배추': { id: 'cabbage', name: 'Napa Cabbage', nameKo: '배추', icon: '🥬', description: 'Fresh Napa cabbage harvested from the plot.' },
  '무': { id: 'radish', name: 'Korean Radish', nameKo: '무', icon: '🥔', description: 'Crunchy white Korean radish.' },
  '파': { id: 'green_onion', name: 'Green Onion', nameKo: '파', icon: '🌱', description: 'Fragrant green onions.' },
  '고추': { id: 'chili', name: 'Chili Pepper', nameKo: '고추', icon: '🌶️', description: 'Spicy red chili pepper.' },
  '마늘': { id: 'garlic', name: 'Garlic', nameKo: '마늘', icon: '🧄', description: 'Pungent garlic cloves.' },
  '쌀': { id: 'rice', name: 'Rice', nameKo: '쌀', icon: '🌾', description: 'Staple Korean white rice.' },
  '콩': { id: 'soybean', name: 'Soybean', nameKo: '콩', icon: '🫘', description: 'Nutritious yellow soybeans.' },
  '당근': { id: 'carrot', name: 'Carrot', nameKo: '당근', icon: '🥕', description: 'Sweet orange carrot.' },
  '감자': { id: 'potato', name: 'Potato', nameKo: '감자', icon: '🥔', description: 'Fresh farm potato.' },
  '옥수수': { id: 'corn', name: 'Corn', nameKo: '옥수수', icon: '🌽', description: 'Sweet farm corn on the cob.' },
  '딸기': { id: 'strawberry', name: 'Strawberry', nameKo: '딸기', icon: '🍓', description: 'Sweet garden strawberry.' },
  '사과': { id: 'apple', name: 'Apple', nameKo: '사과', icon: '🍎', description: 'Crisp Orchard Apple.' },
  '연어': { id: 'salmon', name: 'Salmon', nameKo: '연어', icon: '🐟', description: 'Fresh river salmon.' },
  '고등어': { id: 'mackerel', name: 'Mackerel', nameKo: '고등어', icon: '🐟', description: 'Flavorful ocean mackerel.' },
  '오징어': { id: 'squid', name: 'Squid', nameKo: '오징어', icon: '🦑', description: 'Tender ocean squid.' },
  '잉어': { id: 'carp', name: 'Carp', nameKo: '잉어', icon: '🐟', description: 'Crystal pond carp.' },
  '새우': { id: 'shrimp', name: 'Shrimp', nameKo: '새우', icon: '🦐', description: 'Fresh sea shrimp.' },
  '문어': { id: 'octopus', name: 'Octopus', nameKo: '문어', icon: '🐙', description: 'Giant sea octopus.' },
  '조개': { id: 'clam', name: 'Clam', nameKo: '조개', icon: '🦪', description: 'Fresh shore clam.' },
  '황금물고기': { id: 'golden_fish', name: 'Golden Fish', nameKo: '황금물고기', icon: '🐠', description: 'Rare golden fish.' },
  '꿀': { id: 'honey', name: 'Honey', nameKo: '꿀', icon: '🍯', type: 'ingredient', description: 'Sweet golden honey harvested from the beehive.' },
  '오이': { id: 'cucumber', name: 'Cucumber', nameKo: '오이', icon: '🥒', description: 'Crisp cucumber for 냉면 and 비빔국수.' },
  '양파': { id: 'onion', name: 'Onion', nameKo: '양파', icon: '🧅', description: 'Onion for Korean stews.' },
  '콩나물': { id: 'bean_sprout', name: 'Bean sprouts', nameKo: '콩나물', icon: '🌱', description: 'Soybean sprouts for 된장찌개 and 비빔밥.' },
  '상추': { id: 'lettuce', name: 'Lettuce', nameKo: '상추', icon: '🥬', description: 'Lettuce wraps for 삼겹살.' },
  '생강': { id: 'ginger', name: 'Ginger', nameKo: '생강', icon: '🫚', description: 'Ginger for 감자탕 and 삼계탕 broth.' }
};

function getItemInfo(keyOrId) {
  if (!keyOrId) return { key: 'unknown', id: 'unknown', name: 'Item', nameKo: '아이템', icon: '📦', description: 'Unknown Item' };
  if (ITEM_DB[keyOrId]) return { key: keyOrId, ...ITEM_DB[keyOrId] };
  for (const [k, val] of Object.entries(ITEM_DB)) {
    if (val.id === keyOrId) return { key: k, ...val };
  }
  return { key: keyOrId, id: keyOrId, name: keyOrId, nameKo: keyOrId, icon: '📦', description: keyOrId };
}

var inventoryState = {
  maxSlots: 20,
  ingredients: { "배추": 3, "무": 2, "파": 2, "고추": 1, "마늘": 2, "쌀": 3, "콩": 1 },
  seeds: {},
  scrolls: 0,
  cookedDishes: {}
};

function getUsedInventorySlots() {
  if (!inventoryState) return 0;
  inventoryState.ingredients = inventoryState.ingredients || {};
  inventoryState.cookedDishes = inventoryState.cookedDishes || {};
  inventoryState.seeds = inventoryState.seeds || {};

  let count = 0;
  for (const k in inventoryState.ingredients) {
    if (inventoryState.ingredients[k] > 0) count++;
  }
  for (const k in inventoryState.cookedDishes) {
    if (inventoryState.cookedDishes[k] > 0) count++;
  }
  for (const k in inventoryState.seeds) {
    if (inventoryState.seeds[k] > 0) count++;
  }
  return count;
}

function addItemToInventory(itemId, qty = 1) {
  if (!itemId || qty <= 0) return false;
  inventoryState = inventoryState || {};
  inventoryState.ingredients = inventoryState.ingredients || {};
  inventoryState.maxSlots = typeof inventoryState.maxSlots === 'number' ? inventoryState.maxSlots : 20;

  const info = getItemInfo(itemId);
  const key = info.key;

  // Stacking within existing slot
  if (typeof inventoryState.ingredients[key] !== 'undefined' && inventoryState.ingredients[key] > 0) {
    inventoryState.ingredients[key] += qty;
    if (typeof persistSave === 'function') persistSave();
    return true;
  }

  // Capacity check for new slot
  if (getUsedInventorySlots() >= inventoryState.maxSlots) {
    return false;
  }

  inventoryState.ingredients[key] = (inventoryState.ingredients[key] || 0) + qty;
  if (typeof persistSave === 'function') persistSave();
  return true;
}

function removeItemFromInventory(itemId, qty = 1) {
  if (!itemId || qty <= 0) return false;
  inventoryState = inventoryState || {};
  inventoryState.ingredients = inventoryState.ingredients || {};

  const info = getItemInfo(itemId);
  const key = info.key;

  if (!inventoryState.ingredients[key] || inventoryState.ingredients[key] < qty) {
    return false;
  }

  inventoryState.ingredients[key] -= qty;
  if (inventoryState.ingredients[key] <= 0) {
    delete inventoryState.ingredients[key];
  }
  if (typeof persistSave === 'function') persistSave();
  return true;
}

// Named because the inventory panel now prints this price and disables the button when
// the player cannot meet it. Two copies of the number would drift.
var INVENTORY_EXPAND_COST = 50;

function expandInventoryCapacity() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  const cost = INVENTORY_EXPAND_COST;
  inventoryState = inventoryState || {};
  inventoryState.maxSlots = typeof inventoryState.maxSlots === 'number' ? inventoryState.maxSlots : 20;
  if (!spendCoins(cost)) {
    if (typeof showToast === 'function') showToast(`Need ${cost} Coins 🪙 to expand inventory capacity!`);
    return false;
  }
  inventoryState.maxSlots += 5;
  if (typeof persistSave === 'function') persistSave();
  if (typeof renderInventoryGrid === 'function') renderInventoryGrid();
  if (typeof showToast === 'function') showToast(`🎒 Capacity expanded +5 slots! Total: ${inventoryState.maxSlots} slots.`);
  return true;
}

var recipeState = {
  unlockedRecipes: ['kimchi', 'bibimbap', 'bulgogi', 'tteokbokki', 'samgyeopsal', 'haemul_pajeon', 'japchae', 'samgyetang', 'gimbap', 'honey_yakgwa', 'honey_tea']
};
var activeBuffs = {};
let leaderboardState = { personalBests: { arcadeHighScore: 0, dungeonMaxFloor: 0, totalWordsMastered: 0 } };
var cookingState = { cookedRecipes: [], totalDishesCooked: 0, recipeStats: {} };

function syncGoldAlias() {
  gold = playerCurrencies.coins;
}

// Headwords respelled by the 띄어쓰기 pass. Every one only *inserts* word-spaces, so the
// pre-v7 key is the same string with them removed — which is why this is a list of the new
// spellings and not an old -> new table. There is nothing to keep in sync and no way for the
// two halves to disagree.
//
// Deriving the pairing from levelsData instead would be self-maintaining but wrong here:
// initSave() runs on DOMContentLoaded and levelsData is not populated until FarmScene
// preloads levels.json, so the migration would silently find nothing to move.
const KO_V7_RESPELLINGS = [
  '피로를 풀다', '주사를 맞다', '사진을 찍다',
  '길을 찾다', '길을 잃다', '먼지를 털다',
  '오해를 풀다', '귀를 기울이다', '입을 모으다',
  '손을 씻다', '발을 끊다', '눈길을 끌다',
  '가슴을 치다', '손을 잡다', '뜸을 들이다',
  '허리띠를 둘러매다', '발을 벗고 나서다', '인기가 있다',
  '고집이 세다', '발이 넓다', '귀가 얇다',
  '눈이 높다', '손이 크다', '입이 가볍다',
  '콧대가 높다', '배가 아프다', '어깨가 무겁다',
  '낯이 익다', '낯이 설다', '가슴이 치밀다',
  '뼈가 있다', '눈코 뜰 새 없이 바쁘다', '식은 죽 먹기',
  '누워서 떡 먹기', '우물 안 개구리', '티끌 모아 태산',
  '그림의 떡', '집회의 자유', '언론의 자유',
  '공공의 안녕', '자전거 타기', '그림 그리기',
  '숲 가꾸기', '예의 바르다', '그럼에도 불구하고',
  '바꾸어 말하면', '종합해 보면', '다른 한편으로는',
  '스트레스 해소', '백신 프로그램', '소셜 미디어',
  '문자 메시지', '데이터 분석', '데이터 센터',
  '스마트 시티', '글로벌 시장', '바이오 기술',
  '3D 프린팅', '친환경 에너지', '그린 에너지',
  '양자 컴퓨팅', '알고리즘 수식', '패키지 여행',
  '사물 인터넷',
];

// { '어깨가무겁다': '어깨가 무겁다', … } — built once, from the list above.
const KO_V7_RENAMES = KO_V7_RESPELLINGS.reduce((m, spaced) => {
  const packed = spaced.replace(/\s+/g, '');
  if (packed !== spaced) m[packed] = spaced;
  return m;
}, {});

// Three headwords were the wrong *word*, not merely the wrong spacing. Unlike the v7 table
// these cannot be derived: a correction that changes characters leaves no rule for recovering
// the old key from the new one, which is exactly why it is a separate step.
//
// Keys are the **post-v7** spellings. That is safe because the v7 step always runs first, so a
// v6 save has already reached 발을 벗고 나서다 by the time this table is consulted — and folding
// the two together would not work, since stripping spaces from 발 벗고 나서다 yields 발벗고나서다
// and would never match the 발을벗고나서다 a pre-v7 save actually holds.
const KO_V8_RENAMES = {
  '허리띠를 둘러매다': '허리띠를 졸라매다',  // 둘러매다 is to sling over a shoulder, not to tighten
  '발을 벗고 나서다':  '발 벗고 나서다',     // the idiom takes no 을
  '어플리케이션':      '애플리케이션',        // 외래어 표기법 — v7 did not touch this one
};

// Renaming a headword means moving it everywhere it serves as an identity: srsData and
// harvestCounts key on it, plots and attemptLog carry it as a field. Shared by the v7 and v8
// steps, which differ only in their table.
//
// Idempotent: a key moves only when the destination is free, so re-running finds nothing to do.
// Where both spellings somehow exist the new one wins as the later write — except harvest
// counts, which take the larger of the two rather than discarding a tally.
function applyKoRenames(data, renames) {
  let moved = 0;

  const rekey = (obj, merge) => {
    if (!obj || typeof obj !== 'object') return;
    for (const [oldKo, newKo] of Object.entries(renames)) {
      if (!(oldKo in obj)) continue;
      if (newKo in obj) obj[newKo] = merge ? merge(obj[newKo], obj[oldKo]) : obj[newKo];
      else { obj[newKo] = obj[oldKo]; moved++; }
      delete obj[oldKo];
    }
  };

  rekey(data.srs);
  rekey(data.harvests, (a, b) => Math.max(a | 0, b | 0));

  // Arrays carry `ko` as a field rather than a key. fishAlbum keys on FISH_DB names, which
  // neither pass touched.
  [data.plots, data.attempts].forEach(list => {
    if (!Array.isArray(list)) return;
    list.forEach(row => {
      if (row && renames[row.ko]) { row.ko = renames[row.ko]; moved++; }
    });
  });

  return moved;
}

function migrateSaveData(d) {
  if (!d) return null;
  const data = JSON.parse(JSON.stringify(d));
  if (!data.v || data.v < 4) {
    console.log(`[Save Migration] Upgrading schema from v${data.v || 1} -> v4`);
    const legacyGold = typeof data.gold === 'number' ? data.gold : 0;
    data.currencies = data.currencies || {};
    data.currencies.coins = typeof data.currencies.coins === 'number' ? data.currencies.coins : legacyGold;
    data.currencies.gems = typeof data.currencies.gems === 'number' ? data.currencies.gems : 0;
    data.currencies.honor = typeof data.currencies.honor === 'number' ? data.currencies.honor : 0;

    data.gold = data.currencies.coins;
    data.quests = data.quests || {
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
    data.inventory = data.inventory || { maxSlots: 20, ingredients: { "배추": 3, "무": 2, "파": 2, "고추": 1, "마늘": 2, "쌀": 3, "콩": 1 }, seeds: {}, scrolls: 0, cookedDishes: {} };
    data.inventory.maxSlots = typeof data.inventory.maxSlots === 'number' ? data.inventory.maxSlots : 20;
    data.recipes = data.recipes || { unlockedRecipes: ['kimchi', 'bibimbap', 'bulgogi', 'tteokbokki', 'samgyeopsal', 'haemul_pajeon', 'japchae', 'samgyetang', 'gimbap', 'honey_yakgwa', 'honey_tea'] };
    data.activeBuffs = data.activeBuffs || {};
    data.leaderboards = data.leaderboards || {
      personalBests: { arcadeHighScore: 0, dungeonMaxFloor: 0, totalWordsMastered: 0 }
    };
    data.droppedItems = Array.isArray(data.droppedItems) ? data.droppedItems : [];
    data.v = 4;
  }

  // v4 -> v5: the SRS schema changed from {p2At, p3At, harvests} to a real SM-2 entry.
  //
  // Existing players must not be reset to zero. The old data has no interval or ease, but
  // harvest count is a usable proxy for how well a word was known: each harvest was a
  // successful three-touch recall. Seeding intervals from it means a veteran save keeps
  // its progress and simply starts getting sensible review dates from now on.
  //
  // Intervals are staggered by harvest count so a save with hundreds of learned words does
  // not dump all of them into a single day's review queue.
  if (!data.v || data.v < 5) {
    console.log(`[Save Migration] Upgrading SRS schema v${data.v || 4} -> v5 (SM-2)`);
    const now = Date.now();
    const oldSrs = (data.srs && typeof data.srs === 'object') ? data.srs : {};
    const harvests = (data.harvests && typeof data.harvests === 'object') ? data.harvests : {};
    const migrated = {};

    // Every word the old save knew about, from either source.
    const kos = new Set([...Object.keys(oldSrs), ...Object.keys(harvests)]);
    kos.forEach(ko => {
      const prev = oldSrs[ko] || {};
      // Already migrated (or written by a newer build) — leave it alone.
      if (prev.st) { migrated[ko] = prev; return; }

      const h = Math.max(0, (typeof harvests[ko] === 'number' ? harvests[ko] : 0) | 0,
                            (typeof prev.harvests === 'number' ? prev.harvests : 0) | 0);

      if (h <= 0) {
        // Seen but never completed a cycle. If it was mid-learning, keep it in learning.
        const e = srsNewEntry();
        if (prev.p2At || prev.p3At) { e.st = 'learn'; e.step = prev.p3At ? 1 : 0; e.due = now; }
        migrated[ko] = e;
        return;
      }

      // Graduated. Interval grows with harvest count but is capped below maturity, so
      // "mature" still has to be earned under the real scheduler rather than granted.
      const e = srsNewEntry();
      e.st = 'review';
      e.reps = h;
      e.ivl = Math.min(SRS_CFG.MATURE_IVL - 1, Math.max(1, Math.round(Math.pow(h, 1.4))));
      e.ease = _clamp(SRS_CFG.START_EASE + (h >= 5 ? 0.1 : 0), SRS_CFG.MIN_EASE, SRS_CFG.MAX_EASE);
      e.last = now;
      // Spread the queue: 1 day apart per harvest tier, so they do not all land at once.
      e.due = now + Math.min(e.ivl, 1 + (h % 7)) * DAY_MS;
      migrated[ko] = e;
    });

    data.srs = migrated;
    data.v = 5;
  }

  // v5 -> v6: SRS records became per-modality. A v5 entry was one schedule per word, and the
  // three-touch learning cycle it was earned through ends on typing, so it maps to the
  // production track. Recognition and listening start unseeded rather than inheriting an
  // interval nobody demonstrated — inheriting would claim a skill that was never tested.
  if (!data.v || data.v < 6) {
    console.log(`[Save Migration] Upgrading SRS to per-modality records v${data.v || 5} -> v6`);
    const flat = (data.srs && typeof data.srs === 'object') ? data.srs : {};
    const perModality = {};
    Object.entries(flat).forEach(([ko, entry]) => {
      if (!entry || typeof entry !== 'object') return;
      // Already migrated (or written by a newer build).
      if (entry.m && typeof entry.m === 'object') { perModality[ko] = entry; return; }
      perModality[ko] = { m: { [PRIMARY_MODALITY]: entry } };
    });
    data.srs = perModality;
    data.v = 6;
  }

  // v6 -> v7: 64 headwords were respelled with the word-spaces standard Korean requires
  // (어깨가무겁다 -> 어깨가 무겁다). srsData, harvestCounts, plots and attemptLog are all keyed
  // on `ko`, so without this step every one of those words would read as brand new and its
  // review history would be stranded under a spelling nothing looks up any more.
  if (!data.v || data.v < 7) {
    console.log(`[Save Migration] Respelling ${Object.keys(KO_V7_RENAMES).length} headwords with word-spaces v${data.v || 6} -> v7`);
    const moved = applyKoRenames(data, KO_V7_RENAMES);
    if (moved) console.log(`[Save Migration] Carried ${moved} records onto their new spelling`);
    data.v = 7;
  }

  // v7 -> v8: three headwords were corrected to the right word — 허리띠를 둘러매다 slings a belt
  // over one shoulder rather than tightening it, the idiom is 발 벗고 나서다 without the 을, and
  // 외래어 표기법 spells application 애플리케이션. Same identity problem as v7, so the same move.
  if (!data.v || data.v < 8) {
    console.log(`[Save Migration] Correcting ${Object.keys(KO_V8_RENAMES).length} mis-spelled headwords v${data.v || 7} -> v8`);
    const moved = applyKoRenames(data, KO_V8_RENAMES);
    if (moved) console.log(`[Save Migration] Carried ${moved} records onto their corrected spelling`);
    data.v = 8;
  }

  // v8 -> v9: equipped / owned character skins. Field-fill only — this step must not
  // read the live catalog (test_srs_engine.js extracts migrateSaveData into a vm that
  // only has the rename tables).
  if (!data.v || data.v < 9) {
    if (typeof data.equippedSkinId !== 'string' || !data.equippedSkinId) data.equippedSkinId = 'farmer';
    const owned = Array.isArray(data.ownedSkinIds)
      ? data.ownedSkinIds.filter(id => typeof id === 'string' && id)
      : [];
    if (owned.indexOf('farmer') < 0) owned.unshift('farmer');
    data.ownedSkinIds = owned;
    data.v = 9;
  }

  if (data.inventory && typeof data.inventory.maxSlots !== 'number') {
    data.inventory.maxSlots = 20;
  }

  if (Array.isArray(data.unlockedPlots)) {
    data.unlockedPlots = Array.from(new Set(data.unlockedPlots));
  } else if (typeof data.unlockedPlotCount === 'number') {
    const arr = [];
    for (let i = 0; i < Math.min(15, data.unlockedPlotCount); i++) arr.push(i);
    data.unlockedPlots = arr;
  } else {
    data.unlockedPlots = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  }
  data.unlockedPlotCount = typeof data.unlockedPlotCount === 'number'
    ? data.unlockedPlotCount
    : data.unlockedPlots.length;

  // Ensure data.cooking object exists and populate from inventory.cookedDishes if legacy save
  data.cooking = data.cooking || { cookedRecipes: [], totalDishesCooked: 0, recipeStats: {} };
  data.cooking.cookedRecipes = Array.isArray(data.cooking.cookedRecipes) ? data.cooking.cookedRecipes : [];
  data.cooking.recipeStats = (typeof data.cooking.recipeStats === 'object' && data.cooking.recipeStats !== null) ? data.cooking.recipeStats : {};
  data.cooking.totalDishesCooked = typeof data.cooking.totalDishesCooked === 'number' ? data.cooking.totalDishesCooked : 0;

  if (data.inventory && data.inventory.cookedDishes && data.cooking.cookedRecipes.length === 0) {
    const cookedKeys = Object.keys(data.inventory.cookedDishes).filter(k => data.inventory.cookedDishes[k] > 0);
    if (cookedKeys.length > 0) {
      data.cooking.cookedRecipes = cookedKeys;
      data.cooking.recipeStats = { ...data.inventory.cookedDishes };
      let sum = 0;
      for (const val of Object.values(data.inventory.cookedDishes)) {
        sum += (typeof val === 'number' ? val : 0);
      }
      data.cooking.totalDishesCooked = sum;
    }
  }

  return data;
}

// Collect ALL game state into ONE object
function collectSave(){
  const hcObj={}; harvestCounts.forEach((v,k)=>hcObj[k]=v);
  const isFarm = sceneRef && Array.isArray(sceneRef.plots);
  const plots = isFarm
    ? sceneRef.plots.filter(p => p && p.ko).map(p => ({ i: p.index, ko: p.ko, sState: p.sState, plantedAt: p.plantedAt || 0 }))
    : plotSave;
  const apple = (sceneRef && typeof sceneRef.appleRipeAt !== 'undefined')
    ? { ripeAt: sceneRef.appleRipeAt, ripe: sceneRef.appleRipe }
    : appleTreeSave;
  const drops = (sceneRef && Array.isArray(sceneRef.droppedItems))
    ? sceneRef.droppedItems.map(item => ({ itemId: item.itemId, nameKo: item.nameKo, x: item.curX, y: item.curY }))
    : droppedItemsSave;
  droppedItemsSave = drops;
  return {
    v: 9,
    currencies: playerCurrencies,
    gold: playerCurrencies.coins,
    unlockedLevels,
    unlockedTrophies,
    unlockedPlots,
    unlockedPlotCount,
    harvests: hcObj,
    srs: srsData,
    attempts: attemptLog,
    plots,
    lastLevel: currentLevelIndex,
    playerRank: ensurePlayerRank(),
    apple,
    fishAlbum: fishAlbumSave,
    quests: questState,
    inventory: inventoryState,
    recipes: recipeState,
    activeBuffs: activeBuffs,
    leaderboards: leaderboardState,
    droppedItems: drops,
    cooking: cookingState,
    equippedSkinId,
    ownedSkinIds,
    updatedAt: Date.now()
  };
}

// Apply a save snapshot to the in-memory state
function applySave(d){
  if(!d) return false;
  const migrated = migrateSaveData(d);
  if(!migrated) return false;
  
  playerCurrencies = migrated.currencies || { coins: migrated.gold || 0, gems: 0, honor: 0 };
  syncGoldAlias();
  
  unlockedLevels = Array.isArray(migrated.unlockedLevels) ? migrated.unlockedLevels : [0];
  unlockedTrophies = Array.isArray(migrated.unlockedTrophies) ? migrated.unlockedTrophies : [];
  if (Array.isArray(migrated.unlockedPlots)) {
    unlockedPlots = migrated.unlockedPlots.slice();
  } else if (typeof migrated.unlockedPlotCount === 'number') {
    // Legacy save: only a count was stored, with plots unlocked in order.
    unlockedPlots = Array.from({ length: migrated.unlockedPlotCount }, (_, i) => i);
  } else {
    unlockedPlots = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  }
  // Grandfather any plot that already holds a crop. isPlotUnlocked used to accept
  // `i < unlockedPlotCount`, which let one purchase unlock an extra plot for free;
  // that plot was never recorded in unlockedPlots, so tightening the check would
  // strand a crop on a now-locked tile. Keep what players already planted.
  if (Array.isArray(migrated.plots)) {
    migrated.plots.forEach(p => {
      if (p && typeof p.i === 'number' && p.ko && !unlockedPlots.includes(p.i)) unlockedPlots.push(p.i);
    });
  }
  unlockedPlots.sort((a, b) => a - b);
  unlockedPlotCount = unlockedPlots.length;
  // Replaced, not merged. This is the only field that was accumulated into, and it is a
  // module-level Map that outlives any one save: a guest session followed by a sign-in left
  // the guest's counts in place for every word the incoming save did not mention. That
  // silently suppressed harvest payouts (10 * 0.85^prev), could skip the +10 Honor that
  // fires on exactly the tenth harvest, and inflated the mastery stats.
  harvestCounts.clear();
  if(migrated.harvests) Object.entries(migrated.harvests).forEach(([k,v])=>harvestCounts.set(k,v));
  if(migrated.srs) srsData = migrated.srs;
  // Absent in saves written before the log existed; an empty history is correct there
  // rather than something to reconstruct.
  attemptLog = Array.isArray(migrated.attempts) ? migrated.attempts.slice(-ATTEMPT_LOG_MAX) : [];
  if(migrated.plots) plotSave = migrated.plots;
  if(typeof migrated.lastLevel==='number') currentLevelIndex = migrated.lastLevel;
  if (migrated.playerRank && typeof migrated.playerRank === 'object') {
    playerRank = Object.assign(defaultPlayerRank(), migrated.playerRank);
    ensurePlayerRank();
  } else {
    playerRank = defaultPlayerRank();
  }
  if(migrated.apple) appleTreeSave = migrated.apple;
  if(migrated.fishAlbum) fishAlbumSave = migrated.fishAlbum;
  if(migrated.quests) questState = migrated.quests;
  if(migrated.inventory) {
    inventoryState = migrated.inventory;
    inventoryState.maxSlots = typeof inventoryState.maxSlots === 'number' ? inventoryState.maxSlots : 20;
  }
  if(migrated.recipes) recipeState = migrated.recipes;
  if(migrated.activeBuffs) activeBuffs = migrated.activeBuffs;
  if(migrated.leaderboards) leaderboardState = migrated.leaderboards;
  if(Array.isArray(migrated.droppedItems)) {
    droppedItemsSave = migrated.droppedItems;
    if(sceneRef) {
      sceneRef.clearAllDroppedItems();
      droppedItemsSave.forEach(drop => sceneRef.spawnDroppedItem(drop.itemId || drop.nameKo, drop.x, drop.y, false));
    }
  }
  if(migrated.cooking) {
    cookingState = {
      cookedRecipes: Array.isArray(migrated.cooking.cookedRecipes) ? migrated.cooking.cookedRecipes : [],
      totalDishesCooked: typeof migrated.cooking.totalDishesCooked === 'number' ? migrated.cooking.totalDishesCooked : 0,
      recipeStats: (typeof migrated.cooking.recipeStats === 'object' && migrated.cooking.recipeStats !== null) ? migrated.cooking.recipeStats : {}
    };
  } else {
    cookingState = { cookedRecipes: [], totalDishesCooked: 0, recipeStats: {} };
  }

  equippedSkinId = migrated.equippedSkinId;
  ownedSkinIds = migrated.ownedSkinIds;
  if (typeof sanitizeSkinState === 'function') sanitizeSkinState();
  if (sceneRef && sceneRef.player && typeof ensureActiveSkinLoaded === 'function') {
    ensureActiveSkinLoaded(sceneRef, () => {
      if (sceneRef && sceneRef.player) applySkinToSprite(sceneRef, sceneRef.player, FARM_SKIN_APPLY);
    });
  }

  initQuestState();
  if (typeof updateQuestHudBadge === 'function') updateQuestHudBadge();
  updateCurrencyHUD();
  updateRankHUD();
  if (sceneRef && typeof sceneRef.refreshPlotAccess === 'function') sceneRef.refreshPlotAccess();
  // After refreshPlotAccess, so plots this save owns are no longer drawn as locked when the
  // crops land on them. Without this the tiles kept showing the pre-load farm, and the next
  // collectSave() — which reads the live scene, not plotSave — wrote that farm back over the
  // save we had just loaded. Reachable on sign-in mid-session and on a reload that still has
  // the Google token in sessionStorage, both of which run long after the scene is built.
  if (sceneRef && typeof sceneRef.reloadPlotsFromSave === 'function') sceneRef.reloadPlotsFromSave();
  if (typeof checkCookingAchievements === 'function') checkCookingAchievements();
  return true;
}

// Write to file (pywebview) AND localStorage backup.
//
// collectSave() serializes the entire game state — currencies, SRS for 1500 words,
// plots, inventory, quests, recipes, buffs, leaderboards, ground drops.
// persistSave() is called from ~35 places, including on every quiz answer, so writes
// are coalesced behind a trailing debounce. Use flushSave() when the state must reach
// disk immediately (scene shutdown, page unload, explicit Save button).
const SAVE_DEBOUNCE_MS = 800;
let _saveTimer = null;
let _savePending = false;

// Resolves to a per-destination report so a caller that cares — the Save button — can
// tell the player the truth instead of a hardcoded tick. localStorage is written first and
// synchronously, because it is the only leg that reliably lands during page teardown.
async function flushSave(){
  if(_saveTimer){ clearTimeout(_saveTimer); _saveTimer = null; }
  _savePending = false;
  const data = collectSave();
  const result = { local: false, file: null, cloud: null };

  try{ localStorage.setItem('hv_save_v2', JSON.stringify(data)); result.local = true; }
  catch(e){ console.warn('localStorage save failed:', e); }

  if(window.pywebview?.api){
    try{ result.file = (await window.pywebview.api.save(data)) !== false; }
    catch(e){ console.warn('File save failed:',e); result.file = false; }
  }

  if (typeof pushCloudSave === 'function') result.cloud = await pushCloudSave(data);
  return result;
}

function persistSave(){
  _savePending = true;
  if(_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => { _saveTimer = null; flushSave(); }, SAVE_DEBOUNCE_MS);
}

// Never drop a pending write when the page goes away. pagehide covers the mobile and
// Safari case where beforeunload does not fire; the synchronous localStorage leg of
// flushSave is what reliably lands during teardown.
if(typeof window !== 'undefined' && window.addEventListener){
  const flushIfPending = () => { if(_savePending) flushSave(); };
  window.addEventListener('beforeunload', flushIfPending);
  window.addEventListener('pagehide', flushIfPending);
  if(typeof document !== 'undefined' && document.addEventListener){
    document.addEventListener('visibilitychange', () => {
      if(document.visibilityState === 'hidden') flushIfPending();
    });
  }
}

// ── Save precedence (pure) ───────────────────────────────────────────────────
// Read BOTH copies and apply whichever is newer.
//
// Preferring the file unconditionally lost the last session's play. flushSave() writes
// localStorage synchronously and then awaits the pywebview bridge, and pagehide cannot
// await anything — so closing the window right after a save left localStorage current and
// the file one write behind. The next launch then loaded the stale file and the newer
// localStorage copy sat there unread.
//
// Comparing timestamps is safe here because both copies come from the same writer: the
// desktop build runs on its own WebView2 profile (WEBVIEW2_USER_DATA_FOLDER, see main.py),
// so nothing else can put a competing entry in this localStorage. A tie goes to the file,
// which is the copy that survives a profile reset.
function saveStamp(s){
  return (s && typeof s.updatedAt === 'number') ? s.updatedAt : 0;
}

// Newest first, ties to the file. Returns [{ src, data }] with the absent copies dropped.
function orderSaveCandidates(fileSave, localSave){
  return [
    { src: 'file', data: fileSave },
    { src: 'localStorage', data: localSave }
  ].filter(c => c.data && typeof c.data === 'object')
   .sort((a, b) => (saveStamp(b.data) - saveStamp(a.data)) || (a.src === 'file' ? -1 : 1));
}
// ── Save precedence end ──────────────────────────────────────────────────────

async function loadSave(){
  let fileSave = null;
  if(window.pywebview?.api){
    try{ fileSave = await window.pywebview.api.load(); }
    catch(e){ console.warn('File load failed:',e); }
  }
  const candidates = orderSaveCandidates(fileSave, peekLocalSave());

  for(const c of candidates){
    if(applySave(c.data)){
      const other = candidates.find(o => o !== c);
      const behind = other ? ' (' + other.src + ' was ' + (saveStamp(c.data) - saveStamp(other.data)) + 'ms behind)' : '';
      console.log('[Save] Loaded from ' + c.src + ' ✓' + behind);
      return;
    }
  }
  console.log('[Save] No save found – fresh start.');
}

let googleAuth = { clientId: '', token: '', user: null, ready: false };

function peekLocalSave() {
  try { return JSON.parse(localStorage.getItem('hv_save_v2') || 'null'); } catch { return null; }
}

function getGoogleToken() {
  if (googleAuth.token) return googleAuth.token;
  try { return sessionStorage.getItem('hv_google_token') || ''; } catch { return ''; }
}

function setGoogleSession(token, user) {
  googleAuth.token = token || '';
  googleAuth.user = user || null;
  try {
    if (token) sessionStorage.setItem('hv_google_token', token);
    else sessionStorage.removeItem('hv_google_token');
    if (user) localStorage.setItem('hv_google_user', JSON.stringify(user));
    else localStorage.removeItem('hv_google_user');
  } catch {}
  renderAuthUI();
}

// A hung request must not wedge the Save button, which now awaits this.
const CLOUD_TIMEOUT_MS = 15000;

async function cloudSaveRequest(method, body) {
  const token = getGoogleToken();
  if (!token) return { status: 401, json: null };
  const opts = {
    method,
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);
  let timer = null;
  if (typeof AbortController === 'function') {
    const ac = new AbortController();
    opts.signal = ac.signal;
    timer = setTimeout(() => ac.abort(), CLOUD_TIMEOUT_MS);
  }
  try {
    const r = await fetch('/api/save', opts);
    let json = null;
    try { json = await r.json(); } catch {}
    return { status: r.status, json };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// ── Cloud writes, serialized ─────────────────────────────────────────────────
// Every PUT carries the whole game state, so two of them in flight at once is a
// last-writer-wins race decided by network jitter: the earlier request could land after
// the later one and roll progress back. Requests now run one at a time on a chain, and
// while one is in flight the queued payloads collapse to the newest — sending an
// intermediate snapshot after a fresher one exists has no value.
let _cloudChain = Promise.resolve({ ok: true, skipped: true });
let _cloudPending = null;
let _cloudLastError = '';

function pushCloudSave(data) {
  if (!getGoogleToken()) return { ok: true, skipped: true, reason: 'signed-out' };
  _cloudPending = data;
  _cloudChain = _cloudChain.then(async () => {
    const payload = _cloudPending;
    // A later push already superseded this slot, or the newest payload went out ahead
    // of it. Either way there is nothing left to send.
    if (!payload) return { ok: true, skipped: true, reason: 'superseded' };
    _cloudPending = null;
    try {
      const { status } = await cloudSaveRequest('PUT', payload);
      if (status === 401) {
        setGoogleSession('', null);
        if (typeof showToast === 'function') showToast('Sign in again to keep cloud save.');
        return { ok: false, status, reason: 'signed-out' };
      }
      if (status === 409) {
        // The server is holding a newer save than the one being pushed — another device
        // got there first. Do not overwrite it, and do not yank the current session out
        // from under the player either; syncCloudSave() reconciles on the next load.
        _cloudLastError = 'cloud has newer progress';
        if (typeof showToast === 'function') {
          showToast('☁ Another device has newer progress — not overwriting it.', 4200);
        }
        return { ok: false, status, reason: _cloudLastError };
      }
      if (status !== 200) {
        _cloudLastError = 'HTTP ' + status;
        console.warn('Cloud save rejected:', status);
        return { ok: false, status, reason: _cloudLastError };
      }
      _cloudLastError = '';
      return { ok: true, status };
    } catch (e) {
      // Swallowing this was how a week of offline play could look like it was syncing.
      _cloudLastError = (e && e.name === 'AbortError') ? 'timed out' : 'network error';
      console.warn('Cloud save failed:', _cloudLastError, e);
      return { ok: false, reason: _cloudLastError };
    }
  });
  return _cloudChain;
}

// ── Cloud writes end ─────────────────────────────────────────────────────────

// How much earned progress a save holds, counted only on fields that never go down over a
// player's life. Gold is deliberately absent: it is spent, so a richer save can hold less.
//
// This exists because a timestamp cannot answer the question that decides a sign-in on a
// second machine. A browser that has never seen the account writes a save within six seconds
// of loading the page — before any sign-in — and that save is by definition the newest one in
// existence. Comparing timestamps alone therefore made "open another browser and sign in"
// upload a blank game over the player's real one: 85 gold and no review history replacing
// everything. Measured on production, not theorised.
function saveProgressWeight(s) {
  if (!s || typeof s !== 'object') return -1;
  const n = (v) => (Array.isArray(v) ? v.length
    : (v && typeof v === 'object' ? Object.keys(v).length : 0));
  const num = (v) => (typeof v === 'number' && isFinite(v) && v > 0 ? v : 0);
  const rank = s.playerRank || {};
  return n(s.srs) + n(s.attempts) + n(s.harvests) + n(s.unlockedTrophies)
    + Math.max(0, n(s.unlockedLevels) - 1)
    + num(rank.asked) + num(rank.sessions) + num(rank.xp);
}

async function syncCloudSave() {
  if (!getGoogleToken()) return;
  let remote;
  try {
    const { status, json } = await cloudSaveRequest('GET');
    if (status === 401) { setGoogleSession('', null); return; }
    if (status !== 200) return;
    remote = json && json.data;
    if (json && json.user) googleAuth.user = json.user;
  } catch { return; }
  const local = peekLocalSave();
  const remoteAt = (remote && remote.updatedAt) || 0;
  const localAt = (local && local.updatedAt) || 0;

  // A newer local save only outranks the cloud when it actually holds more progress. Newer
  // and emptier means a fresh session on a machine that has not synced yet, and the cloud
  // copy is the one to keep. Newer and equal-or-richer is genuine offline play, which wins.
  const pullBecauseEmptier = !!(remote && localAt > remoteAt
    && saveProgressWeight(local) < saveProgressWeight(remote));

  if (remote && (remoteAt >= localAt || pullBecauseEmptier)) {
    if (applySave(remote)) {
      try { localStorage.setItem('hv_save_v2', JSON.stringify(remote)); } catch {}
      // Said differently when this device's copy is being discarded, because it is — someone
      // who had played here as a guest deserves to be told where it went.
      if (typeof showToast === 'function') {
        if (pullBecauseEmptier) showToast('☁ Cloud progress restored — this browser had none of its own.', 5000);
        else showToast('☁ Cloud save loaded');
      }
      if (typeof updateGoldHUD === 'function') updateGoldHUD();
      if (typeof updateRankHUD === 'function') updateRankHUD();
      if (typeof buildLevelSelectScreen === 'function') buildLevelSelectScreen();
    }
    return;
  }
  // Through pushCloudSave, not cloudSaveRequest directly, so this upload takes its turn
  // on the same chain as gameplay saves instead of racing them.
  if (local) await pushCloudSave(local);
  else if (!remote) await pushCloudSave(collectSave());
}

function escapeAuthText(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function safeGooglePhoto(url) {
  const u = String(url || '');
  return /^https:\/\/[\w.-]+\.googleusercontent\.com\//.test(u) ? u : '';
}

// atob hands back one byte per character, but a JWT payload is UTF-8, so a display name
// outside ASCII — which for a Korean-learning app is most of them — came through as mojibake.
// The bytes are handed to TextDecoder instead. Not just cosmetic: this is the name the auth
// chip shows once a player has no email on their Google profile.
function decodeJwtPayload(token) {
  const part = String(token || '').split('.')[1] || '';
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob(pad);
  if (typeof TextDecoder === 'function') {
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return JSON.parse(new TextDecoder('utf-8').decode(bytes));
  }
  return JSON.parse(raw);
}

function renderAuthUI() {
  const user = googleAuth.user;
  const signed = !!(user && getGoogleToken());
  const slots = ['ls-auth-status', 'hud-auth-status'];
  slots.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (signed) {
      const src = safeGooglePhoto(user.picture);
      const photo = src ? '<img class="auth-photo" alt="" src="' + src + '">' : '';
      const label = escapeAuthText(user.email || user.name || 'Signed in');
      el.innerHTML = photo + '<span class="auth-name">' + label + '</span>' +
        '<button type="button" class="auth-out" onclick="signOutGoogle()">Sign out</button>';
    } else {
      el.innerHTML = '';
    }
  });
  document.querySelectorAll('.google-signin-slot').forEach(el => {
    el.classList.toggle('hidden', signed || !googleAuth.clientId);
  });
  const wrap = document.getElementById('ls-auth');
  if (wrap) wrap.classList.toggle('hidden', !googleAuth.clientId && !signed);
}

function onGoogleCredential(resp) {
  const token = resp && resp.credential;
  if (!token) return;
  let user = { email: '', name: '', picture: '' };
  try {
    const payload = decodeJwtPayload(token);
    user = { email: payload.email || '', name: payload.name || '', picture: payload.picture || '', sub: payload.sub };
  } catch {}
  setGoogleSession(token, user);
  if (typeof showToast === 'function') showToast('Signed in — syncing save…');
  syncCloudSave();
}

function signOutGoogle() {
  setGoogleSession('', null);
  try {
    if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect();
  } catch {}
  if (typeof showToast === 'function') showToast('Signed out. Progress stays on this device.');
}

async function initGoogleAuth() {
  if (typeof IS_NODE !== 'undefined' && IS_NODE) return;
  try {
    const cfg = await fetch('/api/config').then(r => r.ok ? r.json() : null);
    googleAuth.clientId = (cfg && cfg.googleClientId) || '';
  } catch {
    googleAuth.clientId = '';
  }
  googleAuth.ready = true;
  if (!googleAuth.clientId) { renderAuthUI(); return; }
  try {
    const raw = localStorage.getItem('hv_google_user');
    if (raw) googleAuth.user = JSON.parse(raw);
    googleAuth.token = sessionStorage.getItem('hv_google_token') || '';
  } catch {}
  const boot = () => {
    if (!window.google || !google.accounts || !google.accounts.id) return false;
    try {
      google.accounts.id.initialize({
        client_id: googleAuth.clientId,
        callback: onGoogleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
        ux_mode: 'popup'
      });
      document.querySelectorAll('.google-signin-slot').forEach(el => {
        el.innerHTML = '';
        google.accounts.id.renderButton(el, {
          theme: 'filled_black',
          size: 'medium',
          type: 'standard',
          shape: 'pill',
          text: 'signin_with'
        });
      });
      renderAuthUI();
      if (getGoogleToken()) syncCloudSave();
    } catch (e) {
      console.warn('Google Sign-In init failed', e);
      renderAuthUI();
    }
    return true;
  };
  if (boot()) return;
  loadGoogleIdentityScript();
  let n = 0;
  const t = setInterval(() => { if (boot() || ++n > 40) clearInterval(t); }, 250);
}

// Google Identity Services, injected on demand rather than from a <script> tag in
// index.html. A build with no client id configured — every desktop build, unless
// GOOGLE_CLIENT_ID is set — then loads no third-party script at all, which is both one
// less script running in the game's origin and one less thing to fail when offline.
let _gisRequested = false;
function loadGoogleIdentityScript() {
  if (_gisRequested || typeof document === 'undefined') return;
  _gisRequested = true;
  const s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client';
  s.async = true;
  s.defer = true;
  s.onerror = () => {
    // Offline, or the domain is blocked. Cloud save is simply unavailable; local play
    // is unaffected, so say nothing louder than a warning.
    console.warn('Google Sign-In unavailable — playing with local save only.');
    renderAuthUI();
  };
  document.head.appendChild(s);
}

if (typeof window !== 'undefined') {
  window.signOutGoogle = signOutGoogle;
  window.onGoogleCredential = onGoogleCredential;
}

// Legacy aliases
function saveSRS()   { persistSave(); }
function savePlotsFn() { persistSave(); }
// ── Record access ────────────────────────────────────────────────────────────
// Reads never create. srsData is serialized into every save, so touching a word to check a
// badge must not add 1500 empty records to it.
function peekSrs(ko, mod = PRIMARY_MODALITY){
  const rec = srsData[ko];
  return rec && rec.m ? rec.m[mod] : undefined;
}

// The word's headline state. Defaults to production because that is what every existing
// caller — gates, mastery, badges, the plot cycle — already meant by "this word's progress".
function getSrs(ko){ return peekSrs(ko) || srsNewEntry(); }

// How many words are mature, for the quest board, Story Act 6 and the leaderboard.
//
// The obvious spelling — Object.values(srsData).filter(srsIsMature) — is wrong under the
// per-modality schema: the values are `{ m: { type, recognise, listen } }` wrappers, which
// carry no `st`/`ivl` of their own, so srsIsMature rejected every one and the count was
// permanently zero. Maturity is a property of the primary modality, so go through peekSrs.
function srsMatureWordCount(){
  const all = (typeof srsData !== 'undefined' && srsData) ? srsData : {};
  if (typeof srsIsMature !== 'function') return 0;
  let n = 0;
  Object.keys(all).forEach(ko => { if (srsIsMature(peekSrs(ko))) n++; });
  return n;
}

// Creates on demand. Only for the write path.
function getSrsMod(ko, mod = PRIMARY_MODALITY){
  let rec = srsData[ko];
  if (!rec || !rec.m) { rec = { m: {} }; srsData[ko] = rec; }
  if (!rec.m[mod]) rec.m[mod] = srsNewEntry();
  return rec.m[mod];
}

function setSrs(ko, u, mod = PRIMARY_MODALITY){
  srsData[ko].m[mod] = { ...getSrsMod(ko, mod), ...u };
  saveSRS();
}

// ── Word-level aggregation across modalities ─────────────────────────────────
// A word is due when its *soonest* started modality is due, and that modality is the one the
// review should test — there is no point re-testing recognition when production is what has
// gone stale.
function startedModalities(ko){
  const rec = srsData[ko];
  if (!rec || !rec.m) return [];
  return MODALITIES.filter(m => rec.m[m] && rec.m[m].st !== 'new');
}

function dueModality(ko, now = Date.now()){
  const started = startedModalities(ko).filter(m => srsIsDue(srsData[ko].m[m], now));
  if (!started.length) return null;
  // Soonest due first; production wins a tie because it is the skill that matters most.
  started.sort((a, b) => (srsData[ko].m[a].due - srsData[ko].m[b].due)
    || (a === PRIMARY_MODALITY ? -1 : b === PRIMARY_MODALITY ? 1 : 0));
  return started[0];
}

function wordIsDue(ko, now = Date.now()){ return dueModality(ko, now) !== null; }

// Record a review outcome. This is the only place the scheduler is advanced.
// ── Attempt log ──────────────────────────────────────────────────────────────
// SM-2 keeps only the current interval and ease; it throws the review history away. FSRS
// and any retention analysis need that history, and it cannot be reconstructed after the
// fact — so every graded answer is appended here even though nothing consumes it yet.
//
// Bounded ring buffer: this rides along in every save, and collectSave() already serializes
// the whole state, so it must not grow without limit.
const ATTEMPT_LOG_MAX = 500;
let attemptLog = [];   // [{ ko, g, m, at, ivl, st }]

// Rolling correct-rate over the most recent answers, used by the dashboard. Distinct from
// srsStats().retention, which is lifetime reps-vs-lapses.
function recentAccuracy(n = 50){
  const slice = attemptLog.slice(-n);
  if (!slice.length) return null;
  const ok = slice.filter(a => a.g > GRADE.AGAIN).length;
  return Math.round((ok / slice.length) * 100);
}

// Per-day answer counts for the last `days` days, for a streak/heatmap readout.
function dailyActivity(days = 14, now = Date.now()){
  const out = new Array(days).fill(0);
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  attemptLog.forEach(a => {
    const d = Math.floor((startOfToday.getTime() - new Date(a.at).setHours(0, 0, 0, 0)) / DAY_MS);
    if (d >= 0 && d < days) out[days - 1 - d]++;
  });
  return out;
}

// Advances one modality's schedule. `mod` defaults to whichever question mode is on screen,
// so a recognition answer can never move the production interval.
function gradeWord(ko, grade, mod = currentQuizMode, now = Date.now()){
  const modality = MODALITIES.includes(mod) ? mod : PRIMARY_MODALITY;
  const next = srsSchedule(getSrsMod(ko, modality), grade, now);
  srsData[ko].m[modality] = next;
  attemptLog.push({
    ko,
    g: grade,                     // 0 Again … 3 Easy
    m: modality,                  // which modality this answer scheduled
    at: now,
    ivl: next.ivl,                // interval the answer resulted in
    st: next.st
  });
  if (attemptLog.length > ATTEMPT_LOG_MAX) attemptLog.splice(0, attemptLog.length - ATTEMPT_LOG_MAX);
  saveSRS();
  return next;
}

// Words the player owns that are due right now, soonest first, each tagged with the modality
// that fell due so the review can test the right skill.
function srsDueWords(now = Date.now()){
  const seen = new Set();
  const out = [];
  unlockedLevels.forEach(idx => (levelsData[idx]?.words || []).forEach(w => {
    if (seen.has(w.ko)) return;
    seen.add(w.ko);
    const mod = dueModality(w.ko, now);
    if (mod) out.push({ word: w, modality: mod, entry: srsData[w.ko].m[mod] });
  }));
  out.sort((a, b) => a.entry.due - b.entry.due);
  return out;
}

// Review forecast for the next `days` days. Counts every scheduled modality, since each one
// is a separate thing the player will be asked to do.
function srsForecast(days = 7, now = Date.now()){
  const buckets = new Array(days).fill(0);
  Object.values(srsData).forEach(rec => {
    if (!rec || !rec.m) return;
    Object.values(rec.m).forEach(e => {
      if (!srsIsGraduated(e) || !e.due) return;
      const d = Math.floor((e.due - now) / DAY_MS);
      if (d >= 0 && d < days) buckets[d]++;
    });
  });
  return buckets;
}

// Word counts report the production track, so "learned" and "mature" mean the same thing they
// did before per-modality records existed. Retention and ease average over every modality,
// because a lapse in recognition is still a lapse.
function srsStats(){
  const kos = Object.keys(srsData);
  const primary = kos.map(k => peekSrs(k)).filter(Boolean);
  const everyEntry = kos.flatMap(k => Object.values(srsData[k].m || {}));
  const gradAll = everyEntry.filter(srsIsGraduated);
  const reps = gradAll.reduce((s, e) => s + (e.reps || 0), 0);
  const lapses = gradAll.reduce((s, e) => s + (e.lapses || 0), 0);
  return {
    seen: kos.length,
    learning: primary.filter(srsIsLearning).length,
    graduated: primary.filter(srsIsGraduated).length,
    mature: primary.filter(srsIsMature).length,
    dueNow: srsDueWords().length,
    // Share of reviews answered without a lapse — the closest thing to a retention rate
    // the game can measure without replaying the whole attempt log.
    retention: reps + lapses > 0 ? Math.round((reps / (reps + lapses)) * 100) : null,
    avgEase: gradAll.length
      ? +(gradAll.reduce((s, e) => s + e.ease, 0) / gradAll.length).toFixed(2)
      : null,
    // Per-modality breakdown, so the dashboard can show that recognition is ahead of
    // production rather than hiding the gap behind one number.
    byModality: MODALITIES.reduce((acc, m) => {
      const es = kos.map(k => peekSrs(k, m)).filter(Boolean);
      acc[m] = {
        started: es.length,
        graduated: es.filter(srsIsGraduated).length,
        mature: es.filter(srsIsMature).length
      };
      return acc;
    }, {})
  };
}

