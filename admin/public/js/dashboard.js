/**
 * Hangeul Valley Admin Panel - Dashboard Component (dashboard.js)
 * Renders system statistics, coverage breakdown progress bar, missing facts list, and duplicates table.
 */

window.DashboardView = {
  initialized: false,

  init() {
    if (this.initialized) return;
    this.initialized = true;

    const btnRefresh = document.getElementById('btn-refresh-stats');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        window.AppController.fetchAllData().then(() => {
          window.Toast.success('Dashboard metrics refreshed!', 'Refresh');
        });
      });
    }
  },

  render() {
    this.init();
    const stats = window.AppState.stats;
    if (!stats) return;

    // 1. Render Top 6 Summary Cards
    const elTotalLevels = document.getElementById('stat-total-levels');
    const elTotalWords = document.getElementById('stat-total-words');
    const elAvgWords = document.getElementById('stat-avg-words');
    const elCoverage = document.getElementById('stat-coverage');
    const elDuplicates = document.getElementById('stat-duplicates');
    const elMissing = document.getElementById('stat-missing');

    if (elTotalLevels) elTotalLevels.textContent = stats.totalLevels !== undefined ? stats.totalLevels.toLocaleString() : '--';
    if (elTotalWords) elTotalWords.textContent = stats.totalWords !== undefined ? stats.totalWords.toLocaleString() : '--';
    if (elAvgWords) elAvgWords.textContent = stats.avgWordsPerLevel !== undefined ? stats.avgWordsPerLevel : '--';
    if (elCoverage) elCoverage.textContent = stats.coveragePercentage !== undefined ? `${stats.coveragePercentage}%` : '--%';
    
    const duplicatesList = window.AppState.duplicates || stats.duplicates || [];
    const missingList = window.AppState.missingFacts || stats.missingFacts || [];
    const casingList = window.AppState.casingDiscrepancies || [];

    if (elDuplicates) elDuplicates.textContent = duplicatesList.length.toLocaleString();
    if (elMissing) elMissing.textContent = missingList.length.toLocaleString();

    // 2. Render Coverage Progress Bar & Badges
    const totalWords = stats.totalWords || 1500;
    const exactCount = stats.exactMatchCount !== undefined ? stats.exactMatchCount : (totalWords - casingList.length - missingList.length);
    const casingCount = stats.casingMismatchCount !== undefined ? stats.casingMismatchCount : casingList.length;
    const missingCount = missingList.length;

    const exactPct = Math.max(0, Math.min(100, ((exactCount / totalWords) * 100).toFixed(1)));
    const casingPct = Math.max(0, Math.min(100, ((casingCount / totalWords) * 100).toFixed(1)));
    const missingPct = Math.max(0, Math.min(100, ((missingCount / totalWords) * 100).toFixed(1)));

    const badgeExact = document.getElementById('badge-exact-count');
    const badgeCasing = document.getElementById('badge-casing-count');
    const badgeMissing = document.getElementById('badge-missing-count');

    if (badgeExact) badgeExact.textContent = `Exact: ${exactCount.toLocaleString()}`;
    if (badgeCasing) badgeCasing.textContent = `Casing Mismatch: ${casingCount.toLocaleString()}`;
    if (badgeMissing) badgeMissing.textContent = `Missing: ${missingCount.toLocaleString()}`;

    const barExact = document.getElementById('bar-exact');
    const barCasing = document.getElementById('bar-casing');
    const barMissing = document.getElementById('bar-missing');

    if (barExact) barExact.style.width = `${exactPct}%`;
    if (barCasing) barCasing.style.width = `${casingPct}%`;
    if (barMissing) barMissing.style.width = `${missingPct}%`;

    // 3. Render Missing Facts Table Widget
    const missingBadge = document.getElementById('missing-count-badge');
    if (missingBadge) missingBadge.textContent = `${missingList.length} Missing`;

    const missingTbody = document.getElementById('missing-facts-tbody');
    if (missingTbody) {
      if (missingList.length === 0) {
        missingTbody.innerHTML = `<tr><td colspan="6" class="text-center text-emerald">🎉 100% VOCAB_FACTS Coverage! No missing facts detected.</td></tr>`;
      } else {
        missingTbody.innerHTML = missingList.map(item => {
          const levelNum = item.level || '--';
          const ko = item.ko || '--';
          const en = item.en || '--';
          const hint = item.hint || '';
          const category = item.category || '--';

          return `
            <tr>
              <td><span class="badge badge-indigo">Lvl ${levelNum}</span></td>
              <td class="font-bold">${this.escapeHtml(ko)}</td>
              <td><code class="key-badge">${this.escapeHtml(en)}</code></td>
              <td class="text-center">${this.escapeHtml(hint)}</td>
              <td><span class="badge badge-slate">${this.escapeHtml(category)}</span></td>
              <td class="text-right">
                <button class="btn btn-emerald btn-sm btn-quick-add-fact" data-key="${this.escapeHtml(en)}" data-ko="${this.escapeHtml(ko)}">
                  <span>➕</span> Add Fact
                </button>
              </td>
            </tr>
          `;
        }).join('');

        // Bind quick add fact buttons
        missingTbody.querySelectorAll('.btn-quick-add-fact').forEach(btn => {
          btn.addEventListener('click', () => {
            const key = btn.getAttribute('data-key');
            const ko = btn.getAttribute('data-ko');
            this.openQuickAddFactModal(key, ko);
          });
        });
      }
    }

    // 4. Render Duplicate Words Table Widget
    const dupsBadge = document.getElementById('duplicates-count-badge');
    if (dupsBadge) dupsBadge.textContent = `${duplicatesList.length} Duplicates`;

    const dupsTbody = document.getElementById('duplicates-tbody');
    if (dupsTbody) {
      if (duplicatesList.length === 0) {
        dupsTbody.innerHTML = `<tr><td colspan="2" class="text-center text-muted">No duplicate words detected across levels.</td></tr>`;
      } else {
        dupsTbody.innerHTML = duplicatesList.map(item => `
          <tr>
            <td class="font-bold">${this.escapeHtml(item.ko)}</td>
            <td class="text-right"><span class="badge badge-amber">${item.count} times</span></td>
          </tr>
        `).join('');
      }
    }
  },

  openQuickAddFactModal(key = '', ko = '') {
    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">English Dictionary Key (en)</label>
        <input type="text" id="modal-fact-key" class="form-input" value="${this.escapeHtml(key)}" placeholder="e.g. father">
        <span class="form-hint">Must match English translation key in levels.json</span>
      </div>

      <div class="form-group">
        <label class="form-label">Korean Word (ko)</label>
        <input type="text" id="modal-fact-ko" class="form-input" value="${this.escapeHtml(ko)}" placeholder="e.g. 아버지">
      </div>

      <div class="form-group">
        <label class="form-label">Vietnamese Explanation (vi)</label>
        <input type="text" id="modal-fact-vi" class="form-input" placeholder="e.g. Bố, cha">
        <span class="form-hint">Vietnamese vocabulary explanation for players</span>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="window.Modal.close()">Cancel</button>
      <button class="btn btn-emerald" id="modal-btn-save-fact"><span>💾</span> Save Fact Entry</button>
    `;

    window.Modal.open('Quick Add VOCAB_FACT Entry', bodyHtml, footerHtml);

    const btnSave = document.getElementById('modal-btn-save-fact');
    if (btnSave) {
      btnSave.addEventListener('click', async () => {
        const keyVal = document.getElementById('modal-fact-key').value.trim();
        const koVal = document.getElementById('modal-fact-ko').value.trim();
        const viVal = document.getElementById('modal-fact-vi').value.trim();

        if (!keyVal) {
          window.Toast.warning('English key is required.', 'Validation');
          return;
        }

        try {
          const res = await window.apiFetch.addVocabFact({ key: keyVal, ko: koVal, vi: viVal });
          if (res.success) {
            window.Toast.success(`VOCAB_FACT '${keyVal}' added & synced to game.js!`, 'Success');
            window.Modal.close();
            await window.AppController.fetchAllData();
          }
        } catch (err) {
          // Toast handles errors
        }
      });
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
