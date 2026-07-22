/**
 * Hangeul Valley – Thematic Economy Edition
 * ─────────────────────────────────────────────────────────────
 * Vòng lặp gây nghiện:
 *  Trồng từ → Cây chín → Thu hoạch → Vàng → Mua gói Level mới
 * Người chơi TỰ chọn lộ trình học, không bị ép tự động lên level.
 */

// ═══════════════ GLOBAL STATE ════════════════════════════════════════════════
let levelsData = [];
let sceneRef = null;
let currentLevelIndex = 0;
let progress = 0;

// ═══════════════ PIXEL ENGINE ════════════════════════════════════════════════
const PS = 3;
const K = {
  '.':null,
  'G':0x5DA832,'g':0x4A9225,'H':0x77CC44,'d':0x3A7015,
  'A':0x9A6538,'a':0x7A480A,'B':0xC48E58,
  'W':0x5C3010,'w':0x3E1C08,'J':0xFFFFFF,
  'O':0xB87838,'o':0xD8A860,'U':0x885018,
  'L':0x4AC83A,'l':0x32A820,'M':0x227A12,'m':0x1A5C08,
  'K':0x886030,'k':0x604018,'s':0xA88048,
  'X':0xF9D09B,'x':0xD8A070,'N':0x2A1A0A,'I':0xFFB3B3,
  'T':0xB87838,'t':0xD8A060,'V':0x7A4E18,
  'Z':0x5B8DD9,'z':0x3A6BA8,
  'Q':0x3D5A80,'q':0x2D4A70,
  'R':0x6B3A18,'r':0x4A2810,'S':0x8B5A38,
  'P':0x3AA828,'p':0x228018,'v':0x5EC83A,
  'C':0xAEAA9E,'c':0x8C8880,'b':0xC8C4BA,
};
function drawS(g, rows, ox=0, oy=0) {
  rows.forEach((row, ry) => {
    for(let rx=0; rx<row.length; rx++) {
      const col=K[row[rx]]; if(col==null) continue;
      g.fillStyle(col,1); g.fillRect((ox+rx)*PS,(oy+ry)*PS,PS,PS);
    }
  });
}
function pR(g,x,y,w,h,col,a=1){g.fillStyle(col,a);g.fillRect(x*PS,y*PS,w*PS,h*PS);}

// ═══════════════ SPRITE DATA ══════════════════════════════════════════════════
const GRASS=[
 ['HGGHGGHHGGHGHHHG','GGGGGGGGGGGGGGGG','GGgGGGGGGGgGGGGG','GGGGGGGGGGGGGGGG',
  'GGGGGHGGGGGGGGGG','GgGGGGGGGGGGGGGg','GGGGGGGGGGGGGGGG','GGGGGGGGgGGGGGgG',
  'GGGGGGGGGGGGGGGG','GgGGGGGGGGGGGGGG','GGGGGgGGGGGGGGGG','GGGGGGGGGGGGGGGG',
  'GGGGGGGGGGgGGGGG','GGGGGGGGGGGGGGGG','gggggggggggggggg','gggggggggggggggg'],
 ['HGGHGGHHGGHGHHHG','GGGGGGGGGGGGGGGG','GGgGGGGGGGgGGGGG','GGGGGGJJJGGGGGGG',
  'GGGGGJdAJGGGGGGG','GgGGGGJJJGGGGGGg','GGGGGGGpGGGGGGGG','GGGGGGGpGGGGgGGG',
  'GGGGGGGGGGGGGGGG','GgGGGGGGGGGGGGGG','GGGGGgGGGGGGGGGG','GGGGGGGGGGGGGGGG',
  'GGGGGGGGGGgGGGGG','GGGGGGGGGGGGGGGG','gggggggggggggggg','gggggggggggggggg'],
 ['HGGHGGHHGGHGHHHG','GGGGGGGGGGGGGGGG','GGgGGGGGGGgGGGGG','GGGGGGGGGGGGGGGG',
  'GGGGGHGGGGGGGGGG','GgGGGGGGGGGGGGGg','GGGGGGGGGGGbbbGG','GGGGGGGGGGGCCCGG',
  'GGGGGGGGGGGcccGG','GgGGGGGGGGGGGGGG','GGGGGgGGGGGGGGGG','GGGGGGGGGGGGGGGG',
  'GGGGGGGGGGgGGGGG','GGGGGGGGGGGGGGGG','gggggggggggggggg','gggggggggggggggg'],
 ['HGGHGGHHGGHGHHHG','GGGGGGGGGGGGGGGG','GGgGGGGGGGgGGGGG','GGGGGGpdGGGGGGGG',
  'GGGGGGpGGGGGGGGG','GgGGGpdpGGGGGGGg','GGGGGGpGpGGGGGGG','GGGGGdGGGGGGgGGG',
  'GGGGGGGGGGGGGGGG','GgGGGGGGGGGGGGGG','GGGGGGGGGGGpdGGG','GGGGGGGGGGGpGGGG',
  'GGGGGGGGGGgGGGGG','GGGGGGGGGGGGGGGG','gggggggggggggggg','gggggggggggggggg'],
];
const DIRT_DRY=['BAAAaAaAAAaAAaAAaB','BAaAAAAAAAAAAAaAB','BAAAAaAAAAAAAAaAB',
 'BaaaaaaaaaaaaaAAB','BAAAAAAAAAAAAaAaB','BaAAAaAAAAAAAAAaB',
 'BAAAAAAAAAAAAAAAB','BAAAAAaAAAAAaAAAAB','BaAAAAAAAAAAAAAaB',
 'BAAAAAAaAAAAAAAAB','BAaAAAAAAAAAAAAAaB','BaaaaaaaaaaaaaAAB',
 'BAAAAaAAAAAAAAaAAB','BAaAAAAAaAAAAAaAB','BAAAAAAAAAAAAAAAB','bBBBBBBBBBBBBBBBb',];
const DIRT_WET=['WWwWWWWWWWWWWWwwW','WwWWWWJWWWWWWwWwW','WWWWWWWWWWWWWwWWW',
 'WwWWWWWWWWWWWWwWW','wwwwwwwwwwwwwwwww','WWWWWwwWWWWWWWWWW',
 'WWWwWWWWWwWWWWWWW','WwWWWWWWWWWWWWwWW','WWWWWWwWWWWWWWWWW',
 'WwWWWWWWWWJWWWwWW','WWWWWWWWWWwWWWWWW','WWwWWWWwWWWWWWWWW',
 'WwWWWWWWWWWWWWwWW','WWWWWWWWWWWWWwWWW','wwwwwwwwwwwwwwwww','wwwwwwwwwwwwwwwww',];

// ═══════════════ GAME CONSTANTS ═══════════════════════════════════════════════
const TILE=48, PLAYER_SPD=210, PLOT_SIZE=48, PLOT_COLS=3, PLOT_GAP=18;
const CROP_ICONS=['🌸','🥬','🍓','🌽','🌻'];

// Gold reward: smooth diminishing returns (see advancePlot harvest logic)
// Curve: 10 → 8 → 7 → 6 → 5 → 4 → 4 → 3 → 3 → 3... (min 3)
const LEVEL_COST = (idx) => idx === 0 ? 0 : Math.floor(50 * Math.pow(1.8, idx - 1));
// Level 2: 50, Level 3: 90, Level 4: 162, Level 5: 292, Level 6: 525

// SRS Intervals (change to 86400000/259200000 for real-day SRS)
const SR1 = 30*1000;   // P1 seedling → P2 wilt:  30 giây
const SR2 = 90*1000;   // P2 sprout   → P3 ripe:  90 giây
// Plot sState codes: ''=empty '1'=seedling '2'=wilting '3'=sprout '4'=ripe
let srsData  = {}; // { ko: { p2At, p3At, harvests } }
let plotSave = []; // [{ i, ko, sState, plantedAt }]

// ── Unified File-Based Save (pywebview API → file, localStorage as backup) ─────
let fishAlbumSave = {}; // { ko: count }

// Collect ALL game state into ONE object
function collectSave(){
  const hcObj={}; harvestCounts.forEach((v,k)=>hcObj[k]=v);
  const plots = sceneRef?.plots.filter(p=>p.ko)
    .map(p=>({i:p.index, ko:p.ko, sState:p.sState, plantedAt:p.plantedAt||0})) || plotSave;
  const apple = sceneRef ? { ripeAt: sceneRef.appleRipeAt, ripe: sceneRef.appleRipe } : appleTreeSave;
  return { v:3, gold, unlockedLevels, unlockedTrophies, harvests:hcObj, srs:srsData, plots, lastLevel:currentLevelIndex, apple, fishAlbum:fishAlbumSave };
}
// Apply a save snapshot to the in-memory state
function applySave(d){
  if(!d||(d.v!==2 && d.v!==3)) return false;
  gold = d.gold||0;
  unlockedLevels = Array.isArray(d.unlockedLevels)?d.unlockedLevels:[0];
  unlockedTrophies = Array.isArray(d.unlockedTrophies)?d.unlockedTrophies:[];
  if(d.harvests) Object.entries(d.harvests).forEach(([k,v])=>harvestCounts.set(k,v));
  if(d.srs) srsData = d.srs;
  if(d.plots) plotSave = d.plots;
  if(typeof d.lastLevel==='number') currentLevelIndex = d.lastLevel;
  if(d.apple) appleTreeSave = d.apple;
  if(d.fishAlbum) fishAlbumSave = d.fishAlbum;
  return true;
}
// Write to file (pywebview) AND localStorage backup
async function persistSave(){
  const data = collectSave();
  // localStorage backup (always works)
  try{ localStorage.setItem('hv_save_v2', JSON.stringify(data)); }catch{}
  // File save via pywebview API (reliable across sessions)
  if(window.pywebview?.api){
    try{ await window.pywebview.api.save(data); }catch(e){ console.warn('File save failed:',e); }
  }
}
// Read from file first, then localStorage backup
async function loadSave(){
  // Try file first
  if(window.pywebview?.api){
    try{
      const d = await window.pywebview.api.load();
      if(d && applySave(d)){ console.log('[Save] Loaded from file ✓'); return; }
    }catch(e){ console.warn('File load failed:',e); }
  }
  // localStorage fallback
  try{
    const s = localStorage.getItem('hv_save_v2');
    if(s && applySave(JSON.parse(s))){ console.log('[Save] Loaded from localStorage ✓'); return; }
  }catch{}
  console.log('[Save] No save found – fresh start.');
}

// Legacy aliases (used throughout code – now delegate to persistSave)
function saveSRS()   { persistSave(); }
function savePlotsFn() { persistSave(); }
function saveEconomy() { persistSave(); }
function loadSRS()   {} // no-op (loading is done once at startup by initSave)
function loadEconomy() {} // no-op
function getSrs(ko){ return srsData[ko]||{}; }
function setSrs(ko,u){ srsData[ko]={...getSrs(ko),...u}; saveSRS(); }


// ═══════════════ ECONOMY STATE ═══════════════════════════════════════════════
let gold = 0;
let unlockedLevels = [0];  // Level indices the player has bought
let unlockedTrophies = []; // IDs of the trophies the player has bought
const harvestCounts = new Map(); // word.ko → how many times harvested

// (Duplicate loadEconomy/saveEconomy/addGold/updateGoldHUD removed
//  → unified save system via persistSave() at lines 130-134)

const PHASE_CFG = [
  {icon:'🌱', title:'Plant Seed', dots:'●○○', reward:'',    btn:'🌱 Plant Seed'},
  {icon:'💧', title:'Water',      dots:'●●○', reward:'',    btn:'💧 Water'},
  {icon:'🍎', title:'Harvest',    dots:'●●●', reward:'+💰', btn:'🍎 Harvest'},
];

// ── Economy helpers ───────────────────────────────────────────────────────────
// ── Manual Save button ────────────────────────────────────────────────────────
function saveAllGame(){
  persistSave();
  const btn=$('save-btn');
  if(btn){
    const prev=btn.textContent;
    btn.textContent='✅ Saved!';
    btn.style.background='linear-gradient(180deg,#22c55e,#16a34a)';
    setTimeout(()=>{ btn.textContent=prev; btn.style.background=''; }, 1800);
  }
  showToast('💾 Game saved successfully!', 2200);
}


function addGold(amount) {
  gold += amount;
  persistSave();
  updateGoldHUD(true);
  if(levelsData.length) {
    const affordable = levelsData.findIndex((_,i) =>
      !unlockedLevels.includes(i) && gold >= LEVEL_COST(i));
    if(affordable >= 0) showToast(`💡 You can afford "${levelsData[affordable].name}"! Visit 🏪 Shop!`);
  }
}
function updateGoldHUD(pop=false) {
  const el = document.getElementById('gold-val');
  if(el) el.textContent = gold;
  const bg = document.getElementById('shop-gold-val');
  if(bg) bg.textContent = gold;
  const tz = document.getElementById('trophy-gold-val');
  if(tz) tz.textContent = gold;
  if(pop) {
    const hg = document.getElementById('hud-gold');
    if(hg){ hg.classList.add('pop'); setTimeout(()=>hg.classList.remove('pop'),300); }
  }
}
// Run save load once pywebview is ready (or immediately if in browser)
function initSave(){
  // Always try file-based load first, localStorage as fallback
  if(window.pywebview?.api){
    loadSave().then(()=>{ _afterLoad(); });
  } else {
    // Browser mode: try immediately
    loadSave().then(()=>{ _afterLoad(); }).catch(()=>{ _afterLoad(); });
  }
}
function _afterLoad(){
  updateGoldHUD();
  buildLevelSelectScreen();
  console.log('[Save] gold='+gold+', levels='+JSON.stringify(unlockedLevels)+', plots='+plotSave.length);
}
// pywebview fires this event when API is ready; otherwise we init on DOMLoaded
if(window.addEventListener){
  window.addEventListener('pywebviewready', ()=>{ console.log('[pywebview] API ready'); initSave(); }, {once:true});
  // Fallback: if pywebview doesn't fire in 400ms (browser mode), init anyway
  setTimeout(()=>{ if(gold===0 && harvestCounts.size===0) initSave(); }, 400);
}
let quizOpen=false, currentWord=null, currentPlot=null;
let playerLocked=false, plantedWords=new Set(); // words currently ON a plot
let shopOpen=false, catDialogOpen=false, memoryOpen=false, trophyOpen=false, duelOpen=false, fishAlbumOpen=false;
let appleTreeSave = {}; // { ripeAt, ripe } persisted across sessions

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
  catDialogOpen=playerLocked=true;
  catSetWord(); // pick random word
  document.getElementById('cat-dialog').classList.add('visible');
  // Draw portrait after a tiny delay so canvas is visible
  setTimeout(drawCatPortrait, 30);
}
function closeCatDialog(){
  catDialogOpen=playerLocked=false;
  document.getElementById('cat-dialog').classList.remove('visible');
}
function catSetWord(){
  const allWords=unlockedLevels.flatMap(idx=>levelsData[idx]?.words||[]);
  if(!allWords.length) return;
  const w=allWords[Math.floor(Math.random()*allWords.length)];
  document.getElementById('cat-emoji').textContent = w.hint||'📝';
  document.getElementById('cat-ko').textContent    = w.ko;
  document.getElementById('cat-en').textContent    = w.en;
  // Show the VOCAB_FACTS recall hint OR cultural fun fact — whichever is richer
  const fact = getFunFact(w);
  // Alternate between cultural context and recall hint for variety
  const useKo = Math.random() < 0.5;
  const tipText = (useKo ? fact.ko : fact.vi) || fact.vi || fact.ko || '야옹~ Memorize this word!';
  document.getElementById('cat-dialog-tip').textContent = tipText;
}
function catAnotherWord(){
  const ko=document.getElementById('cat-ko');
  ko.animate([{opacity:0,transform:'scale(.5)'},{opacity:1,transform:'scale(1)'}],{duration:250,easing:'ease-out'});
  catSetWord();
}
document.getElementById('cat-dialog').addEventListener('keydown',e=>e.stopPropagation());



const getCompleted  = ()=>{ try{return JSON.parse(localStorage.getItem('hv_done')||'[]')}catch{return[]} };
const markCompleted = i=>{ const c=getCompleted(); if(!c.includes(i)){c.push(i);localStorage.setItem('hv_done',JSON.stringify(c))} };

// ═══════════════ DOM REFS ════════════════════════════════════════════════════
const $=id=>document.getElementById(id);
const lsOverlay=$('level-select-overlay'), lsGrid=$('ls-grid');
const hud=$('hud'), pbWrap=$('progress-bar-wrap'), tipEl=$('controls-tip');
const hudLevelEl=$('hud-level'), hudProgressEl=$('hud-progress'), pbFill=$('progress-bar-fill');
const quizBackdrop=$('quiz-backdrop'), answerInput=$('answer-input');
const feedbackText=$('feedback-text'), submitBtn=$('submit-btn'), cancelBtn=$('cancel-btn');
const enWordDisplay=$('en-word-display'), hintEmoji=$('hint-emoji');
const hintCategory=$('hint-category'), quizLevelTag=$('quiz-level-tag');
const vocabOverlay=$('vocab-overlay'), vocabSubtitle=$('vocab-subtitle');
const vocabSearch=$('vocab-search'), catFiltersEl=$('cat-filters');
const vocabGrid=$('vocab-grid'), vocabCountEl=$('vocab-count');
const levelupOverlay=$('levelup-overlay'), levelupMsg=$('levelup-msg');
const levelupNextBtn=$('levelup-next-btn'), levelupMenuBtn=$('levelup-menu-btn');
const alldoneOverlay=$('alldone-overlay');
const replayBtn=$('replay-btn'), menuBtn=$('menu-btn');
const vocabBtn=$('vocab-btn'), hudMenuBtn=$('hud-menu-btn');

// ═══════════════ TOAST ═══════════════════════════════════════════════════════
let toastTimer=null;
function showToast(msg, dur=3500) {
  const t = $('toast'); if(!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), dur);
}

// ═══════════════ HUD ═════════════════════════════════════════════════════════
function updateHUD() {
  if(!levelsData.length) return;
  const lvl = levelsData[currentLevelIndex];
  hudLevelEl.textContent = `${lvl.icon||'🌾'} ${lvl.name}`;
  // progress = total unique words planted this session
  const pct = lvl.words.length > 0 ? Math.min(100, Math.round((progress / lvl.words.length) * 100)) : 0;
  hudProgressEl.textContent = `🌱 ${progress} words`;
  if(pbFill) pbFill.style.width = pct + '%';
  updateGoldHUD();
}

// ═══════════════ LEVEL SELECT ════════════════════════════════════════════════
function buildLevelSelectScreen() {
  if(!lsGrid) return;
  if(!levelsData || !levelsData.length){
    if(typeof sceneRef !== 'undefined' && sceneRef?.cache?.json){
      levelsData = sceneRef.cache.json.get('levels') || [];
    }
    if(!levelsData || !levelsData.length){
      fetch('levels.json').then(r => r.json()).then(d => {
        levelsData = d;
        buildLevelSelectScreen();
      }).catch(err => console.error('Failed to load levels.json:', err));
      return;
    }
  }
  lsGrid.innerHTML = '';
  // ── RESUME BUTTON (shown when there's saved progress) ──────────────────────
  const hasSave = plotSave.length > 0 || gold > 0 || harvestCounts.size > 0;
  if(hasSave){
    const r = document.createElement('div');
    r.className = 'ls-resume-card';
    const planted = plotSave.length;
    r.innerHTML = `
      <div class="lsr-icon">▶</div>
      <div class="lsr-text">
        <div class="lsr-title">Continue Previous Session</div>
        <div class="lsr-sub">💰 ${gold} gold &nbsp;|&nbsp; 🌱 ${planted} crops growing &nbsp;|&nbsp; Level ${currentLevelIndex+1}</div>
      </div>`;
    r.addEventListener('click', resumeGame);
    lsGrid.appendChild(r);
  }
  // Separator if resume exists
  if(hasSave){
    const sep=document.createElement('div');
    sep.className='ls-sep';
    sep.textContent='── or select a level ──';
    lsGrid.appendChild(sep);
  }
  levelsData.forEach((lvl, idx) => {
    const owned = unlockedLevels.includes(idx);
    const cost  = LEVEL_COST(idx);
    const canAfford = gold >= cost;

    const c = document.createElement('div');
    c.className = 'level-card' + (!owned ? ' locked' : '');
    c.innerHTML = `<div class="lc-badge">${owned ? '✅' : (canAfford ? '💰' : '🔒')}</div>
      <div class="lc-top"><span class="lc-icon">${lvl.icon||'📚'}</span>
      <div class="lc-meta"><div class="lc-num">Level ${lvl.level}</div>
      <div class="lc-name">${lvl.name}</div></div></div>
      <div class="lc-desc">${lvl.description||''}</div>
      <div class="lc-footer">
        <span class="lc-tag words">📝 ${lvl.words.length} words</span>
        ${owned ? `<span class="lc-tag" style="color:#4ade80">✅ Owned</span>`
                : `<span class="lc-tag target" style="color:${canAfford?'#f9c74f':'#aaa'}">💰 ${cost} gold</span>`}
      </div>`;
    if(owned) {
      // If clicking the CURRENT level → resume; if switching → confirm reset
      c.addEventListener('click', () => {
        if(idx === currentLevelIndex && hasSave){
          resumeGame(); // same level: just resume
        } else {
          startLevel(idx, true); // different level or no save: fresh start
        }
      });
    } else if(canAfford) {
      c.addEventListener('click', () => { buyLevelFromSelect(idx); });
      c.title='Click to buy!';
    }
    lsGrid.appendChild(c);
  });
}
function showLevelSelect() {
  lsOverlay.classList.remove('hidden');
  hud.style.display = pbWrap.style.display = tipEl.style.display = 'none';
  playerLocked = true; buildLevelSelectScreen();
}
function hideLevelSelect() {
  lsOverlay.classList.add('hidden');
  hud.style.display = pbWrap.style.display = tipEl.style.display = '';
  playerLocked = false;
}
function buyLevelFromSelect(idx) {
  if(!_doLevelPurchase(idx)) return;
  buildLevelSelectScreen();
}

// ═══════════════ START LEVEL / RESUME ═════════════════════════════════════════
function startLevel(idx, resetCrops=true) {
  currentLevelIndex = idx;
  if(resetCrops){
    // Full fresh start: wipe everything
    progress = 0; plantedWords.clear();
    if(sceneRef) sceneRef.resetPlots(); // also removes hv_plots from localStorage
    plotSave = [];
  }
  hideLevelSelect();
  updateHUD(); updateVocabBook();
  persistSave(); // save the chosen level
}
// Resume last session WITHOUT resetting crops
function resumeGame(){
  currentLevelIndex = parseInt(localStorage.getItem('hv_lastLevel')||'0') || currentLevelIndex;
  hideLevelSelect();
  updateHUD(); updateVocabBook();
  showToast('▶ Resumed previous session!');
}

// ────── HANGUL CHOSUNG & ROMANIZATION HELPERS ─────────────────────────
const CHOSUNG_LIST = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
function getChosung(str){
  if(!str) return '';
  let res = '';
  for(let i = 0; i < str.length; i++){
    const code = str.charCodeAt(i) - 44032;
    if(code >= 0 && code <= 11172){
      res += CHOSUNG_LIST[Math.floor(code / 588)];
    } else {
      res += str[i];
    }
  }
  return res;
}

const ROMAN_MAP = {
  '사과':'sa-gwa', '우유':'u-yu', '빵':'ppang', '밥':'bap', '생선':'saeng-seon',
  '고기':'go-gi', '계란':'gye-ran', '채소':'chae-so', '과일':'gwa-il', '커피':'keo-pi',
  '차':'cha', '주스':'ju-seu', '태양':'tae-yang', '달':'dal', '별':'byeol',
  '하늘':'ha-neul', '산':'san', '바다':'ba-da', '강':'gang', '나무':'na-mu',
  '꽃':'kkot', '눈':'nun', '코':'ko', '입':'ip', '손':'son',
  '발':'bal', '머리':'meo-ri', '마음':'ma-eum', '고양이':'go-yang-i', '개':'gae',
  '새':'sae', '학교':'hak-gyo', '병원':'byeong-won', '시장':'si-jang', '전화':'jeon-hwa',
  '물':'mul'
};
function getRoman(ko){
  return ROMAN_MAP[ko] || ko;
}

function revealQuizHint(tier){
  if(!currentWord) return;
  const box = $('quiz-hint-reveal-card');
  if(!box) return;
  
  if(tier === 'roman'){
    const rom = getRoman(currentWord.ko);
    box.innerHTML = `🔤 <b>Phiên Âm:</b> <span style="color:#67e8f9; font-weight:bold">[${rom}]</span>`;
  } else if(tier === 'chosung'){
    if(gold < 5){ showToast('Cần 5 Vàng 💰 để mở gợi ý Phụ âm đầu!'); return; }
    gold -= 5; persistSave(); updateGoldHUD();
    const ch = getChosung(currentWord.ko);
    box.innerHTML = `🔠 <b>Phụ Âm Đầu (초성):</b> <span style="color:#fde047; font-size:18px; font-weight:bold; letter-spacing:3px">${ch}</span>`;
  } else if(tier === 'fact'){
    if(gold < 10){ showToast('Cần 10 Vàng 💰 để mở Mẹo Hán-Việt & Ngữ cảnh!'); return; }
    gold -= 10; persistSave(); updateGoldHUD();
    const fact = getFunFact(currentWord);
    box.innerHTML = `💡 <b>Mẹo Nhớ:</b> ${fact.vi || fact.ko || 'Từ vựng Tiếng Hàn thông dụng!'}`;
  }
  box.classList.remove('hidden');
}

// ====== QUIZ (SRS Phase-Aware) ================================================
let currentPhase = 1;
function openQuiz(word, plot, phase=1){
  if(quizOpen) return;
  currentWord=word; currentPlot=plot; currentPhase=phase;
  quizOpen=playerLocked=true;
  
  // Reset tier hint reveal card
  const hc = $('quiz-hint-reveal-card'); if(hc) { hc.innerHTML = ''; hc.classList.add('hidden'); }

  const cfg=PHASE_CFG[phase-1];
  // Phase bar UI
  const pi=$('quiz-phase-icon'); if(pi) pi.textContent=cfg.icon;
  const pt=$('quiz-phase-title'); if(pt) pt.textContent=cfg.title;
  const pn=$('quiz-phase-name'); if(pn) pn.textContent=cfg.icon+' '+cfg.title;
  const pd=$('quiz-phase-dots'); if(pd) pd.textContent=cfg.dots;
  const gr=$('quiz-gold-reward'); if(gr) gr.textContent=cfg.reward;
  const sb=$('submit-btn'); if(sb) sb.textContent=cfg.btn;
  const qui=$('quiz-ui'); if(qui) qui.className='phase-'+phase;
  // Fill data (CSS controls visibility per phase)
  hintEmoji.textContent     = word.hint||'?';
  hintCategory.textContent  = word.category||'';
  enWordDisplay.textContent = word.en;
  quizLevelTag.textContent  = 'P'+phase+'/3';
  // Phase 3: populate fun-fact recall hints
  const ffText=$('quiz-funfact-text'), ffCulture=$('quiz-funfact-culture');
  if(ffText && ffCulture){
    if(phase===3){
      const fact = getFunFact(word);
      ffText.textContent    = fact.ko || '';
      ffCulture.textContent = fact.vi || '';
    } else {
      ffText.textContent = ''; ffCulture.textContent = '';
    }
  }
  answerInput.value=''; feedbackText.textContent=''; feedbackText.className='';
  quizBackdrop.classList.add('visible');
  setTimeout(()=>answerInput.focus(),80);
}
function closeQuiz(){
  quizOpen=playerLocked=false;
  appleTreeQuizPending=false; // always reset on close
  const hc = $('quiz-hint-reveal-card'); if(hc) { hc.innerHTML = ''; hc.classList.add('hidden'); }
  quizBackdrop.classList.remove('visible');
  const qui=$('quiz-ui'); if(qui) qui.className='';
  currentWord=currentPlot=null;
}
function submitAnswer(){
  if(!currentWord) return;
  const typed=answerInput.value.trim();
  if(typed===currentWord.ko){
    // ── Apple Tree harvest (special Phase 3 quiz) ─────────────────────────
    if(appleTreeQuizPending){
      feedbackText.textContent='🍎 Harvested! Excellent Korean!'; feedbackText.className='correct';
      appleTreeQuizPending=false;
      setTimeout(()=>{ closeQuiz(); if(sceneRef) sceneRef.onAppleHarvested(); },700);
      return;
    }
    // ── Normal crop quiz ──────────────────────────────────────────────────
    const msgs=['🌱 Planted! Remember to water!','💧 Watered! Almost ripe!','🍎 Excellent! +Gold earned!'];
    feedbackText.textContent=msgs[currentPhase-1]; feedbackText.className='correct';
    const cp=currentPlot, cw=currentWord, ph=currentPhase;
    if(ph===1){plantedWords.add(cw.ko); progress++; updateHUD(); updateVocabBook();}
    setTimeout(()=>{ closeQuiz(); if(sceneRef) sceneRef.advancePlot(cp,cw,ph); },650);
  } else {
    const isApple = appleTreeQuizPending;
    const wrong = isApple ? '❌ Wrong! Try again to harvest!' : (currentPhase===3?'❌ Wrong! Plant regressed to Phase 2!':'❌ Wrong! Try again.');
    feedbackText.textContent=wrong; feedbackText.className='';
    answerInput.value=''; answerInput.focus();
    answerInput.animate(
      [{transform:'translateX(-7px)'},{transform:'translateX(7px)'},{transform:'translateX(0)'}],
      {duration:260,easing:'ease-out'});
    // Apple tree quiz: no regression, just retry
    if(!isApple && currentPhase===3){
      const cp=currentPlot, cw=currentWord;
      appleTreeQuizPending=false;
      setTimeout(()=>{ closeQuiz(); if(sceneRef) sceneRef.regressionPlot(cp,cw); },1400);
    }
  }
}
submitBtn.addEventListener('click', submitAnswer);
cancelBtn.addEventListener('click', closeQuiz);
answerInput.addEventListener('keydown', e => {
  if(e.key==='Enter'){e.preventDefault();submitAnswer();}
  if(e.key==='Escape') closeQuiz();
  e.stopPropagation();
});
quizBackdrop.addEventListener('keydown', e => e.stopPropagation());
quizBackdrop.addEventListener('keyup',   e => e.stopPropagation());

// ═══════════════ SHOP ════════════════════════════════════════════════════════
function openShop() {
  shopOpen = playerLocked = true;
  updateGoldHUD();
  buildShopGrid();
  $('shop-overlay').classList.add('visible');
}
function closeShop() {
  shopOpen = playerLocked = false;
  $('shop-overlay').classList.remove('visible');
}
function _doLevelPurchase(idx) {
  const cost = LEVEL_COST(idx);
  if(unlockedLevels.includes(idx)) { showToast('You already own this pack!'); return false; }
  if(gold < cost) { showToast(`Need ${cost} gold! You have ${gold} 💰`); return false; }
  gold -= cost;
  unlockedLevels.push(idx);
  persistSave(); updateGoldHUD();
  if(sceneRef) sceneRef.refreshPlotAccess();
  showToast(`🎉 Unlocked "${levelsData[idx].name}"! Welcome to Level ${levelsData[idx].level}!`, 4500);
  return true;
}
function buyLevel(idx) {
  if(!_doLevelPurchase(idx)) return;
  buildShopGrid();
  // Auto-switch to the newly bought level
  closeShop();
  setTimeout(() => startLevel(idx), 300);
}
function buildShopGrid() {
  const grid = $('shop-level-grid'); grid.innerHTML = '';
  levelsData.forEach((lvl, idx) => {
    const owned     = unlockedLevels.includes(idx);
    const cost      = LEVEL_COST(idx);
    const canAfford = gold >= cost;

    const card = document.createElement('div');
    card.className = 'shop-card' + (owned ? ' owned' : (!canAfford ? ' too-expensive' : ''));
    card.innerHTML = `
      <div class="shop-card-icon">${lvl.icon||'📚'}</div>
      <div class="shop-card-name">Level ${lvl.level}: ${lvl.name}</div>
      <div class="shop-card-desc">${lvl.description||''} — ${lvl.words.length} words</div>
      <div class="shop-card-price">
        ${owned
          ? `<span class="shop-owned-badge">✅ Owned</span>
             <button class="shop-buy-btn" onclick="closeShop();startLevel(${idx})">🌾 Play</button>`
          : `<span class="shop-card-cost">💰 ${cost} gold</span>
             <button class="shop-buy-btn" ${canAfford?'':'disabled'} onclick="buyLevel(${idx})">
               ${canAfford ? '🛒 Buy Now' : `Need ${cost-gold} more gold`}
             </button>`}
      </div>`;
    grid.appendChild(card);
  });
}
$('shop-close-btn').addEventListener('click', closeShop);
$('shop-btn').addEventListener('click', openShop);
$('shop-overlay').addEventListener('keydown', e => e.stopPropagation());

// ═══════════════ VOCAB BOOK ══════════════════════════════════════════════════
let activeCat = 'all';
let activeMasteryFilter = 'all';

function buildVocabBook() {
  if(!levelsData.length) return;
  const lvl = levelsData[currentLevelIndex];
  vocabSubtitle.textContent = `Level ${lvl.level} – ${lvl.name}`;
  const cats = ['all', '⚪ Novice', '🔵 Practicing', '🟣 Mastered', '🟡 Legendary', ...new Set(lvl.words.map(w => w.category).filter(Boolean))];
  catFiltersEl.innerHTML = '';
  cats.forEach(cc => {
    const b = document.createElement('button');
    b.className = 'cat-filter-btn' + (cc === activeCat ? ' active' : '');
    b.textContent = cc === 'all' ? '🌐 All' : cc;
    b.onclick = () => { activeCat = cc; buildVocabBook(); };
    catFiltersEl.appendChild(b);
  });
  renderVocabCards();
}
// ══════ FUN FACT DATABASE (keyed by word.en lowercase) ══════════════════════
// vi = vivid cultural hook  (surprising/emotional anchor — makes the word stick)
// ko = smart mnemonic       (sound-alike, syllable count, visual/physical cue)
const VOCAB_FACTS = {
  'water':    {vi:'💧 Koreans almost never drink cold water — restaurants serve warm water by default. Cold water is considered bad for digestion!',
               ko:'🧠 1 syllable, sounds like "mull". Picture a single raindrop — one crisp sound: MUL.'},
  'milk':     {vi:'🥛 In Korean dramas, the character who drinks milk every morning = the reliable, warm personality type. It is a whole archetype!',
               ko:'🧠 2 syllables: U · yu. Imagine a cow going "Uuu~yuu~". Let the syllables moo out slowly.'},
  'apple':    {vi:'🍎 BOMBSHELL: Korean words for "apple" and "apology" are IDENTICAL! Koreans gift apples to apologize — sagwa = sagwa!',
               ko:'🧠 2 syllables: sa · gwa. "Sa" = number 4 in Korean. Count four, then go "GWAK!" like a startled duck. Sa-gwa!'},
  'bread':    {vi:'🥖 The word traveled: Portuguese "pao" → Japanese "pan" → Korean. Bakeries (빵집 = bread-house) line every Seoul street!',
               ko:'🧠 1 tense syllable that POPS: PPANG! Slap a puffed-up loaf. That double-p burst is the sound.'},
  'rice':     {vi:'🍚 "Did you eat rice?" (밥 먹었어?) is the Korean way of asking "How are you?" to someone you care about. Rice = love.',
               ko:'🧠 1 syllable: "bap" — bouncy like a music beat. BAP BAP BAP. Compact like a grain of sticky rice.'},
  'fish':     {vi:'🐟 Seoul Noryangjin fish market runs 24/7 — you can eat fresh sashimi at 3 AM, minutes from the tank!',
               ko:'🧠 2 syllables: saeng · seon. "Saeng" = raw/living (same in saeng-juice = fresh-squeezed). Living fish = saeng-seon!'},
  'meat':     {vi:'🥩 Samgyeopsal (pork belly BBQ) nights are a social INSTITUTION in Korea. The grill is just the excuse to sit together for hours!',
               ko:'🧠 2 syllables: go · gi. Chant it like a hungry stomach — "gogi gogi gogi"!'},
  'egg':      {vi:'🥚 Rolled egg omelette (계란말이) appears in 90% of Korean lunchboxes — the most universal Korean side dish!',
               ko:'🧠 2 syllables: gye · ran. "GYEEE-RAN!" — like a rooster crowing at dawn. Loud and proud!'},
  'vegetable':{vi:'🥬 Korea has 180+ documented kimchi varieties — every vegetable gets fermented! Korean astronaut Yi So-yeon brought kimchi to the ISS.',
               ko:'🧠 2 syllables: chae · so. "Chae" = colorful, "so" = small. Colorful small garden things = chae-so!'},
  'fruit':    {vi:'🍊 Premium Korean melons are sold in velvet gift boxes — a 10-apple luxury set can cost $80. Fruit as jewelry is real!',
               ko:'🧠 2 syllables: gwa · il. "GWA!" — gasp at the price! Then "il" = one. One gasp-worthy fruit. Gwa-il.'},
  'coffee':   {vi:'☕ Seoul has more coffee shops per capita than ANY city on Earth — roughly 1 cafe per 100 residents. Coffee is survival infrastructure!',
               ko:'🧠 2 syllables: keo · pi. Just say "coffee" in a Korean accent — KEO-PI! Same word, rounder vowels.'},
  'tea':      {vi:'🍵 The oldest tea garden still operating is on Jeju Island — cultivated since 828 AD! Jeju green tea is Korea most famous drink export.',
               ko:'🧠 1 syllable: cha. Same root as British slang "a cup of cha"! Tea kept its name crossing the silk road.'},
  'juice':    {vi:'🥤 Korean convenience stores (open 24/7) stock 50+ juice flavors. Persimmon juice (홍시즙) has FIVE simultaneous flavors at once!',
               ko:'🧠 2 syllables: ju · seu. Read "juice" in a Korean accent — joo-suh. Your ears already know this!'},
  'sun':      {vi:'☀️ Korea ancient poetic name is "Dongbang" (동방) — Eastern Land — where the sun rises first. Sunrise pilgrimages happen every New Year!',
               ko:'🧠 2 syllables: tae · yang. "Yang" is literally the Yang in Yin-Yang — solar force! "Tae" = great. The Great Solar!'},
  'moon':     {vi:'🌙 Korea celebrates TWO New Years: January 1st AND Lunar New Year (설날). The moon governs the entire traditional festival calendar!',
               ko:'🧠 1 syllable: dal. Crisp and perfectly round like the full moon. D·A·L. Three letters, one breath.'},
  'star':     {vi:'⭐ Korean celebrities are literally called "byeol" (star). The highest K-pop award crowns the brightest star each year!',
               ko:'🧠 1 syllable: byeol. Like a shooting star: "BYEOL!" — a quick burst of light across the night sky.'},
  'sky':      {vi:'🌤️ Korean proverb: "The sky is high and horses grow fat" — describing the perfect abundance of autumn harvest season.',
               ko:'🧠 2 syllables: ha · neul. "Ha!" = laughing in awe of the sky. "Neul" = always. A sky that always makes you go "HA!"'},
  'mountain': {vi:'🏔️ Korea is 70% mountains! Bukhansan mountain is inside Seoul city limits. Hiking is so normal grocery stores sell trail food next to soju.',
               ko:'🧠 1 syllable: san. SAME as Japanese 山 (san) — ancient East Asian shared root! The character shows three mountain peaks.'},
  'sea':      {vi:'🌊 Korea has THREE seas on three sides. Koreans debate passionately which is most beautiful: East (deep blue), Yellow (golden), South (islands).',
               ko:'🧠 2 syllables: ba · da. Soft and rolling like ocean waves — "baaaaa-da". Let the vowels wash over you.'},
  'river':    {vi:'🌊 The Han River flows 60km through Seoul — millions gather on its banks for chicken delivery, beer, and fireworks every weekend.',
               ko:'🧠 1 syllable: gang. Like a GANG of water rushing powerfully forward. Strong. Direct. Unstoppable. GANG!'},
  'tree':     {vi:'🌳 The Korean pine (소나무) stays evergreen through brutal winters — symbol of loyalty. It appears on currency, poetry, and folk paintings.',
               ko:'🧠 2 syllables: na · mu. Tap a wooden surface twice — NA · MU. The rhythm of knocking on wood for luck!'},
  'flower':   {vi:'🌸 Cherry blossom tunnels form naturally on university paths every spring. Students literally attend class inside pink clouds!',
               ko:'🧠 1 syllable: kkot. The double-consonant is tense — say it with a POP: KKOT! Like a bud suddenly bursting open.'},
  'eye':      {vi:'👁️ Korea "aegyo-sal" (애교살) — the puffy under-eye cushion — is considered CUTE, not tired. People surgically ADD it!',
               ko:'🧠 1 syllable: nun. Also means "snow"! Close your eyes in the falling snow — same word for both. NUN.'},
  'nose':     {vi:'👃 Traditional Korean face-reading (관상) uses nose shape to predict wealth. High nose bridge = prosperity. Real fortune-tellers specialize in this!',
               ko:'🧠 1 syllable: ko. Upright and prominent like the nose itself. Short, bold, unmissable. KO.'},
  'mouth':    {vi:'👄 "입이 무겁다" = "your mouth is heavy" = you keep secrets well. In Korean, body parts carry moral and social weight!',
               ko:'🧠 1 syllable: ip. Your lips come together then POP open — "IP!" The word physically mirrors its own action.'},
  'hand':     {vi:'🤝 Using ONE hand to receive anything from a Korean elder is genuinely rude. Gifts, money, business cards — BOTH hands = respect!',
               ko:'🧠 1 syllable: son. Sounds like English "son"! Picture your son handing you something with both hands respectfully — SON.'},
  'foot':     {vi:'🦶 Korean ondol (온돌) warms floors from underneath. Koreans traditionally sleep on heated floors in winter — feet are always pampered!',
               ko:'🧠 1 syllable: bal. Like "ball" without the double-L — BAL. Picture a ball rolling off your warm foot.'},
  'head':     {vi:'🤯 The Korean bow communicates hierarchy through angle: 15 degrees = greeting, 45 degrees = apology, 90 degrees = deepest respect.',
               ko:'🧠 2 syllables: meo · ri. "Meo" sounds exactly like a cat meowing — then "ri"! A cat nodding its head: MEO-ri!'},
  'heart':    {vi:'💖 Koreans developed "nunchi" (눈치) — the art of sensing others emotions without being told. Being heart-aware is a core social skill!',
               ko:'🧠 2 syllables: ma · eum. "Ma!" = surprised call for your mum. "Eum" = sound/tone. Heart = the sound of calling for love.'},
  'cat':      {vi:'🐱 Korean cats say "야옹!" (yaong) — longer and moodier than meow! Cat cafes in Seoul have waitlists on weekends. Muop says hi! 🐾',
               ko:'🧠 3 syllables: go · yang · i. "Go" = go! "Yang" = sheep baa! "I" = subject marker. The cat who goes and baa-s — GO-YANG-I!'},
  'dog':      {vi:'🐶 Korean dogs say "멍멍!" (meong-meong). The Jindo dog famously walked 300km home after being sold — a national loyalty legend!',
               ko:'🧠 1 syllable: gae. Sharp as a bark — GAE! One bark, one syllable. Done.'},
  'bird':     {vi:'🐦 The Korean crane (두루미) symbolizes 1000 years of life. Folding 1000 paper cranes grants one wish — still practiced today!',
               ko:'🧠 1 syllable: sae. Light as a feather — SAE. A bird taking flight barely disturbs the air.'},
  'school':   {vi:'🏫 Korean school uniforms are so fashionable they are sold to non-students as streetwear. K-drama school arcs launched global fashion trends!',
               ko:'🧠 2 syllables: hak · gyo. "Hak" (학) = learning — also in university (대학) and student (학생). Learning-place!'},
  'hospital': {vi:'🏥 Gangnam has more cosmetic surgery clinics per block than anywhere on Earth. Some look like luxury hotel lobbies. Medical tourism earns $1B+ yearly.',
               ko:'🧠 2 syllables: byeong · won. "Byeong" = sick. "Won" = institution. Like hagwon (learning institution). Sick-institution!'},
  'market':   {vi:'🛒 Gwangjang Market has operated continuously since 1905! At 2 AM you can eat fresh kimbap while vendors still negotiate prices!',
               ko:'🧠 2 syllables: si · jang. TRICK: "sijang" ALSO means "mayor"! Same sounds, completely different jobs!'},
  'phone':    {vi:'📱 Korea launched the world first 5G network AND invented the foldable smartphone. Koreans upgrade phones every 16 months — faster than any nation!',
               ko:'🧠 3 syllables: hyu · dae · pon. "Hyu-dae" = portable/handheld. "Pon" from English phone. Handheld-phone!'},
  'book':     {vi:'📚 Kyobo Bookstore in Seoul spans 4 underground floors with its own signature scent (cedarwood and ink). Koreans famously read on the subway.',
               ko:'🧠 1 syllable: chaek. Sounds like "CHECK!" — you check a book out of the library. CHAEK! Stamped.'},
  'music':    {vi:'🎵 BTS contributes $5 BILLION to Korea economy per year — exceeding the entire beer and soju export industry combined. K-pop is financial power!',
               ko:'🧠 2 syllables: eum · ak. "Eum" (음) = sound/tone in music theory. "Ak" = enjoyment. Sound-enjoyment = music. Perfect logic!'},
  'money':    {vi:'💰 The 50000 won bill features Shin Saimdang — one of the world first female artists ever on a banknote. Korea honored a 16th-century woman painter!',
               ko:'🧠 1 syllable: don. Like "dun-dun-DUN!" in a movie — but compact. DON. Money drama in one punchy syllable.'},
};

// Generate a fun fact for any word (smart fallback if not in database)
function getFunFact(word) {
  const key = (word.en || '').toLowerCase();
  if(VOCAB_FACTS[key]) return VOCAB_FACTS[key];
  // Smart fallback using syllable count
  const koLen = (word.ko||'').length;
  const syllables = koLen <= 2 ? '1 syllable — very short, one quick breath!'
                  : koLen <= 4 ? '2 syllables — clap twice as you say it!'
                  : '3+ syllables — break it into pieces and conquer each!';
  const catTips = {
    'food':    {vi:`🍽️ Korean cuisine balances 5 flavors: spicy, salty, sweet, sour, bitter. "${word.en}" fits right into this harmony!`,       ko:`🧠 ${syllables} Picture this food at a Korean dinner table.`},
    'animal':  {vi:`🐾 Animal cafes are huge in Korea — cat, dog, rabbit, otter... "${word.en}" might even have its own cafe!`,                   ko:`🧠 ${syllables} Try imitating the sound this animal makes — Korean onomatopoeia often matches!`},
    'nature':  {vi:`🌿 Korea 4 seasons make every natural element look different each quarter. "${word.en}" appears in Korean poetry across centuries!`, ko:`🧠 ${syllables} Imagine this element in Korea landscape as you say each syllable.`},
    'body':    {vi:`💪 Korean body-part words carry social meaning — how you move each body part communicates respect and emotion!`,               ko:`🧠 ${syllables} Feel the physical sensation of this body part as you pronounce each syllable.`},
    'place':   {vi:`📍 Korea is one of the safest countries in Asia — "${word.en}" is a place you can freely explore at any hour!`,               ko:`🧠 ${syllables} Close your eyes and imagine the sounds and smells of this place.`},
  };
  return catTips[word.category] || {
    vi: `✨ "${word.en}" is used constantly in Korean daily life and K-dramas — once you recognize it, you will hear it everywhere!`,
    ko: `🧠 ${syllables} Clap for each syllable as you say it out loud — your body will remember the rhythm!`,
  };
}

function showVocabFunFact(word) {
  const fact = getFunFact(word);
  const srs  = getSrs(word.ko);
  const harvests = harvestCounts.get(word.ko) || 0;
  const phase = srs.p3ReadyAt ? 3 : srs.p2At ? 2 : plantedWords.has(word.ko) ? 1 : 0;
  const phaseLabel = ['Not planted','🌱 Phase 1','💧 Phase 2','🍎 Ready to harvest'][phase];
  const modal = $('vocab-ff-modal');
  $('vff-emoji').textContent    = word.hint || '📝';
  $('vff-en').textContent       = word.en;
  $('vff-cat').textContent      = word.category || '';
  $('vff-phase').textContent    = phaseLabel;
  $('vff-harvests').textContent = harvests > 0 ? `✅ Harvested ×${harvests}` : '🌱 Not harvested';
  $('vff-fact-vi').textContent  = fact.vi;
  $('vff-fact-ko').textContent  = fact.ko;
  modal.classList.add('visible');
}
function closeVocabFunFact() { $('vocab-ff-modal').classList.remove('visible'); }

function renderVocabCards() {
  const lvl = levelsData[currentLevelIndex];
  const q = vocabSearch.value.trim().toLowerCase();
  let words = lvl.words;

  // Filter by category / mastery filter
  if(activeCat !== 'all'){
    if(activeCat.includes('Novice')) words = words.filter(w => (harvestCounts.get(w.ko)||0) <= 1);
    else if(activeCat.includes('Practicing')) words = words.filter(w => { const h=harvestCounts.get(w.ko)||0; return h>=2 && h<=4; });
    else if(activeCat.includes('Mastered')) words = words.filter(w => { const h=harvestCounts.get(w.ko)||0; return h>=5 && h<=9; });
    else if(activeCat.includes('Legendary')) words = words.filter(w => (harvestCounts.get(w.ko)||0) >= 10);
    else words = words.filter(w => w.category === activeCat);
  }
  
  if(q) words = words.filter(w => w.ko.toLowerCase().includes(q) || w.en.toLowerCase().includes(q) || getRoman(w.ko).includes(q));
  
  vocabCountEl.textContent = `${words.length} words`; vocabGrid.innerHTML = '';
  words.forEach(w => {
    const times   = harvestCounts.get(w.ko) || 0;
    const planted = plantedWords.has(w.ko);
    const chosung = getChosung(w.ko);
    const roman   = getRoman(w.ko);

    let mBadgeClass = 'novice', mBadgeLabel = '⚪ Tân thủ';
    if(times >= 10) { mBadgeClass = 'legendary'; mBadgeLabel = '🟡 Huyền thoại ⭐'; }
    else if(times >= 5) { mBadgeClass = 'mastered'; mBadgeLabel = '🟣 Thành thạo'; }
    else if(times >= 2) { mBadgeClass = 'practicing'; mBadgeLabel = '🔵 Đang nhớ'; }

    const div = document.createElement('div');
    div.className = `vocab-card ${mBadgeClass}` + (times > 0 ? ' planted' : '') + (planted ? ' growing' : '');
    div.title = 'Click for Fun Facts & Hints!';
    div.style.cursor = 'pointer';
    div.innerHTML = `
      <span class="vc-emoji">${w.hint||'📝'}</span>
      <span class="vc-ko">${w.ko}</span>
      <span style="font-size:12px; color:#67e8f9; font-weight:bold; font-family:monospace">[${roman}]</span>
      <span class="vc-en">${w.en}</span>
      <span style="font-size:11px; color:#fde047; font-family:monospace">초성: ${chosung}</span>
      <span class="mastery-badge ${mBadgeClass}">${mBadgeLabel} (×${times})</span>`;
    div.addEventListener('click', () => showVocabFunFact(w));
    vocabGrid.appendChild(div);
  });
}
function updateVocabBook() { if(vocabOverlay.classList.contains('visible')) renderVocabCards(); }
vocabBtn.addEventListener('click', () => vocabOverlay.classList.contains('visible')
  ? vocabOverlay.classList.remove('visible')
  : (buildVocabBook(), vocabOverlay.classList.add('visible')));
$('vocab-close-btn').addEventListener('click', () => vocabOverlay.classList.remove('visible'));
vocabSearch.addEventListener('input', renderVocabCards);
hudMenuBtn.addEventListener('click', () => { closeQuiz(); showLevelSelect(); });

// Legacy overlays (now rarely triggered, economy is main flow)
levelupNextBtn && levelupNextBtn.addEventListener('click', () => { levelupOverlay.classList.remove('visible'); openShop(); });
levelupMenuBtn && levelupMenuBtn.addEventListener('click', () => { levelupOverlay.classList.remove('visible'); showLevelSelect(); });
replayBtn && replayBtn.addEventListener('click', () => { alldoneOverlay.classList.remove('visible'); startLevel(0); });
menuBtn   && menuBtn.addEventListener('click', ()   => { alldoneOverlay.classList.remove('visible'); showLevelSelect(); });

// ═══════════════ PHASER SCENE ════════════════════════════════════════════════
class FarmScene extends Phaser.Scene {
  constructor(){ super({key:'FarmScene'}); }
  preload(){ this.load.json('levels','levels.json'); }

  // ── APPLE TREE constants ──────────────────────────────────────────────────
  // Time for apple tree to ripen after last harvest (or game start)
  static get APPLE_RIPEN_MS() { return 2 * 60 * 1000; } // 2 minutes

  create(){
    sceneRef = this;
    levelsData = this.cache.json.get('levels') || [];
    if(!levelsData.length){ console.error('levels.json missing'); return; }

    this._bakeTextures();
    const W = this.scale.width, H = this.scale.height;
    this._drawWorld(W, H);
    this.plots = []; this._createPlots(W, H);
    this._createPlayer(W, H); this._addPlotLabels();
    this._createShopNPC(W, H);
    this._createBoardNPC(W, H);
    this._createArcadeNPC(W, H);
    this._createWizardNPC(W, H);
    this._createCatNPC(W, H);
    this._createAppleTree(W, H);
    this._createPortalNPC(W, H);
    this._createFishingSpot(W, H);

    this.keys = {
      W:this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A:this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S:this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D:this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      UP:this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      DOWN:this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      LEFT:this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      RIGHT:this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
    };
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.walkFrame = 0; this.walkTimer = 0;

    buildLevelSelectScreen(); playerLocked = true;
    updateGoldHUD();
  }

  // ── BAKE TEXTURES ──────────────────────────────────────────────────────────
  _bakeTextures(){
    const mk = () => this.make.graphics({add:false});
    // Apple Tree texture (18×30 pixels) — ginger-red apples peeking through crown
    const gat=mk();
    const crown2=['......lLLLl.......','....lLLLLLLl......','...LLLLLLLLLLL....',
     '..LLLLLLLLlLLLL...','..lLLLRALLllLLLl..','.LLLLLRALLllLLLLL.',
     'lLLRRALllMlLLLLLL','lLLRRALlMMLllLLLL','lLLLLllMMMlllLLLL',
     'lLLRRAllllllLLLLL','mLlRRAMMMlllllLLL','mRRAMMMMMllllllLL',
     'mMMMMMMMMMllllllL','.MMMMMMMMmmllllL.','.mMMMMMMmmmlll..','.mmmmmmmmmmll...',
     '...mmmmmmmmm.....','....kKKKk........'];
    // Override some cells with red apple color
    const R=0xEE2222, RA=0xFF5555;
    drawS(gat,crown2); // draw base crown
    // Paint apple spots red on top of crown
    [[3,5,3,2,R],[2,9,3,2,R],[8,10,3,2,R]].forEach(([x,y,w,h,c])=>pR(gat,x,y,w,h,c));
    [[3,5,1,1,RA],[2,9,1,1,RA],[8,10,1,1,RA]].forEach(([x,y,w,h,c])=>pR(gat,x,y,w,h,c));
    pR(gat,7,17,4,11,K.K); pR(gat,7,17,1,11,K.k); pR(gat,10,17,1,11,K.s);
    gat.generateTexture('apple_tree',18*PS,30*PS); gat.destroy();
    // Ripe apple tree variant — brighter more saturated apples
    const gatr=mk();
    drawS(gatr,crown2);
    [[3,5,3,2,0xFF0000],[2,9,3,2,0xFF0000],[8,10,3,2,0xFF0000]].forEach(([x,y,w,h,c])=>pR(gatr,x,y,w,h,c));
    [[3,5,1,1,0xFF6666],[2,9,1,1,0xFF6666],[8,10,1,1,0xFF6666]].forEach(([x,y,w,h,c])=>pR(gatr,x,y,w,h,c));
    pR(gatr,7,17,4,11,K.K); pR(gatr,7,17,1,11,K.k); pR(gatr,10,17,1,11,K.s);
    gatr.generateTexture('apple_tree_ripe',18*PS,30*PS); gatr.destroy();

    GRASS.forEach((rows,i)=>{ const g=mk(); drawS(g,rows); g.generateTexture('grs'+i,16*PS,16*PS); g.destroy(); });
    const gd=mk(); drawS(gd,DIRT_DRY); gd.generateTexture('drt_dry',16*PS,16*PS); gd.destroy();
    const gw=mk(); drawS(gw,DIRT_WET); gw.generateTexture('drt_wet',16*PS,16*PS); gw.destroy();

    // Cobblestone Path texture (16x16)
    const gcs = mk();
    pR(gcs, 0, 0, 16, 16, 0x4A6B2A);
    pR(gcs, 2, 2, 5, 4, 0x78716C); pR(gcs, 3, 2, 3, 1, 0xA8A29E);
    pR(gcs, 9, 3, 5, 5, 0x57534E); pR(gcs, 10, 3, 3, 1, 0x78716C);
    pR(gcs, 3, 9, 6, 5, 0x78716C); pR(gcs, 4, 9, 4, 1, 0xA8A29E);
    pR(gcs, 10, 10, 4, 4, 0x57534E);
    gcs.generateTexture('path_stone', 16*PS, 16*PS); gcs.destroy();

    // Wildflowers (8x8)
    const gflr = mk(); pR(gflr, 2, 2, 4, 4, 0xEF4444); pR(gflr, 3, 3, 2, 2, 0xFDE047); pR(gflr, 3, 6, 2, 2, 0x15803D); gflr.generateTexture('flw_red', 8*PS, 8*PS); gflr.destroy();
    const gfly = mk(); pR(gfly, 2, 2, 4, 4, 0xEAB308); pR(gfly, 3, 3, 2, 2, 0xFFFFFF); pR(gfly, 3, 6, 2, 2, 0x15803D); gfly.generateTexture('flw_yellow', 8*PS, 8*PS); gfly.destroy();
    const gflp = mk(); pR(gflp, 2, 2, 4, 4, 0xA855F7); pR(gflp, 3, 3, 2, 2, 0xFDE047); pR(gflp, 3, 6, 2, 2, 0x15803D); gflp.generateTexture('flw_purple', 8*PS, 8*PS); gflp.destroy();

    // Micro Butterfly Wing 0 (Open)
    const gbf0 = mk();
    pR(gbf0, 0, 0, 2, 2, 0x38BDF8); pR(gbf0, 4, 0, 2, 2, 0x38BDF8);
    pR(gbf0, 1, 2, 2, 2, 0x0284C7); pR(gbf0, 3, 2, 2, 2, 0x0284C7);
    pR(gbf0, 2, 1, 2, 4, 0x0F172A);
    gbf0.generateTexture('bf_open', 6*PS, 6*PS); gbf0.destroy();

    // Micro Butterfly Wing 1 (Flap/Up)
    const gbf1 = mk();
    pR(gbf1, 1, 0, 2, 3, 0x38BDF8); pR(gbf1, 3, 0, 2, 3, 0x38BDF8);
    pR(gbf1, 2, 1, 2, 4, 0x0F172A);
    gbf1.generateTexture('bf_flap', 6*PS, 6*PS); gbf1.destroy();

    // Stone Well / Water Shrine (16x16)
    const gsw = mk();
    pR(gsw, 2, 2, 12, 12, 0x57534E); pR(gsw, 3, 3, 10, 10, 0x78716C);
    pR(gsw, 4, 4, 8, 8, 0x0284C7); pR(gsw, 5, 5, 6, 6, 0x0369A1);
    pR(gsw, 5, 5, 2, 2, 0x38BDF8); pR(gsw, 6, 6, 1, 1, 0xFFFFFF); // water sparkle
    pR(gsw, 1, 1, 3, 14, 0x78350F); pR(gsw, 12, 1, 3, 14, 0x78350F); // posts
    pR(gsw, 1, 1, 14, 3, 0x92400E); // top winch bar
    gsw.generateTexture('stone_well', 16*PS, 16*PS); gsw.destroy();

    // Pixel Barrel (10x12)
    const gbar = mk();
    pR(gbar, 1, 0, 8, 12, 0x78350F); pR(gbar, 0, 1, 10, 10, 0x92400E);
    pR(gbar, 0, 3, 10, 2, 0x475569); pR(gbar, 0, 8, 10, 2, 0x475569); // metal hoops
    gbar.generateTexture('pixel_barrel', 10*PS, 12*PS); gbar.destroy();

    // Pixel Crate (12x12)
    const gcrat = mk();
    pR(gcrat, 0, 0, 12, 12, 0x92400E); pR(gcrat, 1, 1, 10, 10, 0xB45309);
    pR(gcrat, 0, 0, 12, 1, 0x78350F); pR(gcrat, 0, 11, 12, 1, 0x78350F);
    pR(gcrat, 0, 0, 1, 12, 0x78350F); pR(gcrat, 11, 0, 1, 12, 0x78350F);
    pR(gcrat, 1, 1, 10, 10, 0x78350F); pR(gcrat, 2, 2, 8, 8, 0xB45309); // X-brace
    gcrat.generateTexture('pixel_crate', 12*PS, 12*PS); gcrat.destroy();

    // Directional Signpost (12x14)
    const gsgn = mk();
    pR(gsgn, 5, 4, 2, 10, 0x78350F); // post
    pR(gsgn, 1, 1, 10, 4, 0x92400E); pR(gsgn, 1, 1, 1, 4, 0xB45309); // sign 1
    pR(gsgn, 2, 7, 9, 4, 0x92400E); pR(gsgn, 10, 7, 1, 4, 0xB45309); // sign 2
    gsgn.generateTexture('signpost', 12*PS, 14*PS); gsgn.destroy();

    // Tree
    const gt=mk();
    const crown=['......lLLLl.......','....lLLLLLLl......','...LLLLLLLLLLL....',
     '..LLLLLLLLlLLLL...','.lLLLLLLLllLLLLl.','.LLLLLLLLllLLLLLL',
     'lLLLLLLLllMlLLLLL','lLLLLLLlMMLllLLLL','lLLLLllMMMlllLLLL',
     'lLLLlMMMMllllLLLL','mLlMMMMMMlllllLLL','mMMMMMMMMllllllLL',
     'mMMMMMMMMMllllllL','.MMMMMMMMmmllllL.','.mMMMMMMmmmlll..','.mmmmmmmmmmll...',
     '...mmmmmmmmm.....','....kKKKk........'];
    drawS(gt,crown); pR(gt,7,17,4,11,K.K); pR(gt,7,17,1,11,K.k); pR(gt,10,17,1,11,K.s);
    gt.generateTexture('tree',18*PS,28*PS); gt.destroy();

    // Fence
    const gfp=mk();
    pR(gfp,0,0,4,12,K.O); pR(gfp,0,0,1,12,K.o); pR(gfp,3,0,1,12,K.U); pR(gfp,0,0,4,1,K.o);
    [3,6,9].forEach(y=>pR(gfp,1,y,3,1,K.U));
    gfp.generateTexture('fnc_post',4*PS,12*PS); gfp.destroy();
    const gfr=mk();
    pR(gfr,0,0,14,4,K.O); pR(gfr,0,0,14,1,K.o); pR(gfr,0,3,14,1,K.U);
    [3,7,11].forEach(x=>pR(gfr,x,0,1,4,K.U));
    gfr.generateTexture('fnc_rail',14*PS,4*PS); gfr.destroy();

    // Sparkle
    const gsp=mk();
    gsp.fillStyle(0xFFFFFF,1); gsp.fillRect(6,0,4,16); gsp.fillRect(0,6,16,4);
    gsp.fillRect(3,3,2,2); gsp.fillRect(11,3,2,2); gsp.fillRect(3,11,2,2); gsp.fillRect(11,11,2,2);
    gsp.generateTexture('sparkle',16,16); gsp.destroy();

    // Gold coin 8×8
    const gc=mk();
    pR(gc,1,0,6,1,0xFFDD00); pR(gc,0,1,8,6,0xFFDD00); pR(gc,1,7,6,1,0xFFDD00);
    pR(gc,1,1,3,2,0xFFFF88); pR(gc,2,3,1,1,0xCC9900);
    gc.generateTexture('coin',8*PS,8*PS); gc.destroy();

    // Shop sign texture 14×18
    const gs=mk();
    pR(gs,0,0,14,2,K.O);  // roof
    pR(gs,1,0,12,2,K.o);  // roof highlight
    pR(gs,0,2,14,12,K.T); // board body
    pR(gs,0,2,1,12,K.t);  // left highlight
    pR(gs,13,2,1,12,K.V); // right shadow
    pR(gs,1,3,12,1,K.t);  // stripe
    // Coin icon on sign
    pR(gs,4,5,6,6,0xFFDD00); pR(gs,5,4,4,1,0xFFDD00); pR(gs,5,11,4,1,0xFFDD00);
    pR(gs,5,5,2,2,0xFFFF88);
    pR(gs,0,14,14,4,K.K); // post
    pR(gs,6,14,2,4,K.k);
    gs.generateTexture('shop_sign',14*PS,18*PS); gs.destroy();

    // Notice Board texture 18x16 with micro corkboard grain & colored pushpins
    const gb = mk();
    pR(gb,0,0,18,12,K.O); pR(gb,1,1,16,10,0xD97706);
    pR(gb,2,12,2,4,K.K); pR(gb,14,12,2,4,K.K);
    // Papers with micro text lines
    pR(gb,2,2,5,5,K.J); pR(gb,3,3,3,1,0x525252); pR(gb,3,5,3,1,0x525252);
    pR(gb,10,3,6,6,0xFFF3C7); pR(gb,11,4,4,1,0x525252); pR(gb,11,6,4,1,0x525252);
    pR(gb,4,8,8,3,0xDDFFDD); pR(gb,5,9,6,1,0x525252);
    // Colored Pushpins
    pR(gb,4,1,1,1,0xEF4444); pR(gb,12,2,1,1,0x06B6D4); pR(gb,7,7,1,1,0xEAB308);
    gb.generateTexture('notice_board',18*PS,16*PS); gb.destroy();

    // Dungeon Portal texture 20x28
    const gport = mk();
    pR(gport, 0, 4, 20, 24, 0x334155); pR(gport, 2, 6, 16, 22, 0x1E293B);
    pR(gport, 0, 0, 20, 6, 0x475569); pR(gport, 2, 2, 16, 4, 0x334155);
    pR(gport, 4, 8, 12, 20, 0xA855F7); pR(gport, 6, 10, 8, 16, 0x6D28D9);
    pR(gport, 8, 12, 4, 12, 0x06B6D4); pR(gport, 9, 14, 2, 8, 0xFFFFFF);
    gport.generateTexture('dungeon_portal', 20*PS, 28*PS); gport.destroy();

    // Fishing Dock Pier texture 24x16
    const gdock = mk();
    pR(gdock, 0, 0, 24, 16, 0x78350F); pR(gdock, 1, 1, 22, 14, 0x92400E);
    pR(gdock, 0, 0, 24, 2, 0xB45309); pR(gdock, 0, 8, 24, 2, 0x78350F);
    pR(gdock, 2, 2, 2, 12, 0x475569); pR(gdock, 20, 2, 2, 12, 0x475569); // bolts
    gdock.generateTexture('fishing_dock', 24*PS, 16*PS); gdock.destroy();

    // Arcade Machine texture 16x22 with CRT scanline details
    const ga = mk();
    pR(ga,2,0,12,22,0x222222); pR(ga,3,1,10,20,0x444455);
    // Screen glowing with scanlines
    pR(ga,4,4,8,6,0x00FFFF); pR(ga,5,5,6,4,0xFFFFFF);
    pR(ga,4,6,8,1,0x06B6D4); pR(ga,4,8,8,1,0x0891B2);
    // Control panel (slanted)
    pR(ga,3,10,10,4,0xFF00FF);
    pR(ga,5,11,1,1,0xFF0000); pR(ga,5,10,1,1,0xFF8888); // joystick + knob
    pR(ga,10,12,2,1,0xFFFF00); pR(ga,8,12,1,1,0x00FF00); // buttons
    // Marquee with glowing text line
    pR(ga,4,1,8,2,0xFF00FF); pR(ga,5,1,6,1,0xFFFFFF);
    // Coin slot
    pR(ga,5,16,2,3,0x777777); pR(ga,6,17,1,1,0x000000);
    ga.generateTexture('arcade_machine',16*PS,22*PS); ga.destroy();

    // Wizard NPC texture 16x22
    const gwiz = mk();
    // Robe / Body (Dark purple)
    pR(gwiz, 4, 8, 8, 12, 0x5B21B6); pR(gwiz, 3, 10, 10, 10, 0x4C1D95);
    pR(gwiz, 5, 9, 6, 11, 0x6D28D9);
    // Face & Beard
    pR(gwiz, 5, 5, 6, 4, 0xFFDDAD);
    pR(gwiz, 6, 6, 1, 1, 0x1E1B4B); pR(gwiz, 9, 6, 1, 1, 0x1E1B4B);
    pR(gwiz, 4, 8, 8, 6, 0xF3F4F6);
    pR(gwiz, 5, 14, 6, 3, 0xE5E7EB);
    // Pointy Wizard Hat
    pR(gwiz, 1, 5, 14, 2, 0x7C3AED); pR(gwiz, 2, 5, 12, 1, 0x8B5CF6);
    pR(gwiz, 4, 3, 8, 2, 0x7C3AED); pR(gwiz, 5, 1, 6, 2, 0x6D28D9); pR(gwiz, 6, 0, 4, 1, 0x8B5CF6);
    pR(gwiz, 7, 2, 2, 2, 0xF59E0B);
    // Staff & Glowing Orb
    pR(gwiz, 13, 4, 2, 16, 0x78350F);
    pR(gwiz, 12, 2, 4, 4, 0x06B6D4); pR(gwiz, 13, 3, 2, 2, 0x67E8F9);
    gwiz.generateTexture('wizard_npc', 16*PS, 22*PS); gwiz.destroy();

    // Player (4 walk frames)
    for(let fr=0; fr<4; fr++){
      const gp=mk();
      const by = (fr===1 || fr===3) ? 1 : 0; // Body down 1px when stepping
      
      pR(gp,3,0+by,8,1,K.T); pR(gp,2,1+by,10,3,K.T); pR(gp,2,1+by,1,3,K.t); pR(gp,11,1+by,1,3,K.V);
      pR(gp,2,1+by,10,1,K.t); pR(gp,2,3+by,10,1,K.V);
      pR(gp,1,4+by,12,2,K.T); pR(gp,1,4+by,12,1,K.t); pR(gp,1,5+by,12,1,K.V);
      pR(gp,2,4+by,10,1,0xEF4444); // Straw hat red ribbon
      pR(gp,3,6+by,8,5,K.X); pR(gp,3,6+by,1,5,K.x); pR(gp,10,6+by,1,5,K.x);
      pR(gp,4,8+by,1,1,K.J); pR(gp,5,8+by,1,1,K.N); pR(gp,8,8+by,1,1,K.J); pR(gp,9,8+by,1,1,K.N);
      pR(gp,3,9+by,1,1,0xF472B6); pR(gp,10,9+by,1,1,0xF472B6); // Rosy cheeks
      pR(gp,4,9+by,1,1,K.I); pR(gp,9,9+by,1,1,K.I); pR(gp,6,10+by,2,1,K.x);
      pR(gp,2,11+by,10,4,K.Z); pR(gp,2,11+by,1,4,K.z); pR(gp,11,11+by,1,4,K.z);
      pR(gp,0,11+by,3,4,K.Z); pR(gp,11,11+by,3,4,K.Z);
      pR(gp,0,14+by,3,1,K.X); pR(gp,11,14+by,3,1,K.X);
      pR(gp,4,12+by,6,2,K.q);
      pR(gp,6,15+by,2,1,0xF59E0B); // Overalls bronze belt buckle
      pR(gp,2,15+by,10,4,K.Q); pR(gp,2,15+by,1,4,K.q); pR(gp,11,15+by,1,4,K.q);
      
      let ly=0, ry=0;
      let lL=K.Q, rL=K.q, lB=K.R, rB=K.r; // Stand / idle shading
      if(fr===1) { ly=-2; lL=K.q; rL=K.Q; lB=K.r; rB=K.R; } // Left foot step
      else if(fr===3) { ry=-2; lL=K.Q; rL=K.q; lB=K.R; rB=K.r; } // Right foot step
      else if(fr===2) { lL=K.q; rL=K.Q; lB=K.r; rB=K.R; } // Opposite stand phase
      
      pR(gp,2,19+by+ly,4,3,lL); pR(gp,8,19+by+ry,4,3,rL);
      pR(gp,2,22+by+ly,5,2,lB); pR(gp,8,22+by+ry,5,2,rB);
      pR(gp,2,23+by+ly,5,1,K.r); pR(gp,8,23+by+ry,5,1,K.r);
      
      gp.generateTexture('farmer'+fr,14*PS,25*PS); gp.destroy();
    }

    // Crops (5 types × 3 stages)
    const CC=[
      [0xFF88B4,0xAA1844,0xFFCCE4],[0x88EE44,0x448A22,0xCCFF99],
      [0xFF4444,0xAA1111,0xFF9999],[0xFFCC00,0xCC8800,0xFFEE99],[0xFFEE44,0xCCAA00,0xFFFF99],
    ];
    CC.forEach(([M,D,Li],t)=>{
      const g1=mk();
      pR(g1,5,14,2,6,K.P); pR(g1,5,14,1,6,K.v);
      pR(g1,3,12,4,3,K.P); pR(g1,6,12,3,3,K.p); pR(g1,5,11,2,2,K.v);
      g1.generateTexture(`cr_${t}_1`,12*PS,20*PS); g1.destroy();

      const g2=mk();
      pR(g2,5,8,2,12,K.P); pR(g2,5,8,1,12,K.v);
      pR(g2,1,8,5,5,K.p); pR(g2,1,8,1,1,K.P); pR(g2,6,8,5,5,K.P); pR(g2,10,8,1,1,K.p);
      pR(g2,2,12,4,3,K.p); pR(g2,6,12,4,3,K.P);
      g2.generateTexture(`cr_${t}_2`,12*PS,20*PS); g2.destroy();

      const g3=mk();
      pR(g3,5,6,2,14,K.P); pR(g3,5,6,1,14,K.v);
      pR(g3,1,9,5,6,K.p); pR(g3,6,9,5,6,K.P);
      pR(g3,2,14,4,4,K.p); pR(g3,6,14,4,4,K.P);
      g3.fillStyle(D,1); g3.fillRect(3*PS,0,6*PS,6*PS);
      g3.fillStyle(M,1); g3.fillRect(4*PS,0,4*PS,5*PS); g3.fillRect(3*PS,1*PS,6*PS,3*PS);
      g3.fillStyle(Li,0.8); g3.fillRect(4*PS,0,2*PS,2*PS);
      g3.generateTexture(`cr_${t}_3`,12*PS,20*PS); g3.destroy();
    });

    // ── GINGER TABBY CAT NPC (12×16 pixels) ─────────────────────────────────
    const GC=()=>this.make.graphics({add:false});
    const gc2=GC();
    const GO=0xF5813F, GD=0xB84E10, GL=0xFFBB66;
    const WH2=0xFFFFFF, EY=0xFFCC44, PU=0x1A0800;
    const PK2=0xFFAA99;
    const pr2=(x,y,w,h,c)=>pR(gc2,x,y,w,h,c);
    // Ginger body
    pr2(1,8,10,8,GO);
    // White belly/chest
    pr2(3,9,6,7,WH2); pr2(3,8,6,1,WH2);
    // Dark tabby flank stripes
    pr2(1,9,1,6,GD); pr2(10,9,1,6,GD);
    pr2(2,11,1,1,GD); pr2(9,11,1,1,GD);
    pr2(2,13,1,1,GD); pr2(9,13,1,1,GD);
    // White front-paw socks
    pr2(2,14,2,2,WH2); pr2(8,14,2,2,WH2);
    pr2(2,15,1,1,PK2); pr2(3,15,1,1,PK2); pr2(8,15,1,1,PK2); pr2(9,15,1,1,PK2);
    // Ginger head
    pr2(1,2,10,6,GO);
    // White muzzle / chin blaze
    pr2(3,5,6,3,WH2);
    // M-mark forehead stripes
    pr2(3,2,2,2,GD); pr2(7,2,2,2,GD); pr2(5,2,2,1,GO); pr2(5,3,2,2,GD);
    // Amber eyes (big round)
    pr2(2,4,3,2,EY); pr2(7,4,3,2,EY);
    pr2(3,4,1,2,PU); pr2(8,4,1,2,PU); // pupils
    pr2(2,3,3,1,PU); pr2(7,3,3,1,PU); // eyelash outline
    // Pink nose
    pr2(5,6,2,1,PK2);
    // Whisker accent
    pr2(1,6,1,1,GL); pr2(10,6,1,1,GL);
    // Airplane ears (spread sideways flat)
    pr2(0,0,2,2,GO); pr2(10,0,2,2,GO);
    pr2(0,2,2,1,GD); pr2(10,2,2,1,GD); // ear tip stripe
    pr2(0,1,1,1,PK2); pr2(11,1,1,1,PK2); // inner ear pink
    // Tail (curling to right)
    pr2(11,10,2,1,GO); pr2(12,9,1,2,GO); pr2(12,8,1,1,GL); pr2(11,8,1,1,GD);
    gc2.generateTexture('cat_npc',13*PS,16*PS); gc2.destroy();
  }

  // ── WORLD ──────────────────────────────────────────────────────────────────
  _drawWorld(W, H){
    const rng = new Phaser.Math.RandomDataGenerator(['sv16']);
    for(let r=0; r*TILE<=H+TILE; r++) for(let cc=0; cc*TILE<=W+TILE; cc++){
      this.add.image(cc*TILE+TILE/2, r*TILE+TILE/2, 'grs'+rng.between(0,3))
        .setDisplaySize(TILE,TILE).setDepth(0);
    }
    const fW=PLOT_COLS*(PLOT_SIZE+PLOT_GAP)-PLOT_GAP, fH=3*(PLOT_SIZE+PLOT_GAP)-PLOT_GAP;
    this.farm = {x:W/2-fW/2, y:H/2-fH/2-30, w:fW, h:fH};

    // Cobblestone connecting paths (Widened & Spaced)
    const bx = this.farm.x + this.farm.w / 2;
    const by = this.farm.y - 95;
    const sx = this.farm.x + this.farm.w + 175;
    const sy = this.farm.y + this.farm.h / 2 + 25;
    const ax = this.farm.x - 200;
    const ay = this.farm.y + 20;
    const wx = this.farm.x + this.farm.w + 160;
    const wy = this.farm.y - 85;
    const apx = this.farm.x - 130;
    const apy = this.farm.y - 85;

    const pathPoints = [
      {x: bx, y: by+25}, {x: sx, y: sy}, {x: ax, y: ay}, {x: wx, y: wy}, {x: apx, y: apy+25}
    ];
    pathPoints.forEach(pt => {
      for(let dx = -20; dx <= 20; dx += 20){
        for(let dy = -20; dy <= 20; dy += 20){
          if(Math.random() < 0.65){
            this.add.image(pt.x + dx, pt.y + dy, 'path_stone')
              .setDisplaySize(TILE, TILE).setDepth(1).setAlpha(0.85);
          }
        }
      }
    });

    // Scatter wildflowers naturally
    const flowers = ['flw_red', 'flw_yellow', 'flw_purple'];
    const flowerList = [];
    for(let i=0; i<35; i++){
      const fx = Phaser.Math.Between(40, W-40);
      const fy = Phaser.Math.Between(40, H-40);
      if(fx < this.farm.x - 20 || fx > this.farm.x + this.farm.w + 20 || fy < this.farm.y - 20 || fy > this.farm.y + this.farm.h + 20){
        const fl = this.add.image(fx, fy, Phaser.Utils.Array.GetRandom(flowers))
          .setScale(1.2).setDepth(fy);
        flowerList.push(fl);
        this.tweens.add({ targets: fl, angle: { from: -6, to: 6 }, duration: 1500 + Math.random()*1000, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      }
    }

    // Micro World Details: Stone Well & Water Sparkles (Widened Placement)
    const wellX = this.farm.x - 190;
    const wellY = this.farm.y + this.farm.h + 85;
    this.add.ellipse(wellX, wellY+8, 44, 12, 0, 0.35).setDepth(wellY-1);
    this.add.image(wellX, wellY, 'stone_well').setOrigin(0.5, 1).setScale(1.5).setDepth(wellY);
    // Water sparkles inside well
    for(let i=0; i<4; i++){
      const sp = this.add.circle(wellX + (Math.random()-0.5)*18, wellY - 12 + (Math.random()-0.5)*12, 1.5, 0x67E8F9, 0.9).setDepth(wellY+1);
      this.tweens.add({ targets: sp, alpha: 0.2, scale: 1.8, duration: 800 + i*300, yoyo: true, repeat: -1 });
    }

    // Micro World Details: Barrels & Crates next to Shop
    const bxl = sx + 28, byl = sy - 10;
    this.add.image(bxl, byl, 'pixel_barrel').setOrigin(0.5, 1).setScale(1.4).setDepth(byl);
    this.add.image(bxl + 18, byl + 6, 'pixel_crate').setOrigin(0.5, 1).setScale(1.3).setDepth(byl+6);

    // Micro World Details: Directional Signpost
    const spX = bx - 60, spY = by + 20;
    this.add.image(spX, spY, 'signpost').setOrigin(0.5, 1).setScale(1.4).setDepth(spY);

    // Micro Animated Fauna: Fluttering Butterflies
    this._createButterflies(flowerList);

    // Warm Sunbeam Lighting Overlay
    const vignette = this.add.graphics().setDepth(9980).setScrollFactor(0);
    vignette.fillStyle(0xFF9900, 0.04);
    vignette.fillRect(0, 0, W, H);

    // Micro Ambient Particle: Falling Leaves from Apple Tree
    this._createFallingLeaves(apx, apy);
  }

  _createFallingLeaves(ax, ay){
    this.time.addEvent({
      delay: 2200,
      loop: true,
      callback: () => {
        const lf = this.add.rectangle(ax + Phaser.Math.Between(-20, 20), ay - 35, 4, 3, 0x86EFAC).setDepth(ay + 10);
        this.tweens.add({
          targets: lf,
          x: { value: `+=${Phaser.Math.Between(-30, 30)}`, ease: 'Sine.InOut' },
          y: ay + Phaser.Math.Between(10, 30),
          angle: 360,
          alpha: 0,
          duration: 3500,
          ease: 'Power1',
          onComplete: () => lf.destroy()
        });
      }
    });
  }

  _createButterflies(flowerList){
    if(!flowerList || !flowerList.length) return;
    for(let i=0; i<5; i++){
      const targetFlw = Phaser.Utils.Array.GetRandom(flowerList);
      const bf = this.add.image(targetFlw.x, targetFlw.y - 12, 'bf_open').setDepth(targetFlw.y + 50);
      
      // Flapping wings animation using texture toggle
      this.time.addEvent({
        delay: 180 + Math.random()*60,
        loop: true,
        callback: () => {
          if(bf && bf.active){
            bf.setTexture(bf.texture.key === 'bf_open' ? 'bf_flap' : 'bf_open');
          }
        }
      });

      // Gentle fluttering path
      this.tweens.add({
        targets: bf,
        x: { value: `+=${Phaser.Math.Between(-60, 60)}`, ease: 'Sine.InOut' },
        y: { value: `+=${Phaser.Math.Between(-40, 40)}`, ease: 'Sine.InOut' },
        duration: 3000 + Math.random()*2000,
        yoyo: true,
        repeat: -1
      });
    }
  }

  _createAmbientParticles(W, H){
    for(let i=0; i<30; i++){
      const px = Phaser.Math.Between(0, W);
      const py = Phaser.Math.Between(0, H);
      const col = Math.random() < 0.4 ? 0xFDE047 : (Math.random() < 0.7 ? 0xA855F7 : 0x67E8F9);
      const p = this.add.circle(px, py, Phaser.Math.Between(2, 4), col, Math.random()*0.6 + 0.2).setDepth(9985);
      
      this.tweens.add({
        targets: p,
        x: px + Phaser.Math.Between(-40, 40),
        y: py + Phaser.Math.Between(-60, 20),
        alpha: { from: p.alpha, to: 0.1 },
        duration: 3000 + Math.random()*3000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut'
      });
    }
  }

  // ── SHOP NPC ───────────────────────────────────────────────────────────────
  _createShopNPC(W, H){
    const sx = this.farm.x + this.farm.w + 175;
    const sy = this.farm.y + this.farm.h / 2 + 25;
    this.shopNPC = this.add.image(sx, sy, 'shop_sign')
      .setOrigin(0.5, 1).setScale(1.2).setDepth(sy);

    this.tweens.add({ targets: this.shopNPC, y: sy - 4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    this.shopHint = this.add.text(sx, sy + 10, '🏪 SHOP\n[SPACE]', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'14px',
      color:'#FFD700', stroke:'#000', strokeThickness:3, align:'center'
    }).setOrigin(0.5, 0).setDepth(sy+1).setAlpha(0);

    this.shopX = sx; this.shopY = sy;
  }

  // ── NOTICE BOARD ───────────────────────────────────────────────────────────
  _createBoardNPC(W, H){
    const bx = this.farm.x + this.farm.w / 2;
    const by = this.farm.y - 95;
    this.add.ellipse(bx, by+6, 40, 10, 0, 0.3).setDepth(by-1);
    this.boardSprite = this.add.image(bx, by, 'notice_board').setOrigin(0.5,1).setScale(1.5).setDepth(by);
    this.boardHint = this.add.text(bx, by-40, '📋 Minigame\n[SPACE]', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'12px',
      color:'#FF88FF', stroke:'#000', strokeThickness:3, align:'center'
    }).setOrigin(0.5,1).setDepth(by+1).setAlpha(0);
    this.tweens.add({targets:this.boardHint, y:this.boardHint.y-3, duration:700, yoyo:true, repeat:-1});
    this.boardX = bx; this.boardY = by;
  }

  // ── ARCADE MACHINE ─────────────────────────────────────────────────────────
  _createArcadeNPC(W, H){
    const ax = this.farm.x - 200;
    const ay = this.farm.y + 20;
    this.add.ellipse(ax, ay+6, 40, 10, 0, 0.35).setDepth(ay-1);
    this.arcadeSprite = this.add.image(ax, ay, 'arcade_machine').setOrigin(0.5,1).setScale(1.5).setDepth(ay);
    this.arcadeHint = this.add.text(ax, ay-60, '👾 ARCADE\n[SPACE]', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'12px',
      color:'#00FFFF', stroke:'#000', strokeThickness:3, align:'center'
    }).setOrigin(0.5,1).setDepth(ay+1).setAlpha(0);
    this.tweens.add({targets:this.arcadeHint, y:this.arcadeHint.y-3, duration:600, yoyo:true, repeat:-1});
    this.arcadeX = ax; this.arcadeY = ay;
  }

  // ── WIZARD NPC ─────────────────────────────────────────────────────────────
  _createWizardNPC(W, H){
    const wx = this.farm.x + this.farm.w + 160;
    const wy = this.farm.y - 85;
    this.add.ellipse(wx, wy+6, 40, 10, 0, 0.35).setDepth(wy-1);
    this.wizardSprite = this.add.image(wx, wy, 'wizard_npc').setOrigin(0.5,1).setScale(1.6).setDepth(wy);
    this.tweens.add({ targets: this.wizardSprite, y: wy - 4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    
    this.wizardHint = this.add.text(wx, wy-62, '⚡ SPELL DUEL\n[SPACE]', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'12px',
      color:'#A855F7', stroke:'#000', strokeThickness:3, align:'center'
    }).setOrigin(0.5,1).setDepth(wy+1).setAlpha(0);
    this.tweens.add({ targets: this.wizardHint, y: this.wizardHint.y - 3, duration: 600, yoyo: true, repeat: -1 });
    
    this.add.text(wx, wy+6, 'Merlin', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'10px',
      color:'#C084FC', stroke:'#000', strokeThickness:2
    }).setOrigin(0.5,0).setDepth(wy+1);

    this.wizardX = wx; this.wizardY = wy;
  }

  // ── CAT NPC ────────────────────────────────────────────────────────────────
  _createCatNPC(W, H){
    const cx = this.farm.x - 120;
    const cy = this.farm.y + this.farm.h + 75;
    this.add.ellipse(cx,cy+2,36,10,0,0.35).setDepth(cy-1);
    this.catSprite = this.add.image(cx, cy, 'cat_npc')
      .setOrigin(0.5,1).setScale(1.8).setDepth(cy);
    this.tweens.add({ targets:this.catSprite, y:cy-3, duration:1200, yoyo:true, repeat:-1, ease:'Sine.InOut' });
    this.catHint = this.add.text(cx, cy-52, '🐱 야옹\n[SPACE]', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'12px',
      color:'#FFCC44', stroke:'#000', strokeThickness:3, align:'center'
    }).setOrigin(0.5,1).setDepth(cy+1).setAlpha(0);
    this.tweens.add({ targets:this.catHint, y:this.catHint.y-3, duration:700, yoyo:true, repeat:-1 });
    this.add.text(cx, cy+6, 'Muop', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'10px',
      color:'#FFD700', stroke:'#000', strokeThickness:2
    }).setOrigin(0.5,0).setDepth(cy+1);
    this.catX=cx; this.catY=cy;
  }

  // ── DUNGEON PORTAL NPC ─────────────────────────────────────────────────────
  _createPortalNPC(W, H){
    const px = this.farm.x + this.farm.w + 140;
    const py = this.farm.y + this.farm.h + 80;
    this.add.ellipse(px, py+6, 50, 12, 0, 0.4).setDepth(py-1);
    this.portalSprite = this.add.image(px, py, 'dungeon_portal').setOrigin(0.5,1).setScale(1.5).setDepth(py);
    this.tweens.add({ targets: this.portalSprite, scaleX: 1.55, scaleY: 1.45, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    
    this.portalHint = this.add.text(px, py-75, '🌀 DUNGEON\n[SPACE]', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'12px',
      color:'#EC4899', stroke:'#000', strokeThickness:3, align:'center'
    }).setOrigin(0.5,1).setDepth(py+1).setAlpha(0);
    this.tweens.add({ targets: this.portalHint, y: this.portalHint.y - 3, duration: 600, yoyo: true, repeat: -1 });
    
    this.add.text(px, py+6, 'Dungeon Portal', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'10px',
      color:'#F472B6', stroke:'#000', strokeThickness:2
    }).setOrigin(0.5,0).setDepth(py+1);

    this.portalX = px; this.portalY = py;
  }

  // ── FISHING SPOT NPC / DOCK ────────────────────────────────────────────────
  _createFishingSpot(W, H){
    const fx = this.farm.x + this.farm.w / 2;
    const fy = this.farm.y + this.farm.h + 165;

    // Crystal Pond Blue Water Ellipse
    const pond = this.add.ellipse(fx, fy + 20, 240, 70, 0x0284C7, 0.85).setDepth(fy - 5);
    this.tweens.add({ targets: pond, scaleX: 1.05, scaleY: 0.95, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    // Floating Lily Pads
    this.add.text(fx - 60, fy + 15, '🪷', {fontSize:'18px'}).setDepth(fy-4);
    this.add.text(fx + 70, fy + 25, '🪷', {fontSize:'16px'}).setDepth(fy-4);

    // Fishing Dock Pier
    this.add.ellipse(fx, fy+8, 60, 14, 0, 0.4).setDepth(fy-1);
    this.dockSprite = this.add.image(fx, fy, 'fishing_dock').setOrigin(0.5,1).setScale(1.5).setDepth(fy);
    
    this.fishHint = this.add.text(fx, fy-60, '🎣 CRYSTAL POND\n[SPACE]', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'12px',
      color:'#38BDF8', stroke:'#000', strokeThickness:3, align:'center'
    }).setOrigin(0.5,1).setDepth(fy+1).setAlpha(0);
    this.tweens.add({ targets: this.fishHint, y: this.fishHint.y - 3, duration: 700, yoyo: true, repeat: -1 });

    this.add.text(fx, fy+6, 'Fishing Dock', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'10px',
      color:'#7DD3FC', stroke:'#000', strokeThickness:2
    }).setOrigin(0.5,0).setDepth(fy+1);

    this.fishX = fx; this.fishY = fy;
  }

  // ── APPLE TREE ─────────────────────────────────────────────────────────────
  _createAppleTree(W, H){
    const ax = this.farm.x - 130;
    const ay = this.farm.y - 85;
    // Shadow
    this.add.ellipse(ax, ay, 120, 30, 0, 0.3).setDepth(ay);
    // Tree sprite (starts with unripe texture)
    this.appleTreeSprite = this.add.image(ax, ay, 'apple_tree')
      .setOrigin(0.5, 1).setScale(2.5).setDepth(ay+1);
      
    // Trunk collision zone
    const trunkZone = this.add.zone(ax, ay - 10, 80, 40);
    this.physics.add.existing(trunkZone, true);
    this.physics.add.collider(this.player, trunkZone);
    // Gentle sway
    this.tweens.add({
      targets: this.appleTreeSprite,
      angle: { from: -1.5, to: 1.5 },
      duration: 2800, yoyo: true, repeat: -1, ease: 'Sine.InOut'
    });
    this.appleTreeLabel = this.add.text(ax, ay - 240, '🍎 HARVEST!\n[SPACE]', {
      fontFamily: '"Press Start 2P",monospace', fontSize: '14px',
      color: '#FFFFFF', stroke: '#000', strokeThickness: 4, align: 'center'
    }).setOrigin(0.5, 1).setDepth(ay + 100).setAlpha(0);
    this.tweens.add({ targets: this.appleTreeLabel, y: this.appleTreeLabel.y - 8,
      duration: 600, yoyo: true, repeat: -1 });
    // Glow ring (hidden until ripe)
    this.appleTreeGlow = this.add.graphics().setDepth(ay - 1);
    this.tweens.add({ targets: this.appleTreeGlow, alpha: { from: 1, to: 0.1 },
      duration: 750, yoyo: true, repeat: -1 });
    // Timer countdown label
    this.appleTreeTimer = this.add.text(ax, ay + 22, '', {
      fontFamily: '"Press Start 2P",monospace', fontSize: '10px',
      color: '#AAFFAA', stroke: '#000', strokeThickness: 2, align: 'center'
    }).setOrigin(0.5, 0).setDepth(ay + 10);
    // Name tag
    this.add.text(ax, ay + 34, '🍎 Apple Tree', {
      fontFamily: '"Press Start 2P",monospace', fontSize: '10px',
      color: '#FFD700', stroke: '#000', strokeThickness: 2, align: 'center'
    }).setOrigin(0.5, 0).setDepth(ay + 10);
    // State
    this.appleX = ax; this.appleY = ay;
    this.appleRipeAt  = appleTreeSave.ripeAt  || (Date.now() + FarmScene.APPLE_RIPEN_MS);
    this.appleRipe    = appleTreeSave.ripe     || false;
    this._updateAppleTree();
  }

  _updateAppleTree(){
    if(!this.appleTreeSprite) return;
    if(this.appleRipe){
      this.appleTreeSprite.setTexture('apple_tree_ripe');
      this.appleTreeLabel.setAlpha(1);
      this.appleTreeGlow.clear();
      this.appleTreeGlow.fillStyle(0xFFDD44, 0.25);
      this.appleTreeGlow.fillEllipse(this.appleX, this.appleY + 4, 150, 40);
      this.appleTreeTimer.setText('');
    } else {
      this.appleTreeSprite.setTexture('apple_tree');
      this.appleTreeLabel.setAlpha(0);
      this.appleTreeGlow.clear();
    }
  }

  _tickAppleTree(){
    if(this.appleRipe) return;
    const now = Date.now();
    const rem = Math.max(0, this.appleRipeAt - now);
    if(rem <= 0){
      this.appleRipe = true;
      _saveAppleTree(this);
      this._updateAppleTree();
      showToast('🍎 Apple Tree is ripe! Go harvest it!');
      return;
    }
    const secs = Math.ceil(rem / 1000);
    const m = Math.floor(secs / 60), s = secs % 60;
    this.appleTreeTimer.setText(`🍎 ${m}m ${String(s).padStart(2,'0')}s`);
  }

  harvestAppleTree(){
    if(!this.appleRipe) return;
    // Pick a random word from unlocked levels for Phase 3 quiz
    const word = this._pickWord();
    appleTreeQuizPending = true;
    openQuiz(word, null, 3);
  }

  onAppleHarvested(){
    // Reward: big gold bonus
    const bonus = 15 + Math.floor(Math.random() * 6); // 15-20 gold
    addGold(bonus);
    this._flyCoins(this.appleX, this.appleY - 30, Math.min(bonus, 8));
    this._label(this.appleX, this.appleY - 30, `+${bonus} 🍎 BONUS!`);
    // Start regrowth timer
    this.appleRipe    = false;
    this.appleRipeAt  = Date.now() + FarmScene.APPLE_RIPEN_MS;
    _saveAppleTree(this);
    this._updateAppleTree();
    showToast(`🍎 Harvested! +${bonus} gold! Tree will regrow in 2 min.`, 4000);
  }

  // ── PLOTS ──────────────────────────────────────────────────────────────────
  _createPlots(W, H){
    // 15 slots (3x5) – open-world ready: first 9 active, more unlock with levels
    const MAX=15, ROWS=5;
    const activeCnt = Math.min(MAX, 9 + (unlockedLevels.length-1)*3);
    for(let i=0;i<MAX;i++){
      const col=i%PLOT_COLS, row=Math.floor(i/PLOT_COLS);
      const px=this.farm.x+col*(PLOT_SIZE+PLOT_GAP)+PLOT_SIZE/2;
      const py=this.farm.y+row*(PLOT_SIZE+PLOT_GAP)+PLOT_SIZE/2;
      const active=i<activeCnt;
      const shad=this.add.ellipse(px,py+PLOT_SIZE/2-2,PLOT_SIZE*0.85,10,0,active?0.3:0.1).setDepth(1);
      const tile=this.add.image(px,py,'drt_dry').setDisplaySize(PLOT_SIZE,PLOT_SIZE)
        .setAlpha(active?1:0.25).setDepth(2);
      if(!active) this.add.text(px,py,'🔒',{fontSize:'20px'}).setOrigin(0.5).setDepth(3);
      const body=this.physics.add.staticImage(px,py).setVisible(false);
      body.setCircle(PLOT_SIZE*0.4).refreshBody();
      // sState: ''=empty '1'=seedling '2'=wilting(P2 ready) '3'=sprout '4'=ripe
      this.plots.push({tile,shad,body,x:px,y:py,sState:'',ko:null,word:null,
        index:i,plant:null,glow:null,hintLabel:null,active,plantedAt:0});
    }
    this._restorePlots();
  }

  // Dynamically unlock plots when buying new levels (no reload needed)
  refreshPlotAccess(){
    const MAX=15;
    const activeCnt = Math.min(MAX, 9 + (unlockedLevels.length-1)*3);
    this.plots.forEach((p,i) => {
      if(i < activeCnt && !p.active){
        p.active = true;
        p.tile.setAlpha(1);
        p.shad.setAlpha(0.3);
        // Remove lock emoji overlay
        this.children.list
          .filter(c => c.type === 'Text' && c.text === '🔒' &&
                  Math.abs(c.x - p.x) < 5 && Math.abs(c.y - p.y) < 5)
          .forEach(c => c.destroy());
      }
    });
  }

  _createPlayer(W, H){
    this.player=this.physics.add.sprite(W/2, H-80,'farmer0')
      .setCollideWorldBounds(true).setDrag(900,900).setDepth(500);
    this.pShadow=this.add.ellipse(0,0,30,10,0,0.3).setDepth(499);
  }

  _addPlotLabels(){
    this.plots.forEach((p,i)=>{
      this.add.text(p.x,p.y+PLOT_SIZE/2+3,CROP_ICONS[i%5],{fontSize:'18px'})
        .setOrigin(0.5,0).setAlpha(0.4).setDepth(3);
    });
  }

  // ── UPDATE ─────────────────────────────────────────────────────────────────
  update(_t, dt){
    if(!this.player||!this.keys) return;
    this.player.setDepth(this.player.y);
    this.pShadow.setPosition(this.player.x,this.player.y+18).setDepth(this.player.y-1);

    if(!playerLocked){
      const vx=(this.keys.A.isDown || this.keys.LEFT.isDown?-1:0)+(this.keys.D.isDown || this.keys.RIGHT.isDown?1:0);
      const vy=(this.keys.W.isDown || this.keys.UP.isDown?-1:0)+(this.keys.S.isDown || this.keys.DOWN.isDown?1:0);
      const len=Math.sqrt(vx*vx+vy*vy)||1;
      this.player.setVelocity((vx/len)*PLAYER_SPD,(vy/len)*PLAYER_SPD);
      if(vx!==0||vy!==0){
        if(vx<0) this.player.setFlipX(true);
        if(vx>0) this.player.setFlipX(false);
        this.walkTimer+=(dt||16);
        if(this.walkTimer>160){
          this.walkFrame=(this.walkFrame+1)%4;
          this.player.setTexture('farmer'+this.walkFrame);
          this.walkTimer=0;
          
          // Walking puff effect on stepping frames (1 and 3)
          if(this.walkFrame===1 || this.walkFrame===3){
            const dx = this.player.flipX ? 7 : -7;
            const puff = this.add.ellipse(this.player.x + dx, this.player.y + 14, 6, 4, 0xDDCCAA, 0.6).setDepth(this.player.y - 2);
            this.tweens.add({targets:puff, scale:2, y:puff.y-8, alpha:0, duration:400, ease:'Power1', onComplete:()=>puff.destroy()});
          }
        }
      } else {
        this.player.setTexture('farmer0'); this.walkTimer=0;
      }
    } else this.player.setVelocity(0,0);

    // Show shop hint label when nearby
    if(this.shopNPC && this.shopHint){
      const nearShop = Phaser.Math.Distance.Between(this.player.x,this.player.y,this.shopX,this.shopY) < 90;
      this.shopHint.setAlpha(nearShop ? 1 : 0);
    }
    // Show cat hint label when nearby
    if(this.catHint){
      const nearCat = Phaser.Math.Distance.Between(this.player.x,this.player.y,this.catX,this.catY) < 80;
      this.catHint.setAlpha(nearCat ? 1 : 0);
      if(this.catSprite) this.catSprite.setFlipX(this.player.x < this.catX ? true : false);
    }

    // Show board hint label when nearby
    if(this.boardHint){
      const nearBoard = Phaser.Math.Distance.Between(this.player.x,this.player.y,this.boardX,this.boardY) < 80;
      this.boardHint.setAlpha(nearBoard ? 1 : 0);
    }
    // Show arcade hint label when nearby
    if(this.arcadeHint){
      const nearArcade = Phaser.Math.Distance.Between(this.player.x,this.player.y,this.arcadeX,this.arcadeY) < 80;
      this.arcadeHint.setAlpha(nearArcade ? 1 : 0);
    }
    // Show wizard hint label when nearby
    if(this.wizardHint){
      const nearWizard = Phaser.Math.Distance.Between(this.player.x,this.player.y,this.wizardX,this.wizardY) < 85;
      this.wizardHint.setAlpha(nearWizard ? 1 : 0);
    }
    // Show dungeon portal hint label when nearby
    if(this.portalHint){
      const nearPortal = Phaser.Math.Distance.Between(this.player.x,this.player.y,this.portalX,this.portalY) < 85;
      this.portalHint.setAlpha(nearPortal ? 1 : 0);
    }
    // Show fishing hint label when nearby
    if(this.fishHint){
      const nearFish = Phaser.Math.Distance.Between(this.player.x,this.player.y,this.fishX,this.fishY) < 85;
      this.fishHint.setAlpha(nearFish ? 1 : 0);
    }

    if(Phaser.Input.Keyboard.JustDown(this.spaceKey)&&!playerLocked&&!quizOpen&&!shopOpen&&!memoryOpen&&!trophyOpen&&!duelOpen) this._interact();
    // SRS timer: check every 8s if any plant needs state advance
    this._timerAcc=(this._timerAcc||0)+(dt||16);
    if(this._timerAcc>8000){this._timerAcc=0;this._checkSRS();}
    // Apple tree timer: update every second
    this._appleAcc=(this._appleAcc||0)+(dt||16);
    if(this._appleAcc>1000){this._appleAcc=0;this._tickAppleTree();}
    // SPACE target indicator (shows which object will be targeted)
    if(!playerLocked&&!quizOpen&&!shopOpen&&!catDialogOpen) this._updateTargetHighlight();
    else if(this._tHL){ this._tHL.clear(); if(this._tLbl) this._tLbl.setAlpha(0); }
  }


  // ── SPACE TARGET HIGHLIGHT ─────────────────────────────────────────────────
  _updateTargetHighlight(){
    // Lazy-create graphics + label once
    if(!this._tHL){
      this._tHL  = this.add.graphics().setDepth(9997);
      this._tLbl = this.add.text(0,0,'',{
        fontFamily:'Arial,sans-serif', fontSize:'16px',
        color:'#fff', stroke:'#000', strokeThickness:4, align:'center',
        backgroundColor:'rgba(0,0,0,0.55)', padding:{x:6,y:3}
      }).setOrigin(0.5,1).setDepth(9998);
    }
    const near=p=>Phaser.Math.Distance.Between(this.player.x,this.player.y,p.x,p.y)<PLOT_SIZE+26;
    const pulse=0.6+0.4*Math.sin(Date.now()/220);
    this._tHL.clear();
    let hx=null,hy=null,lbl='',col=0xFFD700,hw=PLOT_SIZE,hh=PLOT_SIZE;

    // Priority mirrors _interact(): apple > ripe > wilt > cat > shop > empty
    if(this.appleRipe&&this.appleX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.appleX,this.appleY-30)<90){
      hx=this.appleX;hy=this.appleY-50;lbl='[SPACE] Harvest 🍎 Bonus!';col=0xFF3333;hw=60;hh=70;
    }
    if(hx===null) for(const p of this.plots){
      if(p.sState==='4'&&near(p)){hx=p.x;hy=p.y;lbl='[SPACE] Harvest +Gold';col=0xFFD700;break;}
    }
    if(hx===null) for(const p of this.plots){
      if(p.sState==='2'&&near(p)){hx=p.x;hy=p.y;lbl='[SPACE] Water';col=0x55CCFF;break;}
    }
    if(hx===null&&this.catX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.catX,this.catY)<82){
      hx=this.catX;hy=this.catY-20;lbl='[SPACE] Talk to Muop';col=0xFF88CC;hw=44;hh=44;
    }
    if(hx===null&&this.wizardX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.wizardX,this.wizardY)<85){
      hx=this.wizardX;hy=this.wizardY-25;lbl='[SPACE] Spell Duel';col=0xA855F7;hw=44;hh=50;
    }
    if(hx===null&&this.portalX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.portalX,this.portalY)<85){
      hx=this.portalX;hy=this.portalY-30;lbl='[SPACE] Enter Dungeon';col=0xEC4899;hw=50;hh=60;
    }
    if(hx===null&&this.fishX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.fishX,this.fishY)<85){
      hx=this.fishX;hy=this.fishY-25;lbl='[SPACE] Start Fishing';col=0x38BDF8;hw=50;hh=50;
    }
    if(hx===null&&this.arcadeX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.arcadeX,this.arcadeY)<80){
      hx=this.arcadeX;hy=this.arcadeY-30;lbl='[SPACE] Play Retro Shooter';col=0x00FFFF;hw=44;hh=50;
    }
    if(hx===null&&this.boardX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.boardX,this.boardY)<82){
      hx=this.boardX;hy=this.boardY-20;lbl='[SPACE] Play Memory Match';col=0xFF88FF;hw=44;hh=44;
    }
    if(hx===null&&this.shopX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.shopX,this.shopY)<92){
      hx=this.shopX;hy=this.shopY-20;lbl='[SPACE] Open Shop';col=0xFFAA44;hw=50;hh=60;
    }
    if(hx===null) for(const p of this.plots){
      if(p.sState===''&&p.active&&near(p)){hx=p.x;hy=p.y;lbl='[SPACE] Plant new';col=0x44FF88;break;}
    }

    if(hx!==null){
      // Subtle Corner brackets
      const ca=12; const pad=8;
      this._tHL.fillStyle(col, 0.8 + pulse*0.2);
      [[hx-hw/2-pad,hy-hh/2-pad], [hx+hw/2+pad,hy-hh/2-pad], [hx-hw/2-pad,hy+hh/2+pad], [hx+hw/2+pad,hy+hh/2+pad]].forEach(([cx,cy], i)=>{
        if(i===0) { this._tHL.fillRect(cx,cy-1,ca,3); this._tHL.fillRect(cx-1,cy,3,ca); } // Top-left
        if(i===1) { this._tHL.fillRect(cx-ca,cy-1,ca,3); this._tHL.fillRect(cx-1,cy,3,ca); } // Top-right
        if(i===2) { this._tHL.fillRect(cx,cy-1,ca,3); this._tHL.fillRect(cx-1,cy-ca,3,ca); } // Bottom-left
        if(i===3) { this._tHL.fillRect(cx-ca,cy-1,ca,3); this._tHL.fillRect(cx-1,cy-ca,3,ca); } // Bottom-right
      });
      // Action label above object
      this._tLbl.setPosition(hx, hy-hh/2-14).setText(lbl).setAlpha(0.9+pulse*0.1);
    } else {
      this._tLbl.setAlpha(0);
    }
  }

  _checkSRS(){
    const now=Date.now(); let changed=false;
    this.plots.forEach(p=>{
      if(!p.ko) return;
      const s=getSrs(p.ko);
      if(p.sState==='1' && s.p2At && now>=s.p2At){ this._setState(p,'2',p.ko); changed=true; }
      if(p.sState==='3' && s.p3At && now>=s.p3At){ this._setState(p,'4',p.ko); changed=true; }
    });
    if(changed) savePlotsFn();
  }

  // ── INTERACT (SRS-aware priority) ─────────────────────────────────────────
  _interact(){
    const near=p=>Phaser.Math.Distance.Between(this.player.x,this.player.y,p.x,p.y)<PLOT_SIZE+24;
    // Apple Tree harvest (highest priority when ripe)
    if(this.appleRipe&&this.appleX&&
       Phaser.Math.Distance.Between(this.player.x,this.player.y,this.appleX,this.appleY-30)<90){
      this.tweens.add({targets:this.appleTreeSprite,angle:12,duration:80,yoyo:true,repeat:2});
      this.harvestAppleTree(); return;
    }
    // P1: ripe crop plots (Phase 3 harvest)
    for(const p of this.plots){ if(p.sState==='4'&&near(p)){openQuiz(p.word,p,3);return;} }
    // P2: wilting plants (Phase 2 review)
    for(const p of this.plots){ if(p.sState==='2'&&near(p)){openQuiz(p.word,p,2);return;} }
    // Cat NPC
    if(this.catX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.catX,this.catY)<80){
      this.tweens.add({targets:this.catSprite,scale:{from:1.8,to:2.2},duration:100,yoyo:true,ease:'Back.Out(2)'});
      showCatDialog(); return;
    }
    // Wizard NPC
    if(this.wizardX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.wizardX,this.wizardY)<85){
      this.tweens.add({targets:this.wizardSprite,scale:{from:1.6,to:1.9},duration:120,yoyo:true,ease:'Back.Out(2)'});
      openSpellDuel(); return;
    }
    // Dungeon Portal
    if(this.portalX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.portalX,this.portalY)<85){
      this.tweens.add({targets:this.portalSprite,scale:{from:1.5,to:1.8},duration:120,yoyo:true,ease:'Back.Out(2)'});
      this.scene.pause();
      this.scene.launch('DungeonScene');
      return;
    }
    // Fishing Dock
    if(this.fishX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.fishX,this.fishY)<85){
      this.tweens.add({targets:this.dockSprite,scale:{from:1.5,to:1.7},duration:120,yoyo:true,ease:'Back.Out(2)'});
      this.scene.pause();
      this.scene.launch('FishingScene');
      return;
    }
    // Arcade
    if(this.arcadeX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.arcadeX,this.arcadeY)<80){
      this.tweens.add({targets:this.arcadeSprite,scale:{from:1.5,to:1.6},duration:100,yoyo:true});
      this.scene.pause();
      this.scene.launch('ArcadeScene');
      return;
    }
    // Board
    if(this.boardX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.boardX,this.boardY)<80){
      this.tweens.add({targets:this.boardSprite,angle:5,duration:100,yoyo:true,repeat:1});
      openMemoryGame(); return;
    }
    // Shop
    if(this.shopX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.shopX,this.shopY)<90){openShop();return;}
    // P3: empty plots (Phase 1 plant, full hints)
    for(const p of this.plots){
      if(p.sState===''&&p.active&&near(p)){
        this.tweens.add({targets:p.tile,scaleX:0.85,scaleY:0.85,duration:90,yoyo:true});
        openQuiz(this._pickWord(),p,1); return;
      }
    }
  }

  // ── SRS ADVANCE PLOT (called after correct quiz answer) ─────────────────────
  advancePlot(plot, word, phase){
    const ko=word.ko, now=Date.now(), t=plot.index%5;
    if(phase===1){
      // P1 correct: plant seedling, set P2 timer
      plot.word=word; plot.ko=ko; plot.plantedAt=now;
      setSrs(ko,{p2At:now+SR1,p3At:null});
      plot.tile.setTexture('drt_wet').setDisplaySize(PLOT_SIZE,PLOT_SIZE);
      const crop=this.add.image(plot.x,plot.y-4,`cr_${t}_1`).setOrigin(0.5,0.85).setScale(0).setDepth(plot.y+5);
      plot.plant=crop;
      this.tweens.add({targets:crop,scale:1,duration:300,ease:'Back.Out(3)'});
      this._sparkle(plot.x,plot.y); this._label(plot.x,plot.y,'Planted!');
      this._setState(plot,'1',ko);
    } else if(phase===2){
      // P2 correct: grow to sprout, set P3 timer
      const srs=getSrs(ko); setSrs(ko,{p3At:now+SR2});
      if(plot.plant) plot.plant.setTexture(`cr_${t}_2`).clearTint();
      this.tweens.add({targets:plot.plant,scale:{from:0.7,to:1.1},duration:320,ease:'Back.Out(2)',
        onComplete:()=>this.tweens.add({targets:plot.plant,scale:1,duration:150})});
      if(plot.hintLabel){plot.hintLabel.destroy();plot.hintLabel=null;}
      if(plot.glow){plot.glow.destroy();plot.glow=null;}
      this._leaves(plot.x,plot.y-8); this._label(plot.x,plot.y,'Watered!');
      this._setState(plot,'3',ko);
    } else {
      // P3 correct: HARVEST! Gold!
      const prev=harvestCounts.get(ko)||0;
      const reward=Math.max(3, Math.floor(10 * Math.pow(0.85, prev)));
      // Curve: 10→8→7→6→5→4→4→3→3→3... (smooth diminishing returns)
      harvestCounts.set(ko,prev+1);
      setSrs(ko,{p2At:null,p3At:null,harvests:(getSrs(ko).harvests||0)+1});
      plantedWords.delete(ko);
      this._flyCoins(plot.x,plot.y,reward);
      this._label(plot.x,plot.y,prev===0?`+${reward} GOLD! NEW!`:`+${reward} GOLD!`);
      this.time.delayedCall(350,()=>{addGold(reward);updateVocabBook();});
      this._clearPlot(plot);
    }
    savePlotsFn();
  }

  // Wrong answer at P3 -> regression back to P2 wilting
  regressionPlot(plot,word){
    const ko=word.ko, t=plot.index%5;
    setSrs(ko,{p3At:null,p2At:null}); // state '2' is enough, p2At meaningless here
    if(plot.glow){plot.glow.destroy();plot.glow=null;}
    if(plot.hintLabel){plot.hintLabel.destroy();plot.hintLabel=null;}
    if(plot.plant) plot.plant.setTexture(`cr_${t}_1`);
    this.tweens.add({targets:plot.plant,scale:0.5,duration:200,ease:'Power2.In',
      onComplete:()=>{
        if(plot.plant) plot.plant.setTint(0xFFCC44);
        this.tweens.add({targets:plot.plant,scale:1,duration:300,ease:'Back.Out(2)'});
      }});
    this._setState(plot,'2',ko);
    showToast('Plant regressed! Water it again.');
    savePlotsFn();
  }

  // Apply visual state to a plot
  _setState(plot, s, ko){
    plot.sState=s;
    const t=plot.index%5;
    if(s===''){  // empty
      plot.tile.setTexture('drt_dry').setAlpha(plot.active?1:0.25).clearTint();
      plot.shad.setAlpha(plot.active?0.3:0.1);
    } else if(s==='1'){  // seedling (healthy)
      plot.tile.setTexture('drt_wet').clearTint();
      if(plot.plant) plot.plant.clearTint();
    } else if(s==='2'){  // wilting - P2 review needed
      if(plot.plant) plot.plant.setTexture(`cr_${t}_1`).setTint(0xFFCC44);
      this._addLabel(plot,'💧','#FFD700');
    } else if(s==='3'){  // sprout healthy
      if(plot.plant) plot.plant.clearTint();
    } else if(s==='4'){  // ripe - harvest!
      if(plot.plant) plot.plant.setTexture(`cr_${t}_3`).clearTint();
      this._addGlow(plot,0xFFD700);
      this._addLabel(plot,'SPACE','#FFD700');
    }
  }

  _addGlow(plot,col){
    if(plot.glow) plot.glow.destroy();
    const g=this.add.graphics().setDepth(plot.y+4);
    g.lineStyle(4,col,1); g.strokeRect(plot.x-PLOT_SIZE/2,plot.y-PLOT_SIZE/2,PLOT_SIZE,PLOT_SIZE);
    plot.glow=g; this.tweens.add({targets:g,alpha:{from:1,to:0.15},duration:700,yoyo:true,repeat:-1});
  }
  _addLabel(plot,txt,color){
    if(plot.hintLabel) plot.hintLabel.destroy();
    const l=this.add.text(plot.x,plot.y-PLOT_SIZE/2-6,txt,{
      fontFamily:'"Press Start 2P",monospace',fontSize:'12px',color,stroke:'#000',strokeThickness:3
    }).setOrigin(0.5,1).setDepth(plot.y+6);
    plot.hintLabel=l;
    this.tweens.add({targets:l,y:l.y-3,duration:550,yoyo:true,repeat:-1});
  }
  _clearPlot(plot){
    if(plot.glow){plot.glow.destroy();plot.glow=null;}
    if(plot.hintLabel){plot.hintLabel.destroy();plot.hintLabel=null;}
    if(plot.plant){plot.plant.destroy();plot.plant=null;}
    plot.sState=''; plot.ko=null; plot.word=null;
    plot.tile.setTexture('drt_dry').setAlpha(1).setDisplaySize(PLOT_SIZE,PLOT_SIZE).clearTint();
    plot.shad.setAlpha(0.3);
  }

  // Restore saved plots on startup
  _restorePlots(){
    if(!plotSave.length) return;
    const now=Date.now();
    plotSave.forEach(pd=>{
      const plot=this.plots[pd.i]; if(!plot) return;
      const word=this._findWord(pd.ko); if(!word) return;
      plot.word=word; plot.ko=pd.ko; plot.plantedAt=pd.plantedAt||0;
      const srs=getSrs(pd.ko);
      // Advance state if timers expired while offline
      let st=pd.sState||pd.state||'1';
      if(st==='1'&&srs.p2At&&now>=srs.p2At) st='2';
      if(st==='3'&&srs.p3At&&now>=srs.p3At) st='4';
      const t=plot.index%5;
      const tex={1:`cr_${t}_1`,2:`cr_${t}_1`,3:`cr_${t}_2`,4:`cr_${t}_3`}[st]||`cr_${t}_1`;
      plot.plant=this.add.image(plot.x,plot.y-4,tex).setOrigin(0.5,0.85).setDepth(plot.y+5);
      plot.tile.setTexture('drt_wet').setDisplaySize(PLOT_SIZE,PLOT_SIZE);
      this._setState(plot,st,pd.ko);
      plantedWords.add(pd.ko);
    });
  }
  _findWord(ko){
    for(const lvl of levelsData){ const w=lvl.words.find(w=>w.ko===ko); if(w) return w; }
    return null;
  }

  _sparkle(x,y){
    const c=[0xFFDD44,0xFFFFFF,0x88FF88,0xFF88CC];
    for(let i=0;i<8;i++){
      const sp=this.add.image(x,y,'sparkle').setScale(0.4+Math.random()*0.5).setTint(c[i%4]).setDepth(y+30);
      const ang=(i/8)*Math.PI*2,dist=28+Math.random()*16;
      this.tweens.add({targets:sp,x:x+Math.cos(ang)*dist,y:y+Math.sin(ang)*dist-8,
        scale:0,alpha:0,duration:450+Math.random()*200,ease:'Power2.Out',onComplete:()=>sp.destroy()});
    }
  }
  _flyCoins(fx,fy,cnt){
    for(let i=0;i<Math.min(cnt,6);i++){
      this.time.delayedCall(i*60,()=>{
        const c=this.add.image(fx,fy,'coin').setScale(0.8).setDepth(fy+40);
        this.tweens.add({targets:c,x:fx+(Math.random()-.5)*40,y:fy-50-Math.random()*30,
          scale:1.4,duration:250,ease:'Back.Out(2)',
          onComplete:()=>this.tweens.add({targets:c,y:-20,alpha:0,scale:.3,duration:300,ease:'Power2.In',onComplete:()=>c.destroy()})});
      });
    }
  }
  _pickWord(){
    const all=unlockedLevels.flatMap(idx=>levelsData[idx]?.words||[]);
    const pool=all.filter(w=>!plantedWords.has(w.ko));
    const arr=pool.length?pool:all;
    // Weighted random: new words ×5, <3 harvests ×3, rest ×1
    const weighted=arr.map(w=>{
      const h=harvestCounts.get(w.ko)||0;
      return {word:w, weight: h===0?5 : h<3?3 : 1};
    });
    const total=weighted.reduce((s,w)=>s+w.weight,0);
    let r=Math.random()*total;
    for(const {word,weight} of weighted){
      r-=weight; if(r<=0) return word;
    }
    return arr[0];
  }
  _leaves(cx,cy){
    for(let i=0;i<6;i++){
      const ang=(i/6)*Math.PI*2, g=this.add.graphics().setDepth(cy+15);
      g.fillStyle(i%2?K.L:K.l,1); g.fillEllipse(0,0,8,4); g.setPosition(cx,cy);
      this.tweens.add({targets:g,x:cx+Math.cos(ang)*28,y:cy+Math.sin(ang)*18,
        angle:240*(i%2?1:-1),scale:0,alpha:0,duration:520,ease:'Power2.Out',onComplete:()=>g.destroy()});
    }
  }
  _label(x,y,msg){
    const txt=this.add.text(x,y,msg,{fontFamily:'"Press Start 2P",monospace',fontSize:'14px',
      color:'#FFD700',stroke:'#000',strokeThickness:4}).setOrigin(0.5,1).setDepth(y+40);
    this.tweens.add({targets:txt,y:y-65,alpha:0,scale:1.4,duration:1100,ease:'Power2.Out',onComplete:()=>txt.destroy()});
  }
  resetPlots(){
    this.plots.forEach(p=>{
      if(p.glow){p.glow.destroy();p.glow=null;}
      if(p.hintLabel){p.hintLabel.destroy();p.hintLabel=null;}
      if(p.plant){p.plant.destroy();p.plant=null;}
      if(p.ko) plantedWords.delete(p.ko);
      p.sState=''; p.ko=null; p.word=null;
      p.tile.setTexture('drt_dry').setAlpha(p.active?1:0.25).setDisplaySize(PLOT_SIZE,PLOT_SIZE).clearTint();
      p.shad.setAlpha(p.active?0.3:0.1);
    });
    localStorage.removeItem('hv_plots');
  }
}

class ArcadeScene extends Phaser.Scene {
  constructor(){ super({key:'ArcadeScene'}); }
  create(){
    this.W = this.scale.width;
    this.H = this.scale.height;
    
    this.add.rectangle(0,0,this.W,this.H,0x050515).setOrigin(0);
    for(let i=0; i<60; i++){
      this.add.rectangle(Math.random()*this.W, Math.random()*this.H, 2, 2, 0xFFFFFF).setAlpha(Math.random());
    }
    
    this.score = 0;
    this.scoreText = this.add.text(20, 20, 'SCORE: 0', {fontFamily:'"Press Start 2P",monospace', fontSize:'18px', color:'#00FFFF'}).setDepth(10);
    
    const exitTxt = this.add.text(this.W - 20, 20, '[ESC] EXIT', {fontFamily:'"Press Start 2P",monospace', fontSize:'16px', color:'#FF00FF'})
      .setOrigin(1,0).setInteractive({useHandCursor:true}).setDepth(10);
    exitTxt.on('pointerdown', ()=>this.exitGame());
    this.input.keyboard.on('keydown-ESC', ()=>this.exitGame());
    
    this.ship = this.add.triangle(this.W/2, this.H - 80, 0,30, 15,0, 30,30, 0x00FFFF);
    this.physics.add.existing(this.ship);
    this.ship.body.setCollideWorldBounds(true);
    
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D');
    
    this.lasers = this.physics.add.group();
    this.enemies = this.physics.add.group();
    
    this.physics.add.overlap(this.lasers, this.enemies, this.hitEnemy, null, this);
    this.physics.add.overlap(this.ship, this.enemies, this.hitPlayer, null, this);
    
    this.lastEnemySpawn = 0;
    this.lastFired = 0;
    
    const all = unlockedLevels.flatMap(idx => levelsData[idx]?.words || []);
    this.wordPool = all.length > 0 ? all : [{ko:'한글', en:'Hangeul'}];
    
    const title = this.add.text(this.W/2, this.H/2, 'ARCADE MODE\nArrow Keys/WASD to move', {fontFamily:'"Press Start 2P",monospace', fontSize:'20px', color:'#FF00FF', align:'center', lineHeight:1.5}).setOrigin(0.5);
    this.tweens.add({targets:title, alpha:0, delay:2000, duration:1000, onComplete:()=>title.destroy()});
  }
  
  update(t, dt){
    let vx = 0, vy = 0;
    const speed = 400;
    if(this.cursors.left.isDown || this.keys.A.isDown) vx = -speed;
    if(this.cursors.right.isDown || this.keys.D.isDown) vx = speed;
    if(this.cursors.up.isDown || this.keys.W.isDown) vy = -speed;
    if(this.cursors.down.isDown || this.keys.S.isDown) vy = speed;
    
    this.ship.body.setVelocity(vx, vy);
    this.ship.angle = (vx / speed) * 15;
    
    if(t > this.lastFired) {
      const laser = this.add.rectangle(this.ship.x, this.ship.y - 20, 6, 20, 0xFF00FF);
      this.physics.add.existing(laser);
      this.lasers.add(laser);
      laser.body.setVelocityY(-600);
      this.lastFired = t + 250;
    }
    
    if(t > this.lastEnemySpawn) {
      this.spawnEnemy();
      this.lastEnemySpawn = t + Phaser.Math.Between(300, 600); // Fast continuous spawn
    }
    
    const deadLasers = [];
    this.lasers.children.entries.forEach(l => { if(l && l.y < -50) deadLasers.push(l); });
    deadLasers.forEach(l => l.destroy());

    const deadEnemies = [];
    this.enemies.children.entries.forEach(e => {
      if(e) {
        if(e.face) { e.face.x = e.x; e.face.y = e.y; }
        if(e.y > this.H + 50) deadEnemies.push(e);
      }
    });
    deadEnemies.forEach(e => {
      if(e.face) e.face.destroy();
      e.destroy();
    });
  }
  
  spawnEnemy() {
    try {
      const w = Phaser.Utils.Array.GetRandom(this.wordPool) || {ko:'?',en:''};
      const x = Phaser.Math.Between(50, this.W - 50);
      
      const enemy = this.add.rectangle(x, -50, 60, 60, 0x000000, 0).setOrigin(0.5);
      this.enemies.add(enemy);
      
      enemy.body.setSize(50, 50);
      enemy.body.setVelocityY(Phaser.Math.Between(150, 280));
      enemy.word = w;
      
      enemy.face = this.add.text(x, -50, '👾', {fontSize:'50px'}).setOrigin(0.5).setDepth(6);
    } catch(e) { console.error('Spawn error:', e); }
  }
  
  hitEnemy(laser, enemy) {
    laser.destroy();
    const w = enemy.word;
    const ex = enemy.x, ey = enemy.y;
    if(enemy.face) enemy.face.destroy();
    enemy.destroy();
    this.score += 10;
    this.scoreText.setText('SCORE: ' + this.score);
    
    // Clear flashcard popup
    const card = this.add.container(ex, ey).setDepth(30);
    const bg = this.add.rectangle(0, 0, 160, 75, 0x1a2015, 0.95).setStrokeStyle(3, 0x77CC44);
    const tk = this.add.text(0, -12, w.ko, {fontFamily:'"Noto Sans KR", sans-serif', fontSize:'30px', color:'#FFFFFF', fontWeight:'bold'}).setOrigin(0.5);
    const te = this.add.text(0, 20, w.en, {fontFamily:'"Be Vietnam Pro", sans-serif', fontSize:'16px', color:'#77CC44', fontWeight:'bold'}).setOrigin(0.5);
    card.add([bg, tk, te]);
    
    for(let i=0; i<8; i++){
      const spark = this.add.rectangle(ex, ey, 6, 6, 0xFFFF00).setDepth(25);
      this.tweens.add({targets:spark, x:ex+(Math.random()-0.5)*100, y:ey+(Math.random()-0.5)*100, scale:0, duration:500, ease:'Power1', onComplete:()=>spark.destroy()});
    }
    
    this.tweens.add({
      targets: card, y: ey - 90, alpha: 0, duration: 2500, ease: 'Power2',
      onComplete: () => card.destroy()
    });
  }
  
  hitPlayer(ship, enemy) {
    if(enemy.face) enemy.face.destroy();
    enemy.destroy();
    this.cameras.main.shake(200, 0.02);
    this.ship.setFillStyle(0xFF0000);
    this.time.delayedCall(150, ()=>this.ship.setFillStyle(0x00FFFF));
    this.score = Math.max(0, this.score - 50);
    this.scoreText.setText('SCORE: ' + this.score);
  }
  
  exitGame() {
    const earned = Math.floor(this.score / 20);
    if(earned > 0){
      addGold(earned);
      showToast('🕹️ Arcade: +' + earned + ' Gold!');
    }
    this.scene.stop();
    this.scene.resume('FarmScene');
  }
}

// ═══════════════ DUNGEON CRAWLER ARPG SCENE ════════════════════════════════════
class DungeonScene extends Phaser.Scene {
  constructor(){ super({key:'DungeonScene'}); }
  
  create(){
    this.W = this.scale.width;
    this.H = this.scale.height;
    
    // Dark Dungeon Floor background
    this.add.rectangle(0, 0, this.W, this.H, 0x0F172A).setOrigin(0);
    // Draw stone floor grid lines
    const g = this.add.graphics();
    g.lineStyle(1, 0x1E293B, 0.6);
    for(let x=0; x<this.W; x+=40) g.lineBetween(x, 0, x, this.H);
    for(let y=0; y<this.H; y+=40) g.lineBetween(0, y, this.W, y);
    
    // Ambient Torch Lights at corners/walls
    [ {x:60,y:60}, {x:this.W-60,y:60}, {x:60,y:this.H-60}, {x:this.W-60,y:this.H-60} ].forEach(t => {
      this.add.circle(t.x, t.y, 40, 0xF59E0B, 0.15);
      const torch = this.add.text(t.x, t.y, '🔥', {fontSize:'24px'}).setOrigin(0.5);
      this.tweens.add({ targets:torch, scale:{from:0.9,to:1.2}, duration:400+Math.random()*200, yoyo:true, repeat:-1 });
    });

    // Player Hero
    this.playerHP = 100;
    this.maxPlayerHP = 100;
    this.lootedGold = 0;
    this.lootedScrolls = 0;
    this.monstersKilled = 0;

    this.player = this.add.text(this.W/2, this.H/2, '🗡️', {fontSize:'36px'}).setOrigin(0.5);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setSize(30, 30);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D');
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.monsters = this.physics.add.group();
    this.lootGroup = this.physics.add.group();

    // Physics overlaps
    this.physics.add.overlap(this.player, this.lootGroup, this.collectLoot, null, this);
    this.physics.add.overlap(this.player, this.monsters, this.hitPlayer, null, this);

    // Spawn timer for monsters
    this.lastMonsterSpawn = 0;
    this.invulnerableTime = 0;

    // Vocab pool
    const all = unlockedLevels.flatMap(idx => levelsData[idx]?.words || []);
    this.wordPool = all.length > 0 ? all : [{ko:'한글', en:'Hangeul', hint:'📝'}];

    // HUD Header
    this.hpText = this.add.text(20, 20, '❤️ HP: 100/100', {fontFamily:'"Press Start 2P",monospace', fontSize:'16px', color:'#EF4444'}).setDepth(100);
    this.goldText = this.add.text(20, 50, '💰 GOLD: 0', {fontFamily:'"Press Start 2P",monospace', fontSize:'16px', color:'#F59E0B'}).setDepth(100);
    this.scrollText = this.add.text(20, 80, '📜 SCROLLS: 0', {fontFamily:'"Press Start 2P",monospace', fontSize:'16px', color:'#A855F7'}).setDepth(100);

    const exitBtn = this.add.text(this.W - 20, 20, '[ESC] LEAVE DUNGEON', {fontFamily:'"Press Start 2P",monospace', fontSize:'14px', color:'#EC4899'})
      .setOrigin(1,0).setInteractive({useHandCursor:true}).setDepth(100);
    exitBtn.on('pointerdown', () => this.exitDungeon());
    this.input.keyboard.on('keydown-ESC', () => this.exitDungeon());

    // Title Toast
    const title = this.add.text(this.W/2, this.H/2 - 60, '⚔️ ANCIENT DUNGEON\nWASD to Move | SPACE / Click to Slash!', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'18px', color:'#EC4899', align:'center', lineHeight:1.5, stroke:'#000', strokeThickness:4
    }).setOrigin(0.5).setDepth(100);
    this.tweens.add({ targets:title, alpha:0, delay:2500, duration:1000, onComplete:()=>title.destroy() });

    // Click to Slash
    this.input.on('pointerdown', () => this.playerSlash());
  }

  update(t, dt){
    if(this.playerHP <= 0) return;

    // Movement
    let vx = 0, vy = 0;
    const speed = 280;
    if(this.cursors.left.isDown || this.keys.A.isDown) vx = -speed;
    if(this.cursors.right.isDown || this.keys.D.isDown) vx = speed;
    if(this.cursors.up.isDown || this.keys.W.isDown) vy = -speed;
    if(this.cursors.down.isDown || this.keys.S.isDown) vy = speed;

    this.player.body.setVelocity(vx, vy);

    // Slash input
    if(Phaser.Input.Keyboard.JustDown(this.spaceKey)){
      this.playerSlash();
    }

    // Spawn Monster loop
    if(t > this.lastMonsterSpawn){
      this.spawnMonster();
      this.lastMonsterSpawn = t + Phaser.Math.Between(1200, 2200);
    }

    // Monster AI: move towards player
    this.monsters.children.entries.forEach(m => {
      if(m && m.active){
        this.physics.moveToObject(m, this.player, m.moveSpeed || 100);
      }
    });

    // Loot floating animation
    this.lootGroup.children.entries.forEach(l => {
      if(l && l.active && l.sparkle){
        l.sparkle.x = l.x; l.sparkle.y = l.y - 12;
      }
    });
  }

  playerSlash(){
    if(!this.player || !this.player.active) return;

    // Sword slash arc visual
    const slash = this.add.text(this.player.x, this.player.y - 10, '⚔️', {fontSize:'44px'}).setOrigin(0.5).setDepth(50);
    this.tweens.add({
      targets: slash,
      scale: { from: 0.8, to: 1.6 },
      alpha: { from: 1, to: 0 },
      angle: { from: -45, to: 45 },
      duration: 220,
      ease: 'Power1',
      onComplete: () => slash.destroy()
    });

    // Check hit monsters in range (90px)
    const deadMonsters = [];
    this.monsters.children.entries.forEach(m => {
      if(m && m.active){
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, m.x, m.y);
        if(dist < 95){
          m.hp -= 35;
          m.setTint(0xFF0000);
          this.time.delayedCall(120, () => { if(m.active) m.clearTint(); });
          
          // Floating damage text
          const dmg = this.add.text(m.x, m.y - 20, '-35', {
            fontFamily:'"Press Start 2P",monospace', fontSize:'16px', color:'#22C55E', stroke:'#000', strokeThickness:3
          }).setOrigin(0.5).setDepth(60);
          this.tweens.add({ targets:dmg, y:m.y-50, alpha:0, duration:600, onComplete:()=>dmg.destroy() });

          if(m.hp <= 0) deadMonsters.push(m);
        }
      }
    });

    deadMonsters.forEach(m => this.killMonster(m));
  }

  spawnMonster(){
    const types = [
      { emoji:'🟢', name:'Slime', hp:30, speed:90 },
      { emoji:'💀', name:'Skeleton', hp:50, speed:120 },
      { emoji:'🗿', name:'Golem', hp:80, speed:70 },
      { emoji:'👿', name:'Demon', hp:60, speed:140 }
    ];
    const type = Phaser.Utils.Array.GetRandom(types);
    const word = Phaser.Utils.Array.GetRandom(this.wordPool) || {ko:'한글', en:'Hangeul'};

    let x, y;
    if(Math.random() < 0.5){
      x = Math.random() < 0.5 ? 20 : this.W - 20;
      y = Phaser.Math.Between(40, this.H - 40);
    } else {
      x = Phaser.Math.Between(40, this.W - 40);
      y = Math.random() < 0.5 ? 20 : this.H - 20;
    }

    const monster = this.add.text(x, y, type.emoji, {fontSize:'36px'}).setOrigin(0.5).setDepth(10);
    this.physics.add.existing(monster);
    monster.body.setSize(36, 36);
    monster.hp = type.hp;
    monster.moveSpeed = type.speed;
    monster.word = word;

    this.monsters.add(monster);
  }

  killMonster(m){
    const mx = m.x, my = m.y;
    const word = m.word;
    m.destroy();

    this.monstersKilled++;

    for(let i=0; i<8; i++){
      const p = this.add.rectangle(mx, my, 5, 5, 0xA855F7).setDepth(20);
      this.tweens.add({
        targets: p,
        x: mx + Phaser.Math.Between(-50, 50),
        y: my + Phaser.Math.Between(-50, 50),
        scale: 0,
        duration: 500,
        onComplete: () => p.destroy()
      });
    }

    // Drop Vocab Scroll 📜
    const loot = this.add.text(mx, my, '📜', {fontSize:'32px'}).setOrigin(0.5).setDepth(15);
    this.physics.add.existing(loot);
    loot.body.setSize(30, 30);
    loot.word = word;

    loot.sparkle = this.add.text(mx, my - 12, '✨', {fontSize:'16px'}).setOrigin(0.5).setDepth(16);
    this.tweens.add({ targets: loot.sparkle, alpha: 0.2, yoyo: true, repeat: -1, duration: 400 });
    this.tweens.add({ targets: loot, y: my - 6, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    this.lootGroup.add(loot);
  }

  collectLoot(player, loot){
    const word = loot.word;
    if(loot.sparkle) loot.sparkle.destroy();
    loot.destroy();

    this.lootedScrolls++;
    this.lootedGold += 25;

    this.goldText.setText(`💰 GOLD: ${this.lootedGold}`);
    this.scrollText.setText(`📜 SCROLLS: ${this.lootedScrolls}`);

    this.showLootFlashcard(word);
  }

  showLootFlashcard(w){
    if(this.currentCard) this.currentCard.destroy();

    const card = this.add.container(this.W/2, 70).setDepth(200);
    const bg = this.add.rectangle(0, 0, 280, 70, 0x1E1B4B, 0.95).setStrokeStyle(3, 0xA855F7).setOrigin(0.5);
    const tk = this.add.text(0, -12, w.ko, {fontFamily:'"Noto Sans KR", sans-serif', fontSize:'28px', color:'#FFFFFF', fontWeight:'bold'}).setOrigin(0.5);
    const te = this.add.text(0, 16, w.en, {fontFamily:'"Be Vietnam Pro", sans-serif', fontSize:'15px', color:'#C084FC', fontWeight:'bold'}).setOrigin(0.5);
    card.add([bg, tk, te]);

    this.currentCard = card;

    this.tweens.add({
      targets: card,
      scale: { from: 0.8, to: 1 },
      duration: 200,
      ease: 'Back.Out'
    });

    this.time.delayedCall(2200, () => {
      if(this.currentCard === card){
        this.tweens.add({
          targets: card,
          alpha: 0,
          y: 40,
          duration: 400,
          onComplete: () => card.destroy()
        });
      }
    });
  }

  hitPlayer(player, monster){
    if(this.time.now < this.invulnerableTime) return;
    this.invulnerableTime = this.time.now + 800;

    this.playerHP = Math.max(0, this.playerHP - 15);
    this.hpText.setText(`❤️ HP: ${this.playerHP}/100`);

    this.cameras.main.shake(200, 0.02);
    this.player.setTint(0xFF0000);
    this.time.delayedCall(200, () => { if(this.player.active) this.player.clearTint(); });

    if(this.playerHP <= 0){
      this.exitDungeon(true);
    }
  }

  exitDungeon(failed = false){
    if(this.lootedGold > 0){
      addGold(this.lootedGold);
    }

    if(failed){
      showToast(`💀 Defeated in Dungeon! Earned +${this.lootedGold} Gold & ${this.lootedScrolls} Vocab Scrolls!`, 4000);
    } else {
      showToast(`⚔️ Dungeon Cleared! Defeated ${this.monstersKilled} Monsters & Looted +${this.lootedGold} Gold!`, 4000);
    }

    this.scene.stop();
    this.scene.resume('FarmScene');
  }
}

// ═══════════════ STARDEW-STYLE FISHING MINIGAME SCENE ════════════════════════
class FishingScene extends Phaser.Scene {
  constructor(){ super({key:'FishingScene'}); }

  create(){
    this.W = this.scale.width;
    this.H = this.scale.height;

    // Deep water pond background
    this.add.rectangle(0, 0, this.W, this.H, 0x0284C7).setOrigin(0);
    for(let i=0; i<30; i++){
      const w = this.add.ellipse(Math.random()*this.W, Math.random()*this.H, 60, 16, 0, 0.25);
      this.tweens.add({ targets:w, scaleX:1.2, alpha:0.1, duration:2000+Math.random()*1000, yoyo:true, repeat:-1 });
    }

    // Dock & Fisherman
    this.add.rectangle(this.W/2, this.H - 60, this.W, 120, 0x78350F).setOrigin(0.5);
    this.player = this.add.text(this.W/2, this.H - 120, '🎣', {fontSize:'48px'}).setOrigin(0.5);

    // State: 'CASTING', 'WAITING', 'REELING', 'CATCH_QUIZ'
    this.state = 'CASTING';
    this.catchProgress = 0;
    this.targetFish = null;

    // UI Info Toast
    this.infoTxt = this.add.text(this.W/2, 60, '🎣 CLICK or PRESS SPACE TO CAST YOUR LINE!', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'16px', color:'#FDE047', stroke:'#000', strokeThickness:4, align:'center'
    }).setOrigin(0.5);

    const exitBtn = this.add.text(this.W - 20, 20, '[ESC] LEAVE POND', {fontFamily:'"Press Start 2P",monospace', fontSize:'14px', color:'#7DD3FC'})
      .setOrigin(1,0).setInteractive({useHandCursor:true}).setDepth(100);
    exitBtn.on('pointerdown', () => this.exitFishing());
    this.input.keyboard.on('keydown-ESC', () => this.exitFishing());

    // Input handlers for casting & tension bar control
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.on('pointerdown', () => this.handleAction());

    // Build Tension Meter Bar UI (hidden initially)
    this.buildTensionBar();
  }

  buildTensionBar(){
    this.barX = this.W/2 + 180;
    this.barY = this.H/2;
    this.barHeight = 240;
    this.barWidth = 36;

    this.meterBg = this.add.rectangle(this.barX, this.barY, this.barWidth, this.barHeight, 0x0F172A, 0.85)
      .setStrokeStyle(3, 0x38BDF8).setVisible(false);

    // Green Catching Zone
    this.catchZoneHeight = 70;
    this.catchZoneY = this.barY + this.barHeight/2 - this.catchZoneHeight/2;
    this.catchZone = this.add.rectangle(this.barX, this.catchZoneY, this.barWidth - 4, this.catchZoneHeight, 0x22C55E, 0.7)
      .setOrigin(0.5, 0).setVisible(false);

    // Fish Icon inside bar
    this.fishIconY = this.barY;
    this.fishIcon = this.add.text(this.barX, this.fishIconY, '🐟', {fontSize:'22px'})
      .setOrigin(0.5).setVisible(false);

    // Progress Bar (Left of tension bar)
    this.pbBg = this.add.rectangle(this.barX - 30, this.barY, 14, this.barHeight, 0x1E293B).setVisible(false);
    this.pbFill = this.add.rectangle(this.barX - 30, this.barY + this.barHeight/2, 12, 0, 0x38BDF8)
      .setOrigin(0.5, 1).setVisible(false);
  }

  handleAction(){
    if(this.state === 'CASTING'){
      this.castLine();
    }
  }

  castLine(){
    this.state = 'WAITING';
    this.infoTxt.setText('⏳ Waiting for a bite...');

    // Floating bobber
    this.bobber = this.add.text(this.W/2 + Phaser.Math.Between(-80, 80), this.H/2, '🔴', {fontSize:'24px'}).setOrigin(0.5);
    this.tweens.add({ targets: this.bobber, y: this.H/2 + 8, duration: 600, yoyo: true, repeat: -1 });

    // Random bite delay
    const waitTime = Phaser.Math.Between(1800, 3500);
    this.time.delayedCall(waitTime, () => {
      if(this.state !== 'WAITING') return;
      this.triggerBite();
    });
  }

  triggerBite(){
    this.state = 'REELING';
    this.infoTxt.setText('❗ BITE! Hold SPACE / Click to keep fish in Green Zone!');

    // Exclamation mark splash
    const ex = this.add.text(this.bobber.x, this.bobber.y - 30, '❗ BITE!', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'22px', color:'#EF4444', stroke:'#000', strokeThickness:4
    }).setOrigin(0.5);
    this.tweens.add({ targets:ex, scale:1.4, alpha:0, duration:800, onComplete:()=>ex.destroy() });

    // Show Tension Bar
    this.meterBg.setVisible(true);
    this.catchZone.setVisible(true);
    this.fishIcon.setVisible(true);
    this.pbBg.setVisible(true);
    this.pbFill.setVisible(true);

    this.catchProgress = 0.3;
    this.targetFish = Phaser.Utils.Array.GetRandom(FISH_DB);
    this.fishIcon.setText(this.targetFish.hint);

    this.fishVelocity = 0;
    this.catchZoneVelocity = 0;
  }

  update(t, dt){
    if(this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey) && this.state === 'CASTING'){
      this.castLine();
    }

    if(this.state !== 'REELING') return;

    // Control Catching Zone with SPACE or Mouse Hold
    const isHolding = this.spaceKey.isDown || this.input.activePointer.isDown;
    if(isHolding){
      this.catchZoneVelocity -= 0.6;
    } else {
      this.catchZoneVelocity += 0.5;
    }
    this.catchZoneVelocity *= 0.92;
    this.catchZoneY = Phaser.Math.Clamp(this.catchZoneY + this.catchZoneVelocity, this.barY - this.barHeight/2, this.barY + this.barHeight/2 - this.catchZoneHeight);
    this.catchZone.setY(this.catchZoneY);

    // Fish Random Movement
    this.fishVelocity += (Math.random() - 0.5) * 1.4;
    this.fishVelocity *= 0.94;
    this.fishIconY = Phaser.Math.Clamp(this.fishIconY + this.fishVelocity, this.barY - this.barHeight/2 + 10, this.barY + this.barHeight/2 - 10);
    this.fishIcon.setY(this.fishIconY);

    // Check if Fish is inside Catch Zone
    const fishTop = this.fishIconY - 10, fishBot = this.fishIconY + 10;
    const zoneTop = this.catchZoneY, zoneBot = this.catchZoneY + this.catchZoneHeight;
    const inside = fishTop >= zoneTop && fishBot <= zoneBot;

    if(inside){
      this.catchProgress = Math.min(1.0, this.catchProgress + 0.006);
      this.catchZone.setFillStyle(0x22C55E, 0.85);
    } else {
      this.catchProgress = Math.max(0.0, this.catchProgress - 0.004);
      this.catchZone.setFillStyle(0xEF4444, 0.85);
    }

    // Update Progress Bar
    const currentH = this.barHeight * this.catchProgress;
    this.pbFill.setSize(12, currentH);

    if(this.catchProgress >= 1.0){
      this.startVocabChallenge();
    } else if(this.catchProgress <= 0.0){
      this.loseFish();
    }
  }

  startVocabChallenge(){
    this.state = 'CATCH_QUIZ';
    this.hideTensionBar();

    const fish = this.targetFish;
    this.infoTxt.setText(`🐟 Reeled in ${fish.hint} ${fish.ko} [${fish.rom}]! Answer to Catch!`);

    // Pick 3 random wrong fish choices
    const wrongs = FISH_DB.filter(f => f.ko !== fish.ko);
    Phaser.Utils.Array.Shuffle(wrongs);
    const choices = Phaser.Utils.Array.Shuffle([fish, wrongs[0], wrongs[1], wrongs[2]]);

    // Render Quiz Card Overlay
    const container = this.add.container(this.W/2, this.H/2).setDepth(200);
    const bg = this.add.rectangle(0, 0, 360, 240, 0x0F172A, 0.95).setStrokeStyle(3, 0x38BDF8).setOrigin(0.5);
    const title = this.add.text(0, -90, `What is the English for "${fish.ko}"?`, {
      fontFamily:'"Press Start 2P",monospace', fontSize:'12px', color:'#38BDF8', align:'center'
    }).setOrigin(0.5);

    container.add([bg, title]);

    choices.forEach((c, idx) => {
      const cx = (idx % 2 === 0 ? -85 : 85);
      const cy = (idx < 2 ? -30 : 30);
      const btnBg = this.add.rectangle(cx, cy, 150, 44, 0x1E293B).setStrokeStyle(2, 0x0284C7).setInteractive({useHandCursor:true});
      const txt = this.add.text(cx, cy, c.en, {fontFamily:'"Be Vietnam Pro",sans-serif', fontSize:'15px', color:'#FFFFFF', fontWeight:'bold'}).setOrigin(0.5);
      
      btnBg.on('pointerdown', () => {
        if(c.ko === fish.ko){
          btnBg.setFillStyle(0x15803D);
          this.time.delayedCall(400, () => {
            container.destroy();
            this.catchSuccess(fish);
          });
        } else {
          btnBg.setFillStyle(0xB91C1C);
          this.cameras.main.shake(150, 0.01);
        }
      });

      container.add([btnBg, txt]);
    });
  }

  catchSuccess(fish){
    fishAlbumSave[fish.ko] = (fishAlbumSave[fish.ko] || 0) + 1;
    addGold(35);

    if(this.bobber) this.bobber.destroy();

    showToast(`🎉 Caught ${fish.hint} ${fish.ko} (${fish.en})! +35 Gold!`, 4000);

    this.state = 'CASTING';
    this.infoTxt.setText('🎣 Caught! Press SPACE / Click to Cast Again!');
  }

  loseFish(){
    this.state = 'CASTING';
    this.hideTensionBar();
    if(this.bobber) this.bobber.destroy();
    showToast('💨 The fish got away! Try again.');
    this.infoTxt.setText('🎣 Click or Press SPACE to Cast Line Again!');
  }

  hideTensionBar(){
    this.meterBg.setVisible(false);
    this.catchZone.setVisible(false);
    this.fishIcon.setVisible(false);
    this.pbBg.setVisible(false);
    this.pbFill.setVisible(false);
  }

  exitFishing(){
    this.scene.stop();
    this.scene.resume('FarmScene');
  }
}

// ══════════════ FISH ALBUM OVERLAY LOGIC ══════════════════════════════════════
window.openFishAlbum = function(){
  const overlay = document.getElementById('fish-album-overlay');
  const grid = document.getElementById('fish-album-grid');
  if(!overlay || !grid) return;

  grid.innerHTML = '';
  FISH_DB.forEach(f => {
    const count = fishAlbumSave[f.ko] || 0;
    const unlocked = count > 0;
    const card = document.createElement('div');
    card.className = `fish-card ${unlocked ? 'unlocked' : 'locked'}`;
    card.innerHTML = `
      <div class="fish-card-icon">${f.hint}</div>
      <div class="fish-card-ko">${unlocked ? f.ko : '???'}</div>
      <div class="fish-card-rom">[${f.rom}]</div>
      <div class="fish-card-en">${unlocked ? f.en : 'Locked'}</div>
      <div class="fish-card-catches">${unlocked ? `Caught ×${count}` : '🔒 Uncaught'}</div>`;
    grid.appendChild(card);
  });

  overlay.classList.add('visible');
};

window.closeFishAlbum = function(){
  const overlay = document.getElementById('fish-album-overlay');
  if(overlay) overlay.classList.remove('visible');
};

// ═══════════════ PHASER CONFIG ════════════════════════════════════════════════
const config={
  type:Phaser.AUTO,
  width:window.innerWidth, height:window.innerHeight,
  backgroundColor:'#3A7015',
  render:{pixelArt:true, antialias:false, antialiasGL:false, roundPixels:true},
  physics:{default:'arcade',arcade:{gravity:{y:0},debug:false}},
  scene:[FarmScene, ArcadeScene, DungeonScene, FishingScene],
  parent:document.body,
  scale:{mode:Phaser.Scale.RESIZE, autoCenter:Phaser.Scale.CENTER_BOTH},
};
const game=new Phaser.Game(config);

// ══════════════ MEMORY MINIGAME ══════════════════════════════════════════════
let memoryCards = [];
let flippedIndices = [];
let matchedPairs = 0;
let memoryFlips = 0;

window.openMemoryGame = function(){
  if(memoryOpen) return;
  playerLocked = true; memoryOpen = true;
  const overlay = document.getElementById('memory-overlay');
  const grid = document.getElementById('memory-grid');
  document.getElementById('memory-matches').textContent = 'Matches: 0/8';
  document.getElementById('memory-flips').textContent = 'Flips: 0';
  grid.innerHTML = '';
  flippedIndices = []; matchedPairs = 0; memoryFlips = 0;
  
  // Pick 8 random words
  const all = unlockedLevels.flatMap(idx => levelsData[idx]?.words || []);
  if(all.length < 8) {
     showToast('Not enough words unlocked! Buy more levels first.', 3000);
     playerLocked = false; memoryOpen = false; return;
  }
  let shuffledAll = [...all].sort(()=>Math.random()-0.5);
  const selected = shuffledAll.slice(0, 8);
  
  // Create 16 cards (8 Ko, 8 En)
  memoryCards = [];
  selected.forEach((w, id) => {
     memoryCards.push({ text: w.ko, type: 'ko', id });
     memoryCards.push({ text: w.en, type: 'en', id });
  });
  memoryCards.sort(()=>Math.random()-0.5);
  
  memoryCards.forEach((c, idx) => {
    const card = document.createElement('div');
    card.className = 'mem-card';
    card.dataset.idx = idx;
    card.innerHTML = `
      <div class="mem-card-face mem-card-back">❓</div>
      <div class="mem-card-face mem-card-front">${c.text}</div>
    `;
    card.addEventListener('click', () => window.onMemoryCardClick(idx, card));
    grid.appendChild(card);
  });
  overlay.classList.add('visible');
};

window.onMemoryCardClick = function(idx, cardEl){
  if(flippedIndices.length >= 2) return;
  if(flippedIndices.includes(idx)) return;
  if(cardEl.classList.contains('matched')) return;
  
  cardEl.classList.add('flipped');
  flippedIndices.push(idx);
  
  if(flippedIndices.length === 2){
    memoryFlips++;
    document.getElementById('memory-flips').textContent = `Flips: ${memoryFlips}`;
    
    const i1 = flippedIndices[0], i2 = flippedIndices[1];
    const c1 = memoryCards[i1], c2 = memoryCards[i2];
    
    if(c1.id === c2.id && c1.type !== c2.type){
      // Match!
      setTimeout(()=>{
        document.getElementById('memory-grid').children[i1].classList.add('matched');
        document.getElementById('memory-grid').children[i2].classList.add('matched');
        flippedIndices = [];
        matchedPairs++;
        document.getElementById('memory-matches').textContent = `Matches: ${matchedPairs}/8`;
        
        if(matchedPairs === 8){
           const reward = Math.max(15, 60 - memoryFlips);
           setTimeout(()=>{
             addGold(reward);
             showToast(`🎉 You matched all cards! +${reward} Gold!`);
             window.closeMemoryGame();
           }, 800);
        }
      }, 500);
    } else {
      // No match
      setTimeout(()=>{
        const grid = document.getElementById('memory-grid');
        grid.children[i1].classList.remove('flipped');
        grid.children[i2].classList.remove('flipped');
        flippedIndices = [];
      }, 1000);
    }
  }
};

window.closeMemoryGame = function(){
  document.getElementById('memory-overlay').classList.remove('visible');
  setTimeout(()=>{
    playerLocked = false; memoryOpen = false;
  }, 300);
};

// ══════════════ TROPHIES ═════════════════════════════════════════════════════
const TROPHIES_DB = [
  { id: 'bronze_apple', name: 'Tân Binh', icon: '🥉', reqHarvests: 10, cost: 50 },
  { id: 'silver_spade', name: 'Nông Dân', icon: '🥈', reqHarvests: 50, cost: 300 },
  { id: 'gold_tractor', name: 'Chuyên Gia', icon: '🥇', reqHarvests: 150, cost: 1000 },
  { id: 'diamond_crown', name: 'Bậc Thầy', icon: '💎', reqHarvests: 500, cost: 5000 },
  { id: 'master_scholar', name: 'Huyền Thoại', icon: '👑', reqHarvests: 1000, cost: 20000 }
];

window.getTotalHarvests = function() {
  let total = 0;
  for(let count of harvestCounts.values()){ total += count; }
  return total;
};

window.openTrophies = function() {
  if(trophyOpen) return;
  playerLocked = true; trophyOpen = true;
  document.getElementById('trophy-overlay').classList.add('visible');
  window.renderTrophies();
};

window.closeTrophies = function() {
  document.getElementById('trophy-overlay').classList.remove('visible');
  playerLocked = false; trophyOpen = false;
};

window.renderTrophies = function() {
  const grid = document.getElementById('trophy-grid');
  grid.innerHTML = '';
  const totalHarvests = window.getTotalHarvests();
  
  TROPHIES_DB.forEach(t => {
    const isBought = unlockedTrophies.includes(t.id);
    const reqMet = totalHarvests >= t.reqHarvests;
    const canAfford = gold >= t.cost;
    
    const div = document.createElement('div');
    div.className = 'trophy-card ' + (isBought ? 'unlocked' : 'locked');
    
    div.innerHTML = `
      <div>
        <div class="trophy-icon">${t.icon}</div>
        <div class="trophy-name">${t.name}</div>
        <div class="trophy-req"><span style="font-size:12px;color:#888;font-family:'Noto Sans KR',sans-serif;font-weight:700;">Thu hoạch</span><br/>${totalHarvests}/${t.reqHarvests}</div>
      </div>
      ${isBought ? 
        '<div class="trophy-unlocked-badge">Đã Mở! 🏆</div>' : 
        '<button class="trophy-buy-btn" ' + ((!reqMet || !canAfford) ? 'disabled' : '') + '>' +
           (!reqMet ? '⚠️ CHƯA ĐỦ' : 'MUA 💰' + t.cost) +
         '</button>'
      }
    `;
    
    if(!isBought && reqMet && canAfford) {
      div.querySelector('.trophy-buy-btn').addEventListener('click', () => {
         gold -= t.cost;
         unlockedTrophies.push(t.id);
         persistSave();
         updateGoldHUD(true);
         window.renderTrophies();
         showToast('🏆 Chúc mừng! Bạn đã nhận cúp ' + t.name + '!');
      });
    }
    grid.appendChild(div);
  });
};

const trophyBtn = document.getElementById('trophy-btn');
if(trophyBtn) trophyBtn.addEventListener('click', window.openTrophies);
const trophyCloseBtn = document.getElementById('trophy-close-btn');
if(trophyCloseBtn) trophyCloseBtn.addEventListener('click', window.closeTrophies);

// ══════════════ SPELL QUIZ DUEL LOGIC ════════════════════════════════════════
let duelState = {
  playerHP: 100, maxPlayerHP: 100,
  enemyHP: 100, maxEnemyHP: 100,
  combo: 0,
  timer: null,
  currentQuestion: null,
  answering: false,
  enemyIndex: 0
};

const DUEL_ENEMIES = [
  { name: 'Dark Sorcerer', avatar: '🧙‍♀️', hp: 100, goldBonus: 50 },
  { name: 'Flame Archmage', avatar: '🔮', hp: 130, goldBonus: 80 },
  { name: 'Shadow Dragon', avatar: '🐲', hp: 160, goldBonus: 120 },
  { name: 'Grand Necromancer', avatar: '💀', hp: 200, goldBonus: 180 }
];

window.openSpellDuel = function(){
  if(duelOpen) return;
  
  const all = unlockedLevels.flatMap(idx => levelsData[idx]?.words || []);
  if(all.length < 4){
    showToast('⚠️ Need at least 4 unlocked words to duel! Unlock more in Shop.', 3000);
    return;
  }

  duelState.enemyIndex = Math.floor(Math.random() * DUEL_ENEMIES.length);
  const enemy = DUEL_ENEMIES[duelState.enemyIndex];
  
  duelState.playerHP = 100;
  duelState.maxPlayerHP = 100;
  duelState.enemyHP = enemy.hp;
  duelState.maxEnemyHP = enemy.hp;
  duelState.combo = 0;
  duelState.answering = false;

  document.getElementById('duel-enemy-name').textContent = enemy.name;
  document.getElementById('duel-enemy-avatar').textContent = enemy.avatar;

  updateDuelHP();
  document.getElementById('duel-combo-badge').textContent = '🔥 Combo x0';

  playerLocked = true; duelOpen = true;
  document.getElementById('duel-overlay').classList.add('visible');

  nextDuelTurn();
};

function updateDuelHP(){
  const pFill = document.getElementById('duel-player-hp-fill');
  const pText = document.getElementById('duel-player-hp-text');
  const eFill = document.getElementById('duel-enemy-hp-fill');
  const eText = document.getElementById('duel-enemy-hp-text');

  const pPct = Math.max(0, Math.min(100, (duelState.playerHP / duelState.maxPlayerHP) * 100));
  const ePct = Math.max(0, Math.min(100, (duelState.enemyHP / duelState.maxEnemyHP) * 100));

  if(pFill){
    pFill.style.width = pPct + '%';
    pFill.style.background = pPct < 30 ? '#ef4444' : pPct < 60 ? '#f59e0b' : 'linear-gradient(90deg,#22c55e,#4ade80)';
  }
  if(pText) pText.textContent = `${Math.max(0, duelState.playerHP)} / ${duelState.maxPlayerHP} HP`;

  if(eFill){
    eFill.style.width = ePct + '%';
    eFill.style.background = ePct < 30 ? '#ef4444' : ePct < 60 ? '#f59e0b' : 'linear-gradient(90deg,#a855f7,#ec4899)';
  }
  if(eText) eText.textContent = `${Math.max(0, duelState.enemyHP)} / ${duelState.maxEnemyHP} HP`;
}

function nextDuelTurn(){
  if(!duelOpen) return;
  if(duelState.playerHP <= 0 || duelState.enemyHP <= 0) return;

  duelState.answering = false;
  const grid = document.getElementById('duel-options-grid');
  grid.innerHTML = '';

  const allWords = unlockedLevels.flatMap(idx => levelsData[idx]?.words || []);
  const target = Phaser.Utils.Array.GetRandom(allWords);
  
  const distractors = allWords.filter(w => w.ko !== target.ko);
  Phaser.Utils.Array.Shuffle(distractors);
  const selectedDistractors = distractors.slice(0, 3);

  const options = [target, ...selectedDistractors];
  Phaser.Utils.Array.Shuffle(options);

  duelState.currentQuestion = { target, options };

  document.getElementById('duel-target-word').textContent = target.ko;

  options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'duel-option-btn';
    btn.innerHTML = `
      <span>${opt.en}</span>
      <span class="duel-option-badge">[${idx + 1}]</span>
    `;
    btn.onclick = () => window.selectDuelOption(idx);
    grid.appendChild(btn);
  });

  const timerFill = document.getElementById('duel-timer-bar-fill');
  if(timerFill){
    timerFill.style.transition = 'none';
    timerFill.style.width = '100%';
    setTimeout(() => {
      if(duelOpen && !duelState.answering){
        timerFill.style.transition = 'width 5s linear';
        timerFill.style.width = '0%';
      }
    }, 50);
  }

  if(duelState.timer) clearTimeout(duelState.timer);
  duelState.timer = setTimeout(() => {
    if(duelOpen && !duelState.answering){
      window.selectDuelOption(-1);
    }
  }, 5050);
}

window.selectDuelOption = function(idx){
  if(duelState.answering || !duelOpen) return;
  duelState.answering = true;
  if(duelState.timer) clearTimeout(duelState.timer);

  const grid = document.getElementById('duel-options-grid');
  const buttons = grid.querySelectorAll('.duel-option-btn');
  const target = duelState.currentQuestion.target;
  const isCorrect = idx >= 0 && duelState.currentQuestion.options[idx]?.ko === target.ko;

  buttons.forEach((btn, i) => {
    btn.disabled = true;
    if(duelState.currentQuestion.options[i]?.ko === target.ko){
      btn.classList.add('correct');
    } else if(i === idx){
      btn.classList.add('wrong');
    }
  });

  if(isCorrect){
    duelState.combo++;
    const dmg = 25 + duelState.combo * 5;
    duelState.enemyHP = Math.max(0, duelState.enemyHP - dmg);
    document.getElementById('duel-combo-badge').textContent = `🔥 Combo x${duelState.combo}`;
    
    const playerBox = document.getElementById('duel-player-box');
    const enemyBox = document.getElementById('duel-enemy-box');
    if(playerBox) playerBox.classList.add('cast');
    if(enemyBox) enemyBox.classList.add('hit');
    showDmgPopup(enemyBox, `-${dmg} HP`, 'enemy-hit');

    setTimeout(() => {
      if(playerBox) playerBox.classList.remove('cast');
      if(enemyBox) enemyBox.classList.remove('hit');
    }, 400);

    updateDuelHP();

    if(duelState.enemyHP <= 0){
      setTimeout(() => endDuel(true), 600);
      return;
    }
  } else {
    duelState.combo = 0;
    const dmg = 22;
    duelState.playerHP = Math.max(0, duelState.playerHP - dmg);
    document.getElementById('duel-combo-badge').textContent = `🔥 Combo x0`;

    const playerBox = document.getElementById('duel-player-box');
    const enemyBox = document.getElementById('duel-enemy-box');
    if(enemyBox) enemyBox.classList.add('cast');
    if(playerBox) playerBox.classList.add('hit');
    showDmgPopup(playerBox, `-${dmg} HP`, 'player-hit');

    setTimeout(() => {
      if(enemyBox) enemyBox.classList.remove('cast');
      if(playerBox) playerBox.classList.remove('hit');
    }, 400);

    updateDuelHP();

    if(duelState.playerHP <= 0){
      setTimeout(() => endDuel(false), 600);
      return;
    }
  }

  setTimeout(() => {
    nextDuelTurn();
  }, 900);
};

function showDmgPopup(parentEl, text, typeClass){
  if(!parentEl) return;
  const popup = document.createElement('div');
  popup.className = `duel-dmg-popup ${typeClass}`;
  popup.textContent = text;
  popup.style.top = '10px';
  parentEl.appendChild(popup);
  setTimeout(() => popup.remove(), 1000);
}

function endDuel(victory){
  if(victory){
    const enemyInfo = DUEL_ENEMIES[duelState.enemyIndex];
    const reward = enemyInfo.goldBonus + duelState.combo * 5 + Math.floor(duelState.playerHP / 2);
    addGold(reward);
    showToast(`⚡ VICTORY! Defeated ${enemyInfo.name}! +${reward} Gold!`, 3500);
  } else {
    showToast(`💀 DEFEAT! Practice more words and try again!`, 3500);
  }
  closeSpellDuel();
}

window.closeSpellDuel = function(){
  if(duelState.timer) clearTimeout(duelState.timer);
  document.getElementById('duel-overlay').classList.remove('visible');
  setTimeout(() => {
    playerLocked = false; duelOpen = false;
  }, 300);
};

if(window.addEventListener){
  window.addEventListener('keydown', (e) => {
    if(duelOpen){
      if(['1', '2', '3', '4'].includes(e.key)){
        const idx = parseInt(e.key) - 1;
        window.selectDuelOption(idx);
      }
      if(e.key === 'Escape'){
        window.closeSpellDuel();
      }
    }
  });
}
