const fs = require('fs');
const content = fs.readFileSync('C:/VibeCode/Hangeul Valley/game.js', 'utf8');

// Find references to fish textures in game.js
const fishingSceneStart = content.indexOf('class FishingScene');
const fishingSceneEnd = content.indexOf('class ', fishingSceneStart + 10);
const fishingSceneCode = content.substring(fishingSceneStart, fishingSceneEnd > -1 ? fishingSceneEnd : content.length);

console.log('--- Key references in FishingScene ---');
const regex = /['"](fish_[a-z0-9_]+|fishing_[a-z0-9_]+|dock_[a-z0-9_]+|carp|salmon|tuna|squid|eel|goldfish|seabass|shrimp|octopus|catfish|mackerel|legendary|clam)['"]/g;
let match;
const foundKeys = new Set();
while ((match = regex.exec(content)) !== null) {
  foundKeys.add(match[1]);
}
console.log('Found keys in codebase:', Array.from(foundKeys));
