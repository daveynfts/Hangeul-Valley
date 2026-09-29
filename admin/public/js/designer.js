/**
 * The Designer tab — edit a study-desk page the way it looks, not the way it is stored.
 *
 * Pick a bank and a page; the page is drawn beside the editor by the game's own stylesheets
 * (js/designerPreview.js). Click any sentence on it and it opens in a rich text box — bold,
 * italic, size, colour, highlight, font, a meaning to hover, a reading above — with the whole
 * field's size, alignment, box and colour beside it. The Page panel sets the theme, width, zoom,
 * question columns and Korean font; Blocks places text boxes, pictures and dividers between the
 * page's sections; Meanings manages the hover glossary; Question edits the rows themselves —
 * every exercise type, including the per-question ones the Workbooks tab can only list.
 *
 * What is saved is the bank file, through the same registry and validator as every other save
 * (admin/lib/workbook.js). The formatting is an overlay beside each field (`fmt`) and a `design`
 * on a page or the bank — js/richText.js explains why it never goes inside the text. Wording
 * edited here does change the text itself, and only when the words change: formatting a
 * sentence leaves the string its translation and its recording are filed under exactly as it was.
 */
(function () {
  'use strict';

  const S = {
    booted: false,
    assetBase: '/',
    banks: [],
    labels: {},
    key: null,
    rel: '',
    bank: null,
    saved: '',
    exIndex: -1,
    view: 'questions',
    // Vietnamese first: prose is written in Vietnamese and Claude writes the English after it
    // (admin/public/js/viFirst.js, docs/vietnamese-first.md). EN shows and styles the English.
    lang: 'vi',
    device: 'desktop',
    tab: 'text',
    sel: null,
    row: -1,
    designScope: 'page',
    history: [],
    future: [],
    world: null,
    viBank: null,
    viWorld: null,
    frameWin: null,
    editor: null,
    blockEditor: null,
    media: null,
    art: null,
    error: '',
    busy: false
  };

  const el = (id) => document.getElementById(id);
  const R = () => window.HVRich;
  // The panel's Vietnamese (admin/public/js/lang.js); English when that is not loaded.
  const T = (s, vars) => (typeof window.T === 'function' ? window.T(s, vars)
    : String(s).replace(/\{(\w+)\}/g, (m, n) => (vars && n in vars ? String(vars[n]) : m)));
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = (v) => JSON.parse(JSON.stringify(v));

  // ── Names shown in the panel ──────────────────────────────────────────────
  const THEME_INFO = {
    parchment: { label: 'Parchment', sw: ['#f6deaa', '#fff8e8', '#c4893a'] },
    notebook: { label: 'Notebook', sw: ['#fdfcf7', '#ffffff', '#818cf8'] },
    mint: { label: 'Mint', sw: ['#ecfdf5', '#f7fffb', '#10b981'] },
    sky: { label: 'Sky', sw: ['#eff6ff', '#f8fbff', '#3b82f6'] },
    blossom: { label: 'Blossom', sw: ['#fff1f5', '#fffafc', '#ec4899'] },
    lavender: { label: 'Lavender', sw: ['#f5f3ff', '#fbfaff', '#8b5cf6'] },
    sand: { label: 'Sand', sw: ['#faf6ee', '#fffdf8', '#a8844f'] }
  };
  const BOX_INFO = {
    note: ['📝', 'Note'], tip: ['💡', 'Tip'], info: ['ℹ️', 'Info'], warn: ['⚠️', 'Careful'], danger: ['❗', 'Important'],
    grammar: ['📐', 'Grammar'], example: ['🔎', 'Example'], quote: ['❝', 'Quote'], card: ['🃏', 'Card'], dashed: ['✂️', 'Dashed']
  };
  const BOX_HEX = { note: '#fff3d6', tip: '#ecfdf5', info: '#eff6ff', warn: '#fffbeb', danger: '#fef2f2', grammar: '#f7f0ff', example: '#eef4ff', quote: '#ffffff', card: '#fffdf7', dashed: '#ffffff' };
  const BOX_BD = { note: '#c4893a', tip: '#10b981', info: '#3b82f6', warn: '#f59e0b', danger: '#ef4444', grammar: '#a855f7', example: '#1e3a8a', quote: '#a16207', card: '#e8d5ae', dashed: '#c4893a' };
  const COLOR_HEX = { ink: '#1a1208', brown: '#7a3e12', red: '#b91c1c', orange: '#c2410c', green: '#15803d', teal: '#0f766e', blue: '#1d4ed8', purple: '#7e22ce', pink: '#be185d', gray: '#57534e' };
  const FONT_INFO = {
    sans: ['Noto Sans KR', "'Noto Sans KR', sans-serif"], serif: ['Myeongjo (serif)', "'Nanum Myeongjo', serif"],
    hand: ['Handwriting', "'Gaegu', cursive"], round: ['Rounded', "'Gowun Dodum', sans-serif"],
    display: ['Display', "'Do Hyeon', sans-serif"], mono: ['Monospace', "'Nanum Gothic Coding', monospace"]
  };
  const ANCHOR_LABEL = {
    top: 'Top of the page', instruction: 'After the instruction', example: 'After the example [보기]',
    items: 'After the questions', explain: 'With the answers (after checking)', bottom: 'Bottom of the page'
  };
  const BANK_ANCHOR_LABEL = { top: 'Top of the exercise list', bottom: 'Bottom of the exercise list' };
  const GLOSS_LABEL = {
    checked: ['After checking', 'The game’s usual rule: meanings appear once the answer is out, so they never point at the word a question turns on.'],
    always: ['Always', 'Meanings are there from the start — for a reading page or a word list. Refused on an exam bank.'],
    off: ['Off', 'No automatic meanings on this page. Meanings you write into the text yourself still show.']
  };
  const FIELD_LABEL = {
    instructionKo: 'Instruction (Korean)', instructionEn: 'Instruction', noteEn: 'Note above the questions',
    blurbEn: 'Line under the exercise on the list', pickKo: 'List heading (Korean)', pickEn: 'List heading',
    phraseKo: 'Phrase beside the picture', stemKo: 'Korean prompt', en: 'Meaning', why: 'Why this is the answer',
    grammar: 'Grammar note', ko: 'Korean'
  };
  const EN_FIELDS = ['instructionEn', 'noteEn', 'blurbEn', 'pickEn', 'en', 'why', 'grammar'];
  const MULTI_FIELDS = ['noteEn', 'why', 'grammar'];
  const TYPE_LABEL = {
    fill: 'Fill the blank from the box', match: 'Join two columns', dialogue: 'Complete a dialogue',
    experience: 'Pick the form, then answer for yourself', build: 'Build the line from its own choices'
  };

  // ── Paths into the bank ──────────────────────────────────────────────────
  function parts(path) { return String(path).split('.').map((p) => (/^\d+$/.test(p) ? Number(p) : p)); }
  function getAt(root, path) {
    if (!path) return root;
    return parts(path).reduce((o, k) => (o == null ? undefined : o[k]), root);
  }
  // "exercises.0.items.3.why#2": the third paragraph of that field, as an exam page draws it.
  function splitPara(path) {
    const m = /^(.*)#(\d+)$/.exec(String(path || ''));
    return m ? { path: m[1], para: Number(m[2]) } : { path: String(path || ''), para: -1 };
  }
  function splitField(path) {
    const ps = String(path).split('.');
    return { obj: ps.slice(0, -1).join('.'), field: ps[ps.length - 1] };
  }
  function labelFor(fullPath) {
    const { path, para } = splitPara(fullPath);
    const p = parts(path);
    const field = p[p.length - 1];
    const bits = [];
    const qi = p.indexOf('items');
    if (qi >= 0) {
      const item = getAt(S.bank, p.slice(0, qi + 2).join('.'));
      bits.push(T('Question {n}', { n: (item && item.n) || (p[qi + 1] + 1) }));
    }
    if (p.indexOf('example') >= 0) bits.push(T('Example [보기]'));
    const xi = p.indexOf('extra');
    if (xi >= 0) {
      bits.push(T('Custom field {n}', { n: p[xi + 1] + 1 }));
      bits.push(T(field === 'labelEn' ? 'Heading' : 'Content'));
      return bits.join(' · ');
    }
    const li = p.indexOf('lines');
    if (li >= 0) {
      const line = getAt(S.bank, p.slice(0, li + 2).join('.'));
      bits.push(T('line {n}', { n: p[li + 1] + 1 }) + (line && line.who ? ' (' + line.who + ')' : ''));
      return bits.join(' · ');
    }
    const ci = p.indexOf('choices') >= 0 ? p.indexOf('choices') : p.indexOf('choices2');
    if (ci >= 0) { bits.push((p[ci] === 'choices2' ? T('second blank') + ' · ' : '') + T('button {n}', { n: p[ci + 1] + 1 })); return bits.join(' · '); }
    bits.push(FIELD_LABEL[field] ? T(FIELD_LABEL[field]) : field);
    if (para >= 0) bits.push(para === 0 ? T('What to notice') : T('Reasoning step {n}', { n: para }));
    return bits.join(' · ');
  }
  // A field the game reads a translation for — prose written for the learner, not Korean.
  const isEn = (field, obj) => (window.HVViFirst
    ? (obj ? window.HVViFirst.isProse(obj, field) : window.HVViFirst.isText(field))
    : EN_FIELDS.indexOf(field) >= 0);

  function ex() { return S.exIndex >= 0 && S.bank ? (S.bank.exercises || [])[S.exIndex] || null : null; }
  function dirty() { return !!S.bank && JSON.stringify(S.bank) !== S.saved; }

  // ── History ──────────────────────────────────────────────────────────────
  // A snapshot of the bank after each change. Typing into one field within a moment of the
  // last keystroke folds into the same step, so undo takes back a word, not a letter.
  function commit(key) {
    const snap = JSON.stringify(S.bank);
    const top = S.history[S.history.length - 1];
    if (top && top.snap === snap) { afterChange(); return; }
    const now = Date.now();
    if (top && key && top.key === key && now - top.t < 1200 && S.history.length > 1) { top.snap = snap; top.t = now; }
    else S.history.push({ snap, key: key || null, t: now });
    if (S.history.length > 200) S.history.shift();
    S.future = [];
    afterChange();
  }
  function undo() {
    if (S.history.length < 2) return;
    S.future.push(S.history.pop());
    S.bank = JSON.parse(S.history[S.history.length - 1].snap);
    restoreView();
  }
  function redo() {
    if (!S.future.length) return;
    const next = S.future.pop();
    S.history.push(next);
    S.bank = JSON.parse(next.snap);
    restoreView();
  }
  function restoreView() {
    if (S.exIndex >= (S.bank.exercises || []).length) S.exIndex = -1;
    if (S.sel && S.sel.path && getAt(S.bank, splitPara(S.sel.path).path) === undefined) S.sel = null;
    renderToolbar();
    renderInspector();
    schedulePreview();
  }
  function afterChange() {
    renderToolbar();
    schedulePreview();
  }

  // One redraw for a burst of changes. A timer rather than requestAnimationFrame, which never
  // fires while the window is behind another one — and then the page stopped following edits.
  let previewQueued = false;
  function schedulePreview() {
    if (previewQueued) return;
    previewQueued = true;
    setTimeout(() => { previewQueued = false; drawPreview(); }, 30);
  }

  // ── Formatting on the model ──────────────────────────────────────────────
  function specOf(obj, field) { return (obj && obj.fmt && obj.fmt[field]) || null; }
  function setSpec(obj, field, key, value) {
    obj.fmt = obj.fmt || {};
    const spec = obj.fmt[field] || {};
    if (value === undefined || value === null || value === '' || value === false) delete spec[key];
    else spec[key] = value;
    if (Object.keys(spec).length) obj.fmt[field] = spec; else delete obj.fmt[field];
    if (!Object.keys(obj.fmt).length) delete obj.fmt;
  }
  // A plain edit to a field that carries formatting would leave the overlay reading different
  // words, which the validator refuses — so the overlay's text goes, and its block styles stay.
  function plainEdit(obj, field, value) {
    if (obj[field] === value) return;
    obj[field] = value;
    const spec = specOf(obj, field);
    if (spec && spec.html && !R().matches(spec.html, value)) setSpec(obj, field, 'html', null);
  }

  function designTarget(scope) {
    const e = ex();
    return scope === 'bank' || !e ? S.bank : e;
  }
  function setDesign(target, key, value) {
    target.design = target.design || {};
    if (value === undefined || value === null || value === '') delete target.design[key];
    else target.design[key] = value;
    if (!Object.keys(target.design).length) delete target.design;
  }
  function blocksOf(target) { return (target.design && target.design.blocks) || []; }
  function setBlocks(target, list) { setDesign(target, 'blocks', list.length ? list : undefined); }

  // ── Loading ──────────────────────────────────────────────────────────────
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Could not load ' + src));
      document.head.appendChild(s);
    });
  }
  function loadCss(href) {
    if (document.querySelector('link[data-dz="' + href + '"]')) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    l.setAttribute('data-dz', href);
    document.head.appendChild(l);
  }

  async function boot() {
    const host = (window.AppState && window.AppState.host) || {};
    S.assetBase = host.assetBase || (/^\/admin(\/|$)/.test(location.pathname) ? '/' : '/game/');
    loadCss(S.assetBase + 'css/rich.css');
    loadCss('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&family=Be+Vietnam+Pro:wght@400;600;700&display=swap');
    if (!window.HVRich) await loadScript(S.assetBase + 'js/richText.js');
    const list = await window.apiFetch.listWorkbooks();
    S.banks = (list && list.data) || [];
    S.labels = (window.AppState && window.AppState.bankLabels) || {};
    S.booted = true;
    window.addEventListener('beforeunload', (e) => { if (dirty()) { e.preventDefault(); e.returnValue = ''; } });
    document.addEventListener('keydown', (e) => {
      if ((window.AppState || {}).currentTab !== 'designer') return;
      const inText = e.target && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); return; }
      if (inText) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
    });
  }

  function worldFor(key) {
    let m = /^unit(\d+)/.exec(key);
    if (m) return '2b-unit-' + m[1];
    m = /^review(\d+)/.exec(key);
    if (m) return { 4: '2b-unit-12', 5: '2b-unit-15', 6: '2b-unit-18' }[m[1]] || null;
    if (/^topik2/.test(key)) return 'topik-2';
    m = /^recipe(\d+)/.exec(key);
    if (m) return 'recipe-unit-' + m[1];
    return null;
  }

  async function loadBank(key, keepPlace) {
    if (dirty() && !window.confirm('This bank has unsaved changes. Open another one anyway?')) return false;
    S.busy = true;
    renderToolbar();
    try {
      const r = await window.apiFetch.getContent('bank/' + key);
      S.key = key;
      S.rel = String(r.data.rel || '').split('\\').join('/');
      S.bank = r.data.body;
      S.saved = JSON.stringify(S.bank);
      S.history = [{ snap: S.saved, key: null, t: Date.now() }];
      S.future = [];
      if (!keepPlace) { S.exIndex = -1; S.sel = null; S.row = -1; }
      S.error = '';
      S.world = null;
      S.viBank = null;
      S.viWorld = null;
      loadWorld(key);
      // Both languages need the catalogue: VI shows the Vietnamese it holds, EN the state of
      // each English line against it.
      await loadTranslations();
    } finally {
      S.busy = false;
    }
    renderAll();
    return true;
  }

  async function loadWorld(key) {
    const id = worldFor(key);
    if (!id) return;
    try {
      const r = await window.apiFetch.getContent('world/' + id);
      const body = r.data.body || {};
      S.world = { worldId: id, words: (body.level && body.level.words) || [] };
      await loadTranslations();
      schedulePreview();
      if (S.tab === 'gloss') renderInspector();
    } catch (e) { S.world = null; }
  }

  // The Vietnamese catalogues, folded by the game's own i18n code inside the preview.
  async function fetchCatalog(rel) {
    try {
      const r = await fetch(S.assetBase + 'locales/vi/' + rel + '?t=' + Date.now(), { cache: 'no-store' });
      return r.ok ? await r.json() : null;
    } catch (e) { return null; }
  }
  async function loadTranslations() {
    S.viCat = await fetchCatalog(S.rel);
    S.viWorldCat = S.world ? await fetchCatalog('worlds/' + S.world.worldId + '.json') : null;
  }
  function folded() {
    const win = S.frameWin;
    if (S.lang !== 'vi' || !win || typeof win.hvLocalize !== 'function') return { bank: S.bank, world: S.world };
    const bank = clone(S.bank);
    if (S.viCat) { win.hvRegisterCatalog(S.rel, S.viCat); win.hvLocalize(S.rel, bank, 'vi'); }
    let world = S.world;
    if (S.world && S.viWorldCat) {
      const rel = 'worlds/' + S.world.worldId + '.json';
      const body = { level: { words: clone(S.world.words) } };
      win.hvRegisterCatalog(rel, S.viWorldCat);
      win.hvLocalize(rel, body, 'vi');
      world = { worldId: S.world.worldId, words: body.level.words };
    }
    return { bank, world };
  }
  // The Vietnamese a field reads as: the author's draft, else what the catalogue files.
  const VF = () => window.HVViFirst;
  function entries() { return (S.viCat && S.viCat.entries) || {}; }
  function viText(path) {
    const { obj, field } = splitField(path);
    const o = getAt(S.bank, obj);
    return o ? VF().viOf(o, field, entries()) : '';
  }
  const owed = () => window.HVViField.owed(S.bank);
  // What the English of a field is waiting for, as a chip — the one the other forms show.
  const stateChip = (obj, field) => window.HVViField.chip(obj, field, entries());

  // ── Saving ───────────────────────────────────────────────────────────────
  async function save() {
    if (!S.bank || S.busy) return;
    if (!dirty()) { window.Toast.info('Nothing has changed since the last save.', 'Designer'); return; }
    S.busy = true;
    S.error = '';
    renderToolbar();
    try {
      const r = await window.apiFetch.saveContent('bank/' + S.key, S.bank);
      const d = r.data || {};
      S.bank = d.body;
      S.saved = JSON.stringify(S.bank);
      S.history.push({ snap: S.saved, key: null, t: Date.now() });
      window.Toast.success(esc(T(d.note || 'Saved.')) + (d.branch ? ' ' + esc(T('Branch: {b}.', { b: d.branch })) : ''), esc(T('Saved {rel}', { rel: d.rel || '' })));
      // What the save leaves for Claude, said once, so the English is not forgotten.
      window.HVViField.toastOwed(owed());
    } catch (e) {
      S.error = e.message || String(e);
    } finally {
      S.busy = false;
    }
    restoreView();
  }

  // Take the reader to what a refusal names: "Exercise 3 item 2: …".
  function goToError() {
    const m = /Exercise (\d+)(?: item (\d+))?/.exec(S.error);
    if (!m) return;
    S.exIndex = Number(m[1]) - 1;
    S.row = m[2] ? Number(m[2]) - 1 : -1;
    S.sel = null;
    S.tab = 'question';
    renderAll();
  }

  // ── The page frame ───────────────────────────────────────────────────────
  function shell() {
    const root = el('designer-root');
    root.innerHTML =
      '<div class="dz-bar" id="dz-bar"></div>'
      + '<div class="dz-error hidden" id="dz-error"></div>'
      + '<div class="dz-main">'
      + '<div class="dz-stage"><div class="dz-frame-wrap" id="dz-frame-wrap"><iframe id="dz-frame" class="dz-frame" title="Page preview"></iframe></div>'
      + '<div class="dz-stage-hint">Click any text on the page to edit it · Click a question row to edit the question</div></div>'
      + '<aside class="dz-side"><div class="dz-tabs" id="dz-tabs"></div><div class="dz-panel" id="dz-panel"></div></aside>'
      + '</div>'
      + '<div class="dz-modal hidden" id="dz-modal"></div>';
  }

  function renderAll() {
    renderToolbar();
    renderInspector();
    drawPreview();
    fitHeight();
  }

  // The stage and the panel fill the window below the bar, however many lines the admin's
  // header and the Designer's own bar wrapped onto.
  function fitHeight() {
    const main = document.querySelector('.dz-main');
    if (!main) return;
    const top = main.getBoundingClientRect().top + window.scrollY;
    const h = Math.max(480, window.innerHeight - Math.max(0, top - window.scrollY) - 16);
    main.style.setProperty('--dz-h', h + 'px');
  }
  window.addEventListener('resize', () => { if ((window.AppState || {}).currentTab === 'designer') fitHeight(); });

  function renderToolbar() {
    const bar = el('dz-bar');
    if (!bar) return;
    const e = ex();
    const pages = S.bank ? (S.bank.exercises || []) : [];
    const n = owed();
    bar.innerHTML =
      '<div class="dz-bar-row">'
      + '<label class="dz-pick">Bank <select id="dz-bank" translate="no">' + S.banks.map((k) =>
        '<option value="' + esc(k) + '"' + (k === S.key ? ' selected' : '') + '>' + esc(S.labels[k] || k) + '</option>').join('') + '</select></label>'
      + '<label class="dz-pick dz-grow">Page <select id="dz-page" translate="no"' + (S.bank ? '' : ' disabled') + '>'
      + '<option value="-1"' + (S.exIndex < 0 ? ' selected' : '') + '>📋 ' + esc(T('The exercise list (bank page)')) + '</option>'
      + pages.map((p, i) => '<option value="' + i + '"' + (i === S.exIndex ? ' selected' : '') + '>'
        + esc((p.icon || '📝') + ' ' + (p.section || '') + ' · ' + (p.no || '') + (p.pattern ? ' — ' + p.pattern : '') + '  (' + (p.items || []).length + ' Q)')
        + '</option>').join('') + '</select></label>'
      + seg('dz-view', [['questions', 'Questions'], ['answers', 'Answers']], S.view, !e)
      + '<span class="dz-pick" title="' + esc(T('Write the content in Vietnamese; Claude writes the English from it. EN shows and styles the English.')) + '">'
      + 'Content ' + seg('dz-lang', [['vi', 'VI'], ['en', 'EN']], S.lang) + '</span>'
      + (n ? '<span class="dz-owed" title="' + esc(T('{n} English line(s) wait for Claude. Ask: “dịch phần tiếng Anh đang chờ”.', { n })) + '">⏳ ' + n + '</span>' : '')
      + seg('dz-device', [['desktop', '🖥'], ['tablet', '▭'], ['phone', '📱']], S.device)
      + '<span class="dz-sep"></span>'
      + '<button type="button" class="btn btn-secondary btn-sm" id="dz-undo" title="Undo (Ctrl+Z)"' + (S.history.length > 1 ? '' : ' disabled') + '>↶</button>'
      + '<button type="button" class="btn btn-secondary btn-sm" id="dz-redo" title="Redo (Ctrl+Y)"' + (S.future.length ? '' : ' disabled') + '>↷</button>'
      + '<a class="btn btn-secondary btn-sm" id="dz-game" target="_blank" rel="noopener" href="' + esc((window.AppState || {}).gameUrl || '/') + '" title="Open the game (saved content only)">Game ↗</a>'
      + '<span class="dz-dirty">' + (S.busy ? 'Working…' : (dirty() ? '● Unsaved' : (S.bank ? '✓ Saved' : ''))) + '</span>'
      + '<button type="button" class="btn btn-primary btn-sm" id="dz-save"' + (S.bank && dirty() && !S.busy ? '' : ' disabled') + ' title="Save (Ctrl+S)">💾 Save</button>'
      + '</div>';
    const box = el('dz-error');
    if (box) {
      box.classList.toggle('hidden', !S.error);
      box.innerHTML = S.error ? '<b>Not saved.</b> ' + esc(S.error)
        + (/Exercise \d+/.test(S.error) ? ' <button type="button" class="dz-link" id="dz-goerr">Show me →</button>' : '')
        + ' <button type="button" class="dz-link" id="dz-closeerr">Dismiss</button>' : '';
      const go = el('dz-goerr');
      if (go) go.onclick = goToError;
      const cl = el('dz-closeerr');
      if (cl) cl.onclick = () => { S.error = ''; renderToolbar(); };
    }
    el('dz-bank').onchange = (ev) => { const k = ev.target.value; loadBank(k).then((ok) => { if (!ok) ev.target.value = S.key; }); };
    const page = el('dz-page');
    if (page) page.onchange = (ev) => openPage(Number(ev.target.value));
    bindSeg('dz-view', (v) => { S.view = v; drawPreview(); });
    bindSeg('dz-lang', async (v) => {
      S.lang = v;
      if (!S.viCat) await loadTranslations();
      renderInspector();
      drawPreview();
    });
    bindSeg('dz-device', (v) => { S.device = v; layoutFrame(); });
    el('dz-undo').onclick = undo;
    el('dz-redo').onclick = redo;
    el('dz-save').onclick = save;
  }

  function seg(id, opts, cur, disabled) {
    return '<div class="dz-seg" id="' + id + '">' + opts.map(([v, l]) =>
      '<button type="button" data-v="' + v + '" class="' + (v === cur ? 'on' : '') + '"' + (disabled ? ' disabled' : '') + '>' + l + '</button>').join('') + '</div>';
  }
  function bindSeg(id, fn) {
    const box = el(id);
    if (!box) return;
    box.querySelectorAll('button[data-v]').forEach((b) => { b.onclick = () => { if (!b.disabled) { box.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); fn(b.getAttribute('data-v')); } }; });
  }

  function openPage(i) {
    S.exIndex = i;
    S.sel = null;
    S.row = -1;
    if (i < 0) S.view = 'questions';
    renderAll();
  }

  // ── The preview ──────────────────────────────────────────────────────────
  let mounting = null;
  async function ensureFrame() {
    const frame = el('dz-frame');
    if (!frame) return null;
    if (S.frameWin && frame.contentWindow === S.frameWin && S.frameWin.HVRich) return S.frameWin;
    if (!mounting) {
      mounting = window.HVDesignerPreview.mount(frame, S.assetBase).then((win) => {
        S.frameWin = win;
        mounting = null;
        win.document.addEventListener('click', onFrameClick, true);
        return win;
      });
    }
    return mounting;
  }

  async function drawPreview() {
    if (!S.bank) return;
    const win = await ensureFrame();
    if (!win || !win.HVRich) return;
    layoutFrame();
    const f = folded();
    try {
      window.HVDesignerPreview.render(win, {
        bank: f.bank, exIndex: S.exIndex, view: S.view, lang: S.lang, world: f.world,
        selected: S.sel, row: S.row
      });
    } catch (e) {
      console.error('[designer] preview failed', e);
    }
  }

  function layoutFrame() {
    const wrap = el('dz-frame-wrap');
    if (!wrap) return;
    wrap.className = 'dz-frame-wrap dz-dev-' + S.device;
  }

  function onFrameClick(e) {
    const t = e.target;
    const open = t.closest('[data-hv-open]');
    if (open && S.exIndex < 0) { e.preventDefault(); openPage(Number(open.getAttribute('data-hv-open'))); return; }
    const blk = t.closest('[data-hv-block]');
    const edit = t.closest('[data-hv-edit]');
    const row = t.closest('[data-hv-row]');
    if (t.closest('.wb-gl') && !edit) return;
    e.preventDefault();
    e.stopPropagation();
    if (edit && (!blk || blk.contains(edit))) {
      selectField(edit.getAttribute('data-hv-edit'));
      return;
    }
    if (blk) { S.sel = { block: blk.getAttribute('data-hv-block') }; S.tab = 'blocks'; renderInspector(); drawPreview(); return; }
    if (row) { S.row = Number(row.getAttribute('data-hv-row')); S.sel = null; S.tab = 'question'; renderInspector(); drawPreview(); }
  }

  function selectField(path) {
    S.sel = { path };
    const qi = parts(path).indexOf('items');
    if (qi >= 0) S.row = parts(path)[qi + 1];
    S.tab = 'text';
    renderInspector();
    drawPreview();
  }

  // ── The inspector ────────────────────────────────────────────────────────
  const TABS = [['text', '✏️ Text'], ['page', '🎨 Page'], ['blocks', '🧱 Blocks'], ['gloss', '💬 Meanings'], ['question', '❓ Question']];

  function renderInspector() {
    const tabs = el('dz-tabs');
    const panel = el('dz-panel');
    if (!tabs || !panel) return;
    tabs.innerHTML = TABS.map(([k, l]) => '<button type="button" data-tab="' + k + '" class="' + (k === S.tab ? 'on' : '') + '">' + l + '</button>').join('');
    tabs.querySelectorAll('button').forEach((b) => { b.onclick = () => { S.tab = b.getAttribute('data-tab'); renderInspector(); }; });
    if (S.editor) { S.editor.destroy(); S.editor = null; }
    if (S.blockEditor) { S.blockEditor.destroy(); S.blockEditor = null; }
    if (!S.bank) { panel.innerHTML = '<p class="dz-muted">Pick a bank to begin.</p>'; return; }
    if (S.tab === 'text') renderTextPanel(panel);
    else if (S.tab === 'page') renderPagePanel(panel);
    else if (S.tab === 'blocks') renderBlocksPanel(panel);
    else if (S.tab === 'gloss') renderGlossPanel(panel);
    else renderQuestionPanel(panel);
  }

  // The page's editable text, for jumping to a field without hunting for it on the page.
  function fieldList() {
    const out = [];
    const e = ex();
    const add = (path) => {
      const v = getAt(S.bank, path);
      if (typeof v !== 'string') return;
      const { obj, field } = splitField(path);
      if (v.trim() || VF().draftOf(getAt(S.bank, obj), field)) out.push(path);
    };
    if (!e) {
      add('pickKo'); add('pickEn');
      (S.bank.exercises || []).forEach((x, i) => add('exercises.' + i + '.blurbEn'));
      return out;
    }
    const b = 'exercises.' + S.exIndex;
    ['instructionKo', 'instructionEn', 'noteEn'].forEach((f) => add(b + '.' + f));
    if (e.example) {
      (e.example.lines || []).forEach((l, i) => add(b + '.example.lines.' + i + '.ko'));
      add(b + '.example.stemKo'); add(b + '.example.en');
    }
    (e.items || []).forEach((it, i) => {
      const p = b + '.items.' + i;
      add(p + '.phraseKo'); add(p + '.stemKo');
      (it.lines || []).forEach((l, k) => add(p + '.lines.' + k + '.ko'));
      (it.choices || []).forEach((c, k) => add(p + '.choices.' + k + '.ko'));
      (it.choices2 || []).forEach((c, k) => add(p + '.choices2.' + k + '.ko'));
      add(p + '.en'); add(p + '.why'); add(p + '.grammar');
      (it.extra || []).forEach((x, k) => { add(p + '.extra.' + k + '.labelEn'); add(p + '.extra.' + k + '.noteEn'); });
    });
    return out;
  }

  // A field split into its paragraphs — as text, and as html when its formatting lines up with
  // them paragraph for paragraph (`htmls` is null when it does not, and each paragraph then
  // starts again from its plain words).
  function paraModel(text, html) {
    const texts = R().textParagraphs(text);
    let htmls = null;
    if (html) {
      const h = R().paragraphsOf(html);
      if (h.length === texts.length && h.every((x, i) => R().matches(x, texts[i]))) htmls = h;
    }
    return { texts, htmls };
  }
  // The field again, with paragraph k replaced (a paragraph emptied is dropped, as a blank line
  // would leave nothing to draw) — text joined by a blank line, html by <br><br>.
  function joinParas(model, k, text, html) {
    const texts = model.texts.slice();
    const htmls = model.htmls ? model.htmls.slice() : model.texts.map((t) => R().fromText(t));
    texts[k] = String(text == null ? '' : text).trim();
    htmls[k] = html || R().fromText(texts[k]);
    const keep = texts.map((t, i) => i).filter((i) => texts[i]);
    return { text: keep.map((i) => texts[i]).join('\n\n'), html: keep.map((i) => htmls[i]).join('<br><br>') };
  }

  function renderTextPanel(panel) {
    const sel = S.sel && S.sel.path ? splitPara(S.sel.path) : null;
    const path = sel ? sel.path : null;
    const val = path ? getAt(S.bank, path) : undefined;
    if (!path || typeof val !== 'string') {
      const list = fieldList();
      panel.innerHTML = '<div class="dz-empty"><div class="dz-empty-icon">👆</div><p>Click any text on the page to edit and format it.</p></div>'
        + '<h4 class="dz-h">Or pick a field</h4><div class="dz-fieldlist">'
        + list.map((p) => {
          const { obj, field } = splitField(p);
          const o = getAt(S.bank, obj);
          const has = !!specOf(o, field);
          const shown = S.lang === 'vi' && isEn(field, o) ? (viText(p) || String(getAt(S.bank, p))) : String(getAt(S.bank, p));
          const owes = isEn(field, o) && VF().status(o, field, entries()) === 'todo';
          return '<button type="button" data-p="' + esc(p) + '"><span>' + esc(labelFor(p))
            + (has ? ' <em class="dz-fmt-dot" title="' + esc(T('Formatted')) + '">●</em>' : '')
            + (owes ? ' <em class="vf-owe-dot" title="' + esc(T('Waiting for Claude’s English')) + '">⏳</em>' : '') + '</span>'
            + '<small translate="no">' + esc(shown.slice(0, 70)) + '</small></button>';
        }).join('') + '</div>';
      panel.querySelectorAll('[data-p]').forEach((b) => { b.onclick = () => selectField(b.getAttribute('data-p')); });
      return;
    }
    const { obj: objPath, field } = splitField(path);
    const obj = getAt(S.bank, objPath);
    // A field written for the learner in English is written here in Vietnamese; its English
    // comes from Claude. Korean is the subject and is edited as itself in both modes.
    const en = isEn(field, obj);
    const viMode = S.lang === 'vi' && en;
    const enMode = S.lang === 'en' && en;
    const blanks = /\.(lines\.\d+\.ko|stemKo)$/.test(path) && val.indexOf('{}') >= 0;
    const spec = specOf(obj, field) || {};
    const viNow = en ? viText(path) : '';
    const layer = viMode ? 'vi' : 'html';
    const fullText = viMode ? viNow : val;
    const fullHtml = spec[layer] && R().matches(spec[layer], fullText) ? spec[layer] : '';
    // One paragraph of it, when a paragraph was picked on the page: the model is taken now, so
    // what the editor holds always replaces the paragraph it opened with — even once a blank
    // line typed into it has made two of it.
    const base = sel.para >= 0 ? paraModel(fullText, fullHtml) : null;
    const para = base && sel.para < base.texts.length ? sel.para : -1;
    if (base && para < 0) { S.sel = { path }; renderTextPanel(panel); return; }
    const shownText = para >= 0 ? base.texts[para] : fullText;
    const shownHtml = para >= 0 ? (base.htmls ? base.htmls[para] : '') : fullHtml;
    const warn = [];
    if (!viMode && spec.html && !R().matches(spec.html, val)) warn.push(T('The formatting here was written for different words and is not shown. Format it again.'));
    if (viMode && spec.vi && viNow && !R().matches(spec.vi, viNow)) warn.push(T('The Vietnamese styling was made for different words and is not shown. Style it again.'));
    // The other language beside it — the matching paragraph, when both have the same number.
    const otherText = viMode ? val : viNow;
    const otherParas = para >= 0 ? R().textParagraphs(otherText) : null;
    const otherShown = otherParas && otherParas.length === base.texts.length ? otherParas[para] : otherText;
    const companion = !en ? ''
      : '<div class="dz-companion"><div class="dz-companion-h"><b>' + (viMode ? 'English' : 'Tiếng Việt') + '</b>'
        + '<span id="dz-state-slot">' + stateChip(obj, field) + '</span></div>'
        + '<div class="dz-companion-t" translate="no">' + esc(otherShown || '—') + '</div>'
        + '<div class="dz-companion-a" id="dz-companion-a"></div></div>';
    // Moving between the paragraphs, adding one, removing one — the words can only be
    // changed where they are written, so not in Claude's English.
    const canWrite = !enMode;
    const paraBar = para < 0 ? ''
      : '<div class="dz-parabar">'
        + '<button type="button" class="dz-mini" data-pa="prev" title="' + esc(T('Previous paragraph')) + '"' + (para > 0 ? '' : ' disabled') + '>◀</button>'
        + '<span class="dz-parapos">' + esc(T('Paragraph {a} of {b}', { a: para + 1, b: base.texts.length })) + '</span>'
        + '<button type="button" class="dz-mini" data-pa="next" title="' + esc(T('Next paragraph')) + '"' + (para < base.texts.length - 1 ? '' : ' disabled') + '>▶</button>'
        + '<span class="dz-grow"></span>'
        + (canWrite ? '<button type="button" class="dz-link" data-pa="add">' + esc(T('＋ Add a step after this')) + '</button>'
          + '<button type="button" class="dz-link dz-danger-link" data-pa="del">' + esc(T('Delete this paragraph')) + '</button>' : '')
        + '<button type="button" class="dz-link" data-pa="whole">' + esc(T('Edit the whole field')) + '</button></div>';

    panel.innerHTML =
      '<div class="dz-field-head"><div><div class="dz-field-label">' + esc(labelFor(S.sel.path)) + '</div>'
      + '<div class="dz-field-path" translate="no">' + esc(S.sel.path) + '</div></div>'
      + '<span class="dz-chip dz-chip-' + (viMode ? 'vi' : (en ? 'en' : 'ko')) + '">' + (viMode ? 'VI' : (en ? 'EN · AI' : 'KO')) + '</span></div>'
      + paraBar
      + (warn.length ? '<div class="dz-warn">' + warn.map(esc).join('<br>') + '</div>' : '')
      + '<div id="dz-editor-host"></div>'
      + (viMode ? '<p class="dz-note">Write in Vietnamese — this is the text you own. Claude writes the English from it when you ask.</p>'
        : (enMode ? '<p class="dz-note">English is written by Claude from the Vietnamese. Style it here; to change what it says, change the Vietnamese or ask for a new English.</p>'
          : '<p class="dz-note">Korean text is spoken by the game’s voice and checked by the tests; formatting it is always safe.</p>'))
      + companion
      + '<h4 class="dz-h">Whole field</h4>'
      + styleControls(spec, 'fs')
      + '<div class="dz-row-actions"><button type="button" class="btn btn-secondary btn-sm" id="dz-clear-field">Remove all formatting from this field</button></div>';

    const paintActions = () => {
      const box = el('dz-companion-a');
      const slot = el('dz-state-slot');
      if (slot) slot.innerHTML = stateChip(getAt(S.bank, objPath), field);
      if (!box) return;
      const o = getAt(S.bank, objPath);
      const st = VF().status(o, field, entries());
      box.innerHTML = (st === 'ai' ? '<button type="button" class="dz-link" data-ca="read">✓ Mark the English as read</button>' : '')
        + (st !== 'todo' && st !== 'source' && (val || viNow) ? '<button type="button" class="dz-link" data-ca="ask">✍ Ask Claude for a new English</button>' : '')
        + (st === 'todo' && val ? '<button type="button" class="dz-link" data-ca="cancel">Keep the English as it is</button>' : '');
      box.querySelectorAll('[data-ca]').forEach((b) => {
        b.onclick = () => {
          const act = b.getAttribute('data-ca');
          if (act === 'read') VF().markReviewed(o, field);
          else if (act === 'ask') VF().requestEnglish(o, field);
          else VF().cancelRequest(o, field);
          commit();
          paintActions();
        };
      });
    };

    // Writes the field's text (whole) and its formatting in the layer being edited.
    const write = (o, text, html) => {
      const rich = html && R().isRich(html) ? R().sanitize(html) : null;
      if (viMode) {
        VF().setVi(o, field, text, entries());
        setSpec(o, field, 'vi', rich);
      } else if (enMode) {
        setSpec(o, field, 'html', rich);
      } else {
        if (R().norm(text) !== R().norm(o[field])) o[field] = text;
        setSpec(o, field, 'html', rich);
      }
    };

    S.editor = window.HVRichEditor.create(el('dz-editor-host'), {
      html: shownHtml,
      text: shownText,
      lang: viMode ? 'vi' : (en ? 'en' : 'ko'),
      placeholder: viMode ? T('Write the Vietnamese here…') : '',
      multiline: para >= 0 || MULTI_FIELDS.indexOf(field) >= 0 || /\.why$|\.grammar$|\.noteEn$/.test(path),
      keepBlanks: blanks,
      lockText: enMode,
      allowImages: MULTI_FIELDS.indexOf(field) >= 0,
      assetBase: S.assetBase,
      onPickImage: (cb) => openMedia(cb),
      onHistory: (dir) => (dir === 'redo' ? redo() : undo()),
      onChange: ({ html, text }) => {
        const o = getAt(S.bank, objPath);
        if (para >= 0) {
          const piece = R().isRich(html) ? R().sanitize(html) : '';
          const out = joinParas(base, para, enMode ? base.texts[para] : text, piece);
          write(o, out.text, out.html);
        } else {
          write(o, text, html);
        }
        commit('field:' + S.sel.path + ':' + S.lang);
        if (en) paintActions();
      }
    });
    if (en) paintActions();
    bindStyleControls(panel, 'fs', (k, v) => { setSpec(getAt(S.bank, objPath), field, k, v); commit(); renderInspector(); });
    panel.querySelectorAll('[data-pa]').forEach((b) => {
      b.onclick = () => {
        const act = b.getAttribute('data-pa');
        const o = getAt(S.bank, objPath);
        if (act === 'whole') { selectField(path); return; }
        if (act === 'prev' || act === 'next') { selectField(path + '#' + (para + (act === 'next' ? 1 : -1))); return; }
        const texts = base.texts.slice();
        const htmls = base.htmls ? base.htmls.slice() : base.texts.map((t) => R().fromText(t));
        if (act === 'add') {
          texts.splice(para + 1, 0, '…');
          htmls.splice(para + 1, 0, '…');
        } else {
          if (!window.confirm(T('Delete this paragraph?'))) return;
          texts.splice(para, 1);
          htmls.splice(para, 1);
        }
        write(o, texts.join('\n\n'), htmls.join('<br><br>'));
        commit();
        selectField(texts.length ? path + '#' + Math.min(act === 'add' ? para + 1 : Math.max(0, para - 1), texts.length - 1) : path);
      };
    });
    el('dz-clear-field').onclick = () => {
      const o = getAt(S.bank, objPath);
      const s = specOf(o, field);
      if (!s) return;
      // Only what is on screen: the layer being edited and the field's styles. The words' own
      // line breaks stay — they are the text, and the game draws them only from the layer.
      const kept = {};
      const other = layer === 'vi' ? 'html' : 'vi';
      if (s[other]) kept[other] = s[other];
      const now = viMode ? viNow : o[field];
      if (/\n/.test(String(now || ''))) kept[layer] = R().fromText(now);
      if (Object.keys(kept).length) o.fmt[field] = kept; else delete o.fmt[field];
      if (!Object.keys(o.fmt).length) delete o.fmt;
      commit();
      renderInspector();
    };
  }

  // Size, alignment, box, colour, font, bold and italic for a whole field or a block.
  function styleControls(spec, id, opts) {
    const o = opts || {};
    const s = spec || {};
    return '<div class="dz-style" id="' + id + '">'
      + ctlRow('Size', R().SIZES.map((v) => [v, '<span class="dz-sz dz-sz-' + v + '">A</span>']), s.size, 'size')
      + ctlRow('Align', R().ALIGNS.map((v) => [v, { left: '⟸', center: '≡', right: '⟹', justify: '☰' }[v]]), s.align, 'align')
      + '<div class="dz-ctl"><span class="dz-ctl-l">Box</span><div class="dz-boxes">'
      + '<button type="button" data-k="box" data-v="" class="dz-boxsw' + (!s.box ? ' on' : '') + '" title="No box">∅</button>'
      + R().BOXES.map((b) => '<button type="button" data-k="box" data-v="' + b + '" class="dz-boxsw' + (s.box === b ? ' on' : '') + '" title="' + BOX_INFO[b][1] + '"'
        + ' style="background:' + BOX_HEX[b] + ';border-color:' + BOX_BD[b] + '">' + BOX_INFO[b][0] + '</button>').join('') + '</div></div>'
      + '<div class="dz-ctl"><span class="dz-ctl-l">Colour</span><div class="dz-swatches">'
      + '<button type="button" data-k="color" data-v="" class="dz-sw dz-sw-none' + (!s.color ? ' on' : '') + '" title="Default">∅</button>'
      + R().COLORS.map((c) => '<button type="button" data-k="color" data-v="' + c + '" class="dz-sw' + (s.color === c ? ' on' : '') + '" title="' + c + '" style="background:' + COLOR_HEX[c] + '"></button>').join('')
      + '</div></div>'
      + '<div class="dz-ctl"><span class="dz-ctl-l">Font</span><select data-k="font" class="dz-select"><option value="">Page font</option>'
      + R().FONTS.map((f) => '<option value="' + f + '"' + (s.font === f ? ' selected' : '') + '>' + FONT_INFO[f][0] + '</option>').join('') + '</select></div>'
      + (o.noEmphasis ? '' : '<div class="dz-ctl"><span class="dz-ctl-l">Emphasis</span><div class="dz-seg">'
        + '<button type="button" data-k="bold" data-v="' + (s.bold ? '' : '1') + '" class="' + (s.bold ? 'on' : '') + '"><b>B</b> whole field</button>'
        + '<button type="button" data-k="italic" data-v="' + (s.italic ? '' : '1') + '" class="' + (s.italic ? 'on' : '') + '"><i>I</i> whole field</button></div></div>')
      + '</div>';
  }
  function ctlRow(label, opts, cur, key) {
    return '<div class="dz-ctl"><span class="dz-ctl-l">' + label + '</span><div class="dz-seg dz-seg-tight">'
      + '<button type="button" data-k="' + key + '" data-v="" class="' + (!cur ? 'on' : '') + '" title="Default">·</button>'
      + opts.map(([v, l]) => '<button type="button" data-k="' + key + '" data-v="' + v + '" class="' + (cur === v ? 'on' : '') + '" title="' + v + '">' + l + '</button>').join('')
      + '</div></div>';
  }
  function bindStyleControls(panel, id, apply) {
    const box = panel.querySelector('#' + id);
    if (!box) return;
    box.querySelectorAll('button[data-k]').forEach((b) => {
      b.onclick = () => {
        const k = b.getAttribute('data-k');
        const v = b.getAttribute('data-v');
        apply(k, (k === 'bold' || k === 'italic') ? (v ? true : null) : (v || null));
      };
    });
    box.querySelectorAll('select[data-k]').forEach((s) => { s.onchange = () => apply(s.getAttribute('data-k'), s.value || null); });
  }

  // ── Page ─────────────────────────────────────────────────────────────────
  function renderPagePanel(panel) {
    const e = ex();
    const scope = e ? S.designScope : 'bank';
    const target = designTarget(scope);
    const d = target.design || {};
    const inherited = e && scope === 'page' ? (S.bank.design || {}) : {};
    const eff = (k) => (d[k] !== undefined ? d[k] : inherited[k]);
    panel.innerHTML =
      (e ? '<div class="dz-scope">' + seg('dz-scope', [['page', 'This page'], ['bank', 'Every page of this bank']], scope) + '</div>'
        + '<p class="dz-note">' + (scope === 'page' ? 'Settings here apply to this page and override the bank’s.' : 'The starting look for every page in the bank; a page can still override it.') + '</p>'
        : '<p class="dz-note">The bank’s design is the starting look for its exercise list and every page in it.</p>')
      + '<h4 class="dz-h">Theme</h4><div class="dz-themes">'
      + R().THEMES.map((t) => {
        const info = THEME_INFO[t];
        const on = (eff('theme') || 'parchment') === t;
        return '<button type="button" class="dz-theme' + (on ? ' on' : '') + '" data-theme="' + t + '">'
          + '<span class="dz-theme-sw">' + info.sw.map((c) => '<i style="background:' + c + '"></i>').join('') + '</span>' + info.label + '</button>';
      }).join('') + '</div>'
      + '<h4 class="dz-h">Layout</h4>'
      + '<div class="dz-ctl"><span class="dz-ctl-l">Width</span>' + seg('dz-width', R().WIDTHS.map((w) => [w, w.charAt(0).toUpperCase() + w.slice(1)]), eff('width') || 'normal') + '</div>'
      + '<div class="dz-ctl"><span class="dz-ctl-l">Columns</span>' + seg('dz-cols', [['1', '1'], ['2', '2'], ['3', '3']], String(eff('cols') || 1)) + '<small class="dz-muted">questions side by side</small></div>'
      + '<div class="dz-ctl"><span class="dz-ctl-l">Spacing</span>' + seg('dz-dens', R().DENSITIES.map((w) => [w, w.charAt(0).toUpperCase() + w.slice(1)]), eff('density') || 'normal') + '</div>'
      + '<div class="dz-ctl"><span class="dz-ctl-l">Zoom</span><input type="range" id="dz-scale" min="80" max="160" step="5" value="' + Math.round((eff('scale') || 1) * 100) + '">'
      + '<b id="dz-scale-v">' + Math.round((eff('scale') || 1) * 100) + '%</b></div>'
      + '<h4 class="dz-h">Korean font</h4><div class="dz-fonts">'
      + R().FONTS.map((f) => '<button type="button" class="dz-font' + ((eff('font') || 'sans') === f ? ' on' : '') + '" data-font="' + f + '">'
        + '<span style="font-family:' + FONT_INFO[f][1] + '">가나다 한국어</span><small>' + FONT_INFO[f][0] + '</small></button>').join('') + '</div>'
      + '<h4 class="dz-h">Hover meanings</h4>' + glossModeControl(eff('glossMode'))
      + '<div class="dz-row-actions"><button type="button" class="btn btn-secondary btn-sm" id="dz-reset-design">' + esc(T(scope === 'page' && e ? 'Reset this page’s look' : 'Reset the bank’s look')) + '</button></div>';
    R().ensureFonts(R().FONTS);
    const put = (k, v) => { setDesign(target, k, v); commit(); renderInspector(); };
    bindSeg('dz-scope', (v) => { S.designScope = v; renderInspector(); });
    panel.querySelectorAll('[data-theme]').forEach((b) => { b.onclick = () => put('theme', b.getAttribute('data-theme') === 'parchment' && !inherited.theme ? null : b.getAttribute('data-theme')); });
    bindSeg('dz-width', (v) => put('width', v === 'normal' && !inherited.width ? null : v));
    bindSeg('dz-cols', (v) => put('cols', v === '1' && !inherited.cols ? null : Number(v)));
    bindSeg('dz-dens', (v) => put('density', v === 'normal' && !inherited.density ? null : v));
    const sc = el('dz-scale');
    sc.oninput = () => { el('dz-scale-v').textContent = sc.value + '%'; setDesign(target, 'scale', Number(sc.value) === 100 && !inherited.scale ? null : Number(sc.value) / 100); commit('scale'); };
    panel.querySelectorAll('[data-font]').forEach((b) => { b.onclick = () => put('font', b.getAttribute('data-font') === 'sans' && !inherited.font ? null : b.getAttribute('data-font')); });
    bindGlossMode(panel, (v) => put('glossMode', v === 'checked' && !inherited.glossMode ? null : v));
    el('dz-reset-design').onclick = () => {
      if (!target.design) return;
      const keep = {};
      ['glossary', 'glossHide', 'blocks'].forEach((k) => { if (target.design[k]) keep[k] = target.design[k]; });
      target.design = keep;
      if (!Object.keys(keep).length) delete target.design;
      commit();
      renderInspector();
    };
  }

  function glossModeControl(cur) {
    const mode = cur || 'checked';
    return '<div class="dz-gmodes">' + R().GLOSS_MODES.map((g) => '<button type="button" data-gmode="' + g + '" class="dz-gmode' + (mode === g ? ' on' : '') + '">'
      + '<b>' + GLOSS_LABEL[g][0] + '</b><small>' + GLOSS_LABEL[g][1] + '</small></button>').join('') + '</div>';
  }
  function bindGlossMode(panel, fn) {
    panel.querySelectorAll('[data-gmode]').forEach((b) => { b.onclick = () => fn(b.getAttribute('data-gmode')); });
  }

  // ── Blocks ───────────────────────────────────────────────────────────────
  function renderBlocksPanel(panel) {
    const e = ex();
    const target = e || S.bank;
    const labels = e ? ANCHOR_LABEL : BANK_ANCHOR_LABEL;
    const list = blocksOf(target);
    const selId = S.sel && S.sel.block;
    const sel = list.find((b) => b.id === selId) || null;
    panel.innerHTML =
      '<p class="dz-note">' + (e ? 'Text boxes, pictures and dividers placed between this page’s own sections.'
        : 'Blocks on the bank’s exercise list — a banner picture, a welcome note.') + '</p>'
      + '<div class="dz-addbar">'
      + '<button type="button" class="btn btn-secondary btn-sm" data-add="text">＋ Text box</button>'
      + '<button type="button" class="btn btn-secondary btn-sm" data-add="image">＋ Picture</button>'
      + '<button type="button" class="btn btn-secondary btn-sm" data-add="divider">＋ Divider</button></div>'
      + (list.length ? '<div class="dz-blocklist">' + list.map((b, i) => '<div class="dz-blk' + (b.id === selId ? ' on' : '') + '" data-id="' + esc(b.id) + '">'
        + '<span class="dz-blk-k">' + ({ text: '🅣', image: '🖼', divider: '➖' }[b.kind] || '▫') + '</span>'
        + '<span class="dz-blk-t"><b>' + esc(blockSummary(b)) + '</b><small>' + esc(labels[b.at] || b.at) + (b.when && b.when !== 'always' ? ' · ' + (b.when === 'checked' ? 'after checking' : 'before checking') : '') + '</small></span>'
        + '<button type="button" data-mv="-1" title="Move up"' + (i ? '' : ' disabled') + '>↑</button>'
        + '<button type="button" data-mv="1" title="Move down"' + (i < list.length - 1 ? '' : ' disabled') + '>↓</button>'
        + '<button type="button" data-del="1" title="Delete">✕</button></div>').join('') + '</div>'
        : '<div class="dz-empty dz-empty-sm">No blocks on this page yet.</div>')
      + (sel ? '<div class="dz-blk-edit" id="dz-blk-edit"></div>' : '');

    panel.querySelectorAll('[data-add]').forEach((b) => {
      b.onclick = () => {
        const kind = b.getAttribute('data-add');
        const ids = new Set(list.map((x) => x.id));
        let n = list.length + 1;
        while (ids.has('b' + n)) n++;
        const blk = { id: 'b' + n, kind, at: e ? (kind === 'divider' ? 'items' : 'instruction') : 'top' };
        if (kind === 'text') { blk.html = e ? 'Write something here.' : 'Welcome!'; blk.box = 'tip'; blk.icon = '💡'; }
        const next = list.concat([blk]);
        if (kind === 'image') {
          openMedia((src) => {
            if (!src) return;
            blk.src = src;
            blk.width = 60;
            setBlocks(target, next);
            S.sel = { block: blk.id };
            commit();
            renderInspector();
          });
          return;
        }
        setBlocks(target, next);
        S.sel = { block: blk.id };
        commit();
        renderInspector();
      };
    });
    panel.querySelectorAll('.dz-blk').forEach((row) => {
      const id = row.getAttribute('data-id');
      row.onclick = (ev) => {
        if (ev.target.closest('button')) return;
        S.sel = { block: id, scroll: true };
        renderInspector();
        drawPreview();
      };
      row.querySelectorAll('[data-mv]').forEach((b) => {
        b.onclick = () => {
          const i = list.findIndex((x) => x.id === id);
          const j = i + Number(b.getAttribute('data-mv'));
          if (j < 0 || j >= list.length) return;
          const next = list.slice();
          const t = next[i]; next[i] = next[j]; next[j] = t;
          setBlocks(target, next);
          commit();
          renderInspector();
        };
      });
      row.querySelector('[data-del]').onclick = () => {
        if (!window.confirm('Delete this block?')) return;
        setBlocks(target, list.filter((x) => x.id !== id));
        if (S.sel && S.sel.block === id) S.sel = null;
        commit();
        renderInspector();
      };
    });
    if (sel) renderBlockEditor(el('dz-blk-edit'), target, sel, labels);
  }

  function blockSummary(b) {
    if (b.kind === 'divider') return T('Divider') + ' · ' + T(b.style || 'line');
    if (b.kind === 'image') return T('Picture') + ' · ' + (b.caption || b.src || '');
    const text = b.heading || R().plain(b.html || '');
    return (b.icon ? b.icon + ' ' : '') + (text.slice(0, 40) || 'Text box');
  }

  // A block's Vietnamese is written here and its English by Claude, like any other prose: a
  // Vietnamese edit puts that text on the block's enTodo, and English written by hand settles it.
  function blockOwes(x, key, has) {
    const todo = (x.enTodo || []).filter((k) => k !== key);
    if (has) todo.push(key);
    if (todo.length) x.enTodo = todo; else delete x.enTodo;
  }
  function blockSettled(x, key) {
    ['enTodo', 'enAI'].forEach((n) => {
      const list = (x[n] || []).filter((k) => k !== key);
      if (list.length) x[n] = list; else delete x[n];
    });
  }

  function renderBlockEditor(box, target, b, labels) {
    const vi = S.lang === 'vi';
    const loc = (vi && b.vi) || {};
    const upd = (fn, key) => {
      const list = blocksOf(target).map((x) => (x.id === b.id ? fn(clone(x)) : x));
      setBlocks(target, list);
      commit(key);
    };
    const anchorSel = '<div class="dz-ctl"><span class="dz-ctl-l">Place</span><select class="dz-select" id="dz-b-at">'
      + Object.keys(labels).map((a) => '<option value="' + a + '"' + (b.at === a ? ' selected' : '') + '>' + labels[a] + '</option>').join('') + '</select></div>'
      + (ex() ? '<div class="dz-ctl"><span class="dz-ctl-l">Show</span>' + seg('dz-b-when', [['always', 'Always'], ['unchecked', 'Before checking'], ['checked', 'After checking']], b.when || 'always') + '</div>' : '');
    if (b.kind === 'divider') {
      box.innerHTML = '<h4 class="dz-h">Divider</h4>' + anchorSel
        + '<div class="dz-ctl"><span class="dz-ctl-l">Style</span>' + seg('dz-b-style', R().DIVIDERS.map((s) => [s, T(s)]), b.style || 'line') + '</div>';
    } else if (b.kind === 'image') {
      box.innerHTML = '<h4 class="dz-h">Picture</h4>'
        + '<div class="dz-imgpick"><img src="' + esc(S.assetBase + b.src) + '" alt=""><div><button type="button" class="btn btn-secondary btn-sm" id="dz-b-src">Change picture</button>'
        + '<div class="dz-muted dz-small">' + esc(b.src) + '</div></div></div>'
        + anchorSel
        + '<div class="dz-ctl"><span class="dz-ctl-l">Width</span><input type="range" id="dz-b-w" min="10" max="100" step="5" value="' + (b.width || 100) + '"><b id="dz-b-wv">' + (b.width || 100) + '%</b></div>'
        + '<div class="dz-ctl"><span class="dz-ctl-l">Align</span>' + seg('dz-b-align', [['left', '⟸'], ['center', '≡'], ['right', '⟹']], b.align || 'center') + '</div>'
        + '<div class="dz-ctl"><span class="dz-ctl-l">Frame</span>' + seg('dz-b-frame', R().FRAMES.map((f) => [f, f]), b.frame || 'none') + '</div>'
        + '<label class="dz-lab">Caption' + (vi ? ' (Vietnamese)' : '') + '<input class="form-input" id="dz-b-cap" maxlength="300" value="' + esc(vi ? (loc.caption || '') : (b.caption || '')) + '"></label>'
        + '<label class="dz-lab">Description for screen readers' + (vi ? ' (Vietnamese)' : '') + '<input class="form-input" id="dz-b-alt" maxlength="200" value="' + esc(vi ? (loc.alt || '') : (b.alt || '')) + '"></label>';
    } else {
      box.innerHTML = '<h4 class="dz-h">Text box</h4>' + anchorSel
        + '<div class="dz-grid2"><label class="dz-lab">Heading' + (vi ? ' (VI)' : '') + '<input class="form-input" id="dz-b-head" maxlength="120" value="' + esc(vi ? (loc.heading || '') : (b.heading || '')) + '"></label>'
        + '<label class="dz-lab">Icon<input class="form-input" id="dz-b-icon" maxlength="8" value="' + esc(b.icon || '') + '"></label></div>'
        + '<div class="dz-emojis">' + ['💡', '📌', '⚠️', '✅', '📖', '🎯', '🔑', '✏️', '🗣️', '🎧', '🇰🇷', '⭐'].map((i) => '<button type="button" data-emo="' + i + '">' + i + '</button>').join('') + '</div>'
        + '<div class="dz-lab">Text' + (vi ? ' (Vietnamese — leave empty to show the English)' : '') + '</div><div id="dz-b-html"></div>'
        + '<h4 class="dz-h">Look</h4>' + styleControls({ size: b.size, align: b.align, box: b.box, color: b.color, font: b.font }, 'bs', { noEmphasis: true })
        + '<div class="dz-ctl"><span class="dz-ctl-l">Columns</span>' + seg('dz-b-cols', [['1', '1'], ['2', '2']], String(b.cols || 1)) + '</div>'
        + '<h4 class="dz-h">Picture beside the text</h4>'
        + (b.src ? '<div class="dz-imgpick"><img src="' + esc(S.assetBase + b.src) + '" alt=""><div><button type="button" class="btn btn-secondary btn-sm" id="dz-b-src">Change</button> '
          + '<button type="button" class="btn btn-secondary btn-sm" id="dz-b-nosrc">Remove</button></div></div>'
          + '<div class="dz-ctl"><span class="dz-ctl-l">Side</span>' + seg('dz-b-side', [['left', 'Left'], ['right', 'Right'], ['top', 'Above']], b.side || 'left') + '</div>'
          + '<div class="dz-ctl"><span class="dz-ctl-l">Width</span><input type="range" id="dz-b-w" min="10" max="100" step="5" value="' + (b.width || 32) + '"><b id="dz-b-wv">' + (b.width || 32) + '%</b></div>'
          : '<button type="button" class="btn btn-secondary btn-sm" id="dz-b-src">＋ Add a picture</button>');
    }
    const at = el('dz-b-at');
    if (at) at.onchange = () => { upd((x) => { x.at = at.value; return x; }); renderInspector(); };
    bindSeg('dz-b-when', (v) => upd((x) => { if (v === 'always') delete x.when; else x.when = v; return x; }));
    bindSeg('dz-b-style', (v) => upd((x) => { if (v === 'line') delete x.style; else x.style = v; return x; }));
    bindSeg('dz-b-align', (v) => upd((x) => { if (v === 'center') delete x.align; else x.align = v; return x; }));
    bindSeg('dz-b-frame', (v) => upd((x) => { if (v === 'none') delete x.frame; else x.frame = v; return x; }));
    bindSeg('dz-b-side', (v) => upd((x) => { if (v === 'left') delete x.side; else x.side = v; return x; }));
    bindSeg('dz-b-cols', (v) => upd((x) => { if (v === '1') delete x.cols; else x.cols = 2; return x; }));
    const w = el('dz-b-w');
    if (w) w.oninput = () => { el('dz-b-wv').textContent = w.value + '%'; upd((x) => { x.width = Number(w.value); return x; }, 'bw:' + b.id); };
    const src = el('dz-b-src');
    if (src) src.onclick = () => openMedia((s) => { if (!s) return; upd((x) => { x.src = s; if (x.kind === 'text' && !x.width) x.width = 32; return x; }); renderInspector(); });
    const nosrc = el('dz-b-nosrc');
    if (nosrc) nosrc.onclick = () => { upd((x) => { delete x.src; delete x.side; delete x.width; delete x.alt; return x; }); renderInspector(); };
    const text = (id, key, max) => {
      const inp = el(id);
      if (!inp) return;
      inp.oninput = () => upd((x) => {
        const v = inp.value.slice(0, max);
        if (vi && key !== 'icon') {
          x.vi = x.vi || {};
          if (v.trim()) x.vi[key] = v; else delete x.vi[key];
          if (!Object.keys(x.vi).length) delete x.vi;
          blockOwes(x, key, !!v.trim());
        } else {
          if (v.trim()) x[key] = v; else delete x[key];
          if (key !== 'icon') blockSettled(x, key);
        }
        return x;
      }, 'b:' + b.id + ':' + key);
    };
    text('dz-b-head', 'heading', 120);
    text('dz-b-icon', 'icon', 8);
    text('dz-b-cap', 'caption', 300);
    text('dz-b-alt', 'alt', 200);
    box.querySelectorAll('[data-emo]').forEach((btn) => {
      btn.onclick = () => { upd((x) => { x.icon = btn.getAttribute('data-emo'); return x; }); renderInspector(); };
    });
    bindStyleControls(box, 'bs', (k, v) => { upd((x) => { if (v) x[k] = v; else delete x[k]; return x; }); renderInspector(); });
    const hh = el('dz-b-html');
    if (hh) {
      const cur = vi ? (loc.html || '') : (b.html || '');
      S.blockEditor = window.HVRichEditor.create(hh, {
        html: cur, text: R().plain(cur), lang: vi ? 'vi' : 'en', multiline: true, allowImages: true, assetBase: S.assetBase,
        onPickImage: (cb) => openMedia(cb),
        onHistory: (dir) => (dir === 'redo' ? redo() : undo()),
        onChange: ({ html }) => upd((x) => {
          const h = R().sanitize(html);
          const empty = !R().plain(h).trim() && !/<img/.test(h);
          if (vi) {
            x.vi = x.vi || {};
            if (empty) delete x.vi.html; else x.vi.html = h;
            if (!Object.keys(x.vi).length) delete x.vi;
            blockOwes(x, 'html', !empty);
          } else {
            if (empty) delete x.html; else x.html = h;
            blockSettled(x, 'html');
          }
          return x;
        }, 'bh:' + b.id + ':' + S.lang)
      });
    }
  }

  // ── Meanings ─────────────────────────────────────────────────────────────
  function pageText() {
    const e = ex();
    if (!e) return '';
    const bits = [];
    (function walk(v, key) {
      if (typeof v === 'string') { if (['id', 'answer', 'answer2', 'art', 'src', 'type', 'icon', 'img'].indexOf(key) < 0) bits.push(v); return; }
      if (Array.isArray(v)) { v.forEach((x) => walk(x, key)); return; }
      if (v && typeof v === 'object') Object.keys(v).forEach((k) => { if (k !== 'fmt' && k !== 'design') walk(v[k], k); });
    }(e, ''));
    return bits.join('\n');
  }

  function renderGlossPanel(panel) {
    const e = ex();
    const scope = e ? S.designScope : 'bank';
    const target = designTarget(scope);
    const d = target.design || {};
    const merged = R().mergeDesign(S.bank.design, e ? e.design : null) || {};
    const gloss = d.glossary || [];
    const hide = d.glossHide || [];
    const text = pageText();
    const custom = new Set((merged.glossary || []).map((g) => g.ko));
    const hidden = new Set(merged.glossHide || []);
    const auto = [];
    if (S.world && e) {
      const f = folded();
      (f.world ? f.world.words : S.world.words).forEach((w) => {
        const keys = [String(w.ko || '').trim()].concat(Array.isArray(w.forms) ? w.forms : []).filter((k) => k && k.length >= 2);
        const hit = keys.find((k) => text.indexOf(k) >= 0);
        if (hit) auto.push({ ko: hit, gloss: (S.lang === 'vi' && w.vi) || w.en || '' });
      });
    }
    panel.innerHTML =
      (e ? '<div class="dz-scope">' + seg('dz-gscope', [['page', 'This page'], ['bank', 'Every page of this bank']], scope) + '</div>' : '')
      + '<h4 class="dz-h">When meanings appear</h4>' + glossModeControl(merged.glossMode)
      + '<h4 class="dz-h">Glossary <small class="dz-muted">— words that show your meaning on hover</small></h4>'
      // Vietnamese first: the meaning a Vietnamese learner reads, then the English, which may
      // wait — English mode shows the Vietnamese until it is written.
      + '<div class="dz-gtable"><div class="dz-grow dz-ghead"><span>Word (Korean)</span><span>Nghĩa (Tiếng Việt)</span><span>Meaning (English, optional)</span><span></span></div>'
      + gloss.map((g, i) => '<div class="dz-grow" data-i="' + i + '"><input class="form-input" data-k="ko" value="' + esc(g.ko) + '" maxlength="40">'
        + '<input class="form-input" data-k="vi" value="' + esc(g.vi || '') + '" maxlength="240"><input class="form-input" data-k="gl" value="' + esc(g.gl || '') + '" maxlength="240">'
        + '<button type="button" data-del="' + i + '" title="Remove">✕</button></div>').join('')
      + '<div class="dz-grow dz-gnew"><input class="form-input" id="dz-g-ko" placeholder="눈썹" maxlength="40"><input class="form-input" id="dz-g-vi" placeholder="lông mày" maxlength="240">'
      + '<input class="form-input" id="dz-g-gl" placeholder="eyebrow" maxlength="240"><button type="button" id="dz-g-add" title="Add">＋</button></div></div>'
      + '<p class="dz-note">Two characters or more — a single syllable would light up inside every longer word. For one occurrence, select the word in the Text tab and press 💬.</p>'
      + '<h4 class="dz-h">Hidden words <small class="dz-muted">— never glossed automatically here</small></h4>'
      + '<div class="dz-chips">' + hide.map((w, i) => '<span class="dz-tag">' + esc(w) + '<button type="button" data-unhide="' + i + '">✕</button></span>').join('')
      + '<input class="form-input dz-taginput" id="dz-hide-in" placeholder="add a word…" maxlength="40"></div>'
      + (e ? '<h4 class="dz-h">Meanings the game adds by itself <small class="dz-muted">(' + auto.length + ')</small></h4>'
        + (S.world ? (auto.length ? '<div class="dz-autolist">' + auto.map((a) => '<div class="dz-auto' + (hidden.has(a.ko) ? ' off' : '') + '"><b>' + esc(a.ko) + '</b><span>'
          + esc(custom.has(a.ko) ? '→ your glossary' : a.gloss) + '</span>'
          + '<button type="button" data-hide="' + esc(a.ko) + '">' + (hidden.has(a.ko) ? 'Show' : 'Hide') + '</button>'
          + '<button type="button" data-own="' + esc(a.ko) + '" data-gl="' + esc(a.gloss) + '">Change</button></div>').join('') + '</div>'
          : '<p class="dz-muted">None of the unit’s words appear on this page.</p>')
          : '<p class="dz-muted">This bank has no word list of its own to take meanings from.</p>') : '');
    bindSeg('dz-gscope', (v) => { S.designScope = v; renderInspector(); });
    bindGlossMode(panel, (v) => { setDesign(target, 'glossMode', v === 'checked' ? null : v); commit(); renderInspector(); });
    const setList = (k, list) => { setDesign(target, k, list.length ? list : undefined); commit('g:' + k); };
    panel.querySelectorAll('.dz-gtable .dz-grow[data-i]').forEach((row) => {
      const i = Number(row.getAttribute('data-i'));
      row.querySelectorAll('input').forEach((inp) => {
        inp.oninput = () => {
          const list = clone(gloss);
          const k = inp.getAttribute('data-k');
          if (inp.value.trim()) list[i][k] = inp.value; else if (k === 'ko') list[i][k] = ''; else delete list[i][k];
          gloss[i] = list[i];
          setList('glossary', list);
        };
      });
      row.querySelector('[data-del]').onclick = () => { setList('glossary', gloss.filter((_, k) => k !== i)); renderInspector(); };
    });
    el('dz-g-add').onclick = () => {
      const ko = el('dz-g-ko').value.trim();
      const gl = el('dz-g-gl').value.trim();
      const vi = el('dz-g-vi').value.trim();
      if (ko.length < 2) { window.Toast.warning(esc(T('The word needs two characters or more.')), esc(T('Glossary'))); return; }
      if (!gl && !vi) { window.Toast.warning(esc(T('Give it a meaning.')), esc(T('Glossary'))); return; }
      if (gloss.some((g) => g.ko === ko)) { window.Toast.warning(esc(T('"{ko}" is already in the glossary.', { ko })), esc(T('Glossary'))); return; }
      const entry = { ko };
      if (gl) entry.gl = gl;
      if (vi) entry.vi = vi;
      setList('glossary', gloss.concat([entry]));
      renderInspector();
    };
    panel.querySelectorAll('[data-unhide]').forEach((b) => { b.onclick = () => { setList('glossHide', hide.filter((_, k) => k !== Number(b.getAttribute('data-unhide')))); renderInspector(); }; });
    const hin = el('dz-hide-in');
    hin.onkeydown = (ev) => {
      if (ev.key !== 'Enter') return;
      const w = hin.value.trim();
      if (!w || hide.indexOf(w) >= 0) return;
      setList('glossHide', hide.concat([w]));
      renderInspector();
    };
    panel.querySelectorAll('[data-hide]').forEach((b) => {
      b.onclick = () => {
        const w = b.getAttribute('data-hide');
        setList('glossHide', hide.indexOf(w) >= 0 ? hide.filter((x) => x !== w) : hide.concat([w]));
        renderInspector();
      };
    });
    panel.querySelectorAll('[data-own]').forEach((b) => {
      b.onclick = () => {
        // The meaning the game would have shown, in the language it is being shown in.
        const box = el(S.lang === 'vi' ? 'dz-g-vi' : 'dz-g-gl');
        el('dz-g-ko').value = b.getAttribute('data-own');
        box.value = b.getAttribute('data-gl');
        box.focus();
        box.select();
      };
    });
  }

  // ── Question ─────────────────────────────────────────────────────────────
  function renderQuestionPanel(panel) {
    const e = ex();
    if (!e) {
      panel.innerHTML = '<div class="dz-empty"><div class="dz-empty-icon">📋</div><p>This is the bank’s exercise list. Open a page from the <b>Page</b> menu above to edit its questions.</p></div>'
        + '<h4 class="dz-h">Bank</h4>' + inputs(S.bank, '', [['titleKo', 'Title (Korean)'], ['titleEn', 'Title'], ['hintKo', 'Hint at the bottom'], ['source', 'Source line']]);
      bindInputs(panel, S.bank);
      return;
    }
    const perItem = e.type === 'build' || e.type === 'experience';
    const items = e.items || [];
    if (S.row >= items.length) S.row = items.length - 1;
    const it = S.row >= 0 ? items[S.row] : null;
    panel.innerHTML =
      '<details class="dz-details"' + (it ? '' : ' open') + '><summary>Page details · <span class="dz-muted">' + esc(TYPE_LABEL[e.type] || e.type) + '</span></summary>'
      + inputs(e, 'ex', [['section', 'Section (Korean)'], ['sectionEn', 'Section'], ['no', 'Number (연습 1…)'], ['pattern', 'Grammar point'], ['icon', 'Icon'], ['id', 'Page id']])
      + fieldButtons('exercises.' + S.exIndex, [['instructionKo', 'Instruction (KO)'], ['instructionEn', 'Instruction'], ['noteEn', 'Note']])
      + check(e, 'holdGloss', 'Hold every row’s English until the page is checked (listening/reading pages)')
      + '</details>'
      + '<div class="dz-qbar"><span class="dz-h dz-inline">Questions</span><div class="dz-qchips">'
      + items.map((q, i) => '<button type="button" data-q="' + i + '" class="' + (i === S.row ? 'on' : '') + '">' + esc(q.n) + '</button>').join('')
      + '</div><button type="button" class="btn btn-secondary btn-sm" id="dz-q-add">＋ Add</button></div>'
      + (it ? questionEditor(e, it, perItem) : '<p class="dz-muted">Click a question on the page, or a number above.</p>')
      + (!perItem ? chipEditor(e) : '');
    bindInputs(panel, e, 'ex');
    panel.querySelectorAll('[data-fbtn]').forEach((b) => { b.onclick = () => selectField(b.getAttribute('data-fbtn')); });
    panel.querySelectorAll('[data-q]').forEach((b) => { b.onclick = () => { S.row = Number(b.getAttribute('data-q')); renderInspector(); drawPreview(); }; });
    el('dz-q-add').onclick = () => {
      const n = items.length + 1;
      let q;
      if (e.type === 'build') q = { n, art: '', phraseKo: '', lines: [{ ko: '{}' }], answer: 'c1', choices: [{ id: 'c1', ko: '' }, { id: 'c2', ko: '' }], en: '', why: '', grammar: '' };
      else if (e.type === 'experience') q = { n, art: '', phraseKo: '', stemKo: '', answer: 'c1', choices: [{ id: 'c1', ko: '' }, { id: 'c2', ko: '' }], en: '', why: '', grammar: '' };
      else {
        const used = new Set(items.map((x) => x.answer));
        const free = (e.bank || []).find((c) => !c.usedByExample && !used.has(c.id));
        q = { n, answer: (free && free.id) || '', en: '', why: '', grammar: '' };
        if (e.type === 'dialogue') q.lines = [{ who: 'A', ko: '{}' }]; else q.stemKo = '';
      }
      e.items = items.concat([q]);
      S.row = e.items.length - 1;
      commit();
      renderInspector();
    };
    if (it) bindQuestionEditor(panel, e, it, perItem);
    if (!perItem) bindChipEditor(panel, e);
  }

  // A short field. An English one is written in Vietnamese here (VI) or shown as Claude's
  // English (EN); anything else — Korean, an id, an icon — is edited as it is.
  function inputs(obj, scope, fields) {
    return '<div class="dz-grid2">' + fields.map(([k, l]) => {
      if (!isEn(k, obj)) {
        return '<label class="dz-lab">' + esc(l) + '<input class="form-input" data-in="' + scope + ':' + k + '" value="' + esc(obj[k] == null ? '' : obj[k]) + '"></label>';
      }
      if (S.lang === 'en') {
        return '<div class="dz-lab">' + esc(l) + ' ' + stateChip(obj, k) + '<div class="dz-ro dz-ro-en" translate="no">' + esc(obj[k] || '—') + '</div></div>';
      }
      return '<label class="dz-lab">' + esc(T(l)) + ' ' + stateChip(obj, k) + '<input class="form-input" data-in-vi="' + scope + ':' + k + '" value="'
        + esc(VF().viOf(obj, k, entries())) + '" placeholder="' + esc(T('Write the Vietnamese here…')) + '"></label>';
    }).join('') + '</div>';
  }
  function bindInputs(panel, obj, scope) {
    panel.querySelectorAll('[data-in^="' + (scope || '') + ':"]').forEach((inp) => {
      const k = inp.getAttribute('data-in').split(':')[1];
      inp.oninput = () => { plainEdit(obj, k, inp.value); commit('in:' + k); };
    });
    panel.querySelectorAll('[data-in-vi^="' + (scope || '') + ':"]').forEach((inp) => {
      const k = inp.getAttribute('data-in-vi').split(':')[1];
      inp.oninput = () => { VF().setVi(obj, k, inp.value, entries()); commit('in-vi:' + k); };
    });
    panel.querySelectorAll('[data-chk]').forEach((c) => {
      c.onchange = () => { const k = c.getAttribute('data-chk'); if (c.checked) obj[k] = true; else delete obj[k]; commit(); };
    });
  }
  function check(obj, k, label) {
    return '<label class="dz-check"><input type="checkbox" data-chk="' + k + '"' + (obj[k] === true ? ' checked' : '') + '> ' + esc(label) + '</label>';
  }
  function fieldButtons(base, list) {
    return '<div class="dz-fbtns">' + list.map(([k, l]) => '<button type="button" class="dz-fbtn" data-fbtn="' + esc(base + '.' + k) + '">✏️ ' + esc(l) + '</button>').join('') + '</div>';
  }

  // A text field inside the question form. One with formatting is shown, not edited, here: a
  // plain edit would throw its formatting away, so it opens in the Text tab instead.
  function qField(obj, path, key, label, multi) {
    const v = obj[key] == null ? '' : String(obj[key]);
    const spec = specOf(obj, key);
    // Prose for the learner: the Vietnamese is what is written here, the English is Claude's.
    if (isEn(key, obj)) {
      const viv = VF().viOf(obj, key, entries());
      const chip = ' ' + stateChip(obj, key);
      if (S.lang === 'en') {
        return '<div class="dz-lab">' + esc(label) + chip
          + '<div class="dz-ro dz-ro-en" data-fbtn="' + esc(path + '.' + key) + '" translate="no" title="' + esc(T('Claude’s English — click to style it in the Text tab')) + '">' + esc(v || '—') + '</div></div>';
      }
      if (spec && spec.vi && R().matches(spec.vi, viv)) {
        return '<div class="dz-lab">' + esc(label) + ' <em class="dz-fmt-dot" title="' + esc(T('Formatted')) + '">●</em>' + chip
          + '<div class="dz-ro" data-fbtn="' + esc(path + '.' + key) + '" translate="no" title="' + esc(T('Formatted — click to edit in the Text tab')) + '">' + esc(viv || '—') + '</div></div>';
      }
      const ph = ' placeholder="' + esc(T('Write the Vietnamese here…')) + '"';
      return '<label class="dz-lab">' + esc(label) + chip + (multi
        ? '<textarea class="form-input" rows="3" data-qvi="' + esc(path + '.' + key) + '"' + ph + '>' + esc(viv) + '</textarea>'
        : '<input class="form-input" data-qvi="' + esc(path + '.' + key) + '" value="' + esc(viv) + '"' + ph + '>') + '</label>';
    }
    if (spec && spec.html) {
      return '<div class="dz-lab">' + esc(label) + ' <em class="dz-fmt-dot" title="Formatted">●</em>'
        + '<div class="dz-ro" data-fbtn="' + esc(path + '.' + key) + '" title="Formatted — click to edit in the Text tab">' + esc(v || '—') + '</div></div>';
    }
    return '<label class="dz-lab">' + esc(label) + (multi
      ? '<textarea class="form-input" rows="3" data-qf="' + esc(path + '.' + key) + '">' + esc(v) + '</textarea>'
      : '<input class="form-input" data-qf="' + esc(path + '.' + key) + '" value="' + esc(v) + '">') + '</label>';
  }

  function questionEditor(e, it, perItem) {
    const p = 'exercises.' + S.exIndex + '.items.' + S.row;
    const gaps = (it.lines || []).reduce((n, l) => n + String(l.ko || '').split('{}').length - 1, 0)
      + (e.type !== 'build' && e.type !== 'dialogue' ? String(it.stemKo || '').split('{}').length - 1 : 0);
    let html = '<div class="dz-q"><div class="dz-q-head"><b>Question ' + esc(it.n) + '</b><span class="dz-grow"></span>'
      + '<button type="button" class="dz-mini" data-qa="up" title="Move up"' + (S.row ? '' : ' disabled') + '>↑</button>'
      + '<button type="button" class="dz-mini" data-qa="down" title="Move down"' + (S.row < e.items.length - 1 ? '' : ' disabled') + '>↓</button>'
      + '<button type="button" class="dz-mini" data-qa="dup" title="Duplicate">⧉</button>'
      + '<button type="button" class="dz-mini dz-danger" data-qa="del" title="Delete">✕</button></div>';
    if (perItem) html += qField(it, p, 'phraseKo', 'Phrase beside the picture (Korean)');
    if (e.type === 'build' || e.type === 'dialogue') {
      html += '<div class="dz-lab">' + esc(T('Lines')) + ' <small class="dz-muted">' + esc(gaps === 1 ? T('— {} marks each blank · 1 blank') : T('— {} marks each blank · {n} blanks', { n: gaps })) + '</small></div>'
        + (it.lines || []).map((l, i) => {
          const spec = specOf(l, 'ko');
          return '<div class="dz-line"><input class="form-input dz-who" data-lw="' + i + '" value="' + esc(l.who || '') + '" placeholder="A" maxlength="8">'
            + (spec && spec.html ? '<div class="dz-ro dz-grow" data-fbtn="' + esc(p + '.lines.' + i + '.ko') + '">' + esc(l.ko) + '</div>'
              : '<input class="form-input dz-grow" data-lk="' + i + '" value="' + esc(l.ko) + '">')
            + '<button type="button" class="dz-mini" data-ldel="' + i + '" title="Remove line"' + ((it.lines || []).length > 1 ? '' : ' disabled') + '>✕</button></div>';
        }).join('') + '<button type="button" class="dz-link" id="dz-l-add">＋ Add a line</button>';
    } else {
      html += qField(it, p, 'stemKo', e.type === 'experience' ? 'Prompt (저는 ___ 적이 있어요)' : 'Korean prompt — {} marks the blank (optional)');
    }
    if (perItem) {
      html += choiceEditor(it, 'choices', 'answer', 'Buttons', p);
      if (gaps >= 2 || it.choices2) html += choiceEditor(it, 'choices2', 'answer2', 'Buttons for the second blank', p);
      if (gaps >= 2 && !it.choices2) html += '<button type="button" class="dz-link" id="dz-c2-add">＋ Add buttons for the second blank</button>';
      html += '<label class="dz-lab">Picture key (art)<input class="form-input" data-qf="' + esc(p + '.art') + '" value="' + esc(it.art || '') + '" placeholder="quiz/… or a Korean word"></label>';
    } else {
      const chips = (e.bank || []).filter((c) => !c.usedByExample);
      html += '<label class="dz-lab">Answer (from the box)<select class="dz-select" id="dz-q-ans">'
        + chips.map((c) => '<option value="' + esc(c.id) + '"' + (c.id === it.answer ? ' selected' : '') + '>' + esc(c.dict || c.ko || c.id) + '</option>').join('') + '</select></label>';
      if (e.type === 'match') html += '<label class="dz-lab">Picture instead of the prompt<input class="form-input" data-qf="' + esc(p + '.img') + '" value="' + esc(it.img || '') + '" placeholder="sprites/foods/…png"></label>';
    }
    html += qField(it, p, 'en', 'Meaning')
      + qField(it, p, 'why', 'Why this is the answer', true)
      + qField(it, p, 'grammar', 'Grammar note', true)
      + extraEditor(it, p)
      + check(it, 'holdGloss', 'Hold this row’s English until checked');
    if (perItem) {
      const a = it.audio || {};
      html += '<details class="dz-details"><summary>Recording</summary><div class="dz-grid2">'
        + '<label class="dz-lab">Clip (audio/…mp3)<input class="form-input" data-au="src" value="' + esc(a.src || '') + '"></label>'
        + '<label class="dz-lab">Prompt ends at (s)<input class="form-input" data-au="askEnd" value="' + esc(a.askEnd == null ? '' : a.askEnd) + '"></label>'
        + '<label class="dz-lab">Label<input class="form-input" data-au="labelEn" value="' + esc(a.labelEn || '') + '"></label></div></details>';
    }
    html += '<div class="dz-fbtns">' + ['phraseKo', 'en', 'why', 'grammar'].filter((k) => typeof it[k] === 'string' && it[k])
      .map((k) => '<button type="button" class="dz-fbtn" data-fbtn="' + esc(p + '.' + k) + '">'
        + esc(T('✏️ Format {field}', { field: T(FIELD_LABEL[k] || k) })) + '</button>').join('') + '</div>';
    return html + '</div>';
  }

  // A question's own fields (item.extra): a heading and a text each, written in Vietnamese like
  // the rest of the row's prose and shown with the answer — more cards beside the clue and the
  // rule on an exam page, boxes under the grammar note elsewhere.
  function extraEditor(it, p) {
    const list = Array.isArray(it.extra) ? it.extra : [];
    return '<div class="dz-extras"><div class="dz-lab">' + esc(T('Custom fields')) + ' <small class="dz-muted">'
      + esc(T('— shown with the answer; one left empty is not saved')) + '</small></div>'
      + list.map((x, k) => {
        const xp = p + '.extra.' + k;
        return '<div class="dz-extra"><div class="dz-extra-head"><b>' + esc(T('Custom field {n}', { n: k + 1 })) + '</b><span class="dz-grow"></span>'
          + '<button type="button" class="dz-mini" data-xa="up:' + k + '" title="' + esc(T('Move up')) + '"' + (k ? '' : ' disabled') + '>↑</button>'
          + '<button type="button" class="dz-mini" data-xa="down:' + k + '" title="' + esc(T('Move down')) + '"' + (k < list.length - 1 ? '' : ' disabled') + '>↓</button>'
          + '<button type="button" class="dz-mini dz-danger" data-xa="del:' + k + '" title="' + esc(T('Delete this field')) + '">✕</button></div>'
          + qField(x, xp, 'labelEn', 'Heading')
          + qField(x, xp, 'noteEn', 'Content', true)
          + '<button type="button" class="dz-fbtn" data-fbtn="' + esc(xp + '.noteEn') + '">' + esc(T('✏️ Format {field}', { field: T('Content') })) + '</button>'
          + '</div>';
      }).join('')
      + (list.length < 12 ? '<button type="button" class="dz-link" id="dz-x-add">' + esc(T('＋ Add a custom field')) + '</button>' : '')
      + '</div>';
  }

  function choiceEditor(it, listKey, ansKey, label, p) {
    const list = it[listKey] || [];
    return '<div class="dz-lab">' + esc(label) + ' <small class="dz-muted">— ● marks the right one</small></div>'
      + list.map((c, i) => {
        const spec = specOf(c, 'ko');
        return '<div class="dz-choice"><input type="radio" name="dz-' + listKey + '" data-cans="' + listKey + ':' + i + '"' + (it[ansKey] === c.id ? ' checked' : '') + ' title="The right answer">'
          + (spec && spec.html ? '<div class="dz-ro dz-grow" data-fbtn="' + esc(p + '.' + listKey + '.' + i + '.ko') + '">' + esc(c.ko) + '</div>'
            : '<input class="form-input dz-grow" data-cko="' + listKey + ':' + i + '" value="' + esc(c.ko) + '" placeholder="button text">')
          + '<input class="form-input dz-art" data-cart="' + listKey + ':' + i + '" value="' + esc(c.art || '') + '" placeholder="art">'
          + '<button type="button" class="dz-mini" data-cdel="' + listKey + ':' + i + '"' + (list.length > 2 ? '' : ' disabled') + ' title="Remove">✕</button></div>';
      }).join('') + '<button type="button" class="dz-link" data-cadd="' + listKey + '">＋ Add a button</button>';
  }

  function bindQuestionEditor(panel, e, it, perItem) {
    const p = 'exercises.' + S.exIndex + '.items.' + S.row;
    const redraw = () => { commit(); renderInspector(); };
    panel.querySelectorAll('[data-qf]').forEach((inp) => {
      const key = inp.getAttribute('data-qf').split('.').pop();
      inp.oninput = () => {
        if (inp.value === '' && (key === 'art' || key === 'img' || key === 'stemKo')) delete it[key];
        else plainEdit(it, key, inp.value);
        commit('qf:' + p + ':' + key);
      };
    });
    panel.querySelectorAll('[data-qvi]').forEach((inp) => {
      // The row's own fields and its custom fields alike: the object is the one the path names.
      const full = inp.getAttribute('data-qvi');
      const { obj: op, field: key } = splitField(full);
      inp.oninput = () => {
        const o = getAt(S.bank, op);
        if (!o) return;
        VF().setVi(o, key, inp.value, entries());
        commit('qvi:' + full);
      };
      // The chips beside the field say whether the English now owes a rewrite.
      inp.onchange = () => renderInspector();
    });
    panel.querySelectorAll('[data-qa]').forEach((b) => {
      b.onclick = () => {
        const act = b.getAttribute('data-qa');
        const list = e.items;
        const i = S.row;
        if (act === 'del') { if (!window.confirm(T('Delete question {n}?', { n: it.n }))) return; list.splice(i, 1); S.row = Math.min(i, list.length - 1); }
        else if (act === 'dup') { const c = clone(it); list.splice(i + 1, 0, c); S.row = i + 1; }
        else { const j = act === 'up' ? i - 1 : i + 1; const t = list[i]; list[i] = list[j]; list[j] = t; S.row = j; }
        list.forEach((q, k) => { q.n = k + 1; });
        redraw();
      };
    });
    panel.querySelectorAll('[data-lw]').forEach((inp) => {
      inp.oninput = () => { const l = it.lines[Number(inp.getAttribute('data-lw'))]; if (inp.value.trim()) l.who = inp.value; else delete l.who; commit('lw'); };
    });
    panel.querySelectorAll('[data-lk]').forEach((inp) => {
      inp.oninput = () => { plainEdit(it.lines[Number(inp.getAttribute('data-lk'))], 'ko', inp.value); commit('lk:' + inp.getAttribute('data-lk')); };
      inp.onchange = () => renderInspector();
    });
    panel.querySelectorAll('[data-ldel]').forEach((b) => { b.onclick = () => { it.lines.splice(Number(b.getAttribute('data-ldel')), 1); redraw(); }; });
    const ladd = el('dz-l-add');
    if (ladd) ladd.onclick = () => { it.lines = (it.lines || []).concat([{ who: e.type === 'dialogue' ? 'B' : undefined, ko: '' }]).map((l) => { if (!l.who) delete l.who; return l; }); redraw(); };
    const ids = () => new Set([].concat(it.choices || [], it.choices2 || []).map((c) => c.id));
    panel.querySelectorAll('[data-cans]').forEach((r) => {
      r.onchange = () => { const [lk, i] = r.getAttribute('data-cans').split(':'); it[lk === 'choices2' ? 'answer2' : 'answer'] = it[lk][Number(i)].id; commit(); drawPreview(); };
    });
    panel.querySelectorAll('[data-cko]').forEach((inp) => {
      inp.oninput = () => { const [lk, i] = inp.getAttribute('data-cko').split(':'); plainEdit(it[lk][Number(i)], 'ko', inp.value); commit('cko:' + lk + i); };
    });
    panel.querySelectorAll('[data-cart]').forEach((inp) => {
      inp.oninput = () => { const [lk, i] = inp.getAttribute('data-cart').split(':'); const c = it[lk][Number(i)]; if (inp.value.trim()) c.art = inp.value.trim(); else delete c.art; commit('cart:' + lk + i); };
    });
    panel.querySelectorAll('[data-cdel]').forEach((b) => {
      b.onclick = () => {
        const [lk, i] = b.getAttribute('data-cdel').split(':');
        const gone = it[lk].splice(Number(i), 1)[0];
        const ak = lk === 'choices2' ? 'answer2' : 'answer';
        if (gone && it[ak] === gone.id) it[ak] = (it[lk][0] || {}).id || '';
        redraw();
      };
    });
    panel.querySelectorAll('[data-cadd]').forEach((b) => {
      b.onclick = () => {
        const lk = b.getAttribute('data-cadd');
        const used = ids();
        let n = 1;
        while (used.has((lk === 'choices2' ? 'd' : 'c') + n)) n++;
        it[lk] = (it[lk] || []).concat([{ id: (lk === 'choices2' ? 'd' : 'c') + n, ko: '' }]);
        redraw();
      };
    });
    panel.querySelectorAll('[data-xa]').forEach((b) => {
      b.onclick = () => {
        const [act, ks] = b.getAttribute('data-xa').split(':');
        const k = Number(ks);
        const list = (it.extra || []).slice();
        if (act === 'del') {
          if (!window.confirm(T('Delete custom field {n}?', { n: k + 1 }))) return;
          list.splice(k, 1);
        } else {
          const j = act === 'up' ? k - 1 : k + 1;
          if (j < 0 || j >= list.length) return;
          const t = list[k]; list[k] = list[j]; list[j] = t;
        }
        if (list.length) it.extra = list; else delete it.extra;
        redraw();
      };
    });
    const xadd = el('dz-x-add');
    if (xadd) {
      xadd.onclick = () => {
        const list = it.extra || [];
        const used = new Set(list.map((x) => x && x.id));
        let n = list.length + 1;
        while (used.has('x' + n)) n++;
        it.extra = list.concat([{ id: 'x' + n, labelEn: '', noteEn: '' }]);
        redraw();
        // Straight into its heading.
        const box = document.querySelector('[data-qvi="' + p + '.extra.' + (it.extra.length - 1) + '.labelEn"]');
        if (box) box.focus();
      };
    }
    const c2 = el('dz-c2-add');
    if (c2) c2.onclick = () => { it.choices2 = [{ id: 'd1', ko: '' }, { id: 'd2', ko: '' }]; it.answer2 = 'd1'; redraw(); };
    const ans = el('dz-q-ans');
    if (ans) ans.onchange = () => { it.answer = ans.value; commit(); drawPreview(); };
    panel.querySelectorAll('[data-au]').forEach((inp) => {
      inp.oninput = () => {
        const k = inp.getAttribute('data-au');
        it.audio = it.audio || {};
        if (inp.value.trim()) it.audio[k] = k === 'askEnd' ? Number(inp.value) || inp.value : inp.value.trim(); else delete it.audio[k];
        if (!it.audio.src) delete it.audio;
        commit('au:' + k);
      };
    });
    panel.querySelectorAll('[data-chk]').forEach((c) => {
      if (c.closest('.dz-q')) c.onchange = () => { if (c.checked) it.holdGloss = true; else delete it.holdGloss; commit(); drawPreview(); };
    });
  }

  function chipEditor(e) {
    const fill = e.type === 'fill';
    return '<details class="dz-details"><summary>' + esc(T('The box · {n} entries', { n: (e.bank || []).length })) + '</summary>'
      + '<div class="dz-chiptable">' + (e.bank || []).map((c, i) => '<div class="dz-chiprow"><input class="form-input dz-art" data-bk="' + i + ':id" value="' + esc(c.id) + '" title="id">'
        + (fill ? '<input class="form-input" data-bk="' + i + ':dict" value="' + esc(c.dict || '') + '" placeholder="dictionary form"><input class="form-input" data-bk="' + i + ':polite" value="' + esc(c.polite || '') + '" placeholder="form in the sentence">'
          : '<input class="form-input" data-bk="' + i + ':ko" value="' + esc(c.ko || '') + '" placeholder="Korean"><input class="form-input dz-art" data-bk="' + i + ':mark" value="' + esc(c.mark || '') + '" placeholder="①">')
        + '<label class="dz-check" title="The worked example uses this one"><input type="checkbox" data-bex="' + i + '"' + (c.usedByExample ? ' checked' : '') + '>ex</label>'
        + '<button type="button" class="dz-mini" data-bdel="' + i + '">✕</button></div>').join('')
      + '</div><button type="button" class="dz-link" id="dz-bk-add">＋ Add an entry</button></details>';
  }
  function bindChipEditor(panel, e) {
    panel.querySelectorAll('[data-bk]').forEach((inp) => {
      inp.oninput = () => {
        const [i, k] = inp.getAttribute('data-bk').split(':');
        const c = e.bank[Number(i)];
        if (k === 'id') {
          const old = c.id;
          c.id = inp.value.trim();
          (e.items || []).forEach((it) => { if (it.answer === old) it.answer = c.id; });
          if (e.example && e.example.answer === old) e.example.answer = c.id;
        } else if (inp.value.trim()) c[k] = inp.value; else delete c[k];
        commit('bk:' + i + k);
      };
    });
    panel.querySelectorAll('[data-bex]').forEach((cb) => {
      cb.onchange = () => {
        const i = Number(cb.getAttribute('data-bex'));
        e.bank.forEach((c, k) => { if (k !== i) delete c.usedByExample; });
        if (cb.checked) e.bank[i].usedByExample = true; else delete e.bank[i].usedByExample;
        commit();
        renderInspector();
      };
    });
    panel.querySelectorAll('[data-bdel]').forEach((b) => {
      b.onclick = () => {
        const gone = e.bank[Number(b.getAttribute('data-bdel'))];
        if ((e.items || []).some((it) => it.answer === gone.id) && !window.confirm('"' + gone.id + '" answers a question. Remove it anyway?')) return;
        e.bank.splice(Number(b.getAttribute('data-bdel')), 1);
        commit();
        renderInspector();
      };
    });
    const add = el('dz-bk-add');
    if (add) add.onclick = () => {
      const ids = new Set((e.bank || []).map((c) => c.id));
      let n = (e.bank || []).length + 1;
      while (ids.has('new_' + n)) n++;
      e.bank = (e.bank || []).concat([e.type === 'fill' ? { id: 'new_' + n, dict: '', polite: '' } : { id: 'new_' + n, ko: '' }]);
      commit();
      renderInspector();
    };
  }

  // ── Pictures ─────────────────────────────────────────────────────────────
  async function openMedia(cb) {
    const modal = el('dz-modal');
    if (!modal) return;
    let tab = 'uploads';
    let query = '';
    const close = (src) => { modal.classList.add('hidden'); modal.innerHTML = ''; if (src) cb(src); };
    const draw = () => {
      const items = (S.media && S.media.items) || [];
      const art = ((S.art && S.art.assets) || []).filter((a) => a.status === 'shipped' && !/^(characters|ui|plants|terrain|tiles|skins)\//.test(a.path || ''))
        .filter((a) => !query || (a.nameEn + ' ' + (a.wordKo || '') + ' ' + a.path).toLowerCase().indexOf(query.toLowerCase()) >= 0).slice(0, 240);
      modal.innerHTML = '<div class="dz-modal-box"><div class="dz-modal-head"><b>Pictures</b>'
        + seg('dz-mtab', [['uploads', T('Uploaded ({n})', { n: items.length })], ['art', 'Game art']], tab)
        + '<span class="dz-grow"></span><button type="button" class="dz-mini" id="dz-mclose">✕</button></div>'
        + (tab === 'uploads'
          ? '<label class="dz-drop" id="dz-drop"><input type="file" id="dz-file" accept="image/png,image/jpeg,image/webp,image/gif" hidden>'
            + '<b>⬆ Upload a picture</b><span>PNG, JPEG, WebP or GIF · drop it here or click · large photos are shrunk before they upload</span></label>'
            + (S.media && S.media.note ? '<p class="dz-note">' + esc(S.media.note) + '</p>' : '')
            + '<div class="dz-mgrid">' + items.map((m) => '<button type="button" class="dz-mcell" data-src="' + esc(m.src) + '" title="' + esc(m.name) + '">'
              + '<img src="' + esc(S.assetBase + m.src) + '" alt="" loading="lazy"><small>' + esc(m.name) + '</small></button>').join('') + '</div>'
          : '<input class="form-input" id="dz-mq" placeholder="Search the game’s art — 김치, apple, desk…" value="' + esc(query) + '">'
            + '<div class="dz-mgrid">' + art.map((a) => '<button type="button" class="dz-mcell" data-src="sprites/' + esc(a.path) + '" title="' + esc(a.nameEn) + '">'
              + '<img src="' + esc(S.assetBase + 'sprites/' + a.path) + '" alt="" loading="lazy"><small>' + esc(a.wordKo || a.nameEn) + '</small></button>').join('') + '</div>')
        + '</div>';
      modal.classList.remove('hidden');
      el('dz-mclose').onclick = () => close(null);
      modal.onclick = (ev) => { if (ev.target === modal) close(null); };
      bindSeg('dz-mtab', async (v) => {
        tab = v;
        if (v === 'art' && !S.art) { try { S.art = (await window.apiFetch.getArt()).data; } catch (e) { S.art = { assets: [] }; } }
        draw();
      });
      modal.querySelectorAll('[data-src]').forEach((b) => { b.onclick = () => close(b.getAttribute('data-src')); });
      const q = el('dz-mq');
      if (q) { q.oninput = () => { query = q.value; draw(); const q2 = el('dz-mq'); q2.focus(); q2.setSelectionRange(q2.value.length, q2.value.length); }; }
      const file = el('dz-file');
      const drop = el('dz-drop');
      if (file) file.onchange = () => { if (file.files[0]) upload(file.files[0]); };
      if (drop) {
        drop.ondragover = (ev) => { ev.preventDefault(); drop.classList.add('over'); };
        drop.ondragleave = () => drop.classList.remove('over');
        drop.ondrop = (ev) => { ev.preventDefault(); drop.classList.remove('over'); const f = ev.dataTransfer.files[0]; if (f) upload(f); };
      }
    };
    const upload = async (f) => {
      try {
        const ready = await shrink(f);
        const data = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(ready); });
        const r = await window.apiFetch.uploadMedia(f.name, data);
        const d = r.data || {};
        window.Toast.success(esc(d.note || 'Uploaded.'), 'Picture');
        S.media = null;
        close(d.src);
      } catch (e) { /* apiFetch already said why */ }
    };
    if (!S.media) {
      try { S.media = (await window.apiFetch.listMedia()).data; } catch (e) { S.media = { items: [] }; }
    }
    draw();
  }

  // A photo straight off a phone is several megabytes and thousands of pixels wide; the page
  // never draws one wider than about 1100px. Big pictures are scaled to 1600px and saved as WebP.
  // Small ones — pixel art above all — are sent exactly as they are.
  async function shrink(file) {
    if (/gif|svg/.test(file.type)) return file;
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      const max = 1600;
      const big = Math.max(img.naturalWidth, img.naturalHeight);
      if (file.size <= 900 * 1024 && big <= max) return file;
      const scale = Math.min(1, max / big);
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * scale);
      c.height = Math.round(img.naturalHeight * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const blob = await new Promise((res) => c.toBlob(res, 'image/webp', 0.88));
      if (!blob) return file;
      return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
    } finally { URL.revokeObjectURL(url); }
  }

  // ── Entry ────────────────────────────────────────────────────────────────
  window.DesignerView = {
    async render() {
      const root = el('designer-root');
      if (!root) return;
      if (!S.booted) {
        root.innerHTML = '<p class="dz-muted dz-pad">Loading the Designer…</p>';
        try { await boot(); } catch (e) { root.innerHTML = '<p class="dz-pad">' + esc(T('Could not start the Designer: {why}', { why: e.message })) + '</p>'; return; }
        shell();
      } else if (!el('dz-bar')) shell();
      // Sent here by the Workbooks tab ({ designer: true }) or by the Content tab's Open button,
      // which names the bank by its registry key.
      const focus = (window.AppState || {}).focus;
      if (focus && (focus.designer || String(focus.key || '').indexOf('bank/') === 0)) {
        window.AppState.focus = null;
        if (focus.unit && focus.unit !== S.key) { if (!(await loadBank(focus.unit))) return; }
        if (typeof focus.exIndex === 'number') S.exIndex = focus.exIndex;
      }
      if (!S.bank) {
        const first = S.banks.indexOf('unit12-textbook') >= 0 ? 'unit12-textbook' : S.banks[0];
        if (first) await loadBank(first);
        return;
      }
      renderAll();
    },
    // For the Workbooks tab: open a bank (and a page) here.
    open(unit, exIndex) {
      window.AppState = window.AppState || {};
      window.AppState.focus = { designer: true, unit, exIndex };
      location.hash = '#designer';
    },
    _state: S
  };
}());
