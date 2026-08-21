// ══════════════ FISH ALBUM OVERLAY LOGIC ══════════════════════════════════════
window.openFishAlbum = function(){
  playChiptuneSFX('click');
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
      <div class="fish-card-en">${unlocked ? f.en : 'Locked'}</div>
      <div class="fish-card-catches">${unlocked ? `Caught ×${count}` : '🔒 Uncaught'}</div>`;
    grid.appendChild(card);
  });

  setModalState('fish-album-overlay', true);
};

window.closeFishAlbum = function(){
  playChiptuneSFX('click');
  setModalState('fish-album-overlay', false);
};



// ══════════════ MEMORY MINIGAME ══════════════════════════════════════════════
let memoryCards = [];
let flippedIndices = [];
let matchedPairs = 0;
let memoryFlips = 0;

window.openMemoryGame = function(){
  if(memoryOpen) return;
  playChiptuneSFX('click');
  memoryOpen = true;
  const overlay = document.getElementById('memory-overlay');
  const grid = document.getElementById('memory-grid');
  document.getElementById('memory-matches').textContent = 'Matches: 0/8';
  document.getElementById('memory-flips').textContent = 'Flips: 0';
  grid.innerHTML = '';
  flippedIndices = []; matchedPairs = 0; memoryFlips = 0;
  
  // Pick 8 random words
  const all = getUnlockedWords();
  if(all.length < 8) {
     showToast('Not enough words unlocked! Buy more levels first.', 3000);
     memoryOpen = false; return;
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
  setModalState('memory-overlay', true);
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
      playChiptuneSFX('quiz_correct');
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
      playChiptuneSFX('quiz_wrong');
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
  playChiptuneSFX('click');
  memoryOpen = false;
  setModalState('memory-overlay', false);
};


// ══════════════ TROPHIES ═════════════════════════════════════════════════════
const TROPHIES_DB = [
  { id: 'bronze_apple', name: 'Rookie (신입)', icon: '🥉', reqHarvests: 10, cost: 50 },
  { id: 'silver_spade', name: 'Farmer (농부)', icon: '🥈', reqHarvests: 50, cost: 300 },
  { id: 'gold_tractor', name: 'Expert (전문가)', icon: '🥇', reqHarvests: 150, cost: 1000 },
  { id: 'diamond_crown', name: 'Master (달인)', icon: '💎', reqHarvests: 500, cost: 5000 },
  { id: 'master_scholar', name: 'Legend (전설)', icon: '👑', reqHarvests: 1000, cost: 20000 },
  // No hardcoded recipe count. It used to carry `reqRecipes: 10`, which the trophy card
  // preferred over COOKING_RECIPES.length while the actual unlock below compared against the
  // real length — so once the two honey recipes brought the total to 12, the card read 10/10
  // and showed the requirement as met on a trophy that would never unlock.
  { id: 'master_chef', name: 'Master Chef (요리 왕)', icon: '👨‍🍳', desc: 'Cook every recipe at least once', type: 'cooking', cost: 0 }
];

window.getTotalHarvests = function() {
  let total = 0;
  for(let count of harvestCounts.values()){ total += count; }
  return total;
};

window.openTrophies = function() {
  if(trophyOpen) return;
  playChiptuneSFX('click');
  trophyOpen = true;
  setModalState('trophy-overlay', true);
  window.renderTrophies();
};

window.closeTrophies = function() {
  playChiptuneSFX('click');
  trophyOpen = false;
  setModalState('trophy-overlay', false);
};


window.renderTrophies = function() {
  const grid = document.getElementById('trophy-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const totalHarvests = window.getTotalHarvests();
  const totalCooked = cookingState && Array.isArray(cookingState.cookedRecipes) ? cookingState.cookedRecipes.length : 0;
  
  TROPHIES_DB.forEach(t => {
    const isBought = unlockedTrophies.includes(t.id);
    let reqMet = false;
    let reqText = '';

    if (t.type === 'cooking') {
      // COOKING_RECIPES.length is the only source for this, so the card and the unlock check
      // in checkMasterChefTrophy cannot disagree the way they did.
      const targetCount = (typeof COOKING_RECIPES !== 'undefined' ? COOKING_RECIPES.length : 0);
      reqMet = totalCooked >= targetCount;
      reqText = `<span style="font-size:12px;color:#888;font-family:'Noto Sans KR',sans-serif;font-weight:700;">Cooking</span><br/>${totalCooked}/${targetCount}`;
    } else {
      reqMet = totalHarvests >= t.reqHarvests;
      reqText = `<span style="font-size:12px;color:#888;font-family:'Noto Sans KR',sans-serif;font-weight:700;">Harvests</span><br/>${totalHarvests}/${t.reqHarvests}`;
    }

    const canAfford = gold >= t.cost;
    
    const div = document.createElement('div');
    div.className = 'trophy-card ' + (isBought ? 'unlocked' : 'locked');
    
    const art = (typeof trophyIconHtml === 'function')
      ? trophyIconHtml(t.id, t.icon, 56)
      : t.icon;
    const coin = (typeof hudIconHtml === 'function') ? hudIconHtml('coin', '', 14) : '';
    div.innerHTML = `
      <div>
        <div class="trophy-icon">${art}</div>
        <div class="trophy-name">${t.name}</div>
        <div class="trophy-req">${reqText}</div>
      </div>
      ${isBought ?
        '<div class="trophy-unlocked-badge">Unlocked</div>' :
        '<button class="trophy-buy-btn" ' + ((!reqMet || (!canAfford && t.cost > 0)) ? 'disabled' : '') + '>' +
           (!reqMet ? 'Locked' : (t.cost > 0 ? ('Buy ' + coin + t.cost) : 'Claim')) +
         '</button>'
      }
    `;
    
    if(!isBought && reqMet && (canAfford || t.cost === 0)) {
      div.querySelector('.trophy-buy-btn').addEventListener('click', () => {
         if (t.cost > 0 && !spendCoins(t.cost)) return;
         unlockedTrophies.push(t.id);
         window.renderTrophies();
         showToast('🏆 Congratulations! You earned the ' + t.name + ' trophy!');
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
  playChiptuneSFX('click');
  
  const all = getUnlockedWords();
  if(all.length < 4){
    showToast('⚠️ Need at least 4 unlocked words to duel! Unlock more in Shop.', 3000);
    return;
  }

  duelState.enemyIndex = Math.floor(Math.random() * DUEL_ENEMIES.length);

  // If Grand Necromancer Boss (index 3), trigger 5-word Entrance Gate!
  if (duelState.enemyIndex === 3) {
    startBossGateChallenge('necromancer', 5, (passed) => {
      if (passed) {
        openSpellDuelDirect();
      }
    });
    return;
  }

  openSpellDuelDirect();
};

function openSpellDuelDirect() {
  if (duelState.timer) {
    clearTimeout(duelState.timer);
    duelState.timer = null;
  }
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

  duelOpen = true;
  setModalState('duel-overlay', true);

  nextDuelTurn();
}


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

  const allWords = getUnlockedWords();
  const target = Phaser.Utils.Array.GetRandom(allWords);

  // The prompt is the Korean and the buttons carry meanings, so dedupe on `en`.
  const options = buildOptionSet(target, allWords, 4, labelEn);

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
    playChiptuneSFX('quiz_correct');
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
    playChiptuneSFX('quiz_wrong');
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
  if (typeof duelState.winStreak !== 'number') duelState.winStreak = 0;
  if(victory){
    duelState.winStreak++;
    if (typeof leaderboardState !== 'undefined' && leaderboardState.personalBests) {
      if (duelState.winStreak > (leaderboardState.personalBests.duelMaxWinStreak || 0)) {
        leaderboardState.personalBests.duelMaxWinStreak = duelState.winStreak;
        if (typeof updateLeaderboardMetrics === 'function') updateLeaderboardMetrics();
      }
    }
    const enemyInfo = DUEL_ENEMIES[duelState.enemyIndex];
    const baseReward = enemyInfo.goldBonus + duelState.combo * 5 + Math.floor(duelState.playerHP / 2);
    addCoins(baseReward);

    if (duelState.enemyIndex === 3) {
      addGems(50);
      addHonor(100);
      if (duelState.playerHP >= 100) {
        addGems(15);
        showToast('🛡️ ZERO-DAMAGE BOSS KILL! +15 Bonus Gems!', 4500);
      }
      showToast(`💀 GRAND NECROMANCER DEFEATED! +${baseReward} Coins, +50 Gems, +100 Honor!`, 5000);
    } else {
      showToast(`⚡ VICTORY! Defeated ${enemyInfo.name}! +${baseReward} Coins!`, 3500);
    }
    checkQuestProgress('duel', { count: 1 });
  } else {
    duelState.winStreak = 0;
    showToast(`💀 DEFEAT! Practice more words and try again!`, 3500);
  }
  closeSpellDuel();
}


window.closeSpellDuel = function(){
  if(duelState.timer) {
    clearTimeout(duelState.timer);
    duelState.timer = null;
  }
  duelState.answering = false;
  playChiptuneSFX('click');
  duelOpen = false;
  setModalState('duel-overlay', false);
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

// ═══════════════ R3: CRAFTING / COOKING SYSTEM & BUFFS ════════════════════════
var COOKING_RECIPES = [
  {
    id: 'kimchi',
    nameEn: 'Kimchi',
    nameKo: '김치',
    icon: '🥬',
    description: 'Traditional spicy fermented Napa cabbage with chili and garlic.',
    ingredients: [
      { itemId: 'cabbage', count: 1 },
      { itemId: 'chili', count: 1 },
      { itemId: 'garlic', count: 1 }
    ],
    xpReward: 25,
    goldReward: 30
  },
  {
    id: 'radish_rice',
    nameEn: 'Radish Rice',
    nameKo: '무밥',
    icon: '🍚',
    description: 'Comforting Korean steamed rice infused with sweet sliced radish.',
    ingredients: [
      { itemId: 'rice', count: 1 },
      { itemId: 'radish', count: 1 }
    ],
    xpReward: 20,
    goldReward: 25
  },
  {
    id: 'roasted_corn',
    nameEn: 'Roasted Corn',
    nameKo: '옥수수구이',
    icon: '🌽',
    description: 'Sweet juicy corn on the cob roasted over open farm embers.',
    ingredients: [
      { itemId: 'corn', count: 2 }
    ],
    xpReward: 20,
    goldReward: 20
  },
  {
    id: 'strawberry_jam',
    nameEn: 'Strawberry Jam',
    nameKo: '딸기잼',
    icon: '🍓',
    description: 'Sweet homemade jam boiled down from fresh garden strawberries.',
    ingredients: [
      { itemId: 'strawberry', count: 2 }
    ],
    xpReward: 22,
    goldReward: 25
  },
  {
    id: 'gimbap',
    nameEn: 'Gimbap',
    nameKo: '김밥',
    icon: '🍱',
    description: 'Savory seaweed rice roll filled with carrots and pickled radish.',
    ingredients: [
      { itemId: 'rice', count: 1 },
      { itemId: 'carrot', count: 1 },
      { itemId: 'radish', count: 1 }
    ],
    xpReward: 40,
    goldReward: 50
  },
  {
    id: 'tteokbokki',
    nameEn: 'Tteokbokki',
    nameKo: '떡볶이',
    icon: '🍢',
    description: 'Chewy rice cakes simmered in spicy gochujang and green onion.',
    ingredients: [
      { itemId: 'rice', count: 2 },
      { itemId: 'chili', count: 1 },
      { itemId: 'green_onion', count: 1 }
    ],
    xpReward: 45,
    goldReward: 55
  },
  {
    id: 'gamjajeon',
    nameEn: 'Potato Pancake',
    nameKo: '감자전',
    icon: '🥔',
    description: 'Crispy pan-fried potato pancake seasoned with green onions and garlic.',
    ingredients: [
      { itemId: 'potato', count: 2 },
      { itemId: 'green_onion', count: 1 },
      { itemId: 'garlic', count: 1 }
    ],
    xpReward: 65,
    goldReward: 75
  },
  {
    id: 'bibimbap',
    nameEn: 'Bibimbap',
    nameKo: '비빔밥',
    icon: '🥗',
    description: 'Nourishing bowl of rice topped with cabbage, carrot, soybean, and chili.',
    ingredients: [
      { itemId: 'rice', count: 1 },
      { itemId: 'cabbage', count: 1 },
      { itemId: 'carrot', count: 1 },
      { itemId: 'soybean', count: 1 }
    ],
    xpReward: 75,
    goldReward: 90
  },
  {
    id: 'bulgogi',
    nameEn: 'Bulgogi',
    nameKo: '불고기',
    icon: '🍖',
    description: 'Flavorful marinated dish with garlic, green onions, and soybeans.',
    ingredients: [
      { itemId: 'green_onion', count: 2 },
      { itemId: 'garlic', count: 2 },
      { itemId: 'soybean', count: 1 }
    ],
    xpReward: 95,
    goldReward: 115
  },
  {
    id: 'samgyetang',
    nameEn: 'Samgyetang',
    nameKo: '궁중 삼계탕',
    icon: '🍲',
    description: 'Royal ginseng chicken soup cooked with rice, garlic, radish, and green onions.',
    ingredients: [
      { itemId: 'rice', count: 2 },
      { itemId: 'garlic', count: 2 },
      { itemId: 'radish', count: 1 },
      { itemId: 'green_onion', count: 1 }
    ],
    xpReward: 130,
    goldReward: 160
  },
  {
    id: 'honey_yakgwa',
    nameEn: 'Honey Yakgwa',
    nameKo: '꿀약과',
    icon: '🥮',
    description: 'Traditional Korean honey pastry made with wheat, honey, and sesame oil.',
    ingredients: [
      { itemId: 'honey', count: 2 },
      { itemId: 'cabbage', count: 1 }
    ],
    xpReward: 50,
    goldReward: 60
  },
  {
    id: 'honey_tea',
    nameEn: 'Honey Tea',
    nameKo: '꿀차',
    icon: '🍵',
    description: 'Warm soothing tea sweetened with fresh natural honey.',
    ingredients: [
      { itemId: 'honey', count: 2 }
    ],
    xpReward: 35,
    goldReward: 45
  }
];

if (typeof window !== 'undefined') {
  window.COOKING_RECIPES = COOKING_RECIPES;
}

var UNIT10_INGREDIENTS = ['배추', '무', '파', '고추', '마늘', '감자', '콩', '쌀', '당근', '오이', '양파', '콩나물', '상추', '생강'];
var UNIT10_WORD_DROP = {
  '김치찌개': '배추', '된장찌개': '콩', '순두부찌개': '콩',
  '감자탕': '감자', '매운탕': '고추', '설렁탕': '무',
  '냉면': '오이', '칼국수': '쌀', '비빔국수': '오이',
  '삼겹살': '상추', '떡갈비': '파', '갈비찜': '당근',
  '삼계탕': '쌀', '닭고기': '마늘', '갈비': '파',
  '맵다': '고추', '시다': '오이', '달다': '쌀', '짜다': '파', '쓰다': '생강',
  '야채': '배추', '고기': '파', '생선': '무'
};
var UNIT10_COOKING_RECIPES = [
  { id: 'u10-kimchi-jjigae', nameEn: 'Kimchi stew', nameKo: '김치찌개', icon: '🍲',
    description: 'Spicy stew. Grow 배추, 고추, 마늘, 파.',
    ingredients: [{ itemId: '배추', count: 1 }, { itemId: '고추', count: 1 }, { itemId: '마늘', count: 1 }, { itemId: '파', count: 1 }],
    xpReward: 30, goldReward: 35 },
  { id: 'u10-doenjang-jjigae', nameEn: 'Soybean-paste stew', nameKo: '된장찌개', icon: '🥘',
    description: 'Earthy stew. Grow 콩, 감자, 파, 마늘.',
    ingredients: [{ itemId: '콩', count: 1 }, { itemId: '감자', count: 1 }, { itemId: '파', count: 1 }, { itemId: '마늘', count: 1 }],
    xpReward: 30, goldReward: 35 },
  { id: 'u10-sundubu', nameEn: 'Soft-tofu stew', nameKo: '순두부찌개', icon: '🥣',
    description: 'Soft tofu stew. Grow 콩, 고추, 파, 마늘.',
    ingredients: [{ itemId: '콩', count: 1 }, { itemId: '고추', count: 1 }, { itemId: '파', count: 1 }, { itemId: '마늘', count: 1 }],
    xpReward: 32, goldReward: 38 },
  { id: 'u10-gamjatang', nameEn: 'Pork-bone potato stew', nameKo: '감자탕', icon: '🍖',
    description: 'Potato stew. Grow 감자, 파, 고추, 마늘.',
    ingredients: [{ itemId: '감자', count: 2 }, { itemId: '파', count: 1 }, { itemId: '고추', count: 1 }, { itemId: '마늘', count: 1 }],
    xpReward: 36, goldReward: 42 },
  { id: 'u10-maeuntang', nameEn: 'Spicy fish stew', nameKo: '매운탕', icon: '🐟',
    description: 'Spicy broth veg. Grow 고추, 무, 파, 마늘.',
    ingredients: [{ itemId: '고추', count: 2 }, { itemId: '무', count: 1 }, { itemId: '파', count: 1 }, { itemId: '마늘', count: 1 }],
    xpReward: 34, goldReward: 40 },
  { id: 'u10-naengmyeon', nameEn: 'Cold noodles', nameKo: '냉면', icon: '🍜',
    description: 'Summer cold noodles. Grow 오이, 무, 파.',
    ingredients: [{ itemId: '오이', count: 1 }, { itemId: '무', count: 1 }, { itemId: '파', count: 1 }],
    xpReward: 28, goldReward: 32 },
  { id: 'u10-kalguksu', nameEn: 'Knife-cut noodles', nameKo: '칼국수', icon: '🍝',
    description: 'Hand-cut noodle soup. Grow 쌀, 파, 마늘.',
    ingredients: [{ itemId: '쌀', count: 2 }, { itemId: '파', count: 1 }, { itemId: '마늘', count: 1 }],
    xpReward: 30, goldReward: 34 },
  { id: 'u10-bibim-guksu', nameEn: 'Spicy mixed noodles', nameKo: '비빔국수', icon: '🥗',
    description: 'Spicy mixed noodles. Grow 오이, 고추, 파.',
    ingredients: [{ itemId: '오이', count: 1 }, { itemId: '고추', count: 1 }, { itemId: '파', count: 1 }],
    xpReward: 28, goldReward: 32 },
  { id: 'u10-bibimbap', nameEn: 'Bibimbap', nameKo: '비빔밥', icon: '🍚',
    description: 'Mixed rice. Grow 쌀, 당근, 콩나물, 고추.',
    ingredients: [{ itemId: '쌀', count: 1 }, { itemId: '당근', count: 1 }, { itemId: '콩나물', count: 1 }, { itemId: '고추', count: 1 }],
    xpReward: 40, goldReward: 48 },
  { id: 'u10-samgyeopsal', nameEn: 'Grilled pork belly', nameKo: '삼겹살', icon: '🥓',
    description: 'Ssam wrap sides. Grow 상추, 마늘, 고추.',
    ingredients: [{ itemId: '상추', count: 2 }, { itemId: '마늘', count: 1 }, { itemId: '고추', count: 1 }],
    xpReward: 34, goldReward: 40 },
  { id: 'u10-galbijjim', nameEn: 'Braised short ribs', nameKo: '갈비찜', icon: '🍖',
    description: 'Braised-rib veg. Grow 당근, 감자, 파, 마늘.',
    ingredients: [{ itemId: '당근', count: 1 }, { itemId: '감자', count: 1 }, { itemId: '파', count: 1 }, { itemId: '마늘', count: 1 }],
    xpReward: 38, goldReward: 46 },
  { id: 'u10-samgyetang', nameEn: 'Ginseng chicken soup', nameKo: '삼계탕', icon: '🐔',
    description: 'Chicken soup aromatics. Grow 쌀, 마늘, 파, 생강.',
    ingredients: [{ itemId: '쌀', count: 2 }, { itemId: '마늘', count: 1 }, { itemId: '파', count: 1 }, { itemId: '생강', count: 1 }],
    xpReward: 42, goldReward: 50 }
];

function getActiveCookingRecipes() {
  if (typeof isUnit10World === 'function' && isUnit10World() && Array.isArray(UNIT10_COOKING_RECIPES)) {
    return UNIT10_COOKING_RECIPES;
  }
  return COOKING_RECIPES;
}

let selectedRecipeId = 'kimchi';

function openCookingUI() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  renderCookingGrid(selectedRecipeId);
  setModalState('cooking-overlay', true);
}

function closeCookingUI() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  setModalState('cooking-overlay', false);
}

function renderCookingGrid(selectId) {
  const pantryList = document.getElementById('cooking-pantry-list');
  const recipeListEl = document.getElementById('cooking-recipe-list');
  const detailViewEl = document.getElementById('cooking-detail-view');
  const progressBadge = document.getElementById('cooking-progress-badge');

  if (!recipeListEl) return;

  const recipes = (typeof getActiveCookingRecipes === 'function') ? getActiveCookingRecipes() : COOKING_RECIPES;
  if (selectId && recipes.some(r => r.id === selectId)) {
    selectedRecipeId = selectId;
  } else if (!recipes.some(r => r.id === selectedRecipeId)) {
    selectedRecipeId = recipes[0]?.id || 'kimchi';
  }

  const ingMap = (inventoryState && inventoryState.ingredients) ? inventoryState.ingredients : {};
  const cookedRecipes = (cookingState && Array.isArray(cookingState.cookedRecipes)) ? cookingState.cookedRecipes : [];

  // 1. Pantry Stock Summary
  if (pantryList) {
    pantryList.innerHTML = '';
    const entries = Object.entries(ingMap).filter(([_, count]) => count > 0);
    if (entries.length === 0) {
      pantryList.innerHTML = '<span style="color:#94a3b8; font-size:11px;">No crop ingredients in pantry. Harvest crops to start cooking!</span>';
    } else {
      entries.forEach(([ingKey, cnt]) => {
        const info = getItemInfo(ingKey);
        const tag = document.createElement('span');
        tag.style.cssText = 'background:rgba(15,23,42,0.8); border:1px solid rgba(245,158,11,0.3); border-radius:6px; padding:3px 8px; font-size:11px; font-family:"Noto Sans KR",sans-serif; color:#e2e8f0;';
        const icon = (typeof vocabIconHtml === 'function')
          ? vocabIconHtml(info.nameKo || ingKey, info.icon || '📦', 20)
          : (info.icon || '📦');
        tag.innerHTML = `${icon} ${info.nameKo || ingKey}: ×${cnt}`;
        pantryList.appendChild(tag);
      });
    }
  }

  // 2. Progress Badge
  if (progressBadge) {
    progressBadge.textContent = `Cooked: ${cookedRecipes.filter(id => recipes.some(r => r.id === id)).length} / ${recipes.length}`;
  }

  // 3. Render Recipe List Cards
  recipeListEl.innerHTML = '';
  recipes.forEach(r => {
    const isSelected = r.id === selectedRecipeId;
    const isCooked = cookedRecipes.includes(r.id);

    let canCook = true;
    r.ingredients.forEach(req => {
      const info = getItemInfo(req.itemId);
      const key = info.key || req.itemId;
      const have = ingMap[key] || 0;
      if (have < req.count) canCook = false;
    });

    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.style.cursor = 'pointer';
    card.style.border = isSelected ? '2px solid var(--neon-gold)' : (isCooked ? '1.5px solid #22c55e' : '1.5px solid rgba(245, 158, 11, 0.3)');
    card.style.background = isSelected ? 'rgba(245, 158, 11, 0.15)' : 'rgba(30, 41, 59, 0.7)';

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:24px;">${(typeof vocabIconHtml === 'function') ? vocabIconHtml(r.nameKo, r.icon, 28) : r.icon}</span>
          <div>
            <div style="font-family:'Press Start 2P',monospace; font-size:10px; color:var(--neon-gold);">${r.nameKo}</div>
            <div style="font-size:10px; color:#cbd5e1;">${r.nameEn}</div>
          </div>
        </div>
        ${isCooked ? '<span style="font-family:\'Press Start 2P\',monospace; font-size:8px; background:rgba(34,197,94,0.2); border:1px solid #22c55e; color:#4ade80; padding:2px 5px; border-radius:4px;">✓ Cooked</span>' : ''}
      </div>
    `;
    card.onclick = () => {
      if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
      selectedRecipeId = r.id;
      renderCookingGrid(r.id);
    };
    recipeListEl.appendChild(card);
  });

  // 4. Render Selected Recipe Detail View
  if (detailViewEl) {
    const recipe = recipes.find(r => r.id === selectedRecipeId) || recipes[0];
    if (recipe) {
      let canCook = true;
      let ingBadgesHtml = [];

      recipe.ingredients.forEach(req => {
        const info = getItemInfo(req.itemId);
        const key = info.key || req.itemId;
        const have = ingMap[key] || 0;
        if (have < req.count) canCook = false;

        if (have >= req.count) {
          ingBadgesHtml.push(`
            <span style="background:rgba(34,197,94,0.15); border:1px solid #22c55e; color:#4ade80; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:bold; display:inline-flex; align-items:center; gap:4px;">
              ${(typeof vocabIconHtml === 'function') ? vocabIconHtml(info.nameKo || req.itemId, info.icon || '📦', 18) : (info.icon || '📦')} ${info.nameKo || req.itemId} ${have}/${req.count} ✓
            </span>
          `);
        } else {
          ingBadgesHtml.push(`
            <span style="background:rgba(239,68,68,0.15); border:1px solid #ef4444; color:#f87171; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:bold; display:inline-flex; align-items:center; gap:4px;">
              ${(typeof vocabIconHtml === 'function') ? vocabIconHtml(info.nameKo || req.itemId, info.icon || '📦', 18) : (info.icon || '📦')} ${info.nameKo || req.itemId} ${have}/${req.count} ✗
            </span>
          `);
        }
      });

      const isCooked = cookedRecipes.includes(recipe.id);

      detailViewEl.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="font-size:40px;">${(typeof vocabIconHtml === 'function') ? vocabIconHtml(recipe.nameKo, recipe.icon, 48) : recipe.icon}</span>
          <div>
            <div style="font-family:'Press Start 2P',monospace; font-size:14px; color:var(--neon-gold);">${recipe.nameKo} (${recipe.nameEn})</div>
            <div style="font-size:11px; color:rgba(255,255,255,0.7); margin-top:4px;">${recipe.description || ''}</div>
          </div>
        </div>

        <div style="border-top:1px solid rgba(255,255,255,0.1); padding-top:10px;">
          <div style="font-family:'Press Start 2P',monospace; font-size:10px; color:var(--neon-gold); margin-bottom:6px;">Required Ingredients (재료):</div>
          <div style="display:flex; flex-wrap:wrap; gap:6px;">
            ${ingBadgesHtml.join('')}
          </div>
        </div>

        <div style="border-top:1px solid rgba(255,255,255,0.1); padding-top:10px;">
          <div style="font-family:'Press Start 2P',monospace; font-size:10px; color:var(--neon-gold); margin-bottom:6px;">Rewards:</div>
          <div style="display:flex; gap:8px; align-items:center;">
            <span style="background:rgba(168,85,247,0.18); border:1px solid #a855f7; color:#c084fc; padding:4px 10px; border-radius:6px; font-size:10px; font-family:'Press Start 2P',monospace;">⭐ +${recipe.xpReward} XP</span>
            <span style="background:rgba(245,158,11,0.18); border:1px solid #f59e0b; color:#fbbf24; padding:4px 10px; border-radius:6px; font-size:10px; font-family:'Press Start 2P',monospace;">🪙 +${recipe.goldReward} Gold</span>
            ${isCooked ? '<span style="background:rgba(34,197,94,0.18); border:1px solid #22c55e; color:#4ade80; padding:4px 10px; border-radius:6px; font-size:10px; font-family:\'Press Start 2P\',monospace;">✓ Dish Mastered</span>' : ''}
          </div>
        </div>

        <div style="margin-top:auto; padding-top:10px;">
          <button class="cook-btn" style="width:100%; padding:12px; font-family:'Press Start 2P',monospace; font-size:11px; ${canCook ? 'background:linear-gradient(135deg, #f59e0b, #d97706); cursor:pointer;' : 'opacity:0.45; cursor:not-allowed; filter:grayscale(0.5);'}" ${canCook ? '' : 'disabled'} onclick="cookRecipe('${recipe.id}')">
            🍳 Cook ${recipe.nameKo}
          </button>
        </div>
      `;
    }
  }
}

function cookRecipe(recipeId) {
  if (!recipeId) return false;

  const recipes = (typeof getActiveCookingRecipes === 'function')
    ? getActiveCookingRecipes()
    : ((typeof COOKING_RECIPES !== 'undefined' && Array.isArray(COOKING_RECIPES))
      ? COOKING_RECIPES
      : ((typeof RECIPE_DB !== 'undefined') ? RECIPE_DB : []));

  const recipe = recipes.find(r => r.id === recipeId);
  if (!recipe) {
    if (typeof showToast === 'function') showToast(`⚠️ Recipe '${recipeId}' not found!`);
    return false;
  }

  let reqs = [];
  if (Array.isArray(recipe.ingredients)) {
    reqs = recipe.ingredients;
  } else if (recipe.req && typeof recipe.req === 'object') {
    reqs = Object.entries(recipe.req).map(([k, cnt]) => ({ itemId: k, count: cnt }));
  }

  const ingMap = (inventoryState && inventoryState.ingredients) ? inventoryState.ingredients : {};
  for (const req of reqs) {
    const info = getItemInfo(req.itemId);
    const key = info.key || req.itemId;
    const have = ingMap[key] || 0;
    if (have < req.count) {
      if (typeof showToast === 'function') {
        showToast(`⚠️ Missing ingredient for ${recipe.nameKo || recipe.nameEn}: Need ${req.count}x ${info.nameKo || key} (have ${have})`);
      }
      return false;
    }
  }

  for (const req of reqs) {
    const ok = removeItemFromInventory(req.itemId, req.count);
    if (!ok) {
      if (typeof showToast === 'function') showToast(`⚠️ Failed to remove ingredient ${req.itemId}`);
      return false;
    }
  }

  const goldReward = recipe.goldReward || 0;
  const xpReward = recipe.xpReward || 0;

  if (goldReward > 0 && typeof addCoins === 'function') {
    addCoins(goldReward);
  }

  if (xpReward > 0) {
    if (typeof addHonor === 'function') {
      addHonor(xpReward);
    } else {
      inventoryState.vocabXP = (inventoryState.vocabXP || 0) + xpReward;
    }
  }

  cookingState = cookingState || { cookedRecipes: [], totalDishesCooked: 0, recipeStats: {} };
  cookingState.cookedRecipes = Array.isArray(cookingState.cookedRecipes) ? cookingState.cookedRecipes : [];
  if (!cookingState.cookedRecipes.includes(recipe.id)) {
    cookingState.cookedRecipes.push(recipe.id);
  }
  cookingState.totalDishesCooked = (cookingState.totalDishesCooked || 0) + 1;
  cookingState.recipeStats = cookingState.recipeStats || {};
  cookingState.recipeStats[recipe.id] = (cookingState.recipeStats[recipe.id] || 0) + 1;

  inventoryState.cookedDishes = inventoryState.cookedDishes || {};
  inventoryState.cookedDishes[recipe.id] = cookingState.recipeStats[recipe.id];

  if (typeof persistSave === 'function') persistSave();
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('complete');

  if (typeof showToast === 'function') {
    showToast(`🍳 Cooked ${recipe.nameKo || recipe.nameEn}! +${goldReward} Gold 🪙, +${xpReward} XP ⭐`);
  }

  if (typeof renderInventoryGrid === 'function') renderInventoryGrid();
  renderCookingGrid(recipe.id);
  if (typeof updateCurrencyHUD === 'function') updateCurrencyHUD();

  checkCookingAchievements();
  return true;
}

function checkCookingAchievements() {
  const recipes = (typeof COOKING_RECIPES !== 'undefined' && Array.isArray(COOKING_RECIPES))
    ? COOKING_RECIPES
    : ((typeof RECIPE_DB !== 'undefined') ? RECIPE_DB : []);
  if (recipes.length === 0) return;

  cookingState = cookingState || { cookedRecipes: [], totalDishesCooked: 0, recipeStats: {} };
  cookingState.cookedRecipes = Array.isArray(cookingState.cookedRecipes) ? cookingState.cookedRecipes : [];
  const totalCookedTypes = cookingState.cookedRecipes.length;

  unlockedTrophies = Array.isArray(unlockedTrophies) ? unlockedTrophies : [];

  if (totalCookedTypes >= recipes.length && !unlockedTrophies.includes('master_chef')) {
    unlockedTrophies.push('master_chef');
    if (typeof showToast === 'function') {
      showToast('🏆 ACHIEVEMENT UNLOCKED: Master Chef (요리 왕)! (100% Recipes Cooked! 🍳⭐)');
    }
    if (typeof playChiptuneSFX === 'function') {
      playChiptuneSFX('fanfare');
    }
    if (typeof persistSave === 'function') persistSave();
    if (typeof window.renderTrophies === 'function') window.renderTrophies();
  }
}

var KOREAN_INGREDIENTS = [
  '배추', '무', '파', '고추', '마늘', '쌀', '콩', '당근', '사과',
  '연어', '고등어', '오징어', '잉어', '새우', '문어', '조개', '황금물고기'
];

var RECIPE_DB = [
  {
    id: 'kimchi', name: '김치', enName: 'Kimchi', icon: '🥬',
    req: { '배추': 1, '고추': 1, '마늘': 1 },
    buff: { type: 'coin_boost', name: '2x Coin Rate (김치 파워)', durationMs: 300000, value: 2.0 },
    culturalFact: 'Kimchi (김치) is Korea’s national fermented dish. Kimjang (김장), the collective winter Kimchi-making tradition, is inscribed on UNESCO’s Intangible Cultural Heritage list!'
  },
  {
    id: 'bibimbap', name: '비빔밥', enName: 'Bibimbap', icon: '🥗',
    req: { '쌀': 1, '당근': 1, '콩': 1 },
    buff: { type: 'crop_speed', name: '+50% Crop Speed (비빔밥 에너지)', durationMs: 360000, value: 0.50 },
    culturalFact: 'Bibimbap (비빔밥) translates to "mixed rice". Famous in Jeonju, it combines vegetables and gochujang, reflecting the five traditional Korean cardinal colors (오방색).'
  },
  {
    id: 'bulgogi', name: '불고기', enName: 'Bulgogi', icon: '🍖',
    req: { '파': 1, '마늘': 1, '콩': 1 },
    buff: { type: 'combat_damage', name: '+25% Combat Damage (불고기 힘)', durationMs: 420000, value: 0.25 },
    culturalFact: 'Bulgogi (불고기 - "fire meat") traces back over 1,000 years to Goguryeo as maekjeok. Thinly sliced beef is marinated in soy sauce, garlic, and sesame oil.'
  },
  {
    id: 'tteokbokki', name: '떡볶이', enName: 'Tteokbokki', icon: '🍢',
    req: { '쌀': 1, '고추': 1, '파': 1 },
    buff: { type: 'quiz_hints', name: '+1 Extra Quiz Hint (떡볶이 열정)', durationMs: 300000, value: 1 },
    culturalFact: 'Tteokbokki (떡볶이) originated as royal court soy sauce rice cakes. The iconic spicy gochujang street-food version was created in Seoul in 1953!'
  },
  {
    id: 'samgyeopsal', name: '삼겹살', enName: 'Samgyeopsal', icon: '🥓',
    req: { '마늘': 2, '파': 1 },
    buff: { type: 'combat_damage', name: '+25% Combat Damage (삼겹살 활력)', durationMs: 480000, value: 0.25 },
    culturalFact: 'Samgyeopsal (삼겹살 - "three-layer pork belly") is Korea’s favorite tabletop grill dish, eaten wrapped in lettuce with grilled garlic and ssamjang paste.'
  },
  {
    id: 'haemul_pajeon', name: '해물파전', enName: 'Seafood Pajeon', icon: '🥞',
    req: { '파': 2, '오징어': 1, '새우': 1 },
    buff: { type: 'fishing_luck', name: '+50% Fishing Luck (해물파전 행운)', durationMs: 360000, value: 0.50 },
    culturalFact: 'Haemul Pajeon (해물파전) is a crispy green onion pancake filled with fresh squid and shrimp. Koreans famously love eating Pajeon on rainy days!'
  },
  {
    id: 'japchae', name: '잡채', enName: 'Japchae', icon: '🍜',
    req: { '당근': 1, '파': 1, '무': 1 },
    buff: { type: 'coin_boost', name: '2x Coin Rate (잡채 잔치)', durationMs: 300000, value: 2.0 },
    culturalFact: 'Japchae (잡채) was created in the 17th century for King Gwanghaegun. Glass noodles stir-fried with sweet carrot and veggies are served at every festive celebration.'
  },
  {
    id: 'samgyetang', name: '삼계탕', enName: 'Samgyetang', icon: '🍲',
    req: { '쌀': 1, '마늘': 2, '무': 1 },
    buff: { type: 'crop_speed', name: '+50% Crop Speed (삼계탕 보양)', durationMs: 480000, value: 0.50 },
    culturalFact: 'Samgyetang (삼계탕 - ginseng chicken soup) is traditional stamina food eaten during Sambok (삼복), the peak heat of summer, to "fight heat with heat" (이열치열).'
  },
  {
    id: 'gimbap', name: '김밥', enName: 'Gimbap', icon: '🍱',
    req: { '쌀': 1, '당근': 1, '무': 1 },
    buff: { type: 'quiz_hints', name: '+1 Extra Quiz Hint (김밥 소풍)', durationMs: 300000, value: 1 },
    culturalFact: 'Gimbap (김밥) is dried seaweed (김) rolled with rice (밥) and pickled radish. It is the quintessential Korean picnic and travel comfort food!'
  }
];

function addIngredient(name, count = 1) {
  inventoryState.ingredients = inventoryState.ingredients || {};
  inventoryState.ingredients[name] = (inventoryState.ingredients[name] || 0) + count;
  persistSave();
}

function getBuff(type) {
  if (!activeBuffs || !activeBuffs[type]) return null;
  if (Date.now() > activeBuffs[type].expiresAt) {
    delete activeBuffs[type];
    persistSave();
    return null;
  }
  return activeBuffs[type];
}

function isBuffActive(type) {
  return getBuff(type) !== null;
}

function applyBuff(type, name, durationMs, value, icon) {
  activeBuffs[type] = {
    name,
    expiresAt: Date.now() + durationMs,
    value,
    icon
  };
  persistSave();
  updateBuffHUD();
  showToast(`✨ Active Buff: ${name}!`);
}

function updateBuffHUD() {
  const bar = document.getElementById('active-buff-bar');
  if (!bar) return;
  bar.innerHTML = '';
  const now = Date.now();
  Object.keys(activeBuffs).forEach(type => {
    const buff = activeBuffs[type];
    if (now > buff.expiresAt) {
      delete activeBuffs[type];
      return;
    }
    const remSec = Math.ceil((buff.expiresAt - now) / 1000);
    const m = Math.floor(remSec / 60);
    const s = remSec % 60;
    const badge = document.createElement('div');
    badge.className = 'buff-badge';
    badge.innerHTML = `<span>${buff.icon || '✨'}</span> <span>${m}:${String(s).padStart(2, '0')}</span>`;
    badge.title = buff.name;
    bar.appendChild(badge);
  });
}

// Tick active buffs every second. Never under Node: nothing clears this interval, so in a
// harness it is an immortal handle that stops the process exiting — see IS_NODE at the top.
if (typeof window !== 'undefined' && !IS_NODE) {
  if (window.buffHUDInterval) clearInterval(window.buffHUDInterval);
  window.buffHUDInterval = setInterval(() => {
    if (typeof activeBuffs !== 'undefined' && Object.keys(activeBuffs).length > 0) {
      updateBuffHUD();
    }
  }, 1000);
}

// Open Recipe Overlay
window.openRecipeBook = function() {
  playChiptuneSFX('click');
  const overlay = document.getElementById('recipe-overlay');
  const pantryList = document.getElementById('recipe-pantry-list');
  const grid = document.getElementById('recipe-grid-container');
  if (!overlay || !grid || !pantryList) return;

  pantryList.innerHTML = '';
  const ingMap = inventoryState.ingredients || {};
  const entries = Object.entries(ingMap).filter(([_, count]) => count > 0);
  const art = function (ko, fallback, px) {
    return (typeof vocabIconHtml === 'function') ? vocabIconHtml(ko, fallback || '?', px || 20) : (fallback || '');
  };
  if (entries.length === 0) {
    pantryList.innerHTML = '<span class="recipe-pantry-empty">Pantry is empty. Harvest a crop or catch a fish.</span>';
  } else {
    entries.forEach(([ing, cnt]) => {
      const info = (typeof getItemInfo === 'function') ? getItemInfo(ing) : { nameKo: ing };
      const tag = document.createElement('span');
      tag.className = 'recipe-pantry-chip';
      tag.innerHTML = art(info.nameKo || ing, info.icon, 20) +
        '<span>' + (info.nameKo || ing) + '</span><strong>×' + cnt + '</strong>';
      pantryList.appendChild(tag);
    });
  }

  grid.innerHTML = '';
  RECIPE_DB.forEach(r => {
    const card = document.createElement('div');
    card.className = 'recipe-card';

    let canCook = true;
    const reqBits = [];
    Object.entries(r.req).forEach(([ing, needed]) => {
      const have = (inventoryState.ingredients || {})[ing] || 0;
      if (have < needed) canCook = false;
      const info = (typeof getItemInfo === 'function') ? getItemInfo(ing) : { nameKo: ing };
      const ok = have >= needed;
      reqBits.push(
        '<span class="recipe-req-chip' + (ok ? ' ok' : ' miss') + '">' +
        art(info.nameKo || ing, info.icon, 16) +
        (info.nameKo || ing) + ' ' + have + '/' + needed +
        '</span>'
      );
    });
    if (canCook) card.classList.add('ready');

    card.innerHTML = `
      <div class="recipe-card-icon">${art(r.name, r.icon, 48)}</div>
      <div class="recipe-card-title">${r.name}</div>
      <div class="recipe-card-sub">${r.enName}</div>
      <div class="recipe-req-list">${reqBits.join('')}</div>
      <div class="recipe-buff-badge">${r.buff.name}</div>
      <div class="recipe-card-actions">
        <button class="cook-btn" ${canCook ? '' : 'disabled'} onclick="startCookingMinigame('${r.id}')">Cook</button>
        <button type="button" class="recipe-info-btn" onclick="showCulturalFact('${r.id}')">Info</button>
      </div>
    `;
    grid.appendChild(card);
  });

  setModalState('recipe-overlay', true);
};

window.closeRecipeBook = function() {
  playChiptuneSFX('click');
  setModalState('recipe-overlay', false);
};


// ── COOKING MINIGAME LOGIC ────────────────────────────────────────────────────
let currentCookingRecipe = null;
let cookingStage = 0;
let cookingScore = 0;
let activeHeatInterval = null;

window.startCookingMinigame = function(recipeId) {
  const recipe = RECIPE_DB.find(r => r.id === recipeId);
  if (!recipe) return;

  // Check ingredients
  const ingMap = inventoryState.ingredients || {};
  for (const [ing, needed] of Object.entries(recipe.req)) {
    if ((ingMap[ing] || 0) < needed) {
      showToast(`⚠️ Missing required ingredient: ${ing}!`);
      return;
    }
  }

  // Deduct ingredients
  for (const [ing, needed] of Object.entries(recipe.req)) {
    ingMap[ing] -= needed;
  }
  persistSave();

  currentCookingRecipe = recipe;
  cookingStage = 1;
  cookingScore = 0;

  closeRecipeBook();
  const overlay = document.getElementById('cooking-minigame-overlay');
  if (overlay) overlay.classList.add('visible');

  renderCookingStage();
};

function renderCookingStage() {
  const dishIcon = document.getElementById('cmg-dish-icon');
  const dishName = document.getElementById('cmg-dish-name');
  const stepDesc = document.getElementById('cmg-step-desc');
  const container = document.getElementById('cmg-stage-container');

  if (!currentCookingRecipe || !container) return;

  dishIcon.textContent = currentCookingRecipe.icon;
  dishName.textContent = `${currentCookingRecipe.name} (${currentCookingRecipe.enName})`;

  if (cookingStage === 1) {
    stepDesc.textContent = 'Stage 1/2: Prep Ingredients - Select the correct Korean name!';
    const correctTarget = Object.keys(currentCookingRecipe.req)[0];
    // Shuffle the pool *before* taking three, not the result after. The old loop walked
    // KOREAN_INGREDIENTS in declaration order and stopped once it had four, so every prep
    // question in the game offered the same three decoys — 배추 / 무 / 파 — and the answer
    // became the odd one out rather than something you had to read the Korean to find.
    const decoys = shuffleInPlace(KOREAN_INGREDIENTS.filter(ing => ing !== correctTarget)).slice(0, 3);
    const choices = shuffleInPlace([correctTarget, ...decoys]);

    container.innerHTML = `
      <div style="font-size:16px; color:#fff; margin-bottom:12px;">Which ingredient is needed first?</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; width:100%;">
        ${choices.map(choice => `
          <button class="cook-btn" style="padding:12px; font-size:14px;" onclick="handleCookingStage1('${choice}', '${correctTarget}')">${choice}</button>
        `).join('')}
      </div>
    `;
  } else if (cookingStage === 2) {
    stepDesc.textContent = 'Stage 2/2: Heat Adjustment - Click when heat is IN THE GREEN ZONE!';
    
    let sliderPos = 0;
    let direction = 1;
    container.innerHTML = `
      <div style="font-size:14px; color:#fff; margin-bottom:12px;">Adjust Cooking Temperature (불 조절):</div>
      <div style="width:100%; height:24px; background:#1e293b; border-radius:12px; position:relative; overflow:hidden; border:1px solid var(--neon-gold); margin-bottom:16px;">
        <div style="position:absolute; left:40%; width:20%; height:100%; background:rgba(34,197,94,0.6);"></div>
        <div id="heat-indicator" style="position:absolute; left:0%; width:10px; height:100%; background:#ef4444;"></div>
      </div>
      <button class="cook-btn" style="padding:12px 24px; font-size:12px;" id="heat-click-btn">🔥 STOP HEAT!</button>
    `;

    const indicator = document.getElementById('heat-indicator');
    const heatBtn = document.getElementById('heat-click-btn');

    if (activeHeatInterval) clearInterval(activeHeatInterval);
    activeHeatInterval = setInterval(() => {
      sliderPos += direction * 4;
      if (sliderPos >= 95) direction = -1;
      if (sliderPos <= 0) direction = 1;
      if (indicator) indicator.style.left = sliderPos + '%';
    }, 30);

    if (heatBtn) {
      heatBtn.onclick = () => {
        if (activeHeatInterval) {
          clearInterval(activeHeatInterval);
          activeHeatInterval = null;
        }
        if (sliderPos >= 40 && sliderPos <= 60) {
          cookingScore += 50; // Perfect heat!
          playChiptuneSFX('quiz_correct');
        } else {
          cookingScore += 20;
          playChiptuneSFX('quiz_wrong');
        }
        finishCookingMinigame();
      };
    }
  }
}

window.handleCookingStage1 = function(selected, target) {
  if (selected === target) {
    cookingScore += 50;
    playChiptuneSFX('quiz_correct');
  } else {
    cookingScore += 10;
    playChiptuneSFX('quiz_wrong');
  }
  cookingStage = 2;
  renderCookingStage();
};

function finishCookingMinigame() {
  closeCookingMinigame();

  let grade = 'B';
  let mult = 1.0;
  if (cookingScore >= 90) { grade = 'S'; mult = 1.5; }
  else if (cookingScore >= 70) { grade = 'A'; mult = 1.25; }
  else if (cookingScore < 40) { grade = 'F'; mult = 0.5; }

  const b = currentCookingRecipe.buff;
  const duration = Math.round(b.durationMs * mult);
  applyBuff(b.type, `${b.name} (${grade} Grade)`, duration, b.value, currentCookingRecipe.icon);

  // Store cooked dish for pet feeding
  inventoryState.cookedDishes = inventoryState.cookedDishes || {};
  inventoryState.cookedDishes[currentCookingRecipe.id] = (inventoryState.cookedDishes[currentCookingRecipe.id] || 0) + 1;
  persistSave();


  // Show cultural fact modal!
  showCulturalFact(currentCookingRecipe.id, grade);
}

window.closeCookingMinigame = function() {
  if (activeHeatInterval) {
    clearInterval(activeHeatInterval);
    activeHeatInterval = null;
  }
  const overlay = document.getElementById('cooking-minigame-overlay');
  if (overlay) overlay.classList.remove('visible');
};

window.showCulturalFact = function(recipeId, grade = null) {
  const recipe = RECIPE_DB.find(r => r.id === recipeId);
  if (!recipe) return;

  const iconEl = document.getElementById('cf-icon');
  const titleEl = document.getElementById('cf-title');
  const textEl = document.getElementById('cf-text');

  if (iconEl) iconEl.textContent = recipe.icon;
  if (titleEl) titleEl.textContent = grade ? `Grade ${grade}! ${recipe.name} (${recipe.enName})` : `${recipe.name} (${recipe.enName})`;
  if (textEl) textEl.textContent = recipe.culturalFact;

  const overlay = document.getElementById('cultural-fact-overlay');
  if (overlay) overlay.classList.add('visible');
};

window.closeCulturalFact = function() {
  const overlay = document.getElementById('cultural-fact-overlay');
  if (overlay) overlay.classList.remove('visible');
};


// ══════════════ LOCAL LEADERBOARD SYSTEM ═════════════════════════════════════

const LOCAL_RIVALS = [
  { name: 'Min-jun (민준)', title: 'Valley Veteran 🌾', words: 24, honor: 850, cookingTier: 'Sous Chef 🍲', arcade: 1450, dungeon: 8, duelStreak: 7, rankLv: 31 },
  { name: 'Seo-yeon (서연)', title: 'Hansik Scholar 👑', words: 18, honor: 620, cookingTier: 'Apprentice Chef 👨‍🍳', arcade: 1100, dungeon: 6, duelStreak: 5, rankLv: 26 },
  { name: 'Ji-hoon (지훈)', title: 'Spell Duelist ⚡', words: 12, honor: 450, cookingTier: 'Novice Cook 🍳', arcade: 850, dungeon: 4, duelStreak: 4, rankLv: 18 },
  { name: 'Ha-eun (하은)', title: 'Art Artisan 🎨', words: 8, honor: 280, cookingTier: 'Novice Cook 🍳', arcade: 520, dungeon: 2, duelStreak: 2, rankLv: 9 }
];

function computeCookingTier() {
  const dishes = inventoryState?.cookedDishes || {};
  const totalCooked = Object.values(dishes).reduce((a, b) => a + b, 0);
  if (totalCooked >= 50) return 'Grand Hansik Master 👑';
  if (totalCooked >= 30) return 'Master Chef 🌟';
  if (totalCooked >= 15) return 'Sous Chef 🍲';
  if (totalCooked >= 5) return 'Apprentice Chef 👨‍🍳';
  return 'Novice Cook 🍳';
}

function computeCookingTierScore(tierStr) {
  if (!tierStr) return 0;
  if (tierStr.includes('Grand')) return 500;
  if (tierStr.includes('Master Chef')) return 300;
  if (tierStr.includes('Sous Chef')) return 150;
  if (tierStr.includes('Apprentice')) return 50;
  return 10;
}

function updateLeaderboardMetrics() {
  if (typeof leaderboardState === 'undefined' || !leaderboardState) leaderboardState = { personalBests: {} };
  if (!leaderboardState.personalBests) leaderboardState.personalBests = {};

  // Total Words Mastered — mature under the scheduler (interval >= 21 days), not a
  // harvest tally, which a player could run up in a single session.
  const masteredCount = (typeof srsData !== 'undefined' && srsData)
    ? Object.values(srsData).filter(srsIsMature).length
    : 0;

  leaderboardState.personalBests.totalWordsMastered = masteredCount;
  leaderboardState.personalBests.totalHonor = playerCurrencies?.honor || 0;
  leaderboardState.personalBests.highestCookingTier = computeCookingTier();
  ensurePlayerRank();
  leaderboardState.personalBests.valleyLevel = playerRank.level;
  leaderboardState.personalBests.valleyTitle = rankTitleFor(playerRank.level).en;
  

  if (typeof leaderboardState.personalBests.arcadeHighScore !== 'number') {
    leaderboardState.personalBests.arcadeHighScore = 0;
  }
  if (typeof leaderboardState.personalBests.dungeonMaxFloor !== 'number') {
    leaderboardState.personalBests.dungeonMaxFloor = 0;
  }
  if (typeof leaderboardState.personalBests.duelMaxWinStreak !== 'number') {
    leaderboardState.personalBests.duelMaxWinStreak = 0;
  }

  persistSave();
}

function openLeaderboard(tab = 'vocab') {
  updateLeaderboardMetrics();

  // Render Personal Best Grid
  const pbGrid = document.getElementById('lb-pb-grid');
  if (pbGrid) {
    const pb = leaderboardState.personalBests;
    pbGrid.innerHTML = `
      <div style="background:rgba(15,23,42,0.6); padding:8px; border-radius:8px;">📖 Words Mastered: <b style="color:var(--neon-gold)">${pb.totalWordsMastered}</b></div>
      <div style="background:rgba(15,23,42,0.6); padding:8px; border-radius:8px;">⭐ Valley Rank: <b style="color:var(--neon-gold)">Lv.${pb.valleyLevel || 1} ${pb.valleyTitle || ''}</b></div>
      <div style="background:rgba(15,23,42,0.6); padding:8px; border-radius:8px;">🎖️ Total Honor: <b style="color:var(--neon-gold)">${pb.totalHonor}</b></div>
      <div style="background:rgba(15,23,42,0.6); padding:8px; border-radius:8px;">🍳 Cooking Tier: <b style="color:var(--neon-gold)">${pb.highestCookingTier}</b></div>
      <div style="background:rgba(15,23,42,0.6); padding:8px; border-radius:8px;">👾 Arcade Score: <b style="color:var(--neon-gold)">${pb.arcadeHighScore}</b></div>
      <div style="background:rgba(15,23,42,0.6); padding:8px; border-radius:8px;">🗡️ Dungeon Floor: <b style="color:var(--neon-gold)">Floor ${pb.dungeonMaxFloor}</b></div>
      <div style="background:rgba(15,23,42,0.6); padding:8px; border-radius:8px;">⚡ Duel Streak: <b style="color:var(--neon-gold)">${pb.duelMaxWinStreak} Wins</b></div>
    `;
  }

  switchLeaderboardTab(tab);

  const modal = document.getElementById('leaderboard-overlay');
  setModalState('leaderboard-overlay', true);
}

function closeLeaderboard() {
  playChiptuneSFX('click');
  setModalState('leaderboard-overlay', false);
}


function switchLeaderboardTab(tabId) {
  currentLeaderboardTab = tabId;

  const tabBtns = document.querySelectorAll('.lb-tab-btn');
  tabBtns.forEach(btn => {
    if (btn.id === `lbtab-${tabId}` || btn.getAttribute('onclick')?.includes(`'${tabId}'`)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const pb = leaderboardState.personalBests;
  const meTitle = rankTitleFor((typeof playerRank !== 'undefined' && playerRank.level) || 1);
  const playerEntry = {
    name: 'Player (Hero Player) 🌟',
    title: meTitle.icon + ' ' + meTitle.en,
    words: pb.totalWordsMastered || 0,
    honor: pb.totalHonor || 0,
    cookingTier: pb.highestCookingTier || 'Novice Cook 🍳',
    arcade: pb.arcadeHighScore || 0,
    dungeon: pb.dungeonMaxFloor || 0,
    duelStreak: pb.duelMaxWinStreak || 0,
    rankLv: (typeof playerRank !== 'undefined' && playerRank.level) || 1,
    isPlayer: true
  };

  const allEntries = [...LOCAL_RIVALS, playerEntry];

  // Sort based on active tab
  allEntries.sort((a, b) => {
    if (tabId === 'vocab') return b.words - a.words;
    if (tabId === 'honor') return b.honor - a.honor;
    if (tabId === 'cooking') return computeCookingTierScore(b.cookingTier) - computeCookingTierScore(a.cookingTier);
    if (tabId === 'arcade') return b.arcade - a.arcade;
    if (tabId === 'dungeon') return b.dungeon - a.dungeon;
    if (tabId === 'duel') return b.duelStreak - a.duelStreak;
    if (tabId === 'rank') return (b.rankLv || 0) - (a.rankLv || 0);
    return 0;
  });

  let valColHeader = 'Score';
  if (tabId === 'vocab') valColHeader = 'Words Mastered (>=5 Harvests)';
  if (tabId === 'honor') valColHeader = 'Total Honor 🏅';
  if (tabId === 'cooking') valColHeader = 'Cooking Rank';
  if (tabId === 'arcade') valColHeader = 'Arcade High Score';
  if (tabId === 'dungeon') valColHeader = 'Dungeon Max Floor';
  if (tabId === 'duel') valColHeader = 'Spell Duel Win Streak';
  if (tabId === 'rank') valColHeader = 'Valley Rank';

  let html = `
    <table class="lb-table">
      <thead>
        <tr>
          <th style="width:10%">Rank</th>
          <th style="width:35%">Valley Resident</th>
          <th style="width:25%">Title</th>
          <th style="width:30%">${valColHeader}</th>
        </tr>
      </thead>
      <tbody>
  `;

  allEntries.forEach((entry, idx) => {
    let rankBadge = `${idx + 1}`;
    if (idx === 0) rankBadge = '🥇 1st';
    if (idx === 1) rankBadge = '🥈 2nd';
    if (idx === 2) rankBadge = '🥉 3rd';

    let displayVal = '';
    if (tabId === 'vocab') displayVal = `${entry.words} words`;
    if (tabId === 'honor') displayVal = `${entry.honor} Honor 🏅`;
    if (tabId === 'cooking') displayVal = entry.cookingTier;
    if (tabId === 'arcade') displayVal = `${entry.arcade} pts`;
    if (tabId === 'dungeon') displayVal = `Floor ${entry.dungeon}`;
    if (tabId === 'duel') displayVal = `${entry.duelStreak} Win Streak`;
    if (tabId === 'rank') displayVal = `Lv.${entry.rankLv || 1}`;

    const rowClass = entry.isPlayer ? 'class="lb-row-player"' : '';

    html += `
      <tr ${rowClass}>
        <td style="font-family:'Press Start 2P',monospace; font-size:10px">${rankBadge}</td>
        <td>${entry.name}</td>
        <td style="color:#94a3b8">${entry.title}</td>
        <td style="font-weight:bold; color:var(--neon-gold)">${displayVal}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  const container = document.getElementById('lb-table-container');
  if (container) container.innerHTML = html;
}

// ═══════════════ PROGRESS DASHBOARD ══════════════════════════════════════════
// A real scheduler is invisible without a readout: intervals live in a save file and the
// player has no way to tell whether they are actually retaining anything. This surfaces
// the four numbers that matter — what is due, what is mature, what is coming, and how
// often reviews are being failed.
function renderProgressOverlay() {
  const s = srsStats();
  const grid = $('prog-stat-grid');
  if (!grid) return;

  const totalWords = unlockedLevels.reduce((a, i) => a + (levelsData[i]?.words?.length || 0), 0);
  const cards = [
    { cls: 'gold',  val: s.dueNow,                       lbl: 'Due now' },
    { cls: 'green', val: s.mature,                       lbl: `Mature (${SRS_CFG.MATURE_IVL}d+)` },
    { cls: '',      val: s.graduated,                    lbl: 'Learned' },
    { cls: '',      val: s.learning,                     lbl: 'In learning' },
    { cls: '',      val: Math.max(0, totalWords - s.seen), lbl: 'Untouched' },
    { cls: s.retention !== null && s.retention < 80 ? 'rose' : 'green',
      val: s.retention === null ? '—' : s.retention + '%', lbl: 'Retention' },
  ];
  // Lifetime retention moves slowly once there is history behind it, so a rolling figure
  // over the last 50 answers is what actually reflects how the current session is going.
  const recent = recentAccuracy(50);
  if (recent !== null) {
    cards.push({ cls: recent < 70 ? 'rose' : '', val: recent + '%', lbl: 'Last 50 answers' });
  }
  grid.innerHTML = cards.map(c =>
    `<div class="prog-stat ${c.cls}"><div class="prog-stat-val">${c.val}</div><div class="prog-stat-lbl">${c.lbl}</div></div>`
  ).join('');

  // 7-day forecast. Bars are scaled to the busiest day so a light week still reads clearly.
  const fc = srsForecast(7);
  const peak = Math.max(1, ...fc);
  const now = new Date();
  const labels = fc.map((_, i) => i === 0
    ? 'Today'
    : new Date(now.getTime() + i * DAY_MS).toLocaleDateString(undefined, { weekday: 'short' }));
  $('prog-forecast').innerHTML = fc.map((n, i) =>
    `<div class="prog-bar-col">
       <span class="prog-bar-n">${n || ''}</span>
       <div class="prog-bar ${i === 0 ? 'today' : ''}" style="height:${Math.round((n / peak) * 70)}%"></div>
       <span class="prog-bar-d">${labels[i]}</span>
     </div>`
  ).join('');

  // Per level: learned as the wide bar, mature overlaid, so the gap between "seen it" and
  // "actually retained it" is visible at a glance.
  $('prog-levels').innerHTML = unlockedLevels.slice().sort((a, b) => a - b).map(i => {
    const lvl = levelsData[i]; if (!lvl) return '';
    const learned = calcLevelProgress(i), mature = calcLevelMastery(i);
    return `<div class="prog-level-row">
      <span class="prog-level-name" title="${levelName(lvl)}">${lvl.icon || '📘'} ${levelName(lvl)}</span>
      <span class="prog-level-track">
        <span class="prog-level-learned" style="width:${learned}%"></span>
        <span class="prog-level-mature" style="width:${mature}%"></span>
      </span>
      <span class="prog-level-pct">${learned}% / ${mature}%</span>
    </div>`;
  }).join('');

  // Per-skill breakdown. Each modality schedules independently, so this is where the gap
  // between "I recognise it" and "I can produce it" becomes visible.
  const modWrap = $('prog-modalities');
  if (modWrap) {
    const LBL = { type: '⌨️ Type (production)', recognise: '👁 Recognise', listen: '👂 Listen' };
    const any = MODALITIES.some(m => s.byModality[m].started > 0);
    modWrap.parentElement.style.display = any ? '' : 'none';
    if (any) {
      modWrap.innerHTML = MODALITIES.map(m => {
        const b = s.byModality[m];
        const gradPct = b.started ? Math.round((b.graduated / b.started) * 100) : 0;
        const matPct  = b.started ? Math.round((b.mature / b.started) * 100) : 0;
        return `<div class="prog-level-row">
          <span class="prog-level-name">${LBL[m]}</span>
          <span class="prog-level-track">
            <span class="prog-level-learned" style="width:${gradPct}%"></span>
            <span class="prog-level-mature" style="width:${matPct}%"></span>
          </span>
          <span class="prog-level-pct">${b.graduated}/${b.started}${b.mature ? ` · ${b.mature}🌟` : ''}</span>
        </div>`;
      }).join('');
    }
  }

  // Answers per day over the last fortnight — the streak view. Only rendered once there is
  // history, so a fresh save does not show fourteen empty columns.
  const act = dailyActivity(14);
  const actWrap = $('prog-activity');
  if (actWrap) {
    const total = act.reduce((a, b) => a + b, 0);
    actWrap.parentElement.style.display = total ? '' : 'none';
    if (total) {
      const peakA = Math.max(1, ...act);
      actWrap.innerHTML = act.map((n, i) =>
        `<span class="prog-day ${n ? 'has' : ''}" title="${n} answer${n === 1 ? '' : 's'}"
               style="opacity:${n ? (0.35 + 0.65 * (n / peakA)).toFixed(2) : 1}">${
          i === act.length - 1 ? '<b>·</b>' : ''}</span>`
      ).join('');
    }
  }

  $('prog-footnote').innerHTML =
    `Cyan = learned, gold = mature. A word becomes <b>mature</b> once its review interval reaches
     ${SRS_CFG.MATURE_IVL} days, which takes several correctly spaced reviews — it cannot be rushed in
     one session. <b>Retention</b> is the share of reviews passed without a lapse.
     ${s.avgEase !== null ? `Average ease ${s.avgEase}.` : ''}`;
}

function openProgressOverlay() {
  playChiptuneSFX('click');
  renderProgressOverlay();
  setModalState('progress-overlay', true);
  $('progress-overlay').classList.remove('hidden');
}

function closeProgressOverlay() {
  playChiptuneSFX('click');
  $('progress-overlay').classList.add('hidden');
  setModalState('progress-overlay', false);
}

// Global window exports for HTML event bindings
if (typeof window !== 'undefined') {
  window.openProgressOverlay = openProgressOverlay;
  window.closeProgressOverlay = closeProgressOverlay;
  window.openLeaderboard = openLeaderboard;
  window.closeLeaderboard = closeLeaderboard;
  window.switchLeaderboardTab = switchLeaderboardTab;
  window.openRankCard = openRankCard;
  window.closeRankCard = closeRankCard;
  window.closeRankUp = closeRankUp;
  // Cooking UI lives in this file. Exporting these from ui.js (an earlier script
  // tag) was a load-time ReferenceError that killed the rest of ui.js in the browser.
  window.openCookingUI = openCookingUI;
  window.closeCookingUI = closeCookingUI;
  window.renderCookingGrid = renderCookingGrid;
  window.cookRecipe = cookRecipe;
  window.checkCookingAchievements = checkCookingAchievements;
}

