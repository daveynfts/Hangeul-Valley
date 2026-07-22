const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('game.js', 'utf8');

// Extract all IDs from HTML
const htmlIds = new Set();
const idRegex = /id=["']([^"']+)["']/g;
let match;
while ((match = idRegex.exec(html)) !== null) {
    htmlIds.add(match[1]);
}

// Extract script tags from HTML
const scriptTags = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
console.log('=== SCRIPT TAGS IN index.html ===');
scriptTags.forEach(st => console.log(st));

// Extract getElementById calls from JS
const getElemCalls = new Set();
const getElemRegex = /document\.getElementById\s*\(\s*["']([^"']+)["']\s*\)/g;
while ((match = getElemRegex.exec(js)) !== null) {
    getElemCalls.add(match[1]);
}

// Extract querySelector with # from JS
const querySelectorCalls = new Set();
const qsRegex = /querySelector\s*\(\s*["']#([a-zA-Z0-9_\-]+)["']/g;
while ((match = qsRegex.exec(js)) !== null) {
    querySelectorCalls.add(match[1]);
}

// Extract querySelectorAll with # from JS
const qsAllRegex = /querySelectorAll\s*\(\s*["']#([a-zA-Z0-9_\-]+)["']/g;
while ((match = qsAllRegex.exec(js)) !== null) {
    querySelectorCalls.add(match[1]);
}

console.log('\n=== TOTAL HTML IDs ===', htmlIds.size);
console.log('=== JS LOOKED UP IDs (getElementById) ===', getElemCalls.size);
console.log('=== JS LOOKED UP IDs (querySelector) ===', querySelectorCalls.size);

const missingInHtml = [];
for (const id of getElemCalls) {
    if (!htmlIds.has(id)) {
        missingInHtml.push(id);
    }
}

console.log('\n=== JS getElementById MISSING IN index.html ===');
console.log(missingInHtml);

const missingQsInHtml = [];
for (const id of querySelectorCalls) {
    if (!htmlIds.has(id)) {
        missingQsInHtml.push(id);
    }
}

console.log('\n=== JS querySelector MISSING IN index.html ===');
console.log(missingQsInHtml);
