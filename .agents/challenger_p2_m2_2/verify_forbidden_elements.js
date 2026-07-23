const { execSync } = require('child_process');

console.log('Running git diff check for forbidden elements...');
const diff = execSync('git diff HEAD game.js', { encoding: 'utf8', cwd: 'C:\\VibeCode\\Hangeul Valley' });

const forbiddenKeywords = [
  'farmer',
  'Farmer',
  'ginger_cat',
  'Ginger Cat',
  'wizard_merlin',
  'Wizard Merlin',
  'gwiz',
  'DynamicShadowSystem'
];

const lines = diff.split('\n');
const offendingLines = [];

lines.forEach((line, idx) => {
  if (line.startsWith('+') || line.startsWith('-')) {
    // Ignore pure file header lines like +++ or ---
    if (line.startsWith('+++') || line.startsWith('---')) return;
    
    forbiddenKeywords.forEach(kw => {
      if (line.includes(kw)) {
        offendingLines.push({ lineNumberInDiff: idx + 1, line, keyword: kw });
      }
    });
  }
});

console.log('Offending diff lines found:', offendingLines.length);
if (offendingLines.length > 0) {
  console.log('FAILED: Forbidden elements modified in git diff:');
  console.log(offendingLines);
} else {
  console.log('PASSED: Forbidden elements have ZERO modifications in git diff.');
}
