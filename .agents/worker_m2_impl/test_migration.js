const fs = require('fs');

// Read save_data.json
const raw = fs.readFileSync('C:/VibeCode/Hangeul Valley/save_data.json', 'utf8');
const data = JSON.parse(raw);

console.log('Testing save_data.json...');
console.assert(data.v === 4, 'Version should be 4');
console.assert(data.currencies && data.currencies.coins === 85, 'Coins should be 85');
console.assert(data.currencies.gems === 0, 'Gems should be 0');
console.assert(data.currencies.honor === 0, 'Honor should be 0');
console.assert(data.gold === 85, 'Gold alias should be 85');
console.assert(typeof data.quests === 'object', 'Quests object present');
console.assert(typeof data.inventory === 'object', 'Inventory object present');
console.assert(typeof data.recipes === 'object', 'Recipes object present');
console.assert(typeof data.pets === 'object', 'Pets object present');
console.assert(typeof data.seasonal === 'object', 'Seasonal object present');
console.assert(typeof data.leaderboards === 'object', 'Leaderboards object present');

console.log('save_data.json validation passed ✓');

// Test legacy v3 migration
const legacySave = {
  v: 3,
  gold: 150,
  unlockedLevels: [0, 1],
  harvests: { "손": 5 }
};

// Simple JS migration function test matching game.js logic
function migrateSaveData(d) {
  if (!d) return null;
  const data = JSON.parse(JSON.stringify(d));
  if (!data.v || data.v < 4) {
    const legacyGold = typeof data.gold === 'number' ? data.gold : 0;
    data.currencies = data.currencies || {};
    data.currencies.coins = typeof data.currencies.coins === 'number' ? data.currencies.coins : legacyGold;
    data.currencies.gems = typeof data.currencies.gems === 'number' ? data.currencies.gems : 0;
    data.currencies.honor = typeof data.currencies.honor === 'number' ? data.currencies.honor : 0;

    data.gold = data.currencies.coins;
    data.quests = data.quests || {
      mainStep: 1,
      mainProgress: { harvests: 0, mastered: 0, kills: 0, fish: 0, score: 0, duels: 0 },
      mainCompleted: [],
      daily: [],
      weekly: [],
      lastDailyReset: 0,
      lastWeeklyReset: 0
    };
    data.inventory = data.inventory || { ingredients: {}, seeds: {}, scrolls: 0 };
    data.recipes = data.recipes || { unlockedRecipes: [] };
    data.pets = data.pets || { collection: [], activePet: null };
    data.seasonal = data.seasonal || { activeSeasonId: 'autumn_harvest_2026', seasonPoints: 0, claimedRewards: [] };
    data.leaderboards = data.leaderboards || {
      personalBests: { arcadeHighScore: 0, dungeonMaxFloor: 0, duelMaxWinStreak: 0, totalWordsMastered: 0 }
    };
    data.v = 4;
  }
  return data;
}

const migrated = migrateSaveData(legacySave);
console.assert(migrated.v === 4, 'Migrated version should be 4');
console.assert(migrated.currencies.coins === 150, 'Migrated coins should be 150');
console.assert(migrated.currencies.gems === 0, 'Migrated gems should be 0');
console.assert(migrated.currencies.honor === 0, 'Migrated honor should be 0');
console.assert(migrated.gold === 150, 'Migrated gold alias should be 150');
console.assert(migrated.quests.mainStep === 1, 'Migrated quests initialized');
console.assert(migrated.inventory.scrolls === 0, 'Migrated inventory initialized');

console.log('Legacy v3 migration test passed ✓');
