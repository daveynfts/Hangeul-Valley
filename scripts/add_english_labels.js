/**
 * add_english_labels.js — adds English labels to levels.json (idempotent).
 *
 * The curriculum data shipped Korean-only `name`, `description` and `category`
 * fields, which were rendered straight into an otherwise-English UI. This adds
 * `nameEn` / `descriptionEn` per level and `categoryEn` per word, following the
 * `name` / `nameKo` convention already used by ITEM_DB in game.js. The Korean
 * stays put — for a Korean-learning game the topic label is itself content.
 *
 * Run:  node scripts/add_english_labels.js
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'levels.json');
const levels = JSON.parse(fs.readFileSync(FILE, 'utf8'));

const LEVEL_EN = {
  '일상과 사람':        ['Daily Life & People',            'Family, people, everyday actions and basic states'],
  '음식과 식생활':      ['Food & Dining',                  'Food, ordering at restaurants, tastes and food conditions'],
  '시간과 날씨':        ['Time & Weather',                 'Time, dates, weather, seasons and time adverbs'],
  '장소와 위치':        ['Places & Directions',            'Buildings, places, positions, directions and transport'],
  '쇼핑과 물건':        ['Shopping & Things',              'Clothing, goods, basic economics, colours and shapes'],
  '취미와 여가':        ['Hobbies & Leisure',              'Sports, cultural leisure, appreciation and free-time activities'],
  '건강과 병원':        ['Health & Hospital',              'Body parts, symptoms, medical care and managing your health'],
  '학교와 학업':        ['School & Study',                 'School facilities, subjects, exams and academic activities'],
  '직장과 업무':        ['Work & Office',                  'Job ranks, company departments, handling tasks and workplace relationships'],
  '여행과 숙박':        ['Travel & Lodging',               'Trip preparation, transport, accommodation and sightseeing'],
  '감정과 심리':        ['Emotions & Feelings',            'Positive and negative emotions and a range of psychological states'],
  '성격과 외모':        ['Personality & Appearance',       'Character traits, describing looks, attitudes and habits'],
  '주거와 환경':        ['Housing & Neighbourhood',        'Types of housing, furniture, chores and the local area'],
  '통신과 미디어':      ['Communication & Media',          'Smartphones, the internet, social media, press and broadcasting'],
  '인간관계와 예절':    ['Relationships & Etiquette',      'Interpersonal relations, manners, etiquette, conflict and reconciliation'],
  '사회와 사회 문제':   ['Society & Social Issues',        'Social phenomena, welfare systems, social issues and policy'],
  '경제와 소비':        ['Economy & Consumption',          'Finance, inflation, spending patterns, trade and industry'],
  '과학과 기술':        ['Science & Technology',           'Scientific research, advanced technology, AI and energy'],
  '자연과 환경 문제':   ['Nature & the Environment',       'Ecosystems, nature, pollution, climate change and carbon neutrality'],
  '문화·예술과 역사':   ['Culture, Arts & History',        'Traditional heritage, art, literature, customs and historical vocabulary'],
  '관용구와 속담':      ['Idioms & Proverbs',              'Body idioms, situational idioms, four-character idioms and proverbs'],
  '추상적 개념과 사고': ['Abstract Concepts & Thought',    'Thinking, judgement, logical principles and abstract values'],
  '한자어와 학술 어휘': ['Sino-Korean & Academic Terms',   'Sino-Korean prefixes and suffixes, academic and public-administration terms'],
  '정치·법과 행정':     ['Politics, Law & Administration',  'Political systems, elections, the law and the duties of citizens'],
  '고급 접속어와 담화': ['Advanced Connectives & Discourse','Logical connectives, transition and addition adverbs, discourse markers'],
};

const CATEGORY_EN = {
  '가족과 사람': 'Family & People',            '일상 동작': 'Everyday Actions',
  '기본 상태': 'Basic States',                 '음식과 음료': 'Food & Drink',
  '식당과 주문': 'Restaurants & Ordering',     '맛과 상태': 'Taste & Texture',
  '시간과 날짜': 'Time & Dates',               '날씨와 계절': 'Weather & Seasons',
  '시간 부사': 'Time Adverbs',                 '건물과 장소': 'Buildings & Places',
  '위치와 방향': 'Position & Direction',       '교통수단': 'Transport',
  '물건과 의류': 'Objects & Clothing',         '쇼핑과 경제기초': 'Shopping & Basic Economics',
  '색상과 모양': 'Colours & Shapes',           '운동과 스포츠': 'Exercise & Sports',
  '문화와 여가': 'Culture & Leisure',          '감상과 평가': 'Appreciation & Evaluation',
  '신체와 증상': 'Body & Symptoms',            '병원과 약국': 'Hospital & Pharmacy',
  '건강 관리': 'Health Care',                  '학교 시설과 과목': 'School Facilities & Subjects',
  '수업과 시험': 'Classes & Exams',            '학업 동작': 'Study Actions',
  '직업과 부서': 'Jobs & Departments',         '업무와 과제': 'Tasks & Assignments',
  '직장 관계': 'Workplace Relationships',      '여행 준비': 'Trip Preparation',
  '교통과 숙소': 'Transport & Accommodation',  '관광과 경험': 'Sightseeing & Experiences',
  '긍정 감정': 'Positive Emotions',            '부정 감정': 'Negative Emotions',
  '심리 상태': 'Mental States',                '성격 특징': 'Personality Traits',
  '외모 묘사': 'Describing Appearance',        '태도와 행동': 'Attitude & Behaviour',
  '주거 형태와 가구': 'Housing Types & Furniture', '집안일과 관리': 'Housework & Upkeep',
  '동네 환경': 'The Neighbourhood',            '전화와 정보통신': 'Phones & Telecoms',
  '인터넷과 SNS': 'Internet & Social Media',   '신문과 방송': 'Press & Broadcasting',
  '관계와 대인': 'Relationships & Social Contact', '예절과 에티켓': 'Manners & Etiquette',
  '갈등과 화해': 'Conflict & Reconciliation',  '사회 현상': 'Social Phenomena',
  '복지와 제도': 'Welfare & Institutions',     '사회 문제': 'Social Problems',
  '금융과 경제': 'Finance & Economy',          '소비와 시장': 'Consumption & Markets',
  '무역과 산업': 'Trade & Industry',           '과학과 연구': 'Science & Research',
  '첨단 기술': 'Advanced Technology',          '에너지와 정보': 'Energy & Information',
  '생태와 자연': 'Ecology & Nature',           '환경 오염': 'Pollution',
  '보전과 기후': 'Conservation & Climate',     '전통과 유산': 'Tradition & Heritage',
  '풍습과 공연': 'Customs & Performance',      '예술과 문학': 'Art & Literature',
  '신체 관용구': 'Body Idioms',                '상황 관용구': 'Situational Idioms',
  '사자성어와 속담': 'Four-Character Idioms & Proverbs', '사고와 판단': 'Thought & Judgement',
  '가치와 기준': 'Values & Standards',         '개념과 원리': 'Concepts & Principles',
  '접두사·접미사 한자어': 'Sino-Korean Prefixes & Suffixes',
  '학술 전문 어휘': 'Academic & Technical Terms', '공공 어휘': 'Public & Civic Vocabulary',
  '정치와 정부': 'Politics & Government',      '법과 질서': 'Law & Order',
  '행정과 시민': 'Administration & Citizens',  '논리적 접속어': 'Logical Connectives',
  '전환 및 첨가 부사': 'Transition & Addition Adverbs', '담화 연결 표지': 'Discourse Markers',
};

const missingLevels = [];
const missingCats = new Set();
let wordsTagged = 0;

for (const lvl of levels) {
  const en = LEVEL_EN[lvl.name];
  if (en) { lvl.nameEn = en[0]; lvl.descriptionEn = en[1]; }
  else missingLevels.push(lvl.name);

  for (const w of (lvl.words || [])) {
    if (!w.category) continue;
    const c = CATEGORY_EN[w.category];
    if (c) { w.categoryEn = c; wordsTagged++; }
    else missingCats.add(w.category);
  }
}

if (missingLevels.length || missingCats.size) {
  console.error('Untranslated labels found — aborting so nothing ships half-tagged:');
  missingLevels.forEach(n => console.error(`  level:    ${n}`));
  [...missingCats].forEach(n => console.error(`  category: ${n}`));
  process.exit(1);
}

fs.writeFileSync(FILE, JSON.stringify(levels, null, 2) + '\n', 'utf8');
console.log(`levels.json updated: ${levels.length} levels + ${wordsTagged} words tagged with English labels.`);
console.log(`Distinct categories translated: ${new Set(levels.flatMap(l => (l.words || []).map(w => w.categoryEn))).size}`);
