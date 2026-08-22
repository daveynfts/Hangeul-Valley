/**
 * tests/test_publish_tts_skip.js — publish must not re-render clips the CDN already has.
 *
 * The Korean clips are gitignored, so every CI checkout starts with an empty `audio/ko/`.
 * `generateTtsClips` decided what to render purely from `fs.existsSync`, so it set out to
 * synthesize all ~2200 of them through edge-tts at four at a time. That overran the publish
 * job's 40-minute cap, and because the job was killed the `actions/cache` post-step never
 * saved what it had rendered — so the next run started from empty too. Auto-publish could
 * not converge, and every merge to main left production undeployed.
 *
 * The clip filename hashes the phrase, so an object already on R2 is definitively that
 * phrase's clip. Publish now reads the CDN listing once and uses it to skip both the render
 * and the re-upload. These tests pin that, and pin the one case where the filename is not
 * enough: a forced re-render (voice or rate change) keeps the name but changes the bytes,
 * and must still upload.
 *
 * No network: the CDN listing is built by hand.
 *
 * Run: node tests/test_publish_tts_skip.js
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const { dropPublishedClips } = require('../scripts/r2Content');
const { generateTtsClips } = require('../scripts/generate_tts');
const { ttsClipRel, collectTtsPhrases, TTS_DIR_REL } = require('../scripts/ttsClips');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}
function eq(actual, expected, msg) {
  assert(actual === expected, msg + ' (got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected) + ')');
}

function tmpdir(tag) {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'hv-' + tag + '-'));
}

// ── 1. Which clips still need uploading ──────────────────────────────────────
console.log('\n--- 1. dropPublishedClips ---');
{
  const base = tmpdir('plan');
  fs.mkdirSync(path.join(base, TTS_DIR_REL), { recursive: true });
  const clip = (name, bytes) => fs.writeFileSync(path.join(base, TTS_DIR_REL, name), Buffer.alloc(bytes));
  clip('aaaa.mp3', 1000);   // on the CDN at the same size
  clip('bbbb.mp3', 2222);   // on the CDN, but re-rendered since
  clip('dddd.mp3', 1000);   // not on the CDN yet
  fs.writeFileSync(path.join(base, 'levels.json'), '[]');

  const plan = [
    { rel: 'levels.json', ctype: 'application/json' },
    { rel: 'sprites/ui/gold_coin.png', ctype: 'image/png' },
    { rel: TTS_DIR_REL + '/aaaa.mp3', ctype: 'audio/mpeg' },
    { rel: TTS_DIR_REL + '/bbbb.mp3', ctype: 'audio/mpeg' },
    { rel: TTS_DIR_REL + '/cccc.mp3', ctype: 'audio/mpeg' },
    { rel: TTS_DIR_REL + '/dddd.mp3', ctype: 'audio/mpeg' }
  ];
  const onCdn = new Map([
    [TTS_DIR_REL + '/aaaa.mp3', 1000],
    [TTS_DIR_REL + '/bbbb.mp3', 1000],
    [TTS_DIR_REL + '/cccc.mp3', 1000]
  ]);

  const kept = dropPublishedClips(plan, onCdn, base).map((f) => f.rel);
  assert(!kept.includes(TTS_DIR_REL + '/aaaa.mp3'), 'an identical clip already on the CDN is not re-uploaded');
  assert(kept.includes(TTS_DIR_REL + '/bbbb.mp3'), 'a re-rendered clip is uploaded even though the name matches');
  assert(!kept.includes(TTS_DIR_REL + '/cccc.mp3'), 'a clip on the CDN but absent locally is skipped, not a missing-file error');
  assert(kept.includes(TTS_DIR_REL + '/dddd.mp3'), 'a brand-new clip is uploaded');
  assert(kept.includes('levels.json') && kept.includes('sprites/ui/gold_coin.png'),
    'non-clip files are never filtered — they change in place');
  eq(dropPublishedClips(plan, new Map(), base).length, plan.length, 'an empty CDN keeps the whole plan');

  fs.rmSync(base, { recursive: true, force: true });
}

// ── 2. A fresh CI checkout renders nothing ───────────────────────────────────
console.log('\n--- 2. The CI condition: no local clips, CDN already populated ---');
(async () => {
  // Only the phrase sources are copied. audio/ko/ is deliberately absent, which is exactly
  // what actions/checkout produces.
  const base = tmpdir('ci');
  for (const rel of ['levels.json', 'worlds/2b-unit-10.json',
                     'worlds/2b-unit-14.json', 'worlds/unit10-desk-quiz.json',
                     'worlds/unit14-desk-quiz.json']) {
    const src = path.join(__dirname, '..', rel);
    if (!fs.existsSync(src)) continue;
    fs.mkdirSync(path.dirname(path.join(base, rel)), { recursive: true });
    fs.copyFileSync(src, path.join(base, rel));
  }

  const phrases = collectTtsPhrases(base);
  assert(phrases.length > 1000, 'the phrase list is the real one (' + phrases.length + ' phrases)');

  const allOnCdn = new Map(phrases.map((p) => [ttsClipRel(p), 5000]));
  const full = await generateTtsClips([], base, { have: allOnCdn });
  eq(full.rendered, 0, 'nothing is rendered when the CDN has every clip');
  eq(full.onCdn, phrases.length, 'every phrase resolved to a published clip');

  // A phrase absent from the CDN must fall through to the local check rather than being
  // quietly treated as done. Staged with the clip present on disk so the assertion never
  // calls edge-tts — this suite must not depend on the network.
  const missingOne = new Map(allOnCdn);
  missingOne.delete(ttsClipRel(phrases[0]));
  fs.mkdirSync(path.join(base, TTS_DIR_REL), { recursive: true });
  fs.writeFileSync(path.join(base, ttsClipRel(phrases[0])), Buffer.alloc(9000));

  const partial = await generateTtsClips(['--limit', '1'], base, { have: missingOne });
  eq(partial.phrases, 1, '--limit still narrows the phrase list');
  eq(partial.onCdn, 0, 'a phrase absent from the CDN is not counted as published');
  eq(partial.rendered, 0, 'and it is satisfied by the local clip instead of being re-rendered');

  // With no CDN listing at all — the offline fallback — the local check alone decides.
  const localOnly = await generateTtsClips(['--limit', '1'], base, { have: null });
  eq(localOnly.rendered, 0, 'with no CDN listing a present local clip is still not re-rendered');
  eq(localOnly.onCdn, 0, 'and nothing is attributed to the CDN');

  // Deliberately not asserted here: the MIN_BYTES floor that re-renders a truncated clip.
  // That path ends in a real edge-tts call, and this suite stays offline.

  fs.rmSync(base, { recursive: true, force: true });

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error('  [FAIL] threw: ' + (e && e.message));
  console.log('\n' + passed + ' passed, ' + (failed + 1) + ' failed');
  process.exit(1);
});
