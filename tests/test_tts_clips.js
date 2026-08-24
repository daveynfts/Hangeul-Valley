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

// ── The filename has to fit ──────────────────────────────────────────────────
// Six hex characters per Korean syllable, so a long enough phrase overruns the 255-byte
// filename limit. Three 40-syllable 교과서 scripts did exactly that and took a publish down
// with ENAMETOOLONG — after `npm run validate` and every suite here had passed, because
// nothing but the publish job ever renders a clip. This is the check that was missing.
const NAME_LIMIT = 255;
const LONG = '오늘 병원에 갔을 때 한국어를 잘못해서 창피한 일이 있었어.'
  + " 의사 선생님을 '의사님'이라고 불러서 사람들이 웃었어.";
assert(Buffer.from(LONG, 'utf8').length * 2 > 240,
  'the sample phrase really is past the cap (' + (Buffer.from(LONG, 'utf8').length * 2) + ' hex chars)');
assert(ttsClipStem(LONG).length + 4 <= NAME_LIMIT,
  'an over-long phrase still names a file that fits (' + (ttsClipStem(LONG).length + 4) + ' bytes)');
assert(/^[0-9a-f]+$/.test(ttsClipStem(LONG)),
  'and the fallback name is still pure hex — listLocalTtsFiles picks clips up with '
  + '/^[0-9a-f]+.mp3$/, so a separator would render a clip that never uploads');
assert(ttsClipStem(LONG) !== ttsClipStem(LONG + '요'), 'two over-long phrases do not share a name');
assert(ttsClipStem(LONG) === ttsClipStem(LONG), 'and a name is stable across calls');

const audioSrc = fs.readFileSync(path.join(ROOT, 'js', 'audio.js'), 'utf8');
assert(audioSrc.indexOf("const TTS_CACHE_KEY = 'sunhi-1'") >= 0, 'js/audio.js cache key matches');
assert(audioSrc.indexOf('function ttsClipStem') >= 0, 'js/audio.js has ttsClipStem');
assert(audioSrc.indexOf('this._playClip') >= 0, 'js/audio.js plays CDN clips first');
assert(audioSrc.indexOf("TTS_CLIP_DIR = 'audio/ko/'") >= 0, 'js/audio.js clip dir is audio/ko/');

// ── Lockstep, by running both rather than by grepping ────────────────────────
// This file used to assert that js/audio.js *contains* a function called ttsClipStem, which
// is not the same as it computing the same name. One side names the file the renderer
// writes and the other names the file the browser asks for; a divergence is a play button
// that 404s, silently, on production only. So the browser copy is lifted out and driven.
const vm = require('vm');
const bFrom = audioSrc.indexOf('const TTS_STEM_MAX');
const bTo = audioSrc.indexOf('function ttsClipUrl');
assert(bFrom > 0 && bTo > bFrom, 'the browser stem helpers are where the suite expects them');
const bctx = {
  TextEncoder: TextEncoder,
  Math: Math
};
vm.createContext(bctx);
vm.runInContext(audioSrc.slice(bFrom, bTo) + '\nthis.stem = ttsClipStem;', bctx);
const browserStem = bctx.stem;
const lockstep = ['체계', '한국어', '가', LONG, LONG + '요', '아프면 참지 말고 병원에 가세요.',
  '기숙사는 여러 사람이 같이 사는 곳이기 때문에 다른 사람에게 불편을 주는 행동을 하면 안 됩니다.']
  .filter((t) => browserStem(t) !== ttsClipStem(t));
assert(lockstep.length === 0, 'js/audio.js and scripts/ttsClips.js compute the same name'
  + (lockstep.length ? ' — differ on: ' + lockstep.map((t) => t.slice(0, 20)).join(' | ') : ''));

// Every phrase the harvest actually wants, not just a sample.
const allPhrases = collectTtsPhrases(ROOT);
const tooLong = allPhrases.filter((p) => ttsClipStem(p).length + 4 > NAME_LIMIT);
assert(tooLong.length === 0, 'every harvested phrase names a file the filesystem will accept'
  + (tooLong.length ? ' — ' + tooLong.length + ' too long, e.g. ' + tooLong[0].slice(0, 40) : ''));
const mismatched = allPhrases.filter((p) => browserStem(p) !== ttsClipStem(p));
assert(mismatched.length === 0, 'and both sides agree on all ' + allPhrases.length + ' of them'
  + (mismatched.length ? ' — ' + mismatched.length + ' differ' : ''));

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
