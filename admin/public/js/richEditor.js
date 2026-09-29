/**
 * The rich text box the Designer edits a field with — window.HVRichEditor.
 *
 * It edits HTML, but only ever hands back what js/richText.js would save: every change is run
 * through HVRich.sanitize, so what the editor shows is what the page will show. The plain text
 * comes from HVRich.plain of that HTML, and the Designer writes it back to the field only when
 * the words themselves changed — formatting alone never touches the text a translation or a
 * recording is keyed by.
 *
 * Bold, italic, underline, strike, sub/superscript and lists use the browser's own editing
 * commands, whose output the sanitizer normalises. Size, colour, highlight, font, meanings and
 * readings are spans this file wraps itself, because the browser has no command that writes a
 * class and the ones it has write inline styles the sanitizer would strip.
 *
 * Two modes guard the text:
 *   keepBlanks — a line with {} gaps. Each {} is drawn as a single locked token, and an edit
 *                that would remove or add one is undone: the blanks belong to the question.
 *   lockText   — formatting only, for the Vietnamese overlay on an English field. The
 *                translation is edited in the Translate tab; here it can only be styled.
 */
(function () {
  'use strict';

  const R = () => window.HVRich;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const SIZE_LABEL = { xs: 'Tiny', sm: 'Small', md: 'Normal', lg: 'Large', xl: 'Larger', xxl: 'Huge' };
  const COLOR_HEX = {
    ink: '#1a1208', brown: '#7a3e12', red: '#b91c1c', orange: '#c2410c', green: '#15803d',
    teal: '#0f766e', blue: '#1d4ed8', purple: '#7e22ce', pink: '#be185d', gray: '#57534e'
  };
  const HL_HEX = { yellow: '#fde68a', green: '#bbf7d0', blue: '#bfdbfe', pink: '#fbcfe8', orange: '#fed7aa', purple: '#e9d5ff' };
  const FONT_LABEL = { sans: 'Sans (default)', serif: 'Serif 명조', hand: 'Handwriting', round: 'Rounded', display: 'Display', mono: 'Mono' };
  const FONT_CSS = {
    sans: "'Noto Sans KR', sans-serif", serif: "'Nanum Myeongjo', serif", hand: "'Gaegu', cursive",
    round: "'Gowun Dodum', sans-serif", display: "'Do Hyeon', sans-serif", mono: "'Nanum Gothic Coding', monospace"
  };

  function create(host, opts) {
    const o = Object.assign({ html: '', text: '', multiline: true, keepBlanks: false, lockText: false, assetBase: '/' }, opts || {});
    const root = document.createElement('div');
    root.className = 'hre' + (o.lockText ? ' hre-locked' : '');
    root.innerHTML = toolbarHtml(o) + '<div class="hre-area hv-fmt" contenteditable="true" spellcheck="false"></div>'
      + '<div class="hre-pop hidden"></div><div class="hre-msg"></div>';
    host.appendChild(root);
    const area = root.querySelector('.hre-area');
    const pop = root.querySelector('.hre-pop');
    const msg = root.querySelector('.hre-msg');
    if (o.lang) area.setAttribute('lang', o.lang === 'ko' ? 'ko' : o.lang);
    if (o.placeholder) area.setAttribute('data-placeholder', o.placeholder);

    let blanks = 0;
    let lastGood = '';
    let savedRange = null;

    // ── Loading and reading back ───────────────────────────────────────────────
    function load(html, text) {
      const rich = R();
      const src = html && rich.isRich(html) ? rich.sanitize(html) : rich.fromText(text || rich.plain(html || ''));
      area.innerHTML = src;
      decorate(area);
      blanks = countBlanks(rich.plain(src));
      lastGood = read();
    }

    // Pictures point at the game's files, which the admin page is not beside; each {} becomes
    // one locked token so a selection can never cut it in half.
    function decorate(node) {
      node.querySelectorAll('img').forEach((img) => {
        const src = img.getAttribute('data-hv-src') || img.getAttribute('src') || '';
        img.setAttribute('data-hv-src', src);
        img.setAttribute('src', o.assetBase + src);
      });
      if (!o.keepBlanks) return;
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
      const hits = [];
      let t;
      while ((t = walker.nextNode())) {
        if (t.parentElement && t.parentElement.closest('.hre-blank')) continue;
        if (t.nodeValue.indexOf('{}') >= 0) hits.push(t);
      }
      hits.forEach((tn) => {
        const parts = tn.nodeValue.split('{}');
        const frag = document.createDocumentFragment();
        parts.forEach((p, i) => {
          if (i > 0) frag.appendChild(blankToken());
          if (p) frag.appendChild(document.createTextNode(p));
        });
        tn.parentNode.replaceChild(frag, tn);
      });
    }

    function blankToken() {
      const s = document.createElement('span');
      s.className = 'hre-blank';
      s.setAttribute('contenteditable', 'false');
      s.textContent = '{}';
      return s;
    }

    function read() {
      const clone = area.cloneNode(true);
      clone.querySelectorAll('img').forEach((img) => {
        img.setAttribute('src', img.getAttribute('data-hv-src') || '');
        img.removeAttribute('data-hv-src');
      });
      return R().sanitize(clone.innerHTML);
    }

    function countBlanks(text) { return String(text || '').split('{}').length - 1; }

    function say(text, kind) {
      msg.textContent = text || '';
      msg.className = 'hre-msg' + (text ? ' show ' + (kind || 'warn') : '');
      if (text) { clearTimeout(say.t); say.t = setTimeout(() => say(''), 4200); }
    }

    // Every change lands here. An edit that broke a guard is put back as it was.
    function changed() {
      const html = read();
      const rich = R();
      const text = rich.plain(html);
      if (o.keepBlanks && countBlanks(text) !== blanks) {
        restore();
        say('Each {} is a blank the learner fills. Change blanks in the Question tab, not here.');
        return;
      }
      if (o.lockText && rich.norm(text) !== rich.norm(o.text)) {
        restore();
        say('This is Claude’s English — style it here; to change its words, change the Vietnamese.');
        return;
      }
      lastGood = html;
      if (typeof o.onChange === 'function') o.onChange({ html, text });
    }

    function restore() {
      area.innerHTML = lastGood;
      decorate(area);
      placeCaretAtEnd();
    }

    function placeCaretAtEnd() {
      const r = document.createRange();
      r.selectNodeContents(area);
      r.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
    }

    // ── Selection ──────────────────────────────────────────────────────────────
    function range() {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return null;
      const r = sel.getRangeAt(0);
      return area.contains(r.commonAncestorContainer) ? r : null;
    }
    function remember() { const r = range(); if (r) savedRange = r.cloneRange(); }
    function recall() {
      if (!savedRange) return range();
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange);
      return savedRange;
    }

    function selectNode(node) {
      const r = document.createRange();
      r.selectNodeContents(node);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
      savedRange = r.cloneRange();
    }

    // Drop classes starting with `prefix` inside a fragment, unwrapping spans left with none.
    function strip(frag, prefix) {
      frag.querySelectorAll('span, mark').forEach((el) => {
        const keep = String(el.className || '').split(/\s+/).filter((c) => c && c.indexOf(prefix) !== 0);
        if (el.tagName === 'MARK' && prefix === 'hv-hl-') { unwrap(el); return; }
        if (keep.length) el.className = keep.join(' ');
        else if (!el.classList.contains('hre-blank') && !el.classList.contains('hv-gl')) unwrap(el);
        else el.removeAttribute('class');
      });
    }
    function unwrap(el) {
      const p = el.parentNode;
      if (!p) return;
      while (el.firstChild) p.insertBefore(el.firstChild, el);
      p.removeChild(el);
    }

    // Take the selection out of the elements around it that `match`: each is split in two where
    // the selection starts and ends, the pieces before and after keep it, and the selection
    // leaves it — keeping only the classes `keep` returns, or none. Without this, a word picked
    // inside a red run could not lose its red: what was taken out and put back went straight
    // back inside the same red span. Markers hold the selection's ends through the surgery.
    function liftOut(r, match, keep) {
      const m1 = document.createElement('span');
      const m2 = document.createElement('span');
      const endAt = r.cloneRange(); endAt.collapse(false); endAt.insertNode(m2);
      const startAt = r.cloneRange(); startAt.collapse(true); startAt.insertNode(m1);
      for (let guard = 0; guard < 16; guard++) {
        let anc = m1.parentElement;
        while (anc && anc !== area && !(match(anc) && anc.contains(m2))) anc = anc.parentElement;
        if (!anc || anc === area || !area.contains(anc)) break;
        const parent = anc.parentNode;
        const left = document.createRange();
        left.setStart(anc, 0); left.setEndBefore(m1);
        const leftFrag = left.extractContents();
        const right = document.createRange();
        right.setStartAfter(m2); right.setEnd(anc, anc.childNodes.length);
        const rightFrag = right.extractContents();
        const before = anc.cloneNode(false); before.appendChild(leftFrag);
        const after = anc.cloneNode(false); after.appendChild(rightFrag);
        const cls = keep ? keep(anc) : '';
        parent.insertBefore(before, anc);
        if (cls) {
          const mid = anc.cloneNode(false);
          mid.className = cls;
          while (anc.firstChild) mid.appendChild(anc.firstChild);
          parent.insertBefore(mid, anc);
        } else {
          while (anc.firstChild) parent.insertBefore(anc.firstChild, anc);
        }
        parent.insertBefore(after, anc);
        parent.removeChild(anc);
        [before, after].forEach((x) => { if (!x.textContent && !x.querySelector('img, br')) x.remove(); });
      }
      const out = document.createRange();
      out.setStartAfter(m1);
      out.setEndBefore(m2);
      m1.remove();
      m2.remove();
      return out;
    }
    const classesOf = (el) => String(el.className || '').split(/\s+/).filter(Boolean);
    const isKept = (el) => el.classList.contains('hre-blank') || el.classList.contains('hv-gl');

    // Wrap the selection in a span with one class, replacing any class of the same family
    // already inside it or around it. An empty class removes the family instead.
    function applyClass(prefix, cls) {
      let r = recall();
      if (!r || r.collapsed) { say('Select some text first.', 'info'); return; }
      r = liftOut(r,
        (el) => (el.tagName === 'SPAN' || el.tagName === 'MARK') && !isKept(el)
          && (el.tagName === 'MARK' ? prefix === 'hv-hl-' : classesOf(el).some((c) => c.indexOf(prefix) === 0)),
        (el) => (el.tagName === 'MARK' ? '' : classesOf(el).filter((c) => c.indexOf(prefix) !== 0).join(' ')));
      const frag = r.extractContents();
      strip(frag, prefix);
      if (cls) {
        const span = document.createElement('span');
        span.className = cls;
        span.appendChild(frag);
        r.insertNode(span);
        selectNode(span);
      } else {
        const marker = document.createElement('span');
        marker.appendChild(frag);
        r.insertNode(marker);
        const r2 = document.createRange();
        r2.setStartBefore(marker);
        r2.setEndAfter(marker);
        unwrap(marker);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(r2);
      }
      changed();
    }

    function exec(cmd, arg) {
      recall();
      area.focus();
      try { document.execCommand('styleWithCSS', false, false); } catch (e) { /* older engines */ }
      document.execCommand(cmd, false, arg === undefined ? null : arg);
      changed();
    }

    // Everything inline goes; line breaks, pictures, blanks and meanings stay — with nothing
    // selected, from the whole text, by the same rule (it used to drop the meanings and the
    // pictures too). A selection inside a bold or coloured run is taken out of it first.
    const FORMAT_TAGS = { B: 1, STRONG: 1, I: 1, EM: 1, U: 1, S: 1, STRIKE: 1, SUB: 1, SUP: 1, SMALL: 1, MARK: 1, SPAN: 1, FONT: 1 };
    function clearFormatting() {
      let r = recall();
      if (!r || r.collapsed) {
        if (!window.confirm('Remove all formatting from this text?')) return;
        r = document.createRange();
        r.selectNodeContents(area);
      } else {
        r = liftOut(r, (el) => !!FORMAT_TAGS[el.tagName] && !isKept(el), null);
      }
      const frag = r.extractContents();
      const holder = document.createElement('div');
      holder.appendChild(frag);
      holder.querySelectorAll('b, strong, i, em, u, s, strike, sub, sup, small, mark, span, font').forEach((el) => {
        if (isKept(el)) return;
        unwrap(el);
      });
      holder.querySelectorAll('ul, ol, blockquote, h3, h4, p').forEach((el) => {
        // A list, a quote or a heading comes apart into its lines.
        el.querySelectorAll('li').forEach((li) => { li.appendChild(document.createElement('br')); unwrap(li); });
        if (el.tagName === 'P' || el.tagName === 'H3' || el.tagName === 'H4') el.appendChild(document.createElement('br'));
        unwrap(el);
      });
      const out = document.createDocumentFragment();
      while (holder.firstChild) out.appendChild(holder.firstChild);
      r.insertNode(out);
      area.normalize();
      changed();
    }

    // ── The small popovers: a meaning, a reading, a size/colour/font menu ─────
    function closePop() { pop.classList.add('hidden'); pop.innerHTML = ''; }

    function openPop(anchorBtn, html, bind, wide) {
      pop.innerHTML = html;
      pop.classList.toggle('hre-pop-wide', !!wide);
      pop.classList.remove('hidden');
      const b = anchorBtn.getBoundingClientRect();
      const h = root.getBoundingClientRect();
      pop.style.left = Math.max(0, Math.min(b.left - h.left, h.width - (pop.offsetWidth || 280))) + 'px';
      pop.style.top = (b.bottom - h.top + 4) + 'px';
      bind(pop);
      const first = pop.querySelector('input, textarea');
      if (first) {
        first.focus();
        if (first.tagName === 'TEXTAREA') first.setSelectionRange(first.value.length, first.value.length);
      }
    }

    // A box for a meaning grows with what is written in it, up to a point.
    function autoGrow(ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(Math.max(ta.scrollHeight + 2, 38), 170) + 'px';
    }
    // As js/richText.js keeps a meaning: its line breaks, each line's spaces tidied, no more
    // than one empty line in a row.
    const tidyMeaning = (s) => String(s == null ? '' : s).replace(/\r\n?/g, '\n')
      .split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim();

    function glossAt() {
      const r = recall();
      if (!r) return null;
      const n = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement;
      return n ? n.closest('.hv-gl') : null;
    }

    // A meaning is written in boxes that take line breaks — the card shows it as written — with
    // that card drawn underneath as it will look, and the meanings the page already has for the
    // word (the glossary's, the unit's word list's) one click away.
    function openGloss(btn) {
      const existing = glossAt();
      const r = recall();
      if (!existing && (!r || r.collapsed)) { say('Select the word first, then give it a meaning.', 'info'); return; }
      const word = (existing ? existing.textContent : r.toString()).replace(/\s+/g, ' ').trim();
      const gl = existing ? existing.getAttribute('data-gl') || '' : '';
      const vi = existing ? existing.getAttribute('data-gl-vi') || '' : '';
      // Which meanings can ever be seen here. Vietnamese text is only shown in Vietnamese and
      // Claude's English only in English, so each asks for its own; Korean is shown in both,
      // Vietnamese first, with the English optional (English mode falls back to the Vietnamese).
      const lang = o.lang || 'ko';
      const max = (R().LIMITS && R().LIMITS.gloss) || 400;
      const box = (k, label, v, optional) => '<label><span class="hre-lab">' + label + (optional ? ' <span class="hre-opt">optional</span>' : '') + '</span>'
        + '<textarea class="hre-in hre-ta" data-k="' + k + '" rows="2" maxlength="' + max + '" translate="no">' + esc(v) + '</textarea></label>';
      const viBox = box('vi', 'Nghĩa (Tiếng Việt)', vi, false);
      const enBox = box('gl', 'Meaning (English)', gl, lang !== 'en');
      const hints = (typeof o.glossHints === 'function' ? o.glossHints(word) || [] : [])
        .filter((h) => h && ((lang !== 'en' && h.vi) || (lang !== 'vi' && h.gl)));
      openPop(btn, '<div class="hre-pop-title">💬 Meaning on hover · <b translate="no">' + esc(word) + '</b></div>'
        + (hints.length ? '<div class="hre-hints"><span class="hre-hints-l">Use a meaning the page has:</span>'
          + hints.map((h, i) => '<button type="button" class="hre-hint" data-hint="' + i + '"><small>' + esc(h.from) + '</small>'
            + '<span translate="no">' + esc(String((lang === 'en' ? h.gl : h.vi || h.gl) || '').split('\n')[0]) + '</span></button>').join('') + '</div>' : '')
        + (lang === 'en' ? enBox : (lang === 'vi' ? viBox : viBox + enBox))
        + '<div class="hre-keys">Enter: new line · Ctrl+Enter: apply · Esc: close</div>'
        + '<div class="hre-gprev"><div class="hre-gprev-l">How it looks</div>'
        + '<div class="hv-gtip-card hv-gtip-static on" translate="no"></div>'
        + '<div class="hre-gprev-w" translate="no"><span class="hv-gl">' + esc(word) + '</span></div></div>'
        + '<div class="hre-pop-actions">'
        + (existing ? '<button type="button" class="hre-btn-danger" data-act="remove">Remove</button>' : '')
        + '<span class="hre-grow"></span><button type="button" data-act="cancel">Cancel</button>'
        + '<button type="button" class="hre-btn-primary" data-act="ok">Apply</button></div>', (p) => {
        // A box that is not shown keeps what the meaning already had.
        const val = (k, keep) => {
          const b = p.querySelector('[data-k="' + k + '"]');
          return b ? tidyMeaning(b.value) : keep;
        };
        const card = p.querySelector('.hv-gtip-static');
        const paint = () => {
          const lines = [];
          if (lang !== 'en' && val('vi', vi)) lines.push({ lang: 'vi', text: val('vi', vi) });
          if (lang !== 'vi' && val('gl', gl)) lines.push({ lang: 'en', text: val('gl', gl) });
          card.innerHTML = R().glossCardHtml(word, lines.length ? lines : [{ text: '…' }]);
        };
        p.querySelectorAll('textarea').forEach((ta) => {
          autoGrow(ta);
          ta.addEventListener('input', () => { autoGrow(ta); paint(); });
        });
        paint();
        p.querySelectorAll('[data-hint]').forEach((b) => {
          b.onclick = () => {
            const h = hints[Number(b.getAttribute('data-hint'))];
            [['vi', h.vi], ['gl', h.gl]].forEach(([k, v]) => {
              const ta = p.querySelector('[data-k="' + k + '"]');
              if (ta && v) { ta.value = v; autoGrow(ta); }
            });
            paint();
          };
        });
        const put = (node, name, v) => { if (v) node.setAttribute(name, v); else node.removeAttribute(name); };
        const ok = () => {
          const m = val('gl', gl);
          const mv = val('vi', vi);
          if (!m && !mv) { say('Write the meaning first.', 'info'); return; }
          if (existing) {
            put(existing, 'data-gl', m);
            put(existing, 'data-gl-vi', mv);
          } else {
            const range2 = recall();
            const frag = range2.extractContents();
            frag.querySelectorAll('.hv-gl').forEach(unwrap);
            const span = document.createElement('span');
            span.className = 'hv-gl';
            put(span, 'data-gl', m);
            put(span, 'data-gl-vi', mv);
            span.appendChild(frag);
            range2.insertNode(span);
          }
          closePop();
          changed();
        };
        p.querySelector('[data-act="ok"]').onclick = ok;
        p.querySelector('[data-act="cancel"]').onclick = closePop;
        const rm = p.querySelector('[data-act="remove"]');
        if (rm) rm.onclick = () => { unwrap(existing); closePop(); changed(); };
        // Enter starts a new line of the meaning; Ctrl+Enter (⌘+Enter) applies it.
        p.querySelectorAll('textarea').forEach((ta) => {
          ta.onkeydown = (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); ok(); }
            if (e.key === 'Escape') { e.preventDefault(); closePop(); }
          };
        });
      }, true);
    }

    function openRuby(btn) {
      const r = recall();
      if (!r || r.collapsed) { say('Select the text the reading goes over.', 'info'); return; }
      const base = r.toString();
      openPop(btn, '<div class="hre-pop-title">ᵃ Reading above · <b>' + esc(base) + '</b></div>'
        + '<label>Small text shown above (pronunciation, hanja…)<input class="hre-in" data-k="rt" maxlength="60"></label>'
        + '<div class="hre-pop-actions"><span class="hre-grow"></span><button type="button" data-act="cancel">Cancel</button>'
        + '<button type="button" class="hre-btn-primary" data-act="ok">Apply</button></div>', (p) => {
        const ok = () => {
          const rt = p.querySelector('[data-k="rt"]').value.trim();
          if (!rt) return;
          const range2 = recall();
          const text = range2.toString();
          range2.deleteContents();
          const ruby = document.createElement('ruby');
          ruby.appendChild(document.createTextNode(text));
          const t = document.createElement('rt');
          t.textContent = rt;
          ruby.appendChild(t);
          range2.insertNode(ruby);
          closePop();
          changed();
        };
        p.querySelector('[data-act="ok"]').onclick = ok;
        p.querySelector('[data-act="cancel"]').onclick = closePop;
        p.querySelector('input').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); ok(); } if (e.key === 'Escape') closePop(); };
      });
    }

    function openMenu(btn, kind) {
      let items = '';
      if (kind === 'size') {
        items = window.HVRich.SIZES.map((s) => '<button type="button" data-v="hv-sz-' + s + '"><span class="hv-sz-' + s + '">Aa 가</span> <small>' + SIZE_LABEL[s] + '</small></button>').join('')
          + '<button type="button" data-v="">↺ Default size</button>';
      } else if (kind === 'color') {
        items = '<div class="hre-swatches">' + window.HVRich.COLORS.map((c) => '<button type="button" class="hre-sw" title="' + c + '" data-v="hv-c-' + c + '" style="background:' + COLOR_HEX[c] + '"></button>').join('') + '</div>'
          + '<button type="button" data-v="">↺ Default colour</button>';
      } else if (kind === 'hl') {
        items = '<div class="hre-swatches">' + window.HVRich.HIGHLIGHTS.map((c) => '<button type="button" class="hre-sw" title="' + c + '" data-v="hv-hl-' + c + '" style="background:' + HL_HEX[c] + '"></button>').join('') + '</div>'
          + '<button type="button" data-v="">↺ No highlight</button>';
      } else if (kind === 'font') {
        items = window.HVRich.FONTS.map((f) => '<button type="button" data-v="hv-f-' + f + '"><span style="font-family:' + FONT_CSS[f] + '">한국어 Aa</span> <small>' + FONT_LABEL[f] + '</small></button>').join('')
          + '<button type="button" data-v="">↺ Page font</button>';
      }
      const prefix = { size: 'hv-sz-', color: 'hv-c-', hl: 'hv-hl-', font: 'hv-f-' }[kind];
      openPop(btn, '<div class="hre-menu">' + items + '</div>', (p) => {
        p.querySelectorAll('[data-v]').forEach((b) => {
          b.onclick = () => { closePop(); applyClass(prefix, b.getAttribute('data-v')); };
        });
      });
      // The fonts are fetched the first time the menu shows them.
      if (kind === 'font') window.HVRich.ensureFonts(window.HVRich.FONTS);
    }

    // ── Wiring ─────────────────────────────────────────────────────────────────
    root.querySelector('.hre-bar').addEventListener('mousedown', (e) => {
      // Keep the selection in the text while a toolbar button is pressed.
      if (e.target.closest('button')) { remember(); e.preventDefault(); }
    });
    root.querySelector('.hre-bar').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-cmd]');
      if (!b || b.disabled) return;
      const cmd = b.getAttribute('data-cmd');
      if (cmd === 'bold' || cmd === 'italic' || cmd === 'underline' || cmd === 'strikeThrough'
        || cmd === 'superscript' || cmd === 'subscript' || cmd === 'insertUnorderedList' || cmd === 'insertOrderedList') {
        exec(cmd);
      } else if (cmd === 'quote') {
        exec('formatBlock', 'blockquote');
      } else if (cmd === 'size' || cmd === 'color' || cmd === 'hl' || cmd === 'font') {
        openMenu(b, cmd);
      } else if (cmd === 'gloss') {
        openGloss(b);
      } else if (cmd === 'ruby') {
        openRuby(b);
      } else if (cmd === 'image') {
        if (typeof o.onPickImage !== 'function') return;
        const r0 = recall();
        const at = r0 ? r0.cloneRange() : null;
        o.onPickImage((src) => {
          if (!src) return;
          area.focus();
          const img = document.createElement('img');
          img.setAttribute('data-hv-src', src);
          img.setAttribute('src', o.assetBase + src);
          img.setAttribute('alt', '');
          img.className = 'hv-img-sm';
          const r2 = at && area.contains(at.commonAncestorContainer) ? at : null;
          if (r2) { r2.collapse(false); r2.insertNode(img); } else area.appendChild(img);
          changed();
        });
      } else if (cmd === 'clear') {
        clearFormatting();
      }
    });

    area.addEventListener('input', changed);
    area.addEventListener('keyup', remember);
    area.addEventListener('mouseup', remember);
    area.addEventListener('blur', remember);
    area.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const inList = (() => { const r = range(); const n = r && (r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement); return !!(n && n.closest('li')); })();
        if (!o.multiline) { e.preventDefault(); return; }
        if (!inList) { e.preventDefault(); document.execCommand('insertLineBreak'); changed(); }
      }
      // Lower-cased: with Shift or Caps Lock the key reads "Z", and Ctrl+Shift+Z went to the
      // browser's own redo inside the box instead of the Designer's.
      const key = String(e.key || '').toLowerCase();
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (key === 'b' || key === 'i' || key === 'u')) {
        e.preventDefault();
        exec({ b: 'bold', i: 'italic', u: 'underline' }[key]);
      }
      // Undo and redo belong to the Designer's history, which covers every edit on the page.
      if ((e.ctrlKey || e.metaKey) && (key === 'z' || key === 'y')) {
        e.preventDefault();
        if (typeof o.onHistory === 'function') o.onHistory(key === 'y' || e.shiftKey ? 'redo' : 'undo');
      }
    });
    area.addEventListener('beforeinput', (e) => {
      if (!o.lockText) return;
      if (/^format/.test(e.inputType)) return;
      e.preventDefault();
      say('This is Claude’s English — style it here; to change its words, change the Vietnamese.', 'info');
    });
    area.addEventListener('paste', (e) => {
      e.preventDefault();
      if (o.lockText) return;
      const cd = e.clipboardData;
      const html = cd && cd.getData('text/html');
      const text = cd && cd.getData('text/plain');
      const clean = html ? R().sanitize(fromOffice(html)) : R().fromText(text || '');
      document.execCommand('insertHTML', false, o.multiline ? clean : clean.replace(/<br>/g, ' '));
      decorate(area);
      changed();
    });
    area.addEventListener('drop', (e) => e.preventDefault());
    // A click on a word that already has a meaning opens it for editing.
    area.addEventListener('dblclick', (e) => {
      const g = e.target.closest && e.target.closest('.hv-gl');
      if (g) { selectNode(g); openGloss(root.querySelector('[data-cmd="gloss"]')); }
    });

    // Bold, italic, underline, strike, super- and subscript light up for the text the caret is in.
    const STATE_CMDS = ['bold', 'italic', 'underline', 'strikeThrough', 'superscript', 'subscript'];
    function paintState() {
      if (!range()) return;
      STATE_CMDS.forEach((c) => {
        const b = root.querySelector('[data-cmd="' + c + '"]');
        let on = false;
        try { on = document.queryCommandState(c); } catch (e) { on = false; }
        if (b) b.classList.toggle('on', !!on);
      });
    }
    // Two listeners on the document, taken off again with the editor: the Designer makes a new
    // editor every time its panel redraws, and each one used to leave its listener behind.
    const onDocDown = (e) => { if (!root.contains(e.target)) closePop(); };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('selectionchange', paintState);

    load(o.html, o.text);

    return {
      el: root,
      area,
      setValue(html, text) { o.text = text; load(html, text); },
      getValue() { const html = read(); return { html, text: R().plain(html) }; },
      setLockedText(text) { o.text = text; },
      focus() { area.focus(); placeCaretAtEnd(); },
      destroy() {
        document.removeEventListener('mousedown', onDocDown);
        document.removeEventListener('selectionchange', paintState);
        root.remove();
      }
    };
  }

  // Word and Google Docs say bold and italic with styles, which the sanitizer drops — and Docs
  // wraps a whole paste in <b style="font-weight:normal">, which it would keep, making everything
  // pasted bold. The pasted HTML is read in a detached document first, and those are turned into
  // the tags they mean.
  function fromOffice(html) {
    let doc;
    try { doc = new DOMParser().parseFromString(String(html || ''), 'text/html'); } catch (e) { return html; }
    const body = doc && doc.body;
    if (!body) return html;
    const weight = (el) => String((el.style && el.style.fontWeight) || '').toLowerCase();
    const heavy = (w) => w === 'bold' || w === 'bolder' || (/^\d+$/.test(w) && Number(w) >= 600);
    const unwrapIn = (el) => { const p = el.parentNode; while (el.firstChild) p.insertBefore(el.firstChild, el); p.removeChild(el); };
    body.querySelectorAll('b, strong').forEach((el) => {
      const w = weight(el);
      if (w && !heavy(w)) unwrapIn(el);
    });
    body.querySelectorAll('span, font').forEach((el) => {
      const st = el.style || {};
      const wrap = (tag) => {
        const w = doc.createElement(tag);
        while (el.firstChild) w.appendChild(el.firstChild);
        el.appendChild(w);
      };
      if (heavy(weight(el))) wrap('b');
      if (String(st.fontStyle || '').toLowerCase() === 'italic') wrap('i');
      const deco = String(st.textDecorationLine || st.textDecoration || '').toLowerCase();
      if (deco.indexOf('underline') >= 0) wrap('u');
      if (deco.indexOf('line-through') >= 0) wrap('s');
      const va = String(st.verticalAlign || '').toLowerCase();
      if (va === 'super') wrap('sup');
      else if (va === 'sub') wrap('sub');
    });
    return body.innerHTML;
  }

  function toolbarHtml(o) {
    const b = (cmd, label, title, cls) => '<button type="button" class="hre-b ' + (cls || '') + '" data-cmd="' + cmd + '" title="' + esc(title) + '">' + label + '</button>';
    const sep = '<span class="hre-sep"></span>';
    return '<div class="hre-bar" role="toolbar" aria-label="Text formatting">'
      + b('bold', '<b>B</b>', 'Bold (Ctrl+B)')
      + b('italic', '<i>I</i>', 'Italic (Ctrl+I)')
      + b('underline', '<u>U</u>', 'Underline (Ctrl+U)')
      + b('strikeThrough', '<s>S</s>', 'Strikethrough')
      + sep
      + b('size', 'A<small>A</small> ▾', 'Text size')
      + b('color', '<span class="hre-a" style="border-color:#b91c1c">A</span> ▾', 'Text colour')
      + b('hl', '<span class="hre-hl">ab</span> ▾', 'Highlight')
      + b('font', '가 ▾', 'Font')
      + sep
      + b('gloss', '💬', 'Meaning on hover — select a word, give it a meaning (double-click a marked word to edit)')
      + b('ruby', 'ᵃ가', 'Reading above the text (pronunciation, hanja)')
      + b('superscript', 'x²', 'Superscript')
      + b('subscript', 'x₂', 'Subscript')
      + (o.multiline ? sep + b('insertUnorderedList', '•≡', 'Bulleted list') + b('insertOrderedList', '1≡', 'Numbered list') + b('quote', '❝', 'Quote') : '')
      + (o.allowImages ? sep + b('image', '🖼', 'Insert a picture into the text') : '')
      + sep + b('clear', '⌫', 'Clear formatting from the selection (or from everything)')
      + '</div>';
  }

  window.HVRichEditor = { create };
}());
