'use strict';
/**
 * tests/test_reviews.js — the 익힘책's 복습, each a bank of its own.
 *
 * The 2B 익힘책 prints a review after every third unit: 복습 4 on pp.56-73 after Unit 12, 복습 5 on
 * pp.116-135 after Unit 15 and 복습 6 on pp.176-195 after Unit 18, each with its answers in the 정답
 * at the back and its 듣기 지문 in the appendix. The scan has no printed pp.62-63, so 복습 4 is
 * without 평가하기 17-20 and 듣기 1-2 until those pages are photographed, and says so. A review tests three units at once and belongs to none of them, so it is
 * worlds/review<N>-workbook.json rather than more pages in a unit bank, and it sits on the desk
 * of the unit it follows as a fourth row, 복습. For each review this suite pins:
 *
 *   1. the bank's shape and order, which is the book's;
 *   2. every key against the 정답, by the number the book prints its options under;
 *   3. the write-in answers of 읽기와 쓰기 11-16, verbatim from the 정답, and wrong buttons that are
 *      wrong rather than merely different;
 *   4. the recordings — one clip per 듣기 question off the review's track, one per 발음 item — against
 *      the cut and the 듣기 지문;
 *   5. that the page answers nothing before it is checked, the English and the voice both;
 *   6. the Vietnamese, and the wiring from the desk to the admin to the publish batch.
 *
 * Run: node tests/test_reviews.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const nfc = (s) => String(s == null ? '' : s).normalize('NFC');
const syl = (s) => [...nfc(s)].filter((c) => c >= '가' && c <= '힣').length;
const CIRCLED = '①②③④';

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}

// The book prints both reviews in the same eighteen parts.
const ORDER = ['확인하기', '평가하기 1-2', '평가하기 3-4', '평가하기 5-10', '평가하기 11-12', '평가하기 13-16', '평가하기 17-20',
  '듣기 1-2', '듣기 3-7', '듣기 8-9', '듣기 10-11', '듣기 12-15',
  '읽기와 쓰기 1-2', '읽기와 쓰기 3-4', '읽기와 쓰기 5-10', '읽기와 쓰기 11-15', '읽기와 쓰기 16', '발음 1-3'];

const REVIEWS = [
  {
    n: 4, units: '10-12', world: 12, keyPage: 'p.204', scriptPages: 'pp.196-197', track: 5, pron: ['06', '07', '08'], rows: 58,
    // Printed pp.62-63 are missing from the scan.
    missing: ['평가하기 17-20', '듣기 1-2'],
    // 정답, printed p.204 (17-20 and 듣기 1-2 are keyed there, but their pages are the missing ones).
    CHECK: 'OOXOX', FIX: { 3: 'X (언니처럼이에요 → 언니 같아요)', 5: 'X (한국 사람 같은 → 한국 사람같이)' },
    TEST: { 1: 4, 2: 1, 3: 4, 4: 3, 5: 3, 6: 4, 7: 2, 8: 2, 9: 1, 10: 2, 11: 1, 12: 4, 13: 3, 14: 2, 15: 4, 16: 3 },
    LISTEN: { 3: 4, 4: 1, 5: 3, 6: 3, 7: 2, 8: 2, 9: 4, 10: 4, 11: 2, 12: 3, 13: 3, 14: 4, 15: 1 },
    READ: { 1: 3, 2: 2, 3: 4, 4: 3, 5: 2, 6: 2, 7: 4, 8: 4, 9: 3, 10: 2 },
    MODEL: {
      11: '영화 볼래요', 12: '한국 음식은 매운데 고향 음식은 안 매워요', 13: '피곤해 보여',
      14: '여성적인 편이에요', 15: '일본으로 여행 가기로 했어', 16: '가기로'
    },
    WRONG: {
      11: ['영화 볼게요', '영화 봤을래요'],
      12: ['한국 음식은 매우는데 고향 음식은 안 매워요', '한국 음식은 매운데 고향 음식도 매워요'],
      13: ['피곤해 보여요', '피곤해 봐'],
      14: ['여성적이는 편이에요', '여성적한 편이에요'],
      15: ['일본으로 여행 갈기로 했어', '일본으로 여행 가기로 했어요'],
      16: ['갈기로', '가게']
    },
    CUT: {
      l03: 38.02, l04: 36.32, l05: 43.72, l06: 40.26, l07: 42.34, l08: 11.52, l09: 11.27, l10: 27.26, l11: 34.57,
      l12: 63.70, l14: 61.80,
      't06-1': 2.12, 't06-2': 3.66, 't06-3': 3.35, 't07-1': 2.20, 't07-2': 2.38, 't07-3': 3.18, 't07-4': 4.63,
      't08-1': 5.09, 't08-2': 7.03, 't08-3': 5.06, 't08-4': 7.18
    },
    SCRIPT: {
      l08: '와, 남자 친구가 영화배우같이 생겼네요. 그래요? 눈썹이 진하고 눈이 커서 그런 것 같아요.',
      l09: '켈리 씨는 어떤 사람을 사귀고 싶어요? 저는 같이 재미있게 이야기할 수 있는 사람을 만나고 싶어요.'
    },
    REPLIES: {
      3: ['음식이 입에 잘 맞아?', '그래. 분위기가 참 좋네', '아니, 좀 작은 것 같은데', '난 불고기를 제일 좋아해', '응, 좀 매운 편인데 맛있다'],
      4: ['어디가 아파서 오셨어요?', '몸살이 난 것 같아요', '아직 다 안 나았어요', '푹 쉬면 괜찮을 거예요', '쭉 가면 병원이 있어요'],
      5: ['건강을 위해서 운동을 해 보는 게 어때요?', '운동을 해서 건강해 보여요', '매일 한 시간씩 하는 게 좋아요', '하고는 싶은데 할 시간이 없어요', '사람마다 좋아하는 운동이 달라요'],
      6: ['정우 씨는 누구를 닮았어요?', '저와 친구는 키가 비슷해요', '아버지를 닮았으면 좋겠어요', '저는 어머니를 많이 닮았어요', '형과 저는 별로 닮지 않았어요'],
      7: ['오늘 밤에 무슨 영화를 보기로 했어요?', '저는 액션 영화를 볼래요', '코미디 영화를 볼 거예요', '그 영화는 어제 저녁에 봤어요', '저는 슬픈 영화를 자주 보는 편이에요']
    },
    // This tape's replies are short against its fixed pauses, so its four-exchange clips read slower.
    FOUR: [1.7, 2.7],
    hien: null
  },
  {
    n: 5, units: '13-15', world: 15, keyPage: 'p.207', scriptPages: 'pp.197-198', track: 12, pron: [13, 14, 15], rows: 62,
    // 정답, printed p.207.
    CHECK: 'XOXOO', FIX: { 1: 'X (있었을 때는 → 있을 때는)', 3: 'X (좋았을 때 → 좋을 때)' },
    TEST: { 1: 2, 2: 4, 3: 2, 4: 3, 5: 2, 6: 1, 7: 2, 8: 4, 9: 3, 10: 4, 11: 4, 12: 1, 13: 1, 14: 1, 15: 2, 16: 1, 17: 3, 18: 3, 19: 4, 20: 1 },
    LISTEN: { 1: 1, 2: 4, 3: 4, 4: 3, 5: 3, 6: 3, 7: 2, 8: 1, 9: 4, 10: 3, 11: 4, 12: 2, 13: 4, 14: 2, 15: 2 },
    READ: { 1: 3, 2: 3, 3: 4, 4: 3, 5: 3, 6: 2, 7: 2, 8: 4, 9: 4, 10: 3 },
    MODEL: {
      11: '아니요, 시험 시간에는 사전을 보면 안 돼요', 12: '고향에 돌아가기 전에',
      13: '처음에는 좀 힘들었는데 지금은 많이 편해졌어요', 14: '친구가 소개해 줘서 알게 됐어요',
      15: '네, 해 본 적이 있어요', 16: '요리하는 것을 좋아하기'
    },
    // The book leaves these open, so a wrong button has to be wrong, not merely another good answer:
    // a form that does not exist, a yes that says no, or a tense the question rules out.
    WRONG: {
      11: ['아니요, 시험 시간에는 사전을 봐도 돼요', '아니요, 시험 시간에는 사전을 봐면 안 돼요'],
      12: ['고향에 돌아간 후에', '고향에 돌아가는 전에'],
      13: ['처음에는 좀 힘들었는데 지금은 많이 편하졌어요', '처음에는 좀 힘들었는데 지금은 많이 편해졌었어요'],
      14: ['친구가 소개해 줘서 알게 돼요', '친구가 소개해 줘서 알게 했어요'],
      15: ['네, 해 본 적이 없어요', '네, 하는 적이 있어요'],
      16: ['요리하는 것을 좋아해서', '요리하는 것을 좋아하는']
    },
    // Seconds each clip was cut to, off the silencedetect map (-35dB, 0.5s) matched segment by segment
    // against the 듣기 지문: 0.12s before the first sound, 0.30s after the last.
    CUT: {
      l01: 13.96, l02: 14.18, l03: 41.81, l04: 42.95, l05: 49.04, l06: 37.56, l07: 44.18, l08: 10.44, l09: 11.67,
      l10: 45.39, l11: 44.09, l12: 54.25, l14: 96.01,
      't13-1': 2.16, 't13-2': 3.25, 't13-3': 2.78, 't14-1': 4.57, 't14-2': 2.58, 't14-3': 2.66, 't14-4': 2.25,
      't15-1': 6.69, 't15-2': 8.25, 't15-3': 5.78, 't15-4': 7.09
    },
    SCRIPT: {
      l01: '다음 달에 이사를 하려고 하는데 좋은 원룸이 있나요? 네, 손님. 지하철역 근처에 좋은 원룸이 있는데 한번 가 보시겠어요?',
      l02: '손님, 공연장에 꽃은 가지고 들어가실 수 없습니다. 아, 그래요? 그럼 어떻게 해야 하나요? 저쪽에 맡기시면 됩니다.',
      l08: '스티븐 씨는 어디에 돈을 제일 많이 써요? 저는 집세와 식비가 제일 많이 들어요.',
      l09: '한국에서는 어른들께 어떻게 인사해요? 어른들을 만나면 보통 고개를 숙여서 인사해요.'
    },
    // 3-7: the line the tape repeats, then its four replies in the order it reads them.
    REPLIES: {
      3: ['번지 점프를 해 본 적이 있어요?', '아니요, 잘할 것 같아요', '네, 할 수 있을지 모르겠어요', '아니요, 저는 무서운 것을 좋아해요', '네, 뉴질랜드에 여행 갔을 때 해 봤어요'],
      4: ['한국 생활 중에서 뭐가 제일 힘들어요?', '학교에 일찍 가면 돼요', '전보다 많이 괜찮아졌어요', '버스 타기가 제일 불편해요', '힘들기는 하지만 재미있어요'],
      5: ['한국에서는 지하철에서 전화를 해도 돼요?', '네, 오늘 전화하기로 했어요', '아니요, 전화 걸기가 어려워요', '네, 하지만 큰 소리로 하면 안 돼요', '아니요, 어디에서 하는지 잘 모르겠어요'],
      6: ['졸업한 후에 뭐 할 거예요?', '취직하기가 어려워졌어요', '잘할 수 있을지 모르겠어요', '아직 생각해 본 적이 없어요', '내일 시험이 있기 때문에 바빠요'],
      7: ['한국에 처음 왔을 때 어디에 살았어요?', '부동산에 물어보세요', '학교 기숙사에서 살았어요', '원룸을 구하기는 했지만 비싸요', '교통이 편하기 때문에 살기 좋아요']
    },
    hien: 'en|Hien, are you going on to graduate school later? — No, I want to get a job as soon as I finish university.'
  },
  {
    n: 6, units: '16-18', world: 18, keyPage: 'p.210', scriptPages: 'pp.199-200', track: 19, pron: [20, 21, 22], rows: 61,
    // 정답, printed p.210.
    CHECK: 'OXOOX', FIX: { 2: 'X (타 → 타고)', 5: 'X (눕고 → 누워)' },
    TEST: { 1: 3, 2: 4, 3: 2, 4: 4, 5: 3, 6: 1, 7: 2, 8: 2, 9: 2, 10: 4, 11: 4, 12: 1, 13: 1, 14: 1, 15: 3, 16: 2, 17: 1, 18: 3, 19: 1, 20: 2 },
    LISTEN: { 1: 3, 2: 4, 3: 1, 4: 1, 5: 2, 6: 3, 7: 1, 8: 4, 9: 3, 10: 1, 11: 2, 12: 3, 13: 3, 14: 1, 15: 4 },
    READ: { 1: 2, 2: 3, 3: 2, 4: 2, 5: 1, 6: 1, 7: 3, 8: 3, 9: 1, 10: 4 },
    MODEL: {
      11: '큰일 날 뻔했네요', 12: '두 그릇이나 먹었어요', 13: '한국에 산 지 6개월이 되었어요',
      14: '제가 빌려 드릴 테니까', 15: '친구들과 여행을 갈까 해요', 16: '비행기 표를 사 놓았다'
    },
    WRONG: {
      11: ['큰일 날 뻔하네요', '큰일 나는 뻔했네요'],
      12: ['두 그릇나 먹었어요', '두 그릇이나 먹을 거예요'],
      13: ['한국에 살은 지 6개월이 되었어요', '한국에 사는 지 6개월이 되었어요'],
      14: ['제가 빌려 드리기 때문에', '제가 빌려 드린 테니까'],
      15: ['친구들과 여행을 가까 해요', '친구들과 여행을 갔을까 해요'],
      16: ['비행기 표를 사 놓았어요', '비행기 표를 사 놓는다']
    },
    CUT: {
      l01: 8.14, l02: 20.68, l03: 46.06, l04: 53.27, l05: 41.04, l06: 46.29, l07: 47.60, l08: 16.09, l09: 16.66,
      l10: 32.83, l11: 49.57, l12: 88.44, l14: 83.13,
      't20-1': 3.43, 't20-2': 2.99, 't21-1': 3.57, 't21-2': 2.53, 't21-3': 2.99, 't21-4': 2.59,
      't22-1': 4.67, 't22-2': 5.95, 't22-3': 5.76, 't22-4': 27.39
    },
    SCRIPT: {
      l01: '지금 시간 있으면 여기 정리하는 것 좀 도와줄래? 그래, 같이 하자.',
      l02: '우리가 한국에 온 지 벌써 일 년이 되었네. 맞아, 우리가 처음 온 날도 오늘처럼 날씨가 정말 추웠지? 응, 눈도 많이 오고 바람도 많이 불어서 기숙사까지 오는 게 정말 힘들었는데.',
      l08: '이번 겨울에는 눈이 참 많이 오네요. 히엔 씨 나라에도 눈이 내려요? 아니요, 우리 나라는 일 년 내내 따뜻해서 기온이 영하로 내려가는 날이 없어요.',
      l09: '한국에서는 설날이나 추석에 뭐 해요? 보통 고향에 내려가서 아침에 차례를 지내요. 그리고 가족들과 음식을 먹고 나서 그동안 못 한 이야기를 해요.'
    },
    REPLIES: {
      3: ['저기 걸려 있는 줄무늬 셔츠는 어때요?', '글쎄요, 무늬가 없는 게 더 좋을 것 같은데요', '저도 어디에 걸려 있는지 잘 모르겠어요', '저기 오른쪽에 걸려 있어요', '네, 꽃무늬 셔츠가 좋겠어요'],
      4: ['어휴, 좀 전에 길을 건너오다가 차에 부딪힐 뻔했어.', '큰일 날 뻔했네. 괜찮아?', '정말 긴장되겠다. 그래도 잘할 수 있어', '지금 생각하면 후회되는 일이 많아', '그 길은 위험할 테니까 조심해'],
      5: ['학교 올 때 커피 한 잔만 사다 줘.', '나는 벌써 두 잔이나 마셨어', '알았어, 갈 때 사 갈게', '차 대신 커피를 마시는 게 어때?', '한국에 와서 커피를 마시게 됐어'],
      6: ['카메라를 살까 하는데 어디에서 사면 좋을까요?', '인터넷에서 살까 해요', '저도 그 카메라가 마음에 들어요', '제가 잘 아는 곳이 있는데 소개해 줄까요?', '용산에 가서 사기로 했어요'],
      7: ['나나 씨, 한국에 산 지 오래됐어요?', '아니요, 삼 개월밖에 안 됐어요', '아니요, 별로 자주 가지 않았어요', '아니요, 서울은 좀 복잡해요', '아니요, 고향에서 일 년 동안 공부했어요']
    },
    hien: 'en|Nana, look after yourself. I’ll miss you a lot. — Yes, I’ll really miss you too, Hien.'
  }
];

const { WORKBOOKS, validateWorkbook } = require(path.join(ROOT, 'admin', 'lib', 'workbook.js'));
const i18n = require(path.join(ROOT, 'admin', 'lib', 'i18n.js'));
const { collectUploadFiles } = require(path.join(ROOT, 'scripts', 'r2Content.js'));
const batch = new Set(collectUploadFiles(ROOT).map((x) => x.rel.replace(/\\/g, '/')));
const uiSrc = read(path.join('js', 'ui.js'));
const i18nSrc = read(path.join('js', 'i18n.js'));
const secs = (src) => fs.statSync(path.join(ROOT, src)).size / 8000;

// ── The sandboxed renderer (the DOM stub tests/test_listening_pages.js drives) ──
function makeDom() {
  const els = Object.create(null);
  function mkEl(tag) {
    const el = {
      tagName: (tag || 'div').toUpperCase(), textContent: '', className: '', type: '',
      disabled: false, tabIndex: -1, children: [], attrs: Object.create(null), onclick: null, onkeydown: null,
      classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); },
        toggle(c, on) { if (on === undefined) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); } else if (on) this._s.add(c); else this._s.delete(c); } },
      style: {}, dataset: Object.create(null), value: '', hidden: false, parentElement: null,
      setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; },
      appendChild(c) { this.children.push(c); return c; }, insertBefore(c) { this.children.unshift(c); return c; },
      removeAttribute(k) { delete this.attrs[k]; }, addEventListener() {}, removeEventListener() {},
      querySelector: () => null, querySelectorAll: () => [], remove() {}, focus() {}, blur() {}, click() {}
    };
    let markup = '';
    Object.defineProperty(el, 'innerHTML', { get() { return markup; }, set(v) { markup = String(v); el.children.length = 0; }, enumerable: true });
    return el;
  }
  const document = {
    readyState: 'complete', documentElement: mkEl('html'), body: mkEl('body'),
    getElementById(id) { if (!(id in els)) els[id] = mkEl('div'); return els[id]; },
    createElement: mkEl, querySelectorAll: () => [], addEventListener() {}
  };
  return { document, els };
}
function loadUi(extra) {
  const { document, els } = makeDom();
  const real = Object.create(null);
  const noop = function () { return undefined; };
  const sandbox = new Proxy(real, {
    has() { return true; },
    get(t, k) { if (k in t) return t[k]; if (typeof k === 'symbol') return undefined; if (k in globalThis) return globalThis[k]; return noop; },
    set(t, k, v) { t[k] = v; return true; },
    defineProperty(t, k, d) { Object.defineProperty(t, k, d); return true; },
    deleteProperty(t, k) { delete t[k]; return true; }
  });
  Object.assign(real, {
    console: { log() {}, info() {}, warn() {}, error() {} }, IS_NODE: true, document, window: { addEventListener() {} },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    activeModalStack: [], playerLocked: false, playChiptuneSFX: noop, checkQuestProgress: noop, ensurePlayerRank: noop,
    studySessionXp: () => 10, addPlayerXp: (xp) => ({ leveled: false, level: 1, xp, need: 100 }),
    addHonor: noop, persistSave: noop, updateRankHUD: noop
  }, extra || {});
  vm.createContext(sandbox);
  vm.runInContext(read(path.join('js', 'workbookArt.js')), sandbox);
  vm.runInContext(read(path.join('js', 'i18n.js')), sandbox);
  vm.runInContext(read(path.join('js', 'ui.js')), sandbox);
  return { els, real, run: (expr) => vm.runInContext(expr, sandbox) };
}
const heads = (els) => (els['wb-items'].children || []).map((r) => {
  const exp = (r.children || []).find((c) => c.className === 'wb-exp');
  return exp && (exp.children || []).find((c) => c.className === 'wb-exp-head');
});
const hasSay = (h, re) => (h.children || []).some((c) => (re || /^wb-say/).test(c.className || ''));

REVIEWS.forEach((R) => {
  const REL = 'worlds/review' + R.n + '-workbook.json';
  const bank = JSON.parse(read(REL));
  const page = (id) => bank.exercises.find((e) => e.id === id);
  const row = (id, n) => page(id).items.find((r) => r.n === n);
  const keyed = (r, slot) => (slot === 2 ? r.choices2 : r.choices).find((c) => c.id === (slot === 2 ? r.answer2 : r.answer));
  const p = 'r' + R.n + '-';
  const B = '복습 ' + R.n + ': ';
  const missing = R.missing || [];
  const has = (id) => !!page(p + id);

  console.log('\n====================================================');
  console.log('복습 ' + R.n + ' — THE REVIEW OF UNITS ' + R.units);
  console.log('====================================================');

  // ── 1. Shape ────────────────────────────────────────────────────────────────
  console.log('\n--- 1. The bank, in the book’s order ---');
  assert(bank.id === 'review' + R.n + '-workbook' && bank.source.indexOf('복습 ' + R.n) >= 0 && bank.source.indexOf(R.keyPage) >= 0
    && bank.source.indexOf(R.scriptPages) >= 0 && bank.source.indexOf('Units ' + R.units) >= 0,
  B + 'the bank names the review, its units, its 정답 page and its 듣기 지문');
  assert(bank.titleKo === '복습 ' + R.n, B + 'and calls itself 복습 ' + R.n + ' on screen');
  assert(bank.holdGloss === true, B + 'it is a test, so it holds every row’s English until the row is checked');
  const printed = ORDER.filter((no) => missing.indexOf(no) < 0);
  assert(bank.exercises.map((e) => e.no).join('|') === printed.join('|'), B + printed.length + ' pages in the order the review prints them');
  if (missing.length) {
    assert(/pp\.62-63/.test(bank.omittedNote) && missing.every((no) => bank.omittedNote.indexOf(no) >= 0),
      B + 'and the pages the scan lacks are named in the bank — ' + missing.join(', '));
  }
  const rows = bank.exercises.reduce((k, e) => k + e.items.length, 0);
  assert(rows === R.rows, B + R.rows + ' rows (found ' + rows + ')');
  assert(bank.exercises.every((e) => e.id.indexOf(p) === 0 && e.type === 'build' && e.noteEn.length > 60 && e.instructionKo && e.sectionEn),
    B + 'every page is a build page named for the review, with its book instruction, a section and a note on how it differs from the paper');
  const numbered = (e) => e.items.map((r) => r.n).join(',');
  assert(numbered(page(p + 'test-3')) === '5,6,7,8,9,10' && numbered(page(p + 'listen-5')) === '12,13,14,15'
    && numbered(page(p + 'read-3')) === '5,7,9', B + 'rows carry the book’s question numbers');
  assert(/알아보기/.test(bank.omittedNote) && /17/.test(bank.omittedNote) && /말하기/.test(bank.omittedNote) && /정리하기/.test(bank.omittedNote),
    B + 'and what is not here is named: 정리하기, 알아보기, the composition and 말하기');

  // ── 2. The keys ─────────────────────────────────────────────────────────────
  console.log('\n--- 2. Every key, against the 정답 on ' + R.keyPage + ' ---');
  // The 정답 keys an option by the number it is printed under. Rows whose buttons are the book's
  // words keep them in the book's order in the file (the page deals them afresh), so the key is the
  // answer's place in the list; rows whose buttons open on ①-④ say it on the button.
  const bookNo = (r, slot) => {
    const list = slot === 2 ? r.choices2 : r.choices;
    const c = keyed(r, slot);
    const lead = CIRCLED.indexOf(c.ko.trim().charAt(0));
    return lead >= 0 ? lead + 1 : list.indexOf(c) + 1;
  };
  const got = (ids) => {
    const out = {};
    ids.filter(has).forEach((id) => page(p + id).items.forEach((r) => {
      out[r.n] = bookNo(r, 1);
      if (r.choices2) out[r.n + 1] = bookNo(r, 2);
    }));
    return out;
  };
  const same = (a, b) => Object.keys(b).every((k) => a[k] === b[k]) && Object.keys(a).length === Object.keys(b).length;
  const show = (o) => Object.keys(o).map((k) => CIRCLED[o[k] - 1]).join('');
  const tested = got(['test-1', 'test-2', 'test-3', 'test-4', 'test-5', 'test-6']);
  assert(same(tested, R.TEST), B + '평가하기 1-20 key ' + show(R.TEST) + (same(tested, R.TEST) ? '' : ' — got ' + show(tested)));
  const heard = got(['listen-1', 'listen-2', 'listen-3', 'listen-4', 'listen-5']);
  assert(same(heard, R.LISTEN), B + '듣기 1-15 key ' + show(R.LISTEN) + (same(heard, R.LISTEN) ? '' : ' — got ' + show(heard)));
  const readNos = got(['read-1', 'read-2', 'read-3']);
  assert(same(readNos, R.READ), B + '읽기와 쓰기 1-10 key ' + show(R.READ) + (same(readNos, R.READ) ? '' : ' — got ' + show(readNos)));
  const check = page(p + 'check').items;
  assert(check.map((r) => r.answer.toUpperCase()).join('') === R.CHECK, B + '확인하기 keys ' + R.CHECK.split('').join(' '));
  assert(Object.keys(R.FIX).every((n) => keyed(check[n - 1]).ko === R.FIX[n]), B + 'and each X carries the correction the 정답 writes, in its words');
  assert(check.every((r) => r.choices.length === 2 && r.choices.some((c) => c.ko === 'O') && r.choices.some((c) => /^X \(.+ → .+\)$/.test(c.ko))),
    B + 'every row is O, or X with a correction beside it — on an O row the X is the wrong correction');
  const dup = [];
  bank.exercises.forEach((e) => e.items.forEach((r) => [r.choices, r.choices2].filter(Boolean).forEach((list) => {
    if (new Set(list.map((c) => nfc(c.ko))).size !== list.length) dup.push(e.id + ' ' + r.n);
  })));
  assert(dup.length === 0, B + 'no row offers the same button twice' + (dup.length ? ' — ' + dup.join(', ') : ''));
  const fourWay = ['test-1', 'test-2', 'test-3', 'test-4', 'test-5', 'test-6', 'listen-1', 'listen-2', 'listen-3', 'listen-4', 'listen-5',
    'read-1', 'read-2', 'read-3'];
  assert(fourWay.filter(has).every((id) => page(p + id).items.every((r) => r.choices.length === 4 && (!r.choices2 || r.choices2.length === 4))),
    B + 'and every question the book prints four options for has all four');

  // ── 3. The write-ins ────────────────────────────────────────────────────────
  console.log('\n--- 3. 읽기와 쓰기 11-16, keyed to the 정답’s model answers ---');
  const writeRow = (n) => (Number(n) === 16 ? row(p + 'write-2', 16) : row(p + 'write-1', Number(n)));
  Object.keys(R.MODEL).forEach((n) => assert(writeRow(n) && keyed(writeRow(n)).ko === R.MODEL[n], B + n + '. ' + R.MODEL[n]));
  const wrongOk = Object.keys(R.WRONG).every((n) => {
    const r = writeRow(n);
    return r.choices.filter((c) => c.id !== r.answer).map((c) => c.ko).sort().join('|') === R.WRONG[n].slice().sort().join('|');
  });
  assert(wrongOk, B + 'and the wrong buttons are the pinned wrong forms, nothing else');

  // ── 4. The recordings ───────────────────────────────────────────────────────
  console.log('\n--- 4. The recordings ---');
  const clips = [];
  bank.exercises.forEach((e) => e.items.forEach((r) => { if (r.audio) clips.push({ e, r, src: r.audio.src }); }));
  const listenRows = clips.filter(({ e }) => /^듣기/.test(e.no));
  const pronRows = clips.filter(({ e }) => /^발음/.test(e.no));
  const listenItems = bank.exercises.filter((e) => /^듣기/.test(e.no)).reduce((k, e) => k + e.items.length, 0);
  const pronItems = page(p + 'pron').items.length;
  assert(listenRows.length === listenItems && pronRows.length === pronItems && clips.length === listenItems + pronItems,
    B + 'every 듣기 row and every 발음 row plays a recording, and nothing else does');
  const srcs = [...new Set(clips.map((c) => c.src))];
  const stem = '2b-r' + R.n + '-';
  assert(srcs.length === Object.keys(R.CUT).length && srcs.every((s) => fs.existsSync(path.join(ROOT, s))),
    B + srcs.length + ' clips, all on disk');
  const off = srcs.filter((s) => {
    const k = s.slice(s.indexOf(stem) + stem.length, -4);
    return !(k in R.CUT) || Math.abs(secs(s) - R.CUT[k]) > 0.12;
  });
  assert(off.length === 0, B + 'each is the length it was cut to' + (off.length ? ' — ' + off.join(', ') : ''));
  assert(fs.readdirSync(path.join(ROOT, 'audio', 'book')).filter((f) => f.indexOf(stem) === 0).length === srcs.length,
    B + 'and nothing is left over from an earlier cut');
  const share = (a, b) => row(p + 'listen-5', a).audio.src === row(p + 'listen-5', b).audio.src;
  assert(share(12, 13) && share(14, 15) && !share(12, 14), B + 'questions 12-13 share one recording and 14-15 another, as on the tape');
  assert(listenRows.every(({ r }) => r.audio.labelEn.endsWith(' · from track ' + R.track))
    && pronRows.every(({ r }) => R.pron.some((t) => r.audio.labelEn.endsWith(' · from track ' + Number(t))
      && r.audio.src.indexOf(stem + 't' + t + '-') >= 0)),
  B + 'and every label names the track it was cut from');
  // What the tape says against how long the clip is. One pair of voices at one pace, so each shape of
  // question lands in its own band: the four-exchange questions carry 3s pauses and spoken option
  // numbers, and the short exchanges almost none.
  const SCRIPT = Object.assign({}, R.SCRIPT);
  Object.keys(R.REPLIES).forEach((n) => {
    const q = R.REPLIES[n];
    SCRIPT['l0' + n] = q.slice(1).map((a) => q[0] + ' ' + a).join(' ');
  });
  const rate = (k) => syl(SCRIPT[k]) / secs('audio/book/' + stem + k + '.mp3');
  const four = ['l03', 'l04', 'l05', 'l06', 'l07'];
  const short = ['l01', 'l02', 'l08', 'l09'].filter((k) => k in SCRIPT);
  const [lo, hi] = R.FOUR || [2.1, 2.8];
  assert(four.every((k) => rate(k) > lo && rate(k) < hi), B + 'the five four-exchange questions read at ' + lo + '-' + hi + ' syllables a second of clip ('
    + four.map((k) => rate(k).toFixed(2)).join(', ') + ')');
  assert(short.every((k) => rate(k) > 2.9 && rate(k) < 3.6), B + 'the four short exchanges at 2.9-3.6 ('
    + short.map((k) => rate(k).toFixed(2)).join(', ') + ')');
  // Longer script, longer clip: a clip handed to the wrong question breaks the order even when its
  // rate still looks human.
  const ks = Object.keys(SCRIPT);
  const rank = (vals) => { const s = vals.slice().sort((a, b) => a - b); return vals.map((v) => s.indexOf(v) + 1); };
  const rs = rank(ks.map((k) => syl(SCRIPT[k])));
  const rt = rank(ks.map((k) => secs('audio/book/' + stem + k + '.mp3')));
  const rho = 1 - (6 * rs.reduce((a, r, i) => a + (r - rt[i]) ** 2, 0)) / (ks.length * (ks.length ** 2 - 1));
  assert(rho > 0.9, B + 'and the longer the script, the longer its clip (rank correlation ' + rho.toFixed(3) + ')');
  // 3-7: each row plays its own question and, once checked, explains all four of that question's
  // replies — each quoted under the number the tape reads it with.
  Object.keys(R.REPLIES).forEach((n) => {
    const r = row(p + 'listen-2', Number(n));
    const why = nfc(r.why);
    const quoted = R.REPLIES[n].slice(1).every((a, k) => why.indexOf(nfc(a)) >= 0
      && (why.indexOf(CIRCLED[k] + ' ' + nfc(a)) >= 0 || keyed(r).ko === CIRCLED[k]));
    assert(quoted && r.audio.src.endsWith(stem + 'l0' + n + '.mp3'),
      B + '듣기 ' + n + ' plays its own question and explains all four of its replies, each under its number');
  });

  // ── 5. Nothing is answered before the page is checked ──────────────────────
  console.log('\n--- 5. The page answers nothing before it is checked ---');
  const ui = loadUi();
  ui.real.__bank = JSON.parse(JSON.stringify(bank));
  ui.run('openWorkbook(__bank)');
  ui.run("openWorkbookExercise('" + p + "test-3')");
  const vocab = page(p + 'test-3');
  let hs = heads(ui.els);
  assert(hs.length === vocab.items.length && hs.every((h) => !/wb-exp-en/.test(h.innerHTML)),
    B + 'a 평가하기 page draws no English beside its rows before it is checked');
  assert(hs.every((h) => !hasSay(h)), B + 'nor a 🔊 that would read the row out with its answer in it');
  vocab.items.forEach((r, i) => ui.run("wbPickChoice(" + i + ", '" + r.answer + "')"));
  ui.run('checkWorkbook()');
  hs = heads(ui.els);
  assert(ui.run('workbookState.checked') === true && hs.every((h) => /wb-exp-en/.test(h.innerHTML)) && hs.every((h) => hasSay(h)),
    B + 'and draws both beside every row once the page is checked');
  ui.run("openWorkbookExercise('" + p + "listen-2')");
  hs = heads(ui.els);
  assert(hs.every((h) => hasSay(h, /\bbook\b/)), B + 'a 듣기 row plays its question from the start — the tape is the question');
  const order = ui.run("wbRowChoices(workbookState.ex.items[0], 0).map(function (c) { return c.ko; }).join('')");
  assert(order === '①②③④', B + '듣기 3-7 deals its buttons in the book’s order (' + order + ')');

  // ── 6. Vietnamese and wiring ────────────────────────────────────────────────
  console.log('\n--- 6. Vietnamese and wiring ---');
  const report = i18n.rows(ROOT, REL, 'vi');
  assert(report.rows.length > 200 && report.rows.every((r) => r.done) && report.stale.length === 0,
    B + 'every English string has a current Vietnamese translation (' + report.rows.length + ')');
  const vi = JSON.parse(read('locales/vi/' + REL)).entries;
  if (R.hien) assert(/Hiền/.test(vi[R.hien] || ''), B + 'and 히엔 is Hiền in it, as in the rest of the Vietnamese');
  assert(uiSrc.indexOf('isUnit' + R.world + "World()) return '/worlds/review" + R.n + "-workbook.json'") >= 0,
    B + 'reviewUrl resolves Unit ' + R.world + ' to 복습 ' + R.n);
  assert(uiSrc.indexOf("'/worlds/review" + R.n + "-workbook.json': '" + R.units + "'") >= 0, B + 'and the desk row names Units ' + R.units);
  assert(i18nSrc.indexOf("'worlds/review" + R.n + "-workbook.json'") >= 0, B + 'it is a translatable source');
  assert(WORKBOOKS['review' + R.n] === path.join('worlds', 'review' + R.n + '-workbook.json'), B + 'the admin can open it');
  const saved = JSON.stringify(validateWorkbook(JSON.parse(JSON.stringify(bank)), REL), null, 2) + '\n';
  assert(saved === read(REL).replace(/\r\n/g, '\n'), B + 'and a save through the admin writes it back unchanged');
  assert(batch.has(REL) && srcs.every((s) => batch.has(s)), B + 'the bank and all ' + srcs.length + ' clips publish');
});

// ── The desk itself, in a sandbox ─────────────────────────────────────────────
console.log('\n--- The desk ---');
assert(uiSrc.indexOf("key: 'review'") > uiSrc.indexOf("key: 'workbook'") && uiSrc.indexOf("key: 'review'") < uiSrc.indexOf("key: 'topik'"),
  'the desk offers a review after the 익힘책');
async function deskKeys(world) {
  const files = {};
  [10, 11, 12, 13, 14, 15, 16, 17, 18].forEach((u) => ['workbook', 'textbook'].forEach((k) => {
    files['/worlds/unit' + u + '-' + k + '.json'] = 'worlds/unit' + u + '-' + k + '.json';
  }));
  REVIEWS.forEach((R) => { files['/worlds/review' + R.n + '-workbook.json'] = 'worlds/review' + R.n + '-workbook.json'; });
  const worlds = {};
  [10, 11, 12, 13, 14, 15, 16, 17, 18].forEach((u) => { worlds['isUnit' + u + 'World'] = () => world === u; });
  const d = loadUi(Object.assign(worlds, {
    fetch: (url) => Promise.resolve(files[url] && fs.existsSync(path.join(ROOT, files[url]))
      ? { ok: true, json: () => Promise.resolve(JSON.parse(read(files[url]))) } : { ok: false, json: () => Promise.resolve(null) })
  }));
  d.run('openStudyDesk()');
  for (let k = 0; k < 20; k++) await new Promise((r) => setImmediate(r));
  return d.run("deskMenuOptions.map(function (o) { return o.key + ':' + o.en; })");
}
(async () => {
  for (const R of REVIEWS) {
    const keys = await deskKeys(R.world);
    assert(keys.some((o) => o === 'review:Review — Units ' + R.units + ' together'),
      'Unit ' + R.world + '’s desk has a 복습 row for Units ' + R.units + ' (' + keys.map((o) => o.split(':')[0]).join(', ') + ')');
  }
  const u14 = await deskKeys(14);
  assert(u14.length > 0 && !u14.some((o) => /^review:/.test(o)), 'and Unit 14’s, which no review follows, has none');

  console.log('\n====================================================');
  console.log(passed + ' passed, ' + failed + ' failed');
  console.log('====================================================');
  if (failed) process.exit(1);
  console.log('\ntest_reviews: all passed');
})();
