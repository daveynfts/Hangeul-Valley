'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'js', 'ui.js'), 'utf8');

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL: ' + msg);
    process.exit(1);
  }
  console.log('ok  ' + msg);
}

const start = ui.indexOf('function decomposeHangulWord');
const end = ui.indexOf('// English topical note, used when a word has no curated origin.');
assert(start >= 0 && end > start, 'recall helpers are in js/ui.js');
const ctx = {
  factsData: {
    '김치찌개': { o: 'sino' },
    '냉면': { o: 'sino' },
    '달다': { o: 'native' }
  }
};
vm.runInNewContext(
  ui.slice(start, end) +
  '\nthis.kimchi = renderRecallScaffold("김치찌개");' +
  '\nthis.kimchiH = renderRecallScaffoldHtml("김치찌개");' +
  '\nthis.naeng = renderRecallScaffoldHtml("냉면");' +
  '\nthis.dal = renderRecallScaffoldHtml("달다");',
  ctx
);

assert(ctx.kimchi.indexOf('김치찌개') < 0, 'text scaffold does not spell 김치찌개');
assert(ctx.kimchi.indexOf('closed · open · open · open') >= 0, '김치찌개 shape is closed-open-open-open');
assert(ctx.kimchi.indexOf('Sino-Korean') >= 0, '김치찌개 class is Sino-Korean');
assert((ctx.kimchiH.html.match(/class="recall-tile(?: batchim)?"/g) || []).length === 4, '김치찌개 has 4 tiles');
assert((ctx.kimchiH.html.match(/class="recall-tile batchim"/g) || []).length === 1, '김치찌개 has one closed tile');
assert(ctx.kimchiH.html.indexOf('김') < 0 && ctx.kimchiH.html.indexOf('찌개') < 0, 'HTML does not contain the Hangul');
assert((ctx.naeng.html.match(/class="recall-tile batchim"/g) || []).length === 2, '냉면 both blocks closed');
assert(ctx.dal.note === 'Native Korean', '달다 is native');

console.log('\ntest_phase3_recall: all passed');
