/**
 * Characters tab — catalog preview and local game switcher.
 * Switch never writes /api/save; it opens the farm with ?debug=skins&skin=<id>.
 */
window.SkinsView = {
  selectedId: null,
  facing: 'down',
  frame: 0,
  playing: false,
  timer: null,

  async load() {
    const res = await window.apiFetch.getSkinCatalog();
    window.AppState.skinCatalog = res.data || null;
    return window.AppState.skinCatalog;
  },

  async render() {
    const list = document.getElementById('skins-list');
    const preview = document.getElementById('skins-preview-frame');
    if (!list || !preview) return;
    try {
      if (!window.AppState.skinCatalog) await this.load();
    } catch (e) {
      list.innerHTML = '<p class="text-muted">Could not load skins/catalog.json.</p>';
      return;
    }
    const pack = window.AppState.skinCatalog;
    const skins = pack.skins || [];
    if (!this.selectedId && skins[0]) this.selectedId = skins[0].id;
    const selected = skins.find((s) => s.id === this.selectedId) || skins[0];
    this.selectedId = selected ? selected.id : null;

    list.innerHTML = skins.map((s) => {
      const active = s.id === this.selectedId ? ' active' : '';
      const art = s.art === 'hd' ? 'HD' : 'Matrix';
      return '<button class="skin-card' + active + '" data-skin="' + this.esc(s.id) + '">' +
        '<span class="skin-card-name">' + this.esc(s.nameEn || s.id) + '</span>' +
        '<span class="skin-card-meta">' + this.esc(s.id) + ' · ' + art + '</span>' +
        '</button>';
    }).join('');
    list.querySelectorAll('.skin-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selectedId = btn.getAttribute('data-skin');
        this.frame = 0;
        this.render();
      });
    });

    this.renderPreview(selected);
    const hint = document.getElementById('skins-switch-hint');
    if (hint) {
      hint.textContent = window.AppState.adminWritable
        ? 'Switch opens the local farm with a session override. It does not write the player save.'
        : 'Preview only on this host. Run local admin to switch skins in the farm.';
    }
    const switchBtn = document.getElementById('btn-skin-switch');
    if (switchBtn) {
      switchBtn.disabled = !selected || !window.AppState.adminWritable;
      switchBtn.onclick = () => this.switchInGame(selected);
    }
    document.querySelectorAll('#skins-dir-tabs .mode-tab').forEach((btn) => {
      const dir = btn.getAttribute('data-dir');
      btn.classList.toggle('active', dir === this.facing);
      btn.onclick = () => {
        this.facing = dir;
        this.frame = 0;
        this.renderPreview(selected);
        document.querySelectorAll('#skins-dir-tabs .mode-tab').forEach((b) => {
          b.classList.toggle('active', b.getAttribute('data-dir') === this.facing);
        });
      };
    });
    const playBtn = document.getElementById('btn-skin-play');
    if (playBtn) {
      playBtn.textContent = this.playing ? 'Pause walk' : 'Play walk';
      playBtn.onclick = () => this.togglePlay(selected);
    }
  },

  renderPreview(def) {
    const img = document.getElementById('skins-preview-img');
    const placeholder = document.getElementById('skins-preview-placeholder');
    const meta = document.getElementById('skins-preview-meta');
    if (!def) return;
    if (meta) {
      meta.textContent = (def.nameEn || def.id) + ' · ' + def.art + ' · prefix ' + (def.matrixPrefix || def.id);
    }
    const urls = def.walkUrls && def.walkUrls[this.facing];
    if (def.art === 'hd' && urls && urls[this.frame] && img) {
      img.src = urls[this.frame];
      img.alt = def.id + ' ' + this.facing + ' ' + this.frame;
      img.classList.remove('hidden');
      if (placeholder) placeholder.classList.add('hidden');
    } else {
      if (img) img.classList.add('hidden');
      if (placeholder) {
        placeholder.classList.remove('hidden');
        placeholder.textContent = def.art === 'matrix'
          ? 'Procedural 48 px matrix (' + (def.matrixPrefix || def.id) + '). Open the farm to see it walk.'
          : 'No preview frames on disk.';
      }
    }
  },

  togglePlay(def) {
    if (this.playing) {
      this.playing = false;
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
      this.render();
      return;
    }
    this.playing = true;
    const cycle = [0, 1, 0, 2];
    let i = 0;
    this.timer = setInterval(() => {
      this.frame = cycle[i % cycle.length];
      i++;
      this.renderPreview(def);
    }, 125);
    this.render();
  },

  switchInGame(def) {
    if (!def || !window.AppState.adminWritable) return;
    const base = (window.AppState.gameUrl || 'http://localhost:8742/').replace(/\/?$/, '/');
    window.open(base + '?debug=skins&skin=' + encodeURIComponent(def.id), '_blank', 'noopener');
  },

  esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btn-refresh-skins');
  if (btn) {
    btn.addEventListener('click', async () => {
      window.AppState.skinCatalog = null;
      await window.SkinsView.render();
      window.Toast.success('Skin catalog reloaded.', 'Characters');
    });
  }
});
