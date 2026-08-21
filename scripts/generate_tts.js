/**
 * Pre-render Korean vocab as SunHi MP3s for the CDN.
 *
 *   npm run tts:generate
 *   node scripts/generate_tts.js --force
 *
 * Missing clips only, unless --force. Publish calls this before R2 upload.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const {
  ROOT, TTS_VOICE, TTS_RATE, TTS_DIR_REL,
  ttsClipRel, ttsClipPath, collectTtsPhrases
} = require('./ttsClips');

const MIN_BYTES = 400;
const CONCURRENCY = 4;
const RETRIES = 4;

function parseArgs(argv) {
  const flags = { force: false, limit: 0 };
  const list = Array.isArray(argv) ? argv : [];
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a === '--force') flags.force = true;
    else if (a === '--limit') flags.limit = Math.max(0, Number(list[++i]) || 0);
    else throw new Error('Unknown flag: ' + a);
  }
  return flags;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function looksLikeMp3(buf) {
  if (!buf || buf.length < MIN_BYTES) return false;
  return buf[0] === 0xff || (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33);
}

async function audioToBuffer(audio) {
  if (!audio) return Buffer.alloc(0);
  if (Buffer.isBuffer(audio)) return audio;
  if (audio instanceof Uint8Array) return Buffer.from(audio);
  if (typeof audio.arrayBuffer === 'function') return Buffer.from(await audio.arrayBuffer());
  if (typeof Blob !== 'undefined' && audio instanceof Blob) {
    return Buffer.from(await audio.arrayBuffer());
  }
  return Buffer.from(audio);
}

function loadSynthesize() {
  const { UniversalEdgeTTS } = require('edge-tts-universal');
  return async function synthesize(text) {
    const tts = new UniversalEdgeTTS(text, TTS_VOICE, { rate: TTS_RATE, volume: '+0%', pitch: '+0Hz' });
    const result = await tts.synthesize();
    return audioToBuffer(result && result.audio);
  };
}

async function mapPool(items, width, worker) {
  let i = 0;
  const workers = Array.from({ length: Math.min(width, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await worker(items[idx], idx);
    }
  });
  await Promise.all(workers);
}

/**
 * opts.have — a Set of clip paths (as returned by ttsClipRel) that are already published to
 * the CDN. Clips are content-addressed on the hash of the Korean text, so an object that
 * exists on R2 is definitively the clip for that phrase and never needs re-rendering.
 *
 * Without this, a checkout with no audio/ko/ — which is every CI run, since the clips are
 * gitignored — decided it had to render all ~2200 of them. At four concurrent syntheses
 * that overran the publish job's 40-minute cap, and because the job was killed the
 * actions/cache post-step never saved what it had rendered, so the next run started from
 * empty again. Auto-publish could not converge.
 */
async function generateTtsClips(argv, root, opts) {
  const flags = parseArgs(argv);
  const base = root || ROOT;
  const have = (opts && opts.have) || null;
  const dir = path.join(base, TTS_DIR_REL);
  fs.mkdirSync(dir, { recursive: true });

  let phrases = collectTtsPhrases(base);
  if (flags.limit) phrases = phrases.slice(0, flags.limit);

  let onCdn = 0;
  const needed = phrases.filter((text) => {
    if (flags.force) return true;
    if (have && have.has(ttsClipRel(text))) { onCdn++; return false; }
    const full = ttsClipPath(text, base);
    if (!fs.existsSync(full)) return true;
    return fs.statSync(full).size < MIN_BYTES;
  });

  console.log('TTS_PLAN', phrases.length, 'phrases,', needed.length, 'to render,',
    onCdn, 'already on the CDN,', TTS_VOICE, TTS_RATE);
  if (!needed.length) return { phrases: phrases.length, rendered: 0, skipped: phrases.length, onCdn };

  const synthesize = loadSynthesize();
  let rendered = 0;
  const failures = [];

  await mapPool(needed, CONCURRENCY, async (text, idx) => {
    const full = ttsClipPath(text, base);
    let lastErr = 'unknown';
    for (let attempt = 1; attempt <= RETRIES; attempt++) {
      try {
        const buf = await synthesize(text);
        if (!looksLikeMp3(buf)) throw new Error('not an mp3 (' + (buf && buf.length) + 'B)');
        fs.writeFileSync(full, buf);
        rendered++;
        if ((idx + 1) % 25 === 0 || idx === needed.length - 1) {
          console.log('TTS_OK', (idx + 1) + '/' + needed.length, text, buf.length + 'B');
        }
        return;
      } catch (e) {
        lastErr = e && e.message ? e.message : String(e);
        await sleep(400 * attempt);
      }
    }
    failures.push(text + ': ' + lastErr);
    console.error('TTS_FAIL', text, lastErr);
  });

  if (failures.length) {
    throw new Error('TTS render failed for ' + failures.length + ' phrase(s): ' + failures.slice(0, 5).join(' | '));
  }
  return { phrases: phrases.length, rendered, skipped: phrases.length - rendered, onCdn };
}

if (require.main === module) {
  generateTtsClips(process.argv.slice(2)).then((r) => {
    console.log('TTS_DONE', r);
  }).catch((err) => {
    console.error('TTS_GENERATE_FAIL', err && err.message);
    process.exit(1);
  });
}

module.exports = { generateTtsClips, parseArgs, looksLikeMp3 };
