const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const gamePath = path.join(__dirname, '..', '..', 'game.js');
const assetsGamePath = path.join(__dirname, '..', '..', 'assets', 'game.js');

const rootBuf = fs.readFileSync(gamePath);
const assetsBuf = fs.readFileSync(assetsGamePath);

const rootHash = crypto.createHash('sha256').update(rootBuf).digest('hex');
const assetsHash = crypto.createHash('sha256').update(assetsBuf).digest('hex');

console.log(`root game.js size: ${rootBuf.length} bytes, SHA-256: ${rootHash}`);
console.log(`assets/game.js size: ${assetsBuf.length} bytes, SHA-256: ${assetsHash}`);

const identicalSize = rootBuf.length === assetsBuf.length;
const identicalContent = rootBuf.equals(assetsBuf);

if (identicalSize && identicalContent) {
  console.log('PASSED: game.js and assets/game.js are 100% identical in byte size and content.');
} else {
  console.log('FAILED: game.js and assets/game.js differ!');
}
