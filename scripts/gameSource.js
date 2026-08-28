'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const MANIFEST_REL = path.join('js', 'manifest.json');

function loadManifest() {
  const p = path.join(ROOT, MANIFEST_REL);
  try {
    const list = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!Array.isArray(list) || list.length === 0) {
      throw new Error('must be a non-empty array of script paths');
    }
    return list;
  } catch (e) {
    throw new Error('Cannot read js/manifest.json: ' + e.message);
  }
}

const GAME_SCRIPTS = loadManifest();

// loadManifest() explains itself when the manifest is unreadable; this did not, and a manifest
// entry whose file has been renamed or deleted came out as a bare ENOENT stack trace from inside
// a helper, several frames from anything a reader would recognise. Renaming a script and
// forgetting the manifest is an ordinary mistake and deserves an ordinary sentence.
function readGameSource() {
  return GAME_SCRIPTS.map((rel) => {
    try {
      return fs.readFileSync(path.join(ROOT, rel), 'utf8');
    } catch (e) {
      throw new Error('js/manifest.json lists ' + rel + ', which is not on disk'
        + (e.code === 'ENOENT' ? '' : ' (' + e.message + ')'));
    }
  }).join('\n');
}

function gameScriptPaths() {
  return GAME_SCRIPTS.map((rel) => path.join(ROOT, rel));
}

function allGameScriptsExist() {
  return GAME_SCRIPTS.every((rel) => {
    const p = path.join(ROOT, rel);
    return fs.existsSync(p) && fs.statSync(p).size > 0;
  });
}

function checkGameScripts() {
  gameScriptPaths().forEach((f) => {
    try {
      execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
    } catch (err) {
      const stderr = err && err.stderr ? err.stderr.toString() : (err && err.message) || String(err);
      throw new Error('Syntax error in ' + path.relative(ROOT, f).replace(/\\/g, '/') + '\n' + stderr);
    }
  });
}

module.exports = {
  ROOT,
  GAME_SCRIPTS,
  readGameSource,
  gameScriptPaths,
  allGameScriptsExist,
  checkGameScripts
};
