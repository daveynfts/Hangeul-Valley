const fs = require('fs');
const content = fs.readFileSync('game.js', 'utf8');

// We can evaluate or extract getFunFact and VOCAB_FACTS to test
const vm = require('vm');
const sandbox = {};
// Read VOCAB_FACTS and getFunFact definition
const matchVocab = content.indexOf('const VOCAB_FACTS =');
const matchFunFactEnd = content.indexOf('function showVocabFunFact');
const codeToEval = content.substring(matchVocab, matchFunFactEnd);

vm.createContext(sandbox);
vm.runInContext(codeToEval, sandbox);

console.log('Testing sandbox getFunFact...');

const testCases = [
  { ko: '학교', en: 'school', category: 'place' },
  { ko: '고양이', en: 'cat', category: 'animal' },
  { ko: '물', en: 'water', category: 'food' },
  { ko: '불고기', en: 'bulgogi', category: '음식' },
  { ko: '가족', en: 'family', category: '가족' },
  { ko: '달리다', en: 'run', category: '동작' },
  { ko: '', en: '', category: '' },
  { ko: null, en: undefined },
  { ko: 'ABC', en: 'abc', category: 'unknown' }
];

testCases.forEach(tc => {
  try {
    const res = sandbox.getFunFact(tc);
    console.log(`Input: ${JSON.stringify(tc)} -> Output: ${JSON.stringify(res)}`);
  } catch (err) {
    console.error(`Error for ${JSON.stringify(tc)}: ${err.message}`);
  }
});
