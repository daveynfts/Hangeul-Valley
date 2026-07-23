const fs = require('fs');

const gameJsPath = 'C:\\VibeCode\\Hangeul Valley\\game.js';
const code = fs.readFileSync(gameJsPath, 'utf8');

console.log('=== FORENSIC CODE INTEGRITY & PRESERVED ELEMENT AUDIT (REFINED) ===');

// Check 1: Preserved Elements
const hasFarmerAnims = code.includes('walk-down') && code.includes('walk-up') && code.includes('walk-left') && code.includes('walk-right');
const hasCatAnims = code.includes('cat_sleep') || code.includes('cat_walk');
const hasWizardAnims = code.includes('wizard_idle') || code.includes('wizard');
const hasDynamicShadowSystem = code.includes('class DynamicShadowSystem') || code.includes('DynamicShadowSystem');

console.log('Preserved Elements Check:');
console.log(`- Farmer animations present: ${hasFarmerAnims}`);
console.log(`- Cat NPC animations present: ${hasCatAnims}`);
console.log(`- Wizard Merlin NPC present: ${hasWizardAnims}`);
console.log(`- DynamicShadowSystem present: ${hasDynamicShadowSystem}`);

// Check 2: Hardcoded cheat codes or backdoor patterns
const suspiciousTerms = [
  'cheat', 'godmode', 'god_mode', 'instant_win', 'skip_level',
  'test_pass', 'mock_result', 'fake_pass', 'bypass'
];
console.log('\nScanning for suspicious terms / cheat codes / hardcoded test results...');
let foundSuspicious = [];
for (const term of suspiciousTerms) {
  const matches = code.match(new RegExp(term, 'gi'));
  if (matches) {
    foundSuspicious.push({ term, count: matches.length });
  }
}
console.log(`Suspicious terms found: ${foundSuspicious.length}`);
if (foundSuspicious.length > 0) {
  console.log(foundSuspicious);
}

// Check 3: 'K' outline color entries in code
const kMatches = [];
const kRegex = /['"]K['"]\s*:\s*(0x[0-9a-fA-F]+)/g;
let kMatch;
while ((kMatch = kRegex.exec(code)) !== null) {
  kMatches.push(kMatch[1]);
}
const invalidKInCode = kMatches.filter(val => val.toUpperCase() !== '0X0F172A');
console.log(`\n'K' outline color entries in code: ${kMatches.length}`);
console.log(`Non-0x0F172A 'K' entries: ${invalidKInCode.length}`);
if (invalidKInCode.length > 0) {
  console.log('Invalid K entries:', invalidKInCode);
}

// Check 4: Multi-character tokens in PixelArtRenderer
const rendererStart = code.indexOf('class PixelArtRenderer');
const rendererEnd = code.indexOf('class DynamicShadowSystem');
const rendererCode = code.substring(rendererStart, rendererEnd);

const tokenKeyRegex = /['"]([a-zA-Z0-9_-]{2,})['"]\s*:\s*0x[0-9a-fA-F]+/g;
let multiCharTokensInCode = [];
let match;
while ((match = tokenKeyRegex.exec(rendererCode)) !== null) {
  multiCharTokensInCode.push(match[0]);
}
console.log(`\nMulti-character color token keys in PixelArtRenderer: ${multiCharTokensInCode.length}`);
if (multiCharTokensInCode.length > 0) {
  console.log(multiCharTokensInCode);
}
