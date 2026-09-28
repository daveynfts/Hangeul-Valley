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

    // Wrap the selection in a span with one class, replacing any class of the same family
    // already inside it. An empty class removes the family instead.
    function applyClass(prefix, cls) {
      const r = recall();
      if (!r || r.collapsed) { say('Select some text first.', 'info'); return; }
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

    // Everything inline goes; line breaks, pictures, blanks and meanings stay.
    function clearFormatting() {
      const r = recall();
      if (!r || r.collapsed) {
        if (!window.confirm('Remove all formatting from this text?')) return;
        area.innerHTML = R().fromText(R().plain(read()));
        decorate(area);
        changed();
        return;
      }
      const frag = r.extractContents();
      const holder = document.createElement('div');
      holder.appendChild(frag);
      holder.querySelectorAll('b, strong, i, em, u, s, strike, sub, sup, small, mark, span, font').forEach((el) => {
        if (el.classList.contains('hre-blank') || el.classList.contains('hv-gl')) return;
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

    function openPop(anchorBtn, html, bind) {
      pop.innerHTML = html;
      pop.classList.remove('hidden');
      const b = anchorBtn.getBoundingClientRect();
      const h = root.getBoundingClientRect();
      pop.style.left = Math.max(0, Math.min(b.left - h.left, h.width - 280)) + 'px';
      pop.style.top = (b.bottom - h.top + 4) + 'px';
      bind(pop);
      const first = pop.querySelector('input, button');
      if (first && first.tagName === 'INPUT') first.focus();
    }

    function glossAt() {
      const r = recall();
      if (!r) return null;
      const n = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement;
      return n ? n.closest('.hv-gl') : null;
    }

    function openGloss(btn) {
      const existing = glossAt();
      const r = recall();
      if (!existing && (!r || r.collapsed)) { say('Select the word first, then give it a meaning.', 'info'); return; }
      const word = existing ? existing.textContent : r.toString();
      const gl = existing ? existing.getAttribute('data-gl') || '' : '';
      const vi = existing ? existing.getAttribute('data-gl-vi') || '' : '';
      // Which meanings can ever be seen here. Vietnamese text is only shown in Vietnamese and
      // Claude's English only in English, so each asks for its own; Korean is shown in both,
      // Vietnamese first, with the English optional (English mode falls back to the Vietnamese).
      const lang = o.lang || 'ko';
      const viBox = '<label>Nghĩa (Tiếng Việt)<input class="hre-in" data-k="vi" value="' + esc(vi) + '" maxlength="240"></label>';
      const enBox = '<label>Meaning (English)' + (lang === 'en' ? '' : ' <span class="hre-opt">optional</span>')
        + '<input class="hre-in" data-k="gl" value="' + esc(gl) + '" maxlength="240"></label>';
      openPop(btn, '<div class="hre-pop-title">💬 Meaning on hover · <b>' + esc(word) + '</b></div>'
        + (lang === 'en' ? enBox : (lang === 'vi' ? viBox : viBox + enBox))
        + '<div class="hre-pop-actions">'
        + (existing ? '<button type="button" class="hre-btn-danger" data-act="remove">Remove</button>' : '')
        + '<span class="hre-grow"></span><button type="button" data-act="cancel">Cancel</button>'
        + '<button type="button" class="hre-btn-primary" data-act="ok">Apply</button></div>', (p) => {
        // A box that is not shown keeps what the meaning already had.
        const val = (k, keep) => {
          const box = p.querySelector('[data-k="' + k + '"]');
          return box ? box.value.replace(/\s+/g, ' ').trim() : keep;
        };
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
        p.querySelectorAll('input').forEach((i) => { i.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); ok(); } if (e.key === 'Escape') closePop(); }; });
      });
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
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'b' || e.key === 'i' || e.key === 'u')) {
        e.preventDefault();
        exec({ b: 'bold', i: 'italic', u: 'underline' }[e.key]);
      }
      // Undo and redo belong to the Designer's history, which covers every edit on the page.
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'y')) {
        e.preventDefault();
        if (typeof o.onHistory === 'function') o.onHistory(e.key === 'y' || e.shiftKey ? 'redo' : 'undo');
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
      const clean = html ? R().sanitize(html) : R().fromText(text || '');
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
    document.addEventListener('mousedown', (e) => { if (!root.contains(e.target)) closePop(); });

    load(o.html, o.text);

    return {
      el: root,
      area,
      setValue(html, text) { o.text = text; load(html, text); },
      getValue() { const html = read(); return { html, text: R().plain(html) }; },
      setLockedText(text) { o.text = text; },
      focus() { area.focus(); placeCaretAtEnd(); },
      destroy() { root.remove(); }
    };
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
