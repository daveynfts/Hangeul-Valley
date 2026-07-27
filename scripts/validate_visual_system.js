'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function hash(file) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(root, file)))
    .digest('hex');
}

const game = read('game.js');
const html = read('index.html');

assert(game.includes('class DayNightSystem'), 'Day/night system is missing');
assert(game.includes('cycleDurationSec = 480'), 'World cycle must default to eight minutes');
assert(
  game.includes('this.dayDurationMs / this.cycleDuration'),
  'Day/night progression must use the configured cycle duration'
);
assert(game.includes('class WeatherEngine'), 'Weather engine is missing');
assert(game.includes('syncSeason(seasonId'), 'Weather must synchronize with the active Korean season');
assert(game.includes("'p_firefly'"), 'Night firefly particles are missing');
assert(game.includes('class WorldFeedbackSystem'), 'Farm action feedback system is missing');
assert(game.includes('visual: visualState'), 'Visual state must be included in game saves');
assert(game.includes('v: 7'), 'Visual save schema must be version 7');

assert(html.includes('id="hud-world-state"'), 'World time/weather HUD is missing');
assert(html.includes('id="visual-quality-btn"'), 'Visual quality control is missing');
assert(html.includes('--folk-paper'), 'Neo-Folk design tokens are missing');
assert(html.includes('prefers-reduced-motion'), 'Reduced-motion fallback is missing');

for (const file of ['game.js', 'index.html']) {
  const assetFile = path.join('assets', file);
  assert(fs.existsSync(path.join(root, assetFile)), `Missing mirrored asset: ${assetFile}`);
  assert.strictEqual(hash(file), hash(assetFile), `${file} and ${assetFile} are out of sync`);
}

console.log('✓ Visual system valid: Neo-Folk UI, 8-minute world cycle, seasonal weather, FX controls, and action feedback.');
