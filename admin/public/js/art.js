/**
 * Art library tab — catalog-backed inventory of farm sprites.
 */
window.ArtView = {
  kindFilter: 'all',
  query: '',

  async load() {
    const res = await window.apiFetch.getArt();
    window.AppState.art = res.data || null;
    return window.AppState.art;
  },

  async render() {
    const grid = document.getElementById('art-family-grid');
    if (!grid) return;
    try {
      if (!window.AppState.art) await this.load();
    } catch (e) {
      grid.innerHTML = '<p class="text-muted">Could not load the art catalog.</p>';
      return;
    }
    const report = window.AppState.art;
    const t = report.totals || {};
    const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setText('art-stat-assets', t.assets == null ? '--' : t.assets);
    setText('art-stat-shipped', t.shipped == null ? '--' : t.shipped);
    setText('art-stat-unused', t.unused == null ? '--' : t.unused);
    const health = (t.missing || 0) + (t.orphans || 0);
    setText('art-stat-health', health);
    setText('art-stat-health-sub', health === 0 ? 'Catalog matches disk' : 'Missing files or uncatalogued PNGs');

    const banner = document.getElementById('art-health-banner');
    if (banner) {
      const issues = [];
      (report.missingIds || []).forEach((id) => issues.push('Missing file: ' + id));
      (report.orphans || []).forEach((p) => issues.push('Uncatalogued PNG: ' + p));
      if (issues.length) {
        banner.classList.remove('hidden');
        banner.innerHTML = '<h3 class="widget-title">Needs attention</h3><ul class="art-issue-list">' +
          issues.map((s) => '<li>' + this.esc(s) + '</li>').join('') + '</ul>';
      } else {
        banner.classList.add('hidden');
        banner.innerHTML = '';
      }
    }

    this.renderKindTabs(report);
    this.renderFamilies(report);
  },

  renderKindTabs(report) {
    const host = document.getElementById('art-kind-tabs');
    if (!host) return;
    const kinds = ['all'];
    (report.families || []).forEach((f) => {
      if (f.kind && kinds.indexOf(f.kind) < 0) kinds.push(f.kind);
    });
    host.innerHTML = kinds.map((k) => {
      const label = k === 'all' ? 'All' : k.replace(/-/g, ' ');
      const active = this.kindFilter === k ? ' active' : '';
      return '<button class="mode-tab' + active + '" data-kind="' + this.esc(k) + '">' + this.esc(label) + '</button>';
    }).join('');
    host.querySelectorAll('.mode-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.kindFilter = btn.getAttribute('data-kind') || 'all';
        this.render();
      });
    });
  },

  renderFamilies(report) {
    const grid = document.getElementById('art-family-grid');
    const q = (this.query || '').trim().toLowerCase();
    const families = (report.families || []).filter((fam) => {
      if (this.kindFilter !== 'all' && fam.kind !== this.kindFilter) return false;
      if (!q) return true;
      const blob = [fam.family, fam.nameEn, fam.kind].concat(
        (fam.assets || []).map((a) => [a.id, a.nameEn, a.path, a.phaserKey, a.notes].join(' '))
      ).join(' ').toLowerCase();
      return blob.indexOf(q) >= 0;
    });
    if (!families.length) {
      grid.innerHTML = '<p class="text-muted">No families match.</p>';
      return;
    }
    grid.innerHTML = families.map((fam) => {
      const status = fam.missing ? 'missing' : (fam.unused && !fam.shipped ? 'unused' : 'shipped');
      const rows = (fam.assets || []).map((a) => {
        const dim = (a.w && a.h) ? (a.w + '×' + a.h) : '—';
        const key = a.phaserKey ? '<code>' + this.esc(a.phaserKey) + '</code>' : '<span class="text-muted">not loaded</span>';
        return '<tr class="art-row" data-id="' + this.esc(a.id) + '">' +
          '<td><img class="art-thumb-sm" src="' + this.esc(a.preview) + '" alt=""></td>' +
          '<td>' + this.esc(a.nameEn) + '</td>' +
          '<td><code>' + this.esc(a.path) + '</code></td>' +
          '<td>' + key + '</td>' +
          '<td>' + dim + '</td>' +
          '<td><span class="badge ' + this.statusBadge(a.status) + '">' + this.esc(a.status) + '</span></td>' +
          '</tr>';
      }).join('');
      return '<div class="card widget-card art-family-card" data-family="' + this.esc(fam.family) + '">' +
        '<div class="art-family-head">' +
          '<img class="art-thumb" src="' + this.esc(fam.preview) + '" alt="">' +
          '<div>' +
            '<h3 class="widget-title">' + this.esc(fam.nameEn) + '</h3>' +
            '<p class="widget-subtitle">' + this.esc(fam.kind) + ' · ' + fam.count + ' file' + (fam.count === 1 ? '' : 's') + '</p>' +
          '</div>' +
          '<span class="badge ' + this.statusBadge(status) + '">' + this.esc(status) + '</span>' +
        '</div>' +
        '<div class="table-container">' +
          '<table class="data-table art-table"><thead><tr>' +
            '<th></th><th>Name</th><th>Path</th><th>Phaser</th><th>Size</th><th>Status</th>' +
          '</tr></thead><tbody>' + rows + '</tbody></table>' +
        '</div>' +
      '</div>';
    }).join('');

    grid.querySelectorAll('.art-row').forEach((row) => {
      row.addEventListener('click', () => {
        const id = row.getAttribute('data-id');
        const asset = (report.assets || []).find((a) => a.id === id);
        if (asset) this.openDetail(asset);
      });
    });
  },

  openDetail(a) {
    const used = (a.usedBy && a.usedBy.length) ? a.usedBy.join(', ') : 'Not referenced in-game';
    const body = '<div class="art-detail">' +
      '<img class="art-preview-lg" src="' + this.esc(a.preview) + '" alt="">' +
      '<dl class="art-dl">' +
        '<dt>Id</dt><dd><code>' + this.esc(a.id) + '</code></dd>' +
        '<dt>Path</dt><dd><code>sprites/' + this.esc(a.path) + '</code></dd>' +
        '<dt>Phaser key</dt><dd>' + (a.phaserKey ? '<code>' + this.esc(a.phaserKey) + '</code>' : '—') + '</dd>' +
        '<dt>Used by</dt><dd>' + this.esc(used) + '</dd>' +
        '<dt>Height class</dt><dd>' + this.esc(a.heightClass || '—') + '</dd>' +
        '<dt>Parent</dt><dd><code>' + this.esc(a.parentId || '—') + '</code></dd>' +
        '<dt>Notes</dt><dd>' + this.esc(a.notes || '—') + '</dd>' +
      '</dl></div>';
    window.Modal.open(a.nameEn, body);
  },

  statusBadge(status) {
    if (status === 'shipped') return 'badge-emerald';
    if (status === 'unused') return 'badge-amber';
    return 'badge-rose';
  },

  esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btn-refresh-art');
  if (btn) {
    btn.addEventListener('click', async () => {
      window.AppState.art = null;
      await window.ArtView.render();
      window.Toast.success('Art catalog reloaded.', 'Art library');
    });
  }
  const search = document.getElementById('input-search-art');
  if (search) {
    search.addEventListener('input', () => {
      window.ArtView.query = search.value || '';
      if (window.AppState.art) window.ArtView.renderFamilies(window.AppState.art);
    });
  }
});
