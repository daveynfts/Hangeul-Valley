const $ = (id) => document.getElementById(id);

const SCORE = { grammar: 0, vocab: 0, register: 0 };
let hearts = 3;
let sceneIndex = 0;
let glossOn = true;
let content = null;
let selectedShop = null;
let selectedDish = null;
let pizzaSize = null;
let pizzaKind = null;
let pizzaDrink = null;
let reviewStars = { mat: 0, bunwigi: 0, service: 0, gap: 0, gyotong: 0 };
let intonationI = 0;

const SCENES = ['brief', 'campus', 'table', 'phone', 'review'];

function speak(text) {
  if (!text || !('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

function bump(kind, n) {
  SCORE[kind] = (SCORE[kind] || 0) + n;
  renderHud();
}

function loseHeart(msg) {
  hearts = Math.max(0, hearts - 1);
  renderHud();
  return msg;
}

function renderHud() {
  $('hearts').textContent = '♥'.repeat(hearts) + '♡'.repeat(Math.max(0, 3 - hearts));
  $('sc-g').textContent = SCORE.grammar;
  $('sc-v').textContent = SCORE.vocab;
  $('sc-r').textContent = SCORE.register;
  document.querySelectorAll('.progress span').forEach((el, i) => {
    el.classList.toggle('on', i <= sceneIndex);
  });
}

function gloss(en) {
  return glossOn && en ? `<div class="line-en">${en}</div>` : '';
}

function formTag(form) {
  const map = {
    jungeseo: 'N 중에(서)',
    ullaeyo: 'V-(으)ㄹ래(요)',
    nde: 'A/V-는데 · N인데',
    banmal: '반말',
    jondaetmal: '존댓말'
  };
  return form ? `<div class="form-tag">${map[form] || form}</div>` : '';
}

function setStage(html) {
  $('stage').innerHTML = html;
  $('stage').querySelectorAll('[data-speak]').forEach((el) => {
    el.addEventListener('click', () => speak(el.getAttribute('data-speak')));
  });
}

function feedback(el, ok, text) {
  el.className = 'fb ' + (ok ? 'good' : 'bad');
  el.textContent = text;
}

async function boot() {
  content = await fetch('/diner/content.json').then((r) => r.json());
  $('btn-gloss').onclick = () => {
    glossOn = !glossOn;
    $('btn-gloss').textContent = glossOn ? 'Gloss ON' : 'Gloss OFF';
    showScene();
  };
  $('btn-back').onclick = () => { location.href = '/index.html'; };
  renderHud();
  showTitle();
}

function showTitle() {
  sceneIndex = 0;
  setStage(`
    <div class="kicker">SNU KOREAN 2B · UNIT 10</div>
    <h1>뭐 먹을래?</h1>
    <p class="lead">A Saturday with Steven and Jungwoo: pick a restaurant in 반말, order at the table, phone Pizza Nara, then review 큰사랑 한정식. Korean is the play language.</p>
    <div class="two">
      <div class="shop-card"><div class="ico">🗣️</div><div class="name">Grammar in play</div><div class="meta">N 중에(서) · V-(으)ㄹ래 · A/V-는데 · 반말 vs 존댓말</div></div>
      <div class="shop-card"><div class="ico">🍲</div><div class="name">12 dishes</div><div class="meta">찌개 · 면 · 고기 — tagged 달다 짜다 쓰다 시다 맵다</div></div>
    </div>
    <button class="cta" id="go">Start the evening →</button>
  `);
  $('go').onclick = () => { sceneIndex = 0; showScene(); };
}

function showScene() {
  renderHud();
  const id = SCENES[sceneIndex];
  if (id === 'brief') return sceneBrief();
  if (id === 'campus') return sceneCampus();
  if (id === 'table') return sceneTable();
  if (id === 'phone') return scenePhone();
  if (id === 'review') return sceneReview();
}

function nextScene() {
  sceneIndex += 1;
  if (sceneIndex >= SCENES.length) return showEnd();
  showScene();
}

/* ── 0 briefing ─────────────────────────────────────────────── */
function sceneBrief() {
  setStage(`
    <div class="kicker">SCENE 0 · CULTURE</div>
    <h1>반말, 언제 써?</h1>
    <p class="lead">Tonight you talk to Jungwoo (same age, close) in <b>반말</b>. You talk to shop staff on the phone in <b>존댓말</b>. Mixing them is the social fail of this stage.</p>
    <div class="two">
      <div class="shop-card">
        <div class="form-tag">반말</div>
        <div class="name">친구 · 같은 나이</div>
        <div class="meta">수업 끝나고 뭐 해?<br>뭐 먹을래?<br>감자탕 먹자.</div>
      </div>
      <div class="shop-card">
        <div class="form-tag">존댓말</div>
        <div class="name">가게 · 손님</div>
        <div class="meta">치즈 피자 하나 주세요.<br>삼십 분 걸린다고요?</div>
      </div>
    </div>
    <p class="lead" style="margin-top:12px">Question pitch: no question-word → rise ⤴ &nbsp;·&nbsp; 뭐/어디/어때 → fall ⤵</p>
    <button class="cta" id="go">Jungwoo is waiting →</button>
  `);
  $('go').onclick = nextScene;
}

/* ── 1 campus ───────────────────────────────────────────────── */
let campusStep = 0;
function sceneCampus() {
  campusStep = 0;
  campusBeat();
}
function campusBeat() {
  if (campusStep === 0) {
    setStage(`
      ${formTag('banmal')}
      <div class="kicker">SCENE 1 · CAMPUS NIGHT</div>
      <h1>수업 끝나고 뭐 해?</h1>
      <div class="bubble">
        <div class="who">정우</div>
        <div>
          <div class="line-ko" data-speak="수업 끝나고 뭐 해?">수업 끝나고 뭐 해?</div>
          ${gloss('Class is over — what are you doing?')}
        </div>
      </div>
      <p class="lead">A classmate's birthday dinner. Answer Jungwoo in 반말, with <b>-ㄹ래</b>.</p>
      <div class="choices" id="chs"></div>
      <div class="fb" id="fb"></div>
    `);
    paintChoices('chs', [
      { ko: '친구 생일인데 저녁 먹으러 갈래?', en: 'It\'s a friend\'s birthday — wanna go for dinner?', ok: true, form: 'ullaeyo', register: 'banmal', why: '반말 + -ㄹ래. 인데 sets up the reason.' },
      { ko: '친구 생일인데요. 저녁을 먹으러 갈까요?', en: 'Polite / staff speech', ok: false, register: 'jondaetmal', why: 'Jungwoo is your friend. -요 / -까요 is 존댓말 here.' },
      { ko: '나 숙제해야 돼. 나중에 보자.', en: 'Off the birthday plan', ok: false, why: 'Grammatically 반말, but it skips the unit task.' }
    ], () => { campusStep = 1; campusBeat(); });
  } else if (campusStep === 1) {
    setStage(`
      ${formTag('jungeseo')}
      <div class="kicker">SCENE 1 · N 중에(서)</div>
      <h1>근처 식당 중에서 어디가 좋아?</h1>
      <div class="bubble">
        <div class="who">정우</div>
        <div>
          <div class="line-ko">한국 음식 중에서 고를래? 그룹에 <span class="mark">매운 거 못 먹는</span> 사람이 있어.</div>
          ${gloss('Pick among Korean places. Someone in the group cannot eat spicy food.')}
        </div>
      </div>
      <div class="grid" id="shops"></div>
      <div class="fb" id="fb"></div>
      <button class="cta hidden" id="go">Reserve Seoul Sikdang →</button>
    `);
    const box = $('shops');
    content.shops.forEach((s) => {
      const b = document.createElement('button');
      b.className = 'shop-card';
      b.innerHTML = `<div class="ico">${s.icon}</div><div class="name">${s.ko}</div><div class="meta">${s.blurbKo}${glossOn ? '<br>' + s.blurbEn : ''}</div>`;
      b.onclick = () => pickShop(s, b);
      box.appendChild(b);
    });
  } else {
    setStage(`
      ${formTag('nde')}
      <div class="kicker">SCENE 1 · -는데</div>
      <h1>주말에 사람이 많은데…</h1>
      <div class="bubble">
        <div class="who">정우</div>
        <div>
          <div class="line-ko" data-speak="주말에 사람이 많은데 예약할래?">주말에 사람이 많은데 예약할래?</div>
          ${gloss('It gets crowded on weekends — want to book?')}
        </div>
      </div>
      <div class="choices" id="chs"></div>
      <div class="fb" id="fb"></div>
    `);
    paintChoices('chs', [
      { ko: '응, 예약하자. 갈비 먹을래.', en: 'Yeah, let\'s book. I want galbi.', ok: true, register: 'banmal', form: 'ullaeyo', why: '반말 + -ㄹ래. Matches Seoul Sikdang\'s 갈비.' },
      { ko: '네, 예약해 주세요.', en: 'Staff speech to a friend', ok: false, register: 'jondaetmal', why: 'That -요 is for the restaurant later, not Jungwoo.' },
      { ko: '매운탕 집에서 보자.', en: 'Spicy stew house', ok: false, why: 'Someone cannot eat spicy food.' }
    ], nextScene);
  }
}

function pickShop(s, btn) {
  const fb = $('fb');
  document.querySelectorAll('.shop-card').forEach((el) => el.classList.remove('picked'));
  if (btn) btn.classList.add('picked');
  if (s.id === 'seoul') {
    selectedShop = s;
    bump('vocab', 2);
    bump('grammar', 2);
    feedback(fb, true, '맞아요. 서울식당 — 갈비, 값도 괜찮은데 맵지 않아요.');
    $('go').classList.remove('hidden');
    $('go').onclick = () => { campusStep = 2; campusBeat(); };
  } else if (s.id === 'maeun') {
    feedback(fb, false, loseHeart('매운탕 집은 너무 매워. 매운 거 못 먹는 사람이 있어요. 다시 골라 봐.'));
  } else if (s.id === 'hotel') {
    feedback(fb, false, '맛있는데 값이 너무 비싸. 돈이 아까워. Pick again.');
  } else {
    feedback(fb, false, '한식 중에서 고르자. 스시는 오늘 아니야.');
  }
}

function paintChoices(id, list, onOk) {
  const box = $(id);
  box.innerHTML = '';
  list.forEach((c) => {
    const b = document.createElement('button');
    b.className = 'choice';
    b.innerHTML = `<span class="ko">${c.ko}</span><span class="en">${glossOn ? c.en : ''}</span>`;
    b.onclick = () => {
      if (c.ok) {
        b.classList.add('ok');
        if (c.register === 'banmal') bump('register', 1);
        if (c.form) bump('grammar', 1);
        bump('vocab', 1);
        feedback($('fb'), true, c.why);
        box.querySelectorAll('button').forEach((x) => { x.disabled = true; });
        setTimeout(onOk, 700);
      } else {
        b.classList.add('bad');
        if (c.register === 'jondaetmal') loseHeart('');
        feedback($('fb'), false, c.why);
      }
    };
    box.appendChild(b);
  });
}

/* ── 2 table ────────────────────────────────────────────────── */
let tableStep = 0;
function sceneTable() {
  tableStep = 0;
  tableBeat();
}
function tableBeat() {
  if (tableStep === 0) {
    setStage(`
      ${formTag('nde')}
      <div class="kicker">SCENE 2 · ${selectedShop ? selectedShop.ko : '서울식당'}</div>
      <h1>뭐 먹을래?</h1>
      <div class="bubble">
        <div class="who">정우</div>
        <div>
          <div class="line-ko" data-speak="뭐 먹을래?">뭐 먹을래?</div>
          ${gloss('What do you want to eat?')}
        </div>
      </div>
      <p class="lead">Build the textbook contrast: like chicken <b>인데</b> not samgyetang.</p>
      <div class="write-row">
        <span>닭고기는</span>
        <select id="a1"><option value="좋아하는데">좋아하는데</option><option value="좋아해요">좋아해요</option><option value="싫어.">싫어.</option></select>
        <span>삼계탕은</span>
        <select id="a2"><option value="별로야">별로야</option><option value="먹고 싶어">먹고 싶어</option><option value="주세요">주세요</option></select>
      </div>
      <div class="built" id="built">닭고기는 좋아하는데 삼계탕은 별로야.</div>
      <div class="fb" id="fb"></div>
      <button class="cta" id="go">Say it →</button>
    `);
    const sync = () => { $('built').textContent = `닭고기는 ${$('a1').value} 삼계탕은 ${$('a2').value}.`; };
    $('a1').onchange = sync; $('a2').onchange = sync;
    $('go').onclick = () => {
      const ok = $('a1').value === '좋아하는데' && $('a2').value === '별로야';
      if (ok) {
        bump('grammar', 2);
        feedback($('fb'), true, '는데 contrast locked. Jungwoo will suggest 감자탕.');
        setTimeout(() => { tableStep = 1; tableBeat(); }, 700);
      } else {
        feedback($('fb'), false, loseHeart('Need 반말 contrast: 좋아하는데 … 별로야. 주세요 is for staff.'));
      }
    };
  } else if (tableStep === 1) {
    setStage(`
      ${formTag('ullaeyo')}
      <div class="kicker">SCENE 2 · ORDER</div>
      <h1>그럼 감자탕 먹을래?</h1>
      <div class="bubble">
        <div class="who">정우</div>
        <div>
          <div class="line-ko">닭고기 먹고 싶은데 삼계탕은 별로지? 그럼 <span class="mark">감자탕</span> 먹을래?</div>
          ${gloss('You want chicken but not ginseng chicken — then how about gamjatang?')}
        </div>
      </div>
      <div class="grid" id="menu"></div>
      <div class="fb" id="fb"></div>
    `);
    content.dishes.forEach((d) => {
      const b = document.createElement('button');
      b.className = 'dish';
      const tags = d.tags.map((t) => content.tastes.find((x) => x.id === t)?.ko).filter(Boolean);
      b.innerHTML = `<div class="ico">${d.icon}</div><div class="name">${d.ko}</div><div class="meta">${d.en}</div><div class="tags">${tags.map((t) => `<i>${t}</i>`).join('')}</div>`;
      b.onclick = () => pickDish(d, b);
      $('menu').appendChild(b);
    });
  } else {
    setStage(`
      ${formTag('nde')}
      <div class="kicker">SCENE 2 · TASTE</div>
      <h1>맛이 어때?</h1>
      <div class="bubble">
        <div class="who">YOU</div>
        <div>
          <div class="line-ko">(한 숟가락)</div>
          ${gloss('One spoon — report the taste with -는데.')}
        </div>
      </div>
      <div class="choices" id="chs"></div>
      <div class="fb" id="fb"></div>
    `);
    paintChoices('chs', [
      { ko: '좀 매운데 맛있어.', en: 'A bit spicy, but it\'s good.', ok: true, form: 'nde', register: 'banmal', why: '맵다 + 맛 + -는데. Same line as the textbook.' },
      { ko: '너무 달아요. 케이크 같아요.', en: 'Too sweet', ok: false, why: '감자탕 is not 달다.' },
      { ko: '써서 못 먹겠어요.', en: 'Bitter, I can\'t eat it — and 존댓말', ok: false, register: 'jondaetmal', why: 'Wrong taste (쓰다) and -요 to Jungwoo.' }
    ], nextScene);
  }
}

function pickDish(d, btn) {
  const fb = $('fb');
  document.querySelectorAll('.dish').forEach((el) => el.classList.remove('picked'));
  btn.classList.add('picked');
  if (d.id === 'gamjatang') {
    selectedDish = d;
    bump('vocab', 2);
    feedback(fb, true, '감자탕 — 조금 맵지만 삼계탕보다 이 상황에 맞아요.');
    setTimeout(() => { tableStep = 2; tableBeat(); }, 700);
  } else if (d.id === 'maeuntang' || d.tags.includes('maepda') && d.id !== 'gamjatang' && d.id !== 'kimchi-jjigae') {
    feedback(fb, false, loseHeart(`${d.ko}는 너무 매워. 매운 거 못 먹는 사람 기억해.`));
  } else if (d.id === 'samgyetang' || d.ko === '삼계탕') {
    feedback(fb, false, '삼계탕은 별로라며! 방금 -는데로 말했는데.');
  } else {
    feedback(fb, false, `${d.ko}도 괜찮지만 정우는 감자탕을 권했어. 교재 줄을 따라가자.`);
  }
}

/* ── 3 phone ────────────────────────────────────────────────── */
let phoneStep = 0;
function scenePhone() {
  phoneStep = 0;
  pizzaKind = null; pizzaSize = null; pizzaDrink = null;
  phoneBeat();
}
function phoneBeat() {
  if (phoneStep === 0) {
    setStage(`
      ${formTag('nde')}
      <div class="kicker">SCENE 3 · 2시, 바쁠 때</div>
      <h1>피자 시킬래?</h1>
      <div class="bubble">
        <div class="who">스티븐</div>
        <div>
          <div class="line-ko">점심 아직 안 먹었는데 2시에 피자 시킬래? 나는 소고기 좋아하는데 <span class="mark">불고기 피자는 싫어.</span></div>
          ${gloss('Still no lunch — pizza at 2? I like beef, but I don\'t like bulgogi pizza.')}
        </div>
      </div>
      <div class="choices" id="chs"></div>
      <div class="fb" id="fb"></div>
    `);
    paintChoices('chs', [
      { ko: '그럼 치즈 피자 시키자.', en: 'Then let\'s get cheese pizza.', ok: true, register: 'banmal', form: 'nde', why: '소고기는 좋아하는데 불고기 피자는 싫어 → 치즈 피자.' },
      { ko: '불고기 피자 두 판 주세요.', en: 'Two bulgogi pizzas please', ok: false, register: 'jondaetmal', why: 'He just said he dislikes 불고기 피자 — and -주세요 is staff talk.' },
      { ko: '감자탕 또 먹을래.', en: 'Gamjatang again', ok: false, why: 'This beat is the listening: pizza at 2 o\'clock.' }
    ], () => { phoneStep = 1; phoneBeat(); });
  } else if (phoneStep === 1) {
    setStage(`
      ${formTag('jondaetmal')}
      <div class="kicker">SCENE 3 · YOU ARE THE CUSTOMER</div>
      <h1>여보세요, 피자나라입니다</h1>
      <div class="phone">
        <div class="notch"></div>
        <h2>PIZZA NARA</h2>
        <div class="sms them">여보세요, 피자나라입니다. 무엇을 도와드릴까요?</div>
        <div class="sms me" id="sms-me">…</div>
      </div>
      <p class="lead">존댓말. Textbook order: large cheese pizza + one cola = 18,000원, 30 minutes.</p>
      <div class="grid">
        <button class="dish" data-k="cheese"><div class="name">치즈 피자</div><div class="meta">cheese</div></button>
        <button class="dish" data-k="bulgogi"><div class="name">불고기 피자</div><div class="meta">he said no</div></button>
        <button class="dish" data-s="L"><div class="name">큰 거</div><div class="meta">large</div></button>
        <button class="dish" data-s="S"><div class="name">작은 거</div><div class="meta">small</div></button>
        <button class="dish" data-d="cola"><div class="name">콜라 하나</div><div class="meta">cola</div></button>
        <button class="dish" data-d="none"><div class="name">음료 없이</div><div class="meta">no drink</div></button>
      </div>
      <div class="built" id="built">치즈 피자 큰 거 하나하고 콜라 하나 주세요.</div>
      <div class="fb" id="fb"></div>
      <button class="cta" id="go">Say 주세요 →</button>
    `);
    const built = () => {
      const k = pizzaKind === 'cheese' ? '치즈 피자' : pizzaKind === 'bulgogi' ? '불고기 피자' : '피자';
      const s = pizzaSize === 'L' ? '큰 거' : pizzaSize === 'S' ? '작은 거' : '사이즈';
      const d = pizzaDrink === 'cola' ? '하고 콜라 하나' : pizzaDrink === 'none' ? '' : '';
      $('built').textContent = `${k} ${s} 하나${d} 주세요.`;
      $('sms-me').textContent = $('built').textContent;
    };
    document.querySelectorAll('.dish').forEach((b) => {
      b.onclick = () => {
        if (b.dataset.k) pizzaKind = b.dataset.k;
        if (b.dataset.s) pizzaSize = b.dataset.s;
        if (b.dataset.d) pizzaDrink = b.dataset.d;
        document.querySelectorAll('.dish').forEach((x) => {
          const same = (b.dataset.k && x.dataset.k) || (b.dataset.s && x.dataset.s) || (b.dataset.d && x.dataset.d);
          if (same) x.classList.toggle('picked', x === b);
        });
        built();
      };
    });
    $('go').onclick = () => {
      const ok = pizzaKind === 'cheese' && pizzaSize === 'L' && pizzaDrink === 'cola';
      if (ok) {
        bump('vocab', 2); bump('register', 1);
        feedback($('fb'), true, '18,000원, 삼십 분 걸린다고 합니다.');
        setTimeout(() => { phoneStep = 2; phoneBeat(); }, 800);
      } else {
        feedback($('fb'), false, loseHeart('다시요 — 치즈 피자 큰 거 하나, 콜라 하나 주세요.'));
      }
    };
  } else {
    setStage(`
      ${formTag('jondaetmal')}
      <div class="kicker">SCENE 3 · YOU ARE THE SHOP</div>
      <h1>주문 확인</h1>
      <div class="phone">
        <div class="notch"></div>
        <h2>PIZZA NARA · STAFF</h2>
        <div class="sms them">치즈 피자 큰 거 하나하고 콜라 하나요. 맞죠?</div>
      </div>
      <p class="lead">Read back price and time from the listening passage.</p>
      <div class="choices" id="chs"></div>
      <div class="fb" id="fb"></div>
    `);
    paintChoices('chs', [
      { ko: '네, 만 팔천 원이고 삼십 분 걸립니다.', en: '18,000 won, 30 minutes.', ok: true, register: 'jondaetmal', why: 'Matches the listening: 18,000원 · 30분.' },
      { ko: '만 원이고 한 시간 걸려.', en: 'Banmal + wrong numbers', ok: false, register: 'banmal', why: 'Staff uses 존댓말, and those figures are not in the passage.' },
      { ko: '이만 원이고 십 분 걸립니다.', en: 'Wrong total / time', ok: false, why: 'Close, but the tape is 18,000 and 30 minutes.' }
    ], nextScene);
  }
}

/* ── 4 review ───────────────────────────────────────────────── */
function sceneReview() {
  intonationI = 0;
  reviewStars = { mat: 0, bunwigi: 0, service: 0, gap: 0, gyotong: 0 };
  const r = content.review;
  setStage(`
    ${formTag('jondaetmal')}
    <div class="kicker">SCENE 4 · ${r.placeKo}</div>
    <h1>${r.nameKo}</h1>
    <p class="lead">${r.bodyKo}${glossOn ? ' — ' + r.bodyEn : ''}</p>
    <p class="lead">Match the textbook stars. 값이 조금 비싸고 역에서 멀어요.</p>
    <div id="star-box"></div>
    <div class="fb" id="fb"></div>
    <button class="cta" id="go">Check stars →</button>
  `);
  const box = $('star-box');
  content.criteria.forEach((c) => {
    const row = document.createElement('div');
    row.className = 'star-row';
    row.innerHTML = `<div class="star-lab">${c.ko} <span class="star-why">${c.en}</span></div><div class="stars" data-id="${c.id}"></div>`;
    const stars = row.querySelector('.stars');
    for (let i = 1; i <= 5; i++) {
      const s = document.createElement('button');
      s.className = 'star';
      s.type = 'button';
      s.textContent = '★';
      s.onclick = () => {
        reviewStars[c.id] = i;
        stars.querySelectorAll('.star').forEach((x, idx) => x.classList.toggle('on', idx < i));
      };
      stars.appendChild(s);
    }
    box.appendChild(row);
  });
  $('go').onclick = checkStars;
}

function checkStars() {
  const want = content.review.stars;
  const miss = Object.keys(want).filter((k) => reviewStars[k] !== want[k]);
  if (!miss.length) {
    bump('vocab', 3);
    feedback($('fb'), true, '맛 5 · 분위기 5 · 서비스 5 · 값 3 · 교통 2. 돈이 조금 아깝지만 떡갈비는 최고.');
    setTimeout(sceneWrite, 800);
  } else {
    const why = miss.map((k) => content.review.starWhy[k]).join(' / ');
    feedback($('fb'), false, loseHeart('다시 읽어 봐: ' + why));
  }
}

function sceneWrite() {
  setStage(`
    ${formTag('nde')}
    <div class="kicker">SCENE 4 · WRITE</div>
    <h1>우리 반에 소개해 줘</h1>
    <p class="lead">One sentence with <b>-는데</b> and a restaurant criterion.</p>
    <div class="write-row">
      <select id="w1">
        <option value="맛있는데">맛있는데</option>
        <option value="가까운데">가까운데</option>
        <option value="친절한데">친절한데</option>
      </select>
      <select id="w2">
        <option value="값이 조금 비싸요">값이 조금 비싸요</option>
        <option value="너무 맵아요">너무 맵아요</option>
        <option value="돈이 아까워요">돈이 아까워요</option>
      </select>
    </div>
    <div class="built" id="built">맛있는데 값이 조금 비싸요.</div>
    <div class="fb" id="fb"></div>
    <button class="cta" id="go">Save the review →</button>
  `);
  const sync = () => { $('built').textContent = `${$('w1').value} ${$('w2').value}.`; };
  $('w1').onchange = sync; $('w2').onchange = sync;
  $('go').onclick = () => {
    bump('grammar', 2);
    sceneTone();
  };
}

function sceneTone() {
  const q = content.intonation[intonationI];
  if (!q) return showEnd();
  setStage(`
    <div class="kicker">PRONUNCIATION · 의문문 억양</div>
    <h1>${q.ko}</h1>
    <p class="lead">${q.tip}</p>
    <div class="tone-row">
      <button class="tone-btn" data-k="yesno">⤴</button>
      <button class="tone-btn" data-k="wh">⤵</button>
    </div>
    <div class="fb" id="fb"></div>
  `);
  document.querySelectorAll('.tone-btn').forEach((b) => {
    b.onclick = () => {
      const ok = b.dataset.k === q.kind;
      if (ok) {
        bump('grammar', 1);
        feedback($('fb'), true, '좋아요.');
        intonationI += 1;
        setTimeout(sceneTone, 500);
      } else {
        feedback($('fb'), false, loseHeart(q.tip));
      }
    };
  });
}

function showEnd() {
  sceneIndex = SCENES.length - 1;
  renderHud();
  const total = SCORE.grammar + SCORE.vocab + SCORE.register;
  setStage(`
    <div class="kicker">CLEAR</div>
    <h1>잘 먹었습니다</h1>
    <p class="lead">Steven booked Seoul Sikdang, ordered 감자탕, phoned Pizza Nara, and rated 큰사랑 한정식. Replay a beat if a form still feels shaky.</p>
    <div class="end-stats">
      <div>문법<b>${SCORE.grammar}</b></div>
      <div>어휘<b>${SCORE.vocab}</b></div>
      <div>반말/존댓말<b>${SCORE.register}</b></div>
    </div>
    <p class="lead">Total ${total} · hearts left ${hearts}/3</p>
    <button class="cta" id="again">Play again</button>
    <button class="cta alt" id="valley">← Hangeul Valley</button>
  `);
  $('again').onclick = () => {
    Object.keys(SCORE).forEach((k) => { SCORE[k] = 0; });
    hearts = 3;
    sceneIndex = 0;
    showTitle();
  };
  $('valley').onclick = () => { location.href = '/index.html'; };
}

boot().catch((err) => {
  $('stage').innerHTML = `<p class="lead">Failed to load content.json: ${err.message}</p>`;
});
