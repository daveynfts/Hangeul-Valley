/**
 * tests/test_tts_clips.js — clip stem lockstep, phrase harvest, publish flags.
 *
 * Run: node tests/test_tts_clips.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const {
  TTS_VOICE, TTS_RATE, TTS_CACHE_KEY, TTS_DIR_REL,
  ttsClipStem, ttsClipRel, collectTtsPhrases, listLocalTtsFiles
} = require('../scripts/ttsClips');
const { collectUploadFiles, parsePublishArgs, cacheControl } = require('../scripts/r2Content');
const { looksLikeMp3, parseArgs } = require('../scripts/generate_tts');

const ROOT = path.join(__dirname, '..');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

console.log('====================================================');
console.log('TTS CLIPS');
console.log('====================================================\n');

assert(TTS_VOICE === 'ko-KR-SunHiNeural', 'voice is SunHi neural');
assert(TTS_RATE === '-12%', 'rate is slightly slow for learners');
assert(TTS_CACHE_KEY === 'sunhi-1', 'cache key matches js/audio.js');
assert(TTS_DIR_REL === 'audio/ko', 'clip directory is audio/ko');

const gye = ttsClipStem('체계');
assert(/^[0-9a-f]+$/.test(gye), 'stem is lowercase hex');
assert(gye === Buffer.from('체계'.normalize('NFC'), 'utf8').toString('hex'), 'stem is utf8 hex of NFC');
assert(ttsClipStem('체계') === ttsClipStem('체계'.normalize('NFD')), 'NFC and NFD share a stem');
assert(ttsClipRel('체계') === 'audio/ko/' + gye + '.mp3', 'rel path uses hex stem');

const audioSrc = fs.readFileSync(path.join(ROOT, 'js', 'audio.js'), 'utf8');
assert(audioSrc.indexOf("const TTS_CACHE_KEY = 'sunhi-1'") >= 0, 'js/audio.js cache key matches');
assert(audioSrc.indexOf('function ttsClipStem') >= 0, 'js/audio.js has ttsClipStem');
assert(audioSrc.indexOf('this._playClip') >= 0, 'js/audio.js plays CDN clips first');
assert(audioSrc.indexOf("TTS_CLIP_DIR = 'audio/ko/'") >= 0, 'js/audio.js clip dir is audio/ko/');

const phrases = collectTtsPhrases(ROOT);
assert(phrases.length > 1500, 'phrase list is larger than the 1500 headwords (' + phrases.length + ')');
assert(phrases.includes('체계') || phrases.some((p) => p.normalize('NFC') === '체계'), 'includes a levels.json headword');
assert(phrases.includes('한국어'), 'includes the HUD sample word');
assert(phrases.some((p) => p.length === 1 && p.charCodeAt(0) >= 0xac00 && p.charCodeAt(0) <= 0xd7a3),
  'includes isolated Hangul syllables for spell()');

const vercel = fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8');
assert(vercel.indexOf('/audio/:path*') >= 0, 'Vercel rewrites /audio to the CDN');
assert(vercel.indexOf('hangeul-valley/audio/') >= 0, 'CDN destination is hangeul-valley/audio');

assert(cacheControl('audio/mpeg').indexOf('86400') >= 0, 'mp3 cache-control is a day');

const flags = parsePublishArgs(['--skip-tts', '--dry-run']);
assert(flags.skipTts && flags.dryRun, 'publish accepts --skip-tts');
const genFlags = parseArgs(['--force', '--limit', '4']);
assert(genFlags.force && genFlags.limit === 4, 'generate_tts parses --force and --limit');

assert(!looksLikeMp3(Buffer.alloc(10)), 'tiny buffers are not mp3');
assert(looksLikeMp3(Buffer.concat([Buffer.from([0xff, 0xfb]), Buffer.alloc(500)])), 'ff fb frame counts as mp3');

const files = collectUploadFiles(ROOT);
const audioFiles = files.filter((f) => f.rel.startsWith('audio/ko/') && f.ctype === 'audio/mpeg');
assert(audioFiles.every((f) => /^[0-9a-f]+\.mp3$/i.test(path.posix.basename(f.rel))),
  'uploaded clip names are hex.mp3');
const listed = listLocalTtsFiles(ROOT);
assert(listed.length === audioFiles.length, 'upload list matches local mp3 count (' + listed.length + ')');

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
assert(pkg.scripts['tts:generate'], 'package.json has tts:generate');

const yml = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'publish.yml'), 'utf8');
assert(/audio\/ko/.test(yml), 'publish workflow caches audio/ko');

console.log('\n====================================================');
console.log('RESULT: ' + passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
process.exit(failed ? 1 : 0);
