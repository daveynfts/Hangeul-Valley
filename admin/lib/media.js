'use strict';

/**
 * Pictures uploaded through the admin designer — the media/ folder.
 *
 * A design places images on a page (js/richText.js, `design.blocks` and `<img>` inside
 * formatted text), and those images need a home the game, the desktop build and the CDN all
 * serve. sprites/ is not it: every PNG there is an art-library asset that must be catalogued
 * under a taxonomy folder, and a photo of a textbook page is not one. So uploads get a folder
 * of their own, published beside worlds/ (vercel.json, scripts/r2Content.js, main.py).
 *
 * The rules, in the one place both halves of the admin read them:
 *
 *   - The file's type is decided by its bytes, never by the name or the type the browser
 *     claims. PNG, JPEG, WebP and GIF only; SVG is refused because it is a document that can
 *     carry script, not a picture.
 *   - At most MAX_BYTES, which keeps the base64 body under the 4.5 MB a Vercel function will
 *     accept. The designer shrinks a large photo before it uploads.
 *   - The name is the content's own hash plus a readable slug of the original name, so the
 *     same picture uploaded twice is one file, and two different pictures can never collide.
 *
 * Nothing here touches the network: the local server writes the file, and the Vercel function
 * commits it to GitHub and puts it on R2 (api/admin/[...path].js).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MEDIA_DIR = 'media';
const MAX_BYTES = 3 * 1024 * 1024;
const TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif'
};
// What js/richText.js accepts as a picture under media/. Kept in step with its SRC_RE by
// admin/test/test_designer.js.
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}\.(?:png|jpe?g|webp|gif)$/;

/** The type of an image by its first bytes, or '' for anything that is not one we take. */
function sniff(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return '';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
    && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a) return 'png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.toString('ascii', 0, 6) === 'GIF87a' || buf.toString('ascii', 0, 6) === 'GIF89a') return 'gif';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return '';
}

/** Width and height where the header gives them cheaply; null otherwise. For the picker only. */
function dimensions(buf, ext) {
  try {
    if (ext === 'png' && buf.length >= 24) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
    if (ext === 'gif' && buf.length >= 10) return { w: buf.readUInt16LE(6), h: buf.readUInt16LE(8) };
    if (ext === 'webp' && buf.length >= 30) {
      const chunk = buf.toString('ascii', 12, 16);
      if (chunk === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
      if (chunk === 'VP8L') {
        const b = buf.readUInt32LE(21);
        return { w: 1 + (b & 0x3fff), h: 1 + ((b >> 14) & 0x3fff) };
      }
      if (chunk === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
    }
    if (ext === 'jpg') {
      let i = 2;
      while (i + 9 < buf.length) {
        if (buf[i] !== 0xff) { i++; continue; }
        const marker = buf[i + 1];
        const len = buf.readUInt16BE(i + 2);
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
        }
        i += 2 + len;
      }
    }
  } catch (e) { /* a header we cannot read is not a reason to refuse the picture */ }
  return null;
}

// The readable half of the file name: the original name reduced to what a URL and every
// filesystem accept. A Korean file name has nothing left after that, and gets 'image'.
function slugOf(name) {
  const base = String(name || '').replace(/\.[A-Za-z0-9]{1,5}$/, '');
  const slug = base.normalize('NFKD').replace(/[^\x00-\x7f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');
  return slug || 'image';
}

/**
 * An upload body — `{ name, data }`, where `data` is base64 or a `data:` URL — checked and
 * named. Throws with a reason the admin can show as it stands.
 */
function prepareUpload(body) {
  const b = body || {};
  let data = typeof b.data === 'string' ? b.data.trim() : '';
  if (!data) throw new Error('Send the picture as { name, data } with the file base64-encoded.');
  const m = /^data:[^;,]*;base64,/i.exec(data);
  if (m) data = data.slice(m[0].length);
  if (!/^[A-Za-z0-9+/=\s]+$/.test(data)) throw new Error('The picture data is not base64.');
  const buf = Buffer.from(data.replace(/\s+/g, ''), 'base64');
  if (!buf.length) throw new Error('The picture is empty.');
  if (buf.length > MAX_BYTES) {
    throw new Error('That picture is ' + (buf.length / 1048576).toFixed(1) + ' MB; the limit is '
      + (MAX_BYTES / 1048576) + ' MB. Shrink it, or save it as JPEG or WebP.');
  }
  const ext = sniff(buf);
  if (!ext) {
    throw new Error(/<svg/i.test(buf.toString('utf8', 0, 512))
      ? 'SVG is not accepted — it can carry script. Export it as PNG instead.'
      : 'That file is not a PNG, JPEG, WebP or GIF picture.');
  }
  const hash = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);
  const file = slugOf(b.name) + '-' + hash + '.' + ext;
  return {
    buf,
    ext,
    type: TYPES[ext],
    file,
    rel: MEDIA_DIR + '/' + file,
    bytes: buf.length,
    size: dimensions(buf, ext)
  };
}

function typeOf(file) {
  const ext = String(file).split('.').pop().toLowerCase();
  return TYPES[ext === 'jpeg' ? 'jpg' : ext] || '';
}

/** The pictures in media/ on this disk, newest first. */
function listLocal(rootDir) {
  const dir = path.join(rootDir, MEDIA_DIR);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => NAME_RE.test(f) && fs.statSync(path.join(dir, f)).isFile())
    .map((f) => {
      const st = fs.statSync(path.join(dir, f));
      return { src: MEDIA_DIR + '/' + f, name: f, bytes: st.size, modified: st.mtime.toISOString() };
    })
    .sort((a, b) => (a.modified < b.modified ? 1 : a.modified > b.modified ? -1 : a.name.localeCompare(b.name)));
}

/** Write an upload into this checkout's media/. Same bytes, same name: a second upload is a no-op. */
function saveLocal(rootDir, body) {
  const up = prepareUpload(body);
  const dir = path.join(rootDir, MEDIA_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const full = path.join(dir, up.file);
  const existed = fs.existsSync(full);
  if (!existed) {
    const tmp = full + '.tmp-' + process.pid + '-' + Date.now();
    fs.writeFileSync(tmp, up.buf);
    fs.renameSync(tmp, full);
  }
  return {
    src: up.rel, name: up.file, bytes: up.bytes, type: up.type, size: up.size, existed,
    note: existed ? 'That picture was already in media/.' : 'Written to media/. Commit and publish to ship it.'
  };
}

module.exports = { MEDIA_DIR, MAX_BYTES, TYPES, NAME_RE, sniff, dimensions, slugOf, prepareUpload, typeOf, listLocal, saveLocal };
