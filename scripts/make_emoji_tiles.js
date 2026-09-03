'use strict';
/**
 * scripts/make_emoji_tiles.js — a stand-in tile for a TOPIK word, drawn from its own emoji.
 *
 * Why this exists. Every word in worlds/topik-2.json must be declared in the art manifest
 * against an image no other TOPIK word uses (apply_topik_art.js throws `Shared image` and
 * `Copied PNG`), and the supply of unclaimed sprites on disk ran out at 521 words. Rather
 * than ration the vocabulary or park questions until artwork exists, a word can hold its own
 * emoji as a placeholder: every entry already carries one in `hint`, so the tile is unique
 * and roughly right instead of unique and arbitrary — 우표 gets 📮 rather than a prescription
 * slip. `standIn: true` still marks it as awaiting real art.
 *
 * Two emoji fonts ship colour glyphs; this uses Segoe UI Emoji, so the script only runs on
 * Windows. That is fine: like apply_topik_art.js it is run locally and its output committed,
 * and CI only checks the committed files are in sync.
 *
 * Where two words carry the same emoji — 봉사자 and 여성 are both 🙋 — the pixels are
 * identical and `Copied PNG` would fire, so each file embeds its headword in a PNG tEXt
 * chunk. Invisible, and it makes the file say which word it belongs to.
 *
 *   node scripts/make_emoji_tiles.js --new             words added to the world, not yet declared
 *   node scripts/make_emoji_tiles.js --standins        every word already flagged standIn
 *   node scripts/make_emoji_tiles.js --words 우표,박물관
 *   node scripts/make_emoji_tiles.js --standins --dry-run
 *
 * Then: npm run art:topik:apply
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { loadCatalog, saveCatalog, registerArt } = require('./art_library');

const ROOT = path.resolve(__dirname, '..');
const FONT = 'C:\\Windows\\Fonts\\seguiemj.ttf';
const HEIGHT = 48;

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const writeJsonPreserving = (rel, obj) => {
  const raw = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const eol = raw.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
  fs.writeFileSync(path.join(ROOT, rel),
    JSON.stringify(obj, null, 2).replace(/\n/g, eol) + (raw.endsWith('\n') ? eol : ''), 'utf8');
};

// A slug from the emoji's codepoints. Variation selectors and joiners are dropped from the
// name — they change nothing a reader can see — but stay in the text that gets drawn.
function slugFor(emoji) {
  const cps = [...emoji]
    .map((ch) => ch.codePointAt(0))
    .filter((cp) => cp !== 0xfe0f && cp !== 0x200d)
    .map((cp) => cp.toString(16));
  return 'emoji_' + cps.join('_');
}

function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const world = readJson('worlds/topik-2.json');
  const manifest = readJson('docs/topik-art-manifest.json');
  const byKo = new Map(world.level.words.map((w) => [w.ko, w]));

  let targets;  // reassigned below when some already hold emoji tiles
  const wordsArg = argv.find((a) => a.startsWith('--words'));
  if (argv.includes('--new')) {
    // Words added to the world but not yet declared anywhere. apply_topik_art refuses to run
    // at all while one exists, so this is the step that follows editing worlds/topik-2.json:
    // the word brings its own emoji and no sprite has to be picked by hand.
    const declared = new Set([...manifest.retained, ...manifest.entries].map((e) => e.ko));
    targets = world.level.words
      .filter((w) => !declared.has(w.ko))
      .map((w) => {
        const entry = { index: world.level.words.indexOf(w), ko: w.ko, file: '', reviewed: true, standIn: true };
        manifest.retained.push(entry);
        return entry;
      });
  } else if (argv.includes('--standins')) {
    targets = manifest.retained.filter((e) => e.standIn === true);
  } else if (wordsArg) {
    const list = (wordsArg.includes('=') ? wordsArg.split('=')[1] : argv[argv.indexOf(wordsArg) + 1])
      .split(',').map((s) => s.trim()).filter(Boolean);
    targets = list.map((ko) => {
      const row = manifest.retained.find((e) => e.ko === ko);
      if (!row) throw new Error('not a retained manifest entry: ' + ko);
      return row;
    });
  } else {
    console.error('usage: --new | --standins | --words <ko,ko>   [--dry-run]');
    process.exit(2);
  }
  // Idempotent: a word already holding an emoji tile keeps it. Without this a second run
  // hands it a second file — emoji_1f4ee_2.png — and orphans the first.
  const already = targets.filter((e) => /\/emoji_[a-z0-9_]+\.png$/.test(e.file));
  targets = targets.filter((e) => !already.includes(e));
  if (already.length) console.log('already on an emoji tile, skipped: ' + already.length);
  if (!targets.length) { console.log('nothing to do'); return; }

  // Claim a slug per word up front, so a shared emoji still gets one file each.
  const taken = new Set(fs.readdirSync(path.join(ROOT, 'sprites', 'items')));
  const plan = [];
  targets.forEach((entry) => {
    const word = byKo.get(entry.ko);
    if (!word) throw new Error('not in the world word list: ' + entry.ko);
    const emoji = String(word.hint || '').trim();
    if (!emoji) throw new Error('no hint emoji to draw for ' + entry.ko);
    let slug = slugFor(emoji);
    if (!/^[a-z][a-z0-9_]*$/.test(slug)) throw new Error('bad slug for ' + entry.ko + ': ' + slug);
    let n = 1;
    let candidate = slug;
    while (taken.has(candidate + '.png')) { n += 1; candidate = slug + '_' + n; }
    taken.add(candidate + '.png');
    plan.push({ ko: entry.ko, emoji, slug: candidate, nameEn: word.en, was: entry.file });
  });

  console.log(targets.length + ' word(s); ' + new Set(plan.map((p) => p.emoji)).size + ' distinct emoji');
  if (dryRun) {
    plan.slice(0, 12).forEach((p) => console.log('  ' + p.ko + '  ' + p.emoji + '  -> items/'
      + p.slug + '.png   (was ' + p.was.replace('sprites/items/', '') + ')'));
    if (plan.length > 12) console.log('  … and ' + (plan.length - 12) + ' more');
    return;
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  const py = path.join(os.tmpdir(), 'hv_emoji_tiles_' + process.pid + '.py');
  const spec = path.join(os.tmpdir(), 'hv_emoji_tiles_' + process.pid + '.json');
  fs.writeFileSync(spec, JSON.stringify({ root: ROOT, font: FONT, height: HEIGHT, plan }), 'utf8');
  fs.writeFileSync(py, PY_SOURCE, 'utf8');
  try {
    const out = execFileSync('python', [py, spec], { encoding: 'utf8' });
    process.stdout.write(out);
  } finally {
    fs.rmSync(py, { force: true });
    fs.rmSync(spec, { force: true });
  }

  // ── Register, and point the manifest at the new files ───────────────────────
  const pack = loadCatalog(ROOT);
  plan.forEach((p) => {
    registerArt(pack, {
      folder: 'items',
      slug: p.slug,
      nameEn: p.nameEn,
      family: 'topik-emoji-standin',
      status: 'shipped',
      wordKo: p.ko,
      usedBy: ['topik-2', 'vocab'],
      notes: 'Emoji stand-in drawn from the word\'s own hint (' + p.emoji + '). '
        + 'Placeholder until reviewed artwork replaces it; see standIn in docs/topik-art-manifest.json.'
    });
    const entry = manifest.retained.find((e) => e.ko === p.ko);
    entry.file = 'sprites/items/' + p.slug + '.png';
  });
  manifest.retained.sort((a, b) => a.index - b.index);
  saveCatalog(ROOT, pack);
  writeJsonPreserving('docs/topik-art-manifest.json', manifest);

  console.log('registered ' + plan.length + ' tile(s); manifest repointed.');
  console.log('now run: npm run art:topik:apply');
}

const PY_SOURCE = [
  'import json, sys',
  'from PIL import Image, ImageDraw, ImageFont',
  'from PIL.PngImagePlugin import PngInfo',
  'import os',
  '',
  'spec = json.load(open(sys.argv[1], encoding="utf-8"))',
  'H = spec["height"]',
  'font = ImageFont.truetype(spec["font"], H)',
  'made = 0',
  'for p in spec["plan"]:',
  '    pad = H * 2',
  '    img = Image.new("RGBA", (pad, pad), (0, 0, 0, 0))',
  '    ImageDraw.Draw(img).text((H // 2, H // 4), p["emoji"], font=font, embedded_color=True)',
  '    box = img.getbbox()',
  '    if box is None:',
  '        raise SystemExit("nothing drawn for " + p["ko"] + " " + p["emoji"])',
  '    glyph = img.crop(box)',
  '    w = max(1, round(glyph.width * H / glyph.height))',
  '    glyph = glyph.resize((w, H), Image.LANCZOS)',
  '    # The headword rides along in a text chunk: two words sharing an emoji would',
  '    # otherwise be byte-identical, which apply_topik_art rejects as a Copied PNG.',
  '    meta = PngInfo()',
  '    meta.add_text("word", p["ko"])',
  '    meta.add_text("standIn", "emoji placeholder")',
  '    out = os.path.join(spec["root"], "sprites", "items", p["slug"] + ".png")',
  '    glyph.save(out, "PNG", pnginfo=meta, optimize=True)',
  '    made += 1',
  'print("drew %d emoji tile(s) at %dpx tall" % (made, H))'
].join('\n');

main();
