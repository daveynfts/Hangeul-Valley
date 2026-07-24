const fs = require('fs');
const path = require('path');
const vm = require('vm');

const gameJsPath = path.join(__dirname, '../../game.js');
const content = fs.readFileSync(gameJsPath, 'utf8');

const vocabStart = content.indexOf('const VOCAB_FACTS =');
const showFactStart = content.indexOf('function showVocabFunFact');
const scriptContent = content.substring(vocabStart, showFactStart)
  .replace('const VOCAB_FACTS =', 'global.VOCAB_FACTS =');
vm.runInThisContext(scriptContent);

const keys = Object.keys(global.VOCAB_FACTS);
const step = Math.floor(keys.length / 20);

console.log('=== 20 SAMPLED ENTRIES FROM VOCAB_FACTS ===\n');

for (let i = 0; i < 20; i++) {
  const idx = i * step;
  const k = keys[idx];
  const item = global.VOCAB_FACTS[k];
  console.log(`Sample #${i + 1} (Index ${idx + 1}/${keys.length}): "${k}"`);
  console.log(`  VI: ${item.vi}`);
  console.log(`  KO: ${item.ko}\n`);
}
