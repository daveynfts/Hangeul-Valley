// ══════════════ FISH DATABASE ═════════════════════════════════════════════════
const FISH_DB = [
  { ko:'연어', en:'Salmon', hint:'🍣', rarity:'Common', weight:'2.4 kg', rom:'yeon-eo' },
  { ko:'고등어', en:'Mackerel', hint:'🐟', rarity:'Common', weight:'1.1 kg', rom:'go-deung-eo' },
  { ko:'오징어', en:'Squid', hint:'🦑', rarity:'Rare', weight:'0.8 kg', rom:'o-jing-eo' },
  { ko:'잉어', en:'Carp', hint:'🎏', rarity:'Rare', weight:'3.2 kg', rom:'ing-eo' },
  { ko:'새우', en:'Shrimp', hint:'🦐', rarity:'Common', weight:'0.1 kg', rom:'sae-u' },
  { ko:'문어', en:'Octopus', hint:'🐙', rarity:'Epic', weight:'4.5 kg', rom:'mun-eo' },
  { ko:'조개', en:'Clam', hint:'🐚', rarity:'Common', weight:'0.2 kg', rom:'jo-gae' },
  { ko:'황금물고기', en:'Golden Fish', hint:'🌟', rarity:'Legendary', weight:'5.0 kg', rom:'hwang-geum-mul-go-gi' }
];
let appleTreeQuizPending = false; // true when harvesting apple tree (not a crop plot)

function _saveAppleTree(scene){
  appleTreeSave = { ripeAt: scene.appleRipeAt, ripe: scene.appleRipe };
  persistSave();
}

// ══════════════ CAT NPC DIALOG ════════════════════════════════════════════════
// Draw the ginger tabby cat portrait pixel-by-pixel onto the <canvas> element
function drawCatPortrait(){
  const canvas=document.getElementById('cat-portrait-canvas');
  if(!canvas) return;
  const ctx=canvas.getContext('2d');
  const S=6; // pixel scale (6px per dot)
  // yOff=2 → shifts entire sprite down by 2 rows so ears at row 0 aren't clipped
  const yOff=2;
  const p=(x,y,col)=>{ ctx.fillStyle=col; ctx.fillRect(x*S,(y+yOff)*S,S,S); };
  const GO='#F5813F', GD='#B84E10', GL='#FFBB66';
  const WH='#FFFFFF', EY='#FFCC44', PU='#1A0800';
  const PK='#FFAA99';
  const SH='#3A1800';

  ctx.clearRect(0,0,canvas.width,canvas.height);

  // === BODY (rows 8-15) ===
  [[1,8,10,8,GO],[2,9,8,6,GO]].forEach(([x,y,w,h,c])=>{for(let i=0;i<w;i++)for(let j=0;j<h;j++)p(x+i,y+j,c);});
  for(let j=9;j<16;j++) for(let i=3;i<9;i++) p(i,j,WH);
  [0,1].forEach(i=>{ for(let j=9;j<15;j++) p(i===0?1:10,j,GD); });
  [[3,14,GD],[3,11,GD],[8,14,GD],[8,11,GD]].forEach(([x,y,c])=>{ if(c)p(x,y,c); });
  for(let j=10;j<15;j+=2){ p(2,j,GD); p(9,j,GD); }

  // === FRONT PAWS (rows 14-15) ===
  [[2,14,2,2,WH],[8,14,2,2,WH]].forEach(([x,y,w,h,c])=>{ for(let i=0;i<w;i++)for(let j=0;j<h;j++)p(x+i,y+j,c); });
  p(2,15,PK); p(3,15,PK); p(8,15,PK); p(9,15,PK);

  // === HEAD (rows 2-7) ===
  for(let j=2;j<8;j++) for(let i=1;i<11;i++) p(i,j,GO);
  p(3,2,GD);p(4,2,GD); p(5,2,GO); p(6,2,GO); p(7,2,GD);p(8,2,GD);
  p(4,3,GD); p(6,3,GD); p(7,3,GD);
  for(let j=5;j<8;j++) for(let i=3;i<9;i++) p(i,j,WH);
  [[2,4,EY],[3,4,EY],[4,4,EY],[2,5,EY],[3,5,EY],[4,5,EY]].forEach(([x,y,c])=>p(x,y,c));
  [[7,4,EY],[8,4,EY],[9,4,EY],[7,5,EY],[8,5,EY],[9,5,EY]].forEach(([x,y,c])=>p(x,y,c));
  p(3,4,PU); p(8,4,PU);
  [2,3,4].forEach(x=>p(x,3,SH)); [7,8,9].forEach(x=>p(x,3,SH));
  p(5,6,PK); p(6,6,PK);
  p(1,6,GL); p(10,6,GL);

  // === EARS (row 0-2) — now visible thanks to yOff ===
  [[0,0,GO],[1,0,GO],[0,1,GO],[1,1,GO],[0,2,GD],[1,2,GD]].forEach(([x,y,c])=>p(x,y,c));
  p(0,1,PK);
  [[10,0,GO],[11,0,GO],[10,1,GO],[11,1,GO],[10,2,GD],[11,2,GD]].forEach(([x,y,c])=>p(x,y,c));
  p(11,1,PK);

  // === NECK ===
  for(let i=3;i<9;i++) p(i,8,WH);
}

function showCatDialog(){
  if(catDialogOpen) return;
  playChiptuneSFX('click');
  catDialogOpen=playerLocked=true;
  catSetWord(); // pick random word
  document.getElementById('cat-dialog').classList.add('visible');
  // Draw portrait after a tiny delay so canvas is visible
  setTimeout(drawCatPortrait, 30);
}
function closeCatDialog(){
  playChiptuneSFX('click');
  catDialogOpen=playerLocked=false;
  document.getElementById('cat-dialog').classList.remove('visible');
}
function catSetWord(){
  const allWords=getUnlockedWords();
  if(!allWords.length) return;
  const w=allWords[Math.floor(Math.random()*allWords.length)];
  document.getElementById('cat-emoji').textContent = w.hint||'📝';
  document.getElementById('cat-ko').textContent    = w.ko;
  document.getElementById('cat-en').textContent    = w.en;
  // Show the word's origin OR its pronunciation shape — whichever is richer
  const fact = getFunFact(w);
  // Alternate between origin and pronunciation for variety
  const useStructure = Math.random() < 0.5;
  const tipText = (useStructure ? fact.structure : fact.origin)
    || fact.origin || fact.structure || fact.hint || '야옹~ Memorize this word!';
  document.getElementById('cat-dialog-tip').textContent = tipText;
}
function catAnotherWord(){
  const ko=document.getElementById('cat-ko');
  ko.animate([{opacity:0,transform:'scale(.5)'},{opacity:1,transform:'scale(1)'}],{duration:250,easing:'ease-out'});
  catSetWord();
}
if (!IS_NODE && typeof document !== 'undefined') {
  const catDialog = document.getElementById('cat-dialog');
  if (catDialog) catDialog.addEventListener('keydown', e => e.stopPropagation());
}



const getCompleted  = ()=>{ try{return JSON.parse(localStorage.getItem('hv_done')||'[]')}catch{return[]} };
const markCompleted = i=>{ const c=getCompleted(); if(!c.includes(i)){c.push(i);localStorage.setItem('hv_done',JSON.stringify(c))} };

