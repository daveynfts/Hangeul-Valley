const { execSync } = require('child_process');

const diff = execSync('git diff game.js', { encoding: 'utf8' });

const terms = ['farmer', 'cat', 'wizard', 'wiz', 'shadow', 'DynamicShadowSystem'];

console.log('=== CHECKING GIT DIFF FOR UNTOUCHED ENTITIES ===');

terms.forEach(term => {
    const reg = new RegExp(`[+-].*${term}`, 'gi');
    const matches = diff.match(reg) || [];
    console.log(`Term '${term}': ${matches.length} diff lines found`);
    matches.forEach(m => console.log('  ', m));
});

