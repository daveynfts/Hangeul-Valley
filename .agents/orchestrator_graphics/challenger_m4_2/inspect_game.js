const fs = require('fs');

const code = fs.readFileSync('game.js', 'utf8');
const lines = code.split('\n');

console.log('Total lines in game.js:', lines.length);

// 1. Find classes
const classes = lines.filter(l => l.trim().startsWith('class '));
console.log('\n--- Classes Found ---');
classes.forEach(c => console.log(c.trim()));

// 2. Find event listener additions
console.log('\n--- addEventListener Occurrences ---');
lines.forEach((l, idx) => {
  if (l.includes('addEventListener')) {
    console.log(`L${idx + 1}: ${l.trim()}`);
  }
});

// 3. Find removeEventListener Occurrences
console.log('\n--- removeEventListener Occurrences ---');
lines.forEach((l, idx) => {
  if (l.includes('removeEventListener')) {
    console.log(`L${idx + 1}: ${l.trim()}`);
  }
});

// 4. Find Phaser event emitter sub/unsub (events.on, events.off)
console.log('\n--- Event Emitter .on / .off / .once ---');
let onCount = 0, offCount = 0;
lines.forEach((l, idx) => {
  if (/\.events\.on\(|\.emitter\.on\(|\.on\(/.test(l)) onCount++;
  if (/\.events\.off\(|\.emitter\.off\(|\.off\(/.test(l)) offCount++;
});
console.log(`Total .on(): ${onCount}, Total .off(): ${offCount}`);

// 5. Camera references & setBounds
console.log('\n--- Camera Bounds & Camera Ops ---');
lines.forEach((l, idx) => {
  if (l.includes('setBounds') || l.includes('cameras.main') || l.includes('pan(') || l.includes('zoomTo')) {
    console.log(`L${idx + 1}: ${l.trim().substring(0, 100)}`);
  }
});

// 6. setInterval / setTimeout
console.log('\n--- Timers (setInterval / setTimeout) ---');
lines.forEach((l, idx) => {
  if (l.includes('setInterval') || l.includes('setTimeout')) {
    console.log(`L${idx + 1}: ${l.trim()}`);
  }
});
