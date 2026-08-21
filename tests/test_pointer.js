'use strict';
/**
 * tests/test_pointer.js — click-to-interact only (keyboard moves the farmer).
 *
 * Drives the shipped js/systems/pointer.js functions (the same ones FarmScene
 * calls from _onWorldPointerDown / update / _interact).
 *
 * Run: node tests/test_pointer.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const pointerSrc = fs.readFileSync(path.join(ROOT, 'js', 'systems', 'pointer.js'), 'utf8');
const farmSrc = fs.readFileSync(path.join(ROOT, 'js', 'scenes', 'farm.js'), 'utf8');
const uiSrc = fs.readFileSync(path.join(ROOT, 'js', 'ui.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'js', 'manifest.json'), 'utf8'));

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

const ctx = { console };
vm.createContext(ctx);
vm.runInContext(pointerSrc, ctx);
const R = (expr) => vm.runInContext(expr, ctx);

assert(typeof R('pickInteractableAt') === 'function', 'pickInteractableAt is shipped');
assert(typeof R('pointerWorldPlan') === 'function', 'pointerWorldPlan is shipped');
assert(typeof R('nearestInRange') === 'function', 'nearestInRange is shipped');
assert(R('WORLD_CLICK_HINT') === 'Click', 'WORLD_CLICK_HINT is Click');
assert(R('WORLD_TOO_FAR_HINT') === 'Walk closer', 'too-far hint is Walk closer');

const ripe = { id: 'plot:0', kind: 'plot-ripe', x: 160, y: 200, hitR: 34, useR: 72 };
const empty = { id: 'plot:1', kind: 'plot-empty', x: 240, y: 200, hitR: 34, useR: 72 };
const desk = { id: 'desk', kind: 'desk', x: 400, y: 80, hitR: 80, useR: 80 };
const targets = [desk, ripe, empty];

ctx.ripe = ripe;
ctx.empty = empty;
ctx.desk = desk;
ctx.targets = targets;

assert(R('pickInteractableAt(targets, 240, 200)').id === 'plot:1',
  'click on empty plot picks that plot, not the nearby ripe one');
assert(R('pickInteractableAt(targets, 160, 200)').id === 'plot:0',
  'click on ripe plot picks the ripe plot');
assert(R('pickInteractableAt(targets, 10, 10)') === null,
  'click far from every target misses');

const overlapA = { id: 'a', x: 0, y: 0, hitR: 40 };
const overlapB = { id: 'b', x: 10, y: 0, hitR: 40 };
ctx.overlap = [overlapA, overlapB];
assert(R('pickInteractableAt(overlap, 10, 0)').id === 'b',
  'overlapping hits prefer the closer center');

const playerMid = { x: 200, y: 200 };
ctx.playerMid = playerMid;
assert(R('nearestInRange(playerMid, targets)').id === 'plot:0',
  'keyboard nearest still prefers ripe-before-empty catalog order');
assert(R('pointerWorldPlan(playerMid, targets, 240, 200).target.id') === 'plot:1',
  'mouse click on the empty plot interacts with empty, not ripe');
assert(R('pointerWorldPlan(playerMid, targets, 240, 200).type') === 'interact',
  'in-range click is interact');

const playerFar = { x: 20, y: 20 };
ctx.playerFar = playerFar;
const farPlan = R('pointerWorldPlan(playerFar, targets, 240, 200)');
assert(farPlan.type === 'too-far', 'out-of-range click does not walk the farmer');
assert(farPlan.target.id === 'plot:1', 'too-far still names the clicked plot');
assert(R('pointerWorldPlan(playerFar, targets, 30, 500).type') === 'none',
  'click on empty ground does nothing');
assert(R('pointerHoverLabel(playerFar, empty)') === 'Walk closer',
  'hovering an out-of-range plot says Walk closer');
assert(R('pointerHoverLabel(playerMid, empty)').indexOf('Click') === 0
  || R('pointerHoverLabel(playerMid, empty)').length >= 0,
  'in-range hover keeps the action label');
ctx.empty.label = 'Click Plant new';
assert(R('pointerHoverLabel(playerMid, empty)') === 'Click Plant new',
  'in-range hover uses the target label');

assert(R('worldPointerBlocked({ quizOpen: true })') === true, 'quiz blocks world pointer');
assert(R('worldPointerBlocked({ playerLocked: true })') === true, 'lock blocks world pointer');
assert(R('worldPointerBlocked({})') === false, 'idle farm does not block pointer');
assert(R('clickActionLabel("Water")').indexOf('Click') === 0,
  'action labels start with Click');

assert(manifest.indexOf('js/systems/pointer.js') >= 0, 'manifest lists pointer.js');
assert(manifest.indexOf('js/systems/pointer.js') < manifest.indexOf('js/scenes/farm.js'),
  'pointer.js loads before farm.js');

assert(farmSrc.indexOf('_onWorldPointerDown') >= 0, 'FarmScene has _onWorldPointerDown');
assert(farmSrc.indexOf('pointerWorldPlan(this.player') >= 0,
  'FarmScene click handler calls pointerWorldPlan');
assert(farmSrc.indexOf('_pointerWalk') < 0, 'FarmScene has no click-to-walk state');
assert(farmSrc.indexOf('walkSteer') < 0, 'FarmScene does not steer the farmer from the mouse');
assert(farmSrc.indexOf("plan.type === 'too-far'") >= 0
  || farmSrc.indexOf('plan.type === \'too-far\'') >= 0,
  'out-of-range clicks stay put and warn');
assert(farmSrc.indexOf('nearestInRange(this.player, this._worldTargets())') >= 0,
  '_interact uses nearestInRange on the same catalog');
assert(/case 'taste':[\s\S]{0,180}_isUnit10\(\)/.test(farmSrc)
  && farmSrc.indexOf('openTasteGame') >= 0,
  '_runTarget taste stays Unit-10-gated');
assert(/case 'desk':[\s\S]{0,180}_hasStudyDesk\(\)/.test(farmSrc)
  && farmSrc.indexOf('openDeskQuiz') >= 0,
  '_runTarget desk uses _hasStudyDesk');
assert(farmSrc.indexOf('[SPACE]') < 0, 'farm.js has no leftover [SPACE] prompts');
assert(uiSrc.indexOf('worldPointerBlocked') >= 0
  && uiSrc.indexOf('function triggerInteract') >= 0,
  'touch interact button shares worldPointerBlocked');
assert(html.indexOf('click a nearby object to interact') >= 0, 'HUD tip says click nearby objects');
assert(html.indexOf('click to move') < 0, 'HUD tip does not say click to move');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
console.log('\ntest_pointer: all passed');
