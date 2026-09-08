#!/usr/bin/env node
'use strict';
/**
 * scripts/cassette_timings.js — measure where each transcript line sits inside its track,
 * so the 듣기 script can offer a play button per line instead of only per track.
 *
 * Two numbers per line, `at` and `end`, both seconds into the track. Neither is estimated:
 * a line only gets them when the audio says where it is. Everything else is left alone and
 * reported, because a play button that plays the wrong sentence is worse than no button.
 *
 * ── How a line's span is established ─────────────────────────────────────────
 *
 * 1. ANCHOR. Roughly half the transcript lines also appear in the unit's dictation set,
 *    which ships an isolated mp3 per sentence. Where a clip is a verbatim cut of the track,
 *    correlating the two loudness envelopes finds it exactly. The scores come out bimodal —
 *    104 of 143 at 0.95-1.00, the rest at 0.45-0.79 with nothing in between — so the cut
 *    ones are not a judgement call: the low scorers are sentences re-recorded separately
 *    for dictation, and they are rejected.
 *
 * 2. BRACKET. An unclaimed line with an anchor on each side is pinned between them. Where
 *    exactly one line sits in such a gap, the speech inside the gap IS that line, and its
 *    span is the first sound after the earlier anchor to the last before the next. That is
 *    a measurement, not an inference.
 *
 * 3. LEFT ALONE. Two or more unclaimed lines in a row. The tracks hold more speech segments
 *    than transcript lines — a spoken section header, and sentences broken by internal
 *    pauses — so segments cannot be handed out to lines by counting. This script says which
 *    lines these are and stops; see docs/cassette-timings.md for finishing them by hand.
 *
 * It also syncs each track's `dur` to the file. Those were hand-written labels and unit 15's
 * were out by up to 19%, which is what made a stretch selected before pressing play jump the
 * moment playback started and the real duration replaced the label.
 *
 *   node scripts/cassette_timings.js                 measure and write
 *   node scripts/cassette_timings.js --check         fail if the files are out of date
 *   node scripts/cassette_timings.js --report        print coverage, write nothing
 *   node scripts/cassette_timings.js --unit 15       one unit
 *
 * Needs ffmpeg and ffprobe on PATH. CI has neither, which is why --check is not a CI gate;
 * tests/test_cassette_timings.js checks the shape of what this wrote without decoding audio.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const UNITS = [10, 11, 13, 14, 15];
const SR = 8000;            // envelope work needs no more than this
const HOP = 80;             // one envelope point per 10 ms
const MATCH_MIN = 0.95;     // below the gap in the score distribution, so it rejects re-takes
const SILENCE_DB = -35;
const SILENCE_MIN = 0.30;
const EDGE_PAD = 0.12;      // a hair before the first sound, so a play does not clip the onset

const rel = (p) => path.join(ROOT, p);

// ── Audio ────────────────────────────────────────────────────────────────────
function ffprobeDur(src) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'csv=p=0', rel(src)], { encoding: 'utf8' });
  if (r.error || r.status !== 0) throw new Error('ffprobe failed on ' + src);
  return Number(String(r.stdout).trim());
}

function pcm(src) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', rel(src),
    '-ac', '1', '-ar', String(SR), '-f', 's16le', '-'], { encoding: 'buffer', maxBuffer: 1 << 28 });
  const b = r.stdout || Buffer.alloc(0);
  const n = b.length >> 1;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = b.readInt16LE(i * 2) / 32768;
  return out;
}

function envelope(x) {
  const n = Math.floor(x.length / HOP);
  const e = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = i * HOP; k < (i + 1) * HOP; k++) s += x[k] * x[k];
    e[i] = Math.sqrt(s / HOP);
  }
  return e;
}

function zscore(a) {
  let m = 0;
  for (let i = 0; i < a.length; i++) m += a[i];
  m /= a.length || 1;
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - m) * (a[i] - m);
  s = Math.sqrt(s / (a.length || 1)) || 1e-9;
  const o = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) o[i] = (a[i] - m) / s;
  return o;
}

/** Where `clipEnv` best fits inside `trackEnv`, and how well. Normalised, so a quieter
 *  copy of the same phrase still scores 1. */
function locate(trackEnv, clipEnv) {
  const c = zscore(clipEnv);
  const n = c.length;
  const lim = trackEnv.length - n;
  if (lim < 0 || !n) return { score: -1, at: 0 };
  let best = -2;
  let bi = 0;
  for (let off = 0; off <= lim; off++) {
    let m = 0;
    for (let i = 0; i < n; i++) m += trackEnv[off + i];
    m /= n;
    let sd = 0;
    for (let i = 0; i < n; i++) { const d = trackEnv[off + i] - m; sd += d * d; }
    sd = Math.sqrt(sd / n) || 1e-9;
    let s = 0;
    for (let i = 0; i < n; i++) s += ((trackEnv[off + i] - m) / sd) * c[i];
    s /= n;
    if (s > best) { best = s; bi = off; }
  }
  return { score: Math.round(best * 1000) / 1000, at: bi * HOP / SR };
}

/** Stretches of sound, as [start, end] pairs. */
function speechSpans(src, dur) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', rel(src),
    '-af', 'silencedetect=noise=' + SILENCE_DB + 'dB:d=' + SILENCE_MIN, '-f', 'null', '-'],
    { encoding: 'utf8' });
  const text = r.stderr || '';
  const sil = [];
  const re = /silence_start:\s*(-?[\d.]+)[\s\S]*?silence_end:\s*([\d.]+)/g;
  let m;
  while ((m = re.exec(text))) sil.push([Math.max(0, parseFloat(m[1])), parseFloat(m[2])]);
  const seg = [];
  let cur = 0;
  for (const [s, e] of sil) {
    if (s > cur + 0.01) seg.push([cur, s]);
    cur = Math.max(cur, e);
  }
  if (dur > cur + 0.01) seg.push([cur, dur]);
  return seg.filter(([a, b]) => b - a > 0.15);
}

// ── Content ──────────────────────────────────────────────────────────────────
const normKo = (s) => String(s || '').replace(/\s+/g, '').replace(/[.,!?~…"'‘’“”]/g, '');
const round2 = (n) => Math.round(n * 100) / 100;

function readJson(relPath) {
  const raw = fs.readFileSync(rel(relPath), 'utf8');
  return { data: JSON.parse(raw), eol: raw.indexOf('\r\n') >= 0 ? '\r\n' : '\n' };
}
function serialize(data, eol) {
  return JSON.stringify(data, null, 2).replace(/\n/g, eol) + eol;
}

/**
 * Rebuild one unit's timings. Returns the updated object and a per-line account of how each
 * span was established — the account is the point, not a by-product: it is what says which
 * lines a person still has to do.
 */
function measureUnit(unit, log) {
  const relPath = 'worlds/unit' + unit + '-cassette.json';
  const { data, eol } = readJson(relPath);
  const items = ((data.dictation || {}).items) || [];
  const clipFor = new Map();
  items.forEach((i) => {
    const k = normKo(i.ko);
    if (!clipFor.has(k) && i.audio && i.audio.src) clipFor.set(k, i);
  });

  const account = [];
  for (const t of (data.tracks || [])) {
    if (!t.src || !fs.existsSync(rel(t.src))) {
      log('  trk ' + t.n + ': audio missing, skipped');
      continue;
    }
    const dur = ffprobeDur(t.src);
    t.dur = round2(dur);
    if (!Array.isArray(t.lines) || !t.lines.length) continue;

    // Every line starts from nothing, so a re-run cannot leave a stale span behind after a
    // transcript edit — the whole point of being able to run this again.
    t.lines.forEach((l) => { delete l.at; delete l.end; });

    const wanted = t.lines.filter((l) => clipFor.has(normKo(l.ko)));
    let trackEnv = null;
    if (wanted.length) trackEnv = envelope(pcm(t.src));

    // 1. Anchors.
    t.lines.forEach((l, li) => {
      const it = clipFor.get(normKo(l.ko));
      if (!it || !fs.existsSync(rel(it.audio.src))) return;
      const ce = envelope(pcm(it.audio.src));
      const hit = locate(trackEnv, ce);
      const len = ce.length * HOP / SR;
      if (hit.score < MATCH_MIN) {
        account.push({ unit, trk: t.n, li, how: 'retake', score: hit.score });
        return;
      }
      l.at = round2(Math.max(0, hit.at));
      l.end = round2(Math.min(dur, hit.at + len));
      account.push({ unit, trk: t.n, li, how: 'anchor', score: hit.score });
    });

    // 2. Brackets: exactly one unclaimed line between two anchors.
    const spans = speechSpans(t.src, dur);
    let i = 0;
    while (i < t.lines.length) {
      if (typeof t.lines[i].at === 'number') { i++; continue; }
      let j = i;
      while (j < t.lines.length && typeof t.lines[j].at !== 'number') j++;
      const run = j - i;
      const lo = i > 0 ? t.lines[i - 1].end : 0;
      const hi = j < t.lines.length ? t.lines[j].at : dur;
      if (run === 1) {
        const inside = spans.filter(([s, e]) => s >= lo - 0.05 && e <= hi + 0.05);
        if (inside.length) {
          t.lines[i].at = round2(Math.max(0, inside[0][0] - EDGE_PAD));
          t.lines[i].end = round2(Math.min(dur, inside[inside.length - 1][1]));
          account.push({ unit, trk: t.n, li: i, how: 'bracket', gap: round2(hi - lo) });
        } else {
          account.push({ unit, trk: t.n, li: i, how: 'silent gap' });
        }
      } else {
        for (let k = i; k < j; k++) account.push({ unit, trk: t.n, li: k, how: 'run of ' + run });
      }
      i = j;
    }

    // A span must run forwards and must not overlap its neighbour. This has never fired,
    // and it is here so that it would rather than the transcript quietly playing backwards.
    let prev = -1;
    t.lines.forEach((l, li) => {
      if (typeof l.at !== 'number') return;
      if (!(l.end > l.at) || l.at < prev - 0.05) {
        throw new Error(relPath + ' trk ' + t.n + ' line ' + li + ': span ' + l.at + '-' + l.end
          + ' is not after the line before it (' + prev + ')');
      }
      prev = l.end;
    });
  }
  return { relPath, data, eol, account };
}

function main() {
  const argv = process.argv.slice(2);
  const check = argv.includes('--check');
  const report = argv.includes('--report');
  const only = argv.indexOf('--unit') >= 0 ? Number(argv[argv.indexOf('--unit') + 1]) : 0;
  const units = only ? [only] : UNITS;
  const quiet = (s) => { if (!check) console.log(s); };

  let stale = 0;
  const all = [];
  for (const u of units) {
    quiet('unit ' + u);
    const res = measureUnit(u, quiet);
    all.push(...res.account);
    const text = serialize(res.data, res.eol);
    const had = fs.readFileSync(rel(res.relPath), 'utf8');
    if (text === had) { quiet('  unchanged'); continue; }
    if (check || report) { stale++; quiet('  OUT OF DATE'); continue; }
    fs.writeFileSync(rel(res.relPath), text);
    quiet('  written');
  }

  const by = (how) => all.filter((a) => a.how === how).length;
  const runs = all.filter((a) => /^run of /.test(a.how)).length;
  console.log('\nlines, by how the span was established');
  console.log('  anchor  (clip matched in the track) : ' + by('anchor'));
  console.log('  bracket (alone between two anchors) : ' + by('bracket'));
  console.log('  ---- timed: ' + (by('anchor') + by('bracket')) + ' of ' + all.length);
  console.log('  retake  (clip is a separate take)   : ' + by('retake'));
  console.log('  run of 2+ unclaimed lines           : ' + runs);
  console.log('  silent gap                          : ' + by('silent gap'));
  console.log('\nStill needing a person — see docs/cassette-timings.md:');
  const todo = {};
  all.filter((a) => a.how !== 'anchor' && a.how !== 'bracket').forEach((a) => {
    const k = 'unit' + a.unit + ' trk' + a.trk;
    todo[k] = (todo[k] || 0) + 1;
  });
  const keys = Object.keys(todo);
  keys.forEach((k) => console.log('  ' + k + ': ' + todo[k] + ' line(s)'));
  if (!keys.length) console.log('  nothing — every line is timed');

  if (check && stale) {
    console.error('\ncassette timings are out of date — run: node scripts/cassette_timings.js');
    process.exit(1);
  }
}

if (require.main === module) main();
module.exports = { normKo, locate, envelope, speechSpans, MATCH_MIN };
