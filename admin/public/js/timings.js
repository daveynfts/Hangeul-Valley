/**
 * Timings tab — set, by hand, where each transcript line sits inside its track.
 *
 * scripts/cassette_timings.js places every line it can prove: the ones whose sentence also
 * exists as a dictation clip cut from the track, and the ones alone between two of those.
 * It deliberately stops there, because the tracks hold more speech segments than transcript
 * lines and no rule can hand the extra ones out correctly. Those leftovers are what this is
 * for — pick a line, drag its stretch on the waveform, listen, save.
 *
 * The whole editor is the same three numbers the game reads: `at`, `end`, and the track's
 * `dur`. Nothing here is admin-only state.
 */
window.TimingsView = {
  UNITS: ['unit10', 'unit11', 'unit13', 'unit14', 'unit15'],
  unit: 'unit10',
  bank: null,
  ti: 0,               // track index
  li: -1,              // selected line
  dirty: false,
  peaks: null,
  dur: 0,
  audio: null,
  playing: false,
  stopAt: 0,
  head: 0,
  drag: null,
  raf: 0,
  _peakCache: {},
  _urlCache: {},

  esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  fmt(t) {
    if (!(t >= 0)) return '—';
    return t.toFixed(2) + 's';
  },
  track() { return this.bank && (this.bank.tracks || [])[this.ti]; },
  lines() { const t = this.track(); return (t && t.lines) || []; },
  line() { return this.lines()[this.li] || null; },

  // ── Loading ────────────────────────────────────────────────────────────────
  async render() {
    const host = document.getElementById('timings-body');
    if (!host) return;
    if (!this.bank) {
      host.innerHTML = '<p class="text-muted">Loading ' + this.esc(this.unit) + '…</p>';
      try {
        const r = await window.apiFetch.getContent('cassette/' + this.unit);
        // The registry answers with a record about the file — key, label, rel — and the file
        // itself under `body`. The PUT takes the bare body back, so that is what is held here.
        this.bank = (r.data && r.data.body) || null;
        if (!this.bank) throw new Error('no body');
        this.ti = 0;
        this.li = -1;
      } catch (e) {
        host.innerHTML = '<p class="text-muted">Could not load cassette/' + this.esc(this.unit) + '.</p>';
        return;
      }
      this.loadTrackAudio();
    }
    this.paintShell();
  },

  async selectUnit(u) {
    if (this.dirty && !confirm('Unsaved timings on ' + this.unit + ' will be lost. Switch anyway?')) return;
    this.stop();
    this.unit = u;
    this.bank = null;
    this.dirty = false;
    await this.render();
  },

  selectTrack(i) {
    if (i === this.ti) return;
    this.stop();
    this.ti = i;
    this.li = -1;
    this.loadTrackAudio();
    this.paintShell();
  },

  selectLine(i) {
    this.li = i;
    this.paintLines();
    // The transport acts on the selected line, so its buttons enable and disable with the
    // selection. Leaving this out left ▶ Line greyed out over a line that had a span.
    this.paintTransport();
    this.draw();
  },

  /**
   * Where this recording can actually be fetched from.
   *
   * Two answers, because the panel is served from two places. Locally the Express server
   * hands the file over at /audio-preview; on the deployed panel that route does not exist —
   * Vercel rewrites /audio to the CDN instead. Shipping only the first made the tab work in
   * one of the two places and draw nothing in the other.
   *
   * Resolved once per track and remembered, so the decode and the playback element agree.
   */
  audioUrl(src) {
    if (this._urlCache[src]) return Promise.resolve(this._urlCache[src]);
    const rel = String(src).replace(/^audio\//, '');
    const tries = ['/audio-preview/' + rel, '/' + String(src)];
    const next = (i) => {
      if (i >= tries.length) return Promise.resolve('');
      // HEAD, not GET: this only has to learn which one answers, and whichever does is about
      // to be fetched in full anyway.
      return fetch(tries[i], { method: 'HEAD' })
        .then((r) => (r.ok ? tries[i] : next(i + 1)))
        .catch(() => next(i + 1));
    };
    return next(0).then((u) => { if (u) this._urlCache[src] = u; return u; });
  },

  /**
   * Decode the track for its peaks and its true length.
   *
   * The length comes from the decode rather than from the JSON on purpose: the `dur` in the
   * file is what this tab may be about to rewrite, and mapping x to a time through a number
   * that might be wrong is exactly the bug that made the game's own strip misplace a drag.
   */
  loadTrackAudio() {
    const t = this.track();
    this.peaks = null;
    this.dur = 0;
    this.head = 0;
    if (!t || !t.src) return;
    const cached = this._peakCache[t.src];
    if (cached) { this.peaks = cached.peaks; this.dur = cached.dur; this.draw(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.audioUrl(t.src)
      .then((url) => (url ? fetch(url) : null))
      .then((r) => (r && r.ok ? r.arrayBuffer() : null)).then((buf) => {
      if (!buf) return null;
      const ctx = new AC();
      return new Promise((res) => {
        const done = (a) => { try { ctx.close(); } catch (e) {} res(a || null); };
        try { ctx.decodeAudioData(buf, done, () => done(null)); } catch (e) { done(null); }
      });
    }).then((audio) => {
      if (!audio) return;
      const ch = audio.getChannelData(0);
      const N = 900;
      const peaks = new Array(N).fill(0);
      for (let i = 0; i < N; i++) {
        const from = Math.floor(i * ch.length / N);
        const to = Math.min(ch.length, Math.max(from + 1, Math.floor((i + 1) * ch.length / N)));
        let p = 0;
        for (let k = from; k < to; k++) { const v = ch[k] < 0 ? -ch[k] : ch[k]; if (v > p) p = v; }
        peaks[i] = p;
      }
      let max = 0;
      for (let i = 0; i < N; i++) if (peaks[i] > max) max = peaks[i];
      if (max > 0) for (let i = 0; i < N; i++) peaks[i] /= max;
      this._peakCache[t.src] = { peaks: peaks, dur: audio.duration };
      if (this.track() !== t) return;
      this.peaks = peaks;
      this.dur = audio.duration;
      // Only the strip and the readout learn anything here. Rebuilding the shell would
      // also reset the track rail's scroll, halfway through choosing a track.
      this.draw();
      this.paintTransport();
      this.paintRailCounts();
    }).catch(() => {});
  },

  // ── Playback ───────────────────────────────────────────────────────────────
  stop() {
    if (this.audio) { try { this.audio.pause(); } catch (e) {} }
    this.audio = null;
    this.playing = false;
    this.stopAt = 0;
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
    this.paintTransport();
  },

  play(from, to) {
    const t = this.track();
    if (!t) return;
    this.stop();
    // The decode has normally resolved this already; the fallback keeps a play from being
    // silent when a track is played before its waveform has finished loading.
    const el = new Audio(this._urlCache[t.src] || ('/audio-preview/' + String(t.src).replace(/^audio\//, '')));
    this.audio = el;
    this.stopAt = to || 0;
    el.addEventListener('loadedmetadata', () => { try { el.currentTime = from || 0; } catch (e) {} }, { once: true });
    if (el.readyState >= 1) { try { el.currentTime = from || 0; } catch (e) {} }
    el.onended = () => this.stop();
    el.play().then(() => {
      this.playing = true;
      this.paintTransport();
      const tick = () => {
        if (this.audio !== el) return;
        this.head = el.currentTime || 0;
        // The stop is ours: left alone the element reads on past the line into the next one.
        if (this.stopAt > 0 && this.head >= this.stopAt) { this.stop(); this.draw(); return; }
        this.draw();
        this.raf = requestAnimationFrame(tick);
      };
      tick();
    }).catch(() => this.stop());
  },

  playLine() {
    const l = this.line();
    if (!l || typeof l.at !== 'number') return;
    this.play(l.at, typeof l.end === 'number' ? l.end : 0);
  },
  playTrack() {
    if (this.playing) { this.stop(); return; }
    this.play(this.head || 0, 0);
  },

  // ── Editing ────────────────────────────────────────────────────────────────
  setSpan(a, b) {
    const l = this.line();
    if (!l) return;
    const lo = Math.max(0, Math.min(a, b));
    const hi = Math.min(this.dur || Math.max(a, b), Math.max(a, b));
    if (hi - lo < 0.25) return;           // the floor the validator and the player both use
    l.at = Math.round(lo * 100) / 100;
    l.end = Math.round(hi * 100) / 100;
    this.dirty = true;
    this.paintLines();
    this.paintRailCounts();
    this.paintTransport();
    this.draw();
  },

  /** Move one edge by a few hundredths, for the last bit of trimming a drag cannot do. */
  nudge(which, by) {
    const l = this.line();
    if (!l || typeof l.at !== 'number') return;
    if (which === 'at') this.setSpan(l.at + by, l.end);
    else this.setSpan(l.at, l.end + by);
  },

  clearSpan() {
    const l = this.line();
    if (!l) return;
    delete l.at;
    delete l.end;
    this.dirty = true;
    this.paintLines();
    this.paintRailCounts();
    this.paintTransport();
    this.draw();
  },

  /** Start this line where the one above it ended — the common case in a run of dialogue. */
  snapToPrev() {
    const l = this.line();
    const prev = this.lines()[this.li - 1];
    if (!l || !prev || typeof prev.end !== 'number' || typeof l.end !== 'number') return;
    this.setSpan(prev.end, l.end);
  },

  async save() {
    const t = this.track();
    // The decode is the authority on length, so a track that has been listened to here has
    // its `dur` corrected on the way out. The game reads that number before it can decode.
    if (t && this.dur > 0) t.dur = Math.round(this.dur * 100) / 100;
    const btn = document.getElementById('timings-save');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    try {
      await window.apiFetch.saveContent('cassette/' + this.unit, this.bank);
      this.dirty = false;
      window.Toast.show(this.unit + ' timings written to worlds/' + this.unit + '-cassette.json',
        'Saved', 'success');
    } catch (e) {
      // The validator's message is the useful part: it names the line and what is wrong.
      window.Toast.show(String((e && e.message) || e), 'Not saved', 'error', 9000);
    }
    this.paintTransport();
  },

  // ── Painting ───────────────────────────────────────────────────────────────
  paintShell() {
    const host = document.getElementById('timings-body');
    if (!host || !this.bank) return;
    const tracks = this.bank.tracks || [];
    const rail = tracks.map((t, i) => {
      const lines = (t.lines || []);
      const timed = lines.filter((l) => typeof l.at === 'number').length;
      const done = lines.length && timed === lines.length;
      return '<button class="tm-track' + (i === this.ti ? ' active' : '') + '" data-ti="' + i + '">'
        + '<span class="tm-track-n">' + t.n + '</span>'
        + '<span class="tm-track-t">' + this.esc(t.secEn || t.sec || '') + '</span>'
        + '<span class="tm-track-c' + (done ? ' ok' : '') + '">'
        + (lines.length ? timed + '/' + lines.length : '—') + '</span></button>';
    }).join('');

    host.innerHTML =
      '<div class="tm-units">'
      + this.UNITS.map((u) => '<button class="tm-unit' + (u === this.unit ? ' active' : '')
        + '" data-unit="' + u + '">' + u.replace('unit', 'Unit ') + '</button>').join('')
      + '<span class="tm-spacer"></span>'
      + '<button class="btn btn-primary" id="timings-save">Save</button>'
      + '</div>'
      + '<div class="tm-grid">'
      + '<div class="tm-rail">' + rail + '</div>'
      + '<div class="tm-main">'
      + '<canvas id="timings-wave" width="1200" height="150"></canvas>'
      + '<div class="tm-transport" id="timings-transport"></div>'
      + '<div class="tm-lines" id="timings-lines"></div>'
      + '</div></div>';

    host.querySelectorAll('.tm-unit').forEach((b) =>
      b.addEventListener('click', () => this.selectUnit(b.getAttribute('data-unit'))));
    host.querySelectorAll('.tm-track').forEach((b) =>
      b.addEventListener('click', () => this.selectTrack(Number(b.getAttribute('data-ti')))));
    const save = document.getElementById('timings-save');
    if (save) save.addEventListener('click', () => this.save());

    this.bindWave();
    this.paintLines();
    this.paintRailCounts();
    this.paintTransport();
    this.draw();
  },

  /** Just the n/n on the rail, for when a span is added or removed. */
  paintRailCounts() {
    document.querySelectorAll('.tm-track').forEach((b) => {
      const t = (this.bank.tracks || [])[Number(b.getAttribute('data-ti'))];
      const cell = b.querySelector('.tm-track-c');
      if (!t || !cell) return;
      const lines = t.lines || [];
      const timed = lines.filter((l) => typeof l.at === 'number').length;
      cell.textContent = lines.length ? timed + '/' + lines.length : '—';
      cell.classList.toggle('ok', !!lines.length && timed === lines.length);
    });
  },

  paintLines() {
    const box = document.getElementById('timings-lines');
    if (!box) return;
    const lines = this.lines();
    if (!lines.length) { box.innerHTML = '<p class="text-muted">This track has no transcript.</p>'; return; }
    box.innerHTML = lines.map((l, i) => {
      const has = typeof l.at === 'number';
      return '<button class="tm-line' + (i === this.li ? ' active' : '') + (has ? '' : ' untimed')
        + '" data-li="' + i + '">'
        + '<span class="tm-line-i">' + (i + 1) + '</span>'
        + '<span class="tm-line-who">' + this.esc(l.who) + '</span>'
        + '<span class="tm-line-ko">' + this.esc(l.ko) + '</span>'
        + '<span class="tm-line-at">' + (has ? this.fmt(l.at) + ' → ' + this.fmt(l.end) : 'not set') + '</span>'
        + '</button>';
    }).join('');
    box.querySelectorAll('.tm-line').forEach((b) =>
      b.addEventListener('click', () => this.selectLine(Number(b.getAttribute('data-li')))));
  },

  paintTransport() {
    const box = document.getElementById('timings-transport');
    if (!box) return;
    const l = this.line();
    const t = this.track();
    const has = l && typeof l.at === 'number';
    const untimed = this.lines().filter((x) => typeof x.at !== 'number').length;
    box.innerHTML =
      '<button class="btn" id="tm-playtrack">' + (this.playing ? '❙❙ Stop' : '▶ Track') + '</button>'
      + '<button class="btn" id="tm-playline"' + (has ? '' : ' disabled') + '>▶ Line</button>'
      + '<span class="tm-nudge">'
      + '<button class="btn btn-sm" data-nudge="at,-0.05"' + (has ? '' : ' disabled') + '>start −</button>'
      + '<button class="btn btn-sm" data-nudge="at,0.05"' + (has ? '' : ' disabled') + '>start +</button>'
      + '<button class="btn btn-sm" data-nudge="end,-0.05"' + (has ? '' : ' disabled') + '>end −</button>'
      + '<button class="btn btn-sm" data-nudge="end,0.05"' + (has ? '' : ' disabled') + '>end +</button>'
      + '</span>'
      + '<button class="btn btn-sm" id="tm-snap"' + (has && this.li > 0 ? '' : ' disabled') + '>snap to previous</button>'
      + '<button class="btn btn-sm" id="tm-clear"' + (has ? '' : ' disabled') + '>clear</button>'
      + '<span class="tm-spacer"></span>'
      + '<span class="tm-meta">' + (t ? 'track ' + t.n : '') + ' · '
      + (this.dur ? this.dur.toFixed(2) + 's' : 'decoding…')
      + (t && this.dur && Math.abs((t.dur || 0) - this.dur) > 0.05
        ? ' <b class="tm-warn">(file says ' + this.dur.toFixed(2) + ', JSON says ' + t.dur + ')</b>' : '')
      + ' · ' + untimed + ' line(s) not set'
      + (this.dirty ? ' · <b class="tm-warn">unsaved</b>' : '') + '</span>';

    const pt = document.getElementById('tm-playtrack');
    if (pt) pt.addEventListener('click', () => this.playTrack());
    const pl = document.getElementById('tm-playline');
    if (pl) pl.addEventListener('click', () => this.playLine());
    const sn = document.getElementById('tm-snap');
    if (sn) sn.addEventListener('click', () => this.snapToPrev());
    const cl = document.getElementById('tm-clear');
    if (cl) cl.addEventListener('click', () => this.clearSpan());
    box.querySelectorAll('[data-nudge]').forEach((b) => b.addEventListener('click', () => {
      const [which, by] = b.getAttribute('data-nudge').split(',');
      this.nudge(which, Number(by));
    }));
  },

  // ── The strip ──────────────────────────────────────────────────────────────
  timeAtX(x, width) {
    if (!(width > 0) || !(this.dur > 0)) return 0;
    return Math.max(0, Math.min(1, x / width)) * this.dur;
  },

  bindWave() {
    const cv = document.getElementById('timings-wave');
    if (!cv) return;
    const at = (e) => {
      const r = cv.getBoundingClientRect();
      return this.timeAtX((e.clientX || 0) - r.left, r.width);
    };
    cv.addEventListener('pointerdown', (e) => {
      if (this.li < 0 || !(this.dur > 0)) return;
      e.preventDefault();
      try { cv.setPointerCapture(e.pointerId); } catch (err) {}
      this.drag = { a: at(e), b: at(e) };
      this.draw();
    });
    cv.addEventListener('pointermove', (e) => {
      if (!this.drag) return;
      this.drag.b = at(e);
      this.draw();
    });
    const finish = () => {
      const d = this.drag;
      this.drag = null;
      if (!d) return;
      // A click rather than a drag moves the playhead; only a real sweep sets a span, so a
      // mis-click cannot silently retime the line that happens to be selected.
      if (Math.abs(d.b - d.a) < 0.15) { this.head = d.a; this.draw(); return; }
      this.setSpan(d.a, d.b);
    };
    cv.addEventListener('pointerup', finish);
    cv.addEventListener('pointercancel', () => { this.drag = null; this.draw(); });
  },

  draw() {
    const cv = document.getElementById('timings-wave');
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height, mid = H / 2;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#1b1710';
    ctx.fillRect(0, 0, W, H);
    const xOf = (t) => (this.dur > 0 ? (t / this.dur) * W : 0);

    // Every other line's span, so a gap in the track is visible as a gap between bands.
    this.lines().forEach((l, i) => {
      if (typeof l.at !== 'number' || i === this.li) return;
      ctx.fillStyle = 'rgba(120, 200, 255, 0.13)';
      ctx.fillRect(xOf(l.at), 0, Math.max(1, xOf(l.end) - xOf(l.at)), H);
    });

    // The selected line, or the drag in progress, on top and brighter.
    const l = this.line();
    const band = this.drag ? { a: Math.min(this.drag.a, this.drag.b), b: Math.max(this.drag.a, this.drag.b) }
      : (l && typeof l.at === 'number' ? { a: l.at, b: l.end } : null);
    if (band) {
      ctx.fillStyle = 'rgba(255, 196, 90, 0.26)';
      ctx.fillRect(xOf(band.a), 0, Math.max(1, xOf(band.b) - xOf(band.a)), H);
      ctx.fillStyle = '#ffc45a';
      ctx.fillRect(xOf(band.a), 0, 2, H);
      ctx.fillRect(xOf(band.b) - 2, 0, 2, H);
    }

    if (this.peaks) {
      const n = this.peaks.length;
      const step = W / n;
      for (let i = 0; i < n; i++) {
        const h = Math.max(1, this.peaks[i] * (H - 18));
        ctx.fillStyle = (i + 0.5) * step <= xOf(this.head) ? '#8ea9c8' : '#c4893a';
        ctx.fillRect(i * step, mid - h / 2, Math.max(1, step - 0.5), h);
      }
    } else {
      ctx.fillStyle = '#5a4a33';
      ctx.fillRect(0, mid - 1, W, 2);
    }

    ctx.fillStyle = '#fff';
    ctx.fillRect(xOf(this.head), 0, 1, H);
  }
};
