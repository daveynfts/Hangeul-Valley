const $ = (id) => document.getElementById(id);

const SCORE = { grammar: 0, vocab: 0, register: 0 };
let hearts = 3;
let sceneIndex = 0;
let glossOn = true;
let content = null;
let selectedShop = null;
let selectedDish = null;
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
// The 주문 half of Unit 10 — eighteen words the unit teaches and this scene used to touch
// five of: 피자나라, 치즈피자, 불고기피자, 콜라, 판. The menu now comes from
// content.json's `order` block instead of being written into the markup, so the other
// thirteen have somewhere to be: the three pizzas nobody was offering, 사이다, both
// chickens, the rice and noodle dishes, both counters and both delivery verbs.
//
// 큰 거 / 작은 거 went, and 판 / 인분 took its place. Size is not Unit 10 vocabulary;
// counters are, and choosing between them is the one decision here with a rule behind it.
let phoneStep = 0;
let orderPizza = null, orderCounter = null, orderDrink = null;
let orderSide = null, orderSideCounter = null;

function scenePhone() {
  phoneStep = 0;
  orderPizza = null; orderCounter = null; orderDrink = null;
  orderSide = null; orderSideCounter = null;
  phoneBeat();
}

const ORDER = () => (content && content.order) || {};
const byId = (list, id) => (list || []).find((x) => x.id === id) || null;

/* ── Order grading (pure) ───────────────────────────────────── */
// Extracted from the beats so the rules can be tested without a DOM. The diner is one script
// against real elements — `.dish[data-group=…]` needs a live selector engine — and the CI test
// job has no npm install, so jsdom is not available to it. What is worth testing here is the
// judgement, not the markup, and this is all of the judgement.
//
// The verdicts are deliberately three rather than a boolean. An incomplete pick is not a
// mistake and must not cost a heart. A wrong counter is a real error. The right counter on a
// dish the tape did not order is correct Korean aimed at the wrong item — the learner is told
// that, not told they were wrong.
const ORDER_WANT = { pizza: 'cheese', drink: 'cola', pizzaCounter: 'pan', sideCounter: 'inbun' };

function gradePizzaOrder(sel) {
  if (!sel || !sel.pizza || !sel.counter || !sel.drink) return 'incomplete';
  if (sel.counter !== ORDER_WANT.pizzaCounter) return 'counter';
  if (sel.pizza !== ORDER_WANT.pizza || sel.drink !== ORDER_WANT.drink) return 'other-order';
  return 'ok';
}

// Any dish on the row is a fine thing to order, so only the counter is graded. Grading the
// dish too would mark 양념치킨 wrong for being 양념치킨.
function gradeSideOrder(sel) {
  if (!sel || !sel.side || !sel.counter) return 'incomplete';
  if (sel.counter !== ORDER_WANT.sideCounter) return 'counter';
  return 'ok';
}

// The sentence the phone shows. Placeholders stand in for what has not been picked yet, so
// the line reads as a sentence being built rather than appearing all at once.
function orderLine(item, counter, drink, blankKo) {
  const head = item ? item.ko : (blankKo || '피자');
  const count = counter ? counter.numKo + ' ' + counter.ko : '몇';
  const tail = drink ? '하고 ' + drink.ko + ' 하나' : '';
  return `${head} ${count}${tail} 주세요.`;
}
/* ── Order grading end ──────────────────────────────────────── */

// One picker row. `group` keeps the selection exclusive within its own row, so picking a
// drink does not clear the pizza.
function pickerHtml(group, items, labelOf) {
  return `<div class="grid" data-group="${group}">` + items.map((it) =>
    `<button class="dish" data-group="${group}" data-id="${it.id}">
       <div class="name">${it.icon ? it.icon + ' ' : ''}${labelOf ? labelOf(it) : it.ko}</div>
       <div class="meta">${glossOn ? it.en : ''}</div>
     </button>`).join('') + `</div>`;
}

function wirePickers(onChange) {
  document.querySelectorAll('.dish[data-group]').forEach((b) => {
    b.onclick = () => {
      const g = b.dataset.group;
      document.querySelectorAll(`.dish[data-group="${g}"]`).forEach((x) => {
        x.classList.toggle('picked', x === b);
      });
      onChange(g, b.dataset.id);
    };
  });
}

function phoneBeat() {
  const O = ORDER();

  if (phoneStep === 0) {
    setStage(`
      ${formTag('nde')}
      <div class="kicker">SCENE 3 · 2시, 바쁠 때</div>
      <h1>피자 시킬래?</h1>
      <div class="bubble">
        <div class="who">스티븐</div>
        <div>
          <div class="line-ko" data-speak="점심 아직 안 먹었는데 2시에 피자 시킬래? 나는 소고기 좋아하는데 불고기피자는 싫어.">점심 아직 안 먹었는데 2시에 피자 시킬래? 나는 소고기 좋아하는데 <span class="mark">불고기피자는 싫어.</span></div>
          ${gloss('Still no lunch — pizza at 2? I like beef, but I don\'t like bulgogi pizza.')}
        </div>
      </div>
      <div class="choices" id="chs"></div>
      <div class="fb" id="fb"></div>
    `);
    paintChoices('chs', [
      { ko: '그럼 치즈피자 시키자.', en: 'Then let\'s get cheese pizza.', ok: true, register: 'banmal', form: 'nde', why: '소고기는 좋아하는데 불고기피자는 싫어 → 치즈피자.' },
      { ko: '불고기피자 두 판 주세요.', en: 'Two bulgogi pizzas please', ok: false, register: 'jondaetmal', why: 'He just said he dislikes 불고기피자 — and 주세요 is for the shop, not for a friend.' },
      { ko: '감자탕 또 먹을래.', en: 'Gamjatang again', ok: false, why: 'This beat is the listening: pizza at 2 o\'clock.' }
    ], () => { phoneStep = 1; phoneBeat(); });
    return;
  }

  if (phoneStep === 1) {
    // The tape names the order, which is what makes one pizza and one drink the right
    // answer: 야채피자 and 사이다 are perfectly good Korean, just not what was asked for.
    // Only the counter is right or wrong on its own.
    setStage(`
      ${formTag('jondaetmal')}
      <div class="kicker">SCENE 3 · YOU ARE THE CUSTOMER</div>
      <h1>여보세요, ${O.shopKo}입니다</h1>
      <div class="phone">
        <div class="notch"></div>
        <h2>${(O.shopEn || '').toUpperCase()}</h2>
        <div class="sms them">여보세요, ${O.shopKo}입니다. 무엇을 도와드릴까요?</div>
        <div class="sms me" id="sms-me">…</div>
      </div>
      <p class="lead">존댓말. The tape orders <b>치즈피자</b> and <b>콜라</b> — ${O.priceKo}, ${O.minutesKo}. Pick the pizza, then how to count it, then the drink.</p>
      ${pickerHtml('pizza', O.pizzas)}
      ${pickerHtml('counter', O.counters, (c) => c.numKo + ' ' + c.ko)}
      ${pickerHtml('drink', O.drinks)}
      <div class="built" id="built">…</div>
      <div class="fb" id="fb"></div>
      <button class="cta" id="go">Say 주세요 →</button>
    `);
    const paint = () => {
      const line = orderLine(byId(O.pizzas, orderPizza), byId(O.counters, orderCounter), byId(O.drinks, orderDrink));
      $('built').textContent = line;
      $('built').setAttribute('data-speak', line);
      $('sms-me').textContent = line;
    };
    wirePickers((g, id) => {
      if (g === 'pizza') orderPizza = id;
      if (g === 'counter') orderCounter = id;
      if (g === 'drink') orderDrink = id;
      paint();
    });
    paint();
    $('go').onclick = () => {
      switch (gradePizzaOrder({ pizza: orderPizza, counter: orderCounter, drink: orderDrink })) {
        case 'incomplete':
          feedback($('fb'), false, '피자, 개수, 음료 — 세 개 다 고르세요.');
          return;
        case 'counter':
          feedback($('fb'), false, loseHeart('피자는 판으로 세요 — 치즈피자 한 판. 인분은 밥이나 국수처럼 한 사람 몫을 셀 때예요.'));
          return;
        case 'other-order':
          feedback($('fb'), false, loseHeart('말은 맞지만 주문이 달라요 — 테이프는 치즈피자하고 콜라예요.'));
          return;
        default:
          bump('vocab', 2); bump('register', 1);
          feedback($('fb'), true, `${O.priceKo}이고 ${O.minutesKo} 걸린다고 합니다.`);
          setTimeout(() => { phoneStep = 2; phoneBeat(); }, 900);
      }
    };
    return;
  }

  if (phoneStep === 2) {
    // Six sides, and the same counter row again — this time 인분 is the right one. The pair
    // of beats is the whole point: the counter follows the thing being counted, not the shop.
    setStage(`
      ${formTag('jondaetmal')}
      <div class="kicker">SCENE 3 · 정우도 배고파</div>
      <h1>하나 더 시키자</h1>
      <div class="bubble">
        <div class="who">정우</div>
        <div>
          <div class="line-ko" data-speak="피자만 먹으면 배 안 차는데. 밥이나 치킨도 하나 시킬래?">피자만 먹으면 배 안 차는데. <span class="mark">밥이나 치킨</span>도 하나 시킬래?</div>
          ${gloss('Pizza alone won\'t fill us. Shall we add rice or chicken?')}
        </div>
      </div>
      <p class="lead">Anything on this row is a fine choice — the graded part is the counter beside it.</p>
      ${pickerHtml('side', O.sides)}
      ${pickerHtml('scounter', O.counters, (c) => c.numKo + ' ' + c.ko)}
      <div class="built" id="built">…</div>
      <div class="fb" id="fb"></div>
      <button class="cta" id="go">주문 추가 →</button>
    `);
    const paint = () => {
      const line = orderLine(byId(O.sides, orderSide), byId(O.counters, orderSideCounter), null, '음식');
      $('built').textContent = line;
      $('built').setAttribute('data-speak', line);
    };
    wirePickers((g, id) => {
      if (g === 'side') orderSide = id;
      if (g === 'scounter') orderSideCounter = id;
      paint();
    });
    paint();
    $('go').onclick = () => {
      const s = byId(O.sides, orderSide);
      switch (gradeSideOrder({ side: orderSide, counter: orderSideCounter })) {
        case 'incomplete':
          feedback($('fb'), false, '음식하고 개수를 고르세요.');
          return;
        case 'counter':
          feedback($('fb'), false, loseHeart(`판은 피자 한 장을 세는 말이에요. ${s ? s.ko : '밥'}은 한 사람 몫이니까 인분이에요.`));
          return;
        default:
          bump('vocab', 2);
          feedback($('fb'), true, `네, ${s.ko} 이 인분이요.`);
          setTimeout(() => { phoneStep = 3; phoneBeat(); }, 900);
      }
    };
    return;
  }

  if (phoneStep === 3) {
    // Both delivery words are used, each answering the prompt it fits, rather than one
    // standing as a distractor for the other. 배달되다 asks whether delivery happens at all;
    // 갖다 주다 asks a person to bring it somewhere.
    const baedal = byId(O.delivery, 'baedal') || {};
    const gatda = byId(O.delivery, 'gatda') || {};
    setStage(`
      ${formTag('jondaetmal')}
      <div class="kicker">SCENE 3 · 배달</div>
      <h1>기숙사까지 와요?</h1>
      <div class="phone">
        <div class="notch"></div>
        <h2>${(O.shopEn || '').toUpperCase()}</h2>
        <div class="sms them">주문 다 되셨어요?</div>
      </div>
      <p class="lead">You do not know yet whether they come out to the dormitory. Ask that first.</p>
      <div class="choices" id="chs"></div>
      <div class="fb" id="fb"></div>
    `);
    paintChoices('chs', [
      { ko: baedal.askKo || '배달돼요?', en: 'Is it delivered?', ok: true, register: 'jondaetmal', why: '배달되다 — 배달이 되는지 묻는 말이에요. 사람한테 부탁하는 게 아니라 되는지 안 되는지를 물어요.' },
      { ko: '배달해요.', en: 'I deliver.', ok: false, why: '배달하다 is the shop doing the delivering — that is their side, not your question.' },
      { ko: gatda.askKo || '갖다 주세요.', en: 'Please bring it.', ok: false, why: '갖다 주다 asks someone to bring it — right word, wrong moment: you still do not know whether they deliver.' }
    ], () => {
      setStage(`
        ${formTag('jondaetmal')}
        <div class="kicker">SCENE 3 · 배달</div>
        <h1>네, 배달됩니다</h1>
        <div class="phone">
          <div class="notch"></div>
          <h2>${(O.shopEn || '').toUpperCase()}</h2>
          <div class="sms them">네, 배달됩니다. 어디로 갖다 드릴까요?</div>
        </div>
        <p class="lead">Now it is a request. Ask them to bring it to the dormitory door.</p>
        <div class="choices" id="chs2"></div>
        <div class="fb" id="fb"></div>
      `);
      paintChoices('chs2', [
        { ko: '기숙사 앞으로 갖다 주세요.', en: 'Please bring it to the dorm entrance.', ok: true, register: 'jondaetmal', why: '갖다 주다 — 가지고 와서 주는 것. 장소를 말하고 갖다 주세요.' },
        { ko: '기숙사 앞으로 배달돼요.', en: 'It gets delivered to the dorm.', ok: false, why: '배달되다 states that it happens; it cannot ask them to do it.' },
        { ko: '기숙사 앞으로 갖다 줘.', en: 'Bring it — banmal', ok: false, register: 'banmal', why: '가게 직원한테는 존댓말이에요. 정우한테 쓰는 말투가 아니에요.' }
      ], () => { phoneStep = 4; phoneBeat(); });
    });
    return;
  }

  // Readback. The pizza half now reads 한 판 rather than 큰 거 하나, matching what the
  // customer beat actually built.
  const p = byId(O.pizzas, orderPizza) || { ko: '치즈피자' };
  const d = byId(O.drinks, orderDrink) || { ko: '콜라' };
  setStage(`
    ${formTag('jondaetmal')}
    <div class="kicker">SCENE 3 · YOU ARE THE SHOP</div>
    <h1>주문 확인</h1>
    <div class="phone">
      <div class="notch"></div>
      <h2>${(O.shopEn || '').toUpperCase()} · STAFF</h2>
      <div class="sms them">${p.ko} 한 판하고 ${d.ko} 하나요. 맞죠?</div>
    </div>
    <p class="lead">Read back price and time from the listening passage.</p>
    <div class="choices" id="chs"></div>
    <div class="fb" id="fb"></div>
  `);
  paintChoices('chs', [
    { ko: `네, ${O.priceKo}이고 ${O.minutesKo} 걸립니다.`, en: '18,000 won, 30 minutes.', ok: true, register: 'jondaetmal', why: 'Matches the listening: 만 팔천 원 · 삼십 분.' },
    { ko: '만 원이고 한 시간 걸려.', en: 'Banmal + wrong numbers', ok: false, register: 'banmal', why: 'Staff uses 존댓말, and those figures are not in the passage.' },
    { ko: '이만 원이고 십 분 걸립니다.', en: 'Wrong total / time', ok: false, why: 'Close, but the tape is 만 팔천 원 and 삼십 분.' }
  ], nextScene);
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
