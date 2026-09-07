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

// Grammar headwords are carried by their notation, and the scaffold has to draw it. The
// escaper is taken out of the shipped source rather than stubbed, because this is the one
// place the scaffold writes characters into HTML.
const vbA = ui.indexOf('function vbEsc(');
const vbEscSrc = ui.slice(vbA, ui.indexOf('}', ui.indexOf('&#39;', vbA)) + 1);
assert(vbEscSrc.indexOf('&amp;') > 0, 'the real vbEsc came out of js/ui.js');
const gctx = { hvT: i18n.hvT, factsData: {} };
vm.runInNewContext([
  vbEscSrc,
  ui.slice(start, end),
  'this.shape = (ko) => recallShapeGroups(ko);',
  'this.html = (ko) => renderRecallScaffoldHtml(ko).html;'
].join('\n'), gctx);

const lits   = (ko) => gctx.shape(ko).flat().filter(t => !t.tile).map(t => t.ch).join('');
const tiles  = (ko) => gctx.shape(ko).flat().filter(t => t.tile).length;
const groups = (ko) => gctx.shape(ko).length;

// What the learner has to type but could not see. V- and N are parts of speech, not words,
// so printing them gives nothing away and makes the question answerable at all.
assert(lits('V-기 전에') === 'V-', 'V-기 전에 shows its V- marker');
assert(tiles('V-기 전에') === 3, 'and still boxes all three syllables');
assert(groups('V-기 전에') === 2, 'in the two groups it is written in');
assert(lits('N을/를 비롯해서') === 'N/', '을/를 keeps the slash that separates the two particles');
assert(lits('-(으)ㄴ 후에') === '-()ㄴ', 'the brackets and bare jamo of -(으)ㄴ are notation');
assert(tiles('-(으)ㄴ 후에') === 3, 'and 으, 후, 에 stay boxed');
assert(lits('A-아지다/어지다') === 'A-/', 'an A- pattern with two endings shows both marks');
assert(lits('안 + V') === '+V', 'a lone V is a part of speech wherever it stands');

// The other half of the rule: where Latin is the answer it stays hidden. A letter beside
// another letter or a digit is a word, not a marker.
[['SNS', 3], ['PD', 2], ['IT산업', 4], ['1인실', 3], ['1970년대', 6]].forEach(([ko, n]) => {
  assert(lits(ko) === '', ko + ' prints none of its Latin or digits');
  assert(tiles(ko) === n, 'and boxes all ' + n + ' of its characters');
});
assert(lits('3D 프린팅') === '', '3D is a word, not a D-marker standing after a 3');

// The invariant the whole scaffold rests on, re-checked on the words that now print.
['V-기 전에', 'N을/를 비롯해서', '-(으)ㄴ 후에', 'IT산업', '안 + V'].forEach((ko) => {
  assert(!/[가-힣]/.test(gctx.html(ko)), ko + ' never spells a syllable into the HTML');
});
assert(gctx.html('V-기 전에').indexOf('recall-literal') > 0, 'notation renders as its own span');


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
