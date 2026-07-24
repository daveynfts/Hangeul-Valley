/**
 * Hangeul Valley Admin Panel - VOCAB_FACTS Dictionary Component (vocab.js)
 * High-performance paginated rendering, filtering by missing coverage or casing discrepancies,
 * inline/modal editor for dictionary entries in game.js.
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

    // Add VOCAB_FACT Button
    const btnAdd = document.getElementById('btn-add-vocab');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => this.openAddFactModal());
    }
  },

  render() {
    this.init();

    const vocabFacts = window.AppState.vocabFacts || {};
    const missingFacts = window.AppState.missingFacts || [];
    const casingDiscrepancies = window.AppState.casingDiscrepancies || [];

    // 1. Update Mode Counts
    const allKeysCount = Object.keys(vocabFacts).length;
    const elAll = document.getElementById('count-mode-all');
    const elMissing = document.getElementById('count-mode-missing');
    const elDiscrepancy = document.getElementById('count-mode-discrepancy');

    if (elAll) elAll.textContent = allKeysCount.toLocaleString();
    if (elMissing) elMissing.textContent = missingFacts.length.toLocaleString();
    if (elDiscrepancy) elDiscrepancy.textContent = casingDiscrepancies.length.toLocaleString();

    // 2. Filter & Search Dataset
    const mode = window.AppState.vocabFilterMode || 'all';
    const query = window.AppState.vocabSearchQuery || '';

    let list = [];

    if (mode === 'missing') {
      list = missingFacts.map(item => ({
        key: item.en,
        vi: '',
        ko: item.ko || '',
        status: 'MISSING',
        level: item.level
      }));
    } else if (mode === 'discrepancy') {
      list = casingDiscrepancies.map(item => ({
        key: item.en || item.key,
        vi: item.fact ? item.fact.vi : (vocabFacts[item.key] ? vocabFacts[item.key].vi : ''),
        ko: item.fact ? item.fact.ko : (vocabFacts[item.key] ? vocabFacts[item.key].ko : ''),
        status: 'DISCREPANCY'
      }));
    } else {
      // 'all' mode
      const discrepancyKeysSet = new Set(casingDiscrepancies.map(d => (d.key || d.en || '').toLowerCase()));
      
      list = Object.keys(vocabFacts).map(key => {
        const fact = vocabFacts[key] || {};
        const isDiscrepancy = discrepancyKeysSet.has(key.toLowerCase());
        return {
          key: key,
          vi: fact.vi || '',
          ko: fact.ko || '',
          status: isDiscrepancy ? 'DISCREPANCY' : 'MATCH'
        };
      });
    }

    // Apply Search Query
    if (query) {
      list = list.filter(item => {
        const kMatch = item.key && item.key.toLowerCase().includes(query);
        const vMatch = item.vi && item.vi.toLowerCase().includes(query);
        const koMatch = item.ko && item.ko.toLowerCase().includes(query);
        return kMatch || vMatch || koMatch;
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
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No dictionary facts match your criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = pageItems.map(item => {
      let statusBadge = '<span class="badge badge-emerald">Match</span>';
      if (item.status === 'DISCREPANCY') {
        statusBadge = '<span class="badge badge-amber" title="Key case mismatch between levels.json and game.js">Case Mismatch</span>';
      } else if (item.status === 'MISSING') {
        statusBadge = '<span class="badge badge-rose">Missing Fact</span>';
      }

      const isMissing = item.status === 'MISSING';

      return `
        <tr>
          <td><code class="key-badge">${this.escapeHtml(item.key)}</code></td>
          <td>
            ${isMissing ? `<span class="text-muted">--</span>` : `<input type="text" class="inline-input input-vi" data-key="${this.escapeHtml(item.key)}" value="${this.escapeHtml(item.vi)}">`}
          </td>
          <td>
            ${isMissing ? `<span class="text-muted">${this.escapeHtml(item.ko)}</span>` : `<input type="text" class="inline-input input-ko" data-key="${this.escapeHtml(item.key)}" value="${this.escapeHtml(item.ko)}">`}
          </td>
          <td>${statusBadge}</td>
          <td class="text-right">
            ${isMissing ? `
              <button class="btn btn-emerald btn-sm btn-quick-add" data-key="${this.escapeHtml(item.key)}" data-ko="${this.escapeHtml(item.ko)}">
                <span>➕</span> Add Fact
              </button>
            ` : `
              <button class="btn btn-secondary btn-sm btn-edit-fact" data-key="${this.escapeHtml(item.key)}" data-vi="${this.escapeHtml(item.vi)}" data-ko="${this.escapeHtml(item.ko)}">
                ✏️
              </button>
              <button class="btn btn-danger btn-sm btn-delete-fact" data-key="${this.escapeHtml(item.key)}">
                🗑️
              </button>
            `}
          </td>
        </tr>
      `;
    }).join('');

    // Bind Inline Input Blur/Save handlers
    tbody.querySelectorAll('.inline-input').forEach(input => {
      input.addEventListener('change', async (e) => {
        const key = input.getAttribute('data-key');
        const row = input.closest('tr');
        const viInput = row.querySelector('.input-vi');
        const koInput = row.querySelector('.input-ko');

        const newVi = viInput ? viInput.value.trim() : '';
        const newKo = koInput ? koInput.value.trim() : '';

        try {
          const res = await window.apiFetch.updateVocabFact(key, { vi: newVi, ko: newKo });
          if (res.success) {
            window.Toast.success(`Updated VOCAB_FACT '${key}'!`, 'Saved');
            await window.AppController.fetchAllData();
          }
        } catch (err) {
          // Error handled in apiFetch
        }
      });
    });

    // Bind Edit/Delete/Add buttons
    tbody.querySelectorAll('.btn-edit-fact').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        const vi = btn.getAttribute('data-vi');
        const ko = btn.getAttribute('data-ko');
        this.openEditFactModal(key, vi, ko);
      });
    });

    tbody.querySelectorAll('.btn-delete-fact').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        this.handleDeleteFact(key);
      });
    });

    tbody.querySelectorAll('.btn-quick-add').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        const ko = btn.getAttribute('data-ko');
        this.openAddFactModal(key, ko);
      });
    });
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

  openAddFactModal(defaultKey = '', defaultKo = '') {
    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">English Dictionary Key (en) *</label>
        <input type="text" id="modal-fact-key" class="form-input" value="${this.escapeHtml(defaultKey)}" placeholder="e.g. father">
        <span class="form-hint">Unique key used in levels.json words array</span>
      </div>

      <div class="form-group">
        <label class="form-label">Vietnamese Translation (vi)</label>
        <input type="text" id="modal-fact-vi" class="form-input" placeholder="e.g. Bố, cha">
      </div>

      <div class="form-group">
        <label class="form-label">Korean Recall Hint (ko)</label>
        <input type="text" id="modal-fact-ko" class="form-input" value="${this.escapeHtml(defaultKo)}" placeholder="e.g. 아버지">
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="window.Modal.close()">Cancel</button>
      <button class="btn btn-emerald" id="modal-btn-save-fact"><span>💾</span> Add VOCAB_FACT Entry</button>
    `;

    window.Modal.open('Add VOCAB_FACT Entry', bodyHtml, footerHtml);

    const btnSave = document.getElementById('modal-btn-save-fact');
    if (btnSave) {
      btnSave.addEventListener('click', async () => {
        const key = document.getElementById('modal-fact-key').value.trim();
        const vi = document.getElementById('modal-fact-vi').value.trim();
        const ko = document.getElementById('modal-fact-ko').value.trim();

        if (!key) {
          window.Toast.warning('English key is required.', 'Validation');
          return;
        }

        try {
          const res = await window.apiFetch.addVocabFact({ key, vi, ko });
          if (res.success) {
            window.Toast.success(`VOCAB_FACT '${key}' created & synced to game.js!`, 'Success');
            window.Modal.close();
            await window.AppController.fetchAllData();
          }
        } catch (err) {
          // Toast handles errors
        }
      });
    }
  },

  openEditFactModal(key, vi, ko) {
    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">English Dictionary Key (en)</label>
        <input type="text" class="form-input" value="${this.escapeHtml(key)}" disabled readonly>
      </div>

      <div class="form-group">
        <label class="form-label">Vietnamese Translation (vi)</label>
        <input type="text" id="modal-edit-vi" class="form-input" value="${this.escapeHtml(vi)}" placeholder="e.g. Bố, cha">
      </div>

      <div class="form-group">
        <label class="form-label">Korean Recall Hint (ko)</label>
        <input type="text" id="modal-edit-ko" class="form-input" value="${this.escapeHtml(ko)}" placeholder="e.g. 아버지">
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="window.Modal.close()">Cancel</button>
      <button class="btn btn-emerald" id="modal-btn-update-fact"><span>💾</span> Save Changes</button>
    `;

    window.Modal.open(`Edit VOCAB_FACT: '${key}'`, bodyHtml, footerHtml);

    const btnUpdate = document.getElementById('modal-btn-update-fact');
    if (btnUpdate) {
      btnUpdate.addEventListener('click', async () => {
        const newVi = document.getElementById('modal-edit-vi').value.trim();
        const newKo = document.getElementById('modal-edit-ko').value.trim();

        try {
          const res = await window.apiFetch.updateVocabFact(key, { vi: newVi, ko: newKo });
          if (res.success) {
            window.Toast.success(`VOCAB_FACT '${key}' updated & synced!`, 'Success');
            window.Modal.close();
            await window.AppController.fetchAllData();
          }
        } catch (err) {
          // Toast handles errors
        }
      });
    }
  },

  async handleDeleteFact(key) {
    if (!confirm(`Are you sure you want to delete the dictionary entry '${key}' from game.js?`)) {
      return;
    }

    try {
      const res = await window.apiFetch.deleteVocabFact(key);
      if (res.success) {
        window.Toast.success(`VOCAB_FACT '${key}' deleted from game.js!`, 'Deleted');
        await window.AppController.fetchAllData();
      }
    } catch (err) {
      // Toast handles errors
    }
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
