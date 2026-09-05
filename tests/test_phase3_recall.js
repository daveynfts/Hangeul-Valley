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
const end = ui.indexOf('// Which topical note a word gets, as an id.');
assert(start >= 0 && end > start, 'recall helpers are in js/ui.js');
// The block count is worded from the catalogue now, so the context needs the real hvT over
// the real js/locales/en.js — a stub would answer with the key and the assertions below would
// be checking that a lookup happened rather than what it says.
const i18n = require('../js/i18n.js');
i18n.hvRegisterLocale('en', require('../admin/lib/i18n.js').readChromeTable(ROOT, 'en'));
const ctx = {
  hvT: i18n.hvT,
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
  '\nthis.dal = renderRecallScaffoldHtml("달다");' +
  '\nthis.phrase = renderRecallScaffoldHtml("김치 찌개");',
  ctx
);

assert(ctx.kimchi.indexOf('김치찌개') < 0, 'text scaffold does not spell 김치찌개');
assert(ctx.kimchi.indexOf('open') < 0 && ctx.kimchi.indexOf('closed') < 0, 'text scaffold has no open/closed caption');
assert(ctx.kimchi.indexOf('Sino-Korean') >= 0, '김치찌개 class is Sino-Korean');
assert((ctx.kimchiH.html.match(/class="recall-tile(?: batchim)?"/g) || []).length === 4, '김치찌개 has 4 tiles');
assert((ctx.kimchiH.html.match(/class="recall-tile batchim"/g) || []).length === 1, '김치찌개 has one closed tile');
assert((ctx.kimchiH.html.match(/class="recall-word"/g) || []).length === 1, '김치찌개 is one written word');
assert(ctx.kimchiH.html.indexOf('open') < 0 && ctx.kimchiH.html.indexOf('closed') < 0, 'HTML has no open/closed caption');
assert(ctx.kimchiH.html.indexOf('recall-caption') < 0, 'HTML has no caption line');
assert(ctx.kimchiH.html.indexOf('김') < 0 && ctx.kimchiH.html.indexOf('찌개') < 0, 'HTML does not contain the Hangul');
assert((ctx.naeng.html.match(/class="recall-tile batchim"/g) || []).length === 2, '냉면 both blocks closed');
assert(ctx.dal.note === 'Native Korean', '달다 is native');
assert((ctx.phrase.html.match(/class="recall-word"/g) || []).length === 2, 'spaced vocab splits into two tile groups');
assert((ctx.phrase.html.match(/class="recall-tile(?: batchim)?"/g) || []).length === 4, '김치 찌개 still has 4 tiles');

console.log('\ntest_phase3_recall: all passed');
