const { P, checkMatrix, countDiffs } = require('./validate_robot_walk.js');

// Helper to construct row with outer K
// 16 characters total per row

// --- 1. DOWN WALK MATRICES ---
const down_0 = [
  '.......KK.......',
  '......KORK......',
  '.......KK.......',
  '....KKYYYYKK....',
  '...KYyyyyyyYK...',
  '..KYyKbCCCCbYK..',
  '..KYyKCLWCLWbYK.',
  '..KJJyKbbbbKYJK.',
  '..KKmYYYYYYmKK..',
  '..KSmYyGRyYmSK..',
  '.KKSsDDDDDDsSKK.',
  '.KKDDDKKKKDDDKK.',
  '.KDmSDKKKKDmSDK.',
  '.KDsDDKKKKDsDDK.',
  '.KDmSDKKKKDmSDK.',
  '.KKKKKKKKKKKKKK.'
];

// down_1: Left tread step link shift & 1px bob
const down_1 = [
  '......KORK......',
  '.......KK.......',
  '....KKYYYYKK....',
  '...KYyyyyyyYK...',
  '..KYyKbCCCCbYK..',
  '..KYyKCLWCLWbYK.',
  '..KJJyKbbbbKYJK.',
  '..KKmYYYYYYmKK..',
  '..KSmYyGRyYmSK..',
  '.KKSsDDDDDDsSKK.',
  '.KKDDDKKKKDDDKK.',
  '.KKDDDKKKKDDDKK.',
  '.KDsDDKKKKDmSDK.',
  '.KDmSDKKKKDsDDK.',
  '.KDsDDKKKKDmSDK.',
  '.KKKKKKKKKKKKKK.'
];

// down_2: Right tread step link shift & 1px bob
const down_2 = [
  '.......KK.......',
  '......KORK......',
  '.......KK.......',
  '....KKYYYYKK....',
  '...KYyyyyyyYK...',
  '..KYyKbCCCCbYK..',
  '..KYyKCLWCLWbYK.',
  '..KJJyKbbbbKYJK.',
  '..KKmYYYYYYmKK..',
  '..KSmYyGRyYmSK..',
  '.KKSsDDDDDDsSKK.',
  '.KKDDDKKKKDDDKK.',
  '.KDmSDKKKKDsDDK.',
  '.KDsDDKKKKDmSDK.',
  '.KDmSDKKKKDsDDK.',
  '.KKKKKKKKKKKKKK.'
];


// --- 2. UP WALK MATRICES (Back view) ---
const up_0 = [
  '.......KK.......',
  '......KORK......',
  '.......KK.......',
  '....KKYYYYKK....',
  '...KYyyyyyyYK...',
  '...KYyJkkJyYK...',
  '...KYyJkkJyYK...',
  '...KJJyyyyJJK...',
  '..KKmYYYYYYmKK..',
  '..KSmYyDDyYmSK..',
  '.KKSsDDDDDDsSKK.',
  '.KKDDDKKKKDDDKK.',
  '.KDmSDKKKKDmSDK.',
  '.KDsDDKKKKDsDDK.',
  '.KDmSDKKKKDmSDK.',
  '.KKKKKKKKKKKKKK.'
];

const up_1 = [
  '......KORK......',
  '.......KK.......',
  '....KKYYYYKK....',
  '...KYyyyyyyYK...',
  '...KYyJkkJyYK...',
  '...KYyJkkJyYK...',
  '...KJJyyyyJJK...',
  '..KKmYYYYYYmKK..',
  '..KSmYyDDyYmSK..',
  '.KKSsDDDDDDsSKK.',
  '.KKDDDKKKKDDDKK.',
  '.KKDDDKKKKDDDKK.',
  '.KDsDDKKKKDmSDK.',
  '.KDmSDKKKKDsDDK.',
  '.KDsDDKKKKDmSDK.',
  '.KKKKKKKKKKKKKK.'
];

const up_2 = [
  '.......KK.......',
  '......KORK......',
  '.......KK.......',
  '....KKYYYYKK....',
  '...KYyyyyyyYK...',
  '...KYyJkkJyYK...',
  '...KYyJkkJyYK...',
  '...KJJyyyyJJK...',
  '..KKmYYYYYYmKK..',
  '..KSmYyDDyYmSK..',
  '.KKSsDDDDDDsSKK.',
  '.KKDDDKKKKDDDKK.',
  '.KDmSDKKKKDsDDK.',
  '.KDsDDKKKKDmSDK.',
  '.KDmSDKKKKDsDDK.',
  '.KKKKKKKKKKKKKK.'
];


// --- 3. LEFT WALK MATRICES (Side view facing Left) ---
const left_0 = [
  '.....KK.........',
  '....KORK........',
  '.....KK.........',
  '...KKYYYYKK.....',
  '..KYyyyyyyYK....',
  '.KYyKbCCCbYYK...',
  '.KYyKCLWbYYYK...',
  '.KJJyKbbbYYJK...',
  '..KKmYYYYYmKK...',
  '..KSmYyGRySK....',
  '.KKSsDDDDDsKK...',
  '.KKDDDDDDDDDKK..',
  '.KDmSmSmSmSmDK..',
  '.KDsDsDsDsDsDK..',
  '.KDmSmSmSmSmDK..',
  '.KKKKKKKKKKKKK..'
];

const left_1 = [
  '....KORK........',
  '.....KK.........',
  '..KKYYYYKK......',
  '.KYyyyyyyYK.....',
  'KYyKbCCCbYYK....',
  'KYyKCLWbYYYK....',
  'KJJyKbbbYYJK....',
  '.KKmYYYYYmKK....',
  '.KSmYyGRySK.....',
  'KKSsDDDDDsKK....',
  'KKDDDDDDDDDKK...',
  'KKDDDDDDDDDKK...',
  'KDsDsDsDsDsDKK..',
  'KDmSmSmSmSmDKK..',
  'KDsDsDsDsDsDKK..',
  'KKKKKKKKKKKKKK..'
];

const left_2 = [
  '.....KK.........',
  '....KORK........',
  '.....KK.........',
  '...KKYYYYKK.....',
  '..KYyyyyyyYK....',
  '.KYyKbCCCbYYK...',
  '.KYyKCLWbYYYK...',
  '.KJJyKbbbYYJK...',
  '..KKmYYYYYmKK...',
  '..KSmYyGRySK....',
  '.KKSsDDDDDsKK...',
  '.KKDDDDDDDDDKK..',
  '.KDsDsDsDsDsDK..',
  '.KDmSmSmSmSmDK..',
  '.KDsDsDsDsDsDK..',
  '.KKKKKKKKKKKKK..'
];


// --- 4. RIGHT WALK MATRICES (Side view facing Right) ---
const right_0 = [
  '.........KK.....',
  '........KORK....',
  '.........KK.....',
  '.....KKYYYYKK...',
  '....KYyyyyyyYK..',
  '...KYYbCCCbYyYK.',
  '...KYYYbWLCbYyYK',
  '...KJYYbbbKyJJK.',
  '..KKmYYYYYmKK...',
  '....KSyRGyYmSK..',
  '....KKsDDDDDsKK.',
  '...KKDDDDDDDDDKK',
  '..KDmSmSmSmSmDK.',
  '..KDsDsDsDsDsDK.',
  '..KDmSmSmSmSmDK.',
  '..KKKKKKKKKKKKK.'
];

const right_1 = [
  '........KORK....',
  '.........KK.....',
  '......KKYYYYKK..',
  '.....KYyyyyyyYK.',
  '....KYYbCCCbYyYK',
  '....KYYYbWLCbYyYK',
  '....KJYYbbbKyJJK',
  '.....KKmYYYYYmKK',
  '.....KSyRGyYmSK.',
  '....KKsDDDDDsKK.',
  '...KKDDDDDDDDDKK',
  '...KKDDDDDDDDDKK',
  '..KDsDsDsDsDsDKK',
  '..KDmSmSmSmSmDKK',
  '..KDsDsDsDsDsDKK',
  '..KKKKKKKKKKKKKK'
];

const right_2 = [
  '.........KK.....',
  '........KORK....',
  '.........KK.....',
  '.....KKYYYYKK...',
  '....KYyyyyyyYK..',
  '...KYYbCCCbYyYK.',
  '...KYYYbWLCbYyYK',
  '...KJYYbbbKyJJK.',
  '..KKmYYYYYmKK...',
  '....KSyRGyYmSK..',
  '....KKsDDDDDsKK.',
  '...KKDDDDDDDDDKK',
  '..KDsDsDsDsDsDK.',
  '..KDmSmSmSmSmDK.',
  '..KDsDsDsDsDsDK.',
  '..KKKKKKKKKKKKK.'
];

const allMatrices = {
  down_0, down_1, down_2,
  up_0, up_1, up_2,
  left_0, left_1, left_2,
  right_0, right_1, right_2
};

console.log('--- VALIDATING ALL MATRICES ---');
for (const [name, mat] of Object.entries(allMatrices)) {
  checkMatrix(name, mat);
}
console.log('All 12 matrices passed syntax and boundary checks!');

console.log('\n--- FRAME DIFFERENCE CHECKS ---');
const directions = ['down', 'up', 'left', 'right'];
for (const dir of directions) {
  const m0 = allMatrices[`${dir}_0`];
  const m1 = allMatrices[`${dir}_1`];
  const m2 = allMatrices[`${dir}_2`];

  const diff01_all = countDiffs(m0, m1, 0, 15);
  const diff12_all = countDiffs(m1, m2, 0, 15);
  const diff02_all = countDiffs(m0, m2, 0, 15);

  const diff01_tread = countDiffs(m0, m1, 11, 15);
  const diff12_tread = countDiffs(m1, m2, 11, 15);
  const diff02_tread = countDiffs(m0, m2, 11, 15);

  console.log(`[${dir.toUpperCase()}]`);
  console.log(`  _0 vs _1: total=${diff01_all}, tread(11-15)=${diff01_tread}`);
  console.log(`  _1 vs _2: total=${diff12_all}, tread(11-15)=${diff12_tread}`);
  console.log(`  _0 vs _2: total=${diff02_all}, tread(11-15)=${diff02_tread}`);
}
