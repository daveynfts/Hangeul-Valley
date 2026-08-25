'use strict';
/**
 * tests/test_world_packs.js — per-unit maps as world packs.
 * Drives the shipped WORLD_PACKS / currentWorldPack / artLoadForWorldPack
 * functions from js/systems/economy.js and checks FarmScene applyWorld wiring.
 *
 * Run: node tests/test_world_packs.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const econ = fs.readFileSync(path.join(ROOT, 'js', 'systems', 'economy.js'), 'utf8');
const farm = fs.readFileSync(path.join(ROOT, 'js', 'scenes', 'farm.js'), 'utf8');
const unit10 = JSON.parse(fs.readFileSync(path.join(ROOT, 'worlds', '2b-unit-10.json'), 'utf8'));
const unit11 = JSON.parse(fs.readFileSync(path.join(ROOT, 'worlds', '2b-unit-11.json'), 'utf8'));
const unit14 = JSON.parse(fs.readFileSync(path.join(ROOT, 'worlds', '2b-unit-14.json'), 'utf8'));
const topik2 = JSON.parse(fs.readFileSync(path.join(ROOT, 'worlds', 'topik-2.json'), 'utf8'));

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

const start = econ.indexOf('const VALLEY_EXTRA_IDS');
const end = econ.indexOf('const TEXTBOOK_WORLD_FILES');
assert(start >= 0 && end > start, 'world pack helpers are in economy.js');

const ctx = {
  console,
  levelsData: [
    { nameEn: 'Daily Life' },
    { worldId: '2b-unit-10', map: unit10.level.map },
    { worldId: '2b-unit-14', map: unit14.level.map },
    { worldId: '2b-unit-11', map: unit11.level.map },
    { worldId: 'topik-2', map: topik2.level.map }
  ],
  currentLevelIndex: 0
};
ctx.currentLesson = function () { return ctx.levelsData[ctx.currentLevelIndex] || null; };
vm.createContext(ctx);
vm.runInContext(econ.slice(start, end), ctx);
const R = (expr) => vm.runInContext(expr, ctx);

assert(R('WORLD_PACKS.valley.extras').indexOf('shop') >= 0, 'valley pack includes shop');
assert(R('WORLD_PACKS.valley.extras').indexOf('fishing') >= 0, 'valley pack includes fishing pond');
assert(R('WORLD_PACKS.valley.extras').indexOf('wizard') < 0, 'valley pack has no duel wizard');
assert(R('WORLD_PACKS.valley.stations').length === 0, 'valley pack has no textbook stations');
assert(R("WORLD_PACKS['2b-unit-10'].stations").join(',') === 'desk,kitchen,taste,cassette',
  'unit 10 pack is desk+kitchen+taste+cassette');
assert(R("WORLD_PACKS['2b-unit-10'].extras").length === 0, 'unit 10 pack has no valley extras');
// Desk only until Unit 14's own tracks were cut; the deck joined it when tracks 42-51
// landed, so it is now the same pack shape as Units 11 and 13.
assert(R("WORLD_PACKS['2b-unit-14'].stations").join(',') === 'desk,cassette',
  'unit 14 pack is desk plus cassette');
assert(R("WORLD_PACKS['2b-unit-14'].stations").indexOf('kitchen') < 0,
  'unit 14 pack has no kitchen');
assert(R("WORLD_PACKS['2b-unit-11'].stations").join(',') === 'desk,cassette',
  'unit 11 pack is desk plus cassette');
assert(R("WORLD_PACKS['2b-unit-11'].extras").length === 0, 'unit 11 pack has no valley extras');
// The exam world is a farm and a desk and nothing else — no tape, because there is no exam
// audio yet, and no 퀴즈, because it has no quiz bank of its own.
assert(R("WORLD_PACKS['topik-2'].stations").join(',') === 'desk',
  'topik-2 pack is the study desk alone');
assert(R("WORLD_PACKS['topik-2'].extras").length === 0, 'topik-2 pack has no valley extras');

ctx.currentLevelIndex = 0;
assert(R('currentWorldPack().id') === 'valley', 'plain levels resolve to valley');
ctx.currentLevelIndex = 1;
assert(R('currentWorldPack().id') === '2b-unit-10', 'unit 10 lesson resolves to unit 10 pack');
assert(R("worldPackHas(null, 'station', 'kitchen')") === true, 'unit 10 has kitchen');
assert(R("worldPackHas(null, 'station', 'cassette')") === true, 'unit 10 has the cassette player');
assert(R("worldPackHas(null, 'extra', 'shop')") === false, 'unit 10 has no shop extra');
ctx.currentLevelIndex = 2;
assert(R('currentWorldPack().id') === '2b-unit-14', 'unit 14 lesson resolves to unit 14 pack');
assert(R("worldPackHas(null, 'station', 'desk')") === true, 'unit 14 has desk');
assert(R("worldPackHas(null, 'station', 'taste')") === false, 'unit 14 has no taste stall');
ctx.currentLevelIndex = 3;
assert(R('currentWorldPack().id') === '2b-unit-11', 'unit 11 lesson resolves to unit 11 pack');
assert(R("worldPackHas(null, 'station', 'desk')") === true, 'unit 11 has desk');
assert(R("worldPackHas(null, 'station', 'kitchen')") === false, 'unit 11 has no kitchen');
assert(R("worldPackHas(null, 'extra', 'shop')") === false, 'unit 11 has no shop extra');

const u10art = R("artLoadForWorldPack('2b-unit-10')");
assert(u10art.some(a => a.key === 'unit10_kitchen_hd'), 'unit 10 art loads kitchen');
assert(u10art.some(a => a.key === 'study_desk_hd'), 'unit 10 art loads desk');
const u11art = R("artLoadForWorldPack('2b-unit-11')");
assert(u11art.some(a => a.key === 'study_desk_hd'), 'unit 11 art loads desk');
assert(u11art.length === 1, 'unit 11 loads the desk and nothing else');
const u14art = R("artLoadForWorldPack('2b-unit-14')");
assert(u14art.some(a => a.key === 'study_desk_hd'), 'unit 14 art loads desk');
assert(!u14art.some(a => a.key === 'unit10_kitchen_hd'), 'unit 14 does not load kitchen art');
assert(R("artLoadForWorldPack('valley')").length === 0, 'valley boot does not pull unit station art');

// These three pin the world JSON, which is what currentWorldPack() actually reads —
// WORLD_PACKS is only the fallback for a world whose JSON declares no map. Pinning both
// sides is the point, and it is worth saying why in the strongest terms available: Unit 14's
// cassette player shipped invisible because the pack gained 'cassette' while the JSON below
// still said ['desk'], and this assertion passed the whole time because it was faithfully
// asserting the broken state. A literal list on each side is not enough on its own — see the
// '<unit> lists the same stations in its world JSON as in WORLD_PACKS' check in
// validate_content.js, which compares the two rather than trusting either.
assert(JSON.stringify(unit10.level.map.stations) === JSON.stringify(['desk', 'kitchen', 'taste', 'cassette']),
  'unit 10 JSON map matches the runtime pack');
assert(JSON.stringify(unit14.level.map.stations) === JSON.stringify(['desk', 'cassette']),
  'unit 14 JSON map matches the runtime pack');
assert(JSON.stringify(unit11.level.map.stations) === JSON.stringify(['desk', 'cassette']),
  'unit 11 JSON map matches the runtime pack');
assert(JSON.stringify(topik2.level.map.stations) === JSON.stringify(['desk']),
  'topik-2 JSON map matches the runtime pack');

assert(farm.indexOf('applyWorld') >= 0, 'FarmScene has applyWorld');
assert(farm.indexOf('_teardownExtra') >= 0, 'FarmScene tears extras down');
assert(farm.indexOf('_ensureExtra') >= 0, 'FarmScene spawns extras from the pack');
assert(/if \(this\._hasStudyDesk\(\)\) this\._ensureStudyDesk\(\)/.test(farm),
  'desk still spawns through _hasStudyDesk');
assert(!/this\._createShopNPC\(W, H\);\s*this\._createBoardNPC/.test(farm),
  'create() no longer always spawns every valley extra');
assert(!/syncUnit10World\(\)\{[\s\S]{0,500}_setMinigameSpritesVisible/.test(farm),
  'switching units does not hide leftover sprites');
assert(farm.indexOf('artLoadForWorldPack') >= 0, 'farm lazy-loads pack art');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
console.log('\ntest_world_packs: all passed');
