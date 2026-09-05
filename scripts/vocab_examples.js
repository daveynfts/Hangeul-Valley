'use strict';
/**
 * scripts/vocab_examples.js — one real sentence per headword, taken from the question banks.
 *
 * A word list gives a learner the word and its gloss and nothing else. The unit already
 * contains the word in use — in a cassette line, a workbook item, a TOPIK question — and
 * that sentence is worth more than an invented one: it is the sentence the book chose, and
 * the learner will meet it again on the page it came from.
 *
 * So this reads every question bank, reconstructs the sentences (a fill-in item is only a
 * sentence once its blank is filled with the right answer), and looks for each headword in
 * them. What it cannot find, it leaves alone: a wrong example is worse than none, so the
 * matching below refuses far more than it accepts.
 *
 *   node scripts/vocab_examples.js                 report coverage, change nothing
 *   node scripts/vocab_examples.js --list          also print every match, with its source
 *   node scripts/vocab_examples.js --misses        print the headwords nothing was found for
 *   node scripts/vocab_examples.js --apply         write `example` into the word lists
 *   node scripts/vocab_examples.js --only 2b-unit-10
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const APPLY = process.argv.indexOf('--apply') >= 0;
const LIST = process.argv.indexOf('--list') >= 0;
const MISSES = process.argv.indexOf('--misses') >= 0;
const ONLY = (() => {
  const i = process.argv.indexOf('--only');
  return i >= 0 ? process.argv[i + 1] : null;
})();

// ═══════════════ HANGUL ═══════════════════════════════════════════════════════
//
// Enough of the syllable block to know what a stem ends in. A headword is listed in its
// dictionary form and a sentence never uses that form, so the two only meet if the stem's
// last syllable can be taken apart.
const S_BASE = 0xAC00;
const V_COUNT = 21;
const T_COUNT = 28;
const N_COUNT = V_COUNT * T_COUNT;
const S_COUNT = 19 * N_COUNT;

function isSyllable(ch) {
  const c = ch.codePointAt(0);
  return c >= S_BASE && c < S_BASE + S_COUNT;
}
function decompose(ch) {
  const i = ch.codePointAt(0) - S_BASE;
  return { L: Math.floor(i / N_COUNT), V: Math.floor((i % N_COUNT) / T_COUNT), T: i % T_COUNT };
}
function compose(L, V, T) {
  return String.fromCodePoint(S_BASE + L * N_COUNT + V * T_COUNT + T);
}

// Final-consonant indices used below. 0 is "no final".
const T_GIYEOK_S = 0;
const T_DIGEUT = 7;
const T_RIEUL = 8;
const T_BIEUP = 17;
const T_SIOT = 19;
const T_HIEUT = 27;
// Vowel indices, in the order the block puts them:
//   ㅏ0 ㅐ1 ㅑ2 ㅒ3 ㅓ4 ㅔ5 ㅕ6 ㅖ7 ㅗ8 ㅘ9 ㅙ10 ㅚ11 ㅛ12 ㅜ13 ㅝ14 ㅞ15 ㅟ16 ㅠ17 ㅡ18 ㅢ19 ㅣ20
const V_A = 0;
const V_AE = 1;
const V_YA = 2;
const V_YAE = 3;
const V_EO = 4;
const V_E = 5;
const V_YEO = 6;
const V_O = 8;
const V_WA = 9;
const V_WAE = 10;
const V_OE = 11;
const V_U = 13;
const V_WEO = 14;
const V_EU = 18;
const V_I = 20;
// 아 rather than 어 follows a bright vowel — ㅏ and ㅗ, and nothing else.
const isBright = (v) => v === V_A || v === V_O;

/**
 * The 아/어 stem — the one Korean rebuilds rather than appends to, and the reason a search
 * for 맵다 or even 맵 finds nothing in a sentence that says 매워요.
 *
 * Returns null when the shape is not one this knows how to rebuild, which is the honest
 * answer: a form guessed wrong is a wrong example, and no example is better than that.
 */
function infinitiveStem(stem) {
  const last = stem[stem.length - 1];
  const head = stem.slice(0, -1);
  if (!isSyllable(last)) return null;
  const { L, V, T } = decompose(last);
  const prevV = head.length && isSyllable(head[head.length - 1])
    ? decompose(head[head.length - 1]).V : -1;

  // 하다 — the commonest ending there is, and the one a stem search always misses:
  // 좋아하다 becomes 좋아해요, and 좋아하 is nowhere inside it.
  if (last === '하') return head + '해';
  // ㅂ irregular: 맵다 → 매워, 춥다 → 추워. The ㅂ leaves and 워 takes its place.
  if (T === T_BIEUP) return head + compose(L, V, T_GIYEOK_S) + '워';
  // ㄷ irregular: 듣다 → 들어. The ㄷ becomes ㄹ before a vowel.
  if (T === T_DIGEUT) return head + compose(L, V, T_RIEUL) + (isBright(V) ? '아' : '어');
  // ㅅ irregular: 낫다 → 나아. The ㅅ simply goes.
  if (T === T_SIOT) return head + compose(L, V, T_GIYEOK_S) + (isBright(V) ? '아' : '어');
  // ㅎ irregular: 그렇다 → 그래, 빨갛다 → 빨개, 하얗다 → 하얘. The vowel becomes ㅐ, or ㅒ
  // where it was ㅑ. 좋다 is the exception that keeps its ㅎ, and is handled below.
  if (T === T_HIEUT && stem !== '좋') {
    return head + compose(L, V === V_YA ? V_YAE : V_AE, T_GIYEOK_S);
  }
  // 르 irregular: 모르다 → 몰라, 부르다 → 불러. The ㄹ doubles onto the syllable before.
  if (last === '르' && head.length && isSyllable(head[head.length - 1])) {
    const p = decompose(head[head.length - 1]);
    const bright = isBright(p.V);
    return head.slice(0, -1) + compose(p.L, p.V, T_RIEUL) + (bright ? '라' : '러');
  }
  // ㅡ elision: 크다 → 커, 바쁘다 → 바빠. Which vowel lands depends on the syllable before.
  if (V === V_EU && T === T_GIYEOK_S) {
    return head + compose(L, isBright(prevV) ? V_A : V_EO, T_GIYEOK_S);
  }
  if (T !== T_GIYEOK_S) {
    // Closed stem: the ending keeps its own syllable. 먹다 → 먹어, 좋다 → 좋아.
    return stem + (isBright(V) ? '아' : '어');
  }
  // Open stem: the ending contracts into it. 가다 → 가, 보다 → 봐, 주다 → 줘, 되다 → 돼,
  // 마시다 → 마셔, 지내다 → 지내.
  if (V === V_A || V === V_EO) return stem;                      // 가 + 아 → 가
  if (V === V_AE || V === V_E) return stem;                      // 지내 + 어 → 지내
  if (V === V_YEO) return stem;                                  // 켜 + 어 → 켜, so 켰
  if (V === V_O) return head + compose(L, V_WA, T_GIYEOK_S);     // 보 + 아 → 봐
  if (V === V_U) return head + compose(L, V_WEO, T_GIYEOK_S);    // 주 + 어 → 줘
  if (V === V_I) return head + compose(L, V_YEO, T_GIYEOK_S);    // 마시 + 어 → 마셔
  if (V === V_OE) return head + compose(L, V_WAE, T_GIYEOK_S);   // 되 + 어 → 돼
  return null;
}

// A form is evidence when it is two characters or more — or when it is the past tense,
// which for a short stem is a single syllable (쓰다 gives 썼, 켜다 gives 켰) and is still
// unmistakable once it is required to start where a word starts.
const PAST_T = 20; // ㅆ
function keepable(f) {
  const t = f.replace(/\s+$/, '');
  if (t.length >= 2) return true;
  return t.length === 1 && isSyllable(t) && decompose(t).T === PAST_T;
}

/**
 * The forms a headword actually wears in a sentence.
 *
 * A closed list of inflections rather than "the stem, followed by anything plausible". The
 * loose version matched 쓰다 against 쓰러져, 시다 against 마시러 and 달다 against 달려 있다 —
 * three different verbs — because a one-syllable stem is inside half the language. Every
 * form below is one the word can genuinely take, and long enough to tell it apart.
 */
function surfaceForms(headword) {
  const w = String(headword || '').trim();
  if (!w) return [];
  const forms = new Set([w]);
  if (w.length < 2 || !w.endsWith('다')) return [...forms];

  const stem = w.slice(0, -1);
  const last = stem[stem.length - 1];
  if (!isSyllable(last)) return [...forms];
  const { L, V, T } = decompose(last);

  const inf = infinitiveStem(stem);
  if (inf) {
    // -아/어요, -았/었-, -아/어서, -아/어야, -아/어 보다: the whole polite and past family.
    ['요', '서', '야', ' '].forEach((e) => forms.add(inf + e));
    const li = decompose(inf[inf.length - 1]);
    if (isSyllable(inf[inf.length - 1]) && li.T === T_GIYEOK_S) {
      forms.add(inf.slice(0, -1) + compose(li.L, li.V, 20 /* ㅆ */));   // 먹었, 매웠, 했
    }
  }
  // A one-syllable stem ending in a vowel stops here. 가, 시, 쓰, 다 sit inside so much of
  // the language that anything built on them is a coin toss — 가고 is in 나가고, 가게 is a
  // shop, 시- is the honorific infix, 다는 is the quotative. A stem that ends in a consonant
  // has no such problem: 먹고 and 듣는 are that verb and no other, so those keep going.
  const openStem = T === T_GIYEOK_S;
  if (stem.length < 2 && openStem) {
    return [...forms].filter(keepable);
  }

  // Endings that attach to the plain stem, whatever it ends in.
  ['고', '지', '거나', '게', '겠', '네', '더라'].forEach((e) => forms.add(stem + e));

  // The vowel-ending family turns a ㄹ stem into an open one — 살다 gives 사는, 사면, 산 —
  // and at one syllable those are 사다 as readily as 살다. The consonant endings above stay.
  if (stem.length < 2 && T === T_RIEUL) {
    return [...forms].filter(keepable);
  }

  // -(으)면, -(으)니까, -(으)ㄴ, -(으)ㄹ, -습니다/-ㅂ니다 and the -는 modifier.
  //
  // Three shapes, not two. A stem ending in a vowel takes the short ending and writes ㄴ/ㄹ
  // into its own last syllable. A stem ending in a consonant takes the 으 form and gives
  // them a syllable of their own. A ㄹ stem drops its ㄹ and then behaves like the first —
  // 만들다 gives 만드는, 만든, 만들면, 만듭니다. And the ㅂ/ㄷ/ㅅ irregulars rebuild here too,
  // exactly as they do before 아/어: 맵다 gives 매운 and 매우면, never 맵은.
  const T_NIEUN = 4;
  const withFinal = (syl, t) => {
    const d = decompose(syl);
    return compose(d.L, d.V, t);
  };
  const vowelLike = (bare) => {
    const tail = bare[bare.length - 1];
    const front = bare.slice(0, -1);
    forms.add(bare + '면');
    forms.add(bare + '니까');
    forms.add(bare + '는');
    forms.add(front + withFinal(tail, T_NIEUN) + ' ');    // -ㄴ, a modifier before a noun
    forms.add(front + withFinal(tail, T_RIEUL) + ' ');    // -ㄹ, the same
    forms.add(front + withFinal(tail, T_BIEUP) + '니다');  // 갑니다, 만듭니다
  };
  const head = stem.slice(0, -1);
  if (T === T_GIYEOK_S) {
    vowelLike(stem);
  } else if (T === T_RIEUL) {
    vowelLike(head + compose(L, V, T_GIYEOK_S));          // 만들 → 만드
  } else if (T === T_BIEUP) {
    vowelLike(head + compose(L, V, T_GIYEOK_S) + '우');    // 맵 → 매우 → 매운, 매우면
    forms.add(head + compose(L, V, T_GIYEOK_S) + '웁니다');
  } else if (T === T_DIGEUT) {
    // Only before a vowel. 듣다 gives 들으면 and 들은, but 듣는 and 듣습니다 keep their ㄷ.
    const soft = head + compose(L, V, T_RIEUL);            // 듣 → 들
    ['으면', '으니까', '은 ', '을 '].forEach((e) => forms.add(soft + e));
    forms.add(stem + '는');
    forms.add(stem + '습니다');
  } else if (T === T_SIOT) {
    const soft = head + compose(L, V, T_GIYEOK_S);         // 낫 → 나
    ['으면', '으니까', '은 ', '을 '].forEach((e) => forms.add(soft + e));
    forms.add(stem + '는');
    forms.add(stem + '습니다');
  } else if (T === T_HIEUT && stem !== '좋') {
    vowelLike(head + compose(L, V, T_GIYEOK_S));           // 그렇 → 그러 → 그런, 그러면
  } else {
    ['으면', '으니까', '는', '은 ', '을 ', '습니다'].forEach((e) => forms.add(stem + e));
  }
  // Nothing shorter than two characters is evidence.
  return [...forms].filter(keepable);
}

// What may follow a noun and still be the same noun: a particle, or the end of the word.
const PARTICLE_START = '은는이가을를에서와과도만의로부터까지밖처럼보다한하';
const RIGHT_EDGE = /[\s.,?!"'’”…)\]]/;

/**
 * Is this form in this sentence *as itself*, rather than inside a longer word?
 *
 * A dictionary form is a substring of every longer verb built on it — 쓰다 is inside
 * 쓰다듬은, and 시다 is inside 만납시다 — and a one-syllable noun is inside half the
 * vocabulary: 상 is in 항상, 판 is in 판매. Both need their edges checked; an inflected form
 * carries its own ending and does not.
 */
function matchesForm(text, form, edges) {
  if (edges === 'none') return text.indexOf(form) >= 0;
  let at = text.indexOf(form);
  while (at >= 0) {
    const before = at === 0 ? '' : text[at - 1];
    const leftOk = !before || !HANGUL.test(before);
    if (leftOk) {
      // 'left' is enough for an inflected form: it carries its own ending, and what follows
      // is more ending — 먹었 is inside 먹었어요 and that is the word, not a different one.
      if (edges === 'left') return true;
      const after = text[at + form.length];
      if (!after || RIGHT_EDGE.test(after) || PARTICLE_START.indexOf(after) >= 0) return true;
    }
    at = text.indexOf(form, at + 1);
  }
  return false;
}

/**
 * The forms that belong to more than one headword, and so prove nothing about either.
 *
 * 듣다 and 들다 both give 들어요 — Korean rebuilds a ㄷ stem into a ㄹ one, landing exactly on
 * a verb that had ㄹ all along. Matching on it gave 듣다 (to listen) the sentence "지금 사는
 * 집이 마음에 안 들어요?", which is 마음에 들다, and handed the same sentence to both words.
 * The same trap is set by 걷다/걸다, 싣다/실다 and every other pair of that shape.
 *
 * Built once from the shipped lists, because ambiguity is a property of the vocabulary as a
 * whole and not of the word being looked at. A form used by one headword stays usable; a
 * form two of them can wear is refused, and the word gets an example only from a form that
 * can only be its own — 듣고, 듣는, 들으면 — or no example at all.
 */
let _ambiguous = null;
function ambiguousForms() {
  if (_ambiguous) return _ambiguous;
  const owners = new Map();
  const seen = new Set();
  const note = (ko) => {
    const w = String(ko || '').trim();
    if (!w || seen.has(w)) return;
    seen.add(w);
    String(w).split(/\s+/).filter(Boolean).forEach((part) => {
      surfaceForms(part).forEach((f) => {
        if (!owners.has(f)) owners.set(f, new Set());
        owners.get(f).add(part);
      });
    });
  };
  WORD_FILES.forEach((wf) => {
    let doc;
    try { doc = JSON.parse(fs.readFileSync(path.join(ROOT, wf.rel.split('/').join(path.sep)), 'utf8')); }
    catch (e) { return; }
    wordsOf(doc, wf.rel).forEach(({ w }) => note(w && w.ko));
  });
  _ambiguous = new Map();
  owners.forEach((set, form) => { if (set.size > 1) _ambiguous.set(form, set); });
  return _ambiguous;
}

/**
 * Could this sentence be using this headword? Every space-separated part has to be in it.
 *
 * Lenient on purpose. This is the question a checker asks of a sentence somebody chose —
 * including the ones written by hand long before this script existed, where "매일 아침
 * 공원에서 걸어요" is 걷다 and a reader can see that at a glance. Refusing it because a
 * machine cannot tell it from 걸다 would be the tool overruling the author.
 *
 * sentenceProvesUse below is the stricter question, and it is the one the picker asks.
 */
function sentenceUses(text, headword) {
  return matchParts(text, headword, false);
}

/**
 * Is this sentence *evidence* of this headword? The picker's question, and a harder one:
 * a form that another headword also wears proves nothing, so it does not count here.
 */
function sentenceProvesUse(text, headword) {
  return matchParts(text, headword, true);
}

function matchParts(text, headword, strictAboutAmbiguity) {
  const shared = strictAboutAmbiguity ? ambiguousForms() : null;
  const parts = String(headword).trim().split(/\s+/).filter(Boolean);
  return parts.every((part) => {
    const dictionaryForm = part.length >= 2 && part.endsWith('다');
    // A one-syllable stem builds one-syllable forms, and every one of them lives inside
    // other words: 셔서 is in 주셔서, where the 시 is the honorific infix and not 시다 at all.
    // So for those, every form has to start where a word starts.
    const shortStem = dictionaryForm && part.length === 2;
    // Which of the two reached the shared form honestly. 들다 builds 들어요 straight off its
    // own stem; 듣다 only gets there by turning its ㄷ into a ㄹ — landing on a word that had
    // one all along. So a shared form stays with the headword it is a plain extension of,
    // and is refused to the one that had to be rebuilt into it.
    const stem = dictionaryForm ? part.slice(0, -1) : part;
    return surfaceForms(part).some((f) => {
      const owners = shared && shared.get(f);
      if (owners && !(owners.size === 1 && owners.has(part)) && f.indexOf(stem) !== 0) return false;
      // Both edges for the two shapes that hide inside longer words: a dictionary form
      // (쓰다 inside 쓰다듬은) and a single syllable (상 inside 항상). A two-syllable noun is
      // specific enough on its own — 사항 has to be allowed to be followed by 입니다.
      const strict = (f === part && dictionaryForm) || part.length === 1;
      if (strict) return matchesForm(text, f, 'both');
      return matchesForm(text, f, shortStem ? 'left' : 'none');
    });
  });
}

// ═══════════════ THE CORPUS ═══════════════════════════════════════════════════
//
// Every Korean sentence the question banks contain, with where it came from. A fill-in item
// carries its sentence with a {} where the answer goes; filling it is what turns an exercise
// into an example, and an item whose blank cannot be filled is dropped rather than shown
// with a hole in it.
const SOURCES = [
  { rel: 'worlds/topik2-questions.json', label: 'TOPIK II', unit: 'topik-2' },
  { rel: 'worlds/unit10-workbook.json', label: 'Unit 10 · 익힘책', unit: '2b-unit-10' },
  { rel: 'worlds/unit10-textbook.json', label: 'Unit 10 · 교과서', unit: '2b-unit-10' },
  { rel: 'worlds/unit14-workbook.json', label: 'Unit 14 · 익힘책', unit: '2b-unit-14' },
  { rel: 'worlds/unit14-textbook.json', label: 'Unit 14 · 교과서', unit: '2b-unit-14' },
  { rel: 'worlds/unit15-textbook.json', label: 'Unit 15 · 교과서', unit: '2b-unit-15' },
  { rel: 'worlds/unit10-cassette.json', label: 'Unit 10 · 듣기', unit: '2b-unit-10' },
  { rel: 'worlds/unit11-cassette.json', label: 'Unit 11 · 듣기', unit: '2b-unit-11' },
  { rel: 'worlds/unit13-cassette.json', label: 'Unit 13 · 듣기', unit: '2b-unit-13' },
  { rel: 'worlds/unit14-cassette.json', label: 'Unit 14 · 듣기', unit: '2b-unit-14' },
  { rel: 'worlds/unit15-cassette.json', label: 'Unit 15 · 듣기', unit: '2b-unit-15' }
];

const HANGUL = /[가-힣]/;

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel.split('/').join(path.sep)), 'utf8'));
}

/**
 * A cue is not a sentence.
 *
 * Half of what an exercise prints is prompt material — "사과 · 딸기 · 오렌지 · 포도", or
 * "생선회가 유명하다 / 생선회는 안 먹다", or a comma-separated list of the words the learner
 * is to build a sentence out of. Each one contains the headword and none of them shows it in
 * use, which is the whole point of the field. They are refused here rather than ranked low,
 * because a word whose only match is a cue should come out blank.
 */
// How a Korean sentence ends. A prompt fragment ends on a particle — "유명한 사람을" — and
// that is the difference between a phrase to copy out and a sentence to read.
const SENTENCE_END = /(?:[.?!]|[요다까네야지어아래죠군자오])\s*["'’”」』)\]]?\s*$/;

function isCue(s) {
  if (s.indexOf(' / ') >= 0 || s.indexOf('·') >= 0) return true;
  // A circled digit is an option number: the text around it is a question with its choices
  // run together, not a sentence anybody wrote.
  if (/[①②③④⑤⑥⑦⑧⑨⑩]/.test(s)) return true;
  if ((s.match(/,/g) || []).length >= 2 && !/[요다까네]\s*[.?!]?$/.test(s)) return true;
  // A bare dictionary form is the way a prompt names a word, not the way a sentence ends.
  if (/(?:^|\s)[가-힣]+(?:하|되|이)?다$/.test(s) && !/[았었겠ㄴ는인]다$/.test(s)) return true;
  if (!SENTENCE_END.test(s)) return true;
  return false;
}

function pushSentence(out, text, src) {
  // Workbook answers are printed with a leading arrow or dash on the page; the sentence is
  // what comes after it.
  const s = String(text || '').replace(/\s+/g, ' ').replace(/^[→⇒➜\-–—·*•]\s*/, '').trim();
  if (!s || s.indexOf('{}') >= 0) return;          // an unfilled blank is not a sentence
  if (!HANGUL.test(s)) return;
  if (s.length < 5 || s.length > 90) return;       // too short to teach, too long to read
  if (/^[·\-—,\s]+$/.test(s)) return;
  if (isCue(s)) return;
  out.push(Object.assign({ text: s }, src));
}

/** The one choice an item calls correct, so a blank can be filled with what belongs in it. */
function answerText(item) {
  if (!item || !item.answer) return null;
  const hit = (item.choices || []).find((c) => c && c.id === item.answer);
  return hit && hit.ko ? String(hit.ko) : null;
}

function collect() {
  const out = [];
  SOURCES.forEach((src) => {
    let doc;
    try { doc = readJson(src.rel); }
    catch (e) { console.error('  cannot read ' + src.rel + ': ' + e.message); return; }

    // Cassettes: dialogue lines, and the dictation set — whole sentences, already curated.
    (doc.tracks || []).forEach((t) => {
      (t.lines || []).forEach((l) => pushSentence(out, l.ko, {
        label: src.label, unit: src.unit, where: t.sec || ('track ' + t.n)
      }));
    });
    ((doc.dictation || {}).items || []).forEach((it) => pushSentence(out, it.ko, {
      label: src.label, unit: src.unit, where: 'track ' + it.track, en: it.en || ''
    }));

    // Workbooks, textbooks and the TOPIK bank.
    (doc.exercises || []).forEach((ex) => {
      (ex.items || []).forEach((it) => {
        const fill = answerText(it);
        const where = (ex.no || ex.section || ex.id || '').toString();
        const meta = { label: src.label, unit: src.unit, where };
        // One blank, one answer. A line with two blanks takes two different words, and
        // filling both with the same one produced sentences like "녹차는 자주 마시는데 커피는
        // 자주 마시는데" — grammatical-looking nonsense with the headword in it twice.
        const complete = (s) => {
          if (!s) return s;
          const holes = s.split('{}').length - 1;
          if (holes === 0) return s;
          return holes === 1 && fill ? s.split('{}').join(fill) : null;
        };
        // Gathered per item, so the English can be attached only where it belongs to one
        // sentence. An item's `en` glosses the whole item: on a two-line exchange it reads
        // "A: … — B: …", which is the translation of neither line on its own.
        //
        // Counted before the filters, not after. An exchange whose second line is dropped as
        // a fragment leaves one sentence behind, and attaching the pair's gloss to it put
        // "A: How is the naengmyeon? — B: They put in a lot of vinegar" under a sentence that
        // says only the first half.
        const raw = (it.lines || []).map((l) => l && l.ko).concat([it.stemKo, it.phraseKo])
          .filter((s) => s && String(s).trim());
        const mine = [];
        (it.lines || []).forEach((l) => pushSentence(mine, complete(l.ko), meta));
        pushSentence(mine, complete(it.stemKo), meta);
        pushSentence(mine, complete(it.phraseKo), meta);
        if (raw.length === 1 && mine.length === 1 && it.en) mine[0].en = String(it.en).trim();
        mine.forEach((s) => out.push(s));
        // A choice is a whole sentence in the reading types, and a fragment in the rest.
        (it.choices || []).forEach((c) => {
          if (c && c.ko && c.ko.length >= 12) pushSentence(out, c.ko, meta);
        });
      });
    });
  });
  return out;
}

// ═══════════════ CHOOSING ONE ════════════════════════════════════════════════
//
// Several sentences will use a common word. The one worth keeping is the one from the
// learner's own unit, that reads as a finished sentence, and that is short enough to hold in
// the head — in that order.
function score(sentence, wordUnit, headword) {
  let s = 0;
  if (sentence.unit === wordUnit) s += 100;
  // An irregular verb is rebuilt before an ending, and the rebuilt form can belong to a
  // different verb: 듣다 gives 들어요, and so does 들다. A sentence that also shows the plain
  // stem — 듣고, 듣습니다 — is the one that settles it, so prefer it when there is one.
  if (headword && headword.length >= 3 && headword.endsWith('다')
    && sentence.text.indexOf(headword.slice(0, -1)) >= 0) s += 25;
  if (sentence.en) s += 20;                                   // curated, has a translation
  if (/[.?!]$|[요다까죠]\.?$/.test(sentence.text)) s += 15;    // finished, not a fragment
  const len = sentence.text.length;
  if (len >= 10 && len <= 45) s += 12;
  else if (len <= 60) s += 6;
  s -= Math.floor(len / 12);
  return s;
}

const WORD_FILES = [
  { rel: 'worlds/2b-unit-10.json', unit: '2b-unit-10', label: 'Unit 10' },
  { rel: 'worlds/2b-unit-11.json', unit: '2b-unit-11', label: 'Unit 11' },
  { rel: 'worlds/2b-unit-13.json', unit: '2b-unit-13', label: 'Unit 13' },
  { rel: 'worlds/2b-unit-14.json', unit: '2b-unit-14', label: 'Unit 14' },
  { rel: 'worlds/2b-unit-15.json', unit: '2b-unit-15', label: 'Unit 15' },
  { rel: 'worlds/topik-2.json', unit: 'topik-2', label: 'TOPIK II' },
  { rel: 'levels.json', unit: 'valley', label: 'Valley packs' }
];

function wordsOf(doc, rel) {
  if (rel === 'levels.json') {
    return [].concat.apply([], doc.map((lvl, li) =>
      (lvl.words || []).map((w, wi) => ({ w, path: [li, wi] }))));
  }
  return (doc.level.words || []).map((w, wi) => ({ w, path: [wi] }));
}

function main() {
  const corpus = collect();
  console.log('\n  corpus: ' + corpus.length + ' sentences from ' + SOURCES.length + ' banks\n');

  // One index pass rather than a scan per word: 2,900 headwords against 3,000 sentences is
  // nine million substring tests done the naive way, and it is the same answer either way.
  const totals = { words: 0, matched: 0, already: 0 };
  const perFile = [];

  WORD_FILES.forEach((wf) => {
    if (ONLY && wf.unit !== ONLY && wf.rel.indexOf(ONLY) < 0) return;
    const full = path.join(ROOT, wf.rel.split('/').join(path.sep));
    const doc = JSON.parse(fs.readFileSync(full, 'utf8'));
    const entries = wordsOf(doc, wf.rel);
    let matched = 0;
    let already = 0;
    const misses = [];
    const hits = [];

    entries.forEach(({ w }) => {
      if (!w || !w.ko) return;
      if (w.example && String(w.example).trim()) { already++; return; }
      let best = null;
      let bestScore = -Infinity;
      for (const s of corpus) {
        if (s.text === w.ko) continue;            // the headword alone is not a sentence
        if (!sentenceProvesUse(s.text, w.ko)) continue;
        const sc = score(s, wf.unit, w.ko);
        if (sc > bestScore) { bestScore = sc; best = s; }
      }
      if (!best) { misses.push(w.ko); return; }
      matched++;
      hits.push({ ko: w.ko, en: w.en, text: best.text, from: best.label + ' · ' + best.where });
      if (APPLY) {
        w.example = best.text;
        // Only where the source translated this sentence and no other. The word-detail page
        // prints exampleEn under the Korean, and a gloss belonging to the line above it
        // would be worse than none at all.
        if (best.en) w.exampleEn = best.en;
        else delete w.exampleEn;
      }
    });

    totals.words += entries.length;
    totals.matched += matched;
    totals.already += already;
    perFile.push({ wf, n: entries.length, matched, already, misses, hits });

    if (APPLY && matched) {
      fs.writeFileSync(full, JSON.stringify(doc, null, 2) + '\n', 'utf8');
    }
  });

  perFile.forEach(({ wf, n, matched, already, misses, hits }) => {
    const done = matched + already;
    const pct = n ? Math.round((done / n) * 100) : 0;
    const bar = '█'.repeat(Math.round(pct / 5)).padEnd(20, '·');
    console.log('  [' + bar + '] ' + String(pct).padStart(3) + '%  '
      + String(done).padStart(4) + '/' + String(n).padEnd(5) + wf.label
      + (already ? '  (' + already + ' already had one)' : ''));
    if (LIST) {
      hits.forEach((h) => console.log('        ' + h.ko + ' — ' + h.text + '   ‹' + h.from + '›'));
    }
    if (MISSES && misses.length) {
      console.log('        no example (' + misses.length + '): ' + misses.slice(0, 40).join(', ')
        + (misses.length > 40 ? ' …' : ''));
    }
  });

  const done = totals.matched + totals.already;
  console.log('\n  ' + done + '/' + totals.words + ' headwords have an example ('
    + Math.round((done / totals.words) * 100) + '%)'
    + (APPLY ? ' — written' : ' — nothing written, pass --apply'));
  console.log('');
}

if (require.main === module) main();

module.exports = { surfaceForms, sentenceUses, sentenceProvesUse, collect, matchesForm, ambiguousForms };
