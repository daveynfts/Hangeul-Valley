// Unit 10 vocab still-icons + cooking ingredient art.
// Catalog rows (sprites/catalog.json) are the library record; this table is the runtime lookup.
const VOCAB_ART_FOLDERS = ['foods', 'items'];
const VOCAB_ART_ROWS = [
  { ko: '김치찌개', slug: 'kimchi_stew', folder: 'foods', nameEn: 'Kimchi stew', family: 'stew', cooking: true },
  { ko: '된장찌개', slug: 'soybean_paste_stew', folder: 'foods', nameEn: 'Soybean-paste stew', family: 'stew', cooking: true },
  { ko: '순두부찌개', slug: 'soft_tofu_stew', folder: 'foods', nameEn: 'Soft-tofu stew', family: 'stew', cooking: true },
  { ko: '감자탕', slug: 'pork_bone_potato_stew', folder: 'foods', nameEn: 'Pork-bone potato stew', family: 'stew', cooking: true },
  { ko: '매운탕', slug: 'spicy_fish_stew', folder: 'foods', nameEn: 'Spicy fish stew', family: 'stew', cooking: true },
  { ko: '설렁탕', slug: 'ox_bone_soup', folder: 'foods', nameEn: 'Ox-bone soup', family: 'stew', cooking: false },
  { ko: '냉면', slug: 'cold_noodles', folder: 'foods', nameEn: 'Cold noodles', family: 'noodle', cooking: true },
  { ko: '칼국수', slug: 'knife_cut_noodles', folder: 'foods', nameEn: 'Knife-cut noodles', family: 'noodle', cooking: true },
  { ko: '비빔국수', slug: 'spicy_mixed_noodles', folder: 'foods', nameEn: 'Spicy mixed noodles', family: 'noodle', cooking: true },
  { ko: '삼겹살', slug: 'grilled_pork_belly', folder: 'foods', nameEn: 'Grilled pork belly', family: 'meat', cooking: true },
  { ko: '떡갈비', slug: 'grilled_minced_ribs', folder: 'foods', nameEn: 'Grilled minced ribs', family: 'meat', cooking: false },
  { ko: '갈비찜', slug: 'braised_short_ribs', folder: 'foods', nameEn: 'Braised short ribs', family: 'meat', cooking: true },
  { ko: '삼계탕', slug: 'ginseng_chicken_soup', folder: 'foods', nameEn: 'Ginseng chicken soup', family: 'stew', cooking: true },
  { ko: '닭고기', slug: 'chicken_meat', folder: 'foods', nameEn: 'Chicken meat', family: 'meat', cooking: false },
  { ko: '갈비', slug: 'ribs', folder: 'foods', nameEn: 'Ribs', family: 'meat', cooking: false },
  { ko: '달다', slug: 'sweet_taste', folder: 'items', nameEn: 'Sweetness', family: 'taste', cooking: false },
  { ko: '짜다', slug: 'salty_taste', folder: 'items', nameEn: 'Saltiness', family: 'taste', cooking: false },
  { ko: '쓰다', slug: 'bitter_taste', folder: 'items', nameEn: 'Bitterness', family: 'taste', cooking: false },
  { ko: '시다', slug: 'sour_taste', folder: 'items', nameEn: 'Sourness', family: 'taste', cooking: false },
  { ko: '맵다', slug: 'spicy_taste', folder: 'items', nameEn: 'Spiciness', family: 'taste', cooking: false },
  { ko: '맛', slug: 'flavor', folder: 'items', nameEn: 'Taste / flavor', family: 'taste', cooking: false },
  { ko: '값', slug: 'price_coins', folder: 'items', nameEn: 'Price', family: 'review', cooking: false },
  { ko: '교통', slug: 'subway_access', folder: 'items', nameEn: 'Transport / access', family: 'place', cooking: false },
  { ko: '서비스', slug: 'service_bell', folder: 'items', nameEn: 'Service', family: 'review', cooking: false },
  { ko: '분위기', slug: 'candlelit_table', folder: 'items', nameEn: 'Atmosphere', family: 'review', cooking: false },
  { ko: '맛집', slug: 'popular_restaurant', folder: 'items', nameEn: 'Popular restaurant', family: 'place', cooking: false },
  { ko: '한정식', slug: 'korean_set_meal', folder: 'foods', nameEn: 'Korean set meal', family: 'rice', cooking: false },
  { ko: '인사동', slug: 'insadong_lantern', folder: 'items', nameEn: 'Insadong', family: 'place', cooking: false },
  { ko: '지하철역', slug: 'subway_station', folder: 'items', nameEn: 'Subway station', family: 'place', cooking: false },
  { ko: '전통적인', slug: 'traditional_hanok', folder: 'items', nameEn: 'Traditional', family: 'place', cooking: false },
  { ko: '직원', slug: 'restaurant_staff', folder: 'items', nameEn: 'Staff', family: 'people', cooking: false },
  { ko: '상', slug: 'dining_table', folder: 'items', nameEn: 'Dining table', family: 'place', cooking: false },
  { ko: '고기', slug: 'meat', folder: 'foods', nameEn: 'Meat', family: 'meat', cooking: false },
  { ko: '생선', slug: 'whole_fish', folder: 'foods', nameEn: 'Fish', family: 'meat', cooking: false },
  { ko: '야채', slug: 'vegetable_pile', folder: 'items', nameEn: 'Vegetables', family: 'ingredient', cooking: false },
  { ko: '종류', slug: 'kinds_types', folder: 'items', nameEn: 'Kind / type', family: 'abstract', cooking: false },
  { ko: '다양하다', slug: 'diversity_spread', folder: 'items', nameEn: 'To be diverse', family: 'abstract', cooking: false },
  { ko: '처음', slug: 'first_time', folder: 'items', nameEn: 'The first time', family: 'abstract', cooking: false },
  { ko: '놀라다', slug: 'surprise_burst', folder: 'items', nameEn: 'To be surprised', family: 'people', cooking: false },
  { ko: '친절하다', slug: 'kindness', folder: 'items', nameEn: 'To be kind', family: 'people', cooking: false },
  { ko: '추천하다', slug: 'recommend', folder: 'items', nameEn: 'To recommend', family: 'abstract', cooking: false },
  { ko: '피자나라', slug: 'pizza_nara_shop', folder: 'items', nameEn: 'Pizza Nara shop', family: 'place', cooking: false },
  { ko: '불고기피자', slug: 'bulgogi_pizza', folder: 'foods', nameEn: 'Bulgogi pizza', family: 'pizza', cooking: false },
  { ko: '야채피자', slug: 'vegetable_pizza', folder: 'foods', nameEn: 'Vegetable pizza', family: 'pizza', cooking: false },
  { ko: '고구마피자', slug: 'sweet_potato_pizza', folder: 'foods', nameEn: 'Sweet-potato pizza', family: 'pizza', cooking: false },
  { ko: '치즈피자', slug: 'cheese_pizza', folder: 'foods', nameEn: 'Cheese pizza', family: 'pizza', cooking: false },
  { ko: '페퍼로니피자', slug: 'pepperoni_pizza', folder: 'foods', nameEn: 'Pepperoni pizza', family: 'pizza', cooking: false },
  { ko: '콜라', slug: 'cola', folder: 'foods', nameEn: 'Cola', family: 'drink', cooking: false },
  { ko: '사이다', slug: 'lemon_lime_soda', folder: 'foods', nameEn: 'Lemon-lime soda', family: 'drink', cooking: false },
  { ko: '프라이드치킨', slug: 'fried_chicken', folder: 'foods', nameEn: 'Fried chicken', family: 'chicken', cooking: false },
  { ko: '양념치킨', slug: 'seasoned_fried_chicken', folder: 'foods', nameEn: 'Seasoned fried chicken', family: 'chicken', cooking: false },
  { ko: '비빔밥', slug: 'bibimbap', folder: 'foods', nameEn: 'Bibimbap', family: 'rice', cooking: true },
  { ko: '김치볶음밥', slug: 'kimchi_fried_rice', folder: 'foods', nameEn: 'Kimchi fried rice', family: 'rice', cooking: false },
  { ko: '물냉면', slug: 'cold_noodles_broth', folder: 'foods', nameEn: 'Cold noodles in broth', family: 'noodle', cooking: false },
  { ko: '해물볶음밥', slug: 'seafood_fried_rice', folder: 'foods', nameEn: 'Seafood fried rice', family: 'rice', cooking: false },
  { ko: '판', slug: 'pizza_pan', folder: 'foods', nameEn: 'Pizza pan (한 판)', family: 'pizza', cooking: false },
  { ko: '인분', slug: 'servings', folder: 'items', nameEn: 'Servings', family: 'abstract', cooking: false },
  { ko: '갖다 주다', slug: 'delivery_bag', folder: 'items', nameEn: 'To bring / deliver', family: 'abstract', cooking: false },
  { ko: '배달되다', slug: 'delivery_scooter', folder: 'items', nameEn: 'To be delivered', family: 'abstract', cooking: false },
  { ko: '동갑', slug: 'same_age', folder: 'items', nameEn: 'Same age', family: 'people', cooking: false },
  { ko: '선배', slug: 'senior', folder: 'items', nameEn: 'Senior', family: 'people', cooking: false },
  { ko: '후배', slug: 'junior', folder: 'items', nameEn: 'Junior', family: 'people', cooking: false },
  { ko: '오랜만에', slug: 'after_a_long_time', folder: 'items', nameEn: 'After a long time', family: 'abstract', cooking: false },
  { ko: '말을 놓다', slug: 'drop_honorifics', folder: 'items', nameEn: 'To drop honorifics', family: 'abstract', cooking: false },
  { ko: '반말', slug: 'casual_speech', folder: 'items', nameEn: 'Casual speech', family: 'abstract', cooking: false },
  { ko: '입에 맞다', slug: 'suit_ones_taste', folder: 'items', nameEn: "To suit one's taste", family: 'taste', cooking: false },
  { ko: '돈이 아깝다', slug: 'wasted_money', folder: 'items', nameEn: 'To feel money was wasted', family: 'abstract', cooking: false },
  { ko: '시키다', slug: 'order_food', folder: 'items', nameEn: 'To order food', family: 'abstract', cooking: false },
  { ko: '주문하다', slug: 'place_order', folder: 'items', nameEn: 'To place an order', family: 'abstract', cooking: false },
  { ko: '예약하다', slug: 'reservation', folder: 'items', nameEn: 'To reserve', family: 'abstract', cooking: false },
  { ko: '미리', slug: 'in_advance', folder: 'items', nameEn: 'In advance', family: 'abstract', cooking: false },
  { ko: '유명하다', slug: 'famous', folder: 'items', nameEn: 'To be famous', family: 'abstract', cooking: false },
  { ko: '항상', slug: 'always', folder: 'items', nameEn: 'Always', family: 'abstract', cooking: false },
  { ko: '사거리', slug: 'crossroads', folder: 'items', nameEn: 'Intersection', family: 'place', cooking: false },
  { ko: '이 근처', slug: 'around_here', folder: 'items', nameEn: 'Around here', family: 'place', cooking: false },
  { ko: '생일', slug: 'birthday_cake', folder: 'items', nameEn: 'Birthday', family: 'people', cooking: false },
  { ko: '주말', slug: 'weekend', folder: 'items', nameEn: 'Weekend', family: 'abstract', cooking: false },
  { ko: '바쁘다', slug: 'busy', folder: 'items', nameEn: 'To be busy', family: 'people', cooking: false },
  { ko: '벌써', slug: 'already', folder: 'items', nameEn: 'Already', family: 'abstract', cooking: false },
  { ko: '글쎄', slug: 'let_me_see', folder: 'items', nameEn: 'Well / let me see', family: 'abstract', cooking: false },
  { ko: '배추', slug: 'napa_cabbage_head', folder: 'items', nameEn: 'Napa cabbage', family: 'ingredient', cooking: true },
  { ko: '무', slug: 'korean_radish', folder: 'items', nameEn: 'Korean radish', family: 'ingredient', cooking: true },
  { ko: '파', slug: 'green_onion', folder: 'items', nameEn: 'Green onion', family: 'ingredient', cooking: true },
  { ko: '고추', slug: 'chili_pepper', folder: 'items', nameEn: 'Chili pepper', family: 'ingredient', cooking: true },
  { ko: '마늘', slug: 'garlic', folder: 'items', nameEn: 'Garlic', family: 'ingredient', cooking: true },
  { ko: '감자', slug: 'potato', folder: 'items', nameEn: 'Potato', family: 'ingredient', cooking: true },
  { ko: '콩', slug: 'soybeans', folder: 'items', nameEn: 'Soybeans', family: 'ingredient', cooking: true },
  { ko: '쌀', slug: 'rice_grain', folder: 'items', nameEn: 'Rice', family: 'ingredient', cooking: true },
  { ko: '당근', slug: 'carrot', folder: 'items', nameEn: 'Carrot', family: 'ingredient', cooking: true },
  { ko: '오이', slug: 'cucumber', folder: 'items', nameEn: 'Cucumber', family: 'ingredient', cooking: true },
  { ko: '양파', slug: 'onion', folder: 'items', nameEn: 'Onion', family: 'ingredient', cooking: true },
  { ko: '콩나물', slug: 'bean_sprouts', folder: 'items', nameEn: 'Bean sprouts', family: 'ingredient', cooking: true },
  { ko: '상추', slug: 'lettuce', folder: 'items', nameEn: 'Lettuce', family: 'ingredient', cooking: true },
  { ko: '생강', slug: 'ginger', folder: 'items', nameEn: 'Ginger', family: 'ingredient', cooking: true },
  { ko: '김치', slug: 'kimchi_jar', folder: 'foods', nameEn: 'Kimchi', family: 'stew', cooking: false },
  { ko: '불고기', slug: 'bulgogi_plate', folder: 'foods', nameEn: 'Bulgogi', family: 'meat', cooking: false },
  { ko: '떡볶이', slug: 'tteokbokki_bowl', folder: 'foods', nameEn: 'Tteokbokki', family: 'rice', cooking: false },
  { ko: '해물파전', slug: 'haemul_pajeon', folder: 'foods', nameEn: 'Seafood pajeon', family: 'meat', cooking: false },
  { ko: '잡채', slug: 'japchae_bowl', folder: 'foods', nameEn: 'Japchae', family: 'noodle', cooking: false },
  { ko: '김밥', slug: 'gimbap_roll', folder: 'foods', nameEn: 'Gimbap', family: 'rice', cooking: false },
  { ko: '옥수수', slug: 'corn_cob', folder: 'items', nameEn: 'Corn', family: 'ingredient', cooking: true },
  { ko: '옥수수구이', slug: 'roasted_corn', folder: 'foods', nameEn: 'Roasted corn', family: 'rice', cooking: false },
  { ko: '딸기', slug: 'garden_strawberry', folder: 'items', nameEn: 'Strawberry', family: 'ingredient', cooking: false },
  { ko: '사과', slug: 'farm_apple', folder: 'items', nameEn: 'Apple', family: 'ingredient', cooking: false },
  { ko: '꿀', slug: 'honey_jar', folder: 'items', nameEn: 'Honey', family: 'ingredient', cooking: true },
  { ko: '무밥', slug: 'radish_rice', folder: 'foods', nameEn: 'Radish rice', family: 'rice', cooking: false },
  { ko: '딸기잼', slug: 'strawberry_jam', folder: 'foods', nameEn: 'Strawberry jam', family: 'stew', cooking: false },
  { ko: '감자전', slug: 'potato_pancake', folder: 'foods', nameEn: 'Potato pancake', family: 'meat', cooking: false },
  { ko: '궁중 삼계탕', slug: 'royal_samgyetang', folder: 'foods', nameEn: 'Royal ginseng chicken soup', family: 'stew', cooking: false },
  { ko: '꿀약과', slug: 'honey_yakgwa', folder: 'foods', nameEn: 'Honey yakgwa', family: 'rice', cooking: false },
  { ko: '꿀차', slug: 'honey_tea', folder: 'foods', nameEn: 'Honey tea', family: 'drink', cooking: false },
  { ko: '연어', slug: 'river_salmon', folder: 'foods', nameEn: 'Salmon', family: 'meat', cooking: false },
  { ko: '고등어', slug: 'mackerel', folder: 'foods', nameEn: 'Mackerel', family: 'meat', cooking: false },
  { ko: '잉어', slug: 'pond_carp', folder: 'foods', nameEn: 'Carp', family: 'meat', cooking: false },
  { ko: '황금물고기', slug: 'golden_fish', folder: 'foods', nameEn: 'Golden fish', family: 'meat', cooking: false },
  { ko: '새우', slug: 'cooked_shrimp', folder: 'foods', nameEn: 'Shrimp', family: 'meat', cooking: false },
  { ko: '오징어', slug: 'squid', folder: 'foods', nameEn: 'Squid', family: 'meat', cooking: false },
  { ko: '문어', slug: 'octopus', folder: 'foods', nameEn: 'Octopus', family: 'meat', cooking: false },
  { ko: '조개', slug: 'clam', folder: 'foods', nameEn: 'Clam', family: 'meat', cooking: false }
];

function vocabArtRow(ko) {
  return VOCAB_ART_ROWS.find(function (r) { return r && r.ko === ko; }) || null;
}
function vocabArtFile(ko) {
  const row = vocabArtRow(ko);
  return row ? (row.folder + '/' + row.slug + '.png') : '';
}
function vocabArtKey(ko) {
  const row = vocabArtRow(ko);
  return row ? (row.slug + '_hd') : '';
}
function vocabIconHtml(ko, fallbackEmoji, px) {
  const file = vocabArtFile(ko);
  const size = px || 32;
  if (file && typeof artUrl === 'function') {
    return '<img class="vocab-art-icon" src="' + artUrl(file) + '" width="' + size + '" height="' + size +
      '" alt="" style="image-rendering:pixelated;image-rendering:crisp-edges;vertical-align:middle;object-fit:contain">';
  }
  return fallbackEmoji || '';
}
function vocabArtLoadEntries() {
  return VOCAB_ART_ROWS.filter(function (r) { return r && r.cooking; }).map(function (r) {
    return { key: r.slug + '_hd', file: r.folder + '/' + r.slug + '.png' };
  });
}
if (typeof window !== 'undefined') {
  window.VOCAB_ART_ROWS = VOCAB_ART_ROWS;
  window.vocabIconHtml = vocabIconHtml;
  window.vocabArtFile = vocabArtFile;
  window.vocabArtKey = vocabArtKey;
  window.vocabArtLoadEntries = vocabArtLoadEntries;
}
