'use strict';
/**
 * tests/test_rich_text.js — the format layer the admin Designer writes (js/richText.js).
 *
 * Formatting lives beside the text, never in it: `fmt` on any object with text, `design` on a
 * page or a bank. This suite holds the four things that make that safe:
 *
 *   1. the style vocabulary agrees across richText.js, css/rich.css and js/i18n.js;
 *   2. the sanitizer lets through only what it lists — no script, handler, style or URL scheme
 *      survives, however it is spelled — and its output is balanced and idempotent;
 *   3. an overlay is only ever drawn over the words it was written for, and the validators
 *      refuse one that is not;
 *   4. the shipped renderer, driven in a sandbox, draws a formatted page — boxes, marks, blocks,
 *      design classes, a glossary — and draws an unformatted page byte for byte as it did
 *      before richText.js existed.
 *
 * Plus the admin half: every bank round-trips through the admin validator byte for byte, so a
 * save from the Designer changes only what was edited.
 *
 * Run: node tests/test_rich_text.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const R = require('../js/richText.js');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}
function throws(fn, re, msg) {
  let err = null;
  try { fn(); } catch (e) { err = e; }
  assert(!!err && (!re || re.test(err.message)), msg + (err ? '' : ' (did not throw)') + (err && re && !re.test(err.message) ? ' — got: ' + err.message : ''));
}

console.log('====================================================');
console.log('THE FORMAT LAYER — js/richText.js');
console.log('====================================================');

// ── 1. One vocabulary ────────────────────────────────────────────────────────
console.log('\n--- 1. Every style the script can write has a rule ---');
const css = read('css/rich.css');
const has = (sel) => css.indexOf(sel) >= 0;
const missing = [];
R.SIZES.forEach((s) => { if (!has('.hv-sz-' + s + ' ')) missing.push('hv-sz-' + s); });
R.COLORS.forEach((s) => { if (!has('.hv-c-' + s + ' ')) missing.push('hv-c-' + s); });
R.HIGHLIGHTS.forEach((s) => { if (!has('.hv-hl-' + s)) missing.push('hv-hl-' + s); });
R.BOXES.forEach((s) => { if (!has('.hv-box-' + s)) missing.push('hv-box-' + s); });
R.FONTS.forEach((s) => { if (!has('.hv-f-' + s + ',')) missing.push('hv-f-' + s); });
R.ALIGNS.forEach((s) => { if (!has('.hv-al-' + s)) missing.push('hv-al-' + s); });
R.FRAMES.forEach((s) => { if (!has('.hv-frame-' + s)) missing.push('hv-frame-' + s); });
R.DIVIDERS.forEach((s) => { if (!has('.hv-divider-' + s)) missing.push('hv-divider-' + s); });
R.IMG_SIZES.forEach((s) => { if (!has('img.hv-img-' + s)) missing.push('hv-img-' + s); });
R.THEMES.filter((t) => t !== 'parchment').forEach((t) => { if (!has('#workbook-panel.hv-theme-' + t)) missing.push('hv-theme-' + t); });
R.WIDTHS.filter((w) => w !== 'normal').forEach((w) => { if (!has('#workbook-panel.hv-w-' + w)) missing.push('hv-w-' + w); });
R.DENSITIES.filter((d) => d !== 'normal').forEach((d) => { if (!has('#workbook-panel.hv-dens-' + d)) missing.push('hv-dens-' + d); });
R.FONTS.filter((f) => f !== 'sans').forEach((f) => { if (!has('#workbook-panel.hv-font-' + f)) missing.push('hv-font-' + f); });
['hv-cols-2', 'hv-cols-3', 'hv-scaled'].forEach((c) => { if (!has('#workbook-panel.' + c)) missing.push(c); });
assert(missing.length === 0, 'css/rich.css has a rule for every size, colour, highlight, box, font, alignment, frame, divider, theme, width and density'
  + (missing.length ? ' — missing ' + missing.join(', ') : ''));
Object.keys(R.FONT_FAMILIES).forEach((f) => assert(css.indexOf(R.FONT_FAMILIES[f]) >= 0, 'the stylesheet names ' + R.FONT_FAMILIES[f] + ' for "' + f + '"'));
const i18n = require('../js/i18n.js');
const langs = i18n.HV_LANGS.map((l) => l.code).filter((c) => c !== i18n.HV_DEFAULT_LANG).sort();
assert(JSON.stringify(langs) === JSON.stringify(R.LANGS.slice().sort()), 'richText.js formats every interface language i18n.js offers (' + langs.join(', ') + ')');
// None of the keys the layer adds may be a field the translation scanner reads, or every
// formatted string would turn up in the Translate tab as a new sentence to translate.
const layerKeys = ['fmt', 'design', 'html', 'size', 'align', 'box', 'color', 'font', 'bold', 'italic', 'theme', 'width', 'scale',
  'cols', 'density', 'glossMode', 'glossary', 'glossHide', 'blocks', 'ko', 'gl', 'kind', 'at', 'when', 'heading', 'icon', 'src',
  'side', 'alt', 'caption', 'frame', 'style', 'id'].concat(R.LANGS);
const scanned = layerKeys.filter((k) => i18n.HV_TEXT_FIELDS.indexOf(k) >= 0);
assert(scanned.length === 0, 'no key of the format layer is a translatable field' + (scanned.length ? ' — ' + scanned.join(', ') : ''));

// ── 2. The sanitizer ─────────────────────────────────────────────────────────
console.log('\n--- 2. Only what is listed gets through ---');
const attacks = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  '<IMG SRC="javascript:alert(1)">',
  '<img src="media/a.png" onload="alert(1)">',
  '<svg onload=alert(1)><circle/></svg>',
  '<a href="javascript:alert(1)">x</a>',
  '<iframe src="https://evil.example"></iframe>',
  '<span style="background:url(javascript:alert(1))">x</span>',
  '<b onclick="alert(1)">x</b>',
  '<b ONMOUSEOVER=alert(1)>x</b>',
  '<scr<script>ipt>alert(1)</scr</script>ipt>',
  '<img src="data:image/png;base64,AAAA">',
  '<img src="//evil.example/a.png">',
  '<img src="media/../../.env.png">',
  '<math><mi xlink:href="javascript:alert(1)">x</mi></math>',
  '<style>body{display:none}</style>',
  '<template><img src=x onerror=alert(1)></template>',
  '<!--><img src=x onerror=alert(1)>-->',
  '<span class="hv-gl" data-gl="&quot; onmouseover=&quot;alert(1)">x</span>',
  '<object data="x.swf"></object><embed src="x.swf">'
];
// Checked on the markup with every attribute value blanked: text inside a quoted value — a
// meaning that reads ` onmouseover=` — is data, and is escaped so it can never close its quote.
const leaked = attacks.map((a) => ({ a, out: R.sanitize(a) })).filter(({ out }) => {
  const tags = out.replace(/="[^"]*"/g, '=""');
  return /<script|<iframe|<svg|<math|<object|<embed|<style|<template|\son\w+\s*=|javascript:|href=|style=/i.test(tags)
    || /src="(?!media\/[A-Za-z0-9][A-Za-z0-9._-]*\.(png|jpe?g|webp|gif)"|sprites\/)/.test(out)
    || /data:image|\/\/evil/i.test(out);
});
assert(leaked.length === 0, attacks.length + ' attacks come out harmless'
  + (leaked.length ? ' — ' + leaked.map((l) => l.a + ' → ' + l.out).join(' | ') : ''));
assert(R.sanitize('<span class="hv-gl" data-gl="&quot; onmouseover=&quot;alert(1)">x</span>')
  === '<span class="hv-gl" data-gl="&quot; onmouseover=&quot;alert(1)">x</span>', 'a quote inside a meaning stays inside its attribute');
assert(R.sanitize('<b>open <i>deep') === '<b>open <i>deep</i></b>', 'unclosed tags are closed');
assert(R.sanitize('text</b></i>more') === 'textmore', 'stray end tags are dropped');
assert(R.sanitize('a < b &amp; c > d') === 'a &lt; b &amp; c &gt; d', 'a literal < and & stay text');
assert(R.sanitize('<STRONG>x</STRONG> <em>y</em> <strike>z</strike>') === '<b>x</b> <i>y</i> <s>z</s>', 'synonyms map to one spelling');
const keep = '<b>진한</b> is <i>진하다</i> with <span class="hv-c-red">-(으)ㄴ</span>, <mark class="hv-hl-green">so</mark> '
  + '<span class="hv-gl" data-gl="eyebrow" data-gl-vi="lông mày">눈썹</span> <ruby>漢字<rt>한자</rt></ruby><br>'
  + '<img class="hv-img-sm" src="media/a-1234.png" alt="a"> <span class="hv-sz-lg hv-f-serif">큰</span>';
assert(R.sanitize(keep) === keep, 'everything on the list survives exactly');
const messy = '<div>a<b>b<span class="hv-c-red junk" style="x">c</span></b></div><p>d<ul><li>e<li>f</ul>';
assert(R.sanitize(R.sanitize(messy)) === R.sanitize(messy), 'sanitizing twice changes nothing');

// ── 3. Overlays and the words they format ────────────────────────────────────
console.log('\n--- 3. An overlay is drawn only over its own words ---');
const multi = 'First paragraph.\n\nSecond — with < and & in it.';
assert(R.plain(R.fromText(multi)) === multi, 'plain text survives fromText → plain unchanged, line breaks and all');
assert(R.plain('<b>a</b><br><br><i>b</i>') === 'a\n\nb', 'breaks are line breaks');
assert(R.plain('<ruby>漢字<rt>한자</rt></ruby>') === '漢字', 'a reading above the text is not part of the text');
assert(R.matches('<b>저는</b>  {} 좋아요', '저는 {} 좋아요'), 'whitespace does not decide whether an overlay matches');
assert(!R.matches('<b>저는</b> {} 싫어요', '저는 {} 좋아요'), 'the words do');
const item = { why: 'Hello world', fmt: { why: { html: 'Hello <b>world</b>', vi: 'Xin <i>chào</i>', size: 'lg', box: 'tip' } } };
assert(R.field({ why: 'x' }, 'why', 'x') === null, 'a field without formatting is left to the caller, which escapes it as before');
assert(R.field(item, 'why', 'Hello world', { block: true }) === '<div class="hv-fmt hv-sz-lg hv-box hv-box-tip">Hello <b>world</b></div>',
  'a formatted field draws its marks inside its box');
assert(R.field(item, 'why', 'Hello there', { block: true }) === '<div class="hv-fmt hv-sz-lg hv-box hv-box-tip">Hello there</div>',
  'an out-of-date overlay is not drawn: the new words show plainly, still in the box');
assert(R.field(item, 'why', 'Xin chào', { lang: 'vi' }) === '<span class="hv-fmt hv-sz-lg hv-box hv-box-tip">Xin <i>chào</i></span>',
  'the Vietnamese overlay is drawn over the Vietnamese');
assert(R.field(item, 'why', 'Một bản dịch mới', { lang: 'vi' }).indexOf('Một bản dịch mới') > 0, 'and not over a translation it was not written for');
const line = { ko: '저는 {} 좋아요.', fmt: { ko: { html: '<b>저는</b> {} <mark>좋아요</mark>.' } } };
const lp = R.fieldParts(line, 'ko', line.ko, {});
assert(lp.parts.length === 2 && lp.parts[0] === '<b>저는</b> ' && lp.parts[1] === ' <mark>좋아요</mark>.', 'a line splits into its pieces at the {}');
const cut = { ko: '저는 {} 좋아요.', fmt: { ko: { html: '저는 {<b>} 좋아요.</b>' } } };
assert(R.fieldParts(cut, 'ko', cut.ko, {}).parts.length === 2, 'a {} the formatting cut in half falls back to the plain line rather than lose a blank');
const topik = { why: 'Lead.\n\nOne.\n\nTwo.', fmt: { why: { html: '<b>Lead.<br><br>One.</b><br><br>Two.' } } };
const paras = R.fieldParagraphs(topik, 'why', topik.why, {});
assert(paras.length === 3 && paras[0] === '<b>Lead.</b>' && paras[1] === '<b>One.</b>', 'a bold that runs across a blank line still splits into steps');
// One paragraph at a time, as the Designer edits an exam explanation: the text and the html
// split at the same blank lines, and joined again give the field back.
const tp = R.textParagraphs('Lead line one.\nLead line two.\n\nStep one.\r\n \r\nStep two.\n\n\n');
assert(tp.length === 3 && tp[0] === 'Lead line one.\nLead line two.' && tp[2] === 'Step two.', 'the text splits at blank lines, on LF and CRLF, and keeps a paragraph\'s own line breaks');
const hp = R.paragraphsOf('<b>Lead</b> line one.<br>Lead line two.<br><br>Step <span class="hv-gl" data-gl-vi="một">one</span>.<br> <br>Step two.');
assert(hp.length === 3 && hp[0] === '<b>Lead</b> line one.<br>Lead line two.' && hp[1] === 'Step <span class="hv-gl" data-gl-vi="một">one</span>.',
  'the html splits at the same places, as stored html — a meaning keeps its stored form');
assert(R.matches(hp.join('<br><br>'), tp.join('\n\n')) && hp.every((h, i) => R.matches(h, tp[i])), 'and paragraph k of one is paragraph k of the other');
assert(R.specClasses({ size: 'lg', box: 'tip', color: 'blue' }, { noBox: true }) === 'hv-fmt hv-sz-lg hv-c-blue'
  && /hv-box-tip/.test(R.specClasses({ size: 'lg', box: 'tip' })), 'a paragraph drawn inside a card takes the field\'s styles, not its box');
assert(R.show('<span class="hv-gl" data-gl="eyebrow" data-gl-vi="lông mày">눈썹</span>', 'vi')
  === '<span class="hv-gl wb-gl" data-gl="lông mày" tabindex="0">눈썹</span>',
  'a meaning written into the text becomes the game’s own hover element, in the interface language, reachable by keyboard');
// The browser drew a title as a second tooltip on top of the card, so there is none — here, or
// in either automatic pass (js/ui.js, the Designer's preview).
assert(!/title=/.test(R.show(keep, 'vi')) && !/title=/.test(R.show(keep)), 'a shown meaning carries no title');
const uiSrc = read('js/ui.js');
const applySrc = uiSrc.slice(uiSrc.indexOf('function wbApplyGloss('), uiSrc.indexOf('function wbApplyGloss(') + 2000);
const previewSrc = read('admin/public/js/designerPreview.js');
assert(applySrc.indexOf("setAttribute('title'") < 0 && previewSrc.indexOf("setAttribute('title'") < 0,
  'neither automatic pass gives a glossed word a title');

// A meaning over several lines: the breaks stay (the card draws them), stored as &#10; so a tag
// never breaks a line, each line tidied, no more than one empty line in a row — and the words
// the overlay has to match are untouched.
const ml = R.sanitize('<span class="hv-gl" data-gl-vi="đang làm thì chuyển\r\n  sang   việc khác\n\n\n\n— cố ý hoặc tình cờ ">-다가</span>');
assert(ml === '<span class="hv-gl" data-gl-vi="đang làm thì chuyển&#10;sang việc khác&#10;&#10;— cố ý hoặc tình cờ">-다가</span>',
  'a meaning keeps its line breaks, tidied, written &#10; (got ' + ml + ')');
assert(R.sanitize(ml) === ml && R.plain(ml) === '-다가', 'and it is stable, and the text is still only the word');
assert(R.show(ml, 'vi').indexOf('data-gl="đang làm thì chuyển&#10;sang việc khác') >= 0, 'the game is handed the lines as written');
assert(R.sanitize('<span class="hv-gl" data-gl="a{}b">x</span>') === '<span class="hv-gl" data-gl="ab">x</span>', 'a {} still cannot get into a meaning');
assert(R.LIMITS.gloss === 400, 'a meaning may run to 400 characters');

// The meanings a field carries, for the Designer's Meanings tab, and one of them changed there.
const two = 'A <span class="hv-gl" data-gl="eyebrow" data-gl-vi="lông mày">눈썹</span> and '
  + '<b><span class="hv-gl hv-c-red" data-gl-vi="mắt">눈</span></b>.';
const found = R.glossesIn(two);
assert(found.length === 2 && found[0].word === '눈썹' && found[0].gl === 'eyebrow' && found[0].vi === 'lông mày'
  && found[1].word === '눈' && found[1].gl === '' && found[1].vi === 'mắt', 'every meaning in a field is found, in reading order');
assert(R.setGlossIn(two, 1, { vi: 'con mắt\n(bộ phận)' }) === two.replace('data-gl-vi="mắt"', 'data-gl-vi="con mắt&#10;(bộ phận)"'),
  'one meaning is changed in place, line break and all, the rest of the field byte for byte');
assert(R.setGlossIn(two, 0, { gl: '' }) === two.replace(' data-gl="eyebrow"', ''), 'emptying one language keeps the other');
assert(R.setGlossIn(two, 0, { gl: '', vi: '' }) === 'A 눈썹 and <b><span class="hv-gl hv-c-red" data-gl-vi="mắt">눈</span></b>.',
  'emptying both takes the meaning off the word');
assert(R.setGlossIn(two, 1, { vi: '' }) === 'A <span class="hv-gl" data-gl="eyebrow" data-gl-vi="lông mày">눈썹</span> and <b><span class="hv-c-red">눈</span></b>.',
  'and a word that was also coloured keeps its colour');
assert(R.matches(R.setGlossIn(two, 0, { gl: '', vi: '' }), R.plain(two)), 'the words never change');

// The card's inside, shared by the game and the admin's preview of it.
const tipCard = R.glossCardHtml('썰렁한', [{ text: 'cold,\n<dull>' }], '썰렁하다');
assert(tipCard.indexOf('<div class="hv-gtip-word" lang="ko">썰렁한<span class="hv-gtip-head">썰렁하다</span></div>') === 0
  && tipCard.indexOf('<div class="hv-gtip-body">cold,\n&lt;dull&gt;</div>') > 0, 'a card shows the word, its dictionary form and the meaning, escaped');
assert(R.glossCardHtml('눈썹', [{ lang: 'vi', text: 'lông mày' }, { lang: 'en', text: 'eyebrow' }]).indexOf('<b class="hv-gtip-lang">VI</b><span>lông mày</span>') > 0,
  'two meanings are labelled by language');
assert(R.glossCardHtml('눈', [{ text: 'eye' }], '눈').indexOf('hv-gtip-head') < 0, 'a dictionary form the same as the word is not repeated');
assert(typeof R.glossTips === 'function' && R.glossTips(null) === false, 'the card starts only in a page');
const richCss = read('css/rich.css');
assert(['.hv-gtip-card', '.hv-gtip-card.on', '.hv-gtip-card.below', '.hv-gtip-word', '.hv-gtip-body', '.hv-gtip-arrow', '.hv-gl-on']
  .every((s) => richCss.indexOf(s) >= 0) && /\.hv-gtip-body \{[^}]*white-space: pre-line/.test(richCss),
  'css/rich.css draws the card, keeping a meaning\'s line breaks');
const gameCss = read('css/game.css');
assert(gameCss.indexOf('html:not(.hv-gtip) .wb-gl:hover::after') >= 0 && richCss.indexOf('html:not(.hv-gtip) .hv-gl') >= 0,
  'the old CSS bubbles stand down where the card runs, so a meaning is never drawn twice');

// ── 4. The validators ────────────────────────────────────────────────────────
console.log('\n--- 4. What a save refuses ---');
assert(JSON.stringify(R.cleanSpec({ html: '<b>a</b> b', size: 'lg' }, 'a b', 'X')) === '{"html":"<b>a</b> b","size":"lg"}', 'a good overlay is kept');
assert(R.cleanSpec({ html: 'a b' }, 'a b', 'X') === undefined, 'an overlay that adds nothing is dropped');
throws(() => R.cleanSpec({ html: '<b>a</b> c' }, 'a b', 'X'), /no longer reads the same/, 'an overlay for different words is refused');
throws(() => R.cleanSpec({ html: '<b>저는 {</b>} 좋아요' }, '저는 {} 좋아요', 'X'), /splits a \{\} blank/, 'an overlay that cuts a blank in half is refused');
throws(() => R.cleanSpec({ size: 'huge' }, 'a', 'X'), /size must be one of/, 'a size that does not exist is refused');
throws(() => R.cleanSpec({ html: 'a', typo: 1 }, 'a', 'X'), /unknown setting "typo"/, 'an unknown key is refused, not dropped');
throws(() => R.cleanFmt({ why: { size: 'lg' } }, { en: 'x' }, 'Item'), /does not have/, 'formatting a field the entry lacks is refused');
assert(JSON.stringify(R.cleanFmt({ '*': { box: 'note' } }, {}, 'Item')) === '{"*":{"box":"note"}}', 'a row can be given a box of its own');
throws(() => R.cleanDesign({ glossary: [{ ko: '밥', gl: 'rice' }] }, 'E'), /one character/, 'a one-syllable glossary word is refused, with where to gloss it instead');
throws(() => R.cleanDesign({ glossary: [{ ko: '눈썹', gl: 'a' }, { ko: '눈썹', gl: 'b' }] }, 'E'), /twice/, 'a word in the glossary twice is refused');
throws(() => R.cleanDesign({ blocks: [{ kind: 'image', src: 'https://x/y.png' }] }, 'E'), /media\/ or sprites\//, 'a picture from anywhere else is refused');
throws(() => R.cleanDesign({ blocks: [{ kind: 'text', html: 'x', at: 'items' }] }, 'Bank', { level: 'bank' }), /at must be one of top, bottom/, 'a bank\'s blocks go on its list page');
throws(() => R.cleanDesign({ theme: 'neon' }, 'E'), /theme must be one of/, 'a theme that does not exist is refused');
const d = R.cleanDesign({ scale: 1.1, width: 'wide', glossHide: ['a', 'a'], blocks: [{ kind: 'image', src: 'media/x-1.png', width: 62 }, { kind: 'divider' }] }, 'E');
assert(d.scale === 1.1 && d.blocks[0].width === 60 && d.blocks[0].id === 'b1' && d.blocks[1].id === 'b2' && d.glossHide.length === 1,
  'numbers snap to their step, blocks get ids, repeats go');

// ── 5. The shipped renderer ──────────────────────────────────────────────────
console.log('\n--- 5. The game draws it ---');
// The DOM stub and sandbox tests/test_listening_pages.js drives.
function makeDom() {
  const els = Object.create(null);
  function mkEl(tag) {
    const el = {
      tagName: (tag || 'div').toUpperCase(), textContent: '', className: '', type: '',
      disabled: false, tabIndex: -1, children: [], attrs: Object.create(null), onclick: null, onkeydown: null,
      classList: {
        _s: new Set(),
        add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); },
        toggle(c, on) { if (on === undefined) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); } else if (on) this._s.add(c); else this._s.delete(c); }
      },
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
function loadUi(withRich, words) {
  const { document, els } = makeDom();
  const real = Object.create(null);
  const noop = function () { return undefined; };
  const sandbox = new Proxy(real, {
    has() { return true; },
    get(t, k) { if (k in t) return t[k]; if (typeof k === 'symbol') return undefined; if (k in globalThis) return globalThis[k]; return noop; },
    set(t, k, v) { t[k] = v; return true; },
    defineProperty(t, k, desc) { Object.defineProperty(t, k, desc); return true; },
    deleteProperty(t, k) { delete t[k]; return true; }
  });
  // A sitting deals its buttons at random (wbDeal); two sandboxes compared byte for byte have
  // to be dealt the same hand, so each gets the same seeded source.
  let seed = 20260928;
  const seeded = Object.create(Math);
  seeded.random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  Object.assign(real, {
    Math: seeded,
    console: { log() {}, info() {}, warn() {}, error() {} }, IS_NODE: true, document, window: { addEventListener() {} },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    activeModalStack: [], playerLocked: false, playChiptuneSFX: noop, checkQuestProgress: noop, ensurePlayerRank: noop,
    studySessionXp: () => 10, addPlayerXp: (xp) => ({ leveled: false, level: 1, xp, need: 100 }), addHonor: noop,
    persistSave: noop, updateRankHUD: noop,
    currentLesson: () => ({ worldId: '2b-unit-12', words: words || [] })
  });
  vm.createContext(sandbox);
  vm.runInContext(read('js/workbookArt.js'), sandbox);
  vm.runInContext(read('js/i18n.js'), sandbox);
  if (withRich) vm.runInContext(read('js/richText.js'), sandbox);
  vm.runInContext(read('js/ui.js'), sandbox);
  return {
    els, real,
    run: (expr) => vm.runInContext(expr, sandbox),
    open: (bank, exId) => { real.__bank = bank; vm.runInContext('openWorkbook(__bank)', sandbox); if (exId) vm.runInContext("openWorkbookExercise('" + exId + "')", sandbox); }
  };
}
// Everything a render leaves behind, as one string: the innerHTML the page was given and the
// element trees the per-question rows are built from.
function snapshot(els) {
  const walk = (e) => ({ t: e.tagName, c: e.className, h: e.innerHTML, x: e.textContent, a: e.attrs, k: (e.children || []).map(walk) });
  return JSON.stringify(['wb-title', 'wb-sub', 'wb-count', 'wb-instruction', 'wb-example', 'wb-bank', 'wb-items', 'wb-explain', 'wb-hint', 'wb-check']
    .map((id) => (els[id] ? walk(els[id]) : null)));
}

const u12 = JSON.parse(read('worlds/unit12-textbook.json'));
const byId = (b, id) => b.exercises.find((e) => e.id === id);
// An unformatted page, with the layer loaded and without it: the same bytes.
['u12sgk-vocab-1', 'u12sgk-gram-1', 'u12sgk-listen-1'].forEach((id) => {
  const a = loadUi(false);
  a.open(JSON.parse(JSON.stringify(u12)), id);
  const b = loadUi(true);
  b.open(JSON.parse(JSON.stringify(u12)), id);
  assert(snapshot(a.els) === snapshot(b.els), id + ' draws byte for byte the same with the format layer loaded');
  byId(u12, id).items.forEach((it, i) => { a.run("wbPickChoice(" + i + ", '" + it.answer + "')"); b.run("wbPickChoice(" + i + ", '" + it.answer + "')"); });
  a.run('checkWorkbook()'); b.run('checkWorkbook()');
  assert(snapshot(a.els) === snapshot(b.els), '… and so does its answer view');
});

// A formatted page.
const bank = JSON.parse(JSON.stringify(u12));
const ex = byId(bank, 'u12sgk-vocab-1');
ex.fmt = { instructionKo: { html: '<b>[보기]</b>와 같이 알맞은 말을 골라 문장을 완성하세요.', size: 'lg', color: 'blue' }, noteEn: { box: 'info' } };
const it0 = ex.items[0];
it0.lines[0].fmt = { ko: { html: '저는 <span class="hv-hl-yellow">눈썹이</span> {} 사람이 좋아요.' } };
it0.choices[0].fmt = { ko: { html: '<s>' + it0.choices[0].ko + '</s>' } };
it0.fmt = { why: { html: '<b>' + it0.why.slice(0, 3) + '</b>' + it0.why.slice(3).replace(/&/g, '&amp;').replace(/</g, '&lt;'), box: 'tip' }, '*': { box: 'warn' } };
ex.design = {
  theme: 'mint', cols: 2, font: 'serif', scale: 1.2, glossMode: 'always',
  glossary: [{ ko: '눈썹', gl: 'eyebrow', vi: 'lông mày' }],
  glossHide: ['외모'],
  blocks: [
    { id: 'b1', kind: 'text', at: 'instruction', html: '<b>Tip:</b> look at the noun.', box: 'tip', icon: '💡', heading: 'Mẹo' },
    { id: 'b2', kind: 'image', at: 'top', src: 'sprites/foods/kimchi_jjigae.png', width: 50, caption: 'Kimchi' },
    { id: 'b3', kind: 'divider', at: 'explain', style: 'dots' }
  ]
};
const ui = loadUi(true, [{ ko: '외모', en: 'appearance' }, { ko: '사람', en: 'person' }]);
ui.open(bank, 'u12sgk-vocab-1');
const inst = ui.els['wb-instruction'].innerHTML;
assert(inst.indexOf('<div class="hv-fmt hv-sz-lg hv-c-blue"><b>[보기]</b>와 같이') >= 0, 'the instruction is drawn large, blue, with its marks');
assert(inst.indexOf('class="wb-inst-note hv-unboxed"') >= 0 && inst.indexOf('<div class="hv-fmt hv-box hv-box-info">') >= 0,
  'a note given a box of its own draws that box instead of the note\'s usual one');
const row = ui.els['wb-items'].children[0];
assert(/\bhv-box-warn\b/.test(row.className) && /\bwb-row\b/.test(row.className), 'a row given a box carries it on the row itself');
const exp = row.children.find((c) => c.className === 'wb-exp');
const lineEl = exp.children.find((c) => c.className === 'wb-exp-line');
assert(lineEl.innerHTML.indexOf('<span class="hv-hl-yellow">눈썹이</span>') >= 0 && lineEl.innerHTML.indexOf('wb-blank') >= 0,
  'a formatted line keeps its highlight and its blank');
const picks = exp.children.find((c) => c.className === 'wb-exp-picks');
assert(picks.children.some((b) => b.innerHTML.indexOf('<s>' + it0.choices[0].ko + '</s>') >= 0), 'a formatted button draws its marks');
const panel = ui.els['workbook-panel'];
['hv-theme', 'hv-theme-mint', 'hv-cols-2', 'hv-font-serif', 'hv-scaled'].forEach((c) =>
  assert(panel.classList.contains(c), 'the page wears ' + c));
assert(ui.els['wb-blocks-instruction'].innerHTML.indexOf('hv-block-text hv-box hv-box-tip') >= 0
  && ui.els['wb-blocks-instruction'].innerHTML.indexOf('<b>Tip:</b> look at the noun.') >= 0, 'a text box sits after the instruction');
assert(ui.els['wb-blocks-top'].innerHTML.indexOf('src="sprites/foods/kimchi_jjigae.png"') >= 0
  && ui.els['wb-blocks-top'].innerHTML.indexOf('--hv-w:50%') >= 0, 'a picture sits at the top at the width it was given');
assert(ui.els['wb-blocks-explain'].innerHTML === '', 'a block placed with the answers waits for them');
const idx = ui.run('wbGlossTable()');
assert(idx && idx.map.get('눈썹') === 'eyebrow' && !idx.map.has('외모') && idx.map.get('사람') === 'person',
  'the glossary adds its words, hides the hidden ones and keeps the rest of the world\'s');
ex.items.forEach((it, i) => ui.run("wbPickChoice(" + i + ", '" + it.answer + "')"));
ui.run('checkWorkbook()');
const why = ui.els['wb-explain'].innerHTML;
assert(why.indexOf('<div class="hv-fmt hv-box hv-box-tip"><b>' + it0.why.slice(0, 3) + '</b>') >= 0, 'the explanation draws its formatting');
assert(ui.els['wb-blocks-explain'].innerHTML.indexOf('hv-divider-dots') >= 0, 'and the block placed with the answers appears with them');
ui.run('backToWorkbookList()');
assert(!panel.classList.contains('hv-theme-mint'), 'back on the list, the page\'s own design comes off again');

// An exam page: the explanation drawn as cards and steps. The field's styles reach every
// paragraph, and a question's own fields (item.extra) are more cards beside the clue and the
// rule — or, on an ordinary page, boxes under the grammar note.
const recipe = JSON.parse(read('worlds/recipe1-questions.json'));
const rx = recipe.exercises[0];
const r0 = rx.items[0];
r0.fmt = { why: { size: 'lg', color: 'blue', box: 'tip' } };
r0.extra = [{ id: 'x1', labelEn: 'Memory tip', noteEn: 'An action under way, cut into.' }, { id: 'x2', labelEn: 'Empty', noteEn: '' }];
const ux = loadUi(true);
ux.open(recipe, rx.id);
rx.items.forEach((it, i) => {
  ux.run("wbPickChoice(" + i + ", '" + it.answer + "')");
  if (it.answer2) ux.run("wbPickChoice(" + i + ", '" + it.answer2 + "', 2)");
});
ux.run('checkWorkbook()');
const card = ux.els['wb-explain'].innerHTML;
const leadP = '<span>01 · 핵심 단서 · WHAT TO NOTICE</span><p class="hv-fmt hv-sz-lg hv-c-blue">';
assert(card.indexOf(leadP) >= 0 && card.indexOf('<div class="wb-analysis-step"><span>01</span><p class="hv-fmt hv-sz-lg hv-c-blue">') >= 0,
  'the field\'s size and colour reach the clue and every reasoning step');
assert(card.indexOf('hv-box-tip') < 0, '… but not its box: the cards are boxes already');
assert(card.indexOf('<section class="wb-learn-card wb-learn-extra"><span>03 · Memory tip</span><p>An action under way, cut into.</p></section>') >= 0,
  'a custom field is a card of its own, numbered after the clue and the rule');
assert(card.indexOf('Empty') < 0, 'and one with nothing in it is not drawn');
const plainBank = JSON.parse(JSON.stringify(u12));
const pEx = byId(plainBank, 'u12sgk-vocab-1');
pEx.items[0].extra = [{ id: 'x1', labelEn: 'Tip', noteEn: 'Look at the noun.' }];
const up = loadUi(true);
up.open(plainBank, 'u12sgk-vocab-1');
pEx.items.forEach((it, i) => up.run("wbPickChoice(" + i + ", '" + it.answer + "')"));
up.run('checkWorkbook()');
assert(up.els['wb-explain'].innerHTML.indexOf('<div class="wb-why-extra"><b class="wb-why-extra-h">Tip</b>Look at the noun.</div>') >= 0,
  'on an ordinary page it is a box under the grammar note');

// ── 6. The admin half ────────────────────────────────────────────────────────
console.log('\n--- 6. A save from the Designer changes only what was edited ---');
const wb = require('../admin/lib/workbook.js');
const drift = [];
Object.keys(wb.WORKBOOKS).forEach((key) => {
  const rel = wb.WORKBOOKS[key];
  const raw = read(rel).replace(/\r\n/g, '\n');
  const out = JSON.stringify(wb.validateWorkbook(JSON.parse(raw), rel), null, 2) + '\n';
  if (out !== raw) drift.push(key);
});
assert(drift.length === 0, 'every one of ' + Object.keys(wb.WORKBOOKS).length + ' banks comes back from the validator byte for byte'
  + (drift.length ? ' — ' + drift.join(', ') : ''));
const saved = wb.validateWorkbook(JSON.parse(JSON.stringify(bank)), 'worlds/unit12-textbook.json');
const sEx = saved.exercises.find((e) => e.id === 'u12sgk-vocab-1');
assert(sEx.design && sEx.design.blocks.length === 3 && sEx.fmt.instructionKo.size === 'lg'
  && sEx.items[0].lines[0].fmt && sEx.items[0].choices[0].fmt && sEx.items[0].fmt['*'].box === 'warn',
  'the validator keeps the formatting and the design wherever they were written');
const stale = JSON.parse(JSON.stringify(bank));
byId(stale, 'u12sgk-vocab-1').instructionKo = 'Different words now.';
throws(() => wb.validateWorkbook(stale, 'worlds/unit12-textbook.json'), /Exercise \d+ fmt\.instructionKo: the formatted text no longer reads the same/,
  'and refuses an overlay the text has moved away from, naming the place');
// A meaning written over several lines, in the glossary and in the text, saved from the
// Meanings tab: it comes back as written, and saves again unchanged.
const lined = JSON.parse(JSON.stringify(bank));
const lEx = byId(lined, 'u12sgk-vocab-1');
lEx.design.glossary = [{ ko: '눈썹', vi: 'lông mày\n— phần lông phía trên mắt', gl: 'eyebrow' }];
lEx.items[0].lines[0].fmt = { ko: { html: '저는 <span class="hv-gl" data-gl-vi="lông mày&#10;(trên mắt)" data-gl="eyebrow">눈썹이</span> {} 사람이 좋아요.' } };
const lSaved = wb.validateWorkbook(lined, 'worlds/unit12-textbook.json');
const lsEx = lSaved.exercises.find((e) => e.id === 'u12sgk-vocab-1');
assert(lsEx.design.glossary[0].vi === 'lông mày\n— phần lông phía trên mắt'
  && lsEx.items[0].lines[0].fmt.ko.html.indexOf('data-gl-vi="lông mày&#10;(trên mắt)"') >= 0,
  'a meaning over several lines is saved as written, in the glossary and in the text');
assert(JSON.stringify(wb.validateWorkbook(JSON.parse(JSON.stringify(lSaved)), 'worlds/unit12-textbook.json')) === JSON.stringify(lSaved),
  'and a second save changes nothing');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
console.log('\ntest_rich_text: all passed');
