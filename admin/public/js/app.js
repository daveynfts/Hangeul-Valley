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
    const config = {
      method: options.method || 'GET',
      headers: { ...defaultHeaders, ...(options.headers || {}) }
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
window.apiFetch.getLevel = (num) => window.apiFetch(`/api/levels/${num}`);
window.apiFetch.updateLevelMeta = (num, metaData) => window.apiFetch(`/api/levels/${num}`, { method: 'PUT', body: metaData });
window.apiFetch.addWord = (num, wordData) => window.apiFetch(`/api/levels/${num}/words`, { method: 'POST', body: wordData });
window.apiFetch.updateWord = (num, wordIdx, wordData) => window.apiFetch(`/api/levels/${num}/words/${wordIdx}`, { method: 'PUT', body: wordData });
window.apiFetch.deleteWord = (num, wordIdx) => window.apiFetch(`/api/levels/${num}/words/${wordIdx}`, { method: 'DELETE' });
window.apiFetch.getVocabFacts = () => window.apiFetch('/api/vocab-facts');
window.apiFetch.addVocabFact = (factData) => window.apiFetch('/api/vocab-facts', { method: 'POST', body: factData });
window.apiFetch.updateVocabFact = (key, factData) => window.apiFetch(`/api/vocab-facts/${encodeURIComponent(key)}`, { method: 'PUT', body: factData });
window.apiFetch.deleteVocabFact = (key) => window.apiFetch(`/api/vocab-facts/${encodeURIComponent(key)}`, { method: 'DELETE' });
window.apiFetch.sync = () => window.apiFetch('/api/sync', { method: 'POST' });

// 5. Data Refresh & Synchronization Manager
window.AppController = {
  async fetchAllData() {
    try {
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
        window.Toast.success('Root and assets files successfully synchronized!', 'File Sync');
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
    'levels': () => window.LevelsView && window.LevelsView.render(),
    'vocab': () => window.VocabView && window.VocabView.render()
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
  });

  // Initial Data Fetch & Router Activation
  window.AppController.fetchAllData().then(() => {
    window.AppRouter.init();
  });
});
