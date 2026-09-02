// Vocabulary-book study helpers. These functions only derive information that is
// mechanically true from the spelling or from fields already curated on the word.
// They deliberately do not invent example sentences or pretend that spelling-based
// romanisation captures every sound change in spoken Korean.

const VB_INITIAL_JAMO = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];
const VB_VOWEL_JAMO = [
  'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'
];
const VB_FINAL_JAMO = [
  '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];

// Revised-Romanisation values for a written syllable. The final-consonant table is
// intentionally orthographic: the UI labels this a spelling guide and tells learners
// to use the audio for pronunciation, where liaison and assimilation can change it.
const VB_INITIAL_ROMAN = [
  'g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'
];
const VB_VOWEL_ROMAN = [
  'a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'
];
const VB_FINAL_ROMAN = [
  '', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k', 'm', 'p', 'l', 'l', 'p', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 'h'
];

function vbHangulBlock(char) {
  const code = String(char || '').charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return null;
  const offset = code - 0xac00;
  const initialIndex = Math.floor(offset / 588);
  const vowelIndex = Math.floor((offset % 588) / 28);
  const finalIndex = offset % 28;
  return {
    char,
    initial: VB_INITIAL_JAMO[initialIndex],
    vowel: VB_VOWEL_JAMO[vowelIndex],
    final: VB_FINAL_JAMO[finalIndex],
    hasBatchim: finalIndex > 0,
    romanized: VB_INITIAL_ROMAN[initialIndex] + VB_VOWEL_ROMAN[vowelIndex] + VB_FINAL_ROMAN[finalIndex]
  };
}

function vbHangulBlocks(text) {
  return Array.from(String(text || '').normalize('NFC'))
    .map(vbHangulBlock)
    .filter(Boolean);
}

function vbRomanize(text) {
  const raw = Array.from(String(text || '').normalize('NFC')).map((char) => {
    const block = vbHangulBlock(char);
    return block ? block.romanized : char;
  }).join('');
  // Two common cross-block spellings can be represented without guessing at the
  // surrounding word: ㄹ+ㄹ and ㄴ+ㄹ are written as ll in RR.
  return raw.replace(/lr/g, 'll').replace(/nr/g, 'll').replace(/\s+/g, ' ').trim();
}

function vbEndingRule(text) {
  const blocks = vbHangulBlocks(text);
  const last = blocks.length ? blocks[blocks.length - 1] : null;
  if (!last) {
    return {
      available: false,
      closed: false,
      batchim: '',
      topic: '',
      subject: '',
      object: '',
      direction: '',
      label: 'Latin-letter entry — particle choice follows the final spoken sound'
    };
  }
  const closed = last.hasBatchim;
  return {
    available: true,
    closed,
    batchim: last.final,
    topic: closed ? '은' : '는',
    subject: closed ? '이' : '가',
    object: closed ? '을' : '를',
    // ㄹ is the exception: a noun ending in ㄹ takes 로, not 으로.
    direction: closed && last.final !== 'ㄹ' ? '으로' : '로',
    label: closed
      ? `${last.char} ends with batchim ${last.final}`
      : `${last.char} is an open syllable (no batchim)`
  };
}

function vbStudyType(word, fact) {
  const ko = String((word && word.ko) || '').trim();
  const en = String((word && word.en) || '').trim().toLowerCase();
  const category = `${(word && word.categoryEn) || ''} ${(word && word.category) || ''}`.toLowerCase();
  const origin = fact && fact.o;
  if (origin === 'idiom') return 'Idiom';
  if (origin === 'discourse') return 'Discourse marker';
  if (!vbHangulBlocks(ko).length && /^[A-Z0-9][A-Z0-9.&/+\-]*$/i.test(ko)) return 'Abbreviation';
  if (/grammar|expression|문법/.test(category)) return 'Grammar form';
  if (/\s/.test(ko)) return 'Multi-word expression';
  if (/다$/.test(ko)) {
    return /^(to be|be |become |seem )/.test(en)
      ? 'Descriptive predicate'
      : 'Dictionary-form predicate';
  }
  if (origin === 'sino-noun') return 'Noun';
  return 'Vocabulary word';
}

function vbStudyNote(word, type, ending) {
  const ko = String((word && word.ko) || '').trim();
  const forms = Array.isArray(word && word.forms)
    ? [...new Set(word.forms.map(v => String(v || '').trim()).filter(Boolean))]
    : [];
  if (/predicate/.test(type)) {
    const stem = ko.endsWith('다') ? ko.slice(0, -1) : ko;
    return `This is a dictionary form. Remove -다 to see the stem ${stem}-. Endings attach to the stem; irregular predicates may change shape, so compare the audio and a curated example before producing a new form.`;
  }
  if (type === 'Multi-word expression') {
    return 'Learn this as one chunk. Keep the spacing shown in the headword, then practise recalling the whole expression instead of translating it word by word.';
  }
  if (type === 'Grammar form') {
    return 'Study the words immediately before and after this form. Its meaning depends on the sentence pattern, so reuse it from a complete example rather than in isolation.';
  }
  if (type === 'Discourse marker') {
    return 'This expression connects ideas in a text or conversation. Notice its position in a sentence and the relationship it signals between clauses.';
  }
  if (type === 'Idiom') {
    return 'Treat the complete expression as one meaning unit. The literal origin helps memory, but the idiomatic meaning is what belongs in a sentence.';
  }
  if (type === 'Abbreviation') {
    return 'This entry is written as a Latin-letter abbreviation. Learn its Korean reading from the audio; particle choice follows the final spoken sound, not the last printed letter.';
  }
  const seen = forms.length ? ` Forms recorded in this level include ${forms.join(', ')}.` : '';
  return `The final written block is ${ending.closed ? 'closed' : 'open'}. If this word is used as a noun phrase, that spelling selects ${ending.topic}, ${ending.subject}, ${ending.object} and ${ending.direction} from the common particle pairs.${seen}`;
}

function vbDetailModel(word, fact) {
  const safeWord = word || {};
  const blocks = vbHangulBlocks(safeWord.ko);
  const ending = vbEndingRule(safeWord.ko);
  const type = vbStudyType(safeWord, fact);
  const forms = Array.isArray(safeWord.forms)
    ? [...new Set(safeWord.forms.map(v => String(v || '').trim()).filter(Boolean))]
    : [];
  return {
    romanization: vbRomanize(safeWord.ko),
    blocks,
    syllableCount: blocks.length,
    ending,
    type,
    forms,
    studyNote: vbStudyNote(safeWord, type, ending)
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    vbHangulBlock,
    vbHangulBlocks,
    vbRomanize,
    vbEndingRule,
    vbStudyType,
    vbStudyNote,
    vbDetailModel
  };
}
