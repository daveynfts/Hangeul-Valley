/**
 * Translate tab — every translatable string in the game, beside its English.
 *
 * The shape of the work decided the shape of the screen. Translating is done one string at
 * a time against the English next to it, so the editor is a list of pairs rather than the
 * whole-file JSON box the Content tab offers: a curriculum file is 300 strings buried in
 * structure, and finding the untranslated ones in raw JSON is the job, not the edit.
 *
 * Three things the server decides and this only renders:
 *   · which strings exist          (scanned from the curriculum, never typed here)
 *   · which are already done       (the catalogue under locales/)
 *   · which have gone stale        (a catalogue entry whose English no longer exists)
 *
 * Edits are held locally until Save, because a translator works down a screenful and a
 * request per keystroke would make the coverage numbers flicker while they typed.
 */

window.I18nView = (function () {
  const state = {
    lang: 'vi',
    langs: [],
    report: null,
    source: null,
    rows: [],
    stale: [],
    edits: {},          // catalogue key → translation, unsaved
    filter: 'todo',
    search: '',
    loading: false
  };

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  function status(kind, title, detail) {
    const el = $('tr-status');
    if (!el) return;
    el.className = 'content-status' + (kind ? ' ' + kind : '');
    el.innerHTML = kind
      ? '<strong>' + esc(title) + '</strong>' + (detail ? '<span>' + esc(detail) + '</span>' : '')
      : '';
  }

  function dirtyCount() {
    return Object.keys(state.edits).length;
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  async function loadReport() {
    const res = await window.apiFetch.i18nReport(state.lang);
    state.report = res.data;
    // The language list travels with the report, so the picker is never a second copy.
    if (res.data && res.data.langs) {
      window.AppState = window.AppState || {};
      window.AppState.i18nLangs = res.data.langs;
      state.langs = res.data.langs;
    }
    renderTotals();
    renderFiles();
  }

  async function loadSource(source) {
    if (dirtyCount() && !confirm(dirtyCount() + ' unsaved translation(s) will be lost. Switch anyway?')) return;
    state.source = source;
    state.edits = {};
    state.loading = true;
    renderFiles();
    renderRows();
    try {
      const res = await window.apiFetch.i18nRows(source, state.lang);
      state.rows = res.data.rows || [];
      state.stale = res.data.stale || [];
      state.generated = !!res.data.generated;
      status('');
    } catch (e) {
      state.rows = [];
      state.stale = [];
    }
    state.loading = false;
    renderHead();
    renderRows();
  }

  // ── Rendering ──────────────────────────────────────────────────────────────
  function renderTotals() {
    const box = $('tr-totals');
    if (!box) return;
    const t = state.report && state.report.totals;
    if (!t) { box.innerHTML = ''; return; }
    const cell = (num, label, warn) =>
      '<div class="tr-total"><span class="tr-total-num' + (warn ? ' warn' : '') + '">' + esc(num)
      + '</span><span class="tr-total-label">' + esc(label) + '</span></div>';
    box.innerHTML = cell(t.percent + '%', 'translated into ' + langName(state.lang))
      + cell(t.done + ' / ' + t.total, 'strings')
      + cell(t.todoWords.toLocaleString(), 'words still to translate')
      + cell(t.stale, 'stale — the English changed', t.stale > 0);
  }

  function langName(code) {
    const hit = state.langs.find((l) => l.code === code);
    return (hit && hit.native) || code;
  }

  function renderFiles() {
    const box = $('tr-files');
    if (!box) return;
    if (!state.report) { box.innerHTML = '<p class="content-empty">Loading…</p>'; return; }
    const groups = {};
    state.report.files.forEach((f) => { (groups[f.group] = groups[f.group] || []).push(f); });
    box.innerHTML = Object.keys(groups).map((g) =>
      '<div class="content-group"><p class="content-group-title">' + esc(g) + '</p>'
      + groups[g].map((f) => {
        const pct = f.total ? Math.round((f.done / f.total) * 100) : 100;
        return '<button type="button" class="tr-file' + (f.source === state.source ? ' active' : '')
          + (pct === 100 ? ' done' : '') + '" data-tr-source="' + esc(f.source) + '">'
          + '<span class="tr-file-top"><span>' + esc(f.label) + '</span>'
          + '<span class="tr-file-count">' + f.done + '/' + f.total
          + (f.stale ? ' ⚠' + f.stale : '') + '</span></span>'
          + '<span class="tr-file-bar"><span class="tr-file-fill" style="width:' + pct + '%"></span></span>'
          + '</button>';
      }).join('') + '</div>').join('');
    box.querySelectorAll('[data-tr-source]').forEach((b) => {
      b.onclick = () => loadSource(b.getAttribute('data-tr-source'));
    });
  }

  function renderHead() {
    const head = $('tr-head');
    const bar = $('tr-toolbar');
    if (!head) return;
    if (!state.source) {
      head.innerHTML = '<h3 class="content-title">Pick a file</h3>'
        + '<p class="content-sub">Interface strings first — they are what every screen is made of.'
        + ' Then a unit at a time.</p>';
      if (bar) bar.hidden = true;
      return;
    }
    const f = (state.report.files || []).find((x) => x.source === state.source) || {};
    head.innerHTML = '<h3 class="content-title">' + esc(f.label || state.source) + '</h3>'
      + '<p class="content-sub">' + esc(f.done || 0) + ' of ' + esc(f.total || 0) + ' done'
      + (f.todoWords ? ' · ' + Number(f.todoWords).toLocaleString() + ' words left' : '')
      + ' · <code>' + esc(state.source) + '</code></p>';
    if (bar) bar.hidden = false;
  }

  function visibleRows() {
    const q = state.search.trim().toLowerCase();
    return state.rows.filter((r) => {
      const target = state.edits[r.key] !== undefined ? state.edits[r.key] : r.target;
      const done = !!String(target || '').trim();
      if (state.filter === 'todo' && done) return false;
      if (state.filter === 'done' && !done) return false;
      if (state.filter === 'stale') return false;
      if (!q) return true;
      return r.text.toLowerCase().indexOf(q) >= 0
        || String(target || '').toLowerCase().indexOf(q) >= 0;
    });
  }

  function renderRows() {
    const box = $('tr-rows');
    if (!box) return;
    if (state.loading) { box.innerHTML = '<p class="tr-empty">Loading…</p>'; return; }
    if (!state.source) { box.innerHTML = '<p class="tr-empty">Nothing selected.</p>'; return; }

    if (state.filter === 'stale') {
      box.innerHTML = state.stale.length
        ? '<p class="tr-stale-note">These translations answer English that is no longer in the file —'
          + ' the sentence was edited after they were written. Nothing reads them. Re-translate the'
          + ' new English under “Untranslated”, then prune with'
          + ' <code>node scripts/i18n_report.js --prune</code>.</p>'
          + state.stale.map((s) =>
            '<div class="tr-row"><div class="tr-src"><span class="tr-field">' + esc(s.field) + '</span>'
            + '<div class="tr-en">' + esc(s.text) + '</div></div>'
            + '<div class="tr-en">' + esc(s.target) + '</div></div>').join('')
        : '<p class="tr-empty">Nothing stale — every translation still matches its English.</p>';
      return;
    }

    const rows = visibleRows();
    if (!rows.length) {
      box.innerHTML = '<p class="tr-empty">'
        + (state.filter === 'todo' ? 'Nothing left to translate here.' : 'No strings match.')
        + '</p>';
      return;
    }
    // Capped, because levels.json is 1,626 rows and a textarea each is a slow page for no
    // gain — nobody translates 1,626 strings without scrolling or searching first.
    const LIMIT = 250;
    const shown = rows.slice(0, LIMIT);
    box.innerHTML = shown.map((r) => {
      const target = state.edits[r.key] !== undefined ? state.edits[r.key] : (r.target || '');
      const dirty = state.edits[r.key] !== undefined;
      const done = !!String(target).trim();
      return '<div class="tr-row' + (dirty ? ' is-dirty' : (done ? ' is-done' : '')) + '">'
        + '<div class="tr-src"><span class="tr-field">' + esc(r.field) + '</span>'
        + '<div class="tr-en">' + esc(r.text) + '</div>'
        + '<div class="tr-where">' + esc((r.paths || []).slice(0, 3).join('  ·  '))
        + (r.count > 1 ? '  ·  ×' + r.count : '') + '</div></div>'
        + '<textarea class="tr-box" data-tr-key="' + esc(r.key) + '" rows="'
        + Math.min(10, Math.max(1, Math.ceil(r.text.length / 60)))
        + '" placeholder="' + esc(langName(state.lang)) + '…"'
        + (state.generated ? ' disabled' : '') + '>' + esc(target) + '</textarea>'
        + '</div>';
    }).join('')
      + (rows.length > LIMIT
        ? '<p class="tr-empty">' + (rows.length - LIMIT) + ' more — search to narrow the list.</p>'
        : '');

    box.querySelectorAll('[data-tr-key]').forEach((ta) => {
      ta.oninput = () => {
        const key = ta.getAttribute('data-tr-key');
        const row = state.rows.find((r) => r.key === key);
        const value = ta.value;
        if (row && value === (row.target || '')) delete state.edits[key];
        else state.edits[key] = value;
        ta.closest('.tr-row').classList.toggle('is-dirty', state.edits[key] !== undefined);
        renderDirty();
      };
    });
    renderDirty();
  }

  function renderDirty() {
    const n = dirtyCount();
    const el = $('tr-dirty');
    if (el) el.textContent = n ? n + ' unsaved' : '';
    const save = $('tr-save');
    const revert = $('tr-revert');
    const writable = window.AppState && window.AppState.adminWritable !== false;
    if (save) save.disabled = !n || !writable || !!state.generated;
    if (revert) revert.disabled = !n;
  }

  async function save() {
    if (!state.source || !dirtyCount()) return;
    status('busy', 'Saving ' + dirtyCount() + ' translation(s)…');
    try {
      const res = await window.apiFetch.i18nSave(state.source, state.lang, state.edits);
      const d = res.data || {};
      state.edits = {};
      // A rejected key is one whose English changed between this page loading and Save —
      // rare, and silently dropping it would lose the work without saying so.
      status(d.rejected && d.rejected.length ? 'bad' : 'ok',
        d.written + ' saved' + (d.cleared ? ', ' + d.cleared + ' cleared' : '')
          + ' · ' + d.done + '/' + d.total + ' done',
        d.rejected && d.rejected.length
          ? d.rejected.length + ' were refused — their English has changed since this page loaded.'
            + ' Refresh and re-translate them.'
          : (d.note || 'Written to locales/. Commit and publish to ship it.'));
      await loadReport();
      await loadSource(state.source);
    } catch (e) {
      status('bad', 'Not saved', e.message);
    }
  }

  function bind() {
    if (bind.done) return;
    bind.done = true;
    const sel = $('tr-lang');
    if (sel) sel.onchange = async () => {
      if (dirtyCount() && !confirm(dirtyCount() + ' unsaved translation(s) will be lost. Switch language anyway?')) {
        sel.value = state.lang;
        return;
      }
      state.lang = sel.value;
      state.edits = {};
      await loadReport();
      if (state.source) await loadSource(state.source);
    };
    const refresh = $('btn-tr-refresh');
    if (refresh) refresh.onclick = async () => {
      await loadReport();
      if (state.source) await loadSource(state.source);
    };
    const search = $('tr-search');
    if (search) search.oninput = () => { state.search = search.value; renderRows(); };
    document.querySelectorAll('[data-tr-filter]').forEach((b) => {
      b.onclick = () => {
        state.filter = b.getAttribute('data-tr-filter');
        document.querySelectorAll('[data-tr-filter]').forEach((x) =>
          x.classList.toggle('active', x === b));
        renderRows();
      };
    });
    const saveBtn = $('tr-save');
    if (saveBtn) saveBtn.onclick = save;
    const revert = $('tr-revert');
    if (revert) revert.onclick = () => { state.edits = {}; renderRows(); };
  }

  async function render() {
    bind();
    const sel = $('tr-lang');
    if (sel && !sel.options.length) {
      // The list comes from js/i18n.js by way of the server, so adding a language is one
      // line there rather than one line in every screen that offers a choice.
      state.langs = (window.AppState && window.AppState.i18nLangs) || [{ code: 'vi', native: 'Tiếng Việt' }];
      sel.innerHTML = state.langs.map((l) =>
        '<option value="' + esc(l.code) + '">' + esc(l.native) + '</option>').join('');
      sel.value = state.lang;
    }
    if (!state.report) await loadReport();
    renderTotals();
    renderFiles();
    renderHead();
    renderRows();
  }

  return { render, state };
}());
