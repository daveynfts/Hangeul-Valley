/**
 * Unit 14 workbook editor — worlds/unit14-workbook.json.
 *
 * One exercise is edited at a time, mirroring how the game presents them. The
 * form shape follows the exercise `type`, because the three types genuinely
 * differ in what a row needs: a fill chip carries two forms, a dialogue line
 * needs a {} placeholder, a match chip carries its printed ①②③④ mark.
 *
 * The server validates on save and refuses anything the game could not render,
 * so the error toast here is the real gate — this form only has to make the
 * common edits quick.
 */
(function () {
  const state = {
    book: null,
    index: 0,
    dirty: false
  };

  const TYPE_LABEL = {
    fill: 'Fill the sentence ending',
    match: 'Join two columns',
    dialogue: 'Complete a dialogue',
    experience: 'Pick the form, then answer for yourself',
    build: 'Build the line from its own choices'
  };

  // These two carry their choices on each question rather than in one shared
  // box, so the box-and-answer form below does not describe them. Rather than
  // show a form whose fields mean nothing here — and which would be refused on
  // save — the wording and the questions are shown read-only.
  const PER_ITEM = ['experience', 'build'];

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function ex() {
    return (state.book && state.book.exercises && state.book.exercises[state.index]) || null;
  }

  function markDirty() {
    state.dirty = true;
    const btn = document.getElementById('u14-save');
    if (btn) btn.classList.add('btn-primary');
    const flag = document.getElementById('u14-dirty');
    if (flag) flag.textContent = 'Unsaved changes';
  }

  function clearDirty() {
    state.dirty = false;
    const flag = document.getElementById('u14-dirty');
    if (flag) flag.textContent = '';
  }

  // ── Exercise list ──────────────────────────────────────────────────────────
  function renderList() {
    const box = document.getElementById('u14-list');
    if (!box || !state.book) return;
    const items = state.book.exercises || [];
    box.innerHTML = items.map((e, i) => `
      <button type="button" class="u14-listbtn${i === state.index ? ' active' : ''}" data-i="${i}">
        <span class="u14-list-icon">${esc(e.icon || '📝')}</span>
        <span class="u14-list-text">
          <span class="u14-list-no">${esc(e.section || '')} · ${esc(e.no || '')}</span>
          <span class="u14-list-type">${esc(TYPE_LABEL[e.type] || e.type || 'fill')} · ${(e.items || []).length} Q</span>
        </span>
      </button>`).join('');
    box.querySelectorAll('.u14-listbtn').forEach((b) => {
      b.onclick = () => {
        state.index = Number(b.dataset.i);
        renderList();
        renderForm();
      };
    });
  }

  // ── An exercise whose choices live on each question ────────────────────────
  // The wording is the part that is safe and useful to edit here: it is the same
  // shape whatever the type. The questions carry per-row choices, art keys and
  // {} placeholders that the server checks against each other, so they are
  // listed rather than offered as inputs — an edit box that can only produce a
  // refused save is worse than no edit box.
  function renderPerItemForm(host, e) {
    const two = (it) => !!it.choices2;
    const line = (it) => (it.lines || []).map((l) =>
      `<div class="u14-ro-line">${l.who ? `<b>${esc(l.who)}</b> ` : ''}${esc(l.ko)}</div>`).join('')
      || `<div class="u14-ro-line">${esc(it.stemKo || '')}</div>`;
    const forms = (list, answer) => (list || []).map((c) =>
      `<span class="u14-ro-chip${c.id === answer ? ' key' : ''}">${esc(c.ko)}</span>`).join('');

    host.innerHTML = `
      <div class="card widget-card">
        <div class="card-header-row">
          <h3 class="widget-title">${esc(e.section || '')} · ${esc(e.no || '')}</h3>
          <span class="u14-type-label">${esc(TYPE_LABEL[e.type] || e.type)}</span>
        </div>
        <div class="u14-grid2">
          <label>Exercise id <input class="form-input" data-meta="id" value="${esc(e.id)}"></label>
          <label>Grammar point <input class="form-input" data-meta="pattern" value="${esc(e.pattern)}"></label>
          <label>Section (KO) <input class="form-input" data-meta="section" value="${esc(e.section)}"></label>
          <label>Section (EN) <input class="form-input" data-meta="sectionEn" value="${esc(e.sectionEn)}"></label>
          <label>연습 number <input class="form-input" data-meta="no" value="${esc(e.no)}"></label>
          <label>Icon <input class="form-input" data-meta="icon" value="${esc(e.icon)}"></label>
        </div>
        <label>Instruction (KO) <input class="form-input" data-meta="instructionKo" value="${esc(e.instructionKo)}"></label>
        <label>Instruction (EN) <input class="form-input" data-meta="instructionEn" value="${esc(e.instructionEn)}"></label>
        <label>List blurb (EN) <input class="form-input" data-meta="blurbEn" value="${esc(e.blurbEn)}"></label>
        <label>Note shown above the questions (EN)
          <textarea class="form-input" rows="2" data-meta="noteEn">${esc(e.noteEn)}</textarea></label>
      </div>

      <div class="card widget-card">
        <div class="card-header-row">
          <h3 class="widget-title">Questions — ${(e.items || []).length}</h3>
        </div>
        <p class="section-desc">Each question here carries its own choices, its picture and the
          <code>{}</code> that marks where the answer goes, and the server checks those against
          each other on save. Edit the wording above; edit the questions in
          <code>worlds/unit14-workbook.json</code>. The green choice is the answer.</p>
        <div id="u14-items">
          ${(e.items || []).map((it) => `
          <div class="u14-item u14-readonly">
            <div class="u14-item-head">
              <span class="u14-item-n">${it.n})</span>
              <span class="u14-ro-phrase">${esc(it.phraseKo || '')}</span>
              ${it.art ? `<code class="u14-ro-art">${esc(it.art)}</code>` : ''}
            </div>
            ${line(it)}
            <div class="u14-ro-forms">${forms(it.choices, it.answer)}</div>
            ${two(it) ? `<div class="u14-ro-forms">${forms(it.choices2, it.answer2)}</div>` : ''}
            <div class="u14-ro-en">${esc(it.en || '')}</div>
          </div>`).join('')}
        </div>
      </div>`;

    bindForm();
  }

  // ── The selected exercise ──────────────────────────────────────────────────
  function renderForm() {
    const host = document.getElementById('u14-form');
    const e = ex();
    if (!host) return;
    if (!e) { host.innerHTML = '<p class="text-muted">No exercise selected.</p>'; return; }

    if (PER_ITEM.includes(e.type)) { renderPerItemForm(host, e); return; }

    const isDlg = e.type === 'dialogue';
    const isFill = e.type === 'fill';
    const chips = e.bank || [];
    const options = chips.map((c) =>
      `<option value="${esc(c.id)}">${esc(c.id)} — ${esc(c.dict || c.ko || '')}${c.usedByExample ? ' (example)' : ''}</option>`
    ).join('');

    host.innerHTML = `
      <div class="card widget-card">
        <div class="card-header-row">
          <h3 class="widget-title">${esc(e.section || '')} · ${esc(e.no || '')}</h3>
          <span class="u14-type-label">${esc(TYPE_LABEL[e.type] || e.type)}</span>
        </div>
        <div class="u14-grid2">
          <label>Exercise id <input class="form-input" data-meta="id" value="${esc(e.id)}"></label>
          <label>Type
            <select class="form-select" data-meta="type">
              ${['fill', 'match', 'dialogue'].map((t) =>
                `<option value="${t}"${t === e.type ? ' selected' : ''}>${t}</option>`).join('')}
            </select>
          </label>
          <label>Section (KO) <input class="form-input" data-meta="section" value="${esc(e.section)}"></label>
          <label>Section (EN) <input class="form-input" data-meta="sectionEn" value="${esc(e.sectionEn)}"></label>
          <label>연습 number <input class="form-input" data-meta="no" value="${esc(e.no)}"></label>
          <label>Icon <input class="form-input" data-meta="icon" value="${esc(e.icon)}"></label>
        </div>
        <label>Instruction (KO) <input class="form-input" data-meta="instructionKo" value="${esc(e.instructionKo)}"></label>
        <label>Instruction (EN) <input class="form-input" data-meta="instructionEn" value="${esc(e.instructionEn)}"></label>
        <label>List blurb (EN) <input class="form-input" data-meta="blurbEn" value="${esc(e.blurbEn)}"></label>
        <label>Note shown above the box (EN)
          <textarea class="form-input" rows="2" data-meta="noteEn">${esc(e.noteEn)}</textarea></label>
        ${isDlg ? `<label>B’s reply (KO) <input class="form-input" data-meta="reply" value="${esc(e.reply)}"></label>` : ''}
      </div>

      <div class="card widget-card">
        <div class="card-header-row">
          <h3 class="widget-title">The box — ${chips.length} entries</h3>
          <button type="button" class="btn btn-secondary btn-sm" id="u14-add-chip">+ Add entry</button>
        </div>
        <p class="section-desc">${isFill
          ? 'A fill entry needs both forms: the learner picks the dictionary form and the sentence shows the 해요 form.'
          : 'Mark one entry as the worked example if the book circles one. Marked entries are not offered as choices.'}</p>
        <div class="table-container">
          <table class="data-table">
            <thead><tr>
              <th>id</th>
              ${isFill ? '<th>Dictionary form</th><th>해요 form</th>' : '<th>Korean</th><th>Mark</th>'}
              <th>Example</th><th></th>
            </tr></thead>
            <tbody>
              ${chips.map((c, i) => `<tr>
                <td><input class="form-input" data-chip="${i}" data-f="id" value="${esc(c.id)}"></td>
                ${isFill
                  ? `<td><input class="form-input" data-chip="${i}" data-f="dict" value="${esc(c.dict)}"></td>
                     <td><input class="form-input" data-chip="${i}" data-f="polite" value="${esc(c.polite)}"></td>`
                  : `<td><input class="form-input" data-chip="${i}" data-f="ko" value="${esc(c.ko)}"></td>
                     <td><input class="form-input u14-narrow" data-chip="${i}" data-f="mark" value="${esc(c.mark)}"></td>`}
                <td class="u14-center"><input type="checkbox" data-chip="${i}" data-f="usedByExample"${c.usedByExample ? ' checked' : ''}></td>
                <td><button type="button" class="btn btn-danger btn-sm" data-del-chip="${i}">✕</button></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        ${e.example ? `
        <div class="u14-example">
          <h4 class="widget-title">Worked example [보기]</h4>
          <label>${isDlg ? 'A’s line — use {} where the answer goes' : 'Korean prompt'}
            <input class="form-input" data-ex="${isDlg ? 'aKo' : 'stemKo'}" value="${esc(isDlg ? e.example.aKo : e.example.stemKo)}"></label>
          <label>Answer
            <select class="form-select" data-ex="answer">${options}</select></label>
          <label>English gloss <input class="form-input" data-ex="en" value="${esc(e.example.en)}"></label>
        </div>` : ''}
      </div>

      <div class="card widget-card">
        <div class="card-header-row">
          <h3 class="widget-title">Questions — ${(e.items || []).length}</h3>
          <button type="button" class="btn btn-secondary btn-sm" id="u14-add-item">+ Add question</button>
        </div>
        <div id="u14-items">
          ${(e.items || []).map((it, i) => `
          <div class="u14-item">
            <div class="u14-item-head">
              <span class="u14-item-n">${it.n})</span>
              <label class="u14-answer">Answer
                <select class="form-select" data-item="${i}" data-f="answer">${
                  chips.map((c) => `<option value="${esc(c.id)}"${c.id === it.answer ? ' selected' : ''}>${esc(c.dict || c.ko || c.id)}</option>`).join('')
                }</select>
              </label>
              <button type="button" class="btn btn-danger btn-sm" data-del-item="${i}">✕</button>
            </div>
            <label>${isDlg ? 'A’s line — use {} where the answer goes' : 'Korean prompt'}
              <input class="form-input" data-item="${i}" data-f="${isDlg ? 'aKo' : 'stemKo'}" value="${esc(isDlg ? it.aKo : it.stemKo)}"></label>
            <label>English gloss <input class="form-input" data-item="${i}" data-f="en" value="${esc(it.en)}"></label>
            <label>Why this is the answer
              <textarea class="form-input" rows="3" data-item="${i}" data-f="why">${esc(it.why)}</textarea></label>
            <label>Grammar note
              <textarea class="form-input" rows="2" data-item="${i}" data-f="grammar">${esc(it.grammar)}</textarea></label>
          </div>`).join('')}
        </div>
      </div>`;

    bindForm();
  }

  function bindForm() {
    const host = document.getElementById('u14-form');
    const e = ex();
    if (!host || !e) return;

    host.querySelectorAll('[data-meta]').forEach((el) => {
      el.oninput = () => { e[el.dataset.meta] = el.value; markDirty(); };
      // Switching type changes which fields mean anything, so the form is rebuilt.
      if (el.dataset.meta === 'type') {
        el.onchange = () => { e.type = el.value; markDirty(); renderForm(); renderList(); };
      }
    });

    host.querySelectorAll('[data-chip]').forEach((el) => {
      const i = Number(el.dataset.chip);
      const f = el.dataset.f;
      const apply = () => {
        const chip = e.bank[i];
        if (!chip) return;
        if (f === 'usedByExample') {
          // Only one entry can be the example, so checking one clears the rest.
          if (el.checked) e.bank.forEach((c, k) => { if (k !== i) delete c.usedByExample; });
          if (el.checked) chip.usedByExample = true; else delete chip.usedByExample;
          markDirty();
          renderForm();
          return;
        }
        chip[f] = el.value;
        markDirty();
      };
      if (f === 'usedByExample') el.onchange = apply; else el.oninput = apply;
    });

    host.querySelectorAll('[data-ex]').forEach((el) => {
      el.oninput = el.onchange = () => {
        if (!e.example) e.example = {};
        e.example[el.dataset.ex] = el.value;
        markDirty();
      };
    });

    host.querySelectorAll('[data-item]').forEach((el) => {
      const i = Number(el.dataset.item);
      el.oninput = el.onchange = () => {
        const it = (e.items || [])[i];
        if (!it) return;
        it[el.dataset.f] = el.value;
        markDirty();
      };
    });

    host.querySelectorAll('[data-del-chip]').forEach((b) => {
      b.onclick = () => {
        const i = Number(b.dataset.delChip);
        const gone = e.bank[i];
        const used = (e.items || []).some((it) => it.answer === gone.id);
        if (used && !window.confirm(`"${gone.id}" is the answer to a question. Remove anyway?`)) return;
        e.bank.splice(i, 1);
        markDirty();
        renderForm();
      };
    });
    host.querySelectorAll('[data-del-item]').forEach((b) => {
      b.onclick = () => {
        e.items.splice(Number(b.dataset.delItem), 1);
        e.items.forEach((it, k) => { it.n = k + 1; });
        markDirty();
        renderForm();
      };
    });

    const addChip = document.getElementById('u14-add-chip');
    if (addChip) addChip.onclick = () => {
      const n = e.bank.length + 1;
      e.bank.push(e.type === 'fill'
        ? { id: 'new_' + n, dict: '', polite: '' }
        : { id: 'new_' + n, ko: '' });
      markDirty();
      renderForm();
    };
    const addItem = document.getElementById('u14-add-item');
    if (addItem) addItem.onclick = () => {
      e.items = e.items || [];
      const free = e.bank.find((c) => !c.usedByExample && !e.items.some((it) => it.answer === c.id));
      e.items.push({
        n: e.items.length + 1,
        answer: (free && free.id) || (e.bank[0] && e.bank[0].id) || '',
        [e.type === 'dialogue' ? 'aKo' : 'stemKo']: '',
        en: '', why: '', grammar: ''
      });
      markDirty();
      renderForm();
    };
  }

  async function save() {
    const btn = document.getElementById('u14-save');
    if (btn) btn.disabled = true;
    try {
      const res = await window.apiFetch.saveUnit14Workbook(state.book);
      const d = (res && res.data) || {};
      window.Toast.success(
        `Saved ${d.exerciseCount || 0} exercises / ${d.itemCount || 0} questions to worlds/unit14-workbook.json`);
      clearDirty();
      const fresh = await window.apiFetch.getUnit14Workbook();
      state.book = fresh.data;
      renderList();
      renderForm();
    } catch (err) {
      // apiFetch already toasts the message, and the server's message is the
      // useful part — it names the exercise and the field. A second toast saying
      // the same thing twice is just noise, so this only leaves the dirty flag
      // up so the editor can see the edit was not written.
      console.error('[workbook] save refused:', err);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function addExercise() {
    state.book.exercises = state.book.exercises || [];
    const n = state.book.exercises.length + 1;
    state.book.exercises.push({
      id: 'u14-vocab-' + n,
      type: 'fill',
      section: '어휘',
      sectionEn: 'Vocabulary',
      no: '연습 ' + n,
      icon: '📝',
      instructionKo: '',
      instructionEn: '',
      bank: [{ id: 'a', dict: '', polite: '' }, { id: 'b', dict: '', polite: '' }],
      items: [{ n: 1, answer: 'a', stemKo: '', en: '', why: '', grammar: '' }]
    });
    state.index = state.book.exercises.length - 1;
    markDirty();
    renderList();
    renderForm();
  }

  window.Unit14View = {
    async render() {
      if (!state.book) {
        const res = await window.apiFetch.getUnit14Workbook();
        state.book = res.data;
      }
      const saveBtn = document.getElementById('u14-save');
      if (saveBtn) saveBtn.onclick = () => window.Unit14View.save();
      const add = document.getElementById('u14-add-exercise');
      if (add) add.onclick = addExercise;
      renderList();
      renderForm();
    },
    save
  };
})();
