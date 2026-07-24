const { P, checkMatrix, autoEnclose, countDiffs } = require('./validate_robot_walk.js');

// --- DOWN WALK ---
const down_0_raw = [
  '.......KK.......',
  '......KORK......',
  '.......KK.......',
  '....KKKKKKKK....',
  '...KYYYYYYYYK...',
  '..KYyKbCCCCbYKK.',
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

const down_1_raw = [
  '......KORK......',
  '.......KK.......',
  '....KKKKKKKK....',
  '...KYYYYYYYYK...',
  '..KYyKbCCCCbYKK.',
  '..KYyKCLWCLWbYK.',
  '..KJJyKbbbbKYJK.',
  '..KKmYYYYYYmKK..',
  '..KSmYyGRyYmSK..',
  '.KKSsDDDDDDsSKK.',
  '.KKSDDKKKKDDDKK.',
  '.KDsDDKKKKDmSDK.',
  '.KDmSDKKKKDsDDK.',
  '.KDsDDKKKKDmSDK.',
  '.KDmSDKKKKDmSDK.',
  '.KKKKKKKKKKKKKK.'
];

const down_2_raw = [
  '.......KK.......',
  '......KORK......',
  '.......KK.......',
  '....KKKKKKKK....',
  '...KYYYYYYYYK...',
  '..KYyKbCCCCbYKK.',
  '..KYyKCLWCLWbYK.',
  '..KJJyKbbbbKYJK.',
  '..KKmYYYYYYmKK..',
  '..KSmYyGRyYmSK..',
  '.KKSsDDDDDDsSKK.',
  '.KKSDDKKKKDDSDK.',
  '.KDmSDKKKKDsDDK.',
  '.KDmSDKKKKDsDDK.',
  '.KDsDDKKKKDsDDK.',
  '.KKKKKKKKKKKKKK.'
];

// --- UP WALK ---
const up_0_raw = [
  '.......KK.......',
  '......KORK......',
  '.......KK.......',
  '....KKKKKKKK....',
  '...KYYYYYYYYK...',
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

const up_1_raw = [
  '......KORK......',
  '.......KK.......',
  '....KKKKKKKK....',
  '...KYYYYYYYYK...',
  '...KYyJkkJyYK...',
  '...KYyJkkJyYK...',
  '...KJJyyyyJJK...',
  '..KKmYYYYYYmKK..',
  '..KSmYyDDyYmSK..',
  '.KKSsDDDDDDsSKK.',
  '.KKSDDKKKKDDDKK.',
  '.KDsDDKKKKDmSDK.',
  '.KDmSDKKKKDsDDK.',
  '.KDsDDKKKKDmSDK.',
  '.KDmSDKKKKDmSDK.',
  '.KKKKKKKKKKKKKK.'
];

const up_2_raw = [
  '.......KK.......',
  '......KORK......',
  '.......KK.......',
  '....KKKKKKKK....',
  '...KYYYYYYYYK...',
  '...KYyJkkJyYK...',
  '...KYyJkkJyYK...',
  '...KJJyyyyJJK...',
  '..KKmYYYYYYmKK..',
  '..KSmYyDDyYmSK..',
  '.KKSsDDDDDDsSKK.',
  '.KKSDDKKKKDDSDK.',
  '.KDmSDKKKKDsDDK.',
  '.KDmSDKKKKDsDDK.',
  '.KDsDDKKKKDsDDK.',
  '.KKKKKKKKKKKKKK.'
];

// --- LEFT WALK ---
const left_0_raw = [
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

const left_1_raw = [
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
  '.KDsDsDsDsDsDK..',
  '.KDmSmSmSmSmDK..',
  '.KDsDsDsDsDsDK..',
  '.KDmSmSmSmSmDK..',
  '.KDsDsDsDsDsDK..',
  '.KKKKKKKKKKKKK..'
];

const left_2_raw = [
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
  '.KDmDmDmDmDmDK..',
  '.KDsDsDsDsDsDK..',
  '.KDmDmDmDmDmDK..',
  '.KKKKKKKKKKKKK..'
];

// --- RIGHT WALK ---
const right_0_raw = [
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

const right_1_raw = [
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
  '..KDsDsDsDsDsDK.',
  '..KDmSmSmSmSmDK.',
  '..KDsDsDsDsDsDK.',
  '..KDmSmSmSmSmDK.',
  '..KDsDsDsDsDsDK.',
  '..KKKKKKKKKKKKK.'
];

const right_2_raw = [
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
  '...KKDDDDDDDDSDK',
  '..KDmDmDmDmDmDK.',
  '..KDsDsDsDsDsDK.',
  '..KDmDmDmDmDmDK.',
  '..KKKKKKKKKKKKK.'
];

const rawMap = {
  down_0: down_0_raw, down_1: down_1_raw, down_2: down_2_raw,
  up_0: up_0_raw, up_1: up_1_raw, up_2: up_2_raw,
  left_0: left_0_raw, left_1: left_1_raw, left_2: left_2_raw,
  right_0: right_0_raw, right_1: right_1_raw, right_2: right_2_raw
};

const cleanMap = {};
for (const [key, raw] of Object.entries(rawMap)) {
  cleanMap[key] = autoEnclose(raw);
  checkMatrix(key, cleanMap[key]);
}

const fs = require('fs');
fs.writeFileSync(
  'd:\\Hangeul Valley\\.agents\\teamwork_preview_explorer_m1_2\\clean_walk_matrices.json',
  JSON.stringify(cleanMap, null, 2)
);
console.log('Saved clean_walk_matrices.json successfully!');
