const fs = require('fs');

function inspectSpriteSystem(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  console.log(`\n========================================`);
  console.log(`INSPECTING SPRITE SYSTEM IN: ${filePath}`);
  console.log(`========================================\n`);

  // Search for SpriteGenerator definition
  const sgIndex = code.indexOf('SpriteGenerator');
  if (sgIndex !== -1) {
    console.log(`Found 'SpriteGenerator' reference at index ${sgIndex}`);
    // Print snippet around SpriteGenerator
    const snippet = code.substring(Math.max(0, sgIndex - 100), Math.min(code.length, sgIndex + 1500));
    console.log(`Snippet:\n${snippet.substring(0, 800)}...\n`);
  } else {
    console.log(`'SpriteGenerator' NOT found directly by name.`);
  }

  // Search for 48x48 pixel art / canvas baking references
  const matches48 = code.match(/48\s*\*\s*PS|48\s*,\s*48|48x48/g) || [];
  console.log(`48x48 related matches count: ${matches48.length}`);

  // Search for entity creation in each scene
  const entityKeywords = ['player', 'crop', 'cat', 'npc', 'fish', 'boss', 'monster', 'alien', 'pet'];
  entityKeywords.forEach(kw => {
    const re = new RegExp(`(\\b${kw}\\b[^\\n]{0,80})`, 'gi');
    const matches = (code.match(re) || []).slice(0, 3);
    console.log(`Keyword '${kw}' sample usages:`, matches);
  });
}

inspectSpriteSystem('game.js');
inspectSpriteSystem('assets/game.js');
