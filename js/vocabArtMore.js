// Extra unit 10 leftovers + unit 11/13 still-icons generated in the farm 16-bit set.
const VOCAB_ART_MORE_ROWS = [
  { ko: '짜장면', slug: 'jjajangmyeon', folder: 'foods', nameEn: 'Jjajangmyeon', family: 'noodle' },
  { ko: '생선회', slug: 'sashimi_plate', folder: 'foods', nameEn: 'Sliced raw fish', family: 'meat' },
  { ko: '케밥', slug: 'kebab_skewer', folder: 'foods', nameEn: 'Kebab', family: 'meat' },
  { ko: '간장', slug: 'soy_sauce', folder: 'items', nameEn: 'Soy sauce', family: 'ingredient' },
  { ko: '고추장', slug: 'gochujang_jar', folder: 'items', nameEn: 'Chili paste', family: 'ingredient' },
  { ko: '식초', slug: 'vinegar_bottle', folder: 'items', nameEn: 'Vinegar', family: 'ingredient' },
  { ko: '녹차', slug: 'green_tea', folder: 'foods', nameEn: 'Green tea', family: 'drink' },
  { ko: '우유', slug: 'milk_bottle', folder: 'foods', nameEn: 'Milk', family: 'drink' },
  { ko: '약', slug: 'medicine_bottle', folder: 'items', nameEn: 'Medicine', family: 'health' },
  { ko: '감기약', slug: 'medicine_capsule', folder: 'items', nameEn: 'Cold medicine', family: 'health' },
  { ko: '안약', slug: 'eye_drops', folder: 'items', nameEn: 'Eye drops', family: 'health' },
  { ko: '연고', slug: 'ointment_tube', folder: 'items', nameEn: 'Ointment', family: 'health' },
  { ko: '인삼', slug: 'ginseng_root', folder: 'items', nameEn: 'Korean ginseng', family: 'health' },
  { ko: '병원', slug: 'clinic_building', folder: 'items', nameEn: 'Hospital / clinic', family: 'place' },
  { ko: '약국', slug: 'pharmacy_shop', folder: 'items', nameEn: 'Pharmacy', family: 'place' },
  { ko: '원룸', slug: 'studio_oneroom', folder: 'items', nameEn: 'One-room studio', family: 'place' },
  { ko: '추천', slug: 'recommend', folder: 'items', nameEn: 'A recommendation', family: 'abstract' },
  { ko: '음식값', slug: 'price_coins', folder: 'items', nameEn: 'The food bill', family: 'abstract' },
  { ko: '전화를 걸다', slug: 'make_phone_call', folder: 'items', nameEn: 'To make a phone call', family: 'action' },
  { ko: '늦다', slug: 'be_late', folder: 'items', nameEn: 'To be late', family: 'abstract' },
  { ko: '채소', slug: 'vegetable_pile', folder: 'items', nameEn: 'Vegetables', family: 'ingredient' },
  { ko: '과일', slug: 'farm_apple', folder: 'items', nameEn: 'Fruit', family: 'ingredient' },
  { ko: '의사', slug: 'doctor', folder: 'items', nameEn: 'Doctor', family: 'people' },
  { ko: "파스", slug: 'heat_patch', folder: 'items', nameEn: "Medicated heat patch", family: 'health' },
  { ko: "붙이다", slug: 'heat_patch', folder: 'items', nameEn: "Medicated heat patch", family: 'health' },
  { ko: "다리를 다치다", slug: 'bandaged_boot', folder: 'items', nameEn: "Bandaged boot", family: 'health' },
  { ko: "몸살이 나다", slug: 'bandaged_boot', folder: 'items', nameEn: "Bandaged boot", family: 'health' },
  { ko: "머리가 아프다", slug: 'ice_pack', folder: 'items', nameEn: "Ice pack", family: 'health' },
  { ko: "두통약", slug: 'ice_pack', folder: 'items', nameEn: "Ice pack", family: 'health' },
  { ko: "어지럽다", slug: 'ice_pack', folder: 'items', nameEn: "Ice pack", family: 'health' },
  { ko: "붓다", slug: 'teal_gem', folder: 'items', nameEn: "Ice pack", family: 'health' },
  { ko: "어디가 아프다", slug: 'ice_pack', folder: 'items', nameEn: "Ice pack", family: 'health' },
  { ko: "안과", slug: 'eyeglasses', folder: 'items', nameEn: "Eyeglasses", family: 'health' },
  { ko: "눈이 아프다", slug: 'eyeglasses', folder: 'items', nameEn: "Eyeglasses", family: 'health' },
  { ko: "감기에 걸리다", slug: 'tissue_box', folder: 'items', nameEn: "Tissue box", family: 'health' },
  { ko: "기침이 나다", slug: 'tissue_box', folder: 'items', nameEn: "Tissue box", family: 'health' },
  { ko: "목이 붓다", slug: 'tissue_box', folder: 'items', nameEn: "Tissue box", family: 'health' },
  { ko: "이가 아프다", slug: 'cracked_tooth', folder: 'items', nameEn: "Aching tooth", family: 'health' },
  { ko: "치과", slug: 'cracked_tooth', folder: 'items', nameEn: "Aching tooth", family: 'health' },
  { ko: "내과", slug: 'stethoscope', folder: 'items', nameEn: "Stethoscope", family: 'health' },
  { ko: "진료를 받다", slug: 'stethoscope', folder: 'items', nameEn: "Stethoscope", family: 'health' },
  { ko: "환자", slug: 'stethoscope', folder: 'items', nameEn: "Stethoscope", family: 'health' },
  { ko: "열이 나다", slug: 'thermometer', folder: 'items', nameEn: "Thermometer", family: 'health' },
  { ko: "해열제", slug: 'thermometer', folder: 'items', nameEn: "Thermometer", family: 'health' },
  { ko: "낫다", slug: 'teal_gem', folder: 'items', nameEn: "Thermometer", family: 'health' },
  { ko: "이비인후과", slug: 'human_ear', folder: 'items', nameEn: "Ear", family: 'health' },
  { ko: "설탕", slug: 'sugar_bowl', folder: 'items', nameEn: "Sugar bowl", family: 'ingredient' },
  { ko: "정형외과", slug: 'femur_bone', folder: 'items', nameEn: "Bone", family: 'health' },
  { ko: "젓다", slug: 'stir_drink', folder: 'items', nameEn: "Stirring a drink with a spoon", family: 'action' },
  { ko: "처방", slug: 'prescription_slip', folder: 'items', nameEn: "Prescription", family: 'health' },
  { ko: "주의사항", slug: 'prescription_slip', folder: 'items', nameEn: "Prescription", family: 'health' },
  { ko: "소금", slug: 'salt_shaker', folder: 'items', nameEn: "Salt shaker", family: 'ingredient' },
  { ko: "싱겁다", slug: 'chevron_badge', folder: 'items', nameEn: "Salt shaker", family: 'ingredient' },
  { ko: "입맛이 없다", slug: 'empty_plate', folder: 'items', nameEn: "Empty plate", family: 'health' },
  { ko: "소화가 안되다", slug: 'empty_plate', folder: 'items', nameEn: "Empty plate", family: 'health' },
  { ko: "속이 안 좋다", slug: 'empty_plate', folder: 'items', nameEn: "Empty plate", family: 'health' },
  { ko: "배가 아프다", slug: 'empty_plate', folder: 'items', nameEn: "Empty plate", family: 'health' },
  { ko: "배탈이 나다", slug: 'empty_plate', folder: 'items', nameEn: "Empty plate", family: 'health' },
  { ko: "토하다", slug: 'empty_plate', folder: 'items', nameEn: "Empty plate", family: 'health' },
  { ko: "소화제", slug: 'empty_plate', folder: 'items', nameEn: "Empty plate", family: 'health' },
  { ko: "손을 씻다", slug: 'soap_bar', folder: 'items', nameEn: "Bar of soap", family: 'health' },
  { ko: "청소", slug: 'soap_bar', folder: 'items', nameEn: "Bar of soap", family: 'health' },
  { ko: "깨끗하다", slug: 'soap_bar', folder: 'items', nameEn: "Bar of soap", family: 'health' },
  { ko: "거실", slug: 'green_sofa', folder: 'items', nameEn: "Sofa", family: 'place' },
  { ko: "방", slug: 'green_sofa', folder: 'items', nameEn: "Sofa", family: 'place' },
  { ko: "아파트", slug: 'apartment_block', folder: 'items', nameEn: "Apartment block", family: 'place' },
  { ko: "주거", slug: 'apartment_block', folder: 'items', nameEn: "Apartment block", family: 'place' },
  { ko: "오피스텔", slug: 'apartment_block', folder: 'items', nameEn: "Apartment block", family: 'place' },
  { ko: "부동산", slug: 'apartment_block', folder: 'items', nameEn: "Apartment block", family: 'place' },
  { ko: "부엌", slug: 'kitchen_stove', folder: 'items', nameEn: "Kitchen stove", family: 'place' },
  { ko: "가스 요금", slug: 'kitchen_stove', folder: 'items', nameEn: "Kitchen stove", family: 'place' },
  { ko: "화장실", slug: 'toilet', folder: 'items', nameEn: "Toilet", family: 'place' },
  { ko: "한옥", slug: 'hanok_house', folder: 'items', nameEn: "Hanok", family: 'place' },
  { ko: "북촌 한옥마을", slug: 'hanok_house', folder: 'items', nameEn: "Hanok", family: 'place' },
  { ko: "민속촌", slug: 'hanok_house', folder: 'items', nameEn: "Hanok", family: 'place' },
  { ko: "기숙사", slug: 'dormitory', folder: 'items', nameEn: "Dormitory", family: 'place' },
  { ko: "이사하다", slug: 'moving_boxes', folder: 'items', nameEn: "Moving boxes", family: 'place' },
  { ko: "태어나다", slug: 'wrapped_baby', folder: 'items', nameEn: "Newborn", family: 'people' },
  { ko: "아기를 낳다", slug: 'wrapped_baby', folder: 'items', nameEn: "Newborn", family: 'people' },
  { ko: "아기", slug: 'wrapped_baby', folder: 'items', nameEn: "Newborn", family: 'people' },
  { ko: "결혼하다", slug: 'wedding_rings', folder: 'items', nameEn: "Wedding rings", family: 'people' },
  { ko: "출구", slug: 'exit_door', folder: 'items', nameEn: "Exit door", family: 'place' },
  { ko: "출입구", slug: 'exit_door', folder: 'items', nameEn: "Exit door", family: 'place' },
  { ko: "취직하다", slug: 'briefcase', folder: 'items', nameEn: "Briefcase", family: 'people' },
  { ko: "승진하다", slug: 'briefcase', folder: 'items', nameEn: "Briefcase", family: 'people' },
  { ko: "주택", slug: 'detached_house', folder: 'items', nameEn: "Detached house", family: 'place' },
  { ko: "짓다", slug: 'teal_gem', folder: 'items', nameEn: "Detached house", family: 'place' },
  { ko: "빌라", slug: 'detached_house', folder: 'items', nameEn: "Detached house", family: 'place' },
  { ko: "졸업하다", slug: 'diploma_scroll', folder: 'items', nameEn: "Diploma", family: 'people' },
  { ko: "입학하다", slug: 'campus_building', folder: 'items', nameEn: "to enter a school", family: 'people' },
  { ko: "입학", slug: 'diploma_scroll', folder: 'items', nameEn: "Diploma", family: 'people' },
  { ko: "친구를 사귀다", slug: 'school_backpack', folder: 'items', nameEn: "School backpack", family: 'people' },
  { ko: "재래시장", slug: 'market_stall_icon', folder: 'items', nameEn: "Market stall", family: 'place' },
  { ko: "장을 보다", slug: 'gold_starburst', folder: 'items', nameEn: "Market stall", family: 'place' },
  { ko: "전기 요금", slug: 'light_bulb', folder: 'items', nameEn: "Light bulb", family: 'place' },
  { ko: "잠을 잘 못 자다", slug: 'white_pillow', folder: 'items', nameEn: "Pillow", family: 'health' },
  { ko: "푹 쉬다", slug: 'gold_starburst', folder: 'items', nameEn: "Pillow", family: 'health' },
  { ko: "피곤하다", slug: 'white_pillow', folder: 'items', nameEn: "Pillow", family: 'health' },
  { ko: "기운이 없다", slug: 'white_pillow', folder: 'items', nameEn: "Pillow", family: 'health' },
  { ko: "계약", slug: 'contract_seal', folder: 'items', nameEn: "Sealed contract", family: 'place' },
  { ko: "계약 기간", slug: 'contract_seal', folder: 'items', nameEn: "Sealed contract", family: 'place' },
  { ko: "전세", slug: 'contract_seal', folder: 'items', nameEn: "Sealed contract", family: 'place' },
  { ko: "태권도", slug: 'taekwondo_dobok', folder: 'items', nameEn: "Taekwondo uniform", family: 'people' },
  { ko: "태권도장", slug: 'taekwondo_dobok', folder: 'items', nameEn: "Taekwondo uniform", family: 'people' },
  { ko: "수도 요금", slug: 'water_faucet', folder: 'items', nameEn: "Water faucet", family: 'place' },
  { ko: "수영장", slug: 'water_faucet', folder: 'items', nameEn: "Water faucet", family: 'place' },
  { ko: "운동", slug: 'running_shoe', folder: 'items', nameEn: "Running shoe", family: 'people' },
  { ko: "운동을 하다", slug: 'running_shoe', folder: 'items', nameEn: "Running shoe", family: 'people' },
  { ko: "달리다", slug: 'running_farmer', folder: 'items', nameEn: "A farmer running", family: 'action' },
  { ko: "달리기", slug: 'running_shoe', folder: 'items', nameEn: "Running shoe", family: 'people' },
  { ko: "마라톤", slug: 'running_shoe', folder: 'items', nameEn: "Running shoe", family: 'people' },
  { ko: "건강", slug: 'running_shoe', folder: 'items', nameEn: "Running shoe", family: 'people' },
  { ko: "하루", slug: 'wall_calendar', folder: 'items', nameEn: "Calendar", family: 'abstract' },
  { ko: "매일", slug: 'wall_calendar', folder: 'items', nameEn: "Calendar", family: 'abstract' },
  { ko: "식후", slug: 'wall_calendar', folder: 'items', nameEn: "Calendar", family: 'abstract' },
  { ko: "쉬는 시간", slug: 'hourglass_ornament', folder: 'items', nameEn: "Calendar", family: 'abstract' },
  { ko: "방학", slug: 'cream_waves', folder: 'items', nameEn: "Calendar", family: 'abstract' },
  { ko: "배달", slug: 'delivery_scooter', folder: 'items', nameEn: "Delivery", family: 'share' },
  { ko: "먹다", slug: 'medicine_capsule', folder: 'items', nameEn: "To take medicine", family: 'share' },
  { ko: "넣다", slug: 'eye_drops', folder: 'items', nameEn: "To put in eye drops", family: 'share' },
  { ko: "바르다", slug: 'ointment_tube', folder: 'items', nameEn: "To apply ointment", family: 'share' },
  { ko: "의원", slug: 'clinic_building', folder: 'items', nameEn: "Clinic", family: 'share' },
  { ko: "약사", slug: 'pharmacy_shop', folder: 'items', nameEn: "Pharmacist", family: 'share' },
  { ko: "얼굴에 뭐가 나다", slug: 'ointment_tube', folder: 'items', nameEn: "Breakout", family: 'share' },
  { ko: "피부과", slug: 'ointment_tube', folder: 'items', nameEn: "Dermatology", family: 'share' },
  { ko: "멀미를 하다", slug: 'medicine_capsule', folder: 'items', nameEn: "Motion sickness", family: 'share' },
  { ko: "멀미약", slug: 'medicine_capsule', folder: 'items', nameEn: "Motion-sickness medicine", family: 'share' },
  { ko: "시끄럽다", slug: 'make_noise', folder: 'items', nameEn: "Noisy", family: 'share' },
  { ko: "빈방", slug: 'be_empty', folder: 'items', nameEn: "Vacant room", family: 'share' },
  { ko: "교통이 편리하다", slug: 'subway_station', folder: 'items', nameEn: "Convenient transport", family: 'share' },
  { ko: "교통편", slug: 'subway_station', folder: 'items', nameEn: "Transport", family: 'share' },
  { ko: "월세", slug: 'price_coins', folder: 'items', nameEn: "Monthly rent", family: 'share' },
  { ko: "집세", slug: 'price_coins', folder: 'items', nameEn: "Rent", family: 'share' },
  { ko: "보증금", slug: 'price_coins', folder: 'items', nameEn: "Deposit", family: 'share' },
  { ko: "식비", slug: 'empty_plate', folder: 'items', nameEn: "Food costs", family: 'share' },
  { ko: "교통비", slug: 'subway_station', folder: 'items', nameEn: "Transport costs", family: 'share' },
  { ko: "전화 요금", slug: 'make_phone_call', folder: 'items', nameEn: "Phone bill", family: 'share' },
  { ko: "반찬", slug: 'vegetable_pile', folder: 'items', nameEn: "Side dish", family: 'share' },
  { ko: "관리비", slug: 'soap_bar', folder: 'items', nameEn: "Maintenance fee", family: 'share' },
  { ko: "현관", slug: 'studio_oneroom', folder: 'items', nameEn: "Entryway", family: 'share' },
  { ko: "낮", slug: 'sun_icon', folder: 'items', nameEn: "Sun", family: 'time' },
  { ko: "아침", slug: 'sun_icon', folder: 'items', nameEn: "Sun", family: 'time' },
  { ko: "따뜻하다", slug: 'teal_gem', folder: 'items', nameEn: "Sun", family: 'time' },
  { ko: "기사", slug: 'newspaper', folder: 'items', nameEn: "Newspaper", family: 'media' },
  { ko: "신문 기사", slug: 'newspaper', folder: 'items', nameEn: "Newspaper", family: 'media' },
  { ko: "기자", slug: 'newspaper', folder: 'items', nameEn: "Newspaper", family: 'media' },
  { ko: "영양제", slug: 'vitamin_bottle', folder: 'items', nameEn: "Vitamin bottle", family: 'health' },
  { ko: "변호사", slug: 'justice_scales', folder: 'items', nameEn: "Scales of justice", family: 'people' },
  { ko: "밤", slug: 'crescent_moon', folder: 'items', nameEn: "Moon", family: 'time' },
  { ko: "저녁", slug: 'crescent_moon', folder: 'items', nameEn: "Moon", family: 'time' },
  { ko: "세계", slug: 'desk_globe', folder: 'items', nameEn: "Globe", family: 'place' },
  { ko: "유학", slug: 'desk_globe', folder: 'items', nameEn: "Globe", family: 'place' },
  { ko: "춘천", slug: 'gold_spiral', folder: 'items', nameEn: "Globe", family: 'place' },
  { ko: "지갑", slug: 'leather_wallet', folder: 'items', nameEn: "Wallet", family: 'money' },
  { ko: "생활비", slug: 'oak_rings', folder: 'items', nameEn: "Wallet", family: 'money' },
  { ko: "돈이 들다", slug: 'gold_spiral', folder: 'items', nameEn: "Wallet", family: 'money' },
  { ko: "죽다", slug: 'lit_candle', folder: 'items', nameEn: "Candle", family: 'people' },
  { ko: "은퇴하다", slug: 'lit_candle', folder: 'items', nameEn: "Candle", family: 'people' },
  { ko: "은퇴", slug: 'lit_candle', folder: 'items', nameEn: "Candle", family: 'people' },
  { ko: "고등학교", slug: 'schoolhouse', folder: 'items', nameEn: "Schoolhouse", family: 'place' },
  { ko: "대학원", slug: 'schoolhouse', folder: 'items', nameEn: "Schoolhouse", family: 'place' },
  { ko: "중학생", slug: 'schoolhouse', folder: 'items', nameEn: "Schoolhouse", family: 'place' },
  { ko: "사랑에 빠지다", slug: 'red_heart', folder: 'items', nameEn: "Heart", family: 'people' },
  { ko: "친해지다", slug: 'red_heart', folder: 'items', nameEn: "Heart", family: 'people' },
  { ko: "기분이 좋다", slug: 'red_heart', folder: 'items', nameEn: "Heart", family: 'people' },
  { ko: "발표하다", slug: 'gold_spiral', folder: 'items', nameEn: "Microphone", family: 'people' },
  { ko: "인터뷰", slug: 'silver_mic', folder: 'items', nameEn: "Microphone", family: 'people' },
  { ko: "설명하다", slug: 'silver_mic', folder: 'items', nameEn: "Microphone", family: 'people' },
  { ko: "베란다", slug: 'balcony_rail', folder: 'items', nameEn: "Balcony", family: 'place' },
  { ko: "전망이 좋다", slug: 'balcony_rail', folder: 'items', nameEn: "Balcony", family: 'place' },
  { ko: "역할극", slug: 'silver_mic', folder: 'items', nameEn: "role-play", family: 'fill' },
  { ko: "마다", slug: 'gold_spiral', folder: 'items', nameEn: "every, each (N마다)", family: 'fill' },
  { ko: "씩", slug: 'gold_starburst', folder: 'items', nameEn: "each, apiece (per unit)", family: 'fill' },
  { ko: "계속", slug: 'gold_starburst', folder: 'items', nameEn: "continuously", family: 'fill' },
  { ko: "걱정", slug: 'chevron_badge', folder: 'items', nameEn: "worry", family: 'fill' },
  { ko: "심심하다", slug: 'gold_spiral', folder: 'items', nameEn: "to be bored", family: 'fill' },
  { ko: "시간이 나다", slug: 'hourglass_ornament', folder: 'items', nameEn: "to have free time", family: 'fill' },
  { ko: "계획을 세우다", slug: 'gold_starburst', folder: 'items', nameEn: "to make a plan", family: 'fill' },
  { ko: "자꾸", slug: 'hourglass_ornament', folder: 'items', nameEn: "repeatedly, again and again", family: 'fill' },
  { ko: "화해하다", slug: 'gold_spiral', folder: 'items', nameEn: "to make up, reconcile", family: 'fill' },
  { ko: "싸우다", slug: 'gold_spiral', folder: 'items', nameEn: "to quarrel, fight", family: 'fill' },
  { ko: "가볍다", slug: 'light_feather', folder: 'items', nameEn: "Light feather", family: 'household' },
  { ko: "어떻게 오셨어요?", slug: 'running_shoe', folder: 'items', nameEn: "What brings you here?", family: 'fill' },
  { ko: "언제부터", slug: 'wall_calendar', folder: 'items', nameEn: "since when", family: 'fill' },
  { ko: "이틀", slug: 'wall_calendar', folder: 'items', nameEn: "two days", family: 'fill' },
  { ko: "정도", slug: 'running_shoe', folder: 'items', nameEn: "about, approximately", family: 'fill' },
  { ko: "그래도", slug: 'running_shoe', folder: 'items', nameEn: "even so, still", family: 'fill' },
  { ko: "을/를 위해서", slug: 'running_shoe', folder: 'items', nameEn: "for the sake of, in order to", family: 'fill' },
  { ko: "특별히", slug: 'running_shoe', folder: 'items', nameEn: "particularly, especially", family: 'fill' },
  { ko: "스트레스가 풀리다", slug: 'ice_pack', folder: 'items', nameEn: "for stress to be relieved", family: 'fill' },
  { ko: "스트레스가 많다", slug: 'ice_pack', folder: 'items', nameEn: "to be under a lot of stress", family: 'fill' },
  { ko: "동호회", slug: 'school_backpack', folder: 'items', nameEn: "club, hobby society", family: 'fill' },
  { ko: "나가다", slug: 'go_outside', folder: 'items', nameEn: "to go out; to attend", family: 'fill' },
  { ko: "시간을 내다", slug: 'wall_calendar', folder: 'items', nameEn: "to make time", family: 'fill' },
  { ko: "고민", slug: 'ice_pack', folder: 'items', nameEn: "worry, something on one's mind", family: 'fill' },
  { ko: "조언", slug: 'silver_mic', folder: 'items', nameEn: "advice", family: 'fill' },
  { ko: "여행을 다녀오다", slug: 'desk_globe', folder: 'items', nameEn: "to go on a trip and come back", family: 'fill' },
  { ko: "무슨 일 있어요?", slug: 'running_shoe', folder: 'items', nameEn: "Is something the matter?", family: 'fill' },
  { ko: "사흘", slug: 'wall_calendar', folder: 'items', nameEn: "three days", family: 'fill' },
  { ko: "나이", slug: 'elderly', folder: 'items', nameEn: "age", family: 'fill' },
  { ko: "완주", slug: 'running_shoe', folder: 'items', nameEn: "running the full course", family: 'fill' },
  { ko: "대회", slug: 'running_shoe', folder: 'items', nameEn: "competition, meet", family: 'fill' },
  { ko: "참가하다", slug: 'school_backpack', folder: 'items', nameEn: "to take part, participate", family: 'fill' },
  { ko: "선수", slug: 'school_backpack', folder: 'items', nameEn: "athlete, competitor", family: 'fill' },
  { ko: "상을 받다", slug: 'kinds_types', folder: 'items', nameEn: "to win a prize", family: 'fill' },
  { ko: "축하하다", slug: 'birthday_cake', folder: 'items', nameEn: "to congratulate", family: 'fill' },
  { ko: "평소", slug: 'wall_calendar', folder: 'items', nameEn: "ordinary times, usually", family: 'fill' },
  { ko: "식사", slug: 'empty_plate', folder: 'items', nameEn: "a meal", family: 'fill' },
  { ko: "여러 번", slug: 'kinds_types', folder: 'items', nameEn: "several times", family: 'fill' },
  { ko: "가장", slug: 'kinds_types', folder: 'items', nameEn: "the most, -est", family: 'fill' },
  { ko: "빠르다", slug: 'running_shoe', folder: 'items', nameEn: "to be fast", family: 'fill' },
  { ko: "특별하다", slug: 'grammar_scroll', folder: 'items', nameEn: "to be special", family: 'fill' },
  { ko: "건강 비결", slug: 'running_shoe', folder: 'items', nameEn: "the secret of good health", family: 'fill' },
  { ko: "생활", slug: 'running_shoe', folder: 'items', nameEn: "life, living", family: 'fill' },
  { ko: "습관", slug: 'running_shoe', folder: 'items', nameEn: "habit", family: 'fill' },
  { ko: "생활 습관", slug: 'running_shoe', folder: 'items', nameEn: "lifestyle habits", family: 'fill' },
  { ko: "건강하다", slug: 'running_shoe', folder: 'items', nameEn: "to be healthy", family: 'fill' },
  { ko: "몸에 좋다", slug: 'running_shoe', folder: 'items', nameEn: "to be good for the body", family: 'fill' },
  { ko: "그러나", slug: 'running_shoe', folder: 'items', nameEn: "however", family: 'fill' },
  { ko: "바꾸다", slug: 'light_bulb', folder: 'items', nameEn: "to change", family: 'fill' },
  { ko: "중요하다", slug: 'running_shoe', folder: 'items', nameEn: "to be important", family: 'fill' },
  { ko: "웃다", slug: 'birthday_cake', folder: 'items', nameEn: "to laugh, to smile", family: 'fill' },
  { ko: "모든", slug: 'running_shoe', folder: 'items', nameEn: "all, every", family: 'fill' },
  { ko: "좋은 쪽으로 생각하다", slug: 'running_shoe', folder: 'items', nameEn: "to look on the bright side", family: 'fill' },
  { ko: "노력하다", slug: 'running_shoe', folder: 'items', nameEn: "to make an effort", family: 'fill' },
  { ko: "오래", slug: 'running_shoe', folder: 'items', nameEn: "for a long time", family: 'fill' },
  { ko: "한 번에", slug: 'running_shoe', folder: 'items', nameEn: "all at once, in one go", family: 'fill' },
  { ko: "외출하다", slug: 'go_outside', folder: 'items', nameEn: "to go out (leave the house)", family: 'fill' },
  { ko: "돌아오다", slug: 'go_outside', folder: 'items', nameEn: "to come back", family: 'fill' },
  { ko: "바로", slug: 'act_immediately', folder: 'items', nameEn: "Responding immediately to a bell", family: 'action' },
  { ko: "예방하다", slug: 'detached_house', folder: 'items', nameEn: "to prevent", family: 'fill' },
  { ko: "꼭", slug: 'running_shoe', folder: 'items', nameEn: "without fail, be sure to", family: 'fill' },
  { ko: "하숙집", slug: 'dormitory', folder: 'items', nameEn: "boarding house (room with meals)", family: 'fill' },
  { ko: "고시원", slug: 'gosiwon_room', folder: 'items', nameEn: "A tiny study-and-sleep room", family: 'place' },
  { ko: "1인실", slug: 'studio_oneroom', folder: 'items', nameEn: "single room (for one)", family: 'fill' },
  { ko: "방이 넓다", slug: 'detached_house', folder: 'items', nameEn: "the room is spacious", family: 'fill' },
  { ko: "방이 좁다", slug: 'detached_house', folder: 'items', nameEn: "the room is cramped", family: 'fill' },
  { ko: "방값이 싸다", slug: 'leather_wallet', folder: 'items', nameEn: "the rent is cheap", family: 'fill' },
  { ko: "새로 지었다", slug: 'kinds_types', folder: 'items', nameEn: "newly built", family: 'fill' },
  { ko: "시설이 잘되어 있다", slug: 'detached_house', folder: 'items', nameEn: "well equipped, good facilities", family: 'fill' },
  { ko: "교통이 불편하다", slug: 'subway_station', folder: 'items', nameEn: "the transport links are poor", family: 'fill' },
  { ko: "주변이 조용하다", slug: 'kinds_types', folder: 'items', nameEn: "the area around is quiet", family: 'fill' },
  { ko: "집주인이 좋다", slug: 'detached_house', folder: 'items', nameEn: "the landlord is good", family: 'fill' },
  { ko: "살기 좋다", slug: 'detached_house', folder: 'items', nameEn: "good to live in", family: 'fill' },
  { ko: "어둡다", slug: 'detached_house', folder: 'items', nameEn: "to be dark", family: 'fill' },
  { ko: "마음에 들다", slug: 'red_heart', folder: 'items', nameEn: "to like it, for it to suit you", family: 'fill' },
  { ko: "주변 환경", slug: 'kinds_types', folder: 'items', nameEn: "the surroundings, the neighbourhood", family: 'fill' },
  { ko: "크기", slug: 'kinds_types', folder: 'items', nameEn: "size", family: 'fill' },
  { ko: "매매", slug: 'leather_wallet', folder: 'items', nameEn: "buying and selling (property)", family: 'fill' },
  { ko: "이하", slug: 'contract_seal', folder: 'items', nameEn: "or less, no more than", family: 'fill' },
  { ko: "포함되다", slug: 'contract_seal', folder: 'items', nameEn: "to be included", family: 'fill' },
  { ko: "반씩", slug: 'kinds_types', folder: 'items', nameEn: "half each", family: 'fill' },
  { ko: "나오다", slug: 'kinds_types', folder: 'items', nameEn: "to come to (of a bill)", family: 'fill' },
  { ko: "중개인", slug: 'estate_broker', folder: 'items', nameEn: "agent, broker", family: 'fill' },
  { ko: "조건", slug: 'contract_seal', folder: 'items', nameEn: "conditions, terms", family: 'fill' },
  { ko: "위치", slug: 'kinds_types', folder: 'items', nameEn: "location", family: 'fill' },
  { ko: "기타", slug: 'kinds_types', folder: 'items', nameEn: "other, anything else", family: 'fill' },
  { ko: "구하다", slug: 'kinds_types', folder: 'items', nameEn: "to look for, to find (a place)", family: 'fill' },
  { ko: "알아보다", slug: 'eyeglasses', folder: 'items', nameEn: "to look into, to ask around", family: 'fill' },
  { ko: "결정하다", slug: 'kinds_types', folder: 'items', nameEn: "to decide", family: 'fill' },
  { ko: "구경하다", slug: 'kinds_types', folder: 'items', nameEn: "to look round, to view", family: 'fill' },
  { ko: "광고", slug: 'newspaper', folder: 'items', nameEn: "advertisement", family: 'fill' },
  { ko: "문의하다", slug: 'kinds_types', folder: 'items', nameEn: "to enquire", family: 'fill' },
  { ko: "거리", slug: 'kinds_types', folder: 'items', nameEn: "distance; a walk away", family: 'fill' },
  { ko: "떠들다", slug: 'hourglass_ornament', folder: 'items', nameEn: "to make a racket", family: 'fill' },
  { ko: "공기", slug: 'oak_rings', folder: 'items', nameEn: "air", family: 'fill' },
  { ko: "마침", slug: 'hourglass_ornament', folder: 'items', nameEn: "as it happens, just then", family: 'fill' },
  { ko: "회사를 옮기다", slug: 'chevron_badge', folder: 'items', nameEn: "to move to another company", family: 'fill' },
  { ko: "편하다", slug: 'comfortable_farmer', folder: 'items', nameEn: "Feeling comfortable in a cushioned chair", family: 'action' },
  { ko: "불편하다", slug: 'gold_spiral', folder: 'items', nameEn: "to be inconvenient", family: 'fill' },
  { ko: "힘들다", slug: 'hourglass_ornament', folder: 'items', nameEn: "to be hard going", family: 'fill' },
  { ko: "연락하다", slug: 'gold_starburst', folder: 'items', nameEn: "to get in touch", family: 'fill' },
  { ko: "그렇지 않아도", slug: 'gold_starburst', folder: 'items', nameEn: "as it happens, I was going to anyway", family: 'fill' },
  { ko: "높은 곳", slug: 'oak_rings', folder: 'items', nameEn: "a high spot, up high", family: 'fill' },
  { ko: "길이 막히다", slug: 'gold_starburst', folder: 'items', nameEn: "for the road to be jammed", family: 'fill' },
  { ko: "대부분", slug: 'desk_globe', folder: 'items', nameEn: "mostly, most of them", family: 'fill' },
  { ko: "바뀌다", slug: 'light_bulb', folder: 'items', nameEn: "to be turned into, to change", family: 'fill' },
  { ko: "생활하다", slug: 'running_shoe', folder: 'items', nameEn: "to live, to get by day to day", family: 'fill' },
  { ko: "아주머니", slug: 'elderly', folder: 'items', nameEn: "ma’am — an older woman", family: 'fill' },
  { ko: "가족처럼", slug: 'elderly', folder: 'items', nameEn: "like family", family: 'fill' },
  { ko: "소개하다", slug: 'kinds_types', folder: 'items', nameEn: "to introduce, to put on to", family: 'fill' },
  { ko: "나중에", slug: 'wall_calendar', folder: 'items', nameEn: "later on", family: 'fill' },
  { ko: "좋은 점", slug: 'kinds_types', folder: 'items', nameEn: "the good points", family: 'fill' },
  { ko: "나쁜 점", slug: 'kinds_types', folder: 'items', nameEn: "the bad points", family: 'fill' },
  { ko: "룸메이트", slug: 'school_backpack', folder: 'items', nameEn: "roommate", family: 'fill' },
  { ko: "규칙", slug: 'dorm_rules', folder: 'items', nameEn: "a rule", family: 'fill' },
  { ko: "궁금하다", slug: 'detached_house', folder: 'items', nameEn: "to wonder, to be curious", family: 'fill' },
  { ko: "혹시", slug: 'detached_house', folder: 'items', nameEn: "by any chance", family: 'fill' },
  { ko: "잘됐다", slug: 'birthday_cake', folder: 'items', nameEn: "that works out well", family: 'fill' },
  { ko: "바람이 통하다", slug: 'balcony_rail', folder: 'items', nameEn: "to be well ventilated", family: 'fill' },
  { ko: "느끼다", slug: 'violet_petals', folder: 'items', nameEn: "to feel", family: 'fill' },
  { ko: "시원하다", slug: 'balcony_rail', folder: 'items', nameEn: "to be cool, refreshing", family: 'fill' },
  { ko: "놀러 가다", slug: 'go_outside', folder: 'items', nameEn: "to go round to visit", family: 'fill' },
  { ko: "어울리다", slug: 'kinds_types', folder: 'items', nameEn: "to suit, to go well with", family: 'fill' },
  { ko: "인생", slug: 'red_heart', folder: 'items', nameEn: "a life, a lifetime", family: 'fill' },
  { ko: "고생하다", slug: 'red_heart', folder: 'items', nameEn: "to go through a hard time", family: 'fill' },
  { ko: "꿈", slug: 'red_heart', folder: 'items', nameEn: "a dream, what one wants to become", family: 'fill' },
  { ko: "봉사 활동", slug: 'red_heart', folder: 'items', nameEn: "volunteer work", family: 'fill' },
  { ko: "늘다", slug: 'light_bulb', folder: 'items', nameEn: "to increase", family: 'fill' },
  { ko: "줄다", slug: 'light_bulb', folder: 'items', nameEn: "to decrease", family: 'fill' },
  { ko: "오르다", slug: 'light_bulb', folder: 'items', nameEn: "to go up", family: 'fill' },
  { ko: "내리다", slug: 'light_bulb', folder: 'items', nameEn: "to go down", family: 'fill' },
  { ko: "생기다", slug: 'light_bulb', folder: 'items', nameEn: "to be formed, to come into being", family: 'fill' },
  { ko: "발전하다", slug: 'light_bulb', folder: 'items', nameEn: "to develop", family: 'fill' },
  { ko: "인구", slug: 'desk_globe', folder: 'items', nameEn: "population", family: 'fill' },
  { ko: "물건값", slug: 'leather_wallet', folder: 'items', nameEn: "the price of goods", family: 'fill' },
  { ko: "시골", slug: 'hanok_house', folder: 'items', nameEn: "the countryside", family: 'fill' },
  { ko: "수", slug: 'desk_globe', folder: 'items', nameEn: "a number, a count", family: 'fill' },
  { ko: "과일값", slug: 'leather_wallet', folder: 'items', nameEn: "the price of fruit", family: 'fill' },
  { ko: "점점", slug: 'light_bulb', folder: 'items', nameEn: "little by little", family: 'fill' },
  { ko: "달라지다", slug: 'light_bulb', folder: 'items', nameEn: "to become different", family: 'fill' },
  { ko: "옛날", slug: 'light_bulb', folder: 'items', nameEn: "the old days", family: 'fill' },
  { ko: "A-아지다/어지다", slug: 'kinds_types', folder: 'items', nameEn: "to get / to become — an adjective turning into a change", family: 'fill' },
  { ko: "V-게 되다", slug: 'kinds_types', folder: 'items', nameEn: "to end up doing it, to come to do it", family: 'fill' },
  { ko: "익숙하다", slug: 'kinds_types', folder: 'items', nameEn: "to be accustomed to it", family: 'fill' },
  { ko: "이제", slug: 'wall_calendar', folder: 'items', nameEn: "now, by now", family: 'fill' },
  { ko: "알게 되다", slug: 'kinds_types', folder: 'items', nameEn: "to come to know", family: 'fill' },
  { ko: "건강해지다", slug: 'running_shoe', folder: 'items', nameEn: "to get healthier", family: 'fill' },
  { ko: "오래간만이다", slug: 'kinds_types', folder: 'items', nameEn: "it's been a long time", family: 'fill' },
  { ko: "별일 없다", slug: 'kinds_types', folder: 'items', nameEn: "to have nothing much going on", family: 'fill' },
  { ko: "그동안", slug: 'wall_calendar', folder: 'items', nameEn: "in the meantime, since we last met", family: 'fill' },
  { ko: "걱정하다", slug: 'ice_pack', folder: 'items', nameEn: "to worry", family: 'fill' },
  { ko: "곧", slug: 'wall_calendar', folder: 'items', nameEn: "soon", family: 'fill' },
  { ko: "안부", slug: 'kinds_types', folder: 'items', nameEn: "how someone is keeping", family: 'fill' },
  { ko: "안부를 묻다", slug: 'kinds_types', folder: 'items', nameEn: "to ask after someone", family: 'fill' },
  { ko: "근황", slug: 'kinds_types', folder: 'items', nameEn: "what someone has been up to lately", family: 'fill' },
  { ko: "얼마나", slug: 'kinds_types', folder: 'items', nameEn: "how long, how much", family: 'fill' },
  { ko: "처음에는", slug: 'kinds_types', folder: 'items', nameEn: "at first", family: 'fill' },
  { ko: "외국", slug: 'desk_globe', folder: 'items', nameEn: "a foreign country", family: 'fill' },
  { ko: "V-기 전에", slug: 'kinds_types', folder: 'items', nameEn: "before doing it", family: 'fill' },
  { ko: "V-(으)ㄴ 후에", slug: 'kinds_types', folder: 'items', nameEn: "after doing it", family: 'fill' },
  { ko: "출발하다", slug: 'kinds_types', folder: 'items', nameEn: "to set off", family: 'fill' },
  { ko: "준비 운동", slug: 'running_shoe', folder: 'items', nameEn: "a warm-up", family: 'fill' },
  { ko: "다니다", slug: 'kinds_types', folder: 'items', nameEn: "to attend, to go regularly", family: 'fill' },
  { ko: "먼저", slug: 'kinds_types', folder: 'items', nameEn: "first, before anything else", family: 'fill' },
  { ko: "숙제", slug: 'homework_notebook', folder: 'items', nameEn: "homework", family: 'fill' },
  { ko: "놀다", slug: 'kinds_types', folder: 'items', nameEn: "to hang out, to play", family: 'fill' },
  { ko: "마치다", slug: 'kinds_types', folder: 'items', nameEn: "to finish something", family: 'fill' },
  { ko: "-고 나서", slug: 'gold_starburst', folder: 'items', nameEn: "and then, once that is done", family: 'fill' },
  { ko: "-기로 하다", slug: 'oak_rings', folder: 'items', nameEn: "to arrange to, to decide to", family: 'fill' },
  { ko: "-려고 하다", slug: 'oak_rings', folder: 'items', nameEn: "to be planning to", family: 'fill' },
  { ko: "곳", slug: 'kinds_types', folder: 'items', nameEn: "a place", family: 'fill' },
  { ko: "프랑스", slug: 'france_flag', folder: 'items', nameEn: "France", family: 'place' },
  { ko: "파리", slug: 'paris_eiffel_tower', folder: 'items', nameEn: "The Eiffel Tower in Paris", family: 'place' },
  { ko: "거의", slug: 'kinds_types', folder: 'items', nameEn: "almost, hardly any", family: 'fill' },
  { ko: "예전에", slug: 'kinds_types', folder: 'items', nameEn: "in the old days", family: 'fill' },
  { ko: "근처", slug: 'kinds_types', folder: 'items', nameEn: "nearby", family: 'fill' },
  { ko: "호선", slug: 'kinds_types', folder: 'items', nameEn: "line number — 9호선 is Line 9", family: 'fill' },
  { ko: "훨씬", slug: 'kinds_types', folder: 'items', nameEn: "far more", family: 'fill' },
  { ko: "편리하다", slug: 'kinds_types', folder: 'items', nameEn: "to be convenient", family: 'fill' },
  { ko: "외국인", slug: 'desk_globe', folder: 'items', nameEn: "a foreigner", family: 'fill' },
  { ko: "어디에서나", slug: 'kinds_types', folder: 'items', nameEn: "anywhere at all", family: 'fill' },
  { ko: "앞으로", slug: 'wall_calendar', folder: 'items', nameEn: "from now on", family: 'fill' },
  { ko: "기대가 되다", slug: 'kinds_types', folder: 'items', nameEn: "to be something to look forward to", family: 'fill' },
  { ko: "N에 대한", slug: 'cream_waves', folder: 'items', nameEn: "about N, concerning N", family: 'fill' },
  { ko: "N(이)나", slug: 'knot_tile', folder: 'items', nameEn: "N or something like it", family: 'fill' },
  { ko: "강남", slug: 'desk_globe', folder: 'items', nameEn: "Gangnam, south of the river", family: 'fill' },
  { ko: "한강", slug: 'han_river', folder: 'items', nameEn: "The Han River and a bridge in Seoul", family: 'place' },
  { ko: "1970년대", slug: 'light_bulb', folder: 'items', nameEn: "the 1970s — N년대 is the decade", family: 'fill' },
  { ko: "수도", slug: 'desk_globe', folder: 'items', nameEn: "a capital city", family: 'fill' },
  { ko: "과거", slug: 'light_bulb', folder: 'items', nameEn: "the past", family: 'fill' },
  { ko: "명", slug: 'light_bulb', folder: 'items', nameEn: "the counter for people", family: 'fill' },
  { ko: "그래프", slug: 'line_graph', folder: 'items', nameEn: "a graph", family: 'fill' },
  { ko: "초등학교", slug: 'schoolhouse', folder: 'items', nameEn: "elementary school", family: 'fill' },
  { ko: "행복", slug: 'red_heart', folder: 'items', nameEn: "happiness", family: 'fill' },
  { ko: "불행", slug: 'red_heart', folder: 'items', nameEn: "unhappiness", family: 'fill' },
  { ko: "점을 찍다", slug: 'red_heart', folder: 'items', nameEn: "to mark a dot", family: 'fill' },
  { ko: "연결하다", slug: 'red_heart', folder: 'items', nameEn: "to join up, to connect", family: 'fill' },
  { ko: "부모님", slug: 'red_heart', folder: 'items', nameEn: "one’s parents", family: 'fill' },
  { ko: "그때", slug: 'red_heart', folder: 'items', nameEn: "at that time", family: 'fill' },
  { ko: "그 후로", slug: 'red_heart', folder: 'items', nameEn: "ever since then", family: 'fill' },
  { ko: "아프다", slug: 'medicine_bottle', folder: 'items', nameEn: "to be ill", family: 'fill' },
  { ko: "기다리다", slug: 'red_heart', folder: 'items', nameEn: "to wait for", family: 'fill' },
  { ko: "탈락", slug: 'kinds_types', folder: 'items', nameEn: "dropping — a sound that stops being pronounced", family: 'fill' },
  { ko: "모음", slug: 'kinds_types', folder: 'items', nameEn: "a vowel", family: 'fill' },
  { ko: "싫다", slug: 'kinds_types', folder: 'items', nameEn: "to dislike", family: 'fill' },
  { ko: "끓다", slug: 'kinds_types', folder: 'items', nameEn: "to boil", family: 'fill' },
  { ko: "극장", slug: 'cinema_house', folder: 'items', nameEn: "a cinema", family: 'fill' },
  { ko: "기분", slug: 'red_heart', folder: 'items', nameEn: "a mood, how one feels", family: 'fill' },
  { ko: "낳다", slug: 'kinds_types', folder: 'items', nameEn: "to give birth", family: 'fill' },
  { ko: "괜찮아지다", slug: 'kinds_types', folder: 'items', nameEn: "to get better, to come right", family: 'fill' },
  { ko: "썰렁하다", slug: 'ice_pack', folder: 'items', nameEn: "to be deserted, to have no custom; (of air) chilly", family: 'fill' },
  { ko: "모색", slug: 'running_shoe', folder: 'items', nameEn: "a search for a way forward", family: 'fill' },
  { ko: "여러 곳", slug: 'desk_globe', folder: 'items', nameEn: "several places", family: 'fill' },
  { ko: "찾다", slug: 'go_outside', folder: 'items', nameEn: "to visit a place; to look for", family: 'fill' },
  { ko: "직접", slug: 'exit_door', folder: 'items', nameEn: "in person, directly", family: 'fill' },
  { ko: "추워지다", slug: 'ice_pack', folder: 'items', nameEn: "to turn cold", family: 'fill' },
  { ko: "손님", slug: 'elderly', folder: 'items', nameEn: "a customer", family: 'fill' },
  { ko: "통하다", slug: 'exit_door', folder: 'items', nameEn: "to go through, to be by way of", family: 'fill' },
  { ko: "경기", slug: 'leather_wallet', folder: 'items', nameEn: "business conditions, how trade is going", family: 'fill' },
  { ko: "회복", slug: 'leather_wallet', folder: 'items', nameEn: "a recovery", family: 'fill' },
  { ko: "노력", slug: 'running_shoe', folder: 'items', nameEn: "effort", family: 'fill' },
  { ko: "상품", slug: 'moving_boxes', folder: 'items', nameEn: "goods, a product", family: 'fill' },
  { ko: "구매하다", slug: 'leather_wallet', folder: 'items', nameEn: "to buy, to purchase", family: 'fill' },
  { ko: "원하다", slug: 'red_heart', folder: 'items', nameEn: "to want", family: 'fill' },
  { ko: "많아지다", slug: 'line_graph', folder: 'items', nameEn: "to grow in number", family: 'fill' },
  { ko: "제목", slug: 'newspaper', folder: 'items', nameEn: "a headline, a title", family: 'fill' },
  { ko: "눈으로 먹다", slug: 'empty_plate', folder: 'items', nameEn: "to eat with the eyes — to enjoy food by looking at it", family: 'fill' },
  { ko: "귀로 맛보다", slug: 'empty_plate', folder: 'items', nameEn: "to taste with the ears — to enjoy food through its sounds", family: 'fill' },
  { ko: "맛보다", slug: 'empty_plate', folder: 'items', nameEn: "to taste", family: 'fill' },
  { ko: "음식", slug: 'empty_plate', folder: 'items', nameEn: "food", family: 'fill' },
  { ko: "모양", slug: 'paint_palette', folder: 'items', nameEn: "the shape of a thing", family: 'fill' },
  { ko: "색깔", slug: 'paint_palette', folder: 'items', nameEn: "colour", family: 'fill' },
  { ko: "시대", slug: 'newspaper', folder: 'items', nameEn: "an age, an era", family: 'fill' },
  { ko: "천국", slug: 'newspaper', folder: 'items', nameEn: "heaven — in a headline, \"awash with\"", family: 'fill' },
  { ko: "요리 프로그램", slug: 'wooden_tv', folder: 'items', nameEn: "a cooking programme", family: 'fill' },
  { ko: "텔레비전 프로그램", slug: 'wooden_tv', folder: 'items', nameEn: "a television programme", family: 'fill' },
  { ko: "실제", slug: 'newspaper', folder: 'items', nameEn: "the real thing, actual", family: 'fill' },
  { ko: "보여주다", slug: 'wooden_tv', folder: 'items', nameEn: "to show", family: 'fill' },
  { ko: "즐기다", slug: 'red_heart', folder: 'items', nameEn: "to enjoy", family: 'fill' },
  { ko: "관련되다", slug: 'grammar_scroll', folder: 'items', nameEn: "to be related to", family: 'fill' },
  { ko: "요즘", slug: 'wall_calendar', folder: 'items', nameEn: "these days", family: 'fill' },
  { ko: "중요해지다", slug: 'running_shoe', folder: 'items', nameEn: "to become important", family: 'fill' },
  { ko: "색조 화장품", slug: 'lipstick_tube', folder: 'items', nameEn: "colour cosmetics — makeup, as against skincare", family: 'fill' },
  { ko: "화장품", slug: 'lipstick_tube', folder: 'items', nameEn: "cosmetics", family: 'fill' },
  { ko: "화장을 하다", slug: 'lipstick_tube', folder: 'items', nameEn: "to wear makeup", family: 'fill' },
  { ko: "외모", slug: 'hand_mirror', folder: 'items', nameEn: "a person's looks", family: 'fill' },
  { ko: "가꾸다", slug: 'detached_house', folder: 'items', nameEn: "to tend, to groom — used of looks and of gardens alike", family: 'fill' },
  { ko: "불티", slug: 'newspaper', folder: 'items', nameEn: "a spark — in a headline, short for 불티나다, to sell out fast", family: 'fill' },
  { ko: "관리", slug: 'briefcase', folder: 'items', nameEn: "looking after something; also being in charge of it", family: 'fill' },
  { ko: "늘어나다", slug: 'light_bulb', folder: 'items', nameEn: "to grow in number", family: 'fill' },
  { ko: "필요가 있다", slug: 'grammar_scroll', folder: 'items', nameEn: "there is a need to", family: 'fill' },
  { ko: "주로", slug: 'grammar_scroll', folder: 'items', nameEn: "mainly", family: 'fill' },
  { ko: "담당하다", slug: 'briefcase', folder: 'items', nameEn: "to be in charge of, to handle", family: 'fill' },
  { ko: "사회적 지위", slug: 'government_hall', folder: 'items', nameEn: "social standing", family: 'fill' },
  { ko: "관심", slug: 'red_heart', folder: 'items', nameEn: "interest, attention", family: 'fill' },
  { ko: "피서객", slug: 'beach_parasol', folder: 'items', nameEn: "a holidaymaker escaping the heat", family: 'fill' },
  { ko: "피서지", slug: 'beach_parasol', folder: 'items', nameEn: "a place people go to escape the heat", family: 'fill' },
  { ko: "더위", slug: 'beach_parasol', folder: 'items', nameEn: "the heat", family: 'fill' },
  { ko: "쓰레기", slug: 'trash_bag', folder: 'items', nameEn: "rubbish", family: 'fill' },
  { ko: "치우다", slug: 'trash_bag', folder: 'items', nameEn: "to clear away", family: 'fill' },
  { ko: "양", slug: 'line_graph', folder: 'items', nameEn: "a quantity, an amount", family: 'fill' },
  { ko: "전쟁", slug: 'newspaper', folder: 'items', nameEn: "a war", family: 'fill' },
  { ko: "N와의 전쟁", slug: 'knot_tile', folder: 'items', nameEn: "a war with N — what a headline calls a problem it cannot sol", family: 'fill' },
  { ko: "심각하다", slug: 'red_heart', folder: 'items', nameEn: "to be serious", family: 'fill' },
  { ko: "애쓰다", slug: 'red_heart', folder: 'items', nameEn: "to struggle, to take pains", family: 'fill' },
  { ko: "-기 위해", slug: 'oak_rings', folder: 'items', nameEn: "in order to", family: 'fill' },
  { ko: "-(으)로 인해", slug: 'cream_waves', folder: 'items', nameEn: "owing to, because of", family: 'fill' },
  { ko: "여러 가지로", slug: 'grammar_scroll', folder: 'items', nameEn: "in various ways", family: 'fill' },
  { ko: "불편", slug: 'ice_pack', folder: 'items', nameEn: "inconvenience", family: 'fill' },
  { ko: "겪다", slug: 'red_heart', folder: 'items', nameEn: "to go through, to suffer", family: 'fill' },
  { ko: "저축률", slug: 'piggy_bank', folder: 'items', nameEn: "the savings rate", family: 'fill' },
  { ko: "저축", slug: 'piggy_bank', folder: 'items', nameEn: "saving, savings", family: 'fill' },
  { ko: "바닥", slug: 'leather_wallet', folder: 'items', nameEn: "the bottom — of a figure, rock bottom", family: 'fill' },
  { ko: "떨어지다", slug: 'leather_wallet', folder: 'items', nameEn: "to fall", family: 'fill' },
  { ko: "올라가다", slug: 'leather_wallet', folder: 'items', nameEn: "to climb back up", family: 'fill' },
  { ko: "낮다", slug: 'leather_wallet', folder: 'items', nameEn: "to be low", family: 'fill' },
  { ko: "젊은층", slug: 'running_shoe', folder: 'items', nameEn: "the young, as an age group", family: 'fill' },
  { ko: "젊다", slug: 'running_shoe', folder: 'items', nameEn: "to be young", family: 'fill' },
  { ko: "무관심", slug: 'ice_pack', folder: 'items', nameEn: "indifference", family: 'fill' },
  { ko: "걸리다", slug: 'wall_calendar', folder: 'items', nameEn: "to take (an amount of time)", family: 'fill' },
  { ko: "나타나다", slug: 'line_graph', folder: 'items', nameEn: "to come out, to show up — of a figure or a result", family: 'fill' },
  { ko: "N 만에", slug: 'cream_waves', folder: 'items', nameEn: "for the first time in N — measured from the last time it hap", family: 'fill' },
  { ko: "N 동안", slug: 'teal_gem', folder: 'items', nameEn: "throughout N, for the whole of N", family: 'fill' },
  { ko: "N을/를 비롯해서", slug: 'hourglass_ornament', folder: 'items', nameEn: "including N, and N first among them", family: 'fill' },
  { ko: "여름철", slug: 'beach_parasol', folder: 'items', nameEn: "the summer months", family: 'fill' },
  { ko: "여름", slug: 'beach_parasol', folder: 'items', nameEn: "summer", family: 'fill' },
  { ko: "보관", slug: 'fridge', folder: 'items', nameEn: "storage, keeping", family: 'fill' },
  { ko: "보관하다", slug: 'fridge', folder: 'items', nameEn: "to store, to keep", family: 'fill' },
  { ko: "냉장고", slug: 'fridge', folder: 'items', nameEn: "a fridge", family: 'fill' },
  { ko: "냉장고 안", slug: 'fridge', folder: 'items', nameEn: "inside the fridge", family: 'fill' },
  { ko: "믿다", slug: 'red_heart', folder: 'items', nameEn: "to trust, to rely on", family: 'fill' },
  { ko: "낭패", slug: 'ice_pack', folder: 'items', nameEn: "a fiasco — a plan that lets you down at the worst moment", family: 'fill' },
  { ko: "안심하다", slug: 'red_heart', folder: 'items', nameEn: "to be at ease about something", family: 'fill' },
  { ko: "마련하다", slug: 'briefcase', folder: 'items', nameEn: "to get hold of, to arrange for", family: 'fill' },
  { ko: "좋지 않다", slug: 'grammar_scroll', folder: 'items', nameEn: "is not a good idea", family: 'fill' },
  { ko: "N만", slug: 'cream_waves', folder: 'items', nameEn: "N only, N and nothing besides", family: 'fill' },
  { ko: "-아/어서는", slug: 'gold_spiral', folder: 'items', nameEn: "if you go on doing it, and what follows is bad — 믿어서는, if yo", family: 'fill' },
  { ko: "-던", slug: 'oak_rings', folder: 'items', nameEn: "the one you were in the middle of", family: 'fill' },
  { ko: "-아/어야 하다", slug: 'gold_spiral', folder: 'items', nameEn: "must, have to", family: 'fill' },
  { ko: "-(으)ㄹ 수 없다", slug: 'oak_rings', folder: 'items', nameEn: "cannot", family: 'fill' },
  { ko: "-(으)려면", slug: 'cream_waves', folder: 'items', nameEn: "if you intend to", family: 'fill' },
  { ko: "정부", slug: 'government_hall', folder: 'items', nameEn: "the government", family: 'fill' },
  { ko: "정책", slug: 'government_hall', folder: 'items', nameEn: "a policy", family: 'fill' },
  { ko: "부동산 정책", slug: 'government_hall', folder: 'items', nameEn: "real-estate policy", family: 'fill' },
  { ko: "시민", slug: 'government_hall', folder: 'items', nameEn: "a citizen", family: 'fill' },
  { ko: "평가하다", slug: 'government_hall', folder: 'items', nameEn: "to judge, to rate", family: 'fill' },
  { ko: "집값", slug: 'detached_house', folder: 'items', nameEn: "house prices", family: 'fill' },
  { ko: "집값 잡기", slug: 'detached_house', folder: 'items', nameEn: "reining house prices back in", family: 'fill' },
  { ko: "서민", slug: 'elderly', folder: 'items', nameEn: "ordinary working people", family: 'fill' },
  { ko: "서민 경제", slug: 'line_graph', folder: 'items', nameEn: "the household economy of ordinary people", family: 'fill' },
  { ko: "경제", slug: 'line_graph', folder: 'items', nameEn: "an economy", family: 'fill' },
  { ko: "물가", slug: 'line_graph', folder: 'items', nameEn: "the cost of living", family: 'fill' },
  { ko: "악영향", slug: 'leather_wallet', folder: 'items', nameEn: "a harmful effect", family: 'fill' },
  { ko: "영향을 미치다", slug: 'leather_wallet', folder: 'items', nameEn: "to have an effect on", family: 'fill' },
  { ko: "찬물", slug: 'rain_cloud', folder: 'items', nameEn: "cold water", family: 'fill' },
  { ko: "찬물을 끼얹다", slug: 'rain_cloud', folder: 'items', nameEn: "to pour cold water on it — to spoil something that was going", family: 'fill' },
  { ko: "잡다", slug: 'briefcase', folder: 'items', nameEn: "to catch; to get something under control", family: 'fill' },
  { ko: "냉정하다", slug: 'red_heart', folder: 'items', nameEn: "to be cool-headed, unsentimental", family: 'fill' },
  { ko: "마음", slug: 'red_heart', folder: 'items', nameEn: "the heart, how one feels", family: 'fill' },
  { ko: "아주", slug: 'grammar_scroll', folder: 'items', nameEn: "very", family: 'fill' },
  { ko: "많이", slug: 'grammar_scroll', folder: 'items', nameEn: "a lot", family: 'fill' },
  { ko: "-는 중", slug: 'cream_waves', folder: 'items', nameEn: "in the middle of doing it", family: 'fill' },
  { ko: "N 때문에", slug: 'cream_waves', folder: 'items', nameEn: "because of N", family: 'fill' },
  { ko: "-게 하다", slug: 'oak_rings', folder: 'items', nameEn: "to make something turn out that way", family: 'fill' },
  { ko: "-기", slug: 'oak_rings', folder: 'items', nameEn: "the -ing form, turning a verb into something a headline can ", family: 'fill' },
  { ko: "개", slug: 'farm_dog', folder: 'items', nameEn: "a dog", family: 'fill' },
  { ko: "반려견", slug: 'farm_dog', folder: 'items', nameEn: "a pet dog — the word a paper uses, not 개", family: 'fill' },
  { ko: "주인", slug: 'farm_dog', folder: 'items', nameEn: "an owner", family: 'fill' },
  { ko: "키우다", slug: 'farm_dog', folder: 'items', nameEn: "to keep, to raise an animal", family: 'fill' },
  { ko: "물다", slug: 'farm_dog', folder: 'items', nameEn: "to bite", family: 'fill' },
  { ko: "물리다", slug: 'farm_dog', folder: 'items', nameEn: "to get bitten — the passive of 물다", family: 'fill' },
  { ko: "특성", slug: 'farm_dog', folder: 'items', nameEn: "a characteristic, what something is like by nature", family: 'fill' },
  { ko: "착각", slug: 'ice_pack', folder: 'items', nameEn: "a thing people are sure of and wrong about", family: 'fill' },
  { ko: "흔하다", slug: 'grammar_scroll', folder: 'items', nameEn: "to be common", family: 'fill' },
  { ko: "확신하다", slug: 'red_heart', folder: 'items', nameEn: "to be certain of it", family: 'fill' },
  { ko: "잘못되다", slug: 'ice_pack', folder: 'items', nameEn: "to be mistaken, to be wrong", family: 'fill' },
  { ko: "자신", slug: 'red_heart', folder: 'items', nameEn: "oneself, one’s own", family: 'fill' },
  { ko: "우리", slug: 'red_heart', folder: 'items', nameEn: "our", family: 'fill' },
  { ko: "사람", slug: 'elderly', folder: 'items', nameEn: "a person", family: 'fill' },
  { ko: "한번", slug: 'wall_calendar', folder: 'items', nameEn: "once, one time", family: 'fill' },
  { ko: "다시", slug: 'wall_calendar', folder: 'items', nameEn: "again", family: 'fill' },
  { ko: "안 + V", slug: 'gold_starburst', folder: 'items', nameEn: "the short negative — 안 물어요 = doesn’t bite, said out loud", family: 'fill' },
  { ko: "-지 않다", slug: 'knot_tile', folder: 'items', nameEn: "the long negative, the one papers write — 오르지 않고, 물지 않는다", family: 'fill' },
  { ko: "-다고 하다", slug: 'oak_rings', folder: 'items', nameEn: "to say that — and with 확신하다, to be sure that", family: 'fill' },
  { ko: "-기 전에", slug: 'gold_starburst', folder: 'items', nameEn: "before doing it — 키우기 전에, before you get one", family: 'fill' },
  { ko: "N에 대해서", slug: 'chevron_badge', folder: 'items', nameEn: "about N", family: 'fill' },
  { ko: "-(으)ㄴ 적이 있다", slug: 'teal_gem', folder: 'items', nameEn: "to have ever done it", family: 'fill' },
  { ko: "-(으)ㄹ 수 있다", slug: 'teal_gem', folder: 'items', nameEn: "can, might", family: 'fill' },
  { ko: "바나나", slug: 'banana_bunch', folder: 'items', nameEn: "A bunch of ripe bananas", family: 'ingredient' },
  { ko: "꿀잠", slug: 'crescent_moon', folder: 'items', nameEn: "honey sleep — a deep, sweet night. No honey involved.", family: 'fill' },
  { ko: "잠", slug: 'white_pillow', folder: 'items', nameEn: "sleep", family: 'fill' },
  { ko: "자다", slug: 'white_pillow', folder: 'items', nameEn: "to sleep", family: 'fill' },
  { ko: "숙면", slug: 'white_pillow', folder: 'items', nameEn: "sound sleep — the clinical word for the same thing", family: 'fill' },
  { ko: "푹", slug: 'white_pillow', folder: 'items', nameEn: "soundly, right through", family: 'fill' },
  { ko: "불안감", slug: 'running_shoe', folder: 'items', nameEn: "anxiety, a feeling of unease", family: 'fill' },
  { ko: "효과", slug: 'running_shoe', folder: 'items', nameEn: "an effect", family: 'fill' },
  { ko: "도움이 되다", slug: 'running_shoe', folder: 'items', nameEn: "to be a help", family: 'fill' },
  { ko: "없애다", slug: 'running_shoe', folder: 'items', nameEn: "to get rid of it", family: 'fill' },
  { ko: "속", slug: 'running_shoe', folder: 'items', nameEn: "the stomach, the insides", family: 'fill' },
  { ko: "사르르", slug: 'newspaper', folder: 'items', nameEn: "the word for melting quietly away — a headline quotes it and", family: 'fill' },
  { ko: "함께", slug: 'public_etiquette', folder: 'items', nameEn: "together with", family: 'fill' },
  { ko: "-게 해 주다", slug: 'oak_rings', folder: 'items', nameEn: "to let someone do it, to make it possible", family: 'fill' },
  { ko: "-(으)ㄹ뿐더러", slug: 'knot_tile', folder: 'items', nameEn: "not only that, but also — the written form of stacking with ", family: 'fill' },
  { ko: "-아/어야", slug: 'hourglass_ornament', folder: 'items', nameEn: "only if you — a condition, not a recommendation", family: 'fill' },
  { ko: "-(으)ㄹ 때", slug: 'teal_gem', folder: 'items', nameEn: "when you do it", family: 'fill' },
  { ko: "-는 게 좋다", slug: 'gold_spiral', folder: 'items', nameEn: "it is a good idea to", family: 'fill' },
  { ko: "N도", slug: 'cream_waves', folder: 'items', nameEn: "N as well, on top of what was already said", family: 'fill' },
  { ko: "서점", slug: 'hardcover_book', folder: 'items', nameEn: "a bookshop", family: 'fill' },
  { ko: "서점가", slug: 'hardcover_book', folder: 'items', nameEn: "the book trade — 가 as in 대학가, a whole scene rather than one ", family: 'fill' },
  { ko: "책", slug: 'hardcover_book', folder: 'items', nameEn: "a book", family: 'fill' },
  { ko: "열차", slug: 'passenger_train', folder: 'items', nameEn: "A passenger train", family: 'transport' },
  { ko: "행복 열차", slug: 'subway_station', folder: 'items', nameEn: "'Happiness Train' — the name of the book, which is why it is", family: 'fill' },
  { ko: "읽다", slug: 'hardcover_book', folder: 'items', nameEn: "to read", family: 'fill' },
  { ko: "큰 인기를 얻다", slug: 'newspaper', folder: 'items', nameEn: "to be enjoying great popularity — 인기 is popularity, 얻다 to ob", family: 'fill' },
  { ko: "10만 부나", slug: 'leather_wallet', folder: 'items', nameEn: "as many as a hundred thousand copies — 부 counts books, and 나", family: 'fill' },
  { ko: "팔리다", slug: 'leather_wallet', folder: 'items', nameEn: "to sell, to be sold", family: 'fill' },
  { ko: "판매되다", slug: 'leather_wallet', folder: 'items', nameEn: "to be on sale — the formal word for the same thing", family: 'fill' },
  { ko: "운행", slug: 'leather_wallet', folder: 'items', nameEn: "running a service", family: 'fill' },
  { ko: "-앓이", slug: 'gold_spiral', folder: 'items', nameEn: "the -앓이 ending: a craze for it. From 앓다, to be ill — but nob", family: 'fill' },
  { ko: "지금", slug: 'wall_calendar', folder: 'items', nameEn: "now", family: 'fill' },
  { ko: "현재", slug: 'wall_calendar', folder: 'items', nameEn: "at present — the written form of 지금", family: 'fill' },
  { ko: "최근", slug: 'wall_calendar', folder: 'items', nameEn: "recently", family: 'fill' },
  { ko: "이름", slug: 'newspaper', folder: 'items', nameEn: "a name", family: 'fill' },
  { ko: "시작하다", slug: 'go_outside', folder: 'items', nameEn: "to start", family: 'fill' },
  { ko: "가다", slug: 'go_outside', folder: 'items', nameEn: "to go", family: 'fill' },
  { ko: "많다", slug: 'line_graph', folder: 'items', nameEn: "to be many", family: 'fill' },
  { ko: "한 달 새", slug: 'wall_calendar', folder: 'items', nameEn: "in the space of one month — 새 is 사이, the gap between", family: 'fill' },
  { ko: "이번 달", slug: 'wall_calendar', folder: 'items', nameEn: "this month", family: 'fill' },
  { ko: "N(이)라는", slug: 'knot_tile', folder: 'items', nameEn: "called N, going by the name N", family: 'fill' },
  { ko: "-까지만", slug: 'oak_rings', folder: 'items', nameEn: "only up to — and the 만 is where the trap is", family: 'fill' },
  // The blank-filling question type, added with 문항 1-2. Weather words take the sun and
  // the tap; the four endings take kinds_types, the tile every grammar point already uses —
  // there is nothing to draw for -더니 that a learner would recognise as -더니.
  { ko: "날씨", slug: 'sun_icon', folder: 'items', nameEn: "the weather", family: 'fill' },
  { ko: "비가 오다", slug: 'rain_cloud', folder: 'items', nameEn: "to rain", family: 'fill' },
  { ko: "맑다", slug: 'sun_icon', folder: 'items', nameEn: "to be clear, to be fine", family: 'fill' },
  { ko: "개다", slug: 'sun_icon', folder: 'items', nameEn: "to clear up after rain", family: 'fill' },
  { ko: "오전", slug: 'sun_icon', folder: 'items', nameEn: "the morning, before noon", family: 'fill' },
  { ko: "-더니", slug: 'gold_starburst', folder: 'items', nameEn: "I saw A, and then B", family: 'fill' },
  { ko: "-더라도", slug: 'gold_starburst', folder: 'items', nameEn: "even if it does", family: 'fill' },
  { ko: "-아/어 가지고", slug: 'gold_spiral', folder: 'items', nameEn: "and so — the spoken -아/어서", family: 'fill' },
  { ko: "-는 대신에", slug: 'gold_starburst', folder: 'items', nameEn: "instead of doing it", family: 'fill' },
  { ko: "피곳하다", slug: 'get_scolded', folder: 'items', nameEn: "to be tired", family: 'fill' },
  { ko: "쉬다", slug: 'white_pillow', folder: 'items', nameEn: "to rest — the pillow 푹 쉬다 already uses", family: 'fill' },
  { ko: "일찍", slug: 'wall_calendar', folder: 'items', nameEn: "early", family: 'fill' },
  { ko: "너무", slug: 'grammar_scroll', folder: 'items', nameEn: "too, far too", family: 'fill' },
  { ko: "오늘", slug: 'wall_calendar', folder: 'items', nameEn: "today", family: 'fill' },
  { ko: "집", slug: 'detached_house', folder: 'items', nameEn: "home", family: 'fill' },
  { ko: "-아/어야지", slug: 'hourglass_ornament', folder: 'items', nameEn: "I really must — a resolve", family: 'fill' },
  { ko: "-(으)ㄹ걸", slug: 'knot_tile', folder: 'items', nameEn: "I should have — a regret or a guess", family: 'fill' },
  { ko: "-더라", slug: 'oak_rings', folder: 'items', nameEn: "I saw that they did", family: 'fill' },
  { ko: "-기도 하다", slug: 'oak_rings', folder: 'items', nameEn: "also does it, sometimes does it", family: 'fill' },
  { ko: "-(으)니까", slug: 'chevron_badge', folder: 'items', nameEn: "because — before a decision", family: 'fill' },
  { ko: "하고 말하다", slug: 'gold_spiral', folder: 'items', nameEn: "to say, quoting the words as spoken", family: 'fill' },
  { ko: "취업 준비생", slug: 'briefcase', folder: 'items', nameEn: "someone preparing to enter the job market", family: 'fill' },
  { ko: "이상", slug: 'line_graph', folder: 'items', nameEn: "or more, upwards of", family: 'fill' },
  { ko: "면접시험", slug: 'silver_mic', folder: 'items', nameEn: "a job interview", family: 'fill' },
  { ko: "준비", slug: 'briefcase', folder: 'items', nameEn: "preparation", family: 'fill' },
  { ko: "고민하다", slug: 'ice_pack', folder: 'items', nameEn: "to agonise over something", family: 'fill' },
  { ko: "N(으)로 말미암아", slug: 'teal_gem', folder: 'items', nameEn: "owing to N — the formal twin of (으)로 인하여", family: 'fill' },
  { ko: "N에 따라서", slug: 'chevron_badge', folder: 'items', nameEn: "depending on N — a correlation, not a cause", family: 'fill' },
  { ko: "N에도 불구하고", slug: 'chevron_badge', folder: 'items', nameEn: "despite N", family: 'fill' },
  { ko: "시험 기간", slug: 'wall_calendar', folder: 'items', nameEn: "the exam period", family: 'fill' },
  { ko: "공부하다", slug: 'school_backpack', folder: 'items', nameEn: "to study", family: 'fill' },
  { ko: "학생", slug: 'school_backpack', folder: 'items', nameEn: "a student", family: 'fill' },
  { ko: "도서관", slug: 'hardcover_book', folder: 'items', nameEn: "a library", family: 'fill' },
  { ko: "밤새도록", slug: 'crescent_moon', folder: 'items', nameEn: "all night long", family: 'fill' },
  { ko: "불을 켜다", slug: 'light_bulb', folder: 'items', nameEn: "to switch a light on", family: 'fill' },
  { ko: "켜다", slug: 'switch_on', folder: 'items', nameEn: "Switching the light on", family: 'action' },
  { ko: "-아/어 놓다", slug: 'knot_tile', folder: 'items', nameEn: "do it and leave it that way", family: 'fill' },
  { ko: "-아/어 두다", slug: 'hourglass_ornament', folder: 'items', nameEn: "do it and leave it that way — the twin of -아/어 놓다", family: 'fill' },
  { ko: "-곤 하다", slug: 'oak_rings', folder: 'items', nameEn: "used to do it, again and again", family: 'fill' },
  { ko: "비장애인", slug: 'elderly', folder: 'items', nameEn: "a person without a disability", family: 'fill' },
  { ko: "쉽지 않다", slug: 'ice_pack', folder: 'items', nameEn: "to be no easy thing", family: 'fill' },
  { ko: "몸", slug: 'stethoscope', folder: 'items', nameEn: "a body", family: 'fill' },
  { ko: "높다", slug: 'snow_peak', folder: 'items', nameEn: "to be high", family: 'fill' },
  { ko: "산", slug: 'snow_peak', folder: 'items', nameEn: "a mountain", family: 'fill' },
  { ko: "정말", slug: 'of_course', folder: 'items', nameEn: "really, truly", family: 'fill' },
  { ko: "대단하다", slug: 'performance', folder: 'items', nameEn: "to be remarkable", family: 'fill' },
  { ko: "-(으)ㄹ 텐데", slug: 'knot_tile', folder: 'items', nameEn: "it would surely be … and yet", family: 'fill' },
  { ko: "-(으)ㄹ까 봐", slug: 'teal_gem', folder: 'items', nameEn: "for fear that it might", family: 'fill' },
  { ko: "-(으)ㄹ 테니까", slug: 'knot_tile', folder: 'items', nameEn: "since it will surely be … , so do this", family: 'fill' },
  { ko: "-(으)ㄴ 데다가", slug: 'cream_waves', folder: 'items', nameEn: "on top of being …", family: 'fill' },
  { ko: "-다니", slug: 'gold_starburst', folder: 'items', nameEn: "to think that … !", family: 'fill' },
  { ko: "따뜻해지다", slug: 'sun_icon', folder: 'items', nameEn: "to get warmer", family: 'fill' },
  { ko: "푸르다", slug: 'pine_tree', folder: 'items', nameEn: "to be green, to be verdant", family: 'fill' },
  { ko: "변하다", slug: 'pine_tree', folder: 'items', nameEn: "to change into something else", family: 'fill' },
  { ko: "-아/어 가다", slug: 'hourglass_ornament', folder: 'items', nameEn: "the change carries on into the future", family: 'fill' },
  { ko: "-아/어 오다", slug: 'gold_spiral', folder: 'items', nameEn: "the change has run from the past up to now", family: 'fill' },
  { ko: "-아/어 보다", slug: 'gold_spiral', folder: 'items', nameEn: "to try doing it", family: 'fill' },
  { ko: "-아/어 대다", slug: 'hourglass_ornament', folder: 'items', nameEn: "to keep on doing it, more than one would like", family: 'fill' },
  { ko: "후식", slug: 'birthday_cake', folder: 'items', nameEn: "Dessert", family: 'fill' },
  { ko: "꼬꼬치킨", slug: 'fried_chicken', folder: 'foods', nameEn: "Kkokko Chicken", family: 'fill' },
  { ko: "엄마손식당", slug: 'cafeteria', folder: 'items', nameEn: "Mother's Hand restaurant", family: 'fill' },
  { ko: "선택하다", slug: 'gold_starburst', folder: 'items', nameEn: "to choose", family: 'fill' },
  { ko: "그중에서", slug: 'oak_rings', folder: 'items', nameEn: "among them", family: 'fill' },
  { ko: "약속", slug: 'wall_calendar', folder: 'items', nameEn: "an arrangement", family: 'fill' },
  { ko: "서로", slug: 'oak_rings', folder: 'items', nameEn: "each other", family: 'fill' },
  { ko: "지내다", slug: 'red_heart', folder: 'items', nameEn: "to get on", family: 'fill' },
  { ko: "친하다", slug: 'red_heart', folder: 'items', nameEn: "to be close", family: 'fill' },
  { ko: "빨리", slug: 'running_shoe', folder: 'items', nameEn: "quickly", family: 'fill' },
  { ko: "키가 크다", slug: 'snow_peak', folder: 'items', nameEn: "to be tall", family: 'fill' },
  { ko: "쇼핑하다", slug: 'market_stall_icon', folder: 'items', nameEn: "to shop", family: 'fill' },
  { ko: "산에 가다", slug: 'snow_peak', folder: 'items', nameEn: "to go to the mountains", family: 'fill' },
  { ko: "열심히", slug: 'running_shoe', folder: 'items', nameEn: "diligently", family: 'fill' },
  { ko: "자유 여행", slug: 'desk_globe', folder: 'items', nameEn: "independent travel", family: 'fill' },
  { ko: "패키지여행", slug: 'desk_globe', folder: 'items', nameEn: "a package tour", family: 'fill' },
  { ko: "고향", slug: 'detached_house', folder: 'items', nameEn: "home town", family: 'fill' },
  { ko: "축제", slug: 'paper_lantern', folder: 'items', nameEn: "a festival", family: 'fill' },
  { ko: "터키", slug: 'desk_globe', folder: 'items', nameEn: "Turkey", family: 'fill' },
  { ko: "전통 음식", slug: 'korean_set_meal', folder: 'foods', nameEn: "traditional food", family: 'fill' },
  { ko: "메뉴를 만들다", slug: 'empty_plate', folder: 'items', nameEn: "to make a menu", family: 'fill' },
  { ko: "의문문", slug: 'cream_waves', folder: 'items', nameEn: "a question sentence", family: 'fill' },
  { ko: "억양", slug: 'cream_waves', folder: 'items', nameEn: "intonation", family: 'fill' },
  { ko: "영화를 보다", slug: 'cinema_house', folder: 'items', nameEn: "to watch a film", family: 'fill' },
  { ko: "어른", slug: 'elderly', folder: 'items', nameEn: "an adult", family: 'fill' },
  { ko: "드시다", slug: 'empty_plate', folder: 'items', nameEn: "to eat (honorific)", family: 'fill' },
  { ko: "앞에서", slug: 'bow_greeting', folder: 'items', nameEn: "in front of", family: 'fill' },
  { ko: "젊은 사람", slug: 'running_shoe', folder: 'items', nameEn: "young people", family: 'fill' },
  { ko: "나이 든 분", slug: 'elderly', folder: 'items', nameEn: "an older person", family: 'fill' },
  { ko: "위하다", slug: 'red_heart', folder: 'items', nameEn: "for the sake of", family: 'fill' },
  { ko: "잘하다", slug: 'gold_starburst', folder: 'items', nameEn: "to be good at", family: 'fill' },
  { ko: "잘못하다", slug: 'make_mistake', folder: 'items', nameEn: "to get it wrong", family: 'fill' },
  { ko: "사진을 찍다", slug: 'box_camera', folder: 'items', nameEn: "to take a photograph", family: 'fill' },
  { ko: "담배를 피우다", slug: 'no_smoking', folder: 'items', nameEn: "to smoke", family: 'fill' },
  { ko: "수영을 하다", slug: 'water_faucet', folder: 'items', nameEn: "to swim", family: 'fill' },
  { ko: "차를 세우다", slug: 'no_parking', folder: 'items', nameEn: "to stop the car", family: 'fill' },
  { ko: "주차하다", slug: 'no_parking', folder: 'items', nameEn: "to park", family: 'fill' },
  { ko: "음료수를 마시다", slug: 'cola', folder: 'foods', nameEn: "to drink a soft drink", family: 'fill' },
  { ko: "노래를 부르다", slug: 'silver_mic', folder: 'items', nameEn: "to sing", family: 'fill' },
  { ko: "표지판", slug: 'no_smoking', folder: 'items', nameEn: "a sign", family: 'fill' },
  { ko: "큰 소리로", slug: 'make_noise', folder: 'items', nameEn: "loudly", family: 'fill' },
  { ko: "통화하다", slug: 'make_phone_call', folder: 'items', nameEn: "to talk on the phone", family: 'fill' },
  { ko: "가지고 들어가다", slug: 'school_backpack', folder: 'items', nameEn: "to take in", family: 'fill' },
  { ko: "술", slug: 'soju_bottle', folder: 'items', nameEn: "alcohol", family: 'fill' },
  { ko: "건강에 안 좋다", slug: 'stethoscope', folder: 'items', nameEn: "bad for health", family: 'fill' },
  { ko: "컴퓨터", slug: 'brown_laptop', folder: 'items', nameEn: "a computer", family: 'fill' },
  { ko: "노트북", slug: 'brown_laptop', folder: 'items', nameEn: "a laptop", family: 'fill' },
  { ko: "계산기", slug: 'pocket_calculator', folder: 'items', nameEn: "a calculator", family: 'fill' },
  { ko: "의자", slug: 'wooden_chair', folder: 'items', nameEn: "a chair", family: 'fill' },
  { ko: "아저씨", slug: 'elderly', folder: 'items', nameEn: "mister", family: 'fill' },
  { ko: "주인님", slug: 'elderly', folder: 'items', nameEn: "master", family: 'fill' },
  { ko: "집주인", slug: 'detached_house', folder: 'items', nameEn: "the landlord", family: 'fill' },
  { ko: "뭐라고 부르다", slug: 'call_by_name', folder: 'items', nameEn: "what to call someone", family: 'fill' },
  { ko: "참", slug: 'gold_starburst', folder: 'items', nameEn: "really", family: 'fill' },
  { ko: "그럼요", slug: 'of_course', folder: 'items', nameEn: "of course", family: 'fill' },
  { ko: "곤란하다", slug: 'feel_awkward', folder: 'items', nameEn: "to be in a bind", family: 'fill' },
  { ko: "어리다", slug: 'wrapped_baby', folder: 'items', nameEn: "to be young", family: 'fill' },
  { ko: "도착하다", slug: 'subway_station', folder: 'items', nameEn: "to arrive", family: 'fill' },
  { ko: "전혀", slug: 'chevron_badge', folder: 'items', nameEn: "not at all", family: 'fill' },
  { ko: "소설책", slug: 'hardcover_book', folder: 'items', nameEn: "a novel", family: 'fill' },
  { ko: "전에", slug: 'hourglass_ornament', folder: 'items', nameEn: "before", family: 'fill' },
  { ko: "외국 여행", slug: 'desk_globe', folder: 'items', nameEn: "travel abroad", family: 'fill' },
  { ko: "일본", slug: 'desk_globe', folder: 'items', nameEn: "Japan", family: 'fill' },
  { ko: "문을 열다", slug: 'exit_door', folder: 'items', nameEn: "to open", family: 'fill' },
  { ko: "들어오다", slug: 'exit_door', folder: 'items', nameEn: "to come in", family: 'fill' },
  { ko: "자리", slug: 'wooden_chair', folder: 'items', nameEn: "a seat", family: 'fill' },
  { ko: "이용하다", slug: 'use_for_free', folder: 'items', nameEn: "to use", family: 'fill' },
  { ko: "어떤", slug: 'teal_gem', folder: 'items', nameEn: "some", family: 'fill' },
  { ko: "쓰다듬다", slug: 'touch_head', folder: 'items', nameEn: "to pat", family: 'fill' },
  { ko: "영혼", slug: 'teal_gem', folder: 'items', nameEn: "the soul", family: 'fill' },
  { ko: "칭찬하다", slug: 'gold_starburst', folder: 'items', nameEn: "to compliment", family: 'fill' },
  { ko: "상관없다", slug: 'oak_rings', folder: 'items', nameEn: "not to matter", family: 'fill' },
  { ko: "만지다", slug: 'touch_head', folder: 'items', nameEn: "to touch", family: 'fill' },
  { ko: "왼손", slug: 'give_left_hand', folder: 'items', nameEn: "the left hand", family: 'fill' },
  { ko: "아이", slug: 'wrapped_baby', folder: 'items', nameEn: "a child", family: 'fill' },
  { ko: "이해하다", slug: 'knot_tile', folder: 'items', nameEn: "to understand", family: 'fill' },
  { ko: "경험", slug: 'hourglass_ornament', folder: 'items', nameEn: "an experience", family: 'fill' },
  { ko: "가방을 잃어버리다", slug: 'school_backpack', folder: 'items', nameEn: "to lose a bag", family: 'fill' },
  { ko: "기억에 남다", slug: 'red_heart', folder: 'items', nameEn: "to stay in the memory", family: 'fill' },
  { ko: "부산", slug: 'desk_globe', folder: 'items', nameEn: "Busan", family: 'fill' },
  { ko: "제주도", slug: 'desk_globe', folder: 'items', nameEn: "Jeju Island", family: 'fill' },
  { ko: "눈사람", slug: 'white_pillow', folder: 'items', nameEn: "a snowman", family: 'fill' },
  { ko: "카드를 받다", slug: 'leather_wallet', folder: 'items', nameEn: "to take a card", family: 'fill' },
  { ko: "여권", slug: 'hardcover_book', folder: 'items', nameEn: "a passport", family: 'fill' },
  { ko: "받침소리", slug: 'cream_waves', folder: 'items', nameEn: "the final-consonant sound", family: 'fill' },
  { ko: "신다", slug: 'running_shoe', folder: 'items', nameEn: "to put on shoes", family: 'fill' },
  { ko: "남다", slug: 'line_graph', folder: 'items', nameEn: "to be left over", family: 'fill' },
  { ko: "앉다", slug: 'wooden_chair', folder: 'items', nameEn: "to sit down", family: 'fill' },
  { ko: "넘어지다", slug: 'bandaged_boot', folder: 'items', nameEn: "to fall over", family: 'fill' },
  { ko: "안다", slug: 'red_heart', folder: 'items', nameEn: "to hold", family: 'fill' },
  { ko: "머리를 감다", slug: 'soap_bar', folder: 'items', nameEn: "to wash your hair", family: 'fill' },
  { ko: "참다", slug: 'ice_pack', folder: 'items', nameEn: "to endure", family: 'fill' },
  { ko: "회비", slug: 'leather_wallet', folder: 'items', nameEn: "membership dues", family: 'fill' },
  { ko: "입사 시험", slug: 'exam_papers', folder: 'items', nameEn: "the entrance exam a company sets", family: 'fill' },
  { ko: "합격하다", slug: 'diploma_scroll', folder: 'items', nameEn: "to pass an exam, to get in", family: 'fill' },
  { ko: "엿", slug: 'yeot_taffy', folder: 'foods', nameEn: "yeot — a hard, sticky taffy", family: 'fill' },
  { ko: "떡", slug: 'white_tteok', folder: 'foods', nameEn: "tteok — rice cake", family: 'fill' },
  { ko: "선물", slug: 'wrapped_gift', folder: 'items', nameEn: "a present", family: 'fill' },
  { ko: "주다", slug: 'give_two_hands', folder: 'items', nameEn: "to give", family: 'fill' },
  { ko: "-도록", slug: 'grammar_scroll', folder: 'items', nameEn: "so that it happens — subjects may differ", family: 'fill' },
  { ko: "V-게", slug: 'hourglass_ornament', folder: 'items', nameEn: "so that — the everyday twin of -도록", family: 'fill' },
  { ko: "-거든", slug: 'gold_starburst', folder: 'items', nameEn: "if it happens, when it happens", family: 'fill' },
  { ko: "-(으)려고", slug: 'cream_waves', folder: 'items', nameEn: "intending to — same subject required", family: 'fill' },
  { ko: "-(으)ㄹ 만큼", slug: 'knot_tile', folder: 'items', nameEn: "to the extent that, as much as", family: 'fill' },
  { ko: "나라", slug: 'neighboring_country', folder: 'items', nameEn: "a country", family: 'fill' },
  { ko: "미래", slug: 'hourglass_ornament', folder: 'items', nameEn: "the future", family: 'fill' },
  { ko: "교육", slug: 'schoolhouse', folder: 'items', nameEn: "education", family: 'fill' },
  { ko: "교육 정책", slug: 'system_policy', folder: 'items', nameEn: "education policy", family: 'fill' },
  { ko: "되다", slug: 'gold_spiral', folder: 'items', nameEn: "to become", family: 'fill' },
  { ko: "N에 달려 있다", slug: 'justice_scales', folder: 'items', nameEn: "to depend on N, to rest on N", family: 'fill' },
  { ko: "올해", slug: 'wall_calendar', folder: 'items', nameEn: "this year", family: 'fill' },
  { ko: "과일", slug: 'farm_apple', folder: 'items', nameEn: "fruit", family: 'fill' },
  { ko: "생산량", slug: 'brick_workshop', folder: 'items', nameEn: "output, how much is produced", family: 'fill' },
  { ko: "대체적으로", slug: 'gold_spiral', folder: 'items', nameEn: "on the whole, broadly speaking", family: 'fill' },
  { ko: "가격", slug: 'price_coins', folder: 'items', nameEn: "a price", family: 'fill' },
  { ko: "-(ㄴ/는)다면", slug: 'oak_rings', folder: 'items', nameEn: "if it were to — a supposition, not a fact", family: 'fill' },
  { ko: "-(ㄴ/는)다거나", slug: 'chevron_badge', folder: 'items', nameEn: "or it does … — offering one of several", family: 'fill' },
  { ko: "-아/어서인지", slug: 'teal_gem', folder: 'items', nameEn: "perhaps because — a cause with a hedge on it", family: 'fill' },
  { ko: "의사", slug: 'doctor', folder: 'items', nameEn: "a doctor", family: 'fill' },
  { ko: "위염", slug: 'medicine_bottle', folder: 'items', nameEn: "gastritis, an inflamed stomach", family: 'fill' },
  { ko: "식사량", slug: 'servings', folder: 'items', nameEn: "how much one eats", family: 'fill' },
  { ko: "조절하다", slug: 'justice_scales', folder: 'items', nameEn: "to regulate, to keep in check", family: 'fill' },
  { ko: "N에게", slug: 'indigo_diamond', folder: 'items', nameEn: "to N — the marker a causative takes", family: 'fill' },
  { ko: "-게 되다", slug: 'coral_ring', folder: 'items', nameEn: "to come to be that way, with nobody making it happen", family: 'fill' },
  { ko: "꽃병", slug: 'celadon_vase', folder: 'items', nameEn: "a vase", family: 'fill' },
  { ko: "개나리", slug: 'forsythia_spray', folder: 'items', nameEn: "forsythia — the first shrub of spring", family: 'fill' },
  { ko: "꽃", slug: 'pink_blossom', folder: 'items', nameEn: "a flower", family: 'fill' },
  { ko: "꽂다", slug: 'celadon_vase', folder: 'items', nameEn: "to stand something upright in", family: 'fill' },
  { ko: "책상", slug: 'wooden_study_desk', folder: 'items', nameEn: "a desk", family: 'fill' },
  { ko: "놓다", slug: 'wooden_study_desk', folder: 'items', nameEn: "to put something down and leave it", family: 'fill' },
  { ko: "봄", slug: 'sun_icon', folder: 'items', nameEn: "spring", family: 'fill' },
  { ko: "-아/어다가", slug: 'violet_petals', folder: 'items', nameEn: "do it, then take it somewhere and do the next thing", family: 'fill' },
  { ko: "-(으)ㄹ 뿐", slug: 'grammar_scroll', folder: 'items', nameEn: "only that, and nothing more", family: 'fill' },
  { ko: "-았/었기에", slug: 'hourglass_ornament', folder: 'items', nameEn: "because it did — a formal, written cause", family: 'fill' },
  { ko: "-(으)ㄴ 바람에", slug: 'gold_starburst', folder: 'items', nameEn: "because of it — and what followed was unwelcome", family: 'fill' },
  { ko: "국가", slug: 'government_hall', folder: 'items', nameEn: "a state, a nation", family: 'fill' },
  { ko: "상황", slug: 'line_graph', folder: 'items', nameEn: "the situation", family: 'fill' },
  { ko: "나아지다", slug: 'gold_spiral', folder: 'items', nameEn: "to get better", family: 'fill' },
  { ko: "안타깝다", slug: 'get_scolded', folder: 'items', nameEn: "to be a shame, to be painful to watch", family: 'fill' },
  { ko: "-(으)ㄹ 따름이다", slug: 'cream_waves', folder: 'items', nameEn: "it is only that, and nothing more", family: 'fill' },
  { ko: "-(으)ㄹ 뿐이다", slug: 'knot_tile', folder: 'items', nameEn: "it is only that — the twin of -(으)ㄹ 따름이다", family: 'fill' },
  { ko: "-(으)ㄹ 정도이다", slug: 'gold_spiral', folder: 'items', nameEn: "it is to the extent that", family: 'fill' },
  { ko: "-(으)ㄹ 리가 없다", slug: 'oak_rings', folder: 'items', nameEn: "there is no way it could be", family: 'fill' },
  { ko: "행동", slug: 'get_scolded', folder: 'items', nameEn: "behaviour, the way someone acts", family: 'fill' },
  { ko: "간호하다", slug: 'stethoscope', folder: 'items', nameEn: "to nurse someone", family: 'fill' },
  { ko: "어머니", slug: 'mother_portrait', folder: 'items', nameEn: "mother", family: 'fill' },
  { ko: "손", slug: 'receive_one_hand', folder: 'items', nameEn: "a hand", family: 'fill' },
  { ko: "사랑", slug: 'red_heart', folder: 'items', nameEn: "love", family: 'fill' },
  { ko: "느껴지다", slug: 'red_heart', folder: 'items', nameEn: "to be felt — passive, takes 이/가", family: 'fill' },
  { ko: "-(으)려야 -(으)ㄹ 수 없다", slug: 'chevron_badge', folder: 'items', nameEn: "try as you might, you cannot", family: 'fill' },
  { ko: "-아/어도", slug: 'teal_gem', folder: 'items', nameEn: "even if you do", family: 'fill' },
  { ko: "-는 통에", slug: 'indigo_diamond', folder: 'items', nameEn: "in the confusion of it", family: 'fill' },
  { ko: "-는 듯하다", slug: 'coral_ring', folder: 'items', nameEn: "to seem to be doing it", family: 'fill' },
  { ko: "대학교", slug: 'campus_building', folder: 'items', nameEn: "a university", family: 'fill' },
  { ko: "유학생", slug: 'desk_globe', folder: 'items', nameEn: "a student studying abroad", family: 'fill' },
  { ko: "날로", slug: 'line_graph', folder: 'items', nameEn: "day by day, more so every day", family: 'fill' },
  { ko: "증가하다", slug: 'line_graph', folder: 'items', nameEn: "to increase — the formal word", family: 'fill' },
  { ko: "한국", slug: 'our_country', folder: 'items', nameEn: "Korea", family: 'fill' },
  { ko: "-고자", slug: 'violet_petals', folder: 'items', nameEn: "in order to — the written twin of -기 위해서", family: 'fill' },
  { ko: "-고서", slug: 'grammar_scroll', folder: 'items', nameEn: "having done it, and then", family: 'fill' },
  { ko: "-아/어 봤자", slug: 'hourglass_ornament', folder: 'items', nameEn: "even if you try, it will get you nowhere", family: 'fill' },
  { ko: "-자마자", slug: 'gold_starburst', folder: 'items', nameEn: "the moment it happens", family: 'fill' },
  { ko: "무슨 일이든", slug: 'briefcase', folder: 'items', nameEn: "whatever the task", family: 'fill' },
  { ko: "처음", slug: 'to_begin', folder: 'items', nameEn: "the first time, the beginning", family: 'fill' },
  { ko: "-(으)ㄴ/는 법이다", slug: 'justice_scales', folder: 'items', nameEn: "that is the way of things", family: 'fill' },
  { ko: "-기 마련이다", slug: 'justice_scales', folder: 'items', nameEn: "it is bound to be", family: 'fill' },
  { ko: "-아/어도 되다", slug: 'cream_waves', folder: 'items', nameEn: "it is all right to, you may", family: 'fill' },
  { ko: "-기만 하다", slug: 'knot_tile', folder: 'items', nameEn: "it does nothing but", family: 'fill' },
  { ko: "-(으)ㄴ 모양이다", slug: 'gold_spiral', folder: 'items', nameEn: "it looks as though", family: 'fill' },
  // Learner-supplied volunteer-recruitment and chart vocabulary. These use
  // semantic fallbacks until their dedicated TOPIK manifest artwork is reviewed.
  { ko: '그림책', slug: 'hardcover_book', folder: 'items', nameEn: 'Picture book', family: 'education' },
  { ko: '자원봉사자', slug: 'red_heart', folder: 'items', nameEn: 'Volunteer worker', family: 'people' },
  { ko: '모집', slug: 'newspaper', folder: 'items', nameEn: 'Recruitment', family: 'abstract' },
  { ko: '희망', slug: 'gold_starburst', folder: 'items', nameEn: 'Hope', family: 'abstract' },
  { ko: '자격', slug: 'contract_seal', folder: 'items', nameEn: 'Eligibility', family: 'abstract' },
  { ko: '고등학생', slug: 'school_backpack', folder: 'items', nameEn: 'High school student', family: 'people' },
  { ko: '또는', slug: 'knot_tile', folder: 'items', nameEn: 'Or; alternatively', family: 'grammar' },
  { ko: '신청 방법', slug: 'homework_notebook', folder: 'items', nameEn: 'How to apply', family: 'abstract' },
  { ko: '홈페이지', slug: 'wooden_tv', folder: 'items', nameEn: 'Website or homepage', family: 'technology' },
  { ko: '활동 기간', slug: 'wall_calendar', folder: 'items', nameEn: 'Activity period', family: 'time' },
  { ko: '참여하다', slug: 'red_heart', folder: 'items', nameEn: 'To participate', family: 'action' },
  { ko: '고려 사항', slug: 'grammar_scroll', folder: 'items', nameEn: 'A consideration', family: 'abstract' },
  { ko: '기준', slug: 'justice_scales', folder: 'items', nameEn: 'A criterion or standard', family: 'abstract' },
  { ko: '규모', slug: 'moving_boxes', folder: 'items', nameEn: 'Scale or size', family: 'abstract' },
  { ko: '비율', slug: 'line_graph', folder: 'items', nameEn: 'A ratio or proportion', family: 'data' },
  { ko: '전체', slug: 'kinds_types', folder: 'items', nameEn: 'The whole or total', family: 'data' },
  { ko: "노인", slug: 'elderly', folder: 'items', nameEn: "an older person", family: 'fill' },
  { ko: "취업", slug: 'restaurant_staff', folder: 'items', nameEn: "getting work, employment", family: 'fill' },
  { ko: "설문 조사", slug: 'newspaper', folder: 'items', nameEn: "a survey", family: 'fill' },
  { ko: "허락하다", slug: 'of_course', folder: 'items', nameEn: "to permit, to allow", family: 'fill' },
  { ko: "일하다", slug: 'briefcase', folder: 'items', nameEn: "to work", family: 'fill' },
  { ko: "응답", slug: 'silver_mic', folder: 'items', nameEn: "a reply given to a survey", family: 'fill' },
  { ko: "과반수", slug: 'line_graph', folder: 'items', nameEn: "more than half", family: 'fill' },
  { ko: "넘다", slug: 'gold_spiral', folder: 'items', nameEn: "to go past, to exceed", family: 'fill' },
  { ko: "-는 한", slug: 'kinds_types', folder: 'items', nameEn: "for as long as it holds", family: 'fill' },
  { ko: "-길래", slug: 'kinds_types', folder: 'items', nameEn: "seeing that it was so, I …", family: 'fill' },
  { ko: "-(으)ㄹ지라도", slug: 'kinds_types', folder: 'items', nameEn: "even if it should", family: 'fill' },
  { ko: "-ㄴ/는다고 해도", slug: 'kinds_types', folder: 'items', nameEn: "even supposing it does", family: 'fill' },
  { ko: "-고 싶다", slug: 'kinds_types', folder: 'items', nameEn: "to want to", family: 'fill' },
  // Dedicated daily-life illustrations: preserve the shared style, not shared subjects.
  { ko: '걷다', slug: 'walking_farmer', folder: 'items', nameEn: 'Walking farmer', family: 'action' },
  { ko: '발', slug: 'bare_foot', folder: 'items', nameEn: 'Foot', family: 'health' },
  { ko: '선풍기', slug: 'desk_fan', folder: 'items', nameEn: 'Electric fan', family: 'household' },
  { ko: '틀다', slug: 'turn_radio_dial', folder: 'items', nameEn: 'Turning on a radio', family: 'action' },
  { ko: '더럽다', slug: 'dirty_laundry', folder: 'items', nameEn: 'Dirty laundry', family: 'household' },
  { ko: '이불', slug: 'folded_quilt', folder: 'items', nameEn: 'Quilt', family: 'household' },
  { ko: '맡기다', slug: 'entrust_laundry', folder: 'items', nameEn: 'Entrusting laundry to a shopkeeper', family: 'action' },
  { ko: '세탁소', slug: 'laundry_shop', folder: 'items', nameEn: "Dry cleaner's shop", family: 'place' },
  { ko: '활기차다', slug: 'lively_farmer', folder: 'items', nameEn: 'A lively farmer full of energy', family: 'action' },
  // The 안내문 question: a recruitment poster and the words it prints.
  { ko: '어린이', slug: 'junior', folder: 'items', nameEn: 'A child', family: 'people' },
  { ko: '대학생', slug: 'school_backpack', folder: 'items', nameEn: 'University student', family: 'people' },
  { ko: '봉사자', slug: 'kindness', folder: 'items', nameEn: 'A volunteer', family: 'people' },
  { ko: '신청', slug: 'homework_notebook', folder: 'items', nameEn: 'An application', family: 'abstract' },
  { ko: '모집 기간', slug: 'wall_calendar', folder: 'items', nameEn: 'The application window', family: 'time' },
  { ko: '인주어린이도서관', slug: 'brick_workshop', folder: 'items', nameEn: 'Inju Children\'s Library', family: 'place' },
  { ko: '가능', slug: 'keep_rules', folder: 'items', nameEn: 'Possible; eligible', family: 'abstract' },
  { ko: '한국어', slug: 'grammar_scroll', folder: 'items', nameEn: 'The Korean language', family: 'abstract' },
  { ko: '선물하다', slug: 'give_left_hand', folder: 'items', nameEn: 'To give as a present', family: 'action' },
  { ko: '두 달', slug: 'crescent_moon', folder: 'items', nameEn: 'Two months', family: 'time' },
  { ko: '-아/어 주다', slug: 'receive_one_hand', folder: 'items', nameEn: 'To do it for someone else', family: 'grammar' },
  // The 도표 question: choosing a travel agency, and the words the chart prints.
  { ko: '여행사', slug: 'estate_broker', folder: 'items', nameEn: 'Travel agency', family: 'place' },
  { ko: '여행 상품', slug: 'paris_eiffel_tower', folder: 'items', nameEn: 'A travel package', family: 'place' },
  { ko: '이용 후기', slug: 'recommend', folder: 'items', nameEn: 'Customer reviews', family: 'abstract' },
  { ko: '회사', slug: 'briefcase', folder: 'items', nameEn: 'A company', family: 'place' },
  { ko: '성인', slug: 'senior', folder: 'items', nameEn: 'An adult', family: 'people' },
  { ko: '남녀', slug: 'same_age', folder: 'items', nameEn: 'Men and women', family: 'people' },
  { ko: '다양성', slug: 'kinds_types', folder: 'items', nameEn: 'Variety', family: 'abstract' },
  { ko: '적다', slug: 'be_empty', folder: 'items', nameEn: 'To be few', family: 'abstract' },
  { ko: '설문 대상', slug: 'silver_mic', folder: 'items', nameEn: 'Survey respondents', family: 'data' },
  { ko: '두 배', slug: 'pocket_calculator', folder: 'items', nameEn: 'Twice as many', family: 'data' },
  // The 우표 박물관 passage. Stand-in tiles: existing art reused, not drawn for these words.
  { ko: '우표', slug: 'prescription_slip', folder: 'items', nameEn: 'A postage stamp', family: 'culture' },
  { ko: '박물관', slug: 'traditional_hanok', folder: 'items', nameEn: 'A museum', family: 'place' },
  { ko: '역사', slug: 'oak_rings', folder: 'items', nameEn: 'History', family: 'abstract' },
  { ko: '역사실', slug: 'cinema_house', folder: 'items', nameEn: 'A history room', family: 'place' },
  { ko: '체험실', slug: 'sports_facility', folder: 'items', nameEn: 'A hands-on room', family: 'place' },
  { ko: '사진', slug: 'box_camera', folder: 'items', nameEn: 'A photograph', family: 'culture' },
  { ko: '편지', slug: 'announcement', folder: 'items', nameEn: 'A letter', family: 'culture' },
  { ko: '우체통', slug: 'moving_boxes', folder: 'items', nameEn: 'A postbox', family: 'culture' },
  { ko: '인기를 끌다', slug: 'famous', folder: 'items', nameEn: 'To draw a crowd', family: 'abstract' },
  { ko: '지난달', slug: 'already', folder: 'items', nameEn: 'Last month', family: 'time' },
  { ko: '일 년 뒤', slug: 'hourglass_ornament', folder: 'items', nameEn: 'A year later', family: 'time' },
  { ko: '일 년 전', slug: 'after_a_long_time', folder: 'items', nameEn: 'A year ago', family: 'time' },
  { ko: '운영', slug: 'system_policy', folder: 'items', nameEn: 'The running of a place', family: 'abstract' },
  { ko: '한눈에', slug: 'let_me_see', folder: 'items', nameEn: 'In a single glance', family: 'abstract' },
  { ko: '향기', slug: 'violet_petals', folder: 'items', nameEn: 'A scent', family: 'abstract' },
  { ko: '나무', slug: 'wooden_chair', folder: 'items', nameEn: 'Wood', family: 'household' },
  { ko: '받다', slug: 'leather_wallet', folder: 'items', nameEn: 'To receive', family: 'action' },
  { ko: '맡다', slug: 'flavor', folder: 'items', nameEn: 'To smell', family: 'action' },
  { ko: '들어가다', slug: 'subway_access', folder: 'items', nameEn: 'To go in', family: 'action' },
  { ko: '만들다', slug: 'kitchen_stove', folder: 'items', nameEn: 'To make', family: 'action' },
  { ko: '쓰다', slug: 'brown_laptop', folder: 'items', nameEn: 'To write', family: 'action' },
  { ko: '보내다', slug: 'delivery_bag', folder: 'items', nameEn: 'To send', family: 'action' },
  { ko: '느리다', slug: 'be_late', folder: 'items', nameEn: 'To be slow', family: 'abstract' },
  // The mountain rescue passage. Stand-in tiles: existing art reused, not drawn for these.
  { ko: '휴일', slug: 'weekend', folder: 'items', nameEn: 'A day off', family: 'time' },
  { ko: '경찰', slug: 'justice_scales', folder: 'items', nameEn: 'The police', family: 'people' },
  { ko: '경위', slug: 'chevron_badge', folder: 'items', nameEn: 'A police lieutenant', family: 'people' },
  { ko: '등산객', slug: 'go_outside', folder: 'items', nameEn: 'A hiker', family: 'people' },
  { ko: '정상', slug: 'gold_spiral', folder: 'items', nameEn: 'A summit', family: 'place' },
  { ko: '중턱', slug: 'balcony_rail', folder: 'items', nameEn: 'Halfway up', family: 'place' },
  { ko: '대피소', slug: 'gosiwon_room', folder: 'items', nameEn: 'A shelter', family: 'place' },
  { ko: '구조하다', slug: 'yield_seat', folder: 'items', nameEn: 'To rescue', family: 'action' },
  { ko: '구조대', slug: 'public_etiquette', folder: 'items', nameEn: 'A rescue team', family: 'people' },
  { ko: '여성', slug: 'bow_greeting', folder: 'items', nameEn: 'A woman', family: 'people' },
  { ko: '쓰러지다', slug: 'bandaged_boot', folder: 'items', nameEn: 'To collapse', family: 'health' },
  { ko: '발견하다', slug: 'eyeglasses', folder: 'items', nameEn: 'To spot', family: 'action' },
  { ko: '체온', slug: 'thermometer', folder: 'items', nameEn: 'Body temperature', family: 'health' },
  { ko: '겉옷', slug: 'taekwondo_dobok', folder: 'items', nameEn: 'An outer coat', family: 'household' },
  { ko: '벗다', slug: 'drop_honorifics', folder: 'items', nameEn: 'To take off', family: 'action' },
  { ko: '덮다', slug: 'heat_patch', folder: 'items', nameEn: 'To cover over', family: 'action' },
  { ko: '신고하다', slug: 'make_phone_call', folder: 'items', nameEn: 'To report it', family: 'action' },
  { ko: '이후', slug: 'knot_tile', folder: 'items', nameEn: 'After that', family: 'abstract' },
  { ko: '차량', slug: 'subway_station', folder: 'items', nameEn: 'A vehicle', family: 'place' },
  { ko: '업다', slug: 'senior_preference', folder: 'items', nameEn: 'To carry on the back', family: 'action' },
  { ko: '뛰다', slug: 'running_shoe', folder: 'items', nameEn: 'To run', family: 'action' },
  { ko: '내려가다', slug: 'cream_waves', folder: 'items', nameEn: 'To go down', family: 'action' },
  { ko: '이송되다', slug: 'stethoscope', folder: 'items', nameEn: 'To be taken to hospital', family: 'health' },
  { ko: '치료', slug: 'medicine_bottle', folder: 'items', nameEn: 'Medical treatment', family: 'health' },
  { ko: '되찾다', slug: 'vitamin_bottle', folder: 'items', nameEn: 'To get it back', family: 'action' },
  { ko: '이동하다', slug: 'swap_seats', folder: 'items', nameEn: 'To move place', family: 'action' },
  // 순서 배열 questions 13-15. Stand-in tiles: existing art reused, not drawn for these.
  { ko: '복숭아', slug: 'garden_strawberry', folder: 'items', nameEn: 'A peach', family: 'food' },
  { ko: '껍질', slug: 'farm_apple', folder: 'items', nameEn: 'Fruit skin', family: 'food' },
  { ko: '껍질째', slug: 'eat_food', folder: 'items', nameEn: 'Skin and all', family: 'food' },
  { ko: '딱딱하다', slug: 'cracked_tooth', folder: 'items', nameEn: 'To be hard', family: 'food' },
  { ko: '식감', slug: 'suit_ones_taste', folder: 'items', nameEn: 'Mouthfeel', family: 'food' },
  { ko: '얇다', slug: 'tissue_box', folder: 'items', nameEn: 'To be thin', family: 'abstract' },
  { ko: '부드럽다', slug: 'soap_bar', folder: 'items', nameEn: 'To be soft', family: 'abstract' },
  { ko: '소개되다', slug: 'first_meeting', folder: 'items', nameEn: 'To be introduced', family: 'action' },
  { ko: 'N에 비해', slug: 'similar', folder: 'items', nameEn: 'Compared with', family: 'grammar' },
  { ko: '이르다', slug: 'in_advance', folder: 'items', nameEn: 'To be early', family: 'time' },
  { ko: '시기', slug: 'always', folder: 'items', nameEn: 'A period', family: 'time' },
  { ko: '장점', slug: 'admission_discount', folder: 'items', nameEn: 'An advantage', family: 'abstract' },
  { ko: '결합하다', slug: 'wedding_rings', folder: 'items', nameEn: 'To combine', family: 'action' },
  { ko: '밤새', slug: 'candlelit_table', folder: 'items', nameEn: 'All night', family: 'time' },
  { ko: '소리', slug: 'human_ear', folder: 'items', nameEn: 'A sound', family: 'abstract' },
  { ko: '울다', slug: 'eye_drops', folder: 'items', nameEn: 'To cry', family: 'action' },
  { ko: '울음소리', slug: 'make_noise', folder: 'items', nameEn: 'The sound of crying', family: 'abstract' },
  { ko: '오히려', slug: 'surprise_burst', folder: 'items', nameEn: 'On the contrary', family: 'grammar' },
  { ko: '나서다', slug: 'around_here', folder: 'items', nameEn: 'To set out', family: 'action' },
  { ko: '옆집', slug: 'hanok_house', folder: 'items', nameEn: 'Next door', family: 'place' },
  { ko: '만나다', slug: 'call_by_name', folder: 'items', nameEn: 'To meet', family: 'action' },
  { ko: '달래다', slug: 'paper_lantern', folder: 'items', nameEn: 'To soothe', family: 'action' },
  { ko: '이웃', slug: 'neighboring_country', folder: 'items', nameEn: 'A neighbour', family: 'people' },
  { ko: '온라인', slug: 'desk_globe', folder: 'items', nameEn: 'Online', family: 'technology' },
  { ko: '가구', slug: 'green_sofa', folder: 'items', nameEn: 'Furniture', family: 'household' },
  { ko: '구매', slug: 'place_order', folder: 'items', nameEn: 'A purchase', family: 'abstract' },
  { ko: '반품', slug: 'empty_plate', folder: 'items', nameEn: 'Sending goods back', family: 'abstract' },
  { ko: '사례', slug: 'line_graph', folder: 'items', nameEn: 'An instance', family: 'data' },
  { ko: '그런데', slug: 'complicated', folder: 'items', nameEn: 'However', family: 'grammar' },
  { ko: '비싸다', slug: 'wasted_money', folder: 'items', nameEn: 'To be expensive', family: 'abstract' },
  { ko: '비용', slug: 'coral_ring', folder: 'items', nameEn: 'A cost', family: 'abstract' },
  { ko: '피해를 보다', slug: 'get_scolded', folder: 'items', nameEn: 'To lose out', family: 'abstract' },
  { ko: '소비자', slug: 'order_food', folder: 'items', nameEn: 'A consumer', family: 'people' },
  { ko: '따라서', slug: 'contract_seal', folder: 'items', nameEn: 'Therefore', family: 'grammar' },
  { ko: '확인하다', slug: 'reservation', folder: 'items', nameEn: 'To check', family: 'action' },
  { ko: '업체', slug: 'pizza_nara_shop', folder: 'items', nameEn: 'A firm', family: 'place' },
  { ko: '까다롭다', slug: 'bitter_taste', folder: 'items', nameEn: 'To be demanding', family: 'abstract' },
  { ko: '내세우다', slug: 'no_smoking', folder: 'items', nameEn: 'To put forward', family: 'action' },
  { ko: '거절하다', slug: 'no_cell_phones', folder: 'items', nameEn: 'To refuse', family: 'action' },
  { ko: '경우', slug: 'first_time', folder: 'items', nameEn: 'A case', family: 'abstract' },
  { ko: '발생하다', slug: 'make_mistake', folder: 'items', nameEn: 'To occur', family: 'action' },
  { ko: '-(으)면서', slug: 'turn_head_drink', folder: 'items', nameEn: 'As one thing, so the other', family: 'grammar' }
];
if (typeof VOCAB_ART_ROWS !== 'undefined' && Array.isArray(VOCAB_ART_ROWS)) {
  VOCAB_ART_MORE_ROWS.forEach(function (r) {
    if (!VOCAB_ART_ROWS.some(function (x) { return x && x.ko === r.ko; })) VOCAB_ART_ROWS.push(r);
  });
}
if (typeof window !== 'undefined') {
  window.VOCAB_ART_MORE_ROWS = VOCAB_ART_MORE_ROWS;
}

// BEGIN REVIEWED TOPIK ART
// Generated from docs/topik-art-manifest.json by scripts/apply_topik_art.js.
const TOPIK_VOCAB_ART_ROWS = [
  {
    "ko": "재래시장",
    "slug": "market_stall_icon",
    "folder": "items",
    "nameEn": "a traditional market",
    "family": "topik-vocabulary"
  },
  {
    "ko": "썰렁하다",
    "slug": "topik_deserted_market",
    "folder": "items",
    "nameEn": "to be deserted, to have no custom; (of air) chilly",
    "family": "topik-vocabulary"
  },
  {
    "ko": "배달",
    "slug": "delivery_scooter",
    "folder": "items",
    "nameEn": "delivery",
    "family": "topik-vocabulary"
  },
  {
    "ko": "출구",
    "slug": "exit_door",
    "folder": "items",
    "nameEn": "a way out of trouble; an exit",
    "family": "topik-vocabulary"
  },
  {
    "ko": "모색",
    "slug": "topik_search_for_way",
    "folder": "items",
    "nameEn": "a search for a way forward",
    "family": "topik-vocabulary"
  },
  {
    "ko": "출입구",
    "slug": "topik_gateway",
    "folder": "items",
    "nameEn": "an entrance and exit, a gateway",
    "family": "topik-vocabulary"
  },
  {
    "ko": "여러 곳",
    "slug": "topik_several_places",
    "folder": "items",
    "nameEn": "several places",
    "family": "topik-vocabulary"
  },
  {
    "ko": "찾다",
    "slug": "topik_visit_place",
    "folder": "items",
    "nameEn": "to visit a place; to look for",
    "family": "topik-vocabulary"
  },
  {
    "ko": "직접",
    "slug": "topik_in_person",
    "folder": "items",
    "nameEn": "in person, directly",
    "family": "topik-vocabulary"
  },
  {
    "ko": "추워지다",
    "slug": "topik_turn_cold",
    "folder": "items",
    "nameEn": "to turn cold",
    "family": "topik-vocabulary"
  },
  {
    "ko": "손님",
    "slug": "topik_customer",
    "folder": "items",
    "nameEn": "a customer",
    "family": "topik-vocabulary"
  },
  {
    "ko": "줄다",
    "slug": "topik_decrease_count",
    "folder": "items",
    "nameEn": "to fall, to drop off",
    "family": "topik-vocabulary"
  },
  {
    "ko": "서비스",
    "slug": "service_bell",
    "folder": "items",
    "nameEn": "a service",
    "family": "topik-vocabulary"
  },
  {
    "ko": "통하다",
    "slug": "topik_go_through",
    "folder": "items",
    "nameEn": "to go through, to be by way of",
    "family": "topik-vocabulary"
  },
  {
    "ko": "경기",
    "slug": "topik_business_conditions",
    "folder": "items",
    "nameEn": "business conditions, how trade is going",
    "family": "topik-vocabulary"
  },
  {
    "ko": "회복",
    "slug": "topik_economic_recovery",
    "folder": "items",
    "nameEn": "a recovery",
    "family": "topik-vocabulary"
  },
  {
    "ko": "노력",
    "slug": "topik_effort",
    "folder": "items",
    "nameEn": "effort",
    "family": "topik-vocabulary"
  },
  {
    "ko": "상품",
    "slug": "topik_merchandise",
    "folder": "items",
    "nameEn": "goods, a product",
    "family": "topik-vocabulary"
  },
  {
    "ko": "구매하다",
    "slug": "topik_purchase",
    "folder": "items",
    "nameEn": "to buy, to purchase",
    "family": "topik-vocabulary"
  },
  {
    "ko": "원하다",
    "slug": "topik_want",
    "folder": "items",
    "nameEn": "to want",
    "family": "topik-vocabulary"
  },
  {
    "ko": "많아지다",
    "slug": "topik_become_numerous",
    "folder": "items",
    "nameEn": "to become more numerous — 많다 with the change ending -아/어지다",
    "family": "topik-vocabulary"
  },
  {
    "ko": "신문 기사",
    "slug": "newspaper",
    "folder": "items",
    "nameEn": "a newspaper article",
    "family": "topik-vocabulary"
  },
  {
    "ko": "기사",
    "slug": "topik_news_article",
    "folder": "items",
    "nameEn": "an article, a news report",
    "family": "topik-vocabulary"
  },
  {
    "ko": "제목",
    "slug": "topik_headline",
    "folder": "items",
    "nameEn": "a headline, a title",
    "family": "topik-vocabulary"
  },
  {
    "ko": "설명하다",
    "slug": "topik_explain",
    "folder": "items",
    "nameEn": "to explain",
    "family": "topik-vocabulary"
  },
  {
    "ko": "눈으로 먹다",
    "slug": "topik_eat_with_eyes",
    "folder": "items",
    "nameEn": "to eat with the eyes — to enjoy food by looking at it",
    "family": "topik-vocabulary"
  },
  {
    "ko": "귀로 맛보다",
    "slug": "topik_taste_with_ears",
    "folder": "items",
    "nameEn": "to taste with the ears — to enjoy food through its sounds",
    "family": "topik-vocabulary"
  },
  {
    "ko": "맛보다",
    "slug": "topik_taste_food",
    "folder": "items",
    "nameEn": "to taste",
    "family": "topik-vocabulary"
  },
  {
    "ko": "음식",
    "slug": "topik_prepared_food",
    "folder": "items",
    "nameEn": "food",
    "family": "topik-vocabulary"
  },
  {
    "ko": "모양",
    "slug": "topik_shapes",
    "folder": "items",
    "nameEn": "the shape of a thing",
    "family": "topik-vocabulary"
  },
  {
    "ko": "색깔",
    "slug": "paint_palette",
    "folder": "items",
    "nameEn": "colour",
    "family": "topik-vocabulary"
  },
  {
    "ko": "시대",
    "slug": "topik_era",
    "folder": "items",
    "nameEn": "an age, an era",
    "family": "topik-vocabulary"
  },
  {
    "ko": "천국",
    "slug": "topik_heaven_abundance",
    "folder": "items",
    "nameEn": "heaven — in a headline, \"awash with\"",
    "family": "topik-vocabulary"
  },
  {
    "ko": "요리 프로그램",
    "slug": "topik_cooking_programme",
    "folder": "items",
    "nameEn": "a cooking programme",
    "family": "topik-vocabulary"
  },
  {
    "ko": "텔레비전 프로그램",
    "slug": "wooden_tv",
    "folder": "items",
    "nameEn": "a television programme",
    "family": "topik-vocabulary"
  },
  {
    "ko": "실제",
    "slug": "topik_actual_thing",
    "folder": "items",
    "nameEn": "the real thing, actual",
    "family": "topik-vocabulary"
  },
  {
    "ko": "보여주다",
    "slug": "topik_show_something",
    "folder": "items",
    "nameEn": "to show",
    "family": "topik-vocabulary"
  },
  {
    "ko": "즐기다",
    "slug": "topik_enjoy",
    "folder": "items",
    "nameEn": "to enjoy",
    "family": "topik-vocabulary"
  },
  {
    "ko": "관련되다",
    "slug": "topik_related",
    "folder": "items",
    "nameEn": "to be related to",
    "family": "topik-vocabulary"
  },
  {
    "ko": "요즘",
    "slug": "topik_these_days",
    "folder": "items",
    "nameEn": "these days",
    "family": "topik-vocabulary"
  },
  {
    "ko": "중요해지다",
    "slug": "topik_become_important",
    "folder": "items",
    "nameEn": "to become important",
    "family": "topik-vocabulary"
  },
  {
    "ko": "색조 화장품",
    "slug": "topik_colour_cosmetics",
    "folder": "items",
    "nameEn": "colour cosmetics — makeup, as against skincare",
    "family": "topik-vocabulary"
  },
  {
    "ko": "화장품",
    "slug": "lipstick_tube",
    "folder": "items",
    "nameEn": "cosmetics",
    "family": "topik-vocabulary"
  },
  {
    "ko": "화장을 하다",
    "slug": "topik_apply_makeup",
    "folder": "items",
    "nameEn": "to wear makeup",
    "family": "topik-vocabulary"
  },
  {
    "ko": "외모",
    "slug": "hand_mirror",
    "folder": "items",
    "nameEn": "a person's looks",
    "family": "topik-vocabulary"
  },
  {
    "ko": "가꾸다",
    "slug": "topik_tend_garden",
    "folder": "items",
    "nameEn": "to tend, to groom — used of looks and of gardens alike",
    "family": "topik-vocabulary"
  },
  {
    "ko": "불티",
    "slug": "topik_flying_sparks",
    "folder": "items",
    "nameEn": "a spark — in a headline, short for 불티나다, to sell out fast",
    "family": "topik-vocabulary"
  },
  {
    "ko": "관리",
    "slug": "topik_management",
    "folder": "items",
    "nameEn": "looking after something; also being in charge of it",
    "family": "topik-vocabulary"
  },
  {
    "ko": "늘어나다",
    "slug": "topik_stretch_longer",
    "folder": "items",
    "nameEn": "to grow, to stretch out — of a number, and of time too",
    "family": "topik-vocabulary"
  },
  {
    "ko": "다양하다",
    "slug": "diversity_spread",
    "folder": "items",
    "nameEn": "to be varied",
    "family": "topik-vocabulary"
  },
  {
    "ko": "필요가 있다",
    "slug": "topik_need_to",
    "folder": "items",
    "nameEn": "there is a need to",
    "family": "topik-vocabulary"
  },
  {
    "ko": "주로",
    "slug": "topik_mainly",
    "folder": "items",
    "nameEn": "mainly",
    "family": "topik-vocabulary"
  },
  {
    "ko": "담당하다",
    "slug": "topik_in_charge",
    "folder": "items",
    "nameEn": "to be in charge of, to handle",
    "family": "topik-vocabulary"
  },
  {
    "ko": "사회적 지위",
    "slug": "topik_social_standing",
    "folder": "items",
    "nameEn": "social standing",
    "family": "topik-vocabulary"
  },
  {
    "ko": "관심",
    "slug": "topik_interest_attention",
    "folder": "items",
    "nameEn": "interest, attention",
    "family": "topik-vocabulary"
  },
  {
    "ko": "피서객",
    "slug": "topik_summer_holidaymaker",
    "folder": "items",
    "nameEn": "a holidaymaker escaping the heat",
    "family": "topik-vocabulary"
  },
  {
    "ko": "피서지",
    "slug": "beach_parasol",
    "folder": "items",
    "nameEn": "a place people go to escape the heat",
    "family": "topik-vocabulary"
  },
  {
    "ko": "더위",
    "slug": "topik_hot_weather",
    "folder": "items",
    "nameEn": "the heat",
    "family": "topik-vocabulary"
  },
  {
    "ko": "쓰레기",
    "slug": "trash_bag",
    "folder": "items",
    "nameEn": "rubbish",
    "family": "topik-vocabulary"
  },
  {
    "ko": "치우다",
    "slug": "topik_clear_away",
    "folder": "items",
    "nameEn": "to clear away",
    "family": "topik-vocabulary"
  },
  {
    "ko": "양",
    "slug": "topik_quantity",
    "folder": "items",
    "nameEn": "a quantity, an amount",
    "family": "topik-vocabulary"
  },
  {
    "ko": "전쟁",
    "slug": "topik_war",
    "folder": "items",
    "nameEn": "a war",
    "family": "topik-vocabulary"
  },
  {
    "ko": "N와의 전쟁",
    "slug": "topik_war_with_problem",
    "folder": "items",
    "nameEn": "a war with N — what a headline calls a problem it cannot solve",
    "family": "topik-vocabulary"
  },
  {
    "ko": "심각하다",
    "slug": "topik_serious_problem",
    "folder": "items",
    "nameEn": "to be serious",
    "family": "topik-vocabulary"
  },
  {
    "ko": "애쓰다",
    "slug": "topik_strive_hard",
    "folder": "items",
    "nameEn": "to struggle, to take pains",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-기 위해",
    "slug": "topik_in_order_to",
    "folder": "items",
    "nameEn": "in order to",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-(으)로 인해",
    "slug": "topik_owing_to",
    "folder": "items",
    "nameEn": "owing to, because of",
    "family": "topik-vocabulary"
  },
  {
    "ko": "여러 가지로",
    "slug": "topik_various_ways",
    "folder": "items",
    "nameEn": "in various ways",
    "family": "topik-vocabulary"
  },
  {
    "ko": "불편",
    "slug": "topik_inconvenience",
    "folder": "items",
    "nameEn": "inconvenience",
    "family": "topik-vocabulary"
  },
  {
    "ko": "겪다",
    "slug": "topik_go_through_hardship",
    "folder": "items",
    "nameEn": "to go through, to suffer",
    "family": "topik-vocabulary"
  },
  {
    "ko": "저축률",
    "slug": "topik_savings_rate",
    "folder": "items",
    "nameEn": "the savings rate",
    "family": "topik-vocabulary"
  },
  {
    "ko": "저축",
    "slug": "piggy_bank",
    "folder": "items",
    "nameEn": "saving, savings",
    "family": "topik-vocabulary"
  },
  {
    "ko": "바닥",
    "slug": "topik_rock_bottom",
    "folder": "items",
    "nameEn": "the bottom — of a figure, rock bottom",
    "family": "topik-vocabulary"
  },
  {
    "ko": "오르다",
    "slug": "topik_rise",
    "folder": "items",
    "nameEn": "to rise",
    "family": "topik-vocabulary"
  },
  {
    "ko": "떨어지다",
    "slug": "topik_fall_down",
    "folder": "items",
    "nameEn": "to fall",
    "family": "topik-vocabulary"
  },
  {
    "ko": "올라가다",
    "slug": "topik_climb_up",
    "folder": "items",
    "nameEn": "to climb back up",
    "family": "topik-vocabulary"
  },
  {
    "ko": "낮다",
    "slug": "topik_low_height",
    "folder": "items",
    "nameEn": "to be low",
    "family": "topik-vocabulary"
  },
  {
    "ko": "젊은층",
    "slug": "topik_young_generation",
    "folder": "items",
    "nameEn": "the young, as an age group",
    "family": "topik-vocabulary"
  },
  {
    "ko": "젊다",
    "slug": "topik_young_person",
    "folder": "items",
    "nameEn": "to be young",
    "family": "topik-vocabulary"
  },
  {
    "ko": "무관심",
    "slug": "topik_indifference",
    "folder": "items",
    "nameEn": "indifference",
    "family": "topik-vocabulary"
  },
  {
    "ko": "계속",
    "slug": "topik_continuously",
    "folder": "items",
    "nameEn": "continuously",
    "family": "topik-vocabulary"
  },
  {
    "ko": "정도",
    "slug": "topik_approximately",
    "folder": "items",
    "nameEn": "about, roughly",
    "family": "topik-vocabulary"
  },
  {
    "ko": "걸리다",
    "slug": "topik_takes_time",
    "folder": "items",
    "nameEn": "to take (an amount of time)",
    "family": "topik-vocabulary"
  },
  {
    "ko": "나타나다",
    "slug": "topik_appear",
    "folder": "items",
    "nameEn": "to come out, to show up — of a figure or a result",
    "family": "topik-vocabulary"
  },
  {
    "ko": "N 만에",
    "slug": "topik_after_interval",
    "folder": "items",
    "nameEn": "for the first time in N — measured from the last time it happened",
    "family": "topik-vocabulary"
  },
  {
    "ko": "N 동안",
    "slug": "topik_throughout_period",
    "folder": "items",
    "nameEn": "throughout N, for the whole of N",
    "family": "topik-vocabulary"
  },
  {
    "ko": "N을/를 비롯해서",
    "slug": "topik_including_first",
    "folder": "items",
    "nameEn": "including N, and N first among them",
    "family": "topik-vocabulary"
  },
  {
    "ko": "여름철",
    "slug": "topik_summer_months",
    "folder": "items",
    "nameEn": "the summer months",
    "family": "topik-vocabulary"
  },
  {
    "ko": "여름",
    "slug": "topik_summer_season",
    "folder": "items",
    "nameEn": "summer",
    "family": "topik-vocabulary"
  },
  {
    "ko": "보관",
    "slug": "topik_storage",
    "folder": "items",
    "nameEn": "storage, keeping",
    "family": "topik-vocabulary"
  },
  {
    "ko": "보관하다",
    "slug": "topik_store_away",
    "folder": "items",
    "nameEn": "to store, to keep",
    "family": "topik-vocabulary"
  },
  {
    "ko": "냉장고",
    "slug": "fridge",
    "folder": "items",
    "nameEn": "a fridge",
    "family": "topik-vocabulary"
  },
  {
    "ko": "냉장고 안",
    "slug": "topik_inside_fridge",
    "folder": "items",
    "nameEn": "inside the fridge",
    "family": "topik-vocabulary"
  },
  {
    "ko": "넣다",
    "slug": "topik_put_inside",
    "folder": "items",
    "nameEn": "to put in",
    "family": "topik-vocabulary"
  },
  {
    "ko": "믿다",
    "slug": "topik_trust",
    "folder": "items",
    "nameEn": "to trust, to rely on",
    "family": "topik-vocabulary"
  },
  {
    "ko": "낭패",
    "slug": "topik_fiasco",
    "folder": "items",
    "nameEn": "a fiasco — a plan that lets you down at the worst moment",
    "family": "topik-vocabulary"
  },
  {
    "ko": "안심하다",
    "slug": "topik_feel_reassured",
    "folder": "items",
    "nameEn": "to be at ease about something",
    "family": "topik-vocabulary"
  },
  {
    "ko": "모든",
    "slug": "topik_every_all",
    "folder": "items",
    "nameEn": "every, all",
    "family": "topik-vocabulary"
  },
  {
    "ko": "특별하다",
    "slug": "topik_special",
    "folder": "items",
    "nameEn": "to be special",
    "family": "topik-vocabulary"
  },
  {
    "ko": "마련하다",
    "slug": "topik_arrange_provisions",
    "folder": "items",
    "nameEn": "to get hold of, to arrange for",
    "family": "topik-vocabulary"
  },
  {
    "ko": "좋지 않다",
    "slug": "topik_not_good_idea",
    "folder": "items",
    "nameEn": "is not a good idea",
    "family": "topik-vocabulary"
  },
  {
    "ko": "N만",
    "slug": "topik_only_noun",
    "folder": "items",
    "nameEn": "N only, N and nothing besides",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-아/어서는",
    "slug": "topik_bad_if_continued",
    "folder": "items",
    "nameEn": "if you go on doing it, and what follows is bad — 믿어서는, if you go on trusting only that",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-던",
    "slug": "topik_unfinished_past",
    "folder": "items",
    "nameEn": "the one you were in the middle of",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-아/어야 하다",
    "slug": "topik_must_do",
    "folder": "items",
    "nameEn": "must, have to",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-(으)ㄹ 수 없다",
    "slug": "topik_cannot",
    "folder": "items",
    "nameEn": "cannot",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-(으)려면",
    "slug": "topik_if_intending",
    "folder": "items",
    "nameEn": "if you intend to",
    "family": "topik-vocabulary"
  },
  {
    "ko": "정부",
    "slug": "government_hall",
    "folder": "items",
    "nameEn": "the government",
    "family": "topik-vocabulary"
  },
  {
    "ko": "정책",
    "slug": "topik_public_policy",
    "folder": "items",
    "nameEn": "a policy",
    "family": "topik-vocabulary"
  },
  {
    "ko": "부동산 정책",
    "slug": "topik_property_policy",
    "folder": "items",
    "nameEn": "real-estate policy",
    "family": "topik-vocabulary"
  },
  {
    "ko": "시민",
    "slug": "topik_citizen",
    "folder": "items",
    "nameEn": "a citizen",
    "family": "topik-vocabulary"
  },
  {
    "ko": "평가하다",
    "slug": "topik_evaluate",
    "folder": "items",
    "nameEn": "to judge, to rate",
    "family": "topik-vocabulary"
  },
  {
    "ko": "집값",
    "slug": "topik_house_prices",
    "folder": "items",
    "nameEn": "house prices",
    "family": "topik-vocabulary"
  },
  {
    "ko": "집값 잡기",
    "slug": "topik_control_house_prices",
    "folder": "items",
    "nameEn": "reining house prices back in",
    "family": "topik-vocabulary"
  },
  {
    "ko": "부동산",
    "slug": "apartment_block",
    "folder": "items",
    "nameEn": "property, real estate",
    "family": "topik-vocabulary"
  },
  {
    "ko": "서민",
    "slug": "topik_working_people",
    "folder": "items",
    "nameEn": "ordinary working people",
    "family": "topik-vocabulary"
  },
  {
    "ko": "서민 경제",
    "slug": "topik_household_economy",
    "folder": "items",
    "nameEn": "the household economy of ordinary people",
    "family": "topik-vocabulary"
  },
  {
    "ko": "경제",
    "slug": "topik_economy",
    "folder": "items",
    "nameEn": "an economy",
    "family": "topik-vocabulary"
  },
  {
    "ko": "물가",
    "slug": "topik_cost_of_living",
    "folder": "items",
    "nameEn": "the cost of living",
    "family": "topik-vocabulary"
  },
  {
    "ko": "악영향",
    "slug": "topik_harmful_effect",
    "folder": "items",
    "nameEn": "a harmful effect — and it comes with 미치다: 악영향을 미치다, to have a bad effect on",
    "family": "topik-vocabulary"
  },
  {
    "ko": "영향을 미치다",
    "slug": "topik_have_effect",
    "folder": "items",
    "nameEn": "to have an effect on",
    "family": "topik-vocabulary"
  },
  {
    "ko": "찬물",
    "slug": "topik_cold_water",
    "folder": "items",
    "nameEn": "cold water",
    "family": "topik-vocabulary"
  },
  {
    "ko": "찬물을 끼얹다",
    "slug": "topik_spoil_enthusiasm",
    "folder": "items",
    "nameEn": "to pour cold water on it — to spoil something that was going well",
    "family": "topik-vocabulary"
  },
  {
    "ko": "잡다",
    "slug": "topik_catch",
    "folder": "items",
    "nameEn": "to catch; to get something under control",
    "family": "topik-vocabulary"
  },
  {
    "ko": "냉정하다",
    "slug": "topik_cool_headed",
    "folder": "items",
    "nameEn": "to be cool-headed, unsentimental",
    "family": "topik-vocabulary"
  },
  {
    "ko": "시원하다",
    "slug": "topik_refreshingly_cool",
    "folder": "items",
    "nameEn": "to feel refreshingly cool",
    "family": "topik-vocabulary"
  },
  {
    "ko": "마음",
    "slug": "topik_inner_heart",
    "folder": "items",
    "nameEn": "the heart, how one feels",
    "family": "topik-vocabulary"
  },
  {
    "ko": "아주",
    "slug": "topik_very",
    "folder": "items",
    "nameEn": "very",
    "family": "topik-vocabulary"
  },
  {
    "ko": "많이",
    "slug": "topik_a_lot",
    "folder": "items",
    "nameEn": "a lot",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-는 중",
    "slug": "topik_in_middle_of",
    "folder": "items",
    "nameEn": "in the middle of doing it",
    "family": "topik-vocabulary"
  },
  {
    "ko": "N 때문에",
    "slug": "topik_because_of_noun",
    "folder": "items",
    "nameEn": "because of N",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-게 하다",
    "slug": "topik_make_result",
    "folder": "items",
    "nameEn": "to make something turn out that way",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-기",
    "slug": "topik_action_as_noun",
    "folder": "items",
    "nameEn": "the -ing form, turning a verb into something a headline can name — 잡기, the catching of it",
    "family": "topik-vocabulary"
  },
  {
    "ko": "개",
    "slug": "farm_dog",
    "folder": "items",
    "nameEn": "a dog",
    "family": "topik-vocabulary"
  },
  {
    "ko": "반려견",
    "slug": "topik_pet_dog",
    "folder": "items",
    "nameEn": "a pet dog — the word a paper uses, not 개",
    "family": "topik-vocabulary"
  },
  {
    "ko": "주인",
    "slug": "topik_owner",
    "folder": "items",
    "nameEn": "an owner",
    "family": "topik-vocabulary"
  },
  {
    "ko": "키우다",
    "slug": "topik_raise_animal",
    "folder": "items",
    "nameEn": "to keep, to raise an animal",
    "family": "topik-vocabulary"
  },
  {
    "ko": "물다",
    "slug": "topik_bite",
    "folder": "items",
    "nameEn": "to bite",
    "family": "topik-vocabulary"
  },
  {
    "ko": "물리다",
    "slug": "topik_be_bitten",
    "folder": "items",
    "nameEn": "to get bitten — the passive of 물다",
    "family": "topik-vocabulary"
  },
  {
    "ko": "특성",
    "slug": "topik_characteristic",
    "folder": "items",
    "nameEn": "a characteristic, what something is like by nature",
    "family": "topik-vocabulary"
  },
  {
    "ko": "착각",
    "slug": "topik_mistaken_belief",
    "folder": "items",
    "nameEn": "a thing people are sure of and wrong about",
    "family": "topik-vocabulary"
  },
  {
    "ko": "흔하다",
    "slug": "topik_common",
    "folder": "items",
    "nameEn": "to be common",
    "family": "topik-vocabulary"
  },
  {
    "ko": "확신하다",
    "slug": "topik_certain",
    "folder": "items",
    "nameEn": "to be certain of it",
    "family": "topik-vocabulary"
  },
  {
    "ko": "잘못되다",
    "slug": "topik_wrong_result",
    "folder": "items",
    "nameEn": "to be mistaken, to be wrong",
    "family": "topik-vocabulary"
  },
  {
    "ko": "알아보다",
    "slug": "topik_investigate",
    "folder": "items",
    "nameEn": "to look into it, to find out",
    "family": "topik-vocabulary"
  },
  {
    "ko": "자신",
    "slug": "topik_oneself",
    "folder": "items",
    "nameEn": "oneself, one’s own",
    "family": "topik-vocabulary"
  },
  {
    "ko": "우리",
    "slug": "topik_our",
    "folder": "items",
    "nameEn": "our",
    "family": "topik-vocabulary"
  },
  {
    "ko": "사람",
    "slug": "topik_person",
    "folder": "items",
    "nameEn": "a person",
    "family": "topik-vocabulary"
  },
  {
    "ko": "늘다",
    "slug": "topik_increase_amount",
    "folder": "items",
    "nameEn": "to increase — the plain one, of counts and amounts",
    "family": "topik-vocabulary"
  },
  {
    "ko": "한번",
    "slug": "topik_once",
    "folder": "items",
    "nameEn": "once, one time",
    "family": "topik-vocabulary"
  },
  {
    "ko": "다시",
    "slug": "topik_again",
    "folder": "items",
    "nameEn": "again",
    "family": "topik-vocabulary"
  },
  {
    "ko": "안 + V",
    "slug": "topik_short_negative",
    "folder": "items",
    "nameEn": "the short negative — 안 물어요 = doesn’t bite, said out loud",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-지 않다",
    "slug": "topik_long_negative",
    "folder": "items",
    "nameEn": "the long negative, the one papers write — 오르지 않고, 물지 않는다",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-다고 하다",
    "slug": "topik_say_that",
    "folder": "items",
    "nameEn": "to say that — and with 확신하다, to be sure that",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-기 전에",
    "slug": "topik_before_doing",
    "folder": "items",
    "nameEn": "before doing it — 키우기 전에, before you get one",
    "family": "topik-vocabulary"
  },
  {
    "ko": "N에 대해서",
    "slug": "topik_about_topic",
    "folder": "items",
    "nameEn": "about N",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-(으)ㄴ 적이 있다",
    "slug": "topik_ever_done",
    "folder": "items",
    "nameEn": "to have ever done it",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-(으)ㄹ 수 있다",
    "slug": "topik_can_do",
    "folder": "items",
    "nameEn": "can, might",
    "family": "topik-vocabulary"
  },
  {
    "ko": "바나나",
    "slug": "banana_bunch",
    "folder": "items",
    "nameEn": "a banana",
    "family": "topik-vocabulary"
  },
  {
    "ko": "꿀",
    "slug": "honey_jar",
    "folder": "items",
    "nameEn": "honey",
    "family": "topik-vocabulary"
  },
  {
    "ko": "먹다",
    "slug": "topik_eat",
    "folder": "items",
    "nameEn": "to eat",
    "family": "topik-vocabulary"
  },
  {
    "ko": "꿀잠",
    "slug": "topik_sweet_sleep",
    "folder": "items",
    "nameEn": "honey sleep — a deep, sweet night. No honey involved.",
    "family": "topik-vocabulary"
  },
  {
    "ko": "잠",
    "slug": "white_pillow",
    "folder": "items",
    "nameEn": "sleep",
    "family": "topik-vocabulary"
  },
  {
    "ko": "자다",
    "slug": "topik_sleep",
    "folder": "items",
    "nameEn": "to sleep",
    "family": "topik-vocabulary"
  },
  {
    "ko": "숙면",
    "slug": "topik_sound_sleep",
    "folder": "items",
    "nameEn": "sound sleep — the clinical word for the same thing",
    "family": "topik-vocabulary"
  },
  {
    "ko": "푹",
    "slug": "topik_soundly",
    "folder": "items",
    "nameEn": "soundly, right through",
    "family": "topik-vocabulary"
  },
  {
    "ko": "불안감",
    "slug": "topik_anxiety",
    "folder": "items",
    "nameEn": "anxiety, a feeling of unease",
    "family": "topik-vocabulary"
  },
  {
    "ko": "효과",
    "slug": "topik_effect",
    "folder": "items",
    "nameEn": "an effect",
    "family": "topik-vocabulary"
  },
  {
    "ko": "도움이 되다",
    "slug": "topik_be_helpful",
    "folder": "items",
    "nameEn": "to be a help",
    "family": "topik-vocabulary"
  },
  {
    "ko": "없애다",
    "slug": "topik_remove",
    "folder": "items",
    "nameEn": "to get rid of it",
    "family": "topik-vocabulary"
  },
  {
    "ko": "속",
    "slug": "topik_stomach_inside",
    "folder": "items",
    "nameEn": "the stomach, the insides",
    "family": "topik-vocabulary"
  },
  {
    "ko": "불편하다",
    "slug": "topik_uncomfortable",
    "folder": "items",
    "nameEn": "to be uncomfortable",
    "family": "topik-vocabulary"
  },
  {
    "ko": "사르르",
    "slug": "topik_melt_gently",
    "folder": "items",
    "nameEn": "the word for melting quietly away — a headline quotes it and drops the verb",
    "family": "topik-vocabulary"
  },
  {
    "ko": "함께",
    "slug": "topik_together",
    "folder": "items",
    "nameEn": "together with",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-게 해 주다",
    "slug": "topik_enable_someone",
    "folder": "items",
    "nameEn": "to let someone do it, to make it possible",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-(으)ㄹ뿐더러",
    "slug": "topik_not_only_but_also",
    "folder": "items",
    "nameEn": "not only that, but also — the written form of stacking with 도",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-아/어야",
    "slug": "topik_only_if",
    "folder": "items",
    "nameEn": "only if you — a condition, not a recommendation",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-(으)ㄹ 때",
    "slug": "topik_when_doing",
    "folder": "items",
    "nameEn": "when you do it",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-는 게 좋다",
    "slug": "topik_good_idea_to",
    "folder": "items",
    "nameEn": "it is a good idea to",
    "family": "topik-vocabulary"
  },
  {
    "ko": "N도",
    "slug": "topik_also_noun",
    "folder": "items",
    "nameEn": "N as well, on top of what was already said",
    "family": "topik-vocabulary"
  },
  {
    "ko": "서점",
    "slug": "topik_bookshop",
    "folder": "items",
    "nameEn": "a bookshop",
    "family": "topik-vocabulary"
  },
  {
    "ko": "서점가",
    "slug": "topik_book_trade",
    "folder": "items",
    "nameEn": "the book trade — 가 as in 대학가, a whole scene rather than one shop",
    "family": "topik-vocabulary"
  },
  {
    "ko": "책",
    "slug": "hardcover_book",
    "folder": "items",
    "nameEn": "a book",
    "family": "topik-vocabulary"
  },
  {
    "ko": "행복",
    "slug": "topik_happiness",
    "folder": "items",
    "nameEn": "happiness",
    "family": "topik-vocabulary"
  },
  {
    "ko": "열차",
    "slug": "passenger_train",
    "folder": "items",
    "nameEn": "a train",
    "family": "topik-vocabulary"
  },
  {
    "ko": "행복 열차",
    "slug": "topik_happiness_train_book",
    "folder": "items",
    "nameEn": "'Happiness Train' — the name of the book, which is why it is in quotes",
    "family": "topik-vocabulary"
  },
  {
    "ko": "읽다",
    "slug": "topik_read",
    "folder": "items",
    "nameEn": "to read",
    "family": "topik-vocabulary"
  },
  {
    "ko": "큰 인기를 얻다",
    "slug": "topik_great_popularity",
    "folder": "items",
    "nameEn": "to be enjoying great popularity — 인기 is popularity, 얻다 to obtain it",
    "family": "topik-vocabulary"
  },
  {
    "ko": "10만 부나",
    "slug": "topik_so_many_copies",
    "folder": "items",
    "nameEn": "as many as a hundred thousand copies — 부 counts books, and 나 says the number is larger than you would expect",
    "family": "topik-vocabulary"
  },
  {
    "ko": "팔리다",
    "slug": "topik_sold",
    "folder": "items",
    "nameEn": "to sell, to be sold",
    "family": "topik-vocabulary"
  },
  {
    "ko": "판매되다",
    "slug": "topik_on_sale",
    "folder": "items",
    "nameEn": "to be on sale — the formal word for the same thing",
    "family": "topik-vocabulary"
  },
  {
    "ko": "운행",
    "slug": "topik_service_running",
    "folder": "items",
    "nameEn": "running a service",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-앓이",
    "slug": "topik_craze",
    "folder": "items",
    "nameEn": "the -앓이 ending: a craze for it. From 앓다, to be ill — but nobody is ill.",
    "family": "topik-vocabulary"
  },
  {
    "ko": "지금",
    "slug": "topik_now",
    "folder": "items",
    "nameEn": "now",
    "family": "topik-vocabulary"
  },
  {
    "ko": "현재",
    "slug": "topik_at_present",
    "folder": "items",
    "nameEn": "at present — the written form of 지금",
    "family": "topik-vocabulary"
  },
  {
    "ko": "최근",
    "slug": "topik_recently",
    "folder": "items",
    "nameEn": "recently",
    "family": "topik-vocabulary"
  },
  {
    "ko": "이름",
    "slug": "topik_name",
    "folder": "items",
    "nameEn": "a name",
    "family": "topik-vocabulary"
  },
  {
    "ko": "시작하다",
    "slug": "topik_start_action",
    "folder": "items",
    "nameEn": "to start",
    "family": "topik-vocabulary"
  },
  {
    "ko": "가다",
    "slug": "topik_go",
    "folder": "items",
    "nameEn": "to go",
    "family": "topik-vocabulary"
  },
  {
    "ko": "많다",
    "slug": "topik_many",
    "folder": "items",
    "nameEn": "to be many",
    "family": "topik-vocabulary"
  },
  {
    "ko": "한 달 새",
    "slug": "topik_within_one_month",
    "folder": "items",
    "nameEn": "in the space of one month — 새 is 사이, the gap between",
    "family": "topik-vocabulary"
  },
  {
    "ko": "이번 달",
    "slug": "topik_this_month",
    "folder": "items",
    "nameEn": "this month",
    "family": "topik-vocabulary"
  },
  {
    "ko": "N(이)라는",
    "slug": "topik_called_named",
    "folder": "items",
    "nameEn": "called N, going by the name N",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-까지만",
    "slug": "topik_only_until",
    "folder": "items",
    "nameEn": "only up to — and the 만 is where the trap is",
    "family": "topik-vocabulary"
  },
  {
    "ko": "날씨",
    "slug": "topik_weather",
    "folder": "items",
    "nameEn": "the weather",
    "family": "topik-vocabulary"
  },
  {
    "ko": "비가 오다",
    "slug": "rain_cloud",
    "folder": "items",
    "nameEn": "to rain",
    "family": "topik-vocabulary"
  },
  {
    "ko": "맑다",
    "slug": "sun_icon",
    "folder": "items",
    "nameEn": "to be clear, to be fine",
    "family": "topik-vocabulary"
  },
  {
    "ko": "개다",
    "slug": "topik_clear_after_rain",
    "folder": "items",
    "nameEn": "to clear up — of weather after rain",
    "family": "topik-vocabulary"
  },
  {
    "ko": "오전",
    "slug": "topik_morning",
    "folder": "items",
    "nameEn": "the morning, before noon",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-더니",
    "slug": "topik_observed_change",
    "folder": "items",
    "nameEn": "I saw A, and then B — a change the speaker watched happen",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-더라도",
    "slug": "topik_even_if",
    "folder": "items",
    "nameEn": "even if it does — and what follows holds anyway",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-아/어 가지고",
    "slug": "topik_and_so",
    "folder": "items",
    "nameEn": "and so, and then — the spoken form of -아/어서",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-는 대신에",
    "slug": "topik_instead_of",
    "folder": "items",
    "nameEn": "instead of doing it",
    "family": "topik-vocabulary"
  },
  {
    "ko": "피곤하다",
    "slug": "topik_tired",
    "folder": "items",
    "nameEn": "to be tired",
    "family": "topik-vocabulary"
  },
  {
    "ko": "쉬다",
    "slug": "topik_rest",
    "folder": "items",
    "nameEn": "to rest",
    "family": "topik-vocabulary"
  },
  {
    "ko": "일찍",
    "slug": "topik_early",
    "folder": "items",
    "nameEn": "early",
    "family": "topik-vocabulary"
  },
  {
    "ko": "너무",
    "slug": "topik_too_much",
    "folder": "items",
    "nameEn": "too, far too",
    "family": "topik-vocabulary"
  },
  {
    "ko": "오늘",
    "slug": "topik_today",
    "folder": "items",
    "nameEn": "today",
    "family": "topik-vocabulary"
  },
  {
    "ko": "집",
    "slug": "detached_house",
    "folder": "items",
    "nameEn": "home",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-아/어야지",
    "slug": "topik_i_really_must",
    "folder": "items",
    "nameEn": "I really must — what you say to yourself when you decide",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-(으)ㄹ걸",
    "slug": "topik_should_have",
    "folder": "items",
    "nameEn": "I should have — a regret, or a guess about someone else",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-더라",
    "slug": "topik_saw_that",
    "folder": "items",
    "nameEn": "I saw that they did — reporting what you witnessed of someone else",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-기도 하다",
    "slug": "topik_sometimes_also",
    "folder": "items",
    "nameEn": "also does it, sometimes does it",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-(으)니까",
    "slug": "topik_reason_for_decision",
    "folder": "items",
    "nameEn": "because — the reason you give before a decision or a suggestion",
    "family": "topik-vocabulary"
  },
  {
    "ko": "하고 말하다",
    "slug": "topik_quote_speech",
    "folder": "items",
    "nameEn": "to say \"…\" — 하고 keeps the words exactly as they were spoken",
    "family": "topik-vocabulary"
  },
  {
    "ko": "취업 준비생",
    "slug": "topik_job_seeker",
    "folder": "items",
    "nameEn": "someone preparing to enter the job market",
    "family": "topik-vocabulary"
  },
  {
    "ko": "이상",
    "slug": "topik_at_least",
    "folder": "items",
    "nameEn": "or more, upwards of",
    "family": "topik-vocabulary"
  },
  {
    "ko": "면접시험",
    "slug": "topik_job_interview",
    "folder": "items",
    "nameEn": "a job interview",
    "family": "topik-vocabulary"
  },
  {
    "ko": "준비",
    "slug": "topik_preparation",
    "folder": "items",
    "nameEn": "preparation",
    "family": "topik-vocabulary"
  },
  {
    "ko": "고민하다",
    "slug": "topik_agonise",
    "folder": "items",
    "nameEn": "to agonise over something",
    "family": "topik-vocabulary"
  },
  {
    "ko": "N(으)로 말미암아",
    "slug": "topik_formal_owing_to",
    "folder": "items",
    "nameEn": "owing to N — the formal twin of (으)로 인하여",
    "family": "topik-vocabulary"
  },
  {
    "ko": "N에 따라서",
    "slug": "topik_depending_on",
    "folder": "items",
    "nameEn": "depending on N, in line with N — a correlation, not a cause",
    "family": "topik-vocabulary"
  },
  {
    "ko": "N에도 불구하고",
    "slug": "topik_despite",
    "folder": "items",
    "nameEn": "despite N",
    "family": "topik-vocabulary"
  },
  {
    "ko": "시험 기간",
    "slug": "topik_exam_period",
    "folder": "items",
    "nameEn": "the exam period",
    "family": "topik-vocabulary"
  },
  {
    "ko": "공부하다",
    "slug": "topik_study",
    "folder": "items",
    "nameEn": "to study",
    "family": "topik-vocabulary"
  },
  {
    "ko": "학생",
    "slug": "topik_student",
    "folder": "items",
    "nameEn": "a student",
    "family": "topik-vocabulary"
  },
  {
    "ko": "도서관",
    "slug": "topik_library",
    "folder": "items",
    "nameEn": "a library",
    "family": "topik-vocabulary"
  },
  {
    "ko": "밤새도록",
    "slug": "topik_all_night",
    "folder": "items",
    "nameEn": "all night long",
    "family": "topik-vocabulary"
  },
  {
    "ko": "불을 켜다",
    "slug": "topik_light_on",
    "folder": "items",
    "nameEn": "to switch a light on",
    "family": "topik-vocabulary"
  },
  {
    "ko": "켜다",
    "slug": "switch_on",
    "folder": "items",
    "nameEn": "to switch on",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-아/어 놓다",
    "slug": "topik_do_and_leave",
    "folder": "items",
    "nameEn": "do it and leave it that way",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-아/어 두다",
    "slug": "topik_prepare_and_keep",
    "folder": "items",
    "nameEn": "do it and leave it that way — the twin of -아/어 놓다",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-곤 하다",
    "slug": "topik_repeated_habit",
    "folder": "items",
    "nameEn": "used to do it, again and again",
    "family": "topik-vocabulary"
  },
  {
    "ko": "비장애인",
    "slug": "topik_without_disability",
    "folder": "items",
    "nameEn": "a person without a disability",
    "family": "topik-vocabulary"
  },
  {
    "ko": "쉽지 않다",
    "slug": "topik_not_easy",
    "folder": "items",
    "nameEn": "to be no easy thing",
    "family": "topik-vocabulary"
  },
  {
    "ko": "몸",
    "slug": "topik_body",
    "folder": "items",
    "nameEn": "a body",
    "family": "topik-vocabulary"
  },
  {
    "ko": "높다",
    "slug": "topik_high",
    "folder": "items",
    "nameEn": "to be high",
    "family": "topik-vocabulary"
  },
  {
    "ko": "산",
    "slug": "snow_peak",
    "folder": "items",
    "nameEn": "a mountain",
    "family": "topik-vocabulary"
  },
  {
    "ko": "정말",
    "slug": "topik_really_true",
    "folder": "items",
    "nameEn": "really, truly",
    "family": "topik-vocabulary"
  },
  {
    "ko": "대단하다",
    "slug": "topik_remarkable",
    "folder": "items",
    "nameEn": "to be remarkable",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-(으)ㄹ 텐데",
    "slug": "topik_expected_but",
    "folder": "items",
    "nameEn": "it would surely be … and yet — a supposition with a contrast behind it",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-(으)ㄹ까 봐",
    "slug": "topik_for_fear_of",
    "folder": "items",
    "nameEn": "for fear that it might",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-(으)ㄹ 테니까",
    "slug": "topik_since_it_will",
    "folder": "items",
    "nameEn": "since it will surely be … , so do this",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-(으)ㄴ 데다가",
    "slug": "topik_on_top_of",
    "folder": "items",
    "nameEn": "on top of being …",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-다니",
    "slug": "topik_to_think_that",
    "folder": "items",
    "nameEn": "to think that … ! — surprise or admiration",
    "family": "topik-vocabulary"
  },
  {
    "ko": "앞으로",
    "slug": "topik_from_now_on",
    "folder": "items",
    "nameEn": "from now on",
    "family": "topik-vocabulary"
  },
  {
    "ko": "점점",
    "slug": "topik_little_by_little",
    "folder": "items",
    "nameEn": "little by little",
    "family": "topik-vocabulary"
  },
  {
    "ko": "따뜻해지다",
    "slug": "topik_get_warmer",
    "folder": "items",
    "nameEn": "to get warmer — 따뜻하다 with the change ending",
    "family": "topik-vocabulary"
  },
  {
    "ko": "푸르다",
    "slug": "pine_tree",
    "folder": "items",
    "nameEn": "to be green, to be verdant",
    "family": "topik-vocabulary"
  },
  {
    "ko": "변하다",
    "slug": "topik_transform",
    "folder": "items",
    "nameEn": "to change, to turn into something else",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-아/어 가다",
    "slug": "topik_change_into_future",
    "folder": "items",
    "nameEn": "the change carries on away from now, into the future",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-아/어 오다",
    "slug": "topik_change_until_now",
    "folder": "items",
    "nameEn": "the change has been running from the past up to now",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-아/어 보다",
    "slug": "topik_try_doing",
    "folder": "items",
    "nameEn": "to try doing it",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-아/어 대다",
    "slug": "topik_keep_doing_excessively",
    "folder": "items",
    "nameEn": "to keep on doing it, more than one would like",
    "family": "topik-vocabulary"
  },
  {
    "ko": "입사 시험",
    "slug": "exam_papers",
    "folder": "items",
    "nameEn": "the entrance exam a company sets",
    "family": "topik-vocabulary"
  },
  {
    "ko": "합격하다",
    "slug": "diploma_scroll",
    "folder": "items",
    "nameEn": "to pass an exam, to get in",
    "family": "topik-vocabulary"
  },
  {
    "ko": "엿",
    "slug": "yeot_taffy",
    "folder": "foods",
    "nameEn": "yeot — a hard, sticky taffy",
    "family": "topik-vocabulary"
  },
  {
    "ko": "떡",
    "slug": "white_tteok",
    "folder": "foods",
    "nameEn": "tteok — rice cake",
    "family": "topik-vocabulary"
  },
  {
    "ko": "선물",
    "slug": "wrapped_gift",
    "folder": "items",
    "nameEn": "a present",
    "family": "topik-vocabulary"
  },
  {
    "ko": "주다",
    "slug": "give_two_hands",
    "folder": "items",
    "nameEn": "to give",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-도록",
    "slug": "topik_so_that_other",
    "folder": "items",
    "nameEn": "so that it happens — a purpose, and the two clauses may have different subjects",
    "family": "topik-vocabulary"
  },
  {
    "ko": "V-게",
    "slug": "topik_so_that",
    "folder": "items",
    "nameEn": "so that — the everyday twin of -도록",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-거든",
    "slug": "topik_if_when_happens",
    "folder": "items",
    "nameEn": "if it happens, when it happens",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-(으)려고",
    "slug": "topik_intending_to",
    "folder": "items",
    "nameEn": "intending to — and the intender must be the one who acts",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-(으)ㄹ 만큼",
    "slug": "topik_to_extent",
    "folder": "items",
    "nameEn": "to the extent that, as much as",
    "family": "topik-vocabulary"
  },
  {
    "ko": "나라",
    "slug": "topik_country",
    "folder": "items",
    "nameEn": "a country",
    "family": "topik-vocabulary"
  },
  {
    "ko": "미래",
    "slug": "topik_future",
    "folder": "items",
    "nameEn": "the future",
    "family": "topik-vocabulary"
  },
  {
    "ko": "교육",
    "slug": "schoolhouse",
    "folder": "items",
    "nameEn": "education",
    "family": "topik-vocabulary"
  },
  {
    "ko": "교육 정책",
    "slug": "topik_education_policy",
    "folder": "items",
    "nameEn": "education policy",
    "family": "topik-vocabulary"
  },
  {
    "ko": "달라지다",
    "slug": "topik_turn_out_different",
    "folder": "items",
    "nameEn": "to come out differently",
    "family": "topik-vocabulary"
  },
  {
    "ko": "되다",
    "slug": "topik_become",
    "folder": "items",
    "nameEn": "to become",
    "family": "topik-vocabulary"
  },
  {
    "ko": "N에 달려 있다",
    "slug": "topik_depend_on",
    "folder": "items",
    "nameEn": "to depend on N, to rest on N",
    "family": "topik-vocabulary"
  },
  {
    "ko": "올해",
    "slug": "topik_this_year",
    "folder": "items",
    "nameEn": "this year",
    "family": "topik-vocabulary"
  },
  {
    "ko": "과일",
    "slug": "topik_fruit",
    "folder": "items",
    "nameEn": "fruit",
    "family": "topik-vocabulary"
  },
  {
    "ko": "생산량",
    "slug": "topik_fruit_output",
    "folder": "items",
    "nameEn": "output, how much is produced",
    "family": "topik-vocabulary"
  },
  {
    "ko": "대체적으로",
    "slug": "topik_on_the_whole",
    "folder": "items",
    "nameEn": "on the whole, broadly speaking",
    "family": "topik-vocabulary"
  },
  {
    "ko": "가격",
    "slug": "price_coins",
    "folder": "items",
    "nameEn": "a price",
    "family": "topik-vocabulary"
  },
  {
    "ko": "내리다",
    "slug": "topik_price_comes_down",
    "folder": "items",
    "nameEn": "to come down — of a price or a figure",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-(ㄴ/는)다면",
    "slug": "topik_hypothetical_if",
    "folder": "items",
    "nameEn": "if it were to — a supposition, not a fact",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-(ㄴ/는)다거나",
    "slug": "topik_or_alternative",
    "folder": "items",
    "nameEn": "or it does … — offering one of several",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-아/어서인지",
    "slug": "topik_perhaps_because",
    "folder": "items",
    "nameEn": "perhaps because — a cause offered with a hedge on it",
    "family": "topik-vocabulary"
  },
  {
    "ko": "의사",
    "slug": "doctor",
    "folder": "items",
    "nameEn": "a doctor",
    "family": "topik-vocabulary"
  },
  {
    "ko": "위염",
    "slug": "topik_gastritis",
    "folder": "items",
    "nameEn": "gastritis, an inflamed stomach",
    "family": "topik-vocabulary"
  },
  {
    "ko": "환자",
    "slug": "topik_patient",
    "folder": "items",
    "nameEn": "a patient",
    "family": "topik-vocabulary"
  },
  {
    "ko": "식사량",
    "slug": "servings",
    "folder": "items",
    "nameEn": "how much one eats",
    "family": "topik-vocabulary"
  },
  {
    "ko": "조절하다",
    "slug": "topik_regulate",
    "folder": "items",
    "nameEn": "to regulate, to keep something in check",
    "family": "topik-vocabulary"
  },
  {
    "ko": "N에게",
    "slug": "topik_to_recipient",
    "folder": "items",
    "nameEn": "to N — and it marks the person a causative acts on",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-게 되다",
    "slug": "topik_come_to_be",
    "folder": "items",
    "nameEn": "to come to be that way, with nobody making it happen",
    "family": "topik-vocabulary"
  },
  {
    "ko": "꽃병",
    "slug": "celadon_vase",
    "folder": "items",
    "nameEn": "a vase",
    "family": "topik-vocabulary"
  },
  {
    "ko": "개나리",
    "slug": "forsythia_spray",
    "folder": "items",
    "nameEn": "forsythia — the yellow shrub that opens first in spring",
    "family": "topik-vocabulary"
  },
  {
    "ko": "꽃",
    "slug": "pink_blossom",
    "folder": "items",
    "nameEn": "a flower",
    "family": "topik-vocabulary"
  },
  {
    "ko": "꽂다",
    "slug": "topik_insert_upright",
    "folder": "items",
    "nameEn": "to stand something upright in, to stick in",
    "family": "topik-vocabulary"
  },
  {
    "ko": "책상",
    "slug": "wooden_study_desk",
    "folder": "items",
    "nameEn": "a desk",
    "family": "topik-vocabulary"
  },
  {
    "ko": "놓다",
    "slug": "topik_put_down",
    "folder": "items",
    "nameEn": "to put something down and leave it",
    "family": "topik-vocabulary"
  },
  {
    "ko": "봄",
    "slug": "topik_spring",
    "folder": "items",
    "nameEn": "spring",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-아/어다가",
    "slug": "topik_do_take_then",
    "folder": "items",
    "nameEn": "do it, then take it somewhere and do the next thing",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-(으)ㄹ 뿐",
    "slug": "topik_only_nothing_more",
    "folder": "items",
    "nameEn": "only that, and nothing more",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-았/었기에",
    "slug": "topik_because_past",
    "folder": "items",
    "nameEn": "because it did — a formal, written cause",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-(으)ㄴ 바람에",
    "slug": "topik_unwelcome_because",
    "folder": "items",
    "nameEn": "because of it — and what followed was unwelcome",
    "family": "topik-vocabulary"
  },
  {
    "ko": "국가",
    "slug": "topik_state_nation",
    "folder": "items",
    "nameEn": "a state, a nation",
    "family": "topik-vocabulary"
  },
  {
    "ko": "상황",
    "slug": "topik_situation",
    "folder": "items",
    "nameEn": "the situation",
    "family": "topik-vocabulary"
  },
  {
    "ko": "나아지다",
    "slug": "topik_get_better",
    "folder": "items",
    "nameEn": "to get better",
    "family": "topik-vocabulary"
  },
  {
    "ko": "안타깝다",
    "slug": "topik_painful_to_watch",
    "folder": "items",
    "nameEn": "to be a shame, to be painful to watch",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-(으)ㄹ 따름이다",
    "slug": "topik_only_feeling",
    "folder": "items",
    "nameEn": "it is only that, and nothing more",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-(으)ㄹ 뿐이다",
    "slug": "topik_only_that",
    "folder": "items",
    "nameEn": "it is only that — the twin of -(으)ㄹ 따름이다",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-(으)ㄹ 정도이다",
    "slug": "topik_to_such_degree",
    "folder": "items",
    "nameEn": "it is to the extent that",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-(으)ㄹ 리가 없다",
    "slug": "topik_no_way_possible",
    "folder": "items",
    "nameEn": "there is no way it could be",
    "family": "topik-vocabulary"
  },
  {
    "ko": "행동",
    "slug": "topik_behaviour",
    "folder": "items",
    "nameEn": "behaviour, the way someone acts",
    "family": "topik-vocabulary"
  },
  {
    "ko": "간호하다",
    "slug": "topik_nurse_someone",
    "folder": "items",
    "nameEn": "to nurse someone, to look after them when ill",
    "family": "topik-vocabulary"
  },
  {
    "ko": "어머니",
    "slug": "mother_portrait",
    "folder": "items",
    "nameEn": "mother",
    "family": "topik-vocabulary"
  },
  {
    "ko": "손",
    "slug": "topik_hand",
    "folder": "items",
    "nameEn": "a hand",
    "family": "topik-vocabulary"
  },
  {
    "ko": "사랑",
    "slug": "red_heart",
    "folder": "items",
    "nameEn": "love",
    "family": "topik-vocabulary"
  },
  {
    "ko": "느끼다",
    "slug": "topik_feel_actively",
    "folder": "items",
    "nameEn": "to feel something — the active one, taking 을/를",
    "family": "topik-vocabulary"
  },
  {
    "ko": "느껴지다",
    "slug": "topik_feeling_received",
    "folder": "items",
    "nameEn": "to be felt — the passive, taking 이/가",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-(으)려야 -(으)ㄹ 수 없다",
    "slug": "topik_try_but_cannot",
    "folder": "items",
    "nameEn": "try as you might to, you cannot — the same verb twice",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-아/어도",
    "slug": "topik_even_if_doing",
    "folder": "items",
    "nameEn": "even if you do",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-는 통에",
    "slug": "topik_in_confusion",
    "folder": "items",
    "nameEn": "in the confusion of it — a cause, and a chaotic one",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-는 듯하다",
    "slug": "topik_seems_doing",
    "folder": "items",
    "nameEn": "to seem to be doing it",
    "family": "topik-vocabulary"
  },
  {
    "ko": "대학교",
    "slug": "campus_building",
    "folder": "items",
    "nameEn": "a university",
    "family": "topik-vocabulary"
  },
  {
    "ko": "입학하다",
    "slug": "topik_enter_school",
    "folder": "items",
    "nameEn": "to enter a school, to be admitted",
    "family": "topik-vocabulary"
  },
  {
    "ko": "유학생",
    "slug": "topik_study_abroad",
    "folder": "items",
    "nameEn": "a student studying abroad",
    "family": "topik-vocabulary"
  },
  {
    "ko": "날로",
    "slug": "topik_day_by_day",
    "folder": "items",
    "nameEn": "day by day, more so every day",
    "family": "topik-vocabulary"
  },
  {
    "ko": "증가하다",
    "slug": "topik_statistical_increase",
    "folder": "items",
    "nameEn": "to increase — the formal word, used of figures",
    "family": "topik-vocabulary"
  },
  {
    "ko": "한국",
    "slug": "our_country",
    "folder": "items",
    "nameEn": "Korea",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-고자",
    "slug": "topik_formal_intention",
    "folder": "items",
    "nameEn": "in order to — the written twin of -기 위해서",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-고서",
    "slug": "topik_having_done_then",
    "folder": "items",
    "nameEn": "having done it, and then",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-아/어 봤자",
    "slug": "topik_trying_is_futile",
    "folder": "items",
    "nameEn": "even if you try, it will get you nowhere",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-자마자",
    "slug": "topik_as_soon_as",
    "folder": "items",
    "nameEn": "the moment it happens",
    "family": "topik-vocabulary"
  },
  {
    "ko": "무슨 일이든",
    "slug": "topik_whatever_task",
    "folder": "items",
    "nameEn": "whatever the task, no matter what it is",
    "family": "topik-vocabulary"
  },
  {
    "ko": "처음",
    "slug": "topik_first_time",
    "folder": "items",
    "nameEn": "the first time, the beginning",
    "family": "topik-vocabulary"
  },
  {
    "ko": "힘들다",
    "slug": "topik_hard_going",
    "folder": "items",
    "nameEn": "to be hard going",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-(으)ㄴ/는 법이다",
    "slug": "topik_way_of_things",
    "folder": "items",
    "nameEn": "that is the way of things — it could not be otherwise",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-기 마련이다",
    "slug": "topik_bound_to_happen",
    "folder": "items",
    "nameEn": "it is bound to be — the twin of -(으)ㄴ/는 법이다",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-아/어도 되다",
    "slug": "topik_may_do",
    "folder": "items",
    "nameEn": "it is all right to, you may",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-기만 하다",
    "slug": "topik_does_nothing_but",
    "folder": "items",
    "nameEn": "it does nothing but",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-(으)ㄴ 모양이다",
    "slug": "topik_looks_as_though",
    "folder": "items",
    "nameEn": "it looks as though — an inference from what you can see",
    "family": "topik-vocabulary"
  },
  {
    "ko": "노인",
    "slug": "elderly",
    "folder": "items",
    "nameEn": "an older person",
    "family": "topik-vocabulary"
  },
  {
    "ko": "취업",
    "slug": "restaurant_staff",
    "folder": "items",
    "nameEn": "getting work, employment",
    "family": "topik-vocabulary"
  },
  {
    "ko": "설문 조사",
    "slug": "topik_survey",
    "folder": "items",
    "nameEn": "a survey",
    "family": "topik-vocabulary"
  },
  {
    "ko": "건강",
    "slug": "topik_health",
    "folder": "items",
    "nameEn": "health",
    "family": "topik-vocabulary"
  },
  {
    "ko": "허락하다",
    "slug": "of_course",
    "folder": "items",
    "nameEn": "to permit, to allow",
    "family": "topik-vocabulary"
  },
  {
    "ko": "일하다",
    "slug": "topik_work",
    "folder": "items",
    "nameEn": "to work",
    "family": "topik-vocabulary"
  },
  {
    "ko": "응답",
    "slug": "topik_survey_reply",
    "folder": "items",
    "nameEn": "a reply given to a survey",
    "family": "topik-vocabulary"
  },
  {
    "ko": "과반수",
    "slug": "topik_more_than_half",
    "folder": "items",
    "nameEn": "more than half",
    "family": "topik-vocabulary"
  },
  {
    "ko": "넘다",
    "slug": "topik_exceed",
    "folder": "items",
    "nameEn": "to go past, to exceed",
    "family": "topik-vocabulary"
  },
  {
    "ko": "N에 대한",
    "slug": "topik_concerning_topic",
    "folder": "items",
    "nameEn": "about N, concerning N",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-는 한",
    "slug": "topik_as_long_as",
    "folder": "items",
    "nameEn": "for as long as it holds",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-길래",
    "slug": "topik_seeing_that_i",
    "folder": "items",
    "nameEn": "seeing that it was so, I …",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-(으)ㄹ지라도",
    "slug": "topik_even_if_should",
    "folder": "items",
    "nameEn": "even if it should",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-ㄴ/는다고 해도",
    "slug": "topik_even_supposing",
    "folder": "items",
    "nameEn": "even supposing it does",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-고 싶다",
    "slug": "topik_want_to_do",
    "folder": "items",
    "nameEn": "to want to",
    "family": "topik-vocabulary"
  },
  {
    "ko": "걷다",
    "slug": "walking_farmer",
    "folder": "items",
    "nameEn": "to walk",
    "family": "topik-vocabulary"
  },
  {
    "ko": "발",
    "slug": "bare_foot",
    "folder": "items",
    "nameEn": "foot",
    "family": "topik-vocabulary"
  },
  {
    "ko": "편하다",
    "slug": "comfortable_farmer",
    "folder": "items",
    "nameEn": "to be comfortable, at ease",
    "family": "topik-vocabulary"
  },
  {
    "ko": "가볍다",
    "slug": "light_feather",
    "folder": "items",
    "nameEn": "to be light in weight",
    "family": "topik-vocabulary"
  },
  {
    "ko": "선풍기",
    "slug": "desk_fan",
    "folder": "items",
    "nameEn": "an electric fan",
    "family": "topik-vocabulary"
  },
  {
    "ko": "틀다",
    "slug": "turn_radio_dial",
    "folder": "items",
    "nameEn": "to turn on a fan, radio or tap",
    "family": "topik-vocabulary"
  },
  {
    "ko": "더럽다",
    "slug": "dirty_laundry",
    "folder": "items",
    "nameEn": "to be dirty",
    "family": "topik-vocabulary"
  },
  {
    "ko": "이불",
    "slug": "folded_quilt",
    "folder": "items",
    "nameEn": "a quilt or blanket",
    "family": "topik-vocabulary"
  },
  {
    "ko": "맡기다",
    "slug": "entrust_laundry",
    "folder": "items",
    "nameEn": "to entrust; to leave in someone's care",
    "family": "topik-vocabulary"
  },
  {
    "ko": "세탁소",
    "slug": "laundry_shop",
    "folder": "items",
    "nameEn": "a dry cleaner's; a laundry shop",
    "family": "topik-vocabulary"
  },
  {
    "ko": "달리다",
    "slug": "running_farmer",
    "folder": "items",
    "nameEn": "to run",
    "family": "topik-vocabulary"
  },
  {
    "ko": "바로",
    "slug": "act_immediately",
    "folder": "items",
    "nameEn": "right away; directly",
    "family": "topik-vocabulary"
  },
  {
    "ko": "활기차다",
    "slug": "lively_farmer",
    "folder": "items",
    "nameEn": "to be lively, full of energy",
    "family": "topik-vocabulary"
  },
  {
    "ko": "그림책",
    "slug": "topik_picture_book",
    "folder": "items",
    "nameEn": "a picture book",
    "family": "topik-vocabulary"
  },
  {
    "ko": "자원봉사자",
    "slug": "topik_volunteer_worker",
    "folder": "items",
    "nameEn": "a volunteer worker",
    "family": "topik-vocabulary"
  },
  {
    "ko": "모집",
    "slug": "topik_recruitment",
    "folder": "items",
    "nameEn": "recruitment; accepting applications",
    "family": "topik-vocabulary"
  },
  {
    "ko": "꿈",
    "slug": "topik_personal_dream",
    "folder": "items",
    "nameEn": "a dream or personal aspiration",
    "family": "topik-vocabulary"
  },
  {
    "ko": "희망",
    "slug": "topik_hope",
    "folder": "items",
    "nameEn": "hope; a desired future",
    "family": "topik-vocabulary"
  },
  {
    "ko": "자격",
    "slug": "topik_eligibility",
    "folder": "items",
    "nameEn": "eligibility; a qualification",
    "family": "topik-vocabulary"
  },
  {
    "ko": "고등학생",
    "slug": "topik_high_school_student",
    "folder": "items",
    "nameEn": "a high school student",
    "family": "topik-vocabulary"
  },
  {
    "ko": "또는",
    "slug": "topik_alternatively",
    "folder": "items",
    "nameEn": "or; alternatively (written choice connector)",
    "family": "topik-vocabulary"
  },
  {
    "ko": "신청 방법",
    "slug": "topik_application_method",
    "folder": "items",
    "nameEn": "how to apply; the application method",
    "family": "topik-vocabulary"
  },
  {
    "ko": "홈페이지",
    "slug": "topik_homepage",
    "folder": "items",
    "nameEn": "a website or homepage",
    "family": "topik-vocabulary"
  },
  {
    "ko": "활동 기간",
    "slug": "topik_activity_period",
    "folder": "items",
    "nameEn": "the activity period",
    "family": "topik-vocabulary"
  },
  {
    "ko": "봉사 활동",
    "slug": "topik_volunteer_activity",
    "folder": "items",
    "nameEn": "volunteer work or service activities",
    "family": "topik-vocabulary"
  },
  {
    "ko": "참여하다",
    "slug": "topik_participate",
    "folder": "items",
    "nameEn": "to take part; to participate in an activity",
    "family": "topik-vocabulary"
  },
  {
    "ko": "그래프",
    "slug": "topik_graph",
    "folder": "items",
    "nameEn": "a graph or chart",
    "family": "topik-vocabulary"
  },
  {
    "ko": "고려 사항",
    "slug": "topik_consideration",
    "folder": "items",
    "nameEn": "a consideration; a factor to consider",
    "family": "topik-vocabulary"
  },
  {
    "ko": "기준",
    "slug": "topik_criterion",
    "folder": "items",
    "nameEn": "a criterion or standard for judgment",
    "family": "topik-vocabulary"
  },
  {
    "ko": "규모",
    "slug": "topik_scale_size",
    "folder": "items",
    "nameEn": "the scale or size of an undertaking",
    "family": "topik-vocabulary"
  },
  {
    "ko": "비율",
    "slug": "topik_ratio",
    "folder": "items",
    "nameEn": "a ratio or proportion",
    "family": "topik-vocabulary"
  },
  {
    "ko": "전체",
    "slug": "topik_whole_total",
    "folder": "items",
    "nameEn": "the whole or total; all of a group",
    "family": "topik-vocabulary"
  },
  {
    "ko": "이하",
    "slug": "topik_at_most",
    "folder": "items",
    "nameEn": "or less; no more than",
    "family": "topik-vocabulary"
  },
  {
    "ko": "어린이",
    "slug": "topik_child_formal_notices_use",
    "folder": "items",
    "nameEn": "a child — the formal word, the one notices use",
    "family": "topik-vocabulary"
  },
  {
    "ko": "아이",
    "slug": "topik_child_everyday",
    "folder": "items",
    "nameEn": "a child — the everyday word",
    "family": "topik-vocabulary"
  },
  {
    "ko": "대학생",
    "slug": "topik_university_student",
    "folder": "items",
    "nameEn": "a university student",
    "family": "topik-vocabulary"
  },
  {
    "ko": "봉사자",
    "slug": "topik_volunteer",
    "folder": "items",
    "nameEn": "a volunteer — 자원봉사자 cut short",
    "family": "topik-vocabulary"
  },
  {
    "ko": "신청",
    "slug": "topik_application",
    "folder": "items",
    "nameEn": "an application; putting your name down",
    "family": "topik-vocabulary"
  },
  {
    "ko": "모집 기간",
    "slug": "topik_window_which_applications_are_taken",
    "folder": "items",
    "nameEn": "the window in which applications are taken",
    "family": "topik-vocabulary"
  },
  {
    "ko": "인주어린이도서관",
    "slug": "topik_inju_childrens_library",
    "folder": "items",
    "nameEn": "Inju Children's Library — 인주 is the invented town TOPIK papers are set in",
    "family": "topik-vocabulary"
  },
  {
    "ko": "가능",
    "slug": "topik_possible",
    "folder": "items",
    "nameEn": "possible; eligible as well",
    "family": "topik-vocabulary"
  },
  {
    "ko": "외국인",
    "slug": "topik_foreign_national",
    "folder": "items",
    "nameEn": "a foreign national",
    "family": "topik-vocabulary"
  },
  {
    "ko": "한국어",
    "slug": "topik_korean_language",
    "folder": "items",
    "nameEn": "the Korean language",
    "family": "topik-vocabulary"
  },
  {
    "ko": "선물하다",
    "slug": "topik_give_present",
    "folder": "items",
    "nameEn": "to give something as a present",
    "family": "topik-vocabulary"
  },
  {
    "ko": "두 달",
    "slug": "topik_two_months",
    "folder": "items",
    "nameEn": "two months",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-아/어 주다",
    "slug": "topik_do_someone_favour",
    "folder": "items",
    "nameEn": "to do it for someone else, as a favour to them",
    "family": "topik-vocabulary"
  },
  {
    "ko": "여행사",
    "slug": "topik_travel_agency",
    "folder": "items",
    "nameEn": "a travel agency",
    "family": "topik-vocabulary"
  },
  {
    "ko": "여행 상품",
    "slug": "topik_travel_package_sold_agency",
    "folder": "items",
    "nameEn": "a travel package sold by an agency",
    "family": "topik-vocabulary"
  },
  {
    "ko": "이용 후기",
    "slug": "topik_customer_reviews",
    "folder": "items",
    "nameEn": "customer reviews — what earlier users wrote",
    "family": "topik-vocabulary"
  },
  {
    "ko": "선택하다",
    "slug": "topik_pick_several",
    "folder": "items",
    "nameEn": "to pick one out of several",
    "family": "topik-vocabulary"
  },
  {
    "ko": "중요하다",
    "slug": "topik_matter_carry_weight",
    "folder": "items",
    "nameEn": "to matter, to carry weight",
    "family": "topik-vocabulary"
  },
  {
    "ko": "회사",
    "slug": "topik_company",
    "folder": "items",
    "nameEn": "a company",
    "family": "topik-vocabulary"
  },
  {
    "ko": "성인",
    "slug": "topik_grown_adult",
    "folder": "items",
    "nameEn": "a grown adult",
    "family": "topik-vocabulary"
  },
  {
    "ko": "남녀",
    "slug": "topik_men_women_taken_together",
    "folder": "items",
    "nameEn": "men and women, taken together",
    "family": "topik-vocabulary"
  },
  {
    "ko": "다양성",
    "slug": "topik_variety",
    "folder": "items",
    "nameEn": "variety — how wide the range on offer is",
    "family": "topik-vocabulary"
  },
  {
    "ko": "적다",
    "slug": "topik_few_number",
    "folder": "items",
    "nameEn": "to be few in number",
    "family": "topik-vocabulary"
  },
  {
    "ko": "가장",
    "slug": "topik_most",
    "folder": "items",
    "nameEn": "most — the superlative, and a claim about every other case",
    "family": "topik-vocabulary"
  },
  {
    "ko": "기타",
    "slug": "topik_other",
    "folder": "items",
    "nameEn": "other; everything that did not earn a slice of its own",
    "family": "topik-vocabulary"
  },
  {
    "ko": "설문 대상",
    "slug": "topik_people_survey_was_put",
    "folder": "items",
    "nameEn": "the people a survey was put to",
    "family": "topik-vocabulary"
  },
  {
    "ko": "두 배",
    "slug": "topik_twice_many",
    "folder": "items",
    "nameEn": "twice as many; double",
    "family": "topik-vocabulary"
  },
  {
    "ko": "우표",
    "slug": "topik_postage_stamp",
    "folder": "items",
    "nameEn": "a postage stamp",
    "family": "topik-vocabulary"
  },
  {
    "ko": "박물관",
    "slug": "topik_museum",
    "folder": "items",
    "nameEn": "a museum",
    "family": "topik-vocabulary"
  },
  {
    "ko": "역사",
    "slug": "topik_history",
    "folder": "items",
    "nameEn": "history",
    "family": "topik-vocabulary"
  },
  {
    "ko": "역사실",
    "slug": "topik_history_room_museum",
    "folder": "items",
    "nameEn": "the history room of a museum",
    "family": "topik-vocabulary"
  },
  {
    "ko": "체험실",
    "slug": "topik_hands_room_where_visitors_try_things_themselves",
    "folder": "items",
    "nameEn": "a hands-on room where visitors try things for themselves",
    "family": "topik-vocabulary"
  },
  {
    "ko": "사진",
    "slug": "topik_photograph",
    "folder": "items",
    "nameEn": "a photograph",
    "family": "topik-vocabulary"
  },
  {
    "ko": "편지",
    "slug": "topik_letter",
    "folder": "items",
    "nameEn": "a letter",
    "family": "topik-vocabulary"
  },
  {
    "ko": "우체통",
    "slug": "topik_postbox",
    "folder": "items",
    "nameEn": "a postbox",
    "family": "topik-vocabulary"
  },
  {
    "ko": "인기를 끌다",
    "slug": "topik_drawing_crowd",
    "folder": "items",
    "nameEn": "to be drawing a crowd",
    "family": "topik-vocabulary"
  },
  {
    "ko": "지난달",
    "slug": "topik_last_month",
    "folder": "items",
    "nameEn": "last month",
    "family": "topik-vocabulary"
  },
  {
    "ko": "일 년 뒤",
    "slug": "topik_year_later",
    "folder": "items",
    "nameEn": "a year later",
    "family": "topik-vocabulary"
  },
  {
    "ko": "일 년 전",
    "slug": "topik_year_ago",
    "folder": "items",
    "nameEn": "a year ago",
    "family": "topik-vocabulary"
  },
  {
    "ko": "문을 열다",
    "slug": "topik_open_business",
    "folder": "items",
    "nameEn": "to open for business",
    "family": "topik-vocabulary"
  },
  {
    "ko": "운영",
    "slug": "topik_running_place",
    "folder": "items",
    "nameEn": "the running of a place",
    "family": "topik-vocabulary"
  },
  {
    "ko": "한눈에",
    "slug": "topik_single_glance",
    "folder": "items",
    "nameEn": "in a single glance",
    "family": "topik-vocabulary"
  },
  {
    "ko": "향기",
    "slug": "topik_scent",
    "folder": "items",
    "nameEn": "a scent",
    "family": "topik-vocabulary"
  },
  {
    "ko": "나무",
    "slug": "topik_wood",
    "folder": "items",
    "nameEn": "wood; a tree",
    "family": "topik-vocabulary"
  },
  {
    "ko": "받다",
    "slug": "topik_receive",
    "folder": "items",
    "nameEn": "to receive",
    "family": "topik-vocabulary"
  },
  {
    "ko": "맡다",
    "slug": "topik_smell",
    "folder": "items",
    "nameEn": "to smell something",
    "family": "topik-vocabulary"
  },
  {
    "ko": "만지다",
    "slug": "topik_touch_handle",
    "folder": "items",
    "nameEn": "to touch, to handle",
    "family": "topik-vocabulary"
  },
  {
    "ko": "들어가다",
    "slug": "topik_go_set",
    "folder": "items",
    "nameEn": "to go in; to be set into",
    "family": "topik-vocabulary"
  },
  {
    "ko": "만들다",
    "slug": "topik_make",
    "folder": "items",
    "nameEn": "to make",
    "family": "topik-vocabulary"
  },
  {
    "ko": "쓰다",
    "slug": "topik_write",
    "folder": "items",
    "nameEn": "to write",
    "family": "topik-vocabulary"
  },
  {
    "ko": "보내다",
    "slug": "topik_send",
    "folder": "items",
    "nameEn": "to send",
    "family": "topik-vocabulary"
  },
  {
    "ko": "느리다",
    "slug": "topik_slow",
    "folder": "items",
    "nameEn": "to be slow",
    "family": "topik-vocabulary"
  },
  {
    "ko": "휴일",
    "slug": "topik_day_off_public_holiday",
    "folder": "items",
    "nameEn": "a day off, a public holiday",
    "family": "topik-vocabulary"
  },
  {
    "ko": "경찰",
    "slug": "topik_police",
    "folder": "items",
    "nameEn": "the police",
    "family": "topik-vocabulary"
  },
  {
    "ko": "경위",
    "slug": "topik_police_lieutenant",
    "folder": "items",
    "nameEn": "a police lieutenant — the rank the name is followed by",
    "family": "topik-vocabulary"
  },
  {
    "ko": "등산객",
    "slug": "topik_hiker",
    "folder": "items",
    "nameEn": "a hiker",
    "family": "topik-vocabulary"
  },
  {
    "ko": "정상",
    "slug": "topik_summit_mountain",
    "folder": "items",
    "nameEn": "the summit of a mountain",
    "family": "topik-vocabulary"
  },
  {
    "ko": "중턱",
    "slug": "topik_halfway_mountain",
    "folder": "items",
    "nameEn": "halfway up a mountain",
    "family": "topik-vocabulary"
  },
  {
    "ko": "대피소",
    "slug": "topik_shelter",
    "folder": "items",
    "nameEn": "a shelter",
    "family": "topik-vocabulary"
  },
  {
    "ko": "구조하다",
    "slug": "topik_rescue",
    "folder": "items",
    "nameEn": "to rescue",
    "family": "topik-vocabulary"
  },
  {
    "ko": "구조대",
    "slug": "topik_rescue_team",
    "folder": "items",
    "nameEn": "a rescue team",
    "family": "topik-vocabulary"
  },
  {
    "ko": "여성",
    "slug": "topik_woman",
    "folder": "items",
    "nameEn": "a woman",
    "family": "topik-vocabulary"
  },
  {
    "ko": "쓰러지다",
    "slug": "topik_collapse",
    "folder": "items",
    "nameEn": "to collapse",
    "family": "topik-vocabulary"
  },
  {
    "ko": "발견하다",
    "slug": "topik_spot_come_across",
    "folder": "items",
    "nameEn": "to spot, to come across",
    "family": "topik-vocabulary"
  },
  {
    "ko": "체온",
    "slug": "topik_body_temperature",
    "folder": "items",
    "nameEn": "body temperature",
    "family": "topik-vocabulary"
  },
  {
    "ko": "겉옷",
    "slug": "topik_outer_coat",
    "folder": "items",
    "nameEn": "an outer coat",
    "family": "topik-vocabulary"
  },
  {
    "ko": "벗다",
    "slug": "topik_take_off_garment",
    "folder": "items",
    "nameEn": "to take off a garment",
    "family": "topik-vocabulary"
  },
  {
    "ko": "덮다",
    "slug": "topik_cover",
    "folder": "items",
    "nameEn": "to cover something over",
    "family": "topik-vocabulary"
  },
  {
    "ko": "신고하다",
    "slug": "topik_report_authorities",
    "folder": "items",
    "nameEn": "to report it to the authorities",
    "family": "topik-vocabulary"
  },
  {
    "ko": "이후",
    "slug": "topik_then",
    "folder": "items",
    "nameEn": "after that, from then on",
    "family": "topik-vocabulary"
  },
  {
    "ko": "차량",
    "slug": "topik_vehicle",
    "folder": "items",
    "nameEn": "a vehicle",
    "family": "topik-vocabulary"
  },
  {
    "ko": "업다",
    "slug": "topik_carry_someone_back",
    "folder": "items",
    "nameEn": "to carry someone on your back",
    "family": "topik-vocabulary"
  },
  {
    "ko": "뛰다",
    "slug": "topik_run_jump",
    "folder": "items",
    "nameEn": "to run, and to jump — the same verb does both",
    "family": "topik-vocabulary"
  },
  {
    "ko": "내려가다",
    "slug": "topik_go_down",
    "folder": "items",
    "nameEn": "to go down",
    "family": "topik-vocabulary"
  },
  {
    "ko": "병원",
    "slug": "topik_hospital",
    "folder": "items",
    "nameEn": "a hospital",
    "family": "topik-vocabulary"
  },
  {
    "ko": "이송되다",
    "slug": "topik_taken_hospital",
    "folder": "items",
    "nameEn": "to be taken to hospital — the word a news report uses",
    "family": "topik-vocabulary"
  },
  {
    "ko": "치료",
    "slug": "topik_medical_treatment",
    "folder": "items",
    "nameEn": "medical treatment",
    "family": "topik-vocabulary"
  },
  {
    "ko": "되찾다",
    "slug": "topik_get_back_again",
    "folder": "items",
    "nameEn": "to get it back again",
    "family": "topik-vocabulary"
  },
  {
    "ko": "이동하다",
    "slug": "topik_move_place_another",
    "folder": "items",
    "nameEn": "to move from one place to another",
    "family": "topik-vocabulary"
  },
  {
    "ko": "복숭아",
    "slug": "topik_peach",
    "folder": "items",
    "nameEn": "a peach",
    "family": "topik-vocabulary"
  },
  {
    "ko": "껍질",
    "slug": "topik_skin_fruit",
    "folder": "items",
    "nameEn": "the skin of a fruit",
    "family": "topik-vocabulary"
  },
  {
    "ko": "껍질째",
    "slug": "topik_skin_all_without_peeling",
    "folder": "items",
    "nameEn": "skin and all, without peeling it",
    "family": "topik-vocabulary"
  },
  {
    "ko": "딱딱하다",
    "slug": "topik_hard_bite",
    "folder": "items",
    "nameEn": "to be hard to the bite",
    "family": "topik-vocabulary"
  },
  {
    "ko": "식감",
    "slug": "topik_mouthfeel_texture_food",
    "folder": "items",
    "nameEn": "mouthfeel, the texture of a food",
    "family": "topik-vocabulary"
  },
  {
    "ko": "얇다",
    "slug": "topik_thin",
    "folder": "items",
    "nameEn": "to be thin",
    "family": "topik-vocabulary"
  },
  {
    "ko": "부드럽다",
    "slug": "topik_soft",
    "folder": "items",
    "nameEn": "to be soft",
    "family": "topik-vocabulary"
  },
  {
    "ko": "소개되다",
    "slug": "topik_introduced_place",
    "folder": "items",
    "nameEn": "to be introduced to a place",
    "family": "topik-vocabulary"
  },
  {
    "ko": "N에 비해",
    "slug": "topik_compared_n",
    "folder": "items",
    "nameEn": "compared with N",
    "family": "topik-vocabulary"
  },
  {
    "ko": "이르다",
    "slug": "topik_early_season",
    "folder": "items",
    "nameEn": "to be early in the season",
    "family": "topik-vocabulary"
  },
  {
    "ko": "시기",
    "slug": "topik_time_year_period",
    "folder": "items",
    "nameEn": "a time of year, a period",
    "family": "topik-vocabulary"
  },
  {
    "ko": "장점",
    "slug": "topik_strong_point_advantage",
    "folder": "items",
    "nameEn": "a strong point, an advantage",
    "family": "topik-vocabulary"
  },
  {
    "ko": "결합하다",
    "slug": "topik_combine_two_things",
    "folder": "items",
    "nameEn": "to combine two things into one",
    "family": "topik-vocabulary"
  },
  {
    "ko": "감기에 걸리다",
    "slug": "topik_catch_cold",
    "folder": "items",
    "nameEn": "to catch a cold",
    "family": "topik-vocabulary"
  },
  {
    "ko": "밤새",
    "slug": "topik_whole_night_through",
    "folder": "items",
    "nameEn": "the whole night through — the bare form of 밤새도록",
    "family": "topik-vocabulary"
  },
  {
    "ko": "소리",
    "slug": "topik_sound",
    "folder": "items",
    "nameEn": "a sound",
    "family": "topik-vocabulary"
  },
  {
    "ko": "울다",
    "slug": "topik_cry",
    "folder": "items",
    "nameEn": "to cry",
    "family": "topik-vocabulary"
  },
  {
    "ko": "울음소리",
    "slug": "topik_sound_crying",
    "folder": "items",
    "nameEn": "the sound of crying",
    "family": "topik-vocabulary"
  },
  {
    "ko": "아주머니",
    "slug": "topik_middle_aged_woman_maam",
    "folder": "items",
    "nameEn": "a middle-aged woman, ma’am",
    "family": "topik-vocabulary"
  },
  {
    "ko": "아프다",
    "slug": "topik_ill_hurt",
    "folder": "items",
    "nameEn": "to be ill, to hurt",
    "family": "topik-vocabulary"
  },
  {
    "ko": "오히려",
    "slug": "topik_contrary_if_anything",
    "folder": "items",
    "nameEn": "on the contrary, if anything",
    "family": "topik-vocabulary"
  },
  {
    "ko": "걱정하다",
    "slug": "topik_worry",
    "folder": "items",
    "nameEn": "to worry",
    "family": "topik-vocabulary"
  },
  {
    "ko": "아침",
    "slug": "topik_morning_2",
    "folder": "items",
    "nameEn": "the morning",
    "family": "topik-vocabulary"
  },
  {
    "ko": "나서다",
    "slug": "topik_set_place",
    "folder": "items",
    "nameEn": "to set out from a place; and after -고, to step forward and act",
    "family": "topik-vocabulary"
  },
  {
    "ko": "옆집",
    "slug": "topik_house_next_door",
    "folder": "items",
    "nameEn": "the house next door",
    "family": "topik-vocabulary"
  },
  {
    "ko": "만나다",
    "slug": "topik_meet",
    "folder": "items",
    "nameEn": "to meet",
    "family": "topik-vocabulary"
  },
  {
    "ko": "달래다",
    "slug": "topik_soothe_crying_child",
    "folder": "items",
    "nameEn": "to soothe a crying child",
    "family": "topik-vocabulary"
  },
  {
    "ko": "이웃",
    "slug": "topik_neighbour",
    "folder": "items",
    "nameEn": "a neighbour",
    "family": "topik-vocabulary"
  },
  {
    "ko": "온라인",
    "slug": "topik_online",
    "folder": "items",
    "nameEn": "online",
    "family": "topik-vocabulary"
  },
  {
    "ko": "가구",
    "slug": "topik_furniture",
    "folder": "items",
    "nameEn": "furniture",
    "family": "topik-vocabulary"
  },
  {
    "ko": "구매",
    "slug": "topik_purchase_2",
    "folder": "items",
    "nameEn": "a purchase",
    "family": "topik-vocabulary"
  },
  {
    "ko": "반품",
    "slug": "topik_sending_goods_back",
    "folder": "items",
    "nameEn": "sending goods back",
    "family": "topik-vocabulary"
  },
  {
    "ko": "사례",
    "slug": "topik_instance_reported_case",
    "folder": "items",
    "nameEn": "an instance, a reported case",
    "family": "topik-vocabulary"
  },
  {
    "ko": "그런데",
    "slug": "topik_however",
    "folder": "items",
    "nameEn": "however — the turn into a problem",
    "family": "topik-vocabulary"
  },
  {
    "ko": "비싸다",
    "slug": "topik_expensive",
    "folder": "items",
    "nameEn": "to be expensive",
    "family": "topik-vocabulary"
  },
  {
    "ko": "비용",
    "slug": "topik_cost",
    "folder": "items",
    "nameEn": "a cost",
    "family": "topik-vocabulary"
  },
  {
    "ko": "피해를 보다",
    "slug": "topik_lose_suffer_harm",
    "folder": "items",
    "nameEn": "to lose out, to suffer harm",
    "family": "topik-vocabulary"
  },
  {
    "ko": "소비자",
    "slug": "topik_consumer",
    "folder": "items",
    "nameEn": "a consumer",
    "family": "topik-vocabulary"
  },
  {
    "ko": "따라서",
    "slug": "topik_therefore",
    "folder": "items",
    "nameEn": "therefore — the written conclusion marker",
    "family": "topik-vocabulary"
  },
  {
    "ko": "조건",
    "slug": "topik_terms_conditions",
    "folder": "items",
    "nameEn": "terms and conditions",
    "family": "topik-vocabulary"
  },
  {
    "ko": "확인하다",
    "slug": "topik_check",
    "folder": "items",
    "nameEn": "to check something",
    "family": "topik-vocabulary"
  },
  {
    "ko": "업체",
    "slug": "topik_firm_business",
    "folder": "items",
    "nameEn": "a firm, a business",
    "family": "topik-vocabulary"
  },
  {
    "ko": "까다롭다",
    "slug": "topik_demanding_hard_satisfy",
    "folder": "items",
    "nameEn": "to be demanding, hard to satisfy",
    "family": "topik-vocabulary"
  },
  {
    "ko": "내세우다",
    "slug": "topik_put_condition_forward",
    "folder": "items",
    "nameEn": "to put a condition forward",
    "family": "topik-vocabulary"
  },
  {
    "ko": "거절하다",
    "slug": "topik_refuse",
    "folder": "items",
    "nameEn": "to refuse",
    "family": "topik-vocabulary"
  },
  {
    "ko": "경우",
    "slug": "topik_case_occasion",
    "folder": "items",
    "nameEn": "a case, an occasion",
    "family": "topik-vocabulary"
  },
  {
    "ko": "발생하다",
    "slug": "topik_occur_arise",
    "folder": "items",
    "nameEn": "to occur, to arise",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-(으)면서",
    "slug": "topik_thing_rises_so_does_other",
    "folder": "items",
    "nameEn": "as one thing rises, so does the other",
    "family": "topik-vocabulary"
  },
  {
    "ko": "북극여우",
    "slug": "topik_arctic_fox",
    "folder": "items",
    "nameEn": "an arctic fox",
    "family": "topik-vocabulary"
  },
  {
    "ko": "북극",
    "slug": "topik_arctic",
    "folder": "items",
    "nameEn": "the Arctic",
    "family": "topik-vocabulary"
  },
  {
    "ko": "계절",
    "slug": "topik_season_year",
    "folder": "items",
    "nameEn": "a season of the year",
    "family": "topik-vocabulary"
  },
  {
    "ko": "겨울",
    "slug": "topik_winter",
    "folder": "items",
    "nameEn": "winter",
    "family": "topik-vocabulary"
  },
  {
    "ko": "바위",
    "slug": "topik_rock",
    "folder": "items",
    "nameEn": "a rock",
    "family": "topik-vocabulary"
  },
  {
    "ko": "흰색",
    "slug": "topik_colour_white",
    "folder": "items",
    "nameEn": "the colour white",
    "family": "topik-vocabulary"
  },
  {
    "ko": "갈색빛",
    "slug": "topik_brownish_tinge",
    "folder": "items",
    "nameEn": "a brownish tinge",
    "family": "topik-vocabulary"
  },
  {
    "ko": "동물",
    "slug": "topik_animal",
    "folder": "items",
    "nameEn": "an animal",
    "family": "topik-vocabulary"
  },
  {
    "ko": "천적",
    "slug": "topik_natural_predator",
    "folder": "items",
    "nameEn": "a natural predator",
    "family": "topik-vocabulary"
  },
  {
    "ko": "먹잇감",
    "slug": "topik_prey",
    "folder": "items",
    "nameEn": "prey",
    "family": "topik-vocabulary"
  },
  {
    "ko": "무리를 이루다",
    "slug": "topik_gather_pack",
    "folder": "items",
    "nameEn": "to gather into a pack",
    "family": "topik-vocabulary"
  },
  {
    "ko": "발자국",
    "slug": "topik_footprint",
    "folder": "items",
    "nameEn": "a footprint",
    "family": "topik-vocabulary"
  },
  {
    "ko": "사냥하다",
    "slug": "topik_hunt",
    "folder": "items",
    "nameEn": "to hunt",
    "family": "topik-vocabulary"
  },
  {
    "ko": "바꾸다",
    "slug": "topik_change",
    "folder": "items",
    "nameEn": "to change something — the one with an object",
    "family": "topik-vocabulary"
  },
  {
    "ko": "바뀌다",
    "slug": "topik_change_itself",
    "folder": "items",
    "nameEn": "to change of itself — the one without",
    "family": "topik-vocabulary"
  },
  {
    "ko": "비슷하다",
    "slug": "topik_close_resemble",
    "folder": "items",
    "nameEn": "to be close to, to resemble",
    "family": "topik-vocabulary"
  },
  {
    "ko": "변화",
    "slug": "topik_change_has_taken_place",
    "folder": "items",
    "nameEn": "a change that has taken place",
    "family": "topik-vocabulary"
  },
  {
    "ko": "숨기다",
    "slug": "topik_hide_away",
    "folder": "items",
    "nameEn": "to hide something away",
    "family": "topik-vocabulary"
  },
  {
    "ko": "특수하다",
    "slug": "topik_ordinary",
    "folder": "items",
    "nameEn": "to be out of the ordinary",
    "family": "topik-vocabulary"
  },
  {
    "ko": "환경",
    "slug": "topik_environment",
    "folder": "items",
    "nameEn": "an environment",
    "family": "topik-vocabulary"
  },
  {
    "ko": "N(으)로부터",
    "slug": "topik_n",
    "folder": "items",
    "nameEn": "from N — a source you move away from",
    "family": "topik-vocabulary"
  },
  {
    "ko": "보호하다",
    "slug": "topik_protect",
    "folder": "items",
    "nameEn": "to protect",
    "family": "topik-vocabulary"
  },
  {
    "ko": "동료",
    "slug": "topik_fellow_own_kind",
    "folder": "items",
    "nameEn": "a fellow, one of your own kind",
    "family": "topik-vocabulary"
  },
  {
    "ko": "몰래",
    "slug": "topik_without_being_noticed",
    "folder": "items",
    "nameEn": "without being noticed",
    "family": "topik-vocabulary"
  },
  {
    "ko": "다가가다",
    "slug": "topik_draw_closer",
    "folder": "items",
    "nameEn": "to draw closer to",
    "family": "topik-vocabulary"
  },
  {
    "ko": "적절히",
    "slug": "topik_right_degree",
    "folder": "items",
    "nameEn": "to the right degree",
    "family": "topik-vocabulary"
  },
  {
    "ko": "유지하다",
    "slug": "topik_keep",
    "folder": "items",
    "nameEn": "to keep something as it is",
    "family": "topik-vocabulary"
  },
  {
    "ko": "남기다",
    "slug": "topik_leave_behind",
    "folder": "items",
    "nameEn": "to leave something behind",
    "family": "topik-vocabulary"
  },
  {
    "ko": "연필",
    "slug": "topik_pencil",
    "folder": "items",
    "nameEn": "a pencil",
    "family": "topik-vocabulary"
  },
  {
    "ko": "글씨",
    "slug": "topik_handwriting",
    "folder": "items",
    "nameEn": "handwriting",
    "family": "topik-vocabulary"
  },
  {
    "ko": "반듯하다",
    "slug": "topik_straight_even",
    "folder": "items",
    "nameEn": "to be straight and even",
    "family": "topik-vocabulary"
  },
  {
    "ko": "어려움",
    "slug": "topik_difficulty",
    "folder": "items",
    "nameEn": "difficulty",
    "family": "topik-vocabulary"
  },
  {
    "ko": "나이",
    "slug": "topik_age_years",
    "folder": "items",
    "nameEn": "age, in years",
    "family": "topik-vocabulary"
  },
  {
    "ko": "전자 기기",
    "slug": "topik_electronic_device",
    "folder": "items",
    "nameEn": "an electronic device",
    "family": "topik-vocabulary"
  },
  {
    "ko": "장시간",
    "slug": "topik_long_stretch",
    "folder": "items",
    "nameEn": "for a long stretch",
    "family": "topik-vocabulary"
  },
  {
    "ko": "사용하다",
    "slug": "topik_use",
    "folder": "items",
    "nameEn": "to use",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-(으)ㄴ 탓이다",
    "slug": "topik_because",
    "folder": "items",
    "nameEn": "it is because of — and the cause is blamed",
    "family": "topik-vocabulary"
  },
  {
    "ko": "화면",
    "slug": "topik_screen",
    "folder": "items",
    "nameEn": "a screen",
    "family": "topik-vocabulary"
  },
  {
    "ko": "단순히",
    "slug": "topik_merely_nothing_more",
    "folder": "items",
    "nameEn": "merely, and nothing more",
    "family": "topik-vocabulary"
  },
  {
    "ko": "누르다",
    "slug": "topik_press",
    "folder": "items",
    "nameEn": "to press",
    "family": "topik-vocabulary"
  },
  {
    "ko": "밀다",
    "slug": "topik_push_swipe",
    "folder": "items",
    "nameEn": "to push, to swipe",
    "family": "topik-vocabulary"
  },
  {
    "ko": "동작",
    "slug": "topik_movement_body",
    "folder": "items",
    "nameEn": "a movement of the body",
    "family": "topik-vocabulary"
  },
  {
    "ko": "반복하다",
    "slug": "topik_repeat",
    "folder": "items",
    "nameEn": "to repeat",
    "family": "topik-vocabulary"
  },
  {
    "ko": "근육",
    "slug": "topik_muscle",
    "folder": "items",
    "nameEn": "a muscle",
    "family": "topik-vocabulary"
  },
  {
    "ko": "소근육",
    "slug": "topik_fine_muscles_hand",
    "folder": "items",
    "nameEn": "the fine muscles of the hand",
    "family": "topik-vocabulary"
  },
  {
    "ko": "발달하다",
    "slug": "topik_develop_faculty",
    "folder": "items",
    "nameEn": "to develop, of a faculty",
    "family": "topik-vocabulary"
  },
  {
    "ko": "손가락",
    "slug": "topik_finger",
    "folder": "items",
    "nameEn": "a finger",
    "family": "topik-vocabulary"
  },
  {
    "ko": "움직이다",
    "slug": "topik_move_part_body",
    "folder": "items",
    "nameEn": "to move a part of the body",
    "family": "topik-vocabulary"
  },
  {
    "ko": "놀이",
    "slug": "topik_play_game_children_do",
    "folder": "items",
    "nameEn": "play, a game children do",
    "family": "topik-vocabulary"
  },
  {
    "ko": "전문가",
    "slug": "topik_specialist",
    "folder": "items",
    "nameEn": "a specialist",
    "family": "topik-vocabulary"
  },
  {
    "ko": "제대로",
    "slug": "topik_properly_should",
    "folder": "items",
    "nameEn": "properly, as it should be",
    "family": "topik-vocabulary"
  },
  {
    "ko": "감싸다",
    "slug": "topik_wrap_around",
    "folder": "items",
    "nameEn": "to wrap around — a hand round a pencil, or material round a bottle",
    "family": "topik-vocabulary"
  },
  {
    "ko": "빠르게",
    "slug": "topik_quickly",
    "folder": "items",
    "nameEn": "quickly",
    "family": "topik-vocabulary"
  },
  {
    "ko": "줄이다",
    "slug": "topik_reduce",
    "folder": "items",
    "nameEn": "to reduce something",
    "family": "topik-vocabulary"
  },
  {
    "ko": "충분히",
    "slug": "topik_enough_sufficient_degree",
    "folder": "items",
    "nameEn": "enough, to a sufficient degree",
    "family": "topik-vocabulary"
  },
  {
    "ko": "완전히",
    "slug": "topik_completely",
    "folder": "items",
    "nameEn": "completely",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-지 못하다",
    "slug": "topik_cannot_manage",
    "folder": "items",
    "nameEn": "cannot manage to — inability, not refusal",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-도록 하다",
    "slug": "topik_see_someone_does",
    "folder": "items",
    "nameEn": "to see to it that someone does it",
    "family": "topik-vocabulary"
  },
  {
    "ko": "고인돌",
    "slug": "topik_dolmen",
    "folder": "items",
    "nameEn": "a dolmen",
    "family": "topik-vocabulary"
  },
  {
    "ko": "옛날",
    "slug": "topik_long_ago",
    "folder": "items",
    "nameEn": "long ago",
    "family": "topik-vocabulary"
  },
  {
    "ko": "청동기 시대",
    "slug": "topik_bronze_age",
    "folder": "items",
    "nameEn": "the Bronze Age",
    "family": "topik-vocabulary"
  },
  {
    "ko": "무덤",
    "slug": "topik_tomb",
    "folder": "items",
    "nameEn": "a tomb",
    "family": "topik-vocabulary"
  },
  {
    "ko": "받침돌",
    "slug": "topik_supporting_stone",
    "folder": "items",
    "nameEn": "a supporting stone",
    "family": "topik-vocabulary"
  },
  {
    "ko": "덮개돌",
    "slug": "topik_capstone",
    "folder": "items",
    "nameEn": "a capstone",
    "family": "topik-vocabulary"
  },
  {
    "ko": "세우다",
    "slug": "topik_stand_upright",
    "folder": "items",
    "nameEn": "to stand something upright",
    "family": "topik-vocabulary"
  },
  {
    "ko": "얹다",
    "slug": "topik_lay_thing_top_another",
    "folder": "items",
    "nameEn": "to lay one thing on top of another",
    "family": "topik-vocabulary"
  },
  {
    "ko": "형태",
    "slug": "topik_form_thing_takes",
    "folder": "items",
    "nameEn": "the form a thing takes",
    "family": "topik-vocabulary"
  },
  {
    "ko": "무게",
    "slug": "topik_weight",
    "folder": "items",
    "nameEn": "weight",
    "family": "topik-vocabulary"
  },
  {
    "ko": "수십",
    "slug": "topik_tens_several_dozen",
    "folder": "items",
    "nameEn": "tens of, several dozen",
    "family": "topik-vocabulary"
  },
  {
    "ko": "달하다",
    "slug": "topik_reach_figure",
    "folder": "items",
    "nameEn": "to reach a figure",
    "family": "topik-vocabulary"
  },
  {
    "ko": "거대하다",
    "slug": "topik_enormous",
    "folder": "items",
    "nameEn": "to be enormous",
    "family": "topik-vocabulary"
  },
  {
    "ko": "운반하다",
    "slug": "topik_carry_heavy",
    "folder": "items",
    "nameEn": "to carry something heavy",
    "family": "topik-vocabulary"
  },
  {
    "ko": "그만큼",
    "slug": "topik_correspondingly_much",
    "folder": "items",
    "nameEn": "correspondingly much",
    "family": "topik-vocabulary"
  },
  {
    "ko": "필요하다",
    "slug": "topik_needed",
    "folder": "items",
    "nameEn": "to be needed",
    "family": "topik-vocabulary"
  },
  {
    "ko": "부르다",
    "slug": "topik_call_someone",
    "folder": "items",
    "nameEn": "to call someone over",
    "family": "topik-vocabulary"
  },
  {
    "ko": "모으다",
    "slug": "topik_gather_people_together",
    "folder": "items",
    "nameEn": "to gather people together",
    "family": "topik-vocabulary"
  },
  {
    "ko": "시키다",
    "slug": "topik_set_someone_task",
    "folder": "items",
    "nameEn": "to set someone to a task",
    "family": "topik-vocabulary"
  },
  {
    "ko": "권력",
    "slug": "topik_power_other_people",
    "folder": "items",
    "nameEn": "power over other people",
    "family": "topik-vocabulary"
  },
  {
    "ko": "체력",
    "slug": "topik_physical_strength",
    "folder": "items",
    "nameEn": "physical strength",
    "family": "topik-vocabulary"
  },
  {
    "ko": "굉장히",
    "slug": "topik_tremendously",
    "folder": "items",
    "nameEn": "tremendously",
    "family": "topik-vocabulary"
  },
  {
    "ko": "약하다",
    "slug": "topik_weak",
    "folder": "items",
    "nameEn": "to be weak",
    "family": "topik-vocabulary"
  },
  {
    "ko": "무기",
    "slug": "topik_weapon",
    "folder": "items",
    "nameEn": "a weapon",
    "family": "topik-vocabulary"
  },
  {
    "ko": "제작하다",
    "slug": "topik_manufacture",
    "folder": "items",
    "nameEn": "to manufacture",
    "family": "topik-vocabulary"
  },
  {
    "ko": "수명",
    "slug": "topik_lifespan",
    "folder": "items",
    "nameEn": "a lifespan",
    "family": "topik-vocabulary"
  },
  {
    "ko": "남들",
    "slug": "topik_other_people",
    "folder": "items",
    "nameEn": "other people",
    "family": "topik-vocabulary"
  },
  {
    "ko": "짧다",
    "slug": "topik_short",
    "folder": "items",
    "nameEn": "to be short",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-(으)ㄹ 정도로",
    "slug": "topik_degree",
    "folder": "items",
    "nameEn": "to the degree that",
    "family": "topik-vocabulary"
  },
  {
    "ko": "도시",
    "slug": "topik_city",
    "folder": "items",
    "nameEn": "a city",
    "family": "topik-vocabulary"
  },
  {
    "ko": "도로",
    "slug": "topik_road",
    "folder": "items",
    "nameEn": "a road",
    "family": "topik-vocabulary"
  },
  {
    "ko": "대부분",
    "slug": "topik_most_part",
    "folder": "items",
    "nameEn": "for the most part",
    "family": "topik-vocabulary"
  },
  {
    "ko": "아스팔트",
    "slug": "topik_asphalt",
    "folder": "items",
    "nameEn": "asphalt",
    "family": "topik-vocabulary"
  },
  {
    "ko": "스며들다",
    "slug": "topik_soak_through",
    "folder": "items",
    "nameEn": "to soak through into",
    "family": "topik-vocabulary"
  },
  {
    "ko": "뒤덮이다",
    "slug": "topik_covered",
    "folder": "items",
    "nameEn": "to be covered over",
    "family": "topik-vocabulary"
  },
  {
    "ko": "빗물",
    "slug": "topik_rainwater",
    "folder": "items",
    "nameEn": "rainwater",
    "family": "topik-vocabulary"
  },
  {
    "ko": "지하",
    "slug": "topik_underground",
    "folder": "items",
    "nameEn": "underground",
    "family": "topik-vocabulary"
  },
  {
    "ko": "흘러 들어가다",
    "slug": "topik_flow",
    "folder": "items",
    "nameEn": "to flow in",
    "family": "topik-vocabulary"
  },
  {
    "ko": "지하수",
    "slug": "topik_groundwater",
    "folder": "items",
    "nameEn": "groundwater",
    "family": "topik-vocabulary"
  },
  {
    "ko": "부족",
    "slug": "topik_shortage",
    "folder": "items",
    "nameEn": "a shortage",
    "family": "topik-vocabulary"
  },
  {
    "ko": "부족해지다",
    "slug": "topik_run_short",
    "folder": "items",
    "nameEn": "to run short",
    "family": "topik-vocabulary"
  },
  {
    "ko": "잠기다",
    "slug": "topik_submerged",
    "folder": "items",
    "nameEn": "to be submerged",
    "family": "topik-vocabulary"
  },
  {
    "ko": "자주",
    "slug": "topik_often",
    "folder": "items",
    "nameEn": "often",
    "family": "topik-vocabulary"
  },
  {
    "ko": "포장재",
    "slug": "topik_surfacing_material",
    "folder": "items",
    "nameEn": "a surfacing material",
    "family": "topik-vocabulary"
  },
  {
    "ko": "개발되다",
    "slug": "topik_developed_product",
    "folder": "items",
    "nameEn": "to be developed, of a product",
    "family": "topik-vocabulary"
  },
  {
    "ko": "미세하다",
    "slug": "topik_minute",
    "folder": "items",
    "nameEn": "to be minute",
    "family": "topik-vocabulary"
  },
  {
    "ko": "구멍",
    "slug": "topik_hole",
    "folder": "items",
    "nameEn": "a hole",
    "family": "topik-vocabulary"
  },
  {
    "ko": "쉽게",
    "slug": "topik_easily",
    "folder": "items",
    "nameEn": "easily",
    "family": "topik-vocabulary"
  },
  {
    "ko": "통과하다",
    "slug": "topik_pass_through",
    "folder": "items",
    "nameEn": "to pass through",
    "family": "topik-vocabulary"
  },
  {
    "ko": "자원",
    "slug": "topik_natural_resource",
    "folder": "items",
    "nameEn": "a natural resource",
    "family": "topik-vocabulary"
  },
  {
    "ko": "보충되다",
    "slug": "topik_replenished",
    "folder": "items",
    "nameEn": "to be replenished",
    "family": "topik-vocabulary"
  },
  {
    "ko": "하수구",
    "slug": "topik_drain",
    "folder": "items",
    "nameEn": "a drain",
    "family": "topik-vocabulary"
  },
  {
    "ko": "몰리다",
    "slug": "topik_rush_together_place",
    "folder": "items",
    "nameEn": "to rush together into one place",
    "family": "topik-vocabulary"
  },
  {
    "ko": "침수",
    "slug": "topik_flooding",
    "folder": "items",
    "nameEn": "flooding",
    "family": "topik-vocabulary"
  },
  {
    "ko": "위험",
    "slug": "topik_risk",
    "folder": "items",
    "nameEn": "a risk",
    "family": "topik-vocabulary"
  },
  {
    "ko": "또한",
    "slug": "topik_also",
    "folder": "items",
    "nameEn": "and also — a second thing of the same kind",
    "family": "topik-vocabulary"
  },
  {
    "ko": "비록",
    "slug": "topik_although",
    "folder": "items",
    "nameEn": "although — and it needs -지만 later in the sentence",
    "family": "topik-vocabulary"
  },
  {
    "ko": "과연",
    "slug": "topik_sure_enough",
    "folder": "items",
    "nameEn": "sure enough — the speaker reacting",
    "family": "topik-vocabulary"
  },
  {
    "ko": "반면",
    "slug": "topik_other_hand",
    "folder": "items",
    "nameEn": "on the other hand",
    "family": "topik-vocabulary"
  },
  {
    "ko": "오염",
    "slug": "topik_pollution",
    "folder": "items",
    "nameEn": "pollution",
    "family": "topik-vocabulary"
  },
  {
    "ko": "역할",
    "slug": "topik_role_plays",
    "folder": "items",
    "nameEn": "a role something plays",
    "family": "topik-vocabulary"
  },
  {
    "ko": "N마다",
    "slug": "topik_each_every_n",
    "folder": "items",
    "nameEn": "each and every N",
    "family": "topik-vocabulary"
  },
  {
    "ko": "환경적",
    "slug": "topik_environmental",
    "folder": "items",
    "nameEn": "environmental",
    "family": "topik-vocabulary"
  },
  {
    "ko": "반영되다",
    "slug": "topik_reflected",
    "folder": "items",
    "nameEn": "to be reflected in",
    "family": "topik-vocabulary"
  },
  {
    "ko": "매우",
    "slug": "topik_very_written_step_stiffer_than",
    "folder": "items",
    "nameEn": "very — the written one, a step stiffer than 아주",
    "family": "topik-vocabulary"
  },
  {
    "ko": "피해를 입히다",
    "slug": "topik_do_harm",
    "folder": "items",
    "nameEn": "to do harm to",
    "family": "topik-vocabulary"
  },
  {
    "ko": "요인",
    "slug": "topik_contributing_factor",
    "folder": "items",
    "nameEn": "a contributing factor",
    "family": "topik-vocabulary"
  },
  {
    "ko": "중 하나",
    "slug": "topik_one_of_the",
    "folder": "items",
    "nameEn": "one of the …",
    "family": "topik-vocabulary"
  },
  {
    "ko": "해결",
    "slug": "topik_solution",
    "folder": "items",
    "nameEn": "a solution",
    "family": "topik-vocabulary"
  },
  {
    "ko": "인주시",
    "slug": "topik_inju_city",
    "folder": "items",
    "nameEn": "Inju City — the invented city these papers are set in",
    "family": "topik-vocabulary"
  },
  {
    "ko": "거리",
    "slug": "topik_street",
    "folder": "items",
    "nameEn": "a street",
    "family": "topik-vocabulary"
  },
  {
    "ko": "식당",
    "slug": "topik_restaurant",
    "folder": "items",
    "nameEn": "a restaurant",
    "family": "topik-vocabulary"
  },
  {
    "ko": "카페",
    "slug": "topik_cafe",
    "folder": "items",
    "nameEn": "a café",
    "family": "topik-vocabulary"
  },
  {
    "ko": "먹거리",
    "slug": "topik_things_eat",
    "folder": "items",
    "nameEn": "things to eat",
    "family": "topik-vocabulary"
  },
  {
    "ko": "골목",
    "slug": "topik_narrow_street_alley",
    "folder": "items",
    "nameEn": "a narrow street, an alley",
    "family": "topik-vocabulary"
  },
  {
    "ko": "모이다",
    "slug": "topik_come_together_place",
    "folder": "items",
    "nameEn": "to come together in one place",
    "family": "topik-vocabulary"
  },
  {
    "ko": "특화되다",
    "slug": "topik_become_known_thing",
    "folder": "items",
    "nameEn": "to become known for one thing",
    "family": "topik-vocabulary"
  },
  {
    "ko": "이곳",
    "slug": "topik_place_here",
    "folder": "items",
    "nameEn": "this place, here",
    "family": "topik-vocabulary"
  },
  {
    "ko": "통행",
    "slug": "topik_traffic_passing_through",
    "folder": "items",
    "nameEn": "traffic passing through",
    "family": "topik-vocabulary"
  },
  {
    "ko": "막다",
    "slug": "topik_block_way",
    "folder": "items",
    "nameEn": "to block the way",
    "family": "topik-vocabulary"
  },
  {
    "ko": "한가운데",
    "slug": "topik_very_middle",
    "folder": "items",
    "nameEn": "the very middle",
    "family": "topik-vocabulary"
  },
  {
    "ko": "찍다",
    "slug": "topik_take_photograph",
    "folder": "items",
    "nameEn": "to take a photograph",
    "family": "topik-vocabulary"
  },
  {
    "ko": "횡단보도",
    "slug": "topik_pedestrian_crossing",
    "folder": "items",
    "nameEn": "a pedestrian crossing",
    "family": "topik-vocabulary"
  },
  {
    "ko": "삼각대",
    "slug": "topik_camera_tripod",
    "folder": "items",
    "nameEn": "a camera tripod",
    "family": "topik-vocabulary"
  },
  {
    "ko": "촬영하다",
    "slug": "topik_film_shoot_footage",
    "folder": "items",
    "nameEn": "to film, to shoot footage",
    "family": "topik-vocabulary"
  },
  {
    "ko": "일부",
    "slug": "topik_portion",
    "folder": "items",
    "nameEn": "some of them, a portion",
    "family": "topik-vocabulary"
  },
  {
    "ko": "방문객",
    "slug": "topik_visitor",
    "folder": "items",
    "nameEn": "a visitor",
    "family": "topik-vocabulary"
  },
  {
    "ko": "사고",
    "slug": "topik_accident",
    "folder": "items",
    "nameEn": "an accident",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-(으)ㄹ 뻔하다",
    "slug": "topik_came_close_happening_did_not",
    "folder": "items",
    "nameEn": "came close to happening and did not",
    "family": "topik-vocabulary"
  },
  {
    "ko": "위험하다",
    "slug": "topik_dangerous",
    "folder": "items",
    "nameEn": "to be dangerous",
    "family": "topik-vocabulary"
  },
  {
    "ko": "운전자",
    "slug": "topik_driver",
    "folder": "items",
    "nameEn": "a driver",
    "family": "topik-vocabulary"
  },
  {
    "ko": "N 간에",
    "slug": "topik_between_n",
    "folder": "items",
    "nameEn": "between N — the written form of 사이에",
    "family": "topik-vocabulary"
  },
  {
    "ko": "사이",
    "slug": "topik_space_between_two_things",
    "folder": "items",
    "nameEn": "the space between two things",
    "family": "topik-vocabulary"
  },
  {
    "ko": "다투다",
    "slug": "topik_quarrel",
    "folder": "items",
    "nameEn": "to quarrel",
    "family": "topik-vocabulary"
  },
  {
    "ko": "잦아지다",
    "slug": "topik_grow_more_frequent",
    "folder": "items",
    "nameEn": "to grow more frequent",
    "family": "topik-vocabulary"
  },
  {
    "ko": "금지하다",
    "slug": "topik_ban",
    "folder": "items",
    "nameEn": "to ban",
    "family": "topik-vocabulary"
  },
  {
    "ko": "갈등",
    "slug": "topik_conflict_between_people",
    "folder": "items",
    "nameEn": "conflict between people",
    "family": "topik-vocabulary"
  },
  {
    "ko": "목이 빠지다",
    "slug": "topik_wait_wait",
    "folder": "items",
    "nameEn": "to wait and wait for something",
    "family": "topik-vocabulary"
  },
  {
    "ko": "한숨을 돌리다",
    "slug": "topik_get_breather_once_worst_has_passed",
    "folder": "items",
    "nameEn": "to get a breather once the worst has passed",
    "family": "topik-vocabulary"
  },
  {
    "ko": "눈살을 찌푸리다",
    "slug": "topik_frown_disapproval_what_you_see",
    "folder": "items",
    "nameEn": "to frown in disapproval at what you see",
    "family": "topik-vocabulary"
  },
  {
    "ko": "코가 납작해지다",
    "slug": "topik_humbled_boasting",
    "folder": "items",
    "nameEn": "to be humbled after boasting",
    "family": "topik-vocabulary"
  },
  {
    "ko": "방영",
    "slug": "topik_airing_programme",
    "folder": "items",
    "nameEn": "the airing of a programme",
    "family": "topik-vocabulary"
  },
  {
    "ko": "톡톡히",
    "slug": "topik_handsomely",
    "folder": "items",
    "nameEn": "handsomely — of a benefit actually felt",
    "family": "topik-vocabulary"
  },
  {
    "ko": "관광객",
    "slug": "topik_tourist",
    "folder": "items",
    "nameEn": "a tourist",
    "family": "topik-vocabulary"
  },
  {
    "ko": "물결",
    "slug": "topik_wave",
    "folder": "items",
    "nameEn": "a wave — of people, or of feeling",
    "family": "topik-vocabulary"
  },
  {
    "ko": "제작자",
    "slug": "topik_producer_programme",
    "folder": "items",
    "nameEn": "a producer of a programme",
    "family": "topik-vocabulary"
  },
  {
    "ko": "모여들다",
    "slug": "topik_flock_all_sides",
    "folder": "items",
    "nameEn": "to flock in from all sides",
    "family": "topik-vocabulary"
  },
  {
    "ko": "덕분에",
    "slug": "topik_thanks",
    "folder": "items",
    "nameEn": "thanks to — and the outcome is good",
    "family": "topik-vocabulary"
  },
  {
    "ko": "방문하다",
    "slug": "topik_visit_place_2",
    "folder": "items",
    "nameEn": "to visit a place",
    "family": "topik-vocabulary"
  },
  {
    "ko": "유치",
    "slug": "topik_attracting_visitors_business_place",
    "folder": "items",
    "nameEn": "attracting visitors or business to a place",
    "family": "topik-vocabulary"
  },
  {
    "ko": "홍보",
    "slug": "topik_publicity",
    "folder": "items",
    "nameEn": "publicity",
    "family": "topik-vocabulary"
  },
  {
    "ko": "방송",
    "slug": "topik_broadcast",
    "folder": "items",
    "nameEn": "a broadcast",
    "family": "topik-vocabulary"
  },
  {
    "ko": "여러",
    "slug": "topik_several_various",
    "folder": "items",
    "nameEn": "several, various",
    "family": "topik-vocabulary"
  },
  {
    "ko": "문제",
    "slug": "topik_problem",
    "folder": "items",
    "nameEn": "a problem",
    "family": "topik-vocabulary"
  },
  {
    "ko": "선수",
    "slug": "topik_athlete",
    "folder": "items",
    "nameEn": "an athlete",
    "family": "topik-vocabulary"
  },
  {
    "ko": "시상대",
    "slug": "topik_winners_podium",
    "folder": "items",
    "nameEn": "the winners’ podium",
    "family": "topik-vocabulary"
  },
  {
    "ko": "펜싱",
    "slug": "topik_fencing",
    "folder": "items",
    "nameEn": "fencing",
    "family": "topik-vocabulary"
  },
  {
    "ko": "종목",
    "slug": "topik_event_discipline_sport",
    "folder": "items",
    "nameEn": "an event or discipline in a sport",
    "family": "topik-vocabulary"
  },
  {
    "ko": "메달",
    "slug": "topik_medal",
    "folder": "items",
    "nameEn": "a medal",
    "family": "topik-vocabulary"
  },
  {
    "ko": "가뭄",
    "slug": "topik_drought",
    "folder": "items",
    "nameEn": "a drought — of rain, or of anything wanted",
    "family": "topik-vocabulary"
  },
  {
    "ko": "대표팀",
    "slug": "topik_national_team",
    "folder": "items",
    "nameEn": "the national team",
    "family": "topik-vocabulary"
  },
  {
    "ko": "목표",
    "slug": "topik_goal_aimed",
    "folder": "items",
    "nameEn": "a goal aimed at",
    "family": "topik-vocabulary"
  },
  {
    "ko": "열심히",
    "slug": "topik_hard_effort",
    "folder": "items",
    "nameEn": "hard, with effort",
    "family": "topik-vocabulary"
  },
  {
    "ko": "훈련하다",
    "slug": "topik_train",
    "folder": "items",
    "nameEn": "to train",
    "family": "topik-vocabulary"
  },
  {
    "ko": "따다",
    "slug": "topik_take_medal_licence",
    "folder": "items",
    "nameEn": "to take a medal or a licence",
    "family": "topik-vocabulary"
  },
  {
    "ko": "오랜만에",
    "slug": "topik_long_interval",
    "folder": "items",
    "nameEn": "after a long interval",
    "family": "topik-vocabulary"
  },
  {
    "ko": "나오다",
    "slug": "topik_come_appear",
    "folder": "items",
    "nameEn": "to come out, to appear",
    "family": "topik-vocabulary"
  },
  {
    "ko": "신기록",
    "slug": "topik_new_record",
    "folder": "items",
    "nameEn": "a new record",
    "family": "topik-vocabulary"
  },
  {
    "ko": "경기를 펼치다",
    "slug": "topik_put_performance_match",
    "folder": "items",
    "nameEn": "to put on a performance in a match — 경기 in its sporting sense",
    "family": "topik-vocabulary"
  },
  {
    "ko": "아쉽게",
    "slug": "topik_disappointingly_narrow_margin",
    "folder": "items",
    "nameEn": "disappointingly, by a narrow margin",
    "family": "topik-vocabulary"
  },
  {
    "ko": "놓치다",
    "slug": "topik_let_slip",
    "folder": "items",
    "nameEn": "to let something slip",
    "family": "topik-vocabulary"
  },
  {
    "ko": "선 넘다",
    "slug": "topik_cross_line",
    "folder": "items",
    "nameEn": "to cross the line",
    "family": "topik-vocabulary"
  },
  {
    "ko": "악성",
    "slug": "topik_malicious_straight_onto_noun",
    "folder": "items",
    "nameEn": "malicious — straight onto a noun",
    "family": "topik-vocabulary"
  },
  {
    "ko": "악의적",
    "slug": "topik_malicious_needs_noun",
    "folder": "items",
    "nameEn": "malicious — and it needs -인 before a noun",
    "family": "topik-vocabulary"
  },
  {
    "ko": "댓글",
    "slug": "topik_comment_posted_online",
    "folder": "items",
    "nameEn": "a comment posted online",
    "family": "topik-vocabulary"
  },
  {
    "ko": "처벌",
    "slug": "topik_punishment",
    "folder": "items",
    "nameEn": "punishment",
    "family": "topik-vocabulary"
  },
  {
    "ko": "여전히",
    "slug": "topik_still_nothing_has_changed",
    "folder": "items",
    "nameEn": "still — nothing has changed",
    "family": "topik-vocabulary"
  },
  {
    "ko": "솜방망이",
    "slug": "topik_cotton_club",
    "folder": "items",
    "nameEn": "a cotton club — a penalty too light to deter",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-(으)ㄴ 만큼",
    "slug": "topik_extent",
    "folder": "items",
    "nameEn": "to the extent that",
    "family": "topik-vocabulary"
  },
  {
    "ko": "수위",
    "slug": "topik_level_water_severity",
    "folder": "items",
    "nameEn": "the level, of water or of severity",
    "family": "topik-vocabulary"
  },
  {
    "ko": "낮추다",
    "slug": "topik_lower",
    "folder": "items",
    "nameEn": "to lower something",
    "family": "topik-vocabulary"
  },
  {
    "ko": "의견",
    "slug": "topik_opinion_put_forward",
    "folder": "items",
    "nameEn": "an opinion put forward",
    "family": "topik-vocabulary"
  },
  {
    "ko": "제기되다",
    "slug": "topik_raised_argument",
    "folder": "items",
    "nameEn": "to be raised, of an argument",
    "family": "topik-vocabulary"
  },
  {
    "ko": "강화하다",
    "slug": "topik_tighten_strengthen",
    "folder": "items",
    "nameEn": "to tighten or strengthen",
    "family": "topik-vocabulary"
  },
  {
    "ko": "감소하다",
    "slug": "topik_decrease",
    "folder": "items",
    "nameEn": "to decrease — the formal word",
    "family": "topik-vocabulary"
  },
  {
    "ko": "지나치게",
    "slug": "topik_excessively",
    "folder": "items",
    "nameEn": "excessively",
    "family": "topik-vocabulary"
  },
  {
    "ko": "심각해지다",
    "slug": "topik_grow_serious",
    "folder": "items",
    "nameEn": "to grow serious",
    "family": "topik-vocabulary"
  },
  {
    "ko": "아직도",
    "slug": "topik_still_ought_have_finished_now",
    "folder": "items",
    "nameEn": "still — when it ought to have finished by now",
    "family": "topik-vocabulary"
  },
  {
    "ko": "이어지다",
    "slug": "topik_go_another",
    "folder": "items",
    "nameEn": "to go on, one after another",
    "family": "topik-vocabulary"
  },
  {
    "ko": "피해자",
    "slug": "topik_victim",
    "folder": "items",
    "nameEn": "a victim",
    "family": "topik-vocabulary"
  },
  {
    "ko": "무겁다",
    "slug": "topik_heavy",
    "folder": "items",
    "nameEn": "to be heavy — of a penalty as well as a weight",
    "family": "topik-vocabulary"
  },
  {
    "ko": "요구하다",
    "slug": "topik_demand",
    "folder": "items",
    "nameEn": "to demand",
    "family": "topik-vocabulary"
  },
  {
    "ko": "오늘날",
    "slug": "topik_nowadays_our_own_time",
    "folder": "items",
    "nameEn": "nowadays, in our own time",
    "family": "topik-vocabulary"
  },
  {
    "ko": "연재",
    "slug": "topik_serialisation_publishing_instalments",
    "folder": "items",
    "nameEn": "serialisation, publishing in instalments",
    "family": "topik-vocabulary"
  },
  {
    "ko": "만화",
    "slug": "topik_comic",
    "folder": "items",
    "nameEn": "a comic",
    "family": "topik-vocabulary"
  },
  {
    "ko": "만화가",
    "slug": "topik_cartoonist",
    "folder": "items",
    "nameEn": "a cartoonist",
    "family": "topik-vocabulary"
  },
  {
    "ko": "이야기",
    "slug": "topik_story",
    "folder": "items",
    "nameEn": "a story",
    "family": "topik-vocabulary"
  },
  {
    "ko": "N별로",
    "slug": "topik_each_n_n_time",
    "folder": "items",
    "nameEn": "by each N, one N at a time",
    "family": "topik-vocabulary"
  },
  {
    "ko": "작품",
    "slug": "topik_work_art",
    "folder": "items",
    "nameEn": "a work of art",
    "family": "topik-vocabulary"
  },
  {
    "ko": "형식",
    "slug": "topik_form_thing_cast",
    "folder": "items",
    "nameEn": "the form a thing is cast in",
    "family": "topik-vocabulary"
  },
  {
    "ko": "이미",
    "slug": "topik_already_then",
    "folder": "items",
    "nameEn": "already, by then",
    "family": "topik-vocabulary"
  },
  {
    "ko": "세기",
    "slug": "topik_century",
    "folder": "items",
    "nameEn": "a century",
    "family": "topik-vocabulary"
  },
  {
    "ko": "존재하다",
    "slug": "topik_exist",
    "folder": "items",
    "nameEn": "to exist",
    "family": "topik-vocabulary"
  },
  {
    "ko": "영국",
    "slug": "topik_england_britain",
    "folder": "items",
    "nameEn": "England, Britain",
    "family": "topik-vocabulary"
  },
  {
    "ko": "화가",
    "slug": "topik_painter",
    "folder": "items",
    "nameEn": "a painter",
    "family": "topik-vocabulary"
  },
  {
    "ko": "N 못지않게",
    "slug": "topik_no_less_than_n",
    "folder": "items",
    "nameEn": "no less than N",
    "family": "topik-vocabulary"
  },
  {
    "ko": "흥미진진하다",
    "slug": "topik_gripping",
    "folder": "items",
    "nameEn": "to be gripping",
    "family": "topik-vocabulary"
  },
  {
    "ko": "그림",
    "slug": "topik_picture",
    "folder": "items",
    "nameEn": "a picture",
    "family": "topik-vocabulary"
  },
  {
    "ko": "나누다",
    "slug": "topik_divide",
    "folder": "items",
    "nameEn": "to divide something up",
    "family": "topik-vocabulary"
  },
  {
    "ko": "구성하다",
    "slug": "topik_put_together_compose",
    "folder": "items",
    "nameEn": "to put together, to compose",
    "family": "topik-vocabulary"
  },
  {
    "ko": "판화",
    "slug": "topik_print_made_engraving",
    "folder": "items",
    "nameEn": "a print made from an engraving",
    "family": "topik-vocabulary"
  },
  {
    "ko": "새기다",
    "slug": "topik_carve_surface",
    "folder": "items",
    "nameEn": "to carve into a surface",
    "family": "topik-vocabulary"
  },
  {
    "ko": "순서대로",
    "slug": "topik_order_given",
    "folder": "items",
    "nameEn": "in the order given",
    "family": "topik-vocabulary"
  },
  {
    "ko": "인쇄하다",
    "slug": "topik_print",
    "folder": "items",
    "nameEn": "to print",
    "family": "topik-vocabulary"
  },
  {
    "ko": "판매하다",
    "slug": "topik_sell",
    "folder": "items",
    "nameEn": "to sell",
    "family": "topik-vocabulary"
  },
  {
    "ko": "독자",
    "slug": "topik_reader",
    "folder": "items",
    "nameEn": "a reader",
    "family": "topik-vocabulary"
  },
  {
    "ko": "다음",
    "slug": "topik_next",
    "folder": "items",
    "nameEn": "the next one",
    "family": "topik-vocabulary"
  },
  {
    "ko": "손꼽아 기다리다",
    "slug": "topik_count_days_until_comes",
    "folder": "items",
    "nameEn": "to count the days until it comes",
    "family": "topik-vocabulary"
  },
  {
    "ko": "기꺼이",
    "slug": "topik_gladly_without_being_pressed",
    "folder": "items",
    "nameEn": "gladly, without being pressed",
    "family": "topik-vocabulary"
  },
  {
    "ko": "지불하다",
    "slug": "topik_pay_sum",
    "folder": "items",
    "nameEn": "to pay a sum",
    "family": "topik-vocabulary"
  },
  {
    "ko": "주문",
    "slug": "topik_order_placed",
    "folder": "items",
    "nameEn": "an order placed for something",
    "family": "topik-vocabulary"
  },
  {
    "ko": "작가",
    "slug": "topik_author_work",
    "folder": "items",
    "nameEn": "the author of a work",
    "family": "topik-vocabulary"
  },
  {
    "ko": "밝히다",
    "slug": "topik_make_known",
    "folder": "items",
    "nameEn": "to make something known",
    "family": "topik-vocabulary"
  },
  {
    "ko": "일정하다",
    "slug": "topik_regular_fixed_size_spacing",
    "folder": "items",
    "nameEn": "to be regular, at a fixed size or spacing",
    "family": "topik-vocabulary"
  },
  {
    "ko": "기간",
    "slug": "topik_stretch_time",
    "folder": "items",
    "nameEn": "a stretch of time",
    "family": "topik-vocabulary"
  },
  {
    "ko": "두다",
    "slug": "topik_leave_gap_interval",
    "folder": "items",
    "nameEn": "to leave a gap or an interval",
    "family": "topik-vocabulary"
  },
  {
    "ko": "보통",
    "slug": "topik_usually_rule",
    "folder": "items",
    "nameEn": "usually, as a rule",
    "family": "topik-vocabulary"
  },
  {
    "ko": "식후",
    "slug": "topik_meal",
    "folder": "items",
    "nameEn": "after a meal",
    "family": "topik-vocabulary"
  },
  {
    "ko": "닦다",
    "slug": "topik_brush_wipe_clean",
    "folder": "items",
    "nameEn": "to brush or wipe clean",
    "family": "topik-vocabulary"
  },
  {
    "ko": "레몬",
    "slug": "topik_lemon",
    "folder": "items",
    "nameEn": "a lemon",
    "family": "topik-vocabulary"
  },
  {
    "ko": "신맛",
    "slug": "topik_sour_taste",
    "folder": "items",
    "nameEn": "a sour taste",
    "family": "topik-vocabulary"
  },
  {
    "ko": "강하다",
    "slug": "topik_strong_taste_force",
    "folder": "items",
    "nameEn": "to be strong, of a taste or a force",
    "family": "topik-vocabulary"
  },
  {
    "ko": "양치질",
    "slug": "topik_brushing_teeth",
    "folder": "items",
    "nameEn": "brushing the teeth",
    "family": "topik-vocabulary"
  },
  {
    "ko": "양치하다",
    "slug": "topik_brush_teeth",
    "folder": "items",
    "nameEn": "to brush the teeth",
    "family": "topik-vocabulary"
  },
  {
    "ko": "산성",
    "slug": "topik_acidity",
    "folder": "items",
    "nameEn": "acidity",
    "family": "topik-vocabulary"
  },
  {
    "ko": "치아",
    "slug": "topik_tooth",
    "folder": "items",
    "nameEn": "a tooth — the clinical word",
    "family": "topik-vocabulary"
  },
  {
    "ko": "보호막",
    "slug": "topik_protective_layer",
    "folder": "items",
    "nameEn": "a protective layer",
    "family": "topik-vocabulary"
  },
  {
    "ko": "칫솔질",
    "slug": "topik_brushing_toothbrush",
    "folder": "items",
    "nameEn": "brushing with a toothbrush",
    "family": "topik-vocabulary"
  },
  {
    "ko": "자극하다",
    "slug": "topik_irritate",
    "folder": "items",
    "nameEn": "to irritate",
    "family": "topik-vocabulary"
  },
  {
    "ko": "손상되다",
    "slug": "topik_get_damaged",
    "folder": "items",
    "nameEn": "to get damaged",
    "family": "topik-vocabulary"
  },
  {
    "ko": "원래",
    "slug": "topik_originally_first_was",
    "folder": "items",
    "nameEn": "originally, as it first was",
    "family": "topik-vocabulary"
  },
  {
    "ko": "강도",
    "slug": "topik_hardness_how_strong_thing",
    "folder": "items",
    "nameEn": "hardness, how strong a thing is",
    "family": "topik-vocabulary"
  },
  {
    "ko": "돌아오다",
    "slug": "topik_come_back",
    "folder": "items",
    "nameEn": "to come back",
    "family": "topik-vocabulary"
  },
  {
    "ko": "중화되다",
    "slug": "topik_neutralised",
    "folder": "items",
    "nameEn": "to be neutralised",
    "family": "topik-vocabulary"
  },
  {
    "ko": "소요되다",
    "slug": "topik_taken_time",
    "folder": "items",
    "nameEn": "to be taken up, of time — the written word",
    "family": "topik-vocabulary"
  },
  {
    "ko": "섭취하다",
    "slug": "topik_take_food",
    "folder": "items",
    "nameEn": "to take in food — the clinical word for eating",
    "family": "topik-vocabulary"
  },
  {
    "ko": "최소",
    "slug": "topik_very_least",
    "folder": "items",
    "nameEn": "at the very least",
    "family": "topik-vocabulary"
  },
  {
    "ko": "지나다",
    "slug": "topik_go_time",
    "folder": "items",
    "nameEn": "to go by, of time",
    "family": "topik-vocabulary"
  },
  {
    "ko": "누렇다",
    "slug": "topik_dull_yellow",
    "folder": "items",
    "nameEn": "to be a dull yellow",
    "family": "topik-vocabulary"
  },
  {
    "ko": "일시적",
    "slug": "topik_temporary",
    "folder": "items",
    "nameEn": "temporary",
    "family": "topik-vocabulary"
  },
  {
    "ko": "약화시키다",
    "slug": "topik_make_weaken",
    "folder": "items",
    "nameEn": "to make something weaken",
    "family": "topik-vocabulary"
  },
  {
    "ko": "음식물",
    "slug": "topik_foodstuff_matter_food",
    "folder": "items",
    "nameEn": "foodstuff, matter that is food",
    "family": "topik-vocabulary"
  },
  {
    "ko": "누군가",
    "slug": "topik_someone_other",
    "folder": "items",
    "nameEn": "someone or other",
    "family": "topik-vocabulary"
  },
  {
    "ko": "해를 입히다",
    "slug": "topik_injure_someone",
    "folder": "items",
    "nameEn": "to injure someone",
    "family": "topik-vocabulary"
  },
  {
    "ko": "-(으)ㄴ 척하다",
    "slug": "topik_pretend",
    "folder": "items",
    "nameEn": "to pretend to be",
    "family": "topik-vocabulary"
  },
  {
    "ko": "거짓으로",
    "slug": "topik_falsely_not_meaning",
    "folder": "items",
    "nameEn": "falsely, not meaning it",
    "family": "topik-vocabulary"
  },
  {
    "ko": "흘리다",
    "slug": "topik_shed_let_run",
    "folder": "items",
    "nameEn": "to shed, to let run",
    "family": "topik-vocabulary"
  },
  {
    "ko": "눈물",
    "slug": "topik_tear",
    "folder": "items",
    "nameEn": "a tear",
    "family": "topik-vocabulary"
  },
  {
    "ko": "눈물샘",
    "slug": "topik_tear_gland",
    "folder": "items",
    "nameEn": "the tear gland",
    "family": "topik-vocabulary"
  },
  {
    "ko": "악어",
    "slug": "topik_crocodile",
    "folder": "items",
    "nameEn": "a crocodile",
    "family": "topik-vocabulary"
  },
  {
    "ko": "비유하다",
    "slug": "topik_liken_thing_another",
    "folder": "items",
    "nameEn": "to liken one thing to another",
    "family": "topik-vocabulary"
  },
  {
    "ko": "실제로",
    "slug": "topik_actual_fact",
    "folder": "items",
    "nameEn": "in actual fact",
    "family": "topik-vocabulary"
  },
  {
    "ko": "잡아먹다",
    "slug": "topik_catch_eat",
    "folder": "items",
    "nameEn": "to catch and eat",
    "family": "topik-vocabulary"
  },
  {
    "ko": "신경",
    "slug": "topik_nerve",
    "folder": "items",
    "nameEn": "a nerve",
    "family": "topik-vocabulary"
  },
  {
    "ko": "연결되다",
    "slug": "topik_wired_together",
    "folder": "items",
    "nameEn": "to be wired together",
    "family": "topik-vocabulary"
  },
  {
    "ko": "씹다",
    "slug": "topik_chew",
    "folder": "items",
    "nameEn": "to chew",
    "family": "topik-vocabulary"
  },
  {
    "ko": "마치",
    "slug": "topik_if",
    "folder": "items",
    "nameEn": "as if — and it wants -는 것처럼 to close it",
    "family": "topik-vocabulary"
  },
  {
    "ko": "표현",
    "slug": "topik_turn_phrase",
    "folder": "items",
    "nameEn": "a turn of phrase",
    "family": "topik-vocabulary"
  },
  {
    "ko": "인간",
    "slug": "topik_human_being",
    "folder": "items",
    "nameEn": "a human being",
    "family": "topik-vocabulary"
  },
  {
    "ko": "가식적",
    "slug": "topik_put_insincere",
    "folder": "items",
    "nameEn": "put on, insincere",
    "family": "topik-vocabulary"
  },
  {
    "ko": "행위",
    "slug": "topik_act_piece_behaviour",
    "folder": "items",
    "nameEn": "an act, a piece of behaviour",
    "family": "topik-vocabulary"
  },
  {
    "ko": "생리적",
    "slug": "topik_physiological",
    "folder": "items",
    "nameEn": "physiological",
    "family": "topik-vocabulary"
  },
  {
    "ko": "현상",
    "slug": "topik_phenomenon",
    "folder": "items",
    "nameEn": "a phenomenon",
    "family": "topik-vocabulary"
  },
  {
    "ko": "두려움",
    "slug": "topik_fear",
    "folder": "items",
    "nameEn": "fear",
    "family": "topik-vocabulary"
  },
  {
    "ko": "떨다",
    "slug": "topik_tremble",
    "folder": "items",
    "nameEn": "to tremble",
    "family": "topik-vocabulary"
  },
  {
    "ko": "죄책감",
    "slug": "topik_guilt_what_has_done",
    "folder": "items",
    "nameEn": "guilt at what one has done",
    "family": "topik-vocabulary"
  },
  {
    "ko": "갈증",
    "slug": "topik_thirst",
    "folder": "items",
    "nameEn": "thirst",
    "family": "topik-vocabulary"
  },
  {
    "ko": "해소하다",
    "slug": "topik_relieve_clear_away",
    "folder": "items",
    "nameEn": "to relieve, to clear away",
    "family": "topik-vocabulary"
  },
  {
    "ko": "배부름",
    "slug": "topik_state_being_full",
    "folder": "items",
    "nameEn": "the state of being full",
    "family": "topik-vocabulary"
  },
  {
    "ko": "만족하다",
    "slug": "topik_satisfied",
    "folder": "items",
    "nameEn": "to be satisfied",
    "family": "topik-vocabulary"
  },
  {
    "ko": "음료수",
    "slug": "topik_soft_drink",
    "folder": "items",
    "nameEn": "a soft drink",
    "family": "topik-vocabulary"
  },
  {
    "ko": "액체",
    "slug": "topik_liquid",
    "folder": "items",
    "nameEn": "a liquid",
    "family": "topik-vocabulary"
  },
  {
    "ko": "담다",
    "slug": "topik_hold_inside",
    "folder": "items",
    "nameEn": "to hold something inside it",
    "family": "topik-vocabulary"
  },
  {
    "ko": "용기",
    "slug": "topik_container",
    "folder": "items",
    "nameEn": "a container",
    "family": "topik-vocabulary"
  },
  {
    "ko": "원기둥",
    "slug": "topik_cylinder",
    "folder": "items",
    "nameEn": "a cylinder",
    "family": "topik-vocabulary"
  },
  {
    "ko": "이유",
    "slug": "topik_reason",
    "folder": "items",
    "nameEn": "a reason",
    "family": "topik-vocabulary"
  },
  {
    "ko": "예를 들다",
    "slug": "topik_give_example",
    "folder": "items",
    "nameEn": "to give an example",
    "family": "topik-vocabulary"
  },
  {
    "ko": "밑면",
    "slug": "topik_base_face_shape",
    "folder": "items",
    "nameEn": "the base face of a shape",
    "family": "topik-vocabulary"
  },
  {
    "ko": "정사각형",
    "slug": "topik_square",
    "folder": "items",
    "nameEn": "a square",
    "family": "topik-vocabulary"
  },
  {
    "ko": "정삼각형",
    "slug": "topik_equilateral_triangle",
    "folder": "items",
    "nameEn": "an equilateral triangle",
    "family": "topik-vocabulary"
  },
  {
    "ko": "비교하다",
    "slug": "topik_compare",
    "folder": "items",
    "nameEn": "to compare",
    "family": "topik-vocabulary"
  },
  {
    "ko": "넓이",
    "slug": "topik_area",
    "folder": "items",
    "nameEn": "area",
    "family": "topik-vocabulary"
  },
  {
    "ko": "똑같이",
    "slug": "topik_identically",
    "folder": "items",
    "nameEn": "identically",
    "family": "topik-vocabulary"
  },
  {
    "ko": "둘레",
    "slug": "topik_distance_round_outside",
    "folder": "items",
    "nameEn": "the distance round the outside",
    "family": "topik-vocabulary"
  },
  {
    "ko": "각각",
    "slug": "topik_each_respectively",
    "folder": "items",
    "nameEn": "each one respectively",
    "family": "topik-vocabulary"
  },
  {
    "ko": "재료",
    "slug": "topik_material_thing_made",
    "folder": "items",
    "nameEn": "material a thing is made from",
    "family": "topik-vocabulary"
  },
  {
    "ko": "적게",
    "slug": "topik_little_small_amount",
    "folder": "items",
    "nameEn": "little, in small amount",
    "family": "topik-vocabulary"
  },
  {
    "ko": "들다",
    "slug": "topik_spent",
    "folder": "items",
    "nameEn": "to be spent — of material, money or time",
    "family": "topik-vocabulary"
  },
  {
    "ko": "생산비",
    "slug": "topik_cost_producing",
    "folder": "items",
    "nameEn": "the cost of producing something",
    "family": "topik-vocabulary"
  },
  {
    "ko": "편리하다",
    "slug": "topik_convenient",
    "folder": "items",
    "nameEn": "to be convenient",
    "family": "topik-vocabulary"
  },
  {
    "ko": "제작",
    "slug": "topik_manufacture_making_thing",
    "folder": "items",
    "nameEn": "manufacture, the making of a thing",
    "family": "topik-vocabulary"
  }
];
if (typeof VOCAB_ART_ROWS !== 'undefined' && Array.isArray(VOCAB_ART_ROWS)) {
  TOPIK_VOCAB_ART_ROWS.forEach(function (row) {
    const existing = VOCAB_ART_ROWS.find(function (item) { return item && item.ko === row.ko; });
    if (existing) Object.assign(existing, row);
    else VOCAB_ART_ROWS.push(row);
  });
}
if (typeof window !== 'undefined') window.TOPIK_VOCAB_ART_ROWS = TOPIK_VOCAB_ART_ROWS;
// END REVIEWED TOPIK ART
