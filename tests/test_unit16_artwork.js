'use strict';
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname,'..');
const read = rel => JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const world = read('worlds/2b-unit-16.json');
const quiz = read('worlds/unit16-desk-quiz.json');
const queue = read('docs/unit-art-redesign.json').entries.filter(e=>e.unit===16);
assert.equal(world.level.words.length,133);
assert.deepEqual(world.level.map.stations,['desk','cassette']);
assert.equal(quiz.questions.length,13);
assert.equal(quiz.questions.map(q=>q.a).join(''),'CBACBDABCD BAD'.replace(/ /g,''));
const {validateQuiz} = require('../admin/lib/world');
const normalized = validateQuiz(quiz);
for(const unsafe of ['../outside.png','https://example.com/art.png','items/../bad.png']){
  const bad=structuredClone(quiz);bad.questions[0].art=unsafe;assert.throws(()=>validateQuiz(bad),/local sprite/);
}
quiz.questions.forEach((q,i)=>{
  assert.ok(q.choices[q.a]);
  if(q.art){assert.ok(fs.existsSync(path.join(root,'sprites',q.art)));assert.equal(normalized.questions[i].art,q.art,'admin retains quiz art');}
});
const {validateWorkbook} = require('../admin/lib/workbook');
for(const [kind,count] of [['textbook',14],['workbook',15]]){
  const bank=read('worlds/unit16-'+kind+'.json');
  assert.equal(bank.exercises.length,count);
  const roundtrip=validateWorkbook(bank);
  bank.exercises.forEach((ex,i)=>{
    if(ex.visualGuide){
      assert.deepEqual(roundtrip.exercises[i].visualGuide,ex.visualGuide,'admin retains picture references');
      ex.visualGuide.forEach(p=>assert.ok(fs.existsSync(path.join(root,'sprites',p.art))));
    }
  });
  bank.exercises.forEach((ex,i)=>ex.items.forEach((item,j)=>{
    assert.equal(roundtrip.exercises[i].items[j].answer,item.answer,'answer preserved');
    if(item.art){assert.ok(fs.existsSync(path.join(root,'sprites',item.art)));assert.equal(roundtrip.exercises[i].items[j].art,item.art,'admin retains workbook art');}
    (item.choices||[]).forEach((c,k)=>{
      if(c.art){assert.ok(fs.existsSync(path.join(root,'sprites',c.art)));assert.equal(roundtrip.exercises[i].items[j].choices[k].art,c.art,'admin retains choice art');}
    });
  }));
}
const textbook=read('worlds/unit16-textbook.json');
const yut=textbook.exercises.find(e=>e.id==='u16sgk-task-1');
assert.equal(yut.visualGuide.length,5);
assert.deepEqual(yut.visualGuide.map(p=>p.ko),['도 · 1칸','개 · 2칸','걸 · 3칸','윷 · 4칸','모 · 5칸']);
assert.equal(textbook.exercises.find(e=>e.id==='u16sgk-vocab-1').visualGuide.length,11);
assert.equal(textbook.exercises.find(e=>e.id==='u16sgk-listen-2').items[1].choices.filter(c=>c.art).length,3);
for(const where of ['choice','guide']){
  const bad=structuredClone(textbook);
  if(where==='choice')bad.exercises[0].items[0].choices[0].art='../outside.png';
  else bad.exercises[0].visualGuide[0].art='https://example.com/a.png';
  assert.throws(()=>validateWorkbook(bad),/local sprite/);
}
const ctx=vm.createContext({});
for(const rel of ['js/vocabArt.js','js/vocabArtUnits.js'])vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),ctx);
vm.runInContext("function currentLesson(){return {worldId:'2b-unit-16'}}",ctx);
const active=queue.filter(e=>e.type==='vocabulary'&&e.status==='shipped'&&e.reviewed);
assert.equal(active.length,133,'every Unit 16 word has reviewed runtime art');
assert.equal(queue.filter(e=>e.status==='shipped'&&e.reviewed).length,139);
assert.equal(new Set(active.map(e=>e.file)).size,active.length,'one distinct export per illustrated word');
for(const e of active){
  assert.equal(vm.runInContext('vocabArtFile('+JSON.stringify(e.ko)+')',ctx),e.folder+'/'+e.slug+'.png');
  const bytes=fs.readFileSync(path.join(root,e.file));assert.equal(bytes.readUInt32BE(20),192);
}
const {CONTENT}=require('../admin/lib/content');
for(const stem of ['2b-unit-16','unit16-textbook','unit16-workbook','unit16-desk-quiz','unit16-cassette'])assert.ok(CONTENT.some(c=>c.rel.replace(/\\/g,'/')==='worlds/'+stem+'.json'));
const cassette=read('worlds/unit16-cassette.json');
assert.equal(cassette.tracks.length,10);
function checkAudio(node){if(!node||typeof node!=='object')return;for(const [k,v]of Object.entries(node)){if(k==='src'&&typeof v==='string'&&v.endsWith('.mp3'))assert.ok(fs.existsSync(path.join(root,v)),v);else if(typeof v==='object')checkAudio(v);}}
checkAudio(cassette);checkAudio(read('worlds/unit16-workbook.json'));checkAudio(read('worlds/unit16-textbook.json'));
console.log('Unit 16: chapter banks, answer keys, admin round-trip, audio and '+active.length+' reviewed images passed');
