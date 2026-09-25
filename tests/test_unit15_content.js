'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = name => JSON.parse(fs.readFileSync(path.join(root, 'worlds', name + '.json'), 'utf8'));
const { sentenceUses } = require('../scripts/vocab_examples');
const i18n = require('../admin/lib/i18n');
const world = read('2b-unit-15');
assert.strictEqual(world.level.words.length, 104);
for (const word of world.level.words) {
  assert(word.example && word.exampleEn, word.ko + ': Korean example and translation');
  assert(!/\{\}|_{2,}/.test(word.example), word.ko + ': no unfinished gap');
  assert(sentenceUses(word.example, word.ko), word.ko + ': uses the headword');
  const vi = JSON.parse(fs.readFileSync(path.join(root, 'locales/vi/worlds/2b-unit-15.json'), 'utf8'));
  assert(vi.entries['exampleEn|' + word.exampleEn], word.ko + ': Vietnamese example');
}
// Guard the real failure: silent ㅎ in speech does not erase it in spelling.
for (const [word, good, bad] of [
  ['낳다', '언니가 아기를 낳았어요.', '나는 칼국수 먹을래.'],
  ['넣다', '물이 끓으면 라면을 넣으세요.', '너는 칼국수 먹을래?'],
  ['놓다', '책을 책상에 놓았어요.', '노는 시간이 좋아요.'],
  ['V-기 전에', '밥을 먹기 전에 손을 씻어요.', '밥을 먹은 후에 가요.'],
  ['V-(으)ㄴ 후에', '선물을 만든 후에 줄 거예요.', '밥을 먹기 후에 가요.']
]) {
  assert(sentenceUses(good, word), word + ': valid example');
  assert(!sentenceUses(bad, word), word + ': reject unrelated or malformed example');
}
assert(world.level.words.find(w => w.ko === '수도').example.includes('서울'));
const textbook = read('unit15-textbook');
assert.strictEqual(textbook.exercises.length, 14);
assert.strictEqual(textbook.exercises.flatMap(e => e.items).length, 62);
// 듣기 1 and 2 are keyed from 모범 답안 on printed p.267 — 1. ①, 2. 1) ② and 2) ②, ③. The
// second question asks for all that apply, so its row asks for the one option that is not
// one of his plans, which leaves ① — the book's own options, turned round.
const page = id => textbook.exercises.find(e => e.id === id);
const keyed = row => row.choices.find(c => c.id === row.answer).ko;
assert(/^①/.test(keyed(page('u15sgk-listen-1').items[0])), '듣기 1 keys ①');
assert(/^②/.test(keyed(page('u15sgk-listen-2').items[0])), '듣기 2 question 1 keys ②');
const plans = page('u15sgk-listen-2').items.find(row => /하고 싶은 일/.test(row.lines[0].ko));
assert(plans && /^①/.test(keyed(plans))
  && plans.choices.filter(c => c.id !== plans.answer).map(c => c.ko.charAt(0)).sort().join('') === '②③',
  '듣기 2 question 2 leaves ① once ② and ③, the answers 모범 답안 prints, are taken out');
// Every row plays either its page's own track or a clip of one of its own lines, in the voice
// the line is printed in.
const clips = new Map(read('unit15-cassette').dictation.items.map(d => [d.audio.src, d]));
for (const [id, track] of [['u15sgk-listen-1', 'trk58'], ['u15sgk-listen-2', 'trk59']]) {
  const listen = page(id);
  assert(listen.holdGloss === true, id + ': the English waits until the page is checked');
  for (const row of [listen.example, ...listen.items]) {
    const src = row.audio && row.audio.src;
    assert(src && fs.existsSync(path.join(root, src)), id + ': every row plays a recording on disk');
    const d = clips.get(src);
    if (!d) { assert(src.endsWith(track + '.mp3'), id + ': a row with no clip plays ' + track); continue; }
    const answer = row === listen.example ? row.answerKo : keyed(row);
    const lines = row.lines.map(l => l.ko.replace('{}', answer));
    const k = lines.indexOf(d.ko);
    assert(k >= 0 && row.lines[k].who === d.who, id + ': ' + src + ' says its row’s own line, in its own voice');
  }
}
for (const name of ['unit15-textbook', 'unit15-workbook']) {
  for (const e of read(name).exercises) {
    assert(e.example && e.example.answerKo && e.example.en, e.id + ': worked example');
    for (const row of [e.example, ...e.items]) {
      const answers = row === e.example ? [row.answerKo, row.answer2Ko]
        : [row.choices.find(c => c.id === row.answer)?.ko,
          row.choices2?.find(c => c.id === row.answer2)?.ko];
      let slot = 0;
      const text = row.lines.map(l => l.ko).join(' ').replace(/\{\}/g, () => answers[slot++] || 'MISSING');
      assert(!text.includes('MISSING'), e.id + ': all answer slots resolve');
      if (row.choices) assert.strictEqual(new Set(row.choices.map(c => c.ko)).size, row.choices.length);
    }
  }
}
// 말하기 2 is built from photographs of printed pp.146-147, which the scan of the student book
// does not have. Rows 1-4 are four turns of track 57 with a word from the page's vocabulary box
// taken out; rows 5-7 are the second column of 연습 1, each dropped into the frame it replaces.
const speak2 = page('u15sgk-speak-2');
assert.strictEqual(speak2.items.length, 7);
const order = textbook.exercises.map(e => e.id);
assert(order.indexOf('u15sgk-gram-4') + 1 === order.indexOf('u15sgk-speak-2')
  && order.indexOf('u15sgk-speak-2') + 1 === order.indexOf('u15sgk-listen-1'),
  '말하기 2 sits between 문법과 표현 2 and 듣고 말하기, as printed');
assert.deepStrictEqual(speak2.items.slice(0, 4).map(keyed), ['아직도', '고생했는데', '다행이네요', '잘될 거예요'],
  'rows 1-4 key the words of the page’s vocabulary box, in the forms the conversation uses');
const cues = speak2.items.slice(4).flatMap(row => ((row.phraseKo.match(/\(([^)]*)\)$/) || [])[1] || '').split(' / '));
assert.deepStrictEqual(cues, ['한국 문화를 잘 모르다', '좀 이해하다', '대학교에 다니다', '졸업하다', '대학원에 가다'],
  'rows 5-7 are the second column of 연습 1, in order');
const keyed2 = row => row.choices2.find(c => c.id === row.answer2).ko;
assert.deepStrictEqual([keyed(speak2.items[4]), keyed2(speak2.items[4]), keyed(speak2.items[5]),
  keyed(speak2.items[6]), keyed2(speak2.items[6])],
['한국 문화를 잘 몰라서', '좀 이해하게 되었어요', '대학교에 다니기 전에', '졸업한 후에는', '대학원에 가려고 하는데'],
'and each is keyed in the form its slot in the conversation takes');
for (const row of [speak2.example, ...speak2.items].filter(r => r.audio)) {
  const d = clips.get(row.audio.src);
  assert(d && d.track === 57, 'u15sgk-speak-2: ' + row.audio.src + ' is a clip of track 57');
  const answer = row === speak2.example ? row.answerKo : keyed(row);
  const lines = row.lines.map(l => l.ko.replace('{}', answer));
  const k = lines.indexOf(d.ko);
  assert(k >= 0 && row.lines[k].who === d.who, 'u15sgk-speak-2: ' + row.audio.src + ' says its row’s own line, in its own voice');
}
const reading = textbook.exercises.find(e => e.id === 'u15sgk-read-1');
assert(reading.items.every(row => row.lines.some(l => l.who === '읽기 요약')), 'reading has visible context');
assert.strictEqual(reading.items[0].lines.find(l => l.who === '질문').ko,
  '이 사람에 대한 설명으로 맞지 않는 것을 고르세요.');
for (const name of ['2b-unit-15', 'unit15-textbook', 'unit15-workbook', 'unit15-desk-quiz']) {
  const report = i18n.rows(root, 'worlds/' + name + '.json', 'vi');
  assert.strictEqual(report.rows.filter(r => !r.done).length, 0, name + ': translations complete');
  assert.strictEqual(report.stale.length, 0, name + ': translations current');
}
console.log('test_unit15_content: examples, reading, answer slots, translations and matching regressions passed');
