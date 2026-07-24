const fs = require('fs');
const path = require('path');

// 1. Load levels.json
const levelsPath = path.join(__dirname, '../levels.json');
const levelsData = JSON.parse(fs.readFileSync(levelsPath, 'utf8'));

// RR Unicode Hangul decomposition helpers
const RR_CHOSEONG  = ['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h'];
const RR_JUNGSEONG = ['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','weo','we','wi','yu','eu','ui','i'];
const RR_JONGSEONG = ['','k','k','ks','n','nj','nh','t','l','lg','lm','lb','ls','lt','lp','lh','m','p','bs','t','t','ng','t','t','k','t','p','t'];

function decomposeHangulWord(str) {
  if (!str) return [];
  const syllables = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const s = code - 0xac00;
      const c = Math.floor(s / 588);
      const j = Math.floor((s % 588) / 28);
      const z = s % 28;
      syllables.push({
        char: str[i],
        initial: RR_CHOSEONG[c],
        medial: RR_JUNGSEONG[j],
        final: RR_JONGSEONG[z],
        hasBatchim: z > 0,
        rom: RR_CHOSEONG[c] + RR_JUNGSEONG[j] + RR_JONGSEONG[z]
      });
    }
  }
  return syllables;
}

function getHangulRomanization(str) {
  if (!str) return '';
  const parts = [];
  let currentHangul = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const s = code - 0xac00;
      const c = Math.floor(s / 588);
      const j = Math.floor((s % 588) / 28);
      const z = s % 28;
      currentHangul.push(RR_CHOSEONG[c] + RR_JUNGSEONG[j] + RR_JONGSEONG[z]);
    } else {
      if (currentHangul.length > 0) {
        parts.push(currentHangul.join('-'));
        currentHangul = [];
      }
      if (str[i] !== ' ' || parts.length > 0) parts.push(str[i]);
    }
  }
  if (currentHangul.length > 0) parts.push(currentHangul.join('-'));
  return parts.join('').trim();
}

function getParticles(koWord) {
  const syls = decomposeHangulWord(koWord);
  const lastSyl = syls[syls.length - 1];
  const hasBatchim = lastSyl ? lastSyl.hasBatchim : false;
  return {
    subj: hasBatchim ? '이' : '가',
    top: hasBatchim ? '은' : '는',
    obj: hasBatchim ? '을' : '를'
  };
}

// Extensive Hanja lookup map for Sino-Korean words (Explicit Hán-Hàn origin tags)
const HANJA_MAP = {
  "아버지": "고유어 (Native Korean - 친부/존칭 어휘)",
  "어머니": "고유어 (Native Korean - 모친/존칭 어휘)",
  "형": "Gốc từ Hán-Hàn (한자어 - 兄 형 형)",
  "누나": "고유어 (Native Korean)",
  "오빠": "고유어 (Native Korean)",
  "언니": "고유어 (Native Korean)",
  "남동생": "Gốc từ Hán-Hàn (한자어) + 고유어 (男 사내 남 + 동생)",
  "여동생": "Gốc từ Hán-Hàn (한자어) + 고유어 (女 계집 녀 + 동생)",
  "할아버지": "고유어 (Native Korean - 할아버지)",
  "할머니": "고유어 (Native Korean - 할머니)",
  "부모": "Gốc từ Hán-Hàn (한자어 - 父母 = 父 아비 부 + 母 어미 모)",
  "자녀": "Gốc từ Hán-Hàn (한자어 - 子女 = 子 아들 자 + 女 딸 녀)",
  "친척": "Gốc từ Hán-Hàn (한자어 - 親戚 = 親 친할 친 + 戚 겨레 척)",
  "삼촌": "Gốc từ Hán-Hàn (한자어 - 三寸 = 三 석 삼 + 寸 마디 촌)",
  "이모": "Gốc từ Hán-Hàn (한자어 - 姨母 = 姨 이모 이 + 母 어미 모)",
  "고모": "Gốc từ Hán-Hàn (한자어 - 姑母 = 姑 시어미 고 + 母 어미 모)",
  "손자": "Gốc từ Hán-Hàn (한자어 - 孫子 = 孫 손자 손 + 子 아들 자)",
  "손녀": "Gốc từ Hán-Hàn (한자어 - 孫女 = 孫 손자 손 + 女 딸 녀)",
  "학교": "Gốc từ Hán-Hàn (한자어 - 學校 = 學 배울 학 + 校 학교 교)",
  "학생": "Gốc từ Hán-Hàn (한자어 - 學生 = 學 배울 학 + 生 날 생)",
  "선생님": "Gốc từ Hán-Hàn (한자어 - 先生님 = 先 먼저 선 + 生 날 생)",
  "병원": "Gốc từ Hán-Hàn (한자어 - 醫院 = 醫 의원 의 + 院 집 원)",
  "의사": "Gốc từ Hán-Hàn (한자어 - 醫師 = 醫 의원 의 + 師 스승 사)",
  "약국": "Gốc từ Hán-Hàn (한자어 - 藥局 = 藥 약 약 + 局 판 국)",
  "은행": "Gốc từ Hán-Hàn (한자어 - 銀行 = 銀 은 은 + 行 다닐 행)",
  "우체국": "Gốc từ Hán-Hàn (한자어 - 郵遞局 = 郵 우편 우 + 遞 갈아탈 체 + 局 판 국)",
  "경찰서": "Gốc từ Hán-Hàn (한자어 - 警察署 = 警 경계할 경 + 察 살필 찰 + 署 관청 서)",
  "소방서": "Gốc từ Hán-Hàn (한자어 - 消防署 = 消 사라질 소 + 防 막을 방 + 署 관청 서)",
  "백화점": "Gốc từ Hán-Hàn (한자어 - 百貨店 = 百 일백 백 + 貨 재물 화 + 店 가게 점)",
  "도서관": "Gốc từ Hán-Hàn (한자어 - 圖書館 = 圖 그림 도 + 書 글 서 + 館 집 관)",
  "박물관": "Gốc từ Hán-Hàn (한자어 - 博物館 = 博 넓을 박 + 物 물건 물 + 館 집 관)",
  "미술관": "Gốc từ Hán-Hàn (한자어 - 美術館 = 美 아름다울 미 + 術 재주 술 + 館 집 관)",
  "공원": "Gốc từ Hán-Hàn (한자어 - 公園 = 公 공평할 공 + 園 동산 원)",
  "영화관": "Gốc từ Hán-Hàn (한자어 - 映畫館 = 映 비칠 영 + 畫 그림 화 + 館 집 관)",
  "미용실": "Gốc từ Hán-Hàn (한자어 - 美容室 = 美 아름다울 미 + 容 얼굴 용 + 室 집 실)",
  "지하철역": "Gốc từ Hán-Hàn (한자어 - 地下鐵驛 = 地 땅 지 + 下 아래 하 + 鐵 쇠 철 + 驛 역 역)",
  "지하철": "Gốc từ Hán-Hàn (한자어 - 地下鐵 = 地 땅 지 + 下 아래 하 + 鐵 쇠 철)",
  "공항": "Gốc từ Hán-Hàn (한자어 - 空港 = 空 하늘 공 + 港 항구 항)",
  "항구": "Gốc từ Hán-Hàn (한자어 - 港口 = 港 항구 항 + 口 입 구)",
  "주차장": "Gốc từ Hán-Hàn (한자어 - 駐車場 = 駐 살 주 + 車 수레 차 + 場 마당 장)",
  "식당": "Gốc từ Hán-Hàn (한자어 - 食堂 = 食 먹을 식 + 堂 집 당)",
  "음료수": "Gốc từ Hán-Hàn (한자어 - 飲料水 = 飲 마실 음 + 料 헤아릴 료 + 水 물 수)",
  "음식": "Gốc từ Hán-Hàn (한자어 - 飲食 = 飲 마실 음 + 食 먹을 식)",
  "차": "Gốc từ Hán-Hàn (한자어 - 茶 = 茶 차 다)",
  "만두": "Gốc từ Hán-Hàn (한자어 - 饅頭 = 饅 만두 만 + 頭 머리 두)",
  "과일": "Gốc từ Hán-Hàn (한자어 - 果實 = 果 열매 과 + 實 열매 실)",
  "시간": "Gốc từ Hán-Hàn (한자어 - 時間 = 時 때 시 + 間 사이 간)",
  "일자": "Gốc từ Hán-Hàn (한자어 - 日字 = 日 날 일 + 字 글자 자)",
  "주말": "Gốc từ Hán-Hàn (한자어 - 週末 = 週 돌 주 + 末 끝 말)",
  "평일": "Gốc từ Hán-Hàn (한자어 - 平日 = 平 평평할 평 + 日 날 일)",
  "정오": "Gốc từ Hán-Hàn (한자어 - 正午 = 正 바를 정 + 午 낮 오)",
  "자정": "Gốc từ Hán-Hàn (한자어 - 子正 = 子 첫째지 자 + 正 바를 정)",
  "계절": "Gốc từ Hán-Hàn (한자어 - 季節 = 季 계절 계 + 節 마디 절)",
  "기온": "Gốc từ Hán-Hàn (한자어 - 氣溫 = 氣 기운 기 + 溫 따뜻할 온)",
  "습도": "Gốc từ Hán-Hàn (한자어 - 濕度 = 濕 축축할 습 + 度 법도 도)",
  "온도": "Gốc từ Hán-Hàn (한자어 - 溫度 = 溫 따뜻할 온 + 度 법도 도)",
  "운동": "Gốc từ Hán-Hàn (한자어 - 運動 = 運 옮길 운 + 動 움직일 동)",
  "문화": "Gốc từ Hán-Hàn (한자어 - 文化 = 文 글 문 + 化 될 화)",
  "여가": "Gốc từ Hán-Hàn (한자어 - 餘暇 = 餘 남을 여 + 暇 겨레 가)",
  "건강": "Gốc từ Hán-Hàn (한자어 - 健康 = 健 건강할 건 + 康 편안할 강)",
  "증상": "Gốc từ Hán-Hàn (한자어 - 症狀 = 症 증세 증 + 狀 형상 상)",
  "과목": "Gốc từ Hán-Hàn (한자어 - 科目 = 科 과목 과 + 目 눈 목)",
  "시험": "Gốc từ Hán-Hàn (한자어 - 試驗 = 試 시험할 시 + 驗 시험 험)",
  "직업": "Gốc từ Hán-Hàn (한자어 - 職業 = 職 직분 직 + 業 업 업)",
  "업무": "Gốc từ Hán-Hàn (한자어 - 業務 = 業 업 업 + 務 힘쓸 무)",
  "과제": "Gốc từ Hán-Hàn (한자어 - 課題 = 課 매길 과 + 題 제목 제)",
  "주거": "Gốc từ Hán-Hàn (한자어 - 住居 = 住 살 주 + 居 살 거)",
  "가구": "Gốc từ Hán-Hàn (한자어 - 家具 = 家 집 가 + 具 갖출 구)",
  "환경": "Gốc từ Hán-Hàn (한자어 - 環境 = 環 고리 환 + 境 지경 경)",
  "정보": "Gốc từ Hán-Hàn (한자어 - 情報 = 情 뜻 정 + 報 알릴 보)",
  "통신": "Gốc từ Hán-Hàn (한자어 - 通信 = 通 통할 통 + 信 믿을 신)",
  "방송": "Gốc từ Hán-Hàn (한자어 - 放送 = 放 놓을 방 + 送 보낼 송)",
  "신문": "Gốc từ Hán-Hàn (한자어 - 新聞 = 新 새 신 + 聞 들을 문)",
  "예절": "Gốc từ Hán-Hàn (한자어 - 禮節 = 禮 예도 예 + 節 마디 절)",
  "사회": "Gốc từ Hán-Hàn (한자어 - 社會 = 社 모임 사 + 會 모일 회)",
  "제도": "Gốc từ Hán-Hàn (한자어 - 制度 = 制 제도 제 + 度 법도 도)",
  "문제": "Gốc từ Hán-Hàn (한자어 - 問題 = 問 물을 문 + 題 제목 제)",
  "금융": "Gốc từ Hán-Hàn (한자어 - 金融 = 金 돈 금 + 融 녹을 융)",
  "경제": "Gốc từ Hán-Hàn (한자어 - 經濟 = 經 지날 경 + 濟 건널 제)",
  "소비": "Gốc từ Hán-Hàn (한자어 - 消費 = 消 사라질 소 + 費 쓸 비)",
  "시장": "Gốc từ Hán-Hàn (한자어 - 市場 = 市 저자 시 + 場 마당 장)",
  "무역": "Gốc từ Hán-Hàn (한자어 - 貿易 = 貿 무역할 무 + 易 바꿀 역)",
  "산업": "Gốc từ Hán-Hàn (한자어 - 產業 = 產 낳을 산 + 業 업 업)",
  "과학": "Gốc từ Hán-Hàn (한자어 - 科學 = 科 과목 과 + 學 배울 학)",
  "연구": "Gốc từ Hán-Hàn (한자어 - 研究 = 研 갈 연 + 究 구할 구)",
  "기술": "Gốc từ Hán-Hàn (한자어 - 技術 = 技 재주 기 + 術 재주 술)",
  "유산": "Gốc từ Hán-Hàn (한자어 - 遺産 = 遺 남길 유 + 產 재산 산)",
  "공연": "Gốc từ Hán-Hàn (한자어 - 公演 = 公 공평할 공 + 演 펼칠 연)",
  "예술": "Gốc từ Hán-Hàn (한자어 - 藝術 = 藝 재주 예 + 術 재주 술)",
  "문학": "Gốc từ Hán-Hàn (한자어 - 文學 = 文 글 문 + 學 배울 학)",
  "판단": "Gốc từ Hán-Hàn (한자어 - 判斷 = 判 판단할 판 + 斷 끊을 단)",
  "가치": "Gốc từ Hán-Hàn (한자어 - 價値 = 價 값 가 + 値 값 치)",
  "기준": "Gốc từ Hán-Hàn (한자어 - 基準 = 基 터 기 + 準 평평할 준)",
  "개념": "Gốc từ Hán-Hàn (한자어 - 概念 = 概 대개 개 + 念 생각 념)",
  "원리": "Gốc từ Hán-Hàn (한자어 - 原理 = 原 근본 원 + 理 이치 리)",
  "정치": "Gốc từ Hán-Hàn (한자어 - 政治 = 政 정사 정 + 治 다스릴 치)",
  "정부": "Gốc từ Hán-Hàn (한자어 - 政府 = 政 정사 정 + 府 관청 부)",
  "법": "Gốc từ Hán-Hàn (한자어 - 法 = 法 법 법)",
  "질서": "Gốc từ Hán-Hàn (한자어 - 秩序 = 秩 차례 질 + 序 차례 서)",
  "행정": "Gốc từ Hán-Hàn (한자어 - 行政 = 行 행할 행 + 政 정사 정)",
  "시민": "Gốc từ Hán-Hàn (한자어 - 市民 = 市 저자 시 + 民 백성 민)",
  "예약": "Gốc từ Hán-Hàn (한자어 - 豫約 = 豫 먼저 예 + 約 약속 약)",
  "주문": "Gốc từ Hán-Hàn (한자어 - 注文 = 注 대댈 주 + 文 글자 문)",
  "계산": "Gốc từ Hán-Hàn (한자어 - 計算 = 計 셈할 계 + 算 셈할 산)",
  "영수증": "Gốc từ Hán-Hàn (한자어 - 領收證 = 領 거둘 영 + 收 거둘 수 + 證 증거 증)",
  "종업원": "Gốc từ Hán-Hàn (한자어 - 從業員 = 從 따를 종 + 業 업무 업 + 員 인원 원)",
  "가격": "Gốc từ Hán-Hàn (한자어 - 價格 = 價 값 가 + 格 격식 격)",
  "할인": "Gốc từ Hán-Hàn (한자어 - 割引 = 割 쪼갤 할 + 引 끌 인)",
  "결제": "Gốc từ Hán-Hàn (한자어 - 決済 = 決 결단할 결 + 済 건널 제)",
  "현금": "Gốc từ Hán-Hàn (한자어 - 現金 = 現 나타날 현 + 金 돈 금)",
  "신용카드": "Gốc từ Hán-Hàn (한자어) + 외래어 (信用 + Card)",
  "계좌이체": "Gốc từ Hán-Hàn (한자어 - 口座移替 = 口 입 구 + 座 자리 좌 + 移 옮길 이 + 替 바꿀 체)",
  "환불": "Gốc từ Hán-Hàn (한자어 - 바꿀 환 還 + 돈 불 拂)",
  "구매": "Gốc từ Hán-Hàn (한자어 - 購買 = 購 살 구 + 買 살 매)",
  "판매": "Gốc từ Hán-Hàn (한자어 - 販賣 = 販 팔 판 + 賣 팔 매)",
  "절약": "Gốc từ Hán-Hàn (한자어 - 節約 = 節 아낄 절 + 約 약속 약)",
  "낭비": "Gốc từ Hán-Hàn (한자어 - 浪費 = 浪 물결 랑 + 費 쓸 비)",
  "무료": "Gốc từ Hán-Hàn (한자어 - 免費 = 無 없을 무 + 料 헤아릴 료)",
  "동쪽": "Gốc từ Hán-Hàn (한자어) + 고유어 (東 동녘 동 + 쪽)",
  "서쪽": "Gốc từ Hán-Hàn (한자어) + 고유어 (西 서녘 서 + 쪽)",
  "남쪽": "Gốc từ Hán-Hàn (한자어) + 고유어 (南 남녘 남 + 쪽)",
  "북쪽": "Gốc từ Hán-Hàn (한자어) + 고유어 (北 북녘 북 + 쪽)",
  "중앙": "Gốc từ Hán-Hàn (한자어 - 中央 = 中 가운데 중 + 央 가운데 앙)",
  "수단": "Gốc từ Hán-Hàn (한자어 - 手段 = 手 손 수 + 段 단계 단)",
  "요금": "Gốc từ Hán-Hàn (한자어 - 料金 = 料 헤아릴 료 + 金 돈 금)",
  "노선": "Gốc từ Hán-Hàn (한자어 - 路線 = 路 길 로 + 線 줄 선)",
  "환승": "Gốc từ Hán-Hàn (한자어 - 換乘 = 換 바꿀 환 + 乘 탈 승)",
  "하차": "Gốc từ Hán-Hàn (한자어 - 下車 = 下 아래 하 + 車 수레 차)",
  "승차": "Gốc từ Hán-Hàn (한자어 - 乘車 = 乘 탈 승 + 車 수레 차)",
  "경유": "Gốc từ Hán-Hàn (한자어 - 經由 = 經 지날 경 + 由 까닭 유)",
  "출구": "Gốc từ Hán-Hàn (한자어 - 出口 = 出 날 출 + 口 입 구)"
};

// Loanwords list (English/Foreign origin)
const LOANWORDS = new Set([
  "커피", "빵", "마트", "버스", "택시", "셔츠", "코트", "점퍼", "스마트폰", "인터넷",
  "SNS", "PD", "뉴스", "드라마", "라디오", "텔레비전", "컴퓨터", "이메일", "블로그",
  "스포츠", "테니스", "골프", "피자", "햄버거", "아이스크림", "초콜릿", "케이크",
  "샌드위치", "콜라", "사이다", "맥주", "위스키", "뷔페", "메뉴", "호텔", "리조트",
  "모텔", "패션", "스타일", "디자인", "팀", "게이머", "게임", "데이터", "시스템",
  "네트워크", "사이트", "메시지", "세일", "메뉴판", "카메라", "샤워", "샴푸", "비누",
  "티셔츠", "청바지", "슬리퍼", "넥타이", "와이셔츠", "원피스", "스커트", "재킷",
  "패딩", "핸드폰", "노트북", "모니터", "키보드", "마우스", "마이크", "헤드폰",
  "이어폰", "스피커", "택배", "서비스", "이벤트", "캠페인", "아이디어", "스트레스",
  "다이어트", "비키니", "선글라스", "립스틱", "파운데이션", "마스크", "시즌", "매치",
  "골", "패스", "슛", "코치", "매니저", "프로", "팬", "콘서트", "밴드", "아티스트"
]);

function getWordOrigin(koWord, enWord, category) {
  let origin = '';
  if (HANJA_MAP[koWord]) {
    origin = HANJA_MAP[koWord];
  } else if (LOANWORDS.has(koWord)) {
    origin = `외래어 (Loanword from English '${enWord}')`;
  } else if (koWord.endsWith('하다') && koWord.length >= 4) {
    origin = "Gốc từ Hán-Hàn (한자어) - Động từ (Sino-Korean action verb ending in 하다)";
  } else if (koWord.endsWith('되다') || koWord.endsWith('시키다')) {
    origin = "Gốc từ Hán-Hàn (한자어) - Động từ (Sino-Korean passive/causative verb)";
  } else if (koWord.endsWith('적')) {
    origin = "Gốc từ Hán-Hàn (한자어) - Tính từ (Sino-Korean relative adjective ending in 的)";
  } else if (koWord.endsWith('성') || koWord.endsWith('력') || koWord.endsWith('감')) {
    origin = "Gốc từ Hán-Hàn (한자어) - Danh từ (Sino-Korean noun root)";
  } else if (enWord.includes('bus') || enWord.includes('coffee') || enWord.includes('hotel') || enWord.includes('taxi') || enWord.includes('menu') || enWord.includes('radio') || enWord.includes('computer') || enWord.includes('television')) {
    origin = `외래어 (Loanword from English '${enWord}')`;
  } else {
    origin = "고유어 (Native Korean word)";
  }

  // Fail-safe to ensure all Sino-Korean origin tags explicitly use Hán-Hàn
  if (origin.includes('한자어') && !origin.includes('Hán-Hàn')) {
    origin = origin.replace(/한자어/g, 'Gốc từ Hán-Hàn (한자어)');
  }
  return origin;
}

function generateExampleSentence(koWord, enWord, category) {
  const cleanEn = enWord.replace(/^to\s+/, '').replace(/^be\s+/, '');
  const p = getParticles(koWord);
  
  if (category.includes('가족') || category.includes('사람')) {
    return {
      ko: `${koWord}${p.subj} 반갑게 인사하며 다가옵니다.`,
      en: `${cleanEn.charAt(0).toUpperCase() + cleanEn.slice(1)} comes over with a warm greeting.`
    };
  }
  if (category.includes('음식') || category.includes('식당') || category.includes('맛')) {
    return {
      ko: `맛있는 ${koWord}${p.obj} 식당에서 즐겁게 먹습니다.`,
      en: `I happily eat delicious ${cleanEn} at the restaurant.`
    };
  }
  if (category.includes('건물') || category.includes('장소') || category.includes('교통')) {
    return {
      ko: `사람들이 ${koWord}에 일찍 도착해서 기다립니다.`,
      en: `People arrive early at ${cleanEn} and wait.`
    };
  }
  if (category.includes('시간') || category.includes('날씨')) {
    return {
      ko: `${koWord}${p.top} 오늘 일정에서 중요한 부분입니다.`,
      en: `${cleanEn.charAt(0).toUpperCase() + cleanEn.slice(1)} is an important part of today's schedule.`
    };
  }
  if (koWord.endsWith('다')) {
    const stem = koWord.slice(0, -1);
    return {
      ko: `매일 한국어로 ${stem}며 연습합니다.`,
      en: `I practice every day while ${cleanEn} in Korean.`
    };
  }

  return {
    ko: `일상 생활에서 ${koWord}${p.top} 아주 자주 쓰이는 표현입니다.`,
    en: `${cleanEn.charAt(0).toUpperCase() + cleanEn.slice(1)} is a very frequently used expression in daily life.`
  };
}

function generateContext(koWord, enWord, category) {
  let catText = category || 'Tiếng Hàn thông dụng';
  if (catText.includes('한자어') && !catText.includes('Hán-Hàn')) {
    catText = catText.replace(/한자어/g, 'Hán-Hàn (한자어)');
  }
  return `Văn cảnh: Từ vựng "${koWord}" (${enWord}) thuộc chủ đề ${catText}. Xuất hiện phổ biến trong giao tiếp hàng ngày, phim ảnh và đời sống tại Hàn Quốc.`;
}

function generateMnemonic(koWord, enWord, syllables) {
  const cleanEn = enWord.replace(/^to\s+/, '').replace(/^be\s+/, '');
  if (!syllables || syllables.length === 0) {
    return `Hãy hình dung hình ảnh sinh động đại diện cho "${cleanEn}" và phát âm từ viết tắt [${koWord}] để ghi nhớ sâu vào trí nhớ!`;
  }
  const rom = syllables.map(s => s.rom).join('-');
  const chars = syllables.map(s => s.char).join(' · ');
  return `Hãy hình dung hình ảnh sinh động đại diện cho "${cleanEn}" và phát âm nhịp nhàng [${rom}] (${chars}) để ghi nhớ sâu vào trí nhớ!`;
}

function generateShortSentence(koWord, enWord, rom) {
  const p = getParticles(koWord);
  const romClean = rom || koWord;
  if (koWord.endsWith('다')) {
    return `${koWord}는 모습을 봅니다 [${romClean}neun moseubeul bomnida]`;
  }
  return `${koWord}${p.obj} 항상 사용합니다 [${romClean} hangsang sayonghamnida]`;
}

// Generate VOCAB_FACTS
console.log('Generating VOCAB_FACTS dictionary...');
const vocabFacts = {};
let totalWordsCount = 0;

levelsData.forEach(lvl => {
  if (lvl.words) {
    lvl.words.forEach(w => {
      totalWordsCount++;
      const key = (w.en || '').toLowerCase().trim();
      if (!key) return;

      const ko = w.ko || '';
      const en = w.en || '';
      const cat = w.category || '';

      const syls = decomposeHangulWord(ko);
      const count = syls.length;
      const rom = getHangulRomanization(ko);
      const romBrackets = syls.length > 0 ? syls.map(s => s.rom).join(' · ') : rom;

      const origin = getWordOrigin(ko, en, cat);
      const example = generateExampleSentence(ko, en, cat);
      const context = generateContext(ko, en, cat);
      const mnemonic = generateMnemonic(ko, en, syls);
      const shortSent = generateShortSentence(ko, en, rom);

      // Build rich vi field
      let vi = `${origin}. 예문: ${example.ko} (${example.en}) ${context}`;
      if (vi.includes('한자어') && !vi.includes('Hán-Hàn')) {
        vi = vi.replace(/한자어/g, 'Hán-Hàn (한자어)');
      }

      // Build rich ko field
      const sylHeader = count > 0 
        ? `${count} syllable${count > 1 ? 's' : ''}: ${rom} [${romBrackets}].` 
        : `[${rom || ko}].`;
      
      const koField = `${sylHeader} 🧠 ${mnemonic} ${shortSent}`;

      vocabFacts[key] = { vi, ko: koField };
    });
  }
});

const keysCount = Object.keys(vocabFacts).length;
console.log(`Total words processed: ${totalWordsCount}`);
console.log(`Unique lower-case 'en' keys generated: ${keysCount}`);

if (keysCount < 1400) {
  console.error(`ERROR: Coverage threshold failed! Got ${keysCount} keys, expected >= 1400.`);
  process.exit(1);
}

// Audit Assertions for Findings 2 & 3
let rawHanjaViolations = 0;
let emptyPlaceholderViolations = 0;

Object.keys(vocabFacts).forEach(k => {
  const item = vocabFacts[k];
  if (item.vi.includes('한자어') && !item.vi.includes('Hán-Hàn')) {
    console.error(`VIOLATION (Finding 2): Raw 한자어 without Hán-Hàn in entry '${k}': ${item.vi}`);
    rawHanjaViolations++;
  }
  if (item.ko.includes('[]') || item.ko.includes('()') || item.vi.includes('[]') || item.vi.includes('()')) {
    console.error(`VIOLATION (Finding 3): Empty placeholder [] or () in entry '${k}': ${item.ko}`);
    emptyPlaceholderViolations++;
  }
});

if (rawHanjaViolations > 0 || emptyPlaceholderViolations > 0) {
  console.error(`AUDIT FAILURE: ${rawHanjaViolations} raw 한자어 violations, ${emptyPlaceholderViolations} empty placeholder violations.`);
  process.exit(1);
}

// Prepare replacement code for game.js and assets/game.js
console.log('Building JS string representation...');

let vocabFactsJs = 'const VOCAB_FACTS = {\n';
Object.keys(vocabFacts).forEach((k, idx) => {
  const item = vocabFacts[k];
  const escapedVi = item.vi.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const escapedKo = item.ko.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  vocabFactsJs += `  '${k.replace(/'/g, "\\'")}': {vi:'${escapedVi}', ko:'${escapedKo}'}`;
  if (idx < keysCount - 1) vocabFactsJs += ',\n';
  else vocabFactsJs += '\n';
});
vocabFactsJs += '};\n\n';

const getFunFactJs = `// Generate a fun fact for any word (smart fallback if not in database)
function getFunFact(word) {
  const RR_CHOSEONG  = ['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h'];
  const RR_JUNGSEONG = ['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','weo','we','wi','yu','eu','ui','i'];
  const RR_JONGSEONG = ['','k','k','ks','n','nj','nh','t','l','lg','lm','lb','ls','lt','lp','lh','m','p','bs','t','t','ng','t','t','k','t','p','t'];

  function decomposeHangulWord(str) {
    if (!str) return [];
    const syllables = [];
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code >= 0xac00 && code <= 0xd7a3) {
        const s = code - 0xac00;
        const c = Math.floor(s / 588);
        const j = Math.floor((s % 588) / 28);
        const z = s % 28;
        syllables.push({
          char: str[i],
          initial: RR_CHOSEONG[c],
          medial: RR_JUNGSEONG[j],
          final: RR_JONGSEONG[z],
          hasBatchim: z > 0,
          rom: RR_CHOSEONG[c] + RR_JUNGSEONG[j] + RR_JONGSEONG[z]
        });
      }
    }
    return syllables;
  }

  function getHangulRomanization(str) {
    if (!str) return '';
    const parts = [];
    let currentHangul = [];
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code >= 0xac00 && code <= 0xd7a3) {
        const s = code - 0xac00;
        const c = Math.floor(s / 588);
        const j = Math.floor((s % 588) / 28);
        const z = s % 28;
        currentHangul.push(RR_CHOSEONG[c] + RR_JUNGSEONG[j] + RR_JONGSEONG[z]);
      } else {
        if (currentHangul.length > 0) {
          parts.push(currentHangul.join('-'));
          currentHangul = [];
        }
        if (str[i] !== ' ' || parts.length > 0) parts.push(str[i]);
      }
    }
    if (currentHangul.length > 0) parts.push(currentHangul.join('-'));
    return parts.join('').trim();
  }

  if (!word) word = {};
  const key = (word.en || '').toLowerCase();
  if (VOCAB_FACTS[key]) return VOCAB_FACTS[key];

  const ko = word.ko || '';
  const en = word.en || '';
  const cat = (word.category || '').toLowerCase();
  const syllables = decomposeHangulWord(ko);
  const count = syllables.length;
  const rom = getHangulRomanization(ko);

  let categoryHint = '✨ Từ vựng Tiếng Hàn thông dụng trong cuộc sống và phim ảnh — nghe và nhận diện là bạn sẽ ghi nhớ ngay!';
  if (cat.includes('food') || cat.includes('음식') || cat.includes('식당') || cat.includes('맛')) {
    categoryHint = '🍽️ Từ vựng thuộc chủ đề Ẩm thực & Đồ uống. Trong văn hóa Hàn Quốc, ẩm thực chú trọng sự cân bằng hương vị và sự chia sẻ trên bàn ăn.';
  } else if (cat.includes('animal') || cat.includes('동물')) {
    categoryHint = '🐾 Từ vựng về Động vật. Tại Hàn Quốc, hình ảnh động vật xuất hiện phổ biến trong ca dao, truyện cổ tích và các quán cafe thú cưng!';
  } else if (cat.includes('nature') || cat.includes('자연') || cat.includes('계절') || cat.includes('날씨')) {
    categoryHint = '🌿 Từ vựng về Thiên nhiên & Môi trường. Bốn mùa rõ rệt của Hàn Quốc khiến phong cảnh thay đổi đặc sắc theo từng mùa.';
  } else if (cat.includes('body') || cat.includes('신체') || cat.includes('건강') || cat.includes('증상')) {
    categoryHint = '💪 Từ vựng về Thân thể & Sức khỏe. Trong tiếng Hàn, nhiều từ chỉ bộ phận cơ thể còn mang ý nghĩa tượng trưng cho cảm xúc và thái độ.';
  } else if (cat.includes('place') || cat.includes('장소') || cat.includes('건물') || cat.includes('교통') || cat.includes('숙소')) {
    categoryHint = '📍 Từ vựng chỉ Địa điểm & Giao thông. Hữu ích khi đi lại, tìm đường hoặc khám phá các địa danh tại Hàn Quốc.';
  } else if (cat.includes('가족') || cat.includes('사람') || cat.includes('관계')) {
    categoryHint = '👨‍👩‍👧 Từ vựng về Con người & Xã hội. Văn hóa Hàn Quốc rất coi trọng danh xưng và xưng hô đúng mực theo mối quan hệ.';
  } else if (cat.includes('동작') || cat.includes('행동') || cat.includes('업무')) {
    categoryHint = '⚡ Từ vựng chỉ Hành động & Hoạt động. Thường xuất hiện ở cuối câu trong cấu trúc ngữ pháp tiếng Hàn (Chủ ngữ - Vị ngữ).';
  }

  const viText = \`\${categoryHint} ("\${en}" / Phiên âm: \${rom})\`;

  let sylDesc = '';
  if (count === 1) {
    sylDesc = '1 âm tiết — dứt khoát, bật âm gọn gàng trong 1 nhịp thở!';
  } else if (count === 2) {
    sylDesc = '2 âm tiết — vỗ tay 2 nhịp đều đặn khi đọc out loud!';
  } else if (count === 3) {
    sylDesc = '3 âm tiết — ngắt thành 3 nhịp nhịp nhàng để chinh phục!';
  } else {
    sylDesc = \`\${count || 'Nhiều'} âm tiết — tách nhỏ từng cụm từ để luyện tập hiệu quả!\`;
  }

  const lastSyl = syllables[count - 1];
  const batchimNote = lastSyl
    ? (lastSyl.hasBatchim
        ? \`Âm tiết cuối [\${lastSyl.char}] có 받침 (-\${lastSyl.final}), kết thúc dứt khoát.\`
        : \`Âm tiết cuối [\${lastSyl.char}] là âm mở (không 받침), ngân vang tự nhiên.\`)
    : '';

  const koText = \`🧠 [\${rom}] \${sylDesc} \${batchimNote}\`.trim();

  return { vi: viText, ko: koText };
}
`;

function updateGameFile(targetPath) {
  const content = fs.readFileSync(targetPath, 'utf8');
  const startIdx = content.indexOf('const VOCAB_FACTS = {');
  const endIdx = content.indexOf('function showVocabFunFact(word) {');

  if (startIdx === -1 || endIdx === -1) {
    console.error(`ERROR: Could not locate VOCAB_FACTS boundary in ${targetPath}`);
    process.exit(1);
  }

  const updatedContent = content.substring(0, startIdx) + vocabFactsJs + getFunFactJs + '\n' + content.substring(endIdx);
  fs.writeFileSync(targetPath, updatedContent, 'utf8');
  console.log(`Successfully updated ${targetPath}`);
}

updateGameFile(path.join(__dirname, '../game.js'));
updateGameFile(path.join(__dirname, '../assets/game.js'));

console.log('Build script completed successfully!');
