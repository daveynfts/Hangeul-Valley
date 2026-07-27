'use strict';

const assert = require('assert');
const world = require('./world-learning.js');

assert.strictEqual(world.version, 1, 'Unexpected world learning version');
assert(world.missions.length >= 10, 'Expected missions across the complete world');
assert(Object.keys(world.zones).length >= 10, 'Expected all world learning zones');

const missionIds = new Set();
const turnIds = new Set();
const modes = new Set();
world.missions.forEach(mission => {
  assert(!missionIds.has(mission.id), `Duplicate mission id: ${mission.id}`);
  missionIds.add(mission.id);
  assert(world.zones[mission.zone], `Unknown mission zone: ${mission.zone}`);
  assert(mission.canDoId && mission.npc?.id, `${mission.id} needs Can-do and NPC metadata`);
  assert(Array.isArray(mission.turns) && mission.turns.length >= 2, `${mission.id} needs multiple turns`);
  mission.turns.forEach(turn => {
    assert(!turnIds.has(turn.id), `Duplicate turn id: ${turn.id}`);
    turnIds.add(turn.id);
    modes.add(turn.mode);
    assert(Array.isArray(turn.acceptedAnswers) && turn.acceptedAnswers.length, `${turn.id} needs accepted answers`);
    assert(turn.modality, `${turn.id} needs a learning modality`);
  });
});
['choice', 'reorder', 'typing', 'dictation', 'speaking'].forEach(mode => {
  assert(modes.has(mode), `Missing productive task mode: ${mode}`);
});

const market = world.getMission('market-shopping-day');
const orderTurn = market.turns[0];
assert(world.evaluateAnswer('당근 두 개 주세요.', orderTurn).correct, 'Punctuation should be normalized');
assert(world.evaluateAnswer('당근을 두 개 주세요', orderTurn).correct, 'Approved answer variants must pass');
const casual = world.evaluateAnswer('당근 두 개 줘', orderTurn);
assert(!casual.correct && casual.communicativeSuccess, 'Casual register should trigger repair');
assert(casual.errors.includes('register_too_casual'), 'Register error tag is missing');
assert.strictEqual(world.evaluateAnswer('사과 주세요', orderTurn).status, 'incorrect', 'Wrong meaning should fail');

const state = world.freshState();
world.beginMission(state, market.id, 1_000);
market.turns.forEach((turn, index) => {
  const result = world.evaluateAnswer(turn.acceptedAnswers[0], turn);
  world.recordTurnResult(state, market, turn, result, { at:2_000 + index, hints:0 });
});
const canDo = world.getCanDoRecord(state, market.canDoId);
assert(canDo.achieved, 'Three successful multimodal turns should achieve the Can-do');
assert(canDo.mastery >= 70, 'Can-do mastery should reflect productive evidence');

const completion = world.completeMission(state, market.id, 96, 5_000);
assert(completion.firstCompletion, 'First mission completion should be detected');
assert(state.completedMissions.includes(market.id), 'Mission completion must persist');
assert.strictEqual(state.npcRelationships.market_vendor.trust, market.reward.trust, 'NPC trust reward mismatch');

const failedTurn = market.turns[1];
const failed = world.evaluateAnswer('몰라요', failedTurn);
world.recordTurnResult(state, market, failedTurn, failed, { at:10_000, hints:1 });
const weakReviews = world.getReviewItems(state, { now:10_001, includeWeak:true });
assert(weakReviews.some(item => item.turnId === failedTurn.id), 'Failed turns should enter Review Garden');

const delayedSuccess = world.evaluateAnswer(failedTurn.acceptedAnswers[0], failedTurn);
world.recordTurnResult(state, market, failedTurn, delayedSuccess, {
  at:10_000 + 21 * 60 * 60 * 1000,
  hints:0
});
assert(world.getCanDoRecord(state, market.canDoId).certified, 'Delayed success should certify an achieved Can-do');

const restored = world.migrateState(JSON.parse(JSON.stringify(state)));
assert.deepStrictEqual(restored.completedMissions, state.completedMissions, 'State migration lost mission completion');
assert.strictEqual(world.getSummary(restored).missionsCompleted, 1, 'Summary mission count mismatch');

console.log(
  `✓ World Learning: ${world.missions.length} missions, ${turnIds.size} turns, ` +
  `${modes.size} task modes, evaluator/Can-do/review/relationship tests passed.`
);
