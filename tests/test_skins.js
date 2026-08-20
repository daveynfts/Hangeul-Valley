/**
 * tests/test_skins.js — catalog helpers, save sanitise, farm costume vs
 * minigame equipped, HD/matrix key split, serialized load queue.
 *
 * Run:  node tests/test_skins.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { readGameSource } = require('../scripts/gameSource');

const ROOT = path.join(__dirname, '..');
const src = readGameSource();
const liveCatalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'skins', 'catalog.json'), 'utf8'));

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
const skinHelpers = extract(
  'const SKIN_DEFAULT_ID =',
  '// ═══════════════ PHASER SCENE',
  'skin helpers'
);

function makeCtx() {
  const ctx = {
    Phaser: { Textures: { FilterMode: { NEAREST: 1 } } },
    console,
    equippedSkinId: 'farmer',
    ownedSkinIds: ['farmer'],
    debugSkinOverride: null,
    sceneRef: null,
    persistSave: function () { ctx._persisted = (ctx._persisted || 0) + 1; },
    currentLesson: function () { return ctx._lesson || null; }
  };
  vm.createContext(ctx);
  vm.runInContext(artHelpers + '\n' + skinHelpers, ctx);
  return ctx;
}
function R(ctx, expr) { return vm.runInContext(expr, ctx); }

function mockScene(opts) {
  opts = opts || {};
  const keys = Object.assign({}, opts.textures || {});
  const anims = {};
  const shadows = [];
  const images = [];
  let loading = false;
  const completes = [];
  const scene = {
    playerFacing: opts.facing || 'down',
    sys: { settings: { key: opts.key || 'FarmScene' } },
    cache: {
      json: {
        exists: function (k) { return k === 'skin-catalog' && !!opts.catalog; },
        get: function () { return opts.catalog || null; }
      }
    },
    textures: {
      exists: function (k) { return !!keys[k]; },
      get: function () { return { setFilter: function () {} }; }
    },
    anims: {
      exists: function (k) { return !!anims[k]; },
      create: function (cfg) { anims[cfg.key] = cfg; }
    },
    shadows: {
      shadows: shadows,
      createShadow: function (target, w, h, oy) {
        const sh = { target: target, w: w, h: h, oy: oy, destroy: function () { this.dead = true; } };
        shadows.push(sh);
        return sh;
      }
    },
    load: {
      isLoading: function () { return loading; },
      image: function (k, url) { images.push({ key: k, url: url }); },
      once: function (ev, fn) { if (ev === 'complete') completes.push(fn); },
      start: function () { loading = true; }
    },
    _keys: keys,
    _anims: anims,
    _images: images,
    _completes: completes,
    _finishLoad: function () {
      loading = false;
      const fns = completes.splice(0, completes.length);
      fns.forEach(function (fn) { fn(); });
    }
  };
  return scene;
}

function mockSprite() {
  const s = {
    x: 400, y: 500, originX: 0.5, originY: 0.5, scaleX: 1, scaleY: 1, flipX: false,
    textureKey: 'player_walk_down_0',
    frame: { width: 56, height: 80 },
    body: {
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
  Object.defineProperty(s, 'displayHeight', { get: function () { return this.frame.height * this.scaleY; } });
  return s;
}

console.log('====================================================');
console.log('SKIN RUNTIME');
console.log('====================================================');

console.log('\n--- 1. Catalog helpers ---');
{
  const ctx = makeCtx();
  assert(R(ctx, 'getSkinDef("farmer")').id === 'farmer', 'getSkinDef finds farmer on DEFAULT');
  assert(R(ctx, 'getSkinDef("hanbok")') === undefined, 'getSkinDef is strict for unknown ids');
  assert(R(ctx, 'getSkinDefOrDefault("hanbok")').id === 'farmer', 'getSkinDefOrDefault falls back to farmer');
  assert(R(ctx, 'getSkinDef("farmer")').art === 'hd', 'DEFAULT farmer is the HD valley farmer');
  assert((R(ctx, 'getSkinDef("farmer")').files || []).indexOf('walk_down_0.png') >= 0,
    'DEFAULT farmer lists HD walk files');
  assert(R(ctx, 'getSkinDef("chef")').matrixPrefix === 'chef', 'DEFAULT chef matrixPrefix is chef');
}

console.log('\n--- 2. Owned but catalog-unknown stays equipped ---');
{
  const ctx = makeCtx();
  ctx.equippedSkinId = 'hanbok';
  ctx.ownedSkinIds = ['farmer', 'hanbok'];
  R(ctx, 'sanitizeSkinState()');
  assert(ctx.equippedSkinId === 'hanbok', 'sanitize keeps owned unknown equipped id');
  const farm = mockScene({ key: 'FarmScene', textures: { farmer_walk_down_0: true, player_walk_down_0: true } });
  ctx.sceneRef = farm;
  ctx._scene = farm;
  assert(R(ctx, 'activeSkinId(_scene)') === 'farmer', 'draw falls back to farmer while catalog is DEFAULT');
  const live = JSON.parse(JSON.stringify(liveCatalog));
  live.skins.push({
    id: 'hanbok', nameEn: 'Hanbok', art: 'matrix', matrixPrefix: 'player', files: [],
    unlock: { type: 'shop' }
  });
  farm.cache.json.exists = function (k) { return k === 'skin-catalog'; };
  farm.cache.json.get = function () { return live; };
  assert(R(ctx, 'activeSkinId(_scene)') === 'hanbok', 'injecting the catalog switches without a re-grant');
  assert(ctx.ownedSkinIds.indexOf('hanbok') >= 0, 'ownedSkinIds still lists hanbok');
}

console.log('\n--- 3. Farm costume is calling-scene only ---');
{
  const ctx = makeCtx();
  ctx._lesson = { worldId: '2b-unit-10', costumeSkinId: 'chef' };
  const farm = mockScene({
    key: 'FarmScene',
    catalog: liveCatalog,
    textures: { farmer_walk_down_0: true, player_walk_down_0: true, chef_walk_down_0: true }
  });
  const dungeon = mockScene({
    key: 'DungeonScene',
    catalog: liveCatalog,
    textures: { farmer_walk_down_0: true, player_walk_down_0: true, chef_walk_down_0: true }
  });
  ctx.sceneRef = farm;
  ctx._farm = farm;
  ctx._dungeon = dungeon;
  assert(R(ctx, 'farmCostumeSkinId(_farm)') === null, 'matrix chef is not a farm costume');
  assert(R(ctx, 'activeSkinId(_farm)') === 'farmer', 'Unit 10 farm keeps the HD farmer');
  assert(R(ctx, 'farmCostumeSkinId(_dungeon)') === null, 'DungeonScene does not read farm costume');
  assert(R(ctx, 'activeSkinId(_dungeon)') === 'farmer', 'dungeon stays on equipped farmer');
}

console.log('\n--- 3b. HD costume may overlay; matrix never does ---');
{
  const ctx = makeCtx();
  const pack = JSON.parse(JSON.stringify(liveCatalog));
  const chef = pack.skins.find((s) => s.id === 'chef');
  chef.art = 'hd';
  chef.folder = 'characters/valley-chef';
  chef.files = ['walk_down_0.png'];
  ctx._lesson = { worldId: '2b-unit-10', costumeSkinId: 'chef' };
  const farm = mockScene({
    key: 'FarmScene',
    catalog: pack,
    textures: { farmer_walk_down_0: true, chef_walk_down_0: true, player_walk_down_0: true }
  });
  ctx.sceneRef = farm;
  ctx._farm = farm;
  assert(R(ctx, 'farmCostumeSkinId(_farm)') === 'chef', 'HD chef costume is allowed on FarmScene');
  assert(R(ctx, 'activeSkinId(_farm)') === 'chef', 'Unit 10 farm uses HD chef when those textures exist');
}

console.log('\n--- 4. Minigame prefers matrixPrefix even when HD is cached ---');
{
  const ctx = makeCtx();
  const scene = mockScene({
    key: 'DungeonScene',
    catalog: liveCatalog,
    textures: { farmer_walk_down_0: true, player_walk_down_0: true, player_walk_left_2: true }
  });
  ctx._scene = scene;
  assert(R(ctx, 'skinTextureKey(_scene, "walk", "down", 0, "minigame")') === 'player_walk_down_0',
    'minigame key is matrixPrefix');
  assert(R(ctx, 'skinTextureKey(_scene, "walk", "down", 0, "farm")') === 'farmer_walk_down_0',
    'farm prefers HD farmer key');
  assert(R(ctx, 'minigamePlayerTextureKey("left", 2)') === 'player_walk_left_2',
    'minigamePlayerTextureKey ignores cached HD');
}

console.log('\n--- 5. Anim keys split hd vs mx ---');
{
  const ctx = makeCtx();
  const scene = mockScene({
    key: 'FarmScene',
    catalog: liveCatalog,
    textures: { player_walk_down_0: true }
  });
  ctx._scene = scene;
  R(ctx, 'ensureSkinAnims(_scene, getSkinDef("farmer"), "farm")');
  assert(!!scene._anims['farmer-mx-walk-down'], 'matrix farmer registers farmer-mx-walk-down');
  scene._keys.farmer_walk_down_0 = true;
  assert(R(ctx, 'skinAnimKey(_scene, "walk", "down", "farm")') === 'farmer-hd-walk-down',
    'once HD exists, farm walk key is farmer-hd-walk-*');
  R(ctx, 'ensureSkinAnims(_scene, getSkinDef("farmer"), "farm")');
  assert(!!scene._anims['farmer-hd-walk-down'], 'HD anim is a new key, not a stuck mx exists-guard');
}

console.log('\n--- 6. Load queue: overlap + no matrix 404s ---');
{
  const ctx = makeCtx();
  ctx._lesson = { worldId: '2b-unit-10', costumeSkinId: 'chef' };
  const textures = { player_walk_down_0: true, chef_walk_down_0: true };
  ['down', 'up', 'left', 'right'].forEach((dir) => {
    for (let f = 0; f < 3; f++) textures['farmer_walk_' + dir + '_' + f] = true;
  });
  const scene = mockScene({
    key: 'FarmScene',
    catalog: liveCatalog,
    textures: textures
  });
  ctx._scene = scene;
  ctx.sceneRef = scene;
  let applies = 0;
  ctx._cb = function () { applies++; };
  R(ctx, 'ensureActiveSkinLoaded(_scene, _cb)');
  R(ctx, 'ensureActiveSkinLoaded(_scene, _cb)');
  assert(applies === 2, 'create-then-applySave overlap still flushes both callbacks');
  assert(scene._images.length === 0, 'matrix chef / already-cached farmer do not load.image');
}

console.log('\n--- 7. Grant / equip refuse unknown ---');
{
  const ctx = makeCtx();
  assert(R(ctx, 'grantSkin("hanbok")') === false, 'grantSkin refuses unknown ids');
  assert(R(ctx, 'equipSkin("chef")') === false, 'equipSkin refuses unowned chef');
  assert(R(ctx, 'grantSkin("chef")') === true, 'grantSkin accepts catalog chef');
  assert(ctx.ownedSkinIds.indexOf('chef') >= 0, 'chef is now owned');
  assert(R(ctx, 'equipSkin("chef")') === true, 'equipSkin accepts owned catalog chef');
  assert(ctx.equippedSkinId === 'chef', 'equippedSkinId is chef');
}

console.log('\n--- 8. lanternChestOffset + FARM_SKIN_APPLY ---');
{
  const ctx = makeCtx();
  ctx._s = { displayHeight: 80, originY: 1 };
  assert(R(ctx, 'lanternChestOffset(_s)') < 0, 'HD origin (0.5,1) lantern offset is above the feet');
  ctx._s = { displayHeight: 80, originY: 0.5 };
  const off = R(ctx, 'lanternChestOffset(_s)');
  assert(Math.abs(off) < 0.1 * 80, 'matrix origin lantern offset is near 0');
  assert(R(ctx, 'FARM_SKIN_APPLY.preserveFeet') === true, 'FARM_SKIN_APPLY preserves feet');
  assert(src.indexOf('applySkinToSprite(this, this.player, { sceneFit: \'farm\', preserveFeet: false })') >= 0,
    '_createPlayer omits preserveFeet');
  assert(src.indexOf('_unit10Skin') < 0, '_unit10Skin is gone');
}

console.log('\n--- 9. One shadow on farm apply ---');
{
  const ctx = makeCtx();
  const scene = mockScene({
    key: 'FarmScene',
    catalog: liveCatalog,
    textures: { farmer_walk_down_0: true, player_walk_down_0: true }
  });
  const sprite = mockSprite();
  ctx._scene = scene;
  ctx._spr = sprite;
  R(ctx, 'applySkinToSprite(_scene, _spr, FARM_SKIN_APPLY)');
  R(ctx, 'applySkinToSprite(_scene, _spr, FARM_SKIN_APPLY)');
  assert(scene.shadows.shadows.length === 1, 'second apply replaces the shadow instead of stacking');
  assert(sprite.originY === 1, 'farm HD originY is 1');
}

console.log('\n--- 10. attachTextbookWorld copies costumeSkinId ---');
assert(src.indexOf('costumeSkinId: world.costumeSkinId') >= 0,
  'attachTextbookWorld copies world.costumeSkinId onto the injected level');
assert(liveCatalog.skins.some((s) => s.id === 'chef' && s.art === 'matrix'),
  'chef remains matrix until an HD set exists');
assert(src.indexOf('if (!skinUsesHd(scene, def, \'farm\')) return null;') >= 0,
  'farm costume overlay refuses matrix skins');

console.log(`\n====================================================`);
console.log(`RESULT: ${passed} passed, ${failed} failed`);
console.log(`====================================================`);
process.exit(failed ? 1 : 0);
