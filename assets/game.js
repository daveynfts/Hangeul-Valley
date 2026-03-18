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
// Collect ALL game state into ONE object
function collectSave(){
  const hcObj={}; harvestCounts.forEach((v,k)=>hcObj[k]=v);
  const plots = sceneRef?.plots.filter(p=>p.ko)
    .map(p=>({i:p.index, ko:p.ko, sState:p.sState, plantedAt:p.plantedAt||0})) || plotSave;
  return { v:2, gold, unlockedLevels, harvests:hcObj, srs:srsData, plots, lastLevel:currentLevelIndex };
}
// Apply a save snapshot to the in-memory state
function applySave(d){
  if(!d||d.v!==2) return false;
  gold = d.gold||0;
  unlockedLevels = Array.isArray(d.unlockedLevels)?d.unlockedLevels:[0];
  if(d.harvests) Object.entries(d.harvests).forEach(([k,v])=>harvestCounts.set(k,v));
  if(d.srs) srsData = d.srs;
  if(d.plots) plotSave = d.plots;
  if(typeof d.lastLevel==='number') currentLevelIndex = d.lastLevel;
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
let shopOpen=false, catDialogOpen=false;

// ══════════════ CAT NPC DIALOG ════════════════════════════════════════════════
// Draw the ginger tabby cat portrait pixel-by-pixel onto the <canvas> element
function drawCatPortrait(){
  const canvas=document.getElementById('cat-portrait-canvas');
  if(!canvas) return;
  const ctx=canvas.getContext('2d');
  const S=6; // pixel scale (6px per dot → 72×96 canvas for 12×16 cat)
  const p=(x,y,col)=>{ ctx.fillStyle=col; ctx.fillRect(x*S,y*S,S,S); };
  // Colors
  const GO='#F5813F', GD='#B84E10', GL='#FFBB66'; // ginger shades
  const WH='#FFFFFF', EY='#FFCC44', PU='#1A0800'; // white, amber eye, pupil
  const PK='#FFAA99', SK='#FF8877'; // pink nose/inner ear
  const SH='#3A1800'; // shadow/outline

  ctx.clearRect(0,0,canvas.width,canvas.height);

  // === BODY (rows 8-15) ===
  // Main ginger torso
  [[1,8,10,8,GO],[2,9,8,6,GO]].forEach(([x,y,w,h,c])=>{for(let i=0;i<w;i++)for(let j=0;j<h;j++)p(x+i,y+j,c);});
  // White belly stripe
  for(let j=9;j<16;j++) for(let i=3;i<9;i++) p(i,j,WH);
  // Dark tabby stripes on body
  [0,1].forEach(i=>{ for(let j=9;j<15;j++) p(i===0?1:10,j,GD); });
  [3,[3,14,GD],[3,11,GD],[8,14,GD],[8,11,GD]].forEach(([x,y,c])=>{ if(c)p(x,y,c); });
  for(let j=10;j<15;j+=2){ p(2,j,GD); p(9,j,GD); } // flank stripes

  // === FRONT PAWS (rows 14-15) - white socks ===
  [[2,14,2,2,WH],[8,14,2,2,WH]].forEach(([x,y,w,h,c])=>{ for(let i=0;i<w;i++)for(let j=0;j<h;j++)p(x+i,y+j,c); });
  p(2,15,PK); p(3,15,PK); p(8,15,PK); p(9,15,PK); // toe pads

  // === HEAD (rows 2-7) ===
  for(let j=2;j<8;j++) for(let i=1;i<11;i++) p(i,j,GO);
  // Forehead M marking
  p(3,2,GD);p(4,2,GD); p(5,2,GO); p(6,2,GO); p(7,2,GD);p(8,2,GD);
  p(4,3,GD); p(6,3,GD); p(7,3,GD);
  // White face blaze (muzzle, chin)
  for(let j=5;j<8;j++) for(let i=3;i<9;i++) p(i,j,WH);
  // Amber eyes (big & round)
  [[2,4,EY],[3,4,EY],[4,4,EY],[2,5,EY],[3,5,EY],[4,5,EY]].forEach(([x,y,c])=>p(x,y,c));
  [[7,4,EY],[8,4,EY],[9,4,EY],[7,5,EY],[8,5,EY],[9,5,EY]].forEach(([x,y,c])=>p(x,y,c));
  // Pupils
  p(3,4,PU); p(8,4,PU);
  // Eye outline (thick lashes)
  [2,3,4].forEach(x=>p(x,3,SH)); [7,8,9].forEach(x=>p(x,3,SH));
  // Pink nose
  p(5,6,PK); p(6,6,PK);
  // Whisker dots (subtle)
  p(1,6,GL); p(10,6,GL);

  // === EARS - airplane style (spread sideways) ===
  // Left ear
  [[0,0,GO],[1,0,GO],[0,1,GO],[1,1,GO],[0,2,GD],[1,2,GD]].forEach(([x,y,c])=>p(x,y,c));
  p(0,1,PK); // inner ear
  // Right ear
  [[10,0,GO],[11,0,GO],[10,1,GO],[11,1,GO],[10,2,GD],[11,2,GD]].forEach(([x,y,c])=>p(x,y,c));
  p(11,1,PK); // inner ear

  // === TAIL (drawn to the right, curling up) ===
  // Omitted (Phaser draws it as part of in-world sprite)

  // === NECK ===
  for(let i=3;i<9;i++) p(i,8,WH); // white chest/neck connection
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
  // Rotate cat's meow phrase
  const meows=[
    '야옹~ Remember this one! Nyaa~',
    '냐옹~ Muop is teaching you! 🐾',
    '미야~ Memorize it now! Purr...',
    '냐~ This is a rare word! 🌟',
  ];
  document.getElementById('cat-dialog-tip').textContent=meows[Math.floor(Math.random()*meows.length)];
}
function catAnotherWord(){
  // Quick pop animation on the word
  const ko=document.getElementById('cat-ko');
  ko.animate([{opacity:0,transform:'scale(.5)'},{opacity:1,transform:'scale(1)'}],{duration:250,easing:'back.out(2)'});
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
    lsGrid.insertBefore(r, lsGrid.firstChild);
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

// ====== QUIZ (SRS Phase-Aware) ================================================
let currentPhase = 1;
function openQuiz(word, plot, phase=1){
  if(quizOpen) return;
  currentWord=word; currentPlot=plot; currentPhase=phase;
  quizOpen=playerLocked=true;
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
  answerInput.value=''; feedbackText.textContent=''; feedbackText.className='';
  quizBackdrop.classList.add('visible');
  setTimeout(()=>answerInput.focus(),80);
}
function closeQuiz(){
  quizOpen=playerLocked=false;
  quizBackdrop.classList.remove('visible');
  const qui=$('quiz-ui'); if(qui) qui.className='';
  currentWord=currentPlot=null;
}
function submitAnswer(){
  if(!currentWord) return;
  const typed=answerInput.value.trim();
  if(typed===currentWord.ko){
    const msgs=[
      '🌱 Planted! Remember to water!',
      '💧 Watered! Almost ripe!',
      '🍎 Excellent! +Gold earned!'
    ];
    feedbackText.textContent=msgs[currentPhase-1]; feedbackText.className='correct';
    const cp=currentPlot, cw=currentWord, ph=currentPhase;
    if(ph===1){plantedWords.add(cw.ko); progress++; updateHUD(); updateVocabBook();}
    setTimeout(()=>{ closeQuiz(); if(sceneRef) sceneRef.advancePlot(cp,cw,ph); },650);
  } else {
    const wrong=currentPhase===3?'❌ Wrong! Plant regressed to Phase 2!':'❌ Wrong! Try again.';
    feedbackText.textContent=wrong; feedbackText.className='';
    answerInput.value=''; answerInput.focus();
    answerInput.animate(
      [{transform:'translateX(-7px)'},{transform:'translateX(7px)'},{transform:'translateX(0)'}],
      {duration:260,easing:'ease-out'});
    if(currentPhase===3){
      const cp=currentPlot, cw=currentWord;
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
function buildVocabBook() {
  if(!levelsData.length) return;
  const lvl = levelsData[currentLevelIndex];
  vocabSubtitle.textContent = `Level ${lvl.level} – ${lvl.name}`;
  const cats = ['all', ...new Set(lvl.words.map(w => w.category).filter(Boolean))];
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
// Facts must NOT reveal the Korean spelling directly.
// They provide cultural context, mnemonics, syllable hints for Phase 3.
const VOCAB_FACTS = {
  // ── DRINKS / FOOD ───────────────────────────────────────────────────────────
  'water':    {vi:'💧 Koreans always drink warm water or tea, rarely cold water. This word has only 2 Hangul letters and 1 short syllable — like a drop of water!', ko:'🔤 Hint: single syllable, starts with a consonant that looks like an upside-down M!'},
  'milk':     {vi:'🥛 In K-dramas, drinking milk together is an intimate gesture! Korea produces high-quality milk from the Gangwon mountain region.', ko:'🔤 Hint: 2 syllables, sounds close to "U-yu" — try singing along!'},
  'apple':    {vi:'🍎 SECRET: This word sounds exactly like "apology" in Korean! Koreans give apples to apologize — a famous wordplay 사과=사과!', ko:'🔤 Hint: 2 syllables, Sa-... Think of the red color of the apple and "sagwa"!'},
  'bread':    {vi:'🥖 Korean bread is sweeter than Western bread! Bakeries (빵집) are on every corner in Seoul.', ko:'🔤 Hint: just 1 syllable, sounds like "pang" — imagine bread going "pang"!'},
  'rice':     {vi:'🍚 Rice is the center of Korean meals. "Have you eaten rice?" (밥 먹었어?) is how Koreans ask "How are you?"!', ko:'🔤 Hint: 1 short syllable with a "p" ending — sticky rice, compact word!'},
  'fish':     {vi:'🐟 Korea has the highest seafood consumption per capita in the world. Noryangjin fish market in Seoul runs 24/7!', ko:'🔤 Hint: 3 syllables, starts with a consonant that looks like two crossed sticks!'},
  'meat':     {vi:'🥩 Samgyeopsal (grilled pork belly) is Korea\'s national dish! Koreans eat BBQ with lettuce wraps and dipping sauce.', ko:'🔤 Hint: 2 syllables, starts with the sound "ko" — meat is ko-gi!'},
  'egg':      {vi:'🥚 Rolled egg omelette (계란말이) is the most common side dish in Korean bento. Fresh eggs are sold right at the farm!', ko:'🔤 Hint: 2 syllables, the first sounds like "kye" — think of a chicken clucking!'},
  'vegetable':{vi:'🥬 Koreans eat fermented vegetables (kimchi) daily like rice! Korea has over 100 different types of kimchi.', ko:'🔤 Hint: 2 long syllables — think of a lush green vegetable garden!'},
  'fruit':    {vi:'🍊 Fruit in Korea is incredibly expensive — a watermelon can cost $30! Each piece is polished before selling like jewelry!', ko:'🔤 Hint: 2 syllables, first sound "gwa" — like "gourd" or "squash"!'},
  'coffee':   {vi:'☕ Korea has the most cafes per capita in the world! Seoul has cat cafes, rabbit cafes, raccoon cafes...', ko:'🔤 Hint: 2 syllables, transliterated from English "coffee" so it sounds very familiar!'},
  'tea':      {vi:'🍵 Jeju green tea (녹차) is famous across all of Asia. Jeju Island has stunning green tea plantations!', ko:'🔤 Hint: 1 very short syllable — like a tiny sip of tea, done in one gulp!'},
  'juice':    {vi:'🥤 Smoothies and fruit juices are booming in Korea! Persimmon (홍시) and pear juice (배즙) are specialties.', ko:'🔤 Hint: 2 syllables, close to the transliteration "ju-seu" from English!'},
  // ── NATURE ──────────────────────────────────────────────────────────────────
  'sun':      {vi:'☀️ The name Korea (한국) means "great nation". But its beautiful nickname is "Land of the Morning Calm"!', ko:'🔤 Hint: 2 syllables — think of the sun rising in the East!'},
  'moon':     {vi:'🌙 Korean Thanksgiving (Chuseok) is a harvest festival under the full moon. Families gather to watch the moon and eat songpyeon!', ko:'🔤 Hint: 1 syllable — short like a slender crescent moon!'},
  'star':     {vi:'⭐ K-pop idols are called "별" (star). Korean music awards go to the "brightest star" of the year!', ko:'🔤 Hint: 1 syllable "byeol" — try singing "byeol byeol byeol" like counting stars!'},
  'sky':      {vi:'🌤️ Korea\'s blue autumn sky is famous in Korean poetry. They say "높고 푸른 하늘" (high and blue sky)!', ko:'🔤 Hint: 2 syllables, starts with "ha" — ha like laughing happily under the sky!'},
  'mountain': {vi:'🏔️ 70% of Korea is mountains! Mt. Hallasan on Jeju Island is the highest peak — Koreans hike on weekends like daily walks!', ko:'🔤 Hint: 1 syllable "san" — similar to the Chinese character for mountain!'},
  'sea':      {vi:'🌊 Haeundae beach (Busan) is Korea\'s most famous beach. Every summer, millions flock there — the water is barely visible!', ko:'🔤 Hint: "bada" — 2 syllables, gentle like waves lapping!'},
  'river':    {vi:'🌊 The Han River (Hangang) flows through Seoul — people picnic, bike, and watch fireworks there. It\'s the heart of the city!', ko:'🔤 Hint: 1 short syllable — a short but powerful river!'},
  'tree':     {vi:'🌳 Cherry blossoms blooming in Korea mark the arrival of spring. The whole country flocks to parks — the biggest unofficial festival!', ko:'🔤 Hint: "na-mu" — 2 syllables, rhythmic like tapping on wood!'},
  'flower':   {vi:'🌸 Korea\'s national flower is the Mugunghwa (Rose of Sharon). It appears on the national emblem and everywhere!', ko:'🔤 Hint: "kkot" — 1 syllable, short and beautiful like a falling petal!'},
  // ── BODY / PEOPLE ────────────────────────────────────────────────────────────
  'eye':      {vi:'👁️ Big eyes are the Korean beauty standard! Korea\'s colored contact lens and eyeliner industry exports worldwide.', ko:'🔤 Hint: 1 syllable "nun" — sounds like English "noon" but means something completely different!'},
  'nose':     {vi:'👃 Nose surgery is the most popular in Korea. There\'s a joke: "a tall nose is your passport in Gangnam"!', ko:'🔤 Hint: 1 syllable "ko" — short and simple!'},
  'mouth':    {vi:'👄 Korean lipstick is world-famous! K-beauty exports gradient (ombre) lipstick as official cultural export.', ko:'🔤 Hint: 1 syllable "ip" — short like a mouth snap shut!'},
  'hand':     {vi:'🤝 Bowing and shaking hands with both hands is important etiquette in Korea! Using one hand to shake with elders is considered rude.', ko:'🔤 Hint: 1 syllable "son" — sounds like English "son" but means something totally different!'},
  'foot':     {vi:'🦶 Koreans remove shoes before entering homes — Korean floors have underfloor heating (온돌), so feet are always warm!', ko:'🔤 Hint: 1 syllable "bal" — think of feet stepping on a warm floor!'},
  'head':     {vi:'🤯 Bowing (머리 숙이기) is the most important greeting and apology in Korea! Lower bow = more respect.', ko:'🔤 Hint: 2 syllables "meo-ri" — sounds like "meow" then "ri" — cats often shake their heads!'},
  'heart':    {vi:'💖 The thumb-and-index finger heart (🤞) is Korea\'s signature love gesture, originating from K-pop idols!', ko:'🔤 Hint: 2 syllables "ma-eum" — soul and heart combined into one!'},
  // ── ANIMALS ──────────────────────────────────────────────────────────────────
  'cat':      {vi:'🐱 Korean cats say "야옹" (yaong)! Cat cafes (고양이 카페) are extremely popular in Seoul.', ko:'🔤 Hint: 3 syllables "go-yang-i" — long but fun like a cat\'s meow!'},
  'dog':      {vi:'🐶 Korean dogs say "멍멍" (meongmeong)! The Jindo dog is a rare purebred Korean breed, protected as cultural heritage.', ko:'🔤 Hint: "gae" — 1 short syllable, like a quick bark!'},
  'bird':     {vi:'🐦 Cranes (두루미) symbolize luck and longevity in Korea — often seen in traditional ink paintings.', ko:'🔤 Hint: "sae" — 1 light syllable like a bird in flight!'},
  // ── PLACES ───────────────────────────────────────────────────────────────────
  'school':   {vi:'🏫 Korean students study until 10-11 PM at hagwons (cram schools)! Exam pressure in Korea is among the highest in the world.', ko:'🔤 Hint: 2 syllables "hak-gyo" — "hak" = study, "gyo" = school — similar to Chinese!'},
  'hospital': {vi:'🏥 Korean hospitals are world-renowned for their medical technology. Medical tourism to Korea (mainly cosmetic) brings in billions of USD annually!', ko:'🔤 Hint: 3 syllables "byeong-won" — "byeong" = illness, similar to Chinese origins!'},
  'market':   {vi:'🛒 Night markets in Myeongdong and Dongdaemun stay open until 5 AM! Koreans love late-night shopping — shopping and snacking together.', ko:'🔤 Hint: 2 syllables "si-jang" — "si-jang" also means "mayor"!'},
  // ── OBJECTS / DAILY ──────────────────────────────────────────────────────────
  'phone':    {vi:'📱 Korea has the fastest 5G internet speed in the world! Samsung and LG come from here — Koreans change phones every 1.5 years on average.', ko:'🔤 Hint: 3 syllables "hyu-dae-pon" — a Korean transliteration of "hand phone"!'},
  'book':     {vi:'📚 Koreans read books on the subway a lot! Seoul has hundreds of 24/7 bookstores, open all night like convenience stores.', ko:'🔤 Hint: 1 syllable "chaek" — short like a thin book cover!'},
  'music':    {vi:'🎵 K-pop accounts for 60% of Asian music revenue! BTS alone contributes $5B/year to Korea\'s economy — more than beer revenue!', ko:'🔤 Hint: 2 syllables "eum-ak" — "eum" = sound, "ak" = music — pure Chinese origin!'},
  'money':    {vi:'💰 The Korean Won (원) has no cents — smallest unit is 10 won. Newcomers get "shock" seeing prices like 10,000 won!', ko:'🔤 Hint: 1 syllable "don" — sounds close to English "done"!'},
};

// Generate a fun fact for any word (fallback if not in database)
function getFunFact(word) {
  const key = (word.en || '').toLowerCase();
  if(VOCAB_FACTS[key]) return VOCAB_FACTS[key];
  // Category-based fallback
  const catTips = {
    '식품':   {vi:`🍽️ Korean cuisine is famous for balancing five flavors: spicy, salty, sweet, sour, bitter. "${word.en}" is an essential part!`, ko:'🔤 Connect this word with your favorite Korean food image!'},
    '동물':   {vi:`🐾 Koreans love animals — animal-themed cafes are very popular. "${word.en}" can be found there too!`,           ko:'🔤 Try imitating this animal\'s sound in Korean!'},
    '자연':   {vi:`🌿 Korea has 4 distinct seasons with stunning changes. "${word.en}" has appeared in Korean poetry for thousands of years!`,           ko:'🔤 This word appears in many romantic Korean ballads!'},
    '신체':   {vi:`💪 Korean has many nuanced body-related words. "${word.en}" is a body part Koreans pay special attention to in language!`, ko:'🔤 Think about the physical sensation of this body part when you pronounce it!'},
    '장소':   {vi:`📍 Korea is one of the safest countries in Asia. "${word.en}" is a place you can find in any Korean city!`,                ko:'🔤 Think about the sounds you hear at this place when pronouncing the word!'},
  };
  const fallback = catTips[word.category] || {
    vi:`✨ "${word.en}" is a very commonly used word in daily Korean conversation and K-dramas!`,
    ko:`🔤 Hint: count the syllables of this word (${word.ko.length <= 2 ? 'very short!' : word.ko.length <= 4 ? 'medium length' : 'a bit long'}) and create a rhythm with it!`
  };
  return fallback;
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
  if(activeCat !== 'all') words = words.filter(w => w.category === activeCat);
  if(q) words = words.filter(w => w.ko.toLowerCase().includes(q) || w.en.toLowerCase().includes(q));
  vocabCountEl.textContent = `${words.length} words`; vocabGrid.innerHTML = '';
  words.forEach(w => {
    const times   = harvestCounts.get(w.ko) || 0;
    const planted = plantedWords.has(w.ko);
    const div = document.createElement('div');
    div.className = 'vocab-card' + (times > 0 ? ' planted' : '') + (planted ? ' growing' : '');
    div.title = 'Click for Fun Facts & Phase 3 hints!';
    div.style.cursor = 'pointer';
    div.innerHTML = `
      <span class="vc-emoji">${w.hint||'📝'}</span>
      <span class="vc-ko">${w.ko}</span>
      <span class="vc-en">${w.en}</span>
      <span class="vc-ff-hint">💡 Fun Fact</span>
      ${times>0?`<span class="vc-cat">✅ ×${times}</span>`:(w.category?`<span class="vc-cat">${w.category}</span>`:'')}`;
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
    this._createCatNPC(W, H);

    this.keys = {
      W:this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A:this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S:this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D:this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.walkFrame = 0; this.walkTimer = 0;

    buildLevelSelectScreen(); playerLocked = true;
    updateGoldHUD();
  }

  // ── BAKE TEXTURES ──────────────────────────────────────────────────────────
  _bakeTextures(){
    const mk = () => this.make.graphics({add:false});

    GRASS.forEach((rows,i)=>{ const g=mk(); drawS(g,rows); g.generateTexture('grs'+i,16*PS,16*PS); g.destroy(); });
    const gd=mk(); drawS(gd,DIRT_DRY); gd.generateTexture('drt_dry',16*PS,16*PS); gd.destroy();
    const gw=mk(); drawS(gw,DIRT_WET); gw.generateTexture('drt_wet',16*PS,16*PS); gw.destroy();

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

    // Player (2 walk frames)
    for(let fr=0; fr<2; fr++){
      const gp=mk();
      pR(gp,3,0,8,1,K.T); pR(gp,2,1,10,3,K.T); pR(gp,2,1,1,3,K.t); pR(gp,11,1,1,3,K.V);
      pR(gp,2,1,10,1,K.t); pR(gp,2,3,10,1,K.V);
      pR(gp,1,4,12,2,K.T); pR(gp,1,4,12,1,K.t); pR(gp,1,5,12,1,K.V);
      pR(gp,3,6,8,5,K.X); pR(gp,3,6,1,5,K.x); pR(gp,10,6,1,5,K.x);
      pR(gp,4,8,1,1,K.J); pR(gp,5,8,1,1,K.N); pR(gp,8,8,1,1,K.J); pR(gp,9,8,1,1,K.N);
      pR(gp,4,9,1,1,K.I); pR(gp,9,9,1,1,K.I); pR(gp,6,10,2,1,K.x);
      pR(gp,2,11,10,4,K.Z); pR(gp,2,11,1,4,K.z); pR(gp,11,11,1,4,K.z);
      pR(gp,0,11,3,4,K.Z); pR(gp,11,11,3,4,K.Z);
      pR(gp,0,14,3,1,K.X); pR(gp,11,14,3,1,K.X);
      pR(gp,4,12,6,2,K.q);
      pR(gp,2,15,10,4,K.Q); pR(gp,2,15,1,4,K.q); pR(gp,11,15,1,4,K.q);
      if(fr===0){
        pR(gp,2,19,4,3,K.Q); pR(gp,8,19,4,3,K.q);
        pR(gp,2,22,5,2,K.R); pR(gp,8,22,5,2,K.r);
      } else {
        pR(gp,2,19,4,3,K.q); pR(gp,8,19,4,3,K.Q);
        pR(gp,2,22,5,2,K.r); pR(gp,8,22,5,2,K.R);
      }
      pR(gp,2,23,5,1,K.r); pR(gp,8,23,5,1,K.r);
      gp.generateTexture('farmer'+fr,14*PS,24*PS); gp.destroy();
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

    // Trees
    [[-90,-110],[fW+90,-110],[-90,fH+50],[fW+90,fH+50],[fW*0.25,-120],[fW*0.75,-120]]
      .forEach(([ox,oy])=>{
        const tx=this.farm.x+ox, ty=this.farm.y+oy;
        this.add.image(tx, ty, 'tree').setOrigin(0.5,1).setDepth(ty);
      });

    // Fence perimeter
    const fx=this.farm.x-16, fy=this.farm.y-16, fw2=fW+32, fh2=fH+32;
    const RW=14*PS;
    for(let px=fx; px<fx+fw2-RW; px+=RW){
      this.add.image(px+RW/2, fy,      'fnc_rail').setDepth(fy);
      this.add.image(px+RW/2, fy+fh2,  'fnc_rail').setDepth(fy+fh2);
    }
    for(let py=fy; py<fy+fh2; py+=RW){
      this.add.image(fx,     py+RW/2, 'fnc_rail').setAngle(90).setDepth(py);
      this.add.image(fx+fw2, py+RW/2, 'fnc_rail').setAngle(90).setDepth(py);
    }
    for(let px=fx; px<=fx+fw2; px+=RW){
      this.add.image(px, fy,     'fnc_post').setDepth(fy+1);
      this.add.image(px, fy+fh2, 'fnc_post').setDepth(fy+fh2+1);
    }
    for(let py=fy; py<=fy+fh2; py+=RW){
      this.add.image(fx,     py, 'fnc_post').setDepth(py+1);
      this.add.image(fx+fw2, py, 'fnc_post').setDepth(py+1);
    }
  }

  // ── SHOP NPC ───────────────────────────────────────────────────────────────
  _createShopNPC(W, H){
    // Place shop to the right of the farm, vertically centered
    const sx = this.farm.x + this.farm.w + 80;
    const sy = this.farm.y + this.farm.h / 2;
    this.shopNPC = this.add.image(sx, sy, 'shop_sign')
      .setOrigin(0.5, 1).setScale(1.2).setDepth(sy);

    // Hover wobble to attract attention
    this.tweens.add({ targets: this.shopNPC, y: sy - 4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    // "Press SPACE" label near shop
    this.shopHint = this.add.text(sx, sy + 10, '🏪 SHOP\n[SPACE]', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'7px',
      color:'#FFD700', stroke:'#000', strokeThickness:3, align:'center'
    }).setOrigin(0.5, 0).setDepth(sy+1).setAlpha(0);

    this.shopX = sx; this.shopY = sy;
  }

  // ── CAT NPC ────────────────────────────────────────────────────────────────
  _createCatNPC(W, H){
    // Place cat to the LEFT of the farm, sitting on the ground
    const cx = this.farm.x - 80;
    const cy = this.farm.y + this.farm.h * 0.6 + 20;
    // Shadow
    this.add.ellipse(cx,cy+2,36,10,0,0.35).setDepth(cy-1);
    // Cat sprite
    this.catSprite = this.add.image(cx, cy, 'cat_npc')
      .setOrigin(0.5,1).setScale(1.8).setDepth(cy);
    // Gentle sitting bob
    this.tweens.add({ targets:this.catSprite, y:cy-3, duration:1200, yoyo:true, repeat:-1, ease:'Sine.InOut' });
    // "Danh gia" floating meow hint
    this.catHint = this.add.text(cx, cy-52, '🐱 야옹\n[SPACE]', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'6px',
      color:'#FFCC44', stroke:'#000', strokeThickness:3, align:'center'
    }).setOrigin(0.5,1).setDepth(cy+1).setAlpha(0);
    this.tweens.add({ targets:this.catHint, y:this.catHint.y-3, duration:700, yoyo:true, repeat:-1 });
    // Name label always visible
    this.add.text(cx, cy+6, 'Meo Muop', {
      fontFamily:'"Press Start 2P",monospace', fontSize:'5px',
      color:'#FFD700', stroke:'#000', strokeThickness:2
    }).setOrigin(0.5,0).setDepth(cy+1);
    this.catX=cx; this.catY=cy;
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
      this.add.text(p.x,p.y+PLOT_SIZE/2+3,CROP_ICONS[i%5],{fontSize:'13px'})
        .setOrigin(0.5,0).setAlpha(0.4).setDepth(3);
    });
  }

  // ── UPDATE ─────────────────────────────────────────────────────────────────
  update(_t, dt){
    if(!this.player||!this.keys) return;
    this.player.setDepth(this.player.y);
    this.pShadow.setPosition(this.player.x,this.player.y+18).setDepth(this.player.y-1);

    if(!playerLocked){
      const vx=(this.keys.A.isDown?-1:0)+(this.keys.D.isDown?1:0);
      const vy=(this.keys.W.isDown?-1:0)+(this.keys.S.isDown?1:0);
      const len=Math.sqrt(vx*vx+vy*vy)||1;
      this.player.setVelocity((vx/len)*PLAYER_SPD,(vy/len)*PLAYER_SPD);
      if(vx!==0||vy!==0){
        if(vx<0) this.player.setFlipX(true);
        if(vx>0) this.player.setFlipX(false);
        this.walkTimer+=(dt||16);
        if(this.walkTimer>200){this.walkFrame=(this.walkFrame+1)%2;this.player.setTexture('farmer'+this.walkFrame);this.walkTimer=0;}
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

    if(Phaser.Input.Keyboard.JustDown(this.spaceKey)&&!playerLocked&&!quizOpen&&!shopOpen) this._interact();
    // SRS timer: check every 8s if any plant needs state advance
    this._timerAcc=(this._timerAcc||0)+(dt||16);
    if(this._timerAcc>8000){this._timerAcc=0;this._checkSRS();}
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
        fontFamily:'Arial,sans-serif', fontSize:'10px',
        color:'#fff', stroke:'#000', strokeThickness:4, align:'center',
        backgroundColor:'rgba(0,0,0,0.55)', padding:{x:6,y:3}
      }).setOrigin(0.5,1).setDepth(9998);
    }
    const near=p=>Phaser.Math.Distance.Between(this.player.x,this.player.y,p.x,p.y)<PLOT_SIZE+26;
    const pulse=0.6+0.4*Math.sin(Date.now()/220);
    this._tHL.clear();
    let hx=null,hy=null,lbl='',col=0xFFD700,hw=PLOT_SIZE,hh=PLOT_SIZE;

    // Priority mirrors _interact(): ripe > wilt > cat > shop > empty
    for(const p of this.plots){
      if(p.sState==='4'&&near(p)){hx=p.x;hy=p.y;lbl='[SPACE] Thu hoach +Gold';col=0xFFD700;break;}
    }
    if(hx===null) for(const p of this.plots){
      if(p.sState==='2'&&near(p)){hx=p.x;hy=p.y;lbl='[SPACE] Tuoi nuoc';col=0x55CCFF;break;}
    }
    if(hx===null&&this.catX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.catX,this.catY)<82){
      hx=this.catX;hy=this.catY-20;lbl='[SPACE] Noi chuyen voi Muop';col=0xFF88CC;hw=44;hh=44;
    }
    if(hx===null&&this.shopX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.shopX,this.shopY)<92){
      hx=this.shopX;hy=this.shopY-20;lbl='[SPACE] Mo cua hang';col=0xFFAA44;hw=50;hh=60;
    }
    if(hx===null) for(const p of this.plots){
      if(p.sState===''&&p.active&&near(p)){hx=p.x;hy=p.y;lbl='[SPACE] Trong cay moi';col=0x44FF88;break;}
    }

    if(hx!==null){
      // Outer glow
      this._tHL.lineStyle(3.5+pulse*2.5, col, 0.35+pulse*0.35);
      this._tHL.strokeRect(hx-hw/2-5, hy-hh/2-5, hw+10, hh+10);
      // Inner solid border
      this._tHL.lineStyle(2, col, 0.75+pulse*0.25);
      this._tHL.strokeRect(hx-hw/2, hy-hh/2, hw, hh);
      // Corner accents
      const ca=8;
      [[hx-hw/2,hy-hh/2],[hx+hw/2,hy-hh/2],[hx-hw/2,hy+hh/2],[hx+hw/2,hy+hh/2]].forEach(([cx,cy])=>{
        this._tHL.fillStyle(col,0.9); this._tHL.fillRect(cx-1,cy-1,2,2);
        this._tHL.fillRect(cx-ca,cy-1,ca,2); this._tHL.fillRect(cx-1,cy-ca,2,ca);
        this._tHL.fillRect(cx,cy-1,ca,2);    this._tHL.fillRect(cx-1,cy,2,ca);
      });
      // Action label above object
      this._tLbl.setPosition(hx, hy-hh/2-12).setText(lbl).setAlpha(0.85+pulse*0.15);
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
    // P1: ripe plants (Phase 3 harvest, no hints)
    for(const p of this.plots){ if(p.sState==='4'&&near(p)){openQuiz(p.word,p,3);return;} }
    // P2: wilting plants (Phase 2 review, emoji only)
    for(const p of this.plots){ if(p.sState==='2'&&near(p)){openQuiz(p.word,p,2);return;} }
    // Cat NPC
    if(this.catX&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.catX,this.catY)<80){
      // Cat bounce animation
      this.tweens.add({targets:this.catSprite,scale:{from:1.8,to:2.2},duration:100,yoyo:true,ease:'Back.Out(2)'});
      showCatDialog(); return;
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
      this._sparkle(plot.x,plot.y); this._label(plot.x,plot.y,'Gieo hat!');
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
      fontFamily:'"Press Start 2P",monospace',fontSize:'6px',color,stroke:'#000',strokeThickness:3
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
    const txt=this.add.text(x,y,msg,{fontFamily:'"Press Start 2P",monospace',fontSize:'8px',
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

// ═══════════════ PHASER CONFIG ════════════════════════════════════════════════
const config={
  type:Phaser.AUTO,
  width:window.innerWidth, height:window.innerHeight,
  backgroundColor:'#3A7015',
  render:{pixelArt:true, antialias:false, antialiasGL:false, roundPixels:true},
  physics:{default:'arcade',arcade:{gravity:{y:0},debug:false}},
  scene:[FarmScene],
  parent:document.body,
  scale:{mode:Phaser.Scale.RESIZE, autoCenter:Phaser.Scale.CENTER_BOTH},
};
const game=new Phaser.Game(config);
