#!/usr/bin/env node
/**
 * Register a catalog row for a new image, then print the process_prop command.
 *
 *   npm run register:art -- --folder foods --slug kimchi_jar --name-en "Kimchi"
 *   npm run register:art -- --folder ui --slug trophy_bronze_apple --name-en "Bronze apple plaque" --family trophy-icons --used-by Trophies
 */
'use strict';
const path = require('path');
const {
  ART_FOLDERS,
  registerArt,
  loadCatalog,
  saveCatalog,
  processArgs,
  auditArt
} = require('./art_library');

function arg(flag) {
  const i = process.argv.indexOf('--' + flag);
  if (i < 0) return '';
  const v = process.argv[i + 1];
  if (!v || String(v).indexOf('--') === 0) return '';
  return v;
}

function usage() {
  console.error('Usage: node scripts/register_art.js --folder <folder> --slug <slug> --name-en "<Name>"');
  console.error('Optional: --family --role --used-by a,b --notes --height-class');
  console.error('Folders:', Object.keys(ART_FOLDERS).join(', '));
  process.exit(2);
}

const folder = arg('folder');
const slug = arg('slug');
const nameEn = arg('name-en');
if (!folder || !slug || !nameEn) usage();

const ROOT = path.resolve(__dirname, '..');
const pack = loadCatalog(ROOT);
const usedBy = arg('used-by')
  ? arg('used-by').split(',').map((s) => s.trim()).filter(Boolean)
  : [];
const row = registerArt(pack, {
  folder,
  slug,
  nameEn,
  family: arg('family') || undefined,
  role: arg('role') || undefined,
  usedBy,
  notes: arg('notes') || '',
  heightClass: arg('height-class') || undefined
});
saveCatalog(ROOT, pack);

const proc = processArgs(folder, slug, arg('height-class') || undefined);
console.log('registered', row.id);
console.log('  path   ', row.path);
console.log('  process', 'python .grok/skills/farm-pixel-props/scripts/process_prop.py',
  proc.argv.join(' '), '<src.png>', slug);
console.log('  then bump cacheKey in sprites/catalog.json and ART_CACHE_KEY together');

const report = auditArt(ROOT);
const onlyThisMissing = report.missing.length === 1
  && report.missing[0] === row.path
  && report.orphans.length === 0
  && report.unnamed.length === 0
  && report.badFolder.length === 0
  && report.badSlug.length === 0
  && report.badId.length === 0
  && report.duplicateId.length === 0
  && report.duplicatePath.length === 0;
if (onlyThisMissing) {
  console.log('  PNG not on disk yet — process_prop.py then npm run audit:art');
  process.exit(0);
}
if (!report.ok) {
  console.error('ART_AUDIT_FAIL after register');
  process.exit(1);
}
console.log('art audit ok', report.catalog, 'rows /', report.disk, 'png');
