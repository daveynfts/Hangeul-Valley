'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const [indexText, source] = process.argv.slice(2);
if (!/^\d+$/.test(indexText || '') || !source || !/^exec-[a-f0-9-]+\.png$/.test(path.basename(source))) throw new Error('Expected inventory index and generated source PNG');
const file = path.join(root, 'docs/unit-art-redesign.json');
const queue = JSON.parse(fs.readFileSync(file, 'utf8'));
const entry = queue.entries.find(e => e.index === Number(indexText));
if (!entry) throw new Error('Unknown inventory entry');
if (entry.generatorSource && entry.generatorSource !== source) {
  entry.supersededSources = (entry.supersededSources || []).concat({
    generatorSource: entry.generatorSource, sourceHash: entry.sourceHash
  });
}
const target = path.join(root, 'docs/unit-art-sources', entry.slug + '.png');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.copyFileSync(source, target);
entry.source = path.relative(root, target).replace(/\\/g, '/');
entry.generatorSource = source;
entry.sourceHash = crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
entry.status = 'generated';
entry.reviewed = false;
fs.writeFileSync(file, JSON.stringify(queue, null, 2) + '\n');
console.log(entry.index + ' ' + entry.slug + ' saved');
