// ═══════════════ ONE SPELLING, TWO WORDS ══════════════════════════════════════
//
// Progress, harvest counts, the plots and the word-origin cards all find a word by its
// spelling. That was sound while the 25 levels were the whole game and every headword in them
// was unique. The textbook and exam worlds brought their own vocabulary, and a few of their
// words are spelled like a level's word without being the same word:
//
//   쓰다        "to write" (level 1)        and "to be bitter" (Unit 10, tastes)
//   배가 아프다  "to be envious" (level 21)  and "to have a stomachache" (Unit 11, symptoms)
//   거리        "distance" (Unit 13)         and "a street" (TOPIK II)
//   사고        "thinking" (level 22, 思考)  and "an accident" (TOPIK II, 事故)
//
// Sharing a spelling, each pair shared one record: learning that 쓰다 is bitter marked "to
// write" as learned, a review could test the sense the player had never met, and TOPIK's
// accident showed the origin of 思考, "to think, to examine".
//
// The second sense of each is named here, by the world that teaches it, and its identity
// becomes `<spelling>#<tag>`. Everything else about the word — how it is shown, typed, spoken
// and illustrated — still reads `ko`. A word the table does not name keeps its spelling as its
// identity, so a headword two places share *as the same word* (식당 in Unit 14 and in TOPIK II)
// still has one record, as it should.
//
// It lives in code rather than in the world files so that it ships with the build that reads
// it: world JSON reaches the CDN after the JavaScript does (README, Deployment).
// scripts/validate_content.js refuses a new pair whose glosses have nothing in common until it
// is either named here or listed there as the same word.

const WORD_SENSES = {
  '2b-unit-10': { '쓰다': 'bitter' },
  '2b-unit-11': { '배가 아프다': 'stomachache' },
  'topik-2': { '거리': 'street', '사고': 'accident' }
};
const SENSE_SEP = '#';

/** The identity a word from `worldId` spelled `ko` goes by. */
function senseKeyFor(ko, worldId) {
  const tags = worldId && Object.prototype.hasOwnProperty.call(WORD_SENSES, worldId) ? WORD_SENSES[worldId] : null;
  const tag = tags && Object.prototype.hasOwnProperty.call(tags, ko) ? tags[ko] : '';
  return tag ? ko + SENSE_SEP + tag : ko;
}

/** A word object's identity: its sense key where it has one, else its spelling. */
function wordKey(w) {
  if (!w) return '';
  return String(w.key || w.ko || '');
}

/** Called as a world joins the level list: marks the words the table names. */
function stampWordKeys(words, worldId) {
  if (!Array.isArray(words)) return 0;
  let n = 0;
  words.forEach((w) => {
    if (!w || typeof w.ko !== 'string') return;
    const key = senseKeyFor(w.ko, worldId);
    if (key !== w.ko) { w.key = key; n++; }
  });
  return n;
}

/** Every split the table makes, as `senseSplits` names them. A new game starts with all applied. */
function senseSplitIds() {
  const out = [];
  Object.keys(WORD_SENSES).forEach((worldId) => {
    Object.keys(WORD_SENSES[worldId]).forEach((ko) => out.push(worldId + '|' + ko));
  });
  return out;
}

// A save made before a split holds the pair's shared record under the bare spelling, and there
// is no telling which sense it was earned on: the attempt log and the plots name only the
// spelling. So a player who has been in the world that teaches the second sense keeps the record
// on both — nobody loses progress — while one who never went there cannot have learned it there,
// and the second sense starts new. Each split is applied to a save once, named in
// `senseSplits`, so a pair added later is carried the same way without a version step.
function applySenseSplits(data) {
  if (!data || typeof data !== 'object') return 0;
  const done = new Set(Array.isArray(data.senseSplits) ? data.senseSplits.filter((s) => typeof s === 'string') : []);
  // A save from before world ids cannot say where the player has been: keep the record on both.
  const knowsWorlds = Array.isArray(data.visitedWorlds);
  const visited = new Set((knowsWorlds ? data.visitedWorlds : []).concat(data.lastWorld || []));
  let carried = 0;
  Object.keys(WORD_SENSES).forEach((worldId) => {
    Object.keys(WORD_SENSES[worldId]).forEach((ko) => {
      const id = worldId + '|' + ko;
      if (done.has(id)) return;
      done.add(id);
      if (knowsWorlds && !visited.has(worldId)) return;
      const key = senseKeyFor(ko, worldId);
      const srs = data.srs && typeof data.srs === 'object' ? data.srs : null;
      if (srs && srs[ko] && !srs[key]) { srs[key] = JSON.parse(JSON.stringify(srs[ko])); carried++; }
      const h = data.harvests && typeof data.harvests === 'object' ? data.harvests : null;
      if (h && h[ko] && !h[key]) h[key] = h[ko];
    });
  });
  data.senseSplits = Array.from(done);
  return carried;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WORD_SENSES, SENSE_SEP, senseKeyFor, wordKey, stampWordKeys, senseSplitIds, applySenseSplits };
}
