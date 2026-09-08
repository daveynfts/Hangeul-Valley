#!/usr/bin/env node
'use strict';
/**
 * scripts/make_save_icon.js — draws sprites/ui/save_disk.png, the HUD's Save glyph.
 *
 * Why this one icon is generated rather than painted. It replaced save_chest.png, which had
 * two problems the HUD made worse.
 *
 * 1. It was a brown wooden container sitting directly beside harvest_basket.png, another
 *    brown wooden container. At the 22px the HUD draws these at, they were the same blob.
 * 2. Every glyph in the set is drawn 40px tall and then padded to a square canvas, and the
 *    canvases are not the same size — 40, 43, 48, 50, 53, 64, 68. `.hud-btn .hud-art-icon`
 *    is a 22x22 box with `object-fit: contain`, so the rendered height is 22 * 40/canvas.
 *    The chest's 53px canvas rendered it 16.6px tall next to a 22px market stall: a quarter
 *    shorter than its neighbours, which is the "the icon looks wrong" this replaced.
 *
 * A floppy disk is geometry — rectangles, a notched corner, a shutter — so it can be stated
 * exactly instead of drawn, and stating it is what keeps the canvas honest: 40x40 with the
 * artwork touching all four edges, which is the only shape `contain` renders at full size.
 * The palette is the set's own: the outline is the warm near-black the wood props use, and
 * the label is the parchment from quest_scroll.png. Nothing is thinner than 2px, because a
 * 1px detail at 22px is a smudge.
 *
 *   node scripts/make_save_icon.js
 *   node scripts/make_save_icon.js --check     # fail if the committed PNG is out of date
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'sprites', 'ui', 'save_disk.png');
const W = 40;
const H = 40;
const CUT = 9; // the 45° notch at the top-right, a 3.5" disk's write corner

const c = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), 255];
const P = {
  out: c('#2b1a13'),
  bodyHi: c('#6d88a8'), body: c('#4d6480'), bodyLo: c('#3a4c66'), bodySh: c('#2f3d52'),
  metalHi: c('#f1f2ee'), metal: c('#cccec9'), metalLo: c('#989b96'),
  win: c('#33445c'),
  label: c('#f0dcae'), labelLo: c('#d6bb85'), ink: c('#8a6338'), inkLo: c('#a8865c')
};

function draw() {
  const px = Buffer.alloc(W * H * 4);
  const set = (x, y, k) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    px[i] = k[0]; px[i + 1] = k[1]; px[i + 2] = k[2]; px[i + 3] = k[3];
  };
  const rect = (x0, y0, x1, y1, k) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, k);
  };

  // The three square corners are eased by a pixel so the disk does not read harder-edged
  // than the wood props beside it.
  const corner = (x, y) => (x === 0 && y === 0) || (x === 0 && y === H - 1) || (x === W - 1 && y === H - 1);
  const cut = (x, y) => (x - (W - 1 - CUT)) > y;
  const inBody = (x, y) => x >= 0 && x < W && y >= 0 && y < H && !cut(x, y) && !corner(x, y);
  const edge = (x, y) => !inBody(x - 1, y) || !inBody(x + 1, y) || !inBody(x, y - 1) || !inBody(x, y + 1);

  // Shell, then a one-pixel bevel inside the outline: lit along the top and left, shaded
  // along the bottom and right. Shading the whole face in bands instead put a visible seam
  // across the middle of the disk.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inBody(x, y)) set(x, y, P.body);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!inBody(x, y) || edge(x, y)) continue;
      const off = (dx, dy) => !inBody(x + dx, y + dy) || edge(x + dx, y + dy);
      if (off(0, -1) || off(-1, 0)) set(x, y, P.bodyHi);
      else if (off(0, 1) || off(1, 0)) set(x, y, P.bodyLo);
    }
  }
  // Outline last, so the bevel can never paint over it.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inBody(x, y) && edge(x, y)) set(x, y, P.out);

  // Shutter: seated shadow, metal plate, window, two grip ribs.
  rect(10, 3, 29, 17, P.bodySh);
  rect(10, 2, 29, 16, P.out);
  rect(11, 3, 28, 15, P.metal);
  rect(11, 3, 28, 4, P.metalHi);
  rect(11, 14, 28, 15, P.metalLo);
  rect(20, 5, 27, 13, P.out);
  rect(21, 6, 26, 12, P.win);
  rect(13, 6, 14, 12, P.metalHi);
  rect(16, 6, 17, 12, P.metalLo);

  // Label, on quest_scroll.png's parchment.
  rect(5, 22, 34, 38, P.bodySh);
  rect(5, 21, 34, 37, P.out);
  rect(6, 22, 33, 36, P.label);
  rect(6, 34, 33, 36, P.labelLo);
  rect(9, 25, 30, 26, P.ink);
  rect(9, 29, 25, 30, P.inkLo);

  return px;
}

// ── Minimal PNG writer ───────────────────────────────────────────────────────
// Hand-rolled because nothing under scripts/ may pull a dependency: CI runs these with no
// npm install. zlib is in the standard library and RGBA/8-bit needs no filtering to be valid.
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let k = n;
    for (let i = 0; i < 8; i++) k = k & 1 ? 0xEDB88320 ^ (k >>> 1) : k >>> 1;
    t[n] = k;
  }
  return t;
})();
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePng(w, h, px) {
  const stride = w * 4;
  const raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    px.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function main() {
  const png = encodePng(W, H, draw());
  if (process.argv.includes('--check')) {
    const have = fs.existsSync(OUT) ? fs.readFileSync(OUT) : Buffer.alloc(0);
    if (!have.equals(png)) {
      console.error('save_disk.png is out of date — run: node scripts/make_save_icon.js');
      process.exit(1);
    }
    console.log('save_disk.png is up to date');
    return;
  }
  fs.writeFileSync(OUT, png);
  console.log('wrote sprites/ui/save_disk.png (' + W + 'x' + H + ', ' + png.length + ' bytes)');
}

main();
