// ═══════════════ TWO COPIES OF ONE SAVE, MADE INTO ONE ════════════════════════
//
// A player with two devices has two copies of their progress, and the cloud used to keep
// whichever was written last — the whole document. Play on the phone in the morning and on the
// laptop in the afternoon, with the laptop's tab left open since yesterday, and the laptop's
// first save put yesterday's state back over the morning: every word reviewed on the phone
// went back to its old schedule. The 409 the endpoint answered with only caught a request that
// arrived out of order; a device that was simply behind wrote a newer timestamp and won.
//
// Most of a save is a record of things that happened, and those can be merged without asking
// anybody: a word answered on either device keeps its most recent answer, a count keeps the
// larger number, an unlock stays unlocked. The rest is the state of one game at one moment —
// coins, the plots, the bag, the quest board — and two of those cannot be added together, so
// one copy's is kept whole: whichever the caller says is the live one.
//
// Loaded by the game as a script (the functions below are globals, like the rest of js/) and
// required by api/save.js, which merges the small tail a closing tab sends (see PATCH there).

// The fields that are one game's state in the moment. Everything not listed here and not merged
// below is carried from the copy that wins as well.
const MERGE_WHOLE_FIELDS = [
  'currencies', 'gold', 'plots', 'apple', 'quests', 'inventory', 'recipes', 'activeBuffs',
  'droppedItems', 'equippedSkinId', 'lastLevel', 'lastWorld', 'owner'
];

// Object.assign copies a property whose value is undefined, and a live collectSave() leaves
// fields undefined on purpose (lastWorld before the world list has settled). Those must not
// blank out the other copy's value.
function assignDefined(target, src) {
  if (!src || typeof src !== 'object') return target;
  Object.keys(src).forEach((k) => { if (src[k] !== undefined) target[k] = src[k]; });
  return target;
}

// One modality's schedule: the most recent answer wins, because it was made knowing everything
// the earlier one knew. A tie on the clock goes to the record with more reviews behind it.
function newerSrsEntry(x, y) {
  if (!x) return y;
  if (!y) return x;
  const lx = Number(x.last) || 0, ly = Number(y.last) || 0;
  if (ly !== lx) return ly > lx ? y : x;
  return (Number(y.reps) || 0) > (Number(x.reps) || 0) ? y : x;
}

function mergeSrsRecords(a, b) {
  const out = {};
  const A = (a && typeof a === 'object') ? a : {};
  const B = (b && typeof b === 'object') ? b : {};
  new Set(Object.keys(A).concat(Object.keys(B))).forEach((ko) => {
    const hasA = !!(A[ko] && typeof A[ko] === 'object' && A[ko].m);
    const hasB = !!(B[ko] && typeof B[ko] === 'object' && B[ko].m);
    // A record in no shape this knows is carried as it is rather than rebuilt into an empty
    // one: merging must never be the thing that loses data it does not understand.
    if (!hasA && !hasB) { out[ko] = (ko in B) ? B[ko] : A[ko]; return; }
    const ma = hasA ? A[ko].m : {};
    const mb = hasB ? B[ko].m : {};
    const m = {};
    new Set(Object.keys(ma).concat(Object.keys(mb))).forEach((mod) => {
      const e = newerSrsEntry(ma[mod], mb[mod]);
      if (e) m[mod] = e;
    });
    out[ko] = { m };
  });
  return out;
}

// Harvest counts, the fish album: tallies, so the larger one has seen everything the smaller has.
function mergeCountMaps(a, b) {
  const out = Object.assign({}, (a && typeof a === 'object') ? a : {});
  Object.entries((b && typeof b === 'object') ? b : {}).forEach(([k, v]) => {
    const n = Number(v) || 0;
    if (!(k in out) || n > (Number(out[k]) || 0)) out[k] = v;
  });
  return out;
}

// The review history: both devices' answers, in order, bounded the way the game bounds it.
function mergeAttemptLogs(a, b, max) {
  const cap = max || 500;
  const seen = new Set();
  const all = [];
  [].concat(Array.isArray(a) ? a : [], Array.isArray(b) ? b : []).forEach((r) => {
    if (!r || typeof r !== 'object') return;
    const key = [r.at, r.ko, r.m, r.g].join('|');
    if (seen.has(key)) return;
    seen.add(key);
    all.push(r);
  });
  all.sort((x, y) => (Number(x.at) || 0) - (Number(y.at) || 0));
  return all.slice(-cap);
}

// How many times each exercise was done. Both copies count up from a shared past, so adding
// them would count that past twice; the larger count is the one that has seen more.
function mergePracticeLogs(a, b) {
  const out = Object.assign({}, (a && typeof a === 'object' && !Array.isArray(a)) ? a : {});
  Object.entries((b && typeof b === 'object' && !Array.isArray(b)) ? b : {}).forEach(([k, e]) => {
    const cur = out[k];
    if (!cur) { out[k] = e; return; }
    const nb = Number(e && e.n) || 0, nc = Number(cur.n) || 0;
    if (nb > nc || (nb === nc && (Number(e && e.at) || 0) > (Number(cur.at) || 0))) out[k] = e;
  });
  return out;
}

function mergeIdLists(a, b) {
  if (!Array.isArray(a) && !Array.isArray(b)) return undefined;
  const out = [];
  [].concat(Array.isArray(a) ? a : [], Array.isArray(b) ? b : []).forEach((v) => {
    if (out.indexOf(v) < 0) out.push(v);
  });
  return out.every((v) => typeof v === 'number') ? out.sort((x, y) => x - y) : out;
}

// Rank only climbs, so the copy further up the ladder has the history the other lacks.
function higherRank(a, b) {
  if (!a || typeof a !== 'object') return b;
  if (!b || typeof b !== 'object') return a;
  const la = Number(a.level) || 0, lb = Number(b.level) || 0;
  if (la !== lb) return lb > la ? b : a;
  return (Number(b.xp) || 0) > (Number(a.xp) || 0) ? b : a;
}

// Personal bests are bests: the higher number wins field by field. The labels beside them are
// recomputed from live state whenever the board opens, so the live copy's are kept.
function mergeBests(live, other) {
  const pl = (live && live.personalBests) || {};
  const po = (other && other.personalBests) || {};
  const out = Object.assign({}, po, pl);
  Object.keys(po).forEach((k) => {
    if (typeof po[k] === 'number' && (typeof pl[k] !== 'number' || po[k] > pl[k])) out[k] = po[k];
  });
  return Object.assign({}, other || {}, live || {}, { personalBests: out });
}

function mergeCookingState(live, other) {
  if (!live && !other) return undefined;
  const l = live || {}, o = other || {};
  return {
    cookedRecipes: mergeIdLists(l.cookedRecipes, o.cookedRecipes) || [],
    totalDishesCooked: Math.max(Number(l.totalDishesCooked) || 0, Number(o.totalDishesCooked) || 0),
    recipeStats: mergeCountMaps(l.recipeStats, o.recipeStats)
  };
}

/**
 * One save out of two. `opts.prefer` names the live copy — 'a' (the default) or 'b' — whose
 * whole-state fields are kept; everything that is a record of what happened is merged.
 *
 * Either side may be partial: a field it does not carry is simply the other side's. That is
 * what lets a closing tab send only what changed since its last upload.
 */
function mergeSaves(a, b, opts) {
  if (!a || typeof a !== 'object') return b && typeof b === 'object' ? JSON.parse(JSON.stringify(b)) : null;
  if (!b || typeof b !== 'object') return JSON.parse(JSON.stringify(a));
  const preferB = !!(opts && opts.prefer === 'b');
  const live = preferB ? b : a;
  const other = preferB ? a : b;
  const out = assignDefined(assignDefined({}, other), live);

  out.srs = mergeSrsRecords(a.srs, b.srs);
  out.harvests = mergeCountMaps(a.harvests, b.harvests);
  out.fishAlbum = mergeCountMaps(a.fishAlbum, b.fishAlbum);
  out.attempts = mergeAttemptLogs(a.attempts, b.attempts);
  out.practice = mergePracticeLogs(a.practice, b.practice);
  // senseSplits: a spelling split either copy has had applied stays applied (wordSenses.js).
  ['unlockedLevels', 'unlockedTrophies', 'unlockedPlots', 'ownedSkinIds', 'visitedWorlds', 'senseSplits'].forEach((k) => {
    const merged = mergeIdLists(a[k], b[k]);
    if (merged !== undefined) out[k] = merged;
  });
  if (Array.isArray(out.unlockedPlots)) out.unlockedPlotCount = out.unlockedPlots.length;
  const rank = higherRank(a.playerRank, b.playerRank);
  if (rank) out.playerRank = rank;
  if (a.leaderboards || b.leaderboards) out.leaderboards = mergeBests(live.leaderboards, other.leaderboards);
  const cooking = mergeCookingState(live.cooking, other.cooking);
  if (cooking) out.cooking = cooking;
  out.updatedAt = Math.max(Number(a.updatedAt) || 0, Number(b.updatedAt) || 0);
  out.v = Math.max(Number(a.v) || 0, Number(b.v) || 0);
  return out;
}

// Key order is an accident of which copy a record came from, so comparisons sort it away.
function stableSaveJson(v) {
  if (Array.isArray(v)) return '[' + v.map(stableSaveJson).join(',') + ']';
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + stableSaveJson(v[k])).join(',') + '}';
  }
  return JSON.stringify(v === undefined ? null : v);
}

// Does `merged` hold progress `base` does not? Only the merged fields are compared: the whole-
// state fields are the live copy's by construction, and differ from any other copy's anyway.
function saveProgressDiffers(merged, base) {
  if (!merged) return false;
  if (!base) return true;
  const ids = (x) => (mergeIdLists(x, null) || []).slice().sort();
  const pick = (s) => stableSaveJson([
    s.srs || {}, s.harvests || {}, s.fishAlbum || {}, mergeAttemptLogs(s.attempts, null),
    s.practice || {}, ids(s.unlockedLevels), ids(s.unlockedTrophies), ids(s.unlockedPlots),
    ids(s.ownedSkinIds), ids(s.visitedWorlds), s.playerRank || null
  ]);
  return pick(merged) !== pick(base);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MERGE_WHOLE_FIELDS, mergeSaves, saveProgressDiffers, mergeSrsRecords, mergeCountMaps,
    mergeAttemptLogs, mergePracticeLogs, mergeIdLists, higherRank
  };
}
