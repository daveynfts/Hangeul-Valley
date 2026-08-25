/**
 * Hangeul Valley Admin Panel - Levels & Words Component (levels.js)
 * Manages level metadata editing, words CRUD operations, global search/filtering, and emoji hint picker.
 */

window.LevelsView = {
  initialized: false,

  init() {
    if (this.initialized) return;
    this.initialized = true;

    // Search & Filter Events
    const searchInput = document.getElementById('input-search-words');
    const clearBtn = document.getElementById('btn-clear-search-words');
    const catSelect = document.getElementById('select-filter-category');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        window.AppState.levelsSearchQuery = e.target.value.trim().toLowerCase();
        if (clearBtn) {
          clearBtn.classList.toggle('hidden', !window.AppState.levelsSearchQuery);
        }
        this.renderWordsTable();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        window.AppState.levelsSearchQuery = '';
        clearBtn.classList.add('hidden');
        this.renderWordsTable();
      });
    }

    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        window.AppState.levelsCategoryFilter = e.target.value;
        this.renderWordsTable();
      });
    }

    // Action Buttons
    const btnEditMeta = document.getElementById('btn-edit-level-meta');
    if (btnEditMeta) {
      btnEditMeta.addEventListener('click', () => this.openEditLevelMetaModal());
    }

    const btnAddWord = document.getElementById('btn-add-word');
    if (btnAddWord) {
      btnAddWord.addEventListener('click', () => this.openAddWordModal());
    }
  },

  render() {
    this.init();
    const levels = window.AppState.levels || [];
    if (levels.length === 0) return;

    // 1. Render Level Selector Grid (1 to 25)
    const selectorContainer = document.getElementById('level-selector-list');
    if (selectorContainer) {
      const selectedNum = window.AppState.selectedLevelNum || 1;
      const countBadge = document.getElementById('levels-count-badge');
      if (countBadge) countBadge.textContent = `${levels.length} Levels`;

      selectorContainer.innerHTML = levels.map(l => `
        <button class="level-btn ${l.level === selectedNum ? 'active' : ''}" data-level="${l.level}">
          ${l.level}
        </button>
      `).join('');

      selectorContainer.querySelectorAll('.level-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const num = Number(btn.getAttribute('data-level'));
          window.AppState.selectedLevelNum = num;
          this.render();
        });
      });
    }

    // 2. Render Level Metadata Card
    const currentLevel = levels.find(l => l.level === window.AppState.selectedLevelNum) || levels[0];
    if (currentLevel) {
      const elIcon = document.getElementById('level-icon');
      const elTitle = document.getElementById('level-title');
      const elWordsBadge = document.getElementById('level-words-badge');
      const elDesc = document.getElementById('level-desc');
      const elTarget = document.getElementById('level-target');

      if (elIcon) elIcon.textContent = currentLevel.icon || '📚';
      if (elTitle) elTitle.textContent = `Level ${currentLevel.level} - ${currentLevel.name || ''}`;
      if (elWordsBadge) elWordsBadge.textContent = `${(currentLevel.words || []).length} Words`;
      if (elDesc) elDesc.textContent = currentLevel.description || 'No description configured.';
      if (elTarget) elTarget.textContent = `Target Score: ${currentLevel.target || (currentLevel.words ? currentLevel.words.length : 0)}`;
    }

    // 3. Populate Category Dropdown Options
    this.updateCategoryDropdown(levels);

    // 4. Render Words Datatable
    this.renderWordsTable();
  },

  updateCategoryDropdown(levels) {
    const catSelect = document.getElementById('select-filter-category');
    if (!catSelect) return;

    const categoriesSet = new Set();
    levels.forEach(l => {
      (l.words || []).forEach(w => {
        if (w.category) categoriesSet.add(w.category);
      });
    });

    const currentVal = window.AppState.levelsCategoryFilter || 'ALL';
    const optionsHtml = ['<option value="ALL">All Categories</option>'];
    Array.from(categoriesSet).sort().forEach(cat => {
      const selected = cat === currentVal ? 'selected' : '';
      optionsHtml.push(`<option value="${this.escapeHtml(cat)}" ${selected}>${this.escapeHtml(cat)}</option>`);
    });

    catSelect.innerHTML = optionsHtml.join('');
  },

  renderWordsTable() {
    const levels = window.AppState.levels || [];
    const selectedNum = window.AppState.selectedLevelNum || 1;
    const currentLevel = levels.find(l => l.level === selectedNum);
    const query = window.AppState.levelsSearchQuery;
    const catFilter = window.AppState.levelsCategoryFilter;

    let targetWords = [];
    let isGlobalSearch = false;

    if (query) {
      isGlobalSearch = true;
      // Global search across ALL 25 levels
      levels.forEach(lvl => {
        (lvl.words || []).forEach((w, idx) => {
          const matchKo = w.ko && w.ko.toLowerCase().includes(query);
          const matchEn = w.en && w.en.toLowerCase().includes(query);
          const matchCat = w.category && w.category.toLowerCase().includes(query);

          if (matchKo || matchEn || matchCat) {
            targetWords.push({ ...w, levelNum: lvl.level, wordIndex: idx });
          }
        });
      });
    } else if (currentLevel) {
      // Local level words
      (currentLevel.words || []).forEach((w, idx) => {
        targetWords.push({ ...w, levelNum: currentLevel.level, wordIndex: idx });
      });
    }

    // Apply category dropdown filter
    if (catFilter && catFilter !== 'ALL') {
      targetWords = targetWords.filter(w => w.category === catFilter);
    }

    // Update search results info badge
    const infoSpan = document.getElementById('search-results-info');
    if (infoSpan) {
      if (isGlobalSearch) {
        infoSpan.textContent = `Found ${targetWords.length} matching words globally`;
      } else if (catFilter !== 'ALL') {
        infoSpan.textContent = `Showing ${targetWords.length} words in category '${catFilter}'`;
      } else {
        infoSpan.textContent = '';
      }
    }

    // Render Tbody
    const tbody = document.getElementById('words-tbody');
    if (!tbody) return;

    if (targetWords.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No words match the selected filters.</td></tr>`;
      return;
    }

    tbody.innerHTML = targetWords.map((item, displayIdx) => {
      const catBadgeClass = this.getCategoryBadgeClass(item.category);
      const canWrite = window.AppState && window.AppState.adminWritable;
      const actions = canWrite ? `
            <button class="btn btn-secondary btn-sm btn-edit-word" data-level="${item.levelNum}" data-index="${item.wordIndex}">
              ✏️
            </button>
            <button class="btn btn-danger btn-sm btn-delete-word" data-level="${item.levelNum}" data-index="${item.wordIndex}" data-ko="${this.escapeHtml(item.ko)}">
              🗑️
            </button>` : '';
      
      return `
        <tr>
          <td>
            ${isGlobalSearch ? `<span class="badge badge-indigo">Lvl ${item.levelNum}</span>` : `<span class="text-muted">${displayIdx + 1}</span>`}
          </td>
          <td class="font-bold">${this.escapeHtml(item.ko)}</td>
          <td><code class="key-badge">${this.escapeHtml(item.en)}</code></td>
          <td><span class="badge ${catBadgeClass}">${this.escapeHtml(item.category || '기타')}</span></td>
          <td class="text-center cell-glyph">${this.escapeHtml(item.hint || '')}</td>
          <td class="text-right">${actions}</td>
        </tr>
      `;
    }).join('');

    // Bind Edit and Delete Word handlers
    tbody.querySelectorAll('.btn-edit-word').forEach(btn => {
      btn.addEventListener('click', () => {
        const levelNum = Number(btn.getAttribute('data-level'));
        const wordIndex = Number(btn.getAttribute('data-index'));
        this.openEditWordModal(levelNum, wordIndex);
      });
    });

    tbody.querySelectorAll('.btn-delete-word').forEach(btn => {
      btn.addEventListener('click', () => {
        const levelNum = Number(btn.getAttribute('data-level'));
        const wordIndex = Number(btn.getAttribute('data-index'));
        const ko = btn.getAttribute('data-ko');
        this.handleDeleteWord(levelNum, wordIndex, ko);
      });
    });
  },

  getCategoryBadgeClass(cat) {
    if (!cat) return 'badge-slate';
    if (cat.includes('가족') || cat.includes('사람')) return 'badge-indigo';
    if (cat.includes('음식') || cat.includes('요리')) return 'badge-amber';
    if (cat.includes('동물') || cat.includes('자연')) return 'badge-emerald';
    if (cat.includes('일상') || cat.includes('장소')) return 'badge-sky';
    return 'badge-violet';
  },

  // Modal 1: Edit Level Metadata
  openEditLevelMetaModal() {
    const levels = window.AppState.levels || [];
    const selectedNum = window.AppState.selectedLevelNum || 1;
    const currentLevel = levels.find(l => l.level === selectedNum);
    if (!currentLevel) return;

    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">Level Number</label>
        <input type="text" class="form-input" value="Level ${currentLevel.level}" disabled readonly>
      </div>

      <div class="form-group">
        <label class="form-label">Level Name</label>
        <input type="text" id="modal-meta-name" class="form-input" value="${this.escapeHtml(currentLevel.name || '')}" placeholder="e.g. 기초 어휘 1">
      </div>

      <div class="form-group">
        <label class="form-label">Level Icon Emoji</label>
        <input type="text" id="modal-meta-icon" class="form-input" value="${this.escapeHtml(currentLevel.icon || '🏠')}" placeholder="e.g. 🏠">
      </div>

      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea id="modal-meta-desc" class="form-input" rows="3" placeholder="Describe level contents...">${this.escapeHtml(currentLevel.description || '')}</textarea>
      </div>

      <div class="form-group">
        <label class="form-label">Target Score</label>
        <input type="number" id="modal-meta-target" class="form-input" value="${currentLevel.target || 60}" placeholder="60">
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="window.Modal.close()">Cancel</button>
      <button class="btn btn-emerald" id="modal-btn-save-meta"><span>💾</span> Save Level Metadata</button>
    `;

    window.Modal.open(`Edit Metadata - Level ${currentLevel.level}`, bodyHtml, footerHtml);

    const btnSave = document.getElementById('modal-btn-save-meta');
    if (btnSave) {
      btnSave.addEventListener('click', async () => {
        const name = document.getElementById('modal-meta-name').value.trim();
        const icon = document.getElementById('modal-meta-icon').value.trim();
        const description = document.getElementById('modal-meta-desc').value.trim();
        const target = Number(document.getElementById('modal-meta-target').value);

        try {
          const res = await window.apiFetch.updateLevelMeta(selectedNum, { name, icon, description, target });
          if (res.success) {
            window.Toast.success(`Level ${selectedNum} metadata updated!`, 'Success');
            window.Modal.close();
            await window.AppController.fetchAllData();
          }
        } catch (err) {
          // Toast handles errors
        }
      });
    }
  },

  // Modal 2: Add Word
  openAddWordModal() {
    const selectedNum = window.AppState.selectedLevelNum || 1;
    this.renderWordFormModal(`Add Word to Level ${selectedNum}`, selectedNum);
  },

  // Modal 3: Edit Word
  openEditWordModal(levelNum, wordIndex) {
    const levels = window.AppState.levels || [];
    const level = levels.find(l => l.level === levelNum);
    if (!level || !level.words || !level.words[wordIndex]) return;

    const word = level.words[wordIndex];
    this.renderWordFormModal(`Edit Word in Level ${levelNum}`, levelNum, wordIndex, word);
  },

  renderWordFormModal(title, levelNum, wordIndex = null, existingWord = null) {
    const isEdit = wordIndex !== null && existingWord !== null;
    const koVal = existingWord ? existingWord.ko : '';
    const enVal = existingWord ? existingWord.en : '';
    const hintVal = existingWord ? existingWord.hint : '';
    const categoryVal = existingWord ? existingWord.category : '';

    const commonEmojis = ['🍎', '🐶', '🏠', '👨‍👩‍👧', '🚗', '⚽', '📚', '🌳', '⭐️', '💡', '☀️', '🌧️', '🍌', '🐱', '🎒', '🚲', '✏️', '🍕'];

    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">Korean Word (ko) *</label>
        <input type="text" id="modal-word-ko" class="form-input" value="${this.escapeHtml(koVal)}" placeholder="e.g. 아버지">
      </div>

      <div class="form-group">
        <label class="form-label">English Key (en) *</label>
        <input type="text" id="modal-word-en" class="form-input" value="${this.escapeHtml(enVal)}" placeholder="e.g. father">
      </div>

      <div class="form-group">
        <label class="form-label">Category</label>
        <input type="text" id="modal-word-category" class="form-input" value="${this.escapeHtml(categoryVal)}" placeholder="e.g. 가족과 사람">
      </div>

      <div class="form-group">
        <label class="form-label">Hint Emoji</label>
        <input type="text" id="modal-word-hint" class="form-input" value="${this.escapeHtml(hintVal)}" placeholder="e.g. 👨">
        <span class="form-hint">Click an emoji below to set the hint helper:</span>
        <div class="emoji-picker-grid">
          ${commonEmojis.map(e => `<button type="button" class="emoji-btn">${e}</button>`).join('')}
        </div>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="window.Modal.close()">Cancel</button>
      <button class="btn btn-emerald" id="modal-btn-save-word"><span>💾</span> ${isEdit ? 'Save Word Changes' : 'Add Word'}</button>
    `;

    window.Modal.open(title, bodyHtml, footerHtml);

    // Emoji picker click handler
    document.querySelectorAll('.emoji-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const hintInput = document.getElementById('modal-word-hint');
        if (hintInput) hintInput.value = btn.textContent;
      });
    });

    // Save handler
    const btnSave = document.getElementById('modal-btn-save-word');
    if (btnSave) {
      btnSave.addEventListener('click', async () => {
        const ko = document.getElementById('modal-word-ko').value.trim();
        const en = document.getElementById('modal-word-en').value.trim();
        const category = document.getElementById('modal-word-category').value.trim();
        const hint = document.getElementById('modal-word-hint').value.trim();

        if (!ko || !en) {
          window.Toast.warning('Korean and English fields are required.', 'Validation');
          return;
        }

        const payload = { ko, en, category, hint };

        try {
          if (isEdit) {
            const res = await window.apiFetch.updateWord(levelNum, wordIndex, payload);
            if (res.success) {
              window.Toast.success(`Word '${ko}' updated in level ${levelNum}!`, 'Success');
              window.Modal.close();
              await window.AppController.fetchAllData();
            }
          } else {
            const res = await window.apiFetch.addWord(levelNum, payload);
            if (res.success) {
              window.Toast.success(`Word '${ko}' added to level ${levelNum}!`, 'Success');
              window.Modal.close();
              await window.AppController.fetchAllData();
            }
          }
        } catch (err) {
          // Toast handles error
        }
      });
    }
  },

  async handleDeleteWord(levelNum, wordIndex, ko) {
    if (!confirm(`Are you sure you want to delete the word '${ko}' from Level ${levelNum}?`)) {
      return;
    }

    try {
      const res = await window.apiFetch.deleteWord(levelNum, wordIndex);
      if (res.success) {
        window.Toast.success(`Word '${ko}' deleted from Level ${levelNum}!`, 'Deleted');
        await window.AppController.fetchAllData();
      }
    } catch (err) {
      // Toast handles error
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
