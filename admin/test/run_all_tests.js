const path = require('path');
const testBackendApi = require('./test_backend_api');
const testSyncSyntax = require('./test_sync_syntax');
const testFrontendAssets = require('./test_frontend_assets');
const testEdgeCases = require('./test_edge_cases');
const testVercelContract = require('./test_vercel_contract');

function padRight(str, len) {
  str = String(str);
  return str.length >= len ? str.substring(0, len) : str + ' '.repeat(len - str.length);
}

function padLeft(str, len) {
  str = String(str);
  return str.length >= len ? str.substring(0, len) : ' '.repeat(len - str.length) + str;
}

function padCenter(str, len) {
  str = String(str);
  if (str.length >= len) return str.substring(0, len);
  const left = Math.floor((len - str.length) / 2);
  const right = len - str.length - left;
  return ' '.repeat(left) + str + ' '.repeat(right);
}

async function runAllSuites() {
  console.log('\n===================================================================================');
  console.log('              HANGEUL VALLEY ADMIN PANEL - MASTER TEST SUITE                      ');
  console.log('===================================================================================\n');

  const suites = [
    { label: 'REST API Endpoints', module: testBackendApi },
    { label: 'Data Sync & Syntax Verification', module: testSyncSyntax },
    { label: 'Frontend Assets & UI Integrity', module: testFrontendAssets },
    { label: 'Edge Cases & Data Integrity', module: testEdgeCases },
    { label: 'Vercel vs Express GET contract', module: testVercelContract }
  ];

  const results = [];
  let grandTotal = 0;
  let grandPassed = 0;
  let grandFailed = 0;
  let grandDuration = 0;

  for (const s of suites) {
    process.stdout.write(`[RUNNING] ${s.label} ... `);
    try {
      const res = await s.module.runTests();
      results.push({
        label: s.label,
        total: res.total,
        passed: res.passed,
        failed: res.failed,
        duration: res.duration
      });
      grandTotal += res.total;
      grandPassed += res.passed;
      grandFailed += res.failed;
      grandDuration += res.duration;

      if (res.failed === 0) {
        console.log(`✅ PASSED (${res.passed}/${res.total} in ${res.duration}ms)`);
      } else {
        console.log(`❌ FAILED (${res.failed}/${res.total} failed in ${res.duration}ms)`);
      }
    } catch (err) {
      console.log(`❌ CRASHED (${err.message})`);
      results.push({
        label: s.label,
        total: 1,
        passed: 0,
        failed: 1,
        duration: 0
      });
      grandTotal += 1;
      grandFailed += 1;
    }
  }

  // Print ASCII Summary Table
  const wName = 40;
  const wTot = 7;
  const wPass = 8;
  const wFail = 8;
  const wTime = 12;

  const topBorder    = `┌${'─'.repeat(wName)}┬${'─'.repeat(wTot)}┬${'─'.repeat(wPass)}┬${'─'.repeat(wFail)}┬${'─'.repeat(wTime)}┐`;
  const midBorder    = `├${'─'.repeat(wName)}┼${'─'.repeat(wTot)}┼${'─'.repeat(wPass)}┼${'─'.repeat(wFail)}┼${'─'.repeat(wTime)}┤`;
  const bottomBorder = `└${'─'.repeat(wName)}┴${'─'.repeat(wTot)}┴${'─'.repeat(wPass)}┴${'─'.repeat(wFail)}┴${'─'.repeat(wTime)}┘`;

  console.log('\n===================================================================================');
  console.log('                           MASTER TEST SUMMARY TABLE                              ');
  console.log('===================================================================================');
  console.log(topBorder);
  console.log(`│${padCenter('Test Suite Name', wName)}│${padCenter('Total', wTot)}│${padCenter('Passed', wPass)}│${padCenter('Failed', wFail)}│${padCenter('Time (ms)', wTime)}│`);
  console.log(midBorder);

  for (const r of results) {
    const nameStr = padRight(' ' + r.label, wName);
    const totStr = padCenter(r.total, wTot);
    const passStr = padCenter(r.passed, wPass);
    const failStr = padCenter(r.failed, wFail);
    const timeStr = padCenter(`${r.duration}ms`, wTime);
    console.log(`│${nameStr}│${totStr}│${passStr}│${failStr}│${timeStr}│`);
  }

  console.log(midBorder);
  const totLabel = padRight(' TOTALS', wName);
  const totAll = padCenter(grandTotal, wTot);
  const passAll = padCenter(grandPassed, wPass);
  const failAll = padCenter(grandFailed, wFail);
  const timeAll = padCenter(`${grandDuration}ms`, wTime);
  console.log(`│${totLabel}│${totAll}│${passAll}│${failAll}│${timeAll}│`);
  console.log(bottomBorder);

  if (grandFailed === 0) {
    console.log('\n✅ RESULT: ALL TEST SUITES PASSED CLEANLY (100% PASS RATE)\n');
    process.exit(0);
  } else {
    console.log(`\n❌ RESULT: ${grandFailed} TEST(S) FAILED ACROSS SUITES\n`);
    process.exit(1);
  }
}

if (require.main === module) {
  runAllSuites().catch(err => {
    console.error('Fatal error during runAllSuites:', err);
    process.exit(1);
  });
}

module.exports = { runAllSuites };
