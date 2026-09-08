// HUD still-icons. Catalog rows (sprites/catalog.json) are the library record;
// this table is the runtime lookup. Magenta-keyed 16-bit farm glyphs, HTML overlay.
const HUD_ART_FOLDER = 'ui';
const HUD_ART_ROWS = [
  { id: 'vocab', slug: 'vocab_book', nameEn: 'Vocabulary book', fallback: '📖', label: 'Vocabulary' },
  { id: 'shop', slug: 'shop_stall', nameEn: 'Market stall', fallback: '🏪', label: 'Shop' },
  { id: 'bag', slug: 'harvest_basket', nameEn: 'Harvest basket', fallback: '🎒', label: 'Inventory' },
  { id: 'more', slug: 'more_acorns', nameEn: 'More menu', fallback: '⋯', label: 'More' },
  { id: 'menu', slug: 'menu_gate', nameEn: 'Farm gate', fallback: '☰', label: 'Menu' },
  { id: 'coin', slug: 'gold_coin', nameEn: 'Gold coin', fallback: '🪙' },
  { id: 'gem', slug: 'jade_gem', nameEn: 'Jade gem', fallback: '💎' },
  { id: 'honor', slug: 'honor_medal', nameEn: 'Honor medal', fallback: '🎖️' },
  { id: 'sprout', slug: 'rank_sprout', nameEn: 'Rank sprout', fallback: '🌱' },
  { id: 'quest', slug: 'quest_scroll', nameEn: 'Quest scroll', fallback: '📜', label: 'Quests' },
  { id: 'cook', slug: 'cooking_pot', nameEn: 'Cooking pot', fallback: '🍳', label: 'Cooking' },
  { id: 'recipe', slug: 'recipe_board', nameEn: 'Recipe board', fallback: '🍱', label: 'Recipes' },
  { id: 'audio', slug: 'wooden_bell', nameEn: 'Wooden bell', fallback: '🔊', label: 'Audio' },
  { id: 'save', slug: 'save_disk', nameEn: 'Save disk', fallback: '💾', label: 'Save' },
  { id: 'progress', slug: 'progress_sunflower', nameEn: 'Sunflower', fallback: '📊', label: 'Progress' },
  { id: 'ranks', slug: 'trophy_cup', nameEn: 'Trophy cup', fallback: '🏅', label: 'Ranks' },
  { id: 'fish', slug: 'koi_fish', nameEn: 'Koi fish', fallback: '🐟', label: 'Fish' },
  { id: 'trophy', slug: 'star_wreath', nameEn: 'Star wreath', fallback: '🏆', label: 'Trophies' }
];

function hudArtRow(id) {
  return HUD_ART_ROWS.find(function (r) { return r && r.id === id; }) || null;
}
function hudArtFile(id) {
  const row = hudArtRow(id);
  return row ? (HUD_ART_FOLDER + '/' + row.slug + '.png') : '';
}
function hudIconHtml(id, fallbackEmoji, px) {
  const file = hudArtFile(id);
  const size = px || 20;
  if (file && typeof artUrl === 'function') {
    return '<img class="hud-art-icon" src="' + artUrl(file) + '" width="' + size + '" height="' + size +
      '" alt="" style="image-rendering:pixelated;image-rendering:crisp-edges;vertical-align:middle;object-fit:contain">';
  }
  const row = hudArtRow(id);
  return fallbackEmoji || (row && row.fallback) || '';
}
// The text beside the icon on a ⋯ row.
//
// It has to be resolved here rather than left to applyI18n(). Both run on DOMContentLoaded
// and i18n.js is the earlier <script>, so applyI18n() translated these rows first and then
// paintHudIcons() replaced their innerHTML with the English `data-hud-label` — every row in
// the overflow menu read English under a Vietnamese interface, from boot, and again after
// every press of Save, which repaints the bar through this same function.
//
// The catalogue string leads with an emoji ("📜 Quests") from when the row was text only.
// The pixel icon has replaced it, so it is dropped; `data-hud-label` stays the fallback for
// a row with no key, and row.label for one with neither.
function hudIconLabel(el, row) {
  const key = el.getAttribute && el.getAttribute('data-i18n');
  if (key && typeof hvT === 'function') {
    const s = hvT(key);
    if (s && s !== key) {
      const trimmed = String(s).replace(/^[^\p{L}\p{N}]+/u, '').trim();
      if (trimmed) return trimmed;
    }
  }
  return el.getAttribute('data-hud-label') || (row && row.label) || '';
}
function paintHudIcons() {
  if (typeof document === 'undefined' || !document.querySelectorAll) return;
  HUD_ART_ROWS.forEach(function (row) {
    const els = document.querySelectorAll('[data-hud-icon="' + row.id + '"]');
    els.forEach(function (el) {
      const px = Number(el.getAttribute('data-hud-size')) || (el.classList && el.classList.contains('hud-overflow-item') ? 18 : 20);
      const icon = hudIconHtml(row.id, row.fallback, px);
      const isOverflow = el.classList && el.classList.contains('hud-overflow-item');
      // Whether the row carries a label at all is still decided by the markup; only the
      // words come from the catalogue. Nothing is written back onto the element, because
      // caching the resolved text would pin the row to whatever language painted it first.
      const label = (el.getAttribute('data-hud-label') || isOverflow) ? hudIconLabel(el, row) : '';
      if (label) {
        el.innerHTML = icon + '<span class="hud-overflow-label">' + label + '</span>';
      } else {
        el.innerHTML = icon;
      }
    });
  });
  if (typeof syncTTSButton === 'function') syncTTSButton();
  if (typeof updateQuestHudBadge === 'function') updateQuestHudBadge();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', paintHudIcons, { once: true });
  } else {
    paintHudIcons();
  }
}
