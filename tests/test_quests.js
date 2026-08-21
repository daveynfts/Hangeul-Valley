/**
 * tests/test_quests.js — daily/weekly board pick, kind uniqueness,
 * event application, calendar keys.
 *
 * Run: node tests/test_quests.js
 */

'use strict';

const vm = require('vm');
const { readGameSource } = require('../scripts/gameSource');

const src = readGameSource();
let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

function extract(startMarker, endMarker, label) {
  const a = src.indexOf(startMarker);
  if (a < 0) throw new Error('could not find ' + label + ' start: ' + startMarker);
  const b = src.indexOf(endMarker, a);
  if (b < 0) throw new Error('could not find ' + label + ' end: ' + endMarker);
  return src.slice(a, b + endMarker.length);
}

const helpers = extract(
  '// ── Quest board helpers (pure) ──',
  '// ── Quest board helpers end ──',
  'quest board helpers'
);

const ctx = {};
vm.createContext(ctx);
vm.runInContext(helpers, ctx);
function R(expr) { return vm.runInContext(expr, ctx); }

console.log('\n── Quest board ──');

assert(R('DAILY_QUEST_POOL.length') >= 12, 'daily pool has 12+ templates');
assert(R('WEEKLY_QUEST_POOL.length') >= 6, 'weekly pool has 6+ templates');
assert(R('DAILY_QUEST_COUNT') === 5, 'daily board size is 5');
assert(R('WEEKLY_QUEST_COUNT') === 3, 'weekly board size is 3');

const dailyIds = R('DAILY_QUEST_POOL.map(q => q.id)');
assert(new Set(dailyIds).size === dailyIds.length, 'daily ids are unique');
const weeklyIds = R('WEEKLY_QUEST_POOL.map(q => q.id)');
assert(new Set(weeklyIds).size === weeklyIds.length, 'weekly ids are unique');

const kinds = R('DAILY_QUEST_POOL.map(q => q.kind)');
assert(new Set(kinds).size >= 12, 'daily pool covers 12+ activity kinds');

const boardA = R('JSON.stringify(pickQuestBoard(DAILY_QUEST_POOL, "daily:2026-08-21", DAILY_QUEST_COUNT))');
const boardB = R('JSON.stringify(pickQuestBoard(DAILY_QUEST_POOL, "daily:2026-08-21", DAILY_QUEST_COUNT))');
const boardC = R('JSON.stringify(pickQuestBoard(DAILY_QUEST_POOL, "daily:2026-08-22", DAILY_QUEST_COUNT))');
assert(boardA === boardB, 'same day key picks the same daily board');
assert(boardA !== boardC, 'next day picks a different daily board');

const kindDup = R(`(function () {
  const board = pickQuestBoard(DAILY_QUEST_POOL, "daily:2026-08-21", DAILY_QUEST_COUNT);
  const kinds = board.map(q => q.kind);
  return kinds.length === new Set(kinds).size && board.length === DAILY_QUEST_COUNT;
})()`);
assert(kindDup, 'daily board has 5 unique kinds');

const weeklyDup = R(`(function () {
  const board = pickQuestBoard(WEEKLY_QUEST_POOL, "weekly:2026-08-17", WEEKLY_QUEST_COUNT);
  const kinds = board.map(q => q.kind);
  return kinds.length === new Set(kinds).size && board.length === WEEKLY_QUEST_COUNT;
})()`);
assert(weeklyDup, 'weekly board has 3 unique kinds');

const addEvt = R(`(function () {
  const q = instantiateQuest(DAILY_QUEST_POOL.find(p => p.id === 'd_harvest'));
  applyQuestEventTo(q, 'harvest', { count: 1 });
  applyQuestEventTo(q, 'harvest', { count: 1 });
  applyQuestEventTo(q, 'quiz', { count: 9 });
  return q.current === 2 && q.target === 3 && !q.claimed;
})()`);
assert(addEvt, 'add-mode harvest ignores other kinds and caps later');

const maxEvt = R(`(function () {
  const q = instantiateQuest(DAILY_QUEST_POOL.find(p => p.id === 'd_arcade'));
  applyQuestEventTo(q, 'arcade', { score: 80 });
  applyQuestEventTo(q, 'arcade', { score: 200 });
  applyQuestEventTo(q, 'arcade', { score: 40 });
  return q.current === 150;
})()`);
assert(maxEvt, 'arcade quest keeps the high score and caps at target');

const ready = R(`(function () {
  const q = instantiateQuest(DAILY_QUEST_POOL.find(p => p.id === 'd_bee'));
  const first = applyQuestEventTo(q, 'bee', { count: 1 });
  const second = applyQuestEventTo(q, 'bee', { count: 1 });
  return first === true && second === false && questIsReady(q);
})()`);
assert(ready, 'ready flag fires once when a quest completes');

const claimed = R(`(function () {
  const q = instantiateQuest(DAILY_QUEST_POOL.find(p => p.id === 'd_cook'));
  q.claimed = true;
  applyQuestEventTo(q, 'cook', { count: 4 });
  return q.current === 0;
})()`);
assert(claimed, 'claimed quests stop progressing');

const dayKey = R('questLocalDayKey(Date.UTC(2026, 7, 21, 12, 0, 0))');
assert(typeof dayKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dayKey), 'day key is YYYY-MM-DD');

const weekKey = R('questLocalWeekKey(new Date(2026, 7, 21).getTime())');
const weekKey2 = R('questLocalWeekKey(new Date(2026, 7, 17).getTime())');
assert(weekKey === weekKey2, 'Friday and Monday share a Monday week key');

const needsRoll = R(`questBoardNeedsRoll([{ id: 'dq_1', title: 'old' }], DAILY_QUEST_POOL)`);
assert(needsRoll, 'legacy daily rows without kind are rerolled');

const keepBoard = R(`(function () {
  const board = pickQuestBoard(DAILY_QUEST_POOL, "daily:keep", DAILY_QUEST_COUNT);
  return questBoardNeedsRoll(board, DAILY_QUEST_POOL) === false;
})()`);
assert(keepBoard, 'fresh boards are kept');

const filtered = R(`(function () {
  const open = filterQuestPool(DAILY_QUEST_POOL, { arcade: true, fishing: false, dungeon: false, desk: false, taste: false });
  return open.every(q => q.need !== 'fishing' && q.need !== 'dungeon' && q.need !== 'desk' && q.need !== 'taste')
    && open.some(q => q.id === 'd_arcade')
    && open.some(q => !q.need);
})()`);
assert(filtered, 'locked zones are dropped from the daily pool');

const boardFromFilter = R(`(function () {
  const pool = filterQuestPool(DAILY_QUEST_POOL, {});
  const board = pickQuestBoard(pool, "daily:fresh", DAILY_QUEST_COUNT);
  return board.length === DAILY_QUEST_COUNT && board.every(q => !q.need);
})()`);
assert(boardFromFilter, 'a new player still gets 5 farm/study dailies');

// Regression guard. initQuestState() validated a saved board against the *unfiltered*
// pool, so a Fishing or Dungeon quest that predated the zone gate still looked like a
// known id: the board passed as healthy and nothing re-rolled until the day key turned
// over. Both the check and the re-roll now run against the same filtered pool.
const staleLockedBoard = R(`(function () {
  const flags = { arcade: false, fishing: false, dungeon: false, desk: false, taste: false };
  const open = filterQuestPool(DAILY_QUEST_POOL, flags);
  const lockedDef = DAILY_QUEST_POOL.find(q => q.need === 'fishing');
  if (!lockedDef) return 'no fishing quest in the pool to test with';
  // A board carried over from a save: four unlocked quests plus the stale locked one.
  const saved = pickQuestBoard(open, "daily:old", DAILY_QUEST_COUNT - 1)
    .concat([instantiateQuest(lockedDef)]);
  return {
    againstFiltered: questBoardNeedsRoll(saved, open),
    againstFullPool: questBoardNeedsRoll(saved, DAILY_QUEST_POOL)
  };
})()`);
assert(staleLockedBoard.againstFiltered === true,
  'a saved board holding a locked-zone quest is re-rolled');
assert(staleLockedBoard.againstFullPool === false,
  'and validating against the full pool would have kept it — the bug this guards');

const rerollConverges = R(`(function () {
  const flags = { arcade: false, fishing: false, dungeon: false, desk: false, taste: false };
  const open = filterQuestPool(DAILY_QUEST_POOL, flags);
  const effective = open.length ? open : DAILY_QUEST_POOL;
  const board = pickQuestBoard(effective, "daily:new", DAILY_QUEST_COUNT);
  // The re-rolled board must itself be valid, or initQuestState would roll on every call
  // and reset quizStreakToday with it.
  return questBoardNeedsRoll(board, effective) === false
    && board.every(q => !q.need || flags[q.need]);
})()`);
assert(rerollConverges, 'the re-rolled board is stable and free of locked quests');

const englishOnly = R(`DAILY_QUEST_POOL.concat(WEEKLY_QUEST_POOL).every(q =>
  !/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(q.title + q.desc)
)`);
assert(englishOnly, 'quest copy has no Vietnamese');

const cd = R('formatQuestCountdown(5 * 3600 * 1000 + 12 * 60 * 1000)');
assert(cd === '5h 12m', 'countdown formats hours and minutes');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
