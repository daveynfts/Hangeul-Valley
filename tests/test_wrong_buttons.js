'use strict';
/**
 * Wrong buttons that were good Korean, in the banks the Unit 12 and Unit 15 reviews had not read.
 *
 * A button marked wrong teaches that its Korean is wrong. Reading every row of the Unit 10 to 17
 * banks found 113 that were good Korean in their slot, in a handful of shapes:
 *   - the plain form a chapter's grammar refines — 예매했어요 beside 예매해 놓았어요, 쉴 거예요 beside
 *     쉴까 해요, 지각했어요 beside 지각할 뻔했어요, 앉았어요 beside 앉아 있어요;
 *   - -(으)ㄹ 때 for a past event, which Korean says when the main clause is past (아플 때 고향에
 *     가고 싶었어요), and 전에 where the page wanted 전까지;
 *   - 안 where the context names a cause that makes it 못;
 *   - a particle or a verb Korean allows as well — 제주도를 가요, 지하철에 타다, 테니스를 하다.
 * Each place went to the mistake the row's own grammar invites: -(으)ㄴ 때, -(으)ㄴ 전, 놓었어요,
 * 가을까, 뻔해요 in the present, the 으 a vowel stem never takes. The notes now say the old form
 * would be good Korean too, and name the new one, since the panel is read by someone who has just
 * picked it.
 *
 * Every swap is pinned below, so a revert — or a new bank copied from an old one — shows up by
 * name: the removed form is not back on its row as a wrong button, the mistake that replaced it
 * is there and is not the answer, and the row's notes name it.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log('  [PASS] ' + msg); } else { failed++; console.log('  [FAIL] ' + msg); }
}

// [exercise, row, the good Korean that was marked wrong, the mistake in its place, and — where
// the notes name that mistake by its particle or dictionary form — what they call it].
const SWAPS = {
  'unit10-textbook': [
    ['u10sgk-speak-1', 1, '우리 반 친구 생일이고', '우리 반 친구 생일이서'],
    ['u10sgk-task-1', 1, '먹을래', '먹을게'],
    ['u10sgk-task-1', 4, '만들어서', '만들는데'],
    ['u10sgk-check-2', 4, '맞니', '맞어']
  ],
  'unit10-workbook': [
    ['u10-pattern-3', 1, '제주도를', '제주도에게', '에게'],
    ['u10-pattern-3', 3, '우리 집을', '우리 집한테', '한테']
  ],
  'unit11-textbook': [
    ['u11sgk-read-1', 6, '하고', '거나'],
    ['u11sgk-culture-1', 5, '계실', '있으신']
  ],
  'unit11-workbook': [
    ['u11-grammar-2-2', 2, '시험마다', '시험 때마다에'],
    ['u11-grammar-2-2', 5, '고향 음식 먹을 때마다', '고향 음식을 먹을 때에마다'],
    ['u11-grammar-3-1', 5, '지하철에 타는 게 어때요', '지하철이 타는 게 어때요'],
    ['u11-grammar-4-1', 2, '타고 가기로 됐어요', '타고 가기를 했어요'],
    ['u11-pattern-4', 1, '제주도에 가기로 했어요', '제주도로 가기로 했아요'],
    ['u11-pattern-4', 3, '가족들과 저녁을 먹기로 됐어요', '가족들과 저녁을 먹기를 했어요']
  ],
  'unit13-workbook': [
    ['u13-grammar-1-2', 4, '끊을 수 있는지', '끊는 수 있을지'],
    ['u13-grammar-1-3', 6, '어떻게 도와줄 수 있는지', '어떻게 도와주는 수 있을지'],
    ['u13-pattern-1', 2, '좋은지 모르겠어요', '좋았을지 모르겠어요'],
    ['u13-pattern-1', 3, '올 수 있는지 모르겠어요', '올 수 있을지 몰라겠어요'],
    ['u13-grammar-2-3', 1, '하지만', '했겠지만'],
    ['u13-grammar-3-3', 7, '세일 기간 때문에', '세일 기간인 때문에']
  ],
  'unit14-textbook': [
    ['u14sgk-speak-1', 2, '집주인을 만날 때', '집주인을 만난 때'],
    ['u14sgk-task-1', 2, '여행을 갈 때', '여행을 간 때'],
    ['u14sgk-task-1', 4, '기억에 남은', '기억이 남는'],
    ['u14sgk-check-2', 4, '먹을 때', '먹은 때']
  ],
  'unit14-workbook': [
    ['u14-grammar-2-1', 2, '떠날 때', '떠난 때'],
    ['u14-grammar-2-1', 3, '할 때', '한 때'],
    ['u14-grammar-2-1', 5, '볼 때부터', '본 때부터'],
    ['u14-grammar-2-2', 1, '아플 때', '아픈 때'],
    ['u14-grammar-2-2', 2, '받을 때', '받은 때'],
    ['u14-grammar-2-2', 3, '할머니가 돌아가실 때', '할머니가 돌아가신 때'],
    ['u14-pattern-2', 1, '장학금을 받을 때', '장학금을 받은 때'],
    ['u14-pattern-2', 2, '할머니가 돌아가실 때', '할머니가 돌아가신 때'],
    ['u14-pattern-2', 3, '고향에 갈 때', '고향에 간 때'],
    ['u14-pattern-2', 4, '집에 도착할 때', '집에 도착한 때'],
    ['u14-grammar-4-3', 4, '안 받으면', '못 받아면']
  ],
  'unit15-workbook': [
    ['u15-grammar-3-1', 5, '손님들이 오기 전에', '손님들이 오셨기 전에'],
    ['u15-grammar-3-2', 1, '졸업하기 전에', '졸업한 전부터'],
    ['u15-grammar-3-2', 2, '한국에서 살기 전부터', '한국에서 사기 전에도'],
    ['u15-grammar-3-2', 4, '저녁 먹기 전에', '저녁 먹은 전까지'],
    ['u15-grammar-3-2', 6, '퇴근하기 전에', '퇴근한 전까지'],
    ['u15-grammar-2-2', 5, '안 가게 됐어요', '못 가게 됬어요']
  ],
  'unit16-textbook': [
    ['u16sgk-gram-1', 1, '예매했어요', '예매해 놓었어요'],
    ['u16sgk-gram-1', 2, '샀어요', '사 놓었어요'],
    ['u16sgk-gram-1', 3, '여세요', '열어 놓아세요'],
    ['u16sgk-gram-2', 5, '현금을 대신해서', '현금을 대신'],
    ['u16sgk-speak-1', 2, '예매했어요', '예매해 놓었어요'],
    ['u16sgk-speak-1', 4, '밥 대신에', '밥 대신을'],
    ['u16sgk-speak-1', 5, '끓일 수 있어요', '끓일 줄 알어요'],
    ['u16sgk-gram-3', 2, '가세요', '가까 해요'],
    ['u16sgk-gram-3', 2, '가고 싶어요', '갔을까 해요'],
    ['u16sgk-gram-4', 1, '했으니까', '했을 테니까'],
    ['u16sgk-gram-4', 3, '안 받을 테니까', '못 받는 테니까'],
    ['u16sgk-speak-2', 1, '초대할 건데', '초대할까 하은데'],
    ['u16sgk-speak-2', 3, '만들 수 있어', '만들 줄 알어'],
    ['u16sgk-speak-2', 5, '미리 볼게', '미리 봐 놓을께'],
    ['u16sgk-read-1', 4, '먹고', '나눠 먹어고'],
    ['u16sgk-culture-1', 1, '명절', '휴일'],
    ['u16sgk-culture-1', 3, '노래를', '옷을'],
    ['u16sgk-culture-1', 3, '음식을', '책을'],
    ['u16sgk-check-1', 1, '쉴 거예요', '쉬을까 해요'],
    ['u16sgk-check-1', 3, '저를 대신해서', '저를 대신'],
    ['u16sgk-check-1', 4, '샀어요', '사 놓었어요']
  ],
  'unit16-workbook': [
    ['u16-vocab-1', 3, '세배를 드려요', '세배를 지내요'],
    ['u16-vocab-3', 4, '방을 닦아요', '방을 씻었어요', '씻다'],
    ['u16-vocab-3', 4, '방을 닦을 거예요', '방을 빨았어요', '빨다'],
    ['u16-grammar-1-1', 1, '예매를 해야 돼요', '예매를 하 놓아야 돼요'],
    ['u16-grammar-1-1', 1, '예매를 해 놓았어요', '예매를 해 놓어야 돼요'],
    ['u16-grammar-1-1', 2, '청소를 해요', '청소를 해 놓아야 되요'],
    ['u16-grammar-1-1', 4, '장을 보러 가야 돼요', '장을 봐 놓아야 되요'],
    ['u16-grammar-1-1', 5, '돈을 찾아 놓았어요', '돈을 찾아 놓어야 돼요'],
    ['u16-grammar-2-1', 2, '전화 대신 문자를 했어요', '전화 대신 문자가 보냈어요'],
    ['u16-grammar-3-1', 1, '쇼핑을 할 거예요', '쇼핑을 하을까 해요'],
    ['u16-grammar-3-1', 4, '꽃을 살까 해요', '꽃을 사아 갈까 해요'],
    ['u16-grammar-3-2', 1, '갈까 했는데', '갈까 하는대'],
    ['u16-grammar-3-2', 6, '테니스를 할까 하는데', '테니스를 쳐까 하는데'],
    ['u16-grammar-4-1', 1, '제가 했으니까', '제가 했을 테니까'],
    ['u16-grammar-4-1', 2, '제가 살 거니까', '제가 사을 테니까'],
    ['u16-grammar-4-2', 5, '전화를 안 받으실 테니까', '전화를 못 받으신 테니까'],
    ['u16-pattern-2', 3, '네, 벌써 예매해 놓았어요', '네, 벌써 예약해 놓었어요'],
    ['u16-pattern-3', 2, '영화를 볼 거예요', '영화를 보을까 해요']
  ],
  'unit17-textbook': [
    ['u17sgk-vocab-1', 5, '잃어버렸습니다', '놓쳤습니다'],
    ['u17sgk-gram-1', 4, '사 주세요', '사아다 주세요'],
    ['u17sgk-gram-2', 1, '지각했어요', '지각할 뻔해요'],
    ['u17sgk-gram-2', 2, '늦었어요', '늦을 뻔했아요'],
    ['u17sgk-gram-2', 3, '사고가 났어요', '사고가 나을 뻔했어요'],
    ['u17sgk-gram-2', 4, '큰일 날 뻔했어요', '큰일 날 뻔하네요'],
    ['u17sgk-speak-1', 5, '다행이었어요', '다행히에요'],
    ['u17sgk-gram-3', 3, '빨개요', '빨가져요'],
    ['u17sgk-gram-4', 2, '선', '서 있은'],
    ['u17sgk-gram-4', 3, '앉았어요', '앉어 있어요'],
    ['u17sgk-speak-2', 4, '큰일이에요', '큰일을 났네요'],
    ['u17sgk-speak-2', 5, '연락 드릴 거니까', '연락 드리을 테니까'],
    ['u17sgk-listen-1', 4, '가지고 있어야', '가지고 가아야'],
    ['u17sgk-culture-1', 1, '꽃', '눈'],
    ['u17sgk-culture-1', 1, '하늘', '밤'],
    ['u17sgk-culture-1', 2, '예쁜', '교통'],
    ['u17sgk-culture-1', 2, '밝은', '날씨'],
    ['u17sgk-culture-1', 3, '행복', '병'],
    ['u17sgk-check-1', 1, '모시고 갔어요', '모셔다 주었어요'],
    ['u17sgk-check-1', 2, '놓칠 뻔했어요', '놓칠 뻔하네요'],
    ['u17sgk-check-1', 3, '앉은', '앉아 있은']
  ],
  'unit17-workbook': [
    ['u17-vocab-3', 2, '잃어버렸는데', '잃어버렸어서'],
    ['u17-grammar-1-2', 1, '사 주세요', '사아다 주세요'],
    ['u17-grammar-1-2', 3, '찾아 주세요', '찾어다 주세요'],
    ['u17-grammar-2-2', 1, '넘어졌습니다', '넘어진 뻔했습니다'],
    ['u17-grammar-2-2', 2, '부딪혔습니다', '부딪힌 뻔했습니다'],
    ['u17-grammar-2-2', 3, '떨어뜨렸습니다', '떨어뜨린 뻔했습니다'],
    ['u17-grammar-2-2', 4, '울었습니다', '운 뻔했습니다'],
    ['u17-grammar-2-2', 5, '내렸습니다', '내린 뻔했습니다'],
    ['u17-grammar-3-3', 5, '하얘요', '하야졌어요'],
    ['u17-grammar-4-1', 5, '교실에 앉았어요', '교실에 앉어 있어요'],
    ['u17-pattern-2', 1, '요리를 해서 불이 날 뻔했어요', '요리를 하다가 불이 날 뻔해요'],
    ['u17-pattern-2', 3, '버스에서 내려서 넘어질 뻔했어요', '버스에서 내리다가 넘어지을 뻔했어요']
  ]
};

const readBank = (b) => JSON.parse(fs.readFileSync(path.join(ROOT, 'worlds', b + '.json'), 'utf8'));
// The notes name a button when they print it, or print every word of it the answer does not have
// — 운 for 운 뻔했습니다 beside 울 뻔했습니다.
const names = (text, button, answer, called) => {
  if (called) return text.includes(called);
  if (text.includes(button)) return true;
  const own = button.split(' ').filter((w) => answer.split(' ').indexOf(w) < 0);
  return own.length > 0 && own.every((w) => text.includes(w));
};

console.log('\n--- Wrong buttons that are wrong ---');
let count = 0;
const missing = [];
const back = [];
const absent = [];
const unnamed = [];
Object.keys(SWAPS).forEach((bank) => {
  const data = readBank(bank);
  SWAPS[bank].forEach(([ex, n, removed, added, called]) => {
    count++;
    const where = bank + ' ' + ex + ' #' + n;
    const exercise = data.exercises.find((e) => e.id === ex);
    const row = exercise && (exercise.items || []).find((r) => r.n === n);
    if (!row || !Array.isArray(row.choices)) { missing.push(where); return; }
    const answer = row.choices.find((c) => c.id === row.answer);
    const wrong = row.choices.filter((c) => c.id !== row.answer).map((c) => c.ko);
    if (wrong.indexOf(removed) >= 0) back.push(where + ' — «' + removed + '»');
    if (wrong.indexOf(added) < 0) absent.push(where + ' — «' + added + '»');
    if (!names(row.why + ' ' + row.grammar, added, answer ? answer.ko : '', called)) unnamed.push(where + ' — «' + added + '»');
  });
});
const list = (xs) => (xs.length ? ' — ' + xs.length + ':\n      ' + xs.slice(0, 10).join('\n      ') : '');
assert(count === 113, 'the table holds the 113 swaps of the audit (' + count + ')');
assert(missing.length === 0, 'every row it names is still there, with its own buttons' + list(missing));
assert(back.length === 0, 'no good Korean it removed is back on its row as a wrong button' + list(back));
assert(absent.length === 0, 'the mistake that replaced each one is on the row, and is not the answer' + list(absent));
assert(unnamed.length === 0, 'and each row’s notes name that mistake' + list(unnamed));

// Two notes the audit corrected outright, so a revert shows up by name.
const u17wb = readBank('unit17-workbook');
assert(/only one whose verb takes -을 rather than a bare -ㄹ/.test(u17wb.exercises.find((e) => e.id === 'u17-pattern-2').noteEn),
  '죽다 is the one verb in 문형 연습 2 that takes -을, not the one that takes a bare -ㄹ');
const u14tb = readBank('unit14-textbook');
assert(!/\bhe\b/.test(u14tb.exercises.find((e) => e.id === 'u14sgk-speak-1').items.find((r) => r.n === 1).why),
  'Steven’s 의사님 story names Steven rather than guessing a pronoun');

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_wrong_buttons: all passed');
