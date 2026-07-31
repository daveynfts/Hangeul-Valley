const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getPaths(rootDir) {
  const root = rootDir ? path.resolve(rootDir) : path.resolve(__dirname, '../../');
  return {
    rootDir: root,
    levelsPath: path.join(root, 'levels.json'),
    gameJsPath: path.join(root, 'game.js'),
    assetsDir: path.join(root, 'assets'),
    assetsLevelsPath: path.join(root, 'assets', 'levels.json'),
    assetsGameJsPath: path.join(root, 'assets', 'game.js'),
    factsPath: path.join(root, 'facts.json'),
    assetsFactsPath: path.join(root, 'assets', 'facts.json')
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

/**
 * Saves and synchronizes `levels.json` to root and `assets/`.
 * Uses atomic `.tmp` write and `JSON.parse` readback validation.
 */
function syncLevels(levelsData, rootDir) {
  if (!Array.isArray(levelsData)) {
    throw new Error('Invalid levels data: must be an array.');
  }

  const paths = getPaths(rootDir);
  const jsonStr = JSON.stringify(levelsData, null, 2);

  // Validate in-memory JSON parseability
  try {
    JSON.parse(jsonStr);
  } catch (e) {
    throw new Error('Failed to serialize levels data to valid JSON: ' + e.message);
  }

  const tempPath = path.join(paths.rootDir, 'levels.json.tmp');
  
  // Atomic write to temp file
  fs.writeFileSync(tempPath, jsonStr, 'utf8');

  // Readback parse validation
  try {
    const readback = fs.readFileSync(tempPath, 'utf8');
    JSON.parse(readback);
  } catch (e) {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    throw new Error('Atomic write validation failed for levels.json: ' + e.message);
  }

  // Ensure assets directory exists
  if (!fs.existsSync(paths.assetsDir)) {
    fs.mkdirSync(paths.assetsDir, { recursive: true });
  }

  // Commit to root and assets mirror
  fs.copyFileSync(tempPath, paths.levelsPath);
  fs.copyFileSync(tempPath, paths.assetsLevelsPath);
  
  // Cleanup temp file
  if (fs.existsSync(tempPath)) {
    fs.unlinkSync(tempPath);
  }

  return { success: true, totalLevels: levelsData.length };
}

/**
 * Saves and synchronizes `game.js` to root and `assets/`.
 * Uses `_game_temp.js` to run `node -c` syntax validation.
 * Rolls back on syntax error.
 */
function syncGameJs(gameJsContent, rootDir) {
  if (typeof gameJsContent !== 'string' || gameJsContent.trim().length === 0) {
    throw new Error('Invalid game.js content: must be a non-empty string.');
  }

  const paths = getPaths(rootDir);
  const tempPath = path.join(paths.rootDir, '_game_temp.js');
  const bakPath = path.join(paths.rootDir, '_game_bak.js');

  // Step 1: Write to temporary .js file for node -c check
  fs.writeFileSync(tempPath, gameJsContent, 'utf8');

  // Step 2: Run syntax validation
  const check = validateJsSyntax(tempPath);
  if (!check.valid) {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    throw new Error(`JavaScript syntax error in game.js:\n${check.error}`);
  }

  // Step 3: Backup existing game.js if it exists
  if (fs.existsSync(paths.gameJsPath)) {
    fs.copyFileSync(paths.gameJsPath, bakPath);
  }

  try {
    // Step 4: Ensure assets directory exists
    if (!fs.existsSync(paths.assetsDir)) {
      fs.mkdirSync(paths.assetsDir, { recursive: true });
    }

    // Step 5: Write to root game.js and copy to assets/game.js
    fs.writeFileSync(paths.gameJsPath, gameJsContent, 'utf8');
    fs.writeFileSync(paths.assetsGameJsPath, gameJsContent, 'utf8');

    // Step 6: Cleanup temp and backup files
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    if (fs.existsSync(bakPath)) fs.unlinkSync(bakPath);

    return { success: true, bytes: gameJsContent.length };
  } catch (err) {
    // Rollback on failure
    if (fs.existsSync(bakPath)) {
      fs.copyFileSync(bakPath, paths.gameJsPath);
      fs.unlinkSync(bakPath);
    }
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    throw new Error(`Failed to sync game.js: ${err.message}`);
  }
}

module.exports = {
  getPaths,
  validateJsSyntax,
  syncLevels,
  syncGameJs,
  saveAndSyncLevels: syncLevels,
  saveAndSyncGameJs: syncGameJs
};
