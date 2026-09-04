'use strict';

const fs = require('fs');
const path = require('path');

function catalogPath(rootDir) {
  return path.join(rootDir, 'sprites', 'catalog.json');
}

function loadCatalog(rootDir) {
  const p = catalogPath(rootDir);
  if (!fs.existsSync(p)) {
    throw new Error('sprites/catalog.json is missing.');
  }
  const pack = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (!pack || !Array.isArray(pack.assets)) {
    throw new Error('sprites/catalog.json must have an assets array.');
  }
  return pack;
}

function listPng(dir, prefix) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  fs.readdirSync(dir).sort().forEach((n) => {
    const full = path.join(dir, n);
    const rel = prefix ? prefix + '/' + n : n;
    if (fs.statSync(full).isDirectory()) listPng(full, rel).forEach((x) => out.push(x));
    else if (n.toLowerCase().endsWith('.png')) out.push(rel.replace(/\\/g, '/'));
  });
  return out;
}

function pngSize(full) {
  const buf = fs.readFileSync(full);
  if (buf.length < 24 || buf.toString('ascii', 1, 4) !== 'PNG') return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

// 'topik-society-and-everyday-life' -> 'TOPIK · Society & everyday life'; 'hud-icons' ->
// 'Hud icons'. The catalogue writes the category into the family key, so reading it back is
// all the labelling this needs — no second table to fall out of step with the first.
// Sentence case, because that is the case the categories are written in.
function familyLabel(key) {
  const raw = String(key || '').trim();
  if (!raw) return 'Unfiled';
  const topik = /^topik-(.+)$/.exec(raw);
  const words = (topik ? topik[1] : raw).split('-').filter(Boolean);
  if (!words.length) return 'TOPIK';
  const joined = words.map((w, i) => (w === 'and' && i ? '&' : w))
    // 'unit10' is one slug token but two words to a reader.
    .map((w) => w.replace(/^([a-z]+)(\d+)$/, '$1 $2')).join(' ');
  return (topik ? 'TOPIK · ' : '') + joined.charAt(0).toUpperCase() + joined.slice(1);
}

function buildReport(rootDir) {
  const pack = loadCatalog(rootDir);
  const spriteRoot = path.join(rootDir, 'sprites');
  const onDisk = listPng(spriteRoot);
  const catalogPaths = new Set();
  const assets = [];
  let shipped = 0;
  let unused = 0;
  let missing = 0;

  (pack.assets || []).forEach((a) => {
    const posix = String(a.path || '').replace(/\\/g, '/');
    catalogPaths.add(posix);
    const full = path.join(spriteRoot, posix);
    const exists = fs.existsSync(full);
    let bytes = 0;
    let size = null;
    if (exists) {
      bytes = fs.statSync(full).size;
      size = pngSize(full);
    } else {
      missing++;
    }
    if (a.status === 'shipped') shipped++;
    if (a.status === 'unused') unused++;
    assets.push({
      id: a.id,
      nameEn: a.nameEn || a.id,
      // The Korean headword the picture was drawn for. The catalogue has carried this on
      // 1045 of its rows all along; this report used to drop it, which is why the library
      // could not be searched in the language its vocabulary art is about.
      wordKo: a.wordKo || '',
      // Every headword that draws this picture, which is not always just `wordKo`: a
      // retained tile is registered under the farm word it was drawn for and lent to a
      // TOPIK word besides.
      words: Array.isArray(a.words) ? a.words.slice() : (a.wordKo ? [a.wordKo] : []),
      kind: a.kind || 'other',
      family: a.family || '',
      role: a.role || '',
      path: posix,
      phaserKey: a.phaserKey || null,
      status: exists ? (a.status || 'unknown') : 'missing',
      heightClass: a.heightClass || '',
      parentId: a.parentId || null,
      usedBy: Array.isArray(a.usedBy) ? a.usedBy : [],
      notes: a.notes || '',
      bytes,
      w: size ? size.w : null,
      h: size ? size.h : null,
      preview: '/sprite-preview/' + posix
    });
  });

  const orphans = onDisk.filter((p) => !catalogPaths.has(p));
  const families = {};
  assets.forEach((a) => {
    const key = a.family || a.id;
    if (!families[key]) {
      families[key] = {
        family: key,
        kind: a.kind,
        // What the shelf is called. This used to be one member's name, which reads fine for
        // a family of four and absurdly for one of 321 — the TOPIK shelf was headed "to be
        // deserted, to have no custom; (of air) chilly". The family key is the honest label;
        // `sampleName` keeps the old string for the families where it was a nice touch.
        nameEn: familyLabel(key),
        sampleName: a.nameEn.replace(/ — .*$/, ''),
        count: 0,
        shipped: 0,
        unused: 0,
        missing: 0,
        preview: a.preview,
        assets: []
      };
    }
    const fam = families[key];
    fam.count++;
    if (a.status === 'shipped') fam.shipped++;
    if (a.status === 'unused') fam.unused++;
    if (a.status === 'missing') fam.missing++;
    if (a.role === 'ripe' || a.role === 'prop' || a.role === 'walk_down_0' || a.role === 'summer' || a.role === 'bloom' || a.role === 'ground-bloom' || a.role === 'open') {
      // A crop family has one frame that says what the crop is; use it for the thumbnail.
      // The heading stays the family's own name — the frame is a picture, not a title.
      fam.preview = a.preview;
      fam.sampleName = a.nameEn.replace(/ — .*$/, '');
    }
    fam.assets.push(a);
  });

  return {
    version: pack.version || 1,
    cacheKey: pack.cacheKey || '',
    totals: {
      assets: assets.length,
      shipped,
      unused,
      missing,
      orphans: orphans.length,
      families: Object.keys(families).length
    },
    assets,
    families: Object.keys(families).sort().map((k) => families[k]),
    orphans,
    missingIds: assets.filter((a) => a.status === 'missing').map((a) => a.id)
  };
}

module.exports = {
  catalogPath,
  loadCatalog,
  listPng,
  buildReport
};
