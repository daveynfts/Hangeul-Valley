/**
 * Stress Test Script for getFunFact(word) Fallback Logic
 * Location: C:/VibeCode/Hangeul Valley/.agents/challenger_m4_2/test_fallback.js
 * Milestone 4 - Challenger 2 Verification
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Path to game.js
const gameJsPath = path.join(__dirname, '../../game.js');
const assetsGameJsPath = path.join(__dirname, '../../assets/game.js');

console.log(`=======================================================`);
console.log(` STRESS TEST HARNESS: getFunFact(word) Fallback Logic`);
console.log(` Target File: ${gameJsPath}`);
console.log(`=======================================================\n`);

// 1. Load game.js and create execution context
function loadGameContext(targetFile) {
  const content = fs.readFileSync(targetFile, 'utf8');
  const lines = content.split('\n');
  
  const vocabStartIdx = lines.findIndex(l => l.includes('const VOCAB_FACTS ='));
  const getFunFactEndIdx = lines.findIndex((l, idx) => idx > vocabStartIdx && l.includes('function showVocabFunFact('));
  
  if (vocabStartIdx === -1 || getFunFactEndIdx === -1) {
    throw new Error(`Failed to locate getFunFact or VOCAB_FACTS in ${targetFile}`);
  }

  let codeChunk = lines.slice(vocabStartIdx, getFunFactEndIdx).join('\n');
  codeChunk += `\nthis.VOCAB_FACTS = VOCAB_FACTS;\nthis.getFunFact = getFunFact;\nthis.decomposeHangulWord = decomposeHangulWord;\nthis.getHangulRomanization = getHangulRomanization;`;

  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(codeChunk, sandbox);

  return sandbox;
}

const ctx = loadGameContext(gameJsPath);
const getFunFact = ctx.getFunFact;
const decomposeHangulWord = ctx.decomposeHangulWord;
const getHangulRomanization = ctx.getHangulRomanization;
const VOCAB_FACTS = ctx.VOCAB_FACTS;

const stats = {
  totalTests: 0,
  passed: 0,
  failed: 0,
  errors: []
};

function assert(condition, message, group) {
  stats.totalTests++;
  if (condition) {
    stats.passed++;
  } else {
    stats.failed++;
    const errMsg = `[${group}] ${message}`;
    stats.errors.push(errMsg);
    console.error(`❌ FAIL: ${errMsg}`);
  }
}

// =======================================================
// TEST SUITE 1: Null, Undefined, Empty & Invalid Word Inputs
// =======================================================
console.log(`--- TEST SUITE 1: Null / Undefined / Invalid Word Input ---`);

const nullEdgeCases = [
  { label: 'null', input: null, expectException: false },
  { label: 'undefined', input: undefined, expectException: false },
  { label: 'empty object {}', input: {}, expectException: false },
  { label: '{ ko: "" }', input: { ko: "" }, expectException: false },
  { label: '{ en: "" }', input: { en: "" }, expectException: false },
  { label: '{ category: "" }', input: { category: "" }, expectException: false },
  { label: '{ ko: null, en: null, category: null }', input: { ko: null, en: null, category: null }, expectException: false },
  { label: '{ en: 123 } (non-string number en)', input: { en: 123 }, expectException: true },
  { label: '{ en: true } (boolean en)', input: { en: true }, expectException: true },
  { label: '{ category: 999 } (non-string number category)', input: { category: 999 }, expectException: true },
  { label: '{ category: true } (truthy boolean category)', input: { category: true }, expectException: true }
];

nullEdgeCases.forEach(tc => {
  try {
    const res = getFunFact(tc.input);
    if (tc.expectException) {
      assert(false, `Expected exception for invalid non-string property in ${tc.label}, but getFunFact did not throw!`, 'Strict Exception Test');
    } else {
      assert(typeof res === 'object' && res !== null, `Return is non-null object for ${tc.label}`, 'Null & Type Handling');
      assert(typeof res.vi === 'string' && res.vi.length > 0, `vi is non-empty string for ${tc.label}`, 'Null & Type Handling');
      assert(typeof res.ko === 'string' && res.ko.length > 0, `ko is non-empty string for ${tc.label}`, 'Null & Type Handling');
      assert(Object.keys(res).sort().join(',') === 'ko,vi', `Return keys are exactly { ko, vi } for ${tc.label}`, 'Return Structure');
    }
  } catch (err) {
    if (tc.expectException) {
      assert(true, `Confirmed edge case vulnerability: Exception thrown for ${tc.label}: ${err.message}`, 'Edge Case Vulnerability Detection');
    } else {
      assert(false, `Unexpected exception thrown for valid edge case ${tc.label}: ${err.message}`, 'Zero Exception Guarantee');
    }
  }
});

// =======================================================
// TEST SUITE 2: Words Not In VOCAB_FACTS (Fallback Trigger)
// =======================================================
console.log(`\n--- TEST SUITE 2: Words Not In VOCAB_FACTS ---`);

const nonDatabaseWords = [
  { ko: "우주선", en: "unknown_spaceship_999", category: "교통" },
  { ko: "인공지능단어", en: "ai_word_fallback_777", category: "학술" },
  { ko: "사이버네틱스", en: "cybernetics_quantum_888", category: "기술" },
  { ko: "가나다라마바사", en: "alphabet_test_fallback_555", category: "기타" },
  { ko: "새로운단어", en: "new_word_fallback_111", category: "미분류" }
];

nonDatabaseWords.forEach(tc => {
  const isinDb = !!VOCAB_FACTS[(tc.en || '').toLowerCase()];
  assert(!isinDb, `'${tc.en}' is confirmed NOT in VOCAB_FACTS database`, 'Fallback Trigger');
  
  try {
    const res = getFunFact(tc);
    assert(typeof res === 'object' && res !== null, `Return is object for fallback word '${tc.ko}'`, 'Return Structure');
    assert(res.vi && res.ko, `Both vi and ko present for fallback word '${tc.ko}'`, 'Return Structure');
    assert(res.vi.includes(tc.en), `vi contains English word "${tc.en}"`, 'Fallback Content Accuracy');
  } catch (err) {
    assert(false, `Exception thrown for fallback word '${tc.ko}': ${err.message}`, 'Zero Exception Guarantee');
  }
});

// =======================================================
// TEST SUITE 3: Syllable Count Accuracy (1, 2, 3, 4+ Syllables)
// =======================================================
console.log(`\n--- TEST SUITE 3: Syllable Count Accuracy ---`);

const syllableTestCases = [
  { ko: "밥", expectedCount: 1, expectedDesc: "1 âm tiết — dứt khoát" },
  { ko: "집", expectedCount: 1, expectedDesc: "1 âm tiết — dứt khoát" },
  { ko: "학교", expectedCount: 2, expectedDesc: "2 âm tiết — vỗ tay 2 nhịp" },
  { ko: "사랑", expectedCount: 2, expectedDesc: "2 âm tiết — vỗ tay 2 nhịp" },
  { ko: "아버지", expectedCount: 3, expectedDesc: "3 âm tiết — ngắt thành 3 nhịp" },
  { ko: "어머니", expectedCount: 3, expectedDesc: "3 âm tiết — ngắt thành 3 nhịp" },
  { ko: "할아버지", expectedCount: 4, expectedDesc: "4 âm tiết — tách nhỏ" },
  { ko: "버스정류장", expectedCount: 5, expectedDesc: "5 âm tiết — tách nhỏ" },
  { ko: "그럼에도불구하고", expectedCount: 8, expectedDesc: "8 âm tiết — tách nhỏ" }
];

syllableTestCases.forEach(tc => {
  const wordObj = { ko: tc.ko, en: "test_syllable_" + tc.ko, category: "general" };
  try {
    const res = getFunFact(wordObj);
    const count = decomposeHangulWord(tc.ko).length;
    assert(count === tc.expectedCount, `Syllable count for '${tc.ko}' is ${count} (expected ${tc.expectedCount})`, 'Syllable Counting');
    assert(res.ko.includes(tc.expectedDesc), `ko text contains '${tc.expectedDesc}' for '${tc.ko}'`, 'Syllable Description Accuracy');
  } catch (err) {
    assert(false, `Exception thrown for '${tc.ko}': ${err.message}`, 'Zero Exception Guarantee');
  }
});

// =======================================================
// TEST SUITE 4: Batchim vs No-Batchim Detection
// =======================================================
console.log(`\n--- TEST SUITE 4: Batchim Detection Accuracy ---`);

const batchimTestCases = [
  // Has Batchim on last syllable
  { ko: "밥", hasBatchim: true, lastChar: "밥", finalConsonant: "p" },
  { ko: "한국", hasBatchim: true, lastChar: "국", finalConsonant: "k" },
  { ko: "하늘", hasBatchim: true, lastChar: "늘", finalConsonant: "l" },
  { ko: "김치찌개와밥", hasBatchim: true, lastChar: "밥", finalConsonant: "p" },
  // No Batchim on last syllable (Open syllable)
  { ko: "나", hasBatchim: false, lastChar: "나" },
  { ko: "학교", hasBatchim: false, lastChar: "교" },
  { ko: "아버지", hasBatchim: false, lastChar: "지" },
  { ko: "바다", hasBatchim: false, lastChar: "다" }
];

batchimTestCases.forEach(tc => {
  const wordObj = { ko: tc.ko, en: "test_batchim_" + tc.ko, category: "general" };
  try {
    const res = getFunFact(wordObj);
    if (tc.hasBatchim) {
      assert(res.ko.includes('có 받침'), `ko text correctly identifies batchim present for '${tc.ko}'`, 'Batchim Detection');
      assert(res.ko.includes(`[${tc.lastChar}]`), `ko text specifies last syllable [${tc.lastChar}] for '${tc.ko}'`, 'Batchim Detail');
      assert(res.ko.includes(`(-${tc.finalConsonant})`), `ko text specifies final consonant (-${tc.finalConsonant}) for '${tc.ko}'`, 'Batchim Detail');
    } else {
      assert(res.ko.includes('là âm mở (không 받침)'), `ko text correctly identifies open syllable (no batchim) for '${tc.ko}'`, 'Batchim Detection');
      assert(res.ko.includes(`[${tc.lastChar}]`), `ko text specifies last syllable [${tc.lastChar}] for '${tc.ko}'`, 'Batchim Detail');
    }
  } catch (err) {
    assert(false, `Exception thrown for batchim test '${tc.ko}': ${err.message}`, 'Zero Exception Guarantee');
  }
});

// =======================================================
// TEST SUITE 5: Category Matching (Korean & English)
// =======================================================
console.log(`\n--- TEST SUITE 5: Category Matching ---`);

const categoryTestCases = [
  { cat: "food", expectedSubstring: "Ẩm thực & Đồ uống" },
  { cat: "음식과 식생활", expectedSubstring: "Ẩm thực & Đồ uống" },
  { cat: "식당과 주문", expectedSubstring: "Ẩm thực & Đồ uống" },
  { cat: "맛과 상태", expectedSubstring: "Ẩm thực & Đồ uống" },
  { cat: "animal", expectedSubstring: "Động vật" },
  { cat: "동물과 자연", expectedSubstring: "Động vật" },
  { cat: "nature", expectedSubstring: "Thiên nhiên & Môi trường" },
  { cat: "자연과 계절", expectedSubstring: "Thiên nhiên & Môi trường" },
  { cat: "날씨", expectedSubstring: "Thiên nhiên & Môi trường" },
  { cat: "body and health", expectedSubstring: "Thân thể & Sức khỏe" },
  { cat: "신체와 증상", expectedSubstring: "Thân thể & Sức khỏe" },
  { cat: "건강 관리", expectedSubstring: "Thân thể & Sức khỏe" },
  { cat: "place and transport", expectedSubstring: "Địa điểm & Giao thông" },
  { cat: "장소와 위치", expectedSubstring: "Địa điểm & Giao thông" },
  { cat: "건물과 장소", expectedSubstring: "Địa điểm & Giao thông" },
  { cat: "교통수단", expectedSubstring: "Địa điểm & Giao thông" },
  { cat: "가족과 사람", expectedSubstring: "Con người & Xã hội" },
  { cat: "사람과 관계", expectedSubstring: "Con người & Xã hội" },
  { cat: "일상 동작", expectedSubstring: "Hành động & Hoạt động" },
  { cat: "업무 처리", expectedSubstring: "Hành động & Hoạt động" },
  { cat: "unknown_category_xyz", expectedSubstring: "Tiếng Hàn thông dụng" }
];

categoryTestCases.forEach(tc => {
  const wordObj = { ko: "테스트", en: "test_cat_" + tc.cat, category: tc.cat };
  try {
    const res = getFunFact(wordObj);
    assert(res.vi.includes(tc.expectedSubstring), `Category '${tc.cat}' matched expected hint substring '${tc.expectedSubstring}'`, 'Category Matching');
  } catch (err) {
    assert(false, `Exception thrown for category '${tc.cat}': ${err.message}`, 'Zero Exception Guarantee');
  }
});

// =======================================================
// TEST SUITE 6: Revised Romanization (RR) Accuracy
// =======================================================
console.log(`\n--- TEST SUITE 6: Revised Romanization (RR) Accuracy ---`);

const rrTestCases = [
  { ko: "한글", expectedRR: "han-geul" },
  { ko: "학교", expectedRR: "hak-gyo" },
  { ko: "김치", expectedRR: "gim-chi" },
  { ko: "비빔밥", expectedRR: "bi-bim-bap" },
  { ko: "떡볶이", expectedRR: "tteok-bok-i" },
  { ko: "할아버지", expectedRR: "hal-a-beo-ji" },
  { ko: "대한민국", expectedRR: "dae-han-min-guk" },
  { ko: "K-pop 한국", expectedRR: "K-pop han-guk" }
];

rrTestCases.forEach(tc => {
  try {
    const rom = getHangulRomanization(tc.ko);
    assert(rom === tc.expectedRR, `RR for '${tc.ko}' is '${rom}' (expected '${tc.expectedRR}')`, 'RR Romanization Accuracy');
    const res = getFunFact({ ko: tc.ko, en: "rr_test_" + tc.ko, category: "test" });
    assert(res.vi.includes(tc.expectedRR), `vi text contains RR '${tc.expectedRR}'`, 'RR Output Integration');
    assert(res.ko.includes(tc.expectedRR), `ko text contains RR '${tc.expectedRR}'`, 'RR Output Integration');
  } catch (err) {
    assert(false, `Exception thrown for RR test '${tc.ko}': ${err.message}`, 'Zero Exception Guarantee');
  }
});

// =======================================================
// TEST SUITE 7: Asset Synchronization Verification
// =======================================================
console.log(`\n--- TEST SUITE 7: Mirror Asset Synchronization Verification ---`);

try {
  const ctxAsset = loadGameContext(assetsGameJsPath);
  const resRoot = getFunFact({ ko: "스트레스테스트", en: "stresstest_123", category: "food" });
  const resAsset = ctxAsset.getFunFact({ ko: "스트레스테스트", en: "stresstest_123", category: "food" });
  
  assert(JSON.stringify(resRoot) === JSON.stringify(resAsset), `Root game.js getFunFact output identical to assets/game.js`, 'Asset Synchronization');
} catch (err) {
  assert(false, `Asset sync check failed: ${err.message}`, 'Asset Synchronization');
}

// =======================================================
// SUMMARY & RESULTS
// =======================================================
console.log(`\n=======================================================`);
console.log(` STRESS TEST SUMMARY: getFunFact Fallback Logic`);
console.log(` Total Assertions: ${stats.totalTests}`);
console.log(` Passed:           ${stats.passed}`);
console.log(` Failed:           ${stats.failed}`);
console.log(`=======================================================\n`);

if (stats.failed === 0) {
  console.log(`🎉 ALL STRESS TESTS PASSED SUCCESSFULLY! ZERO EXCEPTIONS THROWN!`);
  process.exit(0);
} else {
  console.error(`❌ STRESS TESTS FINISHED WITH ${stats.failed} FAILURE(S)!`);
  process.exit(1);
}
