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
      titleVi: 'Bước đầu với Hangeul',
      canDoVi: 'Nhận ra cấu trúc phụ âm đầu + nguyên âm và đọc một số khối âm tiết cơ bản.',
      wordRefs: ['가', '너', '모'],
      grammar: [
        {
          id: 'hangul-onset-vowel',
          form: '초성 + 중성 → 음절',
          meaningVi: 'Một phụ âm đầu và một nguyên âm được ghép thành một khối âm tiết.',
          examples: [
            { ko: 'ㄱ + ㅏ → 가', vi: 'g/k + a → ga' },
            { ko: 'ㄴ + ㅓ → 너', vi: 'n + eo → neo' }
          ]
        }
      ],
      dialogue: [
        { speaker: 'Ginger', ko: '가, 너, 모! 한 글자씩 읽어 봐요.', vi: 'Ga, neo, mo! Hãy đọc từng khối một nhé.' },
        { speaker: 'Learner', ko: '가! 너! 모!', vi: 'Ga! Neo! Mo!' }
      ],
      missions: [
        {
          id: 'hangul-ga',
          promptVi: 'Ginger đọc [ga]. Chọn khối âm tiết đúng.',
          contextKo: 'ㄱ + ㅏ = ?',
          correctKo: '가',
          choicesKo: ['가', '너', '모', '구'],
          explanationVi: 'ㄱ ghép với ㅏ tạo thành 가 [ga].'
        },
        {
          id: 'hangul-neo',
          promptVi: 'Khối nào được ghép từ ㄴ + ㅓ?',
          contextKo: 'ㄴ + ㅓ = ?',
          correctKo: '너',
          choicesKo: ['나', '너', '노', '누'],
          explanationVi: 'ㄴ + ㅓ tạo thành 너 [neo].'
        },
        {
          id: 'hangul-mo',
          promptVi: 'Ginger đọc [mo]. Chọn đáp án.',
          contextKo: 'ㅁ + ㅗ = ?',
          correctKo: '모',
          choicesKo: ['마', '머', '모', '무'],
          explanationVi: 'ㅁ + ㅗ tạo thành 모 [mo].'
        }
      ]
    },
    {
      id: 'a0-family-intro',
      order: 2,
      band: 'A0',
      icon: '👨‍👩‍👧',
      titleKo: '가족 소개',
      titleVi: 'Giới thiệu gia đình',
      canDoVi: 'Giới thiệu một người bằng mẫu “N은/는 N이에요/예요”.',
      wordRefs: ['아버지', '어머니', '형', '누나', '남동생', '이웃'],
      grammar: [
        {
          id: 'topic-copula',
          form: 'N은/는 N이에요/예요',
          meaningVi: 'Nói “N là…” theo lối lịch sự thân thiện; dùng 은/는 để nêu chủ đề.',
          examples: [
            { ko: '이분은 제 아버지예요.', vi: 'Vị này là bố của tôi.' },
            { ko: '민수는 제 이웃이에요.', vi: 'Minsu là hàng xóm của tôi.' }
          ]
        }
      ],
      dialogue: [
        { speaker: 'Ginger', ko: '이분은 누구예요?', vi: 'Vị này là ai vậy?' },
        { speaker: 'Learner', ko: '제 어머니예요.', vi: 'Là mẹ của tôi.' }
      ],
      missions: [
        {
          id: 'family-father',
          promptVi: 'Điền từ “bố” vào lời giới thiệu.',
          contextKo: '이분은 제 ___예요.',
          correctKo: '아버지',
          choicesKo: ['아버지', '어머니', '누나', '이웃'],
          explanationVi: '아버지 là cách gọi lịch sự/chuẩn cho “bố”.'
        },
        {
          id: 'family-mother',
          promptVi: 'Ginger hỏi: “Ai là mẹ của bạn?”',
          contextKo: '제 ___예요. (Đó là mẹ tôi.)',
          correctKo: '어머니',
          choicesKo: ['형', '어머니', '동생', '아버지'],
          explanationVi: '어머니 nghĩa là “mẹ”. Sau nguyên âm, 예요 nối tự nhiên.'
        },
        {
          id: 'family-neighbor',
          promptVi: 'Chọn từ phù hợp với “Minsu là hàng xóm của tôi”.',
          contextKo: '민수는 제 ___이에요.',
          correctKo: '이웃',
          choicesKo: ['이웃', '형', '누나', '어머니'],
          explanationVi: '이웃 kết thúc bằng phụ âm, vì vậy đi với 이에요.'
        }
      ]
    },
    {
      id: 'a0-food-order',
      order: 3,
      band: 'A0',
      icon: '🍚',
      titleKo: '식당에서',
      titleVi: 'Ở quán ăn',
      canDoVi: 'Nói món mình ăn và gọi món bằng “N을/를 먹어요” hoặc “N 주세요”.',
      wordRefs: ['밥', '국', '김치', '비빔밥', '만두', '커피'],
      grammar: [
        {
          id: 'object-eat-request',
          form: 'N을/를 먹어요 · N 주세요',
          meaningVi: 'Dùng 을/를 cho tân ngữ; “주세요” là cách gọi/xin một món lịch sự.',
          examples: [
            { ko: '비빔밥을 먹어요.', vi: 'Tôi ăn bibimbap.' },
            { ko: '커피 주세요.', vi: 'Cho tôi một cà phê.' }
          ]
        }
      ],
      dialogue: [
        { speaker: 'Ginger', ko: '뭐 드릴까요?', vi: 'Bạn dùng món gì ạ?' },
        { speaker: 'Learner', ko: '비빔밥 주세요.', vi: 'Cho tôi bibimbap.' }
      ],
      missions: [
        {
          id: 'food-kimchi',
          promptVi: 'Bạn nói “Tôi ăn kimchi”. Chọn món đúng.',
          contextKo: '저는 ___를 먹어요.',
          correctKo: '김치',
          choicesKo: ['김치', '커피', '국', '만두'],
          explanationVi: '김치 kết thúc bằng nguyên âm nên đi với 를: 김치를 먹어요.'
        },
        {
          id: 'food-bibimbap',
          promptVi: 'Gọi một phần bibimbap.',
          contextKo: '___ 주세요.',
          correctKo: '비빔밥',
          choicesKo: ['국', '밥', '비빔밥', '커피'],
          explanationVi: '비빔밥 주세요 là mẫu gọi món ngắn gọn và lịch sự.'
        },
        {
          id: 'food-coffee',
          promptVi: 'Gọi một ly cà phê.',
          contextKo: '___ 주세요.',
          correctKo: '커피',
          choicesKo: ['김치', '만두', '커피', '국'],
          explanationVi: '커피 주세요 nghĩa là “Cho tôi cà phê”.'
        }
      ]
    },
    {
      id: 'a0-time-plans',
      order: 4,
      band: 'A0',
      icon: '🗓️',
      titleKo: '시간과 약속',
      titleVi: 'Thời gian và kế hoạch',
      canDoVi: 'Nói một việc diễn ra vào hôm nay, ngày mai hoặc cuối tuần.',
      wordRefs: ['오늘', '어제', '내일', '이번주', '다음주', '주말'],
      grammar: [
        {
          id: 'time-marker-e',
          form: '시간 + 에',
          meaningVi: 'Trợ từ 에 đánh dấu thời điểm; với 오늘/내일 thường có thể lược bỏ.',
          examples: [
            { ko: '주말에 만나요.', vi: 'Cuối tuần gặp nhé.' },
            { ko: '내일 공부해요.', vi: 'Ngày mai tôi học.' }
          ]
        }
      ],
      dialogue: [
        { speaker: 'Ginger', ko: '언제 만나요?', vi: 'Khi nào chúng ta gặp?' },
        { speaker: 'Learner', ko: '주말에 만나요.', vi: 'Gặp vào cuối tuần nhé.' }
      ],
      missions: [
        {
          id: 'time-tomorrow',
          promptVi: 'Chọn “ngày mai”.',
          contextKo: '___ 공부해요.',
          correctKo: '내일',
          choicesKo: ['어제', '오늘', '내일', '주말'],
          explanationVi: '내일 nghĩa là “ngày mai”.'
        },
        {
          id: 'time-weekend',
          promptVi: 'Hoàn thành câu “Cuối tuần gặp nhé”.',
          contextKo: '___에 만나요.',
          correctKo: '주말',
          choicesKo: ['오늘', '주말', '어제', '다음주'],
          explanationVi: '주말에 = vào cuối tuần.'
        },
        {
          id: 'time-this-week',
          promptVi: 'Chọn “tuần này”.',
          contextKo: '___는 바빠요.',
          correctKo: '이번주',
          choicesKo: ['다음주', '이번주', '오늘', '내일'],
          explanationVi: '이번주 là “tuần này”; 다음주 là “tuần sau”.'
        }
      ]
    },
    {
      id: 'a1-places-directions',
      order: 5,
      band: 'A1',
      icon: '📍',
      titleKo: '어디에 가요?',
      titleVi: 'Bạn đi đâu?',
      canDoVi: 'Nói điểm đến bằng “N에 가요” và chọn địa điểm phù hợp với tình huống.',
      wordRefs: ['학교', '병원', '약국', '은행', '도서관', '지하철역'],
      grammar: [
        {
          id: 'destination-e',
          form: '장소 + 에 가요',
          meaningVi: 'Trợ từ 에 đứng sau điểm đến; 가요 là dạng lịch sự của “đi”.',
          examples: [
            { ko: '도서관에 가요.', vi: 'Tôi đi thư viện.' },
            { ko: '어디에 가요?', vi: 'Bạn đi đâu?' }
          ]
        }
      ],
      dialogue: [
        { speaker: 'Ginger', ko: '어디에 가요?', vi: 'Bạn đi đâu?' },
        { speaker: 'Learner', ko: '도서관에 가요.', vi: 'Tôi đi thư viện.' }
      ],
      missions: [
        {
          id: 'place-hospital',
          promptVi: 'Bạn bị ốm. Chọn nơi nên đến.',
          contextKo: '___에 가요.',
          correctKo: '병원',
          choicesKo: ['은행', '학교', '병원', '도서관'],
          explanationVi: '병원 là bệnh viện: 병원에 가요.'
        },
        {
          id: 'place-pharmacy',
          promptVi: 'Bạn cần mua thuốc.',
          contextKo: '약을 사러 ___에 가요.',
          correctKo: '약국',
          choicesKo: ['약국', '은행', '지하철역', '학교'],
          explanationVi: '약국 là nhà thuốc.'
        },
        {
          id: 'place-library',
          promptVi: 'Bạn muốn mượn sách.',
          contextKo: '책을 빌리러 ___에 가요.',
          correctKo: '도서관',
          choicesKo: ['병원', '도서관', '은행', '약국'],
          explanationVi: '도서관 là thư viện.'
        }
      ]
    },
    {
      id: 'a1-shopping',
      order: 6,
      band: 'A1',
      icon: '🛍️',
      titleKo: '쇼핑하기',
      titleVi: 'Đi mua sắm',
      canDoVi: 'Hỏi giá và yêu cầu một món đồ bằng lối nói lịch sự.',
      wordRefs: ['옷', '바지', '신발', '모자', '가방', '지갑'],
      grammar: [
        {
          id: 'shopping-request-price',
          form: 'N 주세요 · 얼마예요?',
          meaningVi: 'Dùng 주세요 để yêu cầu món đồ và 얼마예요? để hỏi giá.',
          examples: [
            { ko: '이 가방 주세요.', vi: 'Cho tôi chiếc túi này.' },
            { ko: '이 신발은 얼마예요?', vi: 'Đôi giày này bao nhiêu tiền?' }
          ]
        }
      ],
      dialogue: [
        { speaker: 'Ginger', ko: '뭘 찾으세요?', vi: 'Bạn đang tìm gì?' },
        { speaker: 'Learner', ko: '가방을 찾고 있어요.', vi: 'Tôi đang tìm một chiếc túi.' }
      ],
      missions: [
        {
          id: 'shop-bag',
          promptVi: 'Yêu cầu chiếc túi này.',
          contextKo: '이 ___ 주세요.',
          correctKo: '가방',
          choicesKo: ['지갑', '모자', '가방', '바지'],
          explanationVi: '가방 là túi/cặp: 이 가방 주세요.'
        },
        {
          id: 'shop-shoes',
          promptVi: 'Hỏi giá đôi giày.',
          contextKo: '이 ___은 얼마예요?',
          correctKo: '신발',
          choicesKo: ['옷', '신발', '모자', '지갑'],
          explanationVi: '신발 là giày dép; 신발은 얼마예요? là “Giày bao nhiêu tiền?”.'
        },
        {
          id: 'shop-wallet',
          promptVi: 'Bạn cần một chiếc ví.',
          contextKo: '___을 찾고 있어요.',
          correctKo: '지갑',
          choicesKo: ['바지', '가방', '지갑', '모자'],
          explanationVi: '지갑 là ví.'
        }
      ]
    },
    {
      id: 'a1-hobbies',
      order: 7,
      band: 'A1',
      icon: '⚽',
      titleKo: '취미가 뭐예요?',
      titleVi: 'Sở thích của bạn là gì?',
      canDoVi: 'Nói hoạt động mình thích bằng “N을/를 좋아해요”.',
      wordRefs: ['축구', '수영', '등산', '요가', '독서', '여행'],
      grammar: [
        {
          id: 'like-object',
          form: 'N을/를 좋아해요',
          meaningVi: 'Dùng 을/를 cho đối tượng mình thích; 좋아해요 là “thích”.',
          examples: [
            { ko: '저는 축구를 좋아해요.', vi: 'Tôi thích bóng đá.' },
            { ko: '제 취미는 독서예요.', vi: 'Sở thích của tôi là đọc sách.' }
          ]
        }
      ],
      dialogue: [
        { speaker: 'Ginger', ko: '취미가 뭐예요?', vi: 'Sở thích của bạn là gì?' },
        { speaker: 'Learner', ko: '저는 수영을 좋아해요.', vi: 'Tôi thích bơi.' }
      ],
      missions: [
        {
          id: 'hobby-football',
          promptVi: 'Bạn thích bóng đá.',
          contextKo: '저는 ___를 좋아해요.',
          correctKo: '축구',
          choicesKo: ['요가', '독서', '축구', '수영'],
          explanationVi: '축구 là bóng đá; 축구를 좋아해요.'
        },
        {
          id: 'hobby-reading',
          promptVi: 'Sở thích của bạn là đọc sách.',
          contextKo: '제 취미는 ___예요.',
          correctKo: '독서',
          choicesKo: ['여행', '독서', '등산', '수영'],
          explanationVi: '독서 là hoạt động đọc sách.'
        },
        {
          id: 'hobby-swimming',
          promptVi: 'Bạn thích bơi.',
          contextKo: '저는 ___을 좋아해요.',
          correctKo: '수영',
          choicesKo: ['수영', '축구', '요가', '여행'],
          explanationVi: '수영 là bơi lội.'
        }
      ]
    },
    {
      id: 'a1-health',
      order: 8,
      band: 'A1',
      icon: '🩺',
      titleKo: '어디가 아파요?',
      titleVi: 'Bạn đau ở đâu?',
      canDoVi: 'Nói bộ phận cơ thể bị đau bằng “N이/가 아파요”.',
      wordRefs: ['머리', '눈', '목', '어깨', '손', '배'],
      grammar: [
        {
          id: 'body-subject-hurts',
          form: 'N이/가 아파요',
          meaningVi: 'Dùng 이/가 để đánh dấu bộ phận đang đau.',
          examples: [
            { ko: '머리가 아파요.', vi: 'Tôi đau đầu.' },
            { ko: '목이 아파요.', vi: 'Tôi đau họng/cổ.' }
          ]
        }
      ],
      dialogue: [
        { speaker: 'Ginger', ko: '어디가 아파요?', vi: 'Bạn đau ở đâu?' },
        { speaker: 'Learner', ko: '머리가 아파요.', vi: 'Tôi đau đầu.' }
      ],
      missions: [
        {
          id: 'health-head',
          promptVi: 'Bạn bị đau đầu.',
          contextKo: '___가 아파요.',
          correctKo: '머리',
          choicesKo: ['손', '머리', '목', '배'],
          explanationVi: '머리 kết thúc bằng nguyên âm nên dùng 가: 머리가 아파요.'
        },
        {
          id: 'health-throat',
          promptVi: 'Bạn bị đau họng.',
          contextKo: '___이 아파요.',
          correctKo: '목',
          choicesKo: ['눈', '어깨', '목', '머리'],
          explanationVi: '목 kết thúc bằng phụ âm nên dùng 이: 목이 아파요.'
        },
        {
          id: 'health-stomach',
          promptVi: 'Bạn bị đau bụng.',
          contextKo: '___가 아파요.',
          correctKo: '배',
          choicesKo: ['배', '손', '눈', '어깨'],
          explanationVi: '배 có thể chỉ bụng; 배가 아파요 là “Tôi đau bụng”.'
        }
      ]
    },
    {
      id: 'a1-school-work',
      order: 9,
      band: 'A1',
      icon: '🎓',
      titleKo: '학교와 직장',
      titleVi: 'Trường học và công việc',
      canDoVi: 'Nói nơi diễn ra hoạt động bằng “N에서 V” và gọi tên việc học/công việc.',
      wordRefs: ['교실', '도서관', '수학', '업무', '프로젝트', '회의'],
      grammar: [
        {
          id: 'activity-location-eseo',
          form: '장소 + 에서 V',
          meaningVi: 'Trợ từ 에서 đánh dấu nơi một hành động diễn ra.',
          examples: [
            { ko: '교실에서 공부해요.', vi: 'Tôi học trong lớp.' },
            { ko: '회사에서 회의해요.', vi: 'Tôi họp ở công ty.' }
          ]
        }
      ],
      dialogue: [
        { speaker: 'Ginger', ko: '어디에서 공부해요?', vi: 'Bạn học ở đâu?' },
        { speaker: 'Learner', ko: '교실에서 공부해요.', vi: 'Tôi học trong lớp.' }
      ],
      missions: [
        {
          id: 'school-classroom',
          promptVi: 'Bạn học trong lớp học.',
          contextKo: '___에서 공부해요.',
          correctKo: '교실',
          choicesKo: ['도서관', '교실', '회의', '프로젝트'],
          explanationVi: '교실에서 = ở trong lớp học.'
        },
        {
          id: 'school-math',
          promptVi: 'Chọn môn toán.',
          contextKo: '저는 ___을 공부해요.',
          correctKo: '수학',
          choicesKo: ['회의', '업무', '수학', '교실'],
          explanationVi: '수학 là toán học.'
        },
        {
          id: 'work-meeting',
          promptVi: 'Bạn có một cuộc họp.',
          contextKo: '오늘 ___가 있어요.',
          correctKo: '회의',
          choicesKo: ['프로젝트', '수학', '도서관', '회의'],
          explanationVi: '회의가 있어요 nghĩa là “Có một cuộc họp”.'
        }
      ]
    },
    {
      id: 'a1-travel',
      order: 10,
      band: 'A1',
      icon: '✈️',
      titleKo: '한국 여행',
      titleVi: 'Du lịch Hàn Quốc',
      canDoVi: 'Nói về giấy tờ, hành lý và đặt chỗ trong một chuyến đi.',
      wordRefs: ['여권', '항공권', '캐리어', '지도', '호텔', '예약'],
      grammar: [
        {
          id: 'completed-plan',
          form: 'N을/를 준비했어요 · 예약했어요',
          meaningVi: 'Dạng -았/었어요 diễn tả hành động đã hoàn thành trong quá khứ.',
          examples: [
            { ko: '여권을 준비했어요.', vi: 'Tôi đã chuẩn bị hộ chiếu.' },
            { ko: '호텔을 예약했어요.', vi: 'Tôi đã đặt khách sạn.' }
          ]
        }
      ],
      dialogue: [
        { speaker: 'Ginger', ko: '여행 준비를 다 했어요?', vi: 'Bạn chuẩn bị xong chuyến đi chưa?' },
        { speaker: 'Learner', ko: '네, 호텔을 예약했어요.', vi: 'Rồi, tôi đã đặt khách sạn.' }
      ],
      missions: [
        {
          id: 'travel-passport',
          promptVi: 'Bạn đã chuẩn bị hộ chiếu.',
          contextKo: '___을 준비했어요.',
          correctKo: '여권',
          choicesKo: ['지도', '호텔', '여권', '캐리어'],
          explanationVi: '여권 là hộ chiếu.'
        },
        {
          id: 'travel-hotel',
          promptVi: 'Bạn đã đặt khách sạn.',
          contextKo: '___을 예약했어요.',
          correctKo: '호텔',
          choicesKo: ['항공권', '호텔', '지도', '여권'],
          explanationVi: '호텔을 예약했어요 nghĩa là “Tôi đã đặt khách sạn”.'
        },
        {
          id: 'travel-ticket',
          promptVi: 'Bạn đã mua vé máy bay.',
          contextKo: '___을 샀어요.',
          correctKo: '항공권',
          choicesKo: ['예약', '캐리어', '항공권', '지도'],
          explanationVi: '항공권 là vé máy bay.'
        }
      ]
    }
  ];

  function getChapter(id) {
    return chapters.find(chapter => chapter.id === id) || null;
  }

  return {
    version: 1,
    locale: 'vi-VN',
    targetLanguage: 'ko-KR',
    qa: {
      status: QA_STATUS,
      linguisticReview: 'pending',
      audioReview: 'pending',
      audioPolicy: 'browser-speech-synthesis-fallback',
      noteVi: 'Nội dung do dự án biên soạn và cần được giáo viên hoặc người bản ngữ duyệt trước khi gắn nhãn phát hành giáo dục chính thức.'
    },
    chapters,
    getChapter
  };
});
