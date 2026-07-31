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
        missingTbody.innerHTML = `<tr><td colspan="6" class="text-center text-emerald">🎉 Every word has a curated origin.</td></tr>`;
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
              <td class="text-right"><span class="text-muted" title="Curate this word in scripts/build_facts_json.js, then re-run the generator">curate in generator</span></td>
            </tr>
          `;
        }).join('');
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
