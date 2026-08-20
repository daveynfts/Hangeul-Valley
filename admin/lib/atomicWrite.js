'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Replace dest with tmp. POSIX rename overwrites; on Windows a same-path
 * rename onto an existing file can throw, so fall back to dest→bak, tmp→dest.
 */
function replaceFile(tmp, dest) {
  try {
    fs.renameSync(tmp, dest);
    return;
  } catch (e) {
    if (!fs.existsSync(dest)) throw e;
  }
  const bak = dest + '.bak';
  try { if (fs.existsSync(bak)) fs.unlinkSync(bak); } catch (_) {}
  fs.renameSync(dest, bak);
  try {
    fs.renameSync(tmp, dest);
  } catch (e) {
    try { fs.renameSync(bak, dest); } catch (_) {}
    throw e;
  }
  try { fs.unlinkSync(bak); } catch (_) {}
}

function atomicWriteText(dest, text) {
  const dir = path.dirname(dest);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = dest + '.tmp';
  try {
    fs.writeFileSync(tmp, text, 'utf8');
    replaceFile(tmp, dest);
  } catch (e) {
    try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch (_) {}
    throw e;
  }
}

function atomicWriteJson(dest, value) {
  const jsonStr = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  JSON.parse(jsonStr);
  const tmp = dest + '.tmp';
  try {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(tmp, jsonStr, 'utf8');
    JSON.parse(fs.readFileSync(tmp, 'utf8'));
    replaceFile(tmp, dest);
  } catch (e) {
    try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch (_) {}
    throw e;
  }
}

module.exports = { replaceFile, atomicWriteText, atomicWriteJson };
