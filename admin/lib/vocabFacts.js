const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { syncGameJs, getPaths } = require('./sync');

/**
 * Locates the exact character slice [startIndex, endIndex] of `const VOCAB_FACTS = { ... };` in JS code.
 * Handles nested braces and strings cleanly.
 */
function locateVocabFactsBlock(code) {
  const match = /(?:const|let|var)\s+VOCAB_FACTS\s*=\s*\{/.exec(code);
  if (!match) {
    return null;
  }
  const startIndex = match.index;
  const braceIndex = code.indexOf('{', startIndex);
  if (braceIndex === -1) return null;

  let depth = 0;
  let inString = false;
  let stringChar = '';
  let isEscaped = false;
  let endIndex = -1;

  for (let i = braceIndex; i < code.length; i++) {
    const char = code[i];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (char === '\\') {
        isEscaped = true;
      } else if (char === stringChar) {
        inString = false;
      }
    } else {
      if (char === '"' || char === "'" || char === '`') {
        inString = true;
        stringChar = char;
      } else if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          endIndex = i;
          break;
        }
      }
    }
  }

  if (endIndex === -1) return null;

  // Include optional trailing semicolon
  let semiIndex = endIndex;
  let nextCharIdx = endIndex + 1;
  while (nextCharIdx < code.length && /\s/.test(code[nextCharIdx])) {
    nextCharIdx++;
  }
  if (nextCharIdx < code.length && code[nextCharIdx] === ';') {
    semiIndex = nextCharIdx;
  }

  return {
    startIndex,
    endIndex: semiIndex,
    braceStartIndex: braceIndex,
    braceEndIndex: endIndex
  };
}

/**
 * Extracts and parses the `VOCAB_FACTS` JS object literal into a memory Object using vm.Script.
 */
function extractVocabFactsObj(code) {
  const blockInfo = locateVocabFactsBlock(code);
  if (!blockInfo) {
    throw new Error('VOCAB_FACTS declaration not found in game.js.');
  }
  const objectLiteralText = code.substring(blockInfo.braceStartIndex, blockInfo.braceEndIndex + 1);
  const script = new vm.Script('(' + objectLiteralText + ')');
  const facts = script.runInNewContext({});
  return { facts, blockInfo };
}

/**
 * Serializes memory object into formatted JavaScript declaration.
 */
function serializeVocabFactsBlock(factsObj) {
  const keys = Object.keys(factsObj);
  const lines = keys.map(key => {
    const entry = factsObj[key] || {};
    const viStr = JSON.stringify(entry.vi || '');
    const koStr = JSON.stringify(entry.ko || '');
    const keyStr = JSON.stringify(key);
    return `  ${keyStr}: {vi:${viStr}, ko:${koStr}}`;
  });
  return `const VOCAB_FACTS = {\n${lines.join(',\n')}\n};`;
}

/**
 * Replaces VOCAB_FACTS block inside full game.js string.
 */
function replaceVocabFactsBlockInGameJs(code, newFactsObj) {
  const blockInfo = locateVocabFactsBlock(code);
  if (!blockInfo) {
    throw new Error('VOCAB_FACTS declaration block not found in game.js.');
  }
  const newBlockCode = serializeVocabFactsBlock(newFactsObj);
  return code.substring(0, blockInfo.startIndex) + newBlockCode + code.substring(blockInfo.endIndex + 1);
}

/**
 * Returns VOCAB_FACTS dictionary along with stats, missing facts, and casing discrepancies.
 */
function getVocabFactsData(rootDir) {
  const paths = getPaths(rootDir);
  if (!fs.existsSync(paths.gameJsPath)) {
    throw new Error(`game.js not found at ${paths.gameJsPath}`);
  }
  const gameContent = fs.readFileSync(paths.gameJsPath, 'utf8');
  const { facts } = extractVocabFactsObj(gameContent);

  let missingFacts = [];
  let casingDiscrepancies = [];
  let exactMatchCount = 0;
  let casingMismatchCount = 0;
  let totalWordsCount = 0;

  if (fs.existsSync(paths.levelsPath)) {
    const levels = JSON.parse(fs.readFileSync(paths.levelsPath, 'utf8'));
    const lowerKeyMap = new Map();
    Object.keys(facts).forEach(k => {
      lowerKeyMap.set(k.toLowerCase().trim(), k);
    });

    const checkedKeys = new Set();

    levels.forEach(lvl => {
      (lvl.words || []).forEach(w => {
        totalWordsCount++;
        const rawEn = (w.en || '').trim();
        const lowerEn = rawEn.toLowerCase();

        if (Object.prototype.hasOwnProperty.call(facts, rawEn)) {
          exactMatchCount++;
        } else if (lowerKeyMap.has(lowerEn)) {
          casingMismatchCount++;
          const existingKey = lowerKeyMap.get(lowerEn);
          casingDiscrepancies.push({
            level: lvl.level,
            ko: w.ko,
            enInLevels: rawEn,
            keyInVocabFacts: existingKey
          });
        } else {
          if (!checkedKeys.has(lowerEn)) {
            checkedKeys.add(lowerEn);
            missingFacts.push({
              level: lvl.level,
              ko: w.ko,
              en: rawEn,
              hint: w.hint,
              category: w.category
            });
          }
        }
      });
    });
  }

  const totalFacts = Object.keys(facts).length;
  const coveredCount = exactMatchCount + casingMismatchCount;
  const coveragePercentage = totalWordsCount > 0
    ? Math.round((coveredCount / totalWordsCount) * 10000) / 100
    : 100.0;

  return {
    facts,
    totalFacts,
    exactMatchCount,
    casingMismatchCount,
    coveragePercentage,
    missingFacts,
    casingDiscrepancies
  };
}

/**
 * Adds a new entry to VOCAB_FACTS in game.js.
 */
function addVocabFact(key, factData, rootDir) {
  if (!key || typeof key !== 'string' || key.trim() === '') {
    throw new Error('Key must be a non-empty string.');
  }
  const cleanKey = key.trim();
  const paths = getPaths(rootDir);
  const gameContent = fs.readFileSync(paths.gameJsPath, 'utf8');
  const { facts } = extractVocabFactsObj(gameContent);

  facts[cleanKey] = {
    vi: String(factData.vi || ''),
    ko: String(factData.ko || '')
  };

  const newGameJsContent = replaceVocabFactsBlockInGameJs(gameContent, facts);
  syncGameJs(newGameJsContent, rootDir);
  return { key: cleanKey, fact: facts[cleanKey] };
}

/**
 * Updates an existing entry in VOCAB_FACTS in game.js. Supports renaming key via newKey.
 */
function updateVocabFact(key, factData, rootDir) {
  if (!key || typeof key !== 'string') {
    throw new Error('Key must be a non-empty string.');
  }
  const paths = getPaths(rootDir);
  const gameContent = fs.readFileSync(paths.gameJsPath, 'utf8');
  const { facts } = extractVocabFactsObj(gameContent);

  const cleanKey = key.trim();
  const targetKey = (factData.newKey && typeof factData.newKey === 'string' && factData.newKey.trim())
    ? factData.newKey.trim()
    : cleanKey;

  // Handle key rename
  if (targetKey !== cleanKey && Object.prototype.hasOwnProperty.call(facts, cleanKey)) {
    delete facts[cleanKey];
  }

  const existing = facts[cleanKey] || facts[targetKey] || {};

  facts[targetKey] = {
    vi: factData.vi !== undefined ? String(factData.vi) : (existing.vi || ''),
    ko: factData.ko !== undefined ? String(factData.ko) : (existing.ko || '')
  };

  const newGameJsContent = replaceVocabFactsBlockInGameJs(gameContent, facts);
  syncGameJs(newGameJsContent, rootDir);
  return { key: targetKey, oldKey: cleanKey !== targetKey ? cleanKey : undefined, fact: facts[targetKey] };
}

/**
 * Deletes a VOCAB_FACTS entry in game.js.
 */
function deleteVocabFact(key, rootDir) {
  if (!key || typeof key !== 'string') {
    throw new Error('Key must be a non-empty string.');
  }
  const cleanKey = key.trim();
  const paths = getPaths(rootDir);
  const gameContent = fs.readFileSync(paths.gameJsPath, 'utf8');
  const { facts } = extractVocabFactsObj(gameContent);

  if (!Object.prototype.hasOwnProperty.call(facts, cleanKey)) {
    // Try case-insensitive lookup
    const lower = cleanKey.toLowerCase();
    const foundKey = Object.keys(facts).find(k => k.toLowerCase() === lower);
    if (foundKey) {
      delete facts[foundKey];
    } else {
      throw new Error(`VOCAB_FACTS key "${key}" not found.`);
    }
  } else {
    delete facts[cleanKey];
  }

  const newGameJsContent = replaceVocabFactsBlockInGameJs(gameContent, facts);
  syncGameJs(newGameJsContent, rootDir);
  return { key: cleanKey, deleted: true };
}

module.exports = {
  locateVocabFactsBlock,
  extractVocabFactsObj,
  serializeVocabFactsBlock,
  replaceVocabFactsBlockInGameJs,
  getVocabFactsData,
  addVocabFact,
  updateVocabFact,
  deleteVocabFact
};
