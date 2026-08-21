// Trophy still-icons. Catalog rows are the library record; this table is the runtime lookup.
const TROPHY_ART_FOLDER = 'ui';
const TROPHY_ART_ROWS = [
  { id: 'bronze_apple', slug: 'trophy_bronze_apple', nameEn: 'Bronze apple plaque', fallback: '🥉' },
  { id: 'silver_spade', slug: 'trophy_silver_spade', nameEn: 'Silver spade plaque', fallback: '🥈' },
  { id: 'gold_tractor', slug: 'trophy_gold_tractor', nameEn: 'Gold tractor plaque', fallback: '🥇' },
  { id: 'diamond_crown', slug: 'trophy_diamond_crown', nameEn: 'Jeweled crown plaque', fallback: '💎' },
  { id: 'master_scholar', slug: 'trophy_legend_crown', nameEn: 'Legend crown plaque', fallback: '👑' },
  { id: 'master_chef', slug: 'trophy_master_chef', nameEn: 'Chef pot plaque', fallback: '👨‍🍳' }
];

function trophyArtRow(id) {
  return TROPHY_ART_ROWS.find(function (r) { return r && r.id === id; }) || null;
}
function trophyArtFile(id) {
  const row = trophyArtRow(id);
  return row ? (TROPHY_ART_FOLDER + '/' + row.slug + '.png') : '';
}
function trophyIconHtml(id, fallbackEmoji, px) {
  const file = trophyArtFile(id);
  const size = px || 48;
  if (file && typeof artUrl === 'function') {
    return '<img class="trophy-art-icon" src="' + artUrl(file) + '" width="' + size + '" height="' + size +
      '" alt="" style="image-rendering:pixelated;image-rendering:crisp-edges;vertical-align:middle;object-fit:contain">';
  }
  const row = trophyArtRow(id);
  return fallbackEmoji || (row && row.fallback) || '';
}
function crateIconHtml(px) {
  const size = px || 28;
  if (typeof artUrl === 'function') {
    return '<img class="inv-art-icon" src="' + artUrl('furniture/wooden_crate.png') + '" width="' + size + '" height="' + size +
      '" alt="" style="image-rendering:pixelated;image-rendering:crisp-edges;object-fit:contain">';
  }
  return '';
}

if (typeof window !== 'undefined') {
  window.trophyIconHtml = trophyIconHtml;
  window.crateIconHtml = crateIconHtml;
  window.TROPHY_ART_ROWS = TROPHY_ART_ROWS;
}
