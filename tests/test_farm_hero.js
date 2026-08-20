/**
 * tests/test_farm_hero.js — farm HD farmer contract (feet, origin, idle facing,
 * cache-bust URLs, minigame matrix, no negative walk scale).
 *
 * Helpers are extracted from js/* and run in a bare vm, same pattern as
 * test_srs_engine.js.
 *
 * Run:  node tests/test_farm_hero.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { readGameSource } = require('../scripts/gameSource');

const ROOT = path.join(__dirname, '..');
const src = readGameSource();
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'sprites', 'catalog.json'), 'utf8'));

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log(`  [PASS] ${msg}`); passed++; }
  else { console.error(`  [FAIL] ${msg}`); failed++; }
}

function extract(startMarker, endMarker, label) {
  const a = src.indexOf(startMarker);
  if (a < 0) throw new Error('could not find ' + label + ' start: ' + startMarker);
  const b = src.indexOf(endMarker, a);
  if (b < 0) throw new Error('could not find ' + label + ' end: ' + endMarker);
  return src.slice(a, b);
}

const artHelpers = extract(
  'const ART_DIR = \'sprites/\';',
  'const ART_LOAD =',
  'artUrl'
);
const heroHelpers = extract(
  'const SKIN_DEFAULT_ID =',
  '// ═══════════════ PHASER SCENE',
  'farm hero helpers'
);

const ctx = {
  Phaser: { Textures: { FilterMode: { NEAREST: 1 } } },
  console,
  equippedSkinId: 'farmer',
  ownedSkinIds: ['farmer'],
  debugSkinOverride: null,
  sceneRef: null,
  persistSave: function () {},
  currentLesson: function () { return null; }
};
vm.createContext(ctx);
vm.runInContext(artHelpers + '\n' + heroHelpers, ctx);
const R = (expr) => vm.runInContext(expr, ctx);

function mockSprite(init) {
  init = init || {};
  const s = {
    x: init.x != null ? init.x : 400,
    y: init.y != null ? init.y : 500,
    originX: init.originX != null ? init.originX : 0.5,
    originY: init.originY != null ? init.originY : 0.5,
    scaleX: init.scaleX != null ? init.scaleX : 1,
    scaleY: init.scaleY != null ? init.scaleY : 1,
    flipX: false,
    textureKey: init.textureKey || 'player_walk_down_0',
    frame: { width: init.fw || 48, height: init.fh || 48 },
    body: init.body === false ? null : {
      w: 24, h: 16, ox: 12, oy: 32,
      setSize: function (w, h) { this.w = w; this.h = h; return this; },
      setOffset: function (x, y) { this.ox = x; this.oy = y; return this; }
    },
    anims: { stop: function () {} },
    setTexture: function (k) { this.textureKey = k; return this; },
    setFlipX: function (v) { this.flipX = !!v; return this; },
    setOrigin: function (x, y) { this.originX = x; this.originY = y; return this; },
    setScale: function (x, y) { this.scaleX = x; this.scaleY = y == null ? x : y; return this; }
  };
  Object.defineProperty(s, 'displayHeight', {
    get: function () { return this.frame.height * this.scaleY; }
  });
  return s;
}

function mockScene(hd, facing) {
  const keys = {};
  if (hd) keys.farmer_walk_down_0 = true;
  return {
    playerFacing: facing || 'down',
    textures: {
      exists: function (k) { return !!keys[k]; },
      get: function () { return { setFilter: function () {} }; }
    },
    anims: {
      exists: function () { return true; },
      create: function () {}
    }
  };
}

console.log('====================================================');
console.log('FARM HERO CONTRACT');
console.log('====================================================');

console.log('\n--- 1. Spawn math ---');
assert(R('MATRIX_SRC') === 48, 'matrix source is 48 px');
assert(R('MATRIX_FARM_SCALE') === 1.8, 'matrix farm scale is 1.8');
assert(R('FARM_SPAWN_CENTER_Y_OFFSET') === 80, 'spawn center offset is 80');
const feet720 = R('farmFeetYFromSpawn(720)');
assert(feet720 === 720 - 80 + (48 * 1.8) / 2, 'farmFeetYFromSpawn(720) is H-80 plus half matrix display height');

console.log('\n--- 2. playerFeetY / lanternChestOffset ---');
{
  const centered = { y: 500, displayHeight: 86.4, originY: 0.5 };
  ctx._s = centered;
  assert(R('playerFeetY(_s)') === 500 + 86.4 * 0.5, 'center origin: feet at y + half height');
  const feetOrigin = { y: 500, displayHeight: 80, originY: 1 };
  ctx._s = feetOrigin;
  assert(R('playerFeetY(_s)') === 500, 'feet origin: feet at sprite.y');
  ctx._s = { displayHeight: 80, originY: 1 };
  assert(R('lanternChestOffset(_s)') < 0, 'HD origin (0.5,1) lantern offset is above the feet');
  ctx._s = { displayHeight: 80, originY: 0.5 };
  const off = R('lanternChestOffset(_s)');
  assert(Math.abs(off) < 0.1 * 80, 'matrix origin (0.5,0.5) lantern offset is near 0 relative to height');
}

console.log('\n--- 3. artUrl cache-bust ---');
assert(R('ART_CACHE_KEY') === catalog.cacheKey, 'ART_CACHE_KEY matches sprites/catalog.json cacheKey');
assert(src.indexOf("wildflower_rose_red_hd") >= 0, 'ART_LOAD includes ground wildflower HD');
assert(src.indexOf("cabbage_white_butterfly_open_hd") >= 0, 'ART_LOAD includes butterfly HD');
assert(src.indexOf('decorations/wildflower_rose_red.png') >= 0, 'wildflower PNG path is in the source');
assert(src.indexOf('decorations/cabbage_white_butterfly_open.png') >= 0, 'butterfly PNG path is in the source');
assert(R('artUrl("furniture/oak_study_desk.png")') === 'sprites/furniture/oak_study_desk.png?v=' + encodeURIComponent(catalog.cacheKey),
  'artUrl appends ?v=cacheKey');
assert(src.indexOf('artUrl(a.file)') >= 0, 'FarmScene.preload loads ART_LOAD through artUrl');
assert(src.indexOf('this.load.image(a.key, ART_DIR + a.file)') < 0, 'preload does not load ART_LOAD without a cache token');

console.log('\n--- 4. applyFarmHeroContract HD, preserveFeet ---');
{
  const scene = mockScene(true, 'left');
  ctx._scene = scene;
  const sprite = mockSprite({ y: 500, originY: 0.5, scaleX: 1.8, scaleY: 1.8, fw: 56, fh: 80 });
  const feetBefore = 500 + sprite.displayHeight * (1 - sprite.originY);
  ctx._spr = sprite;
  R('applyFarmHeroContract(_scene, _spr, { preserveFeet: true })');
  assert(sprite.originY === 1, 'HD originY is 1 (feet)');
  assert(sprite.scaleX === 1 && sprite.scaleY === 1, 'HD scale is +1 / +1');
  assert(sprite.flipX === false, 'HD does not flipX');
  assert(sprite.textureKey === 'farmer_walk_left_0', 'HD idle/contact uses last facing');
  assert(sprite.y === feetBefore, 'preserveFeet keeps feetY across origin change');
  assert(sprite.body.h === 12, 'HD body height is 12');
  assert(sprite.body.oy === 80 - 12, 'HD body offset sits on the last rows');
}

console.log('\n--- 5. applyFarmHeroContract matrix fallback ---');
{
  const scene = mockScene(false, 'up');
  ctx._scene = scene;
  const sprite = mockSprite({ y: 600, originY: 1, fw: 48, fh: 48, scaleX: 1, scaleY: 1 });
  const feetBefore = 600;
  ctx._spr = sprite;
  R('applyFarmHeroContract(_scene, _spr, { preserveFeet: true })');
  assert(sprite.originY === 0.5, 'matrix originY is 0.5');
  assert(sprite.scaleX === 1.8 && sprite.scaleY === 1.8, 'matrix farm scale is 1.8');
  assert(sprite.textureKey === 'player_walk_up_0', 'matrix uses facing, not always-down');
  const expectedY = feetBefore - sprite.displayHeight * 0.5;
  assert(Math.abs(sprite.y - expectedY) < 0.001, 'matrix preserveFeet rewrites y so feet stay put');
  assert(sprite.body.w === 24 && sprite.body.h === 16, 'matrix body is 24x16');
}

console.log('\n--- 6. First spawn does not preserveFeet ---');
{
  const scene = mockScene(true, 'down');
  ctx._scene = scene;
  const sprite = mockSprite({ y: 999, originY: 0.5, fw: 56, fh: 80 });
  ctx._spr = sprite;
  R('applyFarmHeroContract(_scene, _spr, { preserveFeet: false })');
  assert(sprite.y === 999, 'omit preserveFeet leaves y for _createPlayer to set');
}

console.log('\n--- 7. Minigames stay on matrix 48 px ---');
assert(R('minigamePlayerTextureKey("left", 2)') === 'player_walk_left_2', 'minigame key is matrixPrefix');
assert(R('minigamePlayerTextureKey()') === 'player_walk_down_0', 'minigame default is walk down 0');
{
  const hdScene = mockScene(true, 'down');
  ctx._scene = hdScene;
  assert(R('minigamePlayerTextureKey("down", 0)') === 'player_walk_down_0',
    'minigame key ignores cached HD farmer_walk_*');
}
assert(src.indexOf('class DungeonScene') >= 0 && src.indexOf('minigamePlayerTextureKey') >= 0,
  'minigamePlayerTextureKey is in shipped source');
const dungeonStart = src.indexOf('class DungeonScene');
const fishingStart = src.indexOf('class FishingScene');
const beeStart = src.indexOf('class BeeScene');
assert(dungeonStart > 0 && fishingStart > dungeonStart, 'DungeonScene / FishingScene found');
const dungeon = src.slice(dungeonStart, fishingStart);
const fishing = src.slice(fishingStart, beeStart > fishingStart ? beeStart : src.length);
assert(dungeon.indexOf('minigamePlayerTextureKey') >= 0, 'DungeonScene spawns through minigamePlayerTextureKey');
assert(fishing.indexOf('minigamePlayerTextureKey') >= 0, 'FishingScene spawns through minigamePlayerTextureKey');
assert(dungeon.indexOf('farmer_walk_') < 0, 'DungeonScene does not reference HD farmer keys');
assert(fishing.indexOf('farmer_walk_') < 0, 'FishingScene does not reference HD farmer keys');

console.log('\n--- 8. Walk / idle source contracts ---');
assert(src.indexOf('setScale(vx < 0') < 0, 'walk no longer uses negative scale for left');
assert(src.indexOf("skinTextureKey(this, 'walk', idleDir, 0, 'farm')") >= 0, 'farm idle uses last facing via skinTextureKey');
assert(src.indexOf('function artUrl') >= 0, 'artUrl helper exists');

console.log('\n--- 9. Chef is a catalog costume, not a farm if ---');
assert(src.indexOf('chef_walk_down_0') >= 0, 'chef matrix textures still generated');
assert(src.indexOf('_unit10Skin') < 0, '_unit10Skin is gone');
assert(src.indexOf('farmCostumeSkinId') >= 0, 'farmCostumeSkinId is the Unit 10 overlay');
assert(src.indexOf("if (!skinUsesHd(scene, def, 'farm')) return null;") >= 0,
  'matrix chef does not overlay the HD farmer');

console.log('\n--- 10. Stardew contact shadows ---');
assert(src.indexOf('_penumbra') < 0, 'no sun-stretched penumbra layer');
assert(src.indexOf("container._type = 'contact'") >= 0, 'shadows are a single contact blob');
const drawAt = src.indexOf('this._drawWorld(W, H)');
const shadowAt = src.indexOf('this.shadows = new DynamicShadowSystem(this)');
assert(shadowAt > 0 && drawAt > 0 && shadowAt < drawAt, 'shadow system is created before _drawWorld');
assert(src.indexOf('this.shadows.createShadow(fl,') >= 0, 'wildflowers get a contact shadow');

console.log(`\n====================================================`);
console.log(`RESULT: ${passed} passed, ${failed} failed`);
console.log(`====================================================`);
process.exit(failed ? 1 : 0);
