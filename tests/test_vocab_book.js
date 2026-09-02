'use strict';

const fs = require('fs');
const path = require('path');
const study = require('../js/vocabStudy');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'css', 'game.css'), 'utf8');
const ui = fs.readFileSync(path.join(ROOT, 'js', 'ui.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'js', 'manifest.json'), 'utf8'));

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL: ' + message);
    process.exit(1);
  }
  console.log('ok  ' + message);
}

assert(study.vbRomanize('아버지') === 'abeoji', 'written-form guide romanizes 아버지');
assert(study.vbRomanize('한국') === 'hanguk', 'written-form guide preserves final consonants');
assert(study.vbRomanize('설렁하다') === 'seolleonghada', 'ㄹ + ㄹ spelling joins as ll');

const closed = study.vbEndingRule('학생');
assert(closed.batchim === 'ㅇ' && closed.topic === '은' && closed.subject === '이'
  && closed.object === '을' && closed.direction === '으로',
  'closed final block selects the closed particle forms');
const open = study.vbEndingRule('학교');
assert(!open.closed && open.topic === '는' && open.subject === '가'
  && open.object === '를' && open.direction === '로',
  'open final block selects the open particle forms');
assert(study.vbEndingRule('서울').direction === '로', 'ㄹ 받침 follows the special 로 rule');

const abbreviation = study.vbDetailModel({ ko: 'SNS', en: 'social network service' }, null);
assert(abbreviation.type === 'Abbreviation' && abbreviation.syllableCount === 0
  && abbreviation.ending.available === false && /final spoken sound/.test(abbreviation.studyNote),
  'Latin-letter abbreviations get an honest pronunciation-based fallback');

const detailed = study.vbDetailModel(
  { ko: '썰렁하다', en: 'to be deserted or chilly', categoryEn: 'Society', forms: ['썰렁한', '썰렁해'] },
  { o: 'native' }
);
assert(detailed.type === 'Descriptive predicate', 'a to-be gloss identifies a descriptive predicate');
assert(detailed.syllableCount === 4 && detailed.blocks[0].initial === 'ㅆ'
  && detailed.blocks[0].vowel === 'ㅓ' && detailed.blocks[0].final === 'ㄹ',
  'detail model decomposes every Hangul block into jamo');
assert(detailed.forms.length === 2 && /stem 썰렁하-/.test(detailed.studyNote),
  'detail model retains curated forms and gives a word-specific study note');

const levels = JSON.parse(fs.readFileSync(path.join(ROOT, 'levels.json'), 'utf8'));
const worldFiles = fs.readdirSync(path.join(ROOT, 'worlds'))
  .filter(name => /^(2b-unit-(10|11|13|14|15)|topik-2)\.json$/.test(name));
const words = levels.flatMap(level => level.words || []);
worldFiles.forEach(name => {
  const world = JSON.parse(fs.readFileSync(path.join(ROOT, 'worlds', name), 'utf8'));
  words.push(...((world.level && world.level.words) || []));
});
const broken = words.filter(word => {
  const model = study.vbDetailModel(word, null);
  return !model.romanization || model.syllableCount !== model.blocks.length || !model.ending.label
    || !model.type || !model.studyNote || model.blocks.some(block => !block.initial || !block.vowel);
});
assert(broken.length === 0,
  `all ${words.length} shipped vocabulary entries receive complete derived study details`);

assert(manifest.includes('js/vocabStudy.js'), 'runtime manifest loads vocabulary study helpers');
assert(html.indexOf('js/vocabStudy.js') >= 0 && html.indexOf('js/vocabStudy.js') < html.indexOf('js/ui.js'),
  'study helpers load before the vocabulary UI');
[
  'vocab-progress-summary', 'vff-romanization', 'vff-word-type', 'vff-syllable-grid',
  'vff-particle-row', 'vff-study-note', 'vff-skill-grid', 'vff-related-grid',
  'vff-prev-btn', 'vff-next-btn'
].forEach(id => assert(html.includes(`id="${id}"`), `word-detail page contains #${id}`));

assert(/#vocab-panel\s*\{[^}]*width:\s*100%[^}]*height:\s*100vh;\s*height:\s*100dvh/s.test(css),
  'vocabulary book fills the viewport');
const vocabPanelBlock = (css.match(/#vocab-panel\s*\{[^}]*\}/s) || [''])[0];
assert(!/width:\s*min\(1000px,\s*94vw\)/.test(vocabPanelBlock)
  && !/height:\s*86vh/.test(vocabPanelBlock)
  && !/max-height:\s*800px/.test(vocabPanelBlock),
  'the old centered vocabulary modal sizing has been removed');
assert(!/@media \(max-width:\s*768px\)[\s\S]*?#vocab-panel[\s\S]*?width:\s*96vw/.test(css)
  && !/@media \(max-width:\s*480px\)[\s\S]*?#vocab-panel[\s\S]*?width:\s*98vw/.test(css),
  'mobile rules cannot restore the old inset vocabulary modal');
const release = (html.match(/<body\b[^>]*\bdata-ui-release="([^"]+)"/) || [])[1];
assert(!!release
  && html.includes(`href="css/game.css?v=${release}"`)
  && [...html.matchAll(/<script\b[^>]*\bsrc="(js\/[^"]+)"/g)]
    .every(([, src]) => src.endsWith(`?v=${release}`)),
  'all vocabulary UI code is tied to one cache-busted release');
assert(/#vocab-grid\s*\{[^}]*minmax\(232px,\s*1fr\)/s.test(css),
  'desktop vocabulary cards use a large readable minimum width');
assert(/\.vc-emoji img\.vocab-art-icon\s*\{[^}]*height:\s*86px/s.test(css),
  'card artwork is enlarged to 86px on desktop');
assert(/#vff-inner\s*\{[^}]*height:\s*100vh;\s*height:\s*100dvh/s.test(css),
  'individual word details also fill the viewport');
assert(ui.includes('[w.ko, w.en, w.category, w.categoryEn, romanized]'),
  'book search covers Korean, English, categories and romanization');
assert(ui.includes("setModalState('vocab-overlay', true)")
  && ui.includes("setModalState('vocab-ff-modal', true)"),
  'book and detail page participate in the modal stack');
assert(ui.includes('vocabRenderSkillGrid(word)') && ui.includes('vocabRenderRelatedWords(word)'),
  'detail page renders per-skill progress and related vocabulary');

console.log('\ntest_vocab_book: all passed');
