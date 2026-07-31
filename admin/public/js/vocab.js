/**
 * Hangeul Valley Admin Panel - Word Origins Component (vocab.js)
 * Paginated read-only view of facts.json, filterable by curation coverage.
 *
 * Read-only by design: facts.json is compiled by scripts/build_facts_json.js from the
 * curated SINO / MIXED / LOANWORDS / NATIVE_NOTE maps in that script, so any edit saved
 * from here would be overwritten by the next build. To change an origin, edit the
 * generator and re-run `node scripts/build_facts_json.js`.
 */

window.VocabView = {
  initialized: false,

  init() {
    if (this.initialized) return;
    this.initialized = true;

    // Search input handlers
    const searchInput = document.getElementById('input-search-vocab');
    const clearBtn = document.getElementById('btn-clear-search-vocab');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        window.AppState.vocabSearchQuery = e.target.value.trim().toLowerCase();
        window.AppState.vocabPage = 1;
        if (clearBtn) {
          clearBtn.classList.toggle('hidden', !window.AppState.vocabSearchQuery);
        }
        this.render();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        window.AppState.vocabSearchQuery = '';
        window.AppState.vocabPage = 1;
        clearBtn.classList.add('hidden');
        this.render();
      });
    }

    // Filter Mode Tabs
    const modeTabsContainer = document.getElementById('vocab-filter-tabs');
    if (modeTabsContainer) {
      modeTabsContainer.querySelectorAll('.mode-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          modeTabsContainer.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          window.AppState.vocabFilterMode = tab.getAttribute('data-mode') || 'all';
          window.AppState.vocabPage = 1;
          this.render();
        });
      });
    }

  },

  render() {
    this.init();

    const vocabFacts = window.AppState.vocabFacts || {};
    const missingFacts = window.AppState.missingFacts || [];

    // 1. Update Mode Counts
    const allKeysCount = Object.keys(vocabFacts).length;
    const elAll = document.getElementById('count-mode-all');
    const elMissing = document.getElementById('count-mode-missing');

    if (elAll) elAll.textContent = allKeysCount.toLocaleString();
    if (elMissing) elMissing.textContent = missingFacts.length.toLocaleString();

    // 2. Filter & Search Dataset
    const mode = window.AppState.vocabFilterMode || 'all';
    const query = window.AppState.vocabSearchQuery || '';

    let list = [];

    // facts.json is keyed by the Korean headword and holds structured origin data;
    // the server pre-renders each entry into an English string for display here.
    const descriptions = window.AppState.vocabDescriptions || {};

    if (mode === 'missing') {
      // "Missing" now means the word has no curated origin (classified `unknown`).
      list = missingFacts.map(item => ({
        key: item.ko || item.en,
        en: item.en || '',
        origin: '',
        status: 'UNCURATED',
        level: item.level
      }));
    } else {
      // 'all' mode — the legacy 'discrepancy' mode no longer applies: keys are exact
      // Korean headwords, so there is no casing to mismatch.
      list = Object.keys(vocabFacts).map(key => {
        const fact = vocabFacts[key] || {};
        return {
          key: key,
          en: '',
          origin: descriptions[key] || '',
          status: (!fact.o || fact.o === 'unknown') ? 'UNCURATED' : 'CURATED'
        };
      });
    }

    // Apply Search Query
    if (query) {
      list = list.filter(item => {
        const kMatch = item.key && item.key.toLowerCase().includes(query);
        const oMatch = item.origin && item.origin.toLowerCase().includes(query);
        const eMatch = item.en && item.en.toLowerCase().includes(query);
        return kMatch || oMatch || eMatch;
      });
    }

    // Sort alphabetically by key
    list.sort((a, b) => a.key.localeCompare(b.key));

    // 3. Pagination Logic (50 per page)
    const pageSize = window.AppState.vocabPageSize || 50;
    const totalItems = list.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    let page = window.AppState.vocabPage || 1;

    if (page > totalPages) page = totalPages;
    if (page < 1) page = 1;
    window.AppState.vocabPage = page;

    const startIndex = (page - 1) * pageSize;
    const pageItems = list.slice(startIndex, startIndex + pageSize);
    const endIndex = Math.min(startIndex + pageSize, totalItems);

    // Update Pagination UI Info
    const infoText = totalItems === 0 ? 'Showing 0 entries' : `Showing ${startIndex + 1}-${endIndex} of ${totalItems} entries`;
    const elInfoTop = document.getElementById('vocab-items-info');
    const elInfoBottom = document.getElementById('vocab-items-info-bottom');
    if (elInfoTop) elInfoTop.textContent = infoText;
    if (elInfoBottom) elInfoBottom.textContent = infoText;

    this.renderPaginationControls('vocab-pagination-controls', page, totalPages);
    this.renderPaginationControls('vocab-pagination-controls-bottom', page, totalPages);

    // 4. Render Table Rows
    const tbody = document.getElementById('vocab-tbody');
    if (!tbody) return;

    if (pageItems.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No word origins match your criteria.</td></tr>`;
      return;
    }

    // Read-only view. facts.json is generated by scripts/build_facts_json.js, so
    // edits made here would be discarded on the next build — curate the SINO /
    // MIXED / LOANWORDS / NATIVE_NOTE maps in that script instead.
    tbody.innerHTML = pageItems.map(item => {
      const uncurated = item.status === 'UNCURATED';
      const statusBadge = uncurated
        ? '<span class="badge badge-rose" title="No curated hanja / loanword origin yet">Not curated</span>'
        : '<span class="badge badge-emerald">Curated</span>';

      return `
        <tr>
          <td><code class="key-badge">${this.escapeHtml(item.key)}</code></td>
          <td>
            ${uncurated
              ? `<span class="text-muted">${this.escapeHtml(item.en) || '--'}</span>`
              : `<span>${this.escapeHtml(item.origin)}</span>`}
          </td>
          <td>${statusBadge}</td>
          <td class="text-right"><span class="text-muted" title="${this.escapeHtml(window.AppState.vocabGeneratorHint || '')}">generated</span></td>
        </tr>
      `;
    }).join('');

    // No edit/delete/add bindings: this view is read-only. Origins are curated in
    // scripts/build_facts_json.js and compiled into facts.json by that generator.
  },

  renderPaginationControls(containerId, currentPage, totalPages) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    let buttonsHtml = '';

    // Prev Button
    buttonsHtml += `<button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">Prev</button>`;

    // Page Numbers
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      buttonsHtml += `<button class="pagination-btn" data-page="1">1</button>`;
      if (startPage > 2) buttonsHtml += `<span class="text-muted" style="padding: 0 0.2rem;">...</span>`;
    }

    for (let p = startPage; p <= endPage; p++) {
      buttonsHtml += `<button class="pagination-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) buttonsHtml += `<span class="text-muted" style="padding: 0 0.2rem;">...</span>`;
      buttonsHtml += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    // Next Button
    buttonsHtml += `<button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">Next</button>`;

    container.innerHTML = buttonsHtml;

    container.querySelectorAll('.pagination-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetPage = Number(btn.getAttribute('data-page'));
        if (targetPage && targetPage !== currentPage) {
          window.AppState.vocabPage = targetPage;
          this.render();
        }
      });
    });
  },

  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};
