const fs = require('fs');
const path = require('path');
const { syncLevels, getPaths } = require('./sync');

function readLevelsFile(rootDir) {
  const paths = getPaths(rootDir);
  if (!fs.existsSync(paths.levelsPath)) {
    throw new Error(`levels.json not found at ${paths.levelsPath}`);
  }
  const content = fs.readFileSync(paths.levelsPath, 'utf8');
  return JSON.parse(content);
}

function getLevels(rootDir) {
  return readLevelsFile(rootDir);
}

function getLevelByNum(levelNum, rootDir) {
  const num = Number(levelNum);
  const levels = readLevelsFile(rootDir);
  const levelObj = levels.find(l => Number(l.level) === num);
  return levelObj || null;
}

// The whole file at once, checked and not written. The word-level routes below are what the
// local editor uses; this is what the content registry hands the Vercel function, where there
// is no disk to write to and the same rules still have to hold.
//
// The two totals are pinned rather than left as "some levels with some words", because they
// are the shape the game and scripts/validate_content.js both assume. A save that quietly
// dropped a level would pass every structural check without them.
const LEVEL_COUNT = 25;
const WORD_COUNT = 1500;

function validateLevels(body) {
  const levels = Array.isArray(body) ? body : (body && Array.isArray(body.levels) ? body.levels : null);
  if (!levels) throw new Error('levels.json must be an array of levels');
  if (levels.length !== LEVEL_COUNT) throw new Error(`Expected ${LEVEL_COUNT} levels, got ${levels.length}`);
  const seen = new Map();
  const thin = [];
  let total = 0;
  levels.forEach((lvl, i) => {
    if (!lvl || typeof lvl !== 'object') throw new Error(`Level ${i + 1} is not an object`);
    const words = Array.isArray(lvl.words) ? lvl.words : null;
    if (!words) throw new Error(`Level ${lvl.level || i + 1} has no words array`);
    total += words.length;
    words.forEach((w, k) => {
      if (!w || !w.ko || !w.en || !w.category) { thin.push(`level ${lvl.level || i + 1} word ${k + 1} is missing ko / en / category`); return; }
      if (!w.categoryEn) { thin.push(`${w.ko} is missing categoryEn`); return; }
      const ko = String(w.ko).normalize('NFC');
      if (seen.has(ko)) thin.push(`${ko} is already in level ${seen.get(ko)}`);
      else seen.set(ko, lvl.level || i + 1);
    });
  });
  if (thin.length) throw new Error(`${thin.length} problem(s): ${thin.slice(0, 4).join('; ')}`);
  if (total !== WORD_COUNT) throw new Error(`Expected ${WORD_COUNT} words across the levels, got ${total}`);
  return levels;
}

function updateLevels(newLevels, rootDir) {
  return syncLevels(newLevels, rootDir);
}

function updateLevelMetadata(levelNum, metadata, rootDir) {
  const num = Number(levelNum);
  const levels = readLevelsFile(rootDir);
  const targetLevel = levels.find(l => Number(l.level) === num);
  
  if (!targetLevel) {
    throw new Error(`Level ${levelNum} not found.`);
  }

  if (metadata.name !== undefined) targetLevel.name = String(metadata.name);
  if (metadata.icon !== undefined) targetLevel.icon = String(metadata.icon);
  if (metadata.description !== undefined) targetLevel.description = String(metadata.description);
  if (metadata.target !== undefined) {
    const n = Number(metadata.target);
    if (!Number.isFinite(n)) {
      const err = new Error('Level target must be a number.');
      err.status = 400;
      throw err;
    }
    targetLevel.target = n;
  }

  syncLevels(levels, rootDir);
  return targetLevel;
}

function addWord(levelNum, wordObj, rootDir) {
  const num = Number(levelNum);
  const levels = readLevelsFile(rootDir);
  const targetLevel = levels.find(l => Number(l.level) === num);

  if (!targetLevel) {
    throw new Error(`Level ${levelNum} not found.`);
  }

  if (!wordObj || !wordObj.ko || !wordObj.en) {
    throw new Error('Word object must contain "ko" and "en" fields.');
  }

  const cleanWord = {
    ko: String(wordObj.ko).trim(),
    en: String(wordObj.en).trim(),
    hint: wordObj.hint !== undefined ? String(wordObj.hint).trim() : '💡',
    category: wordObj.category !== undefined ? String(wordObj.category).trim() : targetLevel.name
  };

  targetLevel.words.push(cleanWord);
  syncLevels(levels, rootDir);
  return { word: cleanWord, wordIndex: targetLevel.words.length - 1, totalWords: targetLevel.words.length };
}

function updateWord(levelNum, wordIndex, wordObj, rootDir) {
  const num = Number(levelNum);
  const idx = Number(wordIndex);
  const levels = readLevelsFile(rootDir);
  const targetLevel = levels.find(l => Number(l.level) === num);

  if (!targetLevel) {
    throw new Error(`Level ${levelNum} not found.`);
  }

  if (isNaN(idx) || idx < 0 || idx >= targetLevel.words.length) {
    throw new Error(`Word index ${wordIndex} out of bounds for level ${levelNum}.`);
  }

  if (!wordObj || (!wordObj.ko && !wordObj.en)) {
    throw new Error('Word update payload must contain valid word properties.');
  }

  const existing = targetLevel.words[idx];
  const updatedWord = {
    ko: wordObj.ko !== undefined ? String(wordObj.ko).trim() : existing.ko,
    en: wordObj.en !== undefined ? String(wordObj.en).trim() : existing.en,
    hint: wordObj.hint !== undefined ? String(wordObj.hint).trim() : existing.hint,
    category: wordObj.category !== undefined ? String(wordObj.category).trim() : existing.category
  };

  targetLevel.words[idx] = updatedWord;
  syncLevels(levels, rootDir);
  return updatedWord;
}

function deleteWord(levelNum, wordIndex, rootDir) {
  const num = Number(levelNum);
  const idx = Number(wordIndex);
  const levels = readLevelsFile(rootDir);
  const targetLevel = levels.find(l => Number(l.level) === num);

  if (!targetLevel) {
    throw new Error(`Level ${levelNum} not found.`);
  }

  if (isNaN(idx) || idx < 0 || idx >= targetLevel.words.length) {
    throw new Error(`Word index ${wordIndex} out of bounds for level ${levelNum}.`);
  }

  const removed = targetLevel.words.splice(idx, 1)[0];
  syncLevels(levels, rootDir);
  return { removedWord: removed, remainingWordsCount: targetLevel.words.length };
}

function getStats(rootDir) {
  const levels = readLevelsFile(rootDir);
  const totalLevels = levels.length;
  let totalWords = 0;
  const koMap = new Map();
  const duplicates = [];

  levels.forEach(lvl => {
    (lvl.words || []).forEach(w => {
      totalWords++;
      const ko = (w.ko || '').trim();
      if (ko) {
        if (koMap.has(ko)) {
          koMap.set(ko, koMap.get(ko) + 1);
        } else {
          koMap.set(ko, 1);
        }
      }
    });
  });

  koMap.forEach((count, ko) => {
    if (count > 1) {
      duplicates.push({ ko, count });
    }
  });

  const avgWordsPerLevel = totalLevels > 0 ? Math.round((totalWords / totalLevels) * 100) / 100 : 0;

  // Lazily import vocabFacts to avoid circular dependency
  const vocabFacts = require('./vocabFacts');
  let vocabData = { totalFacts: 0, exactMatchCount: 0, casingMismatchCount: 0, coveragePercentage: 0, missingFacts: [] };
  
  try {
    vocabData = vocabFacts.getVocabFactsData(rootDir);
  } catch (err) {
    // If facts.json doesn't exist yet, handle gracefully
  }

  return {
    totalLevels,
    totalWords,
    avgWordsPerLevel,
    totalVocabFacts: vocabData.totalFacts || 0,
    exactMatchCount: vocabData.exactMatchCount || 0,
    casingMismatchCount: vocabData.casingMismatchCount || 0,
    coveragePercentage: vocabData.coveragePercentage || 0,
    duplicates,
    missingFacts: vocabData.missingFacts || []
  };
}

module.exports = {
  getLevels,
  getLevelByNum,
  validateLevels,
  updateLevels,
  updateLevelMetadata,
  addWord,
  updateWord,
  deleteWord,
  getStats
};
