'use strict';

/**
 * The radio banks — worlds/<unit>-cassette.json.
 *
 * These had no admin route at all until the content registry, which is why they are the one
 * kind here whose validator is new rather than lifted out of an existing save function.
 *
 * Everything below is checkable from the file alone. The claims that are *not* — that a clip
 * really is a recording of the sentence printed beside it — need the mp3, and the per-unit
 * suites verify those by pace instead (see docs/cassette-dictation.md). So this refuses the
 * shapes a person can get wrong while typing, and leaves the acoustic claims to the tests
 * that can actually measure them.
 */

const SYL = /[가-힣]/g;

function syllables(s) {
  const m = String(s == null ? '' : s).normalize('NFC').match(SYL);
  return m ? m.length : 0;
}

function str(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function validateCassette(body) {
  if (!body || typeof body !== 'object') throw new Error('Cassette body must be an object');
  if (!str(body.unit)) throw new Error('Cassette must say which unit it belongs to');
  const tracks = Array.isArray(body.tracks) ? body.tracks : null;
  if (!tracks || !tracks.length) throw new Error('Cassette must include a tracks array');

  const seenN = new Set();
  const seenSrc = new Set();
  const scripted = new Set();
  tracks.forEach((t, i) => {
    const at = `Track ${i + 1}`;
    if (typeof t.n !== 'number' || t.n <= 0) throw new Error(`${at}: needs a track number`);
    if (seenN.has(t.n)) throw new Error(`${at}: duplicate track number ${t.n}`);
    seenN.add(t.n);
    if (!/^audio\/book\/[A-Za-z0-9._-]+\.mp3$/.test(str(t.src))) {
      throw new Error(`${at}: src must be a file under audio/book/ (got "${t.src}")`);
    }
    if (seenSrc.has(t.src)) throw new Error(`${at}: two tracks share ${t.src}`);
    seenSrc.add(t.src);
    if (typeof t.dur !== 'number' || !(t.dur > 0)) throw new Error(`${at}: needs a positive duration`);
    if (!str(t.sec) || !str(t.secEn)) throw new Error(`${at}: needs to say which section of the book it is`);
    if (Array.isArray(t.lines)) {
      if (!t.lines.length) throw new Error(`${at}: a scripted track needs at least one line`);
      t.lines.forEach((l, k) => {
        if (!str(l && l.ko)) throw new Error(`${at} line ${k + 1}: needs Korean`);
        // The speaker slot has to exist so the two-column layout stays put, but it may be
        // empty: Unit 14's track 48 is a announcement read by one unnamed voice, and giving
        // it a speaker would invent a person the book never names. Present, possibly blank.
        if (typeof (l && l.who) !== 'string') throw new Error(`${at} line ${k + 1}: needs a speaker slot`);
      });
      // A note explaining the absence of a script, on a track that has one, is left over from
      // an edit and will be shown to the learner under a script they can plainly see.
      if (str(t.noteEn)) throw new Error(`${at}: has a script, so it must not also carry noteEn`);
      scripted.add(t.n);
    } else if (str(t.noteEn).length < 20) {
      throw new Error(`${at}: has no script, so it must explain why rather than going blank`);
    }
  });

  const dict = body.dictation || {};
  const items = Array.isArray(dict.items) ? dict.items : [];
  const printed = tracks.filter((t) => Array.isArray(t.lines))
    .flatMap((t) => t.lines.map((l) => String(l.ko).normalize('NFC')));
  const clips = new Set();
  items.forEach((it, i) => {
    const at = `Dictation ${i + 1}`;
    if (it.id !== i + 1) throw new Error(`${at}: ids must run 1..n in order (found ${it.id})`);
    ['ko', 'en', 'why'].forEach((k) => {
      if (!str(it[k])) throw new Error(`${at}: needs ${k}`);
    });
    if (!Array.isArray(it.tags) || !it.tags.length) throw new Error(`${at}: needs at least one tag`);
    if (!scripted.has(it.track)) throw new Error(`${at}: track ${it.track} has no printed script to draw from`);
    const real = syllables(it.ko);
    if (it.syl !== real) throw new Error(`${at}: says ${it.syl} syllables but the text has ${real}`);
    const src = str(it.audio && it.audio.src);
    if (!/^audio\/book\/[A-Za-z0-9._-]+\.mp3$/.test(src)) throw new Error(`${at}: needs a clip under audio/book/`);
    if (clips.has(src)) throw new Error(`${at}: two sentences share the clip ${src}`);
    clips.add(src);
    const voiced = it.audio && it.audio.voiced;
    if (typeof voiced !== 'number' || !(voiced > 0)) throw new Error(`${at}: needs the voiced length of its clip`);
    // The stored pace is what the per-unit suites band-check, so a stale one turns a real
    // verification into a tautology.
    const rate = real / voiced;
    if (typeof it.audio.rate !== 'number' || Math.abs(rate - it.audio.rate) > 0.05) {
      throw new Error(`${at}: stored pace ${it.audio.rate} does not match ${rate.toFixed(2)} syl/s`);
    }
    // A split row makes a claim about the turn it came out of, and the claim is checkable.
    if (it.splitFrom !== undefined) {
      const parent = String(it.splitFrom).normalize('NFC');
      if (parent.indexOf(String(it.ko).normalize('NFC')) < 0) {
        throw new Error(`${at}: is not actually a part of the turn it names`);
      }
    }
    // Every sentence has to be a line the book prints, or a piece of one.
    const ko = String(it.ko).normalize('NFC');
    if (!printed.some((p) => p.indexOf(ko) >= 0)) {
      throw new Error(`${at}: "${it.ko}" is not a printed line, or part of one`);
    }
  });

  return body;
}

module.exports = { validateCassette, syllables };
