'use strict';
/**
 * A gender the Korean never gives, across every bank.
 *
 * Korean leaves people ungendered far more often than English can: 선배, 동생, 친구, 경찰, 선수,
 * the writer of a 읽기 passage, and every name. The English had filled the gap with he or she
 * about ninety times, and the Vietnamese followed it with anh ấy, cô ấy or ông ấy — Vietnamese
 * pronouns carry age as well as gender, so each one was a guess about the person on top of the
 * guess about their sex. The English now uses the name, "the writer", or no pronoun at all.
 *
 * A pronoun stays only where the Korean gives the gender, and this test says where that is:
 *   - the row's own Korean has a word that genders someone — 여자, 언니, 형님, 할머니, 아내,
 *     여자 친구, 여성 …;
 *   - the row's speakers are labelled 남 or 여, or, for a dictation line, its track labels them
 *     or names someone as 남자 or 여자;
 *   - or the gender is given somewhere the row does not carry — the tape of a 듣기 page, the
 *     passage of a 읽기 page, TOPIK's 그 — and the page is listed below with where.
 * Anything else fails, so a new he or she has to be looked at before it ships. A listed page
 * that no longer has a pronoun fails too, so the list cannot go stale.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log('  [PASS] ' + msg); } else { failed++; console.log('  [FAIL] ' + msg); }
}

const PRONOUN = /\b(he|she|him|her|hers|his|himself|herself)\b/i;
const VI_PRONOUN = /(?<!\p{L})(anh ấy|cô ấy|ông ấy|bà ấy|anh ta|cô ta|cậu ấy|chị ấy|ông ta|bà ta)(?!\p{L})/iu;
// Words that give someone's gender. 형 only as a word of its own (not 인형, 형태), 딸 not 딸기,
// and the written language's 그 for he (그의, 그는) that TOPIK passages use.
const GENDERED = /남자|여자|남성|여성|언니|누나|오빠|(?<![가-힣])형(?!태|식|편|성|용)|어머|아버|엄마|아빠|할머니|할아버지|아주머니|아저씨|아내|남편|부인|(?<![가-힣])딸(?!기)|아들|그녀|자매|며느리|사위|(?<![가-힣])그(?:의|는|가|를|에게)(?![가-힣])/;
const FIELDS = ['en', 'why', 'grammar', 'labelEn', 'sectionEn', 'blurbEn', 'instructionEn', 'noteEn',
  'titleEn', 'pickEn', 'checkEn', 'omittedNote', 'exampleEn'];

// Pages whose gender comes from somewhere the row does not carry: [bank, exercise id or
// 'dict:<id>', where the Korean gives it].
const GIVEN_ELSEWHERE = [
  ['unit11-textbook', 'u11sgk-listen-1', 'both questions ask about the 여자'],
  ['unit12-textbook', 'u12sgk-speak-1', '나나 calls 마리코 언니'],
  ['unit12-textbook', 'u12sgk-listen-1', 'the tape labels 마리코 여2'],
  ['unit15-textbook', 'u15sgk-listen-2', 'the tape labels the retiring 김정민 남, and he speaks of his 아내'],
  ['unit16-textbook', 'u16sgk-listen-1', 'the passenger has 형님 at home, which a man says'],
  ['unit16-textbook', 'u16sgk-listen-2', 'the tape labels 나나 여1, 정우 남 and 지연 여2'],
  ['review4-workbook', 'r4-listen-3', 'question 8 on the tape is about a 남자 친구'],
  ['review6-workbook', 'r6-listen-2', 'the 듣기 지문 labels its speakers 남자 and 여자'],
  ['review6-workbook', 'r6-listen-5', 'questions 13 and 14 ask about the 여자 of each recording']
];
const elsewhere = new Map(GIVEN_ELSEWHERE.map(([bank, where, why]) => [bank + ' ' + where, why]));
const usedElsewhere = new Set();

// Choices come as a list of {id, ko} on the build banks and as a map of strings on the quizzes.
const koList = (v) => (Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : []))
  .map((c) => (typeof c === 'string' ? c : (c && (c.ko || '')) || '') + (c && c.who ? ' ' + c.who : ''));
const koOf = (o) => [o.phraseKo, o.ko, o.stemKo, o.example, o.answerKo]
  .concat(koList(o.lines), koList(o.choices), koList(o.choices2))
  .filter((s) => typeof s === 'string' && s).join(' ');
const labelled = (o) => Array.isArray(o.lines) && o.lines.some((l) => l && /^(남|여)\d?$/.test(l.who || ''));

const banks = ['levels.json'].concat(fs.readdirSync(path.join(ROOT, 'worlds')).filter((f) => f.endsWith('.json')).map((f) => 'worlds/' + f));
const hits = [];
const unexplained = [];
let viGuesses = [];
banks.forEach((rel) => {
  const bank = rel.replace(/^worlds\//, '').replace(/\.json$/, '');
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  let vi = {};
  const viPath = path.join(ROOT, 'locales', 'vi', rel);
  if (fs.existsSync(viPath)) vi = JSON.parse(fs.readFileSync(viPath, 'utf8')).entries || {};
  // A dictation line takes its context from the whole track it was cut from.
  const tracks = new Map(((data.tracks) || []).map((t) => [t.n, t]));
  const check = (o, where, context) => {
    FIELDS.forEach((f) => {
      const s = o[f];
      if (typeof s !== 'string' || !PRONOUN.test(s)) return;
      const id = bank + ' ' + where.join(' ') + ' ' + f;
      hits.push(id);
      const given = GENDERED.test(context.ko) || context.labelled;
      const listed = where.map((w) => bank + ' ' + w).find((k) => elsewhere.has(k));
      if (listed && !given) usedElsewhere.add(listed);
      if (!given && !listed) unexplained.push(id + ' — ' + s.match(PRONOUN)[0] + ' in «' + s.slice(0, 90) + '»');
      if (!given && !listed && VI_PRONOUN.test(vi[f + '|' + s] || '')) viGuesses.push(id);
    });
  };
  const walk = (o, where, context) => {
    if (Array.isArray(o)) { o.forEach((x) => walk(x, where, context)); return; }
    if (!o || typeof o !== 'object') return;
    const here = o.id !== undefined && typeof o.id === 'string' ? where.concat(o.id) : where;
    const ctx = { ko: context.ko + ' ' + koOf(o), labelled: context.labelled || labelled(o) };
    if (o.track !== undefined && tracks.has(o.track) && o.who !== undefined) {
      const t = tracks.get(o.track);
      ctx.ko += ' ' + t.lines.map((l) => l.ko).join(' ');
      ctx.labelled = ctx.labelled || t.lines.some((l) => /^(남|여)\d?$/.test(l.who || ''));
    }
    const at = o.track !== undefined && o.who !== undefined ? here.concat('dict:' + o.id) : (o.n !== undefined ? here.concat('#' + o.n) : here);
    check(o, at, ctx);
    Object.keys(o).forEach((k) => {
      if (k === 'tracks' || !o[k] || typeof o[k] !== 'object') return;
      walk(o[k], k === 'words' ? here.concat('words') : here, k === 'items' || k === 'exercises' || k === 'dictation' || k === 'words' ? context : ctx);
    });
  };
  walk(data, [], { ko: '', labelled: false });
});

console.log('\n--- A gender the Korean never gives ---');
assert(hits.length > 50, 'the scan reads every bank and finds the pronouns the Korean does give (' + hits.length + ')');
assert(unexplained.length === 0, 'every he or she in the English has a Korean reason for it'
  + (unexplained.length ? ' — ' + unexplained.length + ':\n      ' + unexplained.slice(0, 12).join('\n      ') : ''));
assert(viGuesses.length === 0, 'and no Vietnamese anh ấy / cô ấy stands on a guess either'
  + (viGuesses.length ? ' — ' + viGuesses.slice(0, 5).join(', ') : ''));
const stale = GIVEN_ELSEWHERE.map(([b, w]) => b + ' ' + w).filter((k) => !usedElsewhere.has(k));
assert(stale.length === 0, 'every page listed as giving the gender elsewhere still has a pronoun only that listing explains'
  + (stale.length ? ' — ' + stale.join(', ') : ''));

// Spot checks on strings this pass rewrote, so that a revert shows up by name.
const readBank = (b) => JSON.parse(fs.readFileSync(path.join(ROOT, 'worlds', b + '.json'), 'utf8'));
const row = (b, id, n) => readBank(b).exercises.find((e) => e.id === id).items.find((r) => r.n === n);
assert(/Teacher Kim/.test(row('unit16-workbook', 'u16-grammar-4-2', 5).en) && !/Mr Kim/.test(row('unit16-workbook', 'u16-grammar-4-2', 5).en),
  '김 선생님 is Teacher Kim, not Mr Kim');
assert(/younger sibling/.test(row('unit16-workbook', 'u16-grammar-2-1', 3).en), '동생 is a younger sibling, not a brother');
assert(/police officer/.test(row('topik2-questions', 'topik2-notice', 12).en), '경찰 is a police officer, not a policeman');
assert(/Julien/.test(readBank('unit16-textbook').exercises.find((e) => e.id === 'u16sgk-speak-2').blurbEn), '줄리앙 is Julien in Unit 16 too');

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
if (failed) process.exit(1);
console.log('\ntest_pronouns: all passed');
