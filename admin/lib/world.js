const fs = require('fs');
const path = require('path');
const { atomicWriteJson } = require('./atomicWrite');

// Unit 10's names are kept for the three getters that predate the content registry —
// api/unit10/[kind].js answers on those URLs and admin/public/js/app.js calls them. The
// registry in ./content.js addresses every world by path instead, so nothing new should
// reach for these.
const LAYOUT_REL = path.join('worlds', 'unit10-layout.json');
const QUIZ_REL = path.join('worlds', 'unit10-desk-quiz.json');
const WORLD_REL = path.join('worlds', '2b-unit-10.json');

// The stations the farm can actually spawn, from _applyWorldPack in js/scenes/farm.js. This
// used to be ['desk', 'kitchen', 'taste'] with saveLayout demanding exactly three of them,
// which meant that once Unit 10 gained a cassette player the admin could no longer save the
// layout file it ships: open the editor, press Save, get "Layout must include exactly 3
// stations". A frozen list of what existed at the time is how that happens, so
// validate_content.js now checks this list against WORLD_PACKS rather than trusting it.
const STATION_IDS = ['desk', 'kitchen', 'taste', 'cassette'];

function writeJson(rel, data, rootDir) {
  const json = JSON.stringify(data, null, 2) + '\n';
  JSON.parse(json);
  const dest = path.join(rootDir, rel);
  atomicWriteJson(dest, json);
}

function readJson(rel, rootDir) {
  const full = path.join(rootDir, rel);
  if (!fs.existsSync(full)) throw new Error(`${rel} not found`);
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

// ── Validators ───────────────────────────────────────────────────────────────
// Each returns the normalised body and touches no disk. That split is what lets the same
// rules run in a Vercel function, where the filesystem is read-only and the write goes to
// GitHub and R2 instead.

function validateLayout(body) {
  if (!body || typeof body !== 'object') throw new Error('Layout body must be an object');
  if (!Array.isArray(body.stations) || !body.stations.length) {
    throw new Error('Layout must include at least one station');
  }
  const seen = new Set();
  body.stations.forEach((s) => {
    if (!s || !STATION_IDS.includes(s.id)) {
      throw new Error(`Unknown station id: ${s && s.id} (known: ${STATION_IDS.join(', ')})`);
    }
    if (seen.has(s.id)) throw new Error(`Duplicate station id: ${s.id}`);
    seen.add(s.id);
    ['ox', 'oy'].forEach((k) => {
      if (typeof s[k] !== 'number' || Number.isNaN(s[k])) throw new Error(`${s.id}.${k} must be a number`);
    });
    if (s.scale != null && (typeof s.scale !== 'number' || s.scale <= 0)) throw new Error(`${s.id}.scale must be > 0`);
  });
  // The file is a placement table shared by every unit, so it must carry a spot for any
  // station a world can ask for. A world naming a station with no placement spawns it at the
  // default coordinates on top of whatever is already there.
  const absent = STATION_IDS.filter((id) => !seen.has(id));
  if (absent.length) throw new Error(`Missing a placement for: ${absent.join(', ')}`);
  return {
    version: 1,
    farm: body.farm || { w: 180, h: 312 },
    stations: body.stations.map((s) => ({
      id: s.id,
      nameKo: String(s.nameKo || ''),
      nameEn: String(s.nameEn || ''),
      ox: Math.round(s.ox),
      oy: Math.round(s.oy),
      scale: typeof s.scale === 'number' ? s.scale : 1,
      originX: typeof s.originX === 'number' ? s.originX : 0.5,
      interact: typeof s.interact === 'number' ? s.interact : 72
    }))
  };
}

function validateQuiz(body) {
  if (!body || !Array.isArray(body.questions)) throw new Error('Quiz must include a questions array');
  const qs = body.questions;
  if (qs.length < 1) throw new Error('Quiz needs at least one question');
  const ids = new Set();
  qs.forEach((q, i) => {
    if (!q || !q.q || !q.a || !q.choices) throw new Error(`Question ${i + 1} is incomplete`);
    if (!['A', 'B', 'C', 'D'].includes(q.a)) throw new Error(`Question ${i + 1} answer must be A–D`);
    ['A', 'B', 'C', 'D'].forEach((k) => {
      if (!q.choices[k]) throw new Error(`Question ${i + 1} missing choice ${k}`);
    });
    const id = typeof q.id === 'number' ? q.id : i + 1;
    if (ids.has(id)) throw new Error(`Duplicate question id ${id}`);
    ids.add(id);
  });
  return {
    titleKo: body.titleKo || '학습 책상',
    titleEn: body.titleEn || 'Study desk',
    sessionSize: Math.max(1, Math.min(20, Number(body.sessionSize) || 5)),
    doneKo: body.doneKo || '오늘 공부 끝!',
    againKo: body.againKo || '한 번 더',
    closeKo: body.closeKo || '책상 닫기',
    correctKo: body.correctKo || '맞아요!',
    wrongKo: body.wrongKo || 'Answer:',
    questions: qs.map((q, i) => ({
      id: typeof q.id === 'number' ? q.id : i + 1,
      q: String(q.q),
      a: q.a,
      choices: { A: String(q.choices.A), B: String(q.choices.B), C: String(q.choices.C), D: String(q.choices.D) }
    }))
  };
}

// Deliberately as strict as scripts/validate_content.js is about a word list. An admin that
// can save something CI then rejects is an admin that breaks the build from a text box —
// and with writes going straight to R2 as well, it would break the build *and* ship the
// broken copy. So every rule the pipeline enforces later is enforced here first.
function validateWorld(body) {
  if (!body || !body.level || !Array.isArray(body.level.words)) {
    throw new Error('World must include level.words');
  }
  const words = body.level.words;
  const thin = words
    .filter((w) => !w || !w.ko || !w.en || !w.category || !w.categoryEn || !w.hint)
    .map((w) => (w && w.ko) || '?');
  if (thin.length) {
    throw new Error(`${thin.length} word(s) missing ko / en / category / categoryEn / hint: ${thin.slice(0, 5).join(', ')}`);
  }
  const kos = words.map((w) => String(w.ko).normalize('NFC'));
  const dups = [...new Set(kos.filter((k, i) => kos.indexOf(k) !== i))];
  if (dups.length) throw new Error(`Repeated headword in this world: ${dups.slice(0, 5).join(', ')}`);
  // A word may list the extra shapes it wears in a sentence, which the answer-view glosses
  // match on. Anything under two characters is dropped by that index, so accepting one here
  // stores a form that looks like it works and never does.
  words.forEach((w) => {
    if (w.forms === undefined) return;
    if (!Array.isArray(w.forms) || !w.forms.length) throw new Error(`${w.ko}: forms must be a non-empty array`);
    w.forms.forEach((f) => {
      if (typeof f !== 'string' || f.trim().length < 2) throw new Error(`${w.ko}: form "${f}" is too short to ever match`);
    });
  });
  // The example sentence, and the translation printed under it. Blank is the right answer for
  // most words — scripts/vocab_examples.js only fills what it can find in the question banks —
  // so what is refused here is a translation with nothing above it, and a sentence that still
  // has an exercise's blank in it.
  words.forEach((w) => {
    ['example', 'exampleEn'].forEach((f) => {
      if (w[f] !== undefined && typeof w[f] !== 'string') {
        throw new Error(`${w.ko}: ${f} must be a string`);
      }
    });
    const ex = String(w.example || '').trim();
    if (ex.indexOf('{}') >= 0) throw new Error(`${w.ko}: the example still has a blank in it`);
    if (!ex && String(w.exampleEn || '').trim()) {
      throw new Error(`${w.ko}: exampleEn has no example to translate`);
    }
  });
  // The notebook names the groups the vocabulary is filed under, and the two have to agree in
  // both directions — a category with no group is a word filed nowhere, a group with no
  // category is an empty page. Units 11 and 14 spell it `groups`, Units 10 and topik-2 spell
  // it `mindmap`; both are read the same way.
  const nb = body.notebook || {};
  const declared = (Array.isArray(nb.mindmap) ? nb.mindmap : (Array.isArray(nb.groups) ? nb.groups : null));
  if (declared) {
    const named = declared.map((g) => g && g.cat);
    const inUse = [...new Set(words.map((w) => w.category))];
    const orphanWord = inUse.filter((c) => !named.includes(c));
    const orphanGroup = named.filter((c) => !inUse.includes(c));
    if (orphanWord.length) throw new Error(`Category with no notebook group: ${orphanWord.join(', ')}`);
    if (orphanGroup.length) throw new Error(`Notebook group no word uses: ${orphanGroup.join(', ')}`);
  }
  return body;
}

// ── Read and write ───────────────────────────────────────────────────────────

function getLayout(rootDir) { return readJson(LAYOUT_REL, rootDir); }
function getQuiz(rootDir) { return readJson(QUIZ_REL, rootDir); }
function getWorld(rootDir) { return readJson(WORLD_REL, rootDir); }

function saveLayout(body, rootDir) {
  const next = validateLayout(body);
  writeJson(LAYOUT_REL, next, rootDir);
  return next;
}

function saveQuiz(body, rootDir) {
  const next = validateQuiz(body);
  writeJson(QUIZ_REL, next, rootDir);
  return next;
}

function saveWorld(body, rootDir) {
  const next = validateWorld(body);
  writeJson(WORLD_REL, next, rootDir);
  return { wordCount: next.level.words.length, id: next.id };
}

module.exports = {
  getLayout, saveLayout, getQuiz, saveQuiz, getWorld, saveWorld,
  validateLayout, validateQuiz, validateWorld,
  STATION_IDS, LAYOUT_REL, QUIZ_REL, WORLD_REL
};
