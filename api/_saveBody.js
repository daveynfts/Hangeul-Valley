'use strict';

// Reading a save PUT's body, kept in its own module for the same reason as _stamp.js: it is
// the part of the save endpoint worth testing directly, and api/save.js cannot be required
// without the AWS SDK. Nothing here imports anything outside Node.
//
// The ceiling used to be 256 KB, and a learner reaches that. Every word studied adds a record
// per modality — a word learned on the farm carries three — so a save passes 256 KB somewhere
// around 550–800 words, out of 3,183 in the game. From then on every PUT came back 413, the
// client filed it as a plain HTTP failure that is not worth retrying, and cloud sync simply
// stopped for exactly the players who had most to lose: the only trace was the "not synced"
// chip. The whole game studied on all three modalities is about 1.3 MB of JSON.
//
// So the ceiling is on the save itself and sized for the whole game with room to grow, and the
// client now compresses what it sends. A save is the same few keys repeated thousands of times
// and gzip takes it down about twelvefold: the whole game is around 100 KB on the wire. The
// compressed body travels as application/octet-stream with X-Save-Encoding: gzip rather than
// as Content-Encoding on a JSON body, because the platform parses a JSON body itself and would
// try to read the gzip bytes as text before this code ever saw them.

const zlib = require('zlib');

// The save once inflated. Four times the whole game as it stands today.
const SAVE_JSON_MAX = 4 * 1024 * 1024;
// What may arrive on the wire. Vercel refuses a request body past 4.5 MB before this runs; the
// check here is for the runtimes that do not, and for a compressed body, which is far smaller.
const SAVE_WIRE_MAX = 4 * 1024 * 1024;

function tooLarge() {
  const err = new Error('save too large');
  err.status = 413;
  return err;
}

function gzipped(req, buf) {
  const h = String((req && req.headers && req.headers['x-save-encoding']) || '').toLowerCase();
  if (h === 'gzip') return true;
  // The magic number as well as the header, so a proxy that drops an unknown header does not
  // turn a compressed save into a JSON parse error.
  return !!buf && buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b;
}

async function rawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (req.body instanceof Uint8Array) return Buffer.from(req.body);
  if (typeof req.body === 'string') return Buffer.from(req.body, 'utf8');
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > SAVE_WIRE_MAX) throw tooLarge();
    chunks.push(c);
  }
  return chunks.length ? Buffer.concat(chunks) : null;
}

/**
 * The save object a PUT carries, or null when there is none or it does not parse.
 * Throws an error with status 413 when it is over either ceiling — including a compressed
 * body that would inflate past SAVE_JSON_MAX, which is refused while inflating rather than
 * after, so a small hostile body cannot make the function allocate without bound.
 */
async function readSaveBody(req) {
  const parsed = req && req.body;
  if (parsed && typeof parsed === 'object' && !Buffer.isBuffer(parsed) && !(parsed instanceof Uint8Array)) {
    // A client that does not compress sent plain JSON, and the platform has parsed it already.
    if (Buffer.byteLength(JSON.stringify(parsed)) > SAVE_JSON_MAX) throw tooLarge();
    return parsed;
  }
  let buf = await rawBody(req);
  if (!buf || !buf.length) return null;
  if (buf.length > SAVE_WIRE_MAX) throw tooLarge();
  if (gzipped(req, buf)) {
    try {
      buf = zlib.gunzipSync(buf, { maxOutputLength: SAVE_JSON_MAX });
    } catch (e) {
      if (e && (e.code === 'ERR_BUFFER_TOO_LARGE' || e instanceof RangeError)) throw tooLarge();
      return null;
    }
  } else if (buf.length > SAVE_JSON_MAX) {
    throw tooLarge();
  }
  try { return JSON.parse(buf.toString('utf8')); } catch { return null; }
}

module.exports = { SAVE_JSON_MAX, SAVE_WIRE_MAX, readSaveBody };
