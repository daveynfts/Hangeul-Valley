const fs = require('fs');
const path = require('path');

const vm = require('vm');
const gameJsPath = path.join(__dirname, '../../game.js');
const content = fs.readFileSync(gameJsPath, 'utf8');

// Extract VOCAB_FACTS and helpers
const vocabStart = content.indexOf('const VOCAB_FACTS =');
const showFactStart = content.indexOf('function showVocabFunFact');
const scriptContent = content.substring(vocabStart, showFactStart)
  .replace('const VOCAB_FACTS =', 'global.VOCAB_FACTS =')
  .replace('function decomposeHangulWord', 'global.decomposeHangulWord = function decomposeHangulWord')
  .replace('function getHangulRomanization', 'global.getHangulRomanization = function getHangulRomanization')
  .replace('function getFunFact', 'global.getFunFact = function getFunFact');

vm.runInThisContext(scriptContent);

console.log('=== VOCAB_FACTS & getFunFact Audit ===\n');

const VOCAB_FACTS = global.VOCAB_FACTS;
const decomposeHangulWord = global.decomposeHangulWord;
const getHangulRomanization = global.getHangulRomanization;
const getFunFact = global.getFunFact;

const keys = Object.keys(VOCAB_FACTS);
console.log(`Total entries in VOCAB_FACTS: ${keys.length}`);


let missingVi = [];
let missingKo = [];
let invalidType = [];

keys.forEach(k => {
  const entry = VOCAB_FACTS[k];
  if (!entry || typeof entry !== 'object') {
    invalidType.push(k);
    return;
  }
  if (typeof entry.vi !== 'string' || entry.vi.trim() === '') missingVi.push(k);
  if (typeof entry.ko !== 'string' || entry.ko.trim() === '') missingKo.push(k);
});

console.log(`Missing/empty 'vi': ${missingVi.length}`);
console.log(`Missing/empty 'ko': ${missingKo.length}`);
console.log(`Invalid entry types: ${invalidType.length}`);

// 2. Comprehensive check on vi and ko properties across ALL entries
let viOriginMissing = [];
let viExampleMissing = [];
let viContextMissing = [];

let koSyllableMissing = [];
let koMnemonicMissing = [];
let koExampleMissing = [];

keys.forEach(k => {
  const { vi, ko } = VOCAB_FACTS[k];

  // vi check
  const hasOrigin = /고유어|한자어|외래어|Native|Hanja|Loanword/i.test(vi);
  const hasExample = /예문:/i.test(vi) && /\(.*\)/.test(vi);
  const hasContext = /Văn cảnh:|Chủ đề|chủ đề/i.test(vi);

  if (!hasOrigin) viOriginMissing.push(k);
  if (!hasExample) viExampleMissing.push(k);
  if (!hasContext) viContextMissing.push(k);

  // ko check
  const hasSyllable = /syllable/i.test(ko) || /\[.*\]/.test(ko);
  const hasMnemonic = /🧠/.test(ko) || /hình dung|nhắc nhở|liên tưởng|sound-alike/i.test(ko);
  const hasExampleKo = /\[.*\]/.test(ko); // romanized example sentence at the end

  if (!hasSyllable) koSyllableMissing.push(k);
  if (!hasMnemonic) koMnemonicMissing.push(k);
  if (!hasExampleKo) koExampleMissing.push(k);
});

console.log(`\n--- ALL Entries Checklist Summary ---`);
console.log(`VI Origin missing: ${viOriginMissing.length}`);
console.log(`VI Example missing: ${viExampleMissing.length}`);
console.log(`VI Context missing: ${viContextMissing.length}`);
console.log(`KO Syllable missing: ${koSyllableMissing.length}`);
console.log(`KO Mnemonic missing: ${koMnemonicMissing.length}`);
console.log(`KO Example missing: ${koExampleMissing.length}`);

// 3. Sample 20 random entries
console.log(`\n--- 20 Sampled Entries Audit ---`);
// Seeded pseudo-random or spaced sampling for reproducibility
const step = Math.floor(keys.length / 20);
const sampledKeys = [];
for (let i = 0; i < 20; i++) {
  sampledKeys.push(keys[i * step]);
}

let samplePassCount = 0;
sampledKeys.forEach((k, idx) => {
  const { vi, ko } = VOCAB_FACTS[k];
  console.log(`\nSample #${idx + 1}: "${k}"`);
  console.log(`  vi: ${vi.substring(0, 120)}...`);
  console.log(`  ko: ${ko.substring(0, 120)}...`);

  const hasOrigin = /고유어|한자어|외래어|Native|Hanja|Loanword/i.test(vi);
  const hasExample = /예문:/i.test(vi);
  const hasContext = /Văn cảnh:/i.test(vi);

  const hasSyllable = /syllable/i.test(ko);
  const hasMnemonic = /🧠/.test(ko);
  const hasExampleKo = /\[.*\]/.test(ko);

  const viPass = hasOrigin && hasExample && hasContext;
  const koPass = hasSyllable && hasMnemonic && hasExampleKo;

  console.log(`  Verification: VI [Origin:${hasOrigin}, Example:${hasExample}, Context:${hasContext}] | KO [Syllable:${hasSyllable}, Mnemonic:${hasMnemonic}, Example:${hasExampleKo}]`);
  if (viPass && koPass) samplePassCount++;
});

console.log(`\nSampled Entries Passing All Criteria: ${samplePassCount}/20`);

// 4. Verify decomposeHangulWord
console.log(`\n--- Helper Function: decomposeHangulWord ---`);
const testDecomp = decomposeHangulWord('아버지');
console.log('decomposeHangulWord("아버지"):', JSON.stringify(testDecomp, null, 2));
const testEmptyDecomp = decomposeHangulWord('');
console.log('decomposeHangulWord(""):', testEmptyDecomp);

// 5. Verify getHangulRomanization
console.log(`\n--- Helper Function: getHangulRomanization ---`);
const testRom = getHangulRomanization('한국어');
console.log('getHangulRomanization("한국어"):', testRom);
const testEmptyRom = getHangulRomanization('');
console.log('getHangulRomanization(""):', testEmptyRom);

// 6. Verify getFunFact
console.log(`\n--- Helper Function: getFunFact ---`);
const knownFact = getFunFact({ en: 'father', ko: '아버지' });
console.log('getFunFact (Known key "father"):', knownFact);

const fallbackFactFood = getFunFact({ en: 'kimchi', ko: '김치', category: 'food' });
console.log('getFunFact (Fallback key "kimchi", food):', fallbackFactFood);

const fallbackFactDefault = getFunFact({ en: 'unknownword', ko: '테스트' });
console.log('getFunFact (Fallback key default):', fallbackFactDefault);

const fallbackFactNull = getFunFact();
console.log('getFunFact (Null argument):', fallbackFactNull);
