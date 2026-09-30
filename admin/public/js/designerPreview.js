/**
 * The Designer's live preview — window.HVDesignerPreview.
 *
 * A study-desk page drawn inside an iframe with the game's own stylesheets (css/game.css,
 * css/rich.css), its own art tables (js/workbookArt.js and the vocab art rows) and its own
 * formatting script (js/richText.js), so a size, a box, a theme or a picture looks here exactly
 * as it will in front of a learner. The iframe is same-origin, which is what lets a click on
 * any sentence on the page open that sentence for editing.
 *
 * The page markup is written here rather than borrowed from js/ui.js: renderWorkbook() lives
 * in a 280 KB file that wires up the whole game at load, and cannot run on its own. What is
 * copied is the structure — the ids and classes game.css styles — for each exercise type, in
 * both states: the questions as the learner meets them, and the page after checking with the
 * right answers in and the explanations open. Every formatted field goes through the same
 * HVRich.field / fieldParts / fieldParagraphs calls the game makes. If renderWorkbook changes
 * shape, this is the file to bring along.
 *
 * Everything clickable carries its path into the bank:
 *   data-hv-edit="exercises.3.items.2.why"    a field
 *   data-hv-block="b2"                        a block the design placed
 *   data-hv-row="2"                           a question row, for the Question tab
 */
(function () {
  'use strict';

  const FONTS_URL = 'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400'
    + '&family=Nunito:wght@400;600;700;800;900&family=Noto+Sans+KR:wght@400;700;900&family=Press+Start+2P&family=VT323&display=swap';
  const ART_SCRIPTS = ['js/i18n.js', 'js/vocabArt.js', 'js/vocabArtUnit14.js', 'js/vocabArtMore.js', 'js/vocabArtUnits.js', 'js/workbookArt.js', 'js/richText.js'];
  const ANCHORS = ['top', 'instruction', 'example', 'items', 'explain', 'bottom'];

  // The iframe's document. artUrl and currentLesson are the two game globals the art tables
  // reach for; the preview answers them itself. The stylesheets and scripts are named in full:
  // Chrome's preload scanner fetches them before it has read <base>, so a relative name went
  // first to the admin's own /js/i18n.js and was thrown away. <base> stays for the pictures,
  // which the content names relative to the game.
  function srcdoc(assetBase) {
    const safe = String(assetBase || '/').replace(/"/g, '');
    return '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">'
      + '<base href="' + safe + '">'
      + '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
      + '<link href="' + FONTS_URL + '" rel="stylesheet">'
      + '<link rel="stylesheet" href="' + safe + 'css/game.css"><link rel="stylesheet" href="' + safe + 'css/rich.css">'
      + '<style>'
      + 'html,body{margin:0;height:100%;background:#3a2410;}'
      + '#workbook-overlay{position:absolute;inset:0;display:flex;background:transparent;}'
      + '[data-hv-edit],[data-hv-block]{cursor:pointer;transition:outline-color .12s;}'
      + '[data-hv-edit]:hover,[data-hv-block]:hover{outline:2px dashed rgba(79,70,229,.85);outline-offset:2px;border-radius:3px;}'
      + '[data-hv-row]{cursor:pointer;}'
      + '.hv-sel{outline:3px solid #4f46e5 !important;outline-offset:2px;border-radius:3px;box-shadow:0 0 0 6px rgba(79,70,229,.18);}'
      + '.hv-row-sel{box-shadow:0 0 0 3px rgba(79,70,229,.55) !important;}'
      + '.hv-empty-hint{font:600 12px "Be Vietnam Pro",sans-serif;color:#9a6a3a;border:1.5px dashed #c4893a;border-radius:6px;padding:8px 10px;text-align:center;}'
      // A word the Meanings tab is pointing at, everywhere it is written.
      + '::highlight(hv-find){background-color:rgba(250,204,21,.62);color:inherit;}'
      + '::highlight(hv-find-now){background-color:#fb923c;color:#1a1208;}'
      + '.hv-find-el{background:rgba(250,204,21,.62)!important;border-radius:2px;}.hv-find-now{background:#fb923c!important;}'
      + 'button{pointer-events:auto;}'
      + '</style>'
      + '<script>function artUrl(r){return "sprites/"+String(r).replace(/^sprites\\//,"");}'
      + 'var __hvLesson=null;function currentLesson(){return __hvLesson;}</script>'
      + ART_SCRIPTS.map((s) => '<script src="' + safe + s + '"></script>').join('')
      + '</head><body>'
      + '<div id="workbook-overlay" class="visible"><div id="workbook-panel" class="glass-modal">'
      + '<div id="wb-head"><div id="wb-title-wrap"><div id="wb-title"></div><div id="wb-sub"></div></div><span id="wb-count"></span>'
      + '<button type="button" class="wb-close" tabindex="-1">✕</button></div>'
      + '<div id="wb-body">'
      + '<div id="wb-blocks-top" class="hv-blocks"></div><div id="wb-instruction"></div><div id="wb-blocks-instruction" class="hv-blocks"></div>'
      + '<div id="wb-example"></div><div id="wb-blocks-example" class="hv-blocks"></div><div id="wb-bank"></div><div id="wb-items"></div>'
      + '<div id="wb-blocks-items" class="hv-blocks"></div><div id="wb-explain"></div><div id="wb-blocks-explain" class="hv-blocks"></div>'
      + '<div id="wb-blocks-bottom" class="hv-blocks"></div></div>'
      + '<div id="wb-foot"><button type="button" id="wb-back" tabindex="-1">← 연습 목록</button><span id="wb-hint"></span>'
      + '<button type="button" id="wb-check" tabindex="-1">확인 Check</button></div>'
      + '</div></div></body></html>';
  }

  /** Put the preview document in `iframe`; resolves with its window once the scripts are in. */
  function mount(iframe, assetBase) {
    return new Promise((resolve) => {
      const done = () => {
        const win = iframe.contentWindow;
        const wait = (n) => {
          if (win && win.HVRich && typeof win.workbookIconSvg === 'function') { resolve(win); return; }
          if (n > 200) { resolve(win); return; }
          setTimeout(() => wait(n + 1), 25);
        };
        wait(0);
      };
      iframe.addEventListener('load', done, { once: true });
      iframe.srcdoc = srcdoc(assetBase);
    });
  }

  // ── A question row's headline and shape — js/ui.js wbHeadline and wbQuestionClasses ──
  // The game leaves out a headline that only repeats one of the row's lines (the exam pages'
  // sentence with its "(   )"), underlines the part a 밑줄 question is about, and draws a test
  // question's options as an even grid. The same rules, so the page here is the learner's page;
  // tests/test_workbook_headline.js holds the two copies to the same answers on every bank.
  function gapFlat(s) {
    return String(s || '').replace(/\(\s*\)/g, '{}').replace(/\s+/g, ' ').trim();
  }
  function headline(ex, item) {
    const text = String((item && item.phraseKo) || '');
    const flat = gapFlat(text);
    if (!flat) return null;
    const lines = ((item && item.lines) || []).map((l) => gapFlat(l && l.ko));
    if (lines.indexOf(flat) >= 0) return null;
    const asks = /밑줄/.test(String((ex && ex.instructionKo) || '') + ' ' + String(item.instructionKo || ''));
    const gapped = asks ? lines.filter((l) => l.split('{}').length === 2) : [];
    if (gapped.length === 1) {
      const [pre, post] = gapped[0].split('{}');
      if ((pre.trim() || post.trim()) && flat.length > pre.length + post.length
        && flat.indexOf(pre) === 0 && flat.endsWith(post)) {
        const mm = flat.slice(pre.length, flat.length - post.length).match(/^(\s*)([\s\S]*?)(\s*)$/);
        if (mm[2]) return { text, under: [pre + mm[1], mm[2], mm[3] + post] };
      }
    }
    return { text, under: null };
  }
  function questionClasses(bank, ex, item, head, art) {
    if (!ex || ex.type !== 'build' || !item || item.choices2) return '';
    const choices = item.choices || [];
    if (!choices.length || choices.some((c) => c && c.art)) return '';
    if (!((bank && bank.holdGloss) || ex.holdGloss || item.holdGloss)) return '';
    const longest = Math.max(...choices.map((c) => String((c && c.ko) || '').length));
    let cls = ' wb-q' + (longest > 20 ? ' wb-q-long' : (longest > 9 ? ' wb-q-wide' : ''));
    if (!head && !art && !(item.audio && item.audio.src)) cls += ' wb-q-bare';
    return cls;
  }

  // ── Drawing ─────────────────────────────────────────────────────────────────
  function render(win, m) {
    const doc = win.document;
    const R = win.HVRich;
    if (!doc || !R) return;
    const $ = (id) => doc.getElementById(id);
    const lang = m.lang || 'en';
    const esc = R.esc;
    const bank = m.bank;
    win.__hvLesson = m.world ? { worldId: m.world.worldId, words: m.world.words || [] } : null;

    const langField = (f) => (typeof win.hvLangField === 'function' ? win.hvLangField(f, lang) : f + 'Vi');
    const tr = (obj, f) => {
      if (!obj) return '';
      if (lang !== 'en') {
        const v = obj[langField(f)];
        if (typeof v === 'string' && v.trim()) return v;
      }
      const v = obj[f];
      const out = typeof v === 'string' ? v : (v == null ? '' : String(v));
      // As js/i18n.js tr(): Vietnamese written before its English stands in for the English.
      if (!out.trim()) {
        const draft = obj[typeof win.hvLangField === 'function' ? win.hvLangField(f, 'vi') : f + 'Vi'];
        if (typeof draft === 'string' && draft.trim()) return draft;
      }
      return out;
    };
    const fmt = (obj, f, shown, block) => {
      const out = R.field(obj, f, shown, { lang, block: !!block });
      return out === null ? esc(shown) : out;
    };
    const boxed = (obj, f) => { const s = R.specOf(obj, f); return !!(s && R.BOXES.indexOf(s.box) >= 0); };
    // js/ui.js wbHeadlineHtml: the designer's own formatting of a headline wins over the underline.
    const headlineHtml = (it, head) => (head.under && !R.specOf(it, 'phraseKo')
      ? esc(head.under[0]) + '<u class="wb-under">' + esc(head.under[1]) + '</u>' + esc(head.under[2])
      : fmt(it, 'phraseKo', head.text));
    const at = (path) => ' data-hv-edit="' + esc(path) + '"';
    const icon = (key, px) => (typeof win.workbookIconSvg === 'function' ? win.workbookIconSvg(key, px) : '');

    const panel = $('workbook-panel');
    const exIndex = m.exIndex;
    const ex = exIndex >= 0 ? (bank.exercises || [])[exIndex] : null;
    const design = R.mergeDesign(bank.design, ex ? ex.design : null);
    // Theme, width, zoom, columns, font.
    Array.from(panel.classList).filter((c) => c.indexOf('hv-') === 0).forEach((c) => panel.classList.remove(c));
    R.designClasses(design).forEach((c) => panel.classList.add(c));
    panel.style.setProperty('--hv-scale', String(R.designScale(design)));
    if (design && design.font) R.ensureFonts([design.font]);

    const answers = m.view === 'answers' && !!ex;
    const blocks = ex ? ((design && design.blocks) || []) : ((bank.design && bank.design.blocks) || []);
    ANCHORS.forEach((a) => {
      const host = $('wb-blocks-' + a);
      host.innerHTML = R.blocksHtml(blocks, a, { lang, checked: answers });
      // Tag each drawn block with its id, in order: blocksHtml writes them in list order.
      const shown = blocks.filter((b) => b && b.at === a && R.blockVisible(b, answers));
      Array.from(host.children).forEach((el, i) => { if (shown[i]) el.setAttribute('data-hv-block', shown[i].id); });
    });

    if (!ex) { renderPicker(); } else { renderExercise(); }
    markSelection(win, m.selected);

    // ── The bank's own page: the list of exercises ──────────────────────────
    function renderPicker() {
      const list = bank.exercises || [];
      $('wb-title').textContent = bank.titleKo || '연습 문제';
      $('wb-sub').textContent = tr(bank, 'source') || tr(bank, 'titleEn') || '';
      const count = $('wb-count');
      count.textContent = list.length + ' 연습';
      count.className = '';
      $('wb-instruction').innerHTML =
        '<div class="wb-inst-ko"' + at('pickKo') + '>' + fmt(bank, 'pickKo', bank.pickKo || '어떤 연습을 할까요?', true) + '</div>'
        + '<div class="wb-inst-en"' + at('pickEn') + '>' + fmt(bank, 'pickEn', tr(bank, 'pickEn') || '', true) + '</div>';
      $('wb-example').innerHTML = ''; $('wb-example').className = 'wb-hidden';
      $('wb-bank').innerHTML = ''; $('wb-bank').className = 'wb-hidden';
      $('wb-explain').innerHTML = ''; $('wb-explain').className = '';
      const items = $('wb-items');
      items.className = 'wb-items-pick';
      let group = null;
      let html = '';
      list.forEach((e, i) => {
        if ((e.section || '') !== group) {
          group = e.section || '';
          html += '<div class="wb-group"><span class="wb-group-ko">' + esc(group) + '</span>'
            + '<span class="wb-group-en">' + esc(tr(e, 'sectionEn') || '') + '</span></div>';
        }
        const blurb = tr(e, 'blurbEn');
        html += '<button type="button" class="wb-pick" data-hv-open="' + i + '">'
          + '<span class="wb-pick-key">' + (i < 9 ? i + 1 : (i === 9 ? 0 : '')) + '</span>'
          + '<span class="wb-pick-icon">' + esc(e.icon || '📝') + '</span>'
          + '<span class="wb-pick-text"><span class="wb-pick-title">'
          + (e.pattern ? '<b class="wb-pick-pat">' + esc(e.pattern) + '</b><span class="wb-pick-no">' + esc(e.no || '') + '</span>'
            : '<b class="wb-pick-name">' + esc(e.no || '') + '</b>')
          + '</span><span class="wb-pick-en"' + (blurb ? at('exercises.' + i + '.blurbEn') : '') + '>'
          + (blurb ? fmt(e, 'blurbEn', blurb) : esc(tr(e, 'instructionEn') || '')) + '</span></span>'
          + '<span class="wb-pick-count">' + (bank.drawOne && (e.items || []).length > 1
            ? '1/' + (e.items || []).length + '문항 무작위' : (e.items || []).length + '문항') + '</span></button>';
      });
      items.innerHTML = html;
      $('wb-hint').textContent = bank.hintKo || '';
      $('wb-back').className = 'wb-hidden';
      $('wb-check').className = 'wb-hidden';
    }

    // ── One exercise ─────────────────────────────────────────────────────────
    function renderExercise() {
      const base = 'exercises.' + exIndex;
      const list = ex.items || [];
      const perItem = ex.type === 'experience' || ex.type === 'build';
      const total = list.reduce((n, it) => n + (it.choices2 || it.answer2 ? 2 : 1), 0);
      $('wb-title').textContent = (ex.section || '') + ' · ' + (ex.no || '');
      $('wb-sub').textContent = ex.pattern
        ? ex.pattern + ' · ' + (tr(ex, 'sectionEn') || '')
        : (tr(ex, 'sectionEn') || '') + ' — ' + (tr(bank, 'titleEn') || 'Workbook');
      const count = $('wb-count');
      count.textContent = (answers ? total : 0) + ' / ' + total;
      count.className = answers ? 'wb-count-all' : '';

      // Instruction, the note, the picture guide.
      const drawn = bank.drawOne ? list[0] : null;
      const head = drawn && drawn.instructionKo ? drawn : ex;
      const headPath = head === ex ? base : base + '.items.0';
      $('wb-instruction').innerHTML =
        '<div class="wb-inst-ko"' + at(headPath + '.instructionKo') + '>' + fmt(head, 'instructionKo', head.instructionKo || '', true) + '</div>'
        + '<div class="wb-inst-en"' + at(headPath + '.instructionEn') + '>' + fmt(head, 'instructionEn', tr(head, 'instructionEn') || '', true) + '</div>'
        + (ex.noteEn ? '<div class="wb-inst-note' + (boxed(ex, 'noteEn') ? ' hv-unboxed' : '') + '"' + at(base + '.noteEn') + '>'
          + fmt(ex, 'noteEn', tr(ex, 'noteEn'), true) + '</div>' : '')
        + (ex.visualGuide ? '<div class="wb-visual-guide">' + ex.visualGuide.map((p) =>
          '<figure>' + icon(p.art, 7) + '<figcaption>' + esc(p.ko) + '</figcaption></figure>').join('') + '</div>' : '');

      // The worked example.
      const exBox = $('wb-example');
      if (!ex.example) { exBox.innerHTML = ''; exBox.className = 'wb-hidden'; }
      else {
        exBox.className = '';
        const eg = ex.example;
        const filled = ex.type === 'build' ? (eg.answerKo || '') : answerText(chip(ex, eg.answer));
        exBox.innerHTML = '<span class="wb-example-tag">[보기]</span> '
          + lineHtml(ex, eg, filled, { plain: true, second: eg.answer2Ko || '', path: base + '.example' })
          + '<div class="wb-example-en"' + at(base + '.example.en') + '>' + fmt(eg, 'en', tr(eg, 'en') || '') + '</div>';
      }

      // The shared box — above the rows, or beside them on a picture match.
      const bankEl = $('wb-bank');
      const paired = ex.type === 'match' && list.some((it) => it.img);
      const chipsHtml = (ex.bank || []).filter((c) => !c.usedByExample).map((c, i) => {
        const used = answers && list.some((it) => it.answer === c.id);
        return '<button type="button" class="wb-chip' + (used ? ' used' : '') + '" disabled><span class="wb-chip-key">' + (i + 1) + '</span>'
          + esc(chipText(c)) + '</button>';
      }).join('');
      if (perItem || paired) { bankEl.innerHTML = ''; bankEl.className = 'wb-hidden'; }
      else { bankEl.className = 'wb-bank-' + (ex.type || 'fill'); bankEl.innerHTML = chipsHtml; }

      // The rows.
      const items = $('wb-items');
      items.className = 'wb-items-' + (ex.type || 'fill') + (paired ? ' wb-paired' : '');
      const holdAll = !!(bank.holdGloss || ex.holdGloss);
      const rows = list.map((it, i) => {
        const p = base + '.items.' + i;
        const rowCls = 'wb-row' + (it.img ? ' photo' : '') + (answers ? ' ok' : (i === 0 ? ' focus' : ''))
          + (it.fmt && it.fmt['*'] ? ' ' + R.specClasses(it.fmt['*']) : '') + (m.row === i ? ' hv-row-sel' : '');
        const mark = answers ? '<span class="wb-mark">✓</span>' : '';
        if (perItem) {
          const hold = (holdAll || it.holdGloss) && !answers;
          const art = icon(it.art || it.phraseKo || it.ko || '', 4);
          const head = headline(ex, it);
          const two = !!(it.choices2 || it.answer2);
          const right1 = answers ? answerText(choice(it, it.answer, 1)) : '';
          const right2 = answers && two ? answerText(choice(it, it.answer2, 2)) : '';
          let key = 0;
          const forms = (cs, answer, slot) => (cs || []).map((c, ci) => {
            key += 1;
            const on = answers && c.id === answer;
            const cls = 'wb-pick-form' + (on ? ' on key' : '') + (c.art ? ' wb-pick-picture' : '');
            const label = fmt(c, 'ko', c.ko);
            return '<button type="button" class="' + cls + '"' + at(p + (slot === 2 ? '.choices2.' : '.choices.') + ci + '.ko') + '>'
              + '<span class="wb-chip-key">' + key + '</span>'
              + (c.art ? icon(c.art, 7) + '<span>' + label + '</span>' : label) + '</button>';
          }).join('');
          let picks = forms(it.choices, it.answer, 1);
          if (two) picks += '<i class="wb-picks-break"></i>' + forms(it.choices2, it.answer2, 2);
          if (ex.type === 'experience') {
            const own = ex.ownLabels || { yes: '있어요', no: '없어요' };
            picks += '<span class="wb-exp-sep"></span>' + ['yes', 'no'].map((v) =>
              '<button type="button" class="wb-pick-own"><span class="wb-chip-key">' + (++key) + '</span>' + esc(own[v] || '') + '</button>').join('');
          }
          return '<div class="' + rowCls + questionClasses(bank, ex, it, head, art) + '" data-hv-row="' + i + '"><span class="wb-n">' + esc(it.n) + ')</span>'
            + '<div class="wb-exp"><div class="wb-exp-head">' + art
            + (head ? '<span class="wb-exp-phrase"' + at(p + '.phraseKo') + '>' + headlineHtml(it, head) + '</span>' : '')
            + (hold ? '' : '<span class="wb-exp-en"' + at(p + '.en') + '>' + fmt(it, 'en', tr(it, 'en') || '') + '</span>')
            + (it.audio && it.audio.src ? '<button type="button" class="wb-say book">🔊</button>' : '')
            + '</div><div class="wb-exp-line">' + lineHtml(ex, it, right1, { second: right2, path: p }) + '</div>'
            + '<div class="wb-exp-picks">' + picks + '</div></div>' + mark + '</div>';
        }
        const right = answers ? answerText(chip(ex, it.answer)) : '';
        return '<div class="' + rowCls + '" data-hv-row="' + i + '"><span class="wb-n">' + esc(it.n) + ')</span>'
          + '<span class="wb-sentence">' + lineHtml(ex, it, right, { path: p }) + '</span>' + mark + '</div>';
      }).join('') || '<div class="hv-empty-hint">No questions yet — add one in the Question tab.</div>';
      items.innerHTML = paired
        ? '<div class="wb-cols"><div class="wb-col">' + rows + '</div><div class="wb-col wb-names">' + chipsHtml + '</div></div>'
        : rows;

      // The explanations, once "checked".
      const explain = $('wb-explain');
      if (!answers) { explain.innerHTML = ''; explain.className = ''; }
      else {
        explain.className = 'shown';
        const exam = bank.id === 'topik2-questions' || bank.examView === true;
        explain.innerHTML = list.map((it, i) => {
          const p = base + '.items.' + i;
          const two = !!(it.choices2 || it.answer2);
          const c1 = perItem ? answerText(choice(it, it.answer, 1)) : answerText(chip(ex, it.answer));
          const c2 = two ? answerText(choice(it, it.answer2, 2)) : '';
          const sentence = lineHtml(ex, it, c1, { plain: true, second: c2, path: p });
          if (exam) return topikCard(it, p, sentence);
          return '<div class="wb-why ok"><div class="wb-why-head">' + esc(it.n) + ') ✓ ' + sentence + '</div>'
            + '<div class="wb-why-en"' + at(p + '.en') + '>' + fmt(it, 'en', tr(it, 'en') || '') + '</div>'
            + '<div class="wb-why-body"' + at(p + '.why') + '>' + fmt(it, 'why', tr(it, 'why'), true) + '</div>'
            + '<div class="wb-why-gram' + (boxed(it, 'grammar') ? ' hv-unboxed' : '') + '"' + at(p + '.grammar') + '>📐 '
            + fmt(it, 'grammar', tr(it, 'grammar'), true) + '</div>'
            + extras(it, p).map((x) => '<div class="wb-why-extra">'
              + (x.title ? '<b class="wb-why-extra-h"' + at(x.path + '.labelEn') + '>' + x.title + '</b>' : '')
              + '<div' + at(x.path + '.noteEn') + '>' + x.body(true) + '</div></div>').join('')
            + '</div>';
        }).join('');
      }

      $('wb-hint').textContent = answers ? '+10 XP' : (bank.hintKo || '');
      const back = $('wb-back');
      back.className = '';
      back.textContent = '← ' + (bank.backKo || '연습 목록');
      const check = $('wb-check');
      check.className = '';
      check.disabled = !answers;
      check.textContent = answers ? (bank.againKo || '다시 풀기') : ((bank.checkKo || '확인') + ' ' + (tr(bank, 'checkEn') || 'Check'));

      // Hover meanings, as the game applies them for this page's gloss mode.
      const mode = R.glossMode(design);
      if (mode === 'always' || (mode === 'checked' && answers)) applyGloss(items);
      if (mode === 'always') { applyGloss($('wb-instruction')); if (ex.example) applyGloss(exBox); }
      if (answers && mode !== 'off') applyGloss(explain);

      // The exam explanation, js/ui.js wbTopikWhyHtml. Its paragraphs are picked one at a time —
      // "why#0" is the thing to notice, "why#1"… each reasoning step — so a click on a step opens
      // that step, not the whole explanation from its first line.
      function topikCard(it, p, sentence) {
        const whyText = tr(it, 'why');
        const parts = R.fieldParagraphs(it, 'why', whyText, { lang }) || R.textParagraphs(whyText).map(esc);
        const cls = R.specClasses(R.specOf(it, 'why'), { noBox: true });
        const pc = cls ? ' class="' + cls + '"' : '';
        const para = (k) => at(p + '.why#' + k);
        const lead = parts.length ? parts[0] : '';
        const steps = parts.slice(1);
        const detail = steps.length
          ? '<details class="wb-analysis" open><summary><span>선택지 비교 · FULL REASONING</span><b>' + steps.length + '단계</b></summary>'
            + '<div class="wb-analysis-list">' + steps.map((s, k) => '<div class="wb-analysis-step"' + para(k + 1) + '><span>'
              + String(k + 1).padStart(2, '0') + '</span><p' + pc + '>' + s + '</p></div>').join('')
            + '</div></details>' : '';
        return '<article class="wb-why wb-why-topik ok"><div class="wb-topik-status"><span>정답 · CORRECT</span><b>정답 · ANSWER</b></div>'
          + '<div class="wb-why-head"><span class="wb-why-n">' + esc(it.n) + ')</span><div class="wb-why-lines">' + sentence + '</div></div>'
          + '<div class="wb-topik-meaning"><span>뜻 · MEANING</span><p' + at(p + '.en') + '>' + fmt(it, 'en', tr(it, 'en') || '') + '</p></div>'
          + '<div class="wb-learn-grid">'
          + (lead ? '<section class="wb-learn-card wb-learn-clue"' + para(0) + '><span>01 · 핵심 단서 · WHAT TO NOTICE</span><p' + pc + '>' + lead + '</p></section>' : '')
          + (tr(it, 'grammar') ? '<section class="wb-learn-card wb-learn-rule"' + at(p + '.grammar') + '><span>02 · 문법 포인트 · RULE</span><p>'
            + fmt(it, 'grammar', tr(it, 'grammar')) + '</p></section>' : '')
          + extras(it, p).map((x, n) => '<section class="wb-learn-card wb-learn-extra"><span>' + String(n + 3).padStart(2, '0')
            + (x.title ? ' · <b' + at(x.path + '.labelEn') + '>' + x.title + '</b>' : '') + '</span>'
            + '<p' + at(x.path + '.noteEn') + '>' + x.body(false) + '</p></section>').join('')
          + '</div>' + detail + '</article>';
      }

      // A question's own fields (item.extra), as the game draws them — with each one's path, and
      // with one not yet written shown as a hint here, so it can be found and clicked.
      function extras(it, p) {
        return (Array.isArray(it.extra) ? it.extra : []).map((x, k) => {
          if (!x) return null;
          const body = tr(x, 'noteEn');
          const title = String(tr(x, 'labelEn') || '').trim();
          return {
            path: p + '.extra.' + k,
            title: title ? fmt(x, 'labelEn', title) : '',
            body: (block) => (String(body || '').trim() ? fmt(x, 'noteEn', body, block)
              : '<span class="hv-empty-hint">✎ …</span>')
          };
        }).filter(Boolean);
      }
    }

    // The sentence a row reads as, blanks filled or empty — js/ui.js wbLineHtml, with paths.
    function lineHtml(e, item, chipTextV, o) {
      const blank = (t) => (o.plain ? '<b>' + esc(t) + '</b>'
        : (t ? '<b class="wb-blank filled">' + esc(t) + '</b>' : '<span class="wb-blank empty">&nbsp;</span>'));
      if (e.type === 'build' || e.type === 'dialogue') {
        const texts = [chipTextV || '', o.second || ''];
        let slot = 0;
        return (item.lines || []).map((line, li) => {
          const rich = R.fieldParts(line, 'ko', line.ko || '', { lang });
          const parts = rich ? rich.parts : String(line.ko || '').split('{}');
          const piece = (s) => (rich ? (s || '') : esc(s || ''));
          let html = piece(parts[0]);
          for (let k = 1; k < parts.length; k++) html += blank(texts[slot++]) + piece(parts[k]);
          if (rich) html = rich.open + html + rich.close;
          const path = at(o.path + '.lines.' + li + '.ko');
          return line.who
            ? '<div class="wb-dlg"><span class="wb-spk"' + (line.who.length > 1 ? ' data-name="1"' : '') + '>' + esc(line.who) + '</span>'
              + '<span class="wb-line"' + path + '>' + html + '</span></div>'
            : '<div class="wb-line-solo"' + path + '>' + html + '</div>';
        }).join('');
      }
      const stemPath = at(o.path + '.stemKo');
      if (e.type === 'match') {
        const left = item.img ? '<img class="wb-photo" src="' + esc(item.img) + '" alt="">' : fmt(item, 'stemKo', item.stemKo);
        return '<span class="wb-left"' + (item.img ? '' : stemPath) + '>' + left + '</span><span class="wb-join">→</span>' + blank(chipTextV);
      }
      if (e.type === 'experience') {
        return '저는 <span' + stemPath + '>' + fmt(item, 'stemKo', item.stemKo) + '</span> ' + blank(chipTextV) + ' 적이 '
          + (o.plain ? '<b>있어요</b>' : '<span class="wb-blank empty own">&nbsp;</span>') + '.';
      }
      const stem = String(item.stemKo || '');
      if (stem.indexOf('{}') >= 0) {
        const rich = R.fieldParts(item, 'stemKo', stem, { lang });
        const inner = rich ? rich.open + (rich.parts[0] || '') + blank(chipTextV) + rich.parts.slice(1).join('') + rich.close
          : esc(stem.split('{}')[0]) + blank(chipTextV) + esc(stem.split('{}').slice(1).join(''));
        return '<span' + stemPath + '>' + inner + '</span>';
      }
      return '<span' + stemPath + '>' + fmt(item, 'stemKo', stem) + '</span> ' + blank(chipTextV) + '.';
    }

    function chip(e, id) { return (e.bank || []).find((c) => c.id === id) || null; }
    function chipText(c) { return c ? (c.dict || ((c.mark ? c.mark + ' ' : '') + (c.ko || ''))) : ''; }
    function answerText(c) { return c ? (c.polite || c.ko || '') : ''; }
    function choice(it, id, slot) { return ((slot === 2 ? it.choices2 : it.choices) || []).find((c) => c.id === id) || null; }

    // The automatic hover meanings: the world's words plus the design's glossary, less its
    // hidden words — js/ui.js wbGlossTable and wbApplyGloss.
    function applyGloss(rootEl) {
      if (!rootEl) return;
      const map = new Map();
      const head = new Map();
      R.glossEntries(design, lang).forEach((g) => { if (g.ko.length >= 2 && !map.has(g.ko)) map.set(g.ko, g.gloss); });
      const hide = new Set((design && design.glossHide) || []);
      ((m.world && m.world.words) || []).forEach((w) => {
        const gloss = String(tr(w, 'en') || '').trim();
        if (!gloss) return;
        const ko = String(w.ko || '').trim();
        [ko].concat(Array.isArray(w.forms) ? w.forms : []).forEach((k) => {
          const key = String(k || '').trim();
          if (key.length < 2 || map.has(key) || hide.has(key)) return;
          map.set(key, gloss);
          if (key !== ko) head.set(key, ko);
        });
      });
      if (!map.size) return;
      const keys = [...map.keys()].sort((a, b) => b.length - a.length);
      const re = new RegExp(keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
      const walker = doc.createTreeWalker(rootEl, win.NodeFilter.SHOW_TEXT, null);
      const targets = [];
      let node;
      while ((node = walker.nextNode())) {
        if (node.parentElement && node.parentElement.closest('.wb-gl')) continue;
        re.lastIndex = 0;
        if (re.test(node.nodeValue)) targets.push(node);
      }
      targets.forEach((n) => {
        const text = n.nodeValue;
        const frag = doc.createDocumentFragment();
        let pos = 0;
        let mm;
        re.lastIndex = 0;
        while ((mm = re.exec(text))) {
          if (mm.index > pos) frag.appendChild(doc.createTextNode(text.slice(pos, mm.index)));
          const span = doc.createElement('span');
          span.className = 'wb-gl hv-auto-gl';
          span.setAttribute('data-gl', map.get(mm[0]));
          if (head.has(mm[0])) span.setAttribute('data-ko', head.get(mm[0]));
          span.setAttribute('tabindex', '0');
          span.textContent = mm[0];
          frag.appendChild(span);
          pos = mm.index + mm[0].length;
        }
        if (pos < text.length) frag.appendChild(doc.createTextNode(text.slice(pos)));
        n.parentNode.replaceChild(frag, n);
      });
    }
  }

  function markSelection(win, selected) {
    const doc = win.document;
    doc.querySelectorAll('.hv-sel').forEach((el) => el.classList.remove('hv-sel'));
    if (!selected) return;
    const sel = selected.block
      ? doc.querySelector('[data-hv-block="' + selected.block + '"]')
      : (selected.path ? doc.querySelector('[data-hv-edit="' + selected.path + '"]') : null);
    if (sel) {
      sel.classList.add('hv-sel');
      if (selected.scroll) sel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    // A field the page draws in pieces — an exam explanation, paragraph by paragraph — chosen
    // whole: every piece of it.
    if (!selected.path) return;
    const pieces = doc.querySelectorAll('[data-hv-edit^="' + selected.path + '#"]');
    pieces.forEach((el) => el.classList.add('hv-sel'));
    if (selected.scroll && pieces[0]) pieces[0].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  // The text nodes a reader can see on the page — not those in a part the view hides.
  function shownTextNodes(win) {
    const doc = win.document;
    const panel = doc.getElementById('workbook-panel');
    const out = [];
    if (!panel) return out;
    const walker = doc.createTreeWalker(panel, win.NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      const p = node.parentElement;
      if (p && node.nodeValue.trim() && p.getClientRects().length) out.push(node);
    }
    return out;
  }

  // What the page reads as, one text node per line, for counting a word on it — the Meanings
  // tab's "×2 on the page".
  function visibleText(win) {
    return win && win.document ? shownTextNodes(win).map((n) => n.nodeValue).join('\n') : '';
  }

  // Every place `word` is written on the page, marked for the Meanings tab — with the CSS Custom
  // Highlight API where the browser has it (nothing in the page changes), else by tinting the
  // element each sits in. With `at`, that one (counting round) is scrolled into view and marked
  // as the current one. No word takes the marks away. Returns how many places there are.
  function findWord(win, word, at) {
    const doc = win && win.document;
    if (!doc) return 0;
    const hl = win.CSS && win.CSS.highlights && typeof win.Highlight === 'function' ? win.CSS.highlights : null;
    if (hl) { hl.delete('hv-find'); hl.delete('hv-find-now'); }
    doc.querySelectorAll('.hv-find-el, .hv-find-now').forEach((n) => n.classList.remove('hv-find-el', 'hv-find-now'));
    const w = String(word || '').trim();
    if (!w) return 0;
    const ranges = [];
    shownTextNodes(win).forEach((node) => {
      const t = node.nodeValue;
      for (let i = t.indexOf(w); i >= 0; i = t.indexOf(w, i + w.length)) {
        const r = doc.createRange();
        r.setStart(node, i);
        r.setEnd(node, i + w.length);
        ranges.push(r);
      }
    });
    if (!ranges.length) return 0;
    if (hl) hl.set('hv-find', new win.Highlight(...ranges));
    else ranges.forEach((r) => r.startContainer.parentElement.classList.add('hv-find-el'));
    if (at !== undefined && at !== null) {
      const r = ranges[((at % ranges.length) + ranges.length) % ranges.length];
      const p = r.startContainer.parentElement;
      p.scrollIntoView({ block: 'center', behavior: 'smooth' });
      if (hl) {
        const now = new win.Highlight(r);
        now.priority = 1;
        hl.set('hv-find-now', now);
      } else p.classList.add('hv-find-now');
    }
    return ranges.length;
  }

  window.HVDesignerPreview = { mount, render, markSelection, srcdoc, findWord, visibleText, headline, questionClasses };
}());
