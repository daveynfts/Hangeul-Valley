/**
 * test_m1_boundary.js
 * Empirical Verification & Stress Test Harness for Milestone 1:
 * Beehive Farm NPC & Bee Shooting Minigame Mechanics in game.js
 */

const fs = require('fs');
const path = require('path');

const GAME_JS_PATH = path.join(__dirname, '../../game.js');
const gameJsContent = fs.readFileSync(GAME_JS_PATH, 'utf-8');

let totalAssertions = 0;
let passedAssertions = 0;

function assert(condition, message) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('================================================================');
console.log('STARTING EMPIRICAL VERIFICATION FOR MILESTONE 1 (BEE MINIGAME)');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// SUITE 1: Camera Transition & Event Binding Static / AST Analysis
// -----------------------------------------------------------------------------
console.log('--- SUITE 1: Camera Transition & Event Bindings ---');

// 1.1 Check BeeScene class existence and registration
const hasBeeSceneClass = /class\s+BeeScene\s+extends\s+Phaser\.Scene/.test(gameJsContent);
assert(hasBeeSceneClass, 'BeeScene class is defined in game.js');

const isBeeSceneInConfig = /scene:\s*\[[^\]]*BeeScene[^\]]*\]/.test(gameJsContent);
assert(isBeeSceneInConfig, 'BeeScene is registered in Phaser Game config scene array');

// 1.2 FarmScene -> BeeScene Transition
const farmSceneLaunchPattern = /this\.cameras\.main\.fadeOut\(300,\s*0,\s*0,\s*0\);\s*this\.cameras\.main\.once\('camerafadeoutcomplete',\s*\(\)\s*=>\s*\{\s*this\.scene\.pause\(\);\s*this\.scene\.launch\('BeeScene'\);/;
const hasFarmToBeeTransition = farmSceneLaunchPattern.test(gameJsContent.replace(/\s+/g, ' '));
assert(hasFarmToBeeTransition, 'FarmScene correctly fades out camera, pauses FarmScene, and launches BeeScene on camerafadeoutcomplete');

// 1.3 BeeScene -> FarmScene Transition (exitMinigame)
const exitMinigamePattern = /exitMinigame\(\)\s*\{[^}]*this\.cameras\.main\.fadeOut\(300,\s*0,\s*0,\s*0\);[^}]*this\.cameras\.main\.once\('camerafadeoutcomplete',\s*\(\)\s*=>\s*\{[^}]*this\.scene\.stop\(\);[^}]*this\.scene\.resume\('FarmScene'\);/;
const hasBeeToFarmTransition = exitMinigamePattern.test(gameJsContent.replace(/\s+/g, ' '));
assert(hasBeeToFarmTransition, 'exitMinigame correctly fades out camera, stops BeeScene, and resumes FarmScene on camerafadeoutcomplete');

// 1.4 Interactive Exit Event Bindings
const hasExitBtnBinding = /exitBtn\.on\('pointerdown',\s*\(\)\s*=>\s*this\.exitMinigame\(\)\)/.test(gameJsContent);
assert(hasExitBtnBinding, 'Exit button bound to pointerdown event calling exitMinigame()');

const hasEscBinding = /this\.input\.keyboard\.on\('keydown-ESC',\s*\(\)\s*=>\s*this\.exitMinigame\(\)\)/.test(gameJsContent);
assert(hasEscBinding, 'ESC key bound to keydown-ESC event calling exitMinigame()');


// -----------------------------------------------------------------------------
// SUITE 2: 10-Word Round Scoring & Accuracy Simulation
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 2: 10-Word Round Scoring & Accuracy Formula Simulation ---');

class SimulatedBeeScene {
  constructor() {
    this.reset();
  }

  reset() {
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.correctHits = 0;
    this.totalClicks = 0;
    this.currentWordIndex = 0;
    this.isRoundOver = false;
  }

  getAccuracy() {
    return this.totalClicks > 0 ? Math.round((this.correctHits / this.totalClicks) * 100) : 100;
  }

  getHoneyReward() {
    const accuracy = this.getAccuracy();
    const baseHoney = Math.max(1, Math.floor(this.score / 300));
    const bonusHoney = accuracy >= 90 ? 1 : 0;
    return baseHoney + bonusHoney;
  }

  clickBee(isCorrect) {
    if (this.isRoundOver) return;
    this.totalClicks++;

    if (isCorrect) {
      this.correctHits++;
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;

      const comboBonus = (this.combo - 1) * 20;
      const pts = 100 + comboBonus;
      this.score += pts;

      this.currentWordIndex++;
      if (this.currentWordIndex >= 10) {
        this.isRoundOver = true;
      }
    } else {
      this.combo = 0;
    }
  }
}

// 2.1 Initial State (0 clicks)
const scene0 = new SimulatedBeeScene();
const acc0 = scene0.getAccuracy();
assert(!isNaN(acc0), 'Accuracy on 0 clicks is not NaN');
assert(isFinite(acc0), 'Accuracy on 0 clicks is finite (no Division-by-Zero)');
assert(acc0 === 100, 'Accuracy defaults to 100% when totalClicks == 0');
assert(scene0.score === 0, 'Initial score is 0');

// 2.2 10 Consecutive Correct Hits
const scene10 = new SimulatedBeeScene();
for (let i = 0; i < 10; i++) {
  scene10.clickBee(true);
}
assert(scene10.totalClicks === 10, '10 correct hits -> totalClicks = 10');
assert(scene10.correctHits === 10, '10 correct hits -> correctHits = 10');
assert(scene10.maxCombo === 10, '10 correct hits -> maxCombo = 10');
assert(scene10.score === 1900, `10 correct hits -> expected score 1900, got ${scene10.score}`);
assert(scene10.score >= 0, 'Score is non-negative');
assert(scene10.getAccuracy() === 100, '10 correct hits -> accuracy = 100%');
assert(scene10.getHoneyReward() === 7, `10 correct hits -> honey reward expected 7 (6 base + 1 bonus), got ${scene10.getHoneyReward()}`);

// 2.3 5 Misses followed by 5 Correct Hits
const scene55 = new SimulatedBeeScene();
for (let i = 0; i < 5; i++) {
  scene55.clickBee(false); // misses on word 1
}
assert(scene55.score === 0, '5 misses -> score remains 0');
assert(scene55.combo === 0, '5 misses -> combo reset to 0');
assert(scene55.currentWordIndex === 0, '5 misses -> currentWordIndex stays at 0');

for (let i = 0; i < 5; i++) {
  scene55.clickBee(true); // correct hits
}
assert(scene55.totalClicks === 10, '5 miss + 5 correct -> totalClicks = 10');
assert(scene55.correctHits === 5, '5 miss + 5 correct -> correctHits = 5');
assert(scene55.getAccuracy() === 50, '5 miss + 5 correct -> accuracy = 50%');
assert(scene55.score === 700, `5 miss + 5 correct -> expected score 700, got ${scene55.score}`);
assert(scene55.score >= 0, 'Score is non-negative');
assert(scene55.getHoneyReward() === 2, `5 miss + 5 correct -> honey reward expected 2 (2 base + 0 bonus), got ${scene55.getHoneyReward()}`);

// 2.4 Interleaved 5 Correct + 5 Misses
const sceneInterleaved = new SimulatedBeeScene();
for (let i = 0; i < 5; i++) {
  sceneInterleaved.clickBee(true);
  sceneInterleaved.clickBee(false);
}
assert(sceneInterleaved.totalClicks === 10, 'Interleaved -> totalClicks = 10');
assert(sceneInterleaved.correctHits === 5, 'Interleaved -> correctHits = 5');
assert(sceneInterleaved.getAccuracy() === 50, 'Interleaved -> accuracy = 50%');
assert(sceneInterleaved.score === 500, `Interleaved -> expected score 500 (5 x 100, no combo), got ${sceneInterleaved.score}`);
assert(sceneInterleaved.score >= 0, 'Score is non-negative');

// 2.5 10 Consecutive Misses
const scene010 = new SimulatedBeeScene();
for (let i = 0; i < 10; i++) {
  scene010.clickBee(false);
}
assert(scene010.totalClicks === 10, '10 misses -> totalClicks = 10');
assert(scene010.correctHits === 0, '10 misses -> correctHits = 0');
assert(scene010.getAccuracy() === 0, '10 misses -> accuracy = 0%');
assert(scene010.score === 0, '10 misses -> score = 0');
assert(scene010.score >= 0, '10 misses -> score is non-negative');
assert(scene010.getHoneyReward() === 1, `10 misses -> honey reward expected 1 (1 min base + 0 bonus), got ${scene010.getHoneyReward()}`);


// -----------------------------------------------------------------------------
// SUITE 3: Particle Emitter API Variant Safety Verification
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 3: Particle Emitter API Safety Verification ---');

// Inspect how pollen emitter is created and invoked in game.js
const pollenCreationMatch = gameJsContent.match(/if\s*\(this\.textures\.exists\('p_pollen'\)[\s\S]*?catch\s*\(e\)\s*\{\}\s*\}/);
const pollenCreationCode = pollenCreationMatch ? pollenCreationMatch[0] : '';
assert(pollenCreationCode.includes("typeof this.add.particles === 'function'"), 'Pollen emitter checks if add.particles is a function');
assert(pollenCreationCode.includes('try {') && pollenCreationCode.includes('catch'), 'Pollen emitter creation wrapped in try-catch block');

// Check emission safety during click
const clickEmissionCode = gameJsContent.match(/if\s*\(this\.pollenEmitter\)\s*\{\s*this\.pollenEmitter\.emitParticleAt\([^)]+\);\s*\}/);
assert(clickEmissionCode !== null, 'Pollen emission guarded by `if (this.pollenEmitter)`');

// Stress test potential API variations in a simulated runtime environment
function simulateParticleCall(addParticlesFn, emitParticleAtFn) {
  let createdEmitter = null;
  let errorCaughtOnCreate = false;
  let errorCaughtOnEmit = false;

  const mockScene = {
    textures: { exists: (k) => true },
    add: {
      particles: addParticlesFn
    }
  };

  // Creation phase (as in BeeScene.create)
  if (mockScene.textures.exists('p_pollen') && typeof mockScene.add.particles === 'function') {
    try {
      createdEmitter = mockScene.add.particles(0, 0, 'p_pollen', {});
    } catch (e) {
      errorCaughtOnCreate = true;
    }
  }

  // Emission phase (as in BeeScene.onBeeClicked)
  if (createdEmitter) {
    try {
      if (typeof createdEmitter.emitParticleAt === 'function') {
        createdEmitter.emitParticleAt(100, 100, 20);
      } else {
        // Warning case: emitParticleAt does not exist on legacy emitter
        throw new TypeError('emitParticleAt is not a function');
      }
    } catch (e) {
      errorCaughtOnEmit = true;
    }
  }

  return { createdEmitter, errorCaughtOnCreate, errorCaughtOnEmit };
}

// Variant 1: Modern Phaser 3.60+
const v1 = simulateParticleCall(
  (x, y, key, cfg) => ({ setDepth: () => {}, emitParticleAt: (x, y, count) => true }),
  true
);
assert(v1.createdEmitter !== null && !v1.errorCaughtOnCreate && !v1.errorCaughtOnEmit, 'Modern Phaser 3.60+ particle emitter creates and emits safely');

// Variant 2: Add.particles throws error (e.g. missing texture/context)
const v2 = simulateParticleCall(
  () => { throw new Error('WebGL Context Lost'); },
  false
);
assert(v2.createdEmitter === null && v2.errorCaughtOnCreate, 'API failure during add.particles is caught safely via try-catch');

// Variant 3: Legacy Phaser 3 emitter manager without emitParticleAt method
const v3 = simulateParticleCall(
  (x, y, key, cfg) => ({ setDepth: () => {} }), // No emitParticleAt
  false
);
assert(v3.errorCaughtOnEmit, 'Calling missing emitParticleAt on legacy particle object throws error (recommends optional chaining/method check)');


// -----------------------------------------------------------------------------
// SUITE 4: DOM & Overlay Template Generation & Return Button Binding
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 4: Results Summary Template & Return Button Binding ---');

// Simulate showResultsSummary template string output
function generateSummaryText(score, accuracy, maxCombo, totalHoney) {
  return `SCORE: ${score}\n\n` +
         `ACCURACY: ${accuracy}%\n\n` +
         `MAX COMBO: ${maxCombo}x\n\n` +
         `HONEY REWARD: +${totalHoney} 🍯`;
}

const summarySample = generateSummaryText(1900, 100, 10, 7);
assert(summarySample.includes('SCORE: 1900'), 'Summary template contains formatted SCORE');
assert(summarySample.includes('ACCURACY: 100%'), 'Summary template contains formatted ACCURACY');
assert(summarySample.includes('MAX COMBO: 10x'), 'Summary template contains formatted MAX COMBO');
assert(summarySample.includes('HONEY REWARD: +7 🍯'), 'Summary template contains formatted HONEY REWARD');

// Check Return Button text & event binding in game.js code
const hasReturnBtnText = gameJsContent.includes('[ RETURN TO FARM ]');
assert(hasReturnBtnText, 'Summary modal contains "[ RETURN TO FARM ]" button text');

const hasReturnBtnEvent = /closeBtn\.on\('pointerdown',\s*\(\)\s*=>\s*this\.exitMinigame\(\)\)/.test(gameJsContent);
assert(hasReturnBtnEvent, 'Return button on summary overlay binds pointerdown to exitMinigame()');


// -----------------------------------------------------------------------------
// FINAL SUMMARY & VERDICT
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`TOTAL ASSERTIONS: ${totalAssertions}`);
console.log(`PASSED ASSERTIONS: ${passedAssertions}`);
console.log(`FAILED ASSERTIONS: ${totalAssertions - passedAssertions}`);
const verdict = passedAssertions === totalAssertions ? 'PASS' : 'FAIL';
console.log(`VERDICT: ${verdict}`);
console.log('================================================================\n');

process.exit(passedAssertions === totalAssertions ? 0 : 1);
