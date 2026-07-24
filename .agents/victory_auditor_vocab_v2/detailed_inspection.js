const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../../');
const gameJsPath = path.join(rootDir, 'game.js');
const gameContent = fs.readFileSync(gameJsPath, 'utf-8');
const lines = gameContent.split('\n');

let vocabFactsStart = -1;
let vocabFactsEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const VOCAB_FACTS = {')) vocabFactsStart = i + 1;
  if (vocabFactsStart !== -1 && vocabFactsEnd === -1 && lines[i].trim() === '};') vocabFactsEnd = i + 1;
}

const codeToRun = `
  ${lines.slice(vocabFactsStart - 1, vocabFactsEnd).join('\n')}
  return VOCAB_FACTS;
`;
const VOCAB_FACTS = (new Function(codeToRun))();

console.log('=== DETAILED INSPECTION OF REMEDIATED ENTRIES ===\n');

// 1. Check specific previously failed entries from Iteration 1
const previouslyFailedR1 = ['older brother (for male)', 'uncle', 'maternal aunt', 'paternal aunt', 'grandson'];
console.log('--- Checking Iteration 1 R1 Failed Entries ---');
previouslyFailedR1.forEach(key => {
  const entry = VOCAB_FACTS[key];
  if (entry) {
    console.log(`Key: "${key}"`);
    console.log(`  vi: ${entry.vi.substring(0, 100)}...`);
    console.log(`  Hán-Hàn present? ${entry.vi.includes('Hán-Hàn') || entry.vi.includes('từ Hán-Hàn')}`);
  } else {
    console.log(`Key: "${key}" NOT FOUND`);
  }
});

const previouslyFailedR2 = ['social network service', 'producer'];
console.log('\n--- Checking Iteration 1 R2 Failed Entries ---');
previouslyFailedR2.forEach(key => {
  const entry = VOCAB_FACTS[key];
  if (entry) {
    console.log(`Key: "${key}"`);
    console.log(`  ko: ${entry.ko}`);
    console.log(`  Empty [] () present? ${/\[\s*\]\s*\(\s*\)/.test(entry.ko)}`);
  } else {
    console.log(`Key: "${key}" NOT FOUND`);
  }
});

// 2. Scan all entries for origin tags in vi
let hanHanCount = 0;
let goYuEokCount = 0;
let oeRaeEokCount = 0;
let otherOriginCount = 0;

Object.keys(VOCAB_FACTS).forEach(key => {
  const vi = VOCAB_FACTS[key].vi;
  if (vi.includes('Hán-Hàn') || vi.includes('từ Hán-Hàn')) {
    hanHanCount++;
  } else if (vi.includes('고유어') || vi.includes('Từ thuần Hàn') || vi.includes('Native Korean')) {
    goYuEokCount++;
  } else if (vi.includes('외래어') || vi.includes('Từ ngoại nhập') || vi.includes('Loanword')) {
    oeRaeEokCount++;
  } else {
    otherOriginCount++;
  }
});

console.log('\n--- Origin Tag Distribution ---');
console.log(`  Hán-Hàn (Sino-Korean): ${hanHanCount}`);
console.log(`  고유어 (Native Korean): ${goYuEokCount}`);
console.log(`  외래어 (Loanwords): ${oeRaeEokCount}`);
console.log(`  Other / Uncategorized: ${otherOriginCount}`);

// 3. Scan for any anomalies across all 1494 entries
const anomalies = [];
Object.keys(VOCAB_FACTS).forEach(key => {
  const entry = VOCAB_FACTS[key];
  if (!entry.vi || typeof entry.vi !== 'string') anomalies.push(`[${key}] Invalid vi type/content`);
  if (!entry.ko || typeof entry.ko !== 'string') anomalies.push(`[${key}] Invalid ko type/content`);
  if (entry.vi.includes('undefined') || entry.ko.includes('undefined')) anomalies.push(`[${key}] Contains "undefined" string`);
  if (entry.vi.includes('null') || entry.ko.includes('null')) anomalies.push(`[${key}] Contains "null" string`);
  if (entry.vi.includes('[object Object]') || entry.ko.includes('[object Object]')) anomalies.push(`[${key}] Contains "[object Object]"`);
});

console.log('\n--- Anomaly Scan ---');
console.log(`  Total anomalies found: ${anomalies.length}`);
if (anomalies.length > 0) {
  anomalies.forEach(a => console.log(`    - ${a}`));
}

console.log('\n=== DETAILED INSPECTION COMPLETE ===');
