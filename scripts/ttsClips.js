/**
 * Shared Korean clip IDs for pre-rendered SunHi MP3s.
 * The browser copy of the stem lives in js/audio.js — tests assert they match.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TTS_VOICE = 'ko-KR-SunHiNeural';
const TTS_RATE = '-12%';
const TTS_CACHE_KEY = 'sunhi-1';
const TTS_DIR_REL = 'audio/ko';
const EXTRA_PHRASES = ['한국어'];

// A clip is named for its text: the hex of its UTF-8 bytes, six characters per Korean
// syllable. A long enough phrase therefore overruns the 255-byte filename limit every
// filesystem has — which is how three 40-syllable 교과서 scripts took a publish down with
// ENAMETOOLONG after `npm run validate` and the whole suite had passed. Nothing renders the
// clips except the publish job, so nothing else could have caught it; there is an invariant
// for it now in validate_content.js and tests/test_tts_clips.js.
//
// 240 rather than the 251 a name can actually reach: 240 is above the longest stem already
// on the CDN, so nothing that has been rendered gets renamed by this and no clip has to be
// re-rendered. Anything longer than 240 could never have worked in the first place.
const TTS_STEM_MAX = 240;
const TTS_STEM_KEEP = 160;

// FNV-1a plus a second independent 32-bit mix, so the pair come to 64 bits. Number
// arithmetic only, because js/audio.js has to compute the identical name in a browser —
// tests/test_tts_clips.js runs both implementations and asserts they agree.
function ttsHash(bytes) {
  let a = 0x811c9dc5, b = 0x01000193;
  for (let i = 0; i < bytes.length; i++) {
    a = Math.imul(a ^ bytes[i], 0x01000193) >>> 0;
    b = Math.imul(b + bytes[i] + 1, 0x85ebca6b) >>> 0;
    b = ((b << 13) | (b >>> 19)) >>> 0;
  }
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

function ttsClipStem(text) {
  const nfc = String(text || '').normalize('NFC');
  const bytes = Buffer.from(nfc, 'utf8');
  let hex = '';
  for (let i = 0; i < bytes.length; i++) hex += (bytes[i] + 256).toString(16).slice(1);
  if (hex.length <= TTS_STEM_MAX) return hex;
  // Still pure hex, and deliberately so: listLocalTtsFiles picks clips off disk with
  // /^[0-9a-f]+\.mp3$/, so a separator here would render a clip that then never uploads —
  // the silent-failure shape this pipeline has been bitten by twice already.
  return hex.slice(0, TTS_STEM_KEEP) + ttsHash(bytes);
}

function ttsClipRel(text) {
  return TTS_DIR_REL + '/' + ttsClipStem(text) + '.mp3';
}

function ttsClipPath(text, root) {
  return path.join(root || ROOT, ttsClipRel(text));
}

function addKo(out, seen, value) {
  const nfc = String(value || '').normalize('NFC').trim();
  if (!nfc || seen.has(nfc)) return;
  seen.add(nfc);
  out.push(nfc);
}

function walkKo(out, seen, node) {
  if (!node) return;
  if (Array.isArray(node)) {
    node.forEach((item) => walkKo(out, seen, item));
    return;
  }
  if (typeof node !== 'object') return;
  if (typeof node.ko === 'string') addKo(out, seen, node.ko);
  Object.keys(node).forEach((k) => {
    if (k === 'ko') return;
    walkKo(out, seen, node[k]);
  });
}

// The workbook cannot go through walkKo. Every wrong answer on it is a {ko: …}
// too — 하아도 돼요, 먹면 안 돼요, 어려웠을 때 — and rendering those as clean
// spoken Korean would teach them. Only what the page reads aloud is collected:
// the lines as printed, and each script with the correct answers put in.
function fillScript(lines, texts) {
  let slot = 0;
  return (lines || []).map((l) => {
    const parts = String((l && l.ko) || '').split('{}');
    let s = parts[0] || '';
    for (let k = 1; k < parts.length; k++) s += (texts[slot++] || '') + (parts[k] || '');
    return s;
  }).join(' ');
}

// -textbook.json as well as -workbook.json. They are the same file format read by the
// same renderer, and that renderer plays a book clip where the content names one and a
// pre-rendered TTS clip otherwise. A 교과서 page left out of this harvest would come up
// with a play button that does nothing on every row the book has no recording for —
// which is the failure the 어휘 pages hit before this function walked the directory.
function collectWorkbookPhrases(out, seen, base) {
  const dir = path.join(base, 'worlds');
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).filter((f) => /-(?:work|text)book\.json$/.test(f)).sort()
    .forEach((f) => collectOneWorkbook(out, seen, path.join(dir, f)));
}

function collectOneWorkbook(out, seen, full) {
  const book = JSON.parse(fs.readFileSync(full, 'utf8'));
  (book.exercises || []).forEach((ex) => {
    // Only the 'build' pages assemble a sentence worth speaking. The shared-box
    // types put their Korean in the chips, and half of those chips are wrong.
    if (ex.type !== 'build') return;
    const answerKo = (item, key) => {
      const list = key === 'answer2' ? item.choices2 : item.choices;
      const found = (list || []).find((c) => c && c.id === item[key]);
      return found ? found.ko : '';
    };
    (ex.items || []).forEach((item) => {
      (item.lines || []).forEach((l) => {
        if (String((l && l.ko) || '').indexOf('{}') < 0) addKo(out, seen, l.ko);
      });
      addKo(out, seen, fillScript(item.lines,
        [answerKo(item, 'answer'), answerKo(item, 'answer2')]));
    });
    if (ex.example) {
      addKo(out, seen, fillScript(ex.example.lines,
        [ex.example.answerKo || '', ex.example.answer2Ko || '']));
    }
  });
}

function collectTtsPhrases(root) {
  const base = root || ROOT;
  const out = [];
  const seen = new Set();
  const levels = JSON.parse(fs.readFileSync(path.join(base, 'levels.json'), 'utf8'));
  (Array.isArray(levels) ? levels : []).forEach((lvl) => {
    (lvl.words || []).forEach((w) => addKo(out, seen, w && w.ko));
  });
  ['worlds/2b-unit-10.json', 'worlds/2b-unit-11.json', 'worlds/2b-unit-13.json',
    'worlds/2b-unit-14.json', 'worlds/unit10-desk-quiz.json',
    'worlds/unit11-desk-quiz.json', 'worlds/unit13-desk-quiz.json',
    'worlds/unit14-desk-quiz.json'].forEach((rel) => {
    const full = path.join(base, rel);
    if (!fs.existsSync(full)) return;
    walkKo(out, seen, JSON.parse(fs.readFileSync(full, 'utf8')));
  });
  collectWorkbookPhrases(out, seen, base);
  EXTRA_PHRASES.forEach((p) => addKo(out, seen, p));

  const sylSeen = new Set();
  out.slice().forEach((phrase) => {
    String(phrase).normalize('NFC').split('').forEach((ch) => {
      const n = ch.charCodeAt(0);
      if (n < 0xac00 || n > 0xd7a3 || sylSeen.has(ch)) return;
      sylSeen.add(ch);
      addKo(out, seen, ch);
    });
  });
  return out;
}

function listLocalTtsFiles(root) {
  const dir = path.join(root || ROOT, TTS_DIR_REL);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => /^[0-9a-f]+\.mp3$/i.test(name))
    .map((name) => TTS_DIR_REL + '/' + name);
}

module.exports = {
  ROOT,
  TTS_VOICE,
  TTS_RATE,
  TTS_CACHE_KEY,
  TTS_DIR_REL,
  EXTRA_PHRASES,
  ttsClipStem,
  ttsClipRel,
  ttsClipPath,
  collectTtsPhrases,
  listLocalTtsFiles
};
