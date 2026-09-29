/**
 * js/richText.js — how a page looks, kept apart from what it says.
 *
 * The curriculum's strings are load-bearing in ways a formatting layer must not disturb. A
 * `lines[].ko` is split on `{}` for its blanks, spoken by the TTS (whose clip name is the hex
 * of the exact text), and in dictation compared letter by letter; an English `why` is the key
 * its Vietnamese translation is filed under; a headword is the SRS record's identity. Writing
 * `<b>` into any of them would change what it says to every one of those readers. So nothing
 * here ever goes *into* a content string. Formatting lives beside the text, as an overlay:
 *
 *   item.why                 "진한 is 진하다 with the modifier -(으)ㄴ …"      ← unchanged, canonical
 *   item.fmt.why.html        "<b>진한</b> is 진하다 with the modifier <mark>-(으)ㄴ</mark> …"
 *   item.fmt.why.vi          the same, formatted, over the Vietnamese translation
 *   item.fmt.why.size / .box / .align / .color / .font / .bold / .italic
 *
 * The overlay is used only while its text still reads exactly as the field does
 * (`matches`): edit the sentence and forget the formatting, and the page shows the new
 * sentence plainly instead of the old one prettily. The block styles — size, box, alignment —
 * say nothing about the words, so they apply in every language and survive any edit.
 *
 * An exercise (and a whole bank) can also carry a `design`: a theme, page width, zoom,
 * question columns, a font, a gloss mode and glossary, and blocks — text boxes, pictures and
 * dividers — placed between the page's own sections. See docs/content-designer.md.
 *
 * One file serves four readers: the game (global `HVRich`), the admin designer and its
 * preview, the admin validators and scripts/validate_content.js (CommonJS). It touches no
 * DOM except `ensureFonts` and the hover meaning's card (`glossTips`, which starts itself in a
 * browser page), and the sanitizer is a string parser for the same reason: the rules that
 * decide what is safe to save are the rules that decide what is safe to draw.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module && typeof module.exports === 'object') module.exports = api;
  else if (root) root.HVRich = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ── Vocabulary ──────────────────────────────────────────────────────────────
  // Every name a style can take. The admin builds its menus from these, the validators check
  // against them, and css/rich.css defines one rule per entry — tests/test_rich_text.js
  // checks that the three agree.
  const SIZES = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
  const COLORS = ['ink', 'brown', 'red', 'orange', 'green', 'teal', 'blue', 'purple', 'pink', 'gray'];
  const HIGHLIGHTS = ['yellow', 'green', 'blue', 'pink', 'orange', 'purple'];
  const BOXES = ['note', 'tip', 'info', 'warn', 'danger', 'grammar', 'example', 'quote', 'card', 'dashed'];
  const ALIGNS = ['left', 'center', 'right', 'justify'];
  const FONTS = ['sans', 'serif', 'hand', 'round', 'display', 'mono'];
  const THEMES = ['parchment', 'notebook', 'mint', 'sky', 'blossom', 'lavender', 'sand'];
  const WIDTHS = ['narrow', 'normal', 'wide', 'full'];
  const DENSITIES = ['compact', 'normal', 'airy'];
  // When the automatic hover meanings appear. 'checked' is how the game has always done it:
  // before the answer is out, underlining the hard words points at the ones the question
  // turns on. A glossary entry written by hand for a reading page is another matter, so a page
  // may ask for 'always'. 'off' stops the automatic pass; a meaning written into the text
  // itself (a gloss span) is the author's own decision and always shows.
  const GLOSS_MODES = ['checked', 'always', 'off'];
  // Where a block can sit on an exercise page, in page order. 'explain' shows with the
  // answers; 'top' and 'bottom' are also the two places a bank's own blocks go on its list.
  const ANCHORS = ['top', 'instruction', 'example', 'items', 'explain', 'bottom'];
  const BANK_ANCHORS = ['top', 'bottom'];
  const BLOCK_KINDS = ['text', 'image', 'divider'];
  const FRAMES = ['none', 'border', 'shadow', 'polaroid', 'round'];
  const SIDES = ['left', 'right', 'top'];
  const DIVIDERS = ['line', 'dots', 'dashed', 'double'];
  const WHEN = ['always', 'unchecked', 'checked'];
  const IMG_SIZES = ['xs', 'sm', 'md', 'lg', 'xl'];
  // Interface languages other than the source. Must match js/i18n.js HV_LANGS minus English;
  // tests/test_rich_text.js holds the two together.
  const LANGS = ['vi'];

  // The web font behind each family name. Noto Sans KR is already on every page; the rest
  // are fetched the first time a page asks for one (see ensureFonts).
  const FONT_FAMILIES = {
    sans: 'Noto Sans KR',
    serif: 'Nanum Myeongjo',
    hand: 'Gaegu',
    round: 'Gowun Dodum',
    display: 'Do Hyeon',
    mono: 'Nanum Gothic Coding'
  };
  const FONT_QUERY = {
    serif: 'Nanum+Myeongjo:wght@400;700;800',
    hand: 'Gaegu:wght@400;700',
    round: 'Gowun+Dodum',
    display: 'Do+Hyeon',
    mono: 'Nanum+Gothic+Coding:wght@400;700'
  };

  const LIMITS = {
    html: 20000,      // one field's formatted text
    gloss: 400,       // one hover meaning, over several lines if it likes
    alt: 200,
    caption: 300,
    heading: 120,
    icon: 8,
    depth: 16,
    blocks: 24,
    glossary: 400,
    glossKo: 40,
    glossHide: 400
  };

  // ── Escaping ────────────────────────────────────────────────────────────────
  function esc(v) {
    if (v === null || v === undefined) return '';
    return String(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function escText(v) {
    return String(v === null || v === undefined ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  // A line break inside an attribute — a meaning written over two lines — is written &#10;, so
  // stored markup never breaks a line in the middle of a tag.
  function escAttr(v) {
    return escText(v).replace(/"/g, '&quot;').replace(/\r?\n/g, '&#10;');
  }

  const NAMED = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '­',
    hellip: '…', mdash: '—', ndash: '–', lsquo: '‘', rsquo: '’',
    ldquo: '“', rdquo: '”', middot: '·', bull: '•', times: '×',
    divide: '÷', rarr: '→', larr: '←', harr: '↔', uarr: '↑',
    darr: '↓', deg: '°', plusmn: '±', laquo: '«', raquo: '»',
    copy: '©', reg: '®', ensp: ' ', emsp: ' ', thinsp: ' ',
    zwj: '‍', zwnj: '‌'
  };
  function decode(s) {
    return String(s).replace(/&(#[xX][0-9a-fA-F]{1,6}|#[0-9]{1,7}|[a-zA-Z][a-zA-Z0-9]{1,31});/g, (m, body) => {
      if (body.charAt(0) === '#') {
        const hex = body.charAt(1) === 'x' || body.charAt(1) === 'X';
        const code = parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10);
        if (!isFinite(code) || code <= 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return '�';
        return String.fromCodePoint(code);
      }
      return Object.prototype.hasOwnProperty.call(NAMED, body) ? NAMED[body] : m;
    });
  }

  // ── The sanitizer ───────────────────────────────────────────────────────────
  // Parses into a small tree and writes back only what is on the list. Anything else is
  // unwrapped (its text kept) — or, for the elements whose contents are code or chrome rather
  // than prose, dropped with everything inside. Attributes are never copied: each allowed one
  // is rebuilt from a checked value, so there is no event handler, style, href or URL scheme
  // that can survive, however it is spelled.
  const TAGS = {
    b: 'b', strong: 'b', i: 'i', em: 'i', u: 'u', ins: 'u', s: 's', strike: 's', del: 's',
    sub: 'sub', sup: 'sup', small: 'small', mark: 'mark', span: 'span', font: 'span',
    br: 'br', hr: 'hr', p: 'p', div: 'p', ul: 'ul', ol: 'ol', li: 'li',
    blockquote: 'blockquote', h3: 'h3', h4: 'h4', ruby: 'ruby', rt: 'rt', rp: 'rp', img: 'img'
  };
  const VOID = { br: 1, hr: 1, img: 1, wbr: 1, input: 1, meta: 1, link: 1, base: 1, col: 1, area: 1, source: 1, track: 1, param: 1, embed: 1 };
  // Their contents are raw text to the browser, so a tag inside them is not a tag.
  const RAW_TEXT = { script: 1, style: 1, textarea: 1, title: 1, xmp: 1, iframe: 1, noembed: 1, noframes: 1, noscript: 1, plaintext: 1 };
  // Markup whose contents are not prose: dropped whole.
  const DROP = {
    svg: 1, math: 1, template: 1, object: 1, applet: 1, select: 1, option: 1, optgroup: 1, datalist: 1,
    button: 1, form: 1, video: 1, audio: 1, canvas: 1, picture: 1, map: 1, head: 1, frameset: 1, frame: 1,
    input: 1, meta: 1, link: 1, base: 1, embed: 1, param: 1, source: 1, track: 1, area: 1
  };
  const BLOCK = { p: 1, ul: 1, ol: 1, li: 1, blockquote: 1, h3: 1, h4: 1, hr: 1 };
  const CLOSES_P = { p: 1, ul: 1, ol: 1, blockquote: 1, h3: 1, h4: 1, hr: 1 };

  const CLASS_RE = new RegExp('^hv-(?:'
    + 'sz-(?:' + SIZES.join('|') + ')'
    + '|c-(?:' + COLORS.join('|') + ')'
    + '|hl-(?:' + HIGHLIGHTS.join('|') + ')'
    + '|f-(?:' + FONTS.join('|') + ')'
    + '|al-(?:' + ALIGNS.join('|') + ')'
    + ')$');
  const IMG_CLASS_RE = new RegExp('^hv-img-(?:' + IMG_SIZES.join('|') + ')$');
  // A picture the game ships or one uploaded through the admin, as a relative path. Relative
  // on purpose: the game page sits at the site root, the desktop build at 127.0.0.1:8742/, and
  // the admin preview sets its <base> to wherever the game's files are.
  const SRC_RE = /^(?:media\/[A-Za-z0-9][A-Za-z0-9._-]{0,120}\.(?:png|jpe?g|webp|gif)|sprites\/[A-Za-z0-9][A-Za-z0-9._/-]{0,200}\.png)$/;

  function cleanSrc(v) {
    const src = String(v === null || v === undefined ? '' : v).trim().replace(/^\/+/, '');
    if (!src || src.indexOf('..') >= 0 || src.indexOf('//') >= 0 || !SRC_RE.test(src)) return '';
    return src;
  }

  // A value going back into an attribute: no controls, no `{}` (a line is split on it), one
  // line, bounded.
  function cleanAttrText(v, max) {
    return decode(String(v === null || v === undefined ? '' : v))
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\{\}/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max);
  }

  // A hover meaning: the same, except that its line breaks stay — the card draws a meaning as
  // written, over several lines — with the spaces in each line tidied and at most one empty
  // line in a row.
  function cleanGlossText(v, max) {
    return decode(String(v === null || v === undefined ? '' : v))
      .replace(/\r\n?/g, '\n')
      .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ')
      .replace(/\{\}/g, '')
      .split('\n').map((line) => line.replace(/\s+/g, ' ').trim()).join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, max)
      .trim();
  }

  // The attribute list of one start tag, from just after its name. Quoted values may hold
  // `>`, which is why this is a scanner and not a regular expression over the whole tag.
  function scanTag(src, at) {
    const attrs = {};
    let i = at;
    const n = src.length;
    let selfClose = false;
    while (i < n) {
      const c = src.charAt(i);
      if (c === '>') { i += 1; return { attrs, end: i, selfClose }; }
      if (c === '/' ) { selfClose = src.charAt(i + 1) === '>'; i += 1; continue; }
      if (/\s/.test(c)) { i += 1; continue; }
      let j = i;
      while (j < n && !/[\s/>=]/.test(src.charAt(j))) j++;
      const name = src.slice(i, j).toLowerCase();
      i = j;
      while (i < n && /\s/.test(src.charAt(i))) i++;
      let value = '';
      if (src.charAt(i) === '=') {
        i += 1;
        while (i < n && /\s/.test(src.charAt(i))) i++;
        const q = src.charAt(i);
        if (q === '"' || q === "'") {
          const close = src.indexOf(q, i + 1);
          value = close < 0 ? src.slice(i + 1) : src.slice(i + 1, close);
          i = close < 0 ? n : close + 1;
        } else {
          let k = i;
          while (k < n && !/[\s>]/.test(src.charAt(k))) k++;
          value = src.slice(i, k);
          i = k;
        }
      }
      if (name && !Object.prototype.hasOwnProperty.call(attrs, name)) attrs[name] = value;
    }
    return { attrs, end: n, selfClose };
  }

  function classesFor(tag, raw) {
    const out = [];
    String(raw || '').split(/\s+/).forEach((c) => {
      if (!c || out.indexOf(c) >= 0) return;
      if (tag === 'img' ? (IMG_CLASS_RE.test(c) || /^hv-al-/.test(c) && CLASS_RE.test(c)) : CLASS_RE.test(c)) out.push(c);
      else if (c === 'hv-gl' && tag === 'span') out.push(c);
    });
    return out;
  }

  // Builds the element for a start tag, or null when the tag should be unwrapped.
  function makeElement(tag, raw, inGloss) {
    const el = { tag, attrs: {}, kids: [] };
    if (tag === 'br' || tag === 'hr' || tag === 'rp') return el;
    if (tag === 'img') {
      const src = cleanSrc(decode(raw.src || ''));
      if (!src) return null;
      const cls = classesFor('img', raw['class']);
      if (cls.length) el.attrs['class'] = cls.join(' ');
      el.attrs.src = src;
      el.attrs.alt = cleanAttrText(raw.alt, LIMITS.alt);
      return el;
    }
    const cls = classesFor(tag, raw['class']);
    const gl = cls.indexOf('hv-gl');
    if (gl >= 0) {
      // A meaning may be written in Vietnamese alone (the admin writes Vietnamese first); the
      // English one is then optional, and English mode shows the Vietnamese rather than nothing.
      const meaning = cleanGlossText(raw['data-gl'], LIMITS.gloss);
      const langs = {};
      LANGS.forEach((code) => {
        const m = cleanGlossText(raw['data-gl-' + code], LIMITS.gloss);
        if (m) langs[code] = m;
      });
      if ((!meaning && !Object.keys(langs).length) || inGloss) cls.splice(gl, 1);
      else {
        if (meaning) el.attrs['data-gl'] = meaning;
        Object.keys(langs).forEach((code) => { el.attrs['data-gl-' + code] = langs[code]; });
      }
    }
    if (cls.length) el.attrs['class'] = cls.join(' ');
    return el;
  }

  function isGloss(el) {
    return !!(el && el.attrs && typeof el.attrs['class'] === 'string'
      && el.attrs['class'].split(' ').indexOf('hv-gl') >= 0);
  }

  function parse(html) {
    const src = String(html === null || html === undefined ? '' : html).replace(/\u0000/g, '');
    const root = { tag: '#root', attrs: {}, kids: [] };
    const stack = [root];
    const top = () => stack[stack.length - 1];
    const pushText = (t) => {
      if (!t) return;
      const kids = top().kids;
      const last = kids[kids.length - 1];
      if (last && last.text !== undefined) last.text += t;
      else kids.push({ text: t });
    };
    const openIndex = (tags) => {
      for (let k = stack.length - 1; k > 0; k--) if (tags[stack[k].tag]) return k;
      return -1;
    };
    const inGloss = () => stack.some(isGloss);
    let i = 0;
    const n = src.length;
    while (i < n) {
      const lt = src.indexOf('<', i);
      if (lt < 0) { pushText(decode(src.slice(i))); break; }
      if (lt > i) pushText(decode(src.slice(i, lt)));
      i = lt;
      if (src.startsWith('<!--', i)) {
        const end = src.indexOf('-->', i + 4);
        i = end < 0 ? n : end + 3;
        continue;
      }
      const next = src.charAt(i + 1);
      if (next === '!' || next === '?') {
        const end = src.indexOf('>', i);
        i = end < 0 ? n : end + 1;
        continue;
      }
      const m = /^<(\/?)([a-zA-Z][a-zA-Z0-9-]*)/.exec(src.slice(i, i + 80));
      if (!m) { pushText('<'); i += 1; continue; }
      const closing = m[1] === '/';
      const name = m[2].toLowerCase();
      const t = scanTag(src, i + m[0].length);
      i = t.end;
      if (closing) {
        const tag = TAGS[name];
        if (!tag) continue;
        for (let k = stack.length - 1; k > 0; k--) {
          if (stack[k].tag === tag) { stack.length = k; break; }
        }
        continue;
      }
      if (RAW_TEXT[name]) {
        const re = new RegExp('</' + name + '(?=[\\s/>])', 'ig');
        re.lastIndex = i;
        const mm = re.exec(src);
        if (!mm) i = n;
        else { const gt = src.indexOf('>', mm.index); i = gt < 0 ? n : gt + 1; }
        continue;
      }
      if (DROP[name]) {
        if (t.selfClose || VOID[name]) continue;
        // Skip to the matching end tag, counting nested ones of the same name.
        let depth = 1;
        const re = new RegExp('<(/?)' + name + '(?=[\\s/>])', 'ig');
        re.lastIndex = i;
        let mm;
        while (depth > 0 && (mm = re.exec(src))) depth += mm[1] ? -1 : 1;
        if (!mm) { i = n; continue; }
        const gt = src.indexOf('>', mm.index);
        i = gt < 0 ? n : gt + 1;
        continue;
      }
      const tag = TAGS[name];
      if (!tag) continue;
      if (CLOSES_P[tag]) {
        const at = openIndex({ p: 1, h3: 1, h4: 1 });
        if (at > 0) stack.length = at;
      }
      if (tag === 'li') {
        const li = openIndex({ li: 1 });
        const list = openIndex({ ul: 1, ol: 1 });
        if (li > 0 && li > list) stack.length = li;
      }
      const el = makeElement(tag, t.attrs, inGloss());
      if (!el) continue;
      top().kids.push(el);
      if (VOID[tag] || tag === 'hr' || tag === 'br' || tag === 'img') continue;
      if (stack.length > LIMITS.depth) { top().kids.pop(); continue; }
      stack.push(el);
    }
    return root;
  }

  function hasContent(node) {
    return node.kids.some((k) => (k.text !== undefined ? /\S/.test(k.text) : (k.tag === 'img' || k.tag === 'br' || k.tag === 'hr' || hasContent(k))));
  }

  // ── Writing the tree back ───────────────────────────────────────────────────
  // 'store' is the form saved to disk. 'show' is the form drawn in the game: a gloss span
  // becomes the same `.wb-gl` element the automatic pass builds, carrying the meaning for the
  // interface language and a tab stop — glossTips draws its card on hover, focus and tap. No
  // title: the browser drew that as a second tooltip on top of the card.
  function serialize(node, mode, lang) {
    let out = '';
    node.kids.forEach((k) => {
      if (k.text !== undefined) { out += escText(k.text); return; }
      out += serializeEl(k, mode, lang);
    });
    return out;
  }

  function attrString(el, mode, lang) {
    const a = el.attrs;
    let cls = a['class'] || '';
    if (mode === 'show' && isGloss(el)) {
      const meaning = (lang && a['data-gl-' + lang]) || a['data-gl']
        || LANGS.map((code) => a['data-gl-' + code]).filter(Boolean)[0] || '';
      cls = (cls + ' wb-gl').trim();
      return ' class="' + escAttr(cls) + '" data-gl="' + escAttr(meaning) + '" tabindex="0"';
    }
    let s = cls ? ' class="' + escAttr(cls) + '"' : '';
    if (a['data-gl']) s += ' data-gl="' + escAttr(a['data-gl']) + '"';
    LANGS.forEach((code) => {
      if (a['data-gl-' + code]) s += ' data-gl-' + code + '="' + escAttr(a['data-gl-' + code]) + '"';
    });
    if (a.src) s += ' src="' + escAttr(a.src) + '"';
    if (el.tag === 'img') s += ' alt="' + escAttr(a.alt || '') + '"';
    if (el.tag === 'img' && mode === 'show') s += ' loading="lazy"';
    return s;
  }

  function serializeEl(el, mode, lang) {
    if (el.tag === 'br') return '<br>';
    if (el.tag === 'hr') return '<hr>';
    if (el.tag === 'img') return '<img' + attrString(el, mode, lang) + '>';
    // A span that kept nothing is only a wrapper, and a formatting element around nothing is
    // noise the editor left behind when a selection was deleted.
    if (el.tag === 'span' && !el.attrs['class']) return serialize(el, mode, lang);
    if (!BLOCK[el.tag] && el.tag !== 'ruby' && !hasContent(el)) return serialize(el, mode, lang);
    return '<' + el.tag + attrString(el, mode, lang) + '>' + serialize(el, mode, lang) + '</' + el.tag + '>';
  }

  // The text a reader sees, which is what an overlay has to agree with: tags gone, entities
  // decoded, a line break for <br> and around a block, ruby annotations left out (the base
  // text is the sentence; the reading above it is help), pictures contribute nothing. Runs of
  // spaces inside a text node collapse the way the browser collapses them.
  function plainOf(node) {
    let out = '';
    const nl = () => { if (out && !/\n$/.test(out)) out += '\n'; };
    (function walk(n) {
      n.kids.forEach((k) => {
        if (k.text !== undefined) { out += k.text.replace(/[ \t\r\n\f]+/g, ' '); return; }
        if (k.tag === 'rt' || k.tag === 'rp' || k.tag === 'img') return;
        if (k.tag === 'br') { out += '\n'; return; }
        if (k.tag === 'hr') { nl(); return; }
        if (BLOCK[k.tag]) { nl(); walk(k); nl(); return; }
        walk(k);
      });
    }(node));
    return out.replace(/ *\n */g, '\n').replace(/^\n+|\n+$/g, '');
  }

  function sanitize(html) { return serialize(parse(html), 'store'); }
  function plain(html) { return plainOf(parse(html)); }
  function show(html, lang) { return serialize(parse(html), 'show', lang); }

  // Plain text as rich text: the starting point when a field is first formatted.
  function fromText(text) {
    return escText(String(text === null || text === undefined ? '' : text)).replace(/\r?\n/g, '<br>');
  }

  function norm(s) {
    const t = String(s === null || s === undefined ? '' : s);
    return (t.normalize ? t.normalize('NFC') : t).replace(/[\s ​   ]+/g, ' ').trim();
  }

  function matches(html, text) {
    return norm(plain(html)) === norm(text);
  }

  // Does this html carry any markup at all? Text that is only text needs no overlay.
  function isRich(html) {
    return /</.test(sanitize(html));
  }

  // ── Meanings written into the text ──────────────────────────────────────────
  // The hover meanings a formatted field carries, in reading order: the word each one explains,
  // `gl` (the English, or the only meaning) and one entry per language. The Designer's
  // Meanings tab lists them beside the glossary, and edits one through setGlossIn.
  function glossesIn(html) {
    const out = [];
    (function walk(n) {
      n.kids.forEach((k) => {
        if (k.text !== undefined) return;
        if (isGloss(k)) {
          const g = { word: plainOf(k).replace(/\s+/g, ' ').trim(), gl: k.attrs['data-gl'] || '' };
          LANGS.forEach((code) => { g[code] = k.attrs['data-gl-' + code] || ''; });
          out.push(g);
          return;
        }
        walk(k);
      });
    }(parse(html)));
    return out;
  }

  // The same html, stored form, with its k-th meaning changed: `m.gl` and `m[lang]` replace
  // what the word had ('' takes one away, a key left out keeps it). With no meaning left the
  // word is no longer glossed: the span goes, or keeps only the size or colour it also had.
  function setGlossIn(html, k, m) {
    const tree = parse(html);
    const want = m || {};
    let seen = -1;
    let done = false;
    (function walk(n) {
      for (let i = 0; i < n.kids.length && !done; i++) {
        const el = n.kids[i];
        if (el.text !== undefined) continue;
        if (!isGloss(el)) { walk(el); continue; }
        seen += 1;
        if (seen !== k) continue;
        done = true;
        const next = {};
        const put = (name, key) => {
          const t = cleanGlossText(want[key] !== undefined ? want[key] : el.attrs[name], LIMITS.gloss);
          delete el.attrs[name];
          if (t) next[name] = t;
        };
        put('data-gl', 'gl');
        LANGS.forEach((code) => put('data-gl-' + code, code));
        if (Object.keys(next).length) Object.assign(el.attrs, next);
        else {
          const cls = el.attrs['class'].split(' ').filter((c) => c !== 'hv-gl');
          if (cls.length) el.attrs['class'] = cls.join(' '); else delete el.attrs['class'];
        }
      }
    }(tree));
    return serialize(tree, 'store');
  }

  // ── Reading an overlay ──────────────────────────────────────────────────────
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

  function specOf(obj, name) {
    const f = isObj(obj) ? obj.fmt : null;
    const s = isObj(f) ? f[name] : null;
    return isObj(s) ? s : null;
  }

  // The formatted text to show for `text` in `lang`, or null when the overlay is out of date
  // or was never written.
  function inlineFor(spec, text, lang) {
    if (!spec) return null;
    if (lang && lang !== 'en' && typeof spec[lang] === 'string' && spec[lang] && matches(spec[lang], text)) return spec[lang];
    if (typeof spec.html === 'string' && spec.html && matches(spec.html, text)) return spec.html;
    return null;
  }

  // `noBox`: for a piece of a field drawn inside a card of its own (a paragraph of an exam
  // explanation), where a box around each piece would read as a box inside a box.
  function specClasses(spec, opts) {
    if (!spec) return '';
    const c = [];
    if (SIZES.indexOf(spec.size) >= 0) c.push('hv-sz-' + spec.size);
    if (ALIGNS.indexOf(spec.align) >= 0) c.push('hv-al-' + spec.align);
    if (COLORS.indexOf(spec.color) >= 0) c.push('hv-c-' + spec.color);
    if (FONTS.indexOf(spec.font) >= 0) c.push('hv-f-' + spec.font);
    if (spec.bold === true) c.push('hv-bold');
    if (spec.italic === true) c.push('hv-italic');
    if (BOXES.indexOf(spec.box) >= 0 && !(opts && opts.noBox)) c.push('hv-box', 'hv-box-' + spec.box);
    return c.length ? 'hv-fmt ' + c.join(' ') : '';
  }

  /**
   * HTML for one field, or null when the object carries no formatting for it — the caller
   * then escapes the text exactly as it always has, so an unformatted page renders byte for
   * byte as before.
   *
   *   field(item, 'why', tr(item, 'why'), { lang: 'vi', block: true })
   */
  function field(obj, name, shown, opts) {
    const spec = specOf(obj, name);
    if (!spec) return null;
    const o = opts || {};
    const text = shown === null || shown === undefined ? '' : String(shown);
    const inline = inlineFor(spec, text, o.lang);
    ensureFonts(inline ? [spec.font].concat(fontsIn(inline)) : [spec.font]);
    const body = inline !== null ? show(inline, o.lang) : escText(text);
    const cls = specClasses(spec);
    if (!cls) return body;
    const tag = o.block ? 'div' : 'span';
    return '<' + tag + ' class="' + cls + '">' + body + '</' + tag + '>';
  }

  /**
   * The same for a line with `{}` gaps in it: the pieces between the gaps, already HTML, and
   * the wrapper to put round the whole line once the blanks are back in. Null when the line
   * has no formatting. The pieces are unbalanced on their own — `<b>저는 ` and ` 좋아요</b>` —
   * and balanced again once joined, which is the only way they are ever used.
   */
  function fieldParts(obj, name, shown, opts) {
    const spec = specOf(obj, name);
    if (!spec) return null;
    const o = opts || {};
    const text = shown === null || shown === undefined ? '' : String(shown);
    const inline = inlineFor(spec, text, o.lang);
    ensureFonts(inline ? [spec.font].concat(fontsIn(inline)) : [spec.font]);
    let parts = (inline !== null ? show(inline, o.lang) : escText(text)).split('{}');
    // A gap the formatting cut in half — `{<b>}</b>` reads as {} and splits as nothing — would
    // lose a blank, so the line falls back to its plain text rather than lose one.
    if (parts.length !== text.split('{}').length) parts = escText(text).split('{}');
    const cls = specClasses(spec);
    return {
      parts,
      open: cls ? '<span class="' + cls + '">' : '',
      close: cls ? '</span>' : ''
    };
  }

  // A long explanation split where its writer left a blank line, as HTML — the exam view
  // shows the first paragraph as the thing to notice and folds the rest away. Null when the
  // field is not formatted, so the caller keeps splitting the plain text as it always has.
  function fieldParagraphs(obj, name, shown, opts) {
    const spec = specOf(obj, name);
    if (!spec) return null;
    const o = opts || {};
    const text = shown === null || shown === undefined ? '' : String(shown);
    const inline = inlineFor(spec, text, o.lang);
    if (inline === null) return null;
    ensureFonts(fontsIn(inline));
    return splitParas(parse(inline).kids)
      .map((seg) => ({ tag: '#root', attrs: {}, kids: seg }))
      .filter(hasContent)
      .map((node) => serialize(node, 'show', o.lang).replace(/^(?:<br>|\s)+|(?:<br>|\s)+$/g, ''))
      .filter(Boolean);
  }

  // The same paragraphs of plain text: split where the writer left a blank line (js/ui.js
  // wbWhyParagraphs is this rule too). The index of a paragraph means the same in both.
  function textParagraphs(text) {
    return String(text === null || text === undefined ? '' : text)
      .split(/\r?\n\s*\r?\n/).map((p) => p.trim()).filter(Boolean);
  }

  // A formatted field's paragraphs as stored html, for editing one of them on its own — the
  // pieces fieldParagraphs shows, before a hover meaning becomes its game form. Joining them
  // with a blank line (<br><br>) gives the field back.
  function paragraphsOf(html) {
    return splitParas(parse(html).kids)
      .map((seg) => ({ tag: '#root', attrs: {}, kids: seg }))
      .filter(hasContent)
      .map((node) => serialize(node, 'store').replace(/^(?:<br>|\s)+|(?:<br>|\s)+$/g, ''))
      .filter(Boolean);
  }

  // Paragraphs of a node list: a blank line (two breaks, nothing but spaces between them) or
  // a block element ends one. A formatting element that runs across a blank line — the whole
  // explanation selected and made bold — is split in two there, the way a browser splits a
  // <b> when a paragraph is broken inside it, so bolding everything does not fold the
  // reasoning into a single step.
  function splitParas(kids) {
    const paras = [[]];
    const cur = () => paras[paras.length - 1];
    for (let k = 0; k < kids.length; k++) {
      const node = kids[k];
      if (node.tag === 'br') {
        let j = k + 1;
        while (j < kids.length && kids[j].text !== undefined && !/\S/.test(kids[j].text)) j++;
        if (j < kids.length && kids[j].tag === 'br') {
          paras.push([]);
          k = j;
          while (k + 1 < kids.length && kids[k + 1].tag === 'br') k++;
          continue;
        }
        cur().push(node);
        continue;
      }
      if (node.tag === 'p') { paras.push(node.kids.slice()); paras.push([]); continue; }
      if (node.text === undefined && BLOCK[node.tag]) { paras.push([node]); paras.push([]); continue; }
      if (node.text === undefined && node.tag !== 'ruby') {
        const inner = splitParas(node.kids);
        if (inner.length > 1) {
          inner.forEach((seg, idx) => {
            if (idx > 0) paras.push([]);
            if (seg.length) cur().push({ tag: node.tag, attrs: node.attrs, kids: seg });
          });
          continue;
        }
      }
      cur().push(node);
    }
    return paras;
  }

  function fontsIn(html) {
    const out = [];
    String(html || '').replace(/hv-f-([a-z]+)/g, (m, f) => { if (out.indexOf(f) < 0) out.push(f); return m; });
    return out;
  }

  // Fetches a family the first time something on the page asks for it. A no-op outside a
  // browser, and on a page that has no <head> to put the link in.
  const fontsAsked = {};
  function ensureFonts(list) {
    if (typeof document === 'undefined' || !document || typeof document.createElement !== 'function') return;
    const head = document.head;
    if (!head || typeof head.appendChild !== 'function') return;
    (list || []).forEach((f) => {
      if (!f || !FONT_QUERY[f] || fontsAsked[f]) return;
      fontsAsked[f] = true;
      try {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=' + FONT_QUERY[f] + '&display=swap';
        link.setAttribute('data-hv-font', f);
        head.appendChild(link);
      } catch (e) { /* a page without fonts still reads */ }
    });
  }

  // ── The hover meaning's card ────────────────────────────────────────────────
  // A glossed word — .wb-gl in the game and the Designer's preview, .hv-gl in the admin's text
  // box — shows its meaning in a card: the word (and the dictionary form it is a shape of), then
  // the meaning as written, line breaks and all. Above the word, or below it when there is no
  // room above, and always inside the window: a CSS bubble was cut off by the scrolling panel
  // it sat in, and the title beside it made the browser draw the meaning a second time. Shown on
  // hover, on keyboard focus and on a tap, which keeps it open until the next tap elsewhere.
  // It starts by itself in any page this file is loaded into (the end of this file); css/rich.css
  // draws it, and css/game.css keeps the old bubble for a page it has not started in.
  const TIP_SEL = '.wb-gl, .hv-gl';

  // The inside of a meaning's card, for glossTips and for the admin's preview of it: the word,
  // the dictionary form it is a shape of when that differs, and each meaning — [{ text }], or
  // [{ lang, text }, …] labelled when there is more than one.
  function glossCardHtml(word, lines, head) {
    const w = String(word || '').replace(/\s+/g, ' ').trim();
    const h = String(head || '').trim();
    const list = (lines || []).filter((l) => l && String(l.text || '').trim());
    const tagged = list.length > 1;
    return '<div class="hv-gtip-word" lang="ko">' + escText(w)
      + (h && h !== w ? '<span class="hv-gtip-head">' + escText(h) + '</span>' : '') + '</div>'
      + list.map((l) => '<div class="hv-gtip-body' + (tagged ? ' hv-gtip-tagged' : '') + '"' + (l.lang ? ' lang="' + escAttr(l.lang) + '"' : '') + '>'
        + (tagged ? '<b class="hv-gtip-lang">' + escText(String(l.lang || '').toUpperCase()) + '</b><span>' + escText(l.text) + '</span>' : escText(l.text))
        + '</div>').join('')
      + '<i class="hv-gtip-arrow"></i>';
  }

  function glossTips(doc) {
    if (!doc || !doc.documentElement || typeof doc.addEventListener !== 'function' || doc.__hvGlossTips) return false;
    doc.__hvGlossTips = true;
    const win = doc.defaultView || (typeof window !== 'undefined' ? window : null);
    if (doc.documentElement.classList) doc.documentElement.classList.add('hv-gtip');
    let card = null;
    let shown = null;
    let hovered = null;
    let focused = null;
    let pinned = null;
    // Where the pointer last touched a word: one broken over two lines has two boxes, and the
    // card points at the one under the pointer.
    let point = null;

    const tipOf = (node) => {
      const t = node && node.nodeType === 1 ? node : (node && node.parentElement);
      return t && typeof t.closest === 'function' ? t.closest(TIP_SEL) : null;
    };
    const focusVisible = (el) => {
      try { return el.matches(':focus-visible'); } catch (e) { return true; }
    };
    // In the game a word carries the meaning for the interface language; in the admin's text
    // box it carries every language it was given, and the card shows each, labelled.
    function lines(el) {
      if (el.classList.contains('wb-gl')) {
        const m = el.getAttribute('data-gl');
        return m ? [{ text: m }] : [];
      }
      const out = [];
      LANGS.forEach((code) => {
        const m = el.getAttribute('data-gl-' + code);
        if (m) out.push({ lang: code, text: m });
      });
      const en = el.getAttribute('data-gl');
      if (en) out.push({ lang: 'en', text: en });
      return out;
    }
    function fill(el) {
      const list = lines(el);
      if (!list.length) return false;
      if (!card || !card.isConnected) {
        card = doc.createElement('div');
        card.className = 'hv-gtip-card';
        card.id = 'hv-gtip';
        card.setAttribute('role', 'tooltip');
        // Content, not interface: the admin's translation pass (and a browser's) leaves it be.
        card.setAttribute('translate', 'no');
        (doc.body || doc.documentElement).appendChild(card);
      }
      card.innerHTML = glossCardHtml(el.textContent, list, el.getAttribute('data-ko'));
      return true;
    }
    // Inside the window, and not scrolled out of (or folded inside) the panel the word sits in —
    // a card pointing at a word nobody can see would float over the panel's header.
    function inView(r, vw, vh) {
      if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) return false;
      if (!win || typeof win.getComputedStyle !== 'function') return true;
      for (let p = shown.parentElement; p && p !== doc.body && p !== doc.documentElement; p = p.parentElement) {
        const cs = win.getComputedStyle(p);
        if (!/auto|scroll|hidden|clip/.test(cs.overflowX + ' ' + cs.overflowY)) continue;
        const b = p.getBoundingClientRect();
        if (r.bottom <= b.top || r.top >= b.bottom || r.right <= b.left || r.left >= b.right) return false;
      }
      return true;
    }
    function place() {
      if (!shown || !card) return;
      const vw = doc.documentElement.clientWidth || (win && win.innerWidth) || 0;
      const vh = doc.documentElement.clientHeight || (win && win.innerHeight) || 0;
      const rects = Array.prototype.slice.call(shown.getClientRects());
      const away = (b) => (point ? Math.max(b.left - point.x, 0, point.x - b.right) + Math.max(b.top - point.y, 0, point.y - b.bottom) : 0);
      const r = rects.length ? rects.reduce((best, b) => (away(b) < away(best) ? b : best)) : shown.getBoundingClientRect();
      if (!inView(r, vw, vh)) { card.classList.remove('on'); return; }
      const cw = card.offsetWidth;
      const ch = card.offsetHeight;
      const gap = 9;
      const above = r.top - gap - 6;
      const below = vh - r.bottom - gap - 6;
      const flip = ch > above && below > above;
      const top = Math.max(6, Math.min(flip ? r.bottom + gap : r.top - gap - ch, vh - ch - 6));
      const mid = r.left + r.width / 2;
      const left = Math.max(6, Math.min(mid - cw / 2, vw - cw - 6));
      card.style.left = Math.round(left) + 'px';
      card.style.top = Math.round(top) + 'px';
      card.style.setProperty('--hv-ax', Math.round(Math.max(12, Math.min(mid - left, cw - 12))) + 'px');
      card.classList.toggle('below', flip);
      card.classList.add('on');
    }
    function release() {
      if (!shown) return;
      shown.classList.remove('hv-gl-on');
      shown.removeAttribute('aria-describedby');
      shown = null;
    }
    function hide() {
      release();
      if (card) card.classList.remove('on');
    }
    function update() {
      const el = [pinned, hovered, focused].find((x) => x && x.isConnected) || null;
      if (el === shown) { if (el) place(); return; }
      release();
      if (!el || !fill(el)) { hide(); return; }
      shown = el;
      el.classList.add('hv-gl-on');
      el.setAttribute('aria-describedby', 'hv-gtip');
      card.classList.remove('on');
      place();
    }
    function reset() { pinned = null; hovered = null; focused = null; hide(); }

    doc.addEventListener('mouseover', (ev) => {
      const g = tipOf(ev.target);
      if (g && !pinned) point = { x: ev.clientX, y: ev.clientY };
      if (g !== hovered) { hovered = g; update(); }
    }, true);
    doc.addEventListener('mouseout', (ev) => {
      if (hovered && !ev.relatedTarget) { hovered = null; update(); }
    }, true);
    // Keyboard focus only: a click focuses the word as well, and a click is handled below.
    doc.addEventListener('focusin', (ev) => {
      const g = tipOf(ev.target);
      focused = g && focusVisible(g) ? g : null;
      if (focused && !hovered && !pinned) point = null;
      update();
    }, true);
    doc.addEventListener('focusout', () => { if (focused) { focused = null; update(); } }, true);
    // A tap or a click keeps the card open; on the same word again, it lets go. In the admin's
    // text box a click is for placing the caret, so there the card only follows the pointer.
    doc.addEventListener('click', (ev) => {
      const g = tipOf(ev.target);
      const next = g && !g.isContentEditable && g !== pinned ? g : null;
      if (next) point = { x: ev.clientX, y: ev.clientY };
      if (next !== pinned) { pinned = next; update(); }
    }, true);
    // Escape closes the card first — the next one goes on to close the panel it sits in, as it
    // always did. Typing in the admin's text box puts it away too.
    doc.addEventListener('keydown', (ev) => {
      if (!shown) return;
      if (ev.key === 'Escape') {
        if (card && card.classList.contains('on')) ev.stopPropagation();
        reset();
      } else if (ev.target && ev.target.isContentEditable) reset();
    }, true);
    // A scroll — the page's, or the panel's — carries the card along with its word (a focus
    // moved by Tab scrolls the word into view first), and hides it while the word is out of sight.
    if (win && typeof win.addEventListener === 'function') {
      win.addEventListener('scroll', () => { if (shown) place(); }, true);
      win.addEventListener('resize', () => { if (shown) place(); });
    }
    // A page redrawn under the card (a check, the Designer's preview) takes its word away.
    if (win && typeof win.MutationObserver === 'function') {
      try {
        const mo = new win.MutationObserver(() => { if (shown && !shown.isConnected) reset(); });
        if (typeof mo.observe === 'function') mo.observe(doc.documentElement, { childList: true, subtree: true });
      } catch (e) { /* the card then goes with the next move of the pointer */ }
    }
    return true;
  }

  // ── Page design ─────────────────────────────────────────────────────────────
  // A bank's design is the default for each of its pages; a page's own design wins field by
  // field. Glossaries merge (the page's entry for a word beats the bank's) and so do the
  // hidden words. Blocks do not inherit: a bank's blocks belong to its list page.
  function mergeDesign(bankDesign, exDesign) {
    const b = isObj(bankDesign) ? bankDesign : {};
    const e = isObj(exDesign) ? exDesign : {};
    if (!Object.keys(b).length && !Object.keys(e).length) return null;
    const out = {};
    ['theme', 'width', 'scale', 'cols', 'font', 'density', 'glossMode'].forEach((k) => {
      if (e[k] !== undefined) out[k] = e[k];
      else if (b[k] !== undefined) out[k] = b[k];
    });
    const gloss = new Map();
    [b.glossary, e.glossary].forEach((list) => {
      (Array.isArray(list) ? list : []).forEach((g) => {
        if (isObj(g) && typeof g.ko === 'string' && g.ko.trim()) gloss.set(g.ko.trim(), g);
      });
    });
    out.glossary = Array.from(gloss.values());
    const hide = new Set();
    [b.glossHide, e.glossHide].forEach((list) => {
      (Array.isArray(list) ? list : []).forEach((w) => { if (typeof w === 'string' && w.trim()) hide.add(w.trim()); });
    });
    out.glossHide = Array.from(hide);
    out.blocks = Array.isArray(e.blocks) ? e.blocks : [];
    return out;
  }

  function designClasses(d) {
    if (!isObj(d)) return [];
    const c = [];
    if (THEMES.indexOf(d.theme) > 0) c.push('hv-theme', 'hv-theme-' + d.theme);
    if (WIDTHS.indexOf(d.width) >= 0 && d.width !== 'normal') c.push('hv-w-' + d.width);
    if (FONTS.indexOf(d.font) > 0) c.push('hv-font-' + d.font);
    if (DENSITIES.indexOf(d.density) >= 0 && d.density !== 'normal') c.push('hv-dens-' + d.density);
    if (d.cols === 2 || d.cols === 3) c.push('hv-cols-' + d.cols);
    if (typeof d.scale === 'number' && d.scale !== 1) c.push('hv-scaled');
    return c;
  }

  function designScale(d) {
    return isObj(d) && typeof d.scale === 'number' && isFinite(d.scale) ? d.scale : 1;
  }

  // The hover meanings a design adds, for the interface language: [{ ko, gloss }].
  function glossEntries(d, lang) {
    if (!isObj(d) || !Array.isArray(d.glossary)) return [];
    return d.glossary.map((g) => {
      const meaning = (lang && lang !== 'en' && typeof g[lang] === 'string' && g[lang].trim()) ? g[lang]
        : (g.gl || LANGS.map((code) => g[code]).filter((m) => typeof m === 'string' && m.trim())[0]);
      return { ko: String(g.ko || '').trim(), gloss: String(meaning || '').trim() };
    }).filter((g) => g.ko && g.gloss);
  }

  function glossMode(d) {
    return isObj(d) && GLOSS_MODES.indexOf(d.glossMode) >= 0 ? d.glossMode : 'checked';
  }

  function blockVisible(b, checked) {
    const when = WHEN.indexOf(b.when) >= 0 ? b.when : 'always';
    if (b.at === 'explain') return !!checked;
    if (when === 'checked') return !!checked;
    if (when === 'unchecked') return !checked;
    return true;
  }

  function localized(b, key, lang) {
    const loc = lang && lang !== 'en' && isObj(b[lang]) ? b[lang] : null;
    if (loc && typeof loc[key] === 'string' && loc[key].trim()) return loc[key];
    if (typeof b[key] === 'string' && b[key].trim()) return b[key];
    // Written in Vietnamese first and not yet given its English (enTodo on the block): the
    // Vietnamese stands in rather than leaving the box empty.
    for (let i = 0; i < LANGS.length; i++) {
      const other = b[LANGS[i]];
      if (isObj(other) && typeof other[key] === 'string' && other[key].trim()) return other[key];
    }
    return '';
  }

  function blockHtml(b, o) {
    if (!isObj(b)) return '';
    const lang = o.lang;
    const align = ALIGNS.indexOf(b.align) >= 0 ? ' hv-al-' + b.align : '';
    if (b.kind === 'divider') {
      const style = DIVIDERS.indexOf(b.style) >= 0 ? b.style : 'line';
      return '<hr class="hv-block hv-divider hv-divider-' + style + '">';
    }
    if (b.kind === 'image') {
      const src = cleanSrc(b.src);
      if (!src) return '';
      const frame = FRAMES.indexOf(b.frame) >= 0 ? b.frame : 'none';
      const width = typeof b.width === 'number' && b.width >= 10 && b.width <= 100 ? b.width : 100;
      const caption = localized(b, 'caption', lang);
      return '<figure class="hv-block hv-block-img hv-frame-' + frame + (align || ' hv-al-center') + '"'
        + ' style="--hv-w:' + width + '%">'
        + '<img src="' + escAttr(src) + '" alt="' + escAttr(localized(b, 'alt', lang)) + '" loading="lazy">'
        + (caption ? '<figcaption>' + escText(caption) + '</figcaption>' : '')
        + '</figure>';
    }
    const html = localized(b, 'html', lang);
    const heading = localized(b, 'heading', lang);
    const icon = typeof b.icon === 'string' ? b.icon : '';
    const src = cleanSrc(b.src);
    ensureFonts([b.font].concat(fontsIn(html)));
    const cls = ['hv-block', 'hv-block-text'];
    if (BOXES.indexOf(b.box) >= 0) cls.push('hv-box', 'hv-box-' + b.box);
    if (SIZES.indexOf(b.size) >= 0) cls.push('hv-sz-' + b.size);
    if (ALIGNS.indexOf(b.align) >= 0) cls.push('hv-al-' + b.align);
    if (COLORS.indexOf(b.color) >= 0) cls.push('hv-c-' + b.color);
    if (FONTS.indexOf(b.font) >= 0) cls.push('hv-f-' + b.font);
    if (b.cols === 2) cls.push('hv-textcols-2');
    if (src) cls.push('hv-side-' + (SIDES.indexOf(b.side) >= 0 ? b.side : 'left'));
    const pic = src
      ? '<img class="hv-block-pic" src="' + escAttr(src) + '" alt="' + escAttr(localized(b, 'alt', lang)) + '" loading="lazy"'
        + (typeof b.width === 'number' && b.width >= 10 && b.width <= 100 ? ' style="--hv-w:' + b.width + '%"' : '') + '>'
      : '';
    const head = (heading || icon)
      ? '<div class="hv-block-head">' + (icon ? '<span class="hv-block-icon">' + escText(icon) + '</span>' : '')
        + (heading ? '<span class="hv-block-title">' + escText(heading) + '</span>' : '') + '</div>'
      : '';
    return '<div class="' + cls.join(' ') + '">' + pic
      + '<div class="hv-block-body">' + head + '<div class="hv-block-content">' + show(html, lang) + '</div></div>'
      + '</div>';
  }

  /**
   * The blocks a design places at one anchor, as HTML ('' when there are none).
   *
   *   blocksHtml(design.blocks, 'top', { lang: 'vi', checked: false })
   */
  function blocksHtml(blocks, anchor, opts) {
    const o = opts || {};
    if (!Array.isArray(blocks) || !blocks.length) return '';
    return blocks.filter((b) => isObj(b) && b.at === anchor && blockVisible(b, o.checked))
      .map((b) => blockHtml(b, o)).join('');
  }

  // ── Validation ──────────────────────────────────────────────────────────────
  // What the admin validators run on save, and what scripts/validate_content.js runs on every
  // file. Each returns the cleaned value (or undefined when nothing is left) and throws with
  // the place and the reason. Unknown keys are refused rather than dropped: a validator that
  // quietly drops what it does not recognise is how this repo has lost fields before.
  function fail(where, msg) { throw new Error(where + ': ' + msg); }

  function pickFrom(list, v, where, what) {
    if (v === undefined || v === null || v === '') return undefined;
    if (list.indexOf(v) < 0) fail(where, what + ' must be one of ' + list.join(', ') + ' (got "' + v + '")');
    return v;
  }

  function onlyKeys(obj, allowed, where) {
    Object.keys(obj).forEach((k) => {
      if (allowed.indexOf(k) < 0) fail(where, 'unknown setting "' + k + '"');
    });
  }

  function cleanHtml(v, where, what) {
    if (v === undefined || v === null || v === '') return '';
    if (typeof v !== 'string') fail(where, what + ' must be a string');
    if (v.length > LIMITS.html) fail(where, what + ' is longer than ' + LIMITS.html + ' characters');
    return sanitize(v);
  }

  const SPEC_KEYS = ['html', 'size', 'align', 'box', 'color', 'font', 'bold', 'italic'].concat(LANGS);
  // "*" formats the object as a whole — a question row's box — and so has no text of its own.
  const WHOLE_KEYS = ['size', 'align', 'box', 'color', 'font', 'bold', 'italic'];

  function cleanStyle(spec, out, where) {
    const size = pickFrom(SIZES, spec.size, where, 'size');
    if (size) out.size = size;
    const align = pickFrom(ALIGNS, spec.align, where, 'align');
    if (align) out.align = align;
    const box = pickFrom(BOXES, spec.box, where, 'box');
    if (box) out.box = box;
    const color = pickFrom(COLORS, spec.color, where, 'color');
    if (color) out.color = color;
    const font = pickFrom(FONTS, spec.font, where, 'font');
    if (font) out.font = font;
    if (spec.bold === true) out.bold = true;
    if (spec.italic === true) out.italic = true;
    return out;
  }

  /** One field's overlay, checked against the text it formats. */
  function cleanSpec(spec, text, where) {
    if (!isObj(spec)) fail(where, 'formatting must be an object');
    onlyKeys(spec, SPEC_KEYS, where);
    const out = {};
    const html = cleanHtml(spec.html, where, 'the formatted text');
    if (html && /</.test(html)) {
      if (!matches(html, text)) {
        fail(where, 'the formatted text no longer reads the same as the text itself — '
          + 'open it in the Designer and format it again');
      }
      if (html.split('{}').length !== String(text).split('{}').length) {
        fail(where, 'the formatting splits a {} blank in two — keep each {} whole');
      }
      out.html = html;
    }
    LANGS.forEach((code) => {
      const h = cleanHtml(spec[code], where, 'the ' + code + ' formatting');
      if (h && /</.test(h) && plain(h).trim()) out[code] = h;
    });
    cleanStyle(spec, out, where);
    return Object.keys(out).length ? out : undefined;
  }

  /**
   * An object's `fmt`, against the object's own (already cleaned) strings. Returns undefined
   * when nothing survives, so the caller can leave the key off entirely.
   */
  function cleanFmt(fmt, obj, where) {
    if (fmt === undefined || fmt === null) return undefined;
    if (!isObj(fmt)) fail(where, 'fmt must be an object');
    const out = {};
    Object.keys(fmt).forEach((k) => {
      const at = where + ' fmt.' + k;
      if (k === '*') {
        if (!isObj(fmt[k])) fail(at, 'formatting must be an object');
        onlyKeys(fmt[k], WHOLE_KEYS, at);
        const whole = cleanStyle(fmt[k], {}, at);
        if (Object.keys(whole).length) out[k] = whole;
        return;
      }
      if (!isObj(obj) || typeof obj[k] !== 'string') fail(at, 'formats a field this entry does not have');
      const spec = cleanSpec(fmt[k], obj[k], at);
      if (spec) out[k] = spec;
    });
    return Object.keys(out).length ? out : undefined;
  }

  function cleanPlainText(v, max, where, what) {
    if (v === undefined || v === null) return '';
    if (typeof v !== 'string') fail(where, what + ' must be a string');
    const t = v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();
    if (t.length > max) fail(where, what + ' is longer than ' + max + ' characters');
    return t;
  }

  function cleanNumber(v, lo, hi, step, where, what) {
    if (v === undefined || v === null || v === '') return undefined;
    const n = Number(v);
    if (!isFinite(n) || n < lo || n > hi) fail(where, what + ' must be between ' + lo + ' and ' + hi + ' (got "' + v + '")');
    // Snapped to the step, then rounded again so 22 × 0.05 is written 1.1 and not 1.1000000000000001.
    return Math.round(Math.round(n / step) * step * 1000) / 1000;
  }

  const BLOCK_KEYS = ['id', 'kind', 'at', 'when', 'html', 'heading', 'icon', 'box', 'size', 'align', 'color', 'font',
    'cols', 'src', 'side', 'alt', 'caption', 'width', 'frame', 'style', 'enTodo', 'enAI'].concat(LANGS);

  // A block written in Vietnamese first (admin/public/js/viFirst.js): which of its texts still
  // need their English (enTodo), and which English Claude wrote that nobody has read (enAI).
  function cleanBlockLists(b, out, at, keys) {
    ['enTodo', 'enAI'].forEach((name) => {
      if (b[name] === undefined || b[name] === null) return;
      if (!Array.isArray(b[name])) fail(at, name + ' must be a list');
      const items = [];
      b[name].forEach((k) => {
        if (keys.indexOf(k) < 0) fail(at, name + ' names "' + k + '", which this block does not have');
        if (items.indexOf(k) < 0) items.push(k);
      });
      if (items.length) out[name] = items;
    });
    return out;
  }

  function cleanBlock(b, i, where, anchors, ids) {
    const at = where + ' block ' + (i + 1);
    if (!isObj(b)) fail(at, 'must be an object');
    onlyKeys(b, BLOCK_KEYS, at);
    const kind = pickFrom(BLOCK_KINDS, b.kind, at, 'kind') || 'text';
    const anchor = b.at === undefined || b.at === '' ? anchors[0] : b.at;
    if (anchors.indexOf(anchor) < 0) fail(at, 'at must be one of ' + anchors.join(', ') + ' (got "' + b.at + '")');
    let id = typeof b.id === 'string' ? b.id.trim() : '';
    if (id && !/^[A-Za-z0-9_-]{1,32}$/.test(id)) fail(at, 'id may use letters, digits, - and _ (got "' + id + '")');
    if (!id || ids.has(id)) { let k = i + 1; while (ids.has('b' + k)) k++; id = 'b' + k; }
    ids.add(id);
    const out = { id, kind, at: anchor };
    const when = pickFrom(WHEN, b.when, at, 'when');
    if (when && when !== 'always') out.when = when;
    const lang = {};
    const src = b.src === undefined || b.src === null || b.src === '' ? '' : cleanSrc(b.src);
    if ((b.src !== undefined && b.src !== null && b.src !== '') && !src) {
      fail(at, 'a picture must be a file under media/ or sprites/ (got "' + b.src + '")');
    }
    if (kind === 'divider') {
      const style = pickFrom(DIVIDERS, b.style, at, 'style');
      if (style && style !== 'line') out.style = style;
      return out;
    }
    if (kind === 'image') {
      if (!src) fail(at, 'an image block needs a picture');
      out.src = src;
      const alt = cleanPlainText(b.alt, LIMITS.alt, at, 'the description');
      if (alt) out.alt = alt;
      const caption = cleanPlainText(b.caption, LIMITS.caption, at, 'the caption');
      if (caption) out.caption = caption;
      const width = cleanNumber(b.width, 10, 100, 5, at, 'width');
      if (width !== undefined && width !== 100) out.width = width;
      const align = pickFrom(ALIGNS, b.align, at, 'align');
      if (align && align !== 'center') out.align = align;
      const frame = pickFrom(FRAMES, b.frame, at, 'frame');
      if (frame && frame !== 'none') out.frame = frame;
      LANGS.forEach((code) => {
        if (b[code] === undefined || b[code] === null) return;
        if (!isObj(b[code])) fail(at, code + ' must be an object');
        onlyKeys(b[code], ['caption', 'alt'], at + ' ' + code);
        const l = {};
        const c = cleanPlainText(b[code].caption, LIMITS.caption, at, 'the ' + code + ' caption');
        if (c) l.caption = c;
        const a = cleanPlainText(b[code].alt, LIMITS.alt, at, 'the ' + code + ' description');
        if (a) l.alt = a;
        if (Object.keys(l).length) lang[code] = l;
      });
      Object.keys(lang).forEach((code) => { out[code] = lang[code]; });
      return cleanBlockLists(b, out, at, ['caption', 'alt']);
    }
    const html = cleanHtml(b.html, at, 'the text');
    const heading = cleanPlainText(b.heading, LIMITS.heading, at, 'the heading');
    // Text in any language counts: a block written in Vietnamese first has no English yet.
    const anyText = (h) => !!(h && (plain(h).trim() || /<img/.test(h)));
    const otherText = LANGS.some((code) => isObj(b[code])
      && (anyText(cleanHtml(b[code].html, at, 'the ' + code + ' text')) || cleanPlainText(b[code].heading, LIMITS.heading, at, 'the heading')));
    if (!src && !heading && !anyText(html) && !otherText) {
      fail(at, 'a text block needs some text, a heading or a picture');
    }
    if (html) out.html = html;
    if (heading) out.heading = heading;
    const icon = cleanPlainText(b.icon, LIMITS.icon, at, 'the icon');
    if (icon) out.icon = icon;
    cleanStyle(b, out, at);
    delete out.bold;
    delete out.italic;
    const cols = cleanNumber(b.cols, 1, 2, 1, at, 'cols');
    if (cols === 2) out.cols = 2;
    if (src) {
      out.src = src;
      const side = pickFrom(SIDES, b.side, at, 'side');
      if (side && side !== 'left') out.side = side;
      const alt = cleanPlainText(b.alt, LIMITS.alt, at, 'the description');
      if (alt) out.alt = alt;
      const width = cleanNumber(b.width, 10, 100, 5, at, 'width');
      if (width !== undefined) out.width = width;
    }
    LANGS.forEach((code) => {
      if (b[code] === undefined || b[code] === null) return;
      if (!isObj(b[code])) fail(at, code + ' must be an object');
      onlyKeys(b[code], ['html', 'heading', 'alt'], at + ' ' + code);
      const l = {};
      const h = cleanHtml(b[code].html, at, 'the ' + code + ' text');
      if (h && (plain(h).trim() || /<img/.test(h))) l.html = h;
      const hd = cleanPlainText(b[code].heading, LIMITS.heading, at, 'the ' + code + ' heading');
      if (hd) l.heading = hd;
      const a = cleanPlainText(b[code].alt, LIMITS.alt, at, 'the ' + code + ' description');
      if (a) l.alt = a;
      if (Object.keys(l).length) out[code] = l;
    });
    return cleanBlockLists(b, out, at, ['html', 'heading', 'alt']);
  }

  const DESIGN_KEYS = ['theme', 'width', 'scale', 'cols', 'font', 'density', 'glossMode', 'glossary', 'glossHide', 'blocks'];

  /**
   * A page's or a bank's `design`. `opts.level` is 'exercise' (the default) or 'bank'; the two
   * differ only in where blocks may go.
   */
  function cleanDesign(d, where, opts) {
    if (d === undefined || d === null) return undefined;
    const at = where + ' design';
    if (!isObj(d)) fail(at, 'must be an object');
    onlyKeys(d, DESIGN_KEYS, at);
    const level = (opts && opts.level) || 'exercise';
    const out = {};
    const theme = pickFrom(THEMES, d.theme, at, 'theme');
    if (theme) out.theme = theme;
    const width = pickFrom(WIDTHS, d.width, at, 'width');
    if (width) out.width = width;
    const scale = cleanNumber(d.scale, 0.8, 1.6, 0.05, at, 'scale');
    if (scale !== undefined && scale !== 1) out.scale = scale;
    const cols = cleanNumber(d.cols, 1, 3, 1, at, 'cols');
    if (cols !== undefined && cols !== 1) out.cols = cols;
    const font = pickFrom(FONTS, d.font, at, 'font');
    if (font) out.font = font;
    const density = pickFrom(DENSITIES, d.density, at, 'density');
    if (density) out.density = density;
    const mode = pickFrom(GLOSS_MODES, d.glossMode, at, 'glossMode');
    if (mode) out.glossMode = mode;
    if (d.glossary !== undefined && d.glossary !== null) {
      if (!Array.isArray(d.glossary)) fail(at, 'glossary must be a list');
      if (d.glossary.length > LIMITS.glossary) fail(at, 'glossary holds at most ' + LIMITS.glossary + ' words');
      const seen = new Set();
      const list = d.glossary.map((g, k) => {
        const gat = at + ' glossary ' + (k + 1);
        if (!isObj(g)) fail(gat, 'must be an object');
        onlyKeys(g, ['ko', 'gl'].concat(LANGS), gat);
        const ko = cleanPlainText(g.ko, LIMITS.glossKo, gat, 'the word');
        if (!ko) fail(gat, 'needs the word it explains');
        // The automatic pass keeps to two characters for the same reason: one syllable matches
        // inside half the words on the page. A single syllable is glossed in the text itself.
        if (ko.length < 2) {
          fail(gat, '"' + ko + '" is one character, and would light up inside every longer word — '
            + 'select it in the text and give it a meaning there instead');
        }
        if (seen.has(ko)) fail(gat, '"' + ko + '" is in the glossary twice');
        seen.add(ko);
        // The English meaning or a Vietnamese one: a word explained in Vietnamese alone shows
        // that in English mode too, until someone writes the English.
        const gl = cleanPlainText(g.gl, LIMITS.gloss, gat, 'the meaning');
        const entry = { ko };
        if (gl) entry.gl = gl;
        LANGS.forEach((code) => {
          const m = cleanPlainText(g[code], LIMITS.gloss, gat, 'the ' + code + ' meaning');
          if (m) entry[code] = m;
        });
        if (Object.keys(entry).length < 2) fail(gat, '"' + ko + '" needs a meaning');
        return entry;
      });
      if (list.length) out.glossary = list;
    }
    if (d.glossHide !== undefined && d.glossHide !== null) {
      if (!Array.isArray(d.glossHide)) fail(at, 'glossHide must be a list');
      if (d.glossHide.length > LIMITS.glossHide) fail(at, 'glossHide holds at most ' + LIMITS.glossHide + ' words');
      const hide = [];
      d.glossHide.forEach((w, k) => {
        const t = cleanPlainText(w, LIMITS.glossKo, at + ' glossHide ' + (k + 1), 'the word');
        if (t && hide.indexOf(t) < 0) hide.push(t);
      });
      if (hide.length) out.glossHide = hide;
    }
    if (d.blocks !== undefined && d.blocks !== null) {
      if (!Array.isArray(d.blocks)) fail(at, 'blocks must be a list');
      if (d.blocks.length > LIMITS.blocks) fail(at, 'a page holds at most ' + LIMITS.blocks + ' blocks');
      const ids = new Set();
      const anchors = level === 'bank' ? BANK_ANCHORS : ANCHORS;
      const blocks = d.blocks.map((b, k) => cleanBlock(b, k, at, anchors, ids));
      if (blocks.length) out.blocks = blocks;
    }
    return Object.keys(out).length ? out : undefined;
  }

  // Every picture a design or an overlay points at, for the check that the file exists.
  function mediaIn(value) {
    const out = [];
    const add = (s) => { const c = cleanSrc(s); if (c && out.indexOf(c) < 0) out.push(c); };
    (function walk(v, key) {
      if (typeof v === 'string') {
        if (key === 'src') add(v);
        else if (/<img/i.test(v)) v.replace(/<img[^>]*\ssrc="([^"]*)"/gi, (m, s) => { add(decode(s)); return m; });
        return;
      }
      if (Array.isArray(v)) { v.forEach((x) => walk(x, key)); return; }
      if (isObj(v)) Object.keys(v).forEach((k) => walk(v[k], k));
    }(value, ''));
    return out;
  }

  // Any page this file is loaded into: its glossed words get their card.
  try {
    if (typeof document !== 'undefined' && document) glossTips(document);
  } catch (e) { /* no card; the words still read */ }

  return {
    // vocabulary
    SIZES, COLORS, HIGHLIGHTS, BOXES, ALIGNS, FONTS, THEMES, WIDTHS, DENSITIES, GLOSS_MODES,
    ANCHORS, BANK_ANCHORS, BLOCK_KINDS, FRAMES, SIDES, DIVIDERS, WHEN, IMG_SIZES, LANGS,
    FONT_FAMILIES, LIMITS,
    // text
    esc, escText, escAttr, decode, sanitize, plain, show, fromText, norm, matches, isRich,
    cleanSrc, parse, glossesIn, setGlossIn,
    // reading overlays
    specOf, inlineFor, specClasses, field, fieldParts, fieldParagraphs, textParagraphs, paragraphsOf,
    ensureFonts, fontsIn, glossTips, glossCardHtml,
    // design
    mergeDesign, designClasses, designScale, glossEntries, glossMode, blocksHtml, blockHtml,
    blockVisible,
    // validation
    cleanSpec, cleanFmt, cleanDesign, cleanBlock, mediaIn
  };
}));
