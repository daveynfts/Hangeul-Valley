/**
 * stress_test.js - Adversarial & Stress Testing for VOCAB_FACTS & getFunFact
 * Challenger 1 (Milestone 4 Verification & Audit)
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const baseDir = path.resolve(__dirname, '../..');
const gameJsPath = path.join(baseDir, 'game.js');

const gameCode = fs.readFileSync(gameJsPath, 'utf8') + `
globalThis.VOCAB_FACTS = VOCAB_FACTS;
globalThis.getFunFact = getFunFact;
`;

const dummyElem = {
  addEventListener: () => {},
  removeEventListener: () => {},
  querySelectorAll: () => [],
  classList: { add: () => {}, remove: () => {} },
  style: {}
};

const mockWindow = {
  addEventListener: () => {},
  removeEventListener: () => {},
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }
};

const Phaser = {
  Scene: class {},
  Scale: { RESIZE: 1, CENTER_BOTH: 1 },
  AUTO: 0,
  Game: class { constructor() {} },
  Input: { Keyboard: { KeyCodes: {} } }
};

const sandbox = {
  console, Math, Date, setTimeout, clearTimeout, setInterval, clearInterval, Array, Object, String, Number, Boolean, RegExp, Map, Set, Phaser,
  window: mockWindow,
  document: { getElementById: () => dummyElem, querySelector: () => dummyElem, querySelectorAll: () => [], addEventListener: () => {}, createElement: () => dummyElem, body: dummyElem },
  location: { href: '' }, navigator: { userAgent: 'node' }
};

mockWindow.window = mockWindow;
mockWindow.document = sandbox.document;
mockWindow.Phaser = Phaser;

vm.createContext(sandbox);
vm.runInContext(gameCode, sandbox);

const VOCAB_FACTS = sandbox.VOCAB_FACTS;
const getFunFact = sandbox.getFunFact;

console.log('=== STRESS TEST 1: Inspecting all keys in VOCAB_FACTS ===');
let emptyViCount = 0;
let emptyKoCount = 0;
let malformedFactCount = 0;
const totalKeys = Object.keys(VOCAB_FACTS).length;

Object.entries(VOCAB_FACTS).forEach(([key, fact]) => {
  if (!fact || typeof fact !== 'object') {
    malformedFactCount++;
    return;
  }
  if (typeof fact.vi !== 'string' || fact.vi.trim().length === 0) {
    emptyViCount++;
  }
  if (typeof fact.ko !== 'string' || fact.ko.trim().length === 0) {
    emptyKoCount++;
  }
});

console.log(`Total VOCAB_FACTS keys in database: ${totalKeys}`);
console.log(`Malformed objects: ${malformedFactCount}`);
console.log(`Empty 'vi' fields: ${emptyViCount}`);
console.log(`Empty 'ko' fields: ${emptyKoCount}`);

console.log('\n=== STRESS TEST 2: Boundary & Edge Inputs for getFunFact ===');
const edgeInputs = [
  { name: 'Undefined word', input: undefined },
  { name: 'Null word', input: null },
  { name: 'Empty object', input: {} },
  { name: 'Missing en', input: { ko: '김치', category: 'food' } },
  { name: 'Missing ko', input: { en: 'kimchi', category: 'food' } },
  { name: 'Empty strings', input: { ko: '', en: '', category: '' } },
  { name: 'Special characters', input: { ko: '!!!', en: '???', category: '###' } },
  { name: 'Uppercase key hit', input: { ko: '아버지', en: 'FATHER' } }
];

let edgeFailures = 0;
edgeInputs.forEach(test => {
  try {
    const res = getFunFact(test.input);
    const valid = res && typeof res.vi === 'string' && res.vi.length > 0 && typeof res.ko === 'string' && res.ko.length > 0;
    if (valid) {
      console.log(`[PASS] ${test.name}: returned valid vi and ko`);
    } else {
      console.log(`[FAIL] ${test.name}: returned invalid result ->`, res);
      edgeFailures++;
    }
  } catch (err) {
    console.log(`[CRASH] ${test.name}: threw error ->`, err.message);
    edgeFailures++;
  }
});

console.log(`\nEdge Case Test Status: ${edgeFailures === 0 ? 'ALL PASSED' : 'HAS FAILURES'}`);
