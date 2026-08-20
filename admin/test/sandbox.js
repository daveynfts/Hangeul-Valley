'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

function makeWriteSandbox(repoRoot) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hv-admin-'));
  const copyFile = (rel) => {
    fs.copyFileSync(path.join(repoRoot, rel), path.join(dir, rel));
  };
  const copyDir = (rel) => {
    fs.cpSync(path.join(repoRoot, rel), path.join(dir, rel), { recursive: true });
  };
  copyFile('levels.json');
  copyFile('facts.json');
  copyDir('js');
  copyDir('sprites');
  copyDir('skins');
  copyDir('worlds');
  return dir;
}

function rmSandbox(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
}

module.exports = { makeWriteSandbox, rmSandbox };
