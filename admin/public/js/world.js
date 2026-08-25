/**
 * Unit 10 workspace: layout pins, desk quiz, textbook words.
 */
(function () {
  const FARM_W = 180, FARM_H = 312;
  const MAP = { scale: 0.58, ox: 190, oy: 36 };
  const DEFAULTS = {
    desk: { ox: -28, oy: 480, scale: 1, originX: 0.52, interact: 80, nameKo: '학습 책상', nameEn: 'Study desk' },
    kitchen: { ox: 328, oy: 252, scale: 1, originX: 0.48, interact: 82, nameKo: '요리 주방', nameEn: 'Kitchen' },
    taste: { ox: 144, oy: 480, scale: 1, originX: 0.5, interact: 80, nameKo: '한 입 포장마차', nameEn: 'Taste stall' }
  };

  const state = {
    unit: '2b-unit-10',
    panel: 'layout',
    layout: null,
    selected: 'desk',
    quiz: null,
    qIndex: -1,
    world: null
  };

  function farmToMap(ox, oy) {
    return { x: MAP.ox + ox * MAP.scale, y: MAP.oy + oy * MAP.scale };
  }
  function mapToFarm(x, y) {
    return { ox: Math.round((x - MAP.ox) / MAP.scale), oy: Math.round((y - MAP.oy) / MAP.scale) };
  }
  function station(id) {
    return (state.layout.stations || []).find((s) => s.id === id);
  }

  function setPanel(name) {
    state.panel = name;
    document.querySelectorAll('.u10-subbtn').forEach((b) => b.classList.toggle('active', b.dataset.panel === name));
    ['layout', 'quiz', 'words'].forEach((p) => {
      const el = document.getElementById('u10-panel-' + p);
      if (el) el.classList.toggle('hidden', p !== name);
    });
    if (name === 'quiz') renderQuiz();
    if (name === 'words') renderWords();
    if (name === 'layout') drawMap();
  }

  function drawMap() {
    if (!state.layout) return;
    const farm = document.getElementById('u10-farm-rect');
    if (farm) {
      farm.style.left = MAP.ox + 'px';
      farm.style.top = MAP.oy + 'px';
      farm.style.width = (FARM_W * MAP.scale) + 'px';
      farm.style.height = (FARM_H * MAP.scale) + 'px';
    }
    (state.layout.stations || []).forEach((s) => {
      const pin = document.getElementById('pin-' + s.id);
      if (!pin) return;
      const p = farmToMap(s.ox, s.oy);
      pin.style.left = p.x + 'px';
      pin.style.top = p.y + 'px';
      pin.classList.toggle('active', s.id === state.selected);
    });
    fillForm();
  }

  function fillForm() {
    const s = station(state.selected);
    if (!s) return;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    set('u10-station-id', s.id);
    set('u10-name-ko', s.nameKo || '');
    set('u10-name-en', s.nameEn || '');
    set('u10-ox', s.ox);
    set('u10-oy', s.oy);
    set('u10-scale', s.scale);
    set('u10-interact', s.interact);
    const hint = document.getElementById('u10-coord-hint');
    if (hint) {
      hint.textContent = 'World position = farm.topLeft + (' + s.ox + ', ' + s.oy + '). Farm size ' + FARM_W + '×' + FARM_H + '. South of the plots means oy > ' + FARM_H + '.';
    }
  }

  function readForm() {
    const s = station(state.selected);
    if (!s) return;
    s.nameKo = document.getElementById('u10-name-ko').value.trim();
    s.nameEn = document.getElementById('u10-name-en').value.trim();
    s.ox = Number(document.getElementById('u10-ox').value);
    s.oy = Number(document.getElementById('u10-oy').value);
    s.scale = Number(document.getElementById('u10-scale').value);
    s.interact = Number(document.getElementById('u10-interact').value);
    drawMap();
  }

  function bindMapDrag() {
    const map = document.getElementById('u10-map');
    if (!map || map._bound) return;
    map._bound = true;
    let dragId = null;
    map.addEventListener('pointerdown', (e) => {
      const pin = e.target.closest('.u10-pin');
      if (!pin) return;
      dragId = pin.dataset.id;
      state.selected = dragId;
      pin.setPointerCapture(e.pointerId);
      drawMap();
    });
    map.addEventListener('pointermove', (e) => {
      if (!dragId) return;
      const rect = map.getBoundingClientRect();
      const loc = mapToFarm(e.clientX - rect.left, e.clientY - rect.top);
      const s = station(dragId);
      if (!s) return;
      s.ox = loc.ox;
      s.oy = loc.oy;
      drawMap();
    });
    map.addEventListener('pointerup', () => { dragId = null; });
    document.getElementById('u10-station-id').addEventListener('change', (e) => {
      state.selected = e.target.value;
      drawMap();
    });
    ['u10-name-ko', 'u10-name-en', 'u10-ox', 'u10-oy', 'u10-scale', 'u10-interact'].forEach((id) => {
      document.getElementById(id).addEventListener('input', readForm);
    });
    document.getElementById('u10-reset-station').addEventListener('click', () => {
      const base = DEFAULTS[state.selected];
      Object.assign(station(state.selected), base);
      drawMap();
    });
    document.getElementById('u10-save-layout').addEventListener('click', async () => {
      const saved = await window.apiFetch.saveContent('layout', state.layout);
      // .body, not .data: the registry answers with the file wrapped in its metadata, and
      // assigning the wrapper here would have sent the wrapper back on the next save.
      state.layout = saved.data.body;
      window.Toast.success('Layout saved — it is the one file every unit shares');
      drawMap();
    });
  }

  function renderQuiz() {
    if (!state.quiz) return;
    document.getElementById('u10-session-size').value = state.quiz.sessionSize || 5;
    const qs = state.quiz.questions || [];
    document.getElementById('u10-quiz-count').textContent = qs.length + ' questions in bank';
    const body = document.getElementById('u10-quiz-tbody');
    body.innerHTML = qs.map((q, i) => (
      '<tr data-i="' + i + '"' + (i === state.qIndex ? ' class="selected"' : '') + '>' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + escapeHtml(q.q) + '</td>' +
      '<td>' + q.a + '</td>' +
      '<td><button class="btn btn-secondary btn-sm" data-del="' + i + '">✕</button></td></tr>'
    )).join('');
    body.querySelectorAll('tr').forEach((tr) => {
      tr.addEventListener('click', (e) => {
        if (e.target.dataset.del != null) return;
        state.qIndex = Number(tr.dataset.i);
        fillQuizEditor();
        renderQuiz();
      });
    });
    body.querySelectorAll('[data-del]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const i = Number(btn.dataset.del);
        state.quiz.questions.splice(i, 1);
        if (state.qIndex === i) state.qIndex = -1;
        else if (state.qIndex > i) state.qIndex -= 1;
        renderQuiz();
      });
    });
    fillQuizEditor();
  }

  function fillQuizEditor() {
    const fields = document.getElementById('u10-quiz-fields');
    const empty = document.getElementById('u10-quiz-empty');
    const q = state.quiz && state.quiz.questions[state.qIndex];
    if (!q) {
      fields.classList.add('hidden');
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    fields.classList.remove('hidden');
    document.getElementById('u10-q-text').value = q.q;
    document.getElementById('u10-q-key').value = q.a;
    ['A', 'B', 'C', 'D'].forEach((k) => {
      document.getElementById('u10-q-' + k).value = q.choices[k] || '';
    });
  }

  function readQuizEditor() {
    const q = state.quiz && state.quiz.questions[state.qIndex];
    if (!q) return;
    q.q = document.getElementById('u10-q-text').value;
    q.a = document.getElementById('u10-q-key').value;
    q.choices = {
      A: document.getElementById('u10-q-A').value,
      B: document.getElementById('u10-q-B').value,
      C: document.getElementById('u10-q-C').value,
      D: document.getElementById('u10-q-D').value
    };
  }

  function bindQuiz() {
    const box = document.getElementById('u10-quiz-fields');
    if (!box || box._bound) return;
    box._bound = true;
    box.addEventListener('input', () => { readQuizEditor(); renderQuiz(); });
    document.getElementById('u10-add-q').addEventListener('click', () => {
      const nextId = Math.max(0, ...state.quiz.questions.map((q) => q.id || 0)) + 1;
      state.quiz.questions.push({
        id: nextId, q: 'New question', a: 'A',
        choices: { A: '', B: '', C: '', D: '' }
      });
      state.qIndex = state.quiz.questions.length - 1;
      renderQuiz();
    });
    document.getElementById('u10-save-quiz').addEventListener('click', async () => {
      readQuizEditor();
      state.quiz.sessionSize = Number(document.getElementById('u10-session-size').value) || 5;
      const saved = await window.apiFetch.saveContent(currentUnit().quiz, state.quiz);
      state.quiz = saved.data.body;
      window.Toast.success(currentUnit().label + ' quiz saved (' + state.quiz.questions.length + ' questions)');
      renderQuiz();
    });
  }

  function renderWords() {
    if (!state.world) return;
    const words = state.world.level.words || [];
    const q = (document.getElementById('u10-word-search').value || '').toLowerCase();
    const cat = document.getElementById('u10-word-cat').value;
    const cats = [...new Set(words.map((w) => w.category).filter(Boolean))];
    const sel = document.getElementById('u10-word-cat');
    const prev = sel.value;
    sel.innerHTML = '<option value="">All groups</option>' + cats.map((c) => '<option>' + escapeHtml(c) + '</option>').join('');
    sel.value = prev;
    const rows = words.map((w, i) => ({ w, i })).filter(({ w }) => {
      if (cat && w.category !== cat) return false;
      if (!q) return true;
      return (w.ko + ' ' + w.en + ' ' + (w.categoryEn || '')).toLowerCase().includes(q);
    });
    document.getElementById('u10-word-count').textContent = rows.length + ' / ' + words.length + ' words';
    const body = document.getElementById('u10-words-tbody');
    body.innerHTML = rows.map(({ w, i }) => (
      '<tr data-i="' + i + '">' +
      '<td>' + (i + 1) + '</td>' +
      '<td><input class="form-input" data-f="ko" value="' + escapeAttr(w.ko) + '"></td>' +
      '<td><input class="form-input" data-f="en" value="' + escapeAttr(w.en) + '"></td>' +
      '<td><input class="form-input" data-f="hint" value="' + escapeAttr(w.hint || '') + '"></td>' +
      '<td><input class="form-input" data-f="category" value="' + escapeAttr(w.category) + '"></td>' +
      '<td><input class="form-input" data-f="categoryEn" value="' + escapeAttr(w.categoryEn) + '"></td>' +
      '<td><button class="btn btn-secondary btn-sm" data-del="' + i + '">✕</button></td></tr>'
    )).join('');
    body.querySelectorAll('input').forEach((inp) => {
      inp.addEventListener('input', () => {
        const i = Number(inp.closest('tr').dataset.i);
        state.world.level.words[i][inp.dataset.f] = inp.value;
      });
    });
    body.querySelectorAll('[data-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.world.level.words.splice(Number(btn.dataset.del), 1);
        renderWords();
      });
    });
  }

  function bindWords() {
    const search = document.getElementById('u10-word-search');
    if (!search || search._bound) return;
    search._bound = true;
    search.addEventListener('input', renderWords);
    document.getElementById('u10-word-cat').addEventListener('change', renderWords);
    document.getElementById('u10-add-word').addEventListener('click', () => {
      state.world.level.words.push({ ko: '', en: '', hint: '', category: '음식', categoryEn: 'Food' });
      renderWords();
    });
    document.getElementById('u10-save-world').addEventListener('click', async () => {
      const saved = await window.apiFetch.saveContent('world/' + currentUnit().id, state.world);
      // The registry save answers with the normalised file, not a summary, so the count is
      // read off what was actually stored rather than off a field the old route happened to
      // return. It said 'undefined words' for exactly as long as nobody looked.
      const n = ((saved.data.body || {}).level || {}).words || [];
      window.Toast.success(currentUnit().label + ' word list saved (' + n.length + ' words)');
    });
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function escapeAttr(s) { return escapeHtml(s); }

  // Every unit, not just the one this screen was written for. The map layout is a single
  // file shared by all of them, so it does not move with the picker; the quiz and the word
  // list do. TOPIK has no desk quiz, which is why the panel can be absent rather than empty.
  const UNITS = [
    { id: '2b-unit-10', label: 'Unit 10', quiz: 'quiz/unit10' },
    { id: '2b-unit-11', label: 'Unit 11', quiz: 'quiz/unit11' },
    { id: '2b-unit-13', label: 'Unit 13', quiz: 'quiz/unit13' },
    { id: '2b-unit-14', label: 'Unit 14', quiz: 'quiz/unit14' },
    { id: 'topik-2', label: 'TOPIK II', quiz: null }
  ];

  function currentUnit() {
    return UNITS.find((u) => u.id === state.unit) || UNITS[0];
  }

  async function loadAll() {
    const u = currentUnit();
    const wants = [
      window.apiFetch.getContent('layout'),
      window.apiFetch.getContent('world/' + u.id),
      u.quiz ? window.apiFetch.getContent(u.quiz) : Promise.resolve(null)
    ];
    const [layout, world, quiz] = await Promise.all(wants);
    state.layout = layout.data.body;
    state.world = world.data.body;
    state.quiz = quiz ? quiz.data.body : null;
  }

  function paintUnitPicker() {
    const box = document.getElementById('u10-unitpick');
    if (!box) return;
    box.innerHTML = UNITS.map((u) => '<button type="button" class="u10-unitbtn'
      + (u.id === state.unit ? ' active' : '') + '" data-unit="' + u.id + '">'
      + u.label + '</button>').join('');
    box.querySelectorAll('.u10-unitbtn').forEach((b) => {
      b.onclick = async () => {
        if (b.dataset.unit === state.unit) return;
        state.unit = b.dataset.unit;
        state.layout = null;
        await loadAll();
        paintUnitPicker();
        // A unit with no quiz must not leave you staring at the last unit's questions.
        if (!currentUnit().quiz && state.panel === 'quiz') state.panel = 'words';
        paintPanelAvailability();
        setPanel(state.panel);
      };
    });
  }

  function paintPanelAvailability() {
    const hasQuiz = !!currentUnit().quiz;
    const btn = document.querySelector('.u10-subbtn[data-panel="quiz"]');
    if (btn) {
      btn.disabled = !hasQuiz;
      btn.title = hasQuiz ? '' : currentUnit().label + ' has no desk quiz.';
      btn.classList.toggle('is-unavailable', !hasQuiz);
    }
  }

  window.Unit10View = {
    async render() {
      // Arrived from the Content tab? It said which unit and which panel it meant.
      const focus = (window.AppState || {}).focus;
      if (focus) {
        window.AppState.focus = null;
        if (focus.unit && focus.unit !== state.unit) { state.unit = focus.unit; state.layout = null; }
        if (focus.panel) state.panel = focus.panel;
      }
      if (!state.layout) await loadAll();
      paintUnitPicker();
      paintPanelAvailability();
      document.querySelectorAll('.u10-subbtn').forEach((b) => {
        b.onclick = () => setPanel(b.dataset.panel);
      });
      bindMapDrag();
      bindQuiz();
      bindWords();
      setPanel(state.panel);
    }
  };
})();
