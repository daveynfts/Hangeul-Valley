'use strict';
// Import the completed chapter without replacing any existing chapter or shared code.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const source = process.argv[2];
if (!source || !fs.existsSync(path.join(source, 'worlds/2b-unit-16.json'))) throw new Error('Pass the completed content worktree');
const names = ['2b-unit-16', 'unit16-textbook', 'unit16-workbook', 'unit16-desk-quiz', 'unit16-cassette'];
for (const dir of ['worlds', 'locales/vi/worlds']) for (const name of names) {
  const rel = dir + '/' + name + '.json';
  if (!fs.existsSync(path.join(root, rel))) fs.copyFileSync(path.join(source, rel), path.join(root, rel));
}
for (const name of fs.readdirSync(path.join(source, 'audio/book')).filter(n => /^2b-u16-.*\.mp3$/.test(n))) {
  const rel = 'audio/book/' + name;
  if (!fs.existsSync(path.join(root, rel))) fs.copyFileSync(path.join(source, rel), path.join(root, rel));
}
const notes = 'docs/unit16-art-notes.md';
if (!fs.existsSync(path.join(root, notes))) fs.copyFileSync(path.join(source, notes), path.join(root, notes));
const queueFile = path.join(root, 'docs/unit-art-redesign.json');
const queue = JSON.parse(fs.readFileSync(queueFile, 'utf8'));
if (queue.entries.some(e => e.unit === 16)) throw new Error('Unit 16 already inventoried; progress preserved');
const world = JSON.parse(fs.readFileSync(path.join(root, 'worlds/2b-unit-16.json'), 'utf8'));
const scenes = fs.readFileSync(path.join(root, 'docs/unit16-scene-briefs.txt'), 'utf8').trim().split('\n');
if (scenes.length !== world.level.words.length) throw new Error('One scene brief required per word');
const style = 'Single production vocabulary sprite for Hangeul Valley. Premium cozy 16-bit pixel art, crisp deliberate square pixel clusters, warm natural colors, dark umber outlines, charming readable chibi people when needed. Simple isolated composition understandable at 192px height. Entire subject visible with generous margins. Genuinely transparent background, no painted checkerboard, no badges or decorative frames, no labels unless explicitly requested. Not a spritesheet. ';
const foods = new Set([12,13,14,15,16,22]);
world.level.words.forEach((word, i) => {
  const slug = 'unit16_' + String(i + 1).padStart(3, '0') + '_' + word.en.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60).replace(/_$/g, '');
  queue.entries.push({index: queue.entries.length, type: 'vocabulary', unit: 16, ko: word.ko, en: word.en,
    category: word.categoryEn, folder: foods.has(i) ? 'foods' : 'items', slug, cooking: false,
    status: 'pending', reviewed: false, brief: scenes[i].trim(),
    prompt: style + 'Korean headword: ' + word.ko + '. Meaning: ' + word.en + '. Scene: ' + scenes[i].trim()});
});
for (const [name, flat, round] of [['do',1,3],['gae',2,2],['geol',3,1],['yut',4,0],['mo',0,4]]) {
  const brief = `Exactly FOUR separate Korean yut wooden half-cylinder sticks laid parallel with clear gaps, in a slightly overhead view. Exactly ${flat} sticks with the FLAT cut face facing UP (broad pale flat rectangle, visible straight edges) and exactly ${round} sticks with the ROUNDED bark face UP (curved honey-brown ridge and shaded sides). All four same size and fully visible. No other objects, no text, no X marks, no numbers. Make flat and rounded faces unambiguous. This teaches the ${name} throw.`;
  queue.entries.push({index: queue.entries.length, type:'quiz',unit:16,ko:'',en:'Yut throw: '+name,
    folder:'quiz',slug:'unit16_yut_'+name,status:'pending',reviewed:false,brief,prompt:style+brief});
}
const vet = 'A friendly veterinarian wearing a white coat and stethoscope gently examines a calm orange cat on a low veterinary examination table. Clearly a veterinary visit, no human patient, no medicine being forced, no text.';
queue.entries.push({index:queue.entries.length,type:'quiz',unit:16,ko:'',en:'Taking a cat to the vet',folder:'quiz',slug:'unit16_cat_vet',status:'pending',reviewed:false,brief:vet,prompt:style+vet});
queue.worlds.push('2b-unit-16');
queue.status = 'in-progress';
fs.writeFileSync(queueFile, JSON.stringify(queue,null,2)+'\n');
fs.writeFileSync(path.join(root,'docs/unit16-art-prompts.json'),JSON.stringify(queue.entries.filter(e=>e.unit===16).map(({index,ko,en,slug,prompt})=>({index,ko,en,slug,prompt})),null,2)+'\n');
console.log('Imported Unit 16 and inventoried '+queue.entries.filter(e=>e.unit===16).length+' illustrations');
