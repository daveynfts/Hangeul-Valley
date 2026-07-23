const fs = require('fs');

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  console.log(`\n========================================`);
  console.log(`ANALYZING: ${filePath}`);
  console.log(`========================================\n`);

  // Find scenes in the file
  const sceneRegex = /class\s+([A-Za-z0-9_]+)\s+extends\s+(?:Phaser\.Scene|BaseScene)/g;
  let match;
  const scenes = [];
  while ((match = sceneRegex.exec(content)) !== null) {
    scenes.push({ name: match[1], index: match.index });
  }

  console.log('Detected Scenes:', scenes.map(s => s.name));

  // Extract content per scene
  for (let i = 0; i < scenes.length; i++) {
    const sceneName = scenes[i].name;
    const start = scenes[i].index;
    const end = (i + 1 < scenes.length) ? scenes[i + 1].index : content.length;
    const sceneCode = content.substring(start, end);

    console.log(`\n--- Scene: ${sceneName} ---`);

    // Check for Phaser text objects with emojis
    const textEmojiRegex = /add\.text\s*\(\s*[^,]+,\s*[^,]+,\s*['"`]([^'"`]*[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}][^'"`]*)['"`]/gu;
    let tMatch;
    const emojiTexts = [];
    while ((tMatch = textEmojiRegex.exec(sceneCode)) !== null) {
      emojiTexts.push(tMatch[1]);
    }

    if (emojiTexts.length > 0) {
      console.log(`[!] Found ${emojiTexts.length} Phaser text objects with emojis:`);
      emojiTexts.forEach(t => console.log(`   - "${t}"`));
    } else {
      console.log(`[✓] Zero Phaser text objects with emojis in ${sceneName}`);
    }

    // Search for entity creation patterns
    const spriteCalls = (sceneCode.match(/add\.sprite|add\.image/g) || []).length;
    console.log(`   Phaser sprite/image additions: ${spriteCalls}`);
  }
}

analyzeFile('game.js');
analyzeFile('assets/game.js');
