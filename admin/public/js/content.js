/**
 * The Content tab — every editable file in one place.
 *
 * The registry behind this has existed since the admin learned to write on production, and
 * until now none of it was reachable: the panel had a screen for Unit 10 and a screen for
 * workbooks, and the other nineteen files had nowhere to be opened from. This is that place.
 *
 * It is a directory first and a JSON editor second, and that order matters. Seventeen of the
 * twenty-one files already have a proper editor somewhere in this panel — a word table, a quiz
 * builder, an exercise page — and listing all of them as raw JSON made the whole thing look
 * far harder than it is. Each row now says where its file is really edited and takes you
 * there; the JSON box is the way in for the four cassette banks, which have no editor of their
 * own, and the way out of trouble for everything else.
 *
 * No form per kind, though. A cassette bank and a level list have almost nothing in common,
 * and a form that half-fits invites edits the validator then refuses. The validator is the
 * same one CI runs, so what the JSON box owes the user is a clear refusal, not a shape guess.
 */
(function () {
  'use strict';

  const S = {
    list: [],
    key: null,
    label: '',
    rel: '',
    original: '',
    busy: false,
    status: null   // { kind: 'ok' | 'bad' | 'busy', text, detail }
  };

  const el = (id) => document.getElementById(id);
  const esc = (v) => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function setStatus(kind, text, detail) {
    S.status = text ? { kind, text, detail } : null;
    paintStatus();
  }

  function paintStatus() {
    const box = el('content-status');
    if (!box) return;
    if (!S.status) { box.className = 'content-status'; box.innerHTML = ''; return; }
    box.className = 'content-status ' + S.status.kind;
    box.innerHTML = '<strong>' + esc(S.status.text) + '</strong>'
      + (S.status.detail ? '<span>' + esc(S.status.detail) + '</span>' : '');
  }

  // Jump to wherever a file is properly edited, carrying which unit and which panel with it.
  // The target view reads AppState.focus on render, so this works whether or not that tab has
  // been opened before.
  function jump(entry) {
    if (!entry || !entry.editor) return;
    window.AppState = window.AppState || {};
    window.AppState.focus = {
      panel: entry.editor.panel || null,
      unit: entry.editor.unit || null,
      key: entry.key
    };
    location.hash = '#' + entry.editor.tab;
  }

  function paintList() {
    const box = el('content-list');
    if (!box) return;
    if (!S.list.length) { box.innerHTML = '<p class="content-empty">Nothing to edit here.</p>'; return; }
    const groups = [];
    S.list.forEach((c) => {
      let g = groups.find((x) => x.name === c.group);
      if (!g) { g = { name: c.group, items: [] }; groups.push(g); }
      g.items.push(c);
    });
    box.innerHTML = groups.map((g) =>
      '<div class="content-group">'
      + '<h4 class="content-group-title">' + esc(g.name) + '</h4>'
      + g.items.map((c) => {
        const where = c.editor
          ? '<span class="content-where">' + esc(c.editor.label) + '</span>'
          : '<span class="content-where none">JSON only</span>';
        const go = c.editor
          ? '<button type="button" class="content-go" data-go="' + esc(c.key) + '">Open</button>'
          : '';
        return '<div class="content-row' + (c.key === S.key ? ' active' : '') + '">'
          + '<span class="content-name">' + esc(c.label) + '</span>'
          + where + go
          + '<button type="button" class="content-json-btn" data-key="' + esc(c.key) + '"'
          + ' title="Edit the raw file">JSON</button>'
          + '</div>';
      }).join('')
      + '</div>').join('');
    box.querySelectorAll('.content-json-btn').forEach((b) => {
      b.onclick = () => open(b.getAttribute('data-key'));
    });
    box.querySelectorAll('.content-go').forEach((b) => {
      b.onclick = () => jump(S.list.find((c) => c.key === b.getAttribute('data-go')));
    });
  }

  function paintEditor() {
    const head = el('content-head');
    const area = el('content-json');
    const save = el('content-save');
    const revert = el('content-revert');
    if (!head || !area) return;
    if (!S.key) {
      head.innerHTML = '<h3 class="content-title">Every file the game loads</h3>'
        + '<p class="content-sub">Most of them have a proper editor \u2014 a word table, a quiz'
        + ' builder, an exercise page \u2014 and <b>Open</b> takes you straight there. <b>JSON</b>'
        + ' edits the raw file, which is the only way in for the cassette banks and a way out of'
        + ' trouble for everything else.</p>';
      area.value = '';
      area.disabled = true;
      if (save) save.disabled = true;
      if (revert) revert.disabled = true;
      return;
    }
    head.innerHTML = '<h3 class="content-title">' + esc(S.label) + '</h3>'
      + '<p class="content-sub"><code>' + esc(S.rel) + '</code></p>';
    area.disabled = S.busy;
    const dirty = area.value !== S.original;
    if (save) save.disabled = S.busy || !dirty;
    if (revert) revert.disabled = S.busy || !dirty;
  }

  async function open(key) {
    const entry = S.list.find((c) => c.key === key);
    if (!entry) return;
    S.key = key;
    S.label = entry.label;
    S.busy = true;
    setStatus('busy', 'Loading…');
    paintList();
    paintEditor();
    try {
      const r = await window.apiFetch.getContent(key);
      S.rel = r.data.rel || '';
      S.original = JSON.stringify(r.data.body, null, 2);
      const area = el('content-json');
      if (area) area.value = S.original;
      setStatus(null, '');
    } catch (e) {
      setStatus('bad', 'Could not load it', e.message);
    } finally {
      S.busy = false;
      paintEditor();
    }
  }

  async function save() {
    const area = el('content-json');
    if (!area || !S.key) return;
    let body;
    // Parsed here first so a stray comma is a message about a stray comma, rather than a
    // round trip that comes back as a generic 400.
    try { body = JSON.parse(area.value); }
    catch (e) { setStatus('bad', 'That is not valid JSON', e.message); return; }
    S.busy = true;
    setStatus('busy', 'Checking and saving…');
    paintEditor();
    try {
      const r = await window.apiFetch.saveContent(S.key, body);
      const d = r.data || {};
      S.original = JSON.stringify(d.body, null, 2);
      area.value = S.original;
      // The response says what actually happened rather than "Saved": on production the CDN
      // is live immediately and the invariants run afterwards, and those are two different
      // kinds of done.
      const where = d.unchanged ? 'Nothing had changed — no commit made.'
        : (d.note || 'Written to the working tree.');
      setStatus('ok', d.unchanged ? 'Already up to date' : 'Saved',
        where + (d.branch ? ' Branch: ' + d.branch + '.' : ''));
    } catch (e) {
      setStatus('bad', 'Refused', e.message);
    } finally {
      S.busy = false;
      paintEditor();
    }
  }

  window.ContentView = {
    async render() {
      const area = el('content-json');
      if (area && !area._bound) {
        area._bound = true;
        area.addEventListener('input', paintEditor);
        // Tab should indent, not leave the editor. A JSON editor you cannot indent in is a
        // JSON editor you will paste into from somewhere else.
        area.addEventListener('keydown', (e) => {
          if (e.key !== 'Tab') return;
          e.preventDefault();
          const s = area.selectionStart, t = area.selectionEnd;
          area.value = area.value.slice(0, s) + '  ' + area.value.slice(t);
          area.selectionStart = area.selectionEnd = s + 2;
          paintEditor();
        });
      }
      const saveBtn = el('content-save');
      if (saveBtn && !saveBtn._bound) { saveBtn._bound = true; saveBtn.onclick = save; }
      const revertBtn = el('content-revert');
      if (revertBtn && !revertBtn._bound) {
        revertBtn._bound = true;
        revertBtn.onclick = () => {
          const a = el('content-json');
          if (a) a.value = S.original;
          setStatus(null, '');
          paintEditor();
        };
      }

      if (!S.list.length) {
        try {
          const r = await window.apiFetch.listContent();
          S.list = r.data || [];
        } catch (e) {
          setStatus('bad', 'Could not read the content list', e.message);
        }
      }
      paintList();
      paintEditor();
      paintStatus();
    }
  };
}());
