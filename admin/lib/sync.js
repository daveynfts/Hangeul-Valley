const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { atomicWriteJson } = require('./atomicWrite');

function getPaths(rootDir) {
  const root = rootDir ? path.resolve(rootDir) : path.resolve(__dirname, '../../');
  return {
    rootDir: root,
    levelsPath: path.join(root, 'levels.json'),
    manifestPath: path.join(root, 'js', 'manifest.json'),
    factsPath: path.join(root, 'facts.json')
  };
}

/**
 * Validates JavaScript syntax using `node -c` on a file.
 * File MUST end with `.js` extension (e.g. `_game_temp.js`).
 */
function validateJsSyntax(filePath) {
  try {
    execSync(`node -c "${filePath}"`, { stdio: 'pipe' });
    return { valid: true };
  } catch (err) {
    const errorMsg = err.stderr ? err.stderr.toString() : err.message;
    return { valid: false, error: errorMsg };
  }
}

function assertLevelsPayload(levelsData) {
  if (!Array.isArray(levelsData)) {
    const err = new Error('Invalid levels data: must be an array.');
    err.status = 400;
    throw err;
  }
  if (levelsData.length === 0) {
    const err = new Error('Invalid levels data: array must not be empty.');
    err.status = 400;
    throw err;
  }
  levelsData.forEach((l, i) => {
    if (!l || typeof l !== 'object' || Array.isArray(l)) {
      const err = new Error('Invalid levels data: entry ' + i + ' must be an object.');
      err.status = 400;
      throw err;
    }
    if (!Number.isFinite(Number(l.level))) {
      const err = new Error('Invalid levels data: entry ' + i + ' needs a numeric level.');
      err.status = 400;
      throw err;
    }
    if (!Array.isArray(l.words)) {
      const err = new Error('Invalid levels data: entry ' + i + ' needs a words array.');
      err.status = 400;
      throw err;
    }
  });
}

/**
 * Saves `levels.json` at the repo root.
 * Uses atomic `.tmp` write and `JSON.parse` readback validation.
 */
function syncLevels(levelsData, rootDir) {
  assertLevelsPayload(levelsData);

  const paths = getPaths(rootDir);
  const jsonStr = JSON.stringify(levelsData, null, 2);

  try {
    JSON.parse(jsonStr);
  } catch (e) {
    throw new Error('Failed to serialize levels data to valid JSON: ' + e.message);
  }

  atomicWriteJson(paths.levelsPath, jsonStr);

  return { success: true, totalLevels: levelsData.length };
}

function getGameScriptPaths(rootDir) {
  const { rootDir: root, manifestPath } = getPaths(rootDir);
  if (!fs.existsSync(manifestPath)) {
    throw new Error('Missing js/manifest.json');
  }
  const list = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('js/manifest.json must be a non-empty array of script paths.');
  }
  return list.map((rel) => path.join(root, ...String(rel).split('/')));
}

/**
 * Syntax-checks every file listed in js/manifest.json. Does not rewrite scripts.
 */
function validateGameScripts(rootDir) {
  const { rootDir: root } = getPaths(rootDir);
  const files = getGameScriptPaths(rootDir);
  const rels = [];
  files.forEach((f) => {
    const rel = path.relative(root, f).replace(/\\/g, '/');
    if (!fs.existsSync(f)) {
      throw new Error('Missing game script: ' + rel);
    }
    const check = validateJsSyntax(f);
    if (!check.valid) {
      throw new Error('JavaScript syntax error in ' + rel + ':\n' + check.error);
    }
    rels.push(rel);
  });
  return { success: true, files: rels };
}

function syncGameJs() {
  throw new Error('game.js is split; Sync syntax-checks js/* via validateGameScripts() and does not rewrite scripts.');
}

module.exports = {
  getPaths,
  validateJsSyntax,
  getGameScriptPaths,
  validateGameScripts,
  syncLevels,
  syncGameJs,
  saveAndSyncLevels: syncLevels,
  saveAndSyncGameJs: syncGameJs
};
