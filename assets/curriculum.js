(function (root, factory) {
  const curriculum = factory();
  if (typeof module === 'object' && module.exports) module.exports = curriculum;
  if (root) root.HVCurriculum = curriculum;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const QA_STATUS = 'editorial-review-required';

  const chapters = [
    {
      id: 'a0-hangul-blocks',
      order: 1,
      band: 'A0',
      icon: '🔤',
      titleKo: '한글 첫걸음',
      titleVi: 'First Steps with Hangeul',
      canDoVi: 'Recognize the initial-consonant + vowel structure and read basic syllable blocks.',
      wordRefs: ['가', '너', '모'],
      grammar: [
        {
          id: 'hangul-onset-vowel',
          form: '초성 + 중성 → 음절',
          meaningVi: 'An initial consonant and a vowel combine to form one syllable block.',
          examples: [
            { ko: 'ㄱ + ㅏ → 가', vi: 'g/k + a → ga' },
            { ko: 'ㄴ + ㅓ → 너', vi: 'n + eo → neo' }
          ]
        }
      ],
      dialogue: [
        { speaker: 'Ginger', ko: '가, 너, 모! 한 글자씩 읽어 봐요.', vi: 'Ga, neo, mo! Read each block one at a time.' },
        { speaker: 'Learner', ko: '가! 너! 모!', vi: 'Ga! Neo! Mo!' }
      ],
      missions: [
        {
          id: 'hangul-ga',
          promptVi: 'Ginger says [ga]. Choose the correct syllable block.',
          contextKo: 'ㄱ + ㅏ = ?',
          correctKo: '가',
          choicesKo: ['가', '너', '모', '구'],
          explanationVi: 'ㄱ combines with ㅏ to form 가 [ga].'
        },
        {
          id: 'hangul-neo',
          promptVi: 'Which block is formed from ㄴ + ㅓ?',
          contextKo: 'ㄴ + ㅓ = ?',
          correctKo: '너',
          choicesKo: ['나', '너', '노', '누'],
          explanationVi: 'ㄴ + ㅓ forms 너 [neo].'
        },
        {
          id: 'hangul-mo',
          promptVi: 'Ginger says [mo]. Choose the answer.',
          contextKo: 'ㅁ + ㅗ = ?',
          correctKo: '모',
          choicesKo: ['마', '머', '모', '무'],
          explanationVi: 'ㅁ + ㅗ forms 모 [mo].'
        }
      ]
    },
    {
      id: 'a0-family-intro',
      order: 2,
      band: 'A0',
      icon: '👨‍👩‍👧',
      titleKo: '가족 소개',
      titleVi: 'Introducing Family',
      canDoVi: 'Introduce someone with the pattern “N은/는 N이에요/예요”.',
      wordRefs: ['아버지', '어머니', '형', '누나', '남동생', '이웃'],
      grammar: [
        {
          id: 'topic-copula',
          form: 'N은/는 N이에요/예요',
          meaningVi: 'Say “N is…” in a friendly polite style; use 은/는 to mark the topic.',
          examples: [
            { ko: '이분은 제 아버지예요.', vi: 'This is my father.' },
            { ko: '민수는 제 이웃이에요.', vi: 'Minsu is my neighbor.' }
          ]
        }
      ],
      dialogue: [
        { speaker: 'Ginger', ko: '이분은 누구예요?', vi: 'Who is this person?' },
        { speaker: 'Learner', ko: '제 어머니예요.', vi: 'She is my mother.' }
      ],
      missions: [
        {
          id: 'family-father',
          promptVi: 'Complete the introduction with “father”.',
          contextKo: '이분은 제 ___예요.',
          correctKo: '아버지',
          choicesKo: ['아버지', '어머니', '누나', '이웃'],
          explanationVi: '아버지 is the standard polite word for “father”.'
        },
        {
          id: 'family-mother',
          promptVi: 'Ginger asks: “Who is your mother?”',
          contextKo: '제 ___예요. (She is my mother.)',
          correctKo: '어머니',
          choicesKo: ['형', '어머니', '동생', '아버지'],
          explanationVi: '어머니 means “mother”. After a vowel, 예요 connects naturally.'
        },
        {
          id: 'family-neighbor',
          promptVi: 'Choose the word that completes “Minsu is my neighbor”.',
          contextKo: '민수는 제 ___이에요.',
          correctKo: '이웃',
          choicesKo: ['이웃', '형', '누나', '어머니'],
          explanationVi: '이웃 ends in a consonant, so it takes 이에요.'
        }
      ]
    },
    {
      id: 'a0-food-order',
      order: 3,
      band: 'A0',
      icon: '🍚',
      titleKo: '식당에서',
      titleVi: 'At a Restaurant',
      canDoVi: 'Say what you eat and order food with “N을/를 먹어요” or “N 주세요”.',
      wordRefs: ['밥', '국', '김치', '비빔밥', '만두', '커피'],
      grammar: [
        {
          id: 'object-eat-request',
          form: 'N을/를 먹어요 · N 주세요',
          meaningVi: 'Use 을/를 to mark the object; 주세요 is a polite way to request an item.',
          examples: [
            { ko: '비빔밥을 먹어요.', vi: 'I eat bibimbap.' },
            { ko: '커피 주세요.', vi: 'A coffee, please.' }
          ]
        }
      ],
      dialogue: [
        { speaker: 'Ginger', ko: '뭐 드릴까요?', vi: 'What can I get for you?' },
        { speaker: 'Learner', ko: '비빔밥 주세요.', vi: 'Bibimbap, please.' }
      ],
      missions: [
        {
          id: 'food-kimchi',
          promptVi: 'You say “I eat kimchi.” Choose the correct food.',
          contextKo: '저는 ___를 먹어요.',
          correctKo: '김치',
          choicesKo: ['김치', '커피', '국', '만두'],
          explanationVi: '김치 ends in a vowel, so it takes 를: 김치를 먹어요.'
        },
        {
          id: 'food-bibimbap',
          promptVi: 'Order one serving of bibimbap.',
          contextKo: '___ 주세요.',
          correctKo: '비빔밥',
          choicesKo: ['국', '밥', '비빔밥', '커피'],
          explanationVi: '비빔밥 주세요 is a short, polite way to order bibimbap.'
        },
        {
          id: 'food-coffee',
          promptVi: 'Order a cup of coffee.',
          contextKo: '___ 주세요.',
          correctKo: '커피',
          choicesKo: ['김치', '만두', '커피', '국'],
          explanationVi: '커피 주세요 means “Coffee, please.”'
        }
      ]
    },
    {
      id: 'a0-time-plans',
      order: 4,
      band: 'A0',
      icon: '🗓️',
      titleKo: '시간과 약속',
      titleVi: 'Time and Plans',
      canDoVi: 'Say that something happens today, tomorrow, or on the weekend.',
      wordRefs: ['오늘', '어제', '내일', '이번주', '다음주', '주말'],
      grammar: [
        {
          id: 'time-marker-e',
          form: '시간 + 에',
          meaningVi: 'The particle 에 marks a time; it is often omitted after 오늘 or 내일.',
          examples: [
            { ko: '주말에 만나요.', vi: 'See you on the weekend.' },
            { ko: '내일 공부해요.', vi: 'I study tomorrow.' }
          ]
        }
      ],
      dialogue: [
        { speaker: 'Ginger', ko: '언제 만나요?', vi: 'When shall we meet?' },
        { speaker: 'Learner', ko: '주말에 만나요.', vi: 'Let’s meet on the weekend.' }
      ],
      missions: [
        {
          id: 'time-tomorrow',
          promptVi: 'Choose “tomorrow”.',
          contextKo: '___ 공부해요.',
          correctKo: '내일',
          choicesKo: ['어제', '오늘', '내일', '주말'],
          explanationVi: '내일 means “tomorrow”.'
        },
        {
          id: 'time-weekend',
          promptVi: 'Complete the sentence “See you on the weekend.”',
          contextKo: '___에 만나요.',
          correctKo: '주말',
          choicesKo: ['오늘', '주말', '어제', '다음주'],
          explanationVi: '주말에 means “on the weekend”.'
        },
        {
          id: 'time-this-week',
          promptVi: 'Choose “this week”.',
          contextKo: '___는 바빠요.',
          correctKo: '이번주',
          choicesKo: ['다음주', '이번주', '오늘', '내일'],
          explanationVi: '이번주 means “this week”; 다음주 means “next week”.'
        }
      ]
    },
    {
      id: 'a1-places-directions',
      order: 5,
      band: 'A1',
      icon: '📍',
      titleKo: '어디에 가요?',
      titleVi: 'Where Are You Going?',
      canDoVi: 'State a destination with “N에 가요” and choose a place that fits the situation.',
      wordRefs: ['학교', '병원', '약국', '은행', '도서관', '지하철역'],
      grammar: [
        {
          id: 'destination-e',
          form: '장소 + 에 가요',
          meaningVi: 'The particle 에 follows a destination; 가요 is the polite form of “to go”.',
          examples: [
            { ko: '도서관에 가요.', vi: 'I am going to the library.' },
            { ko: '어디에 가요?', vi: 'Where are you going?' }
          ]
        }
      ],
      dialogue: [
        { speaker: 'Ginger', ko: '어디에 가요?', vi: 'Where are you going?' },
        { speaker: 'Learner', ko: '도서관에 가요.', vi: 'I am going to the library.' }
      ],
      missions: [
        {
          id: 'place-hospital',
          promptVi: 'You are sick. Choose where you should go.',
          contextKo: '___에 가요.',
          correctKo: '병원',
          choicesKo: ['은행', '학교', '병원', '도서관'],
          explanationVi: '병원 means hospital: 병원에 가요.'
        },
        {
          id: 'place-pharmacy',
          promptVi: 'You need to buy medicine.',
          contextKo: '약을 사러 ___에 가요.',
          correctKo: '약국',
          choicesKo: ['약국', '은행', '지하철역', '학교'],
          explanationVi: '약국 means pharmacy.'
        },
        {
          id: 'place-library',
          promptVi: 'You want to borrow a book.',
          contextKo: '책을 빌리러 ___에 가요.',
          correctKo: '도서관',
          choicesKo: ['병원', '도서관', '은행', '약국'],
          explanationVi: '도서관 means library.'
        }
      ]
    },
    {
      id: 'a1-shopping',
      order: 6,
      band: 'A1',
      icon: '🛍️',
      titleKo: '쇼핑하기',
      titleVi: 'Shopping',
      canDoVi: 'Ask the price and request an item politely.',
      wordRefs: ['옷', '바지', '신발', '모자', '가방', '지갑'],
      grammar: [
        {
          id: 'shopping-request-price',
          form: 'N 주세요 · 얼마예요?',
          meaningVi: 'Use 주세요 to request an item and 얼마예요? to ask its price.',
          examples: [
            { ko: '이 가방 주세요.', vi: 'This bag, please.' },
            { ko: '이 신발은 얼마예요?', vi: 'How much are these shoes?' }
          ]
        }
      ],
      dialogue: [
        { speaker: 'Ginger', ko: '뭘 찾으세요?', vi: 'What are you looking for?' },
        { speaker: 'Learner', ko: '가방을 찾고 있어요.', vi: 'I am looking for a bag.' }
      ],
      missions: [
        {
          id: 'shop-bag',
          promptVi: 'Ask for this bag.',
          contextKo: '이 ___ 주세요.',
          correctKo: '가방',
          choicesKo: ['지갑', '모자', '가방', '바지'],
          explanationVi: '가방 means bag: 이 가방 주세요.'
        },
        {
          id: 'shop-shoes',
          promptVi: 'Ask the price of the shoes.',
          contextKo: '이 ___은 얼마예요?',
          correctKo: '신발',
          choicesKo: ['옷', '신발', '모자', '지갑'],
          explanationVi: '신발 means shoes; 신발은 얼마예요? means “How much are the shoes?”'
        },
        {
          id: 'shop-wallet',
          promptVi: 'You need a wallet.',
          contextKo: '___을 찾고 있어요.',
          correctKo: '지갑',
          choicesKo: ['바지', '가방', '지갑', '모자'],
          explanationVi: '지갑 means wallet.'
        }
      ]
    },
    {
      id: 'a1-hobbies',
      order: 7,
      band: 'A1',
      icon: '⚽',
      titleKo: '취미가 뭐예요?',
      titleVi: 'What Is Your Hobby?',
      canDoVi: 'Talk about an activity you like with “N을/를 좋아해요”.',
      wordRefs: ['축구', '수영', '등산', '요가', '독서', '여행'],
      grammar: [
        {
          id: 'like-object',
          form: 'N을/를 좋아해요',
          meaningVi: 'Use 을/를 for the thing you like; 좋아해요 means “to like”.',
          examples: [
            { ko: '저는 축구를 좋아해요.', vi: 'I like soccer.' },
            { ko: '제 취미는 독서예요.', vi: 'My hobby is reading.' }
          ]
        }
      ],
      dialogue: [
        { speaker: 'Ginger', ko: '취미가 뭐예요?', vi: 'What is your hobby?' },
        { speaker: 'Learner', ko: '저는 수영을 좋아해요.', vi: 'I like swimming.' }
      ],
      missions: [
        {
          id: 'hobby-football',
          promptVi: 'You like soccer.',
          contextKo: '저는 ___를 좋아해요.',
          correctKo: '축구',
          choicesKo: ['요가', '독서', '축구', '수영'],
          explanationVi: '축구 means soccer: 축구를 좋아해요.'
        },
        {
          id: 'hobby-reading',
          promptVi: 'Your hobby is reading.',
          contextKo: '제 취미는 ___예요.',
          correctKo: '독서',
          choicesKo: ['여행', '독서', '등산', '수영'],
          explanationVi: '독서 means reading as an activity.'
        },
        {
          id: 'hobby-swimming',
          promptVi: 'You like swimming.',
          contextKo: '저는 ___을 좋아해요.',
          correctKo: '수영',
          choicesKo: ['수영', '축구', '요가', '여행'],
          explanationVi: '수영 means swimming.'
        }
      ]
    },
    {
      id: 'a1-health',
      order: 8,
      band: 'A1',
      icon: '🩺',
      titleKo: '어디가 아파요?',
      titleVi: 'Where Does It Hurt?',
      canDoVi: 'Say which body part hurts with “N이/가 아파요”.',
      wordRefs: ['머리', '눈', '목', '어깨', '손', '배'],
      grammar: [
        {
          id: 'body-subject-hurts',
          form: 'N이/가 아파요',
          meaningVi: 'Use 이/가 to mark the body part that hurts.',
          examples: [
            { ko: '머리가 아파요.', vi: 'I have a headache.' },
            { ko: '목이 아파요.', vi: 'My throat or neck hurts.' }
          ]
        }
      ],
      dialogue: [
        { speaker: 'Ginger', ko: '어디가 아파요?', vi: 'Where does it hurt?' },
        { speaker: 'Learner', ko: '머리가 아파요.', vi: 'I have a headache.' }
      ],
      missions: [
        {
          id: 'health-head',
          promptVi: 'You have a headache.',
          contextKo: '___가 아파요.',
          correctKo: '머리',
          choicesKo: ['손', '머리', '목', '배'],
          explanationVi: '머리 ends in a vowel, so use 가: 머리가 아파요.'
        },
        {
          id: 'health-throat',
          promptVi: 'You have a sore throat.',
          contextKo: '___이 아파요.',
          correctKo: '목',
          choicesKo: ['눈', '어깨', '목', '머리'],
          explanationVi: '목 ends in a consonant, so use 이: 목이 아파요.'
        },
        {
          id: 'health-stomach',
          promptVi: 'You have a stomachache.',
          contextKo: '___가 아파요.',
          correctKo: '배',
          choicesKo: ['배', '손', '눈', '어깨'],
          explanationVi: '배 can mean stomach; 배가 아파요 means “My stomach hurts.”'
        }
      ]
    },
    {
      id: 'a1-school-work',
      order: 9,
      band: 'A1',
      icon: '🎓',
      titleKo: '학교와 직장',
      titleVi: 'School and Work',
      canDoVi: 'Say where an activity happens with “N에서 V” and name school or work activities.',
      wordRefs: ['교실', '도서관', '수학', '업무', '프로젝트', '회의'],
      grammar: [
        {
          id: 'activity-location-eseo',
          form: '장소 + 에서 V',
          meaningVi: 'The particle 에서 marks the place where an action happens.',
          examples: [
            { ko: '교실에서 공부해요.', vi: 'I study in the classroom.' },
            { ko: '회사에서 회의해요.', vi: 'I have a meeting at the office.' }
          ]
        }
      ],
      dialogue: [
        { speaker: 'Ginger', ko: '어디에서 공부해요?', vi: 'Where do you study?' },
        { speaker: 'Learner', ko: '교실에서 공부해요.', vi: 'I study in the classroom.' }
      ],
      missions: [
        {
          id: 'school-classroom',
          promptVi: 'You study in the classroom.',
          contextKo: '___에서 공부해요.',
          correctKo: '교실',
          choicesKo: ['도서관', '교실', '회의', '프로젝트'],
          explanationVi: '교실에서 means “in the classroom”.'
        },
        {
          id: 'school-math',
          promptVi: 'Choose mathematics.',
          contextKo: '저는 ___을 공부해요.',
          correctKo: '수학',
          choicesKo: ['회의', '업무', '수학', '교실'],
          explanationVi: '수학 means mathematics.'
        },
        {
          id: 'work-meeting',
          promptVi: 'You have a meeting.',
          contextKo: '오늘 ___가 있어요.',
          correctKo: '회의',
          choicesKo: ['프로젝트', '수학', '도서관', '회의'],
          explanationVi: '회의가 있어요 means “There is a meeting.”'
        }
      ]
    },
    {
      id: 'a1-travel',
      order: 10,
      band: 'A1',
      icon: '✈️',
      titleKo: '한국 여행',
      titleVi: 'Traveling in Korea',
      canDoVi: 'Talk about documents, luggage, and reservations for a trip.',
      wordRefs: ['여권', '항공권', '캐리어', '지도', '호텔', '예약'],
      grammar: [
        {
          id: 'completed-plan',
          form: 'N을/를 준비했어요 · 예약했어요',
          meaningVi: 'The -았/었어요 form describes a completed action in the past.',
          examples: [
            { ko: '여권을 준비했어요.', vi: 'I prepared my passport.' },
            { ko: '호텔을 예약했어요.', vi: 'I booked a hotel.' }
          ]
        }
      ],
      dialogue: [
        { speaker: 'Ginger', ko: '여행 준비를 다 했어요?', vi: 'Have you finished preparing for the trip?' },
        { speaker: 'Learner', ko: '네, 호텔을 예약했어요.', vi: 'Yes, I booked a hotel.' }
      ],
      missions: [
        {
          id: 'travel-passport',
          promptVi: 'You prepared your passport.',
          contextKo: '___을 준비했어요.',
          correctKo: '여권',
          choicesKo: ['지도', '호텔', '여권', '캐리어'],
          explanationVi: '여권 means passport.'
        },
        {
          id: 'travel-hotel',
          promptVi: 'You booked a hotel.',
          contextKo: '___을 예약했어요.',
          correctKo: '호텔',
          choicesKo: ['항공권', '호텔', '지도', '여권'],
          explanationVi: '호텔을 예약했어요 means “I booked a hotel.”'
        },
        {
          id: 'travel-ticket',
          promptVi: 'You bought a plane ticket.',
          contextKo: '___을 샀어요.',
          correctKo: '항공권',
          choicesKo: ['예약', '캐리어', '항공권', '지도'],
          explanationVi: '항공권 means plane ticket.'
        }
      ]
    }
  ];

  function getChapter(id) {
    return chapters.find(chapter => chapter.id === id) || null;
  }

  return {
    version: 1,
    locale: 'en-US',
    targetLanguage: 'ko-KR',
    qa: {
      status: QA_STATUS,
      linguisticReview: 'pending',
      audioReview: 'pending',
      audioPolicy: 'browser-speech-synthesis-fallback',
      noteVi: 'Project-authored content must be reviewed by a qualified Korean teacher or native speaker before any official educational-release label is applied.'
    },
    chapters,
    getChapter
  };
});
