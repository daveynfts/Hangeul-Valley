/**
 * scripts/sharedHeadwords.js — a spelling two places share is one word, unless we say otherwise.
 *
 * Progress is kept per spelling (js/systems/wordSenses.js), so a headword that a level and a
 * world both teach shares one record. That is right for 식당 in Unit 14 and in TOPIK II, and
 * wrong for 쓰다 "to write" and 쓰다 "to be bitter", which were sharing one until the second
 * sense was named. Nothing flagged the pair when Unit 10 brought it in.
 *
 * This is the flag. A shared spelling whose glosses have no content word in common is either a
 * second sense, named in WORD_SENSES, or the same word glossed two ways, listed in SAME_WORD
 * below after a person has looked at it. Anything else fails `npm run validate`. The test is
 * deliberately crude — synonyms trip it (refrigerator / a fridge) — because a false alarm costs
 * one line here and a missed homograph costs every learner who meets it.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Looked at and found to be one word glossed two ways. Keyed by spelling.
const SAME_WORD = new Set([
  '먹다', '음료수', '흐리다', '비행기', '이비인후과', '치과', '입학', '평가하다', '동료',
  '환전', '친절하다', '까다롭다', '냉정하다', '매매', '냉장고', '물가', '다양성', '따라서',
  '선택하다', '다양하다', '시키다', '중요하다', '외모', '불편하다', '비슷하다', '노인', '줄다',
  '오르다', '달라지다', '옛날', '외국인'
]);

const STOP = new Set(('a an the to be of or and in on for by with at one some someone something '
  + 'sb sth is are get have do make go become').split(' '));

// British spelling and the commonest endings, so "colour" meets "color" and "relatives" meets
// "a relative". Nothing cleverer: see the note at the top.
function stem(w) {
  w = w.replace(/our$/, 'or').replace(/ise$/, 'ize');
  if (/ies$/.test(w)) return w.slice(0, -3) + 'y';
  if (/(s|x|z|ch|sh)es$/.test(w)) return w.slice(0, -2);
  if (/ing$/.test(w) && w.length > 5) return w.slice(0, -3);
  if (/ed$/.test(w) && w.length > 4) return w.slice(0, -2);
  if (/[^s]s$/.test(w)) return w.slice(0, -1);
  return w;
}

/** The words of a gloss that say what it means. */
function contentWords(gloss) {
  return new Set(String(gloss || '').toLowerCase()
    .replace(/\([^)]*\)/g, ' ')                    // "(of a picture)" qualifies; it does not name
    .replace(/[^a-z ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w))
    .map(stem)
    .filter(Boolean));
}

/** True when two glosses share no content word at all. */
function glossesUnrelated(a, b) {
  const A = contentWords(a), B = contentWords(b);
  if (!A.size || !B.size) return false;
  for (const w of A) if (B.has(w)) return false;
  return true;
}

/** Every vocabulary entry the game schedules: the levels, then each world's own list. */
function vocabularyPlaces(root) {
  const out = [];
  const levels = JSON.parse(fs.readFileSync(path.join(root, 'levels.json'), 'utf8'));
  levels.forEach((lvl, i) => (lvl.words || []).forEach((w) => {
    out.push({ place: 'level ' + (i + 1), worldId: null, ko: w.ko, en: w.en });
  }));
  const dir = path.join(root, 'worlds');
  fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().forEach((f) => {
    let d;
    try { d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { return; }
    const words = d && d.level && Array.isArray(d.level.words) ? d.level.words : null;
    if (!words || typeof d.id !== 'string') return;
    words.forEach((w) => out.push({ place: d.id, worldId: d.id, ko: w.ko, en: w.en }));
  });
  return out.filter((p) => typeof p.ko === 'string' && p.ko);
}

/**
 * What is wrong, as sentences. `senses` is WORD_SENSES and `senseKeyFor` its lookup (both from
 * js/systems/wordSenses.js); `sameWord` defaults to the list above.
 */
function sharedHeadwordProblems(places, senses, senseKeyFor, sameWord) {
  const same = sameWord || SAME_WORD;
  const problems = [];
  const bySpelling = new Map();
  places.forEach((p) => {
    const ko = p.ko.normalize('NFC').trim();
    if (!bySpelling.has(ko)) bySpelling.set(ko, []);
    bySpelling.get(ko).push(p);
  });

  const flagged = new Set();
  for (const [ko, list] of bySpelling) {
    if (new Set(list.map((p) => p.place)).size < 2) continue;
    // Entries that share an identity share a record; only those have to be one word.
    const byKey = new Map();
    list.forEach((p) => {
      const key = senseKeyFor(ko, p.worldId);
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(p);
    });
    for (const group of byKey.values()) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          if (!glossesUnrelated(group[i].en, group[j].en)) continue;
          flagged.add(ko);
          if (same.has(ko)) continue;
          problems.push(`${ko}: "${group[i].en}" (${group[i].place}) and "${group[j].en}" (${group[j].place}) share one record. `
            + 'If they are different words, name the second sense in WORD_SENSES (js/systems/wordSenses.js); '
            + 'if they are one word, add it to SAME_WORD (scripts/sharedHeadwords.js).');
          i = group.length; break;
        }
      }
    }
  }

  // The table and the list have to describe the content as it is now.
  Object.keys(senses).forEach((worldId) => Object.keys(senses[worldId]).forEach((ko) => {
    const here = places.some((p) => p.worldId === worldId && p.ko === ko);
    const elsewhere = places.some((p) => p.ko === ko && p.worldId !== worldId);
    if (!here) problems.push(`WORD_SENSES names ${ko} in ${worldId}, which does not teach it.`);
    else if (!elsewhere) problems.push(`WORD_SENSES names ${ko} in ${worldId}, but no other place spells a word that way.`);
    if (same.has(ko)) problems.push(`${ko} is both a second sense and "the same word" — pick one.`);
  }));
  same.forEach((ko) => {
    if (!flagged.has(ko)) problems.push(`SAME_WORD lists ${ko}, whose glosses no longer conflict — take it off.`);
  });
  return problems;
}

module.exports = { SAME_WORD, contentWords, glossesUnrelated, vocabularyPlaces, sharedHeadwordProblems };
