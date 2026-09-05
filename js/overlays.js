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
      <div class="fish-card-en">${unlocked ? tr(f, 'en') : hvT('ui.fish.locked')}</div>
      <div class="fish-card-catches">${unlocked
        ? hvT('ui.fish.caught', { n: count })
        : '🔒 ' + hvT('ui.fish.uncaught')}</div>`;
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
  document.getElementById('memory-matches').textContent = hvT('ui.memory.matches.fmt', { n: 0, total: 8 });
  document.getElementById('memory-flips').textContent = hvT('ui.memory.flips.fmt', { n: 0 });
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
     memoryCards.push({ text: tr(w, 'en'), type: 'en', id });
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
    document.getElementById('memory-flips').textContent = hvT('ui.memory.flips.fmt', { n: memoryFlips });
    
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
        document.getElementById('memory-matches').textContent =
          hvT('ui.memory.matches.fmt', { n: matchedPairs, total: 8 });
        
        if(matchedPairs === 8){
           const reward = Math.max(15, 60 - memoryFlips);
           if (typeof checkQuestProgress === 'function') checkQuestProgress('memory', { count: 1 });
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
  { id: 'bronze_apple', name: 'Rookie (신입)', nameVi: 'Tân binh (신입)', icon: '🥉', reqHarvests: 10, cost: 50 },
  { id: 'silver_spade', name: 'Farmer (농부)', nameVi: 'Nhà nông (농부)', icon: '🥈', reqHarvests: 50, cost: 300 },
  { id: 'gold_tractor', name: 'Expert (전문가)', nameVi: 'Chuyên gia (전문가)', icon: '🥇', reqHarvests: 150, cost: 1000 },
  { id: 'diamond_crown', name: 'Master (달인)', nameVi: 'Cao thủ (달인)', icon: '💎', reqHarvests: 500, cost: 5000 },
  { id: 'master_scholar', name: 'Legend (전설)', nameVi: 'Huyền thoại (전설)', icon: '👑', reqHarvests: 1000, cost: 20000 },
  // No hardcoded recipe count. It used to carry `reqRecipes: 10`, which the trophy card
  // preferred over COOKING_RECIPES.length while the actual unlock below compared against the
  // real length — so once the two honey recipes brought the total to 12, the card read 10/10
  // and showed the requirement as met on a trophy that would never unlock.
  { id: 'master_chef', name: 'Master Chef (요리 왕)', nameVi: 'Đầu bếp bậc thầy (요리 왕)', icon: '👨‍🍳', desc: 'Cook every recipe at least once', descriptionVi: 'Nấu mỗi món ít nhất một lần', type: 'cooking', cost: 0 }
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
      reqText = `<span style="font-size:12px;color:#5b3412;font-family:'Noto Sans KR',sans-serif;font-weight:700;">${hvT('ui.trophy.req.cooking')}</span><br/>${totalCooked}/${targetCount}`;
    } else {
      reqMet = totalHarvests >= t.reqHarvests;
      reqText = `<span style="font-size:12px;color:#5b3412;font-family:'Noto Sans KR',sans-serif;font-weight:700;">${hvT('ui.trophy.req.harvests')}</span><br/>${totalHarvests}/${t.reqHarvests}`;
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
        <div class="trophy-name">${tr(t, 'name')}</div>
        <div class="trophy-req">${reqText}</div>
      </div>
      ${isBought ?
        '<div class="trophy-unlocked-badge">' + hvT('ui.trophy.unlocked') + '</div>' :
        '<button class="trophy-buy-btn" ' + ((!reqMet || (!canAfford && t.cost > 0)) ? 'disabled' : '') + '>' +
           (!reqMet ? hvT('ui.quest.locked')
             : (t.cost > 0 ? hvT('ui.trophy.buy') + ' ' + coin + t.cost : hvT('ui.trophy.claim'))) +
         '</button>'
      }
    `;
    
    if(!isBought && reqMet && (canAfford || t.cost === 0)) {
      div.querySelector('.trophy-buy-btn').addEventListener('click', () => {
         if (t.cost > 0 && !spendCoins(t.cost)) return;
         unlockedTrophies.push(t.id);
         window.renderTrophies();
         showToast('🏆 ' + hvT('ui.trophy.won', { name: tr(t, 'name') }));
      });
    }
    grid.appendChild(div);
  });
};

const trophyBtn = document.getElementById('trophy-btn');
if(trophyBtn) trophyBtn.addEventListener('click', window.openTrophies);
const trophyCloseBtn = document.getElementById('trophy-close-btn');
if(trophyCloseBtn) trophyCloseBtn.addEventListener('click', window.closeTrophies);

// Spell Quiz Duel was removed. Shop / boss-gate still uses .duel-option-btn.

// ═══════════════ R3: CRAFTING / COOKING SYSTEM & BUFFS ════════════════════════
var COOKING_RECIPES = [
  {
    id: 'kimchi',
    nameEn: 'Kimchi', nameVi: 'Kimchi',
    nameKo: '김치',
    icon: '🥬',
    description: 'Traditional spicy fermented Napa cabbage with chili and garlic.', descriptionVi: 'Cải thảo muối lên men cay truyền thống với ớt và tỏi.',
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
    nameEn: 'Radish Rice', nameVi: 'Cơm củ cải',
    nameKo: '무밥',
    icon: '🍚',
    description: 'Comforting Korean steamed rice infused with sweet sliced radish.', descriptionVi: 'Cơm hấp Hàn Quốc ấm bụng, trộn củ cải thái ngọt.',
    ingredients: [
      { itemId: 'rice', count: 1 },
      { itemId: 'radish', count: 1 }
    ],
    xpReward: 20,
    goldReward: 25
  },
  {
    id: 'roasted_corn',
    nameEn: 'Roasted Corn', nameVi: 'Ngô nướng',
    nameKo: '옥수수구이',
    icon: '🌽',
    description: 'Sweet juicy corn on the cob roasted over open farm embers.', descriptionVi: 'Bắp ngô ngọt mọng nướng trên than hồng của nông trại.',
    ingredients: [
      { itemId: 'corn', count: 2 }
    ],
    xpReward: 20,
    goldReward: 20
  },
  {
    id: 'strawberry_jam',
    nameEn: 'Strawberry Jam', nameVi: 'Mứt dâu',
    nameKo: '딸기잼',
    icon: '🍓',
    description: 'Sweet homemade jam boiled down from fresh garden strawberries.', descriptionVi: 'Mứt nhà làm ngọt lịm, sên từ dâu tây tươi hái trong vườn.',
    ingredients: [
      { itemId: 'strawberry', count: 2 }
    ],
    xpReward: 22,
    goldReward: 25
  },
  {
    id: 'gimbap',
    nameEn: 'Gimbap', nameVi: 'Gimbap',
    nameKo: '김밥',
    icon: '🍱',
    description: 'Savory seaweed rice roll filled with carrots and pickled radish.', descriptionVi: 'Cơm cuộn rong biển đậm đà với cà rốt và củ cải muối.',
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
    nameEn: 'Tteokbokki', nameVi: 'Tteokbokki',
    nameKo: '떡볶이',
    icon: '🍢',
    description: 'Chewy rice cakes simmered in spicy gochujang and green onion.', descriptionVi: 'Bánh gạo dai om trong sốt gochujang cay cùng hành lá.',
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
    nameEn: 'Potato Pancake', nameVi: 'Bánh khoai tây',
    nameKo: '감자전',
    icon: '🥔',
    description: 'Crispy pan-fried potato pancake seasoned with green onions and garlic.', descriptionVi: 'Bánh khoai tây áp chảo giòn rụm, nêm hành lá và tỏi.',
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
    nameEn: 'Bibimbap', nameVi: 'Bibimbap',
    nameKo: '비빔밥',
    icon: '🥗',
    description: 'Nourishing bowl of rice topped with cabbage, carrot, soybean, and chili.', descriptionVi: 'Bát cơm bổ dưỡng phủ cải thảo, cà rốt, đậu nành và ớt.',
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
    nameEn: 'Bulgogi', nameVi: 'Bulgogi',
    nameKo: '불고기',
    icon: '🍖',
    description: 'Flavorful marinated dish with garlic, green onions, and soybeans.', descriptionVi: 'Món thịt ướp đậm vị với tỏi, hành lá và đậu nành.',
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
    nameEn: 'Samgyetang', nameVi: 'Samgyetang',
    nameKo: '궁중 삼계탕',
    icon: '🍲',
    description: 'Royal ginseng chicken soup cooked with rice, garlic, radish, and green onions.', descriptionVi: 'Canh gà hầm sâm kiểu cung đình, nấu cùng gạo, tỏi, củ cải và hành lá.',
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
    nameEn: 'Honey Yakgwa', nameVi: 'Bánh mật Yakgwa',
    nameKo: '꿀약과',
    icon: '🥮',
    description: 'Traditional Korean honey pastry made with wheat, honey, and sesame oil.', descriptionVi: 'Bánh mật ong truyền thống Hàn Quốc làm từ bột mì, mật ong và dầu vừng.',
    ingredients: [
      { itemId: 'honey', count: 2 },
      { itemId: 'cabbage', count: 1 }
    ],
    xpReward: 50,
    goldReward: 60
  },
  {
    id: 'honey_tea',
    nameEn: 'Honey Tea', nameVi: 'Trà mật ong',
    nameKo: '꿀차',
    icon: '🍵',
    description: 'Warm soothing tea sweetened with fresh natural honey.', descriptionVi: 'Tách trà ấm dịu, pha ngọt bằng mật ong nguyên chất.',
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
  { id: 'u10-kimchi-jjigae', nameEn: 'Kimchi stew', nameVi: 'Canh kimchi', nameKo: '김치찌개', icon: '🍲',
    description: 'Spicy stew. Grow 배추, 고추, 마늘, 파.', descriptionVi: 'Canh cay. Trồng 배추, 고추, 마늘, 파.',
    ingredients: [{ itemId: '배추', count: 1 }, { itemId: '고추', count: 1 }, { itemId: '마늘', count: 1 }, { itemId: '파', count: 1 }],
    xpReward: 30, goldReward: 35 },
  { id: 'u10-doenjang-jjigae', nameEn: 'Soybean-paste stew', nameVi: 'Canh tương đậu', nameKo: '된장찌개', icon: '🥘',
    description: 'Earthy stew. Grow 콩, 감자, 파, 마늘.', descriptionVi: 'Canh vị đậm mộc mạc. Trồng 콩, 감자, 파, 마늘.',
    ingredients: [{ itemId: '콩', count: 1 }, { itemId: '감자', count: 1 }, { itemId: '파', count: 1 }, { itemId: '마늘', count: 1 }],
    xpReward: 30, goldReward: 35 },
  { id: 'u10-sundubu', nameEn: 'Soft-tofu stew', nameVi: 'Canh đậu hũ non', nameKo: '순두부찌개', icon: '🥣',
    description: 'Soft tofu stew. Grow 콩, 고추, 파, 마늘.', descriptionVi: 'Canh đậu hũ non. Trồng 콩, 고추, 파, 마늘.',
    ingredients: [{ itemId: '콩', count: 1 }, { itemId: '고추', count: 1 }, { itemId: '파', count: 1 }, { itemId: '마늘', count: 1 }],
    xpReward: 32, goldReward: 38 },
  { id: 'u10-gamjatang', nameEn: 'Pork-bone potato stew', nameVi: 'Canh xương khoai tây', nameKo: '감자탕', icon: '🍖',
    description: 'Potato stew. Grow 감자, 파, 고추, 마늘.', descriptionVi: 'Canh khoai tây. Trồng 감자, 파, 고추, 마늘.',
    ingredients: [{ itemId: '감자', count: 2 }, { itemId: '파', count: 1 }, { itemId: '고추', count: 1 }, { itemId: '마늘', count: 1 }],
    xpReward: 36, goldReward: 42 },
  { id: 'u10-maeuntang', nameEn: 'Spicy fish stew', nameVi: 'Canh cá cay', nameKo: '매운탕', icon: '🐟',
    description: 'Spicy broth veg. Grow 고추, 무, 파, 마늘.', descriptionVi: 'Rau cho nước dùng cay. Trồng 고추, 무, 파, 마늘.',
    ingredients: [{ itemId: '고추', count: 2 }, { itemId: '무', count: 1 }, { itemId: '파', count: 1 }, { itemId: '마늘', count: 1 }],
    xpReward: 34, goldReward: 40 },
  { id: 'u10-naengmyeon', nameEn: 'Cold noodles', nameVi: 'Mì lạnh', nameKo: '냉면', icon: '🍜',
    description: 'Summer cold noodles. Grow 오이, 무, 파.', descriptionVi: 'Mì lạnh mùa hè. Trồng 오이, 무, 파.',
    ingredients: [{ itemId: '오이', count: 1 }, { itemId: '무', count: 1 }, { itemId: '파', count: 1 }],
    xpReward: 28, goldReward: 32 },
  { id: 'u10-kalguksu', nameEn: 'Knife-cut noodles', nameVi: 'Mì thái tay', nameKo: '칼국수', icon: '🍝',
    description: 'Hand-cut noodle soup. Grow 쌀, 파, 마늘.', descriptionVi: 'Canh mì thái tay. Trồng 쌀, 파, 마늘.',
    ingredients: [{ itemId: '쌀', count: 2 }, { itemId: '파', count: 1 }, { itemId: '마늘', count: 1 }],
    xpReward: 30, goldReward: 34 },
  { id: 'u10-bibim-guksu', nameEn: 'Spicy mixed noodles', nameVi: 'Mì trộn cay', nameKo: '비빔국수', icon: '🥗',
    description: 'Spicy mixed noodles. Grow 오이, 고추, 파.', descriptionVi: 'Mì trộn cay. Trồng 오이, 고추, 파.',
    ingredients: [{ itemId: '오이', count: 1 }, { itemId: '고추', count: 1 }, { itemId: '파', count: 1 }],
    xpReward: 28, goldReward: 32 },
  { id: 'u10-bibimbap', nameEn: 'Bibimbap', nameVi: 'Cơm trộn', nameKo: '비빔밥', icon: '🍚',
    description: 'Mixed rice. Grow 쌀, 당근, 콩나물, 고추.', descriptionVi: 'Cơm trộn. Trồng 쌀, 당근, 콩나물, 고추.',
    ingredients: [{ itemId: '쌀', count: 1 }, { itemId: '당근', count: 1 }, { itemId: '콩나물', count: 1 }, { itemId: '고추', count: 1 }],
    xpReward: 40, goldReward: 48 },
  { id: 'u10-samgyeopsal', nameEn: 'Grilled pork belly', nameVi: 'Ba chỉ nướng', nameKo: '삼겹살', icon: '🥓',
    description: 'Ssam wrap sides. Grow 상추, 마늘, 고추.', descriptionVi: 'Rau ăn kèm cuốn ssam. Trồng 상추, 마늘, 고추.',
    ingredients: [{ itemId: '상추', count: 2 }, { itemId: '마늘', count: 1 }, { itemId: '고추', count: 1 }],
    xpReward: 34, goldReward: 40 },
  { id: 'u10-galbijjim', nameEn: 'Braised short ribs', nameVi: 'Sườn om', nameKo: '갈비찜', icon: '🍖',
    description: 'Braised-rib veg. Grow 당근, 감자, 파, 마늘.', descriptionVi: 'Rau cho món sườn om. Trồng 당근, 감자, 파, 마늘.',
    ingredients: [{ itemId: '당근', count: 1 }, { itemId: '감자', count: 1 }, { itemId: '파', count: 1 }, { itemId: '마늘', count: 1 }],
    xpReward: 38, goldReward: 46 },
  { id: 'u10-samgyetang', nameEn: 'Ginseng chicken soup', nameVi: 'Gà hầm sâm', nameKo: '삼계탕', icon: '🐔',
    description: 'Chicken soup aromatics. Grow 쌀, 마늘, 파, 생강.', descriptionVi: 'Gia vị thơm cho canh gà. Trồng 쌀, 마늘, 파, 생강.',
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
let cookingFilter = 'all';
let cookingSearch = '';

// Recipe names, descriptions and ingredient labels come from the recipe tables and
// ITEM_DB and are written straight into innerHTML. Escaping keeps a bad string a wrong
// label rather than markup.
function ckEsc(v) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function ckArt(ko, fallback, px) {
  return (typeof vocabIconHtml === 'function')
    ? vocabIconHtml(ko, fallback || '🍲', px || 30)
    : (fallback || '🍲');
}

function openCookingUI() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  // A filter left over from a previous visit reads as "my recipes disappeared".
  cookingFilter = 'all';
  cookingSearch = '';
  const search = document.getElementById('ck-search-input');
  if (search) search.value = '';
  if (typeof document !== 'undefined' && document.querySelectorAll) {
    document.querySelectorAll('#ck-filters .ck-filter').forEach(function (btn) {
      const on = btn.getAttribute('data-ck-filter') === 'all';
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }
  renderCookingGrid(selectedRecipeId);
  setModalState('cooking-overlay', true);
}

function closeCookingUI() {
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  setModalState('cooking-overlay', false);
}

function setCookingFilter(filter) {
  const valid = ['all', 'ready', 'missing', 'cooked'];
  cookingFilter = valid.indexOf(filter) >= 0 ? filter : 'all';
  if (typeof document !== 'undefined' && document.querySelectorAll) {
    document.querySelectorAll('#ck-filters .ck-filter').forEach(function (btn) {
      const on = btn.getAttribute('data-ck-filter') === cookingFilter;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
  renderCookingGrid();
}

function setCookingSearch(q) {
  cookingSearch = String(q === undefined || q === null ? '' : q).trim().toLowerCase();
  renderCookingGrid();
}

// One place decides whether the pantry can support a recipe, so the list, the detail
// panel and the Cook button can never disagree about it.
function ckRecipeStatus(recipe, ingMap) {
  const need = [];
  (recipe.ingredients || []).forEach(function (req) {
    const info = getItemInfo(req.itemId);
    const key = info.key || req.itemId;
    const have = ingMap[key] || 0;
    need.push({
      key: key,
      nameKo: info.nameKo || req.itemId,
      icon: info.icon || '📦',
      have: have,
      want: req.count,
      ok: have >= req.count
    });
  });
  const missing = need.filter(function (n) { return !n.ok; });
  return { need: need, missing: missing, canCook: missing.length === 0 };
}

function renderCookingGrid(selectId) {
  const pantryList = document.getElementById('cooking-pantry-list');
  const recipeListEl = document.getElementById('cooking-recipe-list');
  const detailViewEl = document.getElementById('cooking-detail-view');
  const progressBadge = document.getElementById('cooking-progress-badge');
  const emptyMsg = document.getElementById('ck-empty-msg');

  if (!recipeListEl) return;

  const recipes = (typeof getActiveCookingRecipes === 'function') ? getActiveCookingRecipes() : COOKING_RECIPES;
  if (selectId && recipes.some(r => r.id === selectId)) {
    selectedRecipeId = selectId;
  } else if (!recipes.some(r => r.id === selectedRecipeId)) {
    selectedRecipeId = recipes[0]?.id || 'kimchi';
  }

  const ingMap = (inventoryState && inventoryState.ingredients) ? inventoryState.ingredients : {};
  const cookedRecipes = (cookingState && Array.isArray(cookingState.cookedRecipes)) ? cookingState.cookedRecipes : [];

  // Status is computed once per recipe and reused everywhere below.
  const rows = recipes.map(function (r) {
    const st = ckRecipeStatus(r, ingMap);
    return { r: r, st: st, cooked: cookedRecipes.indexOf(r.id) >= 0 };
  });
  const selectedRow = rows.filter(function (x) { return x.r.id === selectedRecipeId; })[0] || rows[0];

  // 1. Pantry Stock Summary — ingredients the selected dish calls for are marked, so the
  //    bar answers "do I have what this needs" instead of just listing stock.
  if (pantryList) {
    pantryList.innerHTML = '';
    const entries = Object.entries(ingMap).filter(([_, count]) => count > 0);
    if (entries.length === 0) {
      pantryList.innerHTML = '<span class="ck-pantry-empty">' + vbEsc(hvT('ui.cook.pantry.empty')) + '</span>';
    } else {
      const needMap = {};
      if (selectedRow) selectedRow.st.need.forEach(function (n) { needMap[n.key] = n; });
      entries.forEach(([ingKey, cnt]) => {
        const info = getItemInfo(ingKey);
        const n = needMap[info.key || ingKey];
        const tag = document.createElement('span');
        tag.className = 'ck-pantry-chip' + (n ? (n.ok ? ' needed' : ' short') : '');
        if (n) tag.title = hvT('ui.cook.need', { dish: n.nameKo, want: n.want, have: n.have });
        tag.innerHTML = `${ckArt(info.nameKo || ingKey, info.icon, 20)} ${ckEsc(info.nameKo || ingKey)}: ×${cnt}`;
        pantryList.appendChild(tag);
      });
    }
  }

  // 2. Progress — count plus a bar.
  const masteredCount = cookedRecipes.filter(id => recipes.some(r => r.id === id)).length;
  if (progressBadge) progressBadge.textContent =
    hvT('ui.cook.cooked', { n: masteredCount, total: recipes.length });
  const pFill = document.getElementById('ck-progress-fill');
  const pTrack = document.getElementById('ck-progress-track');
  if (pFill && pFill.style) {
    pFill.style.width = (recipes.length ? Math.round(masteredCount / recipes.length * 100) : 0) + '%';
  }
  if (pTrack && pTrack.setAttribute) {
    pTrack.setAttribute('aria-valuenow', String(masteredCount));
    pTrack.setAttribute('aria-valuemax', String(recipes.length));
    pTrack.setAttribute('aria-valuetext',
      hvT('ui.recipe.mastered.aria', { n: masteredCount, total: recipes.length }));
  }

  // 3. Filter counts describe the whole cookbook, not the filtered view.
  if (typeof document !== 'undefined' && document.querySelectorAll) {
    const counts = {
      all: rows.length,
      ready: rows.filter(function (x) { return x.st.canCook; }).length,
      missing: rows.filter(function (x) { return !x.st.canCook; }).length,
      cooked: rows.filter(function (x) { return x.cooked; }).length
    };
    document.querySelectorAll('#ck-filters .ck-filter-count').forEach(function (el) {
      const key = el.getAttribute('data-ck-count');
      const n = counts[key] || 0;
      el.textContent = String(n);
      if (el.classList && typeof el.classList.toggle === 'function') el.classList.toggle('zero', n === 0);
    });
  }

  // 4. Filter, search, then order: what the pantry can support first, then whatever is
  //    closest to cookable. Insertion order gave no help at all.
  let view = rows.filter(function (x) {
    if (cookingFilter === 'ready') return x.st.canCook;
    if (cookingFilter === 'missing') return !x.st.canCook;
    if (cookingFilter === 'cooked') return x.cooked;
    return true;
  });
  if (cookingSearch) {
    view = view.filter(function (x) {
      return String(x.r.nameKo).toLowerCase().indexOf(cookingSearch) >= 0
        || String(x.r.nameEn + ' ' + tr(x.r, 'nameEn')).toLowerCase().indexOf(cookingSearch) >= 0;
    });
  }
  view.sort(function (a, b) {
    return (Number(b.st.canCook) - Number(a.st.canCook))
      || (a.st.missing.length - b.st.missing.length)
      || String(a.r.nameKo).localeCompare(String(b.r.nameKo), 'ko');
  });

  if (emptyMsg) {
    let msg = '';
    if (view.length === 0 && cookingSearch) msg = `No recipe matches “${cookingSearch}”.`;
    else if (view.length === 0 && cookingFilter === 'ready') msg = 'Nothing is cookable yet — harvest the missing ingredients first.';
    else if (view.length === 0 && cookingFilter === 'cooked') msg = 'No dish mastered yet. Cook one to fill the cookbook.';
    else if (view.length === 0) msg = 'No recipe in this view.';
    if (msg) emptyMsg.textContent = msg;
    if (emptyMsg.classList && typeof emptyMsg.classList.toggle === 'function') {
      emptyMsg.classList.toggle('hidden', msg === '');
    }
  }

  // 5. Recipe list
  recipeListEl.innerHTML = '';
  view.forEach(function (row) {
    const r = row.r;
    const isSelected = r.id === selectedRecipeId;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'ck-card'
      + (isSelected ? ' selected' : '')
      + (row.st.canCook ? ' ready' : ' short');
    if (card.setAttribute) {
      // A real <button> with aria-pressed, not role="option": a listbox promises
      // arrow-key navigation this list does not implement, and buttons already give
      // Tab plus Enter and Space for free.
      card.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      card.setAttribute('aria-label',
        hvT('ui.cook.card.aria', {
          ko: r.nameKo,
          name: tr(r, 'nameEn'),
          state: row.st.canCook
            ? hvT('ui.cook.ready')
            : hvT('ui.cook.missing', { n: row.st.missing.length })
        }) + (row.cooked ? ' ' + hvT('ui.cook.mastered') : ''));
    }

    const tags = [];
    if (row.cooked) tags.push('<span class="ck-tag cooked">✓ Cooked</span>');
    tags.push(row.st.canCook
      ? '<span class="ck-tag ready">' + ckEsc(hvT('ui.cooking.filter.ready')) + '</span>'
      : `<span class="ck-tag short">−${row.st.missing.length}</span>`);

    card.innerHTML = `
      <span class="ck-card-icon">${ckArt(r.nameKo, r.icon, 30)}</span>
      <span class="ck-card-body">
        <span class="ck-card-ko">${ckEsc(r.nameKo)}</span>
        <span class="ck-card-en">${ckEsc(tr(r, 'nameEn'))}</span>
      </span>
      <span class="ck-card-tags">${tags.join('')}</span>
    `;
    // A <button> so Enter and Space work without a keydown handler of our own.
    card.onclick = function () {
      if (typeof playChiptuneSFX === 'function') playChiptuneSFX('click');
      selectedRecipeId = r.id;
      renderCookingGrid(r.id);
    };
    recipeListEl.appendChild(card);
  });

  // 6. Detail view
  if (detailViewEl) {
    const row = selectedRow;
    if (!row) {
      detailViewEl.innerHTML = '';
    } else {
      const recipe = row.r;
      const st = row.st;

      const ingHtml = st.need.map(function (n) {
        return `<span class="ck-ing ${n.ok ? 'ok' : 'miss'}">`
          + `${ckArt(n.nameKo, n.icon, 18)} ${ckEsc(n.nameKo)} ${n.have}/${n.want} ${n.ok ? '✓' : '✗'}</span>`;
      }).join('');

      // Naming the shortfall beats a greyed-out button that never says why.
      const hint = st.canCook ? '' :
        `<div class="ck-cook-hint">Still need ${st.missing.map(function (n) {
          return ckEsc(n.nameKo) + ' ×' + (n.want - n.have);
        }).join(', ')}</div>`;

      const cookLabel = st.canCook
        ? `🍳 Cook ${ckEsc(recipe.nameKo)}`
        : `🔒 Missing ${st.missing.length} ingredient${st.missing.length === 1 ? '' : 's'}`;

      detailViewEl.innerHTML = `
        <div class="ck-detail-head">
          <span class="ck-detail-icon">${ckArt(recipe.nameKo, recipe.icon, 48)}</span>
          <div>
            <div class="ck-detail-ko">${ckEsc(recipe.nameKo)}</div>
            <div class="ck-detail-en">${ckEsc(tr(recipe, 'nameEn'))}</div>
          </div>
        </div>
        ${recipe.description ? `<div class="ck-detail-desc">${ckEsc(tr(recipe, 'description'))}</div>` : ''}

        <div class="ck-section">
          <div class="ck-section-head">Required Ingredients (재료)</div>
          <div class="ck-chips">${ingHtml}</div>
        </div>

        <div class="ck-section">
          <div class="ck-section-head">${ckEsc(hvT('ui.cook.rewards'))}</div>
          <div class="ck-chips">
            <span class="ck-reward xp">⭐ ${ckEsc(hvT('ui.cook.reward.xp', { n: Number(recipe.xpReward) || 0 }))}</span>
            <span class="ck-reward gold">🪙 ${ckEsc(hvT('ui.cook.reward.gold', { n: Number(recipe.goldReward) || 0 }))}</span>
            ${row.cooked ? '<span class="ck-reward master">✓ ' + ckEsc(hvT('ui.cook.mastered.chip')) + '</span>' : ''}
          </div>
        </div>

        <div class="ck-cook-wrap">
          <button type="button" class="ck-cook-btn cook-btn" id="ck-cook-btn" ${st.canCook ? '' : 'disabled'}>${cookLabel}</button>
          ${hint}
        </div>
      `;
      const cookBtn = document.getElementById('ck-cook-btn');
      if (cookBtn && cookBtn.addEventListener) {
        // Bound to the id captured here rather than interpolated into an onclick
        // attribute, so a recipe id can never break out of the quoting.
        const id = recipe.id;
        cookBtn.addEventListener('click', function () { cookRecipe(id); });
      }
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
        showToast('⚠️ ' + hvT('ui.cook.missingToast', {
          dish: recipe.nameKo || tr(recipe, 'nameEn'),
          need: req.count, item: info.nameKo || key, have
        }));
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
  if (typeof checkQuestProgress === 'function') checkQuestProgress('cook', { count: 1 });
  if (typeof playChiptuneSFX === 'function') playChiptuneSFX('complete');

  if (typeof showToast === 'function') {
    showToast('🍳 ' + hvT('ui.cook.doneToast', {
      dish: recipe.nameKo || tr(recipe, 'nameEn'), gold: goldReward, xp: xpReward
    }));
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
    id: 'kimchi', name: '김치', enName: 'Kimchi', enNameVi: 'Kimchi', icon: '🥬',
    req: { '배추': 1, '고추': 1, '마늘': 1 },
    buff: { type: 'coin_boost', name: '2x Coin Rate (김치 파워)', nameVi: '2x tốc độ ra xu (김치 파워)', durationMs: 300000, value: 2.0 },
    culturalFact: 'Kimchi (김치) is Korea’s national fermented dish. Kimjang (김장), the collective winter Kimchi-making tradition, is inscribed on UNESCO’s Intangible Cultural Heritage list!',
    culturalFactVi: 'Kimchi (김치) là món lên men quốc hồn quốc tuý của Hàn Quốc. Kimjang (김장) — tục cả nhà cùng muối kimchi vào mùa đông — đã được UNESCO ghi danh là Di sản văn hoá phi vật thể!'
  },
  {
    id: 'bibimbap', name: '비빔밥', enName: 'Bibimbap', enNameVi: 'Bibimbap', icon: '🥗',
    req: { '쌀': 1, '당근': 1, '콩': 1 },
    buff: { type: 'crop_speed', name: '+50% Crop Speed (비빔밥 에너지)', nameVi: '+50% tốc độ cây lớn (비빔밥 에너지)', durationMs: 360000, value: 0.50 },
    culturalFact: 'Bibimbap (비빔밥) translates to "mixed rice". Famous in Jeonju, it combines vegetables and gochujang, reflecting the five traditional Korean cardinal colors (오방색).',
    culturalFactVi: 'Bibimbap (비빔밥) nghĩa là "cơm trộn". Nổi tiếng ở Jeonju, món này trộn rau với gochujang và mang đủ năm màu truyền thống của Hàn Quốc (오방색).'
  },
  {
    id: 'bulgogi', name: '불고기', enName: 'Bulgogi', enNameVi: 'Bulgogi', icon: '🍖',
    req: { '파': 1, '마늘': 1, '콩': 1 },
    buff: { type: 'combat_damage', name: '+25% Combat Damage (불고기 힘)', nameVi: '+25% sát thương (불고기 힘)', durationMs: 420000, value: 0.25 },
    culturalFact: 'Bulgogi (불고기 - "fire meat") traces back over 1,000 years to Goguryeo as maekjeok. Thinly sliced beef is marinated in soy sauce, garlic, and sesame oil.',
    culturalFactVi: 'Bulgogi (불고기 — "thịt lửa") có gốc từ hơn 1.000 năm trước ở Goguryeo với tên maekjeok. Thịt bò thái mỏng được ướp xì dầu, tỏi và dầu vừng.'
  },
  {
    id: 'tteokbokki', name: '떡볶이', enName: 'Tteokbokki', enNameVi: 'Tteokbokki', icon: '🍢',
    req: { '쌀': 1, '고추': 1, '파': 1 },
    buff: { type: 'quiz_hints', name: '+1 Extra Quiz Hint (떡볶이 열정)', nameVi: '+1 gợi ý cho câu hỏi (떡볶이 열정)', durationMs: 300000, value: 1 },
    culturalFact: 'Tteokbokki (떡볶이) originated as royal court soy sauce rice cakes. The iconic spicy gochujang street-food version was created in Seoul in 1953!',
    culturalFactVi: 'Tteokbokki (떡볶이) khởi đầu là món bánh gạo xào xì dầu trong cung đình. Phiên bản cay gochujang trứ danh của ẩm thực đường phố ra đời ở Seoul năm 1953!'
  },
  {
    id: 'samgyeopsal', name: '삼겹살', enName: 'Samgyeopsal', enNameVi: 'Samgyeopsal', icon: '🥓',
    req: { '마늘': 2, '파': 1 },
    buff: { type: 'combat_damage', name: '+25% Combat Damage (삼겹살 활력)', nameVi: '+25% sát thương (삼겹살 활력)', durationMs: 480000, value: 0.25 },
    culturalFact: 'Samgyeopsal (삼겹살 - "three-layer pork belly") is Korea’s favorite tabletop grill dish, eaten wrapped in lettuce with grilled garlic and ssamjang paste.',
    culturalFactVi: 'Samgyeopsal (삼겹살 — "ba chỉ ba lớp") là món nướng tại bàn được người Hàn yêu thích nhất, ăn cuốn trong lá xà lách cùng tỏi nướng và tương ssamjang.'
  },
  {
    id: 'haemul_pajeon', name: '해물파전', enName: 'Seafood Pajeon', enNameVi: 'Bánh xèo hải sản', icon: '🥞',
    req: { '파': 2, '오징어': 1, '새우': 1 },
    buff: { type: 'fishing_luck', name: '+50% Fishing Luck (해물파전 행운)', nameVi: '+50% may mắn khi câu (해물파전 행운)', durationMs: 360000, value: 0.50 },
    culturalFact: 'Haemul Pajeon (해물파전) is a crispy green onion pancake filled with fresh squid and shrimp. Koreans famously love eating Pajeon on rainy days!',
    culturalFactVi: 'Haemul Pajeon (해물파전) là bánh hành giòn rụm với mực và tôm tươi. Người Hàn nổi tiếng là mê ăn pajeon vào những ngày mưa!'
  },
  {
    id: 'japchae', name: '잡채', enName: 'Japchae', enNameVi: 'Japchae', icon: '🍜',
    req: { '당근': 1, '파': 1, '무': 1 },
    buff: { type: 'coin_boost', name: '2x Coin Rate (잡채 잔치)', nameVi: '2x tốc độ ra xu (잡채 잔치)', durationMs: 300000, value: 2.0 },
    culturalFact: 'Japchae (잡채) was created in the 17th century for King Gwanghaegun. Glass noodles stir-fried with sweet carrot and veggies are served at every festive celebration.',
    culturalFactVi: 'Japchae (잡채) ra đời ở thế kỷ 17 để dâng vua Gwanghaegun. Miến xào cùng cà rốt ngọt và rau củ luôn có mặt trong mọi dịp lễ tiệc.'
  },
  {
    id: 'samgyetang', name: '삼계탕', enName: 'Samgyetang', enNameVi: 'Samgyetang', icon: '🍲',
    req: { '쌀': 1, '마늘': 2, '무': 1 },
    buff: { type: 'crop_speed', name: '+50% Crop Speed (삼계탕 보양)', nameVi: '+50% tốc độ cây lớn (삼계탕 보양)', durationMs: 480000, value: 0.50 },
    culturalFact: 'Samgyetang (삼계탕 - ginseng chicken soup) is traditional stamina food eaten during Sambok (삼복), the peak heat of summer, to "fight heat with heat" (이열치열).',
    culturalFactVi: 'Samgyetang (삼계탕 — canh gà hầm sâm) là món bồi bổ truyền thống, ăn vào Sambok (삼복) giữa cao điểm nắng nóng để "lấy nhiệt trị nhiệt" (이열치열).'
  },
  {
    id: 'gimbap', name: '김밥', enName: 'Gimbap', enNameVi: 'Gimbap', icon: '🍱',
    req: { '쌀': 1, '당근': 1, '무': 1 },
    buff: { type: 'quiz_hints', name: '+1 Extra Quiz Hint (김밥 소풍)', nameVi: '+1 gợi ý cho câu hỏi (김밥 소풍)', durationMs: 300000, value: 1 },
    culturalFact: 'Gimbap (김밥) is dried seaweed (김) rolled with rice (밥) and pickled radish. It is the quintessential Korean picnic and travel comfort food!',
    culturalFactVi: 'Gimbap (김밥) là rong biển khô (김) cuốn với cơm (밥) và củ cải muối. Đây là món ăn dã ngoại và ăn đường xa kinh điển của người Hàn!'
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
    badge.title = tr(buff, 'name');
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
    pantryList.innerHTML = '<span class="recipe-pantry-empty">' + vbEsc(hvT('ui.recipe.pantry.empty')) + '</span>';
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
      <div class="recipe-card-sub">${tr(r, 'enName')}</div>
      <div class="recipe-req-list">${reqBits.join('')}</div>
      <div class="recipe-buff-badge">${tr(r.buff, 'name')}</div>
      <div class="recipe-card-actions">
        <button class="cook-btn" ${canCook ? '' : 'disabled'} onclick="startCookingMinigame('${r.id}')">${vbEsc(hvT('ui.recipe.cook'))}</button>
        <button type="button" class="recipe-info-btn" onclick="showCulturalFact('${r.id}')">${vbEsc(hvT('ui.recipe.info'))}</button>
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
  dishName.textContent = `${currentCookingRecipe.name} (${tr(currentCookingRecipe, 'enName')})`;

  if (cookingStage === 1) {
    stepDesc.textContent = hvT('ui.cook.stage1');
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
    stepDesc.textContent = hvT('ui.cook.stage2');
    
    let sliderPos = 0;
    let direction = 1;
    container.innerHTML = `
      <div style="font-size:14px; color:#fff; margin-bottom:12px;">Adjust Cooking Temperature (불 조절):</div>
      <div style="width:100%; height:24px; background:#1e293b; border-radius:8px; position:relative; overflow:hidden; border:1px solid var(--neon-gold); margin-bottom:16px;">
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
  const dish = `${recipe.name} (${tr(recipe, 'enName')})`;
  if (titleEl) titleEl.textContent = grade ? hvT('ui.recipe.grade', { grade, dish }) : dish;
  if (textEl) textEl.textContent = tr(recipe, 'culturalFact');

  const overlay = document.getElementById('cultural-fact-overlay');
  if (overlay) overlay.classList.add('visible');
};

window.closeCulturalFact = function() {
  const overlay = document.getElementById('cultural-fact-overlay');
  if (overlay) overlay.classList.remove('visible');
};


// ══════════════ LEADERBOARD ══════════════════════════════════════════════════
// "Your records" below is local and always has been correct. The board itself is not: it is
// read from /api/leaderboard, where each row is written by a player's own cloud save.
//
// The four rivals that used to live here — Min-jun, Seo-yeon, Ji-hoon, Ha-eun — are gone.
// They were constants, so nobody could ever pass them and nobody could ever join them.

function computeCookingTier() {
  const dishes = inventoryState?.cookedDishes || {};
  const totalCooked = Object.values(dishes).reduce((a, b) => a + b, 0);
  if (totalCooked >= 50) return hvT('ui.cook.tier.grand') + ' 👑';
  if (totalCooked >= 30) return hvT('ui.cook.tier.master') + ' 🌟';
  if (totalCooked >= 15) return hvT('ui.cook.tier.sous') + ' 🍲';
  if (totalCooked >= 5) return hvT('ui.cook.tier.apprentice') + ' 👨‍🍳';
  return hvT('ui.cook.tier.novice') + ' 🍳';
}

// computeCookingTierScore lived here to sort the local rivals. The server orders the board now
// and keeps its own copy of the tier table in api/_leaderboard.js, where it also decides which
// labels are allowed to exist at all — so a second ranking rule on this side would only be
// something to drift.

function updateLeaderboardMetrics() {
  if (typeof leaderboardState === 'undefined' || !leaderboardState) leaderboardState = { personalBests: {} };
  if (!leaderboardState.personalBests) leaderboardState.personalBests = {};

  // Total Words Mastered — mature under the scheduler (interval >= 21 days), not a
  // harvest tally, which a player could run up in a single session.
  const masteredCount = typeof srsMatureWordCount === 'function' ? srsMatureWordCount() : 0;

  leaderboardState.personalBests.totalWordsMastered = masteredCount;
  leaderboardState.personalBests.totalHonor = playerCurrencies?.honor || 0;
  leaderboardState.personalBests.highestCookingTier = computeCookingTier();
  ensurePlayerRank();
  leaderboardState.personalBests.valleyLevel = playerRank.level;
  leaderboardState.personalBests.valleyTitle = tr(rankTitleFor(playerRank.level), 'en');
  

  if (typeof leaderboardState.personalBests.arcadeHighScore !== 'number') {
    leaderboardState.personalBests.arcadeHighScore = 0;
  }
  if (typeof leaderboardState.personalBests.dungeonMaxFloor !== 'number') {
    leaderboardState.personalBests.dungeonMaxFloor = 0;
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
      <div class="lb-pb-chip">${vbEsc(hvT('ui.lb.pb.words'))} <b>${pb.totalWordsMastered}</b></div>
      <div class="lb-pb-chip">${vbEsc(hvT('ui.lb.pb.rank'))} <b>${vbEsc(hvT('ui.rank.short', { n: pb.valleyLevel || 1 }))} ${vbEsc(pb.valleyTitle || '')}</b></div>
      <div class="lb-pb-chip">${vbEsc(hvT('ui.lb.pb.honor'))} <b>${pb.totalHonor}</b></div>
      <div class="lb-pb-chip">${vbEsc(hvT('ui.lb.pb.cooking'))} <b>${vbEsc(pb.highestCookingTier)}</b></div>
      <div class="lb-pb-chip">${vbEsc(hvT('ui.lb.pb.arcade'))} <b>${pb.arcadeHighScore}</b></div>
      <div class="lb-pb-chip">${vbEsc(hvT('ui.lb.pb.dungeon'))} <b>${vbEsc(hvT('ui.lb.val.floor', { n: pb.dungeonMaxFloor }))}</b></div>
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


// The board is fetched now, not invented. It used to be four hard-coded rivals — Min-jun,
// Seo-yeon, Ji-hoon, Ha-eun — with the real player appended as a fifth row named
// "Player (Hero Player)". Signing in changed nothing, so every row looked like a mockup
// including your own, and the tab that opens by default ranks on SRS-mature words, which is
// zero for the first three weeks of any account however much has been played. The effect was
// a signed-in player with a high score sitting last behind four people who do not exist.
//
// Rows come from /api/leaderboard, written by the save PUT. See api/_leaderboard.js.
let lbRemote = { tab: null, state: 'idle', rows: [], you: null, total: 0, reason: '' };

function lbFetch(tab) {
  lbRemote = { tab, state: 'loading', rows: [], you: null, total: 0, reason: '' };
  renderLeaderboardTable();
  const headers = {};
  const token = (typeof getGoogleToken === 'function') ? getGoogleToken() : '';
  if (token) headers.Authorization = 'Bearer ' + token;
  return fetch('/api/leaderboard?tab=' + encodeURIComponent(tab) + '&limit=20', { headers })
    .then((r) => r.json().then((j) => ({ status: r.status, j })))
    .then(({ status, j }) => {
      if (lbRemote.tab !== tab) return;                   // a later tab won the race
      if (status === 503) { lbRemote = { tab, state: 'off', rows: [], you: null, total: 0, reason: '' }; }
      else if (status !== 200) { lbRemote = { tab, state: 'error', rows: [], you: null, total: 0, reason: 'HTTP ' + status }; }
      else {
        lbRemote = { tab, state: 'ok', rows: j.rows || [], you: j.you || null, total: j.total || 0, reason: '' };
      }
      renderLeaderboardTable();
    })
    .catch(() => {
      if (lbRemote.tab !== tab) return;
      lbRemote = { tab, state: 'error', rows: [], you: null, total: 0, reason: 'offline' };
      renderLeaderboardTable();
    });
}

const LB_COLS = {
  vocab: { header: () => hvT('ui.lb.col.vocab'), val: (r) => hvT('ui.lb.val.words', { n: r.words }) },
  honor: { header: () => hvT('ui.lb.col.honor') + ' 🏅', val: (r) => r.honor + ' 🏅' },
  cooking: { header: () => hvT('ui.lb.col.cooking'), val: (r) => r.cookingTier },
  arcade: { header: () => hvT('ui.lb.col.arcade'), val: (r) => hvT('ui.lb.val.pts', { n: r.arcade }) },
  dungeon: { header: () => hvT('ui.lb.col.dungeon'), val: (r) => hvT('ui.lb.val.floor', { n: r.dungeon }) },
  rank: { header: () => hvT('ui.lb.col.rank'), val: (r) => hvT('ui.rank.short', { n: r.rankLv }) }
};

function switchLeaderboardTab(tabId) {
  currentLeaderboardTab = tabId;
  document.querySelectorAll('.lb-tab-btn').forEach((btn) => {
    const mine = btn.id === `lbtab-${tabId}` || btn.getAttribute('onclick')?.includes(`'${tabId}'`);
    btn.classList.toggle('active', !!mine);
  });
  if (lbRemote.tab === tabId && lbRemote.state === 'ok') renderLeaderboardTable();
  else lbFetch(tabId);
}

// Every cell that carries a name goes through vbEsc. The rows are display names from other
// people's Google profiles now, not four constants written into this file, and they land in
// innerHTML. api/_leaderboard.js strips markup on the way in as well; this is the half that
// actually has to hold.
function renderLeaderboardTable() {
  const container = document.getElementById('lb-table-container');
  if (!container) return;
  const tab = currentLeaderboardTab || 'vocab';
  const col = LB_COLS[tab] || LB_COLS.vocab;

  const note = (text) => `<div class="lb-empty">${vbEsc(text)}</div>`;
  if (lbRemote.state === 'loading') { container.innerHTML = note(hvT('ui.lb.loading')); return; }
  if (lbRemote.state === 'off') {
    container.innerHTML = note(hvT('ui.lb.off'));
    return;
  }
  if (lbRemote.state === 'error') {
    container.innerHTML = note(lbRemote.reason === 'offline'
      ? hvT('ui.lb.offline')
      : hvT('ui.lb.error', { reason: lbRemote.reason }));
    return;
  }
  if (!lbRemote.rows.length) {
    container.innerHTML = note(hvT('ui.lb.empty'));
    return;
  }

  const mine = lbRemote.you ? lbRemote.you.id : null;
  const row = (r) => {
    const badge = r.rank === 1 ? '🥇 ' + hvT('ui.lb.first')
      : r.rank === 2 ? '🥈 ' + hvT('ui.lb.second')
        : r.rank === 3 ? '🥉 ' + hvT('ui.lb.third')
          : String(r.rank);
    const cls = (mine && r.id === mine) ? ' class="lb-row-player"' : '';
    return `<tr${cls}>
        <td style="font-family:var(--font-pixel); font-size-adjust:var(--font-pixel-adjust); font-size:10px">${vbEsc(badge)}</td>
        <td>${vbEsc(r.name)}</td>
        <td class="lb-title-cell">${vbEsc(hvT('ui.rank.short', { n: r.rankLv }))}</td>
        <td class="lb-val">${vbEsc(col.val(r))}</td>
      </tr>`;
  };

  let body = lbRemote.rows.map(row).join('');
  // Outside the top twenty, the player still gets to see where they stand. Without this the
  // board is a wall of strangers and says nothing about you, which is the complaint that
  // started all this.
  if (lbRemote.you && !lbRemote.rows.some((r) => r.id === mine)) {
    body += `<tr class="lb-row-gap"><td colspan="4">⋯</td></tr>` + row(lbRemote.you);
  }

  container.innerHTML = `
    <table class="lb-table">
      <thead>
        <tr>
          <th style="width:10%">${vbEsc(hvT('ui.lb.col.rankNo'))}</th>
          <th style="width:35%">${vbEsc(hvT('ui.lb.col.player'))}</th>
          <th style="width:25%">${vbEsc(hvT('ui.lb.col.level'))}</th>
          <th style="width:30%">${vbEsc(col.header())}</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
    <div class="lb-foot">${vbEsc(hvT(lbRemote.total === 1 ? 'ui.lb.foot.one' : 'ui.lb.foot',
      { n: lbRemote.total }))}</div>
  `;
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
    { cls: 'gold',  val: s.dueNow,                       lbl: hvT('ui.prog.dueNow') },
    { cls: 'green', val: s.mature,                       lbl: hvT('ui.prog.mature', { d: SRS_CFG.MATURE_IVL }) },
    { cls: '',      val: s.graduated,                    lbl: hvT('ui.prog.learned') },
    { cls: '',      val: s.learning,                     lbl: hvT('ui.prog.learning') },
    { cls: '',      val: Math.max(0, totalWords - s.seen), lbl: hvT('ui.prog.untouched') },
    { cls: s.retention !== null && s.retention < 80 ? 'rose' : 'green',
      val: s.retention === null ? '—' : s.retention + '%', lbl: hvT('ui.prog.retention') },
  ];
  // Lifetime retention moves slowly once there is history behind it, so a rolling figure
  // over the last 50 answers is what actually reflects how the current session is going.
  const recent = recentAccuracy(50);
  if (recent !== null) {
    cards.push({ cls: recent < 70 ? 'rose' : '', val: recent + '%', lbl: hvT('ui.prog.last50', { n: 50 }) });
  }
  grid.innerHTML = cards.map(c =>
    `<div class="prog-stat ${c.cls}"><div class="prog-stat-val">${c.val}</div><div class="prog-stat-lbl">${c.lbl}</div></div>`
  ).join('');

  // 7-day forecast. Bars are scaled to the busiest day so a light week still reads clearly.
  const fc = srsForecast(7);
  const peak = Math.max(1, ...fc);
  const now = new Date();
  const labels = fc.map((_, i) => i === 0
    ? hvT('ui.prog.today')
    : new Date(now.getTime() + i * DAY_MS).toLocaleDateString(hvLang(), { weekday: 'short' }));
  $('prog-forecast').innerHTML = fc.map((n, i) =>
    `<div class="prog-bar-col">
       <span class="prog-bar-n">${n || ''}</span>
       <div class="prog-bar ${i === 0 ? 'today' : ''}" style="height:${Math.round((n / peak) * 70)}%"></div>
       <span class="prog-bar-d">${labels[i]}</span>
     </div>`
  ).join('');

  // The practice log: what has actually been sat down and done, as opposed to how the words
  // are scheduled. Three rows rather than one total, because they are three different
  // activities and a learner wondering whether they have been neglecting listening cannot
  // read that off a sum.
  const pbox = $('prog-practice');
  if (pbox) {
    const sum = typeof practiceSummary === 'function' ? practiceSummary() : null;
    const ROWS = [
      { k: 'wb', icon: '✍️', lbl: 'Exercises', unit: 'page' },
      { k: 'trk', icon: '🎧', lbl: 'Listening', unit: 'track' },
      { k: 'dic', icon: '✏️', lbl: 'Dictation', unit: 'line' }
    ];
    const plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's');
    const total = sum ? ROWS.reduce((n, r) => n + sum[r.k].n, 0) : 0;
    pbox.innerHTML = !total
      ? '<div class="prac-empty">' + vbEsc(hvT('ui.prog.prac.empty')) + '</div>'
      : ROWS.map(r => {
        const v = sum[r.k];
        // "12 across 5 pages" rather than one number: doing one exercise twelve times and
        // twelve exercises once are not the same week of study.
        return `<div class="prac-row">
            <span class="prac-icon">${r.icon}</span>
            <span class="prac-lbl">${r.lbl}</span>
            <span class="prac-n">${v.n}</span>
            <span class="prac-sub">${v.items ? 'across ' + plural(v.items, r.unit) : '—'}</span>
            <span class="prac-pct${v.pct !== null && v.pct < 70 ? ' low' : ''}">${v.pct === null ? '' : v.pct + '%'}</span>
          </div>`;
      }).join('');
  }

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
    hvT('ui.prog.footnote', { d: SRS_CFG.MATURE_IVL })
    + (s.avgEase !== null ? ' ' + hvT('ui.prog.avgEase', { n: s.avgEase }) : '');
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
  // Reached from the toolbar's inline handlers in index.html.
  window.setCookingFilter = setCookingFilter;
  window.setCookingSearch = setCookingSearch;
  window.cookRecipe = cookRecipe;
  window.checkCookingAchievements = checkCookingAchievements;
}

