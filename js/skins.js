// ═══════════════ SKIN CATALOG + FARM HERO ═══════════════════════════════════
const SKIN_DEFAULT_ID = 'farmer';
const SKIN_CATALOG_BOOT_V = 'skins-20260820a';
const SKIN_CATALOG_DEFAULT = {
  version: 1,
  cacheKey: 'skins-boot',
  defaultSkinId: 'farmer',
  skins: [
    {
      id: 'farmer',
      nameEn: 'Valley Farmer',
      rarity: 'common',
      price: 0,
      currency: 'coins',
      unlock: { type: 'default' },
      art: 'hd',
      matrixPrefix: 'player',
      folder: 'characters/valley-farmer',
      files: [
        'walk_down_0.png', 'walk_down_1.png', 'walk_down_2.png',
        'walk_up_0.png', 'walk_up_1.png', 'walk_up_2.png',
        'walk_left_0.png', 'walk_left_1.png', 'walk_left_2.png',
        'walk_right_0.png', 'walk_right_1.png', 'walk_right_2.png'
      ],
      preview: 'walk_down_0.png',
      states: {
        walk: { dirs: ['down', 'up', 'left', 'right'], frames: 3 },
        idle: { derived: 'walk/0' }
      }
    },
    {
      id: 'chef',
      nameEn: 'Kitchen Chef',
      rarity: 'uncommon',
      price: 40,
      currency: 'gems',
      unlock: { type: 'shop' },
      art: 'matrix',
      matrixPrefix: 'chef',
      folder: '',
      files: [],
      preview: null
    }
  ]
};
const FARMER_HD_DIRS = ['down', 'up', 'left', 'right'];
const FARMER_HD_FRAMES = 3;
const FARM_SPAWN_CENTER_Y_OFFSET = 80;
const MATRIX_SRC = 48, MATRIX_FARM_SCALE = 1.8;
const FARM_SKIN_APPLY = { sceneFit: 'farm', preserveFeet: true };

function getSkinCatalog(scene) {
  const s = scene || (typeof sceneRef !== 'undefined' ? sceneRef : null);
  try {
    if (s && s.cache && s.cache.json && s.cache.json.exists && s.cache.json.exists('skin-catalog')) {
      return s.cache.json.get('skin-catalog') || SKIN_CATALOG_DEFAULT;
    }
  } catch (e) {}
  return SKIN_CATALOG_DEFAULT;
}
function getSkinDef(id) {
  const pack = getSkinCatalog();
  return (pack.skins || []).find(s => s && s.id === id);
}
function getSkinDefOrDefault(id) {
  return getSkinDef(id) || getSkinDef(SKIN_DEFAULT_ID) || SKIN_CATALOG_DEFAULT.skins[0];
}
function skinStates(def) {
  const walk = (def && def.states && def.states.walk)
    ? def.states.walk
    : { dirs: FARMER_HD_DIRS.slice(), frames: FARMER_HD_FRAMES };
  return { walk, idle: { derived: 'walk/0' } };
}
function uniqSkinIds(arr) {
  const out = [];
  const seen = {};
  (arr || []).forEach(id => {
    if (typeof id !== 'string' || !id || seen[id]) return;
    seen[id] = true;
    out.push(id);
  });
  return out;
}
function sanitizeSkinState() {
  ownedSkinIds = uniqSkinIds([SKIN_DEFAULT_ID].concat(Array.isArray(ownedSkinIds) ? ownedSkinIds : []));
  const eq = equippedSkinId;
  if (!eq || ownedSkinIds.indexOf(eq) < 0) equippedSkinId = SKIN_DEFAULT_ID;
}
function isSkinOwned(id) {
  return id === SKIN_DEFAULT_ID || (Array.isArray(ownedSkinIds) && ownedSkinIds.indexOf(id) >= 0);
}
function grantSkin(id) {
  if (!getSkinDef(id) || isSkinOwned(id)) return false;
  ownedSkinIds.push(id);
  if (typeof persistSave === 'function') persistSave();
  return true;
}
function equipSkin(id) {
  if (!isSkinOwned(id) || !getSkinDef(id)) return false;
  equippedSkinId = id;
  if (typeof persistSave === 'function') persistSave();
  if (typeof sceneRef !== 'undefined' && sceneRef && sceneRef.player) {
    ensureActiveSkinLoaded(sceneRef, () => applySkinToSprite(sceneRef, sceneRef.player, FARM_SKIN_APPLY));
  }
  return true;
}
function isLocalHost() {
  try {
    if (typeof location === 'undefined') return false;
    const h = location.hostname;
    return h === 'localhost' || h === '127.0.0.1';
  } catch (e) { return false; }
}
function applyDebugSkinQuery() {
  debugSkinOverride = null;
  if (!isLocalHost()) return;
  try {
    const q = new URLSearchParams(location.search);
    const dbg = q.get('debug') || '';
    if (dbg !== 'skins' && dbg.indexOf('skins') !== 0) return;
    const id = q.get('skin') || (dbg.indexOf('skins=') === 0 ? dbg.slice(6) : '');
    if (id && getSkinDef(id)) debugSkinOverride = id;
  } catch (e) {}
}

function farmFeetYFromSpawn(H) {
  return H - FARM_SPAWN_CENTER_Y_OFFSET + (MATRIX_SRC * MATRIX_FARM_SCALE) / 2;
}
function playerFeetY(sprite) {
  return sprite.y + sprite.displayHeight * (1 - sprite.originY);
}
function sceneKeyOf(scene) {
  return (scene && scene.sys && scene.sys.settings && scene.sys.settings.key)
    || (scene && scene.scene && scene.scene.key)
    || '';
}
function farmCostumeSkinId(scene) {
  if (sceneKeyOf(scene) !== 'FarmScene') return null;
  const lesson = (typeof currentLesson === 'function') ? currentLesson() : null;
  const costume = lesson && lesson.costumeSkinId;
  const def = costume ? getSkinDef(costume) : null;
  if (!def) return null;
  // Matrix chef is the old yellow/white robot. Do not put it on the HD farm.
  if (!skinUsesHd(scene, def, 'farm')) return null;
  return costume;
}
function activeSkinId(scene) {
  if (debugSkinOverride && getSkinDef(debugSkinOverride)) return debugSkinOverride;
  const costume = farmCostumeSkinId(scene);
  if (costume) return costume;
  if (equippedSkinId && getSkinDef(equippedSkinId)) return equippedSkinId;
  return SKIN_DEFAULT_ID;
}
function resolvedSkinDef(scene) {
  return getSkinDefOrDefault(activeSkinId(scene));
}
function skinHdKey(def, state, dir, frame) {
  return def.id + '_' + state + '_' + dir + '_' + frame;
}
function skinMxKey(def, state, dir, frame) {
  return (def.matrixPrefix || def.id) + '_' + state + '_' + dir + '_' + frame;
}
function skinUsesHd(scene, def, sceneFit) {
  if (sceneFit === 'minigame' || !def || !scene || !scene.textures) return false;
  const hd = skinHdKey(def, 'walk', 'down', 0);
  const mx = skinMxKey(def, 'walk', 'down', 0);
  if (!scene.textures.exists(hd)) return false;
  if (hd === mx) return def.art === 'hd';
  return true;
}
function farmHdReady(scene) {
  return !!(scene && scene.textures && scene.textures.exists('farmer_walk_down_0'));
}
function farmerHdTextureKey(dir, frame) {
  return 'farmer_walk_' + dir + '_' + frame;
}
function farmerHdAnimKey(dir) {
  return 'farmer-hd-walk-' + dir;
}
function skinTextureKey(scene, state, dir, frame, sceneFit) {
  const def = resolvedSkinDef(scene);
  const fit = sceneFit || 'farm';
  const d = dir || 'down';
  const f = frame == null ? 0 : frame;
  const st = state || 'walk';
  const hd = skinHdKey(def, st, d, f);
  const mx = skinMxKey(def, st, d, f);
  if (fit === 'minigame') {
    if (scene && scene.textures && scene.textures.exists(mx)) return mx;
    if (scene && scene.textures && scene.textures.exists('player_walk_down_0')) {
      return 'player_walk_' + d + '_' + f;
    }
    return mx;
  }
  if (skinUsesHd(scene, def, fit)) return hd;
  if (scene && scene.textures && scene.textures.exists(mx)) return mx;
  if (scene && scene.textures && scene.textures.exists('player_walk_down_0')) return 'player_walk_' + d + '_' + f;
  return mx;
}
function skinAnimKey(scene, state, dir, sceneFit) {
  const def = resolvedSkinDef(scene);
  const fit = sceneFit || 'farm';
  const art = (fit === 'minigame' || !skinUsesHd(scene, def, fit)) ? 'mx' : 'hd';
  return def.id + '-' + art + '-' + (state || 'walk') + '-' + (dir || 'down');
}
function ensureSkinAnims(scene, def, sceneFit) {
  if (!scene || !scene.anims || !def) return;
  const fit = sceneFit || 'farm';
  const hd = skinUsesHd(scene, def, fit);
  const art = (fit === 'minigame' || !hd) ? 'mx' : 'hd';
  const states = skinStates(def);
  const dirs = (states.walk && states.walk.dirs) || FARMER_HD_DIRS;
  dirs.forEach(dir => {
    const key = def.id + '-' + art + '-' + 'walk-' + dir;
    if (scene.anims.exists(key)) return;
    const frames = [0, 1, 0, 2].map(fr => ({
      key: art === 'hd' ? skinHdKey(def, 'walk', dir, fr) : skinMxKey(def, 'walk', dir, fr)
    }));
    scene.anims.create({ key, frames, frameRate: 8, repeat: -1 });
  });
  if (art === 'hd' && scene.textures && scene.textures.get) {
    dirs.forEach(dir => {
      for (let f = 0; f < FARMER_HD_FRAMES; f++) {
        const tex = scene.textures.get(skinHdKey(def, 'walk', dir, f));
        if (tex && tex.setFilter && typeof Phaser !== 'undefined' && Phaser.Textures) {
          tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
      }
    });
  }
}
function ensureFarmerHdAnims(scene) {
  ensureSkinAnims(scene, getSkinDefOrDefault(SKIN_DEFAULT_ID), 'farm');
}
function lanternChestOffset(sprite) {
  return sprite.displayHeight * (1 - sprite.originY - 0.45);
}
function minigamePlayerTextureKey(dir, frame) {
  return skinTextureKey(null, 'walk', dir || 'down', frame == null ? 0 : frame, 'minigame');
}
function replacePlayerShadow(scene, sprite, w, h, oy) {
  if (!scene) return;
  if (scene.pShadow) {
    if (scene.shadows && Array.isArray(scene.shadows.shadows)) {
      const arr = scene.shadows.shadows;
      const i = arr.indexOf(scene.pShadow);
      if (i >= 0) arr.splice(i, 1);
    }
    try { scene.pShadow.destroy(); } catch (e) {}
    scene.pShadow = null;
  }
  if (scene.shadows && typeof scene.shadows.createShadow === 'function') {
    scene.pShadow = scene.shadows.createShadow(sprite, w, h, oy);
  } else if (scene.add && typeof scene.add.ellipse === 'function') {
    scene.pShadow = scene.add.ellipse(0, 0, w, h, 0, 0.3).setDepth(499);
  }
}
function applySkinToSprite(scene, sprite, opts) {
  if (!sprite) return;
  const fit = (opts && opts.sceneFit) || 'farm';
  const def = resolvedSkinDef(scene);
  const facing = (scene && scene.playerFacing) || 'down';
  const preserveFeet = opts && opts.preserveFeet;
  const feetY = preserveFeet ? playerFeetY(sprite) : null;
  ensureSkinAnims(scene, def, fit);
  if (sprite.anims && sprite.anims.stop) sprite.anims.stop();
  sprite.setTexture(skinTextureKey(scene, 'walk', facing, 0, fit));
  sprite.setFlipX(false);
  const hd = skinUsesHd(scene, def, fit);
  if (fit === 'farm' && hd) {
    sprite.setOrigin(0.5, 1);
    sprite.setScale(1, 1);
    const w = sprite.frame.width, h = sprite.frame.height;
    const bodyW = Math.min(24, w), bodyH = 12;
    if (sprite.body) sprite.body.setSize(bodyW, bodyH).setOffset((w - bodyW) / 2, h - bodyH);
    if (preserveFeet && feetY != null) sprite.y = feetY;
    replacePlayerShadow(scene, sprite, Math.round(w * 0.45), 12, 4);
  } else if (fit === 'farm') {
    sprite.setOrigin(0.5, 0.5);
    sprite.setScale(MATRIX_FARM_SCALE, MATRIX_FARM_SCALE);
    if (sprite.body) sprite.body.setSize(24, 16).setOffset(12, 32);
    if (preserveFeet && feetY != null) sprite.y = feetY - sprite.displayHeight * 0.5;
    replacePlayerShadow(scene, sprite, 58, 18, 32);
  } else {
    sprite.setOrigin(0.5, 0.5);
    sprite.setScale(1, 1);
    if (sprite.body) sprite.body.setSize(30, 30);
  }
}
function applyFarmHeroContract(scene, sprite, opts) {
  applySkinToSprite(scene, sprite, {
    sceneFit: 'farm',
    preserveFeet: !!(opts && opts.preserveFeet)
  });
}
function skinFolderOf(def) {
  if (!def) return '';
  const raw = def.folder ? String(def.folder) : ('skins/' + String(def.id || ''));
  const folder = raw.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (!folder || folder.indexOf('..') >= 0) return '';
  return folder;
}
function ensureActiveSkinLoaded(scene, done) {
  if (!scene) { if (done) done(); return; }
  if (!scene._skinLoadQ) scene._skinLoadQ = [];
  scene._skinLoadQ.push(done || function () {});
  if (scene._skinLoadBusy) return;
  pumpSkinLoads(scene);
}
function pumpSkinLoads(scene) {
  if (scene.load && scene.load.isLoading && scene.load.isLoading()) {
    scene.load.once('complete', () => pumpSkinLoads(scene));
    return;
  }
  const pack = getSkinCatalog(scene);
  const ids = {};
  ids[SKIN_DEFAULT_ID] = true;
  if (equippedSkinId) ids[equippedSkinId] = true;
  const costume = farmCostumeSkinId(scene);
  if (costume) ids[costume] = true;
  if (debugSkinOverride) ids[debugSkinOverride] = true;
  let queued = 0;
  Object.keys(ids).forEach(id => {
    const def = getSkinDef(id);
    if (!def || def.art !== 'hd' || !Array.isArray(def.files) || !scene.load || !scene.load.image) return;
    const folder = skinFolderOf(def);
    if (!folder) return;
    const v = encodeURIComponent((pack && pack.cacheKey) || '1');
    def.files.forEach(name => {
      if (!name || /[\\/]/.test(name)) return;
      const key = def.id + '_' + String(name).replace(/\.png$/i, '');
      if (scene.textures && scene.textures.exists(key)) return;
      const base = (typeof ART_DIR !== 'undefined' ? ART_DIR : 'sprites/');
      scene.load.image(key, base + folder + '/' + name + '?v=' + v);
      queued++;
    });
  });
  const flush = () => {
    const cbs = scene._skinLoadQ || [];
    scene._skinLoadQ = [];
    scene._skinLoadBusy = false;
    cbs.forEach(fn => { try { fn(); } catch (e) {} });
    if (scene._skinLoadQ && scene._skinLoadQ.length) pumpSkinLoads(scene);
  };
  if (!queued) { flush(); return; }
  scene._skinLoadBusy = true;
  scene.load.once('complete', flush);
  if (scene.load.start) scene.load.start();
}

