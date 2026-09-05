// Vocabulary-book study helpers. These functions only derive information that is
// mechanically true from the spelling or from fields already curated on the word.
// They deliberately do not invent example sentences or pretend that spelling-based
// romanisation captures every sound change in spoken Korean.

// tr() is a global from js/i18n.js in the browser, and this is the one file in js/ that is
// also `require`d on its own — tests/test_vocab_book.js loads it as a module, with no page
// and no other script around it. Reaching for the global there is a ReferenceError, so the
// fallback reads the English field directly, which is what tr() would have returned anyway
// for a caller that has no interface language.
const vbTr = (obj, field) => (typeof tr === 'function'
  ? tr(obj, field)
  : String((obj && obj[field]) || ''));
// hvT, guarded the same way and for the same reason. Outside a page there is no catalogue,
// so the key comes back and the caller sees which string was wanted.
const vbT = (key, vars) => (typeof hvT === 'function' ? hvT(key, vars) : key);

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
      ? vbT('ui.vb.ending.closed', { block: last.char, batchim: last.final })
      : vbT('ui.vb.ending.open', { block: last.char })
  };
}

/**
 * Which kind of entry this is — as an id, not as a label.
 *
 * vbStudyNote below chooses its advice from this, and it used to choose by matching the
 * English words: `type === 'Multi-word expression'`. That works in exactly one language, so
 * the identity and the wording are now two different things.
 */
function vbStudyType(word, fact) {
  const ko = String((word && word.ko) || '').trim();
  const en = String((word && vbTr(word, 'en')) || '').trim().toLowerCase();
  const category = `${(word && vbTr(word, 'categoryEn')) || ''} ${(word && word.category) || ''}`.toLowerCase();
  const origin = fact && fact.o;
  if (origin === 'idiom') return 'idiom';
  if (origin === 'discourse') return 'discourse';
  if (!vbHangulBlocks(ko).length && /^[A-Z0-9][A-Z0-9.&/+\-]*$/i.test(ko)) return 'abbreviation';
  if (/grammar|expression|문법/.test(category)) return 'grammar';
  if (/\s/.test(ko)) return 'multiword';
  if (/다$/.test(ko)) {
    return /^(to be|be |become |seem )/.test(en) ? 'descriptive' : 'dictionary';
  }
  if (origin === 'sino-noun') return 'noun';
  return 'vocab';
}

/** The same thing in words, for the card that shows it. */
function vbStudyTypeLabel(id) {
  return vbT('ui.vb.type.' + (id || 'vocab'));
}

function vbStudyNote(word, type, ending) {
  const ko = String((word && word.ko) || '').trim();
  const forms = Array.isArray(word && word.forms)
    ? [...new Set(word.forms.map(v => String(v || '').trim()).filter(Boolean))]
    : [];
  if (type === 'descriptive' || type === 'dictionary') {
    const stem = ko.endsWith('다') ? ko.slice(0, -1) : ko;
    return vbT('ui.vb.note.predicate', { stem });
  }
  if (type === 'multiword') return vbT('ui.vb.note.multiword');
  if (type === 'grammar') return vbT('ui.vb.note.grammar');
  if (type === 'discourse') return vbT('ui.vb.note.discourse');
  if (type === 'idiom') return vbT('ui.vb.note.idiom');
  if (type === 'abbreviation') return vbT('ui.vb.note.abbreviation');
  const seen = forms.length ? ' ' + vbT('ui.vb.note.forms', { forms: forms.join(', ') }) : '';
  return vbT(ending.closed ? 'ui.vb.note.closed' : 'ui.vb.note.open', {
    topic: ending.topic, subject: ending.subject, object: ending.object, direction: ending.direction
  }) + seen;
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
    type: vbStudyTypeLabel(type),
    typeId: type,
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
    vbStudyTypeLabel,
    vbStudyNote,
    vbDetailModel
  };
}
