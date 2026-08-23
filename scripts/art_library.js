/**
 * Art library — one place for naming, folders, catalog rows, and disk audit.
 *
 * New image flow (do not skip a step):
 *   1. Pick a folder from ART_FOLDERS and a snake_case slug.
 *   2. node scripts/register_art.js --folder <folder> --slug <slug> --name-en "<Name>"
 *      (registerArt writes id, nameEn, path, kind, family before or with the PNG).
 *   3. Imagine on magenta #FF00FF, then process_prop.py --height <class> --subdir <folder>.
 *   4. PNG lands at sprites/<folder>/<slug>.png — same path as the catalog row.
 *   5. Bump sprites/catalog.json cacheKey AND js ART_CACHE_KEY together.
 *   6. npm run audit:art  (also gated by validate_content).
 *
 * A PNG on disk without a catalog row, or a catalog row without a PNG, is a bug.
 * Catalog ids are <kind>.<slug> (food.kimchi_jar, item.corn_cob).
 * Trophy plaques (family trophy-icons) are ui.trophy.<name> from slug trophy_<name>.
 * HUD glyphs stay ui.hud.<slug> — do not reuse trophy_ for HUD.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ART_FOLDERS = {
  characters: { kind: 'character', heightClass: 'character', height: 80 },
  furniture: { kind: 'furniture', heightClass: 'station', height: 156 },
  stalls: { kind: 'stall', heightClass: 'station', height: 156 },
  plants: { kind: 'plant', heightClass: 'crop-ripe', height: 56 },
  decorations: { kind: 'decoration', heightClass: 'decoration', height: 64 },
  foods: { kind: 'food', heightClass: 'item', height: 48 },
  items: { kind: 'item', heightClass: 'item', height: 48 },
  quiz: { kind: 'quiz', heightClass: 'quiz', height: 0 },
  ui: { kind: 'ui', heightClass: 'ui', height: 48 }
};

const SLUG_RE = /^[a-z][a-z0-9_]*$/;
const HEIGHT_CLASS = {
  station: 156,
  accent: 64,
  'crop-sprout': 32,
  'crop-mid': 44,
  'crop-ripe': 56,
  'fence-bloom': 28,
  'ground-bloom': 36,
  fauna: 24,
  landmark: 180,
  character: 80,
  item: 48,
  well: 80,
  'fence-post': 40,
  'fence-rail': 10,
  ui: 48,
  quiz: 0
};

function posix(p) {
  return String(p || '').replace(/\\/g, '/');
}

function catalogId(folder, slug, family) {
  const spec = ART_FOLDERS[folder];
  if (!spec) throw new Error('unknown art folder: ' + folder);
  if (folder === 'ui' && family === 'trophy-icons' && /^trophy_/.test(slug)) {
    return 'ui.trophy.' + slug.replace(/^trophy_/, '');
  }
  return spec.kind + '.' + slug;
}

function catalogPath(folder, slug) {
  if (!ART_FOLDERS[folder]) throw new Error('unknown art folder: ' + folder);
  if (!SLUG_RE.test(slug)) throw new Error('slug must be snake_case: ' + slug);
  return folder + '/' + slug + '.png';
}

function processArgs(folder, slug, heightClass) {
  const folderSpec = ART_FOLDERS[folder];
  if (!folderSpec) throw new Error('unknown art folder: ' + folder);
  const klass = heightClass || folderSpec.heightClass;
  const height = HEIGHT_CLASS[klass];
  if (height == null) throw new Error('unknown height class: ' + klass);
  return {
    folder,
    slug,
    dest: catalogPath(folder, slug),
    heightClass: klass,
    height,
    argv: ['--height', String(height), '--subdir', folder]
  };
}

function loadCatalog(root) {
  const file = path.join(root, 'sprites', 'catalog.json');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function saveCatalog(root, pack) {
  const file = path.join(root, 'sprites', 'catalog.json');
  fs.writeFileSync(file, JSON.stringify(pack, null, 2) + '\n');
}

function registerArt(pack, spec) {
  const folder = spec.folder;
  const slug = spec.slug;
  if (!ART_FOLDERS[folder]) throw new Error('unknown art folder: ' + folder);
  if (!SLUG_RE.test(slug)) throw new Error('slug must be snake_case: ' + slug);
  if (!spec.nameEn || !String(spec.nameEn).trim()) throw new Error('nameEn is required for ' + slug);
  const folderSpec = ART_FOLDERS[folder];
  const rowPath = spec.path || catalogPath(folder, slug);
  const id = spec.id || catalogId(folder, slug, spec.family);
  const row = {
    id,
    nameEn: String(spec.nameEn).trim(),
    kind: spec.kind || folderSpec.kind,
    family: spec.family || slug,
    role: spec.role || slug,
    path: rowPath,
    status: spec.status || 'shipped',
    heightClass: spec.heightClass || folderSpec.heightClass,
    parentId: spec.parentId || id,
    usedBy: Array.isArray(spec.usedBy) ? spec.usedBy.slice() : [],
    notes: spec.notes || ''
  };
  if (spec.phaserKey) row.phaserKey = spec.phaserKey;
  if (spec.wordKo) row.wordKo = spec.wordKo;
  pack.assets = Array.isArray(pack.assets) ? pack.assets : [];
  const idx = pack.assets.findIndex((a) => a && (a.id === id || posix(a.path) === posix(rowPath)));
  if (idx >= 0) pack.assets[idx] = Object.assign({}, pack.assets[idx], row);
  else pack.assets.push(row);
  return row;
}

function walkPngs(dir, acc, base) {
  if (!fs.existsSync(dir)) return acc;
  fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkPngs(full, acc, base);
    else if (/\.png$/i.test(e.name)) {
      acc.push(posix(path.relative(base, full)));
    }
  });
  return acc;
}

function auditArt(root) {
  const spriteRoot = path.join(root, 'sprites');
  const pack = loadCatalog(root);
  const assets = Array.isArray(pack.assets) ? pack.assets : [];
  const catalogPaths = new Set();
  const missing = [];
  const unnamed = [];
  const badFolder = [];
  const badSlug = [];
  const badId = [];
  const duplicateId = [];
  const duplicatePath = [];
  const ids = new Set();
  assets.forEach((a) => {
    if (!a || !a.id || !a.nameEn || !a.path || !a.kind) {
      unnamed.push(a && a.id ? a.id : JSON.stringify(a));
      return;
    }
    if (ids.has(a.id)) duplicateId.push(a.id);
    ids.add(a.id);
    const rel = posix(a.path);
    if (catalogPaths.has(rel)) duplicatePath.push(rel);
    catalogPaths.add(rel);
    const folder = rel.split('/')[0];
    const folderSpec = ART_FOLDERS[folder];
    if (!folderSpec) badFolder.push(rel);
    const base = rel.split('/').pop().replace(/\.png$/i, '');
    if (!SLUG_RE.test(base)) badSlug.push(rel);
    if (folderSpec) {
      const idHead = String(a.id).split('.')[0];
      const allowedHeads = new Set([folderSpec.kind, a.kind]);
      if (folder === 'plants') {
        allowedHeads.add('plant');
        allowedHeads.add('crop');
        allowedHeads.add('landmark');
      }
      if (!allowedHeads.has(idHead)) badId.push(a.id);
    }
    if (!fs.existsSync(path.join(spriteRoot, rel))) missing.push(rel);
  });
  const disk = walkPngs(spriteRoot, [], spriteRoot);
  const orphans = disk.filter((p) => p !== 'catalog.json' && !catalogPaths.has(p));
  disk.forEach((p) => {
    const base = p.split('/').pop().replace(/\.png$/i, '');
    if (!SLUG_RE.test(base) && badSlug.indexOf(p) < 0) badSlug.push(p);
  });
  return {
    cacheKey: pack.cacheKey || '',
    disk: disk.length,
    catalog: assets.length,
    missing,
    orphans,
    unnamed,
    badFolder,
    badSlug,
    badId,
    duplicateId,
    duplicatePath,
    ok: missing.length + orphans.length + unnamed.length + badFolder.length
      + badSlug.length + badId.length
      + duplicateId.length + duplicatePath.length === 0
      && disk.length === assets.length
  };
}

module.exports = {
  ART_FOLDERS,
  HEIGHT_CLASS,
  SLUG_RE,
  catalogId,
  catalogPath,
  processArgs,
  loadCatalog,
  saveCatalog,
  registerArt,
  auditArt,
  posix
};
