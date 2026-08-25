'use strict';

const fs = require('fs');
const path = require('path');
const { atomicWriteJson } = require('./atomicWrite');

const CATALOG_REL = path.join('skins', 'catalog.json');
const ID_RE = /^[a-z][a-z0-9_]{1,31}$/;
const RARITIES = ['common', 'uncommon', 'rare', 'legendary'];
const CURRENCIES = ['coins', 'gems', 'honor'];
const UNLOCKS = ['default', 'shop', 'worldVisit', 'debug'];
const ARTS = ['matrix', 'hd'];

function writeJson(rel, data, rootDir) {
  const json = JSON.stringify(data, null, 2) + '\n';
  JSON.parse(json);
  const dest = path.join(rootDir, rel);
  atomicWriteJson(dest, json);
}

function readJson(rel, rootDir) {
  const full = path.join(rootDir, rel);
  if (!fs.existsSync(full)) throw new Error(`${rel} not found`);
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

function hasSpriteTree(rootDir) {
  try { return !!rootDir && fs.existsSync(path.join(rootDir, 'sprites')); }
  catch (e) { return false; }
}

function validateCatalog(pack, rootDir) {
  if (!pack || typeof pack !== 'object') throw new Error('Catalog must be an object');
  if (!Array.isArray(pack.skins) || pack.skins.length < 1) {
    throw new Error('Catalog must include a skins array');
  }
  const defaultSkinId = pack.defaultSkinId || 'farmer';
  const ids = new Set();
  pack.skins.forEach((s, i) => {
    if (!s || typeof s !== 'object') throw new Error(`Skin ${i} is not an object`);
    if (!ID_RE.test(String(s.id || ''))) throw new Error(`Skin ${i} has a bad id`);
    if (ids.has(s.id)) throw new Error(`Duplicate skin id: ${s.id}`);
    ids.add(s.id);
    if (s.art && ARTS.indexOf(s.art) < 0) throw new Error(`${s.id}.art must be matrix or hd`);
    if (s.rarity && RARITIES.indexOf(s.rarity) < 0) throw new Error(`${s.id} has a bad rarity`);
    if (s.currency && CURRENCIES.indexOf(s.currency) < 0) throw new Error(`${s.id} has a bad currency`);
    const unlockType = s.unlock && s.unlock.type;
    if (unlockType && UNLOCKS.indexOf(unlockType) < 0) throw new Error(`${s.id} has a bad unlock type`);
    if (typeof s.price === 'number' && (s.price < 0 || s.price !== (s.price | 0))) {
      throw new Error(`${s.id}.price must be an integer >= 0`);
    }
    if (s.art === 'hd') {
      const folder = String(s.folder || ('skins/' + s.id)).replace(/\\/g, '/');
      if (!folder || folder.indexOf('..') >= 0) throw new Error(`${s.id} has a bad folder`);
      const files = Array.isArray(s.files) ? s.files : [];
      if (!files.length) throw new Error(`${s.id} is hd but files[] is empty`);
      files.forEach((name) => {
        if (!name || /[\\/]/.test(name) || String(name).indexOf('..') >= 0) {
          throw new Error(`${s.id} file must be a basename`);
        }
        // Only checkable where the art is. The 276 sprite PNGs are served from R2 and are not
        // bundled into a Vercel function, so on production this check has nothing to look at
        // and would refuse every catalogue rather than find a fault. It is skipped there and
        // left to CI, which runs against a full checkout — recorded rather than silently
        // weakened, because "the file is missing" and "the folder is missing" are different
        // failures and only one of them is the editor's business.
        if (!hasSpriteTree(rootDir)) return;
        const full = path.join(rootDir, 'sprites', folder, name);
        if (!fs.existsSync(full)) throw new Error(`Missing ${path.join('sprites', folder, name)}`);
      });
    }
  });
  if (!ids.has(defaultSkinId)) throw new Error('defaultSkinId is not in skins[]');
  return true;
}

function previewPath(def) {
  if (!def || def.art !== 'hd') return null;
  const folder = String(def.folder || ('skins/' + def.id)).replace(/\\/g, '/');
  if (!folder || folder.indexOf('..') >= 0) return null;
  const file = def.preview || (Array.isArray(def.files) && def.files[0]) || 'walk_down_0.png';
  if (/[\\/]/.test(file) || String(file).indexOf('..') >= 0) return null;
  return folder + '/' + file;
}

function getCatalog(rootDir) {
  const pack = readJson(CATALOG_REL, rootDir);
  const skins = (pack.skins || []).map((s) => Object.assign({}, s, {
    previewUrl: previewPath(s) ? '/sprite-preview/' + previewPath(s) : null,
    walkUrls: (s.art === 'hd' && s.folder)
      ? ['down', 'up', 'left', 'right'].reduce((acc, dir) => {
          acc[dir] = [0, 1, 2].map((f) => '/sprite-preview/' + String(s.folder).replace(/\\/g, '/') + '/walk_' + dir + '_' + f + '.png');
          return acc;
        }, {})
      : null
  }));
  return {
    version: pack.version || 1,
    cacheKey: pack.cacheKey || '',
    defaultSkinId: pack.defaultSkinId || 'farmer',
    skins
  };
}

// Checking and normalising, without touching disk, so the same rules can run inside a Vercel
// function where the write goes to GitHub and R2 instead. rootDir is still needed here: this
// is the one validator that reaches for the repo, because it checks the sprites exist.
function normaliseCatalog(body, rootDir) {
  validateCatalog(body, rootDir);
  return {
    version: typeof body.version === 'number' ? body.version : 1,
    cacheKey: String(body.cacheKey || ''),
    defaultSkinId: body.defaultSkinId || 'farmer',
    skins: body.skins.map((s) => ({
      id: s.id,
      nameEn: String(s.nameEn || s.id),
      rarity: s.rarity || 'common',
      price: typeof s.price === 'number' ? s.price : 0,
      currency: s.currency || 'coins',
      unlock: s.unlock && typeof s.unlock === 'object' ? { type: s.unlock.type || 'shop' } : { type: 'shop' },
      art: s.art || 'matrix',
      matrixPrefix: s.matrixPrefix || s.id,
      folder: s.folder || '',
      files: Array.isArray(s.files) ? s.files.slice() : [],
      preview: s.preview || null,
      worldCostumeOf: Array.isArray(s.worldCostumeOf) ? s.worldCostumeOf.slice() : undefined,
      states: s.states || undefined
    }))
  };
}

function saveCatalog(body, rootDir) {
  writeJson(CATALOG_REL, normaliseCatalog(body, rootDir), rootDir);
  return getCatalog(rootDir);
}

module.exports = { getCatalog, saveCatalog, normaliseCatalog, validateCatalog, CATALOG_REL };
