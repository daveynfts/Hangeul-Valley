const fs = require('fs');

const gameJsPath = 'C:\\VibeCode\\Hangeul Valley\\game.js';
const content = fs.readFileSync(gameJsPath, 'utf8');
const lines = content.split('\n');

// 1. HUD & Action Buttons ID List
const hudIds = [
  'hud', 'event-banner', 'progress-bar-wrap', 'hud-level-name', 'hud-level', 'hud-progress',
  'coins-val', 'gems-val', 'honor-val', 'active-buffs', 'active-buff-bar', 'progress-bar-fill',
  'eb-icon', 'eb-title', 'eb-desc', 'eb-pts-val', 'save-btn',
  'btn-cook', 'btn-pets', 'btn-event', 'btn-ranks', 'btn-quests', 'btn-save', 'btn-duel',
  'btn-fish', 'btn-trophies', 'btn-shop', 'btn-vocab', 'btn-menu', 'hud-menu-btn', 'vocab-btn', 'replay-btn', 'menu-btn'
];

console.log('=== 1. SEARCHING FOR REFERENCES TO TOP HUD & ACTION BUTTON IDs ===');

hudIds.forEach(id => {
  const matches = [];
  lines.forEach((line, idx) => {
    if (line.includes(id)) {
      matches.push({ lineNo: idx + 1, code: line.trim() });
    }
  });
  console.log(`\n--- ID: "${id}" (${matches.length} lines found) ---`);
  matches.forEach(m => console.log(`  Line ${m.lineNo}: ${m.code}`));
});

console.log('\n=== 2. DOM NAVIGATION / PARENT-CHILD / ORDERING RELIANCE IN GAME.JS ===');
const domNavTerms = ['parentElement', 'parentNode', 'children', 'childNodes', 'firstChild', 'firstElementChild', 'lastChild', 'lastElementChild', 'nextSibling', 'nextElementSibling', 'previousSibling', 'previousElementSibling', 'closest', 'querySelector'];
lines.forEach((line, idx) => {
  domNavTerms.forEach(term => {
    if (line.includes(term)) {
      console.log(`  Line ${idx + 1} [${term}]: ${line.trim()}`);
    }
  });
});

console.log('\n=== 3. EVENT LISTENERS ON HUD / WINDOW / BUTTONS IN GAME.JS ===');
lines.forEach((line, idx) => {
  if (line.includes('addEventListener') || line.includes('onclick')) {
    console.log(`  Line ${idx + 1}: ${line.trim()}`);
  }
});
