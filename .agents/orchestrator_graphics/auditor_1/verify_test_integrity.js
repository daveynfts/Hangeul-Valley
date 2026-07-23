const fs = require('fs');

const testFiles = ['test_currency_save.js', 'test_gating_quests.js', 'test_r3_r4_systems.js'];

testFiles.forEach(tf => {
    console.log(`=== CHECKING TEST FILE: ${tf} ===`);
    const content = fs.readFileSync(tf, 'utf8');
    
    // Check if test file requires/imports game.js or reads game.js
    const readsGame = content.includes("readFileSync('game.js'") || content.includes("require(");
    const usesVm = content.includes('vm.runInNewContext') || content.includes('vm.Script') || content.includes('eval(');
    const hasAsserts = content.includes('console.assert') || content.includes('if (') || content.includes('throw');
    
    console.log(` - Reads game.js: ${readsGame}`);
    console.log(` - Uses VM/eval sandbox: ${usesVm}`);
    console.log(` - Has assertion / conditional checks: ${hasAsserts}`);
    
    // Check for suspicious hardcoded pass without assertions
    const lines = content.split('\n');
    let consolePassLines = 0;
    let assertCount = 0;
    lines.forEach(l => {
        if (l.includes('Passed') || l.includes('PASS')) consolePassLines++;
        if (l.includes('assert') || l.includes('if') || l.includes('===') || l.includes('!==')) assertCount++;
    });
    console.log(` - Console PASS lines: ${consolePassLines}, Conditional logic lines: ${assertCount}`);
});
