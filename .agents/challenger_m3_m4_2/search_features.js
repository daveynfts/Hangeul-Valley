const fs = require('fs');
const js = fs.readFileSync('game.js', 'utf8');

console.log('=== SEARCHING LIGHTING / AMBIENT / DAY NIGHT ===');
const lines = js.split('\n');
lines.forEach((line, idx) => {
    if (line.match(/light|ambient|day|night|overlay|tint|shadow|sun|moon|cycle|clock/i)) {
        console.log(`L${idx + 1}: ${line.substring(0, 100)}`);
    }
});

console.log('\n=== SEARCHING NPC MICRO-ANIMATIONS ===');
lines.forEach((line, idx) => {
    if (line.match(/npc|idle|anim|breathe|wander|float|tween|bounce|micro/i)) {
        console.log(`L${idx + 1}: ${line.substring(0, 100)}`);
    }
});
