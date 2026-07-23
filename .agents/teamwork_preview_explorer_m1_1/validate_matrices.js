/**
 * Matrix Validation Script for Explorer 1 (Character Sprites Specialist)
 */

const STARDEW_PALETTE_ADDITIONS = {
  // Outline Contour
  outlineDark: 0x121016,     // Universal deep dark outline (K)
  outlineSoft: 0x251C2B,     // Soft inner contour shadow (k)

  // Farmer Skin Tones (4-Tone System)
  skinHighlight: 0xFAD8B0,   // Sunlit skin highlight (X)
  skinBase: 0xEAA878,        // Warm peach skin midtone (x)
  skinShadow: 0xC87858,      // Rosy shade / cheek blush (i)
  skinDeepShadow: 0x984838,  // Chin/neck shadow contour (I)

  // Farmer Hair Tones (3-Tone System)
  hairHighlight: 0x925A32,   // Warm auburn hair highlight (f)
  hairBase: 0x6A3E1E,        // Chestnut brown hair base (H)
  hairShadow: 0x42240E,      // Deep chestnut hair shadow (h)

  // Farmer Straw Hat (4-Tone System)
  strawHatHighlight: 0xF8D88E,// Bright straw crown highlight (t)
  strawHatBase: 0xE4B663,     // Warm unbleached straw base (T)
  strawHatShadow: 0xB88A3D,   // Woven straw shadow / underside (V)
  strawHatDeepShadow: 0x805A20,// Straw brim deep fold shadow (v)
  hatRibbonRed: 0xC0382B,     // Rustic terracotta red ribbon (R)
  hatRibbonShadow: 0x781D14,  // Ribbon fold shadow (r)
  hatRibbonLight: 0xE74C3C,   // Ribbon highlight (p)

  // Farmer Shirt Under Overalls (3-Tone System)
  shirtLight: 0xF0EAE1,       // Cream linen shirt highlight (w)
  shirtBase: 0xD0D5DD,        // Cream linen shirt midtone (F)
  shirtShadow: 0x98A2B3,      // Linen sleeve shadow (g)

  // Farmer Denim Overalls (4-Tone System)
  overallsHighlight: 0x5B6E9E,// Sunlit denim knee/bib highlight (z)
  overallsBase: 0x3B4D7A,     // Classic indigo denim base (Z)
  overallsShadow: 0x263354,   // Denim shadow fold (q)
  overallsDeepShadow: 0x161F38,// Deep denim shadow / pocket seam (Q)
  brassButton: 0xE8C840,      // Overall brass buckle / button (b)

  // Leather Boots & Belt (3-Tone System)
  bootsHighlight: 0x7E4F2B,   // Polished boot highlight (L)
  bootsBase: 0x59381E,        // Sturdy brown leather (S)
  bootsShadow: 0x382210,      // Boot sole & shadow (s)

  // Ginger Cat Fur & Features (5-Tone System)
  catFurHighlight: 0xFA9E50,  // Bright ginger orange fluff (o)
  catFurBase: 0xEE7B28,       // Golden ginger fur base (O)
  catFurShadow: 0xB84E10,     // Deep ginger stripe / shade (s)
  catFurDeepShadow: 0x782D00, // Underbelly shadow (S)
  catWhiteFluff: 0xFFFFFF,    // Pure white chest/paw highlight (W)
  catWhiteShadow: 0xE2E8F0,   // Soft gray white chest shadow (w)
  catNosePink: 0xFFB3C1,      // Soft pink nose & inner ear (p)
  catEarInnerShadow: 0xE67E90,// Pink inner ear shadow (P)
  catEyeGreen: 0x55C655,      // Vibrant emerald cat eye (e)
  catEyeHighlight: 0xA3F0A3,  // Emerald eye shine (E)
  catEyePupil: 0x103B10,      // Dark green pupil (u)

  // Wizard Merlin Robes & Features (5-Tone System)
  wizRobeHighlight: 0xA78BFA, // Arcane lavender robe highlight (h)
  wizRobeBase: 0x8B5CF6,      // Deep royal violet robe (H)
  wizRobeShadow: 0x6D28D9,    // Dark violet robe fold (v)
  wizRobeDeepShadow: 0x4C1D95,// Deep violet underside shadow (V)
  wizBeardHighlight: 0xFFFFFF,// Pristine white beard highlight (d)
  wizBeardShadow: 0xE2E8F0,   // Soft silver beard midtone (D)
  wizBeardDeepShadow: 0x94A3B8,// Slate gray beard shadow (b)
  wizGoldAccent: 0xFBBF24,    // Radiant gold buckle/trim (y)
  wizGoldShadow: 0xD97706,    // Tarnished gold shadow (Y)
  wizCrystalHighlight: 0x7DD3FC,// Arcane cyan orb highlight (c)
  wizCrystalBase: 0x38BDF8,   // Arcane cyan orb base (C)
  wizCrystalShadow: 0x0284C7, // Arcane cyan orb core (e)
  wizStaffWood: 0x78350F,     // Gnarled oak staff (S)
  wizStaffShadow: 0x451A03,   // Oak staff shadow (s)
};

// Character Palettes
const P_FARMER = {
  '.': null,
  'K': STARDEW_PALETTE_ADDITIONS.outlineDark,
  'k': STARDEW_PALETTE_ADDITIONS.outlineSoft,
  'X': STARDEW_PALETTE_ADDITIONS.skinHighlight,
  'x': STARDEW_PALETTE_ADDITIONS.skinBase,
  'i': STARDEW_PALETTE_ADDITIONS.skinShadow,
  'I': STARDEW_PALETTE_ADDITIONS.skinDeepShadow,
  'N': 0x1C120C,
  'W': 0xFFFFFF,
  'f': STARDEW_PALETTE_ADDITIONS.hairHighlight,
  'H': STARDEW_PALETTE_ADDITIONS.hairBase,
  'h': STARDEW_PALETTE_ADDITIONS.hairShadow,
  't': STARDEW_PALETTE_ADDITIONS.strawHatHighlight,
  'T': STARDEW_PALETTE_ADDITIONS.strawHatBase,
  'V': STARDEW_PALETTE_ADDITIONS.strawHatShadow,
  'v': STARDEW_PALETTE_ADDITIONS.strawHatDeepShadow,
  'R': STARDEW_PALETTE_ADDITIONS.hatRibbonRed,
  'r': STARDEW_PALETTE_ADDITIONS.hatRibbonShadow,
  'p': STARDEW_PALETTE_ADDITIONS.hatRibbonLight,
  'w': STARDEW_PALETTE_ADDITIONS.shirtLight,
  'F': STARDEW_PALETTE_ADDITIONS.shirtBase,
  'g': STARDEW_PALETTE_ADDITIONS.shirtShadow,
  'z': STARDEW_PALETTE_ADDITIONS.overallsHighlight,
  'Z': STARDEW_PALETTE_ADDITIONS.overallsBase,
  'q': STARDEW_PALETTE_ADDITIONS.overallsShadow,
  'Q': STARDEW_PALETTE_ADDITIONS.overallsDeepShadow,
  'b': STARDEW_PALETTE_ADDITIONS.brassButton,
  'L': STARDEW_PALETTE_ADDITIONS.bootsHighlight,
  'S': STARDEW_PALETTE_ADDITIONS.bootsBase,
  's': STARDEW_PALETTE_ADDITIONS.bootsShadow,
  'M': 0x94A3B8,
  'm': 0x64748B,
  'n': 0xCBD5E1,
  'd': 0x334155,
  'U': 0x38BDF8,
  'u': 0x0284C7,
  'Y': 0x8F5428,
  'y': 0xB3713D,
  'j': 0x573012,
  'A': 0xD85858,
  'a': 0xE8B84B,
  'G': 0x4A7C59,
  'D': 0x4E311B
};

const P_CAT = {
  '.': null,
  'K': STARDEW_PALETTE_ADDITIONS.outlineDark,
  'O': STARDEW_PALETTE_ADDITIONS.catFurBase,
  'o': STARDEW_PALETTE_ADDITIONS.catFurHighlight,
  's': STARDEW_PALETTE_ADDITIONS.catFurShadow,
  'S': STARDEW_PALETTE_ADDITIONS.catFurDeepShadow,
  'W': STARDEW_PALETTE_ADDITIONS.catWhiteFluff,
  'w': STARDEW_PALETTE_ADDITIONS.catWhiteShadow,
  'p': STARDEW_PALETTE_ADDITIONS.catNosePink,
  'P': STARDEW_PALETTE_ADDITIONS.catEarInnerShadow,
  'e': STARDEW_PALETTE_ADDITIONS.catEyeGreen,
  'E': STARDEW_PALETTE_ADDITIONS.catEyeHighlight,
  'u': STARDEW_PALETTE_ADDITIONS.catEyePupil,
  'k': STARDEW_PALETTE_ADDITIONS.outlineSoft
};

const P_WIZARD = {
  '.': null,
  'K': STARDEW_PALETTE_ADDITIONS.outlineDark,
  'H': STARDEW_PALETTE_ADDITIONS.wizRobeBase,
  'h': STARDEW_PALETTE_ADDITIONS.wizRobeHighlight,
  'v': STARDEW_PALETTE_ADDITIONS.wizRobeShadow,
  'V': STARDEW_PALETTE_ADDITIONS.wizRobeDeepShadow,
  'y': STARDEW_PALETTE_ADDITIONS.wizGoldAccent,
  'Y': STARDEW_PALETTE_ADDITIONS.wizGoldShadow,
  'd': STARDEW_PALETTE_ADDITIONS.wizBeardHighlight,
  'D': STARDEW_PALETTE_ADDITIONS.wizBeardShadow,
  'b': STARDEW_PALETTE_ADDITIONS.wizBeardDeepShadow,
  'X': 0xFFE4C4,
  'x': 0xF5C29B,
  'N': 0x1C120C,
  'n': 0xC87858,
  'C': STARDEW_PALETTE_ADDITIONS.wizCrystalBase,
  'c': STARDEW_PALETTE_ADDITIONS.wizCrystalHighlight,
  'e': STARDEW_PALETTE_ADDITIONS.wizCrystalShadow,
  'W': 0xFFFFFF,
  'w': 0x7DD3FC,
  'S': STARDEW_PALETTE_ADDITIONS.wizStaffWood,
  's': STARDEW_PALETTE_ADDITIONS.wizStaffShadow
};

const MATRICES = {
  // Farmer Walk
  player_walk_down_0: [
    '.....KtTTtK.....',
    '..KvTTTTTTTTvK..',
    '.KvVVTTTTTTVVvK.',
    '..KrRRRRRRRRrK..',
    '...KfHHHHHHfK...',
    '...KXNWNXNWXK...',
    '...KXiXXXXiXK...',
    '....KxXXXXxK....',
    '..KgFzbZZbzFgK..',
    '..KgFZZZZZZFgK..',
    '..KqZZZZZZZZqK..',
    '..KQZZZZZZZZQK..',
    '..KQZZK..KZZQK..',
    '..KQZZK..KZZQK..',
    '..KLSsK..KLSsK..',
    '..KssKK..KssKK..'
  ],
  player_walk_down_1: [
    '.....KtTTtK.....',
    '..KvTTTTTTTTvK..',
    '.KvVVTTTTTTVVvK.',
    '..KrRRRRRRRRrK..',
    '...KfHHHHHHfK...',
    '...KXNWNXNWXK...',
    '...KXiXXXXiXK...',
    '....KxXXXXxK....',
    '.KgFzbZZbzFgK...',
    '.KgFZZZZZZFgXK..',
    '..KqZZZZZZZZqK..',
    '..KQZZZZZZZZQK..',
    '.KQZZK...KZZQK..',
    '.KQZZK...KQZQK..',
    '.KLSsK....KLSsK.',
    '.KssKK....KssKK.'
  ],
  player_walk_down_2: [
    '.....KtTTtK.....',
    '..KvTTTTTTTTvK..',
    '.KvVVTTTTTTVVvK.',
    '..KrRRRRRRRRrK..',
    '...KfHHHHHHfK...',
    '...KXNWNXNWXK...',
    '...KXiXXXXiXK...',
    '....KxXXXXxK....',
    '...KgFzbZZbzFgK.',
    '..KXgFZZZZZZFgK.',
    '..KqZZZZZZZZqK..',
    '..KQZZZZZZZZQK..',
    '..KQZQK...KZZQK.',
    '..KQZQK...KZZQK.',
    '.KLSsK....KLSsK.',
    '.KssKK....KssKK.'
  ],
  player_walk_up_0: [
    '.....KtTTtK.....',
    '..KvTTTTTTTTvK..',
    '.KvVVTTTTTTVVvK.',
    '..KrRRRRRRRRrK..',
    '...KhHHHHHHhK...',
    '...KhHHHHHHhK...',
    '...KhHHHHHHhK...',
    '....KhhhhhhK....',
    '..KgFzbZZbzFgK..',
    '..KgFZZZZZZFgK..',
    '..KqZZZZZZZZqK..',
    '..KQZZZZZZZZQK..',
    '..KQZZK..KZZQK..',
    '..KQZZK..KZZQK..',
    '..KLSsK..KLSsK..',
    '..KssKK..KssKK..'
  ],
  player_walk_up_1: [
    '.....KtTTtK.....',
    '..KvTTTTTTTTvK..',
    '.KvVVTTTTTTVVvK.',
    '..KrRRRRRRRRrK..',
    '...KhHHHHHHhK...',
    '...KhHHHHHHhK...',
    '...KhHHHHHHhK...',
    '....KhhhhhhK....',
    '.KgFzbZZbzFgK...',
    '.KgFZZZZZZFgK...',
    '..KqZZZZZZZZqK..',
    '..KQZZZZZZZZQK..',
    '.KQZZK...KZZQK..',
    '.KQZZK...KQZQK..',
    '.KLSsK....KLSsK.',
    '.KssKK....KssKK.'
  ],
  player_walk_up_2: [
    '.....KtTTtK.....',
    '..KvTTTTTTTTvK..',
    '.KvVVTTTTTTVVvK.',
    '..KrRRRRRRRRrK..',
    '...KhHHHHHHhK...',
    '...KhHHHHHHhK...',
    '...KhHHHHHHhK...',
    '....KhhhhhhK....',
    '...KgFzbZZbzFgK.',
    '...KgFZZZZZZFgK.',
    '..KqZZZZZZZZqK..',
    '..KQZZZZZZZZQK..',
    '..KQZQK...KZZQK.',
    '..KQZQK...KZZQK.',
    '.KLSsK....KLSsK.',
    '.KssKK....KssKK.'
  ],
  player_walk_left_0: [
    '......KtTTtK....',
    '....KvTTTTTTvK..',
    '...KvVVTTTTTVvK.',
    '....KrRRRRRRrK..',
    '.....KfHHHHhK...',
    '.....KXNWfHhK...',
    '.....KXiXXhK....',
    '......KxXXhK....',
    '....KgFzZbZqK...',
    '....KXgFZZZqK...',
    '.....KqZZZZqK...',
    '.....KQZZZZQK...',
    '.....KQZZQK.....',
    '.....KQZZQK.....',
    '.....KLSsK......',
    '.....KssKK......'
  ],
  player_walk_left_1: [
    '......KtTTtK....',
    '....KvTTTTTTvK..',
    '...KvVVTTTTTVvK.',
    '....KrRRRRRRrK..',
    '.....KfHHHHhK...',
    '.....KXNWfHhK...',
    '.....KXiXXhK....',
    '......KxXXhK....',
    '....KgFzZbZqK...',
    '...KXgFZZZqK....',
    '....KqZZZZqK....',
    '....KQZZZZQK....',
    '...KQZZK.KZZQK..',
    '..KQZZK...KZZQK.',
    '..KLSsK...KLSsK.',
    '..KssKK...KssKK.'
  ],
  player_walk_left_2: [
    '......KtTTtK....',
    '....KvTTTTTTvK..',
    '...KvVVTTTTTVvK.',
    '....KrRRRRRRrK..',
    '.....KfHHHHhK...',
    '.....KXNWfHhK...',
    '.....KXiXXhK....',
    '......KxXXhK....',
    '....KgFzZbZqK...',
    '....KgFZZZqXK...',
    '.....KqZZZZqK...',
    '.....KQZZZZQK...',
    '....KQZZK.KZZQK.',
    '....KQZZK..KZZQK',
    '....KLSsK..KLSsK',
    '....KssKK..KssKK'
  ],
  player_walk_right_0: [
    '....KtTTtK......',
    '..KvTTTTTTvK....',
    '.KvVTTTTTVVvK...',
    '..KrRRRRRRrK....',
    '...KhHHHHfK.....',
    '...KhHfWNXK.....',
    '....KhXXiXK.....',
    '....KhXXxK......',
    '...KqZbZzFgK....',
    '...KqZZZFgXK....',
    '...KqZZZZqK.....',
    '...KQZZZZQK.....',
    '.....KQZZQK.....',
    '.....KQZZQK.....',
    '......KLSsK.....',
    '......KssKK.....'
  ],
  player_walk_right_1: [
    '....KtTTtK......',
    '..KvTTTTTTvK....',
    '.KvVTTTTTVVvK...',
    '..KrRRRRRRrK....',
    '...KhHHHHfK.....',
    '...KhHfWNXK.....',
    '....KhXXiXK.....',
    '....KhXXxK......',
    '...KqZbZzFgK....',
    '....KqZZZFgXK...',
    '....KqZZZZqK....',
    '....KQZZZZQK....',
    '..KQZZK.KZZQK...',
    '.KQZZK...KZZQK..',
    '.KLSsK...KLSsK..',
    '.KssKK...KssKK..'
  ],
  player_walk_right_2: [
    '....KtTTtK......',
    '..KvTTTTTTvK....',
    '.KvVTTTTTVVvK...',
    '..KrRRRRRRrK....',
    '...KhHHHHfK.....',
    '...KhHfWNXK.....',
    '....KhXXiXK.....',
    '....KhXXxK......',
    '...KqZbZzFgK....',
    '...KXqZZZFgK....',
    '....KqZZZZqK....',
    '....KQZZZZQK....',
    '.KQZZK.KZZQK....',
    'KQZZK..KZZQK....',
    'KLSsK..KLSsK....',
    'KssKK..KssKK....'
  ],

  // Farmer Actions
  player_water_down_0: [
    '.....KtTTtK.....',
    '..KvTTTTTTTTvK..',
    '.KvVVTTTTTTVVvK.',
    '..KrRRRRRRRRrK..',
    '...KfHHHHHHfK...',
    '...KXNWNXNWXK...',
    '...KXiXXXXiXK...',
    '....KxXXXXxK....',
    '..KgFzbZZbzFKnK.',
    '..KgFZZZZZZFKMmK',
    '..KqZZZZZZZZKdMK',
    '..KQZZZZZZZZKdMK',
    '..KQZZK..KZZQKdK',
    '..KQZZK..KZZQK.K',
    '..KLSsK..KLSsK..',
    '..KssKK..KssKK..'
  ],
  player_water_down_1: [
    '.....KtTTtK.....',
    '..KvTTTTTTTTvK..',
    '.KvVVTTTTTTVVvK.',
    '..KrRRRRRRRRrK..',
    '...KfHHHHHHfK...',
    '...KXNWNXNWXK...',
    '...KXiXXXXiXK...',
    '....KxXXXXxK....',
    '..KgFzbZZbzFK...',
    '..KgFZZZZZZFKKnK',
    '..KqZZZZZZZZKMmK',
    '..KQZZZZZZZZKdMU',
    '..KQZZK..KZZQKdW',
    '..KQZZK..KZZQK.U',
    '..KLSsK..KLSsK..',
    '..KssKK..KssKK..'
  ],
  player_water_down_2: [
    '.....KtTTtK.....',
    '..KvTTTTTTTTvK..',
    '.KvVVTTTTTTVVvK.',
    '..KrRRRRRRRRrK..',
    '...KfHHHHHHfK...',
    '...KXNWNXNWXK...',
    '...KXiXXXXiXK...',
    '....KxXXXXxK....',
    '..KgFzbZZbzFK...',
    '..KgFZZZZZZFK...',
    '..KqZZZZZZZZFKnK',
    '..KQZZZZZZZZKMmK',
    '..KQZZK..KZZKdUU',
    '..KQZZK..KZZKdWW',
    '..KLSsK..KLSsKdU',
    '..KssKK..KssKK.W'
  ],
  player_harvest_down_0: [
    '................',
    '.....KtTTtK.....',
    '..KvTTTTTTTTvK..',
    '.KvVVTTTTTTVVvK.',
    '..KrRRRRRRRRrK..',
    '...KfHHHHHHfK...',
    '...KXNWNXNWXK...',
    '...KXiXXXXiXK...',
    '....KxXXXXxK....',
    '..KgFzbZZbzFgK..',
    '.KgFZZZZZZZZFgK.',
    '.KXqZZZZZZZZqXK.',
    '.KXQZZKKKKZZQXK.',
    '..KLSsK..KLSsK..',
    '..KLSsK..KLSsK..',
    '..KssKK..KssKK..'
  ],
  player_harvest_down_1: [
    '................',
    '................',
    '.....KtTTtK.....',
    '..KvTTTTTTTTvK..',
    '.KvVVTTTTTTVVvK.',
    '..KrRRRRRRRRrK..',
    '...KfHHHHHHfK...',
    '...KXNWNXNWXK...',
    '...KXiXXXXiXK...',
    '....KxXXXXxK....',
    '..KgFzbZZbzFgK..',
    '.KgFZZgGGgZZFgK.',
    '.KXqZXAaAaXZqXK.',
    '.KXQZZsDDsZZQXK.',
    '..KLSsKKKKLSsK..',
    '..KssKK..KssKK..'
  ],
  player_harvest_down_2: [
    '....KgGGGGgK....',
    '...KgXAaAaXgK...',
    '....KXsDDsXK....',
    '.....KtTTtK.....',
    '..KvTTTTTTTTvK..',
    '.KvVVTTTTTTVVvK.',
    '..KrRRRRRRRRrK..',
    '...KfHHHHHHfK...',
    '...KXNWNXNWXK...',
    '...KXiXXXXiXK...',
    '....KxXXXXxK....',
    '..KgFzbZZbzFgK..',
    '..KgFZZZZZZFgK..',
    '..KqZZZZZZZZqK..',
    '..KQZZK..KZZQK..',
    '..KLSsK..KLSsK..'
  ],
  player_pick_down_0: [
    '.....KtTTtK.....',
    '..KvTTTTTTTTvK..',
    '.KvVVTTTTTTVVvK.',
    '..KrRRRRRRRRrK..',
    '...KfHHHHHHfK...',
    '...KXNWNXNWXK...',
    '...KXiXXXXiXK...',
    '....KxXXXXxK....',
    '..KgFzbZZbzFgK..',
    '..KgFZZZZZZFgK..',
    '..KqZZZZZZZZqK..',
    '..KQZZZZZZZZQK..',
    '..KQZZK..KZZQK..',
    '..KQZZK..KZZQK..',
    '..KLSsK..KLSsK..',
    '..KssKK..KssKK..'
  ],
  player_pick_down_1: [
    '...KdMMMMMdK....',
    '..KXnMMMMMnXK...',
    '....KdSStdK.....',
    '.....KtTTtK.....',
    '..KvTTTTTTTTvK..',
    '.KvVVTTTTTTVVvK.',
    '..KrRRRRRRRRrK..',
    '...KfHHHHHHfK...',
    '...KXNWNXNWXK...',
    '...KXiXXXXiXK...',
    '....KxXXXXxK....',
    '..KgFzbZZbzFgK..',
    '..KgFZZZZZZFgK..',
    '..KqZZZZZZZZqK..',
    '..KQZZK..KZZQK..',
    '..KLSsK..KLSsK..'
  ],
  player_pick_down_2: [
    '.....KtTTtK.....',
    '..KvTTTTTTTTvK..',
    '.KvVVTTTTTTVVvK.',
    '..KrRRRRRRRRrK..',
    '...KfHHHHHHfK...',
    '...KXNWNXNWXK...',
    '...KXiXXXXiXK...',
    '....KxXXXXxK....',
    '..KgFzbZZbzFgK..',
    '..KgFZZZZZZFgK..',
    '..KqZZZZZZZZqKdK',
    '..KQZZZZZZZZKdMK',
    '..KQZZK..KZZKdMK',
    '..KQZZK..KZZKdMK',
    '..KLSsK..KLSsKdK',
    '..KssKK..KssKK..'
  ],
  tool_watering_can: [
    '................',
    '......KddK......',
    '.....KdnnnK.....',
    '.....KdMMmK.....',
    '.....Kd...K.....',
    '....KdnnnnmK....',
    '...KdMMMMMMmK...',
    '...KdMMMMMMmK...',
    '...KdmmmmmmmK...',
    '...KdmmmmmmmK.nK',
    '...KdmmmmmmmKmUK',
    '...KdmmmmmmmK.WW',
    '....KddddddK..uW',
    '................',
    '................',
    '................'
  ],
  tool_basket: [
    '................',
    '......KjjK......',
    '.....KjYYjK.....',
    '.....KjYyjK.....',
    '.....Kj..jK.....',
    '...KgGg.KAKA.gK.',
    '..KgAaAgAaAgLgK.',
    '.KjYyYyYyYyYyYjK',
    '.KjYyYyYyYyYyYjK',
    '.KjyYyYyYyYyYyjK',
    '.KjYyYyYyYyYyYjK',
    '.KjyYyYyYyYyYyjK',
    '..KjjjjjjjjjjjK.',
    '................',
    '................',
    '................'
  ],

  // Cat Frames
  cat_idle_0: [
    '...KpK.....KpK..',
    '..KoPKK...KoPKK.',
    '.KoOOoOOOOOoOOsK',
    '.KOsOoOOOOOoSOsK',
    '.KOEeuOOOOOueEKS',
    'K.KWWWWWWWWWWK.K',
    '..KWwwppwwWwK...',
    '..KOOOOOOOOOK...',
    '..KsOWWWWWWsK.sK',
    '..KsOWWWWWWsK.OK',
    '..KsOWWWWWWsK.oK',
    '..KOOOOOOOOOK.oK',
    '.KOOOOOOOOOOOKsK',
    '.KWWWW....WWWWK.',
    '.Kpppp....ppppK.',
    '................'
  ],
  cat_idle_1: [
    '...KpK.....KpK..',
    '..KoPKK...KoPKK.',
    '.KoOOoOOOOOoOOsK',
    '.KOsOoOOOOOoSOsK',
    '.KuuuuOOOOOuuuKS',
    'K.KWWWWWWWWWWK.K',
    '..KWwwppwwWwK...',
    '..KOOOOOOOOOK...',
    '..KsOWWWWWWsK..s',
    '..KsOWWWWWWsK.oK',
    '..KsOWWWWWWsK.OK',
    '..KOOOOOOOOOK.oK',
    '.KOOOOOOOOOOOKsK',
    '.KWWWW....WWWWK.',
    '.Kpppp....ppppK.',
    '................'
  ],
  cat_walk_0: [
    '...KpK.....KpK..',
    '..KoPKK...KoPKK.',
    '.KoOOoOOOOOoOOsK',
    '.KOsOoOOOOOoSOsK',
    '.KOEeuOOOOOueEKS',
    'K.KWWWWWWWWWWK.K',
    '..KWwwppwwWwK...',
    '..KOOOOOOOOOOOK.',
    '..KsOWWWWWWsK.sK',
    '.KWsOWWWWWWsK.OK',
    '.KpKOOOOOOOOOKoK',
    '..KWWWW...WWWWK.',
    '..Kpppp...ppppK.',
    '................',
    '................',
    '................'
  ],
  cat_walk_1: [
    '..KpK.....KpK...',
    '.KoPKK...KoPKK..',
    'KoOOoOOOOOoOOsK.',
    'KOsOoOOOOOoSOsK.',
    'KOEeuOOOOOueEKS.',
    'KWWWWWWWWWWK..K.',
    'KWwwppwwWwK...sK',
    'KOOOOOOOOOOK..OK',
    'KsOWWWWWWsK...oK',
    'KsOWWWWWWsK...oK',
    'KOOOOOOOOOOK..sK',
    '.KWWWW..WWWWK...',
    '.Kpppp..ppppK...',
    '................',
    '................',
    '................'
  ],
  cat_walk_2: [
    '...KpK.....KpK..',
    '..KoPKK...KoPKK.',
    '.KoOOoOOOOOoOOsK',
    '.KOsOoOOOOOoSOsK',
    '.KOEeuOOOOOueEKS',
    'K.KWWWWWWWWWWK.K',
    '..KWwwppwwWwK...',
    '.KOOOOOOOOOOOK..',
    '.KsOWWWWWWsK.sK.',
    '.KsOWWWWWWsK.OK.',
    '.KOOOOOOOOOOKpK.',
    '..KWWWW...WWWWK.',
    '..Kpppp...ppppK.',
    '................',
    '................',
    '................'
  ],
  cat_sit_0: [
    '....KpK...KpK...',
    '...KoPKK.KoPKK..',
    '...KoOOoOoOOoK..',
    '...KOsOoOoSOsK..',
    '...KOEeuOOueEKS.',
    'K..KWWwwppwwWK..',
    '...KOOOOOOOOOK..',
    '...KsOWWWWWsOK..',
    '...KsOWWWWWsOK..',
    '..KOOOOOOOOOOOK.',
    '.KOOOOOOOOOOOOOK',
    '.KOWWWWWWWWWWOsK',
    '.KOppppppppppOsK',
    '..KOOOOOOOOOOOOs',
    '...KoOOOOOOOOOOs',
    '................'
  ],
  cat_sit_1: [
    '....KpK...KpK...',
    '...KoPKK.KoPKK..',
    '...KoOOoOoOOoK..',
    '...KOsOoOoSOsK..',
    '...KuuuuuuuuKS..',
    'K..KWWwwppwwWK..',
    '...KOOOOOOOOOK..',
    '...KsOWWWWWsOK..',
    '...KsOWWWWWsOK..',
    '..KOOOOOOOOOOOK.',
    '.KOOOOOOOOOOOOOK',
    '.KOWWWWWWWWWWOsK',
    '.KOppppppppppOsK',
    '..KOOOOOOOOOOOOs',
    '...KoOOOOOOOOOOs',
    '................'
  ],
  cat_sleep_0: [
    '................',
    '................',
    '.....w..........',
    '....w...........',
    '...KpK.....KpK..',
    '..KoPKK...KoPKK.',
    '.KoOOOOOOOOOOoK.',
    '.KOsuuuuuuuuSOk.',
    '.KOWWWppppWWWsK.',
    'KOOOOOOOOOOOOOKs',
    'KOWWWWWWWWWWWOKs',
    'KOpppppppppppOKS',
    '.KoOOOOOOOOOOOs.',
    '................',
    '................',
    '................'
  ],
  cat_sleep_1: [
    '....w...........',
    '...w............',
    '................',
    '................',
    '...KpK.....KpK..',
    '..KoPKK...KoPKK.',
    '.KoOOOOOOOOOOoK.',
    '.KOsuuuuuuuuSOk.',
    '.KOWWWppppWWWsK.',
    'KOOOOOOOOOOOOOKs',
    'KOWWWWWWWWWWWOKs',
    'KOpppppppppppOKS',
    '.KoOOOOOOOOOOOs.',
    '................',
    '................',
    '................'
  ],

  // Wizard Frames
  wizard_idle_0: [
    '.......KyK......',
    '......KhHK......',
    '.....KhHHHK.....',
    '....KhHHHHHK....',
    '...KhHHHHHHHK...',
    '..KhHHHHHHHHHK..',
    '.KvVVVVVVVVVVvK.',
    '....KXxNXnXK..cK',
    '....KddddddK.cCK',
    '....KdDDDDdK..eK',
    '...KhHHHHHHhK.SK',
    '...KhHHYYHHhK.SK',
    '..KhHHHvVHHHhKSK',
    '..KhHHHvVHHHhKSK',
    '..KhHHHvVHHHhKSK',
    '..KvVVVVVVVVvKsK'
  ],
  wizard_idle_1: [
    '.......KyK......',
    '......KhHK......',
    '.....KhHHHK.....',
    '....KhHHHHHK....',
    '...KhHHHHHHHK...',
    '..KhHHHHHHHHHK..',
    '.KvVVVVVVVVVVvK.',
    '....KXxNXnXK.WcK',
    '....KddddddKwcCK',
    '....KdDDDDdK.WcK',
    '...KhHHHHHHhK.SK',
    '...KhHHYYHHhK.SK',
    '..KhHHHvVHHHhKSK',
    '..KhHHHvVHHHhKSK',
    '..KhHHHvVHHHhKSK',
    '..KvVVVVVVVVvKsK'
  ]
};

// Map each frame to its corresponding palette for symbol validation
function getPaletteForFrame(key) {
  if (key.startsWith('cat_')) return P_CAT;
  if (key.startsWith('wizard_')) return P_WIZARD;
  return P_FARMER; // Farmer and tool frames
}

let passed = 0;
let errors = [];

console.log('=== MATRIX VALIDATION START ===');

for (const [key, matrix] of Object.entries(MATRICES)) {
  const palette = getPaletteForFrame(key);
  if (matrix.length !== 16) {
    errors.push(`[${key}] Matrix height is ${matrix.length}, expected 16.`);
    continue;
  }
  let matrixOk = true;
  matrix.forEach((row, ry) => {
    if (row.length !== 16) {
      errors.push(`[${key}] Row ${ry} length is ${row.length}, expected 16 ("${row}")`);
      matrixOk = false;
    }
    for (let rx = 0; rx < row.length; rx++) {
      const char = row[rx];
      if (palette[char] === undefined) {
        errors.push(`[${key}] Row ${ry} Col ${rx}: Undefined symbol '${char}' in palette.`);
        matrixOk = false;
      }
    }
  });
  if (matrixOk) passed++;
}

console.log(`Verified ${passed} / ${Object.keys(MATRICES).length} matrices.`);

if (errors.length > 0) {
  console.error('ERRORS FOUND:');
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
} else {
  console.log('ALL MATRIX DIMENSIONS & PALETTE SYMBOLS 100% VALIDATED!');
}
