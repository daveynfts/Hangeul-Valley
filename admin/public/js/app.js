/**
 * Hangeul Valley Admin Panel - Central SPA Application Controller
 * Handles AppState, API client (apiFetch), Toast notifications, Modal dialogs, and hash routing.
 */

// 1. Central Application State Store
window.AppState = {
  stats: null,
  levels: [],
  vocabFacts: {},
  casingDiscrepancies: [],
  missingFacts: [],
  duplicates: [],
  
  // Selection and View state
  currentTab: 'dashboard',
  selectedLevelNum: 1,

  // Filters & Search state
  levelsSearchQuery: '',
  levelsCategoryFilter: 'ALL',
  vocabSearchQuery: '',
  vocabFilterMode: 'all', // 'all' | 'missing' | 'discrepancy'
  vocabPage: 1,
  vocabPageSize: 50,

  listeners: [],
  subscribe(fn) {
    if (typeof fn === 'function') {
      this.listeners.push(fn);
    }
  },
  notify() {
    this.listeners.forEach(fn => fn());
  }
};

// 2. Toast Notification Manager
window.Toast = {
  show(message, title = '', type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close">&times;</button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      toast.remove();
    });

    container.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, duration);
    }
  },
  success(msg, title = 'Success') { this.show(msg, title, 'success'); },
  error(msg, title = 'Error') { this.show(msg, title, 'error', 6000); },
  warning(msg, title = 'Warning') { this.show(msg, title, 'warning', 5000); },
  info(msg, title = 'Info') { this.show(msg, title, 'info'); }
};

// 3. Modal Dialog Manager
window.Modal = {
  open(title, bodyHtml, footerHtml = '') {
    const backdrop = document.getElementById('modal-backdrop');
    const box = document.getElementById('modal-box');
    if (!backdrop || !box) return;

    box.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" id="modal-close-btn">&times;</button>
      </div>
      <div class="modal-body">
        ${bodyHtml}
      </div>
      ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
    `;

    backdrop.classList.remove('hidden');

    const closeBtn = document.getElementById('modal-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Close on backdrop click
    backdrop.onclick = (e) => {
      if (e.target === backdrop) {
        this.close();
      }
    };
  },
  close() {
    const backdrop = document.getElementById('modal-backdrop');
    if (backdrop) {
      backdrop.classList.add('hidden');
    }
  }
};

// 4. API Client Wrapper (apiFetch)
window.apiFetch = async function(endpoint, options = {}) {
  try {
    const defaultHeaders = { 'Content-Type': 'application/json' };
    // Reads are open and ignore it; a write is refused without it. Attached in one place
    // so no route can be added later that forgets to send it.
    const authHeaders = (window.AdminAuth && window.AdminAuth.headers()) || {};
    const config = {
      method: options.method || 'GET',
      headers: { ...defaultHeaders, ...authHeaders, ...(options.headers || {}) }
    };
    if (options.body) {
      config.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    }

    const response = await fetch(endpoint, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
      const errMsg = data.details || data.error || `HTTP ${response.status} Request failed`;
      throw new Error(errMsg);
    }

    return data;
  } catch (err) {
    console.error(`[API Error] ${endpoint}:`, err);
    window.Toast.error(err.message, 'API Error');
    throw err;
  }
};

// Helper API functions
window.apiFetch.getStats = () => window.apiFetch('/api/stats');
window.apiFetch.getLevels = () => window.apiFetch('/api/levels');
window.apiFetch.updateLevelMeta = (num, metaData) => window.apiFetch(`/api/levels/${num}`, { method: 'PUT', body: metaData });
window.apiFetch.addWord = (num, wordData) => window.apiFetch(`/api/levels/${num}/words`, { method: 'POST', body: wordData });
window.apiFetch.updateWord = (num, wordIdx, wordData) => window.apiFetch(`/api/levels/${num}/words/${wordIdx}`, { method: 'PUT', body: wordData });
window.apiFetch.deleteWord = (num, wordIdx) => window.apiFetch(`/api/levels/${num}/words/${wordIdx}`, { method: 'DELETE' });
window.apiFetch.getVocabFacts = () => window.apiFetch('/api/vocab-facts');
window.apiFetch.getUnit10Layout = () => window.apiFetch('/api/unit10/layout');
window.apiFetch.saveUnit10Layout = (body) => window.apiFetch('/api/unit10/layout', { method: 'PUT', body });
window.apiFetch.getUnit10Quiz = () => window.apiFetch('/api/unit10/quiz');
window.apiFetch.saveUnit10Quiz = (body) => window.apiFetch('/api/unit10/quiz', { method: 'PUT', body });
// The exercise banks go through the content registry, which is the only one of the two that
// exists on production. /api/workbooks and /api/workbook/:unit are Express-only routes: there
// is no serverless function behind either, so the Workbooks tab answered 404 on the deployed
// site from the day it was written. Nobody added the functions because the Hobby plan allows
// twelve and the project was already at the ceiling — which is the whole reason the registry
// is one function serving everything.
//
// Adapted here rather than in workbook.js so that view keeps its own shape: it asks for a
// bank by the key WORKBOOKS uses, and gets back the file, exactly as before.
const bankKey = (unit) => 'bank/' + unit;
window.apiFetch.listWorkbooks = () => window.apiFetch.listContent().then((r) => {
  const banks = (r.data || []).filter((c) => c.key.indexOf('bank/') === 0);
  // The keys are file stems and read like it — 'topik2-questions', 'unit10-textbook'. The
  // registry already carries a human name for each, so it comes along rather than being
  // reinvented by string surgery at the call site.
  window.AppState = window.AppState || {};
  window.AppState.bankLabels = {};
  banks.forEach((c) => { window.AppState.bankLabels[c.key.slice(5)] = c.label; });
  return { success: true, data: banks.map((c) => c.key.slice(5)) };
});
window.apiFetch.getWorkbook = (unit) => window.apiFetch.getContent(bankKey(unit))
  .then((r) => ({ success: true, data: r.data.body, rel: r.data.rel }));
window.apiFetch.saveWorkbook = (unit, body) => window.apiFetch.saveContent(bankKey(unit), body)
  .then((r) => {
    const b = r.data.body || {};
    const exercises = b.exercises || [];
    return {
      success: true,
      data: {
        exerciseCount: exercises.length,
        itemCount: exercises.reduce((n, e) => n + ((e.items || []).length), 0),
        rel: r.data.rel,
        note: r.data.note
      }
    };
  });
window.apiFetch.getUnit10World = () => window.apiFetch('/api/unit10/world');
window.apiFetch.saveUnit10World = (body) => window.apiFetch('/api/unit10/world', { method: 'PUT', body });
window.apiFetch.sync = () => window.apiFetch('/api/sync', { method: 'POST' });
window.apiFetch.getArt = () => window.apiFetch('/api/art');
window.apiFetch.getSkinCatalog = () => window.apiFetch('/api/skins/catalog');
window.apiFetch.getAdminHost = () => window.apiFetch('/api/admin-host');
// The content registry. One list, one place, and the same URLs on both halves — which is
// what stops a unit being added to the game and quietly having no way in here.
window.apiFetch.listContent = () => window.apiFetch('/api/admin/content');
// ?key= rather than a path segment: Vercel matches only one segment after /api/admin/, so
// /api/admin/content/world/topik-2 never reaches the function at all.
window.apiFetch.getContent = (key) =>
  window.apiFetch('/api/admin/content?key=' + encodeURIComponent(key));
window.apiFetch.saveContent = (key, body) =>
  window.apiFetch('/api/admin/content?key=' + encodeURIComponent(key), { method: 'PUT', body });

// Translations. Under /api/admin/ for the same reason as the content registry: on Vercel
// there is one admin function, and a route anywhere else works locally and 404s live.
window.apiFetch.i18nReport = (lang) =>
  window.apiFetch('/api/admin/i18n?lang=' + encodeURIComponent(lang || 'vi'));
window.apiFetch.i18nRows = (source, lang) =>
  window.apiFetch('/api/admin/i18n?lang=' + encodeURIComponent(lang || 'vi')
    + '&source=' + encodeURIComponent(source));
window.apiFetch.i18nSave = (source, lang, entries) =>
  window.apiFetch('/api/admin/i18n', { method: 'PUT', body: { source: source, lang: lang, entries: entries } });

// 5. Data Refresh & Synchronization Manager
window.AppController = {
  applyHost(host) {
    const data = host || { writable: true, gameUrl: 'http://localhost:8742/' };
    window.AppState.adminWritable = data.writable !== false;
    window.AppState.gameUrl = data.gameUrl || '/';
    window.AppState.host = data;
    const pill = document.getElementById('admin-readonly-pill');
    if (pill) {
      if (window.AppState.adminWritable) pill.classList.add('hidden');
      else {
        pill.classList.remove('hidden');
        pill.title = data.hint || 'Read-only';
      }
    }
    this.renderAuth(data);
    document.querySelectorAll('#btn-open-game').forEach((a) => {
      a.setAttribute('href', window.AppState.gameUrl);
    });
    document.body.classList.toggle('admin-readonly', !window.AppState.adminWritable);
    // Sync regenerates files on disk, so it belongs to the copy that has a disk. Hidden
    // rather than left to 404, which is what it did on production until the endpoint check
    // in validate_content went looking for callers with nothing to answer them.
    const isLocal = data.gameUrl === 'http://localhost:8742/';
    const sync = document.getElementById('btn-sync-now');
    if (sync) {
      sync.hidden = !isLocal;
      sync.title = isLocal ? '' : 'Runs on the local admin only — it rewrites files on disk.';
    }
  },

  renderAuth(data) {
    const box = document.getElementById('admin-auth');
    if (!box) return;
    const signedIn = !!(window.AdminAuth && window.AdminAuth.signedIn());
    const you = data && data.you;
    // Sign-in only means something where a token is checked. On the local server the operator
    // is already the operator, so the strip stays out of the way.
    const needsAuth = !!(data && data.gameUrl !== 'http://localhost:8742/');
    if (!needsAuth) { box.innerHTML = ''; box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    if (!signedIn) {
      // The button says what it does and the read-only pill beside it says the consequence,
      // so a sentence repeating both cost 170px and wrapped the header onto a second row.
      box.innerHTML = '<button type="button" id="btn-admin-signin" class="btn-small">Sign in</button>';
      const b = document.getElementById('btn-admin-signin');
      if (b) b.onclick = () => window.AdminAuth.signIn(() => this.fetchAllData());
      return;
    }
    const who = (you && (you.email || you.sub)) || 'signed in';
    // A branch that does not publish is a standing hazard, not a per-save footnote: every
    // edit made while it is set goes live and stays absent from main.
    if (data.scratchBranch && data.writable) {
      window.Toast.error('Saves commit to ' + data.branch + ', which does not publish. The CDN'
        + ' goes live but main never sees the change, and the next publish from main undoes it.',
        'Writing to a scratch branch');
    }
    if (data.writable) {
      box.innerHTML = '<span class="auth-note" title="Editing as ' + who + '"><b>' + who + '</b>'
        + (data.branch ? ' \u2192 <code>' + data.branch + '</code>' : '') + '</span>'
        + '<button type="button" id="btn-admin-signout" class="btn-small">Sign out</button>';
    } else {
      const sub = (you && you.sub) || '';
      // Three different reasons to be read-only while signed in, and they need different
      // actions: the wrong account, a sub that was never set, or a token that cannot write
      // to the repository. The server works out which; this only has to avoid flattening
      // them into one sentence that fits none of them.
      const why = data.hint
        || (sub ? 'Set ADMIN_GOOGLE_SUB to ' + sub + ' in Vercel to unlock editing.' : '');
      box.innerHTML = '<span class="auth-note" title="' + why.replace(/"/g, '') + '">'
        + '<b>' + who + '</b> \u2014 read-only</span>'
        + '<button type="button" id="btn-admin-signout" class="btn-small">Sign out</button>';
      // Too long for the header strip and too important to leave in a tooltip.
      const pill = document.getElementById('admin-readonly-pill');
      if (pill && why) pill.title = why;
      if (why) window.Toast.error(why, 'Cannot edit yet');
    }
    const o = document.getElementById('btn-admin-signout');
    if (o) o.onclick = () => window.AdminAuth.signOut(() => this.fetchAllData());
  },

  async fetchAllData() {
    try {
      try {
        const hostRes = await window.apiFetch.getAdminHost();
        if (hostRes && hostRes.success) this.applyHost(hostRes.data);
      } catch (e) {
        const host = (typeof location !== 'undefined' && location.hostname) || '';
        const local = host === 'localhost' || host === '127.0.0.1';
        this.applyHost({ writable: local, gameUrl: local ? 'http://localhost:8742/' : '/' });
      }
      const [statsRes, levelsRes, vocabRes] = await Promise.all([
        window.apiFetch.getStats(),
        window.apiFetch.getLevels(),
        window.apiFetch.getVocabFacts()
      ]);

      if (statsRes.success) {
        window.AppState.stats = statsRes.data;
        window.AppState.duplicates = statsRes.data.duplicates || [];
        window.AppState.missingFacts = statsRes.data.missingFacts || [];
      }

      if (levelsRes.success) {
        window.AppState.levels = levelsRes.data || [];
      }

      if (vocabRes.success) {
        window.AppState.vocabFacts = vocabRes.data || {};
        // Pre-rendered English origin strings, so the view need not know the schema.
        window.AppState.vocabDescriptions = vocabRes.descriptions || {};
        window.AppState.vocabReadOnly = vocabRes.readOnly === true;
        window.AppState.vocabGeneratorHint = vocabRes.generatorHint || '';
        window.AppState.casingDiscrepancies = vocabRes.casingDiscrepancies || [];
        if (!window.AppState.missingFacts.length) {
          window.AppState.missingFacts = vocabRes.missingFacts || [];
        }
      }

      window.AppState.notify();
      this.updateSyncIndicator(true);
    } catch (err) {
      console.error('Failed to load application data:', err);
      this.updateSyncIndicator(false);
    }
  },

  updateSyncIndicator(inSync) {
    const dot = document.getElementById('sync-dot');
    const text = document.getElementById('sync-text');
    if (dot && text) {
      if (inSync) {
        dot.className = 'status-dot green';
        text.textContent = 'In Sync';
      } else {
        dot.className = 'status-dot yellow';
        text.textContent = 'Out of Sync / Error';
      }
    }
  },

  async handleSyncNow() {
    try {
      const res = await window.apiFetch.sync();
      if (res.success) {
        window.Toast.success('levels.json written; game scripts syntax-checked.', 'File Sync');
        await this.fetchAllData();
      }
    } catch (err) {
      // Toast error handled inside apiFetch
    }
  }
};

// 6. Router & Navigation Setup
window.AppRouter = {
  routes: {
    'dashboard': () => window.DashboardView && window.DashboardView.render(),
    'content': () => window.ContentView && window.ContentView.render(),
    'levels': () => window.LevelsView && window.LevelsView.render(),
    'vocab': () => window.VocabView && window.VocabView.render(),
    'unit10': () => window.Unit10View && window.Unit10View.render(),
    'unit14': () => window.Unit14View && window.Unit14View.render(),
    'i18n': () => window.I18nView && window.I18nView.render(),
    'art': () => window.ArtView && window.ArtView.render(),
    'skins': () => window.SkinsView && window.SkinsView.render()
  },

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    
    // Bind Tab Click Handlers
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = btn.getAttribute('data-tab');
        window.location.hash = `#${tab}`;
      });
    });

    // Initial Route Detection
    if (!window.location.hash) {
      window.location.hash = '#dashboard';
    } else {
      this.handleRoute();
    }
  },

  handleRoute() {
    const rawHash = window.location.hash.replace('#', '') || 'dashboard';
    const activeTab = this.routes[rawHash] ? rawHash : 'dashboard';
    window.AppState.currentTab = activeTab;

    // Update Nav Buttons Active Class
    document.querySelectorAll('.nav-btn').forEach(btn => {
      const tab = btn.getAttribute('data-tab');
      if (tab === activeTab) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update Section Panels
    document.querySelectorAll('.tab-content').forEach(section => {
      if (section.id === `tab-${activeTab}`) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    });

    // Render active tab view
    if (this.routes[activeTab]) {
      this.routes[activeTab]();
    }
  }
};

// DOM Content Loaded Handler
document.addEventListener('DOMContentLoaded', () => {
  // Bind Sync Button
  const btnSync = document.getElementById('btn-sync-now');
  if (btnSync) {
    btnSync.addEventListener('click', () => window.AppController.handleSyncNow());
  }

  // Subscribe view renderers to AppState updates
  window.AppState.subscribe(() => {
    const currentTab = window.AppState.currentTab;
    if (currentTab === 'dashboard' && window.DashboardView) window.DashboardView.render();
    if (currentTab === 'levels' && window.LevelsView) window.LevelsView.render();
    if (currentTab === 'vocab' && window.VocabView) window.VocabView.render();
    if (currentTab === 'art' && window.ArtView) window.ArtView.render();
    if (currentTab === 'skins' && window.SkinsView) window.SkinsView.render();
  });

  // Initial Data Fetch & Router Activation
  window.AppController.fetchAllData().then(() => {
    window.AppRouter.init();
  });
});
